import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product dashboard home", () => {
  it("muestra las cards principales del resumen de negocio", () => {
    const component = source("../components/dashboard/HomeBusinessSummary.tsx");
    const page = source("../app/page.tsx");

    expect(page).toContain("HomeBusinessSummary");
    expect(component).toContain("Resumen del negocio");
    expect(component).toContain("Facturado");
    expect(component).toContain("Cobrado");
    expect(component).toContain("Pendiente");
    expect(component).toContain("Gastos");
    expect(component).toContain("Balance estimado");
    expect(component).toContain("IVA estimado");
  });

  it("mantiene acciones rapidas utiles desde inicio", () => {
    const page = source("../app/page.tsx");

    expect(page).toContain("Nuevo cliente");
    expect(page).toContain("Nueva factura");
    expect(page).toContain("Nuevo presupuesto");
    expect(page).toContain("Añadir gasto");
    expect(page).toContain("Configuración");
    expect(page).toContain("Exportar copia");
  });

  it("incluye copy prudente sin claims prohibidos", () => {
    const component = source("../components/dashboard/HomeBusinessSummary.tsx");
    const page = source("../app/page.tsx");
    const copy = `${component}\n${page}`;

    expect(copy).toContain("guardada en este navegador");
    expect(copy).toMatch(/No\s+sustituyen una revisión contable o fiscal/);
    expect(copy).not.toMatch(
      /IVA a pagar|Modelo 303|Resultado fiscal|Declaraci[oó]n|Hacienda|AEAT|Contabilidad oficial/i,
    );
  });
});
