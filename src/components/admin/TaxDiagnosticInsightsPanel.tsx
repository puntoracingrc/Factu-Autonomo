"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { TaxDiagnosticInsightsReport, TaxInsightsRatio } from "@/lib/tax-diagnostic-insights/aggregate.mjs";

interface InsightsResponse {
  available?: boolean;
  report?: TaxDiagnosticInsightsReport;
  previousSummary?: {
    eventVolume: number;
    funnel: Record<string, number | TaxInsightsRatio>;
  };
  error?: string;
}

function ratioLabel(value: unknown) {
  const ratio = value as TaxInsightsRatio | undefined;
  if (!ratio || typeof ratio.denominator !== "number") return "—";
  const percent = ratio.rate === null ? "—" : `${(ratio.rate * 100).toFixed(1)} %`;
  return `${percent} (${ratio.numerator}/${ratio.denominator})`;
}

function text(row: Record<string, unknown>, field: string) {
  return typeof row[field] === "string" ? String(row[field]) : "—";
}

export function TaxDiagnosticInsightsPanel() {
  const [state, setState] = useState<{ loading: boolean; response: InsightsResponse }>({ loading: true, response: {} });
  const load = async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      const supabase = await getSupabaseClientAsync();
      const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("Inicia sesión con una cuenta administradora.");
      const response = await fetch("/api/admin/tax-diagnostic-insights", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json() as InsightsResponse;
      if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el informe.");
      setState({ loading: false, response: payload });
    } catch (error) {
      setState({ loading: false, response: { error: error instanceof Error ? error.message : "No se pudo cargar el informe." } });
    }
  };
  useEffect(() => { void load(); }, []);

  const report = state.response.report;
  const funnel = report?.funnel;
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Uso del diagnóstico fiscal"
        subtitle="Fricción e incertidumbre agregadas. No mide verdad fiscal ni modifica reglas."
        action={<div className="flex gap-2"><ButtonLink href="/admin" variant="secondary"><ArrowLeft size={18} /> Admin</ButtonLink><Button variant="secondary" onClick={() => void load()} disabled={state.loading}><RefreshCw size={18} /> Actualizar</Button></div>}
      />
      {state.response.error && <Card className="border-amber-200 bg-amber-50 text-amber-900"><AlertTriangle className="mr-2 inline" size={20} />{state.response.error}</Card>}
      {state.response.available === false && !state.response.error && <Card>La tabla de eventos aún no está disponible.</Card>}
      {state.loading && <Card aria-busy="true">Preparando métricas agregadas…</Card>}
      {report && funnel && (
        <div className="space-y-6">
          <Card className="border-emerald-200 bg-emerald-50">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-emerald-700" /><div><p className="font-semibold text-emerald-950">Salvaguardas activas</p><p className="text-sm text-emerald-900">Sin aprobación fiscal, sin cambios automáticos, sin exclusiones y con «Todos» obligatorio.</p></div></div>
          </Card>
          <section aria-labelledby="funnel-title">
            <h2 id="funnel-title" className="mb-3 text-xl font-bold text-slate-900">Embudo semanal</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[["Iniciados", funnel.started], ["Completados", funnel.completed], ["Evaluaciones guardadas", funnel.evaluationsSaved], ["Modelos", funnel.modelsOpened], ["Calendario", funnel.calendarOpened], ["Finalización", ratioLabel(funnel.completionRate)]].map(([label, value]) => <Card key={String(label)}><p className="text-sm text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-bold text-slate-900">{String(value)}</p></Card>)}
            </div>
          </section>
          <InsightTable title="Preguntas" rows={report.questions.slice(0, 10)} columns={["questionId", "unknownRate", "changeRate"]} />
          <InsightTable title="Modelos" rows={report.models.slice(0, 10)} columns={["modelNumber", "manualAddRate", "manualRemoveRate"]} />
          <InsightTable title="Documentos" rows={report.documents.slice(0, 10)} columns={["family", "fieldCorrectionRate", "unrecognizedRate"]} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><h2 className="text-xl font-bold text-slate-900">Comparación anterior</h2><p className="mt-2 text-sm text-slate-600">Eventos agregados: {report.eventVolume} ahora; {state.response.previousSummary?.eventVolume ?? 0} en el periodo anterior.</p><p className="mt-2 text-sm font-semibold text-slate-700">Regresiones de 10 puntos o más: {report.regressions.length}</p></Card>
            <Card><h2 className="text-xl font-bold text-slate-900">Versiones observadas</h2><ul className="mt-2 space-y-1 text-sm text-slate-600">{Object.entries(report.versions).length ? Object.entries(report.versions).map(([version, count]) => <li key={version}><span className="font-semibold text-slate-800">{version}</span>: {count}</li>) : <li>Sin volumen en este periodo.</li>}</ul></Card>
          </div>
          <Card><h2 className="text-xl font-bold text-slate-900">Señales</h2><p className="mt-2 text-sm text-slate-600">{report.signals.length ? `${report.signals.length} señales de investigación con volumen suficiente.` : "Sin señales con volumen suficiente."}</p><div className="mt-3 flex flex-wrap gap-2">{report.recommendations.map((code: string) => <span key={code} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{code}</span>)}</div></Card>
        </div>
      )}
    </main>
  );
}

function InsightTable({ title, rows, columns }: { title: string; rows: Array<Record<string, unknown>>; columns: string[] }) {
  return <Card className="overflow-hidden p-0"><div className="border-b border-slate-200 p-5"><h2 className="text-xl font-bold text-slate-900">{title}</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{columns.map((column) => <th key={column} className="px-5 py-3 font-semibold">{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={`${text(row, columns[0]!)}-${index}`} className="border-t border-slate-100">{columns.map((column, columnIndex) => <td key={column} className="px-5 py-3 text-slate-800">{columnIndex === 0 ? text(row, column) : ratioLabel(row[column])}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-5 py-6 text-slate-500">Sin volumen en este periodo.</td></tr>}</tbody></table></div></Card>;
}
