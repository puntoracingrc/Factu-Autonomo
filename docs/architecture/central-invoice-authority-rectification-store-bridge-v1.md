# Central Invoice Authority Rectification Store Bridge V1

Marker: `CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_STORE_BRIDGE_V1`

Esta fase endurece el puente local que materializa una identidad ya asignada
por el servidor central. No activa el formulario de rectificativas ni llama a
`/api/central-invoice-authority/issue`.

## Alcance

1. `addDocumentWithCentralIdentity` mantiene una entrada separada para
   identidades centrales;
2. una rectificativa central usa `identity.kind === "factura_rectificativa"`;
3. el store no llama a `assignNextDocumentNumber` en este puente;
4. el numero local de la rectificativa procede de `identity.fullNumber`;
5. la rectificativa reutiliza `canonicalRectificationReference`,
   `canonicalRectificationItems`, `assertRectificationEmissionAllowed` y
   `materializeRectificationDocument`;
6. la factura original se actualiza mediante
   `applyEmittedRectificationToOriginal`;
7. si la original no existe, no admite rectificacion o ya tiene borrador
   pendiente, el puente falla cerrado antes de escribir.

## Seguridad

El navegador sigue sin reservar ni calcular el numero fiscal. Cuando el servidor
devuelve una identidad de rectificativa, el store solo la materializa si puede
proyectarla sobre una factura original unica y canonica. La relacion fiscal se
guarda por ID tecnico local y por la identidad central recibida; compartir un
numero visible nunca sirve para escoger otra factura.

## Limite de esta fase

El usuario aun no puede emitir rectificativas por este camino desde la UI. El
cableado de `RectificativaForm` queda para un corte posterior con preflight,
errores visibles y pruebas de rechazo extremo a extremo.
