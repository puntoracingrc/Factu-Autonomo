import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentExternalNavigationV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_RELEASE_ID_V1 =
  "public-aeat-official-batch-01-early.2026-07-13.v1" as const;

const REVIEWED_ON = "2026-07-13" as const;
const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

const PERSONAL_AREA_SOURCE = {
  id: "aeat.personal-area.2026-07-10",
  authority: "AEAT",
  kind: "PERSONAL_AREA",
  title: "Mi área personal",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html",
  officialUpdatedOn: "2026-07-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "757555259200efe6a791e5d3c49a5ad3bdfcc3f6a8843a5a55f8251068f5418c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const PERSONAL_AREA_NAVIGATION = {
  kind: "AEAT_PERSONAL_AREA",
  title: "Mi área personal de la AEAT",
  sourceId: PERSONAL_AREA_SOURCE.id,
  policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY",
} as const satisfies PublicAeatOfficialContentExternalNavigationV1;

const MODEL_01C_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_RELEASE_ID_V1,
  code: "01C",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Certificado de contratistas y subcontratistas",
  summary:
    "Guía sencilla del Modelo 01C: para qué sirve, quién debe solicitarlo, cómo identificar al pagador, plazo, duración y acceso al trámite oficial.",
  searchTerms: [
    "certificado de contratistas",
    "certificado de subcontratistas",
    "contratistas y subcontratistas",
    "certificado tributario",
    "situación tributaria",
    "artículo 43.1.f",
    "Ley General Tributaria",
    "certificado positivo",
    "certificado negativo",
    "pagador identificado",
    "tres días hábiles",
    "doce meses",
    "renovación certificado contratistas",
  ],
  sections: [
    {
      id: "model-01c-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-01c-purpose-certificate",
          heading: "Certificación tributaria",
          text: "La ficha oficial define el procedimiento como la expedición de documentos que acreditan hechos relativos a la situación tributaria de una persona o entidad.",
          sourceIds: ["aeat.model-01c.procedure-record.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-01c-purpose-context",
          heading: "Contratistas y subcontratistas",
          text: "La Agencia Tributaria encuadra el Modelo 01C en la solicitud de certificados tributarios de contratistas y subcontratistas vinculados al artículo 43.1.f de la Ley General Tributaria.",
          sourceIds: [
            "aeat.model-01c.what-certifies.2025-11-21",
            "boe.lgt-58-2003.article-43",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-01c-access",
      title: "Cómo acceder a la información oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-01c-access-channels",
          heading: "Canales que recoge la ficha",
          text: "La ficha del procedimiento enumera la vía telemática y las oficinas de la Agencia Tributaria como lugares de presentación.",
          sourceIds: ["aeat.model-01c.procedure-record.2025-11-21"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-01c-access-materials",
          heading: "Formulario e instrucciones",
          text: "La página oficial de descarga ofrece el formulario del Modelo 01C y un documento de instrucciones. Ambos se abren en la Sede de la Agencia Tributaria.",
          sourceIds: ["aeat.model-01c.downloads.2026-06-04"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-01c-details",
      title: "Información complementaria",
      kind: "DETAILS",
      items: [
        {
          id: "model-01c-details-results",
          heading: "Contenido del certificado",
          text: "La información de la AEAT explica que los certificados pueden expresar un resultado positivo o negativo, según las circunstancias que consten en la información tributaria certificada.",
          sourceIds: [
            "aeat.model-01c.what-certifies.2025-11-21",
            "aeat.model-01c.faq.2025-03-03",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-01c.procedure-home.2025-11-21",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 01C · Solicitud de Certificado de Contratistas y Subcontratistas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G303.shtml",
      officialUpdatedOn: "2025-11-21",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1afe8d2e33a004ca22e2e08d5953e408adacd095521c6828e38993293d4ebf97",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.procedure-record.2025-11-21",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento G303",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G303.shtml",
      officialUpdatedOn: "2025-11-21",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ac0992db02da6bb75b6df90b7a1d11c48b7ee167f58b8e454c1b46f69c206785",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.what-certifies.2025-11-21",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Qué certifica",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/contratistas-subcontratistas/certificados-trib_____cados-tributarios-contratistas-subcontratistas_/que-certifica.html",
      officialUpdatedOn: "2025-11-21",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1f8af59102892a0e5c598b17147f5857a77ba57afafa71eb78123acef82d96f8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.where-obtained.2025-11-21",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Dónde se obtiene",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/contratistas-subcontratistas/certificados-trib_____cados-tributarios-contratistas-subcontratistas_/se-obtiene.html",
      officialUpdatedOn: "2025-11-21",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "56730c4140c65bc55d6152bb4c22bca1fe3308d890310f80fdcc30a06c9a772f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.downloads.2026-06-04",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del Modelo 01C",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/contratistas-subcontratistas/certificados-trib_____cados-tributarios-contratistas-subcontratistas_/descarga-modelo.html",
      officialUpdatedOn: "2026-06-04",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "80d08cfb1461069f72cc0b7dfb6afb8cbe202c9f3e943725a88c34ba639a9fa7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.faq.2025-03-03",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes de contratistas y subcontratistas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/certificaciones/contratistas-subcontratistas/certificados-trib_____cados-tributarios-contratistas-subcontratistas_/preguntas-frecuentes.html",
      officialUpdatedOn: "2025-03-03",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "90323d92ef9b880e94e91bb894ad9775ed783825bf0be1ea706c4c2e90572bbc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.form-pdf.2026-06-04",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario oficial del Modelo 01C",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G303/modelo01c_es_es.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "df217f3f2127118fcd9440df7913b1d48e6b7334de188fa0bec7ed3b9650b746",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-01c.instructions-pdf.2026-06-04",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones oficiales enlazadas para el Modelo 01C",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G303/instruc01c_es_es.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4e5a5c4ee81b0f7eeb14aa716ac4478f1627a93cbb4958ee04df90f2633f524b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.lgt-58-2003.article-43",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Ley 58/2003, General Tributaria · artículo 43.1.f",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186&tn=1#a43",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "90796a773ba8c02cf3fff484e04cf786e0baa7a584cbc6733e62ec86d3f410d8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.rd-1065-2007.article-70",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 1065/2007 · artículos 70 a 76",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&tn=1#a70",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ae09c22753b5b5cc50aa1236d96d1a87675bb8335bcc3ce0c1f8d9baad8456ed",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [
    {
      id: "model-01c-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 01C",
      sourceId: "aeat.model-01c.form-pdf.2026-06-04",
      landingPageSourceId: "aeat.model-01c.downloads.2026-06-04",
      mediaType: "application/pdf",
      fileName: "modelo01c_es_es.pdf",
      byteLength: 191611,
      pageCount: 2,
      sha256:
        "df217f3f2127118fcd9440df7913b1d48e6b7334de188fa0bec7ed3b9650b746",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-01c-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales enlazadas para el Modelo 01C",
      sourceId: "aeat.model-01c.instructions-pdf.2026-06-04",
      landingPageSourceId: "aeat.model-01c.downloads.2026-06-04",
      mediaType: "application/pdf",
      fileName: "instruc01c_es_es.pdf",
      byteLength: 34435,
      pageCount: 1,
      sha256:
        "4e5a5c4ee81b0f7eeb14aa716ac4478f1627a93cbb4958ee04df90f2633f524b",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-01c-form-preview",
    sourceId: "aeat.model-01c.form-pdf.2026-06-04",
    publicHref: "/fiscal-models/modelo-01c/formulario-modelo-01c-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "2dd0680bcb8f064689139431194089bfe106c49c4877ff623616c85ec3bda494",
    alt: "Vista previa del formulario oficial del Modelo 01C de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-01c-link-information",
      label: "Qué certifica la AEAT",
      sourceId: "aeat.model-01c.what-certifies.2025-11-21",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-01c.faq.2025-03-03",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-link-procedure-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-01c.procedure-record.2025-11-21",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-link-legal",
      label: "Ley General Tributaria · artículo 43.1.f",
      sourceId: "boe.lgt-58-2003.article-43",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-01c-faq-purpose",
      question: "¿Qué información acredita el Modelo 01C?",
      answer:
        "La ficha oficial lo vincula a la expedición de un certificado sobre hechos relativos a la situación tributaria en el contexto de contratistas y subcontratistas.",
      sourceIds: [
        "aeat.model-01c.procedure-record.2025-11-21",
        "aeat.model-01c.what-certifies.2025-11-21",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-faq-results",
      question: "¿Qué resultados puede reflejar el certificado?",
      answer:
        "La AEAT describe certificados de carácter positivo y negativo de acuerdo con las circunstancias que consten en la información tributaria certificada.",
      sourceIds: [
        "aeat.model-01c.what-certifies.2025-11-21",
        "aeat.model-01c.faq.2025-03-03",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-faq-channels",
      question: "¿Qué canales recoge la ficha oficial?",
      answer:
        "La ficha del procedimiento enumera la vía telemática y las oficinas de la Agencia Tributaria.",
      sourceIds: ["aeat.model-01c.procedure-record.2025-11-21"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-faq-documents",
      question: "¿Dónde están el formulario y sus instrucciones?",
      answer:
        "La página de descarga de la AEAT enlaza el formulario oficial del Modelo 01C y un PDF de instrucciones.",
      sourceIds: ["aeat.model-01c.downloads.2026-06-04"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-01c-faq-legal",
      question: "¿Qué referencias normativas destaca la AEAT?",
      answer:
        "La página oficial remite, entre otras normas, al artículo 43.1.f de la Ley General Tributaria y a los artículos 70 a 76 del Real Decreto 1065/2007.",
      sourceIds: [
        "aeat.model-01c.procedure-home.2025-11-21",
        "boe.lgt-58-2003.article-43",
        "boe.rd-1065-2007.article-70",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"01C">;

const MODEL_04_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_RELEASE_ID_V1,
  code: "04",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Solicitud del IVA del 4 % para determinados vehículos",
  summary:
    "Guía sencilla del Modelo 04: requisitos del IVA del 4 %, documentación, solicitud previa, regla de cuatro años y procedimiento de la AEAT.",
  searchTerms: [
    "IVA 4 por ciento",
    "IVA reducido vehículos",
    "vehículos adaptados",
    "movilidad reducida",
    "silla de ruedas",
    "personas con discapacidad",
    "autotaxi",
    "autoturismo especial",
    "reconocimiento previo",
    "antes de comprar vehículo",
    "regla de cuatro años",
    "transporte habitual",
    "seis meses",
  ],
  sections: [
    {
      id: "model-04-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-04-purpose-recognition",
          heading: "Reconocimiento previo",
          text: "La ficha oficial describe un procedimiento de reconocimiento previo para la aplicación del tipo reducido de IVA del 4% en determinadas entregas o adquisiciones intracomunitarias de vehículos destinados al transporte habitual de personas con discapacidad en silla de ruedas o con movilidad reducida.",
          sourceIds: ["aeat.model-04.procedure-record.2026-03-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-04-access",
      title: "Canales y documentación oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-04-access-channels",
          heading: "Canales recogidos por la AEAT",
          text: "La ficha del procedimiento enumera la vía telemática, las oficinas de la AEAT, las oficinas de Correos y los demás lugares contemplados en el artículo 16 de la Ley 39/2015.",
          sourceIds: ["aeat.model-04.procedure-record.2026-03-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-04-access-downloads",
          heading: "Formulario e instrucciones",
          text: "La página de descarga de la Agencia Tributaria publica el formulario del Modelo 04 y un documento de instrucciones.",
          sourceIds: ["aeat.model-04.downloads.2026-06-04"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-04-details",
      title: "Marco normativo",
      kind: "DETAILS",
      items: [
        {
          id: "model-04-details-legal",
          heading: "Referencias publicadas por la AEAT",
          text: "La página oficial destaca el artículo 91 de la Ley 37/1992 del IVA y el artículo 26 bis de su Reglamento, aprobado por el Real Decreto 1624/1992.",
          sourceIds: [
            "aeat.model-04.procedure-home.2026-03-25",
            "boe.liva-37-1992.article-91",
            "boe.riva-1624-1992.article-26-bis",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-04.procedure-home.2026-03-25",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 04 · aplicación del tipo del 4% a determinados vehículos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ13.shtml",
      officialUpdatedOn: "2026-03-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c9fbe7525f386f8adb593b3f881c1124186d04efa4785154524186c7e5c8062a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-04.procedure-record.2026-03-02",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento GZ13",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ13.shtml",
      officialUpdatedOn: "2026-03-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7ab9a175a01cfaa8bf70e722b14a20a79ee0cdf058b937f39bf5f29989efca99",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-04.downloads.2026-06-04",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del Modelo 04",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/beneficios-fiscales-autorizaciones/iva/reconocimiento-de_____valia-sillas-ruedas-movilidad-reducida/descarga-modelo.html",
      officialUpdatedOn: "2026-06-04",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c70eab3b978ccb36a948688c3dc3cb0331bb1248a42888522f07994701ea8ff7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-04.form-pdf.2026-06-04",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario oficial del Modelo 04",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ13/mod04.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f5c2617e64bd4de0e62957d6e455c60dd38c5b8ce79a975123559036f20a6e6b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-04.instructions-pdf.2026-06-04",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones oficiales del Modelo 04",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ13/instr04.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9994dd583083299af7f70dafbac5d580c2685645f0614c4b1f7a6a25441940f5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.riva-1624-1992.article-26-bis",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 1624/1992 · artículo 26 bis",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925&tn=1#a26bis",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "20c9033f69bc5c911a20fd80a3443de5bcb88d7568073154965f841905fdb62b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.liva-37-1992.article-91",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Ley 37/1992 del IVA · artículo 91",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740&tn=1#a91",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "de028dd0fb0da2824dd18ca03fb12eeb458b6160886c6e433b28f50b4eb697aa",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [
    {
      id: "model-04-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 04",
      sourceId: "aeat.model-04.form-pdf.2026-06-04",
      landingPageSourceId: "aeat.model-04.downloads.2026-06-04",
      mediaType: "application/pdf",
      fileName: "mod04.pdf",
      byteLength: 171581,
      pageCount: 2,
      sha256:
        "f5c2617e64bd4de0e62957d6e455c60dd38c5b8ce79a975123559036f20a6e6b",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-04-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 04",
      sourceId: "aeat.model-04.instructions-pdf.2026-06-04",
      landingPageSourceId: "aeat.model-04.downloads.2026-06-04",
      mediaType: "application/pdf",
      fileName: "instr04.pdf",
      byteLength: 65566,
      pageCount: 1,
      sha256:
        "9994dd583083299af7f70dafbac5d580c2685645f0614c4b1f7a6a25441940f5",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-04-form-preview",
    sourceId: "aeat.model-04.form-pdf.2026-06-04",
    publicHref: "/fiscal-models/modelo-04/formulario-modelo-04-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "e84f257c462cdb67519799450f17d5009342d54b953f3c283557b63bebeffd41",
    alt: "Vista previa del formulario oficial del Modelo 04 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-04-link-procedure",
      label: "Página oficial del Modelo 04",
      sourceId: "aeat.model-04.procedure-home.2026-03-25",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-04-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-04.procedure-record.2026-03-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-04-link-liva",
      label: "Ley 37/1992 del IVA · artículo 91",
      sourceId: "boe.liva-37-1992.article-91",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-04-link-riva",
      label: "Reglamento del IVA · artículo 26 bis",
      sourceId: "boe.riva-1624-1992.article-26-bis",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-04-faq-purpose",
      question: "¿Para qué sirve el Modelo 04?",
      answer:
        "La ficha de la AEAT lo identifica como el procedimiento de reconocimiento previo relacionado con la aplicación del tipo reducido de IVA del 4% a determinados vehículos destinados al transporte habitual de personas con discapacidad en silla de ruedas o con movilidad reducida.",
      sourceIds: ["aeat.model-04.procedure-record.2026-03-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-04-faq-channels",
      question: "¿Qué canales enumera la ficha oficial?",
      answer:
        "La AEAT enumera la vía telemática, sus oficinas, las oficinas de Correos y los demás lugares recogidos en el artículo 16 de la Ley 39/2015.",
      sourceIds: ["aeat.model-04.procedure-record.2026-03-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-04-faq-downloads",
      question: "¿Hay formulario e instrucciones oficiales?",
      answer:
        "Sí. La página de descarga de la AEAT publica un formulario PDF y un PDF de instrucciones del Modelo 04.",
      sourceIds: ["aeat.model-04.downloads.2026-06-04"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-04-faq-legal",
      question: "¿Qué normas destaca la Agencia Tributaria?",
      answer:
        "La página del procedimiento remite al artículo 91 de la Ley del IVA y al artículo 26 bis del Reglamento del IVA.",
      sourceIds: [
        "aeat.model-04.procedure-home.2026-03-25",
        "boe.liva-37-1992.article-91",
        "boe.riva-1624-1992.article-26-bis",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"04">;

const MODEL_05_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_RELEASE_ID_V1,
  code: "05",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Reconocimiento previo de determinados supuestos de no sujeción, exención o reducción en el Impuesto de Matriculación.",
  summary:
    "Solicitud de reconocimiento previo de determinados supuestos del Impuesto Especial sobre Determinados Medios de Transporte.",
  searchTerms: [
    "Impuesto de Matriculación",
    "medios de transporte",
    "reconocimiento previo",
    "no sujeción",
    "exención",
    "reducción de la base imponible",
    "primera matriculación",
    "Orden HAC 171 2021",
  ],
  sections: [
    {
      id: "model-05-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-05-purpose-recognition",
          heading: "Solicitud de reconocimiento previo",
          text: "La ficha oficial describe el Modelo 05 como la solicitud relativa a supuestos de no sujeción, exención y reducción de la base imponible del Impuesto Especial sobre Determinados Medios de Transporte que requieren reconocimiento previo de la Administración tributaria.",
          sourceIds: ["aeat.model-05.procedure-record.2026-03-25"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-05-access",
      title: "Canales e información oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-05-access-channels",
          heading: "Canales recogidos por la ficha",
          text: "La ficha oficial recoge la Sede electrónica y, para la presentación en papel impreso generado por el servicio de la AEAT en el caso que describe, las oficinas de la Agencia Tributaria.",
          sourceIds: ["aeat.model-05.procedure-record.2026-03-25"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-05-access-instructions",
          heading: "Instrucciones",
          text: "La página oficial del procedimiento enlaza un PDF de instrucciones del Modelo 05.",
          sourceIds: [
            "aeat.model-05.procedure-home.2026-03-25",
            "aeat.model-05.instructions-pdf.2026-03-25",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-05-details",
      title: "Marco normativo",
      kind: "DETAILS",
      items: [
        {
          id: "model-05-details-order",
          heading: "Orden de aprobación",
          text: "La Orden HAC/171/2021 aprueba el Modelo 05 y describe su denominación oficial dentro del Impuesto Especial sobre Determinados Medios de Transporte.",
          sourceIds: ["boe.hac-171-2021"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-05.procedure-home.2026-03-25",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 05 · reconocimiento previo en el Impuesto de Matriculación",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ17.shtml",
      officialUpdatedOn: "2026-03-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "eceb2bc2ad1d1a880814da94f18bc17d81f42f346189e3debab563caf6046bc7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-05.procedure-record.2026-03-25",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento GZ17",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ17.shtml",
      officialUpdatedOn: "2026-03-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "10ce8f8e8dbb60326c0f367a709786aa4d6211c171fc723a114baa675336a59b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-05.information.2026-03-03",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Información del Modelo 05",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-05.html",
      officialUpdatedOn: "2026-03-03",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4270114aa569ae1ea3d5b85a1519cb85cc69eba0a1c6c40ffda201e09e0b326b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-05.instructions-pdf.2026-03-25",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones oficiales del Modelo 05",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GZ17/instr_mod05.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "67e581e46aeba3565ccded552ff6be1e0ed486aa139149917fb55c6225d8b42c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.hac-171-2021",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/171/2021, de 25 de febrero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2021-3100",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5d9a93bf03902c262330cb927cc930a6c165a7c17a36a388c9c1c99f3f9f49a3",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [
    {
      id: "model-05-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 05",
      sourceId: "aeat.model-05.instructions-pdf.2026-03-25",
      landingPageSourceId: "aeat.model-05.procedure-home.2026-03-25",
      mediaType: "application/pdf",
      fileName: "instr_mod05.pdf",
      byteLength: 38713,
      pageCount: 7,
      sha256:
        "67e581e46aeba3565ccded552ff6be1e0ed486aa139149917fb55c6225d8b42c",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-05-link-information",
      label: "Información oficial del Modelo 05",
      sourceId: "aeat.model-05.information.2026-03-03",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-05-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-05.procedure-record.2026-03-25",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-05-link-legal",
      label: "Orden HAC/171/2021",
      sourceId: "boe.hac-171-2021",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-05-faq-purpose",
      question: "¿Para qué sirve el Modelo 05?",
      answer: "La AEAT lo presenta como la solicitud de reconocimiento previo de determinados supuestos de no sujeción, exención o reducción de la base imponible en el Impuesto Especial sobre Determinados Medios de Transporte.",
      sourceIds: ["aeat.model-05.procedure-record.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-05-faq-prior",
      question: "¿Qué significa que sea un reconocimiento previo?",
      answer: "La ficha oficial indica que este modelo reúne supuestos en los que la aplicación solicitada requiere el reconocimiento previo de la Administración tributaria.",
      sourceIds: ["aeat.model-05.procedure-record.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-05-faq-channels",
      question: "¿Qué canales muestra la ficha del procedimiento?",
      answer: "La AEAT muestra la presentación por internet y, en el caso concreto de papel impreso generado por su servicio que describe la ficha, sus oficinas.",
      sourceIds: ["aeat.model-05.procedure-record.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-05-faq-instructions",
      question: "¿Dónde se consultan las instrucciones oficiales?",
      answer: "La página del procedimiento enlaza directamente un PDF de instrucciones alojado en la Sede de la Agencia Tributaria.",
      sourceIds: [
        "aeat.model-05.procedure-home.2026-03-25",
        "aeat.model-05.instructions-pdf.2026-03-25",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-05-faq-legal",
      question: "¿Qué norma aprueba el Modelo 05?",
      answer: "El BOE publica la aprobación del modelo mediante la Orden HAC/171/2021, de 25 de febrero.",
      sourceIds: ["boe.hac-171-2021"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"05">;

const MODEL_06_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_RELEASE_ID_V1,
  code: "06",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto Especial sobre determinados medios de transporte. Exenciones y no sujeción sin reconocimiento previo.",
  summary:
    "Declaración relativa a exenciones y no sujeciones sin reconocimiento previo en el Impuesto Especial sobre Determinados Medios de Transporte.",
  searchTerms: [
    "Impuesto de Matriculación",
    "medios de transporte",
    "exenciones",
    "no sujeción",
    "sin reconocimiento previo",
    "primera matriculación",
    "CEM",
    "Código Electrónico para la Matriculación",
    "Orden EHA 3851 2007",
  ],
  sections: [
    {
      id: "model-06-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-06-purpose-declaration",
          heading: "Exenciones y no sujeciones",
          text: "La ficha oficial identifica el Modelo 06 con determinados supuestos de exención o no sujeción en el Impuesto Especial sobre Determinados Medios de Transporte.",
          sourceIds: ["aeat.model-06.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-06-purpose-no-prior",
          heading: "Sin reconocimiento previo",
          text: "La denominación y el objeto publicados por la AEAT especifican que el modelo corresponde a supuestos sin reconocimiento o concesión previa.",
          sourceIds: [
            "aeat.model-06.procedure-home.2026-06-29",
            "aeat.model-06.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-06-access",
      title: "Canales y documentación oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-06-access-channels",
          heading: "Canales recogidos por la ficha",
          text: "La ficha del procedimiento enumera la vía telemática y las oficinas de la Agencia Tributaria.",
          sourceIds: ["aeat.model-06.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-06-access-materials",
          heading: "Formulario e instrucciones",
          text: "La Agencia Tributaria ofrece una página de descarga del formulario y una página específica con las instrucciones del Modelo 06.",
          sourceIds: [
            "aeat.model-06.downloads.2026-06-09",
            "aeat.model-06.instructions.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-06-details",
      title: "Marco normativo",
      kind: "DETAILS",
      items: [
        {
          id: "model-06-details-orders",
          heading: "Órdenes publicadas en el BOE",
          text: "La Orden EHA/3851/2007 aprueba el Modelo 06 y la Orden HFP/1395/2021 modifica, entre otras normas, esa orden de aprobación.",
          sourceIds: [
            "boe.eha-3851-2007",
            "boe.hfp-1395-2021",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-06.procedure-home.2026-06-29",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 06 · exenciones y no sujeción sin reconocimiento previo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G503.shtml",
      officialUpdatedOn: "2026-06-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2a784f2c1fc6c32f2937c160a06985c003692ff39a16dc309ee417b169e9b170",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-06.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento G503",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G503.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8f225cf9ef7f4b9d3f69dfe7b732efe895f230678ca9e10b52de31bab16ae121",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-06.information.2026-04-29",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Información del Modelo 06",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-06.html",
      officialUpdatedOn: "2026-04-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3bc6f279b3852e04d81535914a2a916f921dfaad2b0350f8d307a94119be26f4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-06.downloads.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del Modelo 06",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-matriculacion/modelo-06-impues_____xenciones-no-sujecion-previo_/descarga-modelo.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6833b0f58302af55cafd0db0bfc9c030647ad98da590368f18751a3ab7f46438",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-06.instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 06",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-06-impues_____xenciones-no-sujecion-previo_/instrucciones-modelo-06.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bc1e79e791c1e67767f4ccd9508e3dde773d0dd06396a42df532c2bd410ef752",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-06.form-pdf.2026-06-09",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario oficial del Modelo 06",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G503/Modelo06.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "be1e012064363725129edd242d4035a78556bcea69423b0389de20710b997365",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.eha-3851-2007",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/3851/2007, de 26 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-22442",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fbb08fb4178aaf53f0363d74ccaa30d78883329d461ae2ab274b680fd3eed5ef",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.hfp-1395-2021",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/1395/2021, de 9 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2021-20577",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f7abeb68a9a83369846c025e45816ceeb35e794b986be46aa8c66adbae0edf48",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [
    {
      id: "model-06-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 06",
      sourceId: "aeat.model-06.form-pdf.2026-06-09",
      landingPageSourceId: "aeat.model-06.downloads.2026-06-09",
      mediaType: "application/pdf",
      fileName: "Modelo06.pdf",
      byteLength: 255106,
      pageCount: 3,
      sha256:
        "be1e012064363725129edd242d4035a78556bcea69423b0389de20710b997365",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-06-form-preview",
    sourceId: "aeat.model-06.form-pdf.2026-06-09",
    publicHref: "/fiscal-models/modelo-06/formulario-modelo-06-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "c079ada1f4c7de49ac28c15a72bc219afe1b184e26eb6bd65bd373a938c17b77",
    alt: "Vista previa del formulario oficial del Modelo 06 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-06-link-information",
      label: "Información oficial del Modelo 06",
      sourceId: "aeat.model-06.information.2026-04-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-link-instructions",
      label: "Instrucciones oficiales",
      sourceId: "aeat.model-06.instructions.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-06.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-link-legal",
      label: "Orden EHA/3851/2007",
      sourceId: "boe.eha-3851-2007",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-06-faq-purpose",
      question: "¿Para qué sirve el Modelo 06?",
      answer: "La AEAT lo identifica con determinados supuestos de exención o no sujeción en el Impuesto Especial sobre Determinados Medios de Transporte.",
      sourceIds: ["aeat.model-06.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-faq-prior",
      question: "¿Requiere reconocimiento previo según la ficha oficial?",
      answer: "La denominación oficial y el objeto de la ficha especifican que el Modelo 06 se refiere a supuestos sin reconocimiento o concesión previa.",
      sourceIds: [
        "aeat.model-06.procedure-home.2026-06-29",
        "aeat.model-06.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-faq-channels",
      question: "¿Qué canales enumera la ficha del procedimiento?",
      answer: "La ficha de la AEAT enumera la vía telemática y sus oficinas.",
      sourceIds: ["aeat.model-06.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-faq-form",
      question: "¿Dónde se encuentran el formulario y las instrucciones?",
      answer: "La Sede de la AEAT publica una página de descarga del formulario PDF y otra página específica con las instrucciones del Modelo 06.",
      sourceIds: [
        "aeat.model-06.downloads.2026-06-09",
        "aeat.model-06.instructions.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-06-faq-legal",
      question: "¿Qué norma aprueba el Modelo 06?",
      answer: "La Orden EHA/3851/2007 aprueba el Modelo 06; la Orden HFP/1395/2021 modifica, entre otras disposiciones, esa orden.",
      sourceIds: ["boe.eha-3851-2007", "boe.hfp-1395-2021"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"06">;

export const PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_CONTENT_V1 = deepFreeze([
  MODEL_01C_CONTENT,
  MODEL_04_CONTENT,
  MODEL_05_CONTENT,
  MODEL_06_CONTENT,
] as const);

export const PUBLIC_AEAT_BATCH_01_EARLY_CONTENT_V1 =
  PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_CONTENT_V1;

export type PublicAeatOfficialBatch01EarlyCodeV1 =
  (typeof PUBLIC_AEAT_OFFICIAL_BATCH_01_EARLY_CONTENT_V1)[number]["code"];
