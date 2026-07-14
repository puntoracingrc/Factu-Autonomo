# ADR-0003 — Retirada explícita y reversible de documentos de prueba

- Estado: aceptada
- Versión: 1
- Fecha: 2026-07-14
- Ámbito: documentos emitidos de Factu creados exclusivamente durante pruebas

## Contexto

Los documentos emitidos se protegen de forma fail-closed y no se eliminan con
el flujo ordinario. Esa regla sigue siendo correcta para operaciones reales,
pero durante el desarrollo pueden quedar facturas o recibos de prueba dentro de
un workspace sincronizado. Activar el borrado genérico, identificar una cuenta
por email en el código o modificar directamente la nube convertiría una
necesidad puntual en una puerta de pérdida fiscal.

## Decisión

Factu ofrece un flujo separado de **retirada de pruebas**. La operación quita
los documentos seleccionados del conjunto activo, pero guarda un lote completo
y reversible dentro de `AppData`. No reclasifica documentos, no corrige su
contenido y no fabrica integridad.

El flujo solo se habilita en la sesión propietaria confirmada, fuera de demo,
con el handoff resuelto y la nube sincronizada sin cambios pendientes. La
identidad del tenant se liga mediante una huella opaca; nunca mediante un email,
NIF, ID o número codificado en el repositorio.

## Invariantes

1. La selección es explícita por identificadores resueltos en el workspace
   vigente. No existe detección automática por fecha, serie, importe o ausencia
   de evidencia.
2. Antes de aplicar se muestra el alcance exacto, se generan los bytes de una
   copia JSON fechada, se solicita su descarga y se revalida sin un salto
   asíncrono la huella del tenant, del workspace y del plan. El evento guarda
   SHA-256 y tamaño de esos bytes; no afirma que el sistema operativo haya
   terminado de escribir el archivo.
3. La confirmación declara que los documentos son pruebas y exige una frase
   derivada del número de documentos y de la huella de la selección.
4. El commit es atómico y durable. Ante `blocked` o `indeterminate` no se
   publica memoria, no se navega y no se afirma que la retirada se completó.
5. El lote conserva cada documento completo y su índice original, los
   documentos relacionados antes/después, orden, huellas, prueba de copia y
   eventos append-only `applied | rolled_back`.
6. Solo puede eliminarse `receiptDocumentId` de una factura superviviente si el
   recibo retirado es su única pareja recíproca. Cualquier otra referencia,
   gasto, recordatorio, rectificativa o relación ambigua bloquea el lote.
7. No se reducen contadores ni secuencias y no cambia el contenido documental.
   La normalización puede elevar el suelo de numeración hasta una identidad ya
   reservada. Las identidades retiradas quedan reservadas para siempre, incluso
   tras rollback o ante un registro de auditoría parcialmente dañado.
8. Snapshots, PDF snapshots, sellos, hashes, importes, estado, timestamps y
   artefactos VeriFactu se preservan byte-semánticamente dentro del archivo.
9. `server_confirmed`, un registro `registered`, entorno de producción o
   contexto VeriFactu de producción bloquean. Un artefacto local de TEST puede
   archivarse sin elevarlo a acreditación ni afirmar un envío a la AEAT.
10. El archivo es monotónico para los clientes compatibles en storage, cloud,
    copias y restauraciones. Solo el rollback explícito del lote cambia su
    proyección a restaurado.

## Rollback

El rollback exige la misma identidad opaca del tenant, una nueva copia de
seguridad, confirmación tipada y la huella after exacta. Restaura documentos,
orden y backlinks desde las copias del lote. Si existe una colisión, una
modificación posterior del alcance o un evento divergente, se bloquea sin
mutar. El lote permanece como historial con un nuevo evento append-only.

## Nube, copias y numeración

Los lotes viajan como una entidad de sincronización propia. Sus eventos solo
pueden extender un prefijo válido y no se admiten tombstones del archivo. La
operación no borra ni reescribe en cloud las filas de documentos y backlinks:
el lote es un overlay autoritativo para los clientes compatibles. Aplicar o
revertir escribe únicamente esa fila mediante insert único o update
condicional sobre la cabeza anterior, con readback exacto. Así una carrera se
bloquea sin exponer los documentos a una escritura parcial.

Las descargas incrementales incluyen siempre el lote. Un cliente antiguo puede
seguir mostrando las filas documentales subyacentes hasta actualizarse, pero
no conoce la entidad nueva y no participa en su transición. Al cargar con una
versión compatible se vuelve a proyectar `applied` o `rolled_back` desde el
archivo, se detectan divergencias byte-semánticas y se bloquea el rollback ante
una colisión posterior.

Las copias JSON incluyen el archivo. Restaurar una copia que lo suprima o lo
retroceda queda bloqueado: la vuelta al estado anterior se realiza con el
rollback del lote. El cálculo de los siguientes números considera también las
identidades reservadas.

La precondición single-row evita carreras entre clientes compatibles, pero no
convierte la RLS de owner en una frontera contra una sesión autenticada
comprometida: esa sesión ya podía escribir sus propias entidades de sync. Si el
producto necesitara inmutabilidad de base de datos frente a esa amenaza, deberá
añadirse una RPC transaccional y un trigger mediante una migración versionada;
esta ADR no atribuye esa garantía al navegador.

## Gobernanza

Esta política no puede ampliarse a operaciones reales ni convertirse en un
borrado general mediante una auditoría, refactor o mejora de UX. Cualquier
cambio exige una decisión explícita de producto, una nueva versión del contrato
y una migración auditable con pruebas de storage, cloud, backups, numeración,
integridad documental y VeriFactu.
