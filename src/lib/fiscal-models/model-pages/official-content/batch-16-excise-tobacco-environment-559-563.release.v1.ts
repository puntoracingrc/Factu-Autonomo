import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_16_EXCISE_TOBACCO_ENVIRONMENT_559_563_RELEASE_ID_V1 =
  "public-aeat-official-batch-16-excise-tobacco-environment-559-563.2026-07-14.v1" as const;

export type PublicAeatBatch16ExciseTobaccoEnvironment559563CodeV1 =
  | "559"
  | "560"
  | "561"
  | "562"
  | "563";

const REVIEWED_ON = "2026-07-14" as const;
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

function defineSource(
  source: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentSourceV1 {
  return source;
}

type Batch16ModelInput<Code extends string> = Omit<
  PublicAeatOfficialModelContentV1<Code>,
  | "schemaVersion"
  | "releaseId"
  | "contentStatus"
  | "sourceVerificationStatus"
  | "applicabilityStatus"
  | "lifecycleStatus"
  | "reviewedOn"
  | "thumbnail"
  | "externalNavigation"
  | "limitations"
>;

function defineModel<const Code extends string>(
  content: Batch16ModelInput<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  return {
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId:
      PUBLIC_AEAT_BATCH_16_EXCISE_TOBACCO_ENVIRONMENT_559_563_RELEASE_ID_V1,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: "UNDETERMINED",
    reviewedOn: REVIEWED_ON,
    thumbnail: null,
    externalNavigation: null,
    limitations: LIMITATIONS,
    ...content,
  };
}

const OFFICIAL_MODEL_INDEX_SOURCE = defineSource({
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
});

const EXCISE_LAW_SOURCE = defineSource({
  id: "boe.excise-law-38-1992.consolidated.2026-06-30",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 38/1992, de 28 de diciembre, de Impuestos Especiales",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741&tn=1&p=20260630",
  officialUpdatedOn: "2026-06-30",
  capturedOn: "2026-07-14",
  sourceSha256:
    "14dd5b82352b18945ff58d20ee87d07a191e3a222fdc637e5fdaab3a5fd3ecad",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const EXCISE_REGULATION_SOURCE = defineSource({
  id: "boe.excise-regulation-rd-1165-1995.consolidated.2025-01-23",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 1165/1995, de 7 de julio, Reglamento de los Impuestos Especiales",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-1995-18266&tn=1&p=20250123",
  officialUpdatedOn: "2025-01-23",
  capturedOn: "2026-07-14",
  sourceSha256:
    "c6533dc4fc4d888cb9db85aa8ad06f852924ddd1eacf82c5d46b5dc73a9a6a4a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_EHA_3482_2007_SOURCE = defineSource({
  id: "boe.order-eha-3482-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3482/2007, de 20 de noviembre",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-20637",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0ab73c64dc4a71bd5fcbd87c7e98d608ebfab3321eee87d5596dbeabbbd453e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const AEAT_ELECTRONIC_SEAT_2009_SOURCE = defineSource({
  id: "boe.aeat-electronic-seat-resolution-2009.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 28 de diciembre de 2009 sobre la Sede electrónica de la AEAT",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-21051",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "39f508e7bfcb960751f2e0afb4019cfcb35916600b9fa82ad98ded1b4f82d274",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAP_71_2013_SOURCE = defineSource({
  id: "boe.order-hap-71-2013.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/71/2013, de 30 de enero",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-953",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "831d6074f36a12beeb01afdeb4604d6acb55341baca5b2a8c04faf63f59be53b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAP_2194_2013_SOURCE = defineSource({
  id: "boe.order-hap-2194-2013.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2194/2013, de 22 de noviembre",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-12385",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "705a68e20432e9f2658e3e9852c4007f3449c249afe482c82e9fdc14c0b64f65",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_172_2021_SOURCE = defineSource({
  id: "boe.order-hac-172-2021.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/172/2021, de 25 de febrero",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2021-3101",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0fe1062667dcc0085d8a78be48eae31c8bd6d0fe1ceb280c8631d20088867d5d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_1433_2024_SOURCE = defineSource({
  id: "boe.order-hac-1433-2024.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1433/2024, de 11 de diciembre",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-26485",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1ab18bc4f03e7a155c552e32f60f4bc1035c696438736b8ea0959d22968a53af",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_559_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-559.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 559 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI01.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e40d2aafd5560837e8e19d08f7542c211a815e62ff01899aa73d70fe0b28f853",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_559_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-559.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 559 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI01.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "23aad91ca825b0f7a861ccfb6913e2282f559012d09a4a0fcb2fd8e32c890a24",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_559_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-559.download.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Descarga del Modelo 559",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/ii_ee-declaraciones-liquidaciones/modelo-559-iiee______regimenes-destilacion-artesanal-cosechero_/descarga-modelo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cbecdf1158f7240c48666a11ab34ceb754f03d93b8f967e7c7e8b23d2d850a85",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_559_FORM_SOURCE = defineSource({
  id: "aeat.model-559.form-pdf.2022-06-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formulario oficial del Modelo 559",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DI01/mod559.pdf",
  officialUpdatedOn: "2022-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5a87c9d4f3f7309b2b019eb82d604861f7dad2867f685bbdda0e5167d505962b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_559_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-559.instructions-pdf.2022-06-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones oficiales del Modelo 559",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DI01/instr559.pdf",
  officialUpdatedOn: "2022-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e8ed2ed29d03c34c7f25d62735156389f9548adfcfe76cc8fb14a465d6bf8633",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_560_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-560.procedure-home.2026-06-18",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 560 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI02.shtml",
  officialUpdatedOn: "2026-06-18",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4289416624c5521794b302457404cfafcedbb7fe30ff7d4f49f60d1de9927976",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_560_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-560.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 560 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c2c793a7b6072ca4702d0e30157ac8ae2fe558371d4e0cf41a7c049df2cca5b2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_560_GENERAL_INFORMATION_SOURCE = defineSource({
  id: "aeat.model-560.general-information.2026-06-30",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Impuesto sobre la electricidad · información general",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-sobre-electricidad/informacion-general.html",
  officialUpdatedOn: "2026-06-30",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e24afd22f4463abb81ccc1d0a6cff14900a74168be20a744d04496fcc027787e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_560_IMPORT_INFORMATION_SOURCE = defineSource({
  id: "aeat.model-560.import-designs.2025-01-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 560 · diseños de registro e importación de fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-sobre-electricidad/nuevo-modelo-560.html",
  officialUpdatedOn: "2025-01-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "50fab9b74b87b4d90b91deb5f43491e0ec876a64348d800c6cf83de9cc86d5fb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_560_IMPORT_GUIDE_SOURCE = defineSource({
  id: "aeat.model-560.import-guide-2025.pdf.2025-01-22",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Ayuda para la importación de fichero del Modelo 560 · versión 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/electricidad/modelo_560/Ayuda_ImpFich2025.pdf",
  officialUpdatedOn: "2025-01-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "34b299acc3d403d4fc6b5d94c7973e44d28655db28949e92cb2b984eb0e969b7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_561_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-561.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 561 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI03.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3039e3743c4a672d4997e7dd644c20af6952681c6236bb8e035936a89621a045",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_561_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-561.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 561 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI03.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ff0e99b69787998b385193485235ecac67863c56486dee2d6ff0496d66ae85a8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_562_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-562.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 562 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI04.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fa137def19cd4e4588c971fa4388684d1d900536b3506873f51265a4009c1573",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_562_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-562.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 562 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI04.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "63c3a592e0343e3a8414b39e74c1d15ed9fd73d0cd70d656e0f75e022531502c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_563_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-563.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 563 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI05.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "61bad1878ab70f239d7396f1fb639c87c891ce32e46840aa39749f7c545b6b16",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_563_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-563.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 563 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI05.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8fc0765ab7d7ed9c8ed1166acf5e865d132e17872774cc40b6a96c84f746a054",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_559_CONTENT = defineModel({
  code: "559",
  canonicalName:
    "II. EE. Impuesto sobre el alcohol y bebidas derivadas. Regímenes de destilación artesanal y de cosechero.",
  summary:
    "La AEAT identifica el Modelo 559 dentro del impuesto sobre el alcohol y bebidas derivadas para los regímenes de destilación artesanal y de cosechero.",
  searchTerms: [
    "modelo 559",
    "impuestos especiales",
    "alcohol",
    "bebidas derivadas",
    "destilación artesanal",
    "régimen de cosechero",
    "modelo 559 pdf",
    "modelo 559 instrucciones",
  ],
  sections: [
    {
      id: "model-559-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-559-purpose-identity",
          heading: "Impuesto y regímenes identificados",
          text: "El índice y la página oficial de la AEAT denominan Modelo 559 al relativo al impuesto sobre el alcohol y bebidas derivadas en los regímenes de destilación artesanal y de cosechero.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_559_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-559-purpose-procedure",
          heading: "Página y ficha administrativas",
          text: "La AEAT publica una página de gestiones y una ficha administrativa específicas para el Modelo 559.",
          sourceIds: [
            MODEL_559_PROCEDURE_HOME_SOURCE.id,
            MODEL_559_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-559-details",
      title: "Documentación y marco oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-559-details-downloads",
          heading: "Formulario e instrucciones",
          text: "La página de descarga de la AEAT enlaza un formulario y un documento de instrucciones del Modelo 559.",
          sourceIds: [MODEL_559_DOWNLOAD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-559-details-framework",
          heading: "Fuentes normativas registradas",
          text: "La ficha conserva las versiones consolidadas informativas del BOE de la Ley 38/1992 y de su Reglamento, junto con las publicaciones oficiales de la Orden EHA/3482/2007 y de la resolución sobre la Sede electrónica de la AEAT.",
          sourceIds: [
            EXCISE_LAW_SOURCE.id,
            EXCISE_REGULATION_SOURCE.id,
            ORDER_EHA_3482_2007_SOURCE.id,
            AEAT_ELECTRONIC_SEAT_2009_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-559-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-559-access-electronic",
          heading: "Tramitación electrónica",
          text: "La página oficial ofrece una gestión electrónica para el Modelo 559.",
          sourceIds: [MODEL_559_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-559-access-office",
          heading: "Referencia administrativa a oficinas",
          text: "La ficha administrativa menciona tanto la vía telemática como oficinas de la AEAT y describe la presentación telemática o manual; esta ficha informativa no convierte esa referencia en un canal automatizado.",
          sourceIds: [MODEL_559_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_559_PROCEDURE_HOME_SOURCE,
    MODEL_559_PROCEDURE_RECORD_SOURCE,
    MODEL_559_DOWNLOAD_SOURCE,
    MODEL_559_FORM_SOURCE,
    MODEL_559_INSTRUCTIONS_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
    AEAT_ELECTRONIC_SEAT_2009_SOURCE,
  ],
  documents: [
    {
      id: "model-559-form-document",
      kind: "FORM",
      title: "Formulario oficial del Modelo 559",
      sourceId: MODEL_559_FORM_SOURCE.id,
      landingPageSourceId: MODEL_559_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "mod559.pdf",
      byteLength: 168554,
      pageCount: 3,
      sha256:
        "5a87c9d4f3f7309b2b019eb82d604861f7dad2867f685bbdda0e5167d505962b",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-559-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 559",
      sourceId: MODEL_559_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_559_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "instr559.pdf",
      byteLength: 93221,
      pageCount: 2,
      sha256:
        "e8ed2ed29d03c34c7f25d62735156389f9548adfcfe76cc8fb14a465d6bf8633",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-559-link-procedure",
      label: "Página oficial del Modelo 559",
      sourceId: MODEL_559_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_559_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-link-download",
      label: "Descarga oficial del Modelo 559",
      sourceId: MODEL_559_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-link-order",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-559-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 559?",
      answer:
        "El modelo relativo al impuesto sobre el alcohol y bebidas derivadas para los regímenes de destilación artesanal y de cosechero.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-faq-regimes",
      question: "¿Qué regímenes menciona expresamente su título oficial?",
      answer: "Los de destilación artesanal y de cosechero.",
      sourceIds: [MODEL_559_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-faq-official-page",
      question: "¿Existe una página oficial específica para este modelo?",
      answer:
        "Sí. La AEAT mantiene una página de gestiones y una ficha administrativa específicas para el Modelo 559.",
      sourceIds: [
        MODEL_559_PROCEDURE_HOME_SOURCE.id,
        MODEL_559_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-faq-downloads",
      question: "¿Hay formulario e instrucciones descargables?",
      answer:
        "Sí. La página oficial de descarga enlaza ambos PDF; se conservan aquí únicamente como descargas externas oficiales.",
      sourceIds: [
        MODEL_559_DOWNLOAD_SOURCE.id,
        MODEL_559_FORM_SOURCE.id,
        MODEL_559_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-faq-electronic-channel",
      question: "¿La AEAT ofrece una gestión electrónica del Modelo 559?",
      answer: "Sí. La página oficial incluye una gestión electrónica del modelo.",
      sourceIds: [MODEL_559_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-faq-office-channel",
      question: "¿La ficha administrativa menciona una vía no telemática?",
      answer:
        "Sí. La ficha menciona oficinas de la AEAT y una presentación telemática o manual; esta página no interpreta esa mención como un trámite automático.",
      sourceIds: [MODEL_559_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-559-faq-legal-framework",
      question: "¿Qué fuentes normativas principales conserva esta ficha?",
      answer:
        "La Ley 38/1992, el Reglamento de los Impuestos Especiales y la Orden EHA/3482/2007, junto con la resolución sobre la Sede electrónica de la AEAT.",
      sourceIds: [
        EXCISE_LAW_SOURCE.id,
        EXCISE_REGULATION_SOURCE.id,
        ORDER_EHA_3482_2007_SOURCE.id,
        AEAT_ELECTRONIC_SEAT_2009_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_559_PROCEDURE_HOME_SOURCE.id,
      MODEL_559_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_560_CONTENT = defineModel({
  code: "560",
  canonicalName: "II. EE. Impuesto sobre la electricidad.",
  summary:
    "La AEAT identifica el Modelo 560 con el impuesto sobre la electricidad y documenta la cumplimentación en línea y, dentro de ella, la importación de un fichero auxiliar de desglose.",
  searchTerms: [
    "modelo 560",
    "impuesto sobre la electricidad",
    "impuestos especiales",
    "electricidad",
    "presentación telemática",
    "importación de fichero",
    "diseño de registro",
    "modelo 560 2025",
  ],
  sections: [
    {
      id: "model-560-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-560-purpose-identity",
          heading: "Impuesto sobre la electricidad",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 560 con el impuesto sobre la electricidad.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_560_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-560-purpose-information",
          heading: "Información temática oficial",
          text: "La AEAT publica además una página de información general dedicada al impuesto sobre la electricidad.",
          sourceIds: [MODEL_560_GENERAL_INFORMATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-560-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-560-access-browser",
          heading: "Cumplimentación en línea",
          text: "La página oficial ofrece la tramitación telemática del Modelo 560.",
          sourceIds: [MODEL_560_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-560-access-file",
          heading: "Fichero auxiliar de desglose",
          text: "La AEAT documenta la importación de un fichero auxiliar de desglose de cuotas y cantidades dentro de la autoliquidación; no se presenta aquí como un canal alternativo de presentación.",
          sourceIds: [
            MODEL_560_IMPORT_INFORMATION_SOURCE.id,
            MODEL_560_IMPORT_GUIDE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-560-details",
      title: "Versiones y fuentes registradas",
      kind: "DETAILS",
      items: [
        {
          id: "model-560-details-guide-status",
          heading: "Guía 2025 con estado conservador",
          text: "La guía de importación enlazada por la AEAT se titula como versión 2025 e incluye la indicación «Borrador V1.0»; por ello se registra con vigencia no determinada y sin miniatura.",
          sourceIds: [MODEL_560_IMPORT_GUIDE_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-560-details-old-assets",
          heading: "Activos anteriores no utilizados",
          text: "Esta ficha no incorpora como documentación vigente los diseños que la página oficial limita expresamente a periodos hasta el 31 de diciembre de 2024.",
          sourceIds: [MODEL_560_IMPORT_INFORMATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-560-details-orders",
          heading: "Órdenes específicas registradas",
          text: "Se conservan como fuentes primarias la Orden HAC/172/2021, que aprueba el Modelo 560, y la Orden HAC/1433/2024, que lo modifica.",
          sourceIds: [
            ORDER_HAC_172_2021_SOURCE.id,
            ORDER_HAC_1433_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-560-details-framework",
          heading: "Marco general y presentación electrónica",
          text: "La ficha enlaza las versiones consolidadas informativas del BOE de la Ley 38/1992 y del Reglamento de los Impuestos Especiales, junto con la publicación oficial de la Orden HAP/2194/2013 sobre presentación electrónica.",
          sourceIds: [
            EXCISE_LAW_SOURCE.id,
            EXCISE_REGULATION_SOURCE.id,
            ORDER_HAP_2194_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_560_PROCEDURE_HOME_SOURCE,
    MODEL_560_PROCEDURE_RECORD_SOURCE,
    MODEL_560_GENERAL_INFORMATION_SOURCE,
    MODEL_560_IMPORT_INFORMATION_SOURCE,
    MODEL_560_IMPORT_GUIDE_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_HAC_172_2021_SOURCE,
    ORDER_HAC_1433_2024_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-560-import-guide-document",
      kind: "GUIDE",
      title: "Ayuda para importar fichero del Modelo 560 · versión 2025",
      sourceId: MODEL_560_IMPORT_GUIDE_SOURCE.id,
      landingPageSourceId: MODEL_560_IMPORT_INFORMATION_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Ayuda_ImpFich2025.pdf",
      byteLength: 1073986,
      pageCount: 9,
      sha256:
        "34b299acc3d403d4fc6b5d94c7973e44d28655db28949e92cb2b984eb0e969b7",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-560-link-procedure",
      label: "Página oficial del Modelo 560",
      sourceId: MODEL_560_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_560_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-link-information",
      label: "Información general del impuesto sobre la electricidad",
      sourceId: MODEL_560_GENERAL_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-link-import",
      label: "Diseños de registro e importación del Modelo 560",
      sourceId: MODEL_560_IMPORT_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-link-order-2021",
      label: "Orden HAC/172/2021",
      sourceId: ORDER_HAC_172_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-link-order-2024",
      label: "Orden HAC/1433/2024",
      sourceId: ORDER_HAC_1433_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-560-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 560?",
      answer: "El modelo del impuesto sobre la electricidad.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-general-information",
      question: "¿Dónde publica la AEAT información general sobre este impuesto?",
      answer:
        "En una página temática oficial dedicada al impuesto sobre la electricidad.",
      sourceIds: [MODEL_560_GENERAL_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-browser",
      question: "¿Existe cumplimentación en línea del Modelo 560?",
      answer: "Sí. La página oficial describe una tramitación telemática.",
      sourceIds: [MODEL_560_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-file",
      question: "¿Para qué sirve el fichero que documenta la AEAT?",
      answer:
        "Es un fichero auxiliar de desglose de cuotas y cantidades que se importa dentro de la autoliquidación, no un canal alternativo de presentación.",
      sourceIds: [
        MODEL_560_IMPORT_INFORMATION_SOURCE.id,
        MODEL_560_IMPORT_GUIDE_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-guide-status",
      question: "¿Por qué la guía 2025 no se presenta como diseño definitivamente vigente?",
      answer:
        "Porque el propio PDF enlazado por la AEAT muestra la indicación «Borrador V1.0»; esta ficha conserva por ello su vigencia como no determinada.",
      sourceIds: [MODEL_560_IMPORT_GUIDE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-old-designs",
      question: "¿Se usan aquí los diseños limitados a periodos hasta 2024?",
      answer:
        "No. La página oficial los separa como aplicables hasta el 31 de diciembre de 2024 y esta ficha no los presenta como documentación vigente.",
      sourceIds: [MODEL_560_IMPORT_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-approval-order",
      question: "¿Qué orden aprueba el Modelo 560 registrado en esta ficha?",
      answer: "La Orden HAC/172/2021, de 25 de febrero.",
      sourceIds: [ORDER_HAC_172_2021_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-modification-order",
      question: "¿Qué modificación normativa posterior se conserva?",
      answer: "La publicada mediante la Orden HAC/1433/2024.",
      sourceIds: [ORDER_HAC_1433_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-560-faq-framework",
      question: "¿Qué marco general acompaña a las órdenes específicas?",
      answer:
        "Las versiones consolidadas informativas del BOE de la Ley 38/1992 y del Reglamento de los Impuestos Especiales, junto con la publicación oficial de la Orden HAP/2194/2013 sobre presentación electrónica.",
      sourceIds: [
        EXCISE_LAW_SOURCE.id,
        EXCISE_REGULATION_SOURCE.id,
        ORDER_HAP_2194_2013_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [MODEL_560_PROCEDURE_HOME_SOURCE.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_561_CONTENT = defineModel({
  code: "561",
  canonicalName: "II. EE. Impuesto sobre la cerveza.",
  summary:
    "La AEAT identifica el Modelo 561 con el impuesto sobre la cerveza y mantiene para él una página de tramitación electrónica y una ficha administrativa.",
  searchTerms: [
    "modelo 561",
    "impuesto sobre la cerveza",
    "cerveza",
    "impuestos especiales",
    "impuestos especiales de fabricación",
    "presentación telemática",
    "Orden EHA 3482 2007",
    "Orden HAP 71 2013",
  ],
  sections: [
    {
      id: "model-561-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-561-purpose-identity",
          heading: "Impuesto sobre la cerveza",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 561 con el impuesto sobre la cerveza.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_561_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-561-purpose-record",
          heading: "Ficha administrativa propia",
          text: "La AEAT mantiene una ficha administrativa específica para este procedimiento.",
          sourceIds: [MODEL_561_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-561-details",
      title: "Marco oficial registrado",
      kind: "DETAILS",
      items: [
        {
          id: "model-561-details-framework",
          heading: "Ley y Reglamento de Impuestos Especiales",
          text: "La ficha enlaza, con carácter informativo, las versiones consolidadas que el BOE ofrece de la Ley 38/1992 y del Reglamento aprobado por el Real Decreto 1165/1995.",
          sourceIds: [EXCISE_LAW_SOURCE.id, EXCISE_REGULATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-561-details-orders",
          heading: "Órdenes de gestión conservadas",
          text: "También se conservan la Orden EHA/3482/2007 y la Orden HAP/71/2013 como fuentes primarias relacionadas con la gestión del modelo.",
          sourceIds: [
            ORDER_EHA_3482_2007_SOURCE.id,
            ORDER_HAP_71_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-561-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-561-access-browser",
          heading: "Presentación telemática",
          text: "La página y la ficha del procedimiento describen la presentación telemática del Modelo 561.",
          sourceIds: [
            MODEL_561_PROCEDURE_HOME_SOURCE.id,
            MODEL_561_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_561_PROCEDURE_HOME_SOURCE,
    MODEL_561_PROCEDURE_RECORD_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
    ORDER_HAP_71_2013_SOURCE,
  ],
  documents: [],
  links: [
    {
      id: "model-561-link-procedure",
      label: "Página oficial del Modelo 561",
      sourceId: MODEL_561_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_561_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-link-order-2013",
      label: "Orden HAP/71/2013",
      sourceId: ORDER_HAP_71_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-561-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 561?",
      answer: "El modelo del impuesto sobre la cerveza.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-faq-page",
      question: "¿Existe una página oficial específica del Modelo 561?",
      answer:
        "Sí. La AEAT publica una página de gestiones y una ficha administrativa específicas.",
      sourceIds: [
        MODEL_561_PROCEDURE_HOME_SOURCE.id,
        MODEL_561_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-faq-channel",
      question: "¿Qué canal describe la AEAT?",
      answer: "La presentación telemática del Modelo 561.",
      sourceIds: [MODEL_561_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-faq-law",
      question: "¿Qué ley general se conserva como fuente?",
      answer: "La Ley 38/1992, de 28 de diciembre, de Impuestos Especiales.",
      sourceIds: [EXCISE_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-faq-regulation",
      question: "¿Qué reglamento general se conserva?",
      answer:
        "El Reglamento de los Impuestos Especiales aprobado por el Real Decreto 1165/1995.",
      sourceIds: [EXCISE_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-faq-order-2007",
      question: "¿Qué orden de 2007 figura entre las fuentes?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [ORDER_EHA_3482_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-561-faq-order-2013",
      question: "¿Qué actualización de gestión de 2013 se registra?",
      answer: "La Orden HAP/71/2013, de 30 de enero.",
      sourceIds: [ORDER_HAP_71_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_561_PROCEDURE_HOME_SOURCE.id,
      MODEL_561_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_562_CONTENT = defineModel({
  code: "562",
  canonicalName: "II. EE. Impuesto sobre productos intermedios.",
  summary:
    "La AEAT identifica el Modelo 562 con el impuesto sobre productos intermedios y mantiene para él una página de tramitación electrónica y una ficha administrativa.",
  searchTerms: [
    "modelo 562",
    "impuesto sobre productos intermedios",
    "productos intermedios",
    "impuestos especiales",
    "impuestos especiales de fabricación",
    "presentación telemática",
    "Orden EHA 3482 2007",
    "Orden HAP 71 2013",
  ],
  sections: [
    {
      id: "model-562-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-562-purpose-identity",
          heading: "Impuesto sobre productos intermedios",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 562 con el impuesto sobre productos intermedios.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_562_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-562-purpose-record",
          heading: "Ficha administrativa propia",
          text: "La AEAT mantiene una ficha administrativa específica para este procedimiento.",
          sourceIds: [MODEL_562_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-562-details",
      title: "Marco oficial registrado",
      kind: "DETAILS",
      items: [
        {
          id: "model-562-details-framework",
          heading: "Ley y Reglamento de Impuestos Especiales",
          text: "La ficha enlaza, con carácter informativo, las versiones consolidadas que el BOE ofrece de la Ley 38/1992 y del Reglamento aprobado por el Real Decreto 1165/1995.",
          sourceIds: [EXCISE_LAW_SOURCE.id, EXCISE_REGULATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-562-details-orders",
          heading: "Órdenes de gestión conservadas",
          text: "También se conservan la Orden EHA/3482/2007 y la Orden HAP/71/2013 como fuentes primarias relacionadas con la gestión del modelo.",
          sourceIds: [
            ORDER_EHA_3482_2007_SOURCE.id,
            ORDER_HAP_71_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-562-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-562-access-browser",
          heading: "Presentación telemática",
          text: "La página y la ficha del procedimiento describen la presentación telemática del Modelo 562.",
          sourceIds: [
            MODEL_562_PROCEDURE_HOME_SOURCE.id,
            MODEL_562_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_562_PROCEDURE_HOME_SOURCE,
    MODEL_562_PROCEDURE_RECORD_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
    ORDER_HAP_71_2013_SOURCE,
  ],
  documents: [],
  links: [
    {
      id: "model-562-link-procedure",
      label: "Página oficial del Modelo 562",
      sourceId: MODEL_562_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_562_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-link-order-2013",
      label: "Orden HAP/71/2013",
      sourceId: ORDER_HAP_71_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-562-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 562?",
      answer: "El modelo del impuesto sobre productos intermedios.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-faq-page",
      question: "¿Existe una página oficial específica del Modelo 562?",
      answer:
        "Sí. La AEAT publica una página de gestiones y una ficha administrativa específicas.",
      sourceIds: [
        MODEL_562_PROCEDURE_HOME_SOURCE.id,
        MODEL_562_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-faq-channel",
      question: "¿Qué canal describe la AEAT?",
      answer: "La presentación telemática del Modelo 562.",
      sourceIds: [MODEL_562_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-faq-law",
      question: "¿Qué ley general se conserva como fuente?",
      answer: "La Ley 38/1992, de 28 de diciembre, de Impuestos Especiales.",
      sourceIds: [EXCISE_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-faq-regulation",
      question: "¿Qué reglamento general se conserva?",
      answer:
        "El Reglamento de los Impuestos Especiales aprobado por el Real Decreto 1165/1995.",
      sourceIds: [EXCISE_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-faq-order-2007",
      question: "¿Qué orden de 2007 figura entre las fuentes?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [ORDER_EHA_3482_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-562-faq-order-2013",
      question: "¿Qué actualización de gestión de 2013 se registra?",
      answer: "La Orden HAP/71/2013, de 30 de enero.",
      sourceIds: [ORDER_HAP_71_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_562_PROCEDURE_HOME_SOURCE.id,
      MODEL_562_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_563_CONTENT = defineModel({
  code: "563",
  canonicalName: "II. EE. Impuesto sobre el alcohol y bebidas derivadas",
  summary:
    "La AEAT identifica el Modelo 563 con el impuesto sobre el alcohol y bebidas derivadas y mantiene para él una página de tramitación electrónica y una ficha administrativa.",
  searchTerms: [
    "modelo 563",
    "impuesto sobre el alcohol",
    "bebidas derivadas",
    "alcohol",
    "impuestos especiales",
    "impuestos especiales de fabricación",
    "presentación telemática",
    "Orden HAP 71 2013",
  ],
  sections: [
    {
      id: "model-563-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-563-purpose-identity",
          heading: "Impuesto sobre el alcohol y bebidas derivadas",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 563 con el impuesto sobre el alcohol y bebidas derivadas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_563_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-563-purpose-record",
          heading: "Ficha administrativa propia",
          text: "La AEAT mantiene una ficha administrativa específica para este procedimiento.",
          sourceIds: [MODEL_563_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-563-details",
      title: "Marco oficial registrado",
      kind: "DETAILS",
      items: [
        {
          id: "model-563-details-framework",
          heading: "Ley y Reglamento de Impuestos Especiales",
          text: "La ficha enlaza, con carácter informativo, las versiones consolidadas que el BOE ofrece de la Ley 38/1992 y del Reglamento aprobado por el Real Decreto 1165/1995.",
          sourceIds: [EXCISE_LAW_SOURCE.id, EXCISE_REGULATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-563-details-orders",
          heading: "Órdenes de gestión conservadas",
          text: "También se conservan la Orden EHA/3482/2007 y la Orden HAP/71/2013 como fuentes primarias relacionadas con la gestión del modelo, usando siempre sus títulos BOE correctos.",
          sourceIds: [
            ORDER_EHA_3482_2007_SOURCE.id,
            ORDER_HAP_71_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-563-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-563-access-browser",
          heading: "Presentación telemática",
          text: "La página y la ficha del procedimiento describen la presentación telemática del Modelo 563.",
          sourceIds: [
            MODEL_563_PROCEDURE_HOME_SOURCE.id,
            MODEL_563_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_563_PROCEDURE_HOME_SOURCE,
    MODEL_563_PROCEDURE_RECORD_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
    ORDER_HAP_71_2013_SOURCE,
  ],
  documents: [],
  links: [
    {
      id: "model-563-link-procedure",
      label: "Página oficial del Modelo 563",
      sourceId: MODEL_563_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_563_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-link-order-2013",
      label: "Orden HAP/71/2013",
      sourceId: ORDER_HAP_71_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-563-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 563?",
      answer: "El modelo del impuesto sobre el alcohol y bebidas derivadas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-faq-page",
      question: "¿Existe una página oficial específica del Modelo 563?",
      answer:
        "Sí. La AEAT publica una página de gestiones y una ficha administrativa específicas.",
      sourceIds: [
        MODEL_563_PROCEDURE_HOME_SOURCE.id,
        MODEL_563_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-faq-channel",
      question: "¿Qué canal describe la AEAT?",
      answer: "La presentación telemática del Modelo 563.",
      sourceIds: [MODEL_563_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-faq-law",
      question: "¿Qué ley general se conserva como fuente?",
      answer: "La Ley 38/1992, de 28 de diciembre, de Impuestos Especiales.",
      sourceIds: [EXCISE_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-faq-regulation",
      question: "¿Qué reglamento general se conserva?",
      answer:
        "El Reglamento de los Impuestos Especiales aprobado por el Real Decreto 1165/1995.",
      sourceIds: [EXCISE_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-faq-order-2007",
      question: "¿Qué orden de 2007 figura entre las fuentes?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [ORDER_EHA_3482_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-563-faq-order-2013",
      question: "¿Qué actualización de gestión de 2013 se registra?",
      answer: "La Orden HAP/71/2013, de 30 de enero.",
      sourceIds: [ORDER_HAP_71_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_563_PROCEDURE_HOME_SOURCE.id,
      MODEL_563_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

export const PUBLIC_AEAT_BATCH_16_EXCISE_TOBACCO_ENVIRONMENT_559_563_CONTENT_V1 =
  deepFreeze([
    MODEL_559_CONTENT,
    MODEL_560_CONTENT,
    MODEL_561_CONTENT,
    MODEL_562_CONTENT,
    MODEL_563_CONTENT,
  ] as const);
