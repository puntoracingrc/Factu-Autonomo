# Fase 2B.4A - Dominio local de operacion fiscal v1

Fecha: 2026-06-25

Rama: `feat/phase2b4a-local-fiscal-operation-domain-prep`

Estado: PREPARACION LOCAL / SERVER-ONLY / SIN OPERACION FISCAL FUNCIONAL

Este documento describe la primera capa pura de dominio para preparar futuras
operaciones fiscales servidor. No constituye certificacion legal, fiscal ni
tributaria. No declara homologacion AEAT ni remision VERI*FACTU productiva.

## 1. Objetivo

Fase 2B.4A prepara tipos y helpers locales para construir, en fases posteriores,
una operacion fiscal transaccional desde el documento canonico servidor.

El objetivo inmediato es dejar una base verificable para:

- identidad fiscal de factura;
- tipos de operacion fiscal;
- errores tipados;
- idempotencia de operacion;
- reglas de elegibilidad;
- builder preliminar de borrador de operacion fiscal;
- tests unitarios antes de tocar tablas, rutas reales o AEAT.

## 2. Alcance implementado

Archivos creados:

```text
src/lib/fiscal-operations/types.ts
src/lib/fiscal-operations/errors.ts
src/lib/fiscal-operations/identity.ts
src/lib/fiscal-operations/idempotency.ts
src/lib/fiscal-operations/operation-guards.ts
src/lib/fiscal-operations/operation-builder.ts
src/lib/fiscal-operations/index.ts
src/lib/fiscal-operations/operation-builder.test.ts
docs/phase2b4a-local-fiscal-operation-domain-prep-v1.md
```

La implementacion es TypeScript puro y no conecta con:

- Supabase produccion;
- AEAT;
- certificados;
- transporte;
- UI;
- formularios reales;
- Stripe;
- precios;
- planes;
- IA;
- importadores.

## 3. Tipos principales

Tipos de operacion fiscal:

- `alta_inicial`;
- `alta_subsanacion`;
- `anulacion`.

Entornos fiscales:

- `test`;
- `production`.

Estados previstos de operacion:

- `requested`;
- `processing`;
- `completed`;
- `failed_retryable`;
- `failed_final`.

Tipos de dominio añadidos:

- `FiscalInvoiceIdentity`;
- `FiscalOperationDraft`;
- `FiscalOperationDecision`;
- `FiscalOperationBuildInput`;
- `FiscalOperationErrorReason`.

## 4. Helpers principales

Helpers implementados:

- `buildFiscalInvoiceIdentity(...)`;
- `normalizeFiscalEnvironment(...)`;
- `buildFiscalOperationIdempotencyKey(...)`;
- `assertDocumentIsEligibleForFiscalOperation(...)`;
- `assertSnapshotHashExists(...)`;
- `assertIssuerAndNumSerieExist(...)`;
- `assertIssueDateExists(...)`;
- `buildFiscalOperationDraft(...)`;
- `decideFiscalOperationDraft(...)`.

La identidad fiscal se construye desde `ServerDocumentRecord`, no desde payload
enviado por el navegador.

## 5. Reglas de elegibilidad

Una operacion fiscal local exige:

- documento canonico servidor;
- `documentType = factura`;
- documento no borrador;
- `integrityLock = locked`;
- `documentSnapshotHash` presente;
- `issuerNif` presente;
- `numserie` presente;
- `issueDate` presente;
- `expectedDocumentVersion` entero positivo;
- `operationType` soportado;
- `environment` valido.

El builder devuelve un `FiscalOperationDraft` con `authority: server_document`.
Ese valor documenta que la autoridad fiscal viene del documento canonico
servidor, no de datos arbitrarios del cliente.

## 6. Idempotencia

`buildFiscalOperationIdempotencyKey(...)` genera una clave estable que incluye:

- `userId`;
- `serverDocumentId`;
- `operationType`;
- identidad fiscal;
- `expectedDocumentVersion`;
- `documentSnapshotHash`.

La clave identifica una operacion concreta. Cambiar `operationType` cambia la
clave, por lo que una `alta_subsanacion` o `anulacion` legitima no queda
bloqueada por una `alta_inicial` previa.

Cambiar `documentSnapshotHash` tambien cambia la clave. Esto prepara la futura
operacion transaccional para trabajar con el snapshot concreto sobre el que se
decide la operacion.

## 7. Tests cubiertos

El test unitario cubre:

- construccion de identidad fiscal valida;
- rechazo de documento sin `issuerNif`;
- rechazo de documento sin `numserie`;
- rechazo de documento sin `issueDate`;
- rechazo de documento sin `snapshotHash`;
- rechazo de `expectedDocumentVersion` ausente;
- rechazo de borrador no emitido/bloqueado;
- idempotency key estable;
- cambio de clave si cambia `snapshotHash`;
- cambio de clave si cambia `operationType`;
- `alta_inicial`, `alta_subsanacion` y `anulacion` diferenciadas;
- no uso de payload cliente como autoridad;
- errores tipados estables;
- rechazo de entorno invalido;
- rechazo de documento no fiscal;
- construccion directa de clave sin XML ni transporte.

## 8. Limites

2B.4A no implementa:

- insercion en `fiscal_operations`;
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

## 9. Confirmaciones negativas

- No hay `fiscal_records` funcionales.
- No hay `fiscal_chain_state` funcional.
- No hay XML AEAT.
- No hay transporte AEAT.
- No hay certificados.
- No hay produccion.
- No hay Supabase produccion.
- No hay Vercel config.
- No hay promote.
- No hay cambios de dominios, DNS ni aliases.

## 10. Queda para 2B.4B

2B.4B deberia planificarse como siguiente paso pequeño y mantener el mismo
criterio de aislamiento. Posibles focos:

- diseñar la operacion transaccional local/staging que reserve
  `fiscal_operations`;
- validar bloqueo optimista con `expectedDocumentVersion`;
- definir contratos de repositorio servidor para ejecutar la operacion sin
  tocar AEAT;
- añadir tests de concurrencia local/staging;
- mantener `fiscal_records`, cadena y transporte todavia fuera de produccion
  hasta que exista transaccion completa validada.

## 11. Validaciones previstas

Validaciones requeridas antes de abrir PR:

- `git diff --check`;
- `npm run check:migrations`;
- `npm run validate:phase2b2-server-schema`;
- `npm run validate:phase2b3e-ingest-route-safety`;
- `npm run validate:phase2b3g-controlled-ingest-route`;
- `npm run validate:phase2b3i-ingest-operational-hardening`;
- `npx vitest run src/lib/fiscal-operations/operation-builder.test.ts`;
- `npm test`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`.
