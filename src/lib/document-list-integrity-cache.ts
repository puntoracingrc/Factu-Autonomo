import { selectCanonicalFiscalDocumentsForExport } from "./billing/fiscal-export-documents";
import {
  inspectAppIssuedDocumentRecoveryCollection,
  type AppIssuedDocumentRecoveryCollectionInspection,
} from "./document-integrity/app-issued-recovery";
import {
  readPersistedInvoiceIntegritySnapshot,
  type PersistedInvoiceIntegritySnapshot,
} from "./persisted-app-derived-cache";
import type { BusinessProfile, Document } from "./types";

export interface InvoiceListIntegrityInspection {
  blockedDocumentIds: ReadonlySet<string>;
  recovery: AppIssuedDocumentRecoveryCollectionInspection;
}

const cache = new WeakMap<
  readonly Document[],
  WeakMap<BusinessProfile, InvoiceListIntegrityInspection>
>();

function knownIdSet(
  ids: readonly string[],
  knownIds: ReadonlySet<string>,
): Set<string> | null {
  const result = new Set<string>();
  for (const id of ids) {
    if (!knownIds.has(id) || result.has(id)) return null;
    result.add(id);
  }
  return result;
}

function inspectionFromPersistedSnapshot(
  documents: readonly Document[],
  snapshot: PersistedInvoiceIntegritySnapshot,
): InvoiceListIntegrityInspection | null {
  const knownIds = new Set(documents.map((document) => document.id));
  if (knownIds.size !== documents.length) return null;
  const blockedDocumentIds = knownIdSet(
    snapshot.blockedDocumentIds,
    knownIds,
  );
  const claimedDocumentIds = knownIdSet(
    snapshot.claimedDocumentIds,
    knownIds,
  );
  const validDocumentIds = knownIdSet(snapshot.validDocumentIds, knownIds);
  if (!blockedDocumentIds || !claimedDocumentIds || !validDocumentIds) {
    return null;
  }
  if ([...validDocumentIds].some((id) => !claimedDocumentIds.has(id))) {
    return null;
  }

  const issuesByDocumentId = new Map();
  for (const [documentId, issues] of snapshot.issuesByDocumentId) {
    if (!knownIds.has(documentId) || issuesByDocumentId.has(documentId)) {
      return null;
    }
    issuesByDocumentId.set(documentId, [...issues]);
  }

  return {
    blockedDocumentIds,
    recovery: {
      claimedDocumentIds,
      validDocumentIds,
      issuesByDocumentId,
    },
  };
}

export function inspectInvoiceListIntegrity(
  documents: readonly Document[],
  profile: BusinessProfile,
): InvoiceListIntegrityInspection {
  const cached = cache.get(documents)?.get(profile);
  if (cached) return cached;

  const persisted = readPersistedInvoiceIntegritySnapshot(documents, profile);
  const inspection =
    (persisted && inspectionFromPersistedSnapshot(documents, persisted)) ||
    ({
      blockedDocumentIds: new Set(
        selectCanonicalFiscalDocumentsForExport(
          [...documents],
          profile,
          () => true,
        ).blockedDocuments.map((document) => document.id),
      ),
      recovery: inspectAppIssuedDocumentRecoveryCollection(documents),
    } satisfies InvoiceListIntegrityInspection);
  let byProfile = cache.get(documents);
  if (!byProfile) {
    byProfile = new WeakMap();
    cache.set(documents, byProfile);
  }
  byProfile.set(profile, inspection);
  return inspection;
}
