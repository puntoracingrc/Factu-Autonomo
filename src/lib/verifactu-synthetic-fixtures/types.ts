import type { SyntheticFixturePolicyErrorCode } from "./errors";

export const SYNTHETIC_FIXTURE_KINDS = [
  "alta_basic",
  "alta_rectificativa_candidate",
  "alta_subsanacion_candidate",
  "alta_invalid_nif",
  "alta_invalid_date",
  "alta_missing_series_number",
  "alta_hash_mismatch",
  "chain_first",
  "chain_second",
  "cancel_basic",
  "cancel_missing_invoice",
  "cancel_previous_hash_mismatch",
  "canonicalization_error",
  "pending_conditional_fields",
] as const;

export type SyntheticFixtureKind = (typeof SYNTHETIC_FIXTURE_KINDS)[number];

export type SyntheticFixtureValidationStatus = "accepted" | "rejected";

export type SyntheticFixtureRiskFlag =
  | "non_synthetic_identifier"
  | "non_synthetic_marker"
  | "unknown_fixture_kind"
  | "empty_purpose"
  | "unsupported_source_phase"
  | "unsafe_metadata"
  | "xml_material"
  | "certificate_material"
  | "aeat_endpoint"
  | "secret_material"
  | "transport_material"
  | "real_data_material";

export type SyntheticFixtureMetadataValue =
  | string
  | number
  | boolean
  | null
  | SyntheticFixtureMetadataValue[]
  | { readonly [key: string]: SyntheticFixtureMetadataValue };

export interface SyntheticFixtureDescriptor {
  readonly id: string;
  readonly kind: SyntheticFixtureKind;
  readonly purpose: string;
  readonly syntheticOnly: true;
  readonly sourcePhase: string;
  readonly expectedFutureValidations: readonly string[];
  readonly blockedUntil?: string;
  readonly riskNotes?: readonly string[];
  readonly metadata?: Record<string, SyntheticFixtureMetadataValue>;
}

export interface SyntheticFixturePolicyError {
  readonly code: SyntheticFixturePolicyErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly riskFlag: SyntheticFixtureRiskFlag;
}

export type SyntheticFixturePolicyWarningCode =
  | "descriptor_has_no_blocked_until"
  | "descriptor_has_risk_notes";

export interface SyntheticFixturePolicyWarning {
  readonly code: SyntheticFixturePolicyWarningCode;
  readonly message: string;
  readonly path?: string;
}

export type SyntheticFixtureValidationResult =
  | {
      readonly status: "accepted";
      readonly descriptor: SyntheticFixtureDescriptor;
      readonly errors: [];
      readonly warnings: SyntheticFixturePolicyWarning[];
    }
  | {
      readonly status: "rejected";
      readonly errors: SyntheticFixturePolicyError[];
      readonly warnings: SyntheticFixturePolicyWarning[];
    };
