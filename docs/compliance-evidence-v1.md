# Factura Autónomo: evidencias técnicas y cumplimiento v1

Fecha de creación: 2026-06-24
Estado del dossier: v1 vivo / actualizado con cierre local-staging 2B.4, cierre documental 2B.5A-M, descriptores sinteticos 2B.6A-C, bloqueo oficial 2B.7F-K, enforcement 2B.7L-P, readiness tooling 2B.7Q-U, unlock preparation 2B.7V-Z, base server-only de sync 2C.1-2C.6, adaptador in-memory local/staging 2C.7-2C.12, diseno de adaptador Supabase local/staging 2C.13-2C.18, schema local/staging compatible 2C.19-2C.24, servicio server-only 2C.25-2C.30, route shell deshabilitada 2C.31-2C.36, ejecucion local/fake endurecida 2C.37-2C.48, handler privado local/staging 2C.49-2C.56, private staging readiness gates 2C.57-2C.66, local data safety / backup restore 2D.1-2D.10, backup/import review flow 2D.11-2D.20, disabled UI shell 2D.21-2D.32, disabled UI wiring 2D.33-2D.44, routeless UI preview harness 2D.45-2D.56, local data safety regression corpus 2D.57-2D.68, import/restore wiring decision package 2D.69-2D.80, hidden/routeless UI shell 2D.81-2D.92, hidden UI enablement safety gates 2D.93-2D.104, local storage resilience foundation 2E.1-2E.12 y export de snapshots de auditoria AUDIT_EXPORT_V1 a 2026-06-27
Producto: Factura Autónomo

## 1. Propósito del documento

Este documento es un dossier vivo de evidencias técnicas, decisiones de arquitectura, pruebas y controles aplicados en Factura Autónomo. Su objetivo es facilitar auditorías técnicas externas, revisiones legales/fiscales, preparación futura de declaración responsable, trazabilidad interna y demostración de diligencia en el control de riesgos.

No sustituye una revisión legal, fiscal, tributaria, de seguridad ni una revisión externa. Tampoco declara conformidad productiva completa de VERI*FACTU, SIF, AEAT ni de ninguna obligación normativa pendiente de revisión externa cuando aplique.

Este documento v1 refleja el estado del proyecto a 2026-06-24 y deberá actualizarse tras cada hito técnico relevante.

El documento debe actualizarse cuando cambien controles, modelos de datos, procesos de despliegue, integración fiscal, tratamiento de datos, IA, importadores o políticas de seguridad.

## Gestion de snapshots de auditoria

AUDIT_EXPORT_V1_COMPLIANCE_DOSSIER_SNAPSHOT define una capa de exportacion documental para preparar revisiones externas sin sustituir este Markdown.

`docs/compliance-evidence-v1.md` sigue siendo la fuente viva, canonica, editable, versionada y revisable por PR. HTML/PDF son snapshots derivados para auditoria tecnica, revision legal/fiscal y trazabilidad. Deben incluir commit y fecha cuando se generen, no se editan manualmente como fuente principal y se regeneran tras hitos relevantes.

Los snapshots no sustituyen revision externa, no son asesoramiento fiscal y no declaran cumplimiento productivo, certificacion, homologacion, validacion AEAT, endpoint operativo ni sync productiva.

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
| Fase 2B.7Q-U | Tooling local/offline para preparar entrada manual futura de artefactos oficiales. | PR 2B.7Q-U readiness tooling | Intake local, checksum SHA-256, grafo import/include, CLI de readiness y acceptance tests con XSD sinteticos temporales. | Validadores 2B.7Q-U; vitest de `src/lib/verifactu-official-artifact-readiness`; acceptance test `scripts/phase2b7t-official-artifact-readiness-acceptance.test.ts`. | `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / READINESS TOOLING AVAILABLE`; sin XML oficial, sin XSD oficial commiteado, sin validador real, sin QR, sin firma, sin transporte y sin produccion. |
| Fase 2B.7V-Z | Preparacion final de desbloqueo manual futuro de artefactos oficiales. | PR 2B.7V-Z unlock preparation | Lockfile contract, generator local, verifier opt-in, checklist humana y checkpoint final. | Validadores 2B.7V-Z; tests de lockfile/generator/verifier con XSD sinteticos temporales. | `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / UNLOCK PREPARATION COMPLETE`; sin XML oficial, sin XSD oficial commiteado, sin validador real, sin QR, sin firma, sin transporte y sin produccion. |
| Fase 2C.1-2C.6 | Base server-only para futura sincronizacion segura de documentos. | PR 2C server sync integrity foundation | Inventario de superficies de sync; politica pura de integridad; planner dry-run; conflictos/versionado; eventos in-memory redactados; checkpoint. | Validadores 2C.1-2C.6; tests unitarios de `src/lib/document-sync-integrity`; validaciones generales del repo antes de PR. | Base tecnica interna para adaptadores local/staging; sin sync real, sin produccion, sin migraciones, sin UI y sin endpoints nuevos. |
| Fase 2C.7-2C.12 | Adaptador in-memory local/staging para futura sincronizacion segura. | PR 2C local/staging sync adapter | Mantenimiento de validadores phase2; store in-memory; adaptador local/staging; acceptance sintetica; reporte seguro; checkpoint. | Validadores 2C.7-2C.12; tests unitarios y acceptance local sin Supabase. | Base tecnica local/staging; sin sync real, sin produccion, sin Supabase remoto, sin migraciones, sin endpoints y sin UI. |
| Fase 2C.13-2C.18 | Diseno de adaptador Supabase local/staging para sincronizacion segura. | PR 2C Supabase local sync adapter | Contrato server-only; cliente inyectado; mapper seguro; store Supabase fakeable; adapter local/staging; acceptance local opt-in bloqueada por schema actual; checkpoint. | Validadores 2C.13-2C.18; tests unitarios con fake client; fake tests; acceptance opt-in skipped/bloqueada si falta schema compatible. | Diseno tecnico local/staging; sin produccion, sin Supabase remoto, sin migraciones, sin endpoints, sin UI y sin documentos reales. |
| Fase 2C.19-2C.24 | Schema local/staging compatible para acceptance de sync 2C. | PR 2C local schema acceptance | Auditoria de gap; migracion local/staging minima y rollback; guard de permisos opt-in; acceptance local opt-in; concurrencia con fake client; checkpoint. | Validadores 2C.19-2C.24; `check:migrations`; guard de permisos y acceptance ejecutados contra Supabase local; fake concurrency. | Acceptance local passed; sin produccion, sin Supabase remoto, sin endpoints, sin UI y sin documentos reales. |
| Fase 2C.25-2C.30 | Servicio server-only para sync documental sobre adapters inyectados. | PR 2C server document sync service | Contrato de comando; servicio server-only; batch planning/apply; serializer seguro; auditoria in-memory; acceptance local. | Validadores 2C.25-2C.30; tests unitarios de `src/lib/document-sync-integrity`; acceptance local in-memory. | `PHASE2C_SERVER_SYNC_SERVICE: READY FOR DISABLED ROUTE SHELL DESIGN`; sin produccion, sin Supabase remoto, sin endpoint, sin UI y sin documentos reales. |
| Fase 2C.31-2C.36 | Route shell deshabilitada para futura sync documental. | PR 2C disabled sync route shell | Flag privada de servidor; shell HTTP deshabilitada por defecto; auth context server-only; envelope seguro; acceptance local; checkpoint. | Validadores 2C.31-2C.36; tests unitarios de `src/lib/document-sync-integrity`; acceptance local de route shell disabled. | `PHASE2C_DISABLED_SYNC_ROUTE_SHELL: DISABLED BY DEFAULT / NO OPERATIONS ENABLED`; sin produccion, sin Supabase remoto, sin endpoint publico operativo, sin UI y sin documentos reales. |
| Fase 2C.37-2C.48 | Ejecucion privada local/fake de la route shell y hardening operacional. | PR 2C private local sync route fake hardening | Contrato local/fake; fake adapter in-memory; boundary en route shell; abuso/payload; rate limit y requestId in-memory; idempotencia/replay in-memory; method/content-type/cache/CORS; telemetria in-memory segura; checkpoint. | Validadores 2C.37-2C.48; tests unitarios de `src/lib/document-sync-integrity`; acceptance local fake execution; operational hardening acceptance; audit export verificado. | `PHASE2C_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_EXECUTION: LOCAL FAKE EXECUTION HARDENED / NO PRODUCTION / NO REAL DATA`; evidencia tecnica interna local/staging con fake adapter, server-only, route shell deshabilitada por defecto, ejecucion local/fake solo con flags privadas, sin produccion, sin Supabase remoto, sin documentos reales y sin endpoint publico operativo. |
| Fase 2C.49-2C.56 | Handler privado local/staging para pruebas de sync con dependencias inyectadas. | PR 2C private local sync handler harness | Security review; handler privado server-only; dependencias inyectadas; route thin boundary; harness Supabase local opt-in; paridad fake-vs-Supabase-local; matriz auth/scope; failure injection; checkpoint. | Validadores 2C.49-2C.56; tests unitarios de `src/lib/document-sync-integrity`; scripts 2C.51-2C.54; audit export verificado. | `PHASE2C_PRIVATE_LOCAL_SYNC_HANDLER_HARNESS: READY FOR PRIVATE STAGING DESIGN REVIEW / NO PRODUCTION`; evidencia tecnica interna local/staging con handler privado, dependencias inyectadas, fake adapter default, Supabase local opt-in, sin produccion, sin Supabase remoto, sin endpoint publico operativo y sin documentos reales. |
| Fase 2C.57-2C.66 | Private staging readiness gates para document sync. | PR 2C private staging readiness gates | Gate server-only bloqueado por defecto; contrato de entorno sin config real; boundary de secrets/variables con placeholders; checklist humana; kill switch/runbook; observabilidad redactada; remote/staging blocker tests; dry-run report; checkpoint. | Validadores 2C.57-2C.66; tests unitarios de `src/lib/document-sync-integrity`; `test:phase2c63-sync-route-remote-staging-blocker`; audit export verificado. | `PHASE2C_PRIVATE_STAGING_READINESS: BLOCKED BY DEFAULT / READY FOR HUMAN REVIEW`; evidencia tecnica interna de private staging readiness con gates de autorizacion, route disabled by default, fake adapter default, Supabase local opt-in only, sin produccion, sin Supabase remoto, sin endpoint publico operativo, sin documentos reales y sin activacion remota. |
| Fase 2D.1-2D.10 | Seguridad de datos locales, backup, import dry-run y restore planning. | PR 2D local data safety | Auditoria de superficie, manifiesto de backup, backup integrity, import dry-run, recovery snapshot, restore planning, reporte seguro, eventos in-memory, acceptance y checkpoint. | Validadores 2D.1-2D.10; tests unitarios de `src/lib/local-data-safety`; `test:phase2d9-local-data-backup-restore-safety-acceptance`; audit export verificado. | `PHASE2D_LOCAL_DATA_BACKUP_RESTORE_SAFETY: READY FOR UI INTEGRATION DESIGN / NO DATA MUTATION`; evidencia tecnica interna de local data safety, sin produccion, sin Supabase, sin documentos reales, sin UI y sin mutaciones reales. |
| Fase 2D.11-2D.20 | Backup/import review flow y contratos UI-facing sin UI. | PR 2D import restore review flow | Intake seguro de backup, validation pipeline, review model, human confirmation gate, apply blockers, disabled localStorage adapter contract, malformed backup hardening, safe report, acceptance y checkpoint. | Validadores 2D.11-2D.20; tests unitarios de `src/lib/local-data-safety`; `test:phase2d19-import-restore-review-flow-acceptance`; audit export verificado. | `PHASE2D_IMPORT_RESTORE_REVIEW_FLOW: READY FOR DISABLED UI SHELL DESIGN / NO APPLY`; evidencia tecnica interna de local data safety y backup/import review flow, UI-facing contracts, no UI real, no localStorage write, no import/restore apply, sin produccion, sin Supabase y sin documentos reales. |
| Fase 2D.21-2D.32 | Disabled UI shell no conectada para revision import/restore. | PR 2D disabled import restore UI shell | UI shell scope, review view model, disabled action model, React shell deshabilitada, copy/accessibility, preview list, safe error presenter, UI audit in-memory, hardening, acceptance y checkpoint. | Validadores 2D.21-2D.32; tests unitarios de `src/lib/local-data-safety`; render test de `src/components/local-data-safety`; `test:phase2d29-import-restore-ui-facing-data-hardening`; `test:phase2d30-disabled-import-restore-ui-shell-acceptance`; audit export verificado. | `PHASE2D_DISABLED_IMPORT_RESTORE_UI_SHELL: READY FOR EXPLICIT UI WIRING DECISION / NO APPLY`; evidencia tecnica interna, disabled UI shell, view models seguros, no UI conectada, no rutas, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.33-2D.44 | Disabled UI wiring gates para import/restore. | PR 2D disabled import restore UI wiring gates | UI wiring readiness gate, disabled file selection adapter, local file preview harness sintetico, handlers UI no-op/blocked, wiring props factory, approval checklist all false, hardening, accessibility, route/navigation blocker y checkpoint. | Validadores 2D.33-2D.44; tests unitarios de `src/lib/local-data-safety`; `test:phase2d39-local-import-restore-preview-harness-acceptance`; `test:phase2d40-import-restore-ui-action-abuse-hardening`; `test:phase2d41-import-restore-accessibility-regression-acceptance`; `test:phase2d42-import-restore-route-navigation-blocker-validation`; audit export verificado. | `PHASE2D_DISABLED_IMPORT_RESTORE_UI_WIRING: READY FOR EXPLICIT ROUTELESS UI WIRING REVIEW / NO APPLY`; evidencia tecnica interna, disabled UI wiring, UI wiring gates, no UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.45-2D.56 | Routeless UI preview harness para import/restore. | PR 2D routeless UI preview harness | Routeless harness scope, fixtures sinteticos, state machine de preview, review session model, data-loss warning model, recovery snapshot download placeholder disabled, UX/legal review packet, interaction/copy/wiring acceptance y checkpoint. | Validadores 2D.45-2D.56; tests unitarios de `src/lib/local-data-safety`; `test:phase2d52-routeless-import-restore-ui-interaction-acceptance`; `test:phase2d53-import-restore-visual-copy-regression-acceptance`; `test:phase2d54-import-restore-wiring-final-blockers`; audit export verificado. | `PHASE2D_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS: READY FOR UX_LEGAL_REVIEW / NO WIRING / NO APPLY`; evidencia tecnica interna, routeless UI preview harness, fixtures sinteticos, state machine de preview, no UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.57-2D.68 | Synthetic backup corpus y data-loss regression para datos locales. | PR 2D local data safety regression corpus | Synthetic backup corpus, lifecycle risk matrix, numbering/counters analyzer, snapshot/PDF hash analyzer, customer identity analyzer, legacy compatibility classifier, adversarial malformed corpus, large backup boundary y composite data-loss risk aggregator. | Validadores 2D.57-2D.68; tests unitarios de `src/lib/local-data-safety`; `test:phase2d66-local-data-safety-corpus-regression-acceptance`; audit export verificado. | `PHASE2D_LOCAL_DATA_SAFETY_REGRESSION_CORPUS: READY FOR UI WIRING DECISION / NO APPLY / SYNTHETIC ONLY`; evidencia tecnica interna, synthetic backup corpus, local data safety, data-loss regression, no UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.69-2D.80 | Import/restore wiring decision package. | PR 2D import restore wiring decision package | Decision gate, corpus scenario decision matrix, UX/data-loss decision packet, corpus view-model catalog, review board packet, approval state machine, safe reviewer notes, in-memory decision report, acceptance y full corpus regression. | Validadores 2D.69-2D.80; tests unitarios de `src/lib/local-data-safety`; `test:phase2d77-import-restore-decision-package-acceptance`; `test:phase2d78-import-restore-full-corpus-decision-regression`; audit export verificado. | `PHASE2D_IMPORT_RESTORE_WIRING_DECISION_PACKAGE: READY FOR HUMAN PRODUCT_DECISION / NO WIRING / NO APPLY`; `PHASE2D69_80_IMPORT_RESTORE_WIRING_DECISION_PACKAGE_V1`; evidencia tecnica interna, decision package, no UI conectada, no ruta, no navegación, no localStorage read/write, no file picker real, no download, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.81-2D.92 | Hidden/routeless UI shell para import/restore. | PR 2D hidden import restore UI shell | Hidden shell flag contract, routeless composition root, synthetic fixture selector, preview panel, risk panel, decision packet panel, disabled action bar, render harness, no-route acceptance, no-apply/no-storage acceptance y checkpoint. | Validadores 2D.81-2D.92; tests unitarios de `src/lib/local-data-safety`; tests de `src/components/local-data-safety`; `test:phase2d89-hidden-import-restore-ui-no-route-acceptance`; `test:phase2d90-hidden-import-restore-ui-no-apply-storage-acceptance`; audit export verificado. | `PHASE2D_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL: READY FOR EXPLICIT HIDDEN_UI_ENABLEMENT_REVIEW / NO APPLY`; `PHASE2D81_92_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL_V1`; evidencia tecnica interna, hidden/routeless UI shell, no ruta publica, no navegación, no localStorage read/write, no file picker real, no download, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.93-2D.104 | Hidden UI enablement safety gates para import/restore. | PR 2D hidden UI enablement safety gates | Enablement gate bloqueado por defecto, environment contract inyectado, approval checklist all false, UX/legal/data-loss final review pack, no-go registry, hidden shell readiness report, owner decision packet, dry-run state machine, global no-route/no-storage regression, enablement blocked acceptance y checkpoint. | Validadores 2D.93-2D.104; tests unitarios de `src/lib/local-data-safety`; `test:phase2d101-import-restore-global-no-route-no-storage-regression`; `test:phase2d102-hidden-ui-enablement-blocked-acceptance`; audit export verificado. | `PHASE2D_HIDDEN_UI_ENABLEMENT_SAFETY_GATES: READY FOR OWNER_DECISION / BLOCKED BY DEFAULT / NO ENABLEMENT`; `PHASE2D93_104_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_SAFETY_GATES_V1`; evidencia tecnica interna, UI routeless, no UI activa, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2E.1-2E.12 | Local storage resilience foundation. | PR 2E local storage resilience foundation | Auditoria de superficie, disabled storage adapter, fake/in-memory adapters, storage error taxonomy, operation dry-run planner, backup-before-write policy, corruption/parse recovery classifier, safe report, audit events in-memory, acceptance y checkpoint. | Validadores 2E.1-2E.12; tests unitarios de `src/lib/local-storage-resilience`; `test:phase2e10-storage-resilience-acceptance`; audit export verificado. | `PHASE2E_LOCAL_STORAGE_RESILIENCE_FOUNDATION: READY FOR STORAGE UI/ADAPTER DECISION / NO REAL STORAGE MUTATION`; `PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1`; `PHASE2E11_COMPLIANCE_DOSSIER_STORAGE_RESILIENCE_UPDATE_V1`; evidencia tecnica interna de local storage resilience y storage safety, fake/in-memory adapters, no localStorage real, no data mutation, no UI, sin produccion, sin Supabase y sin documentos reales. |
| AUDIT_EXPORT_V1 | Snapshot/export seguro del dossier vivo para auditoria. | PR audit export v1 | Metadata JSON; politica de snapshot; export HTML imprimible; guia PDF manual; validadores; dossier actualizado. | `export:compliance-dossier:html`; validadores audit export; validaciones generales del repo. | `COMPLIANCE_DOSSIER_EXPORT: HTML SNAPSHOT READY / PDF GUIDE READY / MD CANONICAL`; evidencia tecnica interna; sin cumplimiento productivo, sin certificacion, sin PDF binario commiteado. |

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
- `docs/phase2c57-private-staging-readiness-gate-v1.md`
- `docs/phase2c58-private-staging-environment-contract-v1.md`
- `docs/phase2c59-private-staging-secret-boundary-contract-v1.md`
- `docs/phase2c60-private-staging-human-approval-checklist-v1.md`
- `docs/phase2c61-private-staging-kill-switch-rollback-runbook-v1.md`
- `docs/phase2c62-private-staging-observability-redaction-readiness-v1.md`
- `docs/phase2c63-sync-route-remote-staging-blocker-tests-v1.md`
- `docs/phase2c64-private-staging-dry-run-report-v1.md`
- `docs/phase2c66-private-staging-readiness-gate-checkpoint-v1.md`
- `docs/phase2d1-local-data-backup-import-surface-audit-v1.md`
- `docs/phase2d2-backup-manifest-contract-v1.md`
- `docs/phase2d3-backup-integrity-hash-v1.md`
- `docs/phase2d4-import-dry-run-planner-v1.md`
- `docs/phase2d5-pre-import-recovery-snapshot-builder-v1.md`
- `docs/phase2d6-restore-planner-document-protection-v1.md`
- `docs/phase2d7-local-data-safety-report-v1.md`
- `docs/phase2d8-local-data-safety-audit-events-v1.md`
- `docs/phase2d9-local-data-backup-restore-safety-acceptance-v1.md`
- `docs/phase2d10-local-data-backup-restore-safety-checkpoint-v1.md`
- `docs/phase2d11-backup-file-intake-contract-v1.md`
- `docs/phase2d12-backup-validation-pipeline-v1.md`
- `docs/phase2d13-import-restore-review-model-v1.md`
- `docs/phase2d14-import-restore-human-confirmation-gate-v1.md`
- `docs/phase2d14-import-restore-human-confirmation-checklist.template.json`
- `docs/phase2d15-import-restore-apply-blocker-v1.md`
- `docs/phase2d16-disabled-localstorage-adapter-contract-v1.md`
- `docs/phase2d17-malformed-backup-hardening-v1.md`
- `docs/phase2d18-import-restore-review-flow-safe-report-v1.md`
- `docs/phase2d19-import-restore-review-flow-acceptance-v1.md`
- `docs/phase2d20-import-restore-review-flow-checkpoint-v1.md`
- `docs/phase2d21-disabled-import-restore-ui-shell-scope-v1.md`
- `docs/phase2d22-import-restore-review-view-model-v1.md`
- `docs/phase2d23-import-restore-disabled-action-model-v1.md`
- `docs/phase2d24-disabled-import-restore-react-shell-v1.md`
- `docs/phase2d25-import-restore-copy-accessibility-contract-v1.md`
- `docs/phase2d26-import-restore-preview-list-model-v1.md`
- `docs/phase2d27-import-restore-safe-error-presenter-v1.md`
- `docs/phase2d28-import-restore-ui-audit-event-model-v1.md`
- `docs/phase2d29-import-restore-ui-facing-data-hardening-v1.md`
- `docs/phase2d30-disabled-import-restore-ui-shell-acceptance-v1.md`
- `docs/phase2d32-disabled-import-restore-ui-shell-checkpoint-v1.md`
- `docs/phase2d33-import-restore-ui-wiring-readiness-gate-v1.md`
- `docs/phase2d34-disabled-file-selection-adapter-contract-v1.md`
- `docs/phase2d35-in-memory-backup-preview-parser-harness-v1.md`
- `docs/phase2d36-import-restore-ui-event-handler-contract-v1.md`
- `docs/phase2d37-disabled-import-restore-wiring-props-factory-v1.md`
- `docs/phase2d38-import-restore-ui-wiring-approval-checklist-v1.md`
- `docs/phase2d38-import-restore-ui-wiring-approval-checklist.template.json`
- `docs/phase2d39-local-import-restore-preview-harness-acceptance-v1.md`
- `docs/phase2d40-import-restore-ui-action-abuse-hardening-v1.md`
- `docs/phase2d41-import-restore-accessibility-regression-acceptance-v1.md`
- `docs/phase2d42-import-restore-route-navigation-blocker-validation-v1.md`
- `docs/phase2d44-disabled-import-restore-ui-wiring-gates-checkpoint-v1.md`
- `docs/phase2d45-routeless-import-restore-ui-harness-scope-v1.md`
- `docs/phase2d46-import-restore-synthetic-ui-fixtures-v1.md`
- `docs/phase2d47-import-restore-preview-flow-state-machine-v1.md`
- `docs/phase2d48-import-restore-review-session-model-v1.md`
- `docs/phase2d49-import-restore-data-loss-warning-model-v1.md`
- `docs/phase2d50-disabled-recovery-snapshot-download-placeholder-v1.md`
- `docs/phase2d51-import-restore-ux-legal-review-packet-v1.md`
- `docs/phase2d52-routeless-import-restore-ui-interaction-acceptance-v1.md`
- `docs/phase2d53-import-restore-visual-copy-regression-acceptance-v1.md`
- `docs/phase2d54-import-restore-wiring-final-blockers-v1.md`
- `docs/phase2d56-routeless-import-restore-ui-preview-harness-checkpoint-v1.md`
- `docs/phase2d57-synthetic-backup-corpus-registry-v1.md`
- `docs/phase2d58-document-lifecycle-risk-matrix-v1.md`
- `docs/phase2d59-numbering-counters-risk-analyzer-v1.md`
- `docs/phase2d60-snapshot-pdf-hash-risk-analyzer-v1.md`
- `docs/phase2d61-customer-identity-import-risk-analyzer-v1.md`
- `docs/phase2d62-legacy-backup-compatibility-classifier-v1.md`
- `docs/phase2d63-adversarial-malformed-backup-corpus-v1.md`
- `docs/phase2d64-large-backup-boundary-model-v1.md`
- `docs/phase2d65-composite-data-loss-risk-aggregator-v1.md`
- `docs/phase2d66-local-data-safety-corpus-regression-acceptance-v1.md`
- `docs/phase2d68-local-data-safety-regression-corpus-checkpoint-v1.md`
- `docs/phase2e1-local-storage-surface-audit-v1.md`
- `docs/phase2e2-storage-adapter-contract-disabled-v1.md`
- `docs/phase2e3-in-memory-storage-adapter-v1.md`
- `docs/phase2e4-storage-error-taxonomy-v1.md`
- `docs/phase2e5-storage-operation-dry-run-planner-v1.md`
- `docs/phase2e6-backup-before-write-policy-v1.md`
- `docs/phase2e7-corruption-parse-recovery-classifier-v1.md`
- `docs/phase2e8-storage-resilience-safe-report-v1.md`
- `docs/phase2e9-storage-resilience-audit-events-v1.md`
- `docs/phase2e10-storage-resilience-acceptance-v1.md`
- `docs/phase2e12-local-storage-resilience-foundation-checkpoint-v1.md`

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

- mantener la evidencia de acceptance Supabase 2C local, del servicio server-only 2C.25-2C.30, de la route shell deshabilitada 2C.31-2C.36, de la ejecucion privada local/fake endurecida 2C.37-2C.48 y del handler privado local/staging 2C.49-2C.56; cualquier validacion remota queda fuera de estos PR y requiere orden separada. No hay produccion, Supabase remoto, endpoint publico operativo ni UI.
- la route shell de document sync queda deshabilitada por defecto mediante flag privada de servidor. La ejecucion local/fake solo se activa con flags privadas, usa fake adapter in-memory y datos `SYNTHETIC_ONLY_*`; no usa Supabase remoto, no toca documentos reales y no crea endpoint publico operativo.
- el handler privado 2C.49-2C.56 separa la route HTTP de la ejecucion testable, recibe dependencias inyectadas, mantiene fake adapter default y permite harness Supabase local opt-in sin route publica operativa.
- la seguridad de datos locales 2D.1-2D.10 queda limitada a contratos puros, backup integrity, import dry-run, recovery snapshot, restore planning, reporte seguro y eventos in-memory. No lee ni escribe datos reales, no aplica importaciones/restauraciones, no crea UI y no usa Supabase.
- el backup/import review flow 2D.11-2D.20 anade UI-facing contracts para intake seguro, validation pipeline, review model, confirmacion humana, apply blockers, disabled localStorage adapter contract, malformed backup hardening, safe report y acceptance sintetica. No crea UI real, no hace localStorage write, no aplica import/restore, no toca documentos reales y no usa Supabase.
- la disabled UI shell 2D.21-2D.32 anade view models seguros, shell React no conectada, acciones deshabilitadas, copy prudente, preview list, error presenter seguro y eventos UI in-memory. No crea rutas, no añade navegación, no conecta UI, no hace localStorage write, no aplica import/restore, no toca documentos reales y no usa Supabase.
- el disabled UI wiring 2D.33-2D.44 anade UI wiring gates, adapter de seleccion de archivo bloqueado, local file preview harness sintetico, handlers UI no-op/blocked, props factory segura, checklist de aprobacion all false, hardening de acciones, regresion de accesibilidad y validacion de route/navigation blocker. No UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.
- el routeless UI preview harness 2D.45-2D.56 anade scope routeless, fixtures sinteticos, state machine de preview, review session model, data-loss warning model, recovery snapshot download placeholder disabled, UX/legal review packet, interaction acceptance, visual/copy regression y final wiring blockers. No UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.
- el local data safety regression corpus 2D.57-2D.68 anade synthetic backup corpus, matrices y analizadores puros de lifecycle, numeracion, snapshots/PDF hashes, identidad de clientes, compatibilidad legacy, corpus adversarial malformado, limite de backups grandes, agregador composite de data-loss regression y acceptance sintetica. No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.
- el import/restore wiring decision package 2D.69-2D.80 anade gate de decision, decision matrix del corpus, UX/data-loss packet, catalogo de view-models seguros, review board packet, approval state machine, reviewer notes seguras, decision report in-memory, acceptance y full corpus regression. `PHASE2D69_80_IMPORT_RESTORE_WIRING_DECISION_PACKAGE_V1`; no UI conectada, no ruta, no navegación, no localStorage read/write, no file picker real, no download, no import/restore apply, sin producción, sin Supabase y sin documentos reales.
- el hidden/routeless UI shell 2D.81-2D.92 anade flag privada inyectada, composicion React no conectada, selector de fixtures sinteticos, paneles de preview/riesgo/decision/action bar deshabilitada, render harness sintetico y acceptance sin ruta ni storage/apply. `PHASE2D81_92_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL_V1`; no ruta publica, no navegación, no localStorage read/write, no FileReader real, no Blob/download, no import/restore apply, sin producción, sin Supabase y sin documentos reales.
- el hidden UI enablement safety gates 2D.93-2D.104 anade gate bloqueado por defecto, contrato de entorno inyectado sin `NEXT_PUBLIC`, checklist all false, final UX/legal/data-loss review pack, no-go registry, readiness report, owner decision packet, state machine dry-run y acceptance de bloqueo. `PHASE2D93_104_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_SAFETY_GATES_V1`; UI routeless, no UI activa, no ruta, no navegación, no localStorage read/write, no FileReader real, no Blob/download, no import/restore apply, synthetic data only, sin producción, sin Supabase y sin documentos reales.
- el local storage resilience foundation 2E.1-2E.12 anade una base pura de storage safety con auditoria de superficie, disabled storage adapter, fake/in-memory adapters, storage error taxonomy, operation dry-run planner, backup-before-write policy, corruption/parse recovery classifier, safe report, audit events in-memory, acceptance y checkpoint. `PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1`; `PHASE2E11_COMPLIANCE_DOSSIER_STORAGE_RESILIENCE_UPDATE_V1`; no localStorage real, no data mutation, no UI, no ruta, no navegacion, no import/restore apply, synthetic data only, sin produccion, sin Supabase y sin documentos reales.
- proximos pasos posibles: pausa de revision tecnica, security review externa, revision UX/legal/data-loss, owner decision explicita de hidden UI enablement o hardening adicional antes de ampliar superficie.

Evidencia tecnica interna de sync 2C.37-2C.48:

- `PHASE2C_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_EXECUTION: LOCAL FAKE EXECUTION HARDENED / NO PRODUCTION / NO REAL DATA`;
- contrato de ejecucion local/fake server-only;
- fake adapter in-memory local/staging, sin persistencia y sin documentos reales;
- route shell deshabilitada por defecto;
- ejecucion local/fake solo con flags privadas;
- acceptance local con datos `SYNTHETIC_ONLY_*`;
- hardening de abuso/payload, requestId, rate limit, idempotencia/replay, method/content-type/cache/CORS y telemetria segura;
- sin produccion, sin Supabase remoto, sin sync productiva y sin endpoint publico operativo.

Evidencia tecnica interna de sync 2C.49-2C.56:

- `PHASE2C_PRIVATE_LOCAL_SYNC_HANDLER_HARNESS: READY FOR PRIVATE STAGING DESIGN REVIEW / NO PRODUCTION`;
- security review de route shell local/fake;
- handler privado server-only con dependencias inyectadas;
- route HTTP como thin boundary y disabled by default;
- fake adapter default;
- harness Supabase local opt-in con cliente o servicio inyectado;
- paridad fake-vs-Supabase-local sobre shape seguro;
- matriz adversarial auth/scope sin aceptar identidad del payload;
- failure injection para adapter, service, telemetry, rate limit, idempotencia y requestId;
- sin produccion, sin Supabase remoto, sin staging remoto, sin endpoint publico operativo, sin documentos reales y sin UI.

Evidencia tecnica interna de local data safety 2D.1-2D.10:

- `PHASE2D_LOCAL_DATA_BACKUP_RESTORE_SAFETY: READY FOR UI INTEGRATION DESIGN / NO DATA MUTATION`;
- manifiesto de backup con conteos y referencias seguras;
- backup integrity por digest SHA-256 sobre proyeccion canonica;
- import dry-run sin aplicacion de cambios;
- recovery snapshot en memoria para planificacion;
- restore planning con bloqueo de documentos protegidos;
- reporte seguro y redaccion de campos no aptos;
- eventos in-memory con `persisted: false`;
- sin produccion, sin Supabase, sin documentos reales, sin UI y sin mutaciones reales.

Evidencia tecnica interna de backup/import review flow 2D.11-2D.20:

- `PHASE2D_IMPORT_RESTORE_REVIEW_FLOW: READY FOR DISABLED UI SHELL DESIGN / NO APPLY`;
- intake seguro de backup por metadatos y objeto parseado sintetico;
- pipeline de validacion con malformed hardening, manifest, digest, import dry-run, recovery snapshot preview y safe report;
- review model UI-facing sin UI real;
- human confirmation gate con approvals `false` por defecto;
- apply import y apply restore bloqueados explicitamente;
- disabled localStorage adapter contract sin lecturas ni escrituras;
- malformed backup hardening contra claves peligrosas, ciclos, profundidad, arrays grandes, funciones, instancias y cadenas sospechosas;
- review flow safe report con redaccion y summaries seguros;
- acceptance sintetica con datos `SYNTHETIC_ONLY_*`;
- no localStorage write, no import/restore apply, sin produccion, sin Supabase, sin documentos reales y sin UI real.

Evidencia tecnica interna de disabled UI shell 2D.21-2D.32:

- `PHASE2D_DISABLED_IMPORT_RESTORE_UI_SHELL: READY FOR EXPLICIT UI WIRING DECISION / NO APPLY`;
- scope contract disabled by default;
- view models seguros para revision futura;
- disabled action model con apply import y apply restore bloqueados;
- React shell no conectada a app, rutas ni navegacion;
- copy/accessibility con mensajes prudentes;
- preview list paginada solo con summaries;
- safe error presenter sin payloads ni secretos;
- UI audit events in-memory con `persisted: false`;
- hardening de datos UI-facing y acceptance sintetica;
- no UI conectada, no rutas, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

Evidencia tecnica interna de disabled UI wiring 2D.33-2D.44:

- `PHASE2D_DISABLED_IMPORT_RESTORE_UI_WIRING: READY FOR EXPLICIT ROUTELESS UI WIRING REVIEW / NO APPLY`;
- disabled UI wiring preparado sin activacion;
- UI wiring gates con readiness bloqueada por defecto y `canWireUi: false`;
- disabled file selection adapter con `canOpenFilePicker: false` y `canReadFile: false`;
- local file preview harness sintetico en memoria, con limite de tamano y sin payload echo;
- handlers UI no-op/blocked con preview dry-run y apply import/restore bloqueados;
- props factory segura para shell deshabilitado, sin routeConnected, navigationConnected ni filePickerConnected;
- checklist de aprobacion futura con todos los campos `false`;
- acceptance local, action abuse hardening, accessibility regression y route/navigation blocker;
- no UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

Evidencia tecnica interna de routeless UI preview harness 2D.45-2D.56:

- `PHASE2D_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS: READY FOR UX_LEGAL_REVIEW / NO WIRING / NO APPLY`;
- routeless harness scope con `routeAllowed: false`, `navigationAllowed: false`, `importApplyAllowed: false` y `restoreApplyAllowed: false`;
- fixtures sinteticos `SYNTHETIC_ONLY_*` para safe preview, overwrite protegido, malformado, mismatch de snapshot, riesgo de numeracion, backup vacio y lista paginable;
- state machine de preview con `idle_disabled`, `fixture_selected`, `parsing_preview`, `validation_ready`, `review_ready`, `manual_review_required`, `apply_blocked` y `error_safe`;
- review session model in-memory con `persisted: false`, resumen de view model, flags de revision manual y eventos seguros;
- data-loss warning model con avisos prudentes de documentos protegidos, snapshot mismatch, numeracion, backup desconocido, backup malformado, apply disabled y copia previa futura;
- recovery snapshot download placeholder disabled, sin descarga real;
- UX/legal review packet con aprobaciones `false`, placeholders de capturas sin imagen y sin datos crudos;
- interaction acceptance, visual/copy regression y final wiring blockers;
- no UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

Evidencia tecnica interna de local data safety regression corpus 2D.57-2D.68:

- `PHASE2D_LOCAL_DATA_SAFETY_REGRESSION_CORPUS: READY FOR UI WIRING DECISION / NO APPLY / SYNTHETIC ONLY`;
- synthetic backup corpus con casos `SYNTHETIC_ONLY_*` para backups vacios, drafts, emitidos bloqueados, legacy protegido, counters, snapshot/PDF hash mismatch, duplicados, lista grande y shape malformada;
- lifecycle risk matrix para drafts, emitidos, bloqueados, cancelados, presupuestos enviados/aceptados, recibos pagados/emitidos y legacy no borrador;
- numbering/counters risk analyzer para counters menores/mayores, conflictos de numeracion emitida, colisiones serie/ejercicio, serie ausente, numbering legacy y huecos alrededor de emitidos;
- snapshot/PDF hash risk analyzer con resumen seguro sin snapshots completos ni PDF body;
- customer identity import risk analyzer con IDs y tax ids sinteticos, sin auto-merge;
- legacy backup compatibility classifier conservador, sin migracion y sin apply;
- adversarial malformed backup corpus para claves peligrosas, ciclos, profundidad, arrays grandes, cadenas sospechosas, valores function-like y class instance-like sin payload echo;
- large backup boundary model con limites configurables y clasificacion `within_limits`, `near_limit`, `over_limit` y `manual_review_required`;
- composite data-loss risk aggregator con severity, blockers, top risks, recommended next steps, `applyAllowed: false` y `restoreAllowed: false`;
- corpus regression acceptance 2D.66 para manifest, digest, dry-run, review/report seguro, adversarial corpus, boundary y composite risk;
- no UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

Evidencia tecnica interna de import/restore wiring decision package 2D.69-2D.80:

- `PHASE2D_IMPORT_RESTORE_WIRING_DECISION_PACKAGE: READY FOR HUMAN PRODUCT_DECISION / NO WIRING / NO APPLY`;
- `PHASE2D69_80_IMPORT_RESTORE_WIRING_DECISION_PACKAGE_V1`;
- decision gate bloqueado por defecto y rechazo de cualquier senal de activacion;
- corpus scenario decision matrix para preview, manual review, blocked, malformed rejected y too-large review;
- UX/data-loss packet con approvals false, protected docs behavior, backup-first recommendation, blockers y unresolved questions;
- corpus view-model catalog con review/view/preview/warnings/disabled actions/safe errors como resumen seguro;
- review board packet con executive, user, technical, UX copy, blocked actions, checklist, evidence y no-go conditions;
- approval state machine con `approved_for_future_wiring` sin activar apply, ruta ni producto;
- safe reviewer notes atadas solo a casos sinteticos y sin datos reales;
- decision report in-memory con injected clock, summaries y next steps;
- acceptance 2D.77 y full corpus regression 2D.78;
- no UI conectada, no ruta, no navegación, no localStorage read/write, no file picker real, no download, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

Evidencia tecnica interna de hidden/routeless UI shell 2D.81-2D.92:

- `PHASE2D_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL: READY FOR EXPLICIT HIDDEN_UI_ENABLEMENT_REVIEW / NO APPLY`;
- `PHASE2D81_92_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL_V1`;
- hidden shell flag contract disabled by default, public flag rejected and production/staging/remote disabled;
- routeless composition root under `src/components/local-data-safety`, not connected from `src/app`;
- synthetic fixture selector over `SYNTHETIC_ONLY_*` corpus summaries only;
- preview panel with safe counters, preview list and pagination labels;
- risk panel with severity, warnings, protected document summary and manual review copy;
- decision packet panel with gate status, approval state, reviewer notes summary and next steps;
- disabled action bar with validate/import/restore/recovery/cancel actions disabled and reasons visible;
- hidden render harness builds synthetic props/model only;
- no-route acceptance 2D.89 and no-apply/no-storage acceptance 2D.90;
- no ruta publica, no navegación, no localStorage read/write, no FileReader real, no Blob/download real, no import/restore apply, sin documentos reales, sin producción y sin Supabase.

Evidencia tecnica interna de hidden UI enablement safety gates 2D.93-2D.104:

- `PHASE2D_HIDDEN_UI_ENABLEMENT_SAFETY_GATES: READY FOR OWNER_DECISION / BLOCKED BY DEFAULT / NO ENABLEMENT`;
- `PHASE2D93_104_HIDDEN_IMPORT_RESTORE_UI_ENABLEMENT_SAFETY_GATES_V1`;
- enablement gate bloqueado por defecto, con estados `blocked_by_default`, `ready_for_ux_review`, `ready_for_owner_approval`, `ready_for_future_hidden_enablement` y `rejected`;
- environment contract inyectado, sin lectura directa de entorno global, sin `NEXT_PUBLIC` y sin Vercel config;
- approval checklist template con todos los campos `false`;
- final UX/legal/data-loss review pack sin payload, sin datos reales y sin secretos;
- no-go registry para ruta, navegación, storage, file reader, download, apply, datos reales, Supabase y secretos;
- hidden shell readiness report y owner decision packet que no autorizan enablement por si mismos;
- dry-run state machine sin activar UI, sin escribir config y sin cambiar flags reales;
- global no-route/no-storage regression 2D.101 y enablement blocked acceptance 2D.102;
- UI routeless, no UI activa, no ruta, no navegación, no localStorage read/write, no FileReader real, no Blob/download real, no import/restore apply, synthetic data only, sin documentos reales, sin producción y sin Supabase.

Evidencia tecnica interna de local storage resilience foundation 2E.1-2E.12:

- `PHASE2E_LOCAL_STORAGE_RESILIENCE_FOUNDATION: READY FOR STORAGE UI/ADAPTER DECISION / NO REAL STORAGE MUTATION`;
- `PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1`;
- `PHASE2E11_COMPLIANCE_DOSSIER_STORAGE_RESILIENCE_UPDATE_V1`;
- auditoria de superficie local storage con riesgos de cuota, corrupcion JSON, sobrescritura, multi-tab, navegador/perfil y versiones;
- disabled storage adapter bloqueado por defecto con reason `STORAGE_ADAPTER_DISABLED_PENDING_UI_AND_DATA_REVIEW`;
- fake/in-memory adapters limitados a claves `SYNTHETIC_ONLY_*`, con clone de entradas/salidas y sin persistencia;
- storage error taxonomy con redaccion de stack, payload y valores de storage;
- operation dry-run planner con writes/deletes/replaces bloqueados y backup-before-write requerido;
- backup-before-write policy con manifest, digest, recovery snapshot, human confirmation y dry-run report como requisitos futuros, todos sin autorizar escritura;
- corruption/parse recovery classifier para JSON invalido, shape incorrecta, AppData parcial, manifest only, prototype pollution, arrays criticos ausentes y legacy shape;
- storage safe report sin payload, con adapter status, planned operations, blockers, backup readiness, recovery status y next steps;
- audit events in-memory sin persistencia, sin payload, sin valores y sin secretos;
- acceptance local `PHASE2E10_STORAGE_RESILIENCE_ACCEPTANCE_V1` con datos sinteticos;
- no localStorage real, no window storage, no IndexedDB real, no FileReader real, no Blob/download real, no data mutation, no import/restore apply, no UI, no ruta, no navegacion, sin produccion, sin Supabase y sin documentos reales.

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
- revision tecnica y puerta de artefactos 2B.7A-B:
  `docs/phase2b7a-synthetic-pipeline-technical-review-v1.md` y
  `docs/phase2b7b-official-artifact-field-mapping-v1.md`; identifica
  artefactos oficiales versionados, registra checksums y crea mapping
  interno-oficial solo como referencia bloqueada. No produce XML AEAT, no
  declara cumplimiento, no valida contra AEAT y no activa QR, firma,
  certificados, transporte ni produccion.
- checkpoint 2B.7E:
  `docs/phase2b7e-pre-qr-signature-transport-checkpoint-v1.md`; declara
  `PHASE2B7_OFFICIAL_ARTIFACT_ALIGNMENT: BLOCKED` por ausencia de validador XSD
  offline seguro y datos sinteticos oficiales completos. 2B.7C y 2B.7D quedan
  documentadas como no implementadas.
- puerta oficial offline 2B.7F-K:
  `docs/phase2b7f-official-artifact-offline-fixture-policy-v1.md`,
  `docs/phase2b7g-offline-xsd-validator-selection-v1.md`,
  `docs/phase2b7h-official-safe-synthetic-data-catalog-v1.md` y
  `docs/phase2b7k-official-alignment-gate-checkpoint-v1.md`; declara
  `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED` porque los XSD oficiales no se
  commitean como fixtures offline, no se selecciona validador XSD offline seguro
  y no hay datos sinteticos oficiales completos para alta y anulacion. No crea
  XML oficial, no valida contra XSD, no valida contra AEAT, no activa QR, firma,
  certificados, transporte ni produccion.
- enforcement de bloqueo oficial 2B.7L-P:
  `docs/phase2b7l-official-artifact-intake-gate-v1.md`,
  `docs/phase2b7m-offline-xsd-validator-contract-v1.md`,
  `docs/phase2b7n-official-aligned-xml-preflight-gate-v1.md`,
  `docs/phase2b7o-official-alignment-blocker-report-v1.md` y
  `docs/phase2b7p-official-alignment-enforced-block-checkpoint-v1.md`;
  anade gates ejecutables para intake de artefactos, contrato de validador
  bloqueado, preflight de XML oficial alineado y reporte seguro. El estado queda
  `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / ENFORCED BY CODE`, sin XML
  oficial, sin validacion AEAT, sin QR, sin firma, sin certificados, sin
  transporte y sin produccion.
- readiness tooling 2B.7Q-U:
  `docs/phase2b7q-local-official-artifact-intake-protocol-v1.md`,
  `docs/phase2b7r-local-xsd-checksum-import-graph-verifier-v1.md`,
  `docs/phase2b7s-official-artifact-readiness-report-cli-v1.md`,
  `docs/phase2b7t-official-artifact-readiness-acceptance-tests-v1.md` y
  `docs/phase2b7u-official-artifact-readiness-tooling-checkpoint-v1.md`;
  anade tooling local/offline para preparar una futura entrada manual segura de
  artefactos oficiales. El estado queda
  `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / READINESS TOOLING AVAILABLE`,
  sin XML oficial, sin XSD oficial commiteado, sin validador real, sin
  validacion XSD oficial, sin validacion AEAT, sin QR, sin firma, sin
  certificados, sin transporte y sin produccion.
- unlock preparation 2B.7V-Z:
  `docs/phase2b7v-official-artifact-lockfile-contract-v1.md`,
  `docs/phase2b7w-local-official-artifact-lockfile-generator-v1.md`,
  `docs/phase2b7x-opt-in-official-artifact-verification-v1.md`,
  `docs/phase2b7y-human-approval-checklist-for-official-artifacts-v1.md`,
  `docs/phase2b7y-human-approval-checklist-for-official-artifacts.template.json`
  y `docs/phase2b7z-official-artifact-unlock-preparation-checkpoint-v1.md`;
  anade lockfile contract, generator local, verifier opt-in y checklist humana
  para una decision futura. El estado queda
  `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / UNLOCK PREPARATION COMPLETE`,
  sin XML oficial, sin XSD oficial commiteado, sin validador real, sin
  validacion XSD oficial, sin validacion AEAT, sin QR, sin firma, sin
  certificados, sin transporte y sin produccion.

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
- contratos puros 2D.1-2D.10 para local data safety, backup integrity, import dry-run, recovery snapshot, restore planning, reporte seguro y auditoria in-memory.
- UI-facing contracts 2D.11-2D.20 para backup/import review flow: intake, validation pipeline, review model, human confirmation gate, apply blockers, disabled localStorage adapter contract, malformed backup hardening, safe report y acceptance sintetica.
- disabled UI shell 2D.21-2D.32 con view models seguros, React shell no conectada, disabled actions, preview list, safe error presenter y eventos UI in-memory.
- disabled UI wiring 2D.33-2D.44 con UI wiring gates, adapter de seleccion de archivo bloqueado, local file preview harness sintetico, handlers no-op/blocked, props factory segura, checklist all false y route/navigation blocker.
- routeless UI preview harness 2D.45-2D.56 con fixtures sinteticos, state machine de preview, review session model, data-loss warning model, recovery snapshot download placeholder disabled, UX/legal review packet y wiring final blockers.
- local storage resilience 2E.1-2E.12 con storage safety, disabled storage adapter, fake/in-memory adapters, error taxonomy, dry-run planner, backup-before-write policy, corruption/parse recovery, safe report y audit events in-memory.

Pendiente:

- backups automáticos o recordatorios de backup;
- snapshots preimportación reales con UI y aprobacion humana;
- IndexedDB o almacenamiento local más robusto;
- historial de restauración;
- protección adicional ante sobrescritura local/nube;
- diseno UI posterior para importar/restaurar datos locales sin saltarse el dry-run ni el bloqueo de documentos protegidos.
- disabled UI shell design antes de conectar lectura/escritura real, manteniendo no localStorage write, no import/restore apply, sin produccion, sin Supabase y sin documentos reales hasta orden separada.
- decision explicita de UI wiring antes de cualquier pantalla visible, ruta, navegación, lectura/escritura real, import real o restore real.
- decision explicita de routeless UI wiring antes de cualquier conexion visible, manteniendo no UI conectada, no ruta, no navegación, no file picker real, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.
- revision UX/legal/data-loss antes de cualquier wiring, descarga, lectura real, apply import o apply restore.
- storage adapter review antes de conectar almacenamiento real: mantener no localStorage real, no data mutation, no UI, sin produccion, sin Supabase y sin documentos reales hasta decision separada.

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
| Fase 2B.7F-K | Puerta oficial offline de XSD, validador y datos sinteticos | Bloqueada como `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED`; sin fixture XSD oficial commiteado, sin validador XSD offline seleccionado, sin datos sinteticos oficiales completos, sin XML oficial y sin validacion AEAT. |
| Fase 2B.7L-P | Enforcement ejecutable del bloqueo oficial | Bloqueada como `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / ENFORCED BY CODE`; intake gate, contrato de validador bloqueado, preflight gate y blocker report seguro; sin XML oficial, sin validacion XSD real, sin AEAT, sin QR, sin firma y sin transporte. |
| Fase 2B.7Q-U | Tooling local/offline de readiness de artefactos oficiales | Bloqueada como `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / READINESS TOOLING AVAILABLE`; intake local, checksum SHA-256, import/include graph, CLI y acceptance tests con XSD sinteticos temporales; sin XSD oficial commiteado, sin XML oficial, sin validador real, sin QR, sin firma y sin transporte. |
| Fase 2B.7V-Z | Preparacion final de desbloqueo manual futuro | Bloqueada como `PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / UNLOCK PREPARATION COMPLETE`; lockfile contract, generator local, verifier opt-in, checklist humana y template JSON; sin XSD oficial commiteado, sin XML oficial, sin validador real, sin QR, sin firma y sin transporte. |
| Fase 2C.31-2C.36 | Route shell deshabilitada para document sync | `PHASE2C_DISABLED_SYNC_ROUTE_SHELL: DISABLED BY DEFAULT / NO OPERATIONS ENABLED`; evidencia tecnica interna; server-only; flag privada de servidor; sin endpoint publico operativo, sin UI, sin produccion, sin Supabase remoto y sin documentos reales. |
| Fase 2C.37-2C.48 | Ejecucion local/fake endurecida de route shell | `PHASE2C_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_EXECUTION: LOCAL FAKE EXECUTION HARDENED / NO PRODUCTION / NO REAL DATA`; evidencia tecnica interna local/staging; fake adapter; server-only; route shell deshabilitada por defecto; ejecucion local/fake solo con flags privadas; sin produccion, sin Supabase remoto, sin documentos reales y sin endpoint publico operativo. |
| Fase 2C.49-2C.56 | Handler privado local/staging con harness opt-in | `PHASE2C_PRIVATE_LOCAL_SYNC_HANDLER_HARNESS: READY FOR PRIVATE STAGING DESIGN REVIEW / NO PRODUCTION`; evidencia tecnica interna local/staging; handler privado; dependencias inyectadas; fake adapter default; Supabase local opt-in; sin produccion, sin Supabase remoto, sin endpoint publico operativo y sin documentos reales. |
| Fase 2D.1-2D.10 | Local data safety, backup y restore planning | `PHASE2D_LOCAL_DATA_BACKUP_RESTORE_SAFETY: READY FOR UI INTEGRATION DESIGN / NO DATA MUTATION`; evidencia tecnica interna; backup integrity, import dry-run, recovery snapshot, restore planning, reporte seguro y eventos in-memory; sin produccion, sin Supabase, sin documentos reales, sin UI y sin mutaciones reales. |
| Fase 2D.11-2D.20 | Backup/import review flow y contratos UI-facing | `PHASE2D_IMPORT_RESTORE_REVIEW_FLOW: READY FOR DISABLED UI SHELL DESIGN / NO APPLY`; evidencia tecnica interna; intake, validation pipeline, review model, human confirmation gate, apply blockers, disabled localStorage adapter contract, malformed backup hardening, safe report y acceptance; no UI real, no localStorage write, no import/restore apply, sin produccion, sin Supabase y sin documentos reales. |
| Fase 2D.21-2D.32 | Disabled UI shell no conectada para revision import/restore | `PHASE2D_DISABLED_IMPORT_RESTORE_UI_SHELL: READY FOR EXPLICIT UI WIRING DECISION / NO APPLY`; evidencia tecnica interna; disabled UI shell, view models seguros, disabled actions, copy/accessibility, preview list, safe error presenter, UI audit in-memory, hardening y acceptance; no UI conectada, no rutas, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.33-2D.44 | Disabled UI wiring gates para import/restore | `PHASE2D_DISABLED_IMPORT_RESTORE_UI_WIRING: READY FOR EXPLICIT ROUTELESS UI WIRING REVIEW / NO APPLY`; evidencia tecnica interna; disabled UI wiring, UI wiring gates, local file preview harness sintetico, disabled file selection adapter, handlers no-op/blocked, props factory segura, checklist all false, hardening, accesibilidad y route/navigation blocker; no UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.45-2D.56 | Routeless UI preview harness para import/restore | `PHASE2D_ROUTELESS_IMPORT_RESTORE_UI_PREVIEW_HARNESS: READY FOR UX_LEGAL_REVIEW / NO WIRING / NO APPLY`; evidencia tecnica interna; routeless UI preview harness, fixtures sinteticos, state machine de preview, review session model, data-loss warnings, recovery snapshot download placeholder disabled, UX/legal review packet, interaction/copy/wiring acceptance; no UI conectada, no ruta, no navegación, no localStorage write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.57-2D.68 | Local data safety regression corpus | `PHASE2D_LOCAL_DATA_SAFETY_REGRESSION_CORPUS: READY FOR UI WIRING DECISION / NO APPLY / SYNTHETIC ONLY`; evidencia tecnica interna; synthetic backup corpus, local data safety, data-loss regression, lifecycle, numeracion, snapshots/PDF hashes, clientes, legacy, adversarial malformed corpus, large boundary y composite risk; no UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.69-2D.80 | Import/restore wiring decision package | `PHASE2D_IMPORT_RESTORE_WIRING_DECISION_PACKAGE: READY FOR HUMAN PRODUCT_DECISION / NO WIRING / NO APPLY`; evidencia tecnica interna; decision gate, matrix, UX/data-loss packet, catalogo de summaries, review board packet, approvals, reviewer notes, decision report, acceptance y regression; no UI conectada, no ruta, no navegación, no localStorage read/write, no file picker real, no download, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.81-2D.92 | Hidden/routeless UI shell | `PHASE2D_HIDDEN_IMPORT_RESTORE_UI_WIRING_SHELL: READY FOR EXPLICIT HIDDEN_UI_ENABLEMENT_REVIEW / NO APPLY`; evidencia tecnica interna; hidden/routeless UI shell, flag privada, composicion no conectada, selector sintetico, paneles, action bar deshabilitada, render harness, no-route acceptance y no-apply/no-storage acceptance; no ruta publica, no navegación, no localStorage read/write, no FileReader real, no Blob/download, no import/restore apply, sin producción, sin Supabase y sin documentos reales. |
| Fase 2D.93-2D.104 | Hidden UI enablement safety gates | `PHASE2D_HIDDEN_UI_ENABLEMENT_SAFETY_GATES: READY FOR OWNER_DECISION / BLOCKED BY DEFAULT / NO ENABLEMENT`; evidencia tecnica interna; gate bloqueado por defecto, environment contract inyectado, checklist all false, final review pack, no-go registry, readiness report, owner decision packet, dry-run state machine, global regression y blocked acceptance; UI routeless, no UI activa, no ruta, no navegación, no localStorage read/write, no import/restore apply, synthetic data only, sin producción, sin Supabase y sin documentos reales. |
| Fase 2E.1-2E.12 | Local storage resilience foundation | `PHASE2E_LOCAL_STORAGE_RESILIENCE_FOUNDATION: READY FOR STORAGE UI/ADAPTER DECISION / NO REAL STORAGE MUTATION`; evidencia tecnica interna; storage safety, disabled storage adapter, fake/in-memory adapters, error taxonomy, operation dry-run, backup-before-write, corruption recovery, safe report, audit events y acceptance; no localStorage real, no data mutation, no UI, sin produccion, sin Supabase y sin documentos reales. |
| AUDIT_EXPORT_V1 | Snapshot/export del dossier vivo | `COMPLIANCE_DOSSIER_EXPORT: HTML SNAPSHOT READY / PDF GUIDE READY / MD CANONICAL`; HTML/PDF son snapshots derivados; el Markdown sigue siendo canonico; no declaran cumplimiento productivo. |
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
| 2026-06-26 | Bloqueo oficial 2B.7F-K documentado con politica de fixture XSD, evaluacion de validador y catalogo sintetico bloqueado. | Fase 2B.7F-K | PR 2B.7F-K puerta oficial offline | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Enforcement ejecutable 2B.7L-P añadido para mantener bloqueada la alineacion oficial hasta que existan fixtures XSD, validador offline y datos sinteticos seguros. | Fase 2B.7L-P | PR 2B.7L-P blocker enforcement | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Readiness tooling local/offline 2B.7Q-U añadido para futura entrada manual segura de artefactos oficiales, manteniendo el bloqueo oficial. | Fase 2B.7Q-U | PR 2B.7Q-U readiness tooling | Equipo Factura Autónomo / Codex |
| 2026-06-26 | Preparacion 2B.7V-Z añadida con lockfile contract, generator local, verifier opt-in, checklist humana y checkpoint final, manteniendo el bloqueo oficial. | Fase 2B.7V-Z | PR 2B.7V-Z unlock preparation | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Route shell deshabilitada 2C.31-2C.36 añadida como evidencia tecnica interna, con flag privada de servidor, auth context boundary, envelope seguro y acceptance local. | Fase 2C.31-2C.36 | PR 2C disabled sync route shell | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Snapshot/export AUDIT_EXPORT_V1 añadido para generar HTML imprimible y guiar PDF derivado desde el dossier canonico, sin declaracion productiva. | Audit export | PR audit export v1 | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Ejecucion privada local/fake de route shell endurecida con fake adapter, rate limit, requestId, idempotencia/replay, method/content-type/cache/CORS, telemetria segura, acceptance local y checkpoint 2C.48. | Fase 2C.37-2C.48 | PR 2C private local sync route fake hardening | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Handler privado local/staging añadido con dependencias inyectadas, route thin boundary, harness Supabase local opt-in, paridad fake-vs-Supabase-local, matriz auth/scope, failure injection y checkpoint 2C.56. | Fase 2C.49-2C.56 | PR 2C private local sync handler harness | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Seguridad de datos locales 2D.1-2D.10 añadida con manifiesto, backup integrity, import dry-run, recovery snapshot, restore planning, reporte seguro, eventos in-memory, acceptance y checkpoint sin mutacion. | Fase 2D.1-2D.10 | PR 2D local data safety | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Backup/import review flow 2D.11-2D.20 anadido con UI-facing contracts, validation pipeline, human confirmation gate, apply blockers, disabled localStorage adapter contract, malformed backup hardening, safe report, acceptance y checkpoint sin apply. | Fase 2D.11-2D.20 | PR 2D import restore review flow | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Disabled UI shell 2D.21-2D.32 anadida con view models seguros, React shell no conectada, acciones deshabilitadas, copy/accessibility, preview list, safe error presenter, UI audit in-memory, hardening y acceptance sin apply. | Fase 2D.21-2D.32 | PR 2D disabled import restore UI shell | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Disabled UI wiring 2D.33-2D.44 anadido con UI wiring gates, adapter de archivo bloqueado, local file preview harness sintetico, handlers no-op/blocked, props factory, checklist all false, hardening, accesibilidad y route/navigation blocker sin apply. | Fase 2D.33-2D.44 | PR 2D disabled import restore UI wiring gates | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Routeless UI preview harness 2D.45-2D.56 anadido con scope routeless, fixtures sinteticos, state machine de preview, review session model, data-loss warnings, recovery snapshot download placeholder disabled, UX/legal review packet y acceptance sin wiring ni apply. | Fase 2D.45-2D.56 | PR 2D routeless import restore UI preview harness | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Local data safety regression corpus 2D.57-2D.68 anadido con synthetic backup corpus, lifecycle, numeracion, snapshots/PDF hashes, clientes, legacy, adversarial malformed corpus, large backup boundary, composite data-loss risk y acceptance sintetica sin wiring ni apply. | Fase 2D.57-2D.68 | PR 2D local data safety regression corpus | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Import/restore wiring decision package 2D.69-2D.80 anadido con decision gate, corpus matrix, UX/data-loss packet, catalogo, review board packet, approval state machine, reviewer notes, decision report, acceptance y regression sin wiring ni apply. | Fase 2D.69-2D.80 | PR 2D import restore wiring decision package | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Hidden/routeless UI shell 2D.81-2D.92 anadido con flag privada, composicion no conectada, selector sintetico, preview/risk/decision/action panels, render harness, no-route acceptance y no-apply/no-storage acceptance sin ruta ni apply. | Fase 2D.81-2D.92 | PR 2D hidden import restore UI shell | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Hidden UI enablement safety gates 2D.93-2D.104 anadidos con gate bloqueado, environment contract, checklist all false, final review pack, no-go registry, readiness report, owner packet, dry-run state machine, global regression y blocked acceptance sin enablement. | Fase 2D.93-2D.104 | PR 2D hidden UI enablement safety gates | Equipo Factura Autónomo / Codex |
| 2026-06-27 | Local storage resilience foundation 2E.1-2E.12 anadida con auditoria, disabled storage adapter, fake/in-memory adapters, error taxonomy, dry-run planner, backup-before-write, corruption recovery, safe report, audit events y acceptance sin storage real. | Fase 2E.1-2E.12 | PR 2E local storage resilience foundation | Equipo Factura Autónomo / Codex |

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

Para Fase 2E.1-2E.12 constan como referencias internas:

- `docs/phase2e1-local-storage-surface-audit-v1.md`;
- `docs/phase2e2-storage-adapter-contract-disabled-v1.md`;
- `docs/phase2e3-in-memory-storage-adapter-v1.md`;
- `docs/phase2e4-storage-error-taxonomy-v1.md`;
- `docs/phase2e5-storage-operation-dry-run-planner-v1.md`;
- `docs/phase2e6-backup-before-write-policy-v1.md`;
- `docs/phase2e7-corruption-parse-recovery-classifier-v1.md`;
- `docs/phase2e8-storage-resilience-safe-report-v1.md`;
- `docs/phase2e9-storage-resilience-audit-events-v1.md`;
- `docs/phase2e10-storage-resilience-acceptance-v1.md`;
- `docs/phase2e12-local-storage-resilience-foundation-checkpoint-v1.md`;
- `src/lib/local-storage-resilience/types.ts`;
- `src/lib/local-storage-resilience/storage-adapter-contract.ts`;
- `src/lib/local-storage-resilience/in-memory-storage-adapter.ts`;
- `src/lib/local-storage-resilience/storage-errors.ts`;
- `src/lib/local-storage-resilience/storage-operation-dry-run.ts`;
- `src/lib/local-storage-resilience/backup-before-write-policy.ts`;
- `src/lib/local-storage-resilience/storage-corruption-recovery.ts`;
- `src/lib/local-storage-resilience/storage-safe-report.ts`;
- `src/lib/local-storage-resilience/storage-audit-events.ts`;
- `scripts/phase2e10-storage-resilience-acceptance.test.ts`;
- `scripts/validate-phase2e1-12-local-storage-resilience-foundation.mjs`;
- validadores `validate:phase2e1-*` a `validate:phase2e10-*`;
- `test:phase2e10-storage-resilience-acceptance`;
- estado documentado: `PHASE2E_LOCAL_STORAGE_RESILIENCE_FOUNDATION: READY FOR STORAGE UI/ADAPTER DECISION / NO REAL STORAGE MUTATION`;
- limites: no localStorage real, no data mutation, no UI, sin produccion, sin Supabase, sin documentos reales y synthetic data only.

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
- `docs/phase2b7a-synthetic-pipeline-technical-review-v1.md`;
- `docs/phase2b7b-official-artifact-field-mapping-v1.md`;
- `docs/phase2b7c-official-aligned-synthetic-xml-candidate-v1.md`;
- `docs/phase2b7d-official-artifact-local-validation-v1.md`;
- `docs/phase2b7e-pre-qr-signature-transport-checkpoint-v1.md`;
- `docs/phase2b7q-local-official-artifact-intake-protocol-v1.md`;
- `docs/phase2b7r-local-xsd-checksum-import-graph-verifier-v1.md`;
- `docs/phase2b7s-official-artifact-readiness-report-cli-v1.md`;
- `docs/phase2b7t-official-artifact-readiness-acceptance-tests-v1.md`;
- `docs/phase2b7u-official-artifact-readiness-tooling-checkpoint-v1.md`;
- `docs/phase2b7v-official-artifact-lockfile-contract-v1.md`;
- `docs/phase2b7w-local-official-artifact-lockfile-generator-v1.md`;
- `docs/phase2b7x-opt-in-official-artifact-verification-v1.md`;
- `docs/phase2b7y-human-approval-checklist-for-official-artifacts-v1.md`;
- `docs/phase2b7y-human-approval-checklist-for-official-artifacts.template.json`;
- `docs/phase2b7z-official-artifact-unlock-preparation-checkpoint-v1.md`;
- `docs/phase2c31-disabled-sync-route-private-flag-contract-v1.md`;
- `docs/phase2c32-disabled-sync-route-shell-http-v1.md`;
- `docs/phase2c33-sync-route-auth-context-adapter-v1.md`;
- `docs/phase2c34-sync-route-safe-envelope-v1.md`;
- `docs/phase2c35-disabled-sync-route-shell-acceptance-v1.md`;
- `docs/phase2c36-disabled-sync-route-shell-checkpoint-v1.md`;
- `docs/phase2c37-private-local-sync-route-execution-contract-v1.md`;
- `docs/phase2c38-sync-route-fake-adapter-factory-v1.md`;
- `docs/phase2c39-sync-route-local-fake-execution-boundary-v1.md`;
- `docs/phase2c40-sync-route-abuse-payload-hardening-v1.md`;
- `docs/phase2c41-sync-route-in-memory-rate-limit-request-id-v1.md`;
- `docs/phase2c42-sync-route-local-fake-idempotency-replay-guard-v1.md`;
- `docs/phase2c43-sync-route-method-content-cache-cors-hardening-v1.md`;
- `docs/phase2c44-sync-route-safe-telemetry-report-v1.md`;
- `docs/phase2c45-private-local-sync-route-fake-acceptance-v1.md`;
- `docs/phase2c46-sync-route-operational-hardening-acceptance-v1.md`;
- `docs/phase2c48-private-local-sync-route-fake-execution-hardening-checkpoint-v1.md`;
- `docs/phase2c49-sync-route-security-review-v1.md`;
- `docs/phase2c50-sync-route-handler-dependency-boundary-v1.md`;
- `docs/phase2c51-supabase-local-sync-handler-harness-opt-in-v1.md`;
- `docs/phase2c52-sync-handler-fake-supabase-local-parity-v1.md`;
- `docs/phase2c53-sync-route-auth-scope-adversarial-matrix-v1.md`;
- `docs/phase2c54-sync-route-operational-failure-injection-v1.md`;
- `docs/phase2c56-private-local-sync-handler-harness-checkpoint-v1.md`;
- `docs/audit/compliance-dossier-snapshot-metadata-v1.json`;
- `docs/audit/compliance-dossier-snapshot-policy-v1.md`;
- `docs/audit/compliance-dossier-html-export-v1.md`;
- `docs/audit/compliance-dossier-pdf-snapshot-guide-v1.md`;
- `docs/audit/compliance-dossier-export-checkpoint-v1.md`;
- `scripts/export-compliance-dossier-html.mjs`;
- `scripts/validate-audit-compliance-dossier-snapshot-metadata.mjs`;
- `scripts/validate-audit-compliance-dossier-html-export.mjs`;
- `scripts/validate-audit-compliance-dossier-pdf-guide.mjs`;
- `scripts/validate-audit-export-v1-compliance-dossier-snapshot.mjs`;
- `docs/phase2d11-backup-file-intake-contract-v1.md`;
- `docs/phase2d12-backup-validation-pipeline-v1.md`;
- `docs/phase2d13-import-restore-review-model-v1.md`;
- `docs/phase2d14-import-restore-human-confirmation-gate-v1.md`;
- `docs/phase2d14-import-restore-human-confirmation-checklist.template.json`;
- `docs/phase2d15-import-restore-apply-blocker-v1.md`;
- `docs/phase2d16-disabled-localstorage-adapter-contract-v1.md`;
- `docs/phase2d17-malformed-backup-hardening-v1.md`;
- `docs/phase2d18-import-restore-review-flow-safe-report-v1.md`;
- `docs/phase2d19-import-restore-review-flow-acceptance-v1.md`;
- `docs/phase2d20-import-restore-review-flow-checkpoint-v1.md`;
- `docs/phase2d21-disabled-import-restore-ui-shell-scope-v1.md`;
- `docs/phase2d22-import-restore-review-view-model-v1.md`;
- `docs/phase2d23-import-restore-disabled-action-model-v1.md`;
- `docs/phase2d24-disabled-import-restore-react-shell-v1.md`;
- `docs/phase2d25-import-restore-copy-accessibility-contract-v1.md`;
- `docs/phase2d26-import-restore-preview-list-model-v1.md`;
- `docs/phase2d27-import-restore-safe-error-presenter-v1.md`;
- `docs/phase2d28-import-restore-ui-audit-event-model-v1.md`;
- `docs/phase2d29-import-restore-ui-facing-data-hardening-v1.md`;
- `docs/phase2d30-disabled-import-restore-ui-shell-acceptance-v1.md`;
- `docs/phase2d32-disabled-import-restore-ui-shell-checkpoint-v1.md`;
- `docs/phase2d33-import-restore-ui-wiring-readiness-gate-v1.md`;
- `docs/phase2d34-disabled-file-selection-adapter-contract-v1.md`;
- `docs/phase2d35-in-memory-backup-preview-parser-harness-v1.md`;
- `docs/phase2d36-import-restore-ui-event-handler-contract-v1.md`;
- `docs/phase2d37-disabled-import-restore-wiring-props-factory-v1.md`;
- `docs/phase2d38-import-restore-ui-wiring-approval-checklist-v1.md`;
- `docs/phase2d38-import-restore-ui-wiring-approval-checklist.template.json`;
- `docs/phase2d39-local-import-restore-preview-harness-acceptance-v1.md`;
- `docs/phase2d40-import-restore-ui-action-abuse-hardening-v1.md`;
- `docs/phase2d41-import-restore-accessibility-regression-acceptance-v1.md`;
- `docs/phase2d42-import-restore-route-navigation-blocker-validation-v1.md`;
- `docs/phase2d44-disabled-import-restore-ui-wiring-gates-checkpoint-v1.md`;
- `docs/phase2d45-routeless-import-restore-ui-harness-scope-v1.md`;
- `docs/phase2d46-import-restore-synthetic-ui-fixtures-v1.md`;
- `docs/phase2d47-import-restore-preview-flow-state-machine-v1.md`;
- `docs/phase2d48-import-restore-review-session-model-v1.md`;
- `docs/phase2d49-import-restore-data-loss-warning-model-v1.md`;
- `docs/phase2d50-disabled-recovery-snapshot-download-placeholder-v1.md`;
- `docs/phase2d51-import-restore-ux-legal-review-packet-v1.md`;
- `docs/phase2d52-routeless-import-restore-ui-interaction-acceptance-v1.md`;
- `docs/phase2d53-import-restore-visual-copy-regression-acceptance-v1.md`;
- `docs/phase2d54-import-restore-wiring-final-blockers-v1.md`;
- `docs/phase2d56-routeless-import-restore-ui-preview-harness-checkpoint-v1.md`;
- `docs/phase2d57-synthetic-backup-corpus-registry-v1.md`;
- `docs/phase2d58-document-lifecycle-risk-matrix-v1.md`;
- `docs/phase2d59-numbering-counters-risk-analyzer-v1.md`;
- `docs/phase2d60-snapshot-pdf-hash-risk-analyzer-v1.md`;
- `docs/phase2d61-customer-identity-import-risk-analyzer-v1.md`;
- `docs/phase2d62-legacy-backup-compatibility-classifier-v1.md`;
- `docs/phase2d63-adversarial-malformed-backup-corpus-v1.md`;
- `docs/phase2d64-large-backup-boundary-model-v1.md`;
- `docs/phase2d65-composite-data-loss-risk-aggregator-v1.md`;
- `docs/phase2d66-local-data-safety-corpus-regression-acceptance-v1.md`;
- `docs/phase2d68-local-data-safety-regression-corpus-checkpoint-v1.md`;
- `src/lib/local-data-safety/backup-intake.ts`;
- `src/lib/local-data-safety/backup-validation-pipeline.ts`;
- `src/lib/local-data-safety/import-restore-review-model.ts`;
- `src/lib/local-data-safety/import-restore-confirmation-gate.ts`;
- `src/lib/local-data-safety/import-restore-apply-blocker.ts`;
- `src/lib/local-data-safety/localstorage-adapter-contract.ts`;
- `src/lib/local-data-safety/malformed-backup-hardening.ts`;
- `src/lib/local-data-safety/import-restore-review-report.ts`;
- `src/lib/local-data-safety/ui-shell-scope.ts`;
- `src/lib/local-data-safety/import-restore-view-model.ts`;
- `src/lib/local-data-safety/import-restore-disabled-actions.ts`;
- `src/lib/local-data-safety/import-restore-copy.ts`;
- `src/lib/local-data-safety/import-restore-preview-list.ts`;
- `src/lib/local-data-safety/import-restore-error-presenter.ts`;
- `src/lib/local-data-safety/import-restore-ui-audit.ts`;
- `src/lib/local-data-safety/import-restore-ui-wiring-gate.ts`;
- `src/lib/local-data-safety/disabled-file-selection-adapter.ts`;
- `src/lib/local-data-safety/in-memory-backup-preview-harness.ts`;
- `src/lib/local-data-safety/import-restore-ui-event-handlers.ts`;
- `src/lib/local-data-safety/import-restore-wiring-props.ts`;
- `src/lib/local-data-safety/routeless-ui-harness-scope.ts`;
- `src/lib/local-data-safety/import-restore-ui-fixtures.ts`;
- `src/lib/local-data-safety/import-restore-preview-state-machine.ts`;
- `src/lib/local-data-safety/import-restore-review-session.ts`;
- `src/lib/local-data-safety/import-restore-data-loss-warning.ts`;
- `src/lib/local-data-safety/recovery-snapshot-download-placeholder.ts`;
- `src/lib/local-data-safety/import-restore-ux-legal-review-packet.ts`;
- `src/lib/local-data-safety/synthetic-backup-corpus.ts`;
- `src/lib/local-data-safety/document-lifecycle-risk-matrix.ts`;
- `src/lib/local-data-safety/numbering-counters-risk.ts`;
- `src/lib/local-data-safety/snapshot-pdf-hash-risk.ts`;
- `src/lib/local-data-safety/customer-identity-risk.ts`;
- `src/lib/local-data-safety/legacy-backup-compatibility.ts`;
- `src/lib/local-data-safety/adversarial-backup-corpus.ts`;
- `src/lib/local-data-safety/large-backup-boundary.ts`;
- `src/lib/local-data-safety/composite-data-loss-risk.ts`;
- `scripts/phase2d66-local-data-safety-corpus-regression-acceptance.test.ts`;
- `src/components/local-data-safety/ImportRestoreReviewShell.tsx`;
- `scripts/phase2d19-import-restore-review-flow-acceptance.test.ts`;
- `scripts/phase2d29-import-restore-ui-facing-data-hardening.test.ts`;
- `scripts/phase2d30-disabled-import-restore-ui-shell-acceptance.test.ts`;
- `scripts/phase2d39-local-import-restore-preview-harness-acceptance.test.ts`;
- `scripts/phase2d40-import-restore-ui-action-abuse-hardening.test.ts`;
- `scripts/phase2d41-import-restore-accessibility-regression-acceptance.test.ts`;
- `scripts/phase2d42-import-restore-route-navigation-blocker-validation.test.ts`;
- `scripts/phase2d52-routeless-import-restore-ui-interaction-acceptance.test.ts`;
- `scripts/phase2d53-import-restore-visual-copy-regression-acceptance.test.ts`;
- `scripts/phase2d54-import-restore-wiring-final-blockers.test.ts`;
- `scripts/validate-phase2d11-backup-file-intake-contract.mjs`;
- `scripts/validate-phase2d12-backup-validation-pipeline.mjs`;
- `scripts/validate-phase2d13-import-restore-review-model.mjs`;
- `scripts/validate-phase2d14-import-restore-human-confirmation-gate.mjs`;
- `scripts/validate-phase2d15-import-restore-apply-blocker.mjs`;
- `scripts/validate-phase2d16-disabled-localstorage-adapter-contract.mjs`;
- `scripts/validate-phase2d17-malformed-backup-hardening.mjs`;
- `scripts/validate-phase2d18-import-restore-review-flow-safe-report.mjs`;
- `scripts/validate-phase2d19-import-restore-review-flow-acceptance.mjs`;
- `scripts/validate-phase2d11-20-import-restore-review-flow.mjs`;
- `scripts/validate-phase2d21-disabled-import-restore-ui-shell-scope.mjs`;
- `scripts/validate-phase2d22-import-restore-review-view-model.mjs`;
- `scripts/validate-phase2d23-import-restore-disabled-action-model.mjs`;
- `scripts/validate-phase2d24-disabled-import-restore-react-shell.mjs`;
- `scripts/validate-phase2d25-import-restore-copy-accessibility-contract.mjs`;
- `scripts/validate-phase2d26-import-restore-preview-list-model.mjs`;
- `scripts/validate-phase2d27-import-restore-safe-error-presenter.mjs`;
- `scripts/validate-phase2d28-import-restore-ui-audit-event-model.mjs`;
- `scripts/validate-phase2d29-import-restore-ui-facing-data-hardening.mjs`;
- `scripts/validate-phase2d30-disabled-import-restore-ui-shell-acceptance.mjs`;
- `scripts/validate-phase2d21-32-disabled-import-restore-ui-shell.mjs`;
- `scripts/validate-phase2d33-import-restore-ui-wiring-readiness-gate.mjs`;
- `scripts/validate-phase2d34-disabled-file-selection-adapter-contract.mjs`;
- `scripts/validate-phase2d35-in-memory-backup-preview-parser-harness.mjs`;
- `scripts/validate-phase2d36-import-restore-ui-event-handler-contract.mjs`;
- `scripts/validate-phase2d37-disabled-import-restore-wiring-props-factory.mjs`;
- `scripts/validate-phase2d38-import-restore-ui-wiring-approval-checklist.mjs`;
- `scripts/validate-phase2d39-local-import-restore-preview-harness-acceptance.mjs`;
- `scripts/validate-phase2d40-import-restore-ui-action-abuse-hardening.mjs`;
- `scripts/validate-phase2d41-import-restore-accessibility-regression-acceptance.mjs`;
- `scripts/validate-phase2d42-import-restore-route-navigation-blocker-validation.mjs`;
- `scripts/validate-phase2d33-44-disabled-import-restore-ui-wiring-gates.mjs`;
- `scripts/validate-phase2d45-routeless-import-restore-ui-harness-scope.mjs`;
- `scripts/validate-phase2d46-import-restore-synthetic-ui-fixtures.mjs`;
- `scripts/validate-phase2d47-import-restore-preview-flow-state-machine.mjs`;
- `scripts/validate-phase2d48-import-restore-review-session-model.mjs`;
- `scripts/validate-phase2d49-import-restore-data-loss-warning-model.mjs`;
- `scripts/validate-phase2d50-disabled-recovery-snapshot-download-placeholder.mjs`;
- `scripts/validate-phase2d51-import-restore-ux-legal-review-packet.mjs`;
- `scripts/validate-phase2d52-routeless-import-restore-ui-interaction-acceptance.mjs`;
- `scripts/validate-phase2d53-import-restore-visual-copy-regression-acceptance.mjs`;
- `scripts/validate-phase2d54-import-restore-wiring-final-blockers.mjs`;
- `scripts/validate-phase2d45-56-routeless-import-restore-ui-preview-harness.mjs`;
- `scripts/validate-phase2c31-disabled-sync-route-private-flag-contract.mjs`;
- `scripts/validate-phase2c32-disabled-sync-route-shell-http.mjs`;
- `scripts/validate-phase2c33-sync-route-auth-context-adapter.mjs`;
- `scripts/validate-phase2c34-sync-route-safe-envelope.mjs`;
- `scripts/validate-phase2c35-disabled-sync-route-shell-acceptance.mjs`;
- `scripts/validate-phase2c31-36-disabled-sync-route-shell.mjs`;
- `scripts/phase2c35-disabled-sync-route-shell-acceptance.test.ts`;
- `scripts/validate-phase2c37-private-local-sync-route-execution-contract.mjs`;
- `scripts/validate-phase2c38-sync-route-fake-adapter-factory.mjs`;
- `scripts/validate-phase2c39-sync-route-local-fake-execution-boundary.mjs`;
- `scripts/validate-phase2c40-sync-route-abuse-payload-hardening.mjs`;
- `scripts/validate-phase2c41-sync-route-in-memory-rate-limit-request-id.mjs`;
- `scripts/validate-phase2c42-sync-route-local-fake-idempotency-replay-guard.mjs`;
- `scripts/validate-phase2c43-sync-route-method-content-cache-cors-hardening.mjs`;
- `scripts/validate-phase2c44-sync-route-safe-telemetry-report.mjs`;
- `scripts/validate-phase2c45-private-local-sync-route-fake-acceptance.mjs`;
- `scripts/validate-phase2c46-sync-route-operational-hardening-acceptance.mjs`;
- `scripts/validate-phase2c37-48-private-local-sync-route-fake-execution-hardening.mjs`;
- `scripts/phase2c40-sync-route-abuse-payload-hardening.test.ts`;
- `scripts/phase2c45-private-local-sync-route-fake-acceptance.test.ts`;
- `scripts/phase2c46-sync-route-operational-hardening-acceptance.test.ts`;
- `scripts/validate-phase2c49-sync-route-security-review.mjs`;
- `scripts/validate-phase2c50-sync-route-handler-dependency-boundary.mjs`;
- `scripts/validate-phase2c51-supabase-local-sync-handler-harness-opt-in.mjs`;
- `scripts/validate-phase2c52-sync-handler-fake-supabase-local-parity.mjs`;
- `scripts/validate-phase2c53-sync-route-auth-scope-adversarial-matrix.mjs`;
- `scripts/validate-phase2c54-sync-route-operational-failure-injection.mjs`;
- `scripts/validate-phase2c49-56-private-local-sync-handler-harness.mjs`;
- `scripts/phase2c51-supabase-local-sync-handler-harness.test.ts`;
- `scripts/phase2c52-sync-handler-fake-supabase-local-parity.test.ts`;
- `scripts/phase2c53-sync-route-auth-scope-adversarial-matrix.test.ts`;
- `scripts/phase2c54-sync-route-operational-failure-injection.test.ts`;
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
