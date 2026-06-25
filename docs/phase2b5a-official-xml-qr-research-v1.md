# Investigacion oficial XML y QR VeriFactu 2B.5A

Fase:

`PHASE2B5A_OFFICIAL_XML_QR_RESEARCH_V1`

Fecha de consulta:

2026-06-25

Estado:

`INVESTIGACION DOCUMENTAL PREVIA`

## Objetivo

Este documento recoge una primera investigacion tecnica documental, basada en
fuentes oficiales, sobre areas externas que pueden afectar a una futura
implementacion de registros XML, QR, campos, estructura, hash, firma, transporte
y respuestas.

Este documento:

- no implementa XML;
- no implementa QR;
- no implementa firma;
- no implementa certificados;
- no implementa transporte;
- no conecta con AEAT;
- no activa produccion.

La finalidad es separar la base local/staging ya cerrada en 2B.4 de cualquier
decision futura que dependa de especificaciones oficiales, revision externa y
aprobacion explicita.

## Fuentes consultadas

| Fuente | URL | Fecha de consulta | Tipo de fuente | Que cubre | Limitaciones o dudas |
| ------ | --- | ----------------- | -------------- | --------- | -------------------- |
| Real Decreto 1007/2023 | https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840 | 2026-06-25 | BOE / norma consolidada | Reglamento base de requisitos SIF y estandarizacion de registros de facturacion. | Debe leerse junto con orden ministerial y documentos tecnicos publicados por AEAT. |
| Orden HAC/1177/2024 | https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138 | 2026-06-25 | BOE / orden ministerial | Especificaciones tecnicas, funcionales y de contenido; menciona registro de alta, anulacion, huella, firma y QR. | Puede requerir contraste con anexos y detalles tecnicos actualizados en Sede AEAT. |
| Portal AEAT SIF y VERI*FACTU | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html | 2026-06-25 | AEAT / pagina oficial | Punto de entrada oficial a informacion general, normativa, FAQ, gestiones e informacion tecnica. | Es indice; no sustituye a los documentos tecnicos enlazados. |
| AEAT cuestiones generales | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/cuestiones-generales.html | 2026-06-25 | AEAT / guia oficial | Ambito, modalidades, registros de alta/anulacion, QR/leyenda, hash, firma para frontera futura. | Contenido orientativo; los contratos futuros deben apoyarse en normativa y documentos tecnicos. |
| AEAT informacion tecnica: disenos de registro | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/disenos-registro.html | 2026-06-25 | AEAT / informacion tecnica | Entrada oficial a disenos de registro y material para desarrolladores. | La implementacion futura debe descargar y versionar el diseno oficial vigente antes de codificar. |
| AEAT documento de diseno de registro | https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Documento_Diseno_de_registro_de_facturacion/Documento_Diseno_de_registro_de_facturacion.html | 2026-06-25 | AEAT desarrolladores / fuente primaria | Referencia al fichero oficial de disenos de registro de facturacion. | No se incorpora el fichero ni se extrae contrato ejecutable en esta fase. |
| AEAT algoritmo de huella/hash | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/algoritmo-calculo-codificacion-huella-hash.html | 2026-06-25 | AEAT / informacion tecnica | Entrada oficial al documento de calculo de huella o hash. | Esta fase no implementa calculo de huella oficial. |
| AEAT PDF especificacion huella/hash | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | 2026-06-25 | AEAT / PDF tecnico | Algoritmo, datos de entrada, datos de salida y ejemplos para huella/hash. | La futura implementacion debe fijar version, fixtures oficiales y pruebas de regresion. |
| AEAT QR y servicio de cotejo | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/caracteristicas-qr-especificaciones-servicio-cotejo-factura.html | 2026-06-25 | AEAT / informacion tecnica | Entrada oficial a caracteristicas del QR y servicio de cotejo/remision por receptor. | Esta fase no genera QR ni invoca servicios. |
| AEAT PDF especificacion QR | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf | 2026-06-25 | AEAT / PDF tecnico | Tamano, norma QR, parametros, URL, ubicacion, presentacion y respuestas de cotejo. | No se reproducen endpoints operativos ni se construyen URLs de uso real. |
| AEAT validaciones y errores | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/documento-validaciones-errores.html | 2026-06-25 | AEAT / informacion tecnica | Entrada oficial a validaciones y errores. | Debe convertirse en matriz de validacion solo en una fase posterior. |
| AEAT servicios de remision voluntaria | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/especificaciones-servicios-remision-voluntaria-registros-validaciones.html | 2026-06-25 | AEAT / informacion tecnica | Entrada oficial a servicios de remision y validaciones. | Solo frontera futura; no hay transporte ni conexion en esta fase. |
| AEAT PDF servicios de remision | https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf | 2026-06-25 | AEAT / PDF tecnico | Servicios, validaciones, respuestas y tratamiento de errores. | No se implementan llamadas, colas ni reintentos reales. |
| AEAT firma electronica | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/especificaciones-tecnicas-firma-electronica-registros-evento.html | 2026-06-25 | AEAT / informacion tecnica | Entrada oficial a especificaciones de firma electronica. | Solo frontera futura; no se usan certificados reales. |
| AEAT PDF firma electronica | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Espec-Tecnicas/EspecTecGenerFirmaElectRfact.pdf | 2026-06-25 | AEAT / PDF tecnico | Alcance, certificados, formato de firma, entrada y salida. | No se implementa firma ni gestion de certificados. |

## Areas tecnicas a investigar

### XML de alta

La fuente oficial distingue registros de facturacion de alta. La investigacion
pendiente debe derivar un contrato interno desde los disenos oficiales vigentes,
sin reutilizar el payload candidato 2B.4 como XML final.

Puntos a confirmar antes de implementar:

- estructura oficial del registro de alta;
- campos obligatorios, condicionales y opcionales;
- version del esquema/diseno aplicable;
- reglas de validacion sintactica y de negocio;
- tratamiento de facturas rectificativas, subsanacion y rechazo previo;
- relacion entre contenido de factura y registro de facturacion.

### XML de anulacion

La fuente oficial contempla registros de anulacion. La base 2B.4 tiene anulacion
local/staging en payload candidato, pero no XML de anulacion oficial.

Puntos a confirmar:

- identificacion exacta de la factura anulada;
- encadenamiento del registro de anulacion;
- reglas de fecha y huella;
- relacion con anulacion, subsanacion y registros previos;
- respuesta esperada ante registros no localizados o inconsistentes.

### Identificacion de emisor

Las fuentes tecnicas de hash y QR hacen depender varios calculos de la
identificacion del obligado a expedir la factura. La futura implementacion debe
decidir como mapear datos de emisor internos a campos oficiales sin datos reales
en desarrollo.

Puntos a confirmar:

- NIF/identificadores admitidos;
- nombre o razon social cuando aplique;
- representacion por tercero o colaborador social como frontera futura;
- coherencia entre emisor de factura, obligado tributario y sistema informatico.

### Identificacion de factura

La identificacion de factura aparece como base de huella, QR y registros. En
2B.4 existe numeracion candidata local/staging, no numeracion real productiva.

Puntos a confirmar:

- numero y serie oficiales;
- formato y longitud;
- relacion con factura simplificada, rectificativa y anulacion;
- estabilidad entre documento, registro, QR y transporte;
- prohibicion de usar datos reales en fixtures locales.

### Fecha de expedicion

Las fuentes oficiales usan la fecha de expedicion en registros, hash y QR. La
futura implementacion debe separar fecha de documento, fecha de operacion y hora
de generacion del registro.

Puntos a confirmar:

- formato exacto de fecha;
- zona horaria para fecha/hora de generacion;
- validaciones de fecha minima o ventanas admitidas;
- tratamiento de facturas antiguas, rectificativas y anulaciones.

### Huella/hash

El documento tecnico de AEAT de huella/hash indica SHA-256 como algoritmo
permitido en la version consultada, salida hexadecimal en mayusculas y campos
de entrada diferenciados para alta, anulacion y eventos. La base 2B.4 usa hashes
candidatos, pero no implementa la huella oficial.

Puntos a confirmar:

- version oficial vigente del documento de hash;
- orden exacto de concatenacion por tipo de registro;
- normalizacion de espacios y valores numericos;
- formato de salida y longitud;
- fixtures oficiales y casos de primer registro;
- equivalencia o no equivalencia con `fiscal_records.record_hash`.

### Encadenamiento

La normativa y los documentos tecnicos relacionan huella y registro anterior.
2B.4 dispone de `fiscal_chain_state` local/staging, pero no cadena oficial
productiva.

Puntos a confirmar:

- criterios de primer registro;
- identificacion de registro anterior;
- comportamiento para alta, anulacion y eventos;
- atomicidad requerida antes de generar XML definitivo;
- reconciliacion ante rechazo o aceptacion con errores.

### QR

La documentacion oficial de QR define parametros y requisitos de presentacion.
Esta fase no genera QR ni URL. La futura implementacion debe tratar QR como
resultado derivado del registro oficial, no como una extension decorativa del
PDF.

Puntos a confirmar:

- parametros obligatorios y opcionales;
- codificacion URL y caracteres admitidos;
- tamano, nivel de correccion y ubicacion;
- diferencias entre escenarios verificables y no verificables;
- formato de fecha e importe;
- relacion con factura electronica estructurada y factura en PDF.

### Frase o leyenda si aplica

Las fuentes oficiales distinguen la frase asociada a facturas expedidas por
sistemas verificables. La base 2B.4 no autoriza a mostrar leyendas productivas.

Puntos a confirmar:

- cuando debe aparecer la frase;
- texto exacto permitido;
- tipografia/visibilidad;
- condiciones previas para mostrarla;
- controles para impedir que UI o PDF la muestren sin remision real validada.

### Firma/certificado, solo como frontera futura

La firma y los certificados quedan fuera de esta fase. La documentacion oficial
consultada debe tratarse como fuente para una fase posterior de politica y
arquitectura, no como permiso para usar certificados reales.

Puntos a confirmar mas adelante:

- modalidad en la que la firma resulta exigible;
- formato XAdES y nodos exactos;
- politica de firma aplicable;
- custodia, rotacion y permisos de certificados;
- prohibicion de usar certificados reales sin aprobacion separada.

### Transporte, solo como frontera futura

El transporte queda fuera. Los documentos de servicios de remision y WSDL deben
servir para diseno posterior, no para conectar ahora.

Puntos a confirmar mas adelante:

- contratos de servicio;
- autenticacion y representacion;
- idempotencia;
- lotes o unidades de envio;
- estados internos y trazabilidad;
- separacion entre evidencia interna y envio externo.

### Respuestas AEAT, solo como frontera futura

El documento de servicios describe tipos de respuesta y errores. En 2B.4 no se
persisten respuestas AEAT reales.

Puntos a confirmar mas adelante:

- estados de aceptacion, rechazo y aceptacion con errores;
- codigos y mensajes;
- conservacion de respuestas;
- vinculo con registros internos;
- auditoria sin imprimir XML completo ni datos sensibles.

### Errores/reintentos, solo como frontera futura

Los reintentos reales no existen. Cualquier diseno futuro debe impedir que
`fiscal_transport_attempts` se convierta por inercia en cola de transporte sin
contrato especifico.

Puntos a confirmar mas adelante:

- errores no admisibles frente a admisibles;
- politica de reintento;
- backoff y limites;
- reconciliacion manual;
- rollback operativo;
- alertas y bloqueo de duplicados.

## Comparativa con base 2B.4

| Area oficial | Existe en 2B.4 local/staging | Brecha | Riesgo | Proxima decision |
| ------------ | ---------------------------- | ------ | ------ | ---------------- |
| `fiscal_records` | Si, como registro candidato local/staging. | No es registro XML oficial ni garantia de aceptacion externa. | Confundir persistencia interna con registro oficial. | Definir contrato XML oficial separado. |
| `fiscal_chain_state` | Si, como cadena local/staging. | No implementa huella oficial ni respuesta externa. | Encadenar localmente con reglas distintas a AEAT. | Validar algoritmo oficial con fixtures. |
| Payload candidato | Si, no definitivo y no transportable. | No es XML AEAT definitivo. | Reutilizarlo como XML final sin rediseño. | Crear 2B.5B de contrato interno XML. |
| Evidence packets | Si, internos y seguros. | No son envio, ni cola, ni respuesta AEAT. | Convertir evidencia en transporte. | Mantener como auditoria interna. |
| Evidence persistence | Si, en `fiscal_evidence_packets`. | No conserva respuestas externas. | Presentar evidencia interna como aceptacion externa. | Separar tabla/contrato de respuestas futuras. |
| Evidence integrity | Si, lectura read-only. | No valida contra esquemas oficiales. | Tomar integridad local como validez oficial. | Anadir validacion local de XML en fase posterior. |
| Operational summary | Si, agregado server-only. | No es monitor productivo ni estado AEAT. | Usarlo como indicador de cumplimiento real. | Mantenerlo en local/staging. |
| Transport attempts | Tabla base existe; 2B.4 no la usa como cola. | Falta diseno especifico de transporte. | Usar `fiscal_transport_attempts` sin contrato. | Diseñar transporte en 2B.5E, sin conexion. |
| XML definitivo | No. | Requiere diseno oficial, esquema, validaciones y fixtures. | Implementar desde supuestos. | Investigar y aprobar contrato 2B.5B. |
| QR | No definitivo. | Requiere parametros, formato, ubicacion y condiciones oficiales. | Mostrar QR no valido o leyenda indebida. | Disenar QR despues de XML oficial. |
| Firma | No. | Requiere politica, formato, certificados y custodia. | Usar firma sin controles. | Fase documental de certificados/firma. |
| Certificados | No. | Requiere politica de secretos y autorizacion. | Tocar certificados reales en desarrollo. | 2B.5D sin certificados reales. |
| Transporte | No. | Requiere servicios, autenticacion, respuestas e idempotencia. | Conectar AEAT sin staging/autorizacion. | 2B.5E solo diseno. |
| Respuestas | No. | Falta modelo de estados y conservacion. | Perder trazabilidad o reintentar mal. | 2B.5F solo diseno. |

## Preguntas pendientes

- Cuales son los campos obligatorios exactos por tipo de registro.
- Que campos son condicionales y bajo que reglas.
- Cual es el formato definitivo de fechas y fecha/hora con huso.
- Cual es el formato exacto de huella/hash por alta, anulacion y evento.
- Que canonicalizacion o normalizacion debe aplicarse antes de hash y firma.
- Cual es la estructura XML vigente y como se versiona.
- Que esquemas oficiales deben fijarse en fixtures locales.
- Que reglas exactas gobiernan QR, URL, parametros e idioma.
- Cual es la relacion entre alta, anulacion, subsanacion y rechazo previo.
- En que modalidad aplica firma y que certificados se admiten.
- Como se prueba oficialmente sin tocar produccion.
- Que entorno de test o portal de pruebas puede usarse y bajo que autorizacion.
- Como se conservan respuestas, errores y evidencias sin imprimir XML completo.
- Como se modelan errores admisibles y no admisibles.
- Que reintentos son seguros y cuales requieren intervencion manual.

## Recomendacion de fases posteriores

- 2B.5B: contrato interno de XML definitivo, sin firma ni transporte.
- 2B.5C: fixtures locales sinteticos de XML, sin datos reales.
- 2B.5D: politica de certificados, sin certificados reales.
- 2B.5E: diseno de transporte, sin conexion.
- 2B.5F: respuestas y reintentos, sin produccion.
- 2B.5G: revision externa legal/fiscal antes de implementacion real.

## Criterios de entrada antes de implementar

Antes de cualquier implementacion real debe existir:

- revision legal/fiscal externa;
- revision tecnica de la especificacion oficial vigente;
- decision de alcance verificable/no verificable;
- contrato interno aprobado;
- fixtures oficiales o sinteticos revisados;
- entorno de pruebas autorizado;
- politica de certificados y secretos;
- plan de errores, respuestas, reintentos y rollback;
- aprobacion explicita.

## Limites

- No codigo funcional.
- No migraciones.
- No XML definitivo.
- No QR definitivo.
- No firma.
- No certificados.
- No transporte.
- No AEAT real.
- No UI.
- No produccion.
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

## Resultado de esta fase

2B.5A queda definida como investigacion oficial inicial. No cambia el estado de
producto: 2B.4 sigue cerrado solo como base local/staging y cualquier capacidad
externa real queda pendiente de fases posteriores, revision externa y aprobacion
separada.
