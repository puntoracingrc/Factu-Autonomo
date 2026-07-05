import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RENTABILIDAD_REAL_LOCAL_RESET_CONFIRMATION,
  isRentabilidadRealLocalStorageKey,
  resetRentabilidadRealLocalConfiguration,
} from "./local-reset";

function createStorage(initial: Record<string, string>) {
  const store = new Map(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    has(key: string) {
      return store.has(key);
    },
  };
}

describe("rentabilidad real local reset", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("borra solo claves locales de Rentabilidad Real", () => {
    const storage = createStorage({
      fa_rentabilidad_real_wizard_answers: "{}",
      fa_rentabilidad_real_active_products: "[]",
      "factura-autonomo-data": "{}",
      supabase_auth_token: "keep",
    });

    const result = resetRentabilidadRealLocalConfiguration(storage);

    expect(result.skipped).toBe(false);
    expect(result.removedKeys).toEqual([
      "fa_rentabilidad_real_wizard_answers",
      "fa_rentabilidad_real_active_products",
    ]);
    expect(storage.has("fa_rentabilidad_real_wizard_answers")).toBe(false);
    expect(storage.has("fa_rentabilidad_real_active_products")).toBe(false);
    expect(storage.has("factura-autonomo-data")).toBe(true);
    expect(storage.has("supabase_auth_token")).toBe(true);
  });

  it("tolera SSR sin localStorage", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(resetRentabilidadRealLocalConfiguration()).toEqual({
      removedKeys: [],
      skipped: true,
    });
  });

  it("expone una confirmacion que aclara que no borra documentos", () => {
    expect(RENTABILIDAD_REAL_LOCAL_RESET_CONFIRMATION).toContain(
      "No borra facturas",
    );
    expect(RENTABILIDAD_REAL_LOCAL_RESET_CONFIRMATION).toContain(
      "preferencias locales",
    );
  });

  it("identifica solo claves con prefijo fa_rentabilidad_real_", () => {
    expect(
      isRentabilidadRealLocalStorageKey("fa_rentabilidad_real_last_scoring"),
    ).toBe(true);
    expect(isRentabilidadRealLocalStorageKey("factura-autonomo-data")).toBe(
      false,
    );
  });
});
