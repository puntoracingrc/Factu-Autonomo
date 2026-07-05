import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateRentabilidadRealProduct,
  clearRentabilidadRealLocalActivationForTests,
  deactivateRentabilidadRealProduct,
  getStoredRentabilidadRealActiveProducts,
  setStoredRentabilidadRealActiveProducts,
} from "./local-activation";
import type { RentabilidadRealUserAccessContext } from "./types";

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

const proPlusAccessContext = {
  planKey: "pro_plus",
  isProPlus: true,
  activeProductIds: [],
  activeCapabilityKeys: [],
} satisfies RentabilidadRealUserAccessContext;

const proAccessContext = {
  planKey: "pro",
  isProPlus: false,
  activeProductIds: [],
  activeCapabilityKeys: [],
} satisfies RentabilidadRealUserAccessContext;

describe("rentabilidad real local activation", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealLocalActivationForTests();
    vi.unstubAllGlobals();
  });

  it("activar RR_TRADES_JOBS activa o mantiene RR_BASE", () => {
    const result = activateRentabilidadRealProduct("RR_TRADES_JOBS", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.activeProductIds).toEqual(["RR_BASE", "RR_TRADES_JOBS"]);
    expect(getStoredRentabilidadRealActiveProducts()).toEqual([
      "RR_BASE",
      "RR_TRADES_JOBS",
    ]);
  });

  it("activar RR_HOURS_PROJECTS mantiene RR_TRADES_JOBS si estaba activo", () => {
    activateRentabilidadRealProduct("RR_TRADES_JOBS", {
      accessContext: proPlusAccessContext,
    });
    const result = activateRentabilidadRealProduct("RR_HOURS_PROJECTS", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.activeProductIds).toEqual([
      "RR_BASE",
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);
  });

  it("activar RR_TRADES_JOBS mantiene RR_HOURS_PROJECTS si estaba activo", () => {
    activateRentabilidadRealProduct("RR_HOURS_PROJECTS", {
      accessContext: proPlusAccessContext,
    });
    const result = activateRentabilidadRealProduct("RR_TRADES_JOBS", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.activeProductIds).toEqual([
      "RR_BASE",
      "RR_HOURS_PROJECTS",
      "RR_TRADES_JOBS",
    ]);
  });

  it("localStorage anterior con un solo modo sigue siendo válido", () => {
    const normalized = setStoredRentabilidadRealActiveProducts([
      "RR_TRADES_JOBS",
    ]);

    expect(normalized).toEqual(["RR_BASE", "RR_TRADES_JOBS"]);
    expect(getStoredRentabilidadRealActiveProducts()).toEqual([
      "RR_BASE",
      "RR_TRADES_JOBS",
    ]);
  });

  it("addons pueden coexistir", () => {
    activateRentabilidadRealProduct("RR_FIXED_COSTS_PRO", {
      accessContext: proPlusAccessContext,
    });
    const result = activateRentabilidadRealProduct("RR_PRICE_SIMULATOR", {
      accessContext: proPlusAccessContext,
    });

    expect(result.activeProductIds).toEqual([
      "RR_BASE",
      "RR_FIXED_COSTS_PRO",
      "RR_PRICE_SIMULATOR",
    ]);
  });

  it("productos coming soon no se activan", () => {
    const result = activateRentabilidadRealProduct("RR_STOCK_COMMERCE", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(false);
    expect(result.activeProductIds).toEqual([]);
  });

  it("usuario no Pro+ no puede activar RR_ASSETS_LIGHT", () => {
    const result = activateRentabilidadRealProduct("RR_ASSETS_LIGHT", {
      accessContext: proAccessContext,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision?.accessStatus).toBe("requires_pro_plus");
    expect(result.activeProductIds).toEqual([]);
  });

  it("Pro+ puede activar RR_ADVISOR_REVIEW", () => {
    const result = activateRentabilidadRealProduct("RR_ADVISOR_REVIEW", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.activeProductIds).toEqual(["RR_BASE", "RR_ADVISOR_REVIEW"]);
  });

  it("desactivar addon no borra datos", () => {
    setStoredRentabilidadRealActiveProducts([
      "RR_BASE",
      "RR_PRICE_SIMULATOR",
    ]);
    const result = deactivateRentabilidadRealProduct("RR_PRICE_SIMULATOR", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.impact.willDeleteData).toBe(false);
    expect(result.activeProductIds).toEqual(["RR_BASE"]);
  });

  it("desactivar RR_HOURS_PROJECTS no desactiva RR_TRADES_JOBS", () => {
    setStoredRentabilidadRealActiveProducts([
      "RR_BASE",
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);

    const result = deactivateRentabilidadRealProduct("RR_HOURS_PROJECTS", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.impact.willDeleteData).toBe(false);
    expect(result.activeProductIds).toEqual(["RR_BASE", "RR_TRADES_JOBS"]);
  });

  it("desactivar RR_TRADES_JOBS no desactiva RR_HOURS_PROJECTS", () => {
    setStoredRentabilidadRealActiveProducts([
      "RR_BASE",
      "RR_TRADES_JOBS",
      "RR_HOURS_PROJECTS",
    ]);

    const result = deactivateRentabilidadRealProduct("RR_TRADES_JOBS", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(true);
    expect(result.impact.willDeleteData).toBe(false);
    expect(result.activeProductIds).toEqual(["RR_BASE", "RR_HOURS_PROJECTS"]);
  });

  it("RR_BASE no deja el sistema inválido si hay otros módulos activos", () => {
    setStoredRentabilidadRealActiveProducts([
      "RR_BASE",
      "RR_FIXED_COSTS_PRO",
    ]);
    const result = deactivateRentabilidadRealProduct("RR_BASE", {
      accessContext: proPlusAccessContext,
    });

    expect(result.allowed).toBe(false);
    expect(result.activeProductIds).toEqual([
      "RR_BASE",
      "RR_FIXED_COSTS_PRO",
    ]);
  });
});
