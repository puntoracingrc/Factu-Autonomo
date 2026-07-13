import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_15_EXCISE_REPORTS_REFUNDS_521_524_RELEASE_ID_V1 =
  "public-aeat-official-batch-15-excise-reports-refunds-521-524.2026-07-13.v1" as const;

export type PublicAeatBatch15ExciseReportsRefunds521524CodeV1 =
  "521" | "522" | "523" | "524";

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

const CONTENT_BASE = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_15_EXCISE_REPORTS_REFUNDS_521_524_RELEASE_ID_V1,
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const;

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

const MODEL_521_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-521.procedure-home.2026-03-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 521 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF13.shtml",
  officialUpdatedOn: "2026-03-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ee761d5baa7e0f0c676655b1ff56b4a6e256a71fe2c670af551fcd3f9c05df76",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_521_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-521.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 521",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DF13.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "51a65581585803b3b0b8f9007a11f6133ad6deb55affbb4320221f4e70ff9338",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_521_ORDER_SOURCE = {
  id: "boe.model-521.order-eha-2770-2010.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/2770/2010, de 26 de octubre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-16491",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "284d5e0877d3df0947c620b0227ed85906c32114972d82797de01ffdc9de0b51",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_522_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-522.procedure-home.2026-03-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 522 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF12.shtml",
  officialUpdatedOn: "2026-03-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ac2d75c609e8ce0abed697a391dc51252b0eea0db76114c700706359acc67403",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_522_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-522.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 522",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DF12.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1f706b295d8d2d5e4a3a3b8a9f04c9576fe9245743ea698b33b1be4316cea831",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_522_RESOLUTION_SOURCE = {
  id: "boe.model-522.resolution-2010-07-01.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 1 de julio de 2010",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-10887",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2fc8c92ae6299c52bd2699db1eecd033afd86dbb3899bfdf53d3bd2705ac4be0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_523_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-523.procedure-home.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 523 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DN01.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "75e5c43070edf073ce8e3bc7b57e52712af440bee1d57f902228d59574b1128c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_523_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-523.procedure-record.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 523",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DN01.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "aabd5c45db4ca734b5dafff3cd96c0960e891e9f515ed22829c143ee056bfd4b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_523_RESOLUTION_SOURCE = {
  id: "boe.model-523.resolution-1996-07-09.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 9 de julio de 1996",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-1996-16858",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1d927610a2e0f5e793a083e273a6e790e945d9b0325b79bdb83e1319c69adced",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_523_AMENDMENT_SOURCE = {
  id: "boe.model-523.resolution-2005-06-10.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 10 de junio de 2005",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2005-10951",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ac7c003fd451b7f4a1cd70f6b46a7f95db2d5847e56fc9ff5262bc4916d8618b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_524_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-524.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 524 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ04.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8db680032352b8e302587d8944d16ae38cedff2231b33334230f7774c048961d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_524_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-524.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 524",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DJ04.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e717430874dcf002ebaa36bf0d31c4e1942e49a30706d43508fe3e154655ce2c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_524_DOWNLOAD_PAGE_SOURCE = {
  id: "aeat.model-524.download-page.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 524 · descarga del modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-devoluciones/modelo-524-iiee______lucion-sobre-alcohol-alcoholicas_/descarga-modelo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0faec32e2d3bddb186297153d3dd608f7043cdf09b06afb6a38a1a57661a0e32",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_524_FORM_PDF_SOURCE = {
  id: "aeat.model-524.form-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 524 · formulario PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ04/524.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b6aea9860a5d8925514dbbde04c477eba072cf396c4b6f9b0ee51abde184758c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_524_INSTRUCTIONS_PDF_SOURCE = {
  id: "aeat.model-524.instructions-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 524 · instrucciones PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ04/instrucciones/instr524.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "061aee530da2428d2a872f6cdd36499928b2d374e90dfe6d689c76f6f3073220",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const EXCISE_ORDER_2007_SOURCE = {
  id: "boe.excise.order-eha-3482-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3482/2007, de 20 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-20637",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0ab73c64dc4a71bd5fcbd87c7e98d608ebfab3321eee87d5596dbeabbbd453e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const EXCISE_ORDER_2010_SOURCE = {
  id: "boe.excise.order-eha-3363-2010.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3363/2010, de 23 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-20054",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d784608b8daa390f2e3e5f732b92d75e51fa9c9ed47e8cc4758c1f0f0d1c1910",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_521_CONTENT = {
  ...CONTENT_BASE,
  code: "521",
  canonicalName: "II. EE. Relación trimestral de primeras materias entregadas.",
  summary:
    "La AEAT identifica el Modelo 521 como la relación trimestral de primeras materias entregadas y publica para él una página, una ficha administrativa y un canal mediante formulario electrónico.",
  searchTerms: [
    "modelo 521",
    "impuestos especiales",
    "IIEE",
    "relación trimestral",
    "primeras materias entregadas",
    "artículo 89.4",
    "formulario electrónico",
    "Orden EHA 2770 2010",
  ],
  sections: [
    {
      id: "model-521-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-521-purpose-identity",
          heading: "Relación de primeras materias entregadas",
          text: "El índice y la portada de la AEAT identifican el Modelo 521 como la relación trimestral de primeras materias entregadas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_521_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-521-purpose-record",
          heading: "Descripción administrativa",
          text: "La ficha administrativa lo describe como la presentación de la relación de primeras materias entregadas a la que se refiere el artículo 89.4 del Reglamento de los Impuestos Especiales.",
          sourceIds: [MODEL_521_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-521-access-and-law",
      title: "Canal y referencia normativa",
      kind: "ACCESS",
      items: [
        {
          id: "model-521-access-browser",
          heading: "Formulario electrónico",
          text: "La página oficial ofrece un canal de presentación mediante formulario electrónico.",
          sourceIds: [MODEL_521_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-521-access-law",
          heading: "Texto publicado en el BOE",
          text: "La documentación normativa registrada incluye la Orden EHA/2770/2010, de 26 de octubre.",
          sourceIds: [MODEL_521_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_521_PROCEDURE_HOME_SOURCE,
    MODEL_521_PROCEDURE_RECORD_SOURCE,
    MODEL_521_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-521-link-procedure",
      label: "Página oficial del Modelo 521",
      sourceId: MODEL_521_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_521_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-link-order",
      label: "Orden EHA/2770/2010",
      sourceId: MODEL_521_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-521-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 521?",
      answer:
        "La relación trimestral de primeras materias entregadas en el ámbito de los Impuestos Especiales.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_521_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-period-label",
      question: "¿Qué periodicidad aparece en el nombre oficial?",
      answer:
        "El nombre publicado por la AEAT utiliza expresamente el término trimestral.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-record-object",
      question: "¿Cómo describe la ficha administrativa su objeto?",
      answer:
        "Como la presentación de la relación de primeras materias entregadas a la que se refiere el artículo 89.4 del Reglamento de los Impuestos Especiales.",
      sourceIds: [MODEL_521_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-channel",
      question: "¿Qué canal describe la página oficial?",
      answer: "Un formulario electrónico.",
      sourceIds: [MODEL_521_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-sources",
      question: "¿Qué páginas oficiales se han registrado para esta ficha?",
      answer:
        "El índice general de modelos, la portada específica del Modelo 521 y su ficha administrativa.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_521_PROCEDURE_HOME_SOURCE.id,
        MODEL_521_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-order",
      question: "¿Qué orden del BOE se referencia?",
      answer: "La Orden EHA/2770/2010, de 26 de octubre.",
      sourceIds: [MODEL_521_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-order-publication",
      question: "¿Cuándo se publicó esa orden en el BOE?",
      answer: "El 29 de octubre de 2010.",
      sourceIds: [MODEL_521_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-521-faq-page-record-difference",
      question: "¿La portada y la ficha administrativa son la misma fuente?",
      answer:
        "No. La AEAT publica una portada del procedimiento y una ficha administrativa separada con su descripción formal.",
      sourceIds: [
        MODEL_521_PROCEDURE_HOME_SOURCE.id,
        MODEL_521_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_521_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"521">;

const MODEL_522_CONTENT = {
  ...CONTENT_BASE,
  code: "522",
  canonicalName:
    "II. EE. Parte trimestral de productos a que se refiere el artículo 108 ter del Reglamento de los Impuestos Especiales.",
  summary:
    "La AEAT identifica el Modelo 522 como el parte trimestral de productos citado en el artículo 108 ter del Reglamento de los Impuestos Especiales y describe canales mediante formulario y carga de fichero.",
  searchTerms: [
    "modelo 522",
    "impuestos especiales",
    "IIEE",
    "parte trimestral",
    "productos artículo 108 ter",
    "Reglamento de los Impuestos Especiales",
    "formulario electrónico",
    "importación de fichero",
  ],
  sections: [
    {
      id: "model-522-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-522-purpose-identity",
          heading: "Parte trimestral de productos",
          text: "El índice y la portada de la AEAT identifican el Modelo 522 con el parte trimestral de productos mencionado en el artículo 108 ter del Reglamento de los Impuestos Especiales.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_522_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-522-purpose-record",
          heading: "Descripción administrativa",
          text: "La ficha administrativa registra la presentación de ese parte como objeto del procedimiento.",
          sourceIds: [MODEL_522_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-522-access-and-law",
      title: "Canales y referencia normativa",
      kind: "ACCESS",
      items: [
        {
          id: "model-522-access-channels",
          heading: "Formulario e importación de fichero",
          text: "La página oficial describe acceso mediante formulario y mediante importación de fichero.",
          sourceIds: [MODEL_522_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-522-access-law",
          heading: "Resolución publicada en el BOE",
          text: "La fuente normativa registrada es la Resolución de 1 de julio de 2010.",
          sourceIds: [MODEL_522_RESOLUTION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_522_PROCEDURE_HOME_SOURCE,
    MODEL_522_PROCEDURE_RECORD_SOURCE,
    MODEL_522_RESOLUTION_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-522-link-procedure",
      label: "Página oficial del Modelo 522",
      sourceId: MODEL_522_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_522_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-link-resolution",
      label: "Resolución de 1 de julio de 2010",
      sourceId: MODEL_522_RESOLUTION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-522-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 522?",
      answer:
        "El parte trimestral de productos a que se refiere el artículo 108 ter del Reglamento de los Impuestos Especiales.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_522_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-article",
      question: "¿Qué artículo aparece en el nombre oficial?",
      answer: "El artículo 108 ter del Reglamento de los Impuestos Especiales.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-period-label",
      question: "¿Qué periodicidad figura en el título publicado?",
      answer:
        "La denominación oficial utiliza expresamente el término trimestral.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-record-object",
      question: "¿Qué objeto registra la ficha administrativa?",
      answer: "La presentación del parte identificado por el Modelo 522.",
      sourceIds: [MODEL_522_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-browser-channel",
      question: "¿Existe un canal mediante formulario?",
      answer: "Sí. La página oficial describe un formulario electrónico.",
      sourceIds: [MODEL_522_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-file-channel",
      question: "¿Describe la AEAT un canal mediante fichero?",
      answer:
        "Sí. La portada también identifica una opción de importación de fichero.",
      sourceIds: [MODEL_522_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-resolution",
      question: "¿Qué resolución se conserva como fuente normativa?",
      answer: "La Resolución de 1 de julio de 2010.",
      sourceIds: [MODEL_522_RESOLUTION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-522-faq-resolution-publication",
      question: "¿Cuándo se publicó esa resolución en el BOE?",
      answer: "El 9 de julio de 2010.",
      sourceIds: [MODEL_522_RESOLUTION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_522_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"522">;

const MODEL_523_CONTENT = {
  ...CONTENT_BASE,
  code: "523",
  canonicalName:
    "Aplicación del beneficio de devolución de los IIEE sobre el alcohol y bebidas alcohólicas.",
  summary:
    "La AEAT identifica el Modelo 523 con la aplicación del beneficio de devolución de los Impuestos Especiales sobre el alcohol y las bebidas alcohólicas y publica una solicitud o comunicación electrónica de carácter general.",
  searchTerms: [
    "modelo 523",
    "impuestos especiales",
    "IIEE",
    "devolución alcohol",
    "bebidas alcohólicas",
    "aromas",
    "alimentos rellenos",
    "productos no alcohólicos",
  ],
  sections: [
    {
      id: "model-523-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-523-purpose-identity",
          heading: "Beneficio de devolución",
          text: "El índice de modelos identifica el Modelo 523 con la aplicación del beneficio de devolución de los Impuestos Especiales sobre el alcohol y las bebidas alcohólicas.",
          sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-523-purpose-record",
          heading: "Descripción administrativa",
          text: "La ficha administrativa describe el reconocimiento del derecho a devolución en relación con la fabricación de aromas, alimentos rellenos y productos no alcohólicos en los supuestos que enumera la fuente oficial.",
          sourceIds: [MODEL_523_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-523-access-and-law",
      title: "Canal y referencias normativas",
      kind: "ACCESS",
      items: [
        {
          id: "model-523-access-generic",
          heading: "Solicitud o comunicación electrónica",
          text: "La portada oficial ofrece un acceso electrónico bajo la etiqueta general de solicitud o comunicación, sin identificar en esta ficha un método técnico más específico.",
          sourceIds: [MODEL_523_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-523-access-law",
          heading: "Resoluciones registradas",
          text: "La documentación normativa registrada reúne la Resolución de 9 de julio de 1996 y la Resolución de 10 de junio de 2005.",
          sourceIds: [
            MODEL_523_RESOLUTION_SOURCE.id,
            MODEL_523_AMENDMENT_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_523_PROCEDURE_HOME_SOURCE,
    MODEL_523_PROCEDURE_RECORD_SOURCE,
    MODEL_523_RESOLUTION_SOURCE,
    MODEL_523_AMENDMENT_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-523-link-procedure",
      label: "Página oficial del Modelo 523",
      sourceId: MODEL_523_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_523_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-link-resolution-1996",
      label: "Resolución de 9 de julio de 1996",
      sourceId: MODEL_523_RESOLUTION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-link-resolution-2005",
      label: "Resolución de 10 de junio de 2005",
      sourceId: MODEL_523_AMENDMENT_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-523-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 523?",
      answer:
        "La aplicación del beneficio de devolución de los Impuestos Especiales sobre el alcohol y las bebidas alcohólicas.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_523_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-record-purpose",
      question: "¿Qué actuación describe la ficha administrativa?",
      answer:
        "El reconocimiento por la oficina gestora del derecho a devolución en los supuestos descritos por la propia ficha.",
      sourceIds: [MODEL_523_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-aromas",
      question: "¿Menciona la fuente oficial la fabricación de aromas?",
      answer:
        "Sí. La ficha administrativa la incluye entre los usos que describe.",
      sourceIds: [MODEL_523_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-food",
      question: "¿Menciona la fuente alimentos rellenos?",
      answer:
        "Sí. La descripción administrativa también cita los alimentos rellenos.",
      sourceIds: [MODEL_523_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-nonalcoholic",
      question: "¿Aparecen productos no alcohólicos en la descripción?",
      answer:
        "Sí. La ficha oficial incluye su fabricación entre los supuestos que enumera.",
      sourceIds: [MODEL_523_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-access",
      question: "¿Cómo etiqueta la AEAT el acceso electrónico?",
      answer: "Como presentación de solicitud o comunicación.",
      sourceIds: [MODEL_523_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-original-resolution",
      question: "¿Qué resolución inicial se conserva como fuente?",
      answer: "La Resolución de 9 de julio de 1996.",
      sourceIds: [MODEL_523_RESOLUTION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-523-faq-amendment",
      question: "¿Qué resolución posterior se registra junto a ella?",
      answer: "La Resolución de 10 de junio de 2005.",
      sourceIds: [MODEL_523_AMENDMENT_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
} as const satisfies PublicAeatOfficialModelContentV1<"523">;

const MODEL_524_CONTENT = {
  ...CONTENT_BASE,
  code: "524",
  canonicalName:
    "II. EE. Solicitud de devolución sobre el alcohol y las bebidas alcohólicas.",
  summary:
    "La AEAT identifica el Modelo 524 como una solicitud de devolución sobre el alcohol y las bebidas alcohólicas y mantiene una portada, una ficha administrativa y documentos PDF cuya actualidad material no se determina en esta ficha.",
  searchTerms: [
    "modelo 524",
    "impuestos especiales",
    "IIEE",
    "solicitud de devolución",
    "alcohol",
    "bebidas alcohólicas",
    "formulario 524 PDF",
    "instrucciones 524",
  ],
  sections: [
    {
      id: "model-524-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-524-purpose-identity",
          heading: "Solicitud de devolución",
          text: "El índice y la portada de la AEAT identifican el Modelo 524 como la solicitud de devolución sobre el alcohol y las bebidas alcohólicas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_524_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-524-purpose-record",
          heading: "Descripción administrativa",
          text: "La ficha administrativa describe una devolución vinculada a determinados usos de alcohol y bebidas alcohólicas, sin que esta página valore qué supuesto puede corresponder a un caso concreto.",
          sourceIds: [MODEL_524_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-524-documents",
      title: "Canal y documentación registrada",
      kind: "DETAILS",
      items: [
        {
          id: "model-524-documents-access",
          heading: "Formulario electrónico",
          text: "La portada oficial describe un canal mediante formulario electrónico.",
          sourceIds: [MODEL_524_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-524-documents-pdfs",
          heading: "Formulario e instrucciones PDF",
          text: "La AEAT mantiene un formulario PDF y un documento de instrucciones. Ambos contienen referencias antiguas, por lo que se ofrecen como descargas oficiales informativas y no como reglas actuales verificadas.",
          sourceIds: [
            MODEL_524_DOWNLOAD_PAGE_SOURCE.id,
            MODEL_524_FORM_PDF_SOURCE.id,
            MODEL_524_INSTRUCTIONS_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-524-documents-law",
          heading: "Órdenes registradas",
          text: "La trazabilidad normativa incluye la Orden EHA/3482/2007 y la Orden EHA/3363/2010, que sustituyó el anexo del Modelo 524.",
          sourceIds: [EXCISE_ORDER_2007_SOURCE.id, EXCISE_ORDER_2010_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_524_PROCEDURE_HOME_SOURCE,
    MODEL_524_PROCEDURE_RECORD_SOURCE,
    MODEL_524_DOWNLOAD_PAGE_SOURCE,
    MODEL_524_FORM_PDF_SOURCE,
    MODEL_524_INSTRUCTIONS_PDF_SOURCE,
    EXCISE_ORDER_2007_SOURCE,
    EXCISE_ORDER_2010_SOURCE,
  ],
  documents: [
    {
      id: "model-524-form-document",
      kind: "FORM",
      title: "Formulario PDF del Modelo 524",
      sourceId: MODEL_524_FORM_PDF_SOURCE.id,
      landingPageSourceId: MODEL_524_DOWNLOAD_PAGE_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "524.pdf",
      byteLength: 116616,
      pageCount: 1,
      sha256:
        "b6aea9860a5d8925514dbbde04c477eba072cf396c4b6f9b0ee51abde184758c",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-524-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones PDF del Modelo 524",
      sourceId: MODEL_524_INSTRUCTIONS_PDF_SOURCE.id,
      landingPageSourceId: MODEL_524_DOWNLOAD_PAGE_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "instr524.pdf",
      byteLength: 76283,
      pageCount: 1,
      sha256:
        "061aee530da2428d2a872f6cdd36499928b2d374e90dfe6d689c76f6f3073220",
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
      id: "model-524-link-procedure",
      label: "Página oficial del Modelo 524",
      sourceId: MODEL_524_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_524_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-link-download-page",
      label: "Página oficial de descarga del Modelo 524",
      sourceId: MODEL_524_DOWNLOAD_PAGE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-link-form-pdf",
      label: "Formulario PDF oficial del Modelo 524",
      sourceId: MODEL_524_FORM_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-link-instructions-pdf",
      label: "Instrucciones PDF oficiales del Modelo 524",
      sourceId: MODEL_524_INSTRUCTIONS_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: EXCISE_ORDER_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-link-order-2010",
      label: "Orden EHA/3363/2010",
      sourceId: EXCISE_ORDER_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-524-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 524?",
      answer:
        "La solicitud de devolución sobre el alcohol y las bebidas alcohólicas.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_524_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-record-purpose",
      question: "¿Qué describe la ficha administrativa?",
      answer:
        "Una devolución vinculada a determinados usos del alcohol y las bebidas alcohólicas que la propia ficha oficial enumera.",
      sourceIds: [MODEL_524_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-channel",
      question: "¿Qué canal identifica la portada oficial?",
      answer: "Un formulario electrónico.",
      sourceIds: [MODEL_524_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-form-pdf",
      question: "¿Mantiene la AEAT un formulario PDF descargable?",
      answer: "Sí. La página de descarga enlaza un PDF oficial de una página.",
      sourceIds: [
        MODEL_524_DOWNLOAD_PAGE_SOURCE.id,
        MODEL_524_FORM_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-instructions",
      question: "¿Hay instrucciones PDF?",
      answer:
        "Sí. La AEAT mantiene un documento de instrucciones de una página.",
      sourceIds: [MODEL_524_INSTRUCTIONS_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-form-safety",
      question: "¿Qué comprobación técnica se hizo sobre el formulario PDF?",
      answer:
        "La copia auditada conserva un diccionario AcroForm sin campos interactivos, no contiene JavaScript y no está cifrada.",
      sourceIds: [MODEL_524_FORM_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-instructions-safety",
      question: "¿Qué comprobación técnica se hizo sobre las instrucciones?",
      answer:
        "La copia auditada no contiene JavaScript, campos de formulario ni cifrado.",
      sourceIds: [MODEL_524_INSTRUCTIONS_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-document-freshness",
      question: "¿Se presentan los PDF como documentación actual verificada?",
      answer:
        "No. Se conservan como descargas oficiales informativas con referencias heredadas detectadas, sin extraer de ellas reglas actuales.",
      sourceIds: [
        MODEL_524_FORM_PDF_SOURCE.id,
        MODEL_524_INSTRUCTIONS_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-524-faq-orders",
      question: "¿Qué órdenes se registran para su trazabilidad?",
      answer:
        "La Orden EHA/3482/2007 y la Orden EHA/3363/2010, que sustituyó el anexo del Modelo 524.",
      sourceIds: [EXCISE_ORDER_2007_SOURCE.id, EXCISE_ORDER_2010_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_524_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"524">;

export const PUBLIC_AEAT_BATCH_15_EXCISE_REPORTS_REFUNDS_521_524_CONTENT_V1 =
  deepFreeze([
    MODEL_521_CONTENT,
    MODEL_522_CONTENT,
    MODEL_523_CONTENT,
    MODEL_524_CONTENT,
  ] as const);
