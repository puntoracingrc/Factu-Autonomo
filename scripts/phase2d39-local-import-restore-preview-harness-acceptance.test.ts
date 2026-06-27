import { describe, expect, it } from "vitest";
import {
  buildDisabledImportRestoreShellProps,
  buildLocalDataImportRestoreReviewModel,
  createDisabledBackupFileSelectionAdapter,
  handleImportRestoreApplyImportClicked,
  handleImportRestoreApplyRestoreClicked,
  handleImportRestorePreviewRequested,
  parseInMemoryBackupJsonForPreview,
  runLocalDataBackupValidationPipeline,
} from "../src/lib/local-data-safety";
import type { LocalDataSafetyAppData } from "../src/lib/local-data-safety";

// PHASE2D39_LOCAL_IMPORT_RESTORE_PREVIEW_HARNESS_ACCEPTANCE_V1

function currentData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_current",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
    ],
  };
}

function incomingData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_ONLY_draft",
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
      },
    ],
  };
}

describe("phase 2D.39 local import restore preview harness acceptance", () => {
  it("keeps the full preview harness synthetic, disabled and route-free", () => {
    const current = currentData();
    const incoming = incomingData();
    const beforeCurrent = JSON.stringify(current);
    const rawJson = JSON.stringify(incoming);

    const preview = parseInMemoryBackupJsonForPreview({
      currentData: current,
      rawJson,
      fileName: "synthetic-backup.json",
      parsedAt: "2026-06-27T00:00:00.000Z",
    });
    const validation = runLocalDataBackupValidationPipeline(
      current,
      {
        fileName: "synthetic-backup.json",
        mimeType: "application/json",
        byteLength: rawJson.length,
        parsedObject: incoming,
      },
      { validatedAt: "2026-06-27T00:00:00.000Z" },
    );
    const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
    const props = buildDisabledImportRestoreShellProps(reviewModel);
    const handlerPreview = handleImportRestorePreviewRequested({
      currentData: current,
      rawJson,
      parsedAt: "2026-06-27T00:00:00.000Z",
    });
    const importBlocked = handleImportRestoreApplyImportClicked("2026-06-27T00:00:00.000Z");
    const restoreBlocked = handleImportRestoreApplyRestoreClicked("2026-06-27T00:00:00.000Z");
    const fileAdapter = createDisabledBackupFileSelectionAdapter();
    const browserStoreName = "local" + "Storage";

    expect(preview.status).toBe("preview_ready");
    expect(validation.status).toBe("valid");
    expect(props.safe).toBe(true);
    expect(handlerPreview.status).toBe("preview_ready");
    expect(importBlocked.status).toBe("blocked");
    expect(restoreBlocked.status).toBe("blocked");
    expect(fileAdapter.openFilePicker().blocked).toBe(true);
    expect(JSON.stringify(props)).not.toContain(browserStoreName);
    expect(JSON.stringify(props)).not.toContain("src/app");
    expect(JSON.stringify(current)).toBe(beforeCurrent);
  });
});
