import { roundMoneySymmetric } from "../calculations";
import { EXPENSE_VAT_RECONCILIATION_TOLERANCE } from "../expenses";
import {
  type ExpenseEngineMathCheckKeyV1,
  type ExpenseEngineMathCheckV1,
  type ExpenseEngineMathResidualBucketV1,
  type ExpenseEngineMathVerdictV1,
  type ExpenseLearningFormulaKindV1,
} from "./contracts";

export interface ExpenseEngineMathLineInputV1 {
  readonly quantity?: number;
  readonly unitPrice?: number;
  readonly discountPercent?: number;
  readonly netUnitPrice?: number;
  readonly taxPercent?: number;
  readonly total?: number;
}

export interface ExpenseEngineMathInputV1 {
  readonly documentFormula?: ExpenseLearningFormulaKindV1;
  readonly taxBase?: number;
  readonly taxPercent?: number;
  readonly taxAmount?: number;
  readonly surchargePercent?: number;
  readonly surchargeAmount?: number;
  readonly withholdingAmount?: number;
  readonly documentTotal?: number;
  readonly lines?: readonly ExpenseEngineMathLineInputV1[];
}

export function reconcileExpenseEngineMathV1(
  input: ExpenseEngineMathInputV1,
): readonly Readonly<ExpenseEngineMathCheckV1>[] {
  const lines = Array.isArray(input.lines) ? input.lines.slice(0, 50) : [];
  const lineExtensions = lines.map(reconcileLineExtension);
  const observedLineTotals = lines
    .map((line) => finiteNumber(line.total))
    .filter((value): value is number => value !== null);
  const lineBase =
    lines.length > 0 && observedLineTotals.length === lines.length
      ? roundMoneySymmetric(
          observedLineTotals.reduce((sum, value) => sum + value, 0),
        )
      : null;
  const taxBase = finiteNumber(input.taxBase);
  const taxPercent = finiteNumber(input.taxPercent);
  const taxAmount = finiteNumber(input.taxAmount);
  const surchargePercent = finiteNumber(input.surchargePercent);
  const surchargeAmount = finiteNumber(input.surchargeAmount);
  const withholdingAmount = finiteNumber(input.withholdingAmount);
  const documentTotal = finiteNumber(input.documentTotal);

  return Object.freeze([
    aggregateLineExtensions(lineExtensions),
    compareCheck("LINES_TO_BASE", lineBase, taxBase),
    compareCheck(
      "TAX_FROM_BASE",
      taxBase !== null && taxPercent !== null
        ? roundMoneySymmetric(taxBase * (taxPercent / 100))
        : null,
      taxAmount,
    ),
    compareCheck(
      "SURCHARGE_FROM_BASE",
      taxBase !== null && surchargePercent !== null
        ? roundMoneySymmetric(taxBase * (surchargePercent / 100))
        : null,
      surchargeAmount,
    ),
    compareCheck(
      "DOCUMENT_TOTAL",
      expectedDocumentTotal({
        formula: input.documentFormula,
        taxBase,
        taxAmount,
        surchargeAmount,
        withholdingAmount,
      }),
      documentTotal,
    ),
    signConsistencyCheck(taxBase, documentTotal),
  ]);
}

function expectedDocumentTotal(input: {
  readonly formula: ExpenseLearningFormulaKindV1 | undefined;
  readonly taxBase: number | null;
  readonly taxAmount: number | null;
  readonly surchargeAmount: number | null;
  readonly withholdingAmount: number | null;
}): number | null {
  const { formula, taxBase, taxAmount, surchargeAmount, withholdingAmount } =
    input;
  if (taxBase === null || taxAmount === null) return null;

  switch (formula) {
    case "BASE_PLUS_TAX":
      return roundMoneySymmetric(taxBase + taxAmount);
    case "BASE_PLUS_TAX_PLUS_SURCHARGE":
      return surchargeAmount === null
        ? null
        : roundMoneySymmetric(taxBase + taxAmount + surchargeAmount);
    case "BASE_PLUS_TAX_MINUS_WITHHOLDING":
      return withholdingAmount === null
        ? null
        : roundMoneySymmetric(taxBase + taxAmount - withholdingAmount);
    case "BASE_PLUS_TAX_PLUS_SURCHARGE_MINUS_WITHHOLDING":
      return surchargeAmount === null || withholdingAmount === null
        ? null
        : roundMoneySymmetric(
            taxBase + taxAmount + surchargeAmount - withholdingAmount,
          );
    default:
      return null;
  }
}

function reconcileLineExtension(
  line: ExpenseEngineMathLineInputV1,
): Readonly<ExpenseEngineMathCheckV1> {
  const quantity = finiteNumber(line.quantity);
  const unitPrice = finiteNumber(line.unitPrice);
  const discountPercent = finiteNumber(line.discountPercent);
  const explicitNetUnitPrice = finiteNumber(line.netUnitPrice);
  const observedTotal = finiteNumber(line.total);
  const netUnitPrice =
    explicitNetUnitPrice ??
    (unitPrice !== null
      ? roundMoneySymmetric(
          unitPrice *
            (1 - Math.min(Math.max(discountPercent ?? 0, 0), 100) / 100),
        )
      : null);
  const expected =
    quantity !== null && netUnitPrice !== null
      ? roundMoneySymmetric(quantity * netUnitPrice)
      : null;
  return compareCheck("LINE_EXTENSIONS", expected, observedTotal);
}

function aggregateLineExtensions(
  checks: readonly Readonly<ExpenseEngineMathCheckV1>[],
): Readonly<ExpenseEngineMathCheckV1> {
  if (
    checks.length === 0 ||
    checks.every((check) => check.verdict === "INSUFFICIENT")
  ) {
    return checkResult("LINE_EXTENSIONS", "INSUFFICIENT", "UNKNOWN");
  }
  if (checks.some((check) => check.verdict === "MISMATCH")) {
    return checkResult("LINE_EXTENSIONS", "MISMATCH", "MATERIAL");
  }
  const residual = checks.some(
    (check) => check.residual === "ROUNDING_TOLERANCE",
  )
    ? "ROUNDING_TOLERANCE"
    : checks.some((check) => check.residual === "CENT_TOLERANCE")
      ? "CENT_TOLERANCE"
      : "EXACT";
  return checkResult("LINE_EXTENSIONS", "MATCH", residual);
}

function compareCheck(
  check: ExpenseEngineMathCheckKeyV1,
  expected: number | null,
  observed: number | null,
): Readonly<ExpenseEngineMathCheckV1> {
  if (expected === null || observed === null) {
    return checkResult(check, "INSUFFICIENT", "UNKNOWN");
  }
  const difference = Math.abs(roundMoneySymmetric(expected - observed));
  const residual = residualBucket(difference);
  return checkResult(
    check,
    difference <= EXPENSE_VAT_RECONCILIATION_TOLERANCE ? "MATCH" : "MISMATCH",
    residual,
  );
}

function signConsistencyCheck(
  taxBase: number | null,
  documentTotal: number | null,
): Readonly<ExpenseEngineMathCheckV1> {
  if (taxBase === null || documentTotal === null) {
    return checkResult("SIGN_CONSISTENCY", "INSUFFICIENT", "UNKNOWN");
  }
  const matches =
    taxBase === 0 ||
    documentTotal === 0 ||
    Math.sign(taxBase) === Math.sign(documentTotal);
  return checkResult(
    "SIGN_CONSISTENCY",
    matches ? "MATCH" : "MISMATCH",
    matches ? "EXACT" : "MATERIAL",
  );
}

function residualBucket(difference: number): ExpenseEngineMathResidualBucketV1 {
  if (difference === 0) return "EXACT";
  if (difference <= EXPENSE_VAT_RECONCILIATION_TOLERANCE) {
    return "CENT_TOLERANCE";
  }
  if (difference <= 0.05) return "ROUNDING_TOLERANCE";
  return "MATERIAL";
}

function checkResult(
  check: ExpenseEngineMathCheckKeyV1,
  verdict: ExpenseEngineMathVerdictV1,
  residual: ExpenseEngineMathResidualBucketV1,
): Readonly<ExpenseEngineMathCheckV1> {
  return Object.freeze({ check, verdict, residual });
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
