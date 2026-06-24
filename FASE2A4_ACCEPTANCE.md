# Fase 2A.4 - Aceptacion tecnica de borrado, numeracion y recibos seguros

Estado: ACEPTADA LOCALMENTE / COMMIT FUNCIONAL CREADO
Rama: feat/phase2a4-delete-numbering-receipts
Fecha: 2026-06-24
Commit funcional: b70593ba3e2488a46b9f4841aabc0e30e1d2981d

## Alcance

Fase 2A.4 endurece los flujos locales de borrado, renumeracion y recibos
automaticos para que los documentos emitidos o bloqueados no se borren ni se
renumeren de forma accidental.

Queda fuera de alcance:

- Fase 2A.5 y Fase 2B.
- Sync nube.
- Importadores.
- VeriFactu servidor.
- Renderer PDF historico.
- Migraciones Supabase.
- Flujo completo de anulacion/cancelacion.

## Archivos modificados

- `src/lib/document-integrity/deletion.ts`
- `src/lib/documents.ts`
- `src/lib/rectificativas.ts`
- `src/lib/receipts.ts`
- `src/context/AppStore.tsx`
- `src/components/documents/DeleteDocumentButton.tsx`
- `src/lib/documents.test.ts`
- `src/lib/rectificativas.test.ts`
- `src/lib/receipts.test.ts`
- `src/lib/storage.test.ts`
- `src/lib/backup.test.ts`
- `FASE2A4_ACCEPTANCE.md`

No hay migraciones Supabase nuevas. No hay cambios de Vercel. No se han
modificado ficheros `.env`.

## Politica de borrado

Se introduce una politica central:

- `canPhysicallyDeleteDocument`
- `isDocumentDeletionProtected`
- `LOCKED_DELETE_MESSAGE`

Un documento puede borrarse fisicamente solo si:

- esta en borrador;
- su `documentLifecycle` deriva a `draft`;
- no tiene `integrityLock=locked`;
- no tiene `documentSnapshot`;
- no tiene `pdfSnapshot`.

Documentos emitidos, bloqueados, legacy con `status != "borrador"`,
rectificativas emitidas, presupuestos enviados/aceptados y recibos pagados no se
borran fisicamente.

Si el documento esta bloqueado, la accion normal de borrado se rechaza y la UI
muestra:

> Este documento ya está emitido y no puede borrarse. Podrás anularlo o
> rectificarlo en un flujo específico.

El flujo completo de anulacion/cancelacion queda diferido.

## Politica de renumeracion

`renumberDocumentsForKindYear` queda endurecido:

- nunca renumera documentos con `integrityLock=locked`;
- nunca renumera documentos con `documentLifecycle=issued/canceled`;
- nunca renumera legacy con `status != "borrador"`;
- nunca renumera documentos con `documentSnapshot`;
- nunca renumera documentos con `pdfSnapshot`.

Si hay documentos protegidos del mismo tipo/ano, los borradores renumerables
empiezan despues del mayor numero protegido. Asi no se rellenan huecos entre
documentos emitidos ni se alteran referencias historicas.

## Politica de recibos

`unmarkInvoiceCollection` centraliza el desmarcado de cobro de facturas:

- si el recibo automatico es borrador/desbloqueado, puede eliminarse;
- si el recibo automatico esta emitido/bloqueado, se conserva como historico;
- desmarcar cobro no renumera recibos emitidos;
- desmarcar cobro no cambia numeros, snapshots ni hashes de factura o recibo
  emitidos;
- la factura se desvincula operativamente de `receiptDocumentId`.

No se inventa todavia un estado amplio de recibo cancelado/anulado.

## Comportamiento de emitidos

Validado:

- factura emitida no se borra;
- documento `issued/locked/not_sent` no se borra;
- legacy `status != "borrador"` no se borra;
- presupuesto enviado no se borra;
- recibo pagado no se borra;
- rectificativa emitida no se borra;
- documentos emitidos no se renumeran;
- snapshots y hashes se conservan.

## Comportamiento de borradores

Validado:

- factura borrador puede borrarse;
- borradores pueden renumerarse si no comprometen documentos protegidos;
- borrar un borrador no cambia numeros emitidos;
- recibo automatico borrador puede eliminarse al desmarcar cobro.

## Tests añadidos

- Borrado de factura borrador permitido.
- Borrado de factura emitida rechazado.
- Borrado de `issued/locked/not_sent` rechazado.
- Borrado legacy `status != "borrador"` rechazado.
- Borrado de presupuesto enviado rechazado.
- Borrado de recibo pagado rechazado.
- Borrado de rectificativa emitida rechazado.
- Renumeracion ignora `locked/issued`.
- Renumeracion ignora documentos con snapshot.
- Huecos de emitidos se conservan.
- Borrar borrador no renumera factura/presupuesto/recibo emitidos.
- Marcar cobro sigue creando recibo automatico.
- Desmarcar cobro con recibo borrador puede eliminarlo.
- Desmarcar cobro con recibo emitido lo conserva.
- Desmarcar cobro no renumera recibos emitidos.
- Desmarcar cobro no altera snapshot/hash de factura.
- Desmarcar cobro no altera snapshot/hash de recibo emitido.
- Persistencia y backup conservan vinculos factura-recibo.

Tambien siguen cubiertas las regresiones existentes:

- emitir y compartir factura;
- `markDocumentPaid` idempotente;
- `acceptQuote` idempotente;
- `mergeCustomers` conserva snapshots;
- save/load/backup conservan integridad documental.

## Riesgos diferidos

- Flujo completo de anulacion/cancelacion de presupuestos y recibos.
- Auditoria local/servidor especifica para intentos de borrado bloqueados.
- Sync nube protegido desde servidor para estas reglas.
- Reconciliacion de estados operativos antiguos (`paymentStatus`, `paidAt`) en
  documentos legacy.
- PDF historico estricto.

## Validaciones finales

Ejecutadas localmente:

- `npm run check:migrations`: OK. `Supabase migration convention check passed (3 migrations, 2 rollbacks).`
- `npm test`: OK. 86 archivos, 411 tests.
- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK. Next.js 15.5.19 compilado correctamente, 58 paginas estaticas generadas.
- `npm run test:phase1-acceptance`: OK. `Phase 1 acceptance checks passed.`
- `git diff --check`: OK.

Prueba focal previa:

- `npm test -- src/lib/documents.test.ts src/lib/receipts.test.ts src/lib/rectificativas.test.ts src/lib/document-integrity/index.test.ts src/lib/document-integrity/share-flow.test.ts src/lib/document-integrity/customer-merge.test.ts src/lib/storage.test.ts src/lib/backup.test.ts`: OK. 8 archivos, 93 tests.

## Confirmaciones de entorno

- Commit funcional creado: b70593ba3e2488a46b9f4841aabc0e30e1d2981d.
- No se ha hecho deploy.
- No se ha promocionado Vercel.
- No se ha accedido a Supabase produccion.
- No se han aplicado migraciones.
