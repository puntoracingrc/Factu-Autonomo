# PHASE2C51_SUPABASE_LOCAL_SYNC_HANDLER_HARNESS_OPT_IN_V1

Harness privado para ejecutar el handler con Supabase local inyectado, sin route publica operativa.

## Diseno

`src/lib/document-sync-integrity/route-supabase-local-harness.ts` crea un harness server-only que:

- recibe `client` o `service` inyectado;
- valida scope `SYNTHETIC_ONLY_*`;
- acepta solo `local_staging_only`;
- acepta solo `databaseTarget: "local"`;
- rechaza metadatos remotos;
- rechaza URL no localhost;
- usa el handler privado de 2C.50;
- mantiene datos sinteticos exclusivamente.

El core no lee env vars y no crea clientes. El script opt-in puede crear un cliente local solo cuando se activa explicitamente.

## Script opt-in

`scripts/phase2c51-supabase-local-sync-handler-harness.test.ts` queda skipped por defecto.

Para activarlo localmente:

- `PHASE2C51_SUPABASE_LOCAL_HANDLER_HARNESS=true`
- `PHASE2C51_SUPABASE_LOCAL_URL`
- `PHASE2C51_SUPABASE_LOCAL_ACCESS_KEY`

Si no hay entorno local disponible, la prueba queda skipped de forma segura.

## Alcance

- Sin produccion.
- Sin Supabase remoto.
- Sin staging remoto.
- Sin endpoint publico operativo.
- Sin documentos reales.
- Sin UI.
