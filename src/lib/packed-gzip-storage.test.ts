import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodePackedGzipStorage,
  encodePackedGzipStorage,
  PACKED_GZIP_STORAGE_PREFIX,
} from "./packed-gzip-storage";
import { issueDocument } from "./document-integrity";
import { inspectPersistedData, loadData, loadDataPreferPersistentCache, parseStoredData, saveData } from "./storage";
import { EMPTY_DATA, type AppData, type Document } from "./types";

function bytes(length: number): Uint8Array {
  let seed = 1234567;
  return Uint8Array.from({ length }, () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed & 0xff;
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("lossless packed gzip cache", () => {
  it.each([1, 2, 3, 7, 15, 16, 31, 255, 256, 100001])("roundtrips %i bytes without surrogates or NULs", (length) => {
    const original = bytes(length);
    const packed = encodePackedGzipStorage(original);
    expect(decodePackedGzipStorage(packed)).toEqual(original);
    expect(packed).not.toMatch(/[\u0000\ud800-\udfff]/u);
  });

  it("preserves Unicode and JSON exactly and uses roughly 60% fewer characters than Base64", () => {
    const original = JSON.stringify({ title: "Persianas — 漢字 😀", content: Array.from(bytes(50000)).join(",") });
    const gzip = gzipSync(strToU8(original), { level: 6 });
    const packed = encodePackedGzipStorage(gzip);
    expect(strFromU8(gunzipSync(decodePackedGzipStorage(packed)))).toBe(original);
    expect(packed.length).toBeLessThan(Math.ceil(gzip.length / 3) * 4 * 0.41);
  });

  it("uses the same backward-compatible parser in the main thread and the cache worker", () => {
    const source = { title: "Snapshot exacto 😀", data: [0, 1, 255] };
    const json = JSON.stringify(source);
    const gzip = gzipSync(strToU8(json));
    const base64 = btoa(String.fromCharCode(...gzip));
    for (const raw of [json, `factu-gzip-v1:${base64}`, encodePackedGzipStorage(gzip)]) {
      expect(parseStoredData(raw)).toEqual(source);
    }
    const worker = readFileSync(new URL("../workers/persisted-app-data-cache.worker.ts", import.meta.url), "utf8");
    expect(worker).toContain('import { normalizeLoadedData, parseStoredData } from "../lib/storage"');
    expect(worker).toContain("normalizeLoadedData(parseStoredData(event.data.raw))");
  });

  it("rejects truncated, oversized, noncanonical, invalid-character and nonzero-padding encodings", () => {
    const packed = encodePackedGzipStorage(bytes(7));
    const one = encodePackedGzipStorage(new Uint8Array([1]));
    for (const invalid of [
      packed.slice(0, -1),
      `${PACKED_GZIP_STORAGE_PREFIX}zzzzzzzzzzzz:abc`,
      packed.replace(":7:", ":07:"),
      `${PACKED_GZIP_STORAGE_PREFIX}1:\ud800`,
      one.slice(0, -1) + String.fromCharCode(one.charCodeAt(one.length - 1) + 1),
    ]) expect(() => decodePackedGzipStorage(invalid)).toThrow();
    expect(() => encodePackedGzipStorage(new Uint8Array())).toThrow();
  });

  it("saves a server-confirmed invoice under quota without altering its frozen fiscal data or another company", async () => {
    const values = new Map<string, string>();
    const key = "factu:workspace:v2:user:synthetic-company";
    const otherKey = "factu:workspace:v2:user:other-company";
    let quota = Infinity;
    const setItem = vi.fn((key: string, raw: string) => {
      if (raw.length > quota) throw new DOMException("quota", "QuotaExceededError");
      values.set(key, raw);
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem,
      removeItem: (key: string) => values.delete(key),
    });
    const profile = {
      ...EMPTY_DATA.profile,
      name: "Empresa sintética",
      nif: "B12345678",
      address: "Calle Uno 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const draft: Document = {
      id: "invoice-1", type: "factura", number: "F-2026-0001", date: "2026-10-07",
      client: { name: "Cliente sintético", nif: "12345678Z", address: "Calle Dos 2", city: "Madrid", postalCode: "28002" },
      items: [{ id: "line-1", description: "Servicio", quantity: 1, unitPrice: 100, ivaPercent: 21 }],
      status: "borrador", createdAt: "2026-10-07T10:00:00.000Z", updatedAt: "2026-10-07T10:00:00.000Z",
    };
    const invoice = issueDocument(draft, profile, "2026-10-07T10:00:00.000Z");
    const original: AppData = {
      ...EMPTY_DATA, profile, documents: [invoice],
      expenses: [{
        id: "expense-1", supplierName: "Proveedor sintético", date: "2026-10-07", description: "Gasto sintético", amount: 10, ivaPercent: 21,
        category: "Otros", paymentMethod: "Transferencia", createdAt: "2026-10-07T10:00:00.000Z",
        notes: Array.from(bytes(50000)).join(","),
      }],
    };
    values.set(otherKey, "old company, snapshots and pending changes untouched");
    expect(saveData(original, { storageKey: key })).toEqual({ status: "applied" });
    const expected = loadData(key);
    expect(expected.documents[0].snapshotSeal).toBeDefined();
    expect(expected.documents[0].pdfSnapshot).toBeDefined();
    const beforeRaw = values.get(key)!;
    quota = Math.floor(beforeRaw.length * 0.65);
    const candidate = { ...expected, meta: { ...expected.meta, lastModified: "2026-10-07T10:01:00.000Z" } };
    setItem.mockClear();
    expect(saveData(candidate, { storageKey: key, expected })).toEqual({ status: "applied" });
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(values.get(key)).toMatch(/^factu-gzip-utf16-v1:/);
    expect(values.get(key)!.length).toBeLessThan(quota);
    const loaded = loadData(key);
    expect(loaded.documents[0].documentSnapshot).toEqual(expected.documents[0].documentSnapshot);
    expect(loaded.documents[0].pdfSnapshot).toEqual(expected.documents[0].pdfSnapshot);
    expect(loaded.documents[0].snapshotSeal).toEqual(expected.documents[0].snapshotSeal);
    expect(loaded.documents[0].verifactu).toEqual(expected.documents[0].verifactu);
    expect(loaded.expenses).toEqual(expected.expenses);
    expect(inspectPersistedData(candidate, { storageKey: key })).toEqual({ status: "applied" });
    expect((await loadDataPreferPersistentCache({ storageKey: key })).documents[0]).toEqual(loaded.documents[0]);
    expect(values.get(otherKey)).toBe("old company, snapshots and pending changes untouched");
    setItem.mockClear();
    expect(saveData({ ...loaded, meta: { ...loaded.meta, lastModified: "2026-10-07T10:02:00.000Z" } }, { storageKey: key, expected: loaded })).toEqual({ status: "applied" });
    expect(setItem).toHaveBeenCalledTimes(1);
    const compactRaw = values.get(key);
    expect(saveData(EMPTY_DATA, { storageKey: key, expected: loadData(key) })).toEqual({ status: "blocked", reason: "protected_existing_data" });
    expect(values.get(key)).toBe(compactRaw);
  });

  it("never replaces a concurrent write detected after the quota rejection", () => {
    const key = "synthetic-workspace";
    const original = { ...EMPTY_DATA, profile: { ...EMPTY_DATA.profile, name: "Original" } };
    let raw = JSON.stringify(original);
    const concurrent = JSON.stringify({ ...original, profile: { ...original.profile, name: "Concurrent writer" } });
    const setItem = vi.fn((_key: string, value: string) => { raw = value; });
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => raw, setItem });
    const expected = loadData(key);
    setItem.mockImplementation(() => {
      raw = concurrent;
      throw new DOMException("quota", "QuotaExceededError");
    });
    setItem.mockClear();
    expect(saveData({ ...expected, profile: { ...expected.profile, name: "Candidate" } }, { storageKey: key, expected })).toEqual({ status: "indeterminate", reason: "storage_state_unknown" });
    expect(raw).toBe(concurrent);
    expect(setItem).toHaveBeenCalledTimes(1);
  });
});
