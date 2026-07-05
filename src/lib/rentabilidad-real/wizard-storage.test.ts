import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRentabilidadRealWizardStorageForTests,
  getStoredRentabilidadRealLastScoringResult,
  getStoredRentabilidadRealWizardAnswers,
} from "./wizard-storage";

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

describe("rentabilidad real wizard storage", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealWizardStorageForTests();
    vi.unstubAllGlobals();
  });

  it("normaliza resultados antiguos sin modos ni addons separados", () => {
    localStorage.setItem(
      "fa_rentabilidad_real_last_scoring",
      JSON.stringify({
        level: 4,
        score: 85,
        profileLabel: "Autónomo con estructura ligera",
        explanation: "Resultado anterior guardado antes del modelo flexible.",
        recommendedProductIds: [
          "RR_BASE",
          "RR_TRADES_JOBS",
          "RR_ASSETS_LIGHT",
        ],
        optionalProductIds: [],
        unavailableProductIds: [],
        pendingQuestions: [],
        outOfPhase: false,
        futureReasons: [],
      }),
    );

    const result = getStoredRentabilidadRealLastScoringResult();

    expect(result?.primaryProfile).toBe("trades_jobs");
    expect(result?.recommendedCalculationModes).toEqual(["RR_TRADES_JOBS"]);
    expect(result?.recommendedAddons).toEqual(["RR_ASSETS_LIGHT"]);
    expect(result?.outOfPhaseReasons).toEqual([]);
  });

  it("normaliza respuestas antiguas a arrays flexibles", () => {
    localStorage.setItem(
      "fa_rentabilidad_real_wizard_answers",
      JSON.stringify({
        legalForm: "individual",
        workModel: "mixed",
        hasMaterials: true,
        workVehicleUse: "private_car",
        hasStockOrCommerce: false,
        wantsMinimumPrice: true,
      }),
    );

    const answers = getStoredRentabilidadRealWizardAnswers();

    expect(answers?.chargeModels).toEqual([
      "closed_jobs",
      "hours",
      "installation_materials",
    ]);
    expect(answers?.materialStockModes).toEqual(["job_materials"]);
    expect(answers?.workVehicleUses).toEqual(["private_car"]);
    expect(answers?.analysisInterests).toEqual(["minimum_price"]);
  });
});
