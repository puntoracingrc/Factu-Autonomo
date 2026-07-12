export type Jurisdiction =
  | "UNKNOWN"
  | "ES_COMMON"
  | "ES_CANARY_IGIC"
  | "ES_NAVARRA"
  | "ES_BASQUE_COUNTRY"
  | "ES_CEUTA_MELILLA";

export type TaxpayerType = "UNKNOWN" | "SELF_EMPLOYED_IRPF" | "COMPANY_IS";

export type DirectTaxRegime =
  | "DIRECT_ESTIMATION_NORMAL"
  | "DIRECT_ESTIMATION_SIMPLIFIED"
  | "UNKNOWN";

export type VatRegime = "GENERAL" | "PRORATA" | "EXEMPT" | "UNKNOWN";

export interface TaxContext {
  jurisdiction: Jurisdiction;
  taxpayerType: TaxpayerType;
  directTaxRegime: DirectTaxRegime;
  vatRegime: VatRegime;
  hasFullVatDeductionRight: boolean;
  activityDescription: string;
  activityCode?: string;
  fiscalYear: number;
}

export type PaymentMethod =
  | "CARD"
  | "BANK_TRANSFER"
  | "DIRECT_DEBIT"
  | "CASH"
  | "OTHER"
  | "UNKNOWN";

export type InvoiceType =
  | "FULL_INVOICE"
  | "SIMPLIFIED_INVOICE"
  | "RECEIPT"
  | "NO_DOCUMENT"
  | "UNKNOWN";

export type RuleCategory = "MEALS_AND_HOSPITALITY" | "VEHICLE_RUNNING_COSTS";

export type AnswerValue = string | number | boolean | string[];
export type ExpenseAnswers = Readonly<Record<string, AnswerValue>>;

export interface ExpenseAnnualContext {
  netTurnoverCents?: number;
  clientAttentionDeductedCents?: number;
  maintenanceDeductedSameDayCents?: number;
}

export interface ExpenseInput {
  concept: string;
  supplierName?: string;
  expenseDate: string;
  /** false significa que los ceros de transporte no son importes reales ni calculables. */
  amountsKnown?: boolean;
  netAmountCents: number;
  vatAmountCents: number;
  totalAmountCents: number;
  currency: string;
  paymentMethod: PaymentMethod;
  invoiceType: InvoiceType;
  extractedText?: string;
  answers?: ExpenseAnswers;
  annualContext?: ExpenseAnnualContext;
  manualCategory?: RuleCategory;
}

export type OfficialAuthority = "BOE" | "AEAT" | "DGT";
export type OfficialSourceType =
  | "LAW"
  | "REGULATION"
  | "ADMINISTRATIVE_GUIDANCE"
  | "BINDING_RULING";
export type SourceVerificationStatus = "VERIFIED" | "PENDING_VERIFICATION";

export interface OfficialSource {
  id: string;
  authority: OfficialAuthority;
  sourceType: OfficialSourceType;
  title: string;
  legalReference: string;
  officialUrl: string;
  retrievedAt: string;
  effectiveFrom: string | null;
  effectiveTo?: string;
  notes: string;
  verificationStatus: SourceVerificationStatus;
}

export type LegalReviewStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "RETIRED";

export type QuestionType =
  | "SINGLE_CHOICE"
  | "BOOLEAN"
  | "TEXT"
  | "MONEY_CENTS"
  | "PERCENTAGE";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface ConditionalQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: readonly QuestionOption[];
}

export type EvaluationStatus =
  | "RESOLVED"
  | "NEEDS_INPUT"
  | "NEEDS_REVIEW"
  | "NO_MATCH"
  | "UNSUPPORTED";

export type MatchMethod =
  | "EXACT"
  | "ALIAS"
  | "TOKEN"
  | "MANUAL_CATEGORY"
  | "NONE";

export type RiskLevel = "GREEN" | "YELLOW" | "RED" | "UNDETERMINED";

export type TaxEligibility =
  | "FULL"
  | "PARTIAL"
  | "POTENTIALLY_DEDUCTIBLE"
  | "NONE"
  | "NEEDS_REVIEW"
  | "NOT_APPLICABLE";

export interface AppliedLimit {
  code: string;
  label: string;
  limitAmountCents: number;
  consumedAmountCents?: number;
  remainingBeforeExpenseCents?: number;
  excessAmountCents: number;
}

export interface TaxOutcome {
  taxType: "IRPF" | "IVA" | "IS" | "IGIC" | "IPSI";
  eligibility: TaxEligibility;
  theoreticalPercentage: number;
  /**
   * Ausente en resultados históricos y equivalente a CALCULATED. Cuando es
   * NOT_CALCULATED, el cero del DTO es solo transporte y no un importe fiscal.
   */
  amountStatus?: "CALCULATED" | "NOT_CALCULATED";
  deductibleAmountCents: number;
  appliedLimit: AppliedLimit | null;
  explanation: string;
}

export interface CalculationTraceStep {
  code: string;
  label: string;
  detail: string;
  amountCents?: number;
  percentage?: number;
}

export interface EvaluationDecision {
  status: EvaluationStatus;
  risk: RiskLevel;
  directTax: TaxOutcome | null;
  indirectTax: TaxOutcome | null;
  requiredQuestions: readonly ConditionalQuestion[];
  missingInformation: readonly string[];
  evidenceRequired: readonly string[];
  practicalAdvice: readonly string[];
  warnings: readonly string[];
  calculationTrace: readonly CalculationTraceStep[];
  requiresHumanReview: boolean;
}

export interface RuleEvaluationRequest {
  input: ExpenseInput;
  context: TaxContext;
  answers: ExpenseAnswers;
}

export type RuleEvaluator = (
  request: RuleEvaluationRequest,
) => EvaluationDecision;

export interface RuleDefinition {
  id: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  supportedJurisdictions: readonly Jurisdiction[];
  supportedTaxpayerTypes: readonly TaxpayerType[];
  category: RuleCategory;
  canonicalConcept: string;
  aliases: readonly string[];
  conditionalQuestions: readonly ConditionalQuestion[];
  evaluator: RuleEvaluator;
  officialSources: readonly OfficialSource[];
  legalReviewStatus: LegalReviewStatus;
}

export interface RuleMatchCandidate {
  rule: RuleDefinition;
  matchedBy: MatchMethod;
  score: number;
  reason: string;
}

export interface RuleMatchResult {
  status: "MATCH" | "AMBIGUOUS" | "NO_MATCH";
  selected: RuleMatchCandidate | null;
  candidates: readonly RuleMatchCandidate[];
}

export interface EvaluationMetadata {
  evaluationId: string;
  evaluatedAt: string;
}

export type EvaluationOrigin = "LOCAL_RULE" | "AI_FALLBACK";
export type AiFallbackStatus = "PROPOSED" | "REJECTED" | "FAILED";
export type AiFallbackTrigger = "NO_MATCH" | "UNRESOLVABLE_AMBIGUITY";
export type AiConfidenceBand = "LOW" | "MEDIUM" | "HIGH";
export type AiFallbackClassification =
  | RuleCategory
  | "UNCLASSIFIED";

export interface AiFallbackTaxProposal {
  taxType: "IRPF" | "IVA";
  proposedPercentage: number | null;
  proposedDeductibleAmountCents: number | null;
  explanation: string;
}

/**
 * Metadatos opcionales para conservar compatibilidad con snapshots y
 * consumidores anteriores. Nunca incluyen prompt, salida cruda ni PII.
 */
export interface AiFallbackMetadata {
  status: AiFallbackStatus;
  trigger: AiFallbackTrigger;
  promptVersion: string;
  modelId: string;
  suppliedSourceIds: readonly string[];
  citedSourceIds: readonly string[];
  sourceVerificationStatus: "VERIFIED";
  validatorErrorCodes: readonly string[];
  durationMs: number;
  providerAttempts?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  confidenceBand: AiConfidenceBand | null;
  humanReviewRequired: true;
  proposalSummary?: string;
  classification?: AiFallbackClassification;
  missingLegalContext?: readonly string[];
  taxProposals?: readonly AiFallbackTaxProposal[];
}

export interface EvaluationResult extends EvaluationDecision {
  evaluationId: string;
  matchedRuleId: string | null;
  matchedRuleVersion: string | null;
  matchedBy: MatchMethod;
  matchScore: number;
  matchReason: string;
  officialSources: readonly OfficialSource[];
  evaluatedAt: string;
  /** Ausente solo en resultados legacy serializados antes del fallback. */
  evaluationOrigin?: EvaluationOrigin;
  /** Presente cuando el fallback se propuso, se rechazó o falló. */
  aiFallback?: AiFallbackMetadata;
}
