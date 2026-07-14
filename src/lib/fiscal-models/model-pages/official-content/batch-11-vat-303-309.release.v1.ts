import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_11_VAT_303_309_RELEASE_ID_V1 =
  "public-aeat-official-batch-11-vat-303-309.2026-07-13.v1" as const;

export type PublicAeatBatch11Vat303309CodeV1 = "303" | "308" | "309";

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

const MODEL_303_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-303.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 303 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f2d4e90caf2cb9c0d441a05840cfe0d7c9655c83a50720a94e5d9bd2f063cf8b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_303_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-303.procedure-record.2025-12-02",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 303",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G414.shtml",
  officialUpdatedOn: "2025-12-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3776a7685eee82c6149b9e1d0aa1921061191a408c1fe4502e0672bd9e744fcf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_303_INSTRUCTIONS_2026_SOURCE = {
  id: "aeat.model-303.instructions-2026.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 303 · instrucciones 2026",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e4e5204da9d059119b11094df9c9864120da337bd47dc4cbe06fa05ffc45b603",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_303_PRE303_SOURCE = {
  id: "aeat.model-303.pre303.2026-06-02",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "PRE 303 · servicio de ayuda del Modelo 303",
  canonicalUrl: "https://sede.agenciatributaria.gob.es/Sede/iva/pre-303.html",
  officialUpdatedOn: "2026-06-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e0383f137476cef86a314f207d7386671ff43e4553247a95525115b5a48a08ff",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_303_PRE303_FAQ_SOURCE = {
  id: "aeat.model-303.pre303-faq.2026-04-30",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "PRE 303 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/iva/pre-303/preguntas-frecuentes_.html",
  officialUpdatedOn: "2026-04-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "558613e94ca4263749b9891b433e0d86c0e3650b0ff0ee17b845cf8b8618002f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_308_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-308.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 308 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G403.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5f3666d7094c9928bd1fdeb215d46caa04ff9c48c5751906b9fcca11090da702",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_308_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-308.procedure-record.2025-09-29",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 308",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G403.shtml",
  officialUpdatedOn: "2025-09-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b1c1f3fad0625e086509382986ba46571ab5205efa4935ca28a132fa175be075",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_308_HELP_SOURCE = {
  id: "aeat.model-308.browser-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 308 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-308.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ec3d5155ab808d250b431bf798394d2a8d495b9527456b9d8dc420a958fcc4c2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_308_PREVIOUS_PERIODS_SOURCE = {
  id: "aeat.model-308.previous-periods-downloads.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 308 · modelo vigente en periodos anteriores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/iva/modelo-308-iva-etos-pasivos-devolucion_/modelo-vigente-periodos-anteriores.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "76951527e7e63a7456282ccc789eb8cb7c1a9e65efaf1b810892de1f53ea3324",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_308_FORM_SOURCE = {
  id: "aeat.model-308.form-pdf.previous-periods.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 308 · formulario PDF enlazado para periodos anteriores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G403/Modelo308.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d44a48331f9abd2d1a74048d8e94b340be557f37d1355569ab1fbe7932ba4295",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_308_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-308.instructions-pdf.previous-periods.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 308 · instrucciones PDF enlazadas para periodos anteriores",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G403/instr_mod308.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0c88eaf1635ea24c0a7cf44dd5283da1e69e13febed3e2795bfbe6fc59f44733",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-309.procedure-home.2026-02-13",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 309 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G404.shtml",
  officialUpdatedOn: "2026-02-13",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0baf9eda0f95dbc55626a35fae2ff3f28c07c84ac5079c765c6e4ab4606a2068",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-309.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 309",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G404.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a14ae2d79353053094b7c672d982fbedeee3c149d0bfe60041efaaed383d9ad0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-309.instructions.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 309 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-309-iva-declaracion-liquidacion-periodica_/instrucciones-modelo-309.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f612c64781f74ed9192700cc222493e08e1b05b7e821420248e99e7d21c6fb59",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_HELP_SOURCE = {
  id: "aeat.model-309.browser-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 309 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-309.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "16080b74170132fd31340aa09ad284b6e805a57e17123543ffb5e70363f1d94e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_PREDECLARATION_HELP_SOURCE = {
  id: "aeat.model-309.predeclaration-help.2026-01-15",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 309 · ayuda de la predeclaración",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-309/presentacion-papel-modelo-309.html",
  officialUpdatedOn: "2026-01-15",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b41d68e2660eff484bd4dba78213b83a7a1d7cf48e574c8fe541695cf06b0cea",
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

const MODELS_303_308_ORDER_SOURCE = {
  id: "boe.models-303-308.order-eha-3786-2008.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3786/2008, de 29 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2008-20953",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4368c25ab7db0cf34f4a1fa4d64f35b61679c48825823b2242f15ba6deb9314f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ELECTRONIC_FILING_ORDER_SOURCE = {
  id: "boe.electronic-tax-filing.order-hap-2194-2013.original",
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

const MODEL_309_APPROVAL_ORDER_SOURCE = {
  id: "boe.model-309.order-hac-3625-2003.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/3625/2003, de 23 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2003-23809",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b10ade7d886d6864f95e299c0d7ae1ff3d27d6ff7c10d96ba9f769d643d1849c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_MODIFICATION_ORDER_SOURCE = {
  id: "boe.model-309.order-hfp-1247-2017.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1247/2017, de 20 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2017-15190",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3823f7ebd55e2e6c52b138b681948dc680d8c10c195d2675fabcfba328e5983a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_309_ELECTRONIC_ORDER_SOURCE = {
  id: "boe.model-309.order-eha-3212-2004.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3212/2004, de 30 de septiembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2004-17306",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "281903ff08953a0f74640f0ec318701c3d8b692947297ea5146a61bc9d03df8d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_303_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_303_309_RELEASE_ID_V1,
  code: "303",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "IVA. Autoliquidación.",
  summary:
    "Autoliquidación periódica del IVA: cuotas cobradas, IVA deducible y resultado a ingresar, compensar o devolver.",
  searchTerms: [
    "modelo 303",
    "IVA autoliquidacion",
    "IVA autoliquidación",
    "Impuesto sobre el Valor Añadido",
    "Pre303",
    "servicio de ayuda 303",
    "formulario electrónico",
    "instrucciones 2026",
    "preguntas frecuentes Pre303",
    "IVA repercutido",
    "IVA soportado deducible",
    "declaración trimestral IVA",
    "resultado a compensar",
    "sin actividad",
    "autoliquidación rectificativa 303",
    "operaciones intracomunitarias",
    "inversión del sujeto pasivo",
    "Ley 37 1992",
    "Orden EHA 3786 2008",
  ],
  sections: [
    {
      id: "model-303-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-303-purpose-identity",
          heading: "Autoliquidación del IVA",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 303 como «IVA. Autoliquidación». La ficha administrativa describe como objeto facilitar la autoliquidación del Impuesto sobre el Valor Añadido.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_303_PROCEDURE_HOME_SOURCE.id,
            MODEL_303_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-303-purpose-boundary",
          heading: "Información sin evaluación individual",
          text: "Esta ficha reproduce la identidad y los recursos públicos del modelo, pero no evalúa quién debe utilizarlo ni interpreta el resultado de una autoliquidación.",
          sourceIds: [
            MODEL_303_PROCEDURE_RECORD_SOURCE.id,
            MODEL_303_INSTRUCTIONS_2026_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-303-access",
      title: "Canal y ayuda oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-303-access-browser",
          heading: "Formulario electrónico",
          text: "La página del procedimiento y las instrucciones describen un canal electrónico mediante formulario. Esta ficha no enlaza el trámite operativo ni inicia ninguna presentación.",
          sourceIds: [
            MODEL_303_PROCEDURE_HOME_SOURCE.id,
            MODEL_303_PROCEDURE_RECORD_SOURCE.id,
            MODEL_303_INSTRUCTIONS_2026_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-303-access-pre303",
          heading: "Servicio de ayuda Pre303",
          text: "La AEAT mantiene el servicio Pre303 como ayuda para la cumplimentación del Modelo 303 y reúne en su página información, servicios y preguntas frecuentes.",
          sourceIds: [
            MODEL_303_PRE303_SOURCE.id,
            MODEL_303_PRE303_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-303-details",
      title: "Documentación y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-303-details-instructions",
          heading: "Instrucciones oficiales 2026",
          text: "La sede publica una página de instrucciones para 2026. Se registra como referencia documental oficial, sin convertir su contenido en reglas de cálculo o aplicabilidad dentro de esta web.",
          sourceIds: [MODEL_303_INSTRUCTIONS_2026_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-303-details-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "El portal Pre303 agrupa preguntas frecuentes generales y específicas del servicio, además de recursos relacionados con la importación de libros y las autoliquidaciones rectificativas.",
          sourceIds: [
            MODEL_303_PRE303_SOURCE.id,
            MODEL_303_PRE303_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-303-details-law",
          heading: "Referencias normativas enlazadas",
          text: "La página oficial enlaza la Ley 37/1992 del IVA, su Reglamento, la Orden EHA/3786/2008 que aprobó los modelos 303 y 308 y la Orden HAP/2194/2013 sobre presentación de declaraciones tributarias.",
          sourceIds: [
            IVA_LAW_SOURCE.id,
            IVA_REGULATION_SOURCE.id,
            MODELS_303_308_ORDER_SOURCE.id,
            ELECTRONIC_FILING_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_303_PROCEDURE_HOME_SOURCE,
    MODEL_303_PROCEDURE_RECORD_SOURCE,
    MODEL_303_INSTRUCTIONS_2026_SOURCE,
    MODEL_303_PRE303_SOURCE,
    MODEL_303_PRE303_FAQ_SOURCE,
    IVA_LAW_SOURCE,
    IVA_REGULATION_SOURCE,
    MODELS_303_308_ORDER_SOURCE,
    ELECTRONIC_FILING_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-303-link-procedure",
      label: "Página oficial del Modelo 303",
      sourceId: MODEL_303_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_303_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-instructions",
      label: "Instrucciones oficiales 2026",
      sourceId: MODEL_303_INSTRUCTIONS_2026_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-pre303",
      label: "Información del servicio Pre303",
      sourceId: MODEL_303_PRE303_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-faq",
      label: "Preguntas frecuentes oficiales de Pre303",
      sourceId: MODEL_303_PRE303_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-law",
      label: "Ley 37/1992 del IVA",
      sourceId: IVA_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-regulation",
      label: "Reglamento del IVA",
      sourceId: IVA_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-link-approval-order",
      label: "Orden EHA/3786/2008",
      sourceId: MODELS_303_308_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-303-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 303?",
      answer: "La autoliquidación del Impuesto sobre el Valor Añadido.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_303_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la presentación de la autoliquidación del Impuesto sobre el Valor Añadido.",
      sourceIds: [MODEL_303_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-channel",
      question: "¿Qué canal general describe la AEAT?",
      answer:
        "Un canal electrónico mediante formulario, acompañado de recursos oficiales de ayuda.",
      sourceIds: [
        MODEL_303_PROCEDURE_HOME_SOURCE.id,
        MODEL_303_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-pre303",
      question: "¿Qué es Pre303 dentro de la sede de la AEAT?",
      answer:
        "Es el servicio de ayuda que la AEAT presenta para la cumplimentación del Modelo 303.",
      sourceIds: [MODEL_303_PRE303_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-instructions",
      question: "¿Hay instrucciones oficiales para 2026?",
      answer:
        "Sí. La sede mantiene una página específica de instrucciones 2026 para el Modelo 303.",
      sourceIds: [MODEL_303_INSTRUCTIONS_2026_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-official-faq",
      question: "¿La AEAT publica preguntas frecuentes sobre Pre303?",
      answer:
        "Sí. El portal Pre303 incluye un índice específico de preguntas frecuentes oficiales.",
      sourceIds: [MODEL_303_PRE303_SOURCE.id, MODEL_303_PRE303_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-law",
      question: "¿Qué norma aprobó el Modelo 303?",
      answer:
        "La página oficial enlaza la Orden EHA/3786/2008, de 29 de diciembre.",
      sourceIds: [MODELS_303_308_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-303-faq-scope",
      question: "¿Esta ficha decide si un caso debe usar el Modelo 303?",
      answer:
        "No. Conserva información general y fuentes oficiales, sin evaluar la aplicabilidad a un caso concreto.",
      sourceIds: [
        MODEL_303_PROCEDURE_RECORD_SOURCE.id,
        MODEL_303_INSTRUCTIONS_2026_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_303_PROCEDURE_HOME_SOURCE.id,
      MODEL_303_PROCEDURE_RECORD_SOURCE.id,
      MODEL_303_INSTRUCTIONS_2026_SOURCE.id,
      MODEL_303_PRE303_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"303">;

const MODEL_308_DOCUMENTS = [
  {
    id: "model-308-form-previous-periods",
    kind: "FORM",
    title: "Formulario PDF del Modelo 308 enlazado para periodos anteriores",
    sourceId: MODEL_308_FORM_SOURCE.id,
    landingPageSourceId: MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "Modelo308.pdf",
    byteLength: 119106,
    pageCount: 3,
    sha256: "d44a48331f9abd2d1a74048d8e94b340be557f37d1355569ab1fbe7932ba4295",
    activeContentStatus: "JAVASCRIPT_PRESENT",
    formStatus: "ACROFORM_PRESENT",
    freshnessStatus: "LEGACY_REFERENCES_DETECTED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "model-308-instructions-previous-periods",
    kind: "INSTRUCTIONS",
    title:
      "Instrucciones PDF del Modelo 308 enlazadas para periodos anteriores",
    sourceId: MODEL_308_INSTRUCTIONS_SOURCE.id,
    landingPageSourceId: MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "instr_mod308.pdf",
    byteLength: 161930,
    pageCount: 5,
    sha256: "0c88eaf1635ea24c0a7cf44dd5283da1e69e13febed3e2795bfbe6fc59f44733",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "LEGACY_REFERENCES_DETECTED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_308_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_303_309_RELEASE_ID_V1,
  code: "308",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IVA. Régimen Especial del Recargo Equivalencia, artículo 30 bis del Reglamento del IVA y sujetos pasivos ocasionales. Solicitud de devolución.",
  summary:
    "Solicitud de devolución de IVA identificada por la AEAT para los contextos que figuran en su denominación oficial, con formulario web y documentación histórica separada.",
  searchTerms: [
    "modelo 308",
    "recargo equivalencia solicitud devolucion",
    "recargo de equivalencia solicitud de devolución",
    "IVA solicitud devolución",
    "artículo 30 bis Reglamento IVA",
    "sujetos pasivos ocasionales",
    "formulario web",
    "fichero 308",
    "instrucciones modelo 308",
    "Orden EHA 3786 2008",
  ],
  sections: [
    {
      id: "model-308-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-308-purpose-identity",
          heading: "Solicitud de devolución de IVA",
          text: "El índice y las páginas del procedimiento identifican el Modelo 308 como una solicitud de devolución vinculada al régimen especial del recargo de equivalencia, al artículo 30 bis del Reglamento del IVA y a sujetos pasivos ocasionales.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_308_PROCEDURE_HOME_SOURCE.id,
            MODEL_308_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-308-purpose-boundary",
          heading: "Denominación sin decisión de aplicabilidad",
          text: "La denominación se conserva literalmente como referencia oficial; esta ficha no determina si una persona o una operación encaja en alguno de esos contextos.",
          sourceIds: [
            MODEL_308_PROCEDURE_HOME_SOURCE.id,
            MODEL_308_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-308-access",
      title: "Canales y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-308-access-browser",
          heading: "Formulario en la web de la AEAT",
          text: "La ayuda técnica describe un formulario web para el Modelo 308. Esta ficha enlaza solo páginas informativas y no enlaza el trámite operativo.",
          sourceIds: [
            MODEL_308_PROCEDURE_HOME_SOURCE.id,
            MODEL_308_PROCEDURE_RECORD_SOURCE.id,
            MODEL_308_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-308-access-file",
          heading: "Importación y exportación de fichero",
          text: "La ayuda oficial indica que el formulario puede importar una declaración generada externamente y exportar un fichero con extensión .308 ajustado al diseño publicado.",
          sourceIds: [MODEL_308_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-308-details",
      title: "Documentos y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-308-details-previous-periods",
          heading: "PDF enlazados para periodos anteriores",
          text: "La sede separa una página titulada «Modelo vigente en periodos anteriores», desde la que enlaza un formulario PDF de tres páginas y unas instrucciones PDF de cinco páginas. Ambos se registran como referencias heredadas, no como afirmación de vigencia actual.",
          sourceIds: [
            MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
            MODEL_308_FORM_SOURCE.id,
            MODEL_308_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-308-details-active-pdf",
          heading: "Formulario PDF con contenido activo",
          text: "El formulario PDF enlazado contiene JavaScript y campos AcroForm. Se ofrece únicamente como descarga externa oficial y no se ejecuta ni se cumplimenta dentro de esta aplicación.",
          sourceIds: [
            MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
            MODEL_308_FORM_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-308-details-law",
          heading: "Órdenes enlazadas",
          text: "La ficha administrativa enlaza la Orden EHA/3786/2008, que aprobó los modelos 303 y 308, y la Orden HAP/2194/2013 sobre presentación de declaraciones tributarias.",
          sourceIds: [
            MODELS_303_308_ORDER_SOURCE.id,
            ELECTRONIC_FILING_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_308_PROCEDURE_HOME_SOURCE,
    MODEL_308_PROCEDURE_RECORD_SOURCE,
    MODEL_308_HELP_SOURCE,
    MODEL_308_PREVIOUS_PERIODS_SOURCE,
    MODEL_308_FORM_SOURCE,
    MODEL_308_INSTRUCTIONS_SOURCE,
    MODELS_303_308_ORDER_SOURCE,
    ELECTRONIC_FILING_ORDER_SOURCE,
  ],
  documents: MODEL_308_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-308-link-procedure",
      label: "Página oficial del Modelo 308",
      sourceId: MODEL_308_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_308_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-link-help",
      label: "Ayuda técnica oficial del Modelo 308",
      sourceId: MODEL_308_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-link-previous-periods",
      label: "Documentos oficiales para periodos anteriores",
      sourceId: MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-link-order",
      label: "Orden EHA/3786/2008",
      sourceId: MODELS_303_308_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-link-electronic-order",
      label: "Orden HAP/2194/2013",
      sourceId: ELECTRONIC_FILING_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-308-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 308?",
      answer:
        "Una solicitud de devolución de IVA cuya denominación menciona el régimen especial del recargo de equivalencia, el artículo 30 bis del Reglamento del IVA y los sujetos pasivos ocasionales.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_308_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la solicitud de devolución correspondiente a los contextos expresados en la denominación oficial del modelo.",
      sourceIds: [MODEL_308_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-browser",
      question: "¿La AEAT describe un formulario web?",
      answer:
        "Sí. La ayuda técnica documenta el formulario del Modelo 308 disponible en la web de la AEAT.",
      sourceIds: [MODEL_308_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-file",
      question: "¿La ayuda menciona ficheros del Modelo 308?",
      answer:
        "Sí. Describe la importación desde un programa externo y la exportación de un fichero con extensión .308.",
      sourceIds: [MODEL_308_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-documents",
      question: "¿Qué PDF oficiales están registrados?",
      answer:
        "Un formulario de tres páginas y unas instrucciones de cinco páginas, ambos enlazados por la AEAT en la sección para periodos anteriores.",
      sourceIds: [
        MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
        MODEL_308_FORM_SOURCE.id,
        MODEL_308_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-currentness",
      question:
        "¿Los PDF para periodos anteriores se presentan como vigentes hoy?",
      answer:
        "No. La propia página los separa bajo el rótulo «Modelo vigente en periodos anteriores» y esta ficha no extiende su vigencia.",
      sourceIds: [MODEL_308_PREVIOUS_PERIODS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-active-pdf",
      question: "¿El formulario PDF contiene funciones activas?",
      answer:
        "Sí. El archivo contiene JavaScript y campos AcroForm; por ello solo se referencia como descarga oficial externa.",
      sourceIds: [
        MODEL_308_PREVIOUS_PERIODS_SOURCE.id,
        MODEL_308_FORM_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-308-faq-law",
      question: "¿Qué orden aprobó el Modelo 308?",
      answer:
        "La Orden EHA/3786/2008, de 29 de diciembre, enlazada por la ficha administrativa.",
      sourceIds: [MODELS_303_308_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_308_PROCEDURE_HOME_SOURCE.id,
      MODEL_308_PROCEDURE_RECORD_SOURCE.id,
      MODEL_308_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"308">;

const MODEL_309_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_VAT_303_309_RELEASE_ID_V1,
  code: "309",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "IVA. Declaración - Liquidación no periódica.",
  summary:
    "Declaración-liquidación no periódica del Impuesto sobre el Valor Añadido, con formulario electrónico, importación de fichero y ayuda oficial sobre predeclaración.",
  searchTerms: [
    "modelo 309",
    "liquidacion no periodica",
    "liquidación no periódica",
    "IVA declaración liquidación",
    "autoliquidación no periódica",
    "formulario electrónico",
    "predeclaración",
    "fichero 309",
    "instrucciones modelo 309",
    "Orden HAC 3625 2003",
  ],
  sections: [
    {
      id: "model-309-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-309-purpose-identity",
          heading: "Liquidación no periódica del IVA",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 309 como «IVA. Declaración - Liquidación no periódica». La ficha administrativa describe como objeto facilitar esa declaración-liquidación.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_309_PROCEDURE_HOME_SOURCE.id,
            MODEL_309_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-309-purpose-boundary",
          heading: "Información sin decisión individual",
          text: "La ficha conserva el carácter no periódico de la denominación oficial, pero no decide si una operación o una persona debe utilizar este modelo.",
          sourceIds: [
            MODEL_309_PROCEDURE_RECORD_SOURCE.id,
            MODEL_309_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-309-access",
      title: "Canales y ayuda oficial",
      kind: "ACCESS",
      items: [
        {
          id: "model-309-access-browser",
          heading: "Formulario electrónico",
          text: "La ficha administrativa y la ayuda técnica describen un formulario electrónico. Esta página enlaza documentación informativa, no el trámite operativo.",
          sourceIds: [
            MODEL_309_PROCEDURE_HOME_SOURCE.id,
            MODEL_309_PROCEDURE_RECORD_SOURCE.id,
            MODEL_309_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-309-access-file",
          heading: "Importación y exportación de fichero",
          text: "La ayuda oficial describe la importación de un fichero generado externamente y la exportación de un fichero con extensión .309 ajustado al formato publicado.",
          sourceIds: [MODEL_309_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-309-access-predeclaration",
          heading: "Predeclaración generada desde la web",
          text: "La AEAT mantiene una ayuda separada para un formulario en línea que genera una predeclaración en PDF. Esta ficha describe su existencia sin generar ni remitir documentos.",
          sourceIds: [MODEL_309_PREDECLARATION_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-309-details",
      title: "Instrucciones y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-309-details-instructions",
          heading: "Instrucciones oficiales en HTML",
          text: "La página del modelo enlaza instrucciones oficiales en formato web. Se conservan como referencia documental sin trasladar sus reglas a cálculos o decisiones de esta aplicación.",
          sourceIds: [
            MODEL_309_PROCEDURE_HOME_SOURCE.id,
            MODEL_309_INSTRUCTIONS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-309-details-help",
          heading: "Ayuda técnica diferenciada",
          text: "La ayuda del Modelo 309 diferencia el formulario electrónico y la predeclaración, y documenta funciones de borrador, validación, guardado e intercambio de ficheros.",
          sourceIds: [
            MODEL_309_HELP_SOURCE.id,
            MODEL_309_PREDECLARATION_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-309-details-law",
          heading: "Normativa enlazada",
          text: "La ficha administrativa enlaza la Orden HAC/3625/2003 que aprobó el modelo, la Orden HFP/1247/2017 que la modificó y la Orden EHA/3212/2004 sobre presentación telemática de varios modelos.",
          sourceIds: [
            MODEL_309_APPROVAL_ORDER_SOURCE.id,
            MODEL_309_MODIFICATION_ORDER_SOURCE.id,
            MODEL_309_ELECTRONIC_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_309_PROCEDURE_HOME_SOURCE,
    MODEL_309_PROCEDURE_RECORD_SOURCE,
    MODEL_309_INSTRUCTIONS_SOURCE,
    MODEL_309_HELP_SOURCE,
    MODEL_309_PREDECLARATION_HELP_SOURCE,
    MODEL_309_APPROVAL_ORDER_SOURCE,
    MODEL_309_MODIFICATION_ORDER_SOURCE,
    MODEL_309_ELECTRONIC_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-309-link-procedure",
      label: "Página oficial del Modelo 309",
      sourceId: MODEL_309_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_309_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-instructions",
      label: "Instrucciones oficiales del Modelo 309",
      sourceId: MODEL_309_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-help",
      label: "Ayuda técnica oficial del Modelo 309",
      sourceId: MODEL_309_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-predeclaration-help",
      label: "Información oficial sobre la predeclaración",
      sourceId: MODEL_309_PREDECLARATION_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-approval-order",
      label: "Orden HAC/3625/2003",
      sourceId: MODEL_309_APPROVAL_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-modification-order",
      label: "Orden HFP/1247/2017",
      sourceId: MODEL_309_MODIFICATION_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-link-electronic-order",
      label: "Orden EHA/3212/2004",
      sourceId: MODEL_309_ELECTRONIC_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-309-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 309?",
      answer:
        "La declaración-liquidación no periódica del Impuesto sobre el Valor Añadido.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_309_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la declaración-liquidación no periódica del Impuesto sobre el Valor Añadido.",
      sourceIds: [MODEL_309_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-channel",
      question: "¿La AEAT describe un formulario electrónico?",
      answer:
        "Sí. La ficha administrativa y la ayuda técnica documentan un formulario electrónico para el Modelo 309.",
      sourceIds: [
        MODEL_309_PROCEDURE_RECORD_SOURCE.id,
        MODEL_309_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-file",
      question: "¿Puede el formulario trabajar con un fichero .309?",
      answer:
        "La ayuda oficial describe la importación y la exportación de ficheros con extensión .309.",
      sourceIds: [MODEL_309_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-predeclaration",
      question: "¿Existe información oficial sobre una predeclaración?",
      answer:
        "Sí. La AEAT mantiene una ayuda separada para el formulario en línea que genera la predeclaración en PDF.",
      sourceIds: [MODEL_309_PREDECLARATION_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-instructions",
      question: "¿Dónde se encuentran las instrucciones oficiales?",
      answer:
        "La página del Modelo 309 enlaza una guía en HTML titulada «Instrucciones Modelo 309».",
      sourceIds: [
        MODEL_309_PROCEDURE_HOME_SOURCE.id,
        MODEL_309_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-approval-order",
      question: "¿Qué orden aprobó el Modelo 309?",
      answer:
        "La Orden HAC/3625/2003, de 23 de diciembre, enlazada por la ficha administrativa.",
      sourceIds: [MODEL_309_APPROVAL_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-309-faq-modification",
      question: "¿La ficha enlaza una modificación posterior de esa orden?",
      answer: "Sí. Enlaza la Orden HFP/1247/2017, de 20 de diciembre.",
      sourceIds: [MODEL_309_MODIFICATION_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_309_PROCEDURE_HOME_SOURCE.id,
      MODEL_309_PROCEDURE_RECORD_SOURCE.id,
      MODEL_309_HELP_SOURCE.id,
      MODEL_309_PREDECLARATION_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"309">;

export const PUBLIC_AEAT_BATCH_11_VAT_303_309_CONTENT_V1 = deepFreeze([
  MODEL_303_CONTENT,
  MODEL_308_CONTENT,
  MODEL_309_CONTENT,
] as const);
