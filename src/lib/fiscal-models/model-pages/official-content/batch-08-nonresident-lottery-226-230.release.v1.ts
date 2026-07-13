import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_RELEASE_ID_V1 =
  "public-aeat-official-batch-08-nonresident-lottery-226-230.2026-07-13.v1" as const;

export type PublicAeatBatch08NonresidentLottery226230CodeV1 =
  "226" | "228" | "230";

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

const LAW_26_2014_SOURCE = {
  id: "boe.irpf-irnr-law-26-2014",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 26/2014, de 27 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-12327",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a3dc07d5d354cf66a15afbbe56b9b9876b9ece79e6686f793c36b9093464d0cd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2474_2015_SOURCE = {
  id: "boe.models-226-228.order-hap-2474-2015",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2474/2015, de 19 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-12690",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "103542743e3ce6d4f29ec54bf75f57bee14b23ab8e1aead75d33d16f6fcd68d9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_70_2013_SOURCE = {
  id: "boe.models-136-230.order-hap-70-2013",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/70/2013, de 30 de enero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-952",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7854609894dde3de58f6a9628e275b96246c4990880dad26242f8e37c5aaff16",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2194_2013_SOURCE = {
  id: "boe.tax-filing-order-hap-2194-2013",
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

const ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE = {
  id: "boe.aeat-electronic-office-resolution-2009",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 28 de diciembre de 2009",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-21051",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "39f508e7bfcb960751f2e0afb4019cfcb35916600b9fa82ad98ded1b4f82d274",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_226_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_RELEASE_ID_V1,
  code: "226",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Solicitud de aplicación del régimen opcional para contribuyentes personas físicas residentes en otros Estados miembros de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
  summary:
    "Solicitud que la AEAT identifica con el régimen opcional para determinadas personas físicas contribuyentes por el IRNR y residentes en otros Estados de la UE o del EEE con efectivo intercambio de información tributaria.",
  searchTerms: [
    "modelo 226",
    "régimen opcional",
    "impuesto sobre la renta de no residentes",
    "IRNR",
    "personas físicas no residentes",
    "Unión Europea",
    "Espacio Económico Europeo",
    "efectivo intercambio de información tributaria",
    "solicitud régimen opcional IRPF",
    "presentación electrónica modelo 226",
    "predeclaración modelo 226",
    "fichero .226",
    "apoderamiento entre cónyuges",
    "instrucciones modelo 226",
    "diseño de registro 226",
    "Orden HAP 2474 2015",
  ],
  sections: [
    {
      id: "model-226-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-226-purpose-identity",
          heading: "Solicitud del régimen opcional",
          text: "El índice de modelos y la página del procedimiento identifican el Modelo 226 como la solicitud de aplicación del régimen opcional para contribuyentes personas físicas residentes en otros Estados miembros de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-226.procedure-home.2026-07-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-226-purpose-record",
          heading: "Descripción administrativa del procedimiento",
          text: "La ficha administrativa relaciona la solicitud con el régimen opcional de tributación por el IRPF previsto para determinadas personas físicas contribuyentes por el IRNR que cumplan las condiciones normativas. Esta ficha informativa no comprueba esas condiciones ni decide la aplicación del régimen.",
          sourceIds: ["aeat.model-226.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-226-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-226-access-browser-file",
          heading: "Formulario web y fichero .226",
          text: "La ayuda oficial describe un formulario en navegador y las funciones de exportar e importar un fichero de texto con extensión .226. La referencia a esos canales es informativa y esta página no inicia ninguna presentación.",
          sourceIds: [
            "aeat.model-226.procedure-home.2026-07-02",
            "aeat.model-226.electronic-help.2026-01-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-226-access-predeclaration",
          heading: "Predeclaración generada desde la web",
          text: "La AEAT también describe una modalidad que genera una solicitud en PDF después de utilizar el formulario. No se enlaza un formulario PDF estático y vacío, por lo que esta ficha representa el canal web y no muestra una miniatura de formulario.",
          sourceIds: ["aeat.model-226.predeclaration-help.2026-01-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-226-access-joint",
          heading: "Ayuda separada para solicitudes conjuntas",
          text: "La sede mantiene una ayuda específica sobre el apoderamiento entre cónyuges que acompaña a la modalidad conjunta. Se conserva como referencia externa y no autoriza ni tramita representaciones desde esta aplicación.",
          sourceIds: ["aeat.model-226.spouse-authorization-help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-226-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-226-details-instructions",
          heading: "Instrucciones oficiales en PDF",
          text: "La página del procedimiento enlaza un documento oficial de ocho páginas con instrucciones sobre la solicitud. El PDF conserva referencias transitorias a 2015 y 2016; se registra por su huella y metadatos sin inferir que esas referencias describan un ejercicio posterior ni convertirlo en un formulario para operar desde esta web.",
          sourceIds: [
            "aeat.model-226.procedure-home.2026-07-02",
            "aeat.model-226.instructions-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-226-details-register-design",
          heading: "Diseño de registro identificado",
          text: "El catálogo técnico de la AEAT incluye para el Modelo 226 un diseño de registro rotulado para el ejercicio 2016 y siguientes. Esta ficha solo registra la existencia de esa referencia técnica.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-226-details-laws",
          heading: "Normativa oficial registrada",
          text: "La ficha administrativa cita la Ley 26/2014 y la Orden HAP/2474/2015. Esta última aprueba, entre otros, el modelo de solicitud del régimen opcional regulado en el texto refundido de la Ley del IRNR.",
          sourceIds: [LAW_26_2014_SOURCE.id, ORDER_HAP_2474_2015_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-226.procedure-home.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 226 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF08.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bfb12809e9ea3d026c9c7bba6977458e7cde2a0b548fae049ca82e9ba07b937e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-226.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 226",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF08.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b79460dafea11303f377325b38bc05d46bc452c57bb4c72c987df63d6dfa736e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-226.electronic-help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 226",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-226/presentacion-electronica-modelo-226.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9ff15d436e1ae5db67f26f103a1e734c0cf73b652c371dbbd2aa6ec925e27706",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-226.predeclaration-help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Predeclaración del Modelo 226",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-226/predeclaracion-modelo-226.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "178fc702bd0e3b931f5e28678a3398f4db2f0551364e124015c839da992e53ad",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-226.spouse-authorization-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 226 · apoderamiento entre cónyuges",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-226/modelo-226-apoderamiento-conyuges.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a12a1ce5a8ccce37fbb8122e133b0d3335c30a5296be416929f3f8233135fdee",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-226.instructions-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones de la solicitud del régimen opcional",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GF08/instr_solicitud_regimen.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "35394362ea8b5fef4c2831dd6f7203790c9e8a2dfe9a916c989166d9143d6d97",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    LAW_26_2014_SOURCE,
    ORDER_HAP_2474_2015_SOURCE,
  ],
  documents: [
    {
      id: "model-226-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones de la solicitud del régimen opcional",
      sourceId: "aeat.model-226.instructions-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-226.procedure-home.2026-07-02",
      mediaType: "application/pdf",
      fileName: "instr_solicitud_regimen.pdf",
      byteLength: 178812,
      pageCount: 8,
      sha256:
        "35394362ea8b5fef4c2831dd6f7203790c9e8a2dfe9a916c989166d9143d6d97",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-226-link-procedure",
      label: "Página oficial del Modelo 226",
      sourceId: "aeat.model-226.procedure-home.2026-07-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-226.procedure-record.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-electronic-help",
      label: "Ayuda oficial de presentación electrónica",
      sourceId: "aeat.model-226.electronic-help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-predeclaration",
      label: "Ayuda oficial de la predeclaración",
      sourceId: "aeat.model-226.predeclaration-help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-spouse-authorization",
      label: "Ayuda oficial sobre apoderamiento entre cónyuges",
      sourceId: "aeat.model-226.spouse-authorization-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-instructions",
      label: "Instrucciones oficiales en PDF",
      sourceId: "aeat.model-226.instructions-pdf.captured-2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-register-design",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-link-order",
      label: "Orden HAP/2474/2015",
      sourceId: ORDER_HAP_2474_2015_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-226-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 226?",
      answer:
        "La solicitud de aplicación del régimen opcional para contribuyentes personas físicas residentes en otros Estados miembros de la UE o del EEE con efectivo intercambio de información tributaria.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-purpose",
      question: "¿Qué describe la ficha administrativa del procedimiento?",
      answer:
        "Relaciona el modelo con el régimen opcional de tributación por el IRPF previsto para determinadas personas físicas contribuyentes por el IRNR, sin que esta web compruebe sus condiciones.",
      sourceIds: ["aeat.model-226.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-channels",
      question: "¿Qué canales de cumplimentación describe la AEAT?",
      answer:
        "Un formulario web, la importación y exportación de un fichero .226 y una modalidad de predeclaración generada desde el navegador.",
      sourceIds: [
        "aeat.model-226.electronic-help.2026-01-09",
        "aeat.model-226.predeclaration-help.2026-01-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-static-form",
      question:
        "¿Existe un PDF estático y vacío del formulario 226 en estas fuentes?",
      answer:
        "No. La ayuda oficial explica que el PDF de predeclaración se genera después de cumplimentar el formulario web; el PDF descargable registrado aquí contiene instrucciones.",
      sourceIds: [
        "aeat.model-226.predeclaration-help.2026-01-09",
        "aeat.model-226.instructions-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-file",
      question: "¿Qué formato de fichero menciona la ayuda oficial?",
      answer:
        "Un fichero de texto cuya extensión es .226, que el formulario permite exportar e importar.",
      sourceIds: ["aeat.model-226.electronic-help.2026-01-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-joint",
      question: "¿Hay una ayuda específica para la modalidad conjunta?",
      answer:
        "Sí. La sede publica una ayuda separada sobre el apoderamiento entre cónyuges asociado a solicitudes conjuntas.",
      sourceIds: ["aeat.model-226.spouse-authorization-help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-instructions",
      question: "¿Publica la AEAT instrucciones descargables?",
      answer:
        "Sí. La página del procedimiento enlaza un PDF oficial de ocho páginas dedicado a la solicitud del régimen opcional.",
      sourceIds: [
        "aeat.model-226.procedure-home.2026-07-02",
        "aeat.model-226.instructions-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-document-age",
      question:
        "¿Las referencias temporales de las instrucciones describen necesariamente un ejercicio actual?",
      answer:
        "No se presupone. El PDF conserva referencias transitorias a 2015 y 2016, aunque la página actual del procedimiento continúe enlazándolo.",
      sourceIds: [
        "aeat.model-226.procedure-home.2026-07-02",
        "aeat.model-226.instructions-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-226-faq-laws",
      question: "¿Qué normativa principal registra esta ficha?",
      answer:
        "La Ley 26/2014 y la Orden HAP/2474/2015, ambas citadas por la ficha administrativa oficial.",
      sourceIds: [LAW_26_2014_SOURCE.id, ORDER_HAP_2474_2015_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-226.procedure-home.2026-07-02",
      "aeat.model-226.electronic-help.2026-01-09",
      "aeat.model-226.predeclaration-help.2026-01-09",
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"226">;

const MODEL_228_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_RELEASE_ID_V1,
  code: "228",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Solicitud de devolución por exención por reinversión en vivienda habitual para contribuyentes de la Unión Europea y del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
  summary:
    "Solicitud que la AEAT vincula a la devolución por exención por reinversión en vivienda habitual para contribuyentes de la UE o del EEE con efectivo intercambio de información tributaria.",
  searchTerms: [
    "modelo 228",
    "solicitud de devolución",
    "exención por reinversión",
    "vivienda habitual",
    "impuesto sobre la renta de no residentes",
    "IRNR",
    "contribuyentes Unión Europea",
    "Espacio Económico Europeo",
    "efectivo intercambio de información tributaria",
    "presentación electrónica modelo 228",
    "predeclaración modelo 228",
    "fichero .228",
    "instrucciones modelo 228",
    "procedimientos y ejemplos modelo 228",
    "Orden HAP 2474 2015",
  ],
  sections: [
    {
      id: "model-228-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-228-purpose-identity",
          heading: "Solicitud por reinversión en vivienda habitual",
          text: "El índice de modelos y la página del procedimiento identifican el Modelo 228 con la solicitud de devolución por exención por reinversión en vivienda habitual para contribuyentes de la Unión Europea y del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-228.procedure-home.2026-07-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-228-purpose-record",
          heading: "Objeto administrativo descrito",
          text: "La ficha administrativa indica que la solicitud dispone de presentación telemática y de predeclaración. Esta página informativa no determina si una operación concreta reúne las condiciones de la exención ni de una devolución.",
          sourceIds: ["aeat.model-228.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-228-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-228-access-browser-file",
          heading: "Formulario web y fichero .228",
          text: "La ayuda de presentación electrónica describe un formulario que se cumplimenta en línea y permite exportar e importar un fichero cuya extensión corresponde al Modelo 228.",
          sourceIds: [
            "aeat.model-228.procedure-home.2026-07-02",
            "aeat.model-228.electronic-help.2026-01-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-228-access-predeclaration",
          heading: "Predeclaración generada desde la web",
          text: "La ayuda de presentación en papel explica que el PDF se obtiene después de cumplimentar y validar el formulario en línea. Las fuentes registradas no ofrecen un formulario estático y vacío apto para miniatura.",
          sourceIds: ["aeat.model-228.paper-help.2026-01-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-228-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-228-details-web-instructions",
          heading: "Instrucciones en web y documentos descargables",
          text: "La página oficial reúne instrucciones en formato web, un PDF de instrucciones y un PDF de procedimientos y ejemplos. Los documentos se conservan como referencias externas con sus huellas; no se convierten en reglas de decisión.",
          sourceIds: [
            "aeat.model-228.procedure-home.2026-07-02",
            "aeat.model-228.web-instructions.2026-06-09",
            "aeat.model-228.instructions-pdf.captured-2026-07-13",
            "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-228-details-document-age",
          heading: "Referencias temporales conservadas con cautela",
          text: "Los PDF contienen referencias internas a 2015 y 2016. La AEAT continúa enlazándolos desde la página actual del procedimiento, pero esta ficha no infiere que todos sus ejemplos o referencias temporales describan un ejercicio posterior.",
          sourceIds: [
            "aeat.model-228.procedure-home.2026-07-02",
            "aeat.model-228.instructions-pdf.captured-2026-07-13",
            "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-228-details-laws",
          heading: "Normativa oficial registrada",
          text: "La ficha administrativa cita la Ley 26/2014 y la Orden HAP/2474/2015. Esta última aprueba, entre otros, el modelo de solicitud de devolución por aplicación de la exención por reinversión en vivienda habitual en el IRNR.",
          sourceIds: [LAW_26_2014_SOURCE.id, ORDER_HAP_2474_2015_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-228.procedure-home.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 228 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF07.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d3d162147996ce26ddeb80f9ccdc8f92f5c0cd5532ca77ddfd2f7de1b0d987c7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-228.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 228",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF07.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a19a06abc09c3ca30c0d967db1eec890251c3192b8a39143065c62dc85ccb0a7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-228.electronic-help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 228",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-228/presentacion-electronica-modelo-228.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "40a9a21ad5e73c0ce58cf44c2f50a74f3011d2f8a1acbdc02befd2f076de6960",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-228.paper-help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Formulario del Modelo 228 para presentación en papel",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-228/formulario-modelo-228-presentacion-papel.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "72316e58ac16a0022e86f4f8722fc7217b13a9eb505fb3ffe400096bb6cbb76c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-228.web-instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 228",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-228-solic_____on-efectivo-intercambio-tributaria_/instrucciones.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "08852109f8a01c29bcaca84426493950e32d7cdd801608624557e8d9c111c8b9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-228.instructions-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones para cumplimentar la solicitud del Modelo 228",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GF07/Instrucciones_GF07.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6069b8e09fe380acf3b8954920a1f4760d58133ad8f4c84d43bad69fb44e0653",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "IRNR · exención por reinversión · procedimientos y ejemplos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GF07/FAQ_GF07.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0de7b2febb40e3ddff3c37f057171f6d876856852c82ae2699b0018a52b10f1b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    LAW_26_2014_SOURCE,
    ORDER_HAP_2474_2015_SOURCE,
  ],
  documents: [
    {
      id: "model-228-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones para cumplimentar la solicitud",
      sourceId: "aeat.model-228.instructions-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-228.procedure-home.2026-07-02",
      mediaType: "application/pdf",
      fileName: "Instrucciones_GF07.pdf",
      byteLength: 79571,
      pageCount: 6,
      sha256:
        "6069b8e09fe380acf3b8954920a1f4760d58133ad8f4c84d43bad69fb44e0653",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-228-procedures-examples-document",
      kind: "GUIDE",
      title: "IRNR · exención por reinversión · procedimientos y ejemplos",
      sourceId: "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-228.procedure-home.2026-07-02",
      mediaType: "application/pdf",
      fileName: "FAQ_GF07.pdf",
      byteLength: 343711,
      pageCount: 4,
      sha256:
        "0de7b2febb40e3ddff3c37f057171f6d876856852c82ae2699b0018a52b10f1b",
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
      id: "model-228-link-procedure",
      label: "Página oficial del Modelo 228",
      sourceId: "aeat.model-228.procedure-home.2026-07-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-228.procedure-record.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-electronic-help",
      label: "Ayuda oficial de presentación electrónica",
      sourceId: "aeat.model-228.electronic-help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-paper-help",
      label: "Ayuda oficial de la predeclaración",
      sourceId: "aeat.model-228.paper-help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-web-instructions",
      label: "Instrucciones oficiales en la sede",
      sourceId: "aeat.model-228.web-instructions.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-instructions-pdf",
      label: "Instrucciones oficiales en PDF",
      sourceId: "aeat.model-228.instructions-pdf.captured-2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-examples-pdf",
      label: "Procedimientos y ejemplos oficiales en PDF",
      sourceId: "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-link-order",
      label: "Orden HAP/2474/2015",
      sourceId: ORDER_HAP_2474_2015_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-228-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 228?",
      answer:
        "La solicitud de devolución por exención por reinversión en vivienda habitual para contribuyentes de la UE y del EEE con efectivo intercambio de información tributaria.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-faq-purpose",
      question: "¿Qué vías menciona la ficha administrativa?",
      answer:
        "La presentación telemática y la realización de una predeclaración, sin que esta web determine si procede una devolución.",
      sourceIds: ["aeat.model-228.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-faq-channels",
      question: "¿Cómo describe la AEAT la cumplimentación electrónica?",
      answer:
        "Mediante un formulario en línea que también permite exportar e importar un fichero con extensión .228.",
      sourceIds: ["aeat.model-228.electronic-help.2026-01-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-faq-static-form",
      question:
        "¿Hay un formulario PDF estático y vacío para mostrar como miniatura?",
      answer:
        "No en las fuentes registradas. La ayuda explica que la predeclaración en PDF se genera después de cumplimentar y validar el formulario web.",
      sourceIds: ["aeat.model-228.paper-help.2026-01-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-faq-materials",
      question: "¿Qué materiales informativos publica la AEAT?",
      answer:
        "Instrucciones en formato web, un PDF de instrucciones y un PDF titulado «Procedimientos y ejemplos».",
      sourceIds: [
        "aeat.model-228.procedure-home.2026-07-02",
        "aeat.model-228.web-instructions.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-faq-document-age",
      question:
        "¿Los ejemplos descargables describen necesariamente un ejercicio actual?",
      answer:
        "No se presupone. Los documentos contienen referencias internas a 2015 y 2016, aunque la página actual del procedimiento continúe enlazándolos.",
      sourceIds: [
        "aeat.model-228.instructions-pdf.captured-2026-07-13",
        "aeat.model-228.procedures-examples-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-228-faq-laws",
      question: "¿Qué normativa principal registra la ficha?",
      answer:
        "La Ley 26/2014 y la Orden HAP/2474/2015, ambas citadas por la ficha administrativa del procedimiento.",
      sourceIds: [LAW_26_2014_SOURCE.id, ORDER_HAP_2474_2015_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-228.procedure-home.2026-07-02",
      "aeat.model-228.procedure-record.2026-06-09",
      "aeat.model-228.electronic-help.2026-01-09",
      "aeat.model-228.paper-help.2026-01-09",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"228">;

const MODEL_230_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_RELEASE_ID_V1,
  code: "230",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre la Renta de las Personas Físicas e Impuesto sobre la Renta de No Residentes: Retenciones e ingresos a cuenta del gravamen especial sobre los premios de determinadas loterías y apuestas; Impuesto sobre Sociedades: Retenciones e ingresos a cuenta sobre los premios de determinadas loterías y apuestas. Autoliquidación.",
  summary:
    "Autoliquidación que la AEAT identifica con retenciones e ingresos a cuenta relacionados con premios de determinadas loterías y apuestas en el IRPF, el IRNR y el Impuesto sobre Sociedades.",
  searchTerms: [
    "modelo 230",
    "retenciones loterías",
    "ingresos a cuenta loterías",
    "premios de loterías y apuestas",
    "gravamen especial premios",
    "retenciones sobre premios",
    "IRPF premios lotería",
    "IRNR premios lotería",
    "Impuesto sobre Sociedades premios lotería",
    "autoliquidación modelo 230",
    "presentación telemática modelo 230",
    "Orden HAP 70 2013",
    "Orden HAP 2194 2013",
  ],
  sections: [
    {
      id: "model-230-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-230-purpose-identity",
          heading: "Retenciones e ingresos a cuenta sobre determinados premios",
          text: "El índice de modelos y la página del procedimiento identifican el Modelo 230 con las retenciones e ingresos a cuenta relacionados con el gravamen especial sobre premios de determinadas loterías y apuestas en el IRPF y el IRNR, y con retenciones e ingresos a cuenta sobre esos premios en el Impuesto sobre Sociedades.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-230.procedure-home.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-230-purpose-record",
          heading: "Descripción administrativa del procedimiento",
          text: "La ficha administrativa clasifica el Modelo 230 como autoliquidación tributaria y describe su relación con determinados premios de loterías y apuestas. Esta página no evalúa quién debe utilizarlo ni calcula una retención.",
          sourceIds: ["aeat.model-230.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-230-access",
      title: "Canal descrito",
      kind: "ACCESS",
      items: [
        {
          id: "model-230-access-browser",
          heading: "Tramitación telemática",
          text: "La página principal enumera una gestión de presentación y la ficha administrativa señala lugar de presentación telemático y tramitación electrónica. Esta ficha conserva únicamente la referencia informativa al canal web.",
          sourceIds: [
            "aeat.model-230.procedure-home.2026-06-09",
            "aeat.model-230.procedure-record.2026-06-09",
            "aeat.model-230.topic-page.2024-10-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-230-access-no-static-form",
          heading: "Sin formulario PDF estático registrado",
          text: "Las páginas oficiales consultadas describen la tramitación electrónica, pero no enlazan un formulario PDF estático y vacío ni un manual PDF específico del Modelo 230. Por ello la ficha usa la representación visual de canal web.",
          sourceIds: [
            "aeat.model-230.procedure-home.2026-06-09",
            "aeat.model-230.topic-page.2024-10-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-230-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-230-details-related-actions",
          heading: "Gestiones relacionadas enumeradas por la AEAT",
          text: "Además de la presentación, la página oficial enumera la consulta de declaraciones presentadas y la aportación de documentación complementaria. Se mencionan para describir la estructura oficial y no se habilitan desde esta aplicación.",
          sourceIds: [
            "aeat.model-230.procedure-home.2026-06-09",
            "aeat.model-230.topic-page.2024-10-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-230-details-laws",
          heading: "Normativa oficial registrada",
          text: "La página oficial cita la Orden HAP/70/2013, que aprobó los modelos 230 y 136, y la Orden HAP/2194/2013 como norma de tramitación. La ficha administrativa enlaza también la resolución de creación de la sede electrónica de la AEAT.",
          sourceIds: [
            ORDER_HAP_70_2013_SOURCE.id,
            ORDER_HAP_2194_2013_SOURCE.id,
            ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-230.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 230 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G235.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7a297a61a8de4f4cbd8254a462dec672bbd140721ce7c160dbda7e3bb9661e60",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-230.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 230",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G235.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "952e4d93b8d3c8486598923d453209401d3ead163bbe9f17d587377909599667",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-230.topic-page.2024-10-02",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Modelo 230 · retenciones e ingresos a cuenta",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/no-residentes/irnr-sin-establecimiento-permanente/gravamen-especial-sobre-premios-loterias-apuestas/modelo-230-retenciones-ingresos-cuenta.html",
      officialUpdatedOn: "2024-10-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "47e79b357cad5efc9754703ddaebec08e1477646e9f3613a3bfd618667abb134",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAP_70_2013_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
    ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-230-link-procedure",
      label: "Página oficial del Modelo 230",
      sourceId: "aeat.model-230.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-230.procedure-record.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-link-topic",
      label: "Gestiones oficiales del Modelo 230",
      sourceId: "aeat.model-230.topic-page.2024-10-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-link-order-approval",
      label: "Orden HAP/70/2013",
      sourceId: ORDER_HAP_70_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-link-order-processing",
      label: "Orden HAP/2194/2013",
      sourceId: ORDER_HAP_2194_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-230-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 230?",
      answer:
        "Una autoliquidación de retenciones e ingresos a cuenta relacionada con determinados premios de loterías y apuestas en el IRPF, el IRNR y el Impuesto sobre Sociedades.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-faq-procedure",
      question: "¿Cómo clasifica la AEAT este procedimiento?",
      answer:
        "Como procedimiento tributario con presentación telemática y tramitación electrónica.",
      sourceIds: ["aeat.model-230.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-faq-channel",
      question: "¿Qué canal de presentación describe la ficha oficial?",
      answer:
        "La tramitación electrónica. Esta página informativa no abre, completa ni envía esa gestión.",
      sourceIds: [
        "aeat.model-230.procedure-home.2026-06-09",
        "aeat.model-230.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-faq-static-form",
      question:
        "¿Se ha localizado un formulario PDF estático y vacío del Modelo 230?",
      answer:
        "No en las páginas oficiales registradas. Esas fuentes describen una gestión electrónica, por lo que la ficha utiliza la representación visual de canal web.",
      sourceIds: [
        "aeat.model-230.procedure-home.2026-06-09",
        "aeat.model-230.topic-page.2024-10-02",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-faq-related-actions",
      question: "¿Qué otras gestiones enumera la página oficial?",
      answer:
        "La consulta de declaraciones presentadas y la aportación de documentación complementaria, además de la presentación.",
      sourceIds: ["aeat.model-230.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-faq-approval-order",
      question: "¿Qué norma aprobó el Modelo 230?",
      answer:
        "La Orden HAP/70/2013, de 30 de enero, que aprobó conjuntamente los modelos 230 y 136.",
      sourceIds: [ORDER_HAP_70_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-230-faq-processing-order",
      question: "¿Qué norma de tramitación cita la AEAT?",
      answer:
        "La Orden HAP/2194/2013, que la página oficial y la ficha administrativa registran como normativa de tramitación.",
      sourceIds: [ORDER_HAP_2194_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-230.procedure-home.2026-06-09",
      "aeat.model-230.procedure-record.2026-06-09",
      "aeat.model-230.topic-page.2024-10-02",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"230">;

export const PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_CONTENT_V1 =
  deepFreeze([
    MODEL_226_CONTENT,
    MODEL_228_CONTENT,
    MODEL_230_CONTENT,
  ] as const);
