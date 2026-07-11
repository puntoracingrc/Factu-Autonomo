import { roundMoney } from "./calculations";

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
