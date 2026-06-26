# PHASE2C1_SYNC_SURFACE_AUDIT_V1

Fecha: 2026-06-26
Estado: inventario tecnico para base server-only de sincronizacion segura
Alcance: documentos y datos relacionados con persistencia local, backup, sync incremental y `server_documents`

## Objetivo

Auditar las superficies actuales o futuras de sincronizacion documental antes de introducir adaptadores reales. Esta fase no conecta nada a produccion, no abre endpoints nuevos y no modifica flujos de usuario.

## Fuentes actuales de persistencia local

- `src/lib/storage.ts`: carga y guardado de `AppData` en `localStorage` con clave `factura-autonomo-data`; normaliza perfil, clientes, recordatorios, documentos, counters y metadatos.
- `src/lib/types.ts`: define `AppData`, `Document`, `DocumentSnapshot`, `DocumentPdfSnapshot`, estados documentales, cola `pendingChanges` y tipos de entidad sincronizable.
- `src/lib/document-integrity/**`: define emision, bloqueo, snapshots congelados, fuente de PDF historico, bloqueo de borrado y proteccion de legacy no borrador.
- `src/lib/documents.ts` y `src/lib/numbering.ts`: calculan numeracion y renumeracion, con protecciones ya existentes para documentos emitidos/bloqueados.
- `src/lib/backup.ts`: exporta e importa copia JSON local, delegando normalizacion en `normalizeLoadedData`.

## Puntos de carga, importacion y exportacion

- Carga local: `loadData()` lee `localStorage`, parsea JSON y normaliza con `normalizeLoadedData()`.
- Guardado local: `saveData()` escribe el objeto completo en `localStorage` y evita sobrescribir datos existentes con un estado vacio accidental.
- Backup manual: `createBackupBlob()`, `downloadBackup()` y `readBackupFile()` exportan o restauran copia completa de aplicacion.
- Importadores externos: existen superficies de importacion en `src/lib/importers/**` y rutas/experiencia de importacion ya implementadas, pero 2C no las toca.
- Sync incremental actual: `src/lib/cloud/diff.ts`, `src/lib/cloud/incremental.ts`, `src/lib/cloud/sync.ts` y `src/lib/cloud/sync-queue.ts` calculan cambios, colas y seleccion de datos mas recientes.

## Modulos de storage/localStorage

- `factura-autonomo-data`: copia local completa de aplicacion.
- `factura-autonomo-sync-pending`: bandera local de cambios pendientes en `src/lib/cloud/sync-queue.ts`.
- Metadatos `AppMeta`: `lastModified`, `lastSyncedAt` y `pendingChanges`.
- El diff local opera con payloads completos por entidad; por eso la futura frontera servidor debe decidir con hashes/resumen seguro y no con respuestas tipo registro completo.

## Relacion con `server_documents`

- `src/lib/server-documents/types.ts` modela `ServerDocumentRecord`, versionado, conflictos y decisiones de mutacion.
- `src/lib/server-documents/guards.ts` ya protege version esperada, documento bloqueado, ciclo no borrador y mutacion de snapshots en documentos protegidos.
- `src/lib/server-documents/safe-response.ts` limita respuestas a claves seguras.
- `src/lib/server-documents/ingest.ts` admite crear/actualizar borradores con usuario derivado del servidor.
- La ruta existente `src/app/api/server-documents/ingest/route.ts` permanece fuera de alcance en 2C. Esta fase solo prepara una politica pura que puede ser usada por adaptadores futuros.

## Riesgos de sync nube

- Sobrescritura de documentos emitidos o bloqueados desde una copia local antigua.
- Perdida de hashes congelados si una restauracion local trae campos obsoletos.
- Cambio de numeracion ya emitida durante una reconciliacion.
- Conflictos de version cuando hay varios dispositivos con cambios pendientes.
- Confianza indebida en `userId`, scope o estado procedente del payload del navegador.
- Respuestas demasiado amplias que devuelvan cuerpos completos en errores, conflictos o auditoria tecnica.
- Mezcla de backup completo legacy con entidades incrementales.

## Riesgos legacy

- Documentos antiguos pueden no tener `documentLifecycle` o `integrityLock`; si `status !== "borrador"`, deben tratarse como protegidos.
- Backups antiguos pueden traer snapshots parciales o ausentes; la politica debe permitir conservar referencias, pero no sobrescribir hashes ya existentes.
- Counters y numeracion historica no deben recalcularse desde sync sin una regla explicita posterior.
- Datos importados antes de los bloqueos actuales pueden tener estados mixtos; se recomienda resolverlos mediante adaptador local/staging antes de cualquier sync real.

## Que NO se toca todavia

- No hay sync real de documentos.
- No hay endpoint publico nuevo.
- No hay UI.
- No hay migraciones.
- No hay mutacion de documentos reales.
- No hay cambios de facturacion, PDF historico, pagos, importadores, configuracion de despliegue ni integracion fiscal externa.
- No se toca produccion ni staging remoto.

## Recomendaciones para 2C.2-2C.6

- 2C.2 debe definir una politica server-only pura con decisiones `accepted`, `rejected`, `conflict` y `noop`.
- 2C.3 debe planificar mutaciones en modo dry-run, sin persistir y sin mutar objetos de entrada.
- 2C.4 debe centralizar versionado y conflicto con campos seguros.
- 2C.5 debe producir eventos tecnicos in-memory redactados y sin tabla nueva.
- 2C.6 debe cerrar la base como lista para adaptadores local/staging, dejando claro que produccion y sync real quedan fuera.
