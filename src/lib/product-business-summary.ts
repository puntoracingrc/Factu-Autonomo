import { documentAmounts } from "./vat-regime";
import { roundMoney } from "./calculations";
import { deriveDocumentLifecycle } from "./document-integrity";
import { sortDocumentsByNewest } from "./documents";
import {
  isCollectedDocument,
  isPendingInvoicePayment,
} from "./income";
import { expenseTotals } from "./expenses";
import { isRectificativa } from "./rectificativas";
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

function safeDifference(left: number, right: number): number {
  const result = left - right;
  return Number.isFinite(result) ? roundMoney(result) : 0;
}

export function isIssuedBusinessInvoice(document: Document): boolean {
  if (document.type !== "factura") return false;
  if (document.status === "anulada" || document.rectifiedById) return false;
  if (isRectificativa(document)) return false;
  return deriveDocumentLifecycle(document) === "issued";
}

function invoiceTotal(document: Document, vatExempt: boolean): number {
  return safeMoney(documentAmounts(document, vatExempt).total);
}

function invoiceIva(document: Document, vatExempt: boolean): number {
  return safeMoney(documentAmounts(document, vatExempt).iva);
}

function expenseTotal(expense: Expense, vatExempt: boolean): number {
  return safeMoney(expenseTotals(expense, vatExempt).total);
}

function expenseIva(expense: Expense, vatExempt: boolean): number {
  return safeMoney(expenseTotals(expense, vatExempt).iva);
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
  const invoices = data.documents.filter((document) => document.type === "factura");
  const issuedInvoices = invoices.filter(isIssuedBusinessInvoice);
  const draftInvoices = invoices.filter(
    (document) => deriveDocumentLifecycle(document) === "draft",
  );
  const collectedInvoices = issuedInvoices.filter(isCollectedDocument);
  const pendingInvoices = issuedInvoices.filter(isPendingInvoicePayment);

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
  const totalExpenses = safeMoney(
    data.expenses.reduce((sum, expense) => sum + expenseTotal(expense, vatExempt), 0),
  );
  const salesIvaEstimated = safeMoney(
    issuedInvoices.reduce(
      (sum, document) => sum + invoiceIva(document, vatExempt),
      0,
    ),
  );
  const expenseIvaEstimated = safeMoney(
    data.expenses.reduce((sum, expense) => sum + expenseIva(expense, vatExempt), 0),
  );

  return {
    customersCount: data.customers.length,
    quotesCount: data.documents.filter((document) => document.type === "presupuesto")
      .length,
    invoicesCount: invoices.length,
    issuedInvoicesCount: issuedInvoices.length,
    draftInvoicesCount: draftInvoices.length,
    collectedInvoicesCount: collectedInvoices.length,
    pendingInvoicesCount: pendingInvoices.length,
    totalBilledIssued,
    totalCollectedLocal,
    totalPendingCollection,
    totalExpenses,
    salesIvaEstimated,
    expenseIvaEstimated,
    balanceEstimated: safeDifference(totalBilledIssued, totalExpenses),
    cashBalanceEstimated: safeDifference(totalCollectedLocal, totalExpenses),
    recentDocuments: sortDocumentsByNewest(data.documents).slice(0, recentLimit),
    recentExpenses: [...data.expenses]
      .sort(compareExpensesByNewest)
      .slice(0, recentLimit),
    pendingInvoices: sortDocumentsByNewest(pendingInvoices).slice(0, recentLimit),
  };
}
