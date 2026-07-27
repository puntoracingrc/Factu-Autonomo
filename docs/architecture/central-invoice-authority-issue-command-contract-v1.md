# Contrato de comando de emision central V1

Marcador: `CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT_V1`

Estado: implementacion local pura. No habilita rutas, migraciones, Supabase
remoto, Realtime ni emision fiscal real.

## Objetivo

Preparar el sobre minimo que el navegador enviara a la autoridad central cuando
se active la emision por servidor. El contrato separa lo que el cliente puede
proponer de lo que el servidor debe decidir.

## Entrada permitida

- Usuario, dispositivo y sesion derivados por servidor.
- Clave de idempotencia estable.
- ID local del borrador, version esperada y huella del borrador.
- Entorno, NIF emisor, serie y ejercicio.
- Fecha/hora de emision solicitada.
- Para rectificativas, identidad tecnica de la factura rectificada.

## Decisiones que NO toma este contrato

- No asigna secuencia.
- No compone numero fiscal definitivo.
- No congela snapshot.
- No escribe tablas.
- No lee Supabase.
- No publica eventos.
- No activa UI ni endpoint.

La secuencia, identidad definitiva, snapshot congelado, auditoria y outbox
siguen reservados para una RPC transaccional futura `issue_invoice_v1`.

## Seguridad

El resumen seguro solo puede exponer hashes e identificadores tecnicos
necesarios para auditar la peticion. No muestra NIF, clave de idempotencia en
claro, sesion, payload completo, PDF, XML, certificados ni secretos.

## Validacion

- Modulo: `src/lib/central-invoice-authority/issue-command.ts`.
- Tests: `src/lib/central-invoice-authority/issue-command.test.ts`.
- Validador: `npm run validate:central-invoice-authority-issue-command`.
