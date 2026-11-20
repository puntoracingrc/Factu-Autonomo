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
  markDocumentSent: (id: string) => Document | null | Promise<Document | null>;
  share: (doc: Document) => Promise<void>;
  markSentOnShare?: boolean;
}

export interface ShareDocumentFlowResult {
  sharedDocument: Document;
  finalDocument: Document;
}

export function needsIssueBeforeShare(doc: Document): boolean {
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

export async function prepareDocumentForShare({
  doc,
  issueDocument,
}: Pick<ShareDocumentFlowInput, "doc" | "issueDocument">) {
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
    return { document: doc, mayMarkSent: false };
  }

  const document = needsIssueBeforeShare(doc)
    ? await issueDocument(doc.id)
    : doc;
  return { document, mayMarkSent: true };
}

export async function shareDocumentWithIntegrity({
  doc,
  issueDocument,
  markDocumentSent,
  share,
  markSentOnShare = true,
}: ShareDocumentFlowInput): Promise<ShareDocumentFlowResult> {
  const { document: sharedDocument, mayMarkSent } = await prepareDocumentForShare({ doc, issueDocument });
  await share(sharedDocument);

  const finalDocument = markSentOnShare && mayMarkSent
    ? ((await markDocumentSent(sharedDocument.id)) ?? sharedDocument)
    : sharedDocument;

  return { sharedDocument, finalDocument };
}
