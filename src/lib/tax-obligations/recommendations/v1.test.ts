import { describe, expect, it } from "vitest";

import type {
  TaxObligationAssessmentItemV1,
  TaxObligationsAssessmentV1,
} from "../contracts";
import {
  buildTaxModelRecommendationsV1,
  TAX_MODEL_RECOMMENDATIONS_CONTRACT_VERSION,
} from "./v1";

function obligation(
  modelCode: TaxObligationAssessmentItemV1["modelCode"],
  status: TaxObligationAssessmentItemV1["status"],
  overrides: Partial<TaxObligationAssessmentItemV1> = {},
): TaxObligationAssessmentItemV1 {
  return {
    modelCode,
    status,
    decisionState: status === "REQUIRED" ? "CONFIRMED" : "PROVISIONAL",
    decisionBasis: "PROVISIONAL_RULES",
    evidenceSufficient: status === "REQUIRED" || status === "NOT_APPLICABLE",
    reason: `Motivo orientativo para ${modelCode}`,
    evidence: [
      { kind: "QUESTIONNAIRE", summary: "Respuesta confirmada del usuario" },
    ],
    missingInformation: [],
    conflicts: [],
    possibleExceptions: ["Excepción conocida de la regla"],
    ...overrides,
  };
}

function assessment(
  obligations: TaxObligationsAssessmentV1["obligations"],
  overrides: Partial<TaxObligationsAssessmentV1> = {},
): TaxObligationsAssessmentV1 {
  return {
    contractVersion: "1.0.0",
    catalogVersion: "es-tax-models.2026-07.v1",
    ruleSetVersion: "rules.2026.v1",
    ruleReviewState: "PENDING_FISCAL_REVIEW",
    resolutionState: "MANUAL_REVIEW",
    traceability: { engineVersion: "engine.v1", sourceSchemaVersion: 1 },
    generatedAt: "2026-07-15T20:00:00.000Z",
    fiscalYear: 2026,
    territory: "ES_COMMON",
    profile: { state: "COMPLETE", missingInformation: [], conflicts: [] },
    obligations,
    ...overrides,
  };
}

describe("tax model recommendations v1", () => {
  it("maps deterministic decisions to the five orientative product states", () => {
    const result = buildTaxModelRecommendationsV1({
      assessment: assessment([
        obligation("130", "REQUIRED"),
        obligation("349", "REVIEW_REQUIRED"),
        obligation("303", "NOT_APPLICABLE"),
        obligation("390", "UNKNOWN", {
          decisionState: "INSUFFICIENT_DATA",
          missingInformation: ["Confirmar la exoneración anual"],
        }),
        obligation("115", "REQUIRED"),
      ]),
      manualModelCodes: ["115"],
    });

    expect(result.contractVersion).toBe(
      TAX_MODEL_RECOMMENDATIONS_CONTRACT_VERSION,
    );
    expect(
      result.recommendations.map((item) => [
        item.modelCode,
        item.recommendationStatus,
      ]),
    ).toEqual([
      ["130", "LIKELY_REQUIRED"],
      ["349", "POSSIBLY_REQUIRED"],
      ["303", "UNLIKELY_REQUIRED"],
      ["390", "NEEDS_INFORMATION"],
      ["115", "MANUALLY_SELECTED"],
    ]);
    expect(result.recommendations[4].engineRecommendationStatus).toBe(
      "LIKELY_REQUIRED",
    );
  });

  it("recommends while fiscal review remains pending and keeps exclusion separate", () => {
    const pending = buildTaxModelRecommendationsV1({
      assessment: assessment([obligation("303", "REQUIRED")]),
    });
    const approved = buildTaxModelRecommendationsV1({
      assessment: assessment([obligation("303", "REQUIRED")], {
        ruleReviewState: "APPROVED",
        resolutionState: "RESOLVED",
      }),
    });

    expect(pending.recommendations).toEqual(approved.recommendations);
    expect(pending.authorizedFiscalExclusion).toBe(false);
    expect(approved.authorizedFiscalExclusion).toBe(false);
  });

  it("turns contradictions into possible, never into unlikely", () => {
    const result = buildTaxModelRecommendationsV1({
      assessment: assessment([
        obligation("111", "UNKNOWN", {
          decisionState: "CONFLICTING_EVIDENCE",
          decisionBasis: "CONFLICTING_EVIDENCE",
          conflicts: ["El censo y la respuesta no coinciden"],
        }),
      ]),
    });

    expect(result.recommendations[0]).toMatchObject({
      recommendationStatus: "POSSIBLY_REQUIRED",
      conflicts: ["El censo y la respuesta no coinciden"],
      possibleExceptions: ["Excepción conocida de la regla"],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.recommendations)).toBe(true);
  });
});
