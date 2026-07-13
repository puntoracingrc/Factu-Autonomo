import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentExternalNavigationV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_RELEASE_ID_V1 =
  "public-aeat-official-batch-03-irpf-benefits.2026-07-13.v1" as const;

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

const PERSONAL_AREA_SOURCE = {
  id: "aeat.personal-area.2026-07-10",
  authority: "AEAT",
  kind: "PERSONAL_AREA",
  title: "Mi área personal",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html",
  officialUpdatedOn: "2026-07-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "757555259200efe6a791e5d3c49a5ad3bdfcc3f6a8843a5a55f8251068f5418c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const PERSONAL_AREA_NAVIGATION = {
  kind: "AEAT_PERSONAL_AREA",
  title: "Mi área personal de la AEAT",
  sourceId: PERSONAL_AREA_SOURCE.id,
  policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY",
} as const satisfies PublicAeatOfficialContentExternalNavigationV1;

const MODEL_136_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_RELEASE_ID_V1,
  code: "136",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Impuesto sobre la Renta de las Personas Físicas e Impuesto sobre la Renta de no Residentes. Gravamen Especial sobre los Premios de determinadas Loterías y Apuestas. Autoliquidación.",
  summary:
    "Autoliquidación del gravamen especial sobre premios de determinadas loterías y apuestas en el IRPF y el Impuesto sobre la Renta de no Residentes.",
  searchTerms: [
    "Modelo 136",
    "gravamen especial sobre premios",
    "premios de loterías",
    "premios de apuestas",
    "loterías y apuestas",
    "IRPF",
    "Impuesto sobre la Renta de no Residentes",
    "autoliquidación de premios",
    "Orden HAP 70 2013",
    "Orden HAC 763 2018",
  ],
  sections: [
    {
      id: "model-136-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-136-purpose-special-levy",
          heading: "Gravamen especial sobre determinados premios",
          text: "La Agencia Tributaria identifica el Modelo 136 como la autoliquidación del gravamen especial sobre premios de determinadas loterías y apuestas en el IRPF y el Impuesto sobre la Renta de no Residentes.",
          sourceIds: [
            "aeat.model-136.procedure-home.2026-06-09",
            "aeat.models.index.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-136-access",
      title: "Información y consulta oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-136-access-channel",
          heading: "Canal recogido por la ficha",
          text: "La ficha administrativa enumera la vía telemática como lugar de presentación. Esta página no determina si el modelo corresponde a un premio o una persona concretos.",
          sourceIds: ["aeat.model-136.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-136-access-query-help",
          heading: "Ayuda para consultar declaraciones",
          text: "La página del procedimiento enlaza la ayuda general de la AEAT para consultar declaraciones presentadas.",
          sourceIds: [
            "aeat.model-136.procedure-home.2026-06-09",
            "aeat.declarations-query-help.2026-05-07",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-136-details",
      title: "Contexto y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-136-details-historical-wording",
          heading: "Redacción contextual de la ficha administrativa",
          text: "La ficha administrativa conserva una explicación del cambio normativo que introdujo el gravamen. Esta referencia histórica no se utiliza aquí para calificar el tratamiento actual de un premio concreto.",
          sourceIds: ["aeat.model-136.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-136-details-orders",
          heading: "Aprobación y modificación",
          text: "La Orden HAP/70/2013 aprueba el Modelo 136 y la Orden HAC/763/2018 modifica aspectos de esa regulación, según las referencias enlazadas por la AEAT.",
          sourceIds: [
            "boe.model-136.order-hap-70-2013",
            "boe.order-hac-763-2018",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-136.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 136 · gravamen especial sobre premios de determinadas loterías y apuestas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH09.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "36febcf36f645dd5d6744d71fb7d8db85c6df778f5bc14fa168b2a6516581044",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-136.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 136",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GH09.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bbea6c7427006799cf2ab9f5f15974b00b5a1268f4d3b2d7a7df9aa5001775fb",
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
    {
      id: "boe.model-136.order-hap-70-2013",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/70/2013, de 30 de enero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2013-952",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f94d69e9d0800bf1972ed5626cdb833d5d8f7f8d27deb479a64240223b284b45",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-763-2018",
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
    PERSONAL_AREA_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-136-link-procedure",
      label: "Página oficial del Modelo 136",
      sourceId: "aeat.model-136.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-link-query-help",
      label: "Ayuda para consultar declaraciones presentadas",
      sourceId: "aeat.declarations-query-help.2026-05-07",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-link-approval",
      label: "Orden HAP/70/2013",
      sourceId: "boe.model-136.order-hap-70-2013",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-link-amendment",
      label: "Orden HAC/763/2018",
      sourceId: "boe.order-hac-763-2018",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-136-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 136?",
      answer: "La AEAT lo identifica como la autoliquidación del gravamen especial sobre premios de determinadas loterías y apuestas.",
      sourceIds: ["aeat.model-136.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-faq-taxes",
      question: "¿Qué impuestos aparecen en su denominación oficial?",
      answer: "La denominación oficial menciona el Impuesto sobre la Renta de las Personas Físicas y el Impuesto sobre la Renta de no Residentes.",
      sourceIds: ["aeat.models.index.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-faq-channel",
      question: "¿Qué canal enumera la ficha administrativa?",
      answer: "La ficha del procedimiento enumera la vía telemática, sin que esta información determine si el modelo corresponde a un caso concreto.",
      sourceIds: ["aeat.model-136.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-faq-query",
      question: "¿Existe ayuda oficial para consultar declaraciones?",
      answer: "Sí. La página del Modelo 136 enlaza la ayuda general de la AEAT para consultar declaraciones presentadas.",
      sourceIds: [
        "aeat.model-136.procedure-home.2026-06-09",
        "aeat.declarations-query-help.2026-05-07",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-faq-static-form",
      question: "¿La página actual enlaza un formulario PDF estático?",
      answer: "No. La página oficial enlaza un formulario electrónico, pero no ofrece un impreso PDF estático del Modelo 136.",
      sourceIds: ["aeat.model-136.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-136-faq-law",
      question: "¿Qué norma aprueba el Modelo 136?",
      answer: "La Orden HAP/70/2013 aprueba el Modelo 136; la página oficial también enlaza la Orden HAC/763/2018 como modificación posterior.",
      sourceIds: [
        "boe.model-136.order-hap-70-2013",
        "boe.order-hac-763-2018",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"136">;

const MODEL_140_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_RELEASE_ID_V1,
  code: "140",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Deducción por maternidad. Solicitud de abono anticipado de la deducción.",
  summary:
    "Solicitud del abono anticipado de la deducción por maternidad del IRPF y comunicación de variaciones, según la página oficial de la AEAT.",
  searchTerms: [
    "Modelo 140",
    "deducción por maternidad",
    "abono anticipado maternidad",
    "solicitud deducción maternidad",
    "comunicación de variaciones",
    "IRPF maternidad",
    "predeclaración Modelo 140",
    "presentación electrónica Modelo 140",
    "Orden HAC 177 2020",
    "Orden HFP 1336 2022",
  ],
  sections: [
    {
      id: "model-140-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-140-purpose-advance",
          heading: "Abono anticipado de la deducción por maternidad",
          text: "La ficha administrativa define el Modelo 140 como el procedimiento para solicitar el abono anticipado de la deducción por maternidad del IRPF.",
          sourceIds: ["aeat.model-140.procedure-record.2026-03-25"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-140-purpose-variations",
          heading: "Comunicación de variaciones",
          text: "La página oficial incorpora la comunicación de variaciones en la denominación del procedimiento, sin que esta ficha determine cuándo corresponde realizar una comunicación.",
          sourceIds: ["aeat.model-140.procedure-home.2026-01-29"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-140-access",
      title: "Canales y ayuda oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-140-access-channels",
          heading: "Canales que enumera la ficha",
          text: "La ficha administrativa enumera la vía telemática, la telefónica, las oficinas de la AEAT y las oficinas de Correos.",
          sourceIds: ["aeat.model-140.procedure-record.2026-03-25"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-140-access-formats",
          heading: "Formulario electrónico y predeclaración",
          text: "La AEAT publica ayuda para el formulario electrónico y para una predeclaración que genera el documento desde el servicio web. No enlaza un formulario PDF estático independiente.",
          sourceIds: [
            "aeat.model-140.electronic-help.2026-06-19",
            "aeat.model-140.predeclaration-help.2026-04-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-140-details",
      title: "Avisos y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-140-details-operational-notices",
          heading: "Avisos de la página oficial",
          text: "La página de la AEAT puede mostrar avisos dirigidos a solicitudes ya iniciadas o en curso. Esta ficha no transforma esos avisos contextuales en una regla general ni evalúa una situación individual.",
          sourceIds: ["aeat.model-140.procedure-home.2026-01-29"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-140-details-orders",
          heading: "Aprobación y modificación",
          text: "La Orden HAC/177/2020 aprueba el Modelo 140 y la Orden HFP/1336/2022 modifica esa regulación, según las referencias oficiales.",
          sourceIds: [
            "boe.model-140.order-hac-177-2020",
            "boe.order-hfp-1336-2022",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-140.procedure-home.2026-01-29",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 140 · deducción por maternidad",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ25.shtml",
      officialUpdatedOn: "2026-01-29",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ded8fbaa30edd56609ea51bd6addaf231cd74894326132cf1607a6ccd044cdf3",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-140.procedure-record.2026-03-25",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 140",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ25.shtml",
      officialUpdatedOn: "2026-03-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0d0d9754e7c4afd683e31fa5f2b6b5eea22b8e0ef49e89f229142395ecad6ce5",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-140.electronic-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 140",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/presentacion-modelo-140.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d433c532614219c27cd66e1a14aa67531301732541afb4277824b3b7664f9b10",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-140.predeclaration-help.2026-04-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Formulario de predeclaración del Modelo 140",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/formulario-predeclaracion-modelo-140.html",
      officialUpdatedOn: "2026-04-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6ea66f24831d90db51c9a2427cf46b80326b550715d182127a06d58fd69644bc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-140.order-hac-177-2020",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/177/2020, de 27 de febrero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2020-2901",
      officialUpdatedOn: "2022-12-30",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "51c65b8f81f902864756914186ac09228e43ead4bff8e322decdbe9dad9ab236",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hfp-1336-2022",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/1336/2022, de 28 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2022-24386",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "81da9dc62221a92cea93f6721bb8e58d53f41cf33a601f622ff1b4176827b7cc",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    PERSONAL_AREA_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-140-link-procedure",
      label: "Página oficial del Modelo 140",
      sourceId: "aeat.model-140.procedure-home.2026-01-29",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-link-electronic-help",
      label: "Ayuda oficial del formulario electrónico",
      sourceId: "aeat.model-140.electronic-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-link-predeclaration-help",
      label: "Ayuda oficial de la predeclaración",
      sourceId: "aeat.model-140.predeclaration-help.2026-04-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-link-approval",
      label: "Orden HAC/177/2020",
      sourceId: "boe.model-140.order-hac-177-2020",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-link-amendment",
      label: "Orden HFP/1336/2022",
      sourceId: "boe.order-hfp-1336-2022",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-140-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 140?",
      answer: "La AEAT lo identifica con la solicitud del abono anticipado de la deducción por maternidad del IRPF.",
      sourceIds: ["aeat.model-140.procedure-record.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-faq-variations",
      question: "¿La denominación oficial menciona variaciones?",
      answer: "Sí. La página oficial incluye la comunicación de variaciones en el título del procedimiento, sin que esta ficha determine cuándo corresponde comunicar una variación.",
      sourceIds: ["aeat.model-140.procedure-home.2026-01-29"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-faq-channels",
      question: "¿Qué canales enumera la ficha administrativa?",
      answer: "La ficha enumera la vía telemática, la telefónica, las oficinas de la AEAT y las oficinas de Correos.",
      sourceIds: ["aeat.model-140.procedure-record.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-faq-formats",
      question: "¿Qué formatos de formulario explica la ayuda de la AEAT?",
      answer: "La AEAT publica ayuda para un formulario electrónico y para una predeclaración generada desde su servicio web.",
      sourceIds: [
        "aeat.model-140.electronic-help.2026-06-19",
        "aeat.model-140.predeclaration-help.2026-04-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-faq-static-pdf",
      question: "¿Existe un formulario PDF estático enlazado?",
      answer: "No. La predeclaración genera el documento desde el servicio web de la AEAT; la página no enlaza un impreso PDF estático independiente.",
      sourceIds: [
        "aeat.model-140.procedure-home.2026-01-29",
        "aeat.model-140.predeclaration-help.2026-04-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-140-faq-law",
      question: "¿Qué normas aprueban y modifican el Modelo 140?",
      answer: "La Orden HAC/177/2020 aprueba el modelo y la Orden HFP/1336/2022 modifica esa regulación.",
      sourceIds: [
        "boe.model-140.order-hac-177-2020",
        "boe.order-hfp-1336-2022",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"140">;

const MODEL_143_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_RELEASE_ID_V1,
  code: "143",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Abono anticipado deducción de familia numerosa, por ascendiente con dos hijos o por personas con discapacidad a cargo.",
  summary:
    "Solicitud del abono anticipado de deducciones relacionadas con familia numerosa, ascendiente con dos hijos o personas con discapacidad a cargo.",
  searchTerms: [
    "Modelo 143",
    "abono anticipado familia numerosa",
    "deducción familia numerosa",
    "ascendiente con dos hijos",
    "personas con discapacidad a cargo",
    "descendiente con discapacidad",
    "ascendiente con discapacidad",
    "solicitud colectiva Modelo 143",
    "presolicitud Modelo 143",
    "Orden HAP 2486 2014",
  ],
  sections: [
    {
      id: "model-143-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-143-purpose-advance",
          heading: "Abono anticipado de deducciones",
          text: "La AEAT identifica el Modelo 143 con solicitudes de abono anticipado vinculadas a familia numerosa, ascendiente con dos hijos o personas con discapacidad a cargo.",
          sourceIds: [
            "aeat.model-143.procedure-home.2026-03-25",
            "aeat.model-143.procedure-record.2026-03-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-143-access",
      title: "Canales y materiales oficiales",
      kind: "ACCESS",
      items: [
        {
          id: "model-143-access-channels",
          heading: "Canales que enumera la ficha",
          text: "La ficha administrativa enumera la vía telemática, la telefónica y las oficinas de la AEAT.",
          sourceIds: ["aeat.model-143.procedure-record.2026-03-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-143-access-help",
          heading: "Formulario electrónico y presolicitud",
          text: "La AEAT publica ayuda para la presentación electrónica y para una presolicitud que genera el documento desde el servicio web. No enlaza un formulario PDF estático independiente.",
          sourceIds: [
            "aeat.model-143.electronic-help.2026-06-19",
            "aeat.model-143.presolicitud-help.2026-04-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-143-details",
      title: "Modalidades, preguntas y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-143-details-modalities",
          heading: "Gestiones diferenciadas",
          text: "La página oficial distingue la solicitud electrónica, la adhesión a una solicitud colectiva, la consulta y la presolicitud. Esta ficha no decide qué modalidad corresponde a una persona.",
          sourceIds: ["aeat.model-143.procedure-home.2026-03-25"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-143-details-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La AEAT mantiene una página extensa de preguntas frecuentes sobre el Modelo 143. Sus respuestas dependen de circunstancias personales y se conservan como fuente oficial, no como una decisión de aplicabilidad de esta aplicación.",
          sourceIds: ["aeat.model-143.faq.2026-03-25"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-143-details-orders",
          heading: "Aprobación y modificación",
          text: "La Orden HAP/2486/2014 aprueba el Modelo 143 y la Orden HAC/763/2018 modifica esa regulación.",
          sourceIds: [
            "boe.model-143.order-hap-2486-2014",
            "boe.order-hac-763-2018",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-143.procedure-home.2026-03-25",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 143 · abono anticipado de deducciones",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G613.shtml",
      officialUpdatedOn: "2026-03-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "772867a8766d4dd5741d8f7aa6b069af16e7abafd4dcc58be1a026677d2b5e28",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-143.procedure-record.2026-03-02",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 143",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G613.shtml",
      officialUpdatedOn: "2026-03-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ca83a79eeebb2cc45b216fd5569646b819f4e3d78046e30223994b076b626a47",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-143.electronic-help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Presentación electrónica del Modelo 143",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/presentacion-electronica-modelo-143.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4685b0d719d664db0794ecb9391fdbb4a349e4ee36178ea0867734468da6af6f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-143.presolicitud-help.2026-04-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Formulario del Modelo 143 · presolicitud",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/formulario-modelo-143.html",
      officialUpdatedOn: "2026-04-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2037ec3f086859421b1400354e7fb7c168c209ab2264479d984d403a60fc6ea1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-143.faq.2026-03-25",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 143",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/beneficios-fiscales-autorizaciones/irpf/modelo-143-irpf______do-deducciones-familia-discapacidad_/preguntas-frecuentes.html",
      officialUpdatedOn: "2026-03-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "70275dc80123b2554681aeb9d8778297ce24b3f73683693c9bf5295d78c3eac0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-143.order-hap-2486-2014",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/2486/2014, de 29 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2014-13675",
      officialUpdatedOn: "2022-12-30",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6d8f47801dc7ba6e9d427c5f42606dfe47cefe0ef663047dfed34090c49f030c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.order-hac-763-2018",
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
    PERSONAL_AREA_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-143-link-procedure",
      label: "Página oficial del Modelo 143",
      sourceId: "aeat.model-143.procedure-home.2026-03-25",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-143.faq.2026-03-25",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-link-electronic-help",
      label: "Ayuda oficial del formulario electrónico",
      sourceId: "aeat.model-143.electronic-help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-link-presolicitud-help",
      label: "Ayuda oficial de la presolicitud",
      sourceId: "aeat.model-143.presolicitud-help.2026-04-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-link-approval",
      label: "Orden HAP/2486/2014",
      sourceId: "boe.model-143.order-hap-2486-2014",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-link-amendment",
      label: "Orden HAC/763/2018",
      sourceId: "boe.order-hac-763-2018",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-143-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 143?",
      answer: "La AEAT lo identifica con el abono anticipado de deducciones relacionadas con familia numerosa, ascendiente con dos hijos o personas con discapacidad a cargo.",
      sourceIds: ["aeat.model-143.procedure-home.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-faq-channels",
      question: "¿Qué canales enumera la ficha administrativa?",
      answer: "La ficha enumera la vía telemática, la telefónica y las oficinas de la Agencia Tributaria.",
      sourceIds: ["aeat.model-143.procedure-record.2026-03-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-faq-modalities",
      question: "¿Qué modalidades de gestión diferencia la página oficial?",
      answer: "La página distingue solicitud electrónica, adhesión a una solicitud colectiva, consulta y presolicitud. Esta ficha no decide cuál corresponde a una persona.",
      sourceIds: ["aeat.model-143.procedure-home.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-faq-help",
      question: "¿Existe ayuda oficial para el formulario y la presolicitud?",
      answer: "Sí. La AEAT publica una ayuda para la presentación electrónica y otra para generar la presolicitud desde su servicio web.",
      sourceIds: [
        "aeat.model-143.electronic-help.2026-06-19",
        "aeat.model-143.presolicitud-help.2026-04-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-faq-official-faq",
      question: "¿La Agencia Tributaria publica preguntas frecuentes?",
      answer: "Sí. La AEAT mantiene una página específica de preguntas frecuentes del Modelo 143, cuyas respuestas deben interpretarse según las circunstancias descritas en la fuente oficial.",
      sourceIds: ["aeat.model-143.faq.2026-03-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-143-faq-law",
      question: "¿Qué normas aprueban y modifican el Modelo 143?",
      answer: "La Orden HAP/2486/2014 aprueba el modelo y la Orden HAC/763/2018 modifica esa regulación.",
      sourceIds: [
        "boe.model-143.order-hap-2486-2014",
        "boe.order-hac-763-2018",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"143">;

export const PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_CONTENT_V1 = deepFreeze([
  MODEL_136_CONTENT,
  MODEL_140_CONTENT,
  MODEL_143_CONTENT,
] as const);

export type PublicAeatBatch03IrpfBenefitsCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_CONTENT_V1)[number]["code"];
