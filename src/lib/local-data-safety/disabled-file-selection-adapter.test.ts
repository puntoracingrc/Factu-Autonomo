import { describe, expect, it } from "vitest";
import {
  assertBackupFileSelectionDisabled,
  createDisabledBackupFileSelectionAdapter,
  summarizeBackupFileSelectionAdapter,
} from "./disabled-file-selection-adapter";

// PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1

describe("disabled backup file selection adapter", () => {
  it("blocks opening a picker", () => {
    const adapter = createDisabledBackupFileSelectionAdapter();

    expect(adapter.canOpenFilePicker).toBe(false);
    expect(adapter.openFilePicker().blocked).toBe(true);
  });

  it("blocks reading a selected file", () => {
    const adapter = createDisabledBackupFileSelectionAdapter();

    expect(adapter.canReadFile).toBe(false);
    expect(adapter.readSelectedFile().blocked).toBe(true);
  });

  it("summarizes safely", () => {
    const adapter = assertBackupFileSelectionDisabled(createDisabledBackupFileSelectionAdapter());
    const summary = summarizeBackupFileSelectionAdapter(adapter);

    expect(summary.canOpenFilePicker).toBe(false);
    expect(summary.canReadFile).toBe(false);
    expect(summary.futureUiOnly).toBe(true);
  });
});
