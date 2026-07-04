import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDocumentSessionDraft,
  getDocumentSessionDraft,
  hasMeaningfulDocumentSessionDraft,
  saveDocumentSessionDraft,
  type DocumentSessionFormStateDraft,
} from "./document-session-draft";

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
  });

  afterEach(() => {
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
    );

    expect(saved).toBe(true);
    expect(getDocumentSessionDraft("presupuesto")).toMatchObject({
      documentType: "presupuesto",
      form: {
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
