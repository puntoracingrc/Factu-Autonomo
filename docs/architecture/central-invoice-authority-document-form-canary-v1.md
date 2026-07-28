# Central Invoice Authority Document Form Canary V1

Marker: `CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1`

Esta fase conecta `DocumentForm` con la ruta privada de autoridad central de
facturas, pero solo como canary apagado por defecto. La web sigue usando el
flujo local actual salvo que la politica runtime de autoridad central decida
usar el camino central.

## Alcance

1. aplica solo a facturas nuevas emitidas;
2. excluye borradores, presupuestos, recibos, ediciones y rectificativas;
3. genera un `localDocumentId` antes de llamar a la autoridad central;
4. deriva serie, NIF emisor, entorno y ejercicio desde el perfil/documento;
5. llama a `/api/central-invoice-authority/issue`;
6. crea el documento local con el `fullNumber` devuelto por servidor;
7. serializa emision y recepcion de eventos entre pestanas y confirma el
   guardado durable local antes de cerrar la operacion;
8. no cae a numeracion local si la autoridad central rechaza;
9. si el servidor emitio pero el guardado local falla, avisa expresamente que
   no se repita la emision y deja la recuperacion al evento central;
10. desde `CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1`, el canary publico
   convive con el status servidor `required` o `fiscalWritesPossible`, y puede
   limitarse a UUIDs Supabase mediante
   `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS`; el canary privado
   de servidor puede limitarse por email con
   `CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS` sin exponerlo en el cliente.

## Seguridad

El formulario no envia `userId`, `sessionId` ni `deviceId`; los deriva la ruta
privada en servidor desde Supabase y el token local de dispositivo. Si falla la
autoridad central, no se crea factura local con otro numero, para evitar dobles
emisiones.

## Materializacion del numero

El snapshot enviado a la autoridad central usa el marcador
`__CENTRAL_AUTHORITY_FULL_NUMBER__` porque la identidad fiscal definitiva nace
en la transaccion central. La migracion
`CENTRAL_INVOICE_AUTHORITY_MATERIALIZED_SNAPSHOT_V1` materializa ese numero en
el ledger central antes de comprometer la emision.
