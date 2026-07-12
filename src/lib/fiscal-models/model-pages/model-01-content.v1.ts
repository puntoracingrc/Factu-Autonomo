export const PUBLIC_AEAT_MODEL_CONTENT_SCHEMA_VERSION_V1 =
  "public-aeat-model-content.v1" as const;

const MODEL_01_CONTENT_RELEASE_ID =
  "public-aeat-model-01-content.2026-07-13.v1" as const;
const VERIFIED_ON = "2026-07-13" as const;
const SHA256 = /^[a-f0-9]{64}$/;
const ALLOWED_HOSTS = new Set([
  "sede.agenciatributaria.gob.es",
  "www.boe.es",
]);

type Model01SourceId =
  | "aeat.models.index.2026-07-08"
  | "aeat.model-01.procedure-home.2025-11-21"
  | "aeat.model-01.what-certifies.2025-11-21"
  | "aeat.model-01.where-obtained.2025-11-21"
  | "aeat.model-01.downloads.2026-06-04"
  | "aeat.model-01.faq.2025-03-03"
  | "aeat.model-01.procedure-record.2025-11-21"
  | "aeat.model-01.form-pdf.2022-07-26"
  | "aeat.model-01.instructions-pdf.2022-07-26"
  | "aeat.personal-area.2026-07-10"
  | "boe.rd-1065-2007.consolidated.2025-04-02";

export interface PublicAeatModelContentSourceV1 {
  readonly id: Model01SourceId;
  readonly authority: "AEAT" | "BOE";
  readonly kind:
    | "OFFICIAL_MODEL_INDEX"
    | "PROCEDURE_HOME"
    | "INFORMATION_PAGE"
    | "DOWNLOAD_PAGE"
    | "FAQ_PAGE"
    | "PROCEDURE_RECORD"
    | "DOCUMENT_PDF"
    | "PERSONAL_AREA"
    | "LEGAL_TEXT";
  readonly title: string;
  readonly canonicalUrl: string;
  readonly officialUpdatedOn: string | null;
  readonly verifiedOn: typeof VERIFIED_ON;
  readonly verificationStatus: "ACCESS_VERIFIED" | "FILE_HASH_CAPTURED";
  readonly sourceSha256: string | null;
  readonly reviewStatus: "PENDING_REVIEW";
}

export interface PublicAeatModelContentFactV1 {
  readonly id: string;
  readonly heading: string;
  readonly text: string;
  readonly category:
    | "PURPOSE"
    | "CERTIFICATE_SCOPE"
    | "POSSIBLE_OUTCOMES"
    | "ACCESS_CHANNELS";
  readonly sourceIds: readonly [Model01SourceId, ...Model01SourceId[]];
  readonly semantics: "INFORMATIONAL_ONLY";
  readonly reviewStatus: "PENDING_REVIEW";
}

export interface PublicAeatModelPdfResourceV1 {
  readonly id: "model-01-form" | "model-01-instructions";
  readonly kind: "FORM" | "INSTRUCTIONS";
  readonly title: string;
  readonly officialUrl: string;
  readonly landingPageUrl: string;
  readonly sourceId:
    | "aeat.model-01.form-pdf.2022-07-26"
    | "aeat.model-01.instructions-pdf.2022-07-26";
  readonly mediaType: "application/pdf";
  readonly fileName: "mod01_es_ES.pdf" | "instr_mod01.pdf";
  readonly byteLength: number;
  readonly pageCount: number;
  readonly sha256: string;
  readonly activeContentStatus:
    | "JAVASCRIPT_PRESENT"
    | "NO_JAVASCRIPT_DETECTED";
  readonly freshnessStatus:
    | "CURRENTNESS_UNDETERMINED"
    | "LEGACY_REFERENCES_DETECTED";
  readonly usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY";
}

export interface PublicAeatModel01ContentV1 {
  readonly schemaVersion: typeof PUBLIC_AEAT_MODEL_CONTENT_SCHEMA_VERSION_V1;
  readonly releaseId: typeof MODEL_01_CONTENT_RELEASE_ID;
  readonly code: "01";
  readonly contentStatus: "REVIEW_ONLY";
  readonly fiscalReviewStatus: "PENDING_REVIEW";
  readonly lifecycleStatus: "UNDETERMINED";
  readonly verifiedOn: typeof VERIFIED_ON;
  readonly canonicalName: string;
  readonly purpose: string;
  readonly searchTerms: readonly string[];
  readonly facts: readonly PublicAeatModelContentFactV1[];
  readonly sources: readonly PublicAeatModelContentSourceV1[];
  readonly documents: readonly PublicAeatModelPdfResourceV1[];
  readonly thumbnail: Readonly<{
    id: "model-01-form-preview";
    sourcePdfId: "model-01-form";
    publicHref: "/fiscal-models/modelo-01/formulario-modelo-01-preview.png";
    mediaType: "image/png";
    width: 640;
    height: 640;
    pageNumber: 1;
    cropVariant: "HEADER_AND_FORM_START";
    sha256: string;
    alt: string;
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF";
  }>;
  readonly legalReferences: ReadonlyArray<Readonly<{
    id: "boe-rd-1065-2007-articles-70-76";
    authority: "BOE";
    title: string;
    canonicalUrl: string;
    boeId: "BOE-A-2007-15984";
    aeatScopeLabels: readonly ["Artículos 70 a 76", "Artículos 70 a 75"];
    coherenceStatus: "SOURCE_SCOPE_DIFFERS_PENDING_REVIEW";
    consolidatedTextStatus: "INFORMATIVE_CONSOLIDATION";
    reviewStatus: "PENDING_REVIEW";
  }>>;
  readonly externalNavigation: Readonly<{
    kind: "AEAT_PERSONAL_AREA";
    title: "Mi área personal de la AEAT";
    href: "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html";
    policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY";
  }>;
}

export type PublicAeatModelContentResolveResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: PublicAeatModel01ContentV1;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason:
        | "INVALID_INPUT"
        | "MODEL_CONTENT_NOT_FOUND"
        | "INCONSISTENT_CONTENT";
    }>;

type ParsedObject = Record<string, unknown>;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function parseExactCode(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const parsed: ParsedObject = Object.create(null) as ParsedObject;
    for (const key of Reflect.ownKeys(input)) {
      if (key !== "code") return null;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      parsed.code = descriptor.value;
    }
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

function officialUrlIsAllowed(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      ALLOWED_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

const DOWNLOAD_PAGE =
  "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/descarga-modelo.html";

const MODEL_01_SOURCES: readonly PublicAeatModelContentSourceV1[] = [
  {
    id: "aeat.models.index.2026-07-08",
    authority: "AEAT",
    kind: "OFFICIAL_MODEL_INDEX",
    title: "Presentar y consultar declaraciones por modelo",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
    officialUpdatedOn: "2026-07-08",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.procedure-home.2025-11-21",
    authority: "AEAT",
    kind: "PROCEDURE_HOME",
    title:
      "Certificados tributarios. Estar al corriente de obligaciones tributarias",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G304.shtml",
    officialUpdatedOn: "2025-11-21",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.what-certifies.2025-11-21",
    authority: "AEAT",
    kind: "INFORMATION_PAGE",
    title: "Qué certifica",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/que-certifica.html",
    officialUpdatedOn: "2025-11-21",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.where-obtained.2025-11-21",
    authority: "AEAT",
    kind: "INFORMATION_PAGE",
    title: "Dónde se obtiene",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/se-obtiene.html",
    officialUpdatedOn: "2025-11-21",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.downloads.2026-06-04",
    authority: "AEAT",
    kind: "DOWNLOAD_PAGE",
    title: "Descarga del modelo",
    canonicalUrl: DOWNLOAD_PAGE,
    officialUpdatedOn: "2026-06-04",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.faq.2025-03-03",
    authority: "AEAT",
    kind: "FAQ_PAGE",
    title: "Preguntas frecuentes",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/certificaciones/situacion-tributaria/certificados-trib_____os-estar-corriente-obligaciones-tributarias/preguntas-frecuentes.html",
    officialUpdatedOn: "2025-03-03",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.procedure-record.2025-11-21",
    authority: "AEAT",
    kind: "PROCEDURE_RECORD",
    title: "Ficha del procedimiento G304",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml",
    officialUpdatedOn: null,
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.form-pdf.2022-07-26",
    authority: "AEAT",
    kind: "DOCUMENT_PDF",
    title: "Formulario oficial Modelo 01",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/mod01_es_ES.pdf",
    officialUpdatedOn: "2022-07-26",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "FILE_HASH_CAPTURED",
    sourceSha256:
      "d3cf04259bca029b43bc7f92df9ff3ad07f112cd05fe612659c4fbdf44ee32c2",
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.model-01.instructions-pdf.2022-07-26",
    authority: "AEAT",
    kind: "DOCUMENT_PDF",
    title: "Instrucciones oficiales del Modelo 01",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/instr_mod01.pdf",
    officialUpdatedOn: "2022-07-26",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "FILE_HASH_CAPTURED",
    sourceSha256:
      "b06ee06058f3804d9b10c70fe24fcc57cb777ebc2aa226ac949544ad608cb6d2",
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "aeat.personal-area.2026-07-10",
    authority: "AEAT",
    kind: "PERSONAL_AREA",
    title: "Mi área personal",
    canonicalUrl:
      "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html",
    officialUpdatedOn: "2026-07-10",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
  {
    id: "boe.rd-1065-2007.consolidated.2025-04-02",
    authority: "BOE",
    kind: "LEGAL_TEXT",
    title:
      "Real Decreto 1065/2007, de 27 de julio · artículos 70 a 76",
    canonicalUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&tn=1#a70",
    officialUpdatedOn: "2025-04-02",
    verifiedOn: VERIFIED_ON,
    verificationStatus: "ACCESS_VERIFIED",
    sourceSha256: null,
    reviewStatus: "PENDING_REVIEW",
  },
];

const MODEL_01_CONTENT: PublicAeatModel01ContentV1 = {
  schemaVersion: PUBLIC_AEAT_MODEL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: MODEL_01_CONTENT_RELEASE_ID,
  code: "01",
  contentStatus: "REVIEW_ONLY",
  fiscalReviewStatus: "PENDING_REVIEW",
  lifecycleStatus: "UNDETERMINED",
  verifiedOn: VERIFIED_ON,
  canonicalName:
    "Certificados tributarios. Expedición de certificados tributarios. Estar al corriente de obligaciones tributarias.",
  purpose:
    "Permite solicitar a la Agencia Tributaria un certificado que acredita la situación de estar al corriente de las obligaciones tributarias.",
  searchTerms: [
    "certificado tributario",
    "situación tributaria",
    "estar al corriente",
    "certificado positivo",
    "certificado negativo",
    "deudas tributarias",
    "declaraciones no presentadas",
    "certificado electrónico",
    "DNI electrónico",
    "Cl@ve",
    "clave",
    "oficinas AEAT",
  ],
  facts: [
    {
      id: "model-01-purpose",
      heading: "Para qué sirve",
      text: "El procedimiento permite obtener un certificado tributario sobre la situación de estar al corriente de las obligaciones tributarias.",
      category: "PURPOSE",
      sourceIds: ["aeat.model-01.procedure-home.2025-11-21"],
      semantics: "INFORMATIONAL_ONLY",
      reviewStatus: "PENDING_REVIEW",
    },
    {
      id: "model-01-certificate-scope",
      heading: "Qué certifica",
      text: "La AEAT indica que el certificado acredita si una persona o entidad se encuentra al corriente de sus obligaciones tributarias en los términos descritos por la normativa aplicable.",
      category: "CERTIFICATE_SCOPE",
      sourceIds: ["aeat.model-01.what-certifies.2025-11-21"],
      semantics: "INFORMATIONAL_ONLY",
      reviewStatus: "PENDING_REVIEW",
    },
    {
      id: "model-01-possible-outcomes",
      heading: "Resultados posibles",
      text: "La información oficial describe certificados de carácter positivo y certificados de carácter negativo por deudas, por falta de presentación de declaraciones o por ambas circunstancias.",
      category: "POSSIBLE_OUTCOMES",
      sourceIds: ["aeat.model-01.what-certifies.2025-11-21"],
      semantics: "INFORMATIONAL_ONLY",
      reviewStatus: "PENDING_REVIEW",
    },
    {
      id: "model-01-online-channel",
      heading: "Por internet",
      text: "La AEAT ofrece obtención por internet mediante certificado electrónico, DNI electrónico o Cl@ve.",
      category: "ACCESS_CHANNELS",
      sourceIds: ["aeat.model-01.where-obtained.2025-11-21"],
      semantics: "INFORMATIONAL_ONLY",
      reviewStatus: "PENDING_REVIEW",
    },
    {
      id: "model-01-office-channel",
      heading: "En oficinas",
      text: "La información oficial también contempla la solicitud en oficinas de la AEAT para las personas que no estén obligadas a relacionarse electrónicamente.",
      category: "ACCESS_CHANNELS",
      sourceIds: ["aeat.model-01.where-obtained.2025-11-21"],
      semantics: "INFORMATIONAL_ONLY",
      reviewStatus: "PENDING_REVIEW",
    },
  ],
  sources: MODEL_01_SOURCES,
  documents: [
    {
      id: "model-01-form",
      kind: "FORM",
      title: "Formulario oficial del Modelo 01",
      officialUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/mod01_es_ES.pdf",
      landingPageUrl: DOWNLOAD_PAGE,
      sourceId: "aeat.model-01.form-pdf.2022-07-26",
      mediaType: "application/pdf",
      fileName: "mod01_es_ES.pdf",
      byteLength: 322139,
      pageCount: 2,
      sha256:
        "d3cf04259bca029b43bc7f92df9ff3ad07f112cd05fe612659c4fbdf44ee32c2",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-01-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones oficiales del Modelo 01",
      officialUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/Certificados/instr_mod01.pdf",
      landingPageUrl: DOWNLOAD_PAGE,
      sourceId: "aeat.model-01.instructions-pdf.2022-07-26",
      mediaType: "application/pdf",
      fileName: "instr_mod01.pdf",
      byteLength: 56614,
      pageCount: 1,
      sha256:
        "b06ee06058f3804d9b10c70fe24fcc57cb777ebc2aa226ac949544ad608cb6d2",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-01-form-preview",
    sourcePdfId: "model-01-form",
    publicHref: "/fiscal-models/modelo-01/formulario-modelo-01-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_FORM_START",
    sha256:
      "205665d686f3fd00bbfc9ae7c80935f9d3da4696e44c703d74dea79e02fac873",
    alt: "Vista previa de la primera página del formulario oficial del Modelo 01 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  legalReferences: [
    {
      id: "boe-rd-1065-2007-articles-70-76",
      authority: "BOE",
      title: "Artículos 70 a 76 del Real Decreto 1065/2007, de 27 de julio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&tn=1#a70",
      boeId: "BOE-A-2007-15984",
      aeatScopeLabels: ["Artículos 70 a 76", "Artículos 70 a 75"],
      coherenceStatus: "SOURCE_SCOPE_DIFFERS_PENDING_REVIEW",
      consolidatedTextStatus: "INFORMATIVE_CONSOLIDATION",
      reviewStatus: "PENDING_REVIEW",
    },
  ],
  externalNavigation: {
    kind: "AEAT_PERSONAL_AREA",
    title: "Mi área personal de la AEAT",
    href: "https://sede.agenciatributaria.gob.es/Sede/mi-area-personal.html",
    policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY",
  },
};

deepFreeze(MODEL_01_CONTENT);

function contentIsCoherent(content: PublicAeatModel01ContentV1): boolean {
  const sourceIds = new Set(content.sources.map((source) => source.id));
  return (
    content.code === "01" &&
    content.contentStatus === "REVIEW_ONLY" &&
    content.fiscalReviewStatus === "PENDING_REVIEW" &&
    content.sources.length === sourceIds.size &&
    content.searchTerms.length > 0 &&
    content.searchTerms.every((term) => term.length > 0 && term === term.trim()) &&
    content.sources.every(
      (source) =>
        officialUrlIsAllowed(source.canonicalUrl) &&
        source.reviewStatus === "PENDING_REVIEW" &&
        (source.verificationStatus === "FILE_HASH_CAPTURED"
          ? source.sourceSha256 !== null && SHA256.test(source.sourceSha256)
          : source.sourceSha256 === null),
    ) &&
    content.facts.every(
      (fact) =>
        fact.semantics === "INFORMATIONAL_ONLY" &&
        fact.reviewStatus === "PENDING_REVIEW" &&
        fact.sourceIds.length > 0 &&
        fact.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
    ) &&
    content.documents.every(
      (document) =>
        officialUrlIsAllowed(document.officialUrl) &&
        officialUrlIsAllowed(document.landingPageUrl) &&
        sourceIds.has(document.sourceId) &&
        SHA256.test(document.sha256) &&
        document.usePolicy === "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    ) &&
    SHA256.test(content.thumbnail.sha256) &&
    content.legalReferences.every(
      (reference) =>
        officialUrlIsAllowed(reference.canonicalUrl) &&
        reference.reviewStatus === "PENDING_REVIEW",
    ) &&
    officialUrlIsAllowed(content.externalNavigation.href) &&
    content.externalNavigation.policy ===
      "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY"
  );
}

export function resolvePublicAeatModelContentV1(
  input: unknown,
): PublicAeatModelContentResolveResultV1 {
  const code = parseExactCode(input);
  if (code === null || !/^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/.test(code)) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  if (code !== "01") {
    return Object.freeze({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
  }
  if (!contentIsCoherent(MODEL_01_CONTENT)) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CONTENT",
    });
  }
  return Object.freeze({ status: "REVIEW_ONLY", data: MODEL_01_CONTENT });
}
