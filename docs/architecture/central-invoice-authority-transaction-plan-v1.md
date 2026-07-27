# Plan transaccional de emision central V1

Marcador: `CENTRAL_INVOICE_AUTHORITY_TRANSACTION_PLAN_V1`

Estado: implementacion local pura. No habilita rutas, migraciones, Supabase
remoto ni emision fiscal real.

## Objetivo

Fijar el orden minimo que debera ejecutar la futura RPC de emision central para
que ningun navegador pueda duplicar una factura:

1. derivar usuario, dispositivo y sesion en servidor;
2. reservar o resolver idempotencia;
3. bloquear el borrador local;
4. verificar version esperada y huella;
5. bloquear la serie fiscal;
6. asignar la siguiente identidad fiscal dentro de la transaccion;
7. congelar el documento emitido;
8. confirmar el resultado idempotente;
9. encolar outbox de sincronizacion;
10. publicar aviso realtime solo despues del commit.

## Invariante fiscal

La identidad fiscal no puede venir del cliente. El cliente manda una intencion
idempotente sobre un borrador; el servidor valida y bloquea antes de asignar la
siguiente identidad.

## Scope de bloqueo de serie

El bloqueo de serie se define por:

- usuario;
- entorno;
- hash del NIF emisor;
- codigo de serie;
- ejercicio fiscal.

Esta clave evita mezclar pruebas con produccion y permite coexistencia futura de
varias series sin compartir contadores.

## Seguridad

El plan solo expone resumen seguro. No contiene NIF en claro, claves de
idempotencia, sesion, payload completo, XML, PDF, certificados ni secretos.

## Validacion

- Modulo: `src/lib/central-invoice-authority/issue-transaction-plan.ts`.
- Tests: `src/lib/central-invoice-authority/issue-transaction-plan.test.ts`.
- Validador: `npm run validate:central-invoice-authority-transaction-plan`.
