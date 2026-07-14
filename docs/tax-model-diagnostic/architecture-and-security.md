# Arquitectura, datos y seguridad

## Separación de responsabilidades

```text
Cuestionario / documento local
          │
          ▼
Perfil normalizado + evidencia confirmada
          │
          ▼
Motor puro y ruleset por ejercicio/territorio
          │
          ├── Resultado detallado para la UI
          └── Adaptador público versionado y server-safe
```

- `src/lib/tax-model-diagnostic/contracts.ts`: tipos internos y versiones de esquema/motor.
- `profile.ts`: valores por defecto y normalización fail-closed de datos persistidos.
- `questions.ts`: catálogo declarativo y aplicabilidad dinámica.
- `rules.ts`: reglas versionadas por ejercicio con fuentes, vigencia, revisión y casos mínimos.
- `engine.ts`: evaluación determinista sin red, IA, almacenamiento ni efectos laterales.
- `src/lib/tax-obligations/contracts`: contrato público aislado para consumidores futuros.
- `src/lib/tax-obligations/build-assessment.ts`: único adaptador del resultado interno al contrato público.

El catálogo informativo existente `src/lib/fiscal-models/**` no se modifica ni se importa como motor de aplicabilidad.

## Persistencia y migración

`BusinessProfile.taxModelDiagnostic` es opcional. Las cuentas existentes siguen funcionando sin migración destructiva. Al leer o guardar:

- una versión de esquema incompatible se descarta;
- enums desconocidos vuelven a `UNKNOWN`;
- fechas inválidas, porcentajes fuera de rango y códigos no canónicos se eliminan;
- solo se conserva evidencia con `userConfirmed=true`;
- el resultado se recalcula desde el perfil y el ruleset vigente, evitando conservar decisiones obsoletas.

El bloque se guarda mediante el mecanismo local/nube ya existente del perfil de empresa. El documento original, su texto y su nombre de archivo no se persisten.

## Trazabilidad

Cada resultado conserva:

- `schemaVersion`, `engineVersion` y `ruleSetVersion`;
- ejercicio, territorio y fecha de generación;
- código canónico y sujeto obligado;
- estado cerrado, razón y evidencia legible;
- información faltante, discrepancia y confianza;
- identificadores de regla y fuentes oficiales.

La evidencia documental incluye tipo de documento, método de extracción, campo, confianza, prioridad y confirmación humana. La primera versión no consume el valor extraído hasta que la persona lo confirma.

## Amenazas y controles

| Riesgo | Control |
| --- | --- |
| PDF malicioso o falso tipo MIME | Comprobación de cabecera `%PDF-`, tamaño, páginas, texto máximo y `isEvalSupported=false` |
| Documento de otra persona | Reconciliación exacta de NIF; sin coincidencia no se puede confirmar |
| Datos extraídos incorrectos | Propuestas por campo, advertencias y confirmación explícita |
| Fuga de documentos | Procesamiento local efímero; no se sube ni se conserva PDF/texto/nombre |
| Inyección mediante texto | El texto no se ejecuta ni decide reglas; solo alimenta parsers locales acotados |
| Códigos inventados o concatenados | Unión cerrada, normalizador canónico y rechazo de texto libre/múltiples códigos |
| Falta de datos interpretada como exclusión | `UNKNOWN`/`NEEDS_INFORMATION`; `NOT_APPLICABLE` exige evidencia explícita |
| Aplicación de IVA estatal fuera de alcance | Puerta territorial previa y salida sin modelos |
| Regla sin revisión fiscal | Estado de revisión y feature flag cerrado en producción |
| Consumidor incompatible | `contractVersion`, `catalogVersion` y fallback obligatorio a vista completa |

No hay llamadas de IA para determinar obligaciones. No hay telemetría con NIF, contenido documental o respuestas fiscales en esta entrega.

