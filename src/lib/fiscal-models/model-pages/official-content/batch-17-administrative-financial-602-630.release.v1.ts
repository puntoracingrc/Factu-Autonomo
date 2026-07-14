import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  createPublicAeatBatch17StandardFactsV1 as facts,
  createPublicAeatBatch17StandardFaqV1 as faq,
  definePublicAeatBatch17ModelV1,
  definePublicAeatBatch17SourceV1,
} from "./batch-17.release-helper.v1";

export const PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_RELEASE_ID_V1 =
  "public-aeat-official-batch-17-administrative-financial-602-630.2026-07-14.v1" as const;

function source(
  value: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentSourceV1 {
  return definePublicAeatBatch17SourceV1(value);
}

const INDEX = source({
  id: "aeat.models.index.2026-07-08",
  authority: "AEAT",
  kind: "OFFICIAL_MODEL_INDEX",
  title: "Presentar y consultar declaraciones por modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "afcdabfbf137a734a06f7e8026af54cfae63d1cd8e78dd6a8d8f8c8deff00983",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_630_HOME = source({
  id: "aeat.model-630.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelos 600, 610, 615, 620 y 630 · página oficial agrupada",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC12.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "f1f09ee5f36218112480fad446f5cc144aeed196b4e331694be8e3a4793d6ca2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_630_RECORD = source({
  id: "aeat.model-630.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelos 600, 610, 615, 620 y 630 · ficha agrupada",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC12.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "354804bcb5daeffac9c67bec0ba78a7bcc3c8c9b9e16edbe9a96028d5848732f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_630_FORM = source({
  id: "aeat.model-630.form-pdf.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 630 · formulario oficial PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC12/630/mod630e.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e0adf53f86b2ba7d7b08dc23500cd897faa44840c5f7a6b3a89aaa3f6af67b31",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_630_INSTRUCTIONS = source({
  id: "aeat.model-630.instructions-html.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 630 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC12/630/ayu630e.htm",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "b90e9d44879045016d4fb760500b26d858470b7c9c4412eaa1f6369e21779f75",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_630_2001 = source({
  id: "boe.order-model-630-2001.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 4 de julio de 2001 sobre los modelos 600, 610, 615 y 630",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2001-13169",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e2fa67eb2af0c7cbd9241ad66ec6df7fc4c794f2af5927eb2bee3d265040fd32",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_602_HOME = source({
  id: "aeat.model-602.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 602 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC43.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "54dc4c27bec9f5afc2ad04fab8c03619e8060dc5da80cbe4c62944753bc3f067",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_602_RECORD = source({
  id: "aeat.model-602.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 602 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC43.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "26e078b255d58a91caf910bdba7261d16f146b005422f362e751841fae506473",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAC_1277_2020 = source({
  id: "boe.order-hac-1277-2020.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1277/2020, de 28 de diciembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2020-17272",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e11c0b0558f2938074faebe458d508b58ad0f63cf7b063cca0c2d14a8c8a398c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_604_HOME = source({
  id: "aeat.model-604.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 604 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC44.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "ef4670a6644bd7009355e94225344c02d5bf0c223742b2d6f9586a5b1aed10a4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_604_RECORD = source({
  id: "aeat.model-604.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 604 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC44.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "8966664b8119a3a594e750bd88d9dcb5f4bdf1a0a502fa754b57fcfdf6393ee3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_604_FAQ = source({
  id: "aeat.model-604.faq.2026-07-14",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Impuesto sobre las Transacciones Financieras · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-transacciones-financieras/preguntas-frecuentes-impuesto-transacciones-financieras.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "4c881efe16cdec307386376e65ca8dd3ab891c1fa174fa96a8aa1d2fadf8a36e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_604_DESIGNS = source({
  id: "aeat.model-604.register-designs.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 604 · diseños de registro del anexo informativo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-transacciones-financieras/disenos-registro-atf.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e62c50cbf6b82a8106d2f11427d40f9888c5e70792ae615fab73311a7e3ab2b1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const LAW_5_2020 = source({
  id: "boe.law-5-2020.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 5/2020, de 15 de octubre, del Impuesto sobre las Transacciones Financieras",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2020-12356",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "7cbe328466c204f79619134760f61b21708edb2224ba42801b287dbf157d8a27",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAC_510_2021 = source({
  id: "boe.order-hac-510-2021.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/510/2021, de 26 de mayo",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2021-8878",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "694fa188a580ad92e5f3d609fd7dee9c1e53bdc0dd97d187512dfb3aaaf651bf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_611_HOME = source({
  id: "aeat.model-611.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 611 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC05.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "c24faea82e01b6cbbb84613bceed9dabebe1e0e61bfaf6c83c3075b63ed07e42",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_611_RECORD = source({
  id: "aeat.model-611.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 611 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC05.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "a97d695f8cb626d1ab02292e2eab09760590783d6ddfe3545edf5e62d8794a61",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_611_HELP = source({
  id: "aeat.model-611.tgvi-help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 611 · presentación mediante TGVI online",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-349-720/modelo-611.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "d36e6a440000f3b37b847772b5c18e374e42bc88d61250433a329a17ef3610ef",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_611_OLD_FORM = source({
  id: "aeat.model-611.legacy-form-before-2015.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 611 · formulario válido solo para períodos anteriores a 2015",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC05/mod611e.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "48e224c798d28e05787c020b7e9336ad6b0ad2dff38a4e2a5a8c0316d9be6b44",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_EHA_3062_2010 = source({
  id: "boe.order-eha-3062-2010.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3062/2010, de 22 de noviembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2010-18368",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "b3ca4f066622b9c95283c4def19bfde1ae8c8ba22348cb74c63233d93534be5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_616_HOME = source({
  id: "aeat.model-616.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 616 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC06.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "32a5f3f2cee44737237e5d77b9bdeee6e9cd8ef656cbfcdb46b6b84298d10083",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_616_RECORD = source({
  id: "aeat.model-616.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 616 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC06.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "f1bec568f0c1f1b9df1cb6e6e85dfe72cb2256f81f3118941d251a1b32362b9e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_616_HELP = source({
  id: "aeat.model-616.tgvi-help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 616 · presentación mediante TGVI online",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-349-720/modelo-616.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "7d4930930ef1b3c44802e7b7a317f39510c5a4419014497258eb08bcda83f56d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_616_OLD_FORM = source({
  id: "aeat.model-616.legacy-form-before-2015.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 616 · formulario válido solo para períodos anteriores a 2015",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC06/mod616e.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "eb02f9a300b8d44b0a6c80d7321c3af0a92fceaf0b923022eabb72d0fdfd5ad3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

export const PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_CONTENT_V1 =
  Object.freeze([
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_RELEASE_ID_V1,
      code: "630",
      canonicalName: "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
      summary: "El Modelo 630 forma parte del procedimiento agrupado de Transmisiones Patrimoniales y Actos Jurídicos Documentados gestionado por la AEAT para Ceuta, Melilla y otros supuestos estatales acotados.",
      searchTerms: ["actos jurídicos documentados", "pago metálico letras cambio", "ITPAJD Ceuta Melilla 630"],
      sources: [INDEX, MODEL_630_HOME, MODEL_630_RECORD, MODEL_630_FORM, MODEL_630_INSTRUCTIONS, ORDER_630_2001],
      facts: facts("630", "El índice incluye el 630 en la fila agrupada 600-610-615-620-630 de Transmisiones Patrimoniales y Actos Jurídicos Documentados.", "El formulario concreta el pago en metálico de letras de cambio, dentro del ámbito estatal de Ceuta, Melilla y otros supuestos; no se generaliza a la gestión autonómica.", "La página agrupada ofrece aportación documental y descarga del formulario, no una presentación electrónica directa del Modelo 630.", "Se enlazan el formulario, las instrucciones y la Orden de 4 de julio de 2001.", [MODEL_630_HOME.id, MODEL_630_RECORD.id, MODEL_630_FORM.id, MODEL_630_INSTRUCTIONS.id, ORDER_630_2001.id]),
      faq: faq("630", "Es uno de los modelos del procedimiento agrupado de ITPAJD que la AEAT tramita en su ámbito estatal acotado.", "La Sede describe descarga de formulario y transferencia o aportación administrativa de documentación.", "La referencia oficial se limita a Ceuta, Melilla y otros supuestos estatales; no sustituye la información de una comunidad autónoma.", "Pueden consultarse el PDF del modelo y sus instrucciones oficiales.", "La Orden de 4 de julio de 2001 consta como referencia normativa del grupo.", "No. La ficha no determina competencia territorial ni obligación de autoliquidar.", [MODEL_630_HOME.id, MODEL_630_RECORD.id, MODEL_630_FORM.id, MODEL_630_INSTRUCTIONS.id, ORDER_630_2001.id]),
      accessMethods: { methods: ["ADMINISTRATIVE_TRANSFER"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_630_HOME.id, MODEL_630_RECORD.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_RELEASE_ID_V1,
      code: "602",
      canonicalName: "Tasa por la gestión administrativa del juego.",
      summary: "La AEAT publica el Modelo 602 para la autoliquidación de la tasa por la gestión administrativa del juego en el ámbito descrito por su procedimiento.",
      searchTerms: ["tasa gestión administrativa juego", "autoliquidación juego 602", "modelo 602 apuestas"],
      sources: [INDEX, MODEL_602_HOME, MODEL_602_RECORD, ORDER_HAC_1277_2020],
      facts: facts("602", "El índice oficial identifica el Modelo 602 con la tasa por la gestión administrativa del juego.", "La portada diferencia los devengos desde el 31 de diciembre de 2020 de los anteriores, sin que esta ficha atribuya consecuencias a un caso.", "La Sede ofrece un formulario web para el procedimiento actual.", "Se registran la portada, la ficha y la Orden HAC/1277/2020.", [MODEL_602_HOME.id, MODEL_602_RECORD.id, ORDER_HAC_1277_2020.id]),
      faq: faq("602", "Es la autoliquidación que la AEAT asocia a la tasa por gestión administrativa del juego.", "El procedimiento actual se ofrece mediante formulario web.", "La AEAT separa los devengos desde el 31 de diciembre de 2020 de los anteriores.", "La portada y la ficha del procedimiento son las referencias informativas principales.", "La Orden HAC/1277/2020 consta como referencia oficial.", "No. La ficha no clasifica una operación de juego ni calcula la tasa.", [MODEL_602_HOME.id, MODEL_602_RECORD.id, ORDER_HAC_1277_2020.id]),
      accessMethods: { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_602_HOME.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_RELEASE_ID_V1,
      code: "604",
      canonicalName: "Impuesto sobre las Transacciones Financieras. Autoliquidación",
      summary: "El Modelo 604 es la autoliquidación del Impuesto sobre las Transacciones Financieras; la AEAT publica además preguntas frecuentes y diseños de registro del anexo informativo.",
      searchTerms: ["impuesto transacciones financieras", "ITF acciones", "autoliquidación 604"],
      sources: [INDEX, MODEL_604_HOME, MODEL_604_RECORD, MODEL_604_FAQ, MODEL_604_DESIGNS, LAW_5_2020, ORDER_HAC_510_2021],
      facts: facts("604", "La AEAT identifica el Modelo 604 como la autoliquidación del Impuesto sobre las Transacciones Financieras.", "La FAQ desarrolla la figura y el procedimiento; esta ficha no califica operaciones ni sujetos concretos.", "La autoliquidación se ofrece mediante formulario web. Los diseños de registro corresponden al anexo informativo y no constituyen otro modelo.", "Se enlazan FAQ, diseños de registro, Ley 5/2020 y Orden HAC/510/2021.", [MODEL_604_HOME.id, MODEL_604_RECORD.id, MODEL_604_FAQ.id, MODEL_604_DESIGNS.id, LAW_5_2020.id, ORDER_HAC_510_2021.id]),
      faq: faq("604", "Es la autoliquidación del Impuesto sobre las Transacciones Financieras.", "La AEAT publica un formulario web para la autoliquidación.", "Los ficheros descritos por la AEAT sirven al anexo informativo y no cambian la identidad del Modelo 604.", "Puede consultarse la FAQ y la página de diseños de registro.", "La Ley 5/2020 y la Orden HAC/510/2021 constan como referencias oficiales.", "No. La página no decide si una transacción está sujeta ni calcula el impuesto.", [MODEL_604_HOME.id, MODEL_604_RECORD.id, MODEL_604_FAQ.id, MODEL_604_DESIGNS.id, LAW_5_2020.id, ORDER_HAC_510_2021.id]),
      accessMethods: { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_604_HOME.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_RELEASE_ID_V1,
      code: "611",
      canonicalName: "Declaración Informativa. Pagos en metálico del impuesto que grava los documentos negociados por Entidades Colaboradoras. Declaración Resumen Anual.",
      summary: "El Modelo 611 es la declaración informativa anual de pagos en metálico del impuesto que grava documentos negociados por entidades colaboradoras; la presentación vigente se documenta mediante TGVI online.",
      searchTerms: ["pagos metálico documentos negociados", "entidades colaboradoras", "TGVI modelo 611"],
      sources: [INDEX, MODEL_611_HOME, MODEL_611_RECORD, MODEL_611_HELP, MODEL_611_OLD_FORM, ORDER_EHA_3062_2010],
      facts: facts("611", "La AEAT identifica el Modelo 611 como declaración resumen anual de pagos en metálico sobre documentos negociados por entidades colaboradoras.", "El PDF antiguo se conserva solo como material para períodos anteriores a 2015; no representa el canal vigente.", "La presentación actual descrita por la AEAT es la carga de fichero mediante TGVI online.", "Se enlazan la ayuda TGVI, el formulario histórico claramente rotulado y la Orden EHA/3062/2010.", [MODEL_611_HOME.id, MODEL_611_RECORD.id, MODEL_611_HELP.id, MODEL_611_OLD_FORM.id, ORDER_EHA_3062_2010.id]),
      faq: faq("611", "Es la declaración informativa anual sobre determinados pagos en metálico de documentos negociados por entidades colaboradoras.", "La AEAT documenta la carga de fichero mediante TGVI online.", "La ficha no decide qué documentos deben incluirse ni evalúa una entidad concreta.", "Existe una ayuda TGVI y un PDF antiguo válido únicamente para períodos anteriores a 2015.", "La Orden EHA/3062/2010 consta entre las referencias oficiales.", "No. La ficha no transforma el formulario histórico en una opción vigente ni determina obligaciones.", [MODEL_611_HOME.id, MODEL_611_RECORD.id, MODEL_611_HELP.id, MODEL_611_OLD_FORM.id, ORDER_EHA_3062_2010.id]),
      accessMethods: { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_611_HOME.id, MODEL_611_HELP.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_RELEASE_ID_V1,
      code: "616",
      canonicalName: "Declaración Informativa. Pagos en metálico del impuesto que grava la emisión de documentos que lleven aparejada acción cambiaria o sean endosables a la orden. Declaración Resumen Anual.",
      summary: "El Modelo 616 es la declaración informativa anual de pagos en metálico del impuesto sobre documentos con acción cambiaria o endosables a la orden; la AEAT documenta TGVI online como canal vigente.",
      searchTerms: ["documentos acción cambiaria", "documentos endosables orden", "TGVI modelo 616"],
      sources: [INDEX, MODEL_616_HOME, MODEL_616_RECORD, MODEL_616_HELP, MODEL_616_OLD_FORM, ORDER_EHA_3062_2010],
      facts: facts("616", "La AEAT identifica el Modelo 616 como declaración resumen anual sobre pagos en metálico de documentos con acción cambiaria o endosables a la orden.", "El PDF disponible está expresamente limitado a períodos anteriores a 2015 y se presenta como legado.", "La presentación vigente se describe mediante carga de fichero TGVI online.", "Se enlazan la ayuda TGVI, el formulario histórico rotulado y la Orden EHA/3062/2010.", [MODEL_616_HOME.id, MODEL_616_RECORD.id, MODEL_616_HELP.id, MODEL_616_OLD_FORM.id, ORDER_EHA_3062_2010.id]),
      faq: faq("616", "Es la declaración anual sobre determinados pagos en metálico de documentos con acción cambiaria o endosables.", "La AEAT documenta presentación mediante fichero en TGVI online.", "La ficha conserva el alcance literal y no califica documentos concretos.", "La ayuda TGVI es la referencia vigente; el PDF publicado está limitado a períodos anteriores a 2015.", "La Orden EHA/3062/2010 consta como referencia oficial.", "No. No se ofrece el PDF histórico como canal actual ni se evalúa una obligación individual.", [MODEL_616_HOME.id, MODEL_616_RECORD.id, MODEL_616_HELP.id, MODEL_616_OLD_FORM.id, ORDER_EHA_3062_2010.id]),
      accessMethods: { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_616_HOME.id, MODEL_616_HELP.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
  ] as const);
