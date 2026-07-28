# Central Invoice Authority Rectification Form Wiring V1

Marker: `CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_WIRING_V1`

Esta fase conecta `RectificativaForm` con la ruta privada de autoridad central
de facturas, pero solo como canary apagado por defecto. La web conserva el
flujo local actual salvo que la politica runtime de autoridad central decida
usar el camino central y la factura original ya tenga una identidad central
coherente.

## Alcance

1. aplica solo a facturas rectificativas emitidas, no a borradores;
2. no afecta a rectificativas de facturas antiguas sin identidad central;
3. genera un `localDocumentId` antes de llamar a la autoridad central;
4. enlaza la peticion con `rectifiesIdentityId`, no con el numero visible;
5. llama a `/api/central-invoice-authority/issue` con `kind: "rectification"`;
6. crea el documento local con el `fullNumber` devuelto por servidor mediante
   `addDocumentWithCentralIdentity`;
7. no cae a numeracion local si la autoridad central rechaza una rectificativa
   de una factura central;
8. desde `CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1`, el canary publico
   convive con el status servidor `required` o `fiscalWritesPossible`, y puede
   limitarse a UUIDs Supabase mediante
   `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_USERS`; el canary privado
   de servidor puede limitarse por email con
   `CENTRAL_INVOICE_AUTHORITY_CANARY_USER_EMAILS` sin exponerlo en el cliente.

## Seguridad

El navegador no decide el siguiente numero de rectificativa ni escoge la
factura original por texto visible. Si la factura original tiene identidad
central, el formulario solo materializa la rectificativa cuando el servidor
devuelve una identidad fiscal valida. Si el preflight, la ruta o el store
rechazan la operacion, se muestra un error visible y no se crea ningun
documento local alternativo.

## Limite de esta fase

La bandera publica permanece apagada en produccion. Esta fase no activa series
en modo `required`, no cambia migraciones remotas y no convierte documentos
historicos en documentos centrales.
