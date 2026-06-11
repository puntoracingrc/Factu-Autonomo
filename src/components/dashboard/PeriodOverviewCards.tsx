"use client";

import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";

interface PeriodOverviewCardsProps {
  income: number;
  spent: number;
  grossProfit: number;
}

/** Cuatro métricas del periodo (trimestre): ingresos, gastos, balance y beneficio bruto. */
export function PeriodOverviewCards({
  income,
  spent,
  grossProfit,
}: PeriodOverviewCardsProps) {
  const balance = income - spent;

  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-2">
      <Card className="border-green-200 bg-green-50">
        <p className="text-sm font-medium text-green-700">Ingresos cobrados</p>
        <p className="mt-1 text-2xl font-bold text-green-900">
          {formatMoney(income)}
        </p>
      </Card>
      <Card className="border-red-200 bg-red-50">
        <p className="text-sm font-medium text-red-700">Gastos</p>
        <p className="mt-1 text-2xl font-bold text-red-900">
          {formatMoney(spent)}
        </p>
      </Card>
      <Card className="border-blue-200 bg-blue-50">
        <p className="text-sm font-medium text-blue-700">Balance</p>
        <p className="mt-1 text-2xl font-bold text-blue-900">
          {formatMoney(balance)}
        </p>
      </Card>
      <Card className="border-violet-200 bg-violet-50">
        <p className="text-sm font-medium text-violet-700">Beneficio bruto est.</p>
        <p className="mt-1 text-2xl font-bold text-violet-900">
          {formatMoney(grossProfit)}
        </p>
      </Card>
    </div>
  );
}
