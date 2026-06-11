"use client";

import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";
import { isCollectedDocument } from "@/lib/income";
import {
  filterDocumentsByQuarter,
  filterExpensesByQuarter,
  getCurrentQuarter,
  quarterLabel,
} from "@/lib/periods";
import { calculateTaxSummary } from "@/lib/taxes";
import type { AppData } from "@/lib/types";
import {
  collectedSalesTotal,
  isVatExempt,
  totalExpensesAmount,
} from "@/lib/vat-regime";

interface FiscalSummaryTeaserProps {
  data: AppData;
}

export function FiscalSummaryTeaser({ data }: FiscalSummaryTeaserProps) {
  const vatExempt = isVatExempt(data.profile);
  const { year, quarter } = getCurrentQuarter();
  const quarterDocuments = filterDocumentsByQuarter(
    data.documents,
    year,
    quarter,
  );
  const quarterExpenses = filterExpensesByQuarter(data.expenses, year, quarter);
  const taxes = calculateTaxSummary(quarterDocuments, quarterExpenses, {
    irpfPercent: data.profile.irpfPercent,
    vatExempt,
  });

  const quarterIncome = collectedSalesTotal(
    quarterDocuments,
    vatExempt,
    isCollectedDocument,
  );
  const quarterSpent = totalExpensesAmount(quarterExpenses, vatExempt);
  const quarterBalance = quarterIncome - quarterSpent;

  const ivaLine = vatExempt
    ? null
    : taxes.ivaToPay > 0
      ? formatMoney(taxes.ivaToPay)
      : taxes.ivaCredit > 0
        ? `${formatMoney(taxes.ivaCredit)} a compensar`
        : "Sin diferencia";

  return (
    <section className="mb-6" aria-labelledby="quarter-summary-heading">
      <div className="mb-3">
        <h2
          id="quarter-summary-heading"
          className="text-lg font-bold text-slate-900"
        >
          {quarterLabel(year, quarter)}
        </h2>
        <p className="text-sm text-slate-500">
          Trimestre en curso · datos orientativos
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Ingresos cobrados</p>
          <p className="mt-1 text-2xl font-bold text-green-900">
            {formatMoney(quarterIncome)}
          </p>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Gastos</p>
          <p className="mt-1 text-2xl font-bold text-red-900">
            {formatMoney(quarterSpent)}
          </p>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">Balance</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {formatMoney(quarterBalance)}
          </p>
        </Card>
        <Card className="border-violet-200 bg-violet-50">
          <p className="text-sm font-medium text-violet-700">
            Beneficio bruto est.
          </p>
          <p className="mt-1 text-2xl font-bold text-violet-900">
            {formatMoney(taxes.grossProfit)}
          </p>
        </Card>
      </div>

      <Link
        href="/impuestos"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Landmark className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-900">Ver detalle fiscal</p>
          <p className="text-slate-500">
            {!vatExempt && ivaLine && (
              <>
                IVA neto: <span className="font-medium text-amber-700">{ivaLine}</span>
                {" · "}
              </>
            )}
            IRPF est.:{" "}
            <span className="font-medium text-orange-700">
              {formatMoney(taxes.irpfEstimate)}
            </span>
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </Link>
    </section>
  );
}
