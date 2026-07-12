import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  History,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { PublicAeatModelReviewSearchResultV1 } from "@/lib/fiscal-models/model-pages";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

export function FiscalModelCatalogView({
  result,
}: {
  result: PublicAeatModelReviewSearchResultV1;
}) {
  const blocked = result.status === "BLOCKED";
  const currentQuery = blocked ? "" : (result.query ?? "");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-slate-900 dark:text-slate-100">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl dark:text-slate-100">
            Modelos AEAT
          </h1>
          <p className="mt-1 break-words text-base text-slate-600 dark:text-slate-300">
            Fichas informativas versionadas con procedencia y estado de revisión
            visibles
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Información en revisión
        </span>
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
              Contenido pendiente de revisión fiscal
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">
              Estas fichas son referencias informativas. Sus fuentes AEAT y BOE
              están registradas, pero la verificación de contenido y la revisión
              fiscal siguen pendientes. No sustituyen la información oficial.
            </p>
          </div>
        </div>
      </Card>

      <Card className="dark:border-slate-700 dark:bg-slate-900">
        <form
          action="/consultor-fiscal/modelos"
          method="get"
          role="search"
          aria-labelledby="buscar-modelo-title"
          className="space-y-3"
        >
          <div>
            <h2
              id="buscar-modelo-title"
              className="font-bold text-slate-950 dark:text-slate-100"
            >
              Buscar una ficha
            </h2>
            <p
              id="buscar-modelo-hint"
              className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300"
            >
              Escribe un código exacto de dos o tres caracteres, usando
              mayúsculas cuando incluya letras. La búsqueda es local y no envía
              datos a servicios externos.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="modelo-aeat"
                className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Código del modelo
              </label>
              <input
                id="modelo-aeat"
                name="modelo"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={3}
                pattern="([0-9]{2,3}|[0-9]{2}[A-Z]|[A-Z][0-9]{2})"
                defaultValue={currentQuery}
                aria-describedby={
                  blocked
                    ? "buscar-modelo-hint buscar-modelo-error"
                    : "buscar-modelo-hint"
                }
                aria-invalid={blocked}
                aria-errormessage={blocked ? "buscar-modelo-error" : undefined}
                placeholder="Ej.: 130 o A22"
                className={`min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 shadow-sm placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${focusRing}`}
              />
            </div>
            <button
              type="submit"
              className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto ${focusRing}`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar
            </button>
            {(blocked || currentQuery) && (
              <Link
                href="/consultor-fiscal/modelos"
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${focusRing}`}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Limpiar
              </Link>
            )}
          </div>
        </form>
      </Card>

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

        {blocked ? (
          <Card
            id="buscar-modelo-error"
            className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
            role="alert"
          >
            <p className="font-semibold text-red-900 dark:text-red-100">
              La búsqueda no es válida.
            </p>
            <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-200">
              Usa un único código exacto de dos o tres caracteres, sin espacios
              ni parámetros adicionales; las letras deben estar en mayúscula.
            </p>
          </Card>
        ) : result.match === "NO_MATCH" ? (
          <Card
            className="dark:border-slate-700 dark:bg-slate-900"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              No hay una ficha registrada para ese código.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              No se crea un resultado aproximado ni se enlaza a otro modelo.
            </p>
          </Card>
        ) : (
          <div
            className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-live="polite"
          >
            {result.data.map((page) => {
              const historical = page.lifecycleStatus === "HISTORICAL";
              return (
                <Card
                  key={page.code}
                  className={`flex min-w-0 flex-col dark:border-slate-700 dark:bg-slate-900 ${
                    historical
                      ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl bg-blue-100 px-3 py-1.5 font-mono text-lg font-black text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                      {page.code}
                    </span>
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
                  </div>
                  <h3 className="mt-4 break-words text-lg font-bold text-slate-950 dark:text-slate-100">
                    Modelo {page.code}
                  </h3>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {page.canonicalName}
                  </p>
                  <p className="mt-3 flex-1 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {page.summary}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Ficha desplegada · contenido en revisión
                  </p>
                  <Link
                    href={page.href}
                    className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 text-center font-semibold text-blue-800 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                  >
                    Abrir ficha en revisión
                    <span className="sr-only"> del modelo {page.code}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        La cobertura se limita a las fichas que aparecen en este catálogo. La
        ausencia de un código no implica una conclusión sobre su existencia,
        vigencia o aplicación fiscal.
      </p>
    </div>
  );
}
