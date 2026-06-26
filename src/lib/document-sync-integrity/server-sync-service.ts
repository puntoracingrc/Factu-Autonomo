import {
  applyDocumentSyncBatch,
  planDocumentSyncBatch,
  summarizeDocumentSyncBatchResult,
  type DocumentSyncServerApplyResult,
  type DocumentSyncServerBatchAdapter,
} from "./server-sync-batch";
import {
  DocumentSyncServerCommandError,
  type DocumentSyncServerCommand,
  type DocumentSyncServerCommandResult,
  validateDocumentSyncServerCommand,
} from "./server-sync-command";
import {
  buildDocumentSyncServerAuditEvent,
  type InMemoryDocumentSyncServerAuditSink,
} from "./server-sync-audit";
import {
  redactDocumentSyncServerError,
  serializeDocumentSyncServerResult,
} from "./server-sync-response";
import type {
  DocumentSyncMutationPlan,
} from "./sync-planner";
import type {
  DocumentSyncSafeReport,
} from "./sync-report";
import type {
  DocumentSyncStoreScope,
} from "./sync-store";
import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncSafeSummary,
} from "./types";

// PHASE2C26_SERVER_DOCUMENT_SYNC_SERVICE_V1
assertServerOnlyModule();

type Awaitable<T> = T | Promise<T>;

export interface DocumentSyncServerSafeState {
  scope: DocumentSyncStoreScope;
  total: number;
  records: DocumentSyncSafeSummary[];
}

export interface DocumentSyncServerConflictReport {
  scope: DocumentSyncStoreScope;
  totalConflicts: number;
  conflicts: DocumentSyncConflict[];
}

export interface DocumentSyncServerServiceAdapter
  extends DocumentSyncServerBatchAdapter {
  plan(candidate: DocumentSyncCandidate): Awaitable<DocumentSyncMutationPlan>;
  apply(candidate: DocumentSyncCandidate): Awaitable<DocumentSyncServerApplyResult>;
  getSafeState(scope: DocumentSyncStoreScope): Awaitable<DocumentSyncServerSafeState>;
  getConflictReport(
    scope: DocumentSyncStoreScope,
  ): Awaitable<DocumentSyncServerConflictReport>;
  getSafeReport?(scope: DocumentSyncStoreScope): Awaitable<DocumentSyncSafeReport>;
}

export interface DocumentSyncServerServiceDependencies {
  adapter: DocumentSyncServerServiceAdapter;
  auditSink?: InMemoryDocumentSyncServerAuditSink;
}

export interface DocumentSyncServerService {
  handle(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  dryRunSingle(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  applySingle(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  dryRunBatch(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  applyBatch(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  getSafeState(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  getConflictReport(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
  getSafeReport(command: DocumentSyncServerCommand): Promise<DocumentSyncServerCommandResult>;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El servicio server-only de sync documental solo puede cargarse en servidor.",
    );
  }
}

function commandScope(command: DocumentSyncServerCommand): DocumentSyncStoreScope {
  return {
    userId: command.auth.userId,
    scopeId: command.auth.scopeId,
  };
}

function protectedSummary(summary: DocumentSyncSafeSummary): boolean {
  return (
    summary.lifecycle !== "draft" ||
    summary.integrityLock === "locked" ||
    Boolean(summary.statusLegacy && summary.statusLegacy !== "borrador")
  );
}

async function safeReportFromAdapter(
  adapter: DocumentSyncServerServiceAdapter,
  scope: DocumentSyncStoreScope,
): Promise<DocumentSyncSafeReport> {
  if (adapter.getSafeReport) return adapter.getSafeReport(scope);

  const state = await adapter.getSafeState(scope);
  const conflictReport = await adapter.getConflictReport(scope);
  const rejectedReasons: Record<string, number> = {};

  for (const conflict of conflictReport.conflicts) {
    const reasons = new Set([
      conflict.conflictReason,
      ...conflict.safeSummary.riskFlags,
    ]);
    for (const reason of reasons) {
      rejectedReasons[reason] = (rejectedReasons[reason] ?? 0) + 1;
    }
  }

  return {
    scope: { ...scope },
    totalDrafts: state.records.filter(
      (summary) => summary.lifecycle === "draft" && !protectedSummary(summary),
    ).length,
    totalProtected: state.records.filter(protectedSummary).length,
    totalConflicts: conflictReport.conflicts.length,
    latestVersion: Math.max(
      0,
      ...state.records.map(
        (summary) => summary.currentVersion ?? summary.candidateVersion ?? 0,
      ),
    ),
    rejectedReasons,
    safeSummaries: state.records,
    conflicts: conflictReport.conflicts,
  };
}

function resultBase(
  command: DocumentSyncServerCommand,
): Pick<
  DocumentSyncServerCommandResult,
  "commandKind" | "requestId" | "serverDerivedUserId" | "serverDerivedScopeId"
> {
  return {
    commandKind: command.kind,
    requestId: command.requestId,
    serverDerivedUserId: command.auth.userId,
    serverDerivedScopeId: command.auth.scopeId,
  };
}

function resultFromPlan(
  command: DocumentSyncServerCommand,
  plan: DocumentSyncMutationPlan,
): DocumentSyncServerCommandResult {
  if (plan.status === "allowedMutation") {
    return {
      ...resultBase(command),
      status: "accepted",
      safeSummary: plan.safeSummary,
      plan,
    };
  }
  if (plan.status === "conflict") {
    return {
      ...resultBase(command),
      status: "conflict",
      safeSummary: plan.safeSummary,
      conflict: plan.conflict,
      plan,
    };
  }
  if (plan.status === "noop") {
    return {
      ...resultBase(command),
      status: "noop",
      reason: plan.reason,
      safeSummary: plan.safeSummary,
      plan,
    };
  }
  return {
    ...resultBase(command),
    status: "rejected",
    safeSummary: plan.safeSummary,
    error: {
      code: plan.rejection.code,
      message: plan.rejection.message,
    },
    plan,
  };
}

function resultFromApply(
  command: DocumentSyncServerCommand,
  applyResult: DocumentSyncServerApplyResult,
): DocumentSyncServerCommandResult {
  if (applyResult.status === "accepted") {
    return {
      ...resultBase(command),
      status: "accepted",
      version: applyResult.version,
      safeSummary: applyResult.safeSummary,
    };
  }
  if (applyResult.status === "conflict") {
    return {
      ...resultBase(command),
      status: "conflict",
      conflict: applyResult.conflict,
      safeSummary: applyResult.safeSummary,
    };
  }
  if (applyResult.status === "noop") {
    return {
      ...resultBase(command),
      status: "noop",
      reason: applyResult.reason,
      safeSummary: applyResult.safeSummary,
    };
  }
  return {
    ...resultBase(command),
    status: "rejected",
    reason: applyResult.reason,
    message: applyResult.message,
    safeSummary: applyResult.safeSummary,
  };
}

function rejectedResult(
  command: DocumentSyncServerCommand | undefined,
  error: unknown,
): DocumentSyncServerCommandResult {
  return {
    commandKind: command?.kind ?? "dry_run_single",
    requestId: command?.requestId,
    serverDerivedUserId: command?.auth.userId,
    serverDerivedScopeId: command?.auth.scopeId,
    status: "rejected",
    safeSummary: command?.safeSummary,
    error: redactDocumentSyncServerError(error),
  };
}

function audit(
  sink: InMemoryDocumentSyncServerAuditSink | undefined,
  eventType: Parameters<typeof buildDocumentSyncServerAuditEvent>[0]["eventType"],
  command: DocumentSyncServerCommand,
  result?: DocumentSyncServerCommandResult,
): void {
  sink?.write(
    buildDocumentSyncServerAuditEvent({
      eventType,
      command,
      result,
      decisionStatus: result?.status,
      riskFlags:
        result?.safeSummary && "riskFlags" in result.safeSummary
          ? result.safeSummary.riskFlags
          : [],
    }),
  );
}

async function withValidation(
  command: DocumentSyncServerCommand,
  fn: (validated: DocumentSyncServerCommand) => Promise<DocumentSyncServerCommandResult>,
): Promise<DocumentSyncServerCommandResult> {
  try {
    return serializeDocumentSyncServerResult(
      await fn(validateDocumentSyncServerCommand(command)),
    );
  } catch (error) {
    if (error instanceof DocumentSyncServerCommandError) {
      return serializeDocumentSyncServerResult(rejectedResult(command, error));
    }
    return serializeDocumentSyncServerResult(rejectedResult(command, error));
  }
}

export function createDocumentSyncServerService(
  dependencies: DocumentSyncServerServiceDependencies,
): DocumentSyncServerService {
  const { adapter, auditSink } = dependencies;

  return {
    async handle(command) {
      return withValidation(command, async (validated) => {
        audit(auditSink, "server_sync_command_received", validated);
        switch (validated.kind) {
          case "dry_run_single":
            return this.dryRunSingle(validated);
          case "apply_single":
            return this.applySingle(validated);
          case "dry_run_batch":
            return this.dryRunBatch(validated);
          case "apply_batch":
            return this.applyBatch(validated);
          case "get_safe_state":
            return this.getSafeState(validated);
          case "get_conflict_report":
            return this.getConflictReport(validated);
          case "get_safe_report":
            return this.getSafeReport(validated);
        }
      });
    },

    async dryRunSingle(command) {
      return withValidation(command, async (validated) => {
        if (!validated.candidate) {
          throw new DocumentSyncServerCommandError(
            "INVALID_COMMAND_PAYLOAD",
            "dryRunSingle requiere candidate.",
            validated.safeSummary,
          );
        }
        const result = resultFromPlan(
          validated,
          await adapter.plan(validated.candidate),
        );
        audit(auditSink, "server_sync_dry_run_completed", validated, result);
        return result;
      });
    },

    async applySingle(command) {
      return withValidation(command, async (validated) => {
        if (!validated.candidate) {
          throw new DocumentSyncServerCommandError(
            "INVALID_COMMAND_PAYLOAD",
            "applySingle requiere candidate.",
            validated.safeSummary,
          );
        }
        const result = resultFromApply(
          validated,
          await adapter.apply(validated.candidate),
        );
        audit(auditSink, "server_sync_apply_completed", validated, result);
        return result;
      });
    },

    async dryRunBatch(command) {
      return withValidation(command, async (validated) => {
        const batch = await planDocumentSyncBatch(adapter, validated);
        const result = summarizeDocumentSyncBatchResult(batch);
        audit(auditSink, "server_sync_batch_completed", validated, result);
        return result;
      });
    },

    async applyBatch(command) {
      return withValidation(command, async (validated) => {
        const batch = await applyDocumentSyncBatch(adapter, validated);
        const result = summarizeDocumentSyncBatchResult(batch);
        audit(auditSink, "server_sync_batch_completed", validated, result);
        return result;
      });
    },

    async getSafeState(command) {
      return withValidation(command, async (validated) => {
        const safeState = await adapter.getSafeState(commandScope(validated));
        const result: DocumentSyncServerCommandResult = {
          ...resultBase(validated),
          status: "accepted",
          safeSummary: validated.safeSummary,
          safeState,
        };
        audit(auditSink, "server_sync_safe_report_requested", validated, result);
        return result;
      });
    },

    async getConflictReport(command) {
      return withValidation(command, async (validated) => {
        const conflictReport = await adapter.getConflictReport(
          commandScope(validated),
        );
        const result: DocumentSyncServerCommandResult = {
          ...resultBase(validated),
          status: "accepted",
          safeSummary: validated.safeSummary,
          conflictReport,
        };
        audit(
          auditSink,
          "server_sync_conflict_report_requested",
          validated,
          result,
        );
        return result;
      });
    },

    async getSafeReport(command) {
      return withValidation(command, async (validated) => {
        const safeReport = await safeReportFromAdapter(
          adapter,
          commandScope(validated),
        );
        const result: DocumentSyncServerCommandResult = {
          ...resultBase(validated),
          status: "accepted",
          safeSummary: validated.safeSummary,
          safeReport,
        };
        audit(auditSink, "server_sync_safe_report_requested", validated, result);
        return result;
      });
    },
  };
}
