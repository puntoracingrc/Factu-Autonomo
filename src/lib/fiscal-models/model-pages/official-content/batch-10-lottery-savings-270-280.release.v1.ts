import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentExternalNavigationV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_10_LOTTERY_SAVINGS_270_280_RELEASE_ID_V1 =
  "public-aeat-official-batch-10-lottery-savings-270-280.2026-07-13.v1" as const;

export type PublicAeatBatch10LotterySavings270280CodeV1 = "270" | "280";

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

const MODEL_270_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-270.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 270 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI36.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d89c18fce26b730f38212ae8f22612b6e9679d6b00a70c566272ccc4db35b853",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_270_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-270.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 270",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI36.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a3c3d0c85baf6e8e715d3e663ec2becaadf2583a92b22da742c2bd192d8d9181",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_270_HELP_SOURCE = {
  id: "aeat.model-270.file-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 270 · ayuda técnica de la carga por fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-270.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7a452606843804f2acdc326e5ba140320001791b02571b5f5c44ca0c2be577fc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_270_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-270.register-design-pdf.2024-01-23",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 270 · diseño de registro · ejercicio 2023",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos/270_HAP_2368_2013.pdf",
  officialUpdatedOn: "2024-01-23",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d845cc47e3b60d01128d27dddcc3cffd2cf64bd6dfb24e0cd0d0467d66f95a92",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const LAW_16_2012_SOURCE = {
  id: "boe.model-270.law-16-2012.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 16/2012, de 27 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2012-15650",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "58743b333645e2b143c5a27e1b1f299ffcb71e1520c98fc7ef83ed71525ea51c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2368_2013_SOURCE = {
  id: "boe.model-270.order-hap-2368-2013.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2368/2013, de 13 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-13228",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b3cf703e651b72f4fa2499278ac4181fbd111a310620dd47306a4ed18c34bb06",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2194_2013_SOURCE = {
  id: "boe.electronic-filing.order-hap-2194-2013.original",
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

const ORDER_HFP_1286_2023_SOURCE = {
  id: "boe.model-270.order-hfp-1286-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1286/2023, de 28 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-24414",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c9a022ea8f2f0066ad150eb0c232bc3417949327de87936baf9b36991fd2629a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1431_2025_SOURCE = {
  id: "boe.model-270.order-hac-1431-2025.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1431/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25390",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bcfd4f2128d6d867eba0616eaca1da6094ceb1c2667e3462b5515862694fa729",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_280_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-280.procedure-home.2026-04-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 280 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI39.shtml",
  officialUpdatedOn: "2026-04-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "37f31ec141f05bcf7f98aec0e6bf878d8cef46d756407323d23dd92218e6c3fd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_280_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-280.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 280",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI39.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c8a09c85c8014d525244d75b5b3b4dec5dc59320974f4d10842ed42603152b59",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_280_HELP_SOURCE = {
  id: "aeat.model-280.file-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 280 · ayuda técnica de TGVI y fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-282/modelo-280.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0e95e48485cb15d1c032744041bf1b6f2c1064560023edbdf88dbbc7db841dc1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_280_FAQ_SOURCE = {
  id: "aeat.model-280.faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 280 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-280-decla_____formativa-anual-planes-plazo_/preguntas-frecuentes.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2d54c711ffdba86b9ca39d00e98a27c259382c984a663ac582852812840c9f44",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_280_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-280.register-design-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 280 · diseño de registro · ejercicio 2022",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_22/DR_280_2022.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "45cab8f0880dfc4094d6cc8905ae37efba0c10a568d49e8648e1c9a20b2a5701",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const LAW_35_2006_SOURCE = {
  id: "boe.model-280.law-35-2006.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 35/2006, de 28 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2006-20764",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3dbf3f61c4b0fa86a303bbe43c9118412908f3fad346b6662fd8b0c1bbda08bb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ROYAL_DECREE_439_2007_SOURCE = {
  id: "boe.model-280.royal-decree-439-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 439/2007, de 30 de marzo",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-6820",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2110b6960b0202db436e91c6cfefbe3b1d5fa08fdf0f7e69f4a3ce45d1a05970",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAP_2118_2015_SOURCE = {
  id: "boe.model-280.order-hap-2118-2015.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2118/2015, de 9 de octubre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2015-11074",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e2a1054990b52746f006a7029e487b844b9d2c9976648e2ec12e4a8e69f0b772",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_1822_2016_SOURCE = {
  id: "boe.model-280.order-hfp-1822-2016.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1822/2016, de 24 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2016-11251",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7f9b313329a2cff66ff3f74a11b47fdcc293c8af8f856d6598145108671cddea",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1276_2019_SOURCE = {
  id: "boe.model-280.order-hac-1276-2019.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1276/2019, de 19 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-18752",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6d738251e6b13a3b282bab069d9994406f5e0a19b18bb1a0908544ea8560373e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_1192_2022_SOURCE = {
  id: "boe.model-280.order-hfp-1192-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1192/2022, de 1 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-20274",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2ab1dca1f1d7292bce8e0bbcdc78e3e772bce2f3c3b9c4a14458d30113020d58",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_270_DOCUMENTS = [
  {
    id: "model-270-register-design-document",
    kind: "REGISTER_DESIGN",
    title: "Diseño de registro del Modelo 270 · ejercicio 2023",
    sourceId: MODEL_270_REGISTER_DESIGN_SOURCE.id,
    landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "270_HAP_2368_2013.pdf",
    byteLength: 111633,
    pageCount: 18,
    sha256: "d845cc47e3b60d01128d27dddcc3cffd2cf64bd6dfb24e0cd0d0467d66f95a92",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "LEGACY_REFERENCES_DETECTED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_280_DOCUMENTS = [
  {
    id: "model-280-register-design-document",
    kind: "REGISTER_DESIGN",
    title: "Diseño de registro del Modelo 280 · ejercicio 2022",
    sourceId: MODEL_280_REGISTER_DESIGN_SOURCE.id,
    landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
    mediaType: "application/pdf",
    fileName: "DR_280_2022.pdf",
    byteLength: 235352,
    pageCount: 22,
    sha256: "45cab8f0880dfc4094d6cc8905ae37efba0c10a568d49e8648e1c9a20b2a5701",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_270_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_LOTTERY_SAVINGS_270_280_RELEASE_ID_V1,
  code: "270",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Resumen anual de retenciones e ingresos a cuenta del gravamen especial sobre los premios de determinadas loterías y apuestas.",
  summary:
    "Declaración informativa que la AEAT identifica como resumen anual de retenciones e ingresos a cuenta del gravamen especial sobre determinados premios de loterías y apuestas, con canal electrónico mediante fichero y diseño de registro oficial.",
  searchTerms: [
    "modelo 270",
    "resumen anual",
    "retenciones e ingresos a cuenta",
    "gravamen especial",
    "premios de loterías",
    "premios de apuestas",
    "loterías y apuestas del Estado",
    "carga de fichero",
    "diseño de registro 270",
    "Orden HAP 2368 2013",
    "Orden HFP 1286 2023",
    "Orden HAC 1431 2025",
  ],
  sections: [
    {
      id: "model-270-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-270-purpose-identity",
          heading: "Resumen anual sobre determinados premios",
          text: "El índice de modelos, la portada del procedimiento y la Orden HAP/2368/2013 identifican el Modelo 270 como el resumen anual de retenciones e ingresos a cuenta del gravamen especial sobre determinados premios de loterías y apuestas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_270_PROCEDURE_HOME_SOURCE.id,
            ORDER_HAP_2368_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-270-purpose-record",
          heading: "Objeto descrito en la ficha administrativa",
          text: "La ficha administrativa describe un resumen anual referido a premios de los organizadores que enumera, entre ellos la Sociedad Estatal Loterías y Apuestas del Estado y otros organismos nacionales o de la Unión Europea o del Espacio Económico Europeo. Esta descripción no evalúa ningún caso concreto.",
          sourceIds: [
            MODEL_270_PROCEDURE_RECORD_SOURCE.id,
            LAW_16_2012_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-270-access",
      title: "Canal electrónico descrito",
      kind: "ACCESS",
      items: [
        {
          id: "model-270-access-file",
          heading: "Carga mediante fichero",
          text: "La portada y la ayuda técnica describen un canal telemático basado en un fichero ajustado al diseño de registro publicado. Esta ficha informa del método sin enlazar ningún endpoint operativo.",
          sourceIds: [
            MODEL_270_PROCEDURE_HOME_SOURCE.id,
            MODEL_270_PROCEDURE_RECORD_SOURCE.id,
            MODEL_270_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-270-access-validation",
          heading: "La validación no equivale a presentación",
          text: "La ayuda técnica distingue la validación del fichero de su presentación. Aquí se conserva esa distinción informativa sin ejecutar ninguna gestión.",
          sourceIds: [MODEL_270_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-270-details",
      title: "Documentación y trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-270-details-register-design",
          heading: "Diseño técnico, no formulario",
          text: "El catálogo técnico de la AEAT enlaza un PDF de dieciocho páginas rotulado para el ejercicio 2023. El archivo contiene diseños de registro y no es un impreso en blanco ni una guía general de cumplimentación.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_270_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-270-details-legacy",
          heading: "Modificación posterior del diseño",
          text: "La Orden HAC/1431/2025 introduce una actualización posterior de denominaciones provinciales dentro del diseño. El PDF rotulado para 2023 se conserva con referencias heredadas y no se presenta como diseño plenamente actualizado.",
          sourceIds: [
            MODEL_270_REGISTER_DESIGN_SOURCE.id,
            ORDER_HAC_1431_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-270-details-normative",
          heading: "Aprobación y modificaciones enlazadas",
          text: "La Ley 16/2012 forma parte del marco legal enlazado; la Orden HAP/2368/2013 aprobó el modelo, la Orden HFP/1286/2023 modificó su diseño y la Orden HAC/1431/2025 introdujo la actualización posterior registrada.",
          sourceIds: [
            LAW_16_2012_SOURCE.id,
            ORDER_HAP_2368_2013_SOURCE.id,
            ORDER_HFP_1286_2023_SOURCE.id,
            ORDER_HAC_1431_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_270_PROCEDURE_HOME_SOURCE,
    MODEL_270_PROCEDURE_RECORD_SOURCE,
    MODEL_270_HELP_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_270_REGISTER_DESIGN_SOURCE,
    LAW_16_2012_SOURCE,
    ORDER_HAP_2368_2013_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
    ORDER_HFP_1286_2023_SOURCE,
    ORDER_HAC_1431_2025_SOURCE,
    PERSONAL_AREA_SOURCE,
  ],
  documents: MODEL_270_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-270-link-procedure",
      label: "Página oficial del Modelo 270",
      sourceId: MODEL_270_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_270_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-help",
      label: "Ayuda técnica oficial del Modelo 270",
      sourceId: MODEL_270_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-register-design",
      label: "Diseño de registro oficial del Modelo 270",
      sourceId: MODEL_270_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-law",
      label: "Ley 16/2012",
      sourceId: LAW_16_2012_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-approval-order",
      label: "Orden HAP/2368/2013",
      sourceId: ORDER_HAP_2368_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-electronic-order",
      label: "Orden HAP/2194/2013",
      sourceId: ORDER_HAP_2194_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-2023-order",
      label: "Orden HFP/1286/2023",
      sourceId: ORDER_HFP_1286_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-link-2025-order",
      label: "Orden HAC/1431/2025",
      sourceId: ORDER_HAC_1431_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-270-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 270?",
      answer:
        "Lo identifica como el resumen anual de retenciones e ingresos a cuenta del gravamen especial sobre determinados premios de loterías y apuestas.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_270_PROCEDURE_HOME_SOURCE.id,
        ORDER_HAP_2368_2013_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-object",
      question: "¿Cómo describe su objeto la ficha administrativa?",
      answer:
        "Lo describe como un resumen anual referido a premios de los organizadores nacionales y europeos que la propia ficha enumera.",
      sourceIds: [MODEL_270_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-channel",
      question: "¿Qué canal electrónico describen las fuentes oficiales?",
      answer:
        "Describen una tramitación telemática basada en la carga de un fichero.",
      sourceIds: [
        MODEL_270_PROCEDURE_HOME_SOURCE.id,
        MODEL_270_PROCEDURE_RECORD_SOURCE.id,
        MODEL_270_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-file",
      question: "¿El fichero sigue una estructura publicada?",
      answer:
        "Sí. La ayuda remite al diseño de registro publicado por la AEAT para el modelo.",
      sourceIds: [MODEL_270_HELP_SOURCE.id, REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-validation",
      question: "¿Validar el fichero equivale a presentarlo?",
      answer:
        "No. La ayuda técnica distingue expresamente la validación de la presentación.",
      sourceIds: [MODEL_270_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-document",
      question: "¿Qué contiene el PDF oficial enlazado?",
      answer:
        "Contiene dieciocho páginas de diseños técnicos de registro para el Modelo 270.",
      sourceIds: [MODEL_270_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-pdf-form",
      question: "¿Ese PDF es un formulario en blanco?",
      answer:
        "No. Es documentación técnica de registros; las fuentes consultadas describen un canal electrónico mediante fichero.",
      sourceIds: [
        MODEL_270_REGISTER_DESIGN_SOURCE.id,
        MODEL_270_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-freshness",
      question: "¿Por qué el diseño se conserva con referencias heredadas?",
      answer:
        "Porque el PDF está rotulado para 2023 y una orden de 2025 actualiza posteriormente varias denominaciones provinciales del diseño.",
      sourceIds: [
        MODEL_270_REGISTER_DESIGN_SOURCE.id,
        ORDER_HAC_1431_2025_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-270-faq-applicability",
      question: "¿Esta ficha decide si el Modelo 270 corresponde a un caso?",
      answer:
        "No. Registra identidad, objeto, canal, documentación y normativa oficiales sin evaluar situaciones concretas.",
      sourceIds: [
        MODEL_270_PROCEDURE_RECORD_SOURCE.id,
        ORDER_HAP_2368_2013_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_270_PROCEDURE_HOME_SOURCE.id,
      MODEL_270_PROCEDURE_RECORD_SOURCE.id,
      MODEL_270_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"270">;

const MODEL_280_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_10_LOTTERY_SAVINGS_270_280_RELEASE_ID_V1,
  code: "280",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa anual de Planes de Ahorro a Largo Plazo",
  summary:
    "Declaración informativa anual que la AEAT vincula a los Planes de Ahorro a Largo Plazo, acompañada de preguntas frecuentes oficiales, canal TGVI mediante fichero y diseño de registro técnico.",
  searchTerms: [
    "modelo 280",
    "declaración informativa anual",
    "Planes de Ahorro a Largo Plazo",
    "PALP",
    "SIALP",
    "CIALP",
    "Seguro Individual de Ahorro a Largo Plazo",
    "Cuenta Individual de Ahorro a Largo Plazo",
    "TGVI",
    "carga de fichero",
    "diseño de registro 280",
    "preguntas frecuentes modelo 280",
    "Orden HAP 2118 2015",
    "Orden HFP 1192 2022",
  ],
  sections: [
    {
      id: "model-280-purpose",
      title: "Identidad y contenido oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-280-purpose-identity",
          heading: "Planes de Ahorro a Largo Plazo",
          text: "El índice general, la portada del procedimiento y la Orden HAP/2118/2015 identifican el Modelo 280 como la declaración informativa anual de Planes de Ahorro a Largo Plazo.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_280_PROCEDURE_HOME_SOURCE.id,
            ORDER_HAP_2118_2015_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-280-purpose-faq",
          heading: "Categorías descritas por la FAQ oficial",
          text: "La página de preguntas frecuentes enumera, entre otras categorías, la identificación del titular y del plan, fechas vinculadas al plan, aportaciones y rendimientos. Esta ficha reproduce categorías generales sin calcular datos ni decidir su aplicación.",
          sourceIds: [MODEL_280_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-280-access",
      title: "Canal electrónico descrito",
      kind: "ACCESS",
      items: [
        {
          id: "model-280-access-file",
          heading: "TGVI mediante fichero",
          text: "La ayuda técnica describe TGVI en línea como entorno de validación de un fichero ajustado al diseño de registro. Esta ficha registra el canal de fichero sin enlazar ningún endpoint operativo.",
          sourceIds: [
            MODEL_280_PROCEDURE_HOME_SOURCE.id,
            MODEL_280_PROCEDURE_RECORD_SOURCE.id,
            MODEL_280_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-280-access-validation",
          heading: "Validación separada de la presentación",
          text: "La ayuda indica que el resultado de la validación no supone por sí mismo la presentación de la declaración. Aquí se conserva exclusivamente esa información descriptiva.",
          sourceIds: [MODEL_280_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-280-details",
      title: "Preguntas frecuentes, diseño y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-280-details-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La AEAT publica una página HTML específica con preguntas sobre la información del modelo, las modalidades de plan, su movilización y otras circunstancias descritas por la fuente.",
          sourceIds: [MODEL_280_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-280-details-register-design",
          heading: "Diseño técnico del ejercicio 2022",
          text: "El catálogo técnico enlaza un PDF de veintidós páginas rotulado para el ejercicio 2022. El archivo contiene diseños de registro y no es un formulario en blanco; su actualidad material queda sin determinar.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            MODEL_280_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-280-details-normative",
          heading: "Marco normativo enlazado",
          text: "La ficha cita la Ley 35/2006 y el Real Decreto 439/2007. La Orden HAP/2118/2015 aprobó el modelo y las órdenes de 2016, 2019 y 2022 registran modificaciones posteriores enlazadas por la AEAT.",
          sourceIds: [
            LAW_35_2006_SOURCE.id,
            ROYAL_DECREE_439_2007_SOURCE.id,
            ORDER_HAP_2118_2015_SOURCE.id,
            ORDER_HFP_1822_2016_SOURCE.id,
            ORDER_HAC_1276_2019_SOURCE.id,
            ORDER_HFP_1192_2022_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_280_PROCEDURE_HOME_SOURCE,
    MODEL_280_PROCEDURE_RECORD_SOURCE,
    MODEL_280_HELP_SOURCE,
    MODEL_280_FAQ_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    MODEL_280_REGISTER_DESIGN_SOURCE,
    LAW_35_2006_SOURCE,
    ROYAL_DECREE_439_2007_SOURCE,
    ORDER_HAP_2118_2015_SOURCE,
    ORDER_HFP_1822_2016_SOURCE,
    ORDER_HAC_1276_2019_SOURCE,
    ORDER_HFP_1192_2022_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
    PERSONAL_AREA_SOURCE,
  ],
  documents: MODEL_280_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-280-link-procedure",
      label: "Página oficial del Modelo 280",
      sourceId: MODEL_280_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_280_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-help",
      label: "Ayuda técnica oficial del Modelo 280",
      sourceId: MODEL_280_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 280",
      sourceId: MODEL_280_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-register-design",
      label: "Diseño de registro oficial del Modelo 280",
      sourceId: MODEL_280_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-law",
      label: "Ley 35/2006",
      sourceId: LAW_35_2006_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-regulation",
      label: "Real Decreto 439/2007",
      sourceId: ROYAL_DECREE_439_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-approval-order",
      label: "Orden HAP/2118/2015",
      sourceId: ORDER_HAP_2118_2015_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-2016-order",
      label: "Orden HFP/1822/2016",
      sourceId: ORDER_HFP_1822_2016_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-2019-order",
      label: "Orden HAC/1276/2019",
      sourceId: ORDER_HAC_1276_2019_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-2022-order",
      label: "Orden HFP/1192/2022",
      sourceId: ORDER_HFP_1192_2022_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-link-electronic-order",
      label: "Orden HAP/2194/2013",
      sourceId: ORDER_HAP_2194_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-280-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 280?",
      answer:
        "Lo identifica como la declaración informativa anual de Planes de Ahorro a Largo Plazo.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_280_PROCEDURE_HOME_SOURCE.id,
        ORDER_HAP_2118_2015_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-categories",
      question: "¿Qué categorías de información enumera la FAQ oficial?",
      answer:
        "Enumera la identificación del titular y del plan, fechas vinculadas al plan, aportaciones y rendimientos, además de información asociada a determinadas circunstancias descritas por la fuente.",
      sourceIds: [MODEL_280_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-plan-types",
      question: "¿Qué modalidades de plan nombra la documentación oficial?",
      answer:
        "Nombra el Seguro Individual de Ahorro a Largo Plazo, SIALP, y la Cuenta Individual de Ahorro a Largo Plazo, CIALP.",
      sourceIds: [MODEL_280_FAQ_SOURCE.id, MODEL_280_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-mobility",
      question: "¿La FAQ trata la movilización de un plan entre entidades?",
      answer:
        "Sí. Describe de forma separada la información relacionada con la entidad de origen y con la entidad destinataria.",
      sourceIds: [MODEL_280_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-extinction",
      question: "¿La FAQ contiene información sobre la extinción del plan?",
      answer:
        "Sí. Incluye preguntas sobre los datos asociados a distintas circunstancias de extinción, sin que esta ficha evalúe ninguna de ellas.",
      sourceIds: [MODEL_280_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-official-page",
      question: "¿La AEAT publica preguntas frecuentes específicas?",
      answer:
        "Sí. La página oficial del procedimiento enlaza una FAQ HTML específica del Modelo 280.",
      sourceIds: [MODEL_280_PROCEDURE_HOME_SOURCE.id, MODEL_280_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-channel",
      question: "¿Qué canal técnico describe la ayuda oficial?",
      answer:
        "Describe TGVI en línea a partir de un fichero ajustado al diseño de registro.",
      sourceIds: [MODEL_280_HELP_SOURCE.id, REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-validation",
      question: "¿La validación del fichero supone su presentación?",
      answer:
        "No. La ayuda oficial indica que la validación no supone por sí misma la presentación.",
      sourceIds: [MODEL_280_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-document",
      question: "¿Qué es el PDF enlazado en el catálogo técnico?",
      answer:
        "Es un diseño de registro de veintidós páginas rotulado para el ejercicio 2022, no un formulario en blanco.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        MODEL_280_REGISTER_DESIGN_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-280-faq-applicability",
      question: "¿Esta ficha determina quién debe utilizar el Modelo 280?",
      answer:
        "No. Registra la identidad, las categorías informativas, el canal, la documentación y las fuentes oficiales sin evaluar casos concretos.",
      sourceIds: [
        MODEL_280_PROCEDURE_RECORD_SOURCE.id,
        MODEL_280_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_280_PROCEDURE_HOME_SOURCE.id,
      MODEL_280_PROCEDURE_RECORD_SOURCE.id,
      MODEL_280_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: PERSONAL_AREA_NAVIGATION,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"280">;

export const PUBLIC_AEAT_BATCH_10_LOTTERY_SAVINGS_270_280_CONTENT_V1 =
  deepFreeze([MODEL_270_CONTENT, MODEL_280_CONTENT] as const);
