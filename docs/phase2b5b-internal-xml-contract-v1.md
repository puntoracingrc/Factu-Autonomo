# Contrato interno futuro de XML VeriFactu 2B.5B

Fase:

`PHASE2B5B_INTERNAL_XML_CONTRACT_V1`

Estado:

`CONTRATO DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## 1. Objetivo

Este documento define un contrato interno futuro para una posible generacion de
XML oficial de alta y anulacion. Es una fase previa a cualquier implementacion y
sirve para separar datos internos candidatos, decisiones pendientes, riesgos y
criterios de salida.

Este documento:

- no genera XML;
- no firma;
- no usa certificados;
- no transporta;
- no conecta con AEAT;
- no activa produccion;
- no sustituye revision legal/fiscal externa.

El contrato queda deliberadamente incompleto cuando una regla depende de fuente
oficial pendiente, fixtures, validacion externa o aprobacion explicita. En esos
casos se marca `PENDIENTE`.

## 2. Entradas internas candidatas

| Entrada interna | Que campo aporta | Fiable local/staging | Falta confirmar oficialmente | Riesgo de usarlo como dato final sin validacion |
| --------------- | ---------------- | -------------------- | ----------------------------- | ---------------------------------------------- |
| `fiscal_records` | Identificador interno de registro, secuencia local, hash candidato, referencia a operacion/documento y estado fiscal candidato. | Si, como persistencia local/staging del bloque 2B.4. | Correspondencia con registro XML oficial, campos obligatorios, estructura, version y reglas de aceptacion. | Confundir registro candidato con registro oficial AEAT. |
| `fiscal_chain_state` | Estado local de cadena, ultimo registro y hash candidato anterior. | Si, para control local/staging. | Equivalencia con encadenamiento oficial, primer registro, anulado/anulacion y reconciliacion tras respuesta externa. | Asumir que la cadena local equivale a la cadena oficial. |
| `fiscal_operations` | Tipo de operacion fiscal candidata, estado interno, idempotencia y relacion con documento. | Si, para orquestacion local/staging. | Mapeo oficial entre alta, anulacion, subsanacion, rechazo previo y posibles variantes. | Derivar XML final desde estados internos insuficientes. |
| `fiscal_invoice_identities` | Identidad fiscal candidata de factura, serie/numero local-staging y relacion con usuario/emisor. | Si, solo como identidad candidata local/staging. | Formato oficial de numero/serie, reglas de numeracion real, facturas simplificadas, rectificativas y anulaciones. | Usar numeracion candidata como numeracion real. |
| `server_documents` | Documento canonico servidor, datos de emisor/cliente, importes y fecha documental candidatos. | Parcialmente, segun origen y estado del documento. | Campos exactos que alimentan registro, diferencias entre factura y registro, datos excluidos o condicionales. | Copiar contenido documental completo al XML sin contrato oficial. |
| Payload candidato 2B.4N/O | Estructura conceptual no definitiva para alta/anulacion local/staging. | Si, como base conceptual no transportable. | Estructura XML oficial, nombres de nodos, namespace, version, campos y validaciones. | Reutilizar payload candidato como XML definitivo. |
| Validacion semantica 2B.4P | Checks internos sobre finality, transportabilidad, firma, certificados, datos obligatorios candidatos y flags de seguridad. | Si, como filtro local/staging. | Validaciones oficiales sintacticas/de negocio y codigos de error. | Tratar validacion semantica interna como validacion AEAT. |
| Evidencia interna 2B.4Q/R/S/T/U | Evidence packets, persistence, integrity y operational summary. | Si, para auditoria interna local/staging. | Si debe existir o no relacion con respuestas externas futuras. | Convertir evidencia interna en cola, transporte o prueba de aceptacion externa. |

## 3. Contrato conceptual de XML de alta

Esta tabla no define campos oficiales finales. Identifica areas internas que
podrian alimentar un XML futuro y deja como `PENDIENTE` todo lo que requiera
confirmacion oficial.

| Campo interno futuro | Fuente interna candidata | Fuente oficial pendiente | Reglas pendientes | Riesgo |
| -------------------- | ------------------------ | ------------------------ | ----------------- | ------ |
| Emisor | `server_documents`, `fiscal_invoice_identities`, perfil fiscal futuro. | PENDIENTE | Identidad exacta, razon social, representacion, validaciones de sujeto obligado. | Generar registro con emisor incompleto o no autorizado. |
| NIF | `server_documents`, perfil fiscal futuro, `fiscal_invoice_identities`. | PENDIENTE | Formato, normalizacion, validacion y relacion con obligado a expedir. | Normalizar mal o usar NIF de entorno no autorizado. |
| Numero/serie | `fiscal_invoice_identities`, `server_documents`. | PENDIENTE | Formato, longitud, unicidad, serie, facturas simplificadas/rectificativas. | Confundir numeracion candidata con numeracion real. |
| Fecha expedicion | `server_documents`, material fiscal candidato. | PENDIENTE | Formato, zona, fecha minima, relacion con fecha operacion y fecha/hora de registro. | Usar fecha documental en formato no valido. |
| Tipo de registro | `fiscal_operations`, payload candidato. | PENDIENTE | Mapeo oficial de alta y variantes. | Mapear alta interna a tipo oficial incorrecto. |
| Huella/hash | `fiscal_records.record_hash`, `fiscal_chain_state`. | PENDIENTE | Algoritmo oficial, orden de campos, normalizacion, salida, version. | Asumir que `record_hash` es huella oficial. |
| Registro anterior | `fiscal_chain_state`, `fiscal_records`. | PENDIENTE | Primer registro, registro anterior, anulacion previa, huecos y respuesta externa. | Romper cadena oficial por usar estado local sin reconciliacion. |
| Importe si aplica | `server_documents`, payload candidato, validacion semantica. | PENDIENTE | Formato decimal, redondeos, signo, totales y desglose exigido. | Diferencias entre total documental y total oficial. |
| Identificadores de factura | `fiscal_invoice_identities`, `server_documents`. | PENDIENTE | Composicion exacta, compatibilidad con QR y anulacion. | Inconsistencia entre XML, QR y documento. |
| Datos de anulacion/subsanacion si aplica | `fiscal_operations`, payload candidato. | PENDIENTE | Relacion entre alta, anulacion, subsanacion y rechazo previo. | Mezclar flujos que deben tratarse como registros distintos. |
| Version/esquema | Configuracion futura, fuente oficial fijada. | PENDIENTE | Version oficial vigente, namespace, esquema y compatibilidad. | Generar XML contra version obsoleta o no fijada. |

## 4. Contrato conceptual de XML de anulacion

Esta tabla es equivalente para anulacion. No define XML real ni nodos oficiales.

| Campo interno futuro | Fuente interna candidata | Fuente oficial pendiente | Reglas pendientes | Riesgo |
| -------------------- | ------------------------ | ------------------------ | ----------------- | ------ |
| Identificacion de factura anulada | `fiscal_invoice_identities`, `fiscal_records`, `server_documents`. | PENDIENTE | Campos exactos de identificacion, serie/numero, fecha y emisor. | Anular una factura distinta o no localizable. |
| Emisor | `server_documents`, `fiscal_invoice_identities`, perfil fiscal futuro. | PENDIENTE | Correspondencia entre emisor de la factura anulada y obligado que anula. | Incoherencia de sujeto o representacion. |
| Fecha | `server_documents`, `fiscal_operations`, material fiscal candidato. | PENDIENTE | Fecha de expedicion anulada, fecha/hora de generacion y formatos. | Mezclar fecha de factura con fecha de anulacion. |
| Huella | `fiscal_records.record_hash`, `fiscal_chain_state`. | PENDIENTE | Huella oficial del registro de anulacion y entrada de calculo. | Reusar hash candidato sin validar contra especificacion oficial. |
| Registro anterior | `fiscal_chain_state`, `fiscal_records`. | PENDIENTE | Encadenamiento de anulacion, primer registro y registro previo. | Cadena local valida pero cadena oficial invalida. |
| Motivo si aplica | `fiscal_operations`, notas internas futuras. | PENDIENTE | Si existe campo oficial, catalogo, obligatoriedad y validaciones. | Inventar motivo o conservar dato no admitido. |
| Referencias a registro previo | `fiscal_records`, evidence integrity, operation id. | PENDIENTE | Si debe referenciar registro de alta, registro previo de cadena o ambos. | Referencia insuficiente para validacion externa. |
| Validaciones pendientes | Validacion semantica 2B.4P y futura matriz oficial. | PENDIENTE | Validaciones sintacticas/de negocio y errores admisibles/no admisibles. | Aceptar localmente registros rechazables. |
| Version/esquema | Configuracion futura, fuente oficial fijada. | PENDIENTE | Version oficial vigente, namespace, esquema y compatibilidad. | Anulacion generada contra contrato no vigente. |

## 5. Reglas de canonicalizacion pendientes

Quedan pendientes y no deben implementarse por inferencia:

- orden exacto de campos;
- normalizacion de fechas;
- normalizacion de importes;
- normalizacion de NIF;
- encoding;
- espacios;
- mayusculas/minusculas;
- representacion de nulos;
- huella oficial;
- version de esquema.

Estas reglas requieren una fase especifica con fuente oficial fijada, fixtures
sinteticos y pruebas de regresion. Hasta entonces, cualquier transformacion debe
considerarse candidata y no final.

## 6. Relacion con `fiscal_records.record_hash`

`fiscal_records.record_hash` actual es candidato/local-staging.

No debe asumirse igual a la huella oficial. La huella oficial requiere una fase
especifica con fixtures, reglas de canonicalizacion, version de esquema y
contraste contra documentacion oficial.

Cualquier equivalencia futura debera probarse contra documentacion oficial y
fixtures controlados. Si no puede demostrarse de forma reproducible, el sistema
debera conservar ambos valores separados:

- hash interno local/staging;
- huella oficial futura.

## 7. Relacion con payload candidato 2B.4

El payload candidato 2B.4:

- no es XML definitivo;
- no debe reutilizarse como XML oficial sin rediseño;
- puede servir como base conceptual;
- no es contrato final;
- no es transportable;
- no sustituye esquemas, validaciones ni fixtures oficiales.

La salida final futura, si se aprueba, debera estar separada, versionada y
trazada. Debe poder evolucionar sin romper la evidencia local/staging ya
existente ni confundirla con respuesta externa.

## 8. Limites de esta fase

- No codigo funcional.
- No migraciones.
- No XML AEAT definitivo.
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

## 9. Criterios de salida para pasar a 2B.5C

Antes de fixtures o implementacion debe existir:

- contrato interno revisado;
- fuentes oficiales fijadas;
- lista de campos obligatorios/condicionales;
- lista de dudas pendientes;
- decision sobre esquema/versionado;
- decision sobre fixtures sinteticos;
- aprobacion explicita.

## Resultado esperado

2B.5B debe cerrar solo una frontera documental de contrato interno. El siguiente
paso posible, 2B.5C, deberia limitarse a fixtures locales sinteticos y
validacion de estructura, todavia sin firma, certificados, transporte, AEAT real
ni produccion.
