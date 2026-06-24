# Fase 2A Stabilization Checkpoint v1

Fecha: 2026-06-24

Rama de trabajo: `docs/phase2a-stabilization-checkpoint`

Documento de checkpoint tecnico interno. No implementa codigo, no modifica
producto y no constituye certificacion legal, fiscal, tributaria ni
homologacion AEAT. Su finalidad es comprobar la coherencia tecnica de la base
local de integridad documental antes de preparar Fase 2B servidor/VERI*FACTU.

## Estado

- Fase 2A.1 cerrada: emision y bloqueo central.
- Fase 2A.2 cerrada: snapshots documentales completos.
- Fase 2A.3 cerrada: fusion segura de clientes.
- Fase 2A.4 cerrada: borrado, numeracion y recibos seguros.
- Fase 2A.5 cerrada: PDF historico desde snapshot.
- Compliance actualizado hasta Fase 2A.5 en `docs/compliance-evidence-v1.md`.
- Fase 2B no iniciada.
- Ultimo hito documental revisado: PR #9, merge commit
  `1936fd9af5794310fcb8d3a5432ded7f82db0ce9`.

## Objetivo del checkpoint

Este documento no anade funcionalidades ni cambia reglas de producto. Verifica
que los controles locales de Fase 2A forman una base coherente para planificar
la siguiente fase de integridad servidor y VERI*FACTU.

El checkpoint revisa:

- plan tecnico de Fase 2;
- informes de aceptacion 2A.1 a 2A.5;
- dossier vivo de compliance;
- modulos locales de integridad documental, PDF, compartir, documentos,
  recibos, rectificativas y store;
- tests relacionados con integridad documental, PDF, compartir, recibos,
  storage y backup.

## Resumen de controles cerrados

### 2A.1 Emision y bloqueo central

Controles cerrados:

- `issueDocument` centraliza la emision local.
- `documentLifecycle` separa borrador, emitido y cancelado a nivel tecnico.
- `integrityLock` bloquea documentos emitidos o historicos protegidos.
- La edicion generica mediante `updateDocument` queda bloqueada para documentos
  emitidos, bloqueados o legacy no borrador.
- El flujo de compartir emite primero si el documento sigue en borrador.
- Si falla el envio externo, el documento queda `issued`, `locked` y
  `deliveryStatus = "not_sent"`.
- Envio, cobro y aceptacion se tratan como operaciones dedicadas, no como
  reemplazo generico del documento.

Evidencia revisada:

- `FASE2A1_ACCEPTANCE.md`.
- `src/lib/document-integrity/index.ts`.
- `src/lib/document-integrity/share-flow.ts`.
- `src/context/AppStore.tsx`.
- Tests de `document-integrity`, storage y backup.

### 2A.2 Snapshots documentales

Controles cerrados:

- `documentSnapshot` congela contenido documental relevante en emision.
- `pdfSnapshot` congela configuracion de render conocida en emision.
- `snapshotHash` y `pdfSnapshot.contentHash` se calculan de forma determinista.
- Los hashes excluyen campos operativos como `capturedAt`, `renderedAt`,
  `updatedAt`, envio, cobro o aceptacion.
- La persistencia local y los backups conservan snapshots y hashes.
- Documentos legacy sin snapshot se mantienen compatibles sin migracion masiva.

Evidencia revisada:

- `FASE2A2_ACCEPTANCE.md`.
- `src/lib/document-integrity/snapshots.ts`.
- `src/lib/document-integrity/snapshots.test.ts`.
- `src/lib/storage.test.ts`.
- `src/lib/backup.test.ts`.

### 2A.3 Fusion segura de clientes

Controles cerrados:

- Fusionar clientes no altera `document.client` historico de documentos
  emitidos o bloqueados.
- Fusionar clientes no altera `documentSnapshot.customer`.
- Fusionar clientes no altera `snapshotHash` ni `pdfSnapshot.contentHash`.
- `customerId` funciona como referencia operativa al cliente maestro sin
  reescribir destinatario historico.
- `mergedCustomerIds` conserva IDs absorbidos para busquedas y listados.
- Los borradores solo actualizan cliente visible cuando
  `updateDraftDocuments=true`.

Evidencia revisada:

- `FASE2A3_ACCEPTANCE.md`.
- `src/lib/document-integrity/customer-merge.ts`.
- `src/lib/document-integrity/customer-merge.test.ts`.
- `src/lib/customers.ts`.
- `src/app/clientes/page.tsx`.

### 2A.4 Borrado, numeracion y recibos

Controles cerrados:

- Documentos emitidos o bloqueados no se borran fisicamente.
- Documentos legacy con `status != "borrador"` se tratan como protegidos.
- Rectificativas emitidas, presupuestos enviados/aceptados y recibos
  pagados/emitidos no se borran mediante borrado normal.
- `renumberDocumentsForKindYear` ignora documentos protegidos.
- Los huecos de numeracion de documentos emitidos se conservan.
- Desmarcar cobro conserva recibos automaticos emitidos o bloqueados.
- Desmarcar cobro no altera snapshots ni hashes de factura o recibo emitido.

Evidencia revisada:

- `FASE2A4_ACCEPTANCE.md`.
- `src/lib/document-integrity/deletion.ts`.
- `src/lib/documents.ts`.
- `src/lib/receipts.ts`.
- `src/lib/rectificativas.ts`.
- Tests de documents, receipts, rectificativas, storage y backup.

### 2A.5 PDF historico desde snapshot

Controles cerrados:

- PDFs de documentos emitidos/bloqueados se renderizan desde
  `documentSnapshot` y `pdfSnapshot` cuando existen.
- Borradores siguen renderizando desde datos vivos.
- Cambios posteriores en perfil, cliente, lineas, notas, fechas o totales vivos
  no alteran el PDF historico de documentos emitidos con snapshot.
- Legacy protegido sin snapshot usa fallback read-only conservador.
- Descarga, vista previa, blob PDF y compartir email/WhatsApp usan pipeline
  comun.
- Render normal no recalcula ni reemplaza `snapshotHash`.
- Render normal no recalcula ni reemplaza `pdfSnapshot.contentHash`.

Evidencia revisada:

- `FASE2A5_ACCEPTANCE.md`.
- `src/lib/document-integrity/pdf-source.ts`.
- `src/lib/pdf.ts`.
- `src/lib/share.ts`.
- `src/lib/document-integrity/pdf-source.test.ts`.
- `src/lib/share.test.ts`.

## Matriz de riesgos vivos

| Riesgo | Severidad | Estado | Mitigacion recomendada | Fase sugerida |
| --- | --- | --- | --- | --- |
| Sync nube todavia no protegido desde servidor | Alta | Pendiente | Definir documento canonico servidor, validacion de mutaciones y rechazo de degradaciones sobre documentos bloqueados. | 2B |
| Supabase produccion no migrada/validada con estas fases | Alta | Pendiente | Crear staging/baseline, ejecutar migraciones controladas y validar permisos antes de tocar produccion. | Pre-2B / staging |
| VERI*FACTU servidor pendiente | Alta | Pendiente | Disenar flujo servidor con fuente confiable, autenticacion, entorno test/productivo y estados explicitos. | 2B |
| Registro fiscal inmutable pendiente | Alta | Pendiente | Separar operacion fiscal, registro fiscal inmutable e intento de transporte. | 2B |
| Transporte AEAT pendiente | Alta | Pendiente | Implementar envio/reintento separado de creacion de registro fiscal, con estados y trazabilidad. | 2B |
| Anulacion/cancelacion completa pendiente | Alta | Pendiente | Definir operaciones dedicadas para anulacion y cancelacion sin borrado fisico ni renumeracion. | 2A.6 o 2B segun alcance |
| Auditoria de intentos de borrado bloqueados pendiente | Media | Pendiente | Registrar intentos bloqueados local/servidor con usuario, documento, fecha y motivo. | 2A.6 / 2B |
| Recuperacion/migracion legacy explicita pendiente | Media | Pendiente | Disenar herramienta de diagnostico y migracion opt-in para snapshots legacy. | 2A.6 o backlog |
| Renderer PDF pixel-perfect por version pendiente | Media | Pendiente | Versionar renderer/plantillas y definir pruebas visuales o almacenamiento binario si hace falta reproducibilidad estricta. | Backlog / 2B |
| Almacenamiento PDF binario firmado/sellado pendiente | Media | Pendiente | Evaluar almacenamiento de PDF emitido, hashes y sellado si el criterio legal/fiscal lo requiere. | Backlog fiscal |
| Importadores futuros deben respetar snapshots/bloqueos | Alta | Documentado, no implementado | Obligar a que importadores creen borradores o historicos protegidos sin modificar emitidos existentes. | Fase importadores |
| Adjuntos documentales pendientes | Media | Pendiente | Modelar adjuntos con permisos, retencion y vinculacion a documentos bloqueados. | Backlog |
| Backups/restore mas robustos pendientes | Media | Pendiente | Incorporar validacion, previsualizacion de conflictos y proteccion de documentos bloqueados al restaurar. | Backlog |
| `localStorage` como riesgo de perdida de datos | Alta | Pendiente | Mejorar backups, avisos, exportacion guiada y/o persistencia local mas robusta. | Backlog / Pro sync |

## Decision tecnica

Veredicto: **APTO PARA PLANIFICAR 2B**.

La Fase 2A se considera apta para cerrarse como base local de integridad
documental. Los controles locales principales estan implementados y validados
internamente: emision, bloqueo, snapshots, fusion de clientes, borrado seguro,
renumeracion segura, recibos automaticos protegidos y PDF historico desde
snapshot.

La decision no autoriza implementacion directa en produccion. Fase 2B puede
prepararse como diseno/plan servidor, con una validacion separada antes de
cualquier migracion o uso productivo.

Antes de produccion real hacen falta:

- staging o entorno equivalente;
- baseline Supabase confirmado;
- migraciones de servidor revisadas y reversibles cuando aplique;
- validacion de permisos/RLS/RPC;
- pruebas de concurrencia e idempotencia;
- revision externa legal/fiscal cuando aplique.

## Recomendacion de siguiente bloque

Siguiente paso recomendado, sin implementarlo en este checkpoint:

1. Crear plan Fase 2B servidor/VERI*FACTU.
2. Definir modelo canonico servidor de documento emitido.
3. Definir operacion fiscal transaccional.
4. Definir registros fiscales inmutables.
5. Definir intentos de transporte AEAT separados del registro fiscal.
6. Definir estrategia de reintentos, idempotencia y estados `processing`,
   `processed` y `failed` donde corresponda.
7. No tocar Supabase produccion aun.

## Fuera de alcance

Este checkpoint excluye expresamente:

- codigo;
- migraciones;
- produccion;
- acceso a Supabase produccion;
- VERI*FACTU productivo;
- declaracion responsable;
- cambios de Vercel;
- promociones de deployments;
- cambios de dominios, aliases o DNS;
- importadores;
- nuevas funciones;
- precios, planes, Stripe o textos comerciales.

## Validaciones ejecutadas

Como el cambio es documental, se ejecutan validaciones ligeras:

- `git diff --check`.
- `npm run check:migrations`.

No se ejecuta la suite completa porque no hay cambios de codigo, migraciones ni
configuracion de producto.

## Archivos revisados

- `FASE2_PLAN.md`
- `FASE2A1_ACCEPTANCE.md`
- `FASE2A2_ACCEPTANCE.md`
- `FASE2A3_ACCEPTANCE.md`
- `FASE2A4_ACCEPTANCE.md`
- `FASE2A5_ACCEPTANCE.md`
- `docs/compliance-evidence-v1.md`
- `src/lib/document-integrity/`
- `src/lib/pdf.ts`
- `src/lib/share.ts`
- `src/lib/documents.ts`
- `src/lib/receipts.ts`
- `src/lib/rectificativas.ts`
- `src/context/AppStore.tsx`
- Tests relacionados con `document-integrity`, PDF, compartir, recibos,
  storage y backup.
