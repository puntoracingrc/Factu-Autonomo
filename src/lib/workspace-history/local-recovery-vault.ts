import { workspaceRecoveryStorageKeyPrefix } from "@/lib/workspace-storage";

export const WORKSPACE_LOCAL_RECOVERY_VAULT_SCHEMA =
  "FACTU_WORKSPACE_LOCAL_RECOVERY_VAULT_V1";
export const WORKSPACE_LOCAL_RECOVERY_VAULT_DATABASE =
  "factu-workspace-local-recovery-vault";
export const WORKSPACE_LOCAL_RECOVERY_VAULT_STORE = "copies";

const DATABASE_VERSION = 1;

interface EnumerableStorage {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
}

export interface WorkspaceLocalRecoveryVaultRecord {
  id: string;
  schema: typeof WORKSPACE_LOCAL_RECOVERY_VAULT_SCHEMA;
  ownerScope: string;
  sourceStorageKey: string;
  rawHash: string;
  raw: string;
  archivedAt: string;
}

export interface WorkspaceLocalRecoveryReleaseSummary {
  inspected: number;
  preserved: number;
  released: number;
  releasedCharacters: number;
}

type PreserveRecoveryCopy = (
  record: WorkspaceLocalRecoveryVaultRecord,
) => Promise<boolean>;

function availableIndexedDb(): IDBFactory | null {
  return typeof indexedDB === "undefined" ? null : indexedDB;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("crypto_unavailable");
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = factory.open(
      WORKSPACE_LOCAL_RECOVERY_VAULT_DATABASE,
      DATABASE_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (
        !database.objectStoreNames.contains(
          WORKSPACE_LOCAL_RECOVERY_VAULT_STORE,
        )
      ) {
        database.createObjectStore(WORKSPACE_LOCAL_RECOVERY_VAULT_STORE, {
          keyPath: "id",
        });
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

export async function preserveWorkspaceLocalRecoveryCopy(
  record: WorkspaceLocalRecoveryVaultRecord,
): Promise<boolean> {
  const factory = availableIndexedDb();
  if (!factory) return false;

  let database: IDBDatabase | null = null;
  try {
    database = await openDatabase(factory);
    const write = database.transaction(
      WORKSPACE_LOCAL_RECOVERY_VAULT_STORE,
      "readwrite",
    );
    write.objectStore(WORKSPACE_LOCAL_RECOVERY_VAULT_STORE).put(record);
    await transactionComplete(write);

    const read = database.transaction(
      WORKSPACE_LOCAL_RECOVERY_VAULT_STORE,
      "readonly",
    );
    const persisted = await requestResult(
      read.objectStore(WORKSPACE_LOCAL_RECOVERY_VAULT_STORE).get(record.id),
    );
    if (!persisted || typeof persisted !== "object") return false;
    const candidate = persisted as Partial<WorkspaceLocalRecoveryVaultRecord>;
    return (
      candidate.schema === record.schema &&
      candidate.ownerScope === record.ownerScope &&
      candidate.sourceStorageKey === record.sourceStorageKey &&
      candidate.rawHash === record.rawHash &&
      candidate.raw === record.raw
    );
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

function recoveryKeysForOwner(
  ownerScope: string,
  activeStorageKey: string,
  storage: EnumerableStorage,
): string[] {
  const prefix = workspaceRecoveryStorageKeyPrefix(ownerScope);
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && key !== activeStorageKey && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys.sort();
}

export async function archiveAndReleaseWorkspaceLocalRecoveryCopies(input: {
  ownerScope: string;
  activeStorageKey: string;
  storage: EnumerableStorage;
  preserve?: PreserveRecoveryCopy;
  now?: string;
}): Promise<WorkspaceLocalRecoveryReleaseSummary> {
  const preserve = input.preserve ?? preserveWorkspaceLocalRecoveryCopy;
  const keys = recoveryKeysForOwner(
    input.ownerScope,
    input.activeStorageKey,
    input.storage,
  );
  const summary: WorkspaceLocalRecoveryReleaseSummary = {
    inspected: keys.length,
    preserved: 0,
    released: 0,
    releasedCharacters: 0,
  };

  for (const sourceStorageKey of keys) {
    let raw: string | null;
    try {
      raw = input.storage.getItem(sourceStorageKey);
    } catch {
      continue;
    }
    if (raw === null) continue;

    let rawHash: string;
    try {
      rawHash = await sha256(raw);
    } catch {
      continue;
    }
    const record: WorkspaceLocalRecoveryVaultRecord = {
      id: `${WORKSPACE_LOCAL_RECOVERY_VAULT_SCHEMA}:${input.ownerScope}:${sourceStorageKey}:${rawHash}`,
      schema: WORKSPACE_LOCAL_RECOVERY_VAULT_SCHEMA,
      ownerScope: input.ownerScope,
      sourceStorageKey,
      rawHash,
      raw,
      archivedAt: input.now ?? new Date().toISOString(),
    };
    if (!(await preserve(record))) continue;
    summary.preserved += 1;

    try {
      if (input.storage.getItem(sourceStorageKey) !== raw) continue;
      input.storage.removeItem(sourceStorageKey);
      if (input.storage.getItem(sourceStorageKey) !== null) continue;
      summary.released += 1;
      summary.releasedCharacters += raw.length;
    } catch {
      // La copia verificada queda en IndexedDB, pero no damos por liberado el
      // original si el navegador no confirma su retirada de localStorage.
    }
  }

  return summary;
}
