import { describe, expect, it } from "vitest";

import { evaluateTaxModelDiagnostic } from "@/lib/tax-model-diagnostic/engine";
import {
  completeCommonTerritoryProfile,
} from "@/lib/tax-model-diagnostic/test-fixtures";

import { buildTaxObligationsAssessment } from "./build-assessment";
import {
  normalizeTaxObligationModelCode,
  TAX_OBLIGATIONS_CATALOG_VERSION,
  TAX_OBLIGATIONS_CONTRACT_VERSION,
} from "./contracts";

const GENERATED_AT = "2026-07-14T12:00:00.000Z";

describe("public tax obligations assessment", () => {
  it("expone versiones, código canónico y estados cerrados", () => {
    const diagnostic = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile(),
      GENERATED_AT,
    );
    const assessment = buildTaxObligationsAssessment(diagnostic);

    expect(assessment.contractVersion).toBe(TAX_OBLIGATIONS_CONTRACT_VERSION);
    expect(assessment.catalogVersion).toBe(TAX_OBLIGATIONS_CATALOG_VERSION);
    expect(assessment.ruleReviewState).toBe("PENDING_FISCAL_REVIEW");
    expect(assessment.resolutionState).toBe("MANUAL_REVIEW");
    expect(assessment.traceability.engineVersion).toContain(
      "tax-model-diagnostic.engine",
    );
    expect(assessment.obligations).toHaveLength(27);
    expect(
      new Set(assessment.obligations.map((obligation) => obligation.modelCode)).size,
    ).toBe(27);
    expect(
      assessment.obligations.every((obligation) =>
        ["REQUIRED", "NOT_APPLICABLE", "REVIEW_REQUIRED", "UNKNOWN"].includes(
          obligation.status,
        ),
      ),
    ).toBe(true);
  });

  it("solo queda resuelto con perfil completo y reglas aprobadas", () => {
    const diagnostic = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile(),
      GENERATED_AT,
    );
    const assessment = buildTaxObligationsAssessment(diagnostic, {
      ruleReviewState: "APPROVED",
    });

    expect(assessment.resolutionState).toBe("RESOLVED");
  });

  it("bloquea el consumo cuando el territorio impide emitir decisiones", () => {
    const diagnostic = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ territory: "ES_CANARY" }),
      GENERATED_AT,
    );
    const assessment = buildTaxObligationsAssessment(diagnostic, {
      ruleReviewState: "APPROVED",
    });

    expect(assessment.resolutionState).toBe("BLOCKED");
    expect(assessment.obligations).toEqual([]);
  });

  it("solo descarta con NOT_APPLICABLE cuando la evidencia es suficiente", () => {
    const diagnostic = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile(),
      GENERATED_AT,
    );
    const assessment = buildTaxObligationsAssessment(diagnostic);
    const model347 = assessment.obligations.find(
      (obligation) => obligation.modelCode === "347",
    );

    expect(model347).toMatchObject({
      status: "NOT_APPLICABLE",
      evidenceSufficient: true,
    });
  });

  it("mantiene los conflictos visibles y exige revisión", () => {
    const diagnostic = evaluateTaxModelDiagnostic(
      completeCommonTerritoryProfile({ censusObligations: ["303"] }),
      GENERATED_AT,
    );
    const assessment = buildTaxObligationsAssessment(diagnostic);
    const model130 = assessment.obligations.find(
      (obligation) => obligation.modelCode === "130",
    );

    expect(assessment.profile.state).toBe("CONFLICTED");
    expect(model130).toMatchObject({
      status: "REVIEW_REQUIRED",
      decisionState: "CONFLICTING_EVIDENCE",
      decisionBasis: "CONFLICTING_EVIDENCE",
      evidenceSufficient: false,
    });
  });

  it("no infiere códigos concatenados ni desde texto libre", () => {
    expect(normalizeTaxObligationModelCode("36")).toBe("036");
    expect(normalizeTaxObligationModelCode("303/390")).toBeNull();
    expect(normalizeTaxObligationModelCode("Modelo 303")).toBeNull();
    expect(normalizeTaxObligationModelCode(["303", "390"])).toBeNull();
  });
});
