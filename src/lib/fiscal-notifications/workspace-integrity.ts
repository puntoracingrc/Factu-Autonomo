import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  FiscalNotificationInputError,
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";
import { validateAdministrativeDomainProjection } from "./administrative-domain";
import {
  AEAT_DOCUMENT_CHAIN_IDS_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
} from "./knowledge/aeat-document-knowledge.v1";
import type { FiscalNotificationsWorkspace } from "./types";
import { parseFiscalNotificationAmountReconciliationV1 } from "./amount-reconciliation-contract.v1";
import { parseFiscalNotificationMathematicalIntegrityV11 } from "./mathematical-integrity-contract.v11";

export type WorkspaceIntegrityIssueCode =
  | "INVALID_WORKSPACE"
  | "COLLECTION_LIMIT_EXCEEDED"
  | "DUPLICATE_ID"
  | "OWNER_SCOPE_MISMATCH"
  | "DANGLING_REFERENCE"
  | "INVALID_AMOUNT"
  | "TEXT_LIMIT_EXCEEDED"
  | "INVALID_DOMAIN_PROJECTION";

export interface WorkspaceIntegrityIssue {
  code: WorkspaceIntegrityIssueCode;
  path: string;
}

export interface WorkspaceIntegrityResult {
  valid: boolean;
  issues: readonly WorkspaceIntegrityIssue[];
}

const COLLECTIONS = [
  "packages",
  "files",
  "documents",
  "parts",
  "authorities",
  "references",
  "evidence",
  "debts",
  "debtObservations",
  "cases",
  "relations",
  "analysisSnapshots",
  "paymentOptions",
  "paymentPlans",
  "installments",
  "interestCalculations",
  "deadlineRules",
  "obligations",
  "timeline",
  "accountingDrafts",
  "auditEvents",
] as const satisfies readonly (keyof FiscalNotificationsWorkspace)[];

type CollectionName = (typeof COLLECTIONS)[number];

const ENTITY_KEYS: Readonly<Record<CollectionName, ReadonlySet<string>>> = {
  packages: new Set([
    "id", "ownerScope", "uploadedBy", "fileIds", "sourceChannel",
    "processingStatus", "securityScanStatus", "exactDuplicateOf", "uploadedAt",
    "receivedAt",
  ]),
  files: new Set([
    "id", "packageId", "ownerScope", "role", "originalFilename", "mimeType",
    "fileSize", "pageCount", "sha256", "contentFingerprint", "storageReference",
    "uploadedAt", "receivedAt", "isImmutableOriginal", "sourceContentRetention",
  ]),
  documents: new Set([
    "id", "packageId", "fileId", "ownerScope", "documentType", "documentSubtype",
    "titleRaw", "titleNormalized", "authorityId", "issuingUnit", "issueDate",
    "signatureDate", "notificationDates", "subjectParty", "status", "urgency",
    "extractionVersion", "analysisStatus", "humanReviewStatus", "authenticityStatus",
    "partIds", "referenceIds", "debtIds", "caseIds", "analysisSnapshotIds",
    "createdAt", "updatedAt",
  ]),
  parts: new Set([
    "id", "ownerScope", "documentId", "type", "pageStart", "pageEnd",
    "contentFingerprint", "textNormalized", "isCanonical", "duplicateOf",
    "duplicateBasis", "evidenceIds",
  ]),
  authorities: new Set([
    "id", "ownerScope", "administrationType", "nameRaw", "nameNormalized",
    "delegation", "department", "unit", "unitCode", "office", "address", "phone",
    "officialDomain", "municipality", "province", "autonomousCommunity",
  ]),
  references: new Set([
    "id", "ownerScope", "referenceType", "rawValue", "normalizedValue", "issuer",
    "scope", "documentId", "caseId", "debtId", "paymentPlanId", "isPrimary",
    "confidence", "confirmationStatus", "extractionMethod", "occurrenceIds", "createdAt",
  ]),
  evidence: new Set([
    "id", "ownerScope", "documentId", "partId", "pageNumber", "boundingBox",
    "textSnippet", "rawValue", "extractionMethod", "confidence", "assertionType",
    "confirmedAt", "confirmedBy",
  ]),
  debts: new Set([
    "id", "ownerScope", "authorityId", "debtorDisplayName", "liquidationKey", "debtKey",
    "concept", "taxModel", "exercise", "period", "originalPrincipalCents",
    "outstandingPrincipalCents", "collectionStage", "voluntaryDeadline", "currentStatus",
    "referenceIds", "documentIds",
  ]),
  debtObservations: new Set([
    "id", "ownerScope", "debtId", "documentId", "authorityId",
    "observedPrincipalCents", "observedOutstandingCents", "observedCollectionStage",
    "observedStatus", "referenceIds", "evidenceIds", "observedAt",
  ]),
  cases: new Set([
    "id", "ownerScope", "authorityId", "caseType", "title", "status", "openedAt",
    "closedAt", "primaryReferenceId", "referenceIds", "documentIds", "debtIds",
    "obligationIds", "paymentPlanIds", "timelineEventIds", "notes", "assignedUser",
  ]),
  relations: new Set([
    "id", "ownerScope", "sourceDocumentId", "targetDocumentId", "relationType",
    "confidenceBand", "score", "evidence", "algorithmVersion", "status", "createdAt",
    "confirmedAt", "confirmedBy", "reconciliationHistory",
  ]),
  analysisSnapshots: new Set([
    "id", "ownerScope", "documentId", "version", "extractorVersion", "rulesVersion",
    "promptVersion", "modelIdentifier", "structuredData", "plainLanguageExplanation",
    "validationWarnings", "evidenceIds", "confidenceBand", "requiresHumanReview",
    "createdAt", "createdBySystem", "supersedesAnalysisId",
  ]),
  paymentOptions: new Set([
    "id", "ownerScope", "documentId", "title", "eligibilityCondition", "components",
    "totalCents", "deadline", "deadlineStatus", "evidenceIds",
  ]),
  paymentPlans: new Set([
    "id", "ownerScope", "sourceDocumentId", "caseId", "authorityId",
    "expedienteReference", "grantStatus", "guaranteeType", "requestedAmountCents",
    "grantedPrincipalCents", "totalInterestCents", "totalPlanAmountCents",
    "bankAccountMasked", "status", "startDate", "endDate", "debtIds", "installmentIds",
  ]),
  installments: new Set([
    "id", "ownerScope", "paymentPlanId", "sequence", "dueDate", "components",
    "totalCents", "status", "paymentMatchId", "evidenceIds", "userConfirmed", "paidAt",
  ]),
  interestCalculations: new Set([
    "id", "ownerScope", "installmentId", "calculationBaseCents", "periodFrom", "periodTo",
    "days", "ratePartsPerMillion", "amountCents", "evidenceIds",
  ]),
  deadlineRules: new Set([
    "id", "ownerScope", "documentId", "obligationId", "triggerDateType", "durationValue",
    "durationUnit", "startsNextDay", "moveToNextBusinessDay", "calendarJurisdiction",
    "sourceDocumentText", "ruleId", "ruleVersion", "officialSourceIds",
    "deterministicTrace", "officialSource", "legalReviewStatus", "calculatedDeadline",
    "provisional", "evidenceIds",
  ]),
  obligations: new Set([
    "id", "ownerScope", "sourceDocumentId", "caseId", "debtId", "paymentPlanId",
    "installmentId", "type", "title", "description", "amountCents", "components",
    "dueDate", "dueDateStatus", "status", "evidenceIds", "userConfirmed", "paymentMatchId",
  ]),
  timeline: new Set([
    "id", "ownerScope", "caseId", "occurredAt", "eventType", "documentId", "debtId",
    "installmentId", "relationId", "summary", "evidenceIds",
  ]),
  accountingDrafts: new Set([
    "id", "ownerScope", "documentId", "caseId", "debtId", "installmentId",
    "paymentMatchId", "status", "components", "totalCents", "requiresUserConfirmation",
    "createsExpense", "createsJournalEntry", "createdAt",
  ]),
  auditEvents: new Set([
    "id", "ownerScope", "eventType", "entityType", "entityId", "actorScope",
    "occurredAt", "safeMetadata",
  ]),
};

const REQUIRED_ARRAY_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: ["fileIds"],
  files: [],
  documents: ["partIds", "referenceIds", "debtIds", "caseIds", "analysisSnapshotIds"],
  parts: ["evidenceIds"],
  authorities: [],
  references: ["occurrenceIds"],
  evidence: [],
  debts: ["referenceIds", "documentIds"],
  debtObservations: ["referenceIds", "evidenceIds"],
  cases: [
    "referenceIds", "documentIds", "debtIds", "obligationIds", "paymentPlanIds",
    "timelineEventIds", "notes",
  ],
  relations: [],
  analysisSnapshots: ["plainLanguageExplanation", "validationWarnings", "evidenceIds"],
  paymentOptions: ["components", "evidenceIds"],
  paymentPlans: ["debtIds", "installmentIds"],
  installments: ["components", "evidenceIds"],
  interestCalculations: ["evidenceIds"],
  deadlineRules: ["officialSourceIds", "deterministicTrace", "evidenceIds"],
  obligations: ["components", "evidenceIds"],
  timeline: ["evidenceIds"],
  accountingDrafts: ["components"],
  auditEvents: [],
};

const ID_ARRAY_FIELDS: Readonly<
  Partial<Record<CollectionName, ReadonlySet<string>>>
> = {
  packages: new Set(["fileIds"]),
  documents: new Set([
    "partIds", "referenceIds", "debtIds", "caseIds", "analysisSnapshotIds",
  ]),
  parts: new Set(["evidenceIds"]),
  references: new Set(["occurrenceIds"]),
  debts: new Set(["referenceIds", "documentIds"]),
  debtObservations: new Set(["referenceIds", "evidenceIds"]),
  cases: new Set([
    "referenceIds", "documentIds", "debtIds", "obligationIds",
    "paymentPlanIds", "timelineEventIds",
  ]),
  analysisSnapshots: new Set(["evidenceIds"]),
  paymentOptions: new Set(["evidenceIds"]),
  paymentPlans: new Set(["debtIds", "installmentIds"]),
  installments: new Set(["evidenceIds"]),
  interestCalculations: new Set(["evidenceIds"]),
  deadlineRules: new Set(["officialSourceIds", "evidenceIds"]),
  obligations: new Set(["evidenceIds"]),
  timeline: new Set(["evidenceIds"]),
};

const TEXT_ARRAY_FIELDS: Readonly<
  Partial<Record<CollectionName, ReadonlySet<string>>>
> = {
  cases: new Set(["notes"]),
  analysisSnapshots: new Set([
    "plainLanguageExplanation",
    "validationWarnings",
  ]),
  deadlineRules: new Set(["deterministicTrace"]),
};

const REQUIRED_STRING_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: ["sourceChannel", "processingStatus", "securityScanStatus", "uploadedAt"],
  files: [
    "packageId", "role", "mimeType", "sha256", "contentFingerprint", "uploadedAt",
  ],
  documents: [
    "packageId", "fileId", "documentType", "titleRaw", "titleNormalized", "authorityId",
    "status", "urgency", "extractionVersion", "analysisStatus", "humanReviewStatus",
    "authenticityStatus", "createdAt", "updatedAt",
  ],
  parts: ["documentId", "type", "contentFingerprint", "textNormalized"],
  authorities: ["administrationType", "nameRaw", "nameNormalized"],
  references: [
    "referenceType", "rawValue", "normalizedValue", "issuer", "scope", "documentId",
    "confidence", "confirmationStatus", "extractionMethod", "createdAt",
  ],
  evidence: ["documentId", "textSnippet", "extractionMethod", "confidence", "assertionType"],
  debts: ["authorityId", "collectionStage", "currentStatus"],
  debtObservations: [
    "debtId", "documentId", "authorityId", "observedCollectionStage", "observedStatus",
    "observedAt",
  ],
  cases: ["authorityId", "caseType", "title", "status", "openedAt"],
  relations: [
    "sourceDocumentId", "targetDocumentId", "relationType", "confidenceBand",
    "algorithmVersion", "status", "createdAt",
  ],
  analysisSnapshots: [
    "documentId", "extractorVersion", "rulesVersion", "confidenceBand", "createdAt",
  ],
  paymentOptions: ["documentId", "title", "eligibilityCondition", "deadlineStatus"],
  paymentPlans: ["sourceDocumentId", "authorityId", "grantStatus", "status"],
  installments: ["paymentPlanId", "status"],
  interestCalculations: ["installmentId"],
  deadlineRules: [
    "documentId", "triggerDateType", "calendarJurisdiction", "sourceDocumentText", "ruleId",
    "legalReviewStatus",
  ],
  obligations: [
    "sourceDocumentId", "type", "title", "description", "dueDateStatus", "status",
  ],
  timeline: ["caseId", "occurredAt", "eventType", "summary"],
  accountingDrafts: ["documentId", "status", "createdAt"],
  auditEvents: ["eventType", "entityType", "entityId", "actorScope", "occurredAt"],
};

const OPTIONAL_STRING_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: ["uploadedBy", "exactDuplicateOf", "receivedAt"],
  files: ["originalFilename", "storageReference", "receivedAt"],
  documents: ["documentSubtype", "issuingUnit", "issueDate", "signatureDate"],
  parts: ["duplicateOf", "duplicateBasis"],
  authorities: [
    "delegation", "department", "unit", "unitCode", "office", "address", "phone",
    "officialDomain", "municipality", "province", "autonomousCommunity",
  ],
  references: ["caseId", "debtId", "paymentPlanId"],
  evidence: ["partId", "rawValue", "confirmedAt", "confirmedBy"],
  debts: [
    "debtorDisplayName", "liquidationKey", "debtKey", "concept", "taxModel",
    "exercise", "period", "voluntaryDeadline",
  ],
  debtObservations: [],
  cases: ["closedAt", "primaryReferenceId", "assignedUser"],
  relations: ["confirmedAt", "confirmedBy"],
  analysisSnapshots: ["promptVersion", "modelIdentifier", "supersedesAnalysisId"],
  paymentOptions: ["deadline"],
  paymentPlans: [
    "caseId", "expedienteReference", "guaranteeType", "bankAccountMasked",
    "startDate", "endDate",
  ],
  installments: ["dueDate", "paymentMatchId", "paidAt"],
  interestCalculations: ["periodFrom", "periodTo"],
  deadlineRules: [
    "obligationId", "durationUnit", "officialSource", "calculatedDeadline",
  ],
  obligations: [
    "caseId", "debtId", "paymentPlanId", "installmentId", "dueDate",
    "paymentMatchId",
  ],
  timeline: ["documentId", "debtId", "installmentId", "relationId"],
  accountingDrafts: ["caseId", "debtId", "installmentId", "paymentMatchId"],
  auditEvents: [],
};

const REQUIRED_BOOLEAN_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: [],
  files: [],
  documents: [],
  parts: ["isCanonical"],
  authorities: [],
  references: ["isPrimary"],
  evidence: [],
  debts: [],
  debtObservations: [],
  cases: [],
  relations: [],
  analysisSnapshots: ["requiresHumanReview", "createdBySystem"],
  paymentOptions: [],
  paymentPlans: [],
  installments: ["userConfirmed"],
  interestCalculations: [],
  deadlineRules: ["startsNextDay", "moveToNextBusinessDay", "provisional"],
  obligations: ["userConfirmed"],
  timeline: [],
  accountingDrafts: ["requiresUserConfirmation", "createsExpense", "createsJournalEntry"],
  auditEvents: [],
};

const REQUIRED_INTEGER_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: [],
  files: ["fileSize", "pageCount"],
  documents: [],
  parts: ["pageStart", "pageEnd"],
  authorities: [],
  references: [],
  evidence: ["pageNumber"],
  debts: [],
  debtObservations: [],
  cases: [],
  relations: [],
  analysisSnapshots: ["version"],
  paymentOptions: [],
  paymentPlans: [],
  installments: ["sequence"],
  interestCalculations: [],
  deadlineRules: ["ruleVersion"],
  obligations: [],
  timeline: [],
  accountingDrafts: [],
  auditEvents: [],
};

const OPTIONAL_NON_NEGATIVE_INTEGER_FIELDS: Readonly<
  Record<CollectionName, readonly string[]>
> = {
  packages: [], files: [], documents: [], parts: [], authorities: [], references: [],
  evidence: [], debts: [], debtObservations: [], cases: [], relations: [],
  analysisSnapshots: [], paymentOptions: [], paymentPlans: [], installments: [],
  interestCalculations: ["days", "ratePartsPerMillion"],
  deadlineRules: ["durationValue"],
  obligations: [], timeline: [], accountingDrafts: [], auditEvents: [],
};

const REQUIRED_RECORD_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: [], files: [], documents: ["notificationDates"], parts: [], authorities: [],
  references: [], evidence: [], debts: [], debtObservations: [], cases: [],
  relations: ["evidence"], analysisSnapshots: ["structuredData"], paymentOptions: [],
  paymentPlans: [], installments: [], interestCalculations: [], deadlineRules: [],
  obligations: [], timeline: [], accountingDrafts: [], auditEvents: [],
};

const ISO_TIMESTAMP_FIELDS: Readonly<Record<CollectionName, readonly string[]>> = {
  packages: ["uploadedAt"],
  files: ["uploadedAt"],
  documents: ["createdAt", "updatedAt"],
  parts: [], authorities: [], references: ["createdAt"], evidence: [], debts: [],
  debtObservations: ["observedAt"], cases: ["openedAt"], relations: ["createdAt"],
  analysisSnapshots: ["createdAt"], paymentOptions: [], paymentPlans: [], installments: [],
  interestCalculations: [], deadlineRules: [], obligations: [], timeline: ["occurredAt"],
  accountingDrafts: ["createdAt"], auditEvents: ["occurredAt"],
};

const OPTIONAL_ISO_DATE_OR_TIMESTAMP_FIELDS: Readonly<
  Record<CollectionName, readonly string[]>
> = {
  packages: ["receivedAt"],
  files: ["receivedAt"],
  documents: ["issueDate", "signatureDate"],
  parts: [],
  authorities: [],
  references: [],
  evidence: ["confirmedAt"],
  debts: ["voluntaryDeadline"],
  debtObservations: [],
  cases: ["closedAt"],
  relations: ["confirmedAt"],
  analysisSnapshots: [],
  paymentOptions: ["deadline"],
  paymentPlans: ["startDate", "endDate"],
  installments: ["dueDate", "paidAt"],
  interestCalculations: ["periodFrom", "periodTo"],
  deadlineRules: ["calculatedDeadline"],
  obligations: ["dueDate"],
  timeline: [],
  accountingDrafts: [],
  auditEvents: [],
};

const WORKSPACE_KEYS = new Set<string>([
  "schemaVersion", "workspaceId", "ownerScope", "revision", "createdAt", "updatedAt",
  ...COLLECTIONS, "driveArchives",
]);
const DRIVE_ARCHIVE_KEYS = new Set([
  "id",
  "ownerScope",
  "fileId",
  "documentIds",
  "sourceSha256",
  "driveFileId",
  "driveFolderId",
  "documentDate",
  "archiveStatus",
  "reviewStatus",
  "verificationMethod",
  "recordVersion",
  "workspaceRevision",
  "archivedAt",
]);
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const GOOGLE_DRIVE_ID = /^[A-Za-z0-9_-]{1,160}$/u;
const MAX_INTEGRITY_ISSUES = 512;
const NESTED_BUDGET_ABORT = Symbol("NESTED_BUDGET_ABORT");
const ARRAY_LIMIT_EXCEEDED = Symbol("ARRAY_LIMIT_EXCEEDED");
const MONEY_COMPONENT_KEYS = new Set([
  "type",
  "amountCents",
  "assertionType",
  "evidenceIds",
  "deterministicTrace",
]);
const DETERMINISTIC_TRACE_KEYS = new Set([
  "ruleId",
  "ruleVersion",
  "officialSourceIds",
  "inputEvidenceIds",
]);
const ACCOUNTING_COMPONENT_KEYS = new Set([
  "componentType",
  "amountCents",
  "treatmentStatus",
]);
const MONEY_COMPONENT_TYPES = new Set([
  "PRINCIPAL",
  "INTEREST",
  "EXECUTIVE_SURCHARGE_5",
  "REDUCED_SURCHARGE_10",
  "ORDINARY_SURCHARGE_20",
  "PENALTY",
  "COSTS",
  "PAYMENT_ON_ACCOUNT",
  "TOTAL_DEBT",
  "AMOUNT_TO_PAY",
  "OTHER",
]);
const ASSERTION_TYPES = new Set([
  "EXPLICIT_IN_DOCUMENT",
  "CALCULATED",
  "INFERRED",
  "USER_CONFIRMED",
]);
const EXTERNAL_REFERENCE_TYPES = new Set([
  "DOCUMENT_REFERENCE",
  "EXPEDIENT_NUMBER",
  "LIQUIDATION_KEY",
  "DEBT_KEY",
  "PROCEDURE_NUMBER",
  "PAYMENT_JUSTIFICANTE",
  "CSV",
  "NRC",
  "TAX_MODEL",
  "TAX_EXERCISE",
  "TAX_PERIOD",
  "PAYMENT_MODEL",
  "VTO_RAW",
  "NOTIFICATION_ID",
  "DISTRIBUTION_BARCODE",
  "PAYMENT_BARCODE",
  "ISSUING_BODY_CODE",
  "DEBT_ORIGIN",
  "REQUEST_NUMBER",
  "REFUND_REFERENCE",
  "OFFICIAL_REGISTRY_NUMBER",
  "VEHICLE_OR_FINE_REFERENCE",
  "SOCIAL_SECURITY_REFERENCE",
  "MUNICIPAL_REFERENCE",
  "OTHER",
]);
const DOCUMENT_RELATION_TYPES = new Set([
  ...AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  "BELONGS_TO_CASE",
  "DUPLICATE_COPY_OF",
  "RELATED_TO_PAYMENT_PLAN",
  "RELATED_TO_INSTALLMENT",
  "POSSIBLY_RELATED",
]);
const DOCUMENT_CHAIN_IDS = new Set<string>(AEAT_DOCUMENT_CHAIN_IDS_V1);
const ACCOUNTING_TREATMENT_STATUSES = new Set([
  "PENDING_EXISTING_ENGINE",
  "NEEDS_REVIEW",
]);
const STRUCTURED_DATA_KEYS = new Set([
  "schemaVersion",
  "documentType",
  "administrativeDomain",
  "paymentOptionIds",
  "unknownFields",
  "validationCodes",
  "factSummary",
  "calculatedSummary",
  "inferenceSummary",
  "userConfirmedSummary",
  "amountReconciliation",
  "mathematicalIntegrity",
  "documentFields",
  "templateRecognition",
]);
const STRUCTURED_DATA_ARRAY_FIELDS = [
  "paymentOptionIds",
  "unknownFields",
  "validationCodes",
  "factSummary",
  "calculatedSummary",
  "inferenceSummary",
  "userConfirmedSummary",
] as const;
const ADMINISTRATIVE_DOMAIN_ARRAY_FIELDS = [
  "roleAssertions",
  "moneyFacts",
  "missingFieldIds",
  "alternativeFamilyIds",
  "validationIssues",
] as const;
const DOCUMENT_FIELDS_KEYS = new Set([
  "title",
  "issueDate",
  "effectiveNotificationDate",
]);
const UNKNOWN_FIELD_KEYS = new Set([
  "labelRaw",
  "valueRaw",
  "page",
  "evidenceId",
  "confidence",
]);
const TEMPLATE_RECOGNITION_KEYS = new Set([
  "traceVersion",
  "status",
  "selectedTemplateId",
  "selectedTemplateVersion",
  "reason",
  "candidates",
]);
const TEMPLATE_CANDIDATE_KEYS = new Set([
  "templateId",
  "templateVersion",
  "familyId",
  "sourceIds",
  "extractorId",
  "score",
  "matchedAnchorIds",
  "missingRequiredAnchorIds",
  "missingRequiredFieldIds",
  "excludedBy",
  "activationReady",
]);
const TEMPLATE_CANDIDATE_ARRAY_FIELDS = [
  "sourceIds",
  "matchedAnchorIds",
  "missingRequiredAnchorIds",
  "missingRequiredFieldIds",
  "excludedBy",
] as const;
const NOTIFICATION_DATES_KEYS = new Set([
  "madeAvailableAt",
  "accessedAt",
  "rejectedAt",
  "effectiveAt",
  "calculationStartsAt",
]);
const SUBJECT_PARTY_KEYS = new Set([
  "displayName",
  "taxIdNormalized",
  "matchesBusinessProfile",
]);
const BOUNDING_BOX_KEYS = new Set([
  "x",
  "y",
  "width",
  "height",
  "pageWidth",
  "pageHeight",
]);
const RELATION_EVIDENCE_KEYS = new Set([
  "chainId",
  "matchingReferenceTypes",
  "matchingAmountTypes",
  "matchingDates",
  "citedText",
  "differences",
]);
const RELATION_EVIDENCE_ARRAY_FIELDS = [
  "matchingReferenceTypes",
  "matchingAmountTypes",
  "matchingDates",
  "differences",
] as const;
const RECONCILIATION_HISTORY_KEYS = new Set([
  "ruleVersion",
  "previousStatus",
  "newStatus",
  "resultClassification",
  "previousRelationType",
  "newRelationType",
  "globalRelationType",
  "evidenceKinds",
  "reasonCode",
  "reevaluatedAt",
  "rowAssignmentReviewRequired",
]);
const RECONCILIATION_STATUSES = new Set([
  "ABSENT",
  "SUGGESTED",
  "USER_CONFIRMED",
  "USER_REJECTED",
  "SYSTEM_CONFIRMED_EXACT",
]);
const RECONCILIATION_RESULT_CLASSIFICATIONS = new Set([
  "SUGGESTED",
  "SYSTEM_CONFIRMED_EXACT",
  "SYSTEM_CONFIRMED_EXACT_CASE_LEVEL",
  "SYSTEM_CONFIRMED_EXACT_ASSET",
]);
const RECONCILIATION_GLOBAL_RELATION_TYPES = new Set([
  "RESOLUTION_ENFORCED",
  "ENFORCES_REMAINING_PLAN_PRINCIPAL",
  "ENFORCES",
  "CITED_AS_EXISTING_EXECUTIVE_DEBT",
  "OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN",
  "RELEASES_SEIZURE",
  "RELEASED_ASSET_LATER_RESEIZED",
  "POSSIBLY_PRECEDES_ASSESSMENT",
  "NOTIFICATION_EVIDENCE_FOR",
]);
const RECONCILIATION_EVIDENCE_KINDS = new Set([
  "EXACT_REFERENCE",
  "PAYMENT_FORM_PART",
  "COMPATIBLE_AMOUNT",
  "REMAINING_PLAN_PRINCIPAL",
  "EXECUTIVE_DEBT_CITATION",
  "MODIFIED_PLAN_STRUCTURE",
  "RECALCULATED_OFFSET_ROWS",
  "EXACT_SEIZURE_REFERENCE",
  "OWNER_SCOPED_OPAQUE_ASSET",
  "MODEL_AND_FISCAL_YEAR",
  "NOTIFICATION_PROOF_REFERENCE",
  "MATHEMATICAL_INTEGRITY_VALIDATED",
]);
const OBLIGATION_STATUSES = new Set([
  "DRAFT",
  "PENDING_CONFIRMATION",
  "PENDING",
  "SCHEDULED",
  "PAID_UNCONFIRMED",
  "PAID",
  "RECONCILED",
  "OVERDUE",
  "UNPAID",
  "CANCELLED",
  "REPLACED",
  "IN_ENFORCEMENT",
  "UNDER_REVIEW",
]);
const ENTITY_ENUM_FIELDS: Readonly<
  Partial<
    Record<CollectionName, Readonly<Record<string, ReadonlySet<string>>>>
  >
> = {
  packages: {
    sourceChannel: new Set([
      "MANUAL_UPLOAD",
      "EMAIL_IMPORT_FUTURE",
      "OFFICIAL_PORTAL_FUTURE",
      "OTHER",
    ]),
    processingStatus: new Set([
      "PENDING",
      "EXTRACTED",
      "NEEDS_REVIEW",
      "CONFIRMED",
      "FAILED",
    ]),
    securityScanStatus: new Set(["NOT_AVAILABLE", "PASSED", "FAILED"]),
  },
  files: {
    role: new Set(["PRIMARY", "ANNEX", "NOTIFICATION_PROOF"]),
    sourceContentRetention: new Set([
      "RETAINED_IMMUTABLE",
      "NOT_RETAINED",
    ]),
  },
  documents: {
    documentType: new Set([
      "AEAT_ENFORCEMENT_ORDER",
      "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
      "AEAT_OFFSET_AGREEMENT",
      "AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL",
      "AEAT_PAYMENT_FORM",
      "AEAT_INFORMATION_REQUEST",
      "AEAT_ASSESSMENT_PROPOSAL",
      "AEAT_ASSESSMENT",
      "AEAT_SANCTION_PROPOSAL",
      "AEAT_SANCTION_DECISION",
      "AEAT_SEIZURE_ORDER",
      "TGSS_DEBT_NOTICE",
      "TGSS_ENFORCEMENT_NOTICE",
      "MUNICIPAL_FINE",
      "MUNICIPAL_TAX_NOTICE",
      "REGIONAL_AUTHORITY_NOTICE",
      "GENERIC_ADMINISTRATIVE_NOTICE",
      "UNKNOWN",
    ]),
    status: new Set(["DRAFT", "ACTIVE", "CLOSED", "REPLACED", "UNKNOWN"]),
    urgency: new Set(["UNKNOWN", "REVIEW", "UPCOMING", "OVERDUE"]),
    analysisStatus: new Set(["EXTRACTED", "NEEDS_REVIEW", "CONFIRMED", "FAILED"]),
    humanReviewStatus: new Set(["PENDING", "CONFIRMED", "CORRECTED"]),
    authenticityStatus: new Set([
      "NOT_CHECKED",
      "CSV_PRESENT_NOT_CHECKED",
      "USER_VERIFIED",
      "FAILED",
    ]),
  },
  parts: {
    type: new Set([
      "MAIN_ACT",
      "PAYMENT_FORM",
      "PAYMENT_INSTRUCTIONS",
      "ANNEX_DEBTS",
      "ANNEX_INSTALLMENTS",
      "ANNEX_INTEREST",
      "LEGAL_REFERENCES",
      "COPY_FOR_RECIPIENT",
      "COPY_FOR_BANK",
      "OTHER",
    ]),
    duplicateBasis: new Set([
      "CONTENT_FINGERPRINT",
      "PAYMENT_INSTRUMENT_FACTS",
    ]),
  },
  authorities: {
    administrationType: new Set([
      "AEAT",
      "TGSS",
      "LOCAL",
      "REGIONAL",
      "STATE_OTHER",
      "OTHER",
    ]),
  },
  references: {
    referenceType: EXTERNAL_REFERENCE_TYPES,
    scope: new Set(["DOCUMENT", "CASE", "DEBT", "PAYMENT_PLAN", "PAYMENT"]),
    confidence: new Set(["LOW", "MEDIUM", "HIGH", "EXACT"]),
    confirmationStatus: new Set(["PENDING", "CONFIRMED", "REJECTED"]),
    extractionMethod: new Set(["TEXT_LAYER", "OCR", "RULE", "AI", "USER"]),
  },
  evidence: {
    extractionMethod: new Set(["TEXT_LAYER", "OCR", "RULE", "AI", "USER"]),
    confidence: new Set(["LOW", "MEDIUM", "HIGH", "EXACT"]),
    assertionType: ASSERTION_TYPES,
  },
  debts: {
    collectionStage: new Set(["VOLUNTARY", "ENFORCEMENT", "DEFERRAL", "SEIZURE", "UNKNOWN"]),
    currentStatus: new Set([
      "PENDING_CONFIRMATION",
      "PENDING",
      "IN_PAYMENT_PLAN",
      "PAID_UNCONFIRMED",
      "PAID",
      "CANCELLED",
      "UNKNOWN",
    ]),
  },
  debtObservations: {
    observedCollectionStage: new Set(["VOLUNTARY", "ENFORCEMENT", "DEFERRAL", "SEIZURE", "UNKNOWN"]),
    observedStatus: new Set([
      "PENDING_CONFIRMATION",
      "PENDING",
      "IN_PAYMENT_PLAN",
      "PAID_UNCONFIRMED",
      "PAID",
      "CANCELLED",
      "UNKNOWN",
    ]),
  },
  cases: { status: new Set(["DRAFT", "OPEN", "UNDER_REVIEW", "CLOSED"]) },
  relations: {
    relationType: DOCUMENT_RELATION_TYPES,
    confidenceBand: new Set(["LOW", "MEDIUM", "HIGH", "EXACT"]),
    status: new Set([
      "SUGGESTED",
      "USER_CONFIRMED",
      "USER_REJECTED",
      "SYSTEM_CONFIRMED_EXACT",
    ]),
  },
  analysisSnapshots: {
    confidenceBand: new Set(["LOW", "MEDIUM", "HIGH", "EXACT"]),
  },
  paymentOptions: {
    deadlineStatus: new Set(["UNKNOWN", "PROVISIONAL", "DOCUMENT_STATED", "CONFIRMED"]),
  },
  paymentPlans: {
    grantStatus: new Set(["PROPOSED", "CONFIRMED", "DENIED", "CANCELLED"]),
    status: new Set(["PENDING_CONFIRMATION", "ACTIVE", "COMPLETED", "CANCELLED"]),
  },
  installments: {
    status: new Set([
      "PENDING_CONFIRMATION",
      "PENDING",
      "PAID_UNCONFIRMED",
      "PAID",
      "RECONCILED",
      "PAYMENT_REJECTED",
      "OVERDUE_NO_PAYMENT_RECORDED",
      "UNPAID_CONFIRMED",
      "CANCELLED",
    ]),
  },
  deadlineRules: {
    triggerDateType: new Set([
      "DOCUMENT_DATE",
      "SIGNATURE_DATE",
      "MADE_AVAILABLE_DATE",
      "ACCESS_DATE",
      "EFFECTIVE_NOTIFICATION_DATE",
      "EXPLICIT_DUE_DATE",
    ]),
    durationUnit: new Set(["CALENDAR_DAYS", "BUSINESS_DAYS", "MONTHS", "YEARS"]),
    legalReviewStatus: new Set(["PENDING", "REVIEWED", "RETIRED"]),
  },
  obligations: {
    type: new Set(["PAY", "PROVIDE_DOCUMENTATION", "RESPOND", "FILE_APPEAL", "ATTEND", "REVIEW", "OTHER"]),
    dueDateStatus: new Set(["UNKNOWN", "PROVISIONAL", "DOCUMENT_STATED", "CONFIRMED"]),
    status: OBLIGATION_STATUSES,
  },
  timeline: {
    eventType: new Set([
      "DOCUMENT_RECEIVED",
      "DOCUMENT_CONFIRMED",
      "OBLIGATION_CREATED",
      "INSTALLMENT_DUE",
      "PAYMENT_REPORTED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECONCILED",
      "RELATION_CONFIRMED",
      "ACCOUNTING_DRAFT_PROPOSED",
    ]),
  },
  accountingDrafts: {
    status: new Set(["PENDING_CLASSIFICATION", "READY_FOR_REVIEW", "REJECTED"]),
  },
  auditEvents: {
    eventType: new Set([
      "PACKAGE_UPLOADED",
      "DOCUMENT_VIEWED",
      "ANALYSIS_CORRECTED",
      "ANALYSIS_CONFIRMED",
      "CASE_ASSOCIATED",
      "RELATION_CONFIRMED",
      "RELATION_REJECTED",
      "OBLIGATION_STATUS_CHANGED",
      "PAYMENT_REPORTED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECONCILED",
      "ACCOUNTING_DRAFT_CREATED",
      "ORIGINAL_ARCHIVED_IN_USER_GOOGLE_DRIVE",
    ]),
    entityType: new Set([
      "PACKAGE",
      "DOCUMENT",
      "CASE",
      "RELATION",
      "OBLIGATION",
      "INSTALLMENT",
      "ACCOUNTING_DRAFT",
    ]),
    actorScope: new Set(["LOCAL_USER", "AUTHENTICATED_USER", "SYSTEM"]),
  },
};

type AuditMetadataRule =
  | "NON_NEGATIVE_INTEGER"
  | "SCORE"
  | "OBLIGATION_STATUS";

const AUDIT_METADATA_SCHEMAS: Readonly<
  Record<string, Readonly<Record<string, AuditMetadataRule>>>
> = {
  PACKAGE_UPLOADED: { fileCount: "NON_NEGATIVE_INTEGER" },
  DOCUMENT_VIEWED: {
    pageCount: "NON_NEGATIVE_INTEGER",
    pageNumber: "NON_NEGATIVE_INTEGER",
  },
  ANALYSIS_CORRECTED: {
    snapshotVersion: "NON_NEGATIVE_INTEGER",
    changedFieldCount: "NON_NEGATIVE_INTEGER",
  },
  ANALYSIS_CONFIRMED: { snapshotVersion: "NON_NEGATIVE_INTEGER" },
  CASE_ASSOCIATED: { documentCount: "NON_NEGATIVE_INTEGER" },
  RELATION_CONFIRMED: { score: "SCORE" },
  RELATION_REJECTED: { score: "SCORE" },
  OBLIGATION_STATUS_CHANGED: { statusCode: "OBLIGATION_STATUS" },
  PAYMENT_REPORTED: { sequence: "NON_NEGATIVE_INTEGER" },
  PAYMENT_CONFIRMED: { sequence: "NON_NEGATIVE_INTEGER" },
  PAYMENT_RECONCILED: { sequence: "NON_NEGATIVE_INTEGER" },
  ACCOUNTING_DRAFT_CREATED: { componentCount: "NON_NEGATIVE_INTEGER" },
  ORIGINAL_ARCHIVED_IN_USER_GOOGLE_DRIVE: {
    archiveRecordVersion: "NON_NEGATIVE_INTEGER",
    archivedDocumentCount: "NON_NEGATIVE_INTEGER",
  },
};

const AUDIT_EVENT_ENTITY_TYPES = Object.freeze({
  PACKAGE_UPLOADED: "PACKAGE",
  DOCUMENT_VIEWED: "DOCUMENT",
  ANALYSIS_CORRECTED: "DOCUMENT",
  ANALYSIS_CONFIRMED: "DOCUMENT",
  CASE_ASSOCIATED: "CASE",
  RELATION_CONFIRMED: "RELATION",
  RELATION_REJECTED: "RELATION",
  OBLIGATION_STATUS_CHANGED: "OBLIGATION",
  PAYMENT_REPORTED: "INSTALLMENT",
  PAYMENT_CONFIRMED: "INSTALLMENT",
  PAYMENT_RECONCILED: "INSTALLMENT",
  ACCOUNTING_DRAFT_CREATED: "ACCOUNTING_DRAFT",
  ORIGINAL_ARCHIVED_IN_USER_GOOGLE_DRIVE: "DOCUMENT",
} as const);

const UNSAFE_AUDIT_STRING_PREFIXES = [
  "nif",
  "taxid",
  "iban",
  "bankaccount",
  "csvvalue",
  "rawvalue",
  "textsnippet",
  "documenttext",
  "filename",
  "prompt",
] as const;

/**
 * Deep, read-only integrity check for an already materialized local workspace.
 * It deliberately has no persistence side effects; repository integration is a
 * later, separately coordinated block.
 */
export function validateFiscalNotificationsWorkspaceIntegrity(
  value: unknown,
  expectedOwnerScope: string,
): WorkspaceIntegrityResult {
  const issues: WorkspaceIntegrityIssue[] = [];
  const addIssue = (code: WorkspaceIntegrityIssueCode, path: string): void => {
    if (issues.length < MAX_INTEGRITY_ISSUES) issues.push({ code, path });
  };
  try {
    assertBoundedOwnerScope(expectedOwnerScope, "expectedOwnerScope");
  } catch {
    return invalid("INVALID_WORKSPACE", "expectedOwnerScope");
  }
  const workspaceRecord = snapshotDataRecord(value);
  if (!workspaceRecord) return invalid("INVALID_WORKSPACE", "workspace");
  for (const key of Reflect.ownKeys(workspaceRecord)) {
    if (typeof key !== "string" || !WORKSPACE_KEYS.has(key)) {
      return invalid("INVALID_WORKSPACE", "workspace.$unknown");
    }
  }
  if (workspaceRecord.ownerScope !== expectedOwnerScope) {
    return invalid("OWNER_SCOPE_MISMATCH", "workspace.ownerScope");
  }
  if (workspaceRecord.schemaVersion !== 1) {
    return invalid("INVALID_WORKSPACE", "workspace.schemaVersion");
  }
  try {
    assertBoundedId(workspaceRecord.workspaceId, "workspace.workspaceId");
  } catch {
    return invalid("INVALID_WORKSPACE", "workspace.workspaceId");
  }
  if (
    !Number.isSafeInteger(workspaceRecord.revision) ||
    Number(workspaceRecord.revision) < 0
  ) {
    return invalid("INVALID_WORKSPACE", "workspace.revision");
  }
  if (!isIsoTimestamp(workspaceRecord.createdAt)) {
    return invalid("INVALID_WORKSPACE", "workspace.createdAt");
  }
  if (!isIsoTimestamp(workspaceRecord.updatedAt)) {
    return invalid("INVALID_WORKSPACE", "workspace.updatedAt");
  }

  let workspaceItemCount = 0;
  const consumeNested = (length: number, path: string): boolean => {
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems
    ) {
      addIssue("COLLECTION_LIMIT_EXCEEDED", path);
      throw NESTED_BUDGET_ABORT;
    }
    workspaceItemCount += length;
    if (
      workspaceItemCount >
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities
    ) {
      addIssue("COLLECTION_LIMIT_EXCEEDED", "workspace.nestedItems");
      throw NESTED_BUDGET_ABORT;
    }
    return true;
  };
  let workspaceTextChars = 0;
  const consumeText = (value: unknown, path: string): boolean => {
    if (
      typeof value !== "string" ||
      value.length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars ||
      value.includes("\u0000")
    ) {
      addIssue("TEXT_LIMIT_EXCEEDED", path);
      throw NESTED_BUDGET_ABORT;
    }
    workspaceTextChars += value.length;
    if (
      workspaceTextChars >
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceTextChars
    ) {
      addIssue("TEXT_LIMIT_EXCEEDED", "workspace.text");
      throw NESTED_BUDGET_ABORT;
    }
    return true;
  };
  consumeText(workspaceRecord.workspaceId, "workspace.workspaceId");
  consumeText(workspaceRecord.ownerScope, "workspace.ownerScope");
  consumeText(workspaceRecord.createdAt, "workspace.createdAt");
  consumeText(workspaceRecord.updatedAt, "workspace.updatedAt");

  // Each top-level collection is snapshotted exactly once before inspection.
  // This keeps sparse and hostile arrays from changing length between the
  // budget preflight and the defensive copy.
  const sanitizedWorkspace: Record<string, unknown> = {
    ...workspaceRecord,
  };
  const collectionPreflight = new Map<
    CollectionName,
    { readonly value: unknown; readonly length: number }
  >();
  try {
    for (const collection of COLLECTIONS) {
      const candidate =
        collection === "debtObservations" &&
        workspaceRecord[collection] === undefined
          ? []
          : workspaceRecord[collection];
      const length = boundedDataArrayLength(
        candidate,
        FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
      );
      if (length === ARRAY_LIMIT_EXCEEDED) {
        return invalid(
          "COLLECTION_LIMIT_EXCEEDED",
          `workspace.${collection}`,
        );
      }
      if (length === null) {
        return invalid("INVALID_WORKSPACE", `workspace.${collection}`);
      }
      workspaceItemCount += length;
      if (
        workspaceItemCount >
        FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities
      ) {
        return invalid("COLLECTION_LIMIT_EXCEEDED", "workspace.collections");
      }
      collectionPreflight.set(collection, { value: candidate, length });
    }
    for (const collection of COLLECTIONS) {
      const preflight = collectionPreflight.get(collection)!;
      const entries = snapshotDataArrayAtLength(
        preflight.value,
        preflight.length,
      );
      if (!entries) {
        return invalid("INVALID_WORKSPACE", `workspace.${collection}`);
      }
      const entitySnapshots: Record<string, unknown>[] = [];
      for (let index = 0; index < entries.length; index += 1) {
        const entity = snapshotDataRecord(entries[index]);
        if (!entity) {
          addIssue("INVALID_WORKSPACE", `workspace.${collection}[${index}]`);
          continue;
        }
        validateEntityStructure(
          collection,
          entity,
          `workspace.${collection}[${index}]`,
          addIssue,
          consumeNested,
          consumeText,
        );
        entitySnapshots.push(entity);
      }
      const frozenEntities = Object.freeze(entitySnapshots);
      sanitizedWorkspace[collection] = frozenEntities;
    }
    if (workspaceRecord.driveArchives !== undefined) {
      const archiveLength = boundedDataArrayLength(
        workspaceRecord.driveArchives,
        FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
      );
      if (archiveLength === ARRAY_LIMIT_EXCEEDED) {
        return invalid(
          "COLLECTION_LIMIT_EXCEEDED",
          "workspace.driveArchives",
        );
      }
      if (archiveLength === null) {
        return invalid("INVALID_WORKSPACE", "workspace.driveArchives");
      }
      workspaceItemCount += archiveLength;
      if (
        workspaceItemCount >
        FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities
      ) {
        return invalid("COLLECTION_LIMIT_EXCEEDED", "workspace.collections");
      }
      const archives = snapshotDataArrayAtLength(
        workspaceRecord.driveArchives,
        archiveLength,
      );
      if (!archives) {
        return invalid("INVALID_WORKSPACE", "workspace.driveArchives");
      }
      const snapshots: Record<string, unknown>[] = [];
      for (let index = 0; index < archives.length; index += 1) {
        const archive = snapshotDataRecord(archives[index]);
        const path = `workspace.driveArchives[${index}]`;
        if (!archive) {
          addIssue("INVALID_WORKSPACE", path);
          continue;
        }
        validateDriveArchiveStructure(
          archive,
          path,
          addIssue,
          consumeNested,
          consumeText,
        );
        snapshots.push(archive);
      }
      sanitizedWorkspace.driveArchives = Object.freeze(snapshots);
    }
  } catch (error) {
    if (error === NESTED_BUDGET_ABORT) return freezeIntegrityResult(issues);
    return invalid("INVALID_WORKSPACE", "workspace.collections");
  }
  if (issues.length > 0) return freezeIntegrityResult(issues);

  // The complete shape, owner scope and every collection were validated and
  // defensively snapshotted above. Keep N1 self-contained instead of depending
  // on the later persistence/workspace factory block.
  const workspace = sanitizedWorkspace as unknown as FiscalNotificationsWorkspace;

  try {
  const ids = new Map<CollectionName, Set<string>>();
  for (const collection of COLLECTIONS) {
    const collectionIds = new Set<string>();
    const entries = workspace[collection] as readonly { id?: unknown; ownerScope?: unknown }[];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]!;
      const path = `workspace.${collection}[${index}]`;
      if (entry.ownerScope !== expectedOwnerScope) {
        addIssue("OWNER_SCOPE_MISMATCH", `${path}.ownerScope`);
      }
      try {
        assertBoundedId(entry.id, `${path}.id`);
      } catch {
        addIssue("INVALID_WORKSPACE", `${path}.id`);
        continue;
      }
      if (collectionIds.has(entry.id)) {
        addIssue("DUPLICATE_ID", `${path}.id`);
      } else {
        collectionIds.add(entry.id);
      }
    }
    ids.set(collection, collectionIds);
  }

  const has = (collection: CollectionName, id: string | undefined): boolean =>
    id === undefined || ids.get(collection)!.has(id);
  const requireOptionalRef = (
    collection: CollectionName,
    id: unknown,
    path: string,
  ): void => {
    if (id === undefined) return;
    try {
      assertBoundedId(id, path);
    } catch {
      addIssue("INVALID_WORKSPACE", path);
      return;
    }
    if (!has(collection, id)) {
      addIssue("DANGLING_REFERENCE", path);
    }
  };
  const requireRequiredRef = (
    collection: CollectionName,
    id: unknown,
    path: string,
  ): void => {
    if (typeof id !== "string") {
      addIssue("INVALID_WORKSPACE", path);
      return;
    }
    requireOptionalRef(collection, id, path);
  };
  const requireRefs = (
    collection: CollectionName,
    values: unknown,
    path: string,
    countText = false,
  ): readonly string[] | null => {
    const refs = snapshotDataArray(
      values,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
    );
    if (refs === ARRAY_LIMIT_EXCEEDED) {
      addIssue("COLLECTION_LIMIT_EXCEEDED", path);
      return null;
    }
    if (!refs) {
      addIssue("INVALID_WORKSPACE", path);
      return null;
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (let index = 0; index < refs.length; index += 1) {
      const id = refs[index];
      if (typeof id !== "string" || seen.has(id)) {
        addIssue("INVALID_WORKSPACE", `${path}[${index}]`);
        continue;
      }
      if (countText) consumeText(id, `${path}[${index}]`);
      seen.add(id);
      result.push(id);
      requireRequiredRef(collection, id, `${path}[${index}]`);
    }
    return Object.freeze(result);
  };
  const evidenceById = new Map(workspace.evidence.map((item) => [item.id, item]));
  const packageFileIdsById = new Map(
    workspace.packages.map((item) => [item.id, new Set(item.fileIds)]),
  );
  const filesById = new Map(workspace.files.map((item) => [item.id, item]));
  const documentsById = new Map(
    workspace.documents.map((item) => [item.id, item]),
  );
  const documentPartIdsById = new Map(
    workspace.documents.map((item) => [item.id, new Set(item.partIds)]),
  );
  const documentReferenceIdsById = new Map(
    workspace.documents.map((item) => [item.id, new Set(item.referenceIds)]),
  );
  const documentDebtIdsById = new Map(
    workspace.documents.map((item) => [item.id, new Set(item.debtIds)]),
  );
  const documentCaseIdsById = new Map(
    workspace.documents.map((item) => [item.id, new Set(item.caseIds)]),
  );
  const documentSnapshotIdsById = new Map(
    workspace.documents.map((item) => [
      item.id,
      new Set(item.analysisSnapshotIds),
    ]),
  );
  const partsById = new Map(workspace.parts.map((item) => [item.id, item]));
  const referencesById = new Map(workspace.references.map((item) => [item.id, item]));
  const debtDocumentIdsById = new Map(
    workspace.debts.map((item) => [item.id, new Set(item.documentIds)]),
  );
  const debtsById = new Map(workspace.debts.map((item) => [item.id, item]));
  const caseDocumentIdsById = new Map(
    workspace.cases.map((item) => [item.id, new Set(item.documentIds)]),
  );
  const caseDebtIdsById = new Map(
    workspace.cases.map((item) => [item.id, new Set(item.debtIds)]),
  );
  const caseReferenceIdsById = new Map(
    workspace.cases.map((item) => [item.id, new Set(item.referenceIds)]),
  );
  const debtReferenceIdsById = new Map(
    workspace.debts.map((item) => [item.id, new Set(item.referenceIds)]),
  );
  const snapshotsById = new Map(
    workspace.analysisSnapshots.map((item) => [item.id, item]),
  );
  const paymentOptionsById = new Map(
    workspace.paymentOptions.map((item) => [item.id, item]),
  );
  const plansById = new Map(workspace.paymentPlans.map((item) => [item.id, item]));
  const planDebtIdsById = new Map(
    workspace.paymentPlans.map((item) => [item.id, new Set(item.debtIds)]),
  );
  const obligationsById = new Map(
    workspace.obligations.map((item) => [item.id, item]),
  );
  const caseObligationIdsById = new Map(
    workspace.cases.map((item) => [item.id, new Set(item.obligationIds)]),
  );
  const casePaymentPlanIdsById = new Map(
    workspace.cases.map((item) => [item.id, new Set(item.paymentPlanIds)]),
  );
  const planInstallmentIdsById = new Map(
    workspace.paymentPlans.map((item) => [item.id, new Set(item.installmentIds)]),
  );
  const installmentsById = new Map(
    workspace.installments.map((item) => [item.id, item]),
  );
  const caseTimelineIdsById = new Map(
    workspace.cases.map((item) => [item.id, new Set(item.timelineEventIds)]),
  );
  const timelineById = new Map(workspace.timeline.map((item) => [item.id, item]));
  const requireDocumentEvidence = (
    values: unknown,
    path: string,
    documentId: unknown,
    countText = false,
  ): void => {
    const evidenceIds = requireRefs("evidence", values, path, countText);
    if (!evidenceIds || typeof documentId !== "string") {
      return;
    }
    for (let index = 0; index < evidenceIds.length; index += 1) {
      const evidence = evidenceById.get(evidenceIds[index]!);
      if (
        evidence &&
        (evidence.ownerScope !== expectedOwnerScope ||
          evidence.documentId !== documentId)
      ) {
        addIssue("DANGLING_REFERENCE", `${path}[${index}]`);
      }
    }
  };
  const requireEvidenceWithinDocuments = (
    values: unknown,
    path: string,
    allowedDocumentIds: ReadonlySet<string>,
    additionalAllowedDocumentIds?: ReadonlySet<string>,
  ): void => {
    const evidenceIds = requireRefs("evidence", values, path);
    if (!evidenceIds) return;
    for (let index = 0; index < evidenceIds.length; index += 1) {
      const evidence = evidenceById.get(evidenceIds[index]!);
      if (
        evidence &&
        (evidence.ownerScope !== expectedOwnerScope ||
          !allowedDocumentIds.has(evidence.documentId) ||
          (additionalAllowedDocumentIds !== undefined &&
            !additionalAllowedDocumentIds.has(evidence.documentId)))
      ) {
        addIssue("DANGLING_REFERENCE", `${path}[${index}]`);
      }
    }
  };

  const seenDriveArchiveIds = new Set<string>();
  const seenDriveArchiveFileIds = new Set<string>();
  const seenDriveArchiveHashes = new Set<string>();
  const seenGoogleDriveFileIds = new Set<string>();
  for (
    let index = 0;
    index < (workspace.driveArchives ?? []).length;
    index += 1
  ) {
    const item = workspace.driveArchives![index]!;
    const path = `workspace.driveArchives[${index}]`;
    if (item.ownerScope !== expectedOwnerScope) {
      addIssue("OWNER_SCOPE_MISMATCH", `${path}.ownerScope`);
    }
    if (seenDriveArchiveIds.has(item.id)) {
      addIssue("DUPLICATE_ID", `${path}.id`);
    }
    seenDriveArchiveIds.add(item.id);
    if (
      seenDriveArchiveFileIds.has(item.fileId) ||
      seenDriveArchiveHashes.has(item.sourceSha256) ||
      seenGoogleDriveFileIds.has(item.driveFileId)
    ) {
      addIssue("DUPLICATE_ID", `${path}.fileId`);
    }
    seenDriveArchiveFileIds.add(item.fileId);
    seenDriveArchiveHashes.add(item.sourceSha256);
    seenGoogleDriveFileIds.add(item.driveFileId);
    requireRequiredRef("files", item.fileId, `${path}.fileId`);
    const sourceFile = filesById.get(item.fileId);
    if (sourceFile && sourceFile.sha256 !== item.sourceSha256) {
      addIssue("DANGLING_REFERENCE", `${path}.sourceSha256`);
    }
    const documentIds = requireRefs(
      "documents",
      item.documentIds,
      `${path}.documentIds`,
    );
    for (
      let documentIndex = 0;
      documentIds && documentIndex < documentIds.length;
      documentIndex += 1
    ) {
      if (documentsById.get(documentIds[documentIndex]!)?.fileId !== item.fileId) {
        addIssue(
          "DANGLING_REFERENCE",
          `${path}.documentIds[${documentIndex}]`,
        );
      }
    }
    if (item.workspaceRevision > workspace.revision) {
      addIssue("INVALID_WORKSPACE", `${path}.workspaceRevision`);
    }
  }

  for (let index = 0; index < workspace.packages.length; index += 1) {
    const item = workspace.packages[index]!;
    const path = `workspace.packages[${index}]`;
    const fileIds = requireRefs("files", item.fileIds, `${path}.fileIds`);
    for (let fileIndex = 0; fileIds && fileIndex < fileIds.length; fileIndex += 1) {
      if (filesById.get(fileIds[fileIndex]!)?.packageId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.fileIds[${fileIndex}]`);
      }
    }
    requireOptionalRef(
      "packages",
      item.exactDuplicateOf,
      `${path}.exactDuplicateOf`,
    );
  }
  for (let index = 0; index < workspace.files.length; index += 1) {
    const item = workspace.files[index]!;
    const path = `workspace.files[${index}]`;
    requireRequiredRef("packages", item.packageId, `${path}.packageId`);
    const packageFileIds = packageFileIdsById.get(item.packageId);
    if (packageFileIds && !packageFileIds.has(item.id)) {
      addIssue("DANGLING_REFERENCE", `${path}.packageId`);
    }
  }
  for (let index = 0; index < workspace.documents.length; index += 1) {
    const item = workspace.documents[index]!;
    const path = `workspace.documents[${index}]`;
    requireRequiredRef("packages", item.packageId, `${path}.packageId`);
    requireRequiredRef("files", item.fileId, `${path}.fileId`);
    requireRequiredRef("authorities", item.authorityId, `${path}.authorityId`);
    const documentFile = filesById.get(item.fileId);
    if (documentFile && documentFile.packageId !== item.packageId) {
      addIssue("DANGLING_REFERENCE", `${path}.fileId`);
    }
    const partIds = requireRefs("parts", item.partIds, `${path}.partIds`);
    for (let childIndex = 0; partIds && childIndex < partIds.length; childIndex += 1) {
      if (partsById.get(partIds[childIndex]!)?.documentId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.partIds[${childIndex}]`);
      }
    }
    const referenceIds = requireRefs("references", item.referenceIds, `${path}.referenceIds`);
    for (let childIndex = 0; referenceIds && childIndex < referenceIds.length; childIndex += 1) {
      if (referencesById.get(referenceIds[childIndex]!)?.documentId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.referenceIds[${childIndex}]`);
      }
    }
    const debtIds = requireRefs("debts", item.debtIds, `${path}.debtIds`);
    for (let childIndex = 0; debtIds && childIndex < debtIds.length; childIndex += 1) {
      if (!debtDocumentIdsById.get(debtIds[childIndex]!)?.has(item.id)) {
        addIssue("DANGLING_REFERENCE", `${path}.debtIds[${childIndex}]`);
      }
    }
    const caseIds = requireRefs("cases", item.caseIds, `${path}.caseIds`);
    for (let childIndex = 0; caseIds && childIndex < caseIds.length; childIndex += 1) {
      if (!caseDocumentIdsById.get(caseIds[childIndex]!)?.has(item.id)) {
        addIssue("DANGLING_REFERENCE", `${path}.caseIds[${childIndex}]`);
      }
    }
    const analysisIds = requireRefs(
      "analysisSnapshots",
      item.analysisSnapshotIds,
      `${path}.analysisSnapshotIds`,
    );
    for (let childIndex = 0; analysisIds && childIndex < analysisIds.length; childIndex += 1) {
      if (snapshotsById.get(analysisIds[childIndex]!)?.documentId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.analysisSnapshotIds[${childIndex}]`);
      }
    }
    const seenSnapshotVersions = new Set<number>();
    let previousSnapshot: (typeof workspace.analysisSnapshots)[number] | undefined;
    for (
      let snapshotIndex = 0;
      analysisIds && snapshotIndex < analysisIds.length;
      snapshotIndex += 1
    ) {
      const snapshot = snapshotsById.get(analysisIds[snapshotIndex]!);
      if (!snapshot || snapshot.documentId !== item.id) continue;
      const snapshotPath = `${path}.analysisSnapshotIds[${snapshotIndex}]`;
      if (snapshot.version < 1 || seenSnapshotVersions.has(snapshot.version)) {
        addIssue("INVALID_WORKSPACE", snapshotPath);
      }
      if (!previousSnapshot) {
        if (snapshot.supersedesAnalysisId !== undefined) {
          addIssue("INVALID_WORKSPACE", snapshotPath);
        }
      } else if (
        snapshot.version <= previousSnapshot.version ||
        snapshot.supersedesAnalysisId !== previousSnapshot.id
      ) {
        addIssue("INVALID_WORKSPACE", snapshotPath);
      }
      seenSnapshotVersions.add(snapshot.version);
      previousSnapshot = snapshot;
    }
  }
  for (let index = 0; index < workspace.parts.length; index += 1) {
    const item = workspace.parts[index]!;
    const path = `workspace.parts[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("parts", item.duplicateOf, `${path}.duplicateOf`);
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.documentId);
    const documentPartIds = documentPartIdsById.get(item.documentId);
    if (documentPartIds && !documentPartIds.has(item.id)) {
      addIssue("DANGLING_REFERENCE", `${path}.documentId`);
    }
    const document = documentsById.get(item.documentId);
    const file = document ? filesById.get(document.fileId) : undefined;
    if (file && item.pageStart > file.pageCount) {
      addIssue("INVALID_WORKSPACE", `${path}.pageStart`);
    }
    if (file && item.pageEnd > file.pageCount) {
      addIssue("INVALID_WORKSPACE", `${path}.pageEnd`);
    }
  }
  for (let index = 0; index < workspace.references.length; index += 1) {
    const item = workspace.references[index]!;
    const path = `workspace.references[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("cases", item.caseId, `${path}.caseId`);
    requireOptionalRef("debts", item.debtId, `${path}.debtId`);
    requireOptionalRef("paymentPlans", item.paymentPlanId, `${path}.paymentPlanId`);
    requireDocumentEvidence(item.occurrenceIds, `${path}.occurrenceIds`, item.documentId);
    const scopedTarget =
      item.scope === "CASE"
        ? item.caseId
        : item.scope === "DEBT"
          ? item.debtId
          : item.scope === "PAYMENT_PLAN"
            ? item.paymentPlanId
            : undefined;
    if (
      (item.scope === "CASE" ||
        item.scope === "DEBT" ||
        item.scope === "PAYMENT_PLAN") &&
      scopedTarget === undefined
    ) {
      addIssue(
        "INVALID_WORKSPACE",
        `${path}.${
          item.scope === "CASE"
            ? "caseId"
            : item.scope === "DEBT"
              ? "debtId"
              : "paymentPlanId"
        }`,
      );
    }
    if (item.caseId) {
      if (!caseReferenceIdsById.get(item.caseId)?.has(item.id)) {
        addIssue("DANGLING_REFERENCE", `${path}.caseId`);
      }
      if (
        !caseDocumentIdsById.get(item.caseId)?.has(item.documentId) ||
        !documentCaseIdsById.get(item.documentId)?.has(item.caseId)
      ) {
        addIssue("DANGLING_REFERENCE", `${path}.caseId`);
      }
    }
    if (item.debtId) {
      if (!debtReferenceIdsById.get(item.debtId)?.has(item.id)) {
        addIssue("DANGLING_REFERENCE", `${path}.debtId`);
      }
      if (
        !debtDocumentIdsById.get(item.debtId)?.has(item.documentId) ||
        !documentDebtIdsById.get(item.documentId)?.has(item.debtId)
      ) {
        addIssue("DANGLING_REFERENCE", `${path}.debtId`);
      }
    }
    if (
      item.paymentPlanId &&
      plansById.get(item.paymentPlanId)?.sourceDocumentId !== item.documentId
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.paymentPlanId`);
    }
    const documentReferenceIds = documentReferenceIdsById.get(item.documentId);
    if (documentReferenceIds && !documentReferenceIds.has(item.id)) {
      addIssue("DANGLING_REFERENCE", `${path}.documentId`);
    }
  }
  for (let index = 0; index < workspace.evidence.length; index += 1) {
    const item = workspace.evidence[index]!;
    const path = `workspace.evidence[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("parts", item.partId, `${path}.partId`);
    if (item.partId) {
      const part = partsById.get(item.partId);
      if (part && part.documentId !== item.documentId) {
        addIssue("DANGLING_REFERENCE", `${path}.partId`);
      }
      if (
        part &&
        (item.pageNumber < part.pageStart || item.pageNumber > part.pageEnd)
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.pageNumber`);
      }
    }
    const document = documentsById.get(item.documentId);
    const file = document ? filesById.get(document.fileId) : undefined;
    if (file && item.pageNumber > file.pageCount) {
      addIssue("INVALID_WORKSPACE", `${path}.pageNumber`);
    }
  }
  for (let index = 0; index < workspace.debts.length; index += 1) {
    const item = workspace.debts[index]!;
    const path = `workspace.debts[${index}]`;
    requireRequiredRef("authorities", item.authorityId, `${path}.authorityId`);
    const referenceIds = requireRefs(
      "references",
      item.referenceIds,
      `${path}.referenceIds`,
    );
    for (
      let referenceIndex = 0;
      referenceIds && referenceIndex < referenceIds.length;
      referenceIndex += 1
    ) {
      if (referencesById.get(referenceIds[referenceIndex]!)?.debtId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.referenceIds[${referenceIndex}]`);
      }
    }
    const documentIds = requireRefs(
      "documents",
      item.documentIds,
      `${path}.documentIds`,
    );
    for (
      let documentIndex = 0;
      documentIds && documentIndex < documentIds.length;
      documentIndex += 1
    ) {
      const documentId = documentIds[documentIndex]!;
      if (!documentDebtIdsById.get(documentId)?.has(item.id)) {
        addIssue("DANGLING_REFERENCE", `${path}.documentIds[${documentIndex}]`);
      }
      if (documentsById.get(documentId)?.authorityId !== item.authorityId) {
        addIssue("DANGLING_REFERENCE", `${path}.documentIds[${documentIndex}]`);
      }
    }
    checkCents(item.originalPrincipalCents, `${path}.originalPrincipalCents`, issues);
    checkCents(item.outstandingPrincipalCents, `${path}.outstandingPrincipalCents`, issues);
  }
  for (let index = 0; index < workspace.debtObservations.length; index += 1) {
    const item = workspace.debtObservations[index]!;
    const path = `workspace.debtObservations[${index}]`;
    requireRequiredRef("debts", item.debtId, `${path}.debtId`);
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireRequiredRef("authorities", item.authorityId, `${path}.authorityId`);
    const referenceIds = requireRefs(
      "references",
      item.referenceIds,
      `${path}.referenceIds`,
    );
    for (
      let referenceIndex = 0;
      referenceIds && referenceIndex < referenceIds.length;
      referenceIndex += 1
    ) {
      const reference = referencesById.get(referenceIds[referenceIndex]!);
      if (
        reference &&
        (reference.documentId !== item.documentId ||
          reference.debtId !== item.debtId)
      ) {
        addIssue("DANGLING_REFERENCE", `${path}.referenceIds[${referenceIndex}]`);
      }
    }
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.documentId);
    const debt = debtsById.get(item.debtId);
    const document = documentsById.get(item.documentId);
    if (debt && !debtDocumentIdsById.get(debt.id)?.has(item.documentId)) {
      addIssue("DANGLING_REFERENCE", `${path}.documentId`);
    }
    if (document && !documentDebtIdsById.get(document.id)?.has(item.debtId)) {
      addIssue("DANGLING_REFERENCE", `${path}.debtId`);
    }
    if (
      (debt && debt.authorityId !== item.authorityId) ||
      (document && document.authorityId !== item.authorityId)
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.authorityId`);
    }
    checkCents(item.observedPrincipalCents, `${path}.observedPrincipalCents`, issues);
    checkCents(item.observedOutstandingCents, `${path}.observedOutstandingCents`, issues);
  }
  for (let index = 0; index < workspace.cases.length; index += 1) {
    const item = workspace.cases[index]!;
    const path = `workspace.cases[${index}]`;
    requireRequiredRef("authorities", item.authorityId, `${path}.authorityId`);
    requireOptionalRef("references", item.primaryReferenceId, `${path}.primaryReferenceId`);
    if (
      item.primaryReferenceId &&
      (referencesById.get(item.primaryReferenceId)?.caseId !== item.id ||
        !caseReferenceIdsById.get(item.id)?.has(item.primaryReferenceId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.primaryReferenceId`);
    }
    const referenceIds = requireRefs(
      "references",
      item.referenceIds,
      `${path}.referenceIds`,
    );
    for (
      let referenceIndex = 0;
      referenceIds && referenceIndex < referenceIds.length;
      referenceIndex += 1
    ) {
      if (referencesById.get(referenceIds[referenceIndex]!)?.caseId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.referenceIds[${referenceIndex}]`);
      }
    }
    const documentIds = requireRefs(
      "documents",
      item.documentIds,
      `${path}.documentIds`,
    );
    for (
      let documentIndex = 0;
      documentIds && documentIndex < documentIds.length;
      documentIndex += 1
    ) {
      const documentId = documentIds[documentIndex]!;
      if (!documentCaseIdsById.get(documentId)?.has(item.id)) {
        addIssue("DANGLING_REFERENCE", `${path}.documentIds[${documentIndex}]`);
      }
      if (documentsById.get(documentId)?.authorityId !== item.authorityId) {
        addIssue("DANGLING_REFERENCE", `${path}.documentIds[${documentIndex}]`);
      }
    }
    const debtIds = requireRefs("debts", item.debtIds, `${path}.debtIds`);
    for (
      let debtIndex = 0;
      debtIds && debtIndex < debtIds.length;
      debtIndex += 1
    ) {
      const debtId = debtIds[debtIndex]!;
      const debt = debtsById.get(debtId);
      if (debt && debt.authorityId !== item.authorityId) {
        addIssue("DANGLING_REFERENCE", `${path}.debtIds[${debtIndex}]`);
      }
    }
    const obligationIds = requireRefs(
      "obligations",
      item.obligationIds,
      `${path}.obligationIds`,
    );
    for (
      let childIndex = 0;
      obligationIds && childIndex < obligationIds.length;
      childIndex += 1
    ) {
      if (obligationsById.get(obligationIds[childIndex]!)?.caseId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.obligationIds[${childIndex}]`);
      }
    }
    const paymentPlanIds = requireRefs(
      "paymentPlans",
      item.paymentPlanIds,
      `${path}.paymentPlanIds`,
    );
    for (
      let childIndex = 0;
      paymentPlanIds && childIndex < paymentPlanIds.length;
      childIndex += 1
    ) {
      if (plansById.get(paymentPlanIds[childIndex]!)?.caseId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.paymentPlanIds[${childIndex}]`);
      }
    }
    const timelineIds = requireRefs("timeline", item.timelineEventIds, `${path}.timelineEventIds`);
    for (let childIndex = 0; timelineIds && childIndex < timelineIds.length; childIndex += 1) {
      if (timelineById.get(timelineIds[childIndex]!)?.caseId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.timelineEventIds[${childIndex}]`);
      }
    }
  }
  for (let index = 0; index < workspace.relations.length; index += 1) {
    const item = workspace.relations[index]!;
    const path = `workspace.relations[${index}]`;
    requireRequiredRef("documents", item.sourceDocumentId, `${path}.sourceDocumentId`);
    requireRequiredRef("documents", item.targetDocumentId, `${path}.targetDocumentId`);
  }
  for (let index = 0; index < workspace.analysisSnapshots.length; index += 1) {
    const item = workspace.analysisSnapshots[index]!;
    const path = `workspace.analysisSnapshots[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("analysisSnapshots", item.supersedesAnalysisId, `${path}.supersedesAnalysisId`);
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.documentId);
    const documentSnapshotIds = documentSnapshotIdsById.get(item.documentId);
    if (documentSnapshotIds && !documentSnapshotIds.has(item.id)) {
      addIssue("DANGLING_REFERENCE", `${path}.documentId`);
    }
    const snapshotDocument = documentsById.get(item.documentId);
    const snapshotFile = snapshotDocument
      ? filesById.get(snapshotDocument.fileId)
      : undefined;
    if (item.structuredData.amountReconciliation !== undefined) {
      try {
        parseFiscalNotificationAmountReconciliationV1(
          item.structuredData.amountReconciliation,
          1,
          snapshotFile?.pageCount ?? FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
        );
      } catch {
        addIssue(
          "INVALID_WORKSPACE",
          `${path}.structuredData.amountReconciliation`,
        );
      }
    }
    if (item.structuredData.mathematicalIntegrity !== undefined) {
      try {
        parseFiscalNotificationMathematicalIntegrityV11(
          item.structuredData.mathematicalIntegrity,
          1,
          snapshotFile?.pageCount ?? FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
        );
      } catch {
        addIssue(
          "INVALID_WORKSPACE",
          `${path}.structuredData.mathematicalIntegrity`,
        );
      }
    }
    for (
      let fieldIndex = 0;
      fieldIndex < item.structuredData.unknownFields.length;
      fieldIndex += 1
    ) {
      const unknownField = item.structuredData.unknownFields[fieldIndex]!;
      if (snapshotFile && unknownField.page > snapshotFile.pageCount) {
        addIssue(
          "INVALID_WORKSPACE",
          `${path}.structuredData.unknownFields[${fieldIndex}].page`,
        );
      }
      const evidenceId = unknownField.evidenceId;
      if (evidenceId === undefined) continue;
      const evidencePath = `${path}.structuredData.unknownFields[${fieldIndex}].evidenceId`;
      requireOptionalRef("evidence", evidenceId, evidencePath);
      const evidence = evidenceById.get(evidenceId);
      if (
        evidence &&
        (evidence.ownerScope !== expectedOwnerScope ||
          evidence.documentId !== item.documentId)
      ) {
        addIssue("DANGLING_REFERENCE", evidencePath);
      }
    }
    const paymentOptionIds = requireRefs(
      "paymentOptions",
      item.structuredData.paymentOptionIds,
      `${path}.structuredData.paymentOptionIds`,
    );
    if (item.supersedesAnalysisId) {
      const prior = snapshotsById.get(item.supersedesAnalysisId);
      if (prior) {
        if (prior.id === item.id) {
          addIssue("INVALID_WORKSPACE", `${path}.supersedesAnalysisId`);
        }
        if (prior.documentId !== item.documentId) {
          addIssue("DANGLING_REFERENCE", `${path}.supersedesAnalysisId`);
        }
        if (prior.version >= item.version) {
          addIssue("INVALID_WORKSPACE", `${path}.supersedesAnalysisId`);
        }
      }
    }
    if (paymentOptionIds) {
      for (
        let optionIndex = 0;
        optionIndex < paymentOptionIds.length;
        optionIndex += 1
      ) {
        const option = paymentOptionsById.get(
          paymentOptionIds[optionIndex]!,
        );
        if (option && option.documentId !== item.documentId) {
          addIssue(
            "DANGLING_REFERENCE",
            `${path}.structuredData.paymentOptionIds[${optionIndex}]`,
          );
        }
      }
    }
    const projection = item.structuredData.administrativeDomain;
    if (projection !== undefined) {
      const result = validateAdministrativeDomainProjection(
        projection,
        expectedOwnerScope,
        item.documentId,
      );
      if (!result.valid || !result.projection) {
        addIssue(
          "INVALID_DOMAIN_PROJECTION",
          `${path}.structuredData.administrativeDomain`,
        );
      } else {
        consumeAdministrativeProjectionText(
          result.projection,
          consumeText,
          consumeNested,
        );
        checkProjectionEvidence(
          result.projection,
          `${path}.structuredData.administrativeDomain`,
          requireDocumentEvidence,
          consumeNested,
        );
      }
    }
  }
  validateSnapshotSupersessionGraph(workspace.analysisSnapshots, addIssue);
  for (let index = 0; index < workspace.paymentOptions.length; index += 1) {
    const item = workspace.paymentOptions[index]!;
    const path = `workspace.paymentOptions[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.documentId);
    checkCents(item.totalCents, `${path}.totalCents`, issues);
    checkComponents(
      item.components,
      `${path}.components`,
      issues,
      requireDocumentEvidence,
      item.documentId,
      consumeNested,
      consumeText,
    );
  }
  for (let index = 0; index < workspace.paymentPlans.length; index += 1) {
    const item = workspace.paymentPlans[index]!;
    const path = `workspace.paymentPlans[${index}]`;
    requireRequiredRef("documents", item.sourceDocumentId, `${path}.sourceDocumentId`);
    requireOptionalRef("cases", item.caseId, `${path}.caseId`);
    if (
      item.caseId &&
      !casePaymentPlanIdsById.get(item.caseId)?.has(item.id)
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.caseId`);
    }
    if (
      item.caseId &&
      (!caseDocumentIdsById.get(item.caseId)?.has(item.sourceDocumentId) ||
        !documentCaseIdsById.get(item.sourceDocumentId)?.has(item.caseId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.caseId`);
    }
    requireRequiredRef("authorities", item.authorityId, `${path}.authorityId`);
    const planDocument = documentsById.get(item.sourceDocumentId);
    if (planDocument && planDocument.authorityId !== item.authorityId) {
      addIssue("DANGLING_REFERENCE", `${path}.authorityId`);
    }
    const debtIds = requireRefs("debts", item.debtIds, `${path}.debtIds`);
    for (
      let debtIndex = 0;
      debtIds && debtIndex < debtIds.length;
      debtIndex += 1
    ) {
      const debtId = debtIds[debtIndex]!;
      const debt = debtsById.get(debtId);
      if (
        debt &&
        (debt.authorityId !== item.authorityId ||
          !debtDocumentIdsById.get(debtId)?.has(item.sourceDocumentId) ||
          !documentDebtIdsById.get(item.sourceDocumentId)?.has(debtId))
      ) {
        addIssue("DANGLING_REFERENCE", `${path}.debtIds[${debtIndex}]`);
      }
    }
    const installmentIds = requireRefs(
      "installments",
      item.installmentIds,
      `${path}.installmentIds`,
    );
    for (
      let childIndex = 0;
      installmentIds && childIndex < installmentIds.length;
      childIndex += 1
    ) {
      if (installmentsById.get(installmentIds[childIndex]!)?.paymentPlanId !== item.id) {
        addIssue("DANGLING_REFERENCE", `${path}.installmentIds[${childIndex}]`);
      }
    }
    checkCents(item.requestedAmountCents, `${path}.requestedAmountCents`, issues);
    checkCents(item.grantedPrincipalCents, `${path}.grantedPrincipalCents`, issues);
    checkCents(item.totalInterestCents, `${path}.totalInterestCents`, issues);
    checkCents(item.totalPlanAmountCents, `${path}.totalPlanAmountCents`, issues);
  }
  for (let index = 0; index < workspace.installments.length; index += 1) {
    const item = workspace.installments[index]!;
    const path = `workspace.installments[${index}]`;
    requireRequiredRef("paymentPlans", item.paymentPlanId, `${path}.paymentPlanId`);
    const planInstallmentIds = planInstallmentIdsById.get(item.paymentPlanId);
    if (planInstallmentIds && !planInstallmentIds.has(item.id)) {
      addIssue("DANGLING_REFERENCE", `${path}.paymentPlanId`);
    }
    const planDocumentId = plansById.get(item.paymentPlanId)?.sourceDocumentId;
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, planDocumentId);
    checkCents(item.totalCents, `${path}.totalCents`, issues);
    checkComponents(
      item.components,
      `${path}.components`,
      issues,
      requireDocumentEvidence,
      planDocumentId,
      consumeNested,
      consumeText,
    );
  }
  for (let index = 0; index < workspace.interestCalculations.length; index += 1) {
    const item = workspace.interestCalculations[index]!;
    const path = `workspace.interestCalculations[${index}]`;
    requireRequiredRef("installments", item.installmentId, `${path}.installmentId`);
    const installment = installmentsById.get(item.installmentId);
    const interestDocumentId = installment
      ? plansById.get(installment.paymentPlanId)?.sourceDocumentId
      : undefined;
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, interestDocumentId);
    checkRequiredCents(item.calculationBaseCents, `${path}.calculationBaseCents`, issues);
    checkRequiredCents(item.amountCents, `${path}.amountCents`, issues);
  }
  for (let index = 0; index < workspace.deadlineRules.length; index += 1) {
    const item = workspace.deadlineRules[index]!;
    const path = `workspace.deadlineRules[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("obligations", item.obligationId, `${path}.obligationId`);
    if (
      item.obligationId &&
      obligationsById.get(item.obligationId)?.sourceDocumentId !== item.documentId
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.obligationId`);
    }
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.documentId);
  }
  for (let index = 0; index < workspace.obligations.length; index += 1) {
    const item = workspace.obligations[index]!;
    const path = `workspace.obligations[${index}]`;
    requireRequiredRef("documents", item.sourceDocumentId, `${path}.sourceDocumentId`);
    requireOptionalRef("cases", item.caseId, `${path}.caseId`);
    if (
      item.caseId &&
      !caseObligationIdsById.get(item.caseId)?.has(item.id)
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.caseId`);
    }
    if (
      item.caseId &&
      (!caseDocumentIdsById.get(item.caseId)?.has(item.sourceDocumentId) ||
        !documentCaseIdsById.get(item.sourceDocumentId)?.has(item.caseId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.caseId`);
    }
    requireOptionalRef("debts", item.debtId, `${path}.debtId`);
    requireOptionalRef("paymentPlans", item.paymentPlanId, `${path}.paymentPlanId`);
    requireOptionalRef("installments", item.installmentId, `${path}.installmentId`);
    const obligationDocument = documentsById.get(item.sourceDocumentId);
    const obligationDebt = item.debtId ? debtsById.get(item.debtId) : undefined;
    const explicitPlan = item.paymentPlanId
      ? plansById.get(item.paymentPlanId)
      : undefined;
    const obligationInstallment = item.installmentId
      ? installmentsById.get(item.installmentId)
      : undefined;
    const installmentPlan = obligationInstallment
      ? plansById.get(obligationInstallment.paymentPlanId)
      : undefined;
    if (
      item.debtId &&
      obligationDebt &&
      (!debtDocumentIdsById.get(item.debtId)?.has(item.sourceDocumentId) ||
        !documentDebtIdsById.get(item.sourceDocumentId)?.has(item.debtId) ||
        (obligationDocument &&
          obligationDebt.authorityId !== obligationDocument.authorityId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.debtId`);
    }
    if (
      explicitPlan &&
      (explicitPlan.sourceDocumentId !== item.sourceDocumentId ||
        (item.debtId && !planDebtIdsById.get(explicitPlan.id)?.has(item.debtId)) ||
        (item.caseId && explicitPlan.caseId !== item.caseId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.paymentPlanId`);
    }
    if (
      obligationInstallment &&
      ((item.paymentPlanId &&
        obligationInstallment.paymentPlanId !== item.paymentPlanId) ||
        !installmentPlan ||
        installmentPlan.sourceDocumentId !== item.sourceDocumentId ||
        (item.debtId &&
          !planDebtIdsById.get(obligationInstallment.paymentPlanId)?.has(item.debtId)) ||
        (item.caseId && installmentPlan?.caseId !== item.caseId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.installmentId`);
    }
    requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.sourceDocumentId);
    checkCents(item.amountCents, `${path}.amountCents`, issues);
    checkComponents(
      item.components,
      `${path}.components`,
      issues,
      requireDocumentEvidence,
      item.sourceDocumentId,
      consumeNested,
      consumeText,
    );
  }
  for (let index = 0; index < workspace.timeline.length; index += 1) {
    const item = workspace.timeline[index]!;
    const path = `workspace.timeline[${index}]`;
    requireRequiredRef("cases", item.caseId, `${path}.caseId`);
    const caseTimelineIds = caseTimelineIdsById.get(item.caseId);
    if (caseTimelineIds && !caseTimelineIds.has(item.id)) {
      addIssue("DANGLING_REFERENCE", `${path}.caseId`);
    }
    requireOptionalRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("debts", item.debtId, `${path}.debtId`);
    requireOptionalRef("installments", item.installmentId, `${path}.installmentId`);
    requireOptionalRef("relations", item.relationId, `${path}.relationId`);
    if (
      item.documentId &&
      (!caseDocumentIdsById.get(item.caseId)?.has(item.documentId) ||
        !documentCaseIdsById.get(item.documentId)?.has(item.caseId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.documentId`);
    }
    if (item.debtId && !caseDebtIdsById.get(item.caseId)?.has(item.debtId)) {
      addIssue("DANGLING_REFERENCE", `${path}.debtId`);
    }
    if (
      item.documentId &&
      item.debtId &&
      (!debtDocumentIdsById.get(item.debtId)?.has(item.documentId) ||
        !documentDebtIdsById.get(item.documentId)?.has(item.debtId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.debtId`);
    }
    const timelineInstallment = item.installmentId
      ? installmentsById.get(item.installmentId)
      : undefined;
    const timelinePlan = timelineInstallment
      ? plansById.get(timelineInstallment.paymentPlanId)
      : undefined;
    if (
      timelinePlan &&
      (!casePaymentPlanIdsById.get(item.caseId)?.has(timelinePlan.id) ||
        timelinePlan.caseId !== item.caseId ||
        (item.documentId && timelinePlan.sourceDocumentId !== item.documentId) ||
        (item.debtId && !planDebtIdsById.get(timelinePlan.id)?.has(item.debtId)))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.installmentId`);
    }
    if (item.documentId) {
      requireDocumentEvidence(item.evidenceIds, `${path}.evidenceIds`, item.documentId);
    } else if (item.installmentId) {
      const installment = installmentsById.get(item.installmentId);
      const inferredDocumentId = installment
        ? plansById.get(installment.paymentPlanId)?.sourceDocumentId
        : undefined;
      requireDocumentEvidence(
        item.evidenceIds,
        `${path}.evidenceIds`,
        inferredDocumentId,
      );
    } else {
      const caseDocuments = caseDocumentIdsById.get(item.caseId) ?? new Set<string>();
      const debtDocuments = item.debtId
        ? debtDocumentIdsById.get(item.debtId)
        : undefined;
      requireEvidenceWithinDocuments(
        item.evidenceIds,
        `${path}.evidenceIds`,
        caseDocuments,
        debtDocuments,
      );
    }
  }
  for (let index = 0; index < workspace.accountingDrafts.length; index += 1) {
    const item = workspace.accountingDrafts[index]!;
    const path = `workspace.accountingDrafts[${index}]`;
    requireRequiredRef("documents", item.documentId, `${path}.documentId`);
    requireOptionalRef("cases", item.caseId, `${path}.caseId`);
    requireOptionalRef("debts", item.debtId, `${path}.debtId`);
    requireOptionalRef("installments", item.installmentId, `${path}.installmentId`);
    if (
      item.caseId &&
      (!caseDocumentIdsById.get(item.caseId)?.has(item.documentId) ||
        !documentCaseIdsById.get(item.documentId)?.has(item.caseId))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.caseId`);
    }
    if (
      item.debtId &&
      (!debtDocumentIdsById.get(item.debtId)?.has(item.documentId) ||
        !documentDebtIdsById.get(item.documentId)?.has(item.debtId) ||
        (item.caseId && !caseDebtIdsById.get(item.caseId)?.has(item.debtId)))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.debtId`);
    }
    const draftInstallment = item.installmentId
      ? installmentsById.get(item.installmentId)
      : undefined;
    const draftPlan = draftInstallment
      ? plansById.get(draftInstallment.paymentPlanId)
      : undefined;
    if (
      draftPlan &&
      (draftPlan.sourceDocumentId !== item.documentId ||
        (item.caseId &&
          (draftPlan.caseId !== item.caseId ||
            !casePaymentPlanIdsById.get(item.caseId)?.has(draftPlan.id))) ||
        (item.debtId && !planDebtIdsById.get(draftPlan.id)?.has(item.debtId)))
    ) {
      addIssue("DANGLING_REFERENCE", `${path}.installmentId`);
    }
    checkRequiredCents(item.totalCents, `${path}.totalCents`, issues);
    checkAccountingComponents(
      item.components,
      `${path}.components`,
      issues,
      consumeText,
    );
  }
  const auditEntityCollections = {
    PACKAGE: "packages",
    DOCUMENT: "documents",
    CASE: "cases",
    RELATION: "relations",
    OBLIGATION: "obligations",
    INSTALLMENT: "installments",
    ACCOUNTING_DRAFT: "accountingDrafts",
  } as const satisfies Record<
    (typeof workspace.auditEvents)[number]["entityType"],
    CollectionName
  >;
  for (let index = 0; index < workspace.auditEvents.length; index += 1) {
    const item = workspace.auditEvents[index]!;
    const expectedEntityType = AUDIT_EVENT_ENTITY_TYPES[item.eventType];
    if (expectedEntityType !== item.entityType) {
      addIssue(
        "INVALID_WORKSPACE",
        `workspace.auditEvents[${index}].entityType`,
      );
    }
    const entityCollection = auditEntityCollections[item.entityType];
    if (!entityCollection) {
      addIssue("INVALID_WORKSPACE", `workspace.auditEvents[${index}].entityType`);
      continue;
    }
    requireRequiredRef(
      entityCollection,
      item.entityId,
      `workspace.auditEvents[${index}].entityId`,
    );
  }

    return freezeIntegrityResult(issues);
  } catch (error) {
    if (error === NESTED_BUDGET_ABORT) return freezeIntegrityResult(issues);
    return invalid("INVALID_WORKSPACE", "workspace");
  }
}

export function assertFiscalNotificationsWorkspaceIntegrity(
  workspace: unknown,
  expectedOwnerScope: string,
): asserts workspace is FiscalNotificationsWorkspace {
  const result = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    expectedOwnerScope,
  );
  if (!result.valid) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "workspace");
  }
  const original = snapshotDataRecord(workspace);
  if (!original || original.debtObservations === undefined) {
    throw new FiscalNotificationInputError(
      "INVALID_INPUT",
      "workspace.debtObservations",
    );
  }
  if (!isDeepFrozenPlainData(workspace)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "workspace.$frozen");
  }
}

function invalid(
  code: WorkspaceIntegrityIssueCode,
  path: string,
): WorkspaceIntegrityResult {
  return Object.freeze({
    valid: false,
    issues: Object.freeze([Object.freeze({ code, path })]),
  });
}

function validateEntityStructure(
  collection: CollectionName,
  value: unknown,
  path: string,
  addIssue: (code: WorkspaceIntegrityIssueCode, path: string) => void,
  consumeNested: (length: number, path: string) => boolean,
  consumeText: (value: unknown, path: string) => boolean,
): void {
  if (!isPlainDataRecord(value)) {
    addIssue("INVALID_WORKSPACE", path);
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !ENTITY_KEYS[collection].has(key)) {
      addIssue("INVALID_WORKSPACE", `${path}.$unknown`);
      break;
    }
    if (typeof key === "string" && typeof value[key] === "string") {
      consumeText(value[key], `${path}.${key}`);
    }
  }
  for (const field of REQUIRED_STRING_FIELDS[collection]) {
    const candidate = value[field];
    if (
      typeof candidate !== "string" ||
      candidate.length === 0 ||
      candidate.length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars ||
      candidate.includes("\u0000")
    ) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  for (const field of OPTIONAL_STRING_FIELDS[collection]) {
    const candidate = value[field];
    if (
      candidate !== undefined &&
      (typeof candidate !== "string" ||
        candidate.length > FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars ||
        candidate.includes("\u0000"))
    ) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  for (const [field, allowedValues] of Object.entries(
    ENTITY_ENUM_FIELDS[collection] ?? {},
  )) {
    const candidate = value[field];
    if (candidate !== undefined && !allowedValues.has(candidate as string)) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  const validateArray = (
    candidate: unknown,
    arrayPath: string,
  ): readonly unknown[] | null => {
    const snapshot = snapshotDataArray(
      candidate,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
    );
    if (snapshot === ARRAY_LIMIT_EXCEEDED) {
      addIssue("COLLECTION_LIMIT_EXCEEDED", arrayPath);
      return null;
    }
    if (!snapshot) {
      addIssue("INVALID_WORKSPACE", arrayPath);
      return null;
    }
    consumeNested(snapshot.length, arrayPath);
    for (let index = 0; index < snapshot.length; index += 1) {
      if (typeof snapshot[index] === "string") {
        consumeText(snapshot[index], `${arrayPath}[${index}]`);
      }
    }
    return snapshot;
  };
  for (const field of REQUIRED_ARRAY_FIELDS[collection]) {
    const snapshot = validateArray(value[field], `${path}.${field}`);
    if (snapshot) {
      value[field] = snapshot;
      if (ID_ARRAY_FIELDS[collection]?.has(field)) {
        validateTypedStringArray(
          snapshot,
          `${path}.${field}`,
          "ID",
          addIssue,
        );
      } else if (TEXT_ARRAY_FIELDS[collection]?.has(field)) {
        validateTypedStringArray(
          snapshot,
          `${path}.${field}`,
          "TEXT",
          addIssue,
        );
      }
    }
  }
  for (const field of REQUIRED_BOOLEAN_FIELDS[collection]) {
    if (typeof value[field] !== "boolean") {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  for (const field of REQUIRED_INTEGER_FIELDS[collection]) {
    if (!Number.isSafeInteger(value[field]) || Number(value[field]) < 0) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  for (const field of OPTIONAL_NON_NEGATIVE_INTEGER_FIELDS[collection]) {
    if (
      value[field] !== undefined &&
      (!Number.isSafeInteger(value[field]) || Number(value[field]) < 0)
    ) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  if (
    collection === "analysisSnapshots" &&
    (!Number.isSafeInteger(value.version) || Number(value.version) < 1)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.version`);
  }
  if (collection === "deadlineRules") {
    try {
      assertBoundedId(value.ruleId, `${path}.ruleId`);
    } catch {
      addIssue("INVALID_WORKSPACE", `${path}.ruleId`);
    }
    if (value.durationValue !== undefined && value.durationUnit === undefined) {
      addIssue("INVALID_WORKSPACE", `${path}.durationUnit`);
    }
    if (value.durationUnit !== undefined && value.durationValue === undefined) {
      addIssue("INVALID_WORKSPACE", `${path}.durationValue`);
    }
  }
  if (collection === "files") {
    if (
      !Number.isSafeInteger(value.pageCount) ||
      Number(value.pageCount) < 1 ||
      Number(value.pageCount) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
    ) {
      addIssue("INVALID_WORKSPACE", `${path}.pageCount`);
    }
    for (const field of ["sha256", "contentFingerprint"] as const) {
      if (
        typeof value[field] === "string" &&
        !/^[a-f0-9]{64}$/u.test(value[field])
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.${field}`);
      }
    }
  }
  if (
    collection === "parts" &&
    typeof value.contentFingerprint === "string" &&
    !/^[a-f0-9]{64}$/u.test(value.contentFingerprint)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.contentFingerprint`);
  }
  if (
    collection === "parts" &&
    (!Number.isSafeInteger(value.pageStart) ||
      !Number.isSafeInteger(value.pageEnd) ||
      Number(value.pageStart) < 1 ||
      Number(value.pageEnd) < Number(value.pageStart))
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.pageStart`);
    addIssue("INVALID_WORKSPACE", `${path}.pageEnd`);
  }
  if (
    collection === "evidence" &&
    (!Number.isSafeInteger(value.pageNumber) || Number(value.pageNumber) < 1)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.pageNumber`);
  }
  if (collection === "evidence") {
    const humanConfirmed = value.assertionType === "USER_CONFIRMED";
    const hasConfirmedAt = value.confirmedAt !== undefined;
    const hasConfirmedBy = value.confirmedBy !== undefined;
    if (humanConfirmed !== hasConfirmedAt) {
      addIssue("INVALID_WORKSPACE", `${path}.confirmedAt`);
    }
    if (humanConfirmed !== hasConfirmedBy) {
      addIssue("INVALID_WORKSPACE", `${path}.confirmedBy`);
    }
    if (hasConfirmedBy) {
      try {
        assertBoundedId(value.confirmedBy, `${path}.confirmedBy`);
      } catch {
        addIssue("INVALID_WORKSPACE", `${path}.confirmedBy`);
      }
    }
  }
  if (collection === "relations") {
    const humanDecision =
      value.status === "USER_CONFIRMED" || value.status === "USER_REJECTED";
    const hasConfirmedAt = value.confirmedAt !== undefined;
    const hasConfirmedBy = value.confirmedBy !== undefined;
    if (humanDecision !== hasConfirmedAt) {
      addIssue("INVALID_WORKSPACE", `${path}.confirmedAt`);
    }
    if (humanDecision !== hasConfirmedBy) {
      addIssue("INVALID_WORKSPACE", `${path}.confirmedBy`);
    }
    if (hasConfirmedBy) {
      try {
        assertBoundedId(value.confirmedBy, `${path}.confirmedBy`);
      } catch {
        addIssue("INVALID_WORKSPACE", `${path}.confirmedBy`);
      }
    }
    if (value.reconciliationHistory !== undefined) {
      const history = validateArray(
        value.reconciliationHistory,
        `${path}.reconciliationHistory`,
      );
      if (!history || history.length > 32) {
        addIssue("INVALID_WORKSPACE", `${path}.reconciliationHistory`);
      } else {
        value.reconciliationHistory = history;
        history.forEach((candidate, index) => {
          const entryPath = `${path}.reconciliationHistory[${index}]`;
          const entry = snapshotKnownDataRecord(
            candidate,
            RECONCILIATION_HISTORY_KEYS,
          );
          if (!entry) {
            addIssue("INVALID_WORKSPACE", entryPath);
            return;
          }
          const enumChecks: readonly [string, ReadonlySet<string>][] = [
            ["previousStatus", RECONCILIATION_STATUSES],
            ["newStatus", RECONCILIATION_STATUSES],
            ["resultClassification", RECONCILIATION_RESULT_CLASSIFICATIONS],
            ["globalRelationType", RECONCILIATION_GLOBAL_RELATION_TYPES],
            [
              "reasonCode",
              new Set([
                "NEW_DIRECT_EDGE",
                "SUGGESTION_UPGRADED_BY_EXACT_EVIDENCE",
                "NEW_EVIDENCE_CHANGED_CLASSIFICATION",
              ]),
            ],
          ];
          for (const [field, allowed] of enumChecks) {
            if (typeof entry[field] !== "string" || !allowed.has(entry[field] as string)) {
              addIssue("INVALID_WORKSPACE", `${entryPath}.${field}`);
            }
          }
          if (entry.ruleVersion !== "global-reconcile-v8") {
            addIssue("INVALID_WORKSPACE", `${entryPath}.ruleVersion`);
          }
          if (
            typeof entry.previousRelationType !== "string" ||
            (entry.previousRelationType !== "ABSENT" &&
              !DOCUMENT_RELATION_TYPES.has(entry.previousRelationType))
          ) {
            addIssue("INVALID_WORKSPACE", `${entryPath}.previousRelationType`);
          }
          if (
            typeof entry.newRelationType !== "string" ||
            !DOCUMENT_RELATION_TYPES.has(entry.newRelationType)
          ) {
            addIssue("INVALID_WORKSPACE", `${entryPath}.newRelationType`);
          }
          if (!isIsoTimestamp(entry.reevaluatedAt)) {
            addIssue("INVALID_WORKSPACE", `${entryPath}.reevaluatedAt`);
          }
          if (typeof entry.rowAssignmentReviewRequired !== "boolean") {
            addIssue(
              "INVALID_WORKSPACE",
              `${entryPath}.rowAssignmentReviewRequired`,
            );
          }
          const evidenceKinds = validateArray(
            entry.evidenceKinds,
            `${entryPath}.evidenceKinds`,
          );
          if (!evidenceKinds || evidenceKinds.length > 16) {
            addIssue("INVALID_WORKSPACE", `${entryPath}.evidenceKinds`);
          } else {
            entry.evidenceKinds = evidenceKinds;
            const seen = new Set<string>();
            evidenceKinds.forEach((kind, evidenceIndex) => {
              if (
                typeof kind !== "string" ||
                !RECONCILIATION_EVIDENCE_KINDS.has(kind) ||
                seen.has(kind)
              ) {
                addIssue(
                  "INVALID_WORKSPACE",
                  `${entryPath}.evidenceKinds[${evidenceIndex}]`,
                );
              } else {
                seen.add(kind);
              }
            });
          }
        });
      }
    }
  }
  for (const field of REQUIRED_RECORD_FIELDS[collection]) {
    if (!isPlainDataRecord(value[field])) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  for (const field of ISO_TIMESTAMP_FIELDS[collection]) {
    if (!isIsoTimestamp(value[field])) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  for (const field of OPTIONAL_ISO_DATE_OR_TIMESTAMP_FIELDS[collection]) {
    if (value[field] !== undefined && !isIsoDateOrTimestamp(value[field])) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  if (collection === "files") {
    const notRetained = value.sourceContentRetention === "NOT_RETAINED";
    if (notRetained) {
      if (value.originalFilename !== undefined) {
        addIssue("INVALID_WORKSPACE", `${path}.originalFilename`);
      }
      if (value.storageReference !== undefined) {
        addIssue("INVALID_WORKSPACE", `${path}.storageReference`);
      }
      if (value.isImmutableOriginal !== undefined) {
        addIssue("INVALID_WORKSPACE", `${path}.isImmutableOriginal`);
      }
    } else {
      if (
        typeof value.originalFilename !== "string" ||
        value.originalFilename.length === 0
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.originalFilename`);
      }
      if (
        typeof value.storageReference !== "string" ||
        value.storageReference.length === 0
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.storageReference`);
      }
      if (value.isImmutableOriginal !== true) {
        addIssue("INVALID_WORKSPACE", `${path}.isImmutableOriginal`);
      }
    }
  }
  if (
    collection === "accountingDrafts" &&
    (value.requiresUserConfirmation !== true ||
      value.createsExpense !== false ||
      value.createsJournalEntry !== false)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.effects`);
  }
  if (
    collection === "relations" &&
    (typeof value.score !== "number" ||
      !Number.isFinite(value.score) ||
      value.score < 0 ||
      value.score > 100)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.score`);
  }
  if (collection === "documents") {
    const dates = snapshotKnownDataRecord(
      value.notificationDates,
      NOTIFICATION_DATES_KEYS,
    );
    if (!dates) {
      addIssue("INVALID_WORKSPACE", `${path}.notificationDates`);
    } else {
      value.notificationDates = dates;
      for (const [field, candidate] of Object.entries(dates)) {
        if (candidate !== undefined && !isIsoTimestamp(candidate)) {
          addIssue("INVALID_WORKSPACE", `${path}.notificationDates.${field}`);
        } else if (typeof candidate === "string") {
          consumeText(candidate, `${path}.notificationDates.${field}`);
        }
      }
    }
    if (value.subjectParty !== undefined) {
      const subjectParty = snapshotKnownDataRecord(
        value.subjectParty,
        SUBJECT_PARTY_KEYS,
      );
      if (!subjectParty) {
        addIssue("INVALID_WORKSPACE", `${path}.subjectParty`);
      } else {
        value.subjectParty = subjectParty;
        if (
          !new Set(["MATCH", "MISMATCH", "UNKNOWN"]).has(
            subjectParty.matchesBusinessProfile as string,
          )
        ) {
          addIssue(
            "INVALID_WORKSPACE",
            `${path}.subjectParty.matchesBusinessProfile`,
          );
        }
        for (const field of ["displayName", "taxIdNormalized"] as const) {
          if (
            subjectParty[field] !== undefined &&
            typeof subjectParty[field] !== "string"
          ) {
            addIssue("INVALID_WORKSPACE", `${path}.subjectParty.${field}`);
          } else if (typeof subjectParty[field] === "string") {
            consumeText(subjectParty[field], `${path}.subjectParty.${field}`);
          }
        }
      }
    }
  }
  if (collection === "evidence" && value.boundingBox !== undefined) {
    const boundingBox = snapshotKnownDataRecord(
      value.boundingBox,
      BOUNDING_BOX_KEYS,
    );
    if (!boundingBox) {
      addIssue("INVALID_WORKSPACE", `${path}.boundingBox`);
    } else {
      value.boundingBox = boundingBox;
      for (const field of ["x", "y", "width", "height"] as const) {
        if (typeof boundingBox[field] !== "number" || !Number.isFinite(boundingBox[field])) {
          addIssue("INVALID_WORKSPACE", `${path}.boundingBox.${field}`);
        }
      }
      for (const field of ["pageWidth", "pageHeight"] as const) {
        if (
          boundingBox[field] !== undefined &&
          (typeof boundingBox[field] !== "number" ||
            !Number.isFinite(boundingBox[field]))
        ) {
          addIssue("INVALID_WORKSPACE", `${path}.boundingBox.${field}`);
        }
      }
    }
  }
  if (collection === "relations") {
    const relationEvidence = snapshotKnownDataRecord(
      value.evidence,
      RELATION_EVIDENCE_KEYS,
    );
    if (!relationEvidence) {
      addIssue("INVALID_WORKSPACE", `${path}.evidence`);
    } else {
      value.evidence = relationEvidence;
      if (
        relationEvidence.chainId !== undefined &&
        (typeof relationEvidence.chainId !== "string" ||
          !DOCUMENT_CHAIN_IDS.has(relationEvidence.chainId))
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.evidence.chainId`);
      }
      for (const field of RELATION_EVIDENCE_ARRAY_FIELDS) {
        const snapshot = validateArray(
          relationEvidence[field],
          `${path}.evidence.${field}`,
        );
        if (!snapshot) continue;
        relationEvidence[field] = snapshot;
        for (let index = 0; index < snapshot.length; index += 1) {
          const item = snapshot[index];
          const allowed =
            field === "matchingReferenceTypes"
              ? EXTERNAL_REFERENCE_TYPES
              : field === "matchingAmountTypes"
                ? MONEY_COMPONENT_TYPES
                : null;
          if (typeof item !== "string" || (allowed && !allowed.has(item))) {
            addIssue(
              "INVALID_WORKSPACE",
              `${path}.evidence.${field}[${index}]`,
            );
          }
        }
      }
      if (
        relationEvidence.citedText !== undefined &&
        typeof relationEvidence.citedText !== "string"
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.evidence.citedText`);
      } else if (typeof relationEvidence.citedText === "string") {
        consumeText(relationEvidence.citedText, `${path}.evidence.citedText`);
      }
    }
  }
  if (collection === "analysisSnapshots") {
    const structuredData = snapshotKnownDataRecord(
      value.structuredData,
      STRUCTURED_DATA_KEYS,
    );
    if (!structuredData) {
      addIssue("INVALID_WORKSPACE", `${path}.structuredData.$unknown`);
    } else {
      value.structuredData = structuredData;
      if (structuredData.schemaVersion !== 1) {
        addIssue("INVALID_WORKSPACE", `${path}.structuredData.schemaVersion`);
      }
      const documentTypes = ENTITY_ENUM_FIELDS.documents?.documentType;
      if (!documentTypes?.has(structuredData.documentType as string)) {
        addIssue("INVALID_WORKSPACE", `${path}.structuredData.documentType`);
      }
      for (const field of STRUCTURED_DATA_ARRAY_FIELDS) {
        const snapshot = validateArray(
          structuredData[field],
          `${path}.structuredData.${field}`,
        );
        if (snapshot) {
          structuredData[field] = snapshot;
          if (field === "paymentOptionIds") {
            validateTypedStringArray(
              snapshot,
              `${path}.structuredData.${field}`,
              "ID",
              addIssue,
            );
          } else if (field !== "unknownFields") {
            validateTypedStringArray(
              snapshot,
              `${path}.structuredData.${field}`,
              "TEXT",
              addIssue,
            );
          }
        }
      }
      const unknownFields = validateUnknownFields(
        structuredData.unknownFields,
        `${path}.structuredData.unknownFields`,
        addIssue,
        consumeText,
      );
      if (unknownFields) structuredData.unknownFields = unknownFields;
      const documentFields = snapshotKnownDataRecord(
        structuredData.documentFields,
        DOCUMENT_FIELDS_KEYS,
      );
      if (
        !documentFields ||
        typeof documentFields.title !== "string" ||
        documentFields.title.length === 0
      ) {
        addIssue("INVALID_WORKSPACE", `${path}.structuredData.documentFields`);
      } else {
        structuredData.documentFields = documentFields;
        consumeText(
          documentFields.title,
          `${path}.structuredData.documentFields.title`,
        );
        for (const field of [
          "issueDate",
          "effectiveNotificationDate",
        ] as const) {
          const candidate = documentFields[field];
          if (candidate === undefined) continue;
          if (!isIsoDateOrTimestamp(candidate)) {
            addIssue(
              "INVALID_WORKSPACE",
              `${path}.structuredData.documentFields.${field}`,
            );
          }
          if (typeof candidate === "string") {
            consumeText(
              candidate,
              `${path}.structuredData.documentFields.${field}`,
            );
          }
        }
      }
      if (structuredData.templateRecognition !== undefined) {
        const templateRecognition = validateTemplateRecognition(
          structuredData.templateRecognition,
          `${path}.structuredData.templateRecognition`,
          addIssue,
          validateArray,
          consumeText,
        );
        if (templateRecognition) {
          structuredData.templateRecognition = templateRecognition;
        }
      }
      const projection = structuredData.administrativeDomain;
      const projectionSnapshot = snapshotDataRecord(projection);
      if (projectionSnapshot) {
        structuredData.administrativeDomain = projectionSnapshot;
        for (const field of ADMINISTRATIVE_DOMAIN_ARRAY_FIELDS) {
          const candidate = projectionSnapshot[field];
          if (Array.isArray(candidate)) {
            const snapshot = validateArray(
              candidate,
              `${path}.structuredData.administrativeDomain.${field}`,
            );
            if (snapshot) projectionSnapshot[field] = snapshot;
          }
        }
      }
    }
  }
  if (collection === "auditEvents" && value.safeMetadata !== undefined) {
    const schema =
      typeof value.eventType === "string"
        ? AUDIT_METADATA_SCHEMAS[value.eventType]
        : undefined;
    const allowedKeys = schema ? new Set(Object.keys(schema)) : null;
    const metadata = allowedKeys
      ? snapshotKnownDataRecord(value.safeMetadata, allowedKeys)
      : null;
    if (!metadata || !schema) {
      addIssue("INVALID_WORKSPACE", `${path}.safeMetadata`);
    } else {
      for (const [key, candidate] of Object.entries(metadata)) {
        const rule = schema[key];
        const valid =
          rule === "NON_NEGATIVE_INTEGER"
            ? Number.isSafeInteger(candidate) && Number(candidate) >= 0
            : rule === "SCORE"
              ? typeof candidate === "number" &&
                Number.isFinite(candidate) &&
                candidate >= 0 &&
                candidate <= 100
              : rule === "OBLIGATION_STATUS"
                ? OBLIGATION_STATUSES.has(candidate as string)
                : false;
        if (!valid) {
          addIssue("INVALID_WORKSPACE", `${path}.safeMetadata.${key}`);
        }
        if (typeof candidate === "string") {
          if (hasUnsafeAuditStringPrefix(candidate)) {
            addIssue("INVALID_WORKSPACE", `${path}.safeMetadata.${key}`);
          }
          consumeText(candidate, `${path}.safeMetadata.${key}`);
        }
      }
      value.safeMetadata = metadata;
    }
  }
  if (collection === "auditEvents") {
    for (const field of [
      "id",
      "ownerScope",
      "eventType",
      "entityType",
      "entityId",
      "actorScope",
      "occurredAt",
    ] as const) {
      if (hasUnsafeAuditStringPrefix(value[field])) {
        addIssue("INVALID_WORKSPACE", `${path}.${field}`);
      }
    }
  }
}

function hasUnsafeAuditStringPrefix(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.toLowerCase();
  return UNSAFE_AUDIT_STRING_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function validateUnknownFields(
  value: unknown,
  path: string,
  addIssue: (code: WorkspaceIntegrityIssueCode, path: string) => void,
  consumeText: (value: unknown, path: string) => boolean,
): readonly Record<string, unknown>[] | null {
  const fields = snapshotDataArray(
    value,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
  );
  if (fields === ARRAY_LIMIT_EXCEEDED) {
    addIssue("COLLECTION_LIMIT_EXCEEDED", path);
    return null;
  }
  if (!fields) {
    addIssue("INVALID_WORKSPACE", path);
    return null;
  }
  const result: Record<string, unknown>[] = [];
  const confidenceBands = new Set(["LOW", "MEDIUM", "HIGH", "EXACT"]);
  for (let index = 0; index < fields.length; index += 1) {
    const fieldPath = `${path}[${index}]`;
    const field = snapshotKnownDataRecord(fields[index], UNKNOWN_FIELD_KEYS);
    if (!field) {
      addIssue("INVALID_WORKSPACE", fieldPath);
      continue;
    }
    if (typeof field.labelRaw !== "string") {
      addIssue("INVALID_WORKSPACE", `${fieldPath}.labelRaw`);
    } else {
      consumeText(field.labelRaw, `${fieldPath}.labelRaw`);
    }
    if (typeof field.valueRaw !== "string") {
      addIssue("INVALID_WORKSPACE", `${fieldPath}.valueRaw`);
    } else {
      consumeText(field.valueRaw, `${fieldPath}.valueRaw`);
    }
    if (!Number.isSafeInteger(field.page) || Number(field.page) < 1) {
      addIssue("INVALID_WORKSPACE", `${fieldPath}.page`);
    }
    if (!confidenceBands.has(field.confidence as string)) {
      addIssue("INVALID_WORKSPACE", `${fieldPath}.confidence`);
    }
    if (field.evidenceId !== undefined) {
      let validEvidenceId = true;
      try {
        assertBoundedId(field.evidenceId, `${fieldPath}.evidenceId`);
      } catch {
        validEvidenceId = false;
        addIssue("INVALID_WORKSPACE", `${fieldPath}.evidenceId`);
      }
      if (validEvidenceId) {
        consumeText(field.evidenceId, `${fieldPath}.evidenceId`);
      }
    }
    result.push(field);
  }
  return Object.freeze(result);
}

function validateTypedStringArray(
  values: readonly unknown[],
  path: string,
  kind: "ID" | "TEXT",
  addIssue: (code: WorkspaceIntegrityIssueCode, path: string) => void,
): void {
  const seen = kind === "ID" ? new Set<string>() : null;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const itemPath = `${path}[${index}]`;
    if (kind === "TEXT") {
      if (typeof value !== "string") {
        addIssue("INVALID_WORKSPACE", itemPath);
      }
      continue;
    }
    try {
      assertBoundedId(value, itemPath);
    } catch {
      addIssue("INVALID_WORKSPACE", itemPath);
      continue;
    }
    if (seen!.has(value)) {
      addIssue("INVALID_WORKSPACE", itemPath);
      continue;
    }
    seen!.add(value);
  }
}

function validateTemplateRecognition(
  value: unknown,
  path: string,
  addIssue: (code: WorkspaceIntegrityIssueCode, path: string) => void,
  validateArray: (
    candidate: unknown,
    arrayPath: string,
  ) => readonly unknown[] | null,
  consumeText: (value: unknown, path: string) => boolean,
): Record<string, unknown> | null {
  const recognition = snapshotKnownDataRecord(value, TEMPLATE_RECOGNITION_KEYS);
  if (!recognition) {
    addIssue("INVALID_WORKSPACE", path);
    return null;
  }
  if (recognition.traceVersion !== "fiscal-document-template-recognition/1.0.0") {
    addIssue("INVALID_WORKSPACE", `${path}.traceVersion`);
  }
  for (const field of [
    "traceVersion",
    "status",
    "selectedTemplateId",
    "selectedTemplateVersion",
    "reason",
  ] as const) {
    if (typeof recognition[field] === "string") {
      consumeText(recognition[field], `${path}.${field}`);
    }
  }
  if (
    !new Set(["MATCHED", "REVIEW_REQUIRED", "AMBIGUOUS", "UNKNOWN"]).has(
      recognition.status as string,
    )
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.status`);
  }
  if (
    !new Set([
      "NO_CANDIDATE_ABOVE_THRESHOLD",
      "TOP_CANDIDATES_TOO_CLOSE",
      "TEMPLATE_REQUIRES_REVIEW",
      "ACTIVE_TEMPLATE_MATCHED",
    ]).has(recognition.reason as string)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.reason`);
  }
  for (const field of ["selectedTemplateId", "selectedTemplateVersion"] as const) {
    if (recognition[field] !== undefined) {
      try {
        assertBoundedId(recognition[field], `${path}.${field}`);
      } catch {
        addIssue("INVALID_WORKSPACE", `${path}.${field}`);
      }
    }
  }
  const candidates = validateArray(recognition.candidates, `${path}.candidates`);
  if (!candidates) return recognition;
  const safeCandidates: Record<string, unknown>[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidatePath = `${path}.candidates[${index}]`;
    const candidate = snapshotKnownDataRecord(
      candidates[index],
      TEMPLATE_CANDIDATE_KEYS,
    );
    if (!candidate) {
      addIssue("INVALID_WORKSPACE", candidatePath);
      continue;
    }
    for (const field of ["templateId", "templateVersion", "familyId"] as const) {
      try {
        assertBoundedId(candidate[field], `${candidatePath}.${field}`);
      } catch {
        addIssue("INVALID_WORKSPACE", `${candidatePath}.${field}`);
      }
      if (typeof candidate[field] === "string") {
        consumeText(candidate[field], `${candidatePath}.${field}`);
      }
    }
    if (candidate.extractorId !== null) {
      let validExtractorId = true;
      try {
        assertBoundedId(candidate.extractorId, `${candidatePath}.extractorId`);
      } catch {
        validExtractorId = false;
        addIssue("INVALID_WORKSPACE", `${candidatePath}.extractorId`);
      }
      if (validExtractorId) {
        consumeText(candidate.extractorId, `${candidatePath}.extractorId`);
      }
    }
    if (
      typeof candidate.score !== "number" ||
      !Number.isFinite(candidate.score) ||
      candidate.score < 0 ||
      candidate.score > 1
    ) {
      addIssue("INVALID_WORKSPACE", `${candidatePath}.score`);
    }
    if (typeof candidate.activationReady !== "boolean") {
      addIssue("INVALID_WORKSPACE", `${candidatePath}.activationReady`);
    }
    for (const field of TEMPLATE_CANDIDATE_ARRAY_FIELDS) {
      const items = validateArray(
        candidate[field],
        `${candidatePath}.${field}`,
      );
      if (!items) continue;
      candidate[field] = items;
      for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        try {
          assertBoundedId(items[itemIndex], `${candidatePath}.${field}[${itemIndex}]`);
        } catch {
          addIssue(
            "INVALID_WORKSPACE",
            `${candidatePath}.${field}[${itemIndex}]`,
          );
        }
      }
    }
    safeCandidates.push(candidate);
  }
  recognition.candidates = Object.freeze(safeCandidates);
  return recognition;
}

function isPlainDataRecord(value: unknown): value is Record<string, unknown> {
  return snapshotDataRecord(value) !== null;
}

function snapshotDataRecord(
  value: unknown,
  allowedKeys?: ReadonlySet<string>,
): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    const keyLimit = Math.min(
      allowedKeys?.size ?? FISCAL_NOTIFICATION_INPUT_LIMITS.maxRelationKeys,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxRelationKeys,
    );
    if (keys.length > keyLimit) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      if (
        typeof key !== "string" ||
        (allowedKeys !== undefined && !allowedKeys.has(key))
      ) {
        return null;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function snapshotDataArray(
  value: unknown,
  max = FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
): readonly unknown[] | null | typeof ARRAY_LIMIT_EXCEEDED {
  const length = boundedDataArrayLength(value, max);
  if (length === null || length === ARRAY_LIMIT_EXCEEDED) return length;
  return snapshotDataArrayAtLength(value, length);
}

function boundedDataArrayLength(
  value: unknown,
  max: number,
): number | null | typeof ARRAY_LIMIT_EXCEEDED {
  try {
    if (!Array.isArray(value)) return null;
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      Number(lengthDescriptor.value) < 0
    ) {
      return null;
    }
    const length = Number(lengthDescriptor.value);
    if (length > max) return ARRAY_LIMIT_EXCEEDED;
    return length;
  } catch {
    return null;
  }
}

function snapshotDataArrayAtLength(
  value: unknown,
  length: number,
): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) return null;
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        return null;
      }
      const numericKey = Number(key);
      if (
        !Number.isSafeInteger(numericKey) ||
        numericKey < 0 ||
        numericKey >= length
      ) {
        return null;
      }
    }
    const snapshot: unknown[] = new Array(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[index] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function isDeepFrozenPlainData(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const pending: object[] = [value];
  const seen = new WeakSet<object>();
  let visited = 0;
  try {
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      visited += 1;
      if (
        visited >
          FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities * 10 ||
        !Object.isFrozen(current)
      ) {
        return false;
      }
      const prototype = Object.getPrototypeOf(current);
      if (
        prototype !== Object.prototype &&
        prototype !== Array.prototype &&
        prototype !== null
      ) {
        return false;
      }
      for (const key of Reflect.ownKeys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !("value" in descriptor)) return false;
        const child = descriptor.value;
        if (child !== null && typeof child === "object") pending.push(child);
      }
    }
    return true;
  } catch {
    return false;
  }
}

function freezeIntegrityResult(
  issues: readonly WorkspaceIntegrityIssue[],
): WorkspaceIntegrityResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues.map((issue) => Object.freeze({ ...issue }))),
  });
}

function appendIntegrityIssue(
  issues: WorkspaceIntegrityIssue[],
  code: WorkspaceIntegrityIssueCode,
  path: string,
): void {
  if (issues.length < MAX_INTEGRITY_ISSUES) issues.push({ code, path });
}

function validateDriveArchiveStructure(
  value: Record<string, unknown>,
  path: string,
  addIssue: (code: WorkspaceIntegrityIssueCode, path: string) => void,
  consumeNested: (length: number, path: string) => boolean,
  consumeText: (value: unknown, path: string) => boolean,
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !DRIVE_ARCHIVE_KEYS.has(key)) {
      addIssue("INVALID_WORKSPACE", `${path}.$unknown`);
      return;
    }
  }
  for (const field of ["id", "ownerScope", "fileId"] as const) {
    try {
      if (field === "ownerScope") {
        assertBoundedOwnerScope(value[field], `${path}.${field}`);
      } else {
        assertBoundedId(value[field], `${path}.${field}`);
      }
      consumeText(value[field], `${path}.${field}`);
    } catch (error) {
      if (error === NESTED_BUDGET_ABORT) throw error;
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    }
  }
  if (
    typeof value.sourceSha256 !== "string" ||
    !SHA256_HEX.test(value.sourceSha256)
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.sourceSha256`);
  } else {
    consumeText(value.sourceSha256, `${path}.sourceSha256`);
  }
  for (const field of ["driveFileId", "driveFolderId"] as const) {
    if (typeof value[field] !== "string" || !GOOGLE_DRIVE_ID.test(value[field])) {
      addIssue("INVALID_WORKSPACE", `${path}.${field}`);
    } else {
      consumeText(value[field], `${path}.${field}`);
    }
  }
  const documentIds = snapshotDataArray(
    value.documentIds,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
  );
  if (documentIds === ARRAY_LIMIT_EXCEEDED) {
    addIssue("COLLECTION_LIMIT_EXCEEDED", `${path}.documentIds`);
  } else if (!documentIds || documentIds.length === 0) {
    addIssue("INVALID_WORKSPACE", `${path}.documentIds`);
  } else {
    consumeNested(documentIds.length, `${path}.documentIds`);
    const seen = new Set<string>();
    for (let index = 0; index < documentIds.length; index += 1) {
      const id = documentIds[index];
      try {
        assertBoundedId(id, `${path}.documentIds[${index}]`);
        consumeText(id, `${path}.documentIds[${index}]`);
        if (seen.has(id)) throw new Error("DUPLICATE_DOCUMENT_ID");
        seen.add(id);
      } catch (error) {
        if (error === NESTED_BUDGET_ABORT) throw error;
        addIssue("INVALID_WORKSPACE", `${path}.documentIds[${index}]`);
      }
    }
  }
  if (
    value.documentDate !== null &&
    (typeof value.documentDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(value.documentDate) ||
      !isIsoDateOrTimestamp(value.documentDate))
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.documentDate`);
  } else if (typeof value.documentDate === "string") {
    consumeText(value.documentDate, `${path}.documentDate`);
  }
  if (value.archiveStatus !== "ARCHIVED_VERIFIED") {
    addIssue("INVALID_WORKSPACE", `${path}.archiveStatus`);
  }
  if (value.reviewStatus !== "USER_CONFIRMED") {
    addIssue("INVALID_WORKSPACE", `${path}.reviewStatus`);
  }
  if (value.verificationMethod !== "SHA256_READBACK_MATCH") {
    addIssue("INVALID_WORKSPACE", `${path}.verificationMethod`);
  }
  for (const field of [
    "archiveStatus",
    "reviewStatus",
    "verificationMethod",
  ] as const) {
    if (typeof value[field] === "string") {
      consumeText(value[field], `${path}.${field}`);
    }
  }
  if (value.recordVersion !== 1) {
    addIssue("INVALID_WORKSPACE", `${path}.recordVersion`);
  }
  if (
    !Number.isSafeInteger(value.workspaceRevision) ||
    Number(value.workspaceRevision) < 1
  ) {
    addIssue("INVALID_WORKSPACE", `${path}.workspaceRevision`);
  }
  if (!isIsoTimestamp(value.archivedAt)) {
    addIssue("INVALID_WORKSPACE", `${path}.archivedAt`);
  } else {
    consumeText(value.archivedAt, `${path}.archivedAt`);
  }
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isIsoDateOrTimestamp(value: unknown): value is string {
  if (isIsoTimestamp(value)) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed) &&
    new Date(parsed).toISOString() === `${value}T00:00:00.000Z`
  );
}

function checkCents(
  value: unknown,
  path: string,
  issues: WorkspaceIntegrityIssue[],
): void {
  if (value === undefined) return;
  try {
    assertNonNegativeIntegerCents(value, path);
  } catch {
    appendIntegrityIssue(issues, "INVALID_AMOUNT", path);
  }
}

function checkRequiredCents(
  value: unknown,
  path: string,
  issues: WorkspaceIntegrityIssue[],
): void {
  if (value === undefined) {
    appendIntegrityIssue(issues, "INVALID_AMOUNT", path);
    return;
  }
  checkCents(value, path, issues);
}

function checkComponents(
  components: unknown,
  path: string,
  issues: WorkspaceIntegrityIssue[],
  requireDocumentEvidence: (
    values: unknown,
    path: string,
    documentId: unknown,
    countText?: boolean,
  ) => void,
  documentId: unknown,
  consumeNested: (length: number, path: string) => boolean,
  consumeText: (value: unknown, path: string) => boolean,
): void {
  const componentInputs = snapshotDataArray(
    components,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
  );
  if (componentInputs === ARRAY_LIMIT_EXCEEDED) {
    appendIntegrityIssue(issues, "COLLECTION_LIMIT_EXCEEDED", path);
    return;
  }
  if (!componentInputs) {
    appendIntegrityIssue(issues, "INVALID_WORKSPACE", path);
    return;
  }
  for (let index = 0; index < componentInputs.length; index += 1) {
    const component = snapshotKnownDataRecord(
      componentInputs[index],
      MONEY_COMPONENT_KEYS,
    );
    if (!component) {
      appendIntegrityIssue(issues, "INVALID_WORKSPACE", `${path}[${index}]`);
      continue;
    }
    if (!MONEY_COMPONENT_TYPES.has(component.type as string)) {
      appendIntegrityIssue(issues, "INVALID_WORKSPACE", `${path}[${index}].type`);
    } else {
      consumeText(component.type, `${path}[${index}].type`);
    }
    if (!ASSERTION_TYPES.has(component.assertionType as string)) {
      appendIntegrityIssue(
        issues,
        "INVALID_WORKSPACE",
        `${path}[${index}].assertionType`,
      );
    } else {
      consumeText(
        component.assertionType,
        `${path}[${index}].assertionType`,
      );
    }
    checkRequiredCents(component.amountCents, `${path}[${index}].amountCents`, issues);
    const evidencePath = `${path}[${index}].evidenceIds`;
    const evidenceIds = snapshotDataArray(
      component.evidenceIds,
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
    );
    if (evidenceIds === ARRAY_LIMIT_EXCEEDED) {
      appendIntegrityIssue(issues, "COLLECTION_LIMIT_EXCEEDED", evidencePath);
    } else if (!evidenceIds) {
      appendIntegrityIssue(issues, "INVALID_WORKSPACE", evidencePath);
    } else {
      consumeNested(evidenceIds.length, evidencePath);
      requireDocumentEvidence(evidenceIds, evidencePath, documentId, true);
    }
    if (component.deterministicTrace !== undefined) {
      const trace = snapshotKnownDataRecord(
        component.deterministicTrace,
        DETERMINISTIC_TRACE_KEYS,
      );
      if (!trace) {
        appendIntegrityIssue(
          issues,
          "INVALID_WORKSPACE",
          `${path}[${index}].deterministicTrace`,
        );
        continue;
      }
      let validRuleId = true;
      try {
        assertBoundedId(trace.ruleId, `${path}[${index}].deterministicTrace.ruleId`);
      } catch {
        validRuleId = false;
        appendIntegrityIssue(
          issues,
          "INVALID_WORKSPACE",
          `${path}[${index}].deterministicTrace.ruleId`,
        );
      }
      if (validRuleId) {
        consumeText(
          trace.ruleId,
          `${path}[${index}].deterministicTrace.ruleId`,
        );
      }
      if (!Number.isSafeInteger(trace.ruleVersion) || Number(trace.ruleVersion) < 0) {
        appendIntegrityIssue(
          issues,
          "INVALID_WORKSPACE",
          `${path}[${index}].deterministicTrace.ruleVersion`,
        );
      }
      checkOpaqueIdList(
        trace.officialSourceIds,
        `${path}[${index}].deterministicTrace.officialSourceIds`,
        issues,
        consumeNested,
        consumeText,
      );
      const inputEvidencePath =
        `${path}[${index}].deterministicTrace.inputEvidenceIds`;
      const inputEvidenceIds = snapshotDataArray(
        trace.inputEvidenceIds,
        FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
      );
      if (inputEvidenceIds === ARRAY_LIMIT_EXCEEDED) {
        appendIntegrityIssue(
          issues,
          "COLLECTION_LIMIT_EXCEEDED",
          inputEvidencePath,
        );
      } else if (!inputEvidenceIds) {
        appendIntegrityIssue(issues, "INVALID_WORKSPACE", inputEvidencePath);
      } else {
        consumeNested(inputEvidenceIds.length, inputEvidencePath);
        requireDocumentEvidence(
          inputEvidenceIds,
          inputEvidencePath,
          documentId,
          true,
        );
      }
    }
  }
}

function checkAccountingComponents(
  components: unknown,
  path: string,
  issues: WorkspaceIntegrityIssue[],
  consumeText: (value: unknown, path: string) => boolean,
): void {
  const componentInputs = snapshotDataArray(
    components,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
  );
  if (componentInputs === ARRAY_LIMIT_EXCEEDED) {
    appendIntegrityIssue(issues, "COLLECTION_LIMIT_EXCEEDED", path);
    return;
  }
  if (!componentInputs) {
    appendIntegrityIssue(issues, "INVALID_WORKSPACE", path);
    return;
  }
  for (let index = 0; index < componentInputs.length; index += 1) {
    const component = snapshotKnownDataRecord(
      componentInputs[index],
      ACCOUNTING_COMPONENT_KEYS,
    );
    if (!component) {
      appendIntegrityIssue(issues, "INVALID_WORKSPACE", `${path}[${index}]`);
      continue;
    }
    if (!MONEY_COMPONENT_TYPES.has(component.componentType as string)) {
      appendIntegrityIssue(
        issues,
        "INVALID_WORKSPACE",
        `${path}[${index}].componentType`,
      );
    } else {
      consumeText(
        component.componentType,
        `${path}[${index}].componentType`,
      );
    }
    if (!ACCOUNTING_TREATMENT_STATUSES.has(component.treatmentStatus as string)) {
      appendIntegrityIssue(
        issues,
        "INVALID_WORKSPACE",
        `${path}[${index}].treatmentStatus`,
      );
    } else {
      consumeText(
        component.treatmentStatus,
        `${path}[${index}].treatmentStatus`,
      );
    }
    checkRequiredCents(
      component.amountCents,
      `${path}[${index}].amountCents`,
      issues,
    );
  }
}

function snapshotKnownDataRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  return snapshotDataRecord(value, allowedKeys);
}

function checkOpaqueIdList(
  values: unknown,
  path: string,
  issues: WorkspaceIntegrityIssue[],
  consumeNested: (length: number, path: string) => boolean,
  consumeText: (value: unknown, path: string) => boolean,
): void {
  const ids = snapshotDataArray(
    values,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
  );
  if (ids === ARRAY_LIMIT_EXCEEDED) {
    appendIntegrityIssue(issues, "COLLECTION_LIMIT_EXCEEDED", path);
    return;
  }
  if (!ids) {
    appendIntegrityIssue(issues, "INVALID_WORKSPACE", path);
    return;
  }
  consumeNested(ids.length, path);
  const seen = new Set<string>();
  for (let index = 0; index < ids.length; index += 1) {
    try {
      assertBoundedId(ids[index], `${path}[${index}]`);
    } catch {
      appendIntegrityIssue(issues, "INVALID_WORKSPACE", `${path}[${index}]`);
      continue;
    }
    consumeText(ids[index], `${path}[${index}]`);
    if (seen.has(ids[index] as string)) {
      appendIntegrityIssue(issues, "INVALID_WORKSPACE", `${path}[${index}]`);
      continue;
    }
    seen.add(ids[index] as string);
  }
}

function validateSnapshotSupersessionGraph(
  snapshots: readonly {
    id: string;
    supersedesAnalysisId?: string;
  }[],
  addIssue: (code: WorkspaceIntegrityIssueCode, path: string) => void,
): void {
  const byId = new Map(
    snapshots.map((snapshot, index) => [snapshot.id, { snapshot, index }]),
  );
  const state = new Map<string, "VISITING" | "DONE">();

  for (const start of snapshots) {
    if (state.get(start.id) === "DONE") continue;
    const chain: string[] = [];
    let current = byId.get(start.id);
    while (current && state.get(current.snapshot.id) !== "DONE") {
      const currentState = state.get(current.snapshot.id);
      if (currentState === "VISITING") break;
      state.set(current.snapshot.id, "VISITING");
      chain.push(current.snapshot.id);

      const parentId = current.snapshot.supersedesAnalysisId;
      if (!parentId || parentId === current.snapshot.id) break;
      const parentState = state.get(parentId);
      if (parentState === "VISITING") {
        addIssue(
          "INVALID_WORKSPACE",
          `workspace.analysisSnapshots[${current.index}].supersedesAnalysisId`,
        );
        break;
      }
      if (parentState === "DONE") break;
      current = byId.get(parentId);
    }
    for (const id of chain) state.set(id, "DONE");
  }
}

function consumeAdministrativeProjectionText(
  projection: {
    ownerScope: string;
    documentId: string;
    extractorId: string;
    extractorVersion: string;
    createdAt: string;
    familyId: string | null;
    status: string;
    materializationPolicy: string;
    roleAssertions: readonly {
      id: string;
      ownerScope: string;
      documentId: string;
      partyRefId: string;
      role: string;
      assertionType: string;
      createdAt: string;
      supersedesAssertionId?: string;
    }[];
    moneyFacts: readonly {
      id: string;
      ownerScope: string;
      documentId: string;
      kind: string;
      currency: string;
      assertionType: string;
      sourceActRefId?: string;
      lineageParentIds: readonly string[];
      status: string;
      createdAt: string;
    }[];
    validationIssues: readonly {
      code: string;
      severity: string;
      path: string;
    }[];
  },
  consumeText: (value: unknown, path: string) => boolean,
  consumeNested: (length: number, path: string) => boolean,
): void {
  const root = "workspace.analysisSnapshots.structuredData.administrativeDomain";
  for (const field of [
    "ownerScope",
    "documentId",
    "extractorId",
    "extractorVersion",
    "createdAt",
    "status",
    "materializationPolicy",
  ] as const) {
    consumeText(projection[field], `${root}.${field}`);
  }
  if (projection.familyId !== null) {
    consumeText(projection.familyId, `${root}.familyId`);
  }
  for (let index = 0; index < projection.roleAssertions.length; index += 1) {
    const assertion = projection.roleAssertions[index]!;
    for (const field of [
      "id",
      "ownerScope",
      "documentId",
      "partyRefId",
      "role",
      "assertionType",
      "createdAt",
    ] as const) {
      consumeText(assertion[field], `${root}.roleAssertions[${index}].${field}`);
    }
    if (assertion.supersedesAssertionId !== undefined) {
      consumeText(
        assertion.supersedesAssertionId,
        `${root}.roleAssertions[${index}].supersedesAssertionId`,
      );
    }
  }
  for (let index = 0; index < projection.moneyFacts.length; index += 1) {
    const fact = projection.moneyFacts[index]!;
    for (const field of [
      "id",
      "ownerScope",
      "documentId",
      "kind",
      "currency",
      "assertionType",
      "status",
      "createdAt",
    ] as const) {
      consumeText(fact[field], `${root}.moneyFacts[${index}].${field}`);
    }
    if (fact.sourceActRefId !== undefined) {
      consumeText(
        fact.sourceActRefId,
        `${root}.moneyFacts[${index}].sourceActRefId`,
      );
    }
    consumeNested(
      fact.lineageParentIds.length,
      `${root}.moneyFacts[${index}].lineageParentIds`,
    );
    for (
      let parentIndex = 0;
      parentIndex < fact.lineageParentIds.length;
      parentIndex += 1
    ) {
      consumeText(
        fact.lineageParentIds[parentIndex],
        `${root}.moneyFacts[${index}].lineageParentIds[${parentIndex}]`,
      );
    }
  }
  for (let index = 0; index < projection.validationIssues.length; index += 1) {
    const issue = projection.validationIssues[index]!;
    consumeText(issue.code, `${root}.validationIssues[${index}].code`);
    consumeText(issue.severity, `${root}.validationIssues[${index}].severity`);
    consumeText(issue.path, `${root}.validationIssues[${index}].path`);
  }
}

function checkProjectionEvidence(
  projection: {
    ownerScope: string;
    documentId: string;
    roleAssertions: readonly { evidenceIds: readonly string[] }[];
    moneyFacts: readonly { evidenceIds: readonly string[] }[];
  },
  path: string,
  requireDocumentEvidence: (
    values: unknown,
    path: string,
    documentId: unknown,
    countText?: boolean,
  ) => void,
  consumeNested: (length: number, path: string) => boolean,
): void {
  for (let index = 0; index < projection.roleAssertions.length; index += 1) {
    const evidenceIds = projection.roleAssertions[index]!.evidenceIds;
    const evidencePath = `${path}.roleAssertions[${index}].evidenceIds`;
    if (consumeNested(evidenceIds.length, evidencePath)) {
      requireDocumentEvidence(
        evidenceIds,
        evidencePath,
        projection.documentId,
        true,
      );
    }
  }
  for (let index = 0; index < projection.moneyFacts.length; index += 1) {
    const evidenceIds = projection.moneyFacts[index]!.evidenceIds;
    const evidencePath = `${path}.moneyFacts[${index}].evidenceIds`;
    if (consumeNested(evidenceIds.length, evidencePath)) {
      requireDocumentEvidence(
        evidenceIds,
        evidencePath,
        projection.documentId,
        true,
      );
    }
  }
}
