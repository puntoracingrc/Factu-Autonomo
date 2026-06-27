import { describe, expect, it } from "vitest";
import {
  buildImportRestorePreviewList,
  paginateImportRestorePreviewItems,
  summarizeImportRestorePreviewList,
} from "./import-restore-preview-list";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";

// PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1

function reviewModel() {
  return buildLocalDataImportRestoreReviewModel(
    runLocalDataBackupValidationPipeline(
      { documents: [] },
      {
        fileName: "backup.json",
        mimeType: "application/json",
        byteLength: 500,
        parsedObject: { documents: [] },
      },
    ),
  );
}

describe("import restore preview list model", () => {
  it("paginates with a stable order and max page size", () => {
    const list = paginateImportRestorePreviewItems(
      Array.from({ length: 80 }, (_, index) => ({
        id: `item-${String(80 - index).padStart(2, "0")}`,
        label: `Item ${index}`,
        severity: "info",
      })),
      1,
      200,
    );

    expect(list.pageSize).toBe(50);
    expect(list.items[0].id).toBe("item-01");
    expect(list.totalPages).toBe(2);
  });

  it("filters by severity and falls back for unknown severity", () => {
    const list = paginateImportRestorePreviewItems(
      [
        { id: "a", label: "A", severity: "unknown" },
        { id: "b", label: "B", severity: "blocked" },
      ],
      1,
      10,
      { severity: "warning" },
    );

    expect(list.totalItems).toBe(1);
    expect(list.items[0].severity).toBe("warning");
  });

  it("builds from review model without leaking unsafe labels", () => {
    const list = buildImportRestorePreviewList(reviewModel());
    const summary = summarizeImportRestorePreviewList(list);

    expect(summary.totalItems).toBeGreaterThan(0);
    expect(JSON.stringify(list)).not.toContain("documentSnapshot");
  });

  it("truncates long labels and strips tag brackets", () => {
    const list = paginateImportRestorePreviewItems([
      {
        id: "x",
        label: `<script>${"a".repeat(120)}</script>`,
      },
    ]);

    expect(list.items[0].label).not.toContain("<");
    expect(list.items[0].label.length).toBeLessThanOrEqual(80);
  });
});
