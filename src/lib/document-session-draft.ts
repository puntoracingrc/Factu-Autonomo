import type { DocumentType } from "./types";
import type { DocumentProductFormStateDraft } from "./product-document-draft";

const DOCUMENT_SESSION_DRAFT_PREFIX = "factu:document-session-draft:v1:";

export type DocumentSessionFormStateDraft = DocumentProductFormStateDraft;

export interface DocumentSessionDraft {
  source: "document-session";
  schemaVersion: 1;
  documentType: DocumentType;
  updatedAt: string;
  form: DocumentSessionFormStateDraft;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage ?? null;
}

function documentSessionDraftKey(documentType: DocumentType): string {
  return `${DOCUMENT_SESSION_DRAFT_PREFIX}${documentType}`;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulLine(form: DocumentSessionFormStateDraft): boolean {
  return form.items.some((item) => {
    const hasDescription = hasText(item.description);
    const hasPrice =
      Number.isFinite(item.unitPrice) && Math.abs(item.unitPrice) > 0;
    const hasQuantity =
      Number.isFinite(item.quantity) && Math.abs(item.quantity - 1) > 0;
    return hasDescription || hasPrice || hasQuantity;
  });
}

function hasMeaningfulAreaDraft(form: DocumentSessionFormStateDraft): boolean {
  return Object.values(form.lineAreaDrafts).some(
    (draft) =>
      (Number.isFinite(draft.width) && draft.width > 0) ||
      (Number.isFinite(draft.height) && draft.height > 0),
  );
}

export function hasMeaningfulDocumentSessionDraft(
  form: DocumentSessionFormStateDraft,
): boolean {
  const hasClient = Boolean(
    form.selectedCustomerId ||
      Object.values(form.clientForm ?? {}).some((value) => hasText(value)),
  );
  const hasLines =
    hasMeaningfulLine(form) ||
    Object.keys(form.lineProductPricing ?? {}).length > 0 ||
    hasMeaningfulAreaDraft(form);
  const hasManualDocumentState =
    hasText(form.dueDate) || form.status !== "borrador";

  return hasClient || hasLines || hasManualDocumentState;
}

export function saveDocumentSessionDraft(
  documentType: DocumentType,
  form: DocumentSessionFormStateDraft,
): boolean {
  const target = storage();
  if (!target) return false;

  if (!hasMeaningfulDocumentSessionDraft(form)) {
    clearDocumentSessionDraft(documentType);
    return false;
  }

  try {
    const draft: DocumentSessionDraft = {
      source: "document-session",
      schemaVersion: 1,
      documentType,
      updatedAt: new Date().toISOString(),
      form,
    };
    target.setItem(documentSessionDraftKey(documentType), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function getDocumentSessionDraft(
  documentType: DocumentType,
): DocumentSessionDraft | null {
  const target = storage();
  if (!target) return null;

  try {
    const raw = target.getItem(documentSessionDraftKey(documentType));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentSessionDraft;
    if (
      parsed?.source !== "document-session" ||
      parsed.schemaVersion !== 1 ||
      parsed.documentType !== documentType ||
      !parsed.form ||
      !Array.isArray(parsed.form.items) ||
      !hasMeaningfulDocumentSessionDraft(parsed.form)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDocumentSessionDraft(documentType: DocumentType): void {
  const target = storage();
  if (!target) return;

  try {
    target.removeItem(documentSessionDraftKey(documentType));
  } catch {
    // Ignore private browsing storage errors.
  }
}
