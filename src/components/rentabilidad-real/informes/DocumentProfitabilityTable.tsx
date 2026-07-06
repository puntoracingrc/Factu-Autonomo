"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { formatMoney } from "@/lib/calculations";
import {
  RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES,
  getDocumentAnalysisModeLabel,
  type RentabilidadRealDocumentAnalysisMode,
} from "@/lib/rentabilidad-real/document-analysis-modes";
import type {
  RentabilidadRealDocumentReportQualityFlag,
  RentabilidadRealDocumentReportRow,
} from "@/lib/rentabilidad-real/reports";

const FLAG_LABELS: Record<RentabilidadRealDocumentReportQualityFlag, string> = {
  no_linked_expenses: "Sin gastos",
  has_unlinked_candidates: "Candidatos",
  quote_without_invoice: "Previsto",
  invoice_without_quote: "Sin presupuesto",
  low_margin: "Margen bajo",
  negative_profit: "Negativo",
  has_internal_adjustments: "Ajustes internos",
  no_fixed_cost_rule: "Sin fijos",
  missing_tax_data: "IVA incompleto",
  scanned_expense_review_needed: "Revisar escaneo",
};

const ANALYSIS_MODE_OPTIONS = RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES.filter(
  (mode) => mode !== "unknown",
);

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`;
}

function documentHref(row: RentabilidadRealDocumentReportRow): string | undefined {
  return row.sourceLinks.find(
    (link) => link.sourceType === "invoice" || link.sourceType === "quote",
  )?.href;
}

function analysisModeBadgeClass(mode: RentabilidadRealDocumentAnalysisMode): string {
  if (mode === "unknown") {
    return "bg-amber-50 text-amber-800 dark:bg-amber-950/45 dark:text-amber-100";
  }
  if (mode === "hours_project" || mode === "retainer") {
    return "bg-sky-50 text-sky-800 dark:bg-sky-950/45 dark:text-sky-100";
  }
  if (mode === "installation_with_materials") {
    return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-100";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export function DocumentProfitabilityTable({
  rows,
  onAnalysisModeChange,
  onBulkAnalysisModeChange,
}: {
  rows: RentabilidadRealDocumentReportRow[];
  onAnalysisModeChange: (
    documentId: string,
    mode: RentabilidadRealDocumentAnalysisMode,
  ) => void;
  onBulkAnalysisModeChange: (
    documentIds: string[],
    mode: RentabilidadRealDocumentAnalysisMode,
  ) => void;
}) {
  const [bulkMode, setBulkMode] =
    useState<RentabilidadRealDocumentAnalysisMode>("fixed_price_work");
  const documentsWithoutMode = Array.from(
    new Set(
      rows
        .filter((row) => row.analysisMode === "unknown")
        .map((row) => row.primaryDocumentId),
    ),
  );

  return (
    <div className="space-y-4">
      {documentsWithoutMode.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/35 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-amber-950 dark:text-amber-100">
              {documentsWithoutMode.length} documento(s) visibles sin modo.
            </p>
            <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
              Puedes asignar un modo común ahora. Solo se guarda en este navegador.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label="Modo para documentos visibles sin definir"
              value={bulkMode}
              onChange={(event) =>
                setBulkMode(event.target.value as RentabilidadRealDocumentAnalysisMode)
              }
              className="min-h-11 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-amber-900/60 dark:bg-slate-950 dark:text-slate-100"
            >
              {ANALYSIS_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {getDocumentAnalysisModeLabel(mode)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                onBulkAnalysisModeChange(documentsWithoutMode, bulkMode)
              }
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-black text-white transition-colors hover:bg-blue-700"
            >
              Asignar a visibles
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Documento
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Modo
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Cliente
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Fecha
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Ingreso
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Costes
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Fijos
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Beneficio doc.
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Beneficio interno
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Margen
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Alertas
            </th>
            <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = documentHref(row);
            return (
              <tr key={row.unitId} className="align-top">
                <td className="border-b border-slate-100 px-3 py-4 font-black text-slate-950 dark:border-slate-800 dark:text-slate-50">
                  {row.documentLabel}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-black ${analysisModeBadgeClass(
                        row.analysisMode,
                      )}`}
                    >
                      {getDocumentAnalysisModeLabel(row.analysisMode)}
                    </span>
                    <select
                      aria-label={`Modo de análisis para ${row.documentLabel}`}
                      value={row.analysisMode}
                      onChange={(event) =>
                        onAnalysisModeChange(
                          row.primaryDocumentId,
                          event.target.value as RentabilidadRealDocumentAnalysisMode,
                        )
                      }
                      className="block min-h-9 w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="unknown">No definido</option>
                      {ANALYSIS_MODE_OPTIONS.map((mode) => (
                        <option key={mode} value={mode}>
                          {getDocumentAnalysisModeLabel(mode)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {row.clientName}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  {row.date}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                  {formatMoney(row.incomeWithoutIndirectTax)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatMoney(row.totalDirectCosts)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatMoney(row.allocatedFixedCosts)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                  {formatMoney(row.operatingProfit)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                  {formatMoney(row.internalRealProfit)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatPercent(row.marginPercentage)}
                </td>
                <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {row.qualityFlags.length === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                        OK
                      </span>
                    ) : (
                      row.qualityFlags.slice(0, 4).map((flag) => (
                        <span
                          key={flag}
                          className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/45 dark:text-amber-100"
                        >
                          {FLAG_LABELS[flag]}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/rentabilidad-real/calculadora/trabajo"
                      className="inline-flex items-center gap-1 text-sm font-black text-blue-700 hover:text-blue-800 dark:text-blue-200"
                    >
                      Abrir cálculo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    {row.unlinkedCandidatesCount > 0 ? (
                      <Link
                        href="/rentabilidad-real/calculadora/trabajo"
                        className="inline-flex items-center gap-1 text-sm font-black text-amber-700 hover:text-amber-800 dark:text-amber-200"
                      >
                        Asignar gastos
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 text-sm font-black text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
                      >
                        Ver documento
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
