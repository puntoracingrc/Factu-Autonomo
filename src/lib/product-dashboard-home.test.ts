import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product dashboard home", () => {
  it("mantiene el resumen financiero colapsado y ligado a Pro", () => {
    const component = source("../components/dashboard/HomeBusinessSummary.tsx");
    const page = source("../app/page.tsx");

    expect(page).toContain("HomeBusinessSummary");
    expect(component).toContain("Resumen del negocio");
    expect(component).toContain("Cifras ocultas por defecto");
    expect(component).toContain("Mostrar resumen");
    expect(component).toContain("Ocultar resumen");
    expect(component).toContain("limits.quarterlySummary");
    expect(component).toContain("Finanzas incluidas en Pro");
    expect(component).toContain("Flujo del periodo");
    expect(component).toContain("Facturado");
    expect(component).toContain("Cobrado");
    expect(component).toContain("Pendiente");
    expect(component).toContain("Gastos");
    expect(component).toContain("Balance estimado");
    expect(component).toContain("IVA estimado");
    expect(component).toContain("Resumen por periodo");
    expect(component).toContain("Periodo:");
  });

  it("coloca las acciones rapidas antes del bloque largo de recordatorios", () => {
    const page = source("../app/page.tsx");
    const headerIndex = page.indexOf("<PageHeader");
    const remindersIndex = page.indexOf("<HomeUserReminders />");
    const actionsIndex = page.indexOf("¿Qué quieres hacer?");
    const summaryIndex = page.indexOf("<HomeBusinessSummary data={data} />");

    expect(headerIndex).toBeGreaterThan(-1);
    expect(remindersIndex).toBeGreaterThan(-1);
    expect(actionsIndex).toBeGreaterThan(headerIndex);
    expect(remindersIndex).toBeGreaterThan(actionsIndex);
    expect(summaryIndex).toBeGreaterThan(remindersIndex);
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
    expect(copy).toMatch(/No\s+sustituyen una revisión contable\s+o fiscal/);
    expect(copy).not.toMatch(
      /IVA a pagar|Modelo 303|Resultado fiscal|Declaraci[oó]n|Hacienda|AEAT|Contabilidad oficial/i,
    );
  });
});
