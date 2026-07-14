import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentExternalNavigationV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_02_IRPF_RELEASE_ID_V1 =
  "public-aeat-official-batch-02-irpf.2026-07-13.v1" as const;

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

const MODEL_100_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_02_IRPF_RELEASE_ID_V1,
  code: "100",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre la Renta de las Personas Físicas. Declaración y documentos de ingreso o devolución.",
  summary:
    "Declaración anual del IRPF. Incluye el resultado de la actividad, las demás rentas, retenciones y pagos realizados durante el año.",
  searchTerms: [
    "declaración de la renta",
    "declaración anual IRPF",
    "Renta 2025",
    "Renta WEB",
    "Renta DIRECTA",
    "borrador de renta",
    "datos fiscales",
    "documento de ingreso o devolución",
    "campaña de renta",
    "Impuesto sobre la Renta de las Personas Físicas",
    "autónomo",
    "RETA",
    "ingresos y gastos",
    "pagos fraccionados",
    "Modelo 130",
    "Modelo 131",
    "estimación directa",
    "estimación objetiva",
  ],
  sections: [
    {
      id: "model-100-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-100-purpose-annual-return",
          heading: "Declaración anual del IRPF",
          text: "La página del procedimiento identifica el Modelo 100 como la declaración anual del Impuesto sobre la Renta de las Personas Físicas.",
          sourceIds: [
            "aeat.model-100.procedure-home.2026-06-09",
            "aeat.model-100.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-100-purpose-index-name",
          heading: "Denominación en el índice oficial",
          text: "El índice de modelos de la AEAT lo describe como la declaración del IRPF y sus documentos de ingreso o devolución.",
          sourceIds: ["aeat.models.index.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-100-access",
      title: "Información y canales oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-100-access-channels",
          heading: "Canales que enumera la ficha",
          text: "La ficha administrativa enumera la vía telemática, las oficinas de la AEAT, las entidades colaboradoras y otras oficinas habilitadas para la confección de declaraciones con el programa de ayuda de la Agencia Tributaria.",
          sourceIds: ["aeat.model-100.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-100-access-help",
          heading: "Campaña y ayuda de Renta",
          text: "La página oficial enlaza la Campaña de Renta y la ayuda de Renta WEB para consultar información sobre el borrador o la declaración.",
          sourceIds: [
            "aeat.renta-campaign.2026-07-02",
            "aeat.model-100.renta-web-help.2026-04-16",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-100-details",
      title: "Relación con otros documentos y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-100-details-model-102",
          heading: "Modelo 102",
          text: "La ficha del procedimiento G229 menciona los modelos 100 y 102 dentro de la documentación del procedimiento, y la página del Modelo 100 enlaza la descarga oficial del Modelo 102.",
          sourceIds: [
            "aeat.model-100.procedure-home.2026-06-09",
            "aeat.model-100.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-100-details-legal",
          heading: "Marco normativo oficial",
          text: "La página de la AEAT remite a la Ley 35/2006 del IRPF, a su Reglamento y a la Orden HAC/277/2026 para los modelos correspondientes al ejercicio 2025.",
          sourceIds: [
            "aeat.model-100.procedure-home.2026-06-09",
            "boe.irpf-law-35-2006",
            "boe.irpf-regulation-439-2007",
            "boe.irpf-2025-order-hac-277-2026",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-100.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 100 · declaración anual del IRPF",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4ada1395d3bf1c3ee66ebcab8c7c161b98b0ea506fab9453985c344be9fbe846",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-100.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento G229",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G229.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "68d00ea7489b129fb3fa38ce2bd853bc0cccbc28fcd811ac993953a7548b05d2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.renta-campaign.2026-07-02",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Campaña de Renta 2025",
      canonicalUrl: "https://sede.agenciatributaria.gob.es/Sede/Renta.html",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7744faafcb2233650d5f36a7e0717fefb0220586851b2af97cd8e60f7c505f5f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-100.renta-web-help.2026-04-16",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Renta WEB · tramitación de borrador o declaración",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/renta-ayuda-tecnica/renta-web-tramitacion-borrador-declaracion.html",
      officialUpdatedOn: "2026-04-16",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bc8e19680c2aaffdbbe3c8a667d8805a73edef931c5390a00586e55c1fa812cb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.irpf-law-35-2006",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Ley 35/2006 del Impuesto sobre la Renta de las Personas Físicas",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a47376ff59ac79debe58f7ef49ef5dbb8cb555d980828f96260d14199cca2d82",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.irpf-regulation-439-2007",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 439/2007 · Reglamento del IRPF",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4c31e86dba0e1efcb3067dd6b8415dea7a16c62e3b67fbb86d53d73cf35d33c2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.irpf-2025-order-hac-277-2026",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/277/2026, de 25 de marzo",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7041",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "be9047f8bf48e4a7c8836d34a39b6f04793f2659fe1b6821134ca42bb8fe20b6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-100-link-campaign",
      label: "Campaña de Renta",
      sourceId: "aeat.renta-campaign.2026-07-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-link-help",
      label: "Ayuda oficial de Renta WEB",
      sourceId: "aeat.model-100.renta-web-help.2026-04-16",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-100.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-link-order",
      label: "Orden HAC/277/2026",
      sourceId: "boe.irpf-2025-order-hac-277-2026",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-100-faq-purpose",
      question: "¿Qué es el Modelo 100?",
      answer: "La Agencia Tributaria lo identifica como la declaración anual del Impuesto sobre la Renta de las Personas Físicas.",
      sourceIds: [
        "aeat.model-100.procedure-home.2026-06-09",
        "aeat.model-100.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-faq-index-name",
      question: "¿Cómo aparece descrito en el índice de modelos de la AEAT?",
      answer: "El índice oficial lo denomina declaración del IRPF y documentos de ingreso o devolución.",
      sourceIds: ["aeat.models.index.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-faq-model-102",
      question: "¿Qué relación muestra la AEAT entre los modelos 100 y 102?",
      answer: "La ficha G229 cita ambos modelos dentro de la documentación del procedimiento y la página del Modelo 100 incluye un enlace de descarga del Modelo 102.",
      sourceIds: [
        "aeat.model-100.procedure-home.2026-06-09",
        "aeat.model-100.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-faq-channels",
      question: "¿Qué canales enumera la ficha oficial?",
      answer: "La ficha enumera la vía telemática, oficinas de la AEAT, entidades colaboradoras y otras oficinas habilitadas para la confección de declaraciones con el programa de ayuda de la Agencia Tributaria.",
      sourceIds: ["aeat.model-100.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-faq-help",
      question: "¿Dónde publica la AEAT información y ayuda de la campaña?",
      answer: "La Sede dispone de una página de Campaña de Renta y de una ayuda específica para Renta WEB sobre el borrador o la declaración.",
      sourceIds: [
        "aeat.renta-campaign.2026-07-02",
        "aeat.model-100.renta-web-help.2026-04-16",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-100-faq-legal",
      question: "¿Qué referencias normativas destaca la página oficial?",
      answer: "La AEAT remite a la Ley 35/2006 del IRPF, a su Reglamento y a la Orden HAC/277/2026 para los modelos del ejercicio 2025.",
      sourceIds: [
        "aeat.model-100.procedure-home.2026-06-09",
        "boe.irpf-law-35-2006",
        "boe.irpf-regulation-439-2007",
        "boe.irpf-2025-order-hac-277-2026",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"100">;

const MODEL_102_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_02_IRPF_RELEASE_ID_V1,
  code: "102",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Documento de ingreso o devolución de la declaración del Impuesto sobre la Renta de las Personas Físicas.",
  summary:
    "Documento asociado a la declaración del IRPF; el PDF que la AEAT enlaza actualmente identifica el Modelo 102 del ejercicio 2025 como segundo plazo.",
  searchTerms: [
    "Modelo 102",
    "documento de ingreso",
    "documento de devolución",
    "segundo plazo renta",
    "declaración IRPF",
    "Modelo 100",
    "Renta 2025",
    "PDF Modelo 102",
    "Impuesto sobre la Renta de las Personas Físicas",
  ],
  sections: [
    {
      id: "model-102-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-102-purpose-index",
          heading: "Documento asociado a la declaración del IRPF",
          text: "El índice oficial de la AEAT identifica el Modelo 102 como documento de ingreso o devolución de la declaración del Impuesto sobre la Renta de las Personas Físicas.",
          sourceIds: ["aeat.models.index.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-102-purpose-current-pdf",
          heading: "Documento actualmente enlazado",
          text: "El PDF disponible en la página de descarga de la AEAT se titula Modelo 102, declaración 2025, segundo plazo.",
          sourceIds: [
            "aeat.model-102.downloads.2026-06-09",
            "aeat.model-102.form-pdf.2026-04-17",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-102-access",
      title: "Descarga y contexto oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-102-access-download",
          heading: "Descarga oficial",
          text: "La Sede de la Agencia Tributaria publica una página específica que enlaza el PDF oficial del Modelo 102.",
          sourceIds: ["aeat.model-102.downloads.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-102-access-shared-record",
          heading: "Procedimiento G229",
          text: "Los modelos 100 y 102 comparten la ficha administrativa G229. Esa ficha enumera la vía telemática, las oficinas de la AEAT, las entidades colaboradoras y otras oficinas habilitadas, sin que esta página determine qué canal corresponde a un caso concreto.",
          sourceIds: ["aeat.model-102.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-102-details",
      title: "Relación documental y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-102-details-model-100",
          heading: "Relación con el Modelo 100",
          text: "La página de gestiones del Modelo 100 incluye el enlace de descarga del Modelo 102 y la ficha G229 menciona ambos documentos.",
          sourceIds: [
            "aeat.model-102.procedure-home.2026-06-09",
            "aeat.model-102.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-102-details-order",
          heading: "Orden del ejercicio 2025",
          text: "La Orden HAC/277/2026 aprueba los modelos de declaración del IRPF correspondientes al ejercicio 2025.",
          sourceIds: ["boe.irpf-2025-order-hac-277-2026"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-102.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 100 · página que incluye la descarga del Modelo 102",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4ada1395d3bf1c3ee66ebcab8c7c161b98b0ea506fab9453985c344be9fbe846",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-102.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento G229 · modelos 100 y 102",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G229.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "68d00ea7489b129fb3fa38ce2bd853bc0cccbc28fcd811ac993953a7548b05d2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-102.downloads.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del Modelo 102",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-100-mode-declaracion-documentos-devolucion_/descarga-modelo-102.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b7fa5563af5e120caa922ba81fe9a492904179eaa44338092c57deed85c5e4f4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-102.form-pdf.2026-04-17",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 102 · declaración 2025 · segundo plazo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G229/102/Modelo102.pdf",
      officialUpdatedOn: "2026-04-17",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "89057ad5b5ce4028c91d9a9aa76f1412df80cf2f6a88d35ecd3a63797df0279a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.irpf-2025-order-hac-277-2026",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/277/2026, de 25 de marzo",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7041",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "be9047f8bf48e4a7c8836d34a39b6f04793f2659fe1b6821134ca42bb8fe20b6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [
    {
      id: "model-102-form",
      kind: "FORM",
      title: "Modelo 102 · declaración 2025 · segundo plazo",
      sourceId: "aeat.model-102.form-pdf.2026-04-17",
      landingPageSourceId: "aeat.model-102.downloads.2026-06-09",
      mediaType: "application/pdf",
      fileName: "Modelo102.pdf",
      byteLength: 83311,
      pageCount: 4,
      sha256:
        "89057ad5b5ce4028c91d9a9aa76f1412df80cf2f6a88d35ecd3a63797df0279a",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-102-form-preview",
    sourceId: "aeat.model-102.form-pdf.2026-04-17",
    publicHref:
      "/fiscal-models/modelo-102/formulario-modelo-102-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "7e70a932b0594747856999acaa66b8b5cd81d76d8282580509bdc5bd1cdb7806",
    alt: "Vista previa del documento oficial del Modelo 102 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-102-link-download",
      label: "Descarga oficial del Modelo 102",
      sourceId: "aeat.model-102.downloads.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-102.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-link-order",
      label: "Orden HAC/277/2026",
      sourceId: "boe.irpf-2025-order-hac-277-2026",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-102-faq-purpose",
      question: "¿Qué es el Modelo 102?",
      answer: "El índice de la Agencia Tributaria lo identifica como documento de ingreso o devolución de la declaración del Impuesto sobre la Renta de las Personas Físicas.",
      sourceIds: ["aeat.models.index.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-faq-current-document",
      question: "¿Qué documento enlaza actualmente la AEAT?",
      answer: "La página de descarga enlaza un PDF titulado Modelo 102, declaración 2025, segundo plazo.",
      sourceIds: [
        "aeat.model-102.downloads.2026-06-09",
        "aeat.model-102.form-pdf.2026-04-17",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-faq-model-100",
      question: "¿Cómo se relaciona con el Modelo 100?",
      answer: "La AEAT incluye la descarga del Modelo 102 en la página del Modelo 100 y la ficha administrativa G229 menciona ambos documentos.",
      sourceIds: [
        "aeat.model-102.procedure-home.2026-06-09",
        "aeat.model-102.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-faq-download",
      question: "¿Existe un PDF oficial descargable?",
      answer: "Sí. La Sede de la Agencia Tributaria publica un PDF estático del Modelo 102 desde su página oficial de descarga.",
      sourceIds: [
        "aeat.model-102.downloads.2026-06-09",
        "aeat.model-102.form-pdf.2026-04-17",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-faq-channels",
      question: "¿Qué canales aparecen en la ficha G229?",
      answer: "La ficha compartida por los modelos 100 y 102 enumera la vía telemática, las oficinas de la AEAT, las entidades colaboradoras y otras oficinas habilitadas, sin decidir cuál corresponde a una situación concreta.",
      sourceIds: ["aeat.model-102.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-102-faq-legal",
      question: "¿Qué orden aprueba los modelos del IRPF del ejercicio 2025?",
      answer: "El BOE publica la Orden HAC/277/2026 para los modelos de declaración del IRPF correspondientes al ejercicio 2025.",
      sourceIds: ["boe.irpf-2025-order-hac-277-2026"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"102">;

const MODEL_121_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_02_IRPF_RELEASE_ID_V1,
  code: "121",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre la Renta de las Personas Físicas. Deducciones por familia numerosa o por personas con discapacidad a cargo. Comunicación de la cesión del derecho a la deducción por contribuyentes no obligados a presentar declaración",
  summary:
    "Comunicación de la cesión del derecho a determinadas deducciones por familia numerosa o por personas con discapacidad a cargo, en el contexto que identifica la AEAT.",
  searchTerms: [
    "Modelo 121",
    "cesión del derecho a la deducción",
    "familia numerosa",
    "personas con discapacidad a cargo",
    "comunicación de la cesión",
    "deducciones IRPF",
    "presentación electrónica Modelo 121",
    "predeclaración Modelo 121",
    "Orden HFP 105 2017",
  ],
  sections: [
    {
      id: "model-121-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-121-purpose-communication",
          heading: "Comunicación de una cesión",
          text: "La ficha oficial define el Modelo 121 como la comunicación para formalizar la cesión del derecho a las deducciones por familia numerosa o por personas con discapacidad a cargo en las circunstancias previstas por la normativa.",
          sourceIds: [
            "aeat.model-121.procedure-home.2026-06-09",
            "aeat.model-121.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-121-purpose-context",
          heading: "Contexto que figura en la denominación oficial",
          text: "La denominación publicada por la AEAT sitúa esta comunicación en el contexto de contribuyentes no obligados a presentar declaración; esta ficha no determina si ese contexto se aplica a una persona concreta.",
          sourceIds: ["aeat.models.index.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-121-access",
      title: "Canales y ayudas oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-121-access-channels",
          heading: "Canales recogidos por la ficha",
          text: "La ficha administrativa enumera la vía telemática y las predeclaraciones presentadas en Delegaciones o Administraciones de la Agencia Tributaria.",
          sourceIds: ["aeat.model-121.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-121-access-help",
          heading: "Ayuda electrónica y en papel",
          text: "La Sede publica una ayuda para la presentación electrónica y otra para el formulario de predeclaración en papel del Modelo 121.",
          sourceIds: [
            "aeat.model-121.electronic-help.2026-06-19",
            "aeat.model-121.paper-help.2026-01-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-121-details",
      title: "Información complementaria",
      kind: "DETAILS",
      items: [
        {
          id: "model-121-details-options",
          heading: "Opciones informativas de la página oficial",
          text: "La página del procedimiento muestra opciones para presentar o modificar la comunicación, generar una predeclaración y consultar comunicaciones, sin que esta ficha ejecute ninguna de esas acciones.",
          sourceIds: ["aeat.model-121.procedure-home.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-121-details-order",
          heading: "Orden de aprobación",
          text: "La Orden HFP/105/2017 aprueba los modelos 121 y 122 y recoge la denominación oficial del Modelo 121.",
          sourceIds: ["boe.model-121-order-hfp-105-2017"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-121.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 121 · comunicación de la cesión del derecho a la deducción",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G616.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f9a448b9fd90bbb2e0f6f660f44a29ba42881c6c7ad2987526e4a41309227a88",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-121.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento G616",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G616.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "dcc4ef30d934434ab1d812c35746d7592231419f9b3c87ad67b91a22c4ecf342",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-121.electronic-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 121 · presentación electrónica",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-121/presentacion-electronica-modelo-121.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ff64d0ea1fdf62bbca04389e4e700a05699a1dc701fe140533c72864c88d19fd",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-121.paper-help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 121 · presentación en papel",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-121/presentacion-papel-modelo-121.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f2cf3fbf1f7991320a0732fac2fa9ead30d7e013a8eb85e962984ea1f56b2419",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-121-order-hfp-105-2017",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/105/2017, de 6 de febrero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2017-1334",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d60c086b5f13fff9193ee2b4046ae93f4fdcb3d2711658a074a3f08c49a40c6f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-121-link-electronic-help",
      label: "Ayuda oficial para la presentación electrónica",
      sourceId: "aeat.model-121.electronic-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-link-paper-help",
      label: "Ayuda oficial para la predeclaración en papel",
      sourceId: "aeat.model-121.paper-help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-121.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-link-order",
      label: "Orden HFP/105/2017",
      sourceId: "boe.model-121-order-hfp-105-2017",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-121-faq-purpose",
      question: "¿Para qué sirve el Modelo 121?",
      answer: "La AEAT lo define como una comunicación para formalizar la cesión del derecho a deducciones por familia numerosa o por personas con discapacidad a cargo en las circunstancias previstas por la normativa.",
      sourceIds: [
        "aeat.model-121.procedure-home.2026-06-09",
        "aeat.model-121.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-faq-context",
      question: "¿Qué contexto menciona la denominación oficial?",
      answer: "La denominación publicada por la AEAT menciona contribuyentes no obligados a presentar declaración; esta información general no decide si ese contexto corresponde a una persona concreta.",
      sourceIds: ["aeat.models.index.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-faq-channels",
      question: "¿Qué canales enumera la ficha administrativa?",
      answer: "La ficha enumera la vía telemática y las predeclaraciones presentadas en Delegaciones o Administraciones de la Agencia Tributaria.",
      sourceIds: ["aeat.model-121.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-faq-help",
      question: "¿Existe ayuda oficial para las dos vías que muestra la AEAT?",
      answer: "Sí. La Sede publica una ayuda para la presentación electrónica y otra para el formulario de predeclaración en papel.",
      sourceIds: [
        "aeat.model-121.electronic-help.2026-06-19",
        "aeat.model-121.paper-help.2026-01-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-faq-options",
      question: "¿Qué opciones informativas aparecen en la página del procedimiento?",
      answer: "La página muestra opciones para presentar o modificar la comunicación, generar una predeclaración y consultar comunicaciones. Esta ficha solo las describe y no inicia ninguna gestión.",
      sourceIds: ["aeat.model-121.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-121-faq-legal",
      question: "¿Qué norma aprueba el Modelo 121?",
      answer: "El BOE publica la aprobación de los modelos 121 y 122 mediante la Orden HFP/105/2017, de 6 de febrero.",
      sourceIds: ["boe.model-121-order-hfp-105-2017"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"121">;

export const PUBLIC_AEAT_BATCH_02_IRPF_CONTENT_V1 = deepFreeze([
  MODEL_100_CONTENT,
  MODEL_102_CONTENT,
  MODEL_121_CONTENT,
] as const);

export type PublicAeatBatch02IrpfCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_02_IRPF_CONTENT_V1)[number]["code"];
