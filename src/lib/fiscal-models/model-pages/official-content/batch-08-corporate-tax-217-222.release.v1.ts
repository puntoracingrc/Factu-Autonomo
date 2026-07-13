import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_RELEASE_ID_V1 =
  "public-aeat-official-batch-08-corporate-tax-217-222.2026-07-13.v1" as const;

export type PublicAeatBatch08CorporateTax217222CodeV1 =
  "217" | "220" | "221" | "222";

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

const CORPORATE_TAX_LAW_SOURCE = {
  id: "boe.corporate-tax.law-27-2014",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 27/2014, de 27 de noviembre, del Impuesto sobre Sociedades",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-12328",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c5b17bd2b1ab498a71c87d91a44b119128ce9f542d3645b271e60c8a03644e5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2194_2013_SOURCE = {
  id: "boe.electronic-tax-filing.order-hap-2194-2013",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2194/2013, de 22 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-12385",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "705a68e20432e9f2658e3e9852c4007f3449c249afe482c82e9fdc14c0b64f65",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_217_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-217.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 217 · Gravamen especial SOCIMI",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE06.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1b368d5c34e248520642df7e9dd47890eecba6a09db2686078f83079aa06eeda",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_217_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-217.procedure-record.2026-06-10",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 217",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE06.shtml",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8977cb9f0526919d8b2941f6f18b29090c513eccc2778e69b51dec7141c2937d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_217_MANAGEMENT_SOURCE = {
  id: "aeat.model-217.management.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Gestiones sociedades · Modelo 217",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/modelo-217.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a5436328567e96e43038e5249637c5f325bb6643b6cfc62aa43ce9745d272b36",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_217_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-217.instructions.2026-06-10",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Instrucciones del Modelo 217",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-sociedades/modelo-217-gravamen-especial-socimi/instrucciones.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "64da4dab91a77672b9e38829f9d6441370f21603b0b8fd6afe1ecd61db29ce46",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SOCIMI_LAW_SOURCE = {
  id: "boe.socimi.law-11-2009",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 11/2009, de 26 de octubre, por la que se regulan las SOCIMI",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-17000",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c5c5c29c22faf40207bf2e661c9a034d98e87c450adabdd8dfc5ffb11e56ef0a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_1922_2016_SOURCE = {
  id: "boe.model-217.order-hfp-1922-2016",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1922/2016, de 19 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2016-12113",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "96c807de34f159aa30dbe2cd5cf629c59b9f31781f9942b0fa8a52d0fcbafa56",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_217_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_RELEASE_ID_V1,
  code: "217",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Gravamen especial SOCIMI",
  summary:
    "Autoliquidación que la AEAT identifica con el gravamen especial sobre dividendos o participaciones en beneficios distribuidos por sociedades anónimas cotizadas de inversión en el mercado inmobiliario.",
  searchTerms: [
    "modelo 217",
    "gravamen especial SOCIMI",
    "sociedades anónimas cotizadas de inversión inmobiliaria",
    "dividendos SOCIMI",
    "participaciones en beneficios",
    "autoliquidación impuesto sobre sociedades",
    "formulario web modelo 217",
    "diseño de registro 217",
    "instrucciones modelo 217",
    "Ley 11 2009 SOCIMI",
    "Orden HFP 1922 2016",
  ],
  sections: [
    {
      id: "model-217-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-217-purpose-identity",
          heading: "Gravamen especial SOCIMI",
          text: "El índice de modelos y la portada del procedimiento identifican el Modelo 217 como Gravamen especial SOCIMI.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_217_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-217-purpose-record",
          heading: "Dividendos o participaciones en beneficios",
          text: "La ficha administrativa describe como objeto el gravamen especial sobre dividendos o participaciones en beneficios distribuidos por las sociedades anónimas cotizadas de inversión en el mercado inmobiliario.",
          sourceIds: [MODEL_217_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-217-access",
      title: "Canal y materiales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-217-access-browser",
          heading: "Gestión telemática",
          text: "La ficha del procedimiento registra un canal telemático con tramitación electrónica, y la página de gestiones separa los accesos de presentación, consulta y aportación documental.",
          sourceIds: [
            MODEL_217_PROCEDURE_RECORD_SOURCE.id,
            MODEL_217_MANAGEMENT_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-217-access-register-design",
          heading: "Diseño de registro publicado",
          text: "El catálogo técnico de la AEAT incluye un diseño de registro del Modelo 217 rotulado para ejercicios 2013 y siguientes y actualizado el 17 de septiembre de 2025.",
          sourceIds: [MODELS_200_299_REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-217-details",
      title: "Instrucciones y normativa registrada",
      kind: "DETAILS",
      items: [
        {
          id: "model-217-details-instructions",
          heading: "Instrucciones estructuradas por apartados",
          text: "La AEAT publica instrucciones propias que organizan la información del modelo en identificación, devengo, relación de perceptores, liquidación y declaración complementaria.",
          sourceIds: [MODEL_217_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-217-details-order",
          heading: "Orden de aprobación del modelo",
          text: "La Orden HFP/1922/2016 aprueba expresamente el Modelo 217 y su presentación electrónica. La ficha del procedimiento registra también la Ley 11/2009 como marco de las SOCIMI.",
          sourceIds: [SOCIMI_LAW_SOURCE.id, ORDER_HFP_1922_2016_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_217_PROCEDURE_HOME_SOURCE,
    MODEL_217_PROCEDURE_RECORD_SOURCE,
    MODEL_217_MANAGEMENT_SOURCE,
    MODEL_217_INSTRUCTIONS_SOURCE,
    MODELS_200_299_REGISTER_DESIGNS_SOURCE,
    SOCIMI_LAW_SOURCE,
    ORDER_HFP_1922_2016_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-217-link-procedure",
      label: "Página oficial del Modelo 217",
      sourceId: MODEL_217_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-link-record",
      label: "Ficha administrativa del procedimiento",
      sourceId: MODEL_217_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-link-instructions",
      label: "Instrucciones oficiales del Modelo 217",
      sourceId: MODEL_217_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-link-register-design",
      label: "Diseños de registro de los Modelos 200 al 299",
      sourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-link-law",
      label: "Ley 11/2009 de las SOCIMI",
      sourceId: SOCIMI_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-link-order",
      label: "Orden HFP/1922/2016",
      sourceId: ORDER_HFP_1922_2016_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-217-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 217?",
      answer:
        "Lo identifica como la autoliquidación denominada Gravamen especial SOCIMI.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_217_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-purpose",
      question: "¿Qué objeto describe su ficha administrativa?",
      answer:
        "Describe el gravamen especial sobre dividendos o participaciones en beneficios distribuidos por sociedades anónimas cotizadas de inversión en el mercado inmobiliario.",
      sourceIds: [MODEL_217_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-applicant",
      question: "¿Qué tipo de solicitante registra el procedimiento?",
      answer:
        "La ficha administrativa registra como solicitante a la empresa, sin que esta referencia determine la aplicación del modelo a un caso concreto.",
      sourceIds: [MODEL_217_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-channel",
      question: "¿Qué canal publica la AEAT para el Modelo 217?",
      answer:
        "La ficha administrativa lo sitúa en tramitación telemática y la página de gestiones muestra servicios electrónicos separados de presentación, consulta y aportación documental.",
      sourceIds: [
        MODEL_217_PROCEDURE_RECORD_SOURCE.id,
        MODEL_217_MANAGEMENT_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-register-design",
      question: "¿Publica la AEAT un diseño de registro del Modelo 217?",
      answer:
        "Sí. El catálogo oficial incluye un diseño rotulado para ejercicios 2013 y siguientes, actualizado el 17 de septiembre de 2025.",
      sourceIds: [MODELS_200_299_REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-instructions",
      question: "¿Qué materias organiza la página oficial de instrucciones?",
      answer:
        "Organiza la información en identificación, devengo, relación de perceptores, liquidación y declaración complementaria.",
      sourceIds: [MODEL_217_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-order",
      question: "¿Qué norma aprueba expresamente el Modelo 217?",
      answer:
        "La Orden HFP/1922/2016, de 19 de diciembre, aprueba expresamente este modelo.",
      sourceIds: [ORDER_HFP_1922_2016_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-217-faq-law",
      question: "¿Qué ley de las SOCIMI registra la ficha del procedimiento?",
      answer:
        "Registra la Ley 11/2009, de 26 de octubre, como parte de la normativa básica del procedimiento.",
      sourceIds: [MODEL_217_PROCEDURE_RECORD_SOURCE.id, SOCIMI_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_217_PROCEDURE_RECORD_SOURCE.id,
      MODEL_217_MANAGEMENT_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"217">;

const MODEL_220_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-220.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 220 · Régimen de consolidación fiscal",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE02.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "88fdd96b5f3d60ea00aa21f059aef97185180881f0a2099c0c284038c1705289",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-220.procedure-record.2026-06-23",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 220",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE02.shtml",
  officialUpdatedOn: "2026-06-23",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9f7ab7fac8c7b34c8931d6837661a83c663f7dfe33815c3a91f296861fe8665c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_MANAGEMENT_SOURCE = {
  id: "aeat.model-220.management.2026-07-01",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Gestiones sociedades · Modelo 220",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/modelo-220.html",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "80f84c66fe3f077ae6bbbc528e16521871b579f5d1380d394593ad0cacc9e744",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_DOWNLOAD_SOURCE = {
  id: "aeat.model-220.download.2026-04-20",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Descarga del documento de ingreso y devolución · Modelo 220",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-220-is-r_____idacion-fiscal-devolucion_/descarga-documento-ingreso-devolucion.html",
  officialUpdatedOn: "2026-04-20",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c667849ad80cd347aa3db66b839ab54f718f4c1db3d04aac9b590840078b47f8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_FORM_PDF_SOURCE = {
  id: "aeat.model-220.form-pdf.2026-06-22",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 220 · documento de ingreso o devolución · 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GE02/Modelo_220.pdf",
  officialUpdatedOn: "2026-06-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dcac1fb9520bf1c80048979bf9769d08ed4c7ee1799e319769720e4746831dae",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_INSTRUCTIONS_PDF_SOURCE = {
  id: "aeat.model-220.instructions-pdf.2026-06-23",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones de cumplimentación del Modelo 220 · ejercicio 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GE02/Instrucciones/INSTRUCCIONES_220_2025.pdf",
  officialUpdatedOn: "2026-06-23",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e7a32db6a65e1ec9fff23ff71869cb26eb2a0e02443ba003bb4d6928c02bb466",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_HELP_SOURCE = {
  id: "aeat.model-220.help.2026-06-30",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Ayuda técnica del Modelo 220",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/impuesto-sobre-sociedades-ayuda-tecnica/modelo-220.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bd483497c40092d82c6015226a98b74e67088c01e9c136fb5a1df8ffb407430a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_PREVIOUS_EXERCISES_SOURCE = {
  id: "aeat.model-220.previous-exercises.2026-06-23",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Información de ejercicios anteriores · Modelo 220",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-220-is-r_____idacion-fiscal-devolucion_/informacion-ejercicios-anteriores.html",
  officialUpdatedOn: "2026-06-23",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "921a4d101037f50440ea581fd1f2e5305ad94ae68a5382eef7e19ed224ea60d5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_529_2026_SOURCE = {
  id: "boe.models-200-220.order-hac-529-2026",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/529/2026, de 7 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-11583",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5ad148518d28ce5e478bbddd16c1dc7f16e5a9662999a6f9473f6a7aa145fa8b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_220_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_RELEASE_ID_V1,
  code: "220",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre Sociedades. Régimen de consolidación fiscal correspondiente a los grupos fiscales. Declaración. (Mod. 220). Documento de ingreso o devolución",
  summary:
    "Declaración del Impuesto sobre Sociedades que la AEAT relaciona con los grupos en régimen de consolidación fiscal y para la que publica un documento de ingreso o devolución, instrucciones y materiales técnicos del ejercicio 2025.",
  searchTerms: [
    "modelo 220",
    "impuesto sobre sociedades",
    "régimen de consolidación fiscal",
    "grupos fiscales",
    "declaración grupo fiscal",
    "documento de ingreso o devolución",
    "formulario modelo 220 2025",
    "instrucciones modelo 220 2025",
    "diseño de registro modelo 220",
    "ayuda técnica modelo 220",
    "Orden HAC 529 2026",
  ],
  sections: [
    {
      id: "model-220-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-220-purpose-identity",
          heading: "Declaración de consolidación fiscal",
          text: "El índice oficial identifica el Modelo 220 con la declaración del Impuesto sobre Sociedades correspondiente a grupos fiscales en régimen de consolidación fiscal y con su documento de ingreso o devolución.",
          sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-220-purpose-record",
          heading: "Grupos en régimen de consolidación fiscal",
          text: "La ficha administrativa describe como objeto la declaración-liquidación del Impuesto sobre Sociedades en relación con los grupos sometidos a ese régimen.",
          sourceIds: [MODEL_220_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-220-access",
      title: "Canal y documentos del ejercicio 2025",
      kind: "ACCESS",
      items: [
        {
          id: "model-220-access-browser",
          heading: "Programa con formulario electrónico",
          text: "La portada y la página de gestiones destacan un programa con formulario para la confección electrónica del Modelo 220 del ejercicio 2025. La ficha administrativa encuadra el procedimiento en tramitación telemática.",
          sourceIds: [
            MODEL_220_PROCEDURE_HOME_SOURCE.id,
            MODEL_220_PROCEDURE_RECORD_SOURCE.id,
            MODEL_220_MANAGEMENT_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-220-access-form",
          heading: "Documento oficial de una página",
          text: "La página de descarga enlaza un documento de ingreso o devolución del Modelo 220 rotulado para 2025. El PDF oficial tiene una página, no declara JavaScript ni campos AcroForm y se conserva como referencia documental externa.",
          sourceIds: [
            MODEL_220_DOWNLOAD_SOURCE.id,
            MODEL_220_FORM_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-220-details",
      title: "Ayuda, instrucciones y trazabilidad",
      kind: "DETAILS",
      items: [
        {
          id: "model-220-details-instructions",
          heading: "Instrucciones oficiales del ejercicio 2025",
          text: "La AEAT publica un documento independiente de instrucciones de cumplimentación del Modelo 220 para 2025. El archivo verificado tiene 241 páginas y no declara JavaScript ni campos AcroForm.",
          sourceIds: [
            MODEL_220_PROCEDURE_HOME_SOURCE.id,
            MODEL_220_INSTRUCTIONS_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-220-details-design",
          heading: "Diseño de registro e información anterior",
          text: "El catálogo técnico incluye un diseño de registro del Modelo 220 para 2025, actualizado el 17 de junio de 2026, y la AEAT mantiene aparte una página de información de ejercicios anteriores.",
          sourceIds: [
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
            MODEL_220_PREVIOUS_EXERCISES_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-220-details-order",
          heading: "Norma anual registrada",
          text: "La Orden HAC/529/2026 aprueba los modelos de declaración relativos a períodos impositivos iniciados durante 2025 e incluye el Modelo 220. La referencia temporal no determina por sí sola la vigencia general del código.",
          sourceIds: [ORDER_HAC_529_2026_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_220_PROCEDURE_HOME_SOURCE,
    MODEL_220_PROCEDURE_RECORD_SOURCE,
    MODEL_220_MANAGEMENT_SOURCE,
    MODEL_220_DOWNLOAD_SOURCE,
    MODEL_220_FORM_PDF_SOURCE,
    MODEL_220_INSTRUCTIONS_PDF_SOURCE,
    MODEL_220_HELP_SOURCE,
    MODEL_220_PREVIOUS_EXERCISES_SOURCE,
    MODELS_200_299_REGISTER_DESIGNS_SOURCE,
    CORPORATE_TAX_LAW_SOURCE,
    ORDER_HAC_529_2026_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-220-form-document",
      kind: "FORM",
      title: "Documento de ingreso o devolución del Modelo 220 · 2025",
      sourceId: MODEL_220_FORM_PDF_SOURCE.id,
      landingPageSourceId: MODEL_220_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Modelo_220.pdf",
      byteLength: 893099,
      pageCount: 1,
      sha256:
        "dcac1fb9520bf1c80048979bf9769d08ed4c7ee1799e319769720e4746831dae",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-220-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones de cumplimentación del Modelo 220 · 2025",
      sourceId: MODEL_220_INSTRUCTIONS_PDF_SOURCE.id,
      landingPageSourceId: MODEL_220_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "INSTRUCCIONES_220_2025.pdf",
      byteLength: 1560538,
      pageCount: 241,
      sha256:
        "e7a32db6a65e1ec9fff23ff71869cb26eb2a0e02443ba003bb4d6928c02bb466",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-220-form-thumbnail",
    sourceId: MODEL_220_FORM_PDF_SOURCE.id,
    publicHref:
      "/fiscal-models/modelo-220/formulario-modelo-220-2025-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "a848d1bc5aead20a6c3d3cfe2b25a836475aedd9bbaea03d570c393006471491",
    alt: "Vista previa del documento oficial del Modelo 220 para 2025",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-220-link-procedure",
      label: "Página oficial del Modelo 220",
      sourceId: MODEL_220_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-link-form",
      label: "Documento oficial del Modelo 220 · 2025",
      sourceId: MODEL_220_FORM_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-link-instructions",
      label: "Instrucciones oficiales del Modelo 220 · 2025",
      sourceId: MODEL_220_INSTRUCTIONS_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-link-help",
      label: "Ayuda técnica oficial del Modelo 220",
      sourceId: MODEL_220_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-link-register-design",
      label: "Diseños de registro de los Modelos 200 al 299",
      sourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-link-order",
      label: "Orden HAC/529/2026",
      sourceId: ORDER_HAC_529_2026_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-220-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 220?",
      answer:
        "Lo identifica con la declaración del Impuesto sobre Sociedades correspondiente a grupos fiscales en régimen de consolidación fiscal y con su documento de ingreso o devolución.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-purpose",
      question: "¿Qué objeto describe la ficha administrativa?",
      answer:
        "Describe la declaración-liquidación del Impuesto sobre Sociedades en relación con los grupos sometidos al régimen de consolidación fiscal.",
      sourceIds: [MODEL_220_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-channel",
      question: "¿Qué canal publica la AEAT para el ejercicio 2025?",
      answer:
        "La portada y la página de gestiones destacan un programa con formulario para la confección electrónica del Modelo 220 de 2025.",
      sourceIds: [
        MODEL_220_PROCEDURE_HOME_SOURCE.id,
        MODEL_220_MANAGEMENT_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-form",
      question: "¿Qué documento oficial descargable está registrado?",
      answer:
        "La AEAT enlaza un documento de ingreso o devolución del Modelo 220 para 2025, en un PDF de una página.",
      sourceIds: [MODEL_220_DOWNLOAD_SOURCE.id, MODEL_220_FORM_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-instructions",
      question: "¿Existen instrucciones oficiales separadas del formulario?",
      answer:
        "Sí. La AEAT publica un PDF independiente de instrucciones de cumplimentación para el ejercicio 2025, verificado con 241 páginas.",
      sourceIds: [
        MODEL_220_PROCEDURE_HOME_SOURCE.id,
        MODEL_220_INSTRUCTIONS_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-register-design",
      question: "¿Qué referencia temporal muestra el diseño de registro?",
      answer:
        "El catálogo técnico lo rotula para el ejercicio 2025 y señala una actualización de 17 de junio de 2026.",
      sourceIds: [MODELS_200_299_REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-previous",
      question:
        "¿Dónde conserva la AEAT la información de ejercicios anteriores?",
      answer:
        "La conserva en una página específica separada de los documentos rotulados para 2025.",
      sourceIds: [MODEL_220_PREVIOUS_EXERCISES_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-220-faq-order",
      question:
        "¿Qué norma anual registra la portada para los modelos de 2025?",
      answer:
        "Registra la Orden HAC/529/2026, que aprueba los modelos relativos a períodos impositivos iniciados durante 2025.",
      sourceIds: [
        MODEL_220_PROCEDURE_HOME_SOURCE.id,
        ORDER_HAC_529_2026_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_220_PROCEDURE_RECORD_SOURCE.id,
      MODEL_220_MANAGEMENT_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"220">;

const MODEL_221_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-221.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title:
    "Modelo 221 · prestación patrimonial por activos por impuesto diferido",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE07.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "02822d1334c97597003e7a2c2fb7a98a076ae1048b4762673ce34c470b279d86",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_221_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-221.procedure-record.2026-06-10",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 221",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE07.shtml",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e20580499818ae4d113eb7ec654add2dc615539b27520d71e408984061acdb7c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_221_MANAGEMENT_SOURCE = {
  id: "aeat.model-221.management.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Gestiones sociedades · Modelo 221",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/modelo-221.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1fe152c427842a26bf215616ea9fb5c3be99a928e8710386dbfc7626c044296e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_221_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-221.instructions.2026-06-10",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Instrucciones del Modelo 221",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-sociedades/modelo-221-prest_____to-exigible-frente-tributaria_/instrucciones.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c657042bda2babc796710c256c0a76aff09c1e36ae281d144cab7425aea9b442",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_221_HELP_SOURCE = {
  id: "aeat.model-221.help.2026-07-01",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title:
    "Autoliquidación de la prestación patrimonial por conversión de activos · Modelo 221",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/impuesto-sobre-sociedades-ayuda-tecnica/autoliquidacion-prestacion-patrimonial-conversion-activos.html",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b3f37d86e87e14ee3ab71744dff2c567a432b74b6d59f37637bf414669f1f496",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_550_2017_SOURCE = {
  id: "boe.model-221.order-hfp-550-2017",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/550/2017, de 15 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2017-6857",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2018c90ee521123cd01535e5793a827f7809051be17c497c4035c7e1150c1c4a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_221_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_RELEASE_ID_V1,
  code: "221",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Prestación patrimonial por conversión de activos por impuesto diferido en crédito exigible frente a la Administración tributaria.",
  summary:
    "Autoliquidación que la AEAT vincula con la prestación patrimonial por conversión de determinados activos por impuesto diferido en crédito exigible frente a la Administración tributaria.",
  searchTerms: [
    "modelo 221",
    "prestación patrimonial",
    "activos por impuesto diferido",
    "AID",
    "crédito exigible",
    "Administración tributaria",
    "impuesto sobre sociedades",
    "autoliquidación modelo 221",
    "formulario en línea modelo 221",
    "certificado electrónico",
    "Sociedades WEB modelo 200",
    "Orden HFP 550 2017",
  ],
  sections: [
    {
      id: "model-221-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-221-purpose-identity",
          heading: "Prestación patrimonial por activos por impuesto diferido",
          text: "El índice y la portada del procedimiento identifican el Modelo 221 con la prestación patrimonial por conversión de activos por impuesto diferido en crédito exigible frente a la Administración tributaria.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_221_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-221-purpose-record",
          heading: "Ámbito descrito en la ficha administrativa",
          text: "La ficha relaciona el procedimiento con contribuyentes del Impuesto sobre Sociedades que tienen registrados determinados activos por impuesto diferido y con el derecho regulado en el artículo 130 de la ley del impuesto. Esta descripción no evalúa un caso concreto.",
          sourceIds: [
            MODEL_221_PROCEDURE_RECORD_SOURCE.id,
            CORPORATE_TAX_LAW_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-221-access",
      title: "Canal electrónico descrito",
      kind: "ACCESS",
      items: [
        {
          id: "model-221-access-browser",
          heading: "Formulario en línea",
          text: "La ayuda técnica describe un formulario en línea y la ficha administrativa sitúa el procedimiento en un canal telemático con certificado electrónico.",
          sourceIds: [
            MODEL_221_PROCEDURE_RECORD_SOURCE.id,
            MODEL_221_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-221-access-management",
          heading: "Gestiones separadas",
          text: "La página de gestiones distingue la autoliquidación, la consulta de declaraciones y la gestión de domiciliaciones, sin ofrecer en esta ficha ningún acceso de presentación directa.",
          sourceIds: [MODEL_221_MANAGEMENT_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-221-details",
      title: "Ayuda, instrucciones y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-221-details-instructions",
          heading: "Instrucciones oficiales",
          text: "La AEAT organiza las instrucciones en identificación, devengo, liquidación, ingreso y declaración complementaria. La ficha conserva únicamente esa estructura general y no reproduce cálculos ni importes.",
          sourceIds: [MODEL_221_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-221-details-model-200",
          heading: "Referencia informativa al Modelo 200",
          text: "La ayuda técnica indica que el justificante del Modelo 221 se relaciona con un campo de documentación previa de Sociedades WEB del Modelo 200 cuando el resto de la declaración lo requiera.",
          sourceIds: [MODEL_221_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-221-details-order",
          heading: "Orden de aprobación del modelo",
          text: "La Orden HFP/550/2017 aprueba expresamente el Modelo 221. La ficha administrativa registra además la Ley 27/2014 como normativa básica del procedimiento.",
          sourceIds: [
            CORPORATE_TAX_LAW_SOURCE.id,
            ORDER_HFP_550_2017_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_221_PROCEDURE_HOME_SOURCE,
    MODEL_221_PROCEDURE_RECORD_SOURCE,
    MODEL_221_MANAGEMENT_SOURCE,
    MODEL_221_INSTRUCTIONS_SOURCE,
    MODEL_221_HELP_SOURCE,
    CORPORATE_TAX_LAW_SOURCE,
    ORDER_HFP_550_2017_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-221-link-procedure",
      label: "Página oficial del Modelo 221",
      sourceId: MODEL_221_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-link-record",
      label: "Ficha administrativa del procedimiento",
      sourceId: MODEL_221_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-link-instructions",
      label: "Instrucciones oficiales del Modelo 221",
      sourceId: MODEL_221_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-link-help",
      label: "Ayuda técnica oficial del Modelo 221",
      sourceId: MODEL_221_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-link-law",
      label: "Ley 27/2014 del Impuesto sobre Sociedades",
      sourceId: CORPORATE_TAX_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-link-order",
      label: "Orden HFP/550/2017",
      sourceId: ORDER_HFP_550_2017_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-221-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 221?",
      answer:
        "Lo identifica como la autoliquidación de la prestación patrimonial por conversión de activos por impuesto diferido en crédito exigible frente a la Administración tributaria.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_221_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-scope",
      question: "¿Qué ámbito general describe la ficha administrativa?",
      answer:
        "Lo relaciona con contribuyentes del Impuesto sobre Sociedades que tienen registrados determinados activos por impuesto diferido y con el derecho contemplado en el artículo 130 de la ley del impuesto.",
      sourceIds: [MODEL_221_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-channel",
      question: "¿Qué canal técnico publica la AEAT?",
      answer:
        "La ayuda describe un formulario en línea y la ficha administrativa registra tramitación telemática con certificado electrónico.",
      sourceIds: [
        MODEL_221_PROCEDURE_RECORD_SOURCE.id,
        MODEL_221_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-applicant",
      question: "¿Qué tipo de solicitante registra el procedimiento?",
      answer:
        "La ficha administrativa registra como solicitante a la empresa, sin que esa referencia determine por sí sola la aplicación del modelo.",
      sourceIds: [MODEL_221_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-group",
      question: "¿Contempla la ayuda técnica información de grupo fiscal?",
      answer:
        "Sí. La ayuda señala que el formulario incluye el número de grupo cuando proceda y las instrucciones identifican a la entidad representante en ese contexto.",
      sourceIds: [MODEL_221_HELP_SOURCE.id, MODEL_221_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-model-200",
      question:
        "¿Qué relación informativa menciona la ayuda con el Modelo 200?",
      answer:
        "Indica que el justificante del Modelo 221 se incorpora al campo de documentación previa de Sociedades WEB del Modelo 200 cuando el resto de la declaración lo requiera.",
      sourceIds: [MODEL_221_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-instructions",
      question: "¿Cómo organiza la AEAT las instrucciones del Modelo 221?",
      answer:
        "Las organiza en identificación, devengo, liquidación, ingreso y declaración complementaria.",
      sourceIds: [MODEL_221_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-221-faq-order",
      question: "¿Qué norma aprueba expresamente el Modelo 221?",
      answer:
        "La Orden HFP/550/2017, de 15 de junio, aprueba expresamente esta autoliquidación.",
      sourceIds: [ORDER_HFP_550_2017_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_221_PROCEDURE_RECORD_SOURCE.id, MODEL_221_HELP_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"221">;

const MODEL_222_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-222.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 222 · Régimen de consolidación fiscal · pago fraccionado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE03.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9bc162b3fea00ad25c91b3d644f1ce25a0b0f7ae8c3f91af53230fa391b5b4a6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-222.procedure-record.2026-06-10",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 222",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE03.shtml",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b665b45207066a8b4afd8e4c885ffa5cb64bd87789a669df8e7fbbda435ccb5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_MANAGEMENT_SOURCE = {
  id: "aeat.model-222.management.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Gestiones sociedades · Modelo 222",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/modelo-222.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ce3796317a3e4e93a53a9625e52eac4b3973bf1f04ca2498033bbeb9f8dcd77e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-222.instructions-2025-and-following.2026-06-10",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 222 · instrucciones para 2025 y siguientes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-222-is-regimen-consolidacion-fraccionado_/instrucciones.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b7658bd9079322b8642546ca095fe69cfb23270c83d6305278ef808d39198e01",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_HELP_SOURCE = {
  id: "aeat.model-222.presentation-help.2026-06-30",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 222 · presentación electrónica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-222/presentacion-electronica-modelo-222.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2254a1cfb04e91e9c5a4b3077485dfb976037116a33ce1c3c8130f5ab2f3759d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_ANNEX_VARIATION_HELP_SOURCE = {
  id: "aeat.model-222.annex-variation-help.2026-06-30",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Anexo 222 · comunicación de variación del grupo fiscal",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-222/comunicar-variacion-composicion-grupo-fiscal.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4e4604eec144f3407ac4957dca0ea44fb262a786d8378fada364d2adb7334fd7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_ANNEX_DATA_HELP_SOURCE = {
  id: "aeat.model-222.annex-data-help.2026-06-30",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Anexo 222 · comunicación de datos adicionales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-222/comunicar-datos-adicionales-declaracion.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dca198dfafce2f0957d0f9ecf3e9707bf101ae469ae70d647bb865794e6a98bd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_227_2017_SOURCE = {
  id: "boe.models-202-222.order-hfp-227-2017",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/227/2017, de 13 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2017-2778",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "159c38c22f1a5ec2647963203fb26a95bd5c9c98daec420571cf18fbd19cebc2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_222_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_RELEASE_ID_V1,
  code: "222",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IS. Régimen de Tributación de los Grupos de Sociedades. Pago fraccionado.",
  summary:
    "Modelo que la AEAT identifica como pago fraccionado del Impuesto sobre Sociedades en régimen de consolidación fiscal, con formulario electrónico, importación de fichero y anexos informativos propios.",
  searchTerms: [
    "modelo 222",
    "impuesto sobre sociedades",
    "régimen de consolidación fiscal",
    "grupos de sociedades",
    "grupos fiscales",
    "pago fraccionado",
    "formulario en línea modelo 222",
    "fichero modelo 222",
    "diseño de registro 222",
    "Anexo 222",
    "variación composición grupo fiscal",
    "datos adicionales declaración",
    "instrucciones 2025 y siguientes",
    "Orden HFP 227 2017",
  ],
  sections: [
    {
      id: "model-222-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-222-purpose-identity",
          heading: "Pago fraccionado de grupos de sociedades",
          text: "El índice y la portada del procedimiento identifican el Modelo 222 como pago fraccionado del Impuesto sobre Sociedades en régimen de consolidación fiscal.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_222_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-222-purpose-record",
          heading: "Objeto descrito para grupos de sociedades",
          text: "La ficha administrativa vincula el procedimiento con la declaración de pagos fraccionados correspondientes a grupos de sociedades y registra un canal telemático.",
          sourceIds: [MODEL_222_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-222-access",
      title: "Formulario y fichero descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-222-access-browser",
          heading: "Formulario en línea",
          text: "La página de gestiones y la ayuda técnica rotulan el acceso como ejercicio 2026 y siguientes. La ayuda describe el funcionamiento del formulario en línea; las instrucciones conservan por separado una referencia a 2025 y siguientes, sin que esta ficha infiera el alcance fiscal de esas etiquetas.",
          sourceIds: [
            MODEL_222_MANAGEMENT_SOURCE.id,
            MODEL_222_HELP_SOURCE.id,
            MODEL_222_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-222-access-file",
          heading: "Importación y diseño de registro",
          text: "La ayuda técnica describe la importación y exportación de un fichero ajustado al diseño publicado. El catálogo técnico rotula el diseño del Modelo 222 para 2025 y siguientes y señala una actualización de 17 de marzo de 2026.",
          sourceIds: [
            MODEL_222_HELP_SOURCE.id,
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-222-details",
      title: "Instrucciones, anexos y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-222-details-instructions",
          heading: "Instrucciones para 2025 y siguientes",
          text: "La AEAT mantiene una página específica de instrucciones rotulada para 2025 y siguientes, separada de las versiones correspondientes a períodos anteriores.",
          sourceIds: [MODEL_222_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-222-details-annexes",
          heading: "Dos comunicaciones del Anexo 222",
          text: "La página de gestiones distingue la comunicación de variaciones en la composición del grupo fiscal, rotulada para 2024 y siguientes, y la comunicación de datos adicionales, rotulada para 2025 y siguientes. La ayuda técnica conserva una página propia para cada comunicación.",
          sourceIds: [
            MODEL_222_MANAGEMENT_SOURCE.id,
            MODEL_222_ANNEX_VARIATION_HELP_SOURCE.id,
            MODEL_222_ANNEX_DATA_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-222-details-order",
          heading: "Orden de aprobación y tramitación",
          text: "La Orden HFP/227/2017 aprueba expresamente el Modelo 222 y regula su presentación electrónica. La portada registra por separado la Orden HAP/2194/2013 como norma general de tramitación.",
          sourceIds: [
            ORDER_HFP_227_2017_SOURCE.id,
            ORDER_HAP_2194_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_222_PROCEDURE_HOME_SOURCE,
    MODEL_222_PROCEDURE_RECORD_SOURCE,
    MODEL_222_MANAGEMENT_SOURCE,
    MODEL_222_INSTRUCTIONS_SOURCE,
    MODEL_222_HELP_SOURCE,
    MODEL_222_ANNEX_VARIATION_HELP_SOURCE,
    MODEL_222_ANNEX_DATA_HELP_SOURCE,
    MODELS_200_299_REGISTER_DESIGNS_SOURCE,
    CORPORATE_TAX_LAW_SOURCE,
    ORDER_HFP_227_2017_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-222-link-procedure",
      label: "Página oficial del Modelo 222",
      sourceId: MODEL_222_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-link-instructions",
      label: "Instrucciones oficiales 2025 y siguientes",
      sourceId: MODEL_222_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-link-help",
      label: "Ayuda técnica oficial del Modelo 222",
      sourceId: MODEL_222_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-link-register-design",
      label: "Diseños de registro de los Modelos 200 al 299",
      sourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-link-annex-variation",
      label: "Ayuda del Anexo 222 · variación del grupo fiscal",
      sourceId: MODEL_222_ANNEX_VARIATION_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-link-annex-data",
      label: "Ayuda del Anexo 222 · datos adicionales",
      sourceId: MODEL_222_ANNEX_DATA_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-link-order",
      label: "Orden HFP/227/2017",
      sourceId: ORDER_HFP_227_2017_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-222-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 222?",
      answer:
        "Lo identifica como pago fraccionado del Impuesto sobre Sociedades en régimen de consolidación fiscal.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_222_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-purpose",
      question: "¿Qué objeto describe su ficha administrativa?",
      answer:
        "Describe la declaración de pagos fraccionados correspondientes a grupos de sociedades.",
      sourceIds: [MODEL_222_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-browser",
      question: "¿Qué canal técnico publica la AEAT?",
      answer:
        "Publica un formulario en línea y la ficha administrativa registra tramitación telemática.",
      sourceIds: [
        MODEL_222_PROCEDURE_RECORD_SOURCE.id,
        MODEL_222_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-file",
      question: "¿Describe la ayuda la importación de un fichero?",
      answer:
        "Sí. La ayuda describe la importación y exportación de un fichero de texto ajustado al diseño de registro publicado por la AEAT.",
      sourceIds: [
        MODEL_222_HELP_SOURCE.id,
        MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-current-labels",
      question: "¿Qué referencias temporales muestran los recursos actuales?",
      answer:
        "La gestión principal y la ayuda técnica se rotulan para 2026 y siguientes, mientras que las instrucciones conservan una referencia a 2025 y siguientes. La ficha muestra ambas sin equipararlas.",
      sourceIds: [
        MODEL_222_MANAGEMENT_SOURCE.id,
        MODEL_222_HELP_SOURCE.id,
        MODEL_222_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-register-design",
      question: "¿Qué versión indica el catálogo de diseños de registro?",
      answer:
        "Rotula el diseño del Modelo 222 para 2025 y siguientes y señala una actualización de 17 de marzo de 2026.",
      sourceIds: [MODELS_200_299_REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-annex-variation",
      question: "¿Qué comunicación recoge el Anexo 222 sobre el grupo fiscal?",
      answer:
        "La AEAT publica una comunicación específica para variaciones en la composición del grupo fiscal, rotulada para 2024 y siguientes.",
      sourceIds: [
        MODEL_222_MANAGEMENT_SOURCE.id,
        MODEL_222_ANNEX_VARIATION_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-annex-data",
      question: "¿Existe otra comunicación de datos adicionales?",
      answer:
        "Sí. La página de gestiones distingue una comunicación de datos adicionales a la declaración, rotulada para 2025 y siguientes.",
      sourceIds: [
        MODEL_222_MANAGEMENT_SOURCE.id,
        MODEL_222_ANNEX_DATA_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-222-faq-order",
      question: "¿Qué norma aprueba expresamente el Modelo 222?",
      answer:
        "La Orden HFP/227/2017, de 13 de marzo, aprueba expresamente este modelo y regula su presentación electrónica.",
      sourceIds: [ORDER_HFP_227_2017_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_222_HELP_SOURCE.id,
      MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"222">;

export const PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_CONTENT_V1 = deepFreeze(
  [
    MODEL_217_CONTENT,
    MODEL_220_CONTENT,
    MODEL_221_CONTENT,
    MODEL_222_CONTENT,
  ] as const,
);
