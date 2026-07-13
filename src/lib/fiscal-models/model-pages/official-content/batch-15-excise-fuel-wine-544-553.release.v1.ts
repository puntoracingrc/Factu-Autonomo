import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_15_EXCISE_FUEL_WINE_544_553_RELEASE_ID_V1 =
  "public-aeat-official-batch-15-excise-fuel-wine-544-553.2026-07-13.v1" as const;

export type PublicAeatBatch15ExciseFuelWine544553CodeV1 =
  "544" | "545" | "546" | "547" | "548" | "553";

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

const CONTENT_BASE = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_15_EXCISE_FUEL_WINE_544_553_RELEASE_ID_V1,
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const;

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

const MODEL_544_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-544.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 544 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DH01.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "47ccea126e766fbde83f38f010b0b9251e211658e86280f325bf568f7b63bcba",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_544_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-544.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 544",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DH01.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f0392b80bdd22d1f6b8b4849aa967ee7cb53f048fd596be336d46e4b3ea20b1b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_545_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-545.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 545 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ05.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ee25b5cf8a6e0973ad6bea6e369191700dfefcaed829440cd745334b4d918fe9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_545_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-545.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 545",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DJ05.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "01c66746108a86b012dffcb9a79de03b4dd8f5bb6fe4a660957672b94719fb00",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-546.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 546 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ06.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "78b0aad32d570fc68357f8c8f34644aec2b4e2e5120a23a71637e72e8b7a55ab",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-546.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 546",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DJ06.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2289e16127db757a1f094638c77602268bcbb4d833ce6601d7e94300636c9493",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_SIANE_INFORMATION_SOURCE = {
  id: "aeat.model-546.siane-information.2024-12-23",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "SIANE · solicitud de devolución por avituallamiento a embarcaciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/siane/solicitud-devolucion-avituallamiento-embarcaciones-art-rie.html",
  officialUpdatedOn: "2024-12-23",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "358afbf84c059c81e4702e60c89d3d4c2d5b5c4ac73344e9647dc66467c00a4b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_MESSAGES_PDF_SOURCE = {
  id: "aeat.model-546.siane-messages-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "SIANE · mensajes para la solicitud de devolución",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/emcs/Sistema_de_Control_de_Movimientos_de_Impuestos_Especiales_%28EMCS%29/SIANE_nuevo/Sol_dev_avit_embarc.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "db44b1a7020f08ab5a13c84a01b997b45608ad210f667c8fc236874df9062cf0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_RECEIPT_PDF_SOURCE = {
  id: "aeat.model-546.delivery-receipt-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Recibo de entrega para avituallamientos a embarcaciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/emcs/Sistema_de_Control_de_Movimientos_de_Impuestos_Especiales_%28EMCS%29/SIANE_nuevo/Recibo_entrega.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "603881345cfc3cdee5750e061f5f08b01dc50b4a37953881e90faf879c8b5e57",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_547_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-547.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 547 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DH02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "21f33b419cf694fbb225970853778f9dd727af0252ceb8fc623a14a095b09b7c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_547_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-547.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 547",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DH02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f830cbe41795388d267f69d62f5d4cbbb72a3d813a10553bea4beecc63ebbb6f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_548_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-548.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 548 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF15.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fe3750cc4cf88c9cbf591eba4e61c823b026f7050ba4f4f2cf32fff736722b34",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_548_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-548.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 548",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DF15.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "24615539d60499599c9cc1dcb2a7cfb0d6ab60010648e79fbf32a0a39b2e5428",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_553_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-553.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 553 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "35994246f23b2fccb7f5334b3a5507a76a1f8bce2d8efc34a0f0f7aba2655444",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_553_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-553.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 553",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DF02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7ba51f64fb3125139a2afa163b91bf8ac467a682d28e51e4204f4effd200334d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_553_DOWNLOAD_PAGE_SOURCE = {
  id: "aeat.model-553.download-page.2026-03-10",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 553 · descarga del modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-declaraciones-operaciones/modelo-553-iiee______abricas-depositos-vino-fermentadas_/descarga-modelo.html",
  officialUpdatedOn: "2026-03-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d495e673496f8aef8d5f12a4a72debd7d70475844abbc6ca6c619eab5459ec28",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_553_FORM_PDF_SOURCE = {
  id: "aeat.model-553.form-pdf.2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 553 · formulario PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DF02/553.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "62a52abc4aba5486ecdc6492d349b45cebe0a1765176b4c0fbfba0b52736f02a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_553_WINE_FAQ_SOURCE = {
  id: "aeat.model-553.silicie-wine-faq.2025-07-04",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "SILICIE · establecimiento autorizado como elaborador de vino",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/silicie/preguntas-frecuentes/establecimiento-autorizado-elaborador-vino.html",
  officialUpdatedOn: "2025-07-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5c98eeb17916e70d957f7a778206f1b34e9bb918701703070970afbc841051cf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_553_FERMENTED_FAQ_SOURCE = {
  id: "aeat.model-553.silicie-fermented-faq.2025-07-04",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title:
    "SILICIE · establecimiento autorizado como elaborador de otras bebidas fermentadas",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/silicie/preguntas-frecuentes/establecimiento-autorizado-elaborador-otras-bebidas-fermentadas.html",
  officialUpdatedOn: "2025-07-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "75ef3df49e2e662a96ce479383ee197a1062580ed9c7f2242d7639d7130635eb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const EXCISE_RESOLUTION_2004_SOURCE = {
  id: "boe.excise.resolution-2004-09-16.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 16 de septiembre de 2004",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2004-17433",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "35cd6bca9e20c8792cc3a54cb88c47c310981632a5b6ca8c8a60ef9f081e0725",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const EXCISE_ORDER_2007_SOURCE = {
  id: "boe.excise.order-eha-3482-2007.original",
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

const EXCISE_ORDER_2010_SOURCE = {
  id: "boe.excise.order-eha-3363-2010.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3363/2010, de 23 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2010-20054",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d784608b8daa390f2e3e5f732b92d75e51fa9c9ed47e8cc4758c1f0f0d1c1910",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_ORDER_SOURCE = {
  id: "boe.model-546.order-hac-1147-2018.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1147/2018, de 9 de octubre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2018-14900",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "efcb38750316ee7cbb72b65ea9b7b2f656b330b26494245c33a46dbc4a3de80b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_546_REGULATION_SOURCE = {
  id: "boe.model-546.royal-decree-1512-2018.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 1512/2018, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2018-17995",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bfd623caf185749cfa4e0b5796b126f1473d83315ec3d878dc225bf4a1ef0281",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_548_ORDER_SOURCE = {
  id: "boe.model-548.order-hap-779-2013.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/779/2013, de 30 de abril",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-4825",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6a7d824d4561807f52d76f69367ecea3e7993a7ecd7a682f6a3a27808f1ab6ce",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SILICIE_ORDER_SOURCE = {
  id: "boe.silicie.order-hac-998-2019.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/998/2019, de 23 de septiembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-14247",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dec870aa324a4a60771cff77d99e35c224e16ce8a48f632660dbac5bf37c0c66",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_544_CONTENT = {
  ...CONTENT_BASE,
  code: "544",
  canonicalName:
    "II. EE. Pagos efectuados mediante cheque o tarjetas de gasóleo bonificado.",
  summary:
    "La AEAT identifica el Modelo 544 con los pagos efectuados mediante cheque o tarjetas de gasóleo bonificado y describe para él un canal de presentación mediante fichero.",
  searchTerms: [
    "modelo 544",
    "impuestos especiales",
    "IIEE",
    "gasóleo bonificado",
    "pagos con cheque",
    "tarjetas de gasóleo",
    "presentación por fichero",
    "Orden EHA 3482 2007",
  ],
  sections: [
    {
      id: "model-544-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-544-purpose-identity",
          heading: "Pagos mediante cheque o tarjetas",
          text: "El índice y la portada de la AEAT identifican el Modelo 544 con los pagos efectuados mediante cheque o tarjetas de gasóleo bonificado.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_544_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-544-purpose-record",
          heading: "Ficha administrativa",
          text: "La AEAT mantiene una ficha administrativa separada para este procedimiento.",
          sourceIds: [MODEL_544_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-544-access",
      title: "Canal y referencias normativas",
      kind: "ACCESS",
      items: [
        {
          id: "model-544-access-file",
          heading: "Presentación mediante fichero",
          text: "La página oficial describe un canal electrónico basado en la importación de fichero.",
          sourceIds: [MODEL_544_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-544-access-law",
          heading: "Textos publicados en el BOE",
          text: "La trazabilidad normativa registra la Resolución de 16 de septiembre de 2004 y la Orden EHA/3482/2007.",
          sourceIds: [
            EXCISE_RESOLUTION_2004_SOURCE.id,
            EXCISE_ORDER_2007_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_544_PROCEDURE_HOME_SOURCE,
    MODEL_544_PROCEDURE_RECORD_SOURCE,
    EXCISE_RESOLUTION_2004_SOURCE,
    EXCISE_ORDER_2007_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-544-link-procedure",
      label: "Página oficial del Modelo 544",
      sourceId: MODEL_544_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_544_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-link-resolution",
      label: "Resolución de 16 de septiembre de 2004",
      sourceId: EXCISE_RESOLUTION_2004_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-link-order",
      label: "Orden EHA/3482/2007",
      sourceId: EXCISE_ORDER_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-544-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 544?",
      answer:
        "Los pagos efectuados mediante cheque o tarjetas de gasóleo bonificado.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_544_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-cheques",
      question: "¿Aparecen los cheques en el título oficial?",
      answer:
        "Sí. La denominación publicada menciona expresamente pagos mediante cheque.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-cards",
      question: "¿Aparecen las tarjetas de gasóleo bonificado?",
      answer: "Sí. También forman parte de la denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-channel",
      question: "¿Qué canal describe la página oficial?",
      answer: "Un canal electrónico con importación de fichero.",
      sourceIds: [MODEL_544_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-pages",
      question: "¿Qué páginas oficiales se han registrado?",
      answer: "La portada del Modelo 544 y su ficha administrativa separada.",
      sourceIds: [
        MODEL_544_PROCEDURE_HOME_SOURCE.id,
        MODEL_544_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-resolution",
      question: "¿Qué resolución se conserva como referencia?",
      answer: "La Resolución de 16 de septiembre de 2004.",
      sourceIds: [EXCISE_RESOLUTION_2004_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-order",
      question: "¿Qué orden se registra junto a ella?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [EXCISE_ORDER_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-544-faq-source-types",
      question: "¿Qué tipos de fuente sostienen esta ficha?",
      answer:
        "Fuentes AEAT de catálogo y procedimiento, junto con textos normativos del BOE.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_544_PROCEDURE_RECORD_SOURCE.id,
        EXCISE_ORDER_2007_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_544_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"544">;

const MODEL_545_CONTENT = {
  ...CONTENT_BASE,
  code: "545",
  canonicalName:
    "II. EE. Suministros de carburantes para relaciones internacionales con devolución del impuesto sobre hidrocarburos.",
  summary:
    "La denominación actual publicada por la AEAT identifica el Modelo 545 con suministros de carburantes para relaciones internacionales y devolución del impuesto sobre hidrocarburos; la portada describe presentación mediante fichero.",
  searchTerms: [
    "modelo 545",
    "impuestos especiales",
    "IIEE",
    "suministros de carburantes",
    "relaciones internacionales",
    "devolución",
    "impuesto sobre hidrocarburos",
    "presentación por fichero",
  ],
  sections: [
    {
      id: "model-545-purpose",
      title: "Identidad oficial actual",
      kind: "PURPOSE",
      items: [
        {
          id: "model-545-purpose-identity",
          heading: "Suministros para relaciones internacionales",
          text: "El índice y la portada actuales de la AEAT identifican el Modelo 545 con suministros de carburantes para relaciones internacionales y devolución del impuesto sobre hidrocarburos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_545_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-545-purpose-record",
          heading: "Descripción administrativa diferenciada",
          text: "La ficha administrativa conserva una descripción más amplia y distinta de la denominación del catálogo actual. Esta página reproduce el nombre actual del catálogo sin trasladar aquella redacción a la denominación ni inferir aplicabilidad.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_545_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-545-access",
      title: "Canal y referencias normativas",
      kind: "ACCESS",
      items: [
        {
          id: "model-545-access-file",
          heading: "Importación de fichero",
          text: "La página oficial describe un canal electrónico mediante importación de fichero.",
          sourceIds: [MODEL_545_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-545-access-law",
          heading: "Textos publicados en el BOE",
          text: "La trazabilidad normativa registra la Resolución de 16 de septiembre de 2004 y la Orden EHA/3482/2007.",
          sourceIds: [
            EXCISE_RESOLUTION_2004_SOURCE.id,
            EXCISE_ORDER_2007_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_545_PROCEDURE_HOME_SOURCE,
    MODEL_545_PROCEDURE_RECORD_SOURCE,
    EXCISE_RESOLUTION_2004_SOURCE,
    EXCISE_ORDER_2007_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-545-link-procedure",
      label: "Página oficial del Modelo 545",
      sourceId: MODEL_545_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_545_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-link-resolution",
      label: "Resolución de 16 de septiembre de 2004",
      sourceId: EXCISE_RESOLUTION_2004_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-link-order",
      label: "Orden EHA/3482/2007",
      sourceId: EXCISE_ORDER_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-545-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 545?",
      answer:
        "Los suministros de carburantes para relaciones internacionales con devolución del impuesto sobre hidrocarburos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_545_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-international",
      question: "¿Qué contexto menciona el nombre oficial?",
      answer: "Las relaciones internacionales.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-current-tax-name",
      question: "¿Qué impuesto nombra el catálogo actual?",
      answer: "El impuesto sobre hidrocarburos.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-historical-wording",
      question:
        "¿Cómo se trata la redacción diferente de la ficha administrativa?",
      answer:
        "Se conserva como fuente trazable, sin trasladarla a la denominación actual ni extraer una conclusión de aplicabilidad.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_545_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-channel",
      question: "¿Qué canal describe la portada actual?",
      answer: "Un canal electrónico mediante importación de fichero.",
      sourceIds: [MODEL_545_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-resolution",
      question: "¿Qué resolución se registra?",
      answer: "La Resolución de 16 de septiembre de 2004.",
      sourceIds: [EXCISE_RESOLUTION_2004_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-order",
      question: "¿Qué orden se registra junto a ella?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [EXCISE_ORDER_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-545-faq-pages",
      question: "¿Qué fuentes administrativas publica la AEAT?",
      answer: "Una portada del Modelo 545 y una ficha administrativa separada.",
      sourceIds: [
        MODEL_545_PROCEDURE_HOME_SOURCE.id,
        MODEL_545_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_545_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"545">;

const MODEL_546_CONTENT = {
  ...CONTENT_BASE,
  code: "546",
  canonicalName:
    "II. EE. Avituallamiento de gasóleo a embarcaciones con derecho a la devolución del impuesto sobre hidrocarburos.",
  summary:
    "La AEAT identifica el Modelo 546 con el avituallamiento de gasóleo a embarcaciones con derecho a devolución del impuesto sobre hidrocarburos y documenta el procedimiento actual mediante SIANE, mensajes electrónicos y un recibo de entrega.",
  searchTerms: [
    "modelo 546",
    "impuestos especiales",
    "IIEE",
    "avituallamiento de gasóleo",
    "embarcaciones",
    "devolución hidrocarburos",
    "SIANE",
    "recibo de entrega",
    "servicio web",
    "Orden HAC 1147 2018",
  ],
  sections: [
    {
      id: "model-546-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-546-purpose-identity",
          heading: "Avituallamiento a embarcaciones",
          text: "El índice y la portada de la AEAT identifican el Modelo 546 con el avituallamiento de gasóleo a embarcaciones con derecho a devolución del impuesto sobre hidrocarburos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_546_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-546-purpose-record",
          heading: "Ficha administrativa",
          text: "La AEAT mantiene una ficha administrativa específica para el procedimiento del Modelo 546.",
          sourceIds: [MODEL_546_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-546-current-system",
      title: "Sistema y canales documentados",
      kind: "ACCESS",
      items: [
        {
          id: "model-546-current-system-siane",
          heading: "Información actual de SIANE",
          text: "La AEAT publica una página específica de SIANE para la solicitud de devolución por avituallamiento a embarcaciones y documenta intercambio mediante formulario web y servicio web.",
          sourceIds: [
            MODEL_546_SIANE_INFORMATION_SOURCE.id,
            MODEL_546_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-546-current-system-transition",
          heading: "Procedimiento electrónico vigente documentado",
          text: "La Orden HAC/1147/2018 regula el recibo de entrega y los mensajes electrónicos del procedimiento y deja sin efecto el diseño anterior del Modelo 546. Esta ficha utiliza únicamente esa documentación posterior.",
          sourceIds: [MODEL_546_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-546-documents",
      title: "Documentación técnica oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-546-documents-messages",
          heading: "Guía de mensajes electrónicos",
          text: "La página SIANE enlaza un PDF de siete páginas que describe los mensajes del procedimiento de solicitud de devolución.",
          sourceIds: [
            MODEL_546_SIANE_INFORMATION_SOURCE.id,
            MODEL_546_MESSAGES_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-546-documents-receipt",
          heading: "Recibo de entrega",
          text: "La misma información oficial enlaza un PDF de siete páginas con el recibo de entrega previsto para avituallamientos a embarcaciones. La miniatura de esta ficha procede de su primera página y no se presenta como formulario del Modelo 546.",
          sourceIds: [
            MODEL_546_SIANE_INFORMATION_SOURCE.id,
            MODEL_546_RECEIPT_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-546-documents-regulation",
          heading: "Reglamento relacionado",
          text: "La trazabilidad jurídica registra también el Real Decreto 1512/2018, de 28 de diciembre.",
          sourceIds: [MODEL_546_REGULATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_546_PROCEDURE_HOME_SOURCE,
    MODEL_546_PROCEDURE_RECORD_SOURCE,
    MODEL_546_SIANE_INFORMATION_SOURCE,
    MODEL_546_MESSAGES_PDF_SOURCE,
    MODEL_546_RECEIPT_PDF_SOURCE,
    MODEL_546_ORDER_SOURCE,
    MODEL_546_REGULATION_SOURCE,
  ],
  documents: [
    {
      id: "model-546-siane-messages-document",
      kind: "GUIDE",
      title: "Mensajes de solicitud de devolución por avituallamiento",
      sourceId: MODEL_546_MESSAGES_PDF_SOURCE.id,
      landingPageSourceId: MODEL_546_SIANE_INFORMATION_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Sol_dev_avit_embarc.pdf",
      byteLength: 51814,
      pageCount: 7,
      sha256:
        "db44b1a7020f08ab5a13c84a01b997b45608ad210f667c8fc236874df9062cf0",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-546-delivery-receipt-document",
      kind: "FORM",
      title: "Recibo de entrega para avituallamientos a embarcaciones",
      sourceId: MODEL_546_RECEIPT_PDF_SOURCE.id,
      landingPageSourceId: MODEL_546_SIANE_INFORMATION_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Recibo_entrega.pdf",
      byteLength: 37006,
      pageCount: 7,
      sha256:
        "603881345cfc3cdee5750e061f5f08b01dc50b4a37953881e90faf879c8b5e57",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-546-delivery-receipt-thumbnail",
    sourceId: MODEL_546_RECEIPT_PDF_SOURCE.id,
    publicHref:
      "/fiscal-models/modelo-546/recibo-entrega-avituallamiento-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "45d1e2da19bb4fc58233efef3160524853e8d64b43778bd227ae5c9012d28756",
    alt: "Vista previa del recibo de entrega oficial para avituallamientos a embarcaciones",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-546-link-procedure",
      label: "Página oficial del Modelo 546",
      sourceId: MODEL_546_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_546_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-link-siane",
      label: "Información oficial SIANE sobre avituallamiento",
      sourceId: MODEL_546_SIANE_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-link-messages",
      label: "Guía PDF de mensajes electrónicos",
      sourceId: MODEL_546_MESSAGES_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-link-receipt",
      label: "Recibo de entrega PDF",
      sourceId: MODEL_546_RECEIPT_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-link-order",
      label: "Orden HAC/1147/2018",
      sourceId: MODEL_546_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-link-regulation",
      label: "Real Decreto 1512/2018",
      sourceId: MODEL_546_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-546-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 546?",
      answer:
        "El avituallamiento de gasóleo a embarcaciones con derecho a devolución del impuesto sobre hidrocarburos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_546_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-siane",
      question: "¿Publica la AEAT información específica en SIANE?",
      answer:
        "Sí. Existe una página oficial dedicada a la solicitud de devolución por avituallamiento a embarcaciones.",
      sourceIds: [MODEL_546_SIANE_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-browser",
      question: "¿La documentación actual describe un formulario web?",
      answer:
        "Sí. La información oficial contempla un canal mediante formulario web.",
      sourceIds: [
        MODEL_546_SIANE_INFORMATION_SOURCE.id,
        MODEL_546_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-web-service",
      question: "¿También se documenta un servicio web?",
      answer:
        "Sí. La documentación oficial contempla intercambio mediante servicio web.",
      sourceIds: [
        MODEL_546_SIANE_INFORMATION_SOURCE.id,
        MODEL_546_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-edifact",
      question: "¿Aparece una referencia a EDIFACT en la portada de la AEAT?",
      answer:
        "Sí. La portada lo muestra como etiqueta técnica, mientras que esta ficha normaliza únicamente los métodos formulario web y servicio web descritos por la regulación posterior.",
      sourceIds: [
        MODEL_546_PROCEDURE_HOME_SOURCE.id,
        MODEL_546_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-messages",
      question: "¿Qué documenta el PDF de mensajes?",
      answer:
        "Los mensajes electrónicos asociados al procedimiento de solicitud de devolución por avituallamiento.",
      sourceIds: [MODEL_546_MESSAGES_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-receipt",
      question: "¿Qué es el segundo PDF registrado?",
      answer:
        "Un recibo de entrega para avituallamientos a embarcaciones relacionado con el artículo 110 del Reglamento de los Impuestos Especiales.",
      sourceIds: [MODEL_546_RECEIPT_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-thumbnail",
      question: "¿Qué muestra la miniatura de esta ficha?",
      answer:
        "La cabecera y el inicio de la primera página del recibo de entrega oficial; no se etiqueta como formulario oficial del Modelo 546.",
      sourceIds: [MODEL_546_RECEIPT_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-pdf-safety",
      question:
        "¿Los PDF auditados contienen JavaScript o formularios activos?",
      answer:
        "No. Las dos copias auditadas carecen de JavaScript, campos AcroForm y cifrado.",
      sourceIds: [
        MODEL_546_MESSAGES_PDF_SOURCE.id,
        MODEL_546_RECEIPT_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-546-faq-current-order",
      question: "¿Qué orden documenta el procedimiento electrónico posterior?",
      answer: "La Orden HAC/1147/2018, de 9 de octubre.",
      sourceIds: [MODEL_546_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_546_SIANE_INFORMATION_SOURCE.id,
      MODEL_546_ORDER_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"546">;

const MODEL_547_CONTENT = {
  ...CONTENT_BASE,
  code: "547",
  canonicalName:
    "II. EE. Relación de abonos realizados a detallistas de gasóleo bonificado.",
  summary:
    "La AEAT identifica el Modelo 547 como la relación de abonos realizados a detallistas de gasóleo bonificado y describe canales mediante formulario e importación de fichero.",
  searchTerms: [
    "modelo 547",
    "impuestos especiales",
    "IIEE",
    "abonos",
    "detallistas",
    "gasóleo bonificado",
    "formulario electrónico",
    "importación de fichero",
  ],
  sections: [
    {
      id: "model-547-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-547-purpose-identity",
          heading: "Relación de abonos a detallistas",
          text: "El índice y la portada de la AEAT identifican el Modelo 547 como la relación de abonos realizados a detallistas de gasóleo bonificado.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_547_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-547-purpose-record",
          heading: "Ficha administrativa",
          text: "La AEAT mantiene una ficha administrativa separada para el procedimiento del Modelo 547.",
          sourceIds: [MODEL_547_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-547-access",
      title: "Canales y referencias normativas",
      kind: "ACCESS",
      items: [
        {
          id: "model-547-access-channels",
          heading: "Formulario e importación de fichero",
          text: "La portada oficial describe un formulario electrónico y una opción de importación de fichero.",
          sourceIds: [MODEL_547_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-547-access-law",
          heading: "Órdenes registradas",
          text: "La trazabilidad normativa registra la Orden EHA/3482/2007 y la Orden EHA/3363/2010.",
          sourceIds: [EXCISE_ORDER_2007_SOURCE.id, EXCISE_ORDER_2010_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_547_PROCEDURE_HOME_SOURCE,
    MODEL_547_PROCEDURE_RECORD_SOURCE,
    EXCISE_ORDER_2007_SOURCE,
    EXCISE_ORDER_2010_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-547-link-procedure",
      label: "Página oficial del Modelo 547",
      sourceId: MODEL_547_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_547_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: EXCISE_ORDER_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-link-order-2010",
      label: "Orden EHA/3363/2010",
      sourceId: EXCISE_ORDER_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-547-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 547?",
      answer:
        "La relación de abonos realizados a detallistas de gasóleo bonificado.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_547_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-operation",
      question: "¿Qué operación aparece en su nombre?",
      answer: "Los abonos realizados.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-recipients",
      question: "¿A quién menciona la denominación oficial?",
      answer: "A detallistas de gasóleo bonificado.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-browser-channel",
      question: "¿Existe un canal mediante formulario?",
      answer: "Sí. La portada oficial describe un formulario electrónico.",
      sourceIds: [MODEL_547_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-file-channel",
      question: "¿Existe un canal mediante fichero?",
      answer:
        "Sí. La misma portada identifica una opción de importación de fichero.",
      sourceIds: [MODEL_547_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-pages",
      question: "¿Qué fuentes administrativas se han registrado?",
      answer: "La portada del Modelo 547 y su ficha administrativa separada.",
      sourceIds: [
        MODEL_547_PROCEDURE_HOME_SOURCE.id,
        MODEL_547_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-order-2007",
      question: "¿Qué orden de 2007 se registra?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [EXCISE_ORDER_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-547-faq-order-2010",
      question: "¿Qué orden posterior se conserva en la trazabilidad?",
      answer: "La Orden EHA/3363/2010, de 23 de diciembre.",
      sourceIds: [EXCISE_ORDER_2010_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_547_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"547">;

const MODEL_548_CONTENT = {
  ...CONTENT_BASE,
  code: "548",
  canonicalName: "Declaración informativa de cuotas repercutidas.",
  summary:
    "La AEAT identifica el Modelo 548 como la declaración informativa de cuotas repercutidas y describe canales mediante formulario e importación de fichero, sin que esta ficha determine alcance, obligación o aplicabilidad.",
  searchTerms: [
    "modelo 548",
    "impuestos especiales",
    "IIEE",
    "declaración informativa",
    "cuotas repercutidas",
    "formulario electrónico",
    "importación de fichero",
    "Orden HAP 779 2013",
  ],
  sections: [
    {
      id: "model-548-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-548-purpose-identity",
          heading: "Declaración informativa",
          text: "El índice y la portada de la AEAT identifican el Modelo 548 como la declaración informativa de cuotas repercutidas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_548_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-548-purpose-record",
          heading: "Ficha administrativa",
          text: "La AEAT mantiene una ficha administrativa específica. Esta página reproduce su identidad sin deducir quién debe utilizarla ni en qué circunstancias.",
          sourceIds: [MODEL_548_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-548-access",
      title: "Canales y referencia normativa",
      kind: "ACCESS",
      items: [
        {
          id: "model-548-access-channels",
          heading: "Formulario e importación de fichero",
          text: "La portada oficial describe un formulario electrónico y una opción de importación de fichero.",
          sourceIds: [MODEL_548_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-548-access-law",
          heading: "Orden publicada en el BOE",
          text: "La fuente normativa registrada es la Orden HAP/779/2013, de 30 de abril.",
          sourceIds: [MODEL_548_ORDER_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_548_PROCEDURE_HOME_SOURCE,
    MODEL_548_PROCEDURE_RECORD_SOURCE,
    MODEL_548_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-548-link-procedure",
      label: "Página oficial del Modelo 548",
      sourceId: MODEL_548_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_548_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-link-order",
      label: "Orden HAP/779/2013",
      sourceId: MODEL_548_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-548-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 548?",
      answer: "La declaración informativa de cuotas repercutidas.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_548_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-type",
      question: "¿Cómo clasifica el título oficial esta declaración?",
      answer: "Como declaración informativa.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-content-label",
      question: "¿Qué concepto incluye el nombre publicado?",
      answer: "Las cuotas repercutidas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-browser-channel",
      question: "¿Describe la AEAT un formulario electrónico?",
      answer: "Sí. La portada oficial identifica ese canal.",
      sourceIds: [MODEL_548_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-file-channel",
      question: "¿Describe también importación de fichero?",
      answer: "Sí. La portada registra una opción de importación de fichero.",
      sourceIds: [MODEL_548_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-pages",
      question: "¿Qué páginas de la AEAT sostienen esta ficha?",
      answer: "La portada específica y la ficha administrativa del Modelo 548.",
      sourceIds: [
        MODEL_548_PROCEDURE_HOME_SOURCE.id,
        MODEL_548_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-order",
      question: "¿Qué orden se conserva como fuente normativa?",
      answer: "La Orden HAP/779/2013, de 30 de abril.",
      sourceIds: [MODEL_548_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-548-faq-applicability",
      question: "¿La ficha decide a quién resulta aplicable?",
      answer:
        "No. Registra la identidad, los canales y la fuente normativa sin deducir alcance u obligación para un caso concreto.",
      sourceIds: [
        MODEL_548_PROCEDURE_RECORD_SOURCE.id,
        MODEL_548_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_548_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"548">;

const MODEL_553_CONTENT = {
  ...CONTENT_BASE,
  code: "553",
  canonicalName:
    "II. EE. Declaración de operaciones en fábricas y depósitos de vino y bebidas fermentadas.",
  summary:
    "La AEAT identifica el Modelo 553 con la declaración de operaciones en fábricas y depósitos de vino y bebidas fermentadas, separa en su portada los ejercicios 2025 y siguientes de los anteriores y publica documentación y preguntas SILICIE sin que esta ficha determine obligaciones concretas.",
  searchTerms: [
    "modelo 553",
    "impuestos especiales",
    "IIEE",
    "declaración de operaciones",
    "fábricas de vino",
    "depósitos de vino",
    "bebidas fermentadas",
    "SILICIE",
    "formulario 553 PDF",
    "ejercicio 2025",
  ],
  sections: [
    {
      id: "model-553-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-553-purpose-identity",
          heading: "Operaciones de vino y bebidas fermentadas",
          text: "El índice y la portada de la AEAT identifican el Modelo 553 con la declaración de operaciones en fábricas y depósitos de vino y bebidas fermentadas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_553_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-553-purpose-record",
          heading: "Ficha administrativa",
          text: "La AEAT mantiene una ficha administrativa separada para el procedimiento del Modelo 553.",
          sourceIds: [MODEL_553_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-553-access",
      title: "Canal y separación por ejercicios",
      kind: "ACCESS",
      items: [
        {
          id: "model-553-access-routes",
          heading: "Rutas diferenciadas en la portada",
          text: "La portada oficial separa las opciones etiquetadas para ejercicios 2025 y siguientes de las correspondientes a ejercicios anteriores a 2025. Esta ficha informa de esa separación sin seleccionar una ruta para el usuario.",
          sourceIds: [MODEL_553_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-553-access-browser",
          heading: "Formulario electrónico",
          text: "La portada describe acceso mediante formulario electrónico.",
          sourceIds: [MODEL_553_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-553-documents",
      title: "Documento y preguntas oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-553-documents-pdf",
          heading: "Formulario PDF",
          text: "La AEAT mantiene un PDF oficial de tres páginas. Su actualidad material se deja sin determinar y no se extraen de él casillas, importes ni reglas.",
          sourceIds: [
            MODEL_553_DOWNLOAD_PAGE_SOURCE.id,
            MODEL_553_FORM_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-553-documents-faq",
          heading: "Preguntas SILICIE diferenciadas",
          text: "La AEAT publica preguntas separadas para establecimientos autorizados como elaboradores de vino y como elaboradores de otras bebidas fermentadas. Las páginas distinguen situaciones de llevanza en soporte papel y de suministro electrónico, sin que esta ficha determine cuál corresponde a un caso concreto.",
          sourceIds: [
            MODEL_553_WINE_FAQ_SOURCE.id,
            MODEL_553_FERMENTED_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-553-documents-law",
          heading: "Referencias normativas registradas",
          text: "La trazabilidad incluye las Órdenes EHA/3482/2007, EHA/3363/2010 y HAC/998/2019.",
          sourceIds: [
            EXCISE_ORDER_2007_SOURCE.id,
            EXCISE_ORDER_2010_SOURCE.id,
            SILICIE_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_553_PROCEDURE_HOME_SOURCE,
    MODEL_553_PROCEDURE_RECORD_SOURCE,
    MODEL_553_DOWNLOAD_PAGE_SOURCE,
    MODEL_553_FORM_PDF_SOURCE,
    MODEL_553_WINE_FAQ_SOURCE,
    MODEL_553_FERMENTED_FAQ_SOURCE,
    EXCISE_ORDER_2007_SOURCE,
    EXCISE_ORDER_2010_SOURCE,
    SILICIE_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-553-form-document",
      kind: "FORM",
      title: "Formulario PDF del Modelo 553",
      sourceId: MODEL_553_FORM_PDF_SOURCE.id,
      landingPageSourceId: MODEL_553_DOWNLOAD_PAGE_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "553.pdf",
      byteLength: 63675,
      pageCount: 3,
      sha256:
        "62a52abc4aba5486ecdc6492d349b45cebe0a1765176b4c0fbfba0b52736f02a",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-553-form-thumbnail",
    sourceId: MODEL_553_FORM_PDF_SOURCE.id,
    publicHref: "/fiscal-models/modelo-553/formulario-modelo-553-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "9bc823d611d05f30a6f38f7c3aca7bf9186783c177b25dbee33d2da39a3c188e",
    alt: "Vista previa del formulario oficial del Modelo 553",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-553-link-procedure",
      label: "Página oficial del Modelo 553",
      sourceId: MODEL_553_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_553_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-download-page",
      label: "Página oficial de descarga del Modelo 553",
      sourceId: MODEL_553_DOWNLOAD_PAGE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-pdf",
      label: "Formulario PDF oficial del Modelo 553",
      sourceId: MODEL_553_FORM_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-wine-faq",
      label: "Preguntas SILICIE para elaboradores de vino",
      sourceId: MODEL_553_WINE_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-fermented-faq",
      label: "Preguntas SILICIE para otras bebidas fermentadas",
      sourceId: MODEL_553_FERMENTED_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: EXCISE_ORDER_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-order-2010",
      label: "Orden EHA/3363/2010",
      sourceId: EXCISE_ORDER_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-link-silicie-order",
      label: "Orden HAC/998/2019",
      sourceId: SILICIE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-553-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 553?",
      answer:
        "La declaración de operaciones en fábricas y depósitos de vino y bebidas fermentadas.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_553_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-products",
      question: "¿Qué productos menciona el título oficial?",
      answer: "El vino y las bebidas fermentadas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-establishments",
      question: "¿Qué tipos de establecimiento aparecen en el nombre?",
      answer: "Fábricas y depósitos.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-route-split",
      question: "¿Cómo organiza la portada oficial las opciones por ejercicio?",
      answer:
        "Separa las opciones para 2025 y siguientes de las correspondientes a ejercicios anteriores a 2025.",
      sourceIds: [MODEL_553_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-channel",
      question: "¿Qué tipo de canal identifica la portada?",
      answer: "Un formulario electrónico.",
      sourceIds: [MODEL_553_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-pdf",
      question: "¿Existe un formulario PDF oficial?",
      answer: "Sí. La AEAT mantiene un documento de tres páginas.",
      sourceIds: [
        MODEL_553_DOWNLOAD_PAGE_SOURCE.id,
        MODEL_553_FORM_PDF_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-pdf-safety",
      question: "¿Qué comprobación técnica se hizo sobre el PDF?",
      answer:
        "La copia auditada no contiene JavaScript, campos AcroForm ni cifrado.",
      sourceIds: [MODEL_553_FORM_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-wine",
      question:
        "¿Publica la AEAT preguntas específicas para elaboradores de vino?",
      answer: "Sí. Existe una página SILICIE dedicada a ese supuesto.",
      sourceIds: [MODEL_553_WINE_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-fermented",
      question: "¿Hay preguntas distintas para otras bebidas fermentadas?",
      answer: "Sí. La AEAT publica otra página SILICIE separada.",
      sourceIds: [MODEL_553_FERMENTED_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-553-faq-accounting-cases",
      question:
        "¿Las preguntas oficiales dan una única respuesta para todos los casos?",
      answer:
        "No. Las páginas distinguen situaciones de llevanza en soporte papel y de suministro electrónico; esta ficha no decide cuál corresponde a un usuario.",
      sourceIds: [
        MODEL_553_WINE_FAQ_SOURCE.id,
        MODEL_553_FERMENTED_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_553_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
} as const satisfies PublicAeatOfficialModelContentV1<"553">;

export const PUBLIC_AEAT_BATCH_15_EXCISE_FUEL_WINE_544_553_CONTENT_V1 =
  deepFreeze([
    MODEL_544_CONTENT,
    MODEL_545_CONTENT,
    MODEL_546_CONTENT,
    MODEL_547_CONTENT,
    MODEL_548_CONTENT,
    MODEL_553_CONTENT,
  ] as const);
