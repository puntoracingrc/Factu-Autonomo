import { documentAmounts } from "./vat-regime";
import { roundMoney, roundMoneySymmetric } from "./calculations";
import { deriveDocumentLifecycle } from "./document-integrity";
import { sortDocumentsByNewest } from "./documents";
import {
  canMarkAsCollected,
  isCollectedDocument,
  isPendingInvoicePayment,
} from "./income";
import { expenseFiscalAmounts, expenseTotals } from "./expenses";
import type { AppData, Document, Expense } from "./types";

export interface ProductBusinessSummary {
  customersCount: number;
  quotesCount: number;
  invoicesCount: number;
  issuedInvoicesCount: number;
  draftInvoicesCount: number;
  collectedInvoicesCount: number;
  pendingInvoicesCount: number;
  totalBilledIssued: number;
  totalCollectedLocal: number;
  totalPendingCollection: number;
  totalExpenses: number;
  totalFixedExpenses: number;
  totalPurchaseExpenses: number;
  totalTicketExpenses: number;
  totalUnbackedExpenses: number;
  salesIvaEstimated: number;
  expenseIvaEstimated: number;
  balanceEstimated: number;
  cashBalanceEstimated: number;
  recentDocuments: Document[];
  recentExpenses: Expense[];
  pendingInvoices: Document[];
}

interface BusinessSummaryOptions {
  recentLimit?: number;
}

function safeMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return roundMoney(value);
}

function signedMoney(value: number): number {
  return Number.isFinite(value) ? roundMoneySymmetric(value) : 0;
}

function safeDifference(left: number, right: number): number {
  const result = left - right;
  return signedMoney(result);
}

export function isIssuedBusinessInvoice(document: Document): boolean {
  if (document.type !== "factura") return false;
  if (!canMarkAsCollected(document)) return false;
  const rectification =
    document.documentSnapshot?.rectification ?? document.rectification;
  if (!rectification) return true;

  // En la vista operativa una R4 positiva sustituye a la original. Una
  // anulación sigue siendo un movimiento fiscal firmado, no nueva facturación.
  return (
    rectification.type === "correccion" &&
    documentAmounts(document, false).total > 0
  );
}

function invoiceTotal(document: Document, vatExempt: boolean): number {
  return safeMoney(documentAmounts(document, vatExempt).total);
}

function invoiceIva(document: Document, vatExempt: boolean): number {
  return safeMoney(documentAmounts(document, vatExempt).iva);
}

function expenseTotal(expense: Expense, vatExempt: boolean): number {
  return signedMoney(expenseTotals(expense, vatExempt).total);
}

function expenseIva(expense: Expense, vatExempt: boolean): number {
  return signedMoney(
    expenseFiscalAmounts(expense, vatExempt).deductibleIva,
  );
}

function isFixedExpense(expense: Expense): boolean {
  return (
    Boolean(expense.recurringExpenseId) || expense.businessKind === "fixed"
  );
}

function isPurchaseExpense(expense: Expense): boolean {
  return (
    expense.businessKind === "purchase" ||
    expense.businessKind === "purchase_invoice"
  );
}

function isTicketExpense(expense: Expense): boolean {
  return expense.businessKind === "quick_ticket";
}

function compareExpensesByNewest(left: Expense, right: Expense): number {
  const byDate = right.date.localeCompare(left.date);
  if (byDate !== 0) return byDate;
  return right.createdAt.localeCompare(left.createdAt);
}

export function buildProductBusinessSummary(
  data: AppData,
  options: BusinessSummaryOptions = {},
): ProductBusinessSummary {
  const recentLimit = options.recentLimit ?? 4;
  const vatExempt = Boolean(data.profile.vatExempt);
  const invoices = data.documents.filter(
    (document) => document.type === "factura",
  );
  const issuedInvoices = invoices.filter(isIssuedBusinessInvoice);
  const draftInvoices = invoices.filter(
    (document) => deriveDocumentLifecycle(document) === "draft",
  );
  const collectedInvoices = issuedInvoices.filter(isCollectedDocument);
  const pendingInvoices = invoices.filter(isPendingInvoicePayment);

  const totalBilledIssued = safeMoney(
    issuedInvoices.reduce(
      (sum, document) => sum + invoiceTotal(document, vatExempt),
      0,
    ),
  );
  const totalCollectedLocal = safeMoney(
    collectedInvoices.reduce(
      (sum, document) => sum + invoiceTotal(document, vatExempt),
      0,
    ),
  );
  const totalPendingCollection = safeMoney(
    pendingInvoices.reduce(
      (sum, document) => sum + invoiceTotal(document, vatExempt),
      0,
    ),
  );
  const totalExpenses = signedMoney(
    data.expenses.reduce(
      (sum, expense) => sum + expenseTotal(expense, vatExempt),
      0,
    ),
  );
  const totalFixedExpenses = signedMoney(
    data.expenses
      .filter(isFixedExpense)
      .reduce((sum, expense) => sum + expenseTotal(expense, vatExempt), 0),
  );
  const totalPurchaseExpenses = signedMoney(
    data.expenses
      .filter(
        (expense) => !isFixedExpense(expense) && isPurchaseExpense(expense),
      )
      .reduce((sum, expense) => sum + expenseTotal(expense, vatExempt), 0),
  );
  const totalTicketExpenses = signedMoney(
    data.expenses
      .filter((expense) => !isFixedExpense(expense) && isTicketExpense(expense))
      .reduce((sum, expense) => sum + expenseTotal(expense, vatExempt), 0),
  );
  const totalUnbackedExpenses = signedMoney(
    totalExpenses -
      totalFixedExpenses -
      totalPurchaseExpenses -
      totalTicketExpenses,
  );
  const salesIvaEstimated = safeMoney(
    issuedInvoices.reduce(
      (sum, document) => sum + invoiceIva(document, vatExempt),
      0,
    ),
  );
  const expenseIvaEstimated = signedMoney(
    data.expenses.reduce(
      (sum, expense) => sum + expenseIva(expense, vatExempt),
      0,
    ),
  );

  return {
    customersCount: data.customers.length,
    quotesCount: data.documents.filter(
      (document) => document.type === "presupuesto",
    ).length,
    invoicesCount: invoices.length,
    issuedInvoicesCount: issuedInvoices.length,
    draftInvoicesCount: draftInvoices.length,
    collectedInvoicesCount: collectedInvoices.length,
    pendingInvoicesCount: pendingInvoices.length,
    totalBilledIssued,
    totalCollectedLocal,
    totalPendingCollection,
    totalExpenses,
    totalFixedExpenses,
    totalPurchaseExpenses,
    totalTicketExpenses,
    totalUnbackedExpenses,
    salesIvaEstimated,
    expenseIvaEstimated,
    balanceEstimated: safeDifference(totalBilledIssued, totalExpenses),
    cashBalanceEstimated: safeDifference(totalCollectedLocal, totalExpenses),
    recentDocuments: sortDocumentsByNewest(data.documents).slice(
      0,
      recentLimit,
    ),
    recentExpenses: [...data.expenses]
      .sort(compareExpensesByNewest)
      .slice(0, recentLimit),
    pendingInvoices: sortDocumentsByNewest(pendingInvoices).slice(
      0,
      recentLimit,
    ),
  };
}
