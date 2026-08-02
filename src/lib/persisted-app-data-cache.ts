import type { AppData } from "./types";

const CACHE_DATABASE_NAME = "factura-autonomo-normalized-cache";
const CACHE_DATABASE_VERSION = 1;
const CACHE_STORE_NAME = "snapshots";
// Bump when normalizeLoadedData semantics change so every snapshot is rebuilt.
export const PERSISTED_APP_DATA_CACHE_VERSION = 1;

interface PersistedAppDataCacheRecord {
  id: string;
  version: number;
  storageKey: string;
  raw: string | null;
  data: AppData;
}

function cacheRecordId(storageKey: string): string {
  return `${PERSISTED_APP_DATA_CACHE_VERSION}:${storageKey}`;
}

function hasAppDataShape(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppData>;
  return (
    Boolean(candidate.profile && typeof candidate.profile === "object") &&
    Array.isArray(candidate.documents) &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.recurringExpenses) &&
    Array.isArray(candidate.userReminders) &&
    Array.isArray(candidate.suppliers) &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.customers) &&
    Boolean(candidate.counters && typeof candidate.counters === "object")
  );
}

export function matchesPersistedAppDataCacheRecord(
  value: unknown,
  storageKey: string,
  raw: string | null,
): value is PersistedAppDataCacheRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PersistedAppDataCacheRecord>;
  return (
    record.id === cacheRecordId(storageKey) &&
    record.version === PERSISTED_APP_DATA_CACHE_VERSION &&
    record.storageKey === storageKey &&
    record.raw === raw &&
    hasAppDataShape(record.data)
  );
}

function availableIndexedDb(): IDBFactory | null {
  if (typeof indexedDB === "undefined") return null;
  return indexedDB;
}

function openCacheDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(
      CACHE_DATABASE_NAME,
      CACHE_DATABASE_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
        database.createObjectStore(CACHE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("indexed_db_blocked"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function readPersistedAppDataCache(
  storageKey: string,
  raw: string | null,
): Promise<AppData | null> {
  const factory = availableIndexedDb();
  if (!factory) return null;

  let database: IDBDatabase | null = null;
  try {
    database = await openCacheDatabase(factory);
    const transaction = database.transaction(CACHE_STORE_NAME, "readonly");
    const record = await requestResult(
      transaction
        .objectStore(CACHE_STORE_NAME)
        .get(cacheRecordId(storageKey)),
    );
    return matchesPersistedAppDataCacheRecord(record, storageKey, raw)
      ? record.data
      : null;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

export async function writePersistedAppDataCache(
  storageKey: string,
  raw: string | null,
  data: AppData,
): Promise<void> {
  const factory = availableIndexedDb();
  if (!factory) return;

  let database: IDBDatabase | null = null;
  try {
    database = await openCacheDatabase(factory);
    const transaction = database.transaction(CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(CACHE_STORE_NAME).put({
      id: cacheRecordId(storageKey),
      version: PERSISTED_APP_DATA_CACHE_VERSION,
      storageKey,
      raw,
      data,
    } satisfies PersistedAppDataCacheRecord);
    await transactionComplete(transaction);
  } catch {
    // Es una aceleracion regenerable; localStorage sigue siendo la autoridad.
  } finally {
    database?.close();
  }
}

export async function deletePersistedAppDataCache(
  storageKey: string,
): Promise<void> {
  const factory = availableIndexedDb();
  if (!factory) return;

  let database: IDBDatabase | null = null;
  try {
    database = await openCacheDatabase(factory);
    const transaction = database.transaction(CACHE_STORE_NAME, "readwrite");
    transaction
      .objectStore(CACHE_STORE_NAME)
      .delete(cacheRecordId(storageKey));
    await transactionComplete(transaction);
  } catch {
    // La siguiente lectura ignorara cualquier entrada que no coincida.
  } finally {
    database?.close();
  }
}
