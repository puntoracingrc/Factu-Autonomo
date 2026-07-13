import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_RELEASE_ID_V1 =
  "public-aeat-official-batch-09-cross-border-mechanisms-234-236.2026-07-13.v1" as const;

export type PublicAeatBatch09CrossBorderMechanisms234236CodeV1 =
  "234" | "235" | "236";

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

const MODEL_234_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-234.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 234 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI46.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4a287734737376c9a45a2aa7064e302292b6833efc43a365b2cd32840676615b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_234_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-234.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 234",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI46.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "432ba762f742e9f4795ca1c7bbb398a8e8bc33c8997afa1cbf6a82e3eeceb9f8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_234_HELP_SOURCE = {
  id: "aeat.model-234.technical-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 234 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-289/modelo-234.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9127da398664082e5c9d4f9ad414782622bceaa5dda77eda49d75356606e3358",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_235_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-235.procedure-home.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 235 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI47.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bf0f4bd72752e45ff5462fcf0b8fe3aa9c9bdb778a63734797445d732b157d7c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_235_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-235.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 235",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI47.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "338736adaec80139c656845878036babecf0c53a981f30a251e371a6941a7675",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_235_HELP_SOURCE = {
  id: "aeat.model-235.technical-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 235 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-289/modelo-235.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "a7918f7ffe82f058ad65ea602296eeacc08384872ba674e243f5c0181eee94db",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_236_PROCEDURE_HOME_SOURCE = {
  id: "aeat.model-236.procedure-home.2026-01-20",
  authority: "AEAT",
  kind: "PROCEDURE_HOME",
  title: "Modelo 236 · página oficial",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI48.shtml",
  officialUpdatedOn: "2026-01-20",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8bdea523ea310a1109cde4169dda4e081e2251f104b420d85f6ae64eb9365403",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_236_PROCEDURE_RECORD_SOURCE = {
  id: "aeat.model-236.procedure-record.2026-07-08",
  authority: "AEAT",
  kind: "PROCEDURE_RECORD",
  title: "Ficha del procedimiento del Modelo 236",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI48.shtml",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e6346ca74c204158369e3921ba150dba1613c78a83bcc846137d73021b95a6df",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_236_HELP_SOURCE = {
  id: "aeat.model-236.technical-help.2026-04-22",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Modelo 236 · ayuda técnica del formulario",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-199-289/modelo-236.html",
  officialUpdatedOn: "2026-04-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b9e85e8f5ead93ac9fa3ce3185f22a2c612d998e5a36218dd59c63340945a786",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_INFORMATION_NOTE_SOURCE = {
  id: "aeat.models-234-236.information-note.2021-04-14",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelos 234, 235 y 236 · nota informativa",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI46-GI47-GI48/Nota_infor_234_235_236.pdf",
  officialUpdatedOn: "2021-04-14",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "891f2bdaa7c9e0e3622aa660718188d3782fa02aa98eaa0bcb0701daf554e176",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_FAQ_SOURCE = {
  id: "aeat.models-234-236.faq-pdf.2024-06-05",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title:
    "Modelos 234, 235 y 236 · preguntas frecuentes sobre mecanismos transfronterizos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI46-GI47-GI48/FAQ_234_235_236.pdf",
  officialUpdatedOn: "2024-06-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "f5fc6303e7eda75197fc439b52d6c511934e0f0e0f112b56b070c717548a7c85",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_TECHNICAL_MANUAL_SOURCE = {
  id: "aeat.models-234-236.technical-manual.v1-14.2022-03-01",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Modelos 234, 235 y 236 · manual técnico XSD · versión 1.14",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI46-GI47-GI48/Manual_Tecnico_M234_235_236_v1.14.pdf",
  officialUpdatedOn: "2022-03-01",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "bcf7d6362912d231899497cdbe0a7621011fc4897615a681e28a3549ce63503d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_CSV_TEMPLATES_SOURCE = {
  id: "aeat.models-234-236.csv-templates.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelos 234, 235 y 236 · plantillas de importación CSV",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI46-GI47-GI48/PlantilasimportacionM234-235-236.zip",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b304bdd3488359235ff281a9f18c42dc563a8a440094bcf17c07ed704ccb0054",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_XSD_WSDL_SOURCE = {
  id: "aeat.models-234-236.xsd-4-04-wsdl-1-0-1.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelos 234, 235 y 236 · esquemas XSD 4.04 y WSDL 1.0.1",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI46-GI47-GI48/Esquema_XDS_WSDL_M234_235_236.zip",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "96b23d5197394283ec7adb042547346c847123d5a24f30489971c0a36ecab939",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_XML_EXAMPLES_SOURCE = {
  id: "aeat.models-234-236.xml-examples-xsd-4-04.captured-2026-07-13",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Modelos 234, 235 y 236 · ejemplos XML para XSD 4.04",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI46-GI47-GI48/Ejemplos_XML_M234_235_236_Manual.zip",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "4626698a4e7129c2c85417efb457865e81f56730c7707fa057864f7a80c1dfc6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const LAW_10_2020_SOURCE = {
  id: "boe.cross-border-mechanisms.law-10-2020",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 10/2020, de 29 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2020-17265",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "022489ce1497e28d96b1766834694e350b8188ed753bbc3e912e1e17f7701362",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ROYAL_DECREE_243_2021_SOURCE = {
  id: "boe.cross-border-mechanisms.royal-decree-243-2021",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Real Decreto 243/2021, de 6 de abril",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2021-5394",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "462e9c91af7a7271e6e63851a18a314263bc27aa45205f4c63f5fc18d71d69ca",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_342_2021_SOURCE = {
  id: "boe.models-234-236.order-hac-342-2021.consolidated-2024-03-22",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/342/2021, de 12 de abril · texto consolidado",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2021-5780",
  officialUpdatedOn: "2024-03-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e49ba193ee0b2fb71ed3d189905e4d8101e8879c828eacd64807980733b7b185",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_266_2024_SOURCE = {
  id: "boe.model-234.order-hac-266-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/266/2024, de 18 de marzo",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-5722",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "6cb176837fb71c92c9df37cbeebb9f8b694b96288280e4a36e2b6b666aa07588",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const SHARED_DOCUMENTS = [
  {
    id: "models-234-236-information-note-document",
    kind: "GUIDE",
    title: "Nota informativa de los Modelos 234, 235 y 236",
    sourceId: SHARED_INFORMATION_NOTE_SOURCE.id,
    landingPageSourceId: null,
    mediaType: "application/pdf",
    fileName: "Nota_infor_234_235_236.pdf",
    byteLength: 389925,
    pageCount: 2,
    sha256: "891f2bdaa7c9e0e3622aa660718188d3782fa02aa98eaa0bcb0701daf554e176",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "models-234-236-faq-document",
    kind: "GUIDE",
    title: "Preguntas frecuentes de los Modelos 234, 235 y 236",
    sourceId: SHARED_FAQ_SOURCE.id,
    landingPageSourceId: null,
    mediaType: "application/pdf",
    fileName: "FAQ_234_235_236.pdf",
    byteLength: 900898,
    pageCount: 42,
    sha256: "f5fc6303e7eda75197fc439b52d6c511934e0f0e0f112b56b070c717548a7c85",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
  {
    id: "models-234-236-technical-manual-document",
    kind: "GUIDE",
    title: "Manual técnico XSD de los Modelos 234, 235 y 236 · versión 1.14",
    sourceId: SHARED_TECHNICAL_MANUAL_SOURCE.id,
    landingPageSourceId: null,
    mediaType: "application/pdf",
    fileName: "Manual_Tecnico_M234_235_236_v1.14.pdf",
    byteLength: 951190,
    pageCount: 47,
    sha256: "bcf7d6362912d231899497cdbe0a7621011fc4897615a681e28a3549ce63503d",
    activeContentStatus: "NO_JAVASCRIPT_DETECTED",
    formStatus: "NO_ACROFORM_DETECTED",
    freshnessStatus: "CURRENTNESS_UNDETERMINED",
    previewSuitability: "NONE",
    usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
  },
] as const satisfies readonly PublicAeatOfficialContentDocumentV1[];

const MODEL_234_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_RELEASE_ID_V1,
  code: "234",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración de información de determinados mecanismos transfronterizos de planificación fiscal",
  summary:
    "Declaración informativa que la AEAT y el BOE identifican con determinados mecanismos transfronterizos de planificación fiscal, acompañada de formulario web, carga XML, servicio web y documentación técnica oficial.",
  searchTerms: [
    "modelo 234",
    "declaración informativa mecanismos transfronterizos",
    "planificación fiscal transfronteriza",
    "DAC6",
    "señas distintivas",
    "hallmarks",
    "formulario web modelo 234",
    "archivo XML modelo 234",
    "servicio web modelo 234",
    "manual técnico 234 235 236 versión 1.14",
    "FAQ mecanismos transfronterizos",
    "XSD 4.04",
    "WSDL 1.0.1",
    "Orden HAC 342 2021",
    "Orden HAC 266 2024",
  ],
  sections: [
    {
      id: "model-234-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-234-purpose-identity",
          heading: "Mecanismos transfronterizos de planificación fiscal",
          text: "El índice de modelos, la portada del procedimiento y la Orden HAC/342/2021 identifican el Modelo 234 como declaración de información de determinados mecanismos transfronterizos de planificación fiscal.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_234_PROCEDURE_HOME_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-234-purpose-description",
          heading: "Mecanismos en los que concurren señas distintivas",
          text: "La ficha administrativa describe como objeto del procedimiento la información sobre mecanismos que tengan condición transfronteriza y en los que concurran las circunstancias denominadas señas distintivas. Esta descripción no evalúa un mecanismo concreto.",
          sourceIds: [MODEL_234_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-234-access",
      title: "Canales electrónicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-234-access-browser-service",
          heading: "Formulario de la Sede y servicio web",
          text: "La portada y la ayuda técnica describen un formulario en la Sede y un servicio web. Esta ficha registra los canales sin enlazar ningún endpoint operativo.",
          sourceIds: [
            MODEL_234_PROCEDURE_HOME_SOURCE.id,
            MODEL_234_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-234-access-file",
          heading: "Carga de archivo XML mediante la Sede",
          text: "El manual técnico versión 1.14 documenta como tercer canal la carga mediante la Sede de un archivo XML ajustado al esquema compartido por los Modelos 234, 235 y 236.",
          sourceIds: [SHARED_TECHNICAL_MANUAL_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-234-details",
      title: "Documentación y trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-234-details-materials",
          heading: "Nota, preguntas frecuentes y manual técnico",
          text: "La portada enlaza una nota informativa, un documento de preguntas frecuentes y el manual técnico versión 1.14. Son documentos informativos y técnicos, no impresos PDF en blanco del modelo.",
          sourceIds: [
            MODEL_234_PROCEDURE_HOME_SOURCE.id,
            SHARED_INFORMATION_NOTE_SOURCE.id,
            SHARED_FAQ_SOURCE.id,
            SHARED_TECHNICAL_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-234-details-files",
          heading: "Plantillas, esquemas y ejemplos descargables",
          text: "La AEAT publica un ZIP de plantillas CSV, otro con XSD 4.04 y WSDL 1.0.1 y un tercero con ejemplos XML para los tres modelos.",
          sourceIds: [
            SHARED_CSV_TEMPLATES_SOURCE.id,
            SHARED_XSD_WSDL_SOURCE.id,
            SHARED_XML_EXAMPLES_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-234-details-normative",
          heading: "Marco normativo enlazado",
          text: "La Ley 10/2020 y el Real Decreto 243/2021 forman parte del marco normativo enlazado. La Orden HAC/342/2021 aprobó los Modelos 234, 235 y 236, y la Orden HAC/266/2024 sustituyó el contenido del Modelo 234 en su anexo.",
          sourceIds: [
            LAW_10_2020_SOURCE.id,
            ROYAL_DECREE_243_2021_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
            ORDER_HAC_266_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_234_PROCEDURE_HOME_SOURCE,
    MODEL_234_PROCEDURE_RECORD_SOURCE,
    MODEL_234_HELP_SOURCE,
    SHARED_INFORMATION_NOTE_SOURCE,
    SHARED_FAQ_SOURCE,
    SHARED_TECHNICAL_MANUAL_SOURCE,
    SHARED_CSV_TEMPLATES_SOURCE,
    SHARED_XSD_WSDL_SOURCE,
    SHARED_XML_EXAMPLES_SOURCE,
    LAW_10_2020_SOURCE,
    ROYAL_DECREE_243_2021_SOURCE,
    ORDER_HAC_342_2021_SOURCE,
    ORDER_HAC_266_2024_SOURCE,
  ],
  documents: SHARED_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-234-link-procedure",
      label: "Página oficial del Modelo 234",
      sourceId: MODEL_234_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_234_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-help",
      label: "Ayuda técnica oficial del Modelo 234",
      sourceId: MODEL_234_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-note",
      label: "Nota informativa oficial de los Modelos 234, 235 y 236",
      sourceId: SHARED_INFORMATION_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: SHARED_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-manual",
      label: "Manual técnico oficial · versión 1.14",
      sourceId: SHARED_TECHNICAL_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-csv",
      label: "Plantillas de importación CSV",
      sourceId: SHARED_CSV_TEMPLATES_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-xsd-wsdl",
      label: "Esquemas XSD 4.04 y WSDL 1.0.1",
      sourceId: SHARED_XSD_WSDL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-xml-examples",
      label: "Ejemplos XML oficiales",
      sourceId: SHARED_XML_EXAMPLES_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-law",
      label: "Ley 10/2020",
      sourceId: LAW_10_2020_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-royal-decree",
      label: "Real Decreto 243/2021",
      sourceId: ROYAL_DECREE_243_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-order",
      label: "Orden HAC/342/2021 · texto consolidado",
      sourceId: ORDER_HAC_342_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-link-update-order",
      label: "Orden HAC/266/2024",
      sourceId: ORDER_HAC_266_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-234-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 234?",
      answer:
        "Lo identifica como la declaración de información de determinados mecanismos transfronterizos de planificación fiscal.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_234_PROCEDURE_HOME_SOURCE.id,
        ORDER_HAC_342_2021_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-object",
      question: "¿Cómo describe la ficha administrativa su objeto?",
      answer:
        "Lo relaciona con mecanismos de condición transfronteriza en los que concurren las circunstancias denominadas señas distintivas.",
      sourceIds: [MODEL_234_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-channels",
      question: "¿Qué canales electrónicos describen las fuentes oficiales?",
      answer:
        "Describen un formulario en la Sede, la carga de archivo XML mediante la Sede y un servicio web.",
      sourceIds: [
        MODEL_234_PROCEDURE_HOME_SOURCE.id,
        MODEL_234_HELP_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-file-format",
      question: "¿Qué formato documenta el canal de fichero?",
      answer:
        "El manual técnico documenta archivos XML ajustados al esquema compartido de los Modelos 234, 235 y 236.",
      sourceIds: [SHARED_TECHNICAL_MANUAL_SOURCE.id, SHARED_XSD_WSDL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-materials",
      question: "¿Qué documentación informativa publica la AEAT?",
      answer:
        "Publica una nota informativa, un PDF de preguntas frecuentes y el manual técnico versión 1.14, además de plantillas, esquemas y ejemplos XML.",
      sourceIds: [
        SHARED_INFORMATION_NOTE_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
        SHARED_CSV_TEMPLATES_SOURCE.id,
        SHARED_XSD_WSDL_SOURCE.id,
        SHARED_XML_EXAMPLES_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-pdf-form",
      question: "¿Hay un impreso PDF en blanco propio del Modelo 234?",
      answer:
        "Las fuentes registradas describen canales electrónicos y enlazan documentación informativa o técnica; no registran un impreso PDF en blanco propio del Modelo 234.",
      sourceIds: [
        MODEL_234_PROCEDURE_HOME_SOURCE.id,
        MODEL_234_HELP_SOURCE.id,
        SHARED_INFORMATION_NOTE_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-normative",
      question:
        "¿Qué normas trazan la aprobación y la actualización del modelo?",
      answer:
        "La Orden HAC/342/2021 aprobó los tres modelos de este bloque y la Orden HAC/266/2024 sustituyó el contenido del Modelo 234 en su anexo.",
      sourceIds: [ORDER_HAC_342_2021_SOURCE.id, ORDER_HAC_266_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-234-faq-applicability",
      question: "¿Esta ficha decide si un mecanismo corresponde al Modelo 234?",
      answer:
        "No. Registra identidad, objeto, canales y fuentes oficiales, pero no evalúa mecanismos ni circunstancias concretas.",
      sourceIds: [MODEL_234_PROCEDURE_RECORD_SOURCE.id, SHARED_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_234_PROCEDURE_HOME_SOURCE.id,
      MODEL_234_HELP_SOURCE.id,
      SHARED_TECHNICAL_MANUAL_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"234">;

const MODEL_235_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_RELEASE_ID_V1,
  code: "235",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración de información de actualización de determinados mecanismos transfronterizos comercializables",
  summary:
    "Declaración informativa que la AEAT y el BOE identifican con la actualización de determinados mecanismos transfronterizos comercializables previamente informados, acompañada de canales y documentación técnica oficiales.",
  searchTerms: [
    "modelo 235",
    "actualización mecanismos transfronterizos comercializables",
    "mecanismos comercializables",
    "DAC6",
    "formulario web modelo 235",
    "archivo XML modelo 235",
    "servicio web modelo 235",
    "manual técnico 234 235 236 versión 1.14",
    "FAQ mecanismos transfronterizos",
    "XSD 4.04",
    "WSDL 1.0.1",
    "Orden HAC 342 2021",
  ],
  sections: [
    {
      id: "model-235-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-235-purpose-identity",
          heading: "Actualización de mecanismos comercializables",
          text: "El índice de modelos, la portada del procedimiento y la Orden HAC/342/2021 identifican el Modelo 235 como declaración de información de actualización de determinados mecanismos transfronterizos comercializables.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_235_PROCEDURE_HOME_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-235-purpose-description",
          heading: "Datos actualizados de mecanismos previamente declarados",
          text: "La ficha administrativa describe como objeto los datos actualizados de mecanismos transfronterizos comercializables que hayan sido declarados con anterioridad. Esta descripción no evalúa una operación concreta.",
          sourceIds: [MODEL_235_PROCEDURE_RECORD_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-235-access",
      title: "Canales electrónicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-235-access-browser-service",
          heading: "Formulario de la Sede y servicio web",
          text: "La portada y la ayuda técnica describen un formulario en la Sede y un servicio web. Esta ficha registra los canales sin enlazar ningún endpoint operativo.",
          sourceIds: [
            MODEL_235_PROCEDURE_HOME_SOURCE.id,
            MODEL_235_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-235-access-file",
          heading: "Carga de archivo XML mediante la Sede",
          text: "El manual técnico versión 1.14 documenta como tercer canal la carga mediante la Sede de un archivo XML ajustado al esquema compartido por los Modelos 234, 235 y 236.",
          sourceIds: [SHARED_TECHNICAL_MANUAL_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-235-details",
      title: "Documentación y trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-235-details-materials",
          heading: "Nota, preguntas frecuentes y manual técnico",
          text: "La portada enlaza una nota informativa, un documento de preguntas frecuentes y el manual técnico versión 1.14. Son documentos informativos y técnicos, no impresos PDF en blanco del modelo.",
          sourceIds: [
            MODEL_235_PROCEDURE_HOME_SOURCE.id,
            SHARED_INFORMATION_NOTE_SOURCE.id,
            SHARED_FAQ_SOURCE.id,
            SHARED_TECHNICAL_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-235-details-files",
          heading: "Plantillas, esquemas y ejemplos descargables",
          text: "La AEAT publica un ZIP de plantillas CSV, otro con XSD 4.04 y WSDL 1.0.1 y un tercero con ejemplos XML para los tres modelos.",
          sourceIds: [
            SHARED_CSV_TEMPLATES_SOURCE.id,
            SHARED_XSD_WSDL_SOURCE.id,
            SHARED_XML_EXAMPLES_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-235-details-normative",
          heading: "Marco normativo enlazado",
          text: "La Ley 10/2020 y el Real Decreto 243/2021 forman parte del marco normativo enlazado, y la Orden HAC/342/2021 aprobó los Modelos 234, 235 y 236.",
          sourceIds: [
            LAW_10_2020_SOURCE.id,
            ROYAL_DECREE_243_2021_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_235_PROCEDURE_HOME_SOURCE,
    MODEL_235_PROCEDURE_RECORD_SOURCE,
    MODEL_235_HELP_SOURCE,
    SHARED_INFORMATION_NOTE_SOURCE,
    SHARED_FAQ_SOURCE,
    SHARED_TECHNICAL_MANUAL_SOURCE,
    SHARED_CSV_TEMPLATES_SOURCE,
    SHARED_XSD_WSDL_SOURCE,
    SHARED_XML_EXAMPLES_SOURCE,
    LAW_10_2020_SOURCE,
    ROYAL_DECREE_243_2021_SOURCE,
    ORDER_HAC_342_2021_SOURCE,
  ],
  documents: SHARED_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-235-link-procedure",
      label: "Página oficial del Modelo 235",
      sourceId: MODEL_235_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_235_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-help",
      label: "Ayuda técnica oficial del Modelo 235",
      sourceId: MODEL_235_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-note",
      label: "Nota informativa oficial de los Modelos 234, 235 y 236",
      sourceId: SHARED_INFORMATION_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: SHARED_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-manual",
      label: "Manual técnico oficial · versión 1.14",
      sourceId: SHARED_TECHNICAL_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-csv",
      label: "Plantillas de importación CSV",
      sourceId: SHARED_CSV_TEMPLATES_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-xsd-wsdl",
      label: "Esquemas XSD 4.04 y WSDL 1.0.1",
      sourceId: SHARED_XSD_WSDL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-xml-examples",
      label: "Ejemplos XML oficiales",
      sourceId: SHARED_XML_EXAMPLES_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-law",
      label: "Ley 10/2020",
      sourceId: LAW_10_2020_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-royal-decree",
      label: "Real Decreto 243/2021",
      sourceId: ROYAL_DECREE_243_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-link-order",
      label: "Orden HAC/342/2021 · texto consolidado",
      sourceId: ORDER_HAC_342_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-235-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 235?",
      answer:
        "Lo identifica como la declaración de información de actualización de determinados mecanismos transfronterizos comercializables.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_235_PROCEDURE_HOME_SOURCE.id,
        ORDER_HAC_342_2021_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-object",
      question: "¿Cómo describe la ficha administrativa su objeto?",
      answer:
        "Lo describe como información actualizada de mecanismos transfronterizos comercializables que hayan sido declarados con anterioridad.",
      sourceIds: [MODEL_235_PROCEDURE_RECORD_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-channels",
      question: "¿Qué canales electrónicos describen las fuentes oficiales?",
      answer:
        "Describen un formulario en la Sede, la carga de archivo XML mediante la Sede y un servicio web.",
      sourceIds: [
        MODEL_235_PROCEDURE_HOME_SOURCE.id,
        MODEL_235_HELP_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-file-format",
      question: "¿Qué formato documenta el canal de fichero?",
      answer:
        "El manual técnico documenta archivos XML ajustados al esquema compartido de los Modelos 234, 235 y 236.",
      sourceIds: [SHARED_TECHNICAL_MANUAL_SOURCE.id, SHARED_XSD_WSDL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-materials",
      question: "¿Qué documentación informativa publica la AEAT?",
      answer:
        "Publica una nota informativa, un PDF de preguntas frecuentes y el manual técnico versión 1.14, además de plantillas, esquemas y ejemplos XML.",
      sourceIds: [
        SHARED_INFORMATION_NOTE_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
        SHARED_CSV_TEMPLATES_SOURCE.id,
        SHARED_XSD_WSDL_SOURCE.id,
        SHARED_XML_EXAMPLES_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-pdf-form",
      question: "¿Hay un impreso PDF en blanco propio del Modelo 235?",
      answer:
        "Las fuentes registradas describen canales electrónicos y enlazan documentación informativa o técnica; no registran un impreso PDF en blanco propio del Modelo 235.",
      sourceIds: [
        MODEL_235_PROCEDURE_HOME_SOURCE.id,
        MODEL_235_HELP_SOURCE.id,
        SHARED_INFORMATION_NOTE_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-normative",
      question: "¿Qué norma aprobó el Modelo 235?",
      answer:
        "La Orden HAC/342/2021 aprobó conjuntamente los Modelos 234, 235 y 236.",
      sourceIds: [ORDER_HAC_342_2021_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-235-faq-applicability",
      question:
        "¿Esta ficha decide si una actualización corresponde al Modelo 235?",
      answer:
        "No. Registra identidad, objeto, canales y fuentes oficiales, pero no evalúa mecanismos ni circunstancias concretas.",
      sourceIds: [MODEL_235_PROCEDURE_RECORD_SOURCE.id, SHARED_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_235_PROCEDURE_HOME_SOURCE.id,
      MODEL_235_HELP_SOURCE.id,
      SHARED_TECHNICAL_MANUAL_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"235">;

const MODEL_236_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_RELEASE_ID_V1,
  code: "236",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración de información de la utilización de determinados mecanismos transfronterizos de planificación fiscal",
  summary:
    "Declaración informativa que la AEAT y el BOE identifican con la utilización en España de determinados mecanismos transfronterizos de planificación fiscal, acompañada de canales y documentación técnica oficiales.",
  searchTerms: [
    "modelo 236",
    "utilización mecanismos transfronterizos España",
    "planificación fiscal transfronteriza",
    "DAC6",
    "formulario web modelo 236",
    "archivo XML modelo 236",
    "servicio web modelo 236",
    "manual técnico 234 235 236 versión 1.14",
    "FAQ mecanismos transfronterizos",
    "XSD 4.04",
    "WSDL 1.0.1",
    "disposición adicional vigésima tercera",
    "discrepancia GI48",
    "Orden HAC 342 2021",
  ],
  sections: [
    {
      id: "model-236-purpose",
      title: "Identidad y objeto oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-236-purpose-identity",
          heading: "Utilización de mecanismos transfronterizos",
          text: "El índice de modelos, la portada del procedimiento y la Orden HAC/342/2021 identifican el Modelo 236 como declaración de información de la utilización de determinados mecanismos transfronterizos de planificación fiscal.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            MODEL_236_PROCEDURE_HOME_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-236-purpose-description",
          heading: "Utilización en España",
          text: "La Orden HAC/342/2021 y las preguntas frecuentes describen el modelo en relación con información sobre la utilización en España de mecanismos transfronterizos de planificación fiscal. Esta descripción no evalúa un mecanismo concreto.",
          sourceIds: [ORDER_HAC_342_2021_SOURCE.id, SHARED_FAQ_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-236-access",
      title: "Canales electrónicos descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-236-access-browser-service",
          heading: "Formulario de la Sede y servicio web",
          text: "La portada y la ayuda técnica describen un formulario en la Sede y un servicio web. Esta ficha registra los canales sin enlazar ningún endpoint operativo.",
          sourceIds: [
            MODEL_236_PROCEDURE_HOME_SOURCE.id,
            MODEL_236_HELP_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-236-access-file",
          heading: "Carga de archivo XML mediante la Sede",
          text: "El manual técnico versión 1.14 documenta como tercer canal la carga mediante la Sede de un archivo XML ajustado al esquema compartido por los Modelos 234, 235 y 236.",
          sourceIds: [SHARED_TECHNICAL_MANUAL_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-236-source-discrepancy",
      title: "Discrepancia registrada entre fuentes oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-236-source-discrepancy-reference",
          heading: "DA 24.1.c en GI48 frente a DA 23.1.c en BOE y FAQ",
          text: "La ficha administrativa GI48 cita la disposición adicional vigésima cuarta, apartado 1.c, de la Ley General Tributaria. La Orden HAC/342/2021 y las preguntas frecuentes oficiales sitúan la referencia factual del Modelo 236 en la disposición adicional vigésima tercera, apartado 1.c.",
          sourceIds: [
            MODEL_236_PROCEDURE_RECORD_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
            SHARED_FAQ_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-236-source-discrepancy-treatment",
          heading: "Referencia conservadora, sin resolver la discrepancia",
          text: "Esta ficha conserva visible la diferencia y usa el texto del BOE y el FAQ oficial como referencia factual conservadora. No resuelve la discrepancia ni extrae de ella una conclusión jurídica o de aplicabilidad.",
          sourceIds: [
            LAW_10_2020_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
            SHARED_FAQ_SOURCE.id,
            MODEL_236_PROCEDURE_RECORD_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-236-details",
      title: "Documentación y trazabilidad normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-236-details-materials",
          heading: "Nota, preguntas frecuentes y manual técnico",
          text: "La portada enlaza una nota informativa, un documento de preguntas frecuentes y el manual técnico versión 1.14. Son documentos informativos y técnicos, no impresos PDF en blanco del modelo.",
          sourceIds: [
            MODEL_236_PROCEDURE_HOME_SOURCE.id,
            SHARED_INFORMATION_NOTE_SOURCE.id,
            SHARED_FAQ_SOURCE.id,
            SHARED_TECHNICAL_MANUAL_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-236-details-files",
          heading: "Plantillas, esquemas y ejemplos descargables",
          text: "La AEAT publica un ZIP de plantillas CSV, otro con XSD 4.04 y WSDL 1.0.1 y un tercero con ejemplos XML para los tres modelos.",
          sourceIds: [
            SHARED_CSV_TEMPLATES_SOURCE.id,
            SHARED_XSD_WSDL_SOURCE.id,
            SHARED_XML_EXAMPLES_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-236-details-normative",
          heading: "Marco normativo enlazado",
          text: "La Ley 10/2020 y el Real Decreto 243/2021 forman parte del marco normativo enlazado, y la Orden HAC/342/2021 aprobó los Modelos 234, 235 y 236.",
          sourceIds: [
            LAW_10_2020_SOURCE.id,
            ROYAL_DECREE_243_2021_SOURCE.id,
            ORDER_HAC_342_2021_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    MODEL_236_PROCEDURE_HOME_SOURCE,
    MODEL_236_PROCEDURE_RECORD_SOURCE,
    MODEL_236_HELP_SOURCE,
    SHARED_INFORMATION_NOTE_SOURCE,
    SHARED_FAQ_SOURCE,
    SHARED_TECHNICAL_MANUAL_SOURCE,
    SHARED_CSV_TEMPLATES_SOURCE,
    SHARED_XSD_WSDL_SOURCE,
    SHARED_XML_EXAMPLES_SOURCE,
    LAW_10_2020_SOURCE,
    ROYAL_DECREE_243_2021_SOURCE,
    ORDER_HAC_342_2021_SOURCE,
  ],
  documents: SHARED_DOCUMENTS,
  thumbnail: null,
  links: [
    {
      id: "model-236-link-procedure",
      label: "Página oficial del Modelo 236",
      sourceId: MODEL_236_PROCEDURE_HOME_SOURCE.id,
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: MODEL_236_PROCEDURE_RECORD_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-help",
      label: "Ayuda técnica oficial del Modelo 236",
      sourceId: MODEL_236_HELP_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-note",
      label: "Nota informativa oficial de los Modelos 234, 235 y 236",
      sourceId: SHARED_INFORMATION_NOTE_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: SHARED_FAQ_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-manual",
      label: "Manual técnico oficial · versión 1.14",
      sourceId: SHARED_TECHNICAL_MANUAL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-csv",
      label: "Plantillas de importación CSV",
      sourceId: SHARED_CSV_TEMPLATES_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-xsd-wsdl",
      label: "Esquemas XSD 4.04 y WSDL 1.0.1",
      sourceId: SHARED_XSD_WSDL_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-xml-examples",
      label: "Ejemplos XML oficiales",
      sourceId: SHARED_XML_EXAMPLES_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-law",
      label: "Ley 10/2020",
      sourceId: LAW_10_2020_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-royal-decree",
      label: "Real Decreto 243/2021",
      sourceId: ROYAL_DECREE_243_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-link-order",
      label: "Orden HAC/342/2021 · texto consolidado",
      sourceId: ORDER_HAC_342_2021_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-236-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 236?",
      answer:
        "Lo identifica como la declaración de información de la utilización de determinados mecanismos transfronterizos de planificación fiscal.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        MODEL_236_PROCEDURE_HOME_SOURCE.id,
        ORDER_HAC_342_2021_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-object",
      question: "¿Cómo describen el BOE y el FAQ su objeto?",
      answer:
        "Lo relacionan con información sobre la utilización en España de mecanismos transfronterizos de planificación fiscal.",
      sourceIds: [ORDER_HAC_342_2021_SOURCE.id, SHARED_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-channels",
      question: "¿Qué canales electrónicos describen las fuentes oficiales?",
      answer:
        "Describen un formulario en la Sede, la carga de archivo XML mediante la Sede y un servicio web.",
      sourceIds: [
        MODEL_236_PROCEDURE_HOME_SOURCE.id,
        MODEL_236_HELP_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-file-format",
      question: "¿Qué formato documenta el canal de fichero?",
      answer:
        "El manual técnico documenta archivos XML ajustados al esquema compartido de los Modelos 234, 235 y 236.",
      sourceIds: [SHARED_TECHNICAL_MANUAL_SOURCE.id, SHARED_XSD_WSDL_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-materials",
      question: "¿Qué documentación informativa publica la AEAT?",
      answer:
        "Publica una nota informativa, un PDF de preguntas frecuentes y el manual técnico versión 1.14, además de plantillas, esquemas y ejemplos XML.",
      sourceIds: [
        SHARED_INFORMATION_NOTE_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
        SHARED_CSV_TEMPLATES_SOURCE.id,
        SHARED_XSD_WSDL_SOURCE.id,
        SHARED_XML_EXAMPLES_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-source-discrepancy",
      question:
        "¿Qué discrepancia existe entre la ficha GI48 y las demás fuentes oficiales?",
      answer:
        "GI48 cita la disposición adicional vigésima cuarta, apartado 1.c. La Orden HAC/342/2021 y el FAQ oficial sitúan la referencia del Modelo 236 en la disposición adicional vigésima tercera, apartado 1.c. Esta ficha conserva visible la diferencia y no la resuelve.",
      sourceIds: [
        MODEL_236_PROCEDURE_RECORD_SOURCE.id,
        ORDER_HAC_342_2021_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-reference-treatment",
      question: "¿Qué referencia factual usa esta ficha ante esa discrepancia?",
      answer:
        "Usa de forma conservadora el texto del BOE y el FAQ oficial, sin extraer una conclusión jurídica ni decidir la aplicabilidad del modelo.",
      sourceIds: [
        LAW_10_2020_SOURCE.id,
        ORDER_HAC_342_2021_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-pdf-form",
      question: "¿Hay un impreso PDF en blanco propio del Modelo 236?",
      answer:
        "Las fuentes registradas describen canales electrónicos y enlazan documentación informativa o técnica; no registran un impreso PDF en blanco propio del Modelo 236.",
      sourceIds: [
        MODEL_236_PROCEDURE_HOME_SOURCE.id,
        MODEL_236_HELP_SOURCE.id,
        SHARED_INFORMATION_NOTE_SOURCE.id,
        SHARED_FAQ_SOURCE.id,
        SHARED_TECHNICAL_MANUAL_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-normative",
      question: "¿Qué norma aprobó el Modelo 236?",
      answer:
        "La Orden HAC/342/2021 aprobó conjuntamente los Modelos 234, 235 y 236.",
      sourceIds: [ORDER_HAC_342_2021_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-236-faq-applicability",
      question:
        "¿Esta ficha decide si una utilización corresponde al Modelo 236?",
      answer:
        "No. Registra identidad, objeto, canales y fuentes oficiales, pero no evalúa mecanismos ni circunstancias concretas.",
      sourceIds: [ORDER_HAC_342_2021_SOURCE.id, SHARED_FAQ_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      MODEL_236_PROCEDURE_HOME_SOURCE.id,
      MODEL_236_HELP_SOURCE.id,
      SHARED_TECHNICAL_MANUAL_SOURCE.id,
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"236">;

export const PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_CONTENT_V1 =
  deepFreeze([
    MODEL_234_CONTENT,
    MODEL_235_CONTENT,
    MODEL_236_CONTENT,
  ] as const);
