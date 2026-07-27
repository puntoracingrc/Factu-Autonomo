# Central Invoice Authority RPC Adapter V1

Marker: `CENTRAL_INVOICE_AUTHORITY_RPC_ADAPTER_V1`

Esta fase anade el adaptador TypeScript de servidor para invocar
`public.issue_central_invoice_v1`. No anade ruta HTTP, no conecta formularios y
no cambia el flujo local actual de emision.

## Responsabilidad

El adaptador recibe un `CentralInvoiceAuthorityIssueCommand` ya validado y los
snapshots completos preparados por servidor. Construye los parametros esperados
por la RPC, llama a Supabase y normaliza la respuesta `committed` o `replayed`.

La clave de idempotencia y la sesion no viajan en claro: se envia
`p_idempotency_key_hash` desde el comando y `p_session_hash` calculado en
servidor. El resultado publico del adaptador no incluye payloads completos ni
snapshots fiscales.

## Estado de activacion

El adaptador es una capa interna. Para activar emision central todavia faltan:

- cliente administrativo inyectado desde una API route privada;
- autenticacion de usuario/dispositivo derivada en servidor;
- prueba de concurrencia con dos llamadas simultaneas;
- migracion de borradores locales a `central_invoice_documents`;
- bandera de rollout por cuenta.
