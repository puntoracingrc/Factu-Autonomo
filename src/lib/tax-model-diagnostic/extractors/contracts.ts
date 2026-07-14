export const FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION = "1.0.0" as const;
export const FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION =
  "fiscal-document-extractors.2026-07.v2" as const;

export const TAX_DOCUMENT_MODEL_CODES = [
  "035",
  "036",
  "037",
  "100",
  "111",
  "115",
  "123",
  "130",
  "131",
  "151",
  "180",
  "184",
  "190",
  "193",
  "200",
  "202",
  "216",
  "296",
  "303",
  "308",
  "309",
  "341",
  "347",
  "349",
  "369",
  "390",
  "714",
  "720",
  "721",
  "840",
] as const;

export type TaxDocumentModelCode = (typeof TAX_DOCUMENT_MODEL_CODES)[number];

export const UNNUMBERED_FISCAL_DOCUMENT_TYPES = [
  "CURRENT_CENSUS_CERTIFICATE",
  "AEAT_ECONOMIC_ACTIVITIES_VIEW",
  "AEAT_TAX_STATUS_VIEW",
  "AEAT_OBLIGATIONS_VIEW",
  "TGSS_CURRENT_STATUS_REPORT",
  "TGSS_EMPLOYMENT_HISTORY",
  "TGSS_SELF_EMPLOYED_ACTIVITIES",
  "ROI_CERTIFICATE",
  "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
] as const;

export type UnnumberedFiscalDocumentType =
  (typeof UNNUMBERED_FISCAL_DOCUMENT_TYPES)[number];

export type FiscalDocumentType =
  `MODEL_${TaxDocumentModelCode}` | UnnumberedFiscalDocumentType;

export type DocumentAuthority =
  "AEAT" | "TGSS" | "FORAL" | "CANARY_TAX_AUTHORITY" | "UNKNOWN";

export type DocumentTerritory =
  | "ES_COMMON"
  | "ES_CANARY"
  | "ES_NAVARRA"
  | "ES_BASQUE_ALAVA"
  | "ES_BASQUE_BIZKAIA"
  | "ES_BASQUE_GIPUZKOA"
  | "ES_CEUTA"
  | "ES_MELILLA"
  | "UNKNOWN";

export type DocumentKind =
  | "CURRENT_CERTIFICATE"
  | "CURRENT_AEAT_VIEW"
  | "FILED_DECLARATION"
  | "FILED_DECLARATION_COPY"
  | "FILING_RECEIPT"
  | "STRUCTURED_OFFICIAL_FILE"
  | "DRAFT"
  | "PREDECLARATION"
  | "SUPPORTING_DOCUMENT"
  | "SCREENSHOT"
  | "UNKNOWN";

export type FilingStatus =
  "VERIFIED_FILED" | "APPARENTLY_FILED" | "NOT_VERIFIED" | "DRAFT" | "UNKNOWN";

export type TemporalScope =
  | "CURRENT_AS_OF_DATE"
  | "TARGET_FISCAL_YEAR"
  | "SPECIFIC_PERIOD"
  | "HISTORICAL"
  | "FUTURE_INTENTION";

export type EvidenceStatus =
  | "AUTO_CONFIRMED"
  | "PREFILLED_NEEDS_CONFIRMATION"
  | "HISTORICAL_ONLY"
  | "INFERRED_NEEDS_CONFIRMATION"
  | "CONFLICT"
  | "UNREADABLE"
  | "UNSUPPORTED";

export type StructuredExtractionMethod =
  | "STRUCTURED_OFFICIAL_FILE"
  | "PDF_ACROFORM"
  | "PDF_XFA"
  | "PDF_NATIVE_TEXT"
  | "PDF_LAYOUT"
  | "OCR_LOCAL"
  | "USER_REVIEW";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface SourceCoordinates {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedVerificationCode {
  detected: boolean;
  verificationStatus: "CSV_DETECTED" | "CSV_VERIFIED";
}

export interface DocumentEnvelope {
  contractVersion: typeof FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION;
  catalogVersion: typeof FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION;
  documentId: string;
  authority: DocumentAuthority;
  territory: DocumentTerritory;
  detectedModel: TaxDocumentModelCode | null;
  detectedDocumentType: FiscalDocumentType | null;
  modelVersion: string | null;
  fiscalYear: number | null;
  period: string | null;
  documentKind: DocumentKind;
  filingStatus: FilingStatus;
  originalOrCorrection:
    "ORIGINAL" | "COMPLEMENTARY" | "SUBSTITUTE" | "RECTIFICATION" | "UNKNOWN";
  taxpayerNifMasked: string | null;
  taxpayerNameMasked: string | null;
  issueDate: string | null;
  filingDate: string | null;
  effectiveDate: string | null;
  receiptNumberMasked: string | null;
  csv: DetectedVerificationCode | null;
  nrcDetected: boolean;
  totalPages: number | null;
  detectedPages: readonly number[];
  isComplete: boolean;
  extractionMethods: readonly StructuredExtractionMethod[];
  overallConfidence: number;
  warnings: readonly string[];
}

export interface ExtractedFact {
  factId: string;
  factType: string;
  value: JsonValue;
  normalizedValue: JsonValue;
  temporalScope: TemporalScope;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceDocumentId: string;
  sourcePage: number | null;
  sourceField: string | null;
  sourceLabel: string | null;
  sourceCoordinates: SourceCoordinates | null;
  extractionMethod: StructuredExtractionMethod;
  extractionConfidence: number;
  filingVerified: boolean;
  userConfirmed: boolean;
  status: EvidenceStatus;
  conflictsWith: readonly string[];
  supersededBy: string | null;
  warnings: readonly string[];
}

export interface QuestionResolution {
  questionId: string;
  proposedAnswer: JsonValue;
  status: EvidenceStatus;
  temporalScope: TemporalScope;
  evidenceIds: readonly string[];
  explanation: string;
  canSkipQuestion: boolean;
  confirmationRequired: boolean;
  missingInformation: readonly string[];
  conflictingInformation: readonly string[];
}

export type ExtractionResultStatus =
  "RESOLVED" | "MANUAL_REVIEW" | "UNSUPPORTED_DOCUMENT" | "BLOCKED";

export interface FiscalDocumentExtractionResult {
  contractVersion: typeof FISCAL_DOCUMENT_EXTRACTION_CONTRACT_VERSION;
  catalogVersion: typeof FISCAL_DOCUMENT_EXTRACTOR_CATALOG_VERSION;
  status: ExtractionResultStatus;
  envelope: DocumentEnvelope;
  facts: readonly ExtractedFact[];
  questionResolutions: readonly QuestionResolution[];
  warnings: readonly string[];
}

export interface TextDocumentInput {
  documentId: string;
  text: string;
  extractionMethod: Extract<
    StructuredExtractionMethod,
    "STRUCTURED_OFFICIAL_FILE" | "PDF_NATIVE_TEXT" | "PDF_LAYOUT" | "OCR_LOCAL"
  >;
  totalPages?: number;
  detectedPages?: readonly number[];
  pages?: readonly { page: number; text: string }[];
  /**
   * El producto acepta los datos que el usuario declara como propios. Este NIF
   * solo sirve para mostrar una advertencia opcional; nunca bloquea la lectura.
   */
  expectedNif?: string;
  asOfDate?: string;
}
