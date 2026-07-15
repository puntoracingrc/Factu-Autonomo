# Alcance fiscal soportado

Estado de esta entrega: infraestructura orientativa y fail-closed. Ninguna
regla está fiscalmente aprobada y ninguna exclusión está autorizada.

## Territorio y ejercicios

- Territorio evaluado: territorio común AEAT (`ES_COMMON`).
- Ejercicios registrados: 2025 y 2026.
- Canarias, Navarra, País Vasco, Ceuta, Melilla, no residentes y territorios
  inciertos quedan fuera del ruleset. El motor se abstiene y conserva la vista
  completa.

## Diferencia entre 27 modelos y 30 familias numeradas

El motor determinista produce actualmente una decisión orientativa para 27
modelos. El lector documental reconoce 30 familias con número. Reconocer un
documento no convierte su número en una obligación de presentación.

### Modelo 037 histórico

- Es un documento censal histórico, suprimido para nuevas declaraciones desde
  febrero de 2025.
- Puede aportar evidencia de altas o modificaciones pasadas.
- No constituye una obligación vigente ni debe mostrarse como modelo futuro a
  presentar.
- Una ausencia en el 037 no prueba una respuesta negativa actual.

### Modelo 151

- Es una declaración personal asociada a un régimen especial para personas
  desplazadas a España.
- Permanece fuera del núcleo ordinario de este diagnóstico y se trata como
  posible obligación personal complementaria pendiente de revisión fiscal.
- El lector puede reconocer el documento, pero el motor no lo incluye ni lo
  excluye automáticamente.

### Modelo 840

- Está relacionado con el Impuesto sobre Actividades Económicas.
- Su obligación depende, entre otros elementos, del sujeto, las exenciones, la
  cifra de negocios, el ejercicio y el territorio.
- Se mantiene como familia documental reconocida. No se añade automáticamente
  a una persona autónoma y queda pendiente de una regla fiscal revisada.

## Invariantes de esta fase

- Las 54 reglas siguen en `PENDING_FISCAL_REVIEW` y resolución `OPEN`.
- Las exclusiones textuales son solo `ADVISORY_EXCLUSION_CANDIDATE`.
- Un assessment, fixture u override que diga `APPROVED` no abre la puerta.
- La falta de snapshot, prueba ejecutable, doble revisor, hash aprobado,
  evidencia firmada o registro completo de incidencias bloquea la exclusión.
- «Todos» continúa disponible en Calendario y Modelos.
- Las recomendaciones pueden mostrarse, pero no eliminan modelos.

## Hash técnico y hash fiscal

- `technicalFileHash` es el SHA-256 del archivo completo `rules.ts`. Detecta
  cualquier cambio técnico, incluso formato o metadatos, pero no se aprueba ni
  firma como decisión fiscal.
- `ruleHash` es el hash canónico individual de los elementos materiales de una
  regla: decisión, condiciones, excepciones, candidatos y referencias
  normativas aplicables. No incorpora comentarios, revisores, fechas de
  revisión, interfaz ni métricas.
- En esta fase solo se calcula el hash fiscal actual para detectar deriva;
  `approvedRuleHash` permanece `null` en las 54 reglas.
