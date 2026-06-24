# Auditoria tecnica profunda de Factura Autonomo

Fecha: 2026-06-24  
Version: 2, segunda pasada de auditoria con foco en produccion comercial  
Alcance: revision estatica del proyecto Next.js/React/TypeScript, SQL de Supabase, flujos de negocio, importador, Stripe, VeriFactu, PDF, legal y UX.  
Nota: este informe no sustituye una auditoria legal, fiscal, de seguridad ofensiva ni una validacion oficial VeriFactu/SIF. Sirve como mapa tecnico de riesgos y prioridades antes de produccion.

## Resumen ejecutivo

Factura Autonomo tiene una base de producto fuerte: modo gratis sin cuenta, datos locales, opcion Pro con nube, importacion desde programas antiguos, funciones IA y preparacion VeriFactu. La arquitectura esta bastante modularizada y hay una cobertura de tests notable para logica de dominio.

Los riesgos principales antes de produccion estan en cuatro zonas:

1. Politicas RLS de Supabase para suscripciones/uso demasiado permisivas.
2. VeriFactu real aun no debe venderse como cumplimiento completo: el envio AEAT esta simulado o incompleto y falta validacion formal.
3. Modo local con riesgo real de perdida de datos si el navegador borra localStorage.
4. Importacion y sincronizacion tienen buen diseno, pero necesitan mas controles de previsualizacion, informe post-importacion, auditoria y pruebas con varios MDB reales.

La segunda pasada anade dos conclusiones importantes:

5. Hay funciones de documento que pueden cambiar datos historicos de forma comoda pero peligrosa: fusionar clientes cambia el cliente congelado dentro de documentos existentes, y algunas acciones renumeran recibos/presupuestos despues de borrar.
6. Algunas funciones Pro estan protegidas en interfaz, pero no siempre de forma robusta en servidor. Esto no siempre es un riesgo legal, pero si es un riesgo comercial y de consistencia del producto.

## Segunda pasada de auditoria profunda

Esta segunda pasada se centro en puntos de cruce: que pasa cuando se mezclan documentos fiscales, nube, importaciones, pagos, IA y legal. Los hallazgos siguientes deben leerse como refuerzo de las secciones posteriores.

### Hallazgos de maxima prioridad

| ID | Prioridad | Hallazgo | Por que importa | Archivos implicados |
| --- | --- | --- | --- | --- |
| SP-C-01 | P0 | `user_subscriptions` y `user_usage` permiten escrituras del usuario autenticado por RLS. | Un usuario podria manipular plan, estado, trial, uso o saldo IA desde el cliente si conoce la API de Supabase. | `supabase/billing.sql`, `supabase/billing-scans.sql`, `supabase/billing-ai-units.sql`, `src/lib/billing/repository.ts` |
| SP-C-02 | P0 | El envio AEAT VeriFactu no implementa autenticacion con certificado cliente en la llamada real. | Puede generar QR, hash y registros locales, pero no debe presentarse como remision productiva validada. | `src/lib/verifactu/aeat-submit.ts`, `src/app/api/verifactu/register/route.ts` |
| SP-C-03 | P0 | La ruta de autorrelleno IA de clientes consulta la suscripcion con una funcion de navegador dentro de servidor. | En produccion puede ver `subscription = null` y bloquear a usuarios Pro como si fueran gratis. | `src/app/api/customers/parse/route.ts`, `src/lib/billing/repository.ts`, `src/lib/supabase/client.ts` |
| SP-C-04 | P0 | La aceptacion legal del alta no queda registrada con version, fecha e IP/usuario en servidor. | Para una app comercial con nube, pagos e IA, no basta con un checkbox local o de interfaz. | `src/components/cloud/CloudAccountCard.tsx`, `src/app/legal/*`, Supabase pendiente |
| SP-C-05 | P0 | El modo local sigue dependiendo de `localStorage`. | Es bueno para uso gratis sin cuenta, pero un borrado de navegador puede eliminar toda la actividad del usuario. | `src/lib/storage.ts`, `src/lib/backup.ts`, `src/context/AppStore.tsx` |

### Hallazgos altos

| ID | Prioridad | Hallazgo | Por que importa | Archivos implicados |
| --- | --- | --- | --- | --- |
| SP-H-01 | P1 | `mergeCustomers` sustituye el cliente congelado dentro de documentos ya existentes. | Contradice la idea correcta de que una factura emitida conserva snapshot de cliente. Puede alterar historico fiscal si se fusiona mal. | `src/context/AppStore.tsx`, `src/lib/customers.ts` |
| SP-H-02 | P1 | La renumeracion automatica despues de borrar documentos afecta presupuestos/recibos y recibos generados al desmarcar cobro. | En facturas emitidas esta bloqueado, pero en recibos puede crear confusion contable si ya se enviaron. | `src/context/AppStore.tsx`, `src/lib/documents.ts`, `src/lib/rectificativas.ts` |
| SP-H-03 | P1 | La importacion MDB esta bloqueada por plan en UI, pero el procesamiento ocurre en navegador. | Como control comercial es debil: una persona tecnica podria saltarse la pantalla. | `src/app/importar/page.tsx`, `src/lib/importers/pcfacturacion.ts` |
| SP-H-04 | P1 | El registro VeriFactu servidor confia en el documento enviado por el cliente y no lo cruza con una fuente servidor inmutable. | Un cliente manipulado podria registrar un documento distinto al que la app muestra localmente. | `src/app/api/verifactu/register/route.ts`, `src/lib/verifactu/server-db.ts` |
| SP-H-05 | P1 | La tabla `verifactu_records` no tiene unicidad por usuario/documento/tipo. | Dos peticiones simultaneas podrian duplicar registros antes de que el chequeo de duplicado gane la carrera. | `supabase/verifactu.sql`, `src/lib/verifactu/server-db.ts` |
| SP-H-06 | P1 | El consumo de unidades IA no es atomico. | Dos usos simultaneos pueden leer el mismo saldo y descontar mal. | `src/lib/billing/scan-usage-server.ts`, `supabase/billing-ai-units.sql` |

### Hallazgos medios

| ID | Prioridad | Hallazgo | Por que importa | Archivos implicados |
| --- | --- | --- | --- | --- |
| SP-M-01 | P2 | La sincronizacion resuelve conflictos por timestamp, sin pantalla de conflicto. | Es aceptable para MVP, pero en varios dispositivos puede sobrescribir cambios no esperados. | `src/lib/cloud/incremental.ts`, `src/context/CloudSyncContext.tsx` |
| SP-M-02 | P2 | Perfil y contadores se sincronizan como entidades singleton completas. | Cambios concurrentes en ajustes o numeracion pueden pisarse mas facilmente que documentos individuales. | `src/lib/cloud/diff.ts`, `src/lib/cloud/repository.ts` |
| SP-M-03 | P2 | El consentimiento IA se guarda por dispositivo, no como version aceptada en cuenta. | Para cuenta Pro y tratamiento por terceros conviene poder demostrar aceptacion. | `src/lib/ai-consent.ts`, `src/components/legal/AiProcessingConsentNotice.tsx` |
| SP-M-04 | P2 | Los limites de documentos/clientes del plan gratis se aplican principalmente en cliente/local. | Esta bien como experiencia de producto, pero no es un limite antifraude. | `src/context/BillingContext.tsx`, `src/lib/billing/usage.ts`, `src/lib/billing/plans.ts` |
| SP-M-05 | P2 | La importacion PCF elimina/reemplaza importaciones PCF previas, pero no genera backup previo automatico ni informe descargable. | Si el usuario importa el archivo equivocado, necesitara revertir con seguridad. | `src/app/importar/page.tsx`, `src/lib/importers/pcfacturacion.ts` |

### Decision de producto recomendada

Antes de comercializar, conviene separar mentalmente tres capas:

1. Funciones locales gratis: pueden tener limites amables, avisos y backup manual, pero deben explicar muy bien el riesgo de navegador.
2. Funciones Pro con coste real: importacion, nube, IA y plantillas deben tener control servidor si afectan a ingresos, saldo o datos compartidos.
3. Funciones fiscales: facturas emitidas, VeriFactu, registros y QR necesitan reglas mas duras que el resto de la app. Aqui no conviene renumerar, sobrescribir ni "arreglar" historico sin traza.

## Estructura general del proyecto

Proyecto Next.js App Router con TypeScript y React.

Archivos y carpetas principales:

- `src/app/`: rutas de la app, paginas y API routes.
- `src/components/`: componentes UI y modulos funcionales.
- `src/context/`: estado global local, nube y facturacion.
- `src/lib/`: dominio, calculos, importadores, PDF, VeriFactu, Stripe, Supabase, IA y manual.
- `supabase/`: SQL manual para crear tablas y politicas.
- `docs/`: documentacion tecnica/despliegue/precios/VeriFactu.
- `public/`: iconos, marca y manifest.

Dependencias clave:

- Next.js 15, React 19, TypeScript.
- Supabase JS para auth/base de datos.
- Stripe para pagos.
- `mdb-reader` para leer MDB en navegador.
- `jspdf` y `jspdf-autotable` para PDF.
- `qrcode` para QR VeriFactu.
- Vitest para tests.

Fortalezas:

- Separacion razonable entre UI, dominio y persistencia.
- Muchas funciones relevantes tienen tests.
- App pensada para funcionar localmente sin servidor de app propio.
- API routes para secretos: Stripe, email, IA y VeriFactu servidor.

Riesgos:

- Supabase SQL se aplica manualmente y por fases; hay riesgo de entornos desalineados.
- La app mezcla modo local, nube, fiscalidad e IA: necesita mensajes de producto muy claros.
- Algunas politicas SQL son permisivas para datos que no deberian poder manipularse desde cliente.

## Modelo de datos

Archivos implicados:

- `src/lib/types.ts`
- `src/lib/storage.ts`
- `src/context/AppStore.tsx`
- `src/lib/documents.ts`
- `src/lib/customers.ts`
- `src/lib/calculations.ts`

### BusinessProfile

Contiene datos del emisor:

- nombre, NIF, direccion, ciudad, CP, telefono, email, IBAN, logo.
- configuracion IVA e IRPF.
- numeracion.
- VeriFactu.
- frases, formas de pago, unidades y plantilla PDF.

Riesgo medio:

- Es un objeto muy central y cambia con muchas funciones. Cualquier migracion incompleta puede romper PDFs, numeracion, VeriFactu o importacion.

Recomendacion:

- Mantener `migrateProfile` y `normalizeLoadedData` como punto unico de compatibilidad.
- Versionar schema de datos local en `AppMeta`.

### Customer

Cliente separado de los documentos. Incluye nombre, NIF, email, telefono, direccion, CP, ciudad y notas.

Fortaleza:

- Al guardar documentos, el cliente queda congelado como `Client` dentro del documento. Esto evita que facturas emitidas cambien si editas la ficha del cliente.

Riesgo medio:

- Duplicados por NIF/nombre ya se controlan parcialmente, pero importaciones pueden crear clientes importados con prefijo y no unificarlos con manuales.

### Document

Representa factura, presupuesto o recibo.

Campos clave:

- `type`: factura, presupuesto, recibo.
- `number`, `date`, `dueDate`.
- `client`: cliente congelado.
- `items`: lineas.
- `status`: borrador, enviado, aceptado, pagado, vencido, rectificada, anulada.
- `issuer`: emisor congelado.
- `verifactu`: registro VeriFactu.
- relaciones de rectificacion y recibos.

Fortaleza:

- El snapshot de emisor y cliente es correcto para preservar documentos emitidos.

Riesgo alto:

- En modo nube, los documentos se sincronizan como entidades editables. Para documentos emitidos/VeriFactu conviene endurecer inmutabilidad funcional y auditoria.

### LineItem

Linea de documento:

- descripcion, cantidad, unidad, precio unitario, IVA.

Riesgo medio:

- No parece haber validacion estricta de importes negativos, decimales extremos o casos fiscales especiales en todas las entradas. Puede ser aceptable para MVP, pero antes de produccion conviene reforzar.

### Expense

Gasto:

- proveedor, descripcion, importe, IVA, categoria, forma de pago y gasto fijo origen.

Fortaleza:

- Tiene filtros, export CSV e IA de escaneo.

Riesgo medio:

- La IA rellena datos pero el usuario debe revisar; el aviso ya esta implementado.

### AppData

Objeto raiz:

- `profile`
- `documents`
- `customers`
- `expenses`
- `recurringExpenses`
- `userReminders`
- `suppliers`
- `counters`
- `verifactuChain`
- `meta`

Riesgo alto:

- Al ser el contenedor completo de la app, las importaciones y backups pueden sustituir mucho estado. Hay confirmaciones, pero conviene ampliar informes y backups previos automaticos.

## Persistencia local en navegador

Archivos implicados:

- `src/lib/storage.ts`
- `src/context/AppStore.tsx`
- `src/lib/backup.ts`
- `src/components/settings/DataOwnershipCard.tsx`
- `src/components/cloud/CloudAccountCard.tsx`

Funcionamiento:

- La app guarda `AppData` en `localStorage` con clave `factura-autonomo-data`.
- `loadData()` lee y normaliza.
- `saveData()` escribe, con una proteccion para no sobreescribir datos existentes con un estado en memoria vacio.
- Hay export/import JSON manual.
- Modo local funciona sin cuenta.

Fortalezas:

- Baja friccion comercial: el usuario puede empezar sin registro.
- Normalizacion protege contra cambios de schema.
- Existe exportacion manual.

Hallazgo critico C-LOCAL-01:

- Riesgo de perdida total de datos si el usuario borra datos del navegador, cambia de navegador/dispositivo, usa modo privado, limpia almacenamiento, se corrompe localStorage o el navegador purga almacenamiento.

Prioridad: P0 antes de produccion.

Archivos implicados:

- `src/lib/storage.ts`
- `src/components/settings/DataOwnershipCard.tsx`
- `src/components/cloud/CloudAccountCard.tsx`
- `src/context/AppStore.tsx`

Recomendaciones:

- Mostrar aviso persistente/periodico en modo local hasta que el usuario exporte copia o active nube.
- Añadir fecha de ultimo backup exportado.
- Ofrecer recordatorio automatico de copia cada X dias.
- Antes de importaciones masivas, crear backup local automatico descargable o snapshot recuperable.
- Considerar IndexedDB para volumen grande, porque localStorage puede ser limitado y bloqueante.

## Sincronizacion con Supabase

Archivos implicados:

- `src/context/CloudSyncContext.tsx`
- `src/lib/cloud/diff.ts`
- `src/lib/cloud/incremental.ts`
- `src/lib/cloud/repository.ts`
- `src/lib/cloud/sync-queue.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/admin.ts`
- `supabase/schema.sql`

Funcionamiento:

- Sincronizacion incremental por entidad en tabla `sync_entities`.
- Tabla antigua `user_backups` se mantiene para compatibilidad/migracion.
- Cada cambio se convierte en `SyncChange`.
- Las entidades se suben con upsert por `(user_id, entity_type, entity_id)`.
- Al descargar, se aplican cambios remotos sobre local.
- Si hay cambios locales pendientes, intenta subirlos antes de bajar.
- Hay cola offline y reintentos.
- Existe reparacion manual: descargar copia completa de nube.

Fortalezas:

- Mejor que una unica copia JSON completa: reduce sobrescrituras masivas.
- Tiene modo offline y reintento.
- Migra backups antiguos a entidades.
- Hay indicadores de estado y reparacion manual.

Hallazgo medio M-SYNC-01:

- Conflictos tipo "ultimo cambio gana" por entidad. Si dos dispositivos editan el mismo documento/cliente offline, puede ganar el timestamp mas reciente sin resolucion visible para el usuario.

Prioridad: P1.

Archivos implicados:

- `src/lib/cloud/incremental.ts`
- `src/lib/cloud/diff.ts`
- `src/context/CloudSyncContext.tsx`

Recomendaciones:

- Registrar conflictos cuando local y remoto cambian la misma entidad.
- Mostrar aviso "hemos detectado cambios en dos dispositivos".
- Para documentos emitidos, evitar edicion directa y forzar rectificacion.

Hallazgo medio M-SYNC-02:

- `sync_entities` permite al cliente autenticado crear/actualizar sus propias entidades. Es normal para nube personal, pero no da integridad fiscal fuerte: un usuario puede alterar payloads desde cliente o consola.

Prioridad: P1 si se vende como sistema fiscal robusto.

Archivos implicados:

- `supabase/schema.sql`
- `src/lib/cloud/repository.ts`

Recomendaciones:

- Separar datos operativos editables de registros fiscales/auditoria.
- Mantener documentos VeriFactu emitidos en tablas servidor inmutables.
- Para registros fiscales, escribir solo con service role desde API.

## Integracion Stripe

Archivos implicados:

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/checkout-scan-pack/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/billing/stripe.ts`
- `src/lib/billing/server-auth.ts`
- `src/lib/billing/payment-receipt-email.ts`
- `src/lib/billing/sync-billing-profile.ts`
- `supabase/billing.sql`
- `supabase/billing-profile.sql`
- `supabase/billing-scan-credits.sql`

Funcionamiento:

- Checkout requiere Bearer token de Supabase.
- Stripe Checkout crea suscripcion Pro mensual/anual.
- Portal permite gestionar suscripcion.
- Pack de escaneos extra solo para Pro.
- Webhook valida firma con `STRIPE_WEBHOOK_SECRET`.
- Eventos manejados:
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.updated`
- Recibos por email tienen deduplicacion por `stripe_event_id` a nivel de lectura.

Fortalezas:

- No se almacenan tarjetas.
- Webhook valida firma.
- Metadata `user_id` vincula sesiones y suscripciones.
- Tax ID y billing address activados.

Hallazgo critico C-RLS-01:

- `supabase/billing.sql` crea politicas RLS que permiten al usuario autenticado insertar y actualizar su propia fila en `user_subscriptions` y `user_usage`. Si estas tablas son accesibles desde cliente con anon key, un usuario podria intentar elevarse a Pro, manipular status, creditos IA o uso.

Prioridad: P0 antes de produccion.

Archivos implicados:

- `supabase/billing.sql`
- `supabase/billing-scans.sql`
- `supabase/billing-ai-units.sql`
- `src/lib/billing/repository.ts`
- `src/lib/billing/scan-usage-server.ts`

Recomendacion:

- Para `user_subscriptions`: cliente solo `select` de su fila. `insert/update/delete` solo service role desde API/webhooks.
- Para `user_usage`: valorar solo `select` cliente y escrituras servidor mediante API. Si el cliente necesita escribir uso, hacerlo con RPC segura y validaciones.
- Revisar que no haya policies antiguas activas en Supabase real.

Hallazgo medio M-STRIPE-01:

- La deduplicacion de recibos depende de consultar `payment_receipts` por `stripe_event_id`, pero debe haber indice unico en base de datos para ser robusta ante concurrencia/reintentos simultaneos.

Prioridad: P1.

Archivos implicados:

- `src/lib/billing/payment-receipt-email.ts`
- `supabase/billing-profile.sql` o migracion equivalente.

Recomendacion:

- Confirmar `unique(stripe_event_id)` en SQL.
- Registrar todos los eventos recibidos o al menos los procesados con estado.

## Importador PC Facturacion 3.0 MDB/DWI

Archivos implicados:

- `src/app/importar/page.tsx`
- `src/lib/importers/pcfacturacion.ts`
- `src/lib/importers/pcfacturacion.test.ts`
- `src/lib/manual/sections/importacion.ts`
- `src/lib/storage.ts`

### Funcionamiento general

La pantalla `/importar` permite elegir origen:

- detectar automaticamente,
- PC Facturacion 3.0,
- PrestaShop proximo,
- Excel/CSV proximo.

Ahora mismo el importador real es PC Facturacion 3.0.

La importacion es funcion Pro. Actualmente, si `billingEnabled && !limits.databaseImport`, se bloquea el analisis.

Flujo de usuario actual:

1. El usuario entra en `/importar`.
2. Elige origen: auto, PC Facturacion 3.0, PrestaShop futuro o CSV/Excel futuro.
3. Si elige PC Facturacion, aparece el archivo DWI opcional.
4. Selecciona MDB.
5. La app analiza el MDB en el navegador.
6. Si hay facturas antiguas marcadas como impagadas, la app pregunta si mantenerlas asi o marcarlas como pagadas.
7. Muestra previsualizacion: empresa, clientes, facturas, presupuestos, lineas, fechas, numeracion y avisos.
8. Al pulsar "Importar a esta cuenta", se llama a `replaceData(result.data)`.
9. Si hay sesion en nube, esos cambios se suben despues mediante sincronizacion.

Lectura de producto:

- La base para venderlo como "importador universal" esta bien planteada porque ya existe selector de origen.
- El codigo real todavia solo interpreta PC Facturacion 3.0.
- "Detectar automaticamente" en la practica significa intentar PC Facturacion por tablas, no detectar muchos programas.
- Para comercializar, conviene que cada origen tenga un adaptador independiente y una pantalla de pasos propia.

### Lectura MDB

`readPcFacturacionMdb()`:

1. Importa dinamicamente `mdb-reader`.
2. Lee el archivo con `file.arrayBuffer()`.
3. Crea `MDBReader`.
4. Valida tablas requeridas:
   - `Client`
   - `Contacts`
   - `Invoice`
   - `Offer`
   - `Positions`
5. Lee esas tablas y llama a `buildPcFacturacionImport()`.

Deteccion:

- Por estructura de tablas, no por nombre de archivo.
- Si faltan tablas, se rechaza.

### Datos de empresa

Tabla `Client`, primera fila:

- `Company` -> nombre.
- `VatID` / `TaxNumber` -> NIF.
- `Street`, `Town`, `ZIP`.
- `Telephone` / `Mobile`.
- `Email`.
- `AccountNumber1` -> IBAN/cuenta.
- IVA por defecto: `[0, 10, 21]`, default 21.

### Clientes

Tabla `Contacts`.

Campos principales:

- `CustomerNumber` como id de origen.
- `Company`, `Name`, `Surname`, `Matchcode` para nombre visible.
- `TaxNumber`, `VatID` para NIF/CIF.
- `Street`, `ZIP`, `Town`.
- `Telephone`, `Mobile`, `Email`.
- `Notice`.
- `CustomerDate`.

Logica:

- Ignora contactos vacios.
- Detecta empresas por patrones como S.L., S.A., CIF, comunidad, asociacion.
- Divide personas en nombre/apellidos.
- Permite importar solo clientes con documentos o tambien clientes sin documentos.

### Facturas

Tabla `Invoice`.

Campos:

- `InvoiceNumber`.
- `Date`.
- `DuePayment`.
- `CustomerNumber`.
- `Text`, `Impartation`.
- `PaymentPractice`, `MethodPayment`.
- `Canceled`.
- `Paid`.

Estados:

- `Canceled` -> `anulada`.
- `Paid` -> `pagado`.
- Si no esta pagada -> `enviado`.
- Existe opcion de marcar todas las impagadas como pagadas durante la importacion.

### Presupuestos

Tabla `Offer`.

Campos:

- `OfferNumber`.
- `Date`.
- `CustomerNumber`.
- `InvoiceNumber` para detectar aceptado.

Estados:

- Con `InvoiceNumber` -> `aceptado`.
- Sin `InvoiceNumber` -> `enviado`.

### Lineas: Positions

Tabla `Positions`.

Agrupacion:

- `Document = "Factura"` -> facturas.
- `Document = "Presupuesto"` -> presupuestos.
- `DocumentNumber` enlaza con `InvoiceNumber` o `OfferNumber`.

Mapeo a `LineItem`:

- descripcion: `ShortText` + `LongText`, o `ArticleNumber`, o "Concepto importado".
- cantidad: `Quantity`, por defecto 1.
- unidad: `Unit`.
- precio neto: `UnitpriceNet`.
- IVA: `VatCode` si contiene numero; si no, calculo `UnitpriceVat / UnitpriceNet`; fallback 21.

Avisos:

- Cuenta lineas huerfanas: lineas que apuntan a documentos sin cabecera.

### DWI opcional

El DWI se lee con `TextDecoder("windows-1252")`.

Se parsea como INI con secciones:

- `[NumberRange]`
- `[Token]`

Extrae:

- proxima factura,
- proximo presupuesto,
- proximo recibo,
- proximo cliente,
- formato de numeracion.

La app guarda ultimo numero usado; si el DWI dice proxima factura 100, se guarda 99.

### Previsualizacion

Muestra:

- origen detectado,
- empresa detectada,
- clientes,
- facturas,
- presupuestos,
- lineas,
- fechas,
- numeracion DWI,
- facturas impagadas,
- avisos.

### Aplicacion e idempotencia

IDs importados:

- `pcfacturacion:customer:*`
- `pcfacturacion:factura:*`
- `pcfacturacion:presupuesto:*`
- `pcfacturacion:line:*`

Al reimportar:

- elimina facturas/presupuestos/clientes con ese prefijo,
- conserva datos manuales,
- recalcula contadores.

Que se conserva:

- Documentos manuales.
- Clientes manuales.
- Gastos.
- Proveedores.
- Recordatorios.
- Otros datos no generados por el importador PCF.

Que se reemplaza:

- Clientes importados previamente con prefijo `pcfacturacion:customer:`.
- Facturas importadas previamente con prefijo `pcfacturacion:factura:`.
- Presupuestos importados previamente con prefijo `pcfacturacion:presupuesto:`.
- Perfil de empresa detectado desde `Client`, mezclado con perfil actual.
- Numeracion si se proporciona DWI reconocible.

Riesgo de sobrescritura:

- La idempotencia evita duplicar el mismo MDB si se reimporta.
- No evita duplicar clientes si el usuario ya habia creado manualmente clientes iguales antes de importar.
- No hace un diff de perfil/numeracion antes de aplicarlo.
- No crea automaticamente una copia de seguridad antes de reemplazar datos importados.

Riesgo de sincronizacion:

- La importacion puede generar cientos o miles de cambios locales.
- En una cuenta con nube, esos cambios se suben mediante la cola normal.
- Si el usuario abre movil/PC a la vez, la sincronizacion deberia terminar, pero la UX debe explicar que puede tardar y que no hay que cerrar la app demasiado pronto.

Recomendacion de importador comercial:

1. Permitir previsualizacion gratis, pero bloquear la aplicacion final si no es Pro.
2. Crear backup automatico antes de aplicar.
3. Mostrar resumen de "se reemplazaran X documentos PCF previos".
4. Mostrar diff de empresa/numeracion.
5. Detectar posibles duplicados manuales por NIF, email o nombre normalizado.
6. Generar informe post-importacion descargable.
7. Guardar un `importSessionId` para poder rastrear de donde vino cada documento.

Hallazgo medio M-IMPORT-01:

- Bloquear el analisis completo a usuarios no Pro reduce conversion. Mejor permitir previsualizar gratis y bloquear "Importar a esta cuenta".

Prioridad: P2 comercial.

Archivos:

- `src/app/importar/page.tsx`

Hallazgo medio M-IMPORT-02:

- No hay informe post-importacion descargable ni backup automatico previo a importacion masiva.

Prioridad: P1.

Archivos:

- `src/app/importar/page.tsx`
- `src/lib/importers/pcfacturacion.ts`
- `src/lib/backup.ts`

Hallazgo medio M-IMPORT-03:

- No deduplica clientes importados contra clientes manuales existentes por NIF/nombre. Evita duplicados de reimportacion por prefijo, pero no fusiona con datos ya creados en la app.

Prioridad: P1.

Archivos:

- `src/lib/importers/pcfacturacion.ts`
- `src/lib/customers.ts`

Hallazgo medio M-IMPORT-04:

- El parseo de campos PCF es pragmatico, pero depende de nombres de tabla/campo concretos. Debe probarse con varios MDB reales de distintas instalaciones.

Prioridad: P1.

## VeriFactu y PDF con QR tributario

Archivos implicados:

- `src/lib/verifactu/register.ts`
- `src/lib/verifactu/store.ts`
- `src/lib/verifactu/qr.ts`
- `src/lib/verifactu/qr-image.ts`
- `src/lib/verifactu/xml.ts`
- `src/lib/verifactu/aeat-submit.ts`
- `src/lib/verifactu/server-db.ts`
- `src/app/api/verifactu/register/route.ts`
- `src/lib/pdf.ts`
- `supabase/verifactu.sql`

Funcionamiento:

- Si el documento requiere VeriFactu, se calcula registro:
  - hash actual,
  - hash anterior,
  - timestamp,
  - tipo factura,
  - importe total,
  - cuota IVA,
  - URL QR AEAT.
- En local se puede adjuntar `verifactu` al documento.
- En servidor hay endpoint `/api/verifactu/register` para persistir registro y cadena en Supabase.
- PDF genera QR como imagen si `doc.verifactu.qrUrl` existe.
- QR PDF:
  - tamano 35 mm,
  - texto "QR tributario:",
  - frase "Factura verificable en la sede electronica de la AEAT".

Fortalezas:

- Hay separacion entre QR, XML, hash, timestamp, tipo factura.
- Hay tests de varios modulos VeriFactu.
- `supabase/verifactu.sql` solo permite lectura cliente de registros/cadena; escrituras son por service role.

Hallazgo critico C-VERI-01:

- `submitRegistroToAeat()` no parece implementar realmente autenticacion con certificado P12 en la llamada `fetch`. Aunque lee configuracion de certificado, no usa el P12 para una conexion mTLS real. Si `VERIFACTU_AEAT_SUBMIT=true`, el envio podria fallar o no cumplir requisitos de AEAT.

Prioridad: P0 antes de afirmar envio real o cumplimiento VeriFactu.

Archivos:

- `src/lib/verifactu/aeat-submit.ts`
- `src/lib/verifactu/config.ts`
- `src/app/api/verifactu/register/route.ts`

Recomendacion:

- Implementar cliente HTTP con certificado en runtime Node compatible.
- Validar contra entorno AEAT correspondiente.
- Guardar respuesta real y errores estructurados.

Hallazgo critico C-VERI-02:

- La comunicacion publica debe evitar "homologado", "100% cumple" o "compatible" si no hay validacion completa. Las paginas legales ya son prudentes, pero hay que revisar landing, precios y marketing.

Prioridad: P0 legal/comercial.

Archivos:

- `src/app/legal/verifactu/page.tsx`
- `src/app/precios/page.tsx`
- `docs/VERIFACTU.md`
- textos publicos futuros.

Hallazgo medio M-VERI-01:

- `findVerifactuRecordByDocument()` reconstruye `VerifactuInfo` con `environment: "test"` fijo. Si se usa produccion, puede devolver estado inconsistente.

Prioridad: P1.

Archivo:

- `src/lib/verifactu/server-db.ts`

Hallazgo medio M-VERI-02:

- El PDF coloca el QR al inicio y con tamano adecuado, pero conviene generar pruebas visuales automatizadas para facturas largas, logos grandes, plantillas Pro y rectificativas.

Prioridad: P1.

Archivo:

- `src/lib/pdf.ts`

## Legal

Archivos implicados:

- `src/app/legal/aviso-legal/page.tsx`
- `src/app/legal/terminos/page.tsx`
- `src/app/legal/privacidad/page.tsx`
- `src/app/legal/cookies/page.tsx`
- `src/app/legal/encargo-tratamiento/page.tsx`
- `src/app/legal/verifactu/page.tsx`
- `src/components/cloud/CloudAccountCard.tsx`
- `src/components/legal/AiProcessingConsentNotice.tsx`
- `src/lib/ai-consent.ts`
- `src/app/precios/page.tsx`
- `src/app/cuenta/page.tsx`

Estado actual:

- Hay paginas legales base.
- Estan marcadas como borrador operativo.
- Alta de cuenta exige aceptar terminos y privacidad.
- Funciones IA exigen aceptacion una vez por dispositivo.
- Cuenta incluye tarjeta "Legal y privacidad".
- Precios enlaza a terminos, privacidad, cookies y encargo.

Hallazgo medio M-LEGAL-01:

- Los textos legales contienen campos pendientes: titular, NIF, domicilio, email, proveedor IA final, subencargados, transferencias internacionales.

Prioridad: P0 antes de comercializar.

Hallazgo medio M-LEGAL-02:

- El consentimiento IA se guarda en localStorage por dispositivo. Si el usuario usa otro dispositivo, se pedira de nuevo; si borra datos, tambien. Es aceptable, pero no queda vinculado a cuenta/usuario.

Prioridad: P2.

Recomendacion:

- Para Pro/nube, guardar version de consentimiento IA en Supabase por usuario.
- Registrar version de terminos aceptados en cuenta.

## Riesgos de perdida de datos en modo local

Hallazgo critico C-DATA-01:

- El modo local es una ventaja comercial, pero tambien el mayor riesgo reputacional: el usuario puede creer que "esta guardado" cuando solo esta en su navegador.

Prioridad: P0.

Archivos implicados:

- `src/lib/storage.ts`
- `src/components/settings/DataOwnershipCard.tsx`
- `src/components/cloud/CloudAccountCard.tsx`
- `src/lib/backup.ts`

Mejoras recomendadas:

- Aviso recurrente hasta primer backup.
- Indicador "Solo en este dispositivo" visible pero no invasivo.
- Backup previo automatico al importar MDB/JSON.
- Boton de exportacion en mas sitios criticos.
- Restauracion desde ultimo snapshot local si una importacion sale mal.

## Riesgos de duplicados o sobrescritura en importaciones

Hallazgo medio M-DUP-01:

- Reimportar PCF es idempotente por prefijo, pero no hay fusion con datos manuales existentes.

Prioridad: P1.

Hallazgo medio M-DUP-02:

- Al aplicar importacion se actualiza perfil de empresa y numeracion. Si el usuario ya habia configurado su perfil moderno, el importador puede sobrescribir campos con datos antiguos.

Prioridad: P1.

Archivos:

- `src/lib/importers/pcfacturacion.ts`
- `src/app/importar/page.tsx`

Recomendacion:

- En previsualizacion, mostrar explicitamente cambios de perfil que se van a aplicar.
- Permitir elegir: importar datos de empresa si/no.
- Hacer backup automatico previo.

## Seguridad

### Variables de entorno

Archivos:

- `.env.example`
- `.env.local`
- `src/lib/supabase/admin.ts`
- `src/lib/billing/stripe.ts`
- `src/lib/email/send.ts`
- `src/lib/verifactu/config.ts`

Observaciones:

- Claves publicas `NEXT_PUBLIC_*` se exponen al navegador por diseno.
- Service role, Stripe secret, webhook secret, Resend, OpenAI, Google Maps y certificado deben estar solo en servidor.
- `.env.local` existe en local; confirmar que esta en `.gitignore` y nunca se ha commiteado.

Prioridad: P0 antes de produccion.

### Supabase policies

Hallazgo critico ya indicado: RLS de billing demasiado permisiva.

Adicional:

- `sync_entities` permite al usuario modificar sus propios datos; correcto para datos funcionales, insuficiente para registros fiscales inmutables.
- `verifactu_records` y `verifactu_chain_state` solo tienen select cliente, lo cual es mejor.

### Stripe webhooks

Fortalezas:

- Firma validada.
- Eventos principales cubiertos.
- Uso de service role para actualizar suscripcion.

Riesgos:

- Falta confirmar indice unico de recibos/eventos.
- Conviene registrar errores de webhook y reintentos.
- En `customer.subscription.updated`, status `past_due` solo actualiza status pero mantiene plan; revisar si se quiere limitar funciones Pro en past_due.

Prioridad: P1.

### IA externa

Fortalezas:

- API routes servidor para OpenAI.
- Aviso de consentimiento antes de usar.

Riesgos:

- Falta completar legalmente proveedor, region, retencion y garantias.
- Falta versionar consentimiento por usuario en nube.

Prioridad: P1 legal, P2 tecnico.

## UX de landing y flujo gratis -> Pro

Archivos implicados:

- `src/app/page.tsx`
- `src/app/precios/page.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/billing/PlanStatusCard.tsx`
- `src/components/billing/UpgradeModal.tsx`
- `src/lib/billing/plans.ts`

Estado actual:

- La pantalla inicial dentro de la app es dashboard/acciones rapidas, no landing publica.
- Precios explica Gratis vs Pro.
- El plan Gratis limita documentos y clientes, mantiene PDF, logo, gastos y export/import manual.
- Pro incluye nube, importador, IA, plantillas, exportaciones, ilimitado.

Hallazgo medio M-UX-01:

- Falta una landing publica clara orientada a usuario nuevo. La home actual presupone que el usuario ya esta dentro de la app.

Prioridad: P1 comercial.

Recomendacion:

- Crear landing o estado inicial para usuario sin datos:
  - "Haz facturas gratis sin cuenta".
  - "Tus datos se guardan en este dispositivo".
  - "Activa Pro si quieres nube, importador e IA".
  - "Preparado para VeriFactu" con lenguaje prudente.

Hallazgo medio M-UX-02:

- El importador Pro podria convertir mejor si permite previsualizacion gratis y bloquea solo la aplicacion final.

Prioridad: P2 comercial.

## Errores o deuda tecnica importante

### Deuda D-01: SQL manual por fases

Prioridad: P1.

Riesgo:

- Facil que produccion tenga migraciones incompletas o policies antiguas.

Archivos:

- `supabase/*.sql`
- `docs/FASES.md`

Recomendacion:

- Crear migraciones ordenadas y checklist automatizado.
- Script de verificacion de tablas/policies requeridas.

### Deuda D-02: Estado central grande en cliente

Prioridad: P2.

Riesgo:

- `AppData` crece con toda la app; localStorage puede quedarse corto y bloquear UI.

Recomendacion:

- Evaluar IndexedDB.
- Paginacion/logica incremental para historicos grandes.

### Deuda D-03: Importador PCF con mapping fijo

Prioridad: P1.

Riesgo:

- Puede fallar con variantes reales de MDB.

Recomendacion:

- Bateria de fixtures anonimizadas de distintos usuarios.
- Informe post-importacion.
- Vista de muestra de clientes/documentos antes de aplicar.

### Deuda D-04: Legal en borrador

Prioridad: P0.

Riesgo:

- No listo para comercializacion.

Recomendacion:

- Completar titular, proveedor IA, subencargados, transferencias, bajas, soporte, retencion y DPA.

## Hallazgos criticos

| ID | Prioridad | Hallazgo | Archivos implicados | Accion recomendada |
| --- | --- | --- | --- | --- |
| C-RLS-01 | P0 | RLS permite insertar/actualizar `user_subscriptions` y `user_usage` desde usuario autenticado. Riesgo de manipulacion de plan, trial, uso o creditos. | `supabase/billing.sql`, `supabase/billing-scans.sql`, `supabase/billing-ai-units.sql`, `src/lib/billing/repository.ts` | Cliente solo lectura; escrituras solo service role/API/RPC segura. Revisar Supabase real. |
| C-VERI-01 | P0 | Envio AEAT no implementa mTLS/certificado P12 real en `fetch`; no vender como remision VeriFactu productiva. | `src/lib/verifactu/aeat-submit.ts`, `src/app/api/verifactu/register/route.ts` | Implementar cliente certificado y validar en entorno AEAT. |
| C-AI-01 | P0 | La API de autorrelleno IA de clientes usa `fetchUserSubscription`, que depende de Supabase cliente de navegador y devuelve `null` en servidor. Puede bloquear Pro. | `src/app/api/customers/parse/route.ts`, `src/lib/billing/repository.ts`, `src/lib/supabase/client.ts` | Crear lector admin/server de suscripcion para API routes. Anadir test de usuario Pro. |
| C-DATA-01 | P0 | Modo local puede perder todos los datos si se borra almacenamiento del navegador. | `src/lib/storage.ts`, `src/lib/backup.ts`, `DataOwnershipCard`, `CloudAccountCard` | Avisos, backup recurrente, snapshot antes de importaciones. |
| C-LEGAL-01 | P0 | Legal aun es borrador con campos pendientes. | `src/app/legal/*` | Revision profesional antes de vender. |
| C-LEGAL-02 | P0 | No hay registro servidor de version/fecha de aceptacion de terminos, privacidad, IA externa y encargo de tratamiento. | `src/components/cloud/CloudAccountCard.tsx`, `src/app/legal/*`, Supabase pendiente | Crear tabla de consentimientos legales versionados por usuario. |
| C-VERI-02 | P0 | Riesgo de claims comerciales excesivos sobre VeriFactu. | textos publicos, `src/app/legal/verifactu/page.tsx`, `src/app/precios/page.tsx` | Usar lenguaje prudente hasta certificacion/validacion. |
| C-DOC-01 | P0/P1 | Fusionar clientes modifica snapshots de cliente dentro de documentos existentes; para facturas emitidas debe evitarse o quedar auditado. | `src/context/AppStore.tsx`, `src/lib/customers.ts` | No alterar documentos emitidos; solo cambiar ficha maestra o pedir confirmacion fiscal con traza. |

## Hallazgos medios

| ID | Prioridad | Hallazgo | Archivos implicados | Accion recomendada |
| --- | --- | --- | --- | --- |
| M-SYNC-01 | P1 | Conflictos de edicion entre dispositivos se resuelven por timestamp sin UI de conflicto. | `src/lib/cloud/incremental.ts`, `src/context/CloudSyncContext.tsx` | Deteccion y aviso de conflictos. |
| M-SYNC-02 | P1 | Perfil y contadores se sincronizan como entidades singleton completas; ediciones concurrentes pueden pisarse. | `src/lib/cloud/diff.ts`, `src/lib/cloud/repository.ts` | Separar campos criticos o mostrar aviso cuando hay conflicto. |
| M-IMPORT-01 | P1 | Importacion no genera informe descargable ni backup previo automatico. | `src/app/importar/page.tsx`, `src/lib/importers/pcfacturacion.ts` | Informe post-importacion y backup previo. |
| M-IMPORT-02 | P1 | Clientes importados no se fusionan con clientes manuales por NIF/nombre. | `src/lib/importers/pcfacturacion.ts`, `src/lib/customers.ts` | Asistente de coincidencias/deduplicacion. |
| M-IMPORT-03 | P1 | El importador puede sobrescribir perfil/numeracion con datos antiguos. | `src/lib/importers/pcfacturacion.ts` | Mostrar cambios de perfil y permitir opt-out. |
| M-IMPORT-04 | P1 | La importacion Pro se valida en UI, pero el MDB se procesa en navegador. | `src/app/importar/page.tsx` | Si es una funcion comercial cerrada, mover validacion/aplicacion a servidor o RPC autorizada. |
| M-VERI-01 | P1 | `server-db.ts` reconstruye `environment: "test"` fijo en registros existentes. | `src/lib/verifactu/server-db.ts` | Persistir y devolver entorno real. |
| M-VERI-02 | P1 | `verifactu_records` no tiene unicidad por usuario/documento/tipo. | `supabase/verifactu.sql`, `src/lib/verifactu/server-db.ts` | Indice unico y operacion idempotente. |
| M-VERI-03 | P1 | La API VeriFactu confia en el documento recibido desde cliente. | `src/app/api/verifactu/register/route.ts` | Registrar desde fuente servidor o validar hash/snapshot firmado. |
| M-STRIPE-01 | P1 | Confirmar unicidad de `stripe_event_id` para recibos/webhooks. | `payment-receipt-email.ts`, SQL billing profile | Indice unico y log de eventos. |
| M-AI-01 | P1 | Descuento de unidades IA no es atomico. | `src/lib/billing/scan-usage-server.ts`, `supabase/billing-ai-units.sql` | RPC SQL transaccional con condicion `saldo >= coste`. |
| M-DOC-01 | P1 | Renumeracion automatica de recibos/presupuestos tras borrados puede confundir historicos enviados. | `src/context/AppStore.tsx`, `src/lib/documents.ts` | No renumerar documentos no borrador o anadir modo "anulado" con huecos aceptados. |
| M-UX-01 | P1 | Home actual es app interna, no landing publica clara. | `src/app/page.tsx`, `src/app/precios/page.tsx` | Landing/estado inicial para usuarios nuevos. |
| M-LEGAL-02 | P2 | Consentimiento IA se guarda solo por dispositivo. | `src/lib/ai-consent.ts`, `AiProcessingConsentNotice` | Guardar version por usuario en Supabase para cuentas Pro. |
| M-PERF-01 | P2 | localStorage y AppData completo pueden sufrir con historicos grandes/importaciones. | `src/lib/storage.ts`, `AppStore.tsx` | Evaluar IndexedDB y carga incremental. |

## Mejoras recomendadas

### P0 antes de produccion

1. Corregir RLS de billing y uso.
2. Corregir la API de autorrelleno IA de clientes para que lea suscripciones en servidor.
3. Completar legal con datos reales, revision profesional y registro de aceptacion versionado.
4. Asegurar que no se vende VeriFactu como cumplimiento completo hasta validacion.
5. Endurecer copia/backup en modo local.
6. Revisar secretos en Vercel y confirmar que `.env.local` no esta versionado.

### P1 antes de primer lanzamiento publico

1. Validar Stripe webhooks con reintentos, idempotencia e indices unicos.
2. Crear landing publica clara.
3. Mejorar importador con wizard, backup previo e informe final.
4. Probar importador con varios MDB reales anonimizados.
5. Pruebas visuales de PDFs con QR, logos, plantillas y documentos largos.
6. Script/checklist de Supabase para verificar tablas y policies reales.
7. Bloquear cambios historicos peligrosos: merge de clientes en documentos emitidos y renumeracion de recibos enviados.
8. Convertir consumo IA en operacion atomica servidor/base de datos.
9. Anadir unicidad/idempotencia a registros VeriFactu.

### P2 despues del MVP

1. Consentimiento IA asociado a cuenta.
2. IndexedDB para historicos grandes.
3. Resolucion visual de conflictos de sincronizacion.
4. Importadores adicionales: CSV/Excel, PrestaShop.
5. Panel de auditoria de documentos emitidos y cambios relevantes.

## Archivos mas importantes para futuras revisiones

Datos y persistencia:

- `src/lib/types.ts`
- `src/lib/storage.ts`
- `src/context/AppStore.tsx`

Nube:

- `src/context/CloudSyncContext.tsx`
- `src/lib/cloud/diff.ts`
- `src/lib/cloud/incremental.ts`
- `src/lib/cloud/repository.ts`
- `supabase/schema.sql`

Stripe:

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/checkout-scan-pack/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/billing/*`
- `supabase/billing*.sql`

Importador:

- `src/app/importar/page.tsx`
- `src/lib/importers/pcfacturacion.ts`
- `src/lib/importers/pcfacturacion.test.ts`

VeriFactu/PDF:

- `src/lib/verifactu/*`
- `src/app/api/verifactu/register/route.ts`
- `src/lib/pdf.ts`
- `supabase/verifactu.sql`

Legal/IA:

- `src/app/legal/*`
- `src/components/legal/AiProcessingConsentNotice.tsx`
- `src/lib/ai-consent.ts`
- `src/components/cloud/CloudAccountCard.tsx`

UX/planes:

- `src/app/page.tsx`
- `src/app/precios/page.tsx`
- `src/lib/billing/plans.ts`
- `src/components/billing/*`

## Referencias oficiales consultadas

VeriFactu/SIF:

- AEAT, informacion tecnica de Sistemas Informaticos de Facturacion y VERI*FACTU: https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/caracteristicas-qr-especificaciones-servicio-cotejo-factura.html
- Real Decreto 1007/2023, Reglamento de requisitos de sistemas informaticos de facturacion: https://www.boe.es/buscar/doc.php?id=BOE-A-2023-24840
- Texto consolidado del Real Decreto 1007/2023 con plazos actualizados: https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Orden HAC/1177/2024, especificaciones tecnicas, funcionales y de contenido: https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-22138

Proteccion de datos y cookies:

- AEPD, Guia sobre el uso de las cookies: https://www.aepd.es/guias/guia-cookies.pdf
- AEPD, Guia del Reglamento General de Proteccion de Datos para responsables de tratamiento: https://www.aepd.es/guias/guia-rgpd-para-responsables-de-tratamiento.pdf

Nota de fechas: a fecha de esta auditoria, 2026-06-24, el texto consolidado del RD 1007/2023 indica adaptacion antes del 1 de enero de 2027 para obligados del articulo 3.1.a) y antes del 1 de julio de 2027 para el resto de obligados del articulo 3.1. Conviene revisarlo de nuevo antes de lanzar mensajes comerciales.

## Conclusion

El proyecto esta avanzado y tiene una propuesta diferenciadora: facturacion simple sin cuenta, Pro con nube, importacion desde software antiguo, IA opcional y preparacion VeriFactu. La base tecnica es prometedora, pero antes de produccion hay que cerrar seguridad de Supabase/Stripe, reforzar el modo local contra perdida de datos, validar bien VeriFactu y convertir el importador en un flujo muy confiable.

La prioridad tecnica inmediata no deberia ser anadir mas funciones, sino endurecer lo que ya existe: datos, pagos, RLS, backups, importacion, integridad documental, registro legal de consentimientos y mensajes legales/comerciales prudentes.
