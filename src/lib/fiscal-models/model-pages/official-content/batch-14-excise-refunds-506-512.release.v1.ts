import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialAccessMethodV1,
  type PublicAeatOfficialContentDocumentV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialContentThumbnailV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_14_EXCISE_REFUNDS_506_512_RELEASE_ID_V1 =
  "public-aeat-official-batch-14-excise-refunds-506-512.2026-07-13.v1" as const;

export type PublicAeatBatch14ExciseRefunds506512CodeV1 =
  "506" | "507" | "508" | "510" | "512";

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

const ORDER_EHA_3482_2007_SOURCE = {
  id: "boe.excise-models.order-eha-3482-2007.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3482/2007, de 20 de noviembre",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2007-20637",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c0ab73c64dc4a71bd5fcbd87c7e98d608ebfab3321eee87d5596dbeabbbd453e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_626_2023_SOURCE = {
  id: "boe.guaranteed-movements.order-hfp-626-2023.original",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/626/2023, de 14 de junio",
  canonicalUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-14425",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "9cc076af014a7a5e0e45c785c7bcb1fce7ea7b93c0eb2eadd1c46480afdfbc5c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

type MaterialBundle = Readonly<{
  sources: readonly [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  documents: readonly PublicAeatOfficialContentDocumentV1[];
  thumbnail: PublicAeatOfficialContentThumbnailV1 | null;
}>;

type OfficialCaution = Readonly<{
  heading: string;
  text: string;
  sourceId: string;
}>;

type ModelSpec<Code extends PublicAeatBatch14ExciseRefunds506512CodeV1> =
  Readonly<{
    code: Code;
    procedureCode: "DJ01" | "DJ02" | "DJ03" | "DF01" | "DE03";
    canonicalName: string;
    summary: string;
    context: string;
    documentNote: string;
    channelNote: string;
    searchTerms: readonly [string, ...string[]];
    methods: readonly [
      PublicAeatOfficialAccessMethodV1,
      ...PublicAeatOfficialAccessMethodV1[],
    ];
    homeSha256: string;
    recordSha256: string;
    legalSource: PublicAeatOfficialContentSourceV1;
    materialBundle: MaterialBundle | null;
    officialCaution: OfficialCaution | null;
  }>;

function procedureSource<
  Code extends PublicAeatBatch14ExciseRefunds506512CodeV1,
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

function createModel<Code extends PublicAeatBatch14ExciseRefunds506512CodeV1>(
  spec: ModelSpec<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  const home = procedureSource(spec, "PROCEDURE_HOME");
  const record = procedureSource(spec, "PROCEDURE_RECORD");
  const materialSources = spec.materialBundle?.sources ?? [];
  const sources = [
    EXCISE_MODEL_INDEX_SOURCE,
    PRESENTATION_CHANNELS_SOURCE,
    home,
    record,
    spec.legalSource,
    ...materialSources,
  ] as [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  const materialSourceIds: [string, ...string[]] = spec.materialBundle
    ? [
        spec.materialBundle.sources[0].id,
        ...spec.materialBundle.sources.slice(1).map((source) => source.id),
        home.id,
      ]
    : [home.id];

  return deepFreeze({
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId: PUBLIC_AEAT_BATCH_14_EXCISE_REFUNDS_506_512_RELEASE_ID_V1,
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
            text: `La AEAT registra el Modelo ${spec.code} como «${spec.canonicalName}»`,
            sourceIds: [EXCISE_MODEL_INDEX_SOURCE.id, home.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${spec.code}-identity-context`,
            heading: "Contexto del procedimiento",
            text: spec.context,
            sourceIds: [home.id, record.id, spec.legalSource.id],
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
            id: `model-${spec.code}-materials-procedure`,
            heading: "Página y ficha administrativa",
            text: "La Sede de la AEAT publica una página de gestiones y una ficha administrativa separada para consultar la descripción general del procedimiento.",
            sourceIds: [home.id, record.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          {
            id: `model-${spec.code}-materials-document`,
            heading: "Material estático localizado",
            text: spec.documentNote,
            sourceIds: materialSourceIds,
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
          ...(spec.officialCaution
            ? [
                {
                  id: `model-${spec.code}-materials-official-caution`,
                  heading: spec.officialCaution.heading,
                  text: spec.officialCaution.text,
                  sourceIds: [spec.officialCaution.sourceId] as [string],
                  semantics: "OFFICIAL_INFORMATION_ONLY" as const,
                },
              ]
            : []),
        ],
      },
      {
        id: `model-${spec.code}-access`,
        title: "Canal descrito por la fuente oficial",
        kind: "ACCESS",
        items: [
          {
            id: `model-${spec.code}-access-channel`,
            heading: "Acceso electrónico",
            text: spec.channelNote,
            sourceIds: [home.id, PRESENTATION_CHANNELS_SOURCE.id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        ],
      },
    ],
    sources,
    documents: spec.materialBundle?.documents ?? [],
    thumbnail: spec.materialBundle?.thumbnail ?? null,
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
      ...materialSources.map((source, index) => ({
        id: `model-${spec.code}-link-material-${index + 1}`,
        label: source.title,
        sourceId: source.id,
        category: "INFORMATION" as const,
        policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY" as const,
      })),
    ],
    faq: [
      {
        id: `model-${spec.code}-faq-identity`,
        question: `¿Qué es el Modelo ${spec.code}?`,
        answer: `Es el modelo que la AEAT publica con la denominación «${spec.canonicalName}»`,
        sourceIds: [EXCISE_MODEL_INDEX_SOURCE.id, home.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-context`,
        question: `¿Qué información ofrece la ficha oficial del Modelo ${spec.code}?`,
        answer: spec.context,
        sourceIds: [home.id, record.id, spec.legalSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-pages`,
        question: "¿Por qué se enlazan dos páginas de la AEAT?",
        answer:
          "La página de gestiones reúne la información y accesos publicados; la ficha administrativa ofrece la descripción general del procedimiento.",
        sourceIds: [home.id, record.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-channel`,
        question: `¿Qué canal describe la AEAT para el Modelo ${spec.code}?`,
        answer: spec.channelNote,
        sourceIds: [home.id, PRESENTATION_CHANNELS_SOURCE.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-material`,
        question: "¿Hay un impreso o material estático oficial?",
        answer: spec.documentNote,
        sourceIds: materialSourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      ...(spec.officialCaution
        ? [
            {
              id: `model-${spec.code}-faq-official-caution`,
              question: `¿Qué aviso específico publica la AEAT sobre el Modelo ${spec.code}?`,
              answer: spec.officialCaution.text,
              sourceIds: [spec.officialCaution.sourceId] as [string],
              semantics: "OFFICIAL_INFORMATION_ONLY" as const,
            },
          ]
        : []),
      {
        id: `model-${spec.code}-faq-law`,
        question: `¿Qué referencia normativa se ha contrastado para el Modelo ${spec.code}?`,
        answer: `La trazabilidad de esta ficha incluye «${spec.legalSource.title}», junto con las páginas actuales de la AEAT.`,
        sourceIds: [spec.legalSource.id, home.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
      {
        id: `model-${spec.code}-faq-applicability`,
        question:
          "¿Esta información determina si el modelo corresponde a un caso concreto?",
        answer:
          "No. Las fuentes enlazadas describen el modelo y el procedimiento en términos generales; la ficha no evalúa circunstancias individuales.",
        sourceIds: [home.id, record.id, spec.legalSource.id],
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    ],
    accessMethods: {
      methods: spec.methods,
      status: "SOURCE_DESCRIBED",
      sourceIds: [home.id, PRESENTATION_CHANNELS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    externalNavigation: null,
    limitations: LIMITATIONS,
  });
}

type PdfMaterialInput = Readonly<{
  sourceId: string;
  documentId: string;
  kind: PublicAeatOfficialContentDocumentV1["kind"];
  title: string;
  documentTitle?: string;
  canonicalUrl: string;
  fileName: string;
  byteLength: number;
  pageCount: number;
  sha256: string;
  formStatus: PublicAeatOfficialContentDocumentV1["formStatus"];
  freshnessStatus: PublicAeatOfficialContentDocumentV1["freshnessStatus"];
  previewSuitability: PublicAeatOfficialContentDocumentV1["previewSuitability"];
  landingPageSourceId?: string;
}>;

function materialBundle(input: {
  code: PublicAeatBatch14ExciseRefunds506512CodeV1;
  landing: Readonly<{
    sourceId: string;
    title: string;
    canonicalUrl: string;
    officialUpdatedOn: string;
    sha256: string;
  }>;
  pdfs: readonly [PdfMaterialInput, ...PdfMaterialInput[]];
  thumbnail: Readonly<{
    sourceId: string;
    sha256: string;
    publicHref: `/fiscal-models/${string}.png`;
  }> | null;
}): MaterialBundle {
  const landingSource = {
    id: input.landing.sourceId,
    authority: "AEAT",
    kind: "DOWNLOAD_PAGE",
    title: input.landing.title,
    canonicalUrl: input.landing.canonicalUrl,
    officialUpdatedOn: input.landing.officialUpdatedOn,
    capturedOn: REVIEWED_ON,
    sourceSha256: input.landing.sha256,
    verificationStatus: "SOURCE_HASH_CAPTURED",
  } as const satisfies PublicAeatOfficialContentSourceV1;
  const documentSources = input.pdfs.map(
    (pdf) =>
      ({
        id: pdf.sourceId,
        authority: "AEAT",
        kind: "DOCUMENT_PDF",
        title: pdf.title,
        canonicalUrl: pdf.canonicalUrl,
        officialUpdatedOn: null,
        capturedOn: REVIEWED_ON,
        sourceSha256: pdf.sha256,
        verificationStatus: "SOURCE_HASH_CAPTURED",
      }) as const satisfies PublicAeatOfficialContentSourceV1,
  );
  const documents = input.pdfs.map(
    (pdf) =>
      ({
        id: pdf.documentId,
        kind: pdf.kind,
        title: pdf.documentTitle ?? pdf.title,
        sourceId: pdf.sourceId,
        landingPageSourceId: pdf.landingPageSourceId ?? landingSource.id,
        mediaType: "application/pdf",
        fileName: pdf.fileName,
        byteLength: pdf.byteLength,
        pageCount: pdf.pageCount,
        sha256: pdf.sha256,
        activeContentStatus: "NO_JAVASCRIPT_DETECTED",
        formStatus: pdf.formStatus,
        freshnessStatus: pdf.freshnessStatus,
        previewSuitability: pdf.previewSuitability,
        usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
      }) as const satisfies PublicAeatOfficialContentDocumentV1,
  );

  return {
    sources: [landingSource, ...documentSources],
    documents,
    thumbnail: input.thumbnail
      ? {
          id: `model-${input.code}-official-form-thumbnail`,
          sourceId: input.thumbnail.sourceId,
          publicHref: input.thumbnail.publicHref,
          mediaType: "image/png",
          width: 640,
          height: 640,
          pageNumber: 1,
          cropVariant: "HEADER_AND_DOCUMENT_START",
          sha256: input.thumbnail.sha256,
          alt: `Vista previa del encabezado del impreso oficial del Modelo ${input.code}`,
          provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
        }
      : null,
  };
}

const MODEL_506_MATERIALS = materialBundle({
  code: "506",
  landing: {
    sourceId: "aeat.model-506.download.2026-06-09",
    title: "Descarga del Modelo 506",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-devoluciones/modelo-506-iiee______de-devolucion-introduccion-fiscal_/descarga-modelo.html",
    officialUpdatedOn: "2026-06-09",
    sha256: "245d5769f9e072a29bdeaac2c9d962e3ecbf47b2ca18855b7ccf41a80c4a3e95",
  },
  pdfs: [
    {
      sourceId: "aeat.model-506.official-form.pdf",
      documentId: "model-506-official-form",
      kind: "FORM",
      title: "Impreso oficial del Modelo 506",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ01/506.pdf",
      fileName: "506.pdf",
      byteLength: 123892,
      pageCount: 1,
      sha256:
        "f6a8b04a2709944b543a901f6974137618934f5a25a4d6b65d33c494b4c98a00",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
    },
    {
      sourceId: "aeat.model-506.instructions.pdf",
      documentId: "model-506-instructions",
      kind: "INSTRUCTIONS",
      title:
        "Instrucciones para cumplimentar el Modelo 506. Solicitud de devolución por introducción en depósito fiscal",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ01/instr506.pdf",
      fileName: "instr506.pdf",
      byteLength: 84864,
      pageCount: 2,
      sha256:
        "4b27a28f8f512e17d2866ca76b08337a0eb829e5ef72f41050dc326215959536",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
    },
  ],
  thumbnail: {
    sourceId: "aeat.model-506.official-form.pdf",
    sha256: "ae3e24d7ed9e962b47b327f0418581eeff4b617d58d3280df6e7136859060208",
    publicHref: "/fiscal-models/modelo-506/formulario-modelo-506-preview.png",
  },
});

const MODEL_507_MATERIALS = materialBundle({
  code: "507",
  landing: {
    sourceId: "aeat.model-507.download.2026-06-09",
    title: "Descarga del Modelo 507",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-devoluciones/modelo-507-iiee______e-devolucion-sistema-garantizados_/descarga-modelo.html",
    officialUpdatedOn: "2026-06-09",
    sha256: "6079395f69fdc3d9dcea46ffd87014bad2e1a42a7ca2ea9d6ab539148b543f12",
  },
  pdfs: [
    {
      sourceId: "aeat.model-507.legacy-form.pdf",
      documentId: "model-507-legacy-form",
      kind: "FORM",
      title:
        "Modelo 507. Solicitud de devolución en el sistema de envíos garantizados",
      documentTitle:
        "Impreso histórico localizado del Modelo 507 · referencias heredadas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ02/507.pdf",
      fileName: "507.pdf",
      byteLength: 119411,
      pageCount: 1,
      sha256:
        "361c8fb5ebf58ded370cbe3ef102082a45011a5af1fb59b28243c069913638bb",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
    },
    {
      sourceId: "aeat.model-507.legacy-instructions.pdf",
      documentId: "model-507-legacy-instructions",
      kind: "INSTRUCTIONS",
      title:
        "Instrucciones para cumplimentar el Modelo 507. Solicitud de devolución en el sistema de envíos garantizados",
      documentTitle:
        "Instrucciones históricas localizadas del Modelo 507 · referencias heredadas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ02/instr507.pdf",
      fileName: "instr507.pdf",
      byteLength: 85059,
      pageCount: 2,
      sha256:
        "879c7e092aefd500219877624332847cf5c250fab40ff18abd4ba421f82e41ab",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
    },
  ],
  thumbnail: null,
});

const MODEL_508_MATERIALS = materialBundle({
  code: "508",
  landing: {
    sourceId: "aeat.model-508.download.2026-06-09",
    title: "Descarga del Modelo 508",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-devoluciones/modelo-508-iiee______e-devolucion-sistema-distancia_/descarga-modelo.html",
    officialUpdatedOn: "2026-06-09",
    sha256: "1638f5a3b2c2bcd1df44b8c8f0a3fb29cc74d7d89f1edbe564c5a8e0020d2f73",
  },
  pdfs: [
    {
      sourceId: "aeat.model-508.official-form.pdf",
      documentId: "model-508-official-form",
      kind: "FORM",
      title: "Impreso oficial del Modelo 508",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ03/508.pdf",
      fileName: "508.pdf",
      byteLength: 119364,
      pageCount: 1,
      sha256:
        "93bcfe005d12434cd924c8ee6c9be98f9ff857d1f34907fec7f6cfb9792954cc",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
    },
    {
      sourceId: "aeat.model-508.instructions.pdf",
      documentId: "model-508-instructions",
      kind: "INSTRUCTIONS",
      title:
        "Instrucciones para cumplimentar el Modelo 508. Solicitud de devolución en el sistema de ventas a distancia",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DJ03/instr508.pdf",
      fileName: "instr508.pdf",
      byteLength: 81910,
      pageCount: 1,
      sha256:
        "2664f60d26d167db118e76ec7eaef33adc046d246c2e3d3e2c67fe757fb229bb",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
    },
  ],
  thumbnail: {
    sourceId: "aeat.model-508.official-form.pdf",
    sha256: "54376bba0ed1a61162fd939f6c39a26b95be5eae19c1fb96f7b5994df2373578",
    publicHref: "/fiscal-models/modelo-508/formulario-modelo-508-preview.png",
  },
});

const MODEL_510_MATERIALS = materialBundle({
  code: "510",
  landing: {
    sourceId: "aeat.model-510.download.2026-03-10",
    title: "Descarga del Modelo 510",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/ii_ee-declaraciones-operaciones/modelo-510-iiee______on-operaciones-recepcion-ue_/descarga-modelo.html",
    officialUpdatedOn: "2026-03-10",
    sha256: "73ffca040cc7566b8d5ec2780a1bc766d520c098fe356b9038149729a5aa12a2",
  },
  pdfs: [
    {
      sourceId: "aeat.model-510.legacy-form.pdf",
      documentId: "model-510-legacy-form",
      kind: "FORM",
      title:
        "Modelo 510. Declaración de operaciones de recepción de productos del resto de la Unión Europea",
      documentTitle:
        "Impreso histórico localizado del Modelo 510 · referencias heredadas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DF01/510.pdf",
      fileName: "510.pdf",
      byteLength: 120433,
      pageCount: 1,
      sha256:
        "8adb0558d6278aa120eef70798f76cb2108bbdd7c9b83412298ef76bd44f61e0",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
    },
    {
      sourceId: "aeat.model-510.legacy-instructions.pdf",
      documentId: "model-510-legacy-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones para cumplimentar el Modelo 510",
      documentTitle:
        "Instrucciones históricas localizadas del Modelo 510 · referencias heredadas",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DF01/instr510.pdf",
      fileName: "instr510.pdf",
      byteLength: 700439,
      pageCount: 2,
      sha256:
        "6d96d7ec314c1ef25a910a3aba492ce0bc4b3a1c93d4fca7bf4c13c785dfeeff",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
    },
    {
      sourceId: "aeat.model-510.recipient-warning.pdf",
      documentId: "model-510-recipient-warning",
      kind: "GUIDE",
      title: "Aviso en relación con la presentación del Modelo 510",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DF01/NotaDestinatariosEnviosGarantiz.pdf",
      fileName: "NotaDestinatariosEnviosGarantiz.pdf",
      byteLength: 107614,
      pageCount: 1,
      sha256:
        "1bf5e24e3dcefa99fc0028c4e18a759e49393a5c2ddf40049d72d933de938b95",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      landingPageSourceId: "aeat.model-510.procedure-home.2026-06-09",
    },
  ],
  thumbnail: null,
});

const MODEL_512_MATERIALS = materialBundle({
  code: "512",
  landing: {
    sourceId: "aeat.model-512.download.2026-03-10",
    title: "Descarga del Modelo 512",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/ii_ee-documentos-circulacion/modelo-512-iiee-destinatarios-productos-segunda_/descarga-modelo.html",
    officialUpdatedOn: "2026-03-10",
    sha256: "44e26d4be0bedb369aef8f9d96bf62ccf0fca75b79c7a2403e71af10b79ffffd",
  },
  pdfs: [
    {
      sourceId: "aeat.model-512.official-form.pdf",
      documentId: "model-512-official-form",
      kind: "FORM",
      title: "Impreso oficial del Modelo 512",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DE03/512.pdf",
      fileName: "512.pdf",
      byteLength: 119263,
      pageCount: 1,
      sha256:
        "8a09163fcda1dcb632afce4a2a9b13ced9cff550c5cfdf4a8711c1cddaac1f41",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
    },
    {
      sourceId: "aeat.model-512.instructions.pdf",
      documentId: "model-512-instructions",
      kind: "INSTRUCTIONS",
      title:
        "Instrucciones para cumplimentar el Modelo 512. Destinatarios de productos de tarifa segunda",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/DE03/instr512.pdf",
      fileName: "instr512.pdf",
      byteLength: 75093,
      pageCount: 1,
      sha256:
        "347f5e8ba9482259c98f7bb6a3dacce053647cab920aba29625ce9ec9f9eef58",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
    },
  ],
  thumbnail: {
    sourceId: "aeat.model-512.official-form.pdf",
    sha256: "9772c9a868805b5e05ce0336c86ce0bd1d5f8f5640f297dab6f8144a58f42085",
    publicHref: "/fiscal-models/modelo-512/formulario-modelo-512-preview.png",
  },
});

const SPECS = [
  {
    code: "506",
    procedureCode: "DJ01",
    canonicalName:
      "II. EE. Solicitud de devolución por introducción en depósito fiscal.",
    summary:
      "Solicitud que la AEAT identifica con la introducción en depósito fiscal dentro de los Impuestos Especiales de Fabricación.",
    context:
      "La página y la ficha administrativa de la AEAT describen una solicitud de devolución de Impuestos Especiales vinculada a la introducción de productos en depósito fiscal.",
    documentNote:
      "La página de descarga oficial enlaza el impreso y sus instrucciones. Ambos se ofrecen como documentos externos informativos; la vista previa reproduce únicamente el encabezado del impreso.",
    channelNote:
      "La página oficial y la relación de formas de presentación de 2026 describen un formulario electrónico para el Modelo 506.",
    searchTerms: [
      "devolución introducción depósito fiscal",
      "impuestos especiales de fabricación",
      "depósito fiscal",
    ],
    methods: ["BROWSER_FORM"],
    homeSha256:
      "8db4352e652de5055f750aeb8d53aed76974c7d935ca79e6c72eb0e3eb03b7d1",
    recordSha256:
      "652f4858e4574207073b479cb7f88d1b3c43cc5f8604306e2626e7bd66b62616",
    legalSource: ORDER_EHA_3482_2007_SOURCE,
    materialBundle: MODEL_506_MATERIALS,
    officialCaution: null,
  },
  {
    code: "507",
    procedureCode: "DJ02",
    canonicalName:
      "II. EE. Solicitud de devolución en el sistema de envíos garantizados.",
    summary:
      "Solicitud que la AEAT identifica con el sistema de envíos garantizados y que se contrasta con la regulación actual de esos movimientos.",
    context:
      "La AEAT publica el Modelo 507 como solicitud de devolución dentro del sistema de envíos garantizados; los documentos descargables localizados conservan referencias heredadas y se registran como tales, no como descripción vigente.",
    documentNote:
      "La página oficial mantiene un impreso y unas instrucciones que contienen referencias heredadas. Se enlazan para trazabilidad con el estado «referencias históricas detectadas», sin miniatura ni reutilización como explicación vigente.",
    channelNote:
      "La página oficial y la relación de formas de presentación de 2026 describen un formulario electrónico para el Modelo 507.",
    searchTerms: [
      "devolución envíos garantizados",
      "impuestos especiales",
      "movimientos resto Unión Europea",
    ],
    methods: ["BROWSER_FORM"],
    homeSha256:
      "6c646d9c79e6bd5dc43106f1bb6d6254930bd5aa7d56b987adc786882d0de251",
    recordSha256:
      "1dd5ce5259dca14c689e84f75622d75a14fab52fdd4ef0cbc46539ac22ec6e43",
    legalSource: ORDER_HFP_626_2023_SOURCE,
    materialBundle: MODEL_507_MATERIALS,
    officialCaution: null,
  },
  {
    code: "508",
    procedureCode: "DJ03",
    canonicalName:
      "II. EE. Solicitud de devolución por el sistema de ventas a distancia.",
    summary:
      "Solicitud que la AEAT identifica con el sistema de ventas a distancia en el ámbito de los Impuestos Especiales de Fabricación.",
    context:
      "La página y la ficha administrativa de la AEAT describen una solicitud de devolución asociada al sistema de ventas a distancia.",
    documentNote:
      "La página de descarga oficial enlaza el impreso y sus instrucciones. Ambos se ofrecen como documentos externos informativos; la vista previa reproduce únicamente el encabezado del impreso.",
    channelNote:
      "La página oficial y la relación de formas de presentación de 2026 describen un formulario electrónico para el Modelo 508.",
    searchTerms: [
      "devolución ventas distancia",
      "impuestos especiales de fabricación",
      "ventas a distancia",
    ],
    methods: ["BROWSER_FORM"],
    homeSha256:
      "fdf658cd92d759854547bd8ca5c9183ded07917f0e9d2fa6fb3d5276a95402cc",
    recordSha256:
      "5aa5804ecdf33303d30e54ebb7aafb7da534e614d42e4a7681c832acafea1666",
    legalSource: ORDER_EHA_3482_2007_SOURCE,
    materialBundle: MODEL_508_MATERIALS,
    officialCaution: null,
  },
  {
    code: "510",
    procedureCode: "DF01",
    canonicalName:
      "II. EE. Declaración de operaciones de recepción del resto de la UE.",
    summary:
      "Declaración que la AEAT identifica con operaciones de recepción de productos procedentes del resto de la Unión Europea.",
    context:
      "La denominación y la descripción se toman de las páginas actuales de la AEAT. El impreso y las instrucciones localizados contienen referencias heredadas y se registran sin tratarlos como explicación vigente.",
    documentNote:
      "La página de descarga conserva un impreso y unas instrucciones con referencias heredadas, además de un aviso específico de la AEAT. Se enlazan para trazabilidad, sin miniatura y sin convertir las categorías antiguas en información actual.",
    channelNote:
      "Las fuentes oficiales describen para el Modelo 510 un formulario electrónico y un recorrido de aportación mediante fichero.",
    searchTerms: [
      "operaciones recepción resto UE",
      "productos Unión Europea",
      "impuestos especiales de fabricación",
    ],
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    homeSha256:
      "8b3b3490ba97920305bf010bd918b52fc69f3a5dd02e7a35f1cf98b31e8cce04",
    recordSha256:
      "0ceaac6ea908c665e381568653943e7b7c75db32337f8c38806d72dddb7c1cd0",
    legalSource: ORDER_EHA_3482_2007_SOURCE,
    materialBundle: MODEL_510_MATERIALS,
    officialCaution: {
      heading: "Aviso específico publicado por la AEAT",
      text: "La AEAT indica que, desde febrero de 2023, los destinatarios certificados ya no deben presentar el Modelo 510; el aviso añade que el modelo se mantiene para destinatarios registrados y representantes fiscales.",
      sourceId: "aeat.model-510.recipient-warning.pdf",
    },
  },
  {
    code: "512",
    procedureCode: "DE03",
    canonicalName: "II. EE. Destinatarios de productos de tarifa segunda.",
    summary:
      "Relación que la AEAT identifica con destinatarios de productos de la tarifa segunda del Impuesto sobre Hidrocarburos.",
    context:
      "La página y la ficha administrativa sitúan el Modelo 512 en el Impuesto sobre Hidrocarburos y lo identifican con una relación de destinatarios de productos de tarifa segunda.",
    documentNote:
      "La página de descarga oficial enlaza el impreso y sus instrucciones. Ambos se ofrecen como documentos externos informativos; la vista previa reproduce únicamente el encabezado del impreso.",
    channelNote:
      "Las fuentes oficiales describen para el Modelo 512 un formulario electrónico y un recorrido de aportación mediante fichero.",
    searchTerms: [
      "destinatarios productos tarifa segunda",
      "Impuesto sobre Hidrocarburos",
      "relación destinatarios",
    ],
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    homeSha256:
      "4eddd7e79ceba843ba01d2aeff3f1b82b4c6045084ac69d960f50278e0c181e2",
    recordSha256:
      "881da6d22f98cd57741a08375eefdc20f421bbc703ab881d3133a210991f6575",
    legalSource: ORDER_EHA_3482_2007_SOURCE,
    materialBundle: MODEL_512_MATERIALS,
    officialCaution: null,
  },
] as const satisfies readonly ModelSpec<PublicAeatBatch14ExciseRefunds506512CodeV1>[];

export const PUBLIC_AEAT_BATCH_14_EXCISE_REFUNDS_506_512_CONTENT_V1 =
  deepFreeze(SPECS.map((spec) => createModel(spec)));
