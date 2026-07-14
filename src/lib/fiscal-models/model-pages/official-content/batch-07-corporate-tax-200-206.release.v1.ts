import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_RELEASE_ID_V1 =
  "public-aeat-official-batch-07-corporate-tax-200-206.2026-07-13.v1" as const;

export type PublicAeatBatch07CorporateTax200206CodeV1 = "200" | "202" | "206";

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

const MODELS_200_206_PROCEDURE_HOME_SOURCE = {
  id: "aeat.models-200-206.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title:
    "Modelo 200 y 206 · Impuesto sobre Sociedades e Impuesto sobre la Renta de no Residentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE04.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7d86c9656ad6c88287ac32518542ca2b5ef2659cc4393e3a8dcdece37d325b36",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_200_206_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.models-200-206.procedure-record.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento de los Modelos 200 y 206",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE04.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ddff2ef0f202934eb313a6b29ac775ccd20ab4636c9bbd3c27110d1865a9f616",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_200_206_MANAGEMENT_SOURCE = {
  id: "aeat.models-200-206.management.2026-07-01",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Gestiones sociedades · Modelos 200 y 206",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/modelo-200.html",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "982f4d758f9cc4f1013fb185f87c97f4c8e5107296e562e12029d83cd8743867",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const CORPORATE_TAX_2025_CAMPAIGN_SOURCE = {
  id: "aeat.corporate-tax-2025.campaign.2026-07-01",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Campaña de Sociedades 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/campana-sociedades.html",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "34a17f869508643452216dab5aba9a9258069a6bb655a66f918b1652bea9463e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const CORPORATE_TAX_2025_MANUAL_SOURCE = {
  id: "aeat.corporate-tax-2025.manual.2026-07-02",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Manual práctico de Sociedades 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/200.shtml",
  officialUpdatedOn: "2026-07-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "38dabaecd78288423e28c435d6f17965acfd63936136ad650df9c0783806b402",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_529_2026_SOURCE = {
  id: "boe.models-200-206.order-hac-529-2026",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/529/2026, de 7 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-11583",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5ad148518d28ce5e478bbddd16c1dc7f16e5a9662999a6f9473f6a7aa145fa8b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2194_2013_SOURCE = {
  id: "boe.electronic-tax-filing.order-hap-2194-2013",
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

const MODEL_200_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_RELEASE_ID_V1,
  code: "200",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IS. Impuesto sobre Sociedades e Impuesto sobre la Renta de no Residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español). Declaración (Mod. 200). Documentos de ingreso o devolución: Impuesto sobre Sociedades (Mod. 200); Impuesto sobre la Renta de no Residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español) (Mod.206).",
  summary:
    "Declaración que la AEAT encuadra en el Impuesto sobre Sociedades y en el Impuesto sobre la Renta de no Residentes descrito en su denominación oficial, con documento de ingreso o devolución y gestión electrónica mediante Sociedades WEB.",
  searchTerms: [
    "modelo 200",
    "impuesto sobre sociedades",
    "impuesto sobre la renta de no residentes",
    "IRNR establecimientos permanentes",
    "entidades en régimen de atribución de rentas",
    "declaración de sociedades",
    "documento de ingreso o devolución",
    "Sociedades WEB",
    "fichero modelo 200",
    "presentación por lotes",
    "formulario modelo 200 2025",
    "manual sociedades 2025",
    "Orden HAC 529 2026",
    "autónomo societario",
    "sociedad limitada",
    "beneficio contable base imponible",
    "ajustes fiscales",
    "gastos no deducibles",
    "sociedad inactiva",
    "bases imponibles negativas",
    "tipos impuesto sociedades 2025",
    "plazo modelo 200",
    "cuentas anuales",
  ],
  sections: [
    {
      id: "model-200-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-200-purpose-identity",
          heading: "Declaración vinculada al IS y al IRNR",
          text: "El índice de la AEAT identifica el Modelo 200 con la declaración del Impuesto sobre Sociedades y del Impuesto sobre la Renta de no Residentes en el ámbito que reproduce su denominación oficial.",
          sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-200-purpose-shared-procedure",
          heading: "Procedimiento compartido con el Modelo 206",
          text: "La portada y la ficha administrativa agrupan los Modelos 200 y 206 en un mismo procedimiento, aunque el índice y las descargas conservan una identidad documental separada para cada código.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODELS_200_206_PROCEDURE_HOME_SOURCE.id,
            MODELS_200_206_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-200-access",
      title: "Canal y documento descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-200-access-web-file",
          heading: "Sociedades WEB e importación de fichero",
          text: "La AEAT describe Sociedades WEB como entorno electrónico del Modelo 200 y documenta en su ayuda la incorporación de un fichero ajustado al diseño publicado. La página de gestiones también separa un canal por lotes.",
          sourceIds: [
            MODELS_200_206_MANAGEMENT_SOURCE.id,
            "aeat.model-200.sociedades-web-help.2026-07-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-200-access-form",
          heading: "Documento oficial rotulado para 2025",
          text: "La página de descarga enlaza un documento de ingreso o devolución del Modelo 200 rotulado para 2025. Es un PDF estático de una página y se conserva como documento informativo oficial.",
          sourceIds: [
            "aeat.model-200.download.2026-04-20",
            "aeat.model-200.form-pdf.2026-06-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-200-details",
      title: "Material de campaña y trazabilidad",
      kind: "DETAILS",
      items: [
        {
          id: "model-200-details-campaign",
          heading: "Campaña y manual de Sociedades 2025",
          text: "La campaña oficial enlaza el documento del Modelo 200 y el Manual práctico de Sociedades 2025 como referencias separadas. El manual es material general de campaña y no sustituye la ficha específica del modelo.",
          sourceIds: [
            CORPORATE_TAX_2025_CAMPAIGN_SOURCE.id,
            CORPORATE_TAX_2025_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-200-details-annual-order",
          heading: "Norma anual registrada",
          text: "La Orden HAC/529/2026 aprueba los modelos relativos a los períodos impositivos iniciados durante 2025. Esta referencia temporal no determina por sí sola la vigencia general del código.",
          sourceIds: [ORDER_HAC_529_2026_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-200-details-previous",
          heading: "Ejercicios anteriores separados",
          text: "La AEAT mantiene una página propia para la información de ejercicios anteriores del Modelo 200, separada del documento rotulado para 2025.",
          sourceIds: ["aeat.model-200.previous-exercises.2026-07-01"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_200_206_PROCEDURE_HOME_SOURCE,
    MODELS_200_206_PROCEDURE_RECORD_SOURCE,
    MODELS_200_206_MANAGEMENT_SOURCE,
    CORPORATE_TAX_2025_CAMPAIGN_SOURCE,
    CORPORATE_TAX_2025_MANUAL_SOURCE,
    {
      id: "aeat.model-200.sociedades-web-help.2026-07-01",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title:
        "Sociedades WEB · acceso, tramitación del Modelo 200 y versión Open",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/impuesto-sobre-sociedades-ayuda-tecnica/sociedades-web.html",
      officialUpdatedOn: "2026-07-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ca8f520453a9a074b26b7cba5787de377e0d332fb980201cd468da31e769be1e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-200.download.2026-04-20",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del documento de ingreso y devolución · Modelo 200",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-200-is-i_____mentos-ingreso-devolucion/descarga-documento-ingreso-devolucion_.html",
      officialUpdatedOn: "2026-04-20",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "93c542b3456193bf5e1bf45b88b607083be9c7ca09c936854cd4aa11fc40b1c8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-200.form-pdf.2026-06-22",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 200 · documento de ingreso o devolución · 2025",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GE04/200/Modelo_200.pdf",
      officialUpdatedOn: "2026-06-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "470bfe181e486c57f3556b8532978049c666a65deb8b712d68615b7440e43b12",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-200.previous-exercises.2026-07-01",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Información de ejercicios anteriores · Modelo 200",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-200-is-i_____mentos-ingreso-devolucion/informacion-ejercicios-anteriores_.html",
      officialUpdatedOn: "2026-07-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bce84625c1b3827ea78568cdf7a51d9f4cde64b79166a22f7ade1267987fda2c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAC_529_2026_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-200-form-document",
      kind: "FORM",
      title: "Documento de ingreso o devolución del Modelo 200 · 2025",
      sourceId: "aeat.model-200.form-pdf.2026-06-22",
      landingPageSourceId: "aeat.model-200.download.2026-04-20",
      mediaType: "application/pdf",
      fileName: "Modelo_200.pdf",
      byteLength: 755436,
      pageCount: 1,
      sha256:
        "470bfe181e486c57f3556b8532978049c666a65deb8b712d68615b7440e43b12",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-200-form-thumbnail",
    sourceId: "aeat.model-200.form-pdf.2026-06-22",
    publicHref:
      "/fiscal-models/modelo-200/formulario-modelo-200-2025-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "74c30d29f7e6032d031eecb951816d4922284b672d69799a271f8201ce66984c",
    alt: "Vista previa del documento oficial del Modelo 200 para 2025",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-200-link-procedure",
      label: "Página oficial de los Modelos 200 y 206",
      sourceId: MODELS_200_206_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-link-help",
      label: "Ayuda oficial de Sociedades WEB",
      sourceId: "aeat.model-200.sociedades-web-help.2026-07-01",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-link-form",
      label: "Documento oficial del Modelo 200 · 2025",
      sourceId: "aeat.model-200.form-pdf.2026-06-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-link-manual",
      label: "Manual práctico de Sociedades 2025",
      sourceId: CORPORATE_TAX_2025_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-link-order",
      label: "Orden HAC/529/2026",
      sourceId: ORDER_HAC_529_2026_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-200-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 200?",
      answer:
        "Lo identifica con la declaración del Impuesto sobre Sociedades y del Impuesto sobre la Renta de no Residentes en el ámbito que detalla su denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-model-206",
      question: "¿Por qué la página oficial menciona también el Modelo 206?",
      answer:
        "Porque la AEAT reúne ambos códigos en un procedimiento común, aunque mantiene para cada uno una identidad y una descarga documental propias.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODELS_200_206_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-sociedades-web",
      question: "¿Qué es Sociedades WEB en relación con el Modelo 200?",
      answer:
        "Es el entorno electrónico que la ayuda oficial relaciona con la confección y gestión del Modelo 200.",
      sourceIds: ["aeat.model-200.sociedades-web-help.2026-07-01"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-file",
      question: "¿Describe la AEAT un canal mediante fichero?",
      answer:
        "Sí. La ayuda de Sociedades WEB describe la importación de un fichero y la página de gestiones separa además la presentación por lotes.",
      sourceIds: [
        MODELS_200_206_MANAGEMENT_SOURCE.id,
        "aeat.model-200.sociedades-web-help.2026-07-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-form",
      question: "¿Qué documento oficial descargable existe?",
      answer:
        "La AEAT publica un documento de ingreso o devolución del Modelo 200 rotulado para 2025, en un PDF estático de una página.",
      sourceIds: [
        "aeat.model-200.download.2026-04-20",
        "aeat.model-200.form-pdf.2026-06-22",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-campaign",
      question: "¿Qué material general enlaza la campaña de Sociedades?",
      answer:
        "Enlaza, entre otros recursos, el documento del Modelo 200 y el Manual práctico de Sociedades 2025.",
      sourceIds: [
        CORPORATE_TAX_2025_CAMPAIGN_SOURCE.id,
        CORPORATE_TAX_2025_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-order",
      question: "¿Qué período cubre expresamente la Orden HAC/529/2026?",
      answer:
        "La orden se refiere a los períodos impositivos iniciados entre el 1 de enero y el 31 de diciembre de 2025.",
      sourceIds: [ORDER_HAC_529_2026_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-200-faq-previous",
      question: "¿Dónde separa la AEAT los ejercicios anteriores?",
      answer:
        "Los agrupa en una página específica de información de ejercicios anteriores del Modelo 200.",
      sourceIds: ["aeat.model-200.previous-exercises.2026-07-01"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODELS_200_206_MANAGEMENT_SOURCE.id,
      "aeat.model-200.sociedades-web-help.2026-07-01",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"200">;

const MODEL_202_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-202.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 202 · pago fraccionado",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE00.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bfd669572e5f999fc8368aa0aae38ca1237bd3f5071694b4199d529576989c30",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_202_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-202.procedure-record.2026-06-10",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 202",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE00.shtml",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a900ea14793fe48a4351f4d0a186446f55e0fd34de2b1389c7bcfa5c86c0bcbd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_202_MANAGEMENT_SOURCE = {
  id: "aeat.model-202.management.2026-06-10",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Gestiones sociedades · Modelo 202",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/modelo-202.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7979142531567b04a06123a2f1cff7a1e443cfd13cab7c25804f52eb4926a912",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_202_PAYMENTS_INFORMATION_SOURCE = {
  id: "aeat.model-202.payments-information.2026-06-30",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Pagos fraccionados en el Impuesto sobre Sociedades",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades/pagos-fraccionados-impuesto-sobre-sociedades.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "31cedaac5ca73fff17e1ff7d7d9bddfd66ab4589ee53eeb19ef0e75bc1210584",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_202_CURRENT_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-202.instructions-2025-and-following.2026-06-10",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 202 · instrucciones 2025 y siguientes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-sociedades/modelo-202-is-i_____resencia-territorio-fraccionado_/instrucciones.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1ceaf6f8a2a01176a6ec884857f5506b26015eb953c8c0d430bcdf30545db133",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_202_PRESENTATION_HELP_SOURCE = {
  id: "aeat.model-202.presentation-help.2026-06-30",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 202 · presentación electrónica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-202/presentacion-electronica-modelo-202.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6766f0407aca1a17c5a455907d53157b3a9ebffa9250f1a6187abd330a53d5d9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_200_299_REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-200-299.register-designs.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · Modelos 200 al 299",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-200-299.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1397ca1c069858135a1229fa0e1b36d36df487d9e757207069761e2c143a67a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_227_2017_SOURCE = {
  id: "boe.model-202.order-hfp-227-2017",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/227/2017, de 13 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2017-2778",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "159c38c22f1a5ec2647963203fb26a95bd5c9c98daec420571cf18fbd19cebc2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_495_2024_SOURCE = {
  id: "boe.model-202.order-hac-495-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/495/2024, de 21 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-10574",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bc82d55994c62818756bb4ed49e55795316be456fc0dc56e5e783cbe02b81ab4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const CORPORATE_TAX_LAW_SOURCE = {
  id: "boe.corporate-tax.law-27-2014",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 27/2014, de 27 de noviembre, del Impuesto sobre Sociedades",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-12328",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c5b17bd2b1ab498a71c87d91a44b119128ce9f542d3645b271e60c8a03644e5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_202_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_RELEASE_ID_V1,
  code: "202",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IS. Impuesto sobre Sociedades e Impuesto sobre la Renta de no residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español). Pago Fraccionado.",
  summary:
    "Modelo que la AEAT identifica como pago fraccionado del Impuesto sobre Sociedades y del Impuesto sobre la Renta de no Residentes en el ámbito descrito literalmente por su denominación oficial.",
  searchTerms: [
    "modelo 202",
    "pago fraccionado",
    "impuesto sobre sociedades",
    "impuesto sobre la renta de no residentes",
    "IRNR establecimientos permanentes",
    "entidades en régimen de atribución de rentas",
    "formulario en línea modelo 202",
    "fichero modelo 202",
    "diseño de registro 202",
    "instrucciones 2025 y siguientes",
    "presentación 2026 y siguientes",
    "Orden HFP 227 2017",
    "Orden HAC 495 2024",
    "autónomo societario",
    "pagos a cuenta sociedades",
    "abril octubre diciembre",
    "periodo 1/P 2/P 3/P",
    "artículo 40.2",
    "artículo 40.3",
    "modalidades pago fraccionado",
    "cifra de negocios 6 millones",
    "pago mínimo",
  ],
  sections: [
    {
      id: "model-202-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-202-purpose-identity",
          heading: "Pago fraccionado identificado por la AEAT",
          text: "El índice y las páginas propias de la AEAT identifican el Modelo 202 como pago fraccionado del Impuesto sobre Sociedades y del Impuesto sobre la Renta de no Residentes en el ámbito incluido en su denominación.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_202_PROCEDURE_HOME_SOURCE.id,
            MODEL_202_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-202-purpose-record",
          heading: "Ficha administrativa separada",
          text: "La ficha administrativa conserva la misma identidad y describe un procedimiento electrónico. Esta información general no evalúa su aplicación a una persona o entidad concreta.",
          sourceIds: [MODEL_202_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-202-access",
      title: "Canales técnicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-202-access-browser",
          heading: "Formulario en línea",
          text: "La ayuda técnica describe un formulario en línea para el Modelo 202 y la página de gestiones rotula el servicio del ejercicio 2026 y siguientes.",
          sourceIds: [
            MODEL_202_MANAGEMENT_SOURCE.id,
            MODEL_202_PRESENTATION_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-202-access-file",
          heading: "Importación de fichero y diseño de registro",
          text: "La ayuda oficial documenta la importación de un fichero ajustado al diseño publicado, mientras que el catálogo técnico identifica un diseño del Modelo 202 para 2025 y siguientes.",
          sourceIds: [
            MODEL_202_PRESENTATION_HELP_SOURCE.id,
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-202-details",
      title: "Instrucciones y trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-202-details-current-material",
          heading: "Materiales con referencias temporales distintas",
          text: "La gestión electrónica se rotula para 2026 y siguientes, mientras que las instrucciones y el diseño de registro se rotulan para 2025 y siguientes. Estas referencias se conservan por separado y no se usan para inferir la vigencia general del código.",
          sourceIds: [
            MODEL_202_MANAGEMENT_SOURCE.id,
            MODEL_202_CURRENT_INSTRUCTIONS_SOURCE.id,
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-202-details-context",
          heading: "Instrucciones anteriores como contexto",
          text: "La AEAT mantiene páginas distintas para períodos iniciados en 2023 y 2024 y para el intervalo 2018 a 2022. Se registran únicamente como contexto separado del material rotulado para 2025 y siguientes.",
          sourceIds: [
            "aeat.model-202.instructions-2023-2024.2026-06-10",
            "aeat.model-202.instructions-2018-2022.2026-06-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-202-details-orders",
          heading: "Aprobación y modificación registradas",
          text: "La Orden HFP/227/2017 aprueba el Modelo 202 y la Orden HAC/495/2024 modifica esa orden. Ambas referencias figuran en las fuentes oficiales del procedimiento.",
          sourceIds: [
            ORDER_HFP_227_2017_SOURCE.id,
            ORDER_HAC_495_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_202_PROCEDURE_HOME_SOURCE,
    MODEL_202_PROCEDURE_RECORD_SOURCE,
    MODEL_202_MANAGEMENT_SOURCE,
    MODEL_202_PAYMENTS_INFORMATION_SOURCE,
    MODEL_202_CURRENT_INSTRUCTIONS_SOURCE,
    MODEL_202_PRESENTATION_HELP_SOURCE,
    MODELS_200_299_REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-202.instructions-2023-2024.2026-06-10",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Modelo 202 · instrucciones para períodos 2023 y 2024",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-sociedades/modelo-202-is-i_____resencia-territorio-fraccionado_/instrucciones/instrucciones-periodos-impositivos-iniciados-2023-2024.html",
      officialUpdatedOn: "2026-06-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "047f5c8a41851c3cb9772d00ab79dccefe7b057d0f1760d81110a00758232855",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-202.instructions-2018-2022.2026-06-10",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Modelo 202 · instrucciones para períodos 2018 a 2022",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-sociedades/modelo-202-is-i_____resencia-territorio-fraccionado_/instrucciones/instrucciones-periodos-impositivos-iniciados-2018-2022.html",
      officialUpdatedOn: "2026-06-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "14a269c9452bdad0484d08408f14b1bdbb37704b5571d173e7da068ad683b518",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HFP_227_2017_SOURCE,
    ORDER_HAC_495_2024_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
    CORPORATE_TAX_LAW_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-202-link-procedure",
      label: "Página oficial del Modelo 202",
      sourceId: MODEL_202_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-link-instructions",
      label: "Instrucciones oficiales 2025 y siguientes",
      sourceId: MODEL_202_CURRENT_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-link-help",
      label: "Ayuda técnica oficial del Modelo 202",
      sourceId: MODEL_202_PRESENTATION_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-link-register-design",
      label: "Diseños de registro de los Modelos 200 al 299",
      sourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-link-approval-order",
      label: "Orden HFP/227/2017",
      sourceId: ORDER_HFP_227_2017_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-link-modification-order",
      label: "Orden HAC/495/2024",
      sourceId: ORDER_HAC_495_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-202-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 202?",
      answer:
        "Lo identifica como pago fraccionado del Impuesto sobre Sociedades y del Impuesto sobre la Renta de no Residentes en el ámbito incluido en su denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-record",
      question: "¿Cómo describe la AEAT el procedimiento?",
      answer:
        "La ficha administrativa lo describe como un procedimiento tributario de tramitación electrónica.",
      sourceIds: [MODEL_202_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-browser",
      question: "¿Qué canal técnico muestra la ayuda oficial?",
      answer:
        "La ayuda oficial describe un formulario en línea y la gestión lo rotula para el ejercicio 2026 y siguientes.",
      sourceIds: [
        MODEL_202_MANAGEMENT_SOURCE.id,
        MODEL_202_PRESENTATION_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-file",
      question: "¿Admite el entorno descrito importar un fichero?",
      answer:
        "Sí. La ayuda documenta la importación de un fichero ajustado al diseño publicado por la AEAT.",
      sourceIds: [
        MODEL_202_PRESENTATION_HELP_SOURCE.id,
        MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-instructions",
      question: "¿Qué referencia temporal muestran las instrucciones?",
      answer:
        "La página principal de instrucciones se rotula para 2025 y siguientes.",
      sourceIds: [MODEL_202_CURRENT_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-current-channel",
      question: "¿Por qué la gestión menciona 2026 y las instrucciones 2025?",
      answer:
        "Son referencias de dos recursos distintos: la gestión rotula el servicio para 2026 y siguientes y las instrucciones declaran alcance desde 2025. La ficha conserva ambas sin equipararlas.",
      sourceIds: [
        MODEL_202_MANAGEMENT_SOURCE.id,
        MODEL_202_CURRENT_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-register-design",
      question: "¿Dónde publica la AEAT el diseño de registro?",
      answer:
        "Lo incluye en su catálogo técnico de diseños de registro para los Modelos 200 al 299.",
      sourceIds: [MODELS_200_299_REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-202-faq-orders",
      question:
        "¿Qué normas registran la aprobación y una modificación posterior?",
      answer:
        "La Orden HFP/227/2017 aprueba el Modelo 202 y la Orden HAC/495/2024 modifica esa orden.",
      sourceIds: [ORDER_HFP_227_2017_SOURCE.id, ORDER_HAC_495_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_202_MANAGEMENT_SOURCE.id,
      MODEL_202_PRESENTATION_HELP_SOURCE.id,
      MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"202">;

const MODEL_206_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_RELEASE_ID_V1,
  code: "206",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Documento de ingreso o devolución del Impuesto sobre la Renta de no Residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español).",
  summary:
    "Documento de ingreso o devolución que la AEAT identifica con el Impuesto sobre la Renta de no Residentes para establecimientos permanentes y entidades extranjeras en régimen de atribución de rentas con presencia en territorio español.",
  searchTerms: [
    "modelo 206",
    "impuesto sobre la renta de no residentes",
    "IRNR",
    "establecimientos permanentes",
    "entidades en régimen de atribución de rentas",
    "entidades extranjeras con presencia en España",
    "documento de ingreso o devolución",
    "formulario modelo 206 2025",
    "procedimiento modelo 200 y 206",
    "Campaña Sociedades 2025",
    "Orden HAC 529 2026",
  ],
  sections: [
    {
      id: "model-206-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-206-purpose-identity",
          heading:
            "Documento propio del Impuesto sobre la Renta de no Residentes",
          text: "El índice oficial identifica el Modelo 206 como documento de ingreso o devolución del Impuesto sobre la Renta de no Residentes para el ámbito que reproduce su denominación.",
          sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-206-purpose-shared-procedure",
          heading: "Relación con el procedimiento de los Modelos 200 y 206",
          text: "La AEAT integra el Modelo 206 en el procedimiento compartido con el Modelo 200. El índice y las descargas mantienen, no obstante, un documento identificado específicamente como Modelo 206.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODELS_200_206_PROCEDURE_HOME_SOURCE.id,
            MODELS_200_206_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-206-access",
      title: "Canal y documento descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-206-access-electronic",
          heading: "Procedimiento electrónico compartido",
          text: "La ficha administrativa común registra lugar telemático, tramitación electrónica y nivel de interactividad electrónica. Esta ficha solo documenta la existencia del canal.",
          sourceIds: [MODELS_200_206_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-206-access-form",
          heading: "Documento oficial rotulado para 2025",
          text: "La página específica de descarga enlaza el documento del Modelo 206 rotulado para 2025. Es un PDF estático de una página, distinto del documento correspondiente al Modelo 200.",
          sourceIds: [
            "aeat.model-206.download.2026-04-20",
            "aeat.model-206.form-pdf.2026-06-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-206-details",
      title: "Campaña y trazabilidad",
      kind: "DETAILS",
      items: [
        {
          id: "model-206-details-campaign",
          heading: "Referencia en la Campaña de Sociedades 2025",
          text: "La campaña oficial de Sociedades 2025 enlaza de forma separada las descargas de los Modelos 200 y 206 y el manual general de la campaña.",
          sourceIds: [
            CORPORATE_TAX_2025_CAMPAIGN_SOURCE.id,
            CORPORATE_TAX_2025_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-206-details-annual-order",
          heading: "Norma anual registrada",
          text: "La Orden HAC/529/2026 incluye los modelos del Impuesto sobre la Renta de no Residentes para el ámbito descrito y se refiere expresamente a períodos impositivos iniciados durante 2025.",
          sourceIds: [ORDER_HAC_529_2026_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-206-details-previous",
          heading: "Ejercicios anteriores separados",
          text: "La AEAT mantiene una página específica para la información de ejercicios anteriores del Modelo 206, separada de la descarga rotulada para 2025.",
          sourceIds: ["aeat.model-206.previous-exercises.2026-06-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_200_206_PROCEDURE_HOME_SOURCE,
    MODELS_200_206_PROCEDURE_RECORD_SOURCE,
    MODELS_200_206_MANAGEMENT_SOURCE,
    CORPORATE_TAX_2025_CAMPAIGN_SOURCE,
    CORPORATE_TAX_2025_MANUAL_SOURCE,
    {
      id: "aeat.model-206.download.2026-04-20",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del documento de ingreso y devolución · Modelo 206",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-200-is-i_____mentos-ingreso-devolucion/descarga-documento-ingreso-devolucion-206.html",
      officialUpdatedOn: "2026-04-20",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2d4634fa3f8c7776ebfd5e4eb5d653a9f5ee8a0416f83299aed950b226d5b82f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-206.form-pdf.2026-06-22",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 206 · documento de ingreso o devolución · 2025",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GE04/206/Modelo_206.pdf",
      officialUpdatedOn: "2026-06-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c6cafb7acab4fc4cc9f7949547119f32059495fda77ad31b067d19887e759834",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-206.previous-exercises.2026-06-10",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Información de ejercicios anteriores · Modelo 206",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-sociedades/modelo-200-is-i_____mentos-ingreso-devolucion/informacion-ejercicios-anteriores-206.html",
      officialUpdatedOn: "2026-06-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0fd605fb88037127c8d49ad31f4dd4751ed4a35f30588ce8c07c552b554cda9f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAC_529_2026_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-206-form-document",
      kind: "FORM",
      title: "Documento de ingreso o devolución del Modelo 206 · 2025",
      sourceId: "aeat.model-206.form-pdf.2026-06-22",
      landingPageSourceId: "aeat.model-206.download.2026-04-20",
      mediaType: "application/pdf",
      fileName: "Modelo_206.pdf",
      byteLength: 769221,
      pageCount: 1,
      sha256:
        "c6cafb7acab4fc4cc9f7949547119f32059495fda77ad31b067d19887e759834",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-206-form-thumbnail",
    sourceId: "aeat.model-206.form-pdf.2026-06-22",
    publicHref:
      "/fiscal-models/modelo-206/formulario-modelo-206-2025-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "3da84c2869a9b441686ef154926022b0c8fe978723af3223093962ae37369831",
    alt: "Vista previa del documento oficial del Modelo 206 para 2025",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-206-link-procedure",
      label: "Página oficial de los Modelos 200 y 206",
      sourceId: MODELS_200_206_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-link-form",
      label: "Documento oficial del Modelo 206 · 2025",
      sourceId: "aeat.model-206.form-pdf.2026-06-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-link-campaign",
      label: "Campaña de Sociedades 2025",
      sourceId: CORPORATE_TAX_2025_CAMPAIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-link-previous",
      label: "Información de ejercicios anteriores del Modelo 206",
      sourceId: "aeat.model-206.previous-exercises.2026-06-10",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-link-order",
      label: "Orden HAC/529/2026",
      sourceId: ORDER_HAC_529_2026_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-206-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 206?",
      answer:
        "Lo identifica como documento de ingreso o devolución del Impuesto sobre la Renta de no Residentes para el ámbito detallado en su denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-shared-procedure",
      question: "¿Por qué comparte procedimiento con el Modelo 200?",
      answer:
        "Porque la AEAT agrupa ambos códigos en el procedimiento GE04, aunque conserva una identidad y un documento descargable propios para el Modelo 206.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODELS_200_206_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-distinct-form",
      question: "¿Es su PDF distinto del documento del Modelo 200?",
      answer:
        "Sí. La AEAT publica páginas de descarga y archivos PDF separados, cada uno rotulado con su propio código.",
      sourceIds: [
        "aeat.model-206.download.2026-04-20",
        "aeat.model-206.form-pdf.2026-06-22",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-form-year",
      question: "¿Qué ejercicio aparece en el documento descargable?",
      answer:
        "El PDF oficial actualmente enlazado está rotulado como Impuesto sobre la Renta de no Residentes 2025.",
      sourceIds: ["aeat.model-206.form-pdf.2026-06-22"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-electronic",
      question: "¿Qué canal describe la ficha administrativa común?",
      answer:
        "Describe una tramitación electrónica dentro del procedimiento compartido de los Modelos 200 y 206.",
      sourceIds: [MODELS_200_206_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-campaign",
      question: "¿Dónde enlaza la AEAT el documento del Modelo 206?",
      answer:
        "La Campaña de Sociedades 2025 incluye una referencia específica a su página de descarga.",
      sourceIds: [
        CORPORATE_TAX_2025_CAMPAIGN_SOURCE.id,
        "aeat.model-206.download.2026-04-20",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-order",
      question: "¿Qué período cubre expresamente la Orden HAC/529/2026?",
      answer:
        "La orden se refiere a los períodos impositivos iniciados entre el 1 de enero y el 31 de diciembre de 2025.",
      sourceIds: [ORDER_HAC_529_2026_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-206-faq-previous",
      question:
        "¿Dónde conserva la AEAT la información de ejercicios anteriores?",
      answer:
        "La conserva en una página específica de ejercicios anteriores del Modelo 206.",
      sourceIds: ["aeat.model-206.previous-exercises.2026-06-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODELS_200_206_PROCEDURE_RECORD_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"206">;

export const PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_CONTENT_V1 = deepFreeze(
  [MODEL_200_CONTENT, MODEL_202_CONTENT, MODEL_206_CONTENT] as const,
);
