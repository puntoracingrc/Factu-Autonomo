"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlert, RotateCcw, Star } from "lucide-react";
import {
  AdvisoryScopeToggle,
  type AdvisoryScope,
} from "@/components/consultor-fiscal/AdvisoryScopeToggle";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import {
  buildFiscalModelPersonalizationV1,
  setManualFiscalAdvisoryModelSelectionV1,
  type FiscalModelPersonalizationV1,
} from "@/lib/fiscal-advisory-models";
import {
  filterPublicAeatModelSearchEntriesInteractiveV2,
  getFiscalModelCatalogFocusPresentationV1,
  type PublicAeatModelSearchEntryV2,
} from "@/lib/fiscal-models/model-pages/public-review-search.v2";
import { recordTaxProductEvent } from "@/lib/tax-diagnostic-insights/client";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
const focusedCardClasses = [
  "ring-2",
  "ring-blue-500",
  "ring-offset-2",
  "dark:ring-offset-slate-950",
] as const;
const catalogBatchSize = 30;

interface PersonalizationContextValue {
  enabled: boolean;
  assessmentCodes: ReadonlySet<string>;
  manualCodes: ReadonlySet<string>;
  toggleManualModel: (modelCode: string, selected: boolean) => void;
}

const PersonalizationContext = createContext<PersonalizationContextValue | null>(
  null,
);

function resultLabel(total: number, query: string, scope: AdvisoryScope): string {
  if (!query && scope === "MINE") return `${total} fichas en Mis modelos`;
  if (!query) return `${total} fichas registradas`;
  if (total === 1) return `1 ficha encontrada para «${query}»`;
  return `${total} fichas encontradas para «${query}»`;
}

function fallbackMessage(
  personalization: FiscalModelPersonalizationV1,
): string {
  switch (personalization.fallbackReason) {
    case "RULES_PENDING_REVIEW":
      return "Tu selección orientativa aún puede necesitar ajustes. El catálogo completo permanece visible.";
    case "ASSESSMENT_NOT_RESOLVED":
      return "El diagnóstico todavía necesita revisión o más información. Hasta resolverlo, el catálogo completo permanece visible.";
    case "PROFILE_NOT_COMPLETE":
      return "Faltan datos o existen contradicciones. El motor los mostrará como información pendiente sin convertirlos en una respuesta negativa.";
    case "UNSUPPORTED_TERRITORY":
      return "Este diagnóstico todavía no cubre tu territorio. El catálogo completo permanece disponible.";
    case "INVALID_CATALOG":
      return "No se ha podido validar la vista personalizada. El catálogo completo se mantiene visible de forma segura.";
    case "NO_PUBLISHED_ASSESSMENT":
    default:
      return "Completa y confirma el diagnóstico fiscal para activar una vista personalizada. Mientras tanto, puedes consultar todas las fichas.";
  }
}

export function FiscalModelCatalogBrowser({
  entries,
  initialQuery,
  focusedCardId,
  children,
}: {
  entries: readonly PublicAeatModelSearchEntryV2[];
  initialQuery: string;
  focusedCardId: string | null;
  children: ReactNode;
}) {
  const { data, ready, updateProfile } = useAppStore();
  const [query, setQuery] = useState(initialQuery);
  const [requestedScope, setRequestedScope] = useState<AdvisoryScope>("ALL");
  const [visibleCount, setVisibleCount] = useState(catalogBatchSize);
  const inputRef = useRef<HTMLInputElement>(null);
  const availableModelCodes = useMemo(
    () => entries.map((entry) => entry.code),
    [entries],
  );
  const personalization = useMemo(
    () =>
      buildFiscalModelPersonalizationV1({
        session: data.profile.taxModelDiagnostic,
        preferences: data.profile.fiscalAdvisoryModelPreferences,
        availableModelCodes,
      }),
    [
      availableModelCodes,
      data.profile.fiscalAdvisoryModelPreferences,
      data.profile.taxModelDiagnostic,
    ],
  );
  const personalizationEnabled =
    ready && personalization.status !== "ALL_ONLY";
  const effectiveScope: AdvisoryScope = personalizationEnabled
    ? requestedScope
    : "ALL";
  const result = useMemo(
    () => filterPublicAeatModelSearchEntriesInteractiveV2(entries, query),
    [entries, query],
  );
  const blocked = result.status === "BLOCKED";
  const searchMatches = useMemo(
    () =>
      new Set(
        result.status === "REVIEW_ONLY"
          ? result.data.map((entry) => entry.catalogCardId)
          : [],
      ),
    [result],
  );
  const personalizedCodes = useMemo(
    () => new Set(personalization.visibleModelCodes),
    [personalization.visibleModelCodes],
  );
  const matchingEntries = useMemo(
    () =>
      blocked
        ? []
        : entries.filter(
            (entry) =>
              searchMatches.has(entry.catalogCardId) &&
              (effectiveScope === "ALL" || personalizedCodes.has(entry.code)),
          ),
    [
      blocked,
      effectiveScope,
      entries,
      personalizedCodes,
      searchMatches,
    ],
  );
  const visibleTotal = matchingEntries.length;
  const visibleEntries = useMemo(
    () => matchingEntries.slice(0, visibleCount),
    [matchingEntries, visibleCount],
  );
  const visibleCardIds = useMemo(
    () => new Set(visibleEntries.map((entry) => entry.catalogCardId)),
    [visibleEntries],
  );
  const displayedTotal = visibleEntries.length;

  const toggleManualModel = useCallback(
    (modelCode: string, selected: boolean) => {
      if (!personalizationEnabled) return;
      const next = setManualFiscalAdvisoryModelSelectionV1({
        current: data.profile.fiscalAdvisoryModelPreferences,
        modelCode,
        selected,
        allowedModelCodes: availableModelCodes,
      });
      if (!next) return;
      const recommendation = personalization.recommendations.find(
        (item) => item.modelCode === modelCode,
      );
      void recordTaxProductEvent({
        eventType: selected ? "tax_model_manual_added" : "tax_model_manual_removed",
        page: "MODELS",
        modelNumber: modelCode,
        properties: {
          previousRecommendationStatus: selected
            ? recommendation?.engineRecommendationStatus ?? "UNLIKELY_REQUIRED"
            : recommendation?.recommendationStatus ?? "MANUALLY_SELECTED",
          sourcePage: "MODELS",
        },
      });
      const assessment = data.profile.taxModelDiagnostic?.publishedAssessment;
      if (assessment) {
        void recordTaxProductEvent({
          eventType: "tax_models_saved",
          page: "MODELS",
          engineVersion: assessment.traceability.engineVersion,
          rulesetVersion: assessment.ruleSetVersion,
          fiscalYear: assessment.fiscalYear,
          properties: {
            recommendedCount: personalization.assessmentModelCodes.length,
            manuallyAddedCount: next.manualModelCodes.length,
            manuallyRemovedCount: selected ? 0 : 1,
          },
        });
      }
      updateProfile({
        ...data.profile,
        fiscalAdvisoryModelPreferences: next,
      });
    },
    [
      availableModelCodes,
      data.profile,
      personalizationEnabled,
      personalization,
      updateProfile,
    ],
  );

  useEffect(() => {
    void recordTaxProductEvent({
      eventType: "tax_models_catalog_opened",
      page: "MODELS",
      properties: {},
    }, { dedupeKey: "models-catalog-opened" });
  }, []);
  const personalizationContext = useMemo<PersonalizationContextValue>(
    () => ({
      enabled: personalizationEnabled,
      assessmentCodes: new Set(personalization.assessmentModelCodes),
      manualCodes: new Set(personalization.manualModelCodes),
      toggleManualModel,
    }),
    [personalization, personalizationEnabled, toggleManualModel],
  );

  useEffect(() => {
    setVisibleCount(catalogBatchSize);
  }, [effectiveScope, query]);

  useEffect(() => {
    if (!focusedCardId) return;
    const focusedIndex = matchingEntries.findIndex(
      (entry) => entry.catalogCardId === focusedCardId,
    );
    if (focusedIndex < 0) return;
    const requiredCount =
      Math.ceil((focusedIndex + 1) / catalogBatchSize) * catalogBatchSize;
    setVisibleCount((current) => Math.max(current, requiredCount));
  }, [focusedCardId, matchingEntries]);

  useEffect(() => {
    for (const entry of entries) {
      const card = document.getElementById(entry.catalogCardId);
      if (!card || card.dataset.fiscalModelCard !== "true") continue;
      const shouldHide = !visibleCardIds.has(entry.catalogCardId);
      if (
        shouldHide &&
        document.activeElement instanceof Node &&
        card.contains(document.activeElement)
      ) {
        inputRef.current?.focus();
      }
      card.hidden = shouldHide;
    }

    const noResults = document.getElementById("modelos-aeat-sin-resultados");
    if (noResults) noResults.hidden = blocked || visibleTotal !== 0;
  }, [
    blocked,
    entries,
    visibleCardIds,
    visibleTotal,
  ]);

  useEffect(() => {
    if (!focusedCardId) return;
    const card = document.getElementById(focusedCardId);
    if (!card || card.dataset.fiscalModelCard !== "true") return;

    const syncFocus = () => {
      const presentation = getFiscalModelCatalogFocusPresentationV1({
        focusedCardId,
        currentHash: window.location.hash,
        reduceMotion: window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches,
      });
      if (presentation.ariaCurrent) {
        card.setAttribute("aria-current", presentation.ariaCurrent);
      } else card.removeAttribute("aria-current");
      for (const className of focusedCardClasses) {
        card.classList.toggle(className, presentation.active);
      }
      if (presentation.active && !card.hidden) {
        card.scrollIntoView({
          behavior: presentation.scrollBehavior,
          block: "center",
        });
        card.focus({ preventScroll: true });
      }
    };

    syncFocus();
    window.addEventListener("hashchange", syncFocus);
    window.addEventListener("popstate", syncFocus);
    return () => {
      window.removeEventListener("hashchange", syncFocus);
      window.removeEventListener("popstate", syncFocus);
      card.removeAttribute("aria-current");
      for (const className of focusedCardClasses) {
        card.classList.remove(className);
      }
    };
  }, [focusedCardId, visibleCardIds]);

  return (
    <PersonalizationContext.Provider value={personalizationContext}>
      <div className="space-y-6">
        <Card className="dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div
              role="search"
              aria-labelledby="buscar-modelo-title"
              className="space-y-3"
            >
              <div>
                <h2
                  id="buscar-modelo-title"
                  className="font-bold text-slate-950 dark:text-slate-100"
                >
                  Buscar modelos
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="modelo-aeat"
                    className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Código, nombre o concepto
                  </label>
                  <input
                    ref={inputRef}
                    id="modelo-aeat"
                    name="modelo"
                    type="search"
                    autoComplete="off"
                    enterKeyHint="search"
                    maxLength={80}
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setQuery("");
                    }}
                    aria-describedby={
                      blocked
                        ? "buscar-modelo-error"
                        : "buscar-modelo-resultados"
                    }
                    aria-invalid={blocked}
                    aria-errormessage={
                      blocked ? "buscar-modelo-error" : undefined
                    }
                    placeholder="Ej.: 303, IVA o retenciones"
                    className={`min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 shadow-sm placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${focusRing}`}
                  />
                </div>
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Limpiar
                  </button>
                )}
              </div>
              {blocked ? (
                <p
                  id="buscar-modelo-error"
                  className="text-sm font-semibold text-red-700 dark:text-red-300"
                  role="alert"
                >
                  Escribe hasta 80 caracteres, usa un solo código de modelo y
                  evita saltos de línea o espacios al principio y al final.
                </p>
              ) : (
                <p
                  id="buscar-modelo-resultados"
                  className="text-sm font-semibold text-slate-600 dark:text-slate-300"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {resultLabel(visibleTotal, query, effectiveScope)}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-slate-100">
                  Vista del catálogo
                </h2>
              </div>
              <div className="lg:pt-[1.625rem]">
                <AdvisoryScopeToggle
                  value={effectiveScope}
                  onChange={setRequestedScope}
                  groupLabel="Elegir vista del catálogo"
                  mineLabel="Mis modelos"
                  mineCount={
                    personalizationEnabled
                      ? personalization.visibleModelCodes.length
                      : personalization.manualModelCodes.length
                  }
                  allCount={entries.length}
                  mineDisabled={!personalizationEnabled}
                />
              </div>
              {!ready ? (
                <p className="text-sm text-slate-600 dark:text-slate-300" role="status">
                  Cargando tu configuración fiscal…
                </p>
              ) : personalization.status === "ALL_ONLY" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="flex items-start gap-2">
                    <CircleAlert
                      className="mt-1 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p>
                      {fallbackMessage(personalization)}{" "}
                      <Link
                        href="/consultor-fiscal/diagnostico"
                        className={`font-bold underline underline-offset-2 ${focusRing}`}
                      >
                        Abrir diagnóstico
                      </Link>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        {children}
        {displayedTotal < visibleTotal ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) => current + catalogBatchSize)
              }
              className={`inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-black text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
            >
              Cargar 30 más
            </button>
          </div>
        ) : null}
      </div>
    </PersonalizationContext.Provider>
  );
}

export function FiscalModelManualSelectionAction({
  modelCode,
}: {
  modelCode: string;
}) {
  const context = useContext(PersonalizationContext);
  if (!context?.enabled) return null;
  const fromAssessment = context.assessmentCodes.has(modelCode);
  const manuallySelected = context.manualCodes.has(modelCode);
  const selected = fromAssessment || manuallySelected;
  const accessibleLabel = fromAssessment
    ? `Modelo ${modelCode} incluido automáticamente en Mis modelos`
    : manuallySelected
      ? `Quitar el modelo ${modelCode} de Mis modelos`
      : `Añadir el modelo ${modelCode} a Mis modelos`;

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-pressed={selected}
      disabled={fromAssessment}
      onClick={() => context.toggleManualModel(modelCode, !manuallySelected)}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:cursor-default ${
        selected
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
      } ${focusRing}`}
    >
      <Star
        className={`h-5 w-5 ${selected ? "fill-current" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}
