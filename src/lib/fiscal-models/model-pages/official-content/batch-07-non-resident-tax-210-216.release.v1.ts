import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_RELEASE_ID_V1 =
  "public-aeat-official-batch-07-non-resident-tax-210-216.2026-07-13.v1" as const;

export type PublicAeatBatch07NonResidentTax210216CodeV1 =
  "210" | "211" | "213" | "216";

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

const COUNTRY_CODES_SOURCE = {
  id: "aeat.irnr.country-codes-pdf.2014-06-04",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Códigos de países y territorios",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/C_paises/codpaises.pdf",
  officialUpdatedOn: "2014-06-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ce8b80e56456a9d344593697a978216ce1e393fce237a37c52ba10aebd4f5ffe",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_EHA_3316_2010_SOURCE = {
  id: "boe.models-210-211-213.order-eha-3316-2010",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3316/2010, de 17 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-19707",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2bb9fb4ef8642e4128d73ee84d0e7a2a87d028bb0c1cdb829ec87b832457a4a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_623_2026_SOURCE = {
  id: "boe.models-210-213.order-hac-623-2026",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/623/2026, de 12 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-13573",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "84cb2a0ada3ff40d37442a1db69f14e5205a762b830bfb6e315137b3cb21fa1e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_1338_2023_SOURCE = {
  id: "boe.models-210-211-213.order-hfp-1338-2023",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1338/2023, de 13 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-25416",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "174e8843cd93bbea40ad5821e6ae4635296efdcc367ead49af5a2f4bb0f5bd7f",
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

const ORDER_EHA_3290_2008_SOURCE = {
  id: "boe.model-216.order-eha-3290-2008",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3290/2008, de 6 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2008-18497",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1c3b73bf802d729d6de2d260c5e4e21bd35c20ea293a8eaea84c3157e5c4e6c1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_56_2024_SOURCE = {
  id: "boe.model-216.order-hac-56-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/56/2024, de 25 de enero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1772",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "803f30d7b6de0f8f36eda413a5c61bce1245333cf1e6347893f26d1dd95af3ce",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2194_2013_SOURCE = {
  id: "boe.model-216.order-hap-2194-2013",
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

const INTERNET_PRESENTATION_ORDER_2000_SOURCE = {
  id: "boe.model-216.internet-order-2000",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 21 de diciembre de 2000",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2000-24116",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6320f8e56a11914b610cf1a958a32aafccc83333b7ee8e0fd34c6978bf7fa563",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_210_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_RELEASE_ID_V1,
  code: "210",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRNR- Impuesto sobre la Renta de no residentes sin establecimiento permanente. Declaración ordinaria.",
  summary:
    "Declaración ordinaria que la AEAT identifica con el Impuesto sobre la Renta de no Residentes sin establecimiento permanente.",
  searchTerms: [
    "modelo 210",
    "IRNR",
    "impuesto sobre la renta de no residentes",
    "sin establecimiento permanente",
    "declaración ordinaria",
    "predeclaración modelo 210",
    "formulario modelo 210",
    "fichero .210",
    "diseño de registro 210",
    "rentas imputadas",
    "arrendamiento de inmuebles",
    "dividendos no residentes",
    "validación TIN",
    "Orden EHA 3316 2010",
    "Orden HAC 623 2026",
  ],
  sections: [
    {
      id: "model-210-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-210-purpose-identity",
          heading: "Declaración ordinaria del IRNR",
          text: "El índice general de modelos y las páginas del procedimiento identifican el Modelo 210 con la declaración ordinaria del Impuesto sobre la Renta de no Residentes sin establecimiento permanente.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-210.procedure-home.2026-07-02",
            "aeat.model-210.procedure-record.2026-07-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-210-purpose-record",
          heading: "Finalidad administrativa descrita",
          text: "La ficha administrativa señala que el procedimiento facilita la presentación de esa declaración. Esta referencia no decide si el modelo corresponde a una persona o situación concreta.",
          sourceIds: ["aeat.model-210.procedure-record.2026-07-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-210-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-210-access-browser-file",
          heading: "Formulario web y fichero .210",
          text: "La ayuda oficial describe un formulario en navegador que permite importar y exportar un fichero con extensión .210. También registra una opción informativa para recuperar datos de declaraciones anteriores.",
          sourceIds: [
            "aeat.model-210.procedure-home.2026-07-02",
            "aeat.model-210.electronic-help.2026-07-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-210-access-paper",
          heading: "Predeclaración generada desde el navegador",
          text: "La AEAT explica que la modalidad en papel parte de un formulario de predeclaración que genera el PDF después de cumplimentarlo. No publica en esta ficha un formulario estático y vacío que pueda representarse como miniatura.",
          sourceIds: ["aeat.model-210.paper-help.2026-07-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-210-access-register-design",
          heading: "Diseño de registro identificado para 2026",
          text: "El catálogo técnico de la AEAT enlaza un diseño de registro del Modelo 210 rotulado para devengos a partir de 2026. Se registra la existencia del material técnico, sin reproducir su estructura.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-210-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-210-details-instructions",
          heading: "Instrucciones y nota oficial de 2026",
          text: "La página principal enlaza instrucciones en formato web y una nota específica sobre cambios introducidos en 2026. Ambos recursos se conservan como información oficial externa.",
          sourceIds: [
            "aeat.model-210.instructions.2026-07-02",
            "aeat.model-210.order-hac-623-note.2026-07-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-210-details-examples",
          heading: "Ejemplos oficiales separados del formulario",
          text: "La AEAT mantiene una página de ejemplos de cumplimentación sobre distintas clases de renta. Los PDF enlazados contienen casos ya cumplimentados de ejercicios anteriores y no se presentan aquí como formularios actuales ni como miniaturas.",
          sourceIds: ["aeat.model-210.examples.2026-06-24"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-210-details-supporting-information",
          heading: "Información complementaria",
          text: "La sede publica páginas informativas separadas sobre las modalidades descritas por la AEAT y sobre portales externos de validación de TIN. Esta ficha no realiza validaciones ni inicia operaciones.",
          sourceIds: [
            "aeat.model-210.presentation-info.2026-07-09",
            "aeat.model-210.tin-info.2026-07-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-210-details-laws",
          heading: "Normas oficiales registradas",
          text: "La Orden EHA/3316/2010 aprobó los modelos 210, 211 y 213. La Orden HAC/623/2026 modifica esa orden y figura también en las referencias oficiales del Modelo 210.",
          sourceIds: [
            ORDER_EHA_3316_2010_SOURCE.id,
            ORDER_HAC_623_2026_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-210.procedure-home.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 210 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF00.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d43632280eb41000065b2f12a226934bf62ad05adb6714b253de9aa792eb89a4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.procedure-record.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 210",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF00.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "175b229b19cc8080c22dfb1975f7e397cfa2e13413bb8af354ce68c854ade574",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.electronic-help.2026-07-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 210",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-210/presentacion-electronica-modelo-210.html",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8915ed1cdf827daa5a9ce4385cb3ed4fd318518b76a4d360f75dd612415d594c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.paper-help.2026-07-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Formulario del Modelo 210 para presentación en papel",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-210/formulario-modelo-210-presentacion-papel.html",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0b585af48ad3923cf0f0e2a6e55202b32ec21ddad080b1ffc54bb9297b337261",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.instructions.2026-07-02",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 210",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-210-irnr______a-no-residentes-permanente_/instrucciones.html",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e399123d84b491d5168d20cae1ba795aa782594c198dee04091b3075dae6a091",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.order-hac-623-note.2026-07-02",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Nota sobre modificaciones introducidas por la Orden HAC/623/2026",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-210-irnr______a-no-residentes-permanente_/nota-modificaciones-plazos-presentacion-modelo-210.html",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9bdae9718ba8cbce2385bab4cc1e2cb9357e1c79c4b78975bd052b5d1845d912",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.examples.2026-06-24",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Ejemplos de cumplimentación del Modelo 210",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-210-irnr______a-no-residentes-permanente_/ejemplos-cumplimentacion.html",
      officialUpdatedOn: "2026-06-24",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "873e0386c9b562d23a8b4f0f39a9e3fb2dac0bfe40b0877840e9e9fc7e266cb5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.presentation-info.2026-07-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Formas de presentación y pago del Modelo 210",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-210-irnr______a-no-residentes-permanente_/formas-presentacion-pago-modelo-210.html",
      officialUpdatedOn: "2026-07-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cdf307de9f60729d49bb140a1828f69a4e899b6f5a3a697b25b70e6988a60a2d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-210.tin-info.2026-07-02",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Portales web para validaciones de TIN",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-210-irnr______a-no-residentes-permanente_/portales-web-validaciones-tin.html",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9354aff911fe26077b7821fc0dd471bbe637e7b626fd3e21e362e1d23fe27208",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    COUNTRY_CODES_SOURCE,
    ORDER_EHA_3316_2010_SOURCE,
    ORDER_HAC_623_2026_SOURCE,
  ],
  documents: [
    {
      id: "model-210-country-codes",
      kind: "GUIDE",
      title: "Códigos de países y territorios",
      sourceId: COUNTRY_CODES_SOURCE.id,
      landingPageSourceId: "aeat.model-210.procedure-home.2026-07-02",
      mediaType: "application/pdf",
      fileName: "codpaises.pdf",
      byteLength: 27829,
      pageCount: 2,
      sha256:
        "ce8b80e56456a9d344593697a978216ce1e393fce237a37c52ba10aebd4f5ffe",
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
      id: "model-210-link-procedure",
      label: "Página oficial del Modelo 210",
      sourceId: "aeat.model-210.procedure-home.2026-07-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-210.procedure-record.2026-07-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-instructions",
      label: "Instrucciones oficiales del Modelo 210",
      sourceId: "aeat.model-210.instructions.2026-07-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-note-2026",
      label: "Nota oficial de cambios de 2026",
      sourceId: "aeat.model-210.order-hac-623-note.2026-07-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-examples",
      label: "Ejemplos oficiales de cumplimentación",
      sourceId: "aeat.model-210.examples.2026-06-24",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-register-designs",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-order-2010",
      label: "Orden EHA/3316/2010",
      sourceId: ORDER_EHA_3316_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-link-order-2026",
      label: "Orden HAC/623/2026",
      sourceId: ORDER_HAC_623_2026_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-210-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 210?",
      answer:
        "La declaración ordinaria del Impuesto sobre la Renta de no Residentes sin establecimiento permanente.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-faq-purpose",
      question: "¿Qué finalidad describe la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración ordinaria del IRNR sin establecimiento permanente, sin evaluar su aplicación a un caso concreto.",
      sourceIds: ["aeat.model-210.procedure-record.2026-07-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-faq-channels",
      question: "¿Qué canales informativos describe la AEAT?",
      answer:
        "Un formulario en navegador, importación y exportación de fichero .210 y una modalidad de predeclaración generada desde el formulario.",
      sourceIds: [
        "aeat.model-210.electronic-help.2026-07-02",
        "aeat.model-210.paper-help.2026-07-02",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-faq-static-pdf",
      question: "¿La AEAT enlaza un PDF estático y vacío del Modelo 210?",
      answer:
        "No en las fuentes registradas. La ayuda explica que el PDF de predeclaración se genera dinámicamente después de utilizar el formulario.",
      sourceIds: ["aeat.model-210.paper-help.2026-07-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-faq-examples",
      question: "¿Los PDF de ejemplos son formularios en blanco?",
      answer:
        "No. La página oficial los presenta como ejemplos de cumplimentación y los documentos contienen casos ya cumplimentados de ejercicios anteriores.",
      sourceIds: ["aeat.model-210.examples.2026-06-24"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-faq-register-design",
      question: "¿Publica la AEAT un diseño de registro del Modelo 210?",
      answer:
        "Sí. El catálogo técnico enlaza un diseño rotulado para devengos a partir de 2026.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-210-faq-laws",
      question: "¿Qué normas principales registra esta ficha?",
      answer:
        "La Orden EHA/3316/2010, que aprobó los modelos 210, 211 y 213, y la Orden HAC/623/2026, que modifica esa regulación.",
      sourceIds: [ORDER_EHA_3316_2010_SOURCE.id, ORDER_HAC_623_2026_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-210.procedure-home.2026-07-02",
      "aeat.model-210.electronic-help.2026-07-02",
      "aeat.model-210.paper-help.2026-07-02",
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"210">;

const MODEL_211_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_RELEASE_ID_V1,
  code: "211",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRNR- Impuesto sobre la Renta de no Residentes. Retención en la adquisición de bienes inmuebles a no residentes sin establecimiento permanente.",
  summary:
    "Declaración que la AEAT relaciona con la retención practicada en la adquisición de bienes inmuebles a no residentes sin establecimiento permanente.",
  searchTerms: [
    "modelo 211",
    "IRNR",
    "retención adquisición inmueble",
    "bienes inmuebles",
    "transmitente no residente",
    "adquirente de inmueble",
    "sin establecimiento permanente",
    "predeclaración modelo 211",
    "formulario modelo 211",
    "fichero .211",
    "presentación por lotes",
    "diseño de registro 211",
    "Orden EHA 3316 2010",
    "Orden HFP 1338 2023",
  ],
  sections: [
    {
      id: "model-211-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-211-purpose-identity",
          heading: "Retención en la adquisición de inmuebles",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 211 con la retención en la adquisición de bienes inmuebles a no residentes sin establecimiento permanente.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-211.procedure-home.2026-07-02",
            "aeat.model-211.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-211-purpose-record",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de la declaración correspondiente. Esta descripción no establece su aplicabilidad a una operación concreta.",
          sourceIds: ["aeat.model-211.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-211-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-211-access-browser-file",
          heading: "Formulario web y fichero .211",
          text: "La ayuda oficial describe un formulario en navegador que permite guardar y cargar una sesión, además de importar y exportar un fichero con extensión .211. La página principal también enumera una modalidad por lotes.",
          sourceIds: [
            "aeat.model-211.procedure-home.2026-07-02",
            "aeat.model-211.electronic-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-211-access-paper",
          heading: "PDF de predeclaración generado desde la web",
          text: "La modalidad en papel se obtiene mediante una predeclaración que genera el PDF después de usar el formulario. Las fuentes registradas no enlazan un formulario estático y vacío.",
          sourceIds: ["aeat.model-211.paper-help.2026-02-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-211-access-register-design",
          heading: "Diseño de registro identificado desde 2023",
          text: "El catálogo técnico de la AEAT enlaza un diseño de registro del Modelo 211 rotulado para devengos desde 2023. Su estructura no se reproduce en esta ficha.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-211-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-211-details-instructions",
          heading: "Instrucciones y códigos de países",
          text: "La página oficial enlaza instrucciones en formato web y una relación común de códigos de países y territorios. El PDF se conserva como guía externa sin miniatura.",
          sourceIds: [
            "aeat.model-211.instructions.2026-06-09",
            COUNTRY_CODES_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-211-details-laws",
          heading: "Normativa oficial registrada",
          text: "La Orden EHA/3316/2010 aprobó el modelo y la Orden HFP/1338/2023 figura como modificación posterior en la página oficial. La ficha administrativa también enlaza la resolución de creación de la sede electrónica de la AEAT.",
          sourceIds: [
            ORDER_EHA_3316_2010_SOURCE.id,
            ORDER_HFP_1338_2023_SOURCE.id,
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
      id: "aeat.model-211.procedure-home.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 211 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF01.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2c00c2a16d94a6d4f63f0e2b4d6a50f81b6e7c1e59fd237a297aa3f5bad66ede",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-211.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 211",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF01.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "60068443ee84cc9af973926d434791ed97391d57ac26e0077b2682569c411b31",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-211.electronic-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 211",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-211/presentacion-electronica-modelo-211.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9b257d66d5653d6bfbc23e86c1792e2494f61edf5440c4c4e54efad8acad5fe8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-211.paper-help.2026-02-10",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Formulario del Modelo 211 para presentación en papel",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-211/formulario-modelo-211-presentacion-papel.html",
      officialUpdatedOn: "2026-02-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d4955a774b0f51b939d53124fd7eebf1abac9edf11d0fc917a12eef736985799",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-211.instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 211",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-211-irnr______es-no-residentes-permanente_/instrucciones.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a78ad9e0086021ae2a1470fcb9e378a5bf71d4e57c8f7d0653383078debadcec",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    COUNTRY_CODES_SOURCE,
    ORDER_EHA_3316_2010_SOURCE,
    ORDER_HFP_1338_2023_SOURCE,
    ELECTRONIC_OFFICE_RESOLUTION_2009_SOURCE,
  ],
  documents: [
    {
      id: "model-211-country-codes",
      kind: "GUIDE",
      title: "Códigos de países y territorios",
      sourceId: COUNTRY_CODES_SOURCE.id,
      landingPageSourceId: "aeat.model-211.procedure-home.2026-07-02",
      mediaType: "application/pdf",
      fileName: "codpaises.pdf",
      byteLength: 27829,
      pageCount: 2,
      sha256:
        "ce8b80e56456a9d344593697a978216ce1e393fce237a37c52ba10aebd4f5ffe",
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
      id: "model-211-link-procedure",
      label: "Página oficial del Modelo 211",
      sourceId: "aeat.model-211.procedure-home.2026-07-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-211.procedure-record.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-link-instructions",
      label: "Instrucciones oficiales del Modelo 211",
      sourceId: "aeat.model-211.instructions.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-link-register-designs",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-link-order-2010",
      label: "Orden EHA/3316/2010",
      sourceId: ORDER_EHA_3316_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-link-order-2023",
      label: "Orden HFP/1338/2023",
      sourceId: ORDER_HFP_1338_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-211-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 211?",
      answer:
        "La retención en la adquisición de bienes inmuebles a no residentes sin establecimiento permanente.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-faq-purpose",
      question: "¿Qué objeto describe la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración del IRNR asociada a esa retención, sin decidir su aplicación a una operación concreta.",
      sourceIds: ["aeat.model-211.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-faq-channels",
      question: "¿Qué canales describe la sede de la AEAT?",
      answer:
        "Un formulario en navegador, importación y exportación de fichero .211, una modalidad por lotes y una predeclaración generada desde la web.",
      sourceIds: [
        "aeat.model-211.procedure-home.2026-07-02",
        "aeat.model-211.electronic-help.2026-06-19",
        "aeat.model-211.paper-help.2026-02-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-faq-static-pdf",
      question: "¿Hay un PDF estático del formulario 211?",
      answer:
        "No en las fuentes registradas. La ayuda oficial indica que el PDF se obtiene al generar la predeclaración desde el formulario.",
      sourceIds: ["aeat.model-211.paper-help.2026-02-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-faq-instructions",
      question: "¿Qué material de consulta enlaza la página oficial?",
      answer:
        "Instrucciones en formato web y una guía común de códigos de países y territorios.",
      sourceIds: [
        "aeat.model-211.instructions.2026-06-09",
        COUNTRY_CODES_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-faq-register-design",
      question: "¿Publica la AEAT un diseño de registro del Modelo 211?",
      answer:
        "Sí. El catálogo técnico enlaza un diseño rotulado para devengos desde 2023.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-211-faq-laws",
      question: "¿Qué normas principales se registran?",
      answer:
        "La Orden EHA/3316/2010 y la modificación oficial publicada mediante la Orden HFP/1338/2023.",
      sourceIds: [ORDER_EHA_3316_2010_SOURCE.id, ORDER_HFP_1338_2023_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-211.procedure-home.2026-07-02",
      "aeat.model-211.electronic-help.2026-06-19",
      "aeat.model-211.paper-help.2026-02-10",
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"211">;

const MODEL_213_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_RELEASE_ID_V1,
  code: "213",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRNR. Gravamen especial sobre bienes inmuebles de entidades no residentes.",
  summary:
    "Autoliquidación que la AEAT identifica con el gravamen especial sobre bienes inmuebles de entidades no residentes.",
  searchTerms: [
    "modelo 213",
    "IRNR",
    "gravamen especial",
    "bienes inmuebles",
    "entidades no residentes",
    "autoliquidación",
    "predeclaración modelo 213",
    "formulario modelo 213",
    "fichero .213",
    "presentación por lotes",
    "diseño de registro 213",
    "Orden EHA 3316 2010",
    "Orden HFP 1338 2023",
    "Orden HAC 623 2026",
  ],
  sections: [
    {
      id: "model-213-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-213-purpose-identity",
          heading: "Gravamen especial sobre bienes inmuebles",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 213 con el gravamen especial sobre bienes inmuebles de entidades no residentes.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-213.procedure-home.2026-07-02",
            "aeat.model-213.procedure-record.2026-06-23",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-213-purpose-record",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de la autoliquidación del gravamen. Esta descripción no evalúa su aplicación a una entidad o inmueble concretos.",
          sourceIds: ["aeat.model-213.procedure-record.2026-06-23"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-213-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-213-access-browser-file",
          heading: "Formulario web y fichero .213",
          text: "La ayuda oficial describe un formulario en navegador que permite importar y exportar un fichero con extensión .213. La página principal enumera además una modalidad por lotes.",
          sourceIds: [
            "aeat.model-213.procedure-home.2026-07-02",
            "aeat.model-213.electronic-help.2026-02-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-213-access-paper",
          heading: "Predeclaración generada desde la web",
          text: "La ayuda de la modalidad en papel explica que el PDF se genera después de utilizar el formulario de predeclaración. No enlaza un formulario estático y vacío.",
          sourceIds: ["aeat.model-213.paper-help.2026-02-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-213-access-register-design",
          heading: "Diseño de registro identificado desde 2022",
          text: "El catálogo técnico enlaza un diseño de registro del Modelo 213 rotulado para devengos desde 2022. Su estructura no se reproduce en esta ficha.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-213-details",
      title: "Información y trazabilidad oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-213-details-instructions",
          heading: "Instrucciones y códigos de países",
          text: "La página oficial enlaza instrucciones en formato web y la relación común de códigos de países y territorios. El PDF se conserva como guía externa sin miniatura.",
          sourceIds: [
            "aeat.model-213.instructions.2026-07-01",
            COUNTRY_CODES_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-213-details-laws",
          heading: "Normativa oficial registrada",
          text: "La Orden EHA/3316/2010 aprobó el modelo y las órdenes HFP/1338/2023 y HAC/623/2026 modifican esa regulación.",
          sourceIds: [
            ORDER_EHA_3316_2010_SOURCE.id,
            ORDER_HFP_1338_2023_SOURCE.id,
            ORDER_HAC_623_2026_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-213.procedure-home.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 213 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF03.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b662d79ad2656d54a35ce365d702598724ac36cdd675334232ce5ae8d27192b5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-213.procedure-record.2026-06-23",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 213",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF03.shtml",
      officialUpdatedOn: "2026-06-23",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ec2854b83c12f518c6f4d08ebd5f221e8f79b05029ad1133d0c18ceeb44c0559",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-213.electronic-help.2026-02-10",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 213",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-213/presentacion-electronica-modelo-213.html",
      officialUpdatedOn: "2026-02-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cdfaad2bf8b6cf769ad9872ebde4b3f061960a3f8228420a092b2311921b9f49",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-213.paper-help.2026-02-10",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Formulario del Modelo 213 para presentación en papel",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-213/formulario-modelo-213-presentacion-papel.html",
      officialUpdatedOn: "2026-02-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f79369821c35249ca112ce399d13ce3687b8736989961a0cab9ee9aac15d65ac",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-213.instructions.2026-07-01",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 213",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-213-irnr______sobre-bienes-inmuebles-residentes_/instrucciones.html",
      officialUpdatedOn: "2026-07-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "05f1347afb194157fb25c5511cf95680897dcbfbac45b096aef14658abf59793",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    COUNTRY_CODES_SOURCE,
    ORDER_EHA_3316_2010_SOURCE,
    ORDER_HFP_1338_2023_SOURCE,
    ORDER_HAC_623_2026_SOURCE,
  ],
  documents: [
    {
      id: "model-213-country-codes",
      kind: "GUIDE",
      title: "Códigos de países y territorios",
      sourceId: COUNTRY_CODES_SOURCE.id,
      landingPageSourceId: "aeat.model-213.procedure-home.2026-07-02",
      mediaType: "application/pdf",
      fileName: "codpaises.pdf",
      byteLength: 27829,
      pageCount: 2,
      sha256:
        "ce8b80e56456a9d344593697a978216ce1e393fce237a37c52ba10aebd4f5ffe",
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
      id: "model-213-link-procedure",
      label: "Página oficial del Modelo 213",
      sourceId: "aeat.model-213.procedure-home.2026-07-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-213.procedure-record.2026-06-23",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-link-instructions",
      label: "Instrucciones oficiales del Modelo 213",
      sourceId: "aeat.model-213.instructions.2026-07-01",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-link-register-designs",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-link-order-2010",
      label: "Orden EHA/3316/2010",
      sourceId: ORDER_EHA_3316_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-link-order-2023",
      label: "Orden HFP/1338/2023",
      sourceId: ORDER_HFP_1338_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-link-order-2026",
      label: "Orden HAC/623/2026",
      sourceId: ORDER_HAC_623_2026_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-213-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 213?",
      answer:
        "El gravamen especial sobre bienes inmuebles de entidades no residentes.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-faq-purpose",
      question: "¿Qué objeto describe la ficha administrativa?",
      answer:
        "Facilitar la presentación de la autoliquidación del gravamen, sin evaluar su aplicación a una entidad concreta.",
      sourceIds: ["aeat.model-213.procedure-record.2026-06-23"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-faq-channels",
      question: "¿Qué canales describe la sede de la AEAT?",
      answer:
        "Un formulario en navegador, importación y exportación de fichero .213, una modalidad por lotes y una predeclaración generada desde la web.",
      sourceIds: [
        "aeat.model-213.procedure-home.2026-07-02",
        "aeat.model-213.electronic-help.2026-02-10",
        "aeat.model-213.paper-help.2026-02-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-faq-static-pdf",
      question: "¿Hay un PDF estático del formulario 213?",
      answer:
        "No en las fuentes registradas. La ayuda oficial explica que el PDF se genera desde la predeclaración web.",
      sourceIds: ["aeat.model-213.paper-help.2026-02-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-faq-instructions",
      question: "¿Qué material de consulta enlaza la página oficial?",
      answer:
        "Instrucciones en formato web y una guía común de códigos de países y territorios.",
      sourceIds: [
        "aeat.model-213.instructions.2026-07-01",
        COUNTRY_CODES_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-faq-register-design",
      question: "¿Publica la AEAT un diseño de registro del Modelo 213?",
      answer:
        "Sí. El catálogo técnico enlaza un diseño rotulado para devengos desde 2022.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-213-faq-laws",
      question: "¿Qué normas principales se registran?",
      answer:
        "La Orden EHA/3316/2010 y sus modificaciones publicadas mediante las órdenes HFP/1338/2023 y HAC/623/2026.",
      sourceIds: [
        ORDER_EHA_3316_2010_SOURCE.id,
        ORDER_HFP_1338_2023_SOURCE.id,
        ORDER_HAC_623_2026_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-213.procedure-home.2026-07-02",
      "aeat.model-213.electronic-help.2026-02-10",
      "aeat.model-213.paper-help.2026-02-10",
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"213">;

const MODEL_216_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_RELEASE_ID_V1,
  code: "216",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRNR. Impuesto sobre la Renta de no Residentes. Rentas obtenidas sin mediación de establecimiento permanente. Retenciones e ingresos a cuenta (declaración - documento de ingreso).",
  summary:
    "Declaración que la AEAT relaciona con retenciones e ingresos a cuenta del IRNR sobre rentas obtenidas sin mediación de establecimiento permanente.",
  searchTerms: [
    "modelo 216",
    "IRNR",
    "impuesto sobre la renta de no residentes",
    "retenciones no residentes",
    "ingresos a cuenta",
    "sin establecimiento permanente",
    "presentación 2024 y siguientes",
    "formulario modelo 216",
    "fichero .216",
    "presentación por lotes",
    "diseño de registro 216",
    "Orden EHA 3290 2008",
    "Orden HAP 2194 2013",
    "Orden HAC 56 2024",
  ],
  sections: [
    {
      id: "model-216-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-216-purpose-identity",
          heading: "Retenciones e ingresos a cuenta del IRNR",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 216 con retenciones e ingresos a cuenta sobre rentas obtenidas sin mediación de establecimiento permanente.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-216.procedure-home.2026-07-02",
            "aeat.model-216.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-216-purpose-record",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de la declaración e ingreso asociados a esas retenciones e ingresos a cuenta. Esta referencia no determina su aplicabilidad a un caso concreto.",
          sourceIds: ["aeat.model-216.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-216-access",
      title: "Canales y materiales descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-216-access-current",
          heading: "Formulario 2024 y siguientes",
          text: "La ayuda actual separa expresamente el formulario correspondiente a 2024 y siguientes. Describe un entorno en navegador con importación y exportación de fichero .216.",
          sourceIds: [
            "aeat.model-216.procedure-home.2026-07-02",
            "aeat.model-216.current-help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-216-access-file",
          heading: "Fichero y modalidad por lotes",
          text: "La página oficial enumera una modalidad por lotes y la ayuda actual vincula el fichero .216 con el diseño de registro correspondiente. Esta ficha solo registra esos canales.",
          sourceIds: [
            "aeat.model-216.procedure-home.2026-07-02",
            "aeat.model-216.current-help.2026-06-19",
            REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-216-access-register-design",
          heading: "Diseño de registro para 2024 y siguientes",
          text: "El catálogo técnico enlaza un diseño de registro del Modelo 216 rotulado para 2024 y siguientes. Su estructura no se reproduce en esta ficha.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-216-context",
      title: "Separación entre material actual y anterior",
      kind: "DETAILS",
      items: [
        {
          id: "model-216-context-current",
          heading: "Instrucciones de 2024 y siguientes",
          text: "La AEAT publica una página de instrucciones específica para 2024 y siguientes, coherente con el formulario actual identificado en la ayuda técnica.",
          sourceIds: [
            "aeat.model-216.current-help.2026-06-19",
            "aeat.model-216.current-instructions.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-216-context-legacy",
          heading: "Material 2018 a 2023 conservado como contexto",
          text: "La ayuda y las instrucciones para 2018 a 2023 se conservan separadas y se presentan únicamente como contexto anterior, sin confundirlas con el canal rotulado para 2024 y siguientes.",
          sourceIds: [
            "aeat.model-216.legacy-help.2026-06-19",
            "aeat.model-216.legacy-instructions.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-216-laws",
      title: "Normativa oficial registrada",
      kind: "DETAILS",
      items: [
        {
          id: "model-216-laws-approval",
          heading: "Aprobación y modificaciones",
          text: "La Orden EHA/3290/2008 aprobó el Modelo 216. Las órdenes HAP/2194/2013 y HAC/56/2024 figuran como modificaciones posteriores en la página oficial.",
          sourceIds: [
            ORDER_EHA_3290_2008_SOURCE.id,
            ORDER_HAP_2194_2013_SOURCE.id,
            ORDER_HAC_56_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-216-laws-procedure",
          heading: "Referencias de tramitación",
          text: "La página y la ficha administrativa enlazan asimismo la Orden HAP/2194/2013 y una orden de 2000 sobre presentación por internet. Se registran como referencias normativas, sin convertirlas en instrucciones operativas.",
          sourceIds: [
            ORDER_HAP_2194_2013_SOURCE.id,
            INTERNET_PRESENTATION_ORDER_2000_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-216.procedure-home.2026-07-02",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 216 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF05.shtml",
      officialUpdatedOn: "2026-07-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f9b492b2f2706b693f7c703c475de2c8497aff259b1a4fbfd862f5025132ffc5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-216.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 216",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF05.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d711333d45fca60f3e675415c4799c148505fabd3d0f763ed72c6689e158e471",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-216.current-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación del Modelo 216 · 2024 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-216/presentacion-modelo-216-ejercicio-2024-siguientes.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "abdcfaed8a905a3a648b584e5fac9ae655c75d27f1026cfda595362044b2fe1e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-216.legacy-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación del Modelo 216 · 2018 a 2023",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-216/presentacion-modelo-216.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e9fdf798c2f6dea2138cb9c468f41979b44175058c50da04640cc7cb2efce71a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-216.current-instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 216 · 2024 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-216-irnr______sos-cuenta-declaracion-ingreso_/instrucciones-modelo-216-presentacion-ejercicio-siguientes.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a4c15ad08e8670a9b18834824158303a3b8c2a26e067d77dca2ca015da2549de",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-216.legacy-instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 216 · 2018 a 2023",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-216-irnr______sos-cuenta-declaracion-ingreso_/instrucciones.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ffc23b4c8509c45b035d63f73b77a2611f7105634c257c89058af43cd56083e2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    ORDER_EHA_3290_2008_SOURCE,
    ORDER_HAC_56_2024_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
    INTERNET_PRESENTATION_ORDER_2000_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-216-link-procedure",
      label: "Página oficial del Modelo 216",
      sourceId: "aeat.model-216.procedure-home.2026-07-02",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-216.procedure-record.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-link-current-help",
      label: "Ayuda oficial para 2024 y siguientes",
      sourceId: "aeat.model-216.current-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-link-current-instructions",
      label: "Instrucciones oficiales para 2024 y siguientes",
      sourceId: "aeat.model-216.current-instructions.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-link-register-designs",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-link-order-2008",
      label: "Orden EHA/3290/2008",
      sourceId: ORDER_EHA_3290_2008_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-link-order-2024",
      label: "Orden HAC/56/2024",
      sourceId: ORDER_HAC_56_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-216-faq-identity",
      question: "¿Qué identifica oficialmente la AEAT con el Modelo 216?",
      answer:
        "Las retenciones e ingresos a cuenta del IRNR relacionados con rentas obtenidas sin mediación de establecimiento permanente.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-faq-purpose",
      question: "¿Qué finalidad describe la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración e ingreso asociados, sin evaluar si el modelo corresponde a un caso concreto.",
      sourceIds: ["aeat.model-216.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-faq-current-channel",
      question: "¿Qué canal identifica la AEAT para 2024 y siguientes?",
      answer:
        "Un formulario en navegador que permite importar y exportar ficheros .216 conformes con el diseño correspondiente.",
      sourceIds: ["aeat.model-216.current-help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-faq-legacy-material",
      question: "¿Qué representa el material de 2018 a 2023?",
      answer:
        "Una ayuda e instrucciones anteriores que la propia AEAT mantiene separadas del bloque rotulado para 2024 y siguientes.",
      sourceIds: [
        "aeat.model-216.legacy-help.2026-06-19",
        "aeat.model-216.legacy-instructions.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-faq-register-design",
      question: "¿Publica la AEAT un diseño de registro del Modelo 216?",
      answer:
        "Sí. El catálogo técnico enlaza un diseño rotulado para 2024 y siguientes.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-faq-static-pdf",
      question: "¿Hay un PDF estático del formulario 216 en estas fuentes?",
      answer:
        "No. Las fuentes registradas describen el formulario web y el fichero, pero no enlazan un formulario PDF estático y vacío.",
      sourceIds: [
        "aeat.model-216.procedure-home.2026-07-02",
        "aeat.model-216.current-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-216-faq-laws",
      question: "¿Qué normas principales se registran?",
      answer:
        "La Orden EHA/3290/2008, que aprobó el modelo, y las modificaciones publicadas mediante las órdenes HAP/2194/2013 y HAC/56/2024.",
      sourceIds: [
        ORDER_EHA_3290_2008_SOURCE.id,
        ORDER_HAP_2194_2013_SOURCE.id,
        ORDER_HAC_56_2024_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-216.procedure-home.2026-07-02",
      "aeat.model-216.current-help.2026-06-19",
      REGISTER_DESIGNS_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"216">;

export const PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_CONTENT_V1 =
  deepFreeze([
    MODEL_210_CONTENT,
    MODEL_211_CONTENT,
    MODEL_213_CONTENT,
    MODEL_216_CONTENT,
  ] as const);
