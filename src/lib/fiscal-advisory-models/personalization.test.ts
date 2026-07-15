import { describe, expect, it } from "vitest";
import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import type { TaxObligationsAssessmentV1 } from "@/lib/tax-obligations";
import { buildFiscalModelPersonalizationV1 } from "./personalization";

const availableModelCodes = ["036", "111", "130", "303", "390", "A22"];

function session(
  assessment: Partial<TaxObligationsAssessmentV1>,
): TaxModelDiagnosticSession {
  return {
    schemaVersion: 1,
    profile: {} as TaxModelDiagnosticSession["profile"],
    evidence: [],
    completedQuestionIds: [],
    currentSection: "identity",
    updatedAt: "2026-07-15T00:00:00.000Z",
    publishedAssessment: {
      contractVersion: "1.0.0",
      catalogVersion: "es-tax-models.2026-07.v1",
      ruleSetVersion: "rules.v1",
      ruleReviewState: "APPROVED",
      resolutionState: "RESOLVED",
      traceability: { engineVersion: "engine.v1", sourceSchemaVersion: 1 },
      generatedAt: "2026-07-15T00:00:00.000Z",
      fiscalYear: 2026,
      territory: "ES_COMMON",
      profile: { state: "COMPLETE", missingInformation: [], conflicts: [] },
      obligations: [],
      ...assessment,
    },
  };
}

describe("fiscal model personalization", () => {
  it("falls back to the complete catalog for every unapproved boundary", () => {
    const cases = [
      { session: undefined, reason: "NO_PUBLISHED_ASSESSMENT" },
      {
        session: session({ ruleReviewState: "PENDING_FISCAL_REVIEW" }),
        reason: "RULES_PENDING_REVIEW",
      },
      {
        session: session({ resolutionState: "MANUAL_REVIEW" }),
        reason: "ASSESSMENT_NOT_RESOLVED",
      },
      {
        session: session({
          profile: {
            state: "INCOMPLETE",
            missingInformation: ["activity"],
            conflicts: [],
          },
        }),
        reason: "PROFILE_NOT_COMPLETE",
      },
    ];
    for (const item of cases) {
      const result = buildFiscalModelPersonalizationV1({
        session: item.session,
        preferences: { schemaVersion: 1, manualModelCodes: ["303"] },
        availableModelCodes,
      });
      expect(result).toMatchObject({
        status: "ALL_ONLY",
        fallbackReason: item.reason,
        visibleModelCodes: availableModelCodes,
        manualModelCodes: ["303"],
      });
    }
  });

  it("keeps the complete catalog until individual exclusions are authorized", () => {
    const result = buildFiscalModelPersonalizationV1({
      session: session({
        obligations: [
          {
            modelCode: "036",
            status: "REQUIRED",
            decisionState: "CONFIRMED",
            decisionBasis: "CONFIRMED_FACTS",
            evidenceSufficient: true,
            reason: "Alta censal",
            evidence: [],
            missingInformation: [],
            conflicts: [],
          },
          {
            modelCode: "111",
            status: "NOT_APPLICABLE",
            decisionState: "CONFIRMED",
            decisionBasis: "CONFIRMED_FACTS",
            evidenceSufficient: true,
            reason: "Sin retenciones",
            evidence: [],
            missingInformation: [],
            conflicts: [],
          },
          {
            modelCode: "130",
            status: "REVIEW_REQUIRED",
            decisionState: "INSUFFICIENT_DATA",
            decisionBasis: "INCOMPLETE_PROFILE",
            evidenceSufficient: false,
            reason: "Confirmar retenciones",
            evidence: [],
            missingInformation: ["withholding"],
            conflicts: [],
          },
          {
            modelCode: "390",
            status: "NOT_APPLICABLE",
            decisionState: "PROVISIONAL",
            decisionBasis: "PROVISIONAL_RULES",
            evidenceSufficient: false,
            reason: "Exoneración sin confirmar",
            evidence: [],
            missingInformation: ["exemption"],
            conflicts: [],
          },
        ],
      }),
      preferences: { schemaVersion: 1, manualModelCodes: ["303", "A22"] },
      availableModelCodes,
    });

    expect(result).toMatchObject({
      status: "ALL_ONLY",
      fallbackReason: "ASSESSMENT_NOT_RESOLVED",
      visibleModelCodes: availableModelCodes,
      assessmentModelCodes: [],
      reviewModelCodes: [],
      manualModelCodes: ["303", "A22"],
    });
    expect(result.visibleModelCodes).toContain("111");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.visibleModelCodes)).toBe(true);
  });

  it("ignores unknown assessment codes and malformed manual preferences", () => {
    const activeSession = session({});
    activeSession.publishedAssessment!.obligations = [
      {
        modelCode: "999",
        status: "REQUIRED",
        decisionState: "CONFIRMED",
        decisionBasis: "CONFIRMED_FACTS",
        evidenceSufficient: true,
        reason: "invalid",
        evidence: [],
        missingInformation: [],
        conflicts: [],
      },
    ] as unknown as TaxObligationsAssessmentV1["obligations"];
    const result = buildFiscalModelPersonalizationV1({
      session: activeSession,
      preferences: { schemaVersion: 1, manualModelCodes: ["303", "303"] },
      availableModelCodes,
    });
    expect(result).toMatchObject({
      status: "ALL_ONLY",
      fallbackReason: "NO_PUBLISHED_ASSESSMENT",
      manualModelCodes: [],
      visibleModelCodes: availableModelCodes,
    });
  });
});
