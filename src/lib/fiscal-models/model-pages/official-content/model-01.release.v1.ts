import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

export const PUBLIC_AEAT_MODEL_01_OFFICIAL_CONTENT_V1 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-01-official-content.2026-07-13.v1",
  code: "01",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: "2026-07-13",
  canonicalName:
    "Certificados tributarios. Expedición de certificados tributarios. Estar al corriente de obligaciones tributarias.",
  summary:
    "Solicitud de un certificado de la Agencia Tributaria sobre la situación de estar al corriente de las obligaciones tributarias.",
  searchTerms: [
    "modelo 01",
    "certificado tributario",
    "situación tributaria",
    "estar al corriente",
    "certificado positivo",
    "certificado negativo",
    "deudas tributarias",
    "declaraciones no presentadas",
    "certificado electrónico",
    "DNI electrónico",
    "Cl@ve",
    "oficinas AEAT",
  ],
  sections: [
    {
      id: "model-01-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-01-purpose-summary",
          heading: "Certificado de situación tributaria",
          text: "Permite solicitar a la Agencia Tributaria un certificado que acredita la situación de estar al corriente de las obligaciones tributarias.",
          sourceIds: ["aeat.model-01.procedure-home.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-01-certificate-scope",
      title: "Qué certifica",
      kind: "SCOPE",
      items: [
        {
          id: "model-01-scope",
          heading: "Contenido del certificado",
          text: "La información oficial explica que el certificado acredita si una persona o entidad se encuentra al corriente de sus obligaciones tributarias en los términos descritos por la normativa aplicable.",
          sourceIds: ["aeat.model-01.what-certifies.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-01-results",
          heading: "Resultados que describe la AEAT",
          text: "La AEAT distingue certificados positivos y certificados negativos por deudas, por falta de presentación de declaraciones o por ambas circunstancias.",
          sourceIds: ["aeat.model-01.what-certifies.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-01-access",
      title: "Cómo se obtiene",
      kind: "ACCESS",
      items: [
        {
          id: "model-01-online",
          heading: "Por internet",
          text: "La AEAT ofrece la solicitud por internet mediante certificado electrónico, DNI electrónico o Cl@ve.",
          sourceIds: ["aeat.model-01.where-obtained.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-01-offices",
          heading: "En oficinas",
          text: "La información oficial también contempla la solicitud en oficinas de la AEAT en los supuestos indicados por la propia Agencia Tributaria.",
          sourceIds: ["aeat.model-01.where-obtained.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-01.procedure-home.2025-11-21",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Certificados tributarios. Estar al corriente de obligaciones tributarias",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G304.shtml",
      officialUpdatedOn: "2025-11-21",
      capturedOn: "2026-07-13",
      sourceSha256:
        "fa0659e3bd3e932b549aae964e6a6eaa605188152745101a5d4f8ca2a04b84ef",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.procedure-record.2025-11-21",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento de certificados tributarios",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml",
      officialUpdatedOn: "2025-11-21",
      capturedOn: "2026-07-13",
      sourceSha256:
        "5619222d34117a8c8eb6b6802910b7f700f7191e849dea0263a067d0b5c4544c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.what-certifies.2025-11-21",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "¿Qué certifica?",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/que-certifica.html",
      officialUpdatedOn: "2025-11-21",
      capturedOn: "2026-07-13",
      sourceSha256:
        "2142679213c1ab2cf707d3084497d0e149081f9a79c192455bec7107cab89c74",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.where-obtained.2025-11-21",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "¿Dónde se obtiene?",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/se-obtiene.html",
      officialUpdatedOn: "2025-11-21",
      capturedOn: "2026-07-13",
      sourceSha256:
        "6ca21d37058e3caabf3a8fade78724ec89ed258d6a1b4fa66d9ba7bc024e9f6d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.download.2026-06-04",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del modelo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/descarga-modelo.html",
      officialUpdatedOn: "2026-06-04",
      capturedOn: "2026-07-13",
      sourceSha256:
        "8e3ddf9c8783a3bbe53f2363e4a7c7f36dcbd4f2df92197d43cfebf086de40be",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.faq.2025-03-03",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del certificado",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/preguntas-frecuentes.html",
      officialUpdatedOn: "2025-03-03",
      capturedOn: "2026-07-13",
      sourceSha256:
        "8c3291b34e745752570ab541357cf983c96ad86e16ac92f542dd131c49e1d68a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.form-pdf.2022-07-26",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario oficial del Modelo 01",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/mod01_es_ES.pdf",
      officialUpdatedOn: "2022-07-26",
      capturedOn: "2026-07-13",
      sourceSha256:
        "d3cf04259bca029b43bc7f92df9ff3ad07f112cd05fe612659c4fbdf44ee32c2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01.instructions-pdf.2022-07-26",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones oficiales del Modelo 01",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/instr_mod01.pdf",
      officialUpdatedOn: "2022-07-26",
      capturedOn: "2026-07-13",
      sourceSha256:
        "b06ee06058f3804d9b10c70fe24fcc57cb777ebc2aa226ac949544ad608cb6d2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.rd-1065-2007.article-70",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 1065/2007, de 27 de julio · artículos 70 a 76",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&tn=1#a70",
      officialUpdatedOn: "2025-04-02",
      capturedOn: "2026-07-13",
      sourceSha256:
        "ae09c22753b5b5cc50aa1236d96d1a87675bb8335bcc3ce0c1f8d9baad8456ed",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.personal-area.2026-07-13",
      authority: "AEAT",
      kind: "PERSONAL_AREA",
      title: "Mi área personal de la AEAT",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html",
      officialUpdatedOn: null,
      capturedOn: "2026-07-13",
      sourceSha256:
        "757555259200efe6a791e5d3c49a5ad3bdfcc3f6a8843a5a55f8251068f5418c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-01-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 01",
      sourceId: "aeat.model-01.form-pdf.2022-07-26",
      landingPageSourceId: "aeat.model-01.download.2026-06-04",
      mediaType: "application/pdf",
      fileName: "mod01_es_ES.pdf",
      byteLength: 322139,
      pageCount: 2,
      sha256:
        "d3cf04259bca029b43bc7f92df9ff3ad07f112cd05fe612659c4fbdf44ee32c2",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-01-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 01",
      sourceId: "aeat.model-01.instructions-pdf.2022-07-26",
      landingPageSourceId: "aeat.model-01.download.2026-06-04",
      mediaType: "application/pdf",
      fileName: "instr_mod01.pdf",
      byteLength: 56614,
      pageCount: 1,
      sha256:
        "b06ee06058f3804d9b10c70fe24fcc57cb777ebc2aa226ac949544ad608cb6d2",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-01-form-preview",
    sourceId: "aeat.model-01.form-pdf.2022-07-26",
    publicHref:
      "/fiscal-models/modelo-01/formulario-modelo-01-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "205665d686f3fd00bbfc9ae7c80935f9d3da4696e44c703d74dea79e02fac873",
    alt: "Vista previa de la primera página del formulario oficial del Modelo 01 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-01-info-what",
      label: "Qué certifica",
      sourceId: "aeat.model-01.what-certifies.2025-11-21",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-info-where",
      label: "Dónde se obtiene",
      sourceId: "aeat.model-01.where-obtained.2025-11-21",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-faq-link",
      label: "Preguntas frecuentes en la AEAT",
      sourceId: "aeat.model-01.faq.2025-03-03",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-procedure",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-01.procedure-home.2025-11-21",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-legal",
      label: "Artículos 70 a 76 del Real Decreto 1065/2007",
      sourceId: "boe.rd-1065-2007.article-70",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-01-faq-purpose",
      question: "¿Qué acredita el Modelo 01?",
      answer: "Acredita la situación de una persona o entidad respecto a estar al corriente de sus obligaciones tributarias, de acuerdo con la información que mantiene la Agencia Tributaria.",
      sourceIds: ["aeat.model-01.what-certifies.2025-11-21"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-faq-result",
      question: "¿Qué resultados puede reflejar el certificado?",
      answer: "La AEAT describe certificados positivos y certificados negativos por deudas, por falta de presentación de declaraciones o por ambas circunstancias.",
      sourceIds: ["aeat.model-01.what-certifies.2025-11-21"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-faq-online",
      question: "¿Se puede solicitar por internet?",
      answer: "Sí. La Agencia Tributaria ofrece la solicitud por internet con certificado electrónico, DNI electrónico o Cl@ve.",
      sourceIds: ["aeat.model-01.where-obtained.2025-11-21"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01-faq-offices",
      question: "¿Existe atención en oficinas?",
      answer: "La AEAT contempla la solicitud en sus oficinas en los supuestos recogidos en su información oficial.",
      sourceIds: ["aeat.model-01.where-obtained.2025-11-21"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: {
    kind: "AEAT_PERSONAL_AREA",
    title: "Mi área personal de la AEAT",
    sourceId: "aeat.personal-area.2026-07-13",
    policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY",
  },
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"01">;
