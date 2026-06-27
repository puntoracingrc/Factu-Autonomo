import { describe, expect, it } from "vitest";
import {
  assertPrivateStagingDryRunReportSafe,
  buildPrivateStagingDryRunReport,
  redactPrivateStagingDryRunReport,
} from "./private-staging-dry-run-report";
import type {
  PrivateStagingReadinessEvaluation,
} from "./private-staging-readiness";

const readiness: PrivateStagingReadinessEvaluation = {
  status: "ready_for_human_review",
  reason: "human_approval_required",
  authorized: false,
  blockers: [],
  reviewItems: ["ownerApproval"],
};

describe("private staging dry-run report", () => {
  it("construye reporte bloqueado por defecto", () => {
    const report = buildPrivateStagingDryRunReport({
      generatedAt: "2026-06-27T00:00:00.000Z",
      readiness,
      routeShellDisabledByDefault: true,
      fakeAdapterDefault: true,
      supabaseLocalOptInOnly: true,
      syntheticOnlyData: true,
      notes: ["private staging review only"],
    });

    expect(report.marker).toBe(
      "PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW",
    );
    expect(report.nextDecision).toBe("human_review_required");
    expect(assertPrivateStagingDryRunReportSafe(report)).toBe(report);
  });

  it("redacta notas inseguras antes del assert", () => {
    const report = buildPrivateStagingDryRunReport({
      generatedAt: "2026-06-27T00:00:00.000Z",
      readiness,
      routeShellDisabledByDefault: true,
      fakeAdapterDefault: true,
      supabaseLocalOptInOnly: true,
      syntheticOnlyData: true,
      notes: ["token-material", "safe note"],
    });
    const redacted = redactPrivateStagingDryRunReport(report);

    expect(redacted.notes).toEqual(["safe note"]);
    expect(assertPrivateStagingDryRunReportSafe(redacted)).toBe(redacted);
  });
});
