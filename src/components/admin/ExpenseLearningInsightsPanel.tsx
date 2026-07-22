"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CalendarDays,
  Layers3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

type StructuralGroup = "TABLE" | "SUMMARY" | "OTHER" | "UNKNOWN";
type ReviewValue =
  | "CONFIRMED"
  | "CORRECTED"
  | "REJECTED"
  | "NOT_REVIEWED"
  | "OTHER";
type SupportBand = "K10_19" | "K20_49" | "K50_99" | "K100_PLUS";

interface ExpenseLearningMetric {
  weekStart: string;
  structuralArchetypeGroup: StructuralGroup;
  bucketKind: "EXACT" | "COARSENED_OTHER";
  bucketValue: ReviewValue;
  supportBand: SupportBand;
  promotedAt: string;
  expiresAt: string;
}

interface ExpenseLearningInsightsResponse {
  available?: boolean;
  schemaVersion?: string;
  generatedAt?: string;
  metrics?: ExpenseLearningMetric[];
  error?: string;
}

const GROUP_LABELS: Record<StructuralGroup, string> = {
  TABLE: "Tabla de líneas",
  SUMMARY: "Resumen",
  OTHER: "Otra estructura",
  UNKNOWN: "Sin clasificar",
};

const REVIEW_LABELS: Record<ReviewValue, string> = {
  CONFIRMED: "Confirmado sin cambios",
  CORRECTED: "Corregido",
  REJECTED: "Rechazado",
  NOT_REVIEWED: "Sin revisión humana",
  OTHER: "Distribución agrupada",
};

const SUPPORT_LABELS: Record<SupportBand, string> = {
  K10_19: "10-19 cuentas",
  K20_49: "20-49 cuentas",
  K50_99: "50-99 cuentas",
  K100_PLUS: "100 o más cuentas",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function ExpenseLearningInsightsPanel() {
  const [state, setState] = useState<{
    loading: boolean;
    response: ExpenseLearningInsightsResponse;
  }>({ loading: true, response: {} });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      const supabase = await getSupabaseClientAsync();
      const { data } = (await supabase?.auth.getSession()) ?? {
        data: { session: null },
      };
      const token = data.session?.access_token;
      if (!token) throw new Error("Inicia sesión con una cuenta administradora.");

      const response = await fetch("/api/admin/expense-learning-insights", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as ExpenseLearningInsightsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar las métricas.");
      }
      setState({ loading: false, response: payload });
    } catch (error) {
      setState({
        loading: false,
        response: {
          error:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las métricas.",
        },
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => state.response.metrics ?? [],
    [state.response.metrics],
  );
  const summary = useMemo(() => {
    const weeks = new Set(metrics.map((metric) => metric.weekStart));
    const cohorts = new Set(
      metrics.map(
        (metric) =>
          `${metric.weekStart}|${metric.structuralArchetypeGroup}`,
      ),
    );
    const latestWeek = [...weeks].sort().at(-1) ?? null;
    return { weeks: weeks.size, cohorts: cohorts.size, latestWeek };
  }, [metrics]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Aprendizaje agregado de gastos"
        subtitle="Revisión humana semanal promovida. Sin documentos, proveedores, usuarios ni recuentos exactos."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin" variant="secondary">
              <ArrowLeft size={18} /> Admin
            </ButtonLink>
            <Button
              variant="secondary"
              onClick={() => void load()}
              disabled={state.loading}
            >
              <RefreshCw size={18} /> Actualizar
            </Button>
          </div>
        }
      />

      {state.response.error && (
        <Card className="mb-5 border-amber-200 bg-amber-50 text-amber-950">
          <AlertTriangle className="mr-2 inline" size={20} />
          {state.response.error}
        </Card>
      )}

      {state.loading && (
        <Card className="mb-5 text-slate-600" aria-busy="true">
          Preparando métricas promovidas…
        </Card>
      )}

      {!state.loading && !state.response.error && (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumen">
            <Card>
              <div className="flex items-center gap-3">
                <CalendarDays className="text-blue-700" size={22} />
                <div>
                  <p className="text-sm text-slate-500">Semanas visibles</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary.weeks}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <Layers3 className="text-emerald-700" size={22} />
                <div>
                  <p className="text-sm text-slate-500">Cohortes promovidas</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {summary.cohorts}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <Brain className="text-violet-700" size={22} />
                <div>
                  <p className="text-sm text-slate-500">Última semana</p>
                  <p className="text-lg font-bold text-slate-900">
                    {summary.latestWeek ? dateLabel(summary.latestWeek) : "Sin datos"}
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section className="border-y border-slate-200 py-4" aria-label="Límites">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 text-emerald-700" size={22} />
              <div>
                <p className="font-semibold text-slate-900">
                  Lectura limitada a resultados promovidos
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  La banda expresa un intervalo de soporte, no un recuento exacto.
                  Estas señales no cambian extractores, reglas ni resultados visibles.
                </p>
              </div>
            </div>
          </section>

          {metrics.length === 0 ? (
            <div className="py-12 text-center">
              <Brain className="mx-auto text-slate-400" size={32} />
              <h2 className="mt-3 text-lg font-bold text-slate-900">
                Todavía no hay semanas promovidas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                El panel permanecerá vacío mientras la ingesta esté apagada o no
                exista soporte suficiente.
              </p>
            </div>
          ) : (
            <section aria-labelledby="learning-table-title">
              <div className="mb-3">
                <h2
                  id="learning-table-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Revisión humana por semana
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Una distribución agrupada sustituye por completo cualquier
                  partición con celdas poco frecuentes.
                </p>
              </div>
              <div className="overflow-x-auto border-y border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Semana</th>
                      <th className="px-4 py-3 font-semibold">Estructura</th>
                      <th className="px-4 py-3 font-semibold">Revisión</th>
                      <th className="px-4 py-3 font-semibold">Soporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr
                        key={`${metric.weekStart}-${metric.structuralArchetypeGroup}-${metric.bucketValue}`}
                        className="border-t border-slate-100"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                          {dateLabel(metric.weekStart)}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {GROUP_LABELS[metric.structuralArchetypeGroup]}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {REVIEW_LABELS[metric.bucketValue]}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {SUPPORT_LABELS[metric.supportBand]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
