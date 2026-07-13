import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialContentThumbnailV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_14_EXCISE_MARKS_OPERATIONS_515_520_RELEASE_ID_V1 =
  "public-aeat-official-batch-14-excise-marks-operations-515-520.2026-07-13.v1" as const;

export type PublicAeatBatch14ExciseMarksOperations515520CodeV1 =
  "515" | "517" | "518" | "519" | "520";

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

const EXCISE_MODEL_INDEX_SOURCE = {
  id: "aeat.excise-models.index.2026-07-08",
  authority: "AEAT",
  kind: "OFFICIAL_MODEL_INDEX",
  title: "Modelos de impuestos especiales y medioambientales",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/modelos-impuestos-especiales-medioambientales.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "e28ae24036a5d2fb7fe5461bc62dcc1f5d95ef745920b18e5422958305bc51f1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const PRESENTATION_CHANNELS_SOURCE = {
  id: "aeat.models.presentation-channels.2026.2025-12-16",
  authority: "AEAT",
  kind: "HELP_PAGE",
  title: "Formas de presentación de los modelos · calendario 2026",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/formas-presentacion-modelos.html",
  officialUpdatedOn: "2025-12-16",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8cb4e25f47d6079e5fa1026696c9428eb9df3536d412b38ac913305937e6d553",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_66_2024_SOURCE = {
  id: "boe.model-515.order-hac-66-2024.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/66/2024, de 25 de enero",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1990",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1bdcaa1ab6c66baf3ae6e23ff785a51da2c2bfcc77d439c82bd301053f60d145",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1271_2019_SOURCE = {
  id: "boe.model-517.order-hac-1271-2019.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1271/2019, de 9 de diciembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-18747",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "8f513d0a1e13ca3446c375782f21b3edb0a84319f88740baa0c00a7529f190eb",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_626_2020_SOURCE = {
  id: "boe.model-517.order-hac-626-2020.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/626/2020, de 6 de julio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-7507",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5c7fd7beb1cba5a3977512a74579b2cd940d1565159703660d772dec533f5eea",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const RESOLUTION_20_JANUARY_1998_SOURCE = {
  id: "boe.models-518-520.resolution-20-january-1998.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Resolución de 20 de enero de 1998",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-1998-2297",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1d59da1592477e017e53b8e085cae69c6d274ae7cb24f12984d7879b85912e9d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_515_INFORMATION_SOURCE = {
  id: "aeat.model-515.marks-information.2024-04-11",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Marcas fiscales de tabaco",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/marcas-fiscales/marcas-fiscales-tabaco.html",
  officialUpdatedOn: "2024-04-11",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "7513a8dc76d6ea5d36df1fe8e36f3ade1efdc32694ef1256fbe7bfd33d94df0d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_515_GUIDE_SOURCE = {
  id: "aeat.model-515.precinct-guide.pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Documento informativo de precintas fiscales de tabacos",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/marcas_fiscales/DOC_PRECINTA_TABACOS.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "fbf99b1fc56b6b91c65034788089fd2ec2193fff6d97d2897af0f2116e5304c5",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_515_GUIDE_DOCUMENT = {
  id: "model-515-official-precinct-guide",
  kind: "GUIDE",
  title: "Documento informativo de precintas fiscales de tabacos",
  sourceId: MODEL_515_GUIDE_SOURCE.id,
  landingPageSourceId: MODEL_515_INFORMATION_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "DOC_PRECINTA_TABACOS.pdf",
  byteLength: 591414,
  pageCount: 4,
  sha256: MODEL_515_GUIDE_SOURCE.sourceSha256,
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "DOCUMENT_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_517_INFORMATION_SOURCE = {
  id: "aeat.model-517.marks-information.2025-11-05",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Marcas fiscales de bebidas derivadas",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/marcas-fiscales/marcas-fiscales-bebidas-derivadas.html",
  officialUpdatedOn: "2025-11-05",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "588eceab7936c4ffb4a9c2302c7476c2a5eb0a164bc2a09caf397e274dc4302f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_517_BOX_GUIDE_SOURCE = {
  id: "aeat.model-517.box-information.pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Información adicional de cajas de precintas suministrada por FNMT",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/AEAT/Aduanas/Contenidos_Privados/Impuestos_especiales/marcas_fiscales/InformacionCajaPrecintas.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "35712dd07a00287e38da95d70de81f04e05a1e75e40c50b7ff103d12d3ce33b7",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_517_GUIDE_SOURCE = {
  id: "aeat.model-517.precinct-guide.pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Documento informativo de precintas fiscales de bebidas derivadas",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/II_especiales/marcas_fiscales/Doc_prec_bebidas.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "1ab297f0cc9712333bb09157411985e079aa2376ec8fa3f1ebe082fe555e8707",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_517_BOX_GUIDE_DOCUMENT = {
  id: "model-517-official-box-guide",
  kind: "GUIDE",
  title: "Información adicional de cajas de precintas suministrada por FNMT",
  sourceId: MODEL_517_BOX_GUIDE_SOURCE.id,
  landingPageSourceId: MODEL_517_INFORMATION_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "InformacionCajaPrecintas.pdf",
  byteLength: 771397,
  pageCount: 2,
  sha256: MODEL_517_BOX_GUIDE_SOURCE.sourceSha256,
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "DOCUMENT_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_517_GUIDE_DOCUMENT = {
  id: "model-517-official-precinct-guide",
  kind: "GUIDE",
  title: "Documento informativo de precintas fiscales de bebidas derivadas",
  sourceId: MODEL_517_GUIDE_SOURCE.id,
  landingPageSourceId: MODEL_517_INFORMATION_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "Doc_prec_bebidas.pdf",
  byteLength: 543179,
  pageCount: 2,
  sha256: MODEL_517_GUIDE_SOURCE.sourceSha256,
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "DOCUMENT_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_518_DOWNLOAD_SOURCE = {
  id: "aeat.model-518.download.2026-03-10",
  authority: "AEAT",
  kind: "DOWNLOAD_PAGE",
  title: "Descarga del Modelo 518",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/ii_ee-declaraciones-operaciones-trabajo/modelos-518-519-520-iiee-trabajo_/descarga-modelo-518.html",
  officialUpdatedOn: "2026-03-10",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b71d0decb0f35683bce6dd7f36ba4e69d1a4a856285655c04d47882f8dbf216b",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_518_DOCUMENT_SOURCE = {
  id: "aeat.model-518.official-form.pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Impreso oficial del Modelo 518",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DG01/modelo/mod518.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5dcce068b9bdce0eb7eba4b78da7640ec578aab90bc17b0b1289fea2696e73c3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_518_INSTRUCTIONS_SOURCE = {
  id: "aeat.model-518.official-instructions.pdf",
  authority: "AEAT",
  kind: "DOCUMENT_PDF",
  title: "Instrucciones oficiales del Modelo 518",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DG01/instrmod518.pdf",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2128111dc536127754f29825ebebb089e1691eb83ddd39dd5a47b514e5a2113c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_518_DOCUMENT = {
  id: "model-518-official-form",
  kind: "FORM",
  title: "Impreso oficial del Modelo 518",
  sourceId: MODEL_518_DOCUMENT_SOURCE.id,
  landingPageSourceId: MODEL_518_DOWNLOAD_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "mod518.pdf",
  byteLength: 180971,
  pageCount: 3,
  sha256: MODEL_518_DOCUMENT_SOURCE.sourceSha256,
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "NO_ACROFORM_DETECTED",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "FORM_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_518_INSTRUCTIONS_DOCUMENT = {
  id: "model-518-official-instructions",
  kind: "INSTRUCTIONS",
  title: "Instrucciones oficiales del Modelo 518",
  sourceId: MODEL_518_INSTRUCTIONS_SOURCE.id,
  landingPageSourceId: MODEL_518_DOWNLOAD_SOURCE.id,
  mediaType: "application/pdf",
  fileName: "instrmod518.pdf",
  byteLength: 47248,
  pageCount: 2,
  sha256: MODEL_518_INSTRUCTIONS_SOURCE.sourceSha256,
  activeContentStatus: "NO_JAVASCRIPT_DETECTED",
  formStatus: "ACROFORM_METADATA_ONLY",
  freshnessStatus: "CURRENTNESS_UNDETERMINED",
  previewSuitability: "DOCUMENT_PREVIEW",
  usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
} as const satisfies PublicAeatOfficialContentDocumentV1;

const MODEL_518_THUMBNAIL = {
  id: "model-518-official-form-thumbnail",
  sourceId: MODEL_518_DOCUMENT_SOURCE.id,
  publicHref: "/fiscal-models/modelo-518/formulario-modelo-518-preview.png",
  mediaType: "image/png",
  width: 640,
  height: 640,
  pageNumber: 1,
  cropVariant: "HEADER_AND_DOCUMENT_START",
  sha256: "8a180f87b0124a0647032ee1fbbc75676a13b4c9a5e747493307cea2e39a811f",
  alt: "Vista previa del encabezado del impreso oficial del Modelo 518",
  provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
} as const satisfies PublicAeatOfficialContentThumbnailV1;

type ModelSpec<
  Code extends PublicAeatBatch14ExciseMarksOperations515520CodeV1,
> = Readonly<{
  code: Code;
  procedureCode: "DE04" | "DG01";
  canonicalName: string;
  aeatGrouping: string;
  summary: string;
  context: string;
  documentNote: string;
  searchTerms: readonly [string, ...string[]];
  homeSha256: string;
  recordSha256: string;
  legalSource: PublicAeatOfficialContentSourceV1;
  document: PublicAeatOfficialContentDocumentV1 | null;
  thumbnail: PublicAeatOfficialContentThumbnailV1 | null;
}>;

function procedureSource<
  Code extends PublicAeatBatch14ExciseMarksOperations515520CodeV1,
>(
  spec: ModelSpec<Code>,
  kind: "PROCEDURE_HOME" | "PROCEDURE_RECORD",
): PublicAeatOfficialContentSourceV1 {
  const record = kind === "PROCEDURE_RECORD";
  return {
    id: `aeat.model-${spec.code}.${record ? "procedure-record" : "procedure-home"}.2026-06-09`,
    authority: "AEAT",
    kind,
    title: `${record ? "Ficha del procedimiento" : "Página oficial"} del Modelo ${spec.code}`,
    canonicalUrl: `https://sede.agenciatributaria.gob.es/Sede/${record ? "procedimientos" : "procedimientoini"}/${spec.procedureCode}.shtml`,
    officialUpdatedOn: "2026-06-09",
    capturedOn: REVIEWED_ON,
    sourceSha256: record ? spec.recordSha256 : spec.homeSha256,
    verificationStatus: "SOURCE_HASH_CAPTURED",
  };
}

function createModel<
  Code extends PublicAeatBatch14ExciseMarksOperations515520CodeV1,
>(spec: ModelSpec<Code>): PublicAeatOfficialModelContentV1<Code> {
  const home = procedureSource(spec, "PROCEDURE_HOME");
  const record = procedureSource(spec, "PROCEDURE_RECORD");
  const supplementalContentSources =
    spec.code === "515"
      ? [MODEL_515_INFORMATION_SOURCE, MODEL_515_GUIDE_SOURCE]
      : spec.code === "517"
        ? [
            MODEL_517_INFORMATION_SOURCE,
            MODEL_517_BOX_GUIDE_SOURCE,
            MODEL_517_GUIDE_SOURCE,
          ]
        : spec.code === "518"
          ? [
              MODEL_518_DOWNLOAD_SOURCE,
              MODEL_518_DOCUMENT_SOURCE,
              MODEL_518_INSTRUCTIONS_SOURCE,
            ]
          : [];
  const informationSourceIds =
    spec.code === "515"
      ? ([MODEL_515_INFORMATION_SOURCE.id] as const)
      : spec.code === "517"
        ? ([MODEL_517_INFORMATION_SOURCE.id] as const)
        : ([] as const);
  const supplementalLegalSources =
    spec.code === "517"
      ? [ORDER_HAC_626_2020_SOURCE, ORDER_HAC_66_2024_SOURCE]
      : [];
  const legalSourceIds = [
    spec.legalSource.id,
    ...supplementalLegalSources.map((source) => source.id),
  ] as [string, ...string[]];
  const legalTitles = [
    spec.legalSource.title,
    ...supplementalLegalSources.map((source) => source.title),
  ].join(", ");
  const sources = [
    EXCISE_MODEL_INDEX_SOURCE,
    PRESENTATION_CHANNELS_SOURCE,
    home,
    record,
    spec.legalSource,
    ...supplementalLegalSources,
    ...supplementalContentSources,
  ] as [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  const materialSourceIds =
    spec.code === "515"
      ? ([
          MODEL_515_INFORMATION_SOURCE.id,
          MODEL_515_GUIDE_SOURCE.id,
          home.id,
        ] as const)
      : spec.code === "517"
        ? ([
            MODEL_517_INFORMATION_SOURCE.id,
            MODEL_517_BOX_GUIDE_SOURCE.id,
            MODEL_517_GUIDE_SOURCE.id,
            home.id,
          ] as const)
        : spec.code === "518"
          ? ([
              MODEL_518_DOWNLOAD_SOURCE.id,
              MODEL_518_DOCUMENT_SOURCE.id,
              MODEL_518_INSTRUCTIONS_SOURCE.id,
              home.id,
            ] as const)
          : ([home.id] as const);
  const accessSourceIds = [
    home.id,
    PRESENTATION_CHANNELS_SOURCE.id,
    ...informationSourceIds,
  ] as [string, ...string[]];
  const modelDocuments =
    spec.code === "515"
      ? [MODEL_515_GUIDE_DOCUMENT]
      : spec.code === "517"
        ? [MODEL_517_BOX_GUIDE_DOCUMENT, MODEL_517_GUIDE_DOCUMENT]
        : spec.code === "518"
          ? [MODEL_518_DOCUMENT, MODEL_518_INSTRUCTIONS_DOCUMENT]
          : spec.document
            ? [spec.document]
            : [];

  return deepFreeze({
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId:
      PUBLIC_AEAT_BATCH_14_EXCISE_MARKS_OPERATIONS_515_520_RELEASE_ID_V1,
    code: spec.code,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: "UNDETERMINED",
    reviewedOn: REVIEWED_ON,
    canonicalName: spec.canonicalName,
    summary: spec.summary,
    searchTerms: [`modelo ${spec.code}`, ...spec.searchTerms] as [
      string,
      ...string[],
    ],
    sections: [
      {
        id: `model-${spec.code}-identity`,
        title: "Qué identifica la AEAT",
        kind: "PURPOSE",
        items: [
          {
            id: `model-${spec.code}-identity-name`,
            heading: "Denominación oficial",
            text: `La referencia normativa contrastada identifica el Modelo ${spec.code} como «${spec.canonicalName}». La AEAT lo publica dentro de «${spec.aeatGrouping}».`,
            sourceIds: [
              EXCISE_MODEL_INDEX_SOURCE.id,
              home.id,
              ...informationSourceIds,
              ...legalSourceIds,
            ],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${spec.code}-identity-context`,
            heading: "Contexto oficial",
            text: spec.context,
            sourceIds: [
              home.id,
              record.id,
              ...informationSourceIds,
              ...legalSourceIds,
            ],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${spec.code}-materials`,
        title: "Información y materiales oficiales",
        kind: "DETAILS",
        items: [
          {
            id: `model-${spec.code}-materials-pages`,
            heading: "Página y ficha administrativa",
            text:
              informationSourceIds.length > 0
                ? "La Sede de la AEAT publica una página de gestiones, una ficha administrativa y una página temática con información específica del modelo."
                : "La Sede de la AEAT publica una página de gestiones y una ficha administrativa para consultar la descripción general del procedimiento.",
            sourceIds: [home.id, record.id, ...informationSourceIds],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${spec.code}-materials-document`,
            heading: "Material estático localizado",
            text: spec.documentNote,
            sourceIds: materialSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
      {
        id: `model-${spec.code}-access`,
        title: "Canal descrito por la fuente oficial",
        kind: "ACCESS",
        items: [
          {
            id: `model-${spec.code}-access-channel`,
            heading: "Formulario electrónico",
            text: `La página oficial y la relación de formas de presentación de 2026 describen un formulario electrónico para el Modelo ${spec.code}.`,
            sourceIds: accessSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
    ],
    sources,
    documents: modelDocuments,
    thumbnail: spec.thumbnail,
    links: [
      {
        id: `model-${spec.code}-link-home`,
        label: `Información oficial del Modelo ${spec.code}`,
        sourceId: home.id,
        category: "INFORMATION",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-link-record`,
        label: `Ficha oficial del procedimiento del Modelo ${spec.code}`,
        sourceId: record.id,
        category: "PROCEDURE",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-link-law`,
        label: spec.legalSource.title,
        sourceId: spec.legalSource.id,
        category: "LEGAL",
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
      },
      ...supplementalLegalSources.map((source) => ({
        id: `model-${spec.code}-link-${source.id}`,
        label: source.title,
        sourceId: source.id,
        category: "LEGAL" as const,
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
      })),
      ...(spec.code === "515"
        ? [
            {
              id: "model-515-link-marks-information",
              label: "Información oficial sobre marcas fiscales de tabaco",
              sourceId: MODEL_515_INFORMATION_SOURCE.id,
              category: "INFORMATION" as const,
              policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
            },
            {
              id: "model-515-link-precinct-guide",
              label: "Documento informativo de precintas fiscales de tabacos",
              sourceId: MODEL_515_GUIDE_SOURCE.id,
              category: "INFORMATION" as const,
              policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
            },
          ]
        : spec.code === "517"
          ? [
              {
                id: "model-517-link-marks-information",
                label:
                  "Información oficial sobre marcas fiscales de bebidas derivadas",
                sourceId: MODEL_517_INFORMATION_SOURCE.id,
                category: "INFORMATION" as const,
                policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
              },
              {
                id: "model-517-link-box-guide",
                label:
                  "Información adicional de cajas de precintas suministrada por FNMT",
                sourceId: MODEL_517_BOX_GUIDE_SOURCE.id,
                category: "INFORMATION" as const,
                policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
              },
              {
                id: "model-517-link-precinct-guide",
                label:
                  "Documento informativo de precintas fiscales de bebidas derivadas",
                sourceId: MODEL_517_GUIDE_SOURCE.id,
                category: "INFORMATION" as const,
                policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
              },
            ]
          : []),
      ...(spec.code === "518"
        ? [
            {
              id: "model-518-link-download",
              label: "Página oficial de descarga del Modelo 518",
              sourceId: MODEL_518_DOWNLOAD_SOURCE.id,
              category: "INFORMATION" as const,
              policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
            },
            {
              id: `model-${spec.code}-link-document`,
              label: `Impreso oficial informativo del Modelo ${spec.code}`,
              sourceId: MODEL_518_DOCUMENT_SOURCE.id,
              category: "INFORMATION" as const,
              policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
            },
            {
              id: "model-518-link-instructions",
              label: "Instrucciones oficiales del Modelo 518",
              sourceId: MODEL_518_INSTRUCTIONS_SOURCE.id,
              category: "INFORMATION" as const,
              policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
            },
          ]
        : []),
    ],
    faq: [
      {
        id: `model-${spec.code}-faq-identity`,
        question: `¿Qué es el Modelo ${spec.code}?`,
        answer: `La referencia normativa lo identifica como «${spec.canonicalName}»; la AEAT lo publica dentro de «${spec.aeatGrouping}».`,
        sourceIds: [
          EXCISE_MODEL_INDEX_SOURCE.id,
          home.id,
          ...informationSourceIds,
          ...legalSourceIds,
        ],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-context`,
        question: `¿Qué información oficial se conserva sobre el Modelo ${spec.code}?`,
        answer: spec.context,
        sourceIds: [
          home.id,
          record.id,
          ...informationSourceIds,
          ...legalSourceIds,
        ],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-pages`,
        question:
          informationSourceIds.length > 0
            ? "¿Por qué se enlazan varias páginas de la AEAT?"
            : "¿Por qué se enlazan dos páginas de la AEAT?",
        answer:
          informationSourceIds.length > 0
            ? "La página de gestiones reúne los accesos publicados, la ficha administrativa describe el procedimiento y la página temática aporta información específica del modelo."
            : "La página de gestiones reúne la información y accesos publicados; la ficha administrativa ofrece la descripción general del procedimiento.",
        sourceIds: [home.id, record.id, ...informationSourceIds],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-channel`,
        question: `¿Qué canal describe la AEAT para el Modelo ${spec.code}?`,
        answer: `Las fuentes oficiales describen un formulario electrónico para el Modelo ${spec.code}.`,
        sourceIds: accessSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-material`,
        question:
          spec.code === "515" || spec.code === "517"
            ? `¿Qué material oficial enlaza la AEAT para el Modelo ${spec.code}?`
            : "¿Hay un impreso o material estático oficial visible?",
        answer: spec.documentNote,
        sourceIds: materialSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-law`,
        question: `¿Qué referencia normativa se ha contrastado para el Modelo ${spec.code}?`,
        answer: `La trazabilidad de esta ficha incluye ${legalTitles}, junto con las páginas actuales de la AEAT.`,
        sourceIds: [...legalSourceIds, home.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-applicability`,
        question:
          "¿Esta información determina si el modelo corresponde a un caso concreto?",
        answer:
          "No. Las fuentes enlazadas describen el modelo y el procedimiento en términos generales; la ficha no evalúa circunstancias individuales.",
        sourceIds: [
          home.id,
          record.id,
          ...informationSourceIds,
          ...legalSourceIds,
        ],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    ],
    accessMethods: {
      methods: ["BROWSER_FORM"],
      status: "SOURCE_DESCRIBED",
      sourceIds: accessSourceIds,
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    externalNavigation: null,
    limitations: LIMITATIONS,
  });
}

const SPECS = [
  {
    code: "515",
    procedureCode: "DE04",
    canonicalName:
      "Solicitud de entrega de marcas fiscales para las labores del tabaco.",
    aeatGrouping:
      "Modelos 515 y 517. II. EE. Petición de marcas fiscales a la Oficina Gestora de Impuestos Especiales",
    summary:
      "Solicitud electrónica que la Orden HAC/66/2024 identifica con la entrega de marcas fiscales para las labores del tabaco.",
    context:
      "La Orden HAC/66/2024 aprueba el formato electrónico del Modelo 515 con la denominación actual, y la AEAT lo integra en su página de petición de marcas fiscales.",
    documentNote:
      "La página temática de la AEAT enlaza un documento informativo PDF de cuatro páginas sobre las precintas fiscales de tabaco. Se ofrece como guía externa informativa; esta ficha no publica una miniatura del PDF.",
    searchTerms: [
      "marcas fiscales labores tabaco",
      "entrega marcas fiscales",
      "Impuesto sobre las Labores del Tabaco",
    ],
    homeSha256:
      "20045066a5e63ee6f7b1d994586c3c821b4d03681d4885e5cb0686e35029a4f5",
    recordSha256:
      "4c10650aad199c4a2de6b0a070123594261a7e076a455bcf06803213f6603fe7",
    legalSource: ORDER_HAC_66_2024_SOURCE,
    document: null,
    thumbnail: null,
  },
  {
    code: "517",
    procedureCode: "DE04",
    canonicalName:
      "Solicitud de marcas fiscales del Impuesto sobre el Alcohol y Bebidas Derivadas.",
    aeatGrouping:
      "Modelos 515 y 517. II. EE. Petición de marcas fiscales a la Oficina Gestora de Impuestos Especiales",
    summary:
      "Solicitud electrónica que la Orden HAC/1271/2019 identifica con las marcas fiscales del Impuesto sobre el Alcohol y Bebidas Derivadas.",
    context:
      "La Orden HAC/1271/2019 aprueba el formato electrónico y la denominación del Modelo 517; las órdenes HAC/626/2020 y HAC/66/2024 completan la cadena normativa que enlaza la AEAT, que agrupa el 517 con el 515 en su página de petición de marcas fiscales.",
    documentNote:
      "La página temática de la AEAT enlaza dos PDF informativos de dos páginas: información adicional de cajas de precintas suministrada por la FNMT y el documento informativo de precintas fiscales de bebidas derivadas. Se ofrecen como guías externas informativas; esta ficha no publica miniaturas.",
    searchTerms: [
      "marcas fiscales alcohol bebidas derivadas",
      "solicitud marcas fiscales",
      "Impuesto sobre el Alcohol y Bebidas Derivadas",
    ],
    homeSha256:
      "20045066a5e63ee6f7b1d994586c3c821b4d03681d4885e5cb0686e35029a4f5",
    recordSha256:
      "4c10650aad199c4a2de6b0a070123594261a7e076a455bcf06803213f6603fe7",
    legalSource: ORDER_HAC_1271_2019_SOURCE,
    document: null,
    thumbnail: null,
  },
  {
    code: "518",
    procedureCode: "DG01",
    canonicalName:
      "Impuesto sobre el Alcohol y Bebidas Derivadas. Declaración de Trabajo.",
    aeatGrouping: "Modelos 518/519/520. II. EE. Declaraciones de trabajo",
    summary:
      "Declaración de trabajo del Impuesto sobre el Alcohol y Bebidas Derivadas identificada por la AEAT y por la Resolución de 20 de enero de 1998.",
    context:
      "La AEAT agrupa los Modelos 518, 519 y 520 como declaraciones de trabajo. La Resolución de 20 de enero de 1998 identifica el 518 como Declaración de Trabajo.",
    documentNote:
      "La página oficial de descarga enlaza el impreso PDF de tres páginas y las instrucciones PDF de dos páginas del Modelo 518. Ambos se ofrecen como documentos externos informativos; la vista previa reproduce únicamente el encabezado del impreso.",
    searchTerms: [
      "declaración trabajo alcohol",
      "operaciones de trabajo",
      "Impuesto sobre el Alcohol y Bebidas Derivadas",
    ],
    homeSha256:
      "d1b07b4c800d98582704499807d215875eae5cf137369b5a7eec31a7d927fe03",
    recordSha256:
      "92a9686d93e44d4dcb0421f57ec7c55265e117fde205e7ada507c262b4aafa8d",
    legalSource: RESOLUTION_20_JANUARY_1998_SOURCE,
    document: MODEL_518_DOCUMENT,
    thumbnail: MODEL_518_THUMBNAIL,
  },
  {
    code: "519",
    procedureCode: "DG01",
    canonicalName:
      "Impuesto sobre el Alcohol y Bebidas Derivadas. Parte de incidencias en operaciones de trabajo.",
    aeatGrouping: "Modelos 518/519/520. II. EE. Declaraciones de trabajo",
    summary:
      "Parte de incidencias en operaciones de trabajo del Impuesto sobre el Alcohol y Bebidas Derivadas.",
    context:
      "La AEAT agrupa los Modelos 518, 519 y 520 como declaraciones de trabajo. La Resolución de 20 de enero de 1998 identifica el 519 como Parte de incidencias en operaciones de trabajo.",
    documentNote:
      "La página oficial revisada no aporta un impreso PDF estático específico que esta ficha pueda previsualizar para el Modelo 519.",
    searchTerms: [
      "incidencias operaciones trabajo",
      "parte de incidencias alcohol",
      "Impuesto sobre el Alcohol y Bebidas Derivadas",
    ],
    homeSha256:
      "d1b07b4c800d98582704499807d215875eae5cf137369b5a7eec31a7d927fe03",
    recordSha256:
      "92a9686d93e44d4dcb0421f57ec7c55265e117fde205e7ada507c262b4aafa8d",
    legalSource: RESOLUTION_20_JANUARY_1998_SOURCE,
    document: null,
    thumbnail: null,
  },
  {
    code: "520",
    procedureCode: "DG01",
    canonicalName:
      "Impuesto sobre el Alcohol y Bebidas Derivadas. Parte de resultado en operaciones de trabajo.",
    aeatGrouping: "Modelos 518/519/520. II. EE. Declaraciones de trabajo",
    summary:
      "Parte de resultado en operaciones de trabajo del Impuesto sobre el Alcohol y Bebidas Derivadas.",
    context:
      "La AEAT agrupa los Modelos 518, 519 y 520 como declaraciones de trabajo y usa «Parte de resultados» en plural en la página agrupada. La Resolución de 20 de enero de 1998 identifica el 520, en singular, como «Parte de resultado en operaciones de trabajo»; esta ficha conserva visibles ambas procedencias.",
    documentNote:
      "La página oficial revisada no aporta un impreso PDF estático específico que esta ficha pueda previsualizar para el Modelo 520.",
    searchTerms: [
      "resultado operaciones trabajo",
      "parte de resultado alcohol",
      "Impuesto sobre el Alcohol y Bebidas Derivadas",
    ],
    homeSha256:
      "d1b07b4c800d98582704499807d215875eae5cf137369b5a7eec31a7d927fe03",
    recordSha256:
      "92a9686d93e44d4dcb0421f57ec7c55265e117fde205e7ada507c262b4aafa8d",
    legalSource: RESOLUTION_20_JANUARY_1998_SOURCE,
    document: null,
    thumbnail: null,
  },
] as const satisfies readonly ModelSpec<PublicAeatBatch14ExciseMarksOperations515520CodeV1>[];

export const PUBLIC_AEAT_BATCH_14_EXCISE_MARKS_OPERATIONS_515_520_CONTENT_V1 =
  deepFreeze(SPECS.map((spec) => createModel(spec)));
