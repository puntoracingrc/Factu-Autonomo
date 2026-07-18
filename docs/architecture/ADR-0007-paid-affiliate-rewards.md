# ADR-0007: Recompensas de Afiliados ligadas a pagos verificados

- Estado: aceptado
- Versión: 1
- Fecha: 2026-07-18

## Contexto

Afiliados permite que un usuario invite a otros autónomos y que ambos reciban
créditos IA. Partners es un programa profesional distinto, con comisiones y su
propio libro mayor. Compartir infraestructura de códigos no puede mezclar las
recompensas ni convertir el registro de cuentas en saldo gratuito explotable.

## Decisión

### Atribución sin valor económico

1. Abrir un enlace, crear una cuenta o introducir un código solo registra una
   atribución. Nunca concede créditos, comisiones, planes ni módulos.
2. Cada cuenta solo puede tener una atribución y nadie puede utilizar su propio
   código. Afiliados y Partners quedan identificados expresamente en la
   atribución y sus recompensas nunca se cruzan.
3. El código se resuelve en servidor y no se aceptan identidades, planes,
   importes o estados aportados por el navegador como prueba de pago.

### Pago elegible

1. Una recompensa de Afiliados solo nace de un webhook de Stripe con firma
   válida y evento `invoice.paid`.
2. La factura debe pertenecer a una suscripción activa, usar un Price conocido
   de Factu, coincidir en usuario, Customer y Subscription con el estado
   persistido, estar denominada en EUR y tener un importe realmente pagado de
   al menos 1,99 EUR.
3. Solo se admiten el primer cobro de suscripción (`subscription_create`) y la
   renovación ordinaria (`subscription_cycle`), con cobro automático y nunca
   marcado como pagado fuera de Stripe. Alta gratuita, prueba, promoción a cero,
   cambio/prorrateo, factura fallida, impagada o manual no generan recompensa.
4. Un plan mensual puede premiar cada renovación mensual confirmada. Un plan
   anual solo premia cuando se confirma su pago anual; nunca se fabrican premios
   mensuales sin una factura pagada.

### Atomicidad, replays y privacidad

1. Un RPC privado `service_role` inserta un asiento append-only y concede los
   mismos créditos a invitante e invitado dentro de una única transacción.
2. Stripe Event e Invoice son identidades únicas. Un replay idéntico es
   idempotente; una reutilización con datos distintos bloquea toda la operación.
   Nunca puede acreditarse solo a uno de los dos usuarios.
3. El libro mayor no es legible por `anon` ni `authenticated`. El panel expone
   únicamente agregados: registrados, activos de pago, inactivos, desglose por
   plan y créditos obtenidos; nunca emails ni identidades de invitados.
4. Reembolsos y contracargos no retiran créditos automáticamente en esta
   versión. Requieren un flujo futuro, explícito, auditable e idempotente; no se
   permite editar o borrar silenciosamente el libro mayor existente.

### Protección contra abuso

1. Crear cuentas falsas sin pagar no produce valor. El pago mínimo y el Price
   conocido hacen que una cuenta adicional deba realizar un cobro real válido.
2. Autorreferidos, múltiples códigos por cuenta, eventos repetidos, facturas
   repetidas, Customer ajeno, metadata discordante y planes desconocidos quedan
   bloqueados en servidor.
3. Los endpoints de perfil y canje conservan autenticación confirmada y límites
   de peticiones. Los logs y respuestas no exponen el libro mayor ni datos de
   terceros.

## Consecuencias

- El usuario entiende cuántos invitados están registrados y cuántos mantienen
  una suscripción, sin acceder a datos personales ajenos.
- Los créditos siguen el dinero realmente confirmado y no el clic o el alta.
- Partners conserva su contabilidad independiente.
- Cualquier futura ventaja distinta debe añadir un contrato versionado; no
  puede reutilizar el canje de código como autorización de valor.

## Regresiones obligatorias

Los cambios en referidos, Afiliados, Partners, promociones, Stripe, planes,
créditos IA o migraciones deben superar:

- `src/lib/billing/affiliate-reward-protection.test.ts`
- `src/lib/billing/paid-referral-rewards.test.ts`
- `src/lib/billing/referrals.test.ts`
- `src/app/api/webhooks/stripe/route.test.ts`
- `src/components/referrals/affiliates-ui-contract.test.ts`
- `src/components/promotions/promotion-ui-contract.test.ts`
- `src/lib/protected-system-invariants-contract.test.ts`

Una auditoría o refactor no puede volver a premiar registros, mezclar Partners
con Afiliados, confiar en el cliente o debilitar la atomicidad sin autorización
expresa y una nueva versión de este ADR.
