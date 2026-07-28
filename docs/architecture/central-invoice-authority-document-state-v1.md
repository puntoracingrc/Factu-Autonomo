# Central Invoice Authority Document State V1

Marker: `CENTRAL_INVOICE_AUTHORITY_DOCUMENT_STATE_V1`

Esta fase extiende la presentación del estado de autoridad central al detalle
de una factura emitida. El listado y el detalle comparten el mismo distintivo
visual y el detalle muestra la explicación completa cuando existe un enlace
central coherente o cuando necesita revisión.

## Alcance

1. reutiliza `getCentralInvoiceAuthorityOperationState` como única fuente de
   copy para documentos con metadatos centrales;
2. muestra `Servidor central` en el detalle cuando número, versión, secuencia e
   identidad fiscal ya están confirmados por la autoridad central;
3. muestra `Revisar servidor` como alerta visible si la identidad central
   guardada no encaja con el documento abierto;
4. no muestra nada nuevo en presupuestos, recibos o facturas locales sin
   metadatos centrales.

## Seguridad

La presentación no escribe datos, no llama a `fetch`, no usa `localStorage`,
no abre Supabase y no invoca rutas ni servicios de emisión. No crea, renumera,
repara, borra ni sincroniza documentos. La autoridad fiscal sigue siendo el
servidor central y esta capa solo explica la evidencia ya presente en el
documento local.
