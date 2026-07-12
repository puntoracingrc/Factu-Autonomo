# Reparación AUD-P2-26 — recargo de equivalencia en resúmenes de proveedor

Fecha: 2026-07-12.

**Estado:** reparación en validación local desde `origin/main`
(`1204b587a432da68c36f86a42e4c0fd9f3b76304`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Defecto confirmado

El parser conservaba una fila de 100 EUR de base, 21 EUR de IVA, 5,20 EUR de
recargo y 126,20 EUR de total. Al crear el gasto solo persistía base, tipo de
IVA, cuota de IVA y total; el cálculo canónico reconstruía 100 + 21 y todos los
consumidores recibían 121 EUR. El recargo desaparecía del listado, Panel,
proveedor, impuestos, exportaciones y rentabilidad vinculada.

## Contrato reparado

- `Expense.providerSummary` conserva tipo y cuota de IVA, tipo y cuota de
  recargo y total documental como magnitudes separadas;
- `expenseTotals` respeta el total exacto del resumen pendiente y añade el
  recargo una sola vez al completar con la factura original;
- `expenseFiscalAmounts` publica 126,20 EUR como `registeredTotal` y
  `operatingCost`, con 5,20 EUR de recargo separado;
- como IVA y recargo no son recuperables en esta compra, el gasto deducible
  orientativo de IRPF es 126,20 EUR y la base e IVA deducibles en IVA son cero;
- un abono conserva los signos: -100 - 21 - 5,20 = -126,20 EUR;
- los resúmenes legacy todavía pendientes que conservaban total e IVA recuperan
  el recargo mediante `total - base - IVA` solo si la pareja IVA/recargo coincide
  inequívocamente con un tipo oficial, sin reescribir datos;
- CSV, PDF anual, previsualización y listado muestran el recargo de forma
  trazable y separada, y distinguen gasto IRPF de base deducible en IVA;
- signo, cuota/tipo, IVA/base y total se reconcilian con tolerancia monetaria;
  una contradicción queda **por revisar** y bloquea la exportación fiscal;
- el parser acepta los dos órdenes de columnas observados para `%Rec`, `R.E.` y
  total, pero rechaza una fila de seis importes si ninguno cuadra; los abonos se
  validan con sus cuotas firmadas.

La AEAT describe que el proveedor repercute el recargo además del IVA y de
forma separada sobre la misma base, y que al IVA del 21 % le corresponde un
recargo del 5,2 %:

- <https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-06-regimenes-especiales-iva/regimen-especial-recargo-equivalencia/aplicacion-recargo-equivalencia.html>
- <https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-06-regimenes-especiales-iva/regimen-especial-recargo-equivalencia/tipos-recargo-equivalencia.html>

También indica que las cuotas de IVA soportado y recargo no deducibles en IVA
pueden formar parte del gasto deducible en IRPF:

- <https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/gastos-fiscalmente-deducibles/tributos-fiscalmente-deducibles.html>

## Reparto entre trabajos

El bloque no modifica `expense-work-allocations`, `document-links` ni
`document-list-profitability`.

- un vínculo legacy completo mediante `workDocumentId` adopta 126,20 EUR;
- una asignación nueva usa `operatingCost` y reparte 60/40 como 75,72 + 50,48,
  sin sumar IVA o recargo después;
- una asignación explícita antigua que ya cubre todas las líneas no aparece
  como un candidato falso para repartir los 26,20 EUR de diferencia.

Queda un gap distinto y acotado: esa asignación explícita antigua conserva su
importe persistido de 100 EUR frente al nuevo canon de 126,20 EUR. No se
reinterpreta ni migra silenciosamente. Un follow-up atómico deberá definir
detección inequívoca, vista previa y contaje de afectados, idempotencia,
reversibilidad y regresiones de asignaciones totales y parciales antes de tocar
el modelo de repartos.

## Integridad y límites preservados

No se modifican documentos emitidos, snapshots, sellos, hashes, relaciones
históricas, VeriFactu, envío real, Supabase, Stripe, dominio, secretos ni datos
reales. El recargo es metadato del gasto operativo y no entra en el contenido
fiscal inmutable de facturas emitidas.

Este bloque trata únicamente gastos cuyo resumen aporta evidencia de recargo.
No añade una preferencia global de régimen fiscal por perfil o actividad ni
altera la fiscalidad de ventas. Por eso el Panel rotula el importe como gasto
deducible orientativo de IRPF, no como base de IVA, y no presenta una factura
aislada como configuración completa del régimen. Esa modelización general, si
se necesita, permanece como trabajo separado.

## Evidencia local

- pruebas dirigidas de parser, cálculo, Panel, proveedores, impuestos,
  reparto, Rentabilidad, persistencia local/cloud/copia, CSV, PDF y manual:
  24 archivos y 356 pruebas aprobadas;
- suite completa: 448 archivos aprobados y 11 omitidos previstos; 3.003
  pruebas aprobadas y 17 omitidas;
- batería específica de integridad documental, fiscalidad, exportadores y
  VeriFactu: 57 archivos y 515 pruebas aprobadas;
- manual y cableado fail-closed de Gastos/Impuestos: 7 archivos y 26 pruebas
  aprobadas;
- TypeScript, ESLint completo y `git diff --check`: correctos;
- build de producción: correcto, 103 rutas;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- fixtures: 403 sintéticos válidos y 0 privados;
- el controlador visual integrado no estuvo disponible; la UI quedó cubierta
  mediante build, TypeScript y regresiones de cableado, sin usar credenciales.

Quedan pendientes para cerrar el bloque el commit, PR, checks remotos, merge a
`main` y verificación pública posterior al despliegue.
