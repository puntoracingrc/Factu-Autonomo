# Descriptores sinteticos negativos VeriFactu 2B.6C

Fase: `PHASE2B6C_SYNTHETIC_FIXTURE_NEGATIVE_DESCRIPTORS_V1`

Estado: descriptores internos sinteticos negativos y controlados.

## Objetivo

Ampliar la matriz sintetica con escenarios negativos de Oleada 2 para preparar
validaciones locales futuras sin crear XML, sin usar datos reales y sin activar
ningun flujo externo.

## Alcance

Se amplian los descriptores de
`src/lib/verifactu-synthetic-fixtures/fixtures.ts`. Los nuevos casos son
ficticios, se validan con los guardrails de 2B.6A y conviven con la Oleada 1 de
2B.6B.

## Descriptores añadidos

| ID | Kind | Uso previsto |
| --- | --- | --- |
| `SYNTHETIC_ONLY_ALTA_INVALID_NIF_001` | `alta_invalid_nif` | Alta ficticia con identificador tributario no valido. |
| `SYNTHETIC_ONLY_ALTA_INVALID_DATE_001` | `alta_invalid_date` | Alta ficticia con fecha controlada no valida. |
| `SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001` | `alta_missing_series_number` | Alta ficticia sin serie y numero. |
| `SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001` | `alta_hash_mismatch` | Alta ficticia con huella candidata discordante. |

## Por que son Oleada 2

La Oleada 1 cubrio escenarios minimos aceptados. La Oleada 2 introduce casos
negativos controlados para ensayar futuras reglas locales sin acercarse todavia
a serializacion, firma, certificados, envio ni entorno externo.

## Descriptor negativo frente a dato real

Un descriptor negativo describe una forma de error esperada usando marcadores
`SYNTHETIC_ONLY`. No contiene documentos reales, identificadores reales,
numeracion real, clientes reales ni evidencias emitidas. Su finalidad es
probar controles futuros, no representar operaciones existentes.

## Reglas heredadas

- Hereda los guardrails de 2B.6A.
- Convive con los descriptores de Oleada 1 creados en 2B.6B.
- Todos los IDs empiezan por `SYNTHETIC_ONLY_`.
- Todos declaran `syntheticOnly=true`.
- Todos los nuevos descriptores usan `sourcePhase: "2B.6C"`.
- La metadata solo incluye referencias internas ficticias, fechas controladas,
  marcadores de NIF ficticio y huellas ficticias.

## Validaciones

- `fixtures.test.ts` valida que Oleada 1 y Oleada 2 pasan los guardrails.
- Los IDs son unicos entre ambas oleadas.
- Se comprueba prefijo sintetico, fase permitida y ausencia de material
  bloqueado.
- El validador npm
  `validate:phase2b6c-synthetic-fixture-negative-descriptors` comprueba
  presencia de Oleada 2, material prohibido, ViDA, capturas, Vercel config y
  rutas Supabase.

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

## Queda para 2B.6D

2B.6D podra ampliar variantes condicionales o preparar validadores locales mas
especificos, siempre manteniendo la frontera de datos ficticios, sin XML
completo, sin firma, sin certificados, sin transporte y sin AEAT real.
