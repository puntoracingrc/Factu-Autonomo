# Central Invoice Authority Issue Route V1

Marker: `CENTRAL_INVOICE_AUTHORITY_ISSUE_ROUTE_V1`

Esta fase anade la ruta privada `/api/central-invoice-authority/issue` como
puente HTTP controlado hacia el servicio interno de emision central. No activa
el formulario por defecto ni elimina todavia la numeracion local.

## Flujo

1. acepta solo `POST` y `OPTIONS`;
2. deriva usuario y `sessionId` desde el Bearer validado por Supabase;
3. aplica rate limit por usuario;
4. exige token de dispositivo activo y usa su hash como `deviceId`;
5. obtiene el cliente Supabase admin solo en servidor;
6. construye el comando con `userIdSource: server`;
7. delega en `issueCentralInvoiceWithAuthority`;
8. devuelve solo resumen seguro y resultado tecnico de la RPC.

## Seguridad

La ruta no recibe `userId`, `sessionId` ni `deviceId` desde el cuerpo. El
navegador puede mandar payload documental porque la app actual aun es
local-first, pero la respuesta nunca devuelve `documentPayload` ni
`emittedSnapshot`. La escritura fiscal sigue apagada salvo que las banderas de
autoridad central permitan canary/required.

## Limites

Este corte no cambia `DocumentForm`, `AppStore`, PDF, VeriFactu ni
sincronizacion local. El siguiente corte debe introducir una emision canary que
use el `fullNumber` devuelto por esta ruta en vez de asignarlo localmente.
