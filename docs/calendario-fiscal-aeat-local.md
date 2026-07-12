# Calendario fiscal AEAT: feeds públicos y desarrollo local

## Finalidad

El módulo publica vencimientos generales procedentes de los calendarios
iCalendar enlazados por la Agencia Tributaria. Es de solo lectura: no presenta
modelos, no paga, no marca obligaciones como cumplidas y no decide qué modelos
corresponden a un contribuyente.

La ruta pública es `/consultor-fiscal/calendario` y aparece en «Asesoría
fiscal», junto al catálogo de Modelos AEAT. Los códigos incluidos en el texto
de los eventos se resuelven en servidor mediante el descriptor canónico de
Modelos y abren su tarjeta enfocada en el catálogo general.

## Arquitectura

```text
FiscalCalendarView
  → GET /api/fiscal-calendar/events
    → FiscalCalendarService (caché por rango/categorías)
      → AeatPublicIcalendarProvider (producción y remoto)
          → caché por feed y coalescencia
          → feed público text/calendar
          → parser RFC 5545 acotado
          → normalización segura a texto plano
      → GooglePublicCalendarProvider (desarrollo local con clave)
      → FixtureFiscalCalendarProvider (desarrollo local sin clave)
```

Producción no necesita una API key. Consulta desde servidor las URLs iCalendar
públicas y canónicas que la propia AEAT enlaza. El navegador solo llama al
endpoint interno de la aplicación.

## Fuente oficial y catálogo

Fuente revisada el 13-07-2026:

- [Instrucciones iCalendar del calendario del contribuyente de la AEAT](https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/icalendar/instrucciones-integrar-calendario.html)

La allowlist vive en `src/lib/fiscal-calendar/catalog.ts` y contiene, por cada
categoría, el `calendarId` público y la URL canónica final del feed. La versión
`aeat-public-calendars-2026-07-13.v2` tiene el hash reproducible
`06bc4f95059c421d790d18ddc6d38218484ddb7a1ef6e351abf12aefa7973ee4`.

| Categoría | Feed público |
| --- | --- |
| Renta | iCalendar Renta enlazado por AEAT |
| Renta y Sociedades | iCalendar Renta y Sociedades enlazado por AEAT |
| Sociedades | iCalendar Sociedades enlazado por AEAT |
| IVA | iCalendar IVA enlazado por AEAT |
| Declaraciones informativas | iCalendar Declaraciones informativas enlazado por AEAT |

La página de la AEAT publica más categorías. Esta versión cubre exactamente las
cinco visibles en la interfaz; no se presenta como el calendario completo de
todos los impuestos especiales o sectoriales.

## Contrato del proveedor iCalendar

- Solo acepta URLs internas de la allowlist con `https`, host
  `calendar.google.com`, sin credenciales, puerto, query ni fragmento.
- No sigue redirecciones y nunca acepta una URL o `calendarId` del cliente.
- Exige `Content-Type: text/calendar`.
- Aplica timeout y reintentos acotados solo a fallos transitorios.
- Valida `Content-Length` cuando existe y cuenta los bytes reales de cada chunk.
- El límite es 3 MiB por feed; el feed Renta observado supera 1 MiB.
- Cancela reader y petición al exceder el límite.
- Despliega líneas RFC 5545, decodifica escapes ICS y limita líneas,
  propiedades y eventos.
- Preserva `DTSTART;VALUE=DATE` y el `DTEND` exclusivo sin convertirlos a UTC.
- Solo admite timestamps UTC completos para eventos con hora. Recurrencias no
  expandidas, fechas flotantes o `TZID` no soportados se omiten y marcan el
  resultado como truncado.
- Título y descripción pasan por el normalizador de texto plano; React nunca
  recibe HTML ejecutable.
- Los cinco feeds se consultan concurrentemente. Si falla uno, la respuesta
  completa falla de forma recuperable en vez de aparentar que el resultado
  parcial es todo el calendario.
- Cada feed se comparte durante diez minutos en memoria y las consultas
  idénticas conservan la caché de servicio de cinco minutos.

`STATUS:CONFIRMED` acredita el estado técnico del evento en el feed, no su
aplicabilidad personal. El tipo de plazo permanece `unclassified` si la fuente
no aporta metadatos estructurados y `reviewStatus` permanece
`review-with-advisor`; la UI muestra esa cautela por evento sin ocultar los
vencimientos ni inventar una clasificación.

## Diferencias observadas entre fuentes oficiales

Los textos se muestran tal como llegan del feed iCalendar. En la revisión del
13-07-2026 se observaron diferencias puntuales de año entre ciertos eventos y
las páginas HTML del calendario anual de la AEAT. No se corrigen mediante una
heurística ni se alteran silenciosamente; la fuente oficial permanece visible
para su contraste.

## Variables locales

El proveedor público de producción no necesita variables nuevas. El modo local
anterior sigue disponible:

```dotenv
FISCAL_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_API_KEY=
FISCAL_CALENDAR_LIVE_TEST=false
```

- Con clave, desarrollo local puede usar Google Calendar API REST v3.
- Sin clave, desarrollo local usa fixtures sintéticos claramente rotulados.
- Ninguna clave usa un nombre `NEXT_PUBLIC_*` ni se incluye en el bundle.

## Pruebas sin red

```bash
npx vitest run src/lib/fiscal-calendar \
  src/app/api/fiscal-calendar/events/route.test.ts \
  src/components/fiscal-calendar/FiscalCalendarView.test.ts
npx eslint src/lib/fiscal-calendar src/app/api/fiscal-calendar \
  src/app/consultor-fiscal/calendario src/components/fiscal-calendar
npm run typecheck
npm run build
```

Las pruebas usan feeds ICS sintéticos e inyectan `fetch`, reloj, esperas y
streams. Cubren CRLF y folding, Unicode, HTML, fechas all-day, cambio de año,
timeout, redirects, Content-Length, exceso real sin Content-Length, multibyte,
caché, filtrado y fallo completo de una categoría.

## Validación live

La validación previa a publicación consulta únicamente el endpoint local o la
web desplegada y compara el resultado con los feeds oficiales. Para el rango
13-07-2026 a 10-12-2026, las cinco categorías publicaban 25 eventos:

| Filtro | Eventos esperados |
| --- | ---: |
| Todas | 25 |
| Renta | 1 |
| Renta y Sociedades | 5 |
| Sociedades | 1 |
| IVA | 12 |
| Declaraciones informativas | 6 |

La prueba debe comprobar también enlaces de modelos, estado vacío en rangos sin
eventos, claro/oscuro, escritorio/móvil, ausencia de overflow, consola y
cabeceras `no-store`/`noindex`.

## Límites deliberados

- Sin personalización por perfil fiscal ni inferencias de modelos aplicables.
- Sin OAuth, tokens de usuario, escritura o sincronización bidireccional.
- Sin emails, SMS, push, cron ni notificaciones desde este módulo.
- Sin persistencia en Supabase, AppStore o almacenamiento local.
- Sin cálculo de festivos o traslado de plazos fuera de lo publicado.
- Sin correcciones heurísticas del texto externo.
- Sin las trece categorías sectoriales adicionales que la AEAT enlaza fuera de
  los cinco filtros actuales.
