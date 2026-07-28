# Central Invoice Authority Form Canary Bridge V1

Marker: `CENTRAL_INVOICE_AUTHORITY_FORM_CANARY_CLIENT_V1`

Esta fase prepara el formulario para una emision canary con autoridad central,
sin activarla por defecto ni sustituir todavia el flujo local.

## Alcance

1. cliente browser para consultar primero
   `/api/central-invoice-authority/status` con `GET` y `no-store`;
2. llamada a `/api/central-invoice-authority/issue` solo si el status confirma
   `summary.fiscalWritesPossible`;
3. cabeceras derivadas de sesion Supabase y token local de dispositivo en ambas
   llamadas;
4. respuesta reducida a identidad fiscal segura (`fullNumber`, secuencia y
   referencias tecnicas);
5. funcion separada en `AppStore` para crear una factura emitida con identidad
   ya asignada por servidor, reutilizando el `localDocumentId` que se envio al
   endpoint si el formulario lo aporta;
6. bandera publica opt-in
   `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=true`.

## Seguridad

El cliente no envia `userId`, `sessionId` ni `deviceId`; la ruta privada los
deriva en servidor. El store no reasigna numeracion local cuando recibe una
identidad central y solo permite esta entrada para facturas emitidas, no para
borradores ni presupuestos.

Si el status central no se puede leer, no garantiza lectura no destructiva o
declara que no hay escrituras fiscales posibles, el formulario falla cerrado:
no llama a `/issue`, no crea factura local y muestra el motivo seguro devuelto
por el preflight. El navegador sigue sin reservar ni decidir numeros fiscales.

## Siguiente corte

Extender el canary a rectificativas y a estados de operacion visibles para que
el usuario vea "pendiente de emision", "emitido por servidor" o "requiere
revision" sin mezclarlo con sincronizacion local.
