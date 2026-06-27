import { describe, expect, it } from "vitest";
import {
  createImportRestoreReviewSession,
  summarizeImportRestoreReviewSession,
  updateImportRestoreReviewSession,
} from "./import-restore-review-session";

// PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1

describe("import/restore review session", () => {
  it("creates an in-memory synthetic session", () => {
    const session = createImportRestoreReviewSession({
      createdAt: "2026-06-27T00:00:00.000Z",
    });
    const summary = summarizeImportRestoreReviewSession(session);

    expect(session.sessionId.startsWith("SYNTHETIC_ONLY_SESSION_")).toBe(true);
    expect(session.persisted).toBe(false);
    expect(session.fullBackupIncluded).toBe(false);
    expect(summary.safe).toBe(true);
  });

  it("updates through the preview flow and keeps disabled actions", () => {
    let session = createImportRestoreReviewSession({ createdAt: "2026-06-27T00:00:00.000Z" });
    session = updateImportRestoreReviewSession(session, {
      type: "select_synthetic_fixture",
      fixtureId: "SYNTHETIC_ONLY_SAFE_BACKUP_PREVIEW",
      occurredAt: "2026-06-27T00:00:01.000Z",
    });
    session = updateImportRestoreReviewSession(session, {
      type: "parse_preview",
      occurredAt: "2026-06-27T00:00:02.000Z",
    });
    session = updateImportRestoreReviewSession(session, {
      type: "build_review",
      occurredAt: "2026-06-27T00:00:03.000Z",
    });

    expect(session.currentState).toBe("review_ready");
    expect(session.disabledActions.applyImportBlocked).toBe(true);
    expect(session.disabledActions.applyRestoreBlocked).toBe(true);
    expect(session.auditEvents).toHaveLength(3);
    expect(session.applyImportAllowed).toBe(false);
  });
});
