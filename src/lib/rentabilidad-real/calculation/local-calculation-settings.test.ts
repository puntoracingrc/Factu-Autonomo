import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRentabilidadRealCalculationSettingsForTests,
  getStoredRentabilidadRealCalculationSettings,
  setStoredRentabilidadRealCalculationSettings,
} from "./local-calculation-settings";

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

describe("rentabilidad real calculation local settings", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealCalculationSettingsForTests();
    vi.unstubAllGlobals();
  });

  it("guarda y recupera settings", () => {
    setStoredRentabilidadRealCalculationSettings({
      fixedCostAllocationMethod: "hours",
      workHours: 8,
      monthlyWorkHours: 80,
      selectedFixedCostIds: ["fixed_1"],
      irpfProvisionPercentage: 18,
    });

    expect(getStoredRentabilidadRealCalculationSettings()).toMatchObject({
      fixedCostAllocationMethod: "hours",
      workHours: 8,
      monthlyWorkHours: 80,
      selectedFixedCostIds: ["fixed_1"],
      irpfProvisionPercentage: 18,
    });
  });

  it("limpia settings en tests", () => {
    setStoredRentabilidadRealCalculationSettings({
      fixedCostAllocationMethod: "manual_amount",
      manualAmount: 100,
      irpfProvisionPercentage: 20,
    });

    clearRentabilidadRealCalculationSettingsForTests();

    expect(getStoredRentabilidadRealCalculationSettings()).toMatchObject({
      fixedCostAllocationMethod: "none",
      irpfProvisionPercentage: 20,
    });
  });

  it("tolera localStorage inexistente en SSR", () => {
    vi.unstubAllGlobals();

    expect(getStoredRentabilidadRealCalculationSettings()).toMatchObject({
      fixedCostAllocationMethod: "none",
      irpfProvisionPercentage: 20,
    });
  });
});
