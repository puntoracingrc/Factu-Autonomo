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
      reviewLabel: "Pendiente de revisar antes de guardar",
      originalLabel: "Original no guardado",
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
  });
});
