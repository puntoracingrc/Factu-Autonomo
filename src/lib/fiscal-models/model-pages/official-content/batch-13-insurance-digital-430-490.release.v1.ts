import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_RELEASE_ID_V1 =
  "public-aeat-official-batch-13-insurance-digital-430-490.2026-07-13.v1" as const;

export type PublicAeatBatch13InsuranceDigital430490CodeV1 =
  "430" | "480" | "490";

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

const MODEL_430_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-430.procedure-home.2026-03-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 430 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC03.shtml",
  officialUpdatedOn: "2026-03-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d2f9a777363ea60e780474870b951aaf886df2c6fd66357062c04e3ac593a821",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_430_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-430.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 430",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC03.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ad970048952f7b3101b1d3109a0724b385448f8f75f50d9d0d9b9cb8de6695c5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_430_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-430.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title:
    "Instrucciones sobre la cumplimentación del Modelo 430 y sus formas de presentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/otros/modelo-430-primas-seguros-declaracion-liquidacion/instrucciones-sobre-cumplimentacion-modelo-430-mismo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0767410ed4f42e474087f28d99f04649d53e9c609be6571fc218da23863a3370",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_430_ORDER_SOURCE = {
  id: "boe.model-430.order-hfp-1284-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1284/2023, de 28 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-24412",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b83b8650fe8e324c5618c2dda50924bd818a94d7c9007e9628a969da1eb079f9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_430_480_ELECTRONIC_ORDER_SOURCE = {
  id: "boe.models-430-480.order-eha-3212-2004.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3212/2004, de 30 de septiembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2004-17306",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "281903ff08953a0f74640f0ec318701c3d8b692947297ea5146a61bc9d03df8d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_480_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-480.procedure-home.2026-03-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 480 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC04.shtml",
  officialUpdatedOn: "2026-03-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "eaa49e95b11aee2cc990a3a542524d4b215d381a576f3deb0f2df8c375bcc015",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_480_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-480.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 480",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC04.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cf87e35f368ff6395002d4d1972581989b5b4ae74121d64d9e580d6cb18b2cd9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_480_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-480.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title:
    "Instrucciones sobre la cumplimentación del Modelo 480 y sus formas de presentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/otros/modelo-480-primas-seguros-declaracion-anual_/instrucciones_.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f41b64a437c0a860974d4366f74910b668b4b25661f7bbbe2b9d282083dad40b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_480_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-480.register-design-xls.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Diseño de registro del Modelo 480",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_Resto_Mod/archivos/DR480e22.xls",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e209dd3a2abc337e1bd32a505ad26f2f257c6300b7576a148275c0d7687ba10d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_480_ORDER_SOURCE = {
  id: "boe.model-480.order-hfp-1246-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1246/2022, de 14 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-21459",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "254492d0e5f929e30e7445e5b6305fa694b24abbea3e6dbc1c70d0453bd0a8f9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-490.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 490 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC45.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dfcf764aa46ff8393f8c649dbf8a3a5d068a345b06d10030945542d03f275313",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-490.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 490",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC45.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "60f30387793273b77229d286d70dc64bba4b48387acb4c8624c00022bb32ae0f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-490.instructions-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 490 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC45/castellano/Instrucciones_490.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2eb68a4c6f022f184a0f9ed664c1dcd6221412046f3bffad1e69c66b0a08ef43",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_FAQ_SOURCE = {
  id: "aeat.model-490.faq-pdf.2024-01-23",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title:
    "Preguntas frecuentes del Impuesto sobre Determinados Servicios Digitales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC45/castellano/FAQ490.pdf",
  officialUpdatedOn: "2024-01-23",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "42001a5eebe87e5cf2b366f74cdbb1f0d9256e35984992fec240cea4aada1027",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_LAW_SOURCE = {
  id: "boe.model-490.law-4-2020.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title:
    "Ley 4/2020, de 15 de octubre, del Impuesto sobre Determinados Servicios Digitales",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-12355",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ee141e0dba624855968ebce3f337c69297c80973d3b688c8feffda0563306070",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_REGULATION_SOURCE = {
  id: "boe.model-490.royal-decree-400-2021.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 400/2021, de 8 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-9559",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bd7813e419d8b8fe715df914ee2c2e7f8cd5abf9fe6cf8b4f631fcd5c46a8366",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_BASE_ORDER_SOURCE = {
  id: "boe.model-490.order-hac-590-2021.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/590/2021, de 9 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-9721",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8a6818e9314a7c59dc21845a99aea2e2e123a772706dc64591f2532780fbd7eb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_2022_ORDER_SOURCE = {
  id: "boe.model-490.order-hfp-480-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/480/2022, de 23 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-8830",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d0622545b678d31424fcd2615e060848a6728fbf54a2fefeae13db6372527746",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_2023_ORDER_SOURCE = {
  id: "boe.model-490.order-hfp-307-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/307/2023, de 28 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-8115",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "268e89fb0db16e4db40ddeb189b6a99511e907fd98f04cb1ac918a6e65278325",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_DGT_RESOLUTION_SOURCE = {
  id: "boe.model-490.dgt-resolution-2021-06-25.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title:
    "Resolución de 25 de junio de 2021 de la Dirección General de Tributos",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-10745",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7a56ef074a950eb69e5c505b6424ce11bd75e6c2e0846057f03a5661d9c2c864",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_490_DOCUMENTS = [
  {
    id: "model-490-instructions",
    kind: "INSTRUCTIONS",
    title: "Instrucciones oficiales del Modelo 490",
    sourceId: MODEL_490_INSTRUCTIONS_SOURCE.id,
    landingPageSourceId: MODEL_490_PROCEDURE_HOME_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "Instrucciones_490.pdf",
    byteLength: 189853,
    pageCount: 13,
    sha256: "2eb68a4c6f022f184a0f9ed664c1dcd6221412046f3bffad1e69c66b0a08ef43",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "DOCUMENT_PREVIEW",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "model-490-official-faq",
    kind: "GUIDE",
    title:
      "Preguntas frecuentes oficiales del Impuesto sobre Determinados Servicios Digitales",
    sourceId: MODEL_490_FAQ_SOURCE.id,
    landingPageSourceId: MODEL_490_PROCEDURE_HOME_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "FAQ490.pdf",
    byteLength: 638107,
    pageCount: 25,
    sha256: "42001a5eebe87e5cf2b366f74cdbb1f0d9256e35984992fec240cea4aada1027",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "DOCUMENT_PREVIEW",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_430_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_RELEASE_ID_V1,
  code: "430",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Primas de seguros. Declaración-liquidación.",
  summary:
    "Modelo electrónico que la AEAT identifica como declaración-liquidación del Impuesto sobre las Primas de Seguros.",
  searchTerms: [
    "modelo 430",
    "primas de seguros",
    "impuesto sobre las primas de seguros",
    "declaración-liquidación",
    "autoliquidación",
    "entidades aseguradoras",
    "formato electrónico",
    "Orden HFP 1284 2023",
  ],
  sections: [
    {
      id: "model-430-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-430-purpose-identity",
          heading: "Declaración-liquidación de primas de seguros",
          text: "La página oficial y la ficha administrativa identifican el Modelo 430 con la declaración-liquidación del Impuesto sobre las Primas de Seguros.",
          sourceIds: [
            MODEL_430_PROCEDURE_HOME_SOURCE.id,
            MODEL_430_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-430-purpose-electronic",
          heading: "Modelo electrónico",
          text: "La Orden HFP/1284/2023 aprueba el modelo en formato electrónico y la ficha administrativa sitúa el procedimiento en canal telemático.",
          sourceIds: [
            MODEL_430_ORDER_SOURCE.id,
            MODEL_430_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-430-information",
      title: "Información oficial disponible",
      kind: "DETAILS",
      items: [
        {
          id: "model-430-information-instructions",
          heading: "Instrucciones de la AEAT",
          text: "La AEAT publica una página de instrucciones que describe la identificación del modelo, su estructura general y las formas electrónicas asociadas.",
          sourceIds: [MODEL_430_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-430-information-procedure",
          heading: "Ficha administrativa",
          text: "La ficha clasifica el procedimiento como tributario, atribuye su gestión a la Agencia Estatal de Administración Tributaria y señala que no tiene fases específicas.",
          sourceIds: [MODEL_430_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-430-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-430-access-electronic",
          heading: "Tramitación electrónica",
          text: "La normativa y la ficha administrativa describen un modelo exclusivamente electrónico, con acceso telemático mediante certificado electrónico.",
          sourceIds: [
            MODEL_430_ORDER_SOURCE.id,
            MODEL_430_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_430_PROCEDURE_HOME_SOURCE,
    MODEL_430_PROCEDURE_RECORD_SOURCE,
    MODEL_430_INSTRUCTIONS_SOURCE,
    MODEL_430_ORDER_SOURCE,
    MODELS_430_480_ELECTRONIC_ORDER_SOURCE,
    MODEL_480_PROCEDURE_HOME_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-430-link-procedure",
      label: "Página oficial del Modelo 430",
      sourceId: MODEL_430_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_430_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-link-instructions",
      label: "Instrucciones oficiales del Modelo 430",
      sourceId: MODEL_430_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-link-order",
      label: "Orden HFP/1284/2023",
      sourceId: MODEL_430_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-430-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 430?",
      answer:
        "La declaración-liquidación del Impuesto sobre las Primas de Seguros.",
      sourceIds: [
        MODEL_430_PROCEDURE_HOME_SOURCE.id,
        MODEL_430_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-faq-difference-480",
      question: "¿Es el mismo modelo que el resumen anual 480?",
      answer:
        "No. La AEAT identifica el 430 como declaración-liquidación y el 480 como declaración resumen anual.",
      sourceIds: [
        MODEL_430_PROCEDURE_HOME_SOURCE.id,
        MODEL_480_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-faq-channel",
      question: "¿Qué canal describe la documentación oficial?",
      answer:
        "La Orden HFP/1284/2023 y la ficha administrativa describen un modelo electrónico y un canal telemático.",
      sourceIds: [
        MODEL_430_ORDER_SOURCE.id,
        MODEL_430_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-faq-instructions",
      question: "¿Publica la AEAT instrucciones específicas?",
      answer:
        "Sí. La página oficial enlaza instrucciones propias sobre la cumplimentación y las formas electrónicas del modelo.",
      sourceIds: [
        MODEL_430_PROCEDURE_HOME_SOURCE.id,
        MODEL_430_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-faq-order",
      question: "¿Qué norma aprueba el modelo electrónico actual?",
      answer:
        "La Orden HFP/1284/2023, de 28 de noviembre, enlazada por la AEAT y registrada en el BOE.",
      sourceIds: [
        MODEL_430_PROCEDURE_HOME_SOURCE.id,
        MODEL_430_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-faq-authority",
      question: "¿Qué organismo figura como responsable?",
      answer:
        "La ficha del procedimiento identifica a la Agencia Estatal de Administración Tributaria como órgano responsable.",
      sourceIds: [MODEL_430_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-430-faq-phases",
      question: "¿Describe la ficha fases específicas?",
      answer:
        "No. La ficha administrativa indica que el procedimiento no tiene fases específicas de tramitación.",
      sourceIds: [MODEL_430_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_430_PROCEDURE_HOME_SOURCE.id,
      MODEL_430_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"430">;

const MODEL_480_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_RELEASE_ID_V1,
  code: "480",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Primas de seguros. Declaración Resumen anual.",
  summary:
    "Declaración resumen anual que la AEAT vincula al Impuesto sobre las Primas de Seguros.",
  searchTerms: [
    "modelo 480",
    "primas de seguros",
    "impuesto sobre las primas de seguros",
    "declaración resumen anual",
    "resumen anual",
    "ramos de seguro",
    "liquidaciones periódicas",
    "formato electrónico",
    "Orden HFP 1246 2022",
  ],
  sections: [
    {
      id: "model-480-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-480-purpose-identity",
          heading: "Resumen anual de primas de seguros",
          text: "La página oficial y la ficha administrativa identifican el Modelo 480 con la declaración resumen anual del Impuesto sobre las Primas de Seguros.",
          sourceIds: [
            MODEL_480_PROCEDURE_HOME_SOURCE.id,
            MODEL_480_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-480-purpose-electronic",
          heading: "Modelo electrónico",
          text: "La Orden HFP/1246/2022 aprueba el modelo en formato electrónico y la ficha administrativa sitúa el procedimiento en canal telemático.",
          sourceIds: [
            MODEL_480_ORDER_SOURCE.id,
            MODEL_480_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-480-information",
      title: "Información oficial disponible",
      kind: "DETAILS",
      items: [
        {
          id: "model-480-information-instructions",
          heading: "Instrucciones de la AEAT",
          text: "La página de instrucciones explica la identificación y la estructura anual del modelo, con información organizada por ramos de seguro y por los resultados agregados descritos por la AEAT.",
          sourceIds: [MODEL_480_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-480-information-design",
          heading: "Diseño de registro",
          text: "La página oficial enlaza un diseño de registro identificado para el Modelo 480, conservado como recurso técnico externo de la AEAT.",
          sourceIds: [
            MODEL_480_PROCEDURE_HOME_SOURCE.id,
            MODEL_480_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-480-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-480-access-electronic",
          heading: "Tramitación electrónica",
          text: "La orden que aprueba el modelo y la ficha administrativa lo describen en formato electrónico y por canal telemático mediante certificado electrónico.",
          sourceIds: [
            MODEL_480_ORDER_SOURCE.id,
            MODEL_480_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_480_PROCEDURE_HOME_SOURCE,
    MODEL_480_PROCEDURE_RECORD_SOURCE,
    MODEL_480_INSTRUCTIONS_SOURCE,
    MODEL_480_REGISTER_DESIGN_SOURCE,
    MODEL_480_ORDER_SOURCE,
    MODELS_430_480_ELECTRONIC_ORDER_SOURCE,
    MODEL_430_PROCEDURE_HOME_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-480-link-procedure",
      label: "Página oficial del Modelo 480",
      sourceId: MODEL_480_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_480_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-link-instructions",
      label: "Instrucciones oficiales del Modelo 480",
      sourceId: MODEL_480_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-link-design",
      label: "Diseño de registro oficial del Modelo 480 (XLS)",
      sourceId: MODEL_480_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-link-order",
      label: "Orden HFP/1246/2022",
      sourceId: MODEL_480_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-480-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 480?",
      answer:
        "La declaración resumen anual del Impuesto sobre las Primas de Seguros.",
      sourceIds: [
        MODEL_480_PROCEDURE_HOME_SOURCE.id,
        MODEL_480_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-faq-difference-430",
      question: "¿Es el mismo modelo que la declaración-liquidación 430?",
      answer:
        "No. La AEAT identifica el 480 como resumen anual y el 430 como declaración-liquidación.",
      sourceIds: [
        MODEL_480_PROCEDURE_HOME_SOURCE.id,
        MODEL_430_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-faq-channel",
      question: "¿Qué canal describe la documentación oficial?",
      answer:
        "La Orden HFP/1246/2022 y la ficha administrativa describen un modelo electrónico y un canal telemático.",
      sourceIds: [
        MODEL_480_ORDER_SOURCE.id,
        MODEL_480_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-faq-instructions",
      question: "¿Publica la AEAT instrucciones específicas?",
      answer:
        "Sí. La página del modelo enlaza instrucciones oficiales que explican su estructura anual.",
      sourceIds: [
        MODEL_480_PROCEDURE_HOME_SOURCE.id,
        MODEL_480_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-faq-design",
      question: "¿Existe un diseño de registro oficial?",
      answer:
        "Sí. La página oficial enlaza un archivo de diseño de registro identificado para el Modelo 480.",
      sourceIds: [
        MODEL_480_PROCEDURE_HOME_SOURCE.id,
        MODEL_480_REGISTER_DESIGN_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-faq-order",
      question: "¿Qué norma aprueba este modelo electrónico?",
      answer:
        "La Orden HFP/1246/2022, de 14 de diciembre, publicada en el BOE.",
      sourceIds: [
        MODEL_480_PROCEDURE_HOME_SOURCE.id,
        MODEL_480_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-480-faq-authority",
      question: "¿Qué organismo figura como responsable?",
      answer:
        "La ficha del procedimiento identifica a la Agencia Estatal de Administración Tributaria como órgano responsable.",
      sourceIds: [MODEL_480_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_480_PROCEDURE_HOME_SOURCE.id,
      MODEL_480_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"480">;

const MODEL_490_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_RELEASE_ID_V1,
  code: "490",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre Determinados Servicios Digitales. Autoliquidación",
  summary:
    "Autoliquidación del Impuesto sobre Determinados Servicios Digitales, documentada por la AEAT con instrucciones y preguntas frecuentes oficiales.",
  searchTerms: [
    "modelo 490",
    "impuesto sobre determinados servicios digitales",
    "IDSD",
    "servicios digitales",
    "interfaz digital",
    "contenido digital",
    "publicidad en línea",
    "intermediación en línea",
    "transmisión de datos",
    "localización de usuarios",
    "presentación por lotes",
    "Ley 4 2020",
  ],
  sections: [
    {
      id: "model-490-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-490-purpose-tax",
          heading: "Impuesto sobre Determinados Servicios Digitales",
          text: "La ficha administrativa describe un tributo indirecto relacionado con determinadas prestaciones de servicios digitales en las que intervienen usuarios situados en el territorio de aplicación del impuesto.",
          sourceIds: [
            MODEL_490_PROCEDURE_RECORD_SOURCE.id,
            MODEL_490_LAW_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-490-purpose-model",
          heading: "Autoliquidación identificada como Modelo 490",
          text: "La página oficial, la ficha administrativa y la Orden HAC/590/2021 identifican el Modelo 490 como la autoliquidación de este impuesto.",
          sourceIds: [
            MODEL_490_PROCEDURE_HOME_SOURCE.id,
            MODEL_490_PROCEDURE_RECORD_SOURCE.id,
            MODEL_490_BASE_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-490-scope",
      title: "Conceptos explicados por las fuentes",
      kind: "SCOPE",
      items: [
        {
          id: "model-490-scope-interface",
          heading: "Interfaz y contenido digital",
          text: "El documento oficial de preguntas frecuentes explica los conceptos de interfaz digital y contenido digital y los sitúa dentro del marco definido por la Ley 4/2020.",
          sourceIds: [MODEL_490_FAQ_SOURCE.id, MODEL_490_LAW_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-490-scope-services",
          heading: "Servicios descritos",
          text: "Las instrucciones y las preguntas frecuentes organizan su explicación en torno a publicidad en línea, intermediación en línea y transmisión de datos.",
          sourceIds: [
            MODEL_490_INSTRUCTIONS_SOURCE.id,
            MODEL_490_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-490-scope-context",
          heading: "Contexto técnico y territorial",
          text: "Las fuentes oficiales incluyen explicaciones sobre la localización de dispositivos, la identificación y la información territorial asociada al modelo, sin sustituir el análisis de un caso concreto.",
          sourceIds: [
            MODEL_490_FAQ_SOURCE.id,
            MODEL_490_REGULATION_SOURCE.id,
            MODEL_490_2022_ORDER_SOURCE.id,
            MODEL_490_2023_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-490-documents",
      title: "Documentación oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-490-documents-instructions",
          heading: "Instrucciones",
          text: "La página oficial enlaza un documento PDF de instrucciones sobre la estructura y las formas electrónicas del Modelo 490.",
          sourceIds: [
            MODEL_490_PROCEDURE_HOME_SOURCE.id,
            MODEL_490_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-490-documents-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La AEAT publica un PDF específico de preguntas frecuentes que reúne conceptos, hechos descritos por la norma, localización, identificación y cuestiones de declaración.",
          sourceIds: [
            MODEL_490_PROCEDURE_HOME_SOURCE.id,
            MODEL_490_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-490-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-490-access-electronic",
          heading: "Formulario electrónico",
          text: "La ficha administrativa sitúa el procedimiento en canal telemático y las instrucciones describen una vía electrónica a través de Internet.",
          sourceIds: [
            MODEL_490_PROCEDURE_RECORD_SOURCE.id,
            MODEL_490_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-490-access-batches",
          heading: "Presentación por lotes",
          text: "La portada oficial distingue una gestión específica denominada presentación por lotes, además de la gestión electrónica individual.",
          sourceIds: [MODEL_490_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_490_PROCEDURE_HOME_SOURCE,
    MODEL_490_PROCEDURE_RECORD_SOURCE,
    MODEL_490_INSTRUCTIONS_SOURCE,
    MODEL_490_FAQ_SOURCE,
    MODEL_490_LAW_SOURCE,
    MODEL_490_REGULATION_SOURCE,
    MODEL_490_BASE_ORDER_SOURCE,
    MODEL_490_2022_ORDER_SOURCE,
    MODEL_490_2023_ORDER_SOURCE,
    MODEL_490_DGT_RESOLUTION_SOURCE,
  ],
  documents: MODEL_490_DOCUMENTS,
  thumbnail: {
    id: "model-490-instructions-preview",
    sourceId: MODEL_490_INSTRUCTIONS_SOURCE.id,
    publicHref:
      "/fiscal-models/modelo-490/instrucciones-modelo-490-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "5117ad8408d21b602f61bae20f1318ea539307e0b26ea30287c3fb43f0aafa3a",
    alt: "Vista previa de la cabecera de las instrucciones oficiales del Modelo 490 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-490-link-procedure",
      label: "Página oficial del Modelo 490",
      sourceId: MODEL_490_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_490_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-instructions",
      label: "Instrucciones oficiales del Modelo 490",
      sourceId: MODEL_490_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-faq",
      label: "Preguntas frecuentes oficiales del impuesto",
      sourceId: MODEL_490_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-law",
      label: "Ley 4/2020, de 15 de octubre",
      sourceId: MODEL_490_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-regulation",
      label: "Real Decreto 400/2021, de 8 de junio",
      sourceId: MODEL_490_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-base-order",
      label: "Orden HAC/590/2021, de 9 de junio",
      sourceId: MODEL_490_BASE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-link-latest-order",
      label: "Orden HFP/307/2023, de 28 de marzo",
      sourceId: MODEL_490_2023_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-490-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 490?",
      answer:
        "La autoliquidación del Impuesto sobre Determinados Servicios Digitales.",
      sourceIds: [
        MODEL_490_PROCEDURE_HOME_SOURCE.id,
        MODEL_490_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-interface",
      question: "¿Qué es una interfaz digital en la documentación oficial?",
      answer:
        "El FAQ de la AEAT la explica como un programa, sitio web, aplicación u otro medio accesible que posibilita comunicación digital.",
      sourceIds: [MODEL_490_FAQ_SOURCE.id, MODEL_490_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-content",
      question: "¿Qué entiende la fuente oficial por contenido digital?",
      answer:
        "El documento de preguntas frecuentes lo describe como datos suministrados en formato digital, distintos de los datos que representan la propia interfaz.",
      sourceIds: [MODEL_490_FAQ_SOURCE.id, MODEL_490_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-services",
      question: "¿Qué clases de servicios explica la documentación?",
      answer:
        "Las instrucciones y el FAQ tratan publicidad en línea, intermediación en línea y transmisión de datos.",
      sourceIds: [MODEL_490_INSTRUCTIONS_SOURCE.id, MODEL_490_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-topics",
      question: "¿Qué temas reúne el FAQ oficial?",
      answer:
        "Conceptos, hechos descritos por la norma, lugar de realización, contribuyente, base imponible, declaración e identificación.",
      sourceIds: [MODEL_490_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-documents",
      question: "¿Qué documentos oficiales están disponibles?",
      answer:
        "La portada enlaza un PDF de instrucciones y otro PDF de preguntas frecuentes publicado por la AEAT.",
      sourceIds: [
        MODEL_490_PROCEDURE_HOME_SOURCE.id,
        MODEL_490_INSTRUCTIONS_SOURCE.id,
        MODEL_490_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-channels",
      question: "¿Qué canales muestra la página oficial?",
      answer:
        "La página distingue una gestión electrónica individual y otra denominada presentación por lotes.",
      sourceIds: [MODEL_490_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-law",
      question: "¿Qué normas principales enlaza la AEAT?",
      answer:
        "La Ley 4/2020, el Real Decreto 400/2021 y las órdenes que aprueban y actualizan el Modelo 490.",
      sourceIds: [
        MODEL_490_LAW_SOURCE.id,
        MODEL_490_REGULATION_SOURCE.id,
        MODEL_490_BASE_ORDER_SOURCE.id,
        MODEL_490_2022_ORDER_SOURCE.id,
        MODEL_490_2023_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-490-faq-resolution",
      question: "¿Existe una resolución interpretativa enlazada?",
      answer:
        "Sí. La página oficial enlaza la Resolución de 25 de junio de 2021 de la Dirección General de Tributos relativa a este impuesto.",
      sourceIds: [
        MODEL_490_PROCEDURE_HOME_SOURCE.id,
        MODEL_490_DGT_RESOLUTION_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_490_PROCEDURE_HOME_SOURCE.id,
      MODEL_490_PROCEDURE_RECORD_SOURCE.id,
      MODEL_490_INSTRUCTIONS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"490">;

export const PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_CONTENT_V1 =
  deepFreeze([
    MODEL_430_CONTENT,
    MODEL_480_CONTENT,
    MODEL_490_CONTENT,
  ] as const);
