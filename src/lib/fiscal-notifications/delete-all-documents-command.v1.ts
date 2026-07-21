import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import {
  deleteAllFiscalNotificationDocumentsV1,
  type DeleteAllFiscalNotificationDocumentsResultV1,
} from "./delete-all-documents.v1";
import { FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 } from "./workspace-persistence.v1";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  registerFiscalNotificationDocumentReductionTransitionV2,
} from "./workspace-storage-envelope.v2";

export type DurableDeleteAllFiscalNotificationDocumentsResultV1 =
  | AppDataDurabilityResult<
      Extract<
        DeleteAllFiscalNotificationDocumentsResultV1,
        { readonly status: "APPLIED" }
      >
    >
  | Extract<
      DeleteAllFiscalNotificationDocumentsResultV1,
      { readonly status: "BLOCKED" | "NOT_FOUND" }
    >;

export function runDeleteAllFiscalNotificationDocumentsCommandV1(input: {
  readonly expected: AppData;
  readonly ownerScope: string;
  readonly deletedAt: string;
  readonly commit: <T>(
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<T>,
  ) => AppDataDurabilityResult<T>;
}): DurableDeleteAllFiscalNotificationDocumentsResultV1 {
  const prepared = deleteAllFiscalNotificationDocumentsV1({
    workspace: input.expected.fiscalNotificationsWorkspace,
    ownerScope: input.ownerScope,
    deletedAt: input.deletedAt,
  });
  if (prepared.status !== "APPLIED") return prepared;
  const workspace = registerFiscalNotificationDocumentReductionTransitionV2(
    prepared.workspace,
    input.expected.fiscalNotificationsWorkspace,
    input.ownerScope,
    input.deletedAt,
  );
  if (!workspace) {
    return Object.freeze({ status: "BLOCKED", reason: "RESULT_INVALID" });
  }
  const value = Object.freeze({ ...prepared, workspace });

  return input.commit(input.expected, (previous) => ({
    data: clearFiscalNotificationLibraryState(previous, workspace),
    value,
  }));
}

function clearFiscalNotificationLibraryState(
  previous: AppData,
  workspace: NonNullable<AppData["fiscalNotificationsWorkspace"]>,
): AppData {
  const data: AppData = {
    ...previous,
    fiscalNotificationsWorkspace: workspace,
  };
  const pendingChanges = previous.meta?.pendingChanges?.filter(
    (change) =>
      change.entityType !== "fiscal_notifications_workspace" ||
      (change.entityId !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 &&
        change.entityId !== FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2),
  );
  if (previous.meta?.pendingChanges) {
    data.meta = {
      ...previous.meta,
      pendingChanges:
        pendingChanges && pendingChanges.length > 0
          ? pendingChanges
          : undefined,
    };
  }
  const quarantine = (previous.workspaceIntegrityQuarantine ?? []).filter(
    (entry) => entry.collection !== "fiscalNotificationsWorkspace",
  );
  if (quarantine.length > 0) {
    data.workspaceIntegrityQuarantine = quarantine;
  } else {
    delete data.workspaceIntegrityQuarantine;
  }
  return data;
}
