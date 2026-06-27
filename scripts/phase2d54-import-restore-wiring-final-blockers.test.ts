import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDisabledRecoverySnapshotDownloadPlaceholder,
  evaluateRoutelessImportRestoreUiHarnessScope,
} from "../src/lib/local-data-safety";

// PHASE2D54_IMPORT_RESTORE_WIRING_FINAL_BLOCKERS_V1

const root = path.resolve(new URL("../", import.meta.url).pathname);

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const runtimeFiles = [
  "src/lib/local-data-safety/routeless-ui-harness-scope.ts",
  "src/lib/local-data-safety/import-restore-ui-fixtures.ts",
  "src/lib/local-data-safety/import-restore-preview-state-machine.ts",
  "src/lib/local-data-safety/import-restore-review-session.ts",
  "src/lib/local-data-safety/import-restore-data-loss-warning.ts",
  "src/lib/local-data-safety/recovery-snapshot-download-placeholder.ts",
  "src/lib/local-data-safety/import-restore-ux-legal-review-packet.ts",
];

describe("phase 2D.54 import/restore wiring final blockers", () => {
  it("keeps runtime free from route, navigation, storage, reader and binary download APIs", () => {
    const joined = runtimeFiles.map(read).join("\n");
    const storageGlobal = "local" + "Storage";
    const fileReaderGlobal = "File" + "Reader";

    expect(joined).not.toMatch(/next\/navigation|next\/router|next\/link|src\/app|app\/api/);
    expect(joined).not.toContain(storageGlobal);
    expect(joined).not.toMatch(/\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
    expect(joined).not.toContain(fileReaderGlobal);
    expect(joined).not.toMatch(/\bBlob\b|createObjectURL|document\.createElement\(["']a["']\)|\.click\(\)/);
    expect(joined).not.toContain("applyImportAllowed: true");
    expect(joined).not.toContain("applyRestoreAllowed: true");
  });

  it("blocks scope without approvals and with connected wiring flags", () => {
    const readyWithoutApprovals = evaluateRoutelessImportRestoreUiHarnessScope({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
    });
    const rejected = evaluateRoutelessImportRestoreUiHarnessScope({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
      uxLegalReviewPacketPrepared: true,
      routeConnected: true,
      navigationConnected: true,
      importApplyConnected: true,
      restoreApplyConnected: true,
    });

    expect(readyWithoutApprovals.status).toBe("preview_harness_ready");
    expect(readyWithoutApprovals.blockers).toContain("UX/legal review packet is required before review.");
    expect(rejected.status).toBe("rejected");
    expect(rejected.importApplyAllowed).toBe(false);
  });

  it("keeps checklist-like final toggles false and recovery snapshot download disabled", () => {
    const scope = evaluateRoutelessImportRestoreUiHarnessScope({
      syntheticFixturesOnly: true,
      viewModelProvided: true,
      disabledActionsProvided: true,
      stateMachineProvided: true,
      reviewSessionProvided: true,
      dataLossWarningsProvided: true,
      uxLegalReviewPacketPrepared: true,
    });
    const placeholder = buildDisabledRecoverySnapshotDownloadPlaceholder({
      generatedAt: "2026-06-27T00:00:00.000Z",
    });

    expect(Object.values(scope.requiredApprovals).every((value) => value === false)).toBe(true);
    expect(scope.routeAllowed).toBe(false);
    expect(scope.navigationAllowed).toBe(false);
    expect(placeholder.canStartDownload).toBe(false);
  });
});
