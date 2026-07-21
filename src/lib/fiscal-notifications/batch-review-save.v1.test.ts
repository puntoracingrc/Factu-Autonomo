import { describe, expect, it, vi } from "vitest";
import type { AppData } from "../types";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import {
  runFiscalNotificationBatchReviewSaveV1,
  type FiscalNotificationBatchReviewSaveItemV1,
} from "./batch-review-save.v1";
import type { DurableFiscalNotificationStructuredReviewSaveResultV1 } from "./structured-review-save-command.v1";

const ANALYSIS = Object.freeze({
  technicalReview: Object.freeze({ status: "REVIEW_REQUIRED" }),
}) as unknown as FiscalNotificationLocalAnalysisResult;

function item(index: number): FiscalNotificationBatchReviewSaveItemV1 {
  return Object.freeze({
    itemId: `item-${index}`,
    reviewId: `review-${index}`,
    createdAt: `2026-07-21T00:0${index}:00.000Z`,
    analysis: ANALYSIS,
  });
}

function data(revision: number): AppData {
  return { version: revision } as unknown as AppData;
}

function applied(
  expected: AppData,
  documentIds: readonly string[],
  status: "applied" | "applied_with_warnings" = "applied",
): DurableFiscalNotificationStructuredReviewSaveResultV1 {
  return {
    status,
    stage: status === "applied" ? "COMMIT" : "RELATIONS",
    safeCode:
      status === "applied" ? "APPLIED" : "RELATION_SUGGESTION_REVIEW_REQUIRED",
    warningCodes:
      status === "applied" ? [] : ["RELATION_RECONCILIATION_PENDING"],
    data: expected,
    value: {
      status: "APPLIED",
      workspace: {},
      documentIds,
    },
    replayed: false,
  } as unknown as DurableFiscalNotificationStructuredReviewSaveResultV1;
}

function blocked(): DurableFiscalNotificationStructuredReviewSaveResultV1 {
  return {
    status: "blocked",
    stage: "COMMIT",
    safeCode: "DURABILITY_CONFLICT",
    warningCodes: [],
    reason: "concurrent_change",
  } as unknown as DurableFiscalNotificationStructuredReviewSaveResultV1;
}

describe("batch review save v1", () => {
  it("guarda todo el lote en orden usando el estado durable más reciente", () => {
    const currentStates = [data(1), data(2), data(3)];
    const getCurrentData = vi
      .fn<() => AppData>()
      .mockReturnValueOnce(currentStates[0]!)
      .mockReturnValueOnce(currentStates[1]!)
      .mockReturnValueOnce(currentStates[2]!);
    const save = vi.fn((input: { expected: AppData; reviewId: string }) =>
      applied(input.expected, [`document:${input.reviewId}`]),
    );

    const result = runFiscalNotificationBatchReviewSaveV1({
      ownerScope: "owner:test",
      items: [item(1), item(2), item(3)],
      getCurrentData,
      now: () => "2026-07-21T01:00:00.000Z",
      save,
    });

    expect(result).toEqual({
      status: "all_saved",
      saved: [
        { itemId: "item-1", documentIds: ["document:review-1"] },
        { itemId: "item-2", documentIds: ["document:review-2"] },
        { itemId: "item-3", documentIds: ["document:review-3"] },
      ],
    });
    expect(getCurrentData).toHaveBeenCalledTimes(3);
    expect(save.mock.calls.map(([input]) => input.expected)).toEqual(
      currentStates,
    );
  });

  it("se detiene en el primer fallo y deja intactos el fallido y los posteriores", () => {
    const save = vi
      .fn()
      .mockImplementationOnce((input) =>
        applied(input.expected, ["document:1"]),
      )
      .mockReturnValueOnce(blocked());

    const result = runFiscalNotificationBatchReviewSaveV1({
      ownerScope: "owner:test",
      items: [item(1), item(2), item(3)],
      getCurrentData: () => data(1),
      now: () => "2026-07-21T01:00:00.000Z",
      save,
    });

    expect(result).toMatchObject({
      status: "stopped",
      failedItemId: "item-2",
      saved: [{ itemId: "item-1", documentIds: ["document:1"] }],
      failure: { status: "blocked", safeCode: "DURABILITY_CONFLICT" },
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.map(([input]) => input.reviewId)).toEqual([
      "review-1",
      "review-2",
    ]);
  });

  it("acepta guardados con advertencias y conserva todos los ids de un PDF multiacto", () => {
    const result = runFiscalNotificationBatchReviewSaveV1({
      ownerScope: "owner:test",
      items: [item(1)],
      getCurrentData: () => data(1),
      now: () => "2026-07-21T01:00:00.000Z",
      save: ({ expected }) =>
        applied(
          expected,
          ["document:act-1", "document:act-2"],
          "applied_with_warnings",
        ),
    });

    expect(result).toEqual({
      status: "all_saved",
      saved: [
        {
          itemId: "item-1",
          documentIds: ["document:act-1", "document:act-2"],
        },
      ],
    });
  });
});
