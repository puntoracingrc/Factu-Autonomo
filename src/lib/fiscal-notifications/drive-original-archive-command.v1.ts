import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "../app-data-durability";
import type { AppData } from "../types";
import {
  appendFiscalNotificationDriveArchiveV1,
  type AppendFiscalNotificationDriveArchiveResultV1,
  type FiscalNotificationOriginalArchiveReceiptV1,
} from "./drive-original-archive.v1";

export type DurableFiscalNotificationDriveArchiveResultV1 =
  | AppDataDurabilityResult<AppendFiscalNotificationDriveArchiveResultV1>
  | Readonly<{ status: "blocked" }>;

export function runFiscalNotificationDriveArchiveCommandV1(input: {
  readonly expected: AppData;
  readonly ownerScope: string;
  readonly receipt: FiscalNotificationOriginalArchiveReceiptV1;
  readonly archivedAt: string;
  readonly commit: <T>(
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<T>,
  ) => AppDataDurabilityResult<T>;
}): DurableFiscalNotificationDriveArchiveResultV1 {
  const prepared = appendFiscalNotificationDriveArchiveV1({
    workspace: input.expected.fiscalNotificationsWorkspace,
    ownerScope: input.ownerScope,
    receipt: input.receipt,
    archivedAt: input.archivedAt,
  });
  if (prepared.status === "BLOCKED") {
    return Object.freeze({ status: "blocked" as const });
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
