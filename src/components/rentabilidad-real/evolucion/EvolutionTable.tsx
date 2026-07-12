"use client";

import { useId, useMemo } from "react";
import type {
  RentabilidadRealEvolutionGrouping,
  RentabilidadRealEvolutionPeriodRow,
} from "@/lib/rentabilidad-real/evolution";
import {
  buildEvolutionRowViewModel,
  type EvolutionRowViewModel,
} from "../report-table-view-models";

function firstColumnLabel(grouping: RentabilidadRealEvolutionGrouping): string {
  return grouping === "client"
    ? "Cliente"
    : grouping === "analysis_mode"
      ? "Modo"
      : "Periodo";
}

function EvolutionModes({ row }: { row: EvolutionRowViewModel }) {
  return (
    <div
      aria-label={`Desglose de modos de ${row.periodLabel}`}
      className="flex max-w-64 flex-wrap gap-1"
    >
      {row.modes.map((mode) => (
        <span
          key={mode.analysisMode}
          data-report-mode={mode.analysisMode}
          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {mode.label}
        </span>
      ))}
    </div>
  );
}

function EvolutionAlerts({ row }: { row: EvolutionRowViewModel }) {
  const labels = row.alerts.length === 0 ? ["OK"] : row.alerts;
  const isOk = row.alerts.length === 0;

  return (
    <div
      aria-label={`Alertas de ${row.periodLabel}`}
      className="flex max-w-56 flex-wrap gap-1"
    >
      {labels.map((label) => (
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

function EvolutionMetric({
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

export function EvolutionTable({
  rows,
  grouping,
}: {
  rows: RentabilidadRealEvolutionPeriodRow[];
  grouping: RentabilidadRealEvolutionGrouping;
}) {
  const scrollHelpId = useId();
  const mobileHeadingPrefix = useId();
  const columnLabel = firstColumnLabel(grouping);
  const viewRows = useMemo(() => rows.map(buildEvolutionRowViewModel), [rows]);

  return (
    <>
      <section
        aria-label="Evolución de rentabilidad en formato móvil"
        className="xl:hidden"
      >
        <ul className="space-y-3">
          {viewRows.map((row, index) => {
            const headingId = `${mobileHeadingPrefix}-${index}`;

            return (
              <li key={row.periodId}>
                <article
                  aria-labelledby={headingId}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {columnLabel}
                  </p>
                  <h3
                    id={headingId}
                    data-report-field="periodLabel"
                    className="mt-1 break-words text-base font-black text-slate-950 dark:text-slate-50"
                  >
                    {row.periodLabel}
                  </h3>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                    <EvolutionMetric
                      label="Documentos"
                      field="documentCount"
                      value={row.documentCount}
                    />
                    <EvolutionMetric
                      label="Ingresos"
                      field="incomeWithoutIndirectTax"
                      value={row.incomeWithoutIndirectTax}
                      strong
                    />
                    <EvolutionMetric
                      label="Costes"
                      field="totalDirectCosts"
                      value={row.totalDirectCosts}
                    />
                    <EvolutionMetric
                      label="Fijos"
                      field="allocatedFixedCosts"
                      value={row.allocatedFixedCosts}
                    />
                    <EvolutionMetric
                      label="Beneficio"
                      field="operatingProfit"
                      value={row.operatingProfit}
                      strong
                    />
                    <EvolutionMetric
                      label="Margen"
                      field="averageMarginPercentage"
                      value={row.averageMarginPercentage}
                    />
                    <EvolutionMetric
                      label="Caja"
                      field="prudentAvailableCash"
                      value={row.prudentAvailableCash}
                    />
                  </dl>

                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Modos
                    </p>
                    <EvolutionModes row={row} />
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Alertas
                    </p>
                    <EvolutionAlerts row={row} />
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
          aria-label="Tabla completa de evolución de rentabilidad"
          aria-describedby={scrollHelpId}
          tabIndex={0}
          className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <table className="min-w-[1100px] w-full border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">
              Evolución de rentabilidad con todas sus cifras, modos y alertas
            </caption>
            <thead>
              <tr className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                {[
                  columnLabel,
                  "Docs",
                  "Ingresos",
                  "Costes",
                  "Fijos",
                  "Beneficio",
                  "Margen",
                  "Caja",
                  "Modos",
                  "Alertas",
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
                <tr key={row.periodId} className="align-top">
                  <td
                    className="border-b border-slate-100 px-3 py-4 font-black text-slate-950 dark:border-slate-800 dark:text-slate-50"
                    data-report-field="periodLabel"
                  >
                    {row.periodLabel}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="documentCount"
                  >
                    {row.documentCount}
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
                    className="border-b border-slate-100 px-3 py-4 tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="averageMarginPercentage"
                  >
                    {row.averageMarginPercentage}
                  </td>
                  <td
                    className="border-b border-slate-100 px-3 py-4 tabular-nums text-slate-700 dark:border-slate-800 dark:text-slate-200"
                    data-report-field="prudentAvailableCash"
                  >
                    {row.prudentAvailableCash}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <EvolutionModes row={row} />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <EvolutionAlerts row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
