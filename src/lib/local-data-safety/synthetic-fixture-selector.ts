import {
  listLocalDataSyntheticBackupCorpusCases,
  summarizeLocalDataSyntheticBackupCorpusCase,
  type LocalDataSyntheticBackupCorpusCaseId,
} from "./synthetic-backup-corpus";

// PHASE2D83_SYNTHETIC_IMPORT_RESTORE_FIXTURE_SELECTOR_MODEL_V1

export interface SyntheticImportRestoreFixtureSelectorItem {
  id: LocalDataSyntheticBackupCorpusCaseId;
  label: string;
  riskProfile: "low" | "manual_review" | "blocked";
  manualReviewRequired: boolean;
  selected: boolean;
  safeSummary: ReturnType<typeof summarizeLocalDataSyntheticBackupCorpusCase>;
}

export interface SyntheticImportRestoreFixtureSelector {
  marker: "PHASE2D83_SYNTHETIC_IMPORT_RESTORE_FIXTURE_SELECTOR_MODEL_V1";
  generatedAt: string;
  items: SyntheticImportRestoreFixtureSelectorItem[];
  selectedId?: LocalDataSyntheticBackupCorpusCaseId;
  rejectedReason?: string;
  filePickerAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

export interface SyntheticImportRestoreFixtureSelectorSummary {
  totalFixtures: number;
  selectedId?: LocalDataSyntheticBackupCorpusCaseId;
  rejected: boolean;
  filePickerAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

function isSyntheticFixtureId(value: string): value is LocalDataSyntheticBackupCorpusCaseId {
  return value.startsWith("SYNTHETIC_ONLY_");
}

export function buildSyntheticImportRestoreFixtureSelector(
  input: { selectedId?: string; generatedAt?: string } = {},
): SyntheticImportRestoreFixtureSelector {
  const cases = listLocalDataSyntheticBackupCorpusCases();
  let selectedId: LocalDataSyntheticBackupCorpusCaseId | undefined;
  let rejectedReason: string | undefined;

  if (input.selectedId !== undefined && !isSyntheticFixtureId(input.selectedId)) {
    rejectedReason = "Only synthetic fixture ids are allowed.";
  } else if (input.selectedId !== undefined && !cases.some((entry) => entry.id === input.selectedId)) {
    rejectedReason = "Synthetic fixture id is unknown.";
  } else {
    selectedId = input.selectedId as LocalDataSyntheticBackupCorpusCaseId | undefined;
  }

  return {
    marker: "PHASE2D83_SYNTHETIC_IMPORT_RESTORE_FIXTURE_SELECTOR_MODEL_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    items: cases.map((entry) => ({
      id: entry.id,
      label: entry.title,
      riskProfile: entry.expectedRiskProfile,
      manualReviewRequired: entry.expectedManualReview,
      selected: entry.id === selectedId,
      safeSummary: summarizeLocalDataSyntheticBackupCorpusCase(entry),
    })),
    selectedId,
    rejectedReason,
    filePickerAllowed: false,
    rawDataIncluded: false,
    safe: true,
  };
}

export function selectSyntheticImportRestoreFixture(
  selector: SyntheticImportRestoreFixtureSelector,
  fixtureId: string,
): SyntheticImportRestoreFixtureSelector {
  return buildSyntheticImportRestoreFixtureSelector({
    selectedId: fixtureId,
    generatedAt: selector.generatedAt,
  });
}

export function summarizeSyntheticImportRestoreFixtureSelector(
  selector: SyntheticImportRestoreFixtureSelector,
): SyntheticImportRestoreFixtureSelectorSummary {
  return {
    totalFixtures: selector.items.length,
    selectedId: selector.selectedId,
    rejected: Boolean(selector.rejectedReason),
    filePickerAllowed: false,
    rawDataIncluded: false,
    safe: true,
  };
}
