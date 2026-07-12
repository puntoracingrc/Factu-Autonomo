"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
  RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES,
  getDocumentAnalysisModeLabel,
  type RentabilidadRealDocumentAnalysisMode,
} from "@/lib/rentabilidad-real/document-analysis-modes";
import type { RentabilidadRealDocumentReportRow } from "@/lib/rentabilidad-real/reports";
import {
  buildDocumentProfitabilityRowViewModel,
  type DocumentProfitabilityRowViewModel,
} from "../report-table-view-models";

const ANALYSIS_MODE_OPTIONS = RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES.filter(
  (mode) => mode !== "unknown",
);

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

function DocumentModeControl({
  row,
  mobile = false,
  onAnalysisModeChange,
}: {
  row: DocumentProfitabilityRowViewModel;
  mobile?: boolean;
  onAnalysisModeChange: (
    documentId: string,
    mode: RentabilidadRealDocumentAnalysisMode,
  ) => void;
}) {
  return (
    <div className="space-y-2">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-black ${analysisModeBadgeClass(
          row.analysisMode,
        )}`}
        data-report-field="analysisMode"
      >
        {row.analysisModeLabel}
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
        className={
          mobile
            ? "block min-h-11 w-full max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            : "block min-h-9 w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        }
      >
        <option value="unknown">No definido</option>
        {ANALYSIS_MODE_OPTIONS.map((mode) => (
          <option key={mode} value={mode}>
            {getDocumentAnalysisModeLabel(mode)}
          </option>
        ))}
      </select>
    </div>
  );
}

function DocumentAlerts({ row }: { row: DocumentProfitabilityRowViewModel }) {
  const isOk = row.qualityFlagLabels.length === 1 && row.qualityFlagLabels[0] === "OK";

  return (
    <div
      aria-label={`Alertas de ${row.documentLabel}`}
      className="flex max-w-56 flex-wrap gap-1"
    >
      {row.qualityFlagLabels.map((label) => (
        <span
          key={label}
          data-report-alert={label}
          className={`rounded-full px-2 py-1 text-xs font-black ${
            isOk
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200"
              : "bg-amber-50 text-amber-800 dark:bg-amber-950/45 dark:text-amber-100"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function DocumentActions({ row }: { row: DocumentProfitabilityRowViewModel }) {
  return (
    <div className="flex flex-col items-start gap-1 sm:gap-2">
      <Link
        href="/rentabilidad-real/calculadora/trabajo"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-blue-700 hover:text-blue-800 dark:text-blue-200 xl:min-h-0"
      >
        Abrir cálculo
        <ArrowRight className="h-4 w-4" />
      </Link>
      {row.hasUnlinkedCandidates ? (
        <Link
          href="/rentabilidad-real/calculadora/trabajo"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-amber-700 hover:text-amber-800 dark:text-amber-200 xl:min-h-0"
        >
          Asignar gastos
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
      {row.sourceHref ? (
        <Link
          href={row.sourceHref}
          aria-label={`Ver documento ${row.documentLabel}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 xl:min-h-0"
        >
          Ver documento
          <ExternalLink className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function MobileMetric({
  label,
  field,
  value,
  strong = false,
}: {
  label: string;
  field: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        data-report-field={field}
        className={`mt-1 break-words text-sm tabular-nums ${
          strong
            ? "font-black text-slate-950 dark:text-slate-50"
            : "font-bold text-slate-700 dark:text-slate-200"
        }`}
      >
        {value}
      </dd>
    </div>
  );
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
  const scrollHelpId = useId();
  const mobileHeadingPrefix = useId();
  const viewRows = useMemo(
    () => rows.map(buildDocumentProfitabilityRowViewModel),
    [rows],
  );
  const documentsWithoutMode = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((row) => row.analysisMode === "unknown")
            .map((row) => row.primaryDocumentId),
        ),
      ),
    [rows],
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
              className="min-h-11 w-full max-w-full rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-amber-900/60 dark:bg-slate-950 dark:text-slate-100 sm:w-auto"
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

      <section
        aria-label="Rentabilidad por documento en formato móvil"
        className="xl:hidden"
      >
        <ul className="space-y-3">
          {viewRows.map((row, index) => {
            const headingId = `${mobileHeadingPrefix}-${index}`;

            return (
              <li key={row.unitId}>
                <article
                  aria-labelledby={headingId}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <h3
                    id={headingId}
                    data-report-field="documentLabel"
                    className="break-words text-base font-black text-slate-950 dark:text-slate-50"
                  >
                    {row.documentLabel}
                  </h3>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Modo
                    </p>
                    <DocumentModeControl
                      row={row}
                      mobile
                      onAnalysisModeChange={onAnalysisModeChange}
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                    <MobileMetric
                      label="Cliente"
                      field="clientName"
                      value={row.clientName}
                    />
                    <MobileMetric label="Fecha" field="date" value={row.date} />
                    <MobileMetric
                      label="Ingreso"
                      field="incomeWithoutIndirectTax"
                      value={row.incomeWithoutIndirectTax}
                      strong
                    />
                    <MobileMetric
                      label="Costes"
                      field="totalDirectCosts"
                      value={row.totalDirectCosts}
                    />
                    <MobileMetric
                      label="Fijos"
                      field="allocatedFixedCosts"
                      value={row.allocatedFixedCosts}
                    />
                    <MobileMetric
                      label="Beneficio doc."
                      field="operatingProfit"
                      value={row.operatingProfit}
                      strong
                    />
                    <MobileMetric
                      label="Beneficio interno"
                      field="internalRealProfit"
                      value={row.internalRealProfit}
                      strong
                    />
                    <MobileMetric
                      label="Margen"
                      field="marginPercentage"
                      value={row.marginPercentage}
                    />
                  </dl>

                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Alertas
                    </p>
                    <DocumentAlerts row={row} />
                  </div>

                  <div className="mt-3">
                    <DocumentActions row={row} />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="hidden xl:block">
        <p
          id={scrollHelpId}
          className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          Si no ves todas las columnas, desplaza la tabla horizontalmente.
        </p>
        <div
          role="region"
          aria-label="Tabla completa de rentabilidad por documento"
          aria-describedby={scrollHelpId}
          tabIndex={0}
          className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">
              Rentabilidad por documento con todas sus cifras, modos, alertas y
              acciones
            </caption>
            <thead>
              <tr className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                {[
                  "Documento",
                  "Modo",
                  "Cliente",
                  "Fecha",
                  "Ingreso",
                  "Costes",
                  "Fijos",
                  "Beneficio doc.",
                  "Beneficio interno",
                  "Margen",
                  "Alertas",
                  "Acción",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-slate-200 px-3 py-3 dark:border-slate-700"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewRows.map((row) => (
                <tr key={row.unitId} className="align-top">
                  <th
                    scope="row"
                    className="border-b border-slate-100 px-3 py-4 font-black text-slate-950 dark:border-slate-800 dark:text-slate-50"
                    data-report-field="documentLabel"
                  >
                    {row.documentLabel}
                  </th>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <DocumentModeControl
                      row={row}
                      onAnalysisModeChange={onAnalysisModeChange}
                    />
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="clientName"
                  >
                    {row.clientName}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 text-slate-600 dark:border-slate-800 dark:text-slate-300"
                    data-report-field="date"
                  >
                    {row.date}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 font-bold tabular-nums text-slate-900 dark:border-slate-800 dark:text-slate-100"
                    data-report-field="incomeWithoutIndirectTax"
                  >
                    {row.incomeWithoutIndirectTax}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="totalDirectCosts"
                  >
                    {row.totalDirectCosts}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="allocatedFixedCosts"
                  >
                    {row.allocatedFixedCosts}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 font-bold tabular-nums text-slate-900 dark:border-slate-800 dark:text-slate-100"
                    data-report-field="operatingProfit"
                  >
                    {row.operatingProfit}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 font-bold tabular-nums text-slate-900 dark:border-slate-800 dark:text-slate-100"
                    data-report-field="internalRealProfit"
                  >
                    {row.internalRealProfit}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="marginPercentage"
                  >
                    {row.marginPercentage}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <DocumentAlerts row={row} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <DocumentActions row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
