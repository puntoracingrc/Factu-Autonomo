import {
  issueDocument,
  markDocumentPaid,
} from "@/lib/document-integrity";
import type { BusinessProfile, Document } from "@/lib/types";

/** Aplica el estado solicitado después de sellar un borrador una sola vez. */
export function issueDraftDocumentWithStatus(
  draft: Document,
  requestedStatus: Document["status"],
  profile: BusinessProfile,
  issuedAt: Date | string = new Date(),
): Document {
  const issued = issueDocument(draft, profile, issuedAt);

  if (requestedStatus === "pagado") {
    return markDocumentPaid(issued, issuedAt);
  }
  if (requestedStatus === "vencido") {
    const timestamp =
      typeof issuedAt === "string" ? issuedAt : issuedAt.toISOString();
    return {
      ...issued,
      status: "vencido",
      paymentStatus: "overdue",
      updatedAt: timestamp,
    };
  }

  return issued;
}
