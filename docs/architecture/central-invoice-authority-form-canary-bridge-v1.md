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
   `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=true`, tratada solo como
   solicitud: el formulario no entra en canary si `/status` no confirma gates
   listos.

## Seguridad

El cliente no envia `userId`, `sessionId` ni `deviceId`; la ruta privada los
deriva en servidor. El store no reasigna numeracion local cuando recibe una
identidad central y solo permite esta entrada para facturas emitidas, no para
borradores ni presupuestos.

Si el cliente central de emision se invoca y el status no se puede leer, no
garantiza lectura no destructiva o declara que no hay escrituras fiscales
posibles, esa llamada falla cerrado: no llama a `/issue` y muestra el motivo
seguro devuelto por el preflight. La politica runtime solo invoca ese cliente en
canario publico cuando `/status` ya ha confirmado `summary.fiscalWritesPossible`;
si no, el formulario sigue en el flujo local existente y no reserva ni decide
numeros fiscales centrales. Una vez invocado el cliente central, no crea factura local alternativa.

## Corte posterior

`CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1` y el aviso
`CENTRAL_INVOICE_AUTHORITY_FORM_POLICY_NOTICE_V1` hacen visible si el formulario
esta en canario central, en espera o sin comprobacion antes de emitir. La
siguiente activacion ya debe limitarse a variables de entorno y usuario UUID
allowlisted, sin cambiar este contrato cliente.
