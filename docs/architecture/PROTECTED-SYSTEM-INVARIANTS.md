# Registro obligatorio de sistemas blindados

## Lectura obligatoria

Este documento se debe leer al iniciar cualquier task con intención de editar
este repositorio. El `AGENTS.md` de la raíz impone esta lectura de forma
automática; no depende de que el usuario recuerde indicarla en cada chat.

Los contratos enumerados aquí son decisiones de producto versionadas. Ningún
refactor, auditoría, migración o endurecimiento puede debilitarlos,
reinterpretarlos o eliminarlos sin autorización expresa del propietario del
producto y un cambio versionado en el ADR correspondiente.

Sí se permiten sin una nueva autorización semántica las correcciones que
mantengan o aumenten las garantías, la observabilidad sin datos sensibles y las
actualizaciones de seguridad compatibles. Deben revisar el ADR aplicable,
respetar `CODEOWNERS` y ejecutar sus pruebas de contrato.

## Sistemas protegidos

### 1. Históricos importados aceptados

Contrato: [ADR-0001](ADR-0001-historical-imported-documents.md).

- `legacy_imported + user_attested` es un registro histórico válido, congelado
  y utilizable en impuestos y rentabilidad.
- No se le exigen ni fabrican snapshots, sellos o evidencia VeriFactu moderna.
- Nunca se reclasifica por fecha ni por carecer de datos exigidos actualmente.
- Evidencia moderna realmente inválida sigue bloqueada y nunca se degrada a
  legacy.

Regresiones mínimas: `legacy-import-governance.test.ts`,
`legacy-import-attestation.test.ts` y las pruebas de consumidores/persistencia
del histórico importado.

### 2. Recuperación de documentos emitidos por la app

Contrato: [ADR-0002](ADR-0002-app-issued-document-recovery.md).

- Un documento `app_issued` mantiene integridad fail-closed.
- La recuperación es explícita, reversible, versionada y nunca reclasifica el
  documento como legacy ni fabrica un sello de emisión.
- Snapshots, PDF, hashes, sellos y evidencia VeriFactu existentes se conservan
  byte-semánticamente.

Regresiones mínimas: `app-issued-recovery-protection.test.ts`,
`app-issued-recovery-governance.test.ts` y
`app-issued-recovery-consumers-persistence.test.ts`.

### 3. Retirada explícita de documentos de prueba

Contrato: [ADR-0003](ADR-0003-explicit-test-document-retirement.md).

- No relaja el borrado de documentos emitidos ni permite reutilizar su
  numeración.
- Exige selección en ejecución, preview, copia vigente, precondición fresca y
  confirmación tipada.
- Es reversible, conserva la evidencia byte-semánticamente y no sirve para
  retirar operaciones fiscales reales.

Regresiones mínimas: `test-document-retirement-governance.test.ts`,
`test-document-retirement-command.test.ts` y
`test-document-retirement-persistence.test.ts`.

### 4. Buzón de gastos por email

Contrato: [ADR-0004](ADR-0004-expense-inbox-email-reliability.md).

- El webhook público solo acepta Resend con firma Svix válida y límites
  estrictos; sus fallos transitorios mantienen el reintento.
- La descarga de adjuntos solo usa destinos oficiales permitidos, sin
  redirecciones ni exposición de secretos o datos personales en logs.
- Los replays son idempotentes. Regenerar el correo activa un alias nuevo y
  retira para siempre el anterior.
- Guardar o descartar cierra la entrada; una copia fallida a la empresa nunca
  convierte un fallo parcial en éxito silencioso.

Regresiones mínimas: `expense-inbox-reliability-contract.test.ts`,
`expense-inbox-copy.test.ts` y `expense-inbox-download.test.ts`.

### 5. Sincronización de nube y copias de Google Drive

Contrato: [ADR-0005](ADR-0005-cloud-and-drive-sync-reliability.md).

- La nube de Factu es el estado operativo sincronizado. Drive es una copia JSON
  adicional y nunca sustituye ni confirma el estado vivo.
- Subir, descargar, mezclar y reparar comparten exclusión mutua liberada en
  `finally`; un fallo conserva la cola local y permite reintentar.
- Aislamiento por usuario, CAS e integridad fiscal continúan fail-closed.
- Drive usa `drive.file`, compara por readback exacto antes de confirmar y solo
  después aplica retención. Manual, automático y callback no se solapan.

Regresiones mínimas: `cloud-drive-sync-reliability-contract.test.ts`,
`sync-operation.test.ts`, `sync-queue.test.ts`, `repository.test.ts`,
`google-drive/operation.test.ts` y `google-drive/backup.test.ts`.

### 6. Maestro de clientes y vínculos documentales

Contrato: [ADR-0006](ADR-0006-customer-master-reliability.md).

- El blindaje es interno y no añade fricción, permisos ni pasos al usuario.
- NIF contradictorios nunca se unen por nombre; cada escritura valida contra la
  colección vigente y el alta desde documentos no deja duplicados o fantasmas.
- Búsqueda, orden y carga por tramos cubren toda la colección sin omisiones.
- Editar, borrar o fusionar el maestro conserva byte-semánticamente el cliente
  congelado, snapshots, PDF, sellos, hashes y evidencia de documentos emitidos.

Regresiones mínimas: `customer-master-reliability-contract.test.ts`,
`customers.test.ts`, `customer-document-links.test.ts`,
`document-integrity/customer-merge.test.ts`, `master-record-deletion.test.ts`,
`cloud/diff.test.ts`, `cloud/sync.test.ts` y `backup.test.ts`.

## Prohibido sin autorización expresa

- Debilitar el fail-closed de documentos nuevos emitidos por la app.
- Reclasificar históricos aceptados como documentos modernos o fabricarles
  sellos, snapshots o evidencia VeriFactu.
- Saltarse el tenant, mezclar usuarios, exponer secretos o usar datos reales en
  fixtures y logs.
- Limpiar una cola de sincronización antes de confirmar la escritura o hacer de
  Drive la fuente operativa de verdad.
- Omitir la firma del buzón, aceptar un alias retirado o responder éxito cuando
  una operación obligatoria quedó incompleta.
- Unir clientes con NIF contradictorios, reescribir el cliente congelado de un
  documento emitido o convertir el blindaje interno en fricción para el usuario.
- Borrar, renumerar o alterar evidencia fiscal existente para hacer pasar una
  validación.

## Procedimiento para cualquier task nuevo

1. Leer este registro y el ADR correspondiente antes de editar.
2. Inspeccionar `CODEOWNERS` y los tests de contrato del sistema afectado.
3. Mantener o aumentar las garantías. Si el objetivo exige cambiar su
   semántica, detener ese cambio concreto y obtener autorización expresa.
4. Ejecutar las regresiones indicadas y las validaciones proporcionales antes
   de publicar.
5. Actualizar este registro, el ADR, `CODEOWNERS` y sus tests cuando se blinde un
   sistema nuevo.

`src/lib/protected-system-invariants-contract.test.ts` hace fallar CI si esta
lectura deja de estar enlazada desde la raíz, si falta alguno de los seis ADR o
si el registro deja de estar protegido por `CODEOWNERS`.
