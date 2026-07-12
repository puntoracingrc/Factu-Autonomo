"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  filterPublicAeatModelSearchEntriesInteractiveV2,
  getFiscalModelCatalogFocusPresentationV1,
  type PublicAeatModelSearchEntryV2,
} from "@/lib/fiscal-models/model-pages/public-review-search.v2";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";
const focusedCardClasses = [
  "ring-2",
  "ring-blue-500",
  "ring-offset-2",
  "dark:ring-offset-slate-950",
] as const;

function resultLabel(total: number, query: string): string {
  if (!query) return `${total} fichas registradas`;
  if (total === 1) return `1 ficha encontrada para «${query}»`;
  return `${total} fichas encontradas para «${query}»`;
}

export function FiscalModelCatalogBrowser({
  entries,
  initialQuery,
  focusedCardId,
}: {
  entries: readonly PublicAeatModelSearchEntryV2[];
  initialQuery: string;
  focusedCardId: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const result = useMemo(
    () => filterPublicAeatModelSearchEntriesInteractiveV2(entries, query),
    [entries, query],
  );
  const blocked = result.status === "BLOCKED";
  const total = blocked ? 0 : result.total;

  useEffect(() => {
    const matchingIds = new Set(
      result.status === "REVIEW_ONLY"
        ? result.data.map((entry) => entry.catalogCardId)
        : [],
    );
    for (const entry of entries) {
      const card = document.getElementById(entry.catalogCardId);
      if (!card || card.dataset.fiscalModelCard !== "true") continue;
      const shouldHide = !matchingIds.has(entry.catalogCardId);
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
    if (noResults) noResults.hidden = blocked || total !== 0;
  }, [blocked, entries, result, total]);

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
  }, [focusedCardId]);

  return (
    <Card className="dark:border-slate-700 dark:bg-slate-900">
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
          <p
            id="buscar-modelo-hint"
            className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            Busca por código, nombre oficial o conceptos que aparezcan en el
            nombre del modelo; por ejemplo, 303, IVA, retenciones o
            arrendamiento. Puedes escribir con o sin tildes y usar mayúsculas o
            minúsculas. El filtro es local y no envía datos a servicios
            externos.
          </p>
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
                  ? "buscar-modelo-hint buscar-modelo-error"
                  : "buscar-modelo-hint buscar-modelo-resultados"
              }
              aria-invalid={blocked}
              aria-errormessage={blocked ? "buscar-modelo-error" : undefined}
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
            Escribe hasta 80 caracteres y evita saltos de línea o espacios al
            principio y al final.
          </p>
        ) : (
          <p
            id="buscar-modelo-resultados"
            className="text-sm font-semibold text-slate-600 dark:text-slate-300"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {resultLabel(total, query)}
          </p>
        )}
      </div>
    </Card>
  );
}
