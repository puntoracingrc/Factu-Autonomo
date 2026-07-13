import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_RELEASE_ID_V1 =
  "public-aeat-official-batch-12-vat-groups-refunds-exemptions-353-365.2026-07-13.v1" as const;

export type PublicAeatBatch12VatGroupsRefundsExemptions353365CodeV1 =
  "353" | "360" | "361" | "364" | "365";

const REVIEWED_ON = "2026-07-13" as const;
const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

const OFFICIAL_MODEL_INDEX_SOURCE = {
  id: "aeat.models.index.2026-07-08",
  authority: "AEAT",
  kind: "OFFICIAL_MODEL_INDEX",
  title: "Presentar y consultar declaraciones por modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "afcdabfbf137a734a06f7e8026af54cfae63d1cd8e78dd6a8d8f8c8deff00983",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ELECTRONIC_FORMS_SOURCE = {
  id: "aeat.forms-of-presentation.2025-12-16",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Formas de presentación de los modelos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/formas-presentacion-modelos.html",
  officialUpdatedOn: "2025-12-16",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8cb4e25f47d6079e5fa1026696c9428eb9df3536d412b38ac913305937e6d553",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const REGISTER_DESIGNS_SOURCE = {
  id: "aeat.register-designs.models-300-399.2026-02-04",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Diseños de registro · modelos 300 al 399",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-300-399.html",
  officialUpdatedOn: "2026-02-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7df7813fc7fea0d0f44ba6eada7cb578bb007ee5813f3aca5ede9b828470375e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_353_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-353.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 353 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G408.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f5220301efad44cb47fb5c91bcc7a7475ad0133365365fb544a1083eb446a0f1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_353_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-353.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 353",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G408.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "17383067d65239fc72898cfa5e5b92e055cff9ebb37fe6dcd566f4a0fabadc80",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_353_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-353.instructions.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 353 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-353-iva-tidades-modelo-mensual_/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "db104c2a2ce1752b13a20a1672240bf0b03946898dfe9284f0f5bffcdd5fa585",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_353_HELP_SOURCE = {
  id: "aeat.model-353.browser-file-help.2026-02-01",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 353 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-353.html",
  officialUpdatedOn: "2026-02-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ea21edb1bbe6ccae4850146a525a75dca55a1cfd27c36ffd69d410fd7d9668c1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_353_REGISTER_DESIGN_XLSX_SOURCE = {
  id: "aeat.model-353.register-design-xlsx.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Diseño de registro del Modelo 353 · ejercicio 2026 y siguientes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos_26/DR353e26v12.xlsx",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cb1374a79a87b7c8282ff3c964d78b250bedfa11750decfa0e5e7f90e8f97380",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_353_ORDER_SOURCE = {
  id: "boe.models-322-353-039.order-eha-3434-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3434/2007, de 23 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-20484",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5bee668edb54c5439856095ecf7199007cec203edb55788e0417b3771471e631",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_360_361_PROCEDURE_HOME_SOURCE = {
  id: "aeat.models-360-361.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelos 360 y 361 · página oficial compartida",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ09.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dafa2673df6a1cc8dfd262ac7796ad0cba41c1f72cf041df2412f10c9626a000",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_360_361_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.models-360-361.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento de los Modelos 360 y 361",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ09.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4b1345f984e95b572ec60cc13b56c86b88d3621b9b2b63650fe5790c982000c4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-360.instructions.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 360 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-360-modelo_____os-territorio-que-impuesto/instrucciones-modelo-360.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "34501993e7472c85a2f683a089a22ae3985e061730dac91c15accf3aad2fc733",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_FORM_HELP_SOURCE = {
  id: "aeat.model-360.browser-help.2026-01-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 360 · ayuda del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/presentacion-solicitud-devolucion-iva-no-establecidos/presentacion-formulario-360.html",
  officialUpdatedOn: "2026-01-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f96b6562162a567bc127d45b0161af3d0150e62ff0b97ed50527abe05fb44833",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_FILE_HELP_SOURCE = {
  id: "aeat.model-360.file-help.2026-01-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 360 · ayuda del envío por fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/presentacion-solicitud-devolucion-iva-no-establecidos/presentacion-fichero-360.html",
  officialUpdatedOn: "2026-01-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a1218c5676d6fc5e7a7f47e2e19572d761165021178a447b49daf5b5b9411b91",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_GUIDE_PAGE_SOURCE = {
  id: "aeat.model-360.guide-page.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 360 · guía oficial de presentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-360-modelo_____os-territorio-que-impuesto/guia-presentacion-modelo-360.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3595824b4f84f864c9793dacedc23ca2568b92e15d5cea8689392b328ce9b01b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_INSTRUCTIONS_PDF_SOURCE = {
  id: "aeat.model-360.instructions-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 360 · instrucciones PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ09/360/Inst_360_2009_acc.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4e58c45a654664c9c72239062c06a45a935c6e50ad0845e6e65d7c72a67bf339",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_GUIDE_PDF_SOURCE = {
  id: "aeat.model-360.guide-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 360 · guía PDF del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ09/360/Presentacion_formulario_360_v131114.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "417413f5068469cc5597e7586121d15a17b98e4216dc00b1937d73a45e65ccfb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_REGISTER_DESIGN_PDF_SOURCE = {
  id: "aeat.model-360.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 360 · diseño de registro PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos/DR360.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1361d004c0156d99555e0257b269ae379cbae420a454cdb90b9c37e0abc28950",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_361_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-361.instructions.2025-07-29",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 361 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/Ayuda/Presentacion/361.html",
  officialUpdatedOn: "2025-07-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a9ec815e4a675a0f18d3fa448c6e093e90f413a5d00b8eb8fac1e577cf2c5d85",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_361_HELP_SOURCE = {
  id: "aeat.model-361.browser-file-help.2026-01-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 361 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-361-ayuda-tecnica.html",
  officialUpdatedOn: "2026-01-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3262debf4db15564b5643192fc19ce69fe74bf439b16e0e3ae4f9395e76a2ef0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_361_OPERATIONS_FILE_PDF_SOURCE = {
  id: "aeat.model-361.operations-file-structure-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 361 · estructura de datos del fichero de operaciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Consultas_Inf/Presentacion_declaraciones/360_Devolucion_IVA_no_Establecidos/Modelo_361_Alta_solicitud/Modelo_361_Estructura_e_informacion_de_los_datos_del_fichero_de_operaciones_v1.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2fdd28f1679dcd989e38583f700be496b4bfdde1d6ba70171a3d3fa0d7ff064e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_360_361_ORDER_SOURCE = {
  id: "boe.models-360-361.order-eha-789-2010.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/789/2010, de 16 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-5210",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b5db29a65e81206c89a749a637ac47a51527a60cb3ef100f3d4a263c5b1bbdb2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_364_365_ORDER_SOURCE = {
  id: "boe.models-364-365.order-hap-841-2016.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/841/2016, de 30 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2016-5273",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7f205d722c20c889a7aaea1173cc169f9885731c9d912c1ef0d392200e70f7c9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const NATO_EXEMPTIONS_REGULATION_SOURCE = {
  id: "boe.nato-tax-exemptions.royal-decree-160-2008.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 160/2008, de 8 de febrero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2008-3866",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "83341fe5f6eac0cdeed5abc1e41ca35fcf6eb229b6059aeda7231c93558cc61c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const IVA_LAW_SOURCE = {
  id: "boe.iva.law-37-1992.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-1992-28740",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "91249600e999b8cb6de807035d19804fc57726bc287035dd5643e0f75ba69ebc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_364_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-364.procedure-home.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 364 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ86.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c1bc0adbfe1940b4aeb0b46c0e8fea5cffc3b792d4531edcad1810bef547c77e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_364_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-364.procedure-record.2026-03-02",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 364",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ86.shtml",
  officialUpdatedOn: "2026-03-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fd6e9a2e4e0dd450e931f5d7d855e5bd665caa4392c5c5907974a1077f65fc1f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_365_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-365.procedure-home.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 365 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ87.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b7110f11a0650a8c2e0cf24df4a339ba8d15ed00dffbe0da0e9ca6396dfc349f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_365_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-365.procedure-record.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 365",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ87.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f4bcf6892ad7908fa780ee7eb26c22d74eae388e30454a99861fd174cc630d3e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_360_INSTRUCTIONS_DOCUMENT = {
  id: "model-360-instructions-pdf",
  kind: "INSTRUCTIONS",
  title: "Formulario 360 · instrucciones para cumplimentar el formulario",
  sourceId: MODEL_360_INSTRUCTIONS_PDF_SOURCE.id,
  landingPageSourceId: MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "Inst_360_2009_acc.pdf",
  byteLength: 138099,
  pageCount: 6,
  sha256: "4e58c45a654664c9c72239062c06a45a935c6e50ad0845e6e65d7c72a67bf339",
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "ACROFORM_METADATA_ONLY",
  freshnessStatus: "LEGACY_REFERENCES_DETECTED",
  previewSuitability: "NONE",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_360_GUIDE_DOCUMENT = {
  id: "model-360-form-guide-pdf",
  kind: "GUIDE",
  title:
    "Presentación de la solicitud de devolución de IVA de no establecidos · Modelo 360",
  sourceId: MODEL_360_GUIDE_PDF_SOURCE.id,
  landingPageSourceId: MODEL_360_GUIDE_PAGE_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "Presentacion_formulario_360_v131114.pdf",
  byteLength: 2095551,
  pageCount: 22,
  sha256: "417413f5068469cc5597e7586121d15a17b98e4216dc00b1937d73a45e65ccfb",
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "DOCUMENT_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_360_REGISTER_DESIGN_DOCUMENT = {
  id: "model-360-register-design-pdf",
  kind: "REGISTER_DESIGN",
  title: "Modelo 360 · diseño de registro",
  sourceId: MODEL_360_REGISTER_DESIGN_PDF_SOURCE.id,
  landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "DR360.pdf",
  byteLength: 47415,
  pageCount: 5,
  sha256: "1361d004c0156d99555e0257b269ae379cbae420a454cdb90b9c37e0abc28950",
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "NONE",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_361_OPERATIONS_FILE_DOCUMENT = {
  id: "model-361-operations-file-structure-pdf",
  kind: "REGISTER_DESIGN",
  title: "Modelo 361 · estructura de datos del fichero de operaciones",
  sourceId: MODEL_361_OPERATIONS_FILE_PDF_SOURCE.id,
  landingPageSourceId: MODEL_361_HELP_SOURCE.id,
  mediaType: "application/pdf",
  fileName:
    "Modelo_361_Estructura_e_informacion_de_los_datos_del_fichero_de_operaciones_v1.pdf",
  byteLength: 369913,
  pageCount: 7,
  sha256: "2fdd28f1679dcd989e38583f700be496b4bfdde1d6ba70171a3d3fa0d7ff064e",
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "DOCUMENT_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_353_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_RELEASE_ID_V1,
  code: "353",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Grupo de entidades. Modelo agregado. Autoliquidación mensual.",
  summary:
    "Modelo agregado mensual del régimen especial del grupo de entidades en el IVA, con formulario electrónico, instrucciones, ayuda técnica y diseño de registro oficiales.",
  searchTerms: [
    "modelo 353",
    "IVA grupo de entidades",
    "grupo entidades agregado",
    "autoliquidación mensual agregada",
    "modelo agregado IVA",
    "régimen especial grupo entidades",
    "formulario electrónico 353",
    "fichero 353",
    "diseño de registro 353",
    "Orden EHA 3434 2007",
  ],
  sections: [
    {
      id: "model-353-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-353-purpose-identity",
          heading: "Modelo agregado del grupo de entidades",
          text: "El índice y el procedimiento de la AEAT identifican el Modelo 353 como el modelo agregado mensual del régimen especial del grupo de entidades en el Impuesto sobre el Valor Añadido.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_353_PROCEDURE_HOME_SOURCE.id,
            MODEL_353_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-353-purpose-context",
          heading: "Relación documental con el Modelo 322",
          text: "Las instrucciones oficiales describen el 353 como modelo agregado y mencionan las autoliquidaciones individuales del Modelo 322 como parte de ese contexto documental. Esta ficha no determina qué entidades quedan incluidas en un caso concreto.",
          sourceIds: [MODEL_353_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-353-access",
      title: "Canales y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-353-access-browser",
          heading: "Formulario electrónico",
          text: "La AEAT incluye el Modelo 353 entre los modelos con formulario en línea y mantiene una ayuda técnica específica para su cumplimentación en navegador.",
          sourceIds: [ELECTRONIC_FORMS_SOURCE.id, MODEL_353_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-353-access-file",
          heading: "Importación y exportación de fichero",
          text: "La ayuda técnica describe la importación y la exportación de ficheros con extensión .353, y el catálogo de diseños de registro enlaza una hoja de cálculo específica para el ejercicio 2026 y siguientes.",
          sourceIds: [
            MODEL_353_HELP_SOURCE.id,
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_353_REGISTER_DESIGN_XLSX_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-353-details",
      title: "Instrucciones y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-353-details-help",
          heading: "Recursos oficiales diferenciados",
          text: "La página oficial reúne unas instrucciones de contenido y una ayuda técnica separada para el formulario. Ambas se ofrecen aquí como referencias informativas externas.",
          sourceIds: [
            MODEL_353_PROCEDURE_HOME_SOURCE.id,
            MODEL_353_INSTRUCTIONS_SOURCE.id,
            MODEL_353_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-353-details-law",
          heading: "Orden de aprobación",
          text: "La Orden EHA/3434/2007 aprobó los Modelos 322, 353 y 039 vinculados al régimen especial del grupo de entidades en el IVA.",
          sourceIds: [MODELS_353_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    ELECTRONIC_FORMS_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_353_PROCEDURE_HOME_SOURCE,
    MODEL_353_PROCEDURE_RECORD_SOURCE,
    MODEL_353_INSTRUCTIONS_SOURCE,
    MODEL_353_HELP_SOURCE,
    MODEL_353_REGISTER_DESIGN_XLSX_SOURCE,
    MODELS_353_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-353-link-procedure",
      label: "Página oficial del Modelo 353",
      sourceId: MODEL_353_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_353_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-link-instructions",
      label: "Instrucciones oficiales del Modelo 353",
      sourceId: MODEL_353_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-link-help",
      label: "Ayuda técnica oficial del Modelo 353",
      sourceId: MODEL_353_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-link-register-design-index",
      label: "Catálogo oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-link-register-design-xlsx",
      label: "Diseño de registro XLSX del Modelo 353",
      sourceId: MODEL_353_REGISTER_DESIGN_XLSX_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-link-order",
      label: "Orden EHA/3434/2007",
      sourceId: MODELS_353_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-353-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 353?",
      answer:
        "El modelo agregado mensual del régimen especial del grupo de entidades en el Impuesto sobre el Valor Añadido.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_353_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-faq-322",
      question:
        "¿Qué relación documental señala la AEAT entre el 353 y el 322?",
      answer:
        "Las instrucciones presentan el 353 como modelo agregado y hacen referencia a los Modelos 322 individuales dentro del régimen especial del grupo de entidades.",
      sourceIds: [MODEL_353_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-faq-browser",
      question: "¿La AEAT describe un formulario en línea para el Modelo 353?",
      answer:
        "Sí. Lo incluye entre los modelos con formulario de ayuda en línea y publica una ayuda técnica específica.",
      sourceIds: [ELECTRONIC_FORMS_SOURCE.id, MODEL_353_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-faq-file",
      question: "¿Existe un formato de fichero del Modelo 353?",
      answer:
        "Sí. La ayuda técnica describe ficheros con extensión .353 y la AEAT publica su diseño de registro en una hoja de cálculo.",
      sourceIds: [
        MODEL_353_HELP_SOURCE.id,
        MODEL_353_REGISTER_DESIGN_XLSX_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-faq-resources",
      question: "¿Qué recursos de ayuda oficial reúne esta ficha?",
      answer:
        "La página del procedimiento, su ficha administrativa, las instrucciones, la ayuda técnica y el diseño de registro de la AEAT.",
      sourceIds: [
        MODEL_353_PROCEDURE_HOME_SOURCE.id,
        MODEL_353_PROCEDURE_RECORD_SOURCE.id,
        MODEL_353_INSTRUCTIONS_SOURCE.id,
        MODEL_353_HELP_SOURCE.id,
        REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-faq-law",
      question: "¿Qué norma aprobó el Modelo 353?",
      answer: "La Orden EHA/3434/2007, de 23 de noviembre.",
      sourceIds: [MODELS_353_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-353-faq-applicability",
      question:
        "¿Esta ficha decide si el Modelo 353 corresponde a una entidad?",
      answer:
        "No. Organiza información oficial general y no evalúa la situación de una entidad ni la vigencia aplicable a un caso concreto.",
      sourceIds: [
        MODEL_353_PROCEDURE_RECORD_SOURCE.id,
        MODEL_353_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      ELECTRONIC_FORMS_SOURCE.id,
      MODEL_353_HELP_SOURCE.id,
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"353">;

const MODEL_360_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_RELEASE_ID_V1,
  code: "360",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Gestión de devoluciones de IVA a empresarios o profesionales no establecidos en el territorio de aplicación del impuesto.",
  summary:
    "Modalidades del Modelo 360 descritas por la AEAT para solicitudes de devolución de IVA soportado fuera del territorio de establecimiento, con formulario, fichero, instrucciones y guía oficiales.",
  searchTerms: [
    "modelo 360",
    "devolución IVA no establecidos",
    "devolucion IVA otros Estados miembros",
    "IVA soportado otros Estados miembros",
    "Canarias Ceuta Melilla devolución IVA",
    "formulario 360",
    "fichero 360",
    "guía modelo 360",
    "diseño de registro 360",
    "Orden EHA 789 2010",
  ],
  sections: [
    {
      id: "model-360-purpose",
      title: "Identidad y modalidades oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-360-purpose-identity",
          heading:
            "Devolución de IVA en territorios distintos del establecimiento",
          text: "La AEAT agrupa los Modelos 360 y 361 en un procedimiento de devolución de IVA para empresarios o profesionales no establecidos en el territorio en el que soportan el impuesto.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
            MODELS_360_361_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-360-purpose-modalities",
          heading: "Dos modalidades identificadas con el Modelo 360",
          text: "La ficha compartida atribuye al Modelo 360 la modalidad relativa al IVA soportado en otros Estados miembros por empresarios o profesionales establecidos en el territorio de aplicación del impuesto, Canarias, Ceuta o Melilla, y la modalidad relativa al IVA soportado en el territorio de aplicación del impuesto por quienes están establecidos en Canarias, Ceuta o Melilla. Es una descripción del procedimiento, no una decisión de elegibilidad.",
          sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-360-access",
      title: "Canales y ayuda técnica",
      kind: "ACCESS",
      items: [
        {
          id: "model-360-access-browser",
          heading: "Formulario en navegador",
          text: "La AEAT incluye el Modelo 360 entre los formularios en línea y mantiene una ayuda paso a paso para ese canal.",
          sourceIds: [
            ELECTRONIC_FORMS_SOURCE.id,
            MODEL_360_FORM_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-360-access-file",
          heading: "Canal por fichero",
          text: "La página compartida y la ayuda técnica diferencian un canal por fichero para el Modelo 360. La AEAT publica además un diseño de registro PDF; esta ficha no genera ni transmite esos ficheros.",
          sourceIds: [
            MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
            MODEL_360_FILE_HELP_SOURCE.id,
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_360_REGISTER_DESIGN_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-360-details",
      title: "Documentación y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-360-details-documents",
          heading: "Instrucciones, guía y diseño de registro",
          text: "La AEAT enlaza instrucciones en HTML y PDF, una guía del formulario y el diseño de registro. Los PDF se ofrecen únicamente como descargas oficiales externas, con su huella y estado documental registrados.",
          sourceIds: [
            MODEL_360_INSTRUCTIONS_SOURCE.id,
            MODEL_360_INSTRUCTIONS_PDF_SOURCE.id,
            MODEL_360_GUIDE_PAGE_SOURCE.id,
            MODEL_360_GUIDE_PDF_SOURCE.id,
            MODEL_360_REGISTER_DESIGN_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-360-details-law",
          heading: "Normativa oficial enlazada",
          text: "La página del procedimiento enlaza la Orden EHA/789/2010, que aprueba el formulario 360 y el Modelo 361, y la Orden HAP/841/2016, que modifica la primera.",
          sourceIds: [
            MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
            MODELS_360_361_ORDER_SOURCE.id,
            MODELS_364_365_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    ELECTRONIC_FORMS_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODELS_360_361_PROCEDURE_HOME_SOURCE,
    MODELS_360_361_PROCEDURE_RECORD_SOURCE,
    MODEL_360_INSTRUCTIONS_SOURCE,
    MODEL_360_FORM_HELP_SOURCE,
    MODEL_360_FILE_HELP_SOURCE,
    MODEL_360_GUIDE_PAGE_SOURCE,
    MODEL_360_INSTRUCTIONS_PDF_SOURCE,
    MODEL_360_GUIDE_PDF_SOURCE,
    MODEL_360_REGISTER_DESIGN_PDF_SOURCE,
    MODELS_360_361_ORDER_SOURCE,
    MODELS_364_365_ORDER_SOURCE,
  ],
  documents: [
    MODEL_360_INSTRUCTIONS_DOCUMENT,
    MODEL_360_GUIDE_DOCUMENT,
    MODEL_360_REGISTER_DESIGN_DOCUMENT,
  ],
  thumbnail: null,
  links: [
    {
      id: "model-360-link-procedure",
      label: "Página oficial compartida de los Modelos 360 y 361",
      sourceId: MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODELS_360_361_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-instructions",
      label: "Instrucciones oficiales del Modelo 360",
      sourceId: MODEL_360_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-form-help",
      label: "Ayuda oficial del formulario 360",
      sourceId: MODEL_360_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-file-help",
      label: "Ayuda oficial del fichero 360",
      sourceId: MODEL_360_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-guide-page",
      label: "Guía oficial del Modelo 360",
      sourceId: MODEL_360_GUIDE_PAGE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-register-designs",
      label: "Catálogo oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-order",
      label: "Orden EHA/789/2010",
      sourceId: MODELS_360_361_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-link-amending-order",
      label: "Orden HAP/841/2016",
      sourceId: MODELS_364_365_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-360-faq-identity",
      question: "¿Qué identifica la AEAT con el Modelo 360?",
      answer:
        "Dos modalidades del procedimiento compartido de devolución de IVA a empresarios o profesionales no establecidos en el territorio en el que soportan el impuesto.",
      sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-faq-modalities",
      question:
        "¿Qué dos modalidades describe la ficha oficial para el Modelo 360?",
      answer:
        "Una relativa al IVA soportado en otros Estados miembros por quienes están establecidos en el territorio de aplicación del impuesto, Canarias, Ceuta o Melilla, y otra relativa al IVA soportado en el territorio de aplicación del impuesto por quienes están establecidos en Canarias, Ceuta o Melilla.",
      sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-faq-difference-361",
      question: "¿Cómo diferencia la AEAT el Modelo 360 del Modelo 361?",
      answer:
        "En el mismo procedimiento, el 360 se asocia a las dos modalidades anteriores y el 361 a la modalidad relativa a empresarios o profesionales establecidos en terceros países con reciprocidad. Esta distinción no sustituye una evaluación individual.",
      sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-faq-channels",
      question: "¿Qué canales técnicos oficiales aparecen para el Modelo 360?",
      answer:
        "La AEAT publica un formulario en navegador y una vía por fichero, cada una con su propia ayuda técnica.",
      sourceIds: [MODEL_360_FORM_HELP_SOURCE.id, MODEL_360_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-faq-documents",
      question:
        "¿Qué documentación oficial puede consultarse para el Modelo 360?",
      answer:
        "Instrucciones en HTML y PDF, una guía del formulario y un diseño de registro PDF, además de las páginas administrativa y técnica de la AEAT.",
      sourceIds: [
        MODEL_360_INSTRUCTIONS_SOURCE.id,
        MODEL_360_INSTRUCTIONS_PDF_SOURCE.id,
        MODEL_360_GUIDE_PAGE_SOURCE.id,
        MODEL_360_GUIDE_PDF_SOURCE.id,
        MODEL_360_REGISTER_DESIGN_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-faq-law",
      question: "¿Qué orden aprueba el formulario 360 y el Modelo 361?",
      answer: "La Orden EHA/789/2010, de 16 de marzo.",
      sourceIds: [MODELS_360_361_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-360-faq-currentness",
      question:
        "¿La ficha afirma que todos los documentos sirven para cualquier ejercicio?",
      answer:
        "No. Conserva la fecha y la huella de cada fuente; cuando el propio archivo no acredita su vigencia para un ejercicio concreto, su actualidad queda sin determinar.",
      sourceIds: [
        MODEL_360_INSTRUCTIONS_PDF_SOURCE.id,
        MODEL_360_GUIDE_PDF_SOURCE.id,
        MODEL_360_REGISTER_DESIGN_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      ELECTRONIC_FORMS_SOURCE.id,
      MODEL_360_FORM_HELP_SOURCE.id,
      MODEL_360_FILE_HELP_SOURCE.id,
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"360">;

const MODEL_361_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_RELEASE_ID_V1,
  code: "361",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Gestión de devoluciones de IVA a empresarios o profesionales no establecidos en el territorio de aplicación del impuesto.",
  summary:
    "Modalidad 361 del procedimiento de devolución de IVA soportado en el territorio de aplicación del impuesto, descrita por la AEAT para empresarios o profesionales establecidos en terceros países con reciprocidad.",
  searchTerms: [
    "modelo 361",
    "devolución IVA no establecidos",
    "devolucion IVA terceros paises reciprocidad",
    "IVA terceros países reciprocidad",
    "IVA soportado territorio aplicación",
    "formulario 361",
    "alta solicitudes 361",
    "fichero de operaciones 361",
    "estructura datos operaciones 361",
    "Orden EHA 789 2010",
  ],
  sections: [
    {
      id: "model-361-purpose",
      title: "Identidad y modalidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-361-purpose-identity",
          heading: "Modalidad diferenciada dentro del procedimiento compartido",
          text: "La AEAT agrupa los Modelos 360 y 361 en el mismo procedimiento de devolución de IVA a empresarios o profesionales no establecidos en el territorio en el que soportan el impuesto.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
            MODELS_360_361_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-361-purpose-modality",
          heading: "Terceros países con reciprocidad",
          text: "La ficha del procedimiento atribuye al Modelo 361 la modalidad relativa al IVA soportado en el territorio de aplicación del impuesto por empresarios o profesionales establecidos en terceros países con reciprocidad. La ficha no decide si esa descripción concurre en un caso particular.",
          sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-361-access",
      title: "Formulario e importación de operaciones",
      kind: "ACCESS",
      items: [
        {
          id: "model-361-access-browser",
          heading: "Formulario en navegador",
          text: "La AEAT incluye el Modelo 361 entre sus formularios en línea y mantiene una ayuda técnica específica para el alta de solicitudes.",
          sourceIds: [ELECTRONIC_FORMS_SOURCE.id, MODEL_361_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-361-access-operations-file",
          heading: "Importación de operaciones dentro del formulario",
          text: "La ayuda técnica describe la posibilidad de importar al formulario un fichero de operaciones y enlaza un PDF con su estructura. No lo presenta como un canal autónomo de envío de la solicitud completa.",
          sourceIds: [
            MODEL_361_HELP_SOURCE.id,
            MODEL_361_OPERATIONS_FILE_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-361-details",
      title: "Ayuda y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-361-details-help",
          heading: "Instrucciones y ayuda técnica separadas",
          text: "La página oficial enlaza unas instrucciones de cumplimentación y una ayuda técnica diferenciada. El documento del fichero de operaciones queda registrado como recurso técnico externo.",
          sourceIds: [
            MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
            MODEL_361_INSTRUCTIONS_SOURCE.id,
            MODEL_361_HELP_SOURCE.id,
            MODEL_361_OPERATIONS_FILE_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-361-details-law",
          heading: "Orden de aprobación",
          text: "La Orden EHA/789/2010 aprueba el Modelo 361 y regula, junto al formulario 360, el procedimiento telemático descrito por la AEAT; la Orden HAP/841/2016 modificó esa orden.",
          sourceIds: [
            MODELS_360_361_ORDER_SOURCE.id,
            MODELS_364_365_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    ELECTRONIC_FORMS_SOURCE,
    MODELS_360_361_PROCEDURE_HOME_SOURCE,
    MODELS_360_361_PROCEDURE_RECORD_SOURCE,
    MODEL_361_INSTRUCTIONS_SOURCE,
    MODEL_361_HELP_SOURCE,
    MODEL_361_OPERATIONS_FILE_PDF_SOURCE,
    MODELS_360_361_ORDER_SOURCE,
    MODELS_364_365_ORDER_SOURCE,
  ],
  documents: [MODEL_361_OPERATIONS_FILE_DOCUMENT],
  thumbnail: null,
  links: [
    {
      id: "model-361-link-procedure",
      label: "Página oficial compartida de los Modelos 360 y 361",
      sourceId: MODELS_360_361_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODELS_360_361_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-link-instructions",
      label: "Instrucciones oficiales del Modelo 361",
      sourceId: MODEL_361_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-link-help",
      label: "Ayuda técnica oficial del Modelo 361",
      sourceId: MODEL_361_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-link-order",
      label: "Orden EHA/789/2010",
      sourceId: MODELS_360_361_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-link-amending-order",
      label: "Orden HAP/841/2016",
      sourceId: MODELS_364_365_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-361-faq-identity",
      question: "¿Qué identifica la AEAT con el Modelo 361?",
      answer:
        "La modalidad del procedimiento compartido relativa al IVA soportado en el territorio de aplicación del impuesto por empresarios o profesionales establecidos en terceros países con reciprocidad.",
      sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-faq-difference-360",
      question: "¿En qué se distingue oficialmente el Modelo 361 del 360?",
      answer:
        "La ficha de la AEAT reserva al 361 la modalidad de terceros países con reciprocidad y atribuye al 360 las otras dos modalidades territoriales descritas en el procedimiento.",
      sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-faq-browser",
      question: "¿La AEAT ofrece un formulario en línea para el Modelo 361?",
      answer:
        "Sí. La página de formas de presentación lo incluye entre los formularios en línea y la ayuda técnica explica su cumplimentación en navegador.",
      sourceIds: [ELECTRONIC_FORMS_SOURCE.id, MODEL_361_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-faq-file",
      question: "¿Qué fichero técnico describe la ayuda del Modelo 361?",
      answer:
        "Un fichero para importar operaciones dentro del formulario. La ayuda enlaza un PDF oficial con la estructura e información de esos datos.",
      sourceIds: [
        MODEL_361_HELP_SOURCE.id,
        MODEL_361_OPERATIONS_FILE_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-faq-instructions",
      question: "¿Dónde se encuentran las instrucciones del Modelo 361?",
      answer:
        "En una página específica de la AEAT titulada «Instrucciones para cumplimentar el modelo 361», separada de la ayuda técnica.",
      sourceIds: [MODEL_361_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-faq-law",
      question: "¿Qué norma aprobó el Modelo 361?",
      answer: "La Orden EHA/789/2010, de 16 de marzo.",
      sourceIds: [MODELS_360_361_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-361-faq-applicability",
      question:
        "¿La referencia a reciprocidad decide si una solicitud corresponde al 361?",
      answer:
        "No. Es la descripción general de la modalidad publicada por la AEAT; esta ficha no comprueba países, circunstancias ni aplicabilidad individual.",
      sourceIds: [MODELS_360_361_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      ELECTRONIC_FORMS_SOURCE.id,
      MODEL_361_HELP_SOURCE.id,
      MODEL_361_OPERATIONS_FILE_PDF_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"361">;

const MODEL_364_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_RELEASE_ID_V1,
  code: "364",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre el Valor Añadido. Solicitud de reembolso de las cuotas tributarias soportadas relativas a la Organización del Tratado del Atlántico Norte, a los Cuarteles Generales Internacionales de dicha Organización y a los Estados parte en dicho Tratado.",
  summary:
    "Solicitud de reembolso de cuotas de IVA soportadas relativa a la OTAN, sus Cuarteles Generales Internacionales y los Estados parte, con formulario electrónico y normativa oficial enlazada.",
  searchTerms: [
    "modelo 364",
    "reembolso IVA OTAN",
    "solicitud reembolso cuotas soportadas",
    "Organización del Tratado del Atlántico Norte",
    "Cuarteles Generales Internacionales",
    "Estados parte OTAN",
    "formulario electrónico 364",
    "Real Decreto 160 2008",
    "Orden HAP 841 2016",
  ],
  sections: [
    {
      id: "model-364-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-364-purpose-identity",
          heading: "Solicitud de reembolso relacionada con la OTAN",
          text: "La AEAT identifica el Modelo 364 como la solicitud de reembolso de cuotas de IVA soportadas relativa a la Organización del Tratado del Atlántico Norte, sus Cuarteles Generales Internacionales y los Estados parte en el Tratado.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_364_PROCEDURE_HOME_SOURCE.id,
            MODEL_364_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-364-purpose-difference",
          heading: "Diferencia nominal frente al Modelo 365",
          text: "El Modelo 364 se titula «Solicitud de reembolso», mientras que el Modelo 365 se titula «Solicitud de reconocimiento previo de las exenciones». Esta ficha conserva esa diferencia oficial sin decidir cuál corresponde a un caso concreto.",
          sourceIds: [
            MODEL_364_PROCEDURE_HOME_SOURCE.id,
            MODEL_365_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-364-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-364-access-browser",
          heading: "Formulario electrónico",
          text: "La AEAT incluye el Modelo 364 entre los modelos con formulario en línea. La ficha del procedimiento describe una tramitación telemática; aquí solo se enlaza información oficial, no el trámite operativo.",
          sourceIds: [
            ELECTRONIC_FORMS_SOURCE.id,
            MODEL_364_PROCEDURE_HOME_SOURCE.id,
            MODEL_364_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-364-details",
      title: "Marco normativo oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-364-details-order",
          heading: "Orden que aprueba los Modelos 364 y 365",
          text: "La Orden HAP/841/2016 aprueba los Modelos 364 y 365 y establece las condiciones generales de su presentación electrónica.",
          sourceIds: [MODELS_364_365_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-364-details-framework",
          heading: "Reglamento de exenciones y Ley del IVA",
          text: "La ficha administrativa enlaza el Real Decreto 160/2008, relativo a las exenciones fiscales en el ámbito OTAN, y el artículo 22 de la Ley 37/1992 del IVA como normativa básica.",
          sourceIds: [
            MODEL_364_PROCEDURE_RECORD_SOURCE.id,
            NATO_EXEMPTIONS_REGULATION_SOURCE.id,
            IVA_LAW_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    ELECTRONIC_FORMS_SOURCE,
    MODEL_364_PROCEDURE_HOME_SOURCE,
    MODEL_364_PROCEDURE_RECORD_SOURCE,
    MODEL_365_PROCEDURE_HOME_SOURCE,
    MODELS_364_365_ORDER_SOURCE,
    NATO_EXEMPTIONS_REGULATION_SOURCE,
    IVA_LAW_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-364-link-procedure",
      label: "Página oficial del Modelo 364",
      sourceId: MODEL_364_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_364_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-link-order",
      label: "Orden HAP/841/2016",
      sourceId: MODELS_364_365_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-link-regulation",
      label: "Real Decreto 160/2008",
      sourceId: NATO_EXEMPTIONS_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-link-iva-law",
      label: "Ley 37/1992 del Impuesto sobre el Valor Añadido",
      sourceId: IVA_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-364-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 364?",
      answer:
        "Una solicitud de reembolso de cuotas de IVA soportadas relativa a la OTAN, sus Cuarteles Generales Internacionales y los Estados parte en el Tratado.",
      sourceIds: [MODEL_364_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-faq-difference-365",
      question: "¿Qué diferencia nominal existe entre el Modelo 364 y el 365?",
      answer:
        "La AEAT titula el 364 como solicitud de reembolso y el 365 como solicitud de reconocimiento previo de las exenciones.",
      sourceIds: [
        MODEL_364_PROCEDURE_HOME_SOURCE.id,
        MODEL_365_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-faq-browser",
      question: "¿La AEAT ofrece un formulario en línea para el Modelo 364?",
      answer:
        "Sí. Lo incluye entre los modelos con formulario en línea y su ficha administrativa describe un canal telemático.",
      sourceIds: [
        ELECTRONIC_FORMS_SOURCE.id,
        MODEL_364_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-faq-order",
      question: "¿Qué orden aprobó los Modelos 364 y 365?",
      answer: "La Orden HAP/841/2016, de 30 de mayo.",
      sourceIds: [MODELS_364_365_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-faq-regulation",
      question:
        "¿Qué reglamento sobre exenciones OTAN enlaza la ficha oficial?",
      answer:
        "El Real Decreto 160/2008, de 8 de febrero, que desarrolla las exenciones fiscales relativas a la OTAN, sus Cuarteles Generales Internacionales y los Estados parte.",
      sourceIds: [NATO_EXEMPTIONS_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-faq-law",
      question: "¿Qué ley del IVA figura entre la normativa básica?",
      answer:
        "La Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido; la ficha administrativa cita su artículo 22.",
      sourceIds: [MODEL_364_PROCEDURE_RECORD_SOURCE.id, IVA_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-364-faq-applicability",
      question: "¿Esta ficha determina si puede solicitarse el reembolso?",
      answer:
        "No. Expone la denominación, el canal y la normativa oficiales, pero no evalúa personas, operaciones ni circunstancias concretas.",
      sourceIds: [
        MODEL_364_PROCEDURE_RECORD_SOURCE.id,
        NATO_EXEMPTIONS_REGULATION_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      ELECTRONIC_FORMS_SOURCE.id,
      MODEL_364_PROCEDURE_HOME_SOURCE.id,
      MODEL_364_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"364">;

const MODEL_365_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_RELEASE_ID_V1,
  code: "365",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre el Valor Añadido. Solicitud de reconocimiento previo de las exenciones relativas a la Organización del Tratado del Atlántico Norte, a los Cuarteles Generales Internacionales de dicha Organización y a los Estados parte en dicho Tratado.",
  summary:
    "Solicitud de reconocimiento previo de exenciones de IVA relativa a la OTAN, sus Cuarteles Generales Internacionales y los Estados parte, con formulario electrónico y normativa oficial enlazada.",
  searchTerms: [
    "modelo 365",
    "reconocimiento previo exenciones OTAN",
    "exención IVA OTAN",
    "Organización del Tratado del Atlántico Norte",
    "Cuarteles Generales Internacionales",
    "Estados parte OTAN",
    "formulario electrónico 365",
    "Real Decreto 160 2008",
    "Orden HAP 841 2016",
  ],
  sections: [
    {
      id: "model-365-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-365-purpose-identity",
          heading:
            "Reconocimiento previo de exenciones relacionadas con la OTAN",
          text: "La AEAT identifica el Modelo 365 como la solicitud de reconocimiento previo de las exenciones de IVA relativas a la Organización del Tratado del Atlántico Norte, sus Cuarteles Generales Internacionales y los Estados parte en el Tratado.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_365_PROCEDURE_HOME_SOURCE.id,
            MODEL_365_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-365-purpose-difference",
          heading: "Diferencia nominal frente al Modelo 364",
          text: "El Modelo 365 se titula «Solicitud de reconocimiento previo de las exenciones», mientras que el Modelo 364 se titula «Solicitud de reembolso». Esta ficha conserva esa diferencia oficial sin determinar la vía adecuada para una situación individual.",
          sourceIds: [
            MODEL_365_PROCEDURE_HOME_SOURCE.id,
            MODEL_364_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-365-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-365-access-browser",
          heading: "Formulario electrónico",
          text: "La AEAT incluye el Modelo 365 entre los modelos con formulario en línea. La ficha del procedimiento describe una tramitación telemática; aquí solo se enlaza información oficial, no el trámite operativo.",
          sourceIds: [
            ELECTRONIC_FORMS_SOURCE.id,
            MODEL_365_PROCEDURE_HOME_SOURCE.id,
            MODEL_365_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-365-details",
      title: "Marco normativo oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-365-details-order",
          heading: "Orden que aprueba los Modelos 364 y 365",
          text: "La Orden HAP/841/2016 aprueba los Modelos 364 y 365 y establece las condiciones generales de su presentación electrónica.",
          sourceIds: [MODELS_364_365_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-365-details-framework",
          heading: "Reglamento de exenciones y Ley del IVA",
          text: "La ficha administrativa enlaza el Real Decreto 160/2008, relativo a las exenciones fiscales en el ámbito OTAN, y el artículo 22 de la Ley 37/1992 del IVA como normativa básica.",
          sourceIds: [
            MODEL_365_PROCEDURE_RECORD_SOURCE.id,
            NATO_EXEMPTIONS_REGULATION_SOURCE.id,
            IVA_LAW_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    ELECTRONIC_FORMS_SOURCE,
    MODEL_365_PROCEDURE_HOME_SOURCE,
    MODEL_365_PROCEDURE_RECORD_SOURCE,
    MODEL_364_PROCEDURE_HOME_SOURCE,
    MODELS_364_365_ORDER_SOURCE,
    NATO_EXEMPTIONS_REGULATION_SOURCE,
    IVA_LAW_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-365-link-procedure",
      label: "Página oficial del Modelo 365",
      sourceId: MODEL_365_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_365_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-link-order",
      label: "Orden HAP/841/2016",
      sourceId: MODELS_364_365_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-link-regulation",
      label: "Real Decreto 160/2008",
      sourceId: NATO_EXEMPTIONS_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-link-iva-law",
      label: "Ley 37/1992 del Impuesto sobre el Valor Añadido",
      sourceId: IVA_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-365-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 365?",
      answer:
        "Una solicitud de reconocimiento previo de exenciones de IVA relativa a la OTAN, sus Cuarteles Generales Internacionales y los Estados parte en el Tratado.",
      sourceIds: [MODEL_365_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-faq-difference-364",
      question: "¿Qué diferencia nominal existe entre el Modelo 365 y el 364?",
      answer:
        "La AEAT titula el 365 como solicitud de reconocimiento previo de las exenciones y el 364 como solicitud de reembolso.",
      sourceIds: [
        MODEL_365_PROCEDURE_HOME_SOURCE.id,
        MODEL_364_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-faq-browser",
      question: "¿La AEAT ofrece un formulario en línea para el Modelo 365?",
      answer:
        "Sí. Lo incluye entre los modelos con formulario en línea y su ficha administrativa describe un canal telemático.",
      sourceIds: [
        ELECTRONIC_FORMS_SOURCE.id,
        MODEL_365_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-faq-order",
      question: "¿Qué orden aprobó los Modelos 364 y 365?",
      answer: "La Orden HAP/841/2016, de 30 de mayo.",
      sourceIds: [MODELS_364_365_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-faq-regulation",
      question:
        "¿Qué reglamento sobre exenciones OTAN enlaza la ficha oficial?",
      answer:
        "El Real Decreto 160/2008, de 8 de febrero, que desarrolla las exenciones fiscales relativas a la OTAN, sus Cuarteles Generales Internacionales y los Estados parte.",
      sourceIds: [NATO_EXEMPTIONS_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-faq-law",
      question: "¿Qué ley del IVA figura entre la normativa básica?",
      answer:
        "La Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido; la ficha administrativa cita su artículo 22.",
      sourceIds: [MODEL_365_PROCEDURE_RECORD_SOURCE.id, IVA_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-365-faq-applicability",
      question: "¿Esta ficha determina si procede el reconocimiento previo?",
      answer:
        "No. Expone la denominación, el canal y la normativa oficiales, pero no evalúa personas, operaciones ni circunstancias concretas.",
      sourceIds: [
        MODEL_365_PROCEDURE_RECORD_SOURCE.id,
        NATO_EXEMPTIONS_REGULATION_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      ELECTRONIC_FORMS_SOURCE.id,
      MODEL_365_PROCEDURE_HOME_SOURCE.id,
      MODEL_365_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"365">;

export const PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_CONTENT_V1 =
  deepFreeze([
    MODEL_353_CONTENT,
    MODEL_360_CONTENT,
    MODEL_361_CONTENT,
    MODEL_364_CONTENT,
    MODEL_365_CONTENT,
  ] as const);
