# Fase 2B.3A - Repositorio servidor de documentos v1

Fecha: 2026-06-24

Rama: `feat/phase2b3a-server-document-repository`

Estado: IMPLEMENTACION LOCAL / SERVER-ONLY / SIN ENDPOINTS PUBLICOS

Nombre interno: `PHASE2B3A_SERVER_DOCUMENT_REPOSITORY_V1`

## 1. Objetivo

Implementar la primera capa funcional server-only para documentos canonicos de
Fase 2B.3, sin exponer rutas publicas, sin UI, sin AEAT y sin operacion fiscal
transaccional.

Esta fase prepara reglas de dominio y un repositorio testeable para que una
fase posterior conecte, con mucho cuidado, el esquema `server_documents` creado
en 2B.2.

## 2. Alcance implementado

Se ha creado el modulo:

```text
src/lib/server-documents/
```

Archivos:

- `types.ts`
- `errors.ts`
- `guards.ts`
- `repository.ts`
- `repository.test.ts`
- `index.ts`

Tambien se ha creado este documento:

```text
docs/phase2b3a-server-document-repository-v1.md
```

## 3. Funciones principales

### 3.1 Tipos

Tipos principales:

- `ServerDocumentLifecycle`: `draft | issued | canceled`
- `ServerDocumentIntegrityLock`: `unlocked | locked`
- `ServerDocumentType`: `factura | presupuesto | recibo`
- `ServerDocumentRecord`
- `ServerDocumentCreateDraftInput`
- `ServerDocumentMutationInput`
- `ServerDocumentMutationDecision`
- `ServerDocumentConflictReason`
- `ServerDocumentVersionRecord`
- `ServerDocumentConflictRecord`

### 3.2 Errores

Errores tipados:

- `MISSING_EXPECTED_VERSION`
- `VERSION_MISMATCH`
- `DOCUMENT_LOCKED`
- `FORBIDDEN_LIFECYCLE_TRANSITION`
- `SNAPSHOT_MUTATION`
- `DOCUMENT_NOT_FOUND`
- `FORBIDDEN_USER_SCOPE`
- `DUPLICATE_LOCAL_DOCUMENT_ID`

Cada error mantiene un `reason` estable para decisiones `rejected` o
`conflict`.

### 3.3 Guards puros

Funciones principales:

- `isServerDocumentLocked`
- `isServerDocumentDraft`
- `assertExpectedVersion`
- `canMutateServerDocument`
- `detectForbiddenLifecycleDowngrade`
- `detectProtectedSnapshotMutation`
- `shouldCreateDocumentConflict`
- `buildDocumentConflictReason`

Reglas aplicadas:

- `integrityLock = locked` bloquea mutacion documental.
- `documentLifecycle != draft` se trata como bloqueado.
- Sin `expectedVersion` valido no hay update.
- Si `expectedVersion !== version`, se rechaza.
- No se permite `issued -> draft`.
- No se permite `canceled -> draft`.
- No se permite borrar o reemplazar `documentSnapshot` de bloqueados.
- No se permite borrar o reemplazar `pdfSnapshot` de bloqueados.
- No se permite cambiar `snapshotHash` de bloqueados.
- No se permite cambiar `pdfContentHash` de bloqueados.
- `statusLegacy` no prevalece sobre `documentLifecycle` e `integrityLock`.

### 3.4 Repositorio server-only

Clase:

```text
ServerDocumentRepository
```

El repositorio usa una interfaz inyectada:

```text
ServerDocumentRepositoryStore
```

Esto permite testear sin Supabase real y evita introducir service role o cliente
de navegador en esta fase.

Operaciones preparadas:

- leer por `id`;
- leer por `userId + localDocumentId`;
- crear borrador canonico;
- actualizar borrador;
- rechazar update sin version;
- registrar conflicto de version;
- registrar conflicto de documento bloqueado;
- registrar conflicto de `localDocumentId` duplicado;
- crear `server_document_versions`;
- impedir scope cruzado entre usuarios.

## 4. Tests cubiertos

Test especifico:

```text
npx vitest run src/lib/server-documents/repository.test.ts
```

Cobertura funcional:

- permite mutar draft/unlocked con `expectedVersion` correcto;
- rechaza draft con `expectedVersion` antiguo;
- rechaza update sin `expectedVersion`;
- rechaza `locked`;
- rechaza `issued` aunque `integrityLock` venga inconsistente;
- rechaza `issued -> draft`;
- rechaza `canceled -> draft`;
- detecta intento de borrar `documentSnapshot`;
- detecta intento de cambiar `snapshotHash`;
- detecta intento de cambiar `pdfSnapshot`;
- detecta intento de cambiar `pdfContentHash`;
- crea borrador y version inicial;
- actualiza borrador y crea version;
- registra conflicto por version antigua;
- registra conflicto por documento bloqueado;
- registra conflicto por `localDocumentId` duplicado;
- impide acceso de usuario A a documento de usuario B;
- mantiene errores tipados estables.

Resultado local inicial:

- 1 archivo de test.
- 19 tests.
- OK.

## 5. Limites

2B.3A no incluye:

- endpoint publico;
- ruta API;
- UI;
- conexion real a Supabase;
- RPC;
- service role;
- emision servidor;
- operacion fiscal transaccional;
- insercion funcional en `fiscal_records`;
- actualizacion funcional de `fiscal_chain_state`;
- transporte AEAT;
- certificados;
- produccion.

## 6. Pendiente para 2B.3B

Posibles siguientes pasos, si se aprueban:

- adaptar `ServerDocumentRepositoryStore` a Supabase server-only;
- validar Bearer token en ruta servidor;
- derivar `user_id` desde token;
- crear endpoint o RPC interno para ingest documental;
- tests de permisos/RLS contra Supabase local;
- tests de concurrencia con `expectedVersion`;
- registrar conflictos reales en `document_conflicts`;
- registrar versiones reales en `server_document_versions`.

2B.3B debe seguir sin AEAT real, sin certificados reales y sin produccion salvo
autorizacion explicita posterior.

## 7. Confirmaciones

- No hay endpoints.
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
