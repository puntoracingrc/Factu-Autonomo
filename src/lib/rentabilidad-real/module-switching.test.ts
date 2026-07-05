import { describe, expect, it } from "vitest";
import { buildRentabilidadRealSwitchImpact } from "./module-switching";
import type { RentabilidadRealUsageSummary } from "./types";

function usageSummary(
  overrides: Partial<RentabilidadRealUsageSummary> = {},
): RentabilidadRealUsageSummary {
  return {
    usedProductIds: [],
    usedCapabilityKeys: [],
    hasHistoricalCalculations: false,
    hasAssetsConfigured: false,
    hasAdvancedFixedCostsConfigured: false,
    hasHoursProjectsCalculations: false,
    hasJobsCalculations: false,
    hasPriceSimulatorScenarios: false,
    ...overrides,
  };
}

describe("rentabilidad real module switching", () => {
  it("subir de RR_TRADES_JOBS a RR_ASSETS_LIGHT no borra datos ni requiere confirmación crítica", () => {
    const impact = buildRentabilidadRealSwitchImpact({
      currentProductIds: ["RR_TRADES_JOBS"],
      nextProductIds: ["RR_TRADES_JOBS", "RR_ASSETS_LIGHT"],
      usageSummary: usageSummary(),
    });

    expect(impact.willDeleteData).toBe(false);
    expect(impact.requiresConfirmation).toBe(false);
    expect(impact.disabledProductIds).toEqual([]);
    expect(impact.disabledCapabilities).toEqual([]);
    expect(impact.userMessages).toContain("No perderás ningún dato.");
    expect(impact.userMessages).toContain(
      "Se desbloquearán nuevas capacidades relacionadas con vehículo, local, herramientas, equipos y amortizaciones simples.",
    );
  });

  it("bajar desde RR_ASSETS_LIGHT a RR_TRADES_JOBS con assets usados requiere confirmación", () => {
    const impact = buildRentabilidadRealSwitchImpact({
      currentProductIds: ["RR_TRADES_JOBS", "RR_ASSETS_LIGHT"],
      nextProductIds: ["RR_TRADES_JOBS"],
      usageSummary: usageSummary({
        usedProductIds: ["RR_ASSETS_LIGHT"],
        hasHistoricalCalculations: true,
        hasAssetsConfigured: true,
      }),
    });

    expect(impact.willDeleteData).toBe(false);
    expect(impact.requiresConfirmation).toBe(true);
    expect(impact.disabledProductIds).toEqual(["RR_ASSETS_LIGHT"]);
    expect(impact.disabledCapabilities).toEqual(["assets_light"]);
    expect(impact.affectedHistoricalItems).toHaveLength(1);
    expect(impact.userMessages).toEqual(
      expect.arrayContaining([
        "No se borrará ningún dato.",
        "Dejarás de poder crear o editar cálculos que usen vehículo, local, herramientas o equipos mientras este módulo no esté activo.",
        "Los cálculos históricos que ya usaban esos datos seguirán conservados.",
        "Si vuelves a activar el módulo de Vehículo, Herramientas, Local y Equipos, recuperarás el acceso a esas capacidades.",
      ]),
    );
  });

  it("bajar desde RR_HOURS_PROJECTS a RR_BASE con cálculos usados requiere confirmación", () => {
    const impact = buildRentabilidadRealSwitchImpact({
      currentProductIds: ["RR_BASE", "RR_HOURS_PROJECTS"],
      nextProductIds: ["RR_BASE"],
      usageSummary: usageSummary({
        usedProductIds: ["RR_HOURS_PROJECTS"],
        hasHistoricalCalculations: true,
        hasHoursProjectsCalculations: true,
      }),
    });

    expect(impact.willDeleteData).toBe(false);
    expect(impact.requiresConfirmation).toBe(true);
    expect(impact.disabledProductIds).toEqual(["RR_HOURS_PROJECTS"]);
    expect(impact.disabledCapabilities).toEqual([
      "hours_projects_profitability",
    ]);
    expect(impact.affectedHistoricalItems[0]?.capabilityKey).toBe(
      "hours_projects_profitability",
    );
  });

  it("bajar sin datos usados de capacidades superiores puede no requerir confirmación", () => {
    const impact = buildRentabilidadRealSwitchImpact({
      currentProductIds: ["RR_TRADES_JOBS", "RR_ASSETS_LIGHT"],
      nextProductIds: ["RR_TRADES_JOBS"],
      usageSummary: usageSummary(),
    });

    expect(impact.willDeleteData).toBe(false);
    expect(impact.requiresConfirmation).toBe(false);
    expect(impact.affectedHistoricalItems).toEqual([]);
    expect(impact.userMessages.join(" ")).toContain("se conservan");
  });

  it("willDeleteData siempre es false", () => {
    const cases = [
      buildRentabilidadRealSwitchImpact({
        currentProductIds: ["RR_BASE"],
        nextProductIds: ["RR_BASE", "RR_PRICE_SIMULATOR"],
        usageSummary: usageSummary(),
      }),
      buildRentabilidadRealSwitchImpact({
        currentProductIds: ["RR_BASE", "RR_PRICE_SIMULATOR"],
        nextProductIds: ["RR_BASE"],
        usageSummary: usageSummary({
          usedProductIds: ["RR_PRICE_SIMULATOR"],
          hasPriceSimulatorScenarios: true,
        }),
      }),
    ];

    expect(cases.every((impact) => impact.willDeleteData === false)).toBe(true);
  });
});
