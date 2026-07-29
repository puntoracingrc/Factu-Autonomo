"use client";

import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import {
  finalizeCentralBusinessEntityServerResolution,
  prepareCentralBusinessEntityServerResolution,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import type { CentralBusinessEntityType } from "./mutation-command";

export const CENTRAL_BUSINESS_CONFLICT_RECOVERY =
  "CENTRAL_BUSINESS_CONFLICT_RECOVERY_V1";

export type CentralBusinessConflictRecoveryResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_CONFLICT_RECOVERY;
      discarded: number;
      pulled: number;
      applied: number;
      nextSequence: number;
    }
  | {
      ok: false;
      schema: typeof CENTRAL_BUSINESS_CONFLICT_RECOVERY;
      code: string;
      message: string;
      retryable: boolean;
      nextSequence: number;
    };

export interface CentralBusinessConflictRecoveryDependencies {
  syncServerEvents(): Promise<CentralBusinessEventsAppDataSyncResult>;
  prepare?: typeof prepareCentralBusinessEntityServerResolution;
  finalize?: typeof finalizeCentralBusinessEntityServerResolution;
  withLock?: typeof withCentralBusinessQueueLock;
}

export async function resolveCentralBusinessConflictKeepingServer(
  input: {
    ownerScope: string;
    entityType: CentralBusinessEntityType;
    entityId: string;
  },
  dependencies: CentralBusinessConflictRecoveryDependencies,
): Promise<CentralBusinessConflictRecoveryResult> {
  const withLock = dependencies.withLock ?? withCentralBusinessQueueLock;
  try {
    await withLock(input.ownerScope, () =>
      (
        dependencies.prepare ??
        prepareCentralBusinessEntityServerResolution
      )(input),
    );
  } catch (error) {
    return {
      ok: false,
      schema: CENTRAL_BUSINESS_CONFLICT_RECOVERY,
      code: "CENTRAL_BUSINESS_CONFLICT_PREPARE_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo preparar la resolución del conflicto.",
      retryable: false,
      nextSequence: 0,
    };
  }

  const synced = await dependencies.syncServerEvents();
  if (!synced.ok) {
    return {
      ok: false,
      schema: CENTRAL_BUSINESS_CONFLICT_RECOVERY,
      code: synced.code,
      message: synced.message,
      retryable: synced.retryable,
      nextSequence: synced.nextSequence,
    };
  }

  try {
    const finalized = await withLock(input.ownerScope, () =>
      (
        dependencies.finalize ??
        finalizeCentralBusinessEntityServerResolution
      )(input),
    );
    return {
      ok: true,
      schema: CENTRAL_BUSINESS_CONFLICT_RECOVERY,
      discarded: finalized.discarded,
      pulled: synced.pulled,
      applied: synced.applied,
      nextSequence: synced.nextSequence,
    };
  } catch (error) {
    return {
      ok: false,
      schema: CENTRAL_BUSINESS_CONFLICT_RECOVERY,
      code: "CENTRAL_BUSINESS_CONFLICT_NOT_CONFIRMED",
      message:
        error instanceof Error
          ? error.message
          : "No se confirmó la versión central después de descargarla.",
      retryable: true,
      nextSequence: synced.nextSequence,
    };
  }
}
