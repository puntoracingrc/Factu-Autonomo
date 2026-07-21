# ADR-0005: Fiabilidad de la nube y Google Drive

- Estado: aceptado
- Versión: 10
- Fecha: 2026-07-21

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
9. Una divergencia determinista entre las cabezas fiscales local y remota es un
   estado terminal revisable, no un fallo transitorio. Conserva la cola y el
   marcador local, persiste únicamente su código saneado y detiene los
   reintentos automáticos de esa cuenta en ese navegador.
10. La UI identifica ese estado como `fiscal_workspace_diverged`, explica que
    ninguna de las dos cabezas fiscales ha sido sobrescrita y sustituye el
    reintento inútil por un acceso a la resolución en Cuenta. Un timeout,
    desconexión u otro fallo transitorio mantiene el reintento ordinario.
11. La única resolución disponible en V10 es conservar la nube mediante
    **Reparar con la copia de la nube**: solicita una copia cifrada local, hace
    pull completo sin push previo y solo limpia el conflicto después del commit
    durable y readback exacto. Conservar el dispositivo o combinar historiales
    requieren una transición fiscal versionada, CAS remoto, copias de ambas
    cabezas y confirmación explícita; no se simulan con un upsert forzado.
12. La observabilidad distingue profundidad de cola, cantidad y modo de subida,
    presencia de expediente fiscal, conteos por tipo de entidad y comparación
    de marcas temporales. Nunca incluye IDs, payloads ni contenido fiscal.
13. Una reparación fija la identidad y generación de autenticación que la
    inició. Cerrar sesión, cambiar de cuenta, renovar a otra sesión o desmontar
    el proveedor invalida la operación; se revalida después de la copia, tras
    cada lectura remota y justo antes del reemplazo durable. Una operación
    invalidada no reemplaza datos ni limpia cola o conflicto.
    El preflight de plan/dispositivo y las subidas o descargas ordinarias usan
    la misma generación y no publican ni limpian resultados de una sesión
    obsoleta.
14. El código de revisión se coordina entre pestañas del mismo navegador por un
    evento de almacenamiento filtrado por cuenta. La recepción del bloqueo
    corta también los timers de la otra pestaña e incrementa una generación que
    invalida operaciones anteriores incluso si el issue vuelve después a
    `null`. La retirada solo ocurre tras una reparación durable o un borrado
    explícito del dispositivo; antes de desbloquear, la otra pestaña exige un
    snapshot compartido sin cola, flag ni timestamp pendiente. La adopción es
    solo en memoria y vuelve a comparar tanto el estado durable como la
    referencia vigente y su último baseline durable en la pestaña; nunca
    reescribe el almacenamiento. Una edición concurrente o aún no persistida
    mantiene el conflicto en pausa.
15. Antes de ofrecer el reemplazo, la reparación hace una lectura completa y
    solo informativa de ambos estados. Muestra fecha y hora registradas,
    revisión del expediente fiscal y recuentos separados de clientes,
    documentos, gastos, maestros y Notificaciones. Fechas y cantidades son
    pistas para el usuario: nunca prueban equivalencia, deduplican, confirman
    relaciones ni autorizan por sí solas una reducción.
16. Toda categoría con menos elementos en la nube queda destacada y exige una
    aceptación explícita adicional; las reducciones documentales o fiscales se
    identifican como protegidas. Un snapshot que no se pueda clasificar de
    forma cerrada, una cuenta fiscal no verificable o un `ownerScope` distinto
    bloquean la reparación sin reemplazo.
17. La vista previa queda ligada a huellas exactas de negocio local y cloud y a
    las generaciones vigentes de sesión y revisión. Al confirmar se revalida el
    estado local durable, se solicita la copia cifrada y se vuelve a leer la
    nube completa. Si cualquiera de las dos huellas cambió, no se reemplaza,
    no se limpia cola ni conflicto y el usuario debe comparar de nuevo.
18. La descarga web acredita el JSON exacto y que el navegador recibió la
    solicitud, no que el sistema operativo terminara de escribirlo. La UI
    muestra el nombre `factu-autonomo-backup-antes-restaurar-…json` y aclara que
    debe buscarse en Descargas o en la carpeta configurada en el navegador.

### Planes y dispositivos de nube

1. Gratis conserva los datos solo en el navegador actual y no crea registros
   de dispositivo cloud. Sus protecciones son la copia manual y, de forma
   opcional, Google Drive; ninguna de las dos convierte el JSON en estado vivo.
2. Pro admite hasta 2 dispositivos activos y Pro+ hasta 5. La prueba Pro usa
   provisionalmente el límite de 2. Un cambio de plan se aplica en servidor y
   nunca amplía el límite por información aportada por el navegador.
3. Cada navegador genera un token aleatorio local. El servidor solo conserva
   su SHA-256, nombre corto, tipo aproximado y marcas de actividad; no persiste
   IP, user-agent completo, NIF ni fingerprint de hardware.
4. Alta, listado y revocación pasan por API autenticada con email confirmado.
   La tabla es privada al servidor. Si se pierde un dispositivo, una sesión
   nueva puede listar los dispositivos de la cuenta, revocar el perdido y
   reclamar la plaza liberada.
5. Las policies de `sync_entities` y `user_backups` exigen a la vez propietario,
   plan con nube y token de dispositivo activo. La comprobación se realiza en
   Supabase para que un cliente manipulado no pueda saltarse el límite visual.
6. El alta se serializa por usuario en base de datos. Dos navegadores que
   intenten ocupar la última plaza a la vez no pueden superar el límite.
7. Si un downgrade deja más dispositivos registrados que plazas, solo los más
   recientes dentro del límite pueden sincronizar. Los demás siguen visibles
   para su revocación, pero toda lectura o escritura cloud queda bloqueada.
8. Un rechazo de plan, token o límite se trata como fallo de sincronización:
   mantiene la cola local, no confirma estado remoto y permite reintentar tras
   liberar una plaza o recuperar el plan.
9. «Cerrar y borrar este dispositivo» confirma primero la subida pendiente y
   revoca su plaza antes de cerrar una sesión con nube. Si cualquiera de esas
   operaciones falla, no borra los datos locales. En Gratis omite esas
   precondiciones remotas y elimina también el token local del navegador.
10. Cada operación cloud renueva una concesión exclusiva de 2 minutos entre el
    token del dispositivo y el `session_id` verificado de Supabase. Ambos se
    persisten solo como SHA-256 con dominios separados; no se guarda el
    identificador de sesión en claro, IP, user-agent completo ni fingerprint.
11. Las pestañas de una misma sesión comparten concesión. Una sesión distinta
    que reutilice el mismo token no obtiene acceso cloud mientras la concesión
    siga viva. El rechazo solo pausa la nube, conserva íntegra la cola local y
    se reintenta cuando la sesión propietaria cierre o venza el plazo.
12. El cierre de sesión ordinario intenta liberar su concesión antes de
    invalidar el JWT, sin revocar la plaza ni borrar el token del dispositivo.
    Si el navegador desaparece sin cerrar sesión, el vencimiento acotado evita
    un bloqueo permanente. El despliegue de esta exigencia usa primero una
    ventana de compatibilidad versionada y la cierra con una migración separada
    una vez que el cliente capaz de reclamar concesiones está en producción.

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
- El usuario ve qué categorías aumentan o disminuyen y las fechas registradas
  antes de conservar la nube; una vista previa antigua no puede autorizar un
  snapshot distinto, aunque sus recuentos coincidan.
- Una restauración histórica queda local hasta una decisión explícita, evitando
  que un temporizador anterior la publique como estado vigente de la cuenta.
- Una divergencia fiscal no genera reintentos periódicos ni aparenta ser un
  error reparable con el mismo botón; ambos historiales quedan intactos hasta
  una resolución explícita y verificable.
- Cerrar sesión o cambiar de cuenta durante una reparación no puede publicar el
  snapshot de la sesión anterior, y una segunda pestaña no puede continuar
  reintentando un conflicto ya detectado en el mismo navegador.
- Gratis no depende de la nube de Factu y Pro/Pro+ aplican sus límites de 2/5
  dispositivos también en las policies de almacenamiento.
- Perder un dispositivo no bloquea la cuenta: el usuario puede revocarlo desde
  una sesión nueva sin que esta sincronice antes de obtener una plaza.
- Copiar el token local no permite sincronizar simultáneamente desde otra
  sesión; las pestañas normales no consumen plazas adicionales y un cierre
  inesperado solo retiene la concesión durante un máximo de 2 minutos.
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
- `src/lib/cloud/auth-operation-guard.test.ts`
- `src/lib/cloud/device-repair.test.ts`
- `src/lib/cloud/device-repair-preview.test.ts`
- `src/components/cloud/CloudRepairPreviewModal.test.tsx`
- `src/lib/cloud/sync-errors.test.ts`
- `src/lib/cloud/sync-queue.test.ts`
- `src/lib/cloud/sync-review-storage.test.ts`
- `src/lib/cloud/sync-review-operation-guard.test.ts`
- `src/lib/cloud/persisted-snapshot-adoption.test.ts`
- `src/lib/cloud/repository.test.ts`
- `src/lib/cloud/devices.test.ts`
- `src/lib/cloud/device-client.test.ts`
- `src/lib/cloud/device-token.test.ts`
- `src/lib/cloud/device-policy-contract.test.ts`
- `src/lib/billing/server-auth.test.ts`
- `src/app/api/cloud/devices/session/route.test.ts`
- `src/lib/supabase-rls-table-audit.test.ts`
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
