import type { Document, DocumentType } from "./types";
import type { DocumentProductFormStateDraft } from "./product-document-draft";
import { workspaceScopedBrowserStorageKey } from "./workspace-owner-runtime";

const DOCUMENT_SESSION_DRAFT_PREFIX = "factu:document-session-draft:v1:";

const NEW_FORM_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DocumentSessionFormStateDraft = DocumentProductFormStateDraft;

export interface DocumentSessionDraft {
  source: "document-session";
  schemaVersion: 1;
  documentType: DocumentType;
  localDocumentId?: string;
  needsCustomerReview?: true;
  updatedAt: string;
  form: DocumentSessionFormStateDraft;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage ?? null;
}

function documentSessionDraftKey(
  documentType: DocumentType,
  editor: string,
): string {
  return workspaceScopedBrowserStorageKey(
    `${DOCUMENT_SESSION_DRAFT_PREFIX}${documentType}${editor}`,
  );
}

interface SessionEditor {
  existingDocumentId?: string;
  initialCustomerId?: string | null;
}

function editorKey({
  existingDocumentId,
  initialCustomerId,
}: SessionEditor): string {
  if (existingDocumentId)
    return `:edit:${encodeURIComponent(existingDocumentId)}`;
  return initialCustomerId
    ? `:new:customer:${encodeURIComponent(initialCustomerId)}`
    : ":new";
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
      (Number.isFinite(draft.width) && (draft.width ?? 0) > 0) ||
      (Number.isFinite(draft.height) && (draft.height ?? 0) > 0) ||
      (Number.isFinite(draft.length) && (draft.length ?? 0) > 0) ||
      (Number.isFinite(draft.pieces) && (draft.pieces ?? 0) > 1),
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
  options: SessionEditor & { localDocumentId?: string } = {},
): boolean {
  const target = storage();
  if (!target) return false;

  if (!hasMeaningfulDocumentSessionDraft(form)) {
    clearDocumentSessionDraft(documentType, options);
    return false;
  }

  try {
    const draft: DocumentSessionDraft = {
      source: "document-session",
      schemaVersion: 1,
      documentType,
      ...(options.localDocumentId
        ? { localDocumentId: options.localDocumentId }
        : {}),
      updatedAt: new Date().toISOString(),
      form,
    };
    target.setItem(
      documentSessionDraftKey(documentType, editorKey(options)),
      JSON.stringify(draft),
    );
    return true;
  } catch {
    return false;
  }
}

function parseDraft(
  raw: string | null,
  documentType: DocumentType,
): DocumentSessionDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DocumentSessionDraft;
    if (
      parsed?.source !== "document-session" ||
      parsed.schemaVersion !== 1 ||
      parsed.documentType !== documentType ||
      !Number.isFinite(Date.parse(parsed.updatedAt)) ||
      (parsed.localDocumentId !== undefined &&
        (typeof parsed.localDocumentId !== "string" ||
          parsed.localDocumentId.length < 1 ||
          parsed.localDocumentId.length > 200 ||
          /[\u0000-\u001f\u007f]/u.test(parsed.localDocumentId))) ||
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

export function getDocumentSessionDraft(
  documentType: DocumentType,
  editor: SessionEditor = {},
  documents?: ReadonlyArray<Pick<Document, "id" | "customerId">>,
): DocumentSessionDraft | null {
  const target = storage();
  if (!target) return null;
  try {
    const { existingDocumentId, initialCustomerId } = editor;
    const key = documentSessionDraftKey(documentType, editorKey(editor));
    const current = parseDraft(target.getItem(key), documentType);
    if (current) return current;

    // Older releases used one slot for both new forms and every edit of this type.
    const legacyKey = documentSessionDraftKey(documentType, "");
    const raw = target.getItem(legacyKey);
    const legacy = parseDraft(raw, documentType);
    if (!legacy || !raw) return null;
    if (existingDocumentId) {
      if (legacy.localDocumentId !== existingDocumentId) return null;
    } else {
      if (!documents || legacy.form.status !== "borrador") return null;
      if (
        initialCustomerId &&
        initialCustomerId !== legacy.form.selectedCustomerId
      )
        return null;
      // Only new editors generated random UUIDs. A quote conversion, for
      // instance, always opened an existing draft with a deterministic ID.
      const id = legacy.localDocumentId;
      if (
        id &&
        (!NEW_FORM_UUID.test(id) || documents.some((doc) => doc.id === id))
      ) {
        return null;
      }
    }
    const savedCustomerId = existingDocumentId
      ? documents?.find((document) => document.id === existingDocumentId)
          ?.customerId
      : undefined;
    const reviewCustomer =
      savedCustomerId &&
      legacy.form.selectedCustomerId &&
      savedCustomerId !== legacy.form.selectedCustomerId;
    const migrated = reviewCustomer
      ? { ...legacy, needsCustomerReview: true as const }
      : legacy;
    const serialized = reviewCustomer ? JSON.stringify(migrated) : raw;
    try {
      target.setItem(key, serialized);
      if (target.getItem(key) === serialized) target.removeItem(legacyKey);
    } catch {
      // The original still holds the form when browser storage is full.
    }
    return migrated;
  } catch {
    return null;
  }
}

export function shouldRestoreDocumentSessionDraft(
  draft: DocumentSessionDraft,
  options: {
    documentType: DocumentType;
    existingDocumentId?: string;
    existingDocumentUpdatedAt?: string;
    documents?: ReadonlyArray<Pick<Document, "id">>;
  },
): boolean {
  if (draft.documentType !== options.documentType) return false;
  if (!options.existingDocumentId) {
    return !options.documents?.some(
      (document) => document.id === draft.localDocumentId,
    );
  }
  if (draft.localDocumentId !== options.existingDocumentId) return false;

  const draftUpdatedAt = Date.parse(draft.updatedAt);
  const existingUpdatedAt = Date.parse(options.existingDocumentUpdatedAt ?? "");
  return (
    Number.isFinite(draftUpdatedAt) &&
    (!Number.isFinite(existingUpdatedAt) || draftUpdatedAt > existingUpdatedAt)
  );
}

export function clearDocumentSessionDraft(
  documentType: DocumentType,
  editor: SessionEditor = {},
): void {
  const target = storage();
  if (!target) return;

  try {
    target.removeItem(documentSessionDraftKey(documentType, editorKey(editor)));
  } catch {
    // Ignore private browsing storage errors.
  }
}
