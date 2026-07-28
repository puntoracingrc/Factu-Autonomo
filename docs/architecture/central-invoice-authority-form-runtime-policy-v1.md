# Central Invoice Authority Form Runtime Policy V1

Marker: `CENTRAL_INVOICE_AUTHORITY_FORM_RUNTIME_POLICY_V1`

Esta fase evita que los formularios dependan solo de una bandera publica para
entrar en autoridad central. La decision sigue apagada por defecto, y un canary
publico solo puede usar el endpoint central cuando el estado privado del
servidor confirma que todos los gates permiten escrituras fiscales.

## Alcance

1. conserva `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_CANARY=true` como
   solicitud de canario manual, pero no como bypass de seguridad;
2. anade `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED=true` como guardia
   publica de fail-closed si se decide activar required en una build;
3. consulta `/api/central-invoice-authority/status` para los canarios publicos y
   cuando no hay bandera publica pero el documento es candidato a autoridad
   central;
4. entra al camino central si el servidor declara `requestedMode: "required"`;
5. entra al camino central con razon `public_form_canary` solo si el canario
   publico esta pedido y el servidor declara `summary.fiscalWritesPossible`;
6. entra al camino central con razon `server_fiscal_writes_possible` si no hay
   flag publico y el servidor declara `summary.fiscalWritesPossible`;
7. mantiene el flujo local si no hay sesion/dispositivo, el modo esta `off`,
   `shadow`, el usuario no esta incluido en canary o el canary publico queda en
   `public_canary_not_ready`, siempre que el navegador no hubiera visto antes
   autoridad central;
8. sigue dejando que `/issue` haga el preflight final antes de escribir.

## Seguridad

Si una serie entra en `required`, el cliente ya no necesita un flag de canary
para intentar el camino central. Cuando el intento central ocurre, cualquier
rechazo posterior de `/status`, `/issue` o `addDocumentWithCentralIdentity`
mantiene el comportamiento fail-closed existente: no se crea una factura local
con numeracion alternativa.

La fase `CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_V1` anade una memoria
local versionada. Si un navegador ya vio `required` o escrituras fiscales
posibles confirmadas por status, una caida posterior de `/status` no permite volver a emitir en local.

## Limite de esta fase

No cambia variables de Vercel, no aplica migraciones remotas y no activa
`CENTRAL_INVOICE_AUTHORITY_MODE`. Solo prepara la politica runtime compartida
para que una activacion posterior no dependa de recordar el flag de canary.
