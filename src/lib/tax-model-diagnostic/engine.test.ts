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

  it("usa códigos censales parciales sin convertir ausencias en discrepancias", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        censusReviewed: "UNKNOWN",
        censusObligations: ["303"],
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "303")?.status)
      .toBe("CONFIRMED_BY_CENSUS");
    expect(result.models.find((model) => model.modelNumber === "130")?.status)
      .toBe("DERIVED");
    expect(result.discrepancies).toEqual([]);
  });

  it("no descarta la Renta por no haber actividad personal ni RETA", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        invoicingSubject: "COMPANY",
        taxpayerRole: "CORPORATE_SELF_EMPLOYED",
        hasPersonalActivity: "NO",
        retaDuringYear: "NO",
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "100")?.status)
      .toBe("NEEDS_INFORMATION");
  });

  it("no convierte un régimen especial de IVA sin identificar en un 303", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ vatRegimes: ["OTHER_SPECIAL"] }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "303")?.status)
      .toBe("NEEDS_INFORMATION");
    expect(result.models.find((model) => model.modelNumber === "390")?.status)
      .toBe("NEEDS_INFORMATION");
  });

  it("eleva el conflicto entre SII y una exoneración 390 negada", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ sii: "YES", vatAnnualSummaryExempt: "NO" }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "390")?.status)
      .toBe("CENSUS_MISMATCH");
  });

  it("no usa REDEME o SII para hacer mensuales las retenciones", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        employees: "YES",
        rentsBusinessPremises: "YES",
        rentSubjectToWithholding: "YES",
        landlordWithholdingExemption: "NO",
        redeme: "YES",
        sii: "YES",
        vatAnnualSummaryExempt: "YES",
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "111")?.periodicity)
      .toBe("QUARTERLY");
    expect(result.models.find((model) => model.modelNumber === "115")?.periodicity)
      .toBe("QUARTERLY");
  });

  it("no inventa la periodicidad del 349", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ euServicesSales: "YES", roiRegistered: "YES" }),
      GENERATED_AT,
    );
    const model349 = result.models.find((model) => model.modelNumber === "349");

    expect(model349?.status).toBe("DERIVED");
    expect(model349?.periodicity).toBe("TO_BE_CONFIRMED");
    expect(model349?.periods).toEqual([]);
  });

  it("mantiene el 369 mientras el alta OSS/IOSS siga vigente aunque no haya ventas", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ euConsumerSales: "NO", ossRegistered: "YES" }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "369")?.status)
      .toBe("DERIVED");
  });

  it("no excluye el 347 por SII sin confirmar que cubrió todo el ejercicio", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        sii: "YES",
        vatAnnualSummaryExempt: "YES",
        thirdPartyThresholdExceeded: "YES",
        thirdPartyOperationsAllExcluded: "NO",
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "347")?.status)
      .toBe("DERIVED");
  });

  it("no elige entre 130 y 131 solo por indicar atribución de rentas", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        invoicingSubject: "COMMUNITY_OF_PROPERTY",
        taxpayerRole: "PARTNER_OR_COMMUNITY_MEMBER",
        incomeTaxRegime: "ENTITY_ATTRIBUTION",
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "130")?.status)
      .toBe("NEEDS_INFORMATION");
    expect(result.models.find((model) => model.modelNumber === "131")?.status)
      .toBe("NEEDS_INFORMATION");
  });

  it("no aplica un único 70 % a actividades profesionales y agrarias mezcladas", () => {
    const result = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({
        activityKinds: ["PROFESSIONAL", "AGRICULTURE"],
        withheldIncomePercent: 80,
      }),
      GENERATED_AT,
    );

    expect(result.models.find((model) => model.modelNumber === "130")?.status)
      .toBe("NEEDS_INFORMATION");
  });
});
