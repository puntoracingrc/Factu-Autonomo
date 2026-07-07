import { customerToClient } from "@/lib/customers";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  deriveDocumentLifecycle,
  deriveIntegrityLock,
} from "@/lib/document-integrity";
import type { BusinessProfile, Customer, Document } from "@/lib/types";

export function repairDocumentCustomerSnapshot(
  doc: Document,
  customer: Customer,
  profile: BusinessProfile,
  repairedAt: Date | string = new Date(),
): Document {
  const updatedAt =
    typeof repairedAt === "string" ? repairedAt : repairedAt.toISOString();
  const client = customerToClient(customer);
  const lifecycle = deriveDocumentLifecycle(doc);
  const integrityLock = deriveIntegrityLock(doc);
  const repaired: Document = {
    ...doc,
    customerId: customer.id,
    client,
    documentLifecycle: doc.documentLifecycle ?? lifecycle,
    integrityLock: doc.integrityLock ?? integrityLock,
    updatedAt,
  };

  if (lifecycle === "draft" && !doc.documentSnapshot && !doc.pdfSnapshot) {
    return repaired;
  }

  const documentSnapshot = buildDocumentSnapshot(repaired, profile, {
    capturedAt: updatedAt,
    source: "customer_repair",
    issuer: repaired.issuer ?? doc.documentSnapshot?.issuer,
  });

  return {
    ...repaired,
    documentSnapshot,
    pdfSnapshot: buildDocumentPdfSnapshot(documentSnapshot, profile, updatedAt),
  };
}
