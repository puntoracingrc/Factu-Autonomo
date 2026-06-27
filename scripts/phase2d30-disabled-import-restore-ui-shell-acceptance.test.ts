import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportRestoreReviewShell } from "../src/components/local-data-safety";
import {
  assertImportRestoreActionBlocked,
  assertImportRestoreErrorPresentationSafe,
  assertImportRestoreUiAuditEventSafe,
  buildImportRestoreDisabledActions,
  buildImportRestorePreviewList,
  buildImportRestoreReviewCopy,
  buildImportRestoreReviewViewModel,
  buildImportRestoreSafeErrorPresentation,
  buildImportRestoreUiAuditEvent,
  buildLocalDataImportRestoreReviewModel,
  evaluateLocalDataSafetyUiShellScope,
  runLocalDataBackupValidationPipeline,
  summarizeImportRestorePreviewList,
  validateImportRestoreReviewCopy,
} from "../src/lib/local-data-safety";
import type { LocalDataSafetyAppData } from "../src/lib/local-data-safety";

// PHASE2D30_DISABLED_IMPORT_RESTORE_UI_SHELL_ACCEPTANCE_V1

const root = path.resolve(new URL("../", import.meta.url).pathname);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function phaseCorpus(): string {
  return [
    "src/components/local-data-safety/ImportRestoreReviewShell.tsx",
    "src/components/local-data-safety/index.ts",
    "src/lib/local-data-safety/ui-shell-scope.ts",
    "src/lib/local-data-safety/import-restore-view-model.ts",
    "src/lib/local-data-safety/import-restore-disabled-actions.ts",
    "src/lib/local-data-safety/import-restore-copy.ts",
    "src/lib/local-data-safety/import-restore-preview-list.ts",
    "src/lib/local-data-safety/import-restore-error-presenter.ts",
    "src/lib/local-data-safety/import-restore-ui-audit.ts",
  ]
    .map(read)
    .join("\n");
}

function currentData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_current_locked",
        kind: "invoice",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "2026-1",
      },
    ],
  };
}

function incomingData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_current_locked",
        kind: "invoice",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
        number: "2026-1",
      },
      {
        id: "SYNTHETIC_ONLY_draft",
        kind: "invoice",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
    ],
  };
}

describe("phase 2D.30 disabled import restore UI shell acceptance", () => {
  it("keeps validation, review, view model, actions and render preview-only", () => {
    const validation = runLocalDataBackupValidationPipeline(
      currentData(),
      {
        fileName: "backup.json",
        mimeType: "application/json",
        byteLength: 2048,
        parsedObject: incomingData(),
      },
      { validatedAt: "2026-06-27T00:00:00.000Z" },
    );
    const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
    const viewModel = buildImportRestoreReviewViewModel(reviewModel);
    const disabledActions = buildImportRestoreDisabledActions({ reviewModel });
    const scope = evaluateLocalDataSafetyUiShellScope({ reviewModel, disabledActions });
    const html = renderToStaticMarkup(
      createElement(ImportRestoreReviewShell, { viewModel, scope }),
    );

    expect(validation.status).toBe("valid");
    expect(reviewModel.actions.allowApplyImport).toBe(false);
    expect(reviewModel.actions.allowApplyRestore).toBe(false);
    expect(viewModel.disabledActions.applyImportBlocked).toBe(true);
    expect(viewModel.disabledActions.applyRestoreBlocked).toBe(true);
    for (const action of disabledActions.actions) {
      expect(assertImportRestoreActionBlocked(disabledActions, action.id).disabled).toBe(true);
    }
    expect(html).toContain("Vista previa");
    expect(html).toContain("No se aplicaran cambios");
    expect(html).not.toContain("href=");
    expect(html.match(/aria-disabled="true"/g)?.length).toBe(disabledActions.actions.length);
  });

  it("keeps copy, errors, preview list and audit events safe", () => {
    const validation = runLocalDataBackupValidationPipeline(
      currentData(),
      {
        fileName: "backup.json",
        mimeType: "application/json",
        byteLength: 2048,
        parsedObject: incomingData(),
      },
      { validatedAt: "2026-06-27T00:00:00.000Z" },
    );
    const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
    const copy = validateImportRestoreReviewCopy(buildImportRestoreReviewCopy(reviewModel));
    const error = assertImportRestoreErrorPresentationSafe(
      buildImportRestoreSafeErrorPresentation(new Error(`payload ${"tok" + "en"} stack`)),
    );
    const preview = buildImportRestorePreviewList(reviewModel, { pageSize: 50 });
    const previewSummary = summarizeImportRestorePreviewList(preview);
    const audit = assertImportRestoreUiAuditEventSafe(
      buildImportRestoreUiAuditEvent({
        eventType: "apply_import_clicked_but_blocked",
        safeDetails: { action: "apply_import", blocked: true, payload: "redacted" },
      }),
    );

    expect(copy.banner.title).toBe("Vista previa");
    expect(copy.banner.body).toBe("No se aplicaran cambios");
    expect(JSON.stringify(copy)).not.toContain("Importar ahora");
    expect(error.safe).toBe(true);
    expect(previewSummary.safe).toBe(true);
    expect(audit.persisted).toBe(false);
    expect(JSON.stringify(audit)).not.toContain("payload");
  });

  it("keeps the shell disconnected from storage writes, routes, network and apply behavior", () => {
    const corpus = phaseCorpus();
    const browserStoreName = "local" + "Storage";

    expect(corpus).not.toMatch(new RegExp(`${browserStoreName}\\s*\\.\\s*(setItem|removeItem|clear)`));
    expect(corpus).not.toContain("@supabase/supabase-js");
    expect(corpus).not.toContain("next/navigation");
    expect(corpus).not.toContain("next/router");
    expect(corpus).not.toMatch(/\bfetch\s*\(/);
    expect(corpus).not.toContain("allowApplyImport: true");
    expect(corpus).not.toContain("allowApplyRestore: true");
    expect(corpus).not.toContain("app/api");
    expect(corpus).not.toContain("src/app");
  });
});
