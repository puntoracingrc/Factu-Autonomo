import {
  OFFICIAL_ARTIFACT_MANIFEST,
  type OfficialArtifactManifestEntry,
} from "../verifactu-official-alignment";
import {
  OFFICIAL_GATE_BLOCKER_MESSAGES,
  type OfficialGateBlocker,
} from "./errors";
import type {
  OfficialArtifactIntakeGateInput,
  OfficialArtifactIntakeGateResult,
  OfficialArtifactRequirement,
  OfficialArtifactSafeSummary,
} from "./types";

export const PHASE2B7L_ARTIFACT_INTAKE_GATE_MARKER =
  "PHASE2B7L_OFFICIAL_ARTIFACT_INTAKE_GATE_V1";

const ALLOWED_XSD_FIXTURE_DIR =
  "test/fixtures/verifactu-official-artifacts/xsd/" as const;

export const DEFAULT_OFFICIAL_ARTIFACT_REQUIREMENTS = [
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    requiredExtension: ".xsd",
    allowedFixtureDir: ALLOWED_XSD_FIXTURE_DIR,
    importGraphVerified: false,
    downloadedWithoutClientCertificate: false,
  },
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
    requiredExtension: ".xsd",
    allowedFixtureDir: ALLOWED_XSD_FIXTURE_DIR,
    importGraphVerified: false,
    downloadedWithoutClientCertificate: false,
  },
] as const satisfies readonly OfficialArtifactRequirement[];

function uniqueBlockers(blockers: readonly OfficialGateBlocker[]): readonly OfficialGateBlocker[] {
  return [...new Set(blockers)];
}

function findArtifact(
  manifest: readonly OfficialArtifactManifestEntry[],
  artifactId: string,
): OfficialArtifactManifestEntry | undefined {
  return manifest.find((artifact) => artifact.artifactId === artifactId);
}

function fixturePathIsAllowed(
  fixturePath: string | null,
  requirement: OfficialArtifactRequirement,
): boolean {
  return fixturePath === null || fixturePath.startsWith(requirement.allowedFixtureDir);
}

function fixtureExtensionIsAllowed(
  fixturePath: string | null,
  requirement: OfficialArtifactRequirement,
): boolean {
  return fixturePath === null || fixturePath.endsWith(requirement.requiredExtension);
}

function checksumIsLocallyVerifiable(
  artifact: OfficialArtifactManifestEntry | undefined,
  verifiedChecksums: Readonly<Record<string, string>> | undefined,
): boolean {
  if (!artifact?.localFixturePath) return false;
  return verifiedChecksums?.[artifact.artifactId] === artifact.sha256;
}

export function evaluateOfficialArtifactIntakeGate(
  input: OfficialArtifactIntakeGateInput = {},
): OfficialArtifactIntakeGateResult {
  const manifest = input.manifest ?? OFFICIAL_ARTIFACT_MANIFEST;
  const requirements = input.requirements ?? DEFAULT_OFFICIAL_ARTIFACT_REQUIREMENTS;
  const blockers: OfficialGateBlocker[] = [];

  const safeArtifactSummary: OfficialArtifactSafeSummary[] = requirements.map(
    (requirement) => {
      const artifact = findArtifact(manifest, requirement.artifactId);
      const fixturePath = artifact?.localFixturePath ?? null;
      const checksumRegistered = Boolean(artifact?.sha256);
      const localFixtureAvailable = fixturePath !== null;
      const checksumLocallyVerifiable = checksumIsLocallyVerifiable(
        artifact,
        input.locallyVerifiedSha256ByArtifactId,
      );

      if (!artifact || !localFixtureAvailable) blockers.push("BLOCKED_XSD_NOT_COMMITTED");
      if (!checksumLocallyVerifiable) blockers.push("BLOCKED_XSD_CHECKSUM_NOT_VERIFIABLE");
      if (!requirement.importGraphVerified) {
        blockers.push("BLOCKED_XSD_IMPORT_GRAPH_NOT_VERIFIED");
      }
      if (!fixturePathIsAllowed(fixturePath, requirement)) {
        blockers.push("BLOCKED_XSD_FIXTURE_PATH_OUTSIDE_ALLOWED_DIR");
      }
      if (!fixtureExtensionIsAllowed(fixturePath, requirement)) {
        blockers.push("BLOCKED_XSD_FIXTURE_EXTENSION_FORBIDDEN");
      }

      return {
        artifactId: requirement.artifactId,
        domain: artifact?.domain ?? "missing-official-artifact",
        version: artifact?.version ?? "missing-version",
        checksumRegistered,
        localFixtureAvailable,
        checksumLocallyVerifiable,
        importGraphVerified: requirement.importGraphVerified,
        downloadedWithoutClientCertificate:
          requirement.downloadedWithoutClientCertificate,
      };
    },
  );

  const unique = uniqueBlockers(blockers);

  return {
    marker: PHASE2B7L_ARTIFACT_INTAKE_GATE_MARKER,
    status: unique.length > 0 ? "blocked" : "ready",
    blockers: unique,
    safeArtifactSummary,
    canUseOfflineXsdFixtures: safeArtifactSummary.every(
      (summary) => summary.localFixtureAvailable,
    ),
    canVerifyLocalChecksums: safeArtifactSummary.every(
      (summary) => summary.checksumLocallyVerifiable,
    ),
    canTrustImportGraphOffline: safeArtifactSummary.every(
      (summary) => summary.importGraphVerified,
    ),
    pdfsOrXlsxCommitted: false,
    networkUsed: false,
    certificatesUsed: false,
    errors: unique.map((blocker) => ({
      code: "OFFICIAL_ARTIFACT_INTAKE_BLOCKED",
      blocker,
      message: OFFICIAL_GATE_BLOCKER_MESSAGES[blocker],
    })),
  };
}
