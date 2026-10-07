import { hasLegacyImportProtectionClaim } from "@/lib/document-integrity/legacy-import-attestation";
import { hasAppIssuedRecoveryProtectionClaim } from "@/lib/document-integrity/app-issued-recovery-protection";
import type { Document } from "@/lib/types";

/** UI eligibility only. The authenticated server revalidates ownership and CAS. */
export function canManageCentralIssuedInvoice(doc: Document): boolean {
  return Boolean(
    doc.type === "factura" && doc.status !== "borrador" &&
    doc.centralInvoiceAuthority?.source === "central_invoice_authority" &&
    doc.centralInvoiceAuthority.fullNumber === doc.number &&
    doc.centralInvoiceAuthority.documentVersion > 0 &&
    !doc.rectification && !doc.rectifiedById &&
    doc.status !== "rectificada" && doc.status !== "anulada" &&
    !hasLegacyImportProtectionClaim(doc) &&
    !hasAppIssuedRecoveryProtectionClaim(doc) &&
    doc.snapshotIntegrity?.status !== "blocked" &&
    !(doc.verifactu && (doc.verifactu.environment === "production" ||
      doc.verifactu.status === "registered")),
  );
}

export function canDeleteReceiptCentrally(doc: Document): boolean {
  return doc.type === "recibo" && !hasLegacyImportProtectionClaim(doc) &&
    !hasAppIssuedRecoveryProtectionClaim(doc) &&
    doc.snapshotIntegrity?.status !== "blocked";
}
