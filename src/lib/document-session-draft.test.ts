import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDocumentSessionDraft,
  getDocumentSessionDraft,
  hasMeaningfulDocumentSessionDraft,
  saveDocumentSessionDraft,
  shouldRestoreDocumentSessionDraft,
  type DocumentSessionFormStateDraft,
} from "./document-session-draft";
import { setActiveWorkspaceOwnerScope } from "./workspace-owner-runtime";

function installSessionStorageStub() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
}

describe("document session draft", () => {
  beforeEach(() => {
    installSessionStorageStub();
    setActiveWorkspaceOwnerScope("owner-account-a");
  });

  afterEach(() => {
    setActiveWorkspaceOwnerScope(null);
    vi.unstubAllGlobals();
  });

  it("no guarda un documento nuevo vacío", () => {
    const form = formDraft();

    expect(hasMeaningfulDocumentSessionDraft(form)).toBe(false);
    expect(saveDocumentSessionDraft("factura", form)).toBe(false);
    expect(getDocumentSessionDraft("factura")).toBeNull();
  });

  it("guarda y recupera una línea empezada en la misma sesión", () => {
    const saved = saveDocumentSessionDraft(
      "presupuesto",
      formDraft({
        salesTerms: "Garantía de dos años",
        items: [
          {
            id: "line-1",
            description: "Instalación motor Somfy",
            quantity: 1,
            unit: "ud",
            unitPrice: 120,
            ivaPercent: 21,
          },
        ],
      }),
      { localDocumentId: "quote-pending-stable-id" },
    );

    expect(saved).toBe(true);
    expect(getDocumentSessionDraft("presupuesto")).toMatchObject({
      documentType: "presupuesto",
      localDocumentId: "quote-pending-stable-id",
      form: {
        salesTerms: "Garantía de dos años",
        items: [
          {
            id: "line-1",
            description: "Instalación motor Somfy",
            unitPrice: 120,
          },
        ],
      },
    });
    expect(getDocumentSessionDraft("factura")).toBeNull();
  });

  it("borra el borrador temporal al descartarlo", () => {
    expect(
      saveDocumentSessionDraft(
        "recibo",
        formDraft({ clientForm: { firstName: "Eva" } }),
      ),
    ).toBe(true);

    clearDocumentSessionDraft("recibo");

    expect(getDocumentSessionDraft("recibo")).toBeNull();
  });

  it("no expone el borrador de una cuenta al cambiar de sesión", () => {
    expect(
      saveDocumentSessionDraft(
        "factura",
        formDraft({ clientForm: { firstName: "Cliente privado A" } }),
      ),
    ).toBe(true);

    setActiveWorkspaceOwnerScope("owner-account-b");
    expect(getDocumentSessionDraft("factura")).toBeNull();

    setActiveWorkspaceOwnerScope("owner-account-a");
    expect(getDocumentSessionDraft("factura")).toMatchObject({
      form: { clientForm: { firstName: "Cliente privado A" } },
    });
  });

  it("restaura automaticamente un documento nuevo en la misma sesión", () => {
    saveDocumentSessionDraft(
      "factura",
      formDraft({ clientForm: { firstName: "Cliente recuperado" } }),
      { localDocumentId: "new-invoice-local-id" },
    );

    const draft = getDocumentSessionDraft("factura");
    expect(draft).not.toBeNull();
    expect(
      shouldRestoreDocumentSessionDraft(draft!, {
        documentType: "factura",
      }),
    ).toBe(true);
  });

  it("solo restaura la edición del mismo borrador si es más reciente", () => {
    saveDocumentSessionDraft(
      "presupuesto",
      formDraft({ clientForm: { firstName: "Cambio no guardado" } }),
      { localDocumentId: "quote-123" },
    );
    const savedDraft = getDocumentSessionDraft("presupuesto");
    expect(savedDraft).not.toBeNull();
    const draft = {
      ...savedDraft!,
      updatedAt: "2026-10-06T10:05:00.000Z",
    };

    expect(
      shouldRestoreDocumentSessionDraft(draft, {
        documentType: "presupuesto",
        existingDocumentId: "quote-123",
        existingDocumentUpdatedAt: "2026-10-06T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      shouldRestoreDocumentSessionDraft(draft, {
        documentType: "presupuesto",
        existingDocumentId: "quote-other",
        existingDocumentUpdatedAt: "2026-10-06T10:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      shouldRestoreDocumentSessionDraft(draft, {
        documentType: "presupuesto",
        existingDocumentId: "quote-123",
        existingDocumentUpdatedAt: "2026-10-06T10:10:00.000Z",
      }),
    ).toBe(false);
  });
});

function formDraft(
  patch: Partial<DocumentSessionFormStateDraft> = {},
): DocumentSessionFormStateDraft {
  return {
    clientForm: {},
    selectedCustomerId: null,
    date: "2026-07-04",
    dueDate: "",
    notes: "",
    salesTerms: "",
    paymentTerms: "",
    status: "borrador",
    documentIvaPercent: 21,
    items: [
      {
        id: "line-1",
        description: "",
        quantity: 1,
        unit: "ud",
        unitPrice: 0,
        ivaPercent: 21,
      },
    ],
    lineProductPricing: {},
    lineAreaDrafts: {},
    ...patch,
  };
}
