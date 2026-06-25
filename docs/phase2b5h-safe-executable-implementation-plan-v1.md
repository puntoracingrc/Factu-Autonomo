# Plan de implementacion ejecutable segura VeriFactu 2B.5H

Fase:

`PHASE2B5H_SAFE_EXECUTABLE_IMPLEMENTATION_PLAN_V1`

Estado:

`PLAN DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5b-internal-xml-contract-v1.md`
- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`
- `docs/phase2b5e-official-artifacts-registry-v1.md`
- `docs/phase2b5f-certificate-signature-policy-v1.md`
- `docs/phase2b5g-transport-responses-retry-boundary-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## 1. Objetivo

Este documento define el plan de entrada a codigo ejecutable seguro despues del
cierre documental 2B.5. Su objetivo es ordenar el primer bloque futuro de codigo
sin cruzar todavia hacia XML real, firma, certificados, transporte, AEAT real ni
produccion.

Este documento confirma:

- no codigo en esta fase;
- no XML real;
- no archivos XML completos;
- no fixtures ejecutables todavia;
- no QR definitivo;
- no firma;
- no certificados;
- no transporte;
- no AEAT real;
- no produccion.

2B.5H no autoriza implementacion. Solo deja criterios para que una futura fase
ejecutable empiece por guardrails y datos sinteticos, no por integraciones
externas ni material final.

## 2. Primera fase ejecutable recomendada

La primera fase futura recomendada es:

`PHASE2B6A_SYNTHETIC_FIXTURE_GUARDRAILS_V1`

Objetivo futuro:

crear guardrails ejecutables para fixtures sinteticos, sin crear XML completo.

La fase 2B.6A podria tocar, con aprobacion explicita:

- `src/lib/verifactu-synthetic-fixtures/`;
- scripts de validacion;
- tests unitarios;
- docs de fase;
- `package.json`.

La fase 2B.6A no deberia tocar:

- Supabase;
- migraciones;
- AEAT;
- certificados;
- transporte;
- `fiscal_transport_attempts`;
- UI;
- ViDA;
- Vercel config.

La prioridad de 2B.6A deberia ser impedir datos reales, XML completo, endpoints
externos, secretos y estados transportables antes de crear cualquier descriptor
o validador mas rico.

## 3. Roadmap futuro de codigo

El siguiente roadmap es solo documental. Cada fase futura requiere decision
explicita, PR separado y validaciones propias.

| Fase futura | Objetivo | Limites |
| ----------- | -------- | ------- |
| 2B.6A | Guardrails de fixtures sinteticos. | Sin XML completo, sin AEAT, sin certificados, sin transporte, sin Supabase. |
| 2B.6B | Descriptors JSON/TS sinteticos, sin XML completo. | Solo datos ficticios `SYNTHETIC_ONLY`; sin strings XML finales. |
| 2B.6C | Validadores locales de descriptor. | Validacion interna, no validacion AEAT ni cumplimiento productivo. |
| 2B.6D | Canonicalizacion candidata con datos sinteticos. | Reglas candidatas separadas de hash interno y sin material completo en logs. |
| 2B.6E | Hash/huella candidata local con fixtures sinteticos. | No equivale a huella oficial hasta validacion y aprobacion separadas. |
| 2B.6F | Serializacion XML candidata en memoria. | Sin persistir ni imprimir XML completo; sin archivos `.xml`. |
| 2B.6G | Validacion local de XML candidato contra reglas fijadas. | Validacion local, no respuesta AEAT ni autorizacion de uso real. |
| 2B.6H | Checkpoint antes de QR/firma/transporte. | Debe bloquear QR, firma, certificados y transporte hasta revision explicita. |

Ninguna fase del roadmap debe convertir `fiscal_records.record_hash` en huella
oficial ni usar evidencia local como cola de transporte.

## 4. Criterios de entrada para codigo

Antes de crear codigo ejecutable debe existir:

- PR documental 2B.5H-M fusionado;
- fuente, esquema y canonicalizacion aceptados como suficientes para la fase;
- decision explicita del usuario;
- confirmacion de que no se toca AEAT, certificados ni transporte;
- arbol local limpio o cambios ViDA aislados y fuera del commit;
- lista de archivos permitidos por fase;
- criterios de salida verificables;
- politica de no impresion de XML completo ni secretos.

Si cualquiera de estos criterios falta, la fase ejecutable debe esperar.

## 5. Criterios de parada

Una futura fase ejecutable debe detenerse si:

- aparece XML completo en logs;
- aparece certificado;
- aparece endpoint AEAT;
- aparece `transportable=true`;
- aparece `fiscal_transport_attempts`;
- aparece dato real;
- aparece NIF real;
- aparece factura real;
- aparece PDF real;
- aparece respuesta AEAT real;
- aparece secreto o token;
- se requiere tocar Supabase, migraciones, UI, ViDA o Vercel config fuera del
  alcance aprobado.

Detener significa no seguir implementando, no commitear material inseguro y
revisar el alcance antes de continuar.

## Resultado esperado

2B.5H debe dejar preparada la entrada prudente a codigo. La siguiente fase
recomendada es `PHASE2B6A_SYNTHETIC_FIXTURE_GUARDRAILS_V1`, limitada a
guardrails de fixtures sinteticos y sin XML completo.
