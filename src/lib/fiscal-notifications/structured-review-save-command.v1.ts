import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import { appendStructuredReviewRelationSuggestionsV1 } from "./structured-review-relation-suggestions.v1";
import { appendWorkspaceGlobalReconciliationV8 } from "./workspace-global-reconciliation.v8";
import {
  appendAeatDeferralStructuredReviewV1,
  appendAeatEnforcementStructuredReviewV1,
  appendAeatOffsetStructuredReviewV1,
  FiscalNotificationStructuredReviewV1Error,
  type AppendAeatDeferralStructuredReviewResultV1,
  type AppendAeatEnforcementStructuredReviewResultV1,
  type AppendAeatOffsetStructuredReviewResultV1,
} from "./structured-review-workspace.v1";
import {
  appendFiscalNotificationVerticalSliceReviewV1,
  FiscalNotificationVerticalSliceWorkspaceErrorV1,
  type AppendFiscalNotificationVerticalSliceReviewResultV1,
} from "./vertical-slice-review-workspace.v1";
import { parseFiscalNotificationVerticalSliceReviewV1 } from "./vertical-slice-review.v1";
import { enrichVerticalSliceSpecializedFactsV1 } from "./vertical-slice-specialized-facts.v1";

export type FiscalNotificationStructuredReviewSaveBlockedReasonV1 =
  | "invalid_structured_review"
  | "no_structured_facts";

export type DurableFiscalNotificationStructuredReviewSaveResultV1 =
  | AppDataDurabilityResult<
      | AppendAeatEnforcementStructuredReviewResultV1
      | AppendAeatDeferralStructuredReviewResultV1
      | AppendAeatOffsetStructuredReviewResultV1
      | AppendFiscalNotificationVerticalSliceReviewResultV1
    >
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
  let prepared:
    | AppendAeatEnforcementStructuredReviewResultV1
    | AppendAeatDeferralStructuredReviewResultV1
    | AppendAeatOffsetStructuredReviewResultV1
    | AppendFiscalNotificationVerticalSliceReviewResultV1;
  try {
    if (hasStructuredVerticalSlice(input.analysis)) {
      const vertical = appendFiscalNotificationVerticalSliceReviewV1({
        ownerScope: input.ownerScope,
        reviewId: input.reviewId,
        createdAt: input.createdAt,
        workspace: input.expected.fiscalNotificationsWorkspace ?? null,
        analysis: input.analysis,
      });
      if (vertical.status === "APPLIED") {
        const enrichment = enrichVerticalSliceSpecializedFactsV1({
          ownerScope: input.ownerScope,
          createdAt: input.createdAt,
          workspace: vertical.workspace,
          documentIds: vertical.documentIds,
          analysis: input.analysis,
        });
        prepared = Object.freeze({
          ...vertical,
          workspace: enrichment.workspace,
        });
      } else {
        prepared = vertical;
      }
    } else {
      const append = input.analysis.ephemeralOffsetAgreementFacts
        ? appendAeatOffsetStructuredReviewV1
        : input.analysis.ephemeralDeferralGrantFacts
          ? appendAeatDeferralStructuredReviewV1
          : appendAeatEnforcementStructuredReviewV1;
      prepared = append({
        ownerScope: input.ownerScope,
        reviewId: input.reviewId,
        createdAt: input.createdAt,
        workspace: input.expected.fiscalNotificationsWorkspace ?? null,
        analysis: input.analysis,
      });
    }
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
      const globalReconciliation = appendWorkspaceGlobalReconciliationV8({
        ownerScope: input.ownerScope,
        workspace: prepared.workspace,
        reevaluatedAt: input.createdAt,
      });
      if (globalReconciliation.status === "APPLIED") {
        prepared = Object.freeze({
          ...prepared,
          workspace: globalReconciliation.workspace,
        });
      } else if (globalReconciliation.status === "REVIEW_REQUIRED") {
        return { status: "blocked", reason: "invalid_structured_review" };
      }
    }
  } catch (error) {
    if (
      (error instanceof FiscalNotificationStructuredReviewV1Error &&
        error.code === "NO_STRUCTURED_FACTS") ||
      (error instanceof FiscalNotificationVerticalSliceWorkspaceErrorV1 &&
        error.code === "NO_STRUCTURED_FACTS")
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

function hasStructuredVerticalSlice(
  analysis: FiscalNotificationLocalAnalysisResult,
): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(
    analysis,
    "ephemeralVerticalSliceReview",
  );
  if (!descriptor) return false;
  if (!("value" in descriptor) || descriptor.value === undefined) {
    if ("value" in descriptor) return false;
    throw new FiscalNotificationVerticalSliceWorkspaceErrorV1("INVALID_INPUT");
  }
  const review = parseFiscalNotificationVerticalSliceReviewV1(
    descriptor.value,
  );
  return review.status === "REVIEW_REQUIRED" && review.documents.length > 0;
}
