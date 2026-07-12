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

type AnchorMatchMode =
  | "LINE_EXACT"
  | "LINE_PREFIX"
  | "TOKEN_SEQUENCE"
  | "PAGE_ONE_TOKEN_SEQUENCE"
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
  }[];
  readonly extractablePageCount: number;
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
const GUIDE_HEADER_LINE_LIMIT = 12;

const COMMON_REQUIRED_AUTHORITY_ANCHORS = Object.freeze([
  {
    anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL",
    matchMode: "PAGE_ONE_TOKEN_SEQUENCE",
    literals: ["sede agenciatributaria gob es"],
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
    anchorId: "ENFORCEMENT_ORDER_TITLE",
    matchMode: "LINE_EXACT",
    literals: ["providencia de apremio"],
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
    anchorId: "DEFERRAL_GRANT_TITLE",
    matchMode: "LINE_PREFIX",
    literals: [
      "concesion de aplazamiento o fraccionamiento",
      "concesion de aplazamiento fraccionamiento",
      "concesion del aplazamiento o fraccionamiento",
      "concesion del aplazamiento fraccionamiento",
      "acuerdo de concesion de aplazamiento",
    ],
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

  const candidates = [
    evaluateFamilyCandidate(
      textIndexResult.index,
      input.signal,
      ENFORCEMENT_REQUIRED_ANCHORS,
      "ENFORCEMENT_ORDER_TITLE",
      {
        familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
        documentType: "AEAT_ENFORCEMENT_ORDER",
        handlerId: "aeat-enforcement-order-candidate",
      },
    ),
    evaluateFamilyCandidate(
      textIndexResult.index,
      input.signal,
      DEFERRAL_REQUIRED_ANCHORS,
      "DEFERRAL_GRANT_TITLE",
      {
        familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
        documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
        handlerId: "aeat-deferral-grant-candidate",
      },
    ),
  ].filter((candidate) => candidate !== null);
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

function evaluateFamilyCandidate(
  index: PrivateTextIndex,
  signal: AbortSignal | undefined,
  requiredAnchors: readonly ClosedTextAnchorDefinition[],
  uniqueTitleAnchorId:
    | "ENFORCEMENT_ORDER_TITLE"
    | "DEFERRAL_GRANT_TITLE",
  identity: Pick<
    FiscalNotificationFamilyCandidate,
    "familyId" | "documentType" | "handlerId"
  >,
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
  const matchedConflicts = dedupeAnchorEvidence(
    COMMON_CONFLICTING_ANCHORS.map((definition) =>
      collectClosedAnchorEvidence(index, definition, signal),
    ).filter((item) => item !== null),
  );
  const matchedOptional = dedupeAnchorEvidence(
    COMMON_OPTIONAL_AUTHORITY_ANCHORS.map((definition) =>
      collectClosedAnchorEvidence(index, definition, signal),
    ).filter((item) => item !== null),
  );
  const matchedIds = new Set([
    ...matchedRequired.map((item) => item.anchorId),
    ...(structuralHeader ? [structuralHeader.anchorId] : []),
  ]);
  const missingRequiredAnchorIds = [
    ...new Set([
      ...requiredAnchors.map((definition) => definition.anchorId),
      "STRUCTURAL_FIRST_PAGE_HEADER" as const,
    ]),
  ].filter((anchorId) => !matchedIds.has(anchorId));
  const conflictingAnchorIds = [
    ...new Set(matchedConflicts.map((item) => item.anchorId)),
  ];
  const hasGuideConflict = conflictingAnchorIds.includes(
    "CONFLICTING_NON_DOCUMENT_GUIDE",
  );

  return Object.freeze({
    ...identity,
    authoritySignal: "AEAT_UNVERIFIED",
    handlerVersion: "1.0.0",
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
  titleAnchorId: "ENFORCEMENT_ORDER_TITLE" | "DEFERRAL_GRANT_TITLE",
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
          }),
        ),
      ),
      extractablePageCount,
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
  let start = 0;
  let observedLineCount = 0;
  let normalizedCharCount = 0;

  const consumeLine = (end: number) => {
    observedLineCount += 1;
    if (observedLineCount > remainingLines) {
      return "TEXT_LINE_LIMIT_EXCEEDED" as const;
    }
    const normalized = normalizeLineBounded(
      text.slice(start, end),
      remainingChars - normalizedCharCount,
      signal,
    );
    if (!normalized.valid) return normalized.reason;
    normalizedCharCount += normalized.value.length;
    if (normalized.value.length > 0) lines.push(normalized.value);
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
        definition.matchMode === "PAGE_ONE_TOKEN_SEQUENCE") &&
      page.pageNumber !== 1
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
        (definition.matchMode === "LINE_EXACT" && line === literal) ||
        ((definition.matchMode === "LINE_PREFIX" ||
          definition.matchMode === "HEADER_LINE_PREFIX") &&
          (line === literal || line.startsWith(`${literal} `))) ||
        ((definition.matchMode === "TOKEN_SEQUENCE" ||
          definition.matchMode === "PAGE_ONE_TOKEN_SEQUENCE" ||
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
