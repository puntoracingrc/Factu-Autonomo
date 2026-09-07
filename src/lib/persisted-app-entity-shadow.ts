import type {
  AppData,
  Customer,
  Document,
  Expense,
  Product,
  Supplier,
} from "./types";

export const PERSISTED_APP_ENTITY_SHADOW_VERSION = 1;
export const PERSISTED_APP_ENTITY_SHADOW_DATABASE_NAME =
  "factura-autonomo-entity-shadow";
export const PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE = "entities";
export const PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE = "manifests";
export const PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE = "health";

const DATABASE_VERSION = PERSISTED_APP_ENTITY_SHADOW_VERSION;
const STORAGE_KEY_INDEX = "storageKey";
const MAX_ENTITY_COUNT = 25_000;
export const PERSISTED_APP_ENTITY_SHADOW_REVERIFY_MS = 5 * 60 * 1_000;

export type PersistedAppEntityShadowType =
  | "customer"
  | "document"
  | "expense"
  | "supplier"
  | "product";

type PersistedAppEntityShadowPayload =
  | Customer
  | Document
  | Expense
  | Supplier
  | Product;

export interface PersistedAppEntityShadowCollectionSummary {
  count: number;
  fingerprint: string;
}

export type PersistedAppEntityShadowCollections = Record<
  PersistedAppEntityShadowType,
  PersistedAppEntityShadowCollectionSummary
>;

export interface PersistedAppEntityShadowRecord {
  id: string;
  version: number;
  storageKey: string;
  entityType: PersistedAppEntityShadowType;
  entityId: string;
  payloadFingerprint: string;
  payload: PersistedAppEntityShadowPayload;
}

export interface PersistedAppEntityShadowManifest {
  storageKey: string;
  version: number;
  sourceRawFingerprint: string;
  sourceLastModified: string | null;
  totalEntities: number;
  collections: PersistedAppEntityShadowCollections;
  committedAt: string;
  lastMutation: {
    upserted: number;
    deleted: number;
  };
}

export interface PersistedAppEntityShadowSnapshot {
  manifest: PersistedAppEntityShadowManifest;
  records: PersistedAppEntityShadowRecord[];
}

export type PersistedAppEntityShadowVerificationReason =
  | "match"
  | "manifest_missing"
  | "manifest_invalid"
  | "source_mismatch"
  | "count_mismatch"
  | "collection_mismatch"
  | "entity_invalid"
  | "entity_fingerprint_mismatch";

export interface PersistedAppEntityShadowVerification {
  matches: boolean;
  reason: PersistedAppEntityShadowVerificationReason;
  expectedCount: number;
  actualCount: number;
}

export interface PersistedAppEntityShadowWriteResult {
  written: boolean;
  reason?: "indexed_db_unavailable" | "entity_limit" | "write_failed";
  upserted: number;
  deleted: number;
  verification?: PersistedAppEntityShadowVerification;
}

export interface PersistedAppEntityShadowHealth {
  storageKey: string;
  version: number;
  sourceRawFingerprint: string;
  matches: boolean;
  reason: PersistedAppEntityShadowVerificationReason;
  expectedCount: number;
  actualCount: number;
  checkedAt: string;
}

interface ShadowEntityInput {
  entityType: PersistedAppEntityShadowType;
  payload: PersistedAppEntityShadowPayload;
}

function availableIndexedDb(): IDBFactory | null {
  if (typeof indexedDB === "undefined") return null;
  return indexedDB;
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value
      .map((entry) =>
        entry === undefined || typeof entry === "function" || typeof entry === "symbol"
          ? "null"
          : stableSerialize(entry),
      )
      .join(",")}]`;
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      return Number.isFinite(value) ? JSON.stringify(value) : "null";
    case "boolean":
      return value ? "true" : "false";
    case "object": {
      const object = value as Record<string, unknown>;
      const entries = Object.keys(object)
        .sort()
        .filter((key) => {
          const entry = object[key];
          return (
            entry !== undefined &&
            typeof entry !== "function" &&
            typeof entry !== "symbol"
          );
        })
        .map(
          (key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`,
        );
      return `{${entries.join(",")}}`;
    }
    default:
      return "null";
  }
}

function fastFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("crypto_unavailable");
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function recordId(
  storageKey: string,
  entityType: PersistedAppEntityShadowType,
  entityId: string,
): string {
  return JSON.stringify([storageKey, entityType, entityId]);
}

function collectionInputs(data: AppData): ShadowEntityInput[][] {
  return [
    data.customers.map((payload) => ({ entityType: "customer", payload })),
    data.documents.map((payload) => ({ entityType: "document", payload })),
    data.expenses.map((payload) => ({ entityType: "expense", payload })),
    data.suppliers.map((payload) => ({ entityType: "supplier", payload })),
    data.products.map((payload) => ({ entityType: "product", payload })),
  ];
}

const ENTITY_TYPES: PersistedAppEntityShadowType[] = [
  "customer",
  "document",
  "expense",
  "supplier",
  "product",
];

function emptyCollections(): PersistedAppEntityShadowCollections {
  return {
    customer: { count: 0, fingerprint: "" },
    document: { count: 0, fingerprint: "" },
    expense: { count: 0, fingerprint: "" },
    supplier: { count: 0, fingerprint: "" },
    product: { count: 0, fingerprint: "" },
  };
}

async function summarizeRecords(
  records: PersistedAppEntityShadowRecord[],
): Promise<PersistedAppEntityShadowCollections> {
  const collections = emptyCollections();
  for (const entityType of ENTITY_TYPES) {
    const entries = records
      .filter((record) => record.entityType === entityType)
      .sort((left, right) =>
        left.entityId < right.entityId
          ? -1
          : left.entityId > right.entityId
            ? 1
            : 0,
      )
      .map(
        (record) =>
          `[${JSON.stringify(record.entityId)},${stableSerialize(record.payload)}]`,
      );
    collections[entityType] = {
      count: entries.length,
      fingerprint: await sha256(`[${entries.join(",")}]`),
    };
  }
  return collections;
}

function collectionsMatch(
  left: PersistedAppEntityShadowCollections,
  right: PersistedAppEntityShadowCollections,
): boolean {
  return ENTITY_TYPES.every(
    (entityType) =>
      left[entityType].count === right[entityType].count &&
      left[entityType].fingerprint === right[entityType].fingerprint,
  );
}

function isEntityType(value: unknown): value is PersistedAppEntityShadowType {
  return ENTITY_TYPES.includes(value as PersistedAppEntityShadowType);
}

function isManifest(
  value: unknown,
  storageKey: string,
): value is PersistedAppEntityShadowManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedAppEntityShadowManifest>;
  if (
    candidate.storageKey !== storageKey ||
    candidate.version !== PERSISTED_APP_ENTITY_SHADOW_VERSION ||
    typeof candidate.sourceRawFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/u.test(candidate.sourceRawFingerprint) ||
    !Number.isInteger(candidate.totalEntities) ||
    (candidate.totalEntities ?? -1) < 0 ||
    !candidate.collections ||
    typeof candidate.collections !== "object"
  ) {
    return false;
  }
  const validCollections = ENTITY_TYPES.every((entityType) => {
    const summary = candidate.collections?.[entityType];
    return (
      Boolean(summary) &&
      Number.isInteger(summary?.count) &&
      (summary?.count ?? -1) >= 0 &&
      typeof summary?.fingerprint === "string" &&
      /^[a-f0-9]{64}$/u.test(summary.fingerprint)
    );
  });
  return (
    validCollections &&
    ENTITY_TYPES.reduce(
      (total, entityType) =>
        total + (candidate.collections?.[entityType].count ?? 0),
      0,
    ) === candidate.totalEntities
  );
}

function isRecord(
  value: unknown,
  storageKey: string,
): value is PersistedAppEntityShadowRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedAppEntityShadowRecord>;
  return (
    candidate.version === PERSISTED_APP_ENTITY_SHADOW_VERSION &&
    candidate.storageKey === storageKey &&
    isEntityType(candidate.entityType) &&
    typeof candidate.entityId === "string" &&
    candidate.entityId.length > 0 &&
    candidate.id ===
      recordId(storageKey, candidate.entityType, candidate.entityId) &&
    typeof candidate.payloadFingerprint === "string" &&
    Boolean(candidate.payload && typeof candidate.payload === "object") &&
    (candidate.payload as { id?: unknown }).id === candidate.entityId
  );
}

export async function buildPersistedAppEntityShadowSnapshot(
  storageKey: string,
  raw: string,
  data: AppData,
): Promise<PersistedAppEntityShadowSnapshot> {
  return buildSnapshotWithSourceFingerprint(
    storageKey,
    await sha256(raw),
    data,
  );
}

async function buildSnapshotWithSourceFingerprint(
  storageKey: string,
  sourceRawFingerprint: string,
  data: AppData,
): Promise<PersistedAppEntityShadowSnapshot> {
  const totalEntities =
    data.customers.length +
    data.documents.length +
    data.expenses.length +
    data.suppliers.length +
    data.products.length;
  if (totalEntities > MAX_ENTITY_COUNT) throw new Error("entity_limit");
  const inputs = collectionInputs(data).flat();

  const seen = new Set<string>();
  const records = inputs.map(({ entityType, payload }) => {
    const entityId = payload.id;
    if (!entityId) throw new Error("entity_id_missing");
    const id = recordId(storageKey, entityType, entityId);
    if (seen.has(id)) throw new Error("duplicate_entity_id");
    seen.add(id);
    return {
      id,
      version: PERSISTED_APP_ENTITY_SHADOW_VERSION,
      storageKey,
      entityType,
      entityId,
      payloadFingerprint: fastFingerprint(stableSerialize(payload)),
      payload,
    } satisfies PersistedAppEntityShadowRecord;
  });

  const collections = await summarizeRecords(records);
  return {
    records,
    manifest: {
      storageKey,
      version: PERSISTED_APP_ENTITY_SHADOW_VERSION,
      sourceRawFingerprint,
      sourceLastModified: data.meta?.lastModified ?? null,
      totalEntities: records.length,
      collections,
      committedAt: new Date().toISOString(),
      lastMutation: { upserted: records.length, deleted: 0 },
    },
  };
}

function isHealth(
  value: unknown,
  storageKey: string,
): value is PersistedAppEntityShadowHealth {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PersistedAppEntityShadowHealth>;
  return (
    candidate.storageKey === storageKey &&
    candidate.version === PERSISTED_APP_ENTITY_SHADOW_VERSION &&
    typeof candidate.sourceRawFingerprint === "string" &&
    typeof candidate.matches === "boolean" &&
    typeof candidate.reason === "string" &&
    typeof candidate.expectedCount === "number" &&
    typeof candidate.actualCount === "number" &&
    typeof candidate.checkedAt === "string"
  );
}

function recentMatchingHealth(
  manifest: unknown,
  health: unknown,
  storageKey: string,
  sourceRawFingerprint: string,
): PersistedAppEntityShadowVerification | null {
  if (
    !isManifest(manifest, storageKey) ||
    !isHealth(health, storageKey) ||
    !health.matches ||
    health.reason !== "match" ||
    manifest.sourceRawFingerprint !== sourceRawFingerprint ||
    health.sourceRawFingerprint !== sourceRawFingerprint ||
    health.expectedCount !== manifest.totalEntities ||
    health.actualCount !== manifest.totalEntities
  ) {
    return null;
  }
  const checkedAt = Date.parse(health.checkedAt);
  if (
    !Number.isFinite(checkedAt) ||
    Date.now() - checkedAt > PERSISTED_APP_ENTITY_SHADOW_REVERIFY_MS
  ) {
    return null;
  }
  return {
    matches: true,
    reason: "match",
    expectedCount: health.expectedCount,
    actualCount: health.actualCount,
  };
}

export async function verifyPersistedAppEntityShadowSnapshot(
  expected: PersistedAppEntityShadowSnapshot,
  actualManifest: unknown,
  actualRecords: unknown[],
): Promise<PersistedAppEntityShadowVerification> {
  const base = {
    expectedCount: expected.manifest.totalEntities,
    actualCount: actualRecords.length,
  };
  if (actualManifest === undefined || actualManifest === null) {
    return { matches: false, reason: "manifest_missing", ...base };
  }
  if (!isManifest(actualManifest, expected.manifest.storageKey)) {
    return { matches: false, reason: "manifest_invalid", ...base };
  }
  if (
    actualManifest.sourceRawFingerprint !==
    expected.manifest.sourceRawFingerprint
  ) {
    return { matches: false, reason: "source_mismatch", ...base };
  }
  if (
    actualManifest.totalEntities !== expected.manifest.totalEntities ||
    actualRecords.length !== expected.manifest.totalEntities
  ) {
    return { matches: false, reason: "count_mismatch", ...base };
  }
  if (!collectionsMatch(actualManifest.collections, expected.manifest.collections)) {
    return { matches: false, reason: "collection_mismatch", ...base };
  }

  const records: PersistedAppEntityShadowRecord[] = [];
  const seen = new Set<string>();
  for (const value of actualRecords) {
    if (!isRecord(value, expected.manifest.storageKey) || seen.has(value.id)) {
      return { matches: false, reason: "entity_invalid", ...base };
    }
    seen.add(value.id);
    if (fastFingerprint(stableSerialize(value.payload)) !== value.payloadFingerprint) {
      return {
        matches: false,
        reason: "entity_fingerprint_mismatch",
        ...base,
      };
    }
    records.push(value);
  }

  const actualCollections = await summarizeRecords(records);
  if (!collectionsMatch(actualCollections, expected.manifest.collections)) {
    return { matches: false, reason: "collection_mismatch", ...base };
  }
  return { matches: true, reason: "match", ...base };
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = factory.open(
      PERSISTED_APP_ENTITY_SHADOW_DATABASE_NAME,
      DATABASE_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (
        !database.objectStoreNames.contains(
          PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
        )
      ) {
        const store = database.createObjectStore(
          PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
          { keyPath: "id" },
        );
        store.createIndex(STORAGE_KEY_INDEX, STORAGE_KEY_INDEX, {
          unique: false,
        });
      }
      if (
        !database.objectStoreNames.contains(
          PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE,
        )
      ) {
        database.createObjectStore(
          PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE,
          { keyPath: "storageKey" },
        );
      }
      if (
        !database.objectStoreNames.contains(
          PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE,
        )
      ) {
        database.createObjectStore(PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE, {
          keyPath: "storageKey",
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

async function readWorkspaceRecords(
  database: IDBDatabase,
  storageKey: string,
): Promise<unknown[]> {
  const transaction = database.transaction(
    PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
    "readonly",
  );
  return requestResult(
    transaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE)
      .index(STORAGE_KEY_INDEX)
      .getAll(storageKey),
  );
}

async function readWorkspaceManifest(
  database: IDBDatabase,
  storageKey: string,
): Promise<unknown> {
  const transaction = database.transaction(
    PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE,
    "readonly",
  );
  return requestResult(
    transaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE)
      .get(storageKey),
  );
}

async function readWorkspaceHealth(
  database: IDBDatabase,
  storageKey: string,
): Promise<unknown> {
  const transaction = database.transaction(
    PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE,
    "readonly",
  );
  return requestResult(
    transaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE)
      .get(storageKey),
  );
}

export async function verifyPersistedAppEntityShadow(
  expected: PersistedAppEntityShadowSnapshot,
): Promise<PersistedAppEntityShadowVerification> {
  const factory = availableIndexedDb();
  if (!factory) {
    return {
      matches: false,
      reason: "manifest_missing",
      expectedCount: expected.manifest.totalEntities,
      actualCount: 0,
    };
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openDatabase(factory);
    const [manifest, records] = await Promise.all([
      readWorkspaceManifest(database, expected.manifest.storageKey),
      readWorkspaceRecords(database, expected.manifest.storageKey),
    ]);
    return verifyPersistedAppEntityShadowSnapshot(
      expected,
      manifest,
      records,
    );
  } catch {
    return {
      matches: false,
      reason: "manifest_missing",
      expectedCount: expected.manifest.totalEntities,
      actualCount: 0,
    };
  } finally {
    database?.close();
  }
}

export async function writePersistedAppEntityShadow(
  storageKey: string,
  raw: string,
  data: AppData,
): Promise<PersistedAppEntityShadowWriteResult> {
  const factory = availableIndexedDb();
  if (!factory) {
    return {
      written: false,
      reason: "indexed_db_unavailable",
      upserted: 0,
      deleted: 0,
    };
  }

  let sourceRawFingerprint: string;
  try {
    sourceRawFingerprint = await sha256(raw);
  } catch {
    return {
      written: false,
      reason: "write_failed",
      upserted: 0,
      deleted: 0,
    };
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openDatabase(factory);
    const [currentManifest, currentHealth] = await Promise.all([
      readWorkspaceManifest(database, storageKey),
      readWorkspaceHealth(database, storageKey),
    ]);
    const recentVerification = recentMatchingHealth(
      currentManifest,
      currentHealth,
      storageKey,
      sourceRawFingerprint,
    );
    if (recentVerification) {
      return {
        written: true,
        upserted: 0,
        deleted: 0,
        verification: recentVerification,
      };
    }

    let expected: PersistedAppEntityShadowSnapshot;
    try {
      expected = await buildSnapshotWithSourceFingerprint(
        storageKey,
        sourceRawFingerprint,
        data,
      );
    } catch (error) {
      return {
        written: false,
        reason:
          error instanceof Error && error.message === "entity_limit"
            ? "entity_limit"
            : "write_failed",
        upserted: 0,
        deleted: 0,
      };
    }
    const previousValues = await readWorkspaceRecords(database, storageKey);
    const previous = new Map<string, PersistedAppEntityShadowRecord>();
    for (const value of previousValues) {
      if (isRecord(value, storageKey)) previous.set(value.id, value);
    }

    const nextIds = new Set(expected.records.map((record) => record.id));
    const upserts = expected.records.filter((record) => {
      const current = previous.get(record.id);
      return (
        !current ||
        current.payloadFingerprint !== record.payloadFingerprint ||
        JSON.stringify(current.payload) !== JSON.stringify(record.payload)
      );
    });
    const deletes = previousValues.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const id = (value as { id?: unknown }).id;
      if (typeof id !== "string" || nextIds.has(id)) return [];
      return [id];
    });

    expected.manifest.lastMutation = {
      upserted: upserts.length,
      deleted: deletes.length,
    };
    const transaction = database.transaction(
      [
        PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
        PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE,
      ],
      "readwrite",
    );
    const entityStore = transaction.objectStore(
      PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
    );
    for (const record of upserts) entityStore.put(record);
    for (const id of deletes) entityStore.delete(id);
    transaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE)
      .put(expected.manifest);
    await transactionComplete(transaction);

    const verification = await verifyPersistedAppEntityShadow(expected);
    const healthTransaction = database.transaction(
      PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE,
      "readwrite",
    );
    healthTransaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE)
      .put({
        storageKey,
        version: PERSISTED_APP_ENTITY_SHADOW_VERSION,
        sourceRawFingerprint: expected.manifest.sourceRawFingerprint,
        matches: verification.matches,
        reason: verification.reason,
        expectedCount: verification.expectedCount,
        actualCount: verification.actualCount,
        checkedAt: new Date().toISOString(),
      } satisfies PersistedAppEntityShadowHealth);
    await transactionComplete(healthTransaction);
    return {
      written: true,
      upserted: upserts.length,
      deleted: deletes.length,
      verification,
    };
  } catch {
    return {
      written: false,
      reason: "write_failed",
      upserted: 0,
      deleted: 0,
    };
  } finally {
    database?.close();
  }
}

export async function deletePersistedAppEntityShadow(
  storageKey: string,
): Promise<void> {
  const factory = availableIndexedDb();
  if (!factory) return;

  let database: IDBDatabase | null = null;
  try {
    database = await openDatabase(factory);
    const records = await readWorkspaceRecords(database, storageKey);
    const transaction = database.transaction(
      [
        PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
        PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE,
        PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE,
      ],
      "readwrite",
    );
    const entityStore = transaction.objectStore(
      PERSISTED_APP_ENTITY_SHADOW_ENTITY_STORE,
    );
    for (const value of records) {
      if (!value || typeof value !== "object") continue;
      const id = (value as { id?: unknown }).id;
      if (typeof id === "string") entityStore.delete(id);
    }
    transaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_MANIFEST_STORE)
      .delete(storageKey);
    transaction
      .objectStore(PERSISTED_APP_ENTITY_SHADOW_HEALTH_STORE)
      .delete(storageKey);
    await transactionComplete(transaction);
  } catch {
    // Es una sombra regenerable y nunca se usa como autoridad.
  } finally {
    database?.close();
  }
}
