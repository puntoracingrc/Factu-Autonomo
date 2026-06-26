import type { SyntheticFixtureKind } from "../verifactu-synthetic-fixtures/types";
import type { OfficialMappingErrorCode } from "./errors";

export type OfficialArtifactStatus =
  | "verified"
  | "pending_version"
  | "pending_artifact"
  | "blocked";

export type OfficialArtifactUsage =
  | "technical_reference_only"
  | "field_mapping_reference"
  | "schema_reference_not_committed"
  | "validation_reference_only"
  | "hash_reference_only";

export interface OfficialArtifactManifestEntry {
  readonly artifactId: string;
  readonly url: string;
  readonly domain: string;
  readonly consultedAt: string;
  readonly version: string;
  readonly contentType: string;
  readonly sha256: string;
  readonly status: OfficialArtifactStatus;
  readonly usage: OfficialArtifactUsage;
  readonly localFixturePath: string | null;
  readonly notes: string;
}

export type OfficialFieldMappingStatus =
  | "verified"
  | "pending"
  | "not_applicable"
  | "blocked";

export type OfficialRequiredness = "required" | "optional" | "conditional";

export type OfficialRecordKind = "registro_alta" | "registro_anulacion";

export interface OfficialFieldMapping {
  readonly internalPath: string;
  readonly officialPath: string;
  readonly recordKind: OfficialRecordKind;
  readonly artifactId: string;
  readonly requiredness: OfficialRequiredness;
  readonly transformation: string;
  readonly mappingStatus: OfficialFieldMappingStatus;
  readonly notes: string;
  readonly evidenceReference: string;
}

export interface OfficialAlignedCandidateModel {
  readonly descriptorId: string;
  readonly sourceKind: Extract<
    SyntheticFixtureKind,
    "alta_basic" | "chain_first" | "chain_second" | "cancel_basic"
  >;
  readonly recordKind: OfficialRecordKind;
  readonly syntheticOnly: true;
  readonly finality: "candidate_not_aeat";
  readonly transportable: false;
  readonly artifactIds: readonly string[];
  readonly fieldValues: readonly {
    readonly officialPath: string;
    readonly value: string;
    readonly mappingStatus: "verified";
  }[];
}

export interface OfficialMappingError {
  readonly code: OfficialMappingErrorCode;
  readonly message: string;
  readonly descriptorId?: string;
  readonly kind?: SyntheticFixtureKind;
  readonly path?: string;
}

export type OfficialAlignedMappingResult =
  | {
      readonly status: "mapped";
      readonly model: OfficialAlignedCandidateModel;
      readonly errors: [];
    }
  | {
      readonly status: "rejected";
      readonly descriptorId?: string;
      readonly kind?: SyntheticFixtureKind;
      readonly syntheticOnly: true;
      readonly finality: "candidate_not_aeat";
      readonly transportable: false;
      readonly errors: readonly OfficialMappingError[];
    };
