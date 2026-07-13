import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const RELEASE_ID =
  "public-aeat-official-batch-05-property-information.2026-07-13.v1" as const;
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

const MODEL_179_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: RELEASE_ID,
  code: "179",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "HISTORICAL",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de la cesión de uso de viviendas con fines turísticos",
  summary:
    "Declaración informativa sobre la cesión de uso de viviendas con fines turísticos que la AEAT marca expresamente como no vigente para el ejercicio 2024 y siguientes.",
  searchTerms: [
    "modelo 179",
    "declaración informativa",
    "cesión de uso",
    "viviendas con fines turísticos",
    "viviendas turísticas",
    "alquiler turístico",
    "modelo histórico",
    "no vigente 2024",
    "modelo 238",
    "operadores de plataformas",
    "formulario web",
    "web service",
    "Orden HAC 612 2021",
    "Real Decreto 117 2024",
  ],
  sections: [
    {
      id: "model-179-purpose",
      title: "Identidad y situación oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-179-purpose-identity",
          heading: "Cesiones de viviendas con fines turísticos",
          text: "El índice y las páginas propias de la AEAT identifican el Modelo 179 como la declaración informativa anual de la cesión de uso de viviendas con fines turísticos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-179.procedure-home.2026-02-13",
            "aeat.model-179.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-179-purpose-historical",
          heading: "No vigente para 2024 y siguientes",
          text: "La AEAT indica expresamente que el Modelo 179 no está vigente para el ejercicio 2024 y siguientes. Se conserva aquí como ficha histórica y no como opción actual de presentación.",
          sourceIds: [
            "aeat.model-179.procedure-home.2026-02-13",
            "aeat.model-179.notice-2024-and-later.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-179-replacement-context",
      title: "Contexto desde el ejercicio 2024",
      kind: "SCOPE",
      items: [
        {
          id: "model-179-replacement-context-official-notice",
          heading: "Sustitución informativa descrita por la AEAT",
          text: "El aviso oficial explica que, en lo relativo a información sobre cesión y arrendamiento de bienes inmuebles, la obligación asociada al Modelo 179 queda sustituida por el Modelo 238. Esta ficha reproduce esa relación documental sin inferir a quién resulta aplicable el Modelo 238.",
          sourceIds: [
            "aeat.model-179.notice-2024-and-later.2026-07-08",
            "boe.real-decree-117-2024",
            "boe.order-hac-72-2024",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-179-replacement-context-faq",
          heading: "Preguntas frecuentes oficiales conservadas",
          text: "La AEAT mantiene una página de preguntas frecuentes del Modelo 179 que incorpora el aviso sobre su supresión desde 2024. Su contenido se conserva como referencia histórica, no como evaluación de un caso concreto.",
          sourceIds: ["aeat.model-179.faq.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-179-access",
      title: "Canales y materiales históricos",
      kind: "ACCESS",
      items: [
        {
          id: "model-179-access-methods",
          heading: "Formulario web y web service",
          text: "La página oficial conserva referencias a un formulario en navegador y a un cliente de web service para ejercicios anteriores. Ambos canales se describen únicamente como información histórica; esta aplicación no conecta con ellos.",
          sourceIds: [
            "aeat.model-179.procedure-home.2026-02-13",
            "aeat.model-179.presentation-help.2026-01-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-179-access-no-form-preview",
          heading: "Sin impreso estático para miniatura",
          text: "La página del modelo enlaza dos PDF técnicos históricos sobre validaciones y servicio web, pero no un impreso PDF estático de la declaración. Ambos documentos se registran como guías externas y ninguno se utiliza como miniatura.",
          sourceIds: [
            "aeat.model-179.procedure-home.2026-02-13",
            "aeat.model-179.validation-guide-pdf.2026-07-13",
            "aeat.model-179.web-service-guide-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-179.procedure-home.2026-02-13",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 179. Declaración informativa anual de la cesión de uso de viviendas con fines turísticos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI44.shtml",
      officialUpdatedOn: "2026-02-13",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fa6d8967361a246ceb38ca0b149697f7e90064d25657665bbfbf0b4c51ba909a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-179.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 179",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI44.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "209df319153f00005903923341c759a4a0272df9d8f344d5080d222470cd3dec",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-179.notice-2024-and-later.2026-07-08",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Modelo 179 · aviso para el ejercicio 2024 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-179-decla_____la-cesion-uso-turisticos/aviso-novedad-ejercicio-2024-siguientes.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "76e3845f962b20bec61cecf95c981f2d84f7925b85126854ac0fad6736701e48",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-179.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 179",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-179-decla_____la-cesion-uso-turisticos/preguntas-frecuentes.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5cd21c769884ccd1f9d81ca7601b5f87e57ea246dbd50e01e987c6488ebaa181",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-179.presentation-help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 179 · ayuda técnica de presentación",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-179-presentacion.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9014630b16629e96cd75cf48ca50283994f0bb8eb0c4bb94296d79a70bda9fe6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-179.validation-guide-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 179 · validaciones y errores de declaraciones informativas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI44/Ayuda/Mod179_Validaciones_errores_DDII.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9d9b927a190ccc1e643db8ab59457082dddbe27e50b97bd23a613f4991f511ac",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-179.web-service-guide-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 179 · descripción del servicio web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI44/Ayuda/Mod179_DDII_Descripcion_ServicioWeb.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b2f81340f6ef582032f0f57523be44ff25fb4d9f768a3934f1916a99abeda3f7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-612-2021",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/612/2021, de 16 de junio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2021-10163",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c4bf6fa270c03002303efeef3b5dfe2e3e3eff997e3820fb261df9211caeb7f4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.real-decree-117-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 117/2024, de 30 de enero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2024-1771",
      officialUpdatedOn: "2024-01-31",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fc7ba07539ff705af4fa48a86c2268d1ac5dfde8fb919a85c9a00d70eebc6d08",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-72-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/72/2024, de 1 de febrero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2024-2092",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1e25161257ebd6485c2a4353bcf56e8d20ef4a4dbfbfb5d152dff9b724044d58",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-179-validation-guide",
      kind: "GUIDE",
      title: "Guía técnica histórica de validaciones del Modelo 179",
      sourceId: "aeat.model-179.validation-guide-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-179.procedure-home.2026-02-13",
      mediaType: "application/pdf",
      fileName: "Mod179_Validaciones_errores_DDII.pdf",
      byteLength: 117264,
      pageCount: 13,
      sha256:
        "9d9b927a190ccc1e643db8ab59457082dddbe27e50b97bd23a613f4991f511ac",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-179-web-service-guide",
      kind: "GUIDE",
      title: "Guía técnica histórica del servicio web del Modelo 179",
      sourceId: "aeat.model-179.web-service-guide-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-179.procedure-home.2026-02-13",
      mediaType: "application/pdf",
      fileName: "Mod179_DDII_Descripcion_ServicioWeb.pdf",
      byteLength: 2078172,
      pageCount: 65,
      sha256:
        "b2f81340f6ef582032f0f57523be44ff25fb4d9f768a3934f1916a99abeda3f7",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  accessMethods: {
    methods: ["BROWSER_FORM", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED_HISTORICAL",
    sourceIds: [
      "aeat.model-179.procedure-home.2026-02-13",
      "aeat.model-179.presentation-help.2026-01-09",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-179-link-procedure",
      label: "Página oficial del Modelo 179",
      sourceId: "aeat.model-179.procedure-home.2026-02-13",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-link-notice",
      label: "Aviso oficial para 2024 y siguientes",
      sourceId: "aeat.model-179.notice-2024-and-later.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 179",
      sourceId: "aeat.model-179.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-link-validation-guide",
      label: "Guía técnica histórica de validaciones",
      sourceId: "aeat.model-179.validation-guide-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-link-web-service-guide",
      label: "Guía técnica histórica del servicio web",
      sourceId: "aeat.model-179.web-service-guide-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-link-law-2024",
      label: "Real Decreto 117/2024 en el BOE",
      sourceId: "boe.real-decree-117-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-179-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 179?",
      answer:
        "La AEAT lo denomina Declaración informativa anual de la cesión de uso de viviendas con fines turísticos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-179.procedure-home.2026-02-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-faq-current",
      question: "¿Está vigente el Modelo 179 para 2024 y ejercicios siguientes?",
      answer:
        "No. La AEAT señala expresamente que para el ejercicio 2024 y siguientes el Modelo 179 no está vigente.",
      sourceIds: [
        "aeat.model-179.procedure-home.2026-02-13",
        "aeat.model-179.notice-2024-and-later.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-faq-replacement",
      question: "¿Qué relación oficial existe entre los modelos 179 y 238?",
      answer:
        "El aviso de la AEAT explica que, respecto de información relativa a cesión y arrendamiento de inmuebles, la obligación asociada al 179 queda sustituida por el Modelo 238. Esta ficha no determina la aplicabilidad del 238 a una persona o entidad.",
      sourceIds: [
        "aeat.model-179.notice-2024-and-later.2026-07-08",
        "boe.real-decree-117-2024",
        "boe.order-hac-72-2024",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-faq-access",
      question: "¿Qué canales conserva descritos la AEAT para el Modelo 179?",
      answer:
        "La página oficial conserva referencias a un formulario web y a un cliente de web service para ejercicios anteriores. Son referencias históricas y esta aplicación no accede a esos servicios.",
      sourceIds: [
        "aeat.model-179.procedure-home.2026-02-13",
        "aeat.model-179.presentation-help.2026-01-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-faq-thumbnail",
      question: "¿Por qué esta ficha no muestra una miniatura de formulario?",
      answer:
        "Las descargas enlazadas por la página oficial son esquemas y documentos técnicos del canal electrónico, no un impreso PDF estático de la declaración Modelo 179.",
      sourceIds: [
        "aeat.model-179.procedure-home.2026-02-13",
        "aeat.model-179.validation-guide-pdf.2026-07-13",
        "aeat.model-179.web-service-guide-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-179-faq-sources",
      question: "¿Qué normas oficiales documentan la ficha histórica?",
      answer:
        "La ficha registra la Orden HAC/612/2021, el Real Decreto 117/2024 y la Orden HAC/72/2024, además de las páginas oficiales de la AEAT.",
      sourceIds: [
        "boe.order-hac-612-2021",
        "boe.real-decree-117-2024",
        "boe.order-hac-72-2024",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"179">;

const MODEL_180_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: RELEASE_ID,
  code: "180",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Retenciones e ingresos a cuenta sobre determinadas rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
  summary:
    "Declaración informativa que la AEAT identifica con retenciones e ingresos a cuenta sobre determinadas rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
  searchTerms: [
    "modelo 180",
    "declaración informativa",
    "retenciones e ingresos a cuenta",
    "arrendamiento de inmuebles urbanos",
    "subarrendamiento de inmuebles urbanos",
    "alquiler de local",
    "resumen anual",
    "modelo 115",
    "formulario web",
    "presentación mediante fichero",
    "carga de fichero",
    "certificado de retenciones",
    "diseño de registro",
    "Orden de 20 de noviembre de 2000",
  ],
  sections: [
    {
      id: "model-180-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-180-purpose-identity",
          heading: "Arrendamiento y subarrendamiento de inmuebles urbanos",
          text: "La AEAT identifica el Modelo 180 como una declaración informativa sobre retenciones e ingresos a cuenta vinculados a determinadas rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-180.procedure-home.2026-03-01",
            "aeat.model-180.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-180-purpose-record",
          heading: "Resumen informativo relacionado con el Modelo 115",
          text: "La ficha administrativa de la AEAT describe el Modelo 180 como un resumen informativo y señala su correspondencia documental con rendimientos o retenciones declarados mediante el Modelo 115. Esta ficha no evalúa esa correspondencia para ningún caso concreto.",
          sourceIds: ["aeat.model-180.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-180-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-180-access-browser",
          heading: "Formulario en navegador",
          text: "La ayuda técnica de la AEAT describe un formulario web para trabajar con la declaración en el navegador. Esta aplicación solo registra la existencia del canal y no abre ni automatiza el trámite.",
          sourceIds: [
            "aeat.model-180.procedure-home.2026-03-01",
            "aeat.model-180.browser-form-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-180-access-file",
          heading: "Carga de fichero",
          text: "La AEAT publica además una ayuda técnica separada para el canal mediante fichero y mantiene el diseño de registro del Modelo 180 dentro del índice técnico de los modelos 100 al 199.",
          sourceIds: [
            "aeat.model-180.file-upload-help.2026-06-19",
            REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-180-materials",
      title: "Materiales oficiales y límites",
      kind: "DETAILS",
      items: [
        {
          id: "model-180-materials-certificate",
          heading: "Certificado de retenciones separado",
          text: "La AEAT ofrece un certificado rellenable en PDF relacionado con estos rendimientos y advierte en su página de descarga de que el archivo incorpora código JavaScript. Es un formulario de certificado separado, no la declaración Modelo 180; por eso solo se ofrece como descarga externa y no se utiliza como miniatura del modelo.",
          sourceIds: [
            "aeat.model-180.certificate-page.2026-07-08",
            "aeat.model-180.certificate-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-180-materials-register-design",
          heading: "Diseño de registro, no impreso",
          text: "El índice técnico de la AEAT enlaza un diseño de registro del Modelo 180. Al no tratarse de un impreso estático de la declaración, esta ficha no genera una miniatura a partir de ese material.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-180.register-design-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-180-materials-law",
          heading: "Normativa registrada",
          text: "La página oficial enlaza la Orden de 20 de noviembre de 2000 y modificaciones posteriores, entre ellas la Orden HFP/1284/2023. Su inclusión documenta las fuentes y no determina la aplicabilidad del modelo.",
          sourceIds: [
            "boe.model-180.order-2000-11-20",
            "boe.model-180.order-hfp-1284-2023",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-180.procedure-home.2026-03-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 180. Retenciones e ingresos a cuenta sobre arrendamiento de inmuebles urbanos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI00.shtml",
      officialUpdatedOn: "2026-03-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2f58cd8c26f978c76b473e5a290cd88d73d258680e8eea6931e33eae79b2b592",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-180.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 180",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI00.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "74de2924af86b48a4ae680bd982f1aa39d388b7d35eb76a761d6ee8781317ba5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-180.browser-form-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 180 · ayuda técnica del formulario web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-180-formulario.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2be6f8e1cfd96cb7964527b7228a4dd455fd17538babade0bb492a1a978f9718",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-180.file-upload-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 180 · ayuda técnica de presentación mediante fichero",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-180-fichero.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c1ee5145ff35763c370b8b2864e3c7203a445fe08ce949a8b8ca95f2ec520473",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-180.certificate-page.2026-07-08",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Modelo 180 · certificado de retenciones",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/declaraciones-informativas/modelo-180-decla_____arrendamiento-inmuebles-urbanos-anual_/certificado-retenciones.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "40b6971d0823ad5a642ca4d89c367bd208fc57f09becf182a1f9ad11a411136d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-180.certificate-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Certificado de retenciones relacionado con el Modelo 180",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI00/certific_180_mi_MI.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cfcd55d953b259b1652141035afd2936d16c6a9dd4be00c404303d5e01b1cb52",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-180.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 180",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/declaraciones-informativas/modelo-180-decla_____arrendamiento-inmuebles-urbanos-anual_/preguntas-frecuentes.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "554a9aa236de282f3ab00536cb535ca93a3903804e35dc41b96c5d79e772b8bb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-180.register-design-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 180 · diseño de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_23/DR_Mod_180_2023.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f4f4a0e9c8150288489e0a3058bedbd9a3b9f58bdba5e58b1599b7c7f5fc6cda",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-180.order-2000-11-20",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden de 20 de noviembre de 2000",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2000-21430",
      officialUpdatedOn: "2023-11-30",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bacfc4e024f582bfa255e4117c28de6e529f6267da5b81005f39832606f1273c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-180.order-hfp-1284-2023",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/1284/2023, de 28 de noviembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2023-24412",
      officialUpdatedOn: "2023-11-30",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "05df140a1b39080443ab01f8ac27060ea439c9062569e8eda2a2be8c809a461d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-180-certificate-form",
      kind: "FORM",
      title:
        "Formulario de certificado de retenciones (no es la declaración Modelo 180)",
      sourceId: "aeat.model-180.certificate-pdf.2026-07-13",
      landingPageSourceId: "aeat.model-180.certificate-page.2026-07-08",
      mediaType: "application/pdf",
      fileName: "certific_180_mi_MI.pdf",
      byteLength: 643021,
      pageCount: 1,
      sha256:
        "cfcd55d953b259b1652141035afd2936d16c6a9dd4be00c404303d5e01b1cb52",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-180-register-design",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro técnico del Modelo 180",
      sourceId: "aeat.model-180.register-design-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Mod_180_2023.pdf",
      byteLength: 256994,
      pageCount: 17,
      sha256:
        "f4f4a0e9c8150288489e0a3058bedbd9a3b9f58bdba5e58b1599b7c7f5fc6cda",
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
      "aeat.model-180.browser-form-help.2026-06-19",
      "aeat.model-180.file-upload-help.2026-06-19",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  links: [
    {
      id: "model-180-link-procedure",
      label: "Página oficial del Modelo 180",
      sourceId: "aeat.model-180.procedure-home.2026-03-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-link-browser-help",
      label: "Ayuda oficial del formulario web",
      sourceId: "aeat.model-180.browser-form-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-link-file-help",
      label: "Ayuda oficial del canal mediante fichero",
      sourceId: "aeat.model-180.file-upload-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-link-certificate",
      label: "Certificado de retenciones oficial (no es la declaración)",
      sourceId: "aeat.model-180.certificate-page.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 180",
      sourceId: "aeat.model-180.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-link-register-design",
      label: "Diseño de registro técnico del Modelo 180",
      sourceId: "aeat.model-180.register-design-pdf.2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-link-law",
      label: "Orden reguladora del Modelo 180 en el BOE",
      sourceId: "boe.model-180.order-2000-11-20",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-180-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 180?",
      answer:
        "La AEAT lo identifica como una declaración informativa sobre retenciones e ingresos a cuenta vinculados a determinadas rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-180.procedure-home.2026-03-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-faq-relation-115",
      question: "¿Qué relación documental menciona la AEAT con el Modelo 115?",
      answer:
        "La ficha administrativa señala que el resumen del Modelo 180 se corresponde con rendimientos o retenciones declarados en las declaraciones del Modelo 115. Esta ficha no evalúa esa relación para un caso concreto.",
      sourceIds: ["aeat.model-180.procedure-record.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-faq-access",
      question: "¿Qué canales de acceso describe la AEAT para el Modelo 180?",
      answer:
        "La ayuda oficial describe un formulario web y un canal mediante fichero. Aquí solo se registra la existencia de ambos métodos; no se conecta con ellos ni se ejecuta ninguna presentación.",
      sourceIds: [
        "aeat.model-180.browser-form-help.2026-06-19",
        "aeat.model-180.file-upload-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-faq-certificate",
      question: "¿El PDF del certificado de retenciones es la declaración Modelo 180?",
      answer:
        "No. La AEAT lo publica como un certificado rellenable relacionado con esos rendimientos y advierte de que el PDF incorpora código JavaScript. Se registra como formulario de certificado separado, solo para descarga externa, y no como declaración Modelo 180.",
      sourceIds: [
        "aeat.model-180.certificate-page.2026-07-08",
        "aeat.model-180.certificate-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-faq-thumbnail",
      question: "¿Por qué la ficha no muestra una miniatura del Modelo 180?",
      answer:
        "Los documentos estáticos localizados son un diseño de registro técnico y un certificado auxiliar, no el impreso de la declaración. Para evitar una representación equívoca, ninguno se usa como miniatura del modelo.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-180.certificate-page.2026-07-08",
        "aeat.model-180.register-design-pdf.2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-180-faq-sources",
      question: "¿Qué fuentes normativas registra esta ficha?",
      answer:
        "Registra la Orden de 20 de noviembre de 2000 y la modificación publicada mediante la Orden HFP/1284/2023, junto con las páginas informativas de la AEAT.",
      sourceIds: [
        "boe.model-180.order-2000-11-20",
        "boe.model-180.order-hfp-1284-2023",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"180">;

export const PUBLIC_AEAT_BATCH_05_PROPERTY_INFORMATION_CONTENT_V1 = deepFreeze(
  [MODEL_179_CONTENT, MODEL_180_CONTENT] as const,
);
