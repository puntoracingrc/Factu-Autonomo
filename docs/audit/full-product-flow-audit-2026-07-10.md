# Auditoría integral de producto y flujos — 2026-07-10

## Estado, alcance y criterio

- **Código funcional auditado:** `af6088c4fbf24cd7d027b53e1eab5723175ee7bd` (PR #353; incluye el cambio de abonos negativos de PR #352).
- **Base de integración:** `origin/main` en `d893be9` (PR #355). Tras la revisión exhaustiva entraron PR #354 (documentación) y PR #355 (scheduler/observabilidad de alertas de seguridad); ese delta se revisó de forma dirigida y no altera los hallazgos.
- **Worktree aislado:** `codex/full-product-audit-2026-07-10`; no se tocó el `main` local, que tenía cambios ajenos y estaba desactualizado.
- **Superficie:** 54 rutas de interfaz, 39 rutas API, persistencia local/nube, PDF, importación, Drive, IA, facturación, fiscalidad, Rentabilidad Real, admin, legal, responsive, tema oscuro y manual.
- **Cambios funcionales:** ninguno. Este documento y el inventario del manual son los únicos cambios.
- **Datos:** no se leyeron ni alteraron datos reales, secretos, tokens, cookies o variables locales.
- **Criterio:** una función solo se considera validada cuando coinciden UI, almacenamiento, sincronización, PDF, cálculo, permisos y manual. Abrir una ruta o tener un test unitario no basta.

### Resultado ejecutivo

La aplicación tiene una base técnica amplia y un volumen de pruebas alto, pero **no está lista para considerar cerrada la auditoría fiscal ni el manual**. No se encontró un P0 confirmado. Se identificaron 21 P1 de datos, fiscalidad, seguridad, accesibilidad u operaciones sensibles:

1. las anulaciones y rectificativas cruzadas entre trimestres se imputan de forma incorrecta;
2. las rectificativas emitidas no recorren el mismo pipeline de snapshot/bloqueo que una factura normal;
3. la reparación de cliente puede reescribir un documento emitido y su hash visual sin trazabilidad antes/después;
4. una rectificativa puede perder CP/ciudad y emitirse sin validar la identidad fiscal completa;
5. el “beneficio neto” descuenta el IVA a pagar de una base que ya está sin IVA;
6. los gastos marcados como no deducibles siguen reduciendo beneficio e IRPF y aparecen como deducibles en exportación;
7. una factura de gasto con varios tipos de IVA se aplana a un único porcentaje;
8. producción publica una declaración que afirma cumplimiento SIF mientras el mismo documento reconoce controles técnicos pendientes;
9. el dominio Vercel heredado sirve otra versión de la aplicación en vez de redirigir al dominio canónico;
10. la frecuencia Drive “al guardar documentos o gastos” no detecta la edición de un gasto existente;
11. los abonos negativos desaparecen de Impuestos pero siguen como gasto positivo en el panel, de modo que dos pantallas dan cifras incompatibles;
12. Rentabilidad Real imputa plantillas recurrentes pausadas/cerradas y usa el importe periódico como si fuera mensual;
13. el zoom móvil está bloqueado por `maximumScale: 1`;
14. varios diálogos críticos no tienen semántica, Escape ni gestión de foco consistente;
15. la ruta VeriFactu heredada confía en factura/emisor enviados por el cliente, no prueba titularidad y comparte un certificado de servicio;
16. el registro VeriFactu heredado no es atómico;
17. un reintento de un registro VeriFactu fallido se presenta como éxito;
18. el recordatorio de pago puede enviar un documento construido por el cliente sin comprobar que pertenezca a su workspace;
19. la idempotencia Stripe permite perder un evento bloqueado en `processing` o repetir créditos de un pack;
20. una restauración admin puede quedar aplicada parcialmente si falla un chunk o el audit posterior;
21. el formulario normal aplica un único IVA a todas las líneas y aplana borradores de venta con tipos mixtos.

El manual ofrece una estructura útil, pero cubre solo una parte de la aplicación. Sus verificaciones dan verde aunque varias capturas sean obsoletas, demasiado recortadas o no correspondan a la pantalla anunciada. Rentabilidad Real —ocho rutas— no tiene ninguna sección ni captura.

## Cómo se auditó

### Evidencia utilizada

| Nivel | Significado | Uso en este informe |
|---|---|---|
| **O** observado | Lectura directa de código, test, build o respuesta HTTP segura | Puede producir hallazgo confirmado sin alterar datos |
| **R** reproducido | Caso ejecutado de forma determinista en tests o comprobación HTTP | Mayor confianza; se indica el caso mínimo |
| **I** inferido | Consecuencia lógica del código, pendiente de recorrido UI/PDF | No se presenta como validación visual |
| **P** pendiente | Requiere navegador, credencial, servicio externo o dato sintético | Queda en la matriz de QA, no se marca como aprobado |

### Controles ejecutados

| Control | Resultado |
|---|---|
| `npm ci` | 469 paquetes; 0 vulnerabilidades informadas por npm |
| lint | pasa |
| TypeScript | pasa |
| build Next.js | pasa; genera 103 instancias estáticas; el manifiesto App tiene 99 entradas (54 rutas UI, 39 API y 6 especiales/framework) |
| suite completa | 391 ficheros pasan, 10 se omiten; 4 ficheros fallan solo porque apuntan a fixtures privados fuera del repo y el sistema deniega su lectura |
| suite portable sin esos 4 ficheros | 401 ficheros: 391 pasan y 10 se omiten; 2.216 tests pasan y 12 se omiten |
| dos baterías fiscales/funcionales dirigidas | 8 ficheros/91 tests y 8 ficheros/86 tests; ambas pasan y muestran que varios errores están fuera de cobertura o codificados como expectativa actual |
| batería de seguridad dirigida | 14 ficheros/78 tests pasan; no cubren autorización de contenido VeriFactu/email, carreras, transacciones parciales ni fallos entre pasos |
| batería dirigida de líneas/medidas | 6 ficheros/62 tests pasan; confirma soporte de IVA mixto en cálculo y aplanado de medidas, pero falta el ciclo guardar/reabrir del formulario |
| delta PR #355 | 3 ficheros/17 tests de operations-status e inventario API pasan; scheduler/admin observability revisados |
| manual | 5 ficheros, 12 tests pasan, aunque solo comprueban estructura/existencia |
| convención de migraciones | 25 migraciones y 16 rollbacks pasan el control |
| fixtures sintéticos de factura | 403 sintéticos validados; no se abrió el fixture privado |
| producción, GET/HEAD seguro | dominio, headers, robots, sitemap y fronteras sin autenticación comprobados |

### Límite de la auditoría visual autenticada

La sesión tenía el navegador integrado abierto y se recibió una cuenta de pruebas, pero la única herramienta permitida por el plugin de navegador (`mcp__node_repl__js`) no estaba expuesta ni existía descubrimiento de herramientas. Por seguridad no se usó un navegador alternativo, Playwright de shell, automatización del sistema ni las credenciales en comandos. Por tanto:

- no se inició sesión;
- no se crearon ni borraron registros de prueba;
- no se verificaron visualmente las 54 rutas a 1440/1024/768/390 px;
- no se marcan como aprobados foco, contraste, lector de pantalla, tema oscuro, popup/PDF, OAuth, email o WhatsApp;
- la matriz visual queda como **bloqueo externo de esta ejecución**, no como resultado correcto.

## Inventario de rutas y flujos

### Entrada, cuenta y soporte

| Ruta | Variantes/estados actuales | Datos/efecto principal | Validación pendiente |
|---|---|---|---|
| `/` | portada pública; panel si hay usuario, demo o datos locales; carga | lee workspace, recordatorios, resumen, accesos, PWA | sesión real; vacíos; datos largos; 4 anchos; oscuro |
| `/inicio` | portada pública | marketing y acceso a cuenta/demo/precios | SEO, teclado y móvil |
| `/demo` | inicia/reinicia sandbox; cuenta existente recupera workspace | `localStorage` de demo separado | separación absoluta con datos reales; salida/reinicio |
| `/avisos` | tareas propias/equipo; automáticos; voz; vínculos | `userReminders`, sesión Realtime opcional | permisos micrófono, error, teclado y estados largos |
| `/cuenta` | login, alta, reset, Google, email pendiente, MFA, plan, nube, Drive, backup/import, legal | Supabase, Stripe, Drive, JSON local | recorrido autenticado; MFA/OAuth; errores; restauración solo con copia sintética |
| `/precios` | Gratis/Pro/Pro+, mensual/anual, trial, portal, packs | checkout/portal Stripe | nunca ejecutar pago real; validar estados simulados |
| `/auth/callback` | confirmación/retorno/error | sesión Supabase | enlaces caducados y retorno seguro |
| `/google-auth/callback` | código, intercambio, error | token de Google Login | origen/estado/cancelación |
| `/drive/callback` | código, estado, upload, retorno/error | token efímero y copia Drive | permiso caducado, reconexión y cancelación |
| `/ayuda` | índice, búsqueda/navegación | secciones estáticas | cobertura real y lectura móvil |
| `/ayuda/[slug]` | 14 slugs actuales; 404 de slug | pasos y capturas | 100% de pantallas/controles |

### Clientes, proveedores y productos

| Ruta | Flujo y variantes | Persistencia/relaciones | Riesgos/pendientes |
|---|---|---|---|
| `/clientes` | buscar, ordenar, alta/edición, contacto, documentos, duplicados, fusión, cargar más | maestro `customers`; borradores pueden reasignarse; emitidos deben conservar snapshot | reparación histórica y fusión; sin NIF; homónimos; Places; móvil |
| `/clientes/nuevo` | alta independiente y retorno `from` | crea maestro | retorno permitido; duplicado; validación persona/empresa |
| `/proveedores` | buscar, ordenar, alta/edición, compras, duplicados, fusión | `suppliers`, `expenses`, productos | email no editable; proveedores fantasma; fusión |
| `/proveedores/nuevo` | alta y retorno | crea maestro | campos y validación web/email |
| `/productos` | filtros, familias/subfamilias, catálogo detectado/manual, editor, masivo, selector documental | `products`; referencias/alias/proveedor; historial de compras | filtros “sin subfamilia”; volumen comprado; negativos; móvil |
| `/productos/nuevo` | alta, retorno a documento, límite de plan | crea producto y opcionalmente línea de documento en sesión | importes inválidos silenciosos; duplicados; cálculo m²/ml |

### Documentos

| Ruta | Flujo y variantes | Efecto esperado | Estado de auditoría |
|---|---|---|---|
| `/facturas` | filtros, estados, cobrar, recibo, recordar, compartir, PDF, vínculos, rectificar, borrar/editar según bloqueo | lista debe coincidir con snapshot/PDF/fiscalidad | P1 en rectificación e histórico; visual pendiente |
| `/facturas/nuevo` | cliente maestro/manual, líneas libres/producto, m²/ml, borrador, vista previa, emitir, PDF | al emitir asigna número, snapshot, bloqueo y opcional VeriFactu | pipeline normal cubierto por tests; popup/PDF pendiente |
| `/facturas/[id]` | lectura emitida o edición de borrador; 404 | emitida inmutable | reparación de cliente contradice inmutabilidad |
| `/facturas/[id]/rectificar` | anulación total o corrección; borrador/emitir/PDF | cadena fiscal sin duplicar ingresos | cuatro P1 confirmados/inferidos |
| `/presupuestos` | estados, aceptar/rechazar/vencer, convertir, PDF/compartir | conversión crea factura borrador enlazada | enlace y filtros; visual pendiente |
| `/presupuestos/nuevo` | mismo formulario con validez/vencimiento | no reserva número fiscal hasta emisión | PDF y snapshot de estado |
| `/presupuestos/[id]` | edición/lectura y conversión | conserva source quote | cadenas múltiples |
| `/recibos` | manuales y automáticos, filtros/PDF | auto-recibo no duplica ingresos | vínculo y borrado |
| `/recibos/nuevo` | creación explícita | solo se crea si usuario lo pide | estados y snapshot |
| `/recibos/[id]` | edición de borrador/lectura emitida | vínculo a factura si aplica | cadena y PDF |

### Gastos

| Ruta | Flujo y variantes | Efecto esperado | Estado de auditoría |
|---|---|---|---|
| `/gastos` | periodo, proveedor/fijo, gráficos, CSV, resumen proveedor, inbox, lista/edición | histórico y previsto diferenciados | P1 no deducibles/IVA mixto; visual pendiente |
| `/gastos/nuevo` | manual, recibido, ticket, fijo, edición, inbox, pendiente de original, escaneo individual/lote | proveedor/líneas/productos/gasto coherentes | precio negativo de línea no actualiza producto; queda un bypass si el documento es negativo pero la línea positiva |
| `/gastos/fijos` | alta/edición, mensual/trimestral/anual, duración, pausa, cambio futuro, próximos cargos | nuevo tramo futuro sin reescribir histórico | lógica segmentada; vencimiento anual UX incoherente |

### Fiscalidad y Rentabilidad Real

| Ruta | Variantes | Fuente de cálculo | Estado |
|---|---|---|---|
| `/impuestos` | trimestre/año/todo, exento, CSV/PDF | `taxes.ts`, periodos y exports | varios P1 de cálculo; no usar como cifra fiable hasta corregir |
| `/rentabilidad-real` | hub, plan, test, módulos, reset local, conexiones | AppData + preferencias locales | sin manual; visual pendiente |
| `/rentabilidad-real/test` | 11 preguntas y recomendaciones | `localStorage` específico | coexistencia de perfiles cubierta unitariamente |
| `/rentabilidad-real/validar-configuracion` | resumen y estados de revisión | local, sin verdad fiscal | copy/estado; móvil |
| `/rentabilidad-real/calculadora/trabajo` | factura/presupuesto, gastos enlazados/candidatos, parciales, fijos, ajustes | AppData + asignaciones locales | semántica fiscal depende de datos base correctos |
| `/rentabilidad-real/calculadora/horas` | documento o simulación, horas/proyecto/iguala | local | campos, resultados y advertencias |
| `/rentabilidad-real/simulador-precio-minimo` | hora/trabajo/proyecto/mes | local/orientativo | no presentarlo como asesoramiento fiscal |
| `/rentabilidad-real/informes` | documento/cliente, filtros, modos, calidad | cálculo al vuelo | tablas anchas; sin manual |
| `/rentabilidad-real/evolucion` | mes/trimestre/cliente/modo | cálculo al vuelo | tabla ancha; sin manual |

### Configuración, importación, admin y legal

| Ruta | Flujo | Riesgo/pendiente |
|---|---|---|
| `/configuracion` | negocio, facturación, fiscalidad, preferencias | cada cambio debe distinguir futuro vs snapshot histórico |
| `/configuracion/plantillas` | estilo, fuente, color, densidad, bloques y preview | preview orientativa vs PDF final; overlay accesible |
| `/importar` | automático, PC Facturación 3, FacturaDirecta, Holded, genérico; review/preview/aplicar | identidad, numeración, snapshots y rollback; fixtures privados no portables |
| `/admin` | capacidades, usuarios, planes, MFA, restore, salud, errores, IA | acceso server-side y MFA; no probar mutaciones reales |
| `/legal/aviso-legal` | titularidad y uso | revisar datos y fecha |
| `/legal/cookies` | cookies/localStorage | alinear todas las claves reales |
| `/legal/encargo-tratamiento` | DPA | alinear proveedores y transferencias |
| `/legal/privacidad` | nube, IA, Drive, aprendizaje | aliases tienen canonical incorrecto |
| `/legal/terminos` | planes, IA, reembolsos, VeriFactu | alinear claim comercial/técnico |
| `/legal/verifactu` | límites, fuentes y modalidad | texto prudente contradicho por declaración responsable |
| `/legal/declaracion-responsable` | declaración generada | P1 legal: afirma cumplimiento y a la vez reconoce pendientes |
| `/privacidad`, `/privacy`, `/terminos`, `/terms` | aliases | deben redirigir/canonicalizar a la versión única |

## Inventario de APIs y fronteras

| Frontera | Rutas | Evidencia |
|---|---|---|
| Admin + MFA configurable | `/api/admin/errors`, `health`, `operations-status`, `users*`, `vercel-usage` | `getAdminAccessFromRequest`; producción documenta MFA obligatorio |
| Cuenta autenticada | billing, customer parse, expense inbox/scan, Drive token, Places, imports, monitoring, referrals, reminders, register VeriFactu | bearer validado con Supabase; rate limit |
| Aprendizaje autorizado | `/api/admin/ai-learning/correct`, `feedback` | cuenta autenticada + allowlist propia |
| Pública limitada | welcome, Google Auth token, CSP report, declaración/status VeriFactu | rate limit; parte del contenido merece minimización |
| Webhook firmado | Stripe e inbox entrante | firma + body acotado |
| Cron | health alert | secreto y comparación temporal segura |
| Flag privada | document sync e ingest server-documents | sync bloquea producción; ingest solo depende de flag de servidor |

### Matriz API ruta por ruta

Cada fila corresponde al `route.ts` homónimo bajo `src/app/api/`. “Self” significa que el servidor deriva el usuario del bearer; no acepta un `userId` arbitrario como propietario.

| Ruta · métodos | Actor/autorización del objeto | Flag/límite | Mutación o servicio externo | Resultado de auditoría |
|---|---|---|---|---|
| `/api/admin/ai-learning/correct` · POST | bearer + allowlist de email; payload estructural | 512 KiB; rate limit | OpenAI, sin AppData | control correcto; revisar redacción del payload |
| `/api/admin/ai-learning/feedback` · POST | bearer + allowlist; self como actor | 512 KiB; rate limit | inserta aprendizaje saneado si tabla activa | respuesta distingue `saved:false` |
| `/api/admin/capabilities` · GET | bearer; allowlist admin/aprendizaje; MFA calculado | rate limit | lectura de capacidades | correcto; UI debe respetar capacidad parcial |
| `/api/admin/errors` · GET | admin server-side; MFA según política | rate limit | lee eventos Supabase | no muta; minimizar PII en salida/log |
| `/api/admin/health` · GET | admin server-side; MFA según política | rate limit | lecturas/RPC Supabase | fallback amplio, solo diagnóstico |
| `/api/admin/operations-status` · GET | admin server-side; MFA según política | rate limit | consulta GitHub/Vercel/workflow scheduler/config | solo lectura; degradación parcial |
| `/api/admin/users/[userId]/mfa` · GET/POST/DELETE | full admin + AAL2 explícito; target validado | rate limit, código TTL/intentos | lista, envía challenge, elimina factor | guardias fuertes; sin undo tras DELETE |
| `/api/admin/users/[userId]/restore-points` · GET/POST | full admin; target validado; MFA solo si flag global | rate limit, preview/email | snapshot, preview y restore Supabase | AUD-P1-20: restore no transaccional |
| `/api/admin/users/[userId]` · PATCH | full admin; target validado | rate limit | plan/cuotas/ban/reset IA | mutación sensible sin confirm UI |
| `/api/admin/users` · GET | full admin | rate limit, hasta 100 | Auth/Supabase/pagos/errores | lectura; datos solo para admin |
| `/api/admin/vercel-usage` · GET | full admin | rate limit; token servidor | API Vercel | solo lectura; no exponer token |
| `/api/billing/ai-usage` · GET | bearer self | rate limit | lee cuota/suscripción | producción 401 sin bearer |
| `/api/billing/checkout-scan-pack` · POST | bearer confirmado self | rate limit; Stripe configurado | crea checkout pack | idempotencia final depende webhook, AUD-P1-19 |
| `/api/billing/checkout` · POST | bearer confirmado self; plan permitido | rate limit | crea checkout Stripe | metadata fija al usuario autenticado |
| `/api/billing/portal` · POST | bearer confirmado self + customer propio | rate limit | crea sesión portal Stripe | correcto; GET frío observado es P3 |
| `/api/billing/profile` · GET | bearer self | rate limit | lee perfil de facturación | correcto |
| `/api/billing/trial` · POST | bearer confirmado self | 5/h por usuario | crea/asegura trial | mutación idempotente esperada |
| `/api/customers/parse` · POST | bearer confirmado solo si billing activo | rate/body/cuota | OpenAI; consume uso | AUD-P2-32: despliegue fail-open |
| `/api/document-sync` · GET/POST/PUT/PATCH/DELETE | handler privado; no accesible en producción | flag servidor + guard production/remote + limitador | sync experimental | producción 404; control positivo |
| `/api/email/payment-reminder` · POST | bearer confirmado, pero `doc/profile` del body no autorizados | rate por usuario/día | Resend + PDF | AUD-P1-18 |
| `/api/email/welcome` · POST | pública; confía en pareja `userId/email` | 12/5 min/IP | Resend + metadata usuario | AUD-P2-36 |
| `/api/expense-inbox/inbound` · POST | firma Svix o secreto webhook en transición | body acotado | Resend inbound, adjuntos, IA, Supabase | firma positiva; descargas AUD-P2-34 |
| `/api/expense-inbox` · GET/PATCH | bearer confirmado self | rate; rotación más estricta | lee inbox/rota alias | objeto ligado al usuario |
| `/api/expenses/scan` · GET/POST | bearer confirmado solo si billing activo; self si existe | rate/cuota/tamaño | OpenAI y consumo | AUD-P2-32; validación determinista posterior |
| `/api/google-auth/token` · POST | pública con flujo OAuth/código | rate; body acotado/config Google | intercambio de token Google | validar state/retorno/cancelación en navegador |
| `/api/google-drive/token` · POST | bearer confirmado self | rate/config Google | intercambio/refresh Drive | token no llega a documentación/log |
| `/api/google-places/address-fill` · POST | bearer confirmado solo si billing activo | rate/cuota/plan | autoriza/consume uso de Places | AUD-P2-32; sin usuario devuelve cuota nula en modo dev |
| `/api/imports/review` · POST | bearer confirmado solo si billing activo | rate/body/cuota | OpenAI | AUD-P2-32 |
| `/api/monitoring/error` · POST | bearer self | rate/body | inserta evento técnico | no aceptar identidad ajena; salida admin restringida |
| `/api/referrals/me` · GET | bearer self | rate; billing gate | lee/asegura código y saldo | objeto self |
| `/api/referrals/redeem` · POST | bearer self; código validado en servidor | rate; billing gate | aplica referido/bono | probar doble canje/concurrencia |
| `/api/reminders/realtime-session` · POST | bearer confirmado solo si billing activo | rate/plan | crea secreto efímero OpenAI Realtime | AUD-P2-32; secreto solo efímero |
| `/api/security/csp-report` · POST | pública | body y rate limit | registra/normaliza reporte | no debe almacenar URLs/valores sensibles sin saneado |
| `/api/security/health-alert` · GET | bearer `CRON_SECRET` con comparación segura | cron/config | lee abuso y envía alerta Resend | control correcto; no es endpoint de usuario |
| `/api/server-documents/ingest` · GET/POST | flag servidor; bearer se comprueba después de parsear | sin guard production estructural | ingest experimental/Supabase | AUD-P2-16/33 |
| `/api/verifactu/declaration` · GET | pública | rate limit | genera declaración | contenido P1-08; no muta |
| `/api/verifactu/register` · POST | bearer, pero documento/perfil/NIF no contrastados con workspace | rate/config submit/certificado | cadena, DB y posible AEAT | AUD-P1-15/16/17 |
| `/api/verifactu/status` · GET | pública | rate limit | expone estado productor/config | AUD-P2-18: minimizar |
| `/api/webhooks/stripe` · POST | firma Stripe | body/firma; reserva de event ID | suscripción/créditos Supabase | AUD-P1-19: reclaim/atomicidad/pago asíncrono |

Comprobación segura en producción: las rutas de usuario/admin devuelven 401 sin bearer; las de solo POST devuelven 405 a GET; `document-sync` devuelve 404; `server-documents/ingest` anuncia solo POST con 405 a GET. No se hizo POST para evitar mutaciones. `/api/expenses/provider-summary` ya no existe: el resumen de proveedor se procesa actualmente en cliente mediante `provider-summary-file.ts`; la lista inicial de APIs estaba desactualizada.

La clasificación “cuenta autenticada” no implica por sí sola autorización del objeto recibido: cuatro rutas de IA/parseo/realtime solo exigen bearer si `NEXT_PUBLIC_BILLING_ENABLED` es exactamente `true`, y VeriFactu/recordatorios aceptan objetos documentales del body sin contrastarlos con el workspace. Producción devolvió 401 durante esta auditoría, por lo que el problema de la flag es un riesgo de despliegue, no un bypass observado en el dominio canónico.

## Hallazgos P0 — ninguno confirmado

No se confirmó pérdida masiva activa, exposición directa de secretos ni indisponibilidad total. Los escenarios condicionados a flags/certificados y las operaciones no atómicas se clasifican P1 hasta reproducir impacto real de forma segura.

## Hallazgos P1 — corregir antes de confiar en datos, fiscalidad u operaciones sensibles

### AUD-P1-01 — Anulación/rectificación altera mal los periodos fiscales

- **Evidencia:** R. `isTaxableSaleDocument` excluye cualquier original con `rectifiedById` (`src/lib/taxes.ts:14-20`); una anulación crea la rectificativa completa en negativo (`src/lib/rectificativas.ts:104-110`); los periodos filtran cada documento solo por su propia fecha (`src/lib/periods.ts:44-50`).
- **Caso mínimo:** factura Q1 base 100 + IVA 21; anulación Q2 base -100 + IVA -21. Resultado actual: Q1 pasa retrospectivamente a 0 y Q2 muestra -100/-21. Mismo trimestre: original excluida + rectificativa negativa = -100/-21, no 0.
- **Esperado:** política fiscal explícita y consistente (original + ajuste en el periodo correspondiente), sin borrar retrospectivamente el periodo original ni duplicar/negativizar el total.
- **Impacto:** fiscal, informes, CSV trimestral y PDF anual.
- **Tests:** los tests actuales verifican por separado “excluir original” e “incluir rectificativa”, pero no anulación ni cruce trimestral.

### AUD-P1-02 — Rectificativa emitida sin snapshot/bloqueo canónico

- **Evidencia:** R/I. `addRectificativa` crea directamente el objeto emitido (`src/context/AppStore.tsx:957-1021`) y no llama a `issueDocumentWithIntegrity` (`src/lib/document-integrity/index.ts:136-179`).
- **Resultado:** puede quedar sin `documentSnapshot`, `pdfSnapshot`, `documentLifecycle`, `integrityLock` y, si VeriFactu está desactivado, incluso el `issuer` adjuntado en memoria no se persiste. El PDF cae al modo legacy derivado del perfil vigente (`src/lib/document-integrity/pdf-source.ts:179-240`).
- **Caso ejecutado:** rectificativa emitida por 100+21; al cambiar después el perfil a exento, el fallback produce total 100/IVA 0 y otro hash, en vez de conservar 121/21.
- **Riesgo:** cambiar emisor/plantilla después de emitir puede cambiar la representación histórica de una rectificativa.
- **Esperado:** exactamente el mismo pipeline de emisión, snapshot, PDF snapshot y bloqueo que una factura normal.

### AUD-P1-03 — “Usar ficha actual” reescribe una factura emitida sin auditoría

- **Evidencia:** O/R por test. `repairDocumentCustomerSnapshot` sustituye `client`, `documentSnapshot` y `pdfSnapshot` en documentos emitidos (`src/lib/document-customer-repair.ts:10-44`); el test exige que cambie el hash de contenido. La acción se ofrece desde el listado con una confirmación nativa (`DocumentList.tsx:467-491`).
- **Problema:** no hay registro persistente antes/después ni vista comparativa; el registro VeriFactu previo puede quedar asociado a un contenido visible reparado.
- **Esperado:** borradores editables; emitidos solo mediante herramienta de reparación explícita con preview, motivo, audit trail, hash anterior/nuevo y verificación fiscal, o rectificativa cuando corresponda.

### AUD-P1-04 — Rectificativa pierde CP/ciudad y valida solo el nombre

- **Evidencia:** R. `clientToFormValues` descarta CP y ciudad del snapshot (`ClientPicker.tsx:473-499`). El formulario de rectificación parte de esos valores y al emitir solo pasa el nombre al validador (`RectificativaForm.tsx:101-105`, `271-288`). La factura normal exige nombre, NIF, dirección, CP y ciudad (`DocumentForm.tsx:1324-1339`).
- **Resultado esperado:** conservar la identidad completa del original o exigir/revalidar los cinco campos antes de emitir.
- **Impacto:** identidad fiscal y PDF de rectificativa.

### AUD-P1-05 — “Beneficio neto” descuenta el IVA dos veces conceptualmente

- **Evidencia:** O/R. `grossProfit = salesBase - expenseBase`; después se resta IRPF y también `ivaToPay` (`src/lib/taxes.ts:77-80`). El test fija 560,50 para ventas base 1.000 y gasto base 50, cuando el beneficio tras reserva IRPF sería 760 si se trabaja sin IVA.
- **Problema:** el IVA cobrado/soportado no es coste/ingreso operativo cuando las bases ya están sin IVA. La etiqueta induce a leer una cifra económica falsa.
- **Esperado:** separar beneficio antes/después de reserva IRPF de la posición de caja por IVA; no llamar “beneficio neto” a una mezcla.

### AUD-P1-06 — Gasto “no deducible” sigue reduciendo fiscalidad

- **Evidencia:** R. La recurrencia conserva `deductibility`, pero `calculateTaxSummary` suma todos los gastos (`taxes.ts:68-80`) y la exportación fiscal no los separa. Solo se fuerza IVA 0 en parte del flujo recurrente.
- **Esperado:** cuenta en control/rentabilidad, pero base e IVA deducibles 0 y sin reducir la provisión IRPF fiscal; exportar columna/estado claro.
- **Impacto:** IVA, IRPF, CSV, PDF anual y dashboard.

### AUD-P1-07 — Factura de gasto con IVA mixto se reduce a un único tipo

- **Evidencia:** R. `Expense` solo tiene `amount` + `ivaPercent`; las líneas sí admiten su propio IVA, pero `expenseIvaAmount` ignora las líneas y multiplica toda la base por el porcentaje cabecera (`taxes.ts:23-29`; `types.ts:272-365`).
- **Caso mínimo:** base 100 al 21% + 100 al 10% debe dar 31; con cabecera 21 da 42.
- **Esperado:** desglose por línea/tipo o cuota total explícita validada, con fallback documentado para legacy.

### AUD-P1-08 — Declaración SIF contradictoria en producción

- **Evidencia:** O/R mediante GET público. La declaración afirma que la versión cumple la normativa (`src/lib/verifactu/declaration.ts:74-84`) y la página la llama “Certificación del productor” (`src/app/legal/declaracion-responsable/page.tsx:33-38`), mientras el anexo reconoce pendientes el registro de eventos completo, XSD estricto y aceptación oficial (`declaration.ts:88-98`).
- **Contradicción concreta:** declara un producto no exclusivo (`exclusiveVerifactu: false`) y la UI permite alternar VeriFactu, pero el registro de eventos está pendiente. La [FAQ oficial AEAT](https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/FAQs-Desarrolladores.pdf) exige registro de eventos/comprobaciones para un SIF dual y no permite cambiar dinámicamente de producto por factura o sesión (apartados 3 y 15).
- **Esperado:** no publicar/emitir una declaración afirmativa hasta completar y aprobar el checklist jurídico-técnico; mostrar “borrador no firmado/no válido” si se mantiene para revisión.
- **Impacto:** legal, comercial y fiscal. El texto prudente de `/legal/verifactu` no corrige el claim principal.

### AUD-P1-09 — Dominio Vercel heredado sirve otra aplicación activa

- **Evidencia:** R. `https://factu-autonomo.vercel.app` devuelve 200, HTML/asset hash distintos, CORS `*` y sin la CSP de la URL canónica; no redirige a `https://facturacion-autonomos.app`.
- **Riesgo:** usuarios en una versión antigua, localStorage separado por origen, configuración/cookies divergentes, bugs ya corregidos reintroducidos y dos superficies de ataque.
- **Esperado:** redirección permanente al dominio canónico o bloqueo explícito del alias tras verificar OAuth/webhooks.

### AUD-P1-10 — Drive “al guardar documentos o gastos” omite editar gastos

- **Evidencia:** O/I. La firma “important” usa conteos y `createdAt/updatedAt`; `Expense` no tiene `updatedAt` y `updateExpense` conserva `createdAt` (`google-drive/backup.ts:300-325`; `AppStore.tsx:1085-1092`).
- **Resultado:** editar importe, proveedor o líneas de un gasto existente puede dejar la misma firma y no programar copia.
- **Esperado:** usar `data.meta.lastModified` más una clasificación de evento, o añadir `updatedAt` y probar alta/edición/borrado.

### AUD-P1-11 — Zoom móvil bloqueado

- **Evidencia:** O. `maximumScale: 1` en `src/app/layout.tsx:71-76`.
- **Impacto:** impide ampliar contenido denso, tablas, formularios y PDFs; barrera directa para baja visión.
- **Esperado:** permitir zoom del navegador y validar 200%/400% sin pérdida funcional.

### AUD-P1-12 — Diálogos críticos sin contrato de teclado/foco común

- **Evidencia:** O. Borrado carece de semántica de diálogo; upgrade y recordatorio carecen de `aria-modal`, Escape y gestión de foco; preview grande de plantilla tampoco tiene semántica consistente.
- **Impacto:** borrado, pago y envío pueden ser inaccesibles o dejar el foco detrás del overlay.
- **Esperado:** componente modal único con título/descripción, `aria-modal`, Escape, click fuera según riesgo, focus trap y restauración.

### AUD-P1-13 — Un abono cuenta distinto en Panel e Impuestos

- **Evidencia:** R mediante ejecución determinista. Escaneo conserva `amount < 0` y avisa de abono (`expense-scan/schema.ts:314-320`, `375-379`). El resumen de negocio pasa cada importe por `safeMoney`, que convierte valores `<= 0` en 0 (`product-business-summary.ts:39-42`, `64-69`, `129-169`), mientras `taxes.ts` suma el negativo.
- **Caso mínimo:** compra base 100/IVA 21 y abono base -100/IVA -21. Panel: gasto 121, IVA 21 y caja -121; Impuestos: base 0 e IVA 0.
- **Esperado:** el abono debe reducir de forma coherente gasto, IVA y caja en todas las pantallas/exports, con etiqueta de saldo a favor.

### AUD-P1-14 — Rentabilidad imputa recurrencias pausadas, cerradas y sin normalizar frecuencia

- **Evidencia:** R. El builder de rentabilidad añade todas las plantillas sin filtrar `enabled`, duración o fecha y usa `amount` bruto (`rentabilidad-real/calculation/work-profitability-builder.ts:188-200`, `396-412`). La pantalla de fijos sí divide anual/trimestral a equivalente mensual y excluye cerradas (`gastos/fijos/page.tsx:63-67`, `94-100`, `134-155`).
- **Casos mínimos:** editar una cuota 300→350 deja tramo histórico cerrado y actual; Rentabilidad propone 650. Un seguro anual de 1.200 con 10 trabajos/mes imputa 120 por trabajo en lugar de 10.
- **Esperado:** una sola versión activa aplicable al periodo y conversión mensual `/1`, `/3` o `/12` antes del reparto.

### AUD-P1-15 — VeriFactu acepta documento/emisor del cliente sin probar titularidad

- **Evidencia:** O. `/api/verifactu/register` parsea `document` y `profile` del body y valida tipo, estado y presencia de NIF, pero no recupera el documento desde `sync_entities` ni comprueba que ese NIF pertenezca al usuario (`src/app/api/verifactu/register/route.ts:56-103`). Después encadena por `userId + NIF` y puede remitir con un P12 global de servidor (`route.ts:119-142`; `src/lib/verifactu/config.ts:40-53`).
- **Riesgo:** una cuenta autenticada podría construir factura/emisor ajenos y, si el envío real y certificado están activos, intentar una remisión firmada por la infraestructura del servicio. No se hizo ninguna llamada mutante ni envío a AEAT.
- **Marco externo:** la [FAQ oficial para desarrolladores de la AEAT](https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/FAQs-Desarrolladores.pdf) exige certificado válido para un SIF adaptado y sitúa la remisión por terceros en colaboración social o apoderamiento (apartados 3 y 16).
- **Esperado:** resolver documento y perfil autorizados en servidor; vincular NIF, consentimiento/representación y certificado; impedir que el body elija el obligado; registrar la autorización usada.

### AUD-P1-16 — Cadena VeriFactu heredada no es atómica ni idempotente

- **Evidencia:** O/I. La ruta hace `find existing → load chain → generar/enviar → insert record → upsert chain` en operaciones separadas (`register/route.ts:105-180`; `src/lib/verifactu/server-db.ts:16-54`). El esquema legacy no impone unicidad `(user_id, document_id)` ni compare-and-swap/bloqueo de cabecera (`supabase/migrations/20260623000000_base_schema.sql:265-291`).
- **Riesgo:** dos POST concurrentes pueden usar el mismo `previous_hash`, enviar dos registros y dejar una bifurcación; un fallo entre insertar registro y actualizar cabecera desincroniza ambos. La infraestructura fiscal nueva sí usa una RPC atómica, pero esta ruta no.
- **Marco externo:** la FAQ AEAT anterior exige comprobar el último encadenamiento y generar los registros en orden cronológico (apartado 15).
- **Esperado:** una única transacción/RPC con lock o CAS, clave idempotente única, outbox de envío y pruebas de concurrencia/fallo entre pasos.

### AUD-P1-17 — Reintento VeriFactu puede anunciar éxito de un registro fallido

- **Evidencia:** O. Si encuentra registro existente, la ruta responde `aeatOk: true` sin leer su `status` (`register/route.ts:105-116`). La rehidratación fuerza `environment: "test"`, usa `created_at` como `recordTimestamp` y el esquema no conserva el timestamp exacto ni el entorno usados para la huella (`server-db.ts:67-100`).
- **Impacto:** UI/archivo fiscal puede mostrar como aceptado lo que quedó `failed`; el objeto reconstruido puede no representar la huella emitida.
- **Esperado:** respuesta idempotente fiel al estado persistido; guardar entorno, timestamp de registro, request/response y transición; reintento explícito y seguro.

### AUD-P1-18 — Recordatorio de pago confía en un documento construido por el cliente

- **Evidencia:** O. `/api/email/payment-reminder` toma `doc` y `profile` del body y solo exige sesión/email confirmado; no recupera ni autoriza el documento en nube (`src/app/api/email/payment-reminder/route.ts:45-88`). El servicio usa de ese objeto destinatario, emisor, mensaje y PDF (`src/lib/email/send-payment-reminder.ts:39-94`).
- **Riesgo:** relay de factura o identidad forjada desde una cuenta confirmada; el límite de 50/día por cuenta reduce volumen, no demuestra pertenencia.
- **Esperado:** aceptar solo `documentId` + plantilla/opciones acotadas, cargar snapshot y destinatario autorizados en servidor, registrar envío y reforzar límites por actor/destinatario.

### AUD-P1-19 — Webhook Stripe puede perder eventos o duplicar créditos

- **Evidencia:** O/I. La reserva de evento deja `processing` sin reclaim/timeout; los reintentos se tratan como duplicados y reciben 200 (`src/lib/billing/stripe-events.ts:31-79`; `src/app/api/webhooks/stripe/route.ts:237-252`). Para packs, el crédito se concede antes de marcar el evento procesado; si esa marca falla, el retry puede acreditarlo otra vez (`route.ts:125-130`, `315-317`). `checkout.session.completed` tampoco comprueba `payment_status` ni cubre `checkout.session.async_payment_succeeded`.
- **Esperado:** transacción/event outbox con concesión idempotente por `event_id`/checkout, reclaim seguro de `processing`, estado de pago confirmado y tests de caída después de cada paso.

### AUD-P1-20 — Restauración admin puede quedar parcial sin evidencia coherente

- **Evidencia:** O/I. El restore crea un punto de seguridad, aplica upserts por chunks y solo después inserta el evento (`src/app/api/admin/users/[userId]/restore-points/route.ts:212-234`, `342-375`). No hay transacción/RPC. La ruta exige MFA solo si la flag global lo activa; no fuerza AAL2 como la recuperación MFA.
- **Riesgo:** fallo intermedio deja mezcla de datos antiguos/nuevos; fallo del audit devuelve 500 aunque ya mutó datos; un admin sin AAL2 puede ejecutar una operación destructiva si la configuración deriva.
- **Esperado:** MFA AAL2 obligatorio, preview/dry-run, operación transaccional o saga reanudable con estado, rollback probado y evento antes/después indivisible.

### AUD-P1-21 — El formulario normal aplana el IVA mixto de las líneas

- **Evidencia:** O/I. `DocumentForm` toma el IVA de la primera línea existente como `documentIvaPercent`, mapea todas las líneas a ese valor al inicializar y vuelve a imponerlo en un efecto (`src/components/forms/DocumentForm.tsx:506-525`, `860-869`). La UI solo ofrece “IVA del documento”; el modelo, los cálculos y la rectificativa sí admiten `ivaPercent` por línea. Incluso el IVA de venta propio del producto se sustituye por el global al insertarlo (`DocumentForm.tsx:720-732`).
- **Caso mínimo:** borrador/importación con base 100 al 21% + 100 al 10% (total 231). Abrirlo con primera línea al 21% transforma la segunda a 21%; al guardar/emitir queda total 242, IVA 42 en lugar de 31.
- **Impacto:** facturas/presupuestos/recibos con bienes o servicios a varios tipos no se pueden crear correctamente; un borrador ya mixto puede mutar solo por abrirlo.
- **Esperado:** selector por línea y resumen por tipo; el cambio global debe ser una acción explícita con confirmación, nunca una normalización silenciosa.

## Hallazgos P2 — funcionalidad, UX, seguridad y manual

| ID | Hallazgo | Evidencia/impacto |
|---|---|---|
| AUD-P2-01 | Manual sin Rentabilidad Real | 8 rutas, cero sección/captura/mapeo contextual |
| AUD-P2-02 | Cobertura del manual da falso verde | solo comprueba que 32 PNG existan; no contenido, ruta, tema, viewport o fecha |
| AUD-P2-03 | Capturas defectuosas/obsoletas | contraseña antigua, Ajustes antiguo, proveedor equivocado, dos imágenes son casi solo títulos |
| AUD-P2-04 | Generador visual insuficiente | solo 720×1280 lógico, claro; no 1440/1024/768/390 ni oscuro; fallback puede ocultar fallos |
| AUD-P2-05 | Sin E2E de flujos principales | no hay Playwright/Cypress de producto; solo script de capturas y muy pocos tests React |
| AUD-P2-06 | Suite no portable | cuatro tests apuntan a rutas absolutas privadas; `existsSync` activa casos que luego no se pueden leer |
| AUD-P2-07 | Buscador de cliente sin semántica combobox | teclado visual sin `combobox/listbox/option`, expanded/controls |
| AUD-P2-08 | Tabs/modos sin estado accesible | Avisos y varios selectores de Rentabilidad no usan `tab/aria-selected` o `aria-pressed` |
| AUD-P2-09 | Botones de icono sin nombre suficiente | recordatorios y gastos fijos dependen de `title` |
| AUD-P2-10 | Targets móviles de 28×28 | flechas de barra inferior por debajo de objetivo táctil habitual |
| AUD-P2-11 | Tablas de 820–1120 px en móvil | scroll horizontal sin vista alternativa en informes/evolución |
| AUD-P2-12 | Email de proveedor no editable | el modelo, búsqueda y listado lo usan, pero el formulario no lo ofrece |
| AUD-P2-13 | Importes inválidos de producto se silencian | parse devuelve `undefined` y el alta continúa sin error asociado |
| AUD-P2-14 | Vencimiento anual incoherente | UI ofrece día en combinaciones que guardado ignora |
| AUD-P2-15 | Validación con `alert()` | rectificativas/gastos no asocian errores a campos ni conservan contexto accesible |
| AUD-P2-16 | Ingest experimental sin bloqueo de producción estructural | desactivado por defecto, pero `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED=true` bastaría; a diferencia de document-sync no comprueba entorno remoto/production |
| AUD-P2-17 | `.env.example` documenta una flag pública de ingest | contiene `NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED` aunque tests/docs declaran que no debe existir una flag pública |
| AUD-P2-18 | Status VeriFactu público demasiado amplio | devuelve objeto de productor y estado operativo/certificado; minimizar campos públicos |
| AUD-P2-19 | Canonical legal inconsistente | `/legal/privacidad` y `/legal/terminos` publican canonical `/`; aliases multiplican contenido |
| AUD-P2-20 | Claims comerciales “VeriFactu incluido” sin matiz al lado | landing/precios requieren enlace/nota visible de “preparación/simulado; no homologación” |
| AUD-P2-21 | Bundles documentales grandes | build: listas ~348 KB y detalle ~370 KB de JS inicial; Impuestos ~331 KB; medir Core Web Vitals y dividir PDF/editor |
| AUD-P2-22 | Restauración/copia no incluye preferencias locales de Rentabilidad | se presenta una “copia completa” de AppData, pero módulos/ajustes RR viven en otras claves; texto debe explicarlo |
| AUD-P2-23 | API inicial desactualizada | `/api/expenses/provider-summary` fue retirada; documentación/inventarios deben indicar procesamiento local actual |
| AUD-P2-24 | Abono documental con línea positiva aún aprende catálogo | el guard solo mira el signo de línea; documento `amount < 0` con línea positiva aumenta compras/coste histórico |
| AUD-P2-25 | Borrar una ocurrencia recurrente no persiste | al recargar, `syncRecurringExpenses` regenera la misma ocurrencia con otro UUID porque no existe tombstone/exclusión |
| AUD-P2-26 | Recargo de equivalencia de resumen proveedor se pierde | parser conserva recargo y total, pero el gasto creado calcula solo base+IVA; caso 100+21+5,2 queda en 121 frente a 126,2 |
| AUD-P2-27 | Renombrar familia rompe su regla de margen | productos migran el nombre de familia, pero la regla sigue bajo la cadena anterior y deja de aplicarse |
| AUD-P2-28 | Lote puede crear proveedores duplicados | cada guardado consulta el mismo cierre de `data.suppliers`; dos facturas del mismo proveedor nuevo pueden ejecutar dos altas |
| AUD-P2-29 | Rectificativa positiva desaparece del Panel | se excluyen original y rectificativa de facturado/IVA; fiscal muestra el reemplazo, Panel muestra 0 aunque pendiente pueda incluirlo |
| AUD-P2-30 | Borrar cliente/proveedor deja referencias colgantes | el maestro se filtra sin revisar documentos/gastos/productos; el CSV de gasto puede perder el NIF aunque siga en `purchaseDocument` |
| AUD-P2-31 | Hash de snapshot local débil y no verificado | FNV-1a de 32 bits; carga/render no recalculan ni comparan el hash antes de usar el snapshot |
| AUD-P2-32 | Billing/IA falla abierto si la flag no es exactamente `true` | parseo cliente, review import, sesión realtime y scan dejan de exigir bearer; producción hoy responde 401, pero el test de inventario solo busca el nombre del helper |
| AUD-P2-33 | Ingest puede leer un body ilimitado antes de autenticar | al activar la flag, `server-documents/route-handler.ts` consume JSON antes de auth/rate-limit; añadir límite de bytes previo y guard production/remote |
| AUD-P2-34 | Inbox descarga adjuntos sin límites previos ni allowlist de URL | hasta 10 `download_url`, sin timeout y con `arrayBuffer()` completo antes de validar 4 MB; riesgo de memoria/egress y SSRF indirecto |
| AUD-P2-35 | Rate limit distribuido degrada silenciosamente a memoria local | cualquier fallo RPC permite continuar con contador por instancia; falta política fail-closed por operación sensible e índice de expiración |
| AUD-P2-36 | Welcome público muta metadata sin ligar actor/destinatario | con `userId`/email conocidos puede disparar bienvenida; un fallo al marcar metadata se ignora y permite reenvíos |
| AUD-P2-37 | Documentos de venta no tienen descuento explícito | `LineItem` y `DocumentForm` solo guardan PVP/cantidad/IVA; aplicar un descuento exige alterar el precio y pierde tarifa, porcentaje y representación PDF |
| AUD-P2-38 | El vínculo producto/coste de una línea no sobrevive al guardado | `LineItem` no tiene `productId` ni coste; `lineProductPricing` es estado/sesión del formulario. Al reabrir, la línea queda “servicio libre”, coste 0 y margen inflado aunque su descripción se hubiera personalizado |
| AUD-P2-39 | Las medidas m²/ml se aplanan a texto | ancho/alto/longitud solo viven en `lineAreaDrafts`; al guardar queda cantidad + sufijo en descripción. Al reabrir los campos vuelven a 0 y volver a medir concatena un segundo sufijo |

## Hallazgos P3 — mejoras y deuda menor

| ID | Hallazgo | Acción sugerida |
|---|---|---|
| AUD-P3-01 | Overlay grande de plantilla con mínimo de 78 rem | diseño por secciones y cabecera/acciones sticky |
| AUD-P3-02 | Navegación móvil con 11 destinos en scroll | priorizar 4–5 y menú “Más”, conservando accesibilidad |
| AUD-P3-03 | Selección comunicada principalmente por color | icono/texto/estado ARIA adicional |
| AUD-P3-04 | `ResponsiveEntityPanel` no trapea/restaura foco | adoptar el modal común |
| AUD-P3-05 | Alias legales son páginas completas | redirección 308 + canonical único |
| AUD-P3-06 | `/api/billing/portal` tuvo un GET frío de 10 s y luego 405 en 0,24 s | observar latencia/cold starts; no se considera fallo reproducido |

### Matriz de reproducción P2/P3

Las capturas visuales nuevas quedan pendientes por el bloqueo de navegador descrito. Cuando existe una captura actual defectuosa se nombra en el resultado; el resto de evidencia es código, test, build o HTTP seguro.

| ID · nivel | Ruta/estado inicial y disparador | Esperado | Real |
|---|---|---|---|
| P2-01 · O | 14 secciones manuales; comparar con 8 rutas RR | una entrada por ruta/control | ninguna sección ni PNG RR |
| P2-02 · R | ejecutar `manual:verify` | validar contenido, ruta, estado y vigencia | 12 tests verdes comprueban estructura/existencia |
| P2-03 · O | abrir PNG y compararlo con UI | pantalla/copy actual y completa | seis capturas obsoletas/equivocadas/recortadas; nombres en inventario adjunto |
| P2-04 · O | ejecutar/leer generador | 4 anchos × 2 temas y fallo duro | 720×1280 claro; fallback oculta fallos |
| P2-05 · O | inventariar tests de componentes/E2E | recorridos críticos reales | sin Playwright/Cypress; seis tests React centrados en shell de restore |
| P2-06 · R | `npm test` en checkout limpio | fixtures versionados u opt-in portable | 4 ficheros fallan por rutas absolutas privadas/EPERM |
| P2-07 · O | buscador de cliente abierto | `combobox/listbox/option`, expanded y teclado | apariencia/teclado propios sin semántica completa |
| P2-08 · O | Avisos/RR con un modo activo | tab/pressed anunciado | selección visual sin estado ARIA consistente |
| P2-09 · O | iconos recordatorios/fijos | nombre accesible estable | varios dependen de `title` |
| P2-10 · O | barra inferior a 390 px | target táctil suficiente | flechas 28×28 |
| P2-11 · O | informes/evolución a 390 px | vista adaptada o scroll anunciado | tablas mínimas 820–1120 px |
| P2-12 · O | alta/edición proveedor | editar campo `email` del modelo | formulario no lo ofrece |
| P2-13 · O | alta producto con numérico inválido | error ligado al campo y bloqueo | parse a `undefined`; alta puede continuar |
| P2-14 · O | fijo anual + opción de vencimiento | solo combinaciones persistidas | UI ofrece valores que guardado ignora |
| P2-15 · O | datos inválidos en rectificativa/gasto | resumen inline con foco | `alert()` pierde contexto accesible |
| P2-16 · I | activar ingest en entorno remoto | segundo guard production/remote | basta la flag servidor; no se activó para probar |
| P2-17 · O | leer `.env.example` | solo flag privada servidor | documenta variante `NEXT_PUBLIC_*` de ingest |
| P2-18 · R | GET público `/api/verifactu/status` | mínimo necesario | productor/estado operativo/certificado más amplio |
| P2-19 · R | GET legal y leer canonical | canonical propio/alias único | privacidad y términos canónicos a `/` |
| P2-20 · O | landing/precios junto al CTA | matiz visible y enlace legal | “incluido” sin limitación inmediata suficiente |
| P2-21 · R | build de listados/detalle/impuestos | presupuesto medido/división | ~348/370/331 KB JS inicial respectivamente |
| P2-22 · O | comparar backup AppData con claves RR | “completa” incluye o excluye explícitamente | preferencias/módulos RR quedan fuera |
| P2-23 · R | comparar lista solicitada y árbol API | inventario vigente | provider-summary ya no existe; parser local |
| P2-24 · R | gasto `amount=-100`, línea `+100`, producto previo 80 | no aprender del abono | contador 2, acumulado 180, media 90, coste 100 |
| P2-25 · R | borrar ocurrencia y ejecutar sync | exclusión persistente | reaparece con UUID nuevo |
| P2-26 · R | resumen base 100 + IVA 21 + recargo 5,20 | total operativo 126,20 | gasto queda 121 |
| P2-27 · R | regla Motores 30%; renombrar familia | regla migra | incremento pasa a 0 |
| P2-28 · I | lote con dos facturas del mismo proveedor nuevo | una alta reutilizada | cierre de estado permite dos `addSupplier` |
| P2-29 · R | original rectificada 100 + reemplazo 50 | Panel 50/IVA 10,50 | Panel facturado/IVA 0 |
| P2-30 · O | borrar maestro referenciado y exportar | bloqueo/soft-delete/fallback snapshot | referencia colgante; CSV puede perder NIF proveedor |
| P2-31 · O | alterar/leer snapshot local | hash criptográfico verificado | FNV-1a 32 bit almacenado, no se recalcula |
| P2-32 · O/R | flag billing ausente vs producción actual | auth fail-closed | código permite `dev`; producción hoy dio 401 |
| P2-33 · O | ingest habilitado, inspeccionar orden | limitar/auth antes de parsear | JSON se consume antes; no se hizo POST |
| P2-34 · O | inbound con metadata de adjuntos | host/timeout/tamaño previo | descarga completa hasta 10 antes del límite 4 MB |
| P2-35 · O | fallo RPC del rate limit | política explícita por riesgo | degrada a memoria por instancia; RPC limpia expirados sin índice dedicado |
| P2-36 · O | POST welcome con pareja conocida | actor ligado o token de alta | pública; metadata puede fallar después del email |
| P2-37 · O | crear una línea con tarifa y descuento comercial | conservar tarifa, porcentaje/base y PDF | no hay campo/modelo; solo se puede reducir `unitPrice` |
| P2-38 · O | elegir producto, cambiar descripción, guardar y reabrir borrador | `productId`, coste y margen siguen vinculados | pricing vuelve vacío; coste 0 y margen se presenta como servicio libre |
| P2-39 · O/R | línea 2 ud × 1,5 × 2 m, guardar, reabrir y cambiar medidas | recuperar/reemplazar 2/1,5/2 | campos vuelven a 0; una nueva medición concatena otro sufijo |
| P3-01 · O | preview grande de plantilla | overlay adaptable | mínimo 78 rem |
| P3-02 · O | navegación móvil | destinos priorizados | 11 destinos en scroll |
| P3-03 · O | botones/tarjetas seleccionados | texto/icono/ARIA | depende principalmente de color |
| P3-04 · O | abrir/cerrar panel responsive | trap y restauración de foco | Escape/dialog parcial, sin trap/restore |
| P3-05 · R | GET aliases legales | 308 a URL única | páginas completas duplicadas |
| P3-06 · R | dos GET seguros a portal | 405 estable y rápido | un timeout 10 s; siguiente 405 en 0,24 s |

## Validaciones positivas con evidencia

- La corrección de PR #352 impide aprender precios de producto desde líneas negativas; falta ampliar el guard al signo del documento completo (AUD-P2-24).
- `document-sync` está desactivado por defecto y bloquea expresamente producción/remoto, incluso con flags locales.
- APIs admin completas pasan por identidad server-side; MFA puede exigirse y está documentado como activo en producción.
- Webhooks de Stripe e inbox usan verificación de firma y cuerpos acotados.
- Las rutas privadas principales y APIs envían `no-store`/`noindex`; robots excluye áreas internas.
- Documentos normales emitidos crean issuer/document/pdf snapshots y bloqueo de integridad.
- Unificar clientes permite preservar snapshots emitidos; el problema separado es la acción explícita de reparación.
- Gastos fijos tienen segmentación por fecha de aplicación para no reescribir ocurrencias anteriores.
- Rentabilidad Real distingue ajustes internos no fiscales y configuración local en varios textos.
- El selector de cliente documental desactiva de forma explícita el autocompletado incómodo del navegador en sus campos fiscales.
- La calculadora rápida admite arrastre, teclado y Escape, y se cierra al guardar el documento.
- Build, lint, tipos, migraciones y suite portable pasan.

## Plan de ejecución por fases

### Fase 0 — Contención y definición (sin cambiar datos)

1. Congelar el uso de cifras de `/impuestos` como resultado fiscal definitivo hasta cerrar AUD-P1-01/05/06/07.
2. Marcar la declaración responsable como borrador no válido o retirarla temporalmente.
3. Definir con asesoría el tratamiento por periodo de corrección/anulación y el significado exacto de cada cifra.
4. Diseñar fixtures sintéticos: mismo trimestre, cruce de trimestre/año, IVA mixto, exento, no deducible y cadenas de rectificativas.
5. Decidir política de reparación histórica y evidencia before/after.

**Salida:** especificación aprobada y tests rojos que reproducen todos los P1 fiscales.

### Fase 1 — Bloqueantes de datos/fiscalidad

1. Unificar emisión normal y rectificativa en el pipeline de integridad.
2. Corregir periodización de originales/rectificativas/anulaciones.
3. Separar beneficio, reserva IRPF, IVA y caja.
4. Excluir no deducibles de las bases fiscales sin excluirlos de rentabilidad.
5. Modelar desglose de IVA de gastos y migración legacy no destructiva.
6. Permitir IVA de venta por línea y preservar borradores/importaciones mixtos sin normalización silenciosa.
7. Unificar el signo de abonos en Panel, Impuestos, exports, rentabilidad y catálogo.
8. Corregir recurrencias en Rentabilidad por vigencia, estado y frecuencia.
9. Bloquear reparación emitida sin preview/audit trail; verificar interacción con VeriFactu.
10. Preservar/validar identidad completa en rectificativas.

**Aceptación:** tests unitarios, integración, PDF snapshot, CSV/PDF fiscal y casos cruzados; ninguna migración real sin dry-run y backup.

### Fase 2 — Seguridad, legal y dominios

1. Redirigir/bloquear el dominio Vercel heredado.
2. Someter la declaración SIF y claims a revisión jurídico-técnica; alinear landing, precios, legal y manual.
3. Añadir bloqueo `production/remote` al ingest experimental y retirar la flag pública de ejemplo.
4. Minimizar el status VeriFactu público.
5. Corregir canonicals/aliases legales.
6. Autorizar en servidor documento/emisor de VeriFactu y recordatorios; formalizar representación/certificados.
7. Sustituir la cadena VeriFactu legacy por la RPC/outbox atómica y estado idempotente fiel.
8. Hacer idempotentes packs/webhooks Stripe y transaccional o reanudable el restore admin con AAL2.
9. Cambiar controles sensibles a configuración fail-closed y limitar body/descargas antes de parsear.
10. Añadir test de headers para ambos dominios.

### Fase 3 — Errores funcionales y preservación

1. Corregir la firma Drive de edición de gastos y probar todas las frecuencias.
2. Persistir exclusiones de ocurrencias recurrentes y evitar su reaparición.
3. Conservar recargos de equivalencia y evitar duplicados de proveedor en lote.
4. Proteger borrado de maestros y usar snapshots fiscales como fallback de exportación.
5. Migrar reglas de margen al renombrar familias.
6. Verificar integridad de snapshots con un hash criptográfico/versionado.
7. Completar email de proveedor y validaciones de producto.
8. Añadir descuento explícito de venta con tarifa, porcentaje/base, snapshot y PDF.
9. Persistir `productId`, coste/origen de precio y margen de línea sin depender de la descripción comercial.
10. Persistir medidas estructuradas m²/ml y reconstruir el editor al reabrir.
11. Simplificar vencimiento anual.
12. Sustituir alertas por errores inline y resumen con foco.
13. Hacer portables los fixtures privados mediante opt-in explícito.
14. Endurecer inbox, welcome y rate limits con allowlists, timeouts, cuotas y degradación explícita.

### Fase 4 — Manual y UX

1. Crear las secciones ausentes empezando por fiscalidad corregida y Rentabilidad Real.
2. Documentar cada campo/acción/estado según el inventario adjunto.
3. Regenerar capturas canónicas en escritorio 1440 y móvil 390; añadir 1024/768 y oscuro donde cambie layout.
4. Hacer fallar el verificador si hay fallback, imagen diminuta, ruta incorrecta, hash/fecha obsoletos o cobertura ausente.
5. No publicar instrucciones fiscales antiguas mientras la fase 1 no esté fusionada.

### Fase 5 — Accesibilidad, rendimiento y QA de producción

1. Permitir zoom y validar 200%/400%.
2. Modal/combobox/tabs/pressed común accesible; teclado, foco y lector de pantalla.
3. Alternativas móviles a tablas y targets ≥44×44 cuando corresponda.
4. Dividir JS de PDF/editor/listados; medir LCP/INP/CLS con datos sintéticos.
5. Ejecutar matriz autenticada en producción tras merge: 54 rutas × claro/oscuro × 1440/1024/768/390, priorizando estados con datos largos/error/sin permisos.

### Fase 6 — Mejoras opcionales

- simplificar navegación móvil;
- sincronizar opcionalmente preferencias de Rentabilidad Real o exportarlas aparte;
- observabilidad de Drive/cold starts;
- visual regression de PDFs y capturas.

## Puerta de cierre

La auditoría solo podrá declararse cerrada cuando:

- todos los P1 tengan test de regresión y validación de producto;
- el cálculo fiscal esté aprobado con casos de rectificación por periodos;
- ningún documento emitido cambie por editar maestros/configuración sin herramienta auditada;
- el dominio heredado no sirva una versión paralela;
- el manual cubra todas las rutas/controles aplicables;
- la matriz visual autenticada esté ejecutada y archivada;
- el usuario haya aprobado el plan antes de cualquier migración o reparación de datos.
