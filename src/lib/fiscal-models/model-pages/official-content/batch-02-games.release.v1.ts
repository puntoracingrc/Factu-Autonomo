import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_02_GAMES_RELEASE_ID_V1 =
  "public-aeat-official-batch-02-games.2026-07-13.v1" as const;

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

const MANAGEMENT_SOURCE = {
  id: "aeat.games-management.2026-01-22",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Cuándo se gestionan las tasas sobre el juego en Ceuta y Melilla",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/cuando-se-gestionan-tasas-sobre-melilla.html",
  officialUpdatedOn: "2026-01-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fa5b2bb8b305a9a2fa5964323117399a0718a5221a9d059b73aa34791cc57686",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const APPROVAL_ORDER_SOURCE = {
  id: "boe.order-27-july-2001.models-043-044-045",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 27 de julio de 2001",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2001-15146",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "98ffe8dc97314c6a3067f62e322f472a31d762cfc0555c825c6526723dd67aa9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const GAMES_TAX_DECREE_SOURCE = {
  id: "boe.rdl-16-1977.games",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto-ley 16/1977, de 25 de febrero",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-1977-5883",
  officialUpdatedOn: "2021-12-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9c8e317ff7389fe756a6fce8d8486c51344255c6d13e41e4c519a8d5873c8374",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const GAMES_TAX_REGULATION_SOURCE = {
  id: "boe.rd-2221-1984.games-tax",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 2221/1984, de 12 de diciembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-1984-27691",
  officialUpdatedOn: "1985-03-18",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "61579f024a7491ca083b6a84b175d177afd8f9b7284d96bb242fed500d079904",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_043_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_02_GAMES_RELEASE_ID_V1,
  code: "043",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Tasa fiscal sobre el juego. Salas de bingo. Solicitud liquidación.",
  summary:
    "Modelo que la AEAT vincula a la tasa fiscal sobre el juego en salas de bingo dentro del ámbito de gestión descrito en sus páginas oficiales.",
  searchTerms: [
    "modelo 043",
    "tasa fiscal sobre el juego",
    "salas de bingo",
    "bingo",
    "solicitud liquidación",
    "cartones de bingo",
    "juegos de suerte envite o azar",
    "Ceuta",
    "Melilla",
    "Agencia Tributaria",
    "Orden de 27 de julio de 2001",
  ],
  sections: [
    {
      id: "model-043-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-043-purpose-summary",
          heading: "Tasa sobre el juego en salas de bingo",
          text: "La AEAT identifica el Modelo 043 con la tasa fiscal sobre el juego en salas de bingo y lo denomina solicitud-liquidación.",
          sourceIds: [
            "aeat.model-043.procedure-home.2026-06-09",
            "aeat.model-043.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-043-scope",
      title: "Ámbito que describe la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-043-scope-management",
          heading: "Gestión estatal y referencia territorial",
          text: "La ficha del procedimiento limita su descripción a los casos en los que el rendimiento o la gestión no estén cedidos. La información temática de la AEAT agrupa este modelo dentro de las tasas sobre el juego gestionadas por sus Delegaciones de Ceuta y Melilla. Esta ficha no evalúa la aplicación a un caso concreto.",
          sourceIds: [
            "aeat.model-043.procedure-record.2026-06-09",
            MANAGEMENT_SOURCE.id,
            "aeat.model-043.topic.2026-01-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-043-scope-activity",
          heading: "Actividad identificada",
          text: "La página temática oficial asocia el modelo a salas de bingo y la ficha del procedimiento lo relaciona con la liquidación de la tasa fiscal correspondiente a ese juego.",
          sourceIds: [
            "aeat.model-043.topic.2026-01-22",
            "aeat.model-043.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-043-official-materials",
      title: "Material oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-043-materials-downloads",
          heading: "Formulario e instrucciones",
          text: "La página oficial de descarga enlaza un formulario PDF del Modelo 043 y un documento PDF de instrucciones. Los documentos se registran con vigencia no determinada y se abren únicamente en la Sede de la AEAT.",
          sourceIds: ["aeat.model-043.downloads.2026-05-29"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-043-materials-law",
          heading: "Normativa enlazada",
          text: "La AEAT enlaza la Orden de 27 de julio de 2001, el Real Decreto-ley 16/1977 y el Real Decreto 2221/1984 entre las referencias normativas de esta tasa.",
          sourceIds: [
            APPROVAL_ORDER_SOURCE.id,
            GAMES_TAX_DECREE_SOURCE.id,
            GAMES_TAX_REGULATION_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-043.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 043. Tasa fiscal sobre el juego. Salas de bingo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC09.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fb6be6ea4aa2e179e8f628f7e7490ccbdc079c3b0440f857fe91e8a9895e1353",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-043.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 043",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC09.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "92733062c2ed28c1f04be3e71d08620675dd780d40cddb7c9dca28f0cef247eb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-043.topic.2026-01-22",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Tasa Fiscal sobre el Juego. Salas de Bingo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/tasa-fiscal-sobre-juego-salas-bingo.html",
      officialUpdatedOn: "2026-01-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e5147a39872e4302a594aef31c2168b11fd5f2282754a0d9ccc50602adce0145",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-043.downloads.2026-05-29",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga e instrucciones del Modelo 043",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/tasa-fiscal-sobre-juego-salas-bingo/descarga-instrucciones-modelo.html",
      officialUpdatedOn: "2026-05-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d263d53cdc4c57927c1c05d5574f0c1e499e25e076abb75fe3e4e070c13f4c26",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-043.form-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario PDF oficial del Modelo 043",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/FZ08/Instrucciones/mod043_mi_MI.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "58a7bd4c2ade9d5e563e1fc49b61a7ab0794f60a382dd7a37ed18fbaa45045fe",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-043.instructions-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones PDF oficiales del Modelo 043",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/FZ08/Instrucciones/Instrucciones043.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "29e80e5d5144e84381bb4a1a06533a5da38659978d6c5fc72c5bfa59fd26313d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    MANAGEMENT_SOURCE,
    APPROVAL_ORDER_SOURCE,
    GAMES_TAX_DECREE_SOURCE,
    GAMES_TAX_REGULATION_SOURCE,
  ],
  documents: [
    {
      id: "model-043-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 043",
      sourceId: "aeat.model-043.form-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-043.downloads.2026-05-29",
      mediaType: "application/pdf",
      fileName: "mod043_mi_MI.pdf",
      byteLength: 397617,
      pageCount: 3,
      sha256:
        "58a7bd4c2ade9d5e563e1fc49b61a7ab0794f60a382dd7a37ed18fbaa45045fe",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-043-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 043",
      sourceId: "aeat.model-043.instructions-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-043.downloads.2026-05-29",
      mediaType: "application/pdf",
      fileName: "Instrucciones043.pdf",
      byteLength: 211699,
      pageCount: 2,
      sha256:
        "29e80e5d5144e84381bb4a1a06533a5da38659978d6c5fc72c5bfa59fd26313d",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-043-form-preview",
    sourceId: "aeat.model-043.form-pdf.captured-2026-07-13",
    publicHref:
      "/fiscal-models/modelo-043/formulario-modelo-043-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "8ae70098d1d08e6b8bd1afc66609955fa23f8bfd8b0f91406b157bc89342a417",
    alt: "Vista previa del formulario oficial Modelo 043 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-043-topic-link",
      label: "Información oficial sobre salas de bingo",
      sourceId: "aeat.model-043.topic.2026-01-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-download-link",
      label: "Descarga e instrucciones oficiales",
      sourceId: "aeat.model-043.downloads.2026-05-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-procedure-link",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-043.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-approval-order-link",
      label: "Orden de 27 de julio de 2001",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-games-tax-law-link",
      label: "Real Decreto-ley 16/1977",
      sourceId: GAMES_TAX_DECREE_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-043-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 043?",
      answer: "La AEAT lo identifica como el modelo de la tasa fiscal sobre el juego correspondiente a salas de bingo y lo denomina solicitud-liquidación.",
      sourceIds: ["aeat.model-043.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-faq-activity",
      question: "¿A qué actividad se refiere?",
      answer: "La ficha oficial lo vincula al juego de bingo desarrollado en salas de bingo.",
      sourceIds: [
        "aeat.model-043.topic.2026-01-22",
        "aeat.model-043.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-faq-management",
      question: "¿Cómo organiza la AEAT la información territorial de esta tasa?",
      answer: "La AEAT agrupa su información temática dentro de las tasas sobre el juego gestionadas por sus Delegaciones de Ceuta y Melilla. La aplicabilidad a cada caso debe comprobarse en la fuente oficial.",
      sourceIds: [MANAGEMENT_SOURCE.id, "aeat.model-043.topic.2026-01-22"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-faq-documents",
      question: "¿La AEAT publica formulario e instrucciones?",
      answer: "Sí. La página oficial de descarga enlaza el formulario PDF del Modelo 043 y un PDF separado de instrucciones.",
      sourceIds: ["aeat.model-043.downloads.2026-05-29"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-faq-authority",
      question: "¿Qué organismo figura como responsable del procedimiento?",
      answer: "La ficha oficial señala a la Agencia Estatal de Administración Tributaria como órgano responsable.",
      sourceIds: ["aeat.model-043.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-043-faq-approval",
      question: "¿Qué norma oficial incluye la aprobación del Modelo 043 en euros?",
      answer: "La Orden de 27 de julio de 2001 incluye el Modelo 043 entre los modelos que aprueba en euros.",
      sourceIds: [APPROVAL_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"043">;

const MODEL_044_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_02_GAMES_RELEASE_ID_V1,
  code: "044",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Tasa fiscal sobre el juego. Casas de juego.",
  summary:
    "Modelo que la AEAT vincula a la tasa fiscal sobre casinos o casas de juego dentro del ámbito de gestión descrito en sus páginas oficiales.",
  searchTerms: [
    "modelo 044",
    "tasa fiscal sobre el juego",
    "casas de juego",
    "casinos de juego",
    "casino",
    "juegos de suerte envite o azar",
    "Ceuta",
    "Melilla",
    "Agencia Tributaria",
    "Orden de 27 de julio de 2001",
    "Orden de 13 de noviembre de 1981",
  ],
  sections: [
    {
      id: "model-044-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-044-purpose-summary",
          heading: "Tasa sobre casas de juego",
          text: "La AEAT identifica el Modelo 044 con la tasa fiscal sobre casas de juego y presenta su información temática bajo la denominación de casinos de juego.",
          sourceIds: [
            "aeat.model-044.procedure-home.2026-06-09",
            "aeat.model-044.topic.2026-01-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-044-scope",
      title: "Ámbito que describe la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-044-scope-management",
          heading: "Gestión estatal y referencia territorial",
          text: "La ficha del procedimiento limita su descripción a los casos en los que el rendimiento o la gestión no estén cedidos. La información temática de la AEAT agrupa este modelo dentro de las tasas sobre el juego gestionadas por sus Delegaciones de Ceuta y Melilla. Esta ficha no evalúa la aplicación a un caso concreto.",
          sourceIds: [
            "aeat.model-044.procedure-record.2026-06-09",
            MANAGEMENT_SOURCE.id,
            "aeat.model-044.topic.2026-01-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-044-scope-activity",
          heading: "Actividad identificada",
          text: "La página temática oficial se refiere a casinos de juego, mientras la ficha y el catálogo oficial denominan el modelo como tasa fiscal sobre casas de juego.",
          sourceIds: [
            "aeat.model-044.topic.2026-01-22",
            "aeat.model-044.procedure-home.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-044-official-materials",
      title: "Material oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-044-materials-downloads",
          heading: "Formulario e instrucciones",
          text: "La página oficial de descarga enlaza un formulario PDF del Modelo 044 y un documento PDF de instrucciones. Los documentos se registran con vigencia no determinada y se abren únicamente en la Sede de la AEAT.",
          sourceIds: ["aeat.model-044.downloads.2026-05-29"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-044-materials-law",
          heading: "Normativa enlazada",
          text: "La AEAT enlaza la Orden de 27 de julio de 2001, el Real Decreto-ley 16/1977, el Real Decreto 2221/1984 y la Orden de 13 de noviembre de 1981 entre sus referencias normativas.",
          sourceIds: [
            APPROVAL_ORDER_SOURCE.id,
            GAMES_TAX_DECREE_SOURCE.id,
            GAMES_TAX_REGULATION_SOURCE.id,
            "boe.order-13-november-1981.games-tax",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-044.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 044. Tasa fiscal sobre el juego. Casas de juego",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC10.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1a837fb9025d2f9000351ea31f9a45cb5765c12d35b274fb80cf40e4c48fcd31",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-044.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 044",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC10.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fbbf198f767b5db2e1f6e022ac67c4d429e18975505758b20a81abd6125816a2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-044.topic.2026-01-22",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Tasa Fiscal sobre el Juego. Casinos de juego",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/tasa-fiscal-sobre-juego-casinos-juego.html",
      officialUpdatedOn: "2026-01-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5e9193d9ee2844bbc7e5810db3b5a91a3bdfb47958d5025106d9ae45897bd106",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-044.downloads.2026-05-29",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga e instrucciones del Modelo 044",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/tasa-fiscal-sobre-juego-casinos-juego/descarga-instrucciones-modelo.html",
      officialUpdatedOn: "2026-05-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d061aeccf1a738a9e7cd4bfdbbe4d6ba314dfb3c7c6ffa6c5ce4a5b192273fd5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-044.form-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario PDF oficial del Modelo 044",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Impuestos_Tasas/Tasa_fiscal/Casinos/Mod044.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8ca31d1d858a500db4e7d319154ebb8cfa112b8b34d7c790222936510856bde8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-044.instructions-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones PDF oficiales del Modelo 044",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Impuestos_Tasas/Tasa_fiscal/Casinos/InstruccMod044.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "700ea91f772a2dadb24c35d09c9638e75a240ff4cce7ccfadbb32acebe4adc57",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    MANAGEMENT_SOURCE,
    APPROVAL_ORDER_SOURCE,
    GAMES_TAX_DECREE_SOURCE,
    GAMES_TAX_REGULATION_SOURCE,
    {
      id: "boe.order-13-november-1981.games-tax",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden de 13 de noviembre de 1981",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-1981-27369",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ebe29f9b3800fc074de673642e3099f650d4f62d07307ba75fd8f227cf8abe04",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-044-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 044",
      sourceId: "aeat.model-044.form-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-044.downloads.2026-05-29",
      mediaType: "application/pdf",
      fileName: "Mod044.pdf",
      byteLength: 165330,
      pageCount: 3,
      sha256:
        "8ca31d1d858a500db4e7d319154ebb8cfa112b8b34d7c790222936510856bde8",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-044-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 044",
      sourceId: "aeat.model-044.instructions-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-044.downloads.2026-05-29",
      mediaType: "application/pdf",
      fileName: "InstruccMod044.pdf",
      byteLength: 216058,
      pageCount: 3,
      sha256:
        "700ea91f772a2dadb24c35d09c9638e75a240ff4cce7ccfadbb32acebe4adc57",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-044-form-preview",
    sourceId: "aeat.model-044.form-pdf.captured-2026-07-13",
    publicHref:
      "/fiscal-models/modelo-044/formulario-modelo-044-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "5299fa99fa40f0c6cd431ead1a025111cfafae11c6388beb1dad368717e6ad92",
    alt: "Vista previa del formulario oficial Modelo 044 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-044-topic-link",
      label: "Información oficial sobre casinos de juego",
      sourceId: "aeat.model-044.topic.2026-01-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-download-link",
      label: "Descarga e instrucciones oficiales",
      sourceId: "aeat.model-044.downloads.2026-05-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-procedure-link",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-044.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-approval-order-link",
      label: "Orden de 27 de julio de 2001",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-games-tax-order-link",
      label: "Orden de 13 de noviembre de 1981",
      sourceId: "boe.order-13-november-1981.games-tax",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-044-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 044?",
      answer: "La AEAT lo identifica como el modelo de la tasa fiscal sobre el juego correspondiente a casas de juego.",
      sourceIds: ["aeat.model-044.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-faq-casino",
      question: "¿Por qué también aparece la expresión casinos de juego?",
      answer: "La página temática de la AEAT usa la denominación casinos de juego, mientras la ficha del procedimiento conserva la denominación casas de juego.",
      sourceIds: [
        "aeat.model-044.topic.2026-01-22",
        "aeat.model-044.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-faq-management",
      question: "¿Cómo organiza la AEAT la información territorial de esta tasa?",
      answer: "La AEAT agrupa su información temática dentro de las tasas sobre el juego gestionadas por sus Delegaciones de Ceuta y Melilla. La aplicabilidad a cada caso debe comprobarse en la fuente oficial.",
      sourceIds: [MANAGEMENT_SOURCE.id, "aeat.model-044.topic.2026-01-22"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-faq-documents",
      question: "¿La AEAT publica formulario e instrucciones?",
      answer: "Sí. La página oficial de descarga enlaza el formulario PDF del Modelo 044 y un PDF separado de instrucciones.",
      sourceIds: ["aeat.model-044.downloads.2026-05-29"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-faq-authority",
      question: "¿Qué organismo figura como responsable del procedimiento?",
      answer: "La ficha oficial señala a la Agencia Estatal de Administración Tributaria como órgano responsable.",
      sourceIds: ["aeat.model-044.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-044-faq-approval",
      question: "¿Qué norma oficial incluye la aprobación del Modelo 044 en euros?",
      answer: "La Orden de 27 de julio de 2001 incluye el Modelo 044 entre los modelos que aprueba en euros.",
      sourceIds: [APPROVAL_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"044">;

const MODEL_045_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_02_GAMES_RELEASE_ID_V1,
  code: "045",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Tasa fiscal sobre el juego. Máquinas o aparatos automáticos. Declaración-liquidación.",
  summary:
    "Modelo que la AEAT vincula a la tasa fiscal sobre máquinas o aparatos automáticos dentro del ámbito de gestión descrito en sus páginas oficiales.",
  searchTerms: [
    "modelo 045",
    "tasa fiscal sobre el juego",
    "máquinas recreativas",
    "máquinas de azar",
    "aparatos automáticos",
    "máquinas tipo B",
    "máquinas tipo C",
    "empresa operadora",
    "declaración liquidación",
    "Ceuta",
    "Melilla",
    "Agencia Tributaria",
    "Real Decreto 2110/1998",
  ],
  sections: [
    {
      id: "model-045-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-045-purpose-summary",
          heading: "Tasa sobre máquinas o aparatos automáticos",
          text: "La AEAT identifica el Modelo 045 con la declaración-liquidación de la tasa fiscal sobre el juego mediante máquinas o aparatos automáticos.",
          sourceIds: [
            "aeat.model-045.procedure-home.2026-06-09",
            "aeat.model-045.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-045-scope",
      title: "Ámbito que describe la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-045-scope-management",
          heading: "Gestión estatal y referencia territorial",
          text: "La ficha del procedimiento limita su descripción a los casos en los que el rendimiento o la gestión no estén cedidos. La información temática de la AEAT agrupa este modelo dentro de las tasas sobre el juego gestionadas por sus Delegaciones de Ceuta y Melilla. Esta ficha no evalúa la aplicación a un caso concreto.",
          sourceIds: [
            "aeat.model-045.procedure-record.2026-06-09",
            MANAGEMENT_SOURCE.id,
            "aeat.model-045.topic.2026-01-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-045-scope-activity",
          heading: "Actividad identificada",
          text: "La página temática oficial se refiere a máquinas o aparatos automáticos y la ficha del procedimiento encuadra el modelo en la tasa fiscal sobre esa modalidad de juego.",
          sourceIds: [
            "aeat.model-045.topic.2026-01-22",
            "aeat.model-045.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-045-official-materials",
      title: "Material oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-045-materials-downloads",
          heading: "Formulario e instrucciones",
          text: "La página oficial de descarga enlaza un formulario PDF del Modelo 045 y un documento PDF de instrucciones. Los documentos se registran con vigencia no determinada y se abren únicamente en la Sede de la AEAT.",
          sourceIds: ["aeat.model-045.downloads.2025-11-28"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-045-materials-law",
          heading: "Normativa enlazada",
          text: "La AEAT enlaza la Orden de 27 de julio de 2001, el Real Decreto-ley 16/1977, el Real Decreto 2221/1984 y el Real Decreto 2110/1998 entre sus referencias normativas.",
          sourceIds: [
            APPROVAL_ORDER_SOURCE.id,
            GAMES_TAX_DECREE_SOURCE.id,
            GAMES_TAX_REGULATION_SOURCE.id,
            "boe.rd-2110-1998.machines",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-045.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 045. Tasa fiscal sobre el juego. Máquinas o aparatos automáticos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC11.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "521424f9291fa24e03395180eaf3e20ec2b55112ab9242e95c38616d6ab534c9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-045.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 045",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC11.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a22b8bf5c81f16a1b7de522907fc41a158c8a362ed98be7065d653d144def300",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-045.topic.2026-01-22",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Tasa Fiscal sobre el Juego. Máquinas o aparatos automáticos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/tasa-fiscal-sobre-juego-maquinas-automaticos.html",
      officialUpdatedOn: "2026-01-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b04461e7176dd0d2cfcd9ccb7fa898c3062304981eddb523ecd3ea167761d81f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-045.downloads.2025-11-28",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga e instrucciones del Modelo 045",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/tasas/tasa-fiscal-sobre-juego-maquinas-automaticos/descarga-instrucciones-modelo.html",
      officialUpdatedOn: "2025-11-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "367eeacc93b113669a54426f59add73aa2fdbc4403621a19192f188df735896a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-045.form-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario PDF oficial del Modelo 045",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Impuestos_Tasas/Tasa_fiscal/Maquinas/mod045_mi_MI.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9c8488fc69a3a6972affbe977168eaeb3722bf6b8b919d5d1aaf59cd6cb45e3d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-045.instructions-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones PDF oficiales del Modelo 045",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Impuestos_Tasas/Tasa_fiscal/Maquinas/instr_mod045.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "97e8f2d2ad2c2d2fa6965912fa46d989525e57d37de388a60a57ca29ac28fa64",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    MANAGEMENT_SOURCE,
    APPROVAL_ORDER_SOURCE,
    GAMES_TAX_DECREE_SOURCE,
    GAMES_TAX_REGULATION_SOURCE,
    {
      id: "boe.rd-2110-1998.machines",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 2110/1998, de 2 de octubre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-1998-23945",
      officialUpdatedOn: "2001-03-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ee2cd1e20103c04bf1dc100cc27878734ac0d8909be316c525ed26f4bb21127b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-045-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 045",
      sourceId: "aeat.model-045.form-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-045.downloads.2025-11-28",
      mediaType: "application/pdf",
      fileName: "mod045_mi_MI.pdf",
      byteLength: 595480,
      pageCount: 4,
      sha256:
        "9c8488fc69a3a6972affbe977168eaeb3722bf6b8b919d5d1aaf59cd6cb45e3d",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-045-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 045",
      sourceId: "aeat.model-045.instructions-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-045.downloads.2025-11-28",
      mediaType: "application/pdf",
      fileName: "instr_mod045.pdf",
      byteLength: 254179,
      pageCount: 4,
      sha256:
        "97e8f2d2ad2c2d2fa6965912fa46d989525e57d37de388a60a57ca29ac28fa64",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-045-form-preview",
    sourceId: "aeat.model-045.form-pdf.captured-2026-07-13",
    publicHref:
      "/fiscal-models/modelo-045/formulario-modelo-045-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "e4ed12bd1f26bb65132c54f631adb85f8e5ba95c8147500499f4b316f71c4e47",
    alt: "Vista previa del formulario oficial Modelo 045 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-045-topic-link",
      label: "Información oficial sobre máquinas o aparatos automáticos",
      sourceId: "aeat.model-045.topic.2026-01-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-download-link",
      label: "Descarga e instrucciones oficiales",
      sourceId: "aeat.model-045.downloads.2025-11-28",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-procedure-link",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-045.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-approval-order-link",
      label: "Orden de 27 de julio de 2001",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-machines-regulation-link",
      label: "Real Decreto 2110/1998",
      sourceId: "boe.rd-2110-1998.machines",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-045-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 045?",
      answer: "La AEAT lo identifica como la declaración-liquidación de la tasa fiscal sobre el juego mediante máquinas o aparatos automáticos.",
      sourceIds: ["aeat.model-045.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-faq-activity",
      question: "¿A qué actividad se refiere?",
      answer: "La ficha oficial lo vincula a máquinas o aparatos automáticos utilizados en el ámbito del juego.",
      sourceIds: [
        "aeat.model-045.topic.2026-01-22",
        "aeat.model-045.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-faq-management",
      question: "¿Cómo organiza la AEAT la información territorial de esta tasa?",
      answer: "La AEAT agrupa su información temática dentro de las tasas sobre el juego gestionadas por sus Delegaciones de Ceuta y Melilla. La aplicabilidad a cada caso debe comprobarse en la fuente oficial.",
      sourceIds: [MANAGEMENT_SOURCE.id, "aeat.model-045.topic.2026-01-22"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-faq-documents",
      question: "¿La AEAT publica formulario e instrucciones?",
      answer: "Sí. La página oficial de descarga enlaza el formulario PDF del Modelo 045 y un PDF separado de instrucciones.",
      sourceIds: ["aeat.model-045.downloads.2025-11-28"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-faq-authority",
      question: "¿Qué organismo figura como responsable del procedimiento?",
      answer: "La ficha oficial señala a la Agencia Estatal de Administración Tributaria como órgano responsable.",
      sourceIds: ["aeat.model-045.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-045-faq-regulation",
      question: "¿Qué referencia oficial regula las máquinas recreativas y de azar?",
      answer: "La página temática de la AEAT enlaza el Real Decreto 2110/1998, que aprueba el Reglamento de Máquinas Recreativas y de Azar.",
      sourceIds: ["aeat.model-045.topic.2026-01-22", "boe.rd-2110-1998.machines"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"045">;

export const PUBLIC_AEAT_BATCH_02_GAMES_CONTENT_V1 = deepFreeze([
  MODEL_043_CONTENT,
  MODEL_044_CONTENT,
  MODEL_045_CONTENT,
] as const);

export type PublicAeatBatch02GamesCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_02_GAMES_CONTENT_V1)[number]["code"];
