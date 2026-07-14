"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Printer,
  SearchCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
  DiagnosticResult,
  ModelResult,
} from "@/lib/tax-model-diagnostic/contracts";
import { getTaxModelCatalogEntry } from "@/lib/tax-model-diagnostic/model-catalog";

function statusLabel(status: ModelResult["status"]): string {
  const labels: Record<ModelResult["status"], string> = {
    CONFIRMED_BY_CENSUS: "Confirmado también por el censo",
    DERIVED: "Obligación derivada",
    CONDITIONAL: "Condicional",
    NOT_APPLICABLE: "No aplicable con los datos confirmados",
    NEEDS_INFORMATION: "Faltan datos",
    NEEDS_PROFESSIONAL_REVIEW: "Revisión profesional",
    CENSUS_MISMATCH: "Discrepancia con el censo",
    TERRITORY_NOT_SUPPORTED: "Territorio no soportado",
  };
  return labels[status];
}

function isRequired(result: ModelResult): boolean {
  return result.status === "CONFIRMED_BY_CENSUS" || result.status === "DERIVED";
}

function filingSubjectLabel(subject: ModelResult["filingSubject"]): string {
  const labels: Record<ModelResult["filingSubject"], string> = {
    PERSONA_FISICA: "Persona física",
    SOCIEDAD: "Sociedad",
    ENTIDAD: "Entidad",
    SOCIOS_O_COMUNEROS: "Socios o comuneros",
    POR_DETERMINAR: "Por determinar",
  };
  return labels[subject];
}

function periodicityLabel(periodicity: ModelResult["periodicity"]): string {
  const labels: Record<ModelResult["periodicity"], string> = {
    EVENT_DRIVEN: "Cuando se produce el hecho o cambio",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    ANNUAL: "Anual",
    PER_OPERATION: "Por operación o supuesto",
    TO_BE_CONFIRMED: "Periodicidad por confirmar",
  };
  return labels[periodicity];
}

function ResultCard({ result }: { result: ModelResult }) {
  const catalog = getTaxModelCatalogEntry(result.modelNumber);
  const required = isRequired(result);
  return (
    <article className={`rounded-2xl border p-5 ${required ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-extrabold uppercase tracking-wide ${required ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
            {statusLabel(result.status)}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
            Modelo {result.modelNumber} · {catalog.name}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Sujeto: {filingSubjectLabel(result.filingSubject)}
          </p>
        </div>
        {catalog.canonicalPath && (
          <Link href={catalog.canonicalPath} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
            Ver ficha
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-700 dark:text-slate-200 lg:grid-cols-2">
        <div>
          <h4 className="font-bold text-slate-950 dark:text-white">Por qué aparece</h4>
          <p>{result.reason}</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-950 dark:text-white">Periodicidad y períodos</h4>
          <p>{periodicityLabel(result.periodicity)}</p>
          <p>{result.periods.length > 0 ? result.periods.join(" · ") : "Sin período confirmado"}</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-950 dark:text-white">Evidencia usada</h4>
          {result.evidence.length > 0 ? (
            <ul className="list-disc pl-5">
              {result.evidence.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : <p>No hay evidencia suficiente confirmada.</p>}
        </div>
        <div>
          <h4 className="font-bold text-slate-950 dark:text-white">Siguiente paso</h4>
          <p>{result.nextAction}</p>
        </div>
      </div>

      {result.missingInformation.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900 dark:bg-slate-900">
          <h4 className="font-bold text-amber-900 dark:text-amber-200">Información pendiente</h4>
          <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {result.missingInformation.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {result.censusMismatch && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800 dark:bg-red-950/30 dark:text-red-200">
          {result.censusMismatch}
        </p>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-bold text-blue-700 dark:text-blue-300">Fuentes oficiales y trazabilidad</summary>
        <div className="mt-2 space-y-2">
          {result.officialSources.map((source) => (
            <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-white p-3 text-blue-700 underline decoration-blue-300 underline-offset-2 dark:bg-slate-900 dark:text-blue-300">
              {source.authority} · {source.title} · {source.location}
            </a>
          ))}
          <p className="text-xs text-slate-500">Reglas: {result.ruleIds.join(", ")} · Confianza orientativa: {Math.round(result.confidence * 100)}%</p>
        </div>
      </details>
    </article>
  );
}

export function DiagnosticResults({
  result,
  onEdit,
}: {
  result: DiagnosticResult;
  onEdit: () => void;
}) {
  const [showExcluded, setShowExcluded] = useState(false);
  const required = result.models.filter(isRequired);
  const review = result.models.filter(
    (model) => !isRequired(model) && model.status !== "NOT_APPLICABLE",
  );
  const excluded = result.models.filter((model) => model.status === "NOT_APPLICABLE");

  return (
    <section aria-labelledby="resultado-modelos" aria-live="polite" className="space-y-6 print:text-black">
      <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-300">Resultado orientativo · ejercicio {result.fiscalYear}</p>
            <h2 id="resultado-modelos" className="mt-2 text-2xl font-extrabold sm:text-3xl">Tus posibles obligaciones tributarias</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              {required.length} modelos derivados, {review.length} pendientes de completar o revisar y {excluded.length} exclusiones explícitas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="secondary" onClick={onEdit}>Editar respuestas</Button>
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              <Printer className="h-5 w-5" aria-hidden="true" /> Imprimir
            </Button>
          </div>
        </div>
      </div>

      <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">No sustituye la revisión de un profesional ni una comunicación de la AEAT.</p>
            <p>Las reglas están pendientes de aprobación fiscal formal y la activación de producción permanece cerrada.</p>
          </div>
        </div>
      </div>

      {result.warnings.map((warning) => (
        <p key={warning} className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{warning}</p>
      ))}

      {result.models.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/20">
          <h3 className="flex items-center gap-2 text-lg font-bold text-amber-950 dark:text-amber-100">
            <SearchCheck className="h-5 w-5" aria-hidden="true" /> No se ha emitido una lista de modelos
          </h3>
          <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-200">Confirma el territorio fiscal o solicita una revisión específica. El motor falla cerrado para evitar mostrar modelos estatales donde no corresponden.</p>
        </div>
      )}

      {required.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white"><CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" /> Modelos derivados</h3>
          {required.map((model) => <ResultCard key={model.modelNumber} result={model} />)}
        </div>
      )}

      {review.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white"><AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" /> Completar o revisar</h3>
          {review.map((model) => <ResultCard key={model.modelNumber} result={model} />)}
        </div>
      )}

      {excluded.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <Button type="button" variant="ghost" onClick={() => setShowExcluded((current) => !current)} aria-expanded={showExcluded}>
            {showExcluded ? "Ocultar" : "Mostrar"} {excluded.length} modelos no aplicables
          </Button>
          {showExcluded && (
            <div className="mt-4 space-y-3">
              {excluded.map((model) => {
                const catalog = getTaxModelCatalogEntry(model.modelNumber);
                return (
                  <div key={model.modelNumber} className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                    <p className="font-bold text-slate-950 dark:text-white">Modelo {model.modelNumber} · {catalog.name}</p>
                    <p className="mt-1 leading-6 text-slate-600 dark:text-slate-300">{model.reason}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
