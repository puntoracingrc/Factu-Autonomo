# Reparación AUD-P2-28 — proveedor único al guardar un lote

Fecha: 2026-07-12.

**Estado:** reparación en validación local desde `origin/main`
(`2fd6bba3182a88adc2c97025a045cfc8e76dde52`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Defecto confirmado

`handleSaveReadyScans` guardaba las facturas de una tanda de forma secuencial,
pero cada llamada a `saveScanPayload` resolvía el proveedor contra el mismo
`data.suppliers` capturado por el render. La primera factura sí añadía el
proveedor al `dataRef` del store; la segunda no consultaba ese estado nuevo y
creaba otro maestro con otro ID. Los dos gastos quedaban vinculados a
proveedores duplicados.

## Contrato reparado

- `upsertSupplierForExpense` es una transición pura sobre la colección de
  proveedores: devuelve la misma referencia al reutilizar y una nueva
  colección solo cuando crea una alta;
- `ensureExpenseSupplier` ejecuta esa transición dentro de
  `setAppData(prev => ...)`, por lo que cada factura consulta el estado vigente
  y recibe el `supplierId` realmente persistido;
- el escaneo pasa el nombre extraído y el NIF fiscal del documento, con
  precedencia de `purchaseDocument.supplierNif` sobre la sugerencia general;
- el mismo NIF, aunque cambien espacios, puntos, guiones, mayúsculas o el nombre
  OCR, reutiliza el proveedor;
- sin NIF, un nombre normalizado exacto reutiliza la alta de la misma tanda;
- si ambos NIF existen y difieren, una coincidencia exacta, similar o elegida
  previamente queda descartada: dos homónimos fiscales permanecen separados;
- un maestro legacy sin NIF no puede actuar como puente entre dos NIF: una
  factura con NIF conocido solo se autoenlaza a un maestro que acredita el
  mismo NIF;
- una sugerencia difusa por debajo del umbral automático no se convierte en
  fusión;
- una tanda `A, A, B` crea dos proveedores y enlaza los gastos como `A/A/B`.

## Fail-closed e integridad preservados

La validación `prepareExpenseVatForSave`, su retorno bloqueado, la detección de
factura ya registrada y la deduplicación interna del lote siguen ejecutándose
antes de resolver o crear el proveedor. Un gasto con IVA ambiguo o una factura
duplicada no deja un maestro huérfano. La actualización de un resumen pendiente
con su original conserva el flujo existente.

No se modifican importes, impuestos, deducibilidad, recargo de equivalencia,
allocations, documentos emitidos, snapshots, sellos, hashes, relaciones,
VeriFactu, Stripe, Supabase remoto, dominio, secretos ni datos reales. La
reparación solo afecta al maestro operativo de proveedores y al `supplierId`
del gasto que ya se iba a guardar.

## Contraste con trabajo previo

La rama histórica `codex/repair-provider-summary-batch-integrity` mezclaba
AUD-P2-26, AUD-P2-28, exportadores, fiscalidad y Rentabilidad Real en 42
archivos. No se reutiliza ni se publica. Este bloque reconstruye únicamente la
resolución fresca del proveedor sobre el `main` actual y conserva los guards de
IVA fail-closed implantados después.

## Evidencia local

- regresiones puras: mismo NIF con formatos/nombres distintos, nombre
  normalizado sin NIF, proveedor preexistente, NIF incompatibles, sugerencia
  difusa, maestro legacy sin NIF y tanda `A/A/B`;
- regresión de cableado: IVA bloqueado y factura duplicada retornan antes del
  upsert; el gasto usa el `supplierId` devuelto por la acción fresca;
- pruebas dirigidas de proveedores, IVA, duplicados, resúmenes, persistencia,
  diff cloud, copia y manual: 13 archivos y 220 pruebas aprobadas;
- suite completa: 451 archivos aprobados y 11 omitidos previstos; 3.044
  pruebas aprobadas y 17 omitidas;
- TypeScript, ESLint completo/dirigido y `git diff --check`: correctos;
- build de producción: correcto, 103 rutas;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- fixtures: 403 sintéticos válidos y 0 privados;
- servidor de producción local: `/gastos/nuevo`, `/gastos`, `/proveedores` y
  `/ayuda/gastos` responden 200; el manual renderizado contiene la regla de
  deduplicación del lote;
- dos revisiones adversariales independientes cerraron sin hallazgos P0, P1 o
  P2 después de cubrir el puente legacy sin NIF y todos los caminos de NIF del
  escaneo.

Quedan pendientes para cerrar el bloque el commit, PR, checks remotos, merge a
`main` y verificación pública posterior al despliegue.
