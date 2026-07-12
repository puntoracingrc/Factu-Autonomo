import { describe, expect, it } from "vitest";
import {
  calculatorHasEditableValue,
  deleteLastCalculatorCharacter,
  initialCalculatorX,
} from "./quick-calculator-logic";

describe("QuickCalculator", () => {
  it("muestra retroceso solo cuando existe un valor editable", () => {
    expect(calculatorHasEditableValue("0")).toBe(false);
    expect(calculatorHasEditableValue("Error")).toBe(false);
    expect(calculatorHasEditableValue("434")).toBe(true);
    expect(calculatorHasEditableValue("-2,5")).toBe(true);
  });

  it("borra un carácter sin dejar estados numéricos incompletos", () => {
    expect(deleteLastCalculatorCharacter("434")).toBe("43");
    expect(deleteLastCalculatorCharacter("0.5")).toBe("0.");
    expect(deleteLastCalculatorCharacter("7")).toBe("0");
    expect(deleteLastCalculatorCharacter("-7")).toBe("0");
    expect(deleteLastCalculatorCharacter("Error")).toBe("0");
  });

  it("no tapa los lanzadores globales al abrirse", () => {
    expect(initialCalculatorX(1440, 212)).toBe(304);
    expect(initialCalculatorX(900, 212)).toBe(24);
    expect(initialCalculatorX(390, 212)).toBe(89);
  });
});
