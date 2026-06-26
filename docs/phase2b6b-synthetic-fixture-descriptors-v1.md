# Descriptores sinteticos VeriFactu 2B.6B

Fase: `PHASE2B6B_SYNTHETIC_FIXTURE_DESCRIPTORS_V1`

Estado: descriptores internos sinteticos de Oleada 1.

## Objetivo

Crear el primer set concreto de descriptores internos sinteticos para futuros
tests de forma y reglas locales. Esta fase usa los guardrails de 2B.6A y no
cruza hacia serializacion fiscal ni conexion externa.

## Alcance

Se anade un array readonly exportado desde
`src/lib/verifactu-synthetic-fixtures/fixtures.ts`:

`VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS`

Los descriptores son material interno y ficticio. No son facturas, no son datos
de clientes reales y no deben utilizarse para emitir, remitir ni justificar
cumplimiento productivo.

## Descriptores creados

| ID | Kind | Uso previsto |
| --- | --- | --- |
| `SYNTHETIC_ONLY_ALTA_BASIC_001` | `alta_basic` | Alta basica ficticia. |
| `SYNTHETIC_ONLY_CHAIN_FIRST_001` | `chain_first` | Primer elemento ficticio de cadena. |
| `SYNTHETIC_ONLY_CHAIN_SECOND_001` | `chain_second` | Segundo elemento ficticio de cadena. |
| `SYNTHETIC_ONLY_CANCEL_BASIC_001` | `cancel_basic` | Anulacion basica ficticia. |

## Por que solo Oleada 1

La Oleada 1 permite comprobar que los guardrails aceptan escenarios minimos y
rechazan material sensible antes de ampliar la matriz. No se incluyen todavia
rectificativas, subsanaciones, errores de NIF, errores de fecha, desajustes de
hash ni campos condicionales pendientes.

## Reglas heredadas de 2B.6A

- `id` empieza por `SYNTHETIC_ONLY_`;
- `syntheticOnly` es `true`;
- `kind` pertenece a la lista cerrada;
- `sourcePhase` es `2B.6B`;
- `purpose`, `expectedFutureValidations`, `blockedUntil`, `riskNotes` y
  `metadata` son seguros;
- los descriptores se validan con `validateSyntheticFixtureDescriptor`.

## Validaciones

- `fixtures.test.ts` valida que todos los descriptores son aceptados;
- los IDs son unicos;
- todos los IDs usan prefijo sintetico;
- todos declaran `syntheticOnly=true`;
- todos declaran fase permitida;
- la coleccion no contiene material sensible ni datos reales;
- el validador npm `validate:phase2b6b-synthetic-fixture-descriptors` revisa
  rutas, export, material prohibido, ViDA, capturas, Vercel config y Supabase.

## Limites

- No hay XML real.
- No hay archivos XML completos.
- No hay datos reales.
- No hay fixtures XML completos ejecutables.
- No hay QR.
- No hay firma.
- No hay certificados.
- No hay transporte.
- No hay AEAT real.
- No hay cambios de Supabase, migraciones, Vercel config, Stripe, IA,
  importadores ni UI fiscal.

## Queda para 2B.6C

2B.6C podra ampliar la matriz sintetica con escenarios negativos y variantes
condicionales, siempre manteniendo datos ficticios y la frontera de no generar
XML completo, no firmar, no usar certificados, no conectar con AEAT y no crear
ningun flujo de envio real.
