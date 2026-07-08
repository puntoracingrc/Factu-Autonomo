import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasDocumentSnapshot,
  isDocumentIntegrityLocked,
  issueDocument,
} from "./document-integrity";
import {
  DEMO_WORKSPACE_STORAGE_KEY,
  setDemoWorkspaceMode,
} from "./demo-workspace";
import { loadData, normalizeLoadedData, saveData } from "./storage";
import type { AppData, Document } from "./types";
import { EMPTY_DATA } from "./types";

const STORAGE_KEY = "factura-autonomo-data";
const NOW = "2026-06-24T10:00:00.000Z";

function sampleData(): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile, name: "Mi negocio", nif: "12345678A" },
    customers: [
      {
        id: "c1",
        firstName: "Ana",
        lastName: "López",
        name: "Ana López",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

function snapshotDocument(): Document {
  return issueDocument(
    {
      id: "doc-snapshot",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-06-24",
      client: { name: "Ana" },
      items: [
        {
          id: "line-1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      notes: "Nota visible",
      paymentTerms: "Transferencia",
      status: "borrador",
      createdAt: "2026-06-24T09:00:00.000Z",
      updatedAt: "2026-06-24T09:00:00.000Z",
    },
    sampleData().profile,
    NOW,
  );
}

describe("storage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda y recupera datos", () => {
    const data = sampleData();
    saveData(data);
    const loaded = loadData();
    expect(loaded.customers).toHaveLength(1);
    expect(loaded.profile.name).toBe("Mi negocio");
  });

  it("normaliza preferencias de app en datos antiguos y nuevos", () => {
    expect(
      normalizeLoadedData({ profile: {} } as Partial<AppData>).profile
        .appPreferences,
    ).toEqual({
      theme: "system",
      density: "comfortable",
      startPage: "panel",
      reduceMotion: false,
      documentEmailMethod: "ask",
      documentWhatsAppMethod: "ask",
    });

    expect(
      normalizeLoadedData({
        profile: {
          appPreferences: {
            theme: "dark",
            density: "compact",
            startPage: "settings",
            reduceMotion: true,
            documentEmailMethod: "gmail",
            documentWhatsAppMethod: "direct",
          },
        },
      } as Partial<AppData>).profile.appPreferences,
    ).toEqual({
      theme: "dark",
      density: "compact",
      startPage: "settings",
      reduceMotion: true,
      documentEmailMethod: "gmail",
      documentWhatsAppMethod: "direct",
    });
  });

  it("enlaza gastos antiguos sin supplierId con el proveedor existente por nombre normalizado", () => {
    const data = normalizeLoadedData({
      suppliers: [
        {
          id: "supplier-arandes",
          name: "METALURGICA ARANDES S.L.",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      expenses: [
        {
          id: "expense-summary-1",
          date: "2026-06-19",
          supplierName: "Metalúrgica Arandes SL",
          description: "Factura FD/225009 pendiente de original",
          amount: 467.56,
          ivaPercent: 21,
          category: "Material",
          paymentMethod: "Efectivo",
          purchaseDocument: {
            invoiceNumber: "FD/225009",
            issueDate: "2026-06-19",
          },
          providerSummary: {
            status: "pending_original",
            summaryId: "summary-1",
            importedAt: "2026-07-08T01:00:00.000Z",
            providerName: "Metalúrgica Arandes SL",
          },
          createdAt: "2026-07-08T01:00:00.000Z",
        },
      ],
    } as Partial<AppData>);

    expect(data.expenses[0]?.supplierId).toBe("supplier-arandes");
    expect(data.expenses[0]?.supplierName).toBe("METALURGICA ARANDES S.L.");
  });

  it("enlaza gastos antiguos sin supplierId con el proveedor existente por NIF", () => {
    const data = normalizeLoadedData({
      suppliers: [
        {
          id: "supplier-arandes",
          name: "METALURGICA ARANDES S.L.",
          nif: "B60470374",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      expenses: [
        {
          id: "expense-summary-1",
          date: "2026-06-19",
          supplierName: "Proveedor escrito distinto",
          description: "Factura FD/225009 pendiente de original",
          amount: 467.56,
          ivaPercent: 21,
          category: "Material",
          paymentMethod: "Efectivo",
          purchaseDocument: {
            invoiceNumber: "FD/225009",
            issueDate: "2026-06-19",
            supplierNif: "B60470374",
          },
          createdAt: "2026-07-08T01:00:00.000Z",
        },
      ],
    } as Partial<AppData>);

    expect(data.expenses[0]?.supplierId).toBe("supplier-arandes");
    expect(data.expenses[0]?.supplierName).toBe("METALURGICA ARANDES S.L.");
  });

  it("no borra datos guardados al intentar guardar vacío", () => {
    saveData(sampleData());
    saveData(EMPTY_DATA);
    const loaded = loadData();
    expect(loaded.customers).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Ana");
  });

  it("usa almacenamiento separado cuando esta activo el modo demo", () => {
    saveData(sampleData());

    setDemoWorkspaceMode(true);
    const demoData = loadData();

    expect(demoData.profile.name).toBe("Reformas Martin Demo SL");
    expect(demoData.customers.length).toBeGreaterThan(0);

    saveData({
      ...demoData,
      customers: [
        ...demoData.customers,
        {
          id: "demo-customer-extra",
          firstName: "Cliente",
          lastName: "Nuevo",
          name: "Cliente Nuevo Demo",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });

    expect(localStorage.getItem(DEMO_WORKSPACE_STORAGE_KEY)).toContain(
      "Cliente Nuevo Demo",
    );
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Ana");

    setDemoWorkspaceMode(false);
    expect(loadData().profile.name).toBe("Mi negocio");
  });

  it("conserva campos de integridad documental en saveData -> loadData", () => {
    const document: Document = {
      id: "doc-1",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-06-24",
      client: { name: "Ana" },
      items: [],
      status: "enviado",
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "sent",
      paymentStatus: "paid",
      acceptanceStatus: "not_applicable",
      issuedAt: "2026-06-24T10:00:00.000Z",
      sentAt: "2026-06-24T10:05:00.000Z",
      paidAt: "2026-06-24T10:10:00.000Z",
      acceptedAt: "2026-06-24T10:15:00.000Z",
      createdAt: "2026-06-24T09:00:00.000Z",
      updatedAt: "2026-06-24T10:10:00.000Z",
    };

    saveData({ ...sampleData(), documents: [document] });
    const loaded = loadData();

    expect(loaded.documents[0]).toMatchObject({
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "sent",
      paymentStatus: "paid",
      acceptanceStatus: "not_applicable",
      issuedAt: "2026-06-24T10:00:00.000Z",
      sentAt: "2026-06-24T10:05:00.000Z",
      paidAt: "2026-06-24T10:10:00.000Z",
      acceptedAt: "2026-06-24T10:15:00.000Z",
    });
    expect(isDocumentIntegrityLocked(loaded.documents[0])).toBe(true);
  });

  it("normalizeLoadedData conserva campos de integridad documental", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          id: "doc-1",
          type: "presupuesto",
          number: "P-2026-0001",
          date: "2026-06-24",
          client: { name: "Ana" },
          items: [],
          status: "enviado",
          documentLifecycle: "issued",
          integrityLock: "locked",
          deliveryStatus: "not_sent",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T10:00:00.000Z",
        },
      ],
    });

    expect(normalized.documents[0]).toMatchObject({
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
    });
    expect(isDocumentIntegrityLocked(normalized.documents[0])).toBe(true);
  });

  it("congela facturas emitidas antiguas sin snapshot al cargar datos", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      customers: [
        {
          id: "c1",
          firstName: "Carmen",
          lastName: "Camí",
          name: "Carmen Camí",
          nif: "B60422417",
          address: "Dirección viva cambiada",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-07-07T10:00:00.000Z",
        },
      ],
      documents: [
        {
          id: "legacy-invoice",
          type: "factura",
          number: "Factura/2937/",
          date: "2026-06-12",
          customerId: "c1",
          client: {
            name: "LLEFISA SL",
            nif: "B60422417",
            address: "Avda Diagonal 622 2/1 B, 08021 Barcelona",
          },
          items: [
            {
              id: "line-1",
              description: "Reparación de persiana",
              quantity: 1,
              unitPrice: 90,
              ivaPercent: 21,
            },
          ],
          status: "enviado",
          createdAt: "2026-06-12T09:00:00.000Z",
          updatedAt: "2026-06-12T09:00:00.000Z",
        },
      ],
    });

    const legacy = normalized.documents[0];

    expect(legacy.documentLifecycle).toBe("issued");
    expect(legacy.integrityLock).toBe("locked");
    expect(hasDocumentSnapshot(legacy)).toBe(true);
    expect(legacy.documentSnapshot?.customer.name).toBe("LLEFISA SL");
    expect(legacy.documentSnapshot?.customer.address).toBe(
      "Avda Diagonal 622 2/1 B, 08021 Barcelona",
    );
    expect(legacy.documentSnapshot?.customer.name).not.toBe("Carmen Camí");
    expect(isDocumentIntegrityLocked(legacy)).toBe(true);
  });

  it("conserva snapshots documentales en saveData -> loadData", () => {
    const document = snapshotDocument();

    saveData({ ...sampleData(), documents: [document] });
    const loaded = loadData();

    expect(hasDocumentSnapshot(loaded.documents[0])).toBe(true);
    expect(isDocumentIntegrityLocked(loaded.documents[0])).toBe(true);
    expect(loaded.documents[0].documentSnapshot?.snapshotHash).toBe(
      document.documentSnapshot?.snapshotHash,
    );
    expect(loaded.documents[0].pdfSnapshot?.contentHash).toBe(
      document.pdfSnapshot?.contentHash,
    );
  });

  it("normalizeLoadedData conserva snapshots y campos desconocidos", () => {
    const document = {
      ...snapshotDocument(),
      documentSnapshot: {
        ...snapshotDocument().documentSnapshot!,
        futureSnapshotField: { keep: true },
      },
      pdfSnapshot: {
        ...snapshotDocument().pdfSnapshot!,
        futurePdfField: "se conserva",
      },
      importedExtraField: "se conserva",
    } as Document & {
      documentSnapshot: Document["documentSnapshot"] & {
        futureSnapshotField: { keep: boolean };
      };
      pdfSnapshot: Document["pdfSnapshot"] & { futurePdfField: string };
      importedExtraField: string;
    };

    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [document],
    });

    expect(normalized.documents[0].documentSnapshot?.source).toBe("issue");
    expect(normalized.documents[0].pdfSnapshot?.rendererVersion).toBe(
      "document-pdf-renderer-v1",
    );
    expect(
      (normalized.documents[0] as Document & { importedExtraField?: string })
        .importedExtraField,
    ).toBe("se conserva");
    expect(
      (
        normalized.documents[0].documentSnapshot as Document["documentSnapshot"] & {
          futureSnapshotField?: { keep: boolean };
        }
      )?.futureSnapshotField,
    ).toEqual({ keep: true });
    expect(
      (
        normalized.documents[0].pdfSnapshot as Document["pdfSnapshot"] & {
          futurePdfField?: string;
        }
      )?.futurePdfField,
    ).toBe("se conserva");
  });

  it("documentos sin snapshots siguen siendo válidos al normalizar", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          id: "draft-without-snapshot",
          type: "factura",
          number: "F-2026-0002",
          date: "2026-06-24",
          client: { name: "Ana" },
          items: [],
          status: "borrador",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
      ],
    });

    expect(normalized.documents[0].documentSnapshot).toBeUndefined();
    expect(normalized.documents[0].pdfSnapshot).toBeUndefined();
    expect(isDocumentIntegrityLocked(normalized.documents[0])).toBe(false);
  });

  it("normalizeLoadedData conserva customerId y mergedCustomerIds", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      customers: [
        {
          id: "customer-1",
          firstName: "Ana",
          lastName: "López",
          name: "Ana López",
          mergedCustomerIds: ["legacy-1"],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      documents: [
        {
          id: "doc-with-customer",
          type: "factura",
          number: "F-2026-0003",
          date: "2026-06-24",
          customerId: "customer-1",
          client: { name: "Ana López" },
          items: [],
          status: "borrador",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
      ],
    });

    expect(normalized.customers[0].mergedCustomerIds).toEqual(["legacy-1"]);
    expect(normalized.documents[0].customerId).toBe("customer-1");
  });

  it("normalizeLoadedData conserva vínculos factura-recibo", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          id: "invoice-1",
          type: "factura",
          number: "F-2026-0003",
          date: "2026-06-24",
          client: { name: "Ana López" },
          items: [],
          status: "pagado",
          receiptDocumentId: "receipt-1",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
        {
          id: "receipt-1",
          type: "recibo",
          number: "R-2026-0001",
          date: "2026-06-24",
          client: { name: "Ana López" },
          items: [],
          status: "pagado",
          sourceDocumentId: "invoice-1",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
      ],
    });

    expect(normalized.documents[0].receiptDocumentId).toBe("receipt-1");
    expect(normalized.documents[1].sourceDocumentId).toBe("invoice-1");
  });
});
