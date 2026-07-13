import {
  AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS,
  type AeatEnforcementMoneyFactKind,
  type AeatEnforcementMoneyFactsResult,
  type AeatEnforcementMoneyIssueCode,
} from "./aeat-enforcement-money-facts";
import type {
  FiscalNotificationAnchorId,
  FiscalNotificationExtractionReason,
  FiscalNotificationExtractionResult,
  FiscalNotificationFamilyCandidate,
} from "./extraction-contract";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";

export const FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_SCHEMA_VERSION =
  1 as const;
export const FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_VERSION =
  "1.0.0" as const;

export const FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS = Object.freeze({
  maxCandidates: 2,
  maxAnchorsPerCandidate: 15,
  maxFacts: 4,
  maxEvidencePerFact: 1,
  maxIssues: 8,
  maxPageNumbersPerItem: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
} as const);

export interface FiscalNotificationPdfWorkerAnchor {
  readonly anchorId: FiscalNotificationAnchorId;
  readonly pageNumbers: readonly number[];
}

export interface FiscalNotificationPdfWorkerCandidate {
  readonly familyId: FiscalNotificationFamilyCandidate["familyId"];
  readonly documentType: FiscalNotificationFamilyCandidate["documentType"];
  readonly authoritySignal: "AEAT_UNVERIFIED";
  readonly handlerId: FiscalNotificationFamilyCandidate["handlerId"];
  readonly handlerVersion: "1.0.0";
  readonly signalStatus: FiscalNotificationFamilyCandidate["signalStatus"];
  readonly matchedAnchors: readonly FiscalNotificationPdfWorkerAnchor[];
  readonly missingRequiredAnchorIds: readonly FiscalNotificationAnchorId[];
  readonly conflictingAnchorIds: readonly FiscalNotificationAnchorId[];
  readonly requiresHumanReview: true;
}

export interface FiscalNotificationPdfWorkerFamilyAnalysis {
  readonly schemaVersion: 1;
  readonly engineId: "fiscal-notification-family-candidate-engine";
  readonly engineVersion: "1.0.0";
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly reason: FiscalNotificationExtractionReason;
  readonly candidates: readonly FiscalNotificationPdfWorkerCandidate[];
  readonly selectedFamilyId: null;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly retainedSourceContent: "NONE";
}

export interface FiscalNotificationPdfWorkerAnalysis {
  readonly schemaVersion: 1;
  readonly analysisVersion: "1.0.0";
  readonly textLayerStatus: "TEXT_LAYER_AVAILABLE" | "NO_EXTRACTABLE_TEXT";
  readonly pageCount: number;
  readonly familyAnalysis: FiscalNotificationPdfWorkerFamilyAnalysis | null;
  readonly enforcementMoneyFacts: AeatEnforcementMoneyFactsResult | null;
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly retainedSourceContent: "NONE";
}

export interface ProjectFiscalNotificationPdfWorkerAnalysisInput {
  readonly textLayerStatus: "TEXT_LAYER_AVAILABLE" | "NO_EXTRACTABLE_TEXT";
  readonly pageCount: number;
  readonly familyAnalysis: FiscalNotificationExtractionResult | null;
  readonly enforcementMoneyFacts: AeatEnforcementMoneyFactsResult | null;
}

export class FiscalNotificationPdfWorkerAnalysisError extends Error {
  constructor() {
    super("FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_INVALID");
    this.name = "FiscalNotificationPdfWorkerAnalysisError";
  }
}

const ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "analysisVersion",
  "textLayerStatus",
  "pageCount",
  "familyAnalysis",
  "enforcementMoneyFacts",
  "sourceContentPolicy",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const FAMILY_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "status",
  "reason",
  "candidates",
  "selectedFamilyId",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const CANDIDATE_KEYS = new Set([
  "familyId",
  "documentType",
  "authoritySignal",
  "handlerId",
  "handlerVersion",
  "signalStatus",
  "matchedAnchors",
  "missingRequiredAnchorIds",
  "conflictingAnchorIds",
  "requiresHumanReview",
]);
const ANCHOR_KEYS = new Set(["anchorId", "pageNumbers"]);
const MONEY_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "facts",
  "issues",
  "selectedPaymentAmountKind",
  "semanticPolicy",
  "legalRuleStatus",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const FACT_KEYS = new Set([
  "kind",
  "amountCents",
  "currency",
  "evidence",
  "reviewStatus",
]);
const EVIDENCE_KEYS = new Set([
  "pageNumber",
  "label",
  "extractionMethod",
  "assertionType",
]);
const ISSUE_KEYS = new Set(["code", "kind", "pageNumbers"]);

const REASONS = new Set<FiscalNotificationExtractionReason>([
  "SUPPORTED_FAMILY_CANDIDATE",
  "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
  "AMBIGUOUS_SUPPORTED_FAMILIES",
  "CONFLICTING_AUTHORITY_OR_TERRITORY",
  "CONFLICTING_DOCUMENT_SIGNAL",
  "NO_SUPPORTED_FAMILY_SIGNAL",
  "NO_EXTRACTABLE_TEXT",
  "INCONSISTENT_PAGE_STATE",
  "UNSUPPORTED_TEXT_CONTROLS",
  "NORMALIZED_TEXT_LIMIT_EXCEEDED",
  "TEXT_LINE_LIMIT_EXCEEDED",
]);
const ANCHOR_IDS = new Set<FiscalNotificationAnchorId>([
  "AEAT_AUTHORITY_LABEL",
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "STRUCTURAL_FIRST_PAGE_HEADER",
  "ENFORCEMENT_ORDER_TITLE",
  "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
  "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  "DEFERRAL_GRANT_TITLE",
  "DEFERRAL_INSTALLMENT_ANNEX",
  "DEFERRAL_INTEREST_CALCULATION",
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);
const MONEY_KINDS = new Set<AeatEnforcementMoneyFactKind>([
  "OUTSTANDING_PRINCIPAL",
  "ORDINARY_ENFORCEMENT_SURCHARGE",
  "PAYMENT_ON_ACCOUNT",
  "DOCUMENT_TOTAL",
]);
const MONEY_ISSUE_CODES = new Set<AeatEnforcementMoneyIssueCode>([
  "FAMILY_GATE_NOT_SATISFIED",
  "NO_AMOUNT_SECTION",
  "NO_CLOSED_LABEL_MATCH",
  "LABEL_WITHOUT_AMOUNT",
  "INVALID_AMOUNT_FORMAT",
  "DUPLICATE_AMOUNT_SECTION",
  "DUPLICATE_MONEY_LABEL",
  "SECTION_SCAN_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const EVIDENCE_LABEL_BY_KIND = Object.freeze({
  OUTSTANDING_PRINCIPAL: "OUTSTANDING_PRINCIPAL_LABEL",
  ORDINARY_ENFORCEMENT_SURCHARGE:
    "ORDINARY_ENFORCEMENT_SURCHARGE_LABEL",
  PAYMENT_ON_ACCOUNT: "PAYMENT_ON_ACCOUNT_LABEL",
  DOCUMENT_TOTAL: "DOCUMENT_TOTAL_LABEL",
} as const);
const MONEY_KIND_ORDER = Object.freeze([
  "OUTSTANDING_PRINCIPAL",
  "ORDINARY_ENFORCEMENT_SURCHARGE",
  "PAYMENT_ON_ACCOUNT",
  "DOCUMENT_TOTAL",
] as const);
const ENFORCEMENT_REQUIRED_ANCHORS = Object.freeze([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "ENFORCEMENT_ORDER_TITLE",
  "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
  "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  "STRUCTURAL_FIRST_PAGE_HEADER",
] as const);
const DEFERRAL_REQUIRED_ANCHORS = Object.freeze([
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "DEFERRAL_GRANT_TITLE",
  "DEFERRAL_INSTALLMENT_ANNEX",
  "DEFERRAL_INTEREST_CALCULATION",
  "STRUCTURAL_FIRST_PAGE_HEADER",
] as const);
const CONFLICTING_ANCHORS = new Set<FiscalNotificationAnchorId>([
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);

export function projectFiscalNotificationPdfWorkerAnalysis(
  input: ProjectFiscalNotificationPdfWorkerAnalysisInput,
): FiscalNotificationPdfWorkerAnalysis {
  const familyAnalysis = input.familyAnalysis
    ? {
        schemaVersion: input.familyAnalysis.schemaVersion,
        engineId: input.familyAnalysis.engineId,
        engineVersion: input.familyAnalysis.engineVersion,
        status: input.familyAnalysis.status,
        reason: input.familyAnalysis.reason,
        candidates: input.familyAnalysis.candidates.map((candidate) => ({
          familyId: candidate.familyId,
          documentType: candidate.documentType,
          authoritySignal: candidate.authoritySignal,
          handlerId: candidate.handlerId,
          handlerVersion: candidate.handlerVersion,
          signalStatus: candidate.signalStatus,
          matchedAnchors: candidate.matchedAnchors.map((anchor) => ({
            anchorId: anchor.anchorId,
            pageNumbers: [...anchor.pageNumbers],
          })),
          missingRequiredAnchorIds: [...candidate.missingRequiredAnchorIds],
          conflictingAnchorIds: [...candidate.conflictingAnchorIds],
          requiresHumanReview: true,
        })),
        selectedFamilyId: null,
        requiresHumanReview: true,
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
        retainedSourceContent: "NONE",
      }
    : null;
  return parseFiscalNotificationPdfWorkerAnalysis({
    schemaVersion: FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_SCHEMA_VERSION,
    analysisVersion: FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_VERSION,
    textLayerStatus: input.textLayerStatus,
    pageCount: input.pageCount,
    familyAnalysis,
    enforcementMoneyFacts: input.enforcementMoneyFacts,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

export function parseFiscalNotificationPdfWorkerAnalysis(
  value: unknown,
): FiscalNotificationPdfWorkerAnalysis {
  try {
    const envelope = snapshotRecord(value);
    assertKnownKeys(envelope, ENVELOPE_KEYS);
    if (
      envelope.schemaVersion !== 1 ||
      envelope.analysisVersion !== "1.0.0" ||
      (envelope.textLayerStatus !== "TEXT_LAYER_AVAILABLE" &&
        envelope.textLayerStatus !== "NO_EXTRACTABLE_TEXT") ||
      !isBoundedPageCount(envelope.pageCount) ||
      envelope.sourceContentPolicy !==
        "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
      envelope.requiresHumanReview !== true ||
      envelope.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
      envelope.retainedSourceContent !== "NONE"
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const pageCount = envelope.pageCount as number;
    const familyAnalysis =
      envelope.familyAnalysis === null
        ? null
        : parseFamilyAnalysis(envelope.familyAnalysis, pageCount);

    if (envelope.textLayerStatus === "NO_EXTRACTABLE_TEXT") {
      if (familyAnalysis !== null || envelope.enforcementMoneyFacts !== null) {
        throw new FiscalNotificationPdfWorkerAnalysisError();
      }
    } else if (familyAnalysis === null) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const enforcementCandidate =
      familyAnalysis?.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
      familyAnalysis.candidates.length === 1 &&
      familyAnalysis.candidates[0]?.familyId ===
        "AEAT_ENFORCEMENT_ORDER_CANDIDATE";
    if (enforcementCandidate !== (envelope.enforcementMoneyFacts !== null)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const amountAnchorPageNumbers = enforcementCandidate
      ? familyAnalysis.candidates[0]?.matchedAnchors.find(
          (anchor) =>
            anchor.anchorId === "ENFORCEMENT_DEBT_AMOUNT_SECTION",
        )?.pageNumbers
      : null;
    if (enforcementCandidate && !amountAnchorPageNumbers) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const enforcementMoneyFacts =
      envelope.enforcementMoneyFacts === null
        ? null
        : parseMoneyFacts(
            envelope.enforcementMoneyFacts,
            pageCount,
            amountAnchorPageNumbers ?? Object.freeze([]),
          );
    if (
      enforcementMoneyFacts !== null &&
      enforcementMoneyFacts.documentType !== "AEAT_ENFORCEMENT_ORDER"
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }

    return Object.freeze({
      schemaVersion: 1 as const,
      analysisVersion: "1.0.0" as const,
      textLayerStatus: envelope.textLayerStatus,
      pageCount,
      familyAnalysis,
      enforcementMoneyFacts,
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
      requiresHumanReview: true as const,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
      retainedSourceContent: "NONE" as const,
    });
  } catch (error) {
    if (error instanceof FiscalNotificationPdfWorkerAnalysisError) throw error;
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
}

function parseFamilyAnalysis(
  value: unknown,
  pageCount: number,
): FiscalNotificationPdfWorkerFamilyAnalysis {
  const family = snapshotRecord(value);
  assertKnownKeys(family, FAMILY_KEYS);
  if (
    family.schemaVersion !== 1 ||
    family.engineId !== "fiscal-notification-family-candidate-engine" ||
    family.engineVersion !== "1.0.0" ||
    (family.status !== "REVIEW_REQUIRED" &&
      family.status !== "INFORMATION_PENDING") ||
    !REASONS.has(family.reason as FiscalNotificationExtractionReason) ||
    family.selectedFamilyId !== null ||
    family.requiresHumanReview !== true ||
    family.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    family.retainedSourceContent !== "NONE"
  ) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const candidateValues = snapshotArray(
    family.candidates,
    FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxCandidates,
  );
  const seenFamilies = new Set<string>();
  const candidates = candidateValues.map((candidateValue) => {
    const candidate = parseCandidate(candidateValue, pageCount);
    if (seenFamilies.has(candidate.familyId)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    seenFamilies.add(candidate.familyId);
    return candidate;
  });
  assertFamilySemantics(
    family.status as FiscalNotificationPdfWorkerFamilyAnalysis["status"],
    family.reason as FiscalNotificationExtractionReason,
    candidates,
  );
  return Object.freeze({
    schemaVersion: 1 as const,
    engineId: "fiscal-notification-family-candidate-engine" as const,
    engineVersion: "1.0.0" as const,
    status: family.status as FiscalNotificationPdfWorkerFamilyAnalysis["status"],
    reason: family.reason as FiscalNotificationExtractionReason,
    candidates: Object.freeze(candidates),
    selectedFamilyId: null,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function parseCandidate(
  value: unknown,
  pageCount: number,
): FiscalNotificationPdfWorkerCandidate {
  const candidate = snapshotRecord(value);
  assertKnownKeys(candidate, CANDIDATE_KEYS);
  const enforcement =
    candidate.familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE";
  const deferral = candidate.familyId === "AEAT_DEFERRAL_GRANT_CANDIDATE";
  if (
    (!enforcement && !deferral) ||
    candidate.documentType !==
      (enforcement
        ? "AEAT_ENFORCEMENT_ORDER"
        : "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT") ||
    candidate.authoritySignal !== "AEAT_UNVERIFIED" ||
    candidate.handlerId !==
      (enforcement
        ? "aeat-enforcement-order-candidate"
        : "aeat-deferral-grant-candidate") ||
    candidate.handlerVersion !== "1.0.0" ||
    (candidate.signalStatus !== "COMPLETE_REQUIRED_ANCHORS" &&
      candidate.signalStatus !== "INCOMPLETE_REQUIRED_ANCHORS" &&
      candidate.signalStatus !== "CONFLICTING_AUTHORITY_OR_TERRITORY" &&
      candidate.signalStatus !== "CONFLICTING_DOCUMENT_SIGNAL") ||
    candidate.requiresHumanReview !== true
  ) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const matchedValues = snapshotArray(
    candidate.matchedAnchors,
    FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxAnchorsPerCandidate,
  );
  const seenAnchors = new Set<string>();
  const matchedAnchors = matchedValues.map((anchorValue) => {
    const anchor = snapshotRecord(anchorValue);
    assertKnownKeys(anchor, ANCHOR_KEYS);
    const anchorId = parseAnchorId(anchor.anchorId);
    if (seenAnchors.has(anchorId)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    seenAnchors.add(anchorId);
    return Object.freeze({
      anchorId,
      pageNumbers: parsePageNumbers(anchor.pageNumbers, pageCount, false),
    });
  });
  const missingRequiredAnchorIds = parseAnchorIds(
    candidate.missingRequiredAnchorIds,
  );
  const conflictingAnchorIds = parseAnchorIds(candidate.conflictingAnchorIds);
  assertCandidateSemantics(
    candidate.signalStatus as FiscalNotificationPdfWorkerCandidate["signalStatus"],
    missingRequiredAnchorIds,
    conflictingAnchorIds,
  );
  assertCandidateTrace(
    candidate.familyId as FiscalNotificationPdfWorkerCandidate["familyId"],
    matchedAnchors,
    missingRequiredAnchorIds,
    conflictingAnchorIds,
  );
  return Object.freeze({
    familyId:
      candidate.familyId as FiscalNotificationPdfWorkerCandidate["familyId"],
    documentType:
      candidate.documentType as FiscalNotificationPdfWorkerCandidate["documentType"],
    authoritySignal: "AEAT_UNVERIFIED" as const,
    handlerId:
      candidate.handlerId as FiscalNotificationPdfWorkerCandidate["handlerId"],
    handlerVersion: "1.0.0" as const,
    signalStatus:
      candidate.signalStatus as FiscalNotificationPdfWorkerCandidate["signalStatus"],
    matchedAnchors: Object.freeze(matchedAnchors),
    missingRequiredAnchorIds,
    conflictingAnchorIds,
    requiresHumanReview: true as const,
  });
}

function parseMoneyFacts(
  value: unknown,
  pageCount: number,
  amountAnchorPageNumbers: readonly number[],
): AeatEnforcementMoneyFactsResult {
  const result = snapshotRecord(value);
  assertKnownKeys(result, MONEY_KEYS);
  if (
    result.schemaVersion !== 1 ||
    result.engineId !== "aeat-enforcement-money-facts" ||
    result.engineVersion !== "1.0.0" ||
    result.documentType !== "AEAT_ENFORCEMENT_ORDER" ||
    (result.status !== "REVIEW_REQUIRED" &&
      result.status !== "INFORMATION_PENDING") ||
    (result.outcome !== "FACTS_AVAILABLE" &&
      result.outcome !== "INFORMATION_PENDING" &&
      result.outcome !== "AMBIGUOUS" &&
      result.outcome !== "PROCESSING_BLOCKED") ||
    result.selectedPaymentAmountKind !== null ||
    result.semanticPolicy !== "EXPLICIT_DOCUMENT_FACTS_ONLY" ||
    result.legalRuleStatus !== "NOT_APPLIED" ||
    result.requiresHumanReview !== true ||
    result.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    result.retainedSourceContent !== "NONE"
  ) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const factValues = snapshotArray(
    result.facts,
    FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxFacts,
  );
  const seenKinds = new Set<string>();
  const amountAnchorPages = new Set(amountAnchorPageNumbers);
  let previousKindIndex = -1;
  const facts = factValues.map((factValue) => {
    const fact = snapshotRecord(factValue);
    assertKnownKeys(fact, FACT_KEYS);
    if (
      !MONEY_KINDS.has(fact.kind as AeatEnforcementMoneyFactKind) ||
      !Number.isSafeInteger(fact.amountCents) ||
      Number(fact.amountCents) < 0 ||
      Number(fact.amountCents) >
        AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxAmountCents ||
      (fact.currency !== "EUR" && fact.currency !== "UNKNOWN") ||
      fact.reviewStatus !== "REVIEW_REQUIRED"
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const kind = fact.kind as AeatEnforcementMoneyFactKind;
    if (seenKinds.has(kind)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const kindIndex = MONEY_KIND_ORDER.indexOf(kind);
    if (kindIndex <= previousKindIndex) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    previousKindIndex = kindIndex;
    seenKinds.add(kind);
    const evidenceValues = snapshotArray(
      fact.evidence,
      FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxEvidencePerFact,
    );
    if (evidenceValues.length !== 1) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const evidence = snapshotRecord(evidenceValues[0]);
    assertKnownKeys(evidence, EVIDENCE_KEYS);
    if (
      !Number.isSafeInteger(evidence.pageNumber) ||
      Number(evidence.pageNumber) < 1 ||
      Number(evidence.pageNumber) > pageCount ||
      !amountAnchorPages.has(Number(evidence.pageNumber)) ||
      evidence.label !== EVIDENCE_LABEL_BY_KIND[kind] ||
      evidence.extractionMethod !== "RULE" ||
      evidence.assertionType !== "EXPLICIT_IN_DOCUMENT"
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    return Object.freeze({
      kind,
      amountCents: fact.amountCents as number,
      currency: fact.currency as "EUR" | "UNKNOWN",
      evidence: Object.freeze([
        Object.freeze({
          pageNumber: evidence.pageNumber as number,
          label: EVIDENCE_LABEL_BY_KIND[kind],
          extractionMethod: "RULE" as const,
          assertionType: "EXPLICIT_IN_DOCUMENT" as const,
        }),
      ]),
      reviewStatus: "REVIEW_REQUIRED" as const,
    });
  });
  const issueValues = snapshotArray(
    result.issues,
    FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxIssues,
  );
  const seenIssues = new Set<string>();
  const issues = issueValues.map((issueValue) => {
    const item = snapshotRecord(issueValue);
    assertKnownKeys(item, ISSUE_KEYS);
    if (
      !MONEY_ISSUE_CODES.has(item.code as AeatEnforcementMoneyIssueCode) ||
      (item.kind !== null &&
        !MONEY_KINDS.has(item.kind as AeatEnforcementMoneyFactKind))
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const code = item.code as AeatEnforcementMoneyIssueCode;
    const kind = item.kind as AeatEnforcementMoneyFactKind | null;
    const kindRequired =
      code === "NO_CLOSED_LABEL_MATCH" ||
      code === "LABEL_WITHOUT_AMOUNT" ||
      code === "INVALID_AMOUNT_FORMAT" ||
      code === "DUPLICATE_MONEY_LABEL";
    const identity = `${code}:${kind ?? "NONE"}`;
    if (
      kindRequired === (kind === null) ||
      seenIssues.has(identity)
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    seenIssues.add(identity);
    const pageNumbers = parsePageNumbers(item.pageNumbers, pageCount, true);
    if (
      (code === "NO_AMOUNT_SECTION"
        ? pageNumbers.length !== 0
        : pageNumbers.length === 0) ||
      pageNumbers.some((pageNumber) => !amountAnchorPages.has(pageNumber))
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    return Object.freeze({
      code,
      kind,
      pageNumbers,
    });
  });
  assertMoneySemantics(
    result.status as AeatEnforcementMoneyFactsResult["status"],
    result.outcome as AeatEnforcementMoneyFactsResult["outcome"],
    facts,
    issues,
  );
  return Object.freeze({
    schemaVersion: 1 as const,
    engineId: "aeat-enforcement-money-facts" as const,
    engineVersion: "1.0.0" as const,
    documentType: "AEAT_ENFORCEMENT_ORDER" as const,
    status: result.status as AeatEnforcementMoneyFactsResult["status"],
    outcome: result.outcome as AeatEnforcementMoneyFactsResult["outcome"],
    facts: Object.freeze(facts),
    issues: Object.freeze(issues),
    selectedPaymentAmountKind: null,
    semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY",
    legalRuleStatus: "NOT_APPLIED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function assertFamilySemantics(
  status: FiscalNotificationPdfWorkerFamilyAnalysis["status"],
  reason: FiscalNotificationExtractionReason,
  candidates: readonly FiscalNotificationPdfWorkerCandidate[],
): void {
  const valid =
    (reason === "SUPPORTED_FAMILY_CANDIDATE" &&
      status === "REVIEW_REQUIRED" &&
      candidates.length === 1 &&
      candidates[0]?.signalStatus === "COMPLETE_REQUIRED_ANCHORS") ||
    (reason === "PARTIAL_SUPPORTED_FAMILY_SIGNAL" &&
      status === "INFORMATION_PENDING" &&
      candidates.length === 1 &&
      candidates[0]?.signalStatus === "INCOMPLETE_REQUIRED_ANCHORS") ||
    (reason === "AMBIGUOUS_SUPPORTED_FAMILIES" &&
      status === "REVIEW_REQUIRED" &&
      candidates.length === 2 &&
      candidates.every(
        (candidate) =>
          candidate.signalStatus === "COMPLETE_REQUIRED_ANCHORS" ||
          candidate.signalStatus === "INCOMPLETE_REQUIRED_ANCHORS",
      )) ||
    (reason === "CONFLICTING_AUTHORITY_OR_TERRITORY" &&
      status === "REVIEW_REQUIRED" &&
      candidates.length > 0 &&
      candidates.every(
        (candidate) =>
          candidate.signalStatus === "CONFLICTING_AUTHORITY_OR_TERRITORY",
      )) ||
    (reason === "CONFLICTING_DOCUMENT_SIGNAL" &&
      status === "REVIEW_REQUIRED" &&
      candidates.length > 0 &&
      candidates.every(
        (candidate) =>
          candidate.signalStatus === "CONFLICTING_DOCUMENT_SIGNAL",
      )) ||
    (reason === "NO_SUPPORTED_FAMILY_SIGNAL" &&
      status === "INFORMATION_PENDING" &&
      candidates.length === 0) ||
    ((reason === "INCONSISTENT_PAGE_STATE" ||
      reason === "UNSUPPORTED_TEXT_CONTROLS" ||
      reason === "NORMALIZED_TEXT_LIMIT_EXCEEDED" ||
      reason === "TEXT_LINE_LIMIT_EXCEEDED") &&
      status === "REVIEW_REQUIRED" &&
      candidates.length === 0);
  if (!valid) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
}

function assertCandidateSemantics(
  status: FiscalNotificationPdfWorkerCandidate["signalStatus"],
  missing: readonly FiscalNotificationAnchorId[],
  conflicting: readonly FiscalNotificationAnchorId[],
): void {
  const valid =
    (status === "COMPLETE_REQUIRED_ANCHORS" &&
      missing.length === 0 &&
      conflicting.length === 0) ||
    (status === "INCOMPLETE_REQUIRED_ANCHORS" &&
      missing.length > 0 &&
      conflicting.length === 0) ||
    (status === "CONFLICTING_AUTHORITY_OR_TERRITORY" &&
      conflicting.length > 0 &&
      !conflicting.includes("CONFLICTING_NON_DOCUMENT_GUIDE")) ||
    (status === "CONFLICTING_DOCUMENT_SIGNAL" &&
      conflicting.includes("CONFLICTING_NON_DOCUMENT_GUIDE"));
  if (!valid) throw new FiscalNotificationPdfWorkerAnalysisError();
}

function assertCandidateTrace(
  familyId: FiscalNotificationPdfWorkerCandidate["familyId"],
  matchedAnchors: readonly FiscalNotificationPdfWorkerAnchor[],
  missing: readonly FiscalNotificationAnchorId[],
  conflicting: readonly FiscalNotificationAnchorId[],
): void {
  const required =
    familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE"
      ? ENFORCEMENT_REQUIRED_ANCHORS
      : DEFERRAL_REQUIRED_ANCHORS;
  const matchedIds = new Set(matchedAnchors.map((anchor) => anchor.anchorId));
  const missingSet = new Set(missing);
  const conflictingSet = new Set(conflicting);
  const allowedMatched = new Set<FiscalNotificationAnchorId>([
    ...required,
    "AEAT_AUTHORITY_LABEL",
    ...CONFLICTING_ANCHORS,
  ]);
  if (
    matchedAnchors.some(
      (anchor) =>
        !allowedMatched.has(anchor.anchorId) ||
        (CONFLICTING_ANCHORS.has(anchor.anchorId) &&
          !conflictingSet.has(anchor.anchorId)),
    ) ||
    missing.some(
      (anchorId) =>
        !(required as readonly FiscalNotificationAnchorId[]).includes(anchorId) ||
        matchedIds.has(anchorId),
    ) ||
    conflicting.some(
      (anchorId) =>
        !CONFLICTING_ANCHORS.has(anchorId) || !matchedIds.has(anchorId),
    ) ||
    required.some(
      (anchorId) =>
        matchedIds.has(anchorId) === missingSet.has(anchorId),
    )
  ) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const structuralHeader = matchedAnchors.find(
    (anchor) => anchor.anchorId === "STRUCTURAL_FIRST_PAGE_HEADER",
  );
  const officialDomain = matchedAnchors.find(
    (anchor) => anchor.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL",
  );
  const familyTitle = matchedAnchors.find(
    (anchor) =>
      anchor.anchorId ===
      (familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE"
        ? "ENFORCEMENT_ORDER_TITLE"
        : "DEFERRAL_GRANT_TITLE"),
  );
  if (
    (officialDomain &&
      (officialDomain.pageNumbers.length !== 1 ||
        officialDomain.pageNumbers[0] !== 1)) ||
    (structuralHeader &&
      (structuralHeader.pageNumbers.length !== 1 ||
        structuralHeader.pageNumbers[0] !== 1 ||
        !officialDomain?.pageNumbers.includes(1) ||
        !familyTitle?.pageNumbers.includes(1)))
  ) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
}

function assertMoneySemantics(
  status: AeatEnforcementMoneyFactsResult["status"],
  outcome: AeatEnforcementMoneyFactsResult["outcome"],
  facts: readonly AeatEnforcementMoneyFactsResult["facts"][number][],
  issues: readonly AeatEnforcementMoneyFactsResult["issues"][number][],
): void {
  const factKinds = new Set(facts.map((fact) => fact.kind));
  const missingLabelKinds = new Set(
    issues.flatMap((item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" && item.kind !== null
        ? [item.kind]
        : [],
    ),
  );
  for (const item of issues) {
    if (
      (item.code === "NO_CLOSED_LABEL_MATCH" ||
        item.code === "LABEL_WITHOUT_AMOUNT") &&
      (item.kind === null || factKinds.has(item.kind))
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
  }
  const onlyPendingIssues = issues.every(
    (item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" ||
      item.code === "LABEL_WITHOUT_AMOUNT",
  );
  const everyAbsentKindIsPending = MONEY_KIND_ORDER.every(
    (kind) => factKinds.has(kind) || missingLabelKinds.has(kind),
  );
  const valid =
    (outcome === "FACTS_AVAILABLE" &&
      status === "REVIEW_REQUIRED" &&
      facts.length > 0 &&
      onlyPendingIssues &&
      everyAbsentKindIsPending) ||
    (outcome === "INFORMATION_PENDING" &&
      status === "INFORMATION_PENDING" &&
      facts.length === 0 &&
      ((issues.length === 1 &&
        issues[0]?.code === "NO_AMOUNT_SECTION" &&
        issues[0].kind === null) ||
        (onlyPendingIssues && everyAbsentKindIsPending))) ||
    (outcome === "AMBIGUOUS" &&
      status === "REVIEW_REQUIRED" &&
      facts.length === 0 &&
      issues.length === 1 &&
      (issues[0]?.code === "DUPLICATE_AMOUNT_SECTION" ||
        issues[0]?.code === "DUPLICATE_MONEY_LABEL")) ||
    (outcome === "PROCESSING_BLOCKED" &&
      status === "REVIEW_REQUIRED" &&
      facts.length === 0 &&
      issues.length === 1 &&
      (issues[0]?.code === "INVALID_AMOUNT_FORMAT" ||
        issues[0]?.code === "SECTION_SCAN_LIMIT_EXCEEDED"));
  if (!valid) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
}

function parseAnchorIds(value: unknown): readonly FiscalNotificationAnchorId[] {
  const values = snapshotArray(
    value,
    FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxAnchorsPerCandidate,
  );
  const seen = new Set<string>();
  const ids = values.map((item) => {
    const anchorId = parseAnchorId(item);
    if (seen.has(anchorId)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    seen.add(anchorId);
    return anchorId;
  });
  return Object.freeze(ids);
}

function parseAnchorId(value: unknown): FiscalNotificationAnchorId {
  if (!ANCHOR_IDS.has(value as FiscalNotificationAnchorId)) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  return value as FiscalNotificationAnchorId;
}

function parsePageNumbers(
  value: unknown,
  pageCount: number,
  allowEmpty: boolean,
): readonly number[] {
  const values = snapshotArray(
    value,
    FISCAL_NOTIFICATION_PDF_WORKER_ANALYSIS_LIMITS.maxPageNumbersPerItem,
  );
  if (!allowEmpty && values.length === 0) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  let previous = 0;
  const pageNumbers = values.map((item) => {
    if (
      !Number.isSafeInteger(item) ||
      Number(item) <= previous ||
      Number(item) < 1 ||
      Number(item) > pageCount
    ) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    previous = Number(item);
    return previous;
  });
  return Object.freeze(pageNumbers);
}

function isBoundedPageCount(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) > 0 &&
    Number(value) <= FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
  );
}

function snapshotArray(value: unknown, maxLength: number): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (!lengthDescriptor || !("value" in lengthDescriptor)) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const length = Number(lengthDescriptor.value);
  if (!Number.isSafeInteger(length) || length < 0 || length > maxLength) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
  }
  const result = new Array<unknown>(length);
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    result[index] = descriptor.value;
  }
  return Object.freeze(result);
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  if (Reflect.ownKeys(value).length !== allowed.size) {
    throw new FiscalNotificationPdfWorkerAnalysisError();
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new FiscalNotificationPdfWorkerAnalysisError();
    }
  }
}
