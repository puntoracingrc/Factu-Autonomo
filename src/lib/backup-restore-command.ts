import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import type { AppData } from "@/lib/types";

export interface BackupRestoreValue {
  restored: true;
}

type DurableCommit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

/**
 * Publica una copia validada solo después de que el commit local completo haya
 * sido confirmado. El commit común añade el diff cloud y conserva la memoria
 * anterior ante blocked/indeterminate.
 */
export function runBackupRestoreCommand(input: {
  expected: AppData;
  restored: AppData;
  commit: DurableCommit;
}): AppDataDurabilityResult<BackupRestoreValue> {
  return input.commit(input.expected, () => ({
    data: {
      ...input.restored,
      // La copia portable no contiene metadata de sincronización. Conservar la
      // cola local previa evita perder cambios no relacionados; trackDataDiff
      // añadirá/actualizará encima las reversiones del restore por entidad.
      meta: input.expected.meta
        ? {
            ...input.expected.meta,
            pendingChanges: input.expected.meta.pendingChanges?.map(
              (change) => ({ ...change }),
            ),
          }
        : undefined,
    },
    value: { restored: true },
  }));
}
