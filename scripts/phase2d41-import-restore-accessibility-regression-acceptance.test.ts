import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportRestoreReviewShell } from "../src/components/local-data-safety";
import {
  buildDisabledImportRestoreShellProps,
  buildImportRestoreReviewCopy,
  buildImportRestoreSafeErrorPresentation,
  buildLocalDataImportRestoreReviewModel,
  runLocalDataBackupValidationPipeline,
} from "../src/lib/local-data-safety";

// PHASE2D41_IMPORT_RESTORE_ACCESSIBILITY_REGRESSION_ACCEPTANCE_V1

function props() {
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
  return buildDisabledImportRestoreShellProps(buildLocalDataImportRestoreReviewModel(validation));
}

describe("phase 2D.41 import restore accessibility regression acceptance", () => {
  it("keeps disabled actions labelled with reasons", () => {
    const built = props();

    for (const action of built.disabledActions.actions) {
      expect(action.disabled).toBe(true);
      expect(action.reason.length).toBeGreaterThan(8);
      expect(action.ariaDescription).toContain(action.label);
    }
  });

  it("keeps status textual and sections labelled", () => {
    const built = props();
    const html = renderToStaticMarkup(createElement(ImportRestoreReviewShell, built.shellProps));

    expect(html).toContain("Estado");
    expect(html).toContain("Severidad");
    expect(html).toContain("aria-label=");
    expect(html).toContain("aria-disabled=\"true\"");
  });

  it("keeps error presenter remediations and copy restrictions", () => {
    const copy = buildImportRestoreReviewCopy();
    const error = buildImportRestoreSafeErrorPresentation(new Error("synthetic"));
    const serialized = JSON.stringify({ copy, error });

    expect(error.remediationSteps.length).toBeGreaterThan(0);
    expect(serialized).not.toContain("Importar ahora");
    expect(serialized).not.toContain("Restaurar ahora");
    expect(copy.ariaDescriptions.actions).toContain("deshabilitadas");
  });

  it("keeps preview list counts visible", () => {
    const built = props();

    expect(built.shellProps.viewModel.previewList.totalItems).toBeGreaterThan(0);
    expect(built.shellProps.viewModel.previewList.page).toBe(1);
    expect(built.shellProps.viewModel.previewList.pageSize).toBeGreaterThan(0);
  });
});
