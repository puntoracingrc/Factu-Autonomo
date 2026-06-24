# Fase 2B.3B - Adapter Supabase server-only para documentos canonicos v1

Fecha: 2026-06-24

Rama: `feat/phase2b3b-server-document-supabase-adapter`

Estado: IMPLEMENTACION LOCAL / SERVER-ONLY / SIN ENDPOINTS PUBLICOS

Nombre interno: `PHASE2B3B_SERVER_DOCUMENT_SUPABASE_ADAPTER_V1`

## 1. Objetivo

Conectar el repositorio server-only creado en Fase 2B.3A con una capa
Supabase inyectada y testeable, limitada a las tablas locales/staging creadas
en Fase 2B.2:

- `server_documents`
- `server_document_versions`
- `document_conflicts`

Esta fase no expone ninguna ruta publica, no crea UI, no implementa operacion
fiscal transaccional y no conecta con AEAT.

## 2. Alcance implementado

Se anade:

```text
src/lib/server-documents/supabase-store.ts
src/lib/server-documents/supabase-store.test.ts
docs/phase2b3b-server-document-supabase-adapter-v1.md
```

Tambien se exporta el adapter desde:

```text
src/lib/server-documents/index.ts
```

## 3. Diseno server-only

El adapter `SupabaseServerDocumentStore` implementa la interfaz:

```text
ServerDocumentRepositoryStore
```

El cliente Supabase se recibe por inyeccion:

```text
new SupabaseServerDocumentStore(client)
```

La fase no importa `getSupabaseAdmin`, no lee variables de entorno, no crea un
cliente con service role y no introduce claves en codigo cliente.

El modulo incluye una guarda de carga en servidor: si se evalua en navegador,
lanza error. La proteccion principal sigue siendo arquitectonica: no hay
endpoint ni componente cliente que importe este adapter.

## 4. Operaciones soportadas

El adapter implementa:

- buscar documento por `id`;
- buscar documento por `user_id + local_document_id`;
- insertar borrador canonico en `server_documents`;
- actualizar documento con filtro `id + user_id`;
- insertar version en `server_document_versions`;
- insertar conflicto en `document_conflicts`.

La logica de decision no vive en el adapter. Sigue en:

```text
src/lib/server-documents/guards.ts
src/lib/server-documents/repository.ts
```

## 5. Mapping DB <-> dominio

Funciones puras anadidas:

- `mapServerDocumentRowToRecord`
- `mapServerDocumentRecordToInsert`
- `mapServerDocumentRecordToUpdate`
- `mapServerDocumentVersionToInsert`
- `mapDocumentConflictToInsert`
- `mapDomainConflictReasonToDbType`

El mapping convierte `snake_case` de base de datos a `camelCase` de dominio y
viceversa.

## 6. Conflictos

El dominio 2B.3A usa razones detalladas:

- `missing_expected_version`
- `version_mismatch`
- `locked_document`
- `forbidden_lifecycle_transition`
- `snapshot_mutation`
- `duplicate_local_document_id`
- `not_found`
- `forbidden_user_scope`

La tabla `document_conflicts` de 2B.2 tiene categorias mas generales. Por eso
2B.3B mapea de forma explicita:

- version -> `version`
- bloqueo/ciclo -> `integrity_lock`
- snapshots -> `snapshot`
- duplicado local -> `payload`
- no encontrado/scope -> `unknown`

No se cambia la migracion 2B.2.

## 7. Seguridad y datos sensibles

El adapter trabaja con datos completos porque es server-only:

- `payload`
- `document_snapshot`
- `pdf_snapshot`

No se anade ningun serializer publico ni endpoint que devuelva estos campos al
navegador. La exposicion limitada a cliente sigue dependiendo de las vistas
seguras y de las politicas creadas en Fase 2B.2.

## 8. Tests

Se anade:

```text
src/lib/server-documents/supabase-store.test.ts
```

Cobertura:

- fila DB -> dominio;
- dominio -> insert DB;
- update DB sin `id` ni `user_id` en payload;
- version DB con hashes y `changedFields`;
- mapping de razones de conflicto;
- `findDocumentById`;
- `findDocumentByLocalId` con scope `userId + localDocumentId`;
- insert de borrador con `draft`, `unlocked` y version 1;
- update con filtro `id + user_id`;
- insert en `server_document_versions`;
- insert en `document_conflicts`;
- traduccion de errores DB a `ServerDocumentStoreError`;
- update sin fila a `ServerDocumentError(DOCUMENT_NOT_FOUND)`.

Los tests usan cliente falso inyectado. No usan Supabase produccion ni una nube
real.

## 9. Limites

2B.3B no incluye:

- endpoint publico;
- ruta API usable por navegador;
- UI;
- validacion Bearer token;
- derivacion de `user_id` desde token;
- service role creado en el adapter;
- RPC;
- migraciones nuevas;
- operacion fiscal transaccional;
- insercion en `fiscal_records`;
- actualizacion de `fiscal_chain_state`;
- transporte AEAT;
- certificados;
- produccion.

## 10. Pendiente para 2B.3C

Siguiente paso posible, si se aprueba:

- disenar un endpoint server-only/controlado para ingest documental;
- derivar `user_id` desde Bearer token;
- inyectar cliente Supabase servidor autorizado;
- mantener RLS/GRANT/REVOKE como ultima defensa;
- anadir tests de endpoint sin exponer datos sensibles;
- probar contra Supabase local/staging, no produccion.

2B.3C debe seguir sin AEAT real, sin certificados reales, sin transporte AEAT y
sin operacion fiscal productiva salvo aprobacion expresa posterior.

## 11. Confirmaciones

- No hay endpoint publico.
- No hay UI.
- No se toca Supabase produccion.
- No se inspecciona Supabase produccion.
- No se aplican migraciones a produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VERI*FACTU funcional.
- No hay operacion fiscal transaccional.
- No hay transporte AEAT.
- No se toca Vercel config.
- No hay promote.
- No se cambian dominios, aliases ni DNS.
- No se toca Stripe, precios ni planes.
- No se toca IA.
- No se tocan importadores.
- No se tocan facturas reales.
- No se toca numeracion real.
- No se tocan PDFs historicos.
