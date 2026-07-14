import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialAccessMethodV1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentFaqItemV1,
  type PublicAeatOfficialContentLinkV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_16_LATE_EXCISE_576_589_RELEASE_ID_V1 =
  "public-aeat-official-batch-16-late-excise-576-589.2026-07-14.v1" as const;

export type PublicAeatBatch16LateExcise576589CodeV1 =
  "576" | "581" | "582" | "583" | "584" | "585" | "586" | "587" | "588" | "589";

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

const MODEL_576_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-576.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 576 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G502.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "aae23086d228df01040b5d5cb44489c3657b7324c06c87f0d57bad8669846753",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_576_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-576.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 576 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G502.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "87167be12a1ade0b889f93c182e51276bc5a04cc71dfdd3a859650addb8261f5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_576_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-576.instructions.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 576 · instrucciones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-matriculacion/modelo-576-impue_____eterminados-medios-transporte-autoliquidacion_/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c29a44490d7324ece335dfcf19b551c130051f92c435cea8391dc37d4f2b55f0",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_576_INFORMATION_SOURCE = defineSource({
  id: "aeat.model-576.information.2026-03-03",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 576 · información sobre primera matriculación",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/modelo-576.html",
  officialUpdatedOn: "2026-03-03",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1bd65dfc52a489030636cb1c1363ca7d1474eb0478582544740043e83134a8f6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const AEAT_BATCH_PRESENTATION_HELP_SOURCE = defineSource({
  id: "aeat.help.batch-presentation.2026-01-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Cómo presentar declaraciones por lotes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/presentacion-lotes.html",
  officialUpdatedOn: "2026-01-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bfe3b260145e0a6413003e95d5b47c1e24ec7a8858eafd3d91895d8960a5f066",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODELS_581_582_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.models-581-582.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelos 581 y 582 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI06.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "45453c35b7d3226173d102497ca6d8fc1ce3d30afb3a29f13831353e9ddc2e6a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODELS_581_582_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.models-581-582.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelos 581 y 582 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DI06.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "74387515ccf49afc62835997f5bfaf0df2b954092c94f9bd89acf43033101b91",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODELS_581_582_ACTIONS_SOURCE = defineSource({
  id: "aeat.models-581-582.actions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelos 581 y 582 · gestiones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/tramitacion/DI06.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "dd8542ddc58156827bd0122a652d70d19d728eccee64c95a3b19a6a2e10dbe5e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODELS_583_588_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.models-583-588.procedure-home.2026-02-05",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelos 583 y 588 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR01.shtml",
  officialUpdatedOn: "2026-02-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "422404043397f1a453918dc26609164b4ae9b38f16d3d281b4809dc92df5662a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODELS_583_588_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.models-583-588.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelos 583 y 588 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR01.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "52d88d8d04353bdb0c83d00a23742915cdae747a4c68281392094069de095806",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODELS_583_588_ACTIONS_SOURCE = defineSource({
  id: "aeat.models-583-588.actions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelos 583 y 588 · gestiones oficiales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/tramitacion/DR01.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cbb818d955bf3f8ebdccc5a80d09fbd95214102fe976646086220ed59583033d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_583_INFORMATION_SOURCE = defineSource({
  id: "aeat.model-583.information-faq.2026-07-09",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title:
    "Impuesto sobre el valor de la producción de energía eléctrica · información y preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/impuesto-sobre-valor-produccion-energia-electrica.html",
  officialUpdatedOn: "2026-07-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "417a904c126f05d2bec6370693629aeb16c290fa557b0a6a51497f062b6244b2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_588_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-588.download.2026-03-10",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 588 · descarga oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuestos-medioambientales/modelo-583-impue_____a-electrica-autoliquidacion-fraccionados_/descarga-modelo-588.html",
  officialUpdatedOn: "2026-03-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "238e1a9ffa615abd2315f961aecec93b53bc28c5aed85496ddf978d1593d69b6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_588_FORM_SOURCE = defineSource({
  id: "aeat.model-588.form-pdf.2015-02-06",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formulario oficial del Modelo 588",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR01/modelo588_descarga.pdf",
  officialUpdatedOn: "2015-02-06",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b028db9ec4d8d94ce2b8090edabd97fbcc47cbe86be97fa9333b8d89e1bc73c3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_588_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-588.instructions-pdf.2015-02-06",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones oficiales del Modelo 588",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR01/modelo_588_Instrucciones.pdf",
  officialUpdatedOn: "2015-02-06",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "24cfbcc351fe953b9c4a53be151c696cf333bf330f4b1240ee630a88777b439c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_584_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-584.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 584 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3af31aee8dfb7af397bd7a4ea3a9b2525d6abbb47d874835ed989f12bcfbb50f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_584_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-584.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 584 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR02.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "891077c497416ed8131341b810a79f43567b0e041bcfeb4145e9fe20f04d7725",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_585_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-585.procedure-home.2026-02-05",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 585 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR03.shtml",
  officialUpdatedOn: "2026-02-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2fd4d0e368ca43bc328573ceeefdd9f714c063dcb78886b0e24d9206e2a337f7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_585_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-585.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 585 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR03.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "09b4278b5093b6b622217da7cc0aca39dfa4a43de896fa3213790c749913e0fa",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_585_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-585.download.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 585 · descarga oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuestos-medioambientales/modelo-585-impue_____ntralizadas-autoliquidacion-pagos-fraccionados_/descarga-modelo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a1721a8cebb5904300ebb45c2e3f60807bda59e17084f6d37c9d6d4163b12446",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_585_FORM_SOURCE = defineSource({
  id: "aeat.model-585.form-pdf.2013-04-10",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formulario oficial del Modelo 585",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR03/Modelo585.pdf",
  officialUpdatedOn: "2013-04-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a6dd3668292a128eae50c7ce8ea46db14a9a4d46a409b7331506fcf9c6b288c2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_585_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-585.instructions-pdf.2013-04-17",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones oficiales del Modelo 585",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR03/Instrucciones_585.pdf",
  officialUpdatedOn: "2013-04-17",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "982a5956474acf5d7b4561966d693da81f1521745b9bef61cb55b5d4031b5d39",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_586_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-586.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 586 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR08.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "75e5f1de14b97c32149e21fee60178065816069dcfa29dc1fa4546fa6cd0061e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_586_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-586.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 586 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR08.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "81614fd17e4bcee653b30aea63509843455040827d29adb802569c847b0a861f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-587.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 587 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "406d1174c02cdce210deca86c236246da83d6227b78870d5d580968d89f47475",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-587.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 587 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR10.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "eb3c3002780aabbed03310dd57f40e65120ba546f6588e86b38d148f5c94ec5d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_DOWNLOAD_SOURCE = defineSource({
  id: "aeat.model-587.download.2026-03-10",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 587 · descarga oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuestos-medioambientales/modelo-587-declaracion-liquidacion-gases-invernadero_/descarga-modelo.html",
  officialUpdatedOn: "2026-03-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "3cc6a605ad33b550b023af257242b8a51b561d18f9c22452beae320164ed4bb6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_FORM_SOURCE = defineSource({
  id: "aeat.model-587.form-pdf.2015-02-06",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Formulario oficial del Modelo 587",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR10/modelo_587_descarga.pdf",
  officialUpdatedOn: "2015-02-06",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "ba9b9c9bb9228d62144e4c889386c1f72319214a4180572d43ee41d66a89825e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_INSTRUCTIONS_SOURCE = defineSource({
  id: "aeat.model-587.instructions-pdf.2015-02-06",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones oficiales del Modelo 587",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DR10/modelo_587_Instrucciones.pdf",
  officialUpdatedOn: "2015-02-06",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7c91a958b3b820aaff8624417d244f8be86a30433a7e4ddd98d133d6949f70c5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_FAQ_LANDING_SOURCE = defineSource({
  id: "aeat.model-587.information-faq.2026-07-08",
  authority: "AEAT",
  kind: "FAQ_PAGE",
  title:
    "Impuesto sobre los Gases Fluorados de Efecto Invernadero · información y preguntas frecuentes",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/novedad-impuesto-sobre-gases-fluorados-partir.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d91d040b59db47e86c6540bd23de9e8f87f2d922e7af5f91841989ecf6978545",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_587_FAQ_PDF_SOURCE = defineSource({
  id: "aeat.model-587.faq-pdf.2024-04-04",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title:
    "Preguntas frecuentes del Impuesto sobre los Gases Fluorados de Efecto Invernadero",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/gases_fluorados2/FaQ_IGFEI_SC.pdf",
  officialUpdatedOn: "2024-04-04",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "21fe966bc5b70702f04e5101654ea9c44c1f4f31e503b15ae5710a73650cda75",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_589_PROCEDURE_HOME_SOURCE = defineSource({
  id: "aeat.model-589.procedure-home.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 589 · página oficial del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR13.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0e0bd34e56d259aa7a611c6cb6d92622727e16ae2d7cb24d64f36dda68a7ab2f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const MODEL_589_PROCEDURE_RECORD_SOURCE = defineSource({
  id: "aeat.model-589.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Modelo 589 · ficha del procedimiento",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/DR13.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a00a0b384b2cc30203569276c0c8fddf46fa305d88e4718087818dee421dc04b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_EHA_3851_2007_SOURCE = defineSource({
  id: "boe.order-eha-3851-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3851/2007, de 26 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-22442",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "156dd9804583cd0784f1eaaf25ffa44b3ae9d815583e54cf6b352ba754fac923",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_135_2019_SOURCE = defineSource({
  id: "boe.order-hac-135-2019.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/135/2019, de 31 de enero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-2144",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2e4d4ac96c0b142d7c1c68dd2c7121e97f5590a403cbc26c880cff32accffe3a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAP_703_2013_SOURCE = defineSource({
  id: "boe.order-hap-703-2013.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/703/2013, de 29 de abril",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-4538",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b33982ec04507ef4d4c3272f1c034756ea7a894a389f74bce6799c7a835c0c73",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HFP_1123_2022_SOURCE = defineSource({
  id: "boe.order-hfp-1123-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1123/2022, de 18 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-19289",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "323bf223be4ee8d17cb24b4a42816826423c061c7cac2747a3821347966c8229",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAP_538_2013_SOURCE = defineSource({
  id: "boe.order-hap-538-2013.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/538/2013, de 5 de abril",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2013-3671",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "cbd57b44fce73bfe18a647a16cb67f2699ea164bcc872dae774d2de29e99b3c3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_235_2019_SOURCE = defineSource({
  id: "boe.order-hac-235-2019.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/235/2019, de 25 de febrero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-3185",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "958d61ac37eb81ecbdf898dbb98239ca6fc0ff9c9a1875819d235f3f16befdf3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HFP_826_2022_SOURCE = defineSource({
  id: "boe.order-hfp-826-2022.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/826/2022, de 30 de agosto",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-14275",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c128b2778d14a3b1e3fac45cadc0b678c3e4bb7123f10c22ff2ef4f48a8322e5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAC_56_2026_SOURCE = defineSource({
  id: "boe.order-hac-56-2026.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/56/2026, de 22 de enero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2621",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a5f175ed1af1d45a1571257d40a36da5b4b41c9cde9e5923d881ab1b55d8c2bc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const ORDER_HAP_1349_2016_SOURCE = defineSource({
  id: "boe.order-hap-1349-2016.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/1349/2016, de 28 de julio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2016-7590",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4626849dbfccc4f500da6b02cdd24c0945ab553961b4632e3ff375f62a20647c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

type SourceTuple = readonly [
  PublicAeatOfficialContentSourceV1,
  ...PublicAeatOfficialContentSourceV1[],
];
type StringTuple = readonly [string, ...string[]];
type AccessTuple = readonly [
  PublicAeatOfficialAccessMethodV1,
  ...PublicAeatOfficialAccessMethodV1[],
];

interface Batch16LateModelBlueprint<
  Code extends PublicAeatBatch16LateExcise576589CodeV1,
> {
  readonly code: Code;
  readonly canonicalName: string;
  readonly summary: string;
  readonly searchTerms: StringTuple;
  readonly lifecycleStatus: "UNDETERMINED" | "HISTORICAL";
  readonly homeSource: PublicAeatOfficialContentSourceV1;
  readonly recordSource: PublicAeatOfficialContentSourceV1;
  readonly legalSource: PublicAeatOfficialContentSourceV1;
  readonly sources: SourceTuple;
  readonly purposeText: string;
  readonly procedureText: string;
  readonly channelText: string;
  readonly legalText: string;
  readonly resourceText: string;
  readonly purposeSourceIds: StringTuple;
  readonly channelSourceIds: StringTuple;
  readonly resourceSourceIds: StringTuple;
  readonly accessMethods: AccessTuple;
  readonly accessStatus: "SOURCE_DESCRIBED" | "SOURCE_DESCRIBED_HISTORICAL";
  readonly documents?: readonly PublicAeatOfficialContentDocumentV1[];
  readonly extraLinks?: readonly PublicAeatOfficialContentLinkV1[];
  readonly extraFaq?: readonly PublicAeatOfficialContentFaqItemV1[];
}

function defineModel<
  const Code extends PublicAeatBatch16LateExcise576589CodeV1,
>(
  input: Batch16LateModelBlueprint<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  return {
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId: PUBLIC_AEAT_BATCH_16_LATE_EXCISE_576_589_RELEASE_ID_V1,
    code: input.code,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: input.lifecycleStatus,
    reviewedOn: REVIEWED_ON,
    canonicalName: input.canonicalName,
    summary: input.summary,
    searchTerms: input.searchTerms,
    sections: [
      {
        id: `model-${input.code}-purpose`,
        title: "Qué identifica este modelo",
        kind: "PURPOSE",
        items: [
          {
            id: `model-${input.code}-purpose-identity`,
            heading: "Identidad oficial",
            text: input.purposeText,
            sourceIds: input.purposeSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${input.code}-purpose-procedure`,
            heading: "Descripción del procedimiento",
            text: input.procedureText,
            sourceIds: [input.recordSource.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${input.code}-details`,
        title: "Información oficial disponible",
        kind: "DETAILS",
        items: [
          {
            id: `model-${input.code}-details-record`,
            heading: "Ficha administrativa",
            text: "La ficha administrativa clasifica el procedimiento como tributario, identifica a la Agencia Estatal de Administración Tributaria como órgano responsable y describe su tramitación electrónica.",
            sourceIds: [input.recordSource.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${input.code}-details-resources`,
            heading: "Recursos oficiales",
            text: input.resourceText,
            sourceIds: input.resourceSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${input.code}-details-legal`,
            heading: "Publicación oficial",
            text: input.legalText,
            sourceIds: [input.legalSource.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${input.code}-access`,
        title: "Canal descrito por la AEAT",
        kind: "ACCESS",
        items: [
          {
            id: `model-${input.code}-access-channel`,
            heading:
              input.accessStatus === "SOURCE_DESCRIBED_HISTORICAL"
                ? "Gestiones históricas identificadas"
                : "Tramitación electrónica identificada",
            text: input.channelText,
            sourceIds: input.channelSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
    ],
    sources: input.sources,
    documents: input.documents ?? [],
    thumbnail: null,
    links: [
      {
        id: `model-${input.code}-link-procedure`,
        label: `Página oficial del Modelo ${input.code}`,
        sourceId: input.homeSource.id,
        category: "PROCEDURE",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-link-record`,
        label: "Ficha oficial del procedimiento",
        sourceId: input.recordSource.id,
        category: "PROCEDURE",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-link-legal`,
        label: input.legalSource.title,
        sourceId: input.legalSource.id,
        category: "LEGAL",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      ...(input.extraLinks ?? []),
    ],
    faq: [
      {
        id: `model-${input.code}-faq-identity`,
        question: `¿Qué identifica la AEAT como Modelo ${input.code}?`,
        answer: input.canonicalName,
        sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-faq-purpose`,
        question: "¿Qué describe la ficha oficial del procedimiento?",
        answer: input.procedureText,
        sourceIds: [input.recordSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-faq-type`,
        question: "¿Cómo clasifica la AEAT este procedimiento?",
        answer:
          "La ficha administrativa lo clasifica como procedimiento tributario.",
        sourceIds: [input.recordSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-faq-owner`,
        question: "¿Qué órgano figura como responsable?",
        answer: "La Agencia Estatal de Administración Tributaria.",
        sourceIds: [input.recordSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-faq-channel`,
        question: "¿Qué canal informa la AEAT para este modelo?",
        answer: input.channelText,
        sourceIds: input.channelSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-faq-resources`,
        question: "¿Qué recursos oficiales reúne esta ficha?",
        answer: input.resourceText,
        sourceIds: input.resourceSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${input.code}-faq-legal`,
        question: "¿Qué publicación oficial se enlaza como referencia?",
        answer: input.legalText,
        sourceIds: [input.legalSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      ...(input.extraFaq ?? []),
    ],
    accessMethods: {
      methods: input.accessMethods,
      status: input.accessStatus,
      sourceIds: input.channelSourceIds,
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    externalNavigation: null,
    limitations: LIMITATIONS,
  };
}

const MODEL_576_CONTENT = defineModel({
  code: "576",
  canonicalName:
    "Impuesto Especial sobre Determinados Medios de Transporte. Autoliquidación",
  summary:
    "La AEAT identifica el Modelo 576 como la autoliquidación del Impuesto Especial sobre Determinados Medios de Transporte, conocido en su ficha como Impuesto de Matriculación.",
  searchTerms: [
    "modelo 576",
    "impuesto matriculación",
    "medios de transporte",
    "autoliquidación matriculación",
    "presentación por lotes",
    "instrucciones modelo 576",
    "código electrónico de matriculación CEM",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODEL_576_PROCEDURE_HOME_SOURCE,
  recordSource: MODEL_576_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_EHA_3851_2007_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_576_PROCEDURE_HOME_SOURCE,
    MODEL_576_PROCEDURE_RECORD_SOURCE,
    MODEL_576_INSTRUCTIONS_SOURCE,
    MODEL_576_INFORMATION_SOURCE,
    AEAT_BATCH_PRESENTATION_HELP_SOURCE,
    ORDER_EHA_3851_2007_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 576 como la autoliquidación del Impuesto Especial sobre Determinados Medios de Transporte.",
  procedureText:
    "La ficha administrativa indica que su objeto es facilitar la presentación de la declaración del Impuesto sobre Determinados Medios de Transporte, conocido como Impuesto de Matriculación.",
  channelText:
    "La página oficial distingue la presentación electrónica individual y la presentación por lotes; la ayuda de lotes describe el envío de un fichero de declaraciones mediante el servicio oficial.",
  legalText:
    "La publicación oficial de la Orden EHA/3851/2007 aprueba el Modelo 576 de autoliquidación.",
  resourceText:
    "La AEAT reúne la página del procedimiento, su ficha administrativa, instrucciones de cumplimentación, ayuda para lotes y una explicación temática sobre el uso general del modelo y el Código Electrónico de Matriculación (CEM).",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODEL_576_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [
    MODEL_576_PROCEDURE_HOME_SOURCE.id,
    AEAT_BATCH_PRESENTATION_HELP_SOURCE.id,
  ],
  resourceSourceIds: [
    MODEL_576_PROCEDURE_HOME_SOURCE.id,
    MODEL_576_PROCEDURE_RECORD_SOURCE.id,
    MODEL_576_INSTRUCTIONS_SOURCE.id,
    MODEL_576_INFORMATION_SOURCE.id,
    AEAT_BATCH_PRESENTATION_HELP_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM", "FILE_UPLOAD"],
  accessStatus: "SOURCE_DESCRIBED",
  extraLinks: [
    {
      id: "model-576-link-information",
      label: "Información oficial sobre el Modelo 576 y la matriculación",
      sourceId: MODEL_576_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  extraFaq: [
    {
      id: "model-576-faq-cem",
      question:
        "¿Qué resultado identifica la información temática del Modelo 576?",
      answer:
        "La página de la AEAT indica que como resultado se obtiene un Código Electrónico de Matriculación (CEM).",
      sourceIds: [MODEL_576_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
});

const MODEL_581_CONTENT = defineModel({
  code: "581",
  canonicalName: "Impuesto sobre Hidrocarburos. Declaración-liquidación.",
  summary:
    "La AEAT identifica el Modelo 581 como la declaración-liquidación del Impuesto sobre Hidrocarburos y mantiene una presentación diferenciada para 2019 y ejercicios siguientes.",
  searchTerms: [
    "modelo 581",
    "impuesto sobre hidrocarburos",
    "declaración liquidación hidrocarburos",
    "impuestos especiales",
    "presentación 2019 y siguientes",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODELS_581_582_PROCEDURE_HOME_SOURCE,
  recordSource: MODELS_581_582_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAC_135_2019_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_581_582_PROCEDURE_HOME_SOURCE,
    MODELS_581_582_PROCEDURE_RECORD_SOURCE,
    MODELS_581_582_ACTIONS_SOURCE,
    ORDER_HAC_135_2019_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 581 como la declaración-liquidación del Impuesto sobre Hidrocarburos.",
  procedureText:
    "La ficha administrativa describe el cumplimiento de requisitos formales para presentar declaraciones-liquidaciones de productos objeto de los Impuestos Especiales.",
  channelText:
    "La página de gestiones ofrece la presentación electrónica del Modelo 581 para 2019 y ejercicios siguientes y conserva separadamente el acceso de 2018 y anteriores.",
  legalText:
    "La publicación oficial de la Orden HAC/135/2019 modifica la Orden EHA/3482/2007 relativa a diversos modelos de Impuestos Especiales.",
  resourceText:
    "La AEAT reúne la página principal, la ficha administrativa y una página de gestiones que diferencia los accesos del Modelo 581 por ejercicios.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODELS_581_582_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [MODELS_581_582_ACTIONS_SOURCE.id],
  resourceSourceIds: [
    MODELS_581_582_PROCEDURE_HOME_SOURCE.id,
    MODELS_581_582_PROCEDURE_RECORD_SOURCE.id,
    MODELS_581_582_ACTIONS_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED",
});

const MODEL_582_CONTENT = defineModel({
  code: "582",
  canonicalName:
    "Impuesto sobre Hidrocarburos. Regularización por reexpedición de productos a otra Comunidad Autónoma.",
  summary:
    "La AEAT identifica el Modelo 582 con la regularización por reexpedición de productos a otra Comunidad Autónoma y limita sus gestiones publicadas a 2018 y ejercicios anteriores.",
  searchTerms: [
    "modelo 582",
    "reexpedición hidrocarburos",
    "otra comunidad autónoma",
    "regularización hidrocarburos",
    "reexpedidores",
    "ejercicio 2018 y anteriores",
  ],
  lifecycleStatus: "HISTORICAL",
  homeSource: MODELS_581_582_PROCEDURE_HOME_SOURCE,
  recordSource: MODELS_581_582_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAC_135_2019_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_581_582_PROCEDURE_HOME_SOURCE,
    MODELS_581_582_PROCEDURE_RECORD_SOURCE,
    MODELS_581_582_ACTIONS_SOURCE,
    ORDER_HAC_135_2019_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 582 con la regularización por reexpedición de productos a otra Comunidad Autónoma.",
  procedureText:
    "La ficha administrativa compartida describe el cumplimiento de requisitos formales para presentar declaraciones-liquidaciones de productos objeto de los Impuestos Especiales.",
  channelText:
    "La página oficial solo publica para el Modelo 582 gestiones de reexpedidores correspondientes a 2018 y ejercicios anteriores; por eso esta ficha lo presenta como histórico y no presupone un canal vigente.",
  legalText:
    "La publicación oficial de la Orden HAC/135/2019 modifica la Orden EHA/3482/2007 relativa a diversos modelos de Impuestos Especiales.",
  resourceText:
    "La AEAT conserva el índice oficial y la página de gestiones compartida, donde pago, presentación y consulta del Modelo 582 figuran expresamente para 2018 y anteriores.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODELS_581_582_ACTIONS_SOURCE.id,
  ],
  channelSourceIds: [MODELS_581_582_ACTIONS_SOURCE.id],
  resourceSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODELS_581_582_ACTIONS_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED_HISTORICAL",
});

const MODEL_583_CONTENT = defineModel({
  code: "583",
  canonicalName:
    "Impuesto sobre el valor de la producción de la energía eléctrica. Autoliquidación y Pagos Fraccionados.",
  summary:
    "La AEAT identifica el Modelo 583 como la autoliquidación y los pagos fraccionados del Impuesto sobre el valor de la producción de la energía eléctrica.",
  searchTerms: [
    "modelo 583",
    "producción energía eléctrica",
    "valor producción eléctrica",
    "autoliquidación energía",
    "pagos fraccionados",
    "IVPEE",
    "preguntas frecuentes producción eléctrica",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODELS_583_588_PROCEDURE_HOME_SOURCE,
  recordSource: MODELS_583_588_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAP_703_2013_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_583_588_PROCEDURE_HOME_SOURCE,
    MODELS_583_588_PROCEDURE_RECORD_SOURCE,
    MODELS_583_588_ACTIONS_SOURCE,
    MODEL_583_INFORMATION_SOURCE,
    ORDER_HAP_703_2013_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 583 como la autoliquidación y los pagos fraccionados del impuesto sobre el valor de la producción de la energía eléctrica.",
  procedureText:
    "La ficha administrativa señala que el objeto del procedimiento es gravar la producción de energía eléctrica y documenta el Modelo 583 dentro de la tramitación electrónica.",
  channelText:
    "La AEAT ofrece una gestión electrónica diferenciada para presentar la autoliquidación del Modelo 583.",
  legalText:
    "La publicación oficial de la Orden HAP/703/2013 aprueba el Modelo 583 y establece la forma y el procedimiento para su presentación.",
  resourceText:
    "La AEAT reúne la página conjunta 583/588, la ficha administrativa, la relación de gestiones y una página temática con preguntas y respuestas generales que distingue el Modelo 583 del Modelo 588 y enlaza el servicio INFORMA.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODELS_583_588_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [
    MODELS_583_588_PROCEDURE_HOME_SOURCE.id,
    MODELS_583_588_ACTIONS_SOURCE.id,
  ],
  resourceSourceIds: [
    MODELS_583_588_PROCEDURE_HOME_SOURCE.id,
    MODELS_583_588_PROCEDURE_RECORD_SOURCE.id,
    MODELS_583_588_ACTIONS_SOURCE.id,
    MODEL_583_INFORMATION_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED",
  extraLinks: [
    {
      id: "model-583-link-information-faq",
      label:
        "Información y preguntas frecuentes oficiales sobre producción de energía eléctrica",
      sourceId: MODEL_583_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  extraFaq: [
    {
      id: "model-583-faq-thematic-models",
      question: "¿Qué modelos reúne la información temática de este impuesto?",
      answer:
        "La página de la AEAT reúne los modelos 583 y 588 para autoliquidaciones y el Modelo 591 para la declaración anual de operaciones.",
      sourceIds: [MODEL_583_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-583-faq-official-help",
      question: "¿Dónde publica la AEAT preguntas y respuestas generales?",
      answer:
        "En la página temática del impuesto, que incorpora preguntas y respuestas y enlaza además el servicio INFORMA.",
      sourceIds: [MODEL_583_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
});

const MODEL_584_CONTENT = defineModel({
  code: "584",
  canonicalName:
    "Impuesto sobre la producción de combustible nuclear gastado y residuos radioactivos resultantes de la generación de energía nucleoeléctrica. Autoliquidación y pagos fraccionados.",
  summary:
    "La AEAT identifica el Modelo 584 con la autoliquidación y los pagos fraccionados del impuesto sobre la producción de combustible nuclear gastado y residuos radioactivos de la generación nucleoeléctrica.",
  searchTerms: [
    "modelo 584",
    "combustible nuclear gastado",
    "residuos radioactivos",
    "generación nucleoeléctrica",
    "autoliquidación nuclear",
    "pagos fraccionados",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODEL_584_PROCEDURE_HOME_SOURCE,
  recordSource: MODEL_584_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAP_538_2013_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_584_PROCEDURE_HOME_SOURCE,
    MODEL_584_PROCEDURE_RECORD_SOURCE,
    ORDER_HAP_538_2013_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 584 con la autoliquidación y los pagos fraccionados del impuesto sobre la producción de combustible nuclear gastado y residuos radioactivos resultantes de la generación nucleoeléctrica.",
  procedureText:
    "La ficha administrativa indica que el procedimiento grava la producción de combustible nuclear gastado y residuos radioactivos resultantes de la generación de energía nuclear.",
  channelText:
    "La página del procedimiento ofrece la presentación electrónica del Modelo 584 y la ficha administrativa califica el lugar de presentación como telemático.",
  legalText:
    "La publicación oficial de la Orden HAP/538/2013 aprueba los modelos 584 y 585 y establece la forma y el procedimiento para su presentación.",
  resourceText:
    "La AEAT reúne una página propia del Modelo 584 y una ficha administrativa con su objeto, documentación y tramitación electrónica.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODEL_584_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [
    MODEL_584_PROCEDURE_HOME_SOURCE.id,
    MODEL_584_PROCEDURE_RECORD_SOURCE.id,
  ],
  resourceSourceIds: [
    MODEL_584_PROCEDURE_HOME_SOURCE.id,
    MODEL_584_PROCEDURE_RECORD_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED",
});

const MODEL_585_CONTENT = defineModel({
  code: "585",
  canonicalName:
    "Impuesto sobre el almacenamiento de combustible nuclear gastado y residuos radioactivos en instalaciones centralizadas. Autoliquidación y pagos fraccionados.",
  summary:
    "La AEAT identifica el Modelo 585 con la autoliquidación y los pagos fraccionados del impuesto sobre el almacenamiento centralizado de combustible nuclear gastado y residuos radioactivos.",
  searchTerms: [
    "modelo 585",
    "almacenamiento combustible nuclear",
    "residuos radioactivos",
    "instalaciones centralizadas",
    "autoliquidación nuclear",
    "registro electrónico",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODEL_585_PROCEDURE_HOME_SOURCE,
  recordSource: MODEL_585_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAP_538_2013_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_585_PROCEDURE_HOME_SOURCE,
    MODEL_585_PROCEDURE_RECORD_SOURCE,
    MODEL_585_DOWNLOAD_SOURCE,
    MODEL_585_FORM_SOURCE,
    MODEL_585_INSTRUCTIONS_SOURCE,
    ORDER_HAP_538_2013_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 585 con la autoliquidación y los pagos fraccionados del impuesto sobre el almacenamiento de combustible nuclear gastado y residuos radioactivos en instalaciones centralizadas.",
  procedureText:
    "La ficha administrativa indica que el procedimiento grava el almacenamiento de combustible nuclear y residuos radioactivos en instalaciones centralizadas.",
  channelText:
    "La página oficial dirige la presentación del Modelo 585 al registro electrónico de la AEAT; esta ficha lo representa como transferencia administrativa y no como formulario web de cumplimentación.",
  legalText:
    "La publicación oficial de la Orden HAP/538/2013 aprueba los modelos 584 y 585 y establece la forma y el procedimiento para su presentación.",
  resourceText:
    "La AEAT reúne la página propia, la ficha administrativa y una descarga con formulario e instrucciones. Ambos PDF se registran como referencias externas antiguas y sin miniatura; la ayuda exige descarga local, Adobe Reader y JavaScript para el formulario.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODEL_585_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [MODEL_585_PROCEDURE_HOME_SOURCE.id],
  resourceSourceIds: [
    MODEL_585_PROCEDURE_HOME_SOURCE.id,
    MODEL_585_PROCEDURE_RECORD_SOURCE.id,
    MODEL_585_DOWNLOAD_SOURCE.id,
    MODEL_585_FORM_SOURCE.id,
    MODEL_585_INSTRUCTIONS_SOURCE.id,
  ],
  accessMethods: ["ADMINISTRATIVE_TRANSFER"],
  accessStatus: "SOURCE_DESCRIBED",
  documents: [
    {
      id: "model-585-form-document",
      kind: "FORM",
      title: "Formulario oficial del Modelo 585",
      sourceId: MODEL_585_FORM_SOURCE.id,
      landingPageSourceId: MODEL_585_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Modelo585.pdf",
      byteLength: 366675,
      pageCount: 2,
      sha256:
        "a6dd3668292a128eae50c7ce8ea46db14a9a4d46a409b7331506fcf9c6b288c2",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-585-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 585",
      sourceId: MODEL_585_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_585_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Instrucciones_585.pdf",
      byteLength: 194632,
      pageCount: 5,
      sha256:
        "982a5956474acf5d7b4561966d693da81f1521745b9bef61cb55b5d4031b5d39",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  extraLinks: [
    {
      id: "model-585-link-download",
      label: "Página oficial de descarga del Modelo 585",
      sourceId: MODEL_585_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-585-link-form",
      label: "Formulario oficial externo del Modelo 585 (referencia antigua)",
      sourceId: MODEL_585_FORM_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-585-link-instructions",
      label:
        "Instrucciones oficiales externas del Modelo 585 (referencia antigua)",
      sourceId: MODEL_585_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  extraFaq: [
    {
      id: "model-585-faq-pdf-safety",
      question: "¿Por qué no se muestra una miniatura del formulario PDF?",
      answer:
        "La página oficial indica que el formulario debe descargarse y abrirse localmente con Adobe Reader y que utiliza JavaScript para generar el justificante; además, el PDF auditado conserva metadatos de 2013.",
      sourceIds: [MODEL_585_DOWNLOAD_SOURCE.id, MODEL_585_FORM_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
});

const MODEL_586_CONTENT = defineModel({
  code: "586",
  canonicalName: "Declaración Informativa. Gases Fluorados",
  summary:
    "La AEAT identifica el Modelo 586 como declaración informativa de gases fluorados; sus accesos de presentación visibles se limitan a operaciones realizadas hasta el 31 de agosto de 2022 o a ejercicios anteriores.",
  searchTerms: [
    "modelo 586",
    "declaración informativa gases fluorados",
    "hidrofluorocarburos",
    "perfluorocarburos",
    "hexafluoruro de azufre",
    "importación de fichero",
    "modelo histórico gases fluorados",
  ],
  lifecycleStatus: "HISTORICAL",
  homeSource: MODEL_586_PROCEDURE_HOME_SOURCE,
  recordSource: MODEL_586_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAC_235_2019_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_586_PROCEDURE_HOME_SOURCE,
    MODEL_586_PROCEDURE_RECORD_SOURCE,
    ORDER_HAC_235_2019_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 586 como la declaración informativa de gases fluorados.",
  procedureText:
    "La ficha administrativa lo sitúa en el procedimiento tributario relativo al consumo de hidrofluorocarburos, perfluorocarburos y hexafluoruro de azufre.",
  channelText:
    "La página oficial conserva presentaciones en línea y con importación de fichero para ejercicios anteriores y para operaciones hasta el 31 de agosto de 2022; esta ficha no las presenta como un canal vigente posterior.",
  legalText:
    "La publicación oficial de la Orden HAC/235/2019 modifica la orden que aprueba el Modelo 586 de declaración informativa de gases fluorados.",
  resourceText:
    "La AEAT conserva la página y la ficha administrativa del procedimiento, con accesos diferenciados por ejercicio y modalidad de presentación histórica.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODEL_586_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [MODEL_586_PROCEDURE_HOME_SOURCE.id],
  resourceSourceIds: [
    MODEL_586_PROCEDURE_HOME_SOURCE.id,
    MODEL_586_PROCEDURE_RECORD_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM", "FILE_UPLOAD"],
  accessStatus: "SOURCE_DESCRIBED_HISTORICAL",
});

const MODEL_587_CONTENT = defineModel({
  code: "587",
  canonicalName: "Declaración-Liquidación Gases Fluorados Efecto Invernadero.",
  summary:
    "La AEAT identifica el Modelo 587 como la autoliquidación del Impuesto sobre los Gases Fluorados de Efecto Invernadero y diferencia la versión actual de accesos anteriores o especiales.",
  searchTerms: [
    "modelo 587",
    "gases fluorados efecto invernadero",
    "autoliquidación gases fluorados",
    "hidrofluorocarburos",
    "perfluorocarburos",
    "hexafluoruro de azufre",
    "Orden HFP 826 2022",
    "preguntas frecuentes gases fluorados",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODEL_587_PROCEDURE_HOME_SOURCE,
  recordSource: MODEL_587_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HFP_826_2022_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_587_PROCEDURE_HOME_SOURCE,
    MODEL_587_PROCEDURE_RECORD_SOURCE,
    MODEL_587_DOWNLOAD_SOURCE,
    MODEL_587_FORM_SOURCE,
    MODEL_587_INSTRUCTIONS_SOURCE,
    MODEL_587_FAQ_LANDING_SOURCE,
    MODEL_587_FAQ_PDF_SOURCE,
    ORDER_HFP_826_2022_SOURCE,
    ORDER_HAC_56_2026_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 587 como declaración-liquidación de gases fluorados de efecto invernadero.",
  procedureText:
    "La ficha administrativa lo describe como modelo de autoliquidación para el consumo de hidrofluorocarburos, perfluorocarburos y hexafluoruro de azufre.",
  channelText:
    "La página oficial distingue la presentación actual regulada por la Orden HFP/826/2022 de la regularización de existencias y del acceso asociado a la regulación anterior; esta ficha solo caracteriza como actual el primero.",
  legalText:
    "La publicación oficial de la Orden HFP/826/2022 aprueba el Modelo 587 y determina la forma y el procedimiento para su presentación.",
  resourceText:
    "La AEAT reúne la página propia, la ficha administrativa, una página temática actual con un PDF de preguntas frecuentes y una descarga que aún enlaza formulario e instrucciones de 2015; estos dos últimos se conservan solo como referencias externas antiguas y sin miniatura.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODEL_587_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [
    MODEL_587_PROCEDURE_HOME_SOURCE.id,
    ORDER_HFP_826_2022_SOURCE.id,
  ],
  resourceSourceIds: [
    MODEL_587_PROCEDURE_HOME_SOURCE.id,
    MODEL_587_PROCEDURE_RECORD_SOURCE.id,
    MODEL_587_DOWNLOAD_SOURCE.id,
    MODEL_587_FORM_SOURCE.id,
    MODEL_587_INSTRUCTIONS_SOURCE.id,
    MODEL_587_FAQ_LANDING_SOURCE.id,
    MODEL_587_FAQ_PDF_SOURCE.id,
    ORDER_HFP_826_2022_SOURCE.id,
    ORDER_HAC_56_2026_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED",
  documents: [
    {
      id: "model-587-faq-document",
      kind: "GUIDE",
      title:
        "Preguntas frecuentes del Impuesto sobre los Gases Fluorados de Efecto Invernadero",
      sourceId: MODEL_587_FAQ_PDF_SOURCE.id,
      landingPageSourceId: MODEL_587_FAQ_LANDING_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "FaQ_IGFEI_SC.pdf",
      byteLength: 97434,
      pageCount: 16,
      sha256:
        "21fe966bc5b70702f04e5101654ea9c44c1f4f31e503b15ae5710a73650cda75",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-587-form-document",
      kind: "FORM",
      title: "Formulario oficial del Modelo 587 (referencia de 2015)",
      sourceId: MODEL_587_FORM_SOURCE.id,
      landingPageSourceId: MODEL_587_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "modelo_587_descarga.pdf",
      byteLength: 80976,
      pageCount: 1,
      sha256:
        "ba9b9c9bb9228d62144e4c889386c1f72319214a4180572d43ee41d66a89825e",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-587-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 587 (referencia de 2015)",
      sourceId: MODEL_587_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_587_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "modelo_587_Instrucciones.pdf",
      byteLength: 74488,
      pageCount: 2,
      sha256:
        "7c91a958b3b820aaff8624417d244f8be86a30433a7e4ddd98d133d6949f70c5",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  extraLinks: [
    {
      id: "model-587-link-faq-landing",
      label: "Información y preguntas frecuentes oficiales del impuesto",
      sourceId: MODEL_587_FAQ_LANDING_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-587-link-faq-pdf",
      label: "PDF oficial de preguntas frecuentes",
      sourceId: MODEL_587_FAQ_PDF_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-587-link-download",
      label: "Página oficial de descarga del Modelo 587",
      sourceId: MODEL_587_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-587-link-form",
      label: "Formulario oficial externo del Modelo 587 (referencia de 2015)",
      sourceId: MODEL_587_FORM_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-587-link-instructions",
      label:
        "Instrucciones oficiales externas del Modelo 587 (referencia de 2015)",
      sourceId: MODEL_587_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  extraFaq: [
    {
      id: "model-587-faq-topics",
      question: "¿Qué temas organiza el PDF oficial de preguntas frecuentes?",
      answer:
        "El documento organiza preguntas sobre el ámbito objetivo, el registro territorial, la figura del almacenista y las exenciones, entre otras materias del impuesto.",
      sourceIds: [MODEL_587_FAQ_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-587-faq-gases",
      question: "¿Qué grupos de gases menciona la ayuda oficial?",
      answer:
        "La ayuda cita hidrofluorocarburos (HFC), perfluorocarburos (PFC), hexafluoruro de azufre (SF6) y mezclas que contienen alguno de esos gases.",
      sourceIds: [MODEL_587_FAQ_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
});

const MODEL_588_CONTENT = defineModel({
  code: "588",
  canonicalName:
    "Impuesto sobre el valor de la producción de la energía eléctrica. Autoliquidación por cese de actividad de enero a octubre",
  summary:
    "La AEAT identifica el Modelo 588 como la autoliquidación del impuesto sobre el valor de la producción de la energía eléctrica por cese de actividad de enero a octubre.",
  searchTerms: [
    "modelo 588",
    "cese actividad energía eléctrica",
    "producción energía eléctrica",
    "autoliquidación por cese",
    "enero a octubre",
    "IVPEE",
    "preguntas frecuentes producción eléctrica",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODELS_583_588_PROCEDURE_HOME_SOURCE,
  recordSource: MODELS_583_588_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HFP_1123_2022_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODELS_583_588_PROCEDURE_HOME_SOURCE,
    MODELS_583_588_PROCEDURE_RECORD_SOURCE,
    MODELS_583_588_ACTIONS_SOURCE,
    MODEL_583_INFORMATION_SOURCE,
    MODEL_588_DOWNLOAD_SOURCE,
    MODEL_588_FORM_SOURCE,
    MODEL_588_INSTRUCTIONS_SOURCE,
    ORDER_HFP_1123_2022_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 588 como la autoliquidación por cese de actividad de enero a octubre del impuesto sobre el valor de la producción de la energía eléctrica.",
  procedureText:
    "La ficha administrativa compartida indica que el objeto del procedimiento es gravar la producción de energía eléctrica y documenta su tramitación electrónica.",
  channelText:
    "La página oficial ofrece una gestión electrónica diferenciada para presentar la autoliquidación del Modelo 588.",
  legalText:
    "La publicación oficial de la Orden HFP/1123/2022 modifica la regulación de los modelos del impuesto y contiene la referencia al Modelo 588.",
  resourceText:
    "La AEAT reúne la página conjunta 583/588, la ficha administrativa, una página temática con preguntas y respuestas y la descarga del Modelo 588. El formulario y las instrucciones enlazados datan de 2015 y se conservan solo como referencias externas antiguas y sin miniatura.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODELS_583_588_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [
    MODELS_583_588_PROCEDURE_HOME_SOURCE.id,
    MODELS_583_588_ACTIONS_SOURCE.id,
  ],
  resourceSourceIds: [
    MODELS_583_588_PROCEDURE_HOME_SOURCE.id,
    MODELS_583_588_PROCEDURE_RECORD_SOURCE.id,
    MODELS_583_588_ACTIONS_SOURCE.id,
    MODEL_583_INFORMATION_SOURCE.id,
    MODEL_588_DOWNLOAD_SOURCE.id,
    MODEL_588_FORM_SOURCE.id,
    MODEL_588_INSTRUCTIONS_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED",
  documents: [
    {
      id: "model-588-form-document",
      kind: "FORM",
      title: "Formulario oficial del Modelo 588 (referencia de 2015)",
      sourceId: MODEL_588_FORM_SOURCE.id,
      landingPageSourceId: MODEL_588_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "modelo588_descarga.pdf",
      byteLength: 74312,
      pageCount: 1,
      sha256:
        "b028db9ec4d8d94ce2b8090edabd97fbcc47cbe86be97fa9333b8d89e1bc73c3",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-588-instructions-document",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 588 (referencia de 2015)",
      sourceId: MODEL_588_INSTRUCTIONS_SOURCE.id,
      landingPageSourceId: MODEL_588_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "modelo_588_Instrucciones.pdf",
      byteLength: 48654,
      pageCount: 3,
      sha256:
        "24cfbcc351fe953b9c4a53be151c696cf333bf330f4b1240ee630a88777b439c",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  extraLinks: [
    {
      id: "model-588-link-information-faq",
      label:
        "Información y preguntas frecuentes oficiales sobre producción de energía eléctrica",
      sourceId: MODEL_583_INFORMATION_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-588-link-download",
      label: "Página oficial de descarga del Modelo 588",
      sourceId: MODEL_588_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-588-link-form",
      label: "Formulario oficial externo del Modelo 588 (referencia de 2015)",
      sourceId: MODEL_588_FORM_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-588-link-instructions",
      label:
        "Instrucciones oficiales externas del Modelo 588 (referencia de 2015)",
      sourceId: MODEL_588_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  extraFaq: [
    {
      id: "model-588-faq-official-help",
      question: "¿Dónde publica la AEAT información general relacionada?",
      answer:
        "En la página temática del Impuesto sobre el valor de la producción de energía eléctrica, que reúne preguntas y respuestas y enlaza el servicio INFORMA.",
      sourceIds: [MODEL_583_INFORMATION_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-588-faq-legacy-documents",
      question: "¿Qué antigüedad tienen los PDF enlazados en la descarga?",
      answer:
        "El formulario y las instrucciones auditados conservan metadatos de febrero de 2015, por lo que esta ficha los trata como referencias externas antiguas y no como documentos actuales.",
      sourceIds: [MODEL_588_FORM_SOURCE.id, MODEL_588_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
});

const MODEL_589_CONTENT = defineModel({
  code: "589",
  canonicalName:
    "Impuesto sobre el valor de la extracción de gas, petróleo y condensación. Autoliquidación y pago fraccionado.",
  summary:
    "La AEAT identifica el Modelo 589 con la autoliquidación y el pago fraccionado del Impuesto sobre el valor de la extracción de gas, petróleo y condensados.",
  searchTerms: [
    "modelo 589",
    "extracción gas petróleo condensados",
    "yacimientos hidrocarburos",
    "autoliquidación extracción",
    "pago fraccionado",
    "impuesto hidrocarburos extracción",
  ],
  lifecycleStatus: "UNDETERMINED",
  homeSource: MODEL_589_PROCEDURE_HOME_SOURCE,
  recordSource: MODEL_589_PROCEDURE_RECORD_SOURCE,
  legalSource: ORDER_HAP_1349_2016_SOURCE,
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_589_PROCEDURE_HOME_SOURCE,
    MODEL_589_PROCEDURE_RECORD_SOURCE,
    ORDER_HAP_1349_2016_SOURCE,
  ],
  purposeText:
    "El índice oficial identifica el Modelo 589 con la autoliquidación y el pago fraccionado del impuesto sobre el valor de la extracción de gas, petróleo y condensados.",
  procedureText:
    "La ficha administrativa indica que el impuesto grava la extracción en territorio español de gas, petróleo y condensados en concesiones de explotación de yacimientos de hidrocarburos.",
  channelText:
    "La página oficial ofrece la presentación electrónica de la autoliquidación y la ficha administrativa sitúa el lugar de presentación en la Sede electrónica de la AEAT.",
  legalText:
    "La publicación oficial de la Orden HAP/1349/2016 aprueba el Modelo 589 y establece su forma y procedimiento de presentación.",
  resourceText:
    "La AEAT reúne la página propia del Modelo 589 y una ficha administrativa con el objeto, las fases generales y la tramitación electrónica del procedimiento.",
  purposeSourceIds: [
    OFFICIAL_MODEL_INDEX_SOURCE.id,
    MODEL_589_PROCEDURE_HOME_SOURCE.id,
  ],
  channelSourceIds: [
    MODEL_589_PROCEDURE_HOME_SOURCE.id,
    MODEL_589_PROCEDURE_RECORD_SOURCE.id,
  ],
  resourceSourceIds: [
    MODEL_589_PROCEDURE_HOME_SOURCE.id,
    MODEL_589_PROCEDURE_RECORD_SOURCE.id,
  ],
  accessMethods: ["BROWSER_FORM"],
  accessStatus: "SOURCE_DESCRIBED",
});

export const PUBLIC_AEAT_BATCH_16_LATE_EXCISE_576_589_CONTENT_V1 = deepFreeze([
  MODEL_576_CONTENT,
  MODEL_581_CONTENT,
  MODEL_582_CONTENT,
  MODEL_583_CONTENT,
  MODEL_584_CONTENT,
  MODEL_585_CONTENT,
  MODEL_586_CONTENT,
  MODEL_587_CONTENT,
  MODEL_588_CONTENT,
  MODEL_589_CONTENT,
] as const);
