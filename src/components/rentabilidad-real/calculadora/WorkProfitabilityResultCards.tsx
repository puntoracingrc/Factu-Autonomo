"use client";

import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealWorkProfitabilityResult } from "@/lib/rentabilidad-real/calculation";

interface MetricCard {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "warning";
}

function cardToneClass(tone: MetricCard["tone"]): string {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/35";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/35";
  }
  return "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60";
}

export function WorkProfitabilityResultCards({
  result,
}: {
  result: RentabilidadRealWorkProfitabilityResult;
}) {
  const cards: MetricCard[] = [
    {
      label: "Ingreso sin IVA",
      value: formatMoney(result.incomeWithoutIndirectTax),
      detail: result.actualIncomeWithoutIndirectTax
        ? "Ingreso real de factura"
        : "Ingreso previsto de presupuesto",
    },
    {
      label: "Costes directos",
      value: formatMoney(result.totalDirectCosts),
      detail: `${result.directCosts.length} gastos enlazados`,
    },
    {
      label: "Gastos fijos imputados",
      value: formatMoney(result.allocatedFixedCosts),
      detail: result.fixedCostAllocationMethod,
    },
    {
      label: "Margen directo",
      value: formatMoney(result.grossMargin),
      detail: "Ingreso sin IVA menos costes directos",
      tone: result.grossMargin >= 0 ? "positive" : "warning",
    },
    {
      label: "Beneficio operativo documentado",
      value: formatMoney(result.documentedOperatingProfit),
      detail: "Antes de provisión IRPF",
      tone: result.operatingProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "IVA estimado a reservar",
      value: formatMoney(result.estimatedVatToReserve),
      detail: "No es IVA definitivo",
      tone: "warning",
    },
    {
      label: "Provisión IRPF estimada",
      value: formatMoney(result.estimatedIrpfProvision),
      detail: "No es IRPF definitivo",
      tone: "warning",
    },
    {
      label: "Caja prudente",
      value: formatMoney(result.prudentAvailableCash),
      detail: "Beneficio operativo menos IRPF estimado",
      tone: result.prudentAvailableCash >= 0 ? "positive" : "warning",
    },
    {
      label: "Ajustes internos no fiscales",
      value: formatMoney(result.internalAdjustmentsTotal),
      detail: "Solo rentabilidad interna",
      tone: result.internalAdjustmentsTotal > 0 ? "warning" : "default",
    },
    {
      label: "Beneficio interno real",
      value: formatMoney(result.internalRealProfit),
      detail: "Documentado menos ajustes internos",
      tone: result.internalRealProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Caja interna tras ajustes",
      value: formatMoney(result.internalPrudentAvailableCash),
      detail: "Caja prudente menos ajustes internos",
      tone: result.internalPrudentAvailableCash >= 0 ? "positive" : "warning",
    },
    {
      label: "Margen %",
      value: `${result.marginPercentage.toLocaleString("es-ES", {
        maximumFractionDigits: 2,
      })}%`,
      detail: "Sobre ingreso económico sin IVA",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`min-h-32 rounded-lg border p-4 ${cardToneClass(card.tone)}`}
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
