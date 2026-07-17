import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
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
  it("recognizes a closed historical AEAT enforcement template deterministically", async () => {
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
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "payment-order",
          familyId: "collection.enforcement_order",
          title: "Providencia de apremio",
        }),
      ],
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
            expect.objectContaining({
              canonicalType: "DOCUMENTATION_REQUIRED",
              displayValue: "Detectado en el documento",
              normalizedValue: "DOCUMENTATION_REQUIRED",
            }),
            expect.objectContaining({
              canonicalType: "EXPLICIT_CONSEQUENCE",
              displayValue: "Detectado en el documento",
              normalizedValue: "EXPLICIT_CONSEQUENCE",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
    });
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

  it("upgrades an official-only V9 profile to the V10 deep review without retaining source text", async () => {
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
      status: "REVIEW_REQUIRED",
      documents: [
        expect.objectContaining({
          extractorId: "requirement",
          familyId: "procedure.deadline_extension_request",
          title: "Solicitud de ampliación del plazo de un trámite tributario",
          subtitle: "Revisa los datos detectados y completa los que falten",
          warnings: expect.arrayContaining([
            "P0_V10_INCOMPLETE_REQUIRED_FIELDS",
            "P0_V10_MISSING_PROCEDURE_ID",
            "P0_V10_MISSING_FILING_DATE",
            "P0_V10_MISSING_ORIGINAL_DEADLINE",
            "P0_V10_MISSING_REQUEST_REASON",
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
              canonicalType: "DOCUMENT_STATUS",
              displayValue: "Solicitud de aplazamiento denegada",
            }),
            expect.objectContaining({
              canonicalType: "ISSUE_DATE",
              normalizedValue: "2017-07-04",
            }),
            expect.objectContaining({
              canonicalType: "TOTAL_CLAIMED",
              amountCents: 72_844,
              currency: "EUR",
            }),
            expect.objectContaining({
              canonicalType: "DEFERRAL_REASON",
              displayValue: "Detectado en el documento",
              normalizedValue: "DEFERRAL_REASON",
            }),
          ]),
        }),
      ],
      retainedSourceContent: "NONE",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
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
