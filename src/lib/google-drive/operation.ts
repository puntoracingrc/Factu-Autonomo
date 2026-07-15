export type DriveOperationResult<T> =
  | { started: false }
  | { started: true; value: T };

export type DriveBackupOperationResult<T> = DriveOperationResult<T>;

let activeOperation: Promise<unknown> | null = null;

export async function runExclusiveDriveOperation<T>(
  operation: () => Promise<T>,
): Promise<DriveOperationResult<T>> {
  if (activeOperation) return { started: false };

  const current = Promise.resolve().then(operation);
  activeOperation = current;
  try {
    return { started: true, value: await current };
  } finally {
    if (activeOperation === current) activeOperation = null;
  }
}

/**
 * Alias conservado para las copias JSON existentes. Los originales fiscales y
 * las copias comparten deliberadamente el mismo candado de sesión.
 */
export const runExclusiveDriveBackup = runExclusiveDriveOperation;
