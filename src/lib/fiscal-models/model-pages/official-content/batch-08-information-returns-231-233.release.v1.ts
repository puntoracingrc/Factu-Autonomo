import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_RELEASE_ID_V1 =
  "public-aeat-official-batch-08-information-returns-231-233.2026-07-13.v1" as const;

export type PublicAeatBatch08InformationReturns231233CodeV1 =
  "231" | "232" | "233";

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

const MODEL_231_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-231.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 231 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI41.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "100d9fbd0ed04582266822d8f64732ea78109b4a2af90719079b9f9b41455d44",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_231_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-231.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 231",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI41.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "962897a81f048e54ed7f3ae4c63248a4bb3f99d06772015c6b803460e106b749",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_231_BASIC_QUESTIONS_SOURCE = {
  id: "aeat.model-231.basic-questions.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 231 · cuestiones básicas",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-231-decla_____eclaracion-informacion-pais-pais/cuestiones-basicas.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "71d42ab5e134550be217f474957d6ac57ba46f78eb3b9daa87b3e1774a6a452d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_231_WEB_SERVICE_SOURCE = {
  id: "aeat.model-231.web-service-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 231 · información sobre la presentación mediante servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-231-decla_____eclaracion-informacion-pais-pais/informacion-sobre-presentacion-mediante-web-service.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c3a6182f6a0a47aba7ec34871e3f765e3382447833770396b1f7274e4103ac63",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_231_FORM_HELP_SOURCE = {
  id: "aeat.model-231.form-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 231 · información sobre el formulario de ayuda",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-231-decla_____eclaracion-informacion-pais-pais/informacion-sobre-presentacion-mediante-formulario-ayuda.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c19687846c099586b611f724a2766f0f965ed8306620328609e7e6df24bc6c91",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_231_FORM_MANUAL_SOURCE = {
  id: "aeat.model-231.form-manual-pdf.v2-1.2021-10-27",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title:
    "Modelo 231 · manual para presentación mediante formulario · versión 2.1",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI41/Formulario/M231_Formulario_ayuda_2.1.pdf",
  officialUpdatedOn: "2021-10-27",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c260aa220dab8c80bb2184026d4cb02976a8aad005d67d72261772cefef8e650",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_1978_2016_SOURCE = {
  id: "boe.model-231.order-hfp-1978-2016",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1978/2016, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2016-12484",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "65c04b3ea466f62ef73878ded16c58b495d255d90dd9ddd8fa798e38c1add523",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_941_2018_SOURCE = {
  id: "boe.model-231.order-hac-941-2018",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/941/2018, de 5 de septiembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2018-12515",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6d3babe60b1bf5883695db89a8b399421982ee4daad3c02bb849f2b4984db96a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1285_2020_SOURCE = {
  id: "boe.model-231.order-hac-1285-2020",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1285/2020, de 29 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2020-17342",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "321da459aff37f5cd66dfecf705be5ee9ab1f650b6c4d469845ac5904550e0b6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_232_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-232.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 232 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI43.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9b12793c58285d3397d1539f551800d2a95f5b6a6d048eafafd2105bf1f9cf39",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_232_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-232.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 232",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI43.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d7f435999159f0247e703c63b78e68faf8567c7198317fbb636687136e4b7f62",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_232_HELP_SOURCE = {
  id: "aeat.model-232.technical-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 232 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-232.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1e9f7bac616f598d17a786955bcb94d98d186c1c2490f80942e97bf1dd1cc6c5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_232_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-232.instructions-pdf.2025-10-31",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 232 · instrucciones de cumplimentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI43/Instrucciones_Modelo_232.pdf",
  officialUpdatedOn: "2025-10-31",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "44a7606d2e5be723416c441ca8824e31fbfdf35af3554dceef2da4185e1a2a0c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_200_299_REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-200-299.register-designs.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · Modelos 200 al 299",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-200-299.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1397ca1c069858135a1229fa0e1b36d36df487d9e757207069761e2c143a67a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_816_2017_SOURCE = {
  id: "boe.model-232.order-hfp-816-2017",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/816/2017, de 28 de agosto",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2017-10042",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "257dea7721386a8b262da99b2667aa3c63e1dd9635737d7c29c0817aa5d5d18f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-233.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 233 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI45.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "790398a25f87f3de3bfde19e75b3b3e16e0f7d339bfb2b71db65b46da911221e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-233.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 233",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI45.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "099891e1ecf02a3cef8ea9abde1b2834668505565839f58a4f010b40c875026e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_INFORMATION_NOTE_SOURCE = {
  id: "aeat.model-233.information-note.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 233 · nota informativa",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-233-decla_____erias-centros-educacion-autorizados_/nota-informativa.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "85bc3dc84056711bebdd7ef878772f2e9581c689470c2db14e4202a124491364",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_FAQ_SOURCE = {
  id: "aeat.model-233.faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 233 · preguntas frecuentes y ejemplos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-233-decla_____erias-centros-educacion-autorizados_/preguntas-frecuentes-ejemplos.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9407f09567331da3026ee07c44c1ecdef29c524d4de75e793bc455821af00c6d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_PRESENTATION_HELP_SOURCE = {
  id: "aeat.model-233.presentation-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 233 · ayuda técnica del formulario y del fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-233-Presentacion.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "72168d05baf94fe04cbcbc1ea9274f9cac5a78368de2035c0cc4c263f318c5b6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_DOCUMENTATION_SOURCE = {
  id: "aeat.model-233.documentation.2026-07-08",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 233 · documentación para la presentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/declaraciones-informativas/modelo-233-decla_____erias-centros-educacion-autorizados_/documentacion-presentacion-modelo-233.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "44e2cf8ca1c1fa6a9e2d5620c2968d6991c3e6b772f36fb05a84d2ac26acfb1a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_233_GUIDE_SOURCE = {
  id: "aeat.model-233.guide-pdf.exercise-2025",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 233 · documentación desde el ejercicio 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI45/Ayuda/Ayuda_guarderias2025.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7027fe95ee2ca614d464447bb150c2feb86ed3c369a47fd824d8149af74e381d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1400_2018_SOURCE = {
  id: "boe.model-233.order-hac-1400-2018",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1400/2018, de 21 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2018-17772",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7013bd6888fb15bd98cd74296fbffbd540a91e6dcf6056919745fbd442da2f0d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1154_2020_SOURCE = {
  id: "boe.model-233.order-hac-1154-2020",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1154/2020, de 27 de octubre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2020-15598",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "64673cfe8b6839cd7e50804480e66b29fd42367a003b47fda4df452b9514f94d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2194_2013_SOURCE = {
  id: "boe.electronic-filing.order-hap-2194-2013",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2194/2013, de 22 de noviembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-12385",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a8a9261e33a2d29ea900a9ff27d9834744150c9216a1847a8f58453b85a3bd0e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_682_2025_SOURCE = {
  id: "boe.model-233.order-hac-682-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/682/2025, de 27 de junio",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-13411",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4b098ff47c83783a63c876fcf2e77d9727a9aec0d9f405a55d87e9c75b4b9e94",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_231_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_RELEASE_ID_V1,
  code: "231",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Declaración de información país por país (CBC/DAC4).",
  summary:
    "Declaración informativa que la AEAT identifica como información país por país (CBC/DAC4), con datos agregados por país o jurisdicción y canales oficiales mediante servicio web y formulario de ayuda.",
  searchTerms: [
    "modelo 231",
    "declaración información país por país",
    "country by country reporting",
    "CBC",
    "DAC4",
    "grupos multinacionales",
    "jurisdicciones fiscales",
    "servicio web modelo 231",
    "XML modelo 231",
    "formulario modelo 231",
    "comunicación previa modelo 231",
    "manual modelo 231 versión 2.1",
    "Orden HFP 1978 2016",
    "Orden HAC 941 2018",
    "Orden HAC 1285 2020",
  ],
  sections: [
    {
      id: "model-231-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-231-purpose-identity",
          heading: "Información país por país (CBC/DAC4)",
          text: "El índice y la página del procedimiento denominan al Modelo 231 declaración informativa de información país por país y conservan las siglas CBC/DAC4 como parte de su identidad oficial.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_231_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-231-purpose-record",
          heading: "Información agregada por país o jurisdicción",
          text: "La ficha administrativa describe como objeto del procedimiento aportar información agregada por cada país o jurisdicción respecto del período impositivo de la entidad dominante. Esta ficha no evalúa si ese marco corresponde a un caso concreto.",
          sourceIds: [MODEL_231_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-231-access",
      title: "Canales electrónicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-231-access-web-service",
          heading: "Servicio web como vía principal",
          text: "La portada oficial identifica el servicio web como vía principal y su ayuda técnica publica los esquemas y la documentación asociada a ese canal.",
          sourceIds: [
            MODEL_231_PROCEDURE_HOME_SOURCE.id,
            MODEL_231_WEB_SERVICE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-231-access-form",
          heading: "Formulario web como vía alternativa",
          text: "La misma portada ofrece un formulario web alternativo. La página de ayuda enlaza el manual versión 2.1 y plantillas auxiliares para la incorporación de información al formulario.",
          sourceIds: [
            MODEL_231_PROCEDURE_HOME_SOURCE.id,
            MODEL_231_FORM_HELP_SOURCE.id,
            MODEL_231_FORM_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-231-details",
      title: "Ayuda y trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-231-details-basic-questions",
          heading: "Cuestiones básicas publicadas por la AEAT",
          text: "La AEAT mantiene una colección específica de cuestiones básicas sobre la presentación y la cumplimentación del informe país por país, incluida la relación entre la comunicación previa y la declaración.",
          sourceIds: [MODEL_231_BASIC_QUESTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-231-details-orders",
          heading: "Aprobación y actualización del modelo",
          text: "La Orden HFP/1978/2016 aprobó el Modelo 231. La Orden HAC/941/2018 modificó esa orden y la Orden HAC/1285/2020 sustituyó su anexo para recoger cambios en el esquema de intercambio del informe país por país.",
          sourceIds: [
            ORDER_HFP_1978_2016_SOURCE.id,
            ORDER_HAC_941_2018_SOURCE.id,
            ORDER_HAC_1285_2020_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_231_PROCEDURE_HOME_SOURCE,
    MODEL_231_PROCEDURE_RECORD_SOURCE,
    MODEL_231_BASIC_QUESTIONS_SOURCE,
    MODEL_231_WEB_SERVICE_SOURCE,
    MODEL_231_FORM_HELP_SOURCE,
    MODEL_231_FORM_MANUAL_SOURCE,
    ORDER_HFP_1978_2016_SOURCE,
    ORDER_HAC_941_2018_SOURCE,
    ORDER_HAC_1285_2020_SOURCE,
  ],
  documents: [
    {
      id: "model-231-form-manual-document",
      kind: "GUIDE",
      title: "Manual del formulario del Modelo 231 · versión 2.1",
      sourceId: MODEL_231_FORM_MANUAL_SOURCE.id,
      landingPageSourceId: MODEL_231_FORM_HELP_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "M231_Formulario_ayuda_2.1.pdf",
      byteLength: 1674552,
      pageCount: 40,
      sha256:
        "c260aa220dab8c80bb2184026d4cb02976a8aad005d67d72261772cefef8e650",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-231-link-procedure",
      label: "Página oficial del Modelo 231",
      sourceId: MODEL_231_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_231_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-basic-questions",
      label: "Cuestiones básicas oficiales del Modelo 231",
      sourceId: MODEL_231_BASIC_QUESTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-web-service-help",
      label: "Información técnica del servicio web",
      sourceId: MODEL_231_WEB_SERVICE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-form-help",
      label: "Información técnica del formulario de ayuda",
      sourceId: MODEL_231_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-form-manual",
      label: "Manual oficial del formulario · versión 2.1",
      sourceId: MODEL_231_FORM_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-approval-order",
      label: "Orden HFP/1978/2016",
      sourceId: ORDER_HFP_1978_2016_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-update-order",
      label: "Orden HAC/941/2018",
      sourceId: ORDER_HAC_941_2018_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-link-latest-update-order",
      label: "Orden HAC/1285/2020",
      sourceId: ORDER_HAC_1285_2020_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-231-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 231?",
      answer:
        "Lo identifica como la declaración informativa de información país por país, también denominada CBC/DAC4.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_231_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-object",
      question: "¿Cómo resume la ficha administrativa su objeto?",
      answer:
        "Lo describe como información agregada por cada país o jurisdicción respecto del período impositivo de la entidad dominante.",
      sourceIds: [MODEL_231_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-channels",
      question: "¿Qué canales electrónicos describe la portada oficial?",
      answer:
        "Describe el servicio web como vía principal y un formulario web como alternativa de ayuda.",
      sourceIds: [MODEL_231_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-web-service-material",
      question: "¿Qué material técnico publica la AEAT para el servicio web?",
      answer:
        "Publica una página específica para los esquemas XSD, el WSDL y el manual técnico del servicio.",
      sourceIds: [MODEL_231_WEB_SERVICE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-form-version",
      question: "¿Qué versión del manual del formulario está enlazada?",
      answer:
        "La página de ayuda enlaza el manual para formulario versión 2.1, un PDF oficial de cuarenta páginas.",
      sourceIds: [
        MODEL_231_FORM_HELP_SOURCE.id,
        MODEL_231_FORM_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-shared-service",
      question: "¿El formulario y el cliente usan un servicio distinto?",
      answer:
        "El manual explica que el formulario de ayuda y el cliente invocan el mismo servicio web servidor de la AEAT y comparten sus validaciones.",
      sourceIds: [MODEL_231_FORM_MANUAL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-prior-communication",
      question: "¿Qué relación documental existe con la comunicación previa?",
      answer:
        "Las cuestiones básicas y el manual describen una comunicación previa asociada a la declaración; esta ficha solo registra esa relación documental.",
      sourceIds: [
        MODEL_231_BASIC_QUESTIONS_SOURCE.id,
        MODEL_231_FORM_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-normative",
      question: "¿Qué normas documentan la aprobación y la actualización?",
      answer:
        "La Orden HFP/1978/2016 aprobó el modelo, la Orden HAC/941/2018 lo modificó y la Orden HAC/1285/2020 sustituyó su anexo.",
      sourceIds: [
        ORDER_HFP_1978_2016_SOURCE.id,
        ORDER_HAC_941_2018_SOURCE.id,
        ORDER_HAC_1285_2020_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-231-faq-applicability",
      question: "¿Esta ficha determina a quién corresponde el Modelo 231?",
      answer:
        "No. Reproduce identidad, objeto, canales y fuentes oficiales, pero no evalúa la aplicabilidad a una entidad o grupo concreto.",
      sourceIds: [
        MODEL_231_PROCEDURE_RECORD_SOURCE.id,
        MODEL_231_BASIC_QUESTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE", "BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_231_PROCEDURE_HOME_SOURCE.id,
      MODEL_231_WEB_SERVICE_SOURCE.id,
      MODEL_231_FORM_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"231">;

const MODEL_232_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_RELEASE_ID_V1,
  code: "232",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa de operaciones vinculadas y de operaciones y situaciones relacionadas con países o territorios calificados como paraísos fiscales.",
  summary:
    "Declaración informativa que la AEAT relaciona con operaciones vinculadas y con operaciones o situaciones en los territorios descritos en su denominación oficial, disponible exclusivamente en formato electrónico.",
  searchTerms: [
    "modelo 232",
    "declaración informativa operaciones vinculadas",
    "personas o entidades vinculadas",
    "operaciones y situaciones",
    "países o territorios calificados como paraísos fiscales",
    "activos intangibles",
    "formulario electrónico modelo 232",
    "importar fichero modelo 232",
    "diseño de registro modelo 232",
    "instrucciones modelo 232",
    "declaración complementaria",
    "declaración sustitutiva",
    "Orden HFP 816 2017",
    "autónomo societario",
    "operaciones socio sociedad",
    "valor de mercado",
    "documentación operaciones vinculadas",
    "límite 250000",
    "límite 100000",
    "regla 50 por ciento",
    "préstamo socio sociedad",
    "alquiler socio sociedad",
    "plazo modelo 232",
  ],
  sections: [
    {
      id: "model-232-purpose",
      title: "Identidad y alcance documental",
      kind: "PURPOSE",
      items: [
        {
          id: "model-232-purpose-identity",
          heading: "Operaciones vinculadas y situaciones internacionales",
          text: "El índice, la portada y la ficha administrativa identifican el Modelo 232 como declaración informativa sobre operaciones con personas o entidades vinculadas y sobre las operaciones o situaciones internacionales recogidas en su denominación oficial.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_232_PROCEDURE_HOME_SOURCE.id,
            MODEL_232_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-232-purpose-groups",
          heading: "Tres bloques informativos descritos",
          text: "Las instrucciones distinguen información sobre operaciones vinculadas, sobre determinadas rentas procedentes de activos intangibles y sobre operaciones o situaciones vinculadas a los territorios citados en el título oficial. Esta descripción no decide qué bloque corresponde a un caso concreto.",
          sourceIds: [MODEL_232_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-232-access",
      title: "Formato y ayuda electrónica",
      kind: "ACCESS",
      items: [
        {
          id: "model-232-access-electronic",
          heading: "Formato exclusivamente electrónico",
          text: "La Orden HFP/816/2017 establece que el modelo está disponible exclusivamente en formato electrónico y la ficha administrativa sitúa el procedimiento en la Sede de la Agencia Tributaria.",
          sourceIds: [
            ORDER_HFP_816_2017_SOURCE.id,
            MODEL_232_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-232-access-form-file",
          heading: "Formulario web e importación de fichero",
          text: "La ayuda técnica documenta un formulario en navegador y la importación de un fichero generado previamente o por un programa externo conforme al diseño de registro publicado.",
          sourceIds: [
            MODEL_232_HELP_SOURCE.id,
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-232-details",
      title: "Documentación y norma de aprobación",
      kind: "DETAILS",
      items: [
        {
          id: "model-232-details-instructions",
          heading: "Instrucciones oficiales enlazadas",
          text: "La portada del modelo enlaza un PDF de instrucciones de cumplimentación de diez páginas. Es documentación de ayuda y no un formulario PDF en blanco.",
          sourceIds: [
            MODEL_232_PROCEDURE_HOME_SOURCE.id,
            MODEL_232_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-232-details-order",
          heading: "Orden HFP/816/2017",
          text: "La Orden HFP/816/2017 aprobó el Modelo 232 y constituye la referencia normativa básica enlazada tanto por la portada como por la ficha administrativa.",
          sourceIds: [
            MODEL_232_PROCEDURE_HOME_SOURCE.id,
            MODEL_232_PROCEDURE_RECORD_SOURCE.id,
            ORDER_HFP_816_2017_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_232_PROCEDURE_HOME_SOURCE,
    MODEL_232_PROCEDURE_RECORD_SOURCE,
    MODEL_232_HELP_SOURCE,
    MODEL_232_INSTRUCTIONS_SOURCE,
    MODELS_200_299_REGISTER_DESIGNS_SOURCE,
    ORDER_HFP_816_2017_SOURCE,
  ],
  documents: [
    {
      id: "model-232-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones de cumplimentación del Modelo 232",
      sourceId: MODEL_232_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_232_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Instrucciones_Modelo_232.pdf",
      byteLength: 376447,
      pageCount: 10,
      sha256:
        "44a7606d2e5be723416c441ca8824e31fbfdf35af3554dceef2da4185e1a2a0c",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-232-link-procedure",
      label: "Página oficial del Modelo 232",
      sourceId: MODEL_232_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_232_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-link-help",
      label: "Ayuda técnica oficial del Modelo 232",
      sourceId: MODEL_232_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-link-instructions",
      label: "Instrucciones oficiales del Modelo 232",
      sourceId: MODEL_232_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-link-register-designs",
      label: "Diseños de registro de los Modelos 200 al 299",
      sourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-link-order",
      label: "Orden HFP/816/2017",
      sourceId: ORDER_HFP_816_2017_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-232-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 232?",
      answer:
        "Lo identifica como la declaración informativa de operaciones vinculadas y de operaciones o situaciones relacionadas con los territorios descritos en su denominación oficial.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_232_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Recoge la información sobre operaciones con personas o entidades vinculadas y la información relativa a las operaciones y situaciones internacionales citadas en el título del modelo.",
      sourceIds: [MODEL_232_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-groups",
      question: "¿Qué grandes bloques distingue la documentación?",
      answer:
        "Distingue operaciones vinculadas, determinadas rentas asociadas a activos intangibles y operaciones o situaciones vinculadas a los territorios indicados en la denominación oficial.",
      sourceIds: [MODEL_232_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-format",
      question: "¿Existe un impreso oficial en PDF para este modelo?",
      answer:
        "La norma de aprobación indica que el Modelo 232 está disponible exclusivamente en formato electrónico; el PDF enlazado por la AEAT contiene instrucciones, no un impreso en blanco.",
      sourceIds: [
        ORDER_HFP_816_2017_SOURCE.id,
        MODEL_232_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-channels",
      question: "¿Qué métodos de confección describe la ayuda técnica?",
      answer:
        "Describe la cumplimentación en un formulario web y la importación de un fichero ajustado al diseño de registro publicado.",
      sourceIds: [
        MODEL_232_HELP_SOURCE.id,
        MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-draft",
      question: "¿Qué explica la ayuda sobre la vista previa?",
      answer:
        "Explica que la vista previa genera un PDF de borrador para revisar la información y señala expresamente que ese borrador no es válido para la presentación.",
      sourceIds: [MODEL_232_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-document",
      question: "¿Qué documento descargable registra esta ficha?",
      answer:
        "Registra el PDF oficial de instrucciones de cumplimentación, de diez páginas y sin formulario AcroForm.",
      sourceIds: [MODEL_232_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-order",
      question: "¿Qué norma aprobó el Modelo 232?",
      answer: "La Orden HFP/816/2017, de 28 de agosto.",
      sourceIds: [ORDER_HFP_816_2017_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-232-faq-applicability",
      question: "¿Esta ficha decide si debe utilizarse el Modelo 232?",
      answer:
        "No. Resume fuentes y documentación oficiales sin evaluar importes, operaciones ni circunstancias de una persona o entidad concreta.",
      sourceIds: [
        MODEL_232_PROCEDURE_RECORD_SOURCE.id,
        MODEL_232_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_232_PROCEDURE_RECORD_SOURCE.id,
      MODEL_232_HELP_SOURCE.id,
      MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"232">;

const MODEL_233_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_RELEASE_ID_V1,
  code: "233",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa por gastos en guarderías o centros de educación infantil autorizados",
  summary:
    "Declaración informativa que la AEAT vincula a gastos en guarderías o centros de educación infantil autorizados, con ayuda específica, preguntas frecuentes y documentación actualizada para el ejercicio 2025 y siguientes.",
  searchTerms: [
    "modelo 233",
    "declaración informativa guarderías",
    "centros de educación infantil autorizados",
    "gastos de guardería",
    "gastos de custodia",
    "deducción por maternidad",
    "autorización educativa",
    "tipo de autorización guardería",
    "formulario modelo 233",
    "fichero CSV modelo 233",
    "preguntas frecuentes modelo 233",
    "ejercicio 2025 y siguientes",
    "Orden HAC 1400 2018",
    "Orden HAC 1154 2020",
    "Orden HAC 682 2025",
    "Orden HAP 2194 2013",
  ],
  sections: [
    {
      id: "model-233-purpose",
      title: "Identidad y ámbito informativo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-233-purpose-identity",
          heading: "Gastos en guarderías o centros autorizados",
          text: "El índice, la portada y la ficha administrativa identifican el Modelo 233 como declaración informativa por gastos en guarderías o centros de educación infantil autorizados.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_233_PROCEDURE_HOME_SOURCE.id,
            MODEL_233_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-233-purpose-not-parents",
          heading: "Advertencia expresa sobre padres y tutores",
          text: "La portada oficial advierte expresamente que esta declaración informativa no es un formulario destinado a padres o tutores. La ficha conserva esa aclaración sin decidir quién debe declarar en una situación concreta.",
          sourceIds: [MODEL_233_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-233-current-update",
      title: "Actualización aplicable desde el ejercicio 2025",
      kind: "DETAILS",
      items: [
        {
          id: "model-233-current-update-authorization",
          heading: "Tipo de autorización del centro",
          text: "La nota oficial y la Orden HAC/682/2025 documentan la incorporación de un dato que distingue entre autorización expedida por la administración educativa y otro tipo de autorización necesaria para la apertura y funcionamiento de la actividad de custodia.",
          sourceIds: [
            MODEL_233_INFORMATION_NOTE_SOURCE.id,
            ORDER_HAC_682_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-233-current-update-first-use",
          heading: "Primera aplicación documentada",
          text: "La nota de la AEAT indica que la actualización se aplica por primera vez a la información correspondiente al ejercicio 2025. La documentación técnica separa ese bloque de los ejercicios anteriores.",
          sourceIds: [
            MODEL_233_INFORMATION_NOTE_SOURCE.id,
            MODEL_233_DOCUMENTATION_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-233-access",
      title: "Formulario, fichero y material de ayuda",
      kind: "ACCESS",
      items: [
        {
          id: "model-233-access-form-file",
          heading: "Formulario web e importación CSV",
          text: "La ayuda técnica describe la incorporación de información mediante el formulario web o mediante un fichero CSV ajustado al diseño publicado para el modelo.",
          sourceIds: [
            MODEL_233_PRESENTATION_HELP_SOURCE.id,
            MODEL_233_GUIDE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-233-access-help",
          heading: "Manual y preguntas frecuentes separados",
          text: "La AEAT publica por separado un manual de cuarenta y tres páginas para el ejercicio 2025 y siguientes y una sección de preguntas frecuentes con ejemplos sobre el contenido del modelo.",
          sourceIds: [
            MODEL_233_DOCUMENTATION_SOURCE.id,
            MODEL_233_GUIDE_SOURCE.id,
            MODEL_233_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-233-normative",
      title: "Trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-233-normative-approval",
          heading: "Aprobación en 2018",
          text: "La Orden HAC/1400/2018 aprobó el Modelo 233 con la denominación que conserva el índice oficial.",
          sourceIds: [ORDER_HAC_1400_2018_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-233-normative-update",
          heading: "Modificaciones posteriores",
          text: "La Orden HAC/1154/2020 figura como una modificación anterior. La Orden HAC/682/2025 volvió a modificar el modelo para reflejar los dos tipos de autorización descritos por la nota informativa de la AEAT. La portada enlaza además la Orden HAP/2194/2013 como marco general de presentación electrónica.",
          sourceIds: [
            ORDER_HAC_1154_2020_SOURCE.id,
            ORDER_HAC_682_2025_SOURCE.id,
            ORDER_HAP_2194_2013_SOURCE.id,
            MODEL_233_INFORMATION_NOTE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_233_PROCEDURE_HOME_SOURCE,
    MODEL_233_PROCEDURE_RECORD_SOURCE,
    MODEL_233_INFORMATION_NOTE_SOURCE,
    MODEL_233_FAQ_SOURCE,
    MODEL_233_PRESENTATION_HELP_SOURCE,
    MODEL_233_DOCUMENTATION_SOURCE,
    MODEL_233_GUIDE_SOURCE,
    ORDER_HAC_1400_2018_SOURCE,
    ORDER_HAC_1154_2020_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
    ORDER_HAC_682_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-233-guide-document",
      kind: "GUIDE",
      title: "Documentación del Modelo 233 · ejercicio 2025 y siguientes",
      sourceId: MODEL_233_GUIDE_SOURCE.id,
      landingPageSourceId: MODEL_233_DOCUMENTATION_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Ayuda_guarderias2025.pdf",
      byteLength: 5346103,
      pageCount: 43,
      sha256:
        "7027fe95ee2ca614d464447bb150c2feb86ed3c369a47fd824d8149af74e381d",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-233-link-procedure",
      label: "Página oficial del Modelo 233",
      sourceId: MODEL_233_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_233_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-note",
      label: "Nota informativa oficial",
      sourceId: MODEL_233_INFORMATION_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-faq",
      label: "Preguntas frecuentes y ejemplos oficiales",
      sourceId: MODEL_233_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-help",
      label: "Ayuda técnica del Modelo 233",
      sourceId: MODEL_233_PRESENTATION_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-documentation",
      label: "Documentación oficial del ejercicio 2025 y siguientes",
      sourceId: MODEL_233_DOCUMENTATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-guide",
      label: "Manual oficial del Modelo 233",
      sourceId: MODEL_233_GUIDE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-approval-order",
      label: "Orden HAC/1400/2018",
      sourceId: ORDER_HAC_1400_2018_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-update-order",
      label: "Orden HAC/1154/2020",
      sourceId: ORDER_HAC_1154_2020_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-latest-update-order",
      label: "Orden HAC/682/2025",
      sourceId: ORDER_HAC_682_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-link-electronic-filing-order",
      label: "Orden HAP/2194/2013",
      sourceId: ORDER_HAP_2194_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-233-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 233?",
      answer:
        "Lo identifica como la declaración informativa por gastos en guarderías o centros de educación infantil autorizados.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_233_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-parents",
      question: "¿Es un formulario destinado a padres o tutores?",
      answer:
        "No. La portada oficial incorpora una advertencia expresa de que el Modelo 233 no debe ser presentado por padres o tutores.",
      sourceIds: [MODEL_233_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-authorized-centers",
      question:
        "¿Cómo diferencia la AEAT los centros y guarderías autorizados?",
      answer:
        "La información oficial distingue los centros autorizados por la administración educativa y las guarderías que cuentan con la autorización necesaria para abrir y desarrollar la actividad de custodia.",
      sourceIds: [
        MODEL_233_FAQ_SOURCE.id,
        MODEL_233_INFORMATION_NOTE_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-current-change",
      question: "¿Qué cambio documenta la AEAT para el ejercicio 2025?",
      answer:
        "Documenta la incorporación del tipo de autorización del declarante y separa la autorización educativa de otro tipo de autorización necesaria para la actividad de custodia.",
      sourceIds: [
        MODEL_233_INFORMATION_NOTE_SOURCE.id,
        ORDER_HAC_682_2025_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-information-groups",
      question:
        "¿Qué clases de información resume la sección de preguntas frecuentes?",
      answer:
        "Resume datos de identificación, estancia del menor, gastos de custodia, subvenciones y autorización del centro, sin que esta ficha reproduzca casillas ni decida su cumplimentación.",
      sourceIds: [MODEL_233_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-channels",
      question:
        "¿Qué métodos de incorporación de información describe la ayuda?",
      answer:
        "Describe la incorporación mediante el formulario web y la importación de un fichero CSV conforme al diseño del modelo.",
      sourceIds: [
        MODEL_233_PRESENTATION_HELP_SOURCE.id,
        MODEL_233_GUIDE_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-guide",
      question: "¿Qué documentación descargable publica la AEAT?",
      answer:
        "Publica un manual oficial de cuarenta y tres páginas para el ejercicio 2025 y siguientes y una plantilla auxiliar enlazada desde la misma página de documentación.",
      sourceIds: [MODEL_233_DOCUMENTATION_SOURCE.id, MODEL_233_GUIDE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-examples",
      question: "¿La AEAT publica preguntas frecuentes y ejemplos?",
      answer:
        "Sí. Mantiene una sección oficial de preguntas frecuentes y otra de ejemplos dentro del mismo bloque informativo del Modelo 233.",
      sourceIds: [MODEL_233_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-orders",
      question: "¿Qué normas trazan la aprobación y el cambio actual?",
      answer:
        "La Orden HAC/1400/2018 aprobó el modelo, la Orden HAC/1154/2020 lo modificó y la Orden HAC/682/2025 introdujo la actualización sobre el tipo de autorización. La portada también enlaza la Orden HAP/2194/2013 como norma general de presentación electrónica.",
      sourceIds: [
        ORDER_HAC_1400_2018_SOURCE.id,
        ORDER_HAC_1154_2020_SOURCE.id,
        ORDER_HAC_682_2025_SOURCE.id,
        ORDER_HAP_2194_2013_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-233-faq-applicability",
      question:
        "¿Esta ficha determina si el Modelo 233 corresponde a un centro concreto?",
      answer:
        "No. Expone la información oficial y sus fuentes, pero no evalúa autorizaciones ni circunstancias de un centro concreto.",
      sourceIds: [
        MODEL_233_PROCEDURE_RECORD_SOURCE.id,
        MODEL_233_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_233_PROCEDURE_RECORD_SOURCE.id,
      MODEL_233_PRESENTATION_HELP_SOURCE.id,
      MODEL_233_GUIDE_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"233">;

export const PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_CONTENT_V1 =
  deepFreeze([
    MODEL_231_CONTENT,
    MODEL_232_CONTENT,
    MODEL_233_CONTENT,
  ] as const);
