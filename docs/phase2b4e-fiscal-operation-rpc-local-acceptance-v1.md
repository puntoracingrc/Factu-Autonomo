# Fase 2B.4E - Aceptacion local de RPC fiscal v1

Fecha: 2026-06-25

Rama: `feat/phase2b4e-fiscal-operation-rpc-local-acceptance`

Estado: ACEPTACION DINAMICA LOCAL / SIN PRODUCCION / SIN REGISTRO FISCAL FINAL

Este documento registra la aceptacion dinamica local de la RPC
`reserve_fiscal_operation`. No constituye certificacion legal, fiscal ni
tributaria. No declara homologacion AEAT ni remision VERI*FACTU productiva.

## 1. Objetivo

Validar contra Supabase local real que la RPC PostgreSQL transaccional de 2B.4D:

- existe tras aplicar migraciones;
- solo se ejecuta con `service_role`;
- reserva operaciones fiscales en estado `requested`;
- reutiliza reservas por idempotencia;
- evita duplicados en concurrencia;
- no crea registros fiscales finales;
- no toca cadena fiscal;
- no crea intentos de transporte.

## 2. Alcance implementado

Archivos creados o modificados:

```text
scripts/test-phase2b4e-fiscal-operation-rpc-local.mjs
scripts/validate-phase2b4e-fiscal-rpc-local-acceptance.mjs
docs/phase2b4e-fiscal-operation-rpc-local-acceptance-v1.md
package.json
```

Scripts npm añadidos:

```text
npm run test:phase2b4e-fiscal-rpc-local
npm run validate:phase2b4e-fiscal-rpc-local-acceptance
```

## 3. Supabase local

Supabase local estuvo disponible.

Comandos ejecutados:

```text
supabase start
supabase db reset --local
npm run test:phase2b4e-fiscal-rpc-local
```

Inicialmente la base local arrancada no tenia disponible la RPC. Se ejecuto
`supabase db reset --local` para recrear la base local y aplicar todas las
migraciones versionadas en orden:

- `20260623000000_base_schema.sql`;
- `20260624000100_phase1_hardening.sql`;
- `20260624000200_phase1_rpc_search_path_hardening.sql`;
- `20260624220000_phase2b_server_schema_local_staging.sql`;
- `20260625070000_phase2b4d_fiscal_operation_transaction_rpc.sql`.

No se uso remoto, staging ni produccion.

## 4. Script de aceptacion

Script:

```text
scripts/test-phase2b4e-fiscal-operation-rpc-local.mjs
```

El script:

- lee `supabase status --output json`;
- exige que API y DB apunten a `localhost`, `127.0.0.1` o `::1`;
- crea usuario local efimero;
- crea documento canonico local efimero;
- no imprime tokens, claves, payloads ni snapshots completos;
- limpia datos de prueba cuando termina;
- no usa remoto ni produccion.

## 5. Casos probados

### 5.1 Permisos

Validado:

- `anon` no puede ejecutar `reserve_fiscal_operation`;
- `authenticated` no puede ejecutar `reserve_fiscal_operation`;
- `service_role` local si puede ejecutar la RPC.

### 5.2 Reserva nueva

Validado:

- documento canonico valido;
- `expectedDocumentVersion` correcto;
- resultado `created`;
- fila creada en `fiscal_operations`;
- identidad creada en `fiscal_invoice_identities`.

### 5.3 Idempotencia

Validado:

- repetir misma `idempotencyKey` devuelve `existing`;
- no duplica `fiscal_operations`.

### 5.4 Conflicto de version

Validado:

- `expectedDocumentVersion` antiguo devuelve `conflict`;
- `reason = document_version_conflict`;
- no crea operacion nueva.

### 5.5 Identidad fiscal

Validado:

- misma factura fiscal reutiliza identidad;
- no duplica `fiscal_invoice_identities`.

### 5.6 Operaciones legitimas

Validado:

- `alta_subsanacion` puede crearse con distinta `idempotencyKey`;
- `anulacion` puede crearse con distinta `idempotencyKey`;
- no quedan bloqueadas por una `alta_inicial`.

### 5.7 Concurrencia

Validado:

- dos llamadas simultaneas con la misma `idempotencyKey`;
- resultado combinado `created` + `existing`;
- no duplicados.

### 5.8 Tablas prohibidas

Validado que no se escriben:

- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`.

## 6. Rollback local

Validado en local:

1. Aplicar rollback manual de 2B.4D.
2. Confirmar que `reserve_fiscal_operation` desaparece.
3. Reaplicar migracion 2B.4D.
4. Confirmar que `reserve_fiscal_operation` vuelve a existir.

No se toco produccion.

## 7. Tablas tocadas

Durante la aceptacion local se crearon y limpiaron datos efimeros en:

- `auth.users`;
- `server_documents`;
- `fiscal_invoice_identities`;
- `fiscal_operations`.

## 8. Tablas no tocadas funcionalmente

No se insertaron ni actualizaron:

- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`.

Estas tablas solo se consultaron para verificar ausencia de filas de prueba.

## 9. Validador

Script:

```text
scripts/validate-phase2b4e-fiscal-rpc-local-acceptance.mjs
```

Comprueba que el script de aceptacion:

- existe;
- usa `supabase status --output json`;
- valida entorno local;
- prueba permisos `anon`, `authenticated` y `service_role`;
- prueba concurrencia;
- prueba rollback y reaplicacion de migracion;
- no contiene URLs productivas;
- no imprime secretos;
- no toca AEAT/certificados;
- no escribe en tablas fiscales finales;
- no usa Stripe, IA ni importadores.

## 10. Resultado de aceptacion local

Resultado:

```text
Phase 2B.4E local RPC acceptance passed.
Cases: permissions, created, existing, conflict, identity reuse, legitimate operations, concurrency, forbidden tables, rollback.
Environment: local Supabase only.
```

## 11. Limites

2B.4E no implementa:

- registros fiscales finales;
- cadena fiscal;
- XML AEAT;
- transporte AEAT;
- certificados;
- endpoint funcional de operacion fiscal;
- UI;
- conexion con formularios reales;
- cambios en facturas reales;
- cambios de numeracion real;
- cambios de PDFs historicos;
- cambios de Stripe, precios, planes, IA o importadores.

## 12. Riesgos vivos

- Falta decidir el siguiente paso `requested -> processing`.
- Falta definir insercion futura de `fiscal_records` inmutables.
- Falta cadena fiscal real.
- Falta transporte AEAT real.
- Falta politica de staging/produccion y baseline productivo.
- `p_user_id` debe seguir derivandose siempre desde servidor autorizado.

## 13. Queda para 2B.4F

Siguiente bloque recomendado:

- decidir transicion segura de `requested` a `processing`;
- mantener pruebas dinamicas locales;
- no crear `fiscal_records` hasta tener diseño y aceptacion explicita;
- revisar si la RPC debe ampliarse o si conviene una segunda RPC para el paso de
  procesamiento.

## 14. Confirmaciones negativas

- No hay Supabase produccion.
- No hay staging remoto.
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
- No hay Stripe/precios/planes.
- No hay IA.
- No hay importadores.
