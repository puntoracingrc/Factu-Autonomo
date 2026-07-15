import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import {
  deleteFiscalNotificationDocumentV1,
  type DeleteFiscalNotificationDocumentResultV1,
} from "./document-deletion.v1";

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
  return input.commit(input.expected, (previous) => ({
    data: {
      ...previous,
      fiscalNotificationsWorkspace: prepared.workspace,
    },
    value: prepared,
  }));
}
