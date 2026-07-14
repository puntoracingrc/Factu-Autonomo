import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedAdministrativePage,
  type BoundedDocumentInput,
} from "./input-contract";

export const AEAT_ENFORCEMENT_MONEY_FACTS_SCHEMA_VERSION = 1 as const;
export const AEAT_ENFORCEMENT_MONEY_FACTS_ENGINE_ID =
  "aeat-enforcement-money-facts" as const;
export const AEAT_ENFORCEMENT_MONEY_FACTS_ENGINE_VERSION = "1.1.0" as const;

export const AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS = Object.freeze({
  maxSectionLines: 32,
  maxPreambleLines: 1,
  maxLineCharacters: 1_024,
  maxMoneyTokenCharacters: 32,
  maxAmountCents: 100_000_000_000,
} as const);

export type AeatEnforcementMoneyFactKind =
  | "OUTSTANDING_PRINCIPAL"
  | "ORDINARY_ENFORCEMENT_SURCHARGE"
  | "PAYMENT_ON_ACCOUNT"
  | "DOCUMENT_TOTAL";

export type AeatEnforcementMoneyEvidenceLabel =
  | "OUTSTANDING_PRINCIPAL_LABEL"
  | "ORDINARY_ENFORCEMENT_SURCHARGE_LABEL"
  | "PAYMENT_ON_ACCOUNT_LABEL"
  | "DOCUMENT_TOTAL_LABEL";

export interface AeatEnforcementMoneyEvidence {
  readonly pageNumber: number;
  readonly label: AeatEnforcementMoneyEvidenceLabel;
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
}

export interface AeatEnforcementMoneyFact {
  readonly kind: AeatEnforcementMoneyFactKind;
  readonly amountCents: number;
  readonly currency: "EUR" | "UNKNOWN";
  readonly evidence: readonly AeatEnforcementMoneyEvidence[];
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export type AeatEnforcementMoneyIssueCode =
  | "FAMILY_GATE_NOT_SATISFIED"
  | "NO_AMOUNT_SECTION"
  | "NO_CLOSED_LABEL_MATCH"
  | "LABEL_WITHOUT_AMOUNT"
  | "INVALID_AMOUNT_FORMAT"
  | "DUPLICATE_AMOUNT_SECTION"
  | "DUPLICATE_MONEY_LABEL"
  | "UNSUPPORTED_SECTION_PREAMBLE"
  | "SECTION_SCAN_LIMIT_EXCEEDED"
  | "UNSUPPORTED_TEXT_STATE";

export interface AeatEnforcementMoneyIssue {
  readonly code: AeatEnforcementMoneyIssueCode;
  readonly kind: AeatEnforcementMoneyFactKind | null;
  readonly pageNumbers: readonly number[];
}

export type AeatEnforcementMoneyFactsOutcome =
  | "FACTS_AVAILABLE"
  | "INFORMATION_PENDING"
  | "AMBIGUOUS"
  | "PROCESSING_BLOCKED";

export interface AeatEnforcementMoneyFactsResult {
  readonly schemaVersion: 1;
  readonly engineId: "aeat-enforcement-money-facts";
  readonly engineVersion: "1.0.0" | "1.1.0";
  readonly documentType: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatEnforcementMoneyFactsOutcome;
  readonly facts: readonly AeatEnforcementMoneyFact[];
  readonly issues: readonly AeatEnforcementMoneyIssue[];
  readonly selectedPaymentAmountKind: null;
  readonly semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY";
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly retainedSourceContent: "NONE";
}

interface ClosedMoneyLabelDefinition {
  readonly kind: AeatEnforcementMoneyFactKind;
  readonly evidenceLabel: AeatEnforcementMoneyEvidenceLabel;
  readonly literals: readonly string[];
}

interface MoneyObservation {
  readonly kind: AeatEnforcementMoneyFactKind;
  readonly amountCents: number;
  readonly currency: "EUR" | "UNKNOWN";
  readonly evidence: AeatEnforcementMoneyEvidence;
}

type ParsedMoneyToken =
  | {
      readonly valid: true;
      readonly amountCents: number;
      readonly currency: "EUR" | "UNKNOWN";
    }
  | { readonly valid: false };

type LabelMatch =
  | { readonly matched: false }
  | {
      readonly matched: true;
      readonly remainder: string;
      readonly definition: ClosedMoneyLabelDefinition;
    };

type ImmediateMoneyLine =
  | { readonly state: "NONE" }
  | { readonly state: "OVERSIZED" }
  | {
      readonly state: "FOUND";
      readonly token: string;
      readonly lineIndex: number;
    };

const AMOUNT_SECTION_HEADING = "importe de la deuda";
const MONEY_DEFINITIONS = Object.freeze([
  {
    kind: "OUTSTANDING_PRINCIPAL",
    evidenceLabel: "OUTSTANDING_PRINCIPAL_LABEL",
    literals: ["importe principal pendiente", "principal pendiente"],
  },
  {
    kind: "ORDINARY_ENFORCEMENT_SURCHARGE",
    evidenceLabel: "ORDINARY_ENFORCEMENT_SURCHARGE_LABEL",
    literals: [
      "recargo de apremio ordinario (20 %)",
      "recargo de apremio ordinario (20%)",
      "recargo ordinario (20 %)",
      "recargo ordinario (20%)",
      "recargo de apremio ordinario",
      "recargo ordinario",
    ],
  },
  {
    kind: "PAYMENT_ON_ACCOUNT",
    evidenceLabel: "PAYMENT_ON_ACCOUNT_LABEL",
    literals: ["ingreso a cuenta", "pago a cuenta"],
  },
  {
    kind: "DOCUMENT_TOTAL",
    evidenceLabel: "DOCUMENT_TOTAL_LABEL",
    literals: ["importe total de la deuda", "importe total"],
  },
] as const satisfies readonly ClosedMoneyLabelDefinition[]);

const MONEY_KINDS = Object.freeze(
  MONEY_DEFINITIONS.map((definition) => definition.kind),
);
const LINE_SEPARATOR = /\r\n|[\n\r\u2028\u2029]/u;
const DOT_GROUPED_MONEY = "[1-9]\\d{0,2}(?:\\.\\d{3})+";
const SPACE_GROUPED_MONEY = "[1-9]\\d{0,2}(?: \\d{3})+";
const NBSP_GROUPED_MONEY = "[1-9]\\d{0,2}(?:\\u00a0\\d{3})+";
const UNGROUPED_MONEY = "(?:0|[1-9]\\d*)";
const MONEY_TOKEN = new RegExp(
  `^(${DOT_GROUPED_MONEY}|${SPACE_GROUPED_MONEY}|${NBSP_GROUPED_MONEY}|${UNGROUPED_MONEY}),(\\d{2})(?:\\s*(€|EUR|euros?))?$`,
  "iu",
);
export function extractAeatEnforcementMoneyFacts(
  value: unknown,
): AeatEnforcementMoneyFactsResult {
  assertBoundedDocumentInput(value);
  const input = value as BoundedDocumentInput;
  const family = extractFiscalNotificationCandidates(input);
  const candidate = family.candidates[0];
  const amountAnchor = candidate?.matchedAnchors.find(
    (anchor) => anchor.anchorId === "ENFORCEMENT_DEBT_AMOUNT_SECTION",
  );
  if (
    family.reason !== "SUPPORTED_FAMILY_CANDIDATE" ||
    family.candidates.length !== 1 ||
    candidate?.familyId !== "AEAT_ENFORCEMENT_ORDER_CANDIDATE" ||
    candidate.signalStatus !== "COMPLETE_REQUIRED_ANCHORS" ||
    candidate.conflictingAnchorIds.length !== 0 ||
    !amountAnchor
  ) {
    const failure = classifyFamilyGateFailure(family.reason);
    return freezeResult({
      documentType: null,
      status: failure.processingBlocked
        ? "REVIEW_REQUIRED"
        : "INFORMATION_PENDING",
      outcome: failure.processingBlocked
        ? "PROCESSING_BLOCKED"
        : "INFORMATION_PENDING",
      facts: [],
      issues: [issue(failure.issueCode, null, [])],
    });
  }

  const sections = findAmountSections(input, amountAnchor.pageNumbers);
  if (sections.length === 0) {
    return freezeResult({
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      facts: [],
      issues: [issue("NO_AMOUNT_SECTION", null, [])],
    });
  }
  if (sections.length > 1) {
    return freezeResult({
      status: "REVIEW_REQUIRED",
      outcome: "AMBIGUOUS",
      facts: [],
      issues: [
        issue(
          "DUPLICATE_AMOUNT_SECTION",
          null,
          sections.map((section) => section.page.pageNumber),
        ),
      ],
    });
  }

  const section = sections[0];
  if (!section) {
    return freezeResult({
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      facts: [],
      issues: [issue("NO_AMOUNT_SECTION", null, [])],
    });
  }
  const scan = scanAmountSection(input, section);
  if (scan.blockingIssue) {
    return freezeResult({
      status: "REVIEW_REQUIRED",
      outcome:
        scan.blockingIssue.code === "DUPLICATE_MONEY_LABEL"
          ? "AMBIGUOUS"
          : "PROCESSING_BLOCKED",
      facts: [],
      issues: [scan.blockingIssue],
    });
  }

  const observationsByKind = new Map<
    AeatEnforcementMoneyFactKind,
    MoneyObservation[]
  >();
  for (const observation of scan.observations) {
    const current = observationsByKind.get(observation.kind) ?? [];
    current.push(observation);
    observationsByKind.set(observation.kind, current);
  }

  const facts = MONEY_KINDS.flatMap((kind) => {
    const observations = observationsByKind.get(kind) ?? [];
    if (observations.length !== 1) return [];
    const observation = observations[0];
    if (!observation) return [];
    return [
      Object.freeze({
        kind,
        amountCents: observation.amountCents,
        currency: observation.currency,
        evidence: Object.freeze([Object.freeze({ ...observation.evidence })]),
        reviewStatus: "REVIEW_REQUIRED" as const,
      }),
    ];
  });
  const missingIssues = MONEY_KINDS.filter(
    (kind) => !observationsByKind.has(kind),
  ).map((kind) => issue("NO_CLOSED_LABEL_MATCH", kind, [section.page.pageNumber]));
  const issues = [...scan.nonBlockingIssues, ...missingIssues];

  return freezeResult({
    status: facts.length > 0 ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
    outcome: facts.length > 0 ? "FACTS_AVAILABLE" : "INFORMATION_PENDING",
    facts,
    issues,
  });
}

function classifyFamilyGateFailure(
  reason: ReturnType<typeof extractFiscalNotificationCandidates>["reason"],
): {
  readonly processingBlocked: boolean;
  readonly issueCode:
    | "FAMILY_GATE_NOT_SATISFIED"
    | "UNSUPPORTED_TEXT_STATE";
} {
  switch (reason) {
    case "PARTIAL_SUPPORTED_FAMILY_SIGNAL":
    case "NO_SUPPORTED_FAMILY_SIGNAL":
    case "NO_EXTRACTABLE_TEXT":
      return {
        processingBlocked: false,
        issueCode: "FAMILY_GATE_NOT_SATISFIED",
      };
    case "INCONSISTENT_PAGE_STATE":
    case "UNSUPPORTED_TEXT_CONTROLS":
    case "NORMALIZED_TEXT_LIMIT_EXCEEDED":
    case "TEXT_LINE_LIMIT_EXCEEDED":
      return {
        processingBlocked: true,
        issueCode: "UNSUPPORTED_TEXT_STATE",
      };
    case "SUPPORTED_FAMILY_CANDIDATE":
    case "AMBIGUOUS_SUPPORTED_FAMILIES":
    case "CONFLICTING_AUTHORITY_OR_TERRITORY":
    case "CONFLICTING_DOCUMENT_SIGNAL":
      return {
        processingBlocked: true,
        issueCode: "FAMILY_GATE_NOT_SATISFIED",
      };
    default: {
      const exhaustiveReason: never = reason;
      return exhaustiveReason;
    }
  }
}

function findAmountSections(
  input: BoundedDocumentInput,
  anchorPageNumbers: readonly number[],
): readonly {
  readonly page: BoundedAdministrativePage;
  readonly lineIndex: number;
  readonly lines: readonly string[];
}[] {
  const sections: {
    page: BoundedAdministrativePage;
    lineIndex: number;
    lines: readonly string[];
  }[] = [];
  const allowedPages = new Set(anchorPageNumbers);
  for (const page of input.pages) {
    assertNotAborted(input.signal);
    if (!allowedPages.has(page.pageNumber)) continue;
    const lines = page.text.split(LINE_SEPARATOR);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      assertNotAborted(input.signal);
      if (
        normalizeClosedHeading(lines[lineIndex] ?? "") ===
        AMOUNT_SECTION_HEADING
      ) {
        sections.push({ page, lineIndex, lines });
      }
    }
  }
  return sections;
}

function scanAmountSection(
  input: BoundedDocumentInput,
  section: {
    readonly page: BoundedAdministrativePage;
    readonly lineIndex: number;
    readonly lines: readonly string[];
  },
): {
  readonly observations: readonly MoneyObservation[];
  readonly nonBlockingIssues: readonly AeatEnforcementMoneyIssue[];
  readonly blockingIssue: AeatEnforcementMoneyIssue | null;
} {
  const observations: MoneyObservation[] = [];
  const issues: AeatEnforcementMoneyIssue[] = [];
  const seenKinds = new Set<AeatEnforcementMoneyFactKind>();
  const lastIndex = Math.min(
    section.lines.length,
    section.lineIndex + 1 + AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxSectionLines,
  );
  let endedAtStructuralBoundary = false;
  let consecutiveBlankLines = 0;
  let preambleLineCount = 0;

  for (let lineIndex = section.lineIndex + 1; lineIndex < lastIndex; lineIndex += 1) {
    assertNotAborted(input.signal);
    const rawLine = section.lines[lineIndex] ?? "";
    if (rawLine.length > AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxLineCharacters) {
      return {
        observations: [],
        nonBlockingIssues: [],
        blockingIssue: issue(
          "SECTION_SCAN_LIMIT_EXCEEDED",
          null,
          [section.page.pageNumber],
        ),
      };
    }
    if (rawLine.trim().length === 0) {
      consecutiveBlankLines += 1;
      if (consecutiveBlankLines >= 2) {
        endedAtStructuralBoundary = true;
        break;
      }
      continue;
    }
    consecutiveBlankLines = 0;
    const match = matchClosedMoneyLabel(rawLine);
    if (!match.matched) {
      if (seenKinds.size === 0) {
        preambleLineCount += 1;
        if (
          preambleLineCount <=
          AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxPreambleLines
        ) {
          continue;
        }
        return {
          observations: [],
          nonBlockingIssues: [],
          blockingIssue: issue(
            "UNSUPPORTED_SECTION_PREAMBLE",
            null,
            [section.page.pageNumber],
          ),
        };
      }
      endedAtStructuralBoundary = true;
      break;
    }
    if (seenKinds.has(match.definition.kind)) {
      return {
        observations: [],
        nonBlockingIssues: [],
        blockingIssue: issue(
          "DUPLICATE_MONEY_LABEL",
          match.definition.kind,
          [section.page.pageNumber],
        ),
      };
    }
    seenKinds.add(match.definition.kind);

    let token = match.remainder;
    if (token.length === 0) {
      const next = findImmediateMoneyLine(section.lines, lineIndex, lastIndex);
      if (next.state === "OVERSIZED") {
        return {
          observations: [],
          nonBlockingIssues: [],
          blockingIssue: issue(
            "SECTION_SCAN_LIMIT_EXCEEDED",
            null,
            [section.page.pageNumber],
          ),
        };
      }
      if (next.state === "NONE") {
        issues.push(
          issue("LABEL_WITHOUT_AMOUNT", match.definition.kind, [section.page.pageNumber]),
        );
        continue;
      }
      token = next.token;
      lineIndex = next.lineIndex;
    }
    const parsed = parseSpanishMoneyToken(token);
    if (!parsed.valid) {
      return {
        observations: [],
        nonBlockingIssues: [],
        blockingIssue: issue(
          "INVALID_AMOUNT_FORMAT",
          match.definition.kind,
          [section.page.pageNumber],
        ),
      };
    }
    observations.push({
      kind: match.definition.kind,
      amountCents: parsed.amountCents,
      currency: parsed.currency,
      evidence: {
        pageNumber: section.page.pageNumber,
        label: match.definition.evidenceLabel,
        extractionMethod: "RULE",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    });
  }
  if (!endedAtStructuralBoundary && lastIndex < section.lines.length) {
    return {
      observations: [],
      nonBlockingIssues: [],
      blockingIssue: issue(
        "SECTION_SCAN_LIMIT_EXCEEDED",
        null,
        [section.page.pageNumber],
      ),
    };
  }
  return {
    observations: Object.freeze(observations),
    nonBlockingIssues: Object.freeze(issues),
    blockingIssue: null,
  };
}

function matchClosedMoneyLabel(rawLine: string): LabelMatch {
  for (const definition of MONEY_DEFINITIONS) {
    for (const literal of definition.literals) {
      const matchedLabel = new RegExp(
        `^[\\t \\u00a0]*${literal
          .split(" ")
          .map(escapeRegularExpression)
          .join("[\\t \\u00a0]+")}`,
        "iu",
      ).exec(rawLine);
      if (!matchedLabel) continue;
      const suffix = rawLine.slice(matchedLabel[0].length);
      if (suffix.length === 0) {
        return { matched: true, remainder: "", definition };
      }
      if (!/^(?:\s|:|-|\()/u.test(suffix)) continue;
      const remainder = suffix
        .replace(/^\s*(?::|-)?\s*/u, "")
        .trim();
      return { matched: true, remainder, definition };
    }
  }
  return { matched: false };
}

function findImmediateMoneyLine(
  lines: readonly string[],
  labelLineIndex: number,
  lastIndex: number,
): ImmediateMoneyLine {
  for (
    let lineIndex = labelLineIndex + 1;
    lineIndex < Math.min(lastIndex, labelLineIndex + 3);
    lineIndex += 1
  ) {
    const rawLine = lines[lineIndex] ?? "";
    if (
      rawLine.length >
      AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxLineCharacters
    ) {
      return { state: "OVERSIZED" };
    }
    const token = rawLine.trim();
    if (token.length === 0) continue;
    if (matchClosedMoneyLabel(rawLine).matched) return { state: "NONE" };
    return { state: "FOUND", token, lineIndex };
  }
  return { state: "NONE" };
}

function parseSpanishMoneyToken(value: string): ParsedMoneyToken {
  if (value.length > AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxMoneyTokenCharacters) {
    return { valid: false };
  }
  const match = MONEY_TOKEN.exec(value.trim());
  if (!match) return { valid: false };
  try {
    const euros = BigInt((match[1] ?? "").replace(/[.\u00a0 ]/gu, ""));
    const cents = BigInt(match[2] ?? "");
    const amount = euros * BigInt(100) + cents;
    if (
      amount > BigInt(AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxAmountCents) ||
      amount > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return { valid: false };
    }
    const amountCents = Number(amount);
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
      return { valid: false };
    }
    return {
      valid: true,
      amountCents,
      currency: match[3] ? "EUR" : "UNKNOWN",
    };
  } catch {
    return { valid: false };
  }
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Mirrors the dispatcher's closed-heading semantics without retaining or
 * returning normalized document content. Oversized lines cannot be headings.
 */
function normalizeClosedHeading(value: string): string {
  if (value.length > AEAT_ENFORCEMENT_MONEY_FACTS_LIMITS.maxLineCharacters) {
    return "";
  }
  let normalized = "";
  let pendingSeparator = false;
  for (const codePoint of value) {
    const decomposed = codePoint.normalize("NFKD");
    for (const unit of decomposed) {
      if (/\p{Mark}/u.test(unit)) continue;
      for (const loweredUnit of unit.toLocaleLowerCase("es")) {
        if (/[\p{Letter}\p{Number}]/u.test(loweredUnit)) {
          if (pendingSeparator && normalized.length > 0) normalized += " ";
          normalized += loweredUnit;
          pendingSeparator = false;
        } else if (normalized.length > 0) {
          pendingSeparator = true;
        }
      }
    }
  }
  return normalized;
}

function issue(
  code: AeatEnforcementMoneyIssueCode,
  kind: AeatEnforcementMoneyFactKind | null,
  pageNumbers: readonly number[],
): AeatEnforcementMoneyIssue {
  return Object.freeze({
    code,
    kind,
    pageNumbers: Object.freeze([...new Set(pageNumbers)].sort((a, b) => a - b)),
  });
}

function freezeResult(input: {
  readonly documentType?: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatEnforcementMoneyFactsOutcome;
  readonly facts: readonly AeatEnforcementMoneyFact[];
  readonly issues: readonly AeatEnforcementMoneyIssue[];
}): AeatEnforcementMoneyFactsResult {
  return Object.freeze({
    schemaVersion: AEAT_ENFORCEMENT_MONEY_FACTS_SCHEMA_VERSION,
    engineId: AEAT_ENFORCEMENT_MONEY_FACTS_ENGINE_ID,
    engineVersion: AEAT_ENFORCEMENT_MONEY_FACTS_ENGINE_VERSION,
    documentType:
      input.documentType === undefined
        ? "AEAT_ENFORCEMENT_ORDER"
        : input.documentType,
    status: input.status,
    outcome: input.outcome,
    facts: Object.freeze(
      input.facts.map((fact) =>
        Object.freeze({
          ...fact,
          evidence: Object.freeze(
            fact.evidence.map((evidence) => Object.freeze({ ...evidence })),
          ),
        }),
      ),
    ),
    issues: Object.freeze(
      input.issues.map((item) =>
        Object.freeze({
          ...item,
          pageNumbers: Object.freeze([...item.pageNumbers]),
        }),
      ),
    ),
    selectedPaymentAmountKind: null,
    semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY",
    legalRuleStatus: "NOT_APPLIED",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}
