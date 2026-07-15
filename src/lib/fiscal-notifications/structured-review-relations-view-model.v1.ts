import {
  STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
  STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
} from "./structured-review-relation-suggestions.v1";
import type {
  AdministrativeDocument,
  DocumentRelationType,
  ExternalReference,
  ExternalReferenceType,
} from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

export interface StructuredReviewRelationDocumentV1 {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
}

export interface StructuredReviewRelationMatchV1 {
  readonly label: string;
  readonly value: string;
  readonly issuer: string;
  readonly matchMode: "EXACT_PRINTED" | "NORMALIZED_FORMAT";
}

export interface StructuredReviewRelationEntryV1 {
  readonly key: string;
  readonly relationType: DocumentRelationType;
  readonly title: string;
  readonly statusLabel:
    | "Relación detectada · revisar"
    | "Referencia exacta · revisar efectos";
  readonly documents: readonly [
    StructuredReviewRelationDocumentV1,
    StructuredReviewRelationDocumentV1,
  ];
  readonly matches: readonly StructuredReviewRelationMatchV1[];
  readonly explanation: string;
  readonly requiresHumanReview: true;
}

export interface StructuredReviewCaseTimelineStepV1 {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly position: number;
}

export interface StructuredReviewCaseTimelineLinkV1 {
  readonly key: string;
  readonly earlierDocumentId: string;
  readonly laterDocumentId: string;
  readonly label: string;
  readonly explanation: string;
}

export interface StructuredReviewCaseTimelineV1 {
  readonly key: string;
  readonly title: string;
  readonly statusLabel: "Referencias exactas · efectos por revisar";
  readonly steps: readonly StructuredReviewCaseTimelineStepV1[];
  readonly links: readonly StructuredReviewCaseTimelineLinkV1[];
  readonly requiresHumanReview: true;
}

export type StructuredReviewRelationsViewModelV1 =
  | {
      readonly status: "READY";
      readonly entries: readonly StructuredReviewRelationEntryV1[];
      readonly timelines: readonly StructuredReviewCaseTimelineV1[];
    }
  | {
      readonly status: "BLOCKED";
      readonly entries: readonly [];
      readonly timelines: readonly [];
    };

const REFERENCE_LABELS: Readonly<Partial<Record<ExternalReferenceType, string>>> = {
  DOCUMENT_REFERENCE: "Referencia del documento",
  EXPEDIENT_NUMBER: "Número de expediente",
  LIQUIDATION_KEY: "Clave de liquidación",
  DEBT_KEY: "Clave de deuda",
  PROCEDURE_NUMBER: "Número de procedimiento",
  PAYMENT_JUSTIFICANTE: "Número de justificante",
  CSV: "Código Seguro de Verificación (CSV)",
  NOTIFICATION_ID: "Identificador de notificación",
  REQUEST_NUMBER: "Número de requerimiento",
  OFFICIAL_REGISTRY_NUMBER: "Número de registro oficial",
};

export function projectStructuredReviewRelationsV1(
  value: unknown,
  ownerScope: string,
): StructuredReviewRelationsViewModelV1 {
  if (value === undefined || value === null) {
    return Object.freeze({
      status: "READY",
      entries: Object.freeze([]),
      timelines: Object.freeze([]),
    });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    ownerScope,
  );
  if (!workspace) {
    return Object.freeze({
      status: "BLOCKED",
      entries: Object.freeze([]) as readonly [],
      timelines: Object.freeze([]) as readonly [],
    });
  }

  const documents = new Map(workspace.documents.map((item) => [item.id, item]));
  const referencesByDocument = new Map<string, ExternalReference[]>();
  for (const reference of workspace.references) {
    const list = referencesByDocument.get(reference.documentId) ?? [];
    list.push(reference);
    referencesByDocument.set(reference.documentId, list);
  }

  const entries: StructuredReviewRelationEntryV1[] = [];
  for (const relation of workspace.relations) {
    if (
      (
        relation.algorithmVersion !==
          STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1 &&
        relation.algorithmVersion !==
          STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1
      ) ||
      relation.status === "USER_REJECTED"
    ) {
      continue;
    }
    const source = documents.get(relation.sourceDocumentId);
    const target = documents.get(relation.targetDocumentId);
    if (!source || !target) continue;
    const matches = commonReferenceMatches(
      referencesByDocument.get(source.id) ?? [],
      referencesByDocument.get(target.id) ?? [],
      relation.evidence.matchingReferenceTypes,
    );
    if (matches.length === 0) continue;
    const presentation = relationPresentation(relation.relationType);
    entries.push(
      Object.freeze({
        key: relation.id,
        relationType: relation.relationType,
        title: presentation.title,
        statusLabel: presentation.statusLabel,
        documents: Object.freeze([
          projectDocument(source),
          projectDocument(target),
        ]) as readonly [
          StructuredReviewRelationDocumentV1,
          StructuredReviewRelationDocumentV1,
        ],
        matches: Object.freeze(matches),
        explanation: presentation.explanation,
        requiresHumanReview: true as const,
      }),
    );
  }
  entries.sort((left, right) => {
    const leftDate = left.documents[1].createdAt;
    const rightDate = right.documents[1].createdAt;
    return rightDate.localeCompare(leftDate) || left.key.localeCompare(right.key);
  });
  const timelines = buildCaseTimelines(entries);
  if (!timelines) {
    return Object.freeze({
      status: "BLOCKED",
      entries: Object.freeze([]) as readonly [],
      timelines: Object.freeze([]) as readonly [],
    });
  }
  return Object.freeze({
    status: "READY",
    entries: Object.freeze(entries),
    timelines,
  });
}

type ExactTimelineRelationTypeV1 =
  | "ENFORCES"
  | "RESPONDS_TO_SEIZURE"
  | "TRANSFERS_SEIZED_FUNDS"
  | "RELEASES_SEIZURE"
  | "CONTINUES";

interface TimelineEdgeV1 {
  readonly entry: StructuredReviewRelationEntryV1;
  readonly relationType: ExactTimelineRelationTypeV1;
  readonly earlierDocumentId: string;
  readonly laterDocumentId: string;
}

function buildCaseTimelines(
  entries: readonly StructuredReviewRelationEntryV1[],
): readonly StructuredReviewCaseTimelineV1[] | null {
  const edges = entries.flatMap((entry): TimelineEdgeV1[] =>
    isExactTimelineRelation(entry.relationType)
      ? [
          {
            entry,
            relationType: entry.relationType,
            earlierDocumentId: entry.documents[1].id,
            laterDocumentId: entry.documents[0].id,
          },
        ]
      : [],
  );
  if (edges.length === 0) return Object.freeze([]);

  const documents = new Map<string, StructuredReviewRelationDocumentV1>();
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();
  for (const edge of edges) {
    for (const document of edge.entry.documents) {
      documents.set(document.id, document);
      if (!parent.has(document.id)) {
        parent.set(document.id, document.id);
        rank.set(document.id, 0);
      }
    }
    union(parent, rank, edge.earlierDocumentId, edge.laterDocumentId);
  }

  const edgesByRoot = new Map<string, TimelineEdgeV1[]>();
  for (const edge of edges) {
    const root = findRoot(parent, edge.earlierDocumentId);
    const current = edgesByRoot.get(root) ?? [];
    current.push(edge);
    edgesByRoot.set(root, current);
  }

  const timelines: StructuredReviewCaseTimelineV1[] = [];
  for (const componentEdges of edgesByRoot.values()) {
    const documentIds = new Set<string>();
    const outgoing = new Map<string, TimelineEdgeV1[]>();
    const indegree = new Map<string, number>();
    for (const edge of componentEdges) {
      documentIds.add(edge.earlierDocumentId);
      documentIds.add(edge.laterDocumentId);
      outgoing.set(edge.earlierDocumentId, [
        ...(outgoing.get(edge.earlierDocumentId) ?? []),
        edge,
      ]);
      indegree.set(
        edge.laterDocumentId,
        (indegree.get(edge.laterDocumentId) ?? 0) + 1,
      );
      if (!indegree.has(edge.earlierDocumentId)) {
        indegree.set(edge.earlierDocumentId, 0);
      }
    }

    const ready = [...documentIds]
      .filter((id) => indegree.get(id) === 0)
      .sort((left, right) => compareTimelineDocuments(documents, left, right));
    const orderedIds: string[] = [];
    while (ready.length > 0) {
      const current = ready.shift()!;
      orderedIds.push(current);
      const nextEdges = [...(outgoing.get(current) ?? [])].sort((left, right) =>
        left.laterDocumentId.localeCompare(right.laterDocumentId),
      );
      for (const edge of nextEdges) {
        const nextIndegree = (indegree.get(edge.laterDocumentId) ?? 0) - 1;
        indegree.set(edge.laterDocumentId, nextIndegree);
        if (nextIndegree === 0) {
          ready.push(edge.laterDocumentId);
          ready.sort((left, right) =>
            compareTimelineDocuments(documents, left, right),
          );
        }
      }
    }
    if (orderedIds.length !== documentIds.size) return null;

    const steps = orderedIds.map((id, index) => {
      const document = documents.get(id)!;
      return Object.freeze({
        id,
        title: document.title,
        createdAt: document.createdAt,
        position: index + 1,
      });
    });
    const links = componentEdges
      .map((edge) =>
        Object.freeze({
          key: edge.entry.key,
          earlierDocumentId: edge.earlierDocumentId,
          laterDocumentId: edge.laterDocumentId,
          label: timelineLinkLabel(edge.relationType),
          explanation: edge.entry.explanation,
        }),
      )
      .sort((left, right) => left.key.localeCompare(right.key));
    timelines.push(
      Object.freeze({
        key: `timeline:${orderedIds.join(":")}`,
        title: `Expediente relacionado · ${steps.length} documentos`,
        statusLabel: "Referencias exactas · efectos por revisar" as const,
        steps: Object.freeze(steps),
        links: Object.freeze(links),
        requiresHumanReview: true as const,
      }),
    );
  }

  timelines.sort((left, right) => left.key.localeCompare(right.key));
  return Object.freeze(timelines);
}

function isExactTimelineRelation(
  relationType: DocumentRelationType,
): relationType is ExactTimelineRelationTypeV1 {
  return (
    relationType === "ENFORCES" ||
    relationType === "RESPONDS_TO_SEIZURE" ||
    relationType === "TRANSFERS_SEIZED_FUNDS" ||
    relationType === "RELEASES_SEIZURE" ||
    relationType === "CONTINUES"
  );
}

function timelineLinkLabel(relationType: ExactTimelineRelationTypeV1): string {
  switch (relationType) {
    case "ENFORCES":
      return "Ejecución mediante embargo";
    case "RESPONDS_TO_SEIZURE":
      return "Contestación a la diligencia";
    case "TRANSFERS_SEIZED_FUNDS":
      return "Ingreso del tercero retenedor";
    case "RELEASES_SEIZURE":
      return "Levantamiento de la diligencia";
    case "CONTINUES":
      return "Reiteración de la diligencia";
  }
}

function compareTimelineDocuments(
  documents: ReadonlyMap<string, StructuredReviewRelationDocumentV1>,
  leftId: string,
  rightId: string,
): number {
  const left = documents.get(leftId);
  const right = documents.get(rightId);
  return (
    (left?.createdAt ?? "").localeCompare(right?.createdAt ?? "") ||
    leftId.localeCompare(rightId)
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

function relationPresentation(relationType: DocumentRelationType): Readonly<{
  title: string;
  statusLabel:
    | "Relación detectada · revisar"
    | "Referencia exacta · revisar efectos";
  explanation: string;
}> {
  switch (relationType) {
    case "ENFORCES":
      return Object.freeze({
        title: "Embargo vinculado a providencia de apremio",
        statusLabel: "Referencia exacta · revisar efectos",
        explanation:
          "La diligencia de embargo y la providencia comparten una referencia administrativa exacta. Esto confirma el vínculo entre los documentos, pero no demuestra por sí solo que la deuda siga pendiente ni modifica ningún saldo.",
      });
    case "RESPONDS_TO_SEIZURE":
      return Object.freeze({
        title: "Contestación vinculada a diligencia de embargo",
        statusLabel: "Referencia exacta · revisar efectos",
        explanation:
          "La contestación del tercero cita la misma diligencia de embargo. Se conserva como respuesta documental; no convierte al tercero en deudor ni altera el estado del embargo.",
      });
    case "TRANSFERS_SEIZED_FUNDS":
      return Object.freeze({
        title: "Ingreso de tercero vinculado a diligencia de embargo",
        statusLabel: "Referencia exacta · revisar efectos",
        explanation:
          "El justificante de ingreso cita la misma diligencia. Registra un ingreso de tercero relacionado, pero no marca automáticamente la deuda como pagada ni recalcula el saldo pendiente.",
      });
    case "RELEASES_SEIZURE":
      return Object.freeze({
        title: "Levantamiento vinculado a diligencia de embargo",
        statusLabel: "Referencia exacta · revisar efectos",
        explanation:
          "El levantamiento cita la misma diligencia de embargo. El documento histórico se conserva y no se infiere automáticamente si el levantamiento es total, parcial o el estado vigente fuera de lo impreso.",
      });
    case "CONTINUES":
      return Object.freeze({
        title: "Reiteración vinculada a diligencia de embargo",
        statusLabel: "Referencia exacta · revisar efectos",
        explanation:
          "La reiteración cita la misma diligencia de embargo. Se muestra como continuación documental, pero no confirma por sí sola que la deuda o la traba sigan vigentes ni altera ningún saldo.",
      });
    default:
      return Object.freeze({
        title: "Documentos relacionados por referencia",
        statusLabel: "Relación detectada · revisar",
        explanation:
          "Las dos fichas comparten el mismo identificador administrativo. La coincidencia las vincula de forma objetiva, pero no demuestra por sí sola cuál originó a la otra, que exista un pago ni que el expediente esté cerrado.",
      });
  }
}

function commonReferenceMatches(
  source: readonly ExternalReference[],
  target: readonly ExternalReference[],
  allowedTypes: readonly ExternalReferenceType[],
): StructuredReviewRelationMatchV1[] {
  const allowed = new Set(allowedTypes);
  const targetByKey = new Map<string, ExternalReference>();
  for (const reference of target) {
    if (!isVisibleReference(reference, allowed)) continue;
    targetByKey.set(referenceKey(reference), reference);
  }
  const matches: StructuredReviewRelationMatchV1[] = [];
  const seen = new Set<string>();
  for (const reference of source) {
    if (!isVisibleReference(reference, allowed)) continue;
    const key = referenceKey(reference);
    if (seen.has(key)) continue;
    const other = targetByKey.get(key);
    if (!other) continue;
    seen.add(key);
    const exactPrinted = reference.rawValue === other.rawValue;
    matches.push(
      Object.freeze({
        label: REFERENCE_LABELS[reference.referenceType] ?? "Referencia",
        value: exactPrinted ? reference.rawValue : reference.normalizedValue,
        issuer: reference.issuer,
        matchMode: exactPrinted
          ? ("EXACT_PRINTED" as const)
          : ("NORMALIZED_FORMAT" as const),
      }),
    );
  }
  return matches.sort(
    (left, right) =>
      left.label.localeCompare(right.label) || left.value.localeCompare(right.value),
  );
}

function isVisibleReference(
  reference: ExternalReference,
  allowed: ReadonlySet<ExternalReferenceType>,
): boolean {
  return (
    allowed.has(reference.referenceType) &&
    reference.confirmationStatus !== "REJECTED" &&
    reference.confidence === "EXACT"
  );
}

function referenceKey(reference: ExternalReference): string {
  return JSON.stringify([
    reference.referenceType,
    reference.issuer,
    reference.normalizedValue,
  ]);
}

function projectDocument(
  document: AdministrativeDocument,
): StructuredReviewRelationDocumentV1 {
  return Object.freeze({
    id: document.id,
    title: document.titleRaw,
    createdAt: document.createdAt,
  });
}
