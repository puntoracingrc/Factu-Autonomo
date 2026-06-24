# Fase 2B.3D - Wiring server-only para ingest documental v1

Fecha: 2026-06-24

Rama: `feat/phase2b3d-server-document-ingest-wiring`

Estado: IMPLEMENTACION LOCAL / WIRING SERVER-ONLY / SIN RUTA PUBLICA

Nombre interno: `PHASE2B3D_SERVER_DOCUMENT_INGEST_WIRING_V1`

## 1. Objetivo

Preparar el wiring server-only para conectar, en una fase posterior, el service
`ingestServerDocument` con una ruta autenticada. Esta fase no expone endpoint
publico, no crea UI, no toca produccion y no implementa flujo fiscal.

## 2. Decision sobre ruta HTTP

No se ha creado ruta HTTP real.

No existe:

```text
src/app/api/server-documents/ingest/route.ts
```

Motivo: aunque el proyecto tiene patrones de route handlers autenticados, esta
pieza todavia no debe quedar desplegable como endpoint usable. Antes de exponer
una ruta hay que cerrar staging, contrato de auth, permisos, respuesta segura y
estrategia para no operar sobre documentos reales. La ruta queda diferida a
2B.3E.

## 3. Alcance implementado

Archivos:

- `src/lib/server-documents/server-factory.ts`
- `src/lib/server-documents/auth-context.ts`
- `src/lib/server-documents/safe-response.ts`
- `src/lib/server-documents/ingest-wiring.ts`
- `src/lib/server-documents/ingest-wiring.test.ts`
- `src/lib/server-documents/index.ts`
- `docs/phase2b3d-server-document-ingest-wiring-v1.md`

## 4. Factory server-only

Archivo:

```text
src/lib/server-documents/server-factory.ts
```

Funciones:

- `createServerDocumentStoreForServer(client)`
- `createServerDocumentRepositoryForServer(client, options)`

Reglas:

- recibe cliente Supabase/server inyectado;
- no crea cliente Supabase por si mismo;
- no lee variables de entorno;
- no lee `SUPABASE_SERVICE_ROLE_KEY`;
- no importa cliente Supabase de navegador;
- falla si se evalua en navegador.

## 5. Contrato de auth

Archivo:

```text
src/lib/server-documents/auth-context.ts
```

Funciones y tipos:

- `AuthenticatedServerDocumentContext`
- `authenticatedServerDocumentContext`
- `resolveAuthenticatedServerDocumentContext`
- `ServerDocumentAuthResolver`

Reglas:

- el usuario autenticado viene de un resolver servidor inyectado;
- no se acepta `user_id` del body;
- no se aceptan `role`, `plan`, `entitlement` ni permisos del body;
- si no hay usuario autenticado, devuelve `unauthorized`;
- se mantiene testeable sin red real.

## 6. Serializer seguro

Archivo:

```text
src/lib/server-documents/safe-response.ts
```

Funciones:

- `sanitizeServerDocumentIngestResult`
- `safeUnauthorizedResponse`
- `safeStoreErrorResponse`
- `safeRejectedResponse`

Solo expone:

- `status`
- `serverDocumentId`
- `localDocumentId`
- `version`
- `documentLifecycle`
- `integrityLock`
- `updatedAt`
- `versionId`
- `reason`
- `message`
- `conflictId`

No expone:

- `payload`;
- `documentSnapshot`;
- `pdfSnapshot`;
- `document_snapshot`;
- `pdf_snapshot`;
- XML;
- `responseBody`;
- errores internos de base de datos;
- secretos.

## 7. Wiring interno

Archivo:

```text
src/lib/server-documents/ingest-wiring.ts
```

Funcion:

```text
handleServerDocumentIngestForServer
```

Responsabilidades:

- resolver auth mediante `ServerDocumentAuthResolver`;
- devolver `unauthorized` sin tocar Supabase si no hay usuario;
- construir `ServerDocumentRepository` con cliente Supabase inyectado;
- ejecutar `ingestServerDocument`;
- sanear siempre la respuesta con `sanitizeServerDocumentIngestResult`.

## 8. Tests

Archivo:

```text
src/lib/server-documents/ingest-wiring.test.ts
```

Cobertura:

- factory crea repositorio con cliente inyectado;
- factory no toca el cliente hasta operar;
- factory no lee service role;
- auth context acepta usuario resuelto por servidor;
- auth context rechaza usuario ausente;
- auth context ignora `user_id` del body;
- safe response elimina `payload`;
- safe response elimina `documentSnapshot`;
- safe response elimina `pdfSnapshot`;
- safe response no filtra errores internos;
- wiring ejecuta ingest con factory, fake auth y fake Supabase;
- wiring sin auth devuelve `unauthorized` y no toca Supabase;
- wiring server-only no importa cliente Supabase de navegador.

Los tests usan fakes/mocks. No usan Supabase produccion ni red real.

## 9. Limites

2B.3D no incluye:

- ruta HTTP real;
- endpoint publico;
- UI;
- conexion de formularios reales;
- migraciones nuevas;
- Supabase produccion;
- AEAT real;
- certificados reales;
- VERI*FACTU funcional;
- operacion fiscal transaccional;
- insercion en `fiscal_records`;
- actualizacion de `fiscal_chain_state`;
- transporte AEAT;
- cambios de Vercel;
- cambios de dominios, aliases o DNS.

## 10. Pendiente para 2B.3E

Siguiente paso posible, si se aprueba:

- crear route handler real para ingest documental;
- derivar `user_id` desde Bearer token usando el patron de auth servidor;
- inyectar cliente Supabase servidor autorizado;
- cubrir la ruta con tests;
- mantener respuesta segura sin payloads/snapshots;
- probar contra Supabase local/staging, no produccion;
- decidir si la ruta debe permanecer desactivada por feature flag hasta staging.

2B.3E debe seguir sin AEAT real, sin certificados reales, sin transporte AEAT y
sin operacion fiscal productiva salvo aprobacion expresa posterior.

## 11. Confirmaciones

- No hay UI.
- No hay ruta HTTP real.
- No hay endpoint publico.
- No se toca Supabase produccion.
- No se inspecciona Supabase produccion.
- No se aplican migraciones a produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VERI*FACTU funcional.
- No hay operacion fiscal transaccional.
- No hay transporte AEAT.
- No se devuelven payloads ni snapshots.
- No hay service role en cliente.
- No se toca Vercel config.
- No hay promote.
- No se cambian dominios, aliases ni DNS.
- No se toca Stripe, precios ni planes.
- No se toca IA.
- No se tocan importadores.
- No se tocan facturas reales.
- No se toca numeracion real.
- No se tocan PDFs historicos.
