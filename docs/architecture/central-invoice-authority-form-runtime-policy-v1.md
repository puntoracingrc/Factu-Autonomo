# Central Invoice Authority Form Runtime Policy V1

Marker: `CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1`

Esta fase evita que los formularios dependan solo de una bandera publica de
canary para entrar en autoridad central. La decision sigue apagada por defecto,
pero ahora un estado servidor `required` o `fiscalWritesPossible` puede dirigir
la emision de facturas y rectificativas elegibles al endpoint central.

## Alcance

1. conserva `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=true` para
   canarios manuales;
2. anade `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED=true` como guardia
   publica de fail-closed si se decide activar required en una build;
3. consulta `/api/central-invoice-authority/status` cuando no hay bandera
   publica y el documento es candidato a autoridad central;
4. entra al camino central si el servidor declara `requestedMode: "required"`;
5. entra al camino central si el servidor declara `summary.fiscalWritesPossible`;
6. mantiene el flujo local si no hay sesion/dispositivo, el modo esta `off`,
   `shadow` o el usuario no esta incluido en canary;
7. sigue dejando que `/issue` haga el preflight final antes de escribir.

## Seguridad

Si una serie entra en `required`, el cliente ya no necesita un flag de canary
para intentar el camino central. Cuando el intento central ocurre, cualquier
rechazo posterior de `/status`, `/issue` o `addDocumentWithCentralIdentity`
mantiene el comportamiento fail-closed existente: no se crea una factura local
con numeracion alternativa.

## Limite de esta fase

No cambia variables de Vercel, no aplica migraciones remotas y no activa
`CENTRAL_INVOICE_AUTHORITY_MODE`. Solo prepara la politica runtime compartida
para que una activacion posterior no dependa de recordar el flag de canary.
