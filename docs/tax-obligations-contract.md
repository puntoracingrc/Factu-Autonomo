# Contrato público de obligaciones tributarias (borrador)

Estado: `1.0.0-draft.1`. No está congelado ni autorizado para integración.

## Imports reservados

```ts
import type {
  TaxObligationsAssessmentV1,
  TaxObligationAssessmentItemV1,
  TaxObligationModelCode,
} from "@/lib/tax-obligations/contracts";

import { buildTaxObligationsAssessment } from "@/lib/tax-obligations";
```

El contrato no importa reglas internas y es seguro en servidor. Contiene:

- `contractVersion`, `catalogVersion`, `ruleSetVersion` y trazabilidad de esquema/motor;
- `resolutionState`: `RESOLVED`, `MANUAL_REVIEW` o `BLOCKED`;
- estado de revisión fiscal del ruleset;
- completitud, información faltante y conflictos del perfil;
- una entrada por código exacto con `REQUIRED`, `NOT_APPLICABLE`, `REVIEW_REQUIRED` o `UNKNOWN`;
- estado/base de decisión, suficiencia de evidencia, motivo, evidencia redactada, datos pendientes y conflictos.

Condiciones fail-closed:

- un territorio sin ruleset o un resultado sin modelos produce `BLOCKED`;
- reglas sin aprobación, perfil incompleto, conflicto o decisión dudosa impiden `RESOLVED`;
- `NOT_APPLICABLE` solo se publica con evidencia explícita, sin datos pendientes y confianza suficiente;
- el normalizador rechaza códigos desconocidos, texto libre, arrays y códigos concatenados;
- los consumidores deben mostrar su vista completa por defecto ante versión incompatible, fallo de carga, `MANUAL_REVIEW` o `BLOCKED`.

No crear integraciones contra este borrador. El aviso de disponibilidad se emitirá únicamente después de merge, aprobación, SHA final y verificación verde del dominio de producción.

