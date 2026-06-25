# Phase 2B.4I Fiscal Dry-Run Pipeline Local Acceptance v1

`PHASE2B4I_FISCAL_DRY_RUN_PIPELINE_LOCAL_ACCEPTANCE_V1`

## Objetivo

Validar dinamicamente contra Supabase local el pipeline dry-run completo:

1. reserva fiscal;
2. transicion `requested -> processing`;
3. construccion de material fiscal preliminar dry-run.

## Alcance

La fase es local y server-only. No usa Supabase produccion, no usa staging
remoto, no conecta AEAT real y no usa certificados reales.

## Comandos

```bash
npm run validate:phase2b4i-fiscal-dry-run-local-acceptance
npm run test:phase2b4i-fiscal-dry-run-local
```

`test:phase2b4i-fiscal-dry-run-local` exige Supabase local activo y falla si
detecta una URL no local.

## Supabase Local

- Disponible en la validacion local: si.
- Resultado: `npm run test:phase2b4i-fiscal-dry-run-local` OK.
- Produccion: no usada.
- Staging remoto: no usado.

## Casos Probados

- Alta inicial dry-run completa.
- Idempotencia con la misma `idempotencyKey`.
- Operacion ya en `processing`.
- Conflicto de version con `expectedDocumentVersion` antiguo.
- `alta_subsanacion` dry-run.
- `anulacion` dry-run.
- Tablas fiscales finales sin escrituras.
- Respuesta segura sin payload completo, snapshot completo, XML, token ni stack.

## Tablas Tocadas

- `auth.users` para usuario efimero local.
- `server_documents` para documento efimero local.
- `fiscal_invoice_identities` para identidad fiscal local.
- `fiscal_operations` para operaciones locales dry-run.

## Tablas No Tocadas

- `fiscal_records`.
- `fiscal_chain_state`.
- `fiscal_transport_attempts`.

## Limites

- No hay XML AEAT definitivo.
- No hay transporte AEAT.
- No hay registros fiscales finales.
- No hay cadena fiscal real.
- No hay UI.
- No hay facturas reales.
- No hay numeracion real.
- No hay PDFs historicos.

## Riesgos Vivos

- El pipeline sigue siendo material preliminar dry-run.
- La aceptacion prueba Supabase local, no certifica cumplimiento AEAT.
- Fases posteriores deben disenar registros inmutables, cadena, XML definitivo
  y transporte por separado.

## Pendiente Para 2B.4J

- Definir siguiente capa de persistencia fiscal final o un dry-run mas cercano
  al registro inmutable, manteniendo separada la conexion AEAT real.

## Confirmaciones

- No Supabase produccion.
- No staging remoto.
- No AEAT real.
- No certificados reales.
- No VeriFactu funcional productivo.
- No XML AEAT definitivo.
- No transporte AEAT.
- No escrituras en `fiscal_records`.
- No escrituras en `fiscal_chain_state`.
- No `fiscal_transport_attempts`.
- No UI.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No Vercel config.
- No promote.
- No dominios, DNS ni aliases.
- No Stripe, precios ni planes.
- No IA.
- No importadores.
