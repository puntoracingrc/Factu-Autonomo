const HIDDEN_EXPENSE_CANDIDATES_STORAGE_KEY =
  "fa_rentabilidad_real_hidden_expense_candidates";

interface RentabilidadRealLocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type HiddenExpenseCandidatesByWork = Record<string, string[]>;

function getLocalStorage(
  storage?: RentabilidadRealLocalStorageLike,
): RentabilidadRealLocalStorageLike | undefined {
  if (storage) return storage;
  if (typeof localStorage === "undefined") return undefined;
  return localStorage;
}

function normalizeHiddenExpenseCandidates(
  value: unknown,
): HiddenExpenseCandidatesByWork {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const normalized: HiddenExpenseCandidatesByWork = {};
  for (const [workDocumentId, expenseIds] of Object.entries(value)) {
    if (!workDocumentId || !Array.isArray(expenseIds)) continue;
    const uniqueIds = Array.from(
      new Set(
        expenseIds.filter(
          (expenseId): expenseId is string =>
            typeof expenseId === "string" && expenseId.length > 0,
        ),
      ),
    );
    if (uniqueIds.length > 0) normalized[workDocumentId] = uniqueIds;
  }

  return normalized;
}

function readHiddenExpenseCandidates(
  storage?: RentabilidadRealLocalStorageLike,
): HiddenExpenseCandidatesByWork {
  const targetStorage = getLocalStorage(storage);
  if (!targetStorage) return {};

  try {
    const raw = targetStorage.getItem(HIDDEN_EXPENSE_CANDIDATES_STORAGE_KEY);
    return normalizeHiddenExpenseCandidates(raw ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
}

function writeHiddenExpenseCandidates(
  value: HiddenExpenseCandidatesByWork,
  storage?: RentabilidadRealLocalStorageLike,
): void {
  const targetStorage = getLocalStorage(storage);
  if (!targetStorage) return;

  if (Object.keys(value).length === 0) {
    targetStorage.removeItem(HIDDEN_EXPENSE_CANDIDATES_STORAGE_KEY);
    return;
  }

  targetStorage.setItem(
    HIDDEN_EXPENSE_CANDIDATES_STORAGE_KEY,
    JSON.stringify(value),
  );
}

export function getHiddenExpenseCandidateIdsForWork(
  workDocumentId: string | undefined,
  storage?: RentabilidadRealLocalStorageLike,
): string[] {
  if (!workDocumentId) return [];
  return readHiddenExpenseCandidates(storage)[workDocumentId] ?? [];
}

export function hideExpenseCandidateForWork(
  workDocumentId: string | undefined,
  expenseId: string,
  storage?: RentabilidadRealLocalStorageLike,
): string[] {
  if (!workDocumentId || !expenseId) return [];

  const hidden = readHiddenExpenseCandidates(storage);
  const nextIds = Array.from(
    new Set([...(hidden[workDocumentId] ?? []), expenseId]),
  );
  writeHiddenExpenseCandidates(
    {
      ...hidden,
      [workDocumentId]: nextIds,
    },
    storage,
  );
  return nextIds;
}

export function restoreExpenseCandidateForWork(
  workDocumentId: string | undefined,
  expenseId: string,
  storage?: RentabilidadRealLocalStorageLike,
): string[] {
  if (!workDocumentId || !expenseId) return [];

  const hidden = readHiddenExpenseCandidates(storage);
  const nextIds = (hidden[workDocumentId] ?? []).filter((id) => id !== expenseId);
  if (nextIds.length > 0) {
    hidden[workDocumentId] = nextIds;
  } else {
    delete hidden[workDocumentId];
  }
  writeHiddenExpenseCandidates(hidden, storage);
  return nextIds;
}

export function restoreAllExpenseCandidatesForWork(
  workDocumentId: string | undefined,
  storage?: RentabilidadRealLocalStorageLike,
): string[] {
  if (!workDocumentId) return [];

  const hidden = readHiddenExpenseCandidates(storage);
  delete hidden[workDocumentId];
  writeHiddenExpenseCandidates(hidden, storage);
  return [];
}

export function clearHiddenExpenseCandidatesForTests(
  storage?: RentabilidadRealLocalStorageLike,
): void {
  const targetStorage = getLocalStorage(storage);
  targetStorage?.removeItem(HIDDEN_EXPENSE_CANDIDATES_STORAGE_KEY);
}
