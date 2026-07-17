import type {
  AppDataDurabilityBlockedReason,
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
import { FiscalNotificationVerticalSliceReviewErrorV1 } from "./vertical-slice-review.v1";
import { enrichVerticalSliceSpecializedFactsV1 } from "./vertical-slice-specialized-facts.v1";
import type { FiscalNotificationsWorkspace } from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

export type FiscalNotificationStructuredReviewSaveStageV1 =
  "CORE" | "ENRICHMENT" | "RELATIONS" | "RECONCILIATION" | "COMMIT";

export type FiscalNotificationStructuredReviewSaveSafeCodeV1 =
  | "APPLIED"
  | "CORE_INVALID_INPUT"
  | "CORE_PRIVACY_REJECTED"
  | "CORE_WORKSPACE_INTEGRITY_FAILED"
  | "FIELD_SKIPPED_UNSUPPORTED_SEMANTIC"
  | "SPECIALIZED_ENRICHMENT_REVIEW_REQUIRED"
  | "RELATION_SUGGESTION_REVIEW_REQUIRED"
  | "GLOBAL_RECONCILIATION_REVIEW_REQUIRED"
  | "DURABILITY_CONFLICT";

export type FiscalNotificationStructuredReviewSaveWarningCodeV1 =
  | "FIELD_SKIPPED_UNSUPPORTED_SEMANTIC"
  | "SPECIALIZED_ENRICHMENT_SKIPPED"
  | "RELATION_RECONCILIATION_PENDING";

type StructuredReviewAppendResultV1 =
  | AppendAeatEnforcementStructuredReviewResultV1
  | AppendAeatDeferralStructuredReviewResultV1
  | AppendAeatOffsetStructuredReviewResultV1
  | AppendFiscalNotificationVerticalSliceReviewResultV1;

export type DurableFiscalNotificationStructuredReviewSaveResultV1 =
  | {
      readonly status: "applied" | "applied_with_warnings";
      readonly stage: FiscalNotificationStructuredReviewSaveStageV1;
      readonly safeCode: FiscalNotificationStructuredReviewSaveSafeCodeV1;
      readonly warningCodes: readonly FiscalNotificationStructuredReviewSaveWarningCodeV1[];
      readonly data: AppData;
      readonly value: StructuredReviewAppendResultV1;
      readonly replayed: boolean;
    }
  | {
      readonly status: "blocked";
      readonly stage: FiscalNotificationStructuredReviewSaveStageV1;
      readonly safeCode: FiscalNotificationStructuredReviewSaveSafeCodeV1;
      readonly warningCodes: readonly FiscalNotificationStructuredReviewSaveWarningCodeV1[];
      readonly reason?:
        AppDataDurabilityBlockedReason | "storage_state_unknown";
    };

export interface StructuredReviewSaveDependenciesV1 {
  readonly enrich: typeof enrichVerticalSliceSpecializedFactsV1;
  readonly relate: typeof appendStructuredReviewRelationSuggestionsV1;
  readonly reconcile: typeof appendWorkspaceGlobalReconciliationV8;
}

const DEFAULT_DEPENDENCIES: StructuredReviewSaveDependenciesV1 = Object.freeze({
  enrich: enrichVerticalSliceSpecializedFactsV1,
  relate: appendStructuredReviewRelationSuggestionsV1,
  reconcile: appendWorkspaceGlobalReconciliationV8,
});

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
  dependencies: StructuredReviewSaveDependenciesV1 = DEFAULT_DEPENDENCIES,
): DurableFiscalNotificationStructuredReviewSaveResultV1 {
  const preflight = validateExistingWorkspace(input);
  if (preflight) return preflight;

  let prepared: StructuredReviewAppendResultV1;
  const warningCodes: FiscalNotificationStructuredReviewSaveWarningCodeV1[] =
    [];
  let warningStage: FiscalNotificationStructuredReviewSaveStageV1 | null = null;
  let warningSafeCode: FiscalNotificationStructuredReviewSaveSafeCodeV1 | null =
    null;
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
        try {
          const enrichment = dependencies.enrich({
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
        } catch {
          prepared = vertical;
          addWarning(warningCodes, "SPECIALIZED_ENRICHMENT_SKIPPED");
          warningStage = "ENRICHMENT";
          warningSafeCode = "SPECIALIZED_ENRICHMENT_REVIEW_REQUIRED";
        }
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
      try {
        const relations = dependencies.relate({
          ownerScope: input.ownerScope,
          workspace: prepared.workspace,
          createdAt: input.createdAt,
        });
        if (relations.status === "APPLIED") {
          prepared = Object.freeze({
            ...prepared,
            workspace: relations.workspace,
          });
        } else if (relations.status === "REVIEW_REQUIRED") {
          addWarning(warningCodes, "RELATION_RECONCILIATION_PENDING");
          warningStage ??= "RELATIONS";
          warningSafeCode ??= "RELATION_SUGGESTION_REVIEW_REQUIRED";
        }
      } catch {
        addWarning(warningCodes, "RELATION_RECONCILIATION_PENDING");
        warningStage ??= "RELATIONS";
        warningSafeCode ??= "RELATION_SUGGESTION_REVIEW_REQUIRED";
      }
      try {
        const globalReconciliation = dependencies.reconcile({
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
          addWarning(warningCodes, "RELATION_RECONCILIATION_PENDING");
          warningStage ??= "RECONCILIATION";
          warningSafeCode ??= "GLOBAL_RECONCILIATION_REVIEW_REQUIRED";
        }
      } catch {
        addWarning(warningCodes, "RELATION_RECONCILIATION_PENDING");
        warningStage ??= "RECONCILIATION";
        warningSafeCode ??= "GLOBAL_RECONCILIATION_REVIEW_REQUIRED";
      }
      if (warningCodes.length > 0) {
        prepared = Object.freeze({
          ...prepared,
          workspace: persistWarningCodes(
            prepared.workspace,
            prepared,
            warningCodes,
            input.ownerScope,
          ),
        });
      }
    }
  } catch (error) {
    if (
      error instanceof FiscalNotificationVerticalSliceReviewErrorV1 &&
      error.code === "PRIVACY_REJECTED"
    ) {
      return blocked("CORE", "CORE_PRIVACY_REJECTED");
    }
    if (
      (error instanceof FiscalNotificationStructuredReviewV1Error &&
        error.code === "NO_STRUCTURED_FACTS") ||
      (error instanceof FiscalNotificationVerticalSliceWorkspaceErrorV1 &&
        error.code === "NO_STRUCTURED_FACTS")
    ) {
      return blocked("CORE", "CORE_INVALID_INPUT");
    }
    return blocked("CORE", "CORE_INVALID_INPUT");
  }

  if (prepared.status === "EXISTING") {
    return {
      status: "applied",
      stage: "COMMIT",
      safeCode: "APPLIED",
      warningCodes: Object.freeze([]),
      data: input.expected,
      value: prepared,
      replayed: true,
    };
  }

  const committed = input.commit(input.expected, (previous) => ({
    data: {
      ...previous,
      fiscalNotificationsWorkspace: prepared.workspace,
    },
    value: prepared,
  }));
  return mapDurabilityResult(
    committed,
    warningCodes,
    warningStage,
    warningSafeCode,
  );
}

function validateExistingWorkspace(
  input: SaveFiscalNotificationStructuredReviewCommandInputV1,
): DurableFiscalNotificationStructuredReviewSaveResultV1 | null {
  const workspace = input.expected.fiscalNotificationsWorkspace;
  if (workspace === undefined || workspace === null) return null;
  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    input.ownerScope,
  );
  return validation.valid
    ? null
    : blocked("CORE", "CORE_WORKSPACE_INTEGRITY_FAILED");
}

function addWarning(
  values: FiscalNotificationStructuredReviewSaveWarningCodeV1[],
  value: FiscalNotificationStructuredReviewSaveWarningCodeV1,
): void {
  if (!values.includes(value)) values.push(value);
}

function persistWarningCodes(
  value: FiscalNotificationsWorkspace,
  prepared: StructuredReviewAppendResultV1,
  warningCodes: readonly FiscalNotificationStructuredReviewSaveWarningCodeV1[],
  ownerScope: string,
): FiscalNotificationsWorkspace {
  const documentIds =
    "documentIds" in prepared ? prepared.documentIds : [prepared.documentId];
  const documentIdSet = new Set(documentIds);
  const candidate: FiscalNotificationsWorkspace = {
    ...structuredClone(value),
    analysisSnapshots: value.analysisSnapshots.map((snapshot) =>
      documentIdSet.has(snapshot.documentId)
        ? {
            ...snapshot,
            validationWarnings: [
              ...new Set([...snapshot.validationWarnings, ...warningCodes]),
            ],
          }
        : structuredClone(snapshot),
    ),
  };
  const validation = validateFiscalNotificationsWorkspaceIntegrity(
    candidate,
    ownerScope,
  );
  if (!validation.valid) {
    throw new FiscalNotificationVerticalSliceWorkspaceErrorV1("INVALID_INPUT");
  }
  return candidate;
}

function mapDurabilityResult(
  result: AppDataDurabilityResult<StructuredReviewAppendResultV1>,
  warningCodes: readonly FiscalNotificationStructuredReviewSaveWarningCodeV1[],
  warningStage: FiscalNotificationStructuredReviewSaveStageV1 | null,
  warningSafeCode: FiscalNotificationStructuredReviewSaveSafeCodeV1 | null,
): DurableFiscalNotificationStructuredReviewSaveResultV1 {
  const frozenWarnings = Object.freeze([...warningCodes]);
  if (result.status === "applied") {
    return {
      status: frozenWarnings.length > 0 ? "applied_with_warnings" : "applied",
      stage: warningStage ?? "COMMIT",
      safeCode: warningSafeCode ?? "APPLIED",
      warningCodes: frozenWarnings,
      data: result.data,
      value: result.value,
      replayed: result.replayed,
    };
  }
  return {
    status: "blocked",
    stage: "COMMIT",
    safeCode: "DURABILITY_CONFLICT",
    warningCodes: frozenWarnings,
    reason: result.reason,
  };
}

function blocked(
  stage: FiscalNotificationStructuredReviewSaveStageV1,
  safeCode: FiscalNotificationStructuredReviewSaveSafeCodeV1,
): DurableFiscalNotificationStructuredReviewSaveResultV1 {
  return {
    status: "blocked",
    stage,
    safeCode,
    warningCodes: Object.freeze([]),
  };
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
  const review = parseFiscalNotificationVerticalSliceReviewV1(descriptor.value);
  return review.status === "REVIEW_REQUIRED" && review.documents.length > 0;
}
