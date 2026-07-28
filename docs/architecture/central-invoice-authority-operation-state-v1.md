# Central Invoice Authority Operation State V1

Marker: `CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE_V1`

Esta fase añade una capa de presentación para documentos que ya contienen
metadatos de la autoridad central de Factu. No activa nuevas escrituras
centrales, no cambia la sincronización y no modifica PDFs, impuestos,
snapshots, sellos ni numeración.

## Alcance

1. clasifica documentos sin identidad central como `local_only`;
2. muestra `Servidor central` cuando la factura, rectificativa o reparación
   conservan número, versión y secuencia coherentes con el enlace central;
3. muestra `Revisar servidor` cuando el enlace central no coincide con el
   documento visible o aparece en un borrador;
4. reutiliza la pista de estado del listado de facturas para explicar que la
   identidad fiscal fue confirmada por servidor central;
5. conserva la presentación anterior para documentos locales sin metadatos.

## Seguridad

El helper es puro: no escribe datos, no llama a `fetch`, no usa `localStorage`,
no abre Supabase y no invoca rutas ni servicios de emisión. Una incompatibilidad
del enlace central se presenta como revisión necesaria; nunca se corrige,
renumera, borra ni reinterpreta el documento desde la vista.

Esta capa solo hace visible la evidencia operativa ya guardada por fases
anteriores. La autoridad sigue siendo el servidor y los consumidores fiscales
siguen usando sus contratos propios.
