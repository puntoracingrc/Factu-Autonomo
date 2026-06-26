import { planDocumentSyncMutation } from "./sync-planner";
import { buildDocumentSyncSafeSummary } from "./sync-policy";
import type {
  DocumentSyncSafeReport,
} from "./sync-report";
import type {
  DocumentSyncStoreRecord,
  DocumentSyncStoreScope,
} from "./sync-store";
import type {
  DocumentSyncCandidate,
  DocumentSyncConflict,
  DocumentSyncCurrentState,
  DocumentSyncDecisionStatus,
  DocumentSyncSafeSummary,
} from "./types";
import {
  assertDocumentSyncSupabaseScope,
  type DocumentSyncSupabaseStore,
} from "./supabase-contract";
import { DocumentSyncSupabaseStoreError } from "./supabase-store";

// PHASE2C16_SUPABASE_LOCAL_STAGING_SYNC_ADAPTER_V1
assertServerOnlyModule();

export type SupabaseLocalStagingDocumentSyncAdapterResult =
  | {
      status: "accepted";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "accepted">;
      safeSummary: DocumentSyncSafeSummary;
      version: number;
    }
  | {
      status: "rejected";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "rejected">;
      reason: string;
      message: string;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "conflict";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "conflict">;
      conflict: DocumentSyncConflict;
      safeSummary: DocumentSyncSafeSummary;
    }
  | {
      status: "noop";
      decisionStatus: Extract<DocumentSyncDecisionStatus, "noop">;
      reason: "no_effective_change" | "protected_remote_preserved";
      safeSummary: DocumentSyncSafeSummary;
    };

export interface SupabaseLocalStagingDocumentSyncSafeState {
  scope: DocumentSyncStoreScope;
  total: number;
  records: DocumentSyncSafeSummary[];
}

export interface SupabaseLocalStagingDocumentSyncConflictReport {
  scope: DocumentSyncStoreScope;
  totalConflicts: number;
  conflicts: DocumentSyncConflict[];
}

export interface SupabaseLocalStagingDocumentSyncAdapterOptions {
  serverScope: DocumentSyncStoreScope;
}

export interface SupabaseLocalStagingDocumentSyncAdapter {
  plan(
    candidate: DocumentSyncCandidate,
  ): Promise<ReturnType<typeof planDocumentSyncMutation>>;
  apply(
    candidate: DocumentSyncCandidate,
  ): Promise<SupabaseLocalStagingDocumentSyncAdapterResult>;
  getSafeState(
    scope: DocumentSyncStoreScope,
  ): Promise<SupabaseLocalStagingDocumentSyncSafeState>;
  getConflictReport(
    scope: DocumentSyncStoreScope,
  ): Promise<SupabaseLocalStagingDocumentSyncConflictReport>;
  getSafeReport(scope: DocumentSyncStoreScope): Promise<DocumentSyncSafeReport>;
  readonly store: DocumentSyncSupabaseStore;
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El adaptador Supabase local/staging de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function scopeFromCandidate(candidate: DocumentSyncCandidate): DocumentSyncStoreScope {
  return {
    userId: candidate.context.userId,
    scopeId: candidate.context.scopeId,
  };
}

function currentStateFromRecord(
  record: DocumentSyncStoreRecord,
): DocumentSyncCurrentState {
  return {
    exists: true,
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    userId: record.userId,
    scopeId: record.scopeId,
    version: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    updatedAt: record.updatedAt,
  };
}

async function findCurrent(
  store: DocumentSyncSupabaseStore,
  candidate: DocumentSyncCandidate,
): Promise<DocumentSyncStoreRecord | null> {
  const scope = scopeFromCandidate(candidate);
  if (candidate.documentId) {
    const byId = await store.getById(candidate.documentId, scope);
    if (byId) return byId;
  }

  return (
    (await store.listByScope(scope)).find(
      (record) => record.localDocumentId === candidate.localDocumentId,
    ) ?? null
  );
}

function syntheticDocumentId(candidate: DocumentSyncCandidate): string {
  return candidate.documentId ?? `SYNTHETIC_ONLY_SUPABASE_${candidate.localDocumentId}`;
}

function recordFromCandidate(
  candidate: DocumentSyncCandidate,
  current: DocumentSyncStoreRecord | null,
  version: number,
): DocumentSyncStoreRecord {
  return {
    documentId: current?.documentId ?? syntheticDocumentId(candidate),
    localDocumentId: current?.localDocumentId ?? candidate.localDocumentId,
    userId: candidate.context.userId,
    scopeId: candidate.context.scopeId,
    version,
    payloadHash: candidate.payloadHash ?? current?.payloadHash,
    snapshotHash: candidate.snapshotHash ?? current?.snapshotHash,
    pdfSnapshotHash: candidate.pdfSnapshotHash ?? current?.pdfSnapshotHash,
    documentNumber: candidate.documentNumber ?? current?.documentNumber,
    documentSeries: candidate.documentSeries ?? current?.documentSeries,
    lifecycle: candidate.lifecycle ?? current?.lifecycle ?? "draft",
    integrityLock: candidate.integrityLock ?? current?.integrityLock ?? "unlocked",
    statusLegacy: candidate.statusLegacy ?? current?.statusLegacy ?? "borrador",
    updatedAt: candidate.updatedAt ?? current?.updatedAt,
  };
}

function safeSummaryForRecord(
  record: DocumentSyncStoreRecord,
): DocumentSyncSafeSummary {
  return buildDocumentSyncSafeSummary({
    operationKind: "sync_local_backup",
    documentId: record.documentId,
    localDocumentId: record.localDocumentId,
    candidateVersion: record.version,
    payloadHash: record.payloadHash,
    snapshotHash: record.snapshotHash,
    pdfSnapshotHash: record.pdfSnapshotHash,
    documentNumber: record.documentNumber,
    documentSeries: record.documentSeries,
    lifecycle: record.lifecycle,
    integrityLock: record.integrityLock,
    statusLegacy: record.statusLegacy,
    requestedResponseShape: "safe_summary",
    context: {
      userId: record.userId,
      scopeId: record.scopeId,
      userIdSource: "server",
    },
  });
}

function isProtectedSummary(summary: DocumentSyncSafeSummary): boolean {
  return (
    summary.lifecycle !== "draft" ||
    summary.integrityLock === "locked" ||
    Boolean(summary.statusLegacy && summary.statusLegacy !== "borrador")
  );
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function rejectedFromError(
  candidate: DocumentSyncCandidate,
  error: unknown,
): SupabaseLocalStagingDocumentSyncAdapterResult {
  const safeSummary = buildDocumentSyncSafeSummary(candidate, null, []);
  return {
    status: "rejected",
    decisionStatus: "rejected",
    reason:
      error instanceof DocumentSyncSupabaseStoreError
        ? error.name
        : "SUPABASE_SYNC_ADAPTER_ERROR",
    message:
      error instanceof Error
        ? "La operacion Supabase local/staging se rechazo de forma controlada."
        : "La operacion Supabase local/staging no pudo completarse.",
    safeSummary,
  };
}

export function createSupabaseLocalStagingDocumentSyncAdapter(
  store: DocumentSyncSupabaseStore,
  options: SupabaseLocalStagingDocumentSyncAdapterOptions,
): SupabaseLocalStagingDocumentSyncAdapter {
  return {
    store,

    async plan(candidate) {
      assertDocumentSyncSupabaseScope(
        options.serverScope,
        scopeFromCandidate(candidate),
      );
      const current = await findCurrent(store, candidate);
      return planDocumentSyncMutation(
        candidate,
        current ? currentStateFromRecord(current) : null,
      );
    },

    async apply(candidate) {
      try {
        assertDocumentSyncSupabaseScope(
          options.serverScope,
          scopeFromCandidate(candidate),
        );
        const current = await findCurrent(store, candidate);
        const currentState = current ? currentStateFromRecord(current) : null;
        const plan = planDocumentSyncMutation(candidate, currentState);

        if (plan.status === "conflict") {
          await store.recordConflict(plan.conflict);
          return {
            status: "conflict",
            decisionStatus: "conflict",
            conflict: plan.conflict,
            safeSummary: plan.safeSummary,
          };
        }

        if (plan.status === "rejectedMutation") {
          return {
            status: "rejected",
            decisionStatus: "rejected",
            reason: plan.rejection.code,
            message: plan.rejection.message,
            safeSummary: plan.safeSummary,
          };
        }

        if (plan.status === "noop") {
          return {
            status: "noop",
            decisionStatus: "noop",
            reason: plan.reason,
            safeSummary: plan.safeSummary,
          };
        }

        const nextRecord = recordFromCandidate(
          candidate,
          current,
          plan.nextVersion,
        );
        const storeResult =
          candidate.operationKind === "create_draft"
            ? await store.putDraft(nextRecord)
            : candidate.operationKind === "delete_draft"
              ? await store.deleteDraft(
                  nextRecord.documentId,
                  candidate.expectedVersion ?? 0,
                  scopeFromCandidate(candidate),
                )
              : await store.updateDraft(
                  nextRecord,
                  candidate.expectedVersion ?? 0,
                );

        if (storeResult.status === "conflict") {
          await store.recordConflict(storeResult.conflict);
          return {
            status: "conflict",
            decisionStatus: "conflict",
            conflict: storeResult.conflict,
            safeSummary: storeResult.safeSummary,
          };
        }

        if (storeResult.status === "rejected") {
          return {
            status: "rejected",
            decisionStatus: "rejected",
            reason: storeResult.error.code,
            message: storeResult.error.message,
            safeSummary: storeResult.safeSummary,
          };
        }

        return {
          status: "accepted",
          decisionStatus: "accepted",
          safeSummary: storeResult.safeSummary,
          version:
            storeResult.status === "accepted"
              ? storeResult.record.version
              : plan.nextVersion,
        };
      } catch (error) {
        return rejectedFromError(candidate, error);
      }
    },

    async getSafeState(scope) {
      assertDocumentSyncSupabaseScope(options.serverScope, scope);
      const records = (await store.listByScope(scope)).map(safeSummaryForRecord);
      return {
        scope: { ...scope },
        total: records.length,
        records,
      };
    },

    async getConflictReport(scope) {
      assertDocumentSyncSupabaseScope(options.serverScope, scope);
      const conflicts = await store.getConflicts(scope);
      return {
        scope: { ...scope },
        totalConflicts: conflicts.length,
        conflicts,
      };
    },

    async getSafeReport(scope) {
      const state = await this.getSafeState(scope);
      const conflicts = (await this.getConflictReport(scope)).conflicts;
      const rejectedReasons: Record<string, number> = {};

      for (const conflict of conflicts) {
        const reasons = new Set([
          conflict.conflictReason,
          ...conflict.safeSummary.riskFlags,
        ]);
        for (const reason of reasons) increment(rejectedReasons, reason);
      }

      return {
        scope: { ...scope },
        totalDrafts: state.records.filter(
          (summary) =>
            summary.lifecycle === "draft" && !isProtectedSummary(summary),
        ).length,
        totalProtected: state.records.filter(isProtectedSummary).length,
        totalConflicts: conflicts.length,
        latestVersion: Math.max(
          0,
          ...state.records.map(
            (summary) =>
              summary.currentVersion ?? summary.candidateVersion ?? 0,
          ),
        ),
        rejectedReasons,
        safeSummaries: state.records,
        conflicts,
      };
    },
  };
}
