import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type { AppData } from "@/lib/types";
import {
  applyLegacyImportRepair,
  type LegacyImportRepairApplyResult,
  type LegacyImportRepairPreview,
} from "./legacy-import-attestation";

type DomainBlockedResult = Extract<
  LegacyImportRepairApplyResult,
  { status: "blocked" }
>;

export interface AppliedLegacyImportRepair {
  appliedDocumentIds: string[];
  appliedRelationshipGroupFingerprints: string[];
}

export type DurableLegacyImportRepairResult =
  AppDataDurabilityResult<AppliedLegacyImportRepair> | DomainBlockedResult;

type DurableCommit = <T>(
  expected: AppData,
  build: (previous: AppData) => { data: AppData; value: T },
) => AppDataDurabilityResult<T>;

/**
 * Adapta la transición pura de atestación al único commit durable de AppStore.
 * No publica memoria por sí misma y no tiene rutas de persistencia alternativas.
 */
export function runLegacyImportRepairCommand(input: {
  expected: AppData;
  preview: LegacyImportRepairPreview;
  now: string;
  commit: DurableCommit;
}): DurableLegacyImportRepairResult {
  const transition = applyLegacyImportRepair(
    input.expected,
    input.preview,
    input.now,
  );
  if (transition.status === "blocked") return transition;

  return input.commit(input.expected, () => ({
    data: transition.data,
    value: {
      appliedDocumentIds: transition.appliedDocumentIds,
      appliedRelationshipGroupFingerprints:
        transition.appliedRelationshipGroupFingerprints,
    },
  }));
}
