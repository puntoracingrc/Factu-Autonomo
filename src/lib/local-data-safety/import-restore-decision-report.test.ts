import { describe, expect, it } from "vitest";
import { createImportRestoreApprovalState, transitionImportRestoreApprovalState } from "./import-restore-approval-state-machine";
import { buildImportRestoreDecisionReport, redactImportRestoreDecisionReport, summarizeImportRestoreDecisionReport } from "./import-restore-decision-report";
import { buildSafeImportRestoreReviewerNote } from "./import-restore-reviewer-notes";

// PHASE2D76_IMPORT_RESTORE_DECISION_REPORT_GENERATOR_V1

describe("import/restore decision report", () => {
  it("builds an in-memory report from gate, matrix, packet, approvals and notes", () => {
    const note = buildSafeImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      note: "Owner wants human product decision before future wiring.",
      createdAt: "2026-06-27T00:00:00.000Z",
    });
    const report = buildImportRestoreDecisionReport({
      clock: () => "2026-06-27T00:00:00.000Z",
      reviewerNotes: [note],
    });
    const summary = summarizeImportRestoreDecisionReport(report);

    expect(report.inMemoryOnly).toBe(true);
    expect(report.rawDataIncluded).toBe(false);
    expect(summary.reviewerNotes.accepted).toBe(1);
    expect(summary.applyImportAllowed).toBe(false);
    expect(summary.applyRestoreAllowed).toBe(false);
  });

  it("keeps approved future wiring separate from real apply", () => {
    let approvalState = createImportRestoreApprovalState("2026-06-27T00:00:00.000Z");
    for (const event of ["start_review", "ux_approved", "legal_approved", "data_loss_approved", "owner_approved"] as const) {
      approvalState = transitionImportRestoreApprovalState(approvalState, event, "2026-06-27T00:00:00.000Z");
    }
    const report = buildImportRestoreDecisionReport({
      clock: () => "2026-06-27T00:00:00.000Z",
      approvalState,
    });
    const redacted = redactImportRestoreDecisionReport(report);

    expect(redacted.approvalStateSummary.state).toBe("approved_for_future_wiring");
    expect(redacted.applyImportAllowed).toBe(false);
    expect(redacted.applyRestoreAllowed).toBe(false);
    expect(redacted.routeAllowed).toBe(false);
  });
});
