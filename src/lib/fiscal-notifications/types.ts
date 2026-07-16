import type { AdministrativeDomainProjection } from "./administrative-domain";
import type {
  AeatDocumentChainIdV1,
  AeatDocumentRelationTypeIdV1,
} from "./knowledge/aeat-document-knowledge.v1";

type TemplateRecognitionResult = {
  traceVersion: "fiscal-document-template-recognition/1.0.0";
  status: "MATCHED" | "REVIEW_REQUIRED" | "AMBIGUOUS" | "UNKNOWN";
  selectedTemplateId?: string;
  selectedTemplateVersion?: string;
  reason:
    | "NO_CANDIDATE_ABOVE_THRESHOLD"
    | "TOP_CANDIDATES_TOO_CLOSE"
    | "TEMPLATE_REQUIRES_REVIEW"
    | "ACTIVE_TEMPLATE_MATCHED";
  candidates: readonly {
    templateId: string;
    templateVersion: string;
    familyId: string;
    sourceIds: readonly string[];
    extractorId: string | null;
    score: number;
    matchedAnchorIds: readonly string[];
    missingRequiredAnchorIds: readonly string[];
    missingRequiredFieldIds: readonly string[];
    excludedBy: readonly string[];
    activationReady: boolean;
  }[];
};

export type Cents = number;

export type AdministrationType =
  | "AEAT"
  | "TGSS"
  | "LOCAL"
  | "REGIONAL"
  | "STATE_OTHER"
  | "OTHER";

export type AdministrativeDocumentType =
  | "AEAT_ENFORCEMENT_ORDER"
  | "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT"
  | "AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL"
  | "AEAT_OFFSET_AGREEMENT"
  | "AEAT_PAYMENT_FORM"
  | "AEAT_INFORMATION_REQUEST"
  | "AEAT_ASSESSMENT_PROPOSAL"
  | "AEAT_ASSESSMENT"
  | "AEAT_SANCTION_PROPOSAL"
  | "AEAT_SANCTION_DECISION"
  | "AEAT_SEIZURE_ORDER"
  | "TGSS_DEBT_NOTICE"
  | "TGSS_ENFORCEMENT_NOTICE"
  | "MUNICIPAL_FINE"
  | "MUNICIPAL_TAX_NOTICE"
  | "REGIONAL_AUTHORITY_NOTICE"
  | "GENERIC_ADMINISTRATIVE_NOTICE"
  | "UNKNOWN";

export type DocumentPartType =
  | "MAIN_ACT"
  | "PAYMENT_FORM"
  | "PAYMENT_INSTRUCTIONS"
  | "ANNEX_DEBTS"
  | "ANNEX_INSTALLMENTS"
  | "ANNEX_INTEREST"
  | "LEGAL_REFERENCES"
  | "COPY_FOR_RECIPIENT"
  | "COPY_FOR_BANK"
  | "OTHER";

export type ExternalReferenceType =
  | "DOCUMENT_REFERENCE"
  | "EXPEDIENT_NUMBER"
  | "LIQUIDATION_KEY"
  | "DEBT_KEY"
  | "PROCEDURE_NUMBER"
  | "PAYMENT_JUSTIFICANTE"
  | "CSV"
  | "NRC"
  | "TAX_MODEL"
  | "TAX_EXERCISE"
  | "TAX_PERIOD"
  | "PAYMENT_MODEL"
  | "VTO_RAW"
  | "NOTIFICATION_ID"
  | "DISTRIBUTION_BARCODE"
  | "PAYMENT_BARCODE"
  | "ISSUING_BODY_CODE"
  | "DEBT_ORIGIN"
  | "REQUEST_NUMBER"
  | "OFFICIAL_REGISTRY_NUMBER"
  | "VEHICLE_OR_FINE_REFERENCE"
  | "SOCIAL_SECURITY_REFERENCE"
  | "MUNICIPAL_REFERENCE"
  | "OTHER";

export type ExtractionMethod = "TEXT_LAYER" | "OCR" | "RULE" | "AI" | "USER";

export type AssertionType =
  | "EXPLICIT_IN_DOCUMENT"
  | "CALCULATED"
  | "INFERRED"
  | "USER_CONFIRMED";

export type ConfidenceBand = "LOW" | "MEDIUM" | "HIGH" | "EXACT";

export interface EvidenceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth?: number;
  pageHeight?: number;
}

export interface FieldEvidence {
  id: string;
  ownerScope: string;
  documentId: string;
  partId?: string;
  pageNumber: number;
  boundingBox?: EvidenceBoundingBox;
  textSnippet: string;
  rawValue?: string;
  extractionMethod: ExtractionMethod;
  confidence: ConfidenceBand;
  assertionType: AssertionType;
  confirmedAt?: string;
  confirmedBy?: string;
}

export type UploadedFileRole = "PRIMARY" | "ANNEX" | "NOTIFICATION_PROOF";

interface UploadedFileRecordBase {
  id: string;
  packageId: string;
  ownerScope: string;
  role: UploadedFileRole;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  sha256: string;
  contentFingerprint: string;
  uploadedAt: string;
  receivedAt?: string;
}

/**
 * Metadatos de la fuente sin forzar la conservación del PDF original.
 *
 * Los registros históricos sin `sourceContentRetention` siguen significando
 * un original inmutable retenido. El modo `NOT_RETAINED` conserva únicamente
 * identidad técnica y datos estructurados; prohíbe nombre de archivo, ruta y
 * cualquier referencia recuperable al contenido.
 */
export type UploadedFileRecord = UploadedFileRecordBase &
  (
    | {
        sourceContentRetention?: "RETAINED_IMMUTABLE";
        originalFilename: string;
        storageReference: string;
        isImmutableOriginal: true;
      }
    | {
        sourceContentRetention: "NOT_RETAINED";
        originalFilename?: never;
        storageReference?: never;
        isImmutableOriginal?: never;
      }
  );

/**
 * Enlace mínimo a un original que permanece exclusivamente en el Drive del
 * usuario. No contiene el nombre local, el PDF, texto extraído ni una URL con
 * credenciales. Solo se añade después de releer el archivo y verificar SHA-256.
 */
export interface FiscalNotificationDriveArchiveRecordV1 {
  id: string;
  ownerScope: string;
  fileId: string;
  documentIds: string[];
  sourceSha256: string;
  driveFileId: string;
  driveFolderId: string;
  documentDate: string | null;
  archiveStatus: "ARCHIVED_VERIFIED";
  reviewStatus: "USER_CONFIRMED";
  verificationMethod: "SHA256_READBACK_MATCH";
  recordVersion: 1;
  workspaceRevision: number;
  archivedAt: string;
}

export type PackageProcessingStatus =
  | "PENDING"
  | "EXTRACTED"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "FAILED";

export interface UploadedPackage {
  id: string;
  ownerScope: string;
  uploadedBy?: string;
  fileIds: string[];
  sourceChannel:
    | "MANUAL_UPLOAD"
    | "EMAIL_IMPORT_FUTURE"
    | "OFFICIAL_PORTAL_FUTURE"
    | "OTHER";
  processingStatus: PackageProcessingStatus;
  securityScanStatus: "NOT_AVAILABLE" | "PASSED" | "FAILED";
  exactDuplicateOf?: string;
  uploadedAt: string;
  receivedAt?: string;
}

export interface AdministrativeAuthority {
  id: string;
  ownerScope: string;
  administrationType: AdministrationType;
  nameRaw: string;
  nameNormalized: string;
  delegation?: string;
  department?: string;
  unit?: string;
  unitCode?: string;
  office?: string;
  address?: string;
  phone?: string;
  officialDomain?: string;
  municipality?: string;
  province?: string;
  autonomousCommunity?: string;
}

export interface NotificationDates {
  madeAvailableAt?: string;
  accessedAt?: string;
  rejectedAt?: string;
  effectiveAt?: string;
  calculationStartsAt?: string;
}

export interface AdministrativeDocument {
  id: string;
  packageId: string;
  fileId: string;
  ownerScope: string;
  documentType: AdministrativeDocumentType;
  documentSubtype?: string;
  titleRaw: string;
  titleNormalized: string;
  authorityId: string;
  issuingUnit?: string;
  issueDate?: string;
  signatureDate?: string;
  notificationDates: NotificationDates;
  subjectParty?: {
    displayName?: string;
    taxIdNormalized?: string;
    matchesBusinessProfile: "MATCH" | "MISMATCH" | "UNKNOWN";
  };
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "REPLACED" | "UNKNOWN";
  urgency: "UNKNOWN" | "REVIEW" | "UPCOMING" | "OVERDUE";
  extractionVersion: string;
  analysisStatus: "EXTRACTED" | "NEEDS_REVIEW" | "CONFIRMED" | "FAILED";
  humanReviewStatus: "PENDING" | "CONFIRMED" | "CORRECTED";
  authenticityStatus:
    | "NOT_CHECKED"
    | "CSV_PRESENT_NOT_CHECKED"
    | "USER_VERIFIED"
    | "FAILED";
  partIds: string[];
  referenceIds: string[];
  debtIds: string[];
  caseIds: string[];
  analysisSnapshotIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPart {
  id: string;
  ownerScope: string;
  documentId: string;
  type: DocumentPartType;
  pageStart: number;
  pageEnd: number;
  contentFingerprint: string;
  textNormalized: string;
  isCanonical: boolean;
  duplicateOf?: string;
  duplicateBasis?: "CONTENT_FINGERPRINT" | "PAYMENT_INSTRUMENT_FACTS";
  evidenceIds: string[];
}

export interface ExternalReference {
  id: string;
  ownerScope: string;
  referenceType: ExternalReferenceType;
  rawValue: string;
  normalizedValue: string;
  issuer: string;
  scope: "DOCUMENT" | "CASE" | "DEBT" | "PAYMENT_PLAN" | "PAYMENT";
  documentId: string;
  caseId?: string;
  debtId?: string;
  paymentPlanId?: string;
  isPrimary: boolean;
  confidence: ConfidenceBand;
  confirmationStatus: "PENDING" | "CONFIRMED" | "REJECTED";
  extractionMethod: ExtractionMethod;
  occurrenceIds: string[];
  createdAt: string;
}

export type MoneyComponentType =
  | "PRINCIPAL"
  | "INTEREST"
  | "EXECUTIVE_SURCHARGE_5"
  | "REDUCED_SURCHARGE_10"
  | "ORDINARY_SURCHARGE_20"
  | "PENALTY"
  | "COSTS"
  | "PAYMENT_ON_ACCOUNT"
  | "TOTAL_DEBT"
  | "AMOUNT_TO_PAY"
  | "OTHER";

export interface MoneyComponent {
  type: MoneyComponentType;
  amountCents: Cents;
  assertionType: AssertionType;
  evidenceIds: string[];
  deterministicTrace?: {
    ruleId: string;
    ruleVersion: number;
    officialSourceIds: string[];
    inputEvidenceIds: string[];
  };
}

export interface PaymentOption {
  id: string;
  ownerScope: string;
  documentId: string;
  title: string;
  eligibilityCondition: string;
  components: MoneyComponent[];
  totalCents?: Cents;
  deadline?: string;
  deadlineStatus: "UNKNOWN" | "PROVISIONAL" | "DOCUMENT_STATED" | "CONFIRMED";
  evidenceIds: string[];
}

export interface AdministrativeDebt {
  id: string;
  ownerScope: string;
  authorityId: string;
  debtorDisplayName?: string;
  liquidationKey?: string;
  debtKey?: string;
  concept?: string;
  taxModel?: string;
  exercise?: string;
  period?: string;
  originalPrincipalCents?: Cents;
  outstandingPrincipalCents?: Cents;
  collectionStage:
    | "VOLUNTARY"
    | "ENFORCEMENT"
    | "DEFERRAL"
    | "SEIZURE"
    | "UNKNOWN";
  voluntaryDeadline?: string;
  currentStatus:
    | "PENDING_CONFIRMATION"
    | "PENDING"
    | "IN_PAYMENT_PLAN"
    | "PAID_UNCONFIRMED"
    | "PAID"
    | "CANCELLED"
    | "UNKNOWN";
  referenceIds: string[];
  documentIds: string[];
}

/**
 * Vista inmutable de una deuda tal como aparecía en un documento concreto.
 * La deuda canónica puede agrupar varios actos, pero estas observaciones evitan
 * perder importes, fase o estado históricos durante la reconciliación.
 */
export interface AdministrativeDebtObservation {
  id: string;
  ownerScope: string;
  debtId: string;
  documentId: string;
  authorityId: string;
  observedPrincipalCents?: Cents;
  observedOutstandingCents?: Cents;
  observedCollectionStage: AdministrativeDebt["collectionStage"];
  observedStatus: AdministrativeDebt["currentStatus"];
  referenceIds: string[];
  evidenceIds: string[];
  observedAt: string;
}

export type LegacyDocumentRelationType =
  | "BELONGS_TO_CASE"
  | "DUPLICATE_COPY_OF"
  | "RELATED_TO_PAYMENT_PLAN"
  | "RELATED_TO_INSTALLMENT"
  | "POSSIBLY_RELATED";

/**
 * Los 48 tipos documentales AEAT/BOE son aditivos respecto del contrato V1.
 * Los cinco tipos legacy se conservan para poder leer workspaces históricos.
 */
export type DocumentRelationType =
  | AeatDocumentRelationTypeIdV1
  | LegacyDocumentRelationType;

export interface RelationEvidence {
  /** Cadena declarada que autoriza la topología; nunca acredita efectos. */
  chainId?: AeatDocumentChainIdV1;
  matchingReferenceTypes: ExternalReferenceType[];
  matchingAmountTypes: MoneyComponentType[];
  matchingDates: string[];
  citedText?: string;
  differences: string[];
}

export interface DocumentRelation {
  id: string;
  ownerScope: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: DocumentRelationType;
  confidenceBand: ConfidenceBand;
  score: number;
  evidence: RelationEvidence;
  algorithmVersion: string;
  status:
    | "SUGGESTED"
    | "USER_CONFIRMED"
    | "USER_REJECTED"
    | "SYSTEM_CONFIRMED_EXACT";
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface UnknownExtractedField {
  labelRaw: string;
  valueRaw: string;
  page: number;
  evidenceId?: string;
  confidence: ConfidenceBand;
}

export interface StructuredAdministrativeData {
  schemaVersion: 1;
  documentType: AdministrativeDocumentType;
  administrativeDomain?: AdministrativeDomainProjection;
  paymentOptionIds: string[];
  unknownFields: UnknownExtractedField[];
  validationCodes: string[];
  factSummary: string[];
  calculatedSummary: string[];
  inferenceSummary: string[];
  userConfirmedSummary: string[];
  documentFields: {
    title: string;
    issueDate?: string;
    effectiveNotificationDate?: string;
  };
  templateRecognition?: TemplateRecognitionResult;
}

export interface AnalysisSnapshot {
  id: string;
  ownerScope: string;
  documentId: string;
  version: number;
  extractorVersion: string;
  rulesVersion: string;
  promptVersion?: string;
  modelIdentifier?: string;
  structuredData: StructuredAdministrativeData;
  plainLanguageExplanation: string[];
  validationWarnings: string[];
  evidenceIds: string[];
  confidenceBand: ConfidenceBand;
  requiresHumanReview: boolean;
  createdAt: string;
  createdBySystem: boolean;
  supersedesAnalysisId?: string;
}

export interface PaymentPlan {
  id: string;
  ownerScope: string;
  sourceDocumentId: string;
  caseId?: string;
  authorityId: string;
  expedienteReference?: string;
  grantStatus: "PROPOSED" | "CONFIRMED" | "DENIED" | "CANCELLED";
  guaranteeType?: string;
  requestedAmountCents?: Cents;
  grantedPrincipalCents?: Cents;
  totalInterestCents?: Cents;
  totalPlanAmountCents?: Cents;
  bankAccountMasked?: string;
  status: "PENDING_CONFIRMATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate?: string;
  endDate?: string;
  debtIds: string[];
  installmentIds: string[];
}

export interface PaymentInstallment {
  id: string;
  ownerScope: string;
  paymentPlanId: string;
  sequence: number;
  dueDate?: string;
  components: MoneyComponent[];
  totalCents?: Cents;
  status:
    | "PENDING_CONFIRMATION"
    | "PENDING"
    | "PAID_UNCONFIRMED"
    | "PAID"
    | "RECONCILED"
    | "PAYMENT_REJECTED"
    | "OVERDUE_NO_PAYMENT_RECORDED"
    | "UNPAID_CONFIRMED"
    | "CANCELLED";
  paymentMatchId?: string;
  evidenceIds: string[];
  userConfirmed: boolean;
  paidAt?: string;
}

export interface InterestCalculation {
  id: string;
  ownerScope: string;
  installmentId: string;
  calculationBaseCents: Cents;
  periodFrom?: string;
  periodTo?: string;
  days?: number;
  /** Tipo anual como partes por millón de la unidad (4,0625 % = 40.625 ppm). */
  ratePartsPerMillion?: number;
  amountCents: Cents;
  evidenceIds: string[];
}

export interface DeadlineRule {
  id: string;
  ownerScope: string;
  documentId: string;
  obligationId?: string;
  triggerDateType:
    | "DOCUMENT_DATE"
    | "SIGNATURE_DATE"
    | "MADE_AVAILABLE_DATE"
    | "ACCESS_DATE"
    | "EFFECTIVE_NOTIFICATION_DATE"
    | "EXPLICIT_DUE_DATE";
  durationValue?: number;
  durationUnit?: "CALENDAR_DAYS" | "BUSINESS_DAYS" | "MONTHS" | "YEARS";
  startsNextDay: boolean;
  moveToNextBusinessDay: boolean;
  calendarJurisdiction: string;
  sourceDocumentText: string;
  ruleId: string;
  ruleVersion: number;
  officialSourceIds: string[];
  deterministicTrace: string[];
  /** @deprecated Use officialSourceIds. */
  officialSource?: string;
  legalReviewStatus: "PENDING" | "REVIEWED" | "RETIRED";
  calculatedDeadline?: string;
  provisional: boolean;
  evidenceIds: string[];
}

export type ObligationType =
  | "PAY"
  | "PROVIDE_DOCUMENTATION"
  | "RESPOND"
  | "FILE_APPEAL"
  | "ATTEND"
  | "REVIEW"
  | "OTHER";

export interface Obligation {
  id: string;
  ownerScope: string;
  sourceDocumentId: string;
  caseId?: string;
  debtId?: string;
  paymentPlanId?: string;
  installmentId?: string;
  type: ObligationType;
  title: string;
  description: string;
  amountCents?: Cents;
  components: MoneyComponent[];
  dueDate?: string;
  dueDateStatus: "UNKNOWN" | "PROVISIONAL" | "DOCUMENT_STATED" | "CONFIRMED";
  status:
    | "DRAFT"
    | "PENDING_CONFIRMATION"
    | "PENDING"
    | "SCHEDULED"
    | "PAID_UNCONFIRMED"
    | "PAID"
    | "RECONCILED"
    | "OVERDUE"
    | "UNPAID"
    | "CANCELLED"
    | "REPLACED"
    | "IN_ENFORCEMENT"
    | "UNDER_REVIEW";
  evidenceIds: string[];
  userConfirmed: boolean;
  paymentMatchId?: string;
}

export interface AdministrativeCase {
  id: string;
  ownerScope: string;
  authorityId: string;
  caseType: string;
  title: string;
  status: "DRAFT" | "OPEN" | "UNDER_REVIEW" | "CLOSED";
  openedAt: string;
  closedAt?: string;
  primaryReferenceId?: string;
  referenceIds: string[];
  documentIds: string[];
  debtIds: string[];
  obligationIds: string[];
  paymentPlanIds: string[];
  timelineEventIds: string[];
  notes: string[];
  assignedUser?: string;
}

export interface TimelineEvent {
  id: string;
  ownerScope: string;
  caseId: string;
  occurredAt: string;
  eventType:
    | "DOCUMENT_RECEIVED"
    | "DOCUMENT_CONFIRMED"
    | "OBLIGATION_CREATED"
    | "INSTALLMENT_DUE"
    | "PAYMENT_REPORTED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_RECONCILED"
    | "RELATION_CONFIRMED"
    | "ACCOUNTING_DRAFT_PROPOSED";
  documentId?: string;
  debtId?: string;
  installmentId?: string;
  relationId?: string;
  summary: string;
  evidenceIds: string[];
}

export interface AccountingDraftComponent {
  componentType: MoneyComponentType;
  amountCents: Cents;
  treatmentStatus: "PENDING_EXISTING_ENGINE" | "NEEDS_REVIEW";
  proposedAccountCode?: never;
  deductible?: never;
}

export interface AccountingDraftProposal {
  id: string;
  ownerScope: string;
  documentId: string;
  caseId?: string;
  debtId?: string;
  installmentId?: string;
  paymentMatchId?: string;
  status: "PENDING_CLASSIFICATION" | "READY_FOR_REVIEW" | "REJECTED";
  components: AccountingDraftComponent[];
  totalCents: Cents;
  requiresUserConfirmation: true;
  createsExpense: false;
  createsJournalEntry: false;
  createdAt: string;
}

export type FiscalNotificationAuditEventType =
  | "PACKAGE_UPLOADED"
  | "DOCUMENT_VIEWED"
  | "ANALYSIS_CORRECTED"
  | "ANALYSIS_CONFIRMED"
  | "CASE_ASSOCIATED"
  | "RELATION_CONFIRMED"
  | "RELATION_REJECTED"
  | "OBLIGATION_STATUS_CHANGED"
  | "PAYMENT_REPORTED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECONCILED"
  | "ACCOUNTING_DRAFT_CREATED"
  | "ORIGINAL_ARCHIVED_IN_USER_GOOGLE_DRIVE";

export interface FiscalNotificationAuditEvent {
  id: string;
  ownerScope: string;
  eventType: FiscalNotificationAuditEventType;
  entityType:
    | "PACKAGE"
    | "DOCUMENT"
    | "CASE"
    | "RELATION"
    | "OBLIGATION"
    | "INSTALLMENT"
    | "ACCOUNTING_DRAFT";
  entityId: string;
  actorScope: "LOCAL_USER" | "AUTHENTICATED_USER" | "SYSTEM";
  occurredAt: string;
  safeMetadata?: Record<string, string | number | boolean>;
}

export interface FiscalNotificationsWorkspace {
  schemaVersion: 1;
  workspaceId: string;
  ownerScope: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  packages: UploadedPackage[];
  files: UploadedFileRecord[];
  documents: AdministrativeDocument[];
  parts: DocumentPart[];
  authorities: AdministrativeAuthority[];
  references: ExternalReference[];
  evidence: FieldEvidence[];
  debts: AdministrativeDebt[];
  debtObservations: AdministrativeDebtObservation[];
  cases: AdministrativeCase[];
  relations: DocumentRelation[];
  analysisSnapshots: AnalysisSnapshot[];
  paymentOptions: PaymentOption[];
  paymentPlans: PaymentPlan[];
  installments: PaymentInstallment[];
  interestCalculations: InterestCalculation[];
  deadlineRules: DeadlineRule[];
  obligations: Obligation[];
  timeline: TimelineEvent[];
  accountingDrafts: AccountingDraftProposal[];
  auditEvents: FiscalNotificationAuditEvent[];
  /** Ausente en expedientes V1 anteriores; equivale a ningún original archivado. */
  driveArchives?: FiscalNotificationDriveArchiveRecordV1[];
}
