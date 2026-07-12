# Calendario fiscal AEAT: publicación informativa y desarrollo local

## Finalidad y alcance

Este módulo es informativo y de solo lectura. En producción publica una
superficie `REVIEW_ONLY` sin vencimientos, sin fixtures y sin consultas
externas mientras el dataset público sigue pendiente de revisión. En desarrollo
local puede consultar los calendarios públicos generales de la Agencia
Tributaria o usar fixtures sintéticos. No determina qué obligación corresponde
a una persona, no presenta modelos, no paga, no marca tareas como cumplidas y no
sustituye a un asesor.

La ruta es `/consultor-fiscal/calendario` y aparece dentro de la navegación
pública «Asesoría fiscal», junto al catálogo de Modelos AEAT. El analizador de
gastos y otras herramientas privadas conservan sus flags independientes.

## Arquitectura

```text
FiscalCalendarView
  → GET /api/fiscal-calendar/events
    → FiscalCalendarService (TTL y coalescencia por rango/categorías)
      → FiscalCalendarProvider.listEvents(dateRange, categories)
        ├─ ReviewOnlyFiscalCalendarProvider (producción; 0 eventos, 0 red)
        ├─ FixtureFiscalCalendarProvider (solo local)
        └─ GooglePublicCalendarProvider
             → Google Calendar events.list (solo GET)
```

La interfaz solo conoce el endpoint local. `GooglePublicCalendarProvider` vive
en servidor, construye el `calendarId` desde una allowlist cerrada y envía la
clave mediante `X-Goog-Api-Key`; no la incluye en la URL, respuestas, caché ni
logs. La caché de cinco minutos es local al proceso y no contiene credenciales
ni claves de usuario. Peticiones concurrentes idénticas comparten la misma
promesa para evitar una llamada externa por usuario.

Las referencias a modelos se resuelven también en servidor. El adaptador
consume `resolvePublicAeatModelCalendarNavigationV1` y contrasta su resultado
con `resolvePublicAeatModelReviewPageV1`; la API devuelve únicamente código,
`catalogFocusHref` canónico y marca histórica. Al pulsarlo se abre el catálogo
general de Modelos, se desplaza y enfoca la tarjeta correspondiente y la
resalta con contorno azul. Desde esa tarjeta se puede abrir la ficha. El origen
`FISCAL_CALENDAR` habilita un retorno fijo a
`/consultor-fiscal/calendario` tanto en la tarjeta como en el detalle, sin
aceptar `returnTo` ni rutas construidas desde el texto del evento.

El catálogo jurídico de `src/lib/tax-engine/sources.ts` se inspeccionó, pero no
se amplió: representa leyes y fuentes asociadas a reglas de deducibilidad. El
calendario es una integración externa distinta y mantiene un catálogo propio,
versionado y auditable, siguiendo el mismo patrón de fuente, revisión y estado.
También se mantiene intacto `src/lib/billing/tax-deadlines.ts`: sus recordatorios
IVA orientativos no se reconcilian automáticamente con estos eventos en fase 1.

## Fuente y calendarios permitidos

Fuente oficial revisada el 12-07-2026:

- [Instrucciones iCalendar del calendario del contribuyente de la AEAT](https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/icalendar/instrucciones-integrar-calendario.html)

La allowlist única está en `src/lib/fiscal-calendar/catalog.ts`, versión
`aeat-public-calendars-2026-07-12.v1`, con hash SHA-256 reproducible del catálogo
`162d9d10580f0cbaa1bb0af8b7226020de2bbfce72aa0b655912fcfc66dd7e43`.

| Categoría                  | Calendar ID público                                    |
| -------------------------- | ------------------------------------------------------ |
| Renta                      | `invitado2aeat@gmail.com`                              |
| Renta y Sociedades         | `aio2b0s64q65r7v87j5ma8fvog@group.calendar.google.com` |
| Sociedades                 | `b7g1j3bod3gdjbka03uo6kr988@group.calendar.google.com` |
| IVA                        | `517mcuhcis0lldnp9b7c0nk2q8@group.calendar.google.com` |
| Declaraciones informativas | `hqp9h5ft4snag42aea96791g28@group.calendar.google.com` |

La AEAT documenta suscripción iCalendar, no garantiza un contrato específico
con Google Calendar API. Que esos calendarios continúen públicos es una
dependencia operativa que debe revisarse en futuras versiones.

Referencias técnicas oficiales de Google:

- [`events.list`](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Recurso `Event`](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Credenciales para datos públicos](https://developers.google.com/workspace/guides/create-credentials)
- [Errores de Calendar API](https://developers.google.com/workspace/calendar/api/guides/errors)
- [Cuotas y backoff](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Buenas prácticas para API keys](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)

## Variables de entorno

Añadir solo a `.env.local`; no editar ni compartir claves reales:

```dotenv
FISCAL_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_API_KEY=
FISCAL_CALENDAR_LIVE_TEST=false
NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED=true
```

- `FISCAL_CALENDAR_ENABLED`: el valor literal `true` habilita en local los
  proveedores de desarrollo. Por omisión es `false`. Producción publica siempre
  el modo informativo `review-only`, que no usa esta flag.
- `GOOGLE_CALENDAR_API_KEY`: clave privada de servidor. Si queda vacía, el
  proveedor se selecciona automáticamente como `fixture`.
- `FISCAL_CALENDAR_LIVE_TEST`: opt-in independiente para el smoke real. No
  afecta a la suite ordinaria.
- `NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED`: controla únicamente el analizador de
  gastos. No abre ni cierra Calendario o Modelos.

La clave debería restringirse en Google Cloud a Calendar API y, cuando sea
viable, a la salida de red del entorno de desarrollo.

## Arranque y fixtures

```bash
npm ci
npm run dev
```

Abrir `http://localhost:3000/consultor-fiscal/calendario`. Sin API key aparece
un aviso amarillo y eventos marcados `[SIMULADO]`. El corpus
`synthetic-aeat-calendar-2026.v1` es inventado, determinista, no usa red y cubre
día completo, final exclusivo, varios días, evento con hora, descripción
ausente, HTML no confiable y cancelación.

## Pruebas ordinarias sin red

```bash
npx vitest run src/lib/fiscal-calendar \
  src/app/api/fiscal-calendar/events/route.test.ts \
  src/components/fiscal-calendar/FiscalCalendarView.test.ts \
  src/lib/api-security-inventory.test.ts
npx eslint src/lib/fiscal-calendar src/app/api/fiscal-calendar \
  src/app/consultor-fiscal/calendario src/components/fiscal-calendar
npm run typecheck
npm run build
```

La suite ordinaria inyecta `fetch`, reloj y esperas; nunca necesita Internet ni
credenciales.

## Smoke real opcional

Con el servidor local ya arrancado y las tres variables opt-in definidas en el
archivo ignorado `.env.local`:

```bash
node --env-file=.env.local scripts/smoke-fiscal-calendar.mjs
```

El script consulta exclusivamente la categoría `iva` a través de la API local,
comprueba que el proveedor fue Google y no imprime la clave. Si falta cualquier
opt-in, se omite con código de salida correcto. Nunca forma parte de `npm test`.
La clave no debe aparecer en comandos, capturas, logs, commits ni variables
`NEXT_PUBLIC_*`.

## Fechas, límites y seguridad

- Los eventos all-day conservan `YYYY-MM-DD`; `end.date` sigue siendo exclusiva.
- `timeMin` y `timeMax` se calculan a medianoche real de `Europe/Madrid`, también
  durante cambios de horario de verano.
- El rango máximo es de 366 días.
- Google se consulta con `singleEvents=true`, `orderBy=startTime`,
  `showDeleted=false`, paginación y campos parciales que incluyen
  `nextPageToken`.
- Hay timeout por llamada, máximo tres intentos y backoff acotado para red,
  408/425/429/5xx. Un 403 solo se reintenta si Google indica límite de cuota.
- Se limitan páginas, eventos y bytes de respuesta.
- Título y descripción se recortan y sanitizan. React los renderiza como texto;
  no hay `dangerouslySetInnerHTML`, iframe ni enlaces procedentes de eventos.
- El identificador interno deriva de `AEAT + sourceCalendarKey + event.id`; no
  usa título ni `iCalUID` como clave única.
- El texto externo nunca clasifica por heurística un plazo general, una
  domiciliación o una excepción. Hasta disponer de metadatos oficiales
  estructurados, el modelo usa `unclassified` y la UI muestra «Revisar con
  gestor».

## Limitaciones deliberadas de la publicación inicial

- Sin personalización por perfil fiscal ni inferencias de modelos aplicables.
- Sin OAuth, tokens, calendario personal ni sincronización bidireccional.
- Sin emails, SMS, push, webhooks, cron ni avisos simulados.
- Sin escrituras externas y sin persistencia en Supabase o almacenamiento local.
- Sin determinación de festivos, traslados de vencimiento o domiciliación fuera
  de lo que publique literalmente el evento general.
- La publicación web no muestra fixtures como si fueran vencimientos AEAT y no
  realiza llamadas Google. Hasta incorporar un dataset verificado, conserva
  cero eventos y enlaza a la fuente oficial.
- Los códigos de modelo enlazan únicamente mediante el resolver público de
  Modelos y llevan al catálogo enfocado, no directamente al detalle. Códigos
  desconocidos permanecen como texto; nunca se construyen rutas desde el
  contenido del evento.
- La ayuda contextual apunta al índice público `/ayuda`; no registra capturas
  manuales ni abre la ayuda privada del analizador.

## Segunda fase prevista: OAuth

Una futura implementación para calendarios de usuarios debería añadir otro
proveedor detrás de la misma interfaz, con consentimiento explícito, scopes
mínimos, tokens cifrados y aislados por usuario/tenant, revocación, auditoría y
política de conflictos. El proveedor público actual no solicitará scopes ni se
reutilizará para guardar tokens. Cualquier escritura o sincronización requerirá
una revisión y autorización separadas.
