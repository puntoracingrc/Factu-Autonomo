import { describe, expect, it } from "vitest";
import {
  assertImportRestoreDecisionReportSafe,
  assertImportRestoreReviewBoardPacketSafe,
  assertUxDataLossDecisionPacketSafe,
  buildCorpusScenarioDecisionMatrix,
  buildCorpusViewModelCatalog,
  buildImportRestoreDecisionReport,
  buildImportRestoreReviewBoardPacket,
  buildSafeImportRestoreReviewerNote,
  buildUxDataLossDecisionPacket,
  createImportRestoreApprovalState,
  summarizeCorpusScenarioDecisionMatrix,
  transitionImportRestoreApprovalState,
  validateImportRestoreReviewerNote,
} from "../src/lib/local-data-safety";

// PHASE2D77_IMPORT_RESTORE_DECISION_PACKAGE_ACCEPTANCE_V1

const fixedAt = "2026-06-27T00:00:00.000Z";

function unsafeTerms(): string[] {
  return [
    "document" + "Snapshot",
    "pdf" + "Snapshot",
    "raw" + "Json",
    "full" + "Payload",
    "authorization",
    "cookie",
    "tok" + "en",
    "sec" + "ret",
    "private" + "Key",
    ["local", "Storage"].join(""),
    "File" + "Reader",
    "show" + "OpenFilePicker",
    "create" + "ObjectURL",
    "Bl" + "ob",
  ];
}

function assertNoUnsafeLeak(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const term of unsafeTerms()) {
    expect(serialized).not.toMatch(new RegExp(term, "i"));
  }
}

describe("phase 2D.77 import/restore decision package acceptance", () => {
  it("builds the decision package while all real actions remain disabled", () => {
    const matrix = buildCorpusScenarioDecisionMatrix({ generatedAt: fixedAt });
    const matrixSummary = summarizeCorpusScenarioDecisionMatrix(matrix);
    const uxPacket = buildUxDataLossDecisionPacket({ matrix, generatedAt: fixedAt });
    const catalog = buildCorpusViewModelCatalog({ generatedAt: fixedAt });
    const boardPacket = buildImportRestoreReviewBoardPacket({ generatedAt: fixedAt });
    const approvalState = createImportRestoreApprovalState(fixedAt);
    const note = buildSafeImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      reviewerRole: "owner",
      note: "Decision package can move to human product decision; no wiring is enabled.",
      createdAt: fixedAt,
    });
    const report = buildImportRestoreDecisionReport({
      clock: () => fixedAt,
      approvalState,
      boardPacket,
      reviewerNotes: [note],
    });

    expect(matrix.entries.length).toBeGreaterThanOrEqual(12);
    expect(matrixSummary.allowApplyImport).toBe(false);
    expect(matrixSummary.allowApplyRestore).toBe(false);
    expect(assertUxDataLossDecisionPacketSafe(uxPacket)).toBe(uxPacket);
    expect(catalog.allowApplyImport).toBe(false);
    expect(catalog.allowApplyRestore).toBe(false);
    expect(catalog.routeAllowed).toBe(false);
    expect(assertImportRestoreReviewBoardPacketSafe(boardPacket)).toBe(boardPacket);
    expect(Object.values(approvalState.approvals).every((value) => value === false)).toBe(true);
    expect(note.accepted).toBe(true);
    expect(assertImportRestoreDecisionReportSafe(report)).toBe(report);
    expect(report.applyImportAllowed).toBe(false);
    expect(report.applyRestoreAllowed).toBe(false);
    expect(report.routeAllowed).toBe(false);
    assertNoUnsafeLeak({ matrixSummary, uxPacket, catalog, boardPacket, approvalState, note, report });
  });

  it("keeps fully approved future wiring separate from real apply", () => {
    let approvalState = createImportRestoreApprovalState(fixedAt);
    for (const event of ["start_review", "ux_approved", "legal_approved", "data_loss_approved", "owner_approved"] as const) {
      approvalState = transitionImportRestoreApprovalState(approvalState, event, fixedAt);
    }
    const report = buildImportRestoreDecisionReport({ clock: () => fixedAt, approvalState });

    expect(approvalState.state).toBe("approved_for_future_wiring");
    expect(approvalState.canWireFutureUi).toBe(true);
    expect(approvalState.applyImportAllowed).toBe(false);
    expect(approvalState.applyRestoreAllowed).toBe(false);
    expect(report.applyImportAllowed).toBe(false);
    expect(report.applyRestoreAllowed).toBe(false);
    expect(report.routeAllowed).toBe(false);
    assertNoUnsafeLeak({ approvalState, report });
  });

  it("rejects unsafe reviewer notes without echoing unsafe content", () => {
    const unsafeNote = `<script>${"sec" + "ret"}</script>`;
    const validation = validateImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      note: unsafeNote,
    });
    const note = buildSafeImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      note: unsafeNote,
      createdAt: fixedAt,
    });

    expect(validation.valid).toBe(false);
    expect(note.accepted).toBe(false);
    expect(note.body).toBe("[redacted]");
    assertNoUnsafeLeak(note);
  });
});
