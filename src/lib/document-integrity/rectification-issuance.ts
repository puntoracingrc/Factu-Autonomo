import {
  assertDocumentSnapshotsIntegrity,
  DocumentIntegrityError,
} from "@/lib/document-integrity";
import { profileForHistoricalDerivedDocument } from "@/lib/document-integrity/derived-issuance";
import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { buildCanonicalDocumentForProtectedEffect } from "@/lib/document-integrity/pdf-source";
import {
  cloneItemsForCorreccion,
  itemsForAnulacion,
} from "@/lib/rectificativas";
import type {
  BusinessProfile,
  Document,
  DocumentSnapshot,
  LineItem,
  RectificationInfo,
  RectificationType,
} from "@/lib/types";

export interface CanonicalRectificationSource {
  original: Document;
  profile: BusinessProfile;
}

export function verifiedRectificationOriginalSnapshot(
  original: Document,
): DocumentSnapshot {
  assertDocumentSnapshotsIntegrity(original, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  const snapshot = original.documentSnapshot!;
  if (
    snapshot.documentType !== "factura" ||
    snapshot.documentKind !== "factura" ||
    snapshot.rectification
  ) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }
  return snapshot;
}

export function resolveCanonicalRectificationSource(
  original: Document,
  currentProfile: BusinessProfile,
): CanonicalRectificationSource {
  const verifiedSnapshot = verifiedRectificationOriginalSnapshot(original);
  const canonical = buildCanonicalDocumentForProtectedEffect(
    original,
    currentProfile,
  );
  if (canonical.type !== "factura" || canonical.rectification) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }

  return {
    original: canonical,
    profile: profileForHistoricalDerivedDocument(
      verifiedSnapshot,
      currentProfile,
    ),
  };
}

export function canonicalRectificationReference(
  original: Document,
  requested: RectificationInfo,
): RectificationInfo {
  return {
    ...requested,
    originalDocumentId: original.id,
    originalNumber: original.number,
    originalDate: original.date,
  };
}

export function canonicalRectificationItems(
  original: Document,
  requestedItems: LineItem[],
  type: RectificationType,
): LineItem[] {
  return type === "anulacion"
    ? itemsForAnulacion(original.items)
    : cloneItemsForCorreccion(requestedItems);
}

export function profileForRectificationSource(
  document: Document,
  documents: Document[],
  currentProfile: BusinessProfile,
): BusinessProfile {
  const originalDocumentId = document.rectification?.originalDocumentId;
  if (!originalDocumentId) return currentProfile;

  const original = documents.find(
    (candidate) => candidate.id === originalDocumentId,
  );
  if (!original) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_MISSING");
  }
  return resolveCanonicalRectificationSource(original, currentProfile).profile;
}

export function hasPendingRectificationDraft(
  documents: Document[],
  originalDocumentId: string,
): boolean {
  return documents.some(
    (candidate) =>
      candidate.status === "borrador" &&
      candidate.rectification?.originalDocumentId === originalDocumentId,
  );
}

export function assertRectificationEmissionAllowed(
  document: Document,
  documents: Document[],
): void {
  const rectification = document.rectification;
  if (!rectification) return;

  const original = documents.find(
    (candidate) => candidate.id === rectification.originalDocumentId,
  );
  if (!original) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_MISSING");
  }

  if (original.id === document.id || original.type !== "factura") {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }

  if (original.rectifiedById && original.rectifiedById !== document.id) {
    throw new DocumentIntegrityError("RECTIFICATION_CONFLICT");
  }

  const alreadyLinkedToThisRectification =
    original.rectifiedById === document.id;
  if (
    !alreadyLinkedToThisRectification &&
    (original.status === "borrador" ||
      original.status === "anulada" ||
      original.status === "rectificada")
  ) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }

  const originalSnapshot = verifiedRectificationOriginalSnapshot(original);
  if (document.date < originalSnapshot.date) {
    throw new DocumentIntegrityError("RECTIFICATION_DATE_INVALID");
  }
}

export function preserveRectificationOriginalReference(
  current: Document,
  next: Document,
  documents: Document[],
  currentProfile: BusinessProfile,
): Document {
  if (!current.rectification) return next;

  const original = documents.find(
    (candidate) =>
      candidate.id === current.rectification!.originalDocumentId,
  );
  if (!original) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_MISSING");
  }
  const canonical = resolveCanonicalRectificationSource(
    original,
    currentProfile,
  ).original;

  return {
    ...next,
    rectification: canonicalRectificationReference(
      canonical,
      next.rectification ?? current.rectification,
    ),
  };
}

/**
 * Materializa una rectificativa nueva con las mismas garantías de integridad
 * que cualquier otra factura: los borradores quedan editables y las emisiones
 * salen con emisor, snapshots y bloqueo documental en una única operación.
 */
export function materializeRectificationDocument(
  source: Document,
  profile: BusinessProfile,
  createdAt: Date | string = new Date(),
): Document {
  if (!source.rectification) {
    throw new Error("RECTIFICATION_INFO_REQUIRED");
  }

  const timestamp =
    typeof createdAt === "string" ? createdAt : createdAt.toISOString();
  const requestedStatus = source.status;
  const draft: Document = {
    ...source,
    status: "borrador",
    issuer: undefined,
    verifactu: undefined,
    documentSnapshot: undefined,
    pdfSnapshot: undefined,
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    deliveryStatus: undefined,
    paymentStatus: undefined,
    acceptanceStatus: undefined,
    issuedAt: undefined,
    sentAt: undefined,
    paidAt: undefined,
    acceptedAt: undefined,
    createdAt: source.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (requestedStatus === "borrador") return draft;

  return issueDraftDocumentWithStatus(
    draft,
    requestedStatus,
    profile,
    timestamp,
  );
}
