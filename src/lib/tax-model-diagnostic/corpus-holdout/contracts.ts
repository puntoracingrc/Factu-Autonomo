import type { FiscalDocumentType, JsonValue } from "../extractors/contracts";

export const TAX_CORPUS_MANIFEST_VERSION =
  "tax-corpus-document.2026-07.v2" as const;
export const TAX_CORPUS_REPORT_VERSION =
  "tax-corpus-validation-report.2026-07.v2" as const;

export type CorpusSourceClass =
  | "SYNTHETIC"
  | "OFFICIAL_GENERATED"
  | "REAL_ANONYMIZED"
  | "ENGINEERING_HOLDOUT"
  | "INDEPENDENT_HOLDOUT";

export type TaxCorpusSourceClass = CorpusSourceClass;
export type TaxCorpusStorageScope =
  "PUBLIC" | "ENGINEERING_HOLDOUT" | "PRIVATE_INDEPENDENT_HOLDOUT";
export type TaxCorpusDeliveryMode = "NATIVE" | "OCR";
export type TaxCorpusGenerationChannel =
  | "SYNTHETIC_FIXTURE"
  | "OFFICIAL_SERVICE"
  | "REAL_SUBMISSION"
  | "ENGINEERING_PIPELINE"
  | "INDEPENDENT_OFFICIAL"
  | "INDEPENDENT_REAL";
export type TaxCorpusExpectedDecision = "ADMIT" | "MANUAL_REVIEW" | "REJECT";

export interface TaxCorpusExpectedField {
  fieldId: string;
  expectedValue: JsonValue;
}

export interface TaxCorpusExtractionExpected {
  classification: FiscalDocumentType;
  deliveryMode: TaxCorpusDeliveryMode;
  fields: readonly TaxCorpusExpectedField[];
  missingFields: readonly string[];
}

export interface TaxCorpusVerificationEvidence {
  consentRecorded: boolean | null;
  provenanceRecorded: boolean | null;
  officialGenerationVerified: boolean | null;
  visibleLayerChecked: boolean | null;
  hiddenTextChecked: boolean | null;
  acroFormChecked: boolean | null;
  xfaChecked: boolean | null;
  metadataChecked: boolean | null;
  annotationsChecked: boolean | null;
  optionalLayersChecked: boolean | null;
  attachmentsChecked: boolean | null;
  scriptsChecked: boolean | null;
  qrChecked: boolean | null;
  barcodeChecked: boolean | null;
  fileNameChecked: boolean | null;
  piiScanPassed: boolean | null;
  anonymizationReviewPassed: boolean | null;
  layoutClassified: boolean | null;
  automatedScanPassed: boolean | null;
  humanReviewCompleted: boolean | null;
  reviewerId: string | null;
  reviewedAt: string | null;
}

/**
 * Canonical admission manifest. The twenty fields below are the stable corpus
 * contract; the remaining transport fields keep assets verifiable without
 * placing private documents or fixture-specific paths in reports.
 */
export interface CorpusDocument {
  manifestVersion: typeof TAX_CORPUS_MANIFEST_VERSION;
  fixtureId: string;
  family: FiscalDocumentType;
  documentType: FiscalDocumentType;
  fiscalYear: number;
  period: string | null;
  layoutVersion: string;
  generationChannel: TaxCorpusGenerationChannel;
  sourceClass: CorpusSourceClass;
  extractionExpected: TaxCorpusExtractionExpected;
  prohibitedInferences: readonly string[];
  expectedDecision: TaxCorpusExpectedDecision;
  sha256: string;
  admitted: boolean;
  incomplete: boolean;
  holdout: boolean;
  anonymizationVerified: boolean;
  verificationEvidence: TaxCorpusVerificationEvidence;
  duplicateOf: string | null;
  createdAt: string;
  admittedAt: string | null;

  assetFile: string;
  containsRealPersonalData: boolean;
}

export type TaxCorpusDocumentManifest = CorpusDocument;

export interface TaxCorpusManifestRecord {
  manifest: CorpusDocument;
  storageScope: TaxCorpusStorageScope;
  actualSha256: string;
}

/** Evidence collected before an admission decision is allowed. */
export interface TaxCorpusAdmissionInspection {
  parseable: boolean;
  encrypted: boolean;
  hasJavaScript: boolean;
  embeddedFileCount: number;
  unexpectedHiddenLayerCount: number;
  piiFindingCount: number;
  actualSha256: string;
  consentRecorded: boolean;
  provenanceRecorded: boolean;
  visibleLayerChecked: boolean;
  hiddenTextChecked: boolean;
  acroFormChecked: boolean;
  xfaChecked: boolean;
  metadataChecked: boolean;
  annotationsChecked: boolean;
  optionalLayersChecked: boolean;
  attachmentsChecked: boolean;
  scriptsChecked: boolean;
  qrChecked: boolean;
  barcodeChecked: boolean;
  fileNameChecked: boolean;
  anonymizationVerified: boolean;
  layoutClassified: boolean;
  manualReviewCompleted: boolean;
}

export interface TaxCorpusAdmissionDecision {
  outcome: TaxCorpusExpectedDecision;
  blockingCodes: readonly string[];
  warningCodes: readonly string[];
}

export interface TaxCorpusValidationReport {
  reportVersion: typeof TAX_CORPUS_REPORT_VERSION;
  valid: boolean;
  manifestCount: number;
  familyCount: number;
  missingFamilies: readonly FiscalDocumentType[];
  sourceClassCounts: Readonly<Record<CorpusSourceClass, number>>;
  fiscalYears: readonly number[];
  fiscalYearCount: number;
  layoutCount: number;
  nativeCount: number;
  ocrCount: number;
  incompleteCount: number;
  expectedFieldCount: number;
  prohibitedInferenceCount: number;
  duplicateFixtureIdCount: number;
  duplicateSha256Count: number;
  duplicateReferenceCount: number;
  invalidManifestCount: number;
  admissionAnomalyCount: number;
  holdoutContaminationCount: number;
  anonymizationAnomalyCount: number;
  hashMismatchCount: number;
  admittedCount: number;
  officialGeneratedCount: number;
  realDocumentCount: number;
  engineeringHoldoutCount: number;
  independentHoldoutCount: number;
  engineeringHoldoutAvailable: boolean;
  independentHoldoutAvailable: boolean;
  independentHoldoutEvaluated: boolean;
  aggregateOnly: true;
}

export interface TaxCorpusMetricSample {
  family: FiscalDocumentType;
  fiscalYear: number;
  layoutVersion: string;
  sourceClass: CorpusSourceClass;
  deliveryMode: TaxCorpusDeliveryMode;
  expectedClassification: FiscalDocumentType;
  actualClassification: FiscalDocumentType | null;
  expectedFieldCount: number;
  correctFieldCount: number;
  falsePositiveCount: number;
  falseNegativeCount: number;
  prohibitedInferenceCount: number;
  sentToReview: boolean;
}

export interface TaxCorpusMetricReport {
  sampleCount: number;
  classificationAccuracy: number;
  fieldAccuracy: number;
  falsePositiveCount: number;
  falseNegativeCount: number;
  prohibitedInferenceCount: number;
  reviewRate: number;
}

export interface TaxCorpusMetricGroupReport extends TaxCorpusMetricReport {
  dimension:
    "FAMILY" | "DELIVERY_MODE" | "FISCAL_YEAR" | "LAYOUT" | "SOURCE_CLASS";
  key: string;
}
