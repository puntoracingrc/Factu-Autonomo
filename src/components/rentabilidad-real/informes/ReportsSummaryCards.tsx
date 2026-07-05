"use client";

import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealDocumentReportSummary } from "@/lib/rentabilidad-real/reports";

function formatPercent(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`;
}

interface SummaryCard {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "warning";
}

function toneClass(tone: SummaryCard["tone"]) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35";
  }
  return "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60";
}

export function ReportsSummaryCards({
  summary,
}: {
  summary: RentabilidadRealDocumentReportSummary;
}) {
  const cards: SummaryCard[] = [
    {
      label: "Ingresos analizados sin IVA",
      value: formatMoney(summary.incomeWithoutIndirectTax),
      detail: `${summary.rowCount} documentos`,
    },
    {
      label: "Beneficio operativo documentado",
      value: formatMoney(summary.operatingProfit),
      detail: "Antes de ajustes internos",
      tone: summary.operatingProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Beneficio interno real",
      value: formatMoney(summary.internalRealProfit),
      detail: "Documentado menos ajustes internos",
      tone: summary.internalRealProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Margen medio",
      value: formatPercent(summary.averageMarginPercentage),
      detail: "Ponderado por ingresos",
      tone: summary.averageMarginPercentage >= 0 ? "positive" : "warning",
    },
    {
      label: "IVA estimado a reservar",
      value: formatMoney(summary.estimatedVatToReserve),
      detail: "Orientativo",
      tone: "warning",
    },
    {
      label: "Provisión IRPF estimada",
      value: formatMoney(summary.estimatedIrpfProvision),
      detail: "Orientativa",
      tone: "warning",
    },
    {
      label: "Caja prudente",
      value: formatMoney(summary.prudentAvailableCash),
      detail: "Sin ajustes internos",
      tone: summary.prudentAvailableCash >= 0 ? "positive" : "warning",
    },
    {
      label: "Documentos con margen bajo",
      value: String(summary.lowMarginDocumentsCount),
      detail: "Según umbral elegido",
      tone: summary.lowMarginDocumentsCount > 0 ? "warning" : "default",
    },
    {
      label: "Gastos candidatos sin enlazar",
      value: String(summary.unlinkedCandidatesCount),
      detail: "Pueden afectar al margen",
      tone: summary.unlinkedCandidatesCount > 0 ? "warning" : "default",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`min-h-32 rounded-lg border p-4 ${toneClass(card.tone)}`}
        >
          <p className="text-sm font-black text-slate-600 dark:text-slate-300">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
            {card.value}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {card.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
