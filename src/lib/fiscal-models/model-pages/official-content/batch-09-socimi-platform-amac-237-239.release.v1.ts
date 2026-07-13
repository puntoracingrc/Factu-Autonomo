import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_RELEASE_ID_V1 =
  "public-aeat-official-batch-09-socimi-platform-amac-237-239.2026-07-13.v1" as const;

export type PublicAeatBatch09SocimiPlatformAmac237239CodeV1 =
  "237" | "238" | "239";

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
  id: "aeat.models-200-299.register-designs.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro. Modelos 200 al 299",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-200-299.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1397ca1c069858135a1229fa0e1b36d36df487d9e757207069761e2c143a67a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE = {
  id: "boe.aeat-electronic-office-resolution-2009",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 28 de diciembre de 2009",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-21051",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "39f508e7bfcb960751f2e0afb4019cfcb35916600b9fa82ad98ded1b4f82d274",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_237_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_RELEASE_ID_V1,
  code: "237",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Gravamen especial sobre beneficios no distribuidos por SOCIMI.",
  summary:
    "Autoliquidación que la AEAT identifica con el gravamen especial sobre beneficios no distribuidos por sociedades anónimas cotizadas de inversión en el mercado inmobiliario.",
  searchTerms: [
    "modelo 237",
    "gravamen especial",
    "beneficios no distribuidos",
    "SOCIMI",
    "sociedades anónimas cotizadas de inversión inmobiliaria",
    "Impuesto sobre Sociedades",
    "autoliquidación modelo 237",
    "formulario web modelo 237",
    "instrucciones modelo 237",
    "diseño de registro 237",
    "Orden HFP 1430 2021",
    "Orden HAP 2762 2015",
  ],
  sections: [
    {
      id: "model-237-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-237-purpose-identity",
          heading: "Gravamen especial sobre beneficios no distribuidos",
          text: "El índice de modelos y la página del procedimiento identifican el Modelo 237 con el gravamen especial sobre beneficios no distribuidos por SOCIMI en el Impuesto sobre Sociedades.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-237.procedure-home.2026-07-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-237-purpose-record",
          heading: "Descripción administrativa del procedimiento",
          text: "La ficha administrativa clasifica el Modelo 237 como una autoliquidación tributaria con tramitación electrónica. Esta ficha informativa no evalúa su aplicabilidad ni reproduce la liquidación descrita por la AEAT.",
          sourceIds: ["aeat.model-237.procedure-record.2026-06-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-237-access",
      title: "Canal y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-237-access-browser",
          heading: "Formulario en navegador",
          text: "La página principal enumera una gestión de presentación y la ficha administrativa describe tramitación electrónica. La referencia al canal es informativa y esta página no conserva ni abre el destino de presentación.",
          sourceIds: [
            "aeat.model-237.procedure-home.2026-07-01",
            "aeat.model-237.procedure-record.2026-06-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-237-access-no-static-form",
          heading: "Sin formulario PDF estático registrado",
          text: "Las fuentes registradas ofrecen instrucciones en formato web y una referencia técnica de diseño de registro, pero no enlazan un formulario PDF estático y vacío. Por ello la ficha representa el canal web y no muestra una miniatura de formulario.",
          sourceIds: [
            "aeat.model-237.procedure-home.2026-07-01",
            "aeat.model-237.instructions.2026-06-10",
            REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-237-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-237-details-instructions",
          heading: "Instrucciones oficiales en la sede",
          text: "La AEAT publica instrucciones en formato web. Se conservan como referencia externa sin trasladar su contenido operativo ni convertirlo en reglas de decisión.",
          sourceIds: [
            "aeat.model-237.procedure-home.2026-07-01",
            "aeat.model-237.instructions.2026-06-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-237-details-register-design",
          heading: "Diseño de registro identificado para 2021",
          text: "El catálogo técnico de la AEAT identifica un diseño de registro del Modelo 237 rotulado para el ejercicio 2021. Esta ficha solo registra la existencia de esa referencia y no infiere que describa ejercicios posteriores.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-237-details-laws",
          heading: "Normativa oficial registrada",
          text: "La página del procedimiento cita la Orden HFP/1430/2021 como norma de aprobación. La ficha administrativa registra además la Orden HAP/2762/2015 como normativa de tramitación y la resolución de creación de la sede electrónica de la AEAT.",
          sourceIds: [
            "boe.model-237.order-hfp-1430-2021",
            "boe.model-237.processing-order-hap-2762-2015",
            ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-237.procedure-home.2026-07-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 237 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE08.shtml",
      officialUpdatedOn: "2026-07-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f3a4e06467f61ccd43423fd41b2966bbe1a1d29f2848d2a0abb23093695fd710",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-237.procedure-record.2026-06-10",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 237",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE08.shtml",
      officialUpdatedOn: "2026-06-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "38c768e20a831a1c1230a31c650b0b8e2b1085acc0da5df250329b133d0b1925",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-237.instructions.2026-06-10",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 237",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-sociedades/modelo-237-grava_____ecial-sobre-beneficios-socimi_/instrucciones.html",
      officialUpdatedOn: "2026-06-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1149b8eb096e9f00867b595c85b8dc83348e88d3f6aaf7bfdb5297098916946d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "boe.model-237.order-hfp-1430-2021",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/1430/2021, de 20 de diciembre",
      canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-21217",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "46ffb11f21f8af38ffbfc8a75a6e1e4aebc5bfb5031c86f046d1d13433080f12",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-237.processing-order-hap-2762-2015",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/2762/2015, de 15 de diciembre",
      canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-13917",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f6addb5ebc6d1cc7e773777061d02bdfd258acd9a41969801e74bf8f4ff9bf8a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-237-link-procedure",
      label: "Página oficial del Modelo 237",
      sourceId: "aeat.model-237.procedure-home.2026-07-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-237.procedure-record.2026-06-10",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-link-instructions",
      label: "Instrucciones oficiales en la sede",
      sourceId: "aeat.model-237.instructions.2026-06-10",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-link-register-designs",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-link-approval-order",
      label: "Orden HFP/1430/2021",
      sourceId: "boe.model-237.order-hfp-1430-2021",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-link-processing-order",
      label: "Orden HAP/2762/2015",
      sourceId: "boe.model-237.processing-order-hap-2762-2015",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-237-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 237?",
      answer:
        "Una autoliquidación vinculada al gravamen especial sobre beneficios no distribuidos por SOCIMI en el Impuesto sobre Sociedades.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-classification",
      question: "¿Cómo clasifica la AEAT el procedimiento?",
      answer:
        "Como procedimiento tributario y autoliquidación con tramitación electrónica, sin que esta ficha determine su aplicabilidad.",
      sourceIds: ["aeat.model-237.procedure-record.2026-06-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-channel",
      question: "¿Qué canal describe la página oficial?",
      answer:
        "Un formulario en navegador. Esta ficha solo describe el canal y no publica un destino de presentación.",
      sourceIds: [
        "aeat.model-237.procedure-home.2026-07-01",
        "aeat.model-237.procedure-record.2026-06-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-instructions",
      question: "¿Publica la AEAT instrucciones del Modelo 237?",
      answer:
        "Sí. La página del procedimiento enlaza instrucciones oficiales en formato web.",
      sourceIds: [
        "aeat.model-237.procedure-home.2026-07-01",
        "aeat.model-237.instructions.2026-06-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-register-design",
      question: "¿Existe una referencia técnica de diseño de registro?",
      answer:
        "Sí. El catálogo técnico de la AEAT identifica un diseño del Modelo 237 rotulado para el ejercicio 2021.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-register-age",
      question:
        "¿La referencia de 2021 permite presumir que el diseño describe ejercicios posteriores?",
      answer:
        "No. Esta ficha conserva literalmente la referencia temporal del catálogo y no extiende su alcance.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-static-form",
      question:
        "¿Se ha localizado un formulario PDF estático y vacío del Modelo 237?",
      answer:
        "No en las fuentes registradas. La AEAT ofrece instrucciones web y una referencia técnica de diseño de registro.",
      sourceIds: [
        "aeat.model-237.procedure-home.2026-07-01",
        "aeat.model-237.instructions.2026-06-10",
        REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-237-faq-laws",
      question: "¿Qué normativa principal registra la ficha?",
      answer:
        "La Orden HFP/1430/2021 como norma de aprobación y la Orden HAP/2762/2015 como normativa de tramitación citada por la ficha administrativa.",
      sourceIds: [
        "boe.model-237.order-hfp-1430-2021",
        "boe.model-237.processing-order-hap-2762-2015",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-237.procedure-home.2026-07-01",
      "aeat.model-237.procedure-record.2026-06-10",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"237">;

const MODEL_238_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_RELEASE_ID_V1,
  code: "238",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa para la comunicación de información por parte de operadores de plataformas",
  summary:
    "Declaración informativa que la AEAT relaciona con la comunicación de información por operadores de plataformas en el marco DAC7.",
  searchTerms: [
    "modelo 238",
    "operadores de plataformas",
    "plataformas digitales",
    "DPI DAC7",
    "DAC7",
    "declaración informativa",
    "actividades de vendedores",
    "formulario modelo 238",
    "importación CSV modelo 238",
    "servicio web modelo 238",
    "mensajes XML modelo 238",
    "manual técnico modelo 238",
    "preguntas frecuentes modelo 238",
    "Real Decreto 117 2024",
    "Orden HAC 72 2024",
  ],
  sections: [
    {
      id: "model-238-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-238-purpose-identity",
          heading: "Comunicación de información por operadores de plataformas",
          text: "El índice oficial y la página del procedimiento identifican el Modelo 238 como una declaración informativa para la comunicación de información por parte de operadores de plataformas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-238.procedure-home.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-238-purpose-framework",
          heading: "Marco DAC7 descrito por la AEAT",
          text: "La ficha administrativa relaciona el procedimiento con DAC7 y con la información comunicada por operadores de plataformas. Esta página no evalúa supuestos particulares ni extrae consecuencias tributarias.",
          sourceIds: [
            "aeat.model-238.procedure-record.2026-07-08",
            "aeat.model-238.faq-sellers.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-238-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-238-access-browser-file",
          heading: "Formulario web e importación de ficheros",
          text: "La ayuda técnica describe un formulario en navegador, la conservación de sesiones y la importación de ficheros CSV para determinados bloques. La referencia es informativa y no inicia ninguna presentación desde esta web.",
          sourceIds: [
            "aeat.model-238.procedure-home.2026-07-08",
            "aeat.model-238.browser-help.2026-04-22",
            "aeat.model-238.form-resources.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-238-access-web-service",
          heading: "Servicio web documentado sin endpoint de presentación",
          text: "La AEAT publica información, esquemas y un manual técnico para un servicio web basado en mensajes XML. Esta ficha acredita el canal mediante esas ayudas válidas, pero no registra ni reconstruye un endpoint de presentación.",
          sourceIds: [
            "aeat.model-238.web-service-information.2026-06-09",
            "aeat.model-238.web-service-manual-page.2026-06-09",
            "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-238-access-no-static-form",
          heading: "Manuales PDF, no formularios PDF en blanco",
          text: "Los dos PDF actuales registrados son manuales de ayuda para el formulario y el servicio web. No son formularios oficiales estáticos y vacíos, por lo que la ficha representa los canales digitales y no muestra una miniatura de formulario.",
          sourceIds: [
            "aeat.model-238.form-manual-pdf.captured-2026-07-13",
            "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-238-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-238-details-form-resources",
          heading: "Manual y recursos de importación",
          text: "La página de ayuda del formulario enlaza un manual PDF y plantillas y ejemplos CSV. Esta ficha conserva la referencia externa a la página de recursos sin incorporar datos de ejemplo a la aplicación.",
          sourceIds: [
            "aeat.model-238.form-resources.2026-07-08",
            "aeat.model-238.form-manual-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-238-details-web-service-resources",
          heading: "Esquemas y manual técnico versionados",
          text: "La ayuda del servicio web enlaza un paquete de esquemas XSD y WSDL y presenta la versión 1.2 del manual técnico; también mantiene una página separada para versiones anteriores. Esta ficha no convierte esos materiales en transporte AEAT.",
          sourceIds: [
            "aeat.model-238.web-service-information.2026-06-09",
            "aeat.model-238.web-service-manual-page.2026-06-09",
            "aeat.model-238.web-service-previous-manuals.2026-06-09",
            "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-238-details-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La AEAT publica un bloque de preguntas frecuentes con páginas separadas de normativa, cuestiones generales y otros apartados informativos. Se enlaza como material externo y no se transforma en reglas de decisión.",
          sourceIds: [
            "aeat.model-238.faq-index.2026-07-08",
            "aeat.model-238.faq-general.2026-07-08",
            "aeat.model-238.faq-sellers.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-238-details-laws",
          heading: "Normativa oficial registrada",
          text: "La página oficial y la ficha administrativa citan el Real Decreto 117/2024 y la Orden HAC/72/2024. Esta última aprueba los modelos 040 y 238 y establece las condiciones y el procedimiento para su presentación.",
          sourceIds: [
            "boe.model-238.royal-decree-117-2024",
            "boe.model-238.order-hac-72-2024",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-238.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 238 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI52.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "408e8ed55a582ab7462c4dbc716a730c78886d213b56ab6589cfb1f373293768",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 238",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI52.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "27ddc53b23ea8cdaa51e442e733b434ef4555a382c6b06f3cd80ff80e7bd13ed",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.browser-help.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 238 · ayuda del formulario",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-289/modelo-238.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4408c297b68bb70f267f9f5b05ae59bd2b63644f240d775d3d634efa6d94b139",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.faq-index.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Modelo 238 · preguntas frecuentes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/preguntas-frecuentes.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c120bf08b687f27f989a6f27b4b0cfbfedecd7a6af10e62ff8ed7722ef8a1bc2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.faq-general.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Modelo 238 · preguntas frecuentes · cuestiones generales",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/preguntas-frecuentes/cuestiones-generales.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2ccd35d837042ce4c4fcbd231a444e24f522da32c7f9d20d6ce83f961fd01c60",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.faq-sellers.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Modelo 238 · DAC7 · información para vendedores",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/preguntas-frecuentes/dac-7-informacion-vendedores.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cedddeda89d0d8974aca7dc0e5c93feb0565157c7a1db9601937ad8b96922f68",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.web-service-information.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title:
        "Modelo 238 · información sobre presentación mediante servicio web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/informacion-sobre-presentacion-mediante-web-service.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ddc7e034cb52b8e4511ac1deda808b77b0fc1bee91cccedee3aef395c362d18d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.web-service-manual-page.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Modelo 238 · manual técnico del servicio web",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/informacion-sobre-presentacion-mediante-web-service/manual-tecnico-presentacion-modelo-238.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0ecb7c4ad3d6f06878c89d1607c87ba95db53100a1347055895acb3ef6aa140c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.web-service-previous-manuals.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Modelo 238 · versiones anteriores de manuales técnicos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/informacion-sobre-presentacion-mediante-web-service/versiones-anteriores-manuales-tecnicos.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cce9de160c2f65bbe6b29c4e391aa103f510a269344323ce94ff5555e24d4b67",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title:
        "Manual técnico del Modelo 238 mediante servicio web · versión 1.2",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI52/WS/DPI-DAC7-Presentacion-238-SWeb-v1.2.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cafac2ce2b01948b0a55382dc9abe1ecb53e612abfbb95245a48d999b19d9dee",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.form-resources.2026-07-08",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title:
        "Modelo 238 · información sobre presentación mediante formulario de ayuda",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-238-decl_____informacion-parte-operadores-plataformas/informacion-sobre-presentacion-mediante-formulario-ayuda.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8e36f822143a18834deeef9e2d1e68a6a45c75521d2b1899a3d5b775aad4527a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-238.form-manual-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title:
        "Manual para la presentación del Modelo 238 mediante formulario · versión 1.0",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI52/Formulario/M238_Formulario_ayuda_1.0.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8d05db2784ca94075937fb35f2390954993b0924490086fb70547ea13a88a402",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-238.royal-decree-117-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 117/2024, de 30 de enero",
      canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1771",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c802bbeaad0cb29f21ab3df9a8e2a80b313d8737ac1143ab014715cde8047399",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-238.order-hac-72-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/72/2024, de 1 de febrero",
      canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-2092",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f0e8a97bd731f9943b6fce93fcf2db8d13ab35d06fdf0988b7dc9b8978597290",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-238-web-service-manual-document",
      kind: "GUIDE",
      title: "Manual técnico del servicio web · versión 1.2",
      sourceId: "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-238.web-service-manual-page.2026-06-09",
      mediaType: "application/pdf",
      fileName: "DPI-DAC7-Presentacion-238-SWeb-v1.2.pdf",
      byteLength: 426657,
      pageCount: 38,
      sha256:
        "cafac2ce2b01948b0a55382dc9abe1ecb53e612abfbb95245a48d999b19d9dee",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-238-form-manual-document",
      kind: "GUIDE",
      title: "Manual para el formulario de ayuda · versión 1.0",
      sourceId: "aeat.model-238.form-manual-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-238.form-resources.2026-07-08",
      mediaType: "application/pdf",
      fileName: "M238_Formulario_ayuda_1.0.pdf",
      byteLength: 918601,
      pageCount: 26,
      sha256:
        "8d05db2784ca94075937fb35f2390954993b0924490086fb70547ea13a88a402",
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
      id: "model-238-link-procedure",
      label: "Página oficial del Modelo 238",
      sourceId: "aeat.model-238.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-238.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-browser-help",
      label: "Ayuda oficial del formulario",
      sourceId: "aeat.model-238.browser-help.2026-04-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-238.faq-index.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-web-service-information",
      label: "Información oficial del servicio web",
      sourceId: "aeat.model-238.web-service-information.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-web-service-manual",
      label: "Manual técnico del servicio web · versión 1.2",
      sourceId: "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-previous-manuals",
      label: "Versiones anteriores de manuales técnicos",
      sourceId: "aeat.model-238.web-service-previous-manuals.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-form-resources",
      label: "Manual y recursos oficiales del formulario",
      sourceId: "aeat.model-238.form-resources.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-form-manual",
      label: "Manual oficial del formulario · versión 1.0",
      sourceId: "aeat.model-238.form-manual-pdf.captured-2026-07-13",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-royal-decree",
      label: "Real Decreto 117/2024",
      sourceId: "boe.model-238.royal-decree-117-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-link-order",
      label: "Orden HAC/72/2024",
      sourceId: "boe.model-238.order-hac-72-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-238-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 238?",
      answer:
        "Una declaración informativa para la comunicación de información por parte de operadores de plataformas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-framework",
      question: "¿Con qué marco relaciona la AEAT este modelo?",
      answer:
        "Con DAC7 y con el intercambio de información comunicada por operadores de plataformas.",
      sourceIds: [
        "aeat.model-238.procedure-record.2026-07-08",
        "boe.model-238.royal-decree-117-2024",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-channels",
      question: "¿Qué canales técnicos describen las fuentes oficiales?",
      answer:
        "Un formulario en navegador con recursos de importación y un servicio web basado en mensajes XML.",
      sourceIds: [
        "aeat.model-238.browser-help.2026-04-22",
        "aeat.model-238.form-resources.2026-07-08",
        "aeat.model-238.web-service-information.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-endpoint",
      question: "¿Esta ficha publica un endpoint de presentación?",
      answer:
        "No. El canal de servicio web se acredita mediante información, esquemas y manuales oficiales; esta aplicación no conserva ni reconstruye un destino de presentación.",
      sourceIds: [
        "aeat.model-238.web-service-information.2026-06-09",
        "aeat.model-238.web-service-manual-page.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-web-service-materials",
      question:
        "¿Qué materiales técnicos publica la AEAT para el servicio web?",
      answer:
        "Un paquete de esquemas XSD y WSDL, un manual técnico identificado como versión 1.2 y una página separada de versiones anteriores.",
      sourceIds: [
        "aeat.model-238.web-service-information.2026-06-09",
        "aeat.model-238.web-service-manual-page.2026-06-09",
        "aeat.model-238.web-service-previous-manuals.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-form-materials",
      question: "¿Qué recursos publica la AEAT para el formulario?",
      answer:
        "Un manual PDF y plantillas y ejemplos CSV para las importaciones descritas por la ayuda.",
      sourceIds: ["aeat.model-238.form-resources.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-static-form",
      question:
        "¿Los PDF registrados son formularios oficiales estáticos y vacíos?",
      answer:
        "No. Son manuales de ayuda de veintiséis y treinta y ocho páginas dedicados al formulario y al servicio web.",
      sourceIds: [
        "aeat.model-238.form-manual-pdf.captured-2026-07-13",
        "aeat.model-238.web-service-manual-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-new-tax",
      question:
        "¿Presenta la información para vendedores DAC7 un impuesto nuevo?",
      answer:
        "No. La página oficial explica que DAC7 tiene una finalidad informativa y de intercambio de información; esta ficha no deriva de ello consecuencias tributarias individuales.",
      sourceIds: ["aeat.model-238.faq-sellers.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-238-faq-laws",
      question: "¿Qué normativa principal registra la ficha?",
      answer:
        "El Real Decreto 117/2024 y la Orden HAC/72/2024, ambos citados por la página oficial y la ficha administrativa.",
      sourceIds: [
        "boe.model-238.royal-decree-117-2024",
        "boe.model-238.order-hac-72-2024",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-238.browser-help.2026-04-22",
      "aeat.model-238.form-resources.2026-07-08",
      "aeat.model-238.web-service-information.2026-06-09",
      "aeat.model-238.web-service-manual-page.2026-06-09",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"238">;

const MODEL_239_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_RELEASE_ID_V1,
  code: "239",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa de mecanismos de planificación fiscal en el ámbito del AMAC sobre intercambio automático relativo a los mecanismos de elusión del estándar común de comunicación de información y las estructuras extraterritoriales opacas",
  summary:
    "Declaración informativa vinculada al AMAC cuya disponibilidad la página de la AEAT condiciona a que exista alguna jurisdicción respecto de la que el acuerdo surta efectos.",
  searchTerms: [
    "modelo 239",
    "declaración informativa",
    "mecanismos de planificación fiscal",
    "AMAC",
    "Acuerdo Multilateral entre Autoridades Competentes",
    "intercambio automático de información",
    "mecanismos de elusión",
    "estándar común de comunicación de información",
    "estructuras extraterritoriales opacas",
    "presentación futura modelo 239",
    "Orden HAC 266 2024",
    "artículo 49 ter Real Decreto 1065 2007",
  ],
  sections: [
    {
      id: "model-239-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-239-purpose-identity",
          heading: "Mecanismos de planificación fiscal en el ámbito del AMAC",
          text: "El índice de modelos y la página del procedimiento identifican el Modelo 239 con la declaración informativa de mecanismos de planificación fiscal en el ámbito del AMAC sobre intercambio automático relativo a mecanismos de elusión y estructuras extraterritoriales opacas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-239.procedure-home.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-239-purpose-record",
          heading: "Descripción administrativa del procedimiento",
          text: "La ficha administrativa relaciona el procedimiento con determinados mecanismos de planificación fiscal dentro del Acuerdo Multilateral. Esta página no determina sujetos, supuestos ni aplicabilidad.",
          sourceIds: ["aeat.model-239.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-239-access",
      title: "Disponibilidad condicionada",
      kind: "ACCESS",
      items: [
        {
          id: "model-239-access-future",
          heading: "Presentación aún no disponible según la página oficial",
          text: "La AEAT indica expresamente que la presentación estará disponible una vez exista alguna jurisdicción respecto de la que surta efectos el Acuerdo Multilateral. La publicación del acuerdo o del modelo no se interpreta como disponibilidad actual.",
          sourceIds: [
            "aeat.model-239.procedure-home.2026-07-08",
            "boe.model-239.multilateral-agreement-2023",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-239-access-electronic-description",
          heading: "Canal electrónico descrito como futuro",
          text: "La ficha administrativa clasifica la tramitación como electrónica, pero esa descripción no sustituye la condición de disponibilidad publicada en la página principal. El canal se conserva únicamente con estado futuro.",
          sourceIds: [
            "aeat.model-239.procedure-home.2026-07-08",
            "aeat.model-239.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-239-access-no-actionable-links",
          heading: "Sin destinos de gestión accionables",
          text: "La página enumera presentación, consulta y aportación documental, pero los tres rótulos remiten a la propia página y no proporcionan destinos de gestión. Esta ficha no reconstruye ni inventa esos enlaces.",
          sourceIds: ["aeat.model-239.procedure-home.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-239-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-239-details-materials",
          heading: "Sin instrucciones, FAQ o documentos registrados",
          text: "Las páginas oficiales registradas no ofrecen instrucciones, preguntas frecuentes ni un formulario PDF estático del Modelo 239. La ficha conserva únicamente la información institucional y normativa disponible.",
          sourceIds: [
            "aeat.model-239.procedure-home.2026-07-08",
            "aeat.model-239.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-239-details-laws",
          heading: "Normativa oficial registrada",
          text: "La ficha administrativa cita el artículo 49 ter del Real Decreto 1065/2007 y la Orden HAC/266/2024. La página principal enlaza además el Acuerdo Multilateral publicado en 2023, sin que su mera publicación active la presentación.",
          sourceIds: [
            "boe.model-239.royal-decree-1065-2007-article-49-ter",
            "boe.model-239.order-hac-266-2024",
            "boe.model-239.multilateral-agreement-2023",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-239.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 239 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI57.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a54e4aa8a94deb1c618245c838c5098f26abc12d794226bff4aab578a87a2572",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-239.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 239",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI57.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9d792a9174c58de6947ba80984e2d5f5eb7fbaba10fb505e0f6156a4af35f6b2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-239.royal-decree-1065-2007-article-49-ter",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 1065/2007, de 27 de julio · artículo 49 ter",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&p=20250402&tn=1#a4-4",
      officialUpdatedOn: "2025-04-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "34a9f6aa791b4b51089751a820cdf9fbb3eee1b51c065ccfef8172e3ea5a1c44",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-239.order-hac-266-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/266/2024, de 18 de marzo",
      canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-5722",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a11cb2ffc7adebfaafd8c491287c94e9fa3057933ab2a15cc394113be7cc38af",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-239.multilateral-agreement-2023",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Acuerdo Multilateral entre Autoridades Competentes",
      canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-19539",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8458f8497d38079dae82a4374b0ab2c50039489d4371a436f7832d9230a73694",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-239-link-procedure",
      label: "Página oficial del Modelo 239",
      sourceId: "aeat.model-239.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-239.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-link-royal-decree",
      label: "Real Decreto 1065/2007 · artículo 49 ter",
      sourceId: "boe.model-239.royal-decree-1065-2007-article-49-ter",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-link-order",
      label: "Orden HAC/266/2024",
      sourceId: "boe.model-239.order-hac-266-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-link-agreement",
      label: "Acuerdo Multilateral entre Autoridades Competentes",
      sourceId: "boe.model-239.multilateral-agreement-2023",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-239-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 239?",
      answer:
        "Una declaración informativa de mecanismos de planificación fiscal en el ámbito del AMAC sobre intercambio automático relativo a mecanismos de elusión y estructuras extraterritoriales opacas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-framework",
      question: "¿Con qué marco relaciona la AEAT el procedimiento?",
      answer:
        "Con el Acuerdo Multilateral entre Autoridades Competentes sobre intercambio automático de información relativo a esos mecanismos y estructuras.",
      sourceIds: [
        "aeat.model-239.procedure-record.2026-07-08",
        "boe.model-239.multilateral-agreement-2023",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-available",
      question: "¿Está disponible actualmente la presentación del Modelo 239?",
      answer:
        "La página de la AEAT no la muestra como disponible: la condiciona a que exista alguna jurisdicción respecto de la que surta efectos el Acuerdo Multilateral.",
      sourceIds: ["aeat.model-239.procedure-home.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-publication",
      question:
        "¿La publicación del modelo o del acuerdo activa por sí sola el canal?",
      answer:
        "No se presupone. Esta ficha conserva la condición de disponibilidad publicada por la AEAT y no deriva activación de la mera publicación normativa.",
      sourceIds: [
        "aeat.model-239.procedure-home.2026-07-08",
        "boe.model-239.order-hac-266-2024",
        "boe.model-239.multilateral-agreement-2023",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-channel",
      question: "¿Qué canal describe la ficha administrativa?",
      answer:
        "Una tramitación electrónica, conservada aquí únicamente como descripción futura por la condición visible en la página principal.",
      sourceIds: [
        "aeat.model-239.procedure-home.2026-07-08",
        "aeat.model-239.procedure-record.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-action-labels",
      question: "¿Los rótulos de gestiones proporcionan destinos accionables?",
      answer:
        "No. Los rótulos registrados remiten a la propia página del Modelo 239, por lo que esta ficha no expone enlaces de presentación, consulta ni aportación.",
      sourceIds: ["aeat.model-239.procedure-home.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-materials",
      question:
        "¿Se han localizado instrucciones, FAQ o formularios descargables?",
      answer:
        "No en las fuentes registradas. La página ofrece información normativa y la ficha administrativa del procedimiento.",
      sourceIds: [
        "aeat.model-239.procedure-home.2026-07-08",
        "aeat.model-239.procedure-record.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-239-faq-laws",
      question: "¿Qué normativa principal registra la ficha?",
      answer:
        "El artículo 49 ter del Real Decreto 1065/2007, la Orden HAC/266/2024 y el Acuerdo Multilateral publicado en 2023.",
      sourceIds: [
        "boe.model-239.royal-decree-1065-2007-article-49-ter",
        "boe.model-239.order-hac-266-2024",
        "boe.model-239.multilateral-agreement-2023",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED_FUTURE",
    sourceIds: [
      "aeat.model-239.procedure-home.2026-07-08",
      "aeat.model-239.procedure-record.2026-07-08",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"239">;

export const PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_CONTENT_V1 =
  deepFreeze([
    MODEL_237_CONTENT,
    MODEL_238_CONTENT,
    MODEL_239_CONTENT,
  ] as const);
