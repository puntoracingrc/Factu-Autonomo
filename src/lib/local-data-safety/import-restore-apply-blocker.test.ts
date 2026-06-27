import { describe, expect, it } from "vitest";
import {
  assertLocalDataImportApplyBlocked,
  assertLocalDataRestoreApplyBlocked,
  buildLocalDataApplyBlockedResult,
} from "./import-restore-apply-blocker";

// PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1

describe("import restore apply blocker", () => {
  it("always blocks import apply", () => {
    const result = assertLocalDataImportApplyBlocked("2026-06-27T00:00:00.000Z");

    expect(result.operation).toBe("import");
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("APPLY_DISABLED_PENDING_UI_AND_EXTERNAL_REVIEW");
  });

  it("always blocks restore apply", () => {
    const result = assertLocalDataRestoreApplyBlocked("2026-06-27T00:00:00.000Z");

    expect(result.operation).toBe("restore");
    expect(result.blocked).toBe(true);
  });

  it("does not mutate approval-like inputs", () => {
    const approvals = { externalReviewAccepted: true };
    const before = JSON.stringify(approvals);
    const result = buildLocalDataApplyBlockedResult("import");

    expect(result.blocked).toBe(true);
    expect(JSON.stringify(approvals)).toBe(before);
  });
});
