import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import {
  deleteFiscalNotificationDocumentV1,
  type DeleteFiscalNotificationDocumentResultV1,
} from "./document-deletion.v1";
import { FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 } from "./workspace-persistence.v1";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  registerFiscalNotificationDocumentReductionTransitionV2,
} from "./workspace-storage-envelope.v2";

export type DurableFiscalNotificationDocumentDeletionResultV1 =
  | AppDataDurabilityResult<
      Extract<DeleteFiscalNotificationDocumentResultV1, { status: "APPLIED" }>
    >
  | Extract<
      DeleteFiscalNotificationDocumentResultV1,
      { status: "BLOCKED" | "NOT_FOUND" }
    >;

export function runDeleteFiscalNotificationDocumentCommandV1(input: {
  readonly expected: AppData;
  readonly ownerScope: string;
  readonly documentId: string;
  readonly deletedAt: string;
  readonly commit: <T>(
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<T>,
  ) => AppDataDurabilityResult<T>;
}): DurableFiscalNotificationDocumentDeletionResultV1 {
  const prepared = deleteFiscalNotificationDocumentV1({
    workspace: input.expected.fiscalNotificationsWorkspace,
    ownerScope: input.ownerScope,
    documentId: input.documentId,
    deletedAt: input.deletedAt,
  });
  if (prepared.status !== "APPLIED") return prepared;
  const transitionedWorkspace =
    registerFiscalNotificationDocumentReductionTransitionV2(
      prepared.workspace,
      input.expected.fiscalNotificationsWorkspace,
      input.ownerScope,
      input.deletedAt,
    );
  if (!transitionedWorkspace) {
    return Object.freeze({ status: "BLOCKED", reason: "RESULT_INVALID" });
  }
  const transitioned = Object.freeze({
    ...prepared,
    workspace: transitionedWorkspace,
  });
  return input.commit(input.expected, (previous) => {
    const shouldClearObsoleteFiscalQuarantine =
      transitioned.workspace.documents.length === 0;
    const remainingQuarantine = shouldClearObsoleteFiscalQuarantine
      ? (previous.workspaceIntegrityQuarantine ?? []).filter(
          (entry) => entry.collection !== "fiscalNotificationsWorkspace",
        )
      : previous.workspaceIntegrityQuarantine;
    const data: AppData = {
      ...previous,
      fiscalNotificationsWorkspace: transitioned.workspace,
    };
    if (previous.meta?.pendingChanges) {
      const pendingChanges = previous.meta.pendingChanges.filter(
        (change) =>
          change.entityType !== "fiscal_notifications_workspace" ||
          (change.entityId !==
            FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 &&
            change.entityId !==
              FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2),
      );
      data.meta = {
        ...previous.meta,
        pendingChanges: pendingChanges.length > 0 ? pendingChanges : undefined,
      };
    }
    if (remainingQuarantine && remainingQuarantine.length > 0) {
      data.workspaceIntegrityQuarantine = remainingQuarantine;
    } else {
      delete data.workspaceIntegrityQuarantine;
    }
    return {
      data,
      value: transitioned,
    };
  });
}
