# Reparación AUD-P1-05 — resultado tras reservar IRPF

Fecha: 2026-07-11.

**Estado:** reparación implementada y validada localmente desde `origin/main`
(`c04b536a73623d9dd61c691f08ab157abcb19bee`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Causa y contrato corregido

El resumen calculaba las bases de ventas y gastos sin IVA, pero después restaba
también el IVA a pagar del resultado. Eso mezclaba una posición fiscal de IVA
con un resultado de actividad ya calculado sin IVA y publicaba la mezcla como
«beneficio neto aproximado».

El contrato quedó separado así para gastos deducibles y AUD-P1-06 lo amplía
después para preservar también el coste económico no deducible:

- `operatingExpenseCost` suma base deducible y coste completo no deducible;
- `grossProfit = salesBase - operatingExpenseCost`;
- `estimatedIrpfBase = salesBase - expenseBase` deducible;
- `irpfEstimate` solo se calcula sobre una `estimatedIrpfBase` positiva;
- `profitAfterIrpfReserve = grossProfit - irpfEstimate`;
- `netIva`, `ivaToPay` e `ivaCredit` permanecen como posición de IVA separada.

Para ventas con base 1.000 EUR, gastos con base 50 EUR e IRPF del 20 %, el
resultado antes del IRPF es 950 EUR, la reserva estimada es 190 EUR y el
resultado tras reservarla es 760 EUR. El IVA a pagar de 199,50 EUR se muestra
aparte y no vuelve a descontarse de esas bases.

La UI, el CSV trimestral, el PDF anual, el adaptador de Rentabilidad Real, el
manual y la documentación técnica usan el mismo contrato, refinado por P1-06,
y la etiqueta «Resultado económico tras reservar IRPF». Las exportaciones
conservan sus bloqueos cuando la evidencia fiscal está incompleta o dañada.

## Límites frente al resto de la auditoría

- AUD-P1-06 se resuelve en su bloque independiente posterior; no reabre la
  separación de IVA ya cerrada aquí.
- AUD-P1-07 sigue pendiente: no cambia el desglose de facturas de gasto con IVA
  mixto.
- AUD-P1-13 sigue pendiente: no cambia signos de abonos ni cálculos del Panel.
- AUD-P1-09 continúa aparcado en su PR independiente hasta verificar Stripe.
- AUD-P2-03 sigue diferido: no se modifica el sistema de capturas del manual; el
  texto visible de la captura actual permanece sin cambios.
- Nuevo hallazgo P2 diferido: el CSV trimestral conserva la etiqueta fija «IVA
  neto a ingresar» cuando el saldo firmado es negativo. La cifra no causa
  AUD-P1-05 y cambiar su contrato de signo/etiqueta queda fuera de este PR.

No se modifican emisión, snapshots, huellas, relaciones de rectificación,
VeriFactu, selección fiscal canónica, Supabase, Stripe, dominio ni datos reales.

## Evidencia local previa al PR

- regresiones dirigidas de cálculo, UI, CSV, PDF, adaptador y manual: 42/42;
- manual: 13/13;
- VeriFactu, integridad documental y PDF: 433/433;
- suite completa: 2.804 aprobadas y 17 omitidas;
- ESLint, TypeScript y build de producción con 103 rutas: correctos.
