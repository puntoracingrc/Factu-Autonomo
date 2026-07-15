import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatOfficialModelContentV1,
  resolvePublicAeatModelReviewPageV1,
  searchPublicAeatModelReviewPagesV2,
} from "@/lib/fiscal-models/model-pages";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("fiscal model structural review pages UI contract", () => {
  it("renders instant accessible local search and all deployed review links", () => {
    const pages = listPublicAeatModelReviewPagesV1();
    expect(pages.status).toBe("REVIEW_ONLY");
    if (pages.status !== "REVIEW_ONLY") return;
    const result = searchPublicAeatModelReviewPagesV2({});
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status === "REVIEW_ONLY") {
      expect(result.data).toHaveLength(229);
      expect(result.data.map((page) => page.code)).toEqual(
        expect.arrayContaining([
          "01",
          "01C",
          "036",
          "037",
          "130",
          "349",
          "A22",
        ]),
      );
      expect(
        result.data.every((page) => page.href === page.reviewPagePath),
      ).toBe(true);
    }
    const catalog = source("./FiscalModelCatalogView.tsx");
    const browser = source("./FiscalModelCatalogBrowser.tsx");

    expect(browser).toContain('role="search"');
    expect(browser).toContain('aria-labelledby="buscar-modelo-title"');
    expect(browser).toContain('name="modelo"');
    expect(browser).toContain('type="search"');
    expect(browser).toContain("maxLength={80}");
    expect(browser).toContain("onChange={(event) => setQuery");
    expect(browser).toContain("Código, nombre o concepto");
    expect(browser).toContain("IVA, retenciones o");
    expect(browser).toContain("El filtro es local");
    expect(browser).not.toContain("pattern=");
    expect(browser).not.toContain("autoCapitalize=");
    expect(browser).not.toContain(">Buscar<");
    expect(browser).toContain('mineLabel="Mis modelos"');
    expect(browser).toContain("personalization.manualModelCodes.length");
    expect(browser).toContain('href="/consultor-fiscal/diagnostico"');
    expect(browser).toContain("personalization.status === \"ALL_ONLY\"");
    expect(browser).toContain("Organiza las fichas sin modificar ni confirmar");
    expect(catalog).toContain("Algunas fichas siguen en preparación");
    expect(catalog).toContain("Revisión pendiente");
    expect(catalog).not.toContain("Ficha estructural");
    expect(catalog).not.toContain("Ficha desplegada · contenido en revisión");
    expect(catalog).not.toContain("Abrir ficha en revisión");
    expect(catalog).toContain("href={detailHref}");
    expect(catalog).toContain("Ver ficha");
    expect(catalog).toContain("getFiscalModelDocumentTitle(page.code)");
    expect(catalog).toContain("FiscalModelManualSelectionAction");
    expect(catalog).toContain("data-fiscal-model-code={page.code}");
    expect(catalog + browser).not.toMatch(/\b(?:AVAILABLE|CURRENT|APPROVED)\b/);
  });

  it("renders helpful no-match and bounded invalid-search states", () => {
    const pages = listPublicAeatModelReviewPagesV1();
    expect(pages.status).toBe("REVIEW_ONLY");
    if (pages.status !== "REVIEW_ONLY") return;
    const missing = searchPublicAeatModelReviewPagesV2({ modelo: "999" });
    expect(missing).toMatchObject({
      status: "REVIEW_ONLY",
      match: "NO_MATCH",
      data: [],
    });
    const catalog = source("./FiscalModelCatalogView.tsx");
    const browser = source("./FiscalModelCatalogBrowser.tsx");
    expect(catalog).toContain(
      "No encontramos fichas que coincidan con esta vista o búsqueda.",
    );
    expect(catalog).toContain(
      "Prueba con un código, un impuesto o una palabra del nombre oficial.",
    );

    const invalid = searchPublicAeatModelReviewPagesV2({ modelo: "036 " });
    expect(invalid).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(browser).toContain("Escribe hasta 80 caracteres");
    expect(browser).toContain("usa un solo código de modelo");
    expect(browser).toContain("aria-invalid={blocked}");
    expect(browser).toContain("aria-errormessage=");
    expect(browser).toContain('blocked ? "buscar-modelo-error" : undefined');
    expect(browser).toContain('id="buscar-modelo-error"');
  });

  it("finds completed models by concepts, descriptions and FAQ content", () => {
    const cases = [
      ["contratistas", ["01C"]],
      ["movilidad reducida", ["04"]],
      ["operadores de plataforma", ["040"]],
      ["grupo de entidades", ["039"]],
      ["domicilio fiscal", ["030"]],
      ["activos financieros valores mobiliarios", ["198"]],
      ["pago fraccionado sociedades", ["202"]],
      ["retencion adquisicion inmuebles", ["211"]],
      ["gravamen especial bienes inmuebles", ["213"]],
      ["consolidacion fiscal ingreso devolucion", ["220"]],
      ["informacion pais por pais CBC DAC4", ["231"]],
      ["gastos guarderias educacion infantil", ["233"]],
      ["operaciones asimiladas importaciones", ["380"]],
      ["resumen anual IVA", ["390"]],
      ["servicios digitales interfaz digital", ["490"]],
      ["solicitud autorizacion productos union europea", ["504"]],
      ["devolución introducción depósito fiscal", ["506"]],
      ["devolución envíos garantizados", ["507"]],
      ["devolución ventas distancia", ["508"]],
      ["operaciones recepción resto UE", ["510"]],
      ["destinatarios productos tarifa segunda", ["512"]],
      ["marcas fiscales labores tabaco", ["515"]],
      ["marcas fiscales alcohol bebidas derivadas", ["517"]],
      ["declaración trabajo alcohol", ["518"]],
      ["incidencias operaciones trabajo", ["519"]],
      ["resultado operaciones trabajo", ["520"]],
      ["primeras materias entregadas", ["521"]],
      ["productos artículo 108 ter", ["522"]],
      ["beneficio devolución aromas", ["523"]],
      ["solicitud devolución alcohol bebidas alcohólicas", ["524"]],
      ["cheque tarjetas gasóleo bonificado", ["544"]],
      ["carburantes relaciones internacionales hidrocarburos", ["545"]],
      ["avituallamiento embarcaciones SIANE", ["546"]],
      ["abonos detallistas gasóleo bonificado", ["547"]],
      ["cuotas repercutidas declaración informativa", ["548"]],
      ["fábricas depósitos vino bebidas fermentadas", ["553"]],
      ["destilación artesanal cosechero", ["559"]],
      ["electricidad fichero auxiliar desglose", ["560"]],
      ["impuesto cerveza", ["561"]],
      ["productos intermedios", ["562"]],
      ["alcohol bebidas derivadas", ["563"]],
      ["labores tabaco", ["566"]],
      ["reventa medios transporte lotes", ["568"]],
      ["beneficio devolución hidrocarburos", ["571"]],
      ["solicitud devolución hidrocarburos", ["572"]],
      ["cigarrillos electrónicos bolsas nicotina", ["573"]],
      ["determinados medios transporte autoliquidación", ["576"]],
      ["hidrocarburos declaración liquidación", ["581"]],
      ["reexpedición comunidad autónoma", ["582"]],
      ["producción energía eléctrica pagos fraccionados", ["583"]],
      ["combustible nuclear gastado nucleoeléctrica", ["584"]],
      ["almacenamiento combustible nuclear centralizadas", ["585"]],
      ["declaración informativa gases fluorados", ["586"]],
      ["gases fluorados efecto invernadero", ["587"]],
      ["cese actividad enero octubre energía eléctrica", ["588"]],
      ["extracción gas petróleo condensación", ["589"]],
      ["devolución exportación expedición", ["590"]],
      ["declaración anual operaciones energía eléctrica", ["591"]],
      ["envases plástico no reutilizables", ["592"]],
      ["depósito residuos vertederos incineración", ["593"]],
      ["impuesto carbón", ["595"]],
      ["declaración anual operaciones carbón", ["596"]],
      [
        "transmisiones patrimoniales actos jurídicos documentados",
        ["600", "610", "615", "620", "630"],
      ],
      ["tasa gestión administrativa juego", ["602"]],
      ["impuesto transacciones financieras", ["604"]],
      ["sucesiones mortis causa", ["650"]],
      ["divergencia apartado 3 4", ["682"]],
      ["solidaridad grandes fortunas", ["718"]],
      ["bienes derechos extranjero", ["720"]],
      ["monedas virtuales extranjero", ["721"]],
      ["empleo público oposiciones", ["791"]],
      ["modelo histórico 797", ["797"]],
      ["pago anticipado entidades de credito", ["798"]],
      ["alta variacion baja IAE", ["840"]],
      ["importe neto cifra negocios IAE", ["848"]],
      ["certificado eficiencia energetica", ["901"]],
      ["guarderias centros autorizados", ["933"]],
      ["base imponible credito incobrable", ["952"]],
      ["intereses demora comunidades autonomas", ["980"]],
      ["prestacion maternidad paternidad", ["981"]],
      ["familias numerosas discapacidad", ["990"]],
      ["fianzas arrendamiento inmuebles", ["991"]],
      ["tributos cedidos juego", ["992"]],
      ["control deducciones autonomicas", ["993"]],
      ["informacion urbanistica entidades locales", ["995"]],
      ["embargo devoluciones AEAT", ["996"]],
      ["embargo pagos presupuestarios", ["997"]],
      ["devolucion envases plastico", ["A22"]],
      ["devolucion gases fluorados", ["A23"]],
      ["liquidos cigarrillos electronicos", ["A24"]],
    ] as const;
    for (const [query, expectedCodes] of cases) {
      const result = searchPublicAeatModelReviewPagesV2({ modelo: query });
      expect(result.status, query).toBe("REVIEW_ONLY");
      if (result.status !== "REVIEW_ONLY") continue;
      expect(result.data.map((page) => page.code)).toEqual(
        expect.arrayContaining([...expectedCodes]),
      );
    }
  });

  it("renders 037 as historical and every other structural page as undetermined", () => {
    const historical = resolvePublicAeatModelReviewPageV1({ code: "037" });
    const structural = resolvePublicAeatModelReviewPageV1({ code: "130" });
    const officialHistorical = resolvePublicAeatOfficialModelContentV1({
      code: "150",
    });
    const batch17Historical = resolvePublicAeatOfficialModelContentV1({
      code: "795",
    });
    const officialModel037 = resolvePublicAeatOfficialModelContentV1({
      code: "037",
    });
    expect(historical.status).toBe("REVIEW_ONLY");
    expect(structural.status).toBe("REVIEW_ONLY");
    if (
      historical.status !== "REVIEW_ONLY" ||
      structural.status !== "REVIEW_ONLY"
    ) {
      return;
    }
    const catalog = source("./FiscalModelCatalogView.tsx");
    const detail = source("./FiscalModelStructuralDetailView.tsx");

    expect(historical.data.historicalNotice).toContain("no vigente");
    expect(historical.data.effectiveTo).toBe("2025-02-02");
    expect(historical.data.lifecycleStatus).toBe("HISTORICAL");
    expect(historical.data.reviewMessage).not.toContain("vigencia");
    expect(structural.data.lifecycleStatus).toBe("UNDETERMINED");
    expect(structural.data.validityStatus).toBe("SOURCE_PENDING");
    expect(officialHistorical).toMatchObject({
      status: "OFFICIAL_INFORMATION",
      data: { code: "150", lifecycleStatus: "HISTORICAL" },
    });
    expect(officialModel037).toMatchObject({
      status: "OFFICIAL_INFORMATION",
      data: { code: "037", lifecycleStatus: "HISTORICAL" },
    });
    expect(batch17Historical).toMatchObject({
      status: "OFFICIAL_INFORMATION",
      data: { code: "795", lifecycleStatus: "HISTORICAL" },
    });
    expect(catalog).toContain(
      'officialContent?.lifecycleStatus === "HISTORICAL"',
    );
    expect(detail).toContain(
      'enrichedContent?.lifecycleStatus === "HISTORICAL"',
    );
    expect(detail).toContain("Histórico · no vigente");
    expect(detail).toContain('page.effectiveTo.split("-").reverse().join("/")');
    expect(detail).toContain("Fuentes oficiales registradas");
    expect(detail).toContain("Trazabilidad y límites");
    expect(detail).not.toContain("Ficha estructural");
    expect(detail).not.toContain("Estado registrado");
    expect(detail).not.toContain("Revisión fiscal pendiente");
    expect(detail).not.toContain(
      "Aplicabilidad detallada: pendiente de revisión",
    );
    expect(historical.data.limitations).toContain(
      "No contiene casillas, importes, plazos ni recomendaciones",
    );
    expect(detail).not.toMatch(/sustituid[oa]|reemplazad[oa]/i);
  });

  it("renders the official-content batch with visible FAQ and no review alerts on completed details", () => {
    const catalog = source("./FiscalModelCatalogView.tsx");
    const detail = source("./FiscalModelStructuralDetailView.tsx");
    const official = source("./FiscalModelOfficialContentView.tsx");
    const officialVisual = source("./FiscalModelOfficialVisual.tsx");
    const officialVisualPolicy = source("./fiscal-model-official-visual.ts");
    const model01 = source(
      "../../lib/fiscal-models/model-pages/official-content/model-01.release.v1.ts",
    );

    expect(catalog).toContain("officialContentByCode");
    expect(catalog).toContain("FiscalModelOfficialVisual");
    expect(catalog).toContain("content.searchTerms");
    expect(catalog).toContain("content.summary");
    expect(catalog).toContain("content.faq.flatMap");
    expect(catalog).toContain("createPublicAeatModelSearchEntryWithTermsV2");
    expect(officialVisual).toContain('alt={compact ? ""');
    expect(detail).toContain("FiscalModelOfficialVisual");
    expect(officialVisual).toContain("content.thumbnail.publicHref");
    expect(officialVisual).toContain("content.thumbnail.alt");
    expect(officialVisualPolicy).toContain('link.category !== "PROCEDURE"');
    expect(officialVisualPolicy).toContain('source.kind === "PROCEDURE_HOME"');
    expect(officialVisualPolicy).toContain(
      'source.kind === "PROCEDURE_RECORD"',
    );
    expect(officialVisual).toContain(
      "Información del procedimiento en la sede electrónica de la AEAT",
    );
    expect(officialVisual).toContain("Procedimiento AEAT");
    expect(officialVisual).toContain("Información oficial de la AEAT");
    expect(officialVisual).toContain("Formulario web descrito por la AEAT");
    expect(officialVisual).toContain("Carga de fichero descrita por la AEAT");
    expect(officialVisual).toContain("Servicio web descrito por la AEAT");
    expect(officialVisual).toContain(
      "Formulario web y servicio web descritos por la AEAT",
    );
    expect(officialVisual).toContain(
      "Carga de fichero y servicio web descritos por la AEAT",
    );
    expect(officialVisual).toContain("Fichero y servicio");
    expect(officialVisual).toContain(
      "Formulario web, carga de fichero y servicio web descritos por la AEAT",
    );
    expect(officialVisual).toContain(
      "Transferencia administrativa descrita por la AEAT",
    );
    expect(officialVisual).toContain("Canal futuro descrito por la AEAT");
    expect(officialVisual).toContain("Procedimiento histórico de la AEAT");
    expect(officialVisual).toContain('role="img"');
    expect(officialVisual).toContain("aria-label={visualCopy.accessibleLabel}");
    expect(officialVisual).not.toContain("href=");
    expect(officialVisual).not.toMatch(/\bfetch\s*\(/);
    expect(detail).toContain("FiscalModelOfficialContentView");
    expect(detail).toContain("!enrichedContent");
    expect(detail).toContain("practicalSubtitleByCode[page.code]");
    expect(detail).toContain("enrichedContent?.canonicalName ??");
    expect(detail).toContain("page.canonicalName");
    expect(official).toContain("Documentos oficiales");
    expect(official).toContain("Información, ayuda y procedimiento");
    expect(official).toContain("Preguntas frecuentes");
    expect(model01).toContain("Preguntas frecuentes");
    expect(official).toContain("Normativa");
    expect(official).toContain("Abrir Mi área personal de la AEAT");
    expect(official).toContain('target="_blank"');
    expect(official).toContain('rel="noopener noreferrer"');
    expect(official).toContain("inicia ningún trámite");
    expect(official).toContain("No se");
    expect(official).not.toMatch(/>\s*(?:Presentar|Firmar|Pagar|Enviar)\s*</i);
    expect(official).not.toMatch(/<(?:iframe|embed|object|form)\b/i);
    expect(official).not.toContain("Pendiente de revisión");
    expect(model01).toContain('contentStatus: "OFFICIAL_INFORMATION"');
    expect(model01).toContain('applicabilityStatus: "NOT_EVALUATED"');
    expect(model01).not.toMatch(/\b(?:AVAILABLE|CURRENT|APPROVED)\b/);
  });

  it("renders only safe official references and no filing action", () => {
    const result = resolvePublicAeatModelReviewPageV1({ code: "303" });
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;
    const detail = source("./FiscalModelStructuralDetailView.tsx");

    expect(result.data.sources.length).toBeGreaterThan(0);
    expect(detail).toContain("href={source.canonicalUrl}");
    expect(detail).toContain('rel="noopener noreferrer"');
    expect(detail).toContain("Abrir fuente oficial informativa");
    expect(detail).toContain(": {source.title}");
    expect(detail).toContain("se abre en una pestaña nueva");
    expect(detail).toContain("inicia ningún trámite");
    expect(detail).not.toMatch(/>\s*(?:Presentar|Firmar|Pagar|Enviar)\s*</i);
  });

  it("keeps mobile, dark-mode, keyboard, and screen-reader safeguards explicit", () => {
    const catalog = source("./FiscalModelCatalogView.tsx");
    const browser = source("./FiscalModelCatalogBrowser.tsx");
    const detail = source("./FiscalModelStructuralDetailView.tsx");
    const ui = catalog + "\n" + browser + "\n" + detail;

    expect(ui).toContain("min-w-0");
    expect(ui).toContain("break-words");
    expect(ui).toContain("sm:flex-row");
    expect(ui).toContain("dark:");
    expect(ui).toContain("focus-visible:outline");
    expect(ui).toContain('aria-live="polite"');
    expect(ui).toContain('role="alert"');
    expect(ui).toContain('aria-hidden="true"');
  });

  it("uses only canonical Calendar focus and fixed return contracts", () => {
    const catalog = source("./FiscalModelCatalogView.tsx");
    const browser = source("./FiscalModelCatalogBrowser.tsx");
    const detail = source("./FiscalModelStructuralDetailView.tsx");
    const searchCore = source(
      "../../lib/fiscal-models/model-pages/public-review-search.v2.ts",
    );

    expect(catalog).toContain("calendarNavigation!.detailHref");
    expect(catalog).toContain("calendarNavigation!.returnHref");
    expect(catalog).toContain("Volver al Calendario");
    expect(catalog).toContain("id={page.catalogCardId}");
    expect(catalog).toContain('data-fiscal-model-card="true"');
    expect(browser).toContain("currentHash: window.location.hash");
    expect(browser).toContain("card.scrollIntoView({");
    expect(browser).toContain('"(prefers-reduced-motion: reduce)"');
    expect(searchCore).toContain("scrollBehavior: reduceMotion ?");
    expect(browser).toContain("behavior: presentation.scrollBehavior");
    expect(browser).toContain("card.focus({ preventScroll: true })");
    expect(browser).toContain(
      'card.setAttribute("aria-current", presentation.ariaCurrent)',
    );
    expect(detail).toContain("calendarReturnHref");
    expect(detail).toContain("Volver al Calendario");
    expect(catalog + browser + detail).not.toContain("returnTo");
  });

  it("uses Next 15 static params and exact fail-closed routing", () => {
    const catalog = listPublicAeatModelReviewPagesV1();
    expect(catalog.status).toBe("REVIEW_ONLY");
    if (catalog.status === "REVIEW_ONLY")
      expect(catalog.data).toHaveLength(229);

    const indexPage = source("../../app/consultor-fiscal/modelos/page.tsx");
    const detailPage = source(
      "../../app/consultor-fiscal/modelos/[codigo]/page.tsx",
    );

    expect(indexPage).toContain("await searchParams");
    expect(indexPage).toContain("searchPublicAeatModelReviewPagesV2");
    expect(indexPage).toContain(
      "resolvePublicAeatModelCalendarCatalogContextV1",
    );
    expect(indexPage).toContain("notFound()");
    expect(indexPage).toContain("index: true");

    expect(detailPage).toContain("params: Promise<{ codigo: string }>");
    expect(detailPage).toContain("export const dynamicParams = false");
    expect(detailPage).toContain("generateStaticParams");
    expect(detailPage).toContain("listPublicAeatModelReviewPagesV1");
    expect(detailPage).toContain("resolvePublicAeatModelReviewPageV1");
    expect(detailPage).toContain(
      "resolvePublicAeatModelCalendarDetailContextV1",
    );
    expect(detailPage).toContain("catalog.data.length !== 229");
    expect(detailPage).toContain('if (result.status === "BLOCKED") notFound()');
    expect(detailPage).not.toMatch(/\/modelos\/\$\{/);
  });

  it("keeps the production surface isolated from data, engines, and runtime network", () => {
    const production = [
      source(
        "../../lib/fiscal-models/model-pages/public-review-route-manifest.v1.ts",
      ),
      source("../../lib/fiscal-models/model-pages/public-review-catalog.v1.ts"),
      source("../../lib/fiscal-models/model-pages/public-review-search.v2.ts"),
      source(
        "../../lib/fiscal-models/model-pages/official-content/resolver.v1.ts",
      ),
      source("./FiscalModelCatalogView.tsx"),
      source("./FiscalModelCatalogBrowser.tsx"),
      source("./FiscalModelStructuralDetailView.tsx"),
      source("./FiscalModelOfficialContentView.tsx"),
      source("../../app/consultor-fiscal/modelos/page.tsx"),
      source("../../app/consultor-fiscal/modelos/[codigo]/page.tsx"),
    ].join("\n");

    expect(production).not.toMatch(/\bfetch\s*\(|Date\.now|process\.env/);
    expect(production).not.toMatch(
      /localStorage|sessionStorage|supabase|stripe|openai|anthropic/i,
    );
    expect(production).not.toMatch(/fiscal-notifications|tax-engine|taxes\.ts/i);
    const fiscalModelCore = [
      source(
        "../../lib/fiscal-models/model-pages/public-review-route-manifest.v1.ts",
      ),
      source("../../lib/fiscal-models/model-pages/public-review-catalog.v1.ts"),
      source("../../lib/fiscal-models/model-pages/public-review-search.v2.ts"),
    ].join("\n");
    expect(fiscalModelCore).not.toMatch(/AppStore|BusinessProfile/);
    expect(source("./FiscalModelCatalogBrowser.tsx")).toContain(
      'import { useAppStore } from "@/context/AppStore"',
    );
    expect(production).not.toMatch(/from\s+["'][^"']*fiscal-calendar/i);
    expect(production).not.toMatch(/tenantId|userId|BusinessProfile/);
    expect(production).not.toMatch(
      /dangerouslySetInnerHTML|<iframe|<embed|<object|\bXMLHttpRequest\b|\baxios\b/,
    );
    expect(production).not.toMatch(/from\s+["']node:fs["']/);
  });
});
