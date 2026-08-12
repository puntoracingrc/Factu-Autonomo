# Auditoría de retirada de la sincronización genérica

- Fecha: 2026-08-12
- Alcance: runtime, datos Supabase, superficies de Cuenta y trabajo pendiente
- Decisión: retirar el transporte genérico; conservar autoridades y archivos

## Retirado

- `src/lib/cloud/repository.ts` y sus pruebas: lector, escritor y merge genérico.
- `src/lib/cloud/sync.ts` y `sync-queue.ts`: selección local/nube, reconstrucción
  completa de snapshots y la marca local de subida pendiente, ya sin consumidores.
- Escrituras nuevas de negocio en `meta.pendingChanges`.
- Fallback del buzón de gastos a `sync_entities`.
- Lecturas administrativas y recordatorios desde el almacén genérico.
- Reparación visual basada en reemplazar toda la copia cloud del navegador.
- Modal, guards y commits de snapshot usados exclusivamente por esa reparación.

`sync_entities` y `user_backups` no se borran. La migración los convierte en
`legacy_sync_entities_archive` y `legacy_user_backups_archive`, revoca el acceso
del navegador y deja lectura exclusiva a `service_role` para auditoría.
El despliegue aplica primero la preparación compatible, publica el runtime
central y solo entonces ejecuta el corte final, evitando una ventana en la que
la versión anterior encuentre sus tablas ya retiradas.

## Vigente e integrado

- Clientes, proveedores, productos, gastos, gastos recurrentes, recordatorios,
  perfil, presupuestos y recibos: `central_business_entities` y su outbox.
- Facturas, rectificativas, cobros y relaciones fiscales: autoridad central de
  facturas y su outbox.
- Notificaciones fiscales: `workspace_auxiliary_entities`, con CAS y RLS por
  propietario.
- Buzón de gastos: tablas dedicadas de alias, historial e items; sin fallback.
- Dispositivos, autenticación, exportación JSON y Google Drive: se conservan;
  son controles o copias, no una segunda fuente de verdad.
- Datos Gratis: continúan locales. La retirada del transporte genérico no los
  convierte en datos compartidos ni les concede nube.

## Útil, pero no debe mostrarse todavía

La retirada explícita de documentos de prueba conserva un buen modelo local de
previsualización, copia cifrada, historial y rollback. Su transporte era una
entidad genérica y ya no puede garantizar que dos dispositivos apliquen el
mismo lote. Se conserva el código y sus pruebas, pero se retira la tarjeta de
Cuenta hasta introducir un comando central atómico con versión esperada,
idempotencia, evento de salida y readback en todos los dispositivos.

El restore administrativo sigue siendo útil para inspección y creación de
copias. La aplicación de un restore debe permanecer bloqueada hasta diseñar una
operación central por tipo de entidad; no debe reinsertar snapshots en bloque.

El panel Admin ya lee autoridades centrales, pero su fallback de salud pagina
como máximo 10.000 filas por origen. Antes de crecer a miles de cuentas conviene
introducir una RPC agregada sobre las tablas centrales para que sus métricas no
sean parciales ni trasladen filas completas al runtime de Vercel.

## Histórico o documentación

Las migraciones, rollbacks, inventarios y ADR antiguos pueden mencionar
`sync_entities`: son evidencia del esquema anterior. No son dependencias del
runtime. Los tests de migraciones históricas se conservan para demostrar el
camino de actualización, mientras que las pruebas de aceptación vigentes deben
terminar contra las tablas centrales y los archivos fríos.

## Criterio para introducir piezas recuperables

1. Definir autoridad y aislamiento por `user_id`.
2. Añadir comando transaccional con versión e idempotencia.
3. Emitir evento ordenado para los demás dispositivos.
4. Aplicar localmente solo tras confirmación y readback.
5. Probar dos propietarios y al menos dos dispositivos con datos sintéticos.
6. Desplegar detrás del interruptor central existente; nunca reabrir el writer
   genérico como fallback.

## Pull requests abiertos

Inventario verificado contra GitHub el 12 de agosto de 2026:

| PR                                                 | Clasificación                                                                                          | Forma segura de introducirlo                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1065 Referencias fiscales fuertes                 | Útil y más reciente, pero está en borrador y detrás de `main`.                                         | Rebasar, separar normalización/referencias del resto y completar el fixture sintético de guardar, reabrir y borrar antes de publicarlo.               |
| #565 Extractores de embargo                        | Parcialmente útil y solapado con #1065 y con el extractor actual.                                      | No fusionar entero. Comparar sus fixtures y relaciones de embargo tras rebasar #1065; portar únicamente casos que sigan sin cobertura.                |
| #734 Borradores de Ajustes durante sync automático | Obsoleto como PR: depende del reemplazo automático de snapshots que se retira aquí.                    | Cerrar tras este corte. Si aparece una regresión de formularios, cubrir el borrador en estado de UI con una prueba independiente de transporte.       |
| #380 Contención del dominio Vercel antiguo         | Decisión de infraestructura todavía válida, no parte de sincronización.                                | Crear un PR nuevo y pequeño tras comprobar redirects de OAuth, PWA, Stripe y callbacks; no rebasar el PR antiguo completo.                            |
| #83 Resiliencia de almacenamiento local            | Sus ideas son útiles; la rama completa es una fundación experimental anterior a la durabilidad actual. | Recuperar solo clasificadores de corrupción y tests que complementen `app-data-durability`; no incorporar sus 60 archivos ni otro adaptador paralelo. |
| #51 Centro de contenidos VIDA                      | Producto editorial opcional, sin relación con la aplicación operativa.                                 | Introducir únicamente con decisión de producto, revisión editorial/legal y medición de peso SEO; de otro modo cerrar.                                 |
| #31 Estudios de precio y verticales                | Investigación útil, especialmente el guard de precios de proveedor.                                    | Extraer requisitos pequeños hacia la fase Productos 6A; archivar los documentos largos sin convertirlos en runtime.                                   |
| #28 Estudio de captación                           | Documentación de negocio, no código pendiente.                                                         | Conservar fuera del camino crítico o fusionar solo como documentación tras una revisión editorial.                                                    |
| #15 Monitor regulatorio                            | La implementación actual de vigilancia fiscal lo ha superado en gran parte.                            | Comparar su checklist de fuentes con Fiscal Watch y portar solo ausencias demostrables.                                                               |

Los PR automáticos #1068 (`nanoid`), #1067 (`js-yaml`), #843 (Next 15.5.21)
y #826 (`fast-xml-parser`) están limpios y con CI verde. Deben entrar de uno en
uno después de este corte; Next debe ser el último y repetir build y smoke de
producción por su mayor superficie.

## Worktrees y almacenamiento

Hay 292 worktrees registrados: 288 asociados a ramas y 4 detached. No deben
interpretarse como 292 cambios pendientes ni borrarse en masa. La limpieza debe
hacerse en una tarea separada, agrupando primero por PR fusionado/cerrado,
comprobando `git status`, ascendencia respecto a `origin/main` y ausencia de
procesos. Este cambio solo retirará su propio worktree cuando haya sido
fusionado, desplegado y verificado.
