import {
  deriveDocumentLifecycle,
  isDocumentIntegrityLocked,
} from "@/lib/document-integrity";
import type { Document } from "@/lib/types";

export interface ShareDocumentFlowInput {
  doc: Document;
  issueDocument: (id: string) => Document;
  markDocumentSent: (id: string) => Document | null;
  share: (doc: Document) => Promise<void>;
  markSentOnShare?: boolean;
}

export interface ShareDocumentFlowResult {
  sharedDocument: Document;
  finalDocument: Document;
}

function needsIssueBeforeShare(doc: Document): boolean {
  return (
    deriveDocumentLifecycle(doc) === "draft" &&
    !isDocumentIntegrityLocked(doc)
  );
}

export async function shareDocumentWithIntegrity({
  doc,
  issueDocument,
  markDocumentSent,
  share,
  markSentOnShare = true,
}: ShareDocumentFlowInput): Promise<ShareDocumentFlowResult> {
  const sharedDocument = needsIssueBeforeShare(doc)
    ? issueDocument(doc.id)
    : doc;

  await share(sharedDocument);

  const finalDocument = markSentOnShare
    ? (markDocumentSent(sharedDocument.id) ?? sharedDocument)
    : sharedDocument;

  return { sharedDocument, finalDocument };
}
