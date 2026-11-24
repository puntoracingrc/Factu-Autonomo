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

  it.each(["factura", "presupuesto", "recibo"] as const)(
    "mantiene separados un %s nuevo y dos ediciones aunque se alternen en la misma pestaña",
    (type) => {
      const edit = "quote-invoice:previous-quote";
      const newForm = formDraft({
        notes: "Trabajo nuevo",
        selectedCustomerId: "new-customer",
      });
      const editedForm = formDraft({
        notes: "Revisión anterior",
        status: "enviado",
      });
      saveDocumentSessionDraft(type, editedForm, {
        localDocumentId: edit,
        existingDocumentId: edit,
      });
      expect(
        getDocumentSessionDraft(type, undefined, [{ id: edit }]),
      ).toBeNull();
      saveDocumentSessionDraft(type, newForm, { localDocumentId: "new-id" });
      saveDocumentSessionDraft(type, editedForm, {
        localDocumentId: "second",
        existingDocumentId: "second",
      });
      clearDocumentSessionDraft(type, { existingDocumentId: "second" });
      expect(
        getDocumentSessionDraft(type, { existingDocumentId: edit })?.form.notes,
      ).toBe("Revisión anterior");
      expect(getDocumentSessionDraft(type)?.form.notes).toBe("Trabajo nuevo");
      clearDocumentSessionDraft(type);
      expect(
        getDocumentSessionDraft(type, { existingDocumentId: edit })
          ?.localDocumentId,
      ).toBe(edit);
    },
  );

  it("abrir desde otro cliente conserva el formulario nuevo que ya estaba a medias", () => {
    const form = formDraft({ selectedCustomerId: "first" });
    saveDocumentSessionDraft("factura", form, { localDocumentId: "one" });
    const second = { initialCustomerId: "second" };
    expect(getDocumentSessionDraft("factura", second, [])).toBeNull();
    saveDocumentSessionDraft(
      "factura",
      { ...form, selectedCustomerId: "second" },
      { ...second, localDocumentId: "two" },
    );
    clearDocumentSessionDraft("factura", second);
    expect(getDocumentSessionDraft("factura")?.localDocumentId).toBe("one");
  });

  function installLegacySlot(
    localDocumentId: string,
    status: DocumentSessionFormStateDraft["status"],
  ) {
    const key =
      "factu:document-session-draft:v1:factura:workspace:owner-account-a";
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        source: "document-session",
        schemaVersion: 1,
        documentType: "factura",
        localDocumentId,
        updatedAt: "2026-10-06T10:05:00.000Z",
        form: formDraft({
          status,
          notes: "Trabajo",
          selectedCustomerId: "new-customer",
        }),
      }),
    );
    return key;
  }

  it.each([
    ["quote-invoice:quote-1", "enviado"],
    ["quote-invoice:quote-1", "borrador"],
    ["d9b1aab2-3a94-49ec-bfc4-a60caf5fd22c", "borrador"],
  ] as const)(
    "un borrador antiguo de una ficha guardada con ID %s y estado %s solo se recupera al editarla",
    (id, status) => {
      const key = installLegacySlot(id, status);
      expect(
        getDocumentSessionDraft("factura", undefined, [{ id }]),
      ).toBeNull();
      expect(
        getDocumentSessionDraft("factura", { existingDocumentId: "other-id" }),
      ).toBeNull();
      expect(window.sessionStorage.getItem(key)).not.toBeNull();
      expect(
        getDocumentSessionDraft("factura", { existingDocumentId: id })
          ?.localDocumentId,
      ).toBe(id);
      expect(window.sessionStorage.getItem(key)).toBeNull();
      expect(
        getDocumentSessionDraft("factura", undefined, [{ id }]),
      ).toBeNull();
    },
  );

  it("pide revisar un cambio de cliente al migrar la edición antigua del mismo documento", () => {
    const id = "quote-invoice:quote-1";
    installLegacySlot(id, "enviado");
    const documents = [{ id, customerId: "original-customer" }];
    expect(
      getDocumentSessionDraft("factura", { existingDocumentId: id }, documents)
        ?.needsCustomerReview,
    ).toBe(true);
    expect(
      getDocumentSessionDraft("factura", { existingDocumentId: id }, documents)
        ?.needsCustomerReview,
    ).toBe(true);
  });

  it("recupera un alta antigua al cargar la empresa y conserva su ID en los reintentos", () => {
    const id = "d9b1aab2-3a94-49ec-bfc4-a60caf5fd22c";
    const key = installLegacySlot(id, "borrador");
    expect(getDocumentSessionDraft("factura")).toBeNull();
    expect(
      getDocumentSessionDraft("factura", undefined, [])?.localDocumentId,
    ).toBe(id);
    expect(window.sessionStorage.getItem(key)).toBeNull();
    const draft = getDocumentSessionDraft("factura")!;
    expect(
      shouldRestoreDocumentSessionDraft(draft, {
        documentType: "factura",
        documents: [{ id }],
      }),
    ).toBe(false);
    expect(
      shouldRestoreDocumentSessionDraft(draft, {
        documentType: "factura",
        documents: [],
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
