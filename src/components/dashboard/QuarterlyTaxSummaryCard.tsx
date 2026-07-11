"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { TaxSummaryCard } from "@/components/dashboard/TaxSummaryCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { formatMoney } from "@/lib/calculations";
import {
  buildQuarterlyExportCsv,
  downloadQuarterlyCsv,
} from "@/lib/billing/export-quarterly";
import { isCollectedDocument } from "@/lib/income";
import {
  ALL_QUARTERS,
  availableSummaryYears,
  filterExpensesByQuarter,
  getCurrentQuarter,
  isDateInQuarter,
  quarterLabel,
  type Quarter,
} from "@/lib/periods";
import {
  calculateTaxSummary,
  selectTaxableFiscalDocumentsForPeriod,
} from "@/lib/taxes";
import type { AppData } from "@/lib/types";
import {
  collectedSalesTotal,
  isVatExempt,
  totalExpensesAmount,
} from "@/lib/vat-regime";

interface QuarterlyTaxSummaryCardProps {
  data: AppData;
}

export function QuarterlyTaxSummaryCard({ data }: QuarterlyTaxSummaryCardProps) {
  const { billingEnabled, limits } = useBilling();
  const current = getCurrentQuarter();
  const [year, setYear] = useState(current.year);
  const [quarter, setQuarter] = useState<Quarter>(current.quarter);
  const locked = billingEnabled && !limits.quarterlySummary;

  const vatExempt = isVatExempt(data.profile);
  const years = useMemo(
    () => availableSummaryYears(data.documents, data.expenses),
    [data.documents, data.expenses],
  );

  const quarterExpenses = useMemo(
    () => filterExpensesByQuarter(data.expenses, year, quarter),
    [data.expenses, year, quarter],
  );
  const isDocumentDateInPeriod = (date: string) =>
    isDateInQuarter(date, year, quarter);
  const quarterDocuments = selectTaxableFiscalDocumentsForPeriod(
    data.documents,
    {
      profile: data.profile,
      isDocumentDateInPeriod,
    },
  ).documents;

  const taxes = calculateTaxSummary(data.documents, quarterExpenses, {
    irpfPercent: data.profile.irpfPercent,
    vatExempt,
    profile: data.profile,
    isDocumentDateInPeriod,
  });
  const exportBlocked =
    taxes.integrityBlockedDocuments > 0 ||
    taxes.unsupportedRectificationDocuments > 0 ||
    taxes.unsupportedMixedVatExpenses > 0;

  const quarterIncome = collectedSalesTotal(
    quarterDocuments,
    vatExempt,
    isCollectedDocument,
  );
  const quarterSpent = totalExpensesAmount(quarterExpenses, vatExempt);

  function handleExport() {
    const csv = buildQuarterlyExportCsv(
      data.documents,
      data.expenses,
      data.profile,
      year,
      quarter,
      data.suppliers,
    );
    downloadQuarterlyCsv(csv, year, quarter);
  }

  if (locked) {
    return (
      <Card className="mb-6 border-violet-200 bg-violet-50/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Resumen trimestral</h2>
            <p className="mt-1 text-sm text-slate-600">
              Prepara el IVA trimestral (modelo 303) y exporta un CSV para tu
              gestor con el plan Pro.
            </p>
            <Link
              href="/precios"
              className="mt-3 inline-block text-sm font-semibold text-blue-600 underline"
            >
              Ver planes Pro desde 5,99 €/mes
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <TaxSummaryCard
      taxes={taxes}
      title="Resumen trimestral"
      subtitle={`Facturas, recibos y gastos con fecha en ${quarterLabel(year, quarter).toLowerCase()}.`}
      footerNote="Útil para preparar el IVA trimestral (modelo 303) y pagos fraccionados."
      headerExtra={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            aria-label="Año del trimestre"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={quarter}
            onChange={(e) => setQuarter(Number(e.target.value) as Quarter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            aria-label="Trimestre"
          >
            {ALL_QUARTERS.map((q) => (
              <option key={q} value={q}>
                T{q}
              </option>
            ))}
          </select>
          {limits.quarterlyExport && (
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exportBlocked}
              title={
                exportBlocked
                  ? "Revisa los bloqueos indicados en el resumen antes de exportar"
                  : undefined
              }
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          )}
        </div>
      }
      highlights={
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Cobrado en el trimestre</p>
            <p className="font-bold text-green-800">{formatMoney(quarterIncome)}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Gastado en el trimestre</p>
            <p className="font-bold text-red-700">{formatMoney(quarterSpent)}</p>
          </div>
        </div>
      }
    />
  );
}
