import { roundMoney } from "./calculations";
import { expenseFiscalAmounts, type WorkDocumentExpenseSummary } from "./expenses";
import type { Expense } from "./types";

export interface InvoiceListProfitabilityInput {
  salesBase: number;
  salesIva: number;
  linkedExpenseCost?: number;
  linkedDeductibleExpenseBase?: number;
  linkedDeductibleExpenseIva?: number;
  irpfPercent?: number;
  vatExempt?: boolean;
}

export interface InvoiceListProfitability {
  realProfit: number;
  estimatedIrpfBase: number;
  profitAfterIrpfReserve: number;
  ivaReserve: number;
  irpfReserve: number;
  taxReserve: number;
}

export function summarizeAllocatedWorkExpenses(input: {
  expenses: Expense[];
  workDocumentIds: string[];
  allocations?: Record<string, number>;
}): WorkDocumentExpenseSummary | undefined {
  const ids = new Set(input.workDocumentIds);
  const linkedExpenses = input.expenses.filter(
    (expense) => expense.workDocumentId && ids.has(expense.workDocumentId),
  );
  if (linkedExpenses.length === 0) return undefined;

  return linkedExpenses.reduce<WorkDocumentExpenseSummary>(
    (summary, expense) => {
      const fiscal = expenseFiscalAmounts(expense);
      const allocation = input.allocations?.[expense.id];
      const appliedCost =
        allocation === undefined
          ? fiscal.operatingCost
          : Math.min(Math.max(allocation, 0), fiscal.operatingCost);
      const ratio =
        fiscal.operatingCost > 0 ? appliedCost / fiscal.operatingCost : 1;

      return {
        count: summary.count + 1,
        cost: roundMoney(summary.cost + appliedCost),
        deductibleBase: roundMoney(
          summary.deductibleBase + fiscal.deductibleBase * ratio,
        ),
        deductibleIva: roundMoney(
          summary.deductibleIva + fiscal.deductibleIva * ratio,
        ),
      };
    },
    { count: 0, cost: 0, deductibleBase: 0, deductibleIva: 0 },
  );
}

function finiteMoney(value: number | undefined): number {
  return Number.isFinite(value) ? roundMoney(value ?? 0) : 0;
}

function normalizeIrpfRate(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  return Math.min(100, Math.max(0, value ?? 20));
}

export function calculateInvoiceListProfitability(
  input: InvoiceListProfitabilityInput,
): InvoiceListProfitability {
  const salesBase = finiteMoney(input.salesBase);
  const salesIva = input.vatExempt ? 0 : finiteMoney(input.salesIva);
  const linkedExpenseCost = finiteMoney(input.linkedExpenseCost);
  const linkedDeductibleExpenseBase = finiteMoney(
    input.linkedDeductibleExpenseBase,
  );
  const linkedDeductibleExpenseIva = input.vatExempt
    ? 0
    : finiteMoney(input.linkedDeductibleExpenseIva);
  const realProfit = roundMoney(salesBase - linkedExpenseCost);
  const estimatedIrpfBase = roundMoney(
    salesBase - linkedDeductibleExpenseBase,
  );
  const irpfReserve =
    estimatedIrpfBase > 0
      ? roundMoney(
          estimatedIrpfBase * (normalizeIrpfRate(input.irpfPercent) / 100),
        )
      : 0;
  const ivaReserve = input.vatExempt
    ? 0
    : Math.max(0, roundMoney(salesIva - linkedDeductibleExpenseIva));

  return {
    realProfit,
    estimatedIrpfBase,
    profitAfterIrpfReserve: roundMoney(realProfit - irpfReserve),
    ivaReserve,
    irpfReserve,
    taxReserve: roundMoney(ivaReserve + irpfReserve),
  };
}
