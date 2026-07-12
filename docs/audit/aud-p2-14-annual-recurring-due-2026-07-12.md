# Reparación AUD-P2-14 — vencimiento anual coherente

Fecha: 2026-07-12.

**Estado:** reparación validada localmente desde `origin/main`
(`8cc687ecb2ba92fc3bd6dcdd9a11cd52bf277c43`). El cierre definitivo requiere
commit, PR, checks remotos verdes, merge a `main` y verificación de producción.

## Defecto confirmado

Las dos entradas de alta de un gasto fijo no representaban el mismo contrato:

- `/gastos/fijos` ofrecía día 1, día 15, último día y día concreto, pero
  bloqueaba al guardar el último día de un gasto anual, aunque el dominio sí lo
  soportaba;
- `/gastos/nuevo` forzaba `day_of_month` al elegir frecuencia anual y mostraba
  siempre un campo «Mes y día». Si después se elegía día 1 o día 15, el día
  numérico continuaba visible pero el guardado lo ignoraba; último día volvía a
  quedar bloqueado.

Además, la etiqueta de una regla anual resolvía febrero contra el año fijo
2026: «28 de febrero» describía mal una regla de último día que materializa el
29 en años bisiestos. Una recurrencia legacy sin `dueMonth` se ejecutaba en el
mes de `startDate`, pero ambos formularios la hidrataban como enero y podían
cambiar su calendario al editarla.

## Contrato reparado

- las dos pantallas ofrecen y guardan las mismas cuatro reglas: día 1, día 15,
  último día o día concreto del mes de vencimiento;
- una frecuencia anual muestra siempre `Mes del año` y solo muestra el número
  de día cuando la regla elegida es `day_of_month`;
- no se fuerza ni se bloquea ninguna de las cuatro reglas al cambiar a anual;
- el motor conserva el mes elegido y ajusta un día inexistente al último día
  real del mes, incluidos 28/29 de febrero;
- la etiqueta conserva la semántica: «Último día de febrero» no se convierte
  en un 28 fijo; un día solicitado que puede no existir explica que usará el
  último disponible;
- un dato legacy sin mes explícito sigue usando el mes de su fecha de inicio.
  El fallback se calcula para mostrar/guardar y no muta automáticamente los
  datos durante `load`, normalización, backup o sincronización.

El manual y el inventario de controles recogen el mismo contrato.

## Integridad y límites preservados

No se modifican importes, IVA, deducibilidad, fiscalidad, Rentabilidad Real,
documentos emitidos, snapshots, sellos, hashes, relaciones, VeriFactu, Stripe,
Supabase remoto, dominio, secretos ni datos reales. Se releyeron el informe
maestro y el resumen fail-closed antes del bloque; ninguna puerta de integridad
se relaja.

AUD-P2-15 permanece separado: solo se retiran las dos alertas que contradecían
el contrato anual; el resto de validaciones con `alert()` no cambia.

AUD-P2-03 continúa diferido sin cambios porque el controlador del navegador
integrado no está disponible. El verificador de #398 mantiene las capturas del
manual en fail-closed; este bloque no aprueba ni regenera PNG.

## Hallazgo derivado, reservado a otro bloque

La inspección adversarial detectó una deuda previa distinta: al cambiar el
calendario de una plantilla que ya tiene ocurrencias materializadas,
`applyRecurringExpenseChangeToData` conserva las fechas antiguas del tramo y
`syncRecurringExpenses` puede añadir también las nuevas. Por ejemplo, cambiar
fin de mes por día 15 desde el inicio puede dejar ambos calendarios.

No se corrige aquí para no mezclar la UX anual con una migración de ocurrencias
históricas. El follow-up debe fijar explícitamente qué cargos futuros se
reprograman, cuáles históricos se conservan y cómo se mantienen IDs,
exclusiones y claves sin duplicados antes de editar el motor.

## Evidencia local

- pruebas dirigidas de dominio, ambas superficies, persistencia y manual: 5
  archivos y 99 pruebas aprobadas;
- casos anuales: las cuatro reglas, febrero no bisiesto/bisiesto, día 31,
  etiqueta semántica, mes inválido y recurrencia legacy sin `dueMonth`;
- round-trip local: las cuatro variantes conservan `dueTiming` y `dueMonth`;
- suite completa: 480 archivos aprobados y 11 omitidos previstos; 3.439
  pruebas aprobadas y 17 omitidas;
- TypeScript, ESLint completo/dirigido y `git diff --check`: correctos;
- build de producción: correcto, 106 páginas generadas;
- servidor de producción local: `/gastos/fijos`, `/gastos/nuevo` y
  `/ayuda/gastos` responden 200; el HTML del manual contiene la regla anual;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- fixtures: 403 sintéticos válidos y 0 privados;
- contrato del manual: 6 archivos y 34 pruebas aprobadas. El estado visual
  continúa bloqueado de forma honesta con 0/30 PNG aprobados hasta AUD-P2-03.
- dos revisiones independientes cerraron sin hallazgos bloqueantes y
  confirmaron que P2-15 e integridad/VeriFactu permanecen fuera del diff.

Quedan pendientes para cerrar el bloque el PR, sus checks remotos, merge a
`main` y verificación pública posterior al despliegue.
