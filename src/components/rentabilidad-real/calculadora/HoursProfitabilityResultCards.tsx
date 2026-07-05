"use client";

import { formatMoney } from "@/lib/calculations";
import type { RentabilidadRealHoursProfitabilityResult } from "@/lib/rentabilidad-real/calculation";

export function HoursProfitabilityResultCards({
  result,
}: {
  result: RentabilidadRealHoursProfitabilityResult;
}) {
  const cards = [
    ["Ingreso sin IVA", formatMoney(result.incomeWithoutIndirectTax)],
    ["Horas reales", `${result.totalRealHours.toLocaleString("es-ES")} h`],
    ["Tarifa aparente", formatMoney(result.billedHourlyRate)],
    ["€/hora real antes de costes", formatMoney(result.effectiveHourlyRateBeforeCosts)],
    ["Beneficio operativo documentado", formatMoney(result.documentedOperatingProfit)],
    ["Beneficio documentado por hora real", formatMoney(result.operatingProfitPerRealHour)],
    ["Ajustes internos no fiscales", formatMoney(result.internalAdjustmentsTotal)],
    ["Beneficio interno real", formatMoney(result.internalRealProfit)],
    ["Beneficio interno por hora real", formatMoney(result.internalRealProfitPerRealHour)],
    ["Caja prudente por hora", formatMoney(result.prudentCashPerRealHour)],
    ["Caja interna por hora", formatMoney(result.internalPrudentCashPerRealHour)],
    ["Horas no facturadas", `${result.unbilledHours.toLocaleString("es-ES")} h`],
    ["IVA estimado a reservar", formatMoney(result.estimatedVatToReserve)],
    ["Provisión IRPF estimada", formatMoney(result.estimatedIrpfProvision)],
    ["Caja prudente", formatMoney(result.prudentAvailableCash)],
    [
      "Margen %",
      `${result.marginPercentage.toLocaleString("es-ES", {
        maximumFractionDigits: 2,
      })}%`,
    ],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
        >
          <p className="text-sm font-black text-slate-600 dark:text-slate-300">
            {label}
          </p>
          <p className="mt-2 text-xl font-black text-slate-950 dark:text-slate-50">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
