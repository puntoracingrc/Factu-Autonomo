# Central Invoice Authority Outbox Pull V1

Marker: `CENTRAL_INVOICE_AUTHORITY_OUTBOX_PULL_V1`

Esta fase prepara la descarga segura de eventos emitidos por la autoridad
central. Es el complemento necesario para que varios dispositivos puedan ver lo
que el servidor ya confirmo sin depender del snapshot local antiguo.

## Contrato

`public.list_central_invoice_events_v1` es una RPC privada, solo para
`service_role`, que devuelve eventos de `central_invoice_outbox` de un usuario
autenticado despues de un cursor `(created_at, event_id)`.

La ruta `GET /api/central-invoice-authority/events`:

1. exige sesion Supabase confirmada derivada del bearer;
2. aplica rate limit por usuario;
3. exige dispositivo cloud valido mediante `X-Factu-Device-Token`;
4. acepta `afterCreatedAt`, `afterEventId` y `limit`;
5. limita la pagina a 100 eventos;
6. devuelve `nextCursor` estable.

## Seguridad

No hay grants a `anon` ni `authenticated`. El navegador no llama a Supabase
directamente; solo llama a la ruta privada de Next.js. La respuesta no incluye
`emitted_snapshot`, XML, PDF ni claves privadas. Incluye el `document_payload`
central materializado, identidad fiscal, version, hash emitido y resumen seguro
de outbox para que el siguiente bloque pueda hidratar dispositivos.

## Estado

Esta fase no activa la sincronizacion central completa. Falta conectar un
cliente pull en el flujo cloud/local y definir el ACK/publicacion para marcar
eventos como entregados cuando todos los dispositivos los hayan incorporado.
