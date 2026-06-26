import { evaluateDocumentSyncPolicy } from "./sync-policy";
import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncCurrentState,
  DocumentSyncOperationKind,
  DocumentSyncPolicyErrorCode,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C3_SYNC_MUTATION_DRY_RUN_PLANNER_V1
assertServerOnlyModule();

export type DocumentSyncMutationPlanStatus =
  | "allowedMutation"
  | "rejectedMutation"
  | "conflict"
  | "noop";

export interface DocumentSyncAllowedMutationPlan {
  status: "allowedMutation";
  dryRun: true;
  operationKind: DocumentSyncOperationKind;
  targetDocumentId?: string;
  localDocumentId: string;
  expectedVersion?: number;
  nextVersion: number;
  safeSummary: DocumentSyncSafeSummary;
}

export interface DocumentSyncRejectedMutationPlan {
  status: "rejectedMutation";
  dryRun: true;
  operationKind: DocumentSyncOperationKind;
  rejection: {
    code: DocumentSyncPolicyErrorCode;
    message: string;
  };
  safeSummary: DocumentSyncSafeSummary;
}

export interface DocumentSyncConflictPlan {
  status: "conflict";
  dryRun: true;
  operationKind: DocumentSyncOperationKind;
  conflict: DocumentSyncConflict;
  safeSummary: DocumentSyncSafeSummary;
}

export interface DocumentSyncNoopPlan {
  status: "noop";
  dryRun: true;
  operationKind: DocumentSyncOperationKind;
  reason: "no_effective_change" | "protected_remote_preserved";
  safeSummary: DocumentSyncSafeSummary;
}

export type DocumentSyncMutationPlan =
  | DocumentSyncAllowedMutationPlan
  | DocumentSyncRejectedMutationPlan
  | DocumentSyncConflictPlan
  | DocumentSyncNoopPlan;

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El planificador de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function nextVersionFor(currentState?: DocumentSyncCurrentState | null): number {
  return currentState ? currentState.version + 1 : 1;
}

export function planDocumentSyncMutation(
  candidate: DocumentSyncCandidate,
  currentState?: DocumentSyncCurrentState | null,
): DocumentSyncMutationPlan {
  const decision = evaluateDocumentSyncPolicy(candidate, currentState);

  if (decision.status === "accepted") {
    return {
      status: "allowedMutation",
      dryRun: true,
      operationKind: decision.operationKind,
      targetDocumentId: currentState?.documentId ?? candidate.documentId,
      localDocumentId: candidate.localDocumentId,
      expectedVersion: candidate.expectedVersion,
      nextVersion: nextVersionFor(currentState),
      safeSummary: decision.safeSummary,
    };
  }

  if (decision.status === "conflict") {
    return {
      status: "conflict",
      dryRun: true,
      operationKind: decision.operationKind,
      conflict: decision.conflict,
      safeSummary: decision.safeSummary,
    };
  }

  if (decision.status === "noop") {
    return {
      status: "noop",
      dryRun: true,
      operationKind: decision.operationKind,
      reason: decision.reason,
      safeSummary: decision.safeSummary,
    };
  }

  return {
    status: "rejectedMutation",
    dryRun: true,
    operationKind: decision.operationKind,
    rejection: {
      code: decision.error.code,
      message: decision.error.message,
    },
    safeSummary: decision.safeSummary,
  };
}
