# Plan de fixtures sinteticos ejecutables VeriFactu 2B.5I

Fase:

`PHASE2B5I_SYNTHETIC_FIXTURES_EXECUTION_PLAN_V1`

Estado:

`PLAN DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`
- `docs/phase2b5h-safe-executable-implementation-plan-v1.md`

## Objetivo

Este documento define como se crearan mas adelante fixtures sinteticos
ejecutables sin XML completo. No crea fixtures, no crea archivos XML, no crea
factories ejecutables y no modifica codigo.

El objetivo es que una futura fase pueda rechazar fixtures inseguros antes de
cualquier XML, hash candidato, QR, firma o transporte.

## 1. Artefactos permitidos en futura fase ejecutable

En una fase futura aprobada podrian permitirse:

- descriptores TypeScript/JSON sinteticos;
- metadata sintetica;
- casos de prueba unitarios;
- factories de objetos internos;
- snapshots de resultado seguros sin XML completo;
- digests o resumenes;
- validadores que operen sobre descriptores, no sobre datos reales.

Todo artefacto deberia estar marcado como sintetico y no debe poder confundirse
con una factura, cliente, NIF, certificado, respuesta o XML real.

## 2. Artefactos prohibidos

Quedan prohibidos para la fase futura inicial:

- archivos `.xml`;
- XML completo en strings;
- datos reales;
- NIF real;
- factura real;
- PDF real;
- certificado;
- endpoints AEAT;
- respuestas AEAT reales;
- secretos;
- tokens;
- `transportable=true`;
- uso de `fiscal_transport_attempts`.

Si una prueba necesita representar estructura, debera hacerlo como descriptor
seguro y no como XML completo serializado.

## 3. Ubicacion futura sugerida

Ubicaciones candidatas para una fase futura:

- `src/lib/verifactu-synthetic-fixtures/`;
- `src/lib/verifactu-synthetic-fixtures/fixtures/`, solo si son descriptores sin
  XML;
- `scripts/validate-phase2b6a-synthetic-fixtures.mjs`.

Estas ubicaciones no quedan creadas en 2B.5I. Deben crearse solo en la fase
ejecutable aprobada y con alcance limitado.

## 4. Oleadas de fixtures

La matriz de 2B.5C deberia convertirse en oleadas futuras para reducir riesgo.

| Oleada | Casos | Objetivo | Limites |
| ------ | ----- | -------- | ------- |
| Oleada 1 | Alta basica, primer registro, segundo registro, anulacion basica. | Cubrir casos minimos de descriptor sintetico y encadenamiento conceptual. | Sin XML completo, sin datos reales, sin transporte. |
| Oleada 2 | NIF invalido, fecha invalida, falta serie/numero, hash mismatch. | Validar rechazo temprano de descriptores inseguros o incompletos. | Rechazo local, no validacion AEAT. |
| Oleada 3 | Rectificativa candidata, subsanacion candidata, importes limite, canonicalization error, campos condicionales pendientes. | Cubrir variantes mas sensibles solo despues de guardrails basicos. | Mantener campos pendientes como bloqueo, no como valores inventados. |

Cada oleada debe poder ejecutarse sin imprimir XML completo ni reconstruir una
factura real.

## 5. Validaciones futuras obligatorias

Una fase ejecutable deberia validar como minimo:

- prefijo `SYNTHETIC_ONLY`;
- `syntheticOnly=true`;
- no XML completo;
- no secrets;
- no endpoints AEAT;
- no certificados;
- no `transportable=true`;
- no `fiscal_transport_attempts`;
- no datos reales;
- no NIF real;
- no PDF real;
- no respuesta AEAT real;
- no campos obligatorios inventados si estan pendientes de fuente oficial.

Los validadores deben fallar cerrado. Si no pueden demostrar que un descriptor es
seguro y sintetico, deben rechazarlo.

## Resultado esperado

La futura implementacion debe poder rechazar fixtures inseguros antes de
cualquier XML. 2B.5I solo define ese plan; no crea artefactos ejecutables.
