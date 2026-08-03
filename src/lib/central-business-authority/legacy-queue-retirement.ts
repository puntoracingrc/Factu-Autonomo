import type { AppDataTransition } from "@/lib/app-data-durability";
import type { AppData, SyncChange } from "@/lib/types";

export const CENTRAL_ADOPTION_LEGACY_QUEUE_RETIREMENT =
  "CENTRAL_ADOPTION_LEGACY_QUEUE_RETIREMENT_V1";

export interface CentralAdoptionLegacyQueueRetirementValue {
  schema: typeof CENTRAL_ADOPTION_LEGACY_QUEUE_RETIREMENT;
  discarded: number;
}

export function centralAdoptionLegacyQueueSignature(
  pendingChanges: readonly SyncChange[],
): string {
  return JSON.stringify(pendingChanges);
}

export function buildCentralAdoptionLegacyQueueRetirement(input: {
  data: AppData;
  expectedPendingChangeCount: number;
  expectedPendingChangesSignature: string;
}): AppDataTransition<CentralAdoptionLegacyQueueRetirementValue> {
  const meta = input.data.meta;
  const pendingChanges = meta?.pendingChanges;
  if (
    !Number.isInteger(input.expectedPendingChangeCount) ||
    input.expectedPendingChangeCount < 1 ||
    !meta ||
    !pendingChanges ||
    pendingChanges.length !== input.expectedPendingChangeCount ||
    centralAdoptionLegacyQueueSignature(pendingChanges) !==
      input.expectedPendingChangesSignature
  ) {
    throw new Error(
      "La cola antigua cambió durante la adopción central y se conserva intacta.",
    );
  }

  const remainingMeta = { ...meta };
  delete remainingMeta.pendingChanges;
  return {
    data: {
      ...input.data,
      meta: remainingMeta,
    },
    value: {
      schema: CENTRAL_ADOPTION_LEGACY_QUEUE_RETIREMENT,
      discarded: pendingChanges.length,
    },
  };
}
