import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_RELEASE_ID_V1 =
  "public-aeat-official-batch-07-declarations-037-199.2026-07-13.v1" as const;

export type PublicAeatBatch07Declarations037199CodeV1 = "037" | "198" | "199";

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

const ORDER_EHA_1274_2007_SOURCE = {
  id: "boe.model-037.order-eha-1274-2007",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/1274/2007, de 26 de abril",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-9508",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "eb5fc87666767c2396d5965931de66392c38875cf3e450350b2e7dfab93d2938",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1526_2024_SOURCE = {
  id: "boe.model-037.order-hac-1526-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1526/2024, de 11 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-410",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "737c5c11da8c75a1bfc42e7325536af6757435cbf918ecaa8cf1a1d56eebc1f8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_EHA_3895_2004_SOURCE = {
  id: "boe.model-198.order-eha-3895-2004",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3895/2004, de 23 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2004-20157",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d927f15b54e7455f0c5db7777d7412830049b47b6830aab312a8864e61845b37",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1504_2024_SOURCE = {
  id: "boe.model-198.order-hac-1504-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1504/2024, de 26 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-27528",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "357d0e496d5130b6f79b4ea733c494813ae9b875bbf2d3c8dc2f52ca35eb3192",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_2001_12_21_SOURCE = {
  id: "boe.model-199.order-2001-12-21",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 21 de diciembre de 2001",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2001-24854",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9507504c1b5c50002123b89adf969e17e40fa24319856d0ffb64004be2e1e559",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1430_2025_SOURCE = {
  id: "boe.model-199.order-hac-1430-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1430/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25389",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "84e1e10ff368fadef88eaf8cd0440f93b283ee55734ba89ec8b13424364253cd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_037_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_RELEASE_ID_V1,
  code: "037",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "HISTORICAL",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración censal simplificada de alta, modificación y baja en el Censo de empresarios, profesionales y retenedores.",
  summary:
    "Modelo histórico que identificaba una declaración censal simplificada de alta, modificación y baja en el Censo de empresarios, profesionales y retenedores. La AEAT y la Orden HAC/1526/2024 confirman su supresión con efectos de 3 de febrero de 2025.",
  searchTerms: [
    "modelo 037",
    "declaración censal simplificada",
    "alta modificación baja censal",
    "censo empresarios profesionales retenedores",
    "modelo 037 histórico",
    "modelo 037 suprimido",
    "3 febrero 2025",
    "Orden EHA 1274 2007",
    "Orden HAC 1526 2024",
    "formulario histórico 037",
  ],
  sections: [
    {
      id: "model-037-purpose",
      title: "Identidad y estado histórico",
      kind: "PURPOSE",
      items: [
        {
          id: "model-037-purpose-identity",
          heading: "Declaración censal simplificada",
          text: "La Orden EHA/1274/2007 aprobó el Modelo 037 con la denominación de declaración censal simplificada de alta, modificación y baja en el Censo de empresarios, profesionales y retenedores.",
          sourceIds: [ORDER_EHA_1274_2007_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-037-purpose-historical-status",
          heading: "Modelo suprimido",
          text: "La Orden HAC/1526/2024 suprimió el Modelo 037 con efectos de 3 de febrero de 2025. La AEAT recoge ese mismo cambio en su información oficial; por ello, esta ficha se conserva únicamente como referencia histórica.",
          sourceIds: [
            "aeat.model-037.retirement-manual.2025-09-29",
            "aeat.model-037.retirement-news.2025-12-01",
            ORDER_HAC_1526_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-037-access",
      title: "Referencia documental histórica",
      kind: "ACCESS",
      items: [
        {
          id: "model-037-access-historical-channel",
          heading: "Canal electrónico descrito solo como histórico",
          text: "La referencia censal conservada por la AEAT permite documentar que existió una vía electrónica para este modelo. Se registra exclusivamente como contexto histórico y no como un canal disponible en la actualidad.",
          sourceIds: [
            "aeat.model-037.historical-presentation-reference.2025-10-10",
            "aeat.model-037.retirement-manual.2025-09-29",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-037-access-original-form",
          heading: "Formulario original publicado en el BOE",
          text: "La publicación original de la Orden EHA/1274/2007 contiene el formulario histórico en su anexo. Se conserva una vista previa de esa publicación oficial, claramente marcada como histórica.",
          sourceIds: [
            ORDER_EHA_1274_2007_SOURCE.id,
            "boe.model-037.original-form-pdf.2007-05-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-037-details",
      title: "Trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-037-details-approval",
          heading: "Aprobación en 2007",
          text: "La Orden EHA/1274/2007 aprobó el Modelo 037 y su publicación original incluye el diseño histórico del formulario.",
          sourceIds: [
            ORDER_EHA_1274_2007_SOURCE.id,
            "boe.model-037.original-form-pdf.2007-05-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-037-details-suppression",
          heading: "Supresión publicada en 2025",
          text: "La Orden HAC/1526/2024, publicada en el BOE de 9 de enero de 2025, recoge expresamente la supresión del Modelo 037 y la fecha de efectos indicada por la norma.",
          sourceIds: [ORDER_HAC_1526_2024_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-037.retirement-manual.2025-09-29",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Manual práctico IVA 2025 · Modelo 037",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-01-novedades-destacar-2025/modelo-037.html",
      officialUpdatedOn: "2025-09-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e3f0ab8808627885953e982ab7843b5fc43690d98be2c03f40ad33e80e5dea30",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-037.retirement-news.2025-12-01",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Orden Ministerial de modificación de declaraciones censales",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2025/enero/9/orden-ministerial-modificacion-declaraciones-censales.html",
      officialUpdatedOn: "2025-12-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8fb203cea7e218178ecd98281881e736f453c083bdce8ccba35e90d10c4fae14",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-037.historical-presentation-reference.2025-10-10",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Referencia histórica de presentación censal",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/tramites-censales-relacionados-empresarios-profesionales-retenedores/presentar-declaracion-censal.html",
      officialUpdatedOn: "2025-10-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "443589a7ea76350e502593cae930012d4ac2df57f205b7e0dcede42d570c1470",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_EHA_1274_2007_SOURCE,
    {
      id: "boe.model-037.original-form-pdf.2007-05-10",
      authority: "BOE",
      kind: "DOCUMENT_PDF",
      title:
        "Orden EHA/1274/2007 · publicación original con el formulario del Modelo 037",
      canonicalUrl:
        "https://www.boe.es/boe/dias/2007/05/10/pdfs/A20106-20124.pdf",
      officialUpdatedOn: "2007-05-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f3d0e8ae8ec8e8786fd3970126a25bc6910472b167bf79f42e307d3bd6bf1cbb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAC_1526_2024_SOURCE,
  ],
  documents: [
    {
      id: "model-037-historical-form-document",
      kind: "FORM",
      title: "Formulario histórico del Modelo 037 · Anexo II",
      sourceId: "boe.model-037.original-form-pdf.2007-05-10",
      landingPageSourceId: ORDER_EHA_1274_2007_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "A20106-20124.pdf",
      byteLength: 837626,
      pageCount: 19,
      sha256:
        "f3d0e8ae8ec8e8786fd3970126a25bc6910472b167bf79f42e307d3bd6bf1cbb",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-037-historical-form-thumbnail",
    sourceId: "boe.model-037.original-form-pdf.2007-05-10",
    publicHref:
      "/fiscal-models/modelo-037/formulario-modelo-037-historico-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 17,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "d7cd8a081a00d463158b28f371dda2cc973ecb33780c44a43100a28a7ee7d5fe",
    alt: "Vista previa histórica del formulario del Modelo 037 publicado en el BOE",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-037-link-aeat-status",
      label: "Información oficial de la AEAT sobre la supresión del Modelo 037",
      sourceId: "aeat.model-037.retirement-manual.2025-09-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-link-original-form",
      label: "Formulario histórico del Modelo 037 en el BOE",
      sourceId: "boe.model-037.original-form-pdf.2007-05-10",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-link-approval-order",
      label: "Orden EHA/1274/2007",
      sourceId: ORDER_EHA_1274_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-link-suppression-order",
      label: "Orden HAC/1526/2024",
      sourceId: ORDER_HAC_1526_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-037-faq-identity",
      question: "¿Qué era el Modelo 037?",
      answer:
        "Era una declaración censal simplificada de alta, modificación y baja en el Censo de empresarios, profesionales y retenedores.",
      sourceIds: [ORDER_EHA_1274_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-faq-current-status",
      question: "¿El Modelo 037 continúa vigente?",
      answer:
        "No. La Orden HAC/1526/2024 lo suprimió y la AEAT recoge expresamente ese cambio en su información oficial.",
      sourceIds: [
        "aeat.model-037.retirement-manual.2025-09-29",
        ORDER_HAC_1526_2024_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-faq-effective-date",
      question: "¿Desde qué fecha tiene efectos su supresión?",
      answer:
        "La norma establece que la supresión tiene efectos desde el 3 de febrero de 2025.",
      sourceIds: [ORDER_HAC_1526_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-faq-original-form",
      question: "¿Se conserva el formulario original?",
      answer:
        "Sí. La publicación original de la Orden EHA/1274/2007 incluye el formulario histórico en el Anexo II.",
      sourceIds: [
        ORDER_EHA_1274_2007_SOURCE.id,
        "boe.model-037.original-form-pdf.2007-05-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-faq-form-preview",
      question: "¿Qué representa la miniatura de esta ficha?",
      answer:
        "Es una vista previa derivada de la página del formulario dentro del PDF oficial del BOE; se muestra únicamente como documento histórico.",
      sourceIds: ["boe.model-037.original-form-pdf.2007-05-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-faq-historical-access",
      question: "¿Por qué se menciona un canal electrónico?",
      answer:
        "Porque la referencia oficial conservada permite documentar que existió ese canal. La ficha lo marca como histórico y no como una vía disponible en la actualidad.",
      sourceIds: [
        "aeat.model-037.historical-presentation-reference.2025-10-10",
        "aeat.model-037.retirement-manual.2025-09-29",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-037-faq-historical-meaning",
      question: "¿Qué significa que esta ficha sea histórica?",
      answer:
        "Significa que documenta la identidad, la publicación original y la supresión del modelo, sin tratarlo como un trámite vigente ni inferir otro modelo aplicable.",
      sourceIds: [ORDER_EHA_1274_2007_SOURCE.id, ORDER_HAC_1526_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED_HISTORICAL",
    sourceIds: [
      "aeat.model-037.historical-presentation-reference.2025-10-10",
      "aeat.model-037.retirement-manual.2025-09-29",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"037">;

const MODEL_198_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_RELEASE_ID_V1,
  code: "198",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Declaración anual de operaciones con activos financieros y otros valores mobiliarios.",
  summary:
    "Declaración informativa anual que la AEAT identifica con las operaciones sobre activos financieros y otros valores mobiliarios descritas en su denominación oficial.",
  searchTerms: [
    "modelo 198",
    "declaración informativa anual",
    "operaciones con activos financieros",
    "otros valores mobiliarios",
    "formulario web modelo 198",
    "fichero modelo 198",
    "TGVI modelo 198",
    "diseño de registro 198",
    "intermediarios financieros",
    "desaparición del PTI",
    "operaciones financieras",
    "Orden EHA 3895 2004",
    "Orden HAC 1504 2024",
  ],
  sections: [
    {
      id: "model-198-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-198-purpose-identity",
          heading: "Operaciones con activos financieros y valores mobiliarios",
          text: "El índice general y las páginas propias del procedimiento de la AEAT identifican el Modelo 198 como una declaración informativa anual de operaciones con activos financieros y otros valores mobiliarios.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-198.procedure-home.2026-07-08",
            "aeat.model-198.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-198-purpose-record",
          heading: "Ficha administrativa del procedimiento",
          text: "La ficha administrativa conserva la denominación anual y describe el procedimiento con referencia a las operaciones que figuran en el título oficial. Esta información no determina su aplicación a una persona o entidad concreta.",
          sourceIds: ["aeat.model-198.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-198-access",
      title: "Canales y material técnico descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-198-access-channels",
          heading: "Formulario web y fichero",
          text: "La ayuda técnica oficial mantiene páginas diferenciadas para un formulario web y para un canal mediante fichero. Aquí solo se registra la existencia de ambos métodos, sin abrir ni ejecutar ninguna gestión.",
          sourceIds: [
            "aeat.model-198.browser-form-help.2026-06-19",
            "aeat.model-198.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-198-access-register-design",
          heading: "Diseño de registro del ejercicio 2024",
          text: "El catálogo técnico de la AEAT enlaza un diseño de registro del Modelo 198 rotulado para el ejercicio 2024. El PDF se conserva como documentación técnica externa, no como formulario.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-198.register-design-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-198-details",
      title: "Notas oficiales y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-198-details-notes",
          heading: "Notas informativas específicas",
          text: "La AEAT publica una nota sobre intermediarios financieros tras la desaparición del PTI y otra sobre determinadas operaciones financieras. Se conservan como guías oficiales externas y no como instrucciones personalizadas.",
          sourceIds: [
            "aeat.model-198.pti-note-pdf.2026-07-13",
            "aeat.model-198.financial-operations-note-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-198-details-laws",
          heading: "Aprobación y modificación normativa registradas",
          text: "La trazabilidad normativa incluye la Orden EHA/3895/2004, vinculada a la aprobación del Modelo 198, y la Orden HAC/1504/2024, que modifica su regulación.",
          sourceIds: [
            ORDER_EHA_3895_2004_SOURCE.id,
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
      id: "aeat.model-198.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 198 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI17.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5d39ddae64cb21b56a2bdfe1e907f9b25d126f96d62dc22b5a2d033f46619e91",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-198.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 198",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI17.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "101d3e97a7edab906a8c144f43d7ec632832700f7d32baa8eeb551cd7c386d00",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-198.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 198 · ayuda técnica del formulario web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-198-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a21a2e59b9e62ce8ef8d7edf22c2238df21e9c4e9931856196b2e6be7accabaa",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-198.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 198 · ayuda técnica del canal mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-198-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d58c238bba50e563b18108a75e72864f9b984bca77f1b2bbf953e45255f3b099",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-198.register-design-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 198 · diseño de registro · ejercicio 2024",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_198_2024.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a32ec46a0d28cac538e8cebbb654f6b77a41fdc46a669d6581d694d68dee4e36",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-198.pti-note-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title:
        "Modelo 198 · nota sobre intermediarios financieros tras la desaparición del PTI",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Declaraciones_informativas/2025/Nota_presentacion_modelo_198.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "32ec9f27cbc729b4665280a9590d07532725a6a5c3ca077034b11beb5f17e2d6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-198.financial-operations-note-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 198 · nota sobre determinadas operaciones financieras",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI17/Nota_informativa_mod_198.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "31e553711a17d369ddf3ea6b2118c0e83f2fdb07e7c8dd366d32d54457229825",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_EHA_3895_2004_SOURCE,
    ORDER_HAC_1504_2024_SOURCE,
  ],
  documents: [
    {
      id: "model-198-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 198 · ejercicio 2024",
      sourceId: "aeat.model-198.register-design-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_198_2024.pdf",
      byteLength: 204770,
      pageCount: 34,
      sha256:
        "a32ec46a0d28cac538e8cebbb654f6b77a41fdc46a669d6581d694d68dee4e36",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-198-pti-note-document",
      kind: "GUIDE",
      title:
        "Nota sobre intermediarios financieros tras la desaparición del PTI",
      sourceId: "aeat.model-198.pti-note-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-198.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "Nota_presentacion_modelo_198.pdf",
      byteLength: 184312,
      pageCount: 5,
      sha256:
        "32ec9f27cbc729b4665280a9590d07532725a6a5c3ca077034b11beb5f17e2d6",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-198-financial-operations-note-document",
      kind: "GUIDE",
      title: "Nota sobre determinadas operaciones financieras",
      sourceId: "aeat.model-198.financial-operations-note-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-198.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "Nota_informativa_mod_198.pdf",
      byteLength: 225834,
      pageCount: 9,
      sha256:
        "31e553711a17d369ddf3ea6b2118c0e83f2fdb07e7c8dd366d32d54457229825",
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
      id: "model-198-link-procedure",
      label: "Página oficial del Modelo 198",
      sourceId: "aeat.model-198.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-record",
      label: "Ficha del procedimiento del Modelo 198",
      sourceId: "aeat.model-198.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-browser-help",
      label: "Ayuda técnica oficial del formulario web",
      sourceId: "aeat.model-198.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-file-help",
      label: "Ayuda técnica oficial del canal mediante fichero",
      sourceId: "aeat.model-198.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-register-design",
      label: "Diseño de registro oficial del Modelo 198",
      sourceId: "aeat.model-198.register-design-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-pti-note",
      label: "Nota oficial sobre intermediarios financieros y PTI",
      sourceId: "aeat.model-198.pti-note-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-operations-note",
      label: "Nota oficial sobre determinadas operaciones financieras",
      sourceId: "aeat.model-198.financial-operations-note-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-approval-order",
      label: "Orden EHA/3895/2004",
      sourceId: ORDER_EHA_3895_2004_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-link-amendment-order",
      label: "Orden HAC/1504/2024",
      sourceId: ORDER_HAC_1504_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-198-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 198?",
      answer:
        "Lo identifica como una declaración informativa anual de operaciones con activos financieros y otros valores mobiliarios.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-198.procedure-home.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-record",
      question: "¿Qué aporta la ficha administrativa?",
      answer:
        "Conserva la denominación anual y el objeto general del procedimiento con referencia a las operaciones que figuran en el título oficial.",
      sourceIds: ["aeat.model-198.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-channels",
      question: "¿Qué canales técnicos describe la AEAT?",
      answer:
        "La ayuda técnica mantiene páginas separadas para un formulario web y para un canal mediante fichero.",
      sourceIds: [
        "aeat.model-198.browser-form-help.2026-06-19",
        "aeat.model-198.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-register-design",
      question: "¿Qué diseño de registro se conserva?",
      answer:
        "Se conserva el diseño de registro rotulado para el ejercicio 2024, un PDF de treinta y cuatro páginas sin AcroForm ni JavaScript detectados.",
      sourceIds: ["aeat.model-198.register-design-pdf.2026-07-13"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-pti-note",
      question: "¿Qué documenta la nota relativa al PTI?",
      answer:
        "Es una nota oficial sobre intermediarios financieros tras la desaparición del PTI, conservada como guía externa del Modelo 198.",
      sourceIds: ["aeat.model-198.pti-note-pdf.2026-07-13"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-financial-note",
      question: "¿Existe otra nota sobre operaciones financieras?",
      answer:
        "Sí. La página oficial enlaza una nota informativa independiente sobre determinadas operaciones financieras.",
      sourceIds: [
        "aeat.model-198.procedure-home.2026-07-08",
        "aeat.model-198.financial-operations-note-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-approval",
      question: "¿Qué norma se vincula con la aprobación del Modelo 198?",
      answer:
        "La trazabilidad oficial registra la Orden EHA/3895/2004, de 23 de noviembre.",
      sourceIds: [ORDER_EHA_3895_2004_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-198-faq-amendment",
      question: "¿Qué modificación posterior se documenta?",
      answer:
        "La Orden HAC/1504/2024 modifica la regulación vinculada al Modelo 198.",
      sourceIds: [ORDER_HAC_1504_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-198.browser-form-help.2026-06-19",
      "aeat.model-198.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"198">;

const MODEL_199_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_RELEASE_ID_V1,
  code: "199",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa anual de identificación de las operaciones con cheques de las Entidades de Crédito.",
  summary:
    "Declaración informativa anual que la AEAT identifica con las operaciones con cheques de las entidades de crédito. La ficha administrativa describe como objeto facilitar a dichas entidades la aportación de esa información.",
  searchTerms: [
    "modelo 199",
    "declaración informativa anual",
    "operaciones con cheques",
    "entidades de crédito",
    "identificación de operaciones",
    "fichero modelo 199",
    "diseño de registro 199",
    "diseño de registro 2025",
    "Orden 21 diciembre 2001",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-199-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-199-purpose-identity",
          heading: "Operaciones con cheques de entidades de crédito",
          text: "El índice general y las páginas propias de la AEAT identifican el Modelo 199 como una declaración informativa anual de identificación de las operaciones con cheques de las entidades de crédito.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-199.procedure-home.2026-03-01",
            "aeat.model-199.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-199-purpose-record",
          heading: "Objeto descrito por la ficha administrativa",
          text: "La ficha administrativa señala como objeto facilitar a las entidades de crédito la declaración informativa anual de identificación de esas operaciones. Esta referencia no determina su aplicación a una entidad concreta.",
          sourceIds: ["aeat.model-199.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-199-access",
      title: "Canal y documentación técnica descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-199-access-file",
          heading: "Canal mediante fichero",
          text: "La ayuda técnica oficial del Modelo 199 describe un canal mediante fichero. Aquí solo se registra la existencia de ese método informativo, sin abrir ni ejecutar ninguna gestión.",
          sourceIds: ["aeat.model-199.file-upload-help.2026-04-22"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-199-access-register-design",
          heading: "Diseño de registro del ejercicio 2025",
          text: "El catálogo técnico de la AEAT enlaza un diseño de registro del Modelo 199 rotulado para el ejercicio 2025. El PDF se conserva como documentación técnica externa, no como formulario.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-199.register-design-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-199-details",
      title: "Trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-199-details-approval",
          heading: "Norma de aprobación registrada",
          text: "La Orden de 21 de diciembre de 2001 aprueba el Modelo 199 y su diseño correspondiente.",
          sourceIds: [ORDER_2001_12_21_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-199-details-amendment",
          heading: "Modificación publicada en 2025",
          text: "La Orden HAC/1430/2025 modifica la orden de aprobación del Modelo 199 y figura como referencia normativa oficial del procedimiento.",
          sourceIds: [
            "aeat.model-199.procedure-home.2026-03-01",
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
      id: "aeat.model-199.procedure-home.2026-03-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 199 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI18.shtml",
      officialUpdatedOn: "2026-03-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0bf0d024fa042c9f1a73988fc0a4221d7371d0a6216122b5b4cdcc2d807ede81",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-199.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 199",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI18.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fcf83263e3c16bee43959223eddbcb546bbb50f13152dc4aa791f70d459c71d9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-199.file-upload-help.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 199 · ayuda técnica del canal mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-199.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "44228e303966f796eb0bf94fbabd0a36b6f1506ca13c8f80d533c9f655f579b7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-199.register-design-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 199 · diseño de registro · ejercicio 2025",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_199_2025.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bfe3878e4bbd9eff50665bb7c27b17132c50fa3b33ee86784badc64492014f50",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_2001_12_21_SOURCE,
    ORDER_HAC_1430_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-199-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 199 · ejercicio 2025",
      sourceId: "aeat.model-199.register-design-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_199_2025.pdf",
      byteLength: 229485,
      pageCount: 12,
      sha256:
        "bfe3878e4bbd9eff50665bb7c27b17132c50fa3b33ee86784badc64492014f50",
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
      id: "model-199-link-procedure",
      label: "Página oficial del Modelo 199",
      sourceId: "aeat.model-199.procedure-home.2026-03-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-link-record",
      label: "Ficha del procedimiento del Modelo 199",
      sourceId: "aeat.model-199.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-link-help",
      label: "Ayuda técnica oficial del Modelo 199",
      sourceId: "aeat.model-199.file-upload-help.2026-04-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-link-register-design",
      label: "Diseño de registro oficial del Modelo 199",
      sourceId: "aeat.model-199.register-design-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-link-approval-order",
      label: "Orden de 21 de diciembre de 2001",
      sourceId: ORDER_2001_12_21_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-link-amendment-order",
      label: "Orden HAC/1430/2025",
      sourceId: ORDER_HAC_1430_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-199-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 199?",
      answer:
        "Lo identifica como una declaración informativa anual de identificación de las operaciones con cheques de las entidades de crédito.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-199.procedure-home.2026-03-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-faq-object",
      question: "¿Qué objeto describe la ficha administrativa?",
      answer:
        "Describe como objeto facilitar a las entidades de crédito la declaración informativa anual de identificación de esas operaciones.",
      sourceIds: ["aeat.model-199.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-faq-channel",
      question: "¿Qué canal técnico describe la AEAT?",
      answer:
        "La ayuda técnica oficial describe un canal mediante fichero para el Modelo 199.",
      sourceIds: ["aeat.model-199.file-upload-help.2026-04-22"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-faq-register-design",
      question: "¿Qué diseño de registro se conserva?",
      answer:
        "Se conserva el diseño de registro rotulado para el ejercicio 2025, un PDF de doce páginas sin AcroForm ni JavaScript detectados.",
      sourceIds: ["aeat.model-199.register-design-pdf.2026-07-13"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-faq-register-purpose",
      question: "¿El diseño de registro es un formulario?",
      answer:
        "No. Se registra como documentación técnica externa y no como formulario del Modelo 199.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-199.register-design-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-faq-approval",
      question: "¿Qué norma aprueba el Modelo 199?",
      answer:
        "La Orden de 21 de diciembre de 2001 aprueba el Modelo 199 y su diseño correspondiente.",
      sourceIds: [ORDER_2001_12_21_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-199-faq-amendment",
      question: "¿Qué modificación posterior se documenta?",
      answer:
        "La Orden HAC/1430/2025 modifica la orden de aprobación del Modelo 199.",
      sourceIds: [ORDER_HAC_1430_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: ["aeat.model-199.file-upload-help.2026-04-22"],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"199">;

export const PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_CONTENT_V1 = deepFreeze([
  MODEL_037_CONTENT,
  MODEL_198_CONTENT,
  MODEL_199_CONTENT,
] as const);
