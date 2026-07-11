import {
  assertDocumentSnapshotsIntegrity,
  deriveDocumentLifecycle,
  DocumentIntegrityError,
} from "@/lib/document-integrity";
import { profileForHistoricalDerivedDocument } from "@/lib/document-integrity/derived-issuance";
import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { buildCanonicalDocumentForProtectedEffect } from "@/lib/document-integrity/pdf-source";
import { withDocumentRelationshipIntegritySignals } from "@/lib/document-integrity/relationships";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
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

  const historicalProfile = profileForHistoricalDerivedDocument(
    verifiedSnapshot,
    currentProfile,
  );
  const validation = validateDocumentEmission(
    canonical,
    historicalProfile,
    "factura",
  );
  if (!validation.ok) {
    throw new DocumentIntegrityError(
      "RECTIFICATION_ORIGINAL_INVALID",
      `La factura original no cumple los requisitos fiscales para rectificarla. ${validation.message ?? "Revisa sus datos obligatorios."}`,
    );
  }

  return {
    original: canonical,
    profile: historicalProfile,
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

export function requireUniqueRectificationOriginal(
  documents: Document[],
  originalDocumentId: string,
): Document {
  const matchingOriginals = documents.filter(
    (candidate) => candidate.id === originalDocumentId,
  );
  if (matchingOriginals.length === 0) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_MISSING");
  }
  if (matchingOriginals.length !== 1) {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }

  const original = matchingOriginals[0];
  if (original.snapshotIntegrity?.status === "blocked") {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }

  return original;
}

export function profileForRectificationSource(
  document: Document,
  documents: Document[],
  currentProfile: BusinessProfile,
): BusinessProfile {
  const originalDocumentId = document.rectification?.originalDocumentId;
  if (!originalDocumentId) return currentProfile;

  const original = requireUniqueRectificationOriginal(
    documents,
    originalDocumentId,
  );
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

  const original = requireUniqueRectificationOriginal(
    documents,
    rectification.originalDocumentId,
  );

  if (original.id === document.id || original.type !== "factura") {
    throw new DocumentIntegrityError("RECTIFICATION_ORIGINAL_INVALID");
  }

  const hasReceiptEvidence = Boolean(
    original.receiptDocumentId ||
      documents.some(
        (candidate) =>
          (candidate.type === "recibo" ||
            candidate.documentSnapshot?.documentType === "recibo") &&
          (candidate.sourceDocumentId === original.id ||
            candidate.documentSnapshot?.sourceDocumentId === original.id),
      ),
  );
  if (hasReceiptEvidence) {
    throw new DocumentIntegrityError("RECTIFICATION_RECEIPT_CONFLICT");
  }

  const hasOtherIssuedRectificationClaim = documents.some((candidate) => {
    if (candidate.id === document.id) return false;
    const claimsOriginal =
      candidate.rectification?.originalDocumentId === original.id ||
      candidate.documentSnapshot?.rectification?.originalDocumentId ===
        original.id;
    return claimsOriginal && deriveDocumentLifecycle(candidate) !== "draft";
  });
  if (hasOtherIssuedRectificationClaim) {
    throw new DocumentIntegrityError("RECTIFICATION_CONFLICT");
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

  const relationshipChecked = withDocumentRelationshipIntegritySignals(documents);
  const checkedOriginal = relationshipChecked.find(
    (candidate) => candidate.id === original.id,
  );
  if (checkedOriginal?.snapshotIntegrity?.status === "blocked") {
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

  const original = requireUniqueRectificationOriginal(
    documents,
    current.rectification.originalDocumentId,
  );
  const canonical = resolveCanonicalRectificationSource(
    original,
    currentProfile,
  ).original;
  const rectification = canonicalRectificationReference(
    canonical,
    {
      ...(next.rectification ?? current.rectification),
      type: current.rectification.type,
    },
  );

  return {
    ...next,
    items:
      rectification.type === "anulacion"
        ? canonicalRectificationItems(canonical, next.items, "anulacion")
        : next.items,
    rectification,
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
