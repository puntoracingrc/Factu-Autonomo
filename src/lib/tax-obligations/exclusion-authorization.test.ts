import { describe, expect, it } from "vitest";
import type { FiscalCalendarEvent } from "@/lib/fiscal-calendar/types";
import { buildFiscalCalendarObligationView } from "@/lib/fiscal-calendar/obligation-filter";
import { buildFiscalModelPersonalizationV1 } from "@/lib/fiscal-advisory-models/personalization";
import type { TaxModelDiagnosticSession } from "@/lib/tax-model-diagnostic/contracts";
import type {
  TaxObligationsAssessmentV1,
  TaxObligationsResolutionState,
  TaxObligationsRuleReviewState,
} from "./contracts";
import { isTaxObligationExclusionAuthorized } from "./exclusion-authorization";

const approvalMatrix = [
  ["PENDING_FISCAL_REVIEW", "RESOLVED", false],
  ["PENDING_FISCAL_REVIEW", "MANUAL_REVIEW", false],
  ["PENDING_FISCAL_REVIEW", "BLOCKED", false],
  ["APPROVED", "MANUAL_REVIEW", false],
  ["APPROVED", "BLOCKED", false],
  ["APPROVED", "RESOLVED", true],
] as const satisfies readonly (readonly [
  TaxObligationsRuleReviewState,
  TaxObligationsResolutionState,
  boolean,
])[];

function assessment(
  ruleReviewState: TaxObligationsRuleReviewState,
  resolutionState: TaxObligationsResolutionState,
): TaxObligationsAssessmentV1 {
  return {
    contractVersion: "1.0.0",
    catalogVersion: "es-tax-models.2026-07.v1",
    ruleSetVersion: "synthetic-exclusion-guard.v1",
    ruleReviewState,
    resolutionState,
    traceability: {
      engineVersion: "synthetic-ocr-corpus-improvement.v1",
      sourceSchemaVersion: 1,
    },
    generatedAt: "2026-07-15T10:00:00.000Z",
    fiscalYear: 2026,
    territory: "ES_COMMON",
    profile: { state: "COMPLETE", missingInformation: [], conflicts: [] },
    obligations: [
      {
        modelCode: "303",
        status: "NOT_APPLICABLE",
        decisionState: "CONFIRMED",
        decisionBasis: "CONFIRMED_FACTS",
        evidenceSufficient: true,
        reason: "Evidencia sintética completa tras mejorar OCR y corpus",
        evidence: [
          {
            kind: "CENSUS",
            summary: "Fixture sintético completo; no constituye aprobación fiscal",
          },
        ],
        missingInformation: [],
        conflicts: [],
      },
    ],
  };
}

function session(
  publishedAssessment: TaxObligationsAssessmentV1,
): TaxModelDiagnosticSession {
  return { publishedAssessment } as TaxModelDiagnosticSession;
}

const calendarEvent: FiscalCalendarEvent = {
  id: "model-303",
  source: "AEAT",
  sourceProvider: "google-calendar",
  sourceCalendarKey: "iva",
  sourceCalendarId: "synthetic-calendar",
  externalEventId: "synthetic-303",
  iCalUID: "synthetic-303@calendar",
  title: "Presentación del modelo 303",
  description: "Referencia explícita al modelo 303",
  category: "iva",
  deadlineKind: "unclassified",
  reviewStatus: "review-with-advisor",
  startDate: "2026-07-20",
  endDateExclusive: "2026-07-21",
  allDay: true,
  status: "confirmed",
  sourceUpdatedAt: "2026-07-01T10:00:00.000Z",
  fetchedAt: "2026-07-15T10:00:00.000Z",
};

describe("tax obligation exclusion authorization", () => {
  it.each(approvalMatrix)(
    "requires APPROVED + RESOLVED (%s + %s)",
    (ruleReviewState, resolutionState, expected) => {
      expect(
        isTaxObligationExclusionAuthorized({
          ruleReviewState,
          resolutionState,
        }),
      ).toBe(expected);
    },
  );

  it.each(approvalMatrix.filter(([, , allowed]) => !allowed))(
    "keeps Calendar and Models complete before double approval (%s + %s)",
    (ruleReviewState, resolutionState) => {
      const storedSession = session(
        assessment(ruleReviewState, resolutionState),
      );
      const calendar = buildFiscalCalendarObligationView({
        events: [calendarEvent],
        session: storedSession,
      });
      const models = buildFiscalModelPersonalizationV1({
        session: storedSession,
        preferences: null,
        availableModelCodes: ["303", "390"],
      });

      expect(calendar.excludedCount).toBe(0);
      expect([...calendar.visibleEventIds]).toEqual(["model-303"]);
      expect(calendar.decisions[0]).toMatchObject({
        visibleInMyObligations: true,
      });
      expect(models.status).toBe("ALL_ONLY");
      expect(models.visibleModelCodes).toEqual(["303", "390"]);
    },
  );
});
