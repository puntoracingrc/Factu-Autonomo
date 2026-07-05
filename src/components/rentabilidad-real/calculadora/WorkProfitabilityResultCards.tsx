"use client";

import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealWorkProfitabilityResult } from "@/lib/rentabilidad-real/calculation";

interface MetricCard {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "positive" | "warning";
}

const FIXED_COST_METHOD_LABELS: Record<
  RentabilidadRealWorkProfitabilityResult["fixedCostAllocationMethod"],
  string
> = {
  none: "No aplicados",
  manual_amount: "Importe manual",
  revenue_share: "Según facturación",
  monthly_jobs: "Por trabajos del mes",
  hours: "Por horas",
};

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
  const incomeLabel = result.actualIncomeWithoutIndirectTax
    ? "Factura sin IVA"
    : "Presupuesto sin IVA";
  const directCostCount =
    result.directCosts.length === 1
      ? "1 gasto enlazado"
      : `${result.directCosts.length} gastos enlazados`;
  const cards: MetricCard[] = [
    {
      label: incomeLabel,
      value: formatMoney(result.incomeWithoutIndirectTax),
      detail: "Lo que entra de verdad, sin contar el IVA.",
    },
    {
      label: "Gastos del trabajo",
      value: formatMoney(result.totalDirectCosts),
      detail: directCostCount,
    },
    {
      label: "Beneficio antes de impuestos",
      value: formatMoney(result.documentedOperatingProfit),
      detail: "Factura sin IVA menos gastos enlazados y fijos aplicados.",
      tone: result.operatingProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Aparta para IVA",
      value: formatMoney(result.estimatedVatToReserve),
      detail: "Orientativo; el IVA real se revisa en impuestos.",
      tone: "warning",
    },
    {
      label: "Aparta para IRPF",
      value: formatMoney(result.estimatedIrpfProvision),
      detail: "Orientativo; no es tu declaración final.",
      tone: "warning",
    },
    {
      label: "Caja prudente",
      value: formatMoney(result.prudentAvailableCash),
      detail: "Lo que quedaría apartando el IRPF estimado.",
      tone: result.prudentAvailableCash >= 0 ? "positive" : "warning",
    },
  ];
  const detailCards: MetricCard[] = [
    {
      label: "Margen antes de gastos fijos",
      value: formatMoney(result.grossMargin),
      detail: "Factura sin IVA menos gastos enlazados.",
      tone: result.grossMargin >= 0 ? "positive" : "warning",
    },
    {
      label: "Gastos fijos aplicados",
      value: formatMoney(result.allocatedFixedCosts),
      detail: FIXED_COST_METHOD_LABELS[result.fixedCostAllocationMethod],
    },
    {
      label: "Ajustes internos",
      value: formatMoney(result.internalAdjustmentsTotal),
      detail: "Solo para saber tu rentabilidad real interna.",
      tone: result.internalAdjustmentsTotal > 0 ? "warning" : "default",
    },
    {
      label: "Margen",
      value: `${result.marginPercentage.toLocaleString("es-ES", {
        maximumFractionDigits: 2,
      })}%`,
      detail: "Porcentaje sobre la factura sin IVA.",
    },
    {
      label: "Beneficio interno",
      value: formatMoney(result.internalRealProfit),
      detail: "Beneficio menos ajustes internos.",
      tone: result.internalRealProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Caja tras ajustes",
      value: formatMoney(result.internalPrudentAvailableCash),
      detail: "Caja prudente menos ajustes internos.",
      tone: result.internalPrudentAvailableCash >= 0 ? "positive" : "warning",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <ResultMetricCard key={card.label} card={card} />
        ))}
      </div>
      <details className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-black text-blue-700 dark:text-blue-200">
          Ver detalle del cálculo
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {detailCards.map((card) => (
            <ResultMetricCard key={card.label} card={card} compact />
          ))}
        </div>
      </details>
    </div>
  );
}

function ResultMetricCard({
  card,
  compact = false,
}: {
  card: MetricCard;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${compact ? "min-h-28" : "min-h-32"} ${cardToneClass(card.tone)}`}
    >
      <p className="text-sm font-black text-slate-600 dark:text-slate-300">
        {card.label}
      </p>
      <p
        className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} font-black text-slate-950 dark:text-slate-50`}
      >
        {card.value}
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
        {card.detail}
      </p>
    </div>
  );
}
