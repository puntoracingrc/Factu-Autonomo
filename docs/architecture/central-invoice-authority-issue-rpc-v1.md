# Central Invoice Authority Issue RPC V1

Marker: `CENTRAL_INVOICE_AUTHORITY_ISSUE_RPC_V1`

Esta fase anade la primera RPC privada de emision central. No cambia la web,
no activa rutas, no llama desde el navegador y no toca las facturas existentes.
Solo deja preparada la operacion atomica que mas adelante podra usar una API de
servidor.

## Contrato

`public.issue_central_invoice_v1` solo puede ejecutarse con `service_role`.
Recibe una orden ya validada por servidor: usuario, dispositivo, hash de sesion,
hash de idempotencia, hash de peticion, borrador local, version esperada, scope
de serie y snapshots ya calculados.

La funcion ejecuta estos pasos dentro de una unica transaccion de Postgres:

1. valida el rol `service_role` y rechaza datos incompletos;
2. reserva o reusa el comando idempotente bajo indice unico;
3. bloquea el borrador con `for update`;
4. exige que version y huella esperadas sigan coincidiendo;
5. bloquea el scope de serie con `for update`;
6. incrementa `last_sequence` y reserva la identidad fiscal;
7. congela snapshot y hash emitido;
8. encola un evento en `central_invoice_outbox`;
9. marca el comando como `committed`;
10. devuelve el resultado confirmado o `replayed` si la misma orden ya habia
    terminado.

## Seguridad

La RPC usa `security definer` con `set search_path = ''`, revoca ejecucion a
`public`, `anon` y `authenticated`, y concede solo a `service_role`. El cuerpo
tambien comprueba `auth.role() <> 'service_role'` para fallar cerrado si alguien
intentara invocarla fuera del backend.

La clave de idempotencia nunca se guarda en claro: solo se acepta
`p_idempotency_key_hash`. El resultado reutilizable queda asociado a
`central_invoice_commands`, y un reintento con la misma clave pero otro
`request_hash` falla antes de tocar la serie.

## Estado de activacion

Esta fase no es una activacion productiva. Falta todavia:

- adaptador TypeScript servidor para invocar la RPC;
- API route privada;
- prueba de concurrencia contra Supabase Acceptance;
- puente de migracion desde borradores locales;
- bandera de activacion y rollout por cuenta.
