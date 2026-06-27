// PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1

export interface DisabledBackupFileSelectionResult {
  marker: "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1";
  action: "open_picker" | "read_file";
  blocked: true;
  reason: "DISABLED_PENDING_EXPLICIT_UI_WIRING_REVIEW";
  safe: true;
}

export interface DisabledBackupFileSelectionSummary {
  marker: "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1";
  canOpenFilePicker: false;
  canReadFile: false;
  futureUiOnly: true;
  safe: true;
}

export interface DisabledBackupFileSelectionAdapter {
  marker: "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1";
  canOpenFilePicker: false;
  canReadFile: false;
  openFilePicker(): DisabledBackupFileSelectionResult;
  readSelectedFile(): DisabledBackupFileSelectionResult;
  summarize(): DisabledBackupFileSelectionSummary;
}

function blockedResult(action: DisabledBackupFileSelectionResult["action"]): DisabledBackupFileSelectionResult {
  return {
    marker: "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1",
    action,
    blocked: true,
    reason: "DISABLED_PENDING_EXPLICIT_UI_WIRING_REVIEW",
    safe: true,
  };
}

export function createDisabledBackupFileSelectionAdapter(): DisabledBackupFileSelectionAdapter {
  return {
    marker: "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1",
    canOpenFilePicker: false,
    canReadFile: false,
    openFilePicker() {
      return blockedResult("open_picker");
    },
    readSelectedFile() {
      return blockedResult("read_file");
    },
    summarize() {
      return {
        marker: "PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1",
        canOpenFilePicker: false,
        canReadFile: false,
        futureUiOnly: true,
        safe: true,
      };
    },
  };
}

export function assertBackupFileSelectionDisabled(
  adapter: DisabledBackupFileSelectionAdapter,
): DisabledBackupFileSelectionAdapter {
  if (adapter.canOpenFilePicker !== false || adapter.canReadFile !== false) {
    throw new Error("Backup file selection adapter must remain disabled.");
  }
  if (!adapter.openFilePicker().blocked || !adapter.readSelectedFile().blocked) {
    throw new Error("Backup file selection actions must remain blocked.");
  }
  return adapter;
}

export function summarizeBackupFileSelectionAdapter(
  adapter: DisabledBackupFileSelectionAdapter,
): DisabledBackupFileSelectionSummary {
  return assertBackupFileSelectionDisabled(adapter).summarize();
}
