# Conciliacion de series por cuenta v1

## Objetivo

Antes de que el servidor asigne una identidad fiscal de una serie, debe conocer
el maximo historico que ya existe en el navegador. Esta fase conecta el
inventario local con la RPC monotona
`reconcile_central_invoice_series_v1`.

## Flujo

1. El navegador inspecciona facturas y rectificativas emitidas.
2. Agrupa por entorno, NIF emisor, serie y ejercicio.
3. Detecta secuencias duplicadas y excluye de conciliacion solamente la serie
   en conflicto; las series limpias siguen disponibles.
4. Calcula un resumen con maximo observado, cantidad y digest SHA-256.
5. El usuario confirma expresamente el envio de esos resumenes.
6. La ruta autenticada verifica sesion, email confirmado, dispositivo, rate
   limit y activacion del canario.
7. El servidor deriva `user_id`, `device_id` y hash de sesion; nunca confia en
   actores enviados por el cliente.
8. La RPC eleva el contador con `greatest(actual, observado)`, deja evidencia
   inmutable e idempotente y nunca reduce una serie.
9. La pantalla Cuenta presenta cada serie, el maximo local y cualquier
   conflicto; exige una casilla de confirmacion antes de llamar a la ruta.

## Privacidad y seguridad

- El request no contiene clientes, lineas, conceptos, importes ni snapshots.
- El digest se calcula localmente y no permite reconstruir los documentos.
- El canario `test-only` rechaza cualquier resumen de entorno `production`.
- La ruta usa `private, no-store`, cuerpo limitado a 64 KiB y un maximo de 32
  series por confirmacion.
- Los clientes anonimos y autenticados no pueden ejecutar la RPC directamente;
  solo la ruta servidor usa `service_role`.
- Una serie con duplicados no se concilia automaticamente.
- Los formatos actuales y el formato legacy `F/FR-{year}-{num}` conservan su
  serie real aunque el usuario cambie la plantilla de numeracion.

## Marcadores

- `CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_INVENTORY_V1`
- `CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_RPC_V1`
- `CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_ROUTE_V1`
- `CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1`

## Gate

`npm run validate:central-invoice-authority-account-reconciliation`

El gate forma parte de `npm run check:authority-central-release-gate`.
