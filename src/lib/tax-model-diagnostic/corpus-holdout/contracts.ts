import type { FiscalDocumentType, JsonValue } from "../extractors/contracts";

export const TAX_CORPUS_MANIFEST_VERSION =
  "tax-corpus-document.2026-07.v1" as const;
export const TAX_CORPUS_REPORT_VERSION =
  "tax-corpus-validation-report.2026-07.v1" as const;

export type TaxCorpusSourceClass =
  | "SYNTHETIC"
  | "OFFICIAL_GENERATED"
  | "REAL_ANONYMIZED"
  | "HOLDOUT";

export type TaxCorpusAdmissionStatus = "PENDING" | "ADMITTED" | "REJECTED";
export type TaxCorpusStorageScope = "PUBLIC" | "PRIVATE_HOLDOUT";
export type TaxCorpusDeliveryMode = "NATIVE" | "OCR";

export interface TaxCorpusExpectedField {
  fieldId: string;
  expectedValue: JsonValue;
}

export interface TaxCorpusAnonymizationReview {
  visibleLayerChecked: boolean;
  hiddenTextChecked: boolean;
  metadataChecked: boolean;
  acroFormChecked: boolean;
  xfaChecked: boolean;
  annotationsChecked: boolean;
  attachmentsChecked: boolean;
  qrChecked: boolean;
  barcodeChecked: boolean;
  fileNameChecked: boolean;
  automatedScanPassed: boolean;
  humanReviewCompleted: boolean;
}

export interface TaxCorpusDocumentManifest {
  manifestVersion: typeof TAX_CORPUS_MANIFEST_VERSION;
  fixtureId: string;
  family: FiscalDocumentType;
  fiscalYear: number;
  layoutVersion: string;
  sourceClass: TaxCorpusSourceClass;
  expectedFields: readonly TaxCorpusExpectedField[];
  forbiddenInferences: readonly string[];
  sha256: string;
  admissionStatus: TaxCorpusAdmissionStatus;
  anonymizationVerified: boolean;
  holdoutMembership: boolean;
  completeDocument: boolean;
  deliveryMode: TaxCorpusDeliveryMode;
  assetFile: string;
  containsRealPersonalData: boolean;
  authorizationRecorded: boolean;
  officialGenerationVerified: boolean;
  anonymizationReview: TaxCorpusAnonymizationReview | null;
  missingFields: readonly string[];
}

export interface TaxCorpusManifestRecord {
  manifest: TaxCorpusDocumentManifest;
  storageScope: TaxCorpusStorageScope;
  actualSha256: string;
}

export interface TaxCorpusAdmissionInspection {
  parseable: boolean;
  encrypted: boolean;
  hasJavaScript: boolean;
  embeddedFileCount: number;
  unexpectedHiddenLayerCount: number;
  piiFindingCount: number;
  actualSha256: string;
}

export interface TaxCorpusAdmissionDecision {
  outcome: "ADMIT" | "QUARANTINE" | "REJECT";
  blockingCodes: readonly string[];
  warningCodes: readonly string[];
}

export interface TaxCorpusValidationReport {
  reportVersion: typeof TAX_CORPUS_REPORT_VERSION;
  valid: boolean;
  manifestCount: number;
  familyCount: number;
  missingFamilies: readonly FiscalDocumentType[];
  sourceClassCounts: Readonly<Record<TaxCorpusSourceClass, number>>;
  admissionCounts: Readonly<Record<TaxCorpusAdmissionStatus, number>>;
  fiscalYears: readonly number[];
  layoutCount: number;
  nativeCount: number;
  ocrCount: number;
  incompleteCount: number;
  knownMissingFieldCount: number;
  duplicateFixtureIdCount: number;
  duplicateSha256Count: number;
  invalidManifestCount: number;
  holdoutContaminationCount: number;
  anonymizationFailureCount: number;
  hashMismatchCount: number;
  officialGeneratedAvailable: boolean;
  realAnonymizedAvailable: boolean;
  holdoutEvaluated: boolean;
  aggregateOnly: true;
}

export interface TaxCorpusMetricSample {
  family: FiscalDocumentType;
  fiscalYear: number;
  layoutVersion: string;
  deliveryMode: TaxCorpusDeliveryMode;
  recognized: boolean;
  expectedFieldCount: number;
  correctFieldCount: number;
  falsePositiveCount: number;
  forbiddenInferenceCount: number;
  sentToReview: boolean;
}

export interface TaxCorpusMetricReport {
  sampleCount: number;
  recognitionRate: number;
  fieldPrecision: number;
  falsePositiveCount: number;
  forbiddenInferenceCount: number;
  reviewRate: number;
}

export interface TaxCorpusMetricGroupReport extends TaxCorpusMetricReport {
  dimension: "FAMILY" | "DELIVERY_MODE" | "FISCAL_YEAR" | "LAYOUT";
  key: string;
}
