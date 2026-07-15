import {
  FISCAL_NOTIFICATION_EXTRACTION_ENGINE_ID,
  FISCAL_NOTIFICATION_EXTRACTION_ENGINE_VERSION,
  FISCAL_NOTIFICATION_EXTRACTION_SCHEMA_VERSION,
  type FiscalNotificationAnchorEvidence,
  type FiscalNotificationAnchorId,
  type FiscalNotificationExtractionReason,
  type FiscalNotificationExtractionResult,
  type FiscalNotificationFamilyCandidate,
} from "./extraction-contract";
import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "./input-contract";
import {
  AEAT_DEFERRAL_PRIMARY_TITLE_V1,
  AEAT_DOCUMENTATION_REQUIREMENT_PRIMARY_TITLE_V1,
  AEAT_ENFORCEMENT_PRIMARY_TITLE_V1,
  AEAT_FORMAL_FILING_REQUIREMENT_PRIMARY_TITLE_V1,
  AEAT_OFFSET_AGREEMENT_PRIMARY_TITLE_V1,
  AEAT_REAL_ESTATE_SEIZURE_PRIMARY_TITLE_V1,
  AEAT_ROI_REGISTRATION_PRIMARY_TITLE_V1,
  FISCAL_NOTIFICATION_PRIMARY_ACT_HEADER_LINE_LIMIT,
  FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1,
  segmentFiscalNotificationPrimaryActsV1,
  type FiscalNotificationPrimaryActSegmentV1,
  type FiscalNotificationPrimaryActTitleAnchorId,
} from "./primary-act-segmentation.v1";
import { expectedMissingRecognitionAnchors } from "./recognition-policy.v1";

type AnchorMatchMode =
  | "LINE_EXACT"
  | "LINE_PREFIX"
  | "TOKEN_SEQUENCE"
  | "TITLE_PAGE_LINE_EXACT"
  | "TITLE_PAGE_TOKEN_SEQUENCE"
  | "HEADER_TOKEN_SEQUENCE"
  | "HEADER_LINE_PREFIX";

interface ClosedTextAnchorDefinition {
  readonly anchorId: FiscalNotificationAnchorId;
  readonly matchMode: AnchorMatchMode;
  /** Closed, source-controlled literals only. Never supplied by a document. */
  readonly literals: readonly string[];
}

interface PrivateTextIndex {
  readonly pages: readonly {
    readonly pageNumber: number;
    /** Ephemeral only. This type and its builders are intentionally private. */
    readonly normalizedLines: readonly string[];
    /** Ephemeral only. Retains punctuation solely for bounded hostname parsing. */
    readonly sourceLines: readonly string[];
  }[];
  readonly extractablePageCount: number;
  /** Page whose header scopes PAGE_ONE/HEADER match modes for this segment. */
  readonly headerPageNumber: number;
}

type PrivateTextIndexResult =
  | { readonly valid: true; readonly index: PrivateTextIndex }
  | {
      readonly valid: false;
      readonly reason:
        | "INCONSISTENT_PAGE_STATE"
        | "UNSUPPORTED_TEXT_CONTROLS"
        | "NORMALIZED_TEXT_LIMIT_EXCEEDED"
        | "TEXT_LINE_LIMIT_EXCEEDED";
    };

const UNSUPPORTED_TEXT_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;
const MAX_NORMALIZED_TEXT_CHARS = 750_000;
const MAX_TEXT_LINES = 10_000;
const MAX_DECOMPOSED_CODE_POINT_CHARS = 8;
const MAX_NORMALIZED_EXPANSION_RATIO = 2;
const NORMALIZED_EXPANSION_SLACK_CHARS = 256;
const HEADER_LINE_LIMIT = 40;
const GUIDE_HEADER_LINE_LIMIT = HEADER_LINE_LIMIT;

const COMMON_REQUIRED_AUTHORITY_ANCHORS = Object.freeze([
  {
    anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL",
    matchMode: "TITLE_PAGE_LINE_EXACT",
    literals: [
      "sede.agenciatributaria.gob.es",
      "https://sede.agenciatributaria.gob.es",
      "www.agenciatributaria.es",
      "http://www.agenciatributaria.es",
      "https://www.agenciatributaria.es",
    ],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const COMMON_OPTIONAL_AUTHORITY_ANCHORS = Object.freeze([
  {
    anchorId: "AEAT_AUTHORITY_LABEL",
    matchMode: "LINE_EXACT",
    literals: ["agencia tributaria", "agencia estatal de administracion tributaria"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const COMMON_CONFLICTING_ANCHORS = Object.freeze([
  {
    anchorId: "CONFLICTING_AUTHORITY_TGSS",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: ["tesoreria general de la seguridad social"],
  },
  {
    anchorId: "CONFLICTING_TERRITORY_CANARY",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: ["agencia tributaria canaria"],
  },
  {
    anchorId: "CONFLICTING_TERRITORY_CANARY",
    matchMode: "TOKEN_SEQUENCE",
    literals: ["impuesto general indirecto canario", "igic"],
  },
  {
    anchorId: "CONFLICTING_TERRITORY_FORAL",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: [
      "hacienda foral",
      "diputacion foral",
      "hacienda tributaria de navarra",
    ],
  },
  {
    anchorId: "CONFLICTING_TERRITORY_REGIONAL",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: [
      "agencia tributaria de cataluna",
      "agencia tributaria de catalunya",
      "agencia tributaria de andalucia",
      "agencia tributaria de galicia",
      "axencia tributaria de galicia",
      "agencia tributaria de les illes balears",
      "agencia tributaria valenciana",
      "agencia tributaria de la region de murcia",
    ],
  },
  {
    anchorId: "CONFLICTING_TERRITORY_CEUTA_MELILLA",
    matchMode: "TOKEN_SEQUENCE",
    literals: ["ipsi"],
  },
  {
    anchorId: "CONFLICTING_NON_DOCUMENT_GUIDE",
    matchMode: "HEADER_LINE_PREFIX",
    literals: [
      "manual",
      "guia",
      "documento de ejemplo",
      "tutorial",
      "instrucciones para",
      "especificacion",
    ],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const ENFORCEMENT_REQUIRED_ANCHORS = Object.freeze([
  ...COMMON_REQUIRED_AUTHORITY_ANCHORS,
  {
    anchorId: AEAT_ENFORCEMENT_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_ENFORCEMENT_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_ENFORCEMENT_PRIMARY_TITLE_V1.literals,
  },
  {
    anchorId: "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
    matchMode: "LINE_EXACT",
    literals: ["identificacion del documento"],
  },
  {
    anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION",
    matchMode: "LINE_EXACT",
    literals: ["importe de la deuda"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const DEFERRAL_REQUIRED_ANCHORS = Object.freeze([
  ...COMMON_REQUIRED_AUTHORITY_ANCHORS,
  {
    anchorId: AEAT_DEFERRAL_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_DEFERRAL_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_DEFERRAL_PRIMARY_TITLE_V1.literals,
  },
  {
    anchorId: "DEFERRAL_INSTALLMENT_ANNEX",
    matchMode: "LINE_PREFIX",
    literals: ["anexo i"],
  },
  {
    anchorId: "DEFERRAL_INTEREST_CALCULATION",
    matchMode: "LINE_PREFIX",
    literals: ["calculo de intereses"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const OFFSET_REQUIRED_ANCHORS = Object.freeze([
  ...COMMON_REQUIRED_AUTHORITY_ANCHORS,
  {
    anchorId: AEAT_OFFSET_AGREEMENT_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_OFFSET_AGREEMENT_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_OFFSET_AGREEMENT_PRIMARY_TITLE_V1.literals,
  },
  {
    anchorId: "OFFSET_CREDIT_AND_DEBT_ANNEX",
    matchMode: "LINE_EXACT",
    literals: ["credito y deudas", "credito y deudas compensadas de oficio"],
  },
  {
    anchorId: "OFFSET_AGREEMENT_NUMBER",
    matchMode: "LINE_PREFIX",
    literals: ["numero de acuerdo de compensacion"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const REAL_ESTATE_SEIZURE_REQUIRED_ANCHORS = Object.freeze([
  ...COMMON_REQUIRED_AUTHORITY_ANCHORS,
  {
    anchorId: AEAT_REAL_ESTATE_SEIZURE_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_REAL_ESTATE_SEIZURE_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_REAL_ESTATE_SEIZURE_PRIMARY_TITLE_V1.literals,
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const FORMAL_FILING_REQUIRED_ANCHORS = Object.freeze([
  ...COMMON_REQUIRED_AUTHORITY_ANCHORS,
  {
    anchorId: AEAT_FORMAL_FILING_REQUIREMENT_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_FORMAL_FILING_REQUIREMENT_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_FORMAL_FILING_REQUIREMENT_PRIMARY_TITLE_V1.literals,
  },
  {
    anchorId: "FORMAL_FILING_OMITTED_RETURNS_MARKER",
    matchMode: "TITLE_PAGE_TOKEN_SEQUENCE",
    literals: ["declaraciones o autoliquidaciones no presentadas"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const DOCUMENTATION_REQUIREMENT_REQUIRED_ANCHORS = Object.freeze([
  {
    anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL",
    matchMode: "TITLE_PAGE_LINE_EXACT",
    literals: [
      "sede.agenciatributaria.gob.es",
      "https://sede.agenciatributaria.gob.es",
      "www.agenciatributaria.es",
      "http://www.agenciatributaria.es",
      "https://www.agenciatributaria.es",
      "www.agenciatributaria.gob.es",
      "http://www.agenciatributaria.gob.es",
      "https://www.agenciatributaria.gob.es",
    ],
  },
  {
    anchorId: AEAT_DOCUMENTATION_REQUIREMENT_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_DOCUMENTATION_REQUIREMENT_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_DOCUMENTATION_REQUIREMENT_PRIMARY_TITLE_V1.literals,
  },
  {
    anchorId: "DOCUMENT_IDENTIFICATION_SECTION",
    matchMode: "LINE_EXACT",
    literals: ["identificacion del documento"],
  },
  {
    anchorId: "DOCUMENTATION_REQUIREMENT_AGREEMENT_SECTION",
    matchMode: "LINE_EXACT",
    literals: ["acuerdo"],
  },
  {
    anchorId: "DOCUMENTATION_REQUIREMENT_DEADLINE_SECTION",
    matchMode: "LINE_EXACT",
    literals: ["plazo"],
  },
  {
    anchorId: "DOCUMENTATION_REQUIREMENT_BODY_MARKER",
    matchMode: "TITLE_PAGE_TOKEN_SEQUENCE",
    literals: [
      "debera aportar la documentacion",
      "documentacion que se indica a continuacion",
      "documentacion justificativa",
      "documentacion correspondientes",
    ],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const ROI_REGISTRATION_REQUIRED_ANCHORS = Object.freeze([
  ...COMMON_REQUIRED_AUTHORITY_ANCHORS,
  {
    anchorId: AEAT_ROI_REGISTRATION_PRIMARY_TITLE_V1.titleAnchorId,
    matchMode: AEAT_ROI_REGISTRATION_PRIMARY_TITLE_V1.matchMode,
    literals: AEAT_ROI_REGISTRATION_PRIMARY_TITLE_V1.literals,
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const DOCUMENT_IDENTIFICATION_OPTIONAL_ANCHOR = Object.freeze({
  anchorId: "DOCUMENT_IDENTIFICATION_SECTION",
  matchMode: "LINE_EXACT",
  literals: Object.freeze(["identificacion del documento"]),
} satisfies ClosedTextAnchorDefinition);

const FORMAL_FILING_OPTIONAL_ANCHORS = Object.freeze([
  DOCUMENT_IDENTIFICATION_OPTIONAL_ANCHOR,
  {
    anchorId: "FORMAL_FILING_TAX_PERIOD_SECTION",
    matchMode: "LINE_EXACT",
    literals: ["modelo ejercicio periodo", "modelo periodo ejercicio"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

const REAL_ESTATE_SEIZURE_OPTIONAL_ANCHORS = Object.freeze([
  DOCUMENT_IDENTIFICATION_OPTIONAL_ANCHOR,
] satisfies readonly ClosedTextAnchorDefinition[]);

const ROI_REGISTRATION_OPTIONAL_ANCHORS = Object.freeze([
  DOCUMENT_IDENTIFICATION_OPTIONAL_ANCHOR,
  {
    anchorId: "REGISTRY_IDENTIFICATION_SECTION",
    matchMode: "LINE_PREFIX",
    literals: ["datos identificativos"],
  },
] satisfies readonly ClosedTextAnchorDefinition[]);

export function extractFiscalNotificationCandidates(
  value: unknown,
): FiscalNotificationExtractionResult {
  const textIndexResult = createPrivateTextIndex(value);
  const input = value as BoundedDocumentInput;

  if (!textIndexResult.valid) {
    return freezeResult(input, "REVIEW_REQUIRED", textIndexResult.reason, []);
  }
  if (textIndexResult.index.extractablePageCount === 0) {
    return freezeResult(input, "INFORMATION_PENDING", "NO_EXTRACTABLE_TEXT", []);
  }

  const segmentation = segmentFiscalNotificationPrimaryActsV1(
    textIndexResult.index.pages,
    input.signal,
  );
  const candidates = segmentation.segments
    .map((segment) =>
      evaluateSegmentCandidate(
        textIndexResult.index,
        segment,
        segmentation.segmentationVersion,
        input.signal,
      ),
    )
    .filter((candidate) => candidate !== null);
  assertNotAborted(input.signal);

  if (candidates.length === 0) {
    return freezeResult(
      input,
      "INFORMATION_PENDING",
      "NO_SUPPORTED_FAMILY_SIGNAL",
      [],
    );
  }
  if (
    candidates.some(
      (candidate) =>
        candidate.signalStatus === "CONFLICTING_AUTHORITY_OR_TERRITORY" ||
        candidate.signalStatus === "CONFLICTING_DOCUMENT_SIGNAL",
    )
  ) {
    const hasGuideConflict = candidates.some((candidate) =>
      candidate.conflictingAnchorIds.includes("CONFLICTING_NON_DOCUMENT_GUIDE"),
    );
    return freezeResult(
      input,
      "REVIEW_REQUIRED",
      hasGuideConflict
        ? "CONFLICTING_DOCUMENT_SIGNAL"
        : "CONFLICTING_AUTHORITY_OR_TERRITORY",
      candidates,
    );
  }
  if (candidates.length > 1) {
    return freezeResult(
      input,
      "REVIEW_REQUIRED",
      "AMBIGUOUS_SUPPORTED_FAMILIES",
      candidates,
    );
  }
  if (candidates[0]?.signalStatus === "COMPLETE_REQUIRED_ANCHORS") {
    return freezeResult(
      input,
      "REVIEW_REQUIRED",
      "SUPPORTED_FAMILY_CANDIDATE",
      candidates,
    );
  }
  return freezeResult(
    input,
    "INFORMATION_PENDING",
    "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
    candidates,
  );
}

function evaluateSegmentCandidate(
  index: PrivateTextIndex,
  segment: FiscalNotificationPrimaryActSegmentV1,
  segmentationVersion: "1.1.0",
  signal?: AbortSignal,
): FiscalNotificationFamilyCandidate | null {
  const pageNumbers = new Set(segment.pageNumbers);
  for (const pageNumber of offsetAnnexContinuationPageNumbers(index, segment)) {
    pageNumbers.add(pageNumber);
  }
  const segmentIndex = Object.freeze({
    pages: Object.freeze(
      index.pages.filter((page) => pageNumbers.has(page.pageNumber)),
    ),
    extractablePageCount: pageNumbers.size,
    headerPageNumber: segment.startPageNumber,
  });
  if (segment.familyId === "AEAT_ENFORCEMENT_ORDER_CANDIDATE") {
    return evaluateFamilyCandidate(
      segmentIndex,
      signal,
      ENFORCEMENT_REQUIRED_ANCHORS,
      segment.titleAnchorId,
      {
        familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
        documentType: "AEAT_ENFORCEMENT_ORDER",
        handlerId: "aeat-enforcement-order-candidate",
        handlerVersion: "1.0.0",
      },
      [],
      segmentationVersion,
    );
  }
  if (segment.familyId === "AEAT_DEFERRAL_GRANT_CANDIDATE") {
    return evaluateFamilyCandidate(
      segmentIndex,
      signal,
      DEFERRAL_REQUIRED_ANCHORS,
      segment.titleAnchorId,
      {
        familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
        documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
        handlerId: "aeat-deferral-grant-candidate",
        handlerVersion: "1.0.0",
      },
      [],
      segmentationVersion,
    );
  }
  if (segment.familyId === "AEAT_OFFSET_AGREEMENT_CANDIDATE") {
    return evaluateFamilyCandidate(
      segmentIndex,
      signal,
      OFFSET_REQUIRED_ANCHORS,
      segment.titleAnchorId,
      {
        familyId: "AEAT_OFFSET_AGREEMENT_CANDIDATE",
        documentType: "AEAT_OFFSET_AGREEMENT",
        handlerId: "aeat-offset-agreement-candidate",
        handlerVersion: "1.1.0",
      },
      [DOCUMENT_IDENTIFICATION_OPTIONAL_ANCHOR],
      segmentationVersion,
    );
  }
  if (segment.familyId === "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE") {
    return evaluateFamilyCandidate(
      segmentIndex,
      signal,
      REAL_ESTATE_SEIZURE_REQUIRED_ANCHORS,
      segment.titleAnchorId,
      {
        familyId: "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
        documentType: "AEAT_SEIZURE_ORDER",
        handlerId: "aeat-real-estate-seizure-candidate",
        handlerVersion: "1.0.0",
      },
      REAL_ESTATE_SEIZURE_OPTIONAL_ANCHORS,
      segmentationVersion,
    );
  }
  if (segment.familyId === "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE") {
    return evaluateFamilyCandidate(
      segmentIndex,
      signal,
      FORMAL_FILING_REQUIRED_ANCHORS,
      segment.titleAnchorId,
      {
        familyId: "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
        documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
        handlerId: "aeat-formal-filing-requirement-candidate",
        handlerVersion: "1.0.0",
      },
      FORMAL_FILING_OPTIONAL_ANCHORS,
      segmentationVersion,
    );
  }
  if (segment.familyId === "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE") {
    return evaluateFamilyCandidate(
      segmentIndex,
      signal,
      DOCUMENTATION_REQUIREMENT_REQUIRED_ANCHORS,
      segment.titleAnchorId,
      {
        familyId: "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE",
        documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
        handlerId: "aeat-documentation-requirement-candidate",
        handlerVersion: "1.0.0",
      },
      [],
      segmentationVersion,
    );
  }
  return evaluateFamilyCandidate(
    segmentIndex,
    signal,
    ROI_REGISTRATION_REQUIRED_ANCHORS,
    segment.titleAnchorId,
    {
      familyId: "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
      documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
      handlerId: "aeat-roi-registration-agreement-candidate",
      handlerVersion: "1.0.0",
    },
    ROI_REGISTRATION_OPTIONAL_ANCHORS,
    segmentationVersion,
  );
}

/**
 * Handler v1.1: some historical AEAT compensation agreements repeat their
 * exact primary title on Annex I and Annex II. The generic segmenter keeps
 * that repeated title as a conservative boundary. This handler may look past
 * it only when the boundary page is explicitly headed as one of those two
 * annexes, and it stops again before any other registered primary act.
 */
function offsetAnnexContinuationPageNumbers(
  index: PrivateTextIndex,
  segment: FiscalNotificationPrimaryActSegmentV1,
): readonly number[] {
  if (
    segment.familyId !== "AEAT_OFFSET_AGREEMENT_CANDIDATE" ||
    segment.boundaryPageNumber === null
  ) {
    return Object.freeze([]);
  }
  const boundaryPage = index.pages.find(
    (page) => page.pageNumber === segment.boundaryPageNumber,
  );
  if (!boundaryPage || !isOffsetAnnexContinuationPage(boundaryPage)) {
    return Object.freeze([]);
  }

  const pageNumbers: number[] = [];
  for (const page of index.pages) {
    if (page.pageNumber < segment.boundaryPageNumber) continue;
    const registeredTitles = registeredPrimaryTitlesOnPage(page);
    if (
      page.pageNumber > segment.boundaryPageNumber &&
      registeredTitles.length > 0 &&
      !isOffsetAnnexContinuationPage(page)
    ) {
      break;
    }
    pageNumbers.push(page.pageNumber);
  }
  return Object.freeze(pageNumbers);
}

function isOffsetAnnexContinuationPage(
  page: PrivateTextIndex["pages"][number],
): boolean {
  return (
    page.normalizedLines.some(
      (line) => line === "anexo i" || line === "anexo ii",
    ) &&
    registeredPrimaryTitlesOnPage(page).some(
      (definition) =>
        definition.familyId === "AEAT_OFFSET_AGREEMENT_CANDIDATE",
    )
  );
}

function registeredPrimaryTitlesOnPage(
  page: PrivateTextIndex["pages"][number],
): readonly (typeof FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1)[number][] {
  const header = page.normalizedLines.slice(
    0,
    FISCAL_NOTIFICATION_PRIMARY_ACT_HEADER_LINE_LIMIT,
  );
  return FISCAL_NOTIFICATION_REGISTERED_PRIMARY_TITLES_V1.filter(
    (definition) =>
      header.some((line) =>
        definition.literals.some((literal) =>
          definition.matchMode === "LINE_EXACT"
            ? line === literal
            : line === literal || line.startsWith(`${literal} `),
        ),
      ),
  );
}

function evaluateFamilyCandidate(
  index: PrivateTextIndex,
  signal: AbortSignal | undefined,
  requiredAnchors: readonly ClosedTextAnchorDefinition[],
  uniqueTitleAnchorId: FiscalNotificationPrimaryActTitleAnchorId,
  identity: Pick<
    FiscalNotificationFamilyCandidate,
    "familyId" | "documentType" | "handlerId" | "handlerVersion"
  >,
  familyOptionalAnchors: readonly ClosedTextAnchorDefinition[],
  segmentationVersion: "1.1.0",
): FiscalNotificationFamilyCandidate | null {
  const matchedRequired = dedupeAnchorEvidence(
    requiredAnchors
      .map((definition) => collectClosedAnchorEvidence(index, definition, signal))
      .filter((item) => item !== null),
  );
  if (!matchedRequired.some((item) => item.anchorId === uniqueTitleAnchorId)) {
    return null;
  }

  const structuralHeader = collectStructuralHeaderEvidence(
    index,
    requiredAnchors,
    uniqueTitleAnchorId,
    signal,
  );
  const primaryActHeader = collectPrimaryActHeaderEvidence(
    index,
    requiredAnchors,
    uniqueTitleAnchorId,
    signal,
  );
  const matchedConflicts = dedupeAnchorEvidence(
    [
      ...COMMON_CONFLICTING_ANCHORS.map((definition) =>
        collectClosedAnchorEvidence(index, definition, signal),
      ),
      collectConflictingAeatHostEvidence(index, signal),
    ].filter((item) => item !== null),
  );
  const matchedOptional = dedupeAnchorEvidence(
    [...COMMON_OPTIONAL_AUTHORITY_ANCHORS, ...familyOptionalAnchors].map((definition) =>
      collectClosedAnchorEvidence(index, definition, signal),
    ).filter((item) => item !== null),
  );
  const matchedIds = new Set([
    ...matchedRequired.map((item) => item.anchorId),
    ...(structuralHeader ? [structuralHeader.anchorId] : []),
    ...(primaryActHeader ? [primaryActHeader.anchorId] : []),
    ...matchedOptional.map((item) => item.anchorId),
  ]);
  const missingRequiredAnchorIds = expectedMissingRecognitionAnchors(
    identity.familyId,
    FISCAL_NOTIFICATION_EXTRACTION_ENGINE_VERSION,
    matchedIds,
  );
  const conflictingAnchorIds = [
    ...new Set(matchedConflicts.map((item) => item.anchorId)),
  ];
  const hasGuideConflict = conflictingAnchorIds.includes(
    "CONFLICTING_NON_DOCUMENT_GUIDE",
  );

  return Object.freeze({
    ...identity,
    recognitionPolicyVersion: "1.3.0",
    segmentationVersion,
    authoritySignal: "AEAT_UNVERIFIED",
    handlerVersion: identity.handlerVersion,
    signalStatus:
      hasGuideConflict
        ? "CONFLICTING_DOCUMENT_SIGNAL"
        : conflictingAnchorIds.length > 0
          ? "CONFLICTING_AUTHORITY_OR_TERRITORY"
        : missingRequiredAnchorIds.length === 0
          ? "COMPLETE_REQUIRED_ANCHORS"
          : "INCOMPLETE_REQUIRED_ANCHORS",
    matchedAnchors: Object.freeze([
      ...matchedRequired,
      ...(structuralHeader ? [structuralHeader] : []),
      ...(primaryActHeader ? [primaryActHeader] : []),
      ...matchedOptional,
      ...matchedConflicts,
    ]),
    missingRequiredAnchorIds: Object.freeze(missingRequiredAnchorIds),
    conflictingAnchorIds: Object.freeze(conflictingAnchorIds),
    requiresHumanReview: true,
  });
}

function collectStructuralHeaderEvidence(
  index: PrivateTextIndex,
  requiredAnchors: readonly ClosedTextAnchorDefinition[],
  titleAnchorId: FiscalNotificationPrimaryActTitleAnchorId,
  signal?: AbortSignal,
): FiscalNotificationAnchorEvidence | null {
  const firstPage = index.pages.find((page) => page.pageNumber === 1);
  if (!firstPage) return null;
  const titleDefinition = requiredAnchors.find(
    (definition) => definition.anchorId === titleAnchorId,
  );
  const domainDefinition = requiredAnchors.find(
    (definition) => definition.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL",
  );
  if (!titleDefinition || !domainDefinition) return null;
  const headerLines = firstPage.normalizedLines.slice(0, HEADER_LINE_LIMIT);
  if (
    !matchesClosedDefinition(headerLines, titleDefinition, signal) ||
    !matchesClosedDefinition(firstPage.normalizedLines, domainDefinition, signal)
  ) {
    return null;
  }
  return Object.freeze({
    anchorId: "STRUCTURAL_FIRST_PAGE_HEADER",
    pageNumbers: Object.freeze([1]),
  });
}

function collectPrimaryActHeaderEvidence(
  index: PrivateTextIndex,
  requiredAnchors: readonly ClosedTextAnchorDefinition[],
  titleAnchorId: FiscalNotificationPrimaryActTitleAnchorId,
  signal?: AbortSignal,
): FiscalNotificationAnchorEvidence | null {
  if (index.headerPageNumber !== 1) return null;
  const firstPage = index.pages.find((page) => page.pageNumber === 1);
  const titleDefinition = requiredAnchors.find(
    (definition) => definition.anchorId === titleAnchorId,
  );
  if (
    !firstPage ||
    !titleDefinition ||
    !matchesClosedDefinition(
      firstPage.normalizedLines.slice(0, HEADER_LINE_LIMIT),
      titleDefinition,
      signal,
    )
  ) {
    return null;
  }
  return Object.freeze({
    anchorId: "STRUCTURAL_PRIMARY_ACT_HEADER",
    pageNumbers: Object.freeze([1]),
  });
}

function collectConflictingAeatHostEvidence(
  index: PrivateTextIndex,
  signal?: AbortSignal,
): FiscalNotificationAnchorEvidence | null {
  const titlePage = index.pages.find(
    (page) => page.pageNumber === index.headerPageNumber,
  );
  if (!titlePage) return null;
  for (const line of titlePage.sourceLines) {
    assertNotAborted(signal);
    if (hasConflictingAeatHostname(line, signal)) {
      return Object.freeze({
        anchorId: "CONFLICTING_AEAT_HOST_LINE",
        pageNumbers: Object.freeze([titlePage.pageNumber]),
      });
    }
  }
  return null;
}

const AEAT_OFFICIAL_HOSTNAME = "sede.agenciatributaria.gob.es";
const AEAT_HOST_TOKEN_EDGE_PATTERN = /^[\s\p{Ps}\p{Pi}\p{P}]+|[\s\p{Pe}\p{Pf}\p{P}]+$/gu;

function hasConflictingAeatHostname(
  line: string,
  signal?: AbortSignal,
): boolean {
  for (const rawToken of line.split(/\s+/u)) {
    assertNotAborted(signal);
    const decodedToken = decodeUrlComponentSafely(rawToken).toLocaleLowerCase(
      "en-US",
    );
    if (
      !decodedToken.includes(AEAT_OFFICIAL_HOSTNAME)
    ) {
      continue;
    }
    const token = rawToken.replace(AEAT_HOST_TOKEN_EDGE_PATTERN, "");
    if (token.length === 0) continue;
    const parsed = parsePotentialAeatUrl(token);
    if (!parsed) continue;
    const hostname = parsed.hostname.toLocaleLowerCase("en-US").replace(/\.$/u, "");
    const username = decodeUrlComponentSafely(parsed.username).toLocaleLowerCase("en-US");
    const password = decodeUrlComponentSafely(parsed.password).toLocaleLowerCase("en-US");
    const officialTree =
      hostname === AEAT_OFFICIAL_HOSTNAME ||
      hostname.endsWith(`.${AEAT_OFFICIAL_HOSTNAME}`);
    if (
      (!officialTree && hostname.includes(AEAT_OFFICIAL_HOSTNAME)) ||
      (!officialTree && username.includes(AEAT_OFFICIAL_HOSTNAME)) ||
      (!officialTree && password.includes(AEAT_OFFICIAL_HOSTNAME))
    ) {
      return true;
    }
  }
  return false;
}

function parsePotentialAeatUrl(token: string): URL | null {
  try {
    const value = /^https?:\/\//iu.test(token) ? token : `https://${token}`;
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function decodeUrlComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function dedupeAnchorEvidence(
  evidence: readonly FiscalNotificationAnchorEvidence[],
): readonly FiscalNotificationAnchorEvidence[] {
  const pagesByAnchor = new Map<FiscalNotificationAnchorId, Set<number>>();
  for (const item of evidence) {
    const pages = pagesByAnchor.get(item.anchorId) ?? new Set<number>();
    for (const pageNumber of item.pageNumbers) pages.add(pageNumber);
    pagesByAnchor.set(item.anchorId, pages);
  }
  return Object.freeze(
    [...pagesByAnchor].map(([anchorId, pageNumbers]) =>
      Object.freeze({
        anchorId,
        pageNumbers: Object.freeze([...pageNumbers].sort((left, right) => left - right)),
      }),
    ),
  );
}

function createPrivateTextIndex(value: unknown): PrivateTextIndexResult {
  assertBoundedDocumentInput(value);
  const input: BoundedDocumentInput = value;
  const pages: Array<{
    pageNumber: number;
    normalizedLines: readonly string[];
    sourceLines: readonly string[];
  }> = [];
  let extractablePageCount = 0;
  let normalizedCharCount = 0;
  let observedLineCount = 0;

  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const hasText = page.text.trim().length > 0;
    if (page.isBlank === hasText) {
      return invalidTextIndex("INCONSISTENT_PAGE_STATE");
    }
    if (UNSUPPORTED_TEXT_CHARACTER_PATTERN.test(page.text)) {
      return invalidTextIndex("UNSUPPORTED_TEXT_CONTROLS");
    }
    if (!hasText) continue;
    extractablePageCount += 1;

    const normalizedPage = normalizePageLinesBounded(
      page.text,
      MAX_NORMALIZED_TEXT_CHARS - normalizedCharCount,
      MAX_TEXT_LINES - observedLineCount,
      input.signal,
    );
    if (!normalizedPage.valid) return invalidTextIndex(normalizedPage.reason);
    normalizedCharCount += normalizedPage.normalizedCharCount;
    observedLineCount += normalizedPage.observedLineCount;
    pages.push({
      pageNumber: page.pageNumber,
      normalizedLines: normalizedPage.lines,
      sourceLines: normalizedPage.sourceLines,
    });
  }
  assertNotAborted(input.signal);

  return Object.freeze({
    valid: true as const,
    index: Object.freeze({
      pages: Object.freeze(
        pages.map((page) =>
          Object.freeze({
            pageNumber: page.pageNumber,
            normalizedLines: page.normalizedLines,
            sourceLines: page.sourceLines,
          }),
        ),
      ),
      extractablePageCount,
      headerPageNumber: 1,
    }),
  });
}

function normalizePageLinesBounded(
  text: string,
  remainingChars: number,
  remainingLines: number,
  signal?: AbortSignal,
):
  | {
      readonly valid: true;
      readonly lines: readonly string[];
      readonly sourceLines: readonly string[];
      readonly normalizedCharCount: number;
      readonly observedLineCount: number;
    }
  | {
      readonly valid: false;
      readonly reason:
        | "NORMALIZED_TEXT_LIMIT_EXCEEDED"
        | "TEXT_LINE_LIMIT_EXCEEDED";
    } {
  const lines: string[] = [];
  const sourceLines: string[] = [];
  let start = 0;
  let observedLineCount = 0;
  let normalizedCharCount = 0;

  const consumeLine = (end: number) => {
    observedLineCount += 1;
    if (observedLineCount > remainingLines) {
      return "TEXT_LINE_LIMIT_EXCEEDED" as const;
    }
    const sourceLine = text.slice(start, end);
    const normalized = normalizeLineBounded(
      sourceLine,
      remainingChars - normalizedCharCount,
      signal,
    );
    if (!normalized.valid) return normalized.reason;
    normalizedCharCount += normalized.value.length;
    if (normalized.value.length > 0) {
      lines.push(normalized.value);
      sourceLines.push(sourceLine);
    }
    return null;
  };

  for (let index = 0; index < text.length; index += 1) {
    if ((index & 2047) === 0) assertNotAborted(signal);
    const code = text.charCodeAt(index);
    const isSeparator =
      code === 0x0a || code === 0x0d || code === 0x2028 || code === 0x2029;
    if (!isSeparator) continue;
    const failure = consumeLine(index);
    if (failure) return Object.freeze({ valid: false as const, reason: failure });
    if (code === 0x0d && text.charCodeAt(index + 1) === 0x0a) index += 1;
    start = index + 1;
  }
  const failure = consumeLine(text.length);
  if (failure) return Object.freeze({ valid: false as const, reason: failure });
  assertNotAborted(signal);
  return Object.freeze({
    valid: true as const,
    lines: Object.freeze(lines),
    sourceLines: Object.freeze(sourceLines),
    normalizedCharCount,
    observedLineCount,
  });
}

function normalizeLineBounded(
  value: string,
  remainingChars: number,
  signal?: AbortSignal,
):
  | { readonly valid: true; readonly value: string }
  | { readonly valid: false; readonly reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED" } {
  const chunks: string[] = [];
  let chunk = "";
  let normalizedLength = 0;
  let pendingSeparator = false;
  let processedCodePoints = 0;
  let processedInputChars = 0;

  const append = (part: string) => {
    if (normalizedLength + part.length > remainingChars) return false;
    chunk += part;
    normalizedLength += part.length;
    if (chunk.length >= 2048) {
      chunks.push(chunk);
      chunk = "";
    }
    return true;
  };

  for (const codePoint of value) {
    processedCodePoints += 1;
    processedInputChars += codePoint.length;
    if ((processedCodePoints & 2047) === 0) assertNotAborted(signal);
    const decomposed = codePoint.normalize("NFKD");
    if (decomposed.length > MAX_DECOMPOSED_CODE_POINT_CHARS) {
      return Object.freeze({
        valid: false as const,
        reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED" as const,
      });
    }
    for (const unit of decomposed) {
      if (/\p{Mark}/u.test(unit)) continue;
      const lowered = unit.toLocaleLowerCase("es");
      for (const loweredUnit of lowered) {
        if (/[\p{Letter}\p{Number}]/u.test(loweredUnit)) {
          if (pendingSeparator && normalizedLength > 0 && !append(" ")) {
            return Object.freeze({
              valid: false as const,
              reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED" as const,
            });
          }
          pendingSeparator = false;
          if (!append(loweredUnit)) {
            return Object.freeze({
              valid: false as const,
              reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED" as const,
            });
          }
        } else if (normalizedLength > 0) {
          pendingSeparator = true;
        }
      }
    }
    if (
      normalizedLength >
      processedInputChars * MAX_NORMALIZED_EXPANSION_RATIO +
        NORMALIZED_EXPANSION_SLACK_CHARS
    ) {
      return Object.freeze({
        valid: false as const,
        reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED" as const,
      });
    }
  }
  assertNotAborted(signal);
  if (chunk.length > 0) chunks.push(chunk);
  return Object.freeze({ valid: true as const, value: chunks.join("") });
}

function collectClosedAnchorEvidence(
  index: PrivateTextIndex,
  definition: ClosedTextAnchorDefinition,
  signal?: AbortSignal,
): FiscalNotificationAnchorEvidence | null {
  assertNotAborted(signal);
  const pageNumbers: number[] = [];
  for (const page of index.pages) {
    assertNotAborted(signal);
    if (
      (definition.matchMode.startsWith("HEADER_") ||
        definition.matchMode.startsWith("TITLE_PAGE_")) &&
      page.pageNumber !== index.headerPageNumber
    ) {
      continue;
    }
    const lineLimit =
      definition.matchMode === "HEADER_LINE_PREFIX" &&
      definition.anchorId === "CONFLICTING_NON_DOCUMENT_GUIDE"
        ? GUIDE_HEADER_LINE_LIMIT
        : definition.matchMode.startsWith("HEADER_")
          ? HEADER_LINE_LIMIT
          : page.normalizedLines.length;
    if (
      matchesClosedDefinition(
        page.normalizedLines.slice(0, lineLimit),
        definition,
        signal,
      )
    ) {
      pageNumbers.push(page.pageNumber);
    }
  }
  assertNotAborted(signal);
  if (pageNumbers.length === 0) return null;
  return Object.freeze({
    anchorId: definition.anchorId,
    pageNumbers: Object.freeze(pageNumbers),
  });
}

function matchesClosedDefinition(
  lines: readonly string[],
  definition: ClosedTextAnchorDefinition,
  signal?: AbortSignal,
): boolean {
  const literals = definition.literals.map((literal) => {
    const normalized = normalizeLineBounded(literal, 512, signal);
    return normalized.valid ? normalized.value : "";
  });
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    assertNotAborted(signal);
    const line = lines[lineIndex] ?? "";
    for (const literal of literals) {
      if (literal.length === 0) continue;
      if (
        ((definition.matchMode === "LINE_EXACT" ||
          definition.matchMode === "TITLE_PAGE_LINE_EXACT") &&
          line === literal) ||
        ((definition.matchMode === "LINE_PREFIX" ||
          definition.matchMode === "HEADER_LINE_PREFIX") &&
          (line === literal || line.startsWith(`${literal} `))) ||
        ((definition.matchMode === "TOKEN_SEQUENCE" ||
          definition.matchMode === "TITLE_PAGE_TOKEN_SEQUENCE" ||
          definition.matchMode === "HEADER_TOKEN_SEQUENCE") &&
          ` ${line} `.includes(` ${literal} `))
      ) {
        return true;
      }
    }
  }
  return false;
}

function invalidTextIndex(
  reason:
    | "INCONSISTENT_PAGE_STATE"
    | "UNSUPPORTED_TEXT_CONTROLS"
    | "NORMALIZED_TEXT_LIMIT_EXCEEDED"
    | "TEXT_LINE_LIMIT_EXCEEDED",
): PrivateTextIndexResult {
  return Object.freeze({ valid: false as const, reason });
}

function freezeResult(
  input: BoundedDocumentInput,
  status: FiscalNotificationExtractionResult["status"],
  reason: FiscalNotificationExtractionReason,
  candidates: readonly FiscalNotificationFamilyCandidate[],
): FiscalNotificationExtractionResult {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_EXTRACTION_SCHEMA_VERSION,
    engineId: FISCAL_NOTIFICATION_EXTRACTION_ENGINE_ID,
    engineVersion: FISCAL_NOTIFICATION_EXTRACTION_ENGINE_VERSION,
    ownerScope: input.ownerScope,
    documentId: input.documentId,
    status,
    reason,
    candidates: Object.freeze(
      candidates.map((candidate) =>
        Object.freeze({
          ...candidate,
          matchedAnchors: Object.freeze(
            candidate.matchedAnchors.map((anchor) =>
              Object.freeze({
                anchorId: anchor.anchorId,
                pageNumbers: Object.freeze([...anchor.pageNumbers]),
              }),
            ),
          ),
          missingRequiredAnchorIds: Object.freeze([
            ...candidate.missingRequiredAnchorIds,
          ]),
          conflictingAnchorIds: Object.freeze([
            ...candidate.conflictingAnchorIds,
          ]),
        }),
      ),
    ),
    selectedFamilyId: null,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}
