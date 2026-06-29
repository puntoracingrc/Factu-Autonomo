import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product dashboard home", () => {
  it("mantiene el resumen financiero colapsado y ligado a Pro", () => {
    const component = source("../components/dashboard/HomeBusinessSummary.tsx");
    const page = source("../app/page.tsx");
    const periodSelectorIndex = component.indexOf("<PeriodSelector");
    const flowChartIndex = component.indexOf("<BusinessFlowChart");

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
    expect(periodSelectorIndex).toBeGreaterThan(-1);
    expect(flowChartIndex).toBeGreaterThan(-1);
    expect(periodSelectorIndex).toBeLessThan(flowChartIndex);
    expect(component).toContain("compactPeriodSelectClass");
    expect(component).toContain("Periodo:");
    expect(component).toContain("<option value=\"month\">Mes</option>");
    expect(component).toContain("<option value=\"quarter\">Trimestre</option>");
    expect(component).toContain("<option value=\"year\">Año</option>");
    expect(component).not.toContain("<option value=\"month\">Este mes</option>");
    expect(component).not.toContain("<option value=\"quarter\">Este trimestre</option>");
    expect(component).not.toContain("<option value=\"year\">Este año</option>");
  });

  it("coloca recordatorios antes de accesos rapidos sin encabezados redundantes", () => {
    const page = source("../app/page.tsx");
    const reminders = source("../components/reminders/HomeUserReminders.tsx");
    const remindersIndex = page.indexOf("<HomeUserReminders />");
    const actionsIndex = page.indexOf("quickActions.map");
    const summaryIndex = page.indexOf("<HomeBusinessSummary data={data} />");

    expect(remindersIndex).toBeGreaterThan(-1);
    expect(actionsIndex).toBeGreaterThan(remindersIndex);
    expect(summaryIndex).toBeGreaterThan(actionsIndex);
    expect(page).not.toContain("¿Qué quieres hacer?");
    expect(page).not.toContain("Accesos rápidos a lo que más usas");
    expect(reminders).not.toContain("SendToOfficeForm");
    expect(reminders).toContain('href="/avisos"');
    expect(reminders).toContain("if (pending.length === 0) return null");
    expect(reminders).not.toContain("Apunta instrucciones para la oficina");
    expect(reminders).not.toContain("Crear recordatorio");
  });

  it("mantiene acciones rapidas utiles desde inicio", () => {
    const page = source("../app/page.tsx");
    const createReminderIndex = page.indexOf('href: "/avisos#nuevo-recordatorio"');
    const alertsIndex = page.indexOf('href: "/avisos"');

    expect(createReminderIndex).toBeGreaterThan(-1);
    expect(alertsIndex).toBeGreaterThan(createReminderIndex);
    expect(page).toContain("Crear recordatorio");
    expect(page).toContain("Nuevo cliente");
    expect(page).toContain("Nueva factura");
    expect(page).toContain("Nuevo presupuesto");
    expect(page).toContain("Añadir gasto");
    expect(page).toContain("Configuración");
    expect(page).not.toContain("Exportar copia");
  });

  it("no enlaza recordatorios libres a nueva factura por defecto", () => {
    const panel = source("../components/reminders/UserRemindersPanel.tsx");

    expect(panel).toContain('useState<UserReminderLinkKind>("none")');
    expect(panel).toContain('setLinkKind("none")');
    expect(panel).toContain('"#nuevo-recordatorio"');
    expect(panel).toContain('id="nuevo-recordatorio"');
    expect(panel).toContain("OFFICE_REMINDER_TEMPLATES");
    expect(panel).toContain("Plantillas rápidas");
    expect(panel).toContain("Enviar a oficina");
    expect(panel).not.toContain("<SendToOfficeForm");
  });

  it("no duplica accesos ni ultimos documentos en la sugerencia de Factu", () => {
    const component = source("../components/recommendations/HomeFactuTip.tsx");

    expect(component).toContain("Factu te sugiere");
    expect(component).not.toContain("Últimos documentos");
    expect(component).not.toContain("HOME_CREATE_ACTIONS");
    expect(component).not.toContain("HOME_REVIEW_ACTIONS");
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
