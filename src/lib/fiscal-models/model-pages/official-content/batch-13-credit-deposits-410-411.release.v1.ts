import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_13_CREDIT_DEPOSITS_410_411_RELEASE_ID_V1 =
  "public-aeat-official-batch-13-credit-deposits-410-411.2026-07-13.v1" as const;

export type PublicAeatBatch13CreditDeposits410411CodeV1 = "410" | "411";

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

const MODEL_410_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-410.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 410 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "18a779ee3b4e2af86ad9b182137471b0a2600e87f9b0b6165d70602cdcff3cb5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_410_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-410.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 410",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "48289027a32c4dfbfcbb72d24579f573b12e1d299b03ac1d74fa80dacfe68501",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_410_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-410.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 410 · instrucciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/pagos-cuenta/modelo-410-pago-sobre-depositos-credito_/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2df982412cf44f7ce94f14541ef793a843df1029f5d7828c7532fbb3d8d671a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_411_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-411.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 411 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC38.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5f47fc8071f7dc37faf83ac02d38c570b28dd9e1463b865fd6b0977bbbcc6cc6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_411_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-411.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 411 · instrucciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/otros/modelo-411-impuesto-sobre-depositos-credito/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4447e0b526a7af15f1ca6a061adc32edf9c91ed930cea5621f699b40c6b4c6a3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_411_DOWNLOAD_PAGE_SOURCE = {
  id: "aeat.model-411.instructions-download.2026-01-22",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 411 · página de descarga de instrucciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/otros-impuestos/impuesto-sobre-depositos-entidades-credito/instrucciones-modelo-411.html",
  officialUpdatedOn: "2026-01-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9374e1adca39f84a951c1d6511f110d6baabe523d405ba20aba8b351d71384ff",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_411_INSTRUCTIONS_PDF_SOURCE = {
  id: "aeat.model-411.instructions-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 411 · instrucciones PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Declaraciones_informativas/I_Depositos_entidades_credito/Instrucciones_modelo_411.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "244e857e5240c271dd8c2952a7874748bc170a8b9b36a04aa296da051463d3f7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const RECORD_DESIGNS_INDEX_SOURCE = {
  id: "aeat.record-designs.other-models.2026-07-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · resto de modelos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/resto-modelos.html",
  officialUpdatedOn: "2026-07-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7c73466477242552d2ddcac5fcfd1254b419433da66815297bfdf1bd9d958cd9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_410_DESIGN_SOURCE = {
  id: "aeat.model-410.record-design.2020-01-15",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 410 · diseño de registro",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_Resto_Mod/archivos/dr410e15v13.xlsx",
  officialUpdatedOn: "2020-01-15",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b78af837521f5afcdb15748932f8deaa688ef7138c4a3c3e2762a9c18fd536a2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_411_DESIGN_SOURCE = {
  id: "aeat.model-411.record-design.2020-01-15",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 411 · diseño de registro",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_Resto_Mod/archivos/dr411e17v13.xlsx",
  officialUpdatedOn: "2020-01-15",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "90b8ae9139f1173bec0585fb7fe7472b2026b306c4e6ed8147ad73364ee860d7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_410_ORDER_SOURCE = {
  id: "boe.model-410.order-hap-2178-2014.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2178/2014, de 18 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2014-12146",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e55698f44fb6a0c9e1be196d7cdb163577a127829c6eeed048f9884e43b94d56",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_411_ORDER_SOURCE = {
  id: "boe.model-411.order-hap-1230-2015.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/1230/2015, de 17 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-7048",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d0fabba5de73ddd75e91468d5e051a72091f6c02dc0d19bd03f475e7c7146451",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_410_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_CREDIT_DEPOSITS_410_411_RELEASE_ID_V1,
  code: "410",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Pago a cuenta del Impuesto sobre los Depósitos de las Entidades de Crédito",
  summary:
    "La AEAT identifica el Modelo 410 como el pago a cuenta del Impuesto sobre los Depósitos de las Entidades de Crédito y publica un canal electrónico, instrucciones y un diseño de registro.",
  searchTerms: [
    "modelo 410",
    "pago a cuenta",
    "Impuesto sobre los Depósitos",
    "entidades de crédito",
    "depósitos bancarios",
    "autoliquidación",
    "formulario electrónico",
    "instrucciones 410",
    "diseño de registro 410",
    "Orden HAP 2178 2014",
  ],
  sections: [
    {
      id: "model-410-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-410-purpose-identity",
          heading: "Pago a cuenta del impuesto sobre depósitos",
          text: "El índice y la portada de la AEAT identifican el Modelo 410 como el pago a cuenta del Impuesto sobre los Depósitos de las Entidades de Crédito.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_410_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-410-purpose-record",
          heading: "Objeto administrativo",
          text: "La ficha del procedimiento lo describe como la autoliquidación del pago a cuenta de ese impuesto.",
          sourceIds: [MODEL_410_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-410-access",
      title: "Canal e instrucciones",
      kind: "ACCESS",
      items: [
        {
          id: "model-410-access-electronic",
          heading: "Canal electrónico",
          text: "La portada y la ficha administrativa describen un canal telemático mediante formulario, y la página de instrucciones lo caracteriza como electrónico.",
          sourceIds: [
            MODEL_410_PROCEDURE_HOME_SOURCE.id,
            MODEL_410_PROCEDURE_RECORD_SOURCE.id,
            MODEL_410_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-410-access-instructions",
          heading: "Guía de cumplimentación en HTML",
          text: "La AEAT publica instrucciones HTML que organizan la información general y los bloques de identificación, devengo, liquidación y distribución territorial.",
          sourceIds: [MODEL_410_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-410-details",
      title: "Diseño y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-410-details-design",
          heading: "Diseño de registro",
          text: "El índice técnico de la AEAT enlaza un diseño de registro del Modelo 410 etiquetado para 2015 y siguientes, con actualización de 15 de enero de 2020.",
          sourceIds: [
            RECORD_DESIGNS_INDEX_SOURCE.id,
            MODEL_410_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-410-details-orders",
          heading: "Órdenes relacionadas",
          text: "La Orden HAP/2178/2014 aprobó el Modelo 410 y la Orden HAP/1230/2015 modificó esa regulación al aprobar el Modelo 411.",
          sourceIds: [MODEL_410_ORDER_SOURCE.id, MODEL_411_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_410_PROCEDURE_HOME_SOURCE,
    MODEL_410_PROCEDURE_RECORD_SOURCE,
    MODEL_410_INSTRUCTIONS_SOURCE,
    MODEL_411_PROCEDURE_HOME_SOURCE,
    RECORD_DESIGNS_INDEX_SOURCE,
    MODEL_410_DESIGN_SOURCE,
    MODEL_410_ORDER_SOURCE,
    MODEL_411_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-410-link-procedure",
      label: "Página oficial del Modelo 410",
      sourceId: MODEL_410_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_410_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-link-instructions",
      label: "Instrucciones oficiales del Modelo 410",
      sourceId: MODEL_410_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-link-design",
      label: "Diseño de registro del Modelo 410",
      sourceId: MODEL_410_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-link-order",
      label: "Orden HAP/2178/2014",
      sourceId: MODEL_410_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-410-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 410?",
      answer:
        "El pago a cuenta del Impuesto sobre los Depósitos de las Entidades de Crédito.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_410_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer: "La autoliquidación del pago a cuenta de ese impuesto.",
      sourceIds: [MODEL_410_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-channel",
      question: "¿Qué tipo de canal describe la AEAT?",
      answer: "Un canal telemático mediante formulario electrónico.",
      sourceIds: [
        MODEL_410_PROCEDURE_HOME_SOURCE.id,
        MODEL_410_PROCEDURE_RECORD_SOURCE.id,
        MODEL_410_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-instructions",
      question: "¿Publica la AEAT instrucciones de cumplimentación?",
      answer:
        "Sí. La página oficial reúne instrucciones HTML con la estructura general del modelo.",
      sourceIds: [MODEL_410_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-instruction-sections",
      question: "¿Qué bloques generales organizan las instrucciones?",
      answer:
        "Identificación, devengo, liquidación, información complementaria y distribución territorial.",
      sourceIds: [MODEL_410_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-design",
      question: "¿Existe un diseño de registro oficial?",
      answer:
        "Sí. La AEAT enlaza un archivo XLSX específico para el Modelo 410.",
      sourceIds: [RECORD_DESIGNS_INDEX_SOURCE.id, MODEL_410_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-design-label",
      question: "¿Qué etiqueta temporal muestra ese diseño?",
      answer:
        "El índice lo identifica para 2015 y siguientes y señala una actualización de 15 de enero de 2020.",
      sourceIds: [RECORD_DESIGNS_INDEX_SOURCE.id, MODEL_410_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-order",
      question: "¿Qué orden aprobó el Modelo 410?",
      answer: "La Orden HAP/2178/2014, de 18 de noviembre.",
      sourceIds: [MODEL_410_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-410-faq-related-model",
      question: "¿Cómo se diferencia nominalmente del Modelo 411?",
      answer:
        "La AEAT denomina al 410 pago a cuenta y al 411 autoliquidación del Impuesto sobre los Depósitos de las Entidades de Crédito.",
      sourceIds: [
        MODEL_410_PROCEDURE_HOME_SOURCE.id,
        MODEL_411_PROCEDURE_HOME_SOURCE.id,
        MODEL_411_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_410_PROCEDURE_HOME_SOURCE.id,
      MODEL_410_PROCEDURE_RECORD_SOURCE.id,
      MODEL_410_INSTRUCTIONS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"410">;

const MODEL_411_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_CREDIT_DEPOSITS_410_411_RELEASE_ID_V1,
  code: "411",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre los Depósitos de las Entidades de Crédito. Autoliquidación",
  summary:
    "La AEAT identifica el Modelo 411 como la autoliquidación del Impuesto sobre los Depósitos de las Entidades de Crédito y publica un canal electrónico, instrucciones en HTML y PDF y un diseño de registro.",
  searchTerms: [
    "modelo 411",
    "Impuesto sobre los Depósitos",
    "entidades de crédito",
    "depósitos bancarios",
    "autoliquidación",
    "formulario electrónico",
    "instrucciones 411",
    "PDF modelo 411",
    "diseño de registro 411",
    "Orden HAP 1230 2015",
  ],
  sections: [
    {
      id: "model-411-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-411-purpose-identity",
          heading: "Autoliquidación del impuesto sobre depósitos",
          text: "El índice, la portada, las instrucciones y la orden de aprobación identifican el Modelo 411 con la autoliquidación del Impuesto sobre los Depósitos de las Entidades de Crédito.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_411_PROCEDURE_HOME_SOURCE.id,
            MODEL_411_INSTRUCTIONS_SOURCE.id,
            MODEL_411_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-411-purpose-related-model",
          heading: "Relación documental con el Modelo 410",
          text: "La Orden HAP/1230/2015 aprobó el Modelo 411 y modificó la orden que había aprobado el Modelo 410 como pago a cuenta.",
          sourceIds: [MODEL_411_ORDER_SOURCE.id, MODEL_410_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-411-access",
      title: "Canal e instrucciones",
      kind: "ACCESS",
      items: [
        {
          id: "model-411-access-electronic",
          heading: "Canal electrónico",
          text: "La portada y las instrucciones describen un canal electrónico mediante formulario.",
          sourceIds: [
            MODEL_411_PROCEDURE_HOME_SOURCE.id,
            MODEL_411_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-411-access-instructions",
          heading: "Instrucciones en HTML y PDF",
          text: "La AEAT publica las instrucciones como página HTML y ofrece también una versión PDF descargable.",
          sourceIds: [
            MODEL_411_INSTRUCTIONS_SOURCE.id,
            MODEL_411_DOWNLOAD_PAGE_SOURCE.id,
            MODEL_411_INSTRUCTIONS_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-411-details",
      title: "Documento, diseño y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-411-details-pdf",
          heading: "Documento de instrucciones",
          text: "El PDF oficial registrado tiene cinco páginas y la copia auditada no contiene JavaScript ni campos de formulario.",
          sourceIds: [MODEL_411_INSTRUCTIONS_PDF_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-411-details-design",
          heading: "Diseño de registro",
          text: "El índice técnico enlaza un diseño del Modelo 411 etiquetado para 2016 y siguientes, con actualización de 15 de enero de 2020.",
          sourceIds: [
            RECORD_DESIGNS_INDEX_SOURCE.id,
            MODEL_411_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-411-details-order",
          heading: "Orden de aprobación",
          text: "La Orden HAP/1230/2015, de 17 de junio, aprobó el Modelo 411.",
          sourceIds: [MODEL_411_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_410_PROCEDURE_HOME_SOURCE,
    MODEL_411_PROCEDURE_HOME_SOURCE,
    MODEL_411_INSTRUCTIONS_SOURCE,
    MODEL_411_DOWNLOAD_PAGE_SOURCE,
    MODEL_411_INSTRUCTIONS_PDF_SOURCE,
    RECORD_DESIGNS_INDEX_SOURCE,
    MODEL_411_DESIGN_SOURCE,
    MODEL_410_ORDER_SOURCE,
    MODEL_411_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-411-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones del Modelo 411",
      sourceId: MODEL_411_INSTRUCTIONS_PDF_SOURCE.id,
      landingPageSourceId: MODEL_411_DOWNLOAD_PAGE_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Instrucciones_modelo_411.pdf",
      byteLength: 306219,
      pageCount: 5,
      sha256:
        "244e857e5240c271dd8c2952a7874748bc170a8b9b36a04aa296da051463d3f7",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-411-instructions-thumbnail",
    sourceId: MODEL_411_INSTRUCTIONS_PDF_SOURCE.id,
    publicHref:
      "/fiscal-models/modelo-411/instrucciones-modelo-411-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "f8581b48ff5eedb91e70537d98507de581d36ccef3cd9dd8baa2a886d84eb901",
    alt: "Vista previa de la cabecera de las instrucciones oficiales del Modelo 411",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-411-link-procedure",
      label: "Página oficial del Modelo 411",
      sourceId: MODEL_411_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-link-instructions",
      label: "Instrucciones oficiales del Modelo 411",
      sourceId: MODEL_411_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-link-pdf",
      label: "Instrucciones descargables del Modelo 411",
      sourceId: MODEL_411_INSTRUCTIONS_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-link-design",
      label: "Diseño de registro del Modelo 411",
      sourceId: MODEL_411_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-link-order",
      label: "Orden HAP/1230/2015",
      sourceId: MODEL_411_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-411-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 411?",
      answer:
        "La autoliquidación del Impuesto sobre los Depósitos de las Entidades de Crédito.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_411_PROCEDURE_HOME_SOURCE.id,
        MODEL_411_INSTRUCTIONS_SOURCE.id,
        MODEL_411_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-order",
      question: "¿Qué norma aprobó el Modelo 411?",
      answer: "La Orden HAP/1230/2015, de 17 de junio.",
      sourceIds: [MODEL_411_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-channel",
      question: "¿Qué tipo de canal describe la AEAT?",
      answer: "Un canal electrónico mediante formulario.",
      sourceIds: [
        MODEL_411_PROCEDURE_HOME_SOURCE.id,
        MODEL_411_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-instructions",
      question: "¿En qué formatos publica la AEAT las instrucciones?",
      answer: "En una página HTML y en un documento PDF descargable.",
      sourceIds: [
        MODEL_411_INSTRUCTIONS_SOURCE.id,
        MODEL_411_DOWNLOAD_PAGE_SOURCE.id,
        MODEL_411_INSTRUCTIONS_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-pdf-pages",
      question: "¿Cuántas páginas tiene el PDF registrado?",
      answer: "La copia oficial auditada tiene cinco páginas.",
      sourceIds: [MODEL_411_INSTRUCTIONS_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-pdf-safety",
      question: "¿Es el PDF un formulario ejecutable?",
      answer:
        "No. Es un documento de instrucciones y la copia auditada no contiene campos de formulario ni JavaScript.",
      sourceIds: [MODEL_411_INSTRUCTIONS_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-design",
      question: "¿Existe un diseño de registro oficial?",
      answer:
        "Sí. La AEAT enlaza un archivo XLSX específico para el Modelo 411.",
      sourceIds: [RECORD_DESIGNS_INDEX_SOURCE.id, MODEL_411_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-design-label",
      question: "¿Qué etiqueta temporal muestra ese diseño?",
      answer:
        "El índice lo identifica para 2016 y siguientes y señala una actualización de 15 de enero de 2020.",
      sourceIds: [RECORD_DESIGNS_INDEX_SOURCE.id, MODEL_411_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-411-faq-related-model",
      question: "¿Cómo se diferencia nominalmente del Modelo 410?",
      answer:
        "La AEAT denomina al 411 autoliquidación del impuesto y al 410 pago a cuenta del mismo impuesto.",
      sourceIds: [
        MODEL_411_PROCEDURE_HOME_SOURCE.id,
        MODEL_410_PROCEDURE_HOME_SOURCE.id,
        MODEL_411_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_411_PROCEDURE_HOME_SOURCE.id,
      MODEL_411_INSTRUCTIONS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"411">;

export const PUBLIC_AEAT_BATCH_13_CREDIT_DEPOSITS_410_411_CONTENT_V1 =
  deepFreeze([MODEL_410_CONTENT, MODEL_411_CONTENT] as const);
