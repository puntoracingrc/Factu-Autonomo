export interface SyncOperationLock {
  current: boolean;
}

export type SyncOperationResult<T> =
  { started: false } | { started: true; value: T };

export async function runExclusiveSyncOperation<T>(
  lock: SyncOperationLock,
  operation: () => Promise<T>,
): Promise<SyncOperationResult<T>> {
  if (lock.current) return { started: false };

  lock.current = true;
  try {
    return { started: true, value: await operation() };
  } finally {
    lock.current = false;
  }
}
