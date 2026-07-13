import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_RELEASE_ID_V1 =
  "public-aeat-official-batch-11-information-returns-296-346.2026-07-13.v1" as const;

export type PublicAeatBatch11InformationReturns296346CodeV1 =
  "296" | "345" | "346";

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

const MODELS_200_299_REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-200-299.register-designs.2026-06-19",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · Modelos 200 al 299",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-200-299.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1397ca1c069858135a1229fa0e1b36d36df487d9e757207069761e2c143a67a1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODELS_300_399_REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-300-399.register-designs.2026-02-04",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro · Modelos 300 al 399",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-300-399.html",
  officialUpdatedOn: "2026-02-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7df7813fc7fea0d0f44ba6eada7cb578bb007ee5813f3aca5ede9b828470375e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-296.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 296 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI22.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7fa7135e8ec7c79dd4947071670f1c5e4b12232206e22c11ca88ed71cf760264",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-296.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 296",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI22.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a7a9ac6c766ec48b877568da3dfe62278879e2d4b023d3aa85e63aa510ccc086",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_FORM_HELP_SOURCE = {
  id: "aeat.model-296.form-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 296 · ayuda del formulario web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-296-formulario.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a6e00da408282e541985a240dc6294d907ee9bbe0b0da1f65560162d88a38b7c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_FILE_HELP_SOURCE = {
  id: "aeat.model-296.file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 296 · ayuda de la presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-296-fichero.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f2ef6509e51e40ae1f856227689c13346eeeb6fa4e040d17173d7b1251d0c1f8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_TIN_INFORMATION_SOURCE = {
  id: "aeat.model-296.tin-information.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 296 · portales web para validaciones de TIN",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-296-decla_____s-resumen-anual_/portales-web-validaciones-tin.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "11cfe68e8574e2c4f1cf034cc885235749c2344795a2eea46a607c0a53349078",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-296.register-design-pdf.2024-11-04",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 296 · diseño lógico · ejercicio 2024",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_200_299/archivos_24/DR_296_2024.pdf",
  officialUpdatedOn: "2024-11-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "abec12e56073f8325b159c45a6b25de713bd53f8315c26c0f5243024f00d0378",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_INFORMATION_NOTE_SOURCE = {
  id: "aeat.model-296.information-note-pdf.2025-12-05",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelos 193 y 296 · nota informativa sobre cumplimentación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Declaraciones_informativas/2024/Notas_informartivas/Nota_informativa_193-296.pdf",
  officialUpdatedOn: "2025-12-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d71fcd7ccd03d7f4ca205b418d4415a2bd74093ca95269b0aaa4fab05e02cf17",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_BASE_ORDER_SOURCE = {
  id: "boe.model-296.order-eha-3290-2008.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3290/2008, de 6 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2008-18497",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1c3b73bf802d729d6de2d260c5e4e21bd35c20ea293a8eaea84c3157e5c4e6c1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_LATEST_ORDER_SOURCE = {
  id: "boe.model-296.order-hac-623-2026.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/623/2026, de 12 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-13573",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "84cb2a0ada3ff40d37442a1db69f14e5205a762b830bfb6e315137b3cb21fa1e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-345.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 345 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI25.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c559c5115bf756b0001cefd53707ceee77b97cb3eed8f1a594e01772d3345725",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-345.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 345",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI25.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e544015f0a715fdcc126ab650c1334597d4698bd705b3869196baaf490039f84",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_FORM_HELP_SOURCE = {
  id: "aeat.model-345.form-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 345 · ayuda del formulario web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-345-formulario.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5dfb60ac4fb5c12ae0cd6618084321634edc7ad3bb95db2027bf9acf328de9d6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_FILE_HELP_SOURCE = {
  id: "aeat.model-345.file-help.2026-06-19",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 345 · ayuda de la presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-345-fichero.html",
  officialUpdatedOn: "2026-06-19",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fd1625a7479ef16687795dc6d731d4636df36591712c94268c22923fbecd99bd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_NOTE_SOURCE = {
  id: "aeat.model-345.clarifying-note.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 345 · nota aclaratoria",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-345-decla_____ncia-declaracion-anual-aportaciones_/nota-aclaratoria-modelo-345.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d17814046786cb4ff373a1fa6d49989a4337cad24a833b5d2609ecba3f224c98",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-345.register-design-pdf.2025-12-12",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 345 · diseño de registro · ejercicio 2025",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_345_2025.pdf",
  officialUpdatedOn: "2025-12-12",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fb0faaf68f8b0de29316bdc65eaeb3ba0dcb8a441eea4d5415d0cb4517c287fd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_BASE_ORDER_SOURCE = {
  id: "boe.model-345.order-hfp-823-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/823/2022, de 24 de agosto",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-14168",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e4db3f20af3c5183a7706b161f54b24ac6c19a3dfdb216fb6fb36ed1acc72b24",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_345_LATEST_ORDER_SOURCE = {
  id: "boe.model-345.order-hac-1430-2025.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1430/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25389",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "84e1e10ff368fadef88eaf8cd0440f93b283ee55734ba89ec8b13424364253cd",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_346_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-346.procedure-home.2026-03-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 346 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI26.shtml",
  officialUpdatedOn: "2026-03-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c9534ce7ff4393e668cab74a14ae5711d090edb539f20193fa58b8fc108d4c7c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_346_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-346.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 346",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI26.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "740c0d88243c8013628bedafa5f794f7e569add6bad2f7808fceb937312d8a52",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_346_FILE_HELP_SOURCE = {
  id: "aeat.model-346.file-help.2026-01-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 346 · ayuda de la presentación mediante fichero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-291-347/modelo-346.html",
  officialUpdatedOn: "2026-01-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8b7a44b8506eedf1773e0719bcf8e319b368518ebabaf46dd920e5fa46e5b74f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_346_REGISTER_DESIGN_SOURCE = {
  id: "aeat.model-346.register-design-pdf.2025-01-02",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 346 · diseño de registro · ejercicio 2024",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_300_399/DR_Modelo_346_2024.pdf",
  officialUpdatedOn: "2025-01-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3e18eb2490685f5bd73a247d9606d9617f00527b2a5b79caf5edf1bd63df1edb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_346_BASE_ORDER_SOURCE = {
  id: "boe.model-346.order-2001-08-07.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 7 de agosto de 2001",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2001-15667",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "db44abb9a83922c8eb2701463606a1986a023e746206903d9a02ca105124a007",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_346_LATEST_ORDER_SOURCE = {
  id: "boe.model-346.order-hac-1504-2024.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1504/2024, de 26 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-27528",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "357d0e496d5130b6f79b4ea733c494813ae9b875bbf2d3c8dc2f52ca35eb3192",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_296_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_RELEASE_ID_V1,
  code: "296",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa. Retenciones e ingresos a cuenta del Impuesto sobre la Renta de no Residentes (sin establecimiento permanente). Resumen anual.",
  summary:
    "Resumen anual informativo de retenciones e ingresos a cuenta del Impuesto sobre la Renta de no Residentes sin establecimiento permanente, con formulario en navegador y carga mediante fichero descritos por la AEAT.",
  searchTerms: [
    "modelo 296",
    "IRNR resumen anual",
    "declaración informativa",
    "Impuesto sobre la Renta de no Residentes",
    "sin establecimiento permanente",
    "retenciones e ingresos a cuenta",
    "formulario web",
    "presentación mediante fichero",
    "diseño lógico 296",
    "TIN NIF no residente",
    "Orden EHA 3290 2008",
    "Orden HAC 623 2026",
  ],
  sections: [
    {
      id: "model-296-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-296-purpose-identity",
          heading: "Retenciones e ingresos a cuenta del IRNR",
          text: "El índice de modelos y las páginas del procedimiento identifican el Modelo 296 como una declaración informativa y resumen anual de retenciones e ingresos a cuenta del Impuesto sobre la Renta de no Residentes sin establecimiento permanente.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_296_PROCEDURE_HOME_SOURCE.id,
            MODEL_296_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-296-purpose-object",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación del resumen anual. Esta página reproduce esa identidad general sin evaluar la situación de ninguna persona o entidad.",
          sourceIds: [MODEL_296_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-296-access",
      title: "Canales y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-296-access-browser",
          heading: "Formulario en navegador",
          text: "La página oficial y la ayuda técnica describen un formulario web que permite cumplimentar la información en línea e importar un fichero ajustado al formato publicado.",
          sourceIds: [
            MODEL_296_PROCEDURE_HOME_SOURCE.id,
            MODEL_296_FORM_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-296-access-file",
          heading: "Carga mediante fichero",
          text: "La AEAT también documenta una vía mediante fichero ajustado al diseño de registro. Esta ficha no enlaza el endpoint operativo ni ejecuta su validación o envío.",
          sourceIds: [
            MODEL_296_PROCEDURE_HOME_SOURCE.id,
            MODEL_296_FILE_HELP_SOURCE.id,
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-296-access-validation",
          heading: "Validación diferenciada",
          text: "La ayuda del fichero distingue la validación técnica de la presentación posterior y describe resultados con registros correctos o erróneos.",
          sourceIds: [MODEL_296_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-296-details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      items: [
        {
          id: "model-296-details-design",
          heading: "Diseño lógico publicado",
          text: "El catálogo técnico de la AEAT enlaza un PDF de diseños lógicos del ejercicio 2024. Es documentación de registros, no un formulario en blanco, y su vigencia posterior no se infiere en esta ficha.",
          sourceIds: [
            MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
            MODEL_296_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-296-details-note",
          heading: "Nota informativa de cumplimentación",
          text: "La página oficial enlaza una nota de la AEAT sobre determinadas operaciones de los modelos 193 y 296 y los anexos del tipo de registro 2 del Modelo 296. Se registra como guía externa, no como formulario.",
          sourceIds: [
            MODEL_296_PROCEDURE_HOME_SOURCE.id,
            MODEL_296_INFORMATION_NOTE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-296-details-tin",
          heading: "Referencias para TIN",
          text: "La AEAT publica una página informativa con portales de referencia sobre emisión, estructura y validación sintáctica de números de identificación fiscal de distintos países.",
          sourceIds: [MODEL_296_TIN_INFORMATION_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-296-details-law",
          heading: "Normativa enlazada",
          text: "La ficha conserva el texto original de la orden que aprobó el modelo y el de una modificación publicada en 2026, ambos como referencias informativas del BOE.",
          sourceIds: [
            MODEL_296_BASE_ORDER_SOURCE.id,
            MODEL_296_LATEST_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_200_299_REGISTER_DESIGNS_SOURCE,
    MODEL_296_PROCEDURE_HOME_SOURCE,
    MODEL_296_PROCEDURE_RECORD_SOURCE,
    MODEL_296_FORM_HELP_SOURCE,
    MODEL_296_FILE_HELP_SOURCE,
    MODEL_296_TIN_INFORMATION_SOURCE,
    MODEL_296_REGISTER_DESIGN_SOURCE,
    MODEL_296_INFORMATION_NOTE_SOURCE,
    MODEL_296_BASE_ORDER_SOURCE,
    MODEL_296_LATEST_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-296-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseños lógicos del Modelo 296 · ejercicio 2024",
      sourceId: MODEL_296_REGISTER_DESIGN_SOURCE.id,
      landingPageSourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_296_2024.pdf",
      byteLength: 304691,
      pageCount: 35,
      sha256:
        "abec12e56073f8325b159c45a6b25de713bd53f8315c26c0f5243024f00d0378",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-296-information-note-document",
      kind: "GUIDE",
      title:
        "Nota informativa sobre la cumplimentación de los modelos 193 y 296",
      sourceId: MODEL_296_INFORMATION_NOTE_SOURCE.id,
      landingPageSourceId: MODEL_296_PROCEDURE_HOME_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Nota_informativa_193-296.pdf",
      byteLength: 857905,
      pageCount: 19,
      sha256:
        "d71fcd7ccd03d7f4ca205b418d4415a2bd74093ca95269b0aaa4fab05e02cf17",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-296-link-procedure",
      label: "Página oficial del Modelo 296",
      sourceId: MODEL_296_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_296_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-form-help",
      label: "Ayuda oficial del formulario web",
      sourceId: MODEL_296_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-file-help",
      label: "Ayuda oficial de la vía mediante fichero",
      sourceId: MODEL_296_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-tin",
      label: "Portales web para validaciones de TIN",
      sourceId: MODEL_296_TIN_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-register-designs",
      label: "Diseños de registro de los modelos 200 al 299",
      sourceId: MODELS_200_299_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-register-design",
      label: "Diseño lógico oficial del Modelo 296 · ejercicio 2024",
      sourceId: MODEL_296_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-information-note",
      label: "Nota informativa oficial de los modelos 193 y 296",
      sourceId: MODEL_296_INFORMATION_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-base-order",
      label: "Orden EHA/3290/2008, de 6 de noviembre",
      sourceId: MODEL_296_BASE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-link-latest-order",
      label: "Orden HAC/623/2026, de 12 de junio",
      sourceId: MODEL_296_LATEST_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-296-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 296?",
      answer:
        "Una declaración informativa de retenciones e ingresos a cuenta del Impuesto sobre la Renta de no Residentes sin establecimiento permanente, configurada como resumen anual.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_296_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la presentación del resumen anual de retenciones e ingresos a cuenta del IRNR sin establecimiento permanente.",
      sourceIds: [MODEL_296_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-channels",
      question: "¿Qué canales técnicos documenta la AEAT?",
      answer:
        "La página oficial y sus ayudas describen un formulario web y una vía de carga mediante fichero.",
      sourceIds: [
        MODEL_296_PROCEDURE_HOME_SOURCE.id,
        MODEL_296_FORM_HELP_SOURCE.id,
        MODEL_296_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-import",
      question: "¿El formulario web puede trabajar con un fichero?",
      answer:
        "La ayuda del formulario describe la importación de un fichero que siga el diseño de registro publicado.",
      sourceIds: [MODEL_296_FORM_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-validation",
      question: "¿Validar el fichero equivale a presentarlo?",
      answer:
        "No. La ayuda oficial diferencia expresamente la validación del fichero de la presentación posterior.",
      sourceIds: [MODEL_296_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-design",
      question: "¿Qué contiene el PDF de diseños lógicos?",
      answer:
        "Contiene documentación técnica sobre los tipos y campos de registro del Modelo 296; no es un formulario en blanco para cumplimentar.",
      sourceIds: [MODEL_296_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-note",
      question: "¿Qué aborda la nota informativa enlazada?",
      answer:
        "Aborda cuestiones de cumplimentación de determinadas operaciones en los modelos 193 y 296 y de los anexos del tipo de registro 2 del Modelo 296.",
      sourceIds: [MODEL_296_INFORMATION_NOTE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-tin",
      question: "¿Qué ofrece la página sobre TIN?",
      answer:
        "Reúne enlaces de referencia sobre emisión, obtención, estructura y validación sintáctica de números de identificación fiscal de distintos países.",
      sourceIds: [MODEL_296_TIN_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-296-faq-law",
      question: "¿Qué referencias normativas se enlazan?",
      answer:
        "El texto original de la Orden EHA/3290/2008 y el de la Orden HAC/623/2026, que modifica normas relativas al modelo.",
      sourceIds: [
        MODEL_296_BASE_ORDER_SOURCE.id,
        MODEL_296_LATEST_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_296_PROCEDURE_HOME_SOURCE.id,
      MODEL_296_PROCEDURE_RECORD_SOURCE.id,
      MODEL_296_FORM_HELP_SOURCE.id,
      MODEL_296_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"296">;

const MODEL_345_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_RELEASE_ID_V1,
  code: "345",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Planes, fondos de pensiones y sistemas alternativos. Mutualidades de Previsión Social, Planes de Previsión Asegurados, Planes individuales de Ahorro Sistemático, Planes de Previsión Social Empresarial y Seguros de Dependencia. Declaración anual partícipes y aportaciones.",
  summary:
    "Declaración informativa anual sobre partícipes y aportaciones en planes, fondos de pensiones y los demás sistemas de previsión enumerados por la AEAT, con formulario web y carga mediante fichero.",
  searchTerms: [
    "modelo 345",
    "planes fondos pensiones",
    "declaración informativa anual",
    "partícipes aportaciones contribuciones",
    "mutualidades de previsión social",
    "planes de previsión asegurados",
    "planes individuales de ahorro sistemático",
    "planes de previsión social empresarial",
    "seguros de dependencia",
    "formulario web",
    "presentación mediante fichero",
    "diseño de registro 345",
    "Orden HFP 823 2022",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-345-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-345-purpose-identity",
          heading: "Planes, fondos y sistemas de previsión",
          text: "El índice oficial y las páginas del procedimiento identifican el Modelo 345 como una declaración informativa anual sobre partícipes y aportaciones en planes, fondos de pensiones y los demás sistemas de previsión que enumera su denominación.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_345_PROCEDURE_HOME_SOURCE.id,
            MODEL_345_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-345-purpose-object",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de la declaración anual de partícipes y aportaciones. Esta página no decide quién debe presentarla.",
          sourceIds: [MODEL_345_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-345-access",
      title: "Canales y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-345-access-browser",
          heading: "Formulario en navegador",
          text: "La página oficial y su ayuda describen un formulario web para trabajar con los datos de la declaración e importar un fichero ajustado al diseño publicado.",
          sourceIds: [
            MODEL_345_PROCEDURE_HOME_SOURCE.id,
            MODEL_345_FORM_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-345-access-file",
          heading: "Carga mediante fichero",
          text: "La AEAT también documenta un canal mediante fichero, con datos ajustados al diseño de registro. Esta ficha no contiene enlaces a la aplicación operativa ni transmite información.",
          sourceIds: [
            MODEL_345_PROCEDURE_HOME_SOURCE.id,
            MODEL_345_FILE_HELP_SOURCE.id,
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-345-access-validation",
          heading: "Validación diferenciada",
          text: "La ayuda del fichero separa la validación técnica de la presentación posterior y describe resultados con registros correctos, erróneos o no identificados.",
          sourceIds: [MODEL_345_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-345-details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      items: [
        {
          id: "model-345-details-design",
          heading: "Diseño de registro publicado",
          text: "El catálogo técnico de la AEAT enlaza un PDF del diseño de registro para el ejercicio 2025. El archivo es documentación técnica y no un formulario estático para cumplimentar.",
          sourceIds: [
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
            MODEL_345_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-345-details-note",
          heading: "Nota aclaratoria de la AEAT",
          text: "La página oficial enlaza una nota aclaratoria sobre imputación fiscal de aportaciones y contribuciones empresariales. Se ofrece como referencia informativa sin trasladar sus conclusiones a un caso concreto.",
          sourceIds: [
            MODEL_345_PROCEDURE_HOME_SOURCE.id,
            MODEL_345_NOTE_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-345-details-law",
          heading: "Normativa enlazada",
          text: "La ficha conserva el texto original de la orden de 2022 que aprobó el modelo y el de una modificación publicada en 2025, ambos como referencias informativas del BOE.",
          sourceIds: [
            MODEL_345_BASE_ORDER_SOURCE.id,
            MODEL_345_LATEST_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_300_399_REGISTER_DESIGNS_SOURCE,
    MODEL_345_PROCEDURE_HOME_SOURCE,
    MODEL_345_PROCEDURE_RECORD_SOURCE,
    MODEL_345_FORM_HELP_SOURCE,
    MODEL_345_FILE_HELP_SOURCE,
    MODEL_345_NOTE_SOURCE,
    MODEL_345_REGISTER_DESIGN_SOURCE,
    MODEL_345_BASE_ORDER_SOURCE,
    MODEL_345_LATEST_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-345-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 345 · ejercicio 2025",
      sourceId: MODEL_345_REGISTER_DESIGN_SOURCE.id,
      landingPageSourceId: MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_345_2025.pdf",
      byteLength: 331991,
      pageCount: 35,
      sha256:
        "fb0faaf68f8b0de29316bdc65eaeb3ba0dcb8a441eea4d5415d0cb4517c287fd",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-345-link-procedure",
      label: "Página oficial del Modelo 345",
      sourceId: MODEL_345_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_345_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-form-help",
      label: "Ayuda oficial del formulario web",
      sourceId: MODEL_345_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-file-help",
      label: "Ayuda oficial de la vía mediante fichero",
      sourceId: MODEL_345_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-note",
      label: "Nota aclaratoria oficial del Modelo 345",
      sourceId: MODEL_345_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-register-designs",
      label: "Diseños de registro de los modelos 300 al 399",
      sourceId: MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-register-design",
      label: "Diseño de registro oficial del Modelo 345 · ejercicio 2025",
      sourceId: MODEL_345_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-base-order",
      label: "Orden HFP/823/2022, de 24 de agosto",
      sourceId: MODEL_345_BASE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-link-latest-order",
      label: "Orden HAC/1430/2025, de 3 de diciembre",
      sourceId: MODEL_345_LATEST_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-345-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 345?",
      answer:
        "Una declaración informativa anual sobre partícipes y aportaciones en planes, fondos de pensiones y los demás sistemas de previsión enumerados en su denominación oficial.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_345_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-systems",
      question: "¿Qué sistemas menciona la denominación oficial?",
      answer:
        "Planes y fondos de pensiones, mutualidades de previsión social, planes de previsión asegurados, planes individuales de ahorro sistemático, planes de previsión social empresarial y seguros de dependencia.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_345_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración anual de partícipes y aportaciones.",
      sourceIds: [MODEL_345_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-channels",
      question: "¿Qué canales técnicos documenta la AEAT?",
      answer:
        "La página oficial y sus ayudas describen un formulario web y una vía de carga mediante fichero.",
      sourceIds: [
        MODEL_345_PROCEDURE_HOME_SOURCE.id,
        MODEL_345_FORM_HELP_SOURCE.id,
        MODEL_345_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-import",
      question: "¿El formulario web admite importar un fichero?",
      answer:
        "Sí. La ayuda del formulario describe la importación de un fichero ajustado al diseño lógico publicado.",
      sourceIds: [MODEL_345_FORM_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-validation",
      question: "¿Validar el fichero equivale a presentarlo?",
      answer:
        "No. La ayuda oficial diferencia la validación técnica del fichero de la presentación posterior.",
      sourceIds: [MODEL_345_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-design",
      question: "¿El PDF técnico es un formulario para cumplimentar?",
      answer:
        "No. Es un diseño de registro; el AcroForm del archivo no contiene campos y se registra únicamente como metadato técnico.",
      sourceIds: [MODEL_345_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-note",
      question: "¿Sobre qué trata la nota aclaratoria?",
      answer:
        "La AEAT la titula como una nota sobre imputación fiscal de aportaciones y contribuciones empresariales y la vincula al Modelo 345.",
      sourceIds: [MODEL_345_NOTE_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-345-faq-law",
      question: "¿Qué referencias normativas se enlazan?",
      answer:
        "El texto original de la Orden HFP/823/2022 y el de la Orden HAC/1430/2025, que modifica la orden del modelo.",
      sourceIds: [
        MODEL_345_BASE_ORDER_SOURCE.id,
        MODEL_345_LATEST_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_345_PROCEDURE_HOME_SOURCE.id,
      MODEL_345_PROCEDURE_RECORD_SOURCE.id,
      MODEL_345_FORM_HELP_SOURCE.id,
      MODEL_345_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"345">;

const MODEL_346_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_RELEASE_ID_V1,
  code: "346",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Declaración Informativa de Subvenciones e indemnizaciones satisfechas por Entidades Públicas/privadas a agricultores o ganaderos.",
  summary:
    "Declaración informativa sobre subvenciones e indemnizaciones satisfechas por entidades públicas o privadas a agricultores o ganaderos, con carga mediante fichero y diseño de registro documentados por la AEAT.",
  searchTerms: [
    "modelo 346",
    "subvenciones indemnizaciones agricultores ganaderos",
    "IRPF declaración informativa",
    "entidades públicas privadas",
    "agricultura ganadería",
    "presentación mediante fichero",
    "diseño de registro 346",
    "validación de fichero",
    "Orden de 7 agosto 2001",
    "Orden HAC 1504 2024",
  ],
  sections: [
    {
      id: "model-346-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-346-purpose-identity",
          heading: "Subvenciones e indemnizaciones",
          text: "El índice oficial identifica el Modelo 346 como una declaración informativa del IRPF sobre subvenciones e indemnizaciones satisfechas por entidades públicas o privadas a agricultores o ganaderos.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_346_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-346-purpose-object",
          heading: "Objeto de la ficha administrativa",
          text: "La ficha administrativa describe como objeto facilitar la presentación de la declaración informativa anual de esas subvenciones e indemnizaciones. Esta página no determina su aplicación a un caso concreto.",
          sourceIds: [MODEL_346_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-346-access",
      title: "Canal y recursos técnicos",
      kind: "ACCESS",
      items: [
        {
          id: "model-346-access-file",
          heading: "Carga mediante fichero",
          text: "La página oficial y la ayuda técnica describen una vía mediante fichero ajustado al diseño de registro publicado. Esta ficha no enlaza la aplicación operativa ni transmite datos.",
          sourceIds: [
            MODEL_346_PROCEDURE_HOME_SOURCE.id,
            MODEL_346_PROCEDURE_RECORD_SOURCE.id,
            MODEL_346_FILE_HELP_SOURCE.id,
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-346-access-validation",
          heading: "Validación diferenciada",
          text: "La ayuda distingue la validación técnica del fichero de la presentación posterior y describe resultados con registros correctos o erróneos.",
          sourceIds: [MODEL_346_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-346-access-errors",
          heading: "Resultados técnicos separados",
          text: "La ayuda diferencia el fichero de registros erróneos del fichero informativo que contiene los mensajes asociados a esos errores.",
          sourceIds: [MODEL_346_FILE_HELP_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-346-details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      items: [
        {
          id: "model-346-details-design",
          heading: "Diseño de registro publicado",
          text: "El catálogo técnico de la AEAT enlaza un PDF del diseño de registro para el ejercicio 2024. Es documentación técnica, no un formulario en blanco, y su vigencia posterior no se infiere en esta ficha.",
          sourceIds: [
            MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
            MODEL_346_REGISTER_DESIGN_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-346-details-law",
          heading: "Normativa enlazada",
          text: "La ficha conserva el texto original de la orden que aprobó el modelo y el de una modificación publicada en 2024, ambos como referencias informativas del BOE.",
          sourceIds: [
            MODEL_346_BASE_ORDER_SOURCE.id,
            MODEL_346_LATEST_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_300_399_REGISTER_DESIGNS_SOURCE,
    MODEL_346_PROCEDURE_HOME_SOURCE,
    MODEL_346_PROCEDURE_RECORD_SOURCE,
    MODEL_346_FILE_HELP_SOURCE,
    MODEL_346_REGISTER_DESIGN_SOURCE,
    MODEL_346_BASE_ORDER_SOURCE,
    MODEL_346_LATEST_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-346-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 346 · ejercicio 2024",
      sourceId: MODEL_346_REGISTER_DESIGN_SOURCE.id,
      landingPageSourceId: MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_346_2024.pdf",
      byteLength: 99073,
      pageCount: 11,
      sha256:
        "3e18eb2490685f5bd73a247d9606d9617f00527b2a5b79caf5edf1bd63df1edb",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-346-link-procedure",
      label: "Página oficial del Modelo 346",
      sourceId: MODEL_346_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_346_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-link-file-help",
      label: "Ayuda oficial de la vía mediante fichero",
      sourceId: MODEL_346_FILE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-link-register-designs",
      label: "Diseños de registro de los modelos 300 al 399",
      sourceId: MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-link-register-design",
      label: "Diseño de registro oficial del Modelo 346 · ejercicio 2024",
      sourceId: MODEL_346_REGISTER_DESIGN_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-link-base-order",
      label: "Orden de 7 de agosto de 2001",
      sourceId: MODEL_346_BASE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-link-latest-order",
      label: "Orden HAC/1504/2024, de 26 de diciembre",
      sourceId: MODEL_346_LATEST_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-346-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 346?",
      answer:
        "Una declaración informativa del IRPF sobre subvenciones e indemnizaciones satisfechas por entidades públicas o privadas a agricultores o ganaderos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_346_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-object",
      question: "¿Qué objeto recoge la ficha administrativa?",
      answer:
        "Facilitar la presentación de la declaración informativa anual de subvenciones e indemnizaciones satisfechas o abonadas a agricultores y ganaderos por entidades públicas o privadas.",
      sourceIds: [MODEL_346_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-channel",
      question: "¿Qué canal técnico documenta la AEAT?",
      answer:
        "La página oficial y la ayuda describen un canal electrónico basado en la carga de un fichero.",
      sourceIds: [
        MODEL_346_PROCEDURE_HOME_SOURCE.id,
        MODEL_346_PROCEDURE_RECORD_SOURCE.id,
        MODEL_346_FILE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-validation",
      question: "¿Validar el fichero equivale a presentarlo?",
      answer:
        "No. La ayuda técnica distingue expresamente la validación del fichero de la presentación posterior.",
      sourceIds: [MODEL_346_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-errors",
      question: "¿Qué diferencia hay entre los ficheros de errores?",
      answer:
        "Uno contiene los registros erróneos y otro ofrece, con carácter informativo, los mensajes asociados a esos errores.",
      sourceIds: [MODEL_346_FILE_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-design",
      question: "¿El fichero debe seguir un diseño publicado?",
      answer:
        "La ayuda técnica remite al diseño de registro publicado por la AEAT.",
      sourceIds: [
        MODEL_346_FILE_HELP_SOURCE.id,
        MODELS_300_399_REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-design-document",
      question: "¿El PDF técnico es un formulario para cumplimentar?",
      answer:
        "No. Es un documento de diseño de registro y se conserva sin miniatura de formulario y sin inferir su vigencia posterior.",
      sourceIds: [MODEL_346_REGISTER_DESIGN_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-346-faq-law",
      question: "¿Qué referencias normativas se enlazan?",
      answer:
        "El texto original de la Orden de 7 de agosto de 2001 y el de la Orden HAC/1504/2024, que modifica la orden del modelo.",
      sourceIds: [
        MODEL_346_BASE_ORDER_SOURCE.id,
        MODEL_346_LATEST_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_346_PROCEDURE_HOME_SOURCE.id,
      MODEL_346_PROCEDURE_RECORD_SOURCE.id,
      MODEL_346_FILE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"346">;

export const PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_CONTENT_V1 =
  deepFreeze([
    MODEL_296_CONTENT,
    MODEL_345_CONTENT,
    MODEL_346_CONTENT,
  ] as const);
