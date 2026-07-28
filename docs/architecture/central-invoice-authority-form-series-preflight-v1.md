# Preflight de serie al emitir v1

## Objetivo

Cada factura o rectificativa del canario debe conciliar su serie exacta justo
antes de solicitar la identidad fiscal al servidor. El navegador no calcula ni
reserva el siguiente numero: solo aporta el maximo local conocido y el servidor
lo eleva de forma monotona antes de asignar el numero definitivo.

## Flujo

1. El formulario construye el comando central y su serie exacta.
2. Dentro del bloqueo exclusivo de emision, el navegador inventaria esa serie.
3. Los documentos que encajan con el formato actual y los formatos legacy se
   mantienen en series separadas.
4. Un duplicado bloquea solamente su propia serie. Nunca se envia esa serie.
5. La ruta de conciliacion eleva el contador con `greatest(actual, observado)`.
6. El cliente verifica que el servidor confirma la misma serie y un contador
   igual o superior al maximo local.
7. Solo entonces llama a `/api/central-invoice-authority/issue`.
8. La RPC de emision asigna el siguiente numero dentro de su transaccion ACID.
9. Si cualquier paso falla, no se escribe el documento local ni se repite la
   emision automaticamente.

## Seguridad

- La accion explicita `Emitir` autoriza el preflight de esa unica serie.
- No se envian clientes, conceptos, importes ni snapshots durante la
  conciliacion.
- Una serie historica en conflicto no puede elevar su contador.
- Una serie limpia no queda bloqueada por un conflicto de otra serie.
- El bloqueo del navegador evita operaciones centrales solapadas en una misma
  pestana; PostgreSQL conserva la autoridad real entre todos los dispositivos.

## Marcador y gate

- `CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT_V1`
- `npm run validate:central-invoice-authority-form-series-preflight`

El validador forma parte de
`npm run check:authority-central-release-gate`.
