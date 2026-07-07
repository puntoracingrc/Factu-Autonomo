import { roundMoney } from "./calculations";

export interface InvoiceListProfitabilityInput {
  salesBase: number;
  salesIva: number;
  linkedExpenseBase?: number;
  linkedExpenseIva?: number;
  irpfPercent?: number;
  vatExempt?: boolean;
}

export interface InvoiceListProfitability {
  realProfit: number;
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
  const linkedExpenseBase = finiteMoney(input.linkedExpenseBase);
  const linkedExpenseIva = input.vatExempt
    ? 0
    : finiteMoney(input.linkedExpenseIva);
  const realProfit = roundMoney(salesBase - linkedExpenseBase);
  const irpfReserve =
    realProfit > 0
      ? roundMoney(realProfit * (normalizeIrpfRate(input.irpfPercent) / 100))
      : 0;
  const ivaReserve = input.vatExempt
    ? 0
    : Math.max(0, roundMoney(salesIva - linkedExpenseIva));

  return {
    realProfit,
    profitAfterIrpfReserve: roundMoney(realProfit - irpfReserve),
    ivaReserve,
    irpfReserve,
    taxReserve: roundMoney(ivaReserve + irpfReserve),
  };
}
