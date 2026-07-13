import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_RELEASE_ID_V1 =
  "public-aeat-official-batch-10-regional-aid-281-283.2026-07-13.v1" as const;

export type PublicAeatBatch10RegionalAid281283CodeV1 = "281" | "282" | "283";

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

const MODEL_281_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-281.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 281 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI56.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a69eb58eed9ce45d41ba97c23cbf2ceceb620de49ea1fa25e1a3a2aba52f29f4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_281_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-281.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 281",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI56.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5d92838dca82653f4343035fd69830a3f012fda142379a897a88dd6eb8a430f4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_281_BROWSER_HELP_SOURCE = {
  id: "aeat.model-281.browser-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 281 · ayuda del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-289/modelo-281-presentacion-formulario.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c72408cbe87d33a439712575ede98c3b9510756526ec89c14db87ec059d2e415",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_281_FILE_HELP_SOURCE = {
  id: "aeat.model-281.file-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 281 · ayuda de la presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-281-presentacion-fichero.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "08fb88f70f43b92f6babc42bd0384e5ca19bd7f0b7040d1727b9c27bc69c5b79",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_281_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-281.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Diseño de registro del Modelo 281 · ejercicio 2023",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos_23/DR_Mod_281_2023.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c6d775f641fd7b546a65803aa2b2305ff99d5d610d4fa07fc4ded70cc2ab3487",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_281_ORDER_SOURCE = {
  id: "boe.model-281.order-hfp-1285-2023",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1285/2023, de 28 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-24413",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a1b45b53d4e4e1206145413dcb3e5a8721b39bbc3d137f785c4597c31f490bc3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_282_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-282.procedure-home.2026-05-29",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 282 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI40.shtml",
  officialUpdatedOn: "2026-05-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5123f3162a37e2dcaca457f77a60a888aeacfcab16d2cf3d7f6f2fb32529dcd2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_282_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-282.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 282",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI40.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a7aee5f68e262e09892d3c797b2dff887a23d2dfa974e416abe8dd87d7a09cf9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_282_HELP_SOURCE = {
  id: "aeat.model-282.browser-file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 282 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-282.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "67d50927e2e4598b6f091178c9ba3012d737732fb7bbee76f9b13bb169f79640",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_282_REGISTER_DESIGN_XLSX_SOURCE = {
  id: "aeat.model-282.register-design-xlsx.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Diseño de registro del Modelo 282 · ejercicio 2025 y siguientes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos_25/dr282e25.xlsx",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ca592659e70e8bfcf563cbef996e5f973d14edb62b9f27360454269bb1089845",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_282_ORDER_SOURCE = {
  id: "boe.model-282.order-hap-296-2016",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/296/2016, de 2 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2016-2371",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "49b636b3671e8a75fbb35633d3ffdbdca1ac44a33e7e371e293863e3c89174c7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_282_CURRENT_ORDER_SOURCE = {
  id: "boe.model-282.order-hac-1430-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1430/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25389",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "84e1e10ff368fadef88eaf8cd0440f93b283ee55734ba89ec8b13424364253cd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-283.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 283 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI58.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "05aab3f0de8ca8c4e9051066809807b3b0cf98c73ca8eefb12425136a571325c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-283.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 283",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI58.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f9993640aa38f0c138f37d3f353b1a2d873cc182b320f3647be6c566335e3ca1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_HELP_SOURCE = {
  id: "aeat.model-283.browser-file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 283 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-289/modelo-283.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "afd8b10b3c189b05f4c9c96e3483de57fbb50f14e6a52e4c2157e2bc4a0496cd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-283.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Diseño de registro del Modelo 283 · ejercicio 2024",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/DR_Modelo_283.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8cf4c92642a3f17f473dbce58f0d21a35551d4d1d12f175dd128e6ee7cf95b6f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_ORDER_SOURCE = {
  id: "boe.model-283.order-hac-1031-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1031/2024, de 25 de septiembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-19390",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "87bb08ed0c2e6189a4d65fa68eba750c410be610bd25379e4738c445ac9e15dc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_ORDER_CORRECTION_SOURCE = {
  id: "boe.model-283.order-hac-1031-2024.correction",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Corrección de errores de la Orden HAC/1031/2024",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-20398",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ecbdbe28b209b33a243fd5dd8390d5acd9cb40ad8f5de462cf4f1084d0e2f7ce",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_283_ROYAL_DECREE_SOURCE = {
  id: "boe.model-283.royal-decree-710-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 710/2024, de 23 de julio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-15205",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f03c4a10bc0e61a995073ae88ad988110a277274422a556f2defc1648bada772",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_281_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_RELEASE_ID_V1,
  code: "281",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa trimestral de operaciones de comercio de bienes corporales realizadas en la Zona Especial Canaria sin que las mercancías transiten por territorio canario.",
  summary:
    "Declaración informativa que la AEAT identifica con determinadas operaciones de comercio de bienes corporales en la Zona Especial Canaria sin tránsito de las mercancías por territorio canario.",
  searchTerms: [
    "modelo 281",
    "declaración informativa trimestral",
    "Zona Especial Canaria",
    "ZEC",
    "comercio de bienes corporales",
    "mercancías",
    "operaciones sin tránsito por Canarias",
    "formulario modelo 281",
    "fichero modelo 281",
    "diseño de registro 281",
    "Orden HFP 1285 2023",
  ],
  sections: [
    {
      id: "model-281-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-281-purpose-identity",
          heading:
            "Operaciones de comercio de bienes en la Zona Especial Canaria",
          text: "El índice oficial y la página del procedimiento identifican el Modelo 281 como una declaración informativa trimestral sobre operaciones de comercio de bienes corporales realizadas en la Zona Especial Canaria sin que las mercancías transiten por territorio canario.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_281_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-281-purpose-record",
          heading: "Descripción administrativa",
          text: "La ficha administrativa clasifica el Modelo 281 como un procedimiento tributario e informativo de presentación y consulta. Esta página no evalúa si una operación o entidad concreta queda incluida.",
          sourceIds: [MODEL_281_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-281-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-281-access-browser-file",
          heading: "Formulario web y canal mediante fichero",
          text: "La página oficial y las ayudas técnicas describen dos canales: un formulario en navegador y un canal mediante fichero. Esta ficha registra únicamente esa descripción y no conserva destinos de presentación.",
          sourceIds: [
            MODEL_281_PROCEDURE_HOME_SOURCE.id,
            MODEL_281_BROWSER_HELP_SOURCE.id,
            MODEL_281_FILE_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-281-access-register-design",
          heading: "Diseño de registro en PDF",
          text: "El catálogo técnico de la AEAT enlaza un PDF de nueve páginas con el diseño de registro del Modelo 281, rotulado para el ejercicio 2023. Es documentación técnica, no un formulario estático para cumplimentar.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_281_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-281-details",
      title: "Ayuda y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-281-details-browser-help",
          heading: "Ayuda del formulario",
          text: "La ayuda oficial explica que el formulario web admite la importación y exportación de ficheros ajustados al diseño de registro. La referencia se ofrece como documentación externa y no se reproduce como flujo operativo.",
          sourceIds: [MODEL_281_BROWSER_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-281-details-file-help",
          heading: "Ayuda del canal mediante fichero",
          text: "La AEAT publica una ayuda separada para el canal mediante fichero y describe la validación de archivos ajustados al diseño de registro. Esta aplicación no valida ni transmite declaraciones.",
          sourceIds: [MODEL_281_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-281-details-law",
          heading: "Norma de aprobación",
          text: "La página oficial y la ficha administrativa citan la Orden HFP/1285/2023, que aprueba el Modelo 281 y su diseño de registro.",
          sourceIds: [
            MODEL_281_PROCEDURE_HOME_SOURCE.id,
            MODEL_281_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_281_PROCEDURE_HOME_SOURCE,
    MODEL_281_PROCEDURE_RECORD_SOURCE,
    MODEL_281_BROWSER_HELP_SOURCE,
    MODEL_281_FILE_HELP_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_281_REGISTER_DESIGN_SOURCE,
    MODEL_281_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-281-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 281 · ejercicio 2023",
      sourceId: MODEL_281_REGISTER_DESIGN_SOURCE.id,
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Mod_281_2023.pdf",
      byteLength: 178735,
      pageCount: 9,
      sha256:
        "c6d775f641fd7b546a65803aa2b2305ff99d5d610d4fa07fc4ded70cc2ab3487",
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
      id: "model-281-link-procedure",
      label: "Página oficial del Modelo 281",
      sourceId: MODEL_281_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_281_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-link-browser-help",
      label: "Ayuda oficial del formulario",
      sourceId: MODEL_281_BROWSER_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-link-file-help",
      label: "Ayuda oficial del canal mediante fichero",
      sourceId: MODEL_281_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-link-register-design",
      label: "Diseño de registro oficial del Modelo 281",
      sourceId: MODEL_281_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-link-order",
      label: "Orden HFP/1285/2023",
      sourceId: MODEL_281_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-281-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 281?",
      answer:
        "Una declaración informativa trimestral de operaciones de comercio de bienes corporales realizadas en la Zona Especial Canaria sin que las mercancías transiten por territorio canario.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-operation-context",
      question: "¿Qué contexto de operaciones menciona su denominación?",
      answer:
        "El comercio de bienes corporales en la Zona Especial Canaria cuando la denominación oficial indica que las mercancías no transitan por territorio canario.",
      sourceIds: [MODEL_281_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-classification",
      question: "¿Cómo clasifica la AEAT el procedimiento?",
      answer:
        "Como un procedimiento tributario de carácter informativo. La ficha no determina si resulta aplicable a un caso concreto.",
      sourceIds: [MODEL_281_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-channels",
      question: "¿Qué canales describen las fuentes oficiales?",
      answer:
        "Un formulario en navegador y un canal mediante fichero ajustado al diseño de registro.",
      sourceIds: [
        MODEL_281_BROWSER_HELP_SOURCE.id,
        MODEL_281_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-import-export",
      question: "¿La ayuda del formulario menciona el uso de ficheros?",
      answer:
        "Sí. Describe la importación y exportación de archivos confeccionados conforme al diseño de registro del Modelo 281.",
      sourceIds: [MODEL_281_BROWSER_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-register-design",
      question: "¿Existe un diseño de registro oficial descargable?",
      answer:
        "Sí. El catálogo técnico enlaza un PDF de nueve páginas rotulado para el ejercicio 2023.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        MODEL_281_REGISTER_DESIGN_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-static-form",
      question: "¿Ese PDF es un formulario estático para cumplimentar?",
      answer:
        "No. El archivo contiene el diseño de registro y se conserva como documentación técnica, sin miniatura de formulario.",
      sourceIds: [MODEL_281_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-register-age",
      question:
        "¿La referencia a 2023 permite extender el diseño a otros ejercicios?",
      answer:
        "No. La ficha conserva el rótulo temporal del documento y no presume su aplicación a ejercicios distintos.",
      sourceIds: [MODEL_281_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-281-faq-law",
      question: "¿Qué norma aprueba el Modelo 281?",
      answer:
        "La Orden HFP/1285/2023, de 28 de noviembre, citada por la página oficial y la ficha administrativa.",
      sourceIds: [MODEL_281_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_281_PROCEDURE_HOME_SOURCE.id,
      MODEL_281_BROWSER_HELP_SOURCE.id,
      MODEL_281_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"281">;

const MODEL_282_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_RELEASE_ID_V1,
  code: "282",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de ayudas recibidas en el marco del Régimen Económico y Fiscal de Canarias y otras ayudas de estado, derivadas de la aplicación del Derecho de la Unión Europea.",
  summary:
    "Declaración informativa que la AEAT relaciona con ayudas del Régimen Económico y Fiscal de Canarias y otras ayudas de Estado descritas por sus fuentes oficiales.",
  searchTerms: [
    "modelo 282",
    "declaración informativa anual",
    "REF de Canarias",
    "Régimen Económico y Fiscal de Canarias",
    "ayudas de Estado",
    "reserva para inversiones en Canarias",
    "RIC",
    "Zona Especial Canaria",
    "ZEC",
    "formulario modelo 282",
    "fichero 282",
    "diseño de registro 282",
    "Orden HAP 296 2016",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-282-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-282-purpose-identity",
          heading: "Ayudas del REF de Canarias y otras ayudas de Estado",
          text: "El índice y la página oficial identifican el Modelo 282 como una declaración informativa anual de ayudas recibidas en el marco del REF de Canarias y otras ayudas de Estado derivadas de la aplicación del derecho de la Unión Europea.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_282_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-282-purpose-record",
          heading: "Descripción administrativa del objeto",
          text: "La ficha administrativa menciona ayudas vinculadas a la reserva para inversiones en Canarias y a la Zona Especial Canaria. La Orden HAP/296/2016 remite al marco normativo del REF; esta página no decide qué ayudas o personas quedan incluidas en un supuesto concreto.",
          sourceIds: [
            MODEL_282_PROCEDURE_RECORD_SOURCE.id,
            MODEL_282_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-282-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-282-access-browser-file",
          heading: "Formulario web e intercambio de ficheros",
          text: "La ayuda técnica describe un formulario en navegador y funciones de importación y exportación de ficheros con extensión .282 ajustados al diseño de registro. Esta ficha no conserva ni abre destinos de presentación.",
          sourceIds: [
            MODEL_282_PROCEDURE_HOME_SOURCE.id,
            MODEL_282_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-282-access-register-design",
          heading: "Diseño de registro en XLSX",
          text: "El catálogo técnico de la AEAT enlaza para el Modelo 282 un archivo XLSX rotulado para el ejercicio 2025 y siguientes. No es un PDF y, por tanto, se ofrece como enlace técnico sin documento ni miniatura de formulario.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_282_REGISTER_DESIGN_XLSX_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-282-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-282-details-classification",
          heading: "Procedimiento tributario informativo",
          text: "La ficha administrativa clasifica el Modelo 282 como un procedimiento tributario con tramitación electrónica. La clasificación se conserva sin determinar obligaciones ni aplicabilidad individual.",
          sourceIds: [MODEL_282_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-282-details-help",
          heading: "Ayuda técnica del formulario",
          text: "La AEAT publica una guía web del formulario y del manejo de archivos del Modelo 282. Se enlaza como información externa y no se replica su flujo de tramitación.",
          sourceIds: [MODEL_282_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-282-details-laws",
          heading: "Normativa de aprobación y modificación",
          text: "La Orden HAP/296/2016 aprueba el Modelo 282. La página oficial registra además la Orden HAC/1430/2025 entre sus modificaciones normativas.",
          sourceIds: [
            MODEL_282_ORDER_SOURCE.id,
            MODEL_282_CURRENT_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_282_PROCEDURE_HOME_SOURCE,
    MODEL_282_PROCEDURE_RECORD_SOURCE,
    MODEL_282_HELP_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_282_REGISTER_DESIGN_XLSX_SOURCE,
    MODEL_282_ORDER_SOURCE,
    MODEL_282_CURRENT_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-282-link-procedure",
      label: "Página oficial del Modelo 282",
      sourceId: MODEL_282_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_282_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-link-help",
      label: "Ayuda técnica oficial del Modelo 282",
      sourceId: MODEL_282_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-link-register-design-index",
      label: "Catálogo oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-link-register-design-xlsx",
      label: "Diseño de registro XLSX del Modelo 282",
      sourceId: MODEL_282_REGISTER_DESIGN_XLSX_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-link-order",
      label: "Orden HAP/296/2016",
      sourceId: MODEL_282_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-link-current-order",
      label: "Orden HAC/1430/2025",
      sourceId: MODEL_282_CURRENT_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-282-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 282?",
      answer:
        "Una declaración informativa anual de ayudas recibidas en el marco del REF de Canarias y otras ayudas de Estado derivadas de la aplicación del derecho de la Unión Europea.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-ref",
      question: "¿Con qué marco territorial relaciona la AEAT este modelo?",
      answer:
        "Con el Régimen Económico y Fiscal de Canarias, identificado habitualmente por las siglas REF.",
      sourceIds: [MODEL_282_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-ric-zec",
      question:
        "¿Qué referencias concretas aparecen en la ficha administrativa?",
      answer:
        "La reserva para inversiones en Canarias y la Zona Especial Canaria, sin que esta ficha determine la inclusión de una ayuda concreta.",
      sourceIds: [MODEL_282_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-classification",
      question: "¿Cómo clasifica la AEAT el procedimiento?",
      answer:
        "Como un procedimiento tributario con tramitación electrónica y finalidad informativa.",
      sourceIds: [MODEL_282_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-channels",
      question: "¿Qué canales describe la ayuda oficial?",
      answer:
        "Un formulario en navegador y la importación y exportación de ficheros ajustados al diseño de registro.",
      sourceIds: [MODEL_282_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-file-extension",
      question: "¿Qué extensión de fichero identifica la ayuda?",
      answer:
        "La ayuda técnica identifica la extensión .282 para los archivos exportados o importados por el formulario.",
      sourceIds: [MODEL_282_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-register-design",
      question: "¿Qué formato tiene el diseño de registro publicado?",
      answer:
        "Un archivo XLSX que el catálogo técnico rotula para el ejercicio 2025 y siguientes.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        MODEL_282_REGISTER_DESIGN_XLSX_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-static-form",
      question: "¿Se ha registrado un formulario PDF estático del Modelo 282?",
      answer:
        "No. Las fuentes registradas describen un formulario web y publican el diseño técnico en XLSX, por lo que la ficha no muestra una miniatura PDF.",
      sourceIds: [MODEL_282_HELP_SOURCE.id, REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-282-faq-laws",
      question: "¿Qué normativa principal conserva la ficha?",
      answer:
        "La Orden HAP/296/2016 como norma de aprobación y la Orden HAC/1430/2025 como modificación posterior registrada por la AEAT.",
      sourceIds: [MODEL_282_ORDER_SOURCE.id, MODEL_282_CURRENT_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_282_PROCEDURE_HOME_SOURCE.id,
      MODEL_282_PROCEDURE_RECORD_SOURCE.id,
      MODEL_282_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"282">;

const MODEL_283_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_RELEASE_ID_V1,
  code: "283",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de ayudas recibidas en el marco del Régimen Fiscal Especial de las Illes Balears",
  summary:
    "Declaración informativa que la AEAT relaciona con ayudas recibidas en el marco del Régimen Fiscal Especial de las Illes Balears.",
  searchTerms: [
    "modelo 283",
    "declaración informativa anual",
    "Régimen Fiscal Especial de las Illes Balears",
    "Régimen Fiscal Balear",
    "RFB",
    "ayudas Illes Balears",
    "formulario modelo 283",
    "fichero 283",
    "diseño de registro 283",
    "Orden HAC 1031 2024",
    "Real Decreto 710 2024",
  ],
  sections: [
    {
      id: "model-283-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-283-purpose-identity",
          heading: "Ayudas del Régimen Fiscal Especial de las Illes Balears",
          text: "El índice y la página oficial identifican el Modelo 283 como una declaración informativa anual de ayudas recibidas en el marco del Régimen Fiscal Especial de las Illes Balears.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_283_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-283-purpose-record",
          heading: "Descripción administrativa del objeto",
          text: "La ficha administrativa sitúa el régimen en el ámbito territorial de la Comunidad Autónoma de las Illes Balears y describe información de ayudas relativas al RFB. Esta página no decide la aplicabilidad a una persona, entidad o ayuda concreta.",
          sourceIds: [MODEL_283_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-283-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-283-access-browser-file",
          heading: "Formulario web e intercambio de ficheros",
          text: "La ayuda técnica describe un formulario en navegador y la importación y exportación de ficheros con extensión .283 ajustados al diseño lógico. La referencia es informativa y no conserva destinos de presentación.",
          sourceIds: [
            MODEL_283_PROCEDURE_HOME_SOURCE.id,
            MODEL_283_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-283-access-register-design",
          heading: "Diseño de registro en PDF",
          text: "El catálogo técnico de la AEAT enlaza un PDF de seis páginas con el diseño de registro del Modelo 283, cuya portada está rotulada para el ejercicio 2024. Es documentación técnica, no un formulario estático para cumplimentar.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_283_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-283-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-283-details-classification",
          heading: "Procedimiento tributario informativo",
          text: "La ficha administrativa clasifica el Modelo 283 como un procedimiento tributario con tramitación electrónica. La clasificación no se convierte en una decisión de aplicabilidad.",
          sourceIds: [MODEL_283_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-283-details-help",
          heading: "Ayuda técnica del formulario",
          text: "La AEAT publica una guía web del formulario, su vista previa y el manejo de archivos del Modelo 283. Se enlaza como documentación externa sin reproducir el flujo de tramitación.",
          sourceIds: [MODEL_283_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-283-details-laws",
          heading: "Normativa del régimen y del modelo",
          text: "La Orden HAC/1031/2024 aprueba el Modelo 283, el BOE publicó una corrección de errores de esa orden y el Real Decreto 710/2024 desarrolla el Régimen Fiscal Especial de las Illes Balears citado por las fuentes oficiales.",
          sourceIds: [
            MODEL_283_ORDER_SOURCE.id,
            MODEL_283_ORDER_CORRECTION_SOURCE.id,
            MODEL_283_ROYAL_DECREE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_283_PROCEDURE_HOME_SOURCE,
    MODEL_283_PROCEDURE_RECORD_SOURCE,
    MODEL_283_HELP_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_283_REGISTER_DESIGN_SOURCE,
    MODEL_283_ORDER_SOURCE,
    MODEL_283_ORDER_CORRECTION_SOURCE,
    MODEL_283_ROYAL_DECREE_SOURCE,
  ],
  documents: [
    {
      id: "model-283-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 283 · ejercicio 2024",
      sourceId: MODEL_283_REGISTER_DESIGN_SOURCE.id,
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_283.pdf",
      byteLength: 542757,
      pageCount: 6,
      sha256:
        "8cf4c92642a3f17f473dbce58f0d21a35551d4d1d12f175dd128e6ee7cf95b6f",
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
      id: "model-283-link-procedure",
      label: "Página oficial del Modelo 283",
      sourceId: MODEL_283_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_283_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-link-help",
      label: "Ayuda técnica oficial del Modelo 283",
      sourceId: MODEL_283_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-link-register-design",
      label: "Diseño de registro oficial del Modelo 283",
      sourceId: MODEL_283_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-link-order",
      label: "Orden HAC/1031/2024",
      sourceId: MODEL_283_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-link-order-correction",
      label: "Corrección de errores de la Orden HAC/1031/2024",
      sourceId: MODEL_283_ORDER_CORRECTION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-link-royal-decree",
      label: "Real Decreto 710/2024",
      sourceId: MODEL_283_ROYAL_DECREE_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-283-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 283?",
      answer:
        "Una declaración informativa anual de ayudas recibidas en el marco del Régimen Fiscal Especial de las Illes Balears.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-territory",
      question: "¿Qué ámbito territorial menciona la ficha administrativa?",
      answer:
        "El ámbito territorial de la Comunidad Autónoma de las Illes Balears, sin que esta ficha determine la aplicación del régimen a un caso concreto.",
      sourceIds: [MODEL_283_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-rfb",
      question: "¿Qué significan las siglas RFB en esta ficha?",
      answer:
        "La ficha administrativa las utiliza para referirse al Régimen Fiscal Especial de las Illes Balears en el contexto de las ayudas descritas.",
      sourceIds: [MODEL_283_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-classification",
      question: "¿Cómo clasifica la AEAT el procedimiento?",
      answer:
        "Como un procedimiento tributario con tramitación electrónica y finalidad informativa.",
      sourceIds: [MODEL_283_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-channels",
      question: "¿Qué canales describe la ayuda oficial?",
      answer:
        "Un formulario en navegador y la importación y exportación de ficheros ajustados al diseño lógico del modelo.",
      sourceIds: [MODEL_283_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-file-extension",
      question: "¿Qué extensión de fichero identifica la ayuda?",
      answer:
        "La ayuda técnica identifica la extensión .283 para los archivos exportados por el formulario.",
      sourceIds: [MODEL_283_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-register-design",
      question: "¿Existe un diseño de registro oficial descargable?",
      answer:
        "Sí. El catálogo técnico enlaza un PDF de seis páginas cuya portada está rotulada para el ejercicio 2024.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        MODEL_283_REGISTER_DESIGN_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-static-form",
      question: "¿Ese PDF es un formulario estático para cumplimentar?",
      answer:
        "No. El archivo contiene el diseño de registro y se conserva como documentación técnica, sin miniatura de formulario.",
      sourceIds: [MODEL_283_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-register-age",
      question:
        "¿La referencia a 2024 permite extender el diseño a otros ejercicios?",
      answer:
        "No. La ficha conserva el rótulo temporal del documento y no presume su aplicación a ejercicios distintos.",
      sourceIds: [MODEL_283_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-283-faq-laws",
      question: "¿Qué normativa principal conserva la ficha?",
      answer:
        "La Orden HAC/1031/2024, su corrección de errores publicada por el BOE y el Real Decreto 710/2024, relativo al Régimen Fiscal Especial de las Illes Balears.",
      sourceIds: [
        MODEL_283_ORDER_SOURCE.id,
        MODEL_283_ORDER_CORRECTION_SOURCE.id,
        MODEL_283_ROYAL_DECREE_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_283_PROCEDURE_HOME_SOURCE.id,
      MODEL_283_PROCEDURE_RECORD_SOURCE.id,
      MODEL_283_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"283">;

export const PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_CONTENT_V1 = deepFreeze([
  MODEL_281_CONTENT,
  MODEL_282_CONTENT,
  MODEL_283_CONTENT,
] as const);
