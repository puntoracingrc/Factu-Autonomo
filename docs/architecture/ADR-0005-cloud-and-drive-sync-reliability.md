# ADR-0005: Fiabilidad de la nube y Google Drive

- Estado: aceptado
- Versión: 1
- Fecha: 2026-07-14

## Contexto

La aplicación conserva datos locales y sincroniza cambios por entidad con la
nube de la cuenta. De forma opcional, el usuario puede guardar copias JSON en
su propio Google Drive. Son dos funciones distintas: la nube mantiene el estado
operativo entre dispositivos y Drive conserva copias recuperables.

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

1. Drive es una copia adicional, no una segunda base de datos ni una fuente de
   merge automático.
2. El permiso permanece limitado a `drive.file`. OAuth exige callback propio,
   `state` vigente, cuenta confirmada y origen permitido. El token temporal no
   se persiste fuera de la sesión del navegador.
3. Solo se declara una copia válida cuando la app relee el archivo recién
   creado y su contenido coincide exactamente con el JSON exportado.
4. La copia manual, automática y la creada al volver de OAuth comparten una
   exclusión mutua. No pueden generar dos archivos simultáneos desde la misma
   sesión.
5. Un fallo automático no actualiza `lastBackupAt` ni la firma de éxito y
   programa un reintento. Un timeout o token caducado queda visible y permite
   reconectar.
6. La retención se ejecuta después de verificar la copia nueva, solo sobre
   archivos JSON creados por la app dentro de su carpeta y con su prefijo. Un
   fallo de limpieza no invalida la copia verificada.

## Consecuencias

- La aplicación evita carreras entre sincronización manual y automática.
- Un dispositivo puede seguir trabajando offline sin perder su cola.
- Drive no puede mostrar una copia como válida basándose únicamente en la
  aceptación de la subida.
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

Una auditoría o refactor no puede retirar estas garantías sin una nueva decisión
de producto versionada.
