import { randomBytes } from "node:crypto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DATA, type AppData } from "./types";
import { loadData, saveData, saveDataAsync, parseStoredData, inspectPersistedData } from "./storage";
import { INDEXED_APP_DATA_PREFIX, hydrateIndexedAppData, parseIndexedAppData } from "./indexed-app-data-storage";

const KEY = "factura-autonomo-workspace-synthetic-a";
class QuotaStorage implements Storage {
  values = new Map<string, string>();
  quota = Infinity;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (value.length > this.quota) throw new DOMException("quota", "QuotaExceededError");
    this.values.set(key, value);
  }
}
let storage: QuotaStorage;
beforeEach(() => {
  storage = new QuotaStorage();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => vi.unstubAllGlobals());

function candidate(): AppData {
  return { ...EMPTY_DATA, profile: { ...EMPTY_DATA.profile, name: "Synthetic workspace", logoUrl: randomBytes(40_000).toString("base64") } };
}

async function overflow() {
  expect(saveData(EMPTY_DATA, { storageKey: KEY })).toEqual({ status: "applied" });
  const expected = loadData(KEY);
  const old = storage.getItem(KEY)!;
  storage.quota = old.length + 100;
  const next = candidate();
  expect(saveData(next, { storageKey: KEY, expected })).toEqual({ status: "blocked", reason: "quota_exceeded" });
  expect(storage.getItem(KEY)).toBe(old);
  expect(await saveDataAsync(next, { storageKey: KEY, expected })).toEqual({ status: "applied" });
  return next;
}

describe("verified IndexedDB workspace overflow", () => {
  it("receives the complete snapshot with a tiny pointer, preserving the other company and pending data", async () => {
    storage.setItem("other-company", "untouched other company");
    const next = await overflow();
    const raw = storage.getItem(KEY)!;
    expect(raw.startsWith(INDEXED_APP_DATA_PREFIX)).toBe(true);
    expect(raw.length).toBeLessThan(300);
    expect(parseStoredData(raw)).toEqual(next);
    expect(inspectPersistedData(next, { storageKey: KEY })).toEqual({ status: "applied" });
    expect(storage.getItem("other-company")).toBe("untouched other company");
  });

  it("keeps later synchronous edits durable as a small delta instead of copying all invoices again", async () => {
    await overflow();
    const expected = loadData(KEY);
    const next = { ...expected, profile: { ...expected.profile, phone: "123" }, meta: { ...expected.meta, lastModified: "2026-10-09T10:00:00.000Z", pendingChanges: [] } };
    expect(saveData(next, { storageKey: KEY, expected })).toEqual({ status: "applied" });
    expect(storage.getItem(KEY)!.length).toBeLessThan(1000);
    expect(parseStoredData(storage.getItem(KEY)!)).toEqual(next);
    vi.resetModules();
    const reopened = await import("./storage");
    expect(await reopened.loadDataPreferPersistentCache({ storageKey: KEY })).toEqual(next);
    expect(reopened.inspectPersistedData(next, { storageKey: KEY })).toEqual({ status: "applied" });
  });

  it("roundtrips insertions, edits, deletions, order and duplicate IDs without touching the immutable base", async () => {
    const next = await overflow();
    const current = loadData(KEY);
    const customers = ["c3", "c1", "c2"].map((id) => ({ id, name: id, firstName: id, lastName: "", createdAt: "2026-10-09T10:00:00.000Z", updatedAt: "2026-10-09T10:00:00.000Z" }));
    const added = { ...current, customers };
    expect(saveData(added, { storageKey: KEY, expected: current }).status).toBe("applied");
    const reordered = { ...added, customers: [{ ...customers[2], name: "edited" }, customers[0]] };
    expect(saveData(reordered, { storageKey: KEY, expected: added }).status).toBe("applied");
    expect(parseStoredData(storage.getItem(KEY)!)).toEqual(reordered);
    const duplicate = { ...reordered, customers: [customers[0], customers[0]] };
    expect(saveData(duplicate, { storageKey: KEY, expected: reordered }).status).toBe("applied");
    expect(parseStoredData(storage.getItem(KEY)!)).toEqual(duplicate);
    expect(duplicate.profile.logoUrl).toBe(next.profile.logoUrl);
  });

  it("does not publish a cursor or replace the original when IndexedDB is unavailable", async () => {
    saveData(EMPTY_DATA, { storageKey: KEY });
    const expected = loadData(KEY);
    const original = storage.getItem(KEY);
    storage.quota = original!.length + 100;
    vi.stubGlobal("indexedDB", undefined);
    const next = candidate();
    expect(await saveDataAsync(next, { expected, storageKey: KEY })).toEqual({ status: "blocked", reason: "quota_exceeded" });
    expect(storage.getItem(KEY)).toBe(original);
  });

  it("does not overwrite a concurrent tab or a changed company while awaiting IDB readback", async () => {
    saveData(EMPTY_DATA, { storageKey: KEY });
    const expected = loadData(KEY);
    const original = storage.getItem(KEY);
    storage.quota = original!.length + 100;
    let checks = 0;
    expect(await saveDataAsync(candidate(), { expected, storageKey: KEY, isCurrent: () => ++checks === 1 })).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(storage.getItem(KEY)).toBe(original);
  });

  it("rejects another company pointer and never converts a missing base into an empty workspace", async () => {
    await overflow();
    const raw = storage.getItem(KEY)!;
    expect(() => parseIndexedAppData(raw, "other-company")).toThrow("scope_mismatch");
    await expect(hydrateIndexedAppData(raw, "other-company")).rejects.toThrow("scope_mismatch");
    vi.resetModules();
    vi.stubGlobal("indexedDB", new IDBFactory());
    const fresh = await import("./storage");
    await expect(fresh.loadDataPreferPersistentCache({ storageKey: KEY })).rejects.toThrow("missing_or_invalid");
    expect(storage.getItem(KEY)).toBe(raw);
  });
});
