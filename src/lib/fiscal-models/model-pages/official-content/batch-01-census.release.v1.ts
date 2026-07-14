import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const REVIEWED_ON = "2026-07-13" as const;

const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

const deepFreeze = <Value>(value: Value): Value => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
    Object.freeze(value);
  }

  return value;
};

const MODEL_030 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-030-official-content.2026-07-13.v1",
  code: "030",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Censo de obligados tributarios. Declaración censal de alta, cambio de domicilio y/o de variación de datos personales.",
  summary:
    "Guía sencilla del Modelo 030: quién debe utilizarlo, cambios de domicilio, datos personales, solicitud de NIF, documentación y presentación.",
  searchTerms: [
    "modelo 030",
    "censo de obligados tributarios",
    "declaración censal",
    "domicilio fiscal",
    "variación de datos personales",
    "datos identificativos",
    "NIF",
    "persona física",
    "cambio de domicilio",
    "datos de contacto",
    "cambio domicilio tres meses",
    "modelo 030 autónomo",
    "modelo 030 cónyuge",
    "presentar modelo 030",
    "Agencia Tributaria",
  ],
  sections: [
    {
      id: "model-030-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-030-purpose-summary",
          heading: "Comunicación censal de datos personales",
          text: "La AEAT presenta el Modelo 030 como su declaración censal para el alta en el Censo de Obligados Tributarios y para comunicar cambios de domicilio o variaciones de datos personales en los supuestos descritos por la propia Agencia.",
          sourceIds: ["aeat.model-030.procedure-record.2026-07-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-030-scope",
      title: "Qué información abarca",
      kind: "SCOPE",
      items: [
        {
          id: "model-030-scope-census",
          heading: "Censo e identificación",
          text: "La ficha oficial relaciona el modelo con el Censo de Obligados Tributarios, la identificación fiscal de personas físicas y la actualización de datos personales.",
          sourceIds: [
            "aeat.model-030.procedure-record.2026-07-10",
            "aeat.model-030.instructions.2026-07-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-030-scope-address",
          heading: "Domicilio y datos de contacto",
          text: "El formulario oficial recoge, entre otros bloques, datos identificativos, domicilio fiscal, domicilio de notificaciones y datos de contacto.",
          sourceIds: ["boe.model-030.form-image.2025-01-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-030-access",
      title: "Información y acceso oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-030-access-channels",
          heading: "Canales que describe la AEAT",
          text: "La ficha del procedimiento recoge la vía telemática y otros canales de atención y registro de la AEAT. La Sede ofrece además una ayuda específica para la presentación electrónica.",
          sourceIds: [
            "aeat.model-030.procedure-record.2026-07-10",
            "aeat.model-030.electronic-help.2026-06-26",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-030.procedure-home.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 030. Censo de obligados tributarios",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G321.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9d901aa666530535ccc4dca31c85a411bea2c277aac4223b6103ece35ba684e9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-030.procedure-record.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 030",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G321.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8f8ec8cc3627b4e07292a00f6fda836346cc34820e1aa5524e832ec7117a123e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-030.instructions.2026-07-10",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 030",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/censos/modelo-030-censo_____de-domicilio-variacion-personales_/instrucciones.html",
      officialUpdatedOn: "2026-07-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "26338f25bb7b31f710a34cb3718f96a1887d04bb1a71a39c3a7905f8b7aabff6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-030.electronic-help.2026-06-26",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 030. Presentación electrónica",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-030/presentacion-electronica-modelo-030.html",
      officialUpdatedOn: "2026-06-26",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cf9b8a7b2d5e0fe97203899b19004a132a8bf069a25a6a3f63741c94efe6ec71",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-1526-2024.2025-01-09",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/1526/2024, de 11 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2025-410",
      officialUpdatedOn: "2025-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2d12b38b984169cddcfdb14db748a662fa6a8889e75f32e2fd094df706b1a3bc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-030.form-image.2025-01-09",
      authority: "BOE",
      kind: "DOCUMENT_IMAGE",
      title: "Imagen oficial del formulario Modelo 030",
      canonicalUrl:
        "https://www.boe.es/datos/imagenes/disp/2025/8/410_15138764_25.png",
      officialUpdatedOn: "2025-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "95b842c6c9b03ad4eba00c4ccac890cc5a66a4238c5338549a3cbe32a1bcb4c2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: {
    id: "model-030-form-preview",
    sourceId: "boe.model-030.form-image.2025-01-09",
    publicHref:
      "/fiscal-models/modelo-030/formulario-modelo-030-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "5eaae0ba02f63e31e2d9c731d115295e583fcc1bcac7fdbe5322c491f669d0b6",
    alt: "Vista previa del formulario oficial Modelo 030 publicado por el BOE",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_IMAGE",
  },
  links: [
    {
      id: "model-030-instructions-link",
      label: "Instrucciones oficiales",
      sourceId: "aeat.model-030.instructions.2026-07-10",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-030-help-link",
      label: "Ayuda de presentación electrónica",
      sourceId: "aeat.model-030.electronic-help.2026-06-26",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-030-procedure-link",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-030.procedure-home.2026-07-10",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-030-legal-link",
      label: "Orden HAC/1526/2024 en el BOE",
      sourceId: "boe.order-hac-1526-2024.2025-01-09",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-030-faq-purpose",
      question: "¿Qué es el Modelo 030?",
      answer: "Es la declaración censal que la AEAT identifica para el alta en el Censo de Obligados Tributarios y para comunicar determinados cambios de domicilio o de datos personales de personas físicas.",
      sourceIds: ["aeat.model-030.procedure-record.2026-07-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-030-faq-data",
      question: "¿Qué tipo de datos aparecen en el formulario?",
      answer: "La imagen oficial incluye bloques de identificación, domicilio fiscal, domicilio de notificaciones y datos de contacto, entre otros apartados censales.",
      sourceIds: ["boe.model-030.form-image.2025-01-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-030-faq-online",
      question: "¿La AEAT ofrece presentación electrónica?",
      answer: "Sí. La Sede de la AEAT publica una ayuda específica para la presentación electrónica del Modelo 030 y la ficha del procedimiento incluye la vía telemática.",
      sourceIds: [
        "aeat.model-030.electronic-help.2026-06-26",
        "aeat.model-030.procedure-record.2026-07-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-030-faq-instructions",
      question: "¿Dónde se consulta la explicación oficial del modelo?",
      answer: "La Sede de la AEAT mantiene una página de instrucciones enlazada desde el procedimiento oficial del Modelo 030.",
      sourceIds: [
        "aeat.model-030.procedure-home.2026-07-10",
        "aeat.model-030.instructions.2026-07-10",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"030">;

const MODEL_035 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-035-official-content.2026-07-13.v1",
  code: "035",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Registro Censal de los regímenes especiales aplicables a las prestaciones de servicios, ventas a distancia de bienes y determinadas entregas interiores.",
  summary:
    "Formulario electrónico para gestionar el registro en el sistema OSS, la ventanilla única europea de IVA para ventas transfronterizas.",
  searchTerms: [
    "formulario 035",
    "modelo 035",
    "OSS",
    "One Stop Shop",
    "ventanilla única",
    "IVA",
    "ventas a distancia",
    "prestaciones de servicios",
    "régimen de la Unión",
    "régimen exterior de la Unión",
    "régimen de importación",
    "registro censal",
  ],
  sections: [
    {
      id: "model-035-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-035-purpose-summary",
          heading: "Registro en el sistema OSS",
          text: "La ficha del procedimiento define el Formulario 035 como el procedimiento para gestionar el registro en el sistema OSS, la ventanilla única europea de IVA para ventas transfronterizas.",
          sourceIds: ["aeat.model-035.procedure-record.2026-04-01"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-035-scope",
      title: "Qué información oficial ofrece la AEAT",
      kind: "SCOPE",
      items: [
        {
          id: "model-035-scope-guides",
          heading: "Guías separadas por régimen",
          text: "La AEAT publica ayudas diferenciadas para el régimen de la Unión, el régimen exterior de la Unión y el régimen de importación, tanto para el declarante como para el intermediario.",
          sourceIds: [
            "aeat.model-035.union-guide.2025-07-29",
            "aeat.model-035.non-union-guide.2025-07-28",
            "aeat.model-035.import-declarant-guide.2025-07-28",
            "aeat.model-035.import-intermediary-guide.2025-07-29",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-035-scope-actions",
          heading: "Inicio, modificación y cese",
          text: "La denominación oficial y las guías de la AEAT estructuran el formulario en torno al inicio, la modificación o el cese de operaciones dentro de los regímenes especiales descritos.",
          sourceIds: [
            "aeat.model-035.procedure-home.2026-07-10",
            "aeat.model-035.union-guide.2025-07-29",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-035-access",
      title: "Canal oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-035-access-online",
          heading: "Formulario electrónico",
          text: "La ficha del procedimiento señala la vía telemática y la página principal ofrece accesos separados a los cuatro recorridos del Formulario 035.",
          sourceIds: [
            "aeat.model-035.procedure-home.2026-07-10",
            "aeat.model-035.procedure-record.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-035.procedure-home.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Formulario 035. Registro Censal de regímenes especiales",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G333.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1adc450e5585ad9fa8d606f5e95fc31ca6e31bf90bdbf6f93f41859dd49e78b3",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-035.procedure-record.2026-04-01",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Formulario 035",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G333.shtml",
      officialUpdatedOn: "2026-04-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8a812cbe3cb36656cf32a481ac712cb745cf6a93fc2b3889d79a811b00e551bf",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-035.union-guide.2025-07-29",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación del régimen de la Unión",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/Ayuda/035/RegimenUE.shtml",
      officialUpdatedOn: "2025-07-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4ff3e872fd9072ed55c4369b9251652aa8c4b58b5fa83a59dc2c7d8676e56597",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-035.non-union-guide.2025-07-28",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación del régimen exterior de la Unión",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/Ayuda/035/RegimenExterior.shtml",
      officialUpdatedOn: "2025-07-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e29947fbc967d9252da94815d29ad77c1d759ab0aa80c65636bd52743e0ed43a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-035.import-declarant-guide.2025-07-28",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación del régimen de importación para el declarante",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/Ayuda/035/RegimenImportacionDeclarante.shtml",
      officialUpdatedOn: "2025-07-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a2ec4da4512895dc4c27f35dcab0dbc1073832567f75b21803c7ece10bf264f8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-035.import-intermediary-guide.2025-07-29",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación del régimen de importación para el intermediario",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/Ayuda/035/RegimenImportacionIntermediario.shtml",
      officialUpdatedOn: "2025-07-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "433354b518dd2bad2cc96e76882170fac887cae7b2948b477a7ab2f12eb808fd",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-611-2021.2021-06-18",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/611/2021, de 16 de junio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2021-10162",
      officialUpdatedOn: "2021-06-18",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "eb1c8c64f299923daa689eced338931748d74ca3741486c322087d66db5d4d15",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-035.form-image.2021-06-18",
      authority: "BOE",
      kind: "DOCUMENT_IMAGE",
      title: "Imagen oficial del Formulario 035",
      canonicalUrl:
        "https://www.boe.es/datos/imagenes/disp/2021/145/10162_9730744_1.png",
      officialUpdatedOn: "2021-06-18",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9a7c87f3d871f9fe2c57ffde4bdb8763e66256439e2fd0fb7293e40a0bb641a9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: {
    id: "model-035-form-preview",
    sourceId: "boe.model-035.form-image.2021-06-18",
    publicHref: "/fiscal-models/modelo-035/formulario-035-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "1f2b70276d9e141c1033795bc75ca3a3048f307b4a6dc6e0fc3214ebc66befce",
    alt: "Vista previa del Formulario 035 oficial publicado por el BOE",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_IMAGE",
  },
  links: [
    {
      id: "model-035-union-guide-link",
      label: "Guía del régimen de la Unión",
      sourceId: "aeat.model-035.union-guide.2025-07-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-non-union-guide-link",
      label: "Guía del régimen exterior de la Unión",
      sourceId: "aeat.model-035.non-union-guide.2025-07-28",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-import-declarant-guide-link",
      label: "Guía del régimen de importación para el declarante",
      sourceId: "aeat.model-035.import-declarant-guide.2025-07-28",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-import-intermediary-guide-link",
      label: "Guía del régimen de importación para el intermediario",
      sourceId: "aeat.model-035.import-intermediary-guide.2025-07-29",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-procedure-link",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-035.procedure-home.2026-07-10",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-legal-link",
      label: "Orden HAC/611/2021 en el BOE",
      sourceId: "boe.order-hac-611-2021.2021-06-18",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-035-faq-purpose",
      question: "¿Qué es el Formulario 035?",
      answer: "Es el formulario que la AEAT vincula al registro censal de los regímenes especiales para prestaciones de servicios, ventas a distancia de bienes y determinadas entregas interiores.",
      sourceIds: ["aeat.model-035.procedure-home.2026-07-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-faq-oss",
      question: "¿Qué relación tiene con el sistema OSS?",
      answer: "La ficha oficial describe el procedimiento como el medio para gestionar el registro en OSS, la ventanilla única europea de IVA para ventas transfronterizas.",
      sourceIds: ["aeat.model-035.procedure-record.2026-04-01"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-faq-guides",
      question: "¿Qué ayudas de presentación publica la AEAT?",
      answer: "La AEAT ofrece ayudas separadas para el régimen de la Unión, el régimen exterior de la Unión y el régimen de importación en sus recorridos de declarante e intermediario.",
      sourceIds: [
        "aeat.model-035.union-guide.2025-07-29",
        "aeat.model-035.non-union-guide.2025-07-28",
        "aeat.model-035.import-declarant-guide.2025-07-28",
        "aeat.model-035.import-intermediary-guide.2025-07-29",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-035-faq-channel",
      question: "¿Cuál es el canal que figura en la ficha oficial?",
      answer: "La ficha del procedimiento señala la vía telemática y la página principal enlaza accesos electrónicos diferenciados por régimen.",
      sourceIds: [
        "aeat.model-035.procedure-home.2026-07-10",
        "aeat.model-035.procedure-record.2026-04-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"035">;

const MODEL_036 = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: "public-aeat-model-036-official-content.2026-07-13.v1",
  code: "036",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Censo de empresarios, profesionales y retenedores. Declaración censal de alta, modificación y baja.",
  summary:
    "Guía sencilla del Modelo 036: alta de autónomos y empresas, actividades, IVA, IRPF, retenciones, plazos, Censos WEB y presentación oficial.",
  searchTerms: [
    "modelo 036",
    "declaración censal",
    "censo de empresarios",
    "profesionales",
    "retenedores",
    "alta censal",
    "modificación censal",
    "baja censal",
    "NIF",
    "domicilio fiscal",
    "Censos WEB",
    "modelo 036 simplificado",
    "alta autónomo",
    "plazo modificación censal",
    "plazo baja censal",
    "ROI REDEME",
    "titular real",
    "Agencia Tributaria",
  ],
  sections: [
    {
      id: "model-036-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-036-purpose-summary",
          heading: "Gestión del censo",
          text: "La AEAT identifica el Modelo 036 como la declaración censal de alta, modificación y baja en el Censo de empresarios, profesionales y retenedores.",
          sourceIds: ["aeat.model-036.procedure-record.2026-07-10"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-036-scope",
      title: "Qué información contiene",
      kind: "SCOPE",
      items: [
        {
          id: "model-036-scope-census",
          heading: "Alta, modificación y baja",
          text: "La denominación oficial agrupa las comunicaciones de alta, modificación y baja asociadas al Censo de empresarios, profesionales y retenedores.",
          sourceIds: [
            "aeat.model-036.procedure-home.2026-07-10",
            "aeat.model-036.procedure-record.2026-07-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-036-scope-form",
          heading: "Formulario censal",
          text: "La imagen oficial del BOE muestra el encabezado del Modelo 036 y organiza su primera página en datos identificativos y causas de presentación censal.",
          sourceIds: ["boe.model-036.form-image.2025-01-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-036-access",
      title: "Información y ayuda oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-036-access-resources",
          heading: "Recursos de la Sede de la AEAT",
          text: "La Sede mantiene una página informativa del Modelo 036 y una ayuda específica para su presentación electrónica, además de la ficha del procedimiento.",
          sourceIds: [
            "aeat.model-036.information.2026-04-01",
            "aeat.model-036.electronic-help.2026-06-19",
            "aeat.model-036.procedure-record.2026-07-10",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-036.procedure-home.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 036. Censo de empresarios, profesionales y retenedores",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "96cb6fb8111a9c0eedad9e812dc29451bb7d979d53dc0352e7b95cfb5ff74b66",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-036.procedure-record.2026-07-10",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 036",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G322.shtml",
      officialUpdatedOn: "2026-07-10",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "46a8387e598f76ff2a39187fa7ad34039a76af48c1e9e1b272b194288bf74548",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-036.information.2026-04-01",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Información del Modelo 036",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/censos/modelos-036-037_____icacion-baja-declaracion-simplificada_/modelo-036.html",
      officialUpdatedOn: "2026-04-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8275624faafce1ef507eca057870bac77be1b74fe6e1025cf641e4491f02b323",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-036.electronic-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 036. Presentación electrónica",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-036/presentacion-electronica-modelo-036.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d7e5be7f2f7318ff858e5f81cfa6626680f6dd3520e9d3c32a607b8dfaa23e42",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-1526-2024.2025-01-09",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/1526/2024, de 11 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2025-410",
      officialUpdatedOn: "2025-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2d12b38b984169cddcfdb14db748a662fa6a8889e75f32e2fd094df706b1a3bc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-036.form-image.2025-01-09",
      authority: "BOE",
      kind: "DOCUMENT_IMAGE",
      title: "Imagen oficial del formulario Modelo 036",
      canonicalUrl:
        "https://www.boe.es/datos/imagenes/disp/2025/8/410_15138764_1.png",
      officialUpdatedOn: "2025-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8c883be5c45bba432bb0912a231f8c9694aaaf4c0cc284f53d81bab451f645f8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: {
    id: "model-036-form-preview",
    sourceId: "boe.model-036.form-image.2025-01-09",
    publicHref:
      "/fiscal-models/modelo-036/formulario-modelo-036-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "b97ca6773ff543d30122e595e1daba3da24f61580c26d6c2dba398a0c7899f28",
    alt: "Vista previa del formulario oficial Modelo 036 publicado por el BOE",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_IMAGE",
  },
  links: [
    {
      id: "model-036-information-link",
      label: "Información oficial del Modelo 036",
      sourceId: "aeat.model-036.information.2026-04-01",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-036-help-link",
      label: "Ayuda de presentación electrónica",
      sourceId: "aeat.model-036.electronic-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-036-procedure-link",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-036.procedure-home.2026-07-10",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-036-legal-link",
      label: "Orden HAC/1526/2024 en el BOE",
      sourceId: "boe.order-hac-1526-2024.2025-01-09",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-036-faq-purpose",
      question: "¿Qué es el Modelo 036?",
      answer: "Es la declaración censal que la AEAT identifica para el alta, la modificación y la baja en el Censo de empresarios, profesionales y retenedores.",
      sourceIds: ["aeat.model-036.procedure-record.2026-07-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-036-faq-audience",
      question: "¿Cómo clasifica la AEAT a quienes inician el procedimiento?",
      answer: "La ficha oficial identifica como solicitantes a ciudadanos y empresas. La ficha no sustituye la comprobación de la situación concreta ante la AEAT.",
      sourceIds: ["aeat.model-036.procedure-record.2026-07-10"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-036-faq-help",
      question: "¿Qué recursos informativos publica la AEAT?",
      answer: "La Sede ofrece la ficha del procedimiento, una página informativa del modelo y ayuda para la presentación electrónica.",
      sourceIds: [
        "aeat.model-036.procedure-home.2026-07-10",
        "aeat.model-036.information.2026-04-01",
        "aeat.model-036.electronic-help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-036-faq-form",
      question: "¿De dónde procede la vista previa del formulario?",
      answer: "Procede de la imagen del Modelo 036 incluida en el anexo oficial publicado por el BOE junto a la Orden HAC/1526/2024.",
      sourceIds: [
        "boe.order-hac-1526-2024.2025-01-09",
        "boe.model-036.form-image.2025-01-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"036">;

export const PUBLIC_AEAT_MODEL_030_OFFICIAL_CONTENT_V1 =
  deepFreeze(MODEL_030);

export const PUBLIC_AEAT_MODEL_035_OFFICIAL_CONTENT_V1 =
  deepFreeze(MODEL_035);

export const PUBLIC_AEAT_MODEL_036_OFFICIAL_CONTENT_V1 =
  deepFreeze(MODEL_036);

export const PUBLIC_AEAT_BATCH_01_CENSUS_OFFICIAL_CONTENTS_V1 = deepFreeze([
  PUBLIC_AEAT_MODEL_030_OFFICIAL_CONTENT_V1,
  PUBLIC_AEAT_MODEL_035_OFFICIAL_CONTENT_V1,
  PUBLIC_AEAT_MODEL_036_OFFICIAL_CONTENT_V1,
] as const);

export const PUBLIC_AEAT_BATCH_01_CENSUS_CONTENT_V1 =
  PUBLIC_AEAT_BATCH_01_CENSUS_OFFICIAL_CONTENTS_V1;
