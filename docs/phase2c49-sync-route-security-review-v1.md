# PHASE2C49_SYNC_ROUTE_SECURITY_REVIEW_V1

Revision tecnica interna de la route shell `/api/document-sync` tras 2C.37-2C.48 y antes de cualquier diseno de staging privado.

## Superficie revisada

- Route HTTP deshabilitada por defecto mediante flag privada server-only.
- Modo fake/local solo con `local_staging_only` y flags privadas.
- Envelope seguro con limite de tamano, profundidad y rechazo de cuerpos sensibles.
- Rate limit, requestId e idempotencia in-memory.
- Telemetria in-memory redactada y no persistente.
- Fake adapter como modo principal de route shell.
- Sin endpoint publico operativo, sin Supabase remoto y sin documentos reales.

## Riesgos principales

- Habilitacion accidental fuera de local/staging.
- Payload abuse por cuerpos grandes, anidados o con snapshots.
- Intento de suplantar user/scope desde payload.
- Replay de apply por reintentos no idempotentes.
- Flooding de origen sintetico.
- Uso indebido de metodos HTTP o CORS.
- Fugas en logs, telemetria o errores.
- Conexion accidental a Supabase no local.

## Controles existentes

- 2C.31-2C.36: shell disabled by default, auth context no operativo y envelope seguro.
- 2C.37-2C.48: fake adapter in-memory, boundary local/fake, abuso/payload, rate limit, idempotencia, method/content/cache, telemetria segura y acceptance local.
- 2C.50-2C.54: handler privado con dependencias inyectadas, harness Supabase local opt-in, paridad, matriz auth/scope y failure injection.

## Gaps antes de staging privado

- Revisar politica de activacion con aprobacion humana separada.
- Disenar un proveedor auth real server-derived sin aceptar identidad del payload.
- Definir observabilidad privada sin payload completo.
- Definir harness de staging privado sin abrir endpoint publico.
- Auditoria externa de scope, replay y fallos operativos.

## Criterios de salida

- La route HTTP sigue disabled by default.
- Fake adapter sigue siendo default.
- Supabase local queda opt-in y con cliente inyectado.
- No se usa produccion, Supabase remoto, UI ni documentos reales.
- Toda evidencia es tecnica interna local/staging y no declara cumplimiento cerrado.
