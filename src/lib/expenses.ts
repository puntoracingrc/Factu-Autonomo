import { roundMoney } from "./calculations";
import { normalizeDocumentUnitId } from "./document-units";
import { isFixedExpense } from "./expense-classification";
import { supplierCompareKey } from "./supplier-normalization";
import type {
  Expense,
  ExpensePurchaseDocument,
  ExpensePurchaseLine,
} from "./types";

export interface ExpenseTotals {
  base: number;
  iva: number;
  total: number;
  ivaPercent: number;
}

export const EXPENSE_VAT_RECONCILIATION_TOLERANCE = 0.02;

export type ExpenseVatSource = "header" | "lines" | "blocked";

export type ExpenseVatIssue =
  | "mixed_vat_missing_rate"
  | "mixed_vat_invalid_line"
  | "mixed_vat_base_mismatch";

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
  return Number.isFinite(value) ? roundMoney(value) : 0;
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
  const iva = roundMoney(base * (rate / 100));
  return {
    base,
    iva,
    total: roundMoney(base + iva),
    ivaPercent: rate,
  };
}

export function expenseTotals(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseTotals {
  const resolved = resolveExpenseVat(expense, vatExempt);
  return {
    base: resolved.base,
    iva: resolved.iva,
    total: resolved.total,
    ivaPercent: resolved.headerIvaPercent,
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

/** Separa el coste registrado del importe que puede alimentar fiscalidad. */
export function expenseFiscalAmounts(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseFiscalAmounts {
  const vat = resolveExpenseVat(expense, vatExempt);
  const deductible = isExpenseFiscalDeductible(expense);

  return {
    deductible,
    registeredBase: vat.base,
    registeredIvaPercent: vat.headerIvaPercent,
    registeredIva: vat.iva,
    registeredTotal: vat.total,
    deductibleBase: deductible ? vat.base : 0,
    deductibleIva: deductible && !vat.blocked ? vat.iva : 0,
    operatingCost: deductible && !vat.blocked ? vat.base : vat.total,
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
    return roundMoney(line.total ?? 0);
  }

  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
  const unitPrice = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
  const discountPercent = Number.isFinite(line.discountPercent)
    ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
    : 0;

  return roundMoney(quantity * unitPrice * (1 - discountPercent / 100));
}

export function expensePurchaseLinesBaseTotal(
  lines: ExpensePurchaseLine[] = [],
): number {
  return roundMoney(
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

function expenseLineHasValidPositiveBase(
  line: unknown,
): line is ExpenseVatLineInput {
  if (!isExpenseVatLineInput(line)) return false;
  if (
    line.total !== undefined &&
    (!Number.isFinite(line.total) || line.total <= 0)
  ) {
    return false;
  }
  if (line.total === undefined || line.total === 0) {
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
  return Number.isFinite(base) && base > 0;
}

function buildExpenseVatBreakdown(
  lines: unknown[],
): ExpenseVatBreakdownRow[] {
  const byRate = new Map<number, ExpenseVatBreakdownRow>();

  for (const line of lines) {
    if (!isExpenseVatLineInput(line)) continue;
    if (
      !isValidExpenseLineIvaPercent(line.ivaPercent) ||
      !expenseLineHasValidPositiveBase(line)
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
      const base = roundMoney(row.base);
      const iva = roundMoney(base * (row.ivaPercent / 100));
      return {
        ...row,
        base,
        iva,
        total: roundMoney(base + iva),
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
 * Un desglose positivo, completo y conciliado gobierna el IVA aunque use un
 * único tipo. Si el desglose está incompleto, solo conserva la cabecera cuando
 * ninguna evidencia de línea contradice su tipo; cualquier conflicto queda
 * bloqueado para que una exportación fiscal no pueda ocultarlo. Los gastos
 * fijos no deducibles (incluidas ocurrencias legacy enlazadas a su plantilla)
 * conservan el contrato P1-06 de importe íntegro e IVA cero sin reescribir sus
 * líneas documentales. Los abonos conservan el contrato legacy hasta AUD-P1-13.
 */
export function resolveExpenseVat(
  expense: ExpenseVatInput,
  vatExempt = false,
): ExpenseVatResolution {
  const base = normalizeExpenseAmount(expense.amount);
  if (
    isFixedExpense(expense) &&
    expense.deductibility === "non_deductible"
  ) {
    return headerExpenseVatResolution(expense, true);
  }
  if (vatExempt || base <= 0) {
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
  const lineBase = roundMoney(
    lines.reduce<number>(
      (sum, line) =>
        sum +
        (expenseLineHasValidPositiveBase(line)
          ? expensePurchaseLineBaseTotal(line)
          : 0),
      0,
    ),
  );
  const reconciliationDifference = roundMoney(lineBase - base);
  const hasMissingRate = lines.some(
    (line) =>
      isExpenseVatLineInput(line) && line.ivaPercent === undefined,
  );
  const hasInvalidLine = lines.some(
    (line) =>
      !isExpenseVatLineInput(line) ||
      !isValidExpenseLineIvaPercent(line.ivaPercent) ||
      !expenseLineHasValidPositiveBase(line),
  );
  const hasBaseMismatch =
    Math.abs(reconciliationDifference) >
    EXPENSE_VAT_RECONCILIATION_TOLERANCE;

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

  const iva = roundMoney(
    breakdown.reduce((sum, row) => sum + row.iva, 0),
  );
  return {
    source: "lines",
    issue: null,
    blocked: false,
    base,
    iva,
    total: roundMoney(base + iva),
    headerIvaPercent: normalizeExpenseIvaPercent(expense.ivaPercent),
    breakdown,
    reconciliationDifference,
  };
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
  | "quantity"
  | "unitPrice"
  | "discountPercent"
  | "netUnitPrice"
  | "total"
>;

function expensePurchaseLineCatalogNetUnitCost(
  line: ExpenseProductCatalogPriceLine,
): number {
  const discount = Number.isFinite(line.discountPercent)
    ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
    : 0;
  if (Number.isFinite(line.unitPrice) && line.unitPrice > 0) {
    return roundMoney(line.unitPrice * (1 - discount / 100));
  }

  const quantity = line.quantity || 1;
  if (
    line.total !== undefined &&
    Number.isFinite(line.total) &&
    line.total > 0 &&
    quantity > 0
  ) {
    return roundMoney(line.total / quantity);
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
    if (!expense.workDocumentId) continue;
    const current = summaries.get(expense.workDocumentId) ?? {
      count: 0,
      cost: 0,
      deductibleBase: 0,
      deductibleIva: 0,
    };
    const fiscal = expenseFiscalAmounts(expense);
    summaries.set(expense.workDocumentId, {
      count: current.count + 1,
      cost: roundMoney(current.cost + fiscal.operatingCost),
      deductibleBase: roundMoney(
        current.deductibleBase + fiscal.deductibleBase,
      ),
      deductibleIva: roundMoney(
        current.deductibleIva + fiscal.deductibleIva,
      ),
    });
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
      quantity: normalizeExpenseAmount(line.quantity),
      unit:
        normalizeDocumentUnitId(line.unit) ?? line.unit?.trim() ?? undefined,
      unitPrice: normalizeExpenseAmount(line.unitPrice),
      discountPercent: Number.isFinite(line.discountPercent)
        ? Math.min(Math.max(line.discountPercent ?? 0, 0), 100)
        : undefined,
      ivaPercent: Number.isFinite(line.ivaPercent)
        ? normalizeExpenseIvaPercent(line.ivaPercent ?? 0)
        : undefined,
      total:
        Number.isFinite(line.total) && (line.total ?? 0) !== 0
          ? roundMoney(line.total ?? 0)
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
  const previousSupplier = normalizeDuplicateSupplierName(previous.supplierName);
  return Boolean(
    currentSupplier &&
      previousSupplier &&
      currentSupplier === previousSupplier,
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

function purchaseLineSearchKey(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 2)
    .join(" ");
}

function purchaseLineKeysMatch(current: string, previous: string): boolean {
  if (!current || !previous) return false;
  if (current === previous) return true;
  return current.includes(previous) || previous.includes(current);
}

function expenseSupplierMatches(
  expense: Expense,
  options: { supplierId?: string; supplierName?: string },
): boolean {
  if (options.supplierId) return expense.supplierId === options.supplierId;
  const supplierName = options.supplierName?.trim().toLowerCase();
  if (!supplierName) return false;
  return expense.supplierName.trim().toLowerCase() === supplierName;
}

export function findExpensePurchaseLinePriceAlerts(input: {
  currentLines: ExpensePurchaseLine[];
  currentExpenseAmount: number;
  expenses: Expense[];
  supplierId?: string;
  supplierName?: string;
  excludeExpenseId?: string;
  priceChangeThresholdPercent?: number;
  discountChangeThresholdPoints?: number;
}): ExpensePurchaseLinePriceAlert[] {
  const priceThreshold = input.priceChangeThresholdPercent ?? 15;
  const discountThreshold = input.discountChangeThresholdPoints ?? 5;
  const currentExpense = { amount: input.currentExpenseAmount };
  const currentLines = sanitizeExpensePurchaseLines(input.currentLines).filter(
    (line) =>
      expensePurchaseLineCanFeedProductCatalog(currentExpense, line),
  );

  const previousExpenses = input.expenses
    .filter((expense) => expense.id !== input.excludeExpenseId)
    .filter((expense) => expense.purchaseLines?.length)
    .filter((expense) =>
      expenseSupplierMatches(expense, {
        supplierId: input.supplierId,
        supplierName: input.supplierName,
      }),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return currentLines.flatMap((line) => {
    const currentKey = purchaseLineSearchKey(line.description);
    const previousMatch = previousExpenses
      .flatMap((expense) =>
        sanitizeExpensePurchaseLines(expense.purchaseLines)
          .filter((previous) =>
            expensePurchaseLineCanFeedProductCatalog(expense, previous),
          )
          .map((previous) => ({
            expense,
            previous,
          })),
      )
      .find(({ previous }) =>
        purchaseLineKeysMatch(
          currentKey,
          purchaseLineSearchKey(previous.description),
        ),
      );

    if (!previousMatch || previousMatch.previous.unitPrice <= 0) return [];

    const previousDiscount = previousMatch.previous.discountPercent ?? 0;
    const currentDiscount = line.discountPercent ?? 0;
    const priceChangePercent =
      ((line.unitPrice - previousMatch.previous.unitPrice) /
        previousMatch.previous.unitPrice) *
      100;
    const discountChangePoints = currentDiscount - previousDiscount;

    if (
      Math.abs(priceChangePercent) < priceThreshold &&
      Math.abs(discountChangePoints) < discountThreshold
    ) {
      return [];
    }

    return [
      {
        lineId: line.id,
        description: line.description,
        previousDescription: previousMatch.previous.description,
        currentUnitPrice: line.unitPrice,
        previousUnitPrice: previousMatch.previous.unitPrice,
        priceChangePercent: roundMoney(priceChangePercent),
        currentDiscountPercent: currentDiscount,
        previousDiscountPercent: previousDiscount,
        discountChangePoints: roundMoney(discountChangePoints),
        previousExpenseDescription: previousMatch.expense.description,
        previousExpenseDate: previousMatch.expense.date,
      },
    ];
  });
}
