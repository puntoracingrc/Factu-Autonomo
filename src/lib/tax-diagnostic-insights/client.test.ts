import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(async () => ({
    auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "token" } } })) },
  })),
}));

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("tax product telemetry client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", { sessionStorage: new MemoryStorage(), innerWidth: 1280, screen: { width: 1280 } });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not block product flow when transport fails and deduplicates views", async () => {
    const { recordTaxProductEvent } = await import("./client");
    const input = {
      eventType: "tax_models_catalog_opened" as const,
      page: "MODELS" as const,
      properties: {},
    };
    await expect(recordTaxProductEvent(input, { dedupeKey: "catalog" })).resolves.toBe(true);
    await expect(recordTaxProductEvent(input, { dedupeKey: "catalog" })).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
