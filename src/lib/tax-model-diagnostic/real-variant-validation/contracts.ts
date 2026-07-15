import type {
  DocumentAuthority,
  DocumentTerritory,
  FiscalDocumentType,
  JsonValue,
} from "../extractors/contracts";

export const REAL_VARIANT_MANIFEST_VERSION =
  "tax-real-variant-manifest.2026-07.v1" as const;
export const REAL_VARIANT_LAYOUT_REGISTRY_VERSION =
  "tax-real-variant-layouts.2026-07.v1" as const;

export type RealVariantSourceClass =
  "SYNTHETIC" | "OFFICIAL_SYNTHETIC" | "REAL_ANONYMIZED" | "HOLDOUT";

export type RealVariantDocumentKind =
  | "FILED_COPY"
  | "DRAFT"
  | "PREDECLARATION"
  | "CERTIFICATE"
  | "CURRENT_SCREEN"
  | "FULL_SCREEN_CAPTURE"
  | "PARTIAL_SCREEN_CAPTURE"
  | "SUPPORTING_DOCUMENT";

export type RealVariantTemporalScope =
  "CURRENT_AS_OF_DATE" | "FISCAL_YEAR" | "PERIOD" | "HISTORICAL";

export type RealVariantOutcome = "ACCEPT" | "ACCEPT_WITH_REVIEW" | "REJECT";

export type RealVariantVisualVariant =
  | "NATIVE"
  | "SCAN_300_DPI"
  | "SCAN_200_DPI"
  | "SCAN_150_DPI"
  | "COMPRESSION_MODERATE"
  | "COMPRESSION_STRONG"
  | "ROTATION_SMALL"
  | "ROTATION_90"
  | "PHOTOGRAPHED_PERSPECTIVE"
  | "UNEVEN_LIGHTING"
  | "PARTIAL_CROP"
  | "GRAYSCALE"
  | "MONOCHROME";

export interface RealVariantExpectedField {
  fieldId: string;
  page: number;
  label: string;
  boxNumber: string | null;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  expectedRawValue: JsonValue;
  expectedNormalizedValue: JsonValue;
  critical: boolean;
}

export interface RealVariantPrivacyReview {
  automatedScanVersion: string;
  automatedScanPassed: boolean;
  humanVisualReviewCompleted: boolean;
  humanReviewerId: string | null;
  reviewedAt: string | null;
  textLayerChecked: boolean;
  ocrLayerChecked: boolean;
  metadataChecked: boolean;
  acroFormChecked: boolean;
  xfaChecked: boolean;
  annotationsChecked: boolean;
  embeddedFilesChecked: boolean;
  qrAndBarcodeChecked: boolean;
  fileNameChecked: boolean;
  hiddenContentChecked: boolean;
}

export interface RealVariantManifest {
  manifestVersion: typeof REAL_VARIANT_MANIFEST_VERSION;
  fixtureId: string;
  family: FiscalDocumentType;
  authority: DocumentAuthority;
  territory: DocumentTerritory;
  modelNumber: string | null;
  documentName: string;
  fiscalYear: number | null;
  period: string | null;
  layoutVersion: string;
  extractorVersionExpected: string;
  sourceClass: RealVariantSourceClass;
  sourceGenerationMethod: string;
  authorizationRecorded: boolean;
  officialSourceReferences: readonly string[];
  documentKind: RealVariantDocumentKind;
  filingStatus: "FILED" | "DRAFT" | "NOT_APPLICABLE" | "UNKNOWN";
  temporalScope: RealVariantTemporalScope;
  completeDocument: boolean;
  expectedPageCount: number;
  observedPageCount: number;
  visualVariant: RealVariantVisualVariant;
  fileCharacteristics: {
    nativeText: boolean;
    acroForm: boolean;
    xfa: boolean;
    embeddedFonts: boolean;
    digitalSignature: boolean;
    qrOrBarcode: boolean;
    rotation: 0 | 90 | 180 | 270;
    pageSizes: readonly string[];
    encrypted: boolean;
  };
  expectedClassification: {
    family: FiscalDocumentType;
    authority: DocumentAuthority;
    fiscalYear: number | null;
    period: string | null;
    layoutVersion: string;
  };
  expectedFields: readonly RealVariantExpectedField[];
  expectedQuestionMappings: readonly {
    questionId: string;
    proposedAnswer: JsonValue;
    canSkipQuestion: boolean;
    confirmationRequired: boolean;
  }[];
  fieldEvidence: readonly RealVariantExpectedField[];
  forbiddenInferences: readonly string[];
  expectedWarnings: readonly string[];
  expectedOutcome: RealVariantOutcome;
  privacyReview: RealVariantPrivacyReview;
  sha256: string;
  sourceReviewedAt: string;
  reviewers: readonly string[];
  notes: readonly string[];
}

export type LayoutReviewStatus =
  | "SYNTHETIC_ONLY"
  | "PENDING_REAL_VARIANT_REVIEW"
  | "VALIDATED_FOR_ASSISTED_USE"
  | "DEPRECATED_LAYOUT";

export interface DocumentLayoutVersion {
  registryVersion: typeof REAL_VARIANT_LAYOUT_REGISTRY_VERSION;
  family: FiscalDocumentType;
  authority: DocumentAuthority;
  territory: DocumentTerritory;
  fiscalYear: number;
  layoutId: string;
  validFrom: string | null;
  validTo: string | null;
  generationChannel:
    | "WEB_PDF"
    | "PAPER_PDF"
    | "FILED_COPY"
    | "PORTAL_PRINT"
    | "SCREEN_CAPTURE"
    | "SYNTHETIC_FACSIMILE";
  pageCountRange: readonly [number, number];
  pageFingerprints: readonly string[];
  titleAnchors: readonly string[];
  labelAnchors: readonly string[];
  boxNumberMap: Readonly<Record<string, string>>;
  formFieldMap: Readonly<Record<string, string>>;
  tableDefinitions: readonly string[];
  textOrderNotes: readonly string[];
  fontNotes: readonly string[];
  knownVariants: readonly string[];
  extractorVersion: string;
  officialSourceReferences: readonly string[];
  sourceHash: string | "HASH_PENDING";
  reviewStatus: LayoutReviewStatus;
  firstSeenAt: string;
  lastVerifiedAt: string;
}

export type LayoutResolutionStatus =
  | "KNOWN_LAYOUT"
  | "KNOWN_FAMILY_UNKNOWN_LAYOUT"
  | "UNSUPPORTED_LAYOUT_NEEDS_REVIEW"
  | "UNSUPPORTED_DOCUMENT";

export interface LayoutResolution {
  status: LayoutResolutionStatus;
  layout: DocumentLayoutVersion | null;
  mayAutoConfirm: boolean;
  requiresManualReview: boolean;
}

export type CorpusCoverageStatus =
  | "NO_CORPUS"
  | "SYNTHETIC_ONLY"
  | "REAL_VARIANT_GAP"
  | "PARTIALLY_VALIDATED"
  | "VALIDATED_FOR_ASSISTED_USE"
  | "VALIDATED_FOR_AUTO_CONFIRMATION"
  | "DEPRECATED_LAYOUT";

export interface CorpusInventoryRow {
  family: FiscalDocumentType;
  authority: DocumentAuthority;
  fiscalYears: readonly number[];
  layoutIds: readonly string[];
  semanticCaseCount: number;
  manifestCount: number;
  nativePdfCount: number;
  rasterOrOcrCount: number;
  incompleteFixtureCount: number;
  officialSyntheticCount: number;
  realAnonymizedCount: number;
  holdoutCount: number;
  coverageStatus: CorpusCoverageStatus;
  gapPriority: "HIGH" | "NORMAL";
  lastVerifiedAt: string;
}

export interface PdfInspectionSnapshot {
  byteLength: number;
  hasPdfHeader: boolean;
  parseable: boolean;
  unexpectedlyTruncated: boolean;
  encrypted: boolean;
  pageCount: number;
  declaredPageCount: number | null;
  pageSizes: readonly { width: number; height: number }[];
  hasJavaScript: boolean;
  externalLinkCount: number;
  embeddedFileCount: number;
  malformedCriticalObjectCount: number;
  sha256: string;
}

export interface CorpusAdmissionDecision {
  outcome: RealVariantOutcome;
  blockingCodes: readonly string[];
  warningCodes: readonly string[];
}

export interface PdfLayerSnapshot {
  fileName: string;
  nativeText: readonly string[];
  ocrText: readonly string[];
  xmpValues: readonly string[];
  documentProperties: readonly string[];
  acroFormValues: readonly string[];
  xfaValues: readonly string[];
  annotationValues: readonly string[];
  embeddedFileNames: readonly string[];
  embeddedTextValues: readonly string[];
  optionalContentLayerNames: readonly string[];
  qrAndBarcodeValues: readonly string[];
  internalPathValues: readonly string[];
}

export interface PiiFindingSummary {
  category:
    | "TAX_ID"
    | "IBAN"
    | "NRC_OR_CSV"
    | "PHONE"
    | "EMAIL"
    | "POSTAL_CODE"
    | "KNOWN_ORIGINAL_VALUE";
  layer: keyof PdfLayerSnapshot;
  count: number;
}

export interface PiiScanResult {
  safeForCorpus: boolean;
  findingCount: number;
  findings: readonly PiiFindingSummary[];
  scannedLayerCount: number;
  rawValuesExposed: false;
}

export interface RealVariantMetricsInput {
  family: FiscalDocumentType;
  layoutId: string;
  fiscalYear: number;
  expectedClassification: FiscalDocumentType | null;
  actualClassification: FiscalDocumentType | null;
  criticalFieldTotal: number;
  criticalFieldCorrect: number;
  nonCriticalFieldTotal: number;
  nonCriticalFieldCorrect: number;
  forbiddenInferenceCount: number;
  incorrectlySkippedCriticalQuestionCount: number;
  sentToReview: boolean;
  parserFailed: boolean;
  ocrFailed: boolean;
  processingTimeMs: number;
}

export interface RealVariantMetricsReport {
  sampleCount: number;
  classificationAccuracy: number;
  criticalFieldAccuracy: number;
  nonCriticalFieldAccuracy: number;
  reviewRate: number;
  forbiddenInferenceCount: number;
  incorrectlySkippedCriticalQuestionCount: number;
  parserFailureCount: number;
  ocrFailureCount: number;
  averageProcessingTimeMs: number;
  releaseGatePassed: boolean;
}

export interface RealVariantMetricsGroupReport extends RealVariantMetricsReport {
  family: FiscalDocumentType;
  layoutId: string;
  fiscalYear: number;
}
