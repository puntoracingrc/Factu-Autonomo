import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_RELEASE_ID_V1 =
  "public-aeat-official-batch-11-vat-special-318-341.2026-07-13.v1" as const;

export type PublicAeatBatch11VatSpecial318341CodeV1 =
  "318" | "319" | "322" | "341";

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
  id: "aeat.models-300-399.register-designs.2026-02-04",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro. Modelos 300 al 399",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-300-399.html",
  officialUpdatedOn: "2026-02-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7df7813fc7fea0d0f44ba6eada7cb578bb007ee5813f3aca5ede9b828470375e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_318_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-318.procedure-home.2026-06-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 318 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G419.shtml",
  officialUpdatedOn: "2026-06-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a1f04e319148bda97a45a1e4625de3505af57c0f426192196b0afdb8f9f15262",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_318_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-318.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 318",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G419.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4811e8be4cd8d20c704ac207b42d2865e5e762f1eb0153b6976e44a7733dd11a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_318_HELP_SOURCE = {
  id: "aeat.model-318.form-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 318 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-318.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f82691202d2004035d85d1a7ac5bddd3f1e3e461b1c9468bac9c2f8f9fd1f4fd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_318_ORDER_SOURCE = {
  id: "boe.model-318.order-hac-1270-2019.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1270/2019, de 5 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-18746",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "22871c28bb4be78771a078c1884ed085dccde087d834b89be2160dea4f99d96f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_319_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-319.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 319 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC68.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1e2615fe029ee904dba7973d46679296593314b66b6d8a8f62d6dbeb02f9e7ba",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_319_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-319.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 319",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC68.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "19dcd81a331eb944a73222b4666ad3636286bb64b2591fc53c32cb20b07f20cb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_319_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-319.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 319 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-319-pago_____cion-regimen-deposito-aduanero/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0092e5da7bfd7ec22672de2c62fa0b214e6b2cb7866a8055a431a5f926a6d67d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_319_FAQ_SOURCE = {
  id: "aeat.hydrocarbons.faq.2026-04-06",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "El IVA en operaciones con hidrocarburos · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/iva/iva-operaciones-hidrocarburos/preguntas-frecuentes.html",
  officialUpdatedOn: "2026-04-06",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9c93169506adb20a90f65e8aa250b7d550c7ff712716b8bf4adcaa3b86b51ffc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_319_ORDER_SOURCE = {
  id: "boe.model-319.order-hac-1495-2025.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1495/2025, de 17 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26216",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ee2b00d8f1258fdd18f7fd22ce32d18b9f1ee54a6b77c40c5b5d979c48cd5e2d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_322_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-322.procedure-home.2026-02-13",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 322 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G407.shtml",
  officialUpdatedOn: "2026-02-13",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f5aa0ea6dbe3c7f13914b7639ab4f91032822ad75ca1e929facf034f62853163",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_322_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-322.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 322",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G407.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "22953842d7573ef0d19b86f255629a9105bf67d3d167e382a12c15caa4c8f103",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_322_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-322.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 322 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-322-iva-dades-modelo-mensual_/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bc060a624de7ed793094904825776affd22982d1b4a48b47a9c338e6250edbb4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_322_HELP_SOURCE = {
  id: "aeat.model-322.form-help.2026-02-01",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 322 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-322.html",
  officialUpdatedOn: "2026-02-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f88c6e99c7d968fe191e168784d5e8ee59c57142a70228eba37153666aceeecf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_322_BATCH_HELP_SOURCE = {
  id: "aeat.declarations.batch-upload-help.2026-01-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Cómo presentar declaraciones por lotes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/presentacion-lotes.html",
  officialUpdatedOn: "2026-01-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bfe3b260145e0a6413003e95d5b47c1e24ec7a8858eafd3d91895d8960a5f066",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_322_ORDER_SOURCE = {
  id: "boe.model-322.order-eha-3434-2007.original",
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

const MODEL_341_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-341.procedure-home.2026-02-13",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 341 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ10.shtml",
  officialUpdatedOn: "2026-02-13",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d92cf7ab284e7a369d370d14d2b91334a743b469d7cc73ce31a1e5ffcc18e4a5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_341_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-341.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 341",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "705a4fd0b92aa3f1fc2efdc45346749647e0d9b880e7f186d746545a1c6b80c2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_341_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-341.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 341 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-341-iva-egimen-especial-pesca_/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4a0a0063b1d00a746f2ba523b102856a365edfaeea644c5ffd6905086071d3df",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_341_ORDER_SOURCE = {
  id: "boe.model-341.order-2000-12-15.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 15 de diciembre de 2000",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2000-22794",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "65588218a4917cee13228430bb76b8737b32a6d6c7afe77b8eab21c93485c5ad",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_318_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_RELEASE_ID_V1,
  code: "318",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Regularización de las proporciones de tributación de los períodos de liquidación anteriores al inicio de la realización habitual de entregas de bienes o prestaciones de servicios.",
  summary:
    "Modelo de IVA que la AEAT identifica con la regularización de las proporciones de tributación de períodos anteriores al inicio de la realización habitual de entregas de bienes o prestaciones de servicios, con formulario en línea y diseño de registro oficial.",
  searchTerms: [
    "modelo 318",
    "IVA",
    "regularización de las proporciones de tributación",
    "regularizacion proporciones",
    "períodos de liquidación anteriores",
    "inicio de actividad",
    "entregas de bienes",
    "prestaciones de servicios",
    "Administración tributaria común",
    "Administraciones forales",
    "formulario en línea",
    "diseño de registro 318",
    "Orden HAC 1270 2019",
  ],
  sections: [
    {
      id: "model-318-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-318-purpose-identity",
          heading: "Regularización de proporciones de tributación",
          text: "El índice de modelos y la portada del procedimiento identifican el Modelo 318 como una declaración de IVA sobre la regularización de las proporciones de tributación de períodos anteriores al inicio de la realización habitual de entregas de bienes o prestaciones de servicios.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_318_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-318-purpose-record",
          heading: "Descripción administrativa de la regularización",
          text: "La ficha administrativa relaciona la regularización con cuotas de IVA devueltas y con cambios entre la competencia exaccionadora o las proporciones atribuidas a Administraciones tributarias comunes y forales. Esta ficha no determina si esa descripción corresponde a un caso concreto.",
          sourceIds: [MODEL_318_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-318-access",
      title: "Canal electrónico descrito",
      kind: "ACCESS",
      items: [
        {
          id: "model-318-access-browser-form",
          heading: "Formulario cumplimentado en línea",
          text: "La ayuda técnica describe un formulario que se cumplimenta en línea. Esta ficha registra el tipo de canal y no enlaza el destino operativo.",
          sourceIds: [
            MODEL_318_PROCEDURE_HOME_SOURCE.id,
            MODEL_318_PROCEDURE_RECORD_SOURCE.id,
            MODEL_318_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-318-access-local-data",
          heading: "Funciones de validación e intercambio de datos",
          text: "La ayuda oficial documenta funciones del formulario para validar, guardar y cargar datos, así como importar o exportar un fichero con extensión propia del modelo.",
          sourceIds: [MODEL_318_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-318-details",
      title: "Documentación y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-318-details-register-design",
          heading: "Diseño de registro en hoja de cálculo",
          text: "El catálogo técnico de la AEAT incluye para el Modelo 318 un diseño de registro en formato de hoja de cálculo identificado para ejercicios 2019 y siguientes. No se trata de un PDF de formulario en blanco.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-318-details-order",
          heading: "Orden de aprobación",
          text: "La Orden HAC/1270/2019, de 5 de noviembre, es la referencia del BOE registrada para la aprobación del Modelo 318.",
          sourceIds: [MODEL_318_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_318_PROCEDURE_HOME_SOURCE,
    MODEL_318_PROCEDURE_RECORD_SOURCE,
    MODEL_318_HELP_SOURCE,
    MODEL_318_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-318-link-procedure",
      label: "Página oficial del Modelo 318",
      sourceId: MODEL_318_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_318_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-link-help",
      label: "Ayuda técnica oficial del formulario",
      sourceId: MODEL_318_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-link-designs",
      label: "Diseños de registro de los modelos 300 al 399",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-link-order",
      label: "Orden HAC/1270/2019",
      sourceId: MODEL_318_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-318-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 318?",
      answer:
        "Una declaración de IVA sobre la regularización de las proporciones de tributación de períodos anteriores al inicio de la realización habitual de entregas de bienes o prestaciones de servicios.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_318_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-object",
      question: "¿Qué objeto describe la ficha del procedimiento?",
      answer:
        "Describe una regularización de cuotas de IVA devueltas vinculada a cambios entre Administraciones tributarias comunes y forales o a variaciones sustanciales de las proporciones de tributación.",
      sourceIds: [MODEL_318_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-channel",
      question: "¿Qué canal técnico documenta la AEAT?",
      answer: "Un formulario electrónico que se cumplimenta en línea.",
      sourceIds: [
        MODEL_318_PROCEDURE_RECORD_SOURCE.id,
        MODEL_318_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-validation",
      question: "¿El formulario dispone de validación?",
      answer:
        "Sí. La ayuda técnica documenta la detección de avisos y errores dentro del formulario.",
      sourceIds: [MODEL_318_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-data-files",
      question:
        "¿La ayuda describe funciones para guardar o intercambiar datos?",
      answer:
        "Sí. Documenta funciones para guardar y cargar datos y para importar o exportar ficheros asociados al modelo.",
      sourceIds: [MODEL_318_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-register-design",
      question: "¿Existe un diseño de registro oficial?",
      answer:
        "Sí. El catálogo técnico de la AEAT enlaza un diseño en formato de hoja de cálculo para el Modelo 318.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-pdf",
      question: "¿El diseño registrado es un PDF de formulario en blanco?",
      answer:
        "No. La fuente consultada lo publica como hoja de cálculo y la ayuda describe un formulario en línea.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id, MODEL_318_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-318-faq-order",
      question: "¿Qué norma de aprobación está enlazada?",
      answer: "La Orden HAC/1270/2019, de 5 de noviembre.",
      sourceIds: [MODEL_318_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_318_PROCEDURE_HOME_SOURCE.id,
      MODEL_318_PROCEDURE_RECORD_SOURCE.id,
      MODEL_318_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"318">;

const MODEL_319_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_RELEASE_ID_V1,
  code: "319",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Pago a cuenta del IVA correspondiente a las entregas de gasolinas, gasóleos y biocarburantes posteriores a la ultimación del régimen de depósito distinto del aduanero",
  summary:
    "Modelo de pago a cuenta del IVA que la AEAT vincula a determinadas entregas de gasolinas, gasóleos y biocarburantes posteriores a la ultimación del régimen de depósito distinto del aduanero, con tramitación electrónica y documentación oficial específica.",
  searchTerms: [
    "modelo 319",
    "IVA",
    "pago a cuenta",
    "gasolinas",
    "gasóleos",
    "biocarburantes",
    "gasolinas gasoleos biocarburantes",
    "hidrocarburos",
    "depósito fiscal",
    "depósito distinto del aduanero",
    "ultimación del régimen",
    "formulario electrónico",
    "diseño de registro 319",
    "Orden HAC 1495 2025",
  ],
  sections: [
    {
      id: "model-319-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-319-purpose-identity",
          heading: "Pago a cuenta del IVA sobre determinados carburantes",
          text: "El índice y la portada oficial identifican el Modelo 319 con el pago a cuenta del IVA correspondiente a entregas de gasolinas, gasóleos y biocarburantes posteriores a la ultimación del régimen de depósito distinto del aduanero.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_319_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-319-purpose-record",
          heading: "Carburantes que abandonan el régimen de depósito",
          text: "La ficha administrativa describe como objeto posibilitar el pago a cuenta con ocasión de la entrega de determinados carburantes que abandonan el régimen de depósito distinto del aduanero. Esta ficha no evalúa supuestos concretos.",
          sourceIds: [MODEL_319_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-319-access",
      title: "Canal y documentación electrónica",
      kind: "ACCESS",
      items: [
        {
          id: "model-319-access-browser-form",
          heading: "Tramitación electrónica",
          text: "La portada y la ficha del procedimiento registran una tramitación electrónica, y las instrucciones oficiales describen el acceso electrónico al modelo. Aquí se informa del canal sin enlazar el destino operativo.",
          sourceIds: [
            MODEL_319_PROCEDURE_HOME_SOURCE.id,
            MODEL_319_PROCEDURE_RECORD_SOURCE.id,
            MODEL_319_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-319-access-information",
          heading: "Instrucciones y preguntas frecuentes oficiales",
          text: "La página del modelo enlaza instrucciones propias y una colección de preguntas frecuentes sobre el IVA en operaciones con hidrocarburos.",
          sourceIds: [
            MODEL_319_PROCEDURE_HOME_SOURCE.id,
            MODEL_319_INSTRUCTIONS_SOURCE.id,
            MODEL_319_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-319-details",
      title: "Diseño técnico y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-319-details-register-design",
          heading: "Diseño de registro en hoja de cálculo",
          text: "El catálogo técnico de la AEAT incluye para el Modelo 319 un diseño de registro en formato de hoja de cálculo identificado para ejercicios 2026 y siguientes. No es un PDF de formulario en blanco.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-319-details-order",
          heading: "Orden de aprobación",
          text: "La Orden HAC/1495/2025, de 17 de diciembre, es la referencia del BOE registrada para la aprobación del Modelo 319.",
          sourceIds: [MODEL_319_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_319_PROCEDURE_HOME_SOURCE,
    MODEL_319_PROCEDURE_RECORD_SOURCE,
    MODEL_319_INSTRUCTIONS_SOURCE,
    MODEL_319_FAQ_SOURCE,
    MODEL_319_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-319-link-procedure",
      label: "Página oficial del Modelo 319",
      sourceId: MODEL_319_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_319_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-link-instructions",
      label: "Instrucciones oficiales del Modelo 319",
      sourceId: MODEL_319_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-link-faq",
      label: "Preguntas frecuentes oficiales sobre hidrocarburos",
      sourceId: MODEL_319_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-link-designs",
      label: "Diseños de registro de los modelos 300 al 399",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-link-order",
      label: "Orden HAC/1495/2025",
      sourceId: MODEL_319_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-319-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 319?",
      answer:
        "El pago a cuenta del IVA correspondiente a entregas de gasolinas, gasóleos y biocarburantes posteriores a la ultimación del régimen de depósito distinto del aduanero.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_319_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-object",
      question: "¿Cómo describe su objeto la ficha administrativa?",
      answer:
        "Como un mecanismo para posibilitar el pago a cuenta con ocasión de la entrega de determinados carburantes que abandonan el régimen de depósito distinto del aduanero.",
      sourceIds: [MODEL_319_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-products",
      question: "¿Qué tipos generales de productos menciona su denominación?",
      answer: "Gasolinas, gasóleos y biocarburantes.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_319_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-channel",
      question: "¿Qué canal describe la AEAT para el Modelo 319?",
      answer:
        "La portada, la ficha y las instrucciones registran un canal de tramitación electrónica.",
      sourceIds: [
        MODEL_319_PROCEDURE_HOME_SOURCE.id,
        MODEL_319_PROCEDURE_RECORD_SOURCE.id,
        MODEL_319_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-instructions",
      question: "¿La AEAT publica instrucciones específicas?",
      answer:
        "Sí. La página oficial del modelo enlaza instrucciones propias del Modelo 319.",
      sourceIds: [
        MODEL_319_PROCEDURE_HOME_SOURCE.id,
        MODEL_319_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-hydrocarbon-faq",
      question:
        "¿Existe una sección oficial de preguntas frecuentes relacionada?",
      answer:
        "Sí. La página del modelo enlaza la colección de preguntas frecuentes sobre el IVA en operaciones con hidrocarburos.",
      sourceIds: [MODEL_319_PROCEDURE_HOME_SOURCE.id, MODEL_319_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-register-design",
      question: "¿Hay un diseño de registro oficial?",
      answer:
        "Sí. El catálogo técnico de la AEAT enlaza un diseño en hoja de cálculo identificado para ejercicios 2026 y siguientes.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-319-faq-order",
      question: "¿Qué norma de aprobación está enlazada?",
      answer: "La Orden HAC/1495/2025, de 17 de diciembre.",
      sourceIds: [MODEL_319_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_319_PROCEDURE_HOME_SOURCE.id,
      MODEL_319_PROCEDURE_RECORD_SOURCE.id,
      MODEL_319_INSTRUCTIONS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"319">;

const MODEL_322_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_RELEASE_ID_V1,
  code: "322",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Grupos de entidades. Modelo individual. Autoliquidación mensual.",
  summary:
    "Autoliquidación mensual individual del IVA para grupos de entidades, con formulario electrónico, canal adicional por lotes mediante fichero, instrucciones, ayuda técnica y diseño de registro oficial.",
  searchTerms: [
    "modelo 322",
    "IVA",
    "grupos de entidades",
    "grupos entidades individual",
    "modelo individual",
    "autoliquidación mensual",
    "régimen especial del grupo de entidades",
    "formulario electrónico",
    "presentación por lotes",
    "carga de ficheros",
    "diseño de registro 322",
    "Orden EHA 3434 2007",
  ],
  sections: [
    {
      id: "model-322-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-322-purpose-identity",
          heading: "Modelo individual de grupos de entidades",
          text: "El índice y la portada oficial identifican el Modelo 322 como la autoliquidación mensual individual del IVA para grupos de entidades.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_322_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-322-purpose-record",
          heading: "Autoliquidación mensual individual",
          text: "La ficha administrativa describe como objeto facilitar la autoliquidación mensual del IVA correspondiente al grupo de entidades mediante el modelo individual. Esta ficha no determina a quién resulta aplicable el régimen.",
          sourceIds: [MODEL_322_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-322-access",
      title: "Canales electrónicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-322-access-browser-form",
          heading: "Formulario electrónico",
          text: "La portada, la ficha y la ayuda técnica describen una tramitación electrónica mediante formulario. Aquí se registra el canal sin enlazar el destino operativo.",
          sourceIds: [
            MODEL_322_PROCEDURE_HOME_SOURCE.id,
            MODEL_322_PROCEDURE_RECORD_SOURCE.id,
            MODEL_322_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-322-access-batches",
          heading: "Canal adicional por lotes",
          text: "La portada incluye una modalidad por lotes y la ayuda general de la AEAT explica que este canal selecciona varios ficheros del mismo modelo para su tratamiento conjunto.",
          sourceIds: [
            MODEL_322_PROCEDURE_HOME_SOURCE.id,
            MODEL_322_BATCH_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-322-details",
      title: "Ayuda, diseño y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-322-details-help",
          heading: "Instrucciones y ayuda técnica",
          text: "La AEAT publica instrucciones del modelo y una ayuda técnica del formulario que documenta funciones de validación, guardado e intercambio de datos.",
          sourceIds: [
            MODEL_322_INSTRUCTIONS_SOURCE.id,
            MODEL_322_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-322-details-register-design",
          heading: "Diseño de registro en hoja de cálculo",
          text: "El catálogo técnico enlaza para el Modelo 322 un diseño de registro en hoja de cálculo identificado para 2026 y siguientes. No se registra como PDF de formulario.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-322-details-order",
          heading: "Orden de aprobación",
          text: "La Orden EHA/3434/2007, de 23 de noviembre, es la referencia del BOE registrada para la aprobación del Modelo 322 individual junto con otros modelos del régimen especial del grupo de entidades.",
          sourceIds: [MODEL_322_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_322_PROCEDURE_HOME_SOURCE,
    MODEL_322_PROCEDURE_RECORD_SOURCE,
    MODEL_322_INSTRUCTIONS_SOURCE,
    MODEL_322_HELP_SOURCE,
    MODEL_322_BATCH_HELP_SOURCE,
    MODEL_322_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-322-link-procedure",
      label: "Página oficial del Modelo 322",
      sourceId: MODEL_322_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_322_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-link-instructions",
      label: "Instrucciones oficiales del Modelo 322",
      sourceId: MODEL_322_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-link-help",
      label: "Ayuda técnica oficial del formulario",
      sourceId: MODEL_322_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-link-batches",
      label: "Ayuda oficial de declaraciones por lotes",
      sourceId: MODEL_322_BATCH_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-link-designs",
      label: "Diseños de registro de los modelos 300 al 399",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-link-order",
      label: "Orden EHA/3434/2007",
      sourceId: MODEL_322_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-322-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 322?",
      answer:
        "La autoliquidación mensual individual del IVA para grupos de entidades.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_322_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-object",
      question: "¿Qué objeto describe la ficha administrativa?",
      answer:
        "Facilitar la autoliquidación mensual del IVA correspondiente al grupo de entidades mediante el modelo individual.",
      sourceIds: [MODEL_322_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-individual",
      question:
        "¿La denominación oficial lo identifica como modelo individual?",
      answer:
        "Sí. Tanto el índice como la portada y la ficha administrativa emplean esa denominación.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_322_PROCEDURE_HOME_SOURCE.id,
        MODEL_322_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-channel",
      question: "¿Existe un formulario electrónico?",
      answer:
        "Sí. La ficha registra tramitación electrónica y la AEAT publica una ayuda específica del formulario.",
      sourceIds: [
        MODEL_322_PROCEDURE_RECORD_SOURCE.id,
        MODEL_322_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-batches",
      question: "¿La AEAT describe una modalidad por lotes?",
      answer:
        "Sí. La portada enlaza esa modalidad y la ayuda oficial explica el tratamiento conjunto de varios ficheros del mismo modelo.",
      sourceIds: [
        MODEL_322_PROCEDURE_HOME_SOURCE.id,
        MODEL_322_BATCH_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-form-functions",
      question: "¿Qué funciones generales documenta la ayuda del formulario?",
      answer:
        "Documenta validación, guardado y carga de datos, además de importación y exportación de ficheros asociados al modelo.",
      sourceIds: [MODEL_322_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-instructions",
      question: "¿La AEAT publica instrucciones del Modelo 322?",
      answer: "Sí. La página oficial enlaza instrucciones específicas.",
      sourceIds: [
        MODEL_322_PROCEDURE_HOME_SOURCE.id,
        MODEL_322_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-register-design",
      question: "¿Existe un diseño de registro oficial?",
      answer:
        "Sí. El catálogo de la AEAT enlaza un diseño en hoja de cálculo identificado para 2026 y siguientes.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-322-faq-order",
      question: "¿Qué norma de aprobación está enlazada?",
      answer: "La Orden EHA/3434/2007, de 23 de noviembre.",
      sourceIds: [MODEL_322_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_322_PROCEDURE_HOME_SOURCE.id,
      MODEL_322_PROCEDURE_RECORD_SOURCE.id,
      MODEL_322_HELP_SOURCE.id,
      MODEL_322_BATCH_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"322">;

const MODEL_341_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_RELEASE_ID_V1,
  code: "341",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Solicitud de reintegro compensaciones en el Régimen especial de agricultura, ganadería y pesca.",
  summary:
    "Solicitud vinculada al reintegro de compensaciones del régimen especial de agricultura, ganadería y pesca en el IVA, con tramitación electrónica, instrucciones y diseño de registro oficial.",
  searchTerms: [
    "modelo 341",
    "IVA",
    "solicitud de reintegro",
    "reintegro de compensaciones",
    "reintegro compensaciones agricultura",
    "régimen especial de agricultura ganadería y pesca",
    "agricultura",
    "ganadería",
    "pesca",
    "formulario electrónico",
    "diseño de registro 341",
    "Orden de 15 de diciembre de 2000",
  ],
  sections: [
    {
      id: "model-341-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-341-purpose-identity",
          heading: "Solicitud de reintegro de compensaciones",
          text: "El índice y la portada oficial identifican el Modelo 341 como una solicitud de reintegro de compensaciones en el régimen especial de agricultura, ganadería y pesca.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_341_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-341-purpose-record",
          heading: "Procedimiento asociado al régimen especial",
          text: "La ficha administrativa sitúa el modelo dentro del IVA y lo describe como solicitud de reintegro de compensaciones del régimen especial de agricultura, ganadería y pesca. Esta ficha no evalúa si corresponde a una situación concreta.",
          sourceIds: [MODEL_341_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-341-access",
      title: "Canal e información oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-341-access-browser-form",
          heading: "Tramitación electrónica",
          text: "La portada y la ficha administrativa describen una tramitación telemática, y las instrucciones oficiales explican el acceso electrónico. Aquí se registra el canal sin enlazar el destino operativo.",
          sourceIds: [
            MODEL_341_PROCEDURE_HOME_SOURCE.id,
            MODEL_341_PROCEDURE_RECORD_SOURCE.id,
            MODEL_341_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-341-access-instructions",
          heading: "Instrucciones oficiales disponibles",
          text: "La página del modelo enlaza instrucciones propias que describen la identidad general del modelo, su canal y la estructura informativa del formulario.",
          sourceIds: [
            MODEL_341_PROCEDURE_HOME_SOURCE.id,
            MODEL_341_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-341-details",
      title: "Diseño técnico y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-341-details-register-design",
          heading: "Diseño de registro en hoja de cálculo",
          text: "El catálogo técnico de la AEAT enlaza para el Modelo 341 un diseño de registro en hoja de cálculo identificado para ejercicios 2016 y siguientes y actualizado en 2020. No se registra como PDF de formulario.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-341-details-order",
          heading: "Orden de aprobación",
          text: "La Orden de 15 de diciembre de 2000 es la referencia original del BOE registrada para la aprobación del Modelo 341.",
          sourceIds: [MODEL_341_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_341_PROCEDURE_HOME_SOURCE,
    MODEL_341_PROCEDURE_RECORD_SOURCE,
    MODEL_341_INSTRUCTIONS_SOURCE,
    MODEL_341_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-341-link-procedure",
      label: "Página oficial del Modelo 341",
      sourceId: MODEL_341_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_341_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-link-instructions",
      label: "Instrucciones oficiales del Modelo 341",
      sourceId: MODEL_341_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-link-designs",
      label: "Diseños de registro de los modelos 300 al 399",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-link-order",
      label: "Orden de 15 de diciembre de 2000",
      sourceId: MODEL_341_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-341-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 341?",
      answer:
        "Una solicitud de reintegro de compensaciones en el régimen especial de agricultura, ganadería y pesca.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_341_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-tax",
      question: "¿Con qué impuesto relaciona la AEAT este modelo?",
      answer: "Con el Impuesto sobre el Valor Añadido.",
      sourceIds: [
        MODEL_341_PROCEDURE_HOME_SOURCE.id,
        MODEL_341_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-regime",
      question: "¿Qué régimen aparece en su denominación oficial?",
      answer: "El régimen especial de agricultura, ganadería y pesca.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_341_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-object",
      question: "¿Qué objeto describe la ficha administrativa?",
      answer:
        "La solicitud de reintegro de compensaciones asociada a ese régimen especial del IVA.",
      sourceIds: [MODEL_341_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-channel",
      question: "¿Qué canal registra la AEAT?",
      answer:
        "La portada, la ficha y las instrucciones describen tramitación electrónica.",
      sourceIds: [
        MODEL_341_PROCEDURE_HOME_SOURCE.id,
        MODEL_341_PROCEDURE_RECORD_SOURCE.id,
        MODEL_341_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-instructions",
      question: "¿La AEAT publica instrucciones del Modelo 341?",
      answer: "Sí. La página oficial enlaza instrucciones específicas.",
      sourceIds: [
        MODEL_341_PROCEDURE_HOME_SOURCE.id,
        MODEL_341_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-register-design",
      question: "¿Existe un diseño de registro oficial?",
      answer:
        "Sí. El catálogo técnico de la AEAT enlaza un diseño en hoja de cálculo para el Modelo 341.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-341-faq-order",
      question: "¿Qué norma de aprobación está enlazada?",
      answer: "La Orden de 15 de diciembre de 2000.",
      sourceIds: [MODEL_341_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_341_PROCEDURE_HOME_SOURCE.id,
      MODEL_341_PROCEDURE_RECORD_SOURCE.id,
      MODEL_341_INSTRUCTIONS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"341">;

export const PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_CONTENT_V1 = deepFreeze([
  MODEL_318_CONTENT,
  MODEL_319_CONTENT,
  MODEL_322_CONTENT,
  MODEL_341_CONTENT,
] as const);
