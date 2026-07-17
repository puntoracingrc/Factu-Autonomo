import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(
  new URL("./FiscalCalendarView.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../../app/consultor-fiscal/calendario/page.tsx", import.meta.url),
  "utf8",
);
const navigationSource = readFileSync(
  new URL("../layout/app-navigation.ts", import.meta.url),
  "utf8",
);
const advisorNavigationSource = readFileSync(
  new URL("../consultor-fiscal/AdvisorAreaNavigation.tsx", import.meta.url),
  "utf8",
);
const descriptionViewSource = readFileSync(
  new URL(
    "../../lib/fiscal-calendar/description-obligation-view.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("contrato de interfaz del calendario fiscal", () => {
  it("incluye carga, vacío, error recuperable, filtros, rango y fuente", () => {
    for (const text of [
      "Calendario fiscal",
      "Cargando próximos vencimientos",
      "No hay vencimientos en este rango",
      "No hemos podido cargar el calendario",
      "Reintentar",
      "Categorías",
      "Desde",
      "Hasta",
      "Agencia Tributaria",
      "Última consulta",
    ]) {
      expect(componentSource).toContain(text);
    }
    expect(componentSource).toContain('aria-live="polite"');
    expect(componentSource).toContain('type="checkbox"');
    expect(componentSource).toContain('type="date"');
  });

  it("explica la fuente pública y distingue fixtures simulados", () => {
    expect(componentSource).toContain(
      "Los resultados se cargan desde los cinco calendarios iCalendar",
    );
    expect(componentSource).toContain(
      "Se conserva la fecha y el texto publicados por la fuente",
    );
    expect(componentSource).toContain("Datos simulados para revisión local");
    expect(componentSource).toContain("No son fechas oficiales");
    expect(componentSource).toContain("Tipo de plazo no clasificado");
    expect(componentSource).toContain("Revisar con gestor");
    expect(componentSource).toContain("Estado de fuente sin confirmar");
    expect(componentSource).not.toContain("Calendario público en revisión");
    expect(componentSource).not.toContain("Sin consulta externa");
  });

  it("aclara que las categorías de Renta y Sociedades son calendarios distintos", () => {
    expect(componentSource).toContain(
      "La AEAT publica «Renta», «Renta y Sociedades» y «Sociedades»",
    );
    expect(componentSource).toContain("«Renta y Sociedades» es su categoría");
    expect(componentSource).toContain("conjunta, no una repetición");
    expect(componentSource).toContain(
      'aria-describedby="fiscal-calendar-category-help"',
    );
  });

  it("retira resultados anteriores antes de cargar otra consulta", () => {
    expect(componentSource).toContain("setData(null)");
    expect(componentSource.indexOf("setData(null)")).toBeLessThan(
      componentSource.indexOf("setLoading(true)"),
    );
    const applyFiltersSource = componentSource.slice(
      componentSource.indexOf("function applyFilters"),
      componentSource.indexOf(
        "  return (",
        componentSource.indexOf("function applyFilters"),
      ),
    );
    expect(applyFiltersSource).toContain(
      "setRefreshSequence((value) => value + 1)",
    );
  });

  it("renderiza contenido externo como texto y nunca como HTML o iframe", () => {
    expect(componentSource).not.toContain("dangerouslySetInnerHTML");
    expect(componentSource).not.toContain("innerHTML");
    expect(componentSource).not.toMatch(/<iframe/i);
    expect(componentSource).toContain("<FiscalCalendarEventDescription");
    expect(componentSource).toContain("event={event}");
    expect(componentSource).toContain('role="list"');
    expect(componentSource).toContain('role="listitem"');
    expect(componentSource).toContain("break-words");
    expect(descriptionViewSource).toContain(
      "MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES = 100",
    );
    expect(descriptionViewSource).toContain(
      ".slice(0, MAX_RENDERED_FISCAL_CALENDAR_DESCRIPTION_LINES)",
    );
  });

  it("enlaza modelos solo mediante href canónicos recibidos de la API", () => {
    expect(componentSource).toContain("segmentFiscalCalendarModelReferences");
    expect(componentSource).toContain("href={segment.modelPage.href}");
    expect(componentSource).toContain(
      "localizar en el catálogo de Modelos AEAT",
    );
    expect(componentSource).toContain("histórico · no vigente");
    expect(componentSource).not.toContain("public-review-route-manifest");
    expect(componentSource).not.toMatch(/modelos\/\$\{/);
  });

  it("integra Mis obligaciones con orientación segura y conserva Todos", () => {
    expect(componentSource).toContain("buildFiscalCalendarObligationView");
    expect(componentSource).toContain(
      "normalizeFiscalAdvisoryModelPreferencesV1",
    );
    expect(componentSource).toContain('mineLabel="Mis obligaciones"');
    expect(componentSource).toContain("obligationView.mineModelCodes.size");
    expect(componentSource).toContain(
      "«Mis obligaciones» cuenta modelos únicos",
    );
    expect(componentSource).toContain(
      'groupLabel="Elegir vista del calendario"',
    );
    expect(componentSource).toContain(
      "mineDisabled={!personalizationAvailable}",
    );
    expect(componentSource).toContain("Abrir diagnóstico");
    expect(componentSource).toContain("Calendario recomendado orientativo.");
    expect(componentSource).toContain("Puede afectarte · por confirmar");
    expect(componentSource).toContain("Relacionado · por confirmar");
    expect(componentSource).toContain("orientationHighlighted");
    expect(componentSource).toContain(
      "orientationPriorityEventIds.has(event.id)",
    );
    expect(componentSource).toContain(
      "conserva siempre el calendario completo",
    );
    expect(componentSource).toContain(
      'obligationView.status === "ORIENTATIVE"',
    );
    expect(componentSource).toContain("orientationPriorityEventIds");
    expect(componentSource).toContain("relacionados destacados");
    expect(componentSource).toContain(
      "obligationView.recommendedEventIds.has(event.id)",
    );
    expect(componentSource).not.toContain("relacionados primero");
    expect(componentSource).toContain("Por confirmar");
    expect(componentSource).toContain("Coincide con tu diagnóstico");
    expect(componentSource).toContain("no aplicables ocultos");
    expect(componentSource).toContain("Ver todos");
    expect(componentSource).not.toContain("buildTaxObligationsAssessment");
    expect(componentSource).toContain(
      "buildFiscalCalendarDescriptionFilterContext",
    );
    expect(componentSource).toContain(
      "resolvableModelCodes: new Set(modelLinks.keys())",
    );
    expect(componentSource).toContain("Otros modelos publicados por la AEAT");
    expect(componentSource).toContain(
      'aria-label="Detalle visible del vencimiento"',
    );
    expect(componentSource).not.toContain(
      'aria-label="Modelos relacionados con tu selección"',
    );
    expect(componentSource).toContain("<details");
    expect(componentSource).toContain("<summary");
    expect(componentSource).not.toContain("<details open");
    expect(componentSource).toContain("group-open:hidden");
    expect(componentSource).toContain("group-open:inline");
    expect(componentSource).toContain("view.otherModelLines.map");
    expect(componentSource).not.toContain("Otros modelos no aplicables");
  });

  it("prepara un borrador revisable en Recordatorios sin guardarlo automáticamente", () => {
    const prepareReminderSource = componentSource.slice(
      componentSource.indexOf("function prepareReminder"),
      componentSource.indexOf(
        "  return (",
        componentSource.indexOf("function prepareReminder"),
      ),
    );

    expect(componentSource).toContain("createFiscalCalendarReminderDraft");
    expect(componentSource).toContain("storeFiscalCalendarReminderDraft");
    expect(componentSource).toContain("FISCAL_CALENDAR_REMINDER_TARGET_HREF");
    expect(componentSource).toContain("Crear recordatorio");
    expect(componentSource).toContain(
      "No hemos podido preparar el recordatorio",
    );
    expect(
      prepareReminderSource.indexOf("storeFiscalCalendarReminderDraft"),
    ).toBeLessThan(
      prepareReminderSource.indexOf(
        "router.push(FISCAL_CALENDAR_REMINDER_TARGET_HREF)",
      ),
    );
    expect(componentSource).not.toContain("addUserReminder");
  });

  it("valida toda la respuesta no confiable antes de entregarla al render", () => {
    expect(componentSource).toContain("parseFiscalCalendarResponseData");
    expect(componentSource).toContain(
      "const nextData = parseFiscalCalendarResponseData(body)",
    );
    expect(componentSource).not.toContain(
      "return record as FiscalCalendarResponseData",
    );
  });

  it("publica la ruta con flag propio y navegación secundaria accesible", () => {
    expect(pageSource).toContain("isFiscalCalendarEnabled()");
    expect(pageSource).not.toContain("isConsultorFiscalEnabled()");
    expect(pageSource).toContain("notFound()");
    expect(navigationSource).not.toContain("/consultor-fiscal/calendario");
    expect(advisorNavigationSource).toContain(
      'href: "/consultor-fiscal/calendario"',
    );
    expect(advisorNavigationSource).toContain(
      'href: "/consultor-fiscal/modelos"',
    );
  });

  it("usa layout responsive y estilos para claro/oscuro sin ancho fijo", () => {
    expect(componentSource).toContain("sm:grid-cols-2");
    expect(componentSource).toContain("dark:bg-slate-900");
    expect(componentSource).not.toMatch(/w-\[(?:4|5|6|7|8|9)\d{2}px\]/);
  });
});
