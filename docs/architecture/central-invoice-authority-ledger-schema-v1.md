# Ledger SQL de autoridad central V1

Marcador: `CENTRAL_INVOICE_AUTHORITY_LEDGER_SCHEMA_V1`

Estado: migracion aditiva para local/staging. No activa emision central, no crea
`issue_invoice_v1`, no expone rutas y no toca facturas existentes.

## Que crea

- `central_invoice_documents`
- `central_invoice_document_versions`
- `central_invoice_series_state`
- `central_invoice_identities`
- `central_invoice_commands`
- `central_invoice_outbox`

Todas las tablas viven en `public` para integrarse con Supabase local, pero RLS
queda activado y se revoca acceso a `public`, `anon` y `authenticated`. Solo
`service_role` recibe permisos directos.

## Garantias

- Un borrador queda identificado por `(user_id, local_document_id)`.
- La serie se serializa por usuario, entorno, NIF emisor, serie y ejercicio.
- La identidad fiscal es unica por secuencia y por numero completo dentro del
  mismo scope.
- La clave idempotente se almacena como hash y es unica por usuario.
- El outbox queda preparado para avisos post-commit sin payload fiscal completo.

## Lo que no hace

- No asigna numeros.
- No crea funciones `security definer`.
- No crea RPC de emision.
- No concede permisos a navegadores.
- No modifica `sync_entities` ni documentos actuales.

## Validacion

- Convencion de migraciones: `npm run check:migrations`.
- Contrato SQL: `npm run validate:central-invoice-authority-ledger-schema`.
- Gate agregado: `npm run check:authority-central-release-gate`.
