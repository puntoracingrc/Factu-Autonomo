import {
  AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS,
  type AeatEnforcementMoneyFactKind,
  type AeatEnforcementMoneyFactsResult,
  type AeatEnforcementMoneyIssueCode,
} from "./aeat-enforcement-money-facts";
import type {
  FiscalNotificationLocalReviewCandidate,
  FiscalNotificationLocalReviewReason,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import {
  resolveFiscalNotificationDocumentFamilyV2,
  type FiscalNotificationDocumentFamilyIdV2,
} from "./knowledge/document-families.v2";
import {
  resolveFiscalNotificationOfficialSourceV2,
  type FiscalNotificationOfficialSourceIdV2,
} from "./knowledge/official-sources.v2";
import {
  FISCAL_NOTIFICATION_V13_ONLY_ANCHOR_IDS,
  expectedMissingRecognitionAnchors,
  recognitionAnchorIdsForEngine,
  type FiscalNotificationExtractionEngineVersion,
} from "./recognition-policy.v1";

export const FISCAL_NOTIFICATION_REVIEW_GUIDANCE_SCHEMA_VERSION_V1 =
  1 as const;
export const FISCAL_NOTIFICATION_REVIEW_GUIDANCE_VERSION_V1 =
  "1.1.0" as const;

export type FiscalNotificationReviewStepIdV1 =
  | "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY"
  | "REVIEW_CANDIDATE_CLASSIFICATION"
  | "COMPARE_EPHEMERAL_PRINTED_AMOUNTS"
  | "VERIFY_DATES_AND_RESPONSE_CHANNELS_EXTERNALLY"
  | "CONSULT_OFFICIAL_PROCEDURE_CONTEXT"
  | "SEEK_HUMAN_FISCAL_REVIEW";

export type FiscalNotificationReviewStepStateV1 =
  | "MANUAL_REVIEW_REQUIRED"
  | "INFORMATION_PENDING"
  | "BLOCKED_BY_ANALYSIS";

export type FiscalNotificationReviewStepReasonV1 =
  | "MANUAL_IDENTITY_AND_AUTHORITY_CHECK"
  | "CANDIDATE_REVIEW_ONLY"
  | "CANDIDATE_INFORMATION_INCOMPLETE"
  | "CANDIDATE_AMBIGUOUS_OR_CONFLICTING"
  | "CANDIDATE_ANALYSIS_BLOCKED"
  | "PRINTED_FACTS_REVIEW_ONLY"
  | "PRINTED_FACTS_INFORMATION_PENDING"
  | "PRINTED_FACTS_AMBIGUOUS_OR_BLOCKED"
  | "NO_DATE_OR_RESPONSE_RULE_APPLIED"
  | "OFFICIAL_PROCEDURE_CONTEXT_ONLY"
  | "HUMAN_FISCAL_REVIEW_REQUIRED"
  | "INCONSISTENT_ANALYSIS_ENVELOPE";

export interface FiscalNotificationReviewStepV1 {
  readonly id: FiscalNotificationReviewStepIdV1;
  readonly state: FiscalNotificationReviewStepStateV1;
  readonly reason: FiscalNotificationReviewStepReasonV1;
}

type SupportedGuidanceFamilyId = Extract<
  FiscalNotificationDocumentFamilyIdV2,
  | "collection.enforcement_order"
  | "collection.deferral_grant"
  | "seizure.real_estate"
  | "compliance.formal_filing_requirement"
  | "registry.tax_registration_resolution"
>;

export interface FiscalNotificationReviewCandidateContextV1 {
  readonly familyId: SupportedGuidanceFamilyId;
  readonly classificationPolicy: "CANDIDATE_CONTEXT_ONLY";
}

export interface FiscalNotificationOfficialProcedureContextV1 {
  readonly sourceId: FiscalNotificationOfficialSourceIdV2;
  readonly title: string;
  readonly canonicalUrl: string;
  readonly authority: "AEAT";
  readonly usagePolicy: "PROCEDURE_CONTEXT_ONLY";
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly permitsLegalRuleActivation: false;
}

export interface FiscalNotificationReviewGuidanceInputV1 {
  readonly technicalReview: FiscalNotificationLocalReviewResult;
  readonly ephemeralEnforcementMoneyFacts:
    | AeatEnforcementMoneyFactsResult
    | null;
}

export interface FiscalNotificationReviewGuidanceV1 {
  readonly schemaVersion: 1;
  readonly guidanceVersion: "1.1.0";
  readonly projectionStatus: "GUIDANCE_AVAILABLE" | "GUIDANCE_BLOCKED";
  readonly candidateContext: FiscalNotificationReviewCandidateContextV1 | null;
  readonly officialProcedureContexts: readonly FiscalNotificationOfficialProcedureContextV1[];
  readonly steps: readonly FiscalNotificationReviewStepV1[];
  readonly completionTracking: "DISABLED";
  readonly userInputPolicy: "NONE";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

const INPUT_KEYS = new Set([
  "technicalReview",
  "ephemeralEnforcementMoneyFacts",
]);
const REVIEW_KEYS = new Set([
  "schemaVersion",
  "flowVersion",
  "status",
  "reason",
  "engineId",
  "engineVersion",
  "pageCount",
  "byteLength",
  "sha256",
  "candidates",
  "selectedFamilyId",
  "providerCalled",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const HISTORICAL_CANDIDATE_KEYS = new Set([
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
const TRACED_CANDIDATE_KEYS = new Set([
  ...HISTORICAL_CANDIDATE_KEYS,
  "segmentationVersion",
]);
const CURRENT_CANDIDATE_KEYS = new Set([
  ...TRACED_CANDIDATE_KEYS,
  "recognitionPolicyVersion",
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
const MONEY_FACT_KEYS = new Set([
  "kind",
  "amountCents",
  "currency",
  "evidence",
  "reviewStatus",
]);
const MONEY_EVIDENCE_KEYS = new Set([
  "pageNumber",
  "label",
  "extractionMethod",
  "assertionType",
]);
const MONEY_ISSUE_KEYS = new Set(["code", "kind", "pageNumbers"]);

const REVIEW_REASONS = new Set<FiscalNotificationLocalReviewReason>([
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
  "OCR_DISABLED",
]);
const BLOCKED_REASONS = new Set<FiscalNotificationLocalReviewReason>([
  "AMBIGUOUS_SUPPORTED_FAMILIES",
  "CONFLICTING_AUTHORITY_OR_TERRITORY",
  "CONFLICTING_DOCUMENT_SIGNAL",
  "INCONSISTENT_PAGE_STATE",
  "UNSUPPORTED_TEXT_CONTROLS",
  "NORMALIZED_TEXT_LIMIT_EXCEEDED",
  "TEXT_LINE_LIMIT_EXCEEDED",
]);
const ANALYSIS_BLOCKED_REASONS = new Set<FiscalNotificationLocalReviewReason>([
  "INCONSISTENT_PAGE_STATE",
  "UNSUPPORTED_TEXT_CONTROLS",
  "NORMALIZED_TEXT_LIMIT_EXCEEDED",
  "TEXT_LINE_LIMIT_EXCEEDED",
]);
const ANCHOR_IDS = new Set([
  "AEAT_AUTHORITY_LABEL",
  "AEAT_OFFICIAL_DOMAIN_LABEL",
  "STRUCTURAL_FIRST_PAGE_HEADER",
  "STRUCTURAL_PRIMARY_ACT_HEADER",
  "ENFORCEMENT_ORDER_TITLE",
  "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
  "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  "DEFERRAL_GRANT_TITLE",
  "DEFERRAL_INSTALLMENT_ANNEX",
  "DEFERRAL_INTEREST_CALCULATION",
  "REAL_ESTATE_SEIZURE_TITLE",
  "FORMAL_FILING_REQUIREMENT_TITLE",
  "FORMAL_FILING_OMITTED_RETURNS_MARKER",
  "ROI_REGISTRATION_AGREEMENT_TITLE",
  "DOCUMENT_IDENTIFICATION_SECTION",
  "FORMAL_FILING_TAX_PERIOD_SECTION",
  "REGISTRY_IDENTIFICATION_SECTION",
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_AEAT_HOST_LINE",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);
const SIGNAL_STATES = new Set([
  "COMPLETE_REQUIRED_ANCHORS",
  "INCOMPLETE_REQUIRED_ANCHORS",
  "CONFLICTING_AUTHORITY_OR_TERRITORY",
  "CONFLICTING_DOCUMENT_SIGNAL",
]);
const CONFLICTING_ANCHOR_IDS = new Set([
  "CONFLICTING_AUTHORITY_TGSS",
  "CONFLICTING_TERRITORY_CANARY",
  "CONFLICTING_TERRITORY_FORAL",
  "CONFLICTING_TERRITORY_REGIONAL",
  "CONFLICTING_TERRITORY_CEUTA_MELILLA",
  "CONFLICTING_AEAT_HOST_LINE",
  "CONFLICTING_NON_DOCUMENT_GUIDE",
]);
const MONEY_KIND_ORDER = Object.freeze([
  "OUTSTANDING_PRINCIPAL",
  "ORDINARY_ENFORCEMENT_SURCHARGE",
  "PAYMENT_ON_ACCOUNT",
  "DOCUMENT_TOTAL",
] as const);
const MONEY_KINDS = new Set<AeatEnforcementMoneyFactKind>(MONEY_KIND_ORDER);
const MONEY_ISSUE_CODES = new Set<AeatEnforcementMoneyIssueCode>([
  "FAMILY_GATE_NOT_SATISFIED",
  "NO_AMOUNT_SECTION",
  "NO_CLOSED_LABEL_MATCH",
  "LABEL_WITHOUT_AMOUNT",
  "INVALID_AMOUNT_FORMAT",
  "DUPLICATE_AMOUNT_SECTION",
  "DUPLICATE_MONEY_LABEL",
  "UNSUPPORTED_SECTION_PREAMBLE",
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
const SHA256 = /^[a-f0-9]{64}$/u;

const FAMILY_CONTEXT = Object.freeze({
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: Object.freeze({
    familyId: "collection.enforcement_order" as const,
    documentType: "AEAT_ENFORCEMENT_ORDER" as const,
    handlerId: "aeat-enforcement-order-candidate" as const,
    titleAnchorId: "ENFORCEMENT_ORDER_TITLE" as const,
    optionalAnchorIds: Object.freeze([] as const),
    minimumEngineVersion: "1.0.0" as const,
    sourceIds: Object.freeze(["aeat.collection.enforcement"] as const),
  }),
  AEAT_DEFERRAL_GRANT_CANDIDATE: Object.freeze({
    familyId: "collection.deferral_grant" as const,
    documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT" as const,
    handlerId: "aeat-deferral-grant-candidate" as const,
    titleAnchorId: "DEFERRAL_GRANT_TITLE" as const,
    optionalAnchorIds: Object.freeze([] as const),
    minimumEngineVersion: "1.0.0" as const,
    sourceIds: Object.freeze(["aeat.collection.deferral"] as const),
  }),
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE: Object.freeze({
    familyId: "seizure.real_estate" as const,
    documentType: "AEAT_SEIZURE_ORDER" as const,
    handlerId: "aeat-real-estate-seizure-candidate" as const,
    titleAnchorId: "REAL_ESTATE_SEIZURE_TITLE" as const,
    optionalAnchorIds: Object.freeze(["DOCUMENT_IDENTIFICATION_SECTION"] as const),
    minimumEngineVersion: "1.2.0" as const,
    sourceIds: Object.freeze(["aeat.collection.seizure_types"] as const),
  }),
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE: Object.freeze({
    familyId: "compliance.formal_filing_requirement" as const,
    documentType: "GENERIC_ADMINISTRATIVE_NOTICE" as const,
    handlerId: "aeat-formal-filing-requirement-candidate" as const,
    titleAnchorId: "FORMAL_FILING_REQUIREMENT_TITLE" as const,
    optionalAnchorIds: Object.freeze([
      "DOCUMENT_IDENTIFICATION_SECTION",
      "FORMAL_FILING_TAX_PERIOD_SECTION",
    ] as const),
    minimumEngineVersion: "1.2.0" as const,
    sourceIds: Object.freeze(["aeat.compliance.omitted_return"] as const),
  }),
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE: Object.freeze({
    familyId: "registry.tax_registration_resolution" as const,
    documentType: "GENERIC_ADMINISTRATIVE_NOTICE" as const,
    handlerId: "aeat-roi-registration-agreement-candidate" as const,
    titleAnchorId: "ROI_REGISTRATION_AGREEMENT_TITLE" as const,
    optionalAnchorIds: Object.freeze([
      "DOCUMENT_IDENTIFICATION_SECTION",
      "REGISTRY_IDENTIFICATION_SECTION",
    ] as const),
    minimumEngineVersion: "1.2.0" as const,
    sourceIds: Object.freeze([] as const),
  }),
});

export function projectFiscalNotificationReviewGuidanceV1(
  input: unknown,
): FiscalNotificationReviewGuidanceV1 {
  try {
    return projectValidatedGuidance(input);
  } catch {
    return blockedGuidance();
  }
}

function projectValidatedGuidance(
  input: unknown,
): FiscalNotificationReviewGuidanceV1 {
  const validated = validateInput(input);
  if (!validated) return blockedGuidance();

  const { technicalReview, ephemeralEnforcementMoneyFacts } = validated;
  const completeCandidate = completeSingleCandidate(technicalReview);
  const completeEnforcementCandidate =
    completeCandidate?.familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE";
  if (
    completeEnforcementCandidate !==
    (ephemeralEnforcementMoneyFacts !== null)
  ) {
    return blockedGuidance();
  }

  const resolvedContext = completeCandidate
    ? resolveCandidateContext(completeCandidate)
    : null;
  if (completeCandidate && !resolvedContext) return blockedGuidance();

  const steps: FiscalNotificationReviewStepV1[] = [
    step(
      "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY",
      "MANUAL_REVIEW_REQUIRED",
      "MANUAL_IDENTITY_AND_AUTHORITY_CHECK",
    ),
    candidateStep(technicalReview.reason),
  ];

  if (ephemeralEnforcementMoneyFacts) {
    steps.push(moneyStep(ephemeralEnforcementMoneyFacts.outcome));
  }
  steps.push(
    step(
      "VERIFY_DATES_AND_RESPONSE_CHANNELS_EXTERNALLY",
      "MANUAL_REVIEW_REQUIRED",
      "NO_DATE_OR_RESPONSE_RULE_APPLIED",
    ),
  );
  if (resolvedContext && resolvedContext.sources.length > 0) {
    steps.push(
      step(
        "CONSULT_OFFICIAL_PROCEDURE_CONTEXT",
        "MANUAL_REVIEW_REQUIRED",
        "OFFICIAL_PROCEDURE_CONTEXT_ONLY",
      ),
    );
  }
  steps.push(
    step(
      "SEEK_HUMAN_FISCAL_REVIEW",
      "MANUAL_REVIEW_REQUIRED",
      "HUMAN_FISCAL_REVIEW_REQUIRED",
    ),
  );

  return freezeGuidance({
    projectionStatus: "GUIDANCE_AVAILABLE",
    candidateContext: resolvedContext?.candidateContext ?? null,
    officialProcedureContexts: resolvedContext?.sources ?? [],
    steps,
  });
}

function validateInput(
  input: unknown,
): FiscalNotificationReviewGuidanceInputV1 | null {
  const envelope = snapshotRecord(input, INPUT_KEYS);
  if (!envelope) return null;
  const technicalReview = validateTechnicalReview(envelope.technicalReview);
  if (!technicalReview) return null;
  const completeCandidate = completeSingleCandidate(technicalReview);
  const enforcementAmountAnchorPages =
    completeCandidate?.familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE"
      ? (completeCandidate.matchedAnchors.find(
          (anchor) =>
            anchor.anchorId === "ENFORCEMENT_DEBT_AMOUNT_SECTION",
        )?.pageNumbers ?? null)
      : null;
  const money =
    envelope.ephemeralEnforcementMoneyFacts === null
      ? null
      : validateMoneyEnvelope(
          envelope.ephemeralEnforcementMoneyFacts,
          technicalReview.pageCount,
          enforcementAmountAnchorPages ?? [],
        );
  if (envelope.ephemeralEnforcementMoneyFacts !== null && !money) return null;
  if (
    (enforcementAmountAnchorPages !== null) !==
    (money !== null)
  ) {
    return null;
  }
  return Object.freeze({
    technicalReview,
    ephemeralEnforcementMoneyFacts: money,
  });
}

function validateTechnicalReview(
  value: unknown,
): FiscalNotificationLocalReviewResult | null {
  const review = snapshotRecord(value, REVIEW_KEYS);
  if (!review) return null;
  const candidates = snapshotArray(review.candidates, 5);
  if (!candidates) return null;
  const validatedCandidates: FiscalNotificationLocalReviewCandidate[] = [];
  for (const candidate of candidates) {
    const validated = validateCandidate(
      candidate,
      review.pageCount,
      review.engineVersion,
    );
    if (!validated) return null;
    validatedCandidates.push(validated);
  }
  if (
    new Set(validatedCandidates.map((candidate) => candidate.familyId)).size !==
    validatedCandidates.length
  ) {
    return null;
  }
  if (
    review.schemaVersion !== 1 ||
    review.flowVersion !== "1.0.0" ||
    (review.status !== "REVIEW_REQUIRED" &&
      review.status !== "INFORMATION_PENDING") ||
    !REVIEW_REASONS.has(review.reason as FiscalNotificationLocalReviewReason) ||
    !Number.isSafeInteger(review.pageCount) ||
    (review.pageCount as number) < 1 ||
    (review.pageCount as number) > 80 ||
    !Number.isSafeInteger(review.byteLength) ||
    (review.byteLength as number) < 1 ||
    (review.byteLength as number) > 4 * 1024 * 1024 ||
    typeof review.sha256 !== "string" ||
    !SHA256.test(review.sha256) ||
    review.selectedFamilyId !== null ||
    review.providerCalled !== false ||
    review.requiresHumanReview !== true ||
    review.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    review.retainedSourceContent !== "NONE" ||
    !validEngineForReason(
      review.reason as FiscalNotificationLocalReviewReason,
      review.engineId,
      review.engineVersion,
    ) ||
    !validReviewSemantics(
      review.status as FiscalNotificationLocalReviewResult["status"],
      review.reason as FiscalNotificationLocalReviewReason,
      validatedCandidates,
    )
  ) {
    return null;
  }
  return Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: review.status as FiscalNotificationLocalReviewResult["status"],
    reason: review.reason as FiscalNotificationLocalReviewReason,
    engineId: review.engineId as FiscalNotificationLocalReviewResult["engineId"],
    engineVersion:
      review.engineVersion as FiscalNotificationLocalReviewResult["engineVersion"],
    pageCount: review.pageCount as number,
    byteLength: review.byteLength as number,
    sha256: review.sha256,
    candidates: Object.freeze(validatedCandidates),
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function validateCandidate(
  value: unknown,
  pageCountValue: unknown,
  engineVersionValue: unknown,
): FiscalNotificationLocalReviewCandidate | null {
  if (!Number.isSafeInteger(pageCountValue)) return null;
  const currentCandidate = snapshotRecord(value, CURRENT_CANDIDATE_KEYS);
  const tracedCandidate = currentCandidate
    ? null
    : snapshotRecord(value, TRACED_CANDIDATE_KEYS);
  const candidate =
    currentCandidate ??
    tracedCandidate ??
    snapshotRecord(value, HISTORICAL_CANDIDATE_KEYS);
  if (!candidate) return null;
  const hasRecognitionPolicyVersion = currentCandidate !== null;
  const hasSegmentationVersion =
    currentCandidate !== null || tracedCandidate !== null;
  const definition =
    typeof candidate.familyId === "string"
      ? FAMILY_CONTEXT[
          candidate.familyId as FiscalNotificationLocalReviewCandidate["familyId"]
        ]
      : undefined;
  const engineVersion =
    engineVersionValue === "1.0.0" ||
    engineVersionValue === "1.1.0" ||
    engineVersionValue === "1.2.0" ||
    engineVersionValue === "1.3.0"
      ? (engineVersionValue as FiscalNotificationExtractionEngineVersion)
      : null;
  if (
    !definition ||
    !engineVersion ||
    (engineVersionValue === "1.3.0"
      ? candidate.segmentationVersion !== "1.1.0" ||
        candidate.recognitionPolicyVersion !== "1.3.0"
      : engineVersionValue === "1.2.0"
      ? candidate.segmentationVersion !== "1.1.0" ||
        hasRecognitionPolicyVersion
      : engineVersionValue === "1.1.0"
        ? hasRecognitionPolicyVersion ||
          (hasSegmentationVersion && candidate.segmentationVersion !== "1.0.0")
        : hasSegmentationVersion || hasRecognitionPolicyVersion) ||
    (definition.minimumEngineVersion === "1.2.0" &&
      engineVersionValue !== "1.2.0" &&
      engineVersionValue !== "1.3.0")
  ) {
    return null;
  }
  const matched = snapshotArray(candidate.matchedAnchors, 15);
  const missing = snapshotArray(candidate.missingRequiredAnchorIds, 15);
  const conflicting = snapshotArray(candidate.conflictingAnchorIds, 15);
  if (!matched || !missing || !conflicting) return null;
  const familyId =
    candidate.familyId as FiscalNotificationLocalReviewCandidate["familyId"];
  const recognitionAnchors = recognitionAnchorIdsForEngine(
    familyId,
    engineVersion,
  );
  const allowedMatchedAnchors = new Set<string>([
    ...recognitionAnchors,
    ...definition.optionalAnchorIds,
    "AEAT_AUTHORITY_LABEL",
    ...CONFLICTING_ANCHOR_IDS,
  ]);
  const validatedAnchors = [];
  const matchedAnchorIds = new Set<string>();
  for (const value of matched) {
    const anchor = snapshotRecord(value, ANCHOR_KEYS);
    const pages = anchor ? snapshotArray(anchor.pageNumbers, 80) : null;
    if (
      !anchor ||
      !ANCHOR_IDS.has(anchor.anchorId as string) ||
      !allowedMatchedAnchors.has(anchor.anchorId as string) ||
      !pages ||
      pages.length === 0 ||
      matchedAnchorIds.has(anchor.anchorId as string) ||
      !pages.every(
        (page) =>
          Number.isSafeInteger(page) &&
          (page as number) >= 1 &&
          (page as number) <= (pageCountValue as number),
      ) ||
      !isStrictlyIncreasingNumbers(pages as number[])
    ) {
      return null;
    }
    matchedAnchorIds.add(anchor.anchorId as string);
    validatedAnchors.push(
      Object.freeze({
        anchorId: anchor.anchorId as FiscalNotificationLocalReviewCandidate["matchedAnchors"][number]["anchorId"],
        pageNumbers: Object.freeze(pages as number[]),
      }),
    );
  }
  const missingIds = missing as string[];
  const conflictingIds = conflicting as string[];
  const pagesByAnchor = new Map(
    validatedAnchors.map((anchor) => [anchor.anchorId, anchor.pageNumbers]),
  );
  const titleAnchor = definition.titleAnchorId;
  const domainPages = pagesByAnchor.get("AEAT_OFFICIAL_DOMAIN_LABEL");
  const structuralPages = pagesByAnchor.get("STRUCTURAL_FIRST_PAGE_HEADER");
  const primaryActPages = pagesByAnchor.get("STRUCTURAL_PRIMARY_ACT_HEADER");
  const conflictingHostPages = pagesByAnchor.get("CONFLICTING_AEAT_HOST_LINE");
  const titlePages = pagesByAnchor.get(titleAnchor);
  const titlePageNumber = titlePages?.[0];
  if (
    !matchedAnchorIds.has(titleAnchor) ||
    !titlePages ||
    (domainPages !== undefined &&
      (engineVersionValue === "1.0.0"
        ? !sameNumberList(domainPages, [1])
        : engineVersionValue === "1.1.0" ||
            engineVersionValue === "1.2.0" ||
            engineVersionValue === "1.3.0"
          ? titlePages.length !== 1 || !sameNumberList(domainPages, titlePages)
          : true)) ||
    (structuralPages !== undefined &&
      (!sameNumberList(structuralPages, [1]) ||
        !domainPages?.includes(1) ||
        !titlePages.includes(1))) ||
    (primaryActPages !== undefined &&
      (!sameNumberList(primaryActPages, [1]) || !titlePages.includes(1))) ||
    (conflictingHostPages !== undefined &&
      !sameNumberList(conflictingHostPages, titlePages)) ||
    (engineVersionValue !== "1.3.0" &&
      validatedAnchors.some((anchor) =>
        FISCAL_NOTIFICATION_V13_ONLY_ANCHOR_IDS.includes(
          anchor.anchorId as (typeof FISCAL_NOTIFICATION_V13_ONLY_ANCHOR_IDS)[number],
        ),
      )) ||
    ((engineVersionValue === "1.1.0" ||
      engineVersionValue === "1.2.0" ||
      engineVersionValue === "1.3.0") &&
      (titlePages.length !== 1 ||
        titlePageNumber === undefined ||
        (domainPages !== undefined &&
          !sameNumberList(domainPages, [titlePageNumber])) ||
        (titlePageNumber > 1 &&
          (candidate.signalStatus !== "INCOMPLETE_REQUIRED_ANCHORS" ||
            structuralPages !== undefined ||
            primaryActPages !== undefined)) ||
        (candidate.signalStatus === "COMPLETE_REQUIRED_ANCHORS" &&
          titlePageNumber !== 1)))
  ) {
    return null;
  }
  const expectedMissing = expectedMissingRecognitionAnchors(
    familyId,
    engineVersion,
    matchedAnchorIds as ReadonlySet<
      FiscalNotificationLocalReviewCandidate["matchedAnchors"][number]["anchorId"]
    >,
  );
  const expectedConflicting = validatedAnchors
    .map((anchor) => anchor.anchorId)
    .filter((id) => CONFLICTING_ANCHOR_IDS.has(id));
  const expectedSignal = expectedConflicting.includes(
    "CONFLICTING_NON_DOCUMENT_GUIDE",
  )
    ? "CONFLICTING_DOCUMENT_SIGNAL"
    : expectedConflicting.length > 0
      ? "CONFLICTING_AUTHORITY_OR_TERRITORY"
      : expectedMissing.length === 0
        ? "COMPLETE_REQUIRED_ANCHORS"
        : "INCOMPLETE_REQUIRED_ANCHORS";
  if (
    candidate.documentType !== definition.documentType ||
    candidate.authoritySignal !== "AEAT_UNVERIFIED" ||
    candidate.handlerId !== definition.handlerId ||
    candidate.handlerVersion !== "1.0.0" ||
    !SIGNAL_STATES.has(candidate.signalStatus as string) ||
    candidate.signalStatus !== expectedSignal ||
    candidate.requiresHumanReview !== true ||
    !missingIds.every((id) => ANCHOR_IDS.has(id)) ||
    !conflictingIds.every((id) => ANCHOR_IDS.has(id)) ||
    !conflictingIds.every((id) => CONFLICTING_ANCHOR_IDS.has(id)) ||
    new Set(missingIds).size !== missingIds.length ||
    new Set(conflictingIds).size !== conflictingIds.length ||
    !sameStringSet(missingIds, expectedMissing) ||
    !sameStringSet(conflictingIds, expectedConflicting) ||
    missingIds.some((id) => matchedAnchorIds.has(id)) ||
    conflictingIds.some((id) => !matchedAnchorIds.has(id))
  ) {
    return null;
  }
  return Object.freeze({
    familyId:
      candidate.familyId as FiscalNotificationLocalReviewCandidate["familyId"],
    ...(hasRecognitionPolicyVersion
      ? { recognitionPolicyVersion: "1.3.0" as const }
      : {}),
    ...(hasSegmentationVersion
      ? {
          segmentationVersion:
            candidate.segmentationVersion as "1.0.0" | "1.1.0",
        }
      : {}),
    documentType: definition.documentType,
    authoritySignal: "AEAT_UNVERIFIED",
    handlerId: definition.handlerId,
    handlerVersion: "1.0.0",
    signalStatus:
      candidate.signalStatus as FiscalNotificationLocalReviewCandidate["signalStatus"],
    matchedAnchors: Object.freeze(validatedAnchors),
    missingRequiredAnchorIds: Object.freeze(
      missing as FiscalNotificationLocalReviewCandidate["missingRequiredAnchorIds"][number][],
    ),
    conflictingAnchorIds: Object.freeze(
      conflicting as FiscalNotificationLocalReviewCandidate["conflictingAnchorIds"][number][],
    ),
    requiresHumanReview: true,
  });
}

function validateMoneyEnvelope(
  value: unknown,
  pageCount: number,
  amountAnchorPageNumbers: readonly number[],
): AeatEnforcementMoneyFactsResult | null {
  const money = snapshotRecord(value, MONEY_KEYS);
  if (!money) return null;
  const facts = snapshotArray(money.facts, 4);
  const issues = snapshotArray(money.issues, 8);
  if (!facts || !issues) return null;
  let previousFactOrder = -1;
  const seenFactKinds = new Set<AeatEnforcementMoneyFactKind>();
  const amountAnchorPages = new Set(amountAnchorPageNumbers);
  for (const value of facts) {
    const fact = snapshotRecord(value, MONEY_FACT_KEYS);
    if (
      !fact ||
      !MONEY_KINDS.has(fact.kind as AeatEnforcementMoneyFactKind) ||
      seenFactKinds.has(fact.kind as AeatEnforcementMoneyFactKind) ||
      !Number.isSafeInteger(fact.amountCents) ||
      (fact.amountCents as number) < 0 ||
      (fact.amountCents as number) >
        AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxAmountCents ||
      (fact.currency !== "EUR" && fact.currency !== "UNKNOWN") ||
      fact.reviewStatus !== "REVIEW_REQUIRED"
    ) {
      return null;
    }
    const kind = fact.kind as AeatEnforcementMoneyFactKind;
    const factOrder = MONEY_KIND_ORDER.indexOf(kind);
    if (factOrder <= previousFactOrder) return null;
    previousFactOrder = factOrder;
    seenFactKinds.add(kind);
    const evidenceItems = snapshotArray(fact.evidence, 1);
    const evidence = evidenceItems?.[0]
      ? snapshotRecord(evidenceItems[0], MONEY_EVIDENCE_KEYS)
      : null;
    if (
      evidenceItems?.length !== 1 ||
      !evidence ||
      !Number.isSafeInteger(evidence.pageNumber) ||
      (evidence.pageNumber as number) < 1 ||
      (evidence.pageNumber as number) > pageCount ||
      !amountAnchorPages.has(evidence.pageNumber as number) ||
      evidence.label !== EVIDENCE_LABEL_BY_KIND[kind] ||
      evidence.extractionMethod !== "RULE" ||
      evidence.assertionType !== "EXPLICIT_IN_DOCUMENT"
    ) {
      return null;
    }
  }
  const seenIssues = new Set<string>();
  const validatedIssues: Array<{
    readonly code: AeatEnforcementMoneyIssueCode;
    readonly kind: AeatEnforcementMoneyFactKind | null;
  }> = [];
  for (const value of issues) {
    const issue = snapshotRecord(value, MONEY_ISSUE_KEYS);
    const pageNumbers = issue ? snapshotArray(issue.pageNumbers, 80) : null;
    if (
      !issue ||
      !MONEY_ISSUE_CODES.has(issue.code as AeatEnforcementMoneyIssueCode) ||
      (issue.kind !== null &&
        !MONEY_KINDS.has(issue.kind as AeatEnforcementMoneyFactKind)) ||
      !pageNumbers ||
      !pageNumbers.every(
        (page) =>
          Number.isSafeInteger(page) &&
          (page as number) >= 1 &&
          (page as number) <= pageCount,
      ) ||
      !isStrictlyIncreasingNumbers(pageNumbers as number[])
    ) {
      return null;
    }
    const code = issue.code as AeatEnforcementMoneyIssueCode;
    const kind = issue.kind as AeatEnforcementMoneyFactKind | null;
    const kindRequired =
      code === "NO_CLOSED_LABEL_MATCH" ||
      code === "LABEL_WITHOUT_AMOUNT" ||
      code === "INVALID_AMOUNT_FORMAT" ||
      code === "DUPLICATE_MONEY_LABEL";
    const identity = `${code}:${kind ?? "NONE"}`;
    if (
      kindRequired === (kind === null) ||
      seenIssues.has(identity) ||
      (code === "UNSUPPORTED_SECTION_PREAMBLE" &&
        money.engineVersion !== "1.1.0") ||
      (code === "NO_AMOUNT_SECTION"
        ? pageNumbers.length !== 0
        : pageNumbers.length === 0) ||
      pageNumbers.some(
        (pageNumber) => !amountAnchorPages.has(pageNumber as number),
      )
    ) {
      return null;
    }
    seenIssues.add(identity);
    validatedIssues.push({ code, kind });
  }
  const validOutcome =
    money.outcome === "FACTS_AVAILABLE" ||
    money.outcome === "INFORMATION_PENDING" ||
    money.outcome === "AMBIGUOUS" ||
    money.outcome === "PROCESSING_BLOCKED";
  if (
    money.schemaVersion !== 1 ||
    money.engineId !== "aeat-enforcement-money-facts" ||
    (money.engineVersion !== "1.0.0" &&
      money.engineVersion !== "1.1.0") ||
    money.documentType !== "AEAT_ENFORCEMENT_ORDER" ||
    !validOutcome ||
    money.selectedPaymentAmountKind !== null ||
    money.semanticPolicy !== "EXPLICIT_DOCUMENT_FACTS_ONLY" ||
    money.legalRuleStatus !== "NOT_APPLIED" ||
    money.requiresHumanReview !== true ||
    money.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    money.retainedSourceContent !== "NONE" ||
    (money.outcome === "FACTS_AVAILABLE"
      ? money.status !== "REVIEW_REQUIRED" || facts.length === 0
      : facts.length !== 0) ||
    (money.outcome === "INFORMATION_PENDING"
      ? money.status !== "INFORMATION_PENDING"
      : money.outcome !== "FACTS_AVAILABLE" && money.status !== "REVIEW_REQUIRED")
  ) {
    return null;
  }
  if (
    !validMoneySemantics(
      money.status as AeatEnforcementMoneyFactsResult["status"],
      money.outcome as AeatEnforcementMoneyFactsResult["outcome"],
      seenFactKinds,
      validatedIssues,
    )
  ) {
    return null;
  }
  return money as unknown as AeatEnforcementMoneyFactsResult;
}

function validMoneySemantics(
  status: AeatEnforcementMoneyFactsResult["status"],
  outcome: AeatEnforcementMoneyFactsResult["outcome"],
  factKinds: ReadonlySet<AeatEnforcementMoneyFactKind>,
  issues: readonly {
    readonly code: AeatEnforcementMoneyIssueCode;
    readonly kind: AeatEnforcementMoneyFactKind | null;
  }[],
): boolean {
  const missingLabelKinds = new Set(
    issues.flatMap((item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" && item.kind !== null
        ? [item.kind]
        : [],
    ),
  );
  if (
    issues.some(
      (item) =>
        (item.code === "NO_CLOSED_LABEL_MATCH" ||
          item.code === "LABEL_WITHOUT_AMOUNT") &&
        (item.kind === null || factKinds.has(item.kind)),
    )
  ) {
    return false;
  }
  const onlyPendingIssues = issues.every(
    (item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" ||
      item.code === "LABEL_WITHOUT_AMOUNT",
  );
  const everyAbsentKindIsPending = MONEY_KIND_ORDER.every(
    (kind) => factKinds.has(kind) || missingLabelKinds.has(kind),
  );
  return (
    (outcome === "FACTS_AVAILABLE" &&
      status === "REVIEW_REQUIRED" &&
      factKinds.size > 0 &&
      onlyPendingIssues &&
      everyAbsentKindIsPending) ||
    (outcome === "INFORMATION_PENDING" &&
      status === "INFORMATION_PENDING" &&
      factKinds.size === 0 &&
      ((issues.length === 1 &&
        issues[0]?.code === "NO_AMOUNT_SECTION" &&
        issues[0].kind === null) ||
        (onlyPendingIssues && everyAbsentKindIsPending))) ||
    (outcome === "AMBIGUOUS" &&
      status === "REVIEW_REQUIRED" &&
      factKinds.size === 0 &&
      issues.length === 1 &&
      (issues[0]?.code === "DUPLICATE_AMOUNT_SECTION" ||
        issues[0]?.code === "DUPLICATE_MONEY_LABEL")) ||
    (outcome === "PROCESSING_BLOCKED" &&
      status === "REVIEW_REQUIRED" &&
      factKinds.size === 0 &&
      issues.length === 1 &&
      (issues[0]?.code === "INVALID_AMOUNT_FORMAT" ||
        issues[0]?.code === "UNSUPPORTED_SECTION_PREAMBLE" ||
        issues[0]?.code === "SECTION_SCAN_LIMIT_EXCEEDED"))
  );
}

function validEngineForReason(
  reason: FiscalNotificationLocalReviewReason,
  engineId: unknown,
  engineVersion: unknown,
): boolean {
  return reason === "OCR_DISABLED"
    ? engineId === null && engineVersion === null
    : engineId === "fiscal-notification-family-candidate-engine" &&
        (engineVersion === "1.0.0" ||
          engineVersion === "1.1.0" ||
          engineVersion === "1.2.0" ||
          engineVersion === "1.3.0");
}

function validReviewSemantics(
  status: FiscalNotificationLocalReviewResult["status"],
  reason: FiscalNotificationLocalReviewReason,
  candidates: readonly FiscalNotificationLocalReviewCandidate[],
): boolean {
  switch (reason) {
    case "SUPPORTED_FAMILY_CANDIDATE":
      return (
        status === "REVIEW_REQUIRED" &&
        candidates.length === 1 &&
        candidates[0]?.signalStatus === "COMPLETE_REQUIRED_ANCHORS"
      );
    case "PARTIAL_SUPPORTED_FAMILY_SIGNAL":
      return (
        status === "INFORMATION_PENDING" &&
        candidates.length === 1 &&
        candidates[0]?.signalStatus === "INCOMPLETE_REQUIRED_ANCHORS"
      );
    case "AMBIGUOUS_SUPPORTED_FAMILIES":
      return (
        status === "REVIEW_REQUIRED" &&
        candidates.length > 1 &&
        candidates.every(
          (candidate) => !candidate.signalStatus.startsWith("CONFLICTING_"),
        )
      );
    case "CONFLICTING_AUTHORITY_OR_TERRITORY":
      return (
        status === "REVIEW_REQUIRED" &&
        candidates.length > 0 &&
        candidates.every(
          (candidate) =>
            candidate.signalStatus === "CONFLICTING_AUTHORITY_OR_TERRITORY",
        )
      );
    case "CONFLICTING_DOCUMENT_SIGNAL":
      return (
        status === "REVIEW_REQUIRED" &&
        candidates.length > 0 &&
        candidates.every(
          (candidate) =>
            candidate.signalStatus === "CONFLICTING_DOCUMENT_SIGNAL",
        )
      );
    case "NO_SUPPORTED_FAMILY_SIGNAL":
    case "OCR_DISABLED":
      return status === "INFORMATION_PENDING" && candidates.length === 0;
    case "NO_EXTRACTABLE_TEXT":
      return false;
    case "INCONSISTENT_PAGE_STATE":
    case "UNSUPPORTED_TEXT_CONTROLS":
    case "NORMALIZED_TEXT_LIMIT_EXCEEDED":
    case "TEXT_LINE_LIMIT_EXCEEDED":
      return status === "REVIEW_REQUIRED" && candidates.length === 0;
  }
}

function completeSingleCandidate(
  review: FiscalNotificationLocalReviewResult,
): FiscalNotificationLocalReviewCandidate | null {
  const candidate = review.candidates[0];
  return review.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    review.candidates.length === 1 &&
    candidate?.signalStatus === "COMPLETE_REQUIRED_ANCHORS" &&
    candidate.conflictingAnchorIds.length === 0
    ? candidate
    : null;
}

function resolveCandidateContext(candidate: FiscalNotificationLocalReviewCandidate): {
  readonly candidateContext: FiscalNotificationReviewCandidateContextV1;
  readonly sources: readonly FiscalNotificationOfficialProcedureContextV1[];
} | null {
  const definition = FAMILY_CONTEXT[candidate.familyId];
  const family = resolveFiscalNotificationDocumentFamilyV2(definition.familyId);
  const recognitionContractIsValid =
    definition.minimumEngineVersion === "1.0.0"
      ? family?.recognition?.candidateHandlerId === candidate.handlerId &&
        family.recognition.candidateHandlerVersion === candidate.handlerVersion &&
        family.recognition.outputPolicy === "CANDIDATE_ONLY_REVIEW_REQUIRED"
      : family?.recognition === null;
  if (
    !family ||
    !recognitionContractIsValid ||
    candidate.documentType !== definition.documentType ||
    candidate.handlerId !== definition.handlerId ||
    candidate.handlerVersion !== "1.0.0" ||
    definition.sourceIds.some((sourceId) => !family.sourceIds.includes(sourceId)) ||
    family.knowledgeUsage !== "CONTEXT_ONLY" ||
    family.printedDocumentPolicy !== "EXTRACT_EXACTLY_THEN_REQUIRE_REVIEW" ||
    family.officialContextPolicy !==
      "INTERPRET_ONLY_NEVER_OVERRIDE_DOCUMENT" ||
    family.legalReviewStatus !== "LEGAL_REVIEW_PENDING" ||
    family.operationalPolicy !== "PROHIBITED_UNTIL_HUMAN_REVIEW" ||
    family.requiresHumanReview !== true ||
    family.permitsDebtCreation ||
    family.permitsDeadlineCreation ||
    family.permitsPaymentAction ||
    family.permitsAccountingAction ||
    family.permitsAutomaticRelationConfirmation
  ) {
    return null;
  }
  const sources: FiscalNotificationOfficialProcedureContextV1[] = [];
  for (const sourceId of definition.sourceIds) {
    const source = resolveFiscalNotificationOfficialSourceV2(sourceId);
    if (
      !source ||
      source.authority !== "AEAT" ||
      source.authorityLevel !== "OFFICIAL_PRIMARY" ||
      source.sourceKind !== "PROCEDURE_INFORMATION" ||
      source.verificationStatus !== "OFFICIAL_URL_VERIFIED" ||
      source.usagePolicy !== "CONTEXT_ONLY" ||
      source.legalReviewStatus !== "LEGAL_REVIEW_PENDING" ||
      source.permitsLegalRuleActivation ||
      source.permitsTemplateActivation ||
      source.retainedSourceContent !== "NONE"
    ) {
      return null;
    }
    sources.push(
      Object.freeze({
        sourceId: source.id,
        title: source.title,
        canonicalUrl: source.canonicalUrl,
        authority: "AEAT" as const,
        usagePolicy: "PROCEDURE_CONTEXT_ONLY" as const,
        legalReviewStatus: "LEGAL_REVIEW_PENDING" as const,
        permitsLegalRuleActivation: false as const,
      }),
    );
  }
  return Object.freeze({
    candidateContext: Object.freeze({
      familyId: definition.familyId,
      classificationPolicy: "CANDIDATE_CONTEXT_ONLY" as const,
    }),
    sources: Object.freeze(sources),
  });
}

function candidateStep(
  reason: FiscalNotificationLocalReviewReason,
): FiscalNotificationReviewStepV1 {
  if (ANALYSIS_BLOCKED_REASONS.has(reason)) {
    return step(
      "REVIEW_CANDIDATE_CLASSIFICATION",
      "BLOCKED_BY_ANALYSIS",
      "CANDIDATE_ANALYSIS_BLOCKED",
    );
  }
  if (BLOCKED_REASONS.has(reason)) {
    return step(
      "REVIEW_CANDIDATE_CLASSIFICATION",
      "BLOCKED_BY_ANALYSIS",
      "CANDIDATE_AMBIGUOUS_OR_CONFLICTING",
    );
  }
  if (reason !== "SUPPORTED_FAMILY_CANDIDATE") {
    return step(
      "REVIEW_CANDIDATE_CLASSIFICATION",
      "INFORMATION_PENDING",
      "CANDIDATE_INFORMATION_INCOMPLETE",
    );
  }
  return step(
    "REVIEW_CANDIDATE_CLASSIFICATION",
    "MANUAL_REVIEW_REQUIRED",
    "CANDIDATE_REVIEW_ONLY",
  );
}

function moneyStep(
  outcome: AeatEnforcementMoneyFactsResult["outcome"],
): FiscalNotificationReviewStepV1 {
  if (outcome === "FACTS_AVAILABLE") {
    return step(
      "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
      "MANUAL_REVIEW_REQUIRED",
      "PRINTED_FACTS_REVIEW_ONLY",
    );
  }
  if (outcome === "INFORMATION_PENDING") {
    return step(
      "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
      "INFORMATION_PENDING",
      "PRINTED_FACTS_INFORMATION_PENDING",
    );
  }
  return step(
    "COMPARE_EPHEMERAL_PRINTED_AMOUNTS",
    "BLOCKED_BY_ANALYSIS",
    "PRINTED_FACTS_AMBIGUOUS_OR_BLOCKED",
  );
}

function blockedGuidance(): FiscalNotificationReviewGuidanceV1 {
  return freezeGuidance({
    projectionStatus: "GUIDANCE_BLOCKED",
    candidateContext: null,
    officialProcedureContexts: [],
    steps: [
      step(
        "VERIFY_DOCUMENT_RECIPIENT_AND_AUTHORITY",
        "MANUAL_REVIEW_REQUIRED",
        "MANUAL_IDENTITY_AND_AUTHORITY_CHECK",
      ),
      step(
        "REVIEW_CANDIDATE_CLASSIFICATION",
        "BLOCKED_BY_ANALYSIS",
        "INCONSISTENT_ANALYSIS_ENVELOPE",
      ),
      step(
        "VERIFY_DATES_AND_RESPONSE_CHANNELS_EXTERNALLY",
        "MANUAL_REVIEW_REQUIRED",
        "NO_DATE_OR_RESPONSE_RULE_APPLIED",
      ),
      step(
        "SEEK_HUMAN_FISCAL_REVIEW",
        "MANUAL_REVIEW_REQUIRED",
        "HUMAN_FISCAL_REVIEW_REQUIRED",
      ),
    ],
  });
}

function step(
  id: FiscalNotificationReviewStepIdV1,
  state: FiscalNotificationReviewStepStateV1,
  reason: FiscalNotificationReviewStepReasonV1,
): FiscalNotificationReviewStepV1 {
  return Object.freeze({ id, state, reason });
}

function freezeGuidance(input: {
  readonly projectionStatus: FiscalNotificationReviewGuidanceV1["projectionStatus"];
  readonly candidateContext: FiscalNotificationReviewCandidateContextV1 | null;
  readonly officialProcedureContexts: readonly FiscalNotificationOfficialProcedureContextV1[];
  readonly steps: readonly FiscalNotificationReviewStepV1[];
}): FiscalNotificationReviewGuidanceV1 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_REVIEW_GUIDANCE_SCHEMA_VERSION_V1,
    guidanceVersion: FISCAL_NOTIFICATION_REVIEW_GUIDANCE_VERSION_V1,
    projectionStatus: input.projectionStatus,
    candidateContext: input.candidateContext,
    officialProcedureContexts: Object.freeze([
      ...input.officialProcedureContexts,
    ]),
    steps: Object.freeze([...input.steps]),
    completionTracking: "DISABLED",
    userInputPolicy: "NONE",
    persistencePolicy: "DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    legalRuleStatus: "NOT_APPLIED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function snapshotRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    return null;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== allowedKeys.size) return null;
  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string" || !allowedKeys.has(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return null;
    output[key] = descriptor.value;
  }
  return output;
}

function snapshotArray(value: unknown, maxLength: number): unknown[] | null {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length > maxLength
  ) {
    return null;
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || !keys.includes("length")) return null;
  const output: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return null;
    output.push(descriptor.value);
  }
  return output;
}

function isStrictlyIncreasingNumbers(values: readonly number[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if ((values[index - 1] ?? 0) >= (values[index] ?? 0)) return false;
  }
  return true;
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function sameNumberList(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
