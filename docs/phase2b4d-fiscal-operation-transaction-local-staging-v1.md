# Fase 2B.4D - Reserva transaccional real local/staging v1

Fecha: 2026-06-25

Rama: `feat/phase2b4d-fiscal-operation-transaction-local-staging`

Estado: SERVER-ONLY / LOCAL-STAGING / SIN REGISTRO FISCAL FUNCIONAL

Este documento describe la implementacion local/staging de la reserva
transaccional real de operaciones fiscales. No constituye certificacion legal,
fiscal ni tributaria. No declara homologacion AEAT ni remision VERI*FACTU
productiva.

## 1. Objetivo

Fase 2B.4D convierte el contrato local de 2B.4C en una reserva transaccional
real en PostgreSQL para:

- cargar y bloquear el documento canonico;
- validar `expectedDocumentVersion`;
- resolver idempotencia por `user_id + idempotency_key`;
- buscar o crear `fiscal_invoice_identities`;
- crear `fiscal_operations` en estado `requested`;
- devolver `created`, `existing`, `rejected` o `conflict`.

La fase no crea registros fiscales inmutables, no actualiza cadena fiscal, no
genera XML AEAT y no transporta nada a AEAT.

## 2. Decision RPC vs transaccion servidor

Decision: **RPC PostgreSQL transaccional**.

Motivo:

- Supabase JS no ofrece, con el patron actual del proyecto, una garantia clara
  de transaccion real para varias llamadas independientes.
- La reserva fiscal no puede depender de una secuencia no atomica de llamadas
  REST/RPC.
- PostgreSQL ejecuta la funcion RPC dentro de una unica transaccion.
- El flujo queda testeable y auditable en local/staging.

Quedan descartadas varias llamadas independientes como solucion final.

## 3. Migracion y rollback

Migracion:

```text
supabase/migrations/20260625070000_phase2b4d_fiscal_operation_transaction_rpc.sql
```

Rollback manual:

```text
supabase/rollbacks/20260625070000_phase2b4d_fiscal_operation_transaction_rpc.down.sql
```

La migracion crea:

- `public.reserve_fiscal_operation(...)`.

El rollback elimina:

- `public.reserve_fiscal_operation(...)`.

Ambos son solo local/staging. No se aplican a Supabase produccion.

## 4. Seguridad SQL

La RPC:

- usa `security definer`;
- fija `search_path = ''`;
- cualifica tablas con `public.`;
- verifica `auth.role() = 'service_role'`;
- revoca ejecucion a `public`, `anon` y `authenticated`;
- concede ejecucion solo a `service_role`;
- mantiene RLS/GRANT como defensa adicional;
- no expone la funcion al navegador.

La funcion recibe `p_user_id` desde servidor autorizado. No esta pensada para
ser llamada desde cliente publico ni desde usuarios `authenticated` directamente.

## 5. Comportamiento transaccional

Dentro de la RPC se realiza en una unica transaccion:

1. Normalizacion de `operation_type` y `environment`.
2. Validacion de `expected_document_version`.
3. Lectura del documento por `user_id + server_document_id` con `for update`.
4. Rechazo si el documento no existe.
5. Conflicto si la version no coincide.
6. Rechazo si el documento no es factura emitida/bloqueada.
7. Rechazo si faltan:
   - `snapshot_hash`;
   - `issuer_nif`;
   - `numserie`;
   - `issue_date`.
8. Resolucion de `idempotency_key` recibida o derivada local/staging.
9. Busqueda de operacion existente por `user_id + idempotency_key`.
10. Insercion idempotente de identidad fiscal con `on conflict do nothing`.
11. Insercion idempotente de operacion fiscal con `on conflict do nothing`.
12. Segunda lectura de operacion si hay carrera.
13. Resultado controlado.

## 6. Repository/store

Archivo nuevo:

```text
src/lib/fiscal-operations/supabase-transaction-store.ts
```

El adapter:

- es server-only;
- recibe cliente Supabase inyectado;
- llama a `reserve_fiscal_operation`;
- mapea respuesta DB a dominio;
- traduce errores DB a `FiscalOperationTransactionStoreError`;
- no crea cliente con service role;
- no lee variables de entorno;
- no importa cliente de navegador.

Export actualizado:

```text
src/lib/fiscal-operations/index.ts
```

## 7. Idempotencia y concurrencia

Reglas implementadas:

- misma `idempotency_key`: devuelve `existing`;
- distinta `idempotency_key` para misma identidad fiscal: puede crear otra
  operacion legitima;
- identidad fiscal unica por `user_id`, `environment`, `issuer_nif`, `numserie`
  y `fecha_expedicion`;
- `on conflict do nothing` evita duplicados de identidad;
- `on conflict do nothing` evita duplicados de operacion;
- carrera no verificable devuelve `operation_race` o `identity_race`.

## 8. Tablas tocadas

La RPC puede leer:

- `public.server_documents`.

La RPC puede escribir:

- `public.fiscal_invoice_identities`;
- `public.fiscal_operations`.

## 9. Tablas no tocadas

La RPC no escribe ni modifica:

- `public.fiscal_records`;
- `public.fiscal_chain_state`;
- `public.fiscal_transport_attempts`.

No genera:

- XML AEAT;
- hash de registro fiscal;
- cadena fiscal;
- intentos de transporte;
- respuestas AEAT.

## 10. Tests y validadores

Tests unitarios añadidos:

- mapeo `created`;
- mapeo `existing`;
- mapeo `rejected`;
- mapeo `conflict`;
- error DB controlado;
- adapter llama solo a `reserve_fiscal_operation`;
- adapter no llama tablas fiscales finales ni endpoints AEAT.

Validador añadido:

```text
scripts/validate-phase2b4d-fiscal-operation-transaction.mjs
```

Script npm:

```text
npm run validate:phase2b4d-fiscal-operation-transaction
```

El validador comprueba:

- migracion y rollback emparejados;
- RPC `reserve_fiscal_operation`;
- `security definer`;
- `search_path = ''`;
- guard de `service_role`;
- `revoke` a `public`, `anon`, `authenticated`;
- `grant execute` solo a `service_role`;
- no escrituras a `fiscal_records`;
- no escrituras a `fiscal_chain_state`;
- no escrituras a `fiscal_transport_attempts`;
- no AEAT, certificados, service role publico, Stripe, OpenAI ni importadores.

## 11. Supabase local

Durante la implementacion, `supabase status --output json` indico que Supabase
local no estaba levantado:

```text
No such container: supabase_db_factura-autonomo
```

Por seguridad no se uso remoto ni produccion. La validacion dinamica contra
Supabase local queda pendiente de ejecutar cuando el entorno local este
levantado.

## 12. Limites

2B.4D no implementa:

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

## 13. Riesgos vivos

- Falta aceptacion dinamica con Supabase local levantado.
- `p_user_id` debe venir siempre de servidor autorizado y no de payload cliente.
- La unicidad fiscal global vs por `user_id` sigue pendiente antes de produccion.
- La RPC aun no crea registros fiscales inmutables ni cadena.
- La transicion `requested -> processing` sigue pendiente.

## 14. Queda para 2B.4E

Siguiente bloque recomendado:

- levantar Supabase local;
- aplicar migraciones up/down/up;
- ejecutar concurrencia real contra la RPC;
- confirmar permisos efectivos `anon`, `authenticated`, `service_role`;
- preparar transicion segura `requested -> processing` si procede;
- seguir sin crear registros fiscales finales hasta aprobacion explicita.

## 15. Confirmaciones negativas

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
