import { runLocalDataBackupValidationPipeline } from "./backup-validation-pipeline";
import { buildImportRestoreDataLossWarnings } from "./import-restore-data-loss-warning";
import { buildImportRestoreDecisionReport } from "./import-restore-decision-report";
import { buildImportRestoreDisabledActions } from "./import-restore-disabled-actions";
import { buildLocalDataImportRestoreReviewModel } from "./import-restore-review-model";
import { buildImportRestoreReviewViewModel } from "./import-restore-view-model";
import { buildUxDataLossDecisionPacket } from "./ux-data-loss-decision-packet";
import {
  buildSyntheticImportRestoreFixtureSelector,
  type SyntheticImportRestoreFixtureSelector,
} from "./synthetic-fixture-selector";
import {
  getLocalDataSyntheticBackupCorpusCase,
  type LocalDataSyntheticBackupCorpusCaseId,
} from "./synthetic-backup-corpus";
import {
  evaluateHiddenImportRestoreUiShellFlag,
  summarizeHiddenImportRestoreUiShellFlag,
  type HiddenImportRestoreUiShellFlag,
  type HiddenImportRestoreUiShellFlagInput,
} from "./hidden-ui-shell-flag";

// PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1

export interface HiddenImportRestoreUiShellHarnessProps {
  marker: "PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1";
  generatedAt: string;
  flag: HiddenImportRestoreUiShellFlag;
  fixtureSelector: SyntheticImportRestoreFixtureSelector;
  viewModel: ReturnType<typeof buildImportRestoreReviewViewModel>;
  decisionPacket: ReturnType<typeof buildUxDataLossDecisionPacket>;
  decisionReport: ReturnType<typeof buildImportRestoreDecisionReport>;
  warnings: ReturnType<typeof buildImportRestoreDataLossWarnings>;
  actionBar: ReturnType<typeof buildImportRestoreDisabledActions>;
  hidden: true;
  routelessOnly: true;
  routeAllowed: false;
  navigationAllowed: false;
  filePickerAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

export interface HiddenImportRestoreUiShellRenderModel {
  marker: "PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1";
  generatedAt: string;
  flagSummary: ReturnType<typeof summarizeHiddenImportRestoreUiShellFlag>;
  selectedFixtureId?: LocalDataSyntheticBackupCorpusCaseId;
  panelMarkers: string[];
  disabledActionIds: string[];
  nextSteps: string[];
  hidden: true;
  routelessOnly: true;
  routeAllowed: false;
  navigationAllowed: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

export interface HiddenImportRestoreUiShellHarnessSummary {
  selectedFixtureId?: LocalDataSyntheticBackupCorpusCaseId;
  flagStatus: HiddenImportRestoreUiShellFlag["status"];
  panelCount: number;
  disabledActions: number;
  hidden: true;
  routelessOnly: true;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

function buildViewModelForFixture(fixtureId: LocalDataSyntheticBackupCorpusCaseId, generatedAt: string) {
  const fixture = getLocalDataSyntheticBackupCorpusCase(fixtureId);
  const validation = runLocalDataBackupValidationPipeline(
    fixture.currentData,
    {
      fileName: `${fixture.id}.json`,
      mimeType: "application/json",
      byteLength: JSON.stringify(fixture.backupData).length,
      parsedObject: fixture.backupData,
    },
    { validatedAt: generatedAt },
  );
  const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
  return {
    reviewModel,
    viewModel: buildImportRestoreReviewViewModel(reviewModel),
  };
}

export function buildHiddenImportRestoreUiShellHarnessProps(
  input: {
    selectedFixtureId?: LocalDataSyntheticBackupCorpusCaseId;
    flagInput?: HiddenImportRestoreUiShellFlagInput;
    generatedAt?: string;
  } = {},
): HiddenImportRestoreUiShellHarnessProps {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const selectedFixtureId = input.selectedFixtureId ?? "SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP";
  const flag = evaluateHiddenImportRestoreUiShellFlag({
    generatedAt,
    envLike: input.flagInput?.envLike,
    runtime: input.flagInput?.runtime ?? "test",
  });
  const fixtureSelector = buildSyntheticImportRestoreFixtureSelector({ selectedId: selectedFixtureId, generatedAt });
  const { reviewModel, viewModel } = buildViewModelForFixture(selectedFixtureId, generatedAt);
  const actionBar = buildImportRestoreDisabledActions({ reviewModel, generatedAt });

  return {
    marker: "PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1",
    generatedAt,
    flag,
    fixtureSelector,
    viewModel,
    decisionPacket: buildUxDataLossDecisionPacket({ generatedAt }),
    decisionReport: buildImportRestoreDecisionReport({ clock: () => generatedAt }),
    warnings: buildImportRestoreDataLossWarnings({ generatedAt }),
    actionBar,
    hidden: true,
    routelessOnly: true,
    routeAllowed: false,
    navigationAllowed: false,
    filePickerAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    rawDataIncluded: false,
    safe: true,
  };
}

export function renderHiddenImportRestoreUiShellModel(
  props: HiddenImportRestoreUiShellHarnessProps,
): HiddenImportRestoreUiShellRenderModel {
  return {
    marker: "PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1",
    generatedAt: props.generatedAt,
    flagSummary: summarizeHiddenImportRestoreUiShellFlag(props.flag),
    selectedFixtureId: props.fixtureSelector.selectedId,
    panelMarkers: [
      "PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1",
      "PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1",
      "PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1",
      "PHASE2D86_IMPORT_RESTORE_DECISION_PACKET_PANEL_COMPOSITION_V1",
      "PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1",
    ],
    disabledActionIds: props.actionBar.actions.map((entry) => entry.id),
    nextSteps: [...props.decisionReport.nextSteps],
    hidden: true,
    routelessOnly: true,
    routeAllowed: false,
    navigationAllowed: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    rawDataIncluded: false,
    safe: true,
  };
}

export function summarizeHiddenImportRestoreUiShellHarness(
  props: HiddenImportRestoreUiShellHarnessProps,
): HiddenImportRestoreUiShellHarnessSummary {
  const model = renderHiddenImportRestoreUiShellModel(props);
  return {
    selectedFixtureId: model.selectedFixtureId,
    flagStatus: model.flagSummary.status,
    panelCount: model.panelMarkers.length,
    disabledActions: model.disabledActionIds.length,
    hidden: true,
    routelessOnly: true,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
