export type FiscalModelCode = "036" | "037" | "303";

export type FiscalModelCategory = "CENSUS" | "VAT";

export type FiscalModelLifecycleStatus = "ACTIVE" | "HISTORICAL";

export type FiscalModelAvailability = "METADATA_ONLY" | "HISTORICAL_ONLY";

export type FiscalModelParserLevel = "CATALOG_ONLY";

export type FiscalModelReviewStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type FiscalModelCatalogReleaseStatus = "DRAFT_LOCAL_PREVIEW";

export type FiscalModelSourceAuthority = "AEAT" | "BOE";

export type FiscalModelSourceType =
  | "CATALOG"
  | "PROCEDURE"
  | "GUIDE"
  | "INSTRUCTIONS"
  | "OFFICIAL_NOTICE"
  | "LEGAL_TEXT";

export type FiscalModelSourceVerificationStatus =
  | "HASH_PENDING"
  | "VERIFIED"
  | "CHANGED"
  | "UNAVAILABLE"
  | "REPLACED";

export interface FiscalModelSource {
  readonly id: string;
  readonly authority: FiscalModelSourceAuthority;
  readonly sourceType: FiscalModelSourceType;
  readonly title: string;
  readonly canonicalUrl: string;
  readonly contentVersion: string;
  readonly officialUpdatedAt: string;
  readonly verifiedAt: string;
  readonly contentHash: `sha256:${string}` | null;
  readonly verificationStatus: FiscalModelSourceVerificationStatus;
  readonly reviewStatus: FiscalModelReviewStatus;
}

export interface FiscalModelDefinition {
  readonly code: FiscalModelCode;
  readonly canonicalName: string;
  readonly category: FiscalModelCategory;
  readonly lifecycleStatus: FiscalModelLifecycleStatus;
  readonly availability: FiscalModelAvailability;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly supportedTaxYears: readonly number[];
  readonly parserLevel: FiscalModelParserLevel;
  readonly reviewStatus: FiscalModelReviewStatus;
  readonly contentVersion: string;
  readonly releaseId: string;
  readonly sourceIds: readonly string[];
}

export interface FiscalModelCatalogRelease {
  readonly id: string;
  readonly schemaVersion: string;
  readonly status: FiscalModelCatalogReleaseStatus;
  readonly createdAt: string;
  readonly sourceRegistryVersion: string;
}

export type FiscalModelCoverageStatus =
  | "NO_COVERAGE"
  | "PARTIAL"
  | "CURRENT"
  | "CHANGES_PENDING"
  | "DEGRADED";

export interface FiscalModelCoverageInput {
  readonly taxYear: unknown;
  readonly targetUnits: unknown;
  readonly validatedUnits: unknown;
  readonly pendingCriticalDiffs: unknown;
  readonly degradedUnits: unknown;
  readonly lastSuccessfulSyncAt: unknown;
  readonly lastFiscalReviewAt: unknown;
  readonly calculatedAt: unknown;
  readonly freshnessThresholdMs: unknown;
  readonly sourceVerificationStatuses: unknown;
}

export interface FiscalModelCoverageSnapshot {
  readonly taxYear: number;
  readonly status: FiscalModelCoverageStatus;
  readonly targetUnits: number;
  readonly validatedUnits: number;
  readonly pendingUnits: number;
  readonly pendingCriticalDiffs: number;
  readonly degradedUnits: number;
  readonly lastSuccessfulSyncAt: string | null;
  readonly lastFiscalReviewAt: string | null;
  readonly calculatedAt: string;
  readonly displayMessage: string;
}

export type FiscalModelBlockReason =
  | "FEATURE_DISABLED"
  | "INVALID_INPUT"
  | "MODEL_NOT_FOUND"
  | "UNSUPPORTED_TAX_YEAR"
  | "MODEL_NOT_CURRENT"
  | "CRITICAL_CHANGE_PENDING"
  | "INCONSISTENT_VERSION";

export type FiscalModelManualReviewReason =
  | "SOURCE_HASH_PENDING"
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_CHANGED"
  | "SOURCE_SYNC_MISSING"
  | "SOURCE_SYNC_STALE"
  | "FISCAL_REVIEW_MISSING"
  | "FISCAL_REVIEW_STALE"
  | "COVERAGE_INCOMPLETE"
  | "DRAFT_RELEASE";

export type FiscalModelReadResult<T> =
  | Readonly<{ status: "OK"; data: T }>
  | Readonly<{
      status: "MANUAL_REVIEW";
      data?: T;
      reasons: readonly FiscalModelManualReviewReason[];
    }>
  | Readonly<{ status: "BLOCKED"; reason: FiscalModelBlockReason }>;

export type FiscalModelsEngineAccessReason =
  | "ENABLED_LOCAL_PREVIEW"
  | "FEATURE_DISABLED"
  | "INVALID_MODE"
  | "PRODUCTION_BLOCKED"
  | "REMOTE_RUNTIME_BLOCKED";

export type FiscalModelsEngineAccess =
  | Readonly<{
      enabled: true;
      reason: Extract<
        FiscalModelsEngineAccessReason,
        "ENABLED_LOCAL_PREVIEW"
      >;
    }>
  | Readonly<{
      enabled: false;
      reason: Exclude<
        FiscalModelsEngineAccessReason,
        "ENABLED_LOCAL_PREVIEW"
      >;
    }>;
