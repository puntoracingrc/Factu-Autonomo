import type { AppData } from "../types";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import type { DurableFiscalNotificationStructuredReviewSaveResultV1 } from "./structured-review-save-command.v1";

export interface FiscalNotificationBatchReviewSaveItemV1 {
  readonly itemId: string;
  readonly reviewId: string;
  readonly createdAt: string;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
}

export interface FiscalNotificationBatchReviewSavedItemV1 {
  readonly itemId: string;
  readonly documentIds: readonly string[];
}

export type FiscalNotificationBatchReviewSaveResultV1 =
  | Readonly<{
      status: "all_saved";
      saved: readonly FiscalNotificationBatchReviewSavedItemV1[];
    }>
  | Readonly<{
      status: "stopped";
      saved: readonly FiscalNotificationBatchReviewSavedItemV1[];
      failedItemId: string;
      failure: Extract<
        DurableFiscalNotificationStructuredReviewSaveResultV1,
        { readonly status: "blocked" }
      >;
    }>;

export function runFiscalNotificationBatchReviewSaveV1(input: {
  readonly ownerScope: string;
  readonly items: readonly FiscalNotificationBatchReviewSaveItemV1[];
  readonly getCurrentData: () => AppData;
  readonly now: () => string;
  readonly save: (input: {
    expected: AppData;
    ownerScope: string;
    reviewId: string;
    createdAt: string;
    confirmedAt: string;
    analysis: FiscalNotificationLocalAnalysisResult;
  }) => DurableFiscalNotificationStructuredReviewSaveResultV1;
}): FiscalNotificationBatchReviewSaveResultV1 {
  const saved: FiscalNotificationBatchReviewSavedItemV1[] = [];

  for (const item of input.items) {
    const write = input.save({
      expected: input.getCurrentData(),
      ownerScope: input.ownerScope,
      reviewId: item.reviewId,
      createdAt: item.createdAt,
      confirmedAt: input.now(),
      analysis: item.analysis,
    });
    if (write.status === "blocked") {
      return Object.freeze({
        status: "stopped" as const,
        saved: Object.freeze(saved),
        failedItemId: item.itemId,
        failure: write,
      });
    }

    saved.push(
      Object.freeze({
        itemId: item.itemId,
        documentIds: Object.freeze(
          "documentIds" in write.value
            ? [...write.value.documentIds]
            : [write.value.documentId],
        ),
      }),
    );
  }

  return Object.freeze({
    status: "all_saved" as const,
    saved: Object.freeze(saved),
  });
}
