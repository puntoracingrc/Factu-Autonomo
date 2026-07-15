import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  History,
  LibraryBig,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { PublicAeatModelReviewPageV1 } from "@/lib/fiscal-models/model-pages/public-review-catalog.v1";
import type { PublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages/official-content";
import { FiscalModelOfficialContentView } from "./FiscalModelOfficialContentView";
import { FiscalModelOfficialVisual } from "./FiscalModelOfficialVisual";
import { getFiscalModelDocumentTitle } from "./fiscal-model-document-title";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

const practicalSubtitleByCode: Readonly<Record<string, string>> = Object.freeze(
  {
    "035": "Alta, modificación y baja en OSS e IOSS",
    "040": "Registro censal de operadores de plataformas",
    "100": "Declaración anual de la Renta del autónomo",
    "111": "Retenciones de nóminas, facturas profesionales y otras rentas",
    "115": "Retenciones por el alquiler de locales y otros inmuebles urbanos",
    "117": "Retenciones sobre fondos de inversión y otras instituciones de inversión colectiva",
    "121": "Cesión de determinadas deducciones familiares por no declarantes",
    "122": "Regularización de deducciones familiares por no declarantes",
    "123": "Retenciones sobre dividendos, intereses y otras rentas del capital",
    "124": "Retenciones sobre transmisiones y amortizaciones de activos de deuda",
    "126": "Retenciones sobre rendimientos de cuentas financieras",
    "128": "Retenciones sobre capitalización y seguros de vida o invalidez",
    "130": "Pago trimestral del IRPF en estimación directa",
    "131": "Pago trimestral del IRPF para autónomos en módulos",
    "140": "Abono anticipado de la deducción por maternidad",
    "143": "Abono anticipado de deducciones familiares",
    "145": "Datos del trabajador para calcular la retención de su nómina",
    "149":
      "Opción y comunicaciones del régimen especial de personas desplazadas",
    "151": "Declaración anual del régimen especial de personas desplazadas",
    "172": "Saldos en monedas virtuales informados por custodios",
    "173": "Operaciones con monedas virtuales informadas por proveedores",
    "179": "Histórico · alquileres turísticos hasta el ejercicio 2023",
    "180": "Resumen anual de retenciones por alquileres urbanos",
    "184": "Rentas de comunidades de bienes y otras entidades",
    "187": "Resumen anual de operaciones con instituciones de inversión colectiva",
    "188": "Resumen anual de capitalización y seguros de vida o invalidez",
    "190": "Resumen anual de retenciones de nóminas y actividades económicas",
    "193": "Resumen anual de dividendos, intereses y otras rentas del capital",
    "194": "Resumen anual de operaciones sobre activos de deuda",
    "196": "Información mensual de cuentas en instituciones financieras desde 2026",
    "200": "Declaración anual del Impuesto sobre Sociedades",
    "202": "Pagos a cuenta del Impuesto sobre Sociedades",
    "210":
      "Rentas obtenidas en España por no residentes sin establecimiento permanente",
    "211": "Retención en la compra de inmuebles a personas no residentes",
    "216": "Retenciones por pagos a personas y empresas no residentes",
    "232":
      "Operaciones vinculadas y situaciones relacionadas con jurisdicciones no cooperativas",
    "233": "Gastos de guarderías y centros infantiles autorizados",
    "238": "Información anual de operadores de plataformas en el marco DAC7",
    "296": "Resumen anual de rentas pagadas a no residentes",
    "303": "Autoliquidación periódica del IVA",
    "308":
      "Devolución especial de IVA para comercio, transporte y medios de transporte nuevos",
    "309": "IVA no periódico para operaciones especiales",
    "341": "Reintegro de compensaciones del régimen especial agrario",
    "347": "Declaración anual de operaciones con clientes y proveedores",
    "349": "Operaciones con empresas y profesionales de la Unión Europea",
    "360": "Devolución del IVA soportado en otros países de la Unión Europea",
    "361":
      "Devolución del IVA español a empresarios establecidos fuera de la Unión Europea",
    "369": "Declaración del IVA de OSS e IOSS",
    "390": "Resumen anual del IVA",
    "714": "Impuesto sobre el Patrimonio",
    "718": "Impuesto Temporal de Solidaridad de las Grandes Fortunas",
    "720": "Bienes y derechos situados en el extranjero",
    "721": "Criptomonedas custodiadas en el extranjero",
    "840": "Alta, variación y baja en el Impuesto sobre Actividades Económicas",
  },
);

export function FiscalModelStructuralDetailView({
  page,
  calendarReturnHref,
  enrichedContent,
}: {
  page: PublicAeatModelReviewPageV1;
  calendarReturnHref: "/consultor-fiscal/calendario" | null;
  enrichedContent: PublicAeatOfficialModelContentV1 | null;
}) {
  const historical =
    page.lifecycleStatus === "HISTORICAL" ||
    enrichedContent?.lifecycleStatus === "HISTORICAL";
  const historicalDate = page.effectiveTo
    ? page.effectiveTo.split("-").reverse().join("/")
    : null;

  return (
    <article className="mx-auto w-full max-w-5xl space-y-6 text-slate-900 dark:text-slate-100">
      <nav aria-label="Volver" className="flex flex-wrap items-center gap-2">
        <Link
          href="/consultor-fiscal/modelos"
          className={
            "inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 " +
            focusRing
          }
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a Modelos AEAT
        </Link>
        {calendarReturnHref && (
          <Link
            href={calendarReturnHref}
            className={
              "inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 " +
              focusRing
            }
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al Calendario
          </Link>
        )}
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {enrichedContent && (
            <FiscalModelOfficialVisual
              content={enrichedContent}
              variant="detail"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl dark:text-slate-100">
              {getFiscalModelDocumentTitle(page.code)}
            </h1>
            <p className="mt-2 break-words text-base leading-7 text-slate-700 dark:text-slate-300">
              {practicalSubtitleByCode[page.code] ??
                enrichedContent?.canonicalName ??
                page.canonicalName}
            </p>
          </div>
        </div>
        {historical ? (
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-100">
            <History className="h-4 w-4" aria-hidden="true" />
            Histórico · no vigente
          </span>
        ) : !enrichedContent ? (
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {page.reviewBadge}
          </span>
        ) : null}
      </header>

      {!enrichedContent && (
        <Card
          className="border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/40"
          role="note"
          aria-labelledby="ficha-estructural-revision-title"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="ficha-estructural-revision-title"
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
      )}

      {historical && page.historicalNotice && historicalDate && (
        <Card
          className="border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
          role="alert"
          aria-labelledby="modelo-estructural-historico-title"
        >
          <div className="flex items-start gap-3">
            <History
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="modelo-estructural-historico-title"
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

      {enrichedContent && (
        <FiscalModelOfficialContentView content={enrichedContent} />
      )}

      {!enrichedContent && (
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
            Estos enlaces son referencias informativas de AEAT o BOE. Abrirlos
            no inicia ningún trámite ni envía información desde esta aplicación.
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
                </div>
                <p className="mt-3 break-words font-semibold text-slate-900 dark:text-slate-100">
                  {source.title}
                </p>
                <dl className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <dt className="font-semibold">
                      Actualización de la fuente
                    </dt>
                    <dd className="mt-0.5 break-words">
                      <time dateTime={source.sourceUpdatedOn}>
                        {source.sourceUpdatedOn}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Fecha de verificación</dt>
                    <dd className="mt-0.5 break-words">
                      {source.verifiedOn ?? "Pendiente"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Huella SHA-256</dt>
                    <dd className="mt-0.5 break-all">
                      {source.sourceSha256 ?? "Pendiente"}
                    </dd>
                  </div>
                </dl>
                <a
                  href={source.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    "mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 " +
                    focusRing
                  }
                >
                  Abrir fuente oficial informativa
                  <span className="sr-only">
                    : {source.title} (se abre en una pestaña nueva)
                  </span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!enrichedContent && (
        <Card className="border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            Trazabilidad y límites
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {page.limitations}
          </p>
          <dl className="mt-4 grid min-w-0 gap-3 text-xs text-slate-500 sm:grid-cols-2 dark:text-slate-400">
            {page.sourceRowLabel && (
              <div className="min-w-0">
                <dt className="font-semibold">Fila del índice AEAT</dt>
                <dd className="mt-1 break-words">{page.sourceRowLabel}</dd>
              </div>
            )}
            {page.sourceRowLabel && (
              <div className="min-w-0">
                <dt className="font-semibold">Identificadores de la fila</dt>
                <dd className="mt-1 break-words">
                  {page.sourceGroupCodes.join(", ")}
                </dd>
              </div>
            )}
            <div className="min-w-0">
              <dt className="font-semibold">Release de ficha</dt>
              <dd className="mt-1 break-all">{page.descriptorReleaseId}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-semibold">Release de fuente</dt>
              <dd className="mt-1 break-all">{page.sourceReleaseId}</dd>
            </div>
            {page.sourceRegistryVersion && (
              <div className="min-w-0">
                <dt className="font-semibold">Registro de fuentes</dt>
                <dd className="mt-1 break-all">{page.sourceRegistryVersion}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}
    </article>
  );
}
