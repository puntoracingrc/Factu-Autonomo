import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  History,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  FiscalModelCatalogBrowser,
  FiscalModelManualSelectionAction,
} from "./FiscalModelCatalogBrowser";
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
import { getFiscalModelDocumentTitle } from "./fiscal-model-document-title";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

const practicalCatalogLabels: Readonly<
  Partial<Record<string, readonly string[]>>
> = {
  "035": [
    "Comercio electrónico",
    "OSS e IOSS",
    "Registro censal",
    "Operaciones B2C",
  ],
  "100": [
    "Esencial para autónomos",
    "Anual",
    "IRPF",
    "Obligatoria para altas en RETA",
  ],
  "111": ["Frecuente si pagas retenciones", "Trimestral o mensual", "IRPF"],
  "115": ["Si alquilas un local", "Trimestral o mensual", "Retenciones"],
  "121": ["Deducciones familiares", "Cesión del derecho", "Solo no declarantes", "Caso excepcional"],
  "122": ["Deducciones familiares", "Regularización", "Solo no declarantes", "Resultado a ingresar"],
  "123": [
    "Dividendos e intereses",
    "Trimestral o mensual",
    "Retenciones",
    "Frecuente en sociedades",
  ],
  "130": [
    "Frecuente para autónomos",
    "IRPF",
    "Trimestral",
    "Estimación directa",
  ],
  "131": ["Solo módulos", "IRPF", "Trimestral", "Revisión anual"],
  "140": ["Deducción por maternidad", "Abono anticipado", "IRPF", "Hijos menores de 3 años"],
  "143": ["Deducciones familiares", "Abono anticipado", "IRPF", "Familia y discapacidad"],
  "145": [
    "Si tienes empleados",
    "Nóminas",
    "No se presenta a la AEAT",
    "Datos del trabajador",
  ],
  "180": ["Anual", "Relacionado con 115", "Declaración informativa"],
  "184": [
    "Comunidades de bienes",
    "Declaración informativa",
    "Anual",
    "Relacionado con Renta",
  ],
  "190": ["Anual", "Relacionado con 111", "Declaración informativa"],
  "193": [
    "Anual",
    "Declaración informativa",
    "Relacionado con 123",
    "Rentas del capital",
  ],
  "200": [
    "Autónomo societario y empresas",
    "Anual",
    "Impuesto sobre Sociedades",
  ],
  "202": [
    "Autónomo societario y empresas",
    "Abril, octubre y diciembre",
    "Pago a cuenta",
  ],
  "216": [
    "Pagos a no residentes",
    "IRNR",
    "Trimestral o mensual",
    "Solo si existe obligación de retener",
  ],
  "232": [
    "Autónomo societario y empresas",
    "Operaciones vinculadas",
    "Informativa",
    "Anual",
  ],
  "296": ["Anual", "No residentes", "Informativa", "Relacionado con 216"],
  "303": ["Frecuente para autónomos", "IVA", "Trimestral o mensual"],
  "308": [
    "IVA sectorial",
    "Caso especial de IVA",
    "Comercio y transporte",
    "Solicitud de devolución",
    "No periódico",
  ],
  "309": [
    "Caso especial de IVA",
    "No periódico",
    "Operaciones intracomunitarias",
    "Solo si se produce el supuesto",
  ],
  "341": [
    "IVA sectorial",
    "Agricultura, ganadería y pesca",
    "REAGP",
    "Solicitud de reintegro",
    "Trimestral",
  ],
  "347": [
    "Anual",
    "Declaración informativa",
    "Clientes y proveedores",
    "Solo si superas el límite",
  ],
  "349": [
    "Unión Europea",
    "Mensual o trimestral",
    "Declaración informativa",
    "Sin importe mínimo",
  ],
  "360": [
    "IVA extranjero",
    "Unión Europea",
    "Devolución",
    "Fecha límite anual",
  ],
  "361": ["Internacional", "No establecido", "IVA español", "Avanzado"],
  "369": [
    "Comercio electrónico",
    "IVA europeo",
    "Trimestral o mensual",
    "OSS e IOSS",
  ],
  "390": ["Anual", "IVA", "Puede estar exonerado"],
  "714": [
    "Patrimonio y activos internacionales",
    "Patrimonio personal",
    "Anual",
    "Reglas autonómicas",
    "Solo si existe obligación",
  ],
  "718": [
    "Patrimonio y activos internacionales",
    "Grandes fortunas",
    "Patrimonio personal",
    "Julio",
    "Avanzado",
  ],
  "720": [
    "Patrimonio y activos internacionales",
    "Bienes en el extranjero",
    "Declaración informativa",
    "Enero a marzo",
    "Solo si se superan límites",
  ],
  "721": [
    "Patrimonio y activos internacionales",
    "Criptomonedas",
    "Custodia extranjera",
    "Declaración informativa",
    "Enero a marzo",
  ],
  "840": [
    "Normalmente no para autónomos",
    "IAE",
    "Empresas no exentas",
    "Cifra de negocios ≥ 1 millón",
  ],
};

const practicalCatalogSummaries: Readonly<Partial<Record<string, string>>> = {
  "308":
    "Solicitud especial de devolución de IVA para determinados comercios en recargo de equivalencia, transportistas en régimen simplificado y ventas ocasionales de medios de transporte nuevos.",
  "341":
    "Solicitud trimestral del reintegro de compensaciones del régimen especial agrario en determinadas operaciones exteriores.",
  "121":
    "Comunicación excepcional de la cesión de determinadas deducciones familiares por una persona no obligada a presentar Renta.",
  "122":
    "Regularización de abonos anticipados familiares cobrados en exceso por una persona no obligada a presentar Renta.",
  "123":
    "Ingreso periódico de determinadas retenciones sobre dividendos, intereses y otras rentas del capital.",
  "145":
    "Datos personales y familiares del trabajador para calcular la retención de su nómina. Se entrega al pagador.",
  "140":
    "Solicitud del abono anticipado de la deducción por maternidad y comunicación de variaciones.",
  "143":
    "Solicitud del abono anticipado de deducciones por familia numerosa y determinadas circunstancias familiares o de discapacidad.",
  "193":
    "Resumen anual de determinadas rentas y retenciones declaradas mediante el Modelo 123.",
  "714":
    "Declaración del Impuesto sobre el Patrimonio cuando existe cuota o se supera el límite bruto establecido.",
  "718":
    "Impuesto estatal complementario del Patrimonio para determinados patrimonios netos elevados.",
  "720":
    "Declaración informativa sobre determinadas cuentas, inversiones, seguros e inmuebles situados en el extranjero.",
  "721":
    "Declaración informativa sobre criptomonedas custodiadas por determinados proveedores situados en el extranjero.",
};

export function FiscalModelCatalogView({
  result,
  pages,
  calendarContext,
  officialContents,
}: {
  result: Extract<
    PublicAeatModelReviewSearchResultV2,
    { status: "REVIEW_ONLY" }
  >;
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
              ...(practicalCatalogLabels[page.code] ?? []),
              content.canonicalName,
              content.summary,
              practicalCatalogSummaries[page.code] ?? "",
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
          Consulta fichas informativas basadas en fuentes oficiales de la AEAT y
          el BOE.
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
      >
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
            No encontramos fichas que coincidan con esta vista o búsqueda.
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
            const officialContent =
              officialContentByCode.get(page.code) ?? null;
            const historical =
              page.lifecycleStatus === "HISTORICAL" ||
              officialContent?.lifecycleStatus === "HISTORICAL";
            const practicalLabels = practicalCatalogLabels[page.code] ?? [];
            return (
              <Card
                key={page.code}
                id={page.catalogCardId}
                data-fiscal-model-card="true"
                data-fiscal-model-code={page.code}
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
                      {getFiscalModelDocumentTitle(page.code)}
                    </h3>
                    <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                      {officialContent?.canonicalName ?? page.canonicalName}
                    </p>
                    {officialContent && practicalLabels.length > 0 ? (
                      <>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {practicalCatalogSummaries[page.code] ??
                            officialContent.summary}
                        </p>
                        <ul
                          className="mt-3 flex flex-wrap gap-2"
                          aria-label={`Características de ${getFiscalModelDocumentTitle(page.code)}`}
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
                <FiscalModelManualSelectionAction modelCode={page.code} />
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
                  <span className="sr-only">
                    {" "}
                    de {getFiscalModelDocumentTitle(page.code)}
                  </span>
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
      </FiscalModelCatalogBrowser>
    </div>
  );
}
