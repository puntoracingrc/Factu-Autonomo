# Follow-up de auditoría — reprogramación recurrente fail-closed

Fecha: 2026-07-12.

**Estado:** reparación validada localmente y rebasada sobre `origin/main`
(`f0ca0380f779cae6caed127b527ed6e666f2510b`). El cierre definitivo requiere
PR, checks remotos verdes, merge a `main` y verificación de producción.

## Defecto confirmado

Al editar una regla recurrente desde una fecha efectiva, la transición anterior
podía conservar cargos con las fechas del calendario viejo y reescribirlos para
el tramo nuevo. Después, la sincronización generaba también las fechas del
calendario nuevo. Un cambio de fin de mes a día 15 podía, por tanto, duplicar o
reinterpretar ocurrencias ya materializadas.

El mismo traslado implícito cambiaba claves de procedencia y movía exclusiones
al identificador del tramo nuevo. Eso impedía distinguir con seguridad entre un
cargo histórico, una edición manual y un placeholder futuro.

## Contrato reparado

- la fecha lógica de una ocurrencia se obtiene exclusivamente de una
  `recurringOccurrenceKey` válida y coherente con `recurringExpenseId`; nunca se
  infiere por proveedor, descripción, importe ni por la fecha editable del
  gasto;
- una vista previa pura clasifica el cambio como `ready`, `manual_review` o
  `not_found` y produce una precondición determinista;
- la aplicación vuelve a calcular la vista previa contra el estado vigente y
  solo devuelve `applied` si coincide exactamente con la precondición aprobada;
  si los datos cambiaron, devuelve `blocked/stale_preview` sin mutarlos;
- fechas imposibles, IDs de regla duplicados y colisiones del ID del tramo
  nuevo —incluida procedencia huérfana— fallan cerrados;
- cualquier cargo materializado, exclusión, procedencia incompleta o clave
  duplicada desde la fecha efectiva bloquea la operación para revisión manual;
- ningún `Expense` existente se borra, desplaza de fecha, reescribe ni cambia de
  identificador, timestamps o procedencia;
- un cambio seguro cierra el tramo anterior el día previo y abre otro. Solo se
  materializan ocurrencias realmente ausentes del tramo nuevo; la operación no
  sincroniza ni materializa reglas ajenas;
- un cambio mensual o trimestral conserva la cadencia original mediante
  `scheduleAnchorDate`; una recurrencia legacy sin ese campo usa `startDate` sin
  migración al cargar. Si cambia la frecuencia, el tramo nuevo ancla su cadencia
  en la fecha efectiva;
- la operación repetida con la misma vista previa queda bloqueada como obsoleta
  y no produce una segunda transición.

La pantalla explica que todo lo anterior a la fecha efectiva permanece intacto
y que una vista previa bloqueada no guarda cambios. El manual mantiene el mismo
contrato.

## Persistencia y sincronización

`scheduleAnchorDate` es un campo opcional y aditivo dentro de
`RecurringExpense`. Su ausencia conserva el comportamiento legacy. El
round-trip local mantiene el valor cuando existe y el diff cloud publica los
dos tramos de una segmentación segura sin publicar cambios sobre gastos
históricos.

El actualizador genérico de reglas se sustituye por una operación estrecha que
solo pausa o activa por ID. Los cambios de calendario, importe o duración ya no
tienen una vía de UI/store que evite la vista previa y su precondición.

No se añade ninguna reparación automática a `load`, normalización, demo o
sincronización remota. No se ejecutan escrituras contra Supabase remoto.

## Integridad y límites preservados

No se modifican importes fiscales ya registrados, IVA, deducibilidad,
Rentabilidad Real, documentos emitidos, snapshots, sellos, hashes, relaciones,
VeriFactu, Stripe, Supabase remoto, calendario fiscal, navegación, AppShell,
dominio, secretos ni datos reales. El error React #418 observado durante el QA
de AUD-P2-14 queda fuera de este bloque.

Se releyeron el informe maestro de auditoría y el resumen específico de
VeriFactu fail-closed antes de editar. La transición nueva falla cerrada ante
cualquier duda de procedencia y no relaja ninguna protección documental.

## Hallazgo derivado diferido

La revisión detectó una deuda previa distinta: `saveData` captura errores de
`localStorage` y la UI puede cerrar tras actualizar memoria antes de confirmar
que el cambio se escribió. El PR #387 redujo el riesgo de cuota mediante
compresión y aseguró la transición `Expense + RecurringExpense`, pero no hizo
observable un fallo final de `setItem`.

No se mezcla aquí porque exige rediseñar el contrato de persistencia y su
feedback transversal. El follow-up deberá inyectar un fallo de almacenamiento,
devolver un resultado durable o bloqueado y mantener/revertir el formulario sin
mostrar falso éxito.

## Evidencia local

- pruebas dirigidas de dominio, formulario, persistencia, diff cloud y manual:
  5 archivos y 120 pruebas aprobadas;
- matriz cubierta: mensual, trimestral legacy, cambio de frecuencia, anual,
  febrero bisiesto, cargos materializados, exclusiones, procedencia ambigua,
  claves duplicadas, ancla inválida, fechas imposibles, IDs duplicados o
  colisionados, regla ajena pendiente, precondición obsoleta y doble ejecución;
- TypeScript, ESLint dirigido y `git diff --check`: correctos;
- suite completa: 480 archivos aprobados y 11 omitidos previstos; 3.455
  pruebas aprobadas y 17 omitidas;
- ESLint completo y TypeScript: correctos;
- build de producción: correcto, 106 páginas generadas;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- fixtures: 403 sintéticos válidos y 0 privados;
- contrato del manual: 6 archivos y 34 pruebas aprobadas. La cobertura visual
  sigue bloqueada de forma honesta con 0/30 PNG aprobados y permanece en
  AUD-P2-03/AUD-P2-04;
- el caso cloud confirma que una segmentación segura solo publica el cierre del
  tramo viejo y el alta del nuevo, conserva el ancla al rehidratar y produce diff
  vacío cuando la operación queda bloqueada; el array de gastos históricos
  queda idéntico.
- dos revisiones independientes detectaron los endurecimientos de fechas, IDs,
  exclusiones y sincronización dirigida; todos quedaron corregidos y repetidos
  en la batería verde. No quedan hallazgos bloqueantes dentro del perímetro.

Quedan pendientes el PR, sus checks remotos, merge a `main` y el cierre de
producción.
