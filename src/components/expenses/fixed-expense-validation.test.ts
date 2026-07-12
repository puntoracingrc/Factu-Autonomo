import { describe, expect, it } from "vitest";
import { fixedExpenseValidationErrors } from "./fixed-expense-validation";

const VALID_INPUT = {
  supplierName: "Proveedor",
  description: "Cuota mensual",
  amount: 50,
  startDate: "2026-07-12",
  startDateFieldId: "recurring-start-date" as const,
  durationKind: "indefinite" as const,
  endDate: "",
};

describe("fixedExpenseValidationErrors", () => {
  it("acumula los campos obligatorios de un alta vacía", () => {
    expect(
      fixedExpenseValidationErrors({
        ...VALID_INPUT,
        supplierName: " ",
        description: "",
        amount: 0,
        startDate: "",
      }).map((error) => error.fieldId),
    ).toEqual([
      "recurring-supplier-name",
      "recurring-description",
      "recurring-amount",
      "recurring-start-date",
    ]);
  });

  it("apunta al campo de fecha efectiva cuando una edición personalizada está vacía", () => {
    expect(
      fixedExpenseValidationErrors({
        ...VALID_INPUT,
        startDate: "",
        startDateFieldId: "recurring-effective-date",
      }),
    ).toEqual([
      {
        fieldId: "recurring-effective-date",
        message: "Indica desde qué fecha se aplica el gasto.",
      },
    ]);
  });

  it("rechaza una fecha final anterior al inicio del tramo", () => {
    expect(
      fixedExpenseValidationErrors({
        ...VALID_INPUT,
        durationKind: "until_date",
        endDate: "2026-07-11",
      }).map((error) => error.fieldId),
    ).toEqual(["recurring-end-date"]);
  });

  it("ignora una fecha final residual cuando la duración ya no la usa", () => {
    expect(
      fixedExpenseValidationErrors({
        ...VALID_INPUT,
        durationKind: "indefinite",
        endDate: "2026-07-11",
      }),
    ).toEqual([]);
  });

  it("acepta un formulario válido", () => {
    expect(fixedExpenseValidationErrors(VALID_INPUT)).toEqual([]);
  });
});
