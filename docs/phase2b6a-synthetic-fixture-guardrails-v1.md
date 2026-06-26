# Guardrails de fixtures sinteticos VeriFactu 2B.6A

Fase: `PHASE2B6A_SYNTHETIC_FIXTURE_GUARDRAILS_V1`

Estado: capa ejecutable interna limitada.

## Objetivo

Crear una primera defensa de codigo para futuros descriptores internos de
fixtures sinteticos. La fase valida forma, origen y material permitido antes de
que existan fixtures ejecutables o serializacion fiscal.

## Alcance

Esta fase solo acepta descriptores internos sinteticos. No crea payload fiscal,
no crea ficheros XML, no genera QR, no firma, no carga certificados, no conecta
con AEAT y no cambia producto, UI, Supabase ni Vercel.

## Modulo creado

Modulo: `src/lib/verifactu-synthetic-fixtures/`

Archivos:

- `types.ts`;
- `errors.ts`;
- `fixture-policy.ts`;
- `fixture-policy.test.ts`;
- `index.ts`.

## Tipos principales

- `SyntheticFixtureDescriptor`;
- `SyntheticFixtureKind`;
- `SyntheticFixtureValidationResult`;
- `SyntheticFixturePolicyError`;
- `SyntheticFixtureRiskFlag`;
- `SyntheticFixtureValidationStatus`.

## Reglas de validacion

- `id` debe empezar por `SYNTHETIC_ONLY_`;
- `syntheticOnly` debe ser `true`;
- `kind` debe pertenecer a la lista cerrada de escenarios internos;
- `sourcePhase` debe referenciar `2B.5C`, `2B.5D`, `2B.5H`, `2B.6A` o una fase posterior;
- `purpose` debe existir y no estar vacio;
- `expectedFutureValidations` debe ser un array;
- `metadata` debe ser JSON seguro;
- los errores esperados se devuelven como errores tipados, sin lanzar errores crudos;
- los errores no incluyen el contenido bruto bloqueado.

## Material prohibido

El validador rechaza categorias de material que podrian convertir un descriptor
en algo operativo o sensible: documentos XML completos, etiquetas fiscales
finales, bloques de identidad tecnica, claves privadas, extensiones de material
de identidad tecnica, endpoints tributarios operativos, tokens, secretos,
marcadores de datos reales, metadatos de envio y referencias a colas o intentos
de remision.

## Tests

`fixture-policy.test.ts` cubre aceptacion del descriptor valido y rechazos por:

- identificador sin prefijo sintetico;
- `syntheticOnly=false`;
- `kind` desconocido;
- `purpose` vacio;
- XML completo o XML-like;
- material de identidad tecnica;
- extensiones sensibles;
- endpoint tributario externo;
- metadatos de envio;
- referencias a credenciales;
- errores tipados estables;
- ausencia de reflejo de XML completo en errores;
- ausencia de dependencia de Supabase.

## Validador npm

Script: `npm run validate:phase2b6a-synthetic-fixture-guardrails`

Comprueba que el modulo existe, que los tests existen, que no hay ficheros XML
ni material de identidad tecnica bajo las rutas nuevas, que no se han tocado
ViDA ni Vercel config, que no hay capturas ViDA versionadas y que el modulo no
importa UI ni cliente real de Supabase.

## Limites

- No hay XML real.
- No hay archivos XML completos.
- No hay fixtures XML completos ejecutables.
- No hay firma.
- No hay certificados.
- No hay transporte.
- No hay AEAT real.
- No hay cambios de producto, UI, Supabase, migraciones, Stripe, IA ni importadores.

## Queda para 2B.6B

2B.6B podra proponer descriptores sinteticos concretos si se mantiene esta
frontera: datos ficticios, sin XML completo, sin material sensible, sin envio,
sin firma y sin conexion externa. Cualquier paso hacia serializacion, QR, firma,
certificados o transporte requiere fase separada y aprobacion explicita.
