# Registro de artefactos oficiales VeriFactu 2B.5E

Fase:

`PHASE2B5E_OFFICIAL_ARTIFACTS_REGISTRY_V1`

Estado:

`REGISTRO DOCUMENTAL / NO IMPLEMENTACION`

Fecha de consulta base:

2026-06-25

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5b-internal-xml-contract-v1.md`
- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## 1. Objetivo

Este documento registra que artefactos oficiales deben quedar identificados,
versionados y trazados antes de cualquier implementacion ejecutable relacionada
con XML, huella, QR, firma, certificados, transporte, respuestas o reintentos.

Este documento confirma:

- no codigo funcional;
- no migraciones;
- no XML definitivo;
- no archivos XML completos;
- no fixtures ejecutables;
- no QR definitivo;
- no firma;
- no certificados;
- no transporte;
- no AEAT real;
- no produccion.

La finalidad es impedir que una fuente oficial mencionada en una investigacion
previa se convierta por inercia en contrato ejecutable. Cada artefacto debera
tener fuente, fecha de consulta, version o identificador, estado y decision de
uso futuro antes de desbloquear codigo.

## 2. Relacion con fases previas

2B.5E continua la frontera documental abierta por:

- `docs/phase2b5a-official-xml-qr-research-v1.md`: investigacion de fuentes
  oficiales sobre XML, QR, huella/hash, firma, certificados, transporte,
  validaciones y respuestas.
- `docs/phase2b5b-internal-xml-contract-v1.md`: contrato interno futuro, no
  ejecutable, para separar entradas candidatas y reglas pendientes.
- `docs/phase2b5c-xml-fixtures-validation-plan-v1.md`: plan de fixtures
  sinteticos y validaciones futuras, sin crear fixtures ni XML completo.
- `docs/phase2b5d-xml-source-schema-canonicalization-v1.md`: politica previa de
  fuentes, esquema, canonicalizacion y anonimizacion.
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`:
  cierre local/staging del flujo fiscal candidato, expresamente no productivo.

2B.5E no sustituye esas fases. Solo agrega un registro de artefactos oficiales
que deberan quedar controlados antes de pasar a cualquier implementacion.

## 3. Registro de artefactos oficiales

Estados permitidos:

- `IDENTIFICADO`
- `PENDIENTE_VERSION`
- `PENDIENTE_ARTEFACTO`
- `NO_APLICA_EN_ESTA_FASE`

Si no hay version clara o no se ha fijado el artefacto exacto en esta fase, se
usa `PENDIENTE_VERSION` o `PENDIENTE_ARTEFACTO`.

| Area | Artefacto oficial | Fuente/URL | Fecha consulta | Version/identificador | Estado | Uso futuro | Bloquea implementacion |
| ---- | ----------------- | ---------- | -------------- | --------------------- | ------ | ---------- | ---------------------- |
| Real Decreto 1007/2023 | Norma consolidada del reglamento de requisitos SIF. | https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840 | 2026-06-25 | BOE-A-2023-24840 | IDENTIFICADO | Marco normativo base para revisar alcance y obligaciones. | SI, como referencia normativa previa. |
| Orden HAC/1177/2024 | Orden ministerial con especificaciones tecnicas, funcionales y de contenido. | https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138 | 2026-06-25 | BOE-A-2024-22138 | IDENTIFICADO | Marco tecnico-normativo previo a XML, huella, QR y firma. | SI, como referencia normativa previa. |
| Diseno de registro de facturacion | Documento oficial de diseno de registro de facturacion. | https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Documento_Diseno_de_registro_de_facturacion/Documento_Diseno_de_registro_de_facturacion.html | 2026-06-25 | PENDIENTE_VERSION | PENDIENTE_VERSION | Fijar campos, estructura, tipos de registro y version antes de XML. | SI. |
| Esquema XML | Esquema o artefacto tecnico oficial aplicable a alta/anulacion. | AEAT informacion tecnica de disenos de registro referenciada en 2B.5A. | 2026-06-25 | PENDIENTE_ARTEFACTO | PENDIENTE_ARTEFACTO | Determinar namespace, estructura, validacion y compatibilidad. | SI. |
| Algoritmo huella/hash | Documento oficial de calculo y codificacion de huella/hash. | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | 2026-06-25 | PENDIENTE_VERSION | PENDIENTE_VERSION | Fijar algoritmo, entradas, orden, normalizacion y salida. | SI. |
| Especificacion QR | Documento oficial de detalle tecnico del codigo QR de factura. | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf | 2026-06-25 | PENDIENTE_VERSION | PENDIENTE_VERSION | Fijar parametros, URL, codificacion, presentacion y relacion con registro. | SI. |
| Validaciones y errores | Documento oficial de validaciones, errores y criterios de aceptacion/rechazo. | https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica/documento-validaciones-errores.html | 2026-06-25 | PENDIENTE_VERSION | PENDIENTE_VERSION | Convertir reglas oficiales en matriz futura de validacion local. | SI. |
| Servicios de remision, solo frontera futura | Especificaciones oficiales de servicios de remision voluntaria y validaciones. | https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf | 2026-06-25 | PENDIENTE_VERSION | NO_APLICA_EN_ESTA_FASE | Solo diseno futuro de frontera de transporte. | SI para transporte futuro; no aplica a esta fase. |
| Firma electronica, solo frontera futura | Especificaciones tecnicas de firma electronica de registros/eventos. | https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Espec-Tecnicas/EspecTecGenerFirmaElectRfact.pdf | 2026-06-25 | PENDIENTE_VERSION | NO_APLICA_EN_ESTA_FASE | Solo politica futura de certificados y firma. | SI para firma futura; no aplica a esta fase. |
| Respuestas/reintentos, solo frontera futura | Tratamiento de respuestas, errores y remision futura. | AEAT servicios de remision y validaciones referenciados en 2B.5A. | 2026-06-25 | PENDIENTE_VERSION | NO_APLICA_EN_ESTA_FASE | Solo diseno futuro de respuestas, reconciliacion y reintentos. | SI para transporte futuro; no aplica a esta fase. |

## 4. Politica de no descarga

Reglas de esta fase:

- no se descargan PDFs oficiales al repo;
- no se commitean documentos oficiales completos;
- no se copian PDFs completos en el repo sin aprobacion explicita;
- no se incorporan anexos oficiales completos como contenido local;
- no se usa una descarga temporal como contrato ejecutable;
- si en una fase futura se descarga un artefacto oficial, debe hacerse con
  aprobacion explicita;
- si en una fase futura se calcula hash de un artefacto oficial, debe
  documentarse junto con URL, fecha de consulta, version y motivo;
- si una fuente cambia, cualquier implementacion afectada queda bloqueada hasta
  revisar version, impacto y aprobacion.

La referencia a una URL oficial no equivale a descargar, versionar ni aprobar
su uso ejecutable.

## 5. Matriz de bloqueos

| Bloque | Motivo | Artefacto necesario | Estado actual | Se puede implementar |
| ------ | ------ | ------------------- | ------------- | -------------------- |
| XML alta | Falta fijar diseno/version, campos, estructura y validaciones oficiales. | Diseno de registro, esquema XML, validaciones y errores. | PENDIENTE | NO |
| XML anulacion | Falta fijar estructura, referencias, encadenamiento y validaciones oficiales. | Diseno de registro, esquema XML, validaciones y errores. | PENDIENTE | NO |
| Huella/hash oficial | Falta versionar artefacto, entradas, orden, normalizacion y salida. | Documento oficial de huella/hash. | PENDIENTE_VERSION | NO |
| Encadenamiento oficial | Falta confirmar primer registro, registro anterior, anulacion y reconciliacion. | Diseno de registro y huella/hash oficial. | PENDIENTE | NO |
| QR definitivo | Falta fijar parametros, codificacion, URL, presentacion y vinculo con registro. | Especificacion QR y diseno de registro. | PENDIENTE_VERSION | NO |
| Validacion local de estructura | Falta esquema/version y matriz oficial de validaciones. | Esquema XML, diseno de registro, validaciones y errores. | PENDIENTE_ARTEFACTO | NO |
| Firma | Queda fuera de esta fase y requiere politica de certificados aprobada. | Especificacion de firma, politica de certificado y entorno autorizado. | NO_APLICA_EN_ESTA_FASE | NO |
| Certificados | No hay custodia, permisos, rotacion ni entorno autorizado. | Politica de certificados y mecanismo de secretos aprobado. | NO_APLICA_EN_ESTA_FASE | NO |
| Transporte | No hay contrato de servicio fijado ni entorno test autorizado. | Servicios de remision, autenticacion, idempotencia y seguridad. | NO_APLICA_EN_ESTA_FASE | NO |
| Respuestas/reintentos | No hay modelo aprobado de estados, errores, backoff, reconciliacion y conservacion. | Servicios de remision, validaciones, respuestas y politica de reintentos. | NO_APLICA_EN_ESTA_FASE | NO |

La unica salida habilitada por 2B.5E es documentacion. Ningun bloque anterior
queda desbloqueado para codigo, migraciones, XML, fixtures, QR, firma,
certificados, transporte, AEAT real o produccion.
