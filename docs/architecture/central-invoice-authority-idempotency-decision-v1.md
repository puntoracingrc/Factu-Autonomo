# Decision de idempotencia de emision central V1

Marcador: `CENTRAL_INVOICE_AUTHORITY_IDEMPOTENCY_DECISION_V1`

Estado: implementacion local pura. No habilita rutas, migraciones, Supabase
remoto ni emision fiscal real.

## Objetivo

Definir la decision que debe tomar el futuro ledger `central_invoice_commands`
cuando llega una peticion de emision central:

- si no existe entrada previa, reservar el comando;
- si existe la misma peticion confirmada, devolver el resultado ya confirmado;
- si existe la misma clave con contenido distinto, rechazar;
- si la misma peticion sigue procesando, esperar o consultar de nuevo;
- si la misma peticion fallo antes del commit, permitir reintento controlado.

## Invariante fiscal

Una clave de idempotencia no puede crear dos facturas. Un timeout posterior al
commit debe reproducir la identidad tecnica ya confirmada, y una reutilizacion
contradictoria de la clave queda bloqueada antes de tocar la serie fiscal.

## Seguridad

La decision solo transporta resumen seguro: hashes, IDs tecnicos sinteticos y
estado. No expone NIF, clave de idempotencia en claro, sesion, payload completo,
PDF, XML, certificados ni secretos.

## Validacion

- Modulo: `src/lib/central-invoice-authority/issue-idempotency.ts`.
- Tests: `src/lib/central-invoice-authority/issue-idempotency.test.ts`.
- Validador: `npm run validate:central-invoice-authority-idempotency`.
