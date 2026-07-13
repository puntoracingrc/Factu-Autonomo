import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "./input-contract";

export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V1 = 1 as const;
export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_ID_V1 =
  "aeat-enforcement-explicit-fields" as const;
export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V1 =
  "1.0.0" as const;

export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1 = Object.freeze({
  maxLineCharacters: 1_024,
  maxObservedLines: 10_000,
  maxReferenceTokenCharacters: 160,
  maxOccurrencesPerKind: 32,
  maxOccurrencesTotal: 128,
  maxReferenceDetections: 5,
  maxPrintedDateFacts: 3,
  maxIssues: 8,
} as const);

export type AeatEnforcementReferenceKindV1 =
  | "LIQUIDATION_KEY"
  | "DOCUMENT_REFERENCE"
  | "PAYMENT_JUSTIFICANTE"
  | "CSV"
  | "VTO_RAW";

export type AeatEnforcementPrintedDateKindV1 =
  | "PRINTED_ISSUE_DATE"
  | "PRINTED_SIGNATURE_DATE"
  | "PRINTED_VOLUNTARY_PERIOD_END_DATE";

export type AeatEnforcementExplicitFieldKindV1 =
  | AeatEnforcementReferenceKindV1
  | AeatEnforcementPrintedDateKindV1;

export type AeatEnforcementExplicitFieldEvidenceLabelV1 =
  | "LIQUIDATION_KEY_LABEL"
  | "DOCUMENT_REFERENCE_LABEL"
  | "PAYMENT_JUSTIFICANTE_LABEL"
  | "CSV_LABEL"
  | "VTO_RAW_LABEL"
  | "PRINTED_ISSUE_DATE_LABEL"
  | "PRINTED_SIGNATURE_DATE_LABEL"
  | "PRINTED_VOLUNTARY_PERIOD_END_DATE_LABEL";

export interface AeatEnforcementReferenceDetectionV1 {
  readonly kind: AeatEnforcementReferenceKindV1;
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly valueDisclosure: "REDACTED_IN_WORKER";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatEnforcementPrintedDateFactV1 {
  readonly kind: AeatEnforcementPrintedDateKindV1;
  readonly calendarDate: string;
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly dateMeaning: "PRINTED_LABEL_ONLY";
  readonly legalEffect: "NOT_DETERMINED";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export type AeatEnforcementExplicitFieldIssueCodeV1 =
  | "FAMILY_GATE_NOT_SATISFIED"
  | "NO_CLOSED_LABEL_MATCH"
  | "LABEL_WITHOUT_VALUE"
  | "INVALID_REFERENCE_VALUE"
  | "INVALID_PRINTED_DATE"
  | "MULTIPLE_DISTINCT_REFERENCE_VALUES"
  | "MULTIPLE_DISTINCT_PRINTED_DATES"
  | "FIELD_SCAN_LIMIT_EXCEEDED"
  | "UNSUPPORTED_TEXT_STATE";

export interface AeatEnforcementExplicitFieldIssueV1 {
  readonly code: AeatEnforcementExplicitFieldIssueCodeV1;
  readonly fieldKind: AeatEnforcementExplicitFieldKindV1 | null;
  readonly pageNumbers: readonly number[];
}

export type AeatEnforcementExplicitFieldsOutcomeV1 =
  | "FACTS_AVAILABLE"
  | "INFORMATION_PENDING"
  | "AMBIGUOUS"
  | "PROCESSING_BLOCKED";

export interface AeatEnforcementExplicitFieldsV1 {
  readonly schemaVersion: 1;
  readonly engineId: "aeat-enforcement-explicit-fields";
  readonly engineVersion: "1.0.0";
  readonly documentType: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatEnforcementExplicitFieldsOutcomeV1;
  readonly referenceDetections: readonly AeatEnforcementReferenceDetectionV1[];
  readonly printedDateFacts: readonly AeatEnforcementPrintedDateFactV1[];
  readonly issues: readonly AeatEnforcementExplicitFieldIssueV1[];
  readonly semanticPolicy: "EXPLICIT_PRINTED_FIELDS_ONLY";
  readonly referenceValuePolicy: "REDACT_BEFORE_WORKER_RESPONSE";
  readonly vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT";
  readonly dateMeaningPolicy: "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT";
  readonly deadlinePolicy: "NOT_CALCULATED";
  readonly calculatedDeadline: null;
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly retainedReferenceValues: "NONE";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

interface ClosedReferenceDefinition {
  readonly kind: AeatEnforcementReferenceKindV1;
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
  readonly labelPatterns: readonly RegExp[];
}

interface ClosedDateDefinition {
  readonly kind: AeatEnforcementPrintedDateKindV1;
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
  readonly labelPatterns: readonly RegExp[];
}

type ClosedFieldDefinition = ClosedReferenceDefinition | ClosedDateDefinition;

interface MatchedClosedField {
  readonly definition: ClosedFieldDefinition;
  readonly remainder: string;
}

interface ReferenceObservation {
  readonly kind: AeatEnforcementReferenceKindV1;
  readonly canonicalValue: string;
  readonly pageNumber: number;
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
}

interface DateObservation {
  readonly kind: AeatEnforcementPrintedDateKindV1;
  readonly calendarDate: string;
  readonly pageNumber: number;
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
}

type ImmediateValue =
  | { readonly state: "NONE" }
  | { readonly state: "BLOCKED" }
  | {
      readonly state: "FOUND";
      readonly value: string;
      readonly lineIndex: number;
    };

const REFERENCE_DEFINITIONS = Object.freeze([
  {
    kind: "LIQUIDATION_KEY",
    evidenceLabel: "LIQUIDATION_KEY_LABEL",
    labelPatterns: [/clave[\t \u00a0]+de[\t \u00a0]+liquidaci[oó]n/iu],
  },
  {
    kind: "DOCUMENT_REFERENCE",
    evidenceLabel: "DOCUMENT_REFERENCE_LABEL",
    labelPatterns: [
      /referencia[\t \u00a0]+del[\t \u00a0]+documento/iu,
      /referencia/iu,
    ],
  },
  {
    kind: "PAYMENT_JUSTIFICANTE",
    evidenceLabel: "PAYMENT_JUSTIFICANTE_LABEL",
    labelPatterns: [
      /n(?:[uú]mero|[ºo.]?)[\t \u00a0]+de[\t \u00a0]+justificante/iu,
      /justificante[\t \u00a0]+de[\t \u00a0]+pago/iu,
      /justificante/iu,
    ],
  },
  {
    kind: "CSV",
    evidenceLabel: "CSV_LABEL",
    labelPatterns: [
      /c[oó]digo[\t \u00a0]+seguro[\t \u00a0]+de[\t \u00a0]+verificaci[oó]n(?:[\t \u00a0]*\([\t \u00a0]*csv[\t \u00a0]*\))?/iu,
      /csv/iu,
    ],
  },
  {
    kind: "VTO_RAW",
    evidenceLabel: "VTO_RAW_LABEL",
    labelPatterns: [/vto\.?/iu],
  },
] as const satisfies readonly ClosedReferenceDefinition[]);

const DATE_DEFINITIONS = Object.freeze([
  {
    kind: "PRINTED_ISSUE_DATE",
    evidenceLabel: "PRINTED_ISSUE_DATE_LABEL",
    labelPatterns: [
      /fecha[\t \u00a0]+de[\t \u00a0]+emisi[oó]n/iu,
      /fecha[\t \u00a0]+de[\t \u00a0]+expedici[oó]n/iu,
    ],
  },
  {
    kind: "PRINTED_SIGNATURE_DATE",
    evidenceLabel: "PRINTED_SIGNATURE_DATE_LABEL",
    labelPatterns: [/fecha[\t \u00a0]+de[\t \u00a0]+firma/iu],
  },
  {
    kind: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
    evidenceLabel: "PRINTED_VOLUNTARY_PERIOD_END_DATE_LABEL",
    labelPatterns: [
      /fecha[\t \u00a0]+de[\t \u00a0]+finalizaci[oó]n[\t \u00a0]+del[\t \u00a0]+per[ií]odo[\t \u00a0]+voluntario/iu,
      /fecha[\t \u00a0]+fin[\t \u00a0]+del?[\t \u00a0]+per[ií]odo[\t \u00a0]+voluntario/iu,
      /fin[\t \u00a0]+del[\t \u00a0]+per[ií]odo[\t \u00a0]+voluntario/iu,
    ],
  },
] as const satisfies readonly ClosedDateDefinition[]);

const CLOSED_DEFINITIONS = Object.freeze([
  ...REFERENCE_DEFINITIONS,
  ...DATE_DEFINITIONS,
] as const);
const REFERENCE_KINDS = Object.freeze(
  REFERENCE_DEFINITIONS.map((definition) => definition.kind),
);
const DATE_KINDS = Object.freeze(
  DATE_DEFINITIONS.map((definition) => definition.kind),
);
const ALL_FIELD_KINDS = Object.freeze([
  ...REFERENCE_KINDS,
  ...DATE_KINDS,
]);
const REFERENCE_KIND_SET = new Set<AeatEnforcementExplicitFieldKindV1>(
  REFERENCE_KINDS,
);
const LINE_SEPARATOR = /\r\n|[\n\r\u2028\u2029]/u;
const REFERENCE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9./_-]*$/u;
const PRINTED_DATE = /^(\d{2})([/-])(\d{2})\2(\d{4})$/u;

export function extractAeatEnforcementExplicitFieldsV1(
  value: unknown,
): AeatEnforcementExplicitFieldsV1 {
  assertBoundedDocumentInput(value);
  const input = value as BoundedDocumentInput;
  const family = extractFiscalNotificationCandidates(input);
  const candidate = family.candidates[0];
  if (
    family.reason !== "SUPPORTED_FAMILY_CANDIDATE" ||
    family.candidates.length !== 1 ||
    candidate?.familyId !== "AEAT_ENFORCEMENT_ORDER_CANDIDATE" ||
    candidate.signalStatus !== "COMPLETE_REQUIRED_ANCHORS" ||
    candidate.conflictingAnchorIds.length !== 0
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
      referenceDetections: [],
      printedDateFacts: [],
      issues: [issue(failure.issueCode, null, [])],
    });
  }

  const scan = scanClosedFields(input);
  if (scan.blockingIssue) {
    return freezeResult({
      status: "REVIEW_REQUIRED",
      outcome:
        scan.blockingIssue.code ===
          "MULTIPLE_DISTINCT_REFERENCE_VALUES" ||
        scan.blockingIssue.code === "MULTIPLE_DISTINCT_PRINTED_DATES"
          ? "AMBIGUOUS"
          : "PROCESSING_BLOCKED",
      referenceDetections: [],
      printedDateFacts: [],
      issues: [scan.blockingIssue],
    });
  }

  const nonBlockingIssueByKind = new Map(
    scan.nonBlockingIssues.flatMap((item) =>
      item.fieldKind === null ? [] : [[item.fieldKind, item] as const],
    ),
  );
  const referenceDetections = REFERENCE_DEFINITIONS.flatMap((definition) => {
    if (nonBlockingIssueByKind.has(definition.kind)) return [];
    const observations = scan.referenceObservations.filter(
      (observation) => observation.kind === definition.kind,
    );
    if (observations.length === 0) return [];
    return [
      Object.freeze({
        kind: definition.kind,
        occurrenceCount: observations.length,
        pageNumbers: sortedUniquePages(observations),
        evidenceLabel: definition.evidenceLabel,
        extractionMethod: "RULE" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
        valueDisclosure: "REDACTED_IN_WORKER" as const,
        reviewStatus: "REVIEW_REQUIRED" as const,
      }),
    ];
  });
  const printedDateFacts = DATE_DEFINITIONS.flatMap((definition) => {
    if (nonBlockingIssueByKind.has(definition.kind)) return [];
    const observations = scan.dateObservations.filter(
      (observation) => observation.kind === definition.kind,
    );
    const first = observations[0];
    if (!first) return [];
    return [
      Object.freeze({
        kind: definition.kind,
        calendarDate: first.calendarDate,
        occurrenceCount: observations.length,
        pageNumbers: sortedUniquePages(observations),
        evidenceLabel: definition.evidenceLabel,
        extractionMethod: "RULE" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
        dateMeaning: "PRINTED_LABEL_ONLY" as const,
        legalEffect: "NOT_DETERMINED" as const,
        reviewStatus: "REVIEW_REQUIRED" as const,
      }),
    ];
  });
  const observedKinds = new Set<AeatEnforcementExplicitFieldKindV1>([
    ...referenceDetections.map((item) => item.kind),
    ...printedDateFacts.map((item) => item.kind),
  ]);
  const issues = ALL_FIELD_KINDS.flatMap((kind) => {
    if (observedKinds.has(kind)) {
      const pending = nonBlockingIssueByKind.get(kind);
      return pending ? [pending] : [];
    }
    return [
      nonBlockingIssueByKind.get(kind) ??
        issue("NO_CLOSED_LABEL_MATCH", kind, []),
    ];
  });
  const hasFacts =
    referenceDetections.length > 0 || printedDateFacts.length > 0;

  return freezeResult({
    status: hasFacts ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
    outcome: hasFacts ? "FACTS_AVAILABLE" : "INFORMATION_PENDING",
    referenceDetections,
    printedDateFacts,
    issues,
  });
}

function scanClosedFields(input: BoundedDocumentInput): {
  readonly referenceObservations: readonly ReferenceObservation[];
  readonly dateObservations: readonly DateObservation[];
  readonly nonBlockingIssues: readonly AeatEnforcementExplicitFieldIssueV1[];
  readonly blockingIssue: AeatEnforcementExplicitFieldIssueV1 | null;
} {
  const referenceObservations: ReferenceObservation[] = [];
  const dateObservations: DateObservation[] = [];
  const pendingPages = new Map<
    AeatEnforcementExplicitFieldKindV1,
    Set<number>
  >();
  const referenceValues = new Map<AeatEnforcementReferenceKindV1, Set<string>>();
  const dateValues = new Map<AeatEnforcementPrintedDateKindV1, Set<string>>();
  const occurrences = new Map<AeatEnforcementExplicitFieldKindV1, number>();
  let observedLines = 0;
  let totalOccurrences = 0;

  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const lines = page.text.split(LINE_SEPARATOR);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      assertNotAborted(input.signal);
      observedLines += 1;
      if (
        observedLines >
        AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxObservedLines
      ) {
        return blockedScan(
          issue("FIELD_SCAN_LIMIT_EXCEEDED", null, [page.pageNumber]),
        );
      }
      const rawLine = lines[lineIndex] ?? "";
      if (
        rawLine.length >
        AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxLineCharacters
      ) {
        return blockedScan(
          issue("FIELD_SCAN_LIMIT_EXCEEDED", null, [page.pageNumber]),
        );
      }
      const matched = matchClosedField(rawLine);
      if (!matched) continue;

      let token = matched.remainder;
      if (token.length === 0) {
        const immediate = findImmediateValue(lines, lineIndex);
        if (immediate.state === "BLOCKED") {
          return blockedScan(
            issue(
              "FIELD_SCAN_LIMIT_EXCEEDED",
              matched.definition.kind,
              [page.pageNumber],
            ),
          );
        }
        if (immediate.state === "NONE") {
          const pages = pendingPages.get(matched.definition.kind) ?? new Set();
          pages.add(page.pageNumber);
          pendingPages.set(matched.definition.kind, pages);
          continue;
        }
        if (
          observedLines + 1 >
          AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxObservedLines
        ) {
          return blockedScan(
            issue("FIELD_SCAN_LIMIT_EXCEEDED", null, [page.pageNumber]),
          );
        }
        token = immediate.value;
        lineIndex = immediate.lineIndex;
        observedLines += 1;
      }

      totalOccurrences += 1;
      const nextKindCount = (occurrences.get(matched.definition.kind) ?? 0) + 1;
      occurrences.set(matched.definition.kind, nextKindCount);
      if (
        totalOccurrences >
          AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxOccurrencesTotal ||
        nextKindCount >
          AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxOccurrencesPerKind
      ) {
        return blockedScan(
          issue(
            "FIELD_SCAN_LIMIT_EXCEEDED",
            matched.definition.kind,
            [page.pageNumber],
          ),
        );
      }

      if (isReferenceDefinition(matched.definition)) {
        const canonicalValue = parseReferenceToken(token);
        if (!canonicalValue) {
          return blockedScan(
            issue(
              "INVALID_REFERENCE_VALUE",
              matched.definition.kind,
              [page.pageNumber],
            ),
          );
        }
        const values = referenceValues.get(matched.definition.kind) ?? new Set();
        values.add(canonicalValue);
        if (values.size > 1) {
          return blockedScan(
            issue(
              "MULTIPLE_DISTINCT_REFERENCE_VALUES",
              matched.definition.kind,
              [
                ...referenceObservations
                  .filter((item) => item.kind === matched.definition.kind)
                  .map((item) => item.pageNumber),
                page.pageNumber,
              ],
            ),
          );
        }
        referenceValues.set(matched.definition.kind, values);
        referenceObservations.push({
          kind: matched.definition.kind,
          canonicalValue,
          pageNumber: page.pageNumber,
          evidenceLabel: matched.definition.evidenceLabel,
        });
        continue;
      }

      const calendarDate = parsePrintedDate(token);
      if (!calendarDate) {
        return blockedScan(
          issue(
            "INVALID_PRINTED_DATE",
            matched.definition.kind,
            [page.pageNumber],
          ),
        );
      }
      const values = dateValues.get(matched.definition.kind) ?? new Set();
      values.add(calendarDate);
      if (values.size > 1) {
        return blockedScan(
          issue(
            "MULTIPLE_DISTINCT_PRINTED_DATES",
            matched.definition.kind,
            [
              ...dateObservations
                .filter((item) => item.kind === matched.definition.kind)
                .map((item) => item.pageNumber),
              page.pageNumber,
            ],
          ),
        );
      }
      dateValues.set(matched.definition.kind, values);
      dateObservations.push({
        kind: matched.definition.kind,
        calendarDate,
        pageNumber: page.pageNumber,
        evidenceLabel: matched.definition.evidenceLabel,
      });
    }
  }
  assertNotAborted(input.signal);

  const nonBlockingIssues = ALL_FIELD_KINDS.flatMap((kind) => {
    const pages = pendingPages.get(kind);
    return pages && pages.size > 0
      ? [issue("LABEL_WITHOUT_VALUE", kind, [...pages])]
      : [];
  });
  return Object.freeze({
    referenceObservations: Object.freeze(referenceObservations),
    dateObservations: Object.freeze(dateObservations),
    nonBlockingIssues: Object.freeze(nonBlockingIssues),
    blockingIssue: null,
  });
}

function matchClosedField(rawLine: string): MatchedClosedField | null {
  for (const definition of CLOSED_DEFINITIONS) {
    for (const pattern of definition.labelPatterns) {
      const matched = new RegExp(
        `^[\\t \\u00a0]*(?:${pattern.source})`,
        pattern.flags,
      ).exec(rawLine);
      if (!matched) continue;
      const suffix = rawLine.slice(matched[0].length);
      if (suffix.length === 0 || suffix.trim().length === 0) {
        return { definition, remainder: "" };
      }
      if (!/^[\t \u00a0]*:[\t \u00a0]*/u.test(suffix)) continue;
      return {
        definition,
        remainder: suffix.replace(/^[\t \u00a0]*:[\t \u00a0]*/u, "").trim(),
      };
    }
  }
  return null;
}

function findImmediateValue(
  lines: readonly string[],
  labelLineIndex: number,
): ImmediateValue {
  const lineIndex = labelLineIndex + 1;
  if (lineIndex >= lines.length) return { state: "NONE" };
  const rawLine = lines[lineIndex] ?? "";
  if (
    rawLine.length >
    AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxLineCharacters
  ) {
    return { state: "BLOCKED" };
  }
  const token = rawLine.trim();
  if (token.length === 0 || matchClosedField(rawLine)) {
    return { state: "NONE" };
  }
  return { state: "FOUND", value: token, lineIndex };
}

function parseReferenceToken(value: string): string | null {
  const token = value.trim();
  if (
    token.length === 0 ||
    token.length >
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxReferenceTokenCharacters ||
    !REFERENCE_TOKEN.test(token)
  ) {
    return null;
  }
  return token;
}

function parsePrintedDate(value: string): string | null {
  const matched = PRINTED_DATE.exec(value.trim());
  if (!matched) return null;
  const day = Number(matched[1]);
  const month = Number(matched[3]);
  const year = Number(matched[4]);
  if (
    !Number.isSafeInteger(day) ||
    !Number.isSafeInteger(month) ||
    !Number.isSafeInteger(year) ||
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isReferenceDefinition(
  definition: ClosedFieldDefinition,
): definition is ClosedReferenceDefinition {
  return REFERENCE_KIND_SET.has(definition.kind);
}

function classifyFamilyGateFailure(
  reason: ReturnType<typeof extractFiscalNotificationCandidates>["reason"],
): {
  readonly processingBlocked: boolean;
  readonly issueCode: "FAMILY_GATE_NOT_SATISFIED" | "UNSUPPORTED_TEXT_STATE";
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

function sortedUniquePages(
  observations: readonly { readonly pageNumber: number }[],
): readonly number[] {
  return Object.freeze(
    [...new Set(observations.map((item) => item.pageNumber))].sort(
      (left, right) => left - right,
    ),
  );
}

function issue(
  code: AeatEnforcementExplicitFieldIssueCodeV1,
  fieldKind: AeatEnforcementExplicitFieldKindV1 | null,
  pageNumbers: readonly number[],
): AeatEnforcementExplicitFieldIssueV1 {
  return Object.freeze({
    code,
    fieldKind,
    pageNumbers: Object.freeze([...new Set(pageNumbers)].sort((a, b) => a - b)),
  });
}

function blockedScan(
  blockingIssue: AeatEnforcementExplicitFieldIssueV1,
): {
  readonly referenceObservations: readonly ReferenceObservation[];
  readonly dateObservations: readonly DateObservation[];
  readonly nonBlockingIssues: readonly AeatEnforcementExplicitFieldIssueV1[];
  readonly blockingIssue: AeatEnforcementExplicitFieldIssueV1;
} {
  return Object.freeze({
    referenceObservations: Object.freeze([]),
    dateObservations: Object.freeze([]),
    nonBlockingIssues: Object.freeze([]),
    blockingIssue,
  });
}

function freezeResult(input: {
  readonly documentType?: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatEnforcementExplicitFieldsOutcomeV1;
  readonly referenceDetections: readonly AeatEnforcementReferenceDetectionV1[];
  readonly printedDateFacts: readonly AeatEnforcementPrintedDateFactV1[];
  readonly issues: readonly AeatEnforcementExplicitFieldIssueV1[];
}): AeatEnforcementExplicitFieldsV1 {
  return Object.freeze({
    schemaVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V1,
    engineId: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_ID_V1,
    engineVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V1,
    documentType:
      input.documentType === undefined
        ? "AEAT_ENFORCEMENT_ORDER"
        : input.documentType,
    status: input.status,
    outcome: input.outcome,
    referenceDetections: Object.freeze(
      input.referenceDetections.map((item) =>
        Object.freeze({
          ...item,
          pageNumbers: Object.freeze([...item.pageNumbers]),
        }),
      ),
    ),
    printedDateFacts: Object.freeze(
      input.printedDateFacts.map((item) =>
        Object.freeze({
          ...item,
          pageNumbers: Object.freeze([...item.pageNumbers]),
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
    semanticPolicy: "EXPLICIT_PRINTED_FIELDS_ONLY",
    referenceValuePolicy: "REDACT_BEFORE_WORKER_RESPONSE",
    vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT",
    dateMeaningPolicy: "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT",
    deadlinePolicy: "NOT_CALCULATED",
    calculatedDeadline: null,
    legalRuleStatus: "NOT_APPLIED",
    retainedReferenceValues: "NONE",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}
