export const PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1 =
  "public-aeat-official-content.v1" as const;

export type PublicAeatOfficialContentAuthorityV1 = "AEAT" | "BOE";

export type PublicAeatOfficialContentSourceKindV1 =
  | "OFFICIAL_MODEL_INDEX"
  | "PROCEDURE_HOME"
  | "PROCEDURE_RECORD"
  | "INFORMATION_PAGE"
  | "HELP_PAGE"
  | "FAQ_PAGE"
  | "DOWNLOAD_PAGE"
  | "DOCUMENT_PDF"
  | "DOCUMENT_IMAGE"
  | "LEGAL_TEXT"
  | "PERSONAL_AREA";

export interface PublicAeatOfficialContentSourceV1 {
  readonly id: string;
  readonly authority: PublicAeatOfficialContentAuthorityV1;
  readonly kind: PublicAeatOfficialContentSourceKindV1;
  readonly title: string;
  readonly canonicalUrl: string;
  readonly officialUpdatedOn: string | null;
  readonly capturedOn: string;
  readonly sourceSha256: string;
  readonly verificationStatus: "SOURCE_HASH_CAPTURED";
}

export interface PublicAeatOfficialContentTextV1 {
  readonly id: string;
  readonly heading: string;
  readonly text: string;
  readonly sourceIds: readonly [string, ...string[]];
  readonly semantics: "OFFICIAL_INFORMATION_ONLY";
}

export interface PublicAeatOfficialContentSectionV1 {
  readonly id: string;
  readonly title: string;
  readonly kind: "PURPOSE" | "SCOPE" | "ACCESS" | "DETAILS";
  readonly items: readonly [
    PublicAeatOfficialContentTextV1,
    ...PublicAeatOfficialContentTextV1[],
  ];
}

export interface PublicAeatOfficialContentLinkV1 {
  readonly id: string;
  readonly label: string;
  readonly sourceId: string;
  readonly category: "INFORMATION" | "PROCEDURE" | "LEGAL";
  readonly policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY";
}

export interface PublicAeatOfficialContentDocumentV1 {
  readonly id: string;
  readonly kind: "FORM" | "INSTRUCTIONS" | "REGISTER_DESIGN" | "GUIDE";
  readonly title: string;
  readonly sourceId: string;
  readonly landingPageSourceId: string | null;
  readonly mediaType: "application/pdf";
  readonly fileName: string;
  readonly byteLength: number;
  readonly pageCount: number;
  readonly sha256: string;
  readonly activeContentStatus:
    | "JAVASCRIPT_PRESENT"
    | "NO_JAVASCRIPT_DETECTED";
  readonly formStatus:
    | "ACROFORM_PRESENT"
    | "NO_ACROFORM_DETECTED"
    | "ACROFORM_METADATA_ONLY";
  readonly freshnessStatus:
    | "CURRENTNESS_UNDETERMINED"
    | "LEGACY_REFERENCES_DETECTED";
  readonly previewSuitability: "FORM_PREVIEW" | "DOCUMENT_PREVIEW" | "NONE";
  readonly usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY";
}

export interface PublicAeatOfficialContentThumbnailV1 {
  readonly id: string;
  readonly sourceId: string;
  readonly publicHref: `/fiscal-models/${string}.png`;
  readonly mediaType: "image/png";
  readonly width: number;
  readonly height: number;
  readonly pageNumber: number;
  readonly cropVariant: "HEADER_AND_DOCUMENT_START";
  readonly sha256: string;
  readonly alt: string;
  readonly provenanceStatus:
    | "DERIVED_FROM_HASHED_OFFICIAL_PDF"
    | "DERIVED_FROM_HASHED_OFFICIAL_IMAGE";
}

export interface PublicAeatOfficialContentExternalNavigationV1 {
  readonly kind: "AEAT_PERSONAL_AREA";
  readonly title: "Mi área personal de la AEAT";
  readonly sourceId: string;
  readonly policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY";
}

export interface PublicAeatOfficialContentFaqItemV1 {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly sourceIds: readonly [string, ...string[]];
  readonly semantics: "OFFICIAL_INFORMATION_ONLY";
}

export interface PublicAeatOfficialModelContentV1<Code extends string = string> {
  readonly schemaVersion: typeof PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1;
  readonly releaseId: string;
  readonly code: Code;
  readonly contentStatus: "OFFICIAL_INFORMATION";
  readonly sourceVerificationStatus: "VERIFIED";
  readonly applicabilityStatus: "NOT_EVALUATED";
  readonly lifecycleStatus: "UNDETERMINED" | "HISTORICAL";
  readonly reviewedOn: string;
  readonly canonicalName: string;
  readonly summary: string;
  readonly searchTerms: readonly [string, ...string[]];
  readonly sections: readonly [
    PublicAeatOfficialContentSectionV1,
    ...PublicAeatOfficialContentSectionV1[],
  ];
  readonly sources: readonly [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  readonly documents: readonly PublicAeatOfficialContentDocumentV1[];
  readonly thumbnail: PublicAeatOfficialContentThumbnailV1 | null;
  readonly links: readonly PublicAeatOfficialContentLinkV1[];
  readonly faq: readonly [
    PublicAeatOfficialContentFaqItemV1,
    ...PublicAeatOfficialContentFaqItemV1[],
  ];
  readonly externalNavigation:
    | PublicAeatOfficialContentExternalNavigationV1
    | null;
  readonly limitations:
    "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones.";
}

export type PublicAeatOfficialContentBlockReasonV1 =
  | "INVALID_INPUT"
  | "MODEL_CONTENT_NOT_FOUND"
  | "INCONSISTENT_CONTENT";

export type PublicAeatOfficialContentResolveResultV1 =
  | Readonly<{
      status: "OFFICIAL_INFORMATION";
      data: PublicAeatOfficialModelContentV1;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: PublicAeatOfficialContentBlockReasonV1;
    }>;

export type PublicAeatOfficialContentListResultV1 =
  | Readonly<{
      status: "OFFICIAL_INFORMATION";
      data: readonly PublicAeatOfficialModelContentV1[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INCONSISTENT_CONTENT";
    }>;
