import { describe, expect, it } from "vitest";
import {
  buildSafeImportRestoreReviewerNote,
  redactImportRestoreReviewerNote,
  validateImportRestoreReviewerNote,
} from "./import-restore-reviewer-notes";

// PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1

describe("safe import/restore reviewer notes", () => {
  it("accepts short safe notes attached to synthetic cases", () => {
    const note = buildSafeImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      reviewerRole: "ux",
      note: "Preview copy is clear and keeps apply actions blocked.",
      createdAt: "2026-06-27T00:00:00.000Z",
    });

    expect(note.accepted).toBe(true);
    expect(note.rawDataIncluded).toBe(false);
    expect(redactImportRestoreReviewerNote(note).safe).toBe(true);
  });

  it("rejects unsafe note content", () => {
    const validation = validateImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      note: `<script>${"tok" + "en"}</script>`,
    });
    const note = buildSafeImportRestoreReviewerNote({
      caseId: "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP",
      note: `<script>${"tok" + "en"}</script>`,
    });

    expect(validation.valid).toBe(false);
    expect(note.accepted).toBe(false);
    expect(note.body).toBe("[redacted]");
  });
});
