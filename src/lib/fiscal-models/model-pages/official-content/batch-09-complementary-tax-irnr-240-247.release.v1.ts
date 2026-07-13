import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_RELEASE_ID_V1 =
  "public-aeat-official-batch-09-complementary-tax-irnr-240-247.2026-07-13.v1" as const;

export type PublicAeatBatch09ComplementaryTaxIrnr240247CodeV1 =
  "240" | "241" | "242" | "247";

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

const COMPLEMENTARY_TAX_LAW_SOURCE = {
  id: "boe.complementary-tax.law-7-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 7/2024, de 20 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-26694",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f18a569e552653c83ed9ff1111cf9fe30e98a1c4f3a13dd80ee3f96a66387d20",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const COMPLEMENTARY_TAX_REGULATION_SOURCE = {
  id: "boe.complementary-tax.royal-decree-252-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 252/2025, de 1 de abril",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-6598",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "96010894fc7db1b1d347fe263e52aeab7eec5dfe4de7355bee72cc7a91004d34",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE = {
  id: "boe.models-240-242.order-hac-1198-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1198/2025, de 21 de octubre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2025-21727&p=20260529&tn=1",
  officialUpdatedOn: "2026-05-29",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "db4267865b9db046082376db5ccf9e7d0bf3cb7348f8989286c2d92c7364f30e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-240.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 240 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI60.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "803157d82e93c1a33eda91210f19d369dac5e2485f42ce0c69b1c742c98eb74d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-240.procedure-record.2026-06-10",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 240",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI60.shtml",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "218996038bfb362d981ee51552d09efb236728ade635ede047393270d9c55dbb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-240.instructions.2026-06-09",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 240 · instrucciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-complementario/modelo-240-comunicacion-entidad-constitutiva-complementario/instrucciones.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1364a08aa43202438a8748554fd20fef97d76a982cc8b210c60ca0b83d8f06b3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_WEB_SERVICE_HELP_SOURCE = {
  id: "aeat.model-240.web-service-help.2026-06-10",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 240 · información sobre el servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-complementario/modelo-240-comun_____claracion-informativa-impuesto-complementario_/informacion-sobre-presentacion-mediante-servicio-web.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6353be7227c4535db113ccb8655aed8e87c2945eb2e009d745278843aefeeef7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_FORM_HELP_SOURCE = {
  id: "aeat.model-240.form-help.2026-06-10",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 240 · información sobre el formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-complementario/modelo-240-comun_____claracion-informativa-impuesto-complementario_/informacion-sobre-presentacion-mediante-formulario.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f072e447213d123b27aa8a16a3bfebf7488877c65b7897e3a5adb6de79218a5d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_SCHEMA_HELP_SOURCE = {
  id: "aeat.model-240.xsd-wsdl-help.2026-06-10",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 240 · esquemas XSD y WSDL del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-complementario/modelo-240-comun_____claracion-informativa-impuesto-complementario_/informacion-sobre-presentacion-mediante-servicio-web/esquemas-xsd-wsdl-servicio-web-presentacion.html",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5e22d4c8a167469c8f5b900a1298abb199bef7b74ee6537b4ab425276746be01",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_WEB_SERVICE_MANUAL_SOURCE = {
  id: "aeat.model-240.web-service-manual-pdf.v1-1.2026-05-27",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 240 · manual técnico del servicio web · versión 1.1",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI60/Servicio_Web/Manual_Modelo_240_CD_Servicio_Web_V1_1.pdf",
  officialUpdatedOn: "2026-05-27",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f377b1c67b1a76e3a9458745a8c511bd1edaa7e4ecd22980f53dcb2f52b721f8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_FORM_MANUAL_SOURCE = {
  id: "aeat.model-240.form-manual-pdf.v1-1.2026-05-27",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 240 · manual del formulario · versión 1.1",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI60/Formulario/Manual_Modelo_240_CD_Formulario_V1_1.pdf",
  officialUpdatedOn: "2026-05-27",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8c9b70c0e9125470f4de3ae3f89744d204e20756a3b64769d5ba01970819efde",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-241.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 241 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI59.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9a6de819b378e8964fbda7eb53607faea309598fc6f362eebac18f3a16bb431b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-241.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 241",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI59.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "686c785438e031c2733b1112fc0369e50442754d79e97e11281122ecc9e1f5d3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_WEB_SERVICE_HELP_SOURCE = {
  id: "aeat.model-241.web-service-help.2026-06-26",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 241 · información sobre el servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-complementario/modelo-241-decla_____ltinacionales-grupos-nacionales-magnitud/informacion-sobre-presentacion-mediante-servicio-web.html",
  officialUpdatedOn: "2026-06-26",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8abfb773e51c79efe45a4881420d4bcd56fde1d0f21d01e218ddbbc2b830f561",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_FORM_HELP_SOURCE = {
  id: "aeat.model-241.form-help.2026-06-26",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 241 · información sobre el formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-complementario/modelo-241-decla_____ltinacionales-grupos-nacionales-magnitud/informacion-sobre-presentacion-mediante-formulario.html",
  officialUpdatedOn: "2026-06-26",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "0c492a8dfeed5e7af683ad2a66c9c1cd17407a06d538386a909c371715d696fc",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_SCHEMA_HELP_SOURCE = {
  id: "aeat.model-241.xsd-wsdl-help.2026-06-09",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 241 · esquemas XSD y WSDL del servicio web",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-complementario/modelo-241-decla_____ltinacionales-grupos-nacionales-magnitud/informacion-sobre-presentacion-mediante-servicio-web/esquemas-xsd-wsdl-servicio-web-presentacion.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9470afb7af94a081082e64271d158c70b852429ede8995fe7ca443e3b959a2cf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_WEB_SERVICE_MANUAL_SOURCE = {
  id: "aeat.model-241.web-service-manual-pdf.v1-4.2026-06-26",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 241 · manual técnico del servicio web · versión 1.4",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI59/Servicio_Web/Manual_Tecnico_M241_Globe_Servicio_web_v1_4.pdf",
  officialUpdatedOn: "2026-06-26",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9fda1b17f471208d16f1472b4f70829d19b81f217fa63f621f99aa1a4965e7f6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_241_FORM_MANUAL_SOURCE = {
  id: "aeat.model-241.form-manual-pdf.v1-4.2026-06-26",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelo 241 · manual del formulario · versión 1.4",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI59/Formulario/Manual_tecnico_M241_Formulario_Ayuda_v_1_4.pdf",
  officialUpdatedOn: "2026-06-26",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "18a9cf363307811cf152205b663db5731439d38451bbc4345d6e9c224d422699",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_242_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-242.procedure-home.2026-07-01",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 242 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE09.shtml",
  officialUpdatedOn: "2026-07-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c77a1cfefb509e2d057e9f671df1ebe9820ab46deb4667aaececc96cd5c6a3db",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_242_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-242.procedure-record.2026-06-10",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 242",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GE09.shtml",
  officialUpdatedOn: "2026-06-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4a881ff978baf91aa1a40c8c0d62107c99b636f7e3cf94444f5203015786bc7e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_242_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-242.instructions.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Modelo 242 · instrucciones",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/declaraciones-informativas-otros-impuestos-tasas/impuesto-complementario/modelo-242-autoliquidacion-impuesto-complementario/instrucciones.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "de2d43a6570cdd5d9d4e6aefe6dd85bf2bad92ed3ae9a0a7ba3bfa166ccce76e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_247_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-247.procedure-home.2026-07-02",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 247 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF06.shtml",
  officialUpdatedOn: "2026-07-02",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a22dc477645b49839ee6c3e5d3ce9d589907b603c7283d2dc104816ecef5b5f2",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_247_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-247.procedure-record.2026-06-09",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 247",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GF06.shtml",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7f53b86d90db7f4b3695cd45ebb940a633c9a89df6292330f74e23d15c47d74a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_247_DOWNLOAD_SOURCE = {
  id: "aeat.model-247.download.2026-06-09",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelo 247 · descarga del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-no-residentes/modelo-247-irnr______njero-efectuada-trabajadores-ajena_/descarga-modelo.html",
  officialUpdatedOn: "2026-06-09",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e143b11f5dcb5d3aeae51a4441cef2f1b822e9cf7e0efc3a39924d3c4461d8fe",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_247_FORM_PDF_SOURCE = {
  id: "aeat.model-247.form-pdf.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title:
    "Modelo 247 · comunicación del desplazamiento al extranjero de trabajadores por cuenta ajena",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GF06/mod247_mi_MI.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "72001a02f8acc79237a1168f72231034bf7b0aefd0b268a89e825bb43f8e871d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const CHANGE_OF_RESIDENCE_ORDER_SOURCE = {
  id: "boe.models-147-247.order-hac-117-2003",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/117/2003, de 31 de enero",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-2098",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6c76f775871ec56ef2af4a7284f06b82421e928a4ecc9e34b4a18ce6e8e48c18",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_240_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_RELEASE_ID_V1,
  code: "240",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Comunicación de la entidad constitutiva declarante de la declaración informativa del Impuesto Complementario.",
  summary:
    "Comunicación que la AEAT identifica con la entidad constitutiva que actuará como declarante de la declaración informativa del Impuesto Complementario.",
  searchTerms: [
    "modelo 240",
    "impuesto complementario",
    "entidad constitutiva",
    "entidad declarante",
    "declaración informativa",
    "formulario web",
    "servicio web",
    "cliente de servicio web",
    "importación fichero NIF",
    "XSD WSDL",
    "Ley 7 2024",
    "Real Decreto 252 2025",
    "Orden HAC 1198 2025",
  ],
  sections: [
    {
      id: "model-240-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-240-purpose-identity",
          heading: "Comunicación de la entidad declarante",
          text: "El índice y la página oficial identifican el Modelo 240 como la comunicación de la entidad constitutiva declarante de la declaración informativa del Impuesto Complementario.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_240_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-240-purpose-record",
          heading: "Objeto descrito por la ficha administrativa",
          text: "La ficha del procedimiento resume su objeto como la comunicación a la Agencia Tributaria de la entidad constitutiva que actuará como declarante de esa declaración informativa.",
          sourceIds: [MODEL_240_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-240-access",
      title: "Canales técnicos descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-240-access-browser",
          heading: "Formulario web",
          text: "La página oficial describe un formulario web para introducir los datos y publica una ayuda técnica específica para ese entorno.",
          sourceIds: [
            MODEL_240_PROCEDURE_HOME_SOURCE.id,
            MODEL_240_FORM_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-240-access-service",
          heading: "Servicio web y cliente XML",
          text: "Como vía técnica alternativa, la AEAT describe un servicio web y un cliente que trabaja con XML. La ficha conserva únicamente la descripción y los materiales informativos, sin iniciar el servicio.",
          sourceIds: [
            MODEL_240_PROCEDURE_HOME_SOURCE.id,
            MODEL_240_WEB_SERVICE_HELP_SOURCE.id,
            MODEL_240_SCHEMA_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-240-access-file",
          heading: "Importación de un fichero de texto",
          text: "El manual del formulario explica que la relación de NIF de entidades constitutivas puede incorporarse manualmente o mediante la importación de un fichero de texto.",
          sourceIds: [MODEL_240_FORM_MANUAL_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-240-details",
      title: "Manuales y normativa registrados",
      kind: "DETAILS",
      items: [
        {
          id: "model-240-details-manuals",
          heading: "Dos manuales oficiales · versión 1.1",
          text: "La AEAT publica un manual técnico del servicio web de dieciséis páginas y un manual del formulario de diecisiete páginas. Los dos PDF verificados son documentos pasivos, sin JavaScript ni campos AcroForm detectados.",
          sourceIds: [
            MODEL_240_WEB_SERVICE_MANUAL_SOURCE.id,
            MODEL_240_FORM_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-240-details-law",
          heading: "Marco normativo enlazado",
          text: "La página oficial enlaza la Ley 7/2024, el Real Decreto 252/2025 y la Orden HAC/1198/2025. Esta última aprueba los modelos 240, 241 y 242 y regula sus condiciones de presentación.",
          sourceIds: [
            MODEL_240_PROCEDURE_HOME_SOURCE.id,
            COMPLEMENTARY_TAX_LAW_SOURCE.id,
            COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
            COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_240_PROCEDURE_HOME_SOURCE,
    MODEL_240_PROCEDURE_RECORD_SOURCE,
    MODEL_240_INSTRUCTIONS_SOURCE,
    MODEL_240_WEB_SERVICE_HELP_SOURCE,
    MODEL_240_FORM_HELP_SOURCE,
    MODEL_240_SCHEMA_HELP_SOURCE,
    MODEL_240_WEB_SERVICE_MANUAL_SOURCE,
    MODEL_240_FORM_MANUAL_SOURCE,
    COMPLEMENTARY_TAX_LAW_SOURCE,
    COMPLEMENTARY_TAX_REGULATION_SOURCE,
    COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-240-web-service-manual-document",
      kind: "GUIDE",
      title: "Manual técnico del servicio web del Modelo 240 · versión 1.1",
      sourceId: MODEL_240_WEB_SERVICE_MANUAL_SOURCE.id,
      landingPageSourceId: MODEL_240_WEB_SERVICE_HELP_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Manual_Modelo_240_CD_Servicio_Web_V1_1.pdf",
      byteLength: 306937,
      pageCount: 16,
      sha256:
        "f377b1c67b1a76e3a9458745a8c511bd1edaa7e4ecd22980f53dcb2f52b721f8",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-240-form-manual-document",
      kind: "GUIDE",
      title: "Manual del formulario del Modelo 240 · versión 1.1",
      sourceId: MODEL_240_FORM_MANUAL_SOURCE.id,
      landingPageSourceId: MODEL_240_FORM_HELP_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Manual_Modelo_240_CD_Formulario_V1_1.pdf",
      byteLength: 1638012,
      pageCount: 17,
      sha256:
        "8c9b70c0e9125470f4de3ae3f89744d204e20756a3b64769d5ba01970819efde",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-240-link-procedure",
      label: "Página oficial del Modelo 240",
      sourceId: MODEL_240_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_240_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-instructions",
      label: "Instrucciones oficiales del Modelo 240",
      sourceId: MODEL_240_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-form-help",
      label: "Información técnica del formulario",
      sourceId: MODEL_240_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-web-service-help",
      label: "Información técnica del servicio web",
      sourceId: MODEL_240_WEB_SERVICE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-schema-help",
      label: "Esquemas XSD y WSDL publicados por la AEAT",
      sourceId: MODEL_240_SCHEMA_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-web-service-manual",
      label: "Manual técnico del servicio web · versión 1.1",
      sourceId: MODEL_240_WEB_SERVICE_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-form-manual",
      label: "Manual oficial del formulario · versión 1.1",
      sourceId: MODEL_240_FORM_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-law",
      label: "Ley 7/2024",
      sourceId: COMPLEMENTARY_TAX_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-regulation",
      label: "Real Decreto 252/2025",
      sourceId: COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-link-order",
      label: "Orden HAC/1198/2025",
      sourceId: COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-240-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 240?",
      answer:
        "La comunicación de la entidad constitutiva declarante de la declaración informativa del Impuesto Complementario.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_240_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-object",
      question: "¿Cómo resume su objeto la ficha administrativa?",
      answer:
        "Como la comunicación a la Agencia Tributaria de la entidad constitutiva que actuará como declarante de la declaración informativa.",
      sourceIds: [MODEL_240_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-browser",
      question: "¿Publica la AEAT un formulario web para el Modelo 240?",
      answer:
        "Sí. La página oficial describe un formulario web y mantiene una ayuda técnica específica para su uso.",
      sourceIds: [
        MODEL_240_PROCEDURE_HOME_SOURCE.id,
        MODEL_240_FORM_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-service",
      question: "¿Existe documentación de servicio web?",
      answer:
        "Sí. La AEAT publica una página técnica, un manual versión 1.1 y una página de esquemas XSD y WSDL.",
      sourceIds: [
        MODEL_240_WEB_SERVICE_HELP_SOURCE.id,
        MODEL_240_WEB_SERVICE_MANUAL_SOURCE.id,
        MODEL_240_SCHEMA_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-import",
      question: "¿Qué importación describe el manual del formulario?",
      answer:
        "Describe la incorporación de una relación de NIF mediante un fichero de texto, además de su introducción manual.",
      sourceIds: [MODEL_240_FORM_MANUAL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-manuals",
      question: "¿Qué manuales oficiales están registrados?",
      answer:
        "Un manual técnico del servicio web de dieciséis páginas y un manual del formulario de diecisiete páginas, ambos en versión 1.1.",
      sourceIds: [
        MODEL_240_WEB_SERVICE_MANUAL_SOURCE.id,
        MODEL_240_FORM_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-normative",
      question: "¿Qué normativa principal enlaza la página oficial?",
      answer:
        "La Ley 7/2024, el Real Decreto 252/2025 y la Orden HAC/1198/2025.",
      sourceIds: [
        MODEL_240_PROCEDURE_HOME_SOURCE.id,
        COMPLEMENTARY_TAX_LAW_SOURCE.id,
        COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
        COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-240-faq-applicability",
      question:
        "¿Esta ficha decide si el Modelo 240 corresponde a un caso concreto?",
      answer:
        "No. La ficha reúne identidad, objeto, canales y fuentes oficiales sin evaluar la aplicabilidad a una entidad concreta.",
      sourceIds: [
        MODEL_240_PROCEDURE_HOME_SOURCE.id,
        MODEL_240_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_240_PROCEDURE_HOME_SOURCE.id,
      MODEL_240_FORM_HELP_SOURCE.id,
      MODEL_240_FORM_MANUAL_SOURCE.id,
      MODEL_240_WEB_SERVICE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"240">;

const MODEL_241_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_RELEASE_ID_V1,
  code: "241",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa del Impuesto Complementario por parte de grupos multinacionales o grupos nacionales de gran magnitud",
  summary:
    "Declaración informativa del Impuesto Complementario que la AEAT identifica con grupos multinacionales o grupos nacionales de gran magnitud.",
  searchTerms: [
    "modelo 241",
    "impuesto complementario",
    "declaración informativa",
    "grupos multinacionales",
    "grupos nacionales de gran magnitud",
    "GIR DAC9",
    "GloBE",
    "servicio web",
    "formulario web",
    "importación XML",
    "GeneralSection",
    "Summary",
    "XSD WSDL",
    "Orden HAC 1198 2025",
  ],
  sections: [
    {
      id: "model-241-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-241-purpose-identity",
          heading: "Declaración informativa del Impuesto Complementario",
          text: "El índice y la página oficial identifican el Modelo 241 con la declaración informativa del Impuesto Complementario de grupos multinacionales o grupos nacionales de gran magnitud.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_241_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-241-purpose-record",
          heading: "Objeto descrito por la ficha administrativa",
          text: "La ficha del procedimiento resume su objeto como la presentación de la declaración informativa del Impuesto Complementario.",
          sourceIds: [MODEL_241_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-241-access",
      title: "Canales técnicos descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-241-access-service",
          heading: "Servicio web como vía principal descrita",
          text: "La página oficial presenta el servicio web como vía principal y publica un manual técnico y esquemas XSD y WSDL. Esta ficha solo enlaza la información y no inicia ninguna operación.",
          sourceIds: [
            MODEL_241_PROCEDURE_HOME_SOURCE.id,
            MODEL_241_WEB_SERVICE_HELP_SOURCE.id,
            MODEL_241_SCHEMA_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-241-access-form",
          heading: "Formulario web alternativo",
          text: "La AEAT también describe un formulario web y mantiene una página de ayuda y un manual propios para ese entorno.",
          sourceIds: [
            MODEL_241_PROCEDURE_HOME_SOURCE.id,
            MODEL_241_FORM_HELP_SOURCE.id,
            MODEL_241_FORM_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-241-access-file",
          heading: "Importación de secciones XML",
          text: "El manual del formulario documenta la importación de XML para las secciones GeneralSection, Summary y GLoBETax.",
          sourceIds: [MODEL_241_FORM_MANUAL_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-241-details",
      title: "Manuales y normativa registrados",
      kind: "DETAILS",
      items: [
        {
          id: "model-241-details-manuals",
          heading: "Dos manuales oficiales · versión 1.4",
          text: "La AEAT publica un manual técnico del servicio web y otro del formulario, ambos de cuarenta páginas y en versión 1.4. Los PDF verificados no declaran JavaScript ni campos AcroForm.",
          sourceIds: [
            MODEL_241_WEB_SERVICE_MANUAL_SOURCE.id,
            MODEL_241_FORM_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-241-details-law",
          heading: "Marco normativo enlazado",
          text: "La página oficial y la ficha administrativa enlazan la Ley 7/2024, el Real Decreto 252/2025 y la Orden HAC/1198/2025 como referencias del Modelo 241.",
          sourceIds: [
            MODEL_241_PROCEDURE_HOME_SOURCE.id,
            MODEL_241_PROCEDURE_RECORD_SOURCE.id,
            COMPLEMENTARY_TAX_LAW_SOURCE.id,
            COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
            COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_241_PROCEDURE_HOME_SOURCE,
    MODEL_241_PROCEDURE_RECORD_SOURCE,
    MODEL_241_WEB_SERVICE_HELP_SOURCE,
    MODEL_241_FORM_HELP_SOURCE,
    MODEL_241_SCHEMA_HELP_SOURCE,
    MODEL_241_WEB_SERVICE_MANUAL_SOURCE,
    MODEL_241_FORM_MANUAL_SOURCE,
    COMPLEMENTARY_TAX_LAW_SOURCE,
    COMPLEMENTARY_TAX_REGULATION_SOURCE,
    COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-241-web-service-manual-document",
      kind: "GUIDE",
      title: "Manual técnico del servicio web del Modelo 241 · versión 1.4",
      sourceId: MODEL_241_WEB_SERVICE_MANUAL_SOURCE.id,
      landingPageSourceId: MODEL_241_WEB_SERVICE_HELP_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Manual_Tecnico_M241_Globe_Servicio_web_v1_4.pdf",
      byteLength: 1078078,
      pageCount: 40,
      sha256:
        "9fda1b17f471208d16f1472b4f70829d19b81f217fa63f621f99aa1a4965e7f6",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-241-form-manual-document",
      kind: "GUIDE",
      title: "Manual del formulario del Modelo 241 · versión 1.4",
      sourceId: MODEL_241_FORM_MANUAL_SOURCE.id,
      landingPageSourceId: MODEL_241_FORM_HELP_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "Manual_tecnico_M241_Formulario_Ayuda_v_1_4.pdf",
      byteLength: 2813787,
      pageCount: 40,
      sha256:
        "18a9cf363307811cf152205b663db5731439d38451bbc4345d6e9c224d422699",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-241-link-procedure",
      label: "Página oficial del Modelo 241",
      sourceId: MODEL_241_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_241_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-form-help",
      label: "Información técnica del formulario",
      sourceId: MODEL_241_FORM_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-web-service-help",
      label: "Información técnica del servicio web",
      sourceId: MODEL_241_WEB_SERVICE_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-schema-help",
      label: "Esquemas XSD y WSDL publicados por la AEAT",
      sourceId: MODEL_241_SCHEMA_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-web-service-manual",
      label: "Manual técnico del servicio web · versión 1.4",
      sourceId: MODEL_241_WEB_SERVICE_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-form-manual",
      label: "Manual oficial del formulario · versión 1.4",
      sourceId: MODEL_241_FORM_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-law",
      label: "Ley 7/2024",
      sourceId: COMPLEMENTARY_TAX_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-regulation",
      label: "Real Decreto 252/2025",
      sourceId: COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-link-order",
      label: "Orden HAC/1198/2025",
      sourceId: COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-241-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 241?",
      answer:
        "La declaración informativa del Impuesto Complementario por parte de grupos multinacionales o grupos nacionales de gran magnitud.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_241_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-object",
      question: "¿Cómo resume su objeto la ficha administrativa?",
      answer:
        "Como la presentación de la declaración informativa del Impuesto Complementario.",
      sourceIds: [MODEL_241_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-primary-channel",
      question: "¿Qué canal técnico presenta la AEAT como principal?",
      answer:
        "La página oficial presenta el servicio web como vía principal y publica materiales técnicos específicos para ese canal.",
      sourceIds: [
        MODEL_241_PROCEDURE_HOME_SOURCE.id,
        MODEL_241_WEB_SERVICE_HELP_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-form",
      question: "¿Existe un formulario web alternativo?",
      answer:
        "Sí. La AEAT describe un formulario web alternativo y publica una página de ayuda y un manual propios.",
      sourceIds: [
        MODEL_241_PROCEDURE_HOME_SOURCE.id,
        MODEL_241_FORM_HELP_SOURCE.id,
        MODEL_241_FORM_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-import",
      question: "¿Qué importaciones XML documenta el manual del formulario?",
      answer:
        "Documenta importaciones XML para las secciones GeneralSection, Summary y GLoBETax.",
      sourceIds: [MODEL_241_FORM_MANUAL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-manuals",
      question: "¿Qué manuales oficiales están registrados?",
      answer:
        "Un manual técnico del servicio web y un manual del formulario, ambos de cuarenta páginas y en versión 1.4.",
      sourceIds: [
        MODEL_241_WEB_SERVICE_MANUAL_SOURCE.id,
        MODEL_241_FORM_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-schemas",
      question: "¿Publica la AEAT esquemas técnicos del Modelo 241?",
      answer:
        "Sí. La página técnica oficial reúne los esquemas XSD y el WSDL asociados al servicio web.",
      sourceIds: [MODEL_241_SCHEMA_HELP_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-normative",
      question: "¿Qué normativa principal enlaza la página oficial?",
      answer:
        "La Ley 7/2024, el Real Decreto 252/2025 y la Orden HAC/1198/2025.",
      sourceIds: [
        MODEL_241_PROCEDURE_HOME_SOURCE.id,
        COMPLEMENTARY_TAX_LAW_SOURCE.id,
        COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
        COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-241-faq-applicability",
      question:
        "¿Esta ficha determina si el Modelo 241 corresponde a un grupo?",
      answer:
        "No. La ficha reproduce información y materiales oficiales sin evaluar la aplicabilidad a un grupo concreto.",
      sourceIds: [
        MODEL_241_PROCEDURE_HOME_SOURCE.id,
        MODEL_241_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_241_PROCEDURE_HOME_SOURCE.id,
      MODEL_241_FORM_HELP_SOURCE.id,
      MODEL_241_FORM_MANUAL_SOURCE.id,
      MODEL_241_WEB_SERVICE_HELP_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"241">;

const MODEL_242_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_RELEASE_ID_V1,
  code: "242",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Autoliquidación del Impuesto Complementario",
  summary:
    "Autoliquidación que la AEAT encuadra en el Impuesto Complementario para determinados grupos nacionales y multinacionales.",
  searchTerms: [
    "modelo 242",
    "autoliquidación",
    "impuesto complementario",
    "grupos nacionales de gran magnitud",
    "grupos multinacionales",
    "tipo mínimo global",
    "formulario web",
    "instrucciones modelo 242",
    "Ley 7 2024",
    "Real Decreto 252 2025",
    "Orden HAC 1198 2025",
  ],
  sections: [
    {
      id: "model-242-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-242-purpose-identity",
          heading: "Autoliquidación del Impuesto Complementario",
          text: "El índice y la página oficial identifican el Modelo 242 como la autoliquidación del Impuesto Complementario.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_242_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-242-purpose-record",
          heading: "Contexto descrito por la ficha administrativa",
          text: "La ficha del procedimiento relaciona esta autoliquidación con la tributación mínima global de determinados grupos nacionales de gran magnitud y grupos multinacionales.",
          sourceIds: [MODEL_242_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-242-access",
      title: "Canal informativo registrado",
      kind: "ACCESS",
      items: [
        {
          id: "model-242-access-browser",
          heading: "Entorno web de la AEAT",
          text: "La página oficial publica el acceso a la presentación del Modelo 242 y la ficha administrativa encuadra el procedimiento en tramitación telemática. Esta ficha solo describe el canal y no enlaza la acción.",
          sourceIds: [
            MODEL_242_PROCEDURE_HOME_SOURCE.id,
            MODEL_242_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-242-details",
      title: "Información y normativa registradas",
      kind: "DETAILS",
      items: [
        {
          id: "model-242-details-instructions",
          heading: "Página oficial de instrucciones",
          text: "La AEAT mantiene una página de instrucciones del Modelo 242. Esta ficha registra su existencia sin reproducir campos, operaciones ni modalidades de ingreso.",
          sourceIds: [MODEL_242_INSTRUCTIONS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-242-details-law",
          heading: "Marco normativo enlazado",
          text: "La página oficial y la ficha administrativa enlazan la Ley 7/2024, el Real Decreto 252/2025 y la Orden HAC/1198/2025.",
          sourceIds: [
            MODEL_242_PROCEDURE_HOME_SOURCE.id,
            MODEL_242_PROCEDURE_RECORD_SOURCE.id,
            COMPLEMENTARY_TAX_LAW_SOURCE.id,
            COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
            COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_242_PROCEDURE_HOME_SOURCE,
    MODEL_242_PROCEDURE_RECORD_SOURCE,
    MODEL_242_INSTRUCTIONS_SOURCE,
    COMPLEMENTARY_TAX_LAW_SOURCE,
    COMPLEMENTARY_TAX_REGULATION_SOURCE,
    COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-242-link-procedure",
      label: "Página oficial del Modelo 242",
      sourceId: MODEL_242_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_242_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-link-instructions",
      label: "Instrucciones oficiales del Modelo 242",
      sourceId: MODEL_242_INSTRUCTIONS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-link-law",
      label: "Ley 7/2024",
      sourceId: COMPLEMENTARY_TAX_LAW_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-link-regulation",
      label: "Real Decreto 252/2025",
      sourceId: COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-link-order",
      label: "Orden HAC/1198/2025",
      sourceId: COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-242-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 242?",
      answer: "La autoliquidación del Impuesto Complementario.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_242_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-faq-context",
      question: "¿Qué contexto general describe la ficha administrativa?",
      answer:
        "Relaciona el modelo con la tributación mínima global de determinados grupos nacionales de gran magnitud y grupos multinacionales.",
      sourceIds: [MODEL_242_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-faq-record",
      question: "¿Existe una ficha oficial del procedimiento?",
      answer:
        "Sí. La AEAT publica la ficha GE09 con la denominación, el objeto general y las referencias normativas del Modelo 242.",
      sourceIds: [MODEL_242_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-faq-channel",
      question: "¿Qué canal describe la información oficial?",
      answer:
        "La página del modelo y la ficha administrativa describen un entorno de tramitación telemática en la Sede electrónica de la AEAT.",
      sourceIds: [
        MODEL_242_PROCEDURE_HOME_SOURCE.id,
        MODEL_242_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-faq-instructions",
      question: "¿Publica la AEAT instrucciones del Modelo 242?",
      answer:
        "Sí. La Sede mantiene una página informativa de instrucciones separada de la ficha administrativa.",
      sourceIds: [MODEL_242_INSTRUCTIONS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-faq-normative",
      question: "¿Qué normativa principal está registrada?",
      answer:
        "La Ley 7/2024, el Real Decreto 252/2025 y la Orden HAC/1198/2025.",
      sourceIds: [
        COMPLEMENTARY_TAX_LAW_SOURCE.id,
        COMPLEMENTARY_TAX_REGULATION_SOURCE.id,
        COMPLEMENTARY_TAX_MODELS_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-242-faq-applicability",
      question: "¿Esta ficha decide si el Modelo 242 corresponde a un grupo?",
      answer:
        "No. La ficha ofrece información general de fuentes oficiales y no evalúa la aplicabilidad a un caso concreto.",
      sourceIds: [
        MODEL_242_PROCEDURE_HOME_SOURCE.id,
        MODEL_242_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_242_PROCEDURE_HOME_SOURCE.id,
      MODEL_242_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"242">;

const MODEL_247_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_RELEASE_ID_V1,
  code: "247",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRNR. Impuesto sobre la Renta de no Residentes. Comunicación del desplazamiento al extranjero efectuada por trabajadores por cuenta ajena",
  summary:
    "Comunicación que la AEAT relaciona con el desplazamiento al extranjero de trabajadores por cuenta ajena y con la obtención de un documento acreditativo para el pagador.",
  searchTerms: [
    "modelo 247",
    "IRNR",
    "impuesto sobre la renta de no residentes",
    "desplazamiento al extranjero",
    "trabajadores por cuenta ajena",
    "cambio de residencia",
    "retenciones del trabajo",
    "documento acreditativo",
    "formulario PDF",
    "Adobe Reader",
    "Orden HAC 117 2003",
  ],
  sections: [
    {
      id: "model-247-purpose",
      title: "Identidad y objeto oficiales",
      kind: "PURPOSE",
      items: [
        {
          id: "model-247-purpose-identity",
          heading: "Comunicación del desplazamiento al extranjero",
          text: "El índice y la página oficial identifican el Modelo 247 con la comunicación del desplazamiento al extranjero efectuada por trabajadores por cuenta ajena en el ámbito del IRNR.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_247_PROCEDURE_HOME_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-247-purpose-record",
          heading: "Documento acreditativo para el pagador",
          text: "La ficha administrativa vincula la comunicación con la obtención de un documento acreditativo expedido por la Administración tributaria para su entrega a pagadores de rendimientos del trabajo.",
          sourceIds: [MODEL_247_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-247-access",
      title: "Canales descritos por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-247-access-browser",
          heading: "Canal telemático",
          text: "La página oficial publica una gestión electrónica y la ficha administrativa identifica la tramitación telemática. Esta ficha describe el canal sin enlazar la acción de presentación.",
          sourceIds: [
            MODEL_247_PROCEDURE_HOME_SOURCE.id,
            MODEL_247_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-247-access-office",
          heading: "Oficinas de la AEAT",
          text: "La ficha administrativa también menciona las oficinas de la AEAT como lugar de presentación. Esa referencia presencial se conserva como texto informativo y no se representa como transferencia administrativa ni como carga de fichero.",
          sourceIds: [MODEL_247_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-247-details",
      title: "Formulario externo y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-247-details-form",
          heading: "Formulario PDF interactivo",
          text: "La página de descarga enlaza un formulario oficial de dos páginas y explica que debe descargarse y abrirse con Adobe Reader para utilizar sus funciones interactivas.",
          sourceIds: [
            MODEL_247_DOWNLOAD_SOURCE.id,
            MODEL_247_FORM_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-247-details-active-content",
          heading: "JavaScript y campos AcroForm detectados",
          text: "La inspección del PDF oficial detectó JavaScript y campos AcroForm. La aplicación no incrusta ni ejecuta el archivo: únicamente conserva su descarga externa y una miniatura rasterizada derivada del documento verificado.",
          sourceIds: [
            MODEL_247_DOWNLOAD_SOURCE.id,
            MODEL_247_FORM_PDF_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-247-details-order",
          heading: "Orden HAC/117/2003",
          text: "La página del modelo y la ficha administrativa enlazan la Orden HAC/117/2003 como normativa del Modelo 247.",
          sourceIds: [
            MODEL_247_PROCEDURE_HOME_SOURCE.id,
            MODEL_247_PROCEDURE_RECORD_SOURCE.id,
            CHANGE_OF_RESIDENCE_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_247_PROCEDURE_HOME_SOURCE,
    MODEL_247_PROCEDURE_RECORD_SOURCE,
    MODEL_247_DOWNLOAD_SOURCE,
    MODEL_247_FORM_PDF_SOURCE,
    CHANGE_OF_RESIDENCE_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-247-form-document",
      kind: "FORM",
      title: "Formulario oficial enlazado del Modelo 247",
      sourceId: MODEL_247_FORM_PDF_SOURCE.id,
      landingPageSourceId: MODEL_247_DOWNLOAD_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "mod247_mi_MI.pdf",
      byteLength: 269874,
      pageCount: 2,
      sha256:
        "72001a02f8acc79237a1168f72231034bf7b0aefd0b268a89e825bb43f8e871d",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-247-form-preview",
    sourceId: MODEL_247_FORM_PDF_SOURCE.id,
    publicHref: "/fiscal-models/modelo-247/formulario-modelo-247-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256: "626f4b9d020a671145b6ac53e12b6ea60f9d4d6b6c51b42a61370f8b311d659f",
    alt: "Vista previa rasterizada del formulario oficial enlazado del Modelo 247 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-247-link-procedure",
      label: "Página oficial del Modelo 247",
      sourceId: MODEL_247_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_247_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-link-download",
      label: "Página oficial de descarga del formulario",
      sourceId: MODEL_247_DOWNLOAD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-link-order",
      label: "Orden HAC/117/2003",
      sourceId: CHANGE_OF_RESIDENCE_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-247-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 247?",
      answer:
        "La comunicación del desplazamiento al extranjero efectuada por trabajadores por cuenta ajena en el ámbito del IRNR.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_247_PROCEDURE_HOME_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-object",
      question: "¿Qué finalidad general describe la ficha administrativa?",
      answer:
        "Relaciona la comunicación con la anticipación de los efectos del cambio de residencia en el sistema de retenciones y con un documento acreditativo para el pagador.",
      sourceIds: [MODEL_247_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-document",
      question: "¿Qué documento puede expedir la Administración tributaria?",
      answer:
        "La ficha administrativa describe un documento acreditativo destinado a su entrega a pagadores de rendimientos del trabajo.",
      sourceIds: [MODEL_247_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-channels",
      question: "¿Qué lugares de presentación menciona la ficha oficial?",
      answer:
        "Menciona la vía telemática y las oficinas de la AEAT. Esta aplicación no inicia ninguno de esos trámites.",
      sourceIds: [MODEL_247_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-download",
      question: "¿Publica la AEAT un formulario descargable?",
      answer:
        "Sí. La página oficial enlaza un PDF interactivo de dos páginas correspondiente al Modelo 247.",
      sourceIds: [MODEL_247_DOWNLOAD_SOURCE.id, MODEL_247_FORM_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-reader",
      question: "¿Qué indica la AEAT sobre la apertura del PDF?",
      answer:
        "La página de descarga indica que debe guardarse localmente y abrirse con Adobe Reader para utilizar sus funciones interactivas.",
      sourceIds: [MODEL_247_DOWNLOAD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-active-content",
      question:
        "¿Se ejecuta el contenido interactivo del PDF en esta aplicación?",
      answer:
        "No. El archivo contiene JavaScript y campos AcroForm; se mantiene exclusivamente como descarga oficial externa y la vista previa es una imagen rasterizada pasiva.",
      sourceIds: [MODEL_247_DOWNLOAD_SOURCE.id, MODEL_247_FORM_PDF_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-normative",
      question: "¿Qué normativa principal enlaza la AEAT?",
      answer:
        "La página oficial y la ficha administrativa enlazan la Orden HAC/117/2003, de 31 de enero.",
      sourceIds: [
        MODEL_247_PROCEDURE_HOME_SOURCE.id,
        MODEL_247_PROCEDURE_RECORD_SOURCE.id,
        CHANGE_OF_RESIDENCE_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-247-faq-applicability",
      question:
        "¿Esta ficha decide si el Modelo 247 corresponde a una persona?",
      answer:
        "No. La ficha reúne información general procedente de la AEAT y el BOE sin evaluar un caso individual.",
      sourceIds: [
        MODEL_247_PROCEDURE_HOME_SOURCE.id,
        MODEL_247_PROCEDURE_RECORD_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_247_PROCEDURE_HOME_SOURCE.id,
      MODEL_247_PROCEDURE_RECORD_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"247">;

export const PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_CONTENT_V1 =
  deepFreeze([
    MODEL_240_CONTENT,
    MODEL_241_CONTENT,
    MODEL_242_CONTENT,
    MODEL_247_CONTENT,
  ] as const satisfies readonly PublicAeatOfficialModelContentV1[]);
