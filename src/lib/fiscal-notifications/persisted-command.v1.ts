import {
  commitAppDataDurably,
  type AppDataDurabilityResult,
  type AppDataTransition,
  type DurableStorageBaseline,
} from "../app-data-durability";
import { stableStringifySnapshot } from "../document-integrity/snapshots";
import { projectAppDataForPersistence } from "../storage";
import type { SaveDataBlockedReason, SaveDataResult } from "../storage";
import type { AppData } from "../types";

export type FiscalNotificationPersistedCommitV1 = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

interface FiscalNotificationPersistedCommandResultV1 {
  readonly status: string;
  readonly reason?: unknown;
  readonly data?: AppData;
  readonly replayed?: boolean;
}

type FiscalNotificationPersistedCommandBlockedReasonV1 =
  | SaveDataBlockedReason
  | "storage_state_unknown";

function persistenceEquivalent(left: AppData, right: AppData): boolean {
  try {
    return (
      stableStringifySnapshot(projectAppDataForPersistence(left)) ===
      stableStringifySnapshot(projectAppDataForPersistence(right))
    );
  } catch {
    return false;
  }
}

/**
 * Reconstruye la operación sobre el snapshot durable más reciente. Si otra
 * pestaña escribe entre la lectura y el commit, relee y repite una sola vez
 * únicamente cuando la pestaña actual no conserva cambios locales pendientes.
 */
export function runFiscalNotificationCommandAgainstLatestPersistedV1<
  Result extends FiscalNotificationPersistedCommandResultV1,
>(input: {
  readonly fallback: AppData;
  readonly storageBaseline?: DurableStorageBaseline;
  readonly lastKnownPersisted?: AppData;
  readonly readPersisted: () => AppData | null;
  readonly persist: (candidate: AppData, expected: AppData) => SaveDataResult;
  readonly blocked: (
    reason: FiscalNotificationPersistedCommandBlockedReasonV1,
  ) => Result;
  readonly run: (
    expected: AppData,
    commit: FiscalNotificationPersistedCommitV1,
  ) => Result;
}): Result {
  if (input.storageBaseline?.status === "indeterminate") {
    return input.blocked("storage_state_unknown");
  }

  const persisted = input.readPersisted();
  if (!persisted) return input.blocked("storage_state_unknown");

  const current = input.fallback;
  const localStateIsKnownDurable =
    input.storageBaseline === undefined ||
    (input.storageBaseline.status === "known" &&
      input.storageBaseline.data === current);
  if (
    !localStateIsKnownDurable &&
    (!input.lastKnownPersisted ||
      !persistenceEquivalent(persisted, input.lastKnownPersisted))
  ) {
    return input.blocked("stale_precondition");
  }

  const attempt = (currentBase: AppData, storageExpected: AppData): Result =>
    input.run(
      currentBase,
      <T>(
        commitExpected: AppData,
        build: (previous: AppData) => AppDataTransition<T>,
      ) => {
        return commitAppDataDurably({
          expected: commitExpected,
          storageBaseline: { status: "known", data: storageExpected },
          getCurrent: () => commitExpected,
          build,
          persist: input.persist,
        });
      },
    );

  const first = attempt(
    localStateIsKnownDurable ? persisted : current,
    persisted,
  );
  if (!localStateIsKnownDurable && first.replayed === true) {
    let replayPersistence: SaveDataResult;
    try {
      replayPersistence = input.persist(current, persisted);
    } catch {
      return input.blocked("storage_state_unknown");
    }
    if (replayPersistence.status !== "applied") {
      return input.blocked(replayPersistence.reason);
    }
  }
  if (
    !localStateIsKnownDurable ||
    first.status !== "blocked" ||
    first.reason !== "stale_precondition"
  ) {
    return first;
  }

  const refreshed = input.readPersisted();
  return refreshed
    ? attempt(refreshed, refreshed)
    : input.blocked("storage_state_unknown");
}
