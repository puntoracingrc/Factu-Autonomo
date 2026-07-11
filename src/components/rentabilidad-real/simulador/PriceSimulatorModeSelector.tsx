"use client";

import { Briefcase, Calculator, CalendarDays, Clock3 } from "lucide-react";
import type { RentabilidadRealPriceSimulatorMode } from "@/lib/rentabilidad-real/price-simulator";

const MODES: Array<{
  value: RentabilidadRealPriceSimulatorMode;
  label: string;
  description: string;
  icon: typeof Calculator;
}> = [
  {
    value: "hourly_rate",
    label: "Por hora",
    description: "Tarifa mínima por hora real.",
    icon: Clock3,
  },
  {
    value: "job",
    label: "Trabajo/obra",
    description: "Precio mínimo de un servicio cerrado.",
    icon: Briefcase,
  },
  {
    value: "closed_project",
    label: "Proyecto cerrado",
    description: "Proyecto con horas reales previstas.",
    icon: Calculator,
  },
  {
    value: "monthly_revenue",
    label: "Mensual",
    description: "Facturación mínima del mes.",
    icon: CalendarDays,
  },
];

export function PriceSimulatorModeSelector({
  mode,
  onModeChange,
}: {
  mode: RentabilidadRealPriceSimulatorMode;
  onModeChange: (mode: RentabilidadRealPriceSimulatorMode) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {MODES.map((item) => {
        const Icon = item.icon;
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onModeChange(item.value)}
            className={`min-h-28 rounded-lg border p-4 text-left transition-colors ${
              active
                ? "border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/45 dark:text-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-black">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
            <span className="mt-2 block text-sm leading-5 opacity-80">
              {item.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
