# Cierre AUD-P1-19 — idempotencia del webhook Stripe

Fecha: 2026-07-13.

**Estado:** cerrado. La reparación está fusionada, desplegada y verificada en
Stripe TEST y en el dominio canónico. No se creó ningún pago ni se modificaron
datos reales.

## Riesgo original

El webhook podía dejar un evento indefinidamente en `processing`, responder
como si un reintento fuese un duplicado ya resuelto y acreditar dos veces un
pack si el crédito se concedía antes de cerrar el evento. Tampoco distinguía de
forma suficiente el pago asíncrono ni el estado efectivo del Checkout.

## Reparación desplegada

El cierre se repartió en tres PR atómicos:

- [#424](https://github.com/puntoracingrc/Factu-Autonomo/pull/424), merge
  `4e9df6f450af2ea016437c1ff372ace7cca1c12f`: las nuevas sesiones de pack
  declaran la procedencia persistente `scan_pack_atomic_v1`;
- [#426](https://github.com/puntoracingrc/Factu-Autonomo/pull/426), merge
  `b64a2cabcb89379534037dd918ecd33b13b4b57e`: ledger durable, leases
  recuperables, concesión atómica e idempotente por efecto, comprobación de
  pago y soporte de `checkout.session.async_payment_succeeded`;
- [#463](https://github.com/puntoracingrc/Factu-Autonomo/pull/463), commit
  funcional `c174f081657affeef2765beae074422fbf2116d5`, merge
  `47496332b0561ca13320f5395f4b71a7ed5d87d7`: frontera conservadora para el
  intervalo en que ya se emitía la marca v1 pero el worker atómico aún no
  estaba garantizado en el dominio.

Solo una sesión v1 con `created >= 1783906500`
(`2026-07-13T01:35:00Z`) puede acreditarse automáticamente. Una sesión
anterior, sin fecha o sin la procedencia exacta queda durablemente en revisión
manual; el webhook no suma créditos a ciegas ni reabre efectos ya procesados.

## Verificación en Stripe TEST

La comprobación se realizó en el entorno de prueba del Dashboard de Stripe,
sin copiar el secreto de firma ni identificadores de clientes, requests o
eventos.

El endpoint `https://facturacion-autonomos.app/api/webhooks/stripe` estaba
activo, con API `2026-06-24.dahlia` y exactamente estos seis eventos:

1. `checkout.session.async_payment_succeeded`;
2. `checkout.session.completed`;
3. `customer.subscription.deleted`;
4. `customer.subscription.updated`;
5. `customer.updated`;
6. `invoice.paid`.

La vista de entregas mostraba 0 entregas totales y 0 fallidas. La consulta de
todas las Checkout Sessions de TEST devolvió `data: []` y `has_more: false`.
En Eventos no había ningún evento Checkout y en los logs API no había ningún
`POST /v1/checkout/sessions`.

Por tanto, en el intervalo ambiguo completo
`2026-07-13T00:44:40.892Z`–`2026-07-13T01:35:00Z` hubo:

- 0 Checkout Sessions;
- 0 eventos Checkout;
- 0 efectos de packs que reconciliar.

Los únicos eventos TEST observados ese día eran tres eventos sintéticos del
ciclo de vida de un customer, todos con `livemode=false`, sin Checkout ni
pago. La única orden ejecutada en Stripe Shell fue la consulta de listado; no
se creó, confirmó, reembolsó ni canceló ningún pago.

## Validación de código y producción

La entrega final #463 pasó:

- suite completa: 578 archivos aprobados y 11 omitidos; 4.726 pruebas
  aprobadas y 17 omitidas;
- 40/40 regresiones dirigidas de Stripe;
- ESLint, TypeScript y build de producción;
- 26 migraciones y 17 rollbacks convencionales;
- 403/403 fixtures sintéticos, sin fixtures privados;
- Quality, Supabase Acceptance y CodeQL;
- el job de `main` Production Domain, incluidos Wait, Assign y Verify.

La evidencia remota corresponde al
[run CI 29247419562](https://github.com/puntoracingrc/Factu-Autonomo/actions/runs/29247419562),
al
[run CodeQL 29247419075](https://github.com/puntoracingrc/Factu-Autonomo/actions/runs/29247419075)
y al deployment de producción `5423783530`, todos sobre el merge final.

El dominio canónico sirvió el merge `47496332...`; una petición al webhook con
firma inválida devolvió 400, confirmando que la frontera pública sigue
fail-closed.

## Conclusión y límites

AUD-P1-19 queda cerrado: los reintentos recuperan leases sin perder eventos,
los packs usan un efecto atómico e idempotente, solo se acredita un Checkout
pagado y la ventana histórica ambigua ha sido reconciliada en Stripe TEST con
cero sesiones afectadas.

No se usaron pagos reales, datos reales, Supabase remoto ni secretos. Este
cierre no modifica documentos emitidos, snapshots, sellos, hashes, VeriFactu o
cálculos fiscales.
