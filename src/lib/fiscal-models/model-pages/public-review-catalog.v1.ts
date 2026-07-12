import type { AeatOfficialModelInventoryRecordV1 } from "../inventory/contracts.v1";
import {
  getOfficialAeatModelInventoryV1,
  listOfficialAeatModelInventoryV1,
} from "../inventory/index.v1";
import { AEAT_OFFICIAL_INDEX_RELEASE_V1 } from "../inventory/official-aeat-index.release.v1";
import {
  PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1,
  resolvePublicAeatModelReviewPathV1,
  type PublicAeatModelReviewCodeV1,
  type PublicAeatModelReviewPathV1,
  type PublicAeatModelReviewRouteV1,
} from "./public-review-route-manifest.v1";
import { getFiscalModelReviewPageViewV1 } from "./review-view-model.v1";
import {
  createPublicAeatModelSearchEntryV2,
  filterPublicAeatModelSearchEntriesV2,
  type PublicAeatModelReviewSearchResultV2,
} from "./public-review-search.v2";

const PUBLIC_REVIEW_DESCRIPTOR_RELEASE_ID =
  "public-aeat-model-review-pages.2026-07-12.v1" as const;
const FISCAL_CALENDAR_ORIGIN = "FISCAL_CALENDAR" as const;
const FISCAL_CALENDAR_ORIGIN_QUERY_VALUE = "calendario" as const;
const FISCAL_CALENDAR_RETURN_HREF =
  "/consultor-fiscal/calendario" as const;
const REVIEW_BADGE = "Información en revisión" as const;
const REVIEW_TITLE = "Contenido pendiente de revisión fiscal" as const;
const REVIEW_MESSAGE =
  "Esta ficha es una estructura informativa. La identidad procede de fuentes oficiales registradas, pero el contenido fiscal y la aplicabilidad continúan pendientes de revisión." as const;
const LIMITATIONS =
  "No contiene casillas, importes, plazos ni recomendaciones y no permite presentar, firmar, pagar ni enviar declaraciones." as const;
const STRUCTURAL_SUMMARY =
  "Ficha estructural creada a partir del índice oficial de modelos de la AEAT. La vigencia, el contenido fiscal y la aplicabilidad están pendientes de revisión." as const;
const OFFICIAL_MODEL_CODE_PATTERN =
  /^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/;
const SHA256_HASH = /^[a-f0-9]{64}$/;
const INVALID_SEARCH_INPUT = Symbol("INVALID_SEARCH_INPUT");

type ParsedObject = Record<string, unknown>;

export type PublicAeatModelReviewBlockReasonV1 =
  | "INVALID_INPUT"
  | "MODEL_NOT_FOUND"
  | "INCONSISTENT_CATALOG";

export interface PublicAeatModelReviewSourceV1 {
  readonly sourceId: string;
  readonly authority: "AEAT" | "BOE";
  readonly title: string;
  readonly canonicalUrl: string;
  readonly sourceUpdatedOn: string;
  readonly verifiedOn: string | null;
  readonly sourceSha256: string | null;
  readonly verificationStatus: "SOURCE_HASH_CAPTURED" | "HASH_PENDING";
  readonly reviewStatus: "PENDING_REVIEW";
}

export interface PublicAeatModelReviewPageV1 {
  readonly code: PublicAeatModelReviewCodeV1;
  readonly href: PublicAeatModelReviewPathV1;
  readonly catalogCardId: `modelo-${PublicAeatModelReviewCodeV1}`;
  readonly reviewPagePath: PublicAeatModelReviewPathV1;
  readonly routeDeploymentStatus: "DEPLOYED";
  readonly contentReviewStatus: "PENDING_REVIEW";
  readonly fiscalReviewStatus: "PENDING_REVIEW";
  readonly descriptorReleaseId: typeof PUBLIC_REVIEW_DESCRIPTOR_RELEASE_ID;
  readonly kind: "OFFICIAL_INDEX" | "HISTORICAL_FOUNDATION";
  readonly canonicalName: string;
  readonly summary: string;
  readonly contentLevel:
    | "STRUCTURAL_INDEX_ONLY"
    | "HISTORICAL_INFO_ONLY";
  readonly lifecycleStatus: "UNDETERMINED" | "HISTORICAL";
  readonly validityStatus: "SOURCE_PENDING" | "HISTORICAL_RECORDED";
  readonly effectiveTo: string | null;
  readonly historicalNotice: string | null;
  readonly sourceReleaseId: string;
  readonly sourceRegistryVersion: string | null;
  readonly sourceRowLabel: string | null;
  readonly sourceGroupCodes: readonly string[];
  readonly reviewBadge: typeof REVIEW_BADGE;
  readonly reviewTitle: typeof REVIEW_TITLE;
  readonly reviewMessage: typeof REVIEW_MESSAGE;
  readonly limitations: typeof LIMITATIONS;
  readonly sources: readonly PublicAeatModelReviewSourceV1[];
}

export interface PublicAeatModelCalendarNavigationV1 {
  readonly code: PublicAeatModelReviewCodeV1;
  readonly origin: typeof FISCAL_CALENDAR_ORIGIN;
  readonly originQueryValue: typeof FISCAL_CALENDAR_ORIGIN_QUERY_VALUE;
  readonly routeDeploymentStatus: "DEPLOYED";
  readonly catalogCardId: `modelo-${PublicAeatModelReviewCodeV1}`;
  readonly catalogFocusHref: `/consultor-fiscal/modelos?origen=calendario&foco=${PublicAeatModelReviewCodeV1}#modelo-${PublicAeatModelReviewCodeV1}`;
  readonly detailHref: `${PublicAeatModelReviewPathV1}?origen=calendario`;
  readonly returnHref: typeof FISCAL_CALENDAR_RETURN_HREF;
}

export type PublicAeatModelCalendarNavigationResolveResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: PublicAeatModelCalendarNavigationV1;
      catalogFocusHref: PublicAeatModelCalendarNavigationV1["catalogFocusHref"];
      detailHref: PublicAeatModelCalendarNavigationV1["detailHref"];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: PublicAeatModelReviewBlockReasonV1;
      catalogFocusHref: null;
      detailHref: null;
    }>;

export type PublicAeatModelCalendarDetailContextResultV1 =
  | Readonly<{ status: "DIRECT"; data: null }>
  | Readonly<{
      status: "FROM_CALENDAR";
      data: PublicAeatModelCalendarNavigationV1;
    }>;

export type PublicAeatModelReviewResolveResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: PublicAeatModelReviewPageV1;
      href: PublicAeatModelReviewPathV1;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: PublicAeatModelReviewBlockReasonV1;
      href: null;
    }>;

export type PublicAeatModelReviewListResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly PublicAeatModelReviewPageV1[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INCONSISTENT_CATALOG";
    }>;

export type PublicAeatModelReviewSearchResultV1 =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly PublicAeatModelReviewPageV1[];
      query: string | null;
      match: "ALL" | "EXACT" | "NO_MATCH";
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INVALID_INPUT" | "INCONSISTENT_CATALOG";
    }>;

function parseExactObject(
  value: unknown,
  allowedKeys: readonly string[],
): ParsedObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const parsed: ParsedObject = Object.create(null) as ParsedObject;
    const allowed = new Set(allowedKeys);
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

function parseSearchModelQuery(
  input: unknown,
): unknown | typeof INVALID_SEARCH_INPUT {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return INVALID_SEARCH_INPUT;
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      return INVALID_SEARCH_INPUT;
    }
    let query: unknown = null;
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== "string") return INVALID_SEARCH_INPUT;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return INVALID_SEARCH_INPUT;
      }
      if (key === "modelo") query = descriptor.value;
    }
    return query;
  } catch {
    return INVALID_SEARCH_INPUT;
  }
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

function copySource(
  source: PublicAeatModelReviewSourceV1,
): PublicAeatModelReviewSourceV1 {
  return Object.freeze({ ...source });
}

function copyPage(
  page: PublicAeatModelReviewPageV1,
): PublicAeatModelReviewPageV1 {
  return Object.freeze({
    ...page,
    sourceGroupCodes: Object.freeze([...page.sourceGroupCodes]),
    sources: Object.freeze(page.sources.map(copySource)),
  });
}

function copyCalendarNavigation(
  navigation: PublicAeatModelCalendarNavigationV1,
): PublicAeatModelCalendarNavigationV1 {
  return Object.freeze({ ...navigation });
}

function blockedResolve(
  reason: PublicAeatModelReviewBlockReasonV1,
): Extract<PublicAeatModelReviewResolveResultV1, { status: "BLOCKED" }> {
  return Object.freeze({ status: "BLOCKED", reason, href: null });
}

function inventoryRecordIsCoherent(
  record: AeatOfficialModelInventoryRecordV1<string>,
  route: PublicAeatModelReviewRouteV1,
): boolean {
  return (
    record.code === route.code &&
    record.releaseId === AEAT_OFFICIAL_INDEX_RELEASE_V1.releaseId &&
    record.identityStatus === "SOURCE_CAPTURED" &&
    record.procedureHrefStatus === "SOURCE_CAPTURED" &&
    record.validityStatus === "SOURCE_PENDING" &&
    record.lifecycleStatus === "UNDETERMINED" &&
    record.reviewStatus === "PENDING_REVIEW" &&
    record.contentLevel === "STRUCTURAL_INDEX_ONLY" &&
    record.sourceId === AEAT_OFFICIAL_INDEX_RELEASE_V1.source.id &&
    isAllowlistedOfficialUrl(record.officialProcedureHref)
  );
}

function buildInventoryPage(
  record: AeatOfficialModelInventoryRecordV1<string>,
  route: PublicAeatModelReviewRouteV1,
): PublicAeatModelReviewPageV1 | null {
  const source = AEAT_OFFICIAL_INDEX_RELEASE_V1.source;
  if (
    !inventoryRecordIsCoherent(record, route) ||
    source.reviewStatus !== "PENDING_REVIEW" ||
    !SHA256_HASH.test(source.sourceSha256) ||
    !isAllowlistedOfficialUrl(source.canonicalUrl)
  ) {
    return null;
  }

  return Object.freeze({
    code: route.code,
    href: route.path,
    catalogCardId: `modelo-${route.code}`,
    reviewPagePath: route.path,
    routeDeploymentStatus: "DEPLOYED",
    contentReviewStatus: "PENDING_REVIEW",
    fiscalReviewStatus: "PENDING_REVIEW",
    descriptorReleaseId: PUBLIC_REVIEW_DESCRIPTOR_RELEASE_ID,
    kind: "OFFICIAL_INDEX",
    canonicalName: record.officialName,
    summary: STRUCTURAL_SUMMARY,
    contentLevel: "STRUCTURAL_INDEX_ONLY",
    lifecycleStatus: "UNDETERMINED",
    validityStatus: "SOURCE_PENDING",
    effectiveTo: null,
    historicalNotice: null,
    sourceReleaseId: record.releaseId,
    sourceRegistryVersion: source.id,
    sourceRowLabel: record.sourceRowLabel,
    sourceGroupCodes: Object.freeze([...record.sourceGroupCodes]),
    reviewBadge: REVIEW_BADGE,
    reviewTitle: REVIEW_TITLE,
    reviewMessage: REVIEW_MESSAGE,
    limitations: LIMITATIONS,
    sources: Object.freeze([
      Object.freeze({
        sourceId: source.id,
        authority: source.authority,
        title: source.title,
        canonicalUrl: source.canonicalUrl,
        sourceUpdatedOn: source.sourceUpdatedOn,
        verifiedOn: source.verifiedOn,
        sourceSha256: source.sourceSha256,
        verificationStatus: "SOURCE_HASH_CAPTURED",
        reviewStatus: source.reviewStatus,
      }),
    ]),
  });
}

function buildHistoricalPage(
  route: PublicAeatModelReviewRouteV1,
): PublicAeatModelReviewPageV1 | null {
  const result = getFiscalModelReviewPageViewV1({ code: "037" });
  if (
    route.code !== "037" ||
    result.status !== "REVIEW_ONLY" ||
    result.data.code !== "037" ||
    result.data.reviewPagePath !== route.path ||
    result.data.lifecycleStatus !== "HISTORICAL" ||
    result.data.contentLevel !== "HISTORICAL_INFO_ONLY" ||
    result.data.effectiveTo !== "2025-02-02" ||
    result.data.historicalNotice === null ||
    result.data.contentReviewStatus !== "PENDING_REVIEW" ||
    result.data.sources.length === 0
  ) {
    return null;
  }

  const sources: PublicAeatModelReviewSourceV1[] = [];
  for (const source of result.data.sources) {
    if (
      source.reviewStatus !== "PENDING_REVIEW" ||
      source.verificationStatus !== "HASH_PENDING" ||
      !isAllowlistedOfficialUrl(source.externalHref)
    ) {
      return null;
    }
    sources.push(
      Object.freeze({
        sourceId: source.sourceId,
        authority: source.authority,
        title: source.title,
        canonicalUrl: source.externalHref,
        sourceUpdatedOn: source.officialUpdatedAt,
        verifiedOn: null,
        sourceSha256: null,
        verificationStatus: "HASH_PENDING",
        reviewStatus: "PENDING_REVIEW",
      }),
    );
  }

  return Object.freeze({
    code: route.code,
    href: route.path,
    catalogCardId: `modelo-${route.code}`,
    reviewPagePath: route.path,
    routeDeploymentStatus: "DEPLOYED",
    contentReviewStatus: "PENDING_REVIEW",
    fiscalReviewStatus: "PENDING_REVIEW",
    descriptorReleaseId: PUBLIC_REVIEW_DESCRIPTOR_RELEASE_ID,
    kind: "HISTORICAL_FOUNDATION",
    canonicalName: result.data.canonicalName,
    summary: result.data.summary,
    contentLevel: "HISTORICAL_INFO_ONLY",
    lifecycleStatus: "HISTORICAL",
    validityStatus: "HISTORICAL_RECORDED",
    effectiveTo: result.data.effectiveTo,
    historicalNotice: result.data.historicalNotice,
    sourceReleaseId: result.data.modelReleaseId,
    sourceRegistryVersion: result.data.sourceRegistryVersion,
    sourceRowLabel: null,
    sourceGroupCodes: Object.freeze(["037"]),
    reviewBadge: REVIEW_BADGE,
    reviewTitle: REVIEW_TITLE,
    reviewMessage: REVIEW_MESSAGE,
    limitations: LIMITATIONS,
    sources: Object.freeze(sources),
  });
}

type CatalogSnapshot =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly PublicAeatModelReviewPageV1[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INCONSISTENT_CATALOG";
    }>;

function buildCatalogSnapshot(): CatalogSnapshot {
  const inventory = listOfficialAeatModelInventoryV1();
  if (inventory.status === "BLOCKED" || inventory.data.length !== 228) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CATALOG",
    });
  }

  const officialRoutes = PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1.filter(
    (route) => route.code !== "037",
  );
  if (
    PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1.length !== 229 ||
    officialRoutes.length !== inventory.data.length ||
    !officialRoutes.every(
      (route, index) => route.code === inventory.data[index]?.code,
    ) ||
    getOfficialAeatModelInventoryV1({ code: "037" }).status !== "BLOCKED"
  ) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CATALOG",
    });
  }

  const recordByCode = new Map(
    inventory.data.map((record) => [record.code, record] as const),
  );
  if (recordByCode.size !== inventory.data.length) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CATALOG",
    });
  }

  const pages: PublicAeatModelReviewPageV1[] = [];
  for (const route of PUBLIC_AEAT_MODEL_REVIEW_ROUTES_V1) {
    const page =
      route.code === "037"
        ? buildHistoricalPage(route)
        : (() => {
            const record = recordByCode.get(route.code);
            return record ? buildInventoryPage(record, route) : null;
          })();
    if (!page) {
      return Object.freeze({
        status: "BLOCKED",
        reason: "INCONSISTENT_CATALOG",
      });
    }
    pages.push(page);
  }

  if (
    pages.length !== 229 ||
    new Set(pages.map((page) => page.code)).size !== pages.length ||
    new Set(pages.map((page) => page.href)).size !== pages.length ||
    new Set(pages.map((page) => page.catalogCardId)).size !== pages.length
  ) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CATALOG",
    });
  }

  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze(pages),
  });
}

const CATALOG_SNAPSHOT = buildCatalogSnapshot();
const pagesByCode =
  CATALOG_SNAPSHOT.status === "REVIEW_ONLY"
    ? new Map(CATALOG_SNAPSHOT.data.map((page) => [page.code, page] as const))
    : new Map<PublicAeatModelReviewCodeV1, PublicAeatModelReviewPageV1>();
const calendarNavigationByCode =
  CATALOG_SNAPSHOT.status === "REVIEW_ONLY"
    ? new Map(
        CATALOG_SNAPSHOT.data.map((page) => {
          const navigation: PublicAeatModelCalendarNavigationV1 = Object.freeze({
            code: page.code,
            origin: FISCAL_CALENDAR_ORIGIN,
            originQueryValue: FISCAL_CALENDAR_ORIGIN_QUERY_VALUE,
            routeDeploymentStatus: page.routeDeploymentStatus,
            catalogCardId: page.catalogCardId,
            catalogFocusHref:
              `/consultor-fiscal/modelos?origen=calendario&foco=${page.code}#${page.catalogCardId}` as PublicAeatModelCalendarNavigationV1["catalogFocusHref"],
            detailHref:
              `${page.href}?origen=calendario` as PublicAeatModelCalendarNavigationV1["detailHref"],
            returnHref: FISCAL_CALENDAR_RETURN_HREF,
          });
          return [page.code, navigation] as const;
        }),
      )
    : new Map<
        PublicAeatModelReviewCodeV1,
        PublicAeatModelCalendarNavigationV1
      >();

export function resolvePublicAeatModelReviewPageV1(
  input: unknown,
): PublicAeatModelReviewResolveResultV1 {
  const parsed = parseExactObject(input, ["code"]);
  if (
    !parsed ||
    typeof parsed.code !== "string" ||
    !OFFICIAL_MODEL_CODE_PATTERN.test(parsed.code)
  ) {
    return blockedResolve("INVALID_INPUT");
  }
  if (CATALOG_SNAPSHOT.status === "BLOCKED") {
    return blockedResolve("INCONSISTENT_CATALOG");
  }

  const href = resolvePublicAeatModelReviewPathV1(parsed.code);
  if (href === null) return blockedResolve("MODEL_NOT_FOUND");
  const page = pagesByCode.get(parsed.code as PublicAeatModelReviewCodeV1);
  if (!page || page.href !== href) {
    return blockedResolve("INCONSISTENT_CATALOG");
  }

  const data = copyPage(page);
  return Object.freeze({ status: "REVIEW_ONLY", data, href: data.href });
}

export function listPublicAeatModelReviewPagesV1(): PublicAeatModelReviewListResultV1 {
  if (CATALOG_SNAPSHOT.status === "BLOCKED") {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CATALOG",
    });
  }
  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze(CATALOG_SNAPSHOT.data.map(copyPage)),
  });
}

export function searchPublicAeatModelReviewPagesV2(
  input: unknown,
): PublicAeatModelReviewSearchResultV2 {
  const query = parseSearchModelQuery(input);
  if (query === INVALID_SEARCH_INPUT) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  const catalog = listPublicAeatModelReviewPagesV1();
  if (catalog.status === "BLOCKED") return catalog;

  const entries = catalog.data.map(createPublicAeatModelSearchEntryV2);
  const result = filterPublicAeatModelSearchEntriesV2(entries, query);
  if (result.status === "BLOCKED") return result;
  const matchingIds = new Set(result.data.map((entry) => entry.catalogCardId));
  const data = catalog.data.filter((page) =>
    matchingIds.has(page.catalogCardId),
  );
  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze(data),
    query: result.query,
    normalizedQuery: result.normalizedQuery,
    match: result.match,
    total: result.total,
  });
}

export function resolvePublicAeatModelCalendarNavigationV1(
  input: unknown,
): PublicAeatModelCalendarNavigationResolveResultV1 {
  const parsed = parseExactObject(input, ["code"]);
  if (
    !parsed ||
    typeof parsed.code !== "string" ||
    !OFFICIAL_MODEL_CODE_PATTERN.test(parsed.code)
  ) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
      catalogFocusHref: null,
      detailHref: null,
    });
  }
  if (CATALOG_SNAPSHOT.status === "BLOCKED") {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CATALOG",
      catalogFocusHref: null,
      detailHref: null,
    });
  }

  const navigation = calendarNavigationByCode.get(
    parsed.code as PublicAeatModelReviewCodeV1,
  );
  if (!navigation) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "MODEL_NOT_FOUND",
      catalogFocusHref: null,
      detailHref: null,
    });
  }

  const data = copyCalendarNavigation(navigation);
  return Object.freeze({
    status: "REVIEW_ONLY",
    data,
    catalogFocusHref: data.catalogFocusHref,
    detailHref: data.detailHref,
  });
}

export function resolvePublicAeatModelCalendarDetailContextV1(
  input: unknown,
): PublicAeatModelCalendarDetailContextResultV1 {
  const parsed = parseExactObject(input, ["code", "searchParams"]);
  if (!parsed || typeof parsed.code !== "string") {
    return Object.freeze({ status: "DIRECT", data: null });
  }

  const searchParams = parseExactObject(parsed.searchParams, ["origen"]);
  if (
    !searchParams ||
    !hasOwn(searchParams, "origen") ||
    searchParams.origen !== FISCAL_CALENDAR_ORIGIN_QUERY_VALUE
  ) {
    return Object.freeze({ status: "DIRECT", data: null });
  }

  const navigation = resolvePublicAeatModelCalendarNavigationV1({
    code: parsed.code,
  });
  if (navigation.status === "BLOCKED") {
    return Object.freeze({ status: "DIRECT", data: null });
  }
  return Object.freeze({
    status: "FROM_CALENDAR",
    data: copyCalendarNavigation(navigation.data),
  });
}

export function resolvePublicAeatModelCalendarCatalogContextV1(
  input: unknown,
): PublicAeatModelCalendarDetailContextResultV1 {
  const parsed = parseExactObject(input, ["modelo", "origen", "foco"]);
  if (
    !parsed ||
    (hasOwn(parsed, "modelo") && parsed.modelo !== "") ||
    parsed.origen !== FISCAL_CALENDAR_ORIGIN_QUERY_VALUE ||
    typeof parsed.foco !== "string"
  ) {
    return Object.freeze({ status: "DIRECT", data: null });
  }

  const navigation = resolvePublicAeatModelCalendarNavigationV1({
    code: parsed.foco,
  });
  if (navigation.status === "BLOCKED") {
    return Object.freeze({ status: "DIRECT", data: null });
  }
  return Object.freeze({
    status: "FROM_CALENDAR",
    data: copyCalendarNavigation(navigation.data),
  });
}

export function searchPublicAeatModelReviewPagesV1(
  input: unknown,
): PublicAeatModelReviewSearchResultV1 {
  const parsed = parseExactObject(input, ["modelo"]);
  if (!parsed) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }

  const hasQuery = hasOwn(parsed, "modelo");
  const query = hasQuery ? parsed.modelo : null;
  if (
    query !== null &&
    (typeof query !== "string" || !OFFICIAL_MODEL_CODE_PATTERN.test(query))
  ) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }

  const catalog = listPublicAeatModelReviewPagesV1();
  if (catalog.status === "BLOCKED") return catalog;
  if (query === null) {
    return Object.freeze({
      status: "REVIEW_ONLY",
      data: catalog.data,
      query: null,
      match: "ALL",
    });
  }

  const result = resolvePublicAeatModelReviewPageV1({ code: query });
  if (result.status === "BLOCKED") {
    if (result.reason === "MODEL_NOT_FOUND") {
      return Object.freeze({
        status: "REVIEW_ONLY",
        data: Object.freeze([]),
        query,
        match: "NO_MATCH",
      });
    }
    return Object.freeze({ status: "BLOCKED", reason: result.reason });
  }
  return Object.freeze({
    status: "REVIEW_ONLY",
    data: Object.freeze([result.data]),
    query,
    match: "EXACT",
  });
}
