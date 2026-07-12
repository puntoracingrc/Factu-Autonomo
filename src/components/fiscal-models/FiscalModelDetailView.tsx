import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileClock,
  History,
  Info,
  LibraryBig,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  FiscalModelPageManualReviewReasonV1,
  FiscalModelPageProvenanceFieldV1,
} from "@/lib/fiscal-models/model-pages/contracts.v1";
import type { FiscalModelReviewPageViewV1 } from "@/lib/fiscal-models/model-pages/review-view-model.v1";

const reasonLabels: Readonly<
  Record<FiscalModelPageManualReviewReasonV1, string>
> = {
  DRAFT_RELEASE: "La versión del catálogo continúa en borrador controlado.",
  PAGE_UNPUBLISHED: "El descriptor de enlace aún no está publicado.",
  PAGE_REVIEW_REQUIRED: "El contenido de la ficha necesita revisión fiscal.",
  MODEL_REVIEW_REQUIRED: "La identidad del modelo necesita revisión fiscal.",
  SOURCE_HASH_PENDING:
    "Las huellas de contenido de las fuentes están pendientes.",
  SOURCE_REVIEW_REQUIRED: "Las fuentes oficiales necesitan revisión fiscal.",
  SOURCE_CHANGED: "Una fuente oficial ha cambiado y necesita revisión.",
  SOURCE_UNAVAILABLE: "Una fuente oficial no está disponible.",
};

const provenanceLabels: Readonly<
  Record<FiscalModelPageProvenanceFieldV1, string>
> = {
  canonicalName: "Nombre oficial",
  summary: "Resumen informativo",
  contentLevel: "Nivel de contenido",
  lifecycleStatus: "Estado de vigencia",
  effectiveTo: "Fecha final registrada",
  modelAvailability: "Cobertura del modelo",
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

export function FiscalModelDetailView({
  page,
}: {
  page: FiscalModelReviewPageViewV1;
}) {
  const historical = page.lifecycleStatus === "HISTORICAL";
  const historicalDate = page.effectiveTo
    ? page.effectiveTo.split("-").reverse().join("/")
    : null;

  return (
    <article className="mx-auto w-full max-w-5xl space-y-6 text-slate-900 dark:text-slate-100">
      <Link
        href="/consultor-fiscal/modelos"
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a Modelos AEAT
      </Link>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl dark:text-slate-100">
            Modelo {page.code}
          </h1>
          <p className="mt-1 break-words text-base text-slate-600 dark:text-slate-300">
            {page.canonicalName}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          {page.reviewBadge}
        </span>
      </header>

      <Card
        className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
        role="note"
        aria-labelledby="ficha-revision-title"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2
              id="ficha-revision-title"
              className="font-bold text-amber-950 dark:text-amber-100"
            >
              {page.reviewTitle}
            </h2>
            <p className="mt-1 break-words text-sm leading-6 text-amber-900 dark:text-amber-200">
              {page.reviewMessage}
            </p>
          </div>
        </div>
      </Card>

      {historical && page.historicalNotice && historicalDate && (
        <Card
          className="border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
          role="alert"
          aria-labelledby="modelo-historico-title"
        >
          <div className="flex items-start gap-3">
            <History
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="modelo-historico-title"
                className="font-bold text-rose-950 dark:text-rose-100"
              >
                Histórico · no vigente
              </h2>
              <p className="mt-1 break-words text-sm leading-6 text-rose-900 dark:text-rose-200">
                {page.historicalNotice}
              </p>
              <p className="mt-1 text-sm font-semibold text-rose-950 dark:text-rose-100">
                Fecha final registrada:{" "}
                <time dateTime={page.effectiveTo ?? undefined}>
                  {historicalDate}
                </time>
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Info
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Qué describe esta ficha
            </h2>
          </div>
          <p className="mt-3 break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
            {page.summary}
          </p>
        </Card>

        <Card className="min-w-0 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <FileClock
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
              Estado registrado
            </h2>
          </div>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Estado declarado en el catálogo
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {historical
                  ? "Histórico · no vigente"
                  : "Activo según el catálogo · pendiente de revisión"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Cobertura
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {page.contentLevel === "METADATA_ONLY"
                  ? "Solo metadatos informativos"
                  : "Solo información histórica"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Enlace para integraciones
              </dt>
              <dd className="mt-0.5 font-semibold text-amber-800 dark:text-amber-200">
                Bloqueado durante la revisión
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
          Por qué sigue en revisión
        </h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {page.reasons.map((reason) => (
            <li
              key={reason}
              className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {reasonLabels[reason]}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <LibraryBig
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Fuentes oficiales registradas
          </h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Son referencias externas de AEAT o BOE. Abrirlas no inicia ningún
          trámite ni envía información desde esta aplicación.
        </p>
        <ul className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
          {page.sources.map((source) => (
            <li
              key={source.sourceId}
              className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                  {source.authority}
                </span>
                <span className="text-amber-800 dark:text-amber-200">
                  {source.verificationLabel}
                </span>
              </div>
              <p className="mt-3 break-words font-semibold text-slate-900 dark:text-slate-100">
                {source.title}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Fecha indicada por la fuente · pendiente de verificación:{" "}
                <time dateTime={source.officialUpdatedAt}>
                  {source.officialUpdatedAt}
                </time>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {source.reviewLabel}
              </p>
              <a
                href={source.externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
              >
                Abrir referencia oficial
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
          Procedencia por campo
        </h2>
        <ul className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
          {page.provenance.map((entry) => (
            <li
              key={entry.field}
              className="min-w-0 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {provenanceLabels[entry.field]}
              </p>
              <p className="mt-1 break-words leading-6 text-slate-600 dark:text-slate-300">
                {entry.origin === "OFFICIAL_SOURCE"
                  ? `Fuentes oficiales registradas: ${entry.sourceIds.join(", ")}`
                  : `Catálogo base: ${entry.modelReleaseId} · ${entry.modelContentVersion}`}
              </p>
              <p className="mt-1 font-semibold text-amber-800 dark:text-amber-200">
                Revisión fiscal pendiente
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
          Límites de esta versión
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {page.limitations}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {page.linkNotice}
        </p>
        <dl className="mt-4 grid min-w-0 gap-3 text-xs text-slate-500 sm:grid-cols-2 dark:text-slate-400">
          <div className="min-w-0">
            <dt className="font-semibold">Versión de ficha</dt>
            <dd className="mt-1 break-all">{page.descriptorContentVersion}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold">Versión de catálogo</dt>
            <dd className="mt-1 break-all">{page.modelContentVersion}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold">Release del modelo</dt>
            <dd className="mt-1 break-all">{page.modelReleaseId}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold">Registro de fuentes</dt>
            <dd className="mt-1 break-all">{page.sourceRegistryVersion}</dd>
          </div>
        </dl>
      </Card>
    </article>
  );
}
