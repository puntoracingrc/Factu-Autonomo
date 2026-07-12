import type {
  FiscalModelAvailability,
  FiscalModelCode,
  FiscalModelLifecycleStatus,
  FiscalModelReviewStatus,
} from "../contracts";

export const FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1 =
  "fiscal-model-page.v1" as const;

export interface FiscalModelPageRouteByCodeV1 {
  readonly "036": "/consultor-fiscal/modelos/036";
  readonly "037": "/consultor-fiscal/modelos/037";
  readonly "303": "/consultor-fiscal/modelos/303";
}

export type FiscalModelPageCanonicalPathV1 =
  FiscalModelPageRouteByCodeV1[FiscalModelCode];

export type FiscalModelPageContentLevelV1 =
  | "METADATA_ONLY"
  | "HISTORICAL_INFO_ONLY";

export type FiscalModelPagePublicationStatusV1 =
  | "UNPUBLISHED"
  | "PUBLISHED";

export type FiscalModelPageReleaseStatusV1 =
  | "DRAFT_LOCAL_PREVIEW"
  | "PUBLISHED";

export type FiscalModelPageProvenanceFieldV1 =
  | "canonicalName"
  | "summary"
  | "contentLevel"
  | "lifecycleStatus"
  | "effectiveTo"
  | "modelAvailability";

export type FiscalModelPageFieldProvenanceV1<
  ReviewStatus extends FiscalModelReviewStatus = FiscalModelReviewStatus,
> =
  | Readonly<{
      field: FiscalModelPageProvenanceFieldV1;
      origin: "OFFICIAL_SOURCE";
      sourceIds: readonly [string, ...string[]];
      reviewStatus: ReviewStatus;
    }>
  | Readonly<{
      field: FiscalModelPageProvenanceFieldV1;
      origin: "FOUNDATION_CATALOG";
      modelReleaseId: string;
      modelContentVersion: string;
      reviewStatus: ReviewStatus;
    }>;

export interface FiscalModelPageDescriptorReleaseV1 {
  readonly id: string;
  readonly schemaVersion: typeof FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1;
  readonly status: FiscalModelPageReleaseStatusV1;
  readonly createdAt: string;
  readonly modelCatalogReleaseId: string;
  readonly sourceRegistryVersion: string;
}

interface FiscalModelPageDescriptorBaseV1<Code extends FiscalModelCode> {
  readonly descriptorSchemaVersion: typeof FISCAL_MODEL_PAGE_DESCRIPTOR_SCHEMA_VERSION_V1;
  readonly descriptorReleaseId: string;
  readonly descriptorContentVersion: string;
  readonly code: Code;
  readonly canonicalPath: FiscalModelPageRouteByCodeV1[Code];
  readonly canonicalName: string;
  readonly summary: string;
  readonly contentLevel: FiscalModelPageContentLevelV1;
  readonly lifecycleStatus: FiscalModelLifecycleStatus;
  readonly modelAvailability: FiscalModelAvailability;
  readonly effectiveTo: string | null;
  readonly modelReleaseId: string;
  readonly modelContentVersion: string;
  readonly sourceRegistryVersion: string;
  readonly sourceIds: readonly string[];
}

export type FiscalModelPageUnpublishedDescriptorV1<
  Code extends FiscalModelCode = FiscalModelCode,
> = Code extends FiscalModelCode
  ? FiscalModelPageDescriptorBaseV1<Code> &
      Readonly<{
        publicationStatus: "UNPUBLISHED";
        contentReviewStatus: FiscalModelReviewStatus;
        href: null;
        provenance: readonly FiscalModelPageFieldProvenanceV1[];
      }>
  : never;

export type FiscalModelPagePublishedDescriptorV1<
  Code extends FiscalModelCode = FiscalModelCode,
> = Code extends FiscalModelCode
  ? FiscalModelPageDescriptorBaseV1<Code> &
      Readonly<{
        publicationStatus: "PUBLISHED";
        contentReviewStatus: "APPROVED";
        href: FiscalModelPageRouteByCodeV1[Code];
        provenance: readonly FiscalModelPageFieldProvenanceV1<"APPROVED">[];
      }>
  : never;

export type FiscalModelPageDescriptorV1 = {
  readonly [Code in FiscalModelCode]:
    | FiscalModelPageUnpublishedDescriptorV1<Code>
    | FiscalModelPagePublishedDescriptorV1<Code>;
}[FiscalModelCode];

export type FiscalModelPageUnavailableDescriptorV1<
  Code extends FiscalModelCode = FiscalModelCode,
> = Code extends FiscalModelCode
  ? FiscalModelPageDescriptorBaseV1<Code> &
      Readonly<{
        publicationStatus: FiscalModelPagePublicationStatusV1;
        contentReviewStatus: FiscalModelReviewStatus;
        href: null;
        provenance: readonly FiscalModelPageFieldProvenanceV1[];
      }>
  : never;

export type FiscalModelPageBlockReasonV1 =
  | "FEATURE_DISABLED"
  | "INVALID_CONFIGURATION"
  | "INVALID_INPUT"
  | "MODEL_NOT_FOUND"
  | "INCONSISTENT_DESCRIPTOR";

export type FiscalModelPageManualReviewReasonV1 =
  | "DRAFT_RELEASE"
  | "PAGE_UNPUBLISHED"
  | "PAGE_REVIEW_REQUIRED"
  | "MODEL_REVIEW_REQUIRED"
  | "SOURCE_HASH_PENDING"
  | "SOURCE_REVIEW_REQUIRED"
  | "SOURCE_CHANGED"
  | "SOURCE_UNAVAILABLE";

type FiscalModelPageAvailableResolveResultV1 = {
  readonly [Code in FiscalModelCode]: Readonly<{
    status: "AVAILABLE";
    data: FiscalModelPagePublishedDescriptorV1<Code>;
    href: FiscalModelPageRouteByCodeV1[Code];
  }>;
}[FiscalModelCode];

export type FiscalModelPageResolveResultV1 =
  | FiscalModelPageAvailableResolveResultV1
  | Readonly<{
      status: "MANUAL_REVIEW";
      data: FiscalModelPageUnavailableDescriptorV1;
      reasons: readonly FiscalModelPageManualReviewReasonV1[];
      href: null;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: FiscalModelPageBlockReasonV1;
      href: null;
    }>;

export type FiscalModelPageListResultV1 =
  | Readonly<{
      status: "AVAILABLE";
      data: readonly FiscalModelPagePublishedDescriptorV1[];
    }>
  | Readonly<{
      status: "MANUAL_REVIEW";
      data: readonly FiscalModelPageUnavailableDescriptorV1[];
      reasons: readonly FiscalModelPageManualReviewReasonV1[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: FiscalModelPageBlockReasonV1;
    }>;

export interface FiscalModelPageDescriptorResolverV1 {
  readonly resolve: (input: unknown) => FiscalModelPageResolveResultV1;
  readonly list: (input: unknown) => FiscalModelPageListResultV1;
}
