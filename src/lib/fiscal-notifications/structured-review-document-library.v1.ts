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

export interface FiscalNotificationDocumentLibraryLinkV1 {
  readonly key: string;
  readonly fromDocumentId: string;
  readonly toDocumentId: string;
  readonly label: string;
  readonly explanation: string;
  readonly matches: readonly StructuredReviewRelationMatchV1[];
  readonly relationStatus:
    | "SUGGESTED"
    | "USER_CONFIRMED"
    | "SYSTEM_CONFIRMED_EXACT";
  readonly statusLabel:
    | "Relación detectada · revisar"
    | "Referencia exacta · revisar efectos";
  readonly directionSource: "EXACT_PROCEDURAL_RELATION" | "DOCUMENT_DATE_ORDER";
}

export interface FiscalNotificationDocumentLibraryGroupV1 {
  readonly key: string;
  readonly documents: readonly FiscalNotificationStructuredHistoryEntryV1[];
  readonly links: readonly FiscalNotificationDocumentLibraryLinkV1[];
  readonly firstDocumentChronologyKey: string;
  readonly latestDocumentChronologyKey: string;
}

export type FiscalNotificationDocumentLibraryViewModelV1 =
  | {
      readonly status: "READY";
      readonly documents: readonly FiscalNotificationStructuredHistoryEntryV1[];
      readonly groups: readonly FiscalNotificationDocumentLibraryGroupV1[];
    }
  | {
      readonly status: "BLOCKED";
      readonly documents: readonly [];
      readonly groups: readonly [];
    };

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
    const ordered = [sourceDocument, targetDocument].sort((left, right) =>
      compareDocuments(left, right, timelinePosition),
    );
    const link = Object.freeze({
      key: relation.key,
      fromDocumentId: exact?.earlierDocumentId ?? ordered[0]!.key,
      toDocumentId: exact?.laterDocumentId ?? ordered[1]!.key,
      label: exact?.label ?? relation.title,
      explanation: relation.explanation,
      matches: Object.freeze([...relation.matches]),
      relationStatus:
        relation.relationStatus ??
        (relation.statusLabel === "Relación detectada · revisar"
          ? ("SUGGESTED" as const)
          : ("SYSTEM_CONFIRMED_EXACT" as const)),
      statusLabel: relation.statusLabel,
      directionSource: exact
        ? ("EXACT_PROCEDURAL_RELATION" as const)
        : ("DOCUMENT_DATE_ORDER" as const),
    });
    const root = findRoot(parent, source.id);
    linksByRoot.set(root, [...(linksByRoot.get(root) ?? []), link]);
  }

  const groups = [...documentsByRoot.entries()].map(([root, entries]) => {
    const orderedDocuments = [...entries].sort((left, right) =>
      compareDocuments(left, right, timelinePosition),
    );
    const links = [...(linksByRoot.get(root) ?? [])].sort((left, right) => {
      const leftIndex = orderedDocuments.findIndex(
        (document) => document.key === left.fromDocumentId,
      );
      const rightIndex = orderedDocuments.findIndex(
        (document) => document.key === right.fromDocumentId,
      );
      return leftIndex - rightIndex || left.key.localeCompare(right.key);
    });
    const datedKeys = orderedDocuments
      .map(documentChronologyKey)
      .filter((value) => value.length > 0)
      .sort();
    return Object.freeze({
      key: `document-group:${orderedDocuments.map((item) => item.key).join("|")}`,
      documents: Object.freeze(orderedDocuments),
      links: Object.freeze(links),
      firstDocumentChronologyKey: datedKeys[0] ?? "",
      latestDocumentChronologyKey: datedKeys.at(-1) ?? "",
    });
  });

  groups.sort(
    (left, right) =>
      right.firstDocumentChronologyKey.localeCompare(
        left.firstDocumentChronologyKey,
      ) || left.key.localeCompare(right.key),
  );

  return Object.freeze({
    status: "READY",
    documents: Object.freeze([...history.entries]),
    groups: Object.freeze(groups),
  });
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

  const leftPosition = timelinePosition.get(left.key);
  const rightPosition = timelinePosition.get(right.key);
  if (leftPosition !== undefined && rightPosition !== undefined) {
    const positionOrder = leftPosition - rightPosition;
    if (positionOrder !== 0) return positionOrder;
  }

  if (left.documentDate && !right.documentDate) return -1;
  if (!left.documentDate && right.documentDate) return 1;

  return (
    documentChronologyKey(left).localeCompare(documentChronologyKey(right)) ||
    left.key.localeCompare(right.key)
  );
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
