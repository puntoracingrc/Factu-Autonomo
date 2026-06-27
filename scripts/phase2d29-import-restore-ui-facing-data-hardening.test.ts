import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportRestoreReviewShell } from "../src/components/local-data-safety";
import {
  assertImportRestoreActionBlocked,
  assertImportRestoreErrorPresentationSafe,
  buildImportRestoreDisabledActions,
  buildImportRestoreReviewViewModel,
  buildImportRestoreSafeErrorPresentation,
  buildLocalDataImportRestoreReviewModel,
  detectMalformedLocalDataBackup,
  paginateImportRestorePreviewItems,
  runLocalDataBackupValidationPipeline,
} from "../src/lib/local-data-safety";
import type {
  LocalDataImportRestoreReviewModel,
  LocalDataReviewSection,
  LocalDataSafetyAppData,
} from "../src/lib/local-data-safety";

// PHASE2D29_IMPORT_RESTORE_UI_FACING_DATA_HARDENING_V1

function currentData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_current_locked",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
    ],
  };
}

function reviewModel(): LocalDataImportRestoreReviewModel {
  const validation = runLocalDataBackupValidationPipeline(
    currentData(),
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 1024,
      parsedObject: currentData(),
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  return buildLocalDataImportRestoreReviewModel(validation);
}

describe("phase 2D.29 UI-facing data hardening", () => {
  it("redacts malformed UI-facing messages before rendering", () => {
    const unsafeSections: LocalDataReviewSection[] = [
      {
        id: "overview",
        title: "<script>payload</script>",
        severity: "warning",
        count: 1,
        messages: [
          "payload documentSnapshot pdfSnapshot token authorization cookie secret privateKey",
        ],
      },
    ];
    const viewModel = buildImportRestoreReviewViewModel({
      ...reviewModel(),
      sections: unsafeSections,
    });
    const html = renderToStaticMarkup(createElement(ImportRestoreReviewShell, { viewModel }));
    const serialized = JSON.stringify(viewModel);

    expect(html).not.toContain("<script");
    expect(serialized).not.toContain("payload");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("privateKey");
  });

  it("keeps labels escaped or sanitized and truncates long names", () => {
    const longLabel = `${"<script>alert(1)</script>"}${"A".repeat(180)}`;
    const list = paginateImportRestorePreviewItems(
      [{ id: "b", label: longLabel, severity: "unknown", status: "preview_only", count: 1 }],
      1,
      10,
    );

    expect(list.items[0].label).not.toContain("<script>");
    expect(list.items[0].label.length).toBeLessThanOrEqual(80);
    expect(list.items[0].severity).toBe("warning");
  });

  it("blocks unknown action ids by default", () => {
    const action = assertImportRestoreActionBlocked(
      buildImportRestoreDisabledActions({ reviewModel: reviewModel() }),
      "synthetic_unknown_action",
    );

    expect(action.disabled).toBe(true);
    expect(action.state).toBe("blocked");
  });

  it("keeps prototype pollution findings outside the view model", () => {
    const malformed = detectMalformedLocalDataBackup(
      JSON.parse('{"documents":[],"__proto__":{"polluted":true}}'),
    );
    const viewModel = buildImportRestoreReviewViewModel(reviewModel());
    const serialized = JSON.stringify(viewModel);

    expect(malformed.safe).toBe(false);
    expect(serialized).not.toContain("polluted");
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("presents errors without secrets, payloads or snapshots", () => {
    const presentation = assertImportRestoreErrorPresentationSafe(
      buildImportRestoreSafeErrorPresentation(
        new Error(
          `payload documentSnapshot pdfSnapshot ${"tok" + "en"} ${"sec" + "ret"} privateKey stack`,
        ),
      ),
    );
    const serialized = JSON.stringify(presentation);

    expect(serialized).not.toContain("payload");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("privateKey");
  });
});
