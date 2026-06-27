import { describe, expect, it } from "vitest";
import { LocalDataSafetyError } from "./errors";
import {
  assertImportRestoreErrorPresentationSafe,
  buildImportRestoreSafeErrorPresentation,
  redactImportRestoreErrorForDisplay,
} from "./import-restore-error-presenter";

// PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1

describe("import restore safe error presenter", () => {
  it("presents malformed backup errors safely", () => {
    const presentation = buildImportRestoreSafeErrorPresentation(
      new LocalDataSafetyError("MALFORMED_BACKUP", "Prototype pollution rejected."),
    );

    expect(presentation.code).toBe("MALFORMED_BACKUP");
    expect(presentation.remediationSteps.length).toBeGreaterThan(0);
    expect(assertImportRestoreErrorPresentationSafe(presentation).safe).toBe(true);
  });

  it("redacts generic errors without stack or payload", () => {
    const error = new Error("payload with token must not leak");
    const redacted = redactImportRestoreErrorForDisplay(error);
    const presentation = buildImportRestoreSafeErrorPresentation(error);

    expect(redacted.message).not.toContain("payload");
    expect(JSON.stringify(presentation).toLowerCase()).not.toContain("stack");
    expect(JSON.stringify(presentation).toLowerCase()).not.toContain("payload");
  });

  it("presents apply blocked errors without unsafe internals", () => {
    const presentation = buildImportRestoreSafeErrorPresentation(
      new LocalDataSafetyError("APPLY_BLOCKED", "Apply operation remains blocked."),
    );

    expect(presentation.code).toBe("APPLY_BLOCKED");
    expect(presentation.message).toContain("blocked");
  });
});
