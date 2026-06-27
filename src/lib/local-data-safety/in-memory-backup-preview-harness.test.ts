import { describe, expect, it } from "vitest";
import {
  buildInMemoryBackupPreviewHarnessResult,
  parseInMemoryBackupJsonForPreview,
  summarizeInMemoryBackupPreviewHarness,
} from "./in-memory-backup-preview-harness";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1

function currentData(): LocalDataSafetyAppData {
  return {
    documents: [
      {
        id: "SYNTHETIC_CURRENT",
        status: "emitida",
        documentLifecycle: "issued",
        integrityLock: "locked",
      },
    ],
  };
}

describe("in-memory backup preview harness", () => {
  it("parses valid synthetic JSON in memory", () => {
    const result = parseInMemoryBackupJsonForPreview({
      currentData: currentData(),
      rawJson: JSON.stringify({ documents: [] }),
      parsedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(result.status).toBe("preview_ready");
    expect(result.viewModel?.safe).toBe(true);
    expect(result.applyImportAllowed).toBe(false);
  });

  it("reports malformed JSON safely", () => {
    const result = parseInMemoryBackupJsonForPreview({
      currentData: currentData(),
      rawJson: "{bad json",
      parsedAt: "2026-06-27T00:00:00.000Z",
    });
    const summary = summarizeInMemoryBackupPreviewHarness(result);

    expect(result.status).toBe("invalid");
    expect(summary.errorCode).toBe("IMPORT_RESTORE_REVIEW_ERROR");
    expect(JSON.stringify(result)).not.toContain("{bad json");
  });

  it("rejects oversized in-memory input", () => {
    const result = parseInMemoryBackupJsonForPreview({
      currentData: currentData(),
      rawJson: "x".repeat(20),
      maxBytes: 10,
      parsedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(result.status).toBe("invalid");
    expect(result.byteLength).toBeGreaterThan(10);
  });

  it("rejects prototype pollution through validation", () => {
    const result = buildInMemoryBackupPreviewHarnessResult(
      currentData(),
      JSON.parse('{"documents":[],"__proto__":{"polluted":true}}'),
      { byteLength: 60, parsedAt: "2026-06-27T00:00:00.000Z" },
    );

    expect(result.status).toBe("invalid");
    expect(Object.prototype).not.toHaveProperty("polluted");
  });
});
