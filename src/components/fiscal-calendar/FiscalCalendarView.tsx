"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BellPlus,
  CalendarDays,
  CircleAlert,
  ExternalLink,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  AdvisoryScopeToggle,
  type AdvisoryScope,
} from "@/components/consultor-fiscal/AdvisoryScopeToggle";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { normalizeFiscalAdvisoryModelPreferencesV1 } from "@/lib/fiscal-advisory-models";
import {
  formatFiscalCalendarEventDate,
  formatFiscalCalendarFetchedAt,
} from "@/lib/fiscal-calendar/dates";
import {
  buildFiscalCalendarDescriptionFilterContext,
  buildFiscalCalendarDescriptionView,
  type FiscalCalendarDescriptionFilterContext,
  type FiscalCalendarDescriptionLine,
  type FiscalCalendarDescriptionScope,
} from "@/lib/fiscal-calendar/description-obligation-view";
import { segmentFiscalCalendarModelReferences } from "@/lib/fiscal-calendar/model-reference-links";
import {
  buildFiscalCalendarObligationView,
  type FiscalCalendarEventObligationDecision,
  type FiscalCalendarObligationView,
} from "@/lib/fiscal-calendar/obligation-filter";
import {
  createFiscalCalendarReminderDraft,
  FISCAL_CALENDAR_REMINDER_TARGET_HREF,
  storeFiscalCalendarReminderDraft,
} from "@/lib/fiscal-calendar/reminder-draft";
import { parseFiscalCalendarResponseData } from "@/lib/fiscal-calendar/response-data";
import type {
  FiscalCalendarCategory,
  FiscalCalendarCategoryOption,
  FiscalCalendarEvent,
  FiscalCalendarModelPageLink,
  FiscalCalendarOfficialSource,
  FiscalCalendarResponseData,
} from "@/lib/fiscal-calendar/types";
import { recordTaxProductEvent } from "@/lib/tax-diagnostic-insights/client";

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

function obligationFallbackMessage(view: FiscalCalendarObligationView): string {
  switch (view.fallbackReason) {
    case "RULES_PENDING_REVIEW":
      return "La recomendación es orientativa y las reglas siguen en revisión fiscal. Puedes consultar todos los vencimientos en «Todos».";
    case "ASSESSMENT_NOT_RESOLVED":
      return "El diagnóstico todavía necesita revisión o más información. La vista orientativa conserva «Todos» como listado completo.";
    case "PROFILE_NOT_COMPLETE":
      return "Faltan datos o existen conflictos en el perfil fiscal. La vista orientativa los mantiene por confirmar y «Todos» conserva el calendario completo.";
    case "UNSUPPORTED_TERRITORY":
      return "El diagnóstico no puede personalizar este territorio con seguridad. Se muestran todos los vencimientos.";
    case "NO_PUBLISHED_ASSESSMENT":
    default:
      return "Completa y confirma el diagnóstico fiscal para activar una vista personalizada. Mientras tanto, se muestran todos los vencimientos.";
  }
}

function LinkedEventText({
  text,
  modelLinks,
  onModelOpen,
}: {
  text: string;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
  onModelOpen?: (modelNumber: string) => void;
}) {
  return segmentFiscalCalendarModelReferences(text, modelLinks).map(
    (segment, index) =>
      segment.modelPage ? (
        <span key={`${index}-${segment.text}`}>
          <Link
            href={segment.modelPage.href}
            onClick={() => onModelOpen?.(segment.modelPage!.code)}
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

function EventDescriptionLine({
  line,
  modelLinks,
  onModelOpen,
}: {
  line: FiscalCalendarDescriptionLine;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
  onModelOpen?: (modelNumber: string) => void;
}) {
  return (
    <p
      role="listitem"
      className="break-words rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      <LinkedEventText
        text={line.text}
        modelLinks={modelLinks}
        onModelOpen={onModelOpen}
      />
    </p>
  );
}

export function FiscalCalendarEventDescription({
  event,
  scope,
  filterContext,
  modelLinks,
  onModelOpen,
}: {
  event: FiscalCalendarEvent;
  scope: FiscalCalendarDescriptionScope;
  filterContext: FiscalCalendarDescriptionFilterContext;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
  onModelOpen?: (modelNumber: string) => void;
}) {
  const view = buildFiscalCalendarDescriptionView({
    event,
    scope,
    context: filterContext,
  });

  if (view.mode === "FULL" && view.directLines.length <= 1) {
    return (
      <p className="mt-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
        <LinkedEventText
          text={view.directLines[0]?.text ?? event.description}
          modelLinks={modelLinks}
          onModelOpen={onModelOpen}
        />
      </p>
    );
  }

  if (view.mode === "FULL") {
    return (
      <div
        className="mt-3 space-y-2"
        role="list"
        aria-label="Detalle del vencimiento"
      >
        {view.directLines.map((line) => (
          <EventDescriptionLine
            key={`${line.sourceIndex}-${line.text}`}
            line={line}
            modelLinks={modelLinks}
            onModelOpen={onModelOpen}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 min-w-0 space-y-2">
      {view.directLines.length > 0 ? (
        <div
          className="space-y-2"
          role="list"
          aria-label="Detalle visible del vencimiento"
        >
          {view.directLines.map((line) => (
            <EventDescriptionLine
              key={`${line.sourceIndex}-${line.text}`}
              line={line}
              modelLinks={modelLinks}
              onModelOpen={onModelOpen}
            />
          ))}
        </div>
      ) : null}

      <details className="group min-w-0 max-w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <summary className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-200">
          <span className="min-w-0 flex-1 break-words">
            Otros modelos publicados por la AEAT ({view.otherModelCount})
          </span>
          <span className="shrink-0 text-blue-700 group-open:hidden dark:text-blue-300">
            Mostrar
          </span>
          <span className="hidden shrink-0 text-blue-700 group-open:inline dark:text-blue-300">
            Ocultar
          </span>
        </summary>
        <div
          className="space-y-2 border-t border-slate-100 px-2 py-2 dark:border-slate-800"
          role="list"
          aria-label="Otros modelos publicados por la AEAT"
        >
          {view.otherModelLines.map((line) => (
            <EventDescriptionLine
              key={`${line.sourceIndex}-${line.text}`}
              line={line}
              modelLinks={modelLinks}
              onModelOpen={onModelOpen}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

function EventCard({
  event,
  categoryLabel,
  modelLinks,
  obligationDecision,
  orientationHighlighted,
  descriptionScope,
  descriptionFilterContext,
  onCreateReminder,
  onModelOpen,
}: {
  event: FiscalCalendarEvent;
  categoryLabel: string;
  modelLinks: ReadonlyMap<string, FiscalCalendarModelPageLink>;
  obligationDecision?: FiscalCalendarEventObligationDecision;
  orientationHighlighted: boolean;
  descriptionScope: FiscalCalendarDescriptionScope;
  descriptionFilterContext: FiscalCalendarDescriptionFilterContext;
  onCreateReminder: (event: FiscalCalendarEvent) => void;
  onModelOpen: (modelNumber: string) => void;
}) {
  return (
    <li>
      <Card
        className={`flex h-full flex-col dark:bg-slate-900 ${
          orientationHighlighted
            ? "border-amber-300 bg-amber-50/40 ring-1 ring-amber-200 dark:border-amber-700 dark:bg-amber-950/20 dark:ring-amber-900"
            : "border-slate-200/80 dark:border-slate-700"
        }`}
      >
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
          {event.deadlineKind !== "unclassified" ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {DEADLINE_KIND_LABELS[event.deadlineKind]}
            </span>
          ) : null}
          {event.reviewStatus === "review-with-advisor" ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Revisar con gestor
            </span>
          ) : null}
          {obligationDecision?.manuallySelected ? (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
              Añadido por ti
            </span>
          ) : null}
          {obligationDecision?.reason === "REQUIRED" &&
          obligationDecision.requiresConfirmation ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Puede afectarte · por confirmar
            </span>
          ) : orientationHighlighted &&
            obligationDecision?.requiresConfirmation ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Relacionado · por confirmar
            </span>
          ) : obligationDecision?.requiresConfirmation ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Por confirmar
            </span>
          ) : obligationDecision?.modelCode ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              Coincide con tu diagnóstico
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
          <LinkedEventText
            text={event.title}
            modelLinks={modelLinks}
            onModelOpen={onModelOpen}
          />
        </h2>
        <time
          className="mt-2 block text-sm font-semibold text-blue-700 dark:text-blue-300"
          dateTime={event.startDate}
        >
          {formatFiscalCalendarEventDate(event)}
        </time>
        {event.description ? (
          <FiscalCalendarEventDescription
            event={event}
            scope={descriptionScope}
            filterContext={descriptionFilterContext}
            modelLinks={modelLinks}
            onModelOpen={onModelOpen}
          />
        ) : (
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
            La fuente no incluye una descripción adicional.
          </p>
        )}
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Fuente del evento: Agencia Tributaria
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full sm:w-auto"
          aria-label={`Crear recordatorio: ${event.title}`}
          onClick={() => onCreateReminder(event)}
        >
          <BellPlus className="h-4 w-4" aria-hidden="true" />
          Crear recordatorio
        </Button>
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
  const router = useRouter();
  const { data: appData, ready: appReady } = useAppStore();
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
  const [reminderDraftError, setReminderDraftError] = useState<string | null>(
    null,
  );
  const [requestedScope, setRequestedScope] = useState<AdvisoryScope>("ALL");

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
  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const manualModelCodes = useMemo(
    () =>
      normalizeFiscalAdvisoryModelPreferencesV1(
        appData.profile.fiscalAdvisoryModelPreferences,
      )?.manualModelCodes ?? [],
    [appData.profile.fiscalAdvisoryModelPreferences],
  );
  const obligationView = useMemo(
    () =>
      buildFiscalCalendarObligationView({
        events,
        session: appData.profile.taxModelDiagnostic,
        manualModelCodes,
      }),
    [appData.profile.taxModelDiagnostic, events, manualModelCodes],
  );
  const descriptionFilterContext = useMemo(
    () =>
      buildFiscalCalendarDescriptionFilterContext({
        session: appData.profile.taxModelDiagnostic,
        obligationViewStatus: obligationView.status,
        mineModelCodes: obligationView.mineModelCodes,
        resolvableModelCodes: new Set(modelLinks.keys()),
      }),
    [
      appData.profile.taxModelDiagnostic,
      modelLinks,
      obligationView.mineModelCodes,
      obligationView.status,
    ],
  );
  const obligationDecisions = useMemo(
    () =>
      new Map(
        obligationView.decisions.map((decision) => [
          decision.eventId,
          decision,
        ]),
      ),
    [obligationView.decisions],
  );
  const orientationPriorityEventIds = useMemo(
    () =>
      new Set(
        obligationView.decisions
          .filter(
            (decision) =>
              decision.manuallySelected ||
              decision.reason === "REQUIRED" ||
              decision.reason === "REVIEW_REQUIRED" ||
              decision.reason === "UNKNOWN",
          )
          .map((decision) => decision.eventId),
      ),
    [obligationView.decisions],
  );
  const personalizationAvailable =
    appReady && obligationView.status !== "ALL_ONLY";
  const effectiveScope: AdvisoryScope = personalizationAvailable
    ? requestedScope
    : "ALL";
  const visibleEvents = useMemo(() => {
    if (effectiveScope === "ALL") return events;
    if (obligationView.status === "PERSONALIZED") {
      return events.filter((event) =>
        obligationView.visibleEventIds.has(event.id),
      );
    }
    return events.filter((event) =>
      obligationView.recommendedEventIds.has(event.id),
    );
  }, [
    effectiveScope,
    events,
    obligationView.recommendedEventIds,
    obligationView.status,
    obligationView.visibleEventIds,
  ]);
  const visibleReviewCount =
    effectiveScope === "MINE"
      ? visibleEvents.filter((event) =>
          obligationView.reviewEventIds.has(event.id),
        ).length
      : 0;

  useEffect(() => {
    void recordTaxProductEvent(
      {
        eventType: "tax_calendar_opened",
        page: "CALENDAR",
        properties: { scope: effectiveScope },
      },
      { dedupeKey: `calendar-opened:${effectiveScope}` },
    );
  }, [effectiveScope]);

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
    const rangeDays = Math.max(
      1,
      Math.round(
        (new Date(endDateInclusive).getTime() - new Date(startDate).getTime()) /
          86_400_000,
      ) + 1,
    );
    void recordTaxProductEvent({
      eventType: "tax_calendar_filters_used",
      page: "CALENDAR",
      properties: {
        categoryCount: selectedCategories.length,
        dateRangeBucket:
          rangeDays <= 31
            ? "UP_TO_31_DAYS"
            : rangeDays <= 92
              ? "32_TO_92_DAYS"
              : "OVER_92_DAYS",
      },
    });
  }

  function prepareReminder(event: FiscalCalendarEvent) {
    void recordTaxProductEvent({
      eventType: "tax_calendar_event_opened",
      page: "CALENDAR",
      properties: { sourcePage: "CALENDAR" },
    });
    setReminderDraftError(null);
    try {
      const draft = createFiscalCalendarReminderDraft(event);
      const stored = storeFiscalCalendarReminderDraft(
        window.sessionStorage,
        draft,
      );
      if (!stored.ok) {
        setReminderDraftError(
          "No hemos podido preparar el recordatorio. Inténtalo de nuevo.",
        );
        return;
      }
      router.push(FISCAL_CALENDAR_REMINDER_TARGET_HREF);
    } catch {
      setReminderDraftError(
        "No hemos podido preparar el recordatorio. Inténtalo de nuevo.",
      );
    }
  }

  function recordCalendarModelOpen(modelNumber: string) {
    void recordTaxProductEvent({
      eventType: "tax_calendar_model_opened",
      page: "CALENDAR",
      modelNumber,
      properties: { sourcePage: "CALENDAR" },
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Calendario fiscal"
        subtitle="Vencimientos generales publicados por la Agencia Tributaria"
      />

      <Card className="mb-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <h2 className="font-bold text-slate-950 dark:text-slate-100">
              Vista del calendario
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Elige entre todos los vencimientos o una vista organizada según tu
              diagnóstico y los modelos que hayas añadido manualmente.
            </p>
          </div>
          <div className="space-y-3">
            <AdvisoryScopeToggle
              value={effectiveScope}
              onChange={setRequestedScope}
              groupLabel="Elegir vista del calendario"
              mineLabel="Mis obligaciones"
              mineCount={
                personalizationAvailable
                  ? obligationView.mineModelCodes.size
                  : 0
              }
              allCount={events.length}
              mineDisabled={!personalizationAvailable}
            />
            {!appReady ? (
              <p
                className="text-sm text-slate-600 dark:text-slate-300"
                role="status"
              >
                Cargando tu configuración fiscal…
              </p>
            ) : obligationView.status === "ALL_ONLY" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <div className="flex items-start gap-2">
                  <CircleAlert
                    className="mt-1 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p>
                    {obligationFallbackMessage(obligationView)}{" "}
                    <Link
                      href="/consultor-fiscal/diagnostico"
                      className="font-bold underline underline-offset-2 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      Abrir diagnóstico
                    </Link>
                  </p>
                </div>
              </div>
            ) : obligationView.status === "ORIENTATIVE" ? null : (
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Se ocultan únicamente modelos marcados como no aplicables con
                evidencia suficiente. Los demás siguen visibles. Gestiona tus
                elecciones en{" "}
                <Link
                  href="/consultor-fiscal/modelos"
                  className="font-bold text-blue-700 underline underline-offset-2 dark:text-blue-300"
                >
                  Modelos AEAT
                </Link>
                .
              </p>
            )}
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

          <fieldset aria-describedby="fiscal-calendar-category-help">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Categorías
            </legend>
            <p
              id="fiscal-calendar-category-help"
              className="mt-1 max-w-3xl text-sm leading-5 text-slate-600 dark:text-slate-400"
            >
              La AEAT publica «Renta», «Renta y Sociedades» y «Sociedades» como
              calendarios separados. «Renta y Sociedades» es su categoría
              conjunta, no una repetición.
            </p>
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

        {!loading && !error && data && events.length === 0 ? (
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

        {!loading &&
        !error &&
        data &&
        events.length > 0 &&
        visibleEvents.length === 0 ? (
          <Card className="text-center dark:border-slate-700 dark:bg-slate-900">
            <CalendarDays
              className="mx-auto h-8 w-8 text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 font-bold text-slate-800 dark:text-slate-100">
              No hay vencimientos en Mis obligaciones
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Puedes volver a la vista completa en cualquier momento.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => setRequestedScope("ALL")}
            >
              Ver todos
            </Button>
          </Card>
        ) : null}

        {reminderDraftError ? (
          <p
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {reminderDraftError}
          </p>
        ) : null}

        {visibleEvents.length > 0 ? (
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
                  {visibleEvents.length} resultado
                  {visibleEvents.length === 1 ? "" : "s"}
                  {effectiveScope === "MINE" &&
                  obligationView.status === "ORIENTATIVE"
                    ? ` · ${orientationPriorityEventIds.size} relacionados destacados · ${visibleReviewCount} por confirmar · Todos sigue disponible`
                    : effectiveScope === "MINE"
                      ? ` · ${obligationView.excludedCount} no aplicables ocultos · ${visibleReviewCount} por confirmar`
                      : ""}
                </p>
              </div>
              {loading ? (
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Actualizando…
                </span>
              ) : null}
            </div>
            <ol className="grid gap-4 md:grid-cols-2">
              {visibleEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  categoryLabel={
                    categoryLabels.get(event.category) ?? event.category
                  }
                  modelLinks={modelLinks}
                  obligationDecision={
                    effectiveScope === "MINE"
                      ? obligationDecisions.get(event.id)
                      : undefined
                  }
                  orientationHighlighted={
                    effectiveScope === "MINE" &&
                    obligationView.status === "ORIENTATIVE" &&
                    orientationPriorityEventIds.has(event.id)
                  }
                  descriptionScope={effectiveScope}
                  descriptionFilterContext={descriptionFilterContext}
                  onCreateReminder={prepareReminder}
                  onModelOpen={recordCalendarModelOpen}
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
                ? formatFiscalCalendarFetchedAt(data.fetchedAt)
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
