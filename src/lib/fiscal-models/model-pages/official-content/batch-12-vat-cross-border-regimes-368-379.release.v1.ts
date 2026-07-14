import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_RELEASE_ID_V1 =
  "public-aeat-official-batch-12-vat-cross-border-regimes-368-379.2026-07-13.v1" as const;

export type PublicAeatBatch12VatCrossBorderRegimes368379CodeV1 =
  "368" | "369" | "379";

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

const MODEL_368_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-368.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 368 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G330.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6df464c6afa35e4af834df1b124f1f44e4b10da706465e8a1ce3f3c0ca045a4f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-368.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 368",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G330.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6d05d9cc245a4bd831907d560514fc2f43b9ee2772bdad082d602b60e28be47f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_UNION_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-368.union-instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 368 · instrucciones del régimen de la Unión",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-368-decla-radiodifusion-television-electronicos_/instrucciones-modelo-368-regimen-union.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f4e4026e8417c8fa0bb81b707c9b738a14a619ac74cfd09e40996cb3291b0846",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-368.non-union-instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 368 · instrucciones del régimen exterior de la Unión",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-368-decla-radiodifusion-television-electronicos_/instrucciones-modelo-368-regimen-exterior-union.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2690fe4c091dcd644b230e79f8ef812184f9331cea8428b82f4b59eecaeb0557",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_UNION_PDF_SOURCE = {
  id: "aeat.model-368.union-instructions-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 368 · instrucciones PDF del régimen de la Unión",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G330/Ayuda_368_Interior_Union_es_es.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a0e169695f1378cdc1448e4f39a17bd701b8c46a072d0eb6101f36d24684dd44",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_NON_UNION_PDF_SOURCE = {
  id: "aeat.model-368.non-union-instructions-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 368 · instrucciones PDF del régimen exterior de la Unión",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G330/Ayuda_368_Exterior_Union_es_es.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "01c1ab26de05c7663b24c31fb5703525527e8253e46440f5b609d73e2c36ab84",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_ORDER_SOURCE = {
  id: "boe.model-368.order-hap-460-2015.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/460/2015, de 10 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-2891",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0fd003b9bbeb1669362a706cd3509528ff5f284b10be3851372ae339cb63a19",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_369_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-369.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 369 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G420.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3b7bddc6116e09f26d8514bcd09b805cd70f15c0fdf043bd317510cba34a5919",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_369_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-369.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 369",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G420.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5d99a6f7bcde780adfd824152691beee139384d37cf388ffa276a79f6cb1a1bf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_369_HELP_SOURCE = {
  id: "aeat.model-369.file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 369 · ayuda técnica",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-369.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7ffe3c6c9d758dba8b5afaaafd288641c4f825562d950a22889d9d1ad6ec7c0d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_369_FILE_GUIDE_SOURCE = {
  id: "aeat.model-369.file-guide-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 369 · guía de presentación por fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Consultas_Inf/Presentacion_declaraciones/IVA_mensuales_trimestrales/Modelo_369/Descripcion_PresentacionFichero369_v1.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "521fb8e9918b77555be781434006d560bbec28d30318ff158096ecca0e9ed56d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_369_ORDER_SOURCE = {
  id: "boe.model-369.order-hac-610-2021.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/610/2021, de 16 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-10161",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "edda25c39b3d6ad09116b8a691e764b4d8dbccfaf517e7de9d6d8c8fc63bbdf2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-379.procedure-home.2026-04-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 379 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI51.shtml",
  officialUpdatedOn: "2026-04-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "034099afcd72525117dfe4a4716586cac8cca1e74b6289217a2cdd48b564548b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-379.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 379",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI51.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "178f374af58829d96e7a8776bb791d70eccb63d9cceda9869fcc2757d4d553dc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_FAQ_INDEX_SOURCE = {
  id: "aeat.model-379.faq-index.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 379 · preguntas frecuentes oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-379-declaracion-informativa-pagos-transfronterizas/preguntas-frecuentes-sobre-declaracion-informativa-transfronterizos.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "84079c10831c27e590c2c842481ca6ec2c2e3f2271c8c5fffd67866718d94d46",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_GENERAL_FAQ_SOURCE = {
  id: "aeat.model-379.general-faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 379 · cuestiones generales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-379-declaracion-informativa-pagos-transfronterizas/preguntas-frecuentes-sobre-declaracion-informativa-transfronterizos/cuestiones-generales.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fffc122d2618db9985cbcf41ccfb9bb974b19b6a15c608ad6f7863a56bbc5583",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_CONTENT_FAQ_SOURCE = {
  id: "aeat.model-379.content-faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 379 · contenido de la declaración informativa",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-379-declaracion-informativa-pagos-transfronterizas/preguntas-frecuentes-sobre-declaracion-informativa-transfronterizos/contenido-declaracion-informativa-sobre-pagos-transfronterizos.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a0c169698d2e394e6197a5bce95f12d7f066a8f40999952a87301eb4ee598438",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_PRESENTATION_FAQ_SOURCE = {
  id: "aeat.model-379.presentation-faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 379 · preguntas sobre el canal de presentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-379-declaracion-informativa-pagos-transfronterizas/preguntas-frecuentes-sobre-declaracion-informativa-transfronterizos/presentacion-modelo-379-declaracion-informativa-transfronterizos.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f28e3c62a2a99599599098724437aefb9e797585c09e596755b8b075007a2929",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_GUIDELINES_SOURCE = {
  id: "aeat.model-379.presentation-guidelines-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 379 · directrices de presentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI51/DirectricesPresentacionM379.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0ac6635219be2765dcb2367f5d337993054a16bd557203789d15edb8551ad21c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_TECHNICAL_MANUAL_SOURCE = {
  id: "aeat.model-379.web-service-manual-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 379 · manual técnico del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/Mod_379/CESOP-Presentacion-379-SWeb.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "60a24e3cecf0f80b6956c8e1ce298d36037b0734ed6a3438e600f80be823fbd4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_XSD_SOURCE = {
  id: "aeat.model-379.xsd-examples.2026-07-08",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 379 · esquemas XSD y ejemplos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-379-declaracion-informativa-pagos-transfronterizas/esquemas-xsd.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b4db4db58d4bbb743e273630fcfb09348d74908866b22e08b023f46e667d1a06",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const IVA_LAW_SOURCE = {
  id: "boe.iva.law-37-1992.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-1992-28740",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "91249600e999b8cb6de807035d19804fc57726bc287035dd5643e0f75ba69ebc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const IVA_REGULATION_SOURCE = {
  id: "boe.iva.royal-decree-1624-1992.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 1624/1992, de 29 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-1992-28925",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "45389ee39a31881ee85809b76debcc803ac05a7216608785b154830741c68bed",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_379_ORDER_SOURCE = {
  id: "boe.model-379.order-hfp-1415-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1415/2023, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-26739",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2caa717aad5bc326e564643087d1c01e665ebef089ae10d680dd0df52d6da21b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_368_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_RELEASE_ID_V1,
  code: "368",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración de IVA de los regímenes especiales de servicios de telecomunicaciones, de radiodifusión o de televisión o electrónicos",
  summary:
    "La AEAT conserva el Modelo 368 para información y consulta de declaraciones de IVA de determinados regímenes especiales de servicios electrónicos, con instrucciones diferenciadas para el régimen de la Unión y el régimen exterior de la Unión. La portada actual no ofrece un acceso de presentación y esta ficha no deduce su vigencia operativa.",
  searchTerms: [
    "modelo 368",
    "IVA",
    "servicios de telecomunicaciones",
    "radiodifusión",
    "televisión",
    "servicios electrónicos",
    "régimen de la Unión",
    "régimen exterior de la Unión",
    "MOSS",
    "mini ventanilla única",
    "instrucciones 368",
    "Orden HAP 460 2015",
  ],
  sections: [
    {
      id: "model-368-purpose",
      title: "Identidad y alcance de la información oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-368-purpose-identity",
          heading: "Regímenes especiales de determinados servicios",
          text: "El índice y la portada de la AEAT identifican el Modelo 368 con una declaración de IVA de los regímenes especiales aplicables a servicios de telecomunicaciones, radiodifusión, televisión o prestados por vía electrónica.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_368_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-368-purpose-current-home",
          heading: "Portada actual orientada a consultas",
          text: "La portada oficial consultada ofrece consultas de declaraciones, del estado de tramitación y de documentación relacionada, pero no muestra una gestión destacada de presentación. Por ello esta ficha mantiene indeterminada la vigencia operativa del canal.",
          sourceIds: [MODEL_368_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-368-access",
      title: "Instrucciones y referencia del canal",
      kind: "ACCESS",
      items: [
        {
          id: "model-368-access-record",
          heading: "Referencia administrativa a tramitación telemática",
          text: "La ficha administrativa conserva una referencia a tramitación telemática y al Modelo 368 por vía electrónica. Se registra como antecedente oficial y no como confirmación de un acceso de presentación vigente.",
          sourceIds: [MODEL_368_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-368-access-regimes",
          heading: "Dos juegos de instrucciones",
          text: "La AEAT publica instrucciones separadas para el régimen de la Unión y el régimen exterior de la Unión, tanto en páginas HTML como en documentos PDF informativos.",
          sourceIds: [
            MODEL_368_UNION_INSTRUCTIONS_SOURCE.id,
            MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE.id,
            MODEL_368_UNION_PDF_SOURCE.id,
            MODEL_368_NON_UNION_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-368-details",
      title: "Documentación y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-368-details-documents",
          heading: "Documentos de instrucciones, no formularios en blanco",
          text: "Los dos PDF registrados explican la identificación y la estructura informativa de cada régimen. No son formularios en blanco y no se usan para presentar desde esta aplicación.",
          sourceIds: [
            MODEL_368_UNION_PDF_SOURCE.id,
            MODEL_368_NON_UNION_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-368-details-order",
          heading: "Orden de aprobación registrada",
          text: "La referencia normativa enlazada por la AEAT es la Orden HAP/460/2015, de 10 de marzo, publicada en el BOE.",
          sourceIds: [MODEL_368_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_368_PROCEDURE_HOME_SOURCE,
    MODEL_368_PROCEDURE_RECORD_SOURCE,
    MODEL_368_UNION_INSTRUCTIONS_SOURCE,
    MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE,
    MODEL_368_UNION_PDF_SOURCE,
    MODEL_368_NON_UNION_PDF_SOURCE,
    MODEL_368_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-368-union-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones del régimen de la Unión",
      sourceId: MODEL_368_UNION_PDF_SOURCE.id,
      landingPageSourceId: MODEL_368_UNION_INSTRUCTIONS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Ayuda_368_Interior_Union_es_es.pdf",
      byteLength: 83514,
      pageCount: 3,
      sha256:
        "a0e169695f1378cdc1448e4f39a17bd701b8c46a072d0eb6101f36d24684dd44",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-368-non-union-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones del régimen exterior de la Unión",
      sourceId: MODEL_368_NON_UNION_PDF_SOURCE.id,
      landingPageSourceId: MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Ayuda_368_Exterior_Union_es_es.pdf",
      byteLength: 84706,
      pageCount: 2,
      sha256:
        "01c1ab26de05c7663b24c31fb5703525527e8253e46440f5b609d73e2c36ab84",
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
      id: "model-368-link-procedure",
      label: "Página oficial del Modelo 368",
      sourceId: MODEL_368_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_368_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-link-union-instructions",
      label: "Instrucciones del régimen de la Unión",
      sourceId: MODEL_368_UNION_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-link-non-union-instructions",
      label: "Instrucciones del régimen exterior de la Unión",
      sourceId: MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-link-order",
      label: "Orden HAP/460/2015",
      sourceId: MODEL_368_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-368-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 368?",
      answer:
        "Una declaración de IVA vinculada a los regímenes especiales de determinados servicios de telecomunicaciones, radiodifusión, televisión o electrónicos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_368_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-regimes",
      question: "¿Qué regímenes distinguen las instrucciones oficiales?",
      answer:
        "Distinguen el régimen de la Unión y el régimen exterior de la Unión.",
      sourceIds: [
        MODEL_368_UNION_INSTRUCTIONS_SOURCE.id,
        MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-union-identifier",
      question:
        "¿Qué identificador menciona la instrucción del régimen de la Unión?",
      answer: "La página de instrucciones comienza por el NIF del declarante.",
      sourceIds: [MODEL_368_UNION_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-non-union-identifier",
      question:
        "¿Qué identificador menciona la instrucción del régimen exterior de la Unión?",
      answer:
        "La página de instrucciones menciona el NOE asignado por la Agencia Tributaria.",
      sourceIds: [MODEL_368_NON_UNION_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-current-access",
      question: "¿La portada actual muestra una gestión de presentación?",
      answer:
        "No. La portada consultada muestra gestiones de consulta y documentación; esta ficha no infiere por ello un canal de presentación vigente.",
      sourceIds: [MODEL_368_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-record-channel",
      question: "¿Qué canal conserva la ficha administrativa?",
      answer:
        "Conserva una referencia a vía electrónica y lugar de presentación telemático, tratada aquí como antecedente documental.",
      sourceIds: [MODEL_368_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-documents",
      question: "¿Hay instrucciones descargables?",
      answer:
        "Sí. La AEAT publica un PDF para cada uno de los dos regímenes descritos.",
      sourceIds: [
        MODEL_368_UNION_PDF_SOURCE.id,
        MODEL_368_NON_UNION_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-form",
      question: "¿Esos PDF son formularios en blanco?",
      answer:
        "No. Son documentos de instrucciones; las copias auditadas no contienen campos de formulario ni JavaScript.",
      sourceIds: [
        MODEL_368_UNION_PDF_SOURCE.id,
        MODEL_368_NON_UNION_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-368-faq-order",
      question: "¿Qué orden figura como referencia normativa?",
      answer: "La Orden HAP/460/2015, de 10 de marzo.",
      sourceIds: [MODEL_368_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"368">;

const MODEL_369_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_RELEASE_ID_V1,
  code: "369",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Declaraciones de IVA del régimen One Stop Shop (OSS)",
  summary:
    "Declaración y pago del IVA de las operaciones incluidas en los regímenes OSS e IOSS.",
  searchTerms: [
    "modelo 369",
    "IVA",
    "One Stop Shop",
    "OSS",
    "ventanilla única europea",
    "ventas transfronterizas",
    "ventas a distancia",
    "régimen de la Unión",
    "régimen exterior de la Unión",
    "régimen de importación",
    "presentación por fichero",
    "diseño de registro 369",
    "Orden HAC 610 2021",
  ],
  sections: [
    {
      id: "model-369-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-369-purpose-identity",
          heading: "Ventanilla única europea de IVA",
          text: "El índice y la portada oficial identifican el Modelo 369 con declaraciones de IVA del régimen One Stop Shop. La ficha administrativa describe este sistema como la ventanilla única europea de IVA para determinadas ventas transfronterizas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_369_PROCEDURE_HOME_SOURCE.id,
            MODEL_369_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-369-purpose-regimes",
          heading: "Tres regímenes diferenciados",
          text: "La portada oficial distingue formularios para el régimen de la Unión, el régimen exterior de la Unión y el régimen de importación. Esta ficha describe esa estructura y no decide qué régimen corresponde a una persona.",
          sourceIds: [MODEL_369_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-369-access",
      title: "Canales técnicos documentados",
      kind: "ACCESS",
      items: [
        {
          id: "model-369-access-browser",
          heading: "Formularios electrónicos por régimen",
          text: "La portada enlaza tres formularios electrónicos, uno por cada régimen descrito. Aquí solo se informa del tipo de canal; no se reproducen enlaces operativos de presentación.",
          sourceIds: [
            MODEL_369_PROCEDURE_HOME_SOURCE.id,
            MODEL_369_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-369-access-file",
          heading: "Carga de fichero de texto",
          text: "La ayuda técnica describe una presentación electrónica mediante un fichero de texto ajustado al diseño de registro, con datos de una única declaración y un único contribuyente para el período indicado en la fuente.",
          sourceIds: [MODEL_369_HELP_SOURCE.id, MODEL_369_FILE_GUIDE_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-369-details",
      title: "Ayuda y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-369-details-validation",
          heading: "Validación y gestión local de datos",
          text: "La ayuda oficial documenta funciones de validación y de guardado o carga de datos, además de la importación del fichero. Esta aplicación no replica esas operaciones.",
          sourceIds: [MODEL_369_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-369-details-order",
          heading: "Orden de aprobación registrada",
          text: "La referencia normativa específica enlazada por la AEAT es la Orden HAC/610/2021, de 16 de junio.",
          sourceIds: [MODEL_369_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_369_PROCEDURE_HOME_SOURCE,
    MODEL_369_PROCEDURE_RECORD_SOURCE,
    MODEL_369_HELP_SOURCE,
    MODEL_369_FILE_GUIDE_SOURCE,
    MODEL_369_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-369-file-guide-document",
      kind: "GUIDE",
      title: "Guía de presentación por fichero del Modelo 369",
      sourceId: MODEL_369_FILE_GUIDE_SOURCE.id,
      landingPageSourceId: MODEL_369_HELP_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Descripcion_PresentacionFichero369_v1.pdf",
      byteLength: 702350,
      pageCount: 4,
      sha256:
        "521fb8e9918b77555be781434006d560bbec28d30318ff158096ecca0e9ed56d",
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
      id: "model-369-link-procedure",
      label: "Página oficial del Modelo 369",
      sourceId: MODEL_369_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_369_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-link-help",
      label: "Ayuda técnica oficial del Modelo 369",
      sourceId: MODEL_369_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-link-order",
      label: "Orden HAC/610/2021",
      sourceId: MODEL_369_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-369-faq-identity",
      question: "¿Qué es el Modelo 369 según la AEAT?",
      answer:
        "Es el modelo identificado para las declaraciones de IVA del régimen One Stop Shop, la ventanilla única europea de IVA para determinadas ventas transfronterizas.",
      sourceIds: [
        MODEL_369_PROCEDURE_HOME_SOURCE.id,
        MODEL_369_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-regimes",
      question: "¿Qué regímenes aparecen en la portada oficial?",
      answer:
        "El régimen de la Unión, el régimen exterior de la Unión y el régimen de importación.",
      sourceIds: [MODEL_369_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-browser",
      question: "¿La AEAT describe formularios electrónicos?",
      answer:
        "Sí. La portada diferencia un formulario electrónico para cada uno de los tres regímenes.",
      sourceIds: [MODEL_369_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-file",
      question: "¿Existe un canal por fichero?",
      answer:
        "Sí. La ayuda técnica documenta la importación de un fichero de texto ajustado al diseño de registro.",
      sourceIds: [MODEL_369_HELP_SOURCE.id, MODEL_369_FILE_GUIDE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-one-declaration",
      question: "¿Qué alcance tiene cada fichero según la ayuda?",
      answer:
        "La ayuda indica que cada fichero contiene los datos de una única declaración de un contribuyente para un período.",
      sourceIds: [MODEL_369_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-validation",
      question: "¿La ayuda describe validación del contenido?",
      answer:
        "Sí. Documenta una función que muestra avisos, advertencias y errores detectados.",
      sourceIds: [MODEL_369_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-data",
      question: "¿Se pueden guardar y cargar datos en el formulario oficial?",
      answer:
        "La ayuda técnica describe funciones de guardado y carga dentro del servicio de la AEAT.",
      sourceIds: [MODEL_369_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-guide",
      question: "¿Qué explica la guía PDF registrada?",
      answer:
        "Explica la estructura del fichero de texto y cómo se organiza la información de los tres regímenes.",
      sourceIds: [MODEL_369_FILE_GUIDE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-369-faq-order",
      question: "¿Qué orden aprueba el Modelo 369?",
      answer: "La Orden HAC/610/2021, de 16 de junio.",
      sourceIds: [MODEL_369_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_369_PROCEDURE_HOME_SOURCE.id,
      MODEL_369_PROCEDURE_RECORD_SOURCE.id,
      MODEL_369_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"369">;

const MODEL_379_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId:
    PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_RELEASE_ID_V1,
  code: "379",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Declaración informativa sobre pagos transfronterizos",
  summary:
    "La AEAT identifica el Modelo 379 como la declaración informativa sobre pagos transfronterizos y publica preguntas frecuentes, directrices, un manual técnico y esquemas para los canales de servicio web y carga de XML. Esta ficha explica las fuentes y no decide si una entidad debe declarar.",
  searchTerms: [
    "modelo 379",
    "declaración informativa",
    "pagos transfronterizos",
    "proveedores de servicios de pago",
    "CESOP",
    "servicio web",
    "archivo XML",
    "esquema XSD",
    "WSDL",
    "IBAN",
    "BIC",
    "Orden HFP 1415 2023",
  ],
  sections: [
    {
      id: "model-379-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-379-purpose-identity",
          heading: "Información sobre pagos transfronterizos",
          text: "El índice, la portada y la ficha del procedimiento identifican el Modelo 379 como una declaración informativa sobre pagos transfronterizos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_379_PROCEDURE_HOME_SOURCE.id,
            MODEL_379_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-379-purpose-record",
          heading: "Registros de proveedores de servicios de pago",
          text: "La ficha administrativa relaciona el modelo con determinados registros de pagos transfronterizos y de sus beneficiarios transmitidos por proveedores de servicios de pago. Esta descripción no evalúa la obligación de ninguna entidad concreta.",
          sourceIds: [MODEL_379_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-379-access",
      title: "Canales técnicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-379-access-web-service",
          heading: "Servicio web",
          text: "La portada oficial indica que el Modelo 379 se puede tramitar mediante servicio web y remite la documentación de conexión al apartado informativo. Esta aplicación no conecta con ese servicio.",
          sourceIds: [
            MODEL_379_PROCEDURE_HOME_SOURCE.id,
            MODEL_379_TECHNICAL_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-379-access-xml",
          heading: "Carga de archivo XML",
          text: "La FAQ oficial describe también la carga en la Sede de un archivo XML ajustado a los servicios web, como alternativa informativa al envío conectado.",
          sourceIds: [MODEL_379_PRESENTATION_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-379-details",
      title: "Documentación técnica y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-379-details-technical",
          heading: "Directrices, manual y esquemas",
          text: "La AEAT publica directrices generales, un manual técnico del servicio web y un índice de esquemas XSD, WSDL y ejemplos XML. Se enlazan como documentación externa y no se ejecutan ni importan en la aplicación.",
          sourceIds: [
            MODEL_379_GUIDELINES_SOURCE.id,
            MODEL_379_TECHNICAL_MANUAL_SOURCE.id,
            MODEL_379_XSD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-379-details-legal",
          heading: "Referencias legales registradas",
          text: "La portada enlaza la Ley 37/1992, el Real Decreto 1624/1992 y la Orden HFP/1415/2023 como referencias del Modelo 379.",
          sourceIds: [
            IVA_LAW_SOURCE.id,
            IVA_REGULATION_SOURCE.id,
            MODEL_379_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_379_PROCEDURE_HOME_SOURCE,
    MODEL_379_PROCEDURE_RECORD_SOURCE,
    MODEL_379_FAQ_INDEX_SOURCE,
    MODEL_379_GENERAL_FAQ_SOURCE,
    MODEL_379_CONTENT_FAQ_SOURCE,
    MODEL_379_PRESENTATION_FAQ_SOURCE,
    MODEL_379_GUIDELINES_SOURCE,
    MODEL_379_TECHNICAL_MANUAL_SOURCE,
    MODEL_379_XSD_SOURCE,
    IVA_LAW_SOURCE,
    IVA_REGULATION_SOURCE,
    MODEL_379_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-379-presentation-guidelines-document",
      kind: "GUIDE",
      title: "Directrices para la presentación del Modelo 379",
      sourceId: MODEL_379_GUIDELINES_SOURCE.id,
      landingPageSourceId: MODEL_379_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DirectricesPresentacionM379.pdf",
      byteLength: 1390605,
      pageCount: 89,
      sha256:
        "0ac6635219be2765dcb2367f5d337993054a16bd557203789d15edb8551ad21c",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-379-web-service-manual-document",
      kind: "GUIDE",
      title: "Manual técnico del servicio web del Modelo 379",
      sourceId: MODEL_379_TECHNICAL_MANUAL_SOURCE.id,
      landingPageSourceId: MODEL_379_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "CESOP-Presentacion-379-SWeb.pdf",
      byteLength: 1412600,
      pageCount: 45,
      sha256:
        "60a24e3cecf0f80b6956c8e1ce298d36037b0734ed6a3438e600f80be823fbd4",
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
      id: "model-379-link-procedure",
      label: "Página oficial del Modelo 379",
      sourceId: MODEL_379_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_379_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 379",
      sourceId: MODEL_379_FAQ_INDEX_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-link-xsd",
      label: "Esquemas XSD y ejemplos",
      sourceId: MODEL_379_XSD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-link-law",
      label: "Ley 37/1992 del IVA",
      sourceId: IVA_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-link-regulation",
      label: "Real Decreto 1624/1992",
      sourceId: IVA_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-link-order",
      label: "Orden HFP/1415/2023",
      sourceId: MODEL_379_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-379-faq-identity",
      question: "¿Qué es el Modelo 379 según la AEAT?",
      answer:
        "La declaración informativa sobre pagos transfronterizos descrita por la Agencia Tributaria.",
      sourceIds: [
        MODEL_379_PROCEDURE_HOME_SOURCE.id,
        MODEL_379_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-purpose",
      question: "¿Qué finalidad administrativa describe la ficha?",
      answer:
        "Relaciona el modelo con registros de determinados pagos transfronterizos y con información sobre sus beneficiarios, en el contexto de la lucha contra el fraude del IVA.",
      sourceIds: [MODEL_379_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-provider",
      question: "¿Qué entiende la FAQ por proveedor de servicios de pago?",
      answer:
        "La FAQ remite a las entidades, organismos y personas incluidos en los apartados 1 y 2 del artículo 5 del Real Decreto-ley 19/2018 y a las exenciones que allí se citan. Esta ficha no clasifica entidades concretas.",
      sourceIds: [MODEL_379_GENERAL_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-payment",
      question: "¿Qué conceptos básicos explica la colección de preguntas?",
      answer:
        "Explica, entre otros, qué entiende la fuente por servicio de pago, operación de pago, ordenante, beneficiario, cuenta de pago, IBAN y BIC.",
      sourceIds: [MODEL_379_GENERAL_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-cross-border",
      question: "¿Cómo describe la FAQ un pago transfronterizo?",
      answer:
        "Lo describe, dentro de esta obligación informativa, cuando el ordenante está en un Estado miembro y el beneficiario en otro Estado miembro o en un territorio tercero. La ficha no aplica esa definición a operaciones concretas.",
      sourceIds: [MODEL_379_CONTENT_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-crypto",
      question: "¿Qué indica la FAQ sobre pagos en criptomonedas?",
      answer:
        "La respuesta oficial publicada indica que no se declaran en el Modelo 379. Esta ficha reproduce el criterio informativo sin evaluar casos particulares.",
      sourceIds: [MODEL_379_CONTENT_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-channels",
      question: "¿Qué dos vías técnicas describe la FAQ oficial?",
      answer:
        "El servicio web y la carga en la Sede de un archivo XML definido para esos servicios.",
      sourceIds: [MODEL_379_PRESENTATION_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-errors",
      question: "¿Qué explica la FAQ sobre registros de detalle incorrectos?",
      answer:
        "Indica que una declaración con errores se rechaza completamente y muestra la descripción de los errores para su subsanación.",
      sourceIds: [MODEL_379_PRESENTATION_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-documents",
      question: "¿Qué documentación técnica publica la AEAT?",
      answer:
        "Directrices de presentación, un manual técnico del servicio web y páginas de esquemas XSD, WSDL y ejemplos XML.",
      sourceIds: [
        MODEL_379_GUIDELINES_SOURCE.id,
        MODEL_379_TECHNICAL_MANUAL_SOURCE.id,
        MODEL_379_XSD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-pdf-safety",
      question: "¿Los PDF registrados son formularios ejecutables?",
      answer:
        "No. Son guías técnicas; las copias auditadas no contienen campos de formulario ni JavaScript.",
      sourceIds: [
        MODEL_379_GUIDELINES_SOURCE.id,
        MODEL_379_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-379-faq-legal",
      question: "¿Qué referencias legales principales enlaza la AEAT?",
      answer:
        "La Ley 37/1992 del IVA, el Real Decreto 1624/1992 y la Orden HFP/1415/2023.",
      sourceIds: [
        IVA_LAW_SOURCE.id,
        IVA_REGULATION_SOURCE.id,
        MODEL_379_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_379_PROCEDURE_HOME_SOURCE.id,
      MODEL_379_PRESENTATION_FAQ_SOURCE.id,
      MODEL_379_TECHNICAL_MANUAL_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"379">;

export const PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_CONTENT_V1 =
  deepFreeze([
    MODEL_368_CONTENT,
    MODEL_369_CONTENT,
    MODEL_379_CONTENT,
  ] as const);
