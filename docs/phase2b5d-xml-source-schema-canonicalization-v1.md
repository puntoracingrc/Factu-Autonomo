# Politica de fuentes, esquema y canonicalizacion XML 2B.5D

Fase:

`PHASE2B5D_XML_SOURCE_SCHEMA_CANONICALIZATION_V1`

Estado:

`POLITICA DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5b-internal-xml-contract-v1.md`
- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## 1. Objetivo

Esta fase fija criterios documentales previos para una futura creacion de
fixtures y validadores locales relacionados con XML de alta/anulacion. Su
objetivo es impedir que se creen fixtures ejecutables desde supuestos,
versiones mezcladas o reglas de canonicalizacion inferidas.

Este documento:

- no crea XML real;
- no crea archivos XML completos;
- no implementa generador;
- no implementa validador XML ejecutable;
- no firma;
- no usa certificados;
- no transporta;
- no conecta AEAT;
- no activa produccion;
- no sustituye revision legal/fiscal externa.

Antes de pasar a fixtures ejecutables, las fuentes oficiales, esquema,
canonicalizacion y politica de anonimizacion deberan estar fijadas y aprobadas
de forma explicita.

## 2. Relacion con fases previas

2B.5D se apoya en:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5b-internal-xml-contract-v1.md`
- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

Resumen:

- 2B.5A investigo fuentes oficiales.
- 2B.5B definio contrato interno futuro.
- 2B.5C definio matriz de fixtures sinteticos.
- 2B.5D fija criterios previos para no crear fixtures desde supuestos.

2B.5D no convierte la investigacion 2B.5A en contrato ejecutable. Tampoco
convierte el contrato interno 2B.5B ni la matriz 2B.5C en XML definitivo.

## 3. Fuentes oficiales a fijar

Los estados permitidos para esta tabla son:

- `FIJADA`
- `PENDIENTE`
- `NO_APLICA_EN_ESTA_FASE`

Si una fuente, version o artefacto no esta completamente confirmado, debe quedar
marcado como `PENDIENTE`.

| Area | Fuente oficial candidata | Artefacto/versionado pendiente | Estado | Riesgo si no se fija |
| ---- | ------------------------ | ------------------------------ | ------ | -------------------- |
| Diseno de registro | AEAT informacion tecnica sobre disenos de registro y documento de diseno de registro de facturacion referenciados en 2B.5A. | Identificador de version vigente, fecha de consulta, artefacto exacto y trazabilidad de cambios. | PENDIENTE | Crear fixtures contra campos, nombres o reglas no vigentes. |
| Esquema XML | Fuente oficial de diseno/esquema que corresponda a registros de alta/anulacion. | Esquema/version oficial, namespace si aplica, reglas de estructura y compatibilidad. | PENDIENTE | Mezclar estructura conceptual interna con XML oficial no verificado. |
| Huella/hash | AEAT algoritmo de calculo y codificacion de huella/hash referenciado en 2B.5A. | Version del documento, datos de entrada por tipo de registro, orden, normalizacion y formato de salida. | PENDIENTE | Confundir `fiscal_records.record_hash` con huella oficial o generar hashes no reproducibles. |
| QR | AEAT caracteristicas del QR y especificacion del servicio de cotejo referenciadas en 2B.5A. | Version, parametros, codificacion, presentacion y relacion con registro/factura. | PENDIENTE | Preparar datos de QR que no correspondan a un registro oficial validado. |
| Validaciones y errores | AEAT documento de validaciones y errores referenciado en 2B.5A. | Version, matriz de errores, severidades, campos afectados y criterios de rechazo. | PENDIENTE | Aceptar localmente casos que deberian rechazarse o bloquear casos admisibles. |
| Servicios de remision, solo frontera futura | AEAT especificaciones de servicios de remision voluntaria y documento de servicios referenciados en 2B.5A. | Contratos, version, estados, errores, autenticacion e idempotencia futura. | PENDIENTE | Confundir validacion local con transporte o respuesta AEAT real. |
| Firma electronica, solo frontera futura | AEAT especificaciones tecnicas de firma electronica referenciadas en 2B.5A. | Politica de firma, certificados admitidos, formato, version y custodia futura. | PENDIENTE | Introducir firma o certificados reales sin diseno y aprobacion separada. |

## 4. Politica de versionado de fuentes

En fases futuras, cada fuente oficial usada para fixtures o validadores debera
registrar como minimo:

- URL oficial.
- Fecha de consulta.
- Version, identificador o fecha del artefacto si existe.
- Hash del artefacto oficial si se descarga en una fase futura.
- Relacion entre artefacto oficial y decision interna derivada.
- Fecha de revision interna.
- Responsable de aprobacion o referencia de aprobacion.

Reglas:

- No descargar ni commitear PDFs oficiales en esta fase.
- No copiar PDFs completos al repo salvo decision explicita.
- No depender de enlaces sin registrar fecha.
- No mezclar versiones de esquemas.
- No mezclar una version de hash con otra version de diseno de registro.
- No tratar capturas, notas internas o resumenes como sustitutos del artefacto
  oficial.
- No convertir un enlace consultado en permiso para implementar transporte,
  firma, certificados o AEAT real.

Si una fuente cambia, queda bloqueada cualquier fixture ejecutable afectado
hasta registrar la nueva version y revisar la matriz de impacto.

## 5. Matriz de canonicalizacion pendiente

Mientras una decision no este cerrada contra fuente oficial fijada, bloquea
fixtures ejecutables.

| Aspecto | Decision actual | Fuente requerida | Riesgo | Bloquea fixtures ejecutables |
| ------- | --------------- | ---------------- | ------ | ---------------------------- |
| Orden de campos | PENDIENTE | Diseno/esquema oficial fijado y regla de huella aplicable. | Hash o XML no reproducible. | si |
| Formato de fechas | PENDIENTE | Diseno oficial, validaciones y reglas de huella/QR si aplican. | Fechas admitidas localmente pero rechazables oficialmente. | si |
| Fecha/hora y zona horaria | PENDIENTE | Diseno oficial, validaciones y documentacion de generacion/registro. | Mezclar fecha documental, fecha de registro y zona incorrecta. | si |
| Normalizacion de NIF | PENDIENTE | Diseno oficial y validaciones de identificadores. | Aceptar identificadores mal normalizados o no admitidos. | si |
| Normalizacion de importes | PENDIENTE | Diseno oficial, validaciones y reglas de QR/hash si aplican. | Diferencias por separador, signo, precision o redondeo. | si |
| Decimales y redondeo | PENDIENTE | Diseno oficial y validaciones de importes. | Totales no reproducibles o inconsistentes con factura. | si |
| Encoding | PENDIENTE | Esquema oficial y reglas tecnicas de serializacion. | Bytes distintos para el mismo contenido conceptual. | si |
| Espacios | PENDIENTE | Reglas de canonicalizacion/huella oficiales. | Hash distinto por espacios no controlados. | si |
| Mayusculas/minusculas | PENDIENTE | Reglas oficiales de normalizacion. | Inconsistencias en identificadores, codigos o salida hash. | si |
| Valores nulos | PENDIENTE | Esquema oficial y validaciones de campos opcionales/condicionales. | Serializar ausencias de forma no admitida. | si |
| Booleanos o flags | PENDIENTE | Diseno oficial y catalogos si existen. | Mapear estados internos a valores oficiales incorrectos. | si |
| Algoritmo de huella | PENDIENTE | Documento oficial de huella/hash versionado. | Confundir hash interno local/staging con huella oficial. | si |
| Salida hexadecimal | PENDIENTE | Documento oficial de huella/hash versionado. | Longitud, casing o codificacion no reproducible. | si |
| Relacion con registro anterior | PENDIENTE | Diseno oficial y reglas de huella/encadenamiento. | Cadena local valida pero cadena oficial invalida. | si |
| Primer registro de cadena | PENDIENTE | Diseno oficial y reglas de primer registro. | Crear un caso inicial no aceptable en contrato oficial. | si |
| Alta | PENDIENTE | Diseno de registro de alta, esquema y validaciones. | Tratar un alta candidata como XML definitivo. | si |
| Anulacion | PENDIENTE | Diseno de registro de anulacion, esquema y validaciones. | Anular con referencias o campos insuficientes. | si |

## 6. Politica de anonimizacion y datos sinteticos

Reglas obligatorias para futuros fixtures:

- Prefijo obligatorio `SYNTHETIC_ONLY`.
- NIFs ficticios, no atribuibles a personas o empresas reales.
- Nombres ficticios.
- Series ficticias.
- Numeros ficticios.
- Importes de prueba.
- Fechas controladas.
- No clientes reales.
- No facturas reales.
- No PDFs reales.
- No certificados.
- No tokens.
- No URLs operativas.
- No respuestas AEAT reales.

Cualquier fixture que no cumpla estas reglas debe rechazarse antes de guardarse,
ejecutarse o revisarse. Si un dato sintetico puede confundirse con un dato real,
tambien debe rechazarse.

La politica futura debera conservar trazabilidad suficiente para reproducir una
prueba sin exponer datos completos ni material sensible.

## 7. Reglas de no exposicion

Reglas para futuras fases de fixtures, validadores o evidencia:

- No imprimir XML completo en logs.
- No imprimir snapshots completos.
- No imprimir payload documental completo.
- No imprimir secrets.
- No imprimir service role.
- No imprimir certificados.
- No imprimir claves privadas.
- No imprimir respuestas AEAT reales.
- Usar digest/resumen seguro cuando haga falta.

Los logs y evidencias futuras deberan contener estados, codigos internos,
digests o resumenes minimos. No deberan contener material suficiente para
reconstruir una factura, un XML completo, una clave, un certificado o una
respuesta externa real.

## 8. Criterios de salida para pasar a fixtures ejecutables

Antes de 2B.5E o fase equivalente de fixtures ejecutables debe existir:

- fuentes oficiales fijadas;
- esquema/versionado decidido;
- canonicalizacion decidida;
- politica de anonimizacion aprobada;
- fixture matrix revisada;
- decision de almacenamiento de fixtures;
- politica de no impresion de XML completo;
- aprobacion explicita.

Si cualquiera de esos puntos queda pendiente, no debe crearse fixture
ejecutable, generador, validador XML ejecutable ni archivo XML completo de
ejemplo.

## 9. Limites

- No codigo funcional.
- No migraciones.
- No XML definitivo.
- No XML AEAT definitivo.
- No archivos XML completos.
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

2B.5D debe dejar una politica documental clara para bloquear fixtures
ejecutables hasta que fuentes, esquema, canonicalizacion y anonimizacion esten
fijados. El siguiente paso solo deberia crear fixtures si estos criterios estan
cerrados y existe aprobacion explicita.
