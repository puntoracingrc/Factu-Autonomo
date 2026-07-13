import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

const model038 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-038-official-content.2026-07-13.v1",
  code: "038",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: "2026-07-13",
  canonicalName:
    "Declaración Informativa. Relación de operaciones realizadas por entidades inscritas en Registros públicos.",
  summary:
    "Declaración informativa sobre determinadas inscripciones de entidades autorizadas por titulares de registros públicos.",
  searchTerms: [
    "modelo 038",
    "declaración informativa",
    "registros públicos",
    "titulares de registros públicos",
    "constitución de entidades",
    "modificación de entidades",
    "extinción de entidades",
    "Impuesto sobre Sociedades",
    "diseño de registro 038",
  ],
  sections: [
    {
      id: "model-038-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-038-purpose-summary",
          heading: "Relación de operaciones registrales",
          text: "La ficha oficial identifica el Modelo 038 como la declaración informativa relativa a inscripciones de constitución, establecimiento, modificación o extinción de entidades sujetas al Impuesto sobre Sociedades, autorizadas por titulares de registros públicos.",
          sourceIds: ["aeat.model-038.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-038-access",
      title: "Presentación y consulta en la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-038-file",
          heading: "Presentación por fichero",
          text: "La ayuda técnica de la AEAT describe la lectura, validación y envío de un fichero ajustado al diseño de registro del modelo.",
          sourceIds: ["aeat.model-038.help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-038-query",
          heading: "Consultas y bajas",
          text: "La página oficial reúne, además de la presentación, las gestiones de consulta y baja de declaraciones del modelo.",
          sourceIds: ["aeat.model-038.procedure-home.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-038-format",
      title: "Formato publicado",
      kind: "DETAILS",
      items: [
        {
          id: "model-038-register-design",
          heading: "Diseño de registro",
          text: "La descarga oficial es el diseño técnico del fichero del Modelo 038. No es un impreso para cumplimentar ni se muestra como formulario en esta web.",
          sourceIds: ["aeat.model-038.register-design-pdf.2024-06-28"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-038.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 038. Relación de operaciones realizadas por entidades inscritas en Registros públicos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI29.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: "2026-07-13",
      sourceSha256:
        "29b2e1bcd50dd2a2c46a2618430afa29d6d7660fdcde7362d9e97c5a247cc9fc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-038.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 038",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI29.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: "2026-07-13",
      sourceSha256:
        "02ad139cd13addb6b0c0863f63981177cff54866f0f947707fa3c38a33b473b3",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-038.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 038",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-038.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: "2026-07-13",
      sourceSha256:
        "70a21aee13ae99e3552f281c2cdd0c48a0fcddb908120bb95ee6b822b87a4622",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-038.register-design-pdf.2024-06-28",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Diseño de registro del Modelo 038",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_01_99/archivos/dr038_2024.pdf",
      officialUpdatedOn: "2024-06-28",
      capturedOn: "2026-07-13",
      sourceSha256:
        "f2f713cd60b26548ab9fb57b457f28c5a7841423592f95debdf83a78d9e2f0fe",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-038.order-2002",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/66/2002, de 15 de enero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2002-1041",
      officialUpdatedOn: null,
      capturedOn: "2026-07-13",
      sourceSha256:
        "a6614b2cc0fdc41a5e9bc83603b5c42c0913106ead9bac04bf01be96f06c964f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-038.update-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/646/2024, de 25 de junio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2024-13049",
      officialUpdatedOn: null,
      capturedOn: "2026-07-13",
      sourceSha256:
        "3ba0fd092f7f8b95df403b444baf9cab9b49eb9bbdb59a288d58fbafb7d36b4d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-038-register-design",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 038",
      sourceId: "aeat.model-038.register-design-pdf.2024-06-28",
      landingPageSourceId: null,
      mediaType: "application/pdf",
      fileName: "dr038_2024.pdf",
      byteLength: 94268,
      pageCount: 2,
      sha256:
        "f2f713cd60b26548ab9fb57b457f28c5a7841423592f95debdf83a78d9e2f0fe",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-038-procedure",
      label: "Página oficial del Modelo 038",
      sourceId: "aeat.model-038.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-038-help-link",
      label: "Ayuda técnica del Modelo 038",
      sourceId: "aeat.model-038.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-038-law-approval",
      label: "Orden HAC/66/2002",
      sourceId: "boe.model-038.order-2002",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-038-law-update",
      label: "Orden HAC/646/2024",
      sourceId: "boe.model-038.update-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-038-faq-purpose",
      question: "¿Qué información recoge el Modelo 038?",
      answer: "Recoge la información que la ficha oficial asocia a determinadas inscripciones de constitución, establecimiento, modificación o extinción de entidades sujetas al Impuesto sobre Sociedades.",
      sourceIds: ["aeat.model-038.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-038-faq-format",
      question: "¿La AEAT publica un impreso del Modelo 038?",
      answer: "La descarga oficial disponible es un diseño de registro para preparar el fichero. No es un impreso estático para cumplimentar.",
      sourceIds: ["aeat.model-038.register-design-pdf.2024-06-28"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-038-faq-validation",
      question: "¿Qué explica la ayuda técnica?",
      answer: "Explica la lectura y validación del fichero, la revisión de registros y el proceso de envío desde la sede de la AEAT.",
      sourceIds: ["aeat.model-038.help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"038">;

const model039 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-039-official-content.2026-07-13.v1",
  code: "039",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: "2026-07-13",
  canonicalName:
    "Comunicación de datos relativa al Régimen especial del Grupo de Entidades en el Impuesto sobre el Valor Añadido.",
  summary:
    "Comunicación a la AEAT de datos relativos al régimen especial del grupo de entidades en el IVA.",
  searchTerms: [
    "modelo 039",
    "comunicación de datos",
    "régimen especial del grupo de entidades",
    "IVA",
    "grupo de entidades",
    "entidad dominante",
    "entidades dependientes",
    "comunicación anual",
    "diseño de registro 039",
  ],
  sections: [
    {
      id: "model-039-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-039-purpose-summary",
          heading: "Datos del régimen especial del grupo de entidades",
          text: "El Modelo 039 comunica a la AEAT datos relativos al régimen especial del grupo de entidades en el IVA, incluida la identificación del grupo, la entidad dominante y las entidades dependientes.",
          sourceIds: [
            "aeat.model-039.form-pdf.2026-05-29",
            "boe.model-039.order-2008",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-039-access",
      title: "Cómo se gestiona",
      kind: "ACCESS",
      items: [
        {
          id: "model-039-form",
          heading: "Formulario electrónico",
          text: "La ayuda de la AEAT explica que el formulario permite importar un fichero conforme al diseño de registro o cumplimentar los datos manualmente.",
          sourceIds: ["aeat.model-039.help.2026-05-06"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-039-copy",
          heading: "Consulta de declaraciones",
          text: "La página oficial incluye gestiones para consultar declaraciones y obtener su copia electrónica.",
          sourceIds: ["aeat.model-039.procedure-home.2026-04-01"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-039-documents",
      title: "Material publicado",
      kind: "DETAILS",
      items: [
        {
          id: "model-039-material",
          heading: "Modelo, instrucciones y diseño",
          text: "La AEAT publica el impreso del Modelo 039, sus instrucciones y el diseño de registro como documentos diferenciados.",
          sourceIds: ["aeat.model-039.download.2026-05-29"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-039.procedure-home.2026-04-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Comprobación censal del régimen especial del grupo de entidades en el IVA",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ33.shtml",
      officialUpdatedOn: "2026-04-01",
      capturedOn: "2026-07-13",
      sourceSha256:
        "b07b5aadd008c4c8b44d85a270e976879b438268aaa13d7f6a9d66d94098cc0c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-039.procedure-record.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha de comprobación censal del régimen especial del grupo de entidades",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ33.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: "2026-07-13",
      sourceSha256:
        "cdf59e698072bb21fe4c0ae66231bd2a3edf60ccd6916d1883f3060c311cde80",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-039.help.2026-05-06",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 039",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-039.html",
      officialUpdatedOn: "2026-05-06",
      capturedOn: "2026-07-13",
      sourceSha256:
        "05f6a47ef386ce796d16834a0dab2915c93ba25771af1104f9be6afce31aee2c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-039.download.2026-05-29",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del Modelo 039",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/censos/comprobacion-cens_____regimen-especial-grupo-entidades-iva_/descarga-modelo.html",
      officialUpdatedOn: "2026-05-29",
      capturedOn: "2026-07-13",
      sourceSha256:
        "d02f7f047297ba7f5463cffc146e89affce54879ee9c03e8e333fe7a0ab51cda",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-039.form-pdf.2026-05-29",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario oficial del Modelo 039",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ33/mod039_es_es.pdf",
      officialUpdatedOn: "2026-05-29",
      capturedOn: "2026-07-13",
      sourceSha256:
        "bdf4f949a257beb5a40355a0edc4d1bc59a9c63c64cb46d736c3346c2324602a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-039.instructions-pdf.2026-05-29",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones del Modelo 039",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ33/instr_mod039.pdf",
      officialUpdatedOn: "2026-05-29",
      capturedOn: "2026-07-13",
      sourceSha256:
        "f97a2b41338b0ce2287c6ae691b4a78989c4ef00321d75190cfebbb2a3a0510f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-039.register-design-pdf.2025-01-21",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Diseño de registro del Modelo 039",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_01_99/archivos/dr039.pdf",
      officialUpdatedOn: "2025-01-21",
      capturedOn: "2026-07-13",
      sourceSha256:
        "ba0924c123f3d9b83576d298ed5209d0704c75323480636469e1892669992a93",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-039.order-2008",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/3788/2008, de 29 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2008-20955",
      officialUpdatedOn: null,
      capturedOn: "2026-07-13",
      sourceSha256:
        "fce15bbcfad485ffbd9bc8d1199db55be90823cec65ed7938caedc9ad89805ab",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-039-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 039",
      sourceId: "aeat.model-039.form-pdf.2026-05-29",
      landingPageSourceId: "aeat.model-039.download.2026-05-29",
      mediaType: "application/pdf",
      fileName: "mod039_es_es.pdf",
      byteLength: 121270,
      pageCount: 2,
      sha256:
        "bdf4f949a257beb5a40355a0edc4d1bc59a9c63c64cb46d736c3346c2324602a",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-039-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones del Modelo 039",
      sourceId: "aeat.model-039.instructions-pdf.2026-05-29",
      landingPageSourceId: "aeat.model-039.download.2026-05-29",
      mediaType: "application/pdf",
      fileName: "instr_mod039.pdf",
      byteLength: 70134,
      pageCount: 8,
      sha256:
        "f97a2b41338b0ce2287c6ae691b4a78989c4ef00321d75190cfebbb2a3a0510f",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-039-register-design",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 039",
      sourceId: "aeat.model-039.register-design-pdf.2025-01-21",
      landingPageSourceId: null,
      mediaType: "application/pdf",
      fileName: "dr039.pdf",
      byteLength: 35023,
      pageCount: 4,
      sha256:
        "ba0924c123f3d9b83576d298ed5209d0704c75323480636469e1892669992a93",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-039-form-preview",
    sourceId: "aeat.model-039.form-pdf.2026-05-29",
    publicHref:
      "/fiscal-models/modelo-039/formulario-modelo-039-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "e22c2cbd3bd3338c75ca400a1bccf5300525096a44b6f9bb650613ae265ba852",
    alt: "Vista previa de la primera página del formulario oficial del Modelo 039 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-039-procedure",
      label: "Página oficial que reúne las gestiones del Modelo 039",
      sourceId: "aeat.model-039.procedure-home.2026-04-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-039-help-link",
      label: "Ayuda técnica del Modelo 039",
      sourceId: "aeat.model-039.help.2026-05-06",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-039-download-link",
      label: "Descarga del modelo y las instrucciones",
      sourceId: "aeat.model-039.download.2026-05-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-039-law",
      label: "Orden EHA/3788/2008",
      sourceId: "boe.model-039.order-2008",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-039-faq-purpose",
      question: "¿Para qué sirve el Modelo 039?",
      answer: "Sirve para comunicar a la AEAT datos relativos al régimen especial del grupo de entidades en el IVA.",
      sourceIds: ["boe.model-039.order-2008"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-039-faq-form",
      question: "¿Puede cumplimentarse manualmente?",
      answer: "La ayuda oficial permite cumplimentar el formulario manualmente o importar un fichero ajustado al diseño de registro.",
      sourceIds: ["aeat.model-039.help.2026-05-06"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-039-faq-documents",
      question: "¿Qué documentos publica la AEAT?",
      answer: "La página de descarga enlaza el impreso del modelo y sus instrucciones; la AEAT también publica un diseño de registro diferenciado.",
      sourceIds: [
        "aeat.model-039.download.2026-05-29",
        "aeat.model-039.register-design-pdf.2025-01-21",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"039">;

const model040 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-040-official-content.2026-07-13.v1",
  code: "040",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: "2026-07-13",
  canonicalName: "Registros de Operadores de Plataforma.",
  summary:
    "Declaración censal de alta, modificación y baja en los registros de operadores de plataforma definidos por la normativa.",
  searchTerms: [
    "modelo 040",
    "operadores de plataforma",
    "registro de operadores de plataforma",
    "operadores extranjeros no cualificados",
    "otros operadores",
    "declaración censal",
    "DAC7",
    "actividad pertinente",
    "situación censal",
  ],
  sections: [
    {
      id: "model-040-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-040-purpose-summary",
          heading: "Registros de operadores de plataforma",
          text: "El Modelo 040 permite gestionar el alta, la modificación y la baja en el registro de operadores de plataforma extranjeros no cualificados y en el registro de otros operadores de plataforma obligados a comunicar información.",
          sourceIds: [
            "aeat.model-040.procedure-record.2026-07-10",
            "boe.model-040.order-2024",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-040-registers",
      title: "Qué registros distingue",
      kind: "SCOPE",
      items: [
        {
          id: "model-040-foreign",
          heading: "Operadores extranjeros no cualificados",
          text: "La AEAT mantiene gestiones diferenciadas de alta, modificación y baja para este registro.",
          sourceIds: ["aeat.model-040.procedure-home.2026-07-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-040-other",
          heading: "Otros operadores obligados a informar",
          text: "La página del procedimiento ofrece gestiones separadas para el registro de otros operadores de plataforma obligados a comunicar información.",
          sourceIds: ["aeat.model-040.procedure-home.2026-07-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-040-access",
      title: "Acceso y consulta",
      kind: "ACCESS",
      items: [
        {
          id: "model-040-online",
          heading: "Formulario electrónico",
          text: "La ficha oficial identifica el procedimiento como electrónico y la ayuda técnica describe el acceso con certificado electrónico.",
          sourceIds: [
            "aeat.model-040.procedure-record.2026-07-10",
            "aeat.model-040.help.2026-05-06",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-040-query",
          heading: "Consulta de situación censal",
          text: "La AEAT incluye una consulta específica de la situación censal de los operadores de plataforma.",
          sourceIds: ["aeat.model-040.help.2026-05-06"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-040.procedure-home.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 040. Registros de Operadores de Plataforma",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G335.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: "2026-07-13",
      sourceSha256:
        "4644930a5f0cf014f3d651fc2741d0ad9d0335244afc223e00e634ba96af3850",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-040.procedure-record.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 040",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G335.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: "2026-07-13",
      sourceSha256:
        "2ce635c69ec07e6fc274834e10caa0ad6551d2dbeeff9b7dd371eb75562ea633",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-040.info.2025-12-01",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Las declaraciones censales. Modelo 040",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/declaraciones-censales-modelo-040.html",
      officialUpdatedOn: "2025-12-01",
      capturedOn: "2026-07-13",
      sourceSha256:
        "9a18c14b06712abded650123865625d5374bc42070a7a258090df085c51e7e39",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-040.help.2026-05-06",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 040",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-040.html",
      officialUpdatedOn: "2026-05-06",
      capturedOn: "2026-07-13",
      sourceSha256:
        "ec6e19fdebf45d6ca5b490e480840650c81d31b773182101ff953813ab516613",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-040.faq.2025-06-03",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 040",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/declaraciones-censales-modelo-040/preguntas-frecuentes-modelo-040.html",
      officialUpdatedOn: "2025-06-03",
      capturedOn: "2026-07-13",
      sourceSha256:
        "08505fc35d22bb56803fefe52e37dd31af69c0af99663d13e34ad23debbbaf20",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-040.order-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/72/2024, de 1 de febrero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2024-2092",
      officialUpdatedOn: null,
      capturedOn: "2026-07-13",
      sourceSha256:
        "1e25161257ebd6485c2a4353bcf56e8d20ef4a4dbfbfb5d152dff9b724044d58",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-040-procedure",
      label: "Página oficial del Modelo 040",
      sourceId: "aeat.model-040.procedure-home.2026-07-10",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-040-help-link",
      label: "Ayuda técnica del Modelo 040",
      sourceId: "aeat.model-040.help.2026-05-06",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-040-faq-link",
      label: "Preguntas frecuentes en la AEAT",
      sourceId: "aeat.model-040.faq.2025-06-03",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-040-law",
      label: "Orden HAC/72/2024",
      sourceId: "boe.model-040.order-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-040-faq-purpose",
      question: "¿Qué es el Modelo 040?",
      answer: "Es la declaración censal vinculada a los registros de operadores de plataforma que define la Orden HAC/72/2024.",
      sourceIds: ["boe.model-040.order-2024"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-040-faq-registers",
      question: "¿Qué registros diferencia?",
      answer: "La AEAT diferencia el registro de operadores de plataforma extranjeros no cualificados y el registro de otros operadores de plataforma obligados a comunicar información.",
      sourceIds: ["aeat.model-040.procedure-record.2026-07-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-040-faq-format",
      question: "¿Existe un impreso PDF descargable?",
      answer: "La página oficial ofrece formularios electrónicos separados y no publica un impreso PDF estático del Modelo 040.",
      sourceIds: ["aeat.model-040.procedure-home.2026-07-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-040-faq-query",
      question: "¿Puede consultarse la situación censal?",
      answer: "Sí. La AEAT ofrece una consulta específica de situación censal de operadores de plataforma.",
      sourceIds: ["aeat.model-040.help.2026-05-06"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"040">;

export const PUBLIC_AEAT_BATCH_01_LATE_CONTENT_V1 = [
  model038,
  model039,
  model040,
] as const satisfies readonly PublicAeatOfficialModelContentV1[];
