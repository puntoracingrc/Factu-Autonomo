# Contrato público de obligaciones tributarias v1

Estado: `1.0.0`, congelado y autorizado para integración desde
`main a8686b8dff213beb2b90b33bc0c721ad957460e9`.

El despliegue de ese SHA superó CI y la espera, asignación y verificación del
dominio de producción. La forma del contrato es estable; la aprobación fiscal
de cada ruleset se comunica separadamente mediante `ruleReviewState`.

## Import canónico

```ts
import {
  isTaxObligationExclusionAuthorized,
  normalizeTaxObligationModelCode,
  selectStoredTaxObligationsAssessment,
  type TaxObligationsAssessmentV1,
  type TaxObligationAssessmentItemV1,
  type TaxObligationModelCode,
} from "@/lib/tax-obligations";
```

`selectStoredTaxObligationsAssessment(session)` es la frontera pública de
lectura para Calendar y Modelos. Devuelve la última foto confirmada o `null` si
no existe o su versión es incompatible. Los consumidores no deben importar
reglas internas ni reconstruir decisiones.

La foto se persiste en:

```text
AppData.profile.taxModelDiagnostic.publishedAssessment
```

Editar respuestas del test no modifica esa foto. Solo se sustituye cuando el
usuario confirma y genera un resultado nuevo.

`buildTaxObligationsAssessment(result)` es el export del productor; los
consumidores ordinarios no lo necesitan.

## Forma estable

`TaxObligationsAssessmentV1` contiene:

- `contractVersion`, `catalogVersion`, `ruleSetVersion` y trazabilidad de
  esquema/motor;
- `resolutionState`: `RESOLVED`, `MANUAL_REVIEW` o `BLOCKED`;
- `ruleReviewState`: `PENDING_FISCAL_REVIEW` o `APPROVED`;
- completitud, información faltante y conflictos del perfil;
- una entrada por código exacto con `REQUIRED`, `NOT_APPLICABLE`,
  `REVIEW_REQUIRED` o `UNKNOWN`;
- estado/base de decisión, suficiencia de evidencia, motivo, evidencia
  redactada, datos pendientes y conflictos.

Versiones congeladas:

```text
contractVersion = 1.0.0
catalogVersion  = es-tax-models.2026-07.v1
```

## Condiciones fail-closed

- un territorio sin ruleset o un resultado sin modelos produce `BLOCKED`;
- reglas sin aprobación, perfil incompleto, conflicto o decisión dudosa
  impiden `RESOLVED`;
- `NOT_APPLICABLE` solo se publica con evidencia explícita, sin datos
  pendientes y confianza suficiente;
- el normalizador rechaza códigos desconocidos, texto libre, arrays y códigos
  concatenados;
- versión incompatible, fallo de carga, ausencia de foto, `MANUAL_REVIEW` o
  `BLOCKED` conservan la vista completa como fallback;
- una selección manual del usuario puede complementar una vista, pero nunca
  muta ni confirma una decisión del Motor.

La única guarda pública que autoriza ocultar o excluir es:

```ts
isTaxObligationExclusionAuthorized(assessment)
```

Devuelve `true` únicamente cuando coinciden simultáneamente los nombres
canónicos del contrato:

```text
ruleReviewState = APPROVED
resolutionState = RESOLVED
```

Hasta entonces, «Todos» permanece disponible, los candidatos se conservan
visibles y cualquier recomendación o modelo improbable se etiqueta como
pendiente de revisión fiscal. Aprobar OCR, extractores, corpus, fixtures, CI,
CodeQL o un despliegue nunca sustituye la aprobación fiscal del ruleset. Una
prueba de regresión común cubre Calendario y Modelos para impedir exclusiones
antes de cumplir ambas condiciones.

En la versión publicada actualmente, el ruleset conserva
`ruleReviewState = PENDING_FISCAL_REVIEW`. Por ello los consumidores pueden
integrar ya el contrato y sus vistas, pero deben mantener «Todos» como fallback
en producción hasta recibir `APPROVED` y `RESOLVED`.

## Adapter de referencias de Calendar

`FiscalCalendarEvent` no incorpora todavía un `modelCode` estructurado. Para la
integración v1, Calendar puede reutilizar
`extractFiscalCalendarModelCodes()` únicamente como reconocimiento de
referencias explícitas en el título y la descripción oficiales, nunca como
inferencia de obligación.

El adapter debe:

1. normalizar cada candidato con `normalizeTaxObligationModelCode()` y descartar
   cualquier código fuera del catálogo cerrado del Motor;
2. deduplicar y consultar el assessment solo cuando quede exactamente un código
   canónico;
3. conservar visible y por confirmar cualquier evento con cero o varios
   códigos;
4. no deducir códigos por categoría, significado del título, números sueltos o
   texto sin contexto fiscal explícito;
5. aplicar la visibilidad exclusivamente desde el estado del assessment: solo
   un `NOT_APPLICABLE` con `evidenceSufficient = true` permite ocultar en «Mis
   obligaciones».

Con esas condiciones no es obligatorio añadir primero un campo server-side al
evento. Un `modelCode` estructurado sigue siendo una mejora futura preferible,
pero no cambia las garantías fail-closed de este adapter.

## Namespaces

- reservado al Motor: `src/lib/tax-obligations/**`;
- liberados para integraciones separadas: UI de Calendar y
  `src/lib/fiscal-models/**`.
