import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportRestoreReviewShell } from "@/components/local-data-safety";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import {
  assertDisabledImportRestoreShellPropsSafe,
  buildDisabledImportRestoreShellProps,
  summarizeDisabledImportRestoreShellProps,
} from "./import-restore-wiring-props";

// PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1

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

describe("disabled import restore wiring props", () => {
  it("builds safe props with blocked handlers", () => {
    const props = buildDisabledImportRestoreShellProps(reviewModel());
    const summary = summarizeDisabledImportRestoreShellProps(props);

    expect(assertDisabledImportRestoreShellPropsSafe(props).safe).toBe(true);
    expect(summary.routeConnected).toBe(false);
    expect(summary.filePickerConnected).toBe(false);
    expect(props.eventHandlers.handleApplyImportClicked().status).toBe("blocked");
  });

  it("can feed the disabled shell without extra wiring", () => {
    const props = buildDisabledImportRestoreShellProps(reviewModel());
    const html = renderToStaticMarkup(createElement(ImportRestoreReviewShell, props.shellProps));

    expect(html).toContain("Vista previa");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("type=\"file\"");
  });
});
