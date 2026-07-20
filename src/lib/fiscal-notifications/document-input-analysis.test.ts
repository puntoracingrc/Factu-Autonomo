import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { BASE_EXTRACTOR_IDS_V1 } from "./extractor-core/extractor-contract.v1";
import { FISCAL_NOTIFICATION_FAMILY_RULES_V2 } from "./extractor-core/family-rule-registry.v2";
import type { BoundedDocumentInput } from "./input-contract";

function input(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-local-ocr",
    documentId: "document:synthetic-local-ocr",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

function stackedInput(lines: readonly string[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-local-ocr",
    documentId: "document:synthetic-stacked-local-ocr",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: lines.join("\n"),
        isBlank: false,
        layoutRows: Object.freeze(
          lines.map((text, index) =>
            Object.freeze({
              yMilli: 950_000 - index * 18_000,
              cells: Object.freeze([
                Object.freeze({
                  xMilli: 90_000,
                  widthMilli: 600_000,
                  text,
                }),
              ]),
            }),
          ),
        ),
      }),
    ]),
  });
}

function semanticFieldSignatures(
  document: Awaited<
    ReturnType<typeof analyzeFiscalNotificationDocumentInput>
  >["verticalSliceReview"]["documents"][number],
): readonly string[] {
  return document.fields.flatMap((field) => {
    if (field.semantic === "REFERENCE") {
      return [`${field.semantic}:${field.canonicalType}:${field.normalizedValue}`];
    }
    if (field.semantic === "DATE") {
      return [`${field.semantic}:${field.canonicalType}:${field.normalizedValue}`];
    }
    if (field.semantic === "MONEY") {
      return [`${field.semantic}:${field.canonicalType}:${field.amountCents}`];
    }
    return [];
  });
}

function multipageInput(pages: readonly (readonly string[])[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-local-ocr",
    documentId: "document:synthetic-local-ocr-multipage",
    pages: Object.freeze(
      pages.map((lines, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text: lines.join("\n"),
          isBlank: lines.every((line) => line.length === 0),
        }),
      ),
    ),
  });
}

describe("fiscal notification document input analysis", () => {
  it("wires all 87 families to an extractor and only materializes observed facts", async () => {
    expect(FISCAL_NOTIFICATION_FAMILY_RULES_V2).toHaveLength(87);
    expect(
      new Set(FISCAL_NOTIFICATION_FAMILY_RULES_V2.map((rule) => rule.familyId))
        .size,
    ).toBe(87);
    const extractorIds = new Set<string>(BASE_EXTRACTOR_IDS_V1);

    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      expect(extractorIds.has(rule.extractorId), rule.familyId).toBe(true);
      const authority = rule.allowedAuthorities[0]?.anchors[0]?.literals[0];
      expect(authority, rule.familyId).toBeTruthy();

      const titleOnly = await analyzeFiscalNotificationDocumentInput(
        input([authority!, rule.canonicalTitle].join("\n")),
      );
      expect(titleOnly.verticalSliceReview.documents, rule.familyId).toEqual([]);

      const observed = await analyzeFiscalNotificationDocumentInput(
        input(
          [
            authority!,
            rule.canonicalTitle,
            ...rule.requiredAnchors.map((anchor) => anchor.literals[0]),
            "Fecha de emisión: 16/07/2026",
          ].join("\n"),
        ),
      );
      const familyDocuments = observed.verticalSliceReview.documents.filter(
        (document) => document.familyId === rule.familyId,
      );
      expect(familyDocuments, rule.familyId).toHaveLength(1);
      expect(
        familyDocuments[0]?.fields,
        rule.familyId,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            semantic: "DATE",
            canonicalType: "ISSUE_DATE",
            normalizedValue: "2026-07-16",
            sourcePageNumbers: [1],
          }),
        ]),
      );
      expect(JSON.stringify(familyDocuments), rule.familyId).not.toMatch(
        /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|SIGNED_CENTS:|V[3-7]:INSTALLMENT:|_DURATION|_CONTENT/u,
      );
    }
  });

  it("recognizes a closed historical template without inventing saveable facts", async () => {
    const source = input(
      [
        "AGENCIA TRIBUTARIA",
        "www.agenciatributaria.es",
        "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO",
        "IDENTIFICACIÓN DEL DOCUMENTO",
        "IMPORTE DE LA DEUDA",
      ].join("\n"),
    );

    const first = await analyzeFiscalNotificationDocumentInput(source);
    const second = await analyzeFiscalNotificationDocumentInput(source);

    expect(first.familyAnalysis).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
          conflictingAnchorIds: [],
        },
      ],
    });
    expect(first).toEqual(second);
    expect(first.verticalSliceReview).toMatchObject({
      schemaVersion: 1,
      status: "INFORMATION_PENDING",
      documents: [],
      retainedSourceContent: "NONE",
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(source.pages[0]?.text).toContain("NOTIFICACIÓN");
    expect(JSON.stringify(first)).not.toContain("NOTIFICACIÓN");
  });

  it("shows structured fields for a historical documentation requirement", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "AGENCIA TRIBUTARIA",
          "www.agenciatributaria.gob.es",
          "REQUERIMIENTO",
          "IDENTIFICACIÓN DEL DOCUMENTO",
          "Referencia: REQ-DOC-SYN-PIPELINE-001",
          "ACUERDO",
          "Deberá aportar la documentación que se indica a continuación",
          "- Documentación justificativa de los datos declarados",
          "PLAZO",
          "Diez días hábiles desde el día siguiente a la recepción",
          "INFORMACIÓN ADICIONAL",
          "La falta de atención puede producir las consecuencias impresas",
          "NORMAS APLICABLES",
        ].join("\n"),
      ),
    );

    expect(result.familyAnalysis).toMatchObject({
      engineVersion: "1.5.0",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE",
          missingRequiredAnchorIds: [],
        }),
      ],
    });
    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "requirement",
          familyId: "compliance.document_request",
          title: "Requerimiento de documentación",
          subtitle: "Documentación solicitada pendiente de revisión",
          fields: expect.arrayContaining([
            expect.objectContaining({
              canonicalType: "ACT_ID",
              displayValue: "REQ-DOC-SYN-PIPELINE-001",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result.verticalSliceReview)).not.toContain(
      "Detectado en el documento",
    );
  });

  it("recognizes a profile-driven family and projects only its structured fields", async () => {
    const sourceMarker = "RAW-TAX-DATA-SOURCE-MUST-DISAPPEAR";
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "AGENCIA TRIBUTARIA",
          "sede.agenciatributaria.gob.es",
          "Datos fiscales",
          "Ejercicio fiscal: 2025",
          "Fecha de emisión: 16/07/2026",
          "Total del documento: 1.234,56 €",
          sourceMarker,
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "informative-communication",
          familyId: "information.tax_data_report",
          title: "Datos fiscales",
          pageFrom: 1,
          pageTo: 1,
          fields: expect.arrayContaining([
            expect.objectContaining({
              canonicalType: "FISCAL_YEAR",
              displayValue: "2025",
            }),
            expect.objectContaining({
              canonicalType: "ISSUE_DATE",
              normalizedValue: "2026-07-16",
            }),
            expect.objectContaining({
              canonicalType: "OTHER",
              amountCents: 123_456,
              currency: "EUR",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
    expect(JSON.stringify(result)).not.toContain(sourceMarker);
  });

  it("keeps a request number strongly typed through the profile pipeline", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "Agencia Estatal de Administración Tributaria",
          "Requerimiento de subsanación o garantía de aplazamiento",
          "Número de solicitud: REQ-SYN-PROFILE-001",
          "Fecha de emisión: 18/07/2026",
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          familyId: "collection.deferral_substantiation_requirement",
          fields: expect.arrayContaining([
            expect.objectContaining({
              semantic: "REFERENCE",
              canonicalType: "REQUEST_NUMBER",
              displayValue: "REQ-SYN-PROFILE-001",
              normalizedValue: "REQ-SYN-PROFILE-001",
              sourcePageNumbers: [1],
            }),
          ]),
        }),
      ],
    });
  });

  it("does not materialize a V10 title without observed required values", async () => {
    const sourceMarker = "PRIVATE-V9-SOURCE-MUST-DISAPPEAR";
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
          "Solicitud o justificante de ampliación de plazo",
          sourceMarker,
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
      retainedSourceContent: "NONE",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
    expect(JSON.stringify(result.verticalSliceReview)).not.toContain("P0_V10");
    expect(JSON.stringify(result)).not.toContain(sourceMarker);
  });

  it("keeps V9 sector profiles outside ordinary classification", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
          "Respuesta técnica o rechazo de registros de facturación",
        ].join("\n"),
      ),
    );

    expect(
      result.verticalSliceReview.documents.some(
        (document) => document.familyId === "verifactu.technical_response",
      ),
    ).toBe(false);
  });

  it("separates multiple acts in one PDF even when they share an extractor", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      multipageInput([
        [
          "Agencia Estatal de Administración Tributaria",
          "Datos fiscales",
          "Ejercicio fiscal: 2025",
        ],
        ["Anexo del primer acto sin título propio"],
        [
          "Agencia Estatal de Administración Tributaria",
          "Comunicación informativa de cambio normativo o de canal",
          "Fecha de emisión: 16/07/2026",
        ],
      ]),
    );

    expect(result.verticalSliceReview.status).toBe("REVIEW_REQUIRED");
    expect(
      result.verticalSliceReview.documents.map((document) => ({
        extractorId: document.extractorId,
        familyId: document.familyId,
        pageFrom: document.pageFrom,
      })),
    ).toEqual([
      {
        extractorId: "informative-communication",
        familyId: "information.tax_data_report",
        pageFrom: 1,
      },
      {
        extractorId: "informative-communication",
        familyId: "information.regulatory_change",
        pageFrom: 3,
      },
    ]);
    expect(new Set(result.verticalSliceReview.documents.map(({ reviewDocumentId }) => reviewDocumentId)).size)
      .toBe(2);
  });

  it.each([
    {
      caseName: "a near-miss title",
      lines: [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "Resumen de datos fiscales",
      ],
    },
    {
      caseName: "an incompatible authority",
      lines: ["MINISTERIO DE HACIENDA", "Datos fiscales"],
    },
    {
      caseName: "a conflicting guide marker",
      lines: [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "Datos fiscales",
        "Manual de usuario",
      ],
    },
  ])("does not promote $caseName through the profile-driven route", async ({ lines }) => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(lines.join("\n")),
    );

    expect(result.verticalSliceReview).toEqual({
      schemaVersion: 1,
      reviewVersion: "1.0.0",
      status: "INFORMATION_PENDING",
      documents: [],
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("recognizes a deferral denial instead of returning an unknown document", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "AGENCIA TRIBUTARIA",
          "www.agenciatributaria.es",
          "DENEGACIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
          "Número de expediente: EXP-SYN-DENIAL-PIPELINE",
          "Vista la petición por un importe de 728,44 euros, se acuerda DENEGAR la petición",
          "formulada.",
          "MOTIVACIÓN",
          "Motivo sintético impreso en la resolución.",
          "PLAZOS DE INGRESO",
          "El plazo de ingreso finaliza el día 20 del mes posterior.",
          "CONSECUENCIAS DE LA FALTA DE PAGO",
          "Puede iniciarse el procedimiento de apremio.",
          "4 de julio de 2017",
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "deferral",
          familyId: "collection.deferral_denial",
          title: "Denegación de aplazamiento o fraccionamiento",
          fields: expect.arrayContaining([
            expect.objectContaining({
              canonicalType: "ISSUE_DATE",
              normalizedValue: "2017-07-04",
            }),
            expect.objectContaining({
              canonicalType: "TOTAL_CLAIMED",
              amountCents: 72_844,
              currency: "EUR",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
    });
    expect(JSON.stringify(result.verticalSliceReview)).not.toContain(
      "Detectado en el documento",
    );
    expect(JSON.stringify(result.verticalSliceReview)).not.toContain(
      "DOCUMENT_STATUS",
    );
  });

  it("projects every observed installment from the structured deferral extractor", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      multipageInput([
        [
          "AGENCIA TRIBUTARIA",
          "sede.agenciatributaria.gob.es",
          "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
          "Número de expediente: EXP-SYN-PIPELINE-GRANT",
          "ACUERDO",
          "Se concede el aplazamiento por el importe de 500,00 euros.",
        ],
        [
          "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
          "Número Fecha de Importe Fecha de",
          "Concepto Importe",
          "Liquidación Intereses del plazo Vencimiento",
          "L-SYN-PIPELINE-1 CONCEPTO SINTÉTICO 01-01-2026 1.000,00 250,00 20-02-2026",
          "250,00 20-03-2026",
          "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
          "CÁLCULO DE INTERESES",
        ],
      ]),
    );

    const documents = result.verticalSliceReview.documents.filter(
      (document) => document.familyId === "collection.deferral_grant",
    );
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({ extractorId: "deferral" });
    expect(
      documents[0]?.fields.filter(
        (field) =>
          field.semantic === "MONEY" &&
          field.canonicalType === "OTHER" &&
          field.amountCents === 25_000,
      ),
    ).toHaveLength(2);
    expect(
      documents[0]?.fields.filter(
        (field) => field.canonicalType === "INSTALLMENT_DUE_DATE",
      ),
    ).toEqual([
      expect.objectContaining({
        normalizedValue: "2026-02-20",
        sourcePageNumbers: [2],
      }),
      expect.objectContaining({
        normalizedValue: "2026-03-20",
        sourcePageNumbers: [2],
      }),
    ]);
  });

  it("uses an observed first-page modification statement without losing the replacement schedule", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      multipageInput([
        [
          "AGENCIA TRIBUTARIA",
          "sede.agenciatributaria.gob.es",
          "CONCESIÓN DEL APLAZAMIENTO O FRACCIONAMIENTO DE PAGO",
          "Número de expediente: EXP-SYN-PIPELINE-MODIFIED-1",
          "Solicitud de modificación de aplazamiento concedido: nuevo calendario de pago",
          "ACUERDO",
          "Se concede el aplazamiento por el importe de 500,00 euros.",
        ],
        [
          "ANEXO I: DEUDAS Y PLAZOS DE LA NOTIFICACIÓN",
          "Número Fecha de Importe Fecha de",
          "Concepto Importe",
          "Liquidación Intereses del plazo Vencimiento",
          "L-SYN-PIPELINE-MOD CONCEPTO SINTÉTICO 01-01-2026 1.000,00 250,00 20-04-2026",
          "250,00 20-05-2026",
          "ANEXO II: LIQUIDACIÓN DE INTERESES DE DEMORA",
          "CÁLCULO DE INTERESES",
        ],
      ]),
    );

    expect(result.verticalSliceReview.documents).toHaveLength(1);
    expect(result.verticalSliceReview.documents[0]).toMatchObject({
      extractorId: "deferral",
      familyId: "collection.deferral_modification",
    });
    expect(
      result.verticalSliceReview.documents[0]?.fields.filter(
        (field) => field.canonicalType === "INSTALLMENT_DUE_DATE",
      ),
    ).toHaveLength(2);
    expect(
      result.verticalSliceReview.documents.some(
        (document) => document.familyId === "collection.deferral_grant",
      ),
    ).toBe(false);
  });

  it("keeps one external-debt card while reusing the printed enforcement amounts", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "AGENCIA TRIBUTARIA",
          "sede.agenciatributaria.gob.es",
          "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO",
          "Organismo de origen: TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL",
          "Clave de liquidación: LQ-SYN-EXTERNAL-001",
          "Referencia del documento: REF-SYN-EXTERNAL-002",
          "Fecha de emisión: 05/02/2026",
          "IMPORTE DE LA DEUDA",
          "Principal pendiente: 1.234,56 EUR",
          "Recargo de apremio ordinario (20 %): 246,91 EUR",
          "Ingreso a cuenta: 0,00 EUR",
          "Importe total: 1.481,47 EUR",
          "PLAZOS DE PAGO",
          "CARTA DE PAGO",
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview.documents).toHaveLength(1);
    expect(result.verticalSliceReview.documents[0]).toMatchObject({
      extractorId: "payment-order",
      familyId: "collection.external_debt",
    });
    expect(
      result.verticalSliceReview.documents.some(
        (document) => document.familyId === "collection.enforcement_order",
      ),
    ).toBe(false);
    expect(result.verticalSliceReview.documents[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalType: "PRINCIPAL",
          amountCents: 123_456,
        }),
        expect.objectContaining({
          canonicalType: "TOTAL_CLAIMED",
          amountCents: 148_147,
        }),
        expect.objectContaining({
          canonicalType: "ISSUE_DATE",
          normalizedValue: "2026-02-05",
        }),
      ]),
    );
  });

  it("keeps stacked enforcement references, dates and amounts in their printed semantic slots", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      stackedInput([
        "DOCUMENTO SINTÉTICO DE QA - SIN VALIDEZ",
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "PROVIDENCIA DE APREMIO",
        "IDENTIFICACIÓN DEL DOCUMENTO",
        "Prueba automatizada local",
        "Clave de liquidación",
        "LQ-SYNTH-QA-2026-001",
        "Referencia del documento",
        "APR-SYNTH-QA-2026-001",
        "Número de expediente",
        "EXP-SYNTH-QA-2026-001",
        "Fecha de emisión",
        "05/02/2026",
        "Fecha de firma",
        "06/02/2026",
        "Fecha de finalización del período voluntario",
        "28/02/2026",
        "IMPORTE DE LA DEUDA",
        "Desglose impreso",
        "Principal pendiente 100,00 EUR",
        "Recargo de apremio ordinario (20 %) 20,00 EUR",
        "Ingreso a cuenta 0,00 EUR",
        "Importe total 120,00 EUR",
      ]),
    );

    expect(result.verticalSliceReview.documents).toHaveLength(1);
    const document = result.verticalSliceReview.documents[0]!;
    expect(document).toMatchObject({
      familyId: "collection.enforcement_order",
      title: "Providencia de apremio",
    });
    expect(semanticFieldSignatures(document)).toEqual([
      "REFERENCE:LIQUIDATION_KEY:LQ-SYNTH-QA-2026-001",
      "REFERENCE:ACT_ID:APR-SYNTH-QA-2026-001",
      "REFERENCE:EXPEDIENTE_ID:EXP-SYNTH-QA-2026-001",
      "DATE:ISSUE_DATE:2026-02-05",
      "DATE:SIGNING_DATE:2026-02-06",
      "DATE:VOLUNTARY_PAYMENT_DEADLINE:2026-02-28",
      "MONEY:OUTSTANDING_PRINCIPAL:10000",
      "MONEY:EXECUTIVE_SURCHARGE_20:2000",
      "MONEY:PAYMENT_ON_ACCOUNT:0",
      "MONEY:OTHER:12000",
    ]);
    expect(
      document.fields.every((field) =>
        field.sourcePageNumbers.every((pageNumber) => pageNumber === 1),
      ),
    ).toBe(true);
  });

  it("keeps stacked bank seizure fields in their printed semantic slots", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      stackedInput([
        "DOCUMENTO SINTÉTICO DE QA - SIN VALIDEZ",
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
        "Número de diligencia EMB-SYNTH-QA-2026-002",
        "Número de expediente EXP-SYNTH-QA-2026-001",
        "Clave de deuda DEBT-SYNTH-QA-2026-001",
        "Clave de liquidación LQ-SYNTH-QA-2026-001",
        "Referencia de la providencia APR-SYNTH-QA-2026-001",
        "Fecha de emisión 03/03/2026",
        "Fecha del embargo 04/03/2026",
        "Plazo de contestación 12/03/2026",
        "Principal 100,00 EUR",
        "Recargo de apremio 20,00 EUR",
        "Intereses de demora 3,00 EUR",
        "Costas 1,00 EUR",
        "Total pendiente 124,00 EUR",
        "Importe a embargar 124,00 EUR",
        "Instrucciones Contestar por la sede electrónica",
      ]),
    );

    expect(result.verticalSliceReview.documents).toHaveLength(1);
    const document = result.verticalSliceReview.documents[0]!;
    expect(document).toMatchObject({
      familyId: "seizure.bank_account",
      title: "Diligencia de embargo de cuenta bancaria",
    });
    expect(semanticFieldSignatures(document)).toEqual([
      "REFERENCE:SEIZURE_ORDER_ID:EMB-SYNTH-QA-2026-002",
      "REFERENCE:EXPEDIENTE_ID:EXP-SYNTH-QA-2026-001",
      "REFERENCE:DEBT_KEY:DEBT-SYNTH-QA-2026-001",
      "REFERENCE:LIQUIDATION_KEY:LQ-SYNTH-QA-2026-001",
      "REFERENCE:ACT_ID:APR-SYNTH-QA-2026-001",
      "DATE:ISSUE_DATE:2026-03-03",
      "DATE:SEIZURE_DATE:2026-03-04",
      "DATE:RESPONSE_DEADLINE:2026-03-12",
      "MONEY:OUTSTANDING_PRINCIPAL:10000",
      "MONEY:EXECUTIVE_SURCHARGE:2000",
      "MONEY:LATE_INTEREST:300",
      "MONEY:COSTS:100",
      "MONEY:TOTAL_PENDING:12400",
      "MONEY:SEIZED_AMOUNT:12400",
    ]);
    expect(
      document.fields.every((field) =>
        field.sourcePageNumbers.every((pageNumber) => pageNumber === 1),
      ),
    ).toBe(true);
    expect(document.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: "DETAIL",
          canonicalType: "SEIZURE_INSTRUCTIONS",
          displayValue: "Consta en el documento",
          normalizedValue: "SEIZURE_INSTRUCTIONS",
          sourcePageNumbers: [1],
        }),
      ]),
    );
    expect(JSON.stringify(result.verticalSliceReview)).not.toContain(
      "Contestar por la sede electrónica",
    );
  });

  it("extracts publication or appearance evidence only from observed printed facts", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "Agencia Estatal de Administración Tributaria",
          "DILIGENCIA DE PUBLICACIÓN DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
          "DILIGENCIA DE PUBLICACIÓN",
          "NOTIFICACIÓN POR COMPARECENCIA",
          "Identificador: PUB-SYN-PIPELINE-001",
          "Referencia del acto citado: ACT-SYN-PIPELINE-001",
          "Tipo del acto citado: EXECUTIVE_LIQUIDATION",
          "Fecha de publicación: 18/07/2026",
          "Número de publicación: BOE-SYN-2026-0718",
          "Fecha de emisión: 19/07/2026",
        ].join("\n"),
      ),
    );

    const document = result.verticalSliceReview.documents.find(
      (item) => item.familyId === "notification.publication_or_appearance",
    );
    expect(document).toMatchObject({
      extractorId: "notification-envelope",
      title: "Publicación o comparecencia para notificación",
      fields: expect.arrayContaining([
        expect.objectContaining({
          fieldId: expect.stringContaining("CERTIFICATE_OR_COMMUNICATION_ID"),
          normalizedValue: "PUB-SYN-PIPELINE-001",
        }),
        expect.objectContaining({
          fieldId: expect.stringContaining("UNDERLYING_ACT_REFERENCE"),
          normalizedValue: "ACT-SYN-PIPELINE-001",
        }),
        expect.objectContaining({
          fieldId: expect.stringContaining("PUBLICATION_DATE"),
          normalizedValue: "2026-07-18",
        }),
        expect.objectContaining({
          fieldId: expect.stringContaining("ISSUE_DATE"),
          normalizedValue: "2026-07-19",
        }),
      ]),
    });
    expect(JSON.stringify(document?.fields)).not.toMatch(
      /INTEGER:|BOOLEAN:|APPEARANCE_DURATION|PROVES_UNDERLYING_ACT_CONTENT|EXPLANATION:/u,
    );
  });

  it("does not turn a title-only tax data profile into a saveable fact set", async () => {
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "Agencia Estatal de Administración Tributaria",
          "sede.agenciatributaria.gob.es",
          "Datos fiscales",
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
    });
  });

  it("returns no family or facts for a blank bounded input", async () => {
    expect(await analyzeFiscalNotificationDocumentInput(input(""))).toEqual({
      hasText: false,
      pageCount: 1,
      verticalSliceReview: {
        schemaVersion: 1,
        reviewVersion: "1.0.0",
        status: "INFORMATION_PENDING",
        documents: [],
        sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
        retainedSourceContent: "NONE",
        requiresHumanReview: true,
        materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
        permitsDebtCreation: false,
        permitsDeadlineCreation: false,
        permitsPaymentAction: false,
        permitsAccountingAction: false,
      },
      familyAnalysis: null,
      enforcementMoneyFacts: null,
      enforcementExplicitFields: null,
      enforcementPartyFacts: null,
      deferralGrantFacts: null,
      offsetAgreementFacts: null,
    });
  });

  it("transports an exact notification envelope without retaining its source page", async () => {
    const sourceMarker = "RAW-NOTIFICATION-SOURCE-MUST-DISAPPEAR";
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "Dirección Electrónica Habilitada Única",
          "dehu.redsara.es",
          "ACUSE DE RECIBO",
          "Estado de la notificación: Rechazada",
          "Identificador de la notificación: NOT-SYN-PIPELINE-001",
          "Identificador del acto: ACT-SYN-PIPELINE-001",
          "Asunto: Resolución sintética notificada",
          "Fecha de puesta a disposición: 10/07/2026 08:15",
          "Fecha de rechazo: 12/07/2026 09:42",
          sourceMarker,
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "notification-envelope",
          familyId: "notification.dehu_envelope",
          title: "Sobre o acuse de notificación electrónica",
          subtitle: "Notificación rechazada",
          fields: expect.arrayContaining([
            expect.objectContaining({
              canonicalType: "NOTIFICATION_ID",
              displayValue: "NOT-SYN-PIPELINE-001",
            }),
            expect.objectContaining({
              canonicalType: "ACT_ID",
              displayValue: "ACT-SYN-PIPELINE-001",
            }),
            expect.objectContaining({
              canonicalType: "REJECTION_DATE",
              displayValue: "12/07/2026",
              normalizedValue: "2026-07-12",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain(sourceMarker);
  });

  it("transports exact payment evidence fields without retaining the source text", async () => {
    const rawAccount = "ES12 3456 7890 1234 5678 9012";
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "Agencia Tributaria",
          "sede.agenciatributaria.gob.es",
          "JUSTIFICANTE DE PAGO",
          "Número de justificante: REC-SYN-PIPELINE-001",
          "NRC: ABCDEF1234567890GHIJKL",
          "Fecha del pago: 14/07/2026",
          "N.I.F.: 12345678Z",
          "Modelo: 303",
          "Ejercicio: 2026",
          "Periodo: 2T",
          "Clave de deuda: DEBT-SYN-PIPELINE-001",
          "Importe pagado: 600,00 euros",
          "Resultado del pago: Pago confirmado",
          `Cuenta de cargo: ${rawAccount}`,
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "payment-evidence",
          familyId: "payment.receipt",
          title: "Justificante de pago",
          fields: expect.arrayContaining([
            expect.objectContaining({
              canonicalType: "TOTAL_PAID",
              amountCents: 60_000,
              displayValue: "600,00 €",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain(rawAccount);
    expect(JSON.stringify(result)).not.toContain("****9012");
    expect(JSON.stringify(result)).not.toContain("12345678Z");
  });

  it("transports an exact seizure with useful fields and no raw account", async () => {
    const rawAccount = "ES00 0000 0000 0000 1234";
    const result = await analyzeFiscalNotificationDocumentInput(
      input(
        [
          "Agencia Tributaria",
          "sede.agenciatributaria.gob.es",
          "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
          "Número de diligencia: EMB-SYN-PIPELINE-001",
          "Número de expediente: EXP-SYN-PIPELINE-001",
          "Deudor: PERSONA DEUDORA SINTÉTICA",
          "Destinatario: BANCO SINTÉTICO",
          "Entidad financiera: BANCO SINTÉTICO",
          `IBAN: ${rawAccount}`,
          "Límite del embargo: 1.240,00 EUR",
          "Importe retenido: 900,00 EUR",
          "Fecha del embargo: 04/03/2026",
        ].join("\n"),
      ),
    );

    expect(result.verticalSliceReview).toMatchObject({
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "seizure",
          familyId: "seizure.bank_account",
          title: "Diligencia de embargo de cuenta bancaria",
          subtitle: "Diligencia de embargo registrada",
          fields: expect.arrayContaining([
            expect.objectContaining({
              canonicalType: "SEIZURE_ORDER_ID",
              displayValue: "EMB-SYN-PIPELINE-001",
            }),
            expect.objectContaining({
              canonicalType: "SEIZURE_LIMIT",
              amountCents: 124_000,
            }),
            expect.objectContaining({
              canonicalType: "RETAINED_AMOUNT",
              amountCents: 90_000,
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain(rawAccount);
    expect(JSON.stringify(result)).not.toContain("****1234");
    expect(JSON.stringify(result)).not.toContain("PERSONA DEUDORA SINTÉTICA");
    expect(JSON.stringify(result)).not.toContain("BANCO SINTÉTICO");
  });
});
