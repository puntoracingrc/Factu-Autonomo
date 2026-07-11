# Reparación AUD-P2-29 — rectificativa positiva en Panel

Fecha: 2026-07-11.

**Estado:** reparación en validación local desde `origin/main`
(`9114d224afa5bc3fdaa3be67cb093ed9e43cd9f6`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Defecto confirmado

El resumen operativo excluía correctamente la factura original mediante
`rectifiedById`, pero también descartaba indiscriminadamente cualquier factura
rectificativa. Para una original de base 100 EUR sustituida por una corrección
de base 50 EUR, el Panel mostraba facturado e IVA a cero aunque la misma
rectificativa ya figuraba como 60,50 EUR pendientes de cobro.

## Contrato reparado

- una factura original sustituida continúa fuera del facturado vigente;
- una rectificativa emitida de tipo `correccion`, con total positivo e
  integridad utilizable, ocupa su lugar una sola vez;
- una rectificativa de `anulacion` no se presenta como nueva facturación;
- borradores, documentos anulados, relaciones bloqueadas y documentos en
  cuarentena permanecen fuera;
- facturado, IVA de ventas, cobrado, pendiente y balance parten del mismo
  reemplazo operativo.

El Panel sigue siendo una vista orientativa, no un resumen fiscal. No se cambia
la periodificación canónica de Impuestos ni la regla ya cerrada en AUD-P1-01:
las anulaciones se compensan con signo y las correcciones interperiodo no se
inventan como diferencias fiscales.

## Integridad preservada

La elegibilidad reutiliza la puerta de cobro, que rechaza documentos bloqueados
o en cuarentena, y los importes continúan pasando por `documentAmounts`. Un
documento emitido usa el tipo de rectificación y el resumen fiscal congelados
cuando la integridad lo requiere; una alteración de campos vivos no los cambia
y un documento marcado `snapshotIntegrity: blocked` aporta cero.

No se modifican `taxes.ts`, emisión, snapshots, sellos, relaciones históricas,
VeriFactu, huellas, exportadores, Stripe, Supabase, dominio, secretos ni datos
reales. Se mantienen los cierres P1/P2/P3 previos y el contrato fail-closed del
resumen VeriFactu leído antes de esta reparación.

## Límites y pendientes contrastados

- AUD-P1-09 y AUD-P1-19 continúan aparcados hasta recuperar acceso a Stripe;
- AUD-P2-03 sigue pendiente: este bloque alinea el contenido del manual, pero
  no regenera el inventario completo de capturas;
- la asignación parcial de gastos se mantiene en su rama independiente y no se
  tocan `types.ts`, `expenses.ts`, Rentabilidad Real ni vínculos documentales;
- no se habilitan las capacidades contenidas de reparación histórica,
  aplicación de restore admin ni remisión VeriFactu real.

## Evidencia local

- regresión original + reemplazo: 1 emitida, 60,50 EUR facturados, 10,50 EUR
  de IVA, 60,50 EUR pendientes y balance 60,50 EUR;
- regresión de anulación y corrección bloqueada: cero emitidas, facturado e IVA
  a cero;
- regresión sellada y pagada: conserva 60,50 EUR facturados/cobrados y 10,50
  EUR de IVA ante cambios en líneas o tipo rectificativo vivos; cuarentena a
  cero;
- pruebas dirigidas de resumen, ingresos, periodos, manual y fiscalidad: 73
  aprobadas;
- suite completa: 448 archivos aprobados y 11 omitidos; 2.974 pruebas
  aprobadas y 17 omitidas;
- batería específica de integridad documental, snapshots, rectificativas,
  fiscalidad y VeriFactu: 64 archivos y 615 pruebas aprobadas;
- manual: 16 pruebas aprobadas;
- convenciones de 25 migraciones/16 rollbacks y 403 fixtures sintéticos:
  correctas, sin datos privados;
- TypeScript, ESLint completo/dirigido y `git diff --check`: correctos;
- build de producción: correcto, 103 páginas;
- manual de usuario y documentación técnica alineados con la nueva regla.

Quedan pendientes para cerrar el bloque el PR, sus checks remotos, merge a
`main` y verificación de producción.
