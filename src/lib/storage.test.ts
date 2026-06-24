import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDocumentIntegrityLocked } from "./document-integrity";
import { loadData, normalizeLoadedData, saveData } from "./storage";
import type { AppData, Document } from "./types";
import { EMPTY_DATA } from "./types";

const STORAGE_KEY = "factura-autonomo-data";

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

  it("no borra datos guardados al intentar guardar vacío", () => {
    saveData(sampleData());
    saveData(EMPTY_DATA);
    const loaded = loadData();
    expect(loaded.customers).toHaveLength(1);
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Ana");
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
});
