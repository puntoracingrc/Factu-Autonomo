import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRentabilidadRealReportSettingsForTests,
  getStoredRentabilidadRealReportSettings,
  setStoredRentabilidadRealReportSettings,
} from "./local-report-settings";

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

describe("rentabilidad real report local settings", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealReportSettingsForTests();
    vi.unstubAllGlobals();
  });

  it("guarda y recupera filtros", () => {
    setStoredRentabilidadRealReportSettings({
      period: "current_quarter",
      sourceTypes: "invoices",
      includeQuotesWithoutInvoice: false,
      includeInternalAdjustments: false,
      fixedCostAllocationMode: "revenue_share_report",
      irpfProvisionPercentage: 18,
      lowMarginThresholdPercentage: 12,
    });

    expect(getStoredRentabilidadRealReportSettings()).toMatchObject({
      period: "current_quarter",
      sourceTypes: "invoices",
      includeQuotesWithoutInvoice: false,
      includeInternalAdjustments: false,
      fixedCostAllocationMode: "revenue_share_report",
      irpfProvisionPercentage: 18,
      lowMarginThresholdPercentage: 12,
    });
  });

  it("tolera SSR sin localStorage", () => {
    vi.unstubAllGlobals();

    expect(getStoredRentabilidadRealReportSettings()).toMatchObject({
      period: "all",
      sourceTypes: "both",
      includeInternalAdjustments: true,
    });
  });

  it("limpia tests", () => {
    setStoredRentabilidadRealReportSettings({
      period: "current_month",
      sourceTypes: "quotes",
    });

    clearRentabilidadRealReportSettingsForTests();

    expect(getStoredRentabilidadRealReportSettings()).toMatchObject({
      period: "all",
      sourceTypes: "both",
    });
  });
});
