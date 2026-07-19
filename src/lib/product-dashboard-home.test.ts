import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("product dashboard home", () => {
  it("mantiene el resumen financiero visible, ocultable y abierto a todos", () => {
    const component = source("../components/dashboard/HomeBusinessSummary.tsx");
    const page = source("../app/page.tsx");
    const periodSelectorIndex = component.indexOf("<PeriodSelector");
    const flowChartIndex = component.indexOf("<BusinessFlowChart");

    expect(page).toContain("HomeBusinessSummary");
    expect(component).toContain("Resumen del negocio");
    expect(component).toContain("Mostrar resumen");
    expect(component).toContain("Ocultar resumen");
    expect(component).toContain("useState(true)");
    expect(component).not.toContain("limits.quarterlySummary");
    expect(component).not.toContain("Finanzas incluidas en Pro");
    expect(component).toContain("Flujo del periodo");
    expect(component).toContain("Facturado");
    expect(component).toContain("Cobrado");
    expect(component).toContain("Pendiente");
    expect(component).toContain("Gastos");
    expect(component).toContain("Lo que queda después del gasto neto");
    expect(component).not.toContain("IVA neto para orientarte");
    expect(component).not.toContain("IVA neto de gastos y abonos");
    expect(component).not.toContain("summary.salesIvaEstimated");
    expect(component).not.toContain("summary.expenseIvaEstimated");
    expect(component).toContain("!border-orange-300 ring-1 ring-orange-100");
    expect(component).toContain("!border-emerald-300 ring-1 ring-emerald-100");
    expect(component).toContain("bg-orange-50 text-orange-700");
    expect(component).toContain("bg-emerald-50 text-emerald-700");
    expect(component).toContain(
      "max-h-64 overflow-y-auto overscroll-contain pr-1",
    );
    expect(component).toContain("Facturas pendientes de cobro");
    expect(component).toContain("icon={AlertCircle}");
    expect(component).toContain("<PaymentReminderButton");
    expect(component).toContain("profile={data.profile}");
    expect(component).toContain("showUnavailable");
    expect(component).toContain("hideTooltip");
    expect(component).toContain("TODO COBRADO :)");
    expect(component).not.toContain("Resumen por periodo");
    expect(periodSelectorIndex).toBeGreaterThan(-1);
    expect(flowChartIndex).toBeGreaterThan(-1);
    expect(periodSelectorIndex).toBeLessThan(flowChartIndex);
    expect(component).toContain("compactPeriodSelectClass");
    expect(component).toContain(
      "amount={safeSignedDisplayAmount(\n                documentAmounts(document, vatExempt).total",
    );
    expect(component).toContain('<option value="month">Mes</option>');
    expect(component).toContain('<option value="quarter">Trimestre</option>');
    expect(component).toContain('<option value="year">Año</option>');
    expect(component).not.toContain('<option value="month">Este mes</option>');
    expect(component).not.toContain(
      '<option value="quarter">Este trimestre</option>',
    );
    expect(component).not.toContain('<option value="year">Este año</option>');
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
    const createReminderIndex = page.indexOf(
      'href: "/avisos#nuevo-recordatorio"',
    );
    const alertsIndex = page.indexOf('href: "/avisos"');

    expect(createReminderIndex).toBeGreaterThan(-1);
    expect(alertsIndex).toBeGreaterThan(createReminderIndex);
    expect(page).toContain("Crear recordatorio");
    expect(page).toContain("Nuevo cliente");
    expect(page).toContain("Nueva factura");
    expect(page).toContain("Nuevo presupuesto");
    expect(page).toContain("Gastos");
    expect(page).toContain("Ajustes");
    expect(page).not.toContain("Exportar copia");
  });

  it("no enlaza recordatorios libres a nueva factura por defecto", () => {
    const panel = source("../components/reminders/UserRemindersPanel.tsx");
    const voice = source(
      "../components/reminders/ReminderRealtimeVoiceInput.tsx",
    );

    expect(panel).toContain('useState<ReminderLinkMode>("none")');
    expect(panel).toContain('setLinkMode("none")');
    expect(panel).toContain("DocumentPickerSearch");
    expect(panel).toContain('"#nuevo-recordatorio"');
    expect(panel).toContain('id="nuevo-recordatorio"');
    expect(panel).toContain("OFFICE_REMINDER_TEMPLATES");
    expect(panel).toContain("Plantillas rápidas");
    expect(panel).toContain("Enviar a oficina");
    expect(voice).toContain("Intentará rellenar todos los");
    expect(panel).not.toContain('type="date"');
    expect(panel).not.toContain('type="time"');
    expect(panel).not.toContain("<SendToOfficeForm");
  });

  it("consume una sola vez el borrador del calendario y exige guardado explícito", () => {
    const panel = source("../components/reminders/UserRemindersPanel.tsx");
    const initialEffect = panel.slice(
      panel.indexOf("useEffect(() =>"),
      panel.indexOf("function resetForm"),
    );

    expect(panel).toContain("consumeFiscalCalendarReminderDraft");
    expect(initialEffect).toContain("initialRouteHandled.current = true");
    expect(initialEffect).toContain('originValues[0] === "calendario"');
    expect(initialEffect).toContain("window.sessionStorage");
    expect(initialEffect).toContain("setTarget(\"self\")");
    expect(initialEffect).toContain("setLinkMode(\"none\")");
    expect(initialEffect).toContain("setText(result.draft.text)");
    expect(initialEffect).not.toContain("addUserReminder");
    expect(panel).toContain(
      "Borrador preparado desde el calendario fiscal. Revísalo antes de guardarlo.",
    );
    expect(panel).toContain("Guardar recordatorio");
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

    expect(copy).not.toMatch(
      /IVA a pagar|Modelo 303|Resultado fiscal|Declaraci[oó]n|Hacienda|AEAT|Contabilidad oficial/i,
    );
  });
});
