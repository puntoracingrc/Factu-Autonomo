import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_RELEASE_ID_V1 =
  "public-aeat-official-batch-06-declarations-190-193.2026-07-13.v1" as const;

export type PublicAeatBatch06Declarations190193CodeV1 = "190" | "192" | "193";

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

const ORDER_EHA_3127_2009_SOURCE = {
  id: "boe.model-190.order-eha-3127-2009",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3127/2009, de 10 de noviembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2009-18567",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "05ea1fe5dfa3e9cc09704758e45d7105d227b1ffdd243dbb4db2b0d8402143b9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1431_2025_SOURCE = {
  id: "boe.model-190.order-hac-1431-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1431/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-25390",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "800f599e6c90760e13c2b5482328339ad0e9c39a33e5b0e098594c57f52c2f79",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_2001_10_04_SOURCE = {
  id: "boe.model-192.order-2001-10-04",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 4 de octubre de 2001",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2001-18666",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dbda4951c0c571129ff3c963e67b2d535a759bb9db37e602d6e3da70a7b768fa",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1504_2024_SOURCE = {
  id: "boe.models-192-193.order-hac-1504-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1504/2024, de 26 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-27528",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "91c443efff4b5cca5403d5573be18061effa495cdd9769c6dfc305b3c9110c3c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_EHA_3377_2011_SOURCE = {
  id: "boe.model-193.order-eha-3377-2011",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3377/2011, de 1 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2011-19396",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "26c3e0cff028cb11c80fcdd4704fab68165bfae25766e60cc775a974ab5ce034",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1430_2025_SOURCE = {
  id: "boe.model-193.order-hac-1430-2025",
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

const MODEL_190_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_RELEASE_ID_V1,
  code: "190",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Retenciones e ingresos a cuenta. Rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de rentas. Resumen anual.",
  summary:
    "Declaración informativa que la AEAT identifica como resumen anual de retenciones e ingresos a cuenta vinculados a rendimientos del trabajo, actividades económicas, premios y determinadas rentas.",
  searchTerms: [
    "modelo 190",
    "declaración informativa",
    "resumen anual de retenciones",
    "rendimientos del trabajo",
    "actividades económicas",
    "premios",
    "ganancias patrimoniales",
    "imputaciones de rentas",
    "formulario web",
    "presentación mediante fichero",
    "certificado de retenciones",
    "preguntas frecuentes modelo 190",
    "diseño de registro 190",
    "Orden EHA 3127 2009",
    "Orden HAC 1431 2025",
  ],
  sections: [
    {
      id: "model-190-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-190-purpose-identity",
          heading: "Resumen anual de retenciones e ingresos a cuenta",
          text: "El índice general y las páginas del procedimiento de la AEAT identifican el Modelo 190 como una declaración informativa y resumen anual referido a rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de rentas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-190.procedure-home.2026-07-08",
            "aeat.model-190.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-190-purpose-administrative-scope",
          heading: "Ficha administrativa separada",
          text: "La ficha administrativa de la AEAT describe el objeto del procedimiento con referencia al resumen anual de retenciones e ingresos a cuenta del IRPF para las categorías de renta que figuran en la denominación oficial. Esta página no determina quién debe utilizarlo en un caso concreto.",
          sourceIds: ["aeat.model-190.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-190-access",
      title: "Canales y documentación descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-190-access-channels",
          heading: "Formulario web y fichero",
          text: "La ayuda técnica oficial mantiene páginas diferenciadas para un formulario web y para un canal mediante fichero. Aquí se registra únicamente la existencia de esos métodos informativos; no se abre, reproduce ni ejecuta ninguna gestión.",
          sourceIds: [
            "aeat.model-190.browser-form-help.2026-06-19",
            "aeat.model-190.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-190-access-documents",
          heading: "Instrucciones y diseño de registro",
          text: "La página oficial enlaza unas instrucciones en PDF y el catálogo técnico de la AEAT publica un diseño de registro específico. Ambos documentos se ofrecen solo como descargas externas verificadas.",
          sourceIds: [
            "aeat.model-190.instructions-pdf.2026-07-13",
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-190.register-design-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-190-details",
      title: "Ayuda, certificado y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-190-details-help",
          heading: "Preguntas frecuentes y certificado",
          text: "La AEAT publica una página de preguntas frecuentes, una ayuda sobre emisión de certificados y una página de descarga de un certificado de retenciones. El certificado se registra como material relacionado y no como la declaración Modelo 190.",
          sourceIds: [
            "aeat.model-190.faq.2026-07-08",
            "aeat.model-190.certificate-help.2026-04-22",
            "aeat.model-190.certificate-page.2026-03-05",
            "aeat.model-190.certificate-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-190-details-law",
          heading: "Norma de aprobación y modificación registrada",
          text: "La trazabilidad normativa incluye la Orden EHA/3127/2009, que aprueba el Modelo 190, y la Orden HAC/1431/2025, que modifica esa regulación.",
          sourceIds: [
            ORDER_EHA_3127_2009_SOURCE.id,
            ORDER_HAC_1431_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-190.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 190 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9dde8b47123f0393bea696e7fbd5c6109e8ee636288007a0da13a3529f7544b6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 190",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI10.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ad488b568cc10b01dd18e72c76c60811dc7ec014b0a42c59ae2004e53d753c1e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 190 · ayuda técnica del formulario web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-190-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5d48138652f295370a2413db967d73bd4d3102d265a18344ee5ffc58b5a17405",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 190 · ayuda técnica de presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-190-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "18e88843096055b81db45c5c58c4511d0db2be1a4a09351f4287cf9d1930b60a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.certificate-help.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 190 · ayuda para emitir certificados",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-190-certificados.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "795c98239d0d819cff97e75eb3c90604fbd3392161db4dd9f1e6e6492e409bf2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 190",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-190-decla_____moniales-imputaciones-rentas-anual_/preguntas-frecuentes.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "620609de921169ef3a1e1f0b4fa4e06327cceed484af6df3a820a00a1caaf7cb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.certificate-page.2026-03-05",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Modelo 190 · certificado de retenciones",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-190-decla_____moniales-imputaciones-rentas-anual_/certificado-retenciones.html",
      officialUpdatedOn: "2026-03-05",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "147dd0176eaa39275e36cecc233c2413e8ee56ce8ef6cefcae9d4a086544875c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.instructions-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 190 · instrucciones",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI10/Instrucciones/instr_mod190_es_es.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5d75dc197729fe5dfdd13fc2f97de4a4e3f4eaa4db24d68271c559e4dcca92c6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-190.certificate-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Certificado de retenciones relacionado con el Modelo 190",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI10/Certificado/Certificado_unico_2025_es_es.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b5f4494ea626f33c2115c1b4b4df0eb4314ea263bb7165dee40c056264b5fadb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-190.register-design-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 190 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_25/DISENOS_LOGICOS_190_2025.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a7d1092f78620431812354e560a5146a3ae244e0aed69d9d58c353370ba0134d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_EHA_3127_2009_SOURCE,
    ORDER_HAC_1431_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-190-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 190",
      sourceId: "aeat.model-190.instructions-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-190.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "instr_mod190_es_es.pdf",
      byteLength: 225156,
      pageCount: 7,
      sha256:
        "5d75dc197729fe5dfdd13fc2f97de4a4e3f4eaa4db24d68271c559e4dcca92c6",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-190-certificate-form",
      kind: "FORM",
      title:
        "Formulario de certificado de retenciones (no es la declaración Modelo 190)",
      sourceId: "aeat.model-190.certificate-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-190.certificate-page.2026-03-05",
      mediaType: "application/pdf",
      fileName: "Certificado_unico_2025_es_es.pdf",
      byteLength: 72305,
      pageCount: 2,
      sha256:
        "b5f4494ea626f33c2115c1b4b4df0eb4314ea263bb7165dee40c056264b5fadb",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-190-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 190",
      sourceId: "aeat.model-190.register-design-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DISENOS_LOGICOS_190_2025.pdf",
      byteLength: 1110488,
      pageCount: 53,
      sha256:
        "a7d1092f78620431812354e560a5146a3ae244e0aed69d9d58c353370ba0134d",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-190-link-procedure",
      label: "Página oficial del Modelo 190",
      sourceId: "aeat.model-190.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-190.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-190.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-file-help",
      label: "Ayuda oficial del canal mediante fichero",
      sourceId: "aeat.model-190.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-certificate-help",
      label: "Ayuda oficial sobre emisión de certificados",
      sourceId: "aeat.model-190.certificate-help.2026-04-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 190",
      sourceId: "aeat.model-190.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-certificate",
      label: "Certificado de retenciones oficial (no es la declaración)",
      sourceId: "aeat.model-190.certificate-page.2026-03-05",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-instructions",
      label: "Instrucciones oficiales del Modelo 190",
      sourceId: "aeat.model-190.instructions-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-design",
      label: "Diseño de registro técnico del Modelo 190",
      sourceId: "aeat.model-190.register-design-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-base-law",
      label: "Orden EHA/3127/2009",
      sourceId: ORDER_EHA_3127_2009_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-link-latest-law",
      label: "Orden HAC/1431/2025",
      sourceId: ORDER_HAC_1431_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-190-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 190?",
      answer:
        "Como una declaración informativa y resumen anual de retenciones e ingresos a cuenta referido a rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de rentas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-faq-channels",
      question:
        "¿Qué canales informativos describe la AEAT para el Modelo 190?",
      answer:
        "La ayuda oficial documenta un formulario web y un canal mediante fichero. Esta ficha solo informa de esos canales y no conecta con ellos.",
      sourceIds: [
        "aeat.model-190.browser-form-help.2026-06-19",
        "aeat.model-190.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-faq-instructions",
      question: "¿La AEAT publica instrucciones del Modelo 190?",
      answer:
        "Sí. La página oficial enlaza un PDF de instrucciones, registrado aquí como descarga externa con su huella y metadatos documentales.",
      sourceIds: [
        "aeat.model-190.procedure-home.2026-07-08",
        "aeat.model-190.instructions-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-faq-certificate",
      question: "¿Qué es el certificado enlazado junto al Modelo 190?",
      answer:
        "Es un formulario de certificado de retenciones que la AEAT publica como material relacionado. No se presenta aquí como si fuera la propia declaración Modelo 190.",
      sourceIds: [
        "aeat.model-190.certificate-page.2026-03-05",
        "aeat.model-190.certificate-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-faq-official-faq",
      question: "¿Existe una página oficial de preguntas frecuentes?",
      answer:
        "Sí. La AEAT mantiene una página específica de preguntas frecuentes del Modelo 190, enlazada como referencia informativa externa.",
      sourceIds: ["aeat.model-190.faq.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-190-faq-law",
      question: "¿Qué normativa se registra para la identidad del Modelo 190?",
      answer:
        "Se registran la Orden EHA/3127/2009, que aprueba el modelo, y la Orden HAC/1431/2025, que modifica esa regulación.",
      sourceIds: [ORDER_EHA_3127_2009_SOURCE.id, ORDER_HAC_1431_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-190.browser-form-help.2026-06-19",
      "aeat.model-190.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"190">;

const MODEL_192_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_RELEASE_ID_V1,
  code: "192",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de operaciones con Letras del Tesoro.",
  summary:
    "Declaración informativa anual que la AEAT identifica con operaciones sobre Letras del Tesoro y para la que publica un canal mediante fichero y un diseño de registro.",
  searchTerms: [
    "modelo 192",
    "declaración informativa anual",
    "operaciones con Letras del Tesoro",
    "Letras del Tesoro",
    "presentación mediante fichero",
    "TGVI online",
    "diseño de registro 192",
    "Orden de 4 de octubre de 2001",
    "Orden HAC 1504 2024",
  ],
  sections: [
    {
      id: "model-192-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-192-purpose-identity",
          heading: "Operaciones con Letras del Tesoro",
          text: "El índice general y las páginas del procedimiento de la AEAT identifican el Modelo 192 como una declaración informativa anual de operaciones con Letras del Tesoro.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-192.procedure-home.2026-03-01",
            "aeat.model-192.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-192-purpose-record",
          heading: "Objeto recogido en la ficha administrativa",
          text: "La ficha administrativa describe el procedimiento con el mismo ámbito de operaciones con Letras del Tesoro. La información de esta página no evalúa la aplicación del modelo a ninguna persona o entidad.",
          sourceIds: ["aeat.model-192.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-192-access",
      title: "Canal y documentación descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-192-access-file",
          heading: "Canal mediante fichero",
          text: "La ayuda técnica oficial describe un canal basado en un fichero ajustado al diseño de registro y un flujo TGVI online. Esta ficha registra el método solo como información externa.",
          sourceIds: ["aeat.model-192.file-upload-help.2026-04-22"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-192-access-design",
          heading: "Diseño de registro técnico",
          text: "El catálogo técnico de la AEAT enlaza un PDF específico del Modelo 192. Se conserva como documento de diseño de registro descargable, no como formulario visual.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-192.register-design-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-192-details",
      title: "Páginas y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-192-details-pages",
          heading: "Página, ficha y ayuda técnica",
          text: "La AEAT mantiene una página principal, una ficha administrativa y una ayuda técnica específica para el Modelo 192.",
          sourceIds: [
            "aeat.model-192.procedure-home.2026-03-01",
            "aeat.model-192.procedure-record.2026-07-08",
            "aeat.model-192.file-upload-help.2026-04-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-192-details-law",
          heading: "Norma de aprobación y modificación registrada",
          text: "La trazabilidad normativa incluye la Orden de 4 de octubre de 2001, que aprueba el Modelo 192, y la Orden HAC/1504/2024, que modifica esa regulación.",
          sourceIds: [
            ORDER_2001_10_04_SOURCE.id,
            ORDER_HAC_1504_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-192.procedure-home.2026-03-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 192 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI11.shtml",
      officialUpdatedOn: "2026-03-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a99a7c30e3e5456d847e340dfac4984283509fcf2d4438e4fe17e6b5b4ae1541",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-192.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 192",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI11.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2b00061c1df42b7bb812e364bbd6fb52b482f9f78417e2021bcd6bcffcaeb69a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-192.file-upload-help.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 192 · ayuda técnica de presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-192.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b4aa171edd384ec9fc8627e10b401c9c0c65019341a8e5226b5bf9d49cefb078",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-192.register-design-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 192 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_192_2024.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8dadc5e9b36481c26a12c1511109731f463d9844a0c9d36151697d3f6258fa76",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_2001_10_04_SOURCE,
    ORDER_HAC_1504_2024_SOURCE,
  ],
  documents: [
    {
      id: "model-192-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 192",
      sourceId: "aeat.model-192.register-design-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_192_2024.pdf",
      byteLength: 542355,
      pageCount: 13,
      sha256:
        "8dadc5e9b36481c26a12c1511109731f463d9844a0c9d36151697d3f6258fa76",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-192-link-procedure",
      label: "Página oficial del Modelo 192",
      sourceId: "aeat.model-192.procedure-home.2026-03-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-192.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-link-help",
      label: "Ayuda técnica oficial del Modelo 192",
      sourceId: "aeat.model-192.file-upload-help.2026-04-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-link-design",
      label: "Diseño de registro técnico del Modelo 192",
      sourceId: "aeat.model-192.register-design-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-link-base-law",
      label: "Orden de 4 de octubre de 2001",
      sourceId: ORDER_2001_10_04_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-link-latest-law",
      label: "Orden HAC/1504/2024",
      sourceId: ORDER_HAC_1504_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-192-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 192?",
      answer:
        "Como una declaración informativa anual de operaciones con Letras del Tesoro.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-faq-scope",
      question: "¿Qué ámbito recoge la ficha administrativa del Modelo 192?",
      answer:
        "La ficha administrativa mantiene como objeto las operaciones con Letras del Tesoro, sin que esta página determine su aplicación a un caso concreto.",
      sourceIds: ["aeat.model-192.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-faq-channel",
      question: "¿Qué canal describe la ayuda oficial del Modelo 192?",
      answer:
        "Describe un canal mediante fichero ajustado al diseño de registro y un flujo TGVI online.",
      sourceIds: ["aeat.model-192.file-upload-help.2026-04-22"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-faq-design",
      question: "¿Qué documento técnico publica la AEAT para el Modelo 192?",
      answer:
        "Publica un PDF de diseño de registro, conservado aquí únicamente como descarga oficial externa.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-192.register-design-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-192-faq-law",
      question: "¿Qué normativa se registra para identificar el Modelo 192?",
      answer:
        "La Orden de 4 de octubre de 2001 y su modificación recogida en la Orden HAC/1504/2024.",
      sourceIds: [ORDER_2001_10_04_SOURCE.id, ORDER_HAC_1504_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: ["aeat.model-192.file-upload-help.2026-04-22"],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"192">;

const MODEL_193_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_RELEASE_ID_V1,
  code: "193",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Retenciones e ingresos a cuenta del IRPF sobre determinados rendimientos del capital mobiliario. Retenciones e ingresos a cuenta del IS e IRNR (establecimientos permanentes) sobre determinadas rentas. Resumen anual.",
  summary:
    "Declaración informativa que la AEAT identifica como resumen anual de determinadas retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario y otras rentas comprendidas en su denominación oficial.",
  searchTerms: [
    "modelo 193",
    "declaración informativa",
    "resumen anual de retenciones",
    "rendimientos del capital mobiliario",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IS",
    "Impuesto sobre la Renta de no Residentes",
    "IRNR",
    "establecimientos permanentes",
    "formulario web",
    "presentación mediante fichero",
    "diseño de registro 193",
    "Orden EHA 3377 2011",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-193-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-193-purpose-identity",
          heading: "Retenciones sobre capital mobiliario y determinadas rentas",
          text: "El índice general y las páginas del procedimiento de la AEAT identifican el Modelo 193 como una declaración informativa y resumen anual de determinadas retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario y otras rentas incluidas en su denominación oficial.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-193.procedure-home.2026-05-29",
            "aeat.model-193.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-193-purpose-taxes",
          heading: "Impuestos citados por la denominación oficial",
          text: "La ficha administrativa menciona el IRPF para determinados rendimientos del capital mobiliario y el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes para determinadas rentas. Esta página no evalúa esa clasificación para un supuesto concreto.",
          sourceIds: ["aeat.model-193.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-193-access",
      title: "Canales y documentación descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-193-access-channels",
          heading: "Formulario web y fichero",
          text: "La ayuda técnica oficial mantiene páginas diferenciadas para un formulario web y para un canal mediante fichero. Aquí se documentan ambos métodos únicamente como referencias externas.",
          sourceIds: [
            "aeat.model-193.browser-form-help.2026-06-19",
            "aeat.model-193.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-193-access-design",
          heading: "Diseño de registro técnico",
          text: "El catálogo técnico de la AEAT enlaza un PDF específico del Modelo 193. Se conserva como documento de diseño de registro descargable y no se utiliza como formulario o trámite.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-193.register-design-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-193-details",
      title: "Páginas y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-193-details-pages",
          heading: "Página, ficha y ayudas separadas",
          text: "La AEAT publica por separado la página principal, la ficha administrativa y las ayudas técnicas de los dos canales descritos para el Modelo 193.",
          sourceIds: [
            "aeat.model-193.procedure-home.2026-05-29",
            "aeat.model-193.procedure-record.2026-07-08",
            "aeat.model-193.browser-form-help.2026-06-19",
            "aeat.model-193.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-193-details-law",
          heading: "Norma de aprobación y modificaciones registradas",
          text: "La trazabilidad normativa incluye la Orden EHA/3377/2011, que aprueba el Modelo 193, junto con las órdenes HAC/1504/2024 y HAC/1430/2025 que modifican esa regulación.",
          sourceIds: [
            ORDER_EHA_3377_2011_SOURCE.id,
            ORDER_HAC_1504_2024_SOURCE.id,
            ORDER_HAC_1430_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-193.procedure-home.2026-05-29",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 193 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI12.shtml",
      officialUpdatedOn: "2026-05-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "796623e94a8b520a9de96da2acefcc47ce5191d642f0a0661b037f52445a0cea",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-193.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 193",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI12.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "af101df4c950efdfab63b265df91b011d425c23cc7f813cb309daadd6ed441ac",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-193.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 193 · ayuda técnica del formulario web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-193-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fb6a14b092ba619cc56e32ea41f886f61851141502611ff0b948d2dc7cfb7650",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-193.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 193 · ayuda técnica de presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-193-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4f9c7d921f5b62966163b038b6253c6ffe94467227c9da4dc961363e8a4d59b0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-193.register-design-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 193 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_193_2025.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "25ab19076ecc1116c660f8d4b0c47523e6cd271d89869895699c91843f562489",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_EHA_3377_2011_SOURCE,
    ORDER_HAC_1504_2024_SOURCE,
    ORDER_HAC_1430_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-193-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 193",
      sourceId: "aeat.model-193.register-design-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_193_2025.pdf",
      byteLength: 365226,
      pageCount: 51,
      sha256:
        "25ab19076ecc1116c660f8d4b0c47523e6cd271d89869895699c91843f562489",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-193-link-procedure",
      label: "Página oficial del Modelo 193",
      sourceId: "aeat.model-193.procedure-home.2026-05-29",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-193.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-193.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-file-help",
      label: "Ayuda oficial del canal mediante fichero",
      sourceId: "aeat.model-193.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-design",
      label: "Diseño de registro técnico del Modelo 193",
      sourceId: "aeat.model-193.register-design-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-base-law",
      label: "Orden EHA/3377/2011",
      sourceId: ORDER_EHA_3377_2011_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-2024-law",
      label: "Orden HAC/1504/2024",
      sourceId: ORDER_HAC_1504_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-link-latest-law",
      label: "Orden HAC/1430/2025",
      sourceId: ORDER_HAC_1430_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-193-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 193?",
      answer:
        "Como una declaración informativa y resumen anual de determinadas retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario y otras rentas comprendidas en su denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-faq-taxes",
      question:
        "¿Qué impuestos menciona la denominación oficial del Modelo 193?",
      answer:
        "Menciona el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes, dentro del alcance descrito por la ficha administrativa.",
      sourceIds: ["aeat.model-193.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-faq-channels",
      question:
        "¿Qué canales informativos describe la AEAT para el Modelo 193?",
      answer:
        "La ayuda oficial documenta un formulario web y un canal mediante fichero. Esta ficha no conecta con ninguno de ellos.",
      sourceIds: [
        "aeat.model-193.browser-form-help.2026-06-19",
        "aeat.model-193.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-faq-design",
      question: "¿Qué documento técnico publica la AEAT para el Modelo 193?",
      answer:
        "Publica un PDF de diseño de registro, registrado aquí como documentación técnica de descarga externa.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-193.register-design-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-faq-pages",
      question: "¿Qué páginas oficiales se conservan como referencia?",
      answer:
        "Se conservan la página principal, la ficha administrativa y las ayudas técnicas separadas del formulario web y del canal mediante fichero.",
      sourceIds: [
        "aeat.model-193.procedure-home.2026-05-29",
        "aeat.model-193.procedure-record.2026-07-08",
        "aeat.model-193.browser-form-help.2026-06-19",
        "aeat.model-193.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-193-faq-law",
      question: "¿Qué normativa se registra para identificar el Modelo 193?",
      answer:
        "La Orden EHA/3377/2011 y sus modificaciones registradas mediante las órdenes HAC/1504/2024 y HAC/1430/2025.",
      sourceIds: [
        ORDER_EHA_3377_2011_SOURCE.id,
        ORDER_HAC_1504_2024_SOURCE.id,
        ORDER_HAC_1430_2025_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-193.browser-form-help.2026-06-19",
      "aeat.model-193.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"193">;

export const PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_CONTENT_V1 = deepFreeze([
  MODEL_190_CONTENT,
  MODEL_192_CONTENT,
  MODEL_193_CONTENT,
] as const) satisfies readonly PublicAeatOfficialModelContentV1<PublicAeatBatch06Declarations190193CodeV1>[];
