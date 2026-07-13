import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_RELEASE_ID_V1 =
  "public-aeat-official-batch-06-declarations-186-189.2026-07-13.v1" as const;

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

const ORDER_HFP_1284_2023_SOURCE = {
  id: "boe.models-188-189.order-hfp-1284-2023",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1284/2023, de 28 de noviembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2023-24412",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b8a35e343665a22a765c6b2553553347d8f0526680e24cd6c6376c81f967a616",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_186_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_RELEASE_ID_V1,
  code: "186",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Suministro de información relativa a nacimientos y defunciones.",
  summary:
    "Suministro informativo que la AEAT identifica con determinados datos de nacimientos y defunciones procedentes del Registro Civil.",
  searchTerms: [
    "modelo 186",
    "declaración informativa",
    "nacimientos",
    "defunciones",
    "Registro Civil",
    "Registros Civiles",
    "Ministerio de Justicia",
    "deducción por maternidad",
    "teleproceso",
    "transferencia administrativa",
    "Orden HAC 539 2003",
  ],
  sections: [
    {
      id: "model-186-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-186-purpose-identity",
          heading: "Información sobre nacimientos y defunciones",
          text: "El índice general y las páginas del procedimiento de la AEAT identifican el Modelo 186 con el suministro de información relativa a nacimientos y defunciones.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-186.procedure-home.2025-12-12",
            "aeat.model-186.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-186-scope",
      title: "Ámbito descrito por la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-186-scope-records",
          heading: "Datos obrantes en el Registro Civil",
          text: "La ficha administrativa describe una declaración mensual relacionada con inscripciones de nacimientos y defunciones en el Registro Civil y con la gestión de la deducción por maternidad y, en su caso, de su abono mensual anticipado. Esta ficha no evalúa su aplicación a una persona concreta.",
          sourceIds: ["aeat.model-186.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-186-access",
      title: "Canal administrativo descrito",
      kind: "ACCESS",
      items: [
        {
          id: "model-186-access-administrative-transfer",
          heading: "Suministro entre organismos",
          text: "La AEAT indica que las características de esta declaración no permiten trámites públicos por vía electrónica. La ficha administrativa atribuye el suministro a los Registros Civiles a través de la Dirección General de los Registros y del Notariado del Ministerio de Justicia y menciona soporte y teleproceso.",
          sourceIds: [
            "aeat.model-186.procedure-home.2025-12-12",
            "aeat.model-186.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-186-details",
      title: "Normativa oficial registrada",
      kind: "DETAILS",
      items: [
        {
          id: "model-186-details-order",
          heading: "Orden HAC/539/2003",
          text: "La página del modelo y la ficha del procedimiento enlazan la Orden HAC/539/2003, que aprobó los diseños físicos y lógicos del Modelo 186 y reguló su suministro mediante soporte y teleproceso.",
          sourceIds: [
            "aeat.model-186.procedure-home.2025-12-12",
            "boe.model-186.order-hac-539-2003",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-186.procedure-home.2025-12-12",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 186 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI06.shtml",
      officialUpdatedOn: "2025-12-12",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ab1e7013dce6feaf8f33f9607892995fcdd02116d7b2339c158646027a70f6ae",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-186.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 186",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI06.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "445264fb7ef4907dcb9d735f5e260b86aa795c85ee460ef976a3cad86bf4419f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-186.order-hac-539-2003",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/539/2003, de 10 de marzo",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-5304",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "693a74fff22dc7e225c9b1a01e2c6fc0b2bfd5b06793500c312585989256c133",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  accessMethods: {
    methods: ["ADMINISTRATIVE_TRANSFER"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-186.procedure-home.2025-12-12",
      "aeat.model-186.procedure-record.2026-07-08",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-186-link-procedure",
      label: "Página oficial del Modelo 186",
      sourceId: "aeat.model-186.procedure-home.2025-12-12",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-186-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-186.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-186-link-order",
      label: "Orden HAC/539/2003",
      sourceId: "boe.model-186.order-hac-539-2003",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-186-faq-identity",
      question: "¿Qué información identifica la AEAT con el Modelo 186?",
      answer:
        "El suministro de información relativa a nacimientos y defunciones procedente del Registro Civil.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-186-faq-purpose",
      question: "¿Qué finalidad administrativa describe la ficha oficial?",
      answer:
        "La adecuada gestión por la AEAT de la deducción por maternidad y, en su caso, de su abono mensual anticipado.",
      sourceIds: ["aeat.model-186.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-186-faq-supplier",
      question: "¿Quién suministra la información del Modelo 186?",
      answer:
        "La ficha administrativa indica que lo hacen los Registros Civiles a través de la Dirección General de los Registros y del Notariado del Ministerio de Justicia.",
      sourceIds: ["aeat.model-186.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-186-faq-public-electronic",
      question: "¿Existe un trámite electrónico público del Modelo 186?",
      answer:
        "La página oficial indica expresamente que las características específicas de la declaración no permiten realizar trámites por vía electrónica.",
      sourceIds: ["aeat.model-186.procedure-home.2025-12-12"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-186-faq-regulation",
      question: "¿Qué norma oficial regula el diseño del Modelo 186?",
      answer:
        "La Orden HAC/539/2003, de 10 de marzo, aprobó sus diseños físicos y lógicos y el procedimiento de suministro por soporte y teleproceso.",
      sourceIds: ["boe.model-186.order-hac-539-2003"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"186">;

const MODEL_187_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_RELEASE_ID_V1,
  code: "187",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Acciones y participaciones representativas del capital o del patrimonio de las instituciones de inversión colectiva y resumen anual de retenciones e ingresos a cuenta de IRPF, IS e IRNR en relación con rentas o ganancias patrimoniales obtenidas como consecuencia de transmisiones o reembolsos de esas acciones y participaciones y derechos de suscripción.",
  summary:
    "Declaración informativa y resumen anual que la AEAT relaciona con acciones y participaciones de instituciones de inversión colectiva, sus transmisiones o reembolsos y los derechos de suscripción.",
  searchTerms: [
    "modelo 187",
    "declaración informativa",
    "instituciones de inversión colectiva",
    "acciones",
    "participaciones",
    "transmisiones",
    "reembolsos",
    "derechos de suscripción",
    "retenciones",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR",
    "formulario web",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 187",
    "Orden HAP 1608 2014",
    "Orden HFP 823 2022",
  ],
  sections: [
    {
      id: "model-187-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-187-purpose-identity",
          heading: "Acciones, participaciones y derechos de suscripción",
          text: "El índice, la página principal y la ficha administrativa de la AEAT identifican el Modelo 187 con acciones y participaciones de instituciones de inversión colectiva y con el resumen anual de retenciones e ingresos a cuenta asociado a transmisiones, reembolsos y derechos de suscripción.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-187.procedure-home.2026-07-08",
            "aeat.model-187.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-187-scope",
      title: "Ámbito descrito por la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-187-scope-iic",
          heading: "Operaciones sobre instituciones de inversión colectiva",
          text: "La ficha del procedimiento resume su objeto mediante operaciones de adquisición y enajenación de acciones y participaciones representativas del capital o patrimonio de instituciones de inversión colectiva. La denominación oficial añade transmisiones, reembolsos y derechos de suscripción.",
          sourceIds: [
            "aeat.model-187.procedure-record.2026-07-08",
            "aeat.model-187.procedure-home.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-187-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-187-access-browser",
          heading: "Formulario web",
          text: "La AEAT publica una ayuda técnica específica para la presentación mediante formulario del Modelo 187. Esta ficha identifica el canal sin reproducir su cumplimentación ni iniciar el trámite.",
          sourceIds: ["aeat.model-187.browser-form-help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-187-access-file",
          heading: "Carga de fichero",
          text: "La AEAT publica por separado el canal de carga de un fichero ajustado al diseño de registro mediante su entorno TGVI online.",
          sourceIds: [
            "aeat.model-187.procedure-home.2026-07-08",
            "aeat.model-187.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-187-details",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-187-details-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico de la AEAT enlaza un PDF de treinta y una páginas para el Modelo 187, actualizado en su rótulo por la Orden HFP/823/2022. Se conserva como diseño de registro y no como formulario visual.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-187.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-187-details-laws",
          heading: "Aprobación y actualización registradas",
          text: "La ficha registra la Orden HAP/1608/2014, que aprobó el modelo, y la Orden HFP/823/2022, que modificó esa regulación.",
          sourceIds: [
            "boe.model-187.order-hap-1608-2014",
            "boe.model-187.order-hfp-823-2022",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-187.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 187 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI07.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "dedd5aa89283310726f4917bcc5708f0d098f14667cba6f9175381e26b4f0158",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-187.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 187",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI07.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2cd2c3fc93f76e951d1533cbb8c1a528fe70370f1a8ca600d0a122a8bad3aa5b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-187.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 187 · presentación mediante formulario",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-187-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a7b8289413441ae0e007b187ade3cef7ac4ca68698d7eac79b4bcf7c9b353d05",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-187.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 187 · presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-187-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ffdf2add1246d8705de2544457b1b73eef0073805e2af956b4111954e9744b03",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-187.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 187 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_187_2022.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c7a21c1feb9619380bb0da3e73066fa3c58c628f430bf85ed9dbea15b1308eb1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-187.order-hap-1608-2014",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/1608/2014, de 4 de septiembre",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2014-9225",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5bbc1e846f9be357634e606b77b991d3873b1be21104d40c10428fcb865b82e7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-187.order-hfp-823-2022",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/823/2022, de 24 de agosto",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2022-14168",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "99dbf2d8a77264ec8de9fa74c71f9306cfceb26bbc6a520855885dac7149414a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-187-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 187",
      sourceId: "aeat.model-187.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_187_2022.pdf",
      byteLength: 345403,
      pageCount: 31,
      sha256:
        "c7a21c1feb9619380bb0da3e73066fa3c58c628f430bf85ed9dbea15b1308eb1",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-187.browser-form-help.2026-06-19",
      "aeat.model-187.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-187-link-procedure",
      label: "Página oficial del Modelo 187",
      sourceId: "aeat.model-187.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-187.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-187.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-link-file-help",
      label: "Ayuda oficial de la carga de fichero",
      sourceId: "aeat.model-187.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-187.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-link-approval",
      label: "Orden HAP/1608/2014",
      sourceId: "boe.model-187.order-hap-1608-2014",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-link-update",
      label: "Orden HFP/823/2022",
      sourceId: "boe.model-187.order-hfp-823-2022",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-187-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 187?",
      answer:
        "Una declaración informativa sobre acciones y participaciones de instituciones de inversión colectiva y un resumen anual de retenciones e ingresos a cuenta vinculado a sus transmisiones o reembolsos y a derechos de suscripción.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-faq-rights",
      question: "¿La denominación oficial incluye los derechos de suscripción?",
      answer:
        "Sí. La denominación actual publicada por la AEAT los menciona expresamente junto a las transmisiones y reembolsos de acciones y participaciones.",
      sourceIds: ["aeat.model-187.procedure-home.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-faq-channels",
      question: "¿Qué canales técnicos documenta la AEAT para el Modelo 187?",
      answer:
        "La AEAT publica ayudas separadas para un formulario web y para la carga de un fichero ajustado al diseño de registro.",
      sourceIds: [
        "aeat.model-187.browser-form-help.2026-06-19",
        "aeat.model-187.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-faq-design",
      question: "¿El PDF enlazado es un formulario visual del Modelo 187?",
      answer:
        "No. Es el diseño de registro técnico publicado por la AEAT y se conserva sin miniatura de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-187.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-187-faq-regulation",
      question:
        "¿Qué normas de aprobación y actualización registra esta ficha?",
      answer:
        "La Orden HAP/1608/2014 aprobó el Modelo 187 y la Orden HFP/823/2022 modificó posteriormente esa regulación.",
      sourceIds: [
        "boe.model-187.order-hap-1608-2014",
        "boe.model-187.order-hfp-823-2022",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"187">;

const MODEL_188_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_RELEASE_ID_V1,
  code: "188",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Retenciones e ingresos a cuenta. Rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguro de vida o invalidez. Resumen anual.",
  summary:
    "Resumen anual informativo que la AEAT relaciona con retenciones e ingresos a cuenta sobre rentas o rendimientos de operaciones de capitalización y contratos de seguro de vida o invalidez.",
  searchTerms: [
    "modelo 188",
    "declaración informativa",
    "retenciones",
    "ingresos a cuenta",
    "capital mobiliario",
    "operaciones de capitalización",
    "seguro de vida",
    "seguro de invalidez",
    "resumen anual",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR",
    "formulario web",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 188",
    "Orden de 17 de noviembre de 1999",
    "Orden HFP 1284 2023",
  ],
  sections: [
    {
      id: "model-188-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-188-purpose-identity",
          heading: "Retenciones sobre capitalización y seguros",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 188 con retenciones e ingresos a cuenta sobre rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguro de vida o invalidez.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-188.procedure-home.2026-07-08",
            "aeat.model-188.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-188-scope",
      title: "Ámbito descrito por la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-188-scope-taxes",
          heading: "Resumen anual en IRPF, IS e IRNR",
          text: "La ficha del procedimiento describe el resumen anual respecto del IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes. Esta ficha conserva esa descripción general sin evaluar sujetos ni supuestos concretos.",
          sourceIds: ["aeat.model-188.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-188-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-188-access-browser",
          heading: "Formulario web",
          text: "La AEAT publica una ayuda técnica específica para el formulario web del Modelo 188. Esta ficha identifica el canal sin reproducir su cumplimentación ni iniciar el trámite.",
          sourceIds: ["aeat.model-188.browser-form-help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-188-access-file",
          heading: "Carga de fichero",
          text: "La AEAT publica por separado el canal de carga de un fichero ajustado al diseño de registro mediante su entorno TGVI online.",
          sourceIds: [
            "aeat.model-188.procedure-home.2026-07-08",
            "aeat.model-188.file-upload-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-188-details",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-188-details-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico de la AEAT enlaza un PDF de dieciocho páginas para el Modelo 188 y lo identifica como actualizado por la Orden HFP/1284/2023. Se conserva como diseño de registro, no como formulario visual.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-188.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-188-details-laws",
          heading: "Aprobación y actualización registradas",
          text: "La ficha conserva la Orden de 17 de noviembre de 1999, que aprobó los modelos 188, y la Orden HFP/1284/2023, que modificó sus diseños de registro.",
          sourceIds: [
            "boe.model-188.order-1999-11-17",
            ORDER_HFP_1284_2023_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-188.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 188 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI08.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bc77789a4932178287bbb3ae4c6a4072cf38ad9de0bfc91c371969f446016a84",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-188.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 188",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI08.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d564e8a36091b8093af22b289c8ae3c768b19eee192f77230cdd00c5574a4383",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-188.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 188 · presentación mediante formulario",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-188-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "13dd48098eed2dd16ccb5e0571b38a8811a4c55b2b4949b881d82a25bd6bc566",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-188.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 188 · presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-188-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9279cd96da96f1d8ab614aaf558e8e48509086749eef4eaae041c53de6673055",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-188.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 188 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_23/DR_Mod_188_2023.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "30ced236b558de21383c3eba6339cb720fc9a704d38eaa574dd9be55cf90f9e3",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-188.order-1999-11-17",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden de 17 de noviembre de 1999",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-1999-22372",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "260e404f29946e96e317b31ea9bdce840f80a3ca71ad228e9de6aeaf04c8e8a7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HFP_1284_2023_SOURCE,
  ],
  documents: [
    {
      id: "model-188-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 188",
      sourceId: "aeat.model-188.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Mod_188_2023.pdf",
      byteLength: 106418,
      pageCount: 18,
      sha256:
        "30ced236b558de21383c3eba6339cb720fc9a704d38eaa574dd9be55cf90f9e3",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-188.browser-form-help.2026-06-19",
      "aeat.model-188.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-188-link-procedure",
      label: "Página oficial del Modelo 188",
      sourceId: "aeat.model-188.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-188.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-188.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-link-file-help",
      label: "Ayuda oficial de la carga de fichero",
      sourceId: "aeat.model-188.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-188.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-link-approval",
      label: "Orden de 17 de noviembre de 1999",
      sourceId: "boe.model-188.order-1999-11-17",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-link-update",
      label: "Orden HFP/1284/2023",
      sourceId: ORDER_HFP_1284_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-188-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 188?",
      answer:
        "Un resumen anual informativo de retenciones e ingresos a cuenta sobre rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguro de vida o invalidez.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-faq-taxes",
      question: "¿Qué impuestos menciona la ficha oficial del procedimiento?",
      answer:
        "La ficha cita el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
      sourceIds: ["aeat.model-188.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-faq-channels",
      question: "¿Qué canales técnicos documenta la AEAT para el Modelo 188?",
      answer:
        "La AEAT publica ayudas separadas para un formulario web y para la carga de un fichero ajustado al diseño de registro.",
      sourceIds: [
        "aeat.model-188.browser-form-help.2026-06-19",
        "aeat.model-188.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-faq-design",
      question: "¿El PDF enlazado es un formulario visual del Modelo 188?",
      answer:
        "No. Es un diseño de registro técnico de dieciocho páginas publicado por la AEAT y se conserva sin miniatura de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-188.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-188-faq-regulation",
      question:
        "¿Qué normas de aprobación y actualización registra esta ficha?",
      answer:
        "La Orden de 17 de noviembre de 1999 aprobó los modelos 188 y la Orden HFP/1284/2023 modificó posteriormente sus diseños de registro.",
      sourceIds: [
        "boe.model-188.order-1999-11-17",
        ORDER_HFP_1284_2023_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"188">;

const MODEL_189_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_RELEASE_ID_V1,
  code: "189",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Valores, seguros y rentas. Declaración anual.",
  summary:
    "Declaración informativa anual que la AEAT identifica con valores, seguros y rentas.",
  searchTerms: [
    "modelo 189",
    "declaración informativa",
    "valores",
    "seguros",
    "rentas",
    "declaración anual",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 189",
    "Orden EHA 3481 2008",
    "Orden HFP 1284 2023",
    "Orden HAC 132 2026",
    "valores negociados",
  ],
  sections: [
    {
      id: "model-189-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-189-purpose-identity",
          heading: "Valores, seguros y rentas",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 189 como la declaración informativa anual de valores, seguros y rentas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-189.procedure-home.2026-07-08",
            "aeat.model-189.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-189-scope",
      title: "Ámbito descrito por la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-189-scope-annual",
          heading: "Información anual",
          text: "La ficha del procedimiento define su objeto como facilitar la declaración informativa anual de valores, seguros y rentas. Esta ficha conserva esa descripción general sin evaluar casos concretos.",
          sourceIds: ["aeat.model-189.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-189-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-189-access-file",
          heading: "Carga de fichero mediante TGVI online",
          text: "La página principal enlaza la presentación del Modelo 189 mediante el entorno TGVI online y la ayuda técnica describe un fichero ajustado al diseño de registro. No se registra un formulario web separado para este modelo.",
          sourceIds: [
            "aeat.model-189.procedure-home.2026-07-08",
            "aeat.model-189.file-upload-help.2026-03-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-189-details",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-189-details-register-design",
          heading: "Diseño de registro técnico",
          text: "El índice técnico de la AEAT enlaza un PDF de dieciocho páginas para el Modelo 189 y lo identifica como actualizado por la Orden HFP/1284/2023. Se conserva como diseño de registro, no como formulario visual.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-189.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-189-details-laws",
          heading: "Aprobación y actualización registradas",
          text: "La ficha conserva la Orden EHA/3481/2008, que aprobó el Modelo 189, y la Orden HFP/1284/2023, que modificó sus diseños de registro.",
          sourceIds: [
            "boe.model-189.order-eha-3481-2008",
            ORDER_HFP_1284_2023_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-189-details-2026-values",
          heading: "Aviso oficial sobre valores de 2025",
          text: "La AEAT publica un aviso de la Orden HAC/132/2026 sobre la relación de valores negociados y su valor medio del cuarto trimestre de 2025 a efectos del Impuesto sobre el Patrimonio de 2025 y de esta declaración informativa anual.",
          sourceIds: [
            "aeat.model-189.order-hac-132-2026-notice.2026-07-08",
            "boe.model-189.order-hac-132-2026",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-189.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 189 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI09.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "00d24894a6ad1c9373519e13fa41cd7a225a827048cf6223f11a73ab520d8570",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-189.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 189",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI09.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0b195e08e813306eacba1e6036657ff5b2b4aaa5376343e4e22fbbde75023a6a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-189.file-upload-help.2026-03-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 189 · presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-181-189/modelo-189.html",
      officialUpdatedOn: "2026-03-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "07188844b5edeecfb4dd42734f29204758d9fa4b231488bcbe0597aa473b8da6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-189.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 189 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_23/DR_Mod_189_2023.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c493f8d9d927f28211336324cbe17ab7bae7b256d3c563273e01a76834757d6a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-189.order-hac-132-2026-notice.2026-07-08",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Aviso de la Orden HAC/132/2026 para el Modelo 189",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-189-decla_____iva-valores-seguros-anual_/aviso-novedad-hac1322026-24-febrero.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bdcdabaf4702e601f0086e8d51171f530d8ef118d08a9b74320e4680543dcf2e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-189.order-eha-3481-2008",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/3481/2008, de 1 de diciembre",
      canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2008-19523",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "59be9c6f61991584a99483d0c304cca5b490d10e17f43ca50bc2bc8254ec0cb1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HFP_1284_2023_SOURCE,
    {
      id: "boe.model-189.order-hac-132-2026",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/132/2026, de 24 de febrero",
      canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2026-4521",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a9f0e680d8a60437227ca839d8ba2736399ecbe1b6919944bf720fa77966e96d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-189-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 189",
      sourceId: "aeat.model-189.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Mod_189_2023.pdf",
      byteLength: 240141,
      pageCount: 18,
      sha256:
        "c493f8d9d927f28211336324cbe17ab7bae7b256d3c563273e01a76834757d6a",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-189.procedure-home.2026-07-08",
      "aeat.model-189.file-upload-help.2026-03-02",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-189-link-procedure",
      label: "Página oficial del Modelo 189",
      sourceId: "aeat.model-189.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-189.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-file-help",
      label: "Ayuda oficial de la carga de fichero",
      sourceId: "aeat.model-189.file-upload-help.2026-03-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-189.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-approval",
      label: "Orden EHA/3481/2008",
      sourceId: "boe.model-189.order-eha-3481-2008",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-design-update",
      label: "Orden HFP/1284/2023",
      sourceId: ORDER_HFP_1284_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-2026-notice",
      label: "Aviso AEAT de la Orden HAC/132/2026",
      sourceId: "aeat.model-189.order-hac-132-2026-notice.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-link-2026-order",
      label: "Orden HAC/132/2026",
      sourceId: "boe.model-189.order-hac-132-2026",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-189-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 189?",
      answer: "La declaración informativa anual de valores, seguros y rentas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-faq-channel",
      question: "¿Qué canal técnico publica la AEAT para el Modelo 189?",
      answer:
        "La página principal y la ayuda técnica describen una carga de fichero ajustado al diseño de registro mediante el entorno TGVI online.",
      sourceIds: [
        "aeat.model-189.procedure-home.2026-07-08",
        "aeat.model-189.file-upload-help.2026-03-02",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-faq-browser-form",
      question:
        "¿La AEAT publica un formulario web separado para el Modelo 189?",
      answer:
        "La página oficial consultada muestra la presentación mediante TGVI online y su ayuda asociada al fichero; no muestra un acceso separado de formulario web como los publicados para los modelos 187 y 188.",
      sourceIds: ["aeat.model-189.procedure-home.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-faq-design",
      question: "¿El PDF enlazado es un formulario visual del Modelo 189?",
      answer:
        "No. Es un diseño de registro técnico de dieciocho páginas publicado por la AEAT y se conserva sin miniatura de formulario.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-189.register-design.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-faq-regulation",
      question:
        "¿Qué normas de aprobación y actualización registra esta ficha?",
      answer:
        "La Orden EHA/3481/2008 aprobó el Modelo 189 y la Orden HFP/1284/2023 modificó posteriormente sus diseños de registro.",
      sourceIds: [
        "boe.model-189.order-eha-3481-2008",
        ORDER_HFP_1284_2023_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-189-faq-2026-values",
      question:
        "¿Qué información oficial de 2026 destaca la AEAT para el Modelo 189?",
      answer:
        "La AEAT destaca la Orden HAC/132/2026, relativa a la relación de valores negociados y su valor medio del cuarto trimestre de 2025 a efectos del Impuesto sobre el Patrimonio de 2025 y de esta declaración informativa anual.",
      sourceIds: [
        "aeat.model-189.order-hac-132-2026-notice.2026-07-08",
        "boe.model-189.order-hac-132-2026",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"189">;

export const PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_CONTENT_V1 = deepFreeze([
  MODEL_186_CONTENT,
  MODEL_187_CONTENT,
  MODEL_188_CONTENT,
  MODEL_189_CONTENT,
] as const);

export type PublicAeatBatch06Declarations186189CodeV1 =
  (typeof PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_CONTENT_V1)[number]["code"];
