import { describe, expect, it } from "vitest";
import {
  type BoundedDocumentInput,
  FiscalNotificationInputError,
} from "../input-contract";
import {
  createDocumentSegmentV1,
  type DocumentSegmentTypeV1,
  type DocumentSegmentV1,
} from "./document-segment.v1";
import {
  PAYMENT_ORDER_EXTRACTOR_RELEASE_V1,
  extractPaymentOrderV1,
} from "./payment-order-extractor.v1";

const OWNER_SCOPE = "user:synthetic-payment-order";
const DOCUMENT_ID = "document:synthetic-payment-order";

const FULL_PAYMENT_FORM = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "CARTA DE PAGO",
  "Número de justificante: 0020000000001",
  "Clave de liquidación: LQ-SYN-002",
  "Clave de deuda: DEBT-SYN-002",
  "Número de expediente: EXP-SYN-002",
  "Modelo: 002",
  "Ejercicio: 2026",
  "Periodo: 1T",
  "N.I.F.: 12345678Z",
  "Obligado al pago: PERSONA SINTÉTICA",
  "Concepto tributario: Liquidación sintética",
  "Principal: 1.000,00 euros",
  "Recargo de apremio: 100,00 euros",
  "Intereses de demora: 25,00 euros",
  "Costas: 5,00 euros",
  "Importe total: 1.130,00 euros",
  "Fecha de emisión: 05/04/2026",
  "Fecha límite de pago: hasta el 30/04/2026",
  "Medio de pago: Entidad colaboradora o pasarela AEAT",
  "Entidad colaboradora: BANCO SINTÉTICO",
  "Cuenta de cargo: ES12 3456 7890 1234 5678 9012",
  "Referencia del código de barras: BAR-SYN-002",
  "Código Seguro de Verificación (CSV): CSV-SYN-002",
].join("\n");

function document(
  ...pagesOrSignal: readonly (string | AbortSignal)[]
): BoundedDocumentInput {
  const signal =
    pagesOrSignal.at(-1) instanceof AbortSignal
      ? (pagesOrSignal.at(-1) as AbortSignal)
      : undefined;
  const pageTexts = pagesOrSignal.filter(
    (item): item is string => typeof item === "string",
  );
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.trim().length === 0,
        }),
      ),
    ),
    ...(signal ? { signal } : {}),
  });
}

function segment(
  type: DocumentSegmentTypeV1,
  pageFrom: number,
  pageTo = pageFrom,
  suffix = String(pageFrom),
  detectedAuthority: "AEAT" | "UNKNOWN" = "AEAT",
  detectedTitle?: string,
): DocumentSegmentV1 {
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom,
    pageTo,
    detectedTitle:
      detectedTitle ??
      (type === "PAYMENT_DOCUMENT"
        ? "carta de pago"
        : "contenido auxiliar sintético"),
    detectedAuthority,
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${suffix.padEnd(64, "a").slice(0, 64)}`,
    canGenerateAdministrativeFacts: [
      "MAIN_ADMINISTRATIVE_ACT",
      "DEBT_LIST",
      "PAYMENT_DOCUMENT",
    ].includes(type),
  });
}

describe("payment order extractor v1", () => {
  it("extracts an exact payment form with visible facts and an ORDERED event", () => {
    const output = extractPaymentOrderV1({
      document: document(FULL_PAYMENT_FORM),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates).toEqual([
      expect.objectContaining({
        familyId: "payment.payment_form",
        confidence: 1,
      }),
    ]);
    expect(output.paymentOrderFacts).toMatchObject({
      documentKind: "CARTA_DE_PAGO",
      paymentState: "ORDERED_NOT_CONFIRMED",
      paymentReference: { printedValue: "0020000000001" },
      liquidationKey: { printedValue: "LQ-SYN-002" },
      debtKey: { printedValue: "DEBT-SYN-002" },
      expediente: { printedValue: "EXP-SYN-002" },
      model: { printedValue: "002" },
      fiscalYear: { printedValue: "2026" },
      period: { printedValue: "1T" },
      taxId: { printedValue: "12345678Z" },
      recipient: { printedValue: "PERSONA SINTÉTICA" },
      rawPaymentDeadline: { printedValue: "hasta el 30/04/2026" },
      paymentChannel: { printedValue: "Entidad colaboradora o pasarela AEAT" },
      collaboratingEntity: { printedValue: "BANCO SINTÉTICO" },
      maskedBankAccount: {
        maskedValue: "****9012",
        disclosurePolicy: "MASKED_LAST_FOUR_ONLY",
      },
      barcodeReference: { printedValue: "BAR-SYN-002" },
      explicitPaymentProof: null,
    });
    expect(
      output.paymentOrderFacts.moneyFacts.map((fact) => [
        fact.role,
        fact.amountCents,
      ]),
    ).toEqual([
      ["PRINCIPAL", 100_000],
      ["EXECUTIVE_SURCHARGE", 10_000],
      ["LATE_INTEREST", 2_500],
      ["COSTS", 500],
      ["TOTAL_DUE", 113_000],
    ]);
    expect(
      output.monetaryComponents.map((item) => [
        item.componentType,
        item.amountCents,
      ]),
    ).toEqual([
      ["PRINCIPAL", 100_000],
      ["EXECUTIVE_SURCHARGE", 10_000],
      ["LATE_INTEREST", 2_500],
      ["COSTS", 500],
      ["TOTAL_CLAIMED", 113_000],
    ]);
    expect(output.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityKind: "ADMINISTRATIVE_ACT",
          familyId: "payment.payment_form",
        }),
        expect.objectContaining({
          entityKind: "PAYMENT_EVENT",
          paymentStatus: "ORDERED",
        }),
        expect.objectContaining({
          entityKind: "DEBT_CLAIM",
          creationBasis: "EXPLICITLY_PRINTED_DEBT",
        }),
        expect.objectContaining({
          entityKind: "PARTY",
          roles: ["PRIMARY_DEBTOR"],
        }),
        expect.objectContaining({
          entityKind: "PARTY",
          roles: ["FINANCIAL_ENTITY"],
        }),
      ]),
    );
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ paymentStatus: "PAID" }),
    );
    expect(output.proceduralDates).toEqual([
      expect.objectContaining({
        dateType: "ISSUE_DATE",
        parsedDate: "2026-04-05",
      }),
      expect.objectContaining({
        dateType: "VOLUNTARY_PAYMENT_DEADLINE",
        rawDeadlineText: "hasta el 30/04/2026",
        parsedDate: "2026-04-30",
        legallyComputed: false,
      }),
    ]);
    expect(output).toMatchObject({
      paymentProofPolicy: "ORDER_DOCUMENT_NEVER_CONFIRMS_PAYMENT",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("recognizes a document of payment without inventing absent fields", () => {
    const page = [
      "Agencia Tributaria",
      "DOCUMENTO DE INGRESO",
      "Modelo: 303",
      "Número de justificante: 3030000000002",
      "Importe del ingreso: 210,00 euros",
    ].join("\n");
    const output = extractPaymentOrderV1({
      document: document(page),
      segments: [
        segment("PAYMENT_DOCUMENT", 1, 1, "b", "AEAT", "documento de ingreso"),
      ],
    });

    expect(output.paymentOrderFacts).toMatchObject({
      documentKind: "DOCUMENTO_DE_INGRESO",
      paymentState: "ORDERED_NOT_CONFIRMED",
      model: { printedValue: "303" },
      paymentReference: { printedValue: "3030000000002" },
      rawPaymentDeadline: null,
      maskedBankAccount: null,
      explicitPaymentProof: null,
    });
    expect(output.warnings).toContain("MISSING_EXPLICIT_PAYMENT_DEADLINE");
    expect(output.entities).toContainEqual(
      expect.objectContaining({ paymentStatus: "ORDERED" }),
    );
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ paymentStatus: "PAID" }),
    );
  });

  it("recognizes the AEAT Modelo 010 title as a document to pay, never as proof of payment", () => {
    const output = extractPaymentOrderV1({
      document: document(
        [
          "Agencia Tributaria",
          "DOCUMENTO DE PAGO",
          "Modelo: 010",
          "Número de justificante: 0100000000002",
          "Importe del ingreso: 728,44 euros",
        ].join("\n"),
      ),
      segments: [
        segment("PAYMENT_DOCUMENT", 1, 1, "c", "AEAT", "documento de pago"),
      ],
    });

    expect(output.paymentOrderFacts).toMatchObject({
      documentKind: "DOCUMENTO_DE_PAGO",
      paymentState: "ORDERED_NOT_CONFIRMED",
      model: { printedValue: "010" },
      explicitPaymentProof: null,
    });
    expect(output.entities).toContainEqual(
      expect.objectContaining({ paymentStatus: "ORDERED" }),
    );
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ paymentStatus: "PAID" }),
    );
  });

  it("recognizes a split AEAT Modelo 010 form whose printed validation box becomes the segment title", () => {
    const output = extractPaymentOrderV1({
      document: document(
        [
          "Agencia Tributaria",
          "Modelo",
          "010",
          "JUSTIFICANTE DEL INGRESO (VALIDACIÓN MECÁNICA O SELLO, FECHA Y FIRMA)",
          "Importe del ingreso: 728,44 euros",
        ].join("\n"),
      ),
      segments: [
        segment(
          "PAYMENT_DOCUMENT",
          1,
          1,
          "d",
          "AEAT",
          "justificante del ingreso (validacion mecanica o sello, fecha y firma)",
        ),
      ],
    });

    expect(output).toMatchObject({
      status: "REVIEW_REQUIRED",
      paymentOrderFacts: {
        documentKind: "DOCUMENTO_DE_PAGO",
        paymentState: "ORDERED_NOT_CONFIRMED",
      },
    });
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ paymentStatus: "PAID" }),
    );
  });

  it("does not convert a printed NRC in the order into proof of payment", () => {
    const output = extractPaymentOrderV1({
      document: document(`${FULL_PAYMENT_FORM}\nNRC: ABCDEFGHIJKLMNOPQRSTUV`),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.warnings).toContain(
      "PAYMENT_EVIDENCE_PRESENT_REQUIRES_SEPARATE_EXTRACTOR",
    );
    expect(output.references).not.toContainEqual(
      expect.objectContaining({ referenceType: "NRC" }),
    );
    expect(output.paymentOrderFacts.explicitPaymentProof).toBeNull();
    expect(output.entities).toContainEqual(
      expect.objectContaining({ paymentStatus: "ORDERED" }),
    );
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ paymentStatus: "PAID" }),
    );
  });

  it("fails closed on conflicting totals and does not create a debt claim", () => {
    const output = extractPaymentOrderV1({
      document: document(
        FULL_PAYMENT_FORM.replace(
          "Importe total: 1.130,00 euros",
          "Importe total: 1.130,00 euros\nImporte total: 1.131,00 euros",
        ),
      ),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentOrderFacts.moneyFacts).not.toContainEqual(
      expect.objectContaining({ role: "TOTAL_DUE" }),
    );
    expect(output.warnings).toEqual(
      expect.arrayContaining([
        "CONFLICTING_PRINTED_AMOUNT_TOTAL_DUE",
        "MISSING_EXPLICIT_TOTAL_DUE",
      ]),
    );
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ entityKind: "DEBT_CLAIM" }),
    );
  });

  it("keeps a negative printed total visible but never represents it as debt", () => {
    const output = extractPaymentOrderV1({
      document: document(
        FULL_PAYMENT_FORM.replace("Principal: 1.000,00 euros\n", "")
          .replace("Recargo de apremio: 100,00 euros\n", "")
          .replace("Intereses de demora: 25,00 euros\n", "")
          .replace("Costas: 5,00 euros\n", "")
          .replace("1.130,00 euros", "-10,00 euros"),
      ),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentOrderFacts.moneyFacts).toContainEqual(
      expect.objectContaining({
        role: "TOTAL_DUE",
        sign: "NEGATIVE",
        amountCents: 1_000,
      }),
    );
    expect(output.warnings).toContain("NON_POSITIVE_TOTAL_DUE");
    expect(output.entities).not.toContainEqual(
      expect.objectContaining({ entityKind: "DEBT_CLAIM" }),
    );
  });

  it("retains invalid printed date and amount as review-required information", () => {
    const output = extractPaymentOrderV1({
      document: document(
        FULL_PAYMENT_FORM.replace(
          "Importe total: 1.130,00 euros",
          "Importe total: mil ciento treinta euros",
        ).replace("05/04/2026", "31/02/2026"),
      ),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output.paymentOrderFacts.moneyFacts).not.toContainEqual(
      expect.objectContaining({ role: "TOTAL_DUE" }),
    );
    expect(output.warnings).toEqual(
      expect.arrayContaining([
        "INVALID_PRINTED_AMOUNT_TOTAL_DUE",
        "INVALID_PRINTED_ISSUE_DATE",
        "MISSING_EXPLICIT_TOTAL_DUE",
      ]),
    );
    expect(output.proceduralDates).toContainEqual(
      expect.objectContaining({
        dateType: "ISSUE_DATE",
        rawText: "31/02/2026",
        parsedDate: null,
      }),
    );
  });

  it("reads the issue date from the closed AEAT table layout", () => {
    const output = extractPaymentOrderV1({
      document: document(
        [
          "Agencia Tributaria",
          "DOCUMENTO DE PAGO",
          "Modelo 010",
          "Concepto Fecha de emisión",
          "IRPF DECLARACION ANUAL ORDINARIA",
          "05-07-2017",
          "Importe Total: 728,44 euros",
        ].join("\n"),
      ),
      segments: [
        segment(
          "PAYMENT_DOCUMENT",
          1,
          1,
          "b",
          "AEAT",
          "documento de pago",
        ),
      ],
    });

    expect(output.proceduralDates).toContainEqual(
      expect.objectContaining({
        dateType: "ISSUE_DATE",
        rawText: "05-07-2017",
        parsedDate: "2017-07-05",
      }),
    );
  });

  it("blocks incompatible authorities and a guide quoting the title", () => {
    const regional = extractPaymentOrderV1({
      document: document(
        FULL_PAYMENT_FORM.replace(
          "Agencia Tributaria",
          "Agencia Tributaria Canaria",
        ),
      ),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });
    const guide = extractPaymentOrderV1({
      document: document(`Guía de ejemplo\n${FULL_PAYMENT_FORM}`),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(regional).toMatchObject({
      status: "BLOCKED",
      warnings: ["CONFLICTING_AUTHORITY_OR_TERRITORY"],
    });
    expect(guide).toMatchObject({
      status: "BLOCKED",
      warnings: ["CONFLICTING_NON_DOCUMENT_GUIDE"],
    });
    expect(regional.entities).toEqual([]);
    expect(guide.entities).toEqual([]);
  });

  it("blocks a segment that mixes two incompatible payment-document titles", () => {
    const output = extractPaymentOrderV1({
      document: document(`${FULL_PAYMENT_FORM}\nDOCUMENTO DE INGRESO`),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });

    expect(output).toMatchObject({
      status: "BLOCKED",
      warnings: ["CONFLICTING_PAYMENT_ORDER_KIND"],
    });
    expect(output.paymentOrderFacts.documentKind).toBeNull();
  });

  it("returns UNKNOWN for instructions or an unrelated administrative act", () => {
    const instructions = extractPaymentOrderV1({
      document: document(
        "Agencia Tributaria\nINSTRUCCIONES PARA EFECTUAR EL PAGO\nModelo: 002",
      ),
      segments: [
        segment(
          "PAYMENT_DOCUMENT",
          1,
          1,
          "c",
          "AEAT",
          "instrucciones para efectuar el pago",
        ),
      ],
    });
    const unrelated = extractPaymentOrderV1({
      document: document(
        "Agencia Tributaria\nComunicación informativa sintética",
      ),
      segments: [segment("MAIN_ADMINISTRATIVE_ACT", 1)],
    });

    expect(instructions.status).toBe("UNKNOWN");
    expect(unrelated.status).toBe("UNKNOWN");
    expect(instructions.entities).toEqual([]);
    expect(unrelated.entities).toEqual([]);
  });

  it("does not promote values printed only in generic instructions", () => {
    const payment = FULL_PAYMENT_FORM.replace(
      "Entidad colaboradora: BANCO SINTÉTICO\n",
      "",
    ).replace("Cuenta de cargo: ES12 3456 7890 1234 5678 9012\n", "");
    const output = extractPaymentOrderV1({
      document: document(
        payment,
        "Entidad colaboradora: BANCO INCORRECTO\nCuenta de cargo: ES00 0000 0000 0000 0000 9999",
      ),
      segments: [
        segment("PAYMENT_DOCUMENT", 1),
        segment("GENERIC_INSTRUCTIONS", 2, 2, "e"),
      ],
    });

    expect(output.paymentOrderFacts.collaboratingEntity).toBeNull();
    expect(output.paymentOrderFacts.maskedBankAccount).toBeNull();
  });

  it("uses high-confidence AEAT segment evidence when the logo is not text-extractable", () => {
    const withoutAuthority = FULL_PAYMENT_FORM.replace(
      "Agencia Tributaria\n",
      "",
    ).replace("sede.agenciatributaria.gob.es\n", "");
    const recognized = extractPaymentOrderV1({
      document: document(withoutAuthority),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    });
    const unsupported = extractPaymentOrderV1({
      document: document(withoutAuthority),
      segments: [segment("PAYMENT_DOCUMENT", 1, 1, "d", "UNKNOWN")],
    });

    expect(recognized.familyCandidates[0]?.familyId).toBe(
      "payment.payment_form",
    );
    expect(unsupported.status).toBe("UNKNOWN");
    expect(unsupported.entities).toEqual([]);
  });

  it("rejects unknown keys and observes cancellation", () => {
    const valid = {
      document: document(FULL_PAYMENT_FORM),
      segments: [segment("PAYMENT_DOCUMENT", 1)],
    };
    expect(() =>
      extractPaymentOrderV1({ ...valid, hiddenPii: "forbidden" } as never),
    ).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({
        code: "INVALID_INPUT",
        path: "paymentOrderInput.$shape",
      }),
    );
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      extractPaymentOrderV1({
        document: document(FULL_PAYMENT_FORM, controller.signal),
        segments: valid.segments,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<FiscalNotificationInputError>>({
        code: "ABORTED",
      }),
    );
  });

  it("is deterministic, non-mutating and returns immutable outputs without the raw account", () => {
    const input = Object.freeze({
      document: document(FULL_PAYMENT_FORM),
      segments: Object.freeze([segment("PAYMENT_DOCUMENT", 1)]),
    });
    const before = JSON.stringify(input);
    const first = extractPaymentOrderV1(input);
    const second = extractPaymentOrderV1(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).not.toContain(
      "ES12 3456 7890 1234 5678 9012",
    );
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.paymentOrderFacts)).toBe(true);
    expect(Object.isFrozen(first.paymentOrderFacts.moneyFacts)).toBe(true);
    expect(() =>
      (first.paymentOrderFacts.moneyFacts as unknown as unknown[]).push({}),
    ).toThrow();
  });

  it("publishes versioned official sources and the no-payment-proof invariant", () => {
    expect(PAYMENT_ORDER_EXTRACTOR_RELEASE_V1).toMatchObject({
      version: "1.0.0",
      sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
      paymentProofPolicy: "PAYMENT_ORDER_IS_NOT_PAYMENT_EVIDENCE",
      deadlinePolicy: "NO_COMPUTED_DEADLINE",
      accountPolicy: "MASK_LAST_FOUR_AND_DISCARD_RAW_VALUE",
      actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
    });
    expect(
      PAYMENT_ORDER_EXTRACTOR_RELEASE_V1.officialInterpretationSources,
    ).toEqual([
      expect.objectContaining({
        sourceId: "aeat.payment.nrc",
        url: expect.stringContaining("agenciatributaria.gob.es"),
      }),
      expect.objectContaining({
        sourceId: "aeat.payment.liquidations.card",
        url: expect.stringContaining("agenciatributaria.gob.es"),
      }),
      expect.objectContaining({
        sourceId: "boe.rgr.article.41",
        url: expect.stringContaining("BOE-A-2005-14803"),
      }),
      expect.objectContaining({
        sourceId: "boe.order.eha-2027-2007",
        url: expect.stringContaining("BOE-A-2007-13223"),
      }),
    ]);
  });
});
