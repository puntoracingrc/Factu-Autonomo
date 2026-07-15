# ADR-0005: Fiabilidad de la nube y Google Drive

- Estado: aceptado
- Versión: 3
- Fecha: 2026-07-16

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

### Originales fiscales en el Drive del usuario

1. El archivado es voluntario y requiere un clic explícito por PDF. Conectar
   Drive, seleccionar un archivo o reconocer un duplicado nunca inicia por sí
   solo una subida.
2. Factu analiza el PDF localmente y no lo incorpora a sus datos persistidos.
   Tras un archivado verificado solo conserva `fileId`, `documentIds`, SHA-256,
   identificadores opacos de Drive, fecha documental, versión, revisión humana,
   estado y fecha de archivado. No conserva nombre local, ruta, bytes, texto,
   token ni enlace entregado por Google.
3. La carpeta creada por la app es `Factu - documentos oficiales`. El destino
   se deriva únicamente de una fecha documental exacta: `AAAA/MM`. Cuando no
   existe esa fecha, se usa `Fecha pendiente`; la fecha de selección, escaneo o
   archivado nunca decide la carpeta.
4. La huella se calcula antes de la subida y el archivo remoto se relee después.
   Solo `SHA256_READBACK_MATCH` permite registrar el original como archivado.
   Una respuesta aceptada, un identificador remoto o una comparación por nombre
   no bastan.
5. Los archivos y carpetas se crean con `drive.file`. La huella y la política
   versionada se añaden como `appProperties` para recuperar idempotentemente el
   mismo archivo si Drive aceptó la subida pero falló el commit local posterior.
   Antes de reutilizarlo se vuelve a comprobar el contenido remoto.
6. Si un PDF ya está registrado pero carece de archivo verificado, volver a
   seleccionarlo ofrece «Archivar original en Drive». Si ya está archivado, se
   rechaza como duplicado. Los escaneos históricos deben reseleccionarse porque
   Factu no conserva sus originales.
7. El detalle distingue si existe un original verificado en Drive. Abrir o
   descargar navega al archivo del usuario; Factu no actúa como proxy ni usa el
   PDF remoto para alterar automáticamente deudas, pagos, plazos o asientos.
8. La papelera de una ficha nunca modifica Drive por omisión. Si esa ficha es la
   única vinculada a un original verificado, la confirmación pregunta de forma
   separada si el usuario quiere conservarlo o enviarlo también a la papelera
   de Google Drive. Un original compartido por varias fichas no ofrece esa
   acción remota.
9. La retirada remota exige otro clic explícito, el mismo bloqueo exclusivo y
   comprobar `fileId`, PDF, política administrada y SHA-256 mediante
   `appProperties`. Solo se usa `trashed: true`, nunca un borrado permanente. Se
   relee el estado remoto y, si después falla el borrado durable de la ficha,
   se intenta restaurar el original con `trashed: false` y otra relectura.

## Consecuencias

- La aplicación evita carreras entre sincronización manual y automática.
- Un dispositivo puede seguir trabajando offline sin perder su cola.
- Drive no puede mostrar una copia como válida basándose únicamente en la
  aceptación de la subida.
- Un usuario puede archivar y recuperar sus originales sin que Factu custodie
  el PDF ni use la fecha de escaneo como fecha documental.
- Borrar una ficha y retirar su original son decisiones independientes; la
  segunda es reversible desde la papelera de Drive y nunca afecta a archivos
  ajenos o compartidos.
- Ningún mecanismo puede prometer disponibilidad absoluta de proveedores
  externos, pero los fallos quedan acotados, observables y reintentables.

## Regresiones obligatorias

Los cambios en nube, AppStore, almacenamiento, Supabase, Drive, OAuth o copias
deben superar:

- `src/lib/cloud-drive-sync-reliability-contract.test.ts`
- `src/lib/cloud/sync-operation.test.ts`
- `src/lib/cloud/sync-queue.test.ts`
- `src/lib/cloud/repository.test.ts`
- `src/lib/google-drive/operation.test.ts`
- `src/lib/google-drive/backup.test.ts`
- `src/lib/google-drive/fiscal-notification-original-archive.v1.test.ts`
- `src/lib/google-drive/fiscal-notification-original-delete.v1.test.ts`
- `src/lib/fiscal-notifications/drive-original-archive.v1.test.ts`
- `src/lib/fiscal-notifications/drive-original-archive-command.v1.test.ts`

Una auditoría o refactor no puede retirar estas garantías sin una nueva decisión
de producto versionada.
