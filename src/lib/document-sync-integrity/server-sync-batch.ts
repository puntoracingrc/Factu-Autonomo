import type {
  DocumentSyncServerCommand,
  DocumentSyncServerCommandResult,
} from "./server-sync-command";
import type {
  DocumentSyncMutationPlan,
} from "./sync-planner";
import type {
  LocalStagingDocumentSyncAdapterResult,
} from "./sync-adapter";
import type {
  DocumentSyncCandidate,
  DocumentSyncDecisionStatus,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C27_SERVER_SYNC_BATCH_PROCESSING_V1
assertServerOnlyModule();

type Awaitable<T> = T | Promise<T>;

export type DocumentSyncServerApplyResult =
  LocalStagingDocumentSyncAdapterResult;

export interface DocumentSyncServerBatchAdapter {
  plan(candidate: DocumentSyncCandidate): Awaitable<DocumentSyncMutationPlan>;
  apply(candidate: DocumentSyncCandidate): Awaitable<DocumentSyncServerApplyResult>;
}

export interface DocumentSyncServerBatchItemResult {
  itemId: string;
  index: number;
  status: DocumentSyncDecisionStatus;
  safeSummary?: DocumentSyncSafeSummary;
  plan?: DocumentSyncMutationPlan;
  applyResult?: DocumentSyncServerApplyResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface DocumentSyncServerBatchSafeSummary {
  commandKind: DocumentSyncServerCommand["kind"];
  requestId: string;
  total: number;
  accepted: number;
  rejected: number;
  conflict: number;
  noop: number;
  stoppedEarly: boolean;
}

export interface DocumentSyncServerBatchResult {
  status: DocumentSyncDecisionStatus;
  mode: "dry_run" | "apply";
  itemCount: number;
  stoppedEarly: boolean;
  items: DocumentSyncServerBatchItemResult[];
  safeSummary: DocumentSyncServerBatchSafeSummary;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El batch server-only de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function statusFromPlan(plan: DocumentSyncMutationPlan): DocumentSyncDecisionStatus {
  if (plan.status === "allowedMutation") return "accepted";
  if (plan.status === "rejectedMutation") return "rejected";
  if (plan.status === "conflict") return "conflict";
  return "noop";
}

function safeSummaryFromPlan(plan: DocumentSyncMutationPlan): DocumentSyncSafeSummary {
  return plan.safeSummary;
}

function safeSummaryFromApply(
  result: DocumentSyncServerApplyResult,
): DocumentSyncSafeSummary {
  return result.safeSummary;
}

function itemFromError(
  command: DocumentSyncServerCommand,
  index: number,
  itemId: string,
  error: unknown,
): DocumentSyncServerBatchItemResult {
  return {
    itemId,
    index,
    status: "rejected",
    safeSummary: command.candidates[index]?.candidate
      ? {
          operationKind: command.candidates[index].candidate.operationKind,
          localDocumentId: command.candidates[index].candidate.localDocumentId,
          serverDerivedUserId: command.auth.userId,
          serverDerivedScopeId: command.auth.scopeId,
          requestId: command.requestId,
          payloadHashPresent: false,
          snapshotHashPresent: false,
          pdfSnapshotHashPresent: false,
          riskFlags: ["unsafe_response_shape"],
        }
      : undefined,
    error: {
      code: error instanceof Error ? error.name : "BATCH_ITEM_ERROR",
      message: "El item de sync se rechazo de forma controlada.",
    },
  };
}

function shouldStop(
  command: DocumentSyncServerCommand,
  item: DocumentSyncServerBatchItemResult,
): boolean {
  return Boolean(command.options.stopOnFirstError && item.status !== "accepted");
}

function summarizeBatch(
  command: DocumentSyncServerCommand,
  mode: DocumentSyncServerBatchResult["mode"],
  items: DocumentSyncServerBatchItemResult[],
  stoppedEarly: boolean,
): DocumentSyncServerBatchResult {
  const accepted = items.filter((item) => item.status === "accepted").length;
  const rejected = items.filter((item) => item.status === "rejected").length;
  const conflict = items.filter((item) => item.status === "conflict").length;
  const noop = items.filter((item) => item.status === "noop").length;
  const status: DocumentSyncDecisionStatus =
    items.length === 0
      ? "noop"
      : rejected > 0
        ? "rejected"
        : conflict > 0
          ? "conflict"
          : accepted > 0
            ? "accepted"
            : "noop";

  return {
    status,
    mode,
    itemCount: items.length,
    stoppedEarly,
    items,
    safeSummary: {
      commandKind: command.kind,
      requestId: command.requestId,
      total: items.length,
      accepted,
      rejected,
      conflict,
      noop,
      stoppedEarly,
    },
  };
}

export async function planDocumentSyncBatch(
  adapter: DocumentSyncServerBatchAdapter,
  command: DocumentSyncServerCommand,
): Promise<DocumentSyncServerBatchResult> {
  const items: DocumentSyncServerBatchItemResult[] = [];
  let stoppedEarly = false;

  for (let index = 0; index < command.candidates.length; index += 1) {
    const entry = command.candidates[index];
    try {
      const plan = await adapter.plan(entry.candidate);
      const item: DocumentSyncServerBatchItemResult = {
        itemId: entry.itemId,
        index,
        status: statusFromPlan(plan),
        safeSummary: safeSummaryFromPlan(plan),
        plan,
      };
      items.push(item);
      if (shouldStop(command, item)) {
        stoppedEarly = true;
        break;
      }
    } catch (error) {
      const item = itemFromError(command, index, entry.itemId, error);
      items.push(item);
      if (shouldStop(command, item)) {
        stoppedEarly = true;
        break;
      }
    }
  }

  return summarizeBatch(command, "dry_run", items, stoppedEarly);
}

export async function applyDocumentSyncBatch(
  adapter: DocumentSyncServerBatchAdapter,
  command: DocumentSyncServerCommand,
): Promise<DocumentSyncServerBatchResult> {
  const items: DocumentSyncServerBatchItemResult[] = [];
  let stoppedEarly = false;

  for (let index = 0; index < command.candidates.length; index += 1) {
    const entry = command.candidates[index];
    try {
      const applyResult = await adapter.apply(entry.candidate);
      const item: DocumentSyncServerBatchItemResult = {
        itemId: entry.itemId,
        index,
        status: applyResult.status,
        safeSummary: safeSummaryFromApply(applyResult),
        applyResult,
      };
      items.push(item);
      if (shouldStop(command, item)) {
        stoppedEarly = true;
        break;
      }
    } catch (error) {
      const item = itemFromError(command, index, entry.itemId, error);
      items.push(item);
      if (shouldStop(command, item)) {
        stoppedEarly = true;
        break;
      }
    }
  }

  return summarizeBatch(command, "apply", items, stoppedEarly);
}

export function summarizeDocumentSyncBatchResult(
  result: DocumentSyncServerBatchResult,
): DocumentSyncServerCommandResult {
  return {
    commandKind: result.safeSummary.commandKind,
    requestId: result.safeSummary.requestId,
    status: "batch_completed",
    batchResult: {
      status: result.status,
      mode: result.mode,
      itemCount: result.itemCount,
      stoppedEarly: result.stoppedEarly,
      items: result.items.map((item) => ({
        itemId: item.itemId,
        index: item.index,
        status: item.status,
        safeSummary: item.safeSummary,
        error: item.error,
      })),
      safeSummary: result.safeSummary,
    },
    safeSummary: result.safeSummary,
  };
}
