import { roundMoney } from "./calculations";
import {
  expenseAllocatedAmountForWorkIds,
  explicitExpenseWorkAllocations,
} from "./expense-work-allocations";
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
  const linkedExpenses = input.expenses
    .map((expense) => {
      const fiscal = expenseFiscalAmounts(expense);
      const allocatedAmount = expenseAllocatedAmountForWorkIds(
        expense,
        ids,
        fiscal.operatingCost,
      );
      return { expense, fiscal, allocatedAmount };
    })
    .filter(({ allocatedAmount }) => allocatedAmount !== 0);
  if (linkedExpenses.length === 0) return undefined;

  return linkedExpenses.reduce<WorkDocumentExpenseSummary>(
    (summary, { expense, fiscal, allocatedAmount }) => {
      const legacyAllocation =
        explicitExpenseWorkAllocations(expense).length === 0
          ? input.allocations?.[expense.id]
          : undefined;
      const appliedCost =
        legacyAllocation === undefined
          ? allocatedAmount
          : Math.sign(fiscal.operatingCost || 1) *
            Math.min(
              Math.abs(legacyAllocation),
              Math.abs(fiscal.operatingCost),
            );
      const ratio =
        fiscal.operatingCost !== 0
          ? Math.min(Math.abs(appliedCost / fiscal.operatingCost), 1)
          : 0;

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
