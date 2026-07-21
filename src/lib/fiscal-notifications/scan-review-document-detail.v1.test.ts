import { describe, expect, it } from "vitest";
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
});
