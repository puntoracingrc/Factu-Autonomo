import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import { appendStructuredReviewRelationSuggestionsV1 } from "./structured-review-relation-suggestions.v1";
import {
  appendAeatEnforcementStructuredReviewV1,
  FiscalNotificationStructuredReviewV1Error,
  type AppendAeatEnforcementStructuredReviewResultV1,
} from "./structured-review-workspace.v1";

export type FiscalNotificationStructuredReviewSaveBlockedReasonV1 =
  | "invalid_structured_review"
  | "no_structured_facts";

export type DurableFiscalNotificationStructuredReviewSaveResultV1 =
  | AppDataDurabilityResult<AppendAeatEnforcementStructuredReviewResultV1>
  | {
      readonly status: "blocked";
      readonly reason: FiscalNotificationStructuredReviewSaveBlockedReasonV1;
    };

export interface SaveFiscalNotificationStructuredReviewCommandInputV1 {
  readonly expected: AppData;
  readonly ownerScope: string;
  readonly reviewId: string;
  readonly createdAt: string;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
  readonly commit: <T>(
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<T>,
  ) => AppDataDurabilityResult<T>;
}

/**
 * Prepara y guarda una ficha estructurada como una única transición durable.
 * Nunca conserva el PDF o el texto completo y nunca materializa deuda, pago,
 * plazo, gasto o asiento.
 */
export function runSaveFiscalNotificationStructuredReviewCommandV1(
  input: SaveFiscalNotificationStructuredReviewCommandInputV1,
): DurableFiscalNotificationStructuredReviewSaveResultV1 {
  let prepared: AppendAeatEnforcementStructuredReviewResultV1;
  try {
    prepared = appendAeatEnforcementStructuredReviewV1({
      ownerScope: input.ownerScope,
      reviewId: input.reviewId,
      createdAt: input.createdAt,
      workspace: input.expected.fiscalNotificationsWorkspace ?? null,
      analysis: input.analysis,
    });
    if (prepared.status === "APPLIED") {
      const relations = appendStructuredReviewRelationSuggestionsV1({
        ownerScope: input.ownerScope,
        workspace: prepared.workspace,
        createdAt: input.createdAt,
      });
      if (relations.status === "APPLIED") {
        prepared = Object.freeze({
          ...prepared,
          workspace: relations.workspace,
        });
      }
    }
  } catch (error) {
    if (
      error instanceof FiscalNotificationStructuredReviewV1Error &&
      error.code === "NO_STRUCTURED_FACTS"
    ) {
      return { status: "blocked", reason: "no_structured_facts" };
    }
    return { status: "blocked", reason: "invalid_structured_review" };
  }

  if (prepared.status === "EXISTING") {
    return {
      status: "applied",
      data: input.expected,
      value: prepared,
      replayed: true,
    };
  }

  return input.commit(input.expected, (previous) => ({
    data: {
      ...previous,
      fiscalNotificationsWorkspace: prepared.workspace,
    },
    value: prepared,
  }));
}
