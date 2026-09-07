import type { AppData } from "./types";
import {
  rememberPersistedAppDerivedCache,
  type PersistedAppDerivedCache,
} from "./persisted-app-derived-cache";

// Bump when the record shape changes. Sharing the value with IndexedDB makes
// every schema change clear obsolete regenerable records automatically.
export const PERSISTED_APP_DATA_CACHE_VERSION = 3;
const CACHE_DATABASE_NAME = "factura-autonomo-normalized-cache";
const CACHE_DATABASE_VERSION = PERSISTED_APP_DATA_CACHE_VERSION;
const CACHE_STORE_NAME = "snapshots";
// Version 3 uses one stable cache slot per workspace. The database upgrade
// clears older release-scoped records once; durable localStorage is untouched.
export const PERSISTED_APP_DATA_CACHE_RELEASE_ID =
  process.env.NEXT_PUBLIC_APP_BUILD_SHA?.trim() || "development";

interface PersistedAppDataCacheRecord {
  id: string;
  version: number;
  releaseId: string;
  storageKey: string;
  raw: string | null;
  data: AppData;
  derived?: PersistedAppDerivedCache;
}

export function persistedAppDataCacheRecordId(storageKey: string): string {
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
    record.id === persistedAppDataCacheRecordId(storageKey) &&
    record.version === PERSISTED_APP_DATA_CACHE_VERSION &&
    record.releaseId === PERSISTED_APP_DATA_CACHE_RELEASE_ID &&
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
    let settled = false;
    const request = factory.open(
      CACHE_DATABASE_NAME,
      CACHE_DATABASE_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
        database.createObjectStore(CACHE_STORE_NAME, { keyPath: "id" });
      } else {
        request.transaction?.objectStore(CACHE_STORE_NAME).clear();
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      resolve(database);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error);
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new Error("indexed_db_blocked"));
    };
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
        .get(persistedAppDataCacheRecordId(storageKey)),
    );
    if (!matchesPersistedAppDataCacheRecord(record, storageKey, raw)) {
      return null;
    }
    rememberPersistedAppDerivedCache(record.data, record.derived);
    return record.data;
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
  derived?: PersistedAppDerivedCache,
): Promise<boolean> {
  const factory = availableIndexedDb();
  if (!factory) return false;

  let database: IDBDatabase | null = null;
  try {
    database = await openCacheDatabase(factory);
    const transaction = database.transaction(CACHE_STORE_NAME, "readwrite");
    transaction.objectStore(CACHE_STORE_NAME).put({
      id: persistedAppDataCacheRecordId(storageKey),
      version: PERSISTED_APP_DATA_CACHE_VERSION,
      releaseId: PERSISTED_APP_DATA_CACHE_RELEASE_ID,
      storageKey,
      raw,
      data,
      derived,
    } satisfies PersistedAppDataCacheRecord);
    await transactionComplete(transaction);
    return true;
  } catch {
    // Es una aceleracion regenerable; localStorage sigue siendo la autoridad.
    return false;
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
      .delete(persistedAppDataCacheRecordId(storageKey));
    await transactionComplete(transaction);
  } catch {
    // La siguiente lectura ignorara cualquier entrada que no coincida.
  } finally {
    database?.close();
  }
}
