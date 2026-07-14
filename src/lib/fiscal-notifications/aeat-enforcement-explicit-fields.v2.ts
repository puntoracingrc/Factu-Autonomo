import {
  AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1,
  extractAeatEnforcementExplicitFieldsV1,
  type AeatEnforcementExplicitFieldEvidenceLabelV1,
  type AeatEnforcementExplicitFieldIssueCodeV1,
  type AeatEnforcementExplicitFieldIssueV1,
  type AeatEnforcementExplicitFieldKindV1,
  type AeatEnforcementExplicitFieldsOutcomeV1,
  type AeatEnforcementPrintedDateKindV1,
  type AeatEnforcementReferenceKindV1,
} from "./aeat-enforcement-explicit-fields.v1";
import {
  assertNotAborted,
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  type BoundedDocumentInput,
} from "./input-contract";

export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V2 = 2 as const;
export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_ID_V2 =
  "aeat-enforcement-explicit-fields" as const;
export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V2 =
  "2.0.0" as const;

export const AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2 = Object.freeze({
  ...AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1,
  maxReferenceFacts:
    AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V1.maxReferenceDetections,
  maxPageNumbersPerItem: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
} as const);

export interface AeatEnforcementReferenceFactV2 {
  readonly kind: AeatEnforcementReferenceKindV1;
  readonly printedValue: string;
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatEnforcementPrintedDateFactV2 {
  readonly kind: AeatEnforcementPrintedDateKindV1;
  readonly printedValue: string;
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

export interface AeatEnforcementExplicitFieldsV2 {
  readonly schemaVersion: 2;
  readonly engineId: "aeat-enforcement-explicit-fields";
  readonly engineVersion: "2.0.0";
  readonly documentType: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatEnforcementExplicitFieldsOutcomeV1;
  readonly referenceFacts: readonly AeatEnforcementReferenceFactV2[];
  readonly printedDateFacts: readonly AeatEnforcementPrintedDateFactV2[];
  readonly issues: readonly AeatEnforcementExplicitFieldIssueV1[];
  readonly semanticPolicy: "EXPLICIT_PRINTED_FIELDS_ONLY";
  readonly referenceValuePolicy: "EPHEMERAL_UI_ONLY";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly networkPolicy: "NO_NETWORK";
  readonly vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT";
  readonly dateMeaningPolicy: "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT";
  readonly deadlinePolicy: "NOT_CALCULATED";
  readonly calculatedDeadline: null;
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

interface ClosedFieldDefinition {
  readonly kind: AeatEnforcementExplicitFieldKindV1;
  readonly evidenceLabel: AeatEnforcementExplicitFieldEvidenceLabelV1;
  readonly labelPatterns: readonly RegExp[];
}

interface MatchedClosedField {
  readonly definition: ClosedFieldDefinition;
  readonly remainder: string;
}

interface PrintedObservation {
  readonly kind: AeatEnforcementExplicitFieldKindV1;
  readonly printedValue: string;
  readonly pageNumber: number;
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
] as const satisfies readonly ClosedFieldDefinition[]);

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
] as const satisfies readonly ClosedFieldDefinition[]);

const CLOSED_DEFINITIONS = Object.freeze([
  ...REFERENCE_DEFINITIONS,
  ...DATE_DEFINITIONS,
]);
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
const DATE_KIND_SET = new Set<AeatEnforcementExplicitFieldKindV1>(DATE_KINDS);
const ALL_FIELD_KIND_SET = new Set<AeatEnforcementExplicitFieldKindV1>(
  ALL_FIELD_KINDS,
);
const ISSUE_CODES = new Set<AeatEnforcementExplicitFieldIssueCodeV1>([
  "FAMILY_GATE_NOT_SATISFIED",
  "NO_CLOSED_LABEL_MATCH",
  "LABEL_WITHOUT_VALUE",
  "INVALID_REFERENCE_VALUE",
  "INVALID_PRINTED_DATE",
  "MULTIPLE_DISTINCT_REFERENCE_VALUES",
  "MULTIPLE_DISTINCT_PRINTED_DATES",
  "FIELD_SCAN_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const OUTCOMES = new Set<AeatEnforcementExplicitFieldsOutcomeV1>([
  "FACTS_AVAILABLE",
  "INFORMATION_PENDING",
  "AMBIGUOUS",
  "PROCESSING_BLOCKED",
]);
const LINE_SEPARATOR = /\r\n|[\n\r\u2028\u2029]/u;
const REFERENCE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9./_-]*$/u;
const PRINTED_DATE = /^(\d{2})([/-])(\d{2})\2(\d{4})$/u;

const ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "referenceFacts",
  "printedDateFacts",
  "issues",
  "semanticPolicy",
  "referenceValuePolicy",
  "persistencePolicy",
  "networkPolicy",
  "vtoPolicy",
  "dateMeaningPolicy",
  "deadlinePolicy",
  "calculatedDeadline",
  "legalRuleStatus",
  "retainedSourceContent",
  "requiresHumanReview",
  "materializationPolicy",
]);
const REFERENCE_KEYS = new Set([
  "kind",
  "printedValue",
  "occurrenceCount",
  "pageNumbers",
  "evidenceLabel",
  "extractionMethod",
  "assertionType",
  "valueDisclosure",
  "reviewStatus",
]);
const DATE_KEYS = new Set([
  "kind",
  "printedValue",
  "calendarDate",
  "occurrenceCount",
  "pageNumbers",
  "evidenceLabel",
  "extractionMethod",
  "assertionType",
  "dateMeaning",
  "legalEffect",
  "reviewStatus",
]);
const ISSUE_KEYS = new Set(["code", "fieldKind", "pageNumbers"]);

export function extractAeatEnforcementExplicitFieldsV2(
  value: unknown,
): AeatEnforcementExplicitFieldsV2 {
  const v1 = extractAeatEnforcementExplicitFieldsV1(value);
  if (v1.outcome !== "FACTS_AVAILABLE") {
    return freezeResult({
      documentType: v1.documentType,
      status: v1.status,
      outcome: v1.outcome,
      referenceFacts: [],
      printedDateFacts: [],
      issues: v1.issues,
    });
  }

  const input = value as BoundedDocumentInput;
  const scan = scanPrintedValues(input);
  if (scan.ambiguity) {
    return freezeResult({
      status: "REVIEW_REQUIRED",
      outcome: "AMBIGUOUS",
      referenceFacts: [],
      printedDateFacts: [],
      issues: [scan.ambiguity],
    });
  }

  const observationsByKind = new Map<
    AeatEnforcementExplicitFieldKindV1,
    readonly PrintedObservation[]
  >();
  for (const kind of ALL_FIELD_KINDS) {
    observationsByKind.set(
      kind,
      scan.observations.filter((observation) => observation.kind === kind),
    );
  }
  const referenceFacts = v1.referenceDetections.map((detection) => {
    const observations = observationsByKind.get(detection.kind) ?? [];
    const first = observations[0];
    if (!first || observations.length !== detection.occurrenceCount) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    return Object.freeze({
      kind: detection.kind,
      printedValue: first.printedValue,
      occurrenceCount: detection.occurrenceCount,
      pageNumbers: Object.freeze([...detection.pageNumbers]),
      evidenceLabel: detection.evidenceLabel,
      extractionMethod: "RULE" as const,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      valueDisclosure: "EPHEMERAL_UI_ONLY" as const,
      reviewStatus: "REVIEW_REQUIRED" as const,
    });
  });
  const printedDateFacts = v1.printedDateFacts.map((fact) => {
    const observations = observationsByKind.get(fact.kind) ?? [];
    const first = observations[0];
    if (!first || observations.length !== fact.occurrenceCount) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    return Object.freeze({
      kind: fact.kind,
      printedValue: first.printedValue,
      calendarDate: fact.calendarDate,
      occurrenceCount: fact.occurrenceCount,
      pageNumbers: Object.freeze([...fact.pageNumbers]),
      evidenceLabel: fact.evidenceLabel,
      extractionMethod: "RULE" as const,
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      dateMeaning: "PRINTED_LABEL_ONLY" as const,
      legalEffect: "NOT_DETERMINED" as const,
      reviewStatus: "REVIEW_REQUIRED" as const,
    });
  });
  return freezeResult({
    status: "REVIEW_REQUIRED",
    outcome: "FACTS_AVAILABLE",
    referenceFacts,
    printedDateFacts,
    issues: v1.issues,
  });
}

export function parseAeatEnforcementExplicitFieldsV2(
  value: unknown,
  maxPageNumber: number = FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
): AeatEnforcementExplicitFieldsV2 {
  try {
    if (
      !Number.isSafeInteger(maxPageNumber) ||
      maxPageNumber < 1 ||
      maxPageNumber > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
    ) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    const root = snapshotRecord(value, ROOT_KEYS);
    if (
      root.schemaVersion !== 2 ||
      root.engineId !== "aeat-enforcement-explicit-fields" ||
      root.engineVersion !== "2.0.0" ||
      (root.documentType !== "AEAT_ENFORCEMENT_ORDER" &&
        root.documentType !== null) ||
      (root.status !== "REVIEW_REQUIRED" &&
        root.status !== "INFORMATION_PENDING") ||
      !OUTCOMES.has(root.outcome as AeatEnforcementExplicitFieldsOutcomeV1) ||
      root.semanticPolicy !== "EXPLICIT_PRINTED_FIELDS_ONLY" ||
      root.referenceValuePolicy !== "EPHEMERAL_UI_ONLY" ||
      root.persistencePolicy !== "DO_NOT_PERSIST" ||
      root.networkPolicy !== "NO_NETWORK" ||
      root.vtoPolicy !== "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT" ||
      root.dateMeaningPolicy !== "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT" ||
      root.deadlinePolicy !== "NOT_CALCULATED" ||
      root.calculatedDeadline !== null ||
      root.legalRuleStatus !== "NOT_APPLIED" ||
      root.retainedSourceContent !== "NONE" ||
      root.requiresHumanReview !== true ||
      root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
    ) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }

    const referenceFacts = snapshotArray(
      root.referenceFacts,
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxReferenceDetections,
    ).map((item) => parseReferenceFact(item, maxPageNumber));
    const printedDateFacts = snapshotArray(
      root.printedDateFacts,
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxPrintedDateFacts,
    ).map((item) => parseDateFact(item, maxPageNumber));
    const issues = snapshotArray(
      root.issues,
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxIssues,
    ).map((item) => parseIssue(item, maxPageNumber));
    const outcome = root.outcome as AeatEnforcementExplicitFieldsOutcomeV1;
    const status = root.status as AeatEnforcementExplicitFieldsV2["status"];
    const documentType = root.documentType as AeatEnforcementExplicitFieldsV2["documentType"];
    assertCanonicalKinds(
      referenceFacts.map((item) => item.kind),
      REFERENCE_KINDS,
    );
    assertCanonicalKinds(
      printedDateFacts.map((item) => item.kind),
      DATE_KINDS,
    );
    const totalOccurrences = [...referenceFacts, ...printedDateFacts].reduce(
      (total, item) => total + item.occurrenceCount,
      0,
    );
    if (
      totalOccurrences >
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxOccurrencesTotal
    ) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    assertResultSemantics(
      documentType,
      status,
      outcome,
      referenceFacts,
      printedDateFacts,
      issues,
    );
    return freezeResult({
      documentType,
      status,
      outcome,
      referenceFacts,
      printedDateFacts,
      issues,
    });
  } catch {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
}

class AeatEnforcementExplicitFieldsV2Error extends Error {
  constructor() {
    super("INVALID_AEAT_ENFORCEMENT_EXPLICIT_FIELDS_V2");
    this.name = "AeatEnforcementExplicitFieldsV2Error";
  }
}

function scanPrintedValues(input: BoundedDocumentInput): {
  readonly observations: readonly PrintedObservation[];
  readonly ambiguity: AeatEnforcementExplicitFieldIssueV1 | null;
} {
  const observations: PrintedObservation[] = [];
  const printedValues = new Map<
    AeatEnforcementExplicitFieldKindV1,
    Set<string>
  >();
  const pagesByKind = new Map<
    AeatEnforcementExplicitFieldKindV1,
    Set<number>
  >();
  let observedLines = 0;
  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const lines = page.text.split(LINE_SEPARATOR);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      assertNotAborted(input.signal);
      observedLines += 1;
      if (
        observedLines >
        AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxObservedLines
      ) {
        throw new AeatEnforcementExplicitFieldsV2Error();
      }
      const rawLine = lines[lineIndex] ?? "";
      if (
        rawLine.length >
        AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxLineCharacters
      ) {
        throw new AeatEnforcementExplicitFieldsV2Error();
      }
      const matched = matchClosedField(rawLine);
      if (!matched) continue;
      let printedValue = matched.remainder;
      if (printedValue.length === 0) {
        const immediate = findImmediateValue(lines, lineIndex);
        if (immediate.state === "BLOCKED") {
          throw new AeatEnforcementExplicitFieldsV2Error();
        }
        if (immediate.state === "NONE") continue;
        printedValue = immediate.value;
        lineIndex = immediate.lineIndex;
        observedLines += 1;
      }
      const normalized = validatePrintedValue(matched.definition.kind, printedValue);
      if (normalized === null) {
        throw new AeatEnforcementExplicitFieldsV2Error();
      }
      const values = printedValues.get(matched.definition.kind) ?? new Set();
      values.add(normalized);
      printedValues.set(matched.definition.kind, values);
      const pages = pagesByKind.get(matched.definition.kind) ?? new Set();
      pages.add(page.pageNumber);
      pagesByKind.set(matched.definition.kind, pages);
      observations.push({
        kind: matched.definition.kind,
        printedValue: normalized,
        pageNumber: page.pageNumber,
      });
      if (values.size > 1) {
        const code = REFERENCE_KIND_SET.has(matched.definition.kind)
          ? "MULTIPLE_DISTINCT_REFERENCE_VALUES"
          : "MULTIPLE_DISTINCT_PRINTED_DATES";
        return Object.freeze({
          observations: Object.freeze([]),
          ambiguity: freezeIssue({
            code,
            fieldKind: matched.definition.kind,
            pageNumbers: [...pages],
          }),
        });
      }
    }
  }
  assertNotAborted(input.signal);
  return Object.freeze({
    observations: Object.freeze(observations.map((item) => Object.freeze(item))),
    ambiguity: null,
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
    AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxLineCharacters
  ) {
    return { state: "BLOCKED" };
  }
  const token = rawLine.trim();
  if (token.length === 0 || matchClosedField(rawLine)) return { state: "NONE" };
  return { state: "FOUND", value: token, lineIndex };
}

function validatePrintedValue(
  kind: AeatEnforcementExplicitFieldKindV1,
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  if (REFERENCE_KIND_SET.has(kind)) {
    return token.length > 0 &&
      token.length <=
        AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxReferenceTokenCharacters &&
      REFERENCE_TOKEN.test(token)
      ? token
      : null;
  }
  return parseCalendarDate(token) === null ? null : token;
}

function parseReferenceFact(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementReferenceFactV2 {
  const item = snapshotRecord(value, REFERENCE_KEYS);
  if (!REFERENCE_KIND_SET.has(item.kind as AeatEnforcementExplicitFieldKindV1)) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const kind = item.kind as AeatEnforcementReferenceKindV1;
  const printedValue = validatePrintedValue(kind, item.printedValue);
  const occurrenceCount = parseOccurrenceCount(item.occurrenceCount);
  const pageNumbers = parsePageNumbers(item.pageNumbers, maxPageNumber, false);
  const definition = REFERENCE_DEFINITIONS.find((entry) => entry.kind === kind);
  if (
    printedValue === null ||
    !definition ||
    pageNumbers.length > occurrenceCount ||
    item.evidenceLabel !== definition.evidenceLabel ||
    item.extractionMethod !== "RULE" ||
    item.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
    item.valueDisclosure !== "EPHEMERAL_UI_ONLY" ||
    item.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  return Object.freeze({
    kind,
    printedValue,
    occurrenceCount,
    pageNumbers,
    evidenceLabel: definition.evidenceLabel,
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseDateFact(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementPrintedDateFactV2 {
  const item = snapshotRecord(value, DATE_KEYS);
  if (!DATE_KIND_SET.has(item.kind as AeatEnforcementExplicitFieldKindV1)) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const kind = item.kind as AeatEnforcementPrintedDateKindV1;
  const printedValue =
    typeof item.printedValue === "string" ? item.printedValue : "";
  const calendarDate = parseCalendarDate(printedValue);
  const occurrenceCount = parseOccurrenceCount(item.occurrenceCount);
  const pageNumbers = parsePageNumbers(item.pageNumbers, maxPageNumber, false);
  const definition = DATE_DEFINITIONS.find((entry) => entry.kind === kind);
  if (
    calendarDate === null ||
    item.calendarDate !== calendarDate ||
    !definition ||
    pageNumbers.length > occurrenceCount ||
    item.evidenceLabel !== definition.evidenceLabel ||
    item.extractionMethod !== "RULE" ||
    item.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
    item.dateMeaning !== "PRINTED_LABEL_ONLY" ||
    item.legalEffect !== "NOT_DETERMINED" ||
    item.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  return Object.freeze({
    kind,
    printedValue,
    calendarDate,
    occurrenceCount,
    pageNumbers,
    evidenceLabel: definition.evidenceLabel,
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    dateMeaning: "PRINTED_LABEL_ONLY",
    legalEffect: "NOT_DETERMINED",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseIssue(
  value: unknown,
  maxPageNumber: number,
): AeatEnforcementExplicitFieldIssueV1 {
  const item = snapshotRecord(value, ISSUE_KEYS);
  if (
    !ISSUE_CODES.has(item.code as AeatEnforcementExplicitFieldIssueCodeV1) ||
    (item.fieldKind !== null &&
      !ALL_FIELD_KIND_SET.has(item.fieldKind as AeatEnforcementExplicitFieldKindV1))
  ) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const code = item.code as AeatEnforcementExplicitFieldIssueCodeV1;
  const fieldKind = item.fieldKind as AeatEnforcementExplicitFieldKindV1 | null;
  const allowEmpty =
    code === "FAMILY_GATE_NOT_SATISFIED" ||
    code === "NO_CLOSED_LABEL_MATCH" ||
    code === "UNSUPPORTED_TEXT_STATE";
  const pageNumbers = parsePageNumbers(item.pageNumbers, maxPageNumber, allowEmpty);
  assertIssueShape(code, fieldKind, pageNumbers);
  return freezeIssue({ code, fieldKind, pageNumbers });
}

function assertResultSemantics(
  documentType: AeatEnforcementExplicitFieldsV2["documentType"],
  status: AeatEnforcementExplicitFieldsV2["status"],
  outcome: AeatEnforcementExplicitFieldsOutcomeV1,
  references: readonly AeatEnforcementReferenceFactV2[],
  dates: readonly AeatEnforcementPrintedDateFactV2[],
  issues: readonly AeatEnforcementExplicitFieldIssueV1[],
): void {
  const factKinds = new Set<AeatEnforcementExplicitFieldKindV1>([
    ...references.map((item) => item.kind),
    ...dates.map((item) => item.kind),
  ]);
  const issueKinds = new Map<
    AeatEnforcementExplicitFieldKindV1,
    AeatEnforcementExplicitFieldIssueV1
  >();
  let previousIssueIndex = -1;
  for (const item of issues) {
    if (item.fieldKind === null) continue;
    const index = ALL_FIELD_KINDS.indexOf(item.fieldKind);
    if (index <= previousIssueIndex || issueKinds.has(item.fieldKind)) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    previousIssueIndex = index;
    issueKinds.set(item.fieldKind, item);
  }
  const onlyPendingIssues = issues.every(
    (item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" ||
      item.code === "LABEL_WITHOUT_VALUE",
  );
  const completeCoverage = ALL_FIELD_KINDS.every((kind) =>
    factKinds.has(kind) ? !issueKinds.has(kind) : issueKinds.has(kind),
  );
  const factCount = references.length + dates.length;
  const blockingCode = issues[0]?.code;
  const validRecognized =
    documentType === "AEAT_ENFORCEMENT_ORDER" &&
    ((outcome === "FACTS_AVAILABLE" &&
      status === "REVIEW_REQUIRED" &&
      factCount > 0 &&
      onlyPendingIssues &&
      completeCoverage) ||
      (outcome === "INFORMATION_PENDING" &&
        status === "INFORMATION_PENDING" &&
        factCount === 0 &&
        issues.length === ALL_FIELD_KINDS.length &&
        onlyPendingIssues &&
        completeCoverage) ||
      (outcome === "AMBIGUOUS" &&
        status === "REVIEW_REQUIRED" &&
        factCount === 0 &&
        issues.length === 1 &&
        (blockingCode === "MULTIPLE_DISTINCT_REFERENCE_VALUES" ||
          blockingCode === "MULTIPLE_DISTINCT_PRINTED_DATES")) ||
      (outcome === "PROCESSING_BLOCKED" &&
        status === "REVIEW_REQUIRED" &&
        factCount === 0 &&
        issues.length === 1 &&
        (blockingCode === "INVALID_REFERENCE_VALUE" ||
          blockingCode === "INVALID_PRINTED_DATE" ||
          blockingCode === "FIELD_SCAN_LIMIT_EXCEEDED")));
  const validUnrecognized =
    documentType === null &&
    factCount === 0 &&
    issues.length === 1 &&
    issues[0]?.fieldKind === null &&
    ((outcome === "INFORMATION_PENDING" &&
      status === "INFORMATION_PENDING" &&
      blockingCode === "FAMILY_GATE_NOT_SATISFIED") ||
      (outcome === "PROCESSING_BLOCKED" &&
        status === "REVIEW_REQUIRED" &&
        (blockingCode === "FAMILY_GATE_NOT_SATISFIED" ||
          blockingCode === "UNSUPPORTED_TEXT_STATE")));
  if (!validRecognized && !validUnrecognized) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
}

function assertIssueShape(
  code: AeatEnforcementExplicitFieldIssueCodeV1,
  fieldKind: AeatEnforcementExplicitFieldKindV1 | null,
  pageNumbers: readonly number[],
): void {
  const referenceKind =
    fieldKind !== null && REFERENCE_KIND_SET.has(fieldKind);
  const dateKind = fieldKind !== null && DATE_KIND_SET.has(fieldKind);
  const valid =
    ((code === "FAMILY_GATE_NOT_SATISFIED" ||
      code === "UNSUPPORTED_TEXT_STATE") &&
      fieldKind === null &&
      pageNumbers.length === 0) ||
    (code === "NO_CLOSED_LABEL_MATCH" &&
      fieldKind !== null &&
      pageNumbers.length === 0) ||
    (code === "LABEL_WITHOUT_VALUE" &&
      fieldKind !== null &&
      pageNumbers.length > 0) ||
    ((code === "INVALID_REFERENCE_VALUE" ||
      code === "MULTIPLE_DISTINCT_REFERENCE_VALUES") &&
      referenceKind &&
      pageNumbers.length > 0) ||
    ((code === "INVALID_PRINTED_DATE" ||
      code === "MULTIPLE_DISTINCT_PRINTED_DATES") &&
      dateKind &&
      pageNumbers.length > 0) ||
    (code === "FIELD_SCAN_LIMIT_EXCEEDED" && pageNumbers.length > 0);
  if (!valid) throw new AeatEnforcementExplicitFieldsV2Error();
}

function parseOccurrenceCount(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) >
      AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxOccurrencesPerKind
  ) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  return Number(value);
}

function parsePageNumbers(
  value: unknown,
  maxPageNumber: number,
  allowEmpty: boolean,
): readonly number[] {
  const pages = snapshotArray(
    value,
    AEAT_ENFORCEMENT_EXPLICIT_FIELDS_LIMITS_V2.maxPageNumbersPerItem,
  );
  if (!allowEmpty && pages.length === 0) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  let previous = 0;
  const result = pages.map((page) => {
    if (
      !Number.isSafeInteger(page) ||
      Number(page) < 1 ||
      Number(page) > maxPageNumber ||
      Number(page) <= previous
    ) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    previous = Number(page);
    return Number(page);
  });
  return Object.freeze(result);
}

function parseCalendarDate(value: string): string | null {
  const matched = PRINTED_DATE.exec(value);
  if (!matched) return null;
  const day = Number(matched[1]);
  const month = Number(matched[3]);
  const year = Number(matched[4]);
  if (
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
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function snapshotRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    result[key] = descriptor.value;
  }
  return result;
}

function snapshotArray(value: unknown, limit: number): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
  if (!Number.isSafeInteger(length) || Number(length) < 0 || Number(length) > limit) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const numericLength = Number(length);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== numericLength + 1 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (key !== "length" &&
          (!/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= numericLength)),
    )
  ) {
    throw new AeatEnforcementExplicitFieldsV2Error();
  }
  const result: unknown[] = [];
  for (let index = 0; index < numericLength; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) {
      throw new AeatEnforcementExplicitFieldsV2Error();
    }
    result.push(descriptor.value);
  }
  return result;
}

function assertCanonicalKinds<Kind extends string>(
  values: readonly Kind[],
  canonical: readonly Kind[],
): void {
  let previous = -1;
  for (const value of values) {
    const index = canonical.indexOf(value);
    if (index <= previous) throw new AeatEnforcementExplicitFieldsV2Error();
    previous = index;
  }
}

function freezeIssue(
  value: AeatEnforcementExplicitFieldIssueV1,
): AeatEnforcementExplicitFieldIssueV1 {
  return Object.freeze({
    code: value.code,
    fieldKind: value.fieldKind,
    pageNumbers: Object.freeze(
      [...new Set(value.pageNumbers)].sort((left, right) => left - right),
    ),
  });
}

function freezeResult(input: {
  readonly documentType?: "AEAT_ENFORCEMENT_ORDER" | null;
  readonly status: AeatEnforcementExplicitFieldsV2["status"];
  readonly outcome: AeatEnforcementExplicitFieldsOutcomeV1;
  readonly referenceFacts: readonly AeatEnforcementReferenceFactV2[];
  readonly printedDateFacts: readonly AeatEnforcementPrintedDateFactV2[];
  readonly issues: readonly AeatEnforcementExplicitFieldIssueV1[];
}): AeatEnforcementExplicitFieldsV2 {
  return Object.freeze({
    schemaVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_SCHEMA_VERSION_V2,
    engineId: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_ID_V2,
    engineVersion: AEAT_ENFORCEMENT_EXPLICIT_FIELDS_ENGINE_VERSION_V2,
    documentType:
      input.documentType === undefined
        ? "AEAT_ENFORCEMENT_ORDER"
        : input.documentType,
    status: input.status,
    outcome: input.outcome,
    referenceFacts: Object.freeze(
      input.referenceFacts.map((item) =>
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
    issues: Object.freeze(input.issues.map(freezeIssue)),
    semanticPolicy: "EXPLICIT_PRINTED_FIELDS_ONLY",
    referenceValuePolicy: "EPHEMERAL_UI_ONLY",
    persistencePolicy: "DO_NOT_PERSIST",
    networkPolicy: "NO_NETWORK",
    vtoPolicy: "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT",
    dateMeaningPolicy: "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT",
    deadlinePolicy: "NOT_CALCULATED",
    calculatedDeadline: null,
    legalRuleStatus: "NOT_APPLIED",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}
