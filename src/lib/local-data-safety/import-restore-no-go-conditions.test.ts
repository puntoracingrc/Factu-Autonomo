import { describe, expect, it } from "vitest";
import {
  evaluateImportRestoreNoGoConditions,
  listImportRestoreNoGoConditions,
  summarizeImportRestoreNoGoConditions,
  type ImportRestoreNoGoConditionInput,
} from "./import-restore-no-go-conditions";

// PHASE2D97_IMPORT_RESTORE_NO_GO_CONDITIONS_REGISTRY_V1

describe("PHASE2D97 no-go conditions registry", () => {
  it("keeps all default no-go conditions inactive and safe", () => {
    const registry = evaluateImportRestoreNoGoConditions({ generatedAt: "2026-06-27T00:00:00.000Z" });

    expect(registry.noGo).toBe(false);
    expect(registry.activeConditionIds).toEqual([]);
    expect(registry.routeAllowed).toBe(false);
    expect(registry.applyImportAllowed).toBe(false);
    expect(registry.safe).toBe(true);
  });

  it.each<keyof ImportRestoreNoGoConditionInput>([
    "routeExists",
    "navigationConnected",
    "browserStorageWriteEnabled",
    "fileReaderEnabled",
    "downloadEnabled",
    "applyImportEnabled",
    "applyRestoreEnabled",
    "realDataUsed",
    "protectedDocumentsNotBlocked",
    "forbiddenCopyPresent",
    "supabaseImported",
    "secretsDetected",
  ])("marks %s as a blocker", (inputKey) => {
    const registry = evaluateImportRestoreNoGoConditions({ [inputKey]: true });

    expect(registry.noGo).toBe(true);
    expect(registry.activeConditionIds).toHaveLength(1);
  });

  it("returns a safe summary", () => {
    const registry = evaluateImportRestoreNoGoConditions({ routeExists: true });
    const summary = summarizeImportRestoreNoGoConditions(registry);

    expect(summary.noGo).toBe(true);
    expect(summary.totalConditions).toBe(listImportRestoreNoGoConditions().length);
    expect(summary.applyRestoreAllowed).toBe(false);
    expect(summary.safe).toBe(true);
  });
});
