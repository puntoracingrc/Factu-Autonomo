import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import { assertBoundedOwnerScope } from "./input-contract";
import type { FiscalNotificationsWorkspace } from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { registerFiscalNotificationAutomaticEmptyRepairTransitionV2 } from "./workspace-storage-envelope.v2";

export const FISCAL_NOTIFICATION_EMPTY_HISTORY_REPAIR_VERSION_V1 =
  "1.0.0" as const;

const FISCAL_NOTIFICATIONS_QUARANTINE_COLLECTION =
  "fiscalNotificationsWorkspace" as const;

export interface FiscalNotificationEmptyHistoryRepairAppliedV1 {
  readonly status: "APPLIED";
  readonly workspace: FiscalNotificationsWorkspace;
  readonly removedQuarantineCount: number;
  readonly historyState: "EMPTY_REVIEW_NEUTRAL";
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export type FiscalNotificationEmptyHistoryRepairBlockedReasonV1 =
  | "invalid_input"
  | "workspace_present"
  | "unsynced_workspace"
  | "fiscal_quarantine_not_found"
  | "fiscal_quarantine_not_auto_repairable";

export type DurableFiscalNotificationEmptyHistoryRepairResultV1 =
  | AppDataDurabilityResult<FiscalNotificationEmptyHistoryRepairAppliedV1>
  | Readonly<{
      status: "blocked";
      reason: FiscalNotificationEmptyHistoryRepairBlockedReasonV1;
    }>;

/**
 * Repara exclusivamente el estado vacío conocido que quedó bloqueado por una
 * cuarentena fiscal obsoleta. No intenta recuperar ni reinterpretar un
 * workspace existente y no materializa hechos, deudas, plazos o acciones.
 */
export function runRepairFiscalNotificationEmptyHistoryCommandV1(input: {
  readonly expected: AppData;
  readonly ownerScope: string;
  readonly confirmedAt: string;
  readonly commit: <T>(
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<T>,
  ) => AppDataDurabilityResult<T>;
}): DurableFiscalNotificationEmptyHistoryRepairResultV1 {
  if (!validOwnerScope(input.ownerScope) || !isIsoTimestamp(input.confirmedAt)) {
    return blocked("invalid_input");
  }
  if (input.expected.fiscalNotificationsWorkspace !== undefined) {
    return blocked("workspace_present");
  }
  if (
    input.expected.meta?.pendingChanges?.some(
      (change) => change.entityType === "fiscal_notifications_workspace",
    )
  ) {
    return blocked("unsynced_workspace");
  }
  const quarantine = input.expected.workspaceIntegrityQuarantine;
  const fiscalQuarantine = inspectFiscalQuarantine(quarantine);
  if (fiscalQuarantine.total === 0) {
    return blocked("fiscal_quarantine_not_found");
  }
  if (!fiscalQuarantine.autoRepairable) {
    return blocked("fiscal_quarantine_not_auto_repairable");
  }
  const removedQuarantineCount = fiscalQuarantine.total;

  const canonicalWorkspace = createCanonicalEmptyWorkspace(
    input.ownerScope,
    input.confirmedAt,
  );
  const workspace = canonicalWorkspace
    ? registerFiscalNotificationAutomaticEmptyRepairTransitionV2(
        canonicalWorkspace,
        input.ownerScope,
        input.confirmedAt,
      )
    : null;
  if (!workspace) return blocked("invalid_input");
  const value = Object.freeze({
    status: "APPLIED" as const,
    workspace,
    removedQuarantineCount,
    historyState: "EMPTY_REVIEW_NEUTRAL" as const,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
  });

  return input.commit(input.expected, (previous) => ({
    data: withRepairedEmptyHistory(previous, workspace),
    value,
  }));
}

function createCanonicalEmptyWorkspace(
  ownerScope: string,
  repairedAt: string,
): FiscalNotificationsWorkspace | null {
  return parseFiscalNotificationsWorkspaceForPersistenceV1(
    {
      schemaVersion: 1,
      workspaceId: "fiscal-notifications-workspace-v1",
      ownerScope,
      revision: 0,
      createdAt: repairedAt,
      updatedAt: repairedAt,
      packages: [],
      files: [],
      documents: [],
      parts: [],
      authorities: [],
      references: [],
      evidence: [],
      debts: [],
      debtObservations: [],
      cases: [],
      relations: [],
      analysisSnapshots: [],
      paymentOptions: [],
      paymentPlans: [],
      installments: [],
      interestCalculations: [],
      deadlineRules: [],
      obligations: [],
      timeline: [],
      accountingDrafts: [],
      auditEvents: [],
      driveArchives: [],
    } satisfies FiscalNotificationsWorkspace,
    ownerScope,
  );
}

function withRepairedEmptyHistory(
  previous: AppData,
  workspace: FiscalNotificationsWorkspace,
): AppData {
  const remainingQuarantine = (previous.workspaceIntegrityQuarantine ?? []).filter(
    (entry) => entry.collection !== FISCAL_NOTIFICATIONS_QUARANTINE_COLLECTION,
  );
  const repaired: AppData = {
    ...previous,
    fiscalNotificationsWorkspace: workspace,
  };
  if (remainingQuarantine.length > 0) {
    repaired.workspaceIntegrityQuarantine = remainingQuarantine;
  } else {
    delete repaired.workspaceIntegrityQuarantine;
  }
  return repaired;
}

function inspectFiscalQuarantine(
  quarantine: AppData["workspaceIntegrityQuarantine"],
): Readonly<{ total: number; autoRepairable: boolean }> {
  const entries = (quarantine ?? []).filter(
    (entry) => entry.collection === FISCAL_NOTIFICATIONS_QUARANTINE_COLLECTION,
  );
  return Object.freeze({
    total: entries.length,
    autoRepairable:
      entries.length > 0 &&
      entries.every((entry) => isPrivacySafeRejectedFiscalPayload(entry.rawValue)),
  });
}

function isPrivacySafeRejectedFiscalPayload(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    keys.length === 2 &&
    keys[0] === "schema" &&
    keys[1] === "status" &&
    record.status === "rejected" &&
    record.schema === "fiscal-notifications-privacy-workspace-v2"
  );
}

function validOwnerScope(value: unknown): value is string {
  try {
    assertBoundedOwnerScope(value, "ownerScope");
    return value.startsWith("user:");
  } catch {
    return false;
  }
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function blocked(
  reason: FiscalNotificationEmptyHistoryRepairBlockedReasonV1,
): Readonly<{
  status: "blocked";
  reason: FiscalNotificationEmptyHistoryRepairBlockedReasonV1;
}> {
  return Object.freeze({ status: "blocked" as const, reason });
}
