"use client";

import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";

interface PeriodOverviewCardsProps {
  invoicedIncome: number;
  spent: number;
  grossProfit: number;
  estimatedIrpfBase: number;
  ivaToPay: number;
  ivaCredit: number;
  irpfEstimate: number;
  profitAfterIrpfReserve: number;
  hasNonDeductibleExpenses?: boolean;
}

/** Resumen claro del periodo: lo que entra, sale, conviene apartar y queda. */
export function PeriodOverviewCards({
  invoicedIncome,
  spent,
  grossProfit,
  estimatedIrpfBase,
  ivaToPay,
  ivaCredit,
  irpfEstimate,
  profitAfterIrpfReserve,
  hasNonDeductibleExpenses = false,
}: PeriodOverviewCardsProps) {
  const balance = invoicedIncome - spent;
  const expenseBalanceIsCredit = spent < 0;
  const totalToSetAside = ivaToPay + irpfEstimate;

  return (
    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="mb-3">
        <p className="text-base font-black text-slate-950">Resumen rápido</p>
        <p className="text-sm text-slate-600">
          Pim pam: esto es lo que entra, lo que sale y lo que conviene apartar.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-green-200 bg-white">
          <p className="text-sm font-medium text-green-700">Has facturado</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {formatMoney(invoicedIncome)}
          </p>
        </Card>
        <Card className="border-red-200 bg-white">
          <p className="text-sm font-medium text-red-700">
            {expenseBalanceIsCredit ? "Tienes saldo a favor" : "Has gastado"}
          </p>
          <p className="mt-1 text-2xl font-bold text-red-900">
            {formatMoney(Math.abs(spent))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Balance: {formatMoney(balance)}
          </p>
        </Card>
        <Card className="border-orange-200 bg-white">
          <p className="text-sm font-medium text-orange-700">
            Aparta para impuestos
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-900">
            {formatMoney(totalToSetAside)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            IVA {formatMoney(ivaToPay)}
            {ivaCredit > 0 ? ` · a compensar ${formatMoney(ivaCredit)}` : ""} ·
            IRPF {formatMoney(irpfEstimate)}
          </p>
        </Card>
        <Card className="border-violet-200 bg-white">
          <p className="text-sm font-medium text-violet-700">
            Te queda aprox.
          </p>
          <p className="mt-1 text-2xl font-bold text-violet-900">
            {formatMoney(profitAfterIrpfReserve)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Beneficio antes de IRPF: {formatMoney(grossProfit)}
            {hasNonDeductibleExpenses
              ? ` · base IRPF ${formatMoney(estimatedIrpfBase)}`
              : ""}
          </p>
        </Card>
      </div>
    </div>
  );
}
