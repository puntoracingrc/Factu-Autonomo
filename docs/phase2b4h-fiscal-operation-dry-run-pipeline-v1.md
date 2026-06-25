# Phase 2B.4H Fiscal Operation Dry-Run Pipeline v1

`PHASE2B4H_FISCAL_OPERATION_DRY_RUN_PIPELINE_V1`

## Objetivo

Crear un pipeline server-only de simulacion end-to-end que encadena:

1. reserva de operacion fiscal;
2. transicion `requested -> processing`;
3. construccion de material fiscal preliminar dry-run.

La fase sigue siendo preparatoria. No crea registros fiscales finales, no
actualiza cadena fiscal, no genera XML AEAT definitivo y no transporta nada.

## Modulo

`src/lib/fiscal-operation-pipeline/`

- `runFiscalOperationDryRunPipeline(...)`
- `buildFiscalOperationDryRunPlan(...)`
- `assertDryRunPipelineInput(...)`
- `classifyDryRunPipelineResult(...)`

El pipeline usa contratos ya existentes:

- `reserveFiscalOperation`;
- `markFiscalOperationProcessing`;
- `buildFiscalRecordMaterialDryRun`.

## Resultado seguro

El resultado devuelve solo metadatos:

- `operationId`;
- `invoiceIdentityId`;
- `serverDocumentId`;
- `operationType`;
- `dryRun: true`;
- resumen de material preliminar.

No devuelve payload completo, snapshot completo, XML, tokens ni errores internos
crudos.

## Limites explicitos

Esta fase no implementa:

- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`;
- XML AEAT definitivo;
- transporte AEAT;
- certificados reales;
- UI;
- facturas reales;
- numeracion real;
- PDFs historicos;
- Stripe, precios, planes, IA o importadores.

## Validacion

Comandos principales:

```bash
npm run validate:phase2b4h-fiscal-operation-dry-run-pipeline
npx vitest run src/lib/fiscal-operation-pipeline/dry-run-pipeline.test.ts
```

La prueba unitaria cubre:

- pipeline completo valido;
- operacion existente por idempotencia;
- conflicto de version;
- documento no elegible;
- ausencia de payload/snapshot completo, XML y tablas finales en la respuesta.
