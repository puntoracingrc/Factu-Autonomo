import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("contratos accesibles de buscadores", () => {
  const componentPaths = [
    "../components/clients/ClientPicker.tsx",
    "../components/clients/CustomerListSearch.tsx",
    "../components/reminders/UserRemindersPanel.tsx",
  ];

  it.each(componentPaths)("expone combobox y listbox completos en %s", (path) => {
    const componentSource = source(path);

    expect(componentSource).toContain('role="combobox"');
    expect(componentSource).toContain('aria-autocomplete="list"');
    expect(componentSource).toContain("aria-expanded={popupOpen}");
    expect(componentSource).toContain("aria-controls={listboxId}");
    expect(componentSource).toContain("aria-activedescendant={");
    expect(componentSource).toContain('role="listbox"');
    expect(componentSource).toContain('role="option"');
    expect(componentSource).toContain("aria-selected={index === activeIndex}");
    expect(componentSource).toContain("tabIndex={-1}");
    expect(componentSource).toContain("getComboboxOptionId");
    expect(componentSource).toContain("resolveComboboxKeyboardAction");
    expect(componentSource).toContain('scrollIntoView({ block: "nearest" })');
  });
});

describe("contratos accesibles de pestanas y modos", () => {
  it("relaciona las pestanas reales de Avisos con su panel", () => {
    const avisosSource = source("../app/avisos/page.tsx");

    expect(avisosSource).toContain('role="tablist"');
    expect(avisosSource).toContain('role="tab"');
    expect(avisosSource).toContain('role="tabpanel"');
    expect(avisosSource).toContain("aria-selected={active}");
    expect(avisosSource).toContain("aria-controls={controls}");
    expect(avisosSource).toContain('aria-labelledby="avisos-tab-mine"');
    expect(avisosSource).toContain('aria-labelledby="avisos-tab-auto"');
    expect(avisosSource).toContain("nextAvisosTabForKey");
  });

  it.each([
    [
      "../components/rentabilidad-real/simulador/PriceSimulatorModeSelector.tsx",
      1,
    ],
    ["../components/rentabilidad-real/simulador/PriceSimulatorInputs.tsx", 3],
    [
      "../components/rentabilidad-real/calculadora/HoursSourceSelector.tsx",
      2,
    ],
    ["../components/rentabilidad-real/calculadora/WorkSourceSelector.tsx", 2],
    [
      "../components/rentabilidad-real/calculadora/FixedCostAllocationForm.tsx",
      1,
    ],
    ["../components/rentabilidad-real/calculadora/HoursInputForm.tsx", 2],
  ])("anuncia los botones de modo en %s", (path, expectedMinimum) => {
    const componentSource = source(path as string);
    const pressedCount = componentSource.match(/aria-pressed=/g)?.length ?? 0;
    expect(pressedCount).toBeGreaterThanOrEqual(expectedMinimum as number);
    expect(componentSource).not.toContain('role="tab"');
  });
});

describe("nombres accesibles de botones de icono", () => {
  it("nombra las acciones de recordatorios completados", () => {
    const remindersSource = source(
      "../components/reminders/UserRemindersPanel.tsx",
    );

    expect(remindersSource).toContain(
      'aria-label="Marcar recordatorio como pendiente"',
    );
    expect(remindersSource).toContain(
      'aria-label="Eliminar recordatorio"',
    );
  });

  it("nombra las acciones de cada gasto fijo", () => {
    const fixedExpensesSource = source("../app/gastos/fijos/page.tsx");

    expect(fixedExpensesSource).toContain(
      "aria-label={`Editar gasto fijo ${item.description}`}",
    );
    expect(fixedExpensesSource).toContain(
      "aria-label={`Borrar gasto fijo ${item.description}`}",
    );
  });
});
