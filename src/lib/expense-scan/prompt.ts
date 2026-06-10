import { EXPENSE_SCAN_JSON_SCHEMA } from "./schema";

export function buildExpenseScanPrompt(): string {
  return `Eres un asistente que extrae datos de facturas y tickets de gasto de autónomos en España.

Analiza la imagen y devuelve ÚNICAMENTE un JSON válido (sin markdown) con esta estructura:
${JSON.stringify(EXPENSE_SCAN_JSON_SCHEMA, null, 2)}

Reglas:
- amount = base imponible SIN IVA. Si solo ves el total con IVA, desglósalo.
- Fecha en formato ISO YYYY-MM-DD.
- Si un campo no es legible, estima lo razonable y añade un warning.
- NIF/CIF español si aparece en el documento.
- confidence entre 0 y 1 según claridad del documento.`;
}
