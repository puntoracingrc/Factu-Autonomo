import { issueDraftDocumentWithStatus } from "@/lib/document-integrity/issuance";
import { assertDocumentSnapshotsIntegrity } from "@/lib/document-integrity/snapshots";
import { DEFAULT_PROFILE, type BusinessProfile, type Document } from "@/lib/types";
import { profileForQuickDocument } from "./context";

const PROFILE_KEYS = ["commercialName", "name", "nif", "vatId", "address", "city", "postalCode", "province", "country", "phone", "email", "website", "iban", "logoUrl", "iva", "vatExempt", "numbering", "documentTemplate", "quoteValidityDays", "verifactu"] as const;
/** Small, frozen render context; never includes tax questionnaires or margins. */
export function quickRenderProfile(profile: BusinessProfile): BusinessProfile {
  const result: BusinessProfile = {
    name: "", nif: "", address: "", city: "", postalCode: "", phone: "", email: "",
    iva: DEFAULT_PROFILE.iva, numbering: DEFAULT_PROFILE.numbering,
  };
  for (const key of PROFILE_KEYS) {
    if (profile[key] !== undefined) Object.assign(result, { [key]: profile[key] });
  }
  delete result.irpfPercent;
  delete result.irpfEstimatePolicy;
  return result;
}
export function quickIssuedDocument(doc: Document, profile: BusinessProfile): Document {
  if (doc.type === "presupuesto") return doc;
  if (doc.documentSnapshot || doc.pdfSnapshot || doc.snapshotSeal) {
    assertDocumentSnapshotsIntegrity(doc);
    return doc;
  }
  const draft = {
    ...doc, status: "borrador" as const, documentLifecycle: "draft" as const, integrityLock: "unlocked" as const,
    deliveryStatus: undefined, paymentStatus: undefined, acceptanceStatus: undefined,
    issuedAt: undefined, sentAt: undefined, paidAt: undefined, acceptedAt: undefined, centralInvoiceAuthority: undefined,
  };
  const issued = issueDraftDocumentWithStatus(draft, doc.status, profileForQuickDocument(doc, profile), doc.issuedAt ?? doc.createdAt);
  return doc.status === "pagado" && doc.paidAt ? { ...issued, paidAt: doc.paidAt } : issued;
}
