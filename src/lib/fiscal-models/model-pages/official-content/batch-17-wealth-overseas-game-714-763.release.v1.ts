import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  createPublicAeatBatch17StandardFactsV1 as facts,
  createPublicAeatBatch17StandardFaqV1 as faq,
  definePublicAeatBatch17ModelV1,
  definePublicAeatBatch17SourceV1,
} from "./batch-17.release-helper.v1";

export const PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_RELEASE_ID_V1 =
  "public-aeat-official-batch-17-wealth-overseas-game-714-763.2026-07-14.v1" as const;

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

const MODEL_714_HOME = source({
  id: "aeat.model-714.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 714 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G611.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "634c3058a04000a7b6f34529672bb94fa0cc65afec16273b03c58f517c7513c7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_714_RECORD = source({
  id: "aeat.model-714.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 714 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G611.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "1b4b1cf6d4d0fe22448ad4fb12c68b47a164baedb0adbf836d69d1c9c7129c65",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_714_INFO = source({
  id: "aeat.model-714.information.2026-07-13",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Impuesto sobre el Patrimonio · información oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-sobre-patrimonio.html",
  officialUpdatedOn: "2026-07-13",
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "125f47854946b747397b89a08e011284338f9b015cae91d70ec57efd7b76e0cd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_714_MANUAL = source({
  id: "aeat.model-714.manual-2025.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Manual práctico de Patrimonio 2025 · Modelo 714",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/Ayuda/25Manual/714.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "cb6f1190e5a4f25ecfeac2d6d23f7b76f5b687445456035e495bfc9e5805e839",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const LAW_19_1991 = source({
  id: "boe.law-19-1991.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 19/1991, de 6 de junio, del Impuesto sobre el Patrimonio",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-1991-14392",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "632368b6844c9a4c438d1525554fd141aa00a736c73f1abb9064e1cd4cc7e36b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAC_277_2026 = source({
  id: "boe.order-hac-277-2026.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/277/2026, de 18 de marzo",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2026-7041",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "25c541b4b2487d1cf0343391c9285da4277563f8d88bfce6ac3bc69c98e0048c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_718_HOME = source({
  id: "aeat.model-718.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 718 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC62.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "3ccad004c0e2759ba22eb1e96724c355e5a16bb1488fef643a7ce76dbe69be0e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_718_RECORD = source({
  id: "aeat.model-718.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 718 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC62.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "8a45f5fd903385419a5faf2295f4ec3a4e9b829e0a6f1b3711b6692d36a76a9c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_718_INFO = source({
  id: "aeat.model-718.information.2026-07-13",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Impuesto temporal de Solidaridad de las Grandes Fortunas · información oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-temporal-solidaridad-grandes-fortunas.html",
  officialUpdatedOn: "2026-07-13",
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "d674dd58aef0869824b2200db5fa631870e50668dcc7ad91ac3cb6fd5fe1a486",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const LAW_38_2022_ARTICLE_3 = source({
  id: "boe.law-38-2022.article-3.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 38/2022 · artículo 3",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2022-22684#a3",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "a61ca678fcd881c798be0637e9a0e3bb3793ef8153483ab676c9a55eb7635b50",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAC_652_2026 = source({
  id: "boe.order-hac-652-2026.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/652/2026, de 18 de junio",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2026-14011",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "552257b33b419501432c985d23d7de2a005ea97708c2938291e99e8f5560bbbf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_720_HOME = source({
  id: "aeat.model-720.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 720 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "b2f3fced23e91166ac2628120cc76d442efcd2118de9a5045bd7b427cb673628",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_720_RECORD = source({
  id: "aeat.model-720.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 720 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI34.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "35d2d36e7ebf8312551014aa12453a0a0cbfb0bee67a4827c453519698f750a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_720_FAQ = source({
  id: "aeat.model-720.faq.2025-02",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 720 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-720-decla_____sobre-bienes-derechos-extranjero_/preguntas-frecuentes.html",
  officialUpdatedOn: "2025-02-01",
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "90af282102afbda1d9b122f09c659dfb1b37457300d5f045a966bc48c9c7e735",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_720_FORM_HELP = source({
  id: "aeat.model-720.form-help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 720 · presentación mediante formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-349-720/modelo-720-presentacion-mediante-formulario.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "48e6f424cf55e819bce695637794f945de45df9599d98602a1449d6a1caab0e2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_720_FILE_HELP = source({
  id: "aeat.model-720.file-help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 720 · presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-349-720/modelo-720-presentacion-mediante-fichero.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e0065cc79b6b2b3bad663ba9219646cd77605916f204694a79777253c466d3fa",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAP_72_2013 = source({
  id: "boe.order-hap-72-2013.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/72/2013, de 30 de enero",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-954",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "10d42d0274f6ac8ecc71e091b6f47307c8c01ed14fb25d825ae9545baf6dcc11",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_721_HOME = source({
  id: "aeat.model-721.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 721 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "111b781c4aa2023613dff73f95f70f8ca616559fcde90e01cb0d7a1f96ae2d29",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_721_RECORD = source({
  id: "aeat.model-721.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 721 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI55.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "4058cdf6f848b1f76cfbd807b07f54a5054727906e61549d23f7824ee56b59f6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_721_FAQ = source({
  id: "aeat.model-721.faq.2026-07-14",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title: "Modelo 721 · preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-721-decla-sobre-monedas-extranjero/preguntas-frecuentes-sobre-modelo-721.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "7948d1ee046a4c80bcc5c5d6436345825868df91a3a684565affb77b26296bab",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_721_ANEXO = source({
  id: "aeat.model-721.content-pdf.2025-02-05",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 721 · contenido de la declaración",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI55/Anexo721.pdf",
  officialUpdatedOn: "2025-02-05",
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "8505887d8dc3cc6f673db4b8b2fe077944b29320aff09b2ecafb435474b12350",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_721_WEB_SERVICE = source({
  id: "aeat.model-721.web-service-pdf.2023-07-31",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 721 · descripción del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI55/2024/Mod721_Descripcion_SWeb-2024.pdf",
  officialUpdatedOn: "2023-07-31",
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e1ab6768e6752ba891a60eff6f25b2b2d44f98ccae4bdd50a3d8f12764d74b9f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HFP_886_2023 = source({
  id: "boe.order-hfp-886-2023.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/886/2023, de 26 de julio",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2023-17429",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "a11a21ce041033763b24ce77b3e1daa9455dfab6ff2bd7c74d3a5667d4860fd4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_763_HOME = source({
  id: "aeat.model-763.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 763 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC18.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "a811a0ba6bed69de8528f4731847b8b8b737e063803223ddc16ac52c9aded9dc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_763_RECORD = source({
  id: "aeat.model-763.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 763 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC18.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "b40a9b08471d46b356e76fd08485476daa7bc97cab25bff5a9d43e7a6eb3a393",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_763_HELP = source({
  id: "aeat.model-763.help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Ayuda técnica del Modelo 763",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/ayuda-tecnica-modelo-763.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e7b00c6d0fcd9c7273a406ef13e33da332027e4338727522adf8a6716ebabe18",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_763_INSTRUCTIONS = source({
  id: "aeat.model-763.instructions-pdf.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 763 · instrucciones oficiales sin fecha de revisión visible",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC18/763_inst.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "a396cc59e090499c428b5ead82586be07d006c19efc8a77d91654bceb3f59954",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_EHA_1881_2011 = source({
  id: "boe.order-eha-1881-2011.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/1881/2011, de 5 de julio",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2011-11704",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "d289caa2be5029325952d5508c49c99f0bc8b946995afb6f6964ae15796fea21",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

export const PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_CONTENT_V1 =
  Object.freeze([
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_RELEASE_ID_V1,
      code: "714",
      canonicalName: "Impuesto sobre el Patrimonio",
      summary:
        "El Modelo 714 es la declaración y documento de ingreso del Impuesto sobre el Patrimonio que la AEAT ofrece para la campaña 2025.",
      searchTerms: ["impuesto patrimonio", "declaración patrimonio 2025", "bienes derechos patrimonio neto"],
      sources: [INDEX, MODEL_714_HOME, MODEL_714_RECORD, MODEL_714_INFO, MODEL_714_MANUAL, LAW_19_1991, ORDER_HAC_277_2026],
      facts: facts(
        "714",
        "El índice identifica el Impuesto sobre el Patrimonio y la portada amplía la denominación a declaración y documento de ingreso.",
        "La información temática de la AEAT explica el objeto, los sujetos, las exenciones y el patrimonio neto; esta ficha no aplica esos criterios a un usuario.",
        "La Sede ofrece un formulario web para la campaña 2025.",
        "Se enlazan la información temática, el manual de Patrimonio 2025, la Ley 19/1991 y la Orden HAC/277/2026.",
        [MODEL_714_HOME.id, MODEL_714_RECORD.id, MODEL_714_INFO.id, MODEL_714_MANUAL.id, LAW_19_1991.id, ORDER_HAC_277_2026.id],
      ),
      faq: faq(
        "714",
        "Es la declaración del Impuesto sobre el Patrimonio publicada por la AEAT.",
        "La AEAT ofrece presentación mediante formulario web para la campaña 2025.",
        "La ficha resume el procedimiento y la información oficial, sin determinar si una persona está obligada.",
        "Puede consultarse la página temática y el manual práctico de Patrimonio 2025.",
        "La Ley 19/1991 y la Orden HAC/277/2026 son referencias oficiales registradas.",
        "No. La obligación y el resultado dependen del caso concreto y no se calculan aquí.",
        [MODEL_714_HOME.id, MODEL_714_RECORD.id, MODEL_714_INFO.id, MODEL_714_MANUAL.id, LAW_19_1991.id, ORDER_HAC_277_2026.id],
      ),
      accessMethods: { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_714_HOME.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_RELEASE_ID_V1,
      code: "718",
      canonicalName: "Impuesto temporal de Solidaridad de las Grandes Fortunas.",
      summary:
        "La AEAT publica el Modelo 718 para el Impuesto temporal de Solidaridad de las Grandes Fortunas y mantiene disponible la presentación correspondiente a 2025.",
      searchTerms: ["solidaridad grandes fortunas", "ITSGF", "impuesto temporal patrimonio 718"],
      sources: [INDEX, MODEL_718_HOME, MODEL_718_RECORD, MODEL_718_INFO, LAW_38_2022_ARTICLE_3, ORDER_HAC_652_2026],
      facts: facts(
        "718",
        "El Modelo 718 corresponde al Impuesto temporal de Solidaridad de las Grandes Fortunas.",
        "La palabra ‘temporal’ forma parte de la denominación legal y no permite inferir por sí sola que el modelo sea histórico.",
        "La Sede mantiene formulario web para la presentación 2025; el simulador oficial es una herramienta separada.",
        "Se registran la información temática, el artículo 3 de la Ley 38/2022 y la Orden HAC/652/2026.",
        [MODEL_718_HOME.id, MODEL_718_RECORD.id, MODEL_718_INFO.id, LAW_38_2022_ARTICLE_3.id, ORDER_HAC_652_2026.id],
      ),
      faq: faq(
        "718",
        "Es el modelo publicado para el Impuesto temporal de Solidaridad de las Grandes Fortunas.",
        "La AEAT ofrece un formulario web para la presentación correspondiente a 2025.",
        "La ficha no infiere que esté extinguido por incluir ‘temporal’ en el nombre ni evalúa sujetos concretos.",
        "La página temática oficial reúne preguntas sobre el impuesto y la presentación.",
        "Se enlazan el artículo 3 de la Ley 38/2022 y la Orden HAC/652/2026.",
        "No. Solo muestra información oficial y no calcula ni recomienda una declaración.",
        [MODEL_718_HOME.id, MODEL_718_RECORD.id, MODEL_718_INFO.id, LAW_38_2022_ARTICLE_3.id, ORDER_HAC_652_2026.id],
      ),
      accessMethods: { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_718_HOME.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_RELEASE_ID_V1,
      code: "720",
      canonicalName: "Declaración informativa sobre bienes y derechos situados en el extranjero.",
      summary:
        "El Modelo 720 es la declaración informativa de bienes y derechos situados en el extranjero; la AEAT documenta presentación por formulario y por fichero.",
      searchTerms: ["bienes derechos extranjero", "cuentas inmuebles valores extranjero", "declaración informativa 720"],
      sources: [INDEX, MODEL_720_HOME, MODEL_720_RECORD, MODEL_720_FAQ, MODEL_720_FORM_HELP, MODEL_720_FILE_HELP, ORDER_HAP_72_2013],
      facts: facts(
        "720",
        "La AEAT identifica el Modelo 720 como declaración informativa sobre bienes y derechos situados en el extranjero.",
        "Las preguntas frecuentes oficiales distinguen bloques de información y advierten que las monedas virtuales se informan mediante el Modelo 721.",
        "La Sede documenta presentación por formulario y por fichero.",
        "Se enlazan preguntas frecuentes actualizadas a febrero de 2025, las dos ayudas técnicas y la Orden HAP/72/2013.",
        [MODEL_720_HOME.id, MODEL_720_RECORD.id, MODEL_720_FAQ.id, MODEL_720_FORM_HELP.id, MODEL_720_FILE_HELP.id, ORDER_HAP_72_2013.id],
      ),
      faq: faq(
        "720",
        "Es la declaración informativa sobre bienes y derechos situados en el extranjero.",
        "La AEAT documenta presentación mediante formulario y mediante fichero.",
        "La FAQ oficial organiza la información por categorías; esta ficha no decide si un bien concreto debe declararse.",
        "Pueden consultarse las preguntas frecuentes y las ayudas separadas para formulario y fichero.",
        "La Orden HAP/72/2013 consta como referencia normativa del modelo.",
        "No. La aplicabilidad se mantiene sin evaluar y no se confunde con el Modelo 721 de monedas virtuales.",
        [MODEL_720_HOME.id, MODEL_720_RECORD.id, MODEL_720_FAQ.id, MODEL_720_FORM_HELP.id, MODEL_720_FILE_HELP.id, ORDER_HAP_72_2013.id],
      ),
      accessMethods: { methods: ["BROWSER_FORM", "FILE_UPLOAD"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_720_HOME.id, MODEL_720_FORM_HELP.id, MODEL_720_FILE_HELP.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_RELEASE_ID_V1,
      code: "721",
      canonicalName: "Declaración informativa sobre monedas virtuales situadas en el extranjero",
      summary:
        "El Modelo 721 es la declaración informativa sobre monedas virtuales situadas en el extranjero; la AEAT publica formulario y documentación de servicio web.",
      searchTerms: ["monedas virtuales extranjero", "criptomonedas fuera España", "declaración informativa 721"],
      sources: [INDEX, MODEL_721_HOME, MODEL_721_RECORD, MODEL_721_FAQ, MODEL_721_ANEXO, MODEL_721_WEB_SERVICE, ORDER_HFP_886_2023],
      facts: facts(
        "721",
        "La AEAT identifica el Modelo 721 como declaración informativa sobre monedas virtuales situadas en el extranjero.",
        "La FAQ oficial desarrolla conceptos y alcance; esta ficha no determina la localización ni la obligación respecto de activos concretos.",
        "La Sede ofrece formulario web y documentación técnica de servicio web.",
        "Se registran la FAQ, el anexo de contenido, la descripción del servicio web y la Orden HFP/886/2023 con sus fechas propias.",
        [MODEL_721_HOME.id, MODEL_721_RECORD.id, MODEL_721_FAQ.id, MODEL_721_ANEXO.id, MODEL_721_WEB_SERVICE.id, ORDER_HFP_886_2023.id],
      ),
      faq: faq(
        "721",
        "Es la declaración informativa sobre monedas virtuales situadas en el extranjero.",
        "La AEAT publica formulario en navegador y especificación de servicio web.",
        "La ficha conserva el alcance descrito por la AEAT sin calificar la ubicación de monedas concretas.",
        "Puede consultarse la FAQ, el anexo de contenido y la especificación técnica del servicio web.",
        "La Orden HFP/886/2023 es una de las referencias normativas oficiales registradas.",
        "No. No decide si una moneda está situada en el extranjero ni sustituye la comprobación oficial.",
        [MODEL_721_HOME.id, MODEL_721_RECORD.id, MODEL_721_FAQ.id, MODEL_721_ANEXO.id, MODEL_721_WEB_SERVICE.id, ORDER_HFP_886_2023.id],
      ),
      accessMethods: { methods: ["BROWSER_FORM", "WEB_SERVICE"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_721_HOME.id, MODEL_721_WEB_SERVICE.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId: PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_RELEASE_ID_V1,
      code: "763",
      canonicalName: "Autoliquidación del Impuesto sobre actividades de juego en los supuestos de actividades anuales o plurianuales.",
      summary:
        "La AEAT publica el Modelo 763 para la autoliquidación del Impuesto sobre actividades de juego en supuestos de actividades anuales o plurianuales.",
      searchTerms: ["impuesto actividades juego", "actividades anuales plurianuales", "autoliquidación juego 763"],
      sources: [INDEX, MODEL_763_HOME, MODEL_763_RECORD, MODEL_763_HELP, MODEL_763_INSTRUCTIONS, ORDER_EHA_1881_2011],
      facts: facts(
        "763",
        "El índice oficial vincula el Modelo 763 a actividades de juego anuales o plurianuales.",
        "La portada rotula el acceso para 2020 y ejercicios siguientes; la fecha de revisión del PDF de instrucciones no es visible y se conserva como indeterminada.",
        "La Sede ofrece un formulario web y una ayuda técnica específica.",
        "Se enlazan ayuda, instrucciones oficiales y la Orden EHA/1881/2011 sin atribuir al PDF una actualidad no documentada.",
        [MODEL_763_HOME.id, MODEL_763_RECORD.id, MODEL_763_HELP.id, MODEL_763_INSTRUCTIONS.id, ORDER_EHA_1881_2011.id],
      ),
      faq: faq(
        "763",
        "Es la autoliquidación del Impuesto sobre actividades de juego para supuestos anuales o plurianuales.",
        "La AEAT ofrece un formulario web con ayuda técnica.",
        "La portada indica 2020 y siguientes; la ficha no determina si una actividad concreta entra en ese supuesto.",
        "Se ofrecen una ayuda técnica y un PDF de instrucciones cuya revisión visible no puede confirmarse.",
        "La Orden EHA/1881/2011 consta como referencia oficial.",
        "No. Factu no clasifica actividades de juego ni calcula la autoliquidación.",
        [MODEL_763_HOME.id, MODEL_763_RECORD.id, MODEL_763_HELP.id, MODEL_763_INSTRUCTIONS.id, ORDER_EHA_1881_2011.id],
      ),
      accessMethods: { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED", sourceIds: [MODEL_763_HOME.id, MODEL_763_HELP.id], semantics: "OFFICIAL_INFORMATION_ONLY" },
    }),
  ] as const);
