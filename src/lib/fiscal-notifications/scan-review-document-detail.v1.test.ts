import { describe, expect, it } from "vitest";
import { analyzeFiscalNotificationDocumentInput } from "./document-input-analysis";
import { projectFiscalNotificationScanReviewDocumentDetailV1 } from "./scan-review-document-detail.v1";
import type {
  FiscalNotificationVerticalSliceReviewDocumentV1,
  FiscalNotificationVerticalSliceReviewFieldV1,
} from "./vertical-slice-review.v1";

function field(
  fieldId: string,
  semantic: FiscalNotificationVerticalSliceReviewFieldV1["semantic"],
  canonicalType: FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"],
  label: string,
  displayValue: string,
  page: number,
  overrides: Partial<FiscalNotificationVerticalSliceReviewFieldV1> = {},
): FiscalNotificationVerticalSliceReviewFieldV1 {
  return Object.freeze({
    fieldId,
    semantic,
    canonicalType,
    label,
    displayValue,
    normalizedValue: null,
    amountCents: null,
    currency: null,
    sourcePageNumbers: [page],
    sourceLabel: label,
    confidence: 0.98,
    reviewStatus: "REVIEW_REQUIRED",
    ...overrides,
  });
}

function document(
  overrides: Partial<FiscalNotificationVerticalSliceReviewDocumentV1> = {},
): FiscalNotificationVerticalSliceReviewDocumentV1 {
  return Object.freeze({
    reviewDocumentId: "review-document:publication",
    extractorId: "notification-envelope",
    familyId: "notification.publication_or_appearance",
    title: "Publicación o comparecencia para notificación",
    subtitle: "Diligencia de publicación sintética",
    pageFrom: 1,
    pageTo: 2,
    confidence: 0.97,
    fields: Object.freeze([
      field(
        "reference:notification",
        "REFERENCE",
        "NOTIFICATION_ID",
        "Referencia de notificación",
        "REF-SINTETICA-001",
        1,
      ),
      field(
        "date:availability",
        "DATE",
        "AVAILABILITY_DATE",
        "Fecha de puesta a disposición",
        "20/07/2026",
        1,
        { normalizedValue: "2026-07-20" },
      ),
      field(
        "authority",
        "DETAIL",
        "ISSUING_AUTHORITY",
        "Organismo emisor",
        "AEAT",
        1,
      ),
    ]),
    warnings: Object.freeze([]),
    requiresHumanReview: true,
    ...overrides,
  });
}

describe("scan review document detail v1", () => {
  it("proyecta la revisión previa con el mismo informe limpio y procedencia por página", () => {
    const source = document();
    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: source,
      allDocuments: [source],
    });

    expect(result.header).toMatchObject({
      familyLabel: "Publicación o comparecencia para notificación",
      primaryDateLabel: "Fecha de puesta a disposición",
      primaryDateValue: "20/07/2026",
      reviewStatus: "PENDING",
      reviewLabel: "Revisión personal pendiente",
      originalLabel: "Original disponible durante el análisis",
    });
    expect(result.header.primaryDateProvenance).toMatchObject({
      basis: "PRINTED",
      pageNumber: 1,
      pageNumbers: [1],
    });
    expect(result.factGroups.flatMap((group) => group.fields)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Referencia de notificación",
          value: "REF-SINTETICA-001",
          provenance: expect.objectContaining({ pageNumbers: [1] }),
        }),
      ]),
    );
    expect(result.economy).toBeNull();
    expect(result.actions).toEqual({ canDelete: false, driveFileId: null });
    expect(result.siblingActs).toEqual([
      expect.objectContaining({ current: true }),
    ]);
  });

  it("elimina tokens de contrato y no inventa false, 15 ni fechas ausentes", () => {
    const polluted = document({
      fields: Object.freeze([
        field(
          "internal:title",
          "DETAIL",
          "DOCUMENT_STATUS",
          "Reconocimiento documental",
          "EXACT_TITLE_AND_AUTHORITY",
          1,
        ),
        field(
          "internal:duration",
          "DETAIL",
          "DOCUMENT_STATUS",
          "Plazo de comparecencia",
          "INTEGER:APPEARANCE_DURATION:15",
          1,
        ),
        field(
          "internal:boolean",
          "STATUS",
          "DOCUMENT_STATUS",
          "Explica el acto citado",
          "BOOLEAN:PROVES_UNDERLYING_ACT_CONTENT:FALSE",
          1,
        ),
        field(
          "internal:explanation",
          "DETAIL",
          "DOCUMENT_STATUS",
          "Qué significa",
          "EXPLANATION:notification.publication_or_appearance:PUBLICATION_DILIGENCE",
          1,
        ),
        field(
          "reference:observed",
          "REFERENCE",
          "NOTIFICATION_ID",
          "Referencia observada",
          "REF-SINTETICA-002",
          2,
        ),
      ]),
    });

    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: polluted,
      allDocuments: [polluted],
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(
      /EXACT_|INTEGER:|BOOLEAN:|EXPLANATION:|APPEARANCE_DURATION|UNDERLYING_ACT_CONTENT/iu,
    );
    expect(result.header.primaryDateValue).toBe("Fecha pendiente");
    expect(result.factGroups.flatMap((group) => group.fields)).toEqual([
      expect.objectContaining({
        label: "Referencia observada",
        value: "REF-SINTETICA-002",
      }),
    ]);
    expect(
      result.factGroups.flatMap((group) =>
        group.fields.map((displayedField) => displayedField.value),
      ),
    ).not.toEqual(expect.arrayContaining(["false", "15"]));
  });

  it("muestra importes realmente observados y oculta la sección cuando no existen", () => {
    const withAmount = document({
      reviewDocumentId: "review-document:enforcement",
      extractorId: "payment-order",
      familyId: "collection.enforcement_order",
      title: "Providencia de apremio",
      fields: Object.freeze([
        field(
          "money:total",
          "MONEY",
          "TOTAL_CLAIMED",
          "Total a ingresar",
          "179,46 €",
          2,
          { amountCents: 17_946, currency: "EUR" },
        ),
      ]),
    });

    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: withAmount,
      allDocuments: [withAmount],
    });

    expect(result.economy?.rows).toEqual([
      expect.objectContaining({
        label: "Total a ingresar",
        value: "179,46 €",
        pageNumbers: [2],
      }),
    ]);
  });

  it("presenta el papel del obligado sin duplicarlo y oculta códigos cortos sin contexto", () => {
    const source = document({
      reviewDocumentId: "review-document:enforcement-presentation",
      extractorId: "payment-order",
      familyId: "collection.enforcement_order",
      title: "Providencia de apremio",
      fields: Object.freeze([
        field(
          "party:debtor",
          "PARTY",
          "PRIMARY_DEBTOR",
          "Deudor principal",
          "PRIMARY_DEBTOR",
          1,
        ),
        field(
          "party:debtor-duplicate",
          "PARTY",
          "PRIMARY_DEBTOR",
          "Deudor principal",
          "PRIMARY_DEBTOR",
          2,
        ),
        field(
          "reference:short-expiry-code",
          "REFERENCE",
          "OTHER_OFFICIAL_REFERENCE",
          "Referencia oficial",
          "14",
          2,
        ),
        field(
          "reference:legacy-payment-form",
          "REFERENCE",
          "PAYMENT_FORM_REFERENCE",
          "Justificante de pago",
          "082600000001A",
          2,
        ),
      ]),
    });

    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: source,
      allDocuments: [source],
    });
    const facts = result.factGroups.flatMap((group) => group.fields);

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Tu papel en el documento",
          value: "Obligado al pago",
          provenance: expect.objectContaining({ pageNumbers: [1, 2] }),
        }),
        expect.objectContaining({
          label: "Número de la carta de pago",
          value: "082600000001A",
        }),
      ]),
    );
    expect(JSON.stringify(facts)).not.toMatch(
      /Referencia oficial|Justificante de pago|Deudor principal/u,
    );
  });

  it("no promueve el modelo 002 de la carta de pago a modelo tributario", () => {
    const source = document({
      reviewDocumentId: "review-document:payment-model-only",
      extractorId: "payment-order",
      familyId: "collection.enforcement_order",
      title: "Providencia de apremio",
      fields: Object.freeze([
        field(
          "payment-form:model",
          "REFERENCE",
          "PAYMENT_FORM_MODEL",
          "Modelo de ingreso",
          "002",
          2,
        ),
      ]),
    });

    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: source,
      allDocuments: [source],
    });

    expect(result.header.metadata).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "model" })]),
    );
    expect(result.factGroups.flatMap((group) => group.fields)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Modelo de ingreso", value: "002" }),
      ]),
    );
  });

  it("presenta el plan reconciliado como resumen y tabla, sin totales planos duplicados", async () => {
    const analyzed = await analyzeFiscalNotificationDocumentInput(
      Object.freeze({
        ownerScope: "user:synthetic-scan-installments",
        documentId: "document:synthetic-scan-installments",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            isBlank: false,
            text: [
              "Agencia Tributaria",
              "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO",
              "Referencia del acuerdo: SYN-PLAN-SCAN-001",
              "Número liquidación: SYN-DEBT-SCAN-001",
              "Cuota Vencimiento Principal Intereses de demora Recargo ejecutivo Total cuota",
              "1 22/06/2026 70,39 0,48 0,00 70,87",
              "2 20/07/2026 70,39 0,71 0,00 71,10",
              "3 20/08/2026 70,41 0,96 0,00 71,37",
              "Totales 211,19 2,15 0,00 213,34",
            ].join("\n"),
          }),
        ]),
      }),
    );
    const source = analyzed.verticalSliceReview.documents.find(
      (candidate) => candidate.familyId === "collection.deferral_grant",
    );
    expect(source).toBeDefined();
    if (!source) return;

    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: source,
      allDocuments: [source],
    });

    expect(result.economy).toMatchObject({
      summary: [
        { label: "Número de cuotas", value: "3" },
        { label: "Principal total", value: "211,19 €" },
        { label: "Intereses totales", value: "2,15 €" },
        { label: "Total programado", value: "213,34 €" },
      ],
      rows: [],
      installmentTotals: {
        count: 3,
        principal: "211,19 €",
        interest: "2,15 €",
        surcharge: "0,00 €",
        total: "213,34 €",
      },
      featuredInstallment: {
        label: "Primera cuota del calendario",
        dueDate: "22/06/2026",
        total: "70,87 €",
      },
      showInstallmentSurcharge: false,
      installments: [
        {
          label: "Cuota 1",
          dueDate: "22/06/2026",
          total: "70,87 €",
          components: [
            { label: "Principal", value: "70,39 €" },
            { label: "Intereses de demora", value: "0,48 €" },
            { label: "Recargo ejecutivo", value: "0,00 €" },
          ],
        },
        { label: "Cuota 2", dueDate: "20/07/2026", total: "71,10 €" },
        { label: "Cuota 3", dueDate: "20/08/2026", total: "71,37 €" },
      ],
    });
    expect(JSON.stringify(result.factGroups)).not.toMatch(
      /Vence 22\/06\/2026|Dato observado|Consta en el documento/u,
    );
    expect(result.integrity).toMatchObject({
      status: "VALIDATED",
      statusLabel: "Comprobación correcta",
      messages: expect.arrayContaining([
        "Los importes cuadran con las cifras impresas.",
      ]),
    });
    expect(result.header.primaryDateLabel).toBe("Fecha del acuerdo");
    expect(result.explanation).toMatchObject({
      documentSays:
        "El acuerdo fija 3 cuotas con sus respectivos vencimientos, principales e intereses.",
      officialMeaning:
        "Hacienda ha aceptado que el principal de 211,19 € se pague en 3 cuotas. Con los intereses del aplazamiento, el total programado asciende a 213,34 €.",
      reviewTitle: "Comprueba el calendario y la domiciliación",
      deadlineTitle: "Cada cuota tiene su propio vencimiento",
    });
    expect(JSON.stringify(result)).not.toContain("INSTALLMENT_DUE_DATE");
  });

  it("separa la providencia del modelo 130 y su carta de pago 002 con comprobación exacta", async () => {
    const analyzed = await analyzeFiscalNotificationDocumentInput(
      Object.freeze({
        ownerScope: "user:synthetic-enforcement-detail",
        documentId: "document:synthetic-enforcement-detail",
        pages: Object.freeze([
          Object.freeze({
            pageNumber: 1,
            isBlank: false,
            text: [
              "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
              "PROVIDENCIA DE APREMIO",
              "PRINCIPAL PENDIENTE",
              "RECARGO DE APREMIO ORDINARIO",
              "PLAZOS DE PAGO",
              "Fecha del documento: 06/06/2026",
              "Modelo: 130",
              "Ejercicio fiscal: 2025",
              "Periodo fiscal: 4T",
              "Clave de liquidación: SYN-LIQ-130-4T-2025",
              "Fin del período voluntario: 22/05/2026",
              "Principal pendiente: 117,12 €",
              "Recargo ordinario del 20 %: 23,42 €",
              "Total ordinario: 140,54 €",
              "Total con recargo reducido 10 %: 128,83 €",
              "Recargo ejecutivo 5 %: 5,86 €",
            ].join("\n"),
          }),
          Object.freeze({
            pageNumber: 2,
            isBlank: false,
            text: [
              "CARTA DE PAGO",
              "Fecha de la carta de pago: 07/06/2026",
              "Modelo: 002",
              "Número de referencia: 082600000001A",
              "Importe de la carta de pago: 140,54 €",
            ].join("\n"),
          }),
        ]),
      }),
    );
    const source = analyzed.verticalSliceReview.documents.find(
      (candidate) => candidate.familyId === "collection.enforcement_order",
    );
    expect(source).toBeDefined();
    if (!source) return;

    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: source,
      allDocuments: [source],
    });
    const facts = result.factGroups.flatMap((group) => group.fields);
    const amounts = result.economy?.rows ?? [];

    expect(result.header).toMatchObject({
      primaryDateLabel: "Fecha de la providencia",
      primaryDateValue: "06/06/2026",
      authority: "Agencia Estatal de Administración Tributaria",
      metadata: expect.arrayContaining([
        { key: "model", label: "Modelo", value: "130" },
        { key: "period", label: "Periodo", value: "4T" },
        { key: "exercise", label: "Ejercicio", value: "2025" },
      ]),
    });
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Clave de liquidación",
          value: "SYN-LIQ-130-4T-2025",
          provenance: expect.objectContaining({ pageNumbers: [1] }),
        }),
        expect.objectContaining({
          label: "Modelo de ingreso",
          value: "002",
          provenance: expect.objectContaining({ pageNumbers: [2] }),
        }),
        expect.objectContaining({
          label: "Número de la carta de pago",
          value: "082600000001A",
          provenance: expect.objectContaining({ pageNumbers: [2] }),
        }),
        expect.objectContaining({
          label: "Fecha de la carta de pago",
          value: "07/06/2026",
          provenance: expect.objectContaining({ pageNumbers: [2] }),
        }),
      ]),
    );
    expect(amounts.map((row) => row.label)).toEqual([
      "Principal pendiente",
      "Total con recargo ordinario",
      "Importe con recargo reducido",
      "Recargo ejecutivo del 5 %",
      "Recargo de apremio ordinario del 20 %",
    ]);
    expect(result.integrity).toMatchObject({
      status: "VALIDATED",
      statusLabel: "Comprobación correcta",
      messages: ["Los importes cuadran con las cifras impresas."],
    });
    expect(result.explanation).toMatchObject({
      documentSays: expect.stringContaining(
        "Los recargos son alternativas y no se suman entre sí.",
      ),
      officialMeaning: expect.stringContaining(
        "El documento ofrece un pago con recargo reducido",
      ),
    });
    expect(JSON.stringify(result)).not.toMatch(
      /Justificante de pago|Ejercicio solicitado|Modelo.*002.*metadata/u,
    );
  });

  it("presenta la liquidación 180/115 sin duplicar cuota, intereses ni carta de pago", async () => {
    const analyzed = await analyzeFiscalNotificationDocumentInput(Object.freeze({
      ownerScope: "user:synthetic-assessment-detail",
      documentId: "document:synthetic-assessment-detail",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          isBlank: false,
          text: [
            "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
            "NOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL",
            "TOTAL A INGRESAR",
            "FINALIZA EL PROCEDIMIENTO",
            "PAGO DE LA DEUDA",
            "Referencia del procedimiento: SYN-PROCEDURE-180-DETAIL",
            "Referencia del acto: SYN-ACT-180-DETAIL",
            "Fecha de firma: 21/05/2025",
            "Modelo tributario: 180",
            "Modelo relacionado: 115",
            "Ejercicio fiscal: 2024",
            "Retenciones anuales declaradas: 684,00 €",
            "Pagos periódicos declarados: 456,00 €",
            "Cuota resultante: 228,00 €",
            "Intereses de demora: 228,00 €",
            "Intereses de demora: 3,07 €",
            "Total a ingresar: 231,07 €",
          ].join("\n"),
        }),
        Object.freeze({
          pageNumber: 2,
          isBlank: false,
          text: [
            "AGENCIA TRIBUTARIA DOCUMENTO DE PAGO",
            "CARTA DE PAGO",
            "Modelo: 002",
            "Clave de liquidación",
            "A 0000000000000024",
            "Importe para ingresar: 231,07 €",
            "L 0000000000000000024",
          ].join("\n"),
        }),
      ]),
    }));
    const source = analyzed.verticalSliceReview.documents.find((candidate) =>
      candidate.familyId === "assessment.final_provisional_assessment",
    );
    expect(source).toBeDefined();
    if (!source) return;
    const result = projectFiscalNotificationScanReviewDocumentDetailV1({
      document: source,
      allDocuments: [source],
    });
    const facts = result.factGroups.flatMap((group) => group.fields);
    expect(result.header.metadata).toEqual(expect.arrayContaining([
      { key: "model", label: "Modelo", value: "180" },
      { key: "exercise", label: "Ejercicio", value: "2024" },
    ]));
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Modelo de ingreso", value: "002" }),
      expect.objectContaining({ label: "Número de la carta de pago", value: "L0000000000000000024" }),
      expect.objectContaining({ label: "Clave de liquidación", value: "A0000000000000024" }),
    ]));
    expect(result.economy?.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Cuota resultante", value: expect.stringMatching(/^228,00\s€$/u) }),
      expect.objectContaining({ label: "Intereses de demora", value: expect.stringMatching(/^3,07\s€$/u) }),
      expect.objectContaining({ label: "Total a ingresar", value: expect.stringMatching(/^231,07\s€$/u) }),
    ]));
    expect(result.economy?.rows.some((row) =>
      row.label === "Intereses de demora" && /^228,00\s€$/u.test(row.value),
    )).toBe(false);
    expect(result.economy?.summary.map((row) => row.label)).toEqual([
      "Cuota resultante", "Intereses de demora", "Total a ingresar",
      "Retenciones anuales declaradas",
    ]);
    expect(result.integrity).toMatchObject({
      status: "VALIDATED",
      statusLabel: "Comprobación correcta",
      messages: ["Los importes cuadran con las cifras impresas."],
    });
    expect(result.explanation).toMatchObject({
      documentSays: expect.stringMatching(
        /^La resolución fija una cuota de 228,00\s€, añade 3,07\s€ de intereses de demora y establece un total a ingresar de 231,07\s€\.$/u,
      ),
      officialMeaning: expect.stringContaining("mediante autoliquidaciones periódicas"),
      reviewTitle: "Comprueba la liquidación y la carta de pago",
    });
    expect(JSON.stringify(result)).not.toMatch(/Intereses de demora[^}]*228,00|Modelo.*002.*metadata/u);
  });
});
