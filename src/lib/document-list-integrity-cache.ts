import { selectCanonicalFiscalDocumentsForExport } from "./billing/fiscal-export-documents";
import {
  inspectAppIssuedDocumentRecoveryCollection,
  type AppIssuedDocumentRecoveryCollectionInspection,
} from "./document-integrity/app-issued-recovery";
import type { BusinessProfile, Document } from "./types";

export interface InvoiceListIntegrityInspection {
  blockedDocumentIds: ReadonlySet<string>;
  recovery: AppIssuedDocumentRecoveryCollectionInspection;
}

const cache = new WeakMap<
  readonly Document[],
  WeakMap<BusinessProfile, InvoiceListIntegrityInspection>
>();

export function inspectInvoiceListIntegrity(
  documents: readonly Document[],
  profile: BusinessProfile,
): InvoiceListIntegrityInspection {
  const cached = cache.get(documents)?.get(profile);
  if (cached) return cached;

  const inspection: InvoiceListIntegrityInspection = {
    blockedDocumentIds: new Set(
      selectCanonicalFiscalDocumentsForExport(
        [...documents],
        profile,
        () => true,
      ).blockedDocuments.map((document) => document.id),
    ),
    recovery: inspectAppIssuedDocumentRecoveryCollection(documents),
  };
  let byProfile = cache.get(documents);
  if (!byProfile) {
    byProfile = new WeakMap();
    cache.set(documents, byProfile);
  }
  byProfile.set(profile, inspection);
  return inspection;
}
