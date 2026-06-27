import { describe, expect, it } from "vitest";
import {
  buildCorpusViewModelCatalog,
  getCorpusViewModelCatalogItem,
  summarizeCorpusViewModelCatalog,
} from "./corpus-view-model-catalog";

// PHASE2D72_CORPUS_TO_VIEW_MODEL_CATALOG_V1

describe("corpus view model catalog", () => {
  it("builds review/view/preview summaries for each synthetic case", () => {
    const catalog = buildCorpusViewModelCatalog({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeCorpusViewModelCatalog(catalog);

    expect(summary.totalItems).toBeGreaterThanOrEqual(12);
    expect(summary.allowApplyImport).toBe(false);
    expect(summary.allowApplyRestore).toBe(false);
    expect(catalog.items.every((entry) => entry.disabledActionSummary.applyImportBlocked)).toBe(true);
    expect(catalog.items.every((entry) => entry.previewListSummary.safe)).toBe(true);
  });

  it("exposes safe errors for malformed synthetic cases only as summaries", () => {
    const catalog = buildCorpusViewModelCatalog({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const malformed = getCorpusViewModelCatalogItem(catalog, "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP");
    const serialized = JSON.stringify(malformed);

    expect(malformed.safeError?.safe).toBe(true);
    expect(malformed.rawDataIncluded).toBe(false);
    expect(serialized).not.toMatch(/documentSnapshot|authorization|cookie/i);
  });
});
