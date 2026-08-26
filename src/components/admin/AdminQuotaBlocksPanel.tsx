"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AdminQuotaBlocksResponse } from "@/lib/admin/quota-blocks";
import { billingQuotaSourceLabel } from "@/lib/admin/quota-blocks";
import {
  BILLING_QUOTA_METRICS,
  billingQuotaMetricLabel,
} from "@/lib/billing/quotas";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

const RANGE_OPTIONS = [1, 7, 30, 90] as const;

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export function AdminQuotaBlocksPanel() {
  const [rangeDays, setRangeDays] = useState(7);
  const [data, setData] = useState<AdminQuotaBlocksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = await getSupabaseClientAsync();
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    if (!session?.access_token) {
      setError("No hay una sesión administradora disponible.");
      setLoading(false);
      return;
    }
    const response = await fetch(
      `/api/admin/quota-blocks?days=${rangeDays}&limit=100`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      },
    ).catch(() => null);
    const body = response
      ? ((await response.json().catch(() => ({}))) as AdminQuotaBlocksResponse)
      : null;
    if (!response?.ok || !body) {
      setError(body?.error ?? "No se pudieron consultar los límites.");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }, [rangeDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Límites del plan Gratis
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Bloqueos confirmados por el servidor. No se guardan nombres de
            clientes, proveedores ni documentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
            aria-label="Periodo consultado"
          >
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`min-h-10 rounded-md px-3 text-sm font-semibold transition-colors ${
                  rangeDays === days
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-pressed={rangeDays === days}
              >
                {days} d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title="Actualizar"
            aria-label="Actualizar bloqueos"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!error && data && !data.monitoringAvailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.message}
        </div>
      ) : null}

      {!error && data?.monitoringAvailable ? (
        <>
          <div className="grid grid-cols-2 border-y border-slate-200 sm:grid-cols-4">
            <div className="px-3 py-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Bloqueos
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {data.total}
              </p>
            </div>
            <div className="border-l border-slate-200 px-3 py-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Cuentas
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {data.uniqueAccounts}
              </p>
            </div>
            <div className="border-t border-slate-200 px-3 py-4 sm:border-l sm:border-t-0">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Documentos
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {data.byMetric.documents ?? 0}
              </p>
            </div>
            <div className="border-l border-t border-slate-200 px-3 py-4 sm:border-t-0">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Contactos
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {(data.byMetric.customers ?? 0) +
                  (data.byMetric.suppliers ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            {BILLING_QUOTA_METRICS.map((metric) => (
              <span
                key={metric}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
              >
                {billingQuotaMetricLabel(metric)}: {data.byMetric[metric] ?? 0}
              </span>
            ))}
          </div>

          {data.events.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No hubo bloqueos en este periodo.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {data.events.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-2 py-4 text-sm md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {event.account.email ?? event.account.key}
                    </p>
                    <p className="text-slate-600">
                      {billingQuotaSourceLabel(event.source)}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {billingQuotaMetricLabel(event.metric)}
                    </p>
                    <p className="text-slate-600">
                      {event.currentUsage} de {event.effectiveLimit ?? "sin límite"}
                      {event.creditBalance > 0
                        ? `, ${event.creditBalance} extras disponibles`
                        : ""}
                    </p>
                  </div>
                  <time
                    dateTime={event.createdAt}
                    className="whitespace-nowrap text-slate-500"
                  >
                    {dateTimeLabel(event.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {loading && !data ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Cargando bloqueos...
        </p>
      ) : null}
    </Card>
  );
}
