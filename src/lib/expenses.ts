import { roundMoney, roundMoneySymmetric } from "./calculations";
import { normalizeDocumentUnitId } from "./document-units";
import { isFixedExpense } from "./expense-classification";
import { explicitExpenseWorkAllocations } from "./expense-work-allocations";
import { supplierCompareKey } from "./supplier-normalization";
import {
  matchingPurchaseProducts,
  samePurchaseSupplier,
  samePurchaseLine,
  purchaseLinePrice,
} from "./purchase-price-matching";
import { currentPriceSource } from "./product-price-sources";
import type {
  Expense,
  ExpensePurchaseDocument,
  ExpensePurchaseLine,
  Product,
} from "./types";

export interface ExpenseTotals {
  base: number;
  iva: number;
  /** Cuota que consta en el documento cuando no coincide con el IVA recuperable. */
  documentIva?: number;
  /** Tipo de IVA que consta en el documento. */
  documentIvaPercent?: number;
  total: number;
  ivaPercent: number;
  /** Cuota de recargo separada; nunca se mezcla con base ni IVA. */
  recargoEquivalencia?: number;
  recargoEquivalenciaPercent?: number;
}

export const EXPENSE_VAT_RECONCILIATION_TOLERANCE = 0.02;
export const EXPENSE_PROVIDER_SUMMARY_TAX_TOLERANCE = 0.05;

export type ExpenseVatSource = "header" | "lines" | "blocked";

export type ExpenseVatIssue =
  | "mixed_vat_missing_rate"
  | "mixed_vat_invalid_line"
  | "mixed_vat_base_mismatch"
  | "provider_summary_tax_mismatch";

export interface ExpenseVatBreakdownRow {
  ivaPercent: number;
  base: number;
  iva: number;
  total: number;
  lineCount: number;
}

export interface ExpenseVatResolution {
  source: ExpenseVatSource;
  issue: ExpenseVatIssue | null;
  blocked: boolean;
  base: number;
  iva: number;
  total: number;
  /** Tipo legacy de cabecera; no representa por sí solo un desglose mixto. */
  headerIvaPercent: number;
  breakdown: ExpenseVatBreakdownRow[];
  /** Suma de bases de línea menos la base de cabecera. */
  reconciliationDifference: number;
}

export type ExpenseVatLineInput = Pick<
  ExpensePurchaseLine,
  "quantity" | "unitPrice" | "discountPercent" | "ivaPercent" | "total"
>;

export interface ExpenseVatInput {
  amount: number;
  ivaPercent: number;
  purchaseLines?: ExpenseVatLineInput[];
  businessKind?: Expense["businessKind"];
  deductibility?: Expense["deductibility"];
  origin?: Expense["origin"];
  recurringExpenseId?: Expense["recurringExpenseId"];
  providerSummary?: Expense["providerSummary"];
}

export interface ExpensePurchaseLinePriceAlert {
  lineId: string;
  description: string;
  previousDescription: string;
  currentUnitPrice: number;
  previousUnitPrice: number;
  priceChangePercent: number;
  currentDiscountPercent: number;
  previousDiscountPercent: number;
  discountChangePoints: number;
  previousExpenseDescription: string;
  previousExpenseDate: string;
  currentNetUnitCost: number;
  previousNetUnitCost: number;
  netCostChangePercent: number;
  previousQuantity?: number;
  baselineOrigin: "expense" | "catalog";
  previousListPriceKnown: boolean;
  previousDiscountKnown: boolean;
  missingDiscount: boolean;
}

export interface WorkDocumentExpenseSummary {
  count: number;
  cost: number;
  deductibleBase: number;
  deductibleIva: number;
}

export interface ExpenseFiscalAmounts {
  deductible: boolean;
  registeredBase: number;
  registeredIvaPercent: number;
  registeredIva: number;
  registeredTotal: number;
  /** Cuota de recargo registrada, presente solo cuando existe evidencia. */
  registeredEquivalenceSurcharge?: number;
  registeredEquivalenceSurchargePercent?: number;
  /** Importe que reduce la estimación de IRPF. */
  deductibleIrpfExpense: number;
  /** Base que admite deducción de IVA soportado. */
  deductibleVatBase: number;
  /** @deprecated Alias de `deductibleIrpfExpense` para consumidores existentes. */
  deductibleBase: number;
  deductibleIva: number;
  operatingCost: number;
  vatSource: ExpenseVatSource;
  vatIssue: ExpenseVatIssue | null;
  vatBlocked: boolean;
  vatBreakdown: ExpenseVatBreakdownRow[];
}

export interface PurchaseExpenseDuplicateCandidate {
  invoiceNumber?: string;
  supplierNif?: string | null;
  supplierName?: string;
  amount?: number;
}

export function normalizeExpenseAmount(value: number): number {
  return Number.isFinite(value) ? roundMoneySymmetric(value) : 0;
}

export function normalizeExpenseIvaPercent(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function expenseTotalsFromBase(
  amount: number,
  ivaPercent: number,
  vatExempt = false,
): ExpenseTotals {
  const base = normalizeExpenseAmount(amount);
  const rate = vatExempt ? 0 : normalizeExpenseIvaPercent(ivaPercent);
  const iva = roundMoneySymmetric(base * (rate / 100));
  return {
    base,
    iva,
    total: roundMoneySymmetric(base + iva),
    ivaPercent: rate,
  };
}

export function expenseTotals(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseTotals {
  const resolved = resolveExpenseVat(expense, vatExempt);
  const recargo = resolveExpenseEquivalenceSurcharge(expense);
  if (recargo.amount === 0) {
    return {
      base: resolved.base,
      iva: resolved.iva,
      total: resolved.total,
      ivaPercent: resolved.headerIvaPercent,
    };
  }

  const pendingOriginal =
    expense.providerSummary?.status === "pending_original";
  const documentVat = vatExempt ? resolveExpenseVat(expense, false) : resolved;
  const summaryIva = expense.providerSummary?.summaryIvaAmount;
  const hasExactSummaryIva = pendingOriginal && Number.isFinite(summaryIva);
  const documentIva = hasExactSummaryIva
    ? roundMoneySymmetric(summaryIva ?? 0)
    : documentVat.iva;
  const summaryIvaPercent = expense.providerSummary?.summaryIvaPercent;
  const documentIvaPercent =
    pendingOriginal && Number.isFinite(summaryIvaPercent)
      ? (summaryIvaPercent ?? documentVat.headerIvaPercent)
      : documentVat.headerIvaPercent;
  const iva = vatExempt ? 0 : documentIva;
  const summaryTotal = expense.providerSummary?.summaryInvoiceTotal;
  const total =
    (pendingOriginal || recargo.blocked) && Number.isFinite(summaryTotal)
      ? roundMoneySymmetric(summaryTotal ?? 0)
      : roundMoneySymmetric(resolved.base + documentIva + recargo.amount);

  return {
    base: resolved.base,
    iva,
    ...(vatExempt ? { documentIva, documentIvaPercent } : {}),
    total,
    ivaPercent: resolved.headerIvaPercent,
    recargoEquivalencia: recargo.amount,
    ...(recargo.percent === undefined
      ? {}
      : { recargoEquivalenciaPercent: recargo.percent }),
  };
}

export type ExpenseEquivalenceSurchargeSource =
  | "none"
  | "provider_summary"
  | "legacy_summary_total"
  | "blocked";

export interface ExpenseEquivalenceSurchargeResolution {
  source: ExpenseEquivalenceSurchargeSource;
  amount: number;
  percent?: number;
  blocked: boolean;
  issue: "provider_summary_tax_mismatch" | null;
}

const OFFICIAL_LEGACY_SURCHARGE_PAIRS = [
  { ivaPercent: 21, surchargePercent: 5.2 },
  { ivaPercent: 10, surchargePercent: 1.4 },
  { ivaPercent: 4, surchargePercent: 0.5 },
] as const;
const OFFICIAL_TOBACCO_SURCHARGE_PERCENT = 1.75;

function withinProviderSummaryTolerance(left: number, right: number): boolean {
  return (
    Math.abs(roundMoneySymmetric(left) - roundMoneySymmetric(right)) <=
    EXPENSE_PROVIDER_SUMMARY_TAX_TOLERANCE
  );
}

function hasSameMoneySign(value: number, base: number): boolean {
  return value === 0 || base === 0 || Math.sign(value) === Math.sign(base);
}

function isOfficialLegacySurchargeRate(
  ivaPercent: number,
  surchargePercent: number,
): boolean {
  return (
    OFFICIAL_LEGACY_SURCHARGE_PAIRS.some(
      (pair) =>
        withinProviderSummaryTolerance(ivaPercent, pair.ivaPercent) &&
        withinProviderSummaryTolerance(surchargePercent, pair.surchargePercent),
    ) ||
    withinProviderSummaryTolerance(
      surchargePercent,
      OFFICIAL_TOBACCO_SURCHARGE_PERCENT,
    )
  );
}

function blockedProviderSummarySurcharge(
  amount: number,
  percent?: number,
): ExpenseEquivalenceSurchargeResolution {
  return {
    source: "blocked",
    amount: roundMoneySymmetric(amount),
    ...(percent === undefined ? {} : { percent }),
    blocked: true,
    issue: "provider_summary_tax_mismatch",
  };
}

/**
 * Conserva el recargo del resumen como cuota separada. Los registros creados
 * antes de AUD-P2-26 no guardaban sus campos, pero sí total e IVA: en ellos la
 * diferencia firmada permite recuperar la cuota sin reescribir el gasto.
 */
export function resolveExpenseEquivalenceSurcharge(
  expense: ExpenseVatInput,
): ExpenseEquivalenceSurchargeResolution {
  const documentVat = resolveExpenseVatCore(expense, false);
  return resolveExpenseEquivalenceSurchargeWithVat(expense, documentVat);
}

function resolveExpenseEquivalenceSurchargeWithVat(
  expense: ExpenseVatInput,
  documentVat: ExpenseVatResolution,
): ExpenseEquivalenceSurchargeResolution {
  const providerSummary = expense.providerSummary;
  if (!providerSummary) {
    return { source: "none", amount: 0, blocked: false, issue: null };
  }

  const rawAmount = providerSummary.summaryRecargoAmount;
  const rawPercent = providerSummary.summaryRecargoPercent;
  const summaryTotal = providerSummary.summaryInvoiceTotal;
  const summaryIva = providerSummary.summaryIvaAmount;
  const base = documentVat.base;
  const hasExplicitSurcharge =
    rawAmount !== undefined || rawPercent !== undefined;
  const hasSummaryTaxEvidence =
    summaryTotal !== undefined || summaryIva !== undefined;
  const canReconcileSummary =
    Number.isFinite(summaryTotal) && Number.isFinite(summaryIva);
  const summaryDifference = canReconcileSummary
    ? roundMoneySymmetric((summaryTotal ?? 0) - base - (summaryIva ?? 0))
    : 0;
  const amount = Number.isFinite(rawAmount)
    ? roundMoneySymmetric(rawAmount ?? 0)
    : summaryDifference;
  const inferredPercent =
    base === 0
      ? undefined
      : Math.round(Math.abs((amount / base) * 100) * 10_000) / 10_000;
  const percent = Number.isFinite(rawPercent) ? rawPercent : inferredPercent;

  if (!canReconcileSummary) {
    return hasExplicitSurcharge || hasSummaryTaxEvidence
      ? blockedProviderSummarySurcharge(amount, percent)
      : { source: "none", amount: 0, blocked: false, issue: null };
  }

  const summaryIvaPercent = Number.isFinite(providerSummary.summaryIvaPercent)
    ? (providerSummary.summaryIvaPercent ?? documentVat.headerIvaPercent)
    : documentVat.headerIvaPercent;
  const summaryIvaMatchesDocument = withinProviderSummaryTolerance(
    summaryIva ?? 0,
    documentVat.iva,
  );
  const summaryIvaMatchesRate = withinProviderSummaryTolerance(
    summaryIva ?? 0,
    base * (summaryIvaPercent / 100),
  );
  const signsMatch =
    hasSameMoneySign(summaryTotal ?? 0, base) &&
    hasSameMoneySign(summaryIva ?? 0, base) &&
    hasSameMoneySign(amount, base);

  if (hasExplicitSurcharge) {
    const validPercent =
      percent !== undefined &&
      Number.isFinite(percent) &&
      percent > 0 &&
      percent <= 100;
    const surchargeMatchesRate =
      validPercent &&
      withinProviderSummaryTolerance(amount, base * (percent / 100));
    const totalReconciles = withinProviderSummaryTolerance(
      summaryTotal ?? 0,
      base + (summaryIva ?? 0) + amount,
    );
    if (
      !Number.isFinite(rawAmount) ||
      amount === 0 ||
      !validPercent ||
      !surchargeMatchesRate ||
      !summaryIvaMatchesDocument ||
      !summaryIvaMatchesRate ||
      !totalReconciles ||
      !signsMatch
    ) {
      return blockedProviderSummarySurcharge(amount, percent);
    }
    return {
      source: "provider_summary",
      amount,
      percent,
      blocked: false,
      issue: null,
    };
  }

  if (
    Math.abs(summaryDifference) <= EXPENSE_PROVIDER_SUMMARY_TAX_TOLERANCE &&
    summaryIvaMatchesDocument &&
    summaryIvaMatchesRate &&
    signsMatch
  ) {
    return { source: "none", amount: 0, blocked: false, issue: null };
  }

  if (
    providerSummary.status !== "pending_original" ||
    base === 0 ||
    percent === undefined ||
    !Number.isFinite(percent) ||
    !isOfficialLegacySurchargeRate(summaryIvaPercent, percent) ||
    !summaryIvaMatchesDocument ||
    !summaryIvaMatchesRate ||
    !signsMatch
  ) {
    return blockedProviderSummarySurcharge(summaryDifference, percent);
  }
  return {
    source: "legacy_summary_total",
    amount: summaryDifference,
    percent,
    blocked: false,
    issue: null,
  };
}

/**
 * Compatibilidad legacy: los gastos anteriores a la marca se consideran
 * deducibles. Cualquier valor persistido distinto del enum conocido queda
 * fuera de fiscalidad de forma conservadora.
 */
export function isExpenseFiscalDeductible(
  expense: Pick<Expense, "deductibility">,
): boolean {
  return (
    expense.deductibility === undefined ||
    expense.deductibility === "deductible"
  );
}

/** Los valores legacy sin marca pertenecen a la actividad y eran deducibles. */
export function isExpenseBusinessRelated(
  expense: Pick<Expense, "deductibility">,
): boolean {
  return expense.deductibility !== "personal";
}

export function expenseFiscalTreatmentLabel(
  expense: Pick<Expense, "deductibility">,
): "Deducible" | "Empresa, no deducible" | "Personal / no empresarial" {
  if (isExpenseFiscalDeductible(expense)) return "Deducible";
  return isExpenseBusinessRelated(expense)
    ? "Empresa, no deducible"
    : "Personal / no empresarial";
}

/** Separa el coste registrado del importe que puede alimentar fiscalidad. */
export function expenseFiscalAmounts(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseFiscalAmounts {
  const vat = resolveExpenseVat(expense, vatExempt);
  const totals = expenseTotals(expense, vatExempt);
  const deductible = isExpenseFiscalDeductible(expense);
  const recargo = totals.recargoEquivalencia ?? 0;
  const hasEquivalenceSurcharge = recargo !== 0;
  const registeredIva = totals.documentIva ?? totals.iva;
  const deductibleIrpfExpense = deductible
    ? hasEquivalenceSurcharge && !vat.blocked
      ? totals.total
      : vat.base
    : 0;
  const deductibleVatBase =
    deductible && !vat.blocked && !hasEquivalenceSurcharge ? vat.base : 0;

  return {
    deductible,
    registeredBase: totals.base,
    registeredIvaPercent: totals.documentIvaPercent ?? totals.ivaPercent,
    registeredIva,
    registeredTotal: totals.total,
    ...(hasEquivalenceSurcharge
      ? {
          registeredEquivalenceSurcharge: recargo,
          ...(totals.recargoEquivalenciaPercent === undefined
            ? {}
            : {
                registeredEquivalenceSurchargePercent:
                  totals.recargoEquivalenciaPercent,
              }),
        }
      : {}),
    deductibleIrpfExpense,
    deductibleVatBase,
    deductibleBase: deductibleIrpfExpense,
    deductibleIva:
      deductible && !vat.blocked && !hasEquivalenceSurcharge ? vat.iva : 0,
    operatingCost: !isExpenseBusinessRelated(expense)
      ? 0
      : deductible && !vat.blocked && !hasEquivalenceSurcharge
        ? vat.base
        : totals.total,
    vatSource: vat.source,
    vatIssue: vat.issue,
    vatBlocked: vat.blocked,
    vatBreakdown: vat.breakdown,
  };
}

export function expensePurchaseLineBaseTotal(
  line: Pick<
    ExpensePurchaseLine,
    "quantity" | "unitPrice" | "discountPercent" | "total"
  >,
): number {
  if (Number.isFinite(line.total) && (line.total ?? 0) !== 0) {
    return roundMoneySymmetric(line.total ?? 0);
  }

  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
  const unitPrice = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
  const discountPercent = Number.isFinite(line.discountPercent)
    ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
    : 0;

  return roundMoneySymmetric(
    quantity * unitPrice * (1 - discountPercent / 100),
  );
}

export function expensePurchaseLinesBaseTotal(
  lines: ExpensePurchaseLine[] = [],
): number {
  return roundMoneySymmetric(
    lines.reduce((sum, line) => sum + expensePurchaseLineBaseTotal(line), 0),
  );
}

function isValidExpenseLineIvaPercent(
  value: number | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function normalizedBreakdownRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function isExpenseVatLineInput(value: unknown): value is ExpenseVatLineInput {
  return typeof value === "object" && value !== null;
}

function explicitRuntimeIvaRate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizedBreakdownRate(value);
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? normalizedBreakdownRate(parsed) : null;
}

function expenseLineHasValidSignedBase(
  line: unknown,
): line is ExpenseVatLineInput {
  if (!isExpenseVatLineInput(line)) return false;
  if (line.total !== undefined && !Number.isFinite(line.total)) {
    return false;
  }
  if (line.total === 0) return false;
  if (line.total === undefined) {
    if (!Number.isFinite(line.quantity) || !Number.isFinite(line.unitPrice)) {
      return false;
    }
    if (
      line.discountPercent !== undefined &&
      (!Number.isFinite(line.discountPercent) ||
        line.discountPercent < 0 ||
        line.discountPercent > 100)
    ) {
      return false;
    }
  }
  const base = expensePurchaseLineBaseTotal(line);
  return Number.isFinite(base) && base !== 0;
}

function buildExpenseVatBreakdown(lines: unknown[]): ExpenseVatBreakdownRow[] {
  const byRate = new Map<number, ExpenseVatBreakdownRow>();

  for (const line of lines) {
    if (!isExpenseVatLineInput(line)) continue;
    if (
      !isValidExpenseLineIvaPercent(line.ivaPercent) ||
      !expenseLineHasValidSignedBase(line)
    ) {
      continue;
    }
    const ivaPercent = normalizedBreakdownRate(line.ivaPercent);
    const base = expensePurchaseLineBaseTotal(line);
    const current = byRate.get(ivaPercent) ?? {
      ivaPercent,
      base: 0,
      iva: 0,
      total: 0,
      lineCount: 0,
    };
    current.base += base;
    current.lineCount += 1;
    byRate.set(ivaPercent, current);
  }

  return [...byRate.values()]
    .map((row) => {
      const base = roundMoneySymmetric(row.base);
      const iva = roundMoneySymmetric(base * (row.ivaPercent / 100));
      return {
        ...row,
        base,
        iva,
        total: roundMoneySymmetric(base + iva),
      };
    })
    .sort((left, right) => right.ivaPercent - left.ivaPercent);
}

function headerExpenseVatResolution(
  expense: ExpenseVatInput,
  vatExempt: boolean,
): ExpenseVatResolution {
  const header = expenseTotalsFromBase(
    expense.amount,
    expense.ivaPercent,
    vatExempt,
  );
  return {
    source: "header",
    issue: null,
    blocked: false,
    base: header.base,
    iva: header.iva,
    total: header.total,
    headerIvaPercent: header.ivaPercent,
    breakdown: [
      {
        ivaPercent: header.ivaPercent,
        base: header.base,
        iva: header.iva,
        total: header.total,
        lineCount: 0,
      },
    ],
    reconciliationDifference: 0,
  };
}

function blockedExpenseVatResolution(
  expense: ExpenseVatInput,
  issue: ExpenseVatIssue,
  breakdown: ExpenseVatBreakdownRow[],
  reconciliationDifference: number,
): ExpenseVatResolution {
  const header = expenseTotalsFromBase(
    expense.amount,
    expense.ivaPercent,
    false,
  );
  return {
    source: "blocked",
    issue,
    blocked: true,
    base: header.base,
    iva: header.iva,
    total: header.total,
    headerIvaPercent: header.ivaPercent,
    breakdown,
    reconciliationDifference,
  };
}

/**
 * Resuelve el IVA registrado de un gasto sin reescribir datos legacy.
 *
 * Un desglose firmado, completo y conciliado gobierna el IVA aunque use un
 * único tipo. Si el desglose está incompleto, solo conserva la cabecera cuando
 * ninguna evidencia de línea contradice su tipo o el signo neto del documento;
 * cualquier conflicto queda bloqueado para que una exportación fiscal no pueda
 * ocultarlo. Los gastos fijos no deducibles (incluidas ocurrencias legacy
 * enlazadas a su plantilla) conservan el contrato P1-06 de importe íntegro e
 * IVA cero sin reescribir sus líneas documentales.
 */
function resolveExpenseVatCore(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseVatResolution {
  const base = normalizeExpenseAmount(expense.amount);
  if (isFixedExpense(expense) && !isExpenseFiscalDeductible(expense)) {
    return headerExpenseVatResolution(expense, true);
  }
  if (vatExempt || base === 0) {
    return headerExpenseVatResolution(expense, vatExempt);
  }

  const lines: unknown[] = Array.isArray(expense.purchaseLines)
    ? expense.purchaseLines
    : [];
  if (lines.length === 0) {
    return headerExpenseVatResolution(expense, false);
  }

  const explicitRates = new Set(
    lines
      .map((line) =>
        explicitRuntimeIvaRate(
          isExpenseVatLineInput(line) ? line.ivaPercent : undefined,
        ),
      )
      .filter((value): value is number => value !== null),
  );
  const headerIvaPercent = normalizedBreakdownRate(
    normalizeExpenseIvaPercent(expense.ivaPercent),
  );
  const hasConflictingVatEvidence =
    explicitRates.size > 1 ||
    [...explicitRates].some((rate) => rate !== headerIvaPercent);

  const breakdown = buildExpenseVatBreakdown(lines);
  const lineBase = roundMoneySymmetric(
    lines.reduce<number>(
      (sum, line) =>
        sum +
        (expenseLineHasValidSignedBase(line)
          ? expensePurchaseLineBaseTotal(line)
          : 0),
      0,
    ),
  );
  const reconciliationDifference = roundMoneySymmetric(lineBase - base);
  const hasMissingRate = lines.some(
    (line) => isExpenseVatLineInput(line) && line.ivaPercent === undefined,
  );
  const hasInvalidLine = lines.some(
    (line) =>
      !isExpenseVatLineInput(line) ||
      !isValidExpenseLineIvaPercent(line.ivaPercent) ||
      !expenseLineHasValidSignedBase(line),
  );
  const hasBaseMismatch =
    Math.abs(reconciliationDifference) > EXPENSE_VAT_RECONCILIATION_TOLERANCE;
  const hasOppositeNetSign =
    lineBase !== 0 && Math.sign(lineBase) !== Math.sign(base);

  if (hasOppositeNetSign) {
    return blockedExpenseVatResolution(
      expense,
      "mixed_vat_base_mismatch",
      breakdown,
      reconciliationDifference,
    );
  }

  if (hasMissingRate || hasInvalidLine || hasBaseMismatch) {
    if (!hasConflictingVatEvidence) {
      return headerExpenseVatResolution(expense, false);
    }
    const issue: ExpenseVatIssue = hasMissingRate
      ? "mixed_vat_missing_rate"
      : hasInvalidLine
        ? "mixed_vat_invalid_line"
        : "mixed_vat_base_mismatch";
    return blockedExpenseVatResolution(
      expense,
      issue,
      breakdown,
      reconciliationDifference,
    );
  }

  const iva = roundMoneySymmetric(
    breakdown.reduce((sum, row) => sum + row.iva, 0),
  );
  return {
    source: "lines",
    issue: null,
    blocked: false,
    base,
    iva,
    total: roundMoneySymmetric(base + iva),
    headerIvaPercent: normalizeExpenseIvaPercent(expense.ivaPercent),
    breakdown,
    reconciliationDifference,
  };
}

export function resolveExpenseVat(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseVatResolution {
  const resolved = resolveExpenseVatCore(expense, vatExempt);
  const documentVat = vatExempt
    ? resolveExpenseVatCore(expense, false)
    : resolved;
  const providerTax = resolveExpenseEquivalenceSurchargeWithVat(
    expense,
    documentVat,
  );
  if (providerTax.blocked) {
    return {
      ...resolved,
      source: "blocked",
      issue: "provider_summary_tax_mismatch",
      blocked: true,
    };
  }

  const summaryIva = expense.providerSummary?.summaryIvaAmount;
  if (
    !vatExempt &&
    expense.providerSummary?.status === "pending_original" &&
    resolved.source === "header" &&
    Number.isFinite(summaryIva)
  ) {
    const iva = roundMoneySymmetric(summaryIva ?? 0);
    const summaryIvaPercent = expense.providerSummary.summaryIvaPercent;
    const ivaPercent = Number.isFinite(summaryIvaPercent)
      ? (summaryIvaPercent ?? resolved.headerIvaPercent)
      : resolved.headerIvaPercent;
    return {
      ...resolved,
      iva,
      total: roundMoneySymmetric(resolved.base + iva),
      headerIvaPercent: ivaPercent,
      breakdown: [
        {
          ivaPercent,
          base: resolved.base,
          iva,
          total: roundMoneySymmetric(resolved.base + iva),
          lineCount: 0,
        },
      ],
    };
  }

  return resolved;
}

export function isExpenseMixedVatBlocked(
  expense: ExpenseVatInput,
  vatExempt = false,
): boolean {
  return resolveExpenseVat(expense, vatExempt).blocked;
}

export function expensePurchaseLineTracksProduct(
  line: Pick<ExpensePurchaseLine, "catalogProduct">,
): boolean {
  return line.catalogProduct !== false;
}

type ExpenseProductCatalogPriceLine = Pick<
  ExpensePurchaseLine,
  "quantity" | "unitPrice" | "discountPercent" | "netUnitPrice" | "total"
>;

function expensePurchaseLineCatalogNetUnitCost(
  line: ExpenseProductCatalogPriceLine,
): number {
  const discount = Number.isFinite(line.discountPercent)
    ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
    : 0;
  if (Number.isFinite(line.unitPrice) && line.unitPrice > 0) {
    return roundMoneySymmetric(line.unitPrice * (1 - discount / 100));
  }

  const quantity = line.quantity || 1;
  if (
    line.total !== undefined &&
    Number.isFinite(line.total) &&
    line.total > 0 &&
    quantity > 0
  ) {
    return roundMoneySymmetric(line.total / quantity);
  }

  return 0;
}

/** Un abono conserva sus cálculos fiscales, pero nunca alimenta Productos. */
export function expenseCanFeedProductCatalog(
  expense: Pick<Expense, "amount">,
): boolean {
  return Number.isFinite(expense.amount) && expense.amount > 0;
}

export function expensePurchaseLineIsEligibleForProductCatalog(
  expense: Pick<Expense, "amount">,
  line: ExpenseProductCatalogPriceLine,
): boolean {
  return (
    expenseCanFeedProductCatalog(expense) &&
    expensePurchaseLineBaseTotal(line) > 0 &&
    expensePurchaseLineCatalogNetUnitCost(line) > 0 &&
    (line.netUnitPrice === undefined || line.netUnitPrice > 0)
  );
}

/** Única frontera para decidir si una línea seleccionada alimenta Productos. */
export function expensePurchaseLineCanFeedProductCatalog(
  expense: Pick<Expense, "amount">,
  line: ExpenseProductCatalogPriceLine &
    Pick<ExpensePurchaseLine, "catalogProduct">,
): boolean {
  return (
    expensePurchaseLineTracksProduct(line) &&
    expensePurchaseLineIsEligibleForProductCatalog(expense, line)
  );
}

export function summarizeWorkDocumentExpenses(
  expenses: Expense[],
  documentId: string,
): WorkDocumentExpenseSummary {
  return (
    summarizeWorkDocumentExpensesById(expenses).get(documentId) ?? {
      count: 0,
      cost: 0,
      deductibleBase: 0,
      deductibleIva: 0,
    }
  );
}

export function summarizeWorkDocumentExpensesById(
  expenses: Expense[],
): Map<string, WorkDocumentExpenseSummary> {
  const summaries = new Map<string, WorkDocumentExpenseSummary>();

  for (const expense of expenses) {
    const fiscal = expenseFiscalAmounts(expense);
    const explicit = explicitExpenseWorkAllocations(expense);
    const allocations =
      explicit.length > 0
        ? explicit
        : expense.workDocumentId
          ? [
              {
                workDocumentId: expense.workDocumentId,
                amount: fiscal.operatingCost,
                allocatedAt: expense.createdAt,
              },
            ]
          : [];

    for (const allocation of allocations) {
      const current = summaries.get(allocation.workDocumentId) ?? {
        count: 0,
        cost: 0,
        deductibleBase: 0,
        deductibleIva: 0,
      };
      const ratio =
        fiscal.operatingCost === 0
          ? 0
          : Math.min(Math.abs(allocation.amount / fiscal.operatingCost), 1);
      summaries.set(allocation.workDocumentId, {
        count: current.count + 1,
        cost: roundMoneySymmetric(current.cost + allocation.amount),
        deductibleBase: roundMoneySymmetric(
          current.deductibleBase + fiscal.deductibleBase * ratio,
        ),
        deductibleIva: roundMoneySymmetric(
          current.deductibleIva + fiscal.deductibleIva * ratio,
        ),
      });
    }
  }

  return summaries;
}

export function sanitizeExpensePurchaseLines(
  lines: ExpensePurchaseLine[] = [],
): ExpensePurchaseLine[] {
  return lines
    .map((line) => ({
      ...line,
      supplierReference: line.supplierReference?.trim() || undefined,
      description: line.description.trim(),
      catalogProduct:
        line.catalogProduct === true
          ? true
          : line.catalogProduct === false
            ? false
            : undefined,
      updateCatalogCost:
        typeof line.updateCatalogCost === "boolean"
          ? line.updateCatalogCost
          : undefined,
      quantity: normalizeExpenseAmount(line.quantity),
      unit:
        normalizeDocumentUnitId(line.unit) ?? line.unit?.trim() ?? undefined,
      unitPrice: normalizeExpenseAmount(line.unitPrice),
      discountPercent: Number.isFinite(line.discountPercent)
        ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
        : undefined,
      // Conserva evidencia importada fuera de rango para que `resolveExpenseVat`
      // la bloquee; convertirla silenciosamente en 0 % sería fail-open.
      ivaPercent: Number.isFinite(line.ivaPercent)
        ? line.ivaPercent
        : undefined,
      total:
        Number.isFinite(line.total) && (line.total ?? 0) !== 0
          ? roundMoneySymmetric(line.total ?? 0)
          : undefined,
    }))
    .filter(
      (line) =>
        line.description.length > 0 &&
        line.quantity !== 0 &&
        (line.unitPrice !== 0 || (line.total ?? 0) !== 0),
    );
}

export function sanitizeExpensePurchaseDocument(
  document: ExpensePurchaseDocument = {},
): ExpensePurchaseDocument | undefined {
  const sanitized: ExpensePurchaseDocument = {
    invoiceNumber: document.invoiceNumber?.trim() || undefined,
    issueDate: document.issueDate?.trim() || undefined,
    dueDate: document.dueDate?.trim() || undefined,
    supplierNif: document.supplierNif?.trim() || undefined,
    supplierAddress: document.supplierAddress?.trim() || undefined,
    supplierPostalCode: document.supplierPostalCode?.trim() || undefined,
    supplierCity: document.supplierCity?.trim() || undefined,
    paymentTerms: document.paymentTerms?.trim() || undefined,
  };

  return Object.values(sanitized).some(Boolean) ? sanitized : undefined;
}

function normalizeDuplicateText(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeDuplicateSupplierName(value?: string | null): string {
  return value ? supplierCompareKey(value) : "";
}

function normalizeDuplicateAmount(value?: number): number | undefined {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? roundMoney(value ?? 0)
    : undefined;
}

export function purchaseExpenseDuplicateMatches(
  current: PurchaseExpenseDuplicateCandidate,
  previous: PurchaseExpenseDuplicateCandidate,
): boolean {
  const currentInvoice = normalizeDuplicateText(current.invoiceNumber);
  const previousInvoice = normalizeDuplicateText(previous.invoiceNumber);
  if (!currentInvoice || currentInvoice !== previousInvoice) return false;

  const currentNif = normalizeDuplicateText(current.supplierNif);
  const previousNif = normalizeDuplicateText(previous.supplierNif);
  if (currentNif && previousNif && currentNif === previousNif) return true;

  const currentAmount = normalizeDuplicateAmount(current.amount);
  const previousAmount = normalizeDuplicateAmount(previous.amount);
  if (
    currentAmount !== undefined &&
    previousAmount !== undefined &&
    Math.abs(currentAmount - previousAmount) < 0.01
  ) {
    return true;
  }

  const currentSupplier = normalizeDuplicateSupplierName(current.supplierName);
  const previousSupplier = normalizeDuplicateSupplierName(
    previous.supplierName,
  );
  return Boolean(
    currentSupplier && previousSupplier && currentSupplier === previousSupplier,
  );
}

export function findDuplicatePurchaseExpense(
  expenses: Expense[],
  candidate: PurchaseExpenseDuplicateCandidate,
  options: { excludeExpenseId?: string } = {},
): Expense | null {
  return (
    expenses.find((expense) => {
      if (expense.id === options.excludeExpenseId) return false;
      return purchaseExpenseDuplicateMatches(candidate, {
        invoiceNumber: expense.purchaseDocument?.invoiceNumber,
        supplierNif: expense.purchaseDocument?.supplierNif,
        supplierName: expense.supplierName,
        amount: expense.amount,
      });
    }) ?? null
  );
}

/** Compares the same supplier, reference/model and purchase unit. No fuzzy search. */
export function findExpensePurchaseLinePriceAlerts(input: {
  currentLines: ExpensePurchaseLine[];
  currentExpenseAmount: number;
  currentExpenseDate?: string;
  expenses: Expense[];
  products?: Product[];
  supplierId?: string;
  supplierName?: string;
  excludeExpenseId?: string;
  priceChangeThresholdPercent?: number;
  discountChangeThresholdPoints?: number;
}): ExpensePurchaseLinePriceAlert[] {
  const priceThreshold = input.priceChangeThresholdPercent ?? 15;
  const discountThreshold = input.discountChangeThresholdPoints ?? 5;
  const currentExpense = { amount: input.currentExpenseAmount };
  const previousExpenses = input.expenses
    .filter(
      (expense) =>
        expense.id !== input.excludeExpenseId &&
        (!input.currentExpenseDate || expense.date <= input.currentExpenseDate),
    )
    .filter((expense) => samePurchaseSupplier(expense, input))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id),
    );
  return sanitizeExpensePurchaseLines(input.currentLines).flatMap((line) => {
    if (!expensePurchaseLineIsEligibleForProductCatalog(currentExpense, line))
      return [];
    const products = matchingPurchaseProducts(
      line,
      input,
      input.products ?? [],
    );
    const product = products.length === 1 ? products[0] : undefined;
    // The scan's admission checkbox only controls new articles. Known articles
    // still need invoice checks even when they are not being admitted again.
    if (line.catalogProduct === false && !product) return [];
    const current = purchaseLinePrice(line);
    if (!current) return [];
    const previousMatch = previousExpenses
      .flatMap((expense) =>
        sanitizeExpensePurchaseLines(expense.purchaseLines)
          .filter(
            (previous) =>
              expensePurchaseLineIsEligibleForProductCatalog(
                expense,
                previous,
              ) &&
              (previous.catalogProduct !== false || !!product),
          )
          .filter(
            (previous) =>
              samePurchaseLine(line, previous) ||
              (!!product &&
                matchingPurchaseProducts(previous, expense, [product])
                  .length === 1),
          )
          .map((previous) => ({ expense, previous })),
      )
      .find((entry) => purchaseLinePrice(entry.previous)?.consistent);
    const history = previousMatch
      ? purchaseLinePrice(previousMatch.previous)
      : null;
    const source = product ? currentPriceSource(product) : undefined;
    const sourceDate = source?.documentDate ?? source?.recordedAt.slice(0, 10);
    const useCatalog =
      !!product &&
      (!history || (!!sourceDate && sourceDate >= previousMatch!.expense.date));
    const storedCost = product?.purchase?.netUnitCost ?? product?.cost;
    const catalogList = product?.purchase?.listPrice ?? product?.pvp;
    const catalogDiscount = product?.purchase?.discountPercent;
    const previousNet = useCatalog ? storedCost : history?.net;
    if (
      previousNet === undefined ||
      !Number.isFinite(previousNet) ||
      previousNet <= 0
    )
      return [];
    const listKnown = useCatalog ? catalogList !== undefined : true;
    const discountKnown = useCatalog ? catalogDiscount !== undefined : true;
    const previousList = useCatalog
      ? (catalogList ?? current.list)
      : history!.list;
    const previousDiscount = useCatalog
      ? (catalogDiscount ?? current.discount)
      : history!.discount;
    const priceChangePercent =
      previousList > 0 && listKnown
        ? ((current.list - previousList) / previousList) * 100
        : 0;
    const netCostChangePercent =
      ((current.net - previousNet) / previousNet) * 100;
    const discountChangePoints = discountKnown
      ? current.discount - previousDiscount
      : 0;
    const missingDiscount =
      discountKnown &&
      previousDiscount > 0 &&
      (line.discountPercent === undefined || line.discountPercent === 0);
    if (
      Math.abs(priceChangePercent) < priceThreshold &&
      Math.abs(netCostChangePercent) < priceThreshold &&
      Math.abs(discountChangePoints) < discountThreshold &&
      !missingDiscount
    )
      return [];
    return [
      {
        lineId: line.id,
        description: line.description,
        previousDescription: useCatalog
          ? product!.name
          : previousMatch!.previous.description,
        currentUnitPrice: current.list,
        previousUnitPrice: previousList,
        priceChangePercent: roundMoney(priceChangePercent),
        currentDiscountPercent: current.discount,
        previousDiscountPercent: previousDiscount,
        discountChangePoints: roundMoney(discountChangePoints),
        currentNetUnitCost: current.net,
        previousNetUnitCost: previousNet,
        netCostChangePercent: roundMoney(netCostChangePercent),
        previousQuantity: useCatalog
          ? undefined
          : (previousMatch!.previous.sourceQuantity ??
            previousMatch!.previous.quantity),
        previousExpenseDescription: useCatalog
          ? `Ficha de producto${source?.documentNumber ? ` · ${source.documentNumber}` : ""}`
          : previousMatch!.expense.description,
        previousExpenseDate: useCatalog
          ? (sourceDate ?? "sin fecha documentada")
          : previousMatch!.expense.date,
        baselineOrigin: useCatalog
          ? ("catalog" as const)
          : ("expense" as const),
        previousListPriceKnown: listKnown,
        previousDiscountKnown: discountKnown,
        missingDiscount,
      },
    ];
  });
}
