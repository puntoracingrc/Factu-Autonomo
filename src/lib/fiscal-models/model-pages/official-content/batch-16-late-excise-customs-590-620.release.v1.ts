import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentFaqItemV1,
  type PublicAeatOfficialContentLinkV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_16_LATE_EXCISE_CUSTOMS_590_620_RELEASE_ID_V1 =
  "public-aeat-official-batch-16-late-excise-customs-590-620.2026-07-14.v1" as const;

const REVIEWED_ON = "2026-07-14" as const;
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

function defineSource(
  source: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentSourceV1 {
  return source;
}

type Batch16ModelInput<Code extends string> = Omit<
  PublicAeatOfficialModelContentV1<Code>,
  | "schemaVersion"
  | "releaseId"
  | "contentStatus"
  | "sourceVerificationStatus"
  | "applicabilityStatus"
  | "lifecycleStatus"
  | "reviewedOn"
  | "thumbnail"
  | "externalNavigation"
  | "limitations"
>;

function defineModel<const Code extends string>(
  content: Batch16ModelInput<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  return {
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId: PUBLIC_AEAT_BATCH_16_LATE_EXCISE_CUSTOMS_590_620_RELEASE_ID_V1,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: "UNDETERMINED",
    reviewedOn: REVIEWED_ON,
    thumbnail: null,
    externalNavigation: null,
    limitations: LIMITATIONS,
    ...content,
  };
}

const OFFICIAL_MODEL_INDEX_SOURCE = defineSource({
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
});

const MODEL_590_HOME_SOURCE = defineSource({
  id: "aeat.model-590.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 590 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ08.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bd59481fecca8b6cf26337a931d41898b99abf6a5c77473eae7898cb41f736ed",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_590_RECORD_SOURCE = defineSource({
  id: "aeat.model-590.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 590 · ficha oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DJ08.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c2d399067d084eace2fa5427566c418c60f60234e5c02e8a206d97dec1fbb90d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_590_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-590.download.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 590 · descarga oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-devoluciones/modelo-590-iiee-solicitud-devolucion-expedicion_/descarga-modelo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d01a233533096619eaf555b3293e1a88f73c7078e5f570b18e9003e4be6e2541",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_590_PDF_SOURCE = defineSource({
  id: "aeat.model-590.form-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 590 · formulario PDF oficial enlazado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ08/590.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9bd1f201c5d852742f3cca6cfa256082bbdb2c8fce6dd819c35bc147299ef4cb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_EHA_3482_2007_SOURCE = defineSource({
  id: "boe.order-eha-3482-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3482/2007, de 20 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-20637",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0ab73c64dc4a71bd5fcbd87c7e98d608ebfab3321eee87d5596dbeabbbd453e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_591_HOME_SOURCE = defineSource({
  id: "aeat.model-591.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 591 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR12.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "695ab1389e3097caf620baedd1b6156b33e4c03dc11c14c1d47f926bbc9e3c2a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_591_RECORD_SOURCE = defineSource({
  id: "aeat.model-591.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 591 · ficha oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR12.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "98d776bbe1799c17f0aa9081db747c03bb4a6cbc8ab404eaf88f47e02a25b19f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_591_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-591.download.2026-03-10",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 591 · descarga e instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuestos-medioambientales/modelo-591-impu_____claracion-anual-operaciones-contribuyentes_/descarga-modelo.html",
  officialUpdatedOn: "2026-03-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "93045616e81deaa0563bbeeb18ffe5fa368a858259232bb8460d7a10c1cd0c26",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_591_FORM_SOURCE = defineSource({
  id: "aeat.model-591.form-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 591 · formulario PDF oficial enlazado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR12/modelo_591_descarga.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1ea5ba9b2059a3a5ee843fbd13e923c2f924d7d6a4bf5563dfc32bbc26953234",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_591_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-591.instructions-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 591 · instrucciones PDF oficiales enlazadas",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR12/modelo_591_Instrucciones.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "be6311815e2677517f860f8fb0d91628092dedea81859259cf572bfd8e684442",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAP_2328_2014_SOURCE = defineSource({
  id: "boe.order-hap-2328-2014.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2328/2014, de 11 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-12972",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c6487e182a2842f4ae1027cab3c635075c49a0c4204a7187120664c989b5d979",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_1433_2024_SOURCE = defineSource({
  id: "boe.order-hac-1433-2024.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1433/2024, de 11 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26485",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1ab18bc4f03e7a155c552e32f60f4bc1035c696438736b8ea0959d22968a53af",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_592_HOME_SOURCE = defineSource({
  id: "aeat.model-592.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 592 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR14.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "36b6092d0244e3db73335e800b15880b4a4d655d84c835b521f21e10c5d65562",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_592_RECORD_SOURCE = defineSource({
  id: "aeat.model-592.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 592 · ficha oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR14.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fe031d99f5e2a6b8f07ad494479e31bb06554e174712b54c4e6b6012be498c14",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_592_TOPIC_SOURCE = defineSource({
  id: "aeat.model-592.topic.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Impuesto especial sobre los envases de plástico no reutilizables",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-especial-sobre-envases-plastico-reutilizables.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a854783a8ac6213d2a1ec8576b8c0ed3fb3e2477cb4877615ea65d580638c98d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_592_FAQ_SOURCE = defineSource({
  id: "aeat.model-592.faq-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Preguntas y respuestas sobre el impuesto sobre el plástico",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/envases_plasticos/Ayuda/PREGUNTAS_RESPUESTASdic22.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8e83ae0f1b315200a881e765d7f266672f2fdaa818e374bd51cda363d1b733bb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_592_FORMAT_SOURCE = defineSource({
  id: "aeat.model-592.format-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formato electrónico del Modelo 592",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/envases_plasticos/MOD_AUTOLIQ_PLAST.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "545b2132408e54a8ff395180ed0e24476963ac5a61adf890f72ce897a69fd350",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HFP_1314_2022_SOURCE = defineSource({
  id: "boe.order-hfp-1314-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1314/2022, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-23749",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d5e74a71afa66211f44d74824cee63d921ec3508f1294850c547941a888c534d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_593_HOME_SOURCE = defineSource({
  id: "aeat.model-593.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 593 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR15.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2c1ab7f0ac9940c96d2f5dd18f631a731dd905d5ec0ad06e20c077d819cc4e05",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_593_RECORD_SOURCE = defineSource({
  id: "aeat.model-593.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 593 · ficha oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR15.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6ba8b0262ec3c36d438443e3e8020bfd3de2a89b9daaf76a1e0faa8d8b3a8313",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_593_TOPIC_SOURCE = defineSource({
  id: "aeat.model-593.topic.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title:
    "Impuesto sobre el depósito de residuos en vertederos, la incineración y la coincineración",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-sobre-deposito-residuos-vertederos.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "55701cf8da033aa5bbd792ba9fc70df6a3d6f6b18438b13b566b61292a0a4998",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_593_FAQ_SOURCE = defineSource({
  id: "aeat.model-593.faq-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Preguntas frecuentes sobre el impuesto de residuos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/residuos/residuos_componentes/faqs_imp_residuos.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cef0e0f6a4bc836f3173f0abbb5a9262c1a6e980c9b6702bd71a98109072d791",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_593_CODES_SOURCE = defineSource({
  id: "aeat.model-593.type-codes-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Códigos del campo tipo impositivo del Modelo 593",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/residuos/residuos_componentes/Codcamp_tipoimp3.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9a6b934a3e8ed4eda0d2e9997555161cc598c2af17fab641b35936d2c4410bf6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HFP_1337_2022_SOURCE = defineSource({
  id: "boe.order-hfp-1337-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1337/2022, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-24387",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "83b000ad280ab8ef7d3f1cd0d26db0dc97394e0f7a3e20cec97a1f90346cc8ec",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_595_HOME_SOURCE = defineSource({
  id: "aeat.model-595.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 595 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI09.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e83b5c27a21531711d7067e1decbdcf9c077db0c6ba2c08afdc3fad66431b649",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_595_RECORD_SOURCE = defineSource({
  id: "aeat.model-595.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 595 · ficha oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI09.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0d5107c7e29a944dd91757ab231f42688af17726b50adf056859b10a77f3bcc6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_596_HOME_SOURCE = defineSource({
  id: "aeat.model-596.procedure-home.2026-03-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 596 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF10.shtml",
  officialUpdatedOn: "2026-03-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "509cd26162e6c6571ca5f75c4521e4655e1a0b85e1fd03e412611220475b90da",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_596_RECORD_SOURCE = defineSource({
  id: "aeat.model-596.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 596 · ficha oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DF10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b39957cb7c21192786bd84ed78598f0ece269f7b8ee32b22017ea21b9666b522",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_EHA_3947_2006_SOURCE = defineSource({
  id: "boe.order-eha-3947-2006.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3947/2006, de 21 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2006-22784",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "064eb85e33f447cbc08408aa259be611d5e63a7383b7e7c93ff3a403bd9d0607",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HFP_292_2018_SOURCE = defineSource({
  id: "boe.order-hfp-292-2018.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/292/2018, de 15 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2018-3945",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cb7cc45920b66a03e0c4faa920f73fbd3325ed7d5aa35e455ffa03ffed0bfa76",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const GC12_HOME_SOURCE = defineSource({
  id: "aeat.models-600-610-615-620-630.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelos 600, 610, 615, 620 y 630 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC12.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f1f09ee5f36218112480fad446f5cc144aeed196b4e331694be8e3a4793d6ca2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const GC12_RECORD_SOURCE = defineSource({
  id: "aeat.models-600-610-615-620-630.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelos 600, 610, 615, 620 y 630 · ficha oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC12.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "354804bcb5daeffac9c67bec0ba78a7bcc3c8c9b9e16edbe9a96028d5848732f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const GC12_TOPIC_SOURCE = defineSource({
  id: "aeat.itpajd-ceuta-melilla.topic.2026-07-13",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "ITPAJD en Ceuta y Melilla",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-transmisiones-patrimoniales-actos-juridicos.html",
  officialUpdatedOn: "2026-07-13",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1366013cbfff911aada89f8688fc5ee7cdd001905f04076b104ce4303e2a05ac",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const GC12_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.models-600-610-615-620-630.download.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelos 600, 610, 615, 620 y 630 · descargas oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/otros/modelos-600-620-6-agencia-tributaria_/descarga-modelos.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "158163eabf09a05ce6969b896191a645fb2b7a38409202b135bd96bf06ba58e1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const GC12_COMPETENCE_SOURCE = defineSource({
  id: "aeat.itpajd.competence-table.2026-01-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Cuadro de delimitación de competencias ITPAJD",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-transmisiones-patrimoniales-actos-juridicos/itp-ajd-transmisiones-derechos-reales-fianzas/cuadro-delimitacion-competencias-c-m.html",
  officialUpdatedOn: "2026-01-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "49381509401997db3f528407fab7d9cca4a98dd8f74df198035dff58d76280f5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_600_PDF_SOURCE = defineSource({
  id: "aeat.model-600.form-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 600 · formulario PDF oficial enlazado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC12/600/mod600e.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "40151c2de829dc1381f65b1865946b71a566adb42aac23eef2662c51b2cd85cf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_610_PDF_SOURCE = defineSource({
  id: "aeat.model-610.form-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 610 · formulario PDF oficial enlazado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC12/610/mod610e.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3c0af47bcc1ceced96d8c99fbd349e52ccf588e39347d3c9a1dca382ff31d660",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_615_PDF_SOURCE = defineSource({
  id: "aeat.model-615.form-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 615 · formulario PDF oficial enlazado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC12/615/mod615e.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "52d5f90444c60c6f7f4166f22f465d47ed44e96e19eae1a3056125fb028be70b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_620_PDF_SOURCE = defineSource({
  id: "aeat.model-620.form-pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 620 · formulario PDF oficial enlazado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC12/620/mod620e.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "55b42d271861b2002a4cd98f7786fdef21782e76ad63caea30cfecc09137d209",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_4_JULY_2001_SOURCE = defineSource({
  id: "boe.order-4-july-2001-itpajd.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 4 de julio de 2001",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2001-13169",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fbbb6801f4bf4746659623585cb383b8acea77c707021e65659498d9da1e038c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_12_NOVEMBER_2001_SOURCE = defineSource({
  id: "boe.order-12-november-2001-itpajd.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 12 de noviembre de 2001",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2001-21366",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e543beaa066990fb9db7cd0dc6450fff7f0d871107a3c2e6c2ad8bc39cbcd154",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_1927_2002_SOURCE = defineSource({
  id: "boe.order-hac-1927-2002.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1927/2002, de 24 de julio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2002-15340",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ebf87a62e2ec599a0eaa26cd2fd30873dc4d63fcbf8ff8741b6dff4839817089",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

type ElectronicModelConfig<Code extends string> = Readonly<{
  code: Code;
  canonicalName: string;
  summary: string;
  searchTerms: readonly [string, ...string[]];
  home: PublicAeatOfficialContentSourceV1;
  record: PublicAeatOfficialContentSourceV1;
  additionalSources: readonly PublicAeatOfficialContentSourceV1[];
  identityText: string;
  recordHeading: string;
  recordText: string;
  channelHeading: string;
  channelText: string;
  detailHeading: string;
  detailText: string;
  detailSourceIds: readonly [string, ...string[]];
  legalText: string;
  legalSources: readonly [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  documents: readonly PublicAeatOfficialContentDocumentV1[];
  links: readonly PublicAeatOfficialContentLinkV1[];
  accessMethods: NonNullable<PublicAeatOfficialModelContentV1["accessMethods"]>;
  channelFaqAnswer: string;
  detailFaq: PublicAeatOfficialContentFaqItemV1;
}>;

function defineElectronicModel<const Code extends string>(
  config: ElectronicModelConfig<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  const legalSourceIds = [
    config.legalSources[0].id,
    ...config.legalSources.slice(1).map((source) => source.id),
  ] as [string, ...string[]];
  return defineModel({
    code: config.code,
    canonicalName: config.canonicalName,
    summary: config.summary,
    searchTerms: config.searchTerms,
    sections: [
      {
        id: `model-${config.code}-identity`,
        title: "Identidad y alcance oficial",
        kind: "PURPOSE",
        items: [
          {
            id: `model-${config.code}-identity-name`,
            heading: "Denominación registrada",
            text: config.identityText,
            sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id, config.home.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${config.code}-identity-record`,
            heading: config.recordHeading,
            text: config.recordText,
            sourceIds: [config.record.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${config.code}-access`,
        title: "Canal y recursos oficiales",
        kind: "ACCESS",
        items: [
          {
            id: `model-${config.code}-access-channel`,
            heading: config.channelHeading,
            text: config.channelText,
            sourceIds: config.accessMethods.sourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${config.code}-access-detail`,
            heading: config.detailHeading,
            text: config.detailText,
            sourceIds: config.detailSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${config.code}-legal`,
        title: "Publicaciones oficiales registradas",
        kind: "DETAILS",
        items: [
          {
            id: `model-${config.code}-legal-publications`,
            heading: "Referencias del BOE",
            text: config.legalText,
            sourceIds: legalSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
    ],
    sources: [
      OFFICIAL_MODEL_INDEX_SOURCE,
      config.home,
      config.record,
      ...config.additionalSources,
    ],
    documents: config.documents,
    links: [
      {
        id: `model-${config.code}-link-home`,
        label: `Página oficial del Modelo ${config.code}`,
        sourceId: config.home.id,
        category: "PROCEDURE",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-record`,
        label: "Ficha oficial del procedimiento",
        sourceId: config.record.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      ...config.links,
    ],
    faq: [
      {
        id: `model-${config.code}-faq-identity`,
        question: `¿Qué identifica la AEAT como Modelo ${config.code}?`,
        answer: config.canonicalName,
        sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id, config.home.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-record`,
        question: "¿Qué explica la ficha administrativa?",
        answer: config.recordText,
        sourceIds: [config.record.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-channel`,
        question: "¿Qué canal electrónico describe la AEAT?",
        answer: config.channelFaqAnswer,
        sourceIds: config.accessMethods.sourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-pages`,
        question: "¿Qué páginas administrativas se han registrado?",
        answer:
          "La portada del modelo y la ficha separada del procedimiento publicadas por la AEAT.",
        sourceIds: [config.home.id, config.record.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-resources`,
        question: "¿Qué recurso complementario ofrece esta ficha?",
        answer: config.detailText,
        sourceIds: config.detailSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-legal`,
        question: "¿Qué publicaciones del BOE se conservan como referencia?",
        answer: config.legalText,
        sourceIds: legalSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      config.detailFaq,
    ],
    accessMethods: config.accessMethods,
  });
}

const MODEL_590_CONTENT = defineElectronicModel({
  code: "590",
  canonicalName: "IIEE. Solicitud de devolución por exportación o expedición.",
  summary:
    "La AEAT identifica el Modelo 590 con la solicitud de devolución por exportación o expedición y publica una tramitación telemática, una ficha administrativa y un formulario PDF heredado para consulta externa.",
  searchTerms: [
    "modelo 590",
    "IIEE",
    "impuestos especiales",
    "devolución",
    "exportación",
    "expedición",
  ],
  home: MODEL_590_HOME_SOURCE,
  record: MODEL_590_RECORD_SOURCE,
  additionalSources: [
    MODEL_590_DOWNLOAD_SOURCE,
    MODEL_590_PDF_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
  ],
  identityText:
    "El índice y la portada oficiales denominan Modelo 590 a la solicitud de devolución de Impuestos Especiales por exportación o expedición.",
  recordHeading: "Objeto administrativo",
  recordText:
    "La ficha administrativa describe la solicitud de devolución de cuotas de impuestos especiales previamente satisfechas correspondientes a productos exportados.",
  channelHeading: "Solicitud electrónica",
  channelText:
    "La portada enlaza una solicitud de devolución electrónica y la ficha sitúa la presentación por vía telemática.",
  detailHeading: "Formulario PDF heredado",
  detailText:
    "La página de descarga enlaza un PDF de tres páginas creado en 2008, sin JavaScript ni AcroForm detectados. Se registra como referencia heredada de descarga externa y no como vista previa vigente.",
  detailSourceIds: [MODEL_590_DOWNLOAD_SOURCE.id, MODEL_590_PDF_SOURCE.id],
  legalText:
    "La publicación original de la Orden EHA/3482/2007 queda registrada como referencia normativa del procedimiento.",
  legalSources: [ORDER_EHA_3482_2007_SOURCE],
  documents: [
    {
      id: "model-590-form-document",
      kind: "FORM",
      title: "Formulario PDF del Modelo 590",
      sourceId: MODEL_590_PDF_SOURCE.id,
      landingPageSourceId: MODEL_590_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "590.pdf",
      byteLength: 124914,
      pageCount: 3,
      sha256:
        "9bd1f201c5d852742f3cca6cfa256082bbdb2c8fce6dd819c35bc147299ef4cb",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-590-link-download",
      label: "Descarga oficial del Modelo 590",
      sourceId: MODEL_590_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-590-link-order",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_590_HOME_SOURCE.id, MODEL_590_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  channelFaqAnswer:
    "Una solicitud electrónica; la ficha administrativa indica presentación telemática.",
  detailFaq: {
    id: "model-590-faq-pdf-safety",
    question: "¿Por qué no se muestra una miniatura del PDF?",
    answer:
      "El archivo enlazado conserva metadatos de 2008 y se trata como referencia heredada de descarga externa, sin presentarlo como documento actual.",
    sourceIds: [MODEL_590_DOWNLOAD_SOURCE.id, MODEL_590_PDF_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_591_CONTENT = defineElectronicModel({
  code: "591",
  canonicalName:
    "Impuesto sobre el valor de la producción de la energía eléctrica. Declaración anual de operaciones.",
  summary:
    "La AEAT publica el Modelo 591 como declaración anual de operaciones vinculada al valor de la producción de energía eléctrica, con presentación en línea, importación de fichero y documentación PDF heredada.",
  searchTerms: [
    "modelo 591",
    "energía eléctrica",
    "producción eléctrica",
    "declaración anual",
    "operaciones con contribuyentes",
    "importación de fichero",
  ],
  home: MODEL_591_HOME_SOURCE,
  record: MODEL_591_RECORD_SOURCE,
  additionalSources: [
    MODEL_591_DOWNLOAD_SOURCE,
    MODEL_591_FORM_SOURCE,
    MODEL_591_INSTRUCTIONS_SOURCE,
    ORDER_HAP_2328_2014_SOURCE,
    ORDER_HAC_1433_2024_SOURCE,
  ],
  identityText:
    "El catálogo identifica el Modelo 591 con la declaración anual de operaciones del impuesto sobre el valor de la producción de energía eléctrica; la portada actual añade la referencia a operaciones con contribuyentes.",
  recordHeading: "Declaración anual",
  recordText:
    "La ficha administrativa describe el procedimiento como tributario, con tramitación electrónica y sin fases específicas de tramitación.",
  channelHeading: "Formulario e importación",
  channelText:
    "La portada ofrece una presentación en línea y otra presentación de declaraciones con importación de fichero como gestiones diferenciadas.",
  detailHeading: "Formulario e instrucciones enlazados",
  detailText:
    "La AEAT enlaza un formulario de una página y unas instrucciones de dos páginas, ambos con metadatos de 2015. Se conservan como referencias heredadas de descarga externa y sin miniatura.",
  detailSourceIds: [
    MODEL_591_DOWNLOAD_SOURCE.id,
    MODEL_591_FORM_SOURCE.id,
    MODEL_591_INSTRUCTIONS_SOURCE.id,
  ],
  legalText:
    "Se registran las publicaciones originales de la Orden HAP/2328/2014, que aprobó el modelo, y de la Orden HAC/1433/2024, que modificó aquella orden.",
  legalSources: [ORDER_HAP_2328_2014_SOURCE, ORDER_HAC_1433_2024_SOURCE],
  documents: [
    {
      id: "model-591-form-document",
      kind: "FORM",
      title: "Formulario PDF del Modelo 591",
      sourceId: MODEL_591_FORM_SOURCE.id,
      landingPageSourceId: MODEL_591_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "modelo_591_descarga.pdf",
      byteLength: 53940,
      pageCount: 1,
      sha256:
        "1ea5ba9b2059a3a5ee843fbd13e923c2f924d7d6a4bf5563dfc32bbc26953234",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-591-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones PDF del Modelo 591",
      sourceId: MODEL_591_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_591_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "modelo_591_Instrucciones.pdf",
      byteLength: 43070,
      pageCount: 2,
      sha256:
        "be6311815e2677517f860f8fb0d91628092dedea81859259cf572bfd8e684442",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-591-link-download",
      label: "Descarga e instrucciones oficiales",
      sourceId: MODEL_591_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-591-link-order-2014",
      label: "Orden HAP/2328/2014",
      sourceId: ORDER_HAP_2328_2014_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-591-link-order-2024",
      label: "Orden HAC/1433/2024",
      sourceId: ORDER_HAC_1433_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_591_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  channelFaqAnswer:
    "La portada distingue presentación en línea y presentación con importación de fichero.",
  detailFaq: {
    id: "model-591-faq-amendment",
    question: "¿Existe una modificación normativa reciente registrada?",
    answer:
      "Sí. La publicación original de la Orden HAC/1433/2024 modifica la orden que aprobó el Modelo 591.",
    sourceIds: [ORDER_HAP_2328_2014_SOURCE.id, ORDER_HAC_1433_2024_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_592_CONTENT = defineElectronicModel({
  code: "592",
  canonicalName:
    "Declaración-Liquidación Impuesto especial sobre los envases de plástico no reutilizables. Autoliquidación",
  summary:
    "La AEAT identifica el Modelo 592 con la autoliquidación del impuesto especial sobre los envases de plástico no reutilizables y publica procedimiento electrónico, información temática, preguntas frecuentes y formato electrónico informativo.",
  searchTerms: [
    "modelo 592",
    "envases de plástico",
    "plástico no reutilizable",
    "impuesto especial",
    "autoliquidación",
    "preguntas frecuentes",
  ],
  home: MODEL_592_HOME_SOURCE,
  record: MODEL_592_RECORD_SOURCE,
  additionalSources: [
    MODEL_592_TOPIC_SOURCE,
    MODEL_592_FAQ_SOURCE,
    MODEL_592_FORMAT_SOURCE,
    ORDER_HFP_1314_2022_SOURCE,
  ],
  identityText:
    "El índice y la portada de la AEAT identifican el Modelo 592 con la autoliquidación del impuesto especial sobre los envases de plástico no reutilizables.",
  recordHeading: "Procedimiento administrativo",
  recordText:
    "La ficha administrativa vincula la autoliquidación con la Orden HFP/1314/2022 y describe tramitación electrónica sin fases específicas.",
  channelHeading: "Presentación en la Sede",
  channelText:
    "La portada ofrece la presentación de la autoliquidación y la ficha sitúa el procedimiento en la Sede electrónica de la AEAT.",
  detailHeading: "Información temática y documentos",
  detailText:
    "La página temática publica información general, ayuda, preguntas frecuentes y documentación técnica. El PDF de formato electrónico se registra como guía informativa, no como canal independiente de presentación.",
  detailSourceIds: [
    MODEL_592_TOPIC_SOURCE.id,
    MODEL_592_FAQ_SOURCE.id,
    MODEL_592_FORMAT_SOURCE.id,
  ],
  legalText:
    "La publicación original de la Orden HFP/1314/2022 queda registrada como la orden que aprueba el Modelo 592.",
  legalSources: [ORDER_HFP_1314_2022_SOURCE],
  documents: [
    {
      id: "model-592-faq-document",
      kind: "GUIDE",
      title: "Preguntas y respuestas sobre el impuesto sobre el plástico",
      sourceId: MODEL_592_FAQ_SOURCE.id,
      landingPageSourceId: MODEL_592_TOPIC_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "PREGUNTAS_RESPUESTASdic22.pdf",
      byteLength: 172185,
      pageCount: 16,
      sha256:
        "8e83ae0f1b315200a881e765d7f266672f2fdaa818e374bd51cda363d1b733bb",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-592-format-document",
      kind: "GUIDE",
      title: "Formato electrónico del Modelo 592",
      sourceId: MODEL_592_FORMAT_SOURCE.id,
      landingPageSourceId: MODEL_592_TOPIC_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "MOD_AUTOLIQ_PLAST.pdf",
      byteLength: 41568,
      pageCount: 5,
      sha256:
        "545b2132408e54a8ff395180ed0e24476963ac5a61adf890f72ce897a69fd350",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-592-link-topic",
      label: "Información oficial sobre el impuesto del plástico",
      sourceId: MODEL_592_TOPIC_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-592-link-order",
      label: "Orden HFP/1314/2022",
      sourceId: ORDER_HFP_1314_2022_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_592_HOME_SOURCE.id, MODEL_592_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  channelFaqAnswer:
    "Una presentación electrónica de la autoliquidación en la Sede de la AEAT.",
  detailFaq: {
    id: "model-592-faq-format-channel",
    question: "¿El PDF de formato electrónico es otro canal de presentación?",
    answer:
      "No. Se registra como documentación informativa sobre la estructura del modelo; la ficha no lo convierte en un canal alternativo.",
    sourceIds: [MODEL_592_TOPIC_SOURCE.id, MODEL_592_FORMAT_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_593_CONTENT = defineElectronicModel({
  code: "593",
  canonicalName:
    "Impuesto sobre el depósito de residuos en vertederos, la incineración y la coincineración de residuos. Autoliquidación.",
  summary:
    "La AEAT identifica el Modelo 593 con la autoliquidación del impuesto sobre depósito, incineración y coincineración de residuos y publica procedimiento electrónico, información temática, preguntas frecuentes y una tabla de códigos informativa.",
  searchTerms: [
    "modelo 593",
    "depósito de residuos",
    "vertederos",
    "incineración",
    "coincineración",
    "autoliquidación",
    "preguntas frecuentes",
  ],
  home: MODEL_593_HOME_SOURCE,
  record: MODEL_593_RECORD_SOURCE,
  additionalSources: [
    MODEL_593_TOPIC_SOURCE,
    MODEL_593_FAQ_SOURCE,
    MODEL_593_CODES_SOURCE,
    ORDER_HFP_1337_2022_SOURCE,
  ],
  identityText:
    "El catálogo y la portada de la AEAT identifican el Modelo 593 con la autoliquidación del impuesto sobre el depósito de residuos en vertederos, la incineración y la coincineración.",
  recordHeading: "Procedimiento administrativo",
  recordText:
    "La ficha administrativa vincula la autoliquidación con la Orden HFP/1337/2022 y describe tramitación electrónica sin fases específicas.",
  channelHeading: "Presentación en la Sede",
  channelText:
    "La portada ofrece la presentación de la autoliquidación y la ficha sitúa el procedimiento en la Sede electrónica de la AEAT.",
  detailHeading: "Ayuda temática oficial",
  detailText:
    "La página temática enlaza preguntas frecuentes y una tabla PDF de códigos del campo tipo impositivo. Ambos se registran como ayuda informativa, no como cálculo ni canal de presentación.",
  detailSourceIds: [
    MODEL_593_TOPIC_SOURCE.id,
    MODEL_593_FAQ_SOURCE.id,
    MODEL_593_CODES_SOURCE.id,
  ],
  legalText:
    "La publicación original de la Orden HFP/1337/2022 queda registrada como la orden que aprueba el Modelo 593.",
  legalSources: [ORDER_HFP_1337_2022_SOURCE],
  documents: [
    {
      id: "model-593-faq-document",
      kind: "GUIDE",
      title: "Preguntas frecuentes sobre el impuesto de residuos",
      sourceId: MODEL_593_FAQ_SOURCE.id,
      landingPageSourceId: MODEL_593_TOPIC_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "faqs_imp_residuos.pdf",
      byteLength: 168443,
      pageCount: 14,
      sha256:
        "cef0e0f6a4bc836f3173f0abbb5a9262c1a6e980c9b6702bd71a98109072d791",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-593-type-codes-document",
      kind: "GUIDE",
      title: "Códigos del campo tipo impositivo del Modelo 593",
      sourceId: MODEL_593_CODES_SOURCE.id,
      landingPageSourceId: MODEL_593_TOPIC_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Codcamp_tipoimp3.pdf",
      byteLength: 394829,
      pageCount: 2,
      sha256:
        "9a6b934a3e8ed4eda0d2e9997555161cc598c2af17fab641b35936d2c4410bf6",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-593-link-topic",
      label: "Información oficial sobre el impuesto de residuos",
      sourceId: MODEL_593_TOPIC_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-593-link-order",
      label: "Orden HFP/1337/2022",
      sourceId: ORDER_HFP_1337_2022_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_593_HOME_SOURCE.id, MODEL_593_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  channelFaqAnswer:
    "Una presentación electrónica de la autoliquidación en la Sede de la AEAT.",
  detailFaq: {
    id: "model-593-faq-code-table",
    question: "¿Qué función tiene la tabla de códigos enlazada?",
    answer:
      "Es una ayuda oficial para el campo tipo impositivo del Modelo 593; esta ficha la muestra como documento informativo y no calcula ni recomienda un código.",
    sourceIds: [MODEL_593_TOPIC_SOURCE.id, MODEL_593_CODES_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_595_CONTENT = defineElectronicModel({
  code: "595",
  canonicalName: "II. EE. Impuesto sobre el carbón.",
  summary:
    "La AEAT identifica el Modelo 595 con el Impuesto Especial sobre el Carbón y publica gestiones telemáticas de autoliquidación junto con su ficha administrativa y normativa específica.",
  searchTerms: [
    "modelo 595",
    "impuesto sobre el carbón",
    "impuestos especiales",
    "IIEE",
    "autoliquidación",
    "carbón",
  ],
  home: MODEL_595_HOME_SOURCE,
  record: MODEL_595_RECORD_SOURCE,
  additionalSources: [ORDER_EHA_3947_2006_SOURCE, ORDER_HFP_292_2018_SOURCE],
  identityText:
    "El catálogo y la portada de la AEAT identifican el Modelo 595 con el Impuesto Especial sobre el Carbón.",
  recordHeading: "Declaración-liquidación",
  recordText:
    "La ficha administrativa describe el cumplimiento de requisitos formales para declaraciones-liquidaciones de productos sujetos a Impuestos Especiales y señala tramitación electrónica.",
  channelHeading: "Autoliquidación electrónica",
  channelText:
    "La portada enlaza pago, presentación y consulta de autoliquidaciones; la ficha administrativa indica presentación telemática.",
  detailHeading: "Gestiones complementarias",
  detailText:
    "La portada registra además gestiones separadas para presentar solicitudes o comunicaciones y para aportar documentación relacionada con el procedimiento.",
  detailSourceIds: [MODEL_595_HOME_SOURCE.id],
  legalText:
    "Se registran las publicaciones originales de la Orden EHA/3947/2006 y de su modificación por la Orden HFP/292/2018.",
  legalSources: [ORDER_EHA_3947_2006_SOURCE, ORDER_HFP_292_2018_SOURCE],
  documents: [],
  links: [
    {
      id: "model-595-link-order-2006",
      label: "Orden EHA/3947/2006",
      sourceId: ORDER_EHA_3947_2006_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-595-link-order-2018",
      label: "Orden HFP/292/2018",
      sourceId: ORDER_HFP_292_2018_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_595_HOME_SOURCE.id, MODEL_595_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  channelFaqAnswer:
    "La presentación telemática de la autoliquidación a través de la Sede de la AEAT.",
  detailFaq: {
    id: "model-595-faq-declaration-type",
    question: "¿Cómo denomina la ficha administrativa al documento?",
    answer: "Declaración-liquidación del Impuesto sobre el Carbón, Modelo 595.",
    sourceIds: [MODEL_595_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_596_CONTENT = defineElectronicModel({
  code: "596",
  canonicalName:
    "II. EE. Declaración anual de operaciones realizadas. Impuesto sobre el carbón.",
  summary:
    "La AEAT identifica el Modelo 596 con la declaración anual de operaciones del Impuesto sobre el Carbón y ofrece cumplimentación en línea, consulta y su ficha administrativa.",
  searchTerms: [
    "modelo 596",
    "impuesto sobre el carbón",
    "declaración anual",
    "operaciones realizadas",
    "impuestos especiales",
    "cumplimentación en línea",
  ],
  home: MODEL_596_HOME_SOURCE,
  record: MODEL_596_RECORD_SOURCE,
  additionalSources: [ORDER_EHA_3947_2006_SOURCE, ORDER_HFP_292_2018_SOURCE],
  identityText:
    "El catálogo y la portada de la AEAT identifican el Modelo 596 con la declaración anual de operaciones realizadas del Impuesto sobre el Carbón.",
  recordHeading: "Declaración resumen anual",
  recordText:
    "La ficha administrativa describe el cumplimiento de requisitos formales para la declaración resumen anual de operaciones y señala tramitación electrónica.",
  channelHeading: "Cumplimentación en línea",
  channelText:
    "La portada publica una gestión denominada cumplimentación en línea de la declaración y otra para consultar declaraciones.",
  detailHeading: "Documentación relacionada",
  detailText:
    "La portada registra una gestión separada para contestar requerimientos, efectuar alegaciones o aportar documentos relacionados con el procedimiento.",
  detailSourceIds: [MODEL_596_HOME_SOURCE.id],
  legalText:
    "Se registran las publicaciones originales de la Orden EHA/3947/2006 y de su modificación por la Orden HFP/292/2018.",
  legalSources: [ORDER_EHA_3947_2006_SOURCE, ORDER_HFP_292_2018_SOURCE],
  documents: [],
  links: [
    {
      id: "model-596-link-order-2006",
      label: "Orden EHA/3947/2006",
      sourceId: ORDER_EHA_3947_2006_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-596-link-order-2018",
      label: "Orden HFP/292/2018",
      sourceId: ORDER_HFP_292_2018_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_596_HOME_SOURCE.id, MODEL_596_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  channelFaqAnswer:
    "La cumplimentación en línea de la declaración a través de la Sede de la AEAT.",
  detailFaq: {
    id: "model-596-faq-annual-summary",
    question: "¿Cómo caracteriza la ficha administrativa esta declaración?",
    answer:
      "Como declaración resumen anual de operaciones de productos sujetos a Impuestos Especiales.",
    sourceIds: [MODEL_596_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

type Gc12Code = "600" | "610" | "615" | "620";

const GC12_CANONICAL_NAME =
  "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos)." as const;

type Gc12ModelConfig<Code extends Gc12Code> = Readonly<{
  code: Code;
  documentTitle: string;
  documentSource: PublicAeatOfficialContentSourceV1;
  documentFileName: string;
  documentBytes: number;
  documentPages: number;
  documentSha256: string;
  topicText: string;
  searchTerms: readonly [string, ...string[]];
  relevantOrder: PublicAeatOfficialContentSourceV1;
}>;

function defineGc12Model<const Code extends Gc12Code>(
  config: Gc12ModelConfig<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  return defineModel({
    code: config.code,
    canonicalName: GC12_CANONICAL_NAME,
    summary: `La AEAT incluye el Modelo ${config.code} en el procedimiento conjunto de ITPAJD para Ceuta y Melilla y otros supuestos de gestión estatal, con información de competencia y un PDF interactivo heredado de descarga externa.`,
    searchTerms: config.searchTerms,
    sections: [
      {
        id: `model-${config.code}-identity`,
        title: "Procedimiento conjunto y alcance",
        kind: "PURPOSE",
        items: [
          {
            id: `model-${config.code}-identity-group`,
            heading: `Modelo ${config.code} dentro del grupo oficial`,
            text: `El índice de la AEAT incluye el código ${config.code} en el procedimiento conjunto de los modelos 600, 610, 615, 620 y 630 de Transmisiones Patrimoniales y Actos Jurídicos Documentados.`,
            sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id, GC12_HOME_SOURCE.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${config.code}-identity-scope`,
            heading: "Gestión estatal acotada",
            text: "La ficha administrativa explica que la aplicación del impuesto está cedida a las comunidades autónomas para la práctica totalidad de los hechos imponibles y que la AEAT conserva determinados supuestos residuales. La página temática identifica expresamente la gestión de Ceuta y Melilla.",
            sourceIds: [GC12_RECORD_SOURCE.id, GC12_TOPIC_SOURCE.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${config.code}-resources`,
        title: "Documento y ayuda oficiales",
        kind: "DETAILS",
        items: [
          {
            id: `model-${config.code}-resources-document`,
            heading: config.documentTitle,
            text: "La página de descargas enlaza este PDF. El archivo contiene JavaScript y AcroForm, está cifrado para restringir cambios y conserva metadatos de 2003/2008; por ello se ofrece únicamente como descarga externa heredada y sin miniatura.",
            sourceIds: [GC12_DOWNLOAD_SOURCE.id, config.documentSource.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${config.code}-resources-topic`,
            heading: "Información temática",
            text: config.topicText,
            sourceIds: [GC12_TOPIC_SOURCE.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${config.code}-resources-competence`,
            heading: "Cuadro de competencia territorial",
            text: "La AEAT publica un cuadro informativo que organiza reglas territoriales de competencia entre el Estado y las comunidades autónomas por categorías de hechos imponibles.",
            sourceIds: [GC12_COMPETENCE_SOURCE.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${config.code}-legal`,
        title: "Publicaciones oficiales registradas",
        kind: "DETAILS",
        items: [
          {
            id: `model-${config.code}-legal-order`,
            heading: "Órdenes del BOE",
            text: `Se registra la publicación original de ${config.relevantOrder.title} para este código y la publicación original de la Orden HAC/1927/2002, que modificó las órdenes del procedimiento conjunto.`,
            sourceIds: [config.relevantOrder.id, ORDER_HAC_1927_2002_SOURCE.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
    ],
    sources: [
      OFFICIAL_MODEL_INDEX_SOURCE,
      GC12_HOME_SOURCE,
      GC12_RECORD_SOURCE,
      GC12_TOPIC_SOURCE,
      GC12_DOWNLOAD_SOURCE,
      GC12_COMPETENCE_SOURCE,
      config.documentSource,
      config.relevantOrder,
      ORDER_HAC_1927_2002_SOURCE,
    ],
    documents: [
      {
        id: `model-${config.code}-form-document`,
        kind: "FORM",
        title: config.documentTitle,
        sourceId: config.documentSource.id,
        landingPageSourceId: GC12_DOWNLOAD_SOURCE.id,
        mediaType: "application/pdf",
        fileName: config.documentFileName,
        byteLength: config.documentBytes,
        pageCount: config.documentPages,
        sha256: config.documentSha256,
        activeContentStatus: "JAVASCRIPT_PRESENT",
        formStatus: "ACROFORM_PRESENT",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        previewSuitability: "NONE",
        usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
      },
    ],
    links: [
      {
        id: `model-${config.code}-link-home`,
        label: "Procedimiento conjunto oficial",
        sourceId: GC12_HOME_SOURCE.id,
        category: "PROCEDURE",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-record`,
        label: "Ficha oficial del procedimiento",
        sourceId: GC12_RECORD_SOURCE.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-topic`,
        label: "Información ITPAJD en Ceuta y Melilla",
        sourceId: GC12_TOPIC_SOURCE.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-download`,
        label: "Descarga oficial de modelos",
        sourceId: GC12_DOWNLOAD_SOURCE.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-competence`,
        label: "Cuadro oficial de delimitación de competencias",
        sourceId: GC12_COMPETENCE_SOURCE.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-order`,
        label: config.relevantOrder.title,
        sourceId: config.relevantOrder.id,
        category: "LEGAL",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-link-amending-order`,
        label: "Orden HAC/1927/2002",
        sourceId: ORDER_HAC_1927_2002_SOURCE.id,
        category: "LEGAL",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
    ],
    faq: [
      {
        id: `model-${config.code}-faq-group`,
        question: `¿Dónde sitúa la AEAT el Modelo ${config.code}?`,
        answer:
          "En el procedimiento conjunto de los modelos 600, 610, 615, 620 y 630 de Transmisiones Patrimoniales y Actos Jurídicos Documentados.",
        sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id, GC12_HOME_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-aeat-scope`,
        question: "¿La AEAT gestiona todos los supuestos de este impuesto?",
        answer:
          "No. Su ficha explica que la aplicación está cedida a las comunidades autónomas para la práctica totalidad de los hechos imponibles y que la AEAT conserva determinados supuestos residuales.",
        sourceIds: [GC12_RECORD_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-ceuta-melilla`,
        question: "¿Qué ámbito territorial destaca la página temática?",
        answer:
          "Ceuta y Melilla, cuyas delegaciones de la AEAT gestionan el impuesto según la información temática publicada.",
        sourceIds: [GC12_TOPIC_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-document`,
        question: `¿Qué documento oficial se ha registrado para el Modelo ${config.code}?`,
        answer: config.documentTitle,
        sourceIds: [GC12_DOWNLOAD_SOURCE.id, config.documentSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-preview`,
        question: "¿Por qué el formulario no tiene miniatura?",
        answer:
          "El PDF contiene JavaScript y AcroForm y conserva metadatos antiguos; se mantiene como descarga externa heredada y no se ejecuta ni previsualiza dentro de la aplicación.",
        sourceIds: [GC12_DOWNLOAD_SOURCE.id, config.documentSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-competence`,
        question: "¿Qué aporta el cuadro de delimitación de competencias?",
        answer:
          "Organiza reglas territoriales por categorías de hechos imponibles para distinguir la competencia estatal y autonómica.",
        sourceIds: [GC12_COMPETENCE_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-online`,
        question:
          "¿La ficha convierte la aportación documental en presentación del modelo?",
        answer:
          "No. La portada solo anuncia una gestión conjunta de aportación de documentación complementaria; no se etiqueta como canal de presentación del modelo.",
        sourceIds: [GC12_HOME_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${config.code}-faq-orders`,
        question: "¿Qué publicaciones normativas se enlazan?",
        answer: `${config.relevantOrder.title} y la Orden HAC/1927/2002.`,
        sourceIds: [config.relevantOrder.id, ORDER_HAC_1927_2002_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    ],
    accessMethods: {
      methods: ["ADMINISTRATIVE_TRANSFER"],
      status: "SOURCE_DESCRIBED",
      sourceIds: [GC12_RECORD_SOURCE.id, GC12_TOPIC_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  });
}

const MODEL_600_CONTENT = defineGc12Model({
  code: "600",
  documentTitle:
    "Modelo 600 · Impuesto sobre Transmisiones Patrimoniales y Actos Jurídicos Documentados",
  documentSource: MODEL_600_PDF_SOURCE,
  documentFileName: "mod600e.pdf",
  documentBytes: 556875,
  documentPages: 6,
  documentSha256:
    "40151c2de829dc1381f65b1865946b71a566adb42aac23eef2662c51b2cd85cf",
  topicText:
    "La página temática relaciona el Modelo 600 con transmisiones, derechos reales, préstamos, fianzas, arrendamientos, pensiones y concesiones administrativas dentro del ámbito de gestión descrito para Ceuta y Melilla.",
  searchTerms: [
    "modelo 600",
    "ITPAJD",
    "transmisiones patrimoniales",
    "actos jurídicos documentados",
    "Ceuta y Melilla",
    "derechos reales",
    "arrendamientos",
  ],
  relevantOrder: ORDER_4_JULY_2001_SOURCE,
});

const MODEL_610_CONTENT = defineGc12Model({
  code: "610",
  documentTitle:
    "Modelo 610 · pago en metálico de documentos negociados por entidades colaboradoras",
  documentSource: MODEL_610_PDF_SOURCE,
  documentFileName: "mod610e.pdf",
  documentBytes: 717318,
  documentPages: 11,
  documentSha256:
    "3c0af47bcc1ceced96d8c99fbd349e52ccf588e39347d3c9a1dca382ff31d660",
  topicText:
    "La página temática agrupa los modelos 610, 615 y 630 bajo la información de letras de cambio para el ámbito de Ceuta y Melilla.",
  searchTerms: [
    "modelo 610",
    "ITPAJD",
    "pago en metálico",
    "documentos negociados",
    "entidades colaboradoras",
    "letras de cambio",
    "Ceuta y Melilla",
  ],
  relevantOrder: ORDER_12_NOVEMBER_2001_SOURCE,
});

const MODEL_615_CONTENT = defineGc12Model({
  code: "615",
  documentTitle:
    "Modelo 615 · pago en metálico de documentos con acción cambiaria o endosables a la orden",
  documentSource: MODEL_615_PDF_SOURCE,
  documentFileName: "mod615e.pdf",
  documentBytes: 228773,
  documentPages: 3,
  documentSha256:
    "52d5f90444c60c6f7f4166f22f465d47ed44e96e19eae1a3056125fb028be70b",
  topicText:
    "La página temática agrupa los modelos 610, 615 y 630 bajo la información de letras de cambio para el ámbito de Ceuta y Melilla.",
  searchTerms: [
    "modelo 615",
    "ITPAJD",
    "pago en metálico",
    "acción cambiaria",
    "documentos endosables",
    "letras de cambio",
    "Ceuta y Melilla",
  ],
  relevantOrder: ORDER_12_NOVEMBER_2001_SOURCE,
});

const MODEL_620_CONTENT = defineGc12Model({
  code: "620",
  documentTitle:
    "Modelo 620 · transmisión de determinados medios de transporte usados",
  documentSource: MODEL_620_PDF_SOURCE,
  documentFileName: "mod620e.pdf",
  documentBytes: 358862,
  documentPages: 4,
  documentSha256:
    "55b42d271861b2002a4cd98f7786fdef21782e76ad63caea30cfecc09137d209",
  topicText:
    "La página temática relaciona el Modelo 620 con vehículos, embarcaciones de recreo y aeronaves usados dentro del ámbito descrito para Ceuta y Melilla.",
  searchTerms: [
    "modelo 620",
    "ITPAJD",
    "vehículos usados",
    "medios de transporte",
    "embarcaciones de recreo",
    "aeronaves",
    "Ceuta y Melilla",
  ],
  relevantOrder: ORDER_4_JULY_2001_SOURCE,
});

export const PUBLIC_AEAT_BATCH_16_LATE_EXCISE_CUSTOMS_590_620_CONTENT_V1 =
  deepFreeze([
    MODEL_590_CONTENT,
    MODEL_591_CONTENT,
    MODEL_592_CONTENT,
    MODEL_593_CONTENT,
    MODEL_595_CONTENT,
    MODEL_596_CONTENT,
    MODEL_600_CONTENT,
    MODEL_610_CONTENT,
    MODEL_615_CONTENT,
    MODEL_620_CONTENT,
  ] as const);
