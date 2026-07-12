"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RentabilidadRealClientReportRow } from "@/lib/rentabilidad-real/reports";
import {
  buildClientProfitabilityRowViewModel,
  type ClientAlertTone,
  type ClientAlertViewModel,
} from "../report-table-view-models";

function alertBadgeClass(tone: ClientAlertTone): string {
  if (tone === "warning") {
    return "bg-amber-50 text-amber-800 dark:bg-amber-950/45 dark:text-amber-100";
  }
  if (tone === "risk") {
    return "bg-rose-50 text-rose-800 dark:bg-rose-950/45 dark:text-rose-100";
  }
  if (tone === "info") {
    return "bg-blue-50 text-blue-800 dark:bg-blue-950/45 dark:text-blue-100";
  }
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200";
}

function ClientAlerts({
  alerts,
  clientName,
}: {
  alerts: ClientAlertViewModel[];
  clientName: string;
}) {
  return (
    <div
      aria-label={`Alertas de ${clientName}`}
      className="flex flex-wrap gap-1"
    >
      {alerts.map((alert) => (
        <span
          key={`${alert.tone}-${alert.label}`}
          data-report-alert={alert.label}
          className={`rounded-full px-2 py-1 text-xs font-black ${alertBadgeClass(
            alert.tone,
          )}`}
        >
          {alert.label}
        </span>
      ))}
    </div>
  );
}

function ClientAction() {
  return (
    <Link
      href="/clientes"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-blue-700 hover:text-blue-800 dark:text-blue-200 xl:min-h-0"
    >
      Ver clientes
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function ClientProfitabilityTable({
  rows,
}: {
  rows: RentabilidadRealClientReportRow[];
}) {
  const scrollHelpId = useId();
  const mobileHeadingPrefix = useId();
  const viewRows = useMemo(
    () => rows.map(buildClientProfitabilityRowViewModel),
    [rows],
  );

  return (
    <>
      <section
        aria-label="Rentabilidad por cliente en formato móvil"
        className="xl:hidden"
      >
        <ul className="space-y-3">
          {viewRows.map((row, index) => {
            const headingId = `${mobileHeadingPrefix}-${index}`;

            return (
              <li key={row.clientId}>
                <article
                  aria-labelledby={headingId}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <h3
                    id={headingId}
                    className="break-words text-base font-black text-slate-950 dark:text-slate-50"
                    data-report-field="clientName"
                  >
                    {row.clientName}
                  </h3>

                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Documentos
                      </dt>
                      <dd
                        className="mt-1 break-words text-sm font-black tabular-nums text-slate-950 dark:text-slate-50"
                        data-report-field="documentCount"
                      >
                        {row.documentCount}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Ingresos
                      </dt>
                      <dd
                        className="mt-1 break-words text-sm font-black tabular-nums text-slate-950 dark:text-slate-50"
                        data-report-field="incomeWithoutIndirectTax"
                      >
                        {row.incomeWithoutIndirectTax}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Beneficio doc.
                      </dt>
                      <dd
                        className="mt-1 break-words text-sm font-black tabular-nums text-slate-950 dark:text-slate-50"
                        data-report-field="operatingProfit"
                      >
                        {row.operatingProfit}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Beneficio interno
                      </dt>
                      <dd
                        className="mt-1 break-words text-sm font-black tabular-nums text-slate-950 dark:text-slate-50"
                        data-report-field="internalRealProfit"
                      >
                        {row.internalRealProfit}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Margen medio
                      </dt>
                      <dd
                        className="mt-1 break-words text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200"
                        data-report-field="averageMarginPercentage"
                      >
                        {row.averageMarginPercentage}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Alertas
                    </p>
                    <ClientAlerts
                      alerts={row.alerts}
                      clientName={row.clientName}
                    />
                  </div>

                  <div className="mt-3">
                    <ClientAction />
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
          aria-label="Tabla completa de rentabilidad por cliente"
          aria-describedby={scrollHelpId}
          tabIndex={0}
          className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <table className="min-w-[820px] w-full border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">
              Rentabilidad por cliente con todas sus cifras, alertas y acciones
            </caption>
            <thead>
              <tr className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                  Cliente
                </th>
                <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                  Docs.
                </th>
                <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                  Ingresos
                </th>
                <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                  Beneficio doc.
                </th>
                <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                  Beneficio interno
                </th>
                <th className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                  Margen medio
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
              {viewRows.map((row) => (
                <tr key={row.clientId} className="align-top">
                  <td
                    className="border-b border-slate-100 px-3 py-4 font-black text-slate-950 dark:border-slate-800 dark:text-slate-50"
                    data-report-field="clientName"
                  >
                    {row.clientName}
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
                    data-report-field="averageMarginPercentage"
                  >
                    {row.averageMarginPercentage}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <ClientAlerts
                      alerts={row.alerts}
                      clientName={row.clientName}
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                    <ClientAction />
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
