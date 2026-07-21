export const FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_VERSION_V1 =
  "1.0.0" as const;

export const FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1 =
  Object.freeze({
    maxEquations: 264,
    maxOperandsPerEquation: 12,
    maxDiscardedCandidates: 64,
    maxInstallments: 256,
    maxFieldIdsPerValue: 16,
    maxPagesPerValue: 256,
    maxAmountCents: 100_000_000_000,
  } as const);

export type FiscalNotificationAmountEquationFormulaV1 =
  | "PRINCIPAL_PLUS_SURCHARGE_PLUS_INTEREST_PLUS_COSTS_MINUS_PAYMENTS_EQUALS_TOTAL"
  | "TOTAL_BEFORE_OFFSET_MINUS_OFFSET_EQUALS_REMAINING"
  | "QUOTA_PLUS_INTEREST_EQUALS_TOTAL"
  | "INITIAL_PENALTY_MINUS_REDUCTION_EQUALS_REDUCED_PENALTY"
  | "INSTALLMENT_COMPONENTS_EQUAL_INSTALLMENT_TOTAL"
  | "INSTALLMENT_ROWS_EQUAL_PLAN_TOTALS"
  | "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_PRINCIPAL"
  | "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_INTEREST"
  | "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_SURCHARGE"
  | "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_TOTAL";

export type FiscalNotificationAmountRoleV1 =
  | "PRINCIPAL"
  | "SURCHARGE"
  | "INTEREST"
  | "COSTS"
  | "PAYMENT"
  | "OFFSET"
  | "QUOTA"
  | "INITIAL_PENALTY"
  | "PENALTY_REDUCTION"
  | "TOTAL_BEFORE_OFFSET"
  | "TOTAL"
  | "REMAINING";

export type FiscalNotificationAmountEquationStatusV1 =
  | "MATCHED"
  | "MATCHED_WITH_ROUNDING"
  | "MISMATCH_REVIEW_REQUIRED"
  | "AMBIGUOUS_REVIEW_REQUIRED";

export interface FiscalNotificationAmountOperandV1 {
  readonly role: FiscalNotificationAmountRoleV1;
  readonly sign: 1 | -1;
  readonly amountCents: number;
  readonly fieldIds: readonly string[];
  readonly sourcePageNumbers: readonly number[];
}

export interface FiscalNotificationAmountEquationV1 {
  readonly equationId: string;
  readonly formula: FiscalNotificationAmountEquationFormulaV1;
  readonly scope: "DOCUMENT" | "INSTALLMENT" | "PLAN_TOTALS";
  readonly status: FiscalNotificationAmountEquationStatusV1;
  readonly toleranceCents: number;
  readonly leftCents: number;
  readonly rightCents: number;
  readonly differenceCents: number;
  readonly operands: readonly FiscalNotificationAmountOperandV1[];
  readonly result: FiscalNotificationAmountOperandV1;
  readonly sourcePageNumbers: readonly number[];
}

export interface FiscalNotificationDiscardedAmountCandidateV1 {
  readonly fieldId: string;
  readonly amountCents: number;
  readonly reason:
    | "TAX_IDENTIFIER_LABEL_CONTEXT"
    | "TAX_IDENTIFIER_REPEATED_CONTEXT";
  readonly reclassifiedAs: "TAX_IDENTIFIER";
  readonly sourcePageNumbers: readonly number[];
}

export interface FiscalNotificationReconciledInstallmentV1 {
  readonly sequence: number;
  readonly dueDate: string;
  readonly principalCents: number;
  readonly interestCents: number;
  readonly surchargeCents: number;
  readonly totalCents: number;
  readonly sourceFieldId: string;
  readonly sourcePageNumbers: readonly number[];
  readonly equationStatus: FiscalNotificationAmountEquationStatusV1;
  readonly carriedForwardRoles: readonly ("PRINCIPAL" | "SURCHARGE")[];
}

export interface FiscalNotificationReconciledPlanTotalsV1 {
  readonly installmentCount: number;
  readonly principalCents: number;
  readonly interestCents: number;
  readonly surchargeCents: number;
  readonly totalCents: number;
  readonly printedPrincipalCents: number | null;
  readonly printedInterestCents: number | null;
  readonly printedSurchargeCents: number | null;
  readonly printedTotalCents: number | null;
  readonly sourceFieldIds: readonly string[];
  readonly sourcePageNumbers: readonly number[];
}

export interface FiscalNotificationAmountReconciliationV1 {
  readonly schemaVersion: 1;
  readonly reconciliationVersion: typeof FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_VERSION_V1;
  readonly status:
    | "MATCHED"
    | "REVIEW_REQUIRED"
    | "NO_EQUATION_AVAILABLE";
  readonly passCount: 1 | 2;
  readonly automaticPassLimit: 2;
  readonly toleranceCents: number;
  readonly equations: readonly FiscalNotificationAmountEquationV1[];
  readonly discardedCandidates: readonly FiscalNotificationDiscardedAmountCandidateV1[];
  readonly installments: readonly FiscalNotificationReconciledInstallmentV1[];
  readonly totals: FiscalNotificationReconciledPlanTotalsV1 | null;
  readonly confidenceEffect: "RAISED_FOR_MATCHED_FIELDS" | "UNCHANGED";
  readonly requiresManualReview: boolean;
  readonly numericMutationPolicy: "NEVER_CHANGE_EXTRACTED_VALUES";
}

const RECONCILIATION_KEYS = new Set([
  "schemaVersion",
  "reconciliationVersion",
  "status",
  "passCount",
  "automaticPassLimit",
  "toleranceCents",
  "equations",
  "discardedCandidates",
  "installments",
  "totals",
  "confidenceEffect",
  "requiresManualReview",
  "numericMutationPolicy",
]);
const EQUATION_KEYS = new Set([
  "equationId",
  "formula",
  "scope",
  "status",
  "toleranceCents",
  "leftCents",
  "rightCents",
  "differenceCents",
  "operands",
  "result",
  "sourcePageNumbers",
]);
const OPERAND_KEYS = new Set([
  "role",
  "sign",
  "amountCents",
  "fieldIds",
  "sourcePageNumbers",
]);
const DISCARDED_KEYS = new Set([
  "fieldId",
  "amountCents",
  "reason",
  "reclassifiedAs",
  "sourcePageNumbers",
]);
const INSTALLMENT_KEYS = new Set([
  "sequence",
  "dueDate",
  "principalCents",
  "interestCents",
  "surchargeCents",
  "totalCents",
  "sourceFieldId",
  "sourcePageNumbers",
  "equationStatus",
  "carriedForwardRoles",
]);
const TOTAL_KEYS = new Set([
  "installmentCount",
  "principalCents",
  "interestCents",
  "surchargeCents",
  "totalCents",
  "printedPrincipalCents",
  "printedInterestCents",
  "printedSurchargeCents",
  "printedTotalCents",
  "sourceFieldIds",
  "sourcePageNumbers",
]);
const FORMULAS = new Set<FiscalNotificationAmountEquationFormulaV1>([
  "PRINCIPAL_PLUS_SURCHARGE_PLUS_INTEREST_PLUS_COSTS_MINUS_PAYMENTS_EQUALS_TOTAL",
  "TOTAL_BEFORE_OFFSET_MINUS_OFFSET_EQUALS_REMAINING",
  "QUOTA_PLUS_INTEREST_EQUALS_TOTAL",
  "INITIAL_PENALTY_MINUS_REDUCTION_EQUALS_REDUCED_PENALTY",
  "INSTALLMENT_COMPONENTS_EQUAL_INSTALLMENT_TOTAL",
  "INSTALLMENT_ROWS_EQUAL_PLAN_TOTALS",
  "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_PRINCIPAL",
  "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_INTEREST",
  "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_SURCHARGE",
  "INSTALLMENT_ROWS_EQUAL_PRINTED_PLAN_TOTAL",
]);
const ROLES = new Set<FiscalNotificationAmountRoleV1>([
  "PRINCIPAL",
  "SURCHARGE",
  "INTEREST",
  "COSTS",
  "PAYMENT",
  "OFFSET",
  "QUOTA",
  "INITIAL_PENALTY",
  "PENALTY_REDUCTION",
  "TOTAL_BEFORE_OFFSET",
  "TOTAL",
  "REMAINING",
]);
const EQUATION_STATUSES = new Set<FiscalNotificationAmountEquationStatusV1>([
  "MATCHED",
  "MATCHED_WITH_ROUNDING",
  "MISMATCH_REVIEW_REQUIRED",
  "AMBIGUOUS_REVIEW_REQUIRED",
]);
const ISO_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/u;

export function parseFiscalNotificationAmountReconciliationV1(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationAmountReconciliationV1 {
  const item = record(value, RECONCILIATION_KEYS);
  if (
    item.schemaVersion !== 1 ||
    item.reconciliationVersion !==
      FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_VERSION_V1 ||
    !["MATCHED", "REVIEW_REQUIRED", "NO_EQUATION_AVAILABLE"].includes(
      String(item.status),
    ) ||
    (item.passCount !== 1 && item.passCount !== 2) ||
    item.automaticPassLimit !== 2 ||
    item.toleranceCents !== 1 ||
    !["RAISED_FOR_MATCHED_FIELDS", "UNCHANGED"].includes(
      String(item.confidenceEffect),
    ) ||
    typeof item.requiresManualReview !== "boolean" ||
    item.numericMutationPolicy !== "NEVER_CHANGE_EXTRACTED_VALUES"
  ) {
    throw invalid();
  }
  const equations = array(
    item.equations,
    FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxEquations,
  ).map((entry) => parseEquation(entry, pageFrom, pageTo));
  const discardedCandidates = array(
    item.discardedCandidates,
    FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxDiscardedCandidates,
  ).map((entry) => parseDiscarded(entry, pageFrom, pageTo));
  const installments = array(
    item.installments,
    FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxInstallments,
  ).map((entry) => parseInstallment(entry, pageFrom, pageTo));
  const totals =
    item.totals === null ? null : parseTotals(item.totals, pageFrom, pageTo);
  const hasReviewEquation = equations.some((equation) =>
    equation.status.endsWith("REVIEW_REQUIRED"),
  );
  const allMatched =
    equations.length > 0 &&
    equations.every(
      (equation) =>
        equation.status === "MATCHED" ||
        equation.status === "MATCHED_WITH_ROUNDING",
    );
  const expectedStatus: FiscalNotificationAmountReconciliationV1["status"] =
    hasReviewEquation
      ? "REVIEW_REQUIRED"
      : allMatched
        ? "MATCHED"
        : "NO_EQUATION_AVAILABLE";
  const expectedPassCount = discardedCandidates.length > 0 ? 2 : 1;
  const installmentSums = installments.reduce(
    (sums, installment) => ({
      principalCents: sums.principalCents + installment.principalCents,
      interestCents: sums.interestCents + installment.interestCents,
      surchargeCents: sums.surchargeCents + installment.surchargeCents,
      totalCents: sums.totalCents + installment.totalCents,
    }),
    { principalCents: 0, interestCents: 0, surchargeCents: 0, totalCents: 0 },
  );
  if (
    item.status !== expectedStatus ||
    item.passCount !== expectedPassCount ||
    item.requiresManualReview !== (expectedStatus !== "MATCHED") ||
    (installments.length === 0) !== (totals === null) ||
    (totals !== null &&
      (totals.installmentCount !== installments.length ||
        totals.principalCents !== installmentSums.principalCents ||
        totals.interestCents !== installmentSums.interestCents ||
        totals.surchargeCents !== installmentSums.surchargeCents ||
        totals.totalCents !== installmentSums.totalCents))
  ) {
    throw invalid();
  }
  return Object.freeze({
    schemaVersion: 1,
    reconciliationVersion:
      FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_VERSION_V1,
    status: item.status as FiscalNotificationAmountReconciliationV1["status"],
    passCount: item.passCount as 1 | 2,
    automaticPassLimit: 2,
    toleranceCents: 1,
    equations: Object.freeze(equations),
    discardedCandidates: Object.freeze(discardedCandidates),
    installments: Object.freeze(installments),
    totals,
    confidenceEffect:
      item.confidenceEffect as FiscalNotificationAmountReconciliationV1["confidenceEffect"],
    requiresManualReview: item.requiresManualReview as boolean,
    numericMutationPolicy: "NEVER_CHANGE_EXTRACTED_VALUES",
  });
}

function parseEquation(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationAmountEquationV1 {
  const item = record(value, EQUATION_KEYS);
  assertId(item.equationId);
  if (
    !FORMULAS.has(item.formula as FiscalNotificationAmountEquationFormulaV1) ||
    !["DOCUMENT", "INSTALLMENT", "PLAN_TOTALS"].includes(String(item.scope)) ||
    !EQUATION_STATUSES.has(
      item.status as FiscalNotificationAmountEquationStatusV1,
    ) ||
    item.toleranceCents !== 1
  ) {
    throw invalid();
  }
  const leftCents = integer(item.leftCents);
  const rightCents = amount(item.rightCents);
  const differenceCents = integer(item.differenceCents);
  if (differenceCents !== leftCents - rightCents) throw invalid();
  const absoluteDifference = Math.abs(differenceCents);
  const expectedStatus: FiscalNotificationAmountEquationStatusV1 =
    differenceCents === 0
      ? "MATCHED"
      : absoluteDifference <= 1
        ? "MATCHED_WITH_ROUNDING"
        : "MISMATCH_REVIEW_REQUIRED";
  if (
    item.status === "AMBIGUOUS_REVIEW_REQUIRED"
      ? absoluteDifference > 1
      : item.status !== expectedStatus
  ) {
    throw invalid();
  }
  const operands = array(
    item.operands,
    FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxOperandsPerEquation,
  ).map((entry) => parseOperand(entry, pageFrom, pageTo));
  if (operands.length === 0) throw invalid();
  const result = parseOperand(item.result, pageFrom, pageTo);
  const sourcePageNumbers = pages(item.sourcePageNumbers, pageFrom, pageTo);
  return Object.freeze({
    equationId: item.equationId as string,
    formula:
      item.formula as FiscalNotificationAmountEquationFormulaV1,
    scope: item.scope as FiscalNotificationAmountEquationV1["scope"],
    status: item.status as FiscalNotificationAmountEquationStatusV1,
    toleranceCents: 1,
    leftCents,
    rightCents,
    differenceCents,
    operands: Object.freeze(operands),
    result,
    sourcePageNumbers,
  });
}

function parseOperand(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationAmountOperandV1 {
  const item = record(value, OPERAND_KEYS);
  if (
    !ROLES.has(item.role as FiscalNotificationAmountRoleV1) ||
    (item.sign !== 1 && item.sign !== -1)
  ) {
    throw invalid();
  }
  return Object.freeze({
    role: item.role as FiscalNotificationAmountRoleV1,
    sign: item.sign as 1 | -1,
    amountCents: amount(item.amountCents),
    fieldIds: ids(item.fieldIds),
    sourcePageNumbers: pages(item.sourcePageNumbers, pageFrom, pageTo),
  });
}

function parseDiscarded(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationDiscardedAmountCandidateV1 {
  const item = record(value, DISCARDED_KEYS);
  assertId(item.fieldId);
  if (
    ![
      "TAX_IDENTIFIER_LABEL_CONTEXT",
      "TAX_IDENTIFIER_REPEATED_CONTEXT",
    ].includes(String(item.reason)) ||
    item.reclassifiedAs !== "TAX_IDENTIFIER"
  ) {
    throw invalid();
  }
  return Object.freeze({
    fieldId: item.fieldId as string,
    amountCents: amount(item.amountCents),
    reason:
      item.reason as FiscalNotificationDiscardedAmountCandidateV1["reason"],
    reclassifiedAs: "TAX_IDENTIFIER",
    sourcePageNumbers: pages(item.sourcePageNumbers, pageFrom, pageTo),
  });
}

function parseInstallment(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationReconciledInstallmentV1 {
  const item = record(value, INSTALLMENT_KEYS);
  assertId(item.sourceFieldId);
  if (
    !Number.isSafeInteger(item.sequence) ||
    Number(item.sequence) < 1 ||
    !ISO_DATE.test(String(item.dueDate)) ||
    !EQUATION_STATUSES.has(
      item.equationStatus as FiscalNotificationAmountEquationStatusV1,
    )
  ) {
    throw invalid();
  }
  const carriedForwardRoles = array(item.carriedForwardRoles, 2).map((role) => {
    if (role !== "PRINCIPAL" && role !== "SURCHARGE") throw invalid();
    return role;
  });
  if (new Set(carriedForwardRoles).size !== carriedForwardRoles.length) {
    throw invalid();
  }
  const principalCents = amount(item.principalCents);
  const interestCents = amount(item.interestCents);
  const surchargeCents = amount(item.surchargeCents);
  const totalCents = amount(item.totalCents);
  const installmentDifference =
    principalCents + interestCents + surchargeCents - totalCents;
  const expectedStatus: FiscalNotificationAmountEquationStatusV1 =
    installmentDifference === 0
      ? "MATCHED"
      : Math.abs(installmentDifference) <= 1
        ? "MATCHED_WITH_ROUNDING"
        : "MISMATCH_REVIEW_REQUIRED";
  if (
    item.equationStatus === "AMBIGUOUS_REVIEW_REQUIRED"
      ? Math.abs(installmentDifference) > 1
      : item.equationStatus !== expectedStatus
  ) {
    throw invalid();
  }
  return Object.freeze({
    sequence: Number(item.sequence),
    dueDate: item.dueDate as string,
    principalCents,
    interestCents,
    surchargeCents,
    totalCents,
    sourceFieldId: item.sourceFieldId as string,
    sourcePageNumbers: pages(item.sourcePageNumbers, pageFrom, pageTo),
    equationStatus:
      item.equationStatus as FiscalNotificationAmountEquationStatusV1,
    carriedForwardRoles: Object.freeze(carriedForwardRoles),
  });
}

function parseTotals(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): FiscalNotificationReconciledPlanTotalsV1 {
  const item = record(value, TOTAL_KEYS);
  if (!Number.isSafeInteger(item.installmentCount) || Number(item.installmentCount) < 1) {
    throw invalid();
  }
  return Object.freeze({
    installmentCount: Number(item.installmentCount),
    principalCents: amount(item.principalCents),
    interestCents: amount(item.interestCents),
    surchargeCents: amount(item.surchargeCents),
    totalCents: amount(item.totalCents),
    printedPrincipalCents: optionalAmount(item.printedPrincipalCents),
    printedInterestCents: optionalAmount(item.printedInterestCents),
    printedSurchargeCents: optionalAmount(item.printedSurchargeCents),
    printedTotalCents: optionalAmount(item.printedTotalCents),
    sourceFieldIds: ids(item.sourceFieldIds),
    sourcePageNumbers: pages(item.sourcePageNumbers, pageFrom, pageTo),
  });
}

function record(
  value: unknown,
  expectedKeys: ReadonlySet<string>,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw invalid();
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.size ||
    keys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
  ) {
    throw invalid();
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      throw invalid();
    }
    result[key] = descriptor.value;
  }
  return result;
}

function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw invalid();
  return [...value];
}

function amount(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 0 ||
    Number(value) >
      FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxAmountCents
  ) {
    throw invalid();
  }
  return Number(value);
}

function optionalAmount(value: unknown): number | null {
  return value === null ? null : amount(value);
}

function integer(value: unknown): number {
  if (!Number.isSafeInteger(value)) throw invalid();
  return Number(value);
}

function assertId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) throw invalid();
}

function ids(value: unknown): readonly string[] {
  const values = array(
    value,
    FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxFieldIdsPerValue,
  ).map((entry) => {
    assertId(entry);
    return entry;
  });
  if (new Set(values).size !== values.length) throw invalid();
  return Object.freeze(values);
}

function pages(
  value: unknown,
  pageFrom: number,
  pageTo: number,
): readonly number[] {
  const values = array(
    value,
    FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_LIMITS_V1.maxPagesPerValue,
  ).map((entry) => {
    if (
      !Number.isSafeInteger(entry) ||
      Number(entry) < pageFrom ||
      Number(entry) > pageTo
    ) {
      throw invalid();
    }
    return Number(entry);
  });
  if (values.length === 0 || new Set(values).size !== values.length) throw invalid();
  return Object.freeze(values);
}

function invalid(): Error {
  return new Error("INVALID_FISCAL_NOTIFICATION_AMOUNT_RECONCILIATION_V1");
}
