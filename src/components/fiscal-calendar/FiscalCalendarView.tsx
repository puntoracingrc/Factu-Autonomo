"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import {
  formatFiscalCalendarEventDate,
  formatFiscalCalendarFetchedAt,
} from "@/lib/fiscal-calendar/dates";
import { segmentFiscalCalendarModelReferences } from "@/lib/fiscal-calendar/model-reference-links";
import { parseFiscalCalendarResponseData } from "@/lib/fiscal-calendar/response-data";
import type {
  FiscalCalendarCategory,
  FiscalCalendarCategoryOption,
  FiscalCalendarEvent,
  FiscalCalendarModelPageLink,
  FiscalCalendarOfficialSource,
  FiscalCalendarResponseData,
} from "@/lib/fiscal-calendar/types";

interface FiscalCalendarViewProps {
  initialStartDate: string;
  initialEndDateInclusive: string;
  categoryOptions: readonly FiscalCalendarCategoryOption[];
  officialSource: FiscalCalendarOfficialSource;
}

interface AppliedQuery {
  startDate: string;
  endDateInclusive: string;
  categories: readonly FiscalCalendarCategory[];
}

const DEADLINE_KIND_LABELS = {
  "general-filing": "Plazo general de presentación",
  "direct-debit": "Domiciliación bancaria",
  exception: "Excepción",
  unclassified: "Tipo de plazo no clasificado",
} as const;

const MAX_RENDERED_DESCRIPTION_LINES = 100;

function requestUrl(
  startDate: string,
  endDateInclusive: string,
  categories: string,
): string {
  const parameters = new URLSearchParams({
    from: startDate,
    to: endDateInclusive,
    categories,
  });
  return `/api/fiscal-calendar/events?${parameters.toString()}`;
}

function safeErrorMessage(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "No se pudo cargar el calendario fiscal. Inténtalo de nuevo.";
  }
  const error = (value as { error?: unknown }).error;
  if (typeof error !== "string" || !error.trim()) {
    return "No se pudo cargar el calendario fiscal. Inténtalo de nuevo.";
  }
  return error
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function LinkedEventText({
  text,
  modelLinks,
}: {
  text: string;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
}) {
  return segmentFiscalCalendarModelReferences(text, modelLinks).map(
    (segment, index) =>
      segment.modelPage ? (
        <span key={`${index}-${segment.text}`}>
          <Link
            href={segment.modelPage.href}
            aria-label={`Modelo ${segment.modelPage.code}: localizar en el catálogo de Modelos AEAT`}
            className="font-bold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-blue-300"
          >
            {segment.text}
          </Link>
          {segment.modelPage.historical ? (
            <span className="ml-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
              histórico · no vigente
            </span>
          ) : null}
        </span>
      ) : (
        <span key={`${index}-${segment.text}`}>{segment.text}</span>
      ),
  );
}

function EventDescription({
  description,
  modelLinks,
}: {
  description: string;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
}) {
  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_RENDERED_DESCRIPTION_LINES);

  if (lines.length <= 1) {
    return (
      <p className="mt-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
        <LinkedEventText
          text={lines[0] ?? description}
          modelLinks={modelLinks}
        />
      </p>
    );
  }

  return (
    <div
      className="mt-3 space-y-2"
      role="list"
      aria-label="Detalle del vencimiento"
    >
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          role="listitem"
          className="break-words rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <LinkedEventText text={line} modelLinks={modelLinks} />
        </p>
      ))}
    </div>
  );
}

function EventCard({
  event,
  categoryLabel,
  modelLinks,
}: {
  event: FiscalCalendarEvent;
  categoryLabel: string;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
}) {
  return (
    <li>
      <Card className="h-full border-slate-200/80 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            {categoryLabel}
          </span>
          {event.allDay ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Día completo
            </span>
          ) : null}
          {event.status === "tentative" ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Provisional en la fuente
            </span>
          ) : null}
          {event.status === "unknown" ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Estado de fuente sin confirmar
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {DEADLINE_KIND_LABELS[event.deadlineKind]}
          </span>
          {event.reviewStatus === "review-with-advisor" ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Revisar con gestor
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
          <LinkedEventText text={event.title} modelLinks={modelLinks} />
        </h2>
        <time
          className="mt-2 block text-sm font-semibold text-blue-700 dark:text-blue-300"
          dateTime={event.startDate}
        >
          {formatFiscalCalendarEventDate(event)}
        </time>
        {event.description ? (
          <EventDescription
            description={event.description}
            modelLinks={modelLinks}
          />
        ) : (
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
            La fuente no incluye una descripción adicional.
          </p>
        )}
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Fuente del evento: Agencia Tributaria
        </p>
      </Card>
    </li>
  );
}

export function FiscalCalendarView({
  initialStartDate,
  initialEndDateInclusive,
  categoryOptions,
  officialSource,
}: FiscalCalendarViewProps) {
  const allCategories = useMemo(
    () => categoryOptions.map((option) => option.key),
    [categoryOptions],
  );
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDateInclusive, setEndDateInclusive] = useState(
    initialEndDateInclusive,
  );
  const [selectedCategories, setSelectedCategories] = useState<
    FiscalCalendarCategory[]
  >([...allCategories]);
  const [appliedQuery, setAppliedQuery] = useState<AppliedQuery>({
    startDate: initialStartDate,
    endDateInclusive: initialEndDateInclusive,
    categories: allCategories,
  });
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [data, setData] = useState<FiscalCalendarResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const categoryLabels = useMemo(
    () => new Map(categoryOptions.map((option) => [option.key, option.label])),
    [categoryOptions],
  );
  const categoryKey = appliedQuery.categories.join(",");
  const modelLinks = useMemo(
    () =>
      new Map(
        (data?.modelPageLinks ?? []).map((modelPage) => [
          modelPage.code,
          modelPage,
        ]),
      ),
    [data?.modelPageLinks],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadEvents() {
      setData(null);
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          requestUrl(
            appliedQuery.startDate,
            appliedQuery.endDateInclusive,
            categoryKey,
          ),
          {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        const body = (await response.json().catch(() => null)) as unknown;
        if (!active) return;
        if (!response.ok) {
          setError(safeErrorMessage(body));
          return;
        }
        const nextData = parseFiscalCalendarResponseData(body);
        if (!nextData) {
          setError(
            "El calendario devolvió una respuesta no válida. Inténtalo de nuevo.",
          );
          return;
        }
        setData(nextData);
      } catch (requestError) {
        if (!active || controller.signal.aborted) return;
        setError(
          requestError instanceof Error && requestError.name === "AbortError"
            ? null
            : "No se pudo conectar con el calendario local. Inténtalo de nuevo.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadEvents();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    appliedQuery.endDateInclusive,
    appliedQuery.startDate,
    categoryKey,
    refreshSequence,
  ]);

  function toggleCategory(category: FiscalCalendarCategory) {
    setFilterError(null);
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category],
    );
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startDate || !endDateInclusive) {
      setFilterError("Indica las fechas inicial y final.");
      return;
    }
    if (selectedCategories.length === 0) {
      setFilterError("Selecciona al menos una categoría.");
      return;
    }
    setFilterError(null);
    setData(null);
    setError(null);
    setLoading(true);
    setRefreshSequence((value) => value + 1);
    setAppliedQuery({
      startDate,
      endDateInclusive,
      categories: selectedCategories,
    });
  }

  const events = data?.events ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Calendario fiscal"
        subtitle="Estructura informativa de vencimientos fiscales generales"
      />

      <Card className="mb-5 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
        <div className="flex gap-3">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300"
            aria-hidden="true"
          />
          <div className="text-sm leading-6 text-blue-950 dark:text-blue-100">
            <p className="font-bold">Información general, no personalizada</p>
            <p>
              Esta sección organiza información general del calendario de la
              Agencia Tributaria. La obligación concreta depende de la situación
              fiscal de cada contribuyente.
            </p>
            <p className="mt-2">
              Esta revisión local no clasifica automáticamente plazos generales,
              domiciliaciones ni excepciones. Si la fuente no aporta una
              clasificación estructurada, se muestra «Revisar con gestor».
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-6 dark:border-slate-700 dark:bg-slate-900">
        <form onSubmit={applyFilters} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desde">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDateInclusive || undefined}
              />
            </Field>
            <Field label="Hasta">
              <Input
                type="date"
                value={endDateInclusive}
                onChange={(event) => setEndDateInclusive(event.target.value)}
                min={startDate || undefined}
              />
            </Field>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Categorías
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categoryOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(option.key)}
                    onChange={() => toggleCategory(option.key)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {filterError ? (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {filterError}
            </p>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            )}
            Aplicar filtros
          </Button>
        </form>
      </Card>

      <div aria-live="polite" aria-busy={loading}>
        {data?.providerMode === "fixture" ? (
          <Card className="mb-5 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="flex gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
              Datos simulados para revisión local. No son fechas oficiales ni
              obligaciones reales.
            </p>
          </Card>
        ) : null}

        {data?.providerMode === "review-only" ? (
          <Card className="mb-5 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="flex gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
              Calendario público en revisión. Esta versión muestra la estructura
              y los filtros, pero todavía no incorpora vencimientos verificados.
              Consulta la fuente oficial de la AEAT.
            </p>
          </Card>
        ) : null}

        {loading && !data ? (
          <Card className="text-center dark:border-slate-700 dark:bg-slate-900">
            <Loader2
              className="mx-auto h-7 w-7 animate-spin text-blue-600"
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
              Cargando próximos vencimientos…
            </p>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
            <p className="font-bold text-red-900 dark:text-red-100">
              No hemos podido cargar el calendario
            </p>
            <p className="mt-2 text-sm text-red-800 dark:text-red-200">
              {error}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setData(null);
                setError(null);
                setLoading(true);
                setRefreshSequence((value) => value + 1);
              }}
            >
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              Reintentar
            </Button>
          </Card>
        ) : null}

        {!loading &&
        !error &&
        data &&
        data.providerMode !== "review-only" &&
        events.length === 0 ? (
          <Card className="text-center dark:border-slate-700 dark:bg-slate-900">
            <CalendarDays
              className="mx-auto h-8 w-8 text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 font-bold text-slate-800 dark:text-slate-100">
              No hay vencimientos en este rango
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Prueba con otras fechas o categorías.
            </p>
          </Card>
        ) : null}

        {events.length > 0 ? (
          <section aria-labelledby="fiscal-calendar-upcoming-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="fiscal-calendar-upcoming-title"
                  className="text-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  Próximos vencimientos
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {events.length} resultado{events.length === 1 ? "" : "s"}
                </p>
              </div>
              {loading ? (
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Actualizando…
                </span>
              ) : null}
            </div>
            <ol className="grid gap-4 md:grid-cols-2">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  categoryLabel={
                    categoryLabels.get(event.category) ?? event.category
                  }
                  modelLinks={modelLinks}
                />
              ))}
            </ol>
          </section>
        ) : null}

        {data?.truncated ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Se alcanzó el límite local de resultados. Acota el rango para ver
            todos los eventos.
          </p>
        ) : null}
      </div>

      <Card className="mt-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Fuente
            </p>
            <a
              href={officialSource.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-semibold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
            >
              Agencia Tributaria
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Última consulta
            </p>
            <p className="mt-1">
              {data
                ? data.providerMode === "review-only"
                  ? "Sin consulta externa"
                  : formatFiscalCalendarFetchedAt(data.fetchedAt)
                : "Pendiente de cargar"}
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Catálogo revisado el {officialSource.retrievedAt}. Consulta también la{" "}
          <Link
            href="/ayuda"
            className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            ayuda general
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
