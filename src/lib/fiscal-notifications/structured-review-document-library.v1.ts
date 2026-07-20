import {
  projectFiscalNotificationDocumentDetailV1,
  type FiscalNotificationDocumentDetailViewModelV1,
} from "./structured-review-document-detail.v1";
import {
  projectFiscalNotificationStructuredHistoryV1,
  type FiscalNotificationStructuredHistoryEntryV1,
  type FiscalNotificationStructuredHistoryViewModelV1,
} from "./structured-review-history-view-model.v1";
import {
  projectStructuredReviewRelationsV1,
  type StructuredReviewRelationMatchV1,
  type StructuredReviewRelationsViewModelV1,
} from "./structured-review-relations-view-model.v1";
import { containsInternalFiscalNotificationToken } from "./document-fact-observation.v1";
import type { DocumentRelationType } from "./types";

export type FiscalNotificationDocumentLibraryOrderV1 =
  | "FIRST_DOCUMENT"
  | "LAST_DOCUMENT"
  | "NEWEST"
  | "OLDEST"
  | "NEXT_DEADLINE"
  | "PENDING_REVIEW";

export type FiscalNotificationDocumentLibraryRelationFilterV1 =
  | "ALL"
  | "WITH_RELATIONS"
  | "WITHOUT_RELATIONS"
  | "CONFIRMED"
  | "SUGGESTED";

export interface FiscalNotificationDocumentLibraryFiltersV1 {
  readonly query: string;
  readonly family: string;
  readonly authority: string;
  readonly year: string;
  readonly period: string;
  readonly reviewStatus: "ALL" | "PENDING" | "REVIEWED";
  readonly relation: FiscalNotificationDocumentLibraryRelationFilterV1;
  readonly original: "ALL" | "DRIVE" | "UNAVAILABLE";
  readonly deadline: "ALL" | "UPCOMING";
}

export interface FiscalNotificationDocumentLibraryFilterOptionV1 {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface FiscalNotificationDocumentLibraryFilterOptionsV1 {
  readonly families: readonly FiscalNotificationDocumentLibraryFilterOptionV1[];
  readonly authorities: readonly FiscalNotificationDocumentLibraryFilterOptionV1[];
  readonly years: readonly FiscalNotificationDocumentLibraryFilterOptionV1[];
  readonly periods: readonly FiscalNotificationDocumentLibraryFilterOptionV1[];
}

export interface FiscalNotificationDocumentLibraryAmountV1 {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface FiscalNotificationDocumentLibraryReferenceV1 {
  readonly label: string;
  readonly value: string;
}

export interface FiscalNotificationDocumentLibrarySummaryV1 {
  readonly key: string;
  readonly familyLabel: string;
  readonly typeLabel: string;
  readonly eyebrowLabel: string;
  readonly title: string;
  readonly authority: string;
  readonly authorityAbbreviation: string;
  readonly documentDate: string | null;
  readonly documentDateLabel: string;
  readonly year: string | null;
  readonly model: string | null;
  readonly period: string | null;
  readonly primaryReference: FiscalNotificationDocumentLibraryReferenceV1 | null;
  readonly amounts: readonly FiscalNotificationDocumentLibraryAmountV1[];
  readonly reviewStatus: "PENDING" | "REVIEWED";
  readonly reviewLabel: string;
  readonly originalStatus: "DRIVE" | "UNAVAILABLE";
  readonly originalLabel: "Original en Drive" | "Original no disponible";
  readonly deadlineChronologyKeys: readonly string[];
  readonly searchText: string;
}

export interface FiscalNotificationDocumentLibraryLinkV1 {
  readonly key: string;
  readonly relationType: DocumentRelationType;
  readonly fromDocumentId: string;
  readonly fromDocumentTitle: string;
  readonly toDocumentId: string;
  readonly toDocumentTitle: string;
  readonly label: string;
  readonly explanation: string;
  readonly matches: readonly StructuredReviewRelationMatchV1[];
  readonly relationStatus:
    | "SUGGESTED"
    | "USER_CONFIRMED"
    | "SYSTEM_CONFIRMED_EXACT";
  readonly visualStatus: "CONFIRMED" | "SUGGESTED";
  readonly visualStatusLabel:
    | "Relación sugerida"
    | "Confirmada por el usuario"
    | "Confirmada por referencia exacta";
  readonly statusLabel:
    | "Relación detectada · revisar"
    | "Referencia exacta · revisar efectos";
  readonly directionSource: "DOMAIN_RELATION";
}

export interface FiscalNotificationDocumentLibraryGroupV1 {
  readonly key: string;
  readonly documents: readonly FiscalNotificationStructuredHistoryEntryV1[];
  readonly summaries: readonly FiscalNotificationDocumentLibrarySummaryV1[];
  readonly links: readonly FiscalNotificationDocumentLibraryLinkV1[];
  readonly firstDocumentChronologyKey: string;
  readonly latestDocumentChronologyKey: string;
  readonly deadlineChronologyKeys: readonly string[];
  readonly dateRangeLabel: string;
  readonly primaryReference: FiscalNotificationDocumentLibraryReferenceV1 | null;
  readonly reviewStatus: "PENDING" | "REVIEWED";
  readonly hasConfirmedRelation: boolean;
  readonly hasSuggestedRelation: boolean;
}

export type FiscalNotificationDocumentLibraryViewModelV1 =
  | {
      readonly status: "READY";
      readonly documents: readonly FiscalNotificationStructuredHistoryEntryV1[];
      readonly groups: readonly FiscalNotificationDocumentLibraryGroupV1[];
      readonly filterOptions: FiscalNotificationDocumentLibraryFilterOptionsV1;
    }
  | {
      readonly status: "BLOCKED";
      readonly documents: readonly [];
      readonly groups: readonly [];
    };

export const EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1 =
  Object.freeze({
    query: "",
    family: "ALL",
    authority: "ALL",
    year: "ALL",
    period: "ALL",
    reviewStatus: "ALL",
    relation: "ALL",
    original: "ALL",
    deadline: "ALL",
  }) satisfies FiscalNotificationDocumentLibraryFiltersV1;

export function projectFiscalNotificationDocumentLibraryV1(
  value: unknown,
  ownerScope: string,
): FiscalNotificationDocumentLibraryViewModelV1 {
  return composeFiscalNotificationDocumentLibraryV1(
    projectFiscalNotificationStructuredHistoryV1(value, ownerScope),
    projectStructuredReviewRelationsV1(value, ownerScope),
  );
}

export function composeFiscalNotificationDocumentLibraryV1(
  history: FiscalNotificationStructuredHistoryViewModelV1,
  relations: StructuredReviewRelationsViewModelV1,
): FiscalNotificationDocumentLibraryViewModelV1 {
  if (history.status === "BLOCKED" || relations.status === "BLOCKED") {
    return Object.freeze({
      status: "BLOCKED",
      documents: Object.freeze([]) as readonly [],
      groups: Object.freeze([]) as readonly [],
    });
  }

  const documents = new Map(history.entries.map((entry) => [entry.key, entry]));
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();
  for (const documentId of documents.keys()) {
    parent.set(documentId, documentId);
    rank.set(documentId, 0);
  }

  for (const relation of relations.entries) {
    const [source, target] = relation.documents;
    if (!documents.has(source.id) || !documents.has(target.id)) continue;
    union(parent, rank, source.id, target.id);
  }

  const timelinePosition = new Map<string, number>();
  const exactLinks = new Map(
    relations.timelines.flatMap((timeline) => {
      for (const step of timeline.steps) {
        timelinePosition.set(step.id, step.position);
      }
      return timeline.links.map((link) => [link.key, link] as const);
    }),
  );

  const documentsByRoot = new Map<
    string,
    FiscalNotificationStructuredHistoryEntryV1[]
  >();
  for (const document of documents.values()) {
    const root = findRoot(parent, document.key);
    documentsByRoot.set(root, [...(documentsByRoot.get(root) ?? []), document]);
  }

  const linksByRoot = new Map<
    string,
    FiscalNotificationDocumentLibraryLinkV1[]
  >();
  for (const relation of relations.entries) {
    const [source, target] = relation.documents;
    const sourceDocument = documents.get(source.id);
    const targetDocument = documents.get(target.id);
    if (!sourceDocument || !targetDocument) continue;
    const exact = exactLinks.get(relation.key);
    const relationStatus =
      relation.relationStatus ??
      (relation.statusLabel === "Relación detectada · revisar"
        ? ("SUGGESTED" as const)
        : ("SYSTEM_CONFIRMED_EXACT" as const));
    const fromDocumentId = source.id;
    const toDocumentId = target.id;
    const link = Object.freeze({
      key: relation.key,
      relationType: relation.relationType,
      fromDocumentId,
      fromDocumentTitle: documents.get(fromDocumentId)?.title ?? "Documento anterior",
      toDocumentId,
      toDocumentTitle: documents.get(toDocumentId)?.title ?? "Documento posterior",
      label: shortRelationLabel(
        relation.relationType,
        safeLibraryText(exact?.label ?? relation.title, "Relación documental"),
      ),
      explanation: safeLibraryText(
        relation.explanation,
        "Consulta los documentos y el identificador coincidente antes de interpretar este vínculo.",
      ),
      matches: Object.freeze(
        relation.matches.filter(isVisibleLibraryRelationMatch),
      ),
      relationStatus,
      visualStatus:
        relationStatus === "SUGGESTED"
          ? ("SUGGESTED" as const)
          : ("CONFIRMED" as const),
      visualStatusLabel:
        relationStatus === "SUGGESTED"
          ? ("Relación sugerida" as const)
          : relationStatus === "USER_CONFIRMED"
            ? ("Confirmada por el usuario" as const)
            : ("Confirmada por referencia exacta" as const),
      statusLabel: relation.statusLabel,
      directionSource: "DOMAIN_RELATION" as const,
    });
    const root = findRoot(parent, source.id);
    linksByRoot.set(root, [...(linksByRoot.get(root) ?? []), link]);
  }

  const groups = [...documentsByRoot.entries()].map(([root, entries]) => {
    const orderedDocuments = [...entries].sort((left, right) =>
      compareDocuments(left, right, timelinePosition),
    );
    const links = [...(linksByRoot.get(root) ?? [])].sort((left, right) => {
      const leftIndex = Math.min(
        orderedDocuments.findIndex(
          (document) => document.key === left.fromDocumentId,
        ),
        orderedDocuments.findIndex(
          (document) => document.key === left.toDocumentId,
        ),
      );
      const rightIndex = Math.min(
        orderedDocuments.findIndex(
          (document) => document.key === right.fromDocumentId,
        ),
        orderedDocuments.findIndex(
          (document) => document.key === right.toDocumentId,
        ),
      );
      return leftIndex - rightIndex || left.key.localeCompare(right.key);
    });
    const datedKeys = orderedDocuments
      .map(documentChronologyKey)
      .filter((value) => value.length > 0)
      .sort();
    const provisionalGroup: FiscalNotificationDocumentLibraryGroupV1 = {
      key: `document-group:${orderedDocuments.map((item) => item.key).join("|")}`,
      documents: Object.freeze(orderedDocuments),
      summaries: Object.freeze([]),
      links: Object.freeze(links),
      firstDocumentChronologyKey: datedKeys[0] ?? "",
      latestDocumentChronologyKey: datedKeys.at(-1) ?? "",
      deadlineChronologyKeys: Object.freeze([]),
      dateRangeLabel: formatDocumentDateRange(orderedDocuments),
      primaryReference: null,
      reviewStatus: "PENDING",
      hasConfirmedRelation: links.some(
        (link) => link.visualStatus === "CONFIRMED",
      ),
      hasSuggestedRelation: links.some(
        (link) => link.visualStatus === "SUGGESTED",
      ),
    };
    const summaries = orderedDocuments.map((document) =>
      projectDocumentSummary(
        document,
        projectFiscalNotificationDocumentDetailV1({
          document,
          group: provisionalGroup,
          allDocuments: history.entries,
        }),
      ),
    );
    const summaryTitles = new Map(
      summaries.map((summary) => [summary.key, summary.title]),
    );
    const displayLinks = links.map((link) =>
      Object.freeze({
        ...link,
        fromDocumentTitle:
          summaryTitles.get(link.fromDocumentId) ?? link.fromDocumentTitle,
        toDocumentTitle:
          summaryTitles.get(link.toDocumentId) ?? link.toDocumentTitle,
      }),
    );
    const deadlineChronologyKeys = [
      ...new Set(summaries.flatMap((summary) => summary.deadlineChronologyKeys)),
    ].sort();
    return Object.freeze({
      ...provisionalGroup,
      summaries: Object.freeze(summaries),
      links: Object.freeze(displayLinks),
      deadlineChronologyKeys: Object.freeze(deadlineChronologyKeys),
      primaryReference:
        summaries.flatMap((summary) =>
          summary.primaryReference ? [summary.primaryReference] : [],
        )[0] ?? null,
      reviewStatus: summaries.every(
        (summary) => summary.reviewStatus === "REVIEWED",
      )
        ? ("REVIEWED" as const)
        : ("PENDING" as const),
    });
  });

  groups.sort((left, right) =>
    compareGroupsByOrder(left, right, "FIRST_DOCUMENT", "0000-01-01"),
  );

  return Object.freeze({
    status: "READY",
    documents: Object.freeze([...history.entries]),
    groups: Object.freeze(groups),
    filterOptions: projectFilterOptions(groups),
  });
}

export function filterAndSortFiscalNotificationDocumentLibraryGroupsV1(input: {
  readonly groups: readonly FiscalNotificationDocumentLibraryGroupV1[];
  readonly filters: FiscalNotificationDocumentLibraryFiltersV1;
  readonly order: FiscalNotificationDocumentLibraryOrderV1;
  readonly today: string;
}): readonly FiscalNotificationDocumentLibraryGroupV1[] {
  const query = normalizeSearch(input.filters.query);
  return Object.freeze(
    input.groups
      .filter((group) => {
        if (
          query &&
          !group.summaries.some((summary) => summary.searchText.includes(query))
        ) {
          return false;
        }
        if (
          input.filters.family !== "ALL" &&
          !group.summaries.some(
            (summary) => summary.familyLabel === input.filters.family,
          )
        ) {
          return false;
        }
        if (
          input.filters.authority !== "ALL" &&
          !group.summaries.some(
            (summary) => summary.authority === input.filters.authority,
          )
        ) {
          return false;
        }
        if (
          input.filters.year !== "ALL" &&
          !group.summaries.some(
            (summary) => summary.year === input.filters.year,
          )
        ) {
          return false;
        }
        if (
          input.filters.period !== "ALL" &&
          !group.summaries.some(
            (summary) => summary.period === input.filters.period,
          )
        ) {
          return false;
        }
        if (
          input.filters.reviewStatus !== "ALL" &&
          !group.summaries.some(
            (summary) =>
              summary.reviewStatus === input.filters.reviewStatus,
          )
        ) {
          return false;
        }
        if (!matchesRelationFilter(group, input.filters.relation)) return false;
        if (
          input.filters.original !== "ALL" &&
          !group.summaries.some(
            (summary) => summary.originalStatus === input.filters.original,
          )
        ) {
          return false;
        }
        if (
          input.filters.deadline === "UPCOMING" &&
          !group.deadlineChronologyKeys.some((date) => date >= input.today)
        ) {
          return false;
        }
        return true;
      })
      .toSorted((left, right) =>
        compareGroupsByOrder(left, right, input.order, input.today),
      ),
  );
}

export function relationAtFiscalNotificationDocumentBoundaryV1(
  group: FiscalNotificationDocumentLibraryGroupV1,
  boundaryIndex: number,
): FiscalNotificationDocumentLibraryLinkV1 | null {
  const leftIds = new Set(
    group.documents.slice(0, boundaryIndex + 1).map((document) => document.key),
  );
  const rightIds = new Set(
    group.documents.slice(boundaryIndex + 1).map((document) => document.key),
  );
  const directLeft = group.documents[boundaryIndex]?.key;
  const directRight = group.documents[boundaryIndex + 1]?.key;
  return (
    group.links
      .filter(
        (link) =>
          (leftIds.has(link.fromDocumentId) && rightIds.has(link.toDocumentId)) ||
          (leftIds.has(link.toDocumentId) && rightIds.has(link.fromDocumentId)),
      )
      .toSorted((left, right) => {
        const leftDirect =
          (left.fromDocumentId === directLeft && left.toDocumentId === directRight) ||
          (left.fromDocumentId === directRight && left.toDocumentId === directLeft);
        const rightDirect =
          (right.fromDocumentId === directLeft && right.toDocumentId === directRight) ||
          (right.fromDocumentId === directRight && right.toDocumentId === directLeft);
        return (
          Number(rightDirect) - Number(leftDirect) ||
          Number(right.visualStatus === "CONFIRMED") -
            Number(left.visualStatus === "CONFIRMED") ||
          left.key.localeCompare(right.key)
        );
      })[0] ?? null
  );
}

function projectDocumentSummary(
  document: FiscalNotificationStructuredHistoryEntryV1,
  detail: FiscalNotificationDocumentDetailViewModelV1,
): FiscalNotificationDocumentLibrarySummaryV1 {
  const title = detail.header.literalTitle ?? detail.header.title;
  const eyebrowLabel =
    normalizeSearch(title) === normalizeSearch(detail.header.familyLabel)
      ? detail.header.typeLabel
      : detail.header.familyLabel;
  const model = detail.header.metadata.find((item) => item.label === "Modelo")?.value ?? null;
  const period = detail.header.metadata.find((item) => item.label === "Periodo")?.value ?? null;
  const primaryReference = selectPrimaryReference(document.references);
  const deadlineChronologyKeys = observedDeadlineDates(document);
  const reviewStatus = document.reviewStatus;
  const amounts = (detail.economy?.summary ?? []).slice(0, 2).map((amount) =>
    Object.freeze({
      key: amount.key,
      label: amount.label,
      value: amount.value,
    }),
  );
  const searchText = normalizeSearch(
    [
      title,
      detail.header.familyLabel,
      detail.header.typeLabel,
      detail.header.authority,
      model ? `modelo ${model}` : "",
      period ? `periodo ${period}` : "",
      ...document.references.flatMap((reference) =>
        reference.value === "Referencia protegida" ||
        containsInternalFiscalNotificationToken(reference.label) ||
        containsInternalFiscalNotificationToken(reference.value)
          ? []
          : [reference.label, reference.value],
      ),
    ].join(" "),
  );
  return Object.freeze({
    key: document.key,
    familyLabel: detail.header.familyLabel,
    typeLabel: detail.header.typeLabel,
    eyebrowLabel,
    title,
    authority: detail.header.authority,
    authorityAbbreviation: abbreviateAuthority(detail.header.authority),
    documentDate: document.documentDate,
    documentDateLabel: document.documentDate
      ? formatCalendarDate(document.documentDate)
      : "Fecha pendiente",
    year: document.documentDate?.slice(0, 4) ?? null,
    model,
    period,
    primaryReference,
    amounts: Object.freeze(amounts),
    reviewStatus,
    reviewLabel:
      reviewStatus === "REVIEWED" ? "Revisado" : "Pendiente de revisión",
    originalStatus: detail.actions.driveFileId ? "DRIVE" : "UNAVAILABLE",
    originalLabel: detail.actions.driveFileId
      ? "Original en Drive"
      : "Original no disponible",
    deadlineChronologyKeys: Object.freeze(deadlineChronologyKeys),
    searchText,
  });
}

function observedDeadlineDates(
  document: FiscalNotificationStructuredHistoryEntryV1,
): string[] {
  const dates = document.orderedFacts.flatMap((fact) => {
    if (
      fact.semantic !== "DATE" ||
      !/(?:plazo|vencimiento|fecha limite|fecha límite|fin del periodo|fin del período|cuota)/iu.test(
        fact.label,
      )
    ) {
      return [];
    }
    const date = normalizeCalendarDate(fact.value);
    return date ? [date] : [];
  });
  for (const installment of document.installments) {
    const date = normalizeCalendarDate(installment.dueDate);
    if (date) dates.push(date);
  }
  return [...new Set(dates)].sort();
}

function selectPrimaryReference(
  references: FiscalNotificationStructuredHistoryEntryV1["references"],
): FiscalNotificationDocumentLibraryReferenceV1 | null {
  const visible = references.filter(
    (reference) =>
      reference.value !== "Referencia protegida" &&
      !containsInternalFiscalNotificationToken(reference.label) &&
      !containsInternalFiscalNotificationToken(reference.value),
  );
  const preference = [
    /expediente/iu,
    /procedimiento/iu,
    /diligencia/iu,
    /liquidacion|liquidación/iu,
    /deuda/iu,
    /referencia/iu,
  ];
  for (const pattern of preference) {
    const match = visible.find((reference) => pattern.test(reference.label));
    if (match) return Object.freeze({ label: match.label, value: match.value });
  }
  const fallback = visible[0];
  return fallback
    ? Object.freeze({ label: fallback.label, value: fallback.value })
    : null;
}

function projectFilterOptions(
  groups: readonly FiscalNotificationDocumentLibraryGroupV1[],
): FiscalNotificationDocumentLibraryFilterOptionsV1 {
  const summaries = groups.flatMap((group) => group.summaries);
  return Object.freeze({
    families: collectFilterOptions(
      summaries.map((summary) => [summary.familyLabel, summary.familyLabel]),
    ),
    authorities: collectFilterOptions(
      summaries.map((summary) => [summary.authority, summary.authority]),
    ),
    years: collectFilterOptions(
      summaries.flatMap((summary) =>
        summary.year ? [[summary.year, summary.year] as const] : [],
      ),
      true,
    ),
    periods: collectFilterOptions(
      summaries.flatMap((summary) =>
        summary.period ? [[summary.period, summary.period] as const] : [],
      ),
    ),
  });
}

function collectFilterOptions(
  values: readonly (readonly [string, string])[],
  descending = false,
): readonly FiscalNotificationDocumentLibraryFilterOptionV1[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const [value, label] of values) {
    const current = counts.get(value);
    counts.set(value, { label, count: (current?.count ?? 0) + 1 });
  }
  return Object.freeze(
    [...counts.entries()]
      .map(([value, item]) => Object.freeze({ value, ...item }))
      .sort((left, right) =>
        descending
          ? right.label.localeCompare(left.label, "es")
          : left.label.localeCompare(right.label, "es"),
      ),
  );
}

function matchesRelationFilter(
  group: FiscalNotificationDocumentLibraryGroupV1,
  filter: FiscalNotificationDocumentLibraryRelationFilterV1,
): boolean {
  switch (filter) {
    case "WITH_RELATIONS":
      return group.links.length > 0;
    case "WITHOUT_RELATIONS":
      return group.links.length === 0;
    case "CONFIRMED":
      return group.hasConfirmedRelation;
    case "SUGGESTED":
      return group.hasSuggestedRelation;
    default:
      return true;
  }
}

function compareGroupsByOrder(
  left: FiscalNotificationDocumentLibraryGroupV1,
  right: FiscalNotificationDocumentLibraryGroupV1,
  order: FiscalNotificationDocumentLibraryOrderV1,
  today: string,
): number {
  if (order === "PENDING_REVIEW") {
    const reviewOrder =
      Number(right.reviewStatus === "PENDING") -
      Number(left.reviewStatus === "PENDING");
    if (reviewOrder !== 0) return reviewOrder;
    return compareDateKeys(
      left.latestDocumentChronologyKey,
      right.latestDocumentChronologyKey,
      "DESC",
    ) || left.key.localeCompare(right.key);
  }
  if (order === "NEXT_DEADLINE") {
    const leftDeadline = left.deadlineChronologyKeys.find((date) => date >= today) ?? "";
    const rightDeadline = right.deadlineChronologyKeys.find((date) => date >= today) ?? "";
    return (
      compareDateKeys(leftDeadline, rightDeadline, "ASC") ||
      compareDateKeys(
        left.latestDocumentChronologyKey,
        right.latestDocumentChronologyKey,
        "DESC",
      ) ||
      left.key.localeCompare(right.key)
    );
  }
  const key =
    order === "FIRST_DOCUMENT" || order === "OLDEST"
      ? "firstDocumentChronologyKey"
      : "latestDocumentChronologyKey";
  const direction = order === "OLDEST" ? "ASC" : "DESC";
  return (
    compareDateKeys(left[key], right[key], direction) ||
    left.key.localeCompare(right.key)
  );
}

function compareDateKeys(
  left: string,
  right: string,
  direction: "ASC" | "DESC",
): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return direction === "ASC"
    ? left.localeCompare(right)
    : right.localeCompare(left);
}

function documentChronologyKey(
  document: FiscalNotificationStructuredHistoryEntryV1,
): string {
  return document.documentDate ? `${document.documentDate}T00:00:00.000Z` : "";
}

function compareDocuments(
  left: FiscalNotificationStructuredHistoryEntryV1,
  right: FiscalNotificationStructuredHistoryEntryV1,
  timelinePosition: ReadonlyMap<string, number>,
): number {
  if (left.documentDate && right.documentDate) {
    const dateOrder = left.documentDate.localeCompare(right.documentDate);
    if (dateOrder !== 0) return dateOrder;
  }
  if (left.documentDate && !right.documentDate) return -1;
  if (!left.documentDate && right.documentDate) return 1;

  const leftPosition = timelinePosition.get(left.key);
  const rightPosition = timelinePosition.get(right.key);
  if (leftPosition !== undefined && rightPosition !== undefined) {
    const positionOrder = leftPosition - rightPosition;
    if (positionOrder !== 0) return positionOrder;
  }

  return (
    documentChronologyKey(left).localeCompare(documentChronologyKey(right)) ||
    left.key.localeCompare(right.key)
  );
}

function formatDocumentDateRange(
  documents: readonly FiscalNotificationStructuredHistoryEntryV1[],
): string {
  const dates = documents
    .flatMap((document) => (document.documentDate ? [document.documentDate] : []))
    .sort();
  const first = parseCalendarDate(dates[0]);
  const last = parseCalendarDate(dates.at(-1));
  if (!first || !last) return "Fecha pendiente";
  if (first.iso === last.iso) return formatCompactDate(first);
  if (first.year !== last.year) return `${first.year}–${last.year}`;
  if (first.month !== last.month) {
    return `${monthLabel(first.month)}–${monthLabel(last.month)} ${first.year}`;
  }
  return `${first.day}–${last.day} ${monthLabel(first.month)} ${first.year}`;
}

function formatCalendarDate(value: string): string {
  const parsed = parseCalendarDate(value);
  return parsed
    ? `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`
    : value;
}

function formatCompactDate(date: CalendarDateParts): string {
  return `${date.day} ${monthLabel(date.month)} ${date.year}`;
}

function monthLabel(month: number): string {
  return [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ][month - 1]!;
}

interface CalendarDateParts {
  readonly iso: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function normalizeCalendarDate(value: string | null): string | null {
  return parseCalendarDate(value)?.iso ?? null;
}

function parseCalendarDate(value: string | null | undefined): CalendarDateParts | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim());
  const spanish = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(value.trim());
  const year = Number(iso?.[1] ?? spanish?.[3]);
  const month = Number(iso?.[2] ?? spanish?.[2]);
  const day = Number(iso?.[3] ?? spanish?.[1]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Object.freeze({
    iso: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    year,
    month,
    day,
  });
}

function abbreviateAuthority(value: string): string {
  const normalized = normalizeSearch(value);
  if (
    normalized.includes("agencia estatal de administracion tributaria") ||
    normalized === "agencia tributaria" ||
    normalized === "aeat"
  ) {
    return "AEAT";
  }
  if (
    normalized.includes("boletin oficial del estado") ||
    normalized === "boe"
  ) {
    return "BOE";
  }
  if (normalized.includes("tesoreria general de la seguridad social")) {
    return "TGSS";
  }
  const initials = value
    .split(/\s+/u)
    .filter((word) => !/^(?:de|del|la|las|el|los|y|e)$/iu.test(word))
    .map((word) => word[0]?.toLocaleUpperCase("es-ES") ?? "")
    .join("")
    .slice(0, 8);
  return initials || "Organismo";
}

function shortRelationLabel(
  relationType: DocumentRelationType,
  fallback: string,
): string {
  const labels: Readonly<Partial<Record<DocumentRelationType, string>>> = {
    RESOLVES: "Resuelve",
    REPLACES: "Sustituye",
    CORRECTS: "Corrige",
    CANCELS: "Anula",
    COMPENSATES: "Compensa",
    PAYMENT_EVIDENCE_FOR: "Paga",
    PAYS_REFUND: "Paga devolución",
    INITIATES_ENFORCEMENT: "Inicia apremio",
    ENFORCES: "Embarga",
    ORDERS_SEIZURE: "Embarga",
    TRANSFERS_SEIZED_FUNDS: "Ingresa",
    RELEASES_SEIZURE: "Levanta embargo",
    CREATES_PAYMENT_PLAN_FOR: "Crea plan de pago",
    MODIFIES_PAYMENT_PLAN: "Modifica acuerdo",
    CLAIMS_UNPAID_INSTALLMENT: "Incumple acuerdo",
    RECOGNIZES_REFUND: "Reconoce devolución",
    WITHHOLDS_REFUND: "Retiene devolución",
    APPEALS: "Recurre",
    CONTINUES: "Continúa",
    RESPONSE_TO: "Responde",
    NOTIFICATION_EVIDENCE_FOR: "Notifica",
    PUBLICATION_NOTIFIES: "Notifica",
  };
  return labels[relationType] ?? fallback;
}

function isVisibleLibraryRelationMatch(
  match: StructuredReviewRelationMatchV1,
): boolean {
  return (
    match.label.trim().length > 0 &&
    match.value.trim().length > 0 &&
    !containsInternalFiscalNotificationToken(match.label) &&
    !containsInternalFiscalNotificationToken(match.value) &&
    !containsInternalFiscalNotificationToken(match.issuer) &&
    !/\b(?:importe|total|principal|recargo|interes|interés|cuota|fecha|nombre|razon social|razón social)\b/iu.test(
      match.label,
    )
  );
}

function safeLibraryText(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 && !containsInternalFiscalNotificationToken(trimmed)
    ? trimmed
    : fallback;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}

function findRoot(parent: Map<string, string>, value: string): string {
  let root = value;
  while ((parent.get(root) ?? root) !== root) {
    root = parent.get(root)!;
  }
  let current = value;
  while ((parent.get(current) ?? current) !== root) {
    const next = parent.get(current)!;
    parent.set(current, root);
    current = next;
  }
  return root;
}

function union(
  parent: Map<string, string>,
  rank: Map<string, number>,
  left: string,
  right: string,
): void {
  const leftRoot = findRoot(parent, left);
  const rightRoot = findRoot(parent, right);
  if (leftRoot === rightRoot) return;
  const leftRank = rank.get(leftRoot) ?? 0;
  const rightRank = rank.get(rightRoot) ?? 0;
  if (leftRank < rightRank) {
    parent.set(leftRoot, rightRoot);
    return;
  }
  if (rightRank < leftRank) {
    parent.set(rightRoot, leftRoot);
    return;
  }
  const root = leftRoot.localeCompare(rightRoot) <= 0 ? leftRoot : rightRoot;
  const child = root === leftRoot ? rightRoot : leftRoot;
  parent.set(child, root);
  rank.set(root, leftRank + 1);
}
