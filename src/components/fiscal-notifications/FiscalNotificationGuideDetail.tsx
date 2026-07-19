import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeInfo,
  Clock3,
  ExternalLink,
  FileCheck2,
  LibraryBig,
  ListChecks,
  MessageCircleQuestion,
  Network,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { FiscalNotificationGuideEntryV1 } from "@/lib/fiscal-notifications/guide/catalog.v1";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function coverageLabel(entry: FiscalNotificationGuideEntryV1): string {
  return entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY"
    ? "Lectura automática · revisión obligatoria"
    : "Guía disponible · revisión manual";
}

function maturityLabel(entry: FiscalNotificationGuideEntryV1): string {
  if (entry.recognitionMaturity === "OFFICIAL_ONLY") {
    return "Significado oficial conocido · formato pendiente de validar";
  }
  if (entry.recognitionMaturity === "SYNTHETIC_VALIDATED") {
    return "Contrato validado con casos sintéticos";
  }
  if (entry.recognitionMaturity === "REAL_VARIANT_OBSERVED") {
    return "Una variante documental observada";
  }
  if (entry.recognitionMaturity === "MULTI_VARIANT_HARDENED") {
    return "Varias estructuras documentales verificadas";
  }
  if (entry.recognitionMaturity === "PRODUCTION_STRONG_SIGNATURE") {
    return "Firma estructural fuerte en producción";
  }
  return "Catálogo anterior compatible";
}

function PlainLanguageExplanation({
  guidance,
}: {
  guidance: NonNullable<FiscalNotificationGuideEntryV1["plainLanguage"]>;
}) {
  return (
    <section aria-labelledby="plain-language-explanation-title" className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Explicación sencilla
        </p>
        <h4
          id="plain-language-explanation-title"
          className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100"
        >
          Lo importante en 30 segundos
        </h4>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Card className="min-w-0 border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2">
            <BadgeInfo className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            <h5 className="font-bold text-emerald-950 dark:text-emerald-100">
              Qué significa
            </h5>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-950 dark:text-emerald-100">
            {guidance.inShort}
          </p>
        </Card>

        <Card className="min-w-0 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-blue-700 dark:text-blue-300" aria-hidden="true" />
            <h5 className="font-bold text-slate-950 dark:text-slate-100">
              Por qué suele llegar
            </h5>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {guidance.whyItUsuallyArrives}
          </p>
        </Card>

        <Card className="min-w-0 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-blue-700 dark:text-blue-300" aria-hidden="true" />
            <h5 className="font-bold text-slate-950 dark:text-slate-100">
              Qué conviene hacer
            </h5>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {guidance.usualNextStep}
          </p>
        </Card>

        <Card className="min-w-0 border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <h5 className="font-bold text-amber-950 dark:text-amber-100">
              {guidance.deadline.title}
            </h5>
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-950 dark:text-amber-100">
            {guidance.deadline.detail}
          </p>
        </Card>
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="min-h-11 cursor-pointer font-bold text-slate-950 dark:text-slate-100">
          Entenderlo un poco mejor
        </summary>
        <ul className="mt-3 space-y-2">
          {guidance.keyPoints.map((point) => (
            <li
              key={point}
              className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {point}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function RelatedFamilies({
  title,
  emptyLabel,
  entries,
}: {
  title: string;
  emptyLabel: string;
  entries: FiscalNotificationGuideEntryV1["possiblePrevious"];
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="font-bold text-slate-950 dark:text-slate-100">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map((related) => (
            <li
              key={`${related.relationId}:${related.familyId}:${related.direction}`}
              className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
            >
              <Link
                href={`/consultor-fiscal/notificaciones/guia?guia=${encodeURIComponent(related.familyId)}#guia-notificaciones`}
                className={`inline-flex min-h-11 items-center gap-2 break-words font-semibold text-blue-800 hover:text-blue-950 dark:text-blue-200 dark:hover:text-blue-100 ${focusRing}`}
              >
                {related.nameEs}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Relación solo sugerida. Exige una referencia explícita o
                confirmación humana; nunca se confirma automáticamente.
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function FiscalNotificationGuideDetail({
  entry,
}: {
  entry: FiscalNotificationGuideEntryV1;
}) {
  return (
    <article
      aria-labelledby="fiscal-notification-guide-detail-title"
      className="space-y-5"
    >
      <Link
        href="/consultor-fiscal/notificaciones/guia#guia-notificaciones"
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al índice de la guía
      </Link>

      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            {entry.categoryLabel}
          </p>
          <h3
            id="fiscal-notification-guide-detail-title"
            className="mt-1 break-words text-2xl font-bold text-slate-950 dark:text-slate-100"
          >
            {entry.nameEs}
          </h3>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
            entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-100"
          }`}
        >
          {entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY" ? (
            <BadgeInfo className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          )}
          {coverageLabel(entry)}
        </span>
      </header>

      <PlainLanguageExplanation guidance={entry.plainLanguage} />

      <Card
        className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
        role="note"
      >
        <h4 className="font-bold text-amber-950 dark:text-amber-100">
          El documento concreto manda
        </h4>
        <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">
          La ficha solo aporta contexto oficial. Los datos, fechas, importes,
          referencias y plazos aplicables son los que figuren en el documento
          revisado. Una fuente general no completa información ausente ni
          sustituye su contenido.
        </p>
      </Card>

      <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <summary className="min-h-11 cursor-pointer font-bold text-slate-950 dark:text-slate-100">
          Estado técnico de esta ficha
        </summary>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="font-semibold text-slate-500 dark:text-slate-400">Disponibilidad</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{coverageLabel(entry)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500 dark:text-slate-400">Madurez del reconocimiento</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{maturityLabel(entry)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500 dark:text-slate-400">Revisión jurídica</dt>
            <dd className="mt-0.5 font-semibold text-amber-800 dark:text-amber-200">
              Revisión jurídica pendiente
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500 dark:text-slate-400">Acciones operativas</dt>
            <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
              Desactivadas hasta revisión humana
            </dd>
          </div>
        </dl>
      </details>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <FileCheck2
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h4 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Qué mirar en el documento
          </h4>
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {entry.documentChecks.map((check) => (
            <li
              key={check}
              className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              {check}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Network
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h4 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Posibles pasos relacionados
          </h4>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Son relaciones contextuales registradas, no conclusiones sobre tu
          expediente. Una coincidencia de persona, importe o fecha no basta.
        </p>
        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
          <RelatedFamilies
            title="Podrían aparecer antes"
            emptyLabel="No hay un paso previo registrado para esta familia. Su ausencia no permite concluir que no exista."
            entries={entry.possiblePrevious}
          />
          <RelatedFamilies
            title="Podrían aparecer después"
            emptyLabel="No hay un paso posterior registrado para esta familia. Su ausencia no permite concluir que el procedimiento haya terminado."
            entries={entry.possibleNext}
          />
        </div>
        {entry.relationHints.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <h5 className="font-bold text-blue-950 dark:text-blue-100">
              Cómo puede encajar en un expediente
            </h5>
            <ul className="mt-2 space-y-2">
              {entry.relationHints.map((hint) => (
                <li key={hint} className="text-sm leading-6 text-blue-950 dark:text-blue-100">
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <LibraryBig
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h4 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Fuentes oficiales en las que se basa el analizador
          </h4>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Estas fuentes forman parte del conocimiento local del analizador: no
          se consulta internet durante el escaneo. Los enlaces se verificaron
          como oficiales, pero su aplicación al documento concreto exige
          revisión. Abrirlos no inicia ningún trámite desde la aplicación.
        </p>
        {entry.sources.length === 0 ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Todavía no hay una fuente oficial de contexto registrada para esta
            familia.
          </p>
        ) : (
          <ul className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
            {entry.sources.map((source) => (
              <li
                key={source.sourceId}
                className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                    {source.authority}
                  </span>
                  <span className="text-amber-800 dark:text-amber-200">
                    Revisión jurídica pendiente
                  </span>
                </div>
                <p className="mt-3 break-words font-semibold text-slate-900 dark:text-slate-100">
                  {source.title}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  URL oficial comprobada el {source.urlCheckedOn}
                </p>
                <a
                  href={source.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                >
                  Abrir fuente oficial
                  <span className="sr-only">
                    {` sobre ${entry.nameEs} (se abre en una pestaña nueva)`}
                  </span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/30">
        <h4 className="text-lg font-bold text-rose-950 dark:text-rose-100">
          Límites y conclusiones prohibidas
        </h4>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {entry.prohibitions.map((prohibition) => (
            <li
              key={prohibition.id}
              className="rounded-xl bg-white/80 p-3 text-sm leading-6 text-rose-900 dark:bg-slate-950/60 dark:text-rose-100"
            >
              {prohibition.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-bold text-rose-950 dark:text-rose-100">
          Esta ficha no crea, paga, compensa, aplaza, recurre, desembarga ni
          registra contablemente nada.
        </p>
      </Card>
    </article>
  );
}
