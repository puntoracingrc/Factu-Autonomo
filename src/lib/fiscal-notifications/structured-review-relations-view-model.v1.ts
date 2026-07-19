import {
  STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
  STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
  STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
} from "./structured-review-relation-suggestions.v1";
import { GLOBAL_RECONCILIATION_RULE_VERSION_V8 } from "./global-reconciliation.v8";
import {
  FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2,
  type FiscalNotificationDocumentChainIdV2,
} from "./document-chain-rules.v2";
import {
  FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
  FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
  explainFiscalNotificationRelationV2,
  isFiscalNotificationExplanationRelationTypeV2,
} from "./relation-explanation.v2";
import type {
  AdministrativeDocument,
  DocumentRelationType,
  GlobalReconciliationRelationTypeV8,
  ExternalReference,
  ExternalReferenceType,
} from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import { selectExplicitDocumentDate } from "./structured-review-history-view-model.v1";
import type { FiscalNotificationsWorkspace } from "./types";

export interface StructuredReviewRelationDocumentV1 {
  readonly id: string;
  readonly title: string;
  readonly chronologyDate: string | null;
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
  readonly chainId?: FiscalNotificationDocumentChainIdV2 | null;
  readonly algorithmVersion?: string;
  readonly relationStatus?:
    | "SUGGESTED"
    | "USER_CONFIRMED"
    | "SYSTEM_CONFIRMED_EXACT";
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
  NRC: "Número de Referencia Completo (NRC)",
  NOTIFICATION_ID: "Identificador de notificación",
  REQUEST_NUMBER: "Número de requerimiento",
  REFUND_REFERENCE: "Referencia de devolución",
  OFFICIAL_REGISTRY_NUMBER: "Número de registro oficial",
};
const PROTECTED_REFERENCE_TYPES = new Set<ExternalReferenceType>([
  "CSV",
  "NRC",
  "VEHICLE_OR_FINE_REFERENCE",
]);
const PROTECTED_REFERENCE_FINGERPRINT = /^[0-9a-f]{64}$/u;

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
          STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1 &&
        relation.algorithmVersion !==
          STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2 &&
        relation.algorithmVersion !== GLOBAL_RECONCILIATION_RULE_VERSION_V8
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
    const presentation = relationPresentation({
      relationType: relation.relationType,
      status: relation.status,
      algorithmVersion: relation.algorithmVersion,
      chainId: relation.evidence.chainId ?? null,
      globalRelationType:
        relation.reconciliationHistory?.at(-1)?.globalRelationType ?? null,
      globalExplanation: relation.evidence.citedText ?? null,
    });
    entries.push(
      Object.freeze({
        key: relation.id,
        chainId: relation.evidence.chainId ?? null,
        algorithmVersion: relation.algorithmVersion,
        relationStatus: relation.status,
        relationType: relation.relationType,
        title: presentation.title,
        statusLabel: presentation.statusLabel,
        documents: Object.freeze([
          projectDocument(source, workspace),
          projectDocument(target, workspace),
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
    const leftDate = left.documents[1].chronologyDate ?? "";
    const rightDate = right.documents[1].chronologyDate ?? "";
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

type LegacyExactTimelineRelationTypeV1 =
  | "ENFORCES"
  | "RESPONDS_TO_SEIZURE"
  | "TRANSFERS_SEIZED_FUNDS"
  | "RELEASES_SEIZURE";

interface TimelineEdgeV1 {
  readonly entry: StructuredReviewRelationEntryV1;
  readonly relationType: DocumentRelationType;
  readonly earlierDocumentId: string;
  readonly laterDocumentId: string;
}

function buildCaseTimelines(
  entries: readonly StructuredReviewRelationEntryV1[],
): readonly StructuredReviewCaseTimelineV1[] | null {
  const edges = entries.flatMap((entry): TimelineEdgeV1[] =>
    isExactTimelineRelation(entry)
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
          label: timelineLinkLabel(edge.entry),
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
  entry: StructuredReviewRelationEntryV1,
): boolean {
  if (
    entry.algorithmVersion === GLOBAL_RECONCILIATION_RULE_VERSION_V8 &&
    entry.relationStatus === "SYSTEM_CONFIRMED_EXACT"
  ) {
    return true;
  }
  if (
    entry.algorithmVersion ===
      STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2 &&
    entry.chainId !== null &&
    entry.chainId !== undefined &&
    entry.relationStatus === "SYSTEM_CONFIRMED_EXACT"
  ) {
    return true;
  }
  const relationType = entry.relationType;
  return (
    relationType === "ENFORCES" ||
    relationType === "RESPONDS_TO_SEIZURE" ||
    relationType === "TRANSFERS_SEIZED_FUNDS" ||
    relationType === "RELEASES_SEIZURE"
  );
}

function timelineLinkLabel(entry: StructuredReviewRelationEntryV1): string {
  if (entry.algorithmVersion === GLOBAL_RECONCILIATION_RULE_VERSION_V8) {
    return "Vínculo documental exacto";
  }
  if (
    entry.algorithmVersion ===
      STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2 &&
    isFiscalNotificationExplanationRelationTypeV2(entry.relationType)
  ) {
    return "Vínculo documental exacto";
  }
  return legacyTimelineLinkLabel(
    entry.relationType as LegacyExactTimelineRelationTypeV1,
  );
}

function legacyTimelineLinkLabel(
  relationType: LegacyExactTimelineRelationTypeV1,
): string {
  switch (relationType) {
    case "ENFORCES":
      return "Ejecución mediante embargo";
    case "RESPONDS_TO_SEIZURE":
      return "Contestación a la diligencia";
    case "TRANSFERS_SEIZED_FUNDS":
      return "Ingreso del tercero retenedor";
    case "RELEASES_SEIZURE":
      return "Levantamiento de la diligencia";
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
    (left?.chronologyDate ?? "").localeCompare(
      right?.chronologyDate ?? "",
    ) ||
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

function relationPresentation(input: Readonly<{
  relationType: DocumentRelationType;
  status: "SUGGESTED" | "USER_CONFIRMED" | "SYSTEM_CONFIRMED_EXACT";
  algorithmVersion: string;
  chainId: FiscalNotificationDocumentChainIdV2 | null;
  globalRelationType: GlobalReconciliationRelationTypeV8 | null;
  globalExplanation: string | null;
}>): Readonly<{
  title: string;
  statusLabel:
    | "Relación detectada · revisar"
    | "Referencia exacta · revisar efectos";
  explanation: string;
}> {
  if (
    input.algorithmVersion === GLOBAL_RECONCILIATION_RULE_VERSION_V8 &&
    input.globalRelationType
  ) {
    const titles: Readonly<Record<GlobalReconciliationRelationTypeV8, string>> = {
      RESOLUTION_ENFORCED: "Liquidación y providencia relacionadas",
      ENFORCES_REMAINING_PLAN_PRINCIPAL:
        "Plan y cobro del principal restante relacionados",
      ENFORCES: "Providencia y embargo relacionados",
      CITED_AS_EXISTING_EXECUTIVE_DEBT:
        "Deuda ejecutiva citada en la denegación",
      OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN:
        "Compensación aplicada al plan modificado",
      RELEASES_SEIZURE: "Embargo y levantamiento relacionados",
      RELEASED_ASSET_LATER_RESEIZED:
        "Bien liberado y embargado de nuevo",
      POSSIBLY_PRECEDES_ASSESSMENT:
        "Posible antecedente informativo de la comprobación",
      NOTIFICATION_EVIDENCE_FOR: "Acto y justificante de notificación relacionados",
    };
    return Object.freeze({
      title: titles[input.globalRelationType],
      statusLabel:
        input.status === "SYSTEM_CONFIRMED_EXACT"
          ? ("Referencia exacta · revisar efectos" as const)
          : ("Relación detectada · revisar" as const),
      explanation:
        input.globalExplanation ??
        (input.status === "SUGGESTED"
          ? FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2
          : FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2),
    });
  }
  if (
    input.algorithmVersion ===
      STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2 &&
    isFiscalNotificationExplanationRelationTypeV2(input.relationType)
  ) {
    const explanation = explainFiscalNotificationRelationV2({
      relationType: input.relationType,
      status: input.status,
      exactReferenceConfirmed: input.status === "SYSTEM_CONFIRMED_EXACT",
      userConfirmed: input.status === "USER_CONFIRMED",
      printedEffectProven: false,
    });
    const chain = FISCAL_NOTIFICATION_DOCUMENT_CHAINS_V2.find(
      (candidate) => candidate.id === input.chainId,
    );
    return Object.freeze({
      title: chain?.description ?? "Documentos relacionados por referencia",
      statusLabel:
        input.status === "SYSTEM_CONFIRMED_EXACT"
          ? ("Referencia exacta · revisar efectos" as const)
          : ("Relación detectada · revisar" as const),
      explanation: explanation.phrase,
    });
  }

  const relationType = input.relationType;
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
    default:
      return Object.freeze({
        title: "Documentos relacionados por referencia",
        statusLabel:
          input.status === "SYSTEM_CONFIRMED_EXACT"
            ? "Referencia exacta · revisar efectos"
            : "Relación detectada · revisar",
        explanation:
          input.status === "SUGGESTED"
            ? FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2
            : FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
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
    const protectedValue =
      isProtectedReference(reference) || isProtectedReference(other);
    const exactPrinted = reference.rawValue === other.rawValue;
    matches.push(
      Object.freeze({
        label:
          protectedValue && reference.referenceType === "PAYMENT_JUSTIFICANTE"
            ? "Referencia bancaria"
            : REFERENCE_LABELS[reference.referenceType] ?? "Referencia",
        value: protectedValue
          ? "Referencia protegida"
          : exactPrinted
            ? reference.rawValue
            : reference.normalizedValue,
        issuer: reference.issuer,
        matchMode: exactPrinted && !protectedValue
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

function isProtectedReference(reference: ExternalReference): boolean {
  return (
    PROTECTED_REFERENCE_TYPES.has(reference.referenceType) ||
    PROTECTED_REFERENCE_FINGERPRINT.test(reference.rawValue) ||
    PROTECTED_REFERENCE_FINGERPRINT.test(reference.normalizedValue)
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
  workspace: FiscalNotificationsWorkspace,
): StructuredReviewRelationDocumentV1 {
  const snapshot = document.analysisSnapshotIds
    .map((id) => workspace.analysisSnapshots.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .sort((left, right) => right.version - left.version)[0];
  const selectedDate = selectExplicitDocumentDate({
    documentIssueDate: document.issueDate,
    documentSignatureDate: document.signatureDate,
    documentEffectiveNotificationDate:
      document.notificationDates.effectiveAt?.slice(0, 10) ??
      document.notificationDates.accessedAt?.slice(0, 10),
    snapshotIssueDate: snapshot?.structuredData.documentFields.issueDate,
    snapshotEffectiveNotificationDate:
      snapshot?.structuredData.documentFields.effectiveNotificationDate,
    unknownFields: snapshot?.structuredData.unknownFields ?? [],
  });
  return Object.freeze({
    id: document.id,
    title: document.titleRaw,
    chronologyDate: selectedDate?.value ?? null,
    createdAt: document.createdAt,
  });
}
