import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_RELEASE_ID_V1 =
  "public-aeat-official-batch-03-irpf-declarations.2026-07-13.v1" as const;

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

const MODELS_130_131_APPROVAL_SOURCE = {
  id: "boe.order-eha-672-2007.models-130-131",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/672/2007, de 19 de marzo",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6032",
  officialUpdatedOn: "2015-02-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "82e363dcf85245c177dd3d5e26127df557b6d86fdce7e96154b388d8fbaf1cd3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const TAX_FILING_PROCEDURES_SOURCE = {
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

const MODEL_122_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_RELEASE_ID_V1,
  code: "122",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Deducciones por familia numerosa, por personas con discapacidad a cargo o por ascendiente con dos hijos separado legalmente o sin vínculo matrimonial. Regularización del derecho a la deducción por contribuyentes no obligados a presentar declaración.",
  summary:
    "Comunicación que la AEAT vincula a la regularización del derecho a determinadas deducciones del IRPF en el contexto descrito por su denominación oficial.",
  searchTerms: [
    "modelo 122",
    "regularización del derecho a la deducción",
    "familia numerosa",
    "personas con discapacidad a cargo",
    "ascendiente con dos hijos",
    "separado legalmente",
    "sin vínculo matrimonial",
    "contribuyentes no obligados a presentar declaración",
    "deducciones IRPF",
    "predeclaración modelo 122",
    "Orden HFP 105 2017",
    "Orden HAC 763 2018",
  ],
  sections: [
    {
      id: "model-122-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-122-purpose-regularization",
          heading: "Regularización de determinadas deducciones",
          text: "La AEAT identifica el Modelo 122 con la regularización del derecho a deducciones por familia numerosa, por personas con discapacidad a cargo o por ascendiente con dos hijos separado legalmente o sin vínculo matrimonial.",
          sourceIds: [
            "aeat.model-122.procedure-home.2026-06-09",
            "aeat.model-122.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-122-purpose-context",
          heading: "Contexto de la denominación oficial",
          text: "La denominación oficial sitúa el modelo en el contexto de contribuyentes no obligados a presentar declaración. Esta ficha reproduce ese contexto sin determinar si corresponde a una persona concreta.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-122.procedure-home.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-122-materials",
      title: "Información y materiales oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-122-materials-help",
          heading: "Ayuda electrónica y predeclaración",
          text: "La Sede publica ayudas separadas para el formulario electrónico y para la predeclaración en papel del Modelo 122.",
          sourceIds: [
            "aeat.model-122.electronic-help.2026-06-19",
            "aeat.model-122.paper-help.2026-02-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-122-materials-dynamic-pdf",
          heading: "PDF generado, no formulario estático",
          text: "La ayuda de predeclaración explica que el PDF se obtiene después de cumplimentar y validar el formulario en línea. Las páginas oficiales revisadas no enlazan un impreso PDF estático del Modelo 122.",
          sourceIds: [
            "aeat.model-122.procedure-home.2026-06-09",
            "aeat.model-122.paper-help.2026-02-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-122-release-context",
      title: "Ejercicio y alcance temporal",
      kind: "SCOPE",
      items: [
        {
          id: "model-122-release-context-no-exercise",
          heading: "Procedimiento sin ejercicio fijado en el título",
          text: "El procedimiento y sus ayudas se publican como Modelo 122 sin asociar la identidad general de la ficha a un ejercicio concreto. Este release no elige campaña ni ejercicio para el usuario.",
          sourceIds: [
            "aeat.model-122.procedure-home.2026-06-09",
            "aeat.model-122.electronic-help.2026-06-19",
            "aeat.model-122.paper-help.2026-02-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-122-release-context-law",
          heading: "Normas de aprobación y modificación",
          text: "La Orden HFP/105/2017 aprueba el Modelo 122 y la Orden HAC/763/2018 modifica su denominación para incorporar la referencia al ascendiente con dos hijos separado legalmente o sin vínculo matrimonial.",
          sourceIds: [
            "boe.model-122.order-hfp-105-2017",
            "boe.model-122.order-hac-763-2018",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-122.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 122. Regularización del derecho a la deducción",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G617.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "c4e9b0f167ec0369e180d6236f89ce23b533776bc7e211c21b1af0173018cfbd",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-122.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 122",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G617.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2df60acfbbbbb1173e6b58a96e75c565fc25da74686eefe541161c78425b41eb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-122.electronic-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 122. Presentación electrónica",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-122/presentacion-electronica-modelo-122.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7a751d8936cc7ac48891d7a946ebc283d63186f440dc8b26a1c5056051ddcc86",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-122.paper-help.2026-02-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 122. Presentación en papel",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-122/presentacion-papel-modelo-122.html",
      officialUpdatedOn: "2026-02-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8a6a59b7065f8ef0611cadc3e1e2a1d18b3be53eaa7bd7f9098dba156dd5f41e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-122.order-hfp-105-2017",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/105/2017, de 6 de febrero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2017-1334",
      officialUpdatedOn: "2018-07-18",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5f04a418ee2ab96cc6247c4ab01d2f6d210dd28f0a2be4ee79f8f7ce0e711748",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-122.order-hac-763-2018",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/763/2018, de 10 de julio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2018-10064",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6f342ba1e89a577ccf760ec144832830986f0e09ed75fceb3841e6bd7f95c2e0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-122-link-electronic-help",
      label: "Ayuda oficial del formulario electrónico",
      sourceId: "aeat.model-122.electronic-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-link-paper-help",
      label: "Ayuda oficial de la predeclaración en papel",
      sourceId: "aeat.model-122.paper-help.2026-02-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-link-procedure",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-122.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-link-approval-order",
      label: "Orden HFP/105/2017",
      sourceId: "boe.model-122.order-hfp-105-2017",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-link-amending-order",
      label: "Orden HAC/763/2018",
      sourceId: "boe.model-122.order-hac-763-2018",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-122-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 122?",
      answer: "La AEAT lo identifica como la regularización del derecho a determinadas deducciones del IRPF por familia numerosa, personas con discapacidad a cargo o ascendiente con dos hijos separado legalmente o sin vínculo matrimonial.",
      sourceIds: ["aeat.model-122.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-faq-context",
      question: "¿Qué contexto menciona la denominación oficial?",
      answer: "La denominación menciona contribuyentes no obligados a presentar declaración. Esta ficha informativa no decide si ese contexto corresponde a una persona concreta.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-faq-materials",
      question: "¿Qué ayudas publica la AEAT?",
      answer: "La Sede publica una ayuda para el formulario electrónico y otra para la predeclaración en papel del Modelo 122.",
      sourceIds: [
        "aeat.model-122.electronic-help.2026-06-19",
        "aeat.model-122.paper-help.2026-02-02",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-faq-static-pdf",
      question: "¿Existe un formulario PDF estático enlazado?",
      answer: "No en las páginas oficiales revisadas. La ayuda explica que la predeclaración genera el PDF después de cumplimentar y validar el formulario en línea.",
      sourceIds: [
        "aeat.model-122.procedure-home.2026-06-09",
        "aeat.model-122.paper-help.2026-02-02",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-faq-exercise",
      question: "¿Esta ficha selecciona un ejercicio o campaña?",
      answer: "No. El procedimiento identifica el Modelo 122 de forma general y esta ficha no determina el ejercicio aplicable a un caso concreto.",
      sourceIds: [
        "aeat.model-122.procedure-home.2026-06-09",
        "aeat.model-122.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-122-faq-law",
      question: "¿Qué normas aprueban y modifican la denominación del modelo?",
      answer: "La Orden HFP/105/2017 aprueba el Modelo 122 y la Orden HAC/763/2018 modifica su denominación oficial.",
      sourceIds: [
        "boe.model-122.order-hfp-105-2017",
        "boe.model-122.order-hac-763-2018",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"122">;

const MODEL_130_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_RELEASE_ID_V1,
  code: "130",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Empresarios y profesionales en estimación directa. Pago fraccionado.",
  summary:
    "Pago fraccionado trimestral del IRPF para autónomos y profesionales en estimación directa.",
  searchTerms: [
    "modelo 130",
    "IRPF",
    "empresarios y profesionales",
    "estimación directa",
    "estimación directa normal",
    "estimación directa simplificada",
    "actividades económicas",
    "pago fraccionado",
    "Pre 130",
    "ejercicio 2026",
    "ejercicio 2020 y siguientes",
    "datos de declaraciones anteriores",
    "predeclaración modelo 130",
    "Orden EHA 672 2007",
    "regla 70 por ciento profesionales",
    "cálculo acumulado desde enero",
    "20 por ciento rendimiento neto",
    "retenciones modelo 130",
    "declaración negativa",
    "pago a cuenta renta",
  ],
  sections: [
    {
      id: "model-130-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-130-purpose-payment",
          heading: "Pago fraccionado del IRPF",
          text: "La AEAT identifica el Modelo 130 con los pagos fraccionados del IRPF correspondientes a actividades económicas en estimación directa.",
          sourceIds: [
            "aeat.model-130.procedure-home.2026-06-09",
            MODELS_130_131_APPROVAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-130-purpose-method",
          heading: "Estimación directa",
          text: "La ficha administrativa menciona las modalidades normal y simplificada de la estimación directa. Esta información no determina el método aplicable a una persona concreta.",
          sourceIds: ["aeat.model-130.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-130-materials",
      title: "Información y materiales oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-130-materials-help",
          heading: "Ayuda del formulario y la predeclaración",
          text: "La ayuda de la AEAT documenta el formulario web del Modelo 130, la predeclaración y la recuperación de datos de declaraciones anteriores.",
          sourceIds: [
            "aeat.model-130.help.2026-06-19",
            "aeat.model-130.paper-help.2026-04-01",
            "aeat.model-130.previous-help.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-130-materials-no-static-pdf",
          heading: "Sin impreso PDF estático enlazado",
          text: "Las páginas revisadas describen formularios web que generan una predeclaración. No enlazan un impreso PDF estático actual del Modelo 130, por lo que esta ficha no publica miniatura ni documento descargable propio.",
          sourceIds: [
            "aeat.model-130.procedure-home.2026-06-09",
            "aeat.model-130.paper-help.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-130-exercise-context",
      title: "Ejercicio y contexto histórico",
      kind: "SCOPE",
      items: [
        {
          id: "model-130-exercise-current",
          heading: "Servicios etiquetados como ejercicio 2026",
          text: "En la captura de fuentes de este release, la página principal de la AEAT etiqueta el formulario y la predeclaración destacados como ejercicio 2026. Esta ficha no convierte esa etiqueta en una selección automática de campaña.",
          sourceIds: ["aeat.model-130.procedure-home.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-130-exercise-previous",
          heading: "Servicio para 2020 y siguientes",
          text: "La misma página y la ayuda mantienen una referencia separada a la recuperación de datos de declaraciones anteriores para el ejercicio 2020 y siguientes. Es una etiqueta del servicio oficial, no una afirmación de vigencia para todos los ejercicios.",
          sourceIds: [
            "aeat.model-130.procedure-home.2026-06-09",
            "aeat.model-130.previous-help.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-130.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 130. Estimación directa. Pago fraccionado",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ad113303a1631c9721715e7fa18f25aaf4f3f1c0c20f4bfa49b0d58f03fe565b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-130.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 130",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G601.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "981082e379a7e05e4c26c8c37727816e8b83278bf420effcbae82e395e7ee5ea",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-130.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 130",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-130.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "145f2921e954c884730a75e6110b9b29e18ab1a50c01871d2e6f7a9adf6b4dad",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-130.paper-help.2026-04-01",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 130. Presentación en papel mediante predeclaración",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-130/presentacion-papel-modelo-130.html",
      officialUpdatedOn: "2026-04-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d909bd69fde6b1e025e36476f46fcf10bbf0af423fda1cf09c21960b635c971e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-130.previous-help.2026-04-01",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 130. Uso de datos de declaraciones anteriores",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-130/presentacion-usando-datos-declaraciones-anteriores.html",
      officialUpdatedOn: "2026-04-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "80b9a36a9420d60eb5b1d2cba19edd747bd53aa1090ac272eaddccd4f434324d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    MODELS_130_131_APPROVAL_SOURCE,
    TAX_FILING_PROCEDURES_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-130-link-help",
      label: "Ayuda técnica oficial del Modelo 130",
      sourceId: "aeat.model-130.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-link-paper-help",
      label: "Ayuda oficial de la predeclaración",
      sourceId: "aeat.model-130.paper-help.2026-04-01",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-link-previous-help",
      label: "Ayuda oficial para usar datos anteriores",
      sourceId: "aeat.model-130.previous-help.2026-04-01",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-link-procedure",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-130.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-link-approval-order",
      label: "Orden EHA/672/2007",
      sourceId: MODELS_130_131_APPROVAL_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-130-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 130?",
      answer: "La AEAT lo identifica con los pagos fraccionados del IRPF correspondientes a actividades económicas en estimación directa.",
      sourceIds: [
        "aeat.model-130.procedure-home.2026-06-09",
        MODELS_130_131_APPROVAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-faq-method",
      question: "¿Qué modalidad de estimación menciona la ficha?",
      answer: "La ficha menciona la estimación directa en sus modalidades normal y simplificada, sin que esta información general determine el método de una persona concreta.",
      sourceIds: ["aeat.model-130.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-faq-current-exercise",
      question: "¿Qué ejercicio muestran los servicios destacados capturados?",
      answer: "La página principal capturada etiqueta el formulario y la predeclaración destacados como ejercicio 2026. Esta ficha no selecciona un ejercicio para el usuario.",
      sourceIds: ["aeat.model-130.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-faq-previous-data",
      question: "¿Qué referencia histórica mantiene la AEAT?",
      answer: "La AEAT mantiene un servicio identificado para el ejercicio 2020 y siguientes que permite utilizar datos de declaraciones anteriores.",
      sourceIds: [
        "aeat.model-130.procedure-home.2026-06-09",
        "aeat.model-130.previous-help.2026-04-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-faq-static-pdf",
      question: "¿Hay un formulario PDF estático enlazado?",
      answer: "No en las páginas oficiales revisadas. La ayuda describe formularios web que generan la predeclaración después de su validación.",
      sourceIds: [
        "aeat.model-130.procedure-home.2026-06-09",
        "aeat.model-130.paper-help.2026-04-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-130-faq-law",
      question: "¿Qué norma aprueba los modelos 130 y 131?",
      answer: "La Orden EHA/672/2007 aprueba ambos modelos para los pagos fraccionados del IRPF en estimación directa y estimación objetiva, respectivamente.",
      sourceIds: [MODELS_130_131_APPROVAL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"130">;

const MODEL_131_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_RELEASE_ID_V1,
  code: "131",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Empresarios y profesionales en estimación objetiva. Pago fraccionado.",
  summary:
    "Pago fraccionado trimestral del IRPF para actividades en estimación objetiva o módulos.",
  searchTerms: [
    "modelo 131",
    "IRPF",
    "empresarios y profesionales",
    "estimación objetiva",
    "módulos",
    "actividades económicas",
    "pago fraccionado",
    "ejercicio 2026",
    "ejercicio 2025",
    "ejercicio 2023 y anteriores",
    "predeclaración modelo 131",
    "datos de declaraciones anteriores",
    "Orden EHA 672 2007",
    "límites módulos 2026",
    "reducción 5 por ciento 2026",
    "porcentajes 2 3 4 por ciento",
    "unidades personal asalariado",
    "estimación objetiva requisitos",
    "declaración negativa",
  ],
  sections: [
    {
      id: "model-131-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-131-purpose-payment",
          heading: "Pago fraccionado del IRPF",
          text: "La AEAT identifica el Modelo 131 con los pagos fraccionados del IRPF correspondientes a actividades económicas en estimación objetiva.",
          sourceIds: [
            "aeat.model-131.procedure-home.2026-04-01",
            MODELS_130_131_APPROVAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-131-purpose-method",
          heading: "Estimación objetiva",
          text: "La ficha administrativa vincula el modelo a personas físicas que realizan actividades económicas en estimación objetiva. Esta ficha no decide el método aplicable a una persona concreta.",
          sourceIds: ["aeat.model-131.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-131-materials",
      title: "Información y materiales oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-131-materials-help",
          heading: "Ayuda del formulario y la predeclaración",
          text: "La ayuda de la AEAT documenta el formulario web del Modelo 131 y la predeclaración generada desde un formulario en línea.",
          sourceIds: [
            "aeat.model-131.help.2026-06-19",
            "aeat.model-131.paper-help.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-131-materials-no-static-pdf",
          heading: "Sin impreso PDF estático enlazado",
          text: "Las páginas revisadas describen formularios web y recorridos históricos por fichero. No enlazan un impreso PDF estático actual del Modelo 131, por lo que esta ficha no publica miniatura ni documento descargable propio.",
          sourceIds: [
            "aeat.model-131.procedure-home.2026-04-01",
            "aeat.model-131.help.2026-06-19",
            "aeat.model-131.paper-help.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-131-exercise-context",
      title: "Ejercicio y contexto histórico",
      kind: "SCOPE",
      items: [
        {
          id: "model-131-exercise-current",
          heading: "Servicios destacados para el ejercicio 2026",
          text: "En la captura de fuentes de este release, la página principal destaca el formulario y la predeclaración del ejercicio 2026. Esta ficha no convierte esa etiqueta en una selección automática de campaña.",
          sourceIds: ["aeat.model-131.procedure-home.2026-04-01"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-131-exercise-help-history",
          heading: "Referencias 2025 y 2023 o anteriores",
          text: "La ayuda, actualizada en 2026, conserva recorridos por fichero etiquetados como ejercicio 2023 y anteriores. Su página de predeclaración todavía menciona el ejercicio 2025 en el texto mientras el bloque destacado enlaza el ejercicio 2026. Estas etiquetas se registran como contexto documental y no como vigencia aplicable.",
          sourceIds: [
            "aeat.model-131.help.2026-06-19",
            "aeat.model-131.paper-help.2026-04-01",
            "aeat.model-131.procedure-home.2026-04-01",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-131.procedure-home.2026-04-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 131. Estimación objetiva. Pago fraccionado",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G602.shtml",
      officialUpdatedOn: "2026-04-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2ea3d1ec26667a7338a49736f450a62cc028fd489b5fa5d57ec3915b8ff4b537",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-131.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 131",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G602.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7d87ba83c00842742b655f788f35ec560b637f6e920afc6fc52a150f62dbe977",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-131.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 131",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-131.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "18f13dfd5b01c48246d43f535f19fba9524af25bee23c147aa3c67b5a08e06ea",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-131.paper-help.2026-04-01",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 131. Presentación en papel mediante predeclaración",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-131/presentacion-papel-mediante-formulario-modelo-131.html",
      officialUpdatedOn: "2026-04-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fb9d270dc91df96ba71fb5d078c9acc8db9ae1cf64e21fc489df212b74158841",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    MODELS_130_131_APPROVAL_SOURCE,
    TAX_FILING_PROCEDURES_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-131-link-help",
      label: "Ayuda técnica oficial del Modelo 131",
      sourceId: "aeat.model-131.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-link-paper-help",
      label: "Ayuda oficial de la predeclaración",
      sourceId: "aeat.model-131.paper-help.2026-04-01",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-link-procedure",
      label: "Procedimiento oficial",
      sourceId: "aeat.model-131.procedure-home.2026-04-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-link-approval-order",
      label: "Orden EHA/672/2007",
      sourceId: MODELS_130_131_APPROVAL_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-131-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 131?",
      answer: "La AEAT lo identifica con los pagos fraccionados del IRPF correspondientes a actividades económicas en estimación objetiva.",
      sourceIds: [
        "aeat.model-131.procedure-home.2026-04-01",
        MODELS_130_131_APPROVAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-faq-method",
      question: "¿Qué modalidad de estimación menciona la ficha?",
      answer: "La ficha menciona la estimación objetiva, sin que esta información general determine el método de una persona concreta.",
      sourceIds: ["aeat.model-131.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-faq-current-exercise",
      question: "¿Qué ejercicio muestran los servicios destacados capturados?",
      answer: "La página principal capturada destaca el formulario y la predeclaración del ejercicio 2026. Esta ficha no selecciona un ejercicio para el usuario.",
      sourceIds: ["aeat.model-131.procedure-home.2026-04-01"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-faq-history",
      question: "¿Qué referencias históricas conserva la ayuda?",
      answer: "La ayuda conserva recorridos por fichero para el ejercicio 2023 y anteriores. Además, su texto de predeclaración menciona 2025 mientras los accesos destacados ya muestran 2026; esta ficha no interpreta esas etiquetas como vigencia aplicable.",
      sourceIds: [
        "aeat.model-131.help.2026-06-19",
        "aeat.model-131.paper-help.2026-04-01",
        "aeat.model-131.procedure-home.2026-04-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-faq-static-pdf",
      question: "¿Hay un formulario PDF estático enlazado?",
      answer: "No en las páginas oficiales revisadas. La ayuda describe formularios web y la generación de una predeclaración desde el servicio de la AEAT.",
      sourceIds: [
        "aeat.model-131.procedure-home.2026-04-01",
        "aeat.model-131.paper-help.2026-04-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-131-faq-law",
      question: "¿Qué norma aprueba los modelos 130 y 131?",
      answer: "La Orden EHA/672/2007 aprueba ambos modelos para los pagos fraccionados del IRPF en estimación directa y estimación objetiva, respectivamente.",
      sourceIds: [MODELS_130_131_APPROVAL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"131">;

export const PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_CONTENT_V1 = deepFreeze([
  MODEL_122_CONTENT,
  MODEL_130_CONTENT,
  MODEL_131_CONTENT,
] as const);

export type PublicAeatBatch03IrpfDeclarationsCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_CONTENT_V1)[number]["code"];
