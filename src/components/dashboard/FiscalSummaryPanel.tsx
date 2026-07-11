"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Lock } from "lucide-react";
import { TaxSummaryCard } from "@/components/dashboard/TaxSummaryCard";
import { HomeGlobalSummary } from "@/components/dashboard/HomeGlobalSummary";
import { PeriodOverviewCards } from "@/components/dashboard/PeriodOverviewCards";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBilling } from "@/context/BillingContext";
import { formatMoney } from "@/lib/calculations";
import { downloadAnnualSummaryPdf } from "@/lib/billing/export-annual-pdf";
import {
  buildQuarterlyExportCsv,
  downloadQuarterlyCsv,
} from "@/lib/billing/export-quarterly";
import { isCollectedDocument } from "@/lib/income";
import {
  ALL_QUARTERS,
  availableSummaryYears,
  filterExpensesByQuarter,
  filterExpensesByYear,
  getCurrentQuarter,
  isDateInQuarter,
  isDateInYear,
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

type FiscalPeriodMode = "quarter" | "year" | "all";

interface FiscalSummaryPanelProps {
  data: AppData;
}

export function FiscalSummaryPanel({ data }: FiscalSummaryPanelProps) {
  const { billingEnabled, limits } = useBilling();
  const current = getCurrentQuarter();
  const [mode, setMode] = useState<FiscalPeriodMode>("quarter");
  const [year, setYear] = useState(current.year);
  const [quarter, setQuarter] = useState<Quarter>(current.quarter);
  const locked = billingEnabled && !limits.quarterlySummary;

  const vatExempt = isVatExempt(data.profile);
  const years = useMemo(
    () => availableSummaryYears(data.documents, data.expenses),
    [data.documents, data.expenses],
  );

  const periodExpenses = useMemo(() => {
    if (mode === "all") return data.expenses;
    if (mode === "year") return filterExpensesByYear(data.expenses, year);
    return filterExpensesByQuarter(data.expenses, year, quarter);
  }, [data.expenses, mode, year, quarter]);

  const isDocumentDateInPeriod =
    mode === "all"
      ? () => true
      : mode === "year"
        ? (date: string) => isDateInYear(date, year)
        : (date: string) => isDateInQuarter(date, year, quarter);

  const fiscalDocuments = selectTaxableFiscalDocumentsForPeriod(
    data.documents,
    {
      profile: data.profile,
      isDocumentDateInPeriod,
    },
  ).documents;

  const taxes = calculateTaxSummary(data.documents, periodExpenses, {
    irpfPercent: data.profile.irpfPercent,
    vatExempt,
    profile: data.profile,
    isDocumentDateInPeriod,
  });
  const exportBlocked =
    taxes.integrityBlockedDocuments > 0 ||
    taxes.unsupportedRectificationDocuments > 0 ||
    taxes.unsupportedMixedVatExpenses > 0;
  const exportBlockedTitle = exportBlocked
    ? "Revisa los bloqueos indicados en el resumen antes de exportar"
    : undefined;

  const periodIncome = collectedSalesTotal(
    fiscalDocuments,
    vatExempt,
    isCollectedDocument,
  );
  const periodSpent = totalExpensesAmount(periodExpenses, vatExempt);
  const periodBalance = periodIncome - periodSpent;

  const title =
    mode === "all"
      ? "Todo el historial"
      : mode === "year"
        ? `Año ${year}`
        : quarterLabel(year, quarter);

  const subtitle =
    mode === "all"
      ? "Facturas, recibos y gastos registrados desde el inicio."
      : mode === "year"
        ? `Movimientos con fecha en ${year}.`
        : `Facturas, recibos y gastos con fecha en ${quarterLabel(year, quarter).toLowerCase()}.`;

  function handleExportCsv() {
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

  function handleExportAnnualPdf() {
    downloadAnnualSummaryPdf(
      data.documents,
      data.expenses,
      data.profile,
      year,
    );
  }

  if (locked) {
    return (
      <Card className="mb-6 border-violet-200 bg-violet-50/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Resumen fiscal</h2>
            <p className="mt-1 text-sm text-slate-600">
              El detalle por trimestre y la exportación CSV para tu gestor están
              en el plan Pro.
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
      title={title}
      subtitle={subtitle}
      footerNote="Útil para preparar el IVA trimestral (modelo 303) y pagos fraccionados."
      headerExtra={
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["quarter", "Trimestre"],
                ["year", "Año"],
                ["all", "Todo"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode !== "all" && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                aria-label="Año"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {mode === "quarter" && (
                <select
                  value={quarter}
                  onChange={(e) =>
                    setQuarter(Number(e.target.value) as Quarter)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                  aria-label="Trimestre"
                >
                  {ALL_QUARTERS.map((q) => (
                    <option key={q} value={q}>
                      T{q}
                    </option>
                  ))}
                </select>
              )}
              {mode === "quarter" && limits.quarterlyExport && (
                <Button
                  variant="secondary"
                  onClick={handleExportCsv}
                  disabled={exportBlocked}
                  title={exportBlockedTitle}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              )}
              {mode === "year" && limits.quarterlyExport && (
                <Button
                  variant="secondary"
                  onClick={handleExportAnnualPdf}
                  disabled={exportBlocked}
                  title={exportBlockedTitle}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              )}
            </div>
          )}
        </div>
      }
      highlights={
        mode === "all" ? (
          <HomeGlobalSummary
            data={{ ...data, documents: fiscalDocuments }}
            embedded
          />
        ) : mode === "quarter" ? (
          <PeriodOverviewCards
            income={periodIncome}
            spent={periodSpent}
            grossProfit={taxes.grossProfit}
            estimatedIrpfBase={taxes.estimatedIrpfBase}
            hasNonDeductibleExpenses={
              taxes.nonDeductibleExpenseCount > 0
            }
          />
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
              <p className="text-xs text-slate-500">Cobrado en el periodo</p>
              <p className="font-bold text-green-800">
                {formatMoney(periodIncome)}
              </p>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
              <p className="text-xs text-slate-500">Gastado en el periodo</p>
              <p className="font-bold text-red-700">{formatMoney(periodSpent)}</p>
            </div>
            <div className="col-span-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
              <p className="text-xs text-slate-500">Balance del año</p>
              <p className="font-bold text-blue-800">{formatMoney(periodBalance)}</p>
            </div>
          </div>
        )
      }
    />
  );
}
