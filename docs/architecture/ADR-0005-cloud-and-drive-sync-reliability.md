# ADR-0005: Fiabilidad de la nube y Google Drive

- Estado: aceptado
- Versión: 6
- Fecha: 2026-07-20

## Contexto

La aplicación conserva datos locales y sincroniza cambios por entidad con la
nube de la cuenta. De forma opcional, el usuario puede guardar copias JSON y
originales fiscales seleccionados expresamente en su propio Google Drive. Son
funciones distintas: la nube mantiene el estado operativo entre dispositivos y
Drive conserva archivos bajo custodia del usuario.

Los disparadores automáticos, el botón manual, el regreso a una pestaña y la
descarga completa pueden coincidir. También puede haber timeouts, cortes de red,
tokens caducados o respuestas aceptadas sin una lectura posterior del archivo.
Un estado visual «sincronizado» no es suficiente para confirmar durabilidad.

## Decisión

### Nube de la cuenta

1. Toda secuencia de subida, descarga, combinación o reemplazo usa una única
   operación exclusiva por cliente. Una segunda ejecución no empieza mientras
   la anterior siga activa.
2. El bloqueo se libera siempre con `finally`, incluso si falla autorización,
   construcción de cambios, red, Supabase, CAS, normalización o publicación en
   memoria.
3. Los cambios pendientes se conservan hasta que la escritura remota haya sido
   confirmada y el estado local haya incorporado el resultado. Un fallo nunca
   se presenta como sincronizado ni vacía silenciosamente la cola.
4. Antes de descargar se intenta subir la cola local. Si no se puede confirmar,
   la descarga no pisa esos cambios. La descarga completa sigue siendo una
   acción explícita del usuario.
5. Los cambios recibidos se normalizan y combinan mediante los contratos por
   entidad existentes. Integridad documental, tenant, expedientes fiscales y
   overlays monotónicos permanecen fail-closed.
6. **Reparar con la copia de la nube** es un reemplazo autoritativo separado de
   la sincronización ordinaria. Pausa inmediatamente las subidas automáticas,
   solicita primero una copia cifrada del estado local y no sube la cola local
   antes del pull completo.
7. La reparación solo publica el snapshot cloud en memoria y limpia el marcador
   pendiente después de que el almacenamiento local confirme escritura y
   readback exacto. Un fallo, una precondición obsoleta o un estado durable
   indeterminado conserva los datos anteriores y mantiene la nube en pausa.
8. Restaurar una copia JSON con sesión iniciada pausa la sincronización antes
   del commit local. El contenido restaurado no se sube automáticamente: el
   usuario debe revisarlo y elegir expresamente guardarlo en su cuenta.

### Copias en Google Drive

1. Drive es un archivo adicional bajo custodia del usuario, no una segunda base
   de datos ni una fuente de merge automático o de verdad fiscal.
2. El permiso permanece limitado a `drive.file`. OAuth exige callback propio,
   `state` vigente, cuenta confirmada y origen permitido. El token temporal no
   se persiste fuera de la sesión del navegador.
3. Solo se declara una copia válida cuando la app relee el archivo recién
   creado y su contenido coincide exactamente con el JSON exportado.
4. La copia manual, automática, la creada al volver de OAuth y el archivado de
   originales fiscales comparten una exclusión mutua. No pueden generar dos
   archivos simultáneos desde la misma sesión.
5. Un fallo automático no actualiza `lastBackupAt` ni la firma de éxito y
   programa un reintento. Un timeout o token caducado queda visible y permite
   reconectar.
6. La retención se ejecuta después de verificar la copia nueva, solo sobre
   archivos JSON creados por la app dentro de su carpeta y con su prefijo. Un
   fallo de limpieza no invalida la copia verificada.

### Guardado de los escáneres en Factu

1. Guardar una ficha de Notificaciones o un gasto escaneado persiste únicamente
   sus datos estructurados en Factu. Ninguno de los dos flujos consulta, conecta
   ni sube un original a Google Drive antes o después del commit.
2. El alta de Notificaciones construye la transición sobre el `AppData` vigente
   en el instante del clic. No reutiliza la precondición de identidad capturada
   antes del análisis ni compara de nuevo toda la cuenta contra una referencia
   antigua. Conserva owner scope, validación estructural, proyección privada,
   protección anti-vaciado, límites de almacenamiento y readback de la escritura.
3. Un estado durable indeterminado continúa bloqueando nuevas escrituras. Una
   escritura real fallida, cuota agotada, serialización inválida, storage no
   disponible o readback distinto nunca se convierte en éxito.
4. El gasto escaneado toma el estado vigente al guardar y no mantiene una espera
   asíncrona de Drive entre la revisión y el commit. El buzón solo se cierra
   después de confirmar la ficha en Factu.
5. El PDF o imagen original vive únicamente en memoria durante el análisis y se
   descarta al terminar. La huella SHA-256 sigue impidiendo duplicar una ficha,
   pero volver a seleccionar un documento registrado no ofrece archivarlo.

### Originales archivados anteriormente en Drive

1. Se retira la creación de nuevos originales de Notificaciones y Gastos desde
   los escáneres. La preferencia histórica de originales de gastos deja de
   mostrarse y no se consulta durante el guardado.
2. Los recibos `driveArchives` y `originalArchive` ya persistidos se conservan
   byte-semánticamente. El cambio no borra, mueve ni reescribe archivos del
   usuario y tampoco elimina los helpers de lectura verificada necesarios para
   abrir o exportar originales anteriores.
3. El detalle puede seguir abriendo un original histórico por su ID opaco. Una
   exportación relee y verifica política, carpeta, procedencia, MIME, tamaño y
   SHA-256 antes de incluirlo; un fallo bloquea el paquete completo.
4. Eliminar una ficha conserva Drive por omisión. Para un original histórico
   exclusivo, la elección separada de enviarlo a la papelera mantiene las
   comprobaciones de ID, política y SHA-256, usa `trashed: true`, relee el estado
   y restaura el archivo si falla después la eliminación local.
5. Las copias JSON manuales o automáticas de la cuenta en Drive siguen siendo
   una función independiente y no cambian por esta decisión.

## Consecuencias

- La aplicación evita carreras entre sincronización manual y automática.
- Un dispositivo puede seguir trabajando offline sin perder su cola.
- Una reparación no puede sobrescribir la nube con el estado atascado que
  pretende sustituir ni declarar éxito antes del guardado local verificado.
- Una restauración histórica queda local hasta una decisión explícita, evitando
  que un temporizador anterior la publique como estado vigente de la cuenta.
- Drive no puede mostrar una copia como válida basándose únicamente en la
  aceptación de la subida.
- Guardar desde los escáneres no espera a Drive ni vuelve a comparar toda la
  cuenta contra una referencia capturada antes del análisis.
- Factu conserva la ficha o el gasto estructurado, pero no el original; los
  archivos archivados en Drive antes de V5 permanecen bajo custodia del usuario.
- Borrar una ficha y retirar su original son decisiones independientes; la
  segunda es reversible desde la papelera de Drive y nunca afecta a archivos
  ajenos o compartidos.
- Ningún mecanismo puede prometer disponibilidad absoluta de proveedores
  externos, pero los fallos quedan acotados, observables y reintentables.

## Regresiones obligatorias

Los cambios en nube, AppStore, almacenamiento, Supabase, Drive, OAuth o copias
deben superar:

- `src/lib/cloud-drive-sync-reliability-contract.test.ts`
- `src/lib/app-data-durability.test.ts`
- `src/lib/fiscal-notifications/structured-review-save-command.v1.test.ts`
- `src/components/fiscal-notifications/FiscalNotificationIntakeView.test.tsx`
- `src/lib/cloud/sync-operation.test.ts`
- `src/lib/cloud/sync-queue.test.ts`
- `src/lib/cloud/repository.test.ts`
- `src/lib/google-drive/operation.test.ts`
- `src/lib/google-drive/backup.test.ts`
- `src/lib/google-drive/fiscal-notification-original-archive.v1.test.ts`
- `src/lib/google-drive/fiscal-notification-original-delete.v1.test.ts`
- `src/lib/google-drive/expense-original-archive.v1.test.ts`
- `src/lib/google-drive/expense-original-download.v1.test.ts`
- `src/lib/google-drive/expense-original-archive-client.test.ts`
- `src/lib/expense-original-archive-persistence.test.ts`
- `src/app/api/expense-inbox/[id]/original/route.test.ts`
- `src/lib/fiscal-notifications/drive-original-archive.v1.test.ts`
- `src/lib/fiscal-notifications/drive-original-archive-command.v1.test.ts`

Una auditoría o refactor no puede retirar estas garantías sin una nueva decisión
de producto versionada.
