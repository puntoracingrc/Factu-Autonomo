import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canCreateDocument,
  currentMonthKey,
  getLocalDocumentUsage,
  incrementLocalDocumentUsage,
} from "./usage";

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
}

describe("billing usage", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("genera clave de mes", () => {
    expect(currentMonthKey(new Date("2026-03-15"))).toBe("2026-03");
  });

  it("incrementa uso local", () => {
    expect(getLocalDocumentUsage("2026-06")).toBe(0);
    incrementLocalDocumentUsage("2026-06");
    incrementLocalDocumentUsage("2026-06");
    expect(getLocalDocumentUsage("2026-06")).toBe(2);
  });

  it("bloquea documentos en plan gratis cuando billing activo", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    const blocked = canCreateDocument("free", 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain("límite");
  });

  it("permite documentos en pro", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    expect(canCreateDocument("pro", 100).allowed).toBe(true);
  });

  it("no bloquea si billing desactivado", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    expect(canCreateDocument("free", 999).allowed).toBe(true);
  });
});
