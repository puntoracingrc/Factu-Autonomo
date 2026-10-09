/**
 * Lossless overflow for the small synchronous Web Storage quota. The immutable
 * base is verified in IndexedDB before publishing its pointer. Subsequent local
 * edits remain synchronous and durable as a small delta in localStorage.
 * This database is NOT a regenerable derived-cache database: never clear it on
 * a release/schema bump. Neither backend is an authority for central writes.
 */
export const INDEXED_APP_DATA_PREFIX = "factu-indexed-v1:";
const DATABASE = "factu-workspace-storage-v1";
const STORE = "snapshots";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Delta =
  | { replace: Json }
  | { fields: Record<string, Delta>; remove: string[] }
  | { order: string[]; entries: Record<string, Delta> };
interface Pointer {
  id: string;
  storageKey: string;
  delta: Delta;
}
interface Snapshot {
  id: string;
  storageKey: string;
  json: string;
  sha256: string;
}
const bases = new Map<string, Snapshot>();
const decodedBases = new WeakMap<Snapshot, Json>();

function decodedBase(snapshot: Snapshot): Json {
  let decoded = decodedBases.get(snapshot);
  if (decoded === undefined) {
    decoded = JSON.parse(snapshot.json) as Json;
    decodedBases.set(snapshot, decoded);
  }
  return decoded;
}

function object(value: Json): value is Record<string, Json> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function keyed(value: Json): Map<string, Json> | null {
  if (!Array.isArray(value)) return null;
  const result = new Map<string, Json>();
  for (const entry of value) {
    if (!object(entry) || typeof entry.id !== "string" || result.has(entry.id)) return null;
    result.set(entry.id, entry);
  }
  return result;
}

function diff(base: Json, next: Json): Delta | null {
  if (base === next) return null;
  const before = keyed(base);
  const after = keyed(next);
  if (before && after) {
    const entries: Record<string, Delta> = Object.create(null);
    for (const [id, entry] of after) {
      const change = before.has(id) ? diff(before.get(id)!, entry) : { replace: entry };
      if (change) entries[id] = change;
    }
    const order = [...after.keys()];
    if (Object.keys(entries).length === 0 && before.size === after.size &&
        [...before.keys()].every((id, index) => id === order[index])) return null;
    return { order, entries };
  }
  if (object(base) && object(next)) {
    const fields: Record<string, Delta> = Object.create(null);
    for (const key of Object.keys(next)) {
      const change = Object.hasOwn(base, key) ? diff(base[key], next[key]) : { replace: next[key] };
      if (change) fields[key] = change;
    }
    const remove = Object.keys(base).filter((key) => !Object.hasOwn(next, key));
    return Object.keys(fields).length || remove.length ? { fields, remove } : null;
  }
  if (Array.isArray(base) && Array.isArray(next) && JSON.stringify(base) === JSON.stringify(next)) return null;
  return { replace: next };
}

function apply(base: Json, delta: Delta): Json {
  if ("replace" in delta) return delta.replace;
  if ("order" in delta) {
    const before = keyed(base);
    if (!before || new Set(delta.order).size !== delta.order.length) throw new Error("indexed_delta_invalid");
    return delta.order.map((id) => {
      if (Object.hasOwn(delta.entries, id)) return apply(before.get(id) ?? null, delta.entries[id]);
      if (!before.has(id)) throw new Error("indexed_delta_missing_entry");
      return before.get(id)!;
    });
  }
  if (!object(base)) throw new Error("indexed_delta_invalid");
  const result = Object.assign(Object.create(null), base) as Record<string, Json>;
  for (const key of delta.remove) delete result[key];
  for (const key of Object.keys(delta.fields)) result[key] = apply(base[key] ?? null, delta.fields[key]);
  return result;
}

function pointer(raw: string, storageKey?: string): Pointer {
  if (!raw.startsWith(INDEXED_APP_DATA_PREFIX)) throw new Error("indexed_pointer_invalid");
  const value = JSON.parse(raw.slice(INDEXED_APP_DATA_PREFIX.length)) as Pointer;
  if (!value || typeof value.id !== "string" || typeof value.storageKey !== "string" || !value.delta ||
      (storageKey !== undefined && value.storageKey !== storageKey)) throw new Error("indexed_pointer_scope_mismatch");
  return value;
}

export function parseIndexedAppData(raw: string, storageKey?: string): unknown {
  const value = pointer(raw, storageKey);
  const base = bases.get(value.id);
  if (!base || base.storageKey !== value.storageKey) throw new Error("indexed_snapshot_not_loaded");
  return apply(decodedBase(base), value.delta);
}

export function serializeIndexedAppData(raw: string, storageKey: string, data: unknown): string {
  const value = pointer(raw, storageKey);
  const base = bases.get(value.id);
  if (!base || base.storageKey !== storageKey) throw new Error("indexed_snapshot_not_loaded");
  // JSON canonicalization preserves the exact legacy persistence semantics
  // (undefined fields are omitted, undefined array entries become null).
  const next = JSON.parse(JSON.stringify(data)) as Json;
  const baseline = decodedBase(base);
  const delta = diff(baseline, next) ?? { fields: {}, remove: [] };
  return INDEXED_APP_DATA_PREFIX + JSON.stringify({ id: value.id, storageKey, delta } satisfies Pointer);
}

async function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("indexed_db_unavailable");
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = request.onblocked = () => { settled = true; reject(new Error("indexed_db_unavailable")); };
  });
}

async function digest(json: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function prepareIndexedAppData(storageKey: string, data: unknown): Promise<string> {
  const json = JSON.stringify(data);
  const snapshot: Snapshot = { id: crypto.randomUUID(), storageKey, json, sha256: await digest(json) };
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error("indexed_snapshot_write_failed"));
    });
    const readback = await requestValue(db.transaction(STORE, "readonly").objectStore(STORE).get(snapshot.id)) as Snapshot | undefined;
    if (!readback || readback.id !== snapshot.id || readback.storageKey !== storageKey ||
        readback.json !== json || readback.sha256 !== snapshot.sha256 || await digest(readback.json) !== snapshot.sha256) {
      throw new Error("indexed_snapshot_verification_failed");
    }
    bases.set(snapshot.id, snapshot);
    return INDEXED_APP_DATA_PREFIX + JSON.stringify({
      id: snapshot.id, storageKey, delta: { fields: {}, remove: [] },
    } satisfies Pointer);
  } finally { db.close(); }
}

export async function hydrateIndexedAppData(raw: string, storageKey: string): Promise<void> {
  const value = pointer(raw, storageKey);
  if (bases.get(value.id)?.storageKey === storageKey) return;
  const db = await database();
  try {
    const record = await requestValue(db.transaction(STORE, "readonly").objectStore(STORE).get(value.id)) as Snapshot | undefined;
    if (!record || record.id !== value.id || record.storageKey !== storageKey || typeof record.json !== "string" ||
        await digest(record.json) !== record.sha256) throw new Error("indexed_snapshot_missing_or_invalid");
    bases.set(value.id, record);
  } finally { db.close(); }
}
