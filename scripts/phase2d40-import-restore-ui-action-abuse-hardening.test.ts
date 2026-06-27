import { describe, expect, it } from "vitest";
import {
  assertImportRestoreActionBlocked,
  buildImportRestoreDisabledActions,
  buildImportRestoreUiAuditEvent,
  buildLocalDataImportRestoreReviewModel,
  handleImportRestoreApplyImportClicked,
  handleImportRestoreApplyRestoreClicked,
  parseInMemoryBackupJsonForPreview,
  runLocalDataBackupValidationPipeline,
} from "../src/lib/local-data-safety";

// PHASE2D40_IMPORT_RESTORE_UI_ACTION_ABUSE_HARDENING_V1

function reviewModel() {
  const validation = runLocalDataBackupValidationPipeline(
    { documents: [] },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 20,
      parsedObject: { documents: [] },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  return buildLocalDataImportRestoreReviewModel(validation);
}

describe("phase 2D.40 import restore UI action abuse hardening", () => {
  it("blocks forged apply and unknown action ids", () => {
    const actions = buildImportRestoreDisabledActions({ reviewModel: reviewModel() });

    expect(assertImportRestoreActionBlocked(actions, "apply_import").disabled).toBe(true);
    expect(assertImportRestoreActionBlocked(actions, "apply_restore").disabled).toBe(true);
    expect(assertImportRestoreActionBlocked(actions, "forged_apply").state).toBe("blocked");
  });

  it("redacts unsafe audit details and does not echo large event content", () => {
    const audit = buildImportRestoreUiAuditEvent({
      eventType: "apply_import_clicked_but_blocked",
      safeDetails: {
        payload: "x".repeat(10_000),
        snapshot: "unsafe",
        token: "unsafe",
        note: "n".repeat(200),
      },
    });
    const serialized = JSON.stringify(audit);

    expect(serialized).not.toContain("payload");
    expect(serialized).not.toContain("snapshot");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("n".repeat(120));
  });

  it("rejects malicious filenames through the preview harness", () => {
    const result = parseInMemoryBackupJsonForPreview({
      currentData: { documents: [] },
      rawJson: JSON.stringify({ documents: [] }),
      fileName: "../<script>evil</script>.json",
      parsedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(JSON.stringify(result)).not.toContain("<script>");
    expect(result.applyImportAllowed).toBe(false);
  });

  it("keeps repeated apply clicks blocked and mutation-free", () => {
    const results = Array.from({ length: 5 }, () => handleImportRestoreApplyImportClicked("2026-06-27T00:00:00.000Z"));
    const restore = handleImportRestoreApplyRestoreClicked("2026-06-27T00:00:00.000Z");

    expect(results.every((result) => result.status === "blocked" && result.mutated === false)).toBe(true);
    expect(restore.status).toBe("blocked");
  });
});
