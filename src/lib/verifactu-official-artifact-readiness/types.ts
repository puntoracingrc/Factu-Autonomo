import type { OfficialArtifactManifestEntry } from "../verifactu-official-alignment";
import type { LocalArtifactInspectionBlocker } from "./errors";

export type LocalArtifactInspectionStatus = "ready" | "blocked";

export interface LocalOfficialArtifactCandidate {
  readonly artifactId: string;
  readonly expectedFileName: string;
  readonly expectedSha256: string | null;
  readonly requiredExtension: ".xsd";
}

export interface LocalOfficialArtifactIntakeInput {
  readonly baseDirectory?: string;
  readonly manifest?: readonly OfficialArtifactManifestEntry[];
  readonly requiredArtifacts?: readonly LocalOfficialArtifactCandidate[];
  readonly repoRoot?: string;
}

export interface LocalArtifactSafeSummary {
  readonly artifactId: string;
  readonly expectedFileName: string;
  readonly exists: boolean;
  readonly extensionAllowed: boolean;
  readonly checksumExpected: boolean;
}

export interface LocalOfficialArtifactIntakeResult {
  readonly marker: "PHASE2B7Q_LOCAL_OFFICIAL_ARTIFACT_INTAKE_PROTOCOL_V1";
  readonly status: LocalArtifactInspectionStatus;
  readonly blockers: readonly LocalArtifactInspectionBlocker[];
  readonly baseDirectoryProvided: boolean;
  readonly baseDirectoryAllowed: boolean;
  readonly networkUsed: false;
  readonly certificatesUsed: false;
  readonly copiedFilesToRepo: false;
  readonly printedContent: false;
  readonly safeSummaries: readonly LocalArtifactSafeSummary[];
}

export interface LocalArtifactSha256Input {
  readonly filePath: string;
  readonly maxBytes?: number;
}

export type LocalArtifactSha256Result =
  | {
      readonly status: "ready";
      readonly sha256: string;
      readonly byteLength: number;
      readonly safeFileName: string;
      readonly blockers: [];
    }
  | {
      readonly status: "blocked";
      readonly sha256: null;
      readonly byteLength: number | null;
      readonly safeFileName: string;
      readonly blockers: readonly LocalArtifactInspectionBlocker[];
    };

export interface LocalXsdImportGraphInput {
  readonly filePath: string;
  readonly baseDirectory: string;
  readonly maxBytes?: number;
}

export interface LocalXsdDependencySummary {
  readonly kind: "include" | "import";
  readonly schemaLocation: string;
  readonly resolvedSafeName: string | null;
  readonly exists: boolean;
}

export interface LocalXsdImportGraphResult {
  readonly marker: "PHASE2B7R_LOCAL_XSD_CHECKSUM_IMPORT_GRAPH_VERIFIER_V1";
  readonly status: LocalArtifactInspectionStatus;
  readonly safeFileName: string;
  readonly dependencies: readonly LocalXsdDependencySummary[];
  readonly missingDependencies: readonly string[];
  readonly blockedRemoteReferences: readonly string[];
  readonly blockedTraversalReferences: readonly string[];
  readonly checksumAvailable: boolean;
  readonly blockers: readonly LocalArtifactInspectionBlocker[];
  readonly networkUsed: false;
  readonly contentPrinted: false;
}

export interface OfficialArtifactReadinessReport {
  readonly marker: "PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1";
  readonly generatedAt: string;
  readonly status: LocalArtifactInspectionStatus;
  readonly blockers: readonly LocalArtifactInspectionBlocker[];
  readonly artifactSummaries: readonly LocalArtifactSafeSummary[];
  readonly checksumStatus: "not_checked" | "ready" | "blocked";
  readonly importGraphStatus: "not_checked" | "ready" | "blocked";
  readonly validatorStatus: "blocked";
  readonly syntheticDataStatus: "blocked";
  readonly nextRequiredDecisions: readonly string[];
  readonly containsXmlOrXsdContent: false;
  readonly containsSecrets: false;
  readonly networkUsed: false;
  readonly certificatesUsed: false;
}
