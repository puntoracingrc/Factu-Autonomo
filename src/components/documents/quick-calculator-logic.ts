export function calculatorHasEditableValue(value: string): boolean {
  return value !== "0" && value !== "Error";
}

export function deleteLastCalculatorCharacter(value: string): string {
  if (!calculatorHasEditableValue(value) || value.length <= 1) return "0";
  const next = value.slice(0, -1);
  return next === "-" || next === "" ? "0" : next;
}
