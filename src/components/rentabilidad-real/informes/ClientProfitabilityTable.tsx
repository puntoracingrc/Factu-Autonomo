"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealClientReportRow } from "@/lib/rentabilidad-real/reports";

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`;
}

export function ClientProfitabilityTable({
  rows,
}: {
  rows: RentabilidadRealClientReportRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[820px] w-full border-separate border-spacing-0 text-left text-sm">
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
          {rows.map((row) => (
            <tr key={row.clientId} className="align-top">
              <td className="border-b border-slate-100 px-3 py-4 font-black text-slate-950 dark:border-slate-800 dark:text-slate-50">
                {row.clientName}
              </td>
              <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                {row.documentCount}
              </td>
              <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                {formatMoney(row.incomeWithoutIndirectTax)}
              </td>
              <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                {formatMoney(row.operatingProfit)}
              </td>
              <td className="border-b border-slate-100 px-3 py-4 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                {formatMoney(row.internalRealProfit)}
              </td>
              <td className="border-b border-slate-100 px-3 py-4 text-slate-700 dark:border-slate-800 dark:text-slate-200">
                {formatPercent(row.averageMarginPercentage)}
              </td>
              <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                <div className="flex flex-wrap gap-1">
                  {row.lowMarginDocumentsCount > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/45 dark:text-amber-100">
                      {row.lowMarginDocumentsCount} margen bajo
                    </span>
                  ) : null}
                  {row.negativeProfitDocumentsCount > 0 ? (
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-800 dark:bg-rose-950/45 dark:text-rose-100">
                      {row.negativeProfitDocumentsCount} negativo
                    </span>
                  ) : null}
                  {row.unlinkedCandidatesCount > 0 ? (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-800 dark:bg-blue-950/45 dark:text-blue-100">
                      {row.unlinkedCandidatesCount} candidatos
                    </span>
                  ) : null}
                  {row.warnings.length === 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                      OK
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="border-b border-slate-100 px-3 py-4 dark:border-slate-800">
                <Link
                  href="/clientes"
                  className="inline-flex items-center gap-1 text-sm font-black text-blue-700 hover:text-blue-800 dark:text-blue-200"
                >
                  Ver clientes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
