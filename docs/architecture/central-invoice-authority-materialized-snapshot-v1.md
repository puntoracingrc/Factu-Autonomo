# Central Invoice Authority Materialized Snapshot V1

Marker: `CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1`

Esta fase elimina el hueco del canary de formulario: el navegador podia preparar
payload y snapshot antes de conocer el numero fiscal definitivo. A partir de
esta migracion, la RPC central sustituye el marcador
`__CENTRAL_AUTHORITY_FULL_NUMBER__` dentro de la transaccion, antes de marcar
la factura como emitida.

## Contrato

`public.central_invoice_authority_materialize_full_number_v1` recorre JSONB de
forma recursiva y reemplaza solo valores string exactamente iguales al marcador.
Despues, `public.issue_central_invoice_v1` valida que:

1. el marcador ya no exista en `current_payload` ni en `emitted_snapshot`;
2. el `fullNumber` final asignado por la serie aparezca en ambos documentos;
3. `emitted_hash` y `central_invoice_document_versions.next_hash` se calculen
   desde el snapshot materializado por servidor;
4. el evento de outbox solo exponga resumen seguro y hash materializado.

Si cualquiera de esas comprobaciones falla, la RPC aborta y la serie no queda
comprometida.

## Seguridad

La funcion auxiliar no es `security definer`. La RPC principal mantiene
`security definer`, `set search_path = ''`, revoca ejecucion a `public`, `anon`
y `authenticated`, y concede solo a `service_role`. No hay grants de navegador,
no se tocan facturas locales existentes y no se activan flags productivas.

## Estado

Esto permite que el canary guarde en el ledger central la identidad fiscal
definitiva, no una plantilla. Sigue pendiente activar el flujo por cuenta y
publicar eventos de outbox hacia los dispositivos cuando el servidor sea la
fuente unica de verdad.
