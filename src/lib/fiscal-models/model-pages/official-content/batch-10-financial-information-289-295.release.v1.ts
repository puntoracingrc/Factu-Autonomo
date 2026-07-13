import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_RELEASE_ID_V1 =
  "public-aeat-official-batch-10-financial-information-289-295.2026-07-13.v1" as const;

export type PublicAeatBatch10FinancialInformation289295CodeV1 =
  "289" | "290" | "291" | "294" | "295";

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

const REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-200-299.register-designs.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro. Modelos 200 al 299",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-200-299.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1397ca1c069858135a1229fa0e1b36d36df487d9e757207069761e2c143a67a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-289.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 289 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI42.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3676ff3a9e61c2a5026ab9b487dd023094a7b78909e9665f7b24217f8702484b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-289.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 289",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI42.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e47a381b5c94734ae24f297bf28d9f2382154a4f8818fd107fde6d399bb37071",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_FAQ_SOURCE = {
  id: "aeat.model-289.faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 289 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-289-decla_____ras-ambito-asistencia-mutua/preguntas-frecuentes.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dc6929095c0059e331406b8b5f5973923bbaa71daa6acf73bfab29a0adce0c82",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_WEB_SERVICE_SOURCE = {
  id: "aeat.model-289.web-service-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 289 · información técnica del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-289-decla_____ras-ambito-asistencia-mutua/informacion-sobre-presentacion-mediante-web-service.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4921251f00ff4f513d016fe272a5861c2720ebde0c2df3124369d4cb94a52013",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_ERROR_SERVICE_SOURCE = {
  id: "aeat.model-289.error-service-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 289 · información técnica de consulta de errores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-289-decla_____ras-ambito-asistencia-mutua/informacion-sobre-consulta-errores-mediante-service.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4e7a753164b26955615ccb19c1c51baf348c3c87ccc7dbd1dfd9498e614de9bd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_WEB_SERVICE_MANUAL_SOURCE = {
  id: "aeat.model-289.web-service-manual-pdf.v2-7.2023-07-04",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 289 · manual técnico del servicio web · versión 2.7",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI42/Ayuda/CRS_Presentac_289_SWeb_2.7.pdf",
  officialUpdatedOn: "2023-07-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4fed53a9b5f2f91430840406715d73c6706ee0658e6addf00bded5add21bc654",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_ERROR_XML_GUIDE_SOURCE = {
  id: "aeat.model-289.error-xml-guide-pdf.2017-07-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 289 · guía para la descarga del XML de errores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI42/Ayuda/DescargaErroresPresentacion289.pdf",
  officialUpdatedOn: "2017-07-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "838a749f1d5cb66bcd5d44b840b3c5781cd58029dd9b558edce6ce698f04b721",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_FREQUENT_ERRORS_SOURCE = {
  id: "aeat.model-289.frequent-errors-pdf.2025-11-25",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 289 · errores frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI42/Errores_frecuentes_mod_289.pdf",
  officialUpdatedOn: "2025-11-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d5bdb736c960f23829a35c6f505674f3fb9e3a1c178c042e5a897c57064c0f04",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_ORDER_SOURCE = {
  id: "boe.model-289.order-hap-1695-2016.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/1695/2016, de 25 de octubre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2016-9834",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e8e04e8bb162537b17bc3fa2868763fcf3190b3f8e8214c278d336a9f0ba29fd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-290.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 290 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI38.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e32a17174cb9697b1d671c8aada847d62244c1dbd650c807d03caf7c08b817ab",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-290.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 290",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI38.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "81c48270a09f8a923b60c68b61ce7ae257b637cc53f3742ff60ab875bf02185f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_FAQ_SOURCE = {
  id: "aeat.model-290.faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 290 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-290-decla_____s-determinadas-personas-fatca_/preguntas-frecuentes.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3a943a3ed7be20922f8cfd1cc42134815b52269b814b41c484a6ee1f247a4d7b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_WEB_SERVICE_SOURCE = {
  id: "aeat.model-290.web-service-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 290 · información técnica del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-290-decla_____s-determinadas-personas-fatca_/informacion-sobre-presentacion-mediante-web-service.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "666e3d04440053894c341566f55ada8957b53130c6ee97edecbd450fca97f464",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_MANUAL_PAGE_SOURCE = {
  id: "aeat.model-290.web-service-manual-page.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 290 · manual técnico del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-290-decla_____s-determinadas-personas-fatca_/informacion-sobre-presentacion-mediante-web-service/manual-tecnico-presentacion-modelo-290.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7091a8904a7384f05ad8153b6667383d8a5291febec038c59b0da898fb46e076",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_ERROR_SERVICE_SOURCE = {
  id: "aeat.model-290.error-service-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 290 · información técnica de consulta de errores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-290-decla_____s-determinadas-personas-fatca_/informacion-sobre-consulta-errores-mediante-service.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d4feeb46b7e05a604083cbe0f4f69a00cf83519afbddb0604ffd76b704020948",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_WEB_SERVICE_MANUAL_SOURCE = {
  id: "aeat.model-290.web-service-manual-pdf.v2-16.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 290 · manual técnico del servicio web · versión 2.16",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI38/Ayuda/FATCA-Presentac_290_SWeb_2.16.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "91033373633a7e6e3e9aa65e6081fe8cd53abdfb0d2b95303a8a27e57d049431",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_ERROR_MANUAL_SOURCE = {
  id: "aeat.model-290.error-xml-manual-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 290 · manual técnico para la descarga del XML de errores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI38/Ayuda/DescargaErroresPresentacion290.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0f54272cf0bc49ed86301e615521f0490eaa2e8a990476e368e9f99c26002d79",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_290_ORDER_SOURCE = {
  id: "boe.model-290.order-hap-1136-2014.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/1136/2014, de 30 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-6922",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "27bfbb09443ad62d8f679b7b7e01b44e97e8a04991b68b0581c7c63b6ed53ac8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const FATCA_AGREEMENT_SOURCE = {
  id: "boe.fatca.spain-united-states-agreement.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title:
    "Acuerdo entre España y Estados Unidos para la mejora del cumplimiento fiscal internacional y la implementación de FATCA",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-6854",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "efdbefc161045cbd71671f0b64ea9c1b4965b6f15c4b745c5d2a3e96828e57f3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_291_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-291.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 291 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI19.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bbd9252d2f14731208b57c8d39d3fa55af02dcb168ba181d94e68c05cf9aa60f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_291_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-291.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 291",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI19.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6b43ab4fe660e8a1e0cfa9932969bb89bb6246605bb6d814c02e29dad296faa5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_291_HELP_SOURCE = {
  id: "aeat.model-291.file-help.2026-01-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 291 · ayuda técnica del fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-291.html",
  officialUpdatedOn: "2026-01-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "26ddf841d1198ed17354ed969caa7a06df64d1c44128fc4b5e9ec66deb893a56",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_291_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-291.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 291 · diseño de registro · ejercicio 2018",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos_18/DR291_2018.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dd4e70921823e6ad950098bb7c78cd6ff0898b2d9858dfa8ac617e048361e907",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_291_ORDER_SOURCE = {
  id: "boe.model-291.order-eha-3202-2008.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3202/2008, de 31 de octubre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2008-18065",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e70168c28fa34a7d1dd5bf83c765d64820dc9e108359f8721687e3c52184172f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_294_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-294.procedure-home.2026-03-11",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 294 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI20.shtml",
  officialUpdatedOn: "2026-03-11",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "916ffc2c4e5310e7d313e05c5f58a1221f56406351bb7f37717be4e1cdb965a8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_294_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-294.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 294",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI20.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "337ad771df97f4e334ac240aa768fa93b66fa586c22fec6366e63027547c5f68",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_294_HELP_SOURCE = {
  id: "aeat.model-294.file-help.2026-03-11",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 294 · ayuda técnica del fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-294.html",
  officialUpdatedOn: "2026-03-11",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "97a8c4f79afaa0d292b3e660dc9826db5fa3383e762cf3d0a9d9b9cda868bed0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_294_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-294.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 294 · diseño de registro",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos/294_EHA_1674_2006.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fbb5396436c96eed72cc75f19f8dc77c0ee5354a93ef04155b1ec4828dfd2eab",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_295_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-295.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 295 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI21.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4a6af0243fab335dcc669a7ead2e85d2ac76c7524a73cb436fb0860344b0a854",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_295_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-295.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 295",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI21.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "22bbd0234feb1b7a889fd5adcd5413bb2a2b8220c838073e60aaf1d6f625d5d2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_295_HELP_SOURCE = {
  id: "aeat.model-295.file-help.2026-03-11",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 295 · ayuda técnica del fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-295.html",
  officialUpdatedOn: "2026-03-11",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "131559a27a7c74fb947d6c24a4f7904ca44ec13937b7083f546c887167b20ef0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_295_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-295.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 295 · diseño de registro",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos/295_EHA_1674_2006.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8fee2e03aa3dc8c541dbedd4d095e3acf5af984a8eb6865dbd17afe8cad4606d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_294_295_ORDER_SOURCE = {
  id: "boe.models-294-295.order-eha-1674-2006.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/1674/2006, de 24 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2006-9635",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0ac9ae84228b82d0d97c58cf77dd3096f86af262b8744b379a625f84b0c47a26",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_289_DOCUMENTS = [
  {
    id: "model-289-document-web-service-manual-v2-7",
    kind: "GUIDE",
    title: "Manual técnico del servicio web del Modelo 289 · versión 2.7",
    sourceId: MODEL_289_WEB_SERVICE_MANUAL_SOURCE.id,
    landingPageSourceId: MODEL_289_WEB_SERVICE_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "CRS_Presentac_289_SWeb_2.7.pdf",
    byteLength: 1743116,
    pageCount: 51,
    sha256: "4fed53a9b5f2f91430840406715d73c6706ee0658e6addf00bded5add21bc654",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "model-289-document-error-xml-guide",
    kind: "GUIDE",
    title: "Guía para la descarga del XML de errores del Modelo 289",
    sourceId: MODEL_289_ERROR_XML_GUIDE_SOURCE.id,
    landingPageSourceId: MODEL_289_ERROR_SERVICE_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "DescargaErroresPresentacion289.pdf",
    byteLength: 752941,
    pageCount: 7,
    sha256: "838a749f1d5cb66bcd5d44b840b3c5781cd58029dd9b558edce6ce698f04b721",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "model-289-document-frequent-errors",
    kind: "GUIDE",
    title: "Errores frecuentes del Modelo 289",
    sourceId: MODEL_289_FREQUENT_ERRORS_SOURCE.id,
    landingPageSourceId: MODEL_289_PROCEDURE_HOME_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "Errores_frecuentes_mod_289.pdf",
    byteLength: 180047,
    pageCount: 6,
    sha256: "d5bdb736c960f23829a35c6f505674f3fb9e3a1c178c042e5a897c57064c0f04",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_289_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_RELEASE_ID_V1,
  code: "289",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de cuentas financieras en el ámbito de la asistencia mutua.",
  summary:
    "Declaración informativa anual sobre cuentas financieras en el ámbito de la asistencia mutua, con formulario en navegador para las gestiones descritas por la AEAT, servicio web y recursos oficiales de consulta de errores.",
  searchTerms: [
    "modelo 289",
    "declaración informativa anual",
    "cuentas financieras",
    "asistencia mutua",
    "intercambio automático de información",
    "CRS",
    "formulario web",
    "servicio web",
    "web service",
    "XSD",
    "WSDL",
    "consulta de errores",
    "Orden HAP 1695 2016",
  ],
  sections: [
    {
      id: "model-289-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-289-purpose-identity",
          heading: "Cuentas financieras y asistencia mutua",
          text: "El índice de modelos y las páginas del procedimiento identifican el Modelo 289 como la declaración informativa anual de cuentas financieras en el ámbito de la asistencia mutua.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_289_PROCEDURE_HOME_SOURCE.id,
            MODEL_289_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-289-purpose-exchange",
          heading: "Intercambio automático de información",
          text: "La ficha administrativa sitúa el procedimiento en el intercambio automático de información derivado de la asistencia mutua. Esta ficha no decide a quién resulta aplicable.",
          sourceIds: [MODEL_289_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-289-access",
      title: "Canales técnicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-289-access-browser-form",
          heading: "Formulario en navegador",
          text: "La portada oficial enumera gestiones mediante formulario en navegador para los supuestos que describe. Esta ficha registra la existencia del canal sin conservar destinos operativos.",
          sourceIds: [MODEL_289_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-289-access-web-service",
          heading: "Servicio web",
          text: "La AEAT describe un canal telemático mediante servicio web y publica documentación técnica asociada. Aquí se informa del método sin enlazar endpoints operativos.",
          sourceIds: [
            MODEL_289_PROCEDURE_HOME_SOURCE.id,
            MODEL_289_PROCEDURE_RECORD_SOURCE.id,
            MODEL_289_WEB_SERVICE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-289-access-schemas",
          heading: "Esquemas XSD y contrato WSDL",
          text: "La página técnica registra esquemas XSD y un contrato WSDL para el servicio web del Modelo 289.",
          sourceIds: [MODEL_289_WEB_SERVICE_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-289-details",
      title: "Ayuda y marco normativo",
      kind: "DETAILS",
      items: [
        {
          id: "model-289-details-errors",
          heading: "Consulta técnica de errores",
          text: "La AEAT mantiene una página específica con documentación técnica para la consulta de errores del Modelo 289.",
          sourceIds: [MODEL_289_ERROR_SERVICE_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-289-details-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La sede electrónica publica una colección específica de preguntas frecuentes del Modelo 289.",
          sourceIds: [MODEL_289_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-289-details-guides",
          heading: "Manual técnico y guías de errores",
          text: "La AEAT publica el manual técnico versión 2.7 del servicio web, una guía para la descarga del XML de errores y un listado de errores frecuentes. Son documentos técnicos, no formularios.",
          sourceIds: [
            MODEL_289_WEB_SERVICE_MANUAL_SOURCE.id,
            MODEL_289_ERROR_XML_GUIDE_SOURCE.id,
            MODEL_289_FREQUENT_ERRORS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-289-details-order",
          heading: "Orden de aprobación registrada",
          text: "La Orden HAP/1695/2016, de 25 de octubre, es la referencia normativa de aprobación enlazada para el modelo.",
          sourceIds: [MODEL_289_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_289_PROCEDURE_HOME_SOURCE,
    MODEL_289_PROCEDURE_RECORD_SOURCE,
    MODEL_289_FAQ_SOURCE,
    MODEL_289_WEB_SERVICE_SOURCE,
    MODEL_289_ERROR_SERVICE_SOURCE,
    MODEL_289_WEB_SERVICE_MANUAL_SOURCE,
    MODEL_289_ERROR_XML_GUIDE_SOURCE,
    MODEL_289_FREQUENT_ERRORS_SOURCE,
    MODEL_289_ORDER_SOURCE,
  ],
  documents: MODEL_289_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-289-link-procedure",
      label: "Página oficial del Modelo 289",
      sourceId: MODEL_289_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_289_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: MODEL_289_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-web-service",
      label: "Información técnica del servicio web",
      sourceId: MODEL_289_WEB_SERVICE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-errors",
      label: "Información técnica de consulta de errores",
      sourceId: MODEL_289_ERROR_SERVICE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-manual",
      label: "Manual técnico del servicio web · versión 2.7",
      sourceId: MODEL_289_WEB_SERVICE_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-error-guide",
      label: "Guía oficial del XML de errores",
      sourceId: MODEL_289_ERROR_XML_GUIDE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-frequent-errors",
      label: "Errores frecuentes del Modelo 289",
      sourceId: MODEL_289_FREQUENT_ERRORS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-link-order",
      label: "Orden HAP/1695/2016",
      sourceId: MODEL_289_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-289-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 289?",
      answer:
        "La declaración informativa anual de cuentas financieras en el ámbito de la asistencia mutua.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_289_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-context",
      question: "¿En qué contexto sitúa la AEAT este modelo?",
      answer:
        "La ficha administrativa lo sitúa en el intercambio automático de información derivado de la asistencia mutua.",
      sourceIds: [MODEL_289_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-channel",
      question: "¿Qué canales técnicos describe la AEAT?",
      answer:
        "Describe formularios en navegador para las gestiones que enumera y un canal telemático mediante servicio web.",
      sourceIds: [
        MODEL_289_PROCEDURE_HOME_SOURCE.id,
        MODEL_289_WEB_SERVICE_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-xsd",
      question: "¿La AEAT publica esquemas técnicos?",
      answer:
        "Sí. La página técnica del servicio web incluye recursos XSD y WSDL.",
      sourceIds: [MODEL_289_WEB_SERVICE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-errors",
      question: "¿Existe información oficial para consultar errores?",
      answer:
        "Sí. La AEAT publica una página técnica específica para la consulta de errores mediante servicio.",
      sourceIds: [MODEL_289_ERROR_SERVICE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-official-faq",
      question: "¿Hay preguntas frecuentes oficiales del Modelo 289?",
      answer:
        "Sí. La sede electrónica mantiene una página específica de preguntas frecuentes.",
      sourceIds: [MODEL_289_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-manual",
      question: "¿Qué manual técnico oficial está registrado?",
      answer:
        "El manual del servicio web versión 2.7, un PDF de cincuenta y una páginas.",
      sourceIds: [MODEL_289_WEB_SERVICE_MANUAL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-error-documents",
      question: "¿Qué documentación de errores publica la AEAT?",
      answer:
        "Una guía para la descarga del XML de errores y un documento separado de errores frecuentes.",
      sourceIds: [
        MODEL_289_ERROR_XML_GUIDE_SOURCE.id,
        MODEL_289_FREQUENT_ERRORS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-289-faq-law",
      question: "¿Qué orden de aprobación está enlazada?",
      answer: "La Orden HAP/1695/2016, de 25 de octubre.",
      sourceIds: [MODEL_289_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_289_PROCEDURE_HOME_SOURCE.id,
      MODEL_289_PROCEDURE_RECORD_SOURCE.id,
      MODEL_289_WEB_SERVICE_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"289">;

const MODEL_290_DOCUMENTS = [
  {
    id: "model-290-document-web-service-manual-v2-16",
    kind: "GUIDE",
    title: "Manual técnico del servicio web del Modelo 290 · versión 2.16",
    sourceId: MODEL_290_WEB_SERVICE_MANUAL_SOURCE.id,
    landingPageSourceId: MODEL_290_MANUAL_PAGE_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "FATCA-Presentac_290_SWeb_2.16.pdf",
    byteLength: 1660146,
    pageCount: 48,
    sha256: "91033373633a7e6e3e9aa65e6081fe8cd53abdfb0d2b95303a8a27e57d049431",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "DOCUMENT_PREVIEW",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "model-290-document-error-xml-manual",
    kind: "GUIDE",
    title: "Manual técnico para la descarga del XML de errores del Modelo 290",
    sourceId: MODEL_290_ERROR_MANUAL_SOURCE.id,
    landingPageSourceId: MODEL_290_ERROR_SERVICE_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "DescargaErroresPresentacion290.pdf",
    byteLength: 202124,
    pageCount: 7,
    sha256: "0f54272cf0bc49ed86301e615521f0490eaa2e8a990476e368e9f99c26002d79",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "DOCUMENT_PREVIEW",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const;

const MODEL_290_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_RELEASE_ID_V1,
  code: "290",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de cuentas financieras de determinadas personas estadounidenses (FATCA)",
  summary:
    "Declaración informativa anual vinculada a FATCA, con canal mediante servicio web, documentación técnica oficial y recursos de consulta de errores.",
  searchTerms: [
    "modelo 290",
    "declaración informativa anual",
    "cuentas financieras",
    "personas estadounidenses",
    "FATCA",
    "acuerdo España Estados Unidos",
    "servicio web",
    "web service",
    "XSD",
    "WSDL",
    "XML de errores",
    "Orden HAP 1136 2014",
  ],
  sections: [
    {
      id: "model-290-purpose",
      title: "Identidad y contexto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-290-purpose-identity",
          heading: "Cuentas financieras y FATCA",
          text: "El índice y las páginas del procedimiento identifican el Modelo 290 como la declaración informativa anual de cuentas financieras de determinadas personas estadounidenses (FATCA).",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_290_PROCEDURE_HOME_SOURCE.id,
            MODEL_290_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-290-purpose-agreement",
          heading: "Acuerdo entre España y Estados Unidos",
          text: "La ficha administrativa relaciona el procedimiento con el intercambio de información y con el acuerdo entre España y Estados Unidos para la implementación de FATCA.",
          sourceIds: [
            MODEL_290_PROCEDURE_RECORD_SOURCE.id,
            FATCA_AGREEMENT_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-290-access",
      title: "Canal y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-290-access-web-service",
          heading: "Servicio web",
          text: "La AEAT describe la comunicación del Modelo 290 mediante servicio web y publica esquemas XSD y un contrato WSDL. Esta ficha no enlaza endpoints operativos.",
          sourceIds: [
            MODEL_290_PROCEDURE_HOME_SOURCE.id,
            MODEL_290_WEB_SERVICE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-290-access-errors",
          heading: "Consulta de errores",
          text: "La sede mantiene documentación técnica separada para la consulta y descarga de información de errores.",
          sourceIds: [
            MODEL_290_ERROR_SERVICE_SOURCE.id,
            MODEL_290_ERROR_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-290-details",
      title: "Guías y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-290-details-manual",
          heading: "Manual técnico del servicio web",
          text: "La página oficial enlaza el manual técnico versión 2.16, un PDF de cuarenta y ocho páginas. Se registra como guía técnica, no como formulario.",
          sourceIds: [
            MODEL_290_MANUAL_PAGE_SOURCE.id,
            MODEL_290_WEB_SERVICE_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-290-details-error-manual",
          heading: "Guía del XML de errores",
          text: "La documentación de errores incluye una guía PDF de siete páginas sobre la descarga del XML de errores.",
          sourceIds: [
            MODEL_290_ERROR_SERVICE_SOURCE.id,
            MODEL_290_ERROR_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-290-details-law",
          heading: "Referencias legales enlazadas",
          text: "La ficha registra la Orden HAP/1136/2014 y el acuerdo entre España y Estados Unidos publicado en el BOE.",
          sourceIds: [MODEL_290_ORDER_SOURCE.id, FATCA_AGREEMENT_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_290_PROCEDURE_HOME_SOURCE,
    MODEL_290_PROCEDURE_RECORD_SOURCE,
    MODEL_290_FAQ_SOURCE,
    MODEL_290_WEB_SERVICE_SOURCE,
    MODEL_290_MANUAL_PAGE_SOURCE,
    MODEL_290_ERROR_SERVICE_SOURCE,
    MODEL_290_WEB_SERVICE_MANUAL_SOURCE,
    MODEL_290_ERROR_MANUAL_SOURCE,
    MODEL_290_ORDER_SOURCE,
    FATCA_AGREEMENT_SOURCE,
  ],
  documents: MODEL_290_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-290-link-procedure",
      label: "Página oficial del Modelo 290",
      sourceId: MODEL_290_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_290_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: MODEL_290_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-link-web-service",
      label: "Información técnica del servicio web",
      sourceId: MODEL_290_WEB_SERVICE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-link-errors",
      label: "Información técnica de consulta de errores",
      sourceId: MODEL_290_ERROR_SERVICE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-link-order",
      label: "Orden HAP/1136/2014",
      sourceId: MODEL_290_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-link-agreement",
      label: "Acuerdo FATCA entre España y Estados Unidos",
      sourceId: FATCA_AGREEMENT_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-290-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 290?",
      answer:
        "La declaración informativa anual de cuentas financieras de determinadas personas estadounidenses (FATCA).",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_290_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-fatca",
      question: "¿Qué referencia oficial acompaña a FATCA?",
      answer:
        "El BOE publica el acuerdo entre España y Estados Unidos para la mejora del cumplimiento fiscal internacional y la implementación de FATCA.",
      sourceIds: [FATCA_AGREEMENT_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-context",
      question: "¿Cómo contextualiza el procedimiento la ficha administrativa?",
      answer:
        "Lo relaciona con el intercambio de información derivado del acuerdo FATCA entre España y Estados Unidos.",
      sourceIds: [
        MODEL_290_PROCEDURE_RECORD_SOURCE.id,
        FATCA_AGREEMENT_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-channel",
      question: "¿Qué canal técnico describe la AEAT?",
      answer: "Describe un canal mediante servicio web.",
      sourceIds: [
        MODEL_290_PROCEDURE_HOME_SOURCE.id,
        MODEL_290_WEB_SERVICE_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-schemas",
      question: "¿Hay esquemas XSD y WSDL oficiales?",
      answer:
        "Sí. La página técnica del servicio web publica esos recursos para el Modelo 290.",
      sourceIds: [MODEL_290_WEB_SERVICE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-manual",
      question: "¿Qué manual técnico del servicio web está registrado?",
      answer:
        "El manual versión 2.16, un PDF oficial de cuarenta y ocho páginas.",
      sourceIds: [
        MODEL_290_MANUAL_PAGE_SOURCE.id,
        MODEL_290_WEB_SERVICE_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-error-guide",
      question: "¿Existe una guía para el XML de errores?",
      answer:
        "Sí. La AEAT enlaza una guía técnica PDF de siete páginas sobre su descarga.",
      sourceIds: [
        MODEL_290_ERROR_SERVICE_SOURCE.id,
        MODEL_290_ERROR_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-official-faq",
      question: "¿Hay preguntas frecuentes oficiales del Modelo 290?",
      answer:
        "Sí. La sede electrónica mantiene una página específica de preguntas frecuentes.",
      sourceIds: [MODEL_290_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-290-faq-order",
      question: "¿Qué orden de aprobación está enlazada?",
      answer: "La Orden HAP/1136/2014, de 30 de junio.",
      sourceIds: [MODEL_290_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_290_PROCEDURE_HOME_SOURCE.id,
      MODEL_290_PROCEDURE_RECORD_SOURCE.id,
      MODEL_290_WEB_SERVICE_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"290">;

function createFileModelContent<
  const Code extends "291" | "294" | "295",
>(config: {
  readonly code: Code;
  readonly canonicalName: string;
  readonly summary: string;
  readonly objectHeading: string;
  readonly objectText: string;
  readonly searchTerms: readonly [string, ...string[]];
  readonly procedureHome: PublicAeatOfficialContentSourceV1;
  readonly procedureRecord: PublicAeatOfficialContentSourceV1;
  readonly help: PublicAeatOfficialContentSourceV1;
  readonly order: PublicAeatOfficialContentSourceV1;
  readonly registerDesign: Readonly<{
    source: PublicAeatOfficialContentSourceV1;
    title: string;
    fileName: string;
    byteLength: number;
    pageCount: number;
    sha256: string;
  }>;
}): PublicAeatOfficialModelContentV1<Code> {
  const prefix = `model-${config.code}`;

  return {
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId: PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_RELEASE_ID_V1,
    code: config.code,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: "UNDETERMINED",
    reviewedOn: REVIEWED_ON,
    canonicalName: config.canonicalName,
    summary: config.summary,
    searchTerms: config.searchTerms,
    sections: [
      {
        id: `${prefix}-purpose`,
        title: "Identidad y objeto oficial",
        kind: "PURPOSE",
        items: [
          {
            id: `${prefix}-purpose-identity`,
            heading: config.objectHeading,
            text: `El índice general y las páginas del procedimiento identifican el Modelo ${config.code} con la denominación oficial registrada en esta ficha.`,
            sourceIds: [
              OFFICIAL_MODEL_INDEX_SOURCE.id,
              config.procedureHome.id,
              config.procedureRecord.id,
            ],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `${prefix}-purpose-object`,
            heading: "Objeto descrito por la AEAT",
            text: config.objectText,
            sourceIds: [config.procedureRecord.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `${prefix}-access`,
        title: "Fichero y validación técnica",
        kind: "ACCESS",
        items: [
          {
            id: `${prefix}-access-file`,
            heading: "Carga mediante fichero",
            text: "La ayuda técnica describe un fichero ajustado al diseño de registro publicado por la AEAT. Esta ficha informa del método sin enlazar ningún endpoint operativo.",
            sourceIds: [
              config.procedureHome.id,
              config.procedureRecord.id,
              config.help.id,
              REGISTER_DESIGNS_SOURCE.id,
            ],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `${prefix}-access-validation`,
            heading: "Validación separada de la presentación",
            text: "La ayuda distingue la validación del fichero de su presentación posterior y describe registros correctos, erróneos o no identificados.",
            sourceIds: [config.help.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `${prefix}-access-register-design`,
            heading: "Diseño de registro en PDF",
            text: "El catálogo técnico de la AEAT enlaza un PDF con el diseño de registro del modelo. Se conserva como documentación técnica con referencias heredadas, no como formulario estático ni como afirmación de vigencia.",
            sourceIds: [
              REGISTER_DESIGNS_SOURCE.id,
              config.registerDesign.source.id,
            ],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `${prefix}-details`,
        title: "Resultados técnicos y normativa",
        kind: "DETAILS",
        items: [
          {
            id: `${prefix}-details-errors`,
            heading: "Ficheros de errores diferenciados",
            text: "La ayuda diferencia el fichero que contiene registros erróneos del fichero informativo que contiene los mensajes asociados a esos errores.",
            sourceIds: [config.help.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `${prefix}-details-order`,
            heading: "Referencia normativa enlazada",
            text: `La referencia del BOE registrada para el Modelo ${config.code} se ofrece como texto legal informativo.`,
            sourceIds: [config.order.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
    ],
    sources: [
      OFFICIAL_MODEL_INDEX_SOURCE,
      REGISTER_DESIGNS_SOURCE,
      config.procedureHome,
      config.procedureRecord,
      config.help,
      config.registerDesign.source,
      config.order,
    ],
    documents: [
      {
        id: `${prefix}-register-design-document`,
        kind: "REGISTER_DESIGN",
        title: config.registerDesign.title,
        sourceId: config.registerDesign.source.id,
        landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
        mediaType: "application/pdf",
        fileName: config.registerDesign.fileName,
        byteLength: config.registerDesign.byteLength,
        pageCount: config.registerDesign.pageCount,
        sha256: config.registerDesign.sha256,
        activeContentStatus: "NO_JAVASCRIPT_DETECTED",
        formStatus: "NO_ACROFORM_DETECTED",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        previewSuitability: "NONE",
        usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
      },
    ],
    thumbnail: null,
    links: [
      {
        id: `${prefix}-link-procedure`,
        label: `Página oficial del Modelo ${config.code}`,
        sourceId: config.procedureHome.id,
        category: "PROCEDURE",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-link-record`,
        label: "Ficha oficial del procedimiento",
        sourceId: config.procedureRecord.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-link-help`,
        label: `Ayuda técnica oficial del Modelo ${config.code}`,
        sourceId: config.help.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-link-register-designs`,
        label: "Diseños de registro de los modelos 200 al 299",
        sourceId: REGISTER_DESIGNS_SOURCE.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-link-register-design`,
        label: `Diseño de registro oficial del Modelo ${config.code}`,
        sourceId: config.registerDesign.source.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-link-order`,
        label: config.order.title,
        sourceId: config.order.id,
        category: "LEGAL",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
    ],
    faq: [
      {
        id: `${prefix}-faq-identity`,
        question: `¿Qué identifica la AEAT como Modelo ${config.code}?`,
        answer: config.canonicalName,
        sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id, config.procedureHome.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-object`,
        question: "¿Qué objeto describe la ficha administrativa?",
        answer: config.objectText,
        sourceIds: [config.procedureRecord.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-channel`,
        question: "¿Qué canal técnico describen las fuentes oficiales?",
        answer:
          "Describen un canal electrónico basado en la carga de un fichero.",
        sourceIds: [
          config.procedureHome.id,
          config.procedureRecord.id,
          config.help.id,
        ],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-design`,
        question: "¿El fichero sigue un diseño publicado?",
        answer:
          "Sí. La ayuda técnica remite al diseño de registro publicado por la AEAT.",
        sourceIds: [config.help.id, REGISTER_DESIGNS_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-design-document`,
        question: "¿El PDF técnico es un formulario para cumplimentar?",
        answer:
          "No. Es un diseño de registro y se conserva sin miniatura de formulario y sin inferir su vigencia actual.",
        sourceIds: [config.registerDesign.source.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-validation-result`,
        question: "¿Qué resultados puede mostrar la validación?",
        answer:
          "La ayuda distingue registros correctos, erróneos o no identificados.",
        sourceIds: [config.help.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-validation-presentation`,
        question: "¿Validar el fichero equivale a presentarlo?",
        answer:
          "No. La ayuda técnica distingue expresamente la validación de la presentación posterior.",
        sourceIds: [config.help.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-errors`,
        question: "¿Qué diferencia hay entre los ficheros de errores?",
        answer:
          "Uno contiene los registros erróneos y otro ofrece, con carácter informativo, los mensajes asociados.",
        sourceIds: [config.help.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `${prefix}-faq-law`,
        question: "¿Hay una referencia normativa oficial enlazada?",
        answer: `Sí. La ficha enlaza ${config.order.title}.`,
        sourceIds: [config.order.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    ],
    accessMethods: {
      methods: ["FILE_UPLOAD"],
      status: "SOURCE_DESCRIBED",
      sourceIds: [
        config.procedureHome.id,
        config.procedureRecord.id,
        config.help.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    externalNavigation: null,
    limitations: LIMITATIONS,
  };
}

const MODEL_291_CONTENT = createFileModelContent({
  code: "291",
  canonicalName:
    "Declaración Informativa. Impuesto sobre la Renta de no Residentes. Cuentas de no residentes sin establecimiento permanente.",
  summary:
    "Declaración informativa sobre cuentas de no residentes sin establecimiento permanente, con canal mediante fichero, diseño de registro y validación técnica diferenciada de la presentación.",
  objectHeading: "Cuentas de no residentes sin establecimiento permanente",
  objectText:
    "La ficha administrativa describe una declaración informativa del Impuesto sobre la Renta de no Residentes relativa a cuentas de no residentes sin establecimiento permanente. Esta descripción no evalúa casos concretos.",
  searchTerms: [
    "modelo 291",
    "declaración informativa",
    "IRNR",
    "Impuesto sobre la Renta de no Residentes",
    "cuentas de no residentes",
    "sin establecimiento permanente",
    "carga de fichero",
    "diseño de registro 291",
    "validación de fichero",
    "Orden EHA 3202 2008",
  ],
  procedureHome: MODEL_291_PROCEDURE_HOME_SOURCE,
  procedureRecord: MODEL_291_PROCEDURE_RECORD_SOURCE,
  help: MODEL_291_HELP_SOURCE,
  order: MODEL_291_ORDER_SOURCE,
  registerDesign: {
    source: MODEL_291_REGISTER_DESIGN_SOURCE,
    title: "Diseño de registro del Modelo 291 · ejercicio 2018",
    fileName: "DR291_2018.pdf",
    byteLength: 381176,
    pageCount: 32,
    sha256: "dd4e70921823e6ad950098bb7c78cd6ff0898b2d9858dfa8ac617e048361e907",
  },
});

const MODEL_294_CONTENT = createFileModelContent({
  code: "294",
  canonicalName:
    "Declaración informativa. Relación individualizada de los clientes perceptores de beneficios distribuidos por Instituciones de Inversión Colectiva españolas, así como de aquellos por cuenta de los cuales la entidad comercializadora haya efectuado reembolsos o transmisiones de acciones o participaciones, en los supuestos de comercializacion transfronteriza de acciones o participaciones de instituciones de inversión colectiva españolas.",
  summary:
    "Relación individualizada vinculada a clientes y operaciones descritas por la AEAT en la comercialización transfronteriza de instituciones de inversión colectiva españolas, con canal mediante fichero.",
  objectHeading: "Clientes y operaciones en comercialización transfronteriza",
  objectText:
    "La ficha administrativa describe una relación individualizada de clientes perceptores de beneficios distribuidos y de aquellos por cuya cuenta la entidad comercializadora haya efectuado reembolsos o transmisiones, en los supuestos de comercialización transfronteriza indicados.",
  searchTerms: [
    "modelo 294",
    "declaración informativa",
    "instituciones de inversión colectiva",
    "IIC españolas",
    "comercialización transfronteriza",
    "beneficios distribuidos",
    "reembolsos",
    "transmisiones",
    "carga de fichero",
    "diseño de registro 294",
    "Orden EHA 1674 2006",
  ],
  procedureHome: MODEL_294_PROCEDURE_HOME_SOURCE,
  procedureRecord: MODEL_294_PROCEDURE_RECORD_SOURCE,
  help: MODEL_294_HELP_SOURCE,
  order: MODELS_294_295_ORDER_SOURCE,
  registerDesign: {
    source: MODEL_294_REGISTER_DESIGN_SOURCE,
    title: "Diseño de registro del Modelo 294",
    fileName: "294_EHA_1674_2006.pdf",
    byteLength: 32098,
    pageCount: 4,
    sha256: "fbb5396436c96eed72cc75f19f8dc77c0ee5354a93ef04155b1ec4828dfd2eab",
  },
});

const MODEL_295_CONTENT = createFileModelContent({
  code: "295",
  canonicalName:
    "Declaración informativa. Relación anual individualizada de los clientes con la posición inversora en las Instituciones de Inversión Colectiva españolas, referida a fecha 31 de diciembre del ejercicio, en los supuestos de comercialización transfronteriza de acciones o participaciones en Instituciones de Inversión Colectiva españolas.",
  summary:
    "Relación anual individualizada de posiciones inversoras en instituciones de inversión colectiva españolas en los supuestos de comercialización transfronteriza descritos por la AEAT, con canal mediante fichero.",
  objectHeading: "Posición inversora en instituciones de inversión colectiva",
  objectText:
    "La ficha administrativa describe una relación anual individualizada de clientes con la posición inversora en instituciones de inversión colectiva españolas referida al 31 de diciembre, dentro de los supuestos de comercialización transfronteriza indicados.",
  searchTerms: [
    "modelo 295",
    "declaración informativa",
    "posición inversora",
    "instituciones de inversión colectiva",
    "IIC españolas",
    "31 de diciembre",
    "comercialización transfronteriza",
    "carga de fichero",
    "diseño de registro 295",
    "Orden EHA 1674 2006",
  ],
  procedureHome: MODEL_295_PROCEDURE_HOME_SOURCE,
  procedureRecord: MODEL_295_PROCEDURE_RECORD_SOURCE,
  help: MODEL_295_HELP_SOURCE,
  order: MODELS_294_295_ORDER_SOURCE,
  registerDesign: {
    source: MODEL_295_REGISTER_DESIGN_SOURCE,
    title: "Diseño de registro del Modelo 295",
    fileName: "295_EHA_1674_2006.pdf",
    byteLength: 31167,
    pageCount: 4,
    sha256: "8fee2e03aa3dc8c541dbedd4d095e3acf5af984a8eb6865dbd17afe8cad4606d",
  },
});

export const PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_CONTENT_V1 =
  deepFreeze([
    MODEL_289_CONTENT,
    MODEL_290_CONTENT,
    MODEL_291_CONTENT,
    MODEL_294_CONTENT,
    MODEL_295_CONTENT,
  ] as const);
