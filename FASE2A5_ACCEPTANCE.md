# Fase 2A.5 - PDF historico desde snapshot

## Estado

ACEPTADA LOCALMENTE / COMMIT FUNCIONAL CREADO.

Commit funcional:

`db03153dcef7c8a1406a2312a2341729094f82ab`

## Rama

`feat/phase2a5-historical-pdf-from-snapshot`

## Alcance

- Los PDFs de documentos emitidos o bloqueados se renderizan desde una fuente normalizada basada en `documentSnapshot` y `pdfSnapshot`.
- Los borradores siguen renderizando desde datos vivos (`Document` + `BusinessProfile` actuales).
- Descarga, vista previa, blob PDF y comparticion por email/WhatsApp usan el mismo pipeline de render.
- Los documentos legacy protegidos sin `documentSnapshot` usan un fallback read-only conservador (`legacy_backfill`) sin persistirlo.
- El render normal no recalcula ni reemplaza `snapshotHash` ni `pdfSnapshot.contentHash`.

## Fuera de Alcance

- No se redisenan plantillas PDF.
- No se cambia branding, copy comercial, precios, planes ni Stripe.
- No se cambia VeriFactu servidor, transporte AEAT ni registro fiscal productivo.
- No se almacena PDF binario firmado/sellado.
- No se migran snapshots legacy de forma masiva.
- No se actualiza el dossier de compliance en esta fase.

## Archivos Modificados

- `src/lib/document-integrity/pdf-source.ts`
- `src/lib/pdf.ts`
- `src/lib/share.ts`
- `src/lib/document-integrity/pdf-source.test.ts`
- `src/lib/document-integrity/share-flow.test.ts`
- `src/lib/document-integrity/customer-merge.test.ts`
- `src/lib/share.test.ts`

## Politica de Render PDF

### Borrador / unlocked

- Fuente: datos vivos actuales.
- Puede usar el perfil de negocio actual.
- Puede reflejar cambios de cliente, lineas, notas, fechas, condiciones y plantilla.
- No requiere snapshot.

### Emitido/bloqueado con `documentSnapshot` y `pdfSnapshot`

- Fuente: `documentSnapshot` para numero, fechas, cliente, emisor, lineas, impuestos, notas, forma de pago, rectificacion y VeriFactu existente.
- Fuente: `pdfSnapshot.template` para configuracion visual congelada.
- No lee el `BusinessProfile` vivo para emisor historico.
- No lee el `Customer` vivo para destinatario historico.
- No usa lineas vivas cuando el snapshot tiene lineas.
- Usa `taxSummary` del snapshot como fuente de importes.
- No modifica hashes ni snapshots durante render.

### Emitido/bloqueado con `documentSnapshot` pero sin `pdfSnapshot`

- Fuente documental: `documentSnapshot`.
- Configuracion visual: plantilla actual como compatibilidad parcial, porque no existe configuracion PDF congelada.
- No persiste `pdfSnapshot` automaticamente.

### Legacy protegido sin `documentSnapshot`

- Fuente: fallback read-only derivado con `deriveLegacySnapshotForReadOnly`.
- `source = legacy_backfill`.
- No se presenta como snapshot original.
- No se persiste automaticamente.

## Tests Anadidos

- Factura emitida: cambios posteriores de perfil, cliente, lineas, notas, fechas y emisor vivo no cambian el view model historico.
- Borrador: sigue usando datos vivos y perfil actual.
- Snapshot parcial: documento con `documentSnapshot` sin `pdfSnapshot` usa snapshot documental y no persiste `pdfSnapshot`.
- Legacy: documento protegido sin snapshot usa fallback conservador sin persistir.
- Presupuestos y recibos emitidos usan fuente snapshot.
- Compartir usa snapshot para el mensaje de documentos emitidos.
- Falla de envio: documento queda `issued/locked/not_sent` y su fuente PDF es snapshot.
- Merge de clientes: el PDF historico sigue usando el cliente congelado.

## Validaciones Locales

- `npm run check:migrations`: OK. 3 migraciones, 2 rollbacks.
- `npm test`: OK. 87 archivos, 419 tests.
- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK. Next.js 15.5.19, 58 paginas estaticas.
- `npm run test:phase1-acceptance`: OK con Supabase local y `PHASE1_ACCEPTANCE_TARGET=local`.
- `git diff --check`: OK.

Nota: la primera ejecucion de `npm run test:phase1-acceptance` fallo por falta de variables locales requeridas. Se repitio con el mismo esquema del workflow CI, usando solo Supabase local y app local.

## Confirmaciones

- No hay migraciones Supabase nuevas.
- No se accedio a Supabase produccion.
- No se aplicaron migraciones en produccion.
- No se cambio Vercel.
- No se promociono ningun deployment.
- No se cambiaron dominios, aliases ni DNS.
- No se empezo Fase 2B.
- No se tocaron importadores.
- No se actualizo compliance.

## Riesgos Diferidos

- Renderer PDF visual completamente congelado por version si se requiere reproducibilidad pixel-perfect futura.
- Almacenamiento de PDF binario firmado o sellado si se decide incorporarlo.
- Recuperacion/migracion explicita de snapshots legacy.
- Sincronizacion nube protegida desde servidor.
- VeriFactu servidor, registro fiscal atomico y transporte AEAT real.
- Auditoria externa legal/fiscal.
