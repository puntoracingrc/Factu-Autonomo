import { describe, expect, it } from "vitest";

import { buildTaxObligationsAssessment } from "../tax-obligations";
import { evaluateTaxModelDiagnostic } from "./engine";
import { completeCommonTerritoryProfile } from "./test-fixtures";

import {
  createTaxModelDiagnosticSession,
  normalizeTaxModelDiagnosticSession,
  normalizeTaxpayerProfile,
} from "./profile";

describe("tax diagnostic persistence normalization", () => {
  it("rechaza enums, fechas, porcentajes y códigos no canónicos", () => {
    const profile = normalizeTaxpayerProfile({
      fiscalYear: 2030,
      territory: "INVENTED",
      activityStartDate: "2026-02-31",
      activityStillActive: "NOT_APPLICABLE",
      withheldIncomePercent: 1000,
      activityKinds: ["BUSINESS", "BUSINESS", "INVALID"],
      censusObligations: ["303", "303/390", "999"],
    });

    expect(profile.fiscalYear).toBe(2026);
    expect(profile.territory).toBe("UNKNOWN");
    expect(profile.activityStartDate).toBeNull();
    expect(profile.activityStillActive).toBe("UNKNOWN");
    expect(profile.withheldIncomePercent).toBeNull();
    expect(profile.activityKinds).toEqual(["BUSINESS"]);
    expect(profile.censusObligations).toEqual(["303"]);
  });

  it("migra una sesión anterior con fecha de cese a actividad no activa", () => {
    const profile = normalizeTaxpayerProfile({
      activityEndDate: "2026-03-31",
    });

    expect(profile.activityStillActive).toBe("NO");
    expect(profile.activityEndDate).toBe("2026-03-31");
  });

  it("solo conserva evidencia confirmada por la persona", () => {
    const session = normalizeTaxModelDiagnosticSession({
      ...createTaxModelDiagnosticSession("2026-07-14T12:00:00.000Z"),
      evidence: [
        {
          evidenceId: "confirmed",
          type: "MODEL_036",
          field: "incomeTaxRegime",
          value: "DIRECT_SIMPLIFIED",
          confidence: 5,
          extractionMethod: "PDF_NATIVE_TEXT",
          userConfirmed: true,
          sourcePriority: 10,
          page: 2,
        },
        {
          evidenceId: "proposal-only",
          type: "MODEL_036",
          field: "vatRegimes",
          value: ["GENERAL"],
          confidence: 0.9,
          extractionMethod: "PDF_NATIVE_TEXT",
          userConfirmed: false,
          sourcePriority: 10,
        },
      ],
    });

    expect(session?.evidence).toHaveLength(1);
    expect(session?.evidence[0]).toMatchObject({
      evidenceId: "confirmed",
      confidence: 1,
      page: 2,
      userConfirmed: true,
    });
  });

  it("descarta sesiones con versión incompatible", () => {
    expect(normalizeTaxModelDiagnosticSession({ schemaVersion: 999 })).toBeUndefined();
  });

  it("conserva el resultado y la foto pública generados por el test", () => {
    const generatedAt = "2026-07-15T07:20:00.000Z";
    const session = createTaxModelDiagnosticSession(generatedAt);
    session.profile = completeCommonTerritoryProfile();
    session.lastResult = evaluateTaxModelDiagnostic(
      session.profile,
      generatedAt,
    );
    session.publishedAssessment = buildTaxObligationsAssessment(
      session.lastResult,
    );

    const normalized = normalizeTaxModelDiagnosticSession(
      JSON.parse(JSON.stringify(session)),
    );

    expect(normalized?.lastResult).toEqual(session.lastResult);
    expect(normalized?.publishedAssessment).toEqual(
      session.publishedAssessment,
    );
  });
});
