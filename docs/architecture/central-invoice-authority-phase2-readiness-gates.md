# Autoridad central de facturas: puertas de fase 2

Marcador: `CENTRAL_INVOICE_AUTHORITY_PHASE2_READINESS_GATES_V1`

Estado: bloqueo operativo vigente. No habilita tablas centrales ni rutas de
emision.

## Objetivo

Esta fase prepara el cambio sin romper la web actual. La nube existente,
`sync_entities`, Drive y la reparacion V10 siguen intactos. La autoridad central
solo podra recibir una migracion aditiva cuando estas puertas esten cerradas con
evidencia verificable.

## Puertas obligatorias sin PITR

1. Reconciliar el historial real de Supabase con Git.
2. Confirmar que toda version visible en produccion existe como migracion
   versionada o como baseline aceptado.
3. Ejecutar una copia recuperable y un ensayo de restauracion en un proyecto
   aislado.
4. Mantener `CENTRAL_INVOICE_AUTHORITY_MODE=off` durante la migracion inicial.
5. Registrar aprobacion humana para aplicar la migracion de produccion.

PITR mejora la recuperacion, pero no bloquea esta arquitectura. Lo que si
bloquea es no poder demostrar una restauracion satisfactoria.

## Bloqueos actuales

- Baseline de produccion no reconciliado con Git.
- Backup restaurable no verificado.
- Ensayo de restauracion aislado no realizado.
- Aprobacion de migracion productiva no registrada.

## Lo permitido ahora

- Inventario de solo lectura de tablas, funciones, policies y migraciones.
- Preparar scripts y consultas de verificacion.
- Restaurar una copia en un entorno aislado.
- Disenar la migracion aditiva central sin ejecutarla.

## Lo prohibido ahora

- Aplicar `central_invoice_*` en produccion.
- Activar `shadow`, `canary` o `required` en produccion.
- Convertir Drive en fuente operativa de verdad.
- Renumerar, borrar o reemitir facturas existentes para cuadrar una validacion.
