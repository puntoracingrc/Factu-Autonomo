import path from "node:path";
import {
  OFFICIAL_SAFE_SYNTHETIC_DATA_GATE,
} from "../verifactu-official-alignment";
import { createBlockedOfflineXsdValidator } from "../verifactu-official-gates";
import type { LocalArtifactInspectionBlocker } from "./errors";
import {
  DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS,
  inspectLocalOfficialArtifactSet,
} from "./local-artifact-intake";
import { computeLocalArtifactSha256 } from "./local-xsd-checksum";
import { inspectLocalXsdImportGraph } from "./local-xsd-import-graph";
import type {
  LocalOfficialArtifactCandidate,
  LocalOfficialArtifactIntakeInput,
  OfficialArtifactReadinessReport,
} from "./types";

export const PHASE2B7S_READINESS_REPORT_MARKER =
  "PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1";

export interface BuildOfficialArtifactReadinessReportInput
  extends LocalOfficialArtifactIntakeInput {
  readonly generatedAt?: string;
}

function uniqueBlockers(
  blockers: readonly LocalArtifactInspectionBlocker[],
): readonly LocalArtifactInspectionBlocker[] {
  return [...new Set(blockers)];
}

function localFileForArtifact(
  baseDirectory: string,
  artifact: LocalOfficialArtifactCandidate,
): string {
  return path.join(baseDirectory, artifact.expectedFileName);
}

export function buildOfficialArtifactReadinessReport(
  input: BuildOfficialArtifactReadinessReportInput = {},
): OfficialArtifactReadinessReport {
  const intake = inspectLocalOfficialArtifactSet(input);
  const blockers: LocalArtifactInspectionBlocker[] = [...intake.blockers];
  let checksumStatus: OfficialArtifactReadinessReport["checksumStatus"] =
    input.baseDirectory ? "ready" : "not_checked";
  let importGraphStatus: OfficialArtifactReadinessReport["importGraphStatus"] =
    input.baseDirectory ? "ready" : "not_checked";

  if (input.baseDirectory) {
    const requiredArtifacts =
      input.requiredArtifacts ??
      DEFAULT_LOCAL_REQUIRED_XSD_ARTIFACTS;
    const baseDirectory = path.resolve(input.baseDirectory);

    for (const artifact of requiredArtifacts) {
      const filePath = localFileForArtifact(baseDirectory, artifact);
      const checksum = computeLocalArtifactSha256({ filePath });
      if (checksum.status !== "ready") {
        checksumStatus = "blocked";
        blockers.push(...checksum.blockers);
      } else if (artifact.expectedSha256 && checksum.sha256 !== artifact.expectedSha256) {
        checksumStatus = "blocked";
        blockers.push("BLOCKED_LOCAL_ARTIFACT_CHECKSUM_MISMATCH");
      }

      const graph = inspectLocalXsdImportGraph({ filePath, baseDirectory });
      if (graph.status !== "ready") {
        importGraphStatus = "blocked";
        blockers.push(...graph.blockers);
        if (graph.blockers.length > 0) blockers.push("BLOCKED_LOCAL_XSD_GRAPH_NOT_READY");
      }
    }
  }

  const validator = createBlockedOfflineXsdValidator();
  if (validator.status === "blocked") {
    blockers.push("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR");
  }
  if (!OFFICIAL_SAFE_SYNTHETIC_DATA_GATE.usableForXml) {
    blockers.push("BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA");
  }

  return {
    marker: PHASE2B7S_READINESS_REPORT_MARKER,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: "blocked",
    blockers: uniqueBlockers(blockers),
    artifactSummaries: intake.safeSummaries,
    checksumStatus,
    importGraphStatus,
    validatorStatus: "blocked",
    syntheticDataStatus: "blocked",
    nextRequiredDecisions: [
      "Obtain official XSD files through a safe manual/offline process.",
      "Decide whether official XSD files can be committed as test fixtures.",
      "Select a reproducible offline XSD validator.",
      "Define a safe official synthetic data strategy.",
    ],
    containsXmlOrXsdContent: false,
    containsSecrets: false,
    networkUsed: false,
    certificatesUsed: false,
  };
}
