import type {
  OfficialArtifactManifestEntry,
  OfficialFieldMapping,
  OfficialSafeSyntheticDataCatalogEntry,
} from "../verifactu-official-alignment";
import type { OfficialGateBlocker, OfficialGateErrorCode } from "./errors";

export type OfficialArtifactGateStatus =
  | "ready"
  | "blocked"
  | "pending"
  | "not_applicable";

export interface OfficialArtifactRequirement {
  readonly artifactId: string;
  readonly requiredExtension: ".xsd";
  readonly allowedFixtureDir: "test/fixtures/verifactu-official-artifacts/xsd/";
  readonly importGraphVerified: boolean;
  readonly downloadedWithoutClientCertificate: boolean;
}

export interface OfficialArtifactIntakeGateInput {
  readonly manifest?: readonly OfficialArtifactManifestEntry[];
  readonly requirements?: readonly OfficialArtifactRequirement[];
  readonly locallyVerifiedSha256ByArtifactId?: Readonly<Record<string, string>>;
}

export interface OfficialArtifactSafeSummary {
  readonly artifactId: string;
  readonly domain: string;
  readonly version: string;
  readonly checksumRegistered: boolean;
  readonly localFixtureAvailable: boolean;
  readonly checksumLocallyVerifiable: boolean;
  readonly importGraphVerified: boolean;
  readonly downloadedWithoutClientCertificate: boolean;
}

export interface OfficialArtifactIntakeGateResult {
  readonly marker: "PHASE2B7L_OFFICIAL_ARTIFACT_INTAKE_GATE_V1";
  readonly status: OfficialArtifactGateStatus;
  readonly blockers: readonly OfficialGateBlocker[];
  readonly safeArtifactSummary: readonly OfficialArtifactSafeSummary[];
  readonly canUseOfflineXsdFixtures: boolean;
  readonly canVerifyLocalChecksums: boolean;
  readonly canTrustImportGraphOffline: boolean;
  readonly pdfsOrXlsxCommitted: false;
  readonly networkUsed: false;
  readonly certificatesUsed: false;
  readonly errors: readonly {
    readonly code: OfficialGateErrorCode;
    readonly blocker: OfficialGateBlocker;
    readonly message: string;
  }[];
}

export type OfflineXsdValidatorStatus = "ready" | "blocked";

export type OfflineXsdValidatorBlocker =
  | "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR"
  | "BLOCKED_XSD_NOT_COMMITTED";

export interface OfflineXsdValidatorCapabilities {
  readonly canValidateOffline: boolean;
  readonly usesNetwork: false;
  readonly usesJava: false;
  readonly usesNativeBinary: false;
  readonly printsXml: false;
}

export interface OfflineXsdValidationInput {
  readonly xml: string;
  readonly schemaArtifactId: string;
  readonly syntheticOnly: true;
}

export type OfflineXsdValidationResult =
  | {
      readonly status: "accepted";
      readonly accepted: true;
      readonly errors: [];
    }
  | {
      readonly status: "blocked";
      readonly accepted: false;
      readonly blockers: readonly OfflineXsdValidatorBlocker[];
      readonly errors: readonly {
        readonly code: "OFFLINE_XSD_VALIDATOR_BLOCKED";
        readonly blocker: OfflineXsdValidatorBlocker;
        readonly message: string;
      }[];
    };

export interface OfflineXsdValidatorAdapter {
  readonly marker: "PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_V1";
  readonly status: OfflineXsdValidatorStatus;
  readonly capabilities: OfflineXsdValidatorCapabilities;
  readonly blockers: readonly OfflineXsdValidatorBlocker[];
  readonly validate: (
    input: OfflineXsdValidationInput,
  ) => OfflineXsdValidationResult;
}

export interface OfficialAlignedXmlPreflightResult {
  readonly marker: "PHASE2B7N_OFFICIAL_ALIGNED_XML_PREFLIGHT_GATE_V1";
  readonly status: "blocked" | "ready";
  readonly blockers: readonly OfficialGateBlocker[];
  readonly canSerializeOfficialAlignedXml: boolean;
  readonly canValidateOfflineXsd: boolean;
  readonly canProceedToQr: boolean;
  readonly canProceedToSignature: boolean;
  readonly canProceedToTransport: boolean;
  readonly artifactGate: OfficialArtifactIntakeGateResult;
  readonly validatorStatus: OfflineXsdValidatorStatus;
  readonly syntheticDataReady: boolean;
  readonly mappingReady: boolean;
  readonly mappingSummary: {
    readonly total: number;
    readonly ready: number;
    readonly pending: number;
    readonly blocked: number;
  };
  readonly networkUsed: false;
  readonly supabaseUsed: false;
  readonly transportUsed: false;
  readonly xmlPrinted: false;
}

export interface OfficialAlignedXmlPreflightInput {
  readonly artifactGate?: OfficialArtifactIntakeGateResult;
  readonly validator?: OfflineXsdValidatorAdapter;
  readonly syntheticDataGate?: {
    readonly usableForXml: boolean;
    readonly completeAltaCaseAvailable: boolean;
    readonly completeAnulacionCaseAvailable: boolean;
    readonly blocker: OfficialGateBlocker;
  };
  readonly syntheticDataCatalog?: readonly OfficialSafeSyntheticDataCatalogEntry[];
  readonly mappings?: readonly OfficialFieldMapping[];
}

export interface OfficialAlignmentBlockerReport {
  readonly marker: "PHASE2B7O_OFFICIAL_ALIGNMENT_BLOCKER_REPORT_V1";
  readonly generatedAt: string;
  readonly status: "blocked";
  readonly blockers: readonly OfficialGateBlocker[];
  readonly safeArtifactSummary: readonly OfficialArtifactSafeSummary[];
  readonly nextRequiredDecisions: readonly string[];
  readonly canProceed: {
    readonly officialAlignedXml: false;
    readonly offlineXsdValidation: false;
    readonly qr: false;
    readonly signature: false;
    readonly transport: false;
    readonly production: false;
  };
  readonly finality: "internal_blocker_report";
  readonly containsXml: false;
  readonly containsSecrets: false;
  readonly containsRealData: false;
}
