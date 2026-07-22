# ADR-0009: Política comercial de Afiliados y Partners

- Estado: aceptado para implementación; activación pendiente
- Versión: 1
- Fecha: 2026-07-22

## Contexto

`/afiliados` es un programa visible para usuarios que recomiendan Factu. El
programa Partners es profesional, privado, aprobado desde Admin y accesible solo
por sus URLs dedicadas. No hay afiliados ni Partners reales que migrar.

ADR-0007 protege la atribución, el pago verificado, la atomicidad y la
privacidad. Este ADR añade únicamente las reglas comerciales que deben aplicar
los bloques futuros. No activa recompensas, devengos ni transferencias y no
modifica el runtime existente.

## Decisión

### Reglas comunes

1. Afiliados y Partners siguen siendo programas separados. Una atribución solo
   puede pertenecer a uno de ellos y nunca puede generar valor en ambos.
2. Registro, clic, prueba, promoción gratuita o código introducido no generan
   recompensa ni comisión. Hace falta un pago elegible verificado por servidor.
3. Autorreferidos y atribuciones ausentes no son elegibles. Identidad incierta,
   atribución disputada, intervalo desconocido o importe inválido quedan en
   `review_required`; nunca se convierten en cero ni en una aprobación.
4. El importe comercial elegible es el realmente cobrado, sin IVA y después de
   descuentos. No se calculan recompensas o comisiones sobre ingresos supuestos.
5. Un reembolso o contracargo conocido antes del devengo bloquea el valor. Si el
   asiento ya existe, no se edita ni se borra: un bloque futuro debe registrar
   una reversión append-only, idempotente y auditable.

### Afiliados

1. La recompensa sigue siendo producto, no dinero: invitante e invitado reciben
   el mismo número de escaneos IA adicionales.
2. Cada mensualidad elegible equivale a cinco escaneos por persona. La ventana
   máxima es de doce mensualidades económicas por atribución.
3. En una anualidad no se fabrican doce cobros. Las mensualidades económicas se
   obtienen redondeando el ingreso anual elegible dividido por el precio mensual
   de lista del plan, con mínimo uno y máximo doce. Con los precios v1:
   - Pro anual de 49 EUR equivale a 8 meses y 40 escaneos por persona.
   - Pro+ IA anual de 149 EUR equivale a 10 meses y 50 escaneos por persona.
4. Si una recompensa anual supera lo que queda de la ventana, se recorta al
   saldo de meses pendiente. Tras doce meses equivalentes no nace más valor.
5. Cambio de plan, prorrateo u otra factura no ordinaria siguen fuera por
   ADR-0007. No se infieren meses a partir de eventos no elegibles.

### Partners beta

1. Partners permanece cerrado y por invitación. No se añade a la navegación ni
   se concede acceso a datos de clientes en esta fase.
2. La beta mantiene la configuración existente: 10 % sobre ingreso elegible y
   umbral de liquidación de 60 EUR.
3. El 10 % aplica mientras el Partner esté activo y el cliente atribuido siga
   produciendo pagos elegibles. Un Partner pausado no genera nuevos devengos.
   Cualquier porcentaje distinto requiere una nueva versión; no se acepta como
   configuración implícita de esta beta.
4. Devengo y pago automáticos permanecen desactivados. Alcanzar el umbral solo
   habilita revisión manual; no autoriza una transferencia.
5. La propuesta de 20 % durante el primer año y 10 % de mantenimiento queda
   diferida. Antes exige coste IA real por endpoint y plan, margen después de
   Stripe, tratamiento de reembolsos y aprobación comercial explícita.

## Economía v1

Con los precios actuales, el 10 % produce 59 céntimos por Pro mensual, 1,49 EUR
por Pro+ IA mensual, 4,90 EUR por Pro anual y 14,90 EUR por Pro+ IA anual. El
umbral de 60 EUR es conservador y comparable con programas del mercado, pero no
se presenta todavía como oferta pública.

La auditoría interna de 2026-07-04 observó 0,0017 USD de media por petición IA,
pero no separa escaneos ligeros, normales y pesados. Su escenario pesado estima
0,0805 USD por escaneo. Por eso esta versión acota Afiliados a doce meses
equivalentes y no aumenta todavía la comisión Partner.

## Activación y gates

`src/lib/referrals/program-policy.ts` es un contrato puro con estado
`not_activated`. Ningún adaptador de Stripe, RPC, migración, UI o proceso de pago
lo consume en esta fase.

Antes de activar Afiliados bajo esta política son obligatorios:

1. Adaptador servidor que aporte intervalo, plan, importe elegible y meses ya
   recompensados desde fuentes verificadas.
2. Persistencia idempotente del total de meses equivalentes y pruebas de
   concurrencia para no superar doce.
3. Política append-only de reembolsos y contracargos, sin saldos negativos
   silenciosos.
4. Copia de UI y condiciones coherentes con la recompensa mensual/anual real.

Antes de activar comisiones Partners son obligatorios:

1. Devengo append-only desde un cobro verificado, separado de Afiliados.
2. Estados `pending`, `available`, `paid` y `reversed` con transición auditable.
3. Base sin IVA y después de descuentos calculada por servidor.
4. Revisión contable y legal de condiciones, liquidaciones y datos de cobro.
5. Pago manual probado con fixtures sintéticos antes de cualquier automatización.

## Consecuencias

- Se corrige la asimetría conceptual entre mensual y anual sin multiplicar una
  anualidad descontada por doce cobros inexistentes.
- La exposición máxima de Afiliados queda acotada y calculable.
- Partners conserva una beta sencilla y coherente con el 10 % ya mostrado.
- Datos ausentes o discutidos paran el cálculo y requieren revisión.
- Cambiar porcentajes, ventana o equivalencias exige una nueva versión y pruebas.

## Regresiones de esta fase

- `src/lib/referrals/program-policy.test.ts`
- `src/lib/billing/affiliate-reward-protection.test.ts`
- `src/lib/billing/paid-referral-rewards.test.ts`
- `src/lib/partners/contracts.test.ts`
