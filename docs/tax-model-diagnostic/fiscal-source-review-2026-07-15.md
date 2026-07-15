# Revisión de fuentes del ruleset fiscal · 2026-07-15

## Estado

- Ruleset revisado: `es-common.2025.2026-07-15.v2` y
  `es-common.2026.2026-07-15.v2`.
- Territorio: común AEAT.
- Revisión técnica contra fuentes oficiales: completada.
- Aprobación nominal de profesional fiscal: pendiente.
- Estado publicable del contrato: `PENDING_FISCAL_REVIEW`.

Esta revisión no sustituye la aprobación profesional exigida por
`operations-and-qa.md`. Hasta que exista una aprobación nominal y trazable, el
selector público debe conservar `ruleReviewState = PENDING_FISCAL_REVIEW` y los
consumidores deben mantener la vista completa como fallback efectivo.

## Fuentes y criterios comprobados

Se contrastaron en AEAT o BOE, entre otros, los siguientes grupos:

- obligación anual de IRPF y alta en RETA durante el ejercicio;
- pagos fraccionados 130/131 y excepción del 70 % por clase de actividad;
- IVA periódico 303, operaciones no periódicas 309 y resumen anual 390;
- retenciones 111/190, 115/180, 123/193 y no residentes 216/296;
- ROI, operaciones intracomunitarias y periodicidad mensual o trimestral del 349;
- alta, cambio y baja OSS/IOSS mediante 035 y presentación del 369 mientras el
  alta siga vigente, incluso sin operaciones;
- exclusiones del 347, incluido que el SII debe cubrir todo el ejercicio cuando
  sea la causa de exclusión;
- Sociedades 200/202 y atribución de rentas 184;
- supuestos especiales 308/341 y obligaciones personales 714/720/721.

Las referencias exactas están versionadas en `sources.ts` y cada regla declara
sus `officialSourceIds` en `rules.ts`.

## Cambios de seguridad incorporados

1. El modelo 100 ya no se descarta por la mera ausencia de RETA o actividad
   personal: el test no cubre todas las demás rentas que pueden obligar a
   presentar Renta.
2. `OTHER_SPECIAL` deja de activar automáticamente el 303. Un régimen especial
   sin identificar conserva el resultado como dato pendiente.
3. El 390 conserva la duda si el 303 no está resuelto y eleva a conflicto una
   respuesta que afirme SII pero niegue expresamente la exoneración anual.
4. REDEME y SII ya no convierten en mensuales los modelos de retenciones. Para
   111, 115, 123 y 216 solo se usa la condición censal relevante disponible.
5. El 349 no inventa periodicidad ni períodos: queda por confirmar entre mensual
   y trimestral con el volumen de operaciones.
6. El 369 se mantiene requerido mientras el alta OSS/IOSS siga vigente, aunque
   no haya ventas en el período.
7. El 347 no se excluye por una respuesta genérica de SII: exige confirmar que
   todas las operaciones están excluidas, incluido el alcance temporal.
8. La atribución de rentas no permite elegir por sí sola entre 130 y 131.
9. Un único porcentaje de retenciones no se usa para excluir el 130 cuando se
   mezclan bases profesionales y agrarias.
10. La pregunta de inversión del sujeto pasivo se limita a facturas recibidas
    en las que el usuario es quien debe declarar el IVA.

## Aprobación profesional todavía necesaria

La aprobación debe registrar como mínimo:

- nombre del profesional fiscal revisor;
- fecha y referencia de la aprobación;
- alcance expreso: ejercicios 2025 y 2026, territorio común y 27 códigos;
- versión exacta de ruleset revisada;
- aceptación o corrección de cada hallazgo anterior;
- constancia de que los perfiles positivo, negativo, excepción, incompleto,
  conflicto censal y frontera anual son suficientes para cada regla.

Solo después se cambiarán todas las reglas del ejercicio a `APPROVED`. La función
`taxRuleSetReviewState()` mantiene el cierre automático si falta una sola regla.

## Persistencia y consumidores

Los resultados ya guardados conservan la versión y el estado con los que fueron
confirmados. No se reescriben automáticamente. Tras aprobar un ruleset, el
usuario debe volver a guardar el diagnóstico para publicar un assessment nuevo.

Calendar y Modelos AEAT ya consumen el selector público de forma fail-closed:
`Mis obligaciones` y `Mis modelos` solo pueden activarse con ruleset aprobado,
resultado `RESOLVED`, perfil completo y evidencia suficiente. `Todos` permanece
siempre disponible.
