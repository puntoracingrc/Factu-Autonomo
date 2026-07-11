import type {
  Document,
  DocumentSnapshotIntegrityIssue,
  RectificationInfo,
} from "@/lib/types";
import { inspectDocumentSnapshotsIntegrity } from "./snapshots";

function normalizedNif(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

function verifiedRectification(document: Document): RectificationInfo | null {
  const integrity = inspectDocumentSnapshotsIntegrity(document, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  if (!integrity.ok) return null;
  const snapshot = document.documentSnapshot;
  if (
    snapshot?.documentType !== "factura" ||
    snapshot.documentKind !== "factura_rectificativa" ||
    !snapshot.rectification
  ) {
    return null;
  }
  return snapshot.rectification;
}

function isIssuedRectification(document: Document): boolean {
  if (!document.rectification && !document.documentSnapshot?.rectification) {
    return false;
  }
  return Boolean(
    document.status !== "borrador" ||
      document.documentLifecycle === "issued" ||
      document.documentLifecycle === "canceled" ||
      document.issuedAt ||
      document.documentSnapshot ||
      document.snapshotIntegrityRequired,
  );
}

function hasVerifiedOriginalEvidence(document: Document): boolean {
  const integrity = inspectDocumentSnapshotsIntegrity(document, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  const snapshot = document.documentSnapshot;
  return Boolean(
    integrity.ok &&
      snapshot?.documentType === "factura" &&
      snapshot.documentKind === "factura" &&
      !snapshot.rectification,
  );
}

function relationshipMatches(
  original: Document,
  rectification: Document,
  relation: RectificationInfo,
): boolean {
  const originalSnapshot = original.documentSnapshot!;
  const rectificationSnapshot = rectification.documentSnapshot!;
  const expectedStatus =
    relation.type === "anulacion" ? "anulada" : "rectificada";

  return Boolean(
    hasVerifiedOriginalEvidence(original) &&
      original.rectifiedById === rectification.id &&
      original.status === expectedStatus &&
      relation.originalDocumentId === original.id &&
      relation.originalNumber === originalSnapshot.number &&
      relation.originalDate === originalSnapshot.date &&
      rectificationSnapshot.date >= originalSnapshot.date &&
      normalizedNif(rectificationSnapshot.issuer.nif) ===
        normalizedNif(originalSnapshot.issuer.nif)
  );
}

function blockRelationship(document: Document): Document {
  const issue: DocumentSnapshotIntegrityIssue =
    "document_relationship_invalid";
  const issues = new Set(document.snapshotIntegrity?.issues ?? []);
  issues.add(issue);
  return {
    ...document,
    snapshotIntegrity: {
      status: "blocked",
      issues: [...issues],
    },
  };
}

/**
 * Valida el grafo operativo que no cabe dentro del snapshot individual.
 * Un estado `anulada/rectificada` solo es fiscalmente utilizable si existe una
 * rectificativa sellada, bidireccional y del mismo emisor.
 */
export function withDocumentRelationshipIntegritySignals(
  documents: Document[],
): Document[] {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const invalidIds = new Set<string>();
  const issuedByOriginal = new Map<string, Document[]>();

  for (const document of documents) {
    if (!isIssuedRectification(document)) continue;
    const relation = verifiedRectification(document);
    if (!relation) {
      invalidIds.add(document.id);
      continue;
    }
    const related = issuedByOriginal.get(relation.originalDocumentId) ?? [];
    related.push(document);
    issuedByOriginal.set(relation.originalDocumentId, related);
  }

  for (const [originalId, rectifications] of issuedByOriginal) {
    const original = byId.get(originalId);
    if (!original || rectifications.length !== 1) {
      if (original) invalidIds.add(original.id);
      for (const rectification of rectifications) {
        invalidIds.add(rectification.id);
      }
      continue;
    }

    const rectification = rectifications[0];
    const relation = verifiedRectification(rectification)!;
    if (!relationshipMatches(original, rectification, relation)) {
      invalidIds.add(original.id);
      invalidIds.add(rectification.id);
    }
  }

  for (const document of documents) {
    const claimsRectifiedState =
      document.status === "anulada" ||
      document.status === "rectificada" ||
      Boolean(document.rectifiedById);
    if (!claimsRectifiedState) continue;
    if (!document.rectifiedById) {
      invalidIds.add(document.id);
      continue;
    }
    const rectification = byId.get(document.rectifiedById);
    const relation = rectification
      ? verifiedRectification(rectification)
      : null;
    if (
      !rectification ||
      !relation ||
      !relationshipMatches(document, rectification, relation)
    ) {
      invalidIds.add(document.id);
      if (rectification) invalidIds.add(rectification.id);
    }
  }

  if (invalidIds.size === 0) return documents;
  return documents.map((document) =>
    invalidIds.has(document.id) ? blockRelationship(document) : document,
  );
}
