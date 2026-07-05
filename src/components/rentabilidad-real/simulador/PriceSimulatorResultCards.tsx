"use client";

import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealPriceSimulatorResult } from "@/lib/rentabilidad-real/price-simulator";

const SIMULATOR_MANDATORY_COPY =
  "Este resultado es orientativo. El IRPF mostrado es una provisión estimada y el IVA no forma parte de tu beneficio.";

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

export function PriceSimulatorResultCards({
  result,
}: {
  result: RentabilidadRealPriceSimulatorResult;
}) {
  const cards: MetricCard[] = [
    {
      label: "Precio mínimo sin IVA",
      value: formatMoney(result.minimumPriceWithoutVat),
      detail: "Cubre costes, fijos e IRPF estimado",
      tone: "positive",
    },
    {
      label: "Precio recomendado sin IVA",
      value: formatMoney(result.recommendedPriceWithoutVat),
      detail: "Precio mínimo con margen deseado",
      tone: "positive",
    },
    {
      label: "Precio con IVA",
      value: formatMoney(result.priceWithVat),
      detail: "Lo que verá el cliente si aplica IVA",
      tone: "warning",
    },
    {
      label: "Coste directo",
      value: formatMoney(result.directCost),
      detail: "Estimado o detectado",
    },
    {
      label: "Gasto fijo imputado",
      value: formatMoney(result.fixedCostAllocation),
      detail: "Según regla elegida",
    },
    {
      label: "Provisión IRPF",
      value: formatMoney(result.estimatedIrpfProvision),
      detail: "Orientativa, no impuesto definitivo",
      tone: "warning",
    },
    {
      label: "Beneficio documentado esperado",
      value: formatMoney(result.expectedDocumentedProfit),
      detail: "Antes de ajustes internos",
      tone: result.expectedDocumentedProfit >= 0 ? "positive" : "warning",
    },
    {
      label: "Beneficio interno esperado",
      value: formatMoney(result.expectedInternalProfitAfterAdjustments),
      detail: "Después de ajustes internos",
      tone:
        result.expectedInternalProfitAfterAdjustments >= 0
          ? "positive"
          : "warning",
    },
    {
      label: "Caja prudente esperada",
      value: formatMoney(result.prudentCash),
      detail: "Beneficio documentado menos IRPF estimado",
      tone: result.prudentCash >= 0 ? "positive" : "warning",
    },
    {
      label: "Tarifa mínima por hora real",
      value: formatMoney(result.minimumHourlyRate),
      detail: "Precio mínimo dividido por horas reales",
    },
    {
      label: "Tarifa recomendada por hora real",
      value: formatMoney(result.recommendedHourlyRate),
      detail: "Precio recomendado dividido por horas reales",
    },
    {
      label: "Facturación mínima mensual",
      value: formatMoney(result.monthlyMinimumRevenue),
      detail: "Costes mensuales y objetivo mensual",
    },
    {
      label: "Trabajos necesarios al mes",
      value: result.requiredJobsPerMonth.toLocaleString("es-ES", {
        maximumFractionDigits: 2,
      }),
      detail: "Según precio medio indicado",
    },
    {
      label: "Mínimo interno con ajustes",
      value: formatMoney(result.minimumInternalPriceWithoutVat),
      detail: "No fiscal, solo rentabilidad interna",
      tone: result.minimumInternalPriceWithoutVat > result.minimumPriceWithoutVat
        ? "warning"
        : "default",
    },
  ];

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
        {SIMULATOR_MANDATORY_COPY} IVA incluido solo para calcular lo que verá
        el cliente; no forma parte de tu beneficio.
      </p>
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
    </div>
  );
}
