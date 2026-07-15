import { describe, expect, it } from "vitest";

import { evaluateTaxModelDiagnostic } from "@/lib/tax-model-diagnostic/engine";
import { createTaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/profile";
import { completeCommonTerritoryProfile } from "@/lib/tax-model-diagnostic/test-fixtures";

import {
  TAX_OBLIGATIONS_CATALOG_VERSION,
  TAX_OBLIGATIONS_CONTRACT_VERSION,
  TAX_OBLIGATIONS_STORAGE_LOCATION,
} from "./contracts";
import { buildTaxObligationsAssessment } from "./build-assessment";
import { selectStoredTaxObligationsAssessment } from "./select-stored-assessment";

const GENERATED_AT = "2026-07-15T07:15:00.000Z";

describe("stored public tax obligations assessment", () => {
  it("falla cerrado cuando el usuario todavía no ha generado resultados", () => {
    expect(selectStoredTaxObligationsAssessment(undefined)).toBeNull();
    expect(
      selectStoredTaxObligationsAssessment(
        createTaxModelDiagnosticSession(GENERATED_AT),
      ),
    ).toBeNull();
  });

  it("falla cerrado ante una versión pública incompatible", () => {
    const session = createTaxModelDiagnosticSession(GENERATED_AT);
    session.publishedAssessment = {
      contractVersion: "2.0.0",
    } as unknown as NonNullable<typeof session.publishedAssessment>;

    expect(selectStoredTaxObligationsAssessment(session)).toBeNull();
  });

  it("expone el resultado guardado mediante el contrato público estable", () => {
    const session = createTaxModelDiagnosticSession(GENERATED_AT);
    session.profile = completeCommonTerritoryProfile();
    session.lastResult = evaluateTaxModelDiagnostic(
      session.profile,
      GENERATED_AT,
    );
    session.publishedAssessment = buildTaxObligationsAssessment(
      session.lastResult,
    );

    const assessment = selectStoredTaxObligationsAssessment(session);

    expect(TAX_OBLIGATIONS_STORAGE_LOCATION).toBe(
      "AppData.profile.taxModelDiagnostic.publishedAssessment",
    );
    expect(assessment).toMatchObject({
      contractVersion: TAX_OBLIGATIONS_CONTRACT_VERSION,
      catalogVersion: TAX_OBLIGATIONS_CATALOG_VERSION,
      ruleReviewState: "PENDING_FISCAL_REVIEW",
      resolutionState: "MANUAL_REVIEW",
    });
    expect(assessment?.obligations).toHaveLength(27);
  });

  it("no publica cambios de respuestas hasta generar una nueva foto", () => {
    const session = createTaxModelDiagnosticSession(GENERATED_AT);
    session.profile = completeCommonTerritoryProfile();
    const previousResult = evaluateTaxModelDiagnostic(
      session.profile,
      GENERATED_AT,
    );
    session.lastResult = previousResult;
    session.publishedAssessment = buildTaxObligationsAssessment(previousResult);
    const previousSnapshot = session.publishedAssessment;

    session.profile.employees = "YES";

    expect(selectStoredTaxObligationsAssessment(session)).toBe(
      previousSnapshot,
    );
  });
});
