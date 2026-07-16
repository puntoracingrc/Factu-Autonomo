"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FiscalNotificationGuideCoverageSummary } from "@/components/fiscal-notifications/FiscalNotificationGuideCoverageSummary";
import { FiscalNotificationGuideDetail } from "@/components/fiscal-notifications/FiscalNotificationGuideDetail";
import {
  FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1,
  type FiscalNotificationGuideEntryV1,
  type FiscalNotificationGuideSelectionV1,
} from "@/lib/fiscal-notifications/guide/catalog.v1";
import { searchFiscalNotificationGuideV1 } from "@/lib/fiscal-notifications/guide/search.v1";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
function resultLabel(total: number, query: string): string {
  if (!query) return `${total} tipos documentales registrados`;
  if (total === 1) return `1 ficha encontrada para «${query}»`;
  return `${total} fichas encontradas para «${query}»`;
}

function groupEntries(entries: readonly FiscalNotificationGuideEntryV1[]) {
  const groups = new Map<
    string,
    { label: string; entries: FiscalNotificationGuideEntryV1[] }
  >();
  for (const entry of entries) {
    const group = groups.get(entry.category) ?? {
      label: entry.categoryLabel,
      entries: [],
    };
    group.entries.push(entry);
    groups.set(entry.category, group);
  }
  return [...groups.entries()].map(([category, group]) => ({
    category,
    label: group.label,
    entries: group.entries,
  }));
}

export function FiscalNotificationGuideView({
  selection,
}: {
  selection: FiscalNotificationGuideSelectionV1;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const result = useMemo(
    () => searchFiscalNotificationGuideV1(FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1, query),
    [query],
  );
  const blocked = result.status === "BLOCKED";
  const groups = result.status === "READY" ? groupEntries(result.entries) : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 sm:px-6">
      <header className="min-w-0">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-bold uppercase tracking-wide">
            Consulta independiente del analizador
          </p>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl dark:text-slate-100">
          Guía de notificaciones y expedientes
        </h2>
        <p className="mt-1 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Busca qué significa un documento, por qué suele llegar, qué conviene
          hacer y qué plazo debes localizar. La búsqueda se ejecuta en este
          navegador y no envía lo que escribes.
        </p>
      </header>

      <Card
        className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
        role="note"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-amber-950 dark:text-amber-100">
              Te lo explicamos; tú decides qué hacer
            </h3>
            <FiscalNotificationGuideCoverageSummary />
          </div>
        </div>
      </Card>

      {selection.status === "UNKNOWN_OR_INVALID" && (
        <Card
          className="border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
          role="alert"
        >
          <h3 className="font-bold text-rose-950 dark:text-rose-100">
            Ficha no disponible
          </h3>
          <p className="mt-1 text-sm leading-6 text-rose-900 dark:text-rose-200">
            El identificador solicitado no coincide exactamente con una familia
            registrada. No se ha aproximado ni sustituido por otra ficha.
          </p>
          <Link
            href="/consultor-fiscal/notificaciones#guia-notificaciones"
            className={`mt-3 inline-flex min-h-11 items-center rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
          >
            Abrir el índice completo
          </Link>
        </Card>
      )}

      {selection.status === "SELECTED" && (
        <FiscalNotificationGuideDetail entry={selection.entry} />
      )}

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <div role="search" aria-labelledby="buscar-notificacion-title" className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-700 dark:text-blue-300" aria-hidden="true" />
              <h3 id="buscar-notificacion-title" className="font-bold text-slate-950 dark:text-slate-100">
                Buscar en la guía
              </h3>
            </div>
            <p id="buscar-notificacion-hint" className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Busca por nombre, categoría o términos equivalentes; por ejemplo,
              requerimiento, reposición, embargo, aplazamiento o NRC. Puedes
              escribir con o sin tildes. El filtro es exclusivamente local.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="fiscal-notification-guide-query" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tipo de documento o procedimiento
              </label>
              <input
                ref={inputRef}
                id="fiscal-notification-guide-query"
                name="consulta-notificacion"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                maxLength={80}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
                aria-describedby={blocked ? "buscar-notificacion-hint buscar-notificacion-error" : "buscar-notificacion-hint buscar-notificacion-resultados"}
                aria-invalid={blocked}
                aria-errormessage={blocked ? "buscar-notificacion-error" : undefined}
                placeholder="Ej.: requerimiento, embargo o NRC"
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
            <p id="buscar-notificacion-error" role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">
              Escribe hasta 80 caracteres y evita saltos de línea o caracteres de control.
            </p>
          ) : (
            <p id="buscar-notificacion-resultados" role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {resultLabel(result.total, result.query)}
            </p>
          )}
        </div>
      </Card>

      <section aria-labelledby="fiscal-notification-guide-catalog-title" className="space-y-6">
        <h3 id="fiscal-notification-guide-catalog-title" className="text-xl font-bold text-slate-950 dark:text-slate-100">
          Tipos documentales registrados
        </h3>

        {!blocked && result.total === 0 && (
          <Card className="dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              No encontramos una ficha que coincida con la búsqueda.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Prueba con el nombre del acto, una categoría o un término más general.
              La ausencia de resultados no permite concluir que el documento no exista.
            </p>
          </Card>
        )}

        {groups.map((group) => (
          <section key={group.category} aria-labelledby={`guide-category-${group.category}`} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 id={`guide-category-${group.category}`} className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {group.label}
              </h4>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {group.entries.length} {group.entries.length === 1 ? "ficha" : "fichas"}
              </span>
            </div>
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.entries.map((entry) => (
                <Card key={entry.familyId} className="flex min-w-0 flex-col dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                      {entry.categoryLabel}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100"}`}>
                      {entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY"
                        ? "Lectura automática · revisión obligatoria"
                        : "Guía disponible · revisión manual"}
                    </span>
                  </div>
                  <h5 className="mt-4 break-words text-lg font-bold text-slate-950 dark:text-slate-100">
                    {entry.nameEs}
                  </h5>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {entry.summary}
                  </p>
                  <div className="flex-1" />
                  <Link
                    href={`/consultor-fiscal/notificaciones?guia=${encodeURIComponent(entry.familyId)}#guia-notificaciones`}
                    className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 text-center font-semibold text-blue-800 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                  >
                    Ver ficha
                    <span className="sr-only"> de {entry.nameEs}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}
