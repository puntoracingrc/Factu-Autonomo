import { describe, expect, it } from "vitest";
import {
  resolveFiscalNotificationAuditReferenceDateIsoV1,
  validateFiscalNotificationLibraryAiAuditTemporalClaimsV1,
} from "./library-ai-audit-temporal-validation.v1";
import {
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
  type FiscalNotificationLibraryAiAuditInputV1,
  type FiscalNotificationLibraryAiAuditResultV1,
} from "./library-ai-audit.v1";

const audit = {
  schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
  documents: [],
  relations: [],
} satisfies FiscalNotificationLibraryAiAuditInputV1;

function result(
  detail: string,
  evidenceValue: string,
): FiscalNotificationLibraryAiAuditResultV1 {
  return {
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    summary: "Revisión completada.",
    documentsReviewed: 1,
    relationsReviewed: 0,
    findings: [
      {
        id: "finding-1",
        severity: "LOW",
        scope: "DOCUMENT",
        category: "DATE_OR_REFERENCE",
        documentAliases: ["DOC-001"],
        relationAliases: [],
        title: "Comprobación temporal",
        detail,
        recommendation: "Revisar la fecha impresa.",
        evidence: [{ label: "Fecha", value: evidenceValue, pages: [1] }],
      },
    ],
  };
}

describe("fiscal notification AI audit temporal validation v1", () => {
  it("rejects a past date incorrectly described as future", () => {
    const validated = validateFiscalNotificationLibraryAiAuditTemporalClaimsV1({
      audit,
      result: result("La fecha 2026-02-05 es futura.", "2026-02-05"),
      referenceDateIso: "2026-07-21",
    });

    expect(validated.findings).toEqual([]);
    expect(validated.summary).toContain("Se descartó 1 afirmación temporal");
    expect(validated.summary).toContain("2026-07-21");
  });

  it("retains a future-date finding when the cited date proves it", () => {
    const original = result(
      "La fecha 2026-08-05 es futura respecto a la fecha de revisión.",
      "2026-08-05",
    );
    const validated = validateFiscalNotificationLibraryAiAuditTemporalClaimsV1({
      audit,
      result: original,
      referenceDateIso: "2026-07-21",
    });

    expect(validated).toBe(original);
  });

  it("rejects a relative temporal claim with no cited date", () => {
    const validated = validateFiscalNotificationLibraryAiAuditTemporalClaimsV1({
      audit,
      result: result("La fecha es futura.", "Sin fecha verificable"),
      referenceDateIso: "2026-07-21",
    });

    expect(validated.findings).toEqual([]);
  });

  it("resolves the review date in Europe/Madrid", () => {
    expect(
      resolveFiscalNotificationAuditReferenceDateIsoV1(
        new Date("2026-07-20T22:30:00.000Z"),
      ),
    ).toBe("2026-07-21");
  });
});
