# Central Invoice Authority Rectification Form Canary V1

Marker: `CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY_V1`

Esta fase prepara el contrato puro para que una factura rectificativa pueda
emitirse mas adelante por la autoridad central sin usar la numeracion local ni
rectificar por numero visible. En este corte no activa el formulario, no llama a Supabase y no abre rutas nuevas.

## Alcance

1. una rectificativa central solo se puede construir sobre una factura original;
2. la factura original debe contener `centralInvoiceAuthority.identityId`;
3. el numero visible de la factura original debe coincidir con
   `centralInvoiceAuthority.fullNumber`;
4. se rechazan borradores, documentos no factura y rectificativas como origen;
5. la peticion usa `kind: "rectification"` y `rectifiesIdentityId`;
6. la serie se deriva del formato `factura_rectificativa`;
7. la clave idempotente usa el prefijo separado
   `FORM_CANARY_RECTIFICATION`;
8. el snapshot mantiene el marcador
   `__CENTRAL_AUTHORITY_FULL_NUMBER__` hasta que el servidor materialice el
   numero definitivo.

## Seguridad

El cliente no decide que documento fiscal se rectifica por numero, fecha o
nombre de cliente. Solo transporta la identidad tecnica ya confirmada por la
autoridad central en la factura original. Si esa identidad falta, no coincide
con el numero local o apunta a una rectificativa, el helper falla cerrado antes
de construir una peticion de emision.

## Limite de esta fase

Este contrato aun no conecta `RectificativaForm` con
`/api/central-invoice-authority/issue`. Ese cableado queda para un corte
posterior con UI, preflight visible, escritura local mediante
`addDocumentWithCentralIdentity` y pruebas de rechazo extremo a extremo.
