import { roundMoney } from "@/lib/calculations";
import {
  inferExpenseBusinessKind,
  isFixedExpense,
} from "@/lib/expense-classification";
import {
  expenseFiscalAmounts,
  isExpenseFiscalDeductible,
} from "@/lib/expenses";
import {
  recurringExpenseMonthlyDivisor,
  recurringExpenseTotals,
} from "@/lib/recurring-expenses";
import type { Expense, RecurringExpense } from "@/lib/types";
import type {
  ProfitabilityCostSource,
  ProfitabilityFixedCostSource,
  ProfitabilityProviderScanSource,
} from "./types";

export function mapExistingExpenseToProfitabilityCost(
  expense: Expense,
): ProfitabilityCostSource {
  const fiscal = expenseFiscalAmounts(expense);

  return {
    id: expense.id,
    date: expense.date,
    supplierName: expense.supplierName,
    description: expense.description,
    amount: roundMoney(fiscal.operatingCost),
    fiscalDeductible: fiscal.deductible,
    ivaPercent: fiscal.deductible ? fiscal.registeredIvaPercent : 0,
    ivaAmount: roundMoney(fiscal.deductibleIva),
    total: roundMoney(fiscal.registeredTotal),
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

  const fiscal = expenseFiscalAmounts(expense);

  return {
    id: expense.id,
    date: expense.date,
    supplierName: expense.supplierName,
    description: expense.description,
    amount: roundMoney(fiscal.operatingCost),
    fiscalDeductible: fiscal.deductible,
    ivaPercent: fiscal.deductible ? fiscal.registeredIvaPercent : 0,
    ivaAmount: roundMoney(fiscal.deductibleIva),
    total: roundMoney(fiscal.registeredTotal),
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
  const totals = monthlyRecurringExpenseTotals(
    recurringExpense.amount,
    recurringExpense.ivaPercent,
    recurringExpense.frequency,
    recurringExpense.deductibility,
  );

  return {
    id: recurringExpense.id,
    date: recurringExpense.startDate,
    supplierName: recurringExpense.supplierName,
    description: recurringExpense.description,
    amount: totals.base,
    fiscalDeductible: totals.fiscalDeductible,
    ivaPercent: totals.ivaPercent,
    ivaAmount: totals.iva,
    total: totals.total,
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

export function mapExistingRecurringOccurrenceToProfitabilityFixedCost(
  expense: Expense,
  recurringExpense: RecurringExpense,
): ProfitabilityFixedCostSource {
  const totals = monthlyRecurringExpenseTotals(
    expense.amount,
    expense.ivaPercent,
    recurringExpense.frequency,
    expense.deductibility ?? recurringExpense.deductibility,
  );

  return {
    id: recurringExpense.id,
    date: expense.date,
    supplierName: expense.supplierName,
    description: expense.description,
    amount: totals.base,
    fiscalDeductible: totals.fiscalDeductible,
    ivaPercent: totals.ivaPercent,
    ivaAmount: totals.iva,
    total: totals.total,
    category: expense.category,
    frequency: recurringExpense.frequency,
    enabled: recurringExpense.enabled,
    sourceLink: {
      sourceType: "recurring_expense",
      sourceId: recurringExpense.id,
      label: `Gasto fijo recurrente ${expense.description} (ocurrencia histórica)`,
      href: "/gastos/fijos",
    },
  };
}

function monthlyRecurringExpenseTotals(
  amount: number,
  ivaPercent: number,
  frequency: RecurringExpense["frequency"],
  deductibility?: RecurringExpense["deductibility"],
) {
  const period = recurringExpenseTotals({
    amount,
    ivaPercent,
    deductibility,
  });
  const fiscalDeductible = isExpenseFiscalDeductible({ deductibility });
  const divisor = recurringExpenseMonthlyDivisor(frequency);
  const periodOperatingCost = fiscalDeductible
    ? period.base
    : period.total;
  const monthlyAmount = roundMoney(periodOperatingCost / divisor);
  const monthlyIva = fiscalDeductible
    ? roundMoney(period.iva / divisor)
    : 0;

  return {
    base: monthlyAmount,
    iva: monthlyIva,
    total: roundMoney(monthlyAmount + monthlyIva),
    fiscalDeductible,
    ivaPercent: fiscalDeductible ? period.ivaPercent : 0,
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
