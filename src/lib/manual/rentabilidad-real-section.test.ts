import { describe, expect, it } from "vitest";
import {
  APP_ROUTES_WITH_MANUAL,
  RENTABILIDAD_REAL_ROUTES_WITH_MANUAL,
} from "./coverage";
import { manualHelpHref, resolveManualSlug } from "./route-help";
import { buildManualSections } from "./sections";
import { rentabilidadRealSection } from "./sections/rentabilidad-real";

const ROUTES = RENTABILIDAD_REAL_ROUTES_WITH_MANUAL;

describe("manual de Rentabilidad Real", () => {
  it("dedica un paso a cada una de las ocho rutas actuales", () => {
    const text = JSON.stringify(rentabilidadRealSection);

    expect(rentabilidadRealSection.slug).toBe("rentabilidad-real");
    expect(rentabilidadRealSection.order).toBe(15);
    expect(rentabilidadRealSection.steps).toHaveLength(ROUTES.length);
    for (const route of ROUTES) expect(text).toContain(route);
  });

  it("convive con el registro condicional del Consultor fiscal", () => {
    const withoutConsultor = buildManualSections(false);
    const withConsultor = buildManualSections(true);

    expect(
      withoutConsultor.find((section) => section.slug === "consultor-fiscal"),
    ).toBeUndefined();
    expect(
      withConsultor.find((section) => section.slug === "consultor-fiscal")
        ?.order,
    ).toBe(9.5);
    expect(
      withoutConsultor.find((section) => section.slug === "rentabilidad-real")
        ?.order,
    ).toBe(15);
    expect(
      withConsultor.find((section) => section.slug === "rentabilidad-real")
        ?.order,
    ).toBe(15);
  });

  it("mapea las ocho rutas a la sección y conserva el retorno exacto", () => {
    for (const route of ROUTES) {
      expect(APP_ROUTES_WITH_MANUAL).toContain(route);
      expect(resolveManualSlug(route)).toBe("rentabilidad-real");
      expect(manualHelpHref(route)).toBe(
        `/ayuda/rentabilidad-real?from=${encodeURIComponent(route)}`,
      );
    }

    expect(resolveManualSlug("/rentabilidad-realidad")).toBeNull();
    expect(resolveManualSlug("/rentabilidad-realidad/informes")).toBeNull();
  });

  it("documenta controles, estados vacíos y trazabilidad", () => {
    const text = JSON.stringify(rentabilidadRealSection);

    for (const control of [
      "Hacer test guiado",
      "Restablecer configuración",
      "Copiar resumen para mi gestor",
      "Modo de análisis",
      "Gastos del trabajo",
      "Ajustes internos no fiscales",
      "Horas reales trabajadas",
      "Trabajo/obra",
      "Informe por documento",
      "Calidad de datos",
      "Limpiar filtros",
      "Ver todo",
      "La cuota ya está incluida",
    ]) {
      expect(text).toContain(control);
    }

    expect(text).toContain("Si no existe ningún presupuesto o factura");
    expect(text).toContain("Si el filtro no encuentra filas");
    expect(text).toContain("la ausencia de filas");
    expect(text).toContain("exclusiones de líneas");
    expect(text).toContain("se gestiona desde Facturas");
    expect(text).toContain("elimina únicamente las fechas Desde/Hasta");
  });

  it("separa análisis interno de fiscalidad e integridad documental", () => {
    const text = JSON.stringify(rentabilidadRealSection);

    expect(text).toContain("no sustituyen la contabilidad");
    expect(text).toContain("no implica deducibilidad fiscal automática");
    expect(text).toContain("no cambian el PDF");
    expect(text).toContain("ni VeriFactu");
    expect(text).toContain("no el impuesto definitivo");
    expect(text).toContain("no se exportan como contabilidad");
  });
});
