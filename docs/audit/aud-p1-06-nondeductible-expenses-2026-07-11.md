# Reparación AUD-P1-06 — gastos no deducibles

Fecha: 2026-07-11.

**Estado:** reparación implementada localmente desde `origin/main`
(`641de60bf381664ad5595c0e475c4233c405ecbe`). El cierre definitivo requiere
validaciones locales completas, checks remotos verdes, merge a `main` y
verificación de producción.

## Contrato fiscal y económico

Los gastos legacy o marcados como deducibles conservan base e IVA deducibles.
Un gasto marcado como no deducible permanece en control, balance y rentabilidad,
pero aporta cero a las bases fiscales. Su IVA no recuperable forma parte del
coste económico.

El resumen separa expresamente:

- `operatingExpenseCost`: base para un gasto deducible y base más IVA para uno
  no deducible;
- `grossProfit = salesBase - operatingExpenseCost`;
- `estimatedIrpfBase = salesBase - expenseBase` deducible;
- `irpfEstimate`: porcentaje configurado sobre `estimatedIrpfBase` positiva;
- `profitAfterIrpfReserve = grossProfit - irpfEstimate`;
- `netIva`, `ivaToPay` e `ivaCredit`: posición de IVA independiente.

Así, un coste no deducible reduce el beneficio económico y el resultado tras
reservar IRPF, pero no reduce la base ni la reserva fiscal estimada.

La UI, el CSV trimestral, el PDF anual, el manual y la documentación técnica
publican coste económico, base deducible y base estimada para IRPF con etiquetas
distintas. Las exportaciones mantienen sus bloqueos de integridad fiscal.

Rentabilidad Real conserva el coste completo en margen y caja, pero transporta
por separado si el coste directo o fijo es fiscalmente deducible. El reparto
parcial no cambia esa clasificación; el reparto de fijos prorratea la parte
deducible incluso con importe manual. Las tarjetas muestran la base estimada
para IRPF antes de la provisión.

Para plantillas recurrentes `non_deductible`, `amount` sigue significando el
importe íntegro y cualquier porcentaje de IVA residual se ignora. La regla
activa y su ocurrencia histórica mensualizan el mismo coste. Un valor de
deducibilidad desconocido conserva el coste económico, pero falla cerrado para
base e IVA fiscales y se identifica como no desgravable.

## Límites frente al resto de la auditoría

- AUD-P1-07 sigue pendiente: no se modela el desglose de IVA por línea en una
  factura de gasto ni se cambia el fallback de cabecera legacy.
- AUD-P1-13 sigue pendiente: no se modifica el signo de abonos en Panel,
  Impuestos, exportaciones o catálogo.
- AUD-P2-03 sigue diferido: no se regeneran capturas del manual. Las capturas de
  CSV/PDF solo muestran el botón y la de gastos fijos conserva el error ya
  inventariado; no se usan como evidencia de este cierre.
- Hallazgo visual P3 diferido: una fila de gasto anual con textos muy largos
  puede partirse entre páginas en el PDF. Las columnas caben y no se recortan,
  pero la continuación no repite todos los campos de contexto.
- Se mantiene diferida la etiqueta fija «IVA neto a ingresar» del CSV cuando
  el saldo es negativo; su contrato de signo pertenece al hallazgo P2 ya
  registrado con AUD-P1-05.
- AUD-P1-09 continúa aparcado en su PR independiente hasta verificar Stripe.
- No se modifican emisión, snapshots, huellas, PDF documental, rectificaciones,
  VeriFactu, Supabase, Stripe, dominio ni datos reales.

## Evidencia local

- archivos modificados con pruebas dirigidas: 184/184;
- Rentabilidad Real completa: 307/307;
- manual completo: 14/14;
- VeriFactu, integridad documental, PDF y exportación canónica: 295/295;
- suite completa: 2.847 aprobadas y 17 omitidas;
- TypeScript, ESLint y `git diff --check`: correctos;
- build de producción: correcto, 103 rutas generadas;
- convenciones de migraciones Supabase: 25 migraciones y 16 rollbacks
  correctos, sin crear ni aplicar migraciones;
- render visual sintético del PDF anual: dos páginas sin recortes de columnas;
  AUD-P2-03 permanece fuera de esta evidencia.
