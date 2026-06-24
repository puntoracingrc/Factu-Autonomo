# Fase 2A.3 - Aceptacion tecnica de fusion segura de clientes

Estado: ACEPTADA LOCALMENTE / COMMIT FUNCIONAL CREADO
Rama: feat/phase2a3-safe-customer-merge
Fecha: 2026-06-24
Commit funcional: 5e0ff3242f8a16fdd7efe0cd8c113cc3dae001a9

## Alcance

Fase 2A.3 corrige la fusion de clientes para que la ficha maestra pueda
unificarse sin alterar documentos historicos emitidos ni snapshots fiscales.

Queda fuera de alcance:

- Fase 2A.4, Fase 2A.5 y Fase 2B.
- Importador PC Facturacion u otros importadores.
- Sync nube protegida.
- Migraciones Supabase.
- Auditoria servidor.
- Renderer PDF historico.
- Borrado/renumeracion.
- VeriFactu servidor.

## Archivos modificados

- `src/lib/types.ts`
- `src/lib/customers.ts`
- `src/lib/document-integrity/customer-merge.ts`
- `src/lib/document-integrity/customer-merge.test.ts`
- `src/context/AppStore.tsx`
- `src/app/clientes/page.tsx`
- `src/components/forms/DocumentForm.tsx`
- `src/lib/customers.test.ts`
- `src/lib/storage.test.ts`
- `src/lib/backup.test.ts`
- `FASE2A3_ACCEPTANCE.md`

No hay migraciones Supabase nuevas. No hay cambios de Vercel. No se han
modificado ficheros `.env`.

## Modelo compatible

Se anaden campos opcionales:

- `Document.customerId?: string`
- `Customer.mergedCustomerIds?: string[]`

Ambos son opcionales y compatibles con datos legacy. No requieren migracion
Supabase.

`document.client` sigue siendo el snapshot visible/historico del destinatario.
`documentSnapshot.customer` sigue siendo la fuente congelada cuando existe.
`customerId` es solo una referencia editable a la ficha maestra.

## Politica de merge

La fusion se centraliza en helpers puros:

- `isDocumentCustomerSnapshotProtected`
- `applyCustomerMergeToDocument`
- `mergeCustomerRecords`
- `findDocumentsForCustomer`

`mergeCustomerRecords`:

- Conserva el cliente maestro.
- Elimina de la lista los clientes secundarios.
- Enriquece campos vacios del maestro con datos de secundarios.
- Guarda en `mergedCustomerIds` los IDs absorbidos.

`applyCustomerMergeToDocument`:

- Detecta documentos por `customerId` o por coincidencia del snapshot legacy
  `document.client`.
- Para documentos protegidos, solo puede actualizar `customerId` al maestro.
- Para borradores, solo actualiza `document.client` si
  `updateDraftDocuments=true`.

## Documentos emitidos/bloqueados

Validado que al fusionar:

- No cambia `document.client`.
- No cambia `documentSnapshot.customer`.
- No cambia `issuer`.
- No cambia `items`.
- No cambia `number`.
- No cambia `date`.
- No cambia `notes`.
- No cambia `paymentTerms`.
- No cambia `rectification`.
- No cambia `documentSnapshot.snapshotHash`.
- No cambia `pdfSnapshot.contentHash`.
- Mantiene `documentLifecycle`, `integrityLock` y `deliveryStatus`.
- Puede actualizar `customerId` al maestro para busqueda/listado.

Documentos legacy con `status != "borrador"` se tratan como bloqueados aunque
no tengan snapshot.

## Borradores

Comportamiento seguro por defecto:

- `updateDraftDocuments=false`: no cambia `document.client`; puede actualizar
  `customerId` al maestro.

Comportamiento explicito:

- `updateDraftDocuments=true`: actualiza `document.client` y `customerId` al
  cliente maestro.

La UI de unificacion manual anade una opcion clara:

- "Actualizar tambien borradores"

Tambien avisa que los documentos emitidos conservaran el cliente original y sus
snapshots historicos.

## Busquedas y listados

Actualizado:

- `buildCustomerInvoicedTotals` cuenta documentos por `customerId` y aliases
  `mergedCustomerIds`.
- `customerInvoicedTotal` y `countDocumentsForCustomer` reconocen `customerId`.
- `findDocumentsForCustomer` encuentra documentos historicos asociados al
  maestro tras la fusion.

Esto permite que la ficha maestra vea documentos historicos fusionados aunque el
nombre/NIF visual del documento emitido siga siendo el original.

## Persistencia y backup

Validado:

- `normalizeLoadedData` conserva `customerId`.
- `normalizeLoadedData` conserva `mergedCustomerIds`.
- Exportar/importar backup conserva ambos campos.

## Pruebas de snapshot

Cubierto por tests:

- Factura emitida con `documentSnapshot.customer` no cambia tras merge.
- Factura emitida legacy sin snapshot no cambia `document.client`.
- Documento `issued/locked/not_sent` no cambia `document.client`.
- Presupuesto emitido no cambia `document.client`.
- Recibo emitido no cambia `document.client`.
- Borrador cambia `document.client` solo con `updateDraftDocuments=true`.
- Borrador no cambia `document.client` con `updateDraftDocuments=false`.
- `customerId` de emitidos apunta al maestro sin cambiar snapshot.
- `documentSnapshot.snapshotHash` no cambia tras merge.
- `pdfSnapshot.contentHash` no cambia tras merge.
- `customerId` se usa como referencia principal para evitar dobles conteos
  cuando el snapshot legacy coincide con otro cliente.

## Riesgos diferidos

- No se implementa deduplicacion inteligente por NIF.
- No se fusionan automaticamente importaciones PCF.
- No se protege todavia sync nube desde servidor.
- No hay auditoria servidor para fusiones.
- La busqueda historica depende de que el merge local aplique `customerId` a los
  documentos relacionados.

## Validaciones finales

Ejecutadas localmente:

- `npm run check:migrations`: OK. `Supabase migration convention check passed (3 migrations, 2 rollbacks).`
- `npm test`: OK. 86 archivos, 391 tests.
- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK. Next.js 15.5.19 compilado correctamente, 58 paginas estaticas generadas.
- `npm run test:phase1-acceptance`: OK. `Phase 1 acceptance checks passed.`
- `git diff --check`: OK.

Prueba focal previa:

- `npm test -- src/lib/document-integrity/customer-merge.test.ts src/lib/customers.test.ts src/lib/storage.test.ts src/lib/backup.test.ts`: OK. 4 archivos, 54 tests.

## Confirmaciones de entorno

- Commit funcional creado: 5e0ff3242f8a16fdd7efe0cd8c113cc3dae001a9.
- No se ha hecho deploy.
- No se ha promocionado Vercel.
- No se ha accedido a Supabase produccion.
- No se han aplicado migraciones.
