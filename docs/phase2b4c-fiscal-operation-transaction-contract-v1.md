# Fase 2B.4C - Contrato de operacion fiscal transaccional v1

Fecha: 2026-06-25

Rama: `feat/phase2b4c-fiscal-operation-transaction-contract`

Estado: SERVER-ONLY / LOCAL-STAGING PREP / SIN OPERACION FISCAL FUNCIONAL

Este documento describe el contrato local/server-only preparado para reservar
operaciones fiscales de forma controlada. No constituye certificacion legal,
fiscal ni tributaria. No declara homologacion AEAT ni remision VERI*FACTU
productiva.

## 1. Objetivo

Fase 2B.4C prepara el contrato de la futura operacion fiscal transaccional. El
objetivo es definir como se debe cargar el documento canonico, validar version,
resolver idempotencia, reutilizar o crear identidad fiscal y reservar una
operacion fiscal en estado `requested`.

La fase no crea registros fiscales inmutables, no actualiza cadena fiscal, no
genera XML AEAT y no transporta nada a AEAT.

## 2. Alcance implementado

Archivos creados o modificados:

```text
src/lib/fiscal-operations/index.ts
src/lib/fiscal-operations/transaction-contract.ts
src/lib/fiscal-operations/transaction-contract.test.ts
src/lib/fiscal-operations/transaction-errors.ts
src/lib/fiscal-operations/transaction-types.ts
docs/phase2b4c-fiscal-operation-transaction-contract-v1.md
```

La implementacion añade:

- `FiscalOperationTransactionInput`;
- `FiscalOperationTransactionPlan`;
- `FiscalOperationTransactionResult`;
- `FiscalOperationTransactionStore`;
- `FiscalOperationTransactionScope`;
- `FiscalOperationTransactionError`;
- `buildFiscalOperationTransactionPlan`;
- `validateFiscalOperationTransactionInput`;
- `assertExpectedDocumentVersionForFiscalOperation`;
- `resolveFiscalOperationReservation`;
- `executeFiscalOperationTransactionContract`;
- `classifyFiscalOperationTransactionResult`.

## 3. Contrato transaccional local

Entrada minima:

- `userId`;
- `serverDocumentId`;
- `operationType`;
- `environment`;
- `expectedDocumentVersion`;
- `idempotencyKey` opcional;
- `requestedBy`;
- `requestedAt` opcional.

Flujo modelado:

1. Valida que exista `expectedDocumentVersion`.
2. Ejecuta la reserva dentro de `withFiscalOperationTransaction`.
3. Carga el `ServerDocumentRecord` por `userId + serverDocumentId`.
4. Rechaza si el documento no existe.
5. Compara `document.version` con `expectedDocumentVersion`.
6. Construye el borrador fiscal usando los guards de 2B.4A.
7. Usa la `idempotencyKey` recibida o la derivada por el dominio.
8. Si la operacion existe por `userId + idempotencyKey`, devuelve `existing`.
9. Si no existe, busca identidad fiscal por:
   - `userId`;
   - `environment`;
   - `issuerNif`;
   - `numserie`;
   - `fechaExpedicion`.
10. Si falta identidad fiscal, la crea.
11. Crea `fiscal_operations` con estado `requested`.
12. Devuelve un resultado controlado:
   - `created`;
   - `existing`;
   - `rejected`;
   - `conflict`.

## 4. Que se considera atomico

En esta fase la atomicidad es `simulated_local`. Esto significa que el contrato
obliga a ejecutar el flujo en un unico boundary (`withFiscalOperationTransaction`)
y lo prueba con un store fake, pero no implementa todavia una transaccion real
PostgreSQL ni RPC.

Para el flujo final de produccion deben ser atomicos:

- lectura del documento canonico con version esperada;
- validacion de `expectedDocumentVersion`;
- resolucion de operacion existente por idempotencia;
- busqueda/creacion de identidad fiscal;
- creacion de `fiscal_operations`;
- clasificacion de carreras `23505`;
- no avanzar a registro fiscal si la reserva no queda confirmada.

No seria aceptable ejecutar estos pasos finales mediante varias llamadas
independientes sin transaccion.

## 5. Idempotencia y concurrencia

Reglas preparadas:

- una misma `idempotencyKey` devuelve la operacion existente;
- dos operaciones distintas para la misma identidad fiscal pueden coexistir si
  representan operaciones legitimas distintas;
- `alta_subsanacion` y `anulacion` no quedan bloqueadas por una `alta_inicial`;
- una carrera `23505` de operacion se convierte en `existing` si la reserva
  puede leerse despues;
- una carrera `23505` de operacion se convierte en `conflict` si no se puede
  verificar la reserva;
- una carrera `23505` de identidad fiscal se resuelve reutilizando la identidad
  si puede leerse despues;
- una carrera `23505` de identidad fiscal se convierte en `conflict` si no se
  puede verificar la identidad.

## 6. Estados

Estados del resultado del contrato:

- `created`: reserva nueva creada;
- `existing`: reserva idempotente existente;
- `rejected`: input o documento no valido para operacion fiscal;
- `conflict`: conflicto de version o carrera no verificable.

Estado de la operacion fiscal creada:

- `requested`.

La fase no pasa a `processing`, no genera registro fiscal y no inicia transporte.
El salto `requested -> processing` queda preparado conceptualmente para 2B.4D o
posterior.

## 7. RPC vs transaccion servidor

### Opcion A - Transaccion PostgreSQL directa desde servidor

Ventajas:

- toda la logica puede vivir en TypeScript server-only;
- facilita reutilizar guards ya implementados;
- permite tests unitarios cercanos al dominio.

Riesgos:

- el cliente Supabase JS habitual no expone un boundary transaccional completo
  para varias llamadas independientes;
- requiere una conexion/cliente servidor que garantice transacciones reales;
- debe evitar cualquier exposicion de service role al navegador.

### Opcion B - RPC PostgreSQL transaccional

Ventajas:

- PostgreSQL garantiza una unica transaccion;
- se puede bloquear identidad/cadena y reservar de forma atomica;
- reduce riesgo de carreras entre llamadas HTTP.

Riesgos:

- duplica parte de la logica de dominio en SQL;
- exige una bateria fuerte de tests sobre migracion local/staging;
- requiere control estricto de `SECURITY DEFINER`, `search_path`, GRANT/REVOKE y
  RLS.

### Opcion C - Varias llamadas REST/RPC independientes

Veredicto: no aceptable para el flujo final.

No debe usarse para reservar operacion fiscal productiva porque deja ventanas de
carrera entre lectura, identidad y creacion de operacion. Esta fase solo modela
el contrato; 2B.4D debe elegir A o B para local/staging antes de cualquier uso
real.

## 8. Tests cubiertos

Tests nuevos:

- construye plan transaccional valido;
- normaliza entorno;
- rechaza input sin `expectedDocumentVersion`;
- rechaza version no coincidente;
- rechaza documento no elegible;
- crea operacion e identidad si faltan;
- reutiliza operacion existente por `idempotencyKey`;
- reutiliza identidad fiscal existente;
- dos solicitudes con la misma `idempotencyKey` devuelven `created` y
  `existing`;
- dos solicitudes con distinta `idempotencyKey` y misma identidad crean dos
  operaciones y una identidad;
- documento cambiado devuelve `document_version_conflict`;
- `alta_subsanacion` no queda bloqueada por `alta_inicial`;
- `anulacion` no queda bloqueada por `alta_inicial`;
- carrera `23505` de operacion verificable devuelve `existing`;
- carrera `23505` de operacion no verificable devuelve `conflict`;
- carrera `23505` de identidad verificable permite crear operacion;
- carrera `23505` de identidad no verificable devuelve `conflict`;
- el contrato no toca registros fiscales, cadena, transporte ni XML;
- errores tipados estables.

## 9. Limites

2B.4C no implementa:

- transaccion PostgreSQL real;
- RPC transaccional;
- insercion en `fiscal_records`;
- actualizacion de `fiscal_chain_state`;
- creacion de `fiscal_transport_attempts`;
- XML AEAT definitivo;
- firma o uso de certificados;
- transporte AEAT;
- endpoint funcional de operacion fiscal;
- activacion por UI;
- conexion con formularios reales;
- mutacion de facturas reales;
- cambios de numeracion real;
- cambios de PDFs historicos;
- cambios de precios, planes, Stripe, IA o importadores.

## 10. Confirmaciones negativas

- No hay Supabase produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional productivo.
- No hay XML AEAT definitivo.
- No hay transporte AEAT.
- No hay `fiscal_records` funcionales.
- No hay `fiscal_chain_state` funcional.
- No hay `fiscal_transport_attempts` funcionales.
- No hay UI.
- No hay facturas reales.
- No hay numeracion real.
- No hay PDFs historicos.
- No hay Vercel config.
- No hay promote.
- No hay cambios de dominios, DNS ni aliases.

## 11. Queda para 2B.4D

2B.4D deberia mantener local/staging y resolver:

- eleccion final entre RPC PostgreSQL transaccional o transaccion servidor real;
- implementacion local/staging de la atomicidad real;
- validacion con PostgreSQL local;
- errores controlados de constraint real;
- integracion con el repository sin crear todavia registro fiscal definitivo si
  no se aprueba explicitamente;
- mantenimiento de RLS/GRANT/REVOKE seguro;
- pruebas de concurrencia contra base local/staging.

## 12. Validaciones previstas

Validaciones requeridas antes de abrir PR:

- `git diff --check`;
- `npm run check:migrations`;
- `npm run validate:phase2b2-server-schema`;
- `npm run validate:phase2b3e-ingest-route-safety`;
- `npm run validate:phase2b3g-controlled-ingest-route`;
- `npm run validate:phase2b3i-ingest-operational-hardening`;
- `npx vitest run src/lib/fiscal-operations/operation-builder.test.ts src/lib/fiscal-operations/repository.test.ts src/lib/fiscal-operations/supabase-store.test.ts src/lib/fiscal-operations/transaction-contract.test.ts`;
- `npm test`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`.
