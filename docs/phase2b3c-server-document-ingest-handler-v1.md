# Fase 2B.3C - Service de ingest documental canonico v1

Fecha: 2026-06-24

Rama: `feat/phase2b3c-server-document-ingest-handler`

Estado: IMPLEMENTACION LOCAL / SERVICE SERVER-ONLY / SIN RUTA PUBLICA

Nombre interno: `PHASE2B3C_SERVER_DOCUMENT_INGEST_HANDLER_V1`

## 1. Objetivo

Crear la primera capa de ingest documental autenticado y controlado sobre el
repositorio de 2B.3A y el adapter Supabase de 2B.3B.

La fase prepara un service interno testeable para crear y actualizar borradores
canonicos. No expone endpoint publico, no crea UI, no implementa operacion
fiscal transaccional y no conecta con AEAT.

## 2. Decision de arquitectura

Se ha creado solo un application service:

```text
src/lib/server-documents/ingest.ts
```

No se ha creado:

```text
src/app/api/server-documents/ingest/route.ts
```

Motivo: aunque el proyecto ya tiene rutas autenticadas con Bearer token, esta
fase debe seguir siendo local/staging/controlada. Una ruta nueva quedaria
desplegable y usable por navegador si se publicara. Por prudencia, el endpoint
real queda diferido a 2B.3D, cuando se validen staging, auth, permisos y
respuesta segura de extremo a extremo.

## 3. Alcance implementado

Archivos:

- `src/lib/server-documents/ingest.ts`
- `src/lib/server-documents/ingest.test.ts`
- `src/lib/server-documents/index.ts`
- `docs/phase2b3c-server-document-ingest-handler-v1.md`

El service exporta:

- `ingestServerDocument`
- `SafeServerDocumentIngestResult`
- `ServerDocumentIngestContext`
- `ServerDocumentIngestRepository`

## 4. Autenticacion y user scope

`ingestServerDocument` recibe:

```text
authenticatedUserId
```

desde contexto servidor inyectado.

Reglas:

- si no hay `authenticatedUserId`, devuelve `unauthorized`;
- no lee `user_id` desde el body;
- no acepta `userId`, `plan`, `role`, `entitlement` ni permisos desde el body;
- siempre llama al repositorio con el usuario autenticado;
- el repositorio sigue aplicando scope y rechaza documento de otro usuario.

## 5. Inputs soportados

### 5.1 Crear borrador canonico

Accion:

```text
createDraft
```

Campos admitidos:

- `localDocumentId`
- `documentType`
- `documentKind`
- `statusLegacy`
- `payload`

### 5.2 Actualizar borrador canonico

Accion:

```text
updateDraft
```

Campos admitidos:

- `serverDocumentId`
- `expectedVersion`
- `payload`
- `statusLegacy`

Reglas:

- `expectedVersion` es obligatorio;
- `payload` debe ser objeto JSON valido;
- se rechazan campos protegidos como `documentSnapshot`, `pdfSnapshot`,
  `snapshotHash`, `pdfContentHash`, `documentLifecycle` e `integrityLock`;
- documentos `locked`, `issued` o `canceled` se rechazan mediante el repositorio.

## 6. Respuestas seguras

Las respuestas aceptadas devuelven solo metadatos:

- `status`
- `serverDocumentId`
- `localDocumentId`
- `version`
- `documentLifecycle`
- `integrityLock`
- `updatedAt`
- `versionId`

Las respuestas de conflicto devuelven:

- `status`
- `reason`
- `message`
- `conflictId`
- `serverDocumentId`
- `localDocumentId`

No se devuelve:

- `payload`;
- `documentSnapshot`;
- `pdfSnapshot`;
- `xml_payload`;
- respuestas crudas;
- mensajes internos de base de datos.

## 7. Tests

Se anade:

```text
src/lib/server-documents/ingest.test.ts
```

Cobertura:

- request `createDraft` valido -> `accepted`;
- body con `user_id` ajeno -> ignorado;
- request `updateDraft` valido con `expectedVersion` correcto -> `accepted`;
- update sin `expectedVersion` -> `rejected`;
- `expectedVersion` antiguo -> `conflict`;
- usuario A no modifica documento de usuario B;
- intento sobre `locked` -> `conflict`;
- intento sobre `issued` -> `conflict`;
- intento sobre `canceled` -> `conflict`;
- request con campos protegidos -> `rejected`;
- no autenticado -> `unauthorized`;
- input invalido -> `invalid_request`;
- error de store -> respuesta segura sin detalle interno.

Los tests usan repositorio real con store en memoria y un fake para errores de
store. No usan Supabase produccion ni nube real.

## 8. Limites

2B.3C no incluye:

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

## 9. Pendiente para 2B.3D

Siguiente paso posible, si se aprueba:

- crear route handler real para ingest documental;
- derivar `user_id` desde Bearer token usando el patron de auth servidor;
- inyectar cliente Supabase servidor autorizado;
- probar la ruta con mocks;
- mantener respuesta segura sin payloads/snapshots;
- probar contra Supabase local/staging, no produccion;
- decidir estrategia de despliegue para que la ruta no se active sobre datos
  reales antes de staging/baseline.

2B.3D debe seguir sin AEAT real, sin certificados reales, sin transporte AEAT y
sin operacion fiscal productiva salvo aprobacion expresa posterior.

## 10. Confirmaciones

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
