import { STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1 } from "./structured-review-relation-suggestions.v1";
import type {
  AdministrativeDocument,
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
  readonly title: "Documentos relacionados por referencia";
  readonly statusLabel: "Relación detectada · revisar";
  readonly documents: readonly [
    StructuredReviewRelationDocumentV1,
    StructuredReviewRelationDocumentV1,
  ];
  readonly matches: readonly StructuredReviewRelationMatchV1[];
  readonly explanation: string;
  readonly requiresHumanReview: true;
}

export type StructuredReviewRelationsViewModelV1 =
  | {
      readonly status: "READY";
      readonly entries: readonly StructuredReviewRelationEntryV1[];
    }
  | {
      readonly status: "BLOCKED";
      readonly entries: readonly [];
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
    return Object.freeze({ status: "READY", entries: Object.freeze([]) });
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    ownerScope,
  );
  if (!workspace) {
    return Object.freeze({
      status: "BLOCKED",
      entries: Object.freeze([]) as readonly [],
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
      relation.algorithmVersion !==
        STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1 ||
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
    entries.push(
      Object.freeze({
        key: relation.id,
        title: "Documentos relacionados por referencia" as const,
        statusLabel: "Relación detectada · revisar" as const,
        documents: Object.freeze([
          projectDocument(source),
          projectDocument(target),
        ]) as readonly [
          StructuredReviewRelationDocumentV1,
          StructuredReviewRelationDocumentV1,
        ],
        matches: Object.freeze(matches),
        explanation:
          "Las dos fichas comparten el mismo identificador administrativo. La coincidencia las vincula de forma objetiva, pero no demuestra por sí sola cuál originó a la otra, que exista un pago ni que el expediente esté cerrado.",
        requiresHumanReview: true as const,
      }),
    );
  }
  entries.sort((left, right) => {
    const leftDate = left.documents[1].createdAt;
    const rightDate = right.documents[1].createdAt;
    return rightDate.localeCompare(leftDate) || left.key.localeCompare(right.key);
  });
  return Object.freeze({
    status: "READY",
    entries: Object.freeze(entries),
  });
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
