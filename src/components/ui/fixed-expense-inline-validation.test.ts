import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixedExpensePage = readFileSync(
  new URL("../../app/gastos/fijos/page.tsx", import.meta.url),
  "utf8",
);
const amountFields = readFileSync(
  new URL("../expenses/ExpenseAmountFields.tsx", import.meta.url),
  "utf8",
);

describe("validación inline accesible de gastos fijos", () => {
  it("sustituye alert por un resumen enfocable sin tocar la confirmación de borrado", () => {
    expect(fixedExpensePage).toContain("<FormErrorSummary");
    expect(fixedExpensePage).not.toMatch(/\b(?:window\.)?alert\s*\(/);
    expect(fixedExpensePage).toContain(
      "confirm(`¿Borrar el gasto fijo «${item.description}»?`)",
    );
  });

  it("asocia cada error de validación existente con su campo", () => {
    for (const fieldId of [
      "recurring-supplier-name",
      "recurring-description",
      "recurring-effective-date",
      "recurring-start-date",
      "recurring-end-date",
    ]) {
      expect(fixedExpensePage).toContain(`id="${fieldId}"`);
    }
    expect(fixedExpensePage).toContain(
      'amountInputId="recurring-amount"',
    );
    expect(fixedExpensePage).toContain("fixedExpenseValidationErrors({");

    expect(fixedExpensePage).toContain("aria-invalid=");
    expect(fixedExpensePage).toContain("aria-describedby=");
    expect(amountFields).toContain("amountInputId?: string");
    expect(amountFields).toContain("amountError?: string");
  });

  it("bloquea la mutación antes de construir el payload inválido", () => {
    const validationGate = fixedExpensePage.indexOf(
      "if (errors.length > 0)",
    );
    const payload = fixedExpensePage.indexOf("const payload =", validationGate);
    const gateSource = fixedExpensePage.slice(validationGate, payload);

    expect(validationGate).toBeGreaterThanOrEqual(0);
    expect(payload).toBeGreaterThan(validationGate);
    expect(gateSource).toContain("setValidationErrors(errors)");
    expect(gateSource).toContain(
      "requestAnimationFrame(() => validationSummaryRef.current?.focus())",
    );
    expect(gateSource).toContain("return;");
  });

  it("no roba el foco al corregir un campo mientras quedan otros errores", () => {
    expect(fixedExpensePage).not.toContain(
      "if (validationErrors.length > 0) validationSummaryRef.current?.focus()",
    );
    expect(fixedExpensePage).toContain(
      "current.filter((error) => error.fieldId !== fieldId)",
    );
  });

  it("retira del resumen el error de fecha final cuando su campo se oculta", () => {
    expect(fixedExpensePage).toContain(
      'if (durationKind !== "until_date")',
    );
    expect(fixedExpensePage).toContain(
      'clearValidationError("recurring-end-date")',
    );
  });

  it("asocia la fecha efectiva de una edición con el campo realmente visible", () => {
    expect(fixedExpensePage).toContain(
      'editApplyMode === "today" ? today : effectiveDate',
    );
    expect(fixedExpensePage).not.toContain("effectiveDate || today");
    expect(fixedExpensePage).toContain(
      'startDateFieldId: editingId\n        ? "recurring-effective-date"\n        : "recurring-start-date"',
    );
    expect(fixedExpensePage).toContain('id="recurring-effective-date"');
    expect(fixedExpensePage).toContain(
      'clearValidationError("recurring-effective-date")',
    );
    expect(fixedExpensePage).toContain(': "la fecha que indiques"');
  });

  it("mantiene visibles y enfocables los bloqueos operativos", () => {
    expect(fixedExpensePage).toContain(
      'showPersistenceError("La regla ya no existe. No se ha modificado nada.")',
    );
    expect(fixedExpensePage).toContain(
      "El cambio requiere revisión manual. No se ha modificado nada.",
    );
    expect(fixedExpensePage).toContain("ref={persistenceErrorRef}");
    expect(fixedExpensePage).toContain("tabIndex={-1}");
    expect(fixedExpensePage).toContain(
      'scrollIntoView({ block: "nearest" })',
    );
  });
});
