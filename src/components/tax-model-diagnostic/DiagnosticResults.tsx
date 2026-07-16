"use client";

import { useEffect } from "react";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Printer,
  SearchCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/context/AppStore";
import {
  normalizeFiscalAdvisoryModelPreferencesV1,
  setManualFiscalAdvisoryModelSelectionV1,
} from "@/lib/fiscal-advisory-models";
import type {
  DiagnosticResult,
  ModelResult,
} from "@/lib/tax-model-diagnostic/contracts";
import { getTaxModelCatalogEntry } from "@/lib/tax-model-diagnostic/model-catalog";
import {
  buildTaxObligationsAssessment,
  buildTaxModelRecommendationsV1,
  TAX_MODEL_RECOMMENDATION_DISCLAIMER,
  TAX_MODEL_RECOMMENDATION_LABELS,
  TAX_OBLIGATION_MODEL_CODES,
  type TaxModelRecommendationItemV1,
  type TaxModelRecommendationStatus,
} from "@/lib/tax-obligations";
import { recordTaxProductEvent } from "@/lib/tax-diagnostic-insights/client";

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

function ResultCard({
  result,
  recommendation,
  onToggleManual,
}: {
  result: ModelResult;
  recommendation: TaxModelRecommendationItemV1;
  onToggleManual: (modelCode: string, selected: boolean) => void;
}) {
  const catalog = getTaxModelCatalogEntry(result.modelNumber);
  const status = recommendation.recommendationStatus;
  const statusClasses: Record<TaxModelRecommendationStatus, string> = {
    LIKELY_REQUIRED:
      "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    POSSIBLY_REQUIRED:
      "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    UNLIKELY_REQUIRED:
      "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900",
    NEEDS_INFORMATION:
      "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20",
    MANUALLY_SELECTED:
      "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
  };
  const statusTextClasses: Record<TaxModelRecommendationStatus, string> = {
    LIKELY_REQUIRED: "text-emerald-700 dark:text-emerald-300",
    POSSIBLY_REQUIRED: "text-amber-800 dark:text-amber-300",
    UNLIKELY_REQUIRED: "text-slate-600 dark:text-slate-300",
    NEEDS_INFORMATION: "text-orange-800 dark:text-orange-300",
    MANUALLY_SELECTED: "text-blue-700 dark:text-blue-300",
  };
  return (
    <article className={`rounded-2xl border p-5 ${statusClasses[status]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-extrabold uppercase tracking-wide ${statusTextClasses[status]}`}>
            {TAX_MODEL_RECOMMENDATION_LABELS[status]}
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

      {recommendation.possibleExceptions.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="font-bold text-slate-950 dark:text-white">
            Comprueba estas posibles excepciones
          </h4>
          <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {recommendation.possibleExceptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        aria-pressed={recommendation.manuallySelected}
        onClick={() =>
          onToggleManual(
            result.modelNumber,
            !recommendation.manuallySelected,
          )
        }
      >
        <Star
          className={`h-4 w-4 ${recommendation.manuallySelected ? "fill-current" : ""}`}
          aria-hidden="true"
        />
        {recommendation.manuallySelected
          ? "Quitar selección manual"
          : "Añadir manualmente"}
      </Button>

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
  const { data, ready, updateProfile } = useAppStore();
  const assessment = buildTaxObligationsAssessment(result);
  const preferences = normalizeFiscalAdvisoryModelPreferencesV1(
    data.profile.fiscalAdvisoryModelPreferences,
  );
  const recommendationSnapshot = buildTaxModelRecommendationsV1({
    assessment,
    manualModelCodes: preferences?.manualModelCodes ?? [],
  });
  const recommendationsByCode = new Map<string, TaxModelRecommendationItemV1>(
    recommendationSnapshot.recommendations.map((recommendation) => [
      recommendation.modelCode,
      recommendation,
    ]),
  );
  const groups: readonly {
    status: TaxModelRecommendationStatus;
    title: string;
  }[] = [
    { status: "LIKELY_REQUIRED", title: "Probablemente necesarios" },
    { status: "POSSIBLY_REQUIRED", title: "Podrían ser necesarios" },
    { status: "NEEDS_INFORMATION", title: "Falta información" },
    { status: "MANUALLY_SELECTED", title: "Añadidos por ti" },
    { status: "UNLIKELY_REQUIRED", title: "Probablemente no necesarios" },
  ];
  const counts = new Map<TaxModelRecommendationStatus, number>();
  for (const recommendation of recommendationSnapshot.recommendations) {
    counts.set(
      recommendation.recommendationStatus,
      (counts.get(recommendation.recommendationStatus) ?? 0) + 1,
    );
  }

  useEffect(() => {
    for (const recommendation of recommendationSnapshot.recommendations) {
      void recordTaxProductEvent({
        eventType: "tax_model_recommendation_viewed",
        page: "DIAGNOSTIC",
        modelNumber: recommendation.modelCode,
        recommendationStatus: recommendation.recommendationStatus,
        engineVersion: result.engineVersion,
        rulesetVersion: result.ruleSetVersion,
        fiscalYear: result.fiscalYear,
        properties: { reasonExpanded: false, sourcePage: "DIAGNOSTIC" },
      }, { dedupeKey: `recommendation:${result.generatedAt}:${recommendation.modelCode}` });
    }
  }, [recommendationSnapshot.recommendations, result.engineVersion, result.fiscalYear, result.generatedAt, result.ruleSetVersion]);

  function toggleManualModel(modelCode: string, selected: boolean) {
    if (!ready) return;
    const next = setManualFiscalAdvisoryModelSelectionV1({
      current: data.profile.fiscalAdvisoryModelPreferences,
      modelCode,
      selected,
      allowedModelCodes: TAX_OBLIGATION_MODEL_CODES,
    });
    if (!next) return;
    const previous = recommendationsByCode.get(modelCode);
    if (previous) {
      void recordTaxProductEvent({
        eventType: selected ? "tax_model_manual_added" : "tax_model_manual_removed",
        page: "DIAGNOSTIC",
        modelNumber: modelCode,
        engineVersion: result.engineVersion,
        rulesetVersion: result.ruleSetVersion,
        fiscalYear: result.fiscalYear,
        properties: {
          previousRecommendationStatus: selected
            ? previous.engineRecommendationStatus
            : previous.recommendationStatus,
          sourcePage: "DIAGNOSTIC",
        },
      });
      void recordTaxProductEvent({
        eventType: "tax_models_saved",
        page: "DIAGNOSTIC",
        engineVersion: result.engineVersion,
        rulesetVersion: result.ruleSetVersion,
        fiscalYear: result.fiscalYear,
        properties: {
          recommendedCount: (counts.get("LIKELY_REQUIRED") ?? 0) + (counts.get("POSSIBLY_REQUIRED") ?? 0),
          manuallyAddedCount: next.manualModelCodes.length,
          manuallyRemovedCount: selected ? 0 : 1,
        },
      });
    }
    updateProfile({
      ...data.profile,
      fiscalAdvisoryModelPreferences: next,
    });
  }

  return (
    <section aria-labelledby="resultado-modelos" aria-live="polite" className="space-y-6 print:text-black">
      <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-300">
              Resultado orientativo · ejercicio {result.fiscalYear}
            </p>
            <h2 id="resultado-modelos" className="mt-2 text-2xl font-extrabold sm:text-3xl">Tus modelos orientativos</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              {counts.get("LIKELY_REQUIRED") ?? 0} probablemente necesarios, {" "}
              {counts.get("POSSIBLY_REQUIRED") ?? 0} posibles y {" "}
              {counts.get("NEEDS_INFORMATION") ?? 0} pendientes de información.
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

      <div role="note" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p>{TAX_MODEL_RECOMMENDATION_DISCLAIMER}</p>
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

      {groups.map((group) => {
        const models = result.models.filter(
          (model) =>
            recommendationsByCode.get(model.modelNumber)
              ?.recommendationStatus === group.status,
        );
        if (models.length === 0) return null;
        return (
          <div key={group.status} className="space-y-4">
            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
              {group.status === "LIKELY_REQUIRED" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
              )}
              {group.title}
            </h3>
            {models.map((model) => {
              const recommendation = recommendationsByCode.get(
                model.modelNumber,
              );
              return recommendation ? (
                <ResultCard
                  key={model.modelNumber}
                  result={model}
                  recommendation={recommendation}
                  onToggleManual={toggleManualModel}
                />
              ) : null;
            })}
          </div>
        );
      })}
    </section>
  );
}
