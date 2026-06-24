# FASE 2A.1 - Aceptacion tecnica

Estado: ACEPTADA LOCALMENTE / COMMIT FUNCIONAL CREADO

Rama: `feat/phase2a1-document-issue-lock`

Fecha: 2026-06-24

Restricciones cumplidas:

- No se ha empezado Fase 2A.2.
- Se ha creado el commit funcional de Fase 2A.1.
- No se ha hecho deploy.
- No se ha promocionado Vercel.
- No se ha accedido a Supabase produccion.
- No se han aplicado migraciones nuevas.

## 1. Estado de rama

- Rama actual: `feat/phase2a1-document-issue-lock`.
- `HEAD`: `17f95c4`.
- `origin/main`: `f8e898e`.
- La rama contiene `origin/main`: si.
- `FASE2_PLAN.md` ya esta commiteado por separado en `17f95c4 docs: define phase 2 document integrity plan`.
- Commit funcional: `b672bec27de7562e2177f2031b3571d003958b0e feat(documents): add issuance and integrity locking`.
- Este informe queda para commit documental separado.

## 2. Archivos modificados

- `src/lib/types.ts`
- `src/lib/document-integrity/index.ts`
- `src/lib/document-integrity/index.test.ts`
- `src/lib/document-integrity/share-flow.ts`
- `src/lib/document-integrity/share-flow.test.ts`
- `src/context/AppStore.tsx`
- `src/components/documents/DocumentShareActions.tsx`
- `src/components/documents/DocumentList.tsx`
- `src/components/forms/DocumentForm.tsx`
- `src/lib/documents.ts`
- `src/lib/income.ts`
- `src/lib/quotes.ts`
- `src/lib/rectificativas.ts`
- `src/lib/rectificativas.test.ts`
- `src/lib/storage.test.ts`
- `src/lib/backup.test.ts`
- `FASE2A1_ACCEPTANCE.md`

## 3. Invariantes verificadas

- Documento legacy con `status !== "borrador"` queda bloqueado aunque no tenga campos nuevos.
- `integrityLock = "unlocked"` no desbloquea documentos legacy no borrador.
- `documentLifecycle = "issued"` o `"canceled"` bloquea aunque `status = "borrador"`.
- `integrityLock = "locked"` bloquea aunque `documentLifecycle = "draft"`.
- `updateDocument` deriva el bloqueo desde el documento persistido, no desde el payload entrante.
- Payload manipulado que intenta volver `issued` a `draft` queda rechazado.
- `issueDocument` no renumera ni consume contadores.
- `issueDocument` conserva contenido documental y solo anade campos de emision/bloqueo.
- `markDocumentSent`, `markDocumentPaid` y `acceptQuote` no cambian contenido protegido.
- Operaciones repetidas de envio, cobro y aceptacion son estables: conservan `sentAt`, `paidAt` y `acceptedAt` originales.

## 4. Matriz de contradicciones

Caso | Resultado
--- | ---
`status != "borrador"` + `integrityLock = "unlocked"` | Bloqueado
`documentLifecycle = "issued"` + `status = "borrador"` | Bloqueado
`documentLifecycle = "canceled"` | Bloqueado
`integrityLock = "locked"` + `documentLifecycle = "draft"` | Bloqueado
Payload nuevo intenta `issued -> draft` | Rechazado
Documento legacy sin campos nuevos y `status = "pagado"` | Bloqueado

## 5. Issue document

Verificado:

- No muta el objeto recibido.
- Solo acepta borrador editable.
- Rechaza segunda emision.
- Rechaza numero vacio o `BORRADOR`.
- Conserva `number`, `client`, `items`, `date`, `dueDate`, `notes`, `paymentTerms`, `rectification` y `verifactu`.
- Captura `issuer` con el mecanismo actual solo si falta.
- Conserva el `issuer` existente si ya estaba capturado.
- Establece:
  - `documentLifecycle = "issued"`
  - `integrityLock = "locked"`
  - `deliveryStatus = "not_sent"`
  - `issuedAt` ISO valido
  - `status = "enviado"` como compatibilidad UI

Decision de compatibilidad:

- Un documento emitido pendiente de envio conserva `status = "enviado"` para no romper flujos legacy que dependen de `status !== "borrador"`.
- La UI muestra `Emitido` cuando detecta `documentLifecycle = "issued"` + `deliveryStatus = "not_sent"`.

## 6. Emitido pendiente de envio y borrado

Correccion aplicada durante aceptacion:

- `getDeletePolicy` ahora usa `isDocumentIntegrityLocked`.
- Un documento `issued/locked/not_sent` no puede borrarse aunque su estado legacy fuera ambiguo.
- La guarda cubre tambien presupuestos y recibos bloqueados, sin redisenar cancelaciones, huecos ni recibos.

Test anadido:

- Emitir borrador.
- Intentar borrar antes de enviar.
- Politica rechaza borrado.
- Numero y resto de documentos quedan intactos.

## 7. Rutas de mutacion

Revisado:

- `updateDocument` consulta el documento ya persistido.
- `updateDocument` no confia en `documentLifecycle` ni `integrityLock` del payload nuevo.
- `markDocumentSent`, `markDocumentPaid` y `acceptQuote` usan rutas dedicadas.
- Las rutas dedicadas solo cambian campos operativos, fechas operativas y `updatedAt`.
- `DocumentForm` captura `DocumentIntegrityError` y muestra mensaje comprensible en lugar de romper pantalla.

Campos protegidos comparados antes/despues en tests:

- `id`
- `type`
- `number`
- `date`
- `dueDate`
- `client`
- `items`
- `issuer`
- `notes`
- `paymentTerms`
- `rectification`
- `rectifiedById`
- `verifactu`
- `sourceDocumentId`
- `receiptDocumentId`

## 8. Flujo de compartir

Orden verificado:

1. `issueDocument`
2. persistencia del documento emitido en store
3. uso del documento emitido devuelto para PDF/email/WhatsApp
4. efecto externo de compartir
5. `markDocumentSent` si procede

Casos cubiertos:

- Si falla persistir/emision, no se ejecuta el envio.
- Si falla el envio externo, queda `issued + locked + not_sent`.
- El error no revierte a borrador.
- El reintento usa el mismo numero.
- El reintento no vuelve a emitir.
- El envio usa el objeto emitido, no la prop antigua.
- Dos intentos rapidos no crean dos emisiones en el flujo testeado.

## 9. Persistencia tras recarga

Verificado:

- `saveData -> loadData` conserva:
  - `documentLifecycle`
  - `integrityLock`
  - `deliveryStatus`
  - `paymentStatus`
  - `acceptanceStatus`
  - `issuedAt`
  - `sentAt`
  - `paidAt`
  - `acceptedAt`
- `normalizeLoadedData` conserva campos nuevos.
- Backup exportado con `createBackupBlob` e importado con `parseBackupJson` conserva campos nuevos.
- Tras recarga/import normal, `isDocumentIntegrityLocked` sigue devolviendo bloqueo.

## 10. UX y errores

Verificado:

- La lista muestra `Emitido` para `issued + not_sent`.
- `isDocumentEditable` usa `isDocumentIntegrityLocked`.
- La vista de detalle no abre formulario editable para documentos bloqueados.
- `DocumentIntegrityError` se captura en `DocumentForm` y muestra aviso legible.
- Acciones de envio/cobro/aceptacion quedan separadas del reemplazo generico.

## 11. Riesgos diferidos

Fuera de alcance y pendiente para 2A.2-2A.5 / 2B:

- `mergeCustomers` todavia puede modificar snapshots legacy; se difiere a 2A.3.
- `unmarkAsCollected` todavia conserva logica legacy de recibos automaticos y renumeracion; se difiere a 2A.4.
- `deleteDocument` sigue usando la politica actual y renumeracion para borradores permitidos; redisenar huecos/cancelaciones queda para 2A.4.
- Importador y reimportacion siguen fuera de este cambio; se difiere.
- Backups antiguos siguen sin politica de conflicto nueva; solo se garantiza que campos nuevos no se pierden en round-trip normal.
- Sync nube y conflictos multi-dispositivo siguen pendientes para 2B.
- PDF historico y snapshots completos siguen pendientes para 2A.2/2A.5.
- Endpoint VeriFactu y registro fiscal atomico siguen pendientes para 2B.

## 12. Validacion final

Comando | Resultado
--- | ---
`npm run check:migrations` | OK. `Supabase migration convention check passed (3 migrations, 2 rollbacks).`
`npm test` | OK. `84 passed (84)`, `343 passed (343)`.
`npm run lint` | OK.
`npx tsc --noEmit` | OK.
`npm run build` | OK. Next.js compilo correctamente y genero `58/58` paginas estaticas.
`npm run test:phase1-acceptance` | OK. `Phase 1 acceptance checks passed.`
`git diff --check` | OK.

Nota de ejecucion:

- `test:phase1-acceptance` se ejecuto con Supabase local y app local en `127.0.0.1:3000`.
- Se usaron variables locales/dummy para el webhook Stripe de la suite.
- Supabase local y Next local quedaron parados al terminar.
- No se uso produccion, no se accedio a Supabase produccion y no se aplicaron migraciones nuevas.
