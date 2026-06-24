# Fase 2A.2 - Aceptacion tecnica de snapshots documentales

Estado: ACEPTADA LOCALMENTE / COMMIT FUNCIONAL CREADO
Rama: feat/phase2a2-document-snapshots
Fecha: 2026-06-24
Commit funcional: `16c8b66e8096cea39dcd93bad815d482df078a26`
Tests locales: 374

## Alcance validado

Fase 2A.2 se limita a:

- Tipos opcionales de snapshot documental y snapshot PDF.
- Helpers puros para construir, detectar, derivar y hashear snapshots.
- Captura de `documentSnapshot` y `pdfSnapshot` dentro de `issueDocument`.
- Hashes deterministas sobre contenido documental.
- Preservacion en `localStorage`, normalizacion y copias de seguridad.
- Compatibilidad con documentos legacy sin migracion masiva.
- Tests de regresion de integridad documental de Fase 2A.1.

Queda fuera de alcance:

- Fase 2A.3.
- `mergeCustomers`.
- Sincronizacion nube.
- Importador.
- Borrado y renumeracion.
- Renderer PDF historico estricto.
- VeriFactu servidor.
- Migraciones Supabase.
- Cambios de Vercel, despliegues o promocion de dominios.

## Archivos modificados

- `src/lib/types.ts`
- `src/lib/issuer-snapshot.ts`
- `src/lib/document-integrity/index.ts`
- `src/lib/document-integrity/snapshots.ts`
- `src/lib/document-integrity/snapshots.test.ts`
- `src/lib/document-integrity/share-flow.test.ts`
- `src/lib/storage.test.ts`
- `src/lib/backup.test.ts`
- `FASE2A2_ACCEPTANCE.md`

No hay migraciones Supabase nuevas. No hay cambios de Vercel. No se han modificado ficheros `.env`.

## Tipos añadidos

- `DocumentSnapshot`
- `DocumentPdfSnapshot`
- `LineItemSnapshot`
- `TaxSummarySnapshot`
- `TaxRateSummarySnapshot`
- `NumberingSnapshot`
- `FiscalContextSnapshot`
- `DocumentSnapshotSource`

Los campos `documentSnapshot` y `pdfSnapshot` son opcionales en `Document`, por lo que los documentos legacy siguen siendo compatibles.

## Helpers añadidos

- `buildDocumentSnapshot`
- `buildDocumentPdfSnapshot`
- `hasDocumentSnapshot`
- `getDocumentSnapshotSource`
- `deriveLegacySnapshotForReadOnly`
- `stableStringifySnapshot`
- `hashDocumentSnapshot`
- `hashDocumentPdfSnapshot`
- `documentKindForSnapshot`

`deriveLegacySnapshotForReadOnly` no persiste ni sobrescribe snapshots por defecto; si deriva un snapshot bajo demanda usa `source = "legacy_backfill"`.

## Campos capturados por documentSnapshot

El snapshot congela:

- `schemaVersion`
- `capturedAt`
- `source`
- `documentType`
- `documentKind`
- `number`
- `date`
- `dueDate`
- `issuer`
- `customer`
- `items`
- `taxSummary`
- `currency`
- `paymentTerms`
- `notes`
- `rectification`
- `numbering`
- `fiscalContext`
- `verifactu`, si ya existia en `Document`
- `snapshotHash`

No se inventan campos que el modelo actual no tenga:

- No se deriva IRPF de `profile.irpfPercent`.
- No se inventan descuentos.
- No se inventan motivos legales de exencion o no sujecion.
- `currency` queda fijado como `EUR`.
- `vatExempt` se captura solo desde el modelo existente.
- No se anade nueva logica funcional de impuestos no modelados.

## `snapshotHash`

Entra en `snapshotHash`:

- Numero.
- Fechas documentales.
- Emisor.
- Cliente.
- Lineas.
- Totales, IVA y desglose por tipos.
- Moneda.
- Notas.
- Forma de pago.
- Rectificacion.
- Numeracion.
- Contexto fiscal.
- VeriFactu si ya existia en el documento.

Queda fuera de `snapshotHash`:

- `capturedAt`.
- `source`.
- `snapshotHash`.
- `issuer.capturedAt`.
- IDs tecnicos de linea.
- `updatedAt`.
- `sentAt`.
- `paidAt`.
- `acceptedAt`.
- Campos operativos no documentales.

La serializacion estable ordena propiedades de objetos de forma determinista.

## `pdfSnapshot.contentHash`

El snapshot PDF congela:

- `schemaVersion`
- `renderedAt`
- `rendererVersion`
- `template`
- `contentHash`

`contentHash` no incluye `renderedAt`. No se guarda binario PDF, `pdfHash` ni `pdfStoragePath`. El renderer PDF historico estricto queda diferido a Fase 2A.5.

## `issueDocument`

Se ha revisado que:

- No muta el objeto recibido.
- Solo acepta borrador editable.
- Conserva numero, fecha, vencimiento, cliente, lineas, notas, forma de pago, rectificacion, VeriFactu e issuer existente.
- Captura issuer desde `profile` solo si falta.
- Crea `documentSnapshot`.
- Crea `pdfSnapshot`.
- Establece `documentLifecycle = "issued"`.
- Establece `integrityLock = "locked"`.
- Establece `deliveryStatus = "not_sent"`.
- No renumera.
- No toca contadores.
- No llama a VeriFactu servidor.
- No aplica migraciones.
- No reconstruye snapshots existentes si ya venian en el documento.

## Compatibilidad legacy

Validado:

- Documentos legacy emitidos sin snapshot siguen bloqueados.
- Documentos legacy borrador sin snapshot siguen editables.
- `hasDocumentSnapshot` y `getDocumentSnapshotSource` funcionan con snapshots presentes y ausentes.
- `deriveLegacySnapshotForReadOnly` deriva sin persistir.
- `normalizeLoadedData` no fabrica snapshots automaticamente para todos los documentos.

## Persistencia y backup

Validado:

- `saveData -> loadData` conserva `documentSnapshot` y `pdfSnapshot`.
- `normalizeLoadedData` conserva ambos snapshots.
- Exportar e importar backup conserva ambos snapshots.
- Campos desconocidos dentro de snapshots se conservan.
- Documentos sin snapshots siguen siendo validos.
- Tras recarga, un documento emitido con snapshot sigue bloqueado.
- Tras recarga, los hashes permanecen iguales.

## Proteccion frente a `updateDocument`

Se valida que `applyGenericDocumentUpdate` rechaza modificaciones genericas sobre documentos emitidos para:

- `documentSnapshot`
- `pdfSnapshot`
- `snapshotHash`
- `number`
- `client`
- `items`
- `issuer`
- `date`
- `dueDate`
- `notes`
- `paymentTerms`
- `rectification`

Tambien se valida que no modifican snapshots:

- `markDocumentSent`
- `markDocumentPaid`
- `acceptQuote`
- Reintentos de compartir.
- Operaciones repetidas idempotentes.

## PDF actual

Validado:

- La generacion PDF existente sigue funcionando.
- Documentos sin snapshot siguen pudiendo generar PDF.
- Documentos con snapshot no rompen PDF.
- La dependencia estricta del renderer sobre snapshots queda diferida.

## Regresion de Fase 2A.1

Cubierto por tests:

- Editar borrador permitido.
- Documento emitido bloqueado.
- Emitir no renumera.
- Compartir borrador emite primero.
- Fallo de envio conserva `issued/locked/not_sent`.
- Borrado de `issued/locked/not_sent` rechazado.

## Riesgos diferidos

- El PDF aun renderiza desde el documento actual, no exclusivamente desde snapshot historico.
- La sincronizacion nube todavia no aplica reglas servidor de integridad documental.
- Los documentos legacy no se migran masivamente; solo se derivan snapshots de lectura bajo demanda.
- VeriFactu servidor, idempotencia fiscal, cadena fiscal y transporte AEAT quedan para Fase 2B.
- Fusion de clientes y decision explicita sobre actualizacion de borradores queda pendiente.
- Borrado, renumeracion avanzada y anulaciones/rectificativas completas quedan fuera de esta fase.

## Validaciones finales

Resultados ejecutados localmente:

- `npm run check:migrations`: OK. `Supabase migration convention check passed (3 migrations, 2 rollbacks).`
- `npm test`: OK. `Test Files 85 passed (85)`, `Tests 374 passed (374)`.
- `npm run lint`: OK. `eslint` finalizo sin errores.
- `npx tsc --noEmit`: OK. Finalizo sin salida de error.
- `npm run build`: OK. Next.js 15.5.19 compilo correctamente y genero 58 paginas estaticas.
- `npm run test:phase1-acceptance`: OK. `Phase 1 acceptance checks passed.`
- `git diff --check`: OK. Sin salida de error.

Para `npm run test:phase1-acceptance` se levanto solo Supabase local y la app local; ambos servicios se detuvieron despues de la prueba.

## Confirmaciones de entorno

- Commit funcional creado: `16c8b66e8096cea39dcd93bad815d482df078a26`.
- No hay migraciones Supabase nuevas.
- No se ha hecho deploy.
- No se ha promocionado Vercel.
- No se ha accedido a Supabase produccion.
- No se han aplicado migraciones.
