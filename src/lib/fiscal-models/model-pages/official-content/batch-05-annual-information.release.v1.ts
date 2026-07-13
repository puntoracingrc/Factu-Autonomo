import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_RELEASE_ID_V1 =
  "public-aeat-official-batch-05-annual-information.2026-07-13.v1" as const;

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
  id: "aeat.models-100-199.register-designs.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro. Modelos 100 al 199",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-100-199.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b059ee0dbe678a8a395329805e834651b494da5bfa66877328c857c78a9739af",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1430_2025_SOURCE = {
  id: "boe.models-182-184.order-hac-1430-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1430/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-25389",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "45522b6eed4eca77673bffd87d7a4d744b9195e00ec4594a9fb9ae591b32421a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_181_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_RELEASE_ID_V1,
  code: "181",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa de préstamos y créditos, y operaciones financieras relacionadas con bienes inmuebles.",
  summary:
    "Declaración informativa que la AEAT identifica con préstamos, créditos y operaciones financieras relacionadas con bienes inmuebles.",
  searchTerms: [
    "modelo 181",
    "declaración informativa",
    "préstamos",
    "créditos",
    "operaciones financieras",
    "bienes inmuebles",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 181",
    "Orden EHA 3514 2009",
    "Orden HAC 747 2025",
  ],
  sections: [
    {
      id: "model-181-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-181-purpose-identity",
          heading: "Préstamos, créditos y operaciones inmobiliarias",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 181 con préstamos y créditos y con operaciones financieras relacionadas con bienes inmuebles.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-181.procedure-home.2026-07-08",
            "aeat.model-181.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-181-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-181-access-file",
          heading: "Carga de fichero",
          text: "La página principal y la ayuda técnica actuales describen un canal basado en un fichero ajustado al diseño de registro y un flujo TGVI online. Esta ficha registra el canal únicamente como información oficial.",
          sourceIds: [
            "aeat.model-181.procedure-home.2026-07-08",
            "aeat.model-181.file-help.2026-02-05",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-181-access-record-context",
          heading: "Descripción administrativa conservada",
          text: "La ficha administrativa conserva en su objeto una referencia a soporte y teleproceso, mientras la página y la ayuda actuales muestran carga de fichero por Internet. Se registran ambas descripciones sin convertirlas en instrucciones ni decidir cuál corresponde a un caso concreto.",
          sourceIds: [
            "aeat.model-181.procedure-record.2026-07-08",
            "aeat.model-181.file-help.2026-02-05",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-181-materials",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-181-materials-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico de la AEAT enlaza un PDF de veintinueve páginas rotulado para el Modelo 181. Se conserva como diseño de registro descargable, no como formulario ni como miniatura del modelo.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-181.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-181-materials-law",
          heading: "Aprobación y texto posterior",
          text: "La ficha registra la Orden EHA/3514/2009, asociada a la aprobación del Modelo 181, y la Orden HAC/747/2025, que vuelve a regular su denominación y condiciones.",
          sourceIds: [
            "boe.model-181.order-eha-3514-2009",
            "boe.model-181.order-hac-747-2025",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-181.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 181 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI01.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0a6c11e3e356c3ffaf632b65fdf92395c985f68717741d588b941ee49895946c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-181.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 181",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI01.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "50a40f296d29b6ce7f53b73539ac22b7044edf0be51b96d54dedd0b7655864f7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-181.file-help.2026-02-05",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 181 al 189 · Modelo 181",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-181.html",
      officialUpdatedOn: "2026-02-05",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fbefa0856f80d4aec8195d4554b694509b2c1ce5ccccd3e9711b0c0ad94c7306",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-181.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 181 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_22/DR_181_2022.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4b1e2d236132447d745205a713ccc1eb44a69379965bad58f0d543d39043a92b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-181.order-eha-3514-2009",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/3514/2009, de 29 de diciembre",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2009-21165",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6e25e5b1e484dafcc263a489ae38424b92819a86ca028d6ca0c95f1bcc5982e4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-181.order-hac-747-2025",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/747/2025, de 27 de junio",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-14600",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "44211d97358fb7f3b17b014ecb8860926d2144010287a920093f39f0686efdc1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-181-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 181",
      sourceId: "aeat.model-181.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_181_2022.pdf",
      byteLength: 316409,
      pageCount: 29,
      sha256:
        "4b1e2d236132447d745205a713ccc1eb44a69379965bad58f0d543d39043a92b",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: ["aeat.model-181.file-help.2026-02-05"],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-181-link-procedure",
      label: "Página oficial del Modelo 181",
      sourceId: "aeat.model-181.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-181.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-link-help",
      label: "Ayuda técnica oficial del Modelo 181",
      sourceId: "aeat.model-181.file-help.2026-02-05",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-181.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-link-approval",
      label: "Orden EHA/3514/2009",
      sourceId: "boe.model-181.order-eha-3514-2009",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-link-current-order",
      label: "Orden HAC/747/2025",
      sourceId: "boe.model-181.order-hac-747-2025",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-181-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 181?",
      answer:
        "Una declaración informativa sobre préstamos y créditos y operaciones financieras relacionadas con bienes inmuebles.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-faq-channel",
      question: "¿Qué canal técnico publica actualmente la AEAT?",
      answer:
        "La página y la ayuda oficiales describen una carga de fichero ajustado al diseño de registro mediante el entorno TGVI online.",
      sourceIds: [
        "aeat.model-181.procedure-home.2026-07-08",
        "aeat.model-181.file-help.2026-02-05",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-faq-record-wording",
      question:
        "¿Por qué la ficha administrativa menciona soporte y teleproceso?",
      answer:
        "Esa formulación permanece en el objeto de la ficha administrativa, mientras las páginas actuales describen carga de fichero por Internet. Esta ficha conserva la diferencia sin resolver aplicabilidad.",
      sourceIds: [
        "aeat.model-181.procedure-record.2026-07-08",
        "aeat.model-181.file-help.2026-02-05",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-faq-design",
      question: "¿El PDF enlazado es un formulario visual del Modelo 181?",
      answer:
        "No. Es un documento técnico de diseño de registro y por eso no se utiliza como miniatura de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-181.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-faq-approval",
      question:
        "¿Qué norma aprobó originalmente el Modelo 181 registrado aquí?",
      answer: "La Orden EHA/3514/2009, de 29 de diciembre.",
      sourceIds: ["boe.model-181.order-eha-3514-2009"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-181-faq-2025",
      question: "¿Qué texto legal posterior registra esta ficha?",
      answer:
        "La Orden HAC/747/2025, que incluye el Modelo 181 entre los modelos regulados por esa orden.",
      sourceIds: ["boe.model-181.order-hac-747-2025"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"181">;

const MODEL_182_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_RELEASE_ID_V1,
  code: "182",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa de donativos, donaciones y aportaciones recibidas.",
  summary:
    "Declaración informativa que la AEAT identifica con donativos, donaciones y aportaciones recibidas.",
  searchTerms: [
    "modelo 182",
    "declaración informativa",
    "donativos",
    "donaciones",
    "aportaciones recibidas",
    "formulario web",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 182",
    "Orden EHA 3021 2007",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-182-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-182-purpose-identity",
          heading: "Donativos, donaciones y aportaciones",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 182 con donativos, donaciones y aportaciones recibidas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-182.procedure-home.2026-07-08",
            "aeat.model-182.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-182-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-182-access-browser",
          heading: "Formulario web",
          text: "La AEAT publica una ayuda técnica específica para un formulario web del Modelo 182. Esta ficha identifica el canal, pero no reproduce su cumplimentación ni inicia ningún trámite.",
          sourceIds: ["aeat.model-182.browser-form-help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-182-access-file",
          heading: "Carga de fichero",
          text: "La AEAT publica por separado una ayuda técnica para el canal mediante fichero ajustado al diseño de registro y muestra ambos accesos en la página principal del modelo.",
          sourceIds: [
            "aeat.model-182.procedure-home.2026-07-08",
            "aeat.model-182.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-182-materials",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-182-materials-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico enlaza un PDF de diecinueve páginas para el Modelo 182. Aunque el archivo contiene metadatos AcroForm, se registra como diseño técnico y no como impreso o miniatura del modelo.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-182.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-182-materials-law",
          heading: "Aprobación y modificación registrada",
          text: "La ficha conserva la Orden EHA/3021/2007, asociada a la aprobación del Modelo 182, y la Orden HAC/1430/2025, que modifica esa regulación.",
          sourceIds: [
            "boe.model-182.order-eha-3021-2007",
            ORDER_HAC_1430_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-182.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 182 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI02.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f1d820e719bd6dce67ea32539e2786faff40dca4929f7c4cd28a0b5060bf3f80",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-182.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 182",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI02.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c60542bbab262fb975fe92466069f5273a18eb3934b1d6eb801ffe98e0c5165b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-182.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 182 · formulario web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-182-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8ee1b59ca43e9ca1be78063872346f52f39f2a2df760896bb3a4da9a78e23879",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-182.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 182 · presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-182-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "811058769a004b99115c1cc6a5ed1b964e23d2bb3ed3d3a79fb435870f0850de",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-182.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 182 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_182_2025.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "90eac5615609f6bec7bf5c9fa9386253e80bd0e26997747fbb1160c3da180831",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-182.order-eha-3021-2007",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/3021/2007, de 11 de octubre",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-18192",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "14945d7e36e96d8351538da32716d9463af6aca49645622aa1b2d631ae1ab392",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAC_1430_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-182-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 182",
      sourceId: "aeat.model-182.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_182_2025.pdf",
      byteLength: 276709,
      pageCount: 19,
      sha256:
        "90eac5615609f6bec7bf5c9fa9386253e80bd0e26997747fbb1160c3da180831",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-182.browser-form-help.2026-06-19",
      "aeat.model-182.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-182-link-procedure",
      label: "Página oficial del Modelo 182",
      sourceId: "aeat.model-182.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-182.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-182.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-link-file-help",
      label: "Ayuda oficial de la carga de fichero",
      sourceId: "aeat.model-182.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-182.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-link-approval",
      label: "Orden EHA/3021/2007",
      sourceId: "boe.model-182.order-eha-3021-2007",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-link-amendment",
      label: "Orden HAC/1430/2025",
      sourceId: ORDER_HAC_1430_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-182-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 182?",
      answer:
        "Una declaración informativa de donativos, donaciones y aportaciones recibidas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-faq-channels",
      question: "¿Qué canales de acceso explica la AEAT?",
      answer:
        "Publica ayudas separadas para un formulario web y para la carga de un fichero ajustado al diseño de registro.",
      sourceIds: [
        "aeat.model-182.browser-form-help.2026-06-19",
        "aeat.model-182.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-faq-help-separation",
      question:
        "¿La ayuda del formulario y la del fichero son la misma página?",
      answer:
        "No. La AEAT las publica como dos páginas técnicas distintas dentro de la ayuda de los modelos 181 al 189.",
      sourceIds: [
        "aeat.model-182.browser-form-help.2026-06-19",
        "aeat.model-182.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-faq-design",
      question: "¿El PDF técnico se muestra como impreso del Modelo 182?",
      answer:
        "No. Se clasifica como diseño de registro. Sus metadatos AcroForm no cambian esa naturaleza documental ni justifican una miniatura de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-182.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-faq-approval",
      question: "¿Qué norma aprobó el Modelo 182 registrado aquí?",
      answer: "La Orden EHA/3021/2007, de 11 de octubre.",
      sourceIds: ["boe.model-182.order-eha-3021-2007"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-182-faq-amendment",
      question: "¿Qué modificación reciente conserva esta ficha?",
      answer:
        "La Orden HAC/1430/2025, que modifica la orden reguladora del Modelo 182 junto con otros modelos informativos.",
      sourceIds: [ORDER_HAC_1430_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"182">;

const MODEL_184_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_RELEASE_ID_V1,
  code: "184",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Entidades en régimen de atribución de rentas. Declaración anual.",
  summary:
    "Declaración informativa anual que la AEAT identifica con entidades en régimen de atribución de rentas.",
  searchTerms: [
    "modelo 184",
    "declaración informativa",
    "entidades",
    "régimen de atribución de rentas",
    "atribución de rentas",
    "declaración anual",
    "formulario web",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 184",
    "nota informativa modelo 184",
    "Orden HAP 2250 2015",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-184-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-184-purpose-identity",
          heading: "Entidades en atribución de rentas",
          text: "El índice general, la página principal y la ficha administrativa identifican el Modelo 184 como declaración informativa anual de entidades en régimen de atribución de rentas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-184.procedure-home.2026-07-08",
            "aeat.model-184.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-184-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-184-access-browser",
          heading: "Formulario web",
          text: "La AEAT publica una ayuda técnica específica para el formulario web del Modelo 184. Aquí se registra su existencia sin reproducir la operativa del servicio.",
          sourceIds: ["aeat.model-184.browser-form-help.2026-02-05"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-184-access-file",
          heading: "Carga de fichero",
          text: "La AEAT publica otra ayuda específica para el canal mediante fichero y muestra ambos accesos en la página principal del modelo.",
          sourceIds: [
            "aeat.model-184.procedure-home.2026-07-08",
            "aeat.model-184.file-upload-help.2026-02-05",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-184-materials",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-184-materials-note",
          heading: "Nota informativa oficial",
          text: "La página principal enlaza una nota informativa de una página sobre dudas de cumplimentación. Se registra como guía documental, sin convertirla en instrucciones propias de esta aplicación.",
          sourceIds: [
            "aeat.model-184.procedure-home.2026-07-08",
            "aeat.model-184.information-note.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-184-materials-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico enlaza un PDF de cuarenta y nueve páginas para el Modelo 184. Es documentación de diseño de registro, no un impreso ni una miniatura del modelo.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-184.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-184-materials-law",
          heading: "Aprobación y modificación registrada",
          text: "La ficha conserva la Orden HAP/2250/2015, asociada a la aprobación del Modelo 184, y la Orden HAC/1430/2025, que modifica esa regulación.",
          sourceIds: [
            "boe.model-184.order-hap-2250-2015",
            ORDER_HAC_1430_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-184.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 184 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI04.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8a5bc50b86e4d83c0e73697fe8569de510e1552c6090f15ae2fac2d26c3db40b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-184.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 184",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI04.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b99a9f818b79fe69ea65c91a029dbe574be089b5bec54faa92eb2c1f73556594",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-184.browser-form-help.2026-02-05",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 184 · formulario web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-184-formulario.html",
      officialUpdatedOn: "2026-02-05",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "beb9b90532c05eaaf9376e51e46ff6bd9ea355b70bfe64bd46c4187c552259b1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-184.file-upload-help.2026-02-05",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 184 · presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-184-fichero.html",
      officialUpdatedOn: "2026-02-05",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bb71cb04665b168b2a1c2a40fd7830fe9395f7b89eaac7d053faaa695634609a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-184.information-note.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 184 · nota informativa sobre dudas de cumplimentación",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI04/Nota_mod_184.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6f9d7e50fc1608f51f8f811db23d3ac66a9f2be82f14e071c8d4f48746c4dff2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-184.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 184 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_184_2025.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b1e2b7884946061d5584f03253745b2936bcd99359f4b096acfe238c42bc9fba",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-184.order-hap-2250-2015",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/2250/2015, de 23 de octubre",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2015-11596",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7be49816ab79553e358620a3d0d07081ea6f882f32ffee76737aa4a69cae8371",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAC_1430_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-184-information-note-document",
      kind: "GUIDE",
      title: "Nota informativa del Modelo 184",
      sourceId: "aeat.model-184.information-note.pdf",
      landingPageSourceId: "aeat.model-184.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "Nota_mod_184.pdf",
      byteLength: 314843,
      pageCount: 1,
      sha256:
        "6f9d7e50fc1608f51f8f811db23d3ac66a9f2be82f14e071c8d4f48746c4dff2",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-184-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 184",
      sourceId: "aeat.model-184.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_184_2025.pdf",
      byteLength: 373652,
      pageCount: 49,
      sha256:
        "b1e2b7884946061d5584f03253745b2936bcd99359f4b096acfe238c42bc9fba",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-184.browser-form-help.2026-02-05",
      "aeat.model-184.file-upload-help.2026-02-05",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-184-link-procedure",
      label: "Página oficial del Modelo 184",
      sourceId: "aeat.model-184.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-184.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-184.browser-form-help.2026-02-05",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-file-help",
      label: "Ayuda oficial de la carga de fichero",
      sourceId: "aeat.model-184.file-upload-help.2026-02-05",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-note",
      label: "Nota informativa oficial del Modelo 184",
      sourceId: "aeat.model-184.information-note.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-184.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-approval",
      label: "Orden HAP/2250/2015",
      sourceId: "boe.model-184.order-hap-2250-2015",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-link-amendment",
      label: "Orden HAC/1430/2025",
      sourceId: ORDER_HAC_1430_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-184-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 184?",
      answer:
        "Una declaración informativa anual de entidades en régimen de atribución de rentas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-faq-channels",
      question: "¿Qué canales técnicos explica la AEAT?",
      answer:
        "Publica ayudas separadas para el formulario web y para la carga de fichero.",
      sourceIds: [
        "aeat.model-184.browser-form-help.2026-02-05",
        "aeat.model-184.file-upload-help.2026-02-05",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-faq-note",
      question: "¿Qué nota adicional enlaza la página oficial?",
      answer:
        "Una nota informativa de una página rotulada como dudas de cumplimentación del Modelo 184.",
      sourceIds: [
        "aeat.model-184.procedure-home.2026-07-08",
        "aeat.model-184.information-note.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-faq-design",
      question: "¿El diseño de registro es una miniatura del impreso?",
      answer:
        "No. Es un documento técnico de cuarenta y nueve páginas y se conserva sin previsualización de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-184.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-faq-approval",
      question: "¿Qué norma aprobó el Modelo 184 registrado aquí?",
      answer: "La Orden HAP/2250/2015, de 23 de octubre.",
      sourceIds: ["boe.model-184.order-hap-2250-2015"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-184-faq-amendment",
      question: "¿Qué modificación reciente conserva esta ficha?",
      answer:
        "La Orden HAC/1430/2025, que modifica la orden reguladora del Modelo 184 junto con otros modelos informativos.",
      sourceIds: [ORDER_HAC_1430_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"184">;

const MODEL_185_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_RELEASE_ID_V1,
  code: "185",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Declaración informativa mensual de los órganos y entidades gestores de la Seguridad Social y Mutualidades.",
  summary:
    "Declaración informativa mensual que el índice de la AEAT identifica con los órganos y entidades gestores de la Seguridad Social y las mutualidades.",
  searchTerms: [
    "modelo 185",
    "declaración informativa mensual",
    "Seguridad Social",
    "mutualidades",
    "cotizaciones de afiliados",
    "cotizaciones de mutualistas",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 185",
    "Orden HAC 96 2003",
    "Orden HAC 1197 2025",
  ],
  sections: [
    {
      id: "model-185-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-185-purpose-index-name",
          heading: "Denominación del índice y de la página",
          text: "El índice general y las páginas propias de la AEAT denominan el Modelo 185 como declaración informativa mensual de los órganos y entidades gestores de la Seguridad Social y las mutualidades.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-185.procedure-home.2026-07-08",
            "aeat.model-185.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-185-purpose-2026-name",
          heading: "Denominación en la Orden HAC/1197/2025",
          text: "La Orden HAC/1197/2025 utiliza la denominación «Declaración informativa mensual de cotizaciones de afiliados y mutualistas». Se conserva esta evolución junto a la etiqueta del índice, sin inferir vigencia o aplicabilidad para una persona o entidad.",
          sourceIds: ["boe.model-185.order-hac-1197-2025"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-185-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-185-access-file",
          heading: "Carga de fichero",
          text: "La ayuda técnica oficial publicada para el Modelo 185 describe un canal mediante fichero ajustado al diseño de registro. Esta ficha solo identifica ese canal externo.",
          sourceIds: ["aeat.model-185.file-upload-help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-185-access-evolution",
          heading: "Evolución documental del canal",
          text: "La ficha administrativa conserva referencias a soporte y teleproceso vía EDITRAN, mientras la página principal anuncia la vía electrónica para declaraciones de 2026 y la ayuda actual describe carga de fichero. Las tres formulaciones quedan trazadas sin convertirlas en instrucciones.",
          sourceIds: [
            "aeat.model-185.procedure-record.2026-07-08",
            "aeat.model-185.procedure-home.2026-07-08",
            "aeat.model-185.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-185-materials",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-185-materials-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico enlaza un PDF de diez páginas rotulado para el Modelo 185 y para ejercicios 2026 y siguientes. Se registra como diseño técnico y no como impreso ni miniatura de la declaración.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-185.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-185-materials-law",
          heading: "Dos etapas normativas registradas",
          text: "La ficha conserva la Orden HAC/96/2003, que describe diseños y teleproceso, y la Orden HAC/1197/2025, que aprueba la denominación de cotizaciones de afiliados y mutualistas y establece un procedimiento posterior.",
          sourceIds: [
            "boe.model-185.order-hac-96-2003",
            "boe.model-185.order-hac-1197-2025",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-185.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 185 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI05.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "10d71280133af34d127a86690e1a29636daa54e1e80fce6d73d8b1d53aac37dc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-185.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 185",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI05.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f5ee45b47ea2f740b62ae9740ee49167e67e3d3cee953cfd24c0a44eed540b6a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-185.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 181 al 189 · Modelo 185",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-185.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7af3c7a5c8ad27c394068d36bc1a354fca8abcafc46f86755d35c871bc1307a9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-185.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 185 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR185_2025.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "102dc91b4e9484b830c81e790cf08569be95e2854fee1138f63f363d35d2bcae",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-185.order-hac-96-2003",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/96/2003, de 28 de enero",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-1911",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1da7979396dc545e9850df39a5dc0f66080f2b6b1551ae0e6c21d0048f9438d7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-185.order-hac-1197-2025",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/1197/2025, de 21 de octubre",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-21726",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "460e1e789663569538945ab58055da0a16e5907ed275793d2665f0a29825127d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-185-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 185",
      sourceId: "aeat.model-185.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR185_2025.pdf",
      byteLength: 185616,
      pageCount: 10,
      sha256:
        "102dc91b4e9484b830c81e790cf08569be95e2854fee1138f63f363d35d2bcae",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: ["aeat.model-185.file-upload-help.2026-06-19"],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-185-link-procedure",
      label: "Página oficial del Modelo 185",
      sourceId: "aeat.model-185.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-185.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-link-help",
      label: "Ayuda técnica oficial del Modelo 185",
      sourceId: "aeat.model-185.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-185.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-link-earlier-order",
      label: "Orden HAC/96/2003",
      sourceId: "boe.model-185.order-hac-96-2003",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-link-current-order",
      label: "Orden HAC/1197/2025",
      sourceId: "boe.model-185.order-hac-1197-2025",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-185-faq-index-name",
      question: "¿Cómo denomina el índice de la AEAT al Modelo 185?",
      answer:
        "Como declaración informativa mensual de los órganos y entidades gestores de la Seguridad Social y mutualidades.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-faq-2026-name",
      question: "¿Qué denominación utiliza la Orden HAC/1197/2025?",
      answer:
        "«Declaración informativa mensual de cotizaciones de afiliados y mutualistas». Esta ficha conserva ambas denominaciones con su fuente.",
      sourceIds: ["boe.model-185.order-hac-1197-2025"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-faq-channel",
      question: "¿Qué canal describe la ayuda técnica actual?",
      answer: "Una carga de fichero ajustada al diseño de registro publicado.",
      sourceIds: ["aeat.model-185.file-upload-help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-faq-channel-evolution",
      question: "¿Por qué la ficha administrativa menciona EDITRAN?",
      answer:
        "La ficha administrativa conserva la descripción de soporte y teleproceso vía EDITRAN, mientras la página y ayuda actuales documentan la transición a vía electrónica y carga de fichero.",
      sourceIds: [
        "aeat.model-185.procedure-record.2026-07-08",
        "aeat.model-185.procedure-home.2026-07-08",
        "aeat.model-185.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-faq-design",
      question: "¿El PDF enlazado es un impreso del Modelo 185?",
      answer:
        "No. Es un diseño de registro técnico de diez páginas y se conserva sin miniatura de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-185.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-185-faq-laws",
      question: "¿Qué etapas normativas refleja esta ficha?",
      answer:
        "Registra la Orden HAC/96/2003, vinculada a diseños y teleproceso, y la Orden HAC/1197/2025, que aprueba la denominación posterior del modelo.",
      sourceIds: [
        "boe.model-185.order-hac-96-2003",
        "boe.model-185.order-hac-1197-2025",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"185">;

export const PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_CONTENT_V1 = deepFreeze([
  MODEL_181_CONTENT,
  MODEL_182_CONTENT,
  MODEL_184_CONTENT,
  MODEL_185_CONTENT,
] as const);

export type PublicAeatBatch05AnnualInformationCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_CONTENT_V1)[number]["code"];
