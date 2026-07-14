import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_OFFICIAL_BATCH_02_WITHHOLDING_RELEASE_ID_V1 =
  "public-aeat-official-batch-02-withholding.2026-07-13.v1" as const;

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

const DESIGNS_100_199_SOURCE = {
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

const BOE_HAP_2194_2013_SOURCE = {
  id: "boe.order-hap-2194-2013",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2194/2013, de 22 de noviembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2013-12385",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "85d2f80a8d38fa4af33ad00696b594ad77ab1af20ae1d10baa2a6cf8d2dec135",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_111_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_02_WITHHOLDING_RELEASE_ID_V1,
  code: "111",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta del IRPF. Rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de renta. Autoliquidación.",
  summary:
    "Ingreso periódico de retenciones practicadas en nóminas, facturas profesionales y otras rentas sujetas.",
  searchTerms: [
    "modelo 111",
    "retenciones IRPF",
    "ingresos a cuenta",
    "rendimientos del trabajo",
    "actividades económicas",
    "actividades profesionales",
    "nóminas",
    "facturas profesionales",
    "retención profesional 15 por ciento",
    "retención nuevo autónomo 7 por ciento",
    "modelo 190",
    "trimestral o mensual",
    "actividades agrícolas y ganaderas",
    "premios",
    "ganancias patrimoniales",
    "imputaciones de renta",
    "diseño de registro 111",
  ],
  sections: [
    {
      id: "model-111-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-111-purpose-autoliquidation",
          heading: "Retenciones e ingresos a cuenta del IRPF",
          text: "La ficha oficial identifica el Modelo 111 como la autoliquidación periódica relativa a retenciones e ingresos a cuenta del IRPF sobre determinadas rentas satisfechas o abonadas.",
          sourceIds: ["aeat.model-111.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-111-scope",
      title: "Información que reúne",
      kind: "SCOPE",
      items: [
        {
          id: "model-111-scope-income",
          heading: "Clases de rentas",
          text: "Las instrucciones oficiales enumeran rendimientos del trabajo, rendimientos de determinadas actividades económicas, premios y ciertas ganancias patrimoniales e imputaciones de renta.",
          sourceIds: ["aeat.model-111.instructions.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-111-access",
      title: "Gestión y materiales oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-111-access-form",
          heading: "Formulario electrónico y predeclaración",
          text: "La ayuda de la AEAT documenta el formulario electrónico, la recuperación de datos anteriores y la predeclaración generada para su presentación en papel.",
          sourceIds: ["aeat.model-111.help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-111-access-files",
          heading: "Importación, exportación y diseño",
          text: "El formulario admite ficheros ajustados al diseño lógico vigente y permite exportar datos con extensión .111. La página de diseños publica un archivo XLS identificado como versión 1.8 para ejercicios 2019 y siguientes, actualizado en mayo de 2021.",
          sourceIds: [
            "aeat.model-111.help.2026-06-19",
            DESIGNS_100_199_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-111.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 111. Retenciones e ingresos a cuenta. Autoliquidación",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH01.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "71e0b003305fdb2295cc339724117ad906d8b220451c3ce5db57ff5ba36d9ceb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-111.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 111",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH01.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ae8b804393110f12324a7cbfc5351e5249453c2ecb7b0d19a580265c678b3884",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-111.instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones del Modelo 111",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/pagos-cuenta/modelo-111-reten_____moniales-imputaciones-renta-autoliquidacion_/instrucciones.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3544f8db141f259a08c631f86149039bae49ad70c47c6c2ef6cf4b9347c84b48",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-111.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 111 - Presentación electrónica del modelo 111",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-111/presentacion-electronica-modelo-111.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0c5267c840a01bd5fb7ac986729ef4d8173cc314ef021d28a1f53ffe2f9ec54c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_100_199_SOURCE,
    {
      id: "boe.model-111.order-2011",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/586/2011, de 9 de marzo",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2011-4948",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "246f53c407568db7701b9c943673d3de04429713d28c2505235c88e04ca08ba9",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    BOE_HAP_2194_2013_SOURCE,
    {
      id: "boe.irpf-law-35-2006",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Ley 35/2006, de 28 de noviembre, del IRPF",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a47376ff59ac79debe58f7ef49ef5dbb8cb555d980828f96260d14199cca2d82",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.irpf-regulation-rd-439-2007",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Real Decreto 439/2007, de 30 de marzo",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4c31e86dba0e1efcb3067dd6b8415dea7a16c62e3b67fbb86d53d73cf35d33c2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-111-link-procedure",
      label: "Página oficial del Modelo 111",
      sourceId: "aeat.model-111.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-link-instructions",
      label: "Instrucciones oficiales del Modelo 111",
      sourceId: "aeat.model-111.instructions.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-link-help",
      label: "Ayuda técnica del Modelo 111",
      sourceId: "aeat.model-111.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-link-design",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_100_199_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-link-law",
      label: "Orden EHA/586/2011",
      sourceId: "boe.model-111.order-2011",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-link-processing-law",
      label: "Orden HAP/2194/2013",
      sourceId: BOE_HAP_2194_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-111-faq-purpose",
      question: "¿Qué información declara el Modelo 111?",
      answer: "La AEAT lo identifica como una autoliquidación de retenciones e ingresos a cuenta del IRPF sobre determinadas rentas satisfechas o abonadas.",
      sourceIds: ["aeat.model-111.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-faq-income",
      question: "¿Qué clases de rentas aparecen en sus instrucciones?",
      answer: "Las instrucciones enumeran rendimientos del trabajo, determinadas actividades económicas, premios y ciertas ganancias patrimoniales e imputaciones de renta.",
      sourceIds: ["aeat.model-111.instructions.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-faq-channels",
      question: "¿Qué canales recoge la ficha oficial?",
      answer: "La ficha enumera la Sede electrónica, las oficinas de la AEAT y las entidades colaboradoras.",
      sourceIds: ["aeat.model-111.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-faq-files",
      question: "¿Puede trabajar el formulario con ficheros?",
      answer: "La ayuda oficial describe funciones para importar un fichero ajustado al diseño lógico vigente y exportar datos con extensión .111.",
      sourceIds: ["aeat.model-111.help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-111-faq-static-form",
      question: "¿Existe un formulario PDF estático enlazado por la AEAT?",
      answer: "La página actual enlaza el formulario web, instrucciones HTML y un diseño de registro XLS; la predeclaración en papel se genera desde el servicio de la AEAT.",
      sourceIds: [
        "aeat.model-111.procedure-home.2026-06-09",
        "aeat.model-111.help.2026-06-19",
        DESIGNS_100_199_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"111">;

const MODEL_113_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_02_WITHHOLDING_RELEASE_ID_V1,
  code: "113",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Comunicación de datos relativos a las ganancias patrimoniales por cambio de residencia a otro Estado miembro de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
  summary:
    "Comunicación de datos sobre ganancias patrimoniales vinculadas al cambio de residencia descrito por la Agencia Tributaria.",
  searchTerms: [
    "modelo 113",
    "comunicación de datos",
    "ganancias patrimoniales",
    "cambio de residencia",
    "Unión Europea",
    "Espacio Económico Europeo",
    "intercambio de información tributaria",
    "presentar o modificar comunicación",
    "consulta modelo 113",
    "diseño de registro 113",
  ],
  sections: [
    {
      id: "model-113-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-113-purpose-communication",
          heading: "Comunicación por cambio de residencia",
          text: "La denominación oficial vincula el Modelo 113 a la comunicación de datos relativos a ganancias patrimoniales cuando el cambio de residencia se produce hacia otro Estado miembro de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
          sourceIds: ["aeat.model-113.procedure-home.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-113-access",
      title: "Gestión en la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-113-access-services",
          heading: "Presentación, modificación y consulta",
          text: "La página oficial reúne la gestión para presentar o modificar la comunicación y la consulta de declaraciones presentadas. La ficha describe tramitación telemática.",
          sourceIds: [
            "aeat.model-113.procedure-home.2026-06-09",
            "aeat.model-113.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-113-access-help",
          heading: "Formulario y justificante",
          text: "La ayuda explica el guardado, carga y validación del formulario. También indica que la respuesta de una presentación correcta incorpora un PDF con la información de registro y la copia de la comunicación.",
          sourceIds: ["aeat.model-113.help.2026-01-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-113-format",
      title: "Formato publicado",
      kind: "DETAILS",
      items: [
        {
          id: "model-113-format-design",
          heading: "Diseño de registro XLS",
          text: "La página de diseños publica un archivo XLS del Modelo 113 para ejercicios 2016 y siguientes, identificado como actualizado el 15 de enero de 2020. No es un impreso PDF para cumplimentar.",
          sourceIds: [DESIGNS_100_199_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-113.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 113. Comunicación por cambio de residencia",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G614.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a3d1d1411407d6e1c43f8968e1d6bcbb0471664c153b0f14b0033dcdeb4f0cbc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-113.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 113",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G614.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4eb5fe5015b0fd3f58e602563439fa7000bb633194fb284520899939c8ea6b9c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-113.help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 113",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-113.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e35c9e8040e4c399c5aee22b25e7d39c87d11ab031ecae3fdc3ee462cea35ca8",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_100_199_SOURCE,
    {
      id: "boe.model-113.order-2015",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/2835/2015, de 28 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2015-14269",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "decfe263429d651cf0102d9c72b1d3df86750a43c482aa6183f39cf5fc839f6e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    BOE_HAP_2194_2013_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-113-link-procedure",
      label: "Página oficial del Modelo 113",
      sourceId: "aeat.model-113.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-link-help",
      label: "Ayuda técnica del Modelo 113",
      sourceId: "aeat.model-113.help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-link-design",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_100_199_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-link-law",
      label: "Orden HAP/2835/2015",
      sourceId: "boe.model-113.order-2015",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-113-faq-purpose",
      question: "¿Qué comunica el Modelo 113?",
      answer: "Comunica datos relativos a ganancias patrimoniales vinculadas al cambio de residencia que describe su denominación oficial.",
      sourceIds: ["aeat.model-113.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-faq-territory",
      question: "¿Qué ámbito territorial menciona la AEAT?",
      answer: "La denominación oficial menciona otro Estado miembro de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
      sourceIds: ["aeat.model-113.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-faq-services",
      question: "¿Qué gestiones aparecen en la página oficial?",
      answer: "La página ofrece la gestión para presentar o modificar la comunicación y otra para consultar declaraciones presentadas.",
      sourceIds: ["aeat.model-113.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-faq-access",
      question: "¿Qué identificación describe la ayuda técnica?",
      answer: "La ayuda indica certificado electrónico o DNI electrónico para el acceso por internet y contempla la actuación de un tercero autorizado.",
      sourceIds: ["aeat.model-113.help.2026-01-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-113-faq-static-form",
      question: "¿Hay un formulario PDF estático descargable?",
      answer: "La AEAT ofrece un formulario web y un diseño de registro XLS. El PDF mencionado por la ayuda es la respuesta generada tras una presentación, no un impreso estático enlazado.",
      sourceIds: [
        "aeat.model-113.procedure-home.2026-06-09",
        "aeat.model-113.help.2026-01-09",
        DESIGNS_100_199_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"113">;

const MODEL_115_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_02_WITHHOLDING_RELEASE_ID_V1,
  code: "115",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta. Rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
  summary:
    "Ingreso periódico de retenciones por el alquiler o subalquiler de determinados inmuebles urbanos.",
  searchTerms: [
    "modelo 115",
    "retenciones alquiler",
    "retenciones arrendamiento",
    "subarrendamiento",
    "inmuebles urbanos",
    "alquiler de local",
    "retención alquiler 19 por ciento",
    "arrendatario",
    "inquilino",
    "coworking",
    "modelo 180",
    "capital inmobiliario",
    "actividades económicas",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR establecimiento permanente",
    "predeclaración 115",
    "diseño de registro 115",
  ],
  sections: [
    {
      id: "model-115-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-115-purpose-rent",
          heading: "Arrendamiento y subarrendamiento urbano",
          text: "La ficha oficial vincula el Modelo 115 a retenciones e ingresos a cuenta sobre rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
          sourceIds: ["aeat.model-115.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-115-purpose-taxes",
          heading: "Impuestos identificados",
          text: "El objeto oficial menciona el IRPF, el Impuesto sobre Sociedades y el Impuesto sobre la Renta de no Residentes correspondiente a establecimientos permanentes.",
          sourceIds: ["aeat.model-115.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-115-access",
      title: "Gestión en la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-115-access-channels",
          heading: "Canales de la ficha",
          text: "La ficha enumera la vía telemática, las oficinas de la AEAT y las entidades colaboradoras.",
          sourceIds: ["aeat.model-115.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-115-access-formats",
          heading: "Formulario electrónico y predeclaración",
          text: "La ayuda técnica diferencia la presentación electrónica, la predeclaración en papel y la recuperación de datos de declaraciones anteriores.",
          sourceIds: [
            "aeat.model-115.help.2026-06-19",
            "aeat.model-115.paper-help.2026-02-24",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-115-format",
      title: "Formato publicado",
      kind: "DETAILS",
      items: [
        {
          id: "model-115-format-design",
          heading: "Diseño de registro XLS",
          text: "La página de diseños publica un archivo XLS del Modelo 115 para ejercicios 2019 y siguientes, identificado como actualizado en febrero de 2019. La ayuda permite importar y exportar ficheros con extensión .115.",
          sourceIds: [
            DESIGNS_100_199_SOURCE.id,
            "aeat.model-115.help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-115.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 115. Retenciones sobre arrendamientos urbanos",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH02.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b1f0266e0e66d5be9482789bb9e3b7c6ee2590781bfabe894153b859cd796c80",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-115.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 115",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH02.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "995ac25d27cc229535a3af790924444a8a64cbcd3bb8976c338907c1c8ab07e4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-115.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 115 - Presentación electrónica del modelo 115",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-115/presentacion-electronica-modelo-115.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ce762dcef4b128768705a644a547db01ef703d167c43992d781d6e425dea533b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-115.paper-help.2026-02-24",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 115 - Presentación en papel del modelo 115 (predeclaración)",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-115/presentacion-papel-modelo-115.html",
      officialUpdatedOn: "2026-02-24",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "10929313fa4fd3685b8fbdffa9bd278296ddba38d5484c519a2f3856838f37ea",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    DESIGNS_100_199_SOURCE,
    {
      id: "boe.model-115.order-2000",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden de 20 de noviembre de 2000",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2000-21430",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "969523fa48d934c94f83a9c3395c588e1049a9a640bbc34bbeb6fee0f253667b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-115.order-hac-540-2003",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/540/2003, de 10 de marzo",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2003-5305",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "14fcc5c1dbc850ca7d740ee4399624169475165de1ec1bbac64e20e468ca1bd5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    BOE_HAP_2194_2013_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-115-link-procedure",
      label: "Página oficial del Modelo 115",
      sourceId: "aeat.model-115.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-link-help",
      label: "Ayuda técnica del Modelo 115",
      sourceId: "aeat.model-115.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-link-paper-help",
      label: "Ayuda de la predeclaración del Modelo 115",
      sourceId: "aeat.model-115.paper-help.2026-02-24",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-link-design",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_100_199_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-link-law",
      label: "Orden de 20 de noviembre de 2000",
      sourceId: "boe.model-115.order-2000",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-link-law-2003",
      label: "Orden HAC/540/2003",
      sourceId: "boe.model-115.order-hac-540-2003",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-115-faq-purpose",
      question: "¿Qué rentas identifica el Modelo 115?",
      answer: "La AEAT lo vincula a rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
      sourceIds: ["aeat.model-115.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-faq-taxes",
      question: "¿Qué impuestos menciona la ficha oficial?",
      answer: "La ficha menciona el IRPF, el Impuesto sobre Sociedades y el IRNR correspondiente a establecimientos permanentes.",
      sourceIds: ["aeat.model-115.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-faq-channels",
      question: "¿Qué canales recoge la ficha?",
      answer: "La ficha enumera la vía telemática, las oficinas de la AEAT y las entidades colaboradoras.",
      sourceIds: ["aeat.model-115.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-faq-files",
      question: "¿Puede importar o exportar datos el formulario?",
      answer: "La ayuda describe la importación de ficheros ajustados al diseño publicado y la exportación de un fichero con extensión .115.",
      sourceIds: ["aeat.model-115.help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-115-faq-static-form",
      question: "¿La AEAT enlaza un formulario PDF estático?",
      answer: "La AEAT ofrece un formulario web y una predeclaración que genera un PDF validado; el diseño estático publicado es un archivo XLS, no un impreso PDF.",
      sourceIds: [
        "aeat.model-115.procedure-home.2026-06-09",
        "aeat.model-115.paper-help.2026-02-24",
        DESIGNS_100_199_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"115">;

const MODEL_117_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_OFFICIAL_BATCH_02_WITHHOLDING_RELEASE_ID_V1,
  code: "117",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones e ingresos a cuenta sobre rentas procedentes de la transmisión o reembolso de acciones o participaciones en instituciones de inversión colectiva y de transmisiones de derechos de suscripción.",
  summary:
    "Autoliquidación de retenciones e ingresos a cuenta sobre determinadas rentas vinculadas a instituciones de inversión colectiva y derechos de suscripción.",
  searchTerms: [
    "modelo 117",
    "retenciones instituciones de inversión colectiva",
    "acciones",
    "participaciones",
    "fondos de inversión",
    "transmisión",
    "reembolso",
    "derechos de suscripción",
    "IRPF",
    "Impuesto sobre Sociedades",
    "IRNR establecimiento permanente",
    "diseño de registro 117",
  ],
  sections: [
    {
      id: "model-117-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-117-purpose-investment",
          heading: "Instituciones de inversión colectiva",
          text: "La ficha oficial vincula el Modelo 117 a retenciones e ingresos a cuenta sobre rentas procedentes de la transmisión o reembolso de acciones o participaciones en instituciones de inversión colectiva.",
          sourceIds: ["aeat.model-117.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-117-purpose-rights",
          heading: "Derechos de suscripción",
          text: "La denominación publicada en la página de gestiones añade las transmisiones de derechos de suscripción al ámbito descrito para el modelo.",
          sourceIds: ["aeat.model-117.procedure-home.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-117-access",
      title: "Gestiones oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-117-access-services",
          heading: "Presentación, lotes y consulta",
          text: "La página oficial ofrece presentación electrónica, presentación por lotes, consulta de declaraciones presentadas y aportación de documentación complementaria.",
          sourceIds: ["aeat.model-117.procedure-home.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-117-access-query",
          heading: "Consulta de declaraciones",
          text: "La ayuda general de consulta explica que pueden localizarse declaraciones por datos como NIF, modelo y ejercicio, y acceder al justificante, la copia o el fichero disponible.",
          sourceIds: ["aeat.declarations-query-help.2026-05-07"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-117-format",
      title: "Formato publicado",
      kind: "DETAILS",
      items: [
        {
          id: "model-117-format-design",
          heading: "Diseño de registro XLS",
          text: "La página de diseños publica un archivo XLS del Modelo 117 para ejercicios 2019 y siguientes, identificado como actualizado en febrero de 2019. No se enlaza un impreso PDF estático del modelo.",
          sourceIds: [
            DESIGNS_100_199_SOURCE.id,
            "aeat.model-117.procedure-home.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    {
      id: "aeat.model-117.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 117. Retenciones sobre instituciones de inversión colectiva",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH03.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f17e8bf421f66a1791542c593661ee1f3606b2838f3453ce7923986ea8737517",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-117.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 117",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH03.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6fcfc3aa7005a116a8b580ccd078eb1cb27412563870ae96578767e87de5a666",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
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
    },
    DESIGNS_100_199_SOURCE,
    {
      id: "boe.model-117.order-2007",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/3435/2007, de 23 de noviembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-20485",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "44fcc4362a1b54146f60d3c258b1f3c9622d4ebd6bcdef2384674eec55ad679e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-117-link-procedure",
      label: "Página oficial del Modelo 117",
      sourceId: "aeat.model-117.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-link-query",
      label: "Ayuda para consultar declaraciones presentadas",
      sourceId: "aeat.declarations-query-help.2026-05-07",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-link-design",
      label: "Diseños de registro de los modelos 100 al 199",
      sourceId: DESIGNS_100_199_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-link-law",
      label: "Orden EHA/3435/2007",
      sourceId: "boe.model-117.order-2007",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-117-faq-purpose",
      question: "¿Qué rentas identifica el Modelo 117?",
      answer: "La ficha lo vincula a rentas procedentes de la transmisión o reembolso de acciones o participaciones en instituciones de inversión colectiva.",
      sourceIds: ["aeat.model-117.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-faq-rights",
      question: "¿La denominación oficial menciona derechos de suscripción?",
      answer: "Sí. La página oficial incorpora las transmisiones de derechos de suscripción en la denominación del Modelo 117.",
      sourceIds: ["aeat.model-117.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-faq-services",
      question: "¿Qué gestiones reúne la AEAT?",
      answer: "La página ofrece presentación electrónica, presentación por lotes, consulta de declaraciones y aportación de documentación complementaria.",
      sourceIds: ["aeat.model-117.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-faq-query",
      question: "¿Qué puede obtenerse desde la consulta de declaraciones?",
      answer: "La ayuda indica el acceso al justificante y copia de la declaración o, cuando esté disponible, a la descarga del fichero presentado.",
      sourceIds: ["aeat.declarations-query-help.2026-05-07"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-117-faq-static-form",
      question: "¿Existe un formulario PDF estático enlazado?",
      answer: "La página oficial enlaza formularios electrónicos y un diseño de registro XLS, pero no un impreso PDF estático del Modelo 117.",
      sourceIds: [
        "aeat.model-117.procedure-home.2026-06-09",
        DESIGNS_100_199_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"117">;

export const PUBLIC_AEAT_BATCH_02_WITHHOLDING_CONTENT_V1 = deepFreeze([
  MODEL_111_CONTENT,
  MODEL_113_CONTENT,
  MODEL_115_CONTENT,
  MODEL_117_CONTENT,
] as const);

export type PublicAeatBatch02WithholdingCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_02_WITHHOLDING_CONTENT_V1)[number]["code"];
