# PHASE2C50_SYNC_ROUTE_HANDLER_DEPENDENCY_BOUNDARY_V1

Fase de extraccion de handler privado testable para `/api/document-sync`.

## Cambio

Se crea `src/lib/document-sync-integrity/route-handler.ts` como boundary server-only que recibe dependencias inyectadas:

- evaluador de flag privada;
- evaluador de ejecucion local;
- rate limiter in-memory;
- store de idempotencia in-memory;
- sink de telemetria in-memory;
- factory de auth context server-derived;
- factory de servicio de sync;
- requestId factory opcional.

La route HTTP queda como capa fina de `Request` a `NextResponse` y no contiene la logica de decision del flujo.

## Restricciones

- El handler no lee env vars.
- El handler no crea cliente Supabase.
- El handler no usa filesystem, red ni UI.
- El handler no devuelve echo de payload.
- El handler no registra logs por defecto.
- El body se lee de forma diferida: si la route esta disabled, no se consume.

## Evidencia

- `src/lib/document-sync-integrity/route-handler.test.ts` cubre disabled default, ejecucion local/fake, dependencias ausentes, auth/scope rechazado y fallo de servicio seguro.
- `src/app/api/document-sync/route.ts` conserva exports HTTP y delega en `createDocumentSyncRouteHandler`.

## Estado

Handler privado listo para pruebas locales/staging con dependencias inyectadas. No abre endpoint publico operativo y no cambia el default disabled.
