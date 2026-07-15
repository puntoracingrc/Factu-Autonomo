import type { TaxObligationsAssessmentV1 } from "../tax-obligations/contracts";

export const TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const TAX_MODEL_DIAGNOSTIC_ENGINE_VERSION =
  "tax-model-diagnostic.engine.2026-07.v1" as const;

export type FourWayAnswer = "YES" | "NO" | "UNKNOWN" | "NOT_APPLICABLE";
export type YesNoAnswer = "YES" | "NO" | "UNKNOWN";

export type FiscalTerritory =
  | "UNKNOWN"
  | "ES_COMMON"
  | "ES_CANARY"
  | "ES_NAVARRA"
  | "ES_BASQUE_ALAVA"
  | "ES_BASQUE_BIZKAIA"
  | "ES_BASQUE_GIPUZKOA"
  | "ES_CEUTA"
  | "ES_MELILLA"
  | "NON_RESIDENT"
  | "UNCERTAIN";

export type InvoicingSubject =
  | "UNKNOWN"
  | "NATURAL_PERSON"
  | "COMPANY"
  | "COMMUNITY_OF_PROPERTY"
  | "CIVIL_PARTNERSHIP"
  | "OTHER_ENTITY";

export type TaxpayerRole =
  | "UNKNOWN"
  | "INDIVIDUAL_SELF_EMPLOYED"
  | "CORPORATE_SELF_EMPLOYED"
  | "COLLABORATING_SELF_EMPLOYED"
  | "PARTNER_OR_COMMUNITY_MEMBER"
  | "DIRECTOR"
  | "SEVERAL";

export type ActivityKind =
  | "PROFESSIONAL"
  | "BUSINESS"
  | "AGRICULTURE"
  | "LIVESTOCK"
  | "FORESTRY"
  | "OTHER";

export type IncomeTaxRegime =
  | "UNKNOWN"
  | "DIRECT_NORMAL"
  | "DIRECT_SIMPLIFIED"
  | "OBJECTIVE_ESTIMATION"
  | "ENTITY_ATTRIBUTION"
  | "NOT_APPLICABLE";

export type DiagnosticVatRegime =
  | "GENERAL"
  | "SIMPLIFIED"
  | "EQUIVALENCE_SURCHARGE"
  | "AGRICULTURE_LIVESTOCK_FISHING"
  | "CASH_ACCOUNTING"
  | "EXEMPT"
  | "NOT_SUBJECT"
  | "OTHER_SPECIAL";

export type TaxModelNumber =
  | "035"
  | "036"
  | "100"
  | "111"
  | "115"
  | "123"
  | "130"
  | "131"
  | "180"
  | "184"
  | "190"
  | "193"
  | "200"
  | "202"
  | "216"
  | "296"
  | "303"
  | "308"
  | "309"
  | "341"
  | "347"
  | "349"
  | "369"
  | "390"
  | "714"
  | "720"
  | "721";

export interface TaxpayerProfile {
  fiscalYear: 2025 | 2026;
  territory: FiscalTerritory;
  invoicingSubject: InvoicingSubject;
  taxpayerRole: TaxpayerRole;
  hasPersonalActivity: FourWayAnswer;
  retaDuringYear: FourWayAnswer;
  activityStartDate: string | null;
  activityStillActive: YesNoAnswer;
  activityEndDate: string | null;
  activityKinds: ActivityKind[];
  incomeTaxRegime: IncomeTaxRegime;
  withheldIncomePercent: number | null;
  vatRegimes: DiagnosticVatRegime[];
  redeme: FourWayAnswer;
  sii: FourWayAnswer;
  largeCompany: FourWayAnswer;
  vatAnnualSummaryExempt: FourWayAnswer;
  reverseChargeTransactions: FourWayAnswer;
  specialVatRefundSituation: FourWayAnswer;
  employees: FourWayAnswer;
  paidProfessionalsWithWithholding: FourWayAnswer;
  otherIrpfWithholdingPayments: FourWayAnswer;
  rentsBusinessPremises: FourWayAnswer;
  rentSubjectToWithholding: FourWayAnswer;
  landlordWithholdingExemption: FourWayAnswer;
  paidCapitalIncome: FourWayAnswer;
  paidNonResidentIncome: FourWayAnswer;
  nonResidentWithholdingConfirmed: FourWayAnswer;
  euGoodsSales: FourWayAnswer;
  euGoodsPurchases: FourWayAnswer;
  euServicesSales: FourWayAnswer;
  euServicesPurchases: FourWayAnswer;
  roiRegistered: FourWayAnswer;
  euConsumerSales: FourWayAnswer;
  ossRegistered: FourWayAnswer;
  thirdPartyThresholdExceeded: FourWayAnswer;
  thirdPartyOperationsAllExcluded: FourWayAnswer;
  companyInstallmentPayments: FourWayAnswer;
  attributionEntityIncomeAboveThreshold: FourWayAnswer;
  foreignAssetsPotentiallyReportable: FourWayAnswer;
  foreignCryptoPotentiallyReportable: FourWayAnswer;
  wealthTaxPotentiallyApplicable: FourWayAnswer;
  changesDuringYear: FourWayAnswer;
  censusReviewed: FourWayAnswer;
  censusObligations: TaxModelNumber[];
}

export type EvidenceType =
  | "USER_ANSWER"
  | "CURRENT_CENSUS"
  | "AEAT_CENSUS_SCREENSHOT"
  | "MODEL_036"
  | "PREVIOUS_RETURN"
  | "OPERATIONS_DOCUMENT"
  | "OTHER";

export type ExtractionMethod =
  | "MANUAL"
  | "PDF_NATIVE_TEXT"
  | "OCR_LOCAL"
  | "OCR_EXTERNAL";

export type EvidenceValue =
  | string
  | number
  | boolean
  | null
  | readonly string[];

export interface Evidence {
  evidenceId: string;
  type: EvidenceType;
  documentId?: string;
  page?: number;
  field: string;
  sourceLocation?: string;
  value: EvidenceValue;
  confidence: number;
  date?: string;
  extractionMethod: ExtractionMethod;
  userConfirmed: boolean;
  sourcePriority: number;
}

export interface OfficialSource {
  sourceId: string;
  authority: "AEAT" | "BOE" | "SEGURIDAD_SOCIAL" | "EU";
  title: string;
  url: string;
  location: string;
  officialUpdatedAt: string | null;
  lastVerifiedAt: string;
  verificationStatus: "VERIFIED";
}

export type TaxRuleReviewStatus =
  | "PENDING_FISCAL_REVIEW"
  | "APPROVED"
  | "RETIRED";

export type FiscalReviewStatus =
  | "PENDING_FISCAL_REVIEW"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type FiscalResolutionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REOPENED";

export type FiscalTestsStatus =
  | "NOT_IMPLEMENTED"
  | "INCOMPLETE"
  | "FAILING"
  | "PASSING";

export type FiscalSourceStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "STALE"
  | "SUPERSEDED"
  | "UNAVAILABLE";

export type FiscalIssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "READY_FOR_VERIFICATION"
  | "VERIFIED"
  | "REOPENED";

export type FiscalReviewerRole =
  | "PRIMARY_FISCAL_REVIEWER"
  | "SECOND_FISCAL_REVIEWER"
  | "TECHNICAL_REVIEWER";

export interface FiscalReviewerIdentity {
  reviewerId: string;
  role: FiscalReviewerRole;
  identityProvider: string;
  verificationId: string;
}

export interface FiscalRuleReviewMetadata {
  reviewStatus: FiscalReviewStatus;
  resolutionStatus: FiscalResolutionStatus;
  testsStatus: FiscalTestsStatus;
  sourceStatus: FiscalSourceStatus;
  issueIds: readonly string[];
  primaryFiscalReviewer: FiscalReviewerIdentity | null;
  secondFiscalReviewer: FiscalReviewerIdentity | null;
  technicalReviewer: FiscalReviewerIdentity | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  approvedAt: string | null;
  approvedRuleHash: string | null;
  approvalEvidenceId: string | null;
  approvalEvidenceVerified: boolean;
  approvalEvidenceOrigin: "SIGNED_FISCAL_ARTIFACT" | null;
  comments: readonly string[];
}

export interface FiscalSourceSnapshot {
  sourceId: string;
  authority: OfficialSource["authority"];
  title: string;
  officialLocator: string;
  sourceType: "OFFICIAL_REFERENCE";
  publishedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  retrievedAt: string | null;
  snapshotHash: string | null;
  materialScope: string | null;
  status: FiscalSourceStatus;
  supersedesSourceId: string | null;
  verifiedBy: FiscalReviewerIdentity | null;
  verifiedAt: string | null;
}

export type FiscalExclusionEffectType =
  | "ADVISORY_EXCLUSION_CANDIDATE"
  | "EXCLUDE_MODEL";

export interface FiscalExclusionCandidate {
  exclusionId: string;
  description: string;
  effectType: FiscalExclusionEffectType;
  model: TaxModelNumber;
  conditions: readonly string[];
  exceptionIds: readonly string[];
  reviewStatus: FiscalReviewStatus;
  resolutionStatus: FiscalResolutionStatus;
  sourceIds: readonly string[];
  testCaseIds: readonly string[];
}

export interface FiscalRuleMetadata {
  ruleId: string;
  rulesetId: string;
  model: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  territory: "ES_COMMON";
  effectiveFrom: string;
  effectiveTo: string | null;
  review: FiscalRuleReviewMetadata;
  sourceSnapshots: readonly FiscalSourceSnapshot[];
  ruleHash: string;
  exclusionCandidates: readonly FiscalExclusionCandidate[];
  testCaseIds: readonly string[];
  questionIds: readonly string[];
  factIds: readonly string[];
}

export interface FiscalRulesetAuthorizationMetadata {
  rulesetId: string;
  reviewStatus: FiscalReviewStatus;
  resolutionStatus: FiscalResolutionStatus;
}

export interface FiscalApprovalEvidence {
  evidenceId: string;
  ruleHash: string;
  verified: boolean;
  origin: "SIGNED_FISCAL_ARTIFACT" | "INTERNAL_OVERRIDE";
}

export interface FiscalIssueReference {
  issueId: string;
  status: FiscalIssueStatus;
}

export interface TaxRule {
  ruleId: string;
  version: string;
  fiscalYear: 2025 | 2026;
  territory: "ES_COMMON";
  effectiveFrom: string;
  effectiveTo: string | null;
  modelNumber: TaxModelNumber;
  conditions: readonly string[];
  exclusions: readonly string[];
  result: string;
  officialSourceIds: readonly string[];
  lastVerifiedAt: string;
  reviewedBy: string;
  reviewStatus: TaxRuleReviewStatus;
  tests: readonly string[];
  fiscalMetadata: FiscalRuleMetadata;
}

export type ModelResultStatus =
  | "CONFIRMED_BY_CENSUS"
  | "DERIVED"
  | "CONDITIONAL"
  | "NOT_APPLICABLE"
  | "NEEDS_INFORMATION"
  | "NEEDS_PROFESSIONAL_REVIEW"
  | "CENSUS_MISMATCH"
  | "TERRITORY_NOT_SUPPORTED";

export type FilingSubject =
  | "PERSONA_FISICA"
  | "SOCIEDAD"
  | "ENTIDAD"
  | "SOCIOS_O_COMUNEROS"
  | "POR_DETERMINAR";

export type FilingPeriodicity =
  | "EVENT_DRIVEN"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL"
  | "PER_OPERATION"
  | "TO_BE_CONFIRMED";

export interface ModelResult {
  modelNumber: TaxModelNumber;
  filingSubject: FilingSubject;
  status: ModelResultStatus;
  periods: string[];
  periodicity: FilingPeriodicity;
  reason: string;
  evidence: string[];
  missingInformation: string[];
  officialSources: OfficialSource[];
  confidence: number;
  nextAction: string;
  censusMismatch?: string;
  ruleIds: string[];
}

export interface DiagnosticResult {
  schemaVersion: typeof TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION;
  engineVersion: typeof TAX_MODEL_DIAGNOSTIC_ENGINE_VERSION;
  ruleSetVersion: string;
  fiscalYear: 2025 | 2026;
  territory: FiscalTerritory;
  generatedAt: string;
  status:
    | "READY"
    | "NEEDS_INFORMATION"
    | "NEEDS_PROFESSIONAL_REVIEW"
    | "TERRITORY_NOT_SUPPORTED";
  models: ModelResult[];
  missingInformation: string[];
  discrepancies: string[];
  warnings: string[];
}

export interface TaxModelDiagnosticSession {
  schemaVersion: typeof TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION;
  profile: TaxpayerProfile;
  evidence: Evidence[];
  completedQuestionIds: string[];
  currentSection: string;
  updatedAt: string;
  lastResult?: DiagnosticResult;
  /** Immutable public snapshot replaced only after confirming a new result. */
  publishedAssessment?: TaxObligationsAssessmentV1;
}

export type DiagnosticQuestionKind =
  | "CHOICE"
  | "MULTI_CHOICE"
  | "FOUR_WAY"
  | "DATE"
  | "PERCENTAGE";

export interface DiagnosticQuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface DiagnosticQuestion {
  questionId: string;
  sectionId: string;
  field: keyof TaxpayerProfile;
  kind: DiagnosticQuestionKind;
  label: string;
  explanation: string;
  why: string;
  affectedModels: readonly TaxModelNumber[];
  example: string;
  supportingDocument: string;
  options?: readonly DiagnosticQuestionOption[];
  applicability?: string;
  required: boolean;
}

export interface DiagnosticQuestionSection {
  sectionId: string;
  shortLabel: string;
  title: string;
  description: string;
}
