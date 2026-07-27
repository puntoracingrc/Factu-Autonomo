# Central Invoice Authority Form Canary Bridge V1

Marker: `CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT_V1`

Esta fase prepara el formulario para una emision canary con autoridad central,
sin activarla por defecto ni sustituir todavia el flujo local.

## Alcance

1. cliente browser para llamar a `/api/central-invoice-authority/issue`;
2. cabeceras derivadas de sesion Supabase y token local de dispositivo;
3. respuesta reducida a identidad fiscal segura (`fullNumber`, secuencia y
   referencias tecnicas);
4. funcion separada en `AppStore` para crear una factura emitida con identidad
   ya asignada por servidor, reutilizando el `localDocumentId` que se envio al
   endpoint si el formulario lo aporta;
5. bandera publica opt-in
   `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=true`.

## Seguridad

El cliente no envia `userId`, `sessionId` ni `deviceId`; la ruta privada los
deriva en servidor. El store no reasigna numeracion local cuando recibe una
identidad central y solo permite esta entrada para facturas emitidas, no para
borradores ni presupuestos.

## Siguiente corte

Cablear `DocumentForm` para construir hashes/snapshots canary y usar
`addDocumentWithCentralIdentity` cuando la bandera publica y las puertas de
servidor esten activas. Si la bandera esta apagada, el flujo actual no cambia.
