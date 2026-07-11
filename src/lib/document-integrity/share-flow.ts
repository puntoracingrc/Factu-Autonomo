import {
  deriveDocumentLifecycle,
  isDocumentIntegrityLocked,
} from "@/lib/document-integrity";
import type { Document } from "@/lib/types";

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
    deriveDocumentLifecycle(doc) === "draft" &&
    !isDocumentIntegrityLocked(doc)
  );
}

export function canShareDocumentFromList(doc: Document): boolean {
  return !(doc.rectification && doc.status === "borrador");
}

export async function shareDocumentWithIntegrity({
  doc,
  issueDocument,
  markDocumentSent,
  share,
  markSentOnShare = true,
}: ShareDocumentFlowInput): Promise<ShareDocumentFlowResult> {
  const sharedDocument = needsIssueBeforeShare(doc)
    ? await issueDocument(doc.id)
    : doc;

  await share(sharedDocument);

  const finalDocument = markSentOnShare
    ? (markDocumentSent(sharedDocument.id) ?? sharedDocument)
    : sharedDocument;

  return { sharedDocument, finalDocument };
}
