# Follow-up AUD-P2-26 — reconciliación reversible de repartos legacy

Fecha: 2026-07-12.

**Estado:** reparación en validación local desde `origin/main`
(`e9892d099553d66c6251aaa917e9adaf4f848d02`). El cierre definitivo requiere
commit, PR, checks remotos verdes, merge a `main` y verificación pública.

## Defecto acotado

Antes de AUD-P2-26, una compra pendiente de 100 EUR de base, 21 EUR de IVA y
5,20 EUR de recargo tenía `operatingCost = 100`. Un reparto explícito completo
guardaba por tanto 100 EUR. Después de conservar el recargo, el coste canónico
es 126,20 EUR, pero los lectores respetan correctamente el importe explícito y
no pueden saber por sí solos si los 100 EUR eran un reparto completo antiguo o
un importe parcial deliberado.

Los vínculos sin `workAllocations` no tienen el defecto: derivan 126,20 EUR del
canon actual. Las allocations nuevas también usan ya el coste actual.

## Detección fail-closed

No existe migración al cargar. La vista previa solo clasifica como segura una
allocation antigua cuando todas estas pruebas coinciden:

1. el resumen pendiente aporta un recargo legacy oficial e inequívoco; no hay
   campos explícitos nuevos de recargo ni bloqueo fiscal;
2. la suma firmada de las allocations reproduce, con tolerancia monetaria, el
   `operatingCost` anterior a AUD-P2-26;
3. la diferencia hasta el coste actual queda explicada exactamente por el IVA
   y recargo no recuperables;
4. todas las líneas de compra tienen ID y base válidos, y su base reconcilia con
   el gasto;
5. los IDs forman una partición completa entre trabajos, sin duplicados,
   ausencias ni líneas desconocidas;
6. cada importe reproduce la proporción histórica de base de sus líneas;
7. cada documento de trabajo existe una sola vez y todos los signos coinciden.

Quedan intactos y marcados para revisión los repartos parciales, sin líneas,
manuales, ya versionados, con referencias colgantes, importes o signos
incompatibles, líneas incompletas/duplicadas, gastos fijos y cualquier evidencia
fiscal bloqueada. Un recargo explícito creado después de P2-26 no es candidato.

## Plan, aplicación y rollback

`expense-work-allocation-cost-repair.ts` implementa fronteras puras:

- `buildExpenseWorkAllocationRepairPreview`: conteo, IDs, costes antes/después,
  candidatos seguros y casos excluidos;
- `applyExpenseWorkAllocationCostRepair`: vuelve a comprobar fingerprints y
  cambia únicamente `Expense.workAllocations` y su registro de auditoría;
- `buildExpenseWorkAllocationRollbackPreview`: solo habilita deshacer cuando el
  estado actual coincide exactamente con el después guardado;
- `rollbackExpenseWorkAllocationCostRepair`: restaura byte-semánticamente las
  allocations anteriores y añade un evento append-only.

Las precondiciones usan SHA-256 sobre una serialización canónica recursiva. Así
siguen siendo estables si un payload `jsonb` reordena claves y ocupan un tamaño
constante, sin copiar dos veces todas las líneas dentro del metadato.

El reparto nuevo usa proporción de base y largest remainder simétrico, con
desempate por el orden original. Así 60/40 produce 75,72 + 50,48 y los tercios
producen 42,07 + 42,07 + 42,06, siempre con suma exacta 126,20. IDs, orden,
líneas, `allocatedAt`, `updatedAt`, `workDocumentId`, `workAllocationClosed` y
datos fiscales permanecen iguales.

Cada allocation creada o actualizada en adelante conserva
`fullAmountAtAllocation`: el `operatingCost` canónico firmado usado en ese
upsert. No cambia todavía el comportamiento de ningún lector.

La acción visible vive en **Cuenta > Copias**, después de la copia manual. Con
0 afectados no hay CTA. Con candidatos muestra la vista previa, recomienda una
copia y exige confirmación explícita. `replaceDataIfCurrent` evita aplicar un
plan si AppData cambió mientras el usuario lo revisaba.

## Integridad y límites preservados

- no se modifican documentos, relaciones fiscales, snapshots, PDF snapshots,
  sellos, hashes, estados de integridad ni evidencia Veri*Factu;
- no se tocan `taxes.ts`, exportadores, `document-links`, consumidores de
  rentabilidad ni overrides locales de Rentabilidad Real;
- no se ejecuta en load, normalización o demo;
- no hay migraciones ni consultas directas a Supabase, cambios de Stripe,
  dominio, secretos o datos reales;
- el diff ordinario queda limitado a la entidad `expense`, por lo que una cuenta
  que ya sincroniza puede transportar el mismo payload sin cambiar esquema.

## Evidencia local

- batería dirigida/adversarial de reparación, allocations, gastos, listado,
  Rentabilidad Real, persistencia, backup, cloud, integridad y Veri*Factu:
  61 archivos y 614 pruebas aprobadas;
- suite completa: 450 archivos aprobados y 11 omitidos previstos; 3.029
  pruebas aprobadas y 17 omitidas;
- manual: 5 archivos y 17 pruebas aprobadas;
- TypeScript y ESLint completo: correctos;
- build de producción: correcto, 103 rutas;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- `/cuenta` y `/ayuda/cuenta` responden HTTP 200 en el build local; la ayuda
  contiene la explicación de la reparación explícita;
- `git diff --check`: correcto;
- dos revisiones adversariales finales no encontraron P0, P1 ni P2 residual en
  el motor de reparación;
- el controlador visual integrado no estuvo disponible, por lo que no se hizo
  QA visual interactiva. No se usaron credenciales ni datos reales.

La acción usa el guardado ordinario de AppStore. Como `saveData` todavía absorbe
un fallo excepcional de `localStorage`, la UI comunica «actualizado en esta
sesión» y ofrece exportar una copia del estado reparado; no afirma persistencia
durable sin poder comprobarla. Cambiar el contrato global de storage/AppStore
queda fuera de este PR atómico.
