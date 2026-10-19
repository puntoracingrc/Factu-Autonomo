# 2E.10 Storage resilience acceptance

Marker: `PHASE2E10_STORAGE_RESILIENCE_ACCEPTANCE_V1`

Estado: acceptance local / sintetico / sin almacenamiento real.

## Casos cubiertos

1. Adapter disabled bloquea read/write/delete.
2. Adapter in-memory opera con clave sintetica.
3. Clave no sintetica se rechaza.
4. Write dry-run requiere backup-before-write.
5. JSON invalido se clasifica como corrupcion bloqueada.
6. Shape legacy parcial requiere review manual.
7. Safe report no contiene payload.
8. Audit events no contienen payload.
9. No hay acceso a `window` ni storage real del navegador.
10. No hay dependencia de filesystem en el modulo runtime.
11. No hay Supabase.
12. No hay UI, rutas ni navegacion.

## Resultado esperado

`PHASE2E10_STORAGE_RESILIENCE_ACCEPTANCE_V1: OK` cuando el script pasa.
