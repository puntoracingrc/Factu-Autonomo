import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRentabilidadRealPriceSimulatorSettingsForTests,
  getStoredRentabilidadRealPriceSimulatorSettings,
  setStoredRentabilidadRealPriceSimulatorSettings,
} from "./local-price-simulator-settings";

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

describe("rentabilidad real price simulator local settings", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealPriceSimulatorSettingsForTests();
    vi.unstubAllGlobals();
  });

  it("guarda y recupera settings", () => {
    setStoredRentabilidadRealPriceSimulatorSettings({
      sourceMode: "document",
      selectedDocumentId: "doc_1",
      mode: "closed_project",
      objectiveType: "per_job",
      targetNetProfit: 500,
      directCosts: 120,
      monthlyFixedCosts: 900,
      fixedCostAllocationMethod: "hours",
      estimatedRealHours: 12,
      monthlyBillableHours: 100,
      desiredMarginPercentage: 12,
      irpfProvisionPercentage: 18,
      vatRate: 21,
    });

    expect(getStoredRentabilidadRealPriceSimulatorSettings()).toMatchObject({
      sourceMode: "document",
      selectedDocumentId: "doc_1",
      mode: "closed_project",
      targetNetProfit: 500,
      directCosts: 120,
      fixedCostAllocationMethod: "hours",
      irpfProvisionPercentage: 18,
    });
  });

  it("tolera SSR sin localStorage", () => {
    vi.unstubAllGlobals();

    expect(getStoredRentabilidadRealPriceSimulatorSettings()).toMatchObject({
      sourceMode: "manual",
      mode: "job",
      objectiveType: "per_job",
      targetNetProfit: 300,
    });
  });

  it("limpia settings en tests", () => {
    setStoredRentabilidadRealPriceSimulatorSettings({
      mode: "hourly_rate",
      objectiveType: "per_hour",
      targetNetProfit: 50,
    });

    clearRentabilidadRealPriceSimulatorSettingsForTests();

    expect(getStoredRentabilidadRealPriceSimulatorSettings()).toMatchObject({
      mode: "job",
      objectiveType: "per_job",
      targetNetProfit: 300,
    });
  });
});
