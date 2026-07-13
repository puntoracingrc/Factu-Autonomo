import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_13_EXCISE_504_505_RELEASE_ID_V1 =
  "public-aeat-official-batch-13-excise-504-505.2026-07-13.v1" as const;

export type PublicAeatBatch13Excise504505CodeV1 = "504" | "505";

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

const MODELS_504_505_PROCEDURE_HOME_SOURCE = {
  id: "aeat.models-504-505.procedure-home.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelos 504 y 505 · página oficial compartida",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DN05.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "757092ae4745744173d4e537d76ddd6b759c541c6baf40d93cd4e5ccea31deac",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_504_505_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.models-504-505.procedure-record.2026-03-02",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento de los Modelos 504 y 505",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DN05.shtml",
  officialUpdatedOn: "2026-03-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d5b0a938c82d9d6ea154e22b7e1f2f7ccfc95948ba65222df10492a384a78858",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_504_505_ORDER_SOURCE = {
  id: "boe.models-504-505.order-hfp-626-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/626/2023, de 14 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-14425",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9cc076af014a7a5e0e45c785c7bcb1fce7ea7b93c0eb2eadd1c46480afdfbc5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_504_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_EXCISE_504_505_RELEASE_ID_V1,
  code: "504",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Solicitud de autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea",
  summary:
    "Solicitud que la Orden HFP/626/2023 identifica como Modelo 504 y cuyo formato electrónico figura en su anexo I.",
  searchTerms: [
    "modelo 504",
    "impuestos especiales",
    "impuestos especiales de fabricación",
    "Unión Europea",
    "expedición de productos",
    "recepción de productos",
    "solicitud de autorización",
    "envíos garantizados",
    "destinatario certificado",
    "expedidor certificado",
    "ventas a distancia",
    "Orden HFP 626 2023",
  ],
  sections: [
    {
      id: "model-504-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-504-purpose-request",
          heading: "Solicitud de autorización",
          text: "La Orden HFP/626/2023 identifica el Modelo 504 como la solicitud de autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea.",
          sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-504-purpose-shared-procedure",
          heading: "Procedimiento compartido con el Modelo 505",
          text: "La AEAT agrupa los Modelos 504 y 505 en una misma página y en una misma ficha administrativa de solicitud y autorización.",
          sourceIds: [
            MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
            MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-504-details",
      title: "Relación entre solicitud y autorización",
      kind: "DETAILS",
      items: [
        {
          id: "model-504-details-format",
          heading: "Formato electrónico",
          text: "El anexo I de la Orden HFP/626/2023 contiene el formato electrónico del Modelo 504.",
          sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-504-details-office",
          heading: "Intervención de la Oficina Gestora",
          text: "La ficha administrativa describe una fase de solicitud y una tramitación por la Oficina Gestora de Impuestos Especiales, que concluye con la autorización identificada como Modelo 505.",
          sourceIds: [MODELS_504_505_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-504-details-products",
          heading: "Productos descritos en la norma",
          text: "El anexo del Modelo 504 organiza la información para productos comprendidos en el ámbito de los impuestos sobre hidrocarburos, labores del tabaco, alcohol y bebidas alcohólicas.",
          sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-504-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-504-access-form",
          heading: "Formulario de la Sede electrónica",
          text: "La Orden HFP/626/2023 describe el Modelo 504 mediante formulario de la Sede electrónica y la página oficial ofrece gestiones electrónicas del procedimiento compartido.",
          sourceIds: [
            MODELS_504_505_ORDER_SOURCE.id,
            MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_504_505_PROCEDURE_HOME_SOURCE,
    MODELS_504_505_PROCEDURE_RECORD_SOURCE,
    MODELS_504_505_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-504-link-procedure",
      label: "Página oficial compartida de los Modelos 504 y 505",
      sourceId: MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-link-order",
      label: "Orden HFP/626/2023",
      sourceId: MODELS_504_505_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-504-faq-identity",
      question: "¿Qué identifica la norma como Modelo 504?",
      answer:
        "La solicitud de autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-faq-relation",
      question: "¿Qué relación tiene con el Modelo 505?",
      answer:
        "El 504 identifica la solicitud y el 505 la autorización que la ficha administrativa sitúa al final de la tramitación por la Oficina Gestora.",
      sourceIds: [
        MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
        MODELS_504_505_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-faq-shared-page",
      question: "¿Por qué aparecen ambos modelos en la misma página?",
      answer:
        "La AEAT los integra en un único procedimiento de solicitud y autorización relativo a expediciones o recepciones de productos.",
      sourceIds: [
        MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
        MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-faq-channel",
      question: "¿Qué canal describe la norma para el Modelo 504?",
      answer: "Un formulario de la Sede electrónica de la Agencia Tributaria.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-faq-format",
      question: "¿Dónde se define su formato electrónico?",
      answer: "En el anexo I de la Orden HFP/626/2023.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-faq-office",
      question: "¿Qué órgano interviene en la tramitación?",
      answer:
        "La ficha administrativa identifica a la Oficina Gestora de Impuestos Especiales en la fase de tramitación.",
      sourceIds: [MODELS_504_505_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-504-faq-authority-code",
      question: "¿Qué código identifica la autorización relacionada?",
      answer:
        "La Orden HFP/626/2023 denomina CARE al código de autorización de recepción o expedición generado en el Modelo 505.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
      MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"504">;

const MODEL_505_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_EXCISE_504_505_RELEASE_ID_V1,
  code: "505",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea",
  summary:
    "Autorización que la Orden HFP/626/2023 identifica como Modelo 505 y cuyo formato electrónico figura en su anexo II.",
  searchTerms: [
    "modelo 505",
    "impuestos especiales",
    "impuestos especiales de fabricación",
    "Unión Europea",
    "expedición de productos",
    "recepción de productos",
    "autorización",
    "Oficina Gestora",
    "CARE",
    "código de autorización",
    "envíos garantizados",
    "ventas a distancia",
    "Orden HFP 626 2023",
  ],
  sections: [
    {
      id: "model-505-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-505-purpose-authorization",
          heading: "Autorización de expedición o recepción",
          text: "La Orden HFP/626/2023 identifica el Modelo 505 como la autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea.",
          sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-505-purpose-result",
          heading: "Resultado del procedimiento compartido",
          text: "La ficha administrativa distingue la solicitud identificada como Modelo 504 y la autorización identificada como Modelo 505, expedida por la Oficina Gestora al finalizar la tramitación.",
          sourceIds: [MODELS_504_505_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-505-details",
      title: "Contenido documental de la autorización",
      kind: "DETAILS",
      items: [
        {
          id: "model-505-details-format",
          heading: "Formato electrónico",
          text: "El anexo II de la Orden HFP/626/2023 contiene el formato electrónico del Modelo 505.",
          sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-505-details-care",
          heading: "Código CARE",
          text: "La orden identifica el CARE como el código de autorización de recepción o expedición generado en el Modelo 505.",
          sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-505-details-shared",
          heading: "Página y ficha compartidas",
          text: "La AEAT reúne los Modelos 504 y 505 en una única página oficial y en una única ficha administrativa.",
          sourceIds: [
            MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
            MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-505-access",
      title: "Cómo se origina la autorización",
      kind: "ACCESS",
      items: [
        {
          id: "model-505-access-office",
          heading: "Expedición por la Oficina Gestora",
          text: "La ficha administrativa describe el Modelo 505 como la autorización que expide la Oficina Gestora tras la tramitación de la solicitud asociada.",
          sourceIds: [MODELS_504_505_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_504_505_PROCEDURE_HOME_SOURCE,
    MODELS_504_505_PROCEDURE_RECORD_SOURCE,
    MODELS_504_505_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-505-link-procedure",
      label: "Página oficial compartida de los Modelos 504 y 505",
      sourceId: MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-link-order",
      label: "Orden HFP/626/2023",
      sourceId: MODELS_504_505_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-505-faq-identity",
      question: "¿Qué identifica la norma como Modelo 505?",
      answer:
        "La autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-faq-relation",
      question: "¿Qué relación tiene con el Modelo 504?",
      answer:
        "El 504 identifica la solicitud y el 505 la autorización relacionada con esa solicitud dentro del procedimiento compartido.",
      sourceIds: [
        MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
        MODELS_504_505_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-faq-issuer",
      question: "¿Quién expide la autorización 505?",
      answer:
        "La ficha administrativa sitúa su expedición en la Oficina Gestora de Impuestos Especiales al finalizar la tramitación.",
      sourceIds: [MODELS_504_505_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-faq-care",
      question: "¿Qué es el código CARE?",
      answer:
        "La Orden HFP/626/2023 lo identifica como el código de autorización de recepción o expedición generado en el Modelo 505.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-faq-format",
      question: "¿Dónde se define su formato electrónico?",
      answer: "En el anexo II de la Orden HFP/626/2023.",
      sourceIds: [MODELS_504_505_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-faq-shared-page",
      question: "¿Por qué comparte página con el Modelo 504?",
      answer:
        "Porque la página oficial y la ficha administrativa reúnen la solicitud y su autorización dentro de un mismo procedimiento.",
      sourceIds: [
        MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
        MODELS_504_505_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-505-faq-order",
      question: "¿Qué norma aprueba el Modelo 505?",
      answer: "La Orden HFP/626/2023, de 14 de junio, publicada en el BOE.",
      sourceIds: [
        MODELS_504_505_PROCEDURE_HOME_SOURCE.id,
        MODELS_504_505_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"505">;

export const PUBLIC_AEAT_BATCH_13_EXCISE_504_505_CONTENT_V1 = deepFreeze([
  MODEL_504_CONTENT,
  MODEL_505_CONTENT,
] as const);
