import {
  deriveDocumentLifecycle,
  DocumentIntegrityError,
  isDocumentIntegrityLocked,
} from "@/lib/document-integrity";
import type { Document } from "@/lib/types";
import {
  hasLegacyImportProtectionClaim,
  inspectUsableHistoricalDocumentEvidence,
} from "./legacy-import-attestation";
import { hasAppIssuedRecoveryProtectionClaim } from "./app-issued-recovery-protection";

export interface ShareDocumentFlowInput {
  doc: Document;
  issueDocument: (id: string) => Document | Promise<Document>;
  markDocumentSent: (id: string) => Document | null;
  share: (doc: Document) => Promise<void>;
  markSentOnShare?: boolean;
}

export interface ShareDocumentFlowResult {
  sharedDocument: Document;
  finalDocument: Document;
}

function needsIssueBeforeShare(doc: Document): boolean {
  if (doc.type === "presupuesto") return false;

  return (
    deriveDocumentLifecycle(doc) === "draft" && !isDocumentIntegrityLocked(doc)
  );
}

export function canShareDocumentFromList(doc: Document): boolean {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) return false;

  if (hasLegacyImportProtectionClaim(doc)) {
    const inspected = inspectUsableHistoricalDocumentEvidence(doc);
    return (
      inspected.ok &&
      (inspected.kind === "legacy_import_user_attested" ||
        inspected.kind === "legacy_backfill_compatible")
    );
  }
  return !(doc.rectification && doc.status === "borrador");
}

export async function shareDocumentWithIntegrity({
  doc,
  issueDocument,
  markDocumentSent,
  share,
  markSentOnShare = true,
}: ShareDocumentFlowInput): Promise<ShareDocumentFlowResult> {
  if (hasAppIssuedRecoveryProtectionClaim(doc)) {
    throw new DocumentIntegrityError(
      "DOCUMENT_LOCKED",
      "Un documento recuperado solo puede consultarse y no se puede compartir ni reemitir.",
    );
  }

  if (hasLegacyImportProtectionClaim(doc)) {
    const inspected = inspectUsableHistoricalDocumentEvidence(doc);
    if (
      !inspected.ok ||
      (inspected.kind !== "legacy_import_user_attested" &&
        inspected.kind !== "legacy_backfill_compatible")
    ) {
      throw new DocumentIntegrityError(
        "DOCUMENT_LOCKED",
        "La integridad del histórico importado no permite compartirlo.",
      );
    }
    await share(doc);
    return { sharedDocument: doc, finalDocument: doc };
  }

  const sharedDocument = needsIssueBeforeShare(doc)
    ? await issueDocument(doc.id)
    : doc;

  await share(sharedDocument);

  const finalDocument = markSentOnShare
    ? (markDocumentSent(sharedDocument.id) ?? sharedDocument)
    : sharedDocument;

  return { sharedDocument, finalDocument };
}
