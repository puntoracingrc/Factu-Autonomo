# Fase 2B.3 - Plan ingest servidor de documentos v1

Fecha: 2026-06-24

Rama: `docs/phase2b3-server-document-ingest-plan`

Estado: PLAN DOCUMENTAL / SIN IMPLEMENTACION FUNCIONAL

Nombre interno: `PHASE2B3_SERVER_DOCUMENT_INGEST_PLAN_V1`

Este documento prepara una unidad funcional pequena para Fase 2B.3. No
implementa endpoints, RPC, VERI*FACTU funcional, operacion fiscal
transaccional, AEAT real, certificados reales ni cambios de produccion.

## 1. Estado de partida

Estado canonico:

- PR #11 fusionado: plan servidor VERI*FACTU 2B.
- PR #12 fusionado: diseno de esquema/staging 2B.1.
- PR #13 fusionado: esquema local/staging 2B.2.
- PR #14 fusionado: checkpoint post-merge 2B.2.
- Ultimo merge commit base:
  `538286a229efe1409ef61fe3737fc8ec1853e785`.
- 2B.2 esta integrada en `main`.
- `main` esta verde con Quality y Supabase Acceptance.
- 2B.3 aun no esta iniciada.

Base tecnica disponible tras 2B.2:

- `server_documents`;
- `server_document_versions`;
- `document_conflicts`;
- `fiscal_operations`;
- `fiscal_invoice_identities`;
- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`;
- RLS y permisos restrictivos;
- rollback manual local/staging;
- validador `npm run validate:phase2b2-server-schema`.

## 2. Objetivo de 2B.3

Preparar la primera unidad funcional servidor/local-staging para sincronizar y
proteger documentos canonicos en `server_documents`.

2B.3 debe centrarse en:

- crear borradores canonicos en servidor;
- actualizar borradores con `expectedVersion`;
- registrar versiones aceptadas;
- rechazar mutaciones antiguas;
- rechazar cambios sobre documentos emitidos o bloqueados;
- registrar conflictos en `document_conflicts`;
- conservar snapshots y hashes como fuente protegida;
- impedir que un cliente antiguo degrade documentos bloqueados;
- sentar la base para futuras operaciones fiscales, sin ejecutarlas.

2B.3 no debe tocar AEAT, certificados ni registros fiscales funcionales.

## 3. Alcance permitido

La implementacion posterior de 2B.3A podria incluir, solo en servidor/local o
staging:

- una ruta servidor o RPC protegida para crear documento canonico;
- una ruta servidor o RPC protegida para actualizar documento canonico;
- derivacion de `user_id` desde token autenticado;
- validacion de `local_document_id`;
- validacion de `expectedVersion`;
- incremento controlado de `version`;
- insercion en `server_document_versions`;
- insercion en `document_conflicts` al rechazar mutaciones;
- reglas para distinguir borradores editables de documentos bloqueados;
- tests de permisos, versionado, conflictos y aislamiento entre usuarios.

El alcance debe mantenerse pequeno y reversible en local/staging.

## 4. Fuera de alcance

Queda expresamente fuera de 2B.3:

- VERI*FACTU real;
- conexion con AEAT;
- certificados reales;
- operacion fiscal transaccional;
- creacion funcional de `fiscal_records`;
- actualizacion funcional de `fiscal_chain_state`;
- transporte AEAT;
- workers de transporte;
- XML fiscal real;
- QR fiscal productivo;
- produccion;
- facturas reales;
- numeracion real;
- PDFs historicos;
- Stripe;
- precios;
- planes;
- IA;
- importadores;
- cambios de Vercel config;
- promote;
- dominios, aliases o DNS.

## 5. Diseno conceptual

### 5.1 Crear borrador canonico

Flujo futuro:

1. Cliente autenticado envia documento local como borrador.
2. Servidor valida Bearer token.
3. Servidor deriva `user_id` desde el usuario autenticado.
4. Servidor ignora cualquier `user_id` recibido en el body.
5. Servidor valida `local_document_id`.
6. Servidor comprueba que no existe ya `server_documents(user_id,
   local_document_id)`.
7. Servidor normaliza metadatos minimos:
   - `document_type`;
   - `document_kind`;
   - `document_lifecycle = draft`;
   - `integrity_lock = unlocked`;
   - `version = 1`.
8. Servidor inserta `server_documents`.
9. Servidor inserta `server_document_versions` con `change_type = create`.
10. Respuesta devuelve id servidor, version y metadatos seguros.

No se debe crear registro fiscal ni tocar tablas de transporte.

### 5.2 Actualizar borrador

Flujo futuro:

1. Cliente envia `serverDocumentId` o `local_document_id` y `expectedVersion`.
2. Servidor deriva `user_id` desde token.
3. Servidor carga el documento con bloqueo transaccional.
4. Si `expectedVersion` no coincide, rechaza la mutacion.
5. Si el documento esta en `draft` y `integrity_lock = unlocked`, aplica cambio
   permitido.
6. Servidor incrementa `version`.
7. Servidor guarda version aceptada en `server_document_versions`.
8. Respuesta devuelve nueva version y hashes/metadatos seguros.

Regla clave:

- sin `expectedVersion` valido no hay actualizacion.

### 5.3 Intento de cambio sobre emitido o bloqueado

Flujo futuro:

1. Cliente intenta modificar un documento con `document_lifecycle != draft` o
   `integrity_lock = locked`.
2. Servidor rechaza la mutacion aunque el payload diga `borrador`.
3. Servidor no altera `payload`, `document_snapshot`, `pdf_snapshot`,
   `snapshot_hash` ni `pdf_content_hash`.
4. Servidor puede registrar `document_conflicts` con `conflict_type =
   integrity_lock` o `snapshot`.
5. Respuesta informa de conflicto o documento bloqueado.

Esta regla protege frente a clientes antiguos, dispositivos offline y payloads
legacy inconsistentes.

### 5.4 Flujo de conflicto

Casos de conflicto:

- `expectedVersion` antiguo;
- intento de degradar `issued` a `draft`;
- intento de modificar snapshot;
- intento de cambiar numeracion fiscal ya protegida;
- intento de borrar o reemplazar documento bloqueado;
- duplicado de `local_document_id`;
- payload legacy incompatible.

Datos minimos a registrar:

- `user_id`;
- `server_document_id` si existe;
- `local_document_id`;
- `conflict_type`;
- `incoming_payload_hash`;
- `server_payload_hash`;
- `resolution_status = open`;
- `created_at`.

El conflicto nunca debe sobrescribir el documento canonico protegido.

### 5.5 Version aceptada

Cada mutacion aceptada debe crear una fila en `server_document_versions`.

Campos recomendados:

- `server_document_id`;
- `user_id`;
- `version`;
- `change_type`;
- `payload_before_hash`;
- `payload_after_hash`;
- `changed_fields`;
- `actor_type`;
- `actor_id`;
- `created_at`.

El historial tecnico no sustituye el registro fiscal. Es una trazabilidad de
sincronizacion y cambios canonicos.

## 6. Seguridad

Reglas obligatorias:

- `user_id` se deriva del token autenticado o del contexto service role.
- No se confia en `user_id`, `plan`, `status`, `entitlement` ni roles enviados
  por el body.
- No se expone `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- El navegador no escribe directamente tablas 2B.2.
- `authenticated` no recibe `INSERT`, `UPDATE` ni `DELETE` directo sobre tablas
  criticas.
- El servidor no acepta cambios en documentos `locked`.
- El servidor no acepta degradar `issued` o `canceled` a `draft`.
- El servidor no acepta reemplazar snapshots protegidos.
- El servidor no acepta payload fiscal como fuente confiable para futuras
  operaciones fiscales.
- Las respuestas al cliente deben evitar XML, snapshots completos, payloads
  crudos y errores internos sensibles.

Principio:

> El cliente puede proponer cambios de borrador; el servidor decide si son
> aceptables.

## 7. Relacion con snapshots y hashes

2B.3 no debe recalcular ni reemplazar snapshots fiscales existentes como efecto
secundario de una sincronizacion.

Reglas:

- Borradores pueden cambiar `payload` mientras sigan desbloqueados.
- Documentos bloqueados conservan `document_snapshot`, `pdf_snapshot`,
  `snapshot_hash` y `pdf_content_hash`.
- Si un cliente antiguo envia snapshots distintos para un documento bloqueado,
  se rechaza o se registra conflicto.
- Si un legacy protegido no tiene snapshot, se trata como protegido y se evita
  mutacion destructiva.
- Las futuras operaciones fiscales tomaran datos del documento canonico
  servidor validado, no del body del navegador.

## 8. Tests futuros

Matriz minima para 2B.3A:

| Caso | Resultado esperado |
| --- | --- |
| Crear borrador nuevo | `server_documents` version 1 creada |
| Crear borrador duplicado | rechazo o conflicto controlado |
| Actualizar con `expectedVersion` correcto | version incrementada |
| Actualizar con `expectedVersion` antiguo | rechazo y/o conflicto |
| Actualizar sin `expectedVersion` | rechazo |
| Cambiar documento `locked` | rechazo |
| Degradar `issued` a `draft` | rechazo |
| Cambiar `document_snapshot` protegido | rechazo |
| Cambiar `pdf_snapshot` protegido | rechazo |
| Usuario A lee/modifica documento de B | rechazo |
| Cliente antiguo envia status legacy incompatible | servidor mantiene lifecycle/lock |
| Conflicto registrado | fila en `document_conflicts` |
| Version aceptada registrada | fila en `server_document_versions` |
| `authenticated` intenta escribir tabla directa | rechazo |
| Service route autorizada escribe | permitido en entorno local/staging |

Tests recomendados:

- unitarios de normalizacion/validacion;
- integracion API/RPC local;
- RLS/permisos;
- concurrencia basica con dos updates simultaneos;
- regresion de snapshots y hashes.

## 9. Riesgos

Riesgos vivos:

- `sync_entities` actual puede no ser suficiente para integridad canonica.
- Clientes offline antiguos pueden subir payloads obsoletos.
- Duplicados de `local_document_id`.
- Snapshots incompletos en documentos legacy.
- Payload legacy inconsistente con lifecycle servidor.
- Confusion entre `Document.status` UI y `document_lifecycle` servidor.
- Riesgo de aceptar cambios sin `expectedVersion`.
- Riesgo de exponer payloads/snapshots crudos en respuestas.
- Riesgo de mezclar ingest documental con operacion fiscal antes de tiempo.
- Falta staging real validado.

Mitigacion:

- unidad pequena;
- rechazo conservador;
- conflictos en vez de sobrescritura;
- tests de RLS y concurrencia;
- no AEAT;
- no certificados;
- no produccion.

## 10. Criterios de aceptacion para abrir implementacion 2B.3A

La implementacion posterior 2B.3A solo deberia abrirse si:

- este documento esta aprobado;
- `main` esta verde;
- el alcance es pequeno y centrado en ingest documental;
- no hay produccion;
- no hay AEAT;
- no hay certificados;
- no hay transporte;
- no se crean registros fiscales funcionales;
- pruebas minimas estan definidas;
- rollback/no-op esta claro;
- seguridad y RLS estan definidos;
- se mantiene separacion entre documento canonico y registro fiscal;
- se mantiene fuera Stripe, precios, planes, IA e importadores.

## 11. Veredicto

Veredicto interno:

`APTO PARA ABRIR IMPLEMENTACION 2B.3A SOLO SI SE LIMITA A INGEST DOCUMENTAL SERVIDOR LOCAL/STAGING`

No apto para:

- AEAT real;
- certificados reales;
- produccion;
- transporte;
- operacion fiscal transaccional;
- cambios de facturas reales;
- cambios de numeracion real;
- cambios de PDFs historicos.

Este plan no constituye certificacion legal, fiscal ni tributaria.
