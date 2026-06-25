# Plan de canonicalizacion y huella candidata VeriFactu 2B.5J

Fase:

`PHASE2B5J_CANONICALIZATION_HASH_EXECUTION_PLAN_V1`

Estado:

`PLAN DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5b-internal-xml-contract-v1.md`
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`
- `docs/phase2b5e-official-artifacts-registry-v1.md`
- `docs/phase2b5i-synthetic-fixtures-execution-plan-v1.md`

## Objetivo

Este documento define como abordar codigo futuro de canonicalizacion y huella
candidata sin afirmar equivalencia oficial hasta validacion externa, versionado
de fuente y aprobacion explicita.

No implementa canonicalizacion, no calcula huella, no modifica hashes internos,
no crea XML y no imprime material completo.

## 1. Frontera

Reglas de frontera:

- `fiscal_records.record_hash` actual no es huella oficial;
- una futura huella candidata debe estar separada;
- no se debe reemplazar hash interno sin decision explicita;
- no se debe imprimir material completo;
- no se debe usar una huella candidata como prueba de aceptacion AEAT;
- no se debe derivar transporte, QR productivo ni firma desde hash candidato;
- no se debe mezclar canonicalizacion candidata con evidencia productiva.

La canonicalizacion futura debe trabajar primero sobre descriptores sinteticos y
debe poder diferenciar hash interno, canonical input candidate y hash candidate.

## 2. Entradas futuras

Entradas candidatas de una fase futura:

- descriptor sintetico;
- campos normalizados;
- reglas fijadas;
- expected digest seguro;
- version documental de reglas usada para la prueba;
- marcador `syntheticOnly=true`;
- identificador de caso `SYNTHETIC_ONLY`.

No deben entrar:

- datos reales;
- XML completo;
- certificados;
- respuestas AEAT;
- endpoints externos;
- secretos;
- `fiscal_transport_attempts`.

## 3. Salidas futuras

Salidas candidatas de una fase futura:

- canonical input candidate;
- hash candidate;
- validation report;
- digest/resumen seguro;
- lista de reglas aplicadas;
- lista de campos pendientes o rechazados.

Cada salida debe evitar:

- XML completo;
- transporte;
- firma;
- certificados;
- material suficiente para reconstruir una factura real;
- equivalencia implicita con huella oficial.

## 4. Riesgos

| Riesgo | Impacto | Mitigacion futura |
| ------ | ------- | ----------------- |
| Orden de campos incorrecto | Hash candidato no reproducible o no alineado con fuente oficial. | Fijar version de reglas y pruebas deterministas. |
| Normalizacion incorrecta | Diferencias por espacios, casing, nulos o codificacion. | Validadores de normalizacion y snapshots seguros. |
| Decimales mal representados | Divergencias por precision, separador o redondeo. | Casos sinteticos de importes limite. |
| Fechas mal tratadas | Mezcla de fecha documental, expedicion o generacion. | Reglas explicitas por campo y zona cuando aplique. |
| NIF mal normalizado | Identificador rechazable o inconsistente. | Descriptores ficticios y validadores de formato. |
| Primer registro mal tratado | Encadenamiento inicial incorrecto. | Casos sinteticos para primer y segundo registro. |
| Anulacion mal encadenada | Referencia o hash previo incorrecto. | Descriptores especificos de anulacion y rechazo. |
| Reemplazo accidental de hash interno | Perdida de trazabilidad local/staging. | Mantener campos y nombres separados. |

## 5. Validaciones futuras

Validaciones esperadas:

- estabilidad determinista;
- mismo input mismo hash;
- cambio de campo cambia hash;
- `previousHash` cambia resultado;
- rechazo de campos pendientes;
- rechazo de datos reales;
- rechazo de XML completo;
- rechazo de `transportable=true`;
- rechazo de endpoints AEAT;
- no impresion de material completo;
- separacion explicita entre hash interno y hash candidate.

La validacion futura debe demostrar que el comportamiento es reproducible, no
que exista cumplimiento productivo.

## Resultado esperado

2B.5J deja planificada una fase futura de canonicalizacion y hash candidato. No
autoriza modificar `fiscal_records.record_hash`, generar huella oficial, crear
XML, transportar ni conectar con AEAT.
