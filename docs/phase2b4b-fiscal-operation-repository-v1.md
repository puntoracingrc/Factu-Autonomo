# Fase 2B.4B - Repository de operaciones fiscales v1

Fecha: 2026-06-25

Rama: `feat/phase2b4b-fiscal-operation-repository`

Estado: SERVER-ONLY / LOCAL-STAGING PREP / SIN OPERACION FISCAL FUNCIONAL

Este documento describe la capa de repository/store creada para preparar la
persistencia controlada de operaciones fiscales e identidades fiscales. No
constituye certificacion legal, fiscal ni tributaria. No declara homologacion
AEAT ni remision VERI*FACTU productiva.

## 1. Objetivo

Fase 2B.4B prepara una capa server-only para persistir, en local/staging, dos
conceptos ya definidos en el esquema 2B.2:

- `fiscal_operations`;
- `fiscal_invoice_identities`.

La fase no crea registros fiscales inmutables, no actualiza cadena fiscal, no
genera XML AEAT y no transporta nada a AEAT.

## 2. Alcance implementado

Archivos creados o modificados:

```text
src/lib/fiscal-operations/types.ts
src/lib/fiscal-operations/repository.ts
src/lib/fiscal-operations/supabase-store.ts
src/lib/fiscal-operations/repository.test.ts
src/lib/fiscal-operations/supabase-store.test.ts
src/lib/fiscal-operations/index.ts
docs/phase2b4b-fiscal-operation-repository-v1.md
```

La implementacion añade:

- `FiscalOperationRepository`;
- `FiscalOperationRepositoryStore`;
- `FiscalOperationCreateInput`;
- `FiscalOperationRepositoryResult`;
- `FiscalInvoiceIdentityCreateInput`;
- records persistidos de operacion e identidad;
- adapter Supabase con cliente inyectado;
- mappings DB ↔ dominio;
- errores controlados de adapter;
- tests unitarios con store en memoria y cliente Supabase falso.

## 3. Tablas preparadas

2B.4B solo prepara acceso server-only para:

- `fiscal_operations`;
- `fiscal_invoice_identities`.

No accede a:

- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`.

## 4. Repository/store

El repositorio expone:

- `prepareFiscalOperation(input)`.

El store define:

- `findOperationByIdempotencyKey(userId, idempotencyKey)`;
- `findInvoiceIdentity(input)`;
- `createInvoiceIdentity(input)`;
- `createFiscalOperation(input)`.

Flujo actual:

1. Construye el `FiscalOperationDraft` desde `ServerDocumentRecord`.
2. Busca operacion existente por `userId + idempotencyKey`.
3. Si existe, devuelve esa operacion y no duplica nada.
4. Si no existe, busca identidad fiscal.
5. Si falta identidad fiscal, la crea.
6. Crea `fiscal_operations` con estado inicial `requested`.

## 5. Mapping DB ↔ dominio

El adapter Supabase traduce:

- `snake_case` DB a `camelCase` dominio;
- `camelCase` dominio a `snake_case` insert;
- enums DB a tipos TypeScript cerrados;
- errores DB a `FiscalOperationStoreError`.

El cliente Supabase se inyecta desde fuera. El adapter:

- no crea cliente con service role;
- no lee variables de entorno;
- no importa cliente de navegador;
- no expone secretos;
- no accede a produccion por si mismo.

## 6. Reglas de idempotencia

La idempotency key identifica una operacion fiscal concreta.

Reglas implementadas:

- si existe `userId + idempotencyKey`, se devuelve la operacion existente;
- no se crea otra operacion duplicada;
- `alta_inicial`, `alta_subsanacion` y `anulacion` generan claves distintas
  cuando el tipo de operacion cambia;
- una subsanacion o anulacion legitima no queda bloqueada por una `alta_inicial`
  previa;
- la identidad fiscal puede reutilizarse para varias operaciones legitimas de
  la misma factura.

## 7. Decisiones pendientes

Siguen pendientes:

- decidir en staging si la unicidad fiscal debe ser global o por `user_id`;
- resolver concurrencia real de doble insercion con transaccion o RPC futura;
- conectar el repository a una operacion transaccional completa;
- definir estrategia final ante errores `23505` de carrera;
- enlazar identidad fiscal con registros fiscales cuando exista `fiscal_records`
  funcional;
- separar reintentos de transporte AEAT en fase posterior.

## 8. Tests cubiertos

Tests de repository:

- prepara operacion nueva;
- idempotency key existente devuelve operacion existente;
- no duplica operacion;
- crea identidad fiscal si falta;
- reutiliza identidad fiscal si existe;
- diferencia `alta_inicial`, `alta_subsanacion` y `anulacion`;
- no bloquea futuras operaciones legitimas por misma factura;
- rechaza input sin `snapshotHash`;
- rechaza input sin `issuerNif`, `numserie` o `issueDate`;
- errores tipados estables.

Tests de adapter Supabase:

- mapea operacion fiscal DB → dominio;
- mapea operacion fiscal dominio → insert;
- mapea identidad fiscal DB → dominio;
- mapea identidad fiscal dominio → insert;
- busca operacion por `idempotencyKey` y `userId`;
- devuelve null si no existe;
- crea operacion con estado inicial `requested`;
- busca y crea identidad fiscal;
- error DB se traduce a error controlado;
- no toca tablas de registros, cadena ni transporte.

## 9. Limites

2B.4B no implementa:

- transaccion fiscal completa;
- insercion en `fiscal_records`;
- actualizacion de `fiscal_chain_state`;
- creacion de `fiscal_transport_attempts`;
- XML AEAT definitivo;
- firma o uso de certificados;
- transporte AEAT;
- endpoint funcional de operacion fiscal;
- activacion por UI;
- mutacion de facturas reales;
- cambios de numeracion real;
- cambios de PDFs historicos;
- cambios de precios, planes, Stripe, IA o importadores.

## 10. Confirmaciones negativas

- No hay `fiscal_records` funcionales.
- No hay `fiscal_chain_state` funcional.
- No hay `fiscal_transport_attempts` funcionales.
- No hay XML AEAT.
- No hay transporte AEAT.
- No hay certificados.
- No hay produccion.
- No hay Supabase produccion.
- No hay Vercel config.
- No hay promote.
- No hay cambios de dominios, DNS ni aliases.

## 11. Queda para 2B.4C

2B.4C deberia mantener el alcance local/staging y abordar el siguiente paso
sin produccion:

- definir contrato de operacion fiscal transaccional;
- resolver carrera de idempotencia e identidad fiscal;
- decidir si la transaccion vive como RPC PostgreSQL o como transaccion servidor;
- validar bloqueo optimista con `expectedDocumentVersion`;
- preparar reserva atomica de `fiscal_operations`;
- seguir dejando fuera `fiscal_records`, cadena fiscal, XML y transporte AEAT
  hasta tener transaccion completa validada.

## 12. Validaciones previstas

Validaciones requeridas antes de abrir PR:

- `git diff --check`;
- `npm run check:migrations`;
- `npm run validate:phase2b2-server-schema`;
- `npm run validate:phase2b3e-ingest-route-safety`;
- `npm run validate:phase2b3g-controlled-ingest-route`;
- `npm run validate:phase2b3i-ingest-operational-hardening`;
- `npx vitest run src/lib/fiscal-operations/operation-builder.test.ts src/lib/fiscal-operations/repository.test.ts src/lib/fiscal-operations/supabase-store.test.ts`;
- `npm test`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`.
