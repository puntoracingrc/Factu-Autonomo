const RENTABILIDAD_REAL_LOCAL_STORAGE_PREFIX = "fa_rentabilidad_real_";

export const RENTABILIDAD_REAL_LOCAL_RESET_CONFIRMATION =
  "Esto solo borra respuestas del test, módulos activos, ajustes internos y preferencias locales de Rentabilidad Real en este navegador. No borra facturas, presupuestos, gastos, impuestos ni datos fiscales.";

interface RentabilidadRealLocalStorageLike {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

export interface RentabilidadRealLocalResetResult {
  removedKeys: string[];
  skipped: boolean;
}

function getLocalStorage(
  storage?: RentabilidadRealLocalStorageLike,
): RentabilidadRealLocalStorageLike | undefined {
  if (storage) return storage;
  if (typeof localStorage === "undefined") return undefined;
  return localStorage;
}

export function isRentabilidadRealLocalStorageKey(key: string): boolean {
  return key.startsWith(RENTABILIDAD_REAL_LOCAL_STORAGE_PREFIX);
}

export function resetRentabilidadRealLocalConfiguration(
  storage?: RentabilidadRealLocalStorageLike,
): RentabilidadRealLocalResetResult {
  const targetStorage = getLocalStorage(storage);
  if (!targetStorage) return { removedKeys: [], skipped: true };

  const keysToRemove: string[] = [];
  for (let index = 0; index < targetStorage.length; index += 1) {
    const key = targetStorage.key(index);
    if (key && isRentabilidadRealLocalStorageKey(key)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    targetStorage.removeItem(key);
  }

  return { removedKeys: keysToRemove, skipped: false };
}
