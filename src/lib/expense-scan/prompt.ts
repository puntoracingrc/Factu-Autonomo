import { EXPENSE_SCAN_JSON_SCHEMA } from "./schema";

export function buildExpenseScanPrompt(): string {
  return `Eres un asistente que extrae datos de facturas y tickets de gasto de autónomos en España.

Analiza la imagen y devuelve ÚNICAMENTE un JSON válido (sin markdown) con esta estructura:
${JSON.stringify(EXPENSE_SCAN_JSON_SCHEMA, null, 2)}

Reglas:
- Solo puede guardarse como gasto una factura recibida, ticket, recibo o cargo de un gasto ya realizado.
- Si el documento es una oferta, presupuesto, pressupost, comanda, pedido, orden, proforma o cotización, NO lo trates como gasto aunque tenga líneas, precios, IVA o datos del proveedor.
- En esos casos devuelve document.kind = "quote_or_order" o "proforma", document.isExpenseDocument = false y document.reason explicando que no es factura/ticket de gasto.
- Si ves textos como "Oferta", "Presupuesto", "Pressupost", "Comanda", "Pedido", "Proforma", "válido durante" o "para generar el pedido", marca document.isExpenseDocument = false.
- Ojo: si es una factura real y solo menciona "presupuesto" o "pedido" como referencia, sigue siendo factura. Decide por el título/cabecera y el contexto completo, no por una palabra aislada.
- amount = base imponible SIN IVA. Si solo ves el total con IVA, desglósalo.
- Fecha en formato ISO YYYY-MM-DD.
- businessKind:
  - purchase_invoice si es una factura recibida completa con proveedor fiscal.
  - purchase si es una compra a proveedor para un trabajo, material o servicio.
  - quick_ticket si parece ticket, recibo simple o gasto rápido sin todos los datos fiscales.
  - fixed si parece cuota recurrente: autónomos, seguro, alquiler, luz, agua, teléfono, gestoría o software.
- Si un campo no es legible, estima lo razonable y añade un warning.
- Si parece ticket sin datos fiscales completos, añade un warning claro.
- Si parece gasto fijo recurrente, añade un warning sugiriendo revisar si conviene configurarlo como gasto fijo.
- Si aparecen líneas de producto, material o servicio, rellena purchaseLines.
- En purchaseLines: unitPrice y total siempre son SIN IVA; discountPercent es el descuento de línea si aparece.
- Si el documento solo tiene resumen total y no muestra líneas claras, deja purchaseLines vacío u omitido.
- Rellena purchaseDocument con número de factura del proveedor, vencimiento, NIF, dirección y condiciones de pago si aparecen.
- No metas datos estructurados repetidos en notes si ya caben en purchaseDocument.
- NIF/CIF español si aparece en el documento.
- confidence entre 0 y 1 según claridad del documento.`;
}
