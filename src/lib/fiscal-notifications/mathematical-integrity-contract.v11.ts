import {
  AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11,
  AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
  AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11,
  type AeatMathematicalIntegrityAssertionTypeV11,
  type AeatMathematicalIntegrityStatusV11,
  type AeatMathematicalIntegrityValidationModeV11,
} from "./knowledge/mathematical-integrity-catalog.v11";
import { DOCUMENT_SEGMENT_TYPES_V1 } from "./extractor-core/document-segment.v1";

export const FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11 =
  "11.0.0" as const;

export const FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11 =
  Object.freeze({
    maxEvidence: 512,
    maxChecks: 512,
    maxOperandsPerCheck: 32,
    maxPagesPerEvidence: 256,
    maxValidatedRelationEvidence: 256,
    maxSafeMessageChars: 240,
    maxAmountCents: 100_000_000_000,
  } as const);

export type FiscalNotificationIntegritySourcePartV11 =
  (typeof DOCUMENT_SEGMENT_TYPES_V1)[number] | "MULTIPLE_PARTS";

export interface FiscalNotificationIntegrityEvidenceRefV11 {
  readonly evidenceId: string;
}

export interface FiscalNotificationIntegritySignedEvidenceRefV11 {
  readonly evidenceId: string;
  readonly sign: 1 | -1;
}

export type FiscalNotificationIntegrityCalculationV11 =
  | Readonly<{ readonly kind: "NONE" }>
  | Readonly<{
      readonly kind: "LINEAR_EQUALITY";
      readonly resultEvidenceId: string;
      readonly terms: readonly FiscalNotificationIntegritySignedEvidenceRefV11[];
    }>
  | Readonly<{
      readonly kind: "PERCENTAGE_EQUALITY";
      readonly resultEvidenceId: string;
      readonly baseEvidenceId: string;
      readonly rateBasisPoints: number;
    }>
  | Readonly<{
      readonly kind: "BASE_PLUS_PERCENTAGE";
      readonly resultEvidenceId: string;
      readonly baseEvidenceId: string;
      readonly rateBasisPoints: number;
    }>
  | Readonly<{
      readonly kind: "ZERO_EQUALITY";
      readonly resultEvidenceId: string;
    }>
  | Readonly<{
      readonly kind: "AMOUNT_ORDER";
      readonly leftEvidenceId: string;
      readonly operator: "LTE" | "GTE";
      readonly rightEvidenceId: string;
    }>
  | Readonly<{
      readonly kind: "DATE_ORDER";
      readonly leftEvidenceId: string;
      readonly operator: "LTE" | "GTE";
      readonly rightEvidenceId: string;
    }>
  | Readonly<{
      readonly kind: "AMOUNT_CHAIN";
      readonly evidenceIds: readonly string[];
    }>
  | Readonly<{
      readonly kind: "COUNT_EQUALITY";
      readonly resultEvidenceId: string;
      readonly terms: readonly FiscalNotificationIntegritySignedEvidenceRefV11[];
    }>;

export interface FiscalNotificationIntegrityNormalizedEvidenceV11 {
  readonly evidenceId: string;
  readonly sourceFieldFingerprint: `sha256:${string}`;
  readonly semantic:
    "MONEY" | "DATE" | "REFERENCE" | "STATUS" | "COUNT" | "OTHER";
  readonly canonicalType: string;
  readonly originalClassification: string;
  readonly amountCents: number | null;
  readonly dateValue: string | null;
  readonly countValue: number | null;
  readonly sign: "POSITIVE" | "NEGATIVE" | "UNSPECIFIED";
  readonly currency: "EUR" | null;
  readonly sourcePart: FiscalNotificationIntegritySourcePartV11;
  readonly pageNumbers: readonly number[];
  readonly assertionType: AeatMathematicalIntegrityAssertionTypeV11;
  readonly originalConfidence: number;
}

export interface FiscalNotificationMathematicalIntegrityCheckV11 {
  readonly ruleId: string;
  readonly checkKind: "ARITHMETIC" | "TEMPORAL" | "STRUCTURAL" | "RELATION_SUPPORT";
  readonly status: AeatMathematicalIntegrityStatusV11;
  readonly operands: readonly FiscalNotificationIntegrityEvidenceRefV11[];
  readonly expectedCents: number | null;
  readonly observedCents: number | null;
  readonly deltaCents: number | null;
  readonly toleranceCents: number;
  readonly calculation: FiscalNotificationIntegrityCalculationV11;
  readonly safeMessage: string;
}

export interface FiscalNotificationMathematicalIntegrityV11 {
  readonly schemaVersion: 11;
  readonly integrityVersion: typeof FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11;
  readonly catalogReleaseId: typeof AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11;
  readonly familyId: string;
  readonly archetypeId: string;
  readonly validationMode: AeatMathematicalIntegrityValidationModeV11;
  readonly status: AeatMathematicalIntegrityStatusV11;
  readonly passCount: 1 | 2;
  readonly automaticPassLimit: 2;
  readonly normalizedEvidence: readonly FiscalNotificationIntegrityNormalizedEvidenceV11[];
  readonly checks: readonly FiscalNotificationMathematicalIntegrityCheckV11[];
  readonly hardFailureCodes: readonly (
    | "IMPOSSIBLE_BASIC_PRINTED_SUM"
    | "INCOMPATIBLE_REFERENCE_OR_PART"
    | "DUPLICATED_PRINTED_ROW"
    | "PRIVATE_DATA_BOUNDARY_VIOLATION"
    | "WORKSPACE_IDENTITY_MISMATCH"
  )[];
  readonly persistenceDecision:
    | "ALLOW_CORE"
    | "ALLOW_CORE_WITH_WARNINGS"
    | "BLOCK_INCONSISTENT_PRINTED_CORE";
  readonly relationSupport: Readonly<{
    existingRelationsOnly: true;
    requiresStrongIdentifier: true;
    permitsAmountOnlyRelations: false;
    validatedEvidenceIds: readonly string[];
  }>;
  readonly originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE";
  readonly retainedSourceContent: "NONE";
}

const INTEGRITY_KEYS = new Set([
  "schemaVersion",
  "integrityVersion",
  "catalogReleaseId",
  "familyId",
  "archetypeId",
  "validationMode",
  "status",
  "passCount",
  "automaticPassLimit",
  "normalizedEvidence",
  "checks",
  "hardFailureCodes",
  "persistenceDecision",
  "relationSupport",
  "originalExtractionMutationPolicy",
  "retainedSourceContent",
]);
const EVIDENCE_KEYS = new Set([
  "evidenceId",
  "sourceFieldFingerprint",
  "semantic",
  "canonicalType",
  "originalClassification",
  "amountCents",
  "dateValue",
  "countValue",
  "sign",
  "currency",
  "sourcePart",
  "pageNumbers",
  "assertionType",
  "originalConfidence",
]);
const CHECK_KEYS = new Set([
  "ruleId",
  "checkKind",
  "status",
  "operands",
  "expectedCents",
  "observedCents",
  "deltaCents",
  "toleranceCents",
  "calculation",
  "safeMessage",
]);
const REF_KEYS = new Set(["evidenceId"]);
const CALCULATION_NONE_KEYS = new Set(["kind"]);
const CALCULATION_LINEAR_KEYS = new Set([
  "kind",
  "resultEvidenceId",
  "terms",
]);
const CALCULATION_PERCENTAGE_KEYS = new Set([
  "kind",
  "resultEvidenceId",
  "baseEvidenceId",
  "rateBasisPoints",
]);
const CALCULATION_ZERO_KEYS = new Set(["kind", "resultEvidenceId"]);
const CALCULATION_ORDER_KEYS = new Set([
  "kind",
  "leftEvidenceId",
  "operator",
  "rightEvidenceId",
]);
const CALCULATION_CHAIN_KEYS = new Set(["kind", "evidenceIds"]);
const SIGNED_REF_KEYS = new Set(["evidenceId", "sign"]);
const RELATION_KEYS = new Set([
  "existingRelationsOnly",
  "requiresStrongIdentifier",
  "permitsAmountOnlyRelations",
  "validatedEvidenceIds",
]);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const ISO_DATE = /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;
const INTERNAL_TOKEN = /(?:\bEXACT_|\bINTEGER:|\bBOOLEAN:|\bEXPLANATION:|_DURATION\b|_CONTENT\b)/u;
const DIRECT_PRIVATE_DATA =
  /\b(?:ES\d{22}|\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;
const SAFE_MESSAGES = new Set([
  "Los importes cuadran con las cifras impresas.",
  "Los importes cuadran con un redondeo de 0,01 €.",
  "Faltan intereses o costas por cuantificar en el documento.",
  "Revisa los importes y su estructura antes de confirmar.",
  "Este documento no requiere una comprobación aritmética.",
  "Los importes impresos respetan los límites del documento.",
  "Los importes impresos no respetan los límites del documento.",
  "Los límites impresos conservan el orden esperado.",
  "Los límites impresos no conservan el orden esperado.",
  "Hay componentes impresos que no se pueden reconciliar sin completar su estructura.",
  "Validación de etiquetas: hay importes incompatibles clasificados como intereses de demora.",
  "Hay varias fechas impresas para el mismo hito; revisa cuál corresponde al acto principal.",
  "Las fechas impresas conservan el orden esperado.",
  "Las fechas impresas no conservan el orden esperado.",
  "Los conteos impresos cuadran.",
  "Los conteos impresos no cuadran.",
  "Faltan conteos impresos para completar la comprobación.",
  "Faltan componentes impresos por cuantificar.",
  "Las cifras impresas no son compatibles.",
]);
const SAFE_DIFFERENCE_MESSAGE =
  /^Hay una diferencia de \d{1,12},\d{2} € entre el total y sus componentes\.$/u;
const HARD_FAILURES = new Set<
  FiscalNotificationMathematicalIntegrityV11["hardFailureCodes"][number]
>([
  "IMPOSSIBLE_BASIC_PRINTED_SUM",
  "INCOMPATIBLE_REFERENCE_OR_PART",
  "DUPLICATED_PRINTED_ROW",
  "PRIVATE_DATA_BOUNDARY_VIOLATION",
  "WORKSPACE_IDENTITY_MISMATCH",
]);
const SOURCE_PARTS = new Set<FiscalNotificationIntegritySourcePartV11>([
  ...DOCUMENT_SEGMENT_TYPES_V1,
  "MULTIPLE_PARTS",
]);

function invalid(): never {
  throw new Error("FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_V11_INVALID");
}

export function parseFiscalNotificationMathematicalIntegrityV11(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationMathematicalIntegrityV11 {
  const item = exactRecord(value, INTEGRITY_KEYS);
  if (
    item.schemaVersion !== 11 ||
    item.integrityVersion !==
      FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11 ||
    item.catalogReleaseId !== AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11 ||
    !safeId(item.familyId) ||
    !safeId(item.archetypeId) ||
    (item.validationMode !== "ARITHMETIC_AND_LOGICAL" &&
      item.validationMode !== "TEMPORAL_OR_COUNT_AND_LOGICAL") ||
    !AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11.includes(
      item.status as AeatMathematicalIntegrityStatusV11,
    ) ||
    (item.passCount !== 1 && item.passCount !== 2) ||
    item.automaticPassLimit !== 2 ||
    ![
      "ALLOW_CORE",
      "ALLOW_CORE_WITH_WARNINGS",
      "BLOCK_INCONSISTENT_PRINTED_CORE",
    ].includes(String(item.persistenceDecision)) ||
    item.originalExtractionMutationPolicy !== "NEVER_MUTATE_OR_REPLACE" ||
    item.retainedSourceContent !== "NONE"
  ) {
    invalid();
  }
  const normalizedEvidence = boundedArray(
    item.normalizedEvidence,
    FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxEvidence,
  ).map((entry) => parseEvidence(entry, pageFrom, pageTo));
  const evidenceIds = new Set<string>();
  const evidenceById = new Map<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >();
  for (const evidence of normalizedEvidence) {
    if (evidenceIds.has(evidence.evidenceId)) invalid();
    evidenceIds.add(evidence.evidenceId);
    evidenceById.set(evidence.evidenceId, evidence);
  }
  const checks = boundedArray(
    item.checks,
    FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxChecks,
  ).map((entry) => parseCheck(entry, evidenceById));
  const hardFailureCodes = enumIds(
    item.hardFailureCodes,
    HARD_FAILURES,
    5,
  );
  const relation = exactRecord(item.relationSupport, RELATION_KEYS);
  if (
    relation.existingRelationsOnly !== true ||
    relation.requiresStrongIdentifier !== true ||
    relation.permitsAmountOnlyRelations !== false
  ) {
    invalid();
  }
  const validatedEvidenceIds = ids(
    relation.validatedEvidenceIds,
    FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxValidatedRelationEvidence,
  );
  const successfulCheckEvidenceIds = new Set(
    checks
      .filter(
        (check) =>
          check.calculation.kind !== "NONE" &&
          ["VALIDATED_EXACT", "VALIDATED_WITH_ROUNDING"].includes(
            check.status,
          ),
      )
      .flatMap((check) => check.operands.map((operand) => operand.evidenceId)),
  );
  if (
    validatedEvidenceIds.some(
      (id) => !evidenceIds.has(id) || !successfulCheckEvidenceIds.has(id),
    )
  ) {
    invalid();
  }
  const status = item.status as AeatMathematicalIntegrityStatusV11;
  const persistenceDecision = item.persistenceDecision as
    FiscalNotificationMathematicalIntegrityV11["persistenceDecision"];
  if (
    (hardFailureCodes.length === 0) !==
      (persistenceDecision !== "BLOCK_INCONSISTENT_PRINTED_CORE") ||
    status !== aggregateCheckStatus(checks) ||
    (status === "INCONSISTENT_PRINTED_VALUES") !==
      (hardFailureCodes.length > 0) ||
    (status === "NOT_APPLICABLE_NO_ARITHMETIC" &&
      checks.some((check) => check.checkKind === "ARITHMETIC"))
  ) {
    invalid();
  }
  return Object.freeze({
    schemaVersion: 11,
    integrityVersion: FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_VERSION_V11,
    catalogReleaseId: AEAT_MATHEMATICAL_INTEGRITY_RELEASE_ID_V11,
    familyId: item.familyId as string,
    archetypeId: item.archetypeId as string,
    validationMode:
      item.validationMode as AeatMathematicalIntegrityValidationModeV11,
    status,
    passCount: item.passCount as 1 | 2,
    automaticPassLimit: 2,
    normalizedEvidence: Object.freeze(normalizedEvidence),
    checks: Object.freeze(checks),
    hardFailureCodes: Object.freeze(hardFailureCodes),
    persistenceDecision,
    relationSupport: Object.freeze({
      existingRelationsOnly: true,
      requiresStrongIdentifier: true,
      permitsAmountOnlyRelations: false,
      validatedEvidenceIds: Object.freeze(validatedEvidenceIds),
    }),
    originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
    retainedSourceContent: "NONE",
  });
}

function aggregateCheckStatus(
  checks: readonly FiscalNotificationMathematicalIntegrityCheckV11[],
): AeatMathematicalIntegrityStatusV11 {
  const priorities: readonly AeatMathematicalIntegrityStatusV11[] = [
    "INCONSISTENT_PRINTED_VALUES",
    "REVIEW_REQUIRED",
    "VALIDATED_PARTIAL_COMPONENTS",
    "VALIDATED_WITH_ROUNDING",
    "VALIDATED_EXACT",
    "NOT_APPLICABLE_NO_ARITHMETIC",
  ];
  const status = priorities.find((candidate) =>
    checks.some((check) => check.status === candidate),
  );
  if (!status) invalid();
  return status;
}

function parseEvidence(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationIntegrityNormalizedEvidenceV11 {
  const item = exactRecord(value, EVIDENCE_KEYS);
  if (
    !safeId(item.evidenceId) ||
    typeof item.sourceFieldFingerprint !== "string" ||
    !SHA256.test(item.sourceFieldFingerprint) ||
    !["MONEY", "DATE", "REFERENCE", "STATUS", "COUNT", "OTHER"].includes(
      String(item.semantic),
    ) ||
    !safeId(item.canonicalType) ||
    !safeId(item.originalClassification) ||
    INTERNAL_TOKEN.test(String(item.canonicalType)) ||
    INTERNAL_TOKEN.test(String(item.originalClassification)) ||
    !["POSITIVE", "NEGATIVE", "UNSPECIFIED"].includes(String(item.sign)) ||
    (item.currency !== null && item.currency !== "EUR") ||
    !SOURCE_PARTS.has(item.sourcePart as FiscalNotificationIntegritySourcePartV11) ||
    !AEAT_MATHEMATICAL_INTEGRITY_ASSERTION_TYPES_V11.includes(
      item.assertionType as AeatMathematicalIntegrityAssertionTypeV11,
    ) ||
    typeof item.originalConfidence !== "number" ||
    !Number.isFinite(item.originalConfidence) ||
    item.originalConfidence < 0 ||
    item.originalConfidence > 1
  ) {
    invalid();
  }
  const amountCents = nullableInteger(item.amountCents, true);
  const countValue = nullableInteger(item.countValue, false);
  const dateValue = item.dateValue;
  if (
    dateValue !== null &&
    (typeof dateValue !== "string" || !isValidIsoDate(dateValue))
  ) {
    invalid();
  }
  const semantic = item.semantic as FiscalNotificationIntegrityNormalizedEvidenceV11["semantic"];
  if (
    (semantic === "MONEY") !== (amountCents !== null) ||
    (semantic === "DATE") !== (dateValue !== null) ||
    (semantic === "COUNT") !== (countValue !== null) ||
    (semantic !== "MONEY" && item.currency !== null) ||
    (semantic !== "MONEY" && item.sign !== "UNSPECIFIED") ||
    (semantic === "MONEY" &&
      ((amountCents! < 0 && item.sign !== "NEGATIVE") ||
        (amountCents! >= 0 && item.sign !== "POSITIVE")))
  ) {
    invalid();
  }
  const pageNumbers = pages(item.pageNumbers, pageFrom, pageTo);
  return Object.freeze({
    evidenceId: item.evidenceId as string,
    sourceFieldFingerprint: item.sourceFieldFingerprint as `sha256:${string}`,
    semantic,
    canonicalType: item.canonicalType as string,
    originalClassification: item.originalClassification as string,
    amountCents,
    dateValue: dateValue as string | null,
    countValue,
    sign: item.sign as FiscalNotificationIntegrityNormalizedEvidenceV11["sign"],
    currency: item.currency as "EUR" | null,
    sourcePart: item.sourcePart as FiscalNotificationIntegritySourcePartV11,
    pageNumbers: Object.freeze(pageNumbers),
    assertionType:
      item.assertionType as AeatMathematicalIntegrityAssertionTypeV11,
    originalConfidence: item.originalConfidence,
  });
}

function parseCheck(
  value: unknown,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): FiscalNotificationMathematicalIntegrityCheckV11 {
  const item = exactRecord(value, CHECK_KEYS);
  if (
    !safeId(item.ruleId) ||
    !["ARITHMETIC", "TEMPORAL", "STRUCTURAL", "RELATION_SUPPORT"].includes(
      String(item.checkKind),
    ) ||
    !AEAT_MATHEMATICAL_INTEGRITY_STATUSES_V11.includes(
      item.status as AeatMathematicalIntegrityStatusV11,
    ) ||
    !Number.isSafeInteger(item.toleranceCents) ||
    Number(item.toleranceCents) < 0 ||
    Number(item.toleranceCents) > 512 ||
    typeof item.safeMessage !== "string" ||
    item.safeMessage.trim().length === 0 ||
    item.safeMessage.length >
      FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxSafeMessageChars ||
    INTERNAL_TOKEN.test(item.safeMessage) ||
    DIRECT_PRIVATE_DATA.test(item.safeMessage) ||
    (!SAFE_MESSAGES.has(item.safeMessage) &&
      !SAFE_DIFFERENCE_MESSAGE.test(item.safeMessage))
  ) {
    invalid();
  }
  const operands = boundedArray(
    item.operands,
    FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxOperandsPerCheck,
  ).map((entry) => {
    const ref = exactRecord(entry, REF_KEYS);
    if (
      !safeId(ref.evidenceId) ||
      !evidenceById.has(ref.evidenceId as string)
    ) {
      invalid();
    }
    return Object.freeze({ evidenceId: ref.evidenceId as string });
  });
  const expectedCents = nullableInteger(item.expectedCents, true);
  const observedCents = nullableInteger(item.observedCents, true);
  const deltaCents = nullableInteger(item.deltaCents, true);
  const calculation = parseCalculation(item.calculation, evidenceById);
  if (
    (expectedCents === null || observedCents === null) !==
      (deltaCents === null) ||
    (deltaCents !== null && deltaCents !== observedCents! - expectedCents!)
  ) {
    invalid();
  }
  validateCalculatedCheck(
    item.checkKind as FiscalNotificationMathematicalIntegrityCheckV11["checkKind"],
    item.status as AeatMathematicalIntegrityStatusV11,
    operands.map((operand) => operand.evidenceId),
    expectedCents,
    observedCents,
    deltaCents,
    item.toleranceCents as number,
    calculation,
    evidenceById,
  );
  return Object.freeze({
    ruleId: item.ruleId as string,
    checkKind: item.checkKind as FiscalNotificationMathematicalIntegrityCheckV11["checkKind"],
    status: item.status as AeatMathematicalIntegrityStatusV11,
    operands: Object.freeze(operands),
    expectedCents,
    observedCents,
    deltaCents,
    toleranceCents: item.toleranceCents as number,
    calculation,
    safeMessage: item.safeMessage,
  });
}

function parseCalculation(
  value: unknown,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): FiscalNotificationIntegrityCalculationV11 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid();
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "NONE") {
    exactRecord(value, CALCULATION_NONE_KEYS);
    return Object.freeze({ kind: "NONE" });
  }
  if (kind === "LINEAR_EQUALITY" || kind === "COUNT_EQUALITY") {
    const item = exactRecord(value, CALCULATION_LINEAR_KEYS);
    const resultEvidenceId = calculationEvidenceId(
      item.resultEvidenceId,
      evidenceById,
    );
    const terms = boundedArray(
      item.terms,
      FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxOperandsPerCheck,
    ).map((entry) => {
      const term = exactRecord(entry, SIGNED_REF_KEYS);
      if (term.sign !== 1 && term.sign !== -1) invalid();
      return Object.freeze({
        evidenceId: calculationEvidenceId(term.evidenceId, evidenceById),
        sign: term.sign,
      });
    });
    if (terms.length === 0) invalid();
    return Object.freeze({
      kind,
      resultEvidenceId,
      terms: Object.freeze(terms),
    });
  }
  if (kind === "PERCENTAGE_EQUALITY" || kind === "BASE_PLUS_PERCENTAGE") {
    const item = exactRecord(value, CALCULATION_PERCENTAGE_KEYS);
    if (
      !Number.isSafeInteger(item.rateBasisPoints) ||
      Number(item.rateBasisPoints) <= 0 ||
      Number(item.rateBasisPoints) > 100_000
    ) {
      invalid();
    }
    return Object.freeze({
      kind,
      resultEvidenceId: calculationEvidenceId(
        item.resultEvidenceId,
        evidenceById,
      ),
      baseEvidenceId: calculationEvidenceId(item.baseEvidenceId, evidenceById),
      rateBasisPoints: Number(item.rateBasisPoints),
    });
  }
  if (kind === "ZERO_EQUALITY") {
    const item = exactRecord(value, CALCULATION_ZERO_KEYS);
    return Object.freeze({
      kind,
      resultEvidenceId: calculationEvidenceId(
        item.resultEvidenceId,
        evidenceById,
      ),
    });
  }
  if (kind === "AMOUNT_ORDER" || kind === "DATE_ORDER") {
    const item = exactRecord(value, CALCULATION_ORDER_KEYS);
    if (item.operator !== "LTE" && item.operator !== "GTE") invalid();
    return Object.freeze({
      kind,
      leftEvidenceId: calculationEvidenceId(item.leftEvidenceId, evidenceById),
      operator: item.operator,
      rightEvidenceId: calculationEvidenceId(
        item.rightEvidenceId,
        evidenceById,
      ),
    });
  }
  if (kind === "AMOUNT_CHAIN") {
    const item = exactRecord(value, CALCULATION_CHAIN_KEYS);
    const evidenceIds = ids(
      item.evidenceIds,
      FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxOperandsPerCheck,
    );
    if (evidenceIds.length < 2) invalid();
    evidenceIds.forEach((evidenceId) =>
      calculationEvidenceId(evidenceId, evidenceById),
    );
    return Object.freeze({ kind, evidenceIds: Object.freeze(evidenceIds) });
  }
  invalid();
}

function calculationEvidenceId(
  value: unknown,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): string {
  if (!safeId(value) || !evidenceById.has(value)) invalid();
  return value;
}

function validateCalculatedCheck(
  checkKind: FiscalNotificationMathematicalIntegrityCheckV11["checkKind"],
  status: AeatMathematicalIntegrityStatusV11,
  operandIds: readonly string[],
  expectedCents: number | null,
  observedCents: number | null,
  deltaCents: number | null,
  toleranceCents: number,
  calculation: FiscalNotificationIntegrityCalculationV11,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): void {
  if (calculation.kind === "NONE") {
    if (
      expectedCents !== null ||
      observedCents !== null ||
      deltaCents !== null ||
      ((checkKind === "ARITHMETIC" || checkKind === "RELATION_SUPPORT") &&
        [
          "VALIDATED_EXACT",
          "VALIDATED_WITH_ROUNDING",
          "INCONSISTENT_PRINTED_VALUES",
        ].includes(status))
    ) {
      invalid();
    }
    return;
  }
  const calculationIds = calculationEvidenceIds(calculation);
  if (
    new Set(operandIds).size !== operandIds.length ||
    calculationIds.size !== new Set(operandIds).size ||
    operandIds.some((evidenceId) => !calculationIds.has(evidenceId))
  ) {
    invalid();
  }
  if (
    calculation.kind === "LINEAR_EQUALITY" ||
    calculation.kind === "PERCENTAGE_EQUALITY" ||
    calculation.kind === "BASE_PLUS_PERCENTAGE" ||
    calculation.kind === "ZERO_EQUALITY"
  ) {
    const result = moneyEvidence(calculation.resultEvidenceId, evidenceById);
    const expected =
      calculation.kind === "LINEAR_EQUALITY"
        ? calculation.terms.reduce(
            (total, term) =>
              total + term.sign * moneyEvidence(term.evidenceId, evidenceById),
            0,
          )
        : calculation.kind === "PERCENTAGE_EQUALITY" ||
            calculation.kind === "BASE_PLUS_PERCENTAGE"
          ? (() => {
              const base = moneyEvidence(
                calculation.baseEvidenceId,
                evidenceById,
              );
              const percentage = Math.round(
                (base * calculation.rateBasisPoints) / 10_000,
              );
              return calculation.kind === "BASE_PLUS_PERCENTAGE"
                ? base + percentage
                : percentage;
            })()
          : 0;
    validateMoneyResult(
      status,
      expectedCents,
      observedCents,
      deltaCents,
      toleranceCents,
      expected,
      result,
    );
    return;
  }
  if (calculation.kind === "COUNT_EQUALITY") {
    if (
      expectedCents !== null ||
      observedCents !== null ||
      deltaCents !== null ||
      toleranceCents !== 0
    ) {
      invalid();
    }
    const result = countEvidence(calculation.resultEvidenceId, evidenceById);
    const expected = calculation.terms.reduce(
      (total, term) =>
        total + term.sign * countEvidence(term.evidenceId, evidenceById),
      0,
    );
    const derivedStatus =
      expected === result ? "VALIDATED_EXACT" : "INCONSISTENT_PRINTED_VALUES";
    if (status !== derivedStatus) invalid();
    return;
  }
  if (calculation.kind === "DATE_ORDER") {
    if (
      expectedCents !== null ||
      observedCents !== null ||
      deltaCents !== null ||
      toleranceCents !== 0
    ) {
      invalid();
    }
    const left = dateEvidence(calculation.leftEvidenceId, evidenceById);
    const right = dateEvidence(calculation.rightEvidenceId, evidenceById);
    const ordered =
      calculation.operator === "LTE" ? left <= right : left >= right;
    if (
      status !== (ordered ? "VALIDATED_EXACT" : "INCONSISTENT_PRINTED_VALUES")
    ) {
      invalid();
    }
    return;
  }
  const values =
    calculation.kind === "AMOUNT_ORDER"
      ? [
          moneyEvidence(calculation.leftEvidenceId, evidenceById),
          moneyEvidence(calculation.rightEvidenceId, evidenceById),
        ]
      : calculation.evidenceIds.map((evidenceId) =>
          moneyEvidence(evidenceId, evidenceById),
        );
  const ordered =
    calculation.kind === "AMOUNT_ORDER"
      ? calculation.operator === "LTE"
        ? values[0]! <= values[1]!
        : values[0]! >= values[1]!
      : values[0]! >= 0 &&
        values.every((value, index) =>
          index === 0 ? true : values[index - 1]! <= value,
        );
  const expected = values.at(-1)!;
  const observed = values[0]!;
  if (
    expectedCents !== expected ||
    observedCents !== observed ||
    deltaCents !== observed - expected ||
    toleranceCents !== 0 ||
    status !== (ordered ? "VALIDATED_EXACT" : "INCONSISTENT_PRINTED_VALUES")
  ) {
    invalid();
  }
}

function calculationEvidenceIds(
  calculation: Exclude<
    FiscalNotificationIntegrityCalculationV11,
    { kind: "NONE" }
  >,
): Set<string> {
  switch (calculation.kind) {
    case "LINEAR_EQUALITY":
    case "COUNT_EQUALITY":
      return new Set([
        calculation.resultEvidenceId,
        ...calculation.terms.map((term) => term.evidenceId),
      ]);
    case "PERCENTAGE_EQUALITY":
    case "BASE_PLUS_PERCENTAGE":
      return new Set([
        calculation.resultEvidenceId,
        calculation.baseEvidenceId,
      ]);
    case "ZERO_EQUALITY":
      return new Set([calculation.resultEvidenceId]);
    case "AMOUNT_ORDER":
    case "DATE_ORDER":
      return new Set([calculation.leftEvidenceId, calculation.rightEvidenceId]);
    case "AMOUNT_CHAIN":
      return new Set(calculation.evidenceIds);
  }
}

function moneyEvidence(
  evidenceId: string,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): number {
  const evidence = evidenceById.get(evidenceId);
  if (!evidence || evidence.semantic !== "MONEY" || evidence.amountCents === null) {
    invalid();
  }
  return evidence.amountCents;
}

function countEvidence(
  evidenceId: string,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): number {
  const evidence = evidenceById.get(evidenceId);
  if (!evidence || evidence.semantic !== "COUNT" || evidence.countValue === null) {
    invalid();
  }
  return evidence.countValue;
}

function dateEvidence(
  evidenceId: string,
  evidenceById: ReadonlyMap<
    string,
    FiscalNotificationIntegrityNormalizedEvidenceV11
  >,
): string {
  const evidence = evidenceById.get(evidenceId);
  if (!evidence || evidence.semantic !== "DATE" || evidence.dateValue === null) {
    invalid();
  }
  return evidence.dateValue;
}

function validateMoneyResult(
  status: AeatMathematicalIntegrityStatusV11,
  expectedCents: number | null,
  observedCents: number | null,
  deltaCents: number | null,
  toleranceCents: number,
  expected: number,
  observed: number,
): void {
  const delta = observed - expected;
  const derivedStatus: AeatMathematicalIntegrityStatusV11 =
    delta === 0
      ? "VALIDATED_EXACT"
      : Math.abs(delta) <= toleranceCents
        ? "VALIDATED_WITH_ROUNDING"
        : "INCONSISTENT_PRINTED_VALUES";
  if (
    expectedCents !== expected ||
    observedCents !== observed ||
    deltaCents !== delta ||
    status !== derivedStatus
  ) {
    invalid();
  }
}

function exactRecord(value: unknown, keys: ReadonlySet<string>): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  const item = value as Record<string, unknown>;
  const actual = Object.keys(item);
  if (actual.length !== keys.size || actual.some((key) => !keys.has(key))) invalid();
  return item;
}

function boundedArray(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) invalid();
  return [...value];
}

function ids(value: unknown, max: number): string[] {
  const values = boundedArray(value, max);
  const result = values.map((entry) => {
    if (!safeId(entry)) invalid();
    return entry as string;
  });
  if (new Set(result).size !== result.length) invalid();
  return result;
}

function enumIds<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
  max: number,
): T[] {
  return ids(value, max).map((entry) => {
    if (!allowed.has(entry as T)) invalid();
    return entry as T;
  });
}

function pages(value: unknown, pageFrom: number, pageTo: number): number[] {
  const result = boundedArray(
    value,
    FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxPagesPerEvidence,
  ).map((entry) => {
    if (
      !Number.isSafeInteger(entry) ||
      Number(entry) < pageFrom ||
      Number(entry) > pageTo
    ) {
      invalid();
    }
    return Number(entry);
  });
  if (result.length === 0 || new Set(result).size !== result.length) invalid();
  return result;
}

function nullableInteger(value: unknown, signed: boolean): number | null {
  if (value === null) return null;
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(Number(value)) >
      FISCAL_NOTIFICATION_MATHEMATICAL_INTEGRITY_LIMITS_V11.maxAmountCents ||
    (!signed && Number(value) < 0)
  ) {
    invalid();
  }
  return Number(value);
}

function safeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}
