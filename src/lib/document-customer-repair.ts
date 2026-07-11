import { customerToClient } from "@/lib/customers";
import {
  assertDocumentSnapshotsIntegrity,
  deriveDocumentLifecycle,
  deriveIntegrityLock,
} from "@/lib/document-integrity";
import type { BusinessProfile, Customer, Document } from "@/lib/types";

export function repairDocumentCustomerSnapshot(
  doc: Document,
  customer: Customer,
  _profile: BusinessProfile,
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
    documentLifecycle: lifecycle,
    integrityLock,
    updatedAt,
  };

  if (lifecycle === "draft" && !doc.documentSnapshot && !doc.pdfSnapshot) {
    assertDocumentSnapshotsIntegrity(doc);
    return repaired;
  }

  // A deliberate customer repair must not also bless unrelated corruption.
  assertDocumentSnapshotsIntegrity(doc, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
    requireSnapshotSeal: true,
  });
  throw new Error(
    "No se puede reescribir el destinatario de un documento emitido sin un historial de reparación auditable. Usa una rectificativa cuando corresponda.",
  );
}
