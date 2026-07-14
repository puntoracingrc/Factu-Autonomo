import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_13_VAT_380_390_RELEASE_ID_V1 =
  "public-aeat-official-batch-13-vat-380-390.2026-07-13.v1" as const;

export type PublicAeatBatch13Vat380390CodeV1 = "380" | "381" | "390";

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

const MODEL_380_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-380.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 380 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DB06.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "732ddea3f15d4fe8a292f3de70e2ad9859d44dfefabbb17559059db44d4bd318",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_380_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-380.procedure-record.2025-06-03",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 380",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DB06.shtml",
  officialUpdatedOn: "2025-06-03",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f017d07b1c813a71ff258fd1827227cad7ef1bf6de3e7c242e63d3ad02906fd9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_380_HELP_SOURCE = {
  id: "aeat.model-380.help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 380 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-380.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "426a326c4113b031107b469f21039e01d81e2fa49ea703516a615764a7355d30",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_380_QUERY_HELP_SOURCE = {
  id: "aeat.model-380.query-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 380 · ayuda para la consulta",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-380/consulta-declaraciones-modelo-380.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bb77e7ad2d7612fff88ffd9709be249a3083caf0af4364707d02cbd9a25d79d2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_380_ORDER_2005_SOURCE = {
  id: "boe.model-380.order-eha-1308-2005.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/1308/2005, de 11 de mayo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2005-7775",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f3f650d79f6c24d59cb1b1ff557b3ca39da3a2a3555d2d6e8ff432e2455e2508",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_380_ORDER_2007_SOURCE = {
  id: "boe.model-380.order-eha-3482-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3482/2007, de 20 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-20637",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0ab73c64dc4a71bd5fcbd87c7e98d608ebfab3321eee87d5596dbeabbbd453e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_380_ORDER_2023_SOURCE = {
  id: "boe.model-380.order-hfp-626-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/626/2023, de 14 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-14425",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9cc076af014a7a5e0e45c785c7bcb1fce7ea7b93c0eb2eadd1c46480afdfbc5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_381_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-381.procedure-home.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 381 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ92.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "efaaf49bdbb57224d57f11ce6f29b27593f41dcc50ae3739666f3c9582669b9a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_381_NEWS_SOURCE = {
  id: "aeat.model-381.news.2025-09-29",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 381 · información sobre su aprobación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2023/junio/22/modelo-381-impuesto-sobre-valor-europea.html",
  officialUpdatedOn: "2025-09-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "95f8211e819c9f94d9fee8984e1bd719ad2652de697c5db985dae380d137f510",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_381_ORDER_SOURCE = {
  id: "boe.model-381.order-hfp-645-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/645/2023, de 20 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-14734",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8745f01cd90f6ae3aa450897f086e7ef437e48c883a0a438073b815132ff3067",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-390.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 390 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G412.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5535f689bebbe3f126c48f5c31cd7cfbb9f3a74347ea85b2cf376962ea242063",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-390.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 390",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G412.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "271e67878f6395fd7282e4ce35f3cfef19344ff492c8f95b5b402d0c5d9a8425",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_FORM_HELP_SOURCE = {
  id: "aeat.model-390.form-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 390 · ayuda del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-390/modelo-390-presentacion-mediante-formulario.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c49c76b61a407b4b12f004246d76f195dd8d31c4741bff64b3d9721bf41bfaf8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_FILE_HELP_SOURCE = {
  id: "aeat.model-390.file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 390 · ayuda del canal mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-390/modelo-390-presentacion-mediante-fichero.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7555f6d2d5bdce8732c71a8caf574ee9d97279530f94bffda298fcec1221eda5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_SIMULATOR_HELP_SOURCE = {
  id: "aeat.model-390.simulator-help.2026-02-05",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 390 · ayuda del simulador OPEN",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-390/modelo-390-simulador.html",
  officialUpdatedOn: "2026-02-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b0a6597d51af5df7f6a809d5ba6b21963d60d4be28c09722ed31b0edf47e0746",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_INSTRUCTIONS_2025_SOURCE = {
  id: "aeat.model-390.instructions-2025-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 390 · instrucciones 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G412/Instrucciones_modelo_390-2025.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "26028dcb993675bf91cdf9b9fb50742c473c5fe6680735e29acdc3c560d3301d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_INSTRUCTIONS_2024_SOURCE = {
  id: "aeat.model-390.instructions-2024-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 390 · instrucciones 2024",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G412/instr390.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2af493936c21232f596df92f48768ebb92a928237103ef4dfefba1921816a0f3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_DESIGN_INDEX_SOURCE = {
  id: "aeat.record-designs.models-300-399.2026-02-04",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · modelos 300 al 399",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-300-399.html",
  officialUpdatedOn: "2026-02-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7df7813fc7fea0d0f44ba6eada7cb578bb007ee5813f3aca5ede9b828470375e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_DESIGN_SOURCE = {
  id: "aeat.model-390.record-design-2025.2025-12-05",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 390 · diseño de registro del ejercicio 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/archivos_25/dr390e2025.xlsx",
  officialUpdatedOn: "2025-12-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6d33d8a4245976e55dc31ff85065b420f76d1588110dc1eb541a8039c5e3f252",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_FAQ_SOURCE = {
  id: "aeat.model-390.manual-iva-faq.2025-09-29",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Manual práctico de IVA 2025 · cuestiones frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-09-declaraciones-informativas-iva-379/cuestiones-frecuentes-planteadas-capitulo.html",
  officialUpdatedOn: "2025-09-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "af98123e6ec55414f8834d1d7d04634650966047306c8681c8df00074c2fad47",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_390_ORDER_SOURCE = {
  id: "boe.model-390.order-eha-3111-2009.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3111/2009, de 5 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-18472",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a4dd3c459082564667c65cae0d7bfd0f1894b9d8c38df52aec19013c89b4feb6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ELECTRONIC_PROCEDURES_ORDER_SOURCE = {
  id: "boe.order-hap-2194-2013.original",
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

const MODEL_380_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_VAT_380_390_RELEASE_ID_V1,
  code: "380",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "IVA. Operaciones asimiladas a las importaciones",
  summary:
    "La AEAT identifica el Modelo 380 como la declaración-liquidación del IVA correspondiente a operaciones asimiladas a las importaciones y documenta un canal electrónico mediante formulario.",
  searchTerms: [
    "modelo 380",
    "IVA",
    "operaciones asimiladas a las importaciones",
    "declaración liquidación",
    "aduanas",
    "formulario electrónico",
    "medios de transporte",
    "consulta 380",
    "Orden EHA 1308 2005",
  ],
  sections: [
    {
      id: "model-380-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-380-purpose-identity",
          heading: "Operaciones asimiladas a las importaciones",
          text: "El índice y la portada de la AEAT sitúan el Modelo 380 en el IVA y lo denominan por su relación con las operaciones asimiladas a las importaciones.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_380_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-380-purpose-record",
          heading: "Declaración-liquidación",
          text: "La ficha administrativa define el objeto como un procedimiento tributario relativo a la declaración-liquidación del IVA para esas operaciones.",
          sourceIds: [MODEL_380_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-380-access",
      title: "Canal electrónico descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-380-access-form",
          heading: "Formulario en el navegador",
          text: "La portada y la ayuda técnica describen un formulario electrónico organizado en bloques de identificación, operaciones, medios de transporte cuando existan y datos de contacto u observaciones.",
          sourceIds: [
            MODEL_380_PROCEDURE_HOME_SOURCE.id,
            MODEL_380_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-380-access-query",
          heading: "Consulta diferenciada",
          text: "La AEAT publica una ayuda específica para consultar declaraciones y explica que la información se distribuye en apartados temáticos y una vista conjunta.",
          sourceIds: [MODEL_380_QUERY_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-380-details",
      title: "Información técnica y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-380-details-help",
          heading: "Ayuda oficial ilustrada",
          text: "La ayuda técnica de la AEAT acompaña la explicación del formulario y de la consulta con capturas de sus distintas áreas.",
          sourceIds: [MODEL_380_HELP_SOURCE.id, MODEL_380_QUERY_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-380-details-orders",
          heading: "Órdenes enlazadas por la AEAT",
          text: "La portada registra como referencias normativas las órdenes EHA/1308/2005, EHA/3482/2007 y HFP/626/2023.",
          sourceIds: [
            MODEL_380_PROCEDURE_HOME_SOURCE.id,
            MODEL_380_ORDER_2005_SOURCE.id,
            MODEL_380_ORDER_2007_SOURCE.id,
            MODEL_380_ORDER_2023_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_380_PROCEDURE_HOME_SOURCE,
    MODEL_380_PROCEDURE_RECORD_SOURCE,
    MODEL_380_HELP_SOURCE,
    MODEL_380_QUERY_HELP_SOURCE,
    MODEL_380_ORDER_2005_SOURCE,
    MODEL_380_ORDER_2007_SOURCE,
    MODEL_380_ORDER_2023_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-380-link-procedure",
      label: "Página oficial del Modelo 380",
      sourceId: MODEL_380_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_380_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-link-help",
      label: "Ayuda técnica del Modelo 380",
      sourceId: MODEL_380_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-link-query-help",
      label: "Ayuda oficial para la consulta",
      sourceId: MODEL_380_QUERY_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-link-order",
      label: "Orden EHA/1308/2005",
      sourceId: MODEL_380_ORDER_2005_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-380-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 380?",
      answer:
        "Una declaración-liquidación de IVA vinculada a operaciones asimiladas a las importaciones.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_380_PROCEDURE_HOME_SOURCE.id,
        MODEL_380_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-channel",
      question: "¿Qué tipo de canal describe la AEAT?",
      answer: "Un formulario electrónico accesible mediante el navegador.",
      sourceIds: [MODEL_380_PROCEDURE_HOME_SOURCE.id, MODEL_380_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-sections",
      question: "¿Qué áreas generales muestra el formulario?",
      answer:
        "La ayuda enumera identificación, operaciones, medios de transporte cuando correspondan y contacto u observaciones.",
      sourceIds: [MODEL_380_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-transport",
      question: "¿Contempla la ayuda información sobre medios de transporte?",
      answer:
        "Sí. La ayuda muestra un apartado específico cuando la declaración incorpora medios de transporte.",
      sourceIds: [MODEL_380_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-query",
      question: "¿Existe una consulta oficial diferenciada?",
      answer:
        "Sí. La AEAT publica una gestión y una ayuda separadas para la consulta de declaraciones del Modelo 380.",
      sourceIds: [
        MODEL_380_PROCEDURE_HOME_SOURCE.id,
        MODEL_380_QUERY_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-query-sections",
      question: "¿Cómo organiza la ayuda la información consultada?",
      answer:
        "La distribuye en apartados de identificación, operaciones, medios de transporte, contacto, observaciones y una vista conjunta.",
      sourceIds: [MODEL_380_QUERY_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-documents",
      question: "¿Qué material explicativo enlaza la portada?",
      answer:
        "Enlaza la ayuda técnica de la AEAT para el formulario y la consulta; la portada registrada no ofrece un PDF independiente del modelo.",
      sourceIds: [MODEL_380_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-380-faq-order",
      question: "¿Qué orden aprobó originalmente el Modelo 380?",
      answer: "La Orden EHA/1308/2005, de 11 de mayo.",
      sourceIds: [MODEL_380_ORDER_2005_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_380_PROCEDURE_HOME_SOURCE.id, MODEL_380_HELP_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"380">;

const MODEL_381_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_VAT_380_390_RELEASE_ID_V1,
  code: "381",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Solicitud de reembolso de las cuotas tributarias relativas a las Fuerzas Armadas de cualquier Estado miembro distinto de España",
  summary:
    "La AEAT identifica el Modelo 381 como una solicitud electrónica de reembolso de IVA vinculada a fuerzas armadas de Estados miembros de la Unión Europea distintos de España en el contexto de la política común de seguridad y defensa.",
  searchTerms: [
    "modelo 381",
    "IVA",
    "solicitud de reembolso",
    "Fuerzas Armadas",
    "Estados miembros",
    "Unión Europea",
    "política común de seguridad y defensa",
    "esfuerzo de defensa",
    "formulario electrónico",
    "Orden HFP 645 2023",
  ],
  sections: [
    {
      id: "model-381-purpose",
      title: "Identidad y contexto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-381-purpose-identity",
          heading: "Solicitud de reembolso de IVA",
          text: "El índice y la portada de la AEAT identifican el Modelo 381 como una solicitud de reembolso de cuotas de IVA relativa a fuerzas armadas de un Estado miembro distinto de España.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_381_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-381-purpose-context",
          heading: "Política común de seguridad y defensa",
          text: "La noticia de la AEAT y la orden de aprobación sitúan el modelo en adquisiciones vinculadas a esfuerzos realizados en el ámbito de la política común de seguridad y defensa.",
          sourceIds: [MODEL_381_NEWS_SOURCE.id, MODEL_381_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-381-access",
      title: "Canal electrónico",
      kind: "ACCESS",
      items: [
        {
          id: "model-381-access-format",
          heading: "Modelo de formato electrónico",
          text: "La Orden HFP/645/2023 define el Modelo 381 como un modelo de formato electrónico y la portada oficial muestra gestiones en el navegador.",
          sourceIds: [
            MODEL_381_ORDER_SOURCE.id,
            MODEL_381_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-381-access-actions",
          heading: "Cumplimentación, canal principal y consulta",
          text: "La portada distingue una cumplimentación previa para colaboración social, el canal electrónico principal y una consulta separada.",
          sourceIds: [MODEL_381_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-381-details",
      title: "Aprobación y referencias oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-381-details-news",
          heading: "Información de la AEAT sobre la aprobación",
          text: "La AEAT publicó una noticia específica que resume la creación del modelo y el contexto institucional al que responde.",
          sourceIds: [MODEL_381_NEWS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-381-details-order",
          heading: "Orden HFP/645/2023",
          text: "La Orden HFP/645/2023, de 20 de junio, aprueba el Modelo 381 y describe su formato electrónico.",
          sourceIds: [MODEL_381_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_381_PROCEDURE_HOME_SOURCE,
    MODEL_381_NEWS_SOURCE,
    MODEL_381_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-381-link-procedure",
      label: "Página oficial del Modelo 381",
      sourceId: MODEL_381_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-link-news",
      label: "Información de la AEAT sobre el Modelo 381",
      sourceId: MODEL_381_NEWS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-link-order",
      label: "Orden HFP/645/2023",
      sourceId: MODEL_381_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-381-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 381?",
      answer:
        "Una solicitud de reembolso de cuotas de IVA relativa a fuerzas armadas de Estados miembros de la Unión Europea distintos de España.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_381_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-faq-context",
      question: "¿En qué contexto sitúan el modelo las fuentes oficiales?",
      answer:
        "En esfuerzos desarrollados en el ámbito de la política común de seguridad y defensa de la Unión Europea.",
      sourceIds: [MODEL_381_NEWS_SOURCE.id, MODEL_381_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-faq-order",
      question: "¿Qué norma aprobó el Modelo 381?",
      answer: "La Orden HFP/645/2023, de 20 de junio.",
      sourceIds: [MODEL_381_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-faq-format",
      question: "¿Qué formato tiene el modelo según la orden?",
      answer:
        "La orden lo define expresamente como un modelo de formato electrónico.",
      sourceIds: [MODEL_381_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-faq-prefill",
      question: "¿Qué opción previa distingue la portada?",
      answer:
        "Una cumplimentación del modelo orientada a su posterior gestión mediante colaboración social.",
      sourceIds: [MODEL_381_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-faq-query",
      question: "¿Existe una consulta diferenciada?",
      answer:
        "Sí. La portada oficial muestra una consulta propia del Modelo 381.",
      sourceIds: [MODEL_381_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-381-faq-news",
      question: "¿Publicó la AEAT información sobre su creación?",
      answer:
        "Sí. La AEAT publicó una noticia específica al difundirse la orden que aprobó el modelo.",
      sourceIds: [MODEL_381_NEWS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_381_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"381">;

const MODEL_390_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_13_VAT_380_390_RELEASE_ID_V1,
  code: "390",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "IVA. Declaración Resumen Anual",
  summary:
    "Resumen anual del IVA. Recoge el conjunto del ejercicio y no sustituye las autoliquidaciones del Modelo 303.",
  searchTerms: [
    "modelo 390",
    "IVA",
    "declaración resumen anual",
    "resumen anual IVA",
    "formulario web",
    "presentación mediante fichero",
    "simulador OPEN",
    "instrucciones 2025",
    "diseño de registro",
    "Orden EHA 3111 2009",
    "exoneración modelo 390",
    "información anual último 303",
    "plazo enero modelo 390",
    "simulador no presenta",
    "conciliar 303 y 390",
  ],
  sections: [
    {
      id: "model-390-purpose",
      title: "Identidad y finalidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-390-purpose-identity",
          heading: "Declaración resumen anual del IVA",
          text: "El índice, la portada y la ficha administrativa identifican el Modelo 390 como la declaración resumen anual del Impuesto sobre el Valor Añadido.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_390_PROCEDURE_HOME_SOURCE.id,
            MODEL_390_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-390-purpose-record",
          heading: "Finalidad administrativa",
          text: "La ficha del procedimiento indica que su objeto es facilitar la declaración del resumen anual del IVA.",
          sourceIds: [MODEL_390_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-390-access",
      title: "Canales y herramientas descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-390-access-channels",
          heading: "Formulario web y fichero",
          text: "La portada y las ayudas técnicas diferencian un formulario web y un canal que carga un fichero generado externamente conforme al diseño publicado por la AEAT.",
          sourceIds: [
            MODEL_390_PROCEDURE_HOME_SOURCE.id,
            MODEL_390_FORM_HELP_SOURCE.id,
            MODEL_390_FILE_HELP_SOURCE.id,
            MODEL_390_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-390-access-simulator",
          heading: "Simulador OPEN independiente",
          text: "La AEAT publica un simulador que permite trabajar con una simulación y declara expresamente que esa herramienta no transmite la declaración.",
          sourceIds: [MODEL_390_SIMULATOR_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-390-details",
      title: "Instrucciones, diseño y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-390-details-documents",
          heading: "Instrucciones oficiales descargables",
          text: "La portada enlaza instrucciones identificadas para 2025 y conserva también el documento correspondiente a 2024.",
          sourceIds: [
            MODEL_390_PROCEDURE_HOME_SOURCE.id,
            MODEL_390_INSTRUCTIONS_2025_SOURCE.id,
            MODEL_390_INSTRUCTIONS_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-390-details-design",
          heading: "Diseño de registro 2025",
          text: "El índice técnico de la AEAT publica para el Modelo 390 un diseño de registro etiquetado para el ejercicio 2025 y actualizado el 5 de diciembre de 2025.",
          sourceIds: [
            MODEL_390_DESIGN_INDEX_SOURCE.id,
            MODEL_390_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-390-details-legal",
          heading: "Normativa principal registrada",
          text: "La portada enlaza la Orden EHA/3111/2009, que aprobó el Modelo 390, y la Orden HAP/2194/2013 sobre procedimientos electrónicos tributarios.",
          sourceIds: [
            MODEL_390_ORDER_SOURCE.id,
            ELECTRONIC_PROCEDURES_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_390_PROCEDURE_HOME_SOURCE,
    MODEL_390_PROCEDURE_RECORD_SOURCE,
    MODEL_390_FORM_HELP_SOURCE,
    MODEL_390_FILE_HELP_SOURCE,
    MODEL_390_SIMULATOR_HELP_SOURCE,
    MODEL_390_INSTRUCTIONS_2025_SOURCE,
    MODEL_390_INSTRUCTIONS_2024_SOURCE,
    MODEL_390_DESIGN_INDEX_SOURCE,
    MODEL_390_DESIGN_SOURCE,
    MODEL_390_FAQ_SOURCE,
    MODEL_390_ORDER_SOURCE,
    ELECTRONIC_PROCEDURES_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-390-instructions-2025-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones del Modelo 390 · 2025",
      sourceId: MODEL_390_INSTRUCTIONS_2025_SOURCE.id,
      landingPageSourceId: MODEL_390_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Instrucciones_modelo_390-2025.pdf",
      byteLength: 355432,
      pageCount: 28,
      sha256:
        "26028dcb993675bf91cdf9b9fb50742c473c5fe6680735e29acdc3c560d3301d",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-390-instructions-2024-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones del Modelo 390 · 2024",
      sourceId: MODEL_390_INSTRUCTIONS_2024_SOURCE.id,
      landingPageSourceId: MODEL_390_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "instr390.pdf",
      byteLength: 760685,
      pageCount: 29,
      sha256:
        "2af493936c21232f596df92f48768ebb92a928237103ef4dfefba1921816a0f3",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-390-instructions-2025-thumbnail",
    sourceId: MODEL_390_INSTRUCTIONS_2025_SOURCE.id,
    publicHref:
      "/fiscal-models/modelo-390/instrucciones-modelo-390-2025-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "0498ec5d65679d6c3084bb6bbaf5bdca0469eb9cc827350ccebd50b8082b3252",
    alt: "Vista previa de la cabecera de las instrucciones oficiales del Modelo 390 para 2025",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-390-link-procedure",
      label: "Página oficial del Modelo 390",
      sourceId: MODEL_390_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_390_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-form-help",
      label: "Ayuda oficial del formulario",
      sourceId: MODEL_390_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-file-help",
      label: "Ayuda oficial del canal mediante fichero",
      sourceId: MODEL_390_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-simulator",
      label: "Información del simulador OPEN",
      sourceId: MODEL_390_SIMULATOR_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-instructions",
      label: "Instrucciones oficiales 2025",
      sourceId: MODEL_390_INSTRUCTIONS_2025_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-design",
      label: "Diseño de registro del Modelo 390 · 2025",
      sourceId: MODEL_390_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-faq",
      label: "Cuestiones frecuentes del Manual práctico de IVA 2025",
      sourceId: MODEL_390_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-link-order",
      label: "Orden EHA/3111/2009",
      sourceId: MODEL_390_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-390-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 390?",
      answer:
        "La declaración resumen anual del Impuesto sobre el Valor Añadido.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_390_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-purpose",
      question: "¿Qué finalidad recoge su ficha administrativa?",
      answer: "Facilitar la declaración del resumen anual del IVA.",
      sourceIds: [MODEL_390_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-channels",
      question: "¿Qué dos canales técnicos distingue la AEAT?",
      answer: "Un formulario web y un canal mediante fichero.",
      sourceIds: [
        MODEL_390_PROCEDURE_HOME_SOURCE.id,
        MODEL_390_FORM_HELP_SOURCE.id,
        MODEL_390_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-file",
      question: "¿Qué describe la ayuda sobre el fichero?",
      answer:
        "Lo relaciona con una aplicación externa y con el diseño de registro publicado por la AEAT.",
      sourceIds: [MODEL_390_FILE_HELP_SOURCE.id, MODEL_390_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-simulator",
      question: "¿Qué hace el simulador OPEN?",
      answer:
        "Permite trabajar con una simulación del resumen anual de IVA sin transmitir una declaración.",
      sourceIds: [MODEL_390_SIMULATOR_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-instructions",
      question: "¿Qué instrucciones enlaza la portada consultada?",
      answer:
        "Las instrucciones identificadas para 2025 y, como referencia anterior, las correspondientes a 2024.",
      sourceIds: [
        MODEL_390_PROCEDURE_HOME_SOURCE.id,
        MODEL_390_INSTRUCTIONS_2025_SOURCE.id,
        MODEL_390_INSTRUCTIONS_2024_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-pdf-safety",
      question: "¿Los PDF registrados son formularios ejecutables?",
      answer:
        "No. Son documentos de instrucciones; las copias auditadas no contienen campos de formulario ni JavaScript.",
      sourceIds: [
        MODEL_390_INSTRUCTIONS_2025_SOURCE.id,
        MODEL_390_INSTRUCTIONS_2024_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-design",
      question: "¿Publica la AEAT un diseño de registro?",
      answer:
        "Sí. El índice técnico enlaza un diseño del Modelo 390 etiquetado para el ejercicio 2025.",
      sourceIds: [MODEL_390_DESIGN_INDEX_SOURCE.id, MODEL_390_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-faq",
      question: "¿Incluye la AEAT cuestiones frecuentes sobre el Modelo 390?",
      answer:
        "Sí. El Manual práctico de IVA 2025 reúne cuestiones frecuentes en el capítulo que trata los modelos 390, 349 y 379.",
      sourceIds: [MODEL_390_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-390-faq-order",
      question: "¿Qué orden aprobó el Modelo 390?",
      answer: "La Orden EHA/3111/2009, de 5 de noviembre.",
      sourceIds: [MODEL_390_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_390_PROCEDURE_HOME_SOURCE.id,
      MODEL_390_FORM_HELP_SOURCE.id,
      MODEL_390_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"390">;

export const PUBLIC_AEAT_BATCH_13_VAT_380_390_CONTENT_V1 = deepFreeze([
  MODEL_380_CONTENT,
  MODEL_381_CONTENT,
  MODEL_390_CONTENT,
] as const);
