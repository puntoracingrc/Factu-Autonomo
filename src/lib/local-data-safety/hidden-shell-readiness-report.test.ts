import { describe, expect, it } from "vitest";
import {
  assertHiddenImportRestoreShellReadinessReportSafe,
  buildHiddenImportRestoreShellReadinessReport,
  redactHiddenImportRestoreShellReadinessReport,
  summarizeHiddenImportRestoreShellReadinessReport,
} from "./hidden-shell-readiness-report";

// PHASE2D98_HIDDEN_IMPORT_RESTORE_SHELL_READINESS_REPORT_V1

describe("PHASE2D98 hidden shell readiness report", () => {
  it("builds a blocked-by-default safe report", () => {
    const report = buildHiddenImportRestoreShellReadinessReport({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeHiddenImportRestoreShellReadinessReport(report);

    expect(summary.gateStatus).toBe("blocked_by_default");
    expect(summary.enablementAllowed).toBe(false);
    expect(report.realDataIncluded).toBe(false);
  });

  it("redacts and rejects unsafe material", () => {
    const report = buildHiddenImportRestoreShellReadinessReport();

    expect(redactHiddenImportRestoreShellReadinessReport(report).safe).toBe(true);
    const unsafeReport = { ...report, enablementAllowed: true } as unknown as Parameters<
      typeof assertHiddenImportRestoreShellReadinessReportSafe
    >[0];
    expect(() => assertHiddenImportRestoreShellReadinessReportSafe(unsafeReport)).toThrow();
  });
});
