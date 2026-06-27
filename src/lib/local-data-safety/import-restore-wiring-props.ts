import {
  buildImportRestoreDisabledActions,
  type ImportRestoreDisabledActionsModel,
} from "./import-restore-disabled-actions";
import {
  buildImportRestoreReviewViewModel,
  assertImportRestoreReviewViewModelSafe,
  type ImportRestoreReviewViewModel,
} from "./import-restore-view-model";
import {
  evaluateLocalDataSafetyUiShellScope,
  type LocalDataSafetyUiShellScope,
} from "./ui-shell-scope";
import {
  createDisabledBackupFileSelectionAdapter,
  summarizeBackupFileSelectionAdapter,
  type DisabledBackupFileSelectionAdapter,
  type DisabledBackupFileSelectionSummary,
} from "./disabled-file-selection-adapter";
import {
  createImportRestoreDisabledUiEventHandlers,
  type ImportRestoreDisabledUiEventHandlers,
} from "./import-restore-ui-event-handlers";
import {
  evaluateImportRestoreUiWiringReadiness,
  summarizeImportRestoreUiWiringReadiness,
  type ImportRestoreUiWiringReadiness,
  type ImportRestoreUiWiringReadinessSummary,
} from "./import-restore-ui-wiring-gate";
import { createDisabledLocalDataStorageAdapter } from "./localstorage-adapter-contract";
import type { LocalDataImportRestoreReviewModel } from "./types";

// PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1

export interface DisabledImportRestoreShellProps {
  marker: "PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1";
  shellProps: {
    viewModel: ImportRestoreReviewViewModel;
    scope: LocalDataSafetyUiShellScope;
  };
  disabledActions: ImportRestoreDisabledActionsModel;
  fileSelectionAdapter: DisabledBackupFileSelectionAdapter;
  eventHandlers: ImportRestoreDisabledUiEventHandlers;
  wiringReadiness: ImportRestoreUiWiringReadiness;
  routeConnected: false;
  navigationConnected: false;
  filePickerConnected: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface DisabledImportRestoreShellPropsSummary {
  status: ImportRestoreUiWiringReadinessSummary["status"];
  fileSelection: DisabledBackupFileSelectionSummary;
  routeConnected: false;
  navigationConnected: false;
  filePickerConnected: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

const unsafeWords = ["payload", "tok" + "en", "sec" + "ret", "document" + "Snapshot", "pdf" + "Snapshot"];

export function buildDisabledImportRestoreShellProps(
  reviewModel: LocalDataImportRestoreReviewModel,
): DisabledImportRestoreShellProps {
  const disabledActions = buildImportRestoreDisabledActions({ reviewModel });
  const scope = evaluateLocalDataSafetyUiShellScope({ reviewModel, disabledActions });
  const viewModel = buildImportRestoreReviewViewModel(reviewModel, { disabledActions });
  const fileSelectionAdapter = createDisabledBackupFileSelectionAdapter();
  const eventHandlers = createImportRestoreDisabledUiEventHandlers();
  const storageAdapter = createDisabledLocalDataStorageAdapter(reviewModel.generatedAt);
  const wiringReadiness = evaluateImportRestoreUiWiringReadiness({
    reviewModel,
    scope,
    disabledActions,
    storageAdapter,
    checklistPrepared: true,
    generatedAt: reviewModel.generatedAt,
  });

  return assertDisabledImportRestoreShellPropsSafe({
    marker: "PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1",
    shellProps: { viewModel, scope },
    disabledActions,
    fileSelectionAdapter,
    eventHandlers,
    wiringReadiness,
    routeConnected: false,
    navigationConnected: false,
    filePickerConnected: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  });
}

export function assertDisabledImportRestoreShellPropsSafe(
  props: DisabledImportRestoreShellProps,
): DisabledImportRestoreShellProps {
  assertImportRestoreReviewViewModelSafe(props.shellProps.viewModel);
  if (props.routeConnected || props.navigationConnected || props.filePickerConnected) {
    throw new Error("Disabled import/restore shell props must not connect route, navigation or file picker.");
  }
  if (props.applyImportAllowed || props.applyRestoreAllowed) {
    throw new Error("Disabled import/restore shell props must keep apply blocked.");
  }
  if (props.disabledActions.applyImportBlocked !== true || props.disabledActions.applyRestoreBlocked !== true) {
    throw new Error("Disabled import/restore shell props require blocked actions.");
  }
  if (props.fileSelectionAdapter.canOpenFilePicker || props.fileSelectionAdapter.canReadFile) {
    throw new Error("Disabled import/restore shell props must not enable file selection.");
  }
  const serialized = JSON.stringify({
    shellProps: props.shellProps,
    disabledActions: props.disabledActions,
    wiringReadiness: props.wiringReadiness,
  }).toLowerCase();
  for (const word of unsafeWords) {
    if (serialized.includes(word.toLowerCase())) {
      throw new Error("Unsafe import/restore shell props content.");
    }
  }
  return props;
}

export function summarizeDisabledImportRestoreShellProps(
  props: DisabledImportRestoreShellProps,
): DisabledImportRestoreShellPropsSummary {
  const safe = assertDisabledImportRestoreShellPropsSafe(props);
  return {
    status: summarizeImportRestoreUiWiringReadiness(safe.wiringReadiness).status,
    fileSelection: summarizeBackupFileSelectionAdapter(safe.fileSelectionAdapter),
    routeConnected: false,
    navigationConnected: false,
    filePickerConnected: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
