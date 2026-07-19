import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import {
  createDocumentSegmentV1,
  type DocumentSegmentTypeV1,
} from "./document-segment.v1";
import {
  SEIZURE_EXTRACTOR_RELEASE_V1,
  extractSeizureV1,
  type SeizureSubtypeV1,
} from "./seizure-extractor.v1";

const OWNER_SCOPE = "user:synthetic-seizure-extractor";
const DOCUMENT_ID = "document:synthetic-seizure-extractor";

const SUBTYPE_CASES = [
  ["DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS", "BANK_ACCOUNT", "seizure.bank_account"],
  ["DILIGENCIA DE EMBARGO DE CRÉDITOS COMERCIALES O ARRENDATICIOS", "COMMERCIAL_OR_RENT_CREDIT", "seizure.commercial_credits"],
  ["DILIGENCIA DE EMBARGO DE SUELDOS, SALARIOS O PENSIONES", "WAGES_OR_PENSIONS", "seizure.wages_or_pensions"],
  ["DILIGENCIA DE EMBARGO DE COBROS MEDIANTE TERMINAL DE PUNTO DE VENTA", "TPV_RECEIPTS", "seizure.tpv_receipts"],
  ["DILIGENCIA DE EMBARGO DE DEVOLUCIONES TRIBUTARIAS", "CASH_REFUND_OR_PUBLIC_CREDIT", "seizure.cash_or_refund"],
  ["DILIGENCIA DE EMBARGO DE BIENES INMUEBLES", "REAL_ESTATE", "seizure.real_estate"],
  ["NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE BIENES INMUEBLES", "REAL_ESTATE", "seizure.real_estate"],
  ["LEVANTAMIENTO DE DILIGENCIA DE EMBARGO", "RELEASE", "seizure.release"],
  ["CONTESTACIÓN A DILIGENCIA DE EMBARGO", "THIRD_PARTY_RESPONSE", "seizure.third_party_response"],
  ["JUSTIFICANTE DE INGRESO DE DILIGENCIA DE EMBARGO", "THIRD_PARTY_PAYMENT", "seizure.third_party_payment"],
] as const;

function document(text: string, signal?: AbortSignal): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.trim().length === 0 }),
    ]),
    ...(signal ? { signal } : {}),
  });
}

function segment(title: string, authority: "AEAT" | "TGSS" | "UNKNOWN" = "AEAT") {
  return createDocumentSegmentV1({
    segmentId: "segment:synthetic-seizure:1",
    documentId: DOCUMENT_ID,
    segmentType: "MAIN_ADMINISTRATIVE_ACT",
    pageFrom: 1,
    pageTo: 1,
    detectedTitle: title,
    detectedAuthority: authority,
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${"a".repeat(64)}`,
    canGenerateAdministrativeFacts: true,
  });
}

function page(title: string, ...lines: string[]): string {
  return [
    "AGENCIA TRIBUTARIA",
    "sede.agenciatributaria.gob.es",
    title,
    ...lines,
  ].join("\n");
}

function completeBankOrder(): string {
  return page(
    "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
    "Número de diligencia: EMB-SYN-001",
    "Número de expediente: EXP-SYN-002",
    "Clave de deuda: DEBT-SYN-003",
    "Clave de liquidación: LIQ-SYN-004",
    "Referencia de la providencia: APR-SYN-005",
    "CSV: CSV-SYN-006",
    "Deudor: PERSONA DEUDORA SINTÉTICA",
    "NIF del deudor: 12345678Z",
    "Destinatario: BANCO SINTÉTICO",
    "NIF del destinatario: A12345674",
    "Entidad financiera: BANCO SINTÉTICO",
    "IBAN: ES00 0000 0000 0000 1234",
    "Cuenta o depósito: CUENTA CORRIENTE",
    "Principal: 1.000,00 EUR",
    "Recargo de apremio: 200,00 EUR",
    "Intereses de demora: 30,00 EUR",
    "Costas: 10,00 EUR",
    "Total pendiente: 1.240,00 EUR",
    "Importe a embargar: 1.240,00 EUR",
    "Importe retenido: 900,00 EUR",
    "Saldo disponible: 900,00 EUR",
    "Fecha de emisión: 03/03/2026",
    "Fecha del embargo: 04/03/2026",
    "Plazo de contestación: 12/03/2026",
    "Instrucciones: CONTESTAR POR LA SEDE ELECTRÓNICA",
    "Recursos: RECURSO IMPRESO SINTÉTICO",
  );
}

describe("common seizure extractor v1", () => {
  it.each(SUBTYPE_CASES)(
    "recognizes the exact %s subtype and catalog family",
    (title, subtype, familyId) => {
      const source = document(page(
        title,
        "Número de diligencia: EMB-SYN-001",
        "Deudor: PERSONA DEUDORA SINTÉTICA",
      ));
      const output = extractSeizureV1({ document: source, segments: [segment(title)] });

      expect(output.status).toBe("REVIEW_REQUIRED");
      expect(output.seizureFacts.subtype).toBe(subtype as SeizureSubtypeV1);
      expect(output.familyCandidates).toEqual([
        expect.objectContaining({ familyId, confidence: 1 }),
      ]);
      expect(output.permitsDebtCreation).toBe(false);
      expect(output.permitsPaymentAction).toBe(false);
      expect(output.permitsAccountingAction).toBe(false);
    },
  );

  it("extracts common account facts, exact amounts, dates and masked account without retaining source text", () => {
    const text = completeBankOrder();
    const output = extractSeizureV1({
      document: document(text),
      segments: [segment("DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS")],
    });

    expect(output.seizureFacts).toMatchObject({
      documentKind: "SEIZURE_ORDER",
      subtype: "BANK_ACCOUNT",
      printedState: "SEIZURE_ORDER_RECORDED_REVIEW_REQUIRED",
      recipientRole: "FINANCIAL_ENTITY",
      recipientRoleBasis: "EXACT_DOCUMENT_SUBTYPE",
      seizureOrderId: { printedValue: "EMB-SYN-001" },
      expediente: { printedValue: "EXP-SYN-002" },
      debtorName: { printedValue: "PERSONA DEUDORA SINTÉTICA" },
      recipientName: { printedValue: "BANCO SINTÉTICO" },
      issueDate: { parsedDate: "2026-03-03" },
      seizureDate: { parsedDate: "2026-03-04" },
      rawResponseDeadline: { printedValue: "12/03/2026" },
    });
    expect(output.references.map((item) => item.referenceType)).toEqual([
      "SEIZURE_ORDER_ID",
      "EXPEDIENTE_ID",
      "DEBT_KEY",
      "LIQUIDATION_KEY",
      "ACT_ID",
      "CSV",
      "NIF",
      "NIF",
    ]);
    expect(output.monetaryComponents.map((item) => [item.componentType, item.amountCents])).toEqual([
      ["PRINCIPAL", 100_000],
      ["EXECUTIVE_SURCHARGE", 20_000],
      ["LATE_INTEREST", 3_000],
      ["COSTS", 1_000],
      ["TOTAL_PENDING", 124_000],
      ["SEIZED_AMOUNT", 124_000],
      ["SEIZED_AMOUNT", 90_000],
      ["OTHER", 90_000],
    ]);
    expect(output.proceduralDates).toEqual(expect.arrayContaining([
      expect.objectContaining({ dateType: "ISSUE_DATE", parsedDate: "2026-03-03" }),
      expect.objectContaining({ dateType: "SEIZURE_DATE", parsedDate: "2026-03-04" }),
      expect.objectContaining({
        dateType: "RESPONSE_DEADLINE",
        rawDeadlineText: "12/03/2026",
        legallyComputed: false,
      }),
    ]));
    expect(output.seizureFacts.specificFacts).toContainEqual(expect.objectContaining({
      fieldId: "MASKED_ACCOUNT",
      printedValue: "****1234",
      disclosurePolicy: "MASKED_LAST_FOUR_ONLY",
    }));
    expect(output.entities.map((entity) => entity.entityKind)).toEqual([
      "ADMINISTRATIVE_ACT",
      "TAX_PROCEDURE",
      "ASSET_CONSTRAINT",
      "DEBT_CLAIM",
      "PARTY",
      "PARTY",
    ]);
    expect(JSON.stringify(output)).not.toContain("ES00 0000 0000 0000 1234");
    expect(JSON.stringify(output)).not.toContain(text);
    expect(output.retainedSourceContent).toBe("NONE");
  });

  it("keeps the debtor, recipient and garnished third party as distinct parties", () => {
    const title = "CONTESTACIÓN A DILIGENCIA DE EMBARGO";
    const output = extractSeizureV1({
      document: document(page(
        title,
        "Número de diligencia: EMB-SYN-010",
        "Deudor: DEUDOR SINTÉTICO",
        "NIF del deudor: 12345678Z",
        "Destinatario: EMPRESA DESTINATARIA SINTÉTICA",
        "Tercero obligado: TERCERO PAGADOR SINTÉTICO",
        "NIF del tercero: A12345674",
        "Relación con el deudor: CLIENTE",
        "Existencia de crédito o saldo: NO CONSTA SALDO",
        "Respuesta del tercero: SIN IMPORTE PENDIENTE",
        "Fecha de contestación: 06/03/2026",
      )),
      segments: [segment(title)],
    });

    const parties = output.entities.filter((entity) => entity.entityKind === "PARTY");
    expect(parties).toEqual([
      expect.objectContaining({ displayName: "DEUDOR SINTÉTICO", roles: ["PRIMARY_DEBTOR"] }),
      expect.objectContaining({ displayName: "EMPRESA DESTINATARIA SINTÉTICA", roles: ["GARNISHED_THIRD_PARTY"] }),
      expect.objectContaining({ displayName: "TERCERO PAGADOR SINTÉTICO", roles: ["GARNISHED_THIRD_PARTY"] }),
    ]);
    expect(output.seizureFacts.recipientRole).toBe("GARNISHED_THIRD_PARTY");
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "PAYMENT_EVENT" }));
    expect(output.monetaryComponents).toEqual([]);
  });

  it("extracts the closed credit, salary and TPV adapter fields without applying their instructions", () => {
    const cases = [
      {
        title: "DILIGENCIA DE EMBARGO DE CRÉDITOS COMERCIALES O ARRENDATICIOS",
        lines: [
          "Pagador: CLIENTE SINTÉTICO",
          "Contrato o factura: FAC-SYN-001",
          "Periodicidad: MENSUAL",
          "Prohibición de pago al deudor: INSTRUCCIÓN IMPRESA SINTÉTICA",
        ],
        expected: ["PAYER", "CONTRACT_OR_INVOICE", "CREDIT_PAYMENT_PERIODICITY", "PROHIBITION_TO_PAY_DEBTOR"],
      },
      {
        title: "DILIGENCIA DE EMBARGO DE SUELDOS, SALARIOS O PENSIONES",
        lines: [
          "Pagador: EMPLEADOR SINTÉTICO",
          "Tipo de retribución: SALARIO MENSUAL",
          "Límite de retención: LÍMITE IMPRESO SINTÉTICO",
        ],
        expected: ["PAYER", "REMUNERATION_TYPE", "PRINTED_WITHHOLDING_LIMIT"],
      },
      {
        title: "DILIGENCIA DE EMBARGO DE COBROS MEDIANTE TERMINAL DE PUNTO DE VENTA",
        lines: [
          "Proveedor de servicios de pago: PSP SINTÉTICO",
          "Terminal o comercio: TPV-SYN-001",
          "Flujo de cobros: OPERACIONES DIARIAS",
          "Porcentaje a retener: 25 %",
        ],
        expected: ["PAYMENT_SERVICE_PROVIDER", "TERMINAL_OR_MERCHANT", "COLLECTION_FLOW", "PRINTED_PERCENTAGE"],
      },
    ] as const;

    for (const item of cases) {
      const output = extractSeizureV1({
        document: document(page(
          item.title,
          "Número de diligencia: EMB-SYN-ADAPTER",
          "Deudor: DEUDOR SINTÉTICO",
          ...item.lines,
        )),
        segments: [segment(item.title)],
      });
      expect(output.seizureFacts.specificFacts.map((fact) => fact.fieldId)).toEqual(
        expect.arrayContaining([...item.expected]),
      );
      expect(output.permitsPaymentAction).toBe(false);
      expect(output.permitsDeadlineCreation).toBe(false);
    }
  });

  it("extracts the closed real-estate fields as printed review facts", () => {
    const title = "DILIGENCIA DE EMBARGO DE BIENES INMUEBLES";
    const output = extractSeizureV1({
      document: document(page(
        title,
        "Número de diligencia: EMB-SYN-IMM-001",
        "Deudor: TITULAR SINTÉTICO",
        "Titular del inmueble: TITULAR SINTÉTICO",
        "Dirección del inmueble: CALLE SINTÉTICA 1",
        "Referencia catastral: 0000000SYNTH",
        "Registro de la propiedad: REGISTRO SINTÉTICO",
        "Finca registral: FINCA-SYN-002",
        "Derecho embargado: PLENO DOMINIO",
        "Porcentaje de titularidad: 50 %",
        "Valoración: 150.000,00 EUR",
        "Cargas registrales: CARGA SINTÉTICA",
      )),
      segments: [segment(title)],
    });

    expect(output.seizureFacts.specificFacts.map((fact) => fact.fieldId)).toEqual(
      expect.arrayContaining([
        "PROPERTY_HOLDER",
        "PROPERTY_ADDRESS",
        "CADASTRAL_REFERENCE",
        "LAND_REGISTRY",
        "PROPERTY_NUMBER",
        "SEIZED_RIGHT",
        "OWNERSHIP_SHARE",
        "VALUATION",
        "CHARGES",
      ]),
    );
    expect(output.familyCandidates[0]?.familyId).toBe("seizure.real_estate");
  });

  it("records an explicit third-party transfer without enabling another payment or accounting action", () => {
    const title = "JUSTIFICANTE DE INGRESO DE DILIGENCIA DE EMBARGO";
    const output = extractSeizureV1({
      document: document(page(
        title,
        "Número de diligencia: EMB-SYN-020",
        "Deudor: DEUDOR SINTÉTICO",
        "Tercero retenedor: PAGADOR SINTÉTICO",
        "Número de justificante: JUST-SYN-021",
        "Importe transferido: 450,00 EUR",
        "Fecha del ingreso: 07/03/2026",
      )),
      segments: [segment(title)],
    });

    expect(output.entities).toContainEqual(expect.objectContaining({
      entityKind: "PAYMENT_EVENT",
      paymentStatus: "PAID",
    }));
    expect(output.references).toContainEqual(expect.objectContaining({
      referenceType: "PAYMENT_RECEIPT_ID",
      rawValue: "JUST-SYN-021",
    }));
    expect(output.monetaryComponents).toContainEqual(expect.objectContaining({
      componentType: "TOTAL_PAID",
      amountCents: 45_000,
    }));
    expect(output.permitsPaymentAction).toBe(false);
    expect(output.permitsAccountingAction).toBe(false);
  });

  it("records total and partial release documents without deleting the historical seizure", () => {
    const title = "LEVANTAMIENTO DE DILIGENCIA DE EMBARGO";
    const output = extractSeizureV1({
      document: document(page(
        title,
        "Número de diligencia: EMB-SYN-030",
        "Bien o derecho levantado: CUENTA ****9876",
        "Motivo del levantamiento: PAGO INDICADO EN EL DOCUMENTO",
        "Tipo de levantamiento: PARCIAL",
        "Importe liberado: 300,00 EUR",
        "Fecha del levantamiento: 08/03/2026",
      )),
      segments: [segment(title)],
    });

    expect(output.entities).toContainEqual(expect.objectContaining({
      entityKind: "ASSET_CONSTRAINT",
      constraintType: "RELEASE",
    }));
    expect(output.monetaryComponents).toContainEqual(expect.objectContaining({
      componentType: "RELEASED_AMOUNT",
      amountCents: 30_000,
    }));
    expect(output.seizureFacts.specificFacts).toContainEqual(expect.objectContaining({
      fieldId: "RELEASE_EXTENT",
      printedValue: "PARCIAL",
    }));
    expect(output.seizureFacts.printedState).toBe("RELEASE_RECORDED_REVIEW_REQUIRED");
  });

  it("returns reviewable structured information when the exact document is incomplete", () => {
    const title = "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS";
    const output = extractSeizureV1({
      document: document(page(title)),
      segments: [segment(title)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates[0]?.familyId).toBe("seizure.bank_account");
    expect(output.seizureFacts.seizureOrderId).toBeNull();
    expect(output.warnings).toEqual(expect.arrayContaining([
      "MISSING_EXPLICIT_DEBTOR",
      "MISSING_EXPLICIT_SEIZURE_ORDER_ID",
    ]));
  });

  it("blocks conflicting seizure titles instead of selecting one silently", () => {
    const first = "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS";
    const second = "DILIGENCIA DE EMBARGO DE SUELDOS, SALARIOS O PENSIONES";
    const output = extractSeizureV1({
      document: document(page(first, second)),
      segments: [segment(first)],
    });

    expect(output.status).toBe("BLOCKED");
    expect(output.familyCandidates).toEqual([]);
    expect(output.entities).toEqual([]);
    expect(output.warnings).toEqual(["CONFLICTING_SEIZURE_DOCUMENT_KIND"]);
  });

  it("blocks two separate seizure acts instead of merging their facts", () => {
    const source = Object.freeze({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: page(
            "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
            "Número de diligencia: EMB-SYN-040",
          ),
          isBlank: false,
        }),
        Object.freeze({
          pageNumber: 2,
          text: page(
            "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
            "Número de diligencia: EMB-SYN-041",
          ),
          isBlank: false,
        }),
      ]),
    });
    const segments = [1, 2].map((pageNumber) => createDocumentSegmentV1({
      segmentId: `segment:synthetic-seizure:${pageNumber}`,
      documentId: DOCUMENT_ID,
      segmentType: "MAIN_ADMINISTRATIVE_ACT",
      pageFrom: pageNumber,
      pageTo: pageNumber,
      detectedTitle: "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
      detectedAuthority: "AEAT",
      classificationConfidence: 1,
      extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
      contentHash: `sha256:${String(pageNumber).repeat(64)}`,
      canGenerateAdministrativeFacts: true,
    }));
    const output = extractSeizureV1({ document: source, segments });

    expect(output.status).toBe("BLOCKED");
    expect(output.warnings).toEqual([
      "MULTIPLE_SEIZURE_ACTS_REQUIRE_SEPARATE_EXTRACTION",
    ]);
    expect(output.references).toEqual([]);
    expect(output.entities).toEqual([]);
  });

  it("blocks a foral, TGSS or guide lookalike and never labels it as AEAT", () => {
    const title = "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS";
    const tgss = extractSeizureV1({
      document: document([title, "TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL"].join("\n")),
      segments: [segment(title, "TGSS")],
    });
    const guide = extractSeizureV1({
      document: document(["Manual para interpretar embargos", title, "AGENCIA TRIBUTARIA"].join("\n")),
      segments: [segment(title)],
    });

    expect(tgss.status).toBe("BLOCKED");
    expect(tgss.warnings).toEqual(["CONFLICTING_AUTHORITY_OR_TERRITORY"]);
    expect(guide.status).toBe("BLOCKED");
    expect(guide.warnings).toEqual(["CONFLICTING_NON_DOCUMENT_GUIDE"]);
  });

  it("returns UNKNOWN for an unsupported act and does not invent any facts", () => {
    const output = extractSeizureV1({
      document: document(page("COMUNICACIÓN INFORMATIVA")),
      segments: [segment("COMUNICACIÓN INFORMATIVA")],
    });
    expect(output.status).toBe("UNKNOWN");
    expect(output.entities).toEqual([]);
    expect(output.references).toEqual([]);
    expect(output.monetaryComponents).toEqual([]);
  });

  it("is deterministic, immutable and does not mutate caller-owned input", () => {
    const source = document(completeBankOrder());
    const segments = [segment("DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS")];
    const before = JSON.stringify({ source, segments });
    const first = extractSeizureV1({ document: source, segments });
    const second = extractSeizureV1({ document: source, segments });

    expect(JSON.stringify({ source, segments })).toBe(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.seizureFacts.specificFacts)).toBe(true);
    expect(() => (first.warnings as string[]).push("mutation")).toThrow();
    expect(second.warnings).not.toContain("mutation");
  });

  it("honors cancellation before extraction", () => {
    const controller = new AbortController();
    controller.abort();
    const title = "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS";
    expect(() => extractSeizureV1({
      document: document(page(title), controller.signal),
      segments: [segment(title)],
    })).toThrowError(expect.objectContaining({ code: "ABORTED" }));
  });

  it("fails closed on unknown input keys and extractor resource limits", () => {
    const title = "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS";
    const source = document(page(title));
    expect(() => extractSeizureV1({
      document: source,
      segments: [segment(title)],
      rawOcr: "forbidden",
    } as never)).toThrowError(expect.objectContaining({ path: "seizureInput.$shape" }));

    const oversized = document(page(title, `Instrucciones: ${"x".repeat(2_001)}`));
    expect(() => extractSeizureV1({
      document: oversized,
      segments: [segment(title)],
    })).toThrowError(expect.objectContaining({
      code: "INVALID_INPUT",
      path: "seizure.pages[1].line",
    }));
  });

  it("publishes the nine review-only families and official context without enabling actions", () => {
    expect(SEIZURE_EXTRACTOR_RELEASE_V1.familyIds).toEqual([
      "seizure.bank_account",
      "seizure.commercial_credits",
      "seizure.wages_or_pensions",
      "seizure.tpv_receipts",
      "seizure.cash_or_refund",
      "seizure.real_estate",
      "seizure.release",
      "seizure.third_party_response",
      "seizure.third_party_payment",
    ]);
    expect(SEIZURE_EXTRACTOR_RELEASE_V1.sourcePriority).toBe(
      "DOCUMENT_LITERAL_CONTROLS_FACTS",
    );
    expect(SEIZURE_EXTRACTOR_RELEASE_V1.actionPolicy).toBe(
      "NO_DEBT_PAYMENT_DEADLINE_SEIZURE_OR_ACCOUNTING_ACTION",
    );
  });
});

void ("MAIN_ADMINISTRATIVE_ACT" satisfies DocumentSegmentTypeV1);
