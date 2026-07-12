# Añadir y mantener una regla fiscal

## 1. Investigación previa

1. Delimita jurisdicción, contribuyente, impuesto, régimen y fechas.
2. Reúne fuentes oficiales BOE, AEAT o DGT. No uses resúmenes comerciales como
   fundamento.
3. Registra cada fuente en `sources.ts` con URL oficial, referencia, fecha de
   consulta, vigencia, notas y estado de verificación.
4. Si no puedes verificar una consulta vinculante concreta, no completes sus
   metadatos por intuición: usa `PENDING_VERIFICATION`, conserva
   `effectiveFrom: null` y no la adjuntes a una regla ejecutable.
5. Documenta por separado hechos objetivos, interpretación y puntos que debe
   decidir el asesor.

El modelo, un resultado previo o una fuente secundaria nunca son fuente
jurídica. Toda fuente asociada a una regla ejecutable debe ser oficial y tener
`verificationStatus: "VERIFIED"`; mantener la regla en `PENDING_REVIEW` no
rebaja esta exigencia. Una definición `DRAFT` puede catalogar referencias
pendientes solo mientras permanezca excluida de la ejecución.

## 2. Diseñar el contrato

- Crea un `id` estable, legible y no ligado al texto de interfaz.
- Empieza en una versión semántica, por ejemplo `1.0.0`.
- Define `effectiveFrom` y, cuando corresponda, `effectiveTo` inclusivo.
- Declara jurisdicciones y contribuyentes admitidos explícitamente.
- Añade concepto canónico y alias por palabras completas; evita términos
  demasiado genéricos que generen falsos positivos.
- Formula preguntas con identificadores estables. Una respuesta `false` es una
  respuesta válida y no puede tratarse como dato ausente.
- Mantén importes en céntimos enteros y porcentajes enteros de 0 a 100.

## 3. Implementar el evaluador

El evaluador debe ser una función pura en `evaluators/`:

```ts
export function evaluateExampleRule(
  request: RuleEvaluationRequest,
): EvaluationDecision {
  // Sin reloj, red, base de datos, React ni mutaciones.
}
```

Reglas de comportamiento:

- dato necesario ausente → `NEEDS_INPUT`;
- contexto fiscal desconocido → `NEEDS_INPUT`, sin anticipar riesgo ni importe;
- interpretación, prueba insuficiente o régimen incompleto → `NEEDS_REVIEW`;
- territorio o contribuyente conocido y no implementado → `UNSUPPORTED` antes
  del evaluador;
- concepto no reconocido → `NO_MATCH`, sin resultados fiscales;
- condición explícitamente incumplida → resultado cero explicado, sin lenguaje
  acusatorio;
- la ausencia de información mantiene riesgo `UNDETERMINED`;
- la traza solo contiene pasos deterministas, nunca texto completo de factura,
  datos personales ni razonamientos privados.

## 4. Registrar y versionar

Añade la definición a `rule-registry.ts`. El registro rechaza versiones
duplicadas, vigencias solapadas del mismo `id` y fuentes no verificadas en una
regla ejecutable.

Para cambiar un criterio fiscal:

1. No edites retroactivamente una versión usada.
2. Cierra la versión anterior con `effectiveTo`.
3. Crea una nueva versión cuyo `effectiveFrom` sea el día siguiente.
4. Conserva fixtures de ambas fechas frontera.
5. Actualiza fuentes, documentación y estado de revisión.

`effectiveTo` es inclusivo. El motor elige por fecha del gasto, no por fecha de
evaluación ni únicamente por ejercicio.

## 5. Retirar una regla

1. Marca `legalReviewStatus: "RETIRED"`.
2. Conserva definición, fuentes y pruebas históricas; no borres evidencia.
3. Añade una nueva regla si existe sustituta.
4. Comprueba que la retirada produce `NO_MATCH` o una alternativa explícita y
   que el evaluador retirado no se ejecuta.

## 6. Pruebas obligatorias

- tabla de cada respuesta afirmativa, negativa y ausente;
- casos positivos, negativos, ambiguos e incompletos de cada regla;
- límites exactos, un céntimo por debajo y por encima;
- importes cero, negativos, fraccionarios y fuera de rango;
- documento completo, simplificado apto/no apto, recibo y sin documento;
- normalización, alias, palabras completas, empate y selección manual;
- fecha anterior, exacta y posterior a vigencia;
- regla `DRAFT`, `PENDING_REVIEW`, `APPROVED` y `RETIRED`;
- jurisdicción y contribuyente no admitidos;
- contexto desconocido que permanece `NEEDS_INPUT` sin resultados fiscales;
- importes deducibles nunca superiores a la entrada;
- porcentajes entre 0 y 100;
- mismo input y metadatos produce el mismo resultado y no muta argumentos;
- serialización JSON del resultado y snapshot;
- endpoint 200/400/413/429/500 sin stack ni datos sensibles.

Ejecuta las pruebas dirigidas, `npm test`, lint, tipos, manual y build.

## 7. Revisión antes de producción

Una regla nueva empieza como `PENDING_REVIEW`. El asesor fiscal debe revisar:

- texto y vigencia de cada fuente;
- preguntas necesarias y hechos que el usuario puede acreditar;
- base monetaria, límites agregados y redondeos;
- interacción entre impuesto directo e indirecto;
- ejemplos de todos los caminos y mensajes al usuario;
- documentación que se recomienda conservar;
- exclusiones territoriales y de contribuyente.

Solo tras una aprobación trazable debe cambiarse a `APPROVED`. Incluso entonces,
la aplicación de un resultado exige confirmación expresa del usuario y no
autoriza a un LLM a crear asientos.

El fallback de IA existente no se implementa dentro de la regla ni puede usarse
para suplir preguntas condicionales, fuentes o una revisión jurídica pendiente.
Solo recibe un `NO_MATCH` local, datos mínimos redactados y fuentes `VERIFIED`
proporcionadas por la aplicación. Su salida se valida de nuevo de forma
estructural y fiscal y solo puede originar una propuesta `NEEDS_REVIEW`, nunca
confirmar o escribir un asiento. Añadir una regla local sigue siendo preferible
cuando existe una política fiscal verificable y determinista.
