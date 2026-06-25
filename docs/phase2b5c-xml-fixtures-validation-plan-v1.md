# Plan de fixtures sinteticos y validacion XML 2B.5C

Fase:

`PHASE2B5C_XML_FIXTURES_VALIDATION_PLAN_V1`

Estado:

`PLAN DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5b-internal-xml-contract-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## 1. Objetivo

Este documento define un plan documental de fixtures sinteticos y validacion
local futura para registros XML de alta y anulacion. Sirve para identificar que
casos habra que cubrir mas adelante, que datos sinteticos se necesitaran y que
validaciones deberan existir antes de cualquier implementacion.

Este documento:

- no crea XML real;
- no crea archivos XML ejecutables;
- no implementa generador;
- no valida contra AEAT;
- no firma;
- no usa certificados;
- no transporta;
- no toca produccion;
- no sustituye revision legal/fiscal externa.

La matriz queda como preparacion prudente. Cualquier fixture real, generador,
validador ejecutable, contrato de esquema o comparacion oficial requiere fase
posterior, fuente oficial fijada y aprobacion explicita.

## 2. Relacion con fases previas

2B.5C se apoya en las siguientes fases previas:

- `docs/phase2b5a-official-xml-qr-research-v1.md`: investigacion documental de
  fuentes oficiales sobre XML, QR, huella/hash, firma, certificados, transporte
  y validaciones.
- `docs/phase2b5b-internal-xml-contract-v1.md`: contrato interno futuro para
  separar entradas candidatas, riesgos y campos pendientes de confirmacion
  oficial.
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`:
  cierre local/staging del flujo fiscal candidato, incluyendo registros,
  cadena, payload candidato y evidencia interna no transportable.

Resumen de frontera:

- 2B.5A investigo fuentes oficiales.
- 2B.5B definio un contrato interno futuro.
- 2B.5C define casos sinteticos y matriz de validacion futura.
- Todavia no hay XML definitivo.
- Todavia no hay generador, fixtures ejecutables ni validacion oficial.

## 3. Tipos de fixtures sinteticos

La siguiente matriz no crea XML completo ni ejemplos de nodos. Solo enumera
casos que deberian convertirse en fixtures sinteticos en una fase posterior.

| Fixture ID | Tipo | Objetivo | Datos sinteticos necesarios | Validaciones futuras | Riesgo |
| ---------- | ---- | -------- | --------------------------- | -------------------- | ------ |
| `SYNTHETIC_ONLY_ALTA_BASIC_001` | Alta basica valida | Comprobar el flujo minimo candidato de alta cuando las fuentes oficiales esten fijadas. | Emisor ficticio, NIF ficticio, serie ficticia, numero ficticio, fecha controlada, importes de prueba, hash candidato. | Estructura, campos obligatorios, formato de fecha, formato de importes, encadenamiento inicial o posterior segun aplique. | Dar por valido un campo obligatorio no confirmado. |
| `SYNTHETIC_ONLY_ALTA_RECTIFICATIVA_001` | Alta con factura rectificativa si aplica | Cubrir una variante rectificativa solo si el contrato oficial la exige o admite. | Identidad ficticia de factura rectificativa, referencia sintetica a factura rectificada, importes de prueba y motivo ficticio si procede. | Campos condicionales, referencias, signo/importes, relacion con factura previa y rechazo controlado si falta dato. | Inventar campos rectificativos antes de confirmar reglas oficiales. |
| `SYNTHETIC_ONLY_ALTA_SUBSANACION_001` | Alta con subsanacion si aplica | Preparar un caso para alta ligada a subsanacion solo si la fuente oficial lo confirma. | Operacion sintetica de subsanacion, referencia ficticia a registro previo, fecha controlada y datos de prueba. | Campos condicionales, estado previo, compatibilidad con alta/anulacion y errores esperados. | Mezclar subsanacion con alta ordinaria sin contrato oficial. |
| `SYNTHETIC_ONLY_ALTA_LIMIT_AMOUNTS_001` | Alta con importes limite | Verificar limites de redondeo, ceros, maximos/minimos y representacion decimal. | Importes de prueba, bases ficticias, impuestos ficticios y totales controlados. | Formato de importes, precision decimal, normalizacion y rechazo de valores fuera de rango. | Aceptar importes representados de forma distinta a la oficial. |
| `SYNTHETIC_ONLY_ALTA_INVALID_NIF_001` | Alta con NIF invalido | Confirmar que un identificador fiscal ficticio invalido se rechaza localmente. | NIF claramente ficticio, emisor ficticio y factura sintetica minima. | Formato NIF, normalizacion, rechazo controlado y no exposicion de datos completos. | Usar validadores no alineados con la fuente oficial. |
| `SYNTHETIC_ONLY_ALTA_INVALID_DATE_001` | Alta con fecha invalida | Comprobar rechazo de formatos o ventanas temporales invalidas. | Fecha imposible o fuera de rango, serie ficticia, numero ficticio y datos minimos de alta. | Formato de fecha, calendario, zona/fecha de generacion si aplica y mensaje de rechazo interno. | Confundir fecha documental con fecha/hora de registro. |
| `SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001` | Alta sin numero/serie | Verificar que no se genera material final si falta identidad de factura. | Emisor ficticio, fecha controlada, importes de prueba y numero/serie ausente. | Campos obligatorios, rechazo controlado y trazabilidad interna sin XML completo. | Generar identificacion incompleta o numeracion real accidental. |
| `SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001` | Alta con hash inconsistente | Detectar divergencias entre material candidato, hash interno y cadena local. | Hash candidato alterado, registro ficticio, estado de cadena sintetico y factura de prueba. | Hash/huella futura, integridad, rechazo controlado y no impresion de material completo. | Confundir `fiscal_records.record_hash` con huella oficial. |
| `SYNTHETIC_ONLY_CHAIN_FIRST_001` | Primer registro de cadena | Cubrir el caso de alta inicial sin registro anterior cuando la regla oficial este fijada. | Emisor ficticio, entorno de prueba, secuencia inicial, fecha controlada y hash candidato. | Regla de primer registro, ausencia/presencia de registro anterior y canonicalizacion. | Arrastrar una convencion local que no coincida con la oficial. |
| `SYNTHETIC_ONLY_CHAIN_SECOND_001` | Segundo registro encadenado | Verificar continuidad entre dos registros sinteticos. | Dos facturas ficticias, hashes candidatos, secuencias y estado de cadena local. | Encadenamiento, referencia al anterior, orden, atomicidad y deteccion de gaps. | Aceptar una cadena local que no sea valida para contrato oficial. |
| `SYNTHETIC_ONLY_CANCEL_BASIC_001` | Anulacion basica | Preparar anulacion de una factura sintetica existente. | Identidad ficticia de factura anulada, emisor ficticio, fecha controlada y hash candidato. | Campos obligatorios de anulacion, referencia a factura, encadenamiento y rechazo controlado. | Anular una identidad distinta o insuficiente. |
| `SYNTHETIC_ONLY_CANCEL_MISSING_INVOICE_001` | Anulacion de factura no existente | Confirmar rechazo local de anulacion sin factura sintetica previa. | Identidad ficticia no registrada, emisor ficticio y operacion sintetica de anulacion. | Reglas de existencia, referencias, error interno esperado y evidencia minima. | Crear un registro de anulacion huerfano. |
| `SYNTHETIC_ONLY_CANCEL_PREVIOUS_HASH_MISMATCH_001` | Anulacion con hash previo inconsistente | Detectar inconsistencia entre anulacion y registro/cadena previa. | Factura sintetica previa, hash previo alterado y operacion de anulacion ficticia. | Encadenamiento, hash/huella futura, rechazo controlado y evidencia sin datos completos. | Persistir una anulacion con cadena rota. |
| `SYNTHETIC_ONLY_CANONICALIZATION_ERROR_001` | Error de canonicalizacion | Cubrir divergencias por espacios, mayusculas, decimales, fechas o valores nulos. | Datos ficticios equivalentes pero representados de forma distinta. | Normalizacion, canonicalizacion, comparacion reproducible y rechazo de ambiguedades. | Implementar reglas inferidas sin fuente oficial fijada. |
| `SYNTHETIC_ONLY_PENDING_CONDITIONAL_FIELDS_001` | Campos condicionales pendientes | Mantener un caso de bloqueo cuando falten reglas oficiales de obligatoriedad. | Campos ficticios marcados como pendientes, estado sintetico y motivo documental. | Bloqueo por `PENDIENTE`, no generacion, no transporte y aprobacion requerida. | Rellenar campos por suposicion para avanzar artificialmente. |

Todos los casos son sinteticos. Ningun fixture debe usar clientes, facturas,
NIFs, importes, PDFs, certificados, respuestas AEAT ni identificadores reales.

## 4. Datos sinteticos permitidos

Reglas para datos de una futura fase de fixtures:

- NIFs de prueba claramente ficticios y marcados como `SYNTHETIC_ONLY`.
- Nombres ficticios, no atribuibles a personas o empresas reales.
- Series ficticias, por ejemplo identificadores internos con prefijo
  `SYNTHETIC_ONLY`.
- Numeros ficticios sin relacion con numeracion real de facturas.
- Importes de prueba controlados, sin relacion con operaciones reales.
- Fechas controladas, reproducibles y documentadas.
- Identificadores internos marcados como `SYNTHETIC_ONLY`.
- No datos reales.
- No clientes reales.
- No facturas reales.
- No PDFs reales.
- No certificados reales.
- No secretos, tokens, URLs operativas ni respuestas externas reales.

Si una futura prueba necesita un identificador, debe incluir de forma visible el
prefijo `SYNTHETIC_ONLY` y no debe poder confundirse con un dato operativo.

## 5. Validaciones futuras esperadas

Validaciones que deberan disenarse mas adelante, sin implementarlas en esta
fase:

- estructura;
- campos obligatorios;
- campos condicionales;
- formato de fechas;
- formato de importes;
- normalizacion;
- canonicalizacion;
- hash/huella;
- encadenamiento;
- anulacion;
- rechazo controlado;
- no exposicion de XML completo;
- no secrets;
- no datos reales.

Las validaciones futuras deberan separar resultados internos de cualquier
respuesta oficial. Un resultado local correcto no debe interpretarse como
validacion AEAT, certificacion, homologacion ni autorizacion de uso productivo.

## 6. Criterios de aceptacion futura

Antes de pasar a implementacion de fixtures reales debe existir:

- fuente oficial fijada;
- version de esquema decidida;
- campos obligatorios confirmados;
- campos condicionales confirmados o bloqueados como pendientes;
- canonicalizacion confirmada;
- formato de hash confirmado;
- estrategia de anonimizacion;
- politica de no impresion de XML completo;
- decision de almacenamiento de fixtures, si aplica;
- aprobacion explicita.

Sin esos criterios no debe crearse generador, fixture ejecutable, validador
automatizado ni archivo XML completo de ejemplo.

## 7. Limites

- No codigo funcional.
- No migraciones.
- No XML definitivo.
- No XML AEAT definitivo.
- No archivos XML completos de ejemplo.
- No QR definitivo.
- No firma.
- No certificados.
- No transporte.
- No AEAT real.
- No produccion.
- No UI.
- No Supabase produccion.
- No staging remoto.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No Vercel config.
- No promote.
- No dominios, DNS ni aliases.
- No Stripe, precios ni planes.
- No IA.
- No importadores.
- No XML completo impreso.
- No secrets impresos.

## Resultado esperado

2B.5C debe cerrar solo un plan documental de casos sinteticos y validaciones
futuras. El siguiente paso, si se aprueba, deberia fijar fuente oficial, esquema,
canonicalizacion y politica de anonimizado antes de crear cualquier fixture o
validador ejecutable.
