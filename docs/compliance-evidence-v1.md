# Factura Autónomo: evidencias técnicas y cumplimiento v1

Fecha de creación: 2026-06-24
Estado del dossier: v1 vivo / actualizado con cierre local-staging 2B.4, cierre documental 2B.5A-M y descriptores sinteticos 2B.6A-C a 2026-06-26
Producto: Factura Autónomo

## 1. Propósito del documento

Este documento es un dossier vivo de evidencias técnicas, decisiones de arquitectura, pruebas y controles aplicados en Factura Autónomo. Su objetivo es facilitar auditorías técnicas externas, revisiones legales/fiscales, preparación futura de declaración responsable, trazabilidad interna y demostración de diligencia en el control de riesgos.

No sustituye una revisión legal, fiscal, tributaria, de seguridad ni una revisión externa. Tampoco declara conformidad productiva completa de VERI*FACTU, SIF, AEAT ni de ninguna obligación normativa pendiente de revisión externa cuando aplique.

Este documento v1 refleja el estado del proyecto a 2026-06-24 y deberá actualizarse tras cada hito técnico relevante.

El documento debe actualizarse cuando cambien controles, modelos de datos, procesos de despliegue, integración fiscal, tratamiento de datos, IA, importadores o políticas de seguridad.

## 2. Identificación del sistema

| Campo | Valor |
| --- | --- |
| Nombre | Factura Autónomo |
| Tipo | Aplicación web de facturación para autónomos y pequeños negocios |
| Arquitectura | Next.js, React, TypeScript, Supabase, Stripe |
| Persistencia local | Navegador, actualmente localStorage |
| Persistencia nube | Supabase para cuentas Pro/sincronizadas |
| Pagos | Stripe |
| Modos de uso | Local sin cuenta y Pro sincronizado |
| Dominio público | `facturacion-autonomos.app` |

El producto combina un modo local, pensado para uso sin cuenta y sin sincronización, con un modo Pro que permite servicios remotos como sincronización, uso de IA y funciones de pago. Esta separación exige controles distintos para datos locales, datos sincronizados, operaciones económicas y operaciones fiscales.

## 3. Normativa y criterios considerados

Fuentes normativas y técnicas consideradas de forma prudente:

- Real Decreto 1007/2023, de 5 de diciembre, sobre requisitos de los sistemas informáticos o electrónicos que soportan procesos de facturación: https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Orden HAC/1177/2024, de 17 de octubre, con especificaciones técnicas, funcionales y de contenido: https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138
- Información pública de AEAT sobre Sistemas Informáticos de Facturación y VERI*FACTU: https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2024/octubre/28/orden-ministerial-que-se-regulan-verifactu.html

Criterios técnicos resumidos, sin reproducir normativa extensa:

- integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de registros de facturación;
- separación entre borradores editables y documentos emitidos;
- generación de registros fiscales encadenados e inmutables cuando corresponda;
- QR tributario y frase asociada solo cuando el flujo real corresponda;
- no prometer modalidad VERI*FACTU productiva sin remisión real validada;
- distinción entre preview/test local, modalidad VERI*FACTU productiva y modalidad NO VERI*FACTU;
- consentimiento y transparencia cuando se envíen datos a servicios externos de IA;
- control de pagos, créditos y eventos Stripe con idempotencia.

## 4. Principios técnicos adoptados

| Principio | Aplicación en el proyecto |
| --- | --- |
| Mínimo privilegio | RLS, GRANT/REVOKE y RPC protegidas en Supabase para tablas económicas y de uso. |
| Separación cliente/servidor | Rutas sensibles de trial, Stripe y parse IA derivan usuario desde Bearer token o service role. |
| No confiar en payload del navegador | Plan, usuario, estado de suscripción y consumo no se aceptan desde cliente para operaciones sensibles. |
| Idempotencia | Eventos Stripe con `stripe_event_id` único y flujo `processing`/`processed`/`failed`. |
| Atomicidad | Consumo/concesión de unidades IA mediante RPC PostgreSQL para evitar doble consumo. |
| Trazabilidad | Informes `FASE1_ACCEPTANCE.md`, `FASE1_5_ACCEPTANCE.md`, `FASE2_PLAN.md`, `FASE2A1_ACCEPTANCE.md`, `FASE2A2_ACCEPTANCE.md`, `FASE2A3_ACCEPTANCE.md`, `FASE2A4_ACCEPTANCE.md`. |
| Integridad documental | `issueDocument`, `documentLifecycle`, `integrityLock` y bloqueo de edición genérica en emitidos. |
| Compatibilidad legacy conservadora | Documentos antiguos no borrador se tratan como emitidos/bloqueados aunque no tengan nuevos campos. |
| Migraciones reproducibles | `supabase/migrations` solo para migraciones up; rollbacks manuales en `supabase/rollbacks`. |
| Tests obligatorios | CI ejecuta test, lint, typecheck, build y aceptación Supabase local. |
| No tocar producción sin staging/validación | Producción Supabase queda pendiente de migración/validación separada; Vercel no promociona dominio automáticamente. |

## 5. Evidencias por fase

| Fase | Objetivo | Commits / PR | Controles implementados | Tests / validación | Resultado |
| --- | --- | --- | --- | --- | --- |
| Fase 1 | Endurecer facturación, suscripciones, créditos IA y Stripe. | `8f7d751 feat(security): harden billing and ai usage controls`; `f909842 docs: record phase 1 acceptance and technical audit` | RLS/GRANT/REVOKE; repositorios servidor; consumo IA atómico; Stripe idempotente; validación de Bearer token. | `FASE1_ACCEPTANCE.md`; aceptación dinámica Supabase local; pruebas de permisos, RPC, concurrencia y Stripe. | Aceptada localmente; producción pendiente de migración/validación separada. |
| Fase 1.5 | Calidad, TypeScript, CI y convención de migraciones. | PR #1 `f8e898e`; `69c9ae6`, `66a5868`, `b65f1f2`, `b186f4a` | GitHub Actions; checks `Quality` y `Supabase Acceptance`; typecheck en verde; `check:migrations`; main protegida. | `FASE1_5_ACCEPTANCE.md`; CI real en GitHub en verde. | Fusionada a `main`; checks obligatorios configurados. |
| Fase 2 | Plan de integridad documental y VERI*FACTU. | `17f95c4 docs: define phase 2 document integrity plan` | Separación conceptual de `documentLifecycle`, `integrityLock`, emisión, envío, pago, aceptación, snapshots y registros fiscales futuros. | `FASE2_PLAN.md`. | Plan oficial definido; implementación dividida en 2A y 2B. |
| Fase 2A.1 | Dominio de emisión y bloqueo central. | PR #2 `06c7246`; commits `b672bec`, `448ba3d`, `eb90df3` | `issueDocument`; `integrityLock`; `updateDocument` protegido; compartir emite antes; operaciones dedicadas de envío/cobro/aceptación; borrado de emitidos/bloqueados rechazado. | `FASE2A1_ACCEPTANCE.md`; CI main: `Quality` y `Supabase Acceptance` en verde. | Fusionada a `main`; producción Vercel no promocionada al dominio público. |
| Fase 2A.2 | Snapshots documentales completos. | PR #3 `d4973f7904781d156e60fcb143610dd1ac1e300f`; commits `16c8b66`, `5713baf` | `DocumentSnapshot`, `DocumentPdfSnapshot`, hashes deterministas, persistencia local y backup; documentos legacy sin migración masiva. | `FASE2A2_ACCEPTANCE.md`; CI main: `Quality` y `Supabase Acceptance` en verde. | Fusionada a `main`; evidencia técnica interna, pendiente de revisión externa cuando aplique. |
| Fase 2A.3 | Fusión segura de clientes. | PR #4 `1d83c9b7afefac586496350f9b673a78f306b408` | Fusión de clientes sin alterar `document.client` histórico; `documentSnapshot.customer` no se modifica; `snapshotHash` y `pdfSnapshot.contentHash` no se alteran; `customerId` permite vinculación operativa al cliente maestro; `mergedCustomerIds` conserva IDs absorbidos; borradores solo actualizan cliente visible si `updateDraftDocuments=true`. | `FASE2A3_ACCEPTANCE.md`; `Quality` SUCCESS; `Supabase Acceptance` SUCCESS. | Fusionada a `main`; controles implementados como medida de diligencia técnica. |
| Fase 2A.4 | Borrado, numeración y recibos seguros. | PR #5 `73730277c8985dd8983f5edf58ce8981824e04ba`; funcional `b70593ba3e2488a46b9f4841aabc0e30e1d2981d`; documental `ea6ff5c66678ed2f7c274525ec7696c33e342b58` | Documentos emitidos/bloqueados no se borran físicamente; legacy `status != borrador` protegido; rectificativas emitidas, presupuestos enviados/aceptados y recibos pagados/emitidos no se borran; renumeración ignora documentos protegidos; huecos de emitidos se conservan; desmarcar cobro conserva recibos automáticos emitidos/bloqueados; snapshots y hashes no se alteran. | `FASE2A4_ACCEPTANCE.md`; `npm run check:migrations` OK; `npm test` OK, 86 archivos, 411 tests; lint OK; tsc OK; build OK, Next.js 15.5.19, 58 páginas estáticas; `test:phase1-acceptance` OK; `git diff --check` OK; CI main en verde. | Fusionada a `main`; evidencia técnica interna, pendiente de revisión externa cuando aplique. |
| Fase 2A.5 | PDF histórico desde snapshot. | PR #8 `11dd6fa7c961a0abb256083a3fc681e8110be2f7`; funcional `db03153dcef7c8a1406a2312a2341729094f82ab`; documental `c42975b9c63ea7a41bd15c8c443f99568ae6c8da` | PDFs de documentos emitidos/bloqueados se renderizan desde `documentSnapshot` y `pdfSnapshot`; borradores siguen usando datos vivos; cambios posteriores en perfil, cliente, líneas, notas, fechas o totales vivos no alteran PDF histórico; descarga, vista previa, blob PDF y compartir email/WhatsApp usan pipeline común; legacy protegido sin snapshot usa fallback read-only conservador sin persistirlo; render normal no recalcula ni reemplaza hashes. | `FASE2A5_ACCEPTANCE.md`; `npm run check:migrations` OK; `npm test` OK, 87 archivos, 419 tests; lint OK; tsc OK; build OK, Next.js 15.5.19, 58 páginas estáticas; `test:phase1-acceptance` OK con Supabase local; `git diff --check` OK; CI main en verde. | Fusionada a `main`; evidencia técnica interna, pendiente de revisión externa cuando aplique; no constituye certificación. |
| Fase 2B.4 / 2B.5 | Cierre de flujo fiscal local/staging y plan de frontera externa. | PR #44 merge `efb9c1288ec44bdf7e04bdc8c1664e75fadd1864`; PR #45 merge `b697e5b1b8025030a9ce3eecacf8853ae12f555f` | Operación fiscal local/staging; `fiscal_records`; `fiscal_chain_state`; payload candidato; validación semántica; evidence packets; evidence persistence; evidence integrity; operational summary; checkpoint y plan de frontera externa. | Quality SUCCESS; Supabase Acceptance SUCCESS; validadores 2B en verde; pruebas Supabase local de fases 2B.4; `npm test`, lint, tsc y build ejecutados cuando aplicó; `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`; `docs/phase2b5-external-verifactu-boundary-plan-v1.md`. | Evidencia técnica interna local/staging; no es certificación, no es homologación AEAT, no habilita uso productivo de VeriFactu ni envío real a AEAT. |

Archivos internos relevantes:

- `AUDITORIA_FACTURA_AUTONOMO.md`
- `FASE1_ACCEPTANCE.md`
- `FASE1_5_ACCEPTANCE.md`
- `FASE2_PLAN.md`
- `FASE2A1_ACCEPTANCE.md`
- `FASE2A2_ACCEPTANCE.md`
- `FASE2A3_ACCEPTANCE.md`
- `FASE2A4_ACCEPTANCE.md`
- `FASE2A5_ACCEPTANCE.md`
- `supabase/README.md`
- `docs/VERIFACTU.md`
- `docs/PRODUCTOR_SIF.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`
- `docs/phase2b5-external-verifactu-boundary-plan-v1.md`

## 6. Seguridad de Supabase y permisos

Tablas críticas revisadas/endurecidas en Fase 1:

- `user_subscriptions`
- `user_usage`
- `payment_receipts`
- `stripe_events`
- tablas relacionadas con créditos, escaneos y unidades IA

Controles aplicados:

- los roles `anon` y `authenticated` no deben poder insertar, actualizar ni borrar suscripciones, planes, estados, trials, saldos o consumo;
- un usuario autenticado solo debe poder leer su propia información donde corresponda;
- escrituras sensibles se restringen al servidor con service role o RPC explícitamente protegidas;
- RPC como `consume_ai_units` y `grant_ai_credit_units` quedan restringidas, con `search_path` seguro y acceso controlado;
- la suite de aceptación local valida matriz `anon` / usuario A / usuario B / `service_role`.

Estado:

- validado en Supabase local;
- producción sigue pendiente de un procedimiento separado de baseline/migración/validación;
- no se debe aplicar la base schema manual sobre una producción existente sin comprobar baseline.

## 7. Seguridad de Stripe, pagos y créditos

Controles implementados:

- validación de `STRIPE_WEBHOOK_SECRET`;
- tabla de eventos Stripe procesados con `stripe_event_id` único;
- reserva de evento y efectos idempotentes;
- eventos repetidos no deben duplicar suscripciones, créditos ni recibos;
- estados de evento contemplados: `processing`, `processed`, `failed`;
- consumo IA sustituido por operación atómica PostgreSQL;
- doble consumo concurrente no debe dejar saldo negativo;
- concesiones concurrentes deben sumar sin perder unidades.

Riesgo pendiente:

- recuperación automática de eventos Stripe atascados en `processing` sigue en backlog técnico, no implementada todavía.

## 8. Integridad documental

Controles implementados en Fase 2A.1:

- los documentos emitidos quedan con `documentLifecycle = issued`;
- los documentos emitidos quedan con `integrityLock = locked`;
- `updateDocument` no puede reemplazar documentos bloqueados;
- documentos legacy con `status` distinto de `borrador` se tratan conservadoramente como emitidos/bloqueados;
- compartir por email/WhatsApp emite primero si el documento aún era borrador;
- si el envío falla, el documento puede quedar emitido con `deliveryStatus = not_sent`;
- operaciones dedicadas separan envío, cobro y aceptación;
- borrado normal de documentos emitidos/bloqueados queda rechazado.

Controles implementados en Fase 2A.2:

- snapshots completos de contenido documental, emisor, cliente, líneas, impuestos, numeración y plantilla;
- `documentSnapshot` y `pdfSnapshot` se capturan en emisión;
- hashes deterministas separan contenido documental de datos operativos como fecha de captura/render;
- persistencia local, carga y backup conservan snapshots;
- documentos legacy sin snapshot siguen siendo válidos sin migración masiva.

Controles implementados en Fase 2A.3:

- la fusión de clientes no altera `document.client` histórico en documentos emitidos;
- `documentSnapshot.customer` no se modifica;
- `snapshotHash` y `pdfSnapshot.contentHash` no se alteran durante la fusión;
- `customerId` permite vinculación operativa al cliente maestro sin reescribir destinatario histórico;
- `mergedCustomerIds` conserva los IDs absorbidos para búsquedas/listados;
- los borradores solo actualizan el cliente visible si se solicita explícitamente con `updateDraftDocuments=true`.

Riesgos diferidos de Fase 2A.3:

- deduplicación inteligente por NIF;
- fusión automática desde importadores;
- sync nube protegida desde servidor;
- auditoría servidor de fusiones;
- PDF histórico estricto.

Controles implementados en Fase 2A.4:

- documentos emitidos o bloqueados no se borran físicamente;
- documentos legacy con `status != "borrador"` se tratan como protegidos;
- rectificativas emitidas no se borran;
- presupuestos enviados/aceptados no se borran;
- recibos pagados/emitidos no se borran;
- `renumberDocumentsForKindYear` ignora `locked`, `issued`, `canceled`, legacy no borrador, `documentSnapshot` y `pdfSnapshot`;
- los huecos de numeración de documentos emitidos se conservan;
- desmarcar cobro conserva recibos automáticos emitidos/bloqueados;
- snapshots y hashes no se alteran al desmarcar cobro.

Validación técnica interna de Fase 2A.4:

- `npm run check:migrations`: OK;
- `npm test`: OK, 86 archivos, 411 tests;
- `npm run lint`: OK;
- `npx tsc --noEmit`: OK;
- `npm run build`: OK, Next.js 15.5.19, 58 páginas estáticas;
- `npm run test:phase1-acceptance`: OK;
- `git diff --check`: OK;
- `Quality` sobre `main`: SUCCESS;
- `Supabase Acceptance` sobre `main`: SUCCESS.

Riesgos diferidos de Fase 2A.4:

- flujo completo de anulación/cancelación;
- auditoría específica de intentos de borrado bloqueados;
- sync nube protegida desde servidor;
- reconciliación de estados legacy `paymentStatus`/`paidAt`;
- PDF histórico estricto.

Controles implementados en Fase 2A.5:

- PDFs de documentos emitidos/bloqueados se renderizan desde `documentSnapshot` y `pdfSnapshot`;
- los borradores siguen renderizando desde datos vivos;
- cambios posteriores en el perfil de negocio no alteran el PDF histórico;
- cambios posteriores en cliente no alteran el PDF histórico;
- cambios posteriores en líneas, notas, fechas o totales vivos no alteran el PDF histórico;
- descarga, vista previa, blob PDF y compartir email/WhatsApp usan pipeline común;
- legacy protegido sin snapshot usa fallback read-only conservador;
- el fallback legacy no se persiste automáticamente;
- render normal no recalcula ni reemplaza `snapshotHash`;
- render normal no recalcula ni reemplaza `pdfSnapshot.contentHash`.

Validación técnica interna de Fase 2A.5:

- `npm run check:migrations`: OK;
- `npm test`: OK, 87 archivos, 419 tests;
- `npm run lint`: OK;
- `npx tsc --noEmit`: OK;
- `npm run build`: OK, Next.js 15.5.19, 58 páginas estáticas;
- `npm run test:phase1-acceptance`: OK con Supabase local;
- `git diff --check`: OK;
- `Quality` sobre `main`: SUCCESS;
- `Supabase Acceptance` sobre `main`: SUCCESS.

Riesgos diferidos de Fase 2A.5:

- renderer PDF visual completamente congelado por versión si se requiere reproducibilidad pixel-perfect;
- almacenamiento de PDF binario firmado/sellado;
- recuperación/migración explícita de snapshots legacy;
- sync nube protegido desde servidor;
- VERI*FACTU servidor, registro fiscal atómico y transporte AEAT real;
- revisión externa legal/fiscal cuando aplique.

Trabajo pendiente:

- sincronización nube con reglas de integridad servidor.

## 9. VERI*FACTU

Existe actualmente:

- modelo y utilidades locales para información `verifactu` en documentos;
- generación/uso de QR en PDF cuando el documento contiene datos Veri*Factu;
- planificación técnica en `FASE2_PLAN.md`;
- separación conceptual entre documento, snapshot, operación fiscal, registro fiscal e intento de transporte.
- cierre de 2B.4 como flujo fiscal local/staging:
  `PHASE2B4_LOCAL_STAGING_FISCAL_FLOW: CLOSED / LOCAL-STAGING ONLY`;
- checkpoint de cierre 2B.4:
  `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`;
- plan de frontera externa 2B.5:
  `docs/phase2b5-external-verifactu-boundary-plan-v1.md`.
- investigacion, contrato interno, plan de fixtures sinteticos y politica
  previa de fuentes/esquema/canonicalizacion 2B.5A/B/C/D:
  `docs/phase2b5a-official-xml-qr-research-v1.md`;
  `docs/phase2b5b-internal-xml-contract-v1.md`;
  `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`;
  `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`.
- registro de artefactos oficiales, politica documental de certificados/firma
  y frontera documental de transporte/respuestas/reintentos 2B.5E/F/G:
  `docs/phase2b5e-official-artifacts-registry-v1.md`;
  `docs/phase2b5f-certificate-signature-policy-v1.md`;
  `docs/phase2b5g-transport-responses-retry-boundary-v1.md`.
- planes de entrada a codigo seguro, fixtures sinteticos futuros,
  canonicalizacion/hash candidato, frontera QR/presentacion, revision externa y
  checkpoint de cierre documental 2B.5H/I/J/K/L/M:
  `docs/phase2b5h-safe-executable-implementation-plan-v1.md`;
  `docs/phase2b5i-synthetic-fixtures-execution-plan-v1.md`;
  `docs/phase2b5j-canonicalization-hash-execution-plan-v1.md`;
  `docs/phase2b5k-qr-presentation-boundary-plan-v1.md`;
  `docs/phase2b5l-external-review-staging-readiness-v1.md`;
  `docs/phase2b5-external-boundary-documentation-checkpoint-v1.md`.

Los documentos 2B.5E/F/G son planificacion y frontera documental. No crean
firma, no cargan certificados, no implementan transporte, no usan
`fiscal_transport_attempts`, no generan XML definitivo y no declaran
cumplimiento productivo.

Los documentos 2B.5H-M son planificacion y cierre de frontera documental. No
implementan XML, QR, firma, certificados ni transporte. Tampoco activan
produccion, AEAT real, fixtures ejecutables ni cumplimiento productivo.

Evidencia técnica interna local/staging de 2B.4:

- operación fiscal local/staging con idempotencia y transición controlada;
- persistencia candidata en `fiscal_records`;
- encadenado local/staging en `fiscal_chain_state`;
- payload candidato, no definitivo y no transportable;
- validación semántica del payload candidato;
- evidence packets internos sin XML completo ni snapshots completos;
- evidence persistence separada en `fiscal_evidence_packets`;
- evidence integrity read-only contra registros y cadena;
- operational summary agregado, server-only y sin datos sensibles completos.

Validaciones asociadas a 2B.4:

- Quality en GitHub Actions;
- Supabase Acceptance en GitHub Actions;
- validadores 2B existentes;
- pruebas Supabase local para flujos 2B.4;
- `npm test`, lint, tsc y build cuando aplicó a los PRs funcionales;
- revisión de checkpoint y plan de frontera como documentación de límites.

No debe prometerse todavía:

- conformidad productiva completa VERI*FACTU;
- validación oficial AEAT cerrada;
- remisión productiva real a AEAT;
- modalidad NO VERI*FACTU válida en modo local;
- que el QR/frase productiva sean definitivos sin flujo servidor y transporte AEAT validados.

Límites explícitos del cierre 2B.4 y la frontera 2B.5:

- no es certificación;
- no es homologación AEAT;
- no habilita uso productivo de VeriFactu;
- no existe XML AEAT definitivo;
- no existe firma;
- no existen certificados reales en uso;
- no existe transporte AEAT;
- no hay producción fiscal activada;
- requiere revisión legal/fiscal externa antes de cualquier paso real.

Pendiente post-2B.4:

- revision externa de la investigacion tecnica de XML, QR y campos oficiales;
- confirmacion externa del contrato interno futuro, separado de firma y transporte;
- implementacion futura de fixtures sinteticos y validacion local, todavia no creada;
- fijacion futura de fuentes oficiales, esquema, canonicalizacion y
  anonimizacion antes de fixtures ejecutables;
- aprobacion futura de politica operativa de certificados antes de cualquier
  firma real;
- diseno futuro de transporte AEAT con contrato, entorno autorizado y seguridad
  antes de cualquier conexion real;
- diseno futuro de respuestas y reintentos sin produccion hasta aprobacion
  explicita;
- primera fase de codigo recomendada:
  `PHASE2B6A_SYNTHETIC_FIXTURE_GUARDRAILS_V1`, limitada a guardrails de
  fixtures sinteticos y sin XML completo.
- primera capa ejecutable interna 2B.6A:
  `docs/phase2b6a-synthetic-fixture-guardrails-v1.md` y
  `src/lib/verifactu-synthetic-fixtures/`; valida descriptores sinteticos y
  material bloqueado sin crear XML real, sin fixtures XML completos, sin AEAT,
  sin transporte y sin certificados.
- descriptores sinteticos 2B.6B de Oleada 1:
  `docs/phase2b6b-synthetic-fixture-descriptors-v1.md` y
  `src/lib/verifactu-synthetic-fixtures/fixtures.ts`; anaden escenarios
  ficticios minimos sin XML real, sin datos reales y sin transporte.
- descriptores sinteticos negativos/controlados 2B.6C de Oleada 2:
  `docs/phase2b6c-synthetic-fixture-negative-descriptors-v1.md`; anaden casos
  ficticios de NIF, fecha, serie/numero y huella candidata, sin XML real, sin
  datos reales y sin transporte.
- tuberia sintetica candidata 2B.6D-H:
  `docs/phase2b6d-synthetic-candidate-canonicalization-v1.md`,
  `docs/phase2b6e-synthetic-candidate-hash-v1.md`,
  `docs/phase2b6f-in-memory-synthetic-xml-candidate-v1.md`,
  `docs/phase2b6g-local-synthetic-xml-candidate-validation-v1.md` y
  `docs/phase2b6h-synthetic-candidate-xml-pipeline-checkpoint-v1.md`;
  transforma descriptores ficticios en candidatos internos, con
  `candidate_not_aeat`, `syntheticOnly: true`, XML minimo solo en memoria,
  validacion local y sin QR, firma, certificados, transporte, AEAT real,
  produccion ni XML oficial.

La frase VERI*FACTU productiva solo debe usarse cuando el flujo real de alta/anulación, QR, firma/cadena, transporte y respuesta AEAT esté cerrado y validado.

## 10. Gestión de cambios y despliegues

Controles operativos:

- `main` protegida mediante ruleset activo;
- pull request obligatorio antes de merge;
- checks requeridos: `Quality` y `Supabase Acceptance`;
- merge controlado con `--match-head-commit`;
- Vercel genera deployments por Git, pero el dominio público no se mueve automáticamente;
- `autoAssignCustomDomains = false` verificado por API Vercel durante PR #2;
- `facturacion-autonomos.app` permaneció apuntando a deployment anterior tras PR #2;
- no se ejecuta `promote`, alias, rollback ni cambio de dominio durante revisiones/merge.

Procedimiento esperado:

1. desarrollo en rama específica;
2. validación local;
3. PR;
4. CI GitHub;
5. revisión de diff y preview;
6. merge controlado;
7. verificación de `main`;
8. promoción o cambio de dominio solo mediante decisión separada.

## 11. Datos locales y backups

Modo local:

- permite uso sin cuenta;
- datos almacenados en navegador;
- riesgo inherente: pérdida por limpieza de navegador, cambio de dispositivo, perfil distinto o fallo de localStorage.

Controles existentes:

- export/import de copia JSON;
- normalización conservadora de datos cargados;
- preservación de campos desconocidos en documentos durante normalización;
- tests de backup y storage para campos de integridad documental.

Pendiente:

- backups automáticos o recordatorios de backup;
- snapshots preimportación;
- IndexedDB o almacenamiento local más robusto;
- historial de restauración;
- protección adicional ante sobrescritura local/nube.

## 12. IA y tratamiento externo

Controles y criterios:

- las funciones IA deben estar condicionadas a aceptación informada cuando impliquen terceros;
- los créditos/unidades IA se consumen y controlan desde servidor;
- no se debe confiar en `userId`, plan o entitlement enviados por cliente;
- los textos legales deben informar del tratamiento externo cuando proceda;
- el uso de IA para escaneo/autorrelleno debe tener límites y trazabilidad de consumo.

Pendiente:

- registro versionado de aceptación legal/IA;
- revisión legal final del encargo/tratamiento externo;
- inventario de proveedores IA, finalidades, categorías de datos y retención;
- controles adicionales para evitar envío accidental de datos innecesarios.

## 13. Worker privado futuro

Existe como capacidad futura documentada, no como servicio productivo activo.

Estado:

- no activo;
- no conectado a producción;
- no apto aún para datos reales;
- no debe usarse como evidencia de cumplimiento hasta que tenga revisión de seguridad, aislamiento, logs, control de secretos, despliegue reproducible y validación legal/técnica.

## 14. Riesgos pendientes

| Riesgo | Severidad | Fase prevista | Estado | Mitigación prevista |
| --- | --- | --- | --- | --- |
| Producción Supabase no migrada/validada con Fase 1 | Alta | Operación/staging | Pendiente | Baseline, staging, migración controlada y aceptación contra entorno no productivo antes de producción. |
| Eventos Stripe atascados en `processing` | Media | Backlog técnico | Pendiente | Reintentos controlados, job de recuperación, alertas e inspección manual segura. |
| Deduplicación inteligente y fusión automática de clientes desde importadores | Media | Importación futura / servidor | Pendiente | Mantener fusión manual conservadora; no fusionar desde importadores sin previsualización y auditoría. |
| Flujo completo de anulación/cancelación aún no implementado | Alta | Fase posterior | Pendiente | Diseñar operación dedicada, trazable y compatible con snapshots/documentos bloqueados. |
| Auditoría específica de intentos de borrado bloqueados | Media | Fase posterior / servidor | Pendiente | Registrar intentos relevantes sin permitir mutación de documentos protegidos. |
| Reconciliación de estados legacy `paymentStatus`/`paidAt` | Media | Fase posterior | Pendiente | Normalización guiada y tests de compatibilidad antes de automatizar cambios. |
| Reproducibilidad pixel-perfect del renderer PDF por versión | Media | Fase posterior | Pendiente | Congelar renderer visual por versión y valorar PDF binario firmado/sellado si el producto lo requiere. |
| Frontera externa Veri*Factu posterior a 2B.4 | Alta | Fase 2B.5+ | Pendiente de revisión/diseño externo | Mantener 2B.4 como local/staging; no tratar payload candidato como XML AEAT definitivo; no usar evidencia como cola de transporte; exigir revisión legal/fiscal externa antes de pasos reales. |
| Modo local con localStorage puede perder datos | Media | Producto/datos | Pendiente | Backups, IndexedDB, avisos, exportaciones y recuperación guiada. |
| Consentimiento IA sin registro versionado completo | Media | Legal/IA | Pendiente | Versionado de aceptación, auditoría de proveedores y copia de textos aceptados. |
| Importador puede generar duplicados/sobrescrituras | Media | Importación futura | Pendiente | Previsualización, snapshots preimportación, idempotencia y opción de rollback/import audit. |
| Uso indebido de mensajes comerciales de cumplimiento | Alta | Legal/producto | Control continuo | Lista de declaraciones permitidas/no permitidas y revisión antes de publicar. |

## 15. Declaraciones permitidas y no permitidas

Declaraciones permitidas:

- "Se han implementado controles de seguridad y trazabilidad progresivos."
- "La app se está diseñando para cumplir con requisitos de integridad documental."
- "Fase 1, Fase 1.5 y Fase 2A.1-2A.5 tienen evidencia técnica interna y tests asociados."
- "La validación de Supabase y CI se ejecuta localmente y en GitHub para los PRs protegidos."
- "El trabajo VERI*FACTU productivo está planificado por fases y todavía no se declara cerrado."

Declaraciones no permitidas todavía:

- "VERI*FACTU productivo está totalmente cerrado."
- "AEAT ha validado oficialmente el producto."
- "El producto tiene validación externa completa."
- "Envía a AEAT en producción."
- "Modo local cumple NO VERI*FACTU."
- "El QR productivo está validado por AEAT."
- "La declaración responsable ya puede emitirse sin revisión externa."

## 16. Próximos pasos

| Paso | Objetivo | Estado |
| --- | --- | --- |
| Fase 2A.2 | Snapshots documentales completos | Fusionada a `main`; evidencia técnica interna registrada. |
| Fase 2A.3 | Fusión segura de clientes | Fusionada a `main`; evidencia técnica interna registrada. |
| Fase 2A.4 | Borrado, numeración y recibos seguros | Fusionada a `main`; evidencia técnica interna registrada. |
| Fase 2A.5 | PDF histórico desde snapshot | Fusionada a `main`; evidencia técnica interna registrada. |
| Fase 2B.4 | Flujo fiscal local/staging | Cerrada como `PHASE2B4_LOCAL_STAGING_FISCAL_FLOW: CLOSED / LOCAL-STAGING ONLY`; evidencia técnica interna registrada. |
| Fase 2B.5 | Frontera externa XML/QR/firma/certificados/transporte | Documentacion 2B.5A-M cerrada como frontera externa; implementacion real pendiente de decision explicita, revision externa, especificacion oficial, staging autorizado y aprobacion. |
| Fase 2B.6A | Guardrails de fixtures sinteticos | Primera capa ejecutable interna; valida descriptores sinteticos sin XML real, sin fixtures XML completos, sin AEAT, sin transporte y sin certificados. |
| Fase 2B.6B | Descriptores sinteticos Oleada 1 | Escenarios ficticios `alta_basic`, `chain_first`, `chain_second` y `cancel_basic`; sin XML real, sin datos reales y sin transporte. |
| Fase 2B.6C | Descriptores sinteticos negativos Oleada 2 | Escenarios ficticios `alta_invalid_nif`, `alta_invalid_date`, `alta_missing_series_number` y `alta_hash_mismatch`; sin XML real, sin datos reales y sin transporte. |
| Legal | Revisión legal/fiscal y declaración responsable | Pendiente de base técnica cerrada. |
| Staging | Entorno previo a producción | Pendiente. |
| Producción | Migraciones y despliegue controlado | Pendiente; no tocar sin validación. |

## 17. Historial de actualización

| Fecha | Cambio | Fase | PR/commit | Responsable |
| --- | --- | --- | --- | --- |
| 2026-06-24 | Endurecimiento de seguridad, billing, IA y Stripe aceptado localmente. | Fase 1 | `8f7d751`, `f909842` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | CI, typecheck, convención de migraciones y protección de main. | Fase 1.5 | PR #1 `f8e898e`; `69c9ae6`, `66a5868`, `b65f1f2`, `b186f4a` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | Plan oficial de integridad documental y VERI*FACTU. | Fase 2 | `17f95c4` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | Emisión y bloqueo central fusionados a main. | Fase 2A.1 | PR #2 `06c7246`; `b672bec`, `448ba3d`, `eb90df3` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | Snapshots documentales completos fusionados a main. | Fase 2A.2 | PR #3 `d4973f7904781d156e60fcb143610dd1ac1e300f`; `16c8b66`, `5713baf` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | Fusión segura de clientes fusionada a main. | Fase 2A.3 | PR #4 `1d83c9b7afefac586496350f9b673a78f306b408`; `5e0ff32`, `067bed2` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | Borrado, numeración y recibos seguros fusionados a main. | Fase 2A.4 | PR #5 `73730277c8985dd8983f5edf58ce8981824e04ba`; `b70593b`, `ea6ff5c` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | PDF histórico desde snapshot fusionado a main. | Fase 2A.5 | PR #8 `11dd6fa7c961a0abb256083a3fc681e8110be2f7`; `db03153d`, `c42975b` | Equipo Factura Autónomo / Codex |
| 2026-06-24 | Creación del dossier vivo de evidencias técnicas y cumplimiento. | Compliance | `4bfbe5c` | Equipo Factura Autónomo / Codex |
| 2026-06-25 | Cierre local/staging 2B.4 y frontera documental 2B.5 añadidos al dossier. | Fase 2B.4 / 2B.5 | PR #44 `efb9c1288ec44bdf7e04bdc8c1664e75fadd1864`; PR #45 `b697e5b1b8025030a9ce3eecacf8853ae12f555f` | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Cierre documental 2B.5H-M y checkpoint de frontera externa añadidos al dossier. | Fase 2B.5 | PR documental 2B.5H-M | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Guardrails ejecutables internos para descriptores sinteticos añadidos al dossier. | Fase 2B.6A | PR 2B.6A guardrails sinteticos | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Descriptores sinteticos de Oleada 1 añadidos al dossier. | Fase 2B.6B | PR 2B.6B descriptores sinteticos | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Descriptores sinteticos negativos de Oleada 2 añadidos al dossier. | Fase 2B.6C | PR 2B.6C descriptores negativos sinteticos | Equipo Factura Autónomo / Codex |

## Anexo A. Evidencias técnicas locales recientes

Durante las fases 2A.2, 2A.3, 2A.4 y 2A.5 se documentaron validaciones locales con resultado correcto en sus respectivos informes de aceptación:

- `FASE2A2_ACCEPTANCE.md`
- `FASE2A3_ACCEPTANCE.md`
- `FASE2A4_ACCEPTANCE.md`
- `FASE2A5_ACCEPTANCE.md`

Para Fase 2A.4 constan expresamente:

- `npm run check:migrations`: OK;
- `npm test`: OK, 86 archivos, 411 tests;
- `npm run lint`: OK;
- `npx tsc --noEmit`: OK;
- `npm run build`: OK, Next.js 15.5.19, 58 páginas estáticas;
- `npm run test:phase1-acceptance`: OK;
- `git diff --check`: OK.

Para Fase 2A.5 constan expresamente:

- `npm run check:migrations`: OK;
- `npm test`: OK, 87 archivos, 419 tests;
- `npm run lint`: OK;
- `npx tsc --noEmit`: OK;
- `npm run build`: OK, Next.js 15.5.19, 58 páginas estáticas;
- `npm run test:phase1-acceptance`: OK con Supabase local;
- `git diff --check`: OK;
- `Quality` sobre `main`: SUCCESS;
- `Supabase Acceptance` sobre `main`: SUCCESS.

Para el cierre 2B.4 y la frontera 2B.5 constan como referencias internas:

- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`;
- `docs/phase2b5-external-verifactu-boundary-plan-v1.md`;
- `docs/phase2b5a-official-xml-qr-research-v1.md`;
- `docs/phase2b5b-internal-xml-contract-v1.md`;
- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`;
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`;
- `docs/phase2b5e-official-artifacts-registry-v1.md`;
- `docs/phase2b5f-certificate-signature-policy-v1.md`;
- `docs/phase2b5g-transport-responses-retry-boundary-v1.md`;
- `docs/phase2b5h-safe-executable-implementation-plan-v1.md`;
- `docs/phase2b5i-synthetic-fixtures-execution-plan-v1.md`;
- `docs/phase2b5j-canonicalization-hash-execution-plan-v1.md`;
- `docs/phase2b5k-qr-presentation-boundary-plan-v1.md`;
- `docs/phase2b5l-external-review-staging-readiness-v1.md`;
- `docs/phase2b5-external-boundary-documentation-checkpoint-v1.md`;
- `docs/phase2b6a-synthetic-fixture-guardrails-v1.md`;
- `docs/phase2b6b-synthetic-fixture-descriptors-v1.md`;
- `docs/phase2b6c-synthetic-fixture-negative-descriptors-v1.md`;
- `docs/phase2b6d-synthetic-candidate-canonicalization-v1.md`;
- `docs/phase2b6e-synthetic-candidate-hash-v1.md`;
- `docs/phase2b6f-in-memory-synthetic-xml-candidate-v1.md`;
- `docs/phase2b6g-local-synthetic-xml-candidate-validation-v1.md`;
- `docs/phase2b6h-synthetic-candidate-xml-pipeline-checkpoint-v1.md`;
- Quality sobre los PRs y `main`: SUCCESS;
- Supabase Acceptance sobre los PRs y `main`: SUCCESS;
- validadores 2B ejecutados durante las subfases y cierre;
- pruebas Supabase local de operación fiscal, registros, cadena, payload candidato,
  validación semántica, evidence packets, persistence, integrity y operational
  summary;
- `npm test`, lint, tsc y build ejecutados cuando aplicó a los PRs funcionales.

Estas referencias son evidencia técnica interna local/staging. No sustituyen
revisión legal/fiscal externa, no activan producción fiscal y no autorizan envío
real a AEAT.

Estas evidencias son técnicas internas y deberán revisarse externamente cuando aplique.
