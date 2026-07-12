import { FISCAL_MODEL_SOURCES_V1 } from "../catalog/sources.v1";
import type {
  FiscalModelAvailability,
  FiscalModelCode,
  FiscalModelLifecycleStatus,
  FiscalModelSourceAuthority,
  FiscalModelSourceType,
} from "../contracts";
import type {
  FiscalModelPageBlockReasonV1,
  FiscalModelPageCanonicalPathV1,
  FiscalModelPageContentLevelV1,
  FiscalModelPageFieldProvenanceV1,
  FiscalModelPageManualReviewReasonV1,
  FiscalModelPageUnavailableDescriptorV1,
} from "./contracts.v1";
import { createFiscalModelPageDescriptorResolverV1 } from "./resolver.v1";

const REVIEW_BADGE = "Información en revisión" as const;
const REVIEW_TITLE = "Contenido pendiente de revisión fiscal" as const;
const REVIEW_MESSAGE =
  "Esta ficha se muestra únicamente como referencia informativa. Las fuentes oficiales están registradas, pero la verificación de contenido y la revisión fiscal continúan pendientes." as const;
const LIMITATIONS =
  "No calcula casillas ni importes y no permite presentar, firmar, pagar ni enviar declaraciones." as const;
const LINK_NOTICE =
  "El enlace para integraciones permanece bloqueado hasta completar la verificación de fuentes y la revisión fiscal." as const;
const HISTORICAL_NOTICE =
  "Modelo histórico · no vigente. Esta ficha no permite tramitar el modelo 037 ni lo ofrece como opción actual." as const;

const REVIEW_PAGE_PATH_BY_CODE = Object.freeze({
  "036": "/consultor-fiscal/modelos/036",
  "037": "/consultor-fiscal/modelos/037",
  "303": "/consultor-fiscal/modelos/303",
} as const);

const REQUIRED_REVIEW_REASONS = Object.freeze([
  "DRAFT_RELEASE",
  "PAGE_UNPUBLISHED",
  "PAGE_REVIEW_REQUIRED",
  "MODEL_REVIEW_REQUIRED",
  "SOURCE_HASH_PENDING",
  "SOURCE_REVIEW_REQUIRED",
] as const satisfies readonly FiscalModelPageManualReviewReasonV1[]);

type ParsedObject = Record<string, unknown>;

export type FiscalModelReviewPageBlockReasonV1 =
  | FiscalModelPageBlockReasonV1
  | "UNEXPECTED_AVAILABLE_DESCRIPTOR"
  | "INCOMPLETE_REVIEW_STATE"
  | "INCONSISTENT_SOURCE_VIEW";

export interface FiscalModelReviewPageSourceV1 {
  readonly sourceId: string;
  readonly authority: FiscalModelSourceAuthority;
  readonly sourceType: FiscalModelSourceType;
  readonly title: string;
  readonly officialUpdatedAt: string;
  readonly verificationStatus: "HASH_PENDING";
  readonly reviewStatus: "PENDING_REVIEW";
  readonly verificationLabel: "Verificación de contenido pendiente";
  readonly reviewLabel: "Revisión fiscal pendiente";
  readonly externalHref: string;
}

export interface FiscalModelReviewPageViewV1 {
  readonly code: FiscalModelCode;
  readonly reviewPagePath: FiscalModelPageCanonicalPathV1;
  readonly descriptorHref: null;
  readonly canonicalName: string;
  readonly summary: string;
  readonly contentLevel: FiscalModelPageContentLevelV1;
  readonly lifecycleStatus: FiscalModelLifecycleStatus;
  readonly modelAvailability: FiscalModelAvailability;
  readonly effectiveTo: string | null;
  readonly publicationStatus: "UNPUBLISHED";
  readonly contentReviewStatus: "PENDING_REVIEW";
  readonly descriptorContentVersion: string;
  readonly modelReleaseId: string;
  readonly modelContentVersion: string;
  readonly sourceRegistryVersion: string;
  readonly reviewBadge: typeof REVIEW_BADGE;
  readonly reviewTitle: typeof REVIEW_TITLE;
  readonly reviewMessage: typeof REVIEW_MESSAGE;
  readonly limitations: typeof LIMITATIONS;
  readonly linkNotice: typeof LINK_NOTICE;
  readonly historicalNotice: typeof HISTORICAL_NOTICE | null;
  readonly reasons: readonly FiscalModelPageManualReviewReasonV1[];
  readonly sources: readonly FiscalModelReviewPageSourceV1[];
  readonly provenance: readonly FiscalModelPageFieldProvenanceV1[];
}

export type FiscalModelReviewPageResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: FiscalModelReviewPageViewV1;
      descriptorHref: null;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: FiscalModelReviewPageBlockReasonV1;
      descriptorHref: null;
    }>;

export type FiscalModelReviewPageListResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly FiscalModelReviewPageViewV1[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: FiscalModelReviewPageBlockReasonV1;
    }>;

export type FiscalModelReviewPageSearchResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly FiscalModelReviewPageViewV1[];
      query: string | null;
      match: "ALL" | "EXACT" | "NO_MATCH";
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: FiscalModelReviewPageBlockReasonV1;
    }>;

function parseExactObject(
  value: unknown,
  allowedKeys: readonly string[],
): ParsedObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const allowed = new Set(allowedKeys);
    const parsed: ParsedObject = Object.create(null) as ParsedObject;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      parsed[key] = descriptor.value;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hasOwn(value: ParsedObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function blocked(
  reason: FiscalModelReviewPageBlockReasonV1,
): Extract<FiscalModelReviewPageResultV1, { status: "BLOCKED" }> {
  return Object.freeze({ status: "BLOCKED", reason, descriptorHref: null });
}

function blockedList(
  reason: FiscalModelReviewPageBlockReasonV1,
): Extract<FiscalModelReviewPageListResultV1, { status: "BLOCKED" }> {
  return Object.freeze({ status: "BLOCKED", reason });
}

function reviewReasonsAreExact(
  reasons: readonly FiscalModelPageManualReviewReasonV1[],
): boolean {
  const actual = new Set<unknown>(reasons);
  return (
    reasons.length === REQUIRED_REVIEW_REASONS.length &&
    actual.size === reasons.length &&
    REQUIRED_REVIEW_REASONS.every((reason) => actual.has(reason))
  );
}

function isAllowlistedOfficialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      (url.hostname === "sede.agenciatributaria.gob.es" ||
        url.hostname === "www.boe.es")
    );
  } catch {
    return false;
  }
}

function copyProvenance(
  provenance: readonly FiscalModelPageFieldProvenanceV1[],
): readonly FiscalModelPageFieldProvenanceV1[] | null {
  const copied: FiscalModelPageFieldProvenanceV1[] = [];
  for (const entry of provenance) {
    if (entry.reviewStatus !== "PENDING_REVIEW") return null;
    if (entry.origin === "OFFICIAL_SOURCE") {
      copied.push(
        Object.freeze({
          ...entry,
          sourceIds: Object.freeze([...entry.sourceIds]) as readonly [
            string,
            ...string[],
          ],
        }),
      );
    } else if (entry.origin === "FOUNDATION_CATALOG") {
      copied.push(Object.freeze({ ...entry }));
    } else {
      return null;
    }
  }
  return Object.freeze(copied);
}

function buildSources(
  descriptor: FiscalModelPageUnavailableDescriptorV1,
): readonly FiscalModelReviewPageSourceV1[] | null {
  if (
    descriptor.sourceIds.length === 0 ||
    new Set(descriptor.sourceIds).size !== descriptor.sourceIds.length
  ) {
    return null;
  }

  const sources: FiscalModelReviewPageSourceV1[] = [];
  for (const sourceId of descriptor.sourceIds) {
    const source = FISCAL_MODEL_SOURCES_V1.find(
      (candidate) => candidate.id === sourceId,
    );
    if (
      !source ||
      source.verificationStatus !== "HASH_PENDING" ||
      source.reviewStatus !== "PENDING_REVIEW" ||
      source.contentHash !== null ||
      !isAllowlistedOfficialUrl(source.canonicalUrl)
    ) {
      return null;
    }

    sources.push(
      Object.freeze({
        sourceId: source.id,
        authority: source.authority,
        sourceType: source.sourceType,
        title: source.title,
        officialUpdatedAt: source.officialUpdatedAt,
        verificationStatus: source.verificationStatus,
        reviewStatus: source.reviewStatus,
        verificationLabel: "Verificación de contenido pendiente",
        reviewLabel: "Revisión fiscal pendiente",
        externalHref: source.canonicalUrl,
      }),
    );
  }
  return Object.freeze(sources);
}

function historicalStateIsExact(
  descriptor: FiscalModelPageUnavailableDescriptorV1,
): boolean {
  if (descriptor.code === "037") {
    return (
      descriptor.lifecycleStatus === "HISTORICAL" &&
      descriptor.modelAvailability === "HISTORICAL_ONLY" &&
      descriptor.contentLevel === "HISTORICAL_INFO_ONLY" &&
      descriptor.effectiveTo === "2025-02-02"
    );
  }
  return (
    descriptor.lifecycleStatus === "ACTIVE" &&
    descriptor.modelAvailability === "METADATA_ONLY" &&
    descriptor.contentLevel === "METADATA_ONLY" &&
    descriptor.effectiveTo === null
  );
}

function projectReviewPage(
  descriptor: FiscalModelPageUnavailableDescriptorV1,
  reasons: readonly FiscalModelPageManualReviewReasonV1[],
): FiscalModelReviewPageResultV1 {
  if (
    descriptor.publicationStatus !== "UNPUBLISHED" ||
    descriptor.contentReviewStatus !== "PENDING_REVIEW" ||
    descriptor.href !== null ||
    descriptor.canonicalPath !== REVIEW_PAGE_PATH_BY_CODE[descriptor.code] ||
    !reviewReasonsAreExact(reasons) ||
    !historicalStateIsExact(descriptor)
  ) {
    return blocked("INCOMPLETE_REVIEW_STATE");
  }

  const sources = buildSources(descriptor);
  const provenance = copyProvenance(descriptor.provenance);
  if (!sources || !provenance) return blocked("INCONSISTENT_SOURCE_VIEW");

  const data: FiscalModelReviewPageViewV1 = Object.freeze({
    code: descriptor.code,
    reviewPagePath: descriptor.canonicalPath,
    descriptorHref: null,
    canonicalName: descriptor.canonicalName,
    summary: descriptor.summary,
    contentLevel: descriptor.contentLevel,
    lifecycleStatus: descriptor.lifecycleStatus,
    modelAvailability: descriptor.modelAvailability,
    effectiveTo: descriptor.effectiveTo,
    publicationStatus: descriptor.publicationStatus,
    contentReviewStatus: descriptor.contentReviewStatus,
    descriptorContentVersion: descriptor.descriptorContentVersion,
    modelReleaseId: descriptor.modelReleaseId,
    modelContentVersion: descriptor.modelContentVersion,
    sourceRegistryVersion: descriptor.sourceRegistryVersion,
    reviewBadge: REVIEW_BADGE,
    reviewTitle: REVIEW_TITLE,
    reviewMessage: REVIEW_MESSAGE,
    limitations: LIMITATIONS,
    linkNotice: LINK_NOTICE,
    historicalNotice: descriptor.code === "037" ? HISTORICAL_NOTICE : null,
    reasons: Object.freeze([...reasons]),
    sources,
    provenance,
  });

  return Object.freeze({ status: "REVIEW_ONLY", data, descriptorHref: null });
}

export function getFiscalModelReviewPageViewV1(
  input: unknown,
): FiscalModelReviewPageResultV1 {
  const resolver = createFiscalModelPageDescriptorResolverV1({
    featureEnabled: true,
  });
  const result = resolver.resolve(input);
  if (result.status === "BLOCKED") return blocked(result.reason);
  if (result.status === "AVAILABLE") {
    return blocked("UNEXPECTED_AVAILABLE_DESCRIPTOR");
  }
  return projectReviewPage(result.data, result.reasons);
}

export function listFiscalModelReviewPageViewsV1(): FiscalModelReviewPageListResultV1 {
  const resolver = createFiscalModelPageDescriptorResolverV1({
    featureEnabled: true,
  });
  const result = resolver.list({ includeHistorical: true });
  if (result.status === "BLOCKED") return blockedList(result.reason);
  if (result.status === "AVAILABLE") {
    return blockedList("UNEXPECTED_AVAILABLE_DESCRIPTOR");
  }

  const expectedCodes = ["036", "037", "303"] as const;
  if (
    result.data.length !== expectedCodes.length ||
    !expectedCodes.every((code, index) => result.data[index]?.code === code)
  ) {
    return blockedList("INCOMPLETE_REVIEW_STATE");
  }

  const pages: FiscalModelReviewPageViewV1[] = [];
  for (const descriptor of result.data) {
    const page = getFiscalModelReviewPageViewV1({ code: descriptor.code });
    if (page.status === "BLOCKED") return blockedList(page.reason);
    pages.push(page.data);
  }
  return Object.freeze({ status: "REVIEW_ONLY", data: Object.freeze(pages) });
}

export function searchFiscalModelReviewPageViewsV1(
  input: unknown,
): FiscalModelReviewPageSearchResultV1 {
  const parsed = parseExactObject(input, ["modelo"]);
  if (!parsed) return blockedList("INVALID_INPUT");

  const hasQuery = hasOwn(parsed, "modelo");
  const query = hasQuery ? parsed.modelo : null;
  if (query !== null && (typeof query !== "string" || !/^\d{3}$/.test(query))) {
    return blockedList("INVALID_INPUT");
  }

  const catalog = listFiscalModelReviewPageViewsV1();
  if (catalog.status === "BLOCKED") return catalog;
  if (query === null) {
    return Object.freeze({
      status: "REVIEW_ONLY",
      data: catalog.data,
      query: null,
      match: "ALL",
    });
  }

  const data = Object.freeze(
    catalog.data.filter((page) => page.code === query),
  );
  return Object.freeze({
    status: "REVIEW_ONLY",
    data,
    query,
    match: data.length === 1 ? "EXACT" : "NO_MATCH",
  });
}
