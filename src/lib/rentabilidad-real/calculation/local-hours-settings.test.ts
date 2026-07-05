import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRentabilidadRealHoursSettingsForTests,
  getStoredRentabilidadRealHoursSettings,
  setStoredRentabilidadRealHoursSettings,
} from "./local-hours-settings";

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

describe("rentabilidad real hours local settings", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealHoursSettingsForTests();
    vi.unstubAllGlobals();
  });

  it("guarda y recupera settings", () => {
    setStoredRentabilidadRealHoursSettings({
      sourceType: "manual",
      manualProjectId: "manual_123",
      projectName: "Proyecto",
      billingModel: "closed_project",
      incomeWithoutIndirectTax: 1000,
      billedHours: 10,
      realWorkedHours: 12,
      manualDirectCosts: [{ id: "c1", description: "Coste", amount: 100 }],
      fixedCostAllocationMethod: "hours",
      monthlyWorkHours: 80,
      selectedFixedCostIds: ["fixed_1"],
      irpfProvisionPercentage: 18,
    });

    expect(getStoredRentabilidadRealHoursSettings()).toMatchObject({
      sourceType: "manual",
      manualProjectId: "manual_123",
      projectName: "Proyecto",
      billingModel: "closed_project",
      incomeWithoutIndirectTax: 1000,
      billedHours: 10,
      realWorkedHours: 12,
      selectedFixedCostIds: ["fixed_1"],
      irpfProvisionPercentage: 18,
    });
  });

  it("settings antiguos sin selectedFixedCostIds no rompen", () => {
    localStorage.setItem(
      "fa_rentabilidad_real_hours_calculation_settings",
      JSON.stringify({
        sourceType: "manual",
        manualProjectId: "manual_old",
        projectName: "Proyecto antiguo",
        billingModel: "hours",
        fixedCostAllocationMethod: "hours",
        irpfProvisionPercentage: 20,
      }),
    );

    expect(getStoredRentabilidadRealHoursSettings()).toMatchObject({
      sourceType: "manual",
      manualProjectId: "manual_old",
      selectedFixedCostIds: [],
    });
  });

  it("tolera SSR sin localStorage", () => {
    vi.unstubAllGlobals();

    expect(getStoredRentabilidadRealHoursSettings()).toMatchObject({
      sourceType: "document",
      manualProjectId: "hours_manual_project",
      fixedCostAllocationMethod: "hours",
      selectedFixedCostIds: [],
      irpfProvisionPercentage: 20,
    });
  });

  it("limpia settings en tests", () => {
    setStoredRentabilidadRealHoursSettings({
      projectName: "Proyecto",
      sourceType: "manual",
    });

    clearRentabilidadRealHoursSettingsForTests();

    expect(getStoredRentabilidadRealHoursSettings()).toMatchObject({
      projectName: "",
      sourceType: "document",
      manualProjectId: "hours_manual_project",
      selectedFixedCostIds: [],
    });
  });
});
