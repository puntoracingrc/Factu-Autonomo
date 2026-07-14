import { describe, expect, it } from "vitest";

import { evaluateTaxModelDiagnostic } from "./engine";
import { createEmptyTaxpayerProfile } from "./profile";
import {
  completeCommonTerritoryProfile,
  REFERENCE_PROFILES,
} from "./test-fixtures";

const GENERATED_AT = "2026-07-14T12:00:00.000Z";

describe("tax model diagnostic engine", () => {
  it.each(REFERENCE_PROFILES)(
    "$name",
    ({ profile, targetModel, expectedStatus }) => {
      const result = evaluateTaxModelDiagnostic(profile, GENERATED_AT);
      const model = result.models.find(
        (candidate) => candidate.modelNumber === targetModel,
      );

      expect(model?.status).toBe(expectedStatus);
      expect(model?.ruleIds).toHaveLength(1);
      expect(model?.officialSources.length).toBeGreaterThan(0);
    },
  );

  it("emite exactamente una decisión por cada código canónico", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile(),
      GENERATED_AT,
    );
    const codes = result.models.map((model) => model.modelNumber);

    expect(codes).toHaveLength(27);
    expect(new Set(codes).size).toBe(27);
  });

  it("aplica la excepción profesional del 70 % sin extenderla a actividad empresarial", () => {
    const professional = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        activityKinds: ["PROFESSIONAL"],
        withheldIncomePercent: 70,
      }),
      GENERATED_AT,
    );
    const mixed = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        activityKinds: ["PROFESSIONAL", "BUSINESS"],
        withheldIncomePercent: 95,
      }),
      GENERATED_AT,
    );

    expect(professional.models.find((model) => model.modelNumber === "130")?.status)
      .toBe("NOT_APPLICABLE");
    expect(mixed.models.find((model) => model.modelNumber === "130")?.status)
      .toBe("DERIVED");
  });

  it("limita los períodos a la ventana de actividad", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        activityStartDate: "2026-05-15",
        activityEndDate: "2026-10-01",
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "130")?.periods)
      .toEqual(["2T", "3T", "4T"]);
  });

  it("falla cerrado fuera de territorio común", () => {
    const profile = completeCommonTerritoryProfile({ territory: "ES_CANARY" });
    const result = evaluateTaxModelDiagnostic(profile, GENERATED_AT);

    expect(result.status).toBe("TERRITORY_NOT_SUPPORTED");
    expect(result.models).toEqual([]);
    expect(result.warnings.join(" ")).toContain("no evalúa ese territorio");
  });

  it("no decide cuando falta el territorio", () => {
    const result = evaluateTaxModelDiagnostic(
      createEmptyTaxpayerProfile(),
      GENERATED_AT,
    );

    expect(result.status).toBe("NEEDS_INFORMATION");
    expect(result.models).toEqual([]);
    expect(result.missingInformation).toContain(
      "Territorio fiscal exacto de la actividad.",
    );
  });

  it("eleva las discrepancias entre hechos y censo", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ censusReviewed: "YES", censusObligations: ["303"] }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "303")?.status)
      .toBe("CONFIRMED_BY_CENSUS");
    expect(result.models.find((model) => model.modelNumber === "130")?.status)
      .toBe("CENSUS_MISMATCH");
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });
});
