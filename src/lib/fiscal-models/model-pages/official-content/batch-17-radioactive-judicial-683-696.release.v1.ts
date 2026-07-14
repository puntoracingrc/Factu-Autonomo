import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  definePublicAeatBatch17ModelV1,
  definePublicAeatBatch17SourceV1,
  type PublicAeatBatch17FactV1,
  type PublicAeatBatch17FaqV1,
} from "./batch-17.release-helper.v1";

export const PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_RELEASE_ID_V1 =
  "public-aeat-official-batch-17-radioactive-judicial-683-696.2026-07-14.v1" as const;

const INDEX = definePublicAeatBatch17SourceV1({
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

function source(
  value: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentSourceV1 {
  return definePublicAeatBatch17SourceV1(value);
}

function facts(
  code: string,
  purpose: string,
  scope: string,
  access: string,
  details: string,
  sourceIds: readonly [string, ...string[]],
): readonly [PublicAeatBatch17FactV1, ...PublicAeatBatch17FactV1[]] {
  return [
    {
      id: "purpose",
      title: "Finalidad oficial",
      kind: "PURPOSE",
      heading: `Qué identifica la AEAT como Modelo ${code}`,
      text: purpose,
      sourceIds,
    },
    {
      id: "scope",
      title: "Ámbito descrito",
      kind: "SCOPE",
      heading: "Alcance de la información oficial",
      text: scope,
      sourceIds,
    },
    {
      id: "access",
      title: "Canal oficial",
      kind: "ACCESS",
      heading: "Cómo se ofrece en la Sede electrónica",
      text: access,
      sourceIds,
    },
    {
      id: "details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      heading: "Material oficial registrado",
      text: details,
      sourceIds,
    },
  ];
}

function faq(
  code: string,
  what: string,
  channel: string,
  scope: string,
  material: string,
  legal: string,
  limit: string,
  sourceIds: readonly [string, ...string[]],
): readonly [PublicAeatBatch17FaqV1, ...PublicAeatBatch17FaqV1[]] {
  return [
    {
      id: "faq-what",
      question: `¿Qué es el Modelo ${code}?`,
      answer: what,
      sourceIds,
    },
    {
      id: "faq-channel",
      question: "¿Qué canal publica la AEAT?",
      answer: channel,
      sourceIds,
    },
    {
      id: "faq-scope",
      question: "¿Qué alcance refleja esta ficha?",
      answer: scope,
      sourceIds,
    },
    {
      id: "faq-material",
      question: "¿Qué material oficial puede consultarse?",
      answer: material,
      sourceIds,
    },
    {
      id: "faq-legal",
      question: "¿Qué referencia normativa consta?",
      answer: legal,
      sourceIds,
    },
    {
      id: "faq-limit",
      question: "¿Esta ficha decide si tengo que utilizarlo?",
      answer: limit,
      sourceIds,
    },
  ];
}

const MODEL_683_HOME = source({
  id: "aeat.model-683.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 683 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC15.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "45c7198ddc398115c1344bf8b27b008a425ec6046535dd73850fd81c0c0e0530",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_683_RECORD = source({
  id: "aeat.model-683.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 683 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC15.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "d13162bd29c6f55972f9fa136a33aad7d5633a54307a6e7fc4637ac20bf05624",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_683_HELP = source({
  id: "aeat.model-683.help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Ayuda técnica del Modelo 683",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-683.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "9523e5e5bdae5c8ee55861669c7cc064abe4601d60b06bafaf70a993cb3b3ed2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_EHA_408_2010 = source({
  id: "boe.order-eha-408-2010.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/408/2010, de 24 de febrero",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2010-3095",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "5578383fab7d7c2ba5f9c9fc47c87992d27e52ac6765503df8439d16cef3ed4b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_684_HOME = source({
  id: "aeat.model-684.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 684 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC16.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "22e7d9cc71ffc94f16159e640f51750f652c121f72d64412b87db9496abb8a8b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_684_RECORD = source({
  id: "aeat.model-684.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 684 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC16.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "aa19a842e122e1b1817b8bf5cc548eb5109cf965b9f091af4b3b774efc5cf3d4",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_684_HELP = source({
  id: "aeat.model-684.help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Ayuda técnica del Modelo 684",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-684.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "f97f14ce37f0960bb87e3b3222e637bf4b7a808d827e591adb774d048174a574",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_EHA_1259_2011 = source({
  id: "boe.order-eha-1259-2011.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/1259/2011, de 28 de abril",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2011-8627",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "427ca8bfd78e87ad85f22d7310d34e264e8d31b77b8cfac933d5326ba4a3c54f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_685_HOME = source({
  id: "aeat.model-685.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 685 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC17.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "de64c42c20d306364513cdd102e5c638cae81e3a20b6c2c895549abbea264490",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_685_RECORD = source({
  id: "aeat.model-685.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 685 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC17.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "29cf5ee2899e906a7e2340f4c831f699947cabb45db334219de5a831ea358b8d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_685_HELP = source({
  id: "aeat.model-685.help.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Ayuda técnica del Modelo 685",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-685.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "67f971f4ed7d7643f49f13a1cd530f6aca570ca6177acb273ba040f99539bd94",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_685_FORM = source({
  id: "aeat.model-685.form-pdf.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 685 · formulario oficial PDF",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC17/mod685.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "3b6d7bd90900c7cfc642c985714b3b6833d7edd3b4b403df13cbe7469802dcd2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_685_INSTRUCTIONS = source({
  id: "aeat.model-685.instructions-pdf.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 685 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC17/instr_mod685.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e51c57157b63b4a173230294e7824f9586c8aafb17540ba1df4afa09242ced79",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_EHA_388_2010 = source({
  id: "boe.order-eha-388-2010.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/388/2010, de 19 de febrero",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2010-3024",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "4cef3a885d44044dc099ffad20fcdc995961a9b2b31e4ed047457c5fef6a869e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_695_HOME = source({
  id: "aeat.model-695.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 695 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC26.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "5aac58e67e1a48d84e010515ddd77bcd569a3d5a30c0d20af9046052f4cdba68",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_695_RECORD = source({
  id: "aeat.model-695.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 695 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC26.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "b1c6cd642d3f120d0bbe9c7363c9f67cec2cbcb42a6ea1e295c0ade9fcc52519",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_695_INSTRUCTIONS = source({
  id: "aeat.model-695.instructions.2026-07-14",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 695 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/tasas/modelo-695-solicitud-devolucion-tasa-judicial_/instrucciones.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "2a83465fc8784c1d030e64103aebbdefcfb78316e0e5a0e72b1e75e9e16c46a9",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAP_2662_2012 = source({
  id: "boe.order-hap-2662-2012.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2662/2012, de 13 de diciembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2012-15141",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "8c127cb1a4798f2a45c12ecbeec219bc07bf04a977d4c41c9802b6008a1c0946",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAP_861_2015 = source({
  id: "boe.order-hap-861-2015.consolidated.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/861/2015, de 7 de mayo",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2015-5225",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "3b5fe8d7edb645a5e980a6339b149fbe99994b29da9173fedfc5e61d217b93a7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_696_HOME = source({
  id: "aeat.model-696.procedure-home.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 696 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC07.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "216be9f43de72ab6a1df3c8ec99f4817d07f6931b9a413999030f2c0aa6f01aa",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_696_RECORD = source({
  id: "aeat.model-696.procedure-record.2026-07-14",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 696 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC07.shtml",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "e82a74ff2ccb35e34ba64f6b2c103a380a5f6470be7588521d93d4f954168cee",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_696_TC_NOTE = source({
  id: "aeat.model-696.tc-note.2026-07-14",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 696 · nota informativa sobre la STC 140/2016",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/tasas/modelo-696_tasa-p_____rdenes-civil-contencioso-social_/nota-informativa-tc.html",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "c60185d5eeaefff88605240e95981b2c9b0de3a92d637545e028f8f3152c6472",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const MODEL_696_INSTRUCTIONS = source({
  id: "aeat.model-696.instructions-pdf.2026-07-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 696 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GC07/inst_cump_mod_696_nuevo_es_es.pdf",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
  sourceSha256:
    "7fd01ac02b7450e2cb927c0d99dc55fb4fa2a74a1856a1ab67b125bd63432215",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

export const PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_CONTENT_V1 =
  Object.freeze([
    definePublicAeatBatch17ModelV1({
      releaseId:
        PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_RELEASE_ID_V1,
      code: "683",
      canonicalName:
        "Tasa por la prestación de servicios de gestión de residuos radiactivos derivados de la fabricación de elementos combustibles, incluido desmantelamiento de instalaciones de fabricación.",
      summary:
        "La AEAT identifica el Modelo 683 como la autoliquidación vinculada a la gestión de residuos radiactivos derivados de la fabricación de elementos combustibles, incluido el desmantelamiento de esas instalaciones.",
      searchTerms: [
        "residuos radiactivos elementos combustibles",
        "desmantelamiento instalaciones fabricación",
        "tasa nuclear 683",
      ],
      sources: [INDEX, MODEL_683_HOME, MODEL_683_RECORD, MODEL_683_HELP, ORDER_EHA_408_2010],
      facts: facts(
        "683",
        "La fila oficial y el procedimiento describen una tasa asociada a los residuos radiactivos derivados de fabricar elementos combustibles y al desmantelamiento de las instalaciones de fabricación.",
        "La ficha reproduce ese objeto concreto; no extiende el modelo a otras tasas sobre residuos radiactivos ni evalúa quién resulta obligado.",
        "La Sede ofrece un formulario web y una página de ayuda técnica para la presentación electrónica.",
        "Quedan enlazadas la portada, la ficha, la ayuda técnica y la Orden EHA/408/2010 como referencias oficiales consultables.",
        [MODEL_683_HOME.id, MODEL_683_RECORD.id, MODEL_683_HELP.id, ORDER_EHA_408_2010.id],
      ),
      faq: faq(
        "683",
        "Es el modelo que la AEAT asocia a la tasa por gestión de residuos de la fabricación de elementos combustibles y del desmantelamiento de esas instalaciones.",
        "La AEAT publica un formulario en navegador con ayuda técnica específica.",
        "Se limita a la identidad y al procedimiento descritos por las fuentes oficiales; no determina aplicabilidad individual.",
        "Pueden consultarse la página del trámite, su ficha y la ayuda informática oficial.",
        "La Orden EHA/408/2010 figura como referencia normativa del procedimiento.",
        "No. La ficha informa y enlaza fuentes; no decide obligaciones ni permite presentar desde Factu.",
        [MODEL_683_HOME.id, MODEL_683_RECORD.id, MODEL_683_HELP.id, ORDER_EHA_408_2010.id],
      ),
      accessMethods: {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED",
        sourceIds: [MODEL_683_HOME.id, MODEL_683_HELP.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId:
        PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_RELEASE_ID_V1,
      code: "684",
      canonicalName:
        "Tasa por la prestación de servicios de gestión de residuos radiactivos generados en otras instalaciones.",
      summary:
        "La AEAT reserva el Modelo 684 para la tasa por servicios de gestión de residuos radiactivos generados en otras instalaciones.",
      searchTerms: [
        "residuos radiactivos otras instalaciones",
        "gestión residuos nucleares",
        "tasa 684",
      ],
      sources: [INDEX, MODEL_684_HOME, MODEL_684_RECORD, MODEL_684_HELP, ORDER_EHA_408_2010, ORDER_EHA_1259_2011],
      facts: facts(
        "684",
        "El índice y el procedimiento identifican la tasa por servicios de gestión de residuos radiactivos generados en otras instalaciones.",
        "La expresión ‘otras instalaciones’ procede de la identidad oficial; esta ficha no la amplía mediante supuestos no descritos por la AEAT.",
        "La Sede ofrece formulario web y ayuda técnica específica para el modelo.",
        "Se registran la portada, la ficha, la ayuda y las Órdenes EHA/408/2010 y EHA/1259/2011.",
        [MODEL_684_HOME.id, MODEL_684_RECORD.id, MODEL_684_HELP.id, ORDER_EHA_408_2010.id, ORDER_EHA_1259_2011.id],
      ),
      faq: faq(
        "684",
        "Es la tasa que la AEAT vincula a la gestión de residuos radiactivos generados en otras instalaciones.",
        "La presentación descrita por la AEAT utiliza un formulario web con ayuda técnica.",
        "La ficha conserva la denominación oficial sin interpretar qué instalación o persona queda incluida.",
        "Están enlazadas la portada, la ficha del procedimiento, la ayuda técnica y la normativa registrada.",
        "Las fuentes normativas incorporadas son las Órdenes EHA/408/2010 y EHA/1259/2011.",
        "No. La aplicabilidad permanece sin evaluar y debe contrastarse con las fuentes oficiales.",
        [MODEL_684_HOME.id, MODEL_684_RECORD.id, MODEL_684_HELP.id, ORDER_EHA_408_2010.id, ORDER_EHA_1259_2011.id],
      ),
      accessMethods: {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED",
        sourceIds: [MODEL_684_HOME.id, MODEL_684_HELP.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId:
        PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_RELEASE_ID_V1,
      code: "685",
      canonicalName: "Tasa sobre apuestas y combinaciones aleatorias, autoliquidación.",
      summary:
        "El Modelo 685 es la autoliquidación que la AEAT publica para la tasa sobre apuestas y combinaciones aleatorias.",
      searchTerms: [
        "tasa apuestas combinaciones aleatorias",
        "autoliquidación juego 685",
        "formulario apuestas",
      ],
      sources: [INDEX, MODEL_685_HOME, MODEL_685_RECORD, MODEL_685_HELP, MODEL_685_FORM, MODEL_685_INSTRUCTIONS, ORDER_EHA_388_2010],
      facts: facts(
        "685",
        "La AEAT identifica el Modelo 685 como la autoliquidación de la tasa sobre apuestas y combinaciones aleatorias.",
        "La página informa del procedimiento y de su documentación; la ficha no decide si una actividad concreta encaja en la tasa.",
        "La Sede ofrece un formulario web y ayuda técnica para la tramitación electrónica.",
        "También publica el formulario PDF y sus instrucciones, además de la Orden EHA/388/2010.",
        [MODEL_685_HOME.id, MODEL_685_RECORD.id, MODEL_685_HELP.id, MODEL_685_FORM.id, MODEL_685_INSTRUCTIONS.id, ORDER_EHA_388_2010.id],
      ),
      faq: faq(
        "685",
        "Es la autoliquidación oficial de la tasa sobre apuestas y combinaciones aleatorias.",
        "La AEAT describe un formulario en navegador y aporta ayuda informática.",
        "La información se limita al procedimiento publicado y no califica actividades concretas de juego.",
        "La AEAT facilita un PDF del modelo, instrucciones y una página de ayuda.",
        "La Orden EHA/388/2010 consta como referencia normativa del modelo.",
        "No. Factu no calcula la tasa ni determina si corresponde presentar el modelo.",
        [MODEL_685_HOME.id, MODEL_685_RECORD.id, MODEL_685_HELP.id, MODEL_685_FORM.id, MODEL_685_INSTRUCTIONS.id, ORDER_EHA_388_2010.id],
      ),
      accessMethods: {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED",
        sourceIds: [MODEL_685_HOME.id, MODEL_685_HELP.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId:
        PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_RELEASE_ID_V1,
      code: "695",
      canonicalName: "Solicitud de devolución tasa judicial.",
      summary:
        "La AEAT publica el Modelo 695 como solicitud de devolución de la tasa por el ejercicio de la potestad jurisdiccional.",
      searchTerms: [
        "devolución tasa judicial",
        "solicitud modelo 695",
        "potestad jurisdiccional devolución",
      ],
      sources: [INDEX, MODEL_695_HOME, MODEL_695_RECORD, MODEL_695_INSTRUCTIONS, ORDER_HAP_2662_2012, ORDER_HAP_861_2015],
      facts: facts(
        "695",
        "El índice oficial denomina al Modelo 695 ‘Solicitud de devolución tasa judicial’.",
        "Las instrucciones oficiales describen la solicitud; esta ficha no valora si existe derecho a devolución.",
        "La Sede ofrece formulario web y predeclaración dentro del procedimiento oficial.",
        "Se enlazan la ficha, las instrucciones y las Órdenes HAP/2662/2012 y HAP/861/2015.",
        [MODEL_695_HOME.id, MODEL_695_RECORD.id, MODEL_695_INSTRUCTIONS.id, ORDER_HAP_2662_2012.id, ORDER_HAP_861_2015.id],
      ),
      faq: faq(
        "695",
        "Es la solicitud que la AEAT identifica para la devolución de la tasa judicial.",
        "La Sede publica formulario web y una modalidad de predeclaración.",
        "La ficha explica la identidad y canales oficiales, sin reconocer ni denegar un derecho de devolución.",
        "Puede consultarse la página de instrucciones y la ficha oficial del procedimiento.",
        "Constan las Órdenes HAP/2662/2012 y HAP/861/2015 entre las referencias registradas.",
        "No. La procedencia de una devolución depende del caso y no se evalúa en esta página.",
        [MODEL_695_HOME.id, MODEL_695_RECORD.id, MODEL_695_INSTRUCTIONS.id, ORDER_HAP_2662_2012.id, ORDER_HAP_861_2015.id],
      ),
      accessMethods: {
        methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
        sourceIds: [MODEL_695_HOME.id, MODEL_695_INSTRUCTIONS.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    }),
    definePublicAeatBatch17ModelV1({
      releaseId:
        PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_RELEASE_ID_V1,
      code: "696",
      canonicalName:
        "Tasa por el Ejercicio de la Potestad Jurisdiccional en los Órdenes Civil y Contencioso-Administrativo.",
      summary:
        "El índice oficial identifica el Modelo 696 para la tasa por el ejercicio de la potestad jurisdiccional en los órdenes civil y contencioso-administrativo; otras páginas oficiales añaden referencias al orden social, divergencia que se conserva expresamente.",
      searchTerms: [
        "tasa judicial civil contencioso administrativo",
        "potestad jurisdiccional social",
        "autoliquidación 696",
      ],
      sources: [INDEX, MODEL_696_HOME, MODEL_696_RECORD, MODEL_696_TC_NOTE, MODEL_696_INSTRUCTIONS],
      facts: facts(
        "696",
        "La identidad canónica procede del índice AEAT: tasa por el ejercicio de la potestad jurisdiccional en los órdenes civil y contencioso-administrativo.",
        "La portada, las instrucciones y la ruta informativa de la AEAT incorporan también la palabra ‘social’. La diferencia entre fuentes se muestra sin reescribir el nombre canónico.",
        "La Sede describe formulario electrónico, predeclaración y presentación por lotes.",
        "La AEAT publica instrucciones y una nota informativa sobre la STC 140/2016; son referencias informativas, no recomendaciones jurídicas.",
        [INDEX.id, MODEL_696_HOME.id, MODEL_696_RECORD.id, MODEL_696_TC_NOTE.id, MODEL_696_INSTRUCTIONS.id],
      ),
      faq: faq(
        "696",
        "Es la autoliquidación asociada por la AEAT a la tasa por el ejercicio de la potestad jurisdiccional.",
        "La Sede mantiene formulario web, predeclaración y presentación por lotes.",
        "El índice menciona los órdenes civil y contencioso-administrativo, mientras otras fuentes oficiales añaden el social; la ficha conserva esa divergencia.",
        "Se enlazan instrucciones oficiales y la nota de la AEAT relativa a la STC 140/2016.",
        "La normativa se consulta desde las referencias oficiales del procedimiento; esta ficha no interpreta sus efectos sobre un caso.",
        "No. Por su sensibilidad jurídica, la página solo reproduce información oficial y no recomienda presentar ni dejar de presentar.",
        [INDEX.id, MODEL_696_HOME.id, MODEL_696_RECORD.id, MODEL_696_TC_NOTE.id, MODEL_696_INSTRUCTIONS.id],
      ),
      accessMethods: {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
        sourceIds: [MODEL_696_HOME.id, MODEL_696_RECORD.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    }),
  ] as const);
