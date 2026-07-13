import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_12_INFORMATION_RETURNS_347_349_RELEASE_ID_V1 =
  "public-aeat-official-batch-12-information-returns-347-349.2026-07-13.v1" as const;

export type PublicAeatBatch12InformationReturns347349CodeV1 = "347" | "349";

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

const MODELS_300_399_REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-300-399.register-designs.2026-02-04",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · Modelos 300 al 399",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-300-399.html",
  officialUpdatedOn: "2026-02-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7df7813fc7fea0d0f44ba6eada7cb578bb007ee5813f3aca5ede9b828470375e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-347.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 347 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c5f1045c87ed93c22ba79527498bb85d9748f860481ddbeb4026fcebb2087427",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-347.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 347",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI27.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5bc8f01e4a21425e5bdecdd82015391cbb554cb0b3ba49b405c657c000773427",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_FORM_HELP_SOURCE = {
  id: "aeat.model-347.form-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 347 · ayuda del formulario web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-347-presentacion-mediante-formulario.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0818ea9cd68df681d0d4d71a87b806f0470d22af0d8fe27b4d44a07a81843a57",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_FILE_HELP_SOURCE = {
  id: "aeat.model-347.file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 347 · ayuda de la presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-347-fichero.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4c3bab3e805fee406f1498a4b6a8cb5dd15c6a76471b24069abc1399cf72bc75",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-347.instructions.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 347 · instrucciones y normativa aplicable",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-347-decla_____racion-anual-operaciones-personas_/instrucciones.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "339aa3c69f346245045ee9d890c975e1172193eee8808b500ffd34a988c1f9a7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_FAQ_SOURCE = {
  id: "aeat.model-347.faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 347 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-347-decla_____racion-anual-operaciones-personas_/preguntas-frecuentes.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "41423c0e0c5d3a06f85b6f13fde83ce7fc44b80bb580c90ec0195c2e4adcf22f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-347.register-design-pdf.2026-02-04",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 347 · diseños lógicos · ejercicio 2025 y siguientes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos/347.pdf",
  officialUpdatedOn: "2026-02-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "14583ea5ee04441356c4572d30630d46bfe0818366e575ac186370dd3fe38361",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_BASE_ORDER_SOURCE = {
  id: "boe.model-347.order-eha-3012-2008.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3012/2008, de 20 de octubre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2008-16973",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a75ea21f0141887e24b25c416a0e4a3cf7ce086794b0ef8d47395d3578761a60",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_LATEST_ORDER_SOURCE = {
  id: "boe.model-347.order-hac-1431-2025.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1431/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25390",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bcfd4f2128d6d867eba0616eaca1da6094ceb1c2667e3462b5515862694fa729",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-349.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 349 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI28.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a5c077f5fb6caf7b3500de88dc08c9b05f7f3be9fc15e56716c4ff90ea87de22",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-349.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 349",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI28.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "984001a2d44902794592157f7fa58325b1ed9740ed039caca7fb8c73f0938b58",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_FORM_HELP_SOURCE = {
  id: "aeat.model-349.form-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 349 · ayuda del formulario web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-349-720/modelo-349-presentacion-mediante-formulario.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "99207c4067adcaa6ca743bf1b9b789ee903bc54a4fd4b442720d6ba5fd81dc07",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_FILE_HELP_SOURCE = {
  id: "aeat.model-349.file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 349 · ayuda de la presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-349-720/modelo-349-presentacion-mediante-fichero.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3b19ba8c2b10bf8f671077d80ca8ccd1260fdd18bcf374973332a5478d6b79b5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_NOTE_SOURCE = {
  id: "aeat.model-349.information-note.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 349 · nota informativa",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/declaraciones-informativas/modelo-349-decla_____n-recapitulativa-operaciones-intracomunitarias_/nota-informativa.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c7812f7f68c1ed32900397a9d861b740990536a4c2d09dd9bf3a6450691e2d61",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-349.instructions-pdf.2026-06-12",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 349 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI28/instr_mod_349.pdf",
  officialUpdatedOn: "2026-06-12",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "da5ec8935319024f59e6d0d9e47281ad5a37e708d0c2149cf80c3d659c788c44",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-349.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 349 · diseños lógicos · ejercicio 2020 y siguientes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos_20/DR_Anexo_349.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "874db49c9aff4d9c024bdee52f869123a9815c09272a0066cf81421ace1a8335",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_BASE_ORDER_SOURCE = {
  id: "boe.model-349.order-eha-769-2010.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/769/2010, de 18 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-5098",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b78a66c67b8c12a1b7a15e90445ebf8fd93fe04c4247aba6076ffc62c2ded7e5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_349_LATEST_ORDER_SOURCE = {
  id: "boe.model-349.order-hac-1274-2020.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1274/2020, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-17269",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b85a56381e6c51838ed9811d523f989e3aa72d5ad600b698636668292a9e295a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_347_DOCUMENTS = [
  {
    id: "model-347-register-design-document",
    kind: "REGISTER_DESIGN",
    title: "Diseños lógicos del Modelo 347 · ejercicio 2025 y siguientes",
    sourceId: MODEL_347_REGISTER_DESIGN_SOURCE.id,
    landingPageSourceId: MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "347.pdf",
    byteLength: 338190,
    pageCount: 26,
    sha256: "14583ea5ee04441356c4572d30630d46bfe0818366e575ac186370dd3fe38361",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_349_DOCUMENTS = [
  {
    id: "model-349-instructions-document",
    kind: "INSTRUCTIONS",
    title: "Instrucciones oficiales del Modelo 349",
    sourceId: MODEL_349_INSTRUCTIONS_SOURCE.id,
    landingPageSourceId: MODEL_349_PROCEDURE_HOME_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "instr_mod_349.pdf",
    byteLength: 407417,
    pageCount: 37,
    sha256: "da5ec8935319024f59e6d0d9e47281ad5a37e708d0c2149cf80c3d659c788c44",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "model-349-register-design-document",
    kind: "REGISTER_DESIGN",
    title: "Diseños lógicos del Modelo 349 · ejercicio 2020 y siguientes",
    sourceId: MODEL_349_REGISTER_DESIGN_SOURCE.id,
    landingPageSourceId: MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "DR_Anexo_349.pdf",
    byteLength: 915219,
    pageCount: 17,
    sha256: "874db49c9aff4d9c024bdee52f869123a9815c09272a0066cf81421ace1a8335",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "ACROFORM_METADATA_ONLY",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_347_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_12_INFORMATION_RETURNS_347_349_RELEASE_ID_V1,
  code: "347",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa anual de operaciones con terceras personas",
  summary:
    "Declaración informativa anual de operaciones con terceras personas, con formulario en navegador y carga mediante fichero documentados por la AEAT.",
  searchTerms: [
    "modelo 347",
    "declaración informativa anual",
    "operaciones con terceras personas",
    "formulario web",
    "presentación mediante fichero",
    "diseños lógicos 347",
    "validación de fichero",
    "preguntas frecuentes modelo 347",
    "Orden EHA 3012 2008",
    "Orden HAC 1431 2025",
  ],
  sections: [
    {
      id: "model-347-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-347-purpose-identity",
          heading: "Operaciones con terceras personas",
          text: "El índice oficial y la página del procedimiento identifican el Modelo 347 como una declaración informativa anual de operaciones con terceras personas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_347_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-347-purpose-object",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de esa declaración anual. Esta página conserva la identidad general sin evaluar su aplicación a ningún caso concreto.",
          sourceIds: [MODEL_347_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-347-access",
      title: "Canales y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-347-access-browser",
          heading: "Formulario en navegador",
          text: "La página oficial y la ayuda técnica describen un formulario web para preparar y validar la información en el navegador. Esta ficha no enlaza la aplicación operativa.",
          sourceIds: [
            MODEL_347_PROCEDURE_HOME_SOURCE.id,
            MODEL_347_FORM_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-347-access-file",
          heading: "Carga mediante fichero",
          text: "La AEAT también documenta una vía mediante fichero ajustado al diseño de registro publicado. Aquí se enlaza únicamente la ayuda informativa y no el servicio de envío.",
          sourceIds: [
            MODEL_347_PROCEDURE_HOME_SOURCE.id,
            MODEL_347_FILE_HELP_SOURCE.id,
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-347-access-validation",
          heading: "Validación diferenciada",
          text: "La ayuda del fichero distingue la validación técnica de los pasos posteriores y separa los registros correctos de los que contienen errores.",
          sourceIds: [MODEL_347_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-347-details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      items: [
        {
          id: "model-347-details-guidance",
          heading: "Instrucciones y preguntas oficiales",
          text: "La página del modelo enlaza una guía de instrucciones y una relación oficial de preguntas frecuentes. Se conservan como referencias externas sin convertir su contenido en una evaluación personalizada.",
          sourceIds: [
            MODEL_347_PROCEDURE_HOME_SOURCE.id,
            MODEL_347_INSTRUCTIONS_SOURCE.id,
            MODEL_347_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-347-details-design",
          heading: "Diseño lógico publicado",
          text: "El catálogo técnico enlaza un PDF de diseños lógicos cuya portada identifica el ejercicio 2025 y siguientes. Es documentación de registros, no un formulario en blanco, y esta ficha no infiere su vigencia futura.",
          sourceIds: [
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
            MODEL_347_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-347-details-law",
          heading: "Normativa enlazada",
          text: "La ficha conserva el texto original de la orden que aprobó el modelo y el de una modificación publicada en 2025 como referencias informativas del BOE.",
          sourceIds: [
            MODEL_347_BASE_ORDER_SOURCE.id,
            MODEL_347_LATEST_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_300_399_REGISTER_DESIGNS_SOURCE,
    MODEL_347_PROCEDURE_HOME_SOURCE,
    MODEL_347_PROCEDURE_RECORD_SOURCE,
    MODEL_347_FORM_HELP_SOURCE,
    MODEL_347_FILE_HELP_SOURCE,
    MODEL_347_INSTRUCTIONS_SOURCE,
    MODEL_347_FAQ_SOURCE,
    MODEL_347_REGISTER_DESIGN_SOURCE,
    MODEL_347_BASE_ORDER_SOURCE,
    MODEL_347_LATEST_ORDER_SOURCE,
  ],
  documents: MODEL_347_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-347-link-procedure",
      label: "Página oficial del Modelo 347",
      sourceId: MODEL_347_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_347_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-form-help",
      label: "Ayuda oficial del formulario web",
      sourceId: MODEL_347_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-file-help",
      label: "Ayuda oficial de la vía mediante fichero",
      sourceId: MODEL_347_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-instructions",
      label: "Instrucciones oficiales del Modelo 347",
      sourceId: MODEL_347_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: MODEL_347_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-register-design",
      label: "Diseños lógicos oficiales del Modelo 347",
      sourceId: MODEL_347_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-base-order",
      label: "Orden EHA/3012/2008, de 20 de octubre",
      sourceId: MODEL_347_BASE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-link-latest-order",
      label: "Orden HAC/1431/2025, de 3 de diciembre",
      sourceId: MODEL_347_LATEST_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-347-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 347?",
      answer:
        "Una declaración informativa anual de operaciones con terceras personas.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_347_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración anual de operaciones con terceras personas.",
      sourceIds: [MODEL_347_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-channels",
      question: "¿Qué canales técnicos documenta la AEAT?",
      answer:
        "La página oficial y sus ayudas describen un formulario web y una vía mediante fichero.",
      sourceIds: [
        MODEL_347_PROCEDURE_HOME_SOURCE.id,
        MODEL_347_FORM_HELP_SOURCE.id,
        MODEL_347_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-file",
      question: "¿La vía mediante fichero utiliza un formato publicado?",
      answer:
        "Sí. La ayuda técnica remite a un fichero ajustado al diseño de registro publicado por la AEAT.",
      sourceIds: [
        MODEL_347_FILE_HELP_SOURCE.id,
        MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-validation",
      question:
        "¿Validar un fichero equivale a completar los pasos posteriores?",
      answer:
        "No. La ayuda oficial describe la validación como una fase técnica diferenciada.",
      sourceIds: [MODEL_347_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-guidance",
      question: "¿Dónde publica la AEAT información explicativa adicional?",
      answer:
        "En las páginas oficiales de instrucciones y preguntas frecuentes enlazadas desde la ficha del modelo.",
      sourceIds: [
        MODEL_347_PROCEDURE_HOME_SOURCE.id,
        MODEL_347_INSTRUCTIONS_SOURCE.id,
        MODEL_347_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-design",
      question: "¿El PDF de diseños lógicos es un formulario rellenable?",
      answer:
        "No. Es documentación técnica de registros; no se detectaron campos AcroForm ni JavaScript y se conserva sin miniatura de formulario.",
      sourceIds: [MODEL_347_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-347-faq-law",
      question: "¿Qué referencias normativas se enlazan?",
      answer:
        "El texto original de la Orden EHA/3012/2008 y el de la Orden HAC/1431/2025, que modifica la orden del modelo.",
      sourceIds: [
        MODEL_347_BASE_ORDER_SOURCE.id,
        MODEL_347_LATEST_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_347_PROCEDURE_HOME_SOURCE.id,
      MODEL_347_PROCEDURE_RECORD_SOURCE.id,
      MODEL_347_FORM_HELP_SOURCE.id,
      MODEL_347_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"347">;

const MODEL_349_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_12_INFORMATION_RETURNS_347_349_RELEASE_ID_V1,
  code: "349",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Declaración recapitulativa de operaciones intracomunitarias.",
  summary:
    "Declaración informativa recapitulativa de operaciones intracomunitarias, con formulario en navegador, carga mediante fichero, instrucciones y diseños lógicos publicados por la AEAT.",
  searchTerms: [
    "modelo 349",
    "IVA operaciones intracomunitarias",
    "declaración recapitulativa",
    "formulario web",
    "presentación mediante fichero",
    "TGVI online",
    "instrucciones modelo 349",
    "diseños lógicos 349",
    "Orden EHA 769 2010",
    "Orden HAC 1274 2020",
  ],
  sections: [
    {
      id: "model-349-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-349-purpose-identity",
          heading: "Operaciones intracomunitarias",
          text: "El índice oficial y la página del procedimiento identifican el Modelo 349 como una declaración informativa recapitulativa de operaciones intracomunitarias.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_349_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-349-purpose-object",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de esa declaración recapitulativa. Esta página no determina su aplicación a una situación concreta.",
          sourceIds: [MODEL_349_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-349-access",
      title: "Canales y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-349-access-browser",
          heading: "Formulario en navegador",
          text: "La página oficial y la ayuda técnica describen un formulario web para preparar y validar la información. Esta ficha no enlaza la aplicación operativa.",
          sourceIds: [
            MODEL_349_PROCEDURE_HOME_SOURCE.id,
            MODEL_349_FORM_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-349-access-file",
          heading: "Carga mediante fichero",
          text: "La AEAT también documenta una vía mediante fichero ajustado al diseño publicado. Aquí se enlaza únicamente la ayuda informativa y no el servicio de transmisión.",
          sourceIds: [
            MODEL_349_PROCEDURE_HOME_SOURCE.id,
            MODEL_349_FILE_HELP_SOURCE.id,
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-349-access-validation",
          heading: "Validación diferenciada",
          text: "La ayuda del fichero distingue la validación técnica de los pasos posteriores y describe resultados separados para registros correctos y erróneos.",
          sourceIds: [MODEL_349_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-349-details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      items: [
        {
          id: "model-349-details-instructions",
          heading: "Instrucciones oficiales",
          text: "La página oficial enlaza un PDF de instrucciones del Modelo 349. Se registra como guía externa y no como formulario para cumplimentar en esta aplicación.",
          sourceIds: [
            MODEL_349_PROCEDURE_HOME_SOURCE.id,
            MODEL_349_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-349-details-note",
          heading: "Nota informativa",
          text: "La AEAT publica una nota que contextualiza una modificación normativa de 2020 del modelo. Se conserva como referencia histórica de esa modificación sin inferir reglas para casos concretos.",
          sourceIds: [
            MODEL_349_NOTE_SOURCE.id,
            MODEL_349_LATEST_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-349-details-design",
          heading: "Diseño lógico publicado",
          text: "El catálogo técnico enlaza un PDF de diseños lógicos rotulado para el ejercicio 2020 y siguientes. Es documentación de registros y esta ficha no infiere su vigencia futura.",
          sourceIds: [
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
            MODEL_349_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-349-details-law",
          heading: "Normativa enlazada",
          text: "La ficha conserva el texto original de la orden que aprobó el modelo y el de una modificación publicada en 2020 como referencias informativas del BOE.",
          sourceIds: [
            MODEL_349_BASE_ORDER_SOURCE.id,
            MODEL_349_LATEST_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_300_399_REGISTER_DESIGNS_SOURCE,
    MODEL_349_PROCEDURE_HOME_SOURCE,
    MODEL_349_PROCEDURE_RECORD_SOURCE,
    MODEL_349_FORM_HELP_SOURCE,
    MODEL_349_FILE_HELP_SOURCE,
    MODEL_349_NOTE_SOURCE,
    MODEL_349_INSTRUCTIONS_SOURCE,
    MODEL_349_REGISTER_DESIGN_SOURCE,
    MODEL_349_BASE_ORDER_SOURCE,
    MODEL_349_LATEST_ORDER_SOURCE,
  ],
  documents: MODEL_349_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-349-link-procedure",
      label: "Página oficial del Modelo 349",
      sourceId: MODEL_349_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_349_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-form-help",
      label: "Ayuda oficial del formulario web",
      sourceId: MODEL_349_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-file-help",
      label: "Ayuda oficial de la vía mediante fichero",
      sourceId: MODEL_349_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-note",
      label: "Nota informativa oficial del Modelo 349",
      sourceId: MODEL_349_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-instructions",
      label: "Instrucciones oficiales del Modelo 349",
      sourceId: MODEL_349_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-register-design",
      label: "Diseños lógicos oficiales del Modelo 349",
      sourceId: MODEL_349_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-base-order",
      label: "Orden EHA/769/2010, de 18 de marzo",
      sourceId: MODEL_349_BASE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-link-latest-order",
      label: "Orden HAC/1274/2020, de 28 de diciembre",
      sourceId: MODEL_349_LATEST_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-349-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 349?",
      answer:
        "Una declaración informativa recapitulativa de operaciones intracomunitarias.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_349_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración recapitulativa de operaciones intracomunitarias.",
      sourceIds: [MODEL_349_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-channels",
      question: "¿Qué canales técnicos documenta la AEAT?",
      answer:
        "La página oficial y sus ayudas describen un formulario web y una vía mediante fichero.",
      sourceIds: [
        MODEL_349_PROCEDURE_HOME_SOURCE.id,
        MODEL_349_FORM_HELP_SOURCE.id,
        MODEL_349_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-file",
      question: "¿La vía mediante fichero utiliza un formato publicado?",
      answer:
        "Sí. La ayuda técnica remite a un fichero ajustado al diseño de registro publicado por la AEAT.",
      sourceIds: [
        MODEL_349_FILE_HELP_SOURCE.id,
        MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-validation",
      question:
        "¿Validar un fichero equivale a completar los pasos posteriores?",
      answer:
        "No. La ayuda oficial describe la validación como una fase técnica diferenciada.",
      sourceIds: [MODEL_349_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-instructions",
      question: "¿Existe un documento oficial de instrucciones?",
      answer:
        "Sí. La página del modelo enlaza un PDF de instrucciones publicado por la AEAT.",
      sourceIds: [
        MODEL_349_PROCEDURE_HOME_SOURCE.id,
        MODEL_349_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-note",
      question: "¿Qué contexto aporta la nota informativa?",
      answer:
        "Explica una modificación normativa del modelo publicada en 2020 y remite a la orden correspondiente.",
      sourceIds: [MODEL_349_NOTE_SOURCE.id, MODEL_349_LATEST_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-documents",
      question: "¿Los PDF registrados son formularios rellenable?",
      answer:
        "No. Son instrucciones y documentación técnica; no se detectó JavaScript y el diseño solo contiene metadatos AcroForm sin campos, por lo que ambos se conservan sin miniatura.",
      sourceIds: [
        MODEL_349_INSTRUCTIONS_SOURCE.id,
        MODEL_349_REGISTER_DESIGN_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-349-faq-law",
      question: "¿Qué referencias normativas se enlazan?",
      answer:
        "El texto original de la Orden EHA/769/2010 y el de la Orden HAC/1274/2020, que modifica la orden del modelo.",
      sourceIds: [
        MODEL_349_BASE_ORDER_SOURCE.id,
        MODEL_349_LATEST_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_349_PROCEDURE_HOME_SOURCE.id,
      MODEL_349_PROCEDURE_RECORD_SOURCE.id,
      MODEL_349_FORM_HELP_SOURCE.id,
      MODEL_349_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"349">;

export const PUBLIC_AEAT_BATCH_12_INFORMATION_RETURNS_347_349_CONTENT_V1 =
  deepFreeze([MODEL_347_CONTENT, MODEL_349_CONTENT] as const);
