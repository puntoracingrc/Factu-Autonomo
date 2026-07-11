# Reparación AUD-P1-13 — signos coherentes en abonos de gasto

Fecha: 2026-07-11.

**Estado:** reparación en validación local desde `origin/main`
(`f41d765d6f3ec7b59934a6ce0d466faad45d86ca`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Contrato firmado

`Expense.amount` sigue siendo la base registrada: positiva para una compra y
negativa para un abono, devolución o saldo a favor. No se aplica `abs`, no se
reescriben históricos y no hay migración. Los cálculos monetarios nuevos de
gastos redondean de forma simétrica para que una compra y su inverso exacto se
compensen también en medias centésimas.

Las líneas admiten bases finitas, no nulas y firmadas. Pueden coexistir líneas
positivas y negativas; su suma firmada debe conciliar con la cabecera dentro de
0,02 EUR. Se agrupan por tipo de IVA y cada grupo se redondea una vez. Así,
-100 EUR al 21 % y -100 EUR al 10 % producen base -200 EUR, IVA -31 EUR y
total -231 EUR. Un signo neto opuesto a la cabecera, evidencia de tipos en
conflicto incompleta, líneas inválidas o un descuadre no conciliable dejan el
gasto en `blocked`.

Los abonos escaneados siguen sin autoguardarse: requieren revisión humana. La
preparación de guardado ya no exceptúa los negativos de la validación. Un
conflicto bloqueado no puede mutar datos ni entrar en CSV/PDF. Sin líneas, o con
detalle incompleto que no contradice la cabecera, se conserva el fallback
legacy firmado.

## Propagación

El mismo importe firmado alimenta Panel, Gastos, Proveedores, Impuestos,
periodos, CSV de gastos, CSV trimestral, PDF anual, gastos vinculados y
Rentabilidad Real. Las superficies lo rotulan como gasto neto o
«Abono · saldo a favor»; barras y donuts no reciben porcentajes negativos. Los
exportes identifican cada abono y publican totales netos de gastos y abonos.

Los importadores conservan base, cantidad y tipo de IVA de créditos firmados.
Un abono vinculado revierte coste, base deducible e IVA deducible y aumenta el
margen en vez de convertirse en cero.

Si una importación trae base, cuota o total con signos/proporciones
incoherentes, se conserva esa evidencia como revisión bloqueada. No se degrada
silenciosamente a IVA 0 ni puede entrar en una exportación fiscal completa.

Se preservan las protecciones previas:

- AUD-P1-05 mantiene el IVA separado del resultado tras reservar IRPF.
- AUD-P1-06 mantiene base e IVA fiscales en 0 para un abono no deducible, pero
  revierte su coste económico íntegro.
- AUD-P1-07 sigue resolviendo por líneas y bloquea evidencia mixta conflictiva.
- PR #368 impide que cualquier abono alimente Productos, incluso si contiene
  una línea positiva.
- emisión, snapshots, sellos, huellas, relaciones históricas, VeriFactu y sus
  fallos cerrados no se modifican.

## Límites y hallazgos diferidos

- AUD-P1-09 continúa aparcado en su PR independiente hasta disponer de acceso a
  Stripe.
- AUD-P2-03 sigue diferido: no se regeneran capturas del manual.
- La etiqueta histórica «IVA neto a ingresar» del CSV trimestral cuando el
  saldo global es negativo sigue siendo el P2 ya diferido en AUD-P1-05/06; no
  es necesaria para corregir el signo de los abonos y no se mezcla en este PR.
- Validar de forma cerrada una cabecera legacy no finita o un tipo fuera de
  rango, sin evidencia de líneas, se registra como hallazgo P2 separado.
- La asignación parcial interactiva de un abono en Rentabilidad queda separada
  del cálculo canónico y del rediseño visual de vínculos; el importe completo
  firmado sí se propaga y queda cubierto por regresión.
- El corte de una fila extraordinariamente larga entre páginas del PDF anual
  permanece como P3 diferido.
- No se modifican `DocumentList.tsx`, `DocumentLinkManagerButton.tsx`,
  Supabase, Stripe, dominio, secretos ni datos reales.

## Evidencia

- regresiones dirigidas de núcleo, UI, importadores, consumidores,
  exportaciones y manual: 296 aprobadas y 2 omitidas previstas;
- suite completa: 446 archivos aprobados y 11 omitidos; 2.950 pruebas
  aprobadas y 17 omitidas;
- batería específica de integridad documental, snapshots, rectificativas,
  fiscalidad y VeriFactu: 84 archivos, 678 pruebas aprobadas y 6 omitidas;
- TypeScript, ESLint completo y `git diff --check`: correctos;
- convenciones de 25 migraciones/16 rollbacks y 403 fixtures sintéticos:
  correctos, sin datos privados;
- build de producción: correcto, 103 páginas;
- PDF anual sintético: A4, una página, tres movimientos (compra, abono mixto y
  abono no deducible); etiquetas, siete columnas e importes firmados legibles,
  sin solapes ni recortes;
- QA visual local con workspace demo aislado en Panel, Gastos, Proveedores e
  Impuestos: saldo a favor, badge de abono y cifras netas correctos, sin anchos
  CSS negativos, errores de consola relevantes ni desbordamiento a 390 px.

Quedan pendientes para el cierre del bloque el PR, sus checks remotos, el merge
a `main` y la verificación de producción sobre el commit fusionado.
