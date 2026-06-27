import { describe, expect, it } from "vitest";
import {
  assertRecoverySnapshotDownloadDisabled,
  buildDisabledRecoverySnapshotDownloadPlaceholder,
  summarizeRecoverySnapshotDownloadPlaceholder,
} from "./recovery-snapshot-download-placeholder";

// PHASE2D50_DISABLED_RECOVERY_SNAPSHOT_DOWNLOAD_PLACEHOLDER_V1

describe("disabled recovery snapshot download placeholder", () => {
  it("keeps recovery snapshot download disabled", () => {
    const placeholder = buildDisabledRecoverySnapshotDownloadPlaceholder({
      generatedAt: "2026-06-27T00:00:00.000Z",
      reviewSessionId: "SYNTHETIC_ONLY_SESSION_SAFE",
    });
    const summary = summarizeRecoverySnapshotDownloadPlaceholder(placeholder);

    expect(assertRecoverySnapshotDownloadDisabled(placeholder)).toBe(placeholder);
    expect(summary.status).toBe("disabled");
    expect(summary.canStartDownload).toBe(false);
    expect(placeholder.canBuildBinary).toBe(false);
    expect(placeholder.canCreateObjectUrl).toBe(false);
  });
});
