import type { FiscalNotificationVerticalSliceReviewFieldV1 } from "./vertical-slice-review.v1";
import {
  createEmptyFiscalNotificationVerticalSliceReviewV1,
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";
import type { AeatOfficialCatalogExtractorOutcomeV9 } from "./extractor-core/official-catalog-extractor.v9";

export const AEAT_OFFICIAL_CATALOG_REVIEW_VERSION_V9 = "9.0.0" as const;

export function projectAeatOfficialCatalogReviewV9(
  outcome: AeatOfficialCatalogExtractorOutcomeV9,
): FiscalNotificationVerticalSliceReviewV1 {
  if (
    outcome.status !== "REVIEW_REQUIRED" ||
    outcome.familyId === null ||
    outcome.candidate === null
  ) {
    return createEmptyFiscalNotificationVerticalSliceReviewV1(
      outcome.status === "BLOCKED" ? "BLOCKED" : "INFORMATION_PENDING",
    );
  }
  const pages = Object.freeze([
    ...new Set([
      ...outcome.candidate.titlePageNumbers,
      ...outcome.candidate.authorityPageNumbers,
    ]),
  ].sort((left, right) => left - right));
  if (pages.length === 0) {
    return createEmptyFiscalNotificationVerticalSliceReviewV1();
  }
  const recognitionField: FiscalNotificationVerticalSliceReviewFieldV1 =
    Object.freeze({
      fieldId: "profile:recognition:official-catalog-v9:0",
      semantic: "DETAIL",
      canonicalType: "FACT_OR_GROUND",
      label: "Reconocimiento documental",
      displayValue: "Título y autoridad coinciden",
      normalizedValue: "OFFICIAL_ONLY_TITLE_AND_AUTHORITY",
      amountCents: null,
      currency: null,
      sourcePageNumbers: pages,
      sourceLabel: "Título del documento",
      confidence: 1,
      reviewStatus: "REVIEW_REQUIRED",
    });
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [
      {
        reviewDocumentId: `review-document:official-catalog-v9:${outcome.familyId}`,
        extractorId: outcome.candidate.extractorId,
        familyId: outcome.familyId,
        title: outcome.candidate.canonicalTitle,
        subtitle: "Coincidencia oficial; revisión obligatoria",
        pageFrom: pages[0]!,
        pageTo: pages.at(-1)!,
        confidence: 1,
        fields: [recognitionField],
        warnings: ["profile.OFFICIAL_ONLY_FORMAT_NOT_HARDENED"],
        requiresHumanReview: true,
      },
    ],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}
