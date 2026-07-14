export type DriveBackupOperationResult<T> =
  | { started: false }
  | { started: true; value: T };

let activeOperation: Promise<unknown> | null = null;

export async function runExclusiveDriveBackup<T>(
  operation: () => Promise<T>,
): Promise<DriveBackupOperationResult<T>> {
  if (activeOperation) return { started: false };

  const current = Promise.resolve().then(operation);
  activeOperation = current;
  try {
    return { started: true, value: await current };
  } finally {
    if (activeOperation === current) activeOperation = null;
  }
}
