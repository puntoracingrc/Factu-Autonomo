import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  History,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FiscalModelCatalogBrowser } from "./FiscalModelCatalogBrowser";
import {
  createPublicAeatModelSearchEntryWithTermsV2,
  type PublicAeatModelReviewSearchResultV2,
} from "@/lib/fiscal-models/model-pages/public-review-search.v2";
import type {
  PublicAeatModelCalendarDetailContextResultV1,
  PublicAeatModelReviewPageV1,
} from "@/lib/fiscal-models/model-pages/public-review-catalog.v1";
import type { PublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages/official-content";
import { FiscalModelOfficialVisual } from "./FiscalModelOfficialVisual";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

const practicalCatalogLabels: Readonly<
  Partial<Record<string, readonly string[]>>
> = {
  "111": ["Frecuente si pagas retenciones", "Trimestral o mensual", "IRPF"],
  "115": ["Si alquilas un local", "Trimestral o mensual", "Retenciones"],
  "130": ["Frecuente para autónomos", "IRPF", "Trimestral", "Estimación directa"],
  "131": ["Solo módulos", "IRPF", "Trimestral", "Revisión anual"],
  "180": ["Anual", "Relacionado con 115", "Declaración informativa"],
  "190": ["Anual", "Relacionado con 111", "Declaración informativa"],
  "303": ["Frecuente para autónomos", "IVA", "Trimestral o mensual"],
  "390": ["Anual", "IVA", "Puede estar exonerado"],
};

export function FiscalModelCatalogView({
  result,
  pages,
  calendarContext,
  officialContents,
}: {
  result: Extract<PublicAeatModelReviewSearchResultV2, { status: "REVIEW_ONLY" }>;
  pages: readonly PublicAeatModelReviewPageV1[];
  calendarContext: PublicAeatModelCalendarDetailContextResultV1;
  officialContents: readonly PublicAeatOfficialModelContentV1[];
}) {
  const matchingIds = new Set(result.data.map((page) => page.catalogCardId));
  const calendarNavigation =
    calendarContext.status === "FROM_CALENDAR" ? calendarContext.data : null;
  const focusedCardId = calendarNavigation?.catalogCardId ?? null;
  const officialContentByCode = new Map(
    officialContents.map((content) => [content.code, content] as const),
  );
  const searchEntries = pages.map((page) =>
    (() => {
      const content = officialContentByCode.get(page.code);
      return createPublicAeatModelSearchEntryWithTermsV2(
        page,
        content
          ? [
              ...content.searchTerms,
              content.canonicalName,
              content.summary,
              ...content.sections.flatMap((section) => [
                section.title,
                ...section.items.flatMap((item) => [item.heading, item.text]),
              ]),
              ...content.faq.flatMap((item) => [item.question, item.answer]),
            ]
          : [],
      );
    })(),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-slate-900 dark:text-slate-100">
      <header className="mb-6 min-w-0">
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl dark:text-slate-100">
          Modelos AEAT
        </h1>
        <p className="mt-1 break-words text-base text-slate-600 dark:text-slate-300">
          Consulta fichas informativas basadas en fuentes oficiales de la AEAT
          y el BOE.
        </p>
      </header>

      <Card
        className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
        role="note"
        aria-labelledby="revision-modelos-title"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2
              id="revision-modelos-title"
              className="font-bold text-amber-950 dark:text-amber-100"
            >
              Algunas fichas siguen en preparación
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">
              Las tarjetas con la etiqueta «Revisión pendiente» conservan solo
              la estructura del índice oficial. Las fichas ya completadas
              muestran información contrastada con las fuentes enlazadas.
            </p>
          </div>
        </div>
      </Card>

      <FiscalModelCatalogBrowser
        entries={searchEntries}
        initialQuery={result.query ?? ""}
        focusedCardId={focusedCardId}
      />

      <section aria-labelledby="catalogo-modelos-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck
            className="h-5 w-5 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <h2
            id="catalogo-modelos-title"
            className="text-xl font-bold text-slate-950 dark:text-slate-100"
          >
            Fichas registradas
          </h2>
        </div>

        <Card
          id="modelos-aeat-sin-resultados"
          className="dark:border-slate-700 dark:bg-slate-900"
          hidden={result.total !== 0}
        >
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            No encontramos fichas que coincidan con la búsqueda.
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Prueba con un código, un impuesto o una palabra del nombre oficial.
          </p>
        </Card>

        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => {
            const fromCalendar = page.catalogCardId === focusedCardId;
            const detailHref = fromCalendar
              ? calendarNavigation!.detailHref
              : page.href;
            const officialContent = officialContentByCode.get(page.code) ?? null;
            const historical =
              page.lifecycleStatus === "HISTORICAL" ||
              officialContent?.lifecycleStatus === "HISTORICAL";
            const practicalLabels = practicalCatalogLabels[page.code] ?? [];
            return (
              <Card
                key={page.code}
                id={page.catalogCardId}
                data-fiscal-model-card="true"
                tabIndex={fromCalendar ? -1 : undefined}
                hidden={!matchingIds.has(page.catalogCardId)}
                className={`flex min-w-0 scroll-mt-6 flex-col dark:border-slate-700 dark:bg-slate-900 ${
                  historical
                    ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-blue-100 px-3 py-1.5 font-mono text-lg font-black text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                    {page.code}
                  </span>
                  {(historical || !officialContent) && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        historical
                          ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {historical && (
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {historical
                        ? "Histórico · no vigente"
                        : "Revisión pendiente"}
                    </span>
                  )}
                </div>
                <div
                  className={`mt-4 min-w-0 ${officialContent ? "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3" : ""}`}
                >
                  {officialContent && (
                    <FiscalModelOfficialVisual
                      content={officialContent}
                      variant="catalog"
                    />
                  )}
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold text-slate-950 dark:text-slate-100">
                      Modelo {page.code}
                    </h3>
                    <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                      {officialContent?.canonicalName ?? page.canonicalName}
                    </p>
                    {officialContent && practicalLabels.length > 0 ? (
                      <>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {officialContent.summary}
                        </p>
                        <ul
                          className="mt-3 flex flex-wrap gap-2"
                          aria-label={`Características del Modelo ${page.code}`}
                        >
                          {practicalLabels.map((label) => (
                            <li
                              key={label}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              {label}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex-1" />
                {fromCalendar && (
                  <Link
                    href={calendarNavigation!.returnHref}
                    className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al Calendario
                  </Link>
                )}
                <Link
                  href={detailHref}
                  className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 text-center font-semibold text-blue-800 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                >
                  Ver ficha
                  <span className="sr-only"> del modelo {page.code}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        La cobertura se limita a las fichas que aparecen en este catálogo. La
        ausencia de un código no implica una conclusión sobre su existencia,
        vigencia o aplicación fiscal.
      </p>
    </div>
  );
}
