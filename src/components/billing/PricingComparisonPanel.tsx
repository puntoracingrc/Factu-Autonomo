"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  COMPARISON_METHODOLOGY,
  PRICING_REVIEW,
  buildPricingRanking,
  formatReferencePrice,
  formatVerifiedDate,
  getPricingRankingSummary,
} from "@/lib/billing/competitor-pricing";

export function PricingComparisonPanel() {
  const [showMethodology, setShowMethodology] = useState(false);
  const summary = getPricingRankingSummary();
  const ranking = buildPricingRanking();

  return (
    <Card className="mb-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-800">
          #{summary.rank}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">¿Por qué este precio?</h2>
          <p className="mt-1 text-sm font-semibold text-violet-800">
            {summary.headline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Factura Autónomo no incluye banca, nóminas ni modelos AEAT automáticos:
            solo facturación clara, gastos y resumen fiscal. Por eso Pro está en{" "}
            <strong>{formatReferencePrice(ranking.find((e) => e.isUs)?.referenceMonthlyEur ?? 0)}/mes</strong>{" "}
            — por debajo de alternativas parecidas del mercado español.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Herramienta</th>
              <th className="px-2 py-2 font-semibold">Plan comparable</th>
              <th className="px-2 py-2 font-semibold">€/mes ref.</th>
              <th className="px-2 py-2 font-semibold">Límites</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry) => (
              <tr
                key={entry.id}
                className={
                  entry.isUs
                    ? "border-b border-violet-200 bg-violet-50/80"
                    : "border-b border-slate-100"
                }
              >
                <td className="px-2 py-2.5 font-semibold text-slate-700">
                  {entry.rank}
                </td>
                <td className="px-2 py-2.5">
                  <span
                    className={
                      entry.isUs
                        ? "font-bold text-violet-900"
                        : "font-medium text-slate-800"
                    }
                  >
                    {entry.name}
                    {entry.isUs ? " (tú)" : ""}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-slate-600">{entry.planName}</td>
                <td className="px-2 py-2.5 whitespace-nowrap">
                  <span className="font-semibold text-slate-900">
                    {formatReferencePrice(entry.referenceMonthlyEur)}
                  </span>
                  {entry.promotionalMonthlyEur !== undefined && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Promo: {formatReferencePrice(entry.promotionalMonthlyEur)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-slate-600">{entry.limitsNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Precios orientativos sin IVA (el 21 % se añade al contratar). Fuentes:
        webs públicas, actualizado el {formatVerifiedDate(PRICING_REVIEW.lastVerified)}.
        Las promociones pueden variar; el ranking usa el precio habitual.
      </p>

      <button
        type="button"
        onClick={() => setShowMethodology((open) => !open)}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 underline"
      >
        {showMethodology ? (
          <>
            Ocultar metodología
            <ChevronUp className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            Ver metodología de comparación
            <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {showMethodology && (
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-600">
          {COMPARISON_METHODOLOGY.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {line}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
