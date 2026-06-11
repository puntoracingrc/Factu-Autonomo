"use client";

import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";
import { isCollectedDocument, pendingCollection } from "@/lib/income";
import type { AppData } from "@/lib/types";
import {
  collectedSalesTotal,
  isVatExempt,
  totalExpensesAmount,
} from "@/lib/vat-regime";

interface HomeGlobalSummaryProps {
  data: AppData;
}

export function HomeGlobalSummary({ data }: HomeGlobalSummaryProps) {
  const vatExempt = isVatExempt(data.profile);
  const income = collectedSalesTotal(
    data.documents,
    vatExempt,
    isCollectedDocument,
  );
  const pending = pendingCollection(data.documents);
  const expenses = totalExpensesAmount(data.expenses, vatExempt);
  const balance = income - expenses;

  return (
    <section className="mb-6" aria-labelledby="global-summary-heading">
      <div className="mb-2">
        <h2
          id="global-summary-heading"
          className="text-sm font-semibold text-slate-600"
        >
          Acumulado total
        </h2>
        <p className="text-xs text-slate-400">
          Todo tu historial · «Por cobrar» son facturas pendientes ahora
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-slate-100 bg-slate-50/60">
          <p className="text-xs font-medium text-slate-500">Ingresos cobrados</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">
            {formatMoney(income)}
          </p>
        </Card>
        <Card className="border-slate-100 bg-slate-50/60">
          <p className="text-xs font-medium text-slate-500">Gastos</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">
            {formatMoney(expenses)}
          </p>
        </Card>
        <Card className="border-slate-100 bg-slate-50/60">
          <p className="text-xs font-medium text-slate-500">Por cobrar</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">
            {formatMoney(pending)}
          </p>
        </Card>
        <Card className="border-slate-100 bg-slate-50/60">
          <p className="text-xs font-medium text-slate-500">Balance</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">
            {formatMoney(balance)}
          </p>
        </Card>
      </div>
    </section>
  );
}
