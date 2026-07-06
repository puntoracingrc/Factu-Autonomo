"use client";

import { useMemo } from "react";
import { DatabaseZap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { getRentabilidadRealExistingDataStatus } from "@/lib/rentabilidad-real/integrations";
import type { ProfitabilityExistingDataStatus } from "@/lib/rentabilidad-real/integrations";

const STATUS_LABELS: Record<ProfitabilityExistingDataStatus, string> = {
  detected: "Preparado",
  pending_mapping: "Revisar",
  read_only_connected: "Conectado",
  not_found: "No activo",
  risk_detected: "Revisar",
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

const STATUS_GROUPS: {
  title: string;
  description: string;
  statuses: ProfitabilityExistingDataStatus[];
}[] = [
  {
    title: "Leyendo ahora",
    description: "Datos que ya entran en los cálculos.",
    statuses: ["read_only_connected"],
  },
  {
    title: "Preparado",
    description: "Flujos localizados; se usarán cuando haya datos.",
    statuses: ["detected"],
  },
  {
    title: "Revisar",
    description: "Solo si hay algo pendiente o raro.",
    statuses: ["pending_mapping", "risk_detected"],
  },
  {
    title: "No activo",
    description: "No afecta al cálculo actual.",
    statuses: ["not_found"],
  },
];

export function RentabilidadRealExistingDataPanel() {
  const { data } = useAppStore();
  const statusItems = useMemo(
    () => getRentabilidadRealExistingDataStatus(data),
    [data],
  );
  const groupedItems = STATUS_GROUPS.map((group) => ({
    ...group,
    items: statusItems.filter((item) => group.statuses.includes(item.status)),
  })).filter((group) => group.items.length > 0);

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
            <DatabaseZap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Datos conectados
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Rentabilidad Real lee tus datos actuales en modo consulta. No crea
              otra contabilidad.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Solo lectura
        </span>
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        {groupedItems.map((group) => (
          <section
            key={group.title}
            className="grid gap-2 sm:grid-cols-[11rem_1fr] sm:items-start"
          >
            <div className="flex items-baseline gap-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {group.title}
                  </h3>
                  <span className="text-xs font-black tabular-nums text-slate-400 dark:text-slate-500">
                    {group.items.length}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                  {group.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item.key}
                  title={`${STATUS_LABELS[item.status]}: ${item.detail}`}
                  className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-black leading-none ${STATUS_CLASSES[item.status]}`}
                >
                  <span className="truncate">{item.label}</span>
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
