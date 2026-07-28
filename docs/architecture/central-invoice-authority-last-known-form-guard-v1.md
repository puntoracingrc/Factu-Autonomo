# Central Invoice Authority Last Known Form Guard V1

Marker: `CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_V1`

Esta fase evita un fallback local silencioso cuando el navegador ya ha aprendido
que la autoridad central debe intervenir en la emision de facturas.

## Alcance

1. guarda una marca versionada en `localStorage` cuando el formulario ve
   `NEXT_PUBLIC_CENTRAL_INVOICE_AUTHORITY_FORM_REQUIRED=true`;
2. guarda la misma marca cuando `/api/central-invoice-authority/status` devuelve
   `activation.requestedMode: "required"`;
3. tambien la guarda cuando el servidor declara `summary.fiscalWritesPossible`,
   porque ese navegador ya sabe que puede existir numeracion central;
4. si despues no hay sesion, no hay dispositivo o el endpoint de estado falla,
   el formulario vuelve a intentar el camino central con `failClosed`;
5. si despues el servidor devuelve `off`, el navegador no cae a numeracion
   local mientras conserve la marca.

## Motivo

En facturacion, una perdida temporal de estado no debe degradar a numeracion
local si ese navegador ya ha visto autoridad central. El servidor sigue siendo
el preflight final: si no permite escribir, `/issue` rechaza y el formulario no
crea una factura local alternativa.

## Limite de esta fase

No activa la autoridad central, no cambia variables de Vercel y no escribe datos
remotos. La marca es local del navegador y solo afecta a facturas y
rectificativas elegibles para el camino central.
