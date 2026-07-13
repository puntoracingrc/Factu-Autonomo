import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_RELEASE_ID_V1 =
  "public-aeat-official-batch-03-capital-withholding.2026-07-13.v1" as const;

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

const DESIGNS_SOURCE = {
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

const QUERY_HELP_SOURCE = {
  id: "aeat.declarations-query-help.2026-05-07",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Consulta de declaraciones presentadas",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/consulta-declaraciones-presentadas.html",
  officialUpdatedOn: "2026-05-07",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "542387e7517471968709e7d050d37f4a2e48fbeb30f2b6f14434ec597fc24563",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const APPROVAL_ORDER_SOURCE = {
  id: "boe.order-eha-3435-2007",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3435/2007, de 23 de noviembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20485",
  officialUpdatedOn: "2024-01-31",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4c762c7edc51f94835b40a08703d73544856aa07adf4934ec4d4957511cef951",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const PROCESSING_ORDER_SOURCE = {
  id: "boe.order-hap-2194-2013",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2194/2013, de 22 de noviembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2013-12385",
  officialUpdatedOn: "2025-12-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "74a688896eff8b958f9505e90748c978bb5dc3ddb0c20af552c0d3e5651bab9a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_123_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_RELEASE_ID_V1,
  code: "123",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta del IRPF, Impuesto sobre Sociedades e IRNR correspondiente a establecimientos permanentes. Determinados rendimientos del capital mobiliario o determinadas rentas.",
  summary:
    "Autoliquidación sobre determinados rendimientos del capital mobiliario o determinadas rentas, según la delimitación publicada por la Agencia Tributaria.",
  searchTerms: [
    "modelo 123",
    "retenciones capital mobiliario",
    "ingresos a cuenta",
    "determinadas rentas",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR establecimiento permanente",
    "rendimientos exentos",
    "presentación por lotes 123",
    "consulta modelo 123",
    "diseño de registro 123",
  ],
  sections: [
    {
      id: "model-123-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-123-purpose-summary",
          heading: "Capital mobiliario y determinadas rentas",
          text: "La ficha oficial identifica el Modelo 123 con retenciones e ingresos a cuenta sobre determinados rendimientos del capital mobiliario o determinadas rentas en el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
          sourceIds: ["aeat.model-123.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-123-scope",
      title: "Delimitación publicada",
      kind: "SCOPE",
      items: [
        {
          id: "model-123-scope-generic",
          heading: "Categoría general",
          text: "La guía censal de la AEAT describe el Modelo 123 como la categoría genérica para rendimientos del capital mobiliario y rentas que no correspondan a otros modelos específicos de retenciones e ingresos a cuenta.",
          sourceIds: ["aeat.model-123.census-guide.2026-03-26"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-123-scope-other-models",
          heading: "Distinción frente a otros modelos",
          text: "La ficha administrativa distingue el Modelo 123 de las rentas encuadradas en los modelos 115, 117, 124, 126 y 128. Esta información no decide la clasificación de una operación concreta.",
          sourceIds: ["aeat.model-123.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-123-access",
      title: "Gestiones y formato oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-123-access-services",
          heading: "Servicios que reúne la página",
          text: "La página oficial diferencia la gestión para el ejercicio 2024 y siguientes de la correspondiente a 2020-2023, y además enlaza presentación por lotes, consulta y aportación de documentación complementaria.",
          sourceIds: ["aeat.model-123.procedure-home.2026-02-24"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-123-access-files",
          heading: "Formulario web y diseño vigente",
          text: "La ayuda técnica describe un formulario web que importa y exporta ficheros con extensión .123. La página actual de diseños enlaza un archivo XLS para el ejercicio 2024 y siguientes; el PDF fechado en 2008 que puede aparecer en búsquedas es un diseño histórico, no un formulario vigente.",
          sourceIds: [
            "aeat.model-123.help.2026-06-19",
            DESIGNS_SOURCE.id,
            "aeat.model-123.historical-register-design.2008-11-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-123.procedure-home.2026-02-24",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 123. Retenciones e ingresos a cuenta sobre determinados rendimientos del capital mobiliario o determinadas rentas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH04.shtml",
      officialUpdatedOn: "2026-02-24",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "107a4d45310f651e52374853b7554defb763aec413ac2feadfb2c2d2d069ed6d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-123.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 123",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH04.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1e938add731bc4c6441db503e191eaadb92a798d71379b25c69b74929ffa8a1f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-123.census-guide.2026-03-26",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Guía censal · Modelo 123",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/guia-practica-cumplimentacion-modelo-censal-036/capitulo-09-retenciones-ingresos-cuenta/modelo-123.html",
      officialUpdatedOn: "2026-03-26",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f389ebebc26110bd566ea440c1661f96577eff4b13e2500475e5fbe58fad87f8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-123.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 123 - Presentación del modelo 123. Ejercicio 2024 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-123.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "79c7e6effc9666ee3c6f0ce8db0a7c625d635877acdd200773e69d7ba061ca19",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-123.historical-register-design.2008-11-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Diseño de registro histórico del Modelo 123 · 13/11/2008",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/ant_100_199/archivos/123_2008.pdf",
      officialUpdatedOn: "2008-11-13",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "172c238f5b06c4360c9e47e13092ef6703fe0c8f04bd4b7a279017694087f3c5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_SOURCE,
    QUERY_HELP_SOURCE,
    APPROVAL_ORDER_SOURCE,
    PROCESSING_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-123-link-procedure",
      label: "Página oficial del Modelo 123",
      sourceId: "aeat.model-123.procedure-home.2026-02-24",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-link-help",
      label: "Ayuda técnica del Modelo 123",
      sourceId: "aeat.model-123.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-link-designs",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-link-law",
      label: "Orden EHA/3435/2007",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-link-processing-law",
      label: "Orden HAP/2194/2013",
      sourceId: PROCESSING_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-123-faq-purpose",
      question: "¿Qué información reúne el Modelo 123?",
      answer: "La AEAT lo vincula a determinados rendimientos del capital mobiliario o determinadas rentas sometidos a retención o ingreso a cuenta en los impuestos que identifica su denominación oficial.",
      sourceIds: ["aeat.model-123.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-faq-taxes",
      question: "¿Qué impuestos menciona la denominación oficial?",
      answer: "Menciona el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
      sourceIds: ["aeat.model-123.procedure-home.2026-02-24"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-faq-distinction",
      question: "¿Cómo lo diferencia la AEAT de otros modelos?",
      answer: "La ficha lo distingue de las rentas encuadradas en los modelos 115, 117, 124, 126 y 128, sin que esta ficha informativa clasifique operaciones concretas.",
      sourceIds: ["aeat.model-123.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-faq-services",
      question: "¿Qué gestiones muestra la página oficial?",
      answer: "Muestra formularios diferenciados por ejercicios, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
      sourceIds: ["aeat.model-123.procedure-home.2026-02-24"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-faq-files",
      question: "¿Qué formato estático publica actualmente la AEAT?",
      answer: "La página de diseños enlaza un archivo XLS para el ejercicio 2024 y siguientes. El PDF de 2008 localizado en la ruta histórica es un diseño antiguo, no el formulario web actual.",
      sourceIds: [
        "aeat.model-123.help.2026-06-19",
        DESIGNS_SOURCE.id,
        "aeat.model-123.historical-register-design.2008-11-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-123-faq-legal",
      question: "¿Qué normativa destaca la página oficial?",
      answer: "La página remite a la Orden EHA/3435/2007 y a la Orden HAP/2194/2013.",
      sourceIds: [APPROVAL_ORDER_SOURCE.id, PROCESSING_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"123">;

const MODEL_124_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_RELEASE_ID_V1,
  code: "124",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta. Rentas y rendimientos del capital mobiliario derivados de la transmisión, amortización, reembolso, canje o conversión de activos representativos de la captación y utilización de capitales ajenos.",
  summary:
    "Autoliquidación relativa a determinadas rentas y rendimientos derivados de activos representativos de la captación y utilización de capitales ajenos.",
  searchTerms: [
    "modelo 124",
    "retenciones capital mobiliario",
    "activos financieros",
    "capitales ajenos",
    "transmisión",
    "amortización",
    "reembolso",
    "canje",
    "conversión",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR establecimiento permanente",
    "diseño de registro 124",
  ],
  sections: [
    {
      id: "model-124-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-124-purpose-summary",
          heading: "Operaciones sobre activos financieros",
          text: "La ficha oficial vincula el Modelo 124 a retenciones e ingresos a cuenta sobre rendimientos o rentas derivados de la transmisión, amortización, reembolso, canje o conversión de activos representativos de la captación y utilización de capitales ajenos.",
          sourceIds: ["aeat.model-124.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-124-scope",
      title: "Descripción oficial",
      kind: "SCOPE",
      items: [
        {
          id: "model-124-scope-guide",
          heading: "Rentas que describe la guía censal",
          text: "La guía censal de la AEAT se refiere a rendimientos del capital mobiliario y rentas de la misma procedencia en el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
          sourceIds: ["aeat.model-124.census-guide.2026-03-26"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-124-access",
      title: "Gestiones y formato oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-124-access-services",
          heading: "Servicios publicados",
          text: "La página oficial reúne presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
          sourceIds: ["aeat.model-124.procedure-home.2026-02-13"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-124-access-design",
          heading: "Diseño vigente y referencias antiguas",
          text: "La página actual de diseños enlaza un archivo XLSX del Modelo 124, versión 1.07, para ejercicios 2020 y siguientes. El PDF fechado en 2008 de la ruta ant_100_199 es un diseño histórico y no se trata como formulario vigente.",
          sourceIds: [
            DESIGNS_SOURCE.id,
            "aeat.model-124.historical-register-design.2008-02-12",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-124.procedure-home.2026-02-13",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 124. Retenciones sobre activos representativos de capitales ajenos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH05.shtml",
      officialUpdatedOn: "2026-02-13",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3d7ff5bdfee4e8c1ee18d7338afd73b035b01629fe62f8ffc88ec4298028338e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-124.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 124",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH05.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3512ddb5e47cfad23b85515ffe4995c24220de1e69293ac59d82430a4672aad6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-124.census-guide.2026-03-26",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Guía censal · Modelo 124",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/guia-practica-cumplimentacion-modelo-censal-036/capitulo-09-retenciones-ingresos-cuenta/modelo-124.html",
      officialUpdatedOn: "2026-03-26",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ac3cc845a132bee7bd24e9430a15c1a323fba46025c52a21554a70660b69e302",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-124.historical-register-design.2008-02-12",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Diseño de registro histórico del Modelo 124 · 12/02/2008",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/ant_100_199/archivos/dr124_2008.pdf",
      officialUpdatedOn: "2008-02-12",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "edcc31af7a5c7c8f5b355f0b18b9d867976c8e61fafd6bebcb1ac8c838ef3218",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_SOURCE,
    QUERY_HELP_SOURCE,
    APPROVAL_ORDER_SOURCE,
    PROCESSING_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-124-link-procedure",
      label: "Página oficial del Modelo 124",
      sourceId: "aeat.model-124.procedure-home.2026-02-13",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-link-guide",
      label: "Guía censal oficial del Modelo 124",
      sourceId: "aeat.model-124.census-guide.2026-03-26",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-link-query",
      label: "Ayuda para consultar declaraciones presentadas",
      sourceId: QUERY_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-link-designs",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-link-law",
      label: "Orden EHA/3435/2007",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-124-faq-purpose",
      question: "¿Qué operaciones identifica el Modelo 124?",
      answer: "La AEAT menciona transmisión, amortización, reembolso, canje o conversión de activos representativos de la captación y utilización de capitales ajenos.",
      sourceIds: ["aeat.model-124.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-faq-assets",
      question: "¿Cómo denomina la guía censal a esos instrumentos?",
      answer: "La guía censal utiliza también la expresión activos financieros para describir esta categoría.",
      sourceIds: ["aeat.model-124.census-guide.2026-03-26"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-faq-taxes",
      question: "¿Qué impuestos aparecen en la descripción oficial?",
      answer: "La ficha y la guía mencionan el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
      sourceIds: [
        "aeat.model-124.procedure-record.2026-06-09",
        "aeat.model-124.census-guide.2026-03-26",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-faq-services",
      question: "¿Qué gestiones reúne la página oficial?",
      answer: "Reúne presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
      sourceIds: ["aeat.model-124.procedure-home.2026-02-13"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-faq-format",
      question: "¿Cuál es el diseño que enlaza actualmente la AEAT?",
      answer: "La página vigente enlaza un XLSX versión 1.07 para ejercicios 2020 y siguientes. El PDF de 2008 pertenece a la ruta histórica de diseños y no es un formulario actual.",
      sourceIds: [
        DESIGNS_SOURCE.id,
        "aeat.model-124.historical-register-design.2008-02-12",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-124-faq-legal",
      question: "¿Qué norma aprueba el modelo?",
      answer: "La ficha oficial remite a la Orden EHA/3435/2007.",
      sourceIds: [APPROVAL_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"124">;

const MODEL_126_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_RELEASE_ID_V1,
  code: "126",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta. Rendimientos del capital mobiliario obtenidos por la contraprestación derivada de cuentas en toda clase de instituciones financieras.",
  summary:
    "Autoliquidación relativa a rendimientos del capital mobiliario o rentas derivados de cuentas en instituciones financieras.",
  searchTerms: [
    "modelo 126",
    "retenciones capital mobiliario",
    "cuentas instituciones financieras",
    "cuentas bancarias",
    "operaciones sobre activos financieros",
    "contraprestación de cuentas",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR establecimiento permanente",
    "presentación por lotes 126",
    "diseño de registro 126",
  ],
  sections: [
    {
      id: "model-126-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-126-purpose-summary",
          heading: "Rendimientos derivados de cuentas",
          text: "La ficha oficial vincula el Modelo 126 a retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario o rentas derivados de cuentas en toda clase de instituciones financieras.",
          sourceIds: ["aeat.model-126.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-126-scope",
      title: "Descripción oficial",
      kind: "SCOPE",
      items: [
        {
          id: "model-126-scope-financial-assets",
          heading: "Operaciones sobre activos financieros",
          text: "La guía censal añade que esta descripción incluye cuentas basadas en operaciones sobre activos financieros y menciona el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
          sourceIds: ["aeat.model-126.census-guide.2026-03-26"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-126-access",
      title: "Gestiones y formato oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-126-access-services",
          heading: "Servicios publicados",
          text: "La página oficial reúne presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
          sourceIds: ["aeat.model-126.procedure-home.2026-02-13"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-126-access-design",
          heading: "Diseño vigente y referencias antiguas",
          text: "La página actual de diseños enlaza un archivo XLSX del Modelo 126, versión 1.07, para ejercicios 2020 y siguientes. El PDF versión 1.05 de 2016 está en la ruta ant_100_199 y se conserva solo como referencia histórica.",
          sourceIds: [
            DESIGNS_SOURCE.id,
            "aeat.model-126.historical-register-design.2016-01-27",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-126.procedure-home.2026-02-13",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 126. Rendimientos derivados de cuentas en instituciones financieras",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH06.shtml",
      officialUpdatedOn: "2026-02-13",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "db00bc5bc6e92b61d88823e2c0053d8b7d75577bfdfb1c567c6a02bc40d344c1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-126.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 126",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH06.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "28031eed81e6a108797729b2c5476a7c5e89b03fe131a15c219818094765e3f7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-126.census-guide.2026-03-26",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Guía censal · Modelo 126",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/guia-practica-cumplimentacion-modelo-censal-036/capitulo-09-retenciones-ingresos-cuenta/modelo-126.html",
      officialUpdatedOn: "2026-03-26",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0329b8d1fdb5cd4b5a4aa211c296f420f7193388e053c68c935c5d4c170ad129",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-126.historical-register-design.2016-01-27",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Diseño de registro histórico del Modelo 126 · versión 1.05",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/ant_100_199/archivos/DR-126e16_v1.05.pdf",
      officialUpdatedOn: "2016-01-27",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8d848f670a8d8c3492506958c1938b687547a3213a5aecade3d2e3391c5ebaee",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_SOURCE,
    QUERY_HELP_SOURCE,
    APPROVAL_ORDER_SOURCE,
    PROCESSING_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-126-link-procedure",
      label: "Página oficial del Modelo 126",
      sourceId: "aeat.model-126.procedure-home.2026-02-13",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-link-guide",
      label: "Guía censal oficial del Modelo 126",
      sourceId: "aeat.model-126.census-guide.2026-03-26",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-link-query",
      label: "Ayuda para consultar declaraciones presentadas",
      sourceId: QUERY_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-link-designs",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-link-law",
      label: "Orden EHA/3435/2007",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-126-faq-purpose",
      question: "¿Qué rendimientos identifica el Modelo 126?",
      answer: "La AEAT lo vincula a rendimientos del capital mobiliario o rentas derivados de cuentas en toda clase de instituciones financieras.",
      sourceIds: ["aeat.model-126.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-faq-assets",
      question: "¿Incluye la descripción operaciones sobre activos financieros?",
      answer: "La guía censal indica que también comprende cuentas basadas en operaciones sobre activos financieros.",
      sourceIds: ["aeat.model-126.census-guide.2026-03-26"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-faq-taxes",
      question: "¿Qué impuestos aparecen en las fuentes oficiales?",
      answer: "La ficha y la guía mencionan el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
      sourceIds: [
        "aeat.model-126.procedure-record.2026-06-09",
        "aeat.model-126.census-guide.2026-03-26",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-faq-services",
      question: "¿Qué gestiones reúne la página oficial?",
      answer: "Reúne presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
      sourceIds: ["aeat.model-126.procedure-home.2026-02-13"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-faq-format",
      question: "¿Cuál es el diseño que enlaza actualmente la AEAT?",
      answer: "La página vigente enlaza un XLSX versión 1.07 para ejercicios 2020 y siguientes. El PDF versión 1.05 de 2016 pertenece a la ruta histórica de diseños.",
      sourceIds: [
        DESIGNS_SOURCE.id,
        "aeat.model-126.historical-register-design.2016-01-27",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-126-faq-legal",
      question: "¿Qué norma aprueba el modelo?",
      answer: "La ficha oficial remite a la Orden EHA/3435/2007.",
      sourceIds: [APPROVAL_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"126">;

const MODEL_128_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_RELEASE_ID_V1,
  code: "128",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta. Rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguros de vida o invalidez.",
  summary:
    "Autoliquidación relativa a rentas o rendimientos procedentes de operaciones de capitalización y contratos de seguros de vida o invalidez.",
  searchTerms: [
    "modelo 128",
    "retenciones capital mobiliario",
    "operaciones de capitalización",
    "seguros de vida",
    "seguros de invalidez",
    "contratos de seguro",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR establecimiento permanente",
    "presentación por lotes 128",
    "diseño de registro 128",
  ],
  sections: [
    {
      id: "model-128-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-128-purpose-summary",
          heading: "Capitalización y seguros",
          text: "La ficha oficial vincula el Modelo 128 a retenciones e ingresos a cuenta sobre rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguros de vida o invalidez.",
          sourceIds: ["aeat.model-128.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-128-scope",
      title: "Descripción oficial",
      kind: "SCOPE",
      items: [
        {
          id: "model-128-scope-taxes",
          heading: "Impuestos que menciona la AEAT",
          text: "La guía censal menciona rentas o rendimientos de esta procedencia en el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes. Esta descripción no determina su aplicación a una situación concreta.",
          sourceIds: ["aeat.model-128.census-guide.2026-03-26"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-128-access",
      title: "Gestiones y formato oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-128-access-services",
          heading: "Servicios publicados",
          text: "La página oficial reúne presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
          sourceIds: ["aeat.model-128.procedure-home.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-128-access-design",
          heading: "Diseño vigente y referencias antiguas",
          text: "La página actual de diseños enlaza un archivo XLSX del Modelo 128, versión 1.07, para ejercicios 2020 y siguientes. El PDF versión 1.05 de 2016 está en la ruta ant_100_199 y se conserva solo como referencia histórica.",
          sourceIds: [
            DESIGNS_SOURCE.id,
            "aeat.model-128.historical-register-design.2016-01-27",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-128.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 128. Operaciones de capitalización y seguros de vida o invalidez",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH07.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a798075ef88d0dafd5c1430873813b136d4dd37858889946f1f1d1e7aa9e64cf",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-128.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 128",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH07.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "db7ea38e980d2ae05f43a49d11517322ce2090513960a79a1f7f1d34631152e1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-128.census-guide.2026-03-26",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Guía censal · Modelo 128",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/guia-practica-cumplimentacion-modelo-censal-036/capitulo-09-retenciones-ingresos-cuenta/modelo-128.html",
      officialUpdatedOn: "2026-03-26",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "302ab89d4d43e675f9b680a9b9afc34be3b74b252ec72783e93a47da33ce5ba6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-128.historical-register-design.2016-01-27",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Diseño de registro histórico del Modelo 128 · versión 1.05",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/ant_100_199/archivos/DR-128e16_v1.05.pdf",
      officialUpdatedOn: "2016-01-27",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b7813c21a5e1d93e6ab592807747bcc5fad8a99d2597730ffa5fcd409a80bf13",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_SOURCE,
    QUERY_HELP_SOURCE,
    APPROVAL_ORDER_SOURCE,
    PROCESSING_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-128-link-procedure",
      label: "Página oficial del Modelo 128",
      sourceId: "aeat.model-128.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-link-guide",
      label: "Guía censal oficial del Modelo 128",
      sourceId: "aeat.model-128.census-guide.2026-03-26",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-link-query",
      label: "Ayuda para consultar declaraciones presentadas",
      sourceId: QUERY_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-link-designs",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-link-law",
      label: "Orden EHA/3435/2007",
      sourceId: APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-128-faq-purpose",
      question: "¿Qué rentas identifica el Modelo 128?",
      answer: "La AEAT lo vincula a rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguros de vida o invalidez.",
      sourceIds: ["aeat.model-128.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-faq-insurance",
      question: "¿Qué contratos menciona expresamente?",
      answer: "La denominación oficial menciona contratos de seguros de vida o invalidez.",
      sourceIds: ["aeat.model-128.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-faq-taxes",
      question: "¿Qué impuestos aparecen en las fuentes oficiales?",
      answer: "Las fuentes mencionan el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
      sourceIds: [
        "aeat.model-128.procedure-record.2026-06-09",
        "aeat.model-128.census-guide.2026-03-26",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-faq-services",
      question: "¿Qué gestiones reúne la página oficial?",
      answer: "Reúne presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
      sourceIds: ["aeat.model-128.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-faq-format",
      question: "¿Cuál es el diseño que enlaza actualmente la AEAT?",
      answer: "La página vigente enlaza un XLSX versión 1.07 para ejercicios 2020 y siguientes. El PDF versión 1.05 de 2016 pertenece a la ruta histórica de diseños.",
      sourceIds: [
        DESIGNS_SOURCE.id,
        "aeat.model-128.historical-register-design.2016-01-27",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-128-faq-legal",
      question: "¿Qué norma aprueba el modelo?",
      answer: "La ficha oficial remite a la Orden EHA/3435/2007.",
      sourceIds: [APPROVAL_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"128">;

export const PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_CONTENT_V1 =
  deepFreeze([
    MODEL_123_CONTENT,
    MODEL_124_CONTENT,
    MODEL_126_CONTENT,
    MODEL_128_CONTENT,
  ] as const);

export type PublicAeatBatch03CapitalWithholdingCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_CONTENT_V1)[number]["code"];
