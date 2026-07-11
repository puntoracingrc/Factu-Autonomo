# Reparación AUD-P1-07 — IVA mixto en gastos

Fecha: 2026-07-11.

**Estado:** reparación implementada localmente desde `origin/main`
(`5d0b93078deb3e6993335dbd0b685cfae07adfef`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Contrato de cálculo

`Expense.amount` continúa siendo la base registrada y `Expense.ivaPercent` la
cabecera compatible con históricos. No se añade un segundo desglose persistido
ni se aplica una migración. Para gastos positivos:

- un `purchaseLines` completo, con tipos válidos y cuya base concilia con
  `amount` dentro de 0,02 EUR, gobierna el IVA incluso con un único tipo;
- las bases se agrupan por tipo y la cuota se redondea una vez por grupo;
- 100 EUR al 21 % y 100 EUR al 10 % producen base 200 EUR, IVA 31 EUR y total
  231 EUR;
- sin líneas, o con un detalle incompleto que no contradice la cabecera, se
  conserva el fallback documentado de cabecera;
- si una línea contradice la cabecera, el estado es `blocked`; también se
  bloquea cuando hay varios tipos y el detalle es incompleto, inválido o no
  concilia. La interfaz exige revisión y CSV/PDF fallan de forma cerrada.

El origen (`lines`, `header` o `blocked`), el desglose y el motivo se derivan en
tiempo de ejecución. No se reescriben gastos históricos ni datos reales.

Los gastos fijos u ocurrencias recurrentes no deducibles preservan AUD-P1-06:
`amount` ya es el coste íntegro, el IVA fiscal es 0 y las líneas documentales se
conservan sin gobernar el total. Los perfiles exentos también conservan los
tipos leídos, aunque el cálculo fiscal aplique IVA 0. Un mixto bloqueado usa la
cabecera solo para control económico, aporta IVA deducible 0 y bloquea la
exportación.

## Propagación y trazabilidad

El cálculo central alimenta Impuestos, total/listado/gráficos de Gastos,
Proveedores, panel de negocio, gastos vinculados, Rentabilidad Real y sus
adaptadores. Los resúmenes enlazados distinguen coste económico, base deducible
e IVA deducible; el caso mixto 200/31/231 queda cubierto.

La alta manual, edición, escaneo, inbox y guardado por lotes validan el desglose
antes de crear proveedores o mutar datos. Un lote no autoguarda un gasto
bloqueado. La UI muestra base, cuota, total, tipos y origen; el CSV de Gastos se
deshabilita si el filtro contiene un conflicto.

Los CSV de gastos y trimestre publican tipos aplicados, desglose y origen. El
PDF anual mantiene siete columnas y añade la trazabilidad al tratamiento. El
resumen fiscal cuenta gastos por líneas, por cabecera/importe íntegro y
bloqueados.

Holded conserva líneas de compra con IDs deterministas y
`catalogProduct: false`; un tipo ilegible no se convierte en 0. FacturaDirecta,
que no aporta líneas de compra, conserva cabecera y muestra un aviso explícito.

## Límites frente al resto de la auditoría

- AUD-P1-13 sigue pendiente: abonos y negativos conservan deliberadamente el
  contrato de cabecera y no se reescriben en este bloque.
- AUD-P1-09 continúa aparcado en su PR independiente hasta disponer de acceso a
  Stripe.
- AUD-P2-03 sigue diferido: no se regeneran capturas del manual.
- El corte de una fila muy larga entre páginas del PDF anual continúa como
  hallazgo P3 diferido; las columnas y la nueva trazabilidad sí se verificaron
  sin recortes en un fixture representativo.
- Transportar el motivo `vatBlocked` a todos los informes no fiscales de
  Rentabilidad/Home queda como mejora P2; Impuestos y exportaciones ya fallan
  de forma cerrada y el detalle de líneas muestra el aviso.
- No se modifican `DocumentList.tsx`, `DocumentLinkManagerButton.tsx`, emisión,
  snapshots, huellas, VeriFactu, Supabase, Stripe, dominio ni datos reales.

## Evidencia local

- fiscalidad, UI, exportaciones e importadores: 199 aprobadas y 2 omitidas
  previstas;
- Rentabilidad Real, recurrencias y resumen de negocio: 143/143;
- VeriFactu, integridad documental y derivados: 545/545;
- suite completa: 2.914 aprobadas y 17 omitidas;
- TypeScript, ESLint y `git diff --check`: correctos;
- build de producción: correcto, 103 páginas;
- manual completo: 14/14;
- render PDF sintético: A4, siete columnas y etiquetas de IVA mixto legibles,
  sin solapes ni recortes en el caso representativo.
