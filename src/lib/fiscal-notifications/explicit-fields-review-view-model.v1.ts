import type {
  AeatEnforcementExplicitFieldKindV1,
  AeatEnforcementExplicitFieldIssueCodeV1,
  AeatEnforcementExplicitFieldsV1,
  AeatEnforcementPrintedDateKindV1,
  AeatEnforcementReferenceKindV1,
} from "./aeat-enforcement-explicit-fields.v1";

export const EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_SCHEMA_VERSION_V1 = 1 as const;
export const EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_VERSION_V1 = "1.0.0" as const;
const EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_BRAND_V1: unique symbol = Symbol(
  "explicit-fields-review-view-model.v1",
);

export type ExplicitFieldsReviewStateV1 =
  | "FACTS"
  | "PENDING"
  | "AMBIGUOUS"
  | "BLOCKED";

export type ExplicitFieldsReviewStateLabelV1 =
  | "Datos impresos detectados"
  | "Información pendiente"
  | "Lectura ambigua"
  | "Lectura bloqueada";

export type ExplicitFieldsReviewSummaryV1 =
  | "Se han detectado categorías de referencia con sus valores ocultos y/o fechas impresas. Contrástalas con el PDF original."
  | "No se han encontrado campos bajo las etiquetas cubiertas. La ausencia no confirma que el documento no los contenga."
  | "Aparecen valores distintos para una misma categoría. No mostramos ninguna referencia ni fecha hasta que una persona revise el documento."
  | "El formato no supera la validación estricta. No mostramos datos parciales ni corregimos valores automáticamente.";

export type ExplicitFieldsReviewCategoryLabelV1 =
  | "Clave de liquidación"
  | "Referencia del documento"
  | "Justificante de pago"
  | "Código seguro de verificación (CSV)"
  | "Vto. (identificador impreso)";

export type ExplicitFieldsReviewDateLabelV1 =
  | "Fecha de emisión impresa"
  | "Fecha de firma impresa"
  | "Fin del período voluntario impreso";

export type ExplicitFieldsReviewCalendarDateV1 =
  `${number}-${number}-${number}`;
export type ExplicitFieldsReviewDisplayDateV1 =
  `${number}/${number}/${number}`;

export interface ExplicitFieldsReviewCategoryV1 {
  readonly kind: AeatEnforcementReferenceKindV1;
  readonly label: ExplicitFieldsReviewCategoryLabelV1;
  readonly detectionLabel: "Detectada · valor oculto";
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
}

export interface ExplicitFieldsReviewDateV1 {
  readonly kind: AeatEnforcementPrintedDateKindV1;
  readonly label: ExplicitFieldsReviewDateLabelV1;
  readonly dateTime: ExplicitFieldsReviewCalendarDateV1;
  readonly displayDate: ExplicitFieldsReviewDisplayDateV1;
  readonly meaningLabel: "Fecha impresa · sin efecto jurídico determinado";
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
}

export interface ExplicitFieldsReviewViewModelV1 {
  readonly [EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_BRAND_V1]: true;
  readonly schemaVersion: 1;
  readonly viewModelVersion: "1.0.0";
  readonly state: ExplicitFieldsReviewStateV1;
  readonly stateLabel: ExplicitFieldsReviewStateLabelV1;
  readonly summary: ExplicitFieldsReviewSummaryV1;
  readonly categories: readonly ExplicitFieldsReviewCategoryV1[];
  readonly dates: readonly ExplicitFieldsReviewDateV1[];
  readonly warnings: readonly [
    "Las fechas impresas no confirman la fecha de notificación ni calculan un vencimiento.",
    "«Vto.» se trata como un identificador impreso, no como una fecha ni una cuota.",
  ];
  readonly ephemeralNotice: "Estos datos son efímeros: desaparecen al salir y no se incluyen en la ficha técnica ni en el historial local.";
  readonly referenceDisclosure: "CATEGORY_ONLY_VALUE_HIDDEN";
  readonly dateMeaning: "PRINTED_ONLY_NO_LEGAL_EFFECT";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export class ExplicitFieldsReviewViewModelError extends Error {
  constructor() {
    super("INVALID_EXPLICIT_FIELDS_REVIEW_INPUT");
    this.name = "ExplicitFieldsReviewViewModelError";
  }
}

const ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "referenceDetections",
  "printedDateFacts",
  "issues",
  "semanticPolicy",
  "referenceValuePolicy",
  "vtoPolicy",
  "dateMeaningPolicy",
  "deadlinePolicy",
  "calculatedDeadline",
  "legalRuleStatus",
  "retainedReferenceValues",
  "retainedSourceContent",
  "requiresHumanReview",
  "materializationPolicy",
]);
const REFERENCE_KEYS = new Set([
  "kind",
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

const REFERENCE_KINDS = [
  "LIQUIDATION_KEY",
  "DOCUMENT_REFERENCE",
  "PAYMENT_JUSTIFICANTE",
  "CSV",
  "VTO_RAW",
] as const satisfies readonly AeatEnforcementReferenceKindV1[];
const DATE_KINDS = [
  "PRINTED_ISSUE_DATE",
  "PRINTED_SIGNATURE_DATE",
  "PRINTED_VOLUNTARY_PERIOD_END_DATE",
] as const satisfies readonly AeatEnforcementPrintedDateKindV1[];
const ALL_KINDS = [
  ...REFERENCE_KINDS,
  ...DATE_KINDS,
] as const satisfies readonly AeatEnforcementExplicitFieldKindV1[];
const REFERENCE_KIND_SET = new Set<AeatEnforcementReferenceKindV1>(
  REFERENCE_KINDS,
);
const DATE_KIND_SET = new Set<AeatEnforcementPrintedDateKindV1>(DATE_KINDS);
const ALL_KIND_SET = new Set<AeatEnforcementExplicitFieldKindV1>(ALL_KINDS);

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
const OUTCOMES = new Set<AeatEnforcementExplicitFieldsV1["outcome"]>([
  "FACTS_AVAILABLE",
  "INFORMATION_PENDING",
  "AMBIGUOUS",
  "PROCESSING_BLOCKED",
]);

const REFERENCE_LABELS: Readonly<
  Record<AeatEnforcementReferenceKindV1, ExplicitFieldsReviewCategoryLabelV1>
> = {
  LIQUIDATION_KEY: "Clave de liquidación",
  DOCUMENT_REFERENCE: "Referencia del documento",
  PAYMENT_JUSTIFICANTE: "Justificante de pago",
  CSV: "Código seguro de verificación (CSV)",
  VTO_RAW: "Vto. (identificador impreso)",
};
const REFERENCE_EVIDENCE_LABELS = {
  LIQUIDATION_KEY: "LIQUIDATION_KEY_LABEL",
  DOCUMENT_REFERENCE: "DOCUMENT_REFERENCE_LABEL",
  PAYMENT_JUSTIFICANTE: "PAYMENT_JUSTIFICANTE_LABEL",
  CSV: "CSV_LABEL",
  VTO_RAW: "VTO_RAW_LABEL",
} as const;

const DATE_LABELS: Readonly<
  Record<AeatEnforcementPrintedDateKindV1, ExplicitFieldsReviewDateLabelV1>
> = {
  PRINTED_ISSUE_DATE: "Fecha de emisión impresa",
  PRINTED_SIGNATURE_DATE: "Fecha de firma impresa",
  PRINTED_VOLUNTARY_PERIOD_END_DATE:
    "Fin del período voluntario impreso",
};
const DATE_EVIDENCE_LABELS = {
  PRINTED_ISSUE_DATE: "PRINTED_ISSUE_DATE_LABEL",
  PRINTED_SIGNATURE_DATE: "PRINTED_SIGNATURE_DATE_LABEL",
  PRINTED_VOLUNTARY_PERIOD_END_DATE:
    "PRINTED_VOLUNTARY_PERIOD_END_DATE_LABEL",
} as const;

const COPY: Readonly<
  Record<
    ExplicitFieldsReviewStateV1,
    {
      readonly label: ExplicitFieldsReviewStateLabelV1;
      readonly summary: ExplicitFieldsReviewSummaryV1;
    }
  >
> = {
  FACTS: {
    label: "Datos impresos detectados",
    summary:
      "Se han detectado categorías de referencia con sus valores ocultos y/o fechas impresas. Contrástalas con el PDF original.",
  },
  PENDING: {
    label: "Información pendiente",
    summary:
      "No se han encontrado campos bajo las etiquetas cubiertas. La ausencia no confirma que el documento no los contenga.",
  },
  AMBIGUOUS: {
    label: "Lectura ambigua",
    summary:
      "Aparecen valores distintos para una misma categoría. No mostramos ninguna referencia ni fecha hasta que una persona revise el documento.",
  },
  BLOCKED: {
    label: "Lectura bloqueada",
    summary:
      "El formato no supera la validación estricta. No mostramos datos parciales ni corregimos valores automáticamente.",
  },
};

const WARNINGS = Object.freeze([
  "Las fechas impresas no confirman la fecha de notificación ni calculan un vencimiento.",
  "«Vto.» se trata como un identificador impreso, no como una fecha ni una cuota.",
] as const);

export function projectExplicitFieldsReviewViewModelV1(
  input: unknown,
): ExplicitFieldsReviewViewModelV1 {
  try {
    const parsed = validateInput(input);
    const state = stateForOutcome(parsed.outcome);
    if (
      state !== "FACTS" &&
      (parsed.referenceDetections.length > 0 ||
        parsed.printedDateFacts.length > 0)
    ) {
      throw new ExplicitFieldsReviewViewModelError();
    }
    if (
      state === "FACTS" &&
      parsed.referenceDetections.length + parsed.printedDateFacts.length === 0
    ) {
      throw new ExplicitFieldsReviewViewModelError();
    }

    const categories =
      state === "FACTS"
        ? parsed.referenceDetections.map((item) =>
            Object.freeze({
              kind: item.kind,
              label: REFERENCE_LABELS[item.kind],
              detectionLabel: "Detectada · valor oculto" as const,
              occurrenceCount: item.occurrenceCount,
              pageNumbers: Object.freeze([...item.pageNumbers]),
            }),
          )
        : [];
    const dates =
      state === "FACTS"
        ? parsed.printedDateFacts.map((item) =>
            Object.freeze({
              kind: item.kind,
              label: DATE_LABELS[item.kind],
              dateTime: item.calendarDate as ExplicitFieldsReviewCalendarDateV1,
              displayDate: displayDate(item.calendarDate),
              meaningLabel:
                "Fecha impresa · sin efecto jurídico determinado" as const,
              occurrenceCount: item.occurrenceCount,
              pageNumbers: Object.freeze([...item.pageNumbers]),
            }),
          )
        : [];
    const copy = COPY[state];
    return Object.freeze({
      [EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_BRAND_V1]: true as const,
      schemaVersion: EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_SCHEMA_VERSION_V1,
      viewModelVersion: EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_VERSION_V1,
      state,
      stateLabel: copy.label,
      summary: copy.summary,
      categories: Object.freeze(categories),
      dates: Object.freeze(dates),
      warnings: WARNINGS,
      ephemeralNotice:
        "Estos datos son efímeros: desaparecen al salir y no se incluyen en la ficha técnica ni en el historial local.",
      referenceDisclosure: "CATEGORY_ONLY_VALUE_HIDDEN",
      dateMeaning: "PRINTED_ONLY_NO_LEGAL_EFFECT",
      persistencePolicy: "DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  } catch {
    throw new ExplicitFieldsReviewViewModelError();
  }
}

function validateInput(value: unknown): AeatEnforcementExplicitFieldsV1 {
  const root = snapshotRecord(value, ROOT_KEYS);
  if (
    root.schemaVersion !== 1 ||
    root.engineId !== "aeat-enforcement-explicit-fields" ||
    root.engineVersion !== "1.0.0" ||
    root.documentType !== "AEAT_ENFORCEMENT_ORDER" ||
    (root.status !== "REVIEW_REQUIRED" &&
      root.status !== "INFORMATION_PENDING") ||
    !OUTCOMES.has(root.outcome as AeatEnforcementExplicitFieldsV1["outcome"]) ||
    root.semanticPolicy !== "EXPLICIT_PRINTED_FIELDS_ONLY" ||
    root.referenceValuePolicy !== "REDACT_BEFORE_WORKER_RESPONSE" ||
    root.vtoPolicy !== "RAW_IDENTIFIER_NOT_DATE_OR_INSTALLMENT" ||
    root.dateMeaningPolicy !== "PRINTED_LABEL_ONLY_NO_LEGAL_EFFECT" ||
    root.deadlinePolicy !== "NOT_CALCULATED" ||
    root.calculatedDeadline !== null ||
    root.legalRuleStatus !== "NOT_APPLIED" ||
    root.retainedReferenceValues !== "NONE" ||
    root.retainedSourceContent !== "NONE" ||
    root.requiresHumanReview !== true ||
    root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
  ) {
    throw new ExplicitFieldsReviewViewModelError();
  }

  const references = snapshotArray(root.referenceDetections, 5).map(
    validateReference,
  );
  const dates = snapshotArray(root.printedDateFacts, 3).map(validateDate);
  const issues = snapshotArray(root.issues, 8).map(validateIssue);
  const outcome = root.outcome as AeatEnforcementExplicitFieldsV1["outcome"];
  const validStatus =
    ((outcome === "FACTS_AVAILABLE" ||
      outcome === "AMBIGUOUS" ||
      outcome === "PROCESSING_BLOCKED") &&
      root.status === "REVIEW_REQUIRED") ||
    (outcome === "INFORMATION_PENDING" &&
      root.status === "INFORMATION_PENDING");
  const totalOccurrences = [...references, ...dates].reduce(
    (total, item) => total + item.occurrenceCount,
    0,
  );
  if (!validStatus || totalOccurrences > 128) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  assertCanonicalKinds(references.map((item) => item.kind), REFERENCE_KINDS);
  assertCanonicalKinds(dates.map((item) => item.kind), DATE_KINDS);
  assertExplicitSemantics(
    root.status as AeatEnforcementExplicitFieldsV1["status"],
    outcome,
    references,
    dates,
    issues,
  );

  return Object.freeze({
    schemaVersion: 1,
    engineId: "aeat-enforcement-explicit-fields",
    engineVersion: "1.0.0",
    documentType: "AEAT_ENFORCEMENT_ORDER",
    status: root.status as AeatEnforcementExplicitFieldsV1["status"],
    outcome,
    referenceDetections: Object.freeze(references),
    printedDateFacts: Object.freeze(dates),
    issues: Object.freeze(issues),
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

function validateReference(value: unknown) {
  const item = snapshotRecord(value, REFERENCE_KEYS);
  if (!REFERENCE_KIND_SET.has(item.kind as AeatEnforcementReferenceKindV1)) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const kind = item.kind as AeatEnforcementReferenceKindV1;
  const occurrenceCount = validOccurrenceCount(item.occurrenceCount);
  const pageNumbers = validPageNumbers(item.pageNumbers, false);
  if (
    pageNumbers.length > occurrenceCount ||
    item.evidenceLabel !== REFERENCE_EVIDENCE_LABELS[kind] ||
    item.extractionMethod !== "RULE" ||
    item.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
    item.valueDisclosure !== "REDACTED_IN_WORKER" ||
    item.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  return Object.freeze({
    kind,
    occurrenceCount,
    pageNumbers,
    evidenceLabel: REFERENCE_EVIDENCE_LABELS[kind],
    extractionMethod: "RULE" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    valueDisclosure: "REDACTED_IN_WORKER" as const,
    reviewStatus: "REVIEW_REQUIRED" as const,
  });
}

function validateDate(value: unknown) {
  const item = snapshotRecord(value, DATE_KEYS);
  if (!DATE_KIND_SET.has(item.kind as AeatEnforcementPrintedDateKindV1)) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const kind = item.kind as AeatEnforcementPrintedDateKindV1;
  if (!isCalendarDate(item.calendarDate)) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const occurrenceCount = validOccurrenceCount(item.occurrenceCount);
  const pageNumbers = validPageNumbers(item.pageNumbers, false);
  if (
    pageNumbers.length > occurrenceCount ||
    item.evidenceLabel !== DATE_EVIDENCE_LABELS[kind] ||
    item.extractionMethod !== "RULE" ||
    item.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
    item.dateMeaning !== "PRINTED_LABEL_ONLY" ||
    item.legalEffect !== "NOT_DETERMINED" ||
    item.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  return Object.freeze({
    kind,
    calendarDate: item.calendarDate as string,
    occurrenceCount,
    pageNumbers,
    evidenceLabel: DATE_EVIDENCE_LABELS[kind],
    extractionMethod: "RULE" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    dateMeaning: "PRINTED_LABEL_ONLY" as const,
    legalEffect: "NOT_DETERMINED" as const,
    reviewStatus: "REVIEW_REQUIRED" as const,
  });
}

function validateIssue(value: unknown) {
  const item = snapshotRecord(value, ISSUE_KEYS);
  if (
    !ISSUE_CODES.has(item.code as AeatEnforcementExplicitFieldIssueCodeV1) ||
    (item.fieldKind !== null &&
      !ALL_KIND_SET.has(item.fieldKind as AeatEnforcementExplicitFieldKindV1))
  ) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const code = item.code as AeatEnforcementExplicitFieldIssueCodeV1;
  const fieldKind =
    item.fieldKind as AeatEnforcementExplicitFieldKindV1 | null;
  const pageNumbers = validPageNumbers(item.pageNumbers, true);
  assertIssueShape(code, fieldKind, pageNumbers);
  return Object.freeze({ code, fieldKind, pageNumbers });
}

function assertIssueShape(
  code: AeatEnforcementExplicitFieldIssueCodeV1,
  fieldKind: AeatEnforcementExplicitFieldKindV1 | null,
  pageNumbers: readonly number[],
): void {
  const referenceKind =
    fieldKind !== null &&
    REFERENCE_KIND_SET.has(fieldKind as AeatEnforcementReferenceKindV1);
  const dateKind =
    fieldKind !== null &&
    DATE_KIND_SET.has(fieldKind as AeatEnforcementPrintedDateKindV1);
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
  if (!valid) throw new ExplicitFieldsReviewViewModelError();
}

function assertExplicitSemantics(
  status: AeatEnforcementExplicitFieldsV1["status"],
  outcome: AeatEnforcementExplicitFieldsV1["outcome"],
  references: AeatEnforcementExplicitFieldsV1["referenceDetections"],
  dates: AeatEnforcementExplicitFieldsV1["printedDateFacts"],
  issues: AeatEnforcementExplicitFieldsV1["issues"],
): void {
  const facts = new Set<AeatEnforcementExplicitFieldKindV1>([
    ...references.map((item) => item.kind),
    ...dates.map((item) => item.kind),
  ]);
  const issueByKind = new Map<
    AeatEnforcementExplicitFieldKindV1,
    AeatEnforcementExplicitFieldsV1["issues"][number]
  >();
  let previousIssueIndex = -1;
  for (const item of issues) {
    if (item.fieldKind === null) {
      if (issues.length !== 1) throw new ExplicitFieldsReviewViewModelError();
      continue;
    }
    const index = ALL_KINDS.indexOf(item.fieldKind);
    if (index <= previousIssueIndex || issueByKind.has(item.fieldKind)) {
      throw new ExplicitFieldsReviewViewModelError();
    }
    previousIssueIndex = index;
    issueByKind.set(item.fieldKind, item);
  }
  const onlyPendingIssues = issues.every(
    (item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" ||
      item.code === "LABEL_WITHOUT_VALUE",
  );
  const completeCoverage = ALL_KINDS.every((kind) =>
    facts.has(kind) ? !issueByKind.has(kind) : issueByKind.has(kind),
  );
  const factCount = references.length + dates.length;
  const blockingCode = issues[0]?.code;
  const valid =
    (outcome === "FACTS_AVAILABLE" &&
      status === "REVIEW_REQUIRED" &&
      factCount > 0 &&
      onlyPendingIssues &&
      completeCoverage) ||
    (outcome === "INFORMATION_PENDING" &&
      status === "INFORMATION_PENDING" &&
      factCount === 0 &&
      issues.length === ALL_KINDS.length &&
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
        blockingCode === "FIELD_SCAN_LIMIT_EXCEEDED"));
  if (!valid) throw new ExplicitFieldsReviewViewModelError();
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
    throw new ExplicitFieldsReviewViewModelError();
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new ExplicitFieldsReviewViewModelError();
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new ExplicitFieldsReviewViewModelError();
    }
    result[key] = descriptor.value;
  }
  return result;
}

function snapshotArray(value: unknown, limit: number): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !lengthDescriptor ||
    !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    Number(lengthDescriptor.value) < 0 ||
    Number(lengthDescriptor.value) > limit
  ) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const length = Number(lengthDescriptor.value);
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== length + 1 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (key !== "length" &&
          (!/^(?:0|[1-9]\d*)$/u.test(key) || Number(key) >= length)),
    )
  ) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  const result: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor)) {
      throw new ExplicitFieldsReviewViewModelError();
    }
    result.push(descriptor.value);
  }
  return result;
}

function validOccurrenceCount(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 32) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  return Number(value);
}

function validPageNumbers(value: unknown, allowEmpty: boolean): readonly number[] {
  const pages = snapshotArray(value, 80);
  if (!allowEmpty && pages.length === 0) {
    throw new ExplicitFieldsReviewViewModelError();
  }
  let previous = 0;
  const result = pages.map((page) => {
    if (
      !Number.isSafeInteger(page) ||
      Number(page) < 1 ||
      Number(page) > 80 ||
      Number(page) <= previous
    ) {
      throw new ExplicitFieldsReviewViewModelError();
    }
    previous = Number(page);
    return Number(page);
  });
  return Object.freeze(result);
}

function assertCanonicalKinds<Kind extends string>(
  values: readonly Kind[],
  canonical: readonly Kind[],
): void {
  let previous = -1;
  for (const value of values) {
    const index = canonical.indexOf(value);
    if (index <= previous) throw new ExplicitFieldsReviewViewModelError();
    previous = index;
  }
}

function stateForOutcome(
  outcome: AeatEnforcementExplicitFieldsV1["outcome"],
): ExplicitFieldsReviewStateV1 {
  switch (outcome) {
    case "FACTS_AVAILABLE":
      return "FACTS";
    case "INFORMATION_PENDING":
      return "PENDING";
    case "AMBIGUOUS":
      return "AMBIGUOUS";
    case "PROCESSING_BLOCKED":
      return "BLOCKED";
  }
}

function displayDate(value: string): ExplicitFieldsReviewDisplayDateV1 {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}` as ExplicitFieldsReviewDisplayDateV1;
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const maxDay =
    month === 2
      ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
        ? 29
        : 28
      : month === 4 || month === 6 || month === 9 || month === 11
        ? 30
        : 31;
  return day <= maxDay;
}
