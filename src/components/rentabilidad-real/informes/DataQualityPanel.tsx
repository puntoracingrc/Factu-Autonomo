"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { RentabilidadRealDataQualityReport } from "@/lib/rentabilidad-real/reports";

const METRICS: Array<{
  key: keyof Omit<
    RentabilidadRealDataQualityReport,
    "recommendations" | "actionItems"
  >;
  label: string;
}> = [
  { key: "totalAnalysisUnits", label: "Unidades analizadas" },
  { key: "unitsWithoutLinkedExpenses", label: "Sin gastos enlazados" },
  { key: "unitsWithUnlinkedExpenseCandidates", label: "Con candidatos" },
  { key: "quotesWithoutInvoice", label: "Presupuestos previstos" },
  { key: "invoicesWithoutQuote", label: "Facturas independientes" },
  { key: "lowMarginDocuments", label: "Margen bajo" },
  { key: "negativeProfitDocuments", label: "Beneficio negativo" },
  { key: "unitsWithInternalAdjustments", label: "Con ajustes internos" },
  { key: "fixedCostsWithoutAllocationRule", label: "Sin regla de fijos" },
  { key: "scannedExpensesPossiblyUnreviewed", label: "Escaneos revisables" },
  { key: "documentsMissingTaxData", label: "IVA incompleto" },
  { key: "documentsWithoutAnalysisMode", label: "Sin modo" },
  { key: "possibleStockOrCommerceSignals", label: "Stock futuro" },
];

function actionToneClass(severity: "info" | "warning" | "risk") {
  if (severity === "risk") {
    return "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/35";
  }
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35";
  }
  return "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/35";
}

export function DataQualityPanel({
  report,
}: {
  report: RentabilidadRealDataQualityReport;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric) => {
          const value = report[metric.key];
          const warning = metric.key !== "totalAnalysisUnits" && value > 0;
          return (
            <div
              key={metric.key}
              className={`rounded-lg border p-4 ${
                warning
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
              }`}
            >
              <p className="text-sm font-black text-slate-600 dark:text-slate-300">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
                {value}
              </p>
            </div>
          );
        })}
      </div>

      {report.actionItems.length > 0 ? (
        <div>
          <h3 className="text-sm font-black uppercase text-slate-500 dark:text-slate-400">
            Acciones recomendadas
          </h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {report.actionItems.map((action) => (
              <div
                key={action.id}
                className={`rounded-lg border p-4 ${actionToneClass(
                  action.severity,
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-slate-950 dark:text-slate-50">
                      {action.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {action.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    {action.count}
                  </span>
                </div>
                <Link
                  href={action.href}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-slate-900"
                >
                  {action.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {report.recommendations.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Los datos actuales no muestran alertas relevantes.</p>
          </div>
        ) : (
          report.recommendations.map((recommendation) => (
            <div
              key={recommendation}
              className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100"
            >
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              <p>{recommendation}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
