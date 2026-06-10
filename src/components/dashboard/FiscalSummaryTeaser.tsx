"use client";

import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";
import {
  filterDocumentsByQuarter,
  filterExpensesByQuarter,
  getCurrentQuarter,
  quarterLabel,
} from "@/lib/periods";
import { calculateTaxSummary } from "@/lib/taxes";
import type { AppData } from "@/lib/types";
import { isVatExempt } from "@/lib/vat-regime";

interface FiscalSummaryTeaserProps {
  data: AppData;
}

export function FiscalSummaryTeaser({ data }: FiscalSummaryTeaserProps) {
  const vatExempt = isVatExempt(data.profile);
  const { year, quarter } = getCurrentQuarter();
  const documents = filterDocumentsByQuarter(data.documents, year, quarter);
  const expenses = filterExpensesByQuarter(data.expenses, year, quarter);
  const taxes = calculateTaxSummary(documents, expenses, {
    irpfPercent: data.profile.irpfPercent,
    vatExempt,
  });

  const hasData = taxes.salesBase !== 0 || taxes.expenseBase !== 0;
  const ivaLine = vatExempt
    ? null
    : taxes.ivaToPay > 0
      ? formatMoney(taxes.ivaToPay)
      : taxes.ivaCredit > 0
        ? `${formatMoney(taxes.ivaCredit)} a compensar`
        : "Sin diferencia";

  return (
    <Link href="/impuestos" className="mb-6 block">
      <Card className="transition-colors hover:bg-slate-50">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Resumen fiscal</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {quarterLabel(year, quarter)} · orientativo
            </p>
            {hasData ? (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {!vatExempt && ivaLine && (
                  <span>
                    <span className="text-slate-500">IVA neto: </span>
                    <span className="font-semibold text-amber-700">
                      {ivaLine}
                    </span>
                  </span>
                )}
                <span>
                  <span className="text-slate-500">IRPF est.: </span>
                  <span className="font-semibold text-orange-700">
                    {formatMoney(taxes.irpfEstimate)}
                  </span>
                </span>
                <span>
                  <span className="text-slate-500">Beneficio: </span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(taxes.grossProfit)}
                  </span>
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Sin movimientos este trimestre todavía.
              </p>
            )}
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
        </div>
      </Card>
    </Link>
  );
}
