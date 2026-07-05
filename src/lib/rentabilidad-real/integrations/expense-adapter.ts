import { roundMoney } from "@/lib/calculations";
import {
  inferExpenseBusinessKind,
  isFixedExpense,
} from "@/lib/expense-classification";
import { expenseTotals } from "@/lib/expenses";
import type { Expense, RecurringExpense } from "@/lib/types";
import type {
  ProfitabilityCostSource,
  ProfitabilityFixedCostSource,
  ProfitabilityProviderScanSource,
} from "./types";

export function mapExistingExpenseToProfitabilityCost(
  expense: Expense,
): ProfitabilityCostSource {
  const totals = expenseTotals(expense);

  return {
    id: expense.id,
    date: expense.date,
    supplierName: expense.supplierName,
    description: expense.description,
    amount: roundMoney(totals.base),
    ivaPercent: totals.ivaPercent,
    ivaAmount: roundMoney(totals.iva),
    total: roundMoney(totals.total),
    category: expense.category,
    businessKind: inferExpenseBusinessKind(expense),
    origin: expense.origin ?? "manual",
    workDocumentId: expense.workDocumentId,
    recurringExpenseId: expense.recurringExpenseId,
    purchaseLineCount: expense.purchaseLines?.length ?? 0,
    sourceLink: {
      sourceType: "expense",
      sourceId: expense.id,
      label: `Gasto ${expense.description}`,
      href: "/gastos",
    },
  };
}

export function mapExistingExpenseToProfitabilityFixedCost(
  expense: Expense,
): ProfitabilityFixedCostSource | null {
  if (!isFixedExpense(expense)) return null;

  const totals = expenseTotals(expense);

  return {
    id: expense.id,
    date: expense.date,
    supplierName: expense.supplierName,
    description: expense.description,
    amount: roundMoney(totals.base),
    ivaPercent: totals.ivaPercent,
    ivaAmount: roundMoney(totals.iva),
    total: roundMoney(totals.total),
    category: expense.category,
    sourceLink: {
      sourceType: "expense",
      sourceId: expense.id,
      label: `Gasto fijo ${expense.description}`,
      href: "/gastos",
    },
  };
}

export function mapExistingRecurringExpenseToProfitabilityFixedCost(
  recurringExpense: RecurringExpense,
): ProfitabilityFixedCostSource {
  const totals = expenseTotals({
    amount: recurringExpense.amount,
    ivaPercent: recurringExpense.ivaPercent,
  });

  return {
    id: recurringExpense.id,
    date: recurringExpense.startDate,
    supplierName: recurringExpense.supplierName,
    description: recurringExpense.description,
    amount: roundMoney(totals.base),
    ivaPercent: totals.ivaPercent,
    ivaAmount: roundMoney(totals.iva),
    total: roundMoney(totals.total),
    category: recurringExpense.category,
    frequency: recurringExpense.frequency,
    enabled: recurringExpense.enabled,
    sourceLink: {
      sourceType: "recurring_expense",
      sourceId: recurringExpense.id,
      label: `Gasto fijo recurrente ${recurringExpense.description}`,
      href: "/gastos/fijos",
    },
  };
}

export function mapExistingProviderScanToProfitabilitySource(
  expense: Expense,
): ProfitabilityProviderScanSource | null {
  const purchaseLineCount = expense.purchaseLines?.length ?? 0;
  const hasPurchaseDocument = Boolean(expense.purchaseDocument);
  if (expense.origin !== "scan" && !hasPurchaseDocument && !purchaseLineCount) {
    return null;
  }

  return {
    expenseId: expense.id,
    supplierName: expense.supplierName,
    hasPurchaseDocument,
    purchaseLineCount,
    sourceLink: {
      sourceType: "expense",
      sourceId: expense.id,
      label: `Escaneo ${expense.description}`,
      href: "/gastos",
    },
  };
}
