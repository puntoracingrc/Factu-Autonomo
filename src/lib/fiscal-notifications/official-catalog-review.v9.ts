import {
  createEmptyFiscalNotificationVerticalSliceReviewV1,
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
  return createEmptyFiscalNotificationVerticalSliceReviewV1(
    "INFORMATION_PENDING",
  );
}
