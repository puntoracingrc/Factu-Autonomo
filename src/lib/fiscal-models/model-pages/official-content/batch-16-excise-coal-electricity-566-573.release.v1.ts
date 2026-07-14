import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_16_EXCISE_COAL_ELECTRICITY_566_573_RELEASE_ID_V1 =
  "public-aeat-official-batch-16-excise-coal-electricity-566-573.2026-07-14.v1" as const;

export type PublicAeatBatch16ExciseCoalElectricity566573CodeV1 =
  | "566"
  | "568"
  | "571"
  | "572"
  | "573";

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
      PUBLIC_AEAT_BATCH_16_EXCISE_COAL_ELECTRICITY_566_573_RELEASE_ID_V1,
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

const ORDER_EHA_3496_2009_SOURCE = defineSource({
  id: "boe.order-eha-3496-2009.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3496/2009, de 17 de diciembre",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2009-21048",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a425f90ad2c2b46ce3aa8698c0149b23fe7d1b049c811988b1773af9d5b4665b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_571_RESOLUTION_1996_SOURCE = defineSource({
  id: "boe.model-571-resolution-1996.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 9 de julio de 1996 sobre autorizaciones de aplicación de beneficios de devolución",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-1996-16858",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1d927610a2e0f5e793a083e273a6e790e945d9b0325b79bdb83e1319c69adced",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_571_RESOLUTION_2005_SOURCE = defineSource({
  id: "boe.model-571-resolution-2005.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 10 de junio de 2005 que modifica la Resolución de 9 de julio de 1996",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2005-10951",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ac7c003fd451b7f4a1cd70f6b46a7f95db2d5847e56fc9ff5262bc4916d8618b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_86_2025_SOURCE = defineSource({
  id: "boe.order-hac-86-2025.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/86/2025, de 13 de enero",
  canonicalUrl:
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-1732",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "168ff97c8b439b16411fc0b60a03df493eeef38806cecbea7da8d0a3a2b8b1a2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_566_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-566.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 566 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI07.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "44263aa569a1752d435c75554f5a1302daeb221a6ba7551396818833838c1dfd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_566_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-566.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 566 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI07.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d20be3af20469a585997f929e7132cd1ebc36af7ca67532a3fd36e26fb705878",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-568.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 568 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G501.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ae5e21ca1ef17588c32d8a38e17895f7d15be8c2c551f42665a0baa38cd3edab",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-568.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 568 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G501.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ded0b703939570e03fbbdfcc7bb6c3c3fd02a7cb842ab6948595179ea00e95e1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_INFORMATION_SOURCE = defineSource({
  id: "aeat.model-568.information.2026-03-03",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 568 · información oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-568.html",
  officialUpdatedOn: "2026-03-03",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "852b4869acb572146730f7aa1c373e20a7f66411927076bcb1db37aa8b61c6ed",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_BATCH_HELP_SOURCE = defineSource({
  id: "aeat.model-568.batch-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 568 · presentación por lotes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-568-impue_____nvio-medios-transporte-territorio_/novedad-presentacion-lotes-modelo-568.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "49ff021361ede415aae6c48be55f0d4d22da1eb0e9f6ffaf7a9c721a11745dfe",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-568.download.2026-03-10",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Descarga del Modelo 568",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-matriculacion/modelo-568-impue_____nvio-medios-transporte-territorio_/descarga-modelo.html",
  officialUpdatedOn: "2026-03-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "89ed630a7e4216b4916ff42a4e1643729351d8397783b478fcbc87f651e3d8aa",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_INFORMATION_NOTE_SOURCE = defineSource({
  id: "aeat.model-568.information-note.2026-07-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 568 · nota informativa",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-568-impue_____nvio-medios-transporte-territorio_/nota-informativa.html",
  officialUpdatedOn: "2026-07-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "76d37418d36b22e8e18daf44e9f1d25b8cabb924114a27e67632f19f3ca85af5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_FORM_SOURCE = defineSource({
  id: "aeat.model-568.form-pdf.2022-06-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formulario oficial del Modelo 568",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G501/mod568.pdf",
  officialUpdatedOn: "2022-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "38600a9844ab6cd491002d1e4144453576d792b3acc77766725abb9a58160c4a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_568_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-568.instructions-pdf.2022-06-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones oficiales del Modelo 568",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G501/instr_568e.pdf",
  officialUpdatedOn: "2022-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "27a04adda9e18a7108e93a8722c5f391053ce6d02090e6188cd19465fecedd59",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_571_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-571.procedure-home.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 571 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DN02.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e4d89908a9b7c93b10d1191981b1c092caecc6e6b702d8f595acd1670793fd4c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_571_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-571.procedure-record.2026-03-25",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 571 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DN02.shtml",
  officialUpdatedOn: "2026-03-25",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "994bac2ab56cc003c40910fe90b7b6966a5886e40f8ebf0655b9d7519d7a8bcc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_572_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-572.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 572 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ07.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "de3fd418d266e032637439916d0cfecbb9ff2fa02846e20faaab83fae57b3ff6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_572_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-572.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 572 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DJ07.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1818feed6eb048babb8c4d08c735b3db5cd4312d6c2db2079c555c74fef9c0c9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_572_INFORMATION_SOURCE = defineSource({
  id: "aeat.model-572.information.2026-03-27",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 572 · información oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuestos-especiales-fabricacion/hidrocarburos/modelo-572.html",
  officialUpdatedOn: "2026-03-27",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d4c402d489db625583a46b4aa34beab8f78c1ab637697c6227f5f1d2e0e32b03",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_572_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-572.download.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Descarga del Modelo 572",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-devoluciones/modelo-572-iiee______ud-devolucion-impuesto-hidrocarburos_/descarga-modelo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0bd67fcd3d54202dd290db75a373dc94b0c3d14d7d03fb3262b0cdd6b8cee27",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_572_FORM_SOURCE = defineSource({
  id: "aeat.model-572.form-pdf.2022-06-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formulario e instrucciones oficiales del Modelo 572",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ07/572.pdf",
  officialUpdatedOn: "2022-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e4a504afba3c6e907a59671842c1dc5ad6f1bb3aa8c23c0744377cfcf5526196",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_573_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-573.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 573 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "29f68c8480edc78f4025ca23502e718e0bf1c225489f0f49fcffe9744c5e0af0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_573_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-573.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 573 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "30c4d7228c89cc7f3bf203a2fd1fdbb7dc36fef2127f0a22b61d5538ad1546fa",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_573_FAQ_SOURCE = defineSource({
  id: "aeat.model-573.faq.2026-03-27",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuestos-especiales-fabricacion/liquidos-cigarrillos-electronicos-otros-productos-tabaco/preguntas-frecuentes.html",
  officialUpdatedOn: "2026-03-27",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9f7933735b224f4fd3978cc44ed2d9f9f6bb9a6a5a12a41ac22381daf3ebb748",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_573_BROCHURE_SOURCE = defineSource({
  id: "aeat.model-573.subject-brochure.2025-04-08",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Folleto oficial sobre cigarrillos electrónicos y otros productos relacionados con el tabaco",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/Folletos/Folleto_ciga_elec_v8A2.pdf",
  officialUpdatedOn: "2025-04-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b314ac796738c331c4eb7a6fc405a5f4248a53b249d51f76e684a84f6cfa81ba",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_566_CONTENT = defineModel({
  code: "566",
  canonicalName: "II. EE. Impuesto sobre las labores del tabaco.",
  summary:
    "La AEAT identifica el Modelo 566 con el impuesto sobre las labores del tabaco y mantiene para él una página de tramitación electrónica y una ficha administrativa.",
  searchTerms: [
    "modelo 566",
    "impuesto sobre las labores del tabaco",
    "labores del tabaco",
    "tabaco",
    "impuestos especiales",
    "impuestos especiales de fabricación",
    "presentación telemática",
    "Orden HAP 71 2013",
  ],
  sections: [
    {
      id: "model-566-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-566-purpose-identity",
          heading: "Impuesto sobre las labores del tabaco",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 566 con el impuesto sobre las labores del tabaco.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_566_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-566-purpose-record",
          heading: "Ficha administrativa propia",
          text: "La AEAT mantiene una ficha administrativa específica para este procedimiento.",
          sourceIds: [MODEL_566_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-566-details",
      title: "Marco oficial registrado",
      kind: "DETAILS",
      items: [
        {
          id: "model-566-details-framework",
          heading: "Ley y Reglamento de Impuestos Especiales",
          text: "La ficha enlaza, con carácter informativo, las versiones consolidadas que el BOE ofrece de la Ley 38/1992 y del Reglamento aprobado por el Real Decreto 1165/1995.",
          sourceIds: [EXCISE_LAW_SOURCE.id, EXCISE_REGULATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-566-details-orders",
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
      id: "model-566-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-566-access-browser",
          heading: "Presentación telemática",
          text: "La página y la ficha del procedimiento describen la presentación telemática del Modelo 566.",
          sourceIds: [
            MODEL_566_PROCEDURE_HOME_SOURCE.id,
            MODEL_566_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_566_PROCEDURE_HOME_SOURCE,
    MODEL_566_PROCEDURE_RECORD_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
    ORDER_HAP_71_2013_SOURCE,
  ],
  documents: [],
  links: [
    {
      id: "model-566-link-procedure",
      label: "Página oficial del Modelo 566",
      sourceId: MODEL_566_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_566_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-link-order-2007",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-link-order-2013",
      label: "Orden HAP/71/2013",
      sourceId: ORDER_HAP_71_2013_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-566-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 566?",
      answer: "El modelo del impuesto sobre las labores del tabaco.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-faq-page",
      question: "¿Existe una página oficial específica del Modelo 566?",
      answer:
        "Sí. La AEAT publica una página de gestiones y una ficha administrativa específicas.",
      sourceIds: [
        MODEL_566_PROCEDURE_HOME_SOURCE.id,
        MODEL_566_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-faq-channel",
      question: "¿Qué canal describe la AEAT?",
      answer: "La presentación telemática del Modelo 566.",
      sourceIds: [MODEL_566_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-faq-law",
      question: "¿Qué ley general se conserva como fuente?",
      answer: "La Ley 38/1992, de 28 de diciembre, de Impuestos Especiales.",
      sourceIds: [EXCISE_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-faq-regulation",
      question: "¿Qué reglamento general se conserva?",
      answer:
        "El Reglamento de los Impuestos Especiales aprobado por el Real Decreto 1165/1995.",
      sourceIds: [EXCISE_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-faq-order-2007",
      question: "¿Qué orden de 2007 figura entre las fuentes?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [ORDER_EHA_3482_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-566-faq-order-2013",
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
      MODEL_566_PROCEDURE_HOME_SOURCE.id,
      MODEL_566_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

// The procedure record linked Nota_mod_568.pdf, but that URL returned HTTP 404
// on REVIEWED_ON. It is intentionally absent from this verified release.
const MODEL_568_CONTENT = defineModel({
  code: "568",
  canonicalName:
    "Impuesto Especial sobre Determinados Medios de Transporte. Solicitud de devolución por reventa y envío de medios de transporte fuera del territorio.",
  summary:
    "La AEAT identifica el Modelo 568 con la solicitud de devolución por reventa y envío de medios de transporte fuera del territorio y ofrece presentación individual y por lotes.",
  searchTerms: [
    "modelo 568",
    "impuesto especial sobre determinados medios de transporte",
    "medios de transporte",
    "solicitud de devolución",
    "reventa",
    "envío fuera del territorio",
    "presentación por lotes",
    "importación de fichero",
  ],
  sections: [
    {
      id: "model-568-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-568-purpose-identity",
          heading: "Solicitud de devolución",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 568 con la solicitud de devolución por reventa y envío de medios de transporte fuera del territorio.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_568_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-568-purpose-information",
          heading: "Página informativa temática",
          text: "La AEAT publica una página informativa específica del Modelo 568 dentro del área de vehículos y embarcaciones.",
          sourceIds: [MODEL_568_INFORMATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-568-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-568-access-browser",
          heading: "Presentación individual",
          text: "La página oficial ofrece una gestión de presentación del Modelo 568.",
          sourceIds: [MODEL_568_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-568-access-batches",
          heading: "Presentación por lotes",
          text: "La AEAT ofrece además una presentación por lotes y su ayuda vigente describe la selección de un único fichero que contiene todas las solicitudes.",
          sourceIds: [
            MODEL_568_PROCEDURE_HOME_SOURCE.id,
            MODEL_568_BATCH_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-568-details",
      title: "Documentación y contexto",
      kind: "DETAILS",
      items: [
        {
          id: "model-568-details-downloads",
          heading: "Formulario e instrucciones",
          text: "La página de descarga de la AEAT enlaza un formulario y un documento de instrucciones del Modelo 568.",
          sourceIds: [MODEL_568_DOWNLOAD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-568-details-note",
          heading: "Nota informativa de contexto histórico",
          text: "La nota oficial conserva una referencia a la presentación por lotes «desde el 1 de julio de 2010»; se registra como contexto y no como novedad normativa actual.",
          sourceIds: [MODEL_568_INFORMATION_NOTE_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-568-details-order",
          heading: "Orden de aprobación",
          text: "La Orden EHA/3496/2009 aprueba el Modelo 568 y regula su presentación telemática por Internet.",
          sourceIds: [ORDER_EHA_3496_2009_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-568-details-framework",
          heading: "Marco general registrado",
          text: "La ficha conserva además la versión consolidada informativa del BOE de la Ley 38/1992 y la publicación oficial de la Orden HAP/2194/2013.",
          sourceIds: [EXCISE_LAW_SOURCE.id, ORDER_HAP_2194_2013_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_568_PROCEDURE_HOME_SOURCE,
    MODEL_568_PROCEDURE_RECORD_SOURCE,
    MODEL_568_INFORMATION_SOURCE,
    MODEL_568_BATCH_HELP_SOURCE,
    MODEL_568_DOWNLOAD_SOURCE,
    MODEL_568_INFORMATION_NOTE_SOURCE,
    MODEL_568_FORM_SOURCE,
    MODEL_568_INSTRUCTIONS_SOURCE,
    EXCISE_LAW_SOURCE,
    ORDER_EHA_3496_2009_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-568-form-document",
      kind: "FORM",
      title: "Formulario oficial del Modelo 568",
      sourceId: MODEL_568_FORM_SOURCE.id,
      landingPageSourceId: MODEL_568_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "mod568.pdf",
      byteLength: 314684,
      pageCount: 2,
      sha256:
        "38600a9844ab6cd491002d1e4144453576d792b3acc77766725abb9a58160c4a",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-568-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 568",
      sourceId: MODEL_568_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_568_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "instr_568e.pdf",
      byteLength: 28169,
      pageCount: 1,
      sha256:
        "27a04adda9e18a7108e93a8722c5f391053ce6d02090e6188cd19465fecedd59",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-568-link-procedure",
      label: "Página oficial del Modelo 568",
      sourceId: MODEL_568_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_568_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-link-information",
      label: "Información oficial del Modelo 568",
      sourceId: MODEL_568_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-link-batches",
      label: "Ayuda oficial para la presentación por lotes",
      sourceId: MODEL_568_BATCH_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-link-download",
      label: "Descarga oficial del Modelo 568",
      sourceId: MODEL_568_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-link-order",
      label: "Orden EHA/3496/2009",
      sourceId: ORDER_EHA_3496_2009_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-568-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 568?",
      answer:
        "La solicitud de devolución del Impuesto Especial sobre Determinados Medios de Transporte por reventa y envío de medios de transporte fuera del territorio.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-information",
      question: "¿Hay una página temática oficial del Modelo 568?",
      answer:
        "Sí. La AEAT publica una página específica dentro del área de vehículos y embarcaciones.",
      sourceIds: [MODEL_568_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-browser",
      question: "¿Existe presentación individual en línea?",
      answer: "Sí. La página oficial ofrece una gestión de presentación.",
      sourceIds: [MODEL_568_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-batches",
      question: "¿Existe presentación por lotes?",
      answer:
        "Sí. La página oficial la ofrece como gestión diferenciada y enlaza una ayuda específica.",
      sourceIds: [
        MODEL_568_PROCEDURE_HOME_SOURCE.id,
        MODEL_568_BATCH_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-files",
      question: "¿Qué describe la ayuda de presentación por lotes?",
      answer:
        "Describe la selección de un único fichero que contiene todas las solicitudes del lote, por lo que esta ficha registra también el canal de carga de archivos.",
      sourceIds: [MODEL_568_BATCH_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-downloads",
      question: "¿Hay formulario e instrucciones descargables?",
      answer:
        "Sí. La página oficial de descarga enlaza ambos PDF; se conservan como descargas externas con referencias heredadas detectadas.",
      sourceIds: [
        MODEL_568_DOWNLOAD_SOURCE.id,
        MODEL_568_FORM_SOURCE.id,
        MODEL_568_INSTRUCTIONS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-note",
      question: "¿La nota de lotes anuncia una novedad de 2026?",
      answer:
        "No se usa con ese sentido: su texto sitúa la presentación por lotes desde el 1 de julio de 2010, por lo que se conserva solo como contexto histórico.",
      sourceIds: [MODEL_568_INFORMATION_NOTE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-568-faq-order",
      question: "¿Qué orden aprueba el Modelo 568?",
      answer: "La Orden EHA/3496/2009, de 17 de diciembre.",
      sourceIds: [ORDER_EHA_3496_2009_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_568_PROCEDURE_HOME_SOURCE.id,
      MODEL_568_BATCH_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_571_CONTENT = defineModel({
  code: "571",
  canonicalName:
    "II. EE. Modelo 571. Aplicación del beneficio devolución de los impuestos especiales hidrocarburos.",
  summary:
    "La AEAT identifica el Modelo 571 con la aplicación del beneficio de devolución de los impuestos especiales sobre hidrocarburos.",
  searchTerms: [
    "modelo 571",
    "beneficio de devolución",
    "impuestos especiales hidrocarburos",
    "hidrocarburos",
    "autorización",
    "solicitud o comunicación",
    "Oficina Gestora",
    "Resolución 9 julio 1996",
  ],
  sections: [
    {
      id: "model-571-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-571-purpose-identity",
          heading: "Beneficio de devolución",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 571 con la aplicación del beneficio de devolución de los impuestos especiales sobre hidrocarburos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_571_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-571-purpose-record",
          heading: "Ficha administrativa propia",
          text: "La AEAT mantiene una ficha administrativa específica para este procedimiento.",
          sourceIds: [MODEL_571_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-571-details",
      title: "Marco oficial registrado",
      kind: "DETAILS",
      items: [
        {
          id: "model-571-details-resolutions",
          heading: "Resoluciones de autorización",
          text: "La Resolución de 9 de julio de 1996 aprueba modelos de autorizaciones para beneficios de devolución y la Resolución de 10 de junio de 2005 modifica aquella disposición.",
          sourceIds: [
            MODEL_571_RESOLUTION_1996_SOURCE.id,
            MODEL_571_RESOLUTION_2005_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-571-details-framework",
          heading: "Ley y Reglamento",
          text: "La ficha enlaza, con carácter informativo, las versiones consolidadas que el BOE ofrece de la Ley 38/1992 y del Reglamento de los Impuestos Especiales.",
          sourceIds: [EXCISE_LAW_SOURCE.id, EXCISE_REGULATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-571-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-571-access-browser",
          heading: "Presentar solicitud o comunicación",
          text: "La página oficial ofrece una gestión electrónica para presentar una solicitud o comunicación relacionada con el procedimiento.",
          sourceIds: [MODEL_571_PROCEDURE_HOME_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-571-access-office",
          heading: "Referencia administrativa a oficinas",
          text: "La ficha administrativa menciona la vía telemática y oficinas de la AEAT; esta ficha informativa no convierte esa mención en una transferencia administrativa automatizada.",
          sourceIds: [MODEL_571_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_571_PROCEDURE_HOME_SOURCE,
    MODEL_571_PROCEDURE_RECORD_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    MODEL_571_RESOLUTION_1996_SOURCE,
    MODEL_571_RESOLUTION_2005_SOURCE,
  ],
  documents: [],
  links: [
    {
      id: "model-571-link-procedure",
      label: "Página oficial del Modelo 571",
      sourceId: MODEL_571_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_571_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-link-resolution-1996",
      label: "Resolución de 9 de julio de 1996",
      sourceId: MODEL_571_RESOLUTION_1996_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-link-resolution-2005",
      label: "Resolución de 10 de junio de 2005",
      sourceId: MODEL_571_RESOLUTION_2005_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-571-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 571?",
      answer:
        "La aplicación del beneficio de devolución de los impuestos especiales sobre hidrocarburos.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-page",
      question: "¿Existe una página oficial específica del Modelo 571?",
      answer:
        "Sí. La AEAT publica una página de gestiones y una ficha administrativa específicas.",
      sourceIds: [
        MODEL_571_PROCEDURE_HOME_SOURCE.id,
        MODEL_571_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-browser",
      question: "¿Qué gestión electrónica ofrece la página oficial?",
      answer: "La presentación de una solicitud o comunicación.",
      sourceIds: [MODEL_571_PROCEDURE_HOME_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-offices",
      question: "¿La ficha administrativa menciona oficinas de la AEAT?",
      answer:
        "Sí. Menciona tanto la vía telemática como oficinas, sin que esta ficha automatice ni interprete esa opción administrativa.",
      sourceIds: [MODEL_571_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-resolution-1996",
      question: "¿Qué regula la resolución de 1996 registrada?",
      answer:
        "Aprueba modelos de tarjetas de inscripción y modelos de autorizaciones de aplicación de beneficios de devolución.",
      sourceIds: [MODEL_571_RESOLUTION_1996_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-resolution-2005",
      question: "¿Existe una modificación posterior de esa resolución?",
      answer:
        "Sí. La Resolución de 10 de junio de 2005 modifica la de 9 de julio de 1996.",
      sourceIds: [MODEL_571_RESOLUTION_2005_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-law",
      question: "¿Qué ley general se conserva como fuente?",
      answer: "La Ley 38/1992, de 28 de diciembre, de Impuestos Especiales.",
      sourceIds: [EXCISE_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-571-faq-regulation",
      question: "¿Qué reglamento general se conserva?",
      answer:
        "El Reglamento de los Impuestos Especiales aprobado por el Real Decreto 1165/1995.",
      sourceIds: [EXCISE_REGULATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_571_PROCEDURE_HOME_SOURCE.id,
      MODEL_571_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

// BOE-A-2004-17433 is linked by the procedure record but concerns the Modelo
// 511/electronic circulation. It is intentionally not used as a substantive
// source for the Modelo 572.
const MODEL_572_CONTENT = defineModel({
  code: "572",
  canonicalName:
    "II. EE. Solicitud de devolución del Impuesto sobre Hidrocarburos.",
  summary:
    "La AEAT identifica el Modelo 572 con la solicitud de devolución del Impuesto sobre Hidrocarburos y ofrece una solicitud electrónica.",
  searchTerms: [
    "modelo 572",
    "solicitud de devolución",
    "impuesto sobre hidrocarburos",
    "hidrocarburos",
    "impuestos especiales",
    "solicitud electrónica",
    "modelo 572 pdf",
    "Orden EHA 3482 2007",
  ],
  sections: [
    {
      id: "model-572-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-572-purpose-identity",
          heading: "Solicitud de devolución",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 572 con la solicitud de devolución del Impuesto sobre Hidrocarburos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_572_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-572-purpose-information",
          heading: "Página informativa temática",
          text: "La AEAT publica una página informativa específica del Modelo 572 dentro del área del Impuesto sobre Hidrocarburos.",
          sourceIds: [MODEL_572_INFORMATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-572-details",
      title: "Documentación y marco oficial",
      kind: "DETAILS",
      items: [
        {
          id: "model-572-details-download",
          heading: "Documento oficial descargable",
          text: "La página de descarga de la AEAT enlaza un PDF del Modelo 572 que reúne formulario e instrucciones.",
          sourceIds: [
            MODEL_572_DOWNLOAD_SOURCE.id,
            MODEL_572_FORM_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-572-details-framework",
          heading: "Fuentes normativas registradas",
          text: "La ficha conserva las versiones consolidadas informativas del BOE de la Ley 38/1992 y de su Reglamento, junto con las publicaciones oficiales de la Orden EHA/3482/2007 y de la Orden HAP/2194/2013.",
          sourceIds: [
            EXCISE_LAW_SOURCE.id,
            EXCISE_REGULATION_SOURCE.id,
            ORDER_EHA_3482_2007_SOURCE.id,
            ORDER_HAP_2194_2013_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-572-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-572-access-browser",
          heading: "Solicitud electrónica",
          text: "La página oficial ofrece una gestión electrónica denominada «Solicitud de devolución» y la ficha administrativa describe la presentación telemática del Modelo 572.",
          sourceIds: [
            MODEL_572_PROCEDURE_HOME_SOURCE.id,
            MODEL_572_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_572_PROCEDURE_HOME_SOURCE,
    MODEL_572_PROCEDURE_RECORD_SOURCE,
    MODEL_572_INFORMATION_SOURCE,
    MODEL_572_DOWNLOAD_SOURCE,
    MODEL_572_FORM_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_EHA_3482_2007_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-572-form-document",
      kind: "FORM",
      title: "Formulario e instrucciones oficiales del Modelo 572",
      sourceId: MODEL_572_FORM_SOURCE.id,
      landingPageSourceId: MODEL_572_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "572.pdf",
      byteLength: 109709,
      pageCount: 2,
      sha256:
        "e4a504afba3c6e907a59671842c1dc5ad6f1bb3aa8c23c0744377cfcf5526196",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-572-link-procedure",
      label: "Página oficial del Modelo 572",
      sourceId: MODEL_572_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_572_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-link-information",
      label: "Información oficial del Modelo 572",
      sourceId: MODEL_572_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-link-download",
      label: "Descarga oficial del Modelo 572",
      sourceId: MODEL_572_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-link-order",
      label: "Orden EHA/3482/2007",
      sourceId: ORDER_EHA_3482_2007_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-572-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 572?",
      answer: "La solicitud de devolución del Impuesto sobre Hidrocarburos.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-page",
      question: "¿Existe una página informativa específica del Modelo 572?",
      answer:
        "Sí. La AEAT la publica dentro del área del Impuesto sobre Hidrocarburos.",
      sourceIds: [MODEL_572_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-channel",
      question: "¿Qué canal describe la AEAT?",
      answer:
        "Una solicitud electrónica y la presentación telemática del Modelo 572.",
      sourceIds: [
        MODEL_572_PROCEDURE_HOME_SOURCE.id,
        MODEL_572_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-download",
      question: "¿Hay un documento oficial descargable?",
      answer:
        "Sí. La página de descarga enlaza un PDF que reúne formulario e instrucciones.",
      sourceIds: [
        MODEL_572_DOWNLOAD_SOURCE.id,
        MODEL_572_FORM_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-document-status",
      question: "¿Por qué el PDF no se muestra como miniatura?",
      answer:
        "Porque el documento enlazado contiene campos del formulario y referencias antiguas; se conserva como descarga externa con referencias heredadas detectadas.",
      sourceIds: [MODEL_572_FORM_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-law",
      question: "¿Qué ley general se conserva como fuente?",
      answer: "La Ley 38/1992, de 28 de diciembre, de Impuestos Especiales.",
      sourceIds: [EXCISE_LAW_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-order-2007",
      question: "¿Qué orden de gestión del modelo se registra?",
      answer: "La Orden EHA/3482/2007, de 20 de noviembre.",
      sourceIds: [ORDER_EHA_3482_2007_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-572-faq-electronic-order",
      question: "¿Qué orden general de presentación electrónica se conserva?",
      answer: "La Orden HAP/2194/2013, de 22 de noviembre.",
      sourceIds: [ORDER_HAP_2194_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_572_PROCEDURE_HOME_SOURCE.id,
      MODEL_572_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_573_CONTENT = defineModel({
  code: "573",
  canonicalName:
    "II. EE. Impuesto sobre los líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco",
  summary:
    "La AEAT identifica el Modelo 573 con el impuesto sobre los líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
  searchTerms: [
    "modelo 573",
    "líquidos para cigarrillos electrónicos",
    "cigarrillos electrónicos",
    "productos relacionados con el tabaco",
    "bolsas de nicotina",
    "productos de nicotina",
    "impuestos especiales",
    "preguntas frecuentes modelo 573",
  ],
  sections: [
    {
      id: "model-573-purpose",
      title: "Qué identifica este modelo",
      kind: "PURPOSE",
      items: [
        {
          id: "model-573-purpose-identity",
          heading: "Impuesto identificado por la AEAT",
          text: "El índice y la página oficial de la AEAT identifican el Modelo 573 con el impuesto sobre los líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_573_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-573-purpose-order",
          heading: "Aprobación del modelo",
          text: "La Orden HAC/86/2025 aprueba el Modelo 573 y lo denomina autoliquidación del impuesto.",
          sourceIds: [ORDER_HAC_86_2025_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-573-details",
      title: "Ayuda oficial disponible",
      kind: "DETAILS",
      items: [
        {
          id: "model-573-details-faq",
          heading: "Preguntas frecuentes temáticas",
          text: "La AEAT publica preguntas frecuentes sobre la naturaleza del impuesto, IVA, marcas fiscales, fabricación, depósitos fiscales, circulación, importaciones y recuperación de productos defectuosos o caducados.",
          sourceIds: [MODEL_573_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-573-details-scope",
          heading: "Síntesis temática conservadora",
          text: "Esta versión resume únicamente los temas generales de la página oficial y mantiene el enlace completo para consultar directamente cualquier cuestión específica.",
          sourceIds: [MODEL_573_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-573-details-brochure",
          heading: "Folleto temático",
          text: "La AEAT enlaza un folleto informativo del impuesto; se conserva como documento temático y no como formulario específico del Modelo 573.",
          sourceIds: [MODEL_573_BROCHURE_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-573-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-573-access-browser",
          heading: "Presentación electrónica",
          text: "La página oficial ofrece la presentación electrónica del Modelo 573 y la ficha administrativa sitúa el procedimiento en la Sede electrónica de la AEAT.",
          sourceIds: [
            MODEL_573_PROCEDURE_HOME_SOURCE.id,
            MODEL_573_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_573_PROCEDURE_HOME_SOURCE,
    MODEL_573_PROCEDURE_RECORD_SOURCE,
    MODEL_573_FAQ_SOURCE,
    MODEL_573_BROCHURE_SOURCE,
    EXCISE_LAW_SOURCE,
    EXCISE_REGULATION_SOURCE,
    ORDER_HAC_86_2025_SOURCE,
    ORDER_HAP_2194_2013_SOURCE,
  ],
  documents: [
    {
      id: "model-573-brochure-document",
      kind: "GUIDE",
      title: "Folleto oficial sobre cigarrillos electrónicos y otros productos relacionados con el tabaco",
      sourceId: MODEL_573_BROCHURE_SOURCE.id,
      landingPageSourceId: MODEL_573_FAQ_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Folleto_ciga_elec_v8A2.pdf",
      byteLength: 8302450,
      pageCount: 2,
      sha256:
        "b314ac796738c331c4eb7a6fc405a5f4248a53b249d51f76e684a84f6cfa81ba",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  links: [
    {
      id: "model-573-link-procedure",
      label: "Página oficial del Modelo 573",
      sourceId: MODEL_573_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_573_PROCEDURE_RECORD_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-link-faq",
      label: "Preguntas frecuentes oficiales del impuesto",
      sourceId: MODEL_573_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-link-order",
      label: "Orden HAC/86/2025",
      sourceId: ORDER_HAC_86_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-573-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 573?",
      answer:
        "El modelo del impuesto sobre los líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-tax-kind",
      question: "¿Cómo clasifica la AEAT este impuesto?",
      answer:
        "La página de preguntas frecuentes lo identifica como un impuesto especial de fabricación regulado en la Ley y el Reglamento de Impuestos Especiales.",
      sourceIds: [
        MODEL_573_FAQ_SOURCE.id,
        EXCISE_LAW_SOURCE.id,
        EXCISE_REGULATION_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-page",
      question: "¿Existe una página oficial de preguntas frecuentes?",
      answer:
        "Sí. La AEAT mantiene una página temática de preguntas y respuestas sobre este impuesto.",
      sourceIds: [MODEL_573_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-topics",
      question: "¿Qué temas generales cubre la ayuda oficial?",
      answer:
        "Entre otros, naturaleza del impuesto, IVA, marcas fiscales, fabricación, depósitos fiscales, circulación, importaciones y productos defectuosos o caducados.",
      sourceIds: [MODEL_573_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-framework",
      question: "¿Qué textos generales enmarcan este impuesto?",
      answer:
        "La Ley 38/1992 y el Reglamento de los Impuestos Especiales, junto con la orden específica que aprueba el Modelo 573.",
      sourceIds: [
        EXCISE_LAW_SOURCE.id,
        EXCISE_REGULATION_SOURCE.id,
        ORDER_HAC_86_2025_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-brochure",
      question: "¿El folleto enlazado es el formulario del Modelo 573?",
      answer:
        "No. Es un folleto temático oficial del impuesto y se identifica aquí como guía informativa, no como formulario del modelo.",
      sourceIds: [MODEL_573_BROCHURE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-channel",
      question: "¿Qué canal describe la AEAT para el Modelo 573?",
      answer:
        "La presentación electrónica a través de la Sede electrónica de la AEAT.",
      sourceIds: [
        MODEL_573_PROCEDURE_HOME_SOURCE.id,
        MODEL_573_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-order",
      question: "¿Qué orden aprueba el Modelo 573?",
      answer: "La Orden HAC/86/2025, de 13 de enero.",
      sourceIds: [ORDER_HAC_86_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-573-faq-electronic-order",
      question: "¿Qué orden general de presentación electrónica se conserva?",
      answer: "La Orden HAP/2194/2013, de 22 de noviembre.",
      sourceIds: [ORDER_HAP_2194_2013_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_573_PROCEDURE_HOME_SOURCE.id,
      MODEL_573_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

export const PUBLIC_AEAT_BATCH_16_EXCISE_COAL_ELECTRICITY_566_573_CONTENT_V1 =
  deepFreeze([
    MODEL_566_CONTENT,
    MODEL_568_CONTENT,
    MODEL_571_CONTENT,
    MODEL_572_CONTENT,
    MODEL_573_CONTENT,
  ] as const);
