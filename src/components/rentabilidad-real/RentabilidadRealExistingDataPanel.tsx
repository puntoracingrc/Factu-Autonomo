"use client";

import { useMemo } from "react";
import { DatabaseZap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { getRentabilidadRealExistingDataStatus } from "@/lib/rentabilidad-real/integrations";
import type { ProfitabilityExistingDataStatus } from "@/lib/rentabilidad-real/integrations";

const STATUS_LABELS: Record<ProfitabilityExistingDataStatus, string> = {
  detected: "detectado",
  pending_mapping: "pendiente de mapear",
  read_only_connected: "conectado read-only",
  not_found: "no encontrado",
  risk_detected: "riesgo detectado",
};

const STATUS_CLASSES: Record<ProfitabilityExistingDataStatus, string> = {
  detected:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100",
  pending_mapping:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100",
  read_only_connected:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100",
  not_found:
    "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  risk_detected:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100",
};

export function RentabilidadRealExistingDataPanel() {
  const { data } = useAppStore();
  const statusItems = useMemo(
    () => getRentabilidadRealExistingDataStatus(data),
    [data],
  );

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
              <DatabaseZap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
                Conectado con tus datos existentes
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Rentabilidad Real usará tus facturas, presupuestos, gastos,
                gastos fijos, escaneos, artículos e impuestos existentes. No
                tendrás que llevar cuentas duplicadas.
              </p>
            </div>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Solo lectura
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statusItems.map((item) => (
          <div
            key={item.key}
            className="min-h-32 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/55"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
                {item.label}
              </h3>
              <span
                className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase leading-none ${STATUS_CLASSES[item.status]}`}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
