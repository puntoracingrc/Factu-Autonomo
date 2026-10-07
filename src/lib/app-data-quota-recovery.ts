import type { AppDataDurabilityResult } from "./app-data-durability";
import type { WorkspaceLocalRecoveryReleaseSummary } from "./workspace-history/local-recovery-vault";

interface RecoveryStorage {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
}

/**
 * A quota failure is not a failed central read. Preserve only recovery copies
 * belonging to companies available in this session, then retry the same CAS
 * commit once. Active workspaces and pending commands are never removed.
 */
export async function commitAppDataWithQuotaRecovery<T>(input: {
  attempt: () => AppDataDurabilityResult<T>;
  isCurrent: () => boolean;
  ownerScope?: string;
  storageKey?: string;
  recoveryOwnerScopes?: readonly string[];
  storage?: RecoveryStorage;
  archive?: (input: {
    ownerScope: string;
    activeStorageKey: string;
    storage: RecoveryStorage;
  }) => Promise<WorkspaceLocalRecoveryReleaseSummary>;
}): Promise<AppDataDurabilityResult<T>> {
  const first = input.attempt();
  if (
    first.status !== "blocked" ||
    first.reason !== "quota_exceeded" ||
    !input.ownerScope ||
    !input.storageKey ||
    !input.isCurrent()
  ) return first;

  let released = 0;
  try {
    const storage = input.storage ?? globalThis.localStorage;
    if (!storage) return first;
    const archive = input.archive ??
      (await import("./workspace-history/local-recovery-vault"))
        .archiveAndReleaseWorkspaceLocalRecoveryCopies;
    const owners = new Set([
      input.ownerScope,
      ...(input.recoveryOwnerScopes ?? []),
    ]);
    for (const ownerScope of owners) {
      if (!input.isCurrent()) {
        return { status: "blocked", reason: "stale_precondition" };
      }
      const result = await archive({
        ownerScope,
        activeStorageKey: input.storageKey,
        storage,
      });
      released += result.released;
    }
  } catch {
    // Unavailable IndexedDB, denied storage or failed preservation never
    // authorizes deleting an original or claiming a successful sync.
    return first;
  }
  if (!input.isCurrent()) {
    return { status: "blocked", reason: "stale_precondition" };
  }
  return released > 0 ? input.attempt() : first;
}
