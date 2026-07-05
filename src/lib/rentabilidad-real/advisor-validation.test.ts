import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRentabilidadRealAdvisorValidationSummary,
  clearRentabilidadRealAdvisorValidationForTests,
  getStoredRentabilidadRealAdvisorValidationStatus,
  setStoredRentabilidadRealAdvisorValidationStatus,
} from "./advisor-validation";
import { scoreRentabilidadRealProfile } from "./scoring";

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

describe("rentabilidad real advisor validation", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    clearRentabilidadRealAdvisorValidationForTests();
    vi.unstubAllGlobals();
  });

  it("guarda estado pending_review", () => {
    setStoredRentabilidadRealAdvisorValidationStatus("pending_review");

    expect(getStoredRentabilidadRealAdvisorValidationStatus()).toBe(
      "pending_review",
    );
  });

  it("guarda estado validated", () => {
    setStoredRentabilidadRealAdvisorValidationStatus("validated");

    expect(getStoredRentabilidadRealAdvisorValidationStatus()).toBe("validated");
  });

  it("guarda estado corrected", () => {
    setStoredRentabilidadRealAdvisorValidationStatus("corrected");

    expect(getStoredRentabilidadRealAdvisorValidationStatus()).toBe("corrected");
  });

  it("genera resumen con productos recomendados", () => {
    const answers = {
      legalForm: "individual" as const,
      worksByJobs: true,
      hasPayrollEmployees: false,
      hasStockOrCommerce: false,
      isInModulesRegime: false,
    };
    const scoringResult = scoreRentabilidadRealProfile(answers);
    const summary = buildRentabilidadRealAdvisorValidationSummary({
      answers,
      scoringResult,
    });

    expect(summary).toContain("Rentabilidad por Obras y Oficios");
    expect(summary).toContain("Nivel detectado: 2");
  });

  it("si no hay test, muestra pendientes", () => {
    const summary = buildRentabilidadRealAdvisorValidationSummary({
      answers: null,
      scoringResult: null,
    });

    expect(summary).toContain("test guiado pendiente");
    expect(summary).toContain("Productos recomendados: Pendiente");
  });
});
