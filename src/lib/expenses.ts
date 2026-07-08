import { roundMoney } from "./calculations";
import { normalizeDocumentUnitId } from "./document-units";
import { supplierCompareKey } from "./suppliers";
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
  iva: number;
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
  expense: Pick<Expense, "amount" | "ivaPercent">,
  vatExempt = false,
): ExpenseTotals {
  return expenseTotalsFromBase(expense.amount, expense.ivaPercent, vatExempt);
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

export function expensePurchaseLineTracksProduct(
  line: Pick<ExpensePurchaseLine, "catalogProduct">,
): boolean {
  return line.catalogProduct !== false;
}

export function summarizeWorkDocumentExpenses(
  expenses: Expense[],
  documentId: string,
): WorkDocumentExpenseSummary {
  return (
    summarizeWorkDocumentExpensesById(expenses).get(documentId) ?? {
      count: 0,
      cost: 0,
      iva: 0,
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
      iva: 0,
    };
    const totals = expenseTotals(expense);
    summaries.set(expense.workDocumentId, {
      count: current.count + 1,
      cost: roundMoney(current.cost + normalizeExpenseAmount(expense.amount)),
      iva: roundMoney(current.iva + totals.iva),
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
  expenses: Expense[];
  supplierId?: string;
  supplierName?: string;
  excludeExpenseId?: string;
  priceChangeThresholdPercent?: number;
  discountChangeThresholdPoints?: number;
}): ExpensePurchaseLinePriceAlert[] {
  const priceThreshold = input.priceChangeThresholdPercent ?? 15;
  const discountThreshold = input.discountChangeThresholdPoints ?? 5;
  const currentLines = sanitizeExpensePurchaseLines(input.currentLines).filter(
    expensePurchaseLineTracksProduct,
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
          .filter(expensePurchaseLineTracksProduct)
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
