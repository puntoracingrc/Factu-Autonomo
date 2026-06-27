import { describe, expect, it } from "vitest";
import {
  buildSyntheticImportRestoreFixtureSelector,
  selectSyntheticImportRestoreFixture,
  summarizeSyntheticImportRestoreFixtureSelector,
} from "./synthetic-fixture-selector";

// PHASE2D83_SYNTHETIC_IMPORT_RESTORE_FIXTURE_SELECTOR_MODEL_V1

describe("synthetic import/restore fixture selector", () => {
  it("lists synthetic fixtures without enabling file picking", () => {
    const selector = buildSyntheticImportRestoreFixtureSelector({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const summary = summarizeSyntheticImportRestoreFixtureSelector(selector);

    expect(summary.totalFixtures).toBeGreaterThanOrEqual(12);
    expect(selector.items.every((entry) => entry.id.startsWith("SYNTHETIC_ONLY_"))).toBe(true);
    expect(summary.filePickerAllowed).toBe(false);
    expect(summary.rawDataIncluded).toBe(false);
  });

  it("selects a valid synthetic fixture", () => {
    const selector = buildSyntheticImportRestoreFixtureSelector({ generatedAt: "2026-06-27T00:00:00.000Z" });
    const selected = selectSyntheticImportRestoreFixture(selector, "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP");

    expect(selected.selectedId).toBe("SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP");
    expect(selected.items.find((entry) => entry.id === selected.selectedId)?.selected).toBe(true);
  });

  it("rejects unknown or non-synthetic ids", () => {
    const selector = buildSyntheticImportRestoreFixtureSelector();
    const unknown = selectSyntheticImportRestoreFixture(selector, "SYNTHETIC_ONLY_UNKNOWN");
    const realLike = selectSyntheticImportRestoreFixture(selector, "REAL_CUSTOMER_1");

    expect(unknown.rejectedReason).toMatch(/unknown/i);
    expect(realLike.rejectedReason).toMatch(/synthetic/i);
  });

  it("does not leak raw data shaped content", () => {
    const selector = buildSyntheticImportRestoreFixtureSelector({
      selectedId: "SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP",
    });

    expect(JSON.stringify(selector)).not.toMatch(/documentSnapshot|authorization|cookie|privateKey/i);
  });
});
