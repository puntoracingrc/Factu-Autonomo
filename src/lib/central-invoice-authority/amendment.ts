import { profileForHistoricalDerivedDocument } from "@/lib/document-integrity/derived-issuance";
import {
  assertDocumentSnapshotsIntegrity, buildDocumentSnapshot,
  buildDocumentPdfSnapshot, buildDocumentSnapshotSeal,
  projectCanonicalSnapshotOntoDocument, withDocumentSnapshotIntegritySignal,
} from "@/lib/document-integrity/snapshots";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
import type { BusinessProfile, Document, DocumentSnapshot } from "@/lib/types";

export type InvoiceAmendmentPatch = Pick<Document,
  "date" | "dueDate" | "customerId" | "client" | "items" | "notes" | "salesTerms" | "paymentTerms"
>;

export function invoiceAmendmentPatch(doc: Document): InvoiceAmendmentPatch {
  return {
    date: doc.date, dueDate: doc.dueDate, customerId: doc.customerId,
    client: doc.client, items: doc.items, notes: doc.notes,
    salesTerms: doc.salesTerms, paymentTerms: doc.paymentTerms,
  };
}

/** Called with canonical server data, never with a client-supplied issuer/number. */
export function buildAmendedCentralInvoice(input: {
  current: Document; originalSnapshot: DocumentSnapshot;
  profile: BusinessProfile; patch: InvoiceAmendmentPatch;
  fiscalYear: number; issuedAt: string; now: string;
}): Document {
  const { current, originalSnapshot, patch } = input;
  if (current.type !== "factura" || current.rectification || current.rectifiedById ||
      current.status === "borrador" || current.status === "rectificada" || current.status === "anulada" ||
      current.legacyImportAttestation || current.appIssuedRecoveryAttestation ||
      (current.verifactu && (current.verifactu.environment === "production" || current.verifactu.status === "registered"))) {
    throw new Error("Esta factura no admite una corrección ordinaria central.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.date) ||
      !Number.isFinite(Date.parse(patch.date)) || Number(patch.date.slice(0, 4)) !== input.fiscalYear) {
    throw new Error("La fecha debe pertenecer al ejercicio de esta factura; no se cambia su serie ni su número.");
  }
  if (current.documentSnapshot || current.pdfSnapshot || current.snapshotSeal) {
    assertDocumentSnapshotsIntegrity(current, {
      requireDocumentSnapshot: true, requirePdfSnapshot: true, requireSnapshotSeal: true,
    });
  }
  const profile = profileForHistoricalDerivedDocument(originalSnapshot, {
    ...input.profile, nif: originalSnapshot.issuer.nif,
  });
  // Delivery and payment are independent of correcting the document content.
  const next: Document = {
    ...current, ...patch, issuer: originalSnapshot.issuer,
    issuedAt: current.issuedAt ?? input.issuedAt, updatedAt: input.now,
    documentLifecycle: "issued", integrityLock: "locked",
  };
  // A local TEST artefact cannot attest the amended content. No external
  // registration is changed or represented as a new registration here.
  delete next.verifactu;
  delete next.verifactuPersistence;
  delete next.centralInvoiceAuthority;
  const validation = validateDocumentEmission(next, profile, "factura");
  if (!validation.ok) throw new Error(validation.message ?? "Revisa los datos de la factura.");
  const documentSnapshot = buildDocumentSnapshot(next, profile, {
    capturedAt: input.now, issuer: originalSnapshot.issuer, source: "issue",
  });
  const pdfSnapshot = buildDocumentPdfSnapshot(documentSnapshot, {
    ...profile, documentTemplate: current.pdfSnapshot?.template ?? profile.documentTemplate,
  }, input.now);
  return projectCanonicalSnapshotOntoDocument(withDocumentSnapshotIntegritySignal({
    ...next, documentSnapshot, pdfSnapshot, snapshotIntegrityRequired: true,
    snapshotSeal: buildDocumentSnapshotSeal(next.id, documentSnapshot, pdfSnapshot),
  }));
}
