import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachRegisteredVerifactuToSnapshots,
  buildDocumentPdfSnapshot,
  deriveLegacySnapshotForReadOnly,
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
import { hasWorkspaceContent } from "./workspace-state";

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

function legacyAcceptedDocument(): Document {
  return {
    id: "legacy-verifactu",
    type: "factura",
    number: "F-2026-0009",
    date: "2026-06-20",
    client: { name: "Cliente legacy" },
    items: [
      {
        id: "legacy-line",
        description: "Servicio legacy",
        quantity: 1,
        unitPrice: 80,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    verifactu: {
      recordHash: "A".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-06-20T10:00:00+02:00",
      qrUrl: "https://prewww2.aeat.es/legacy",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
      submittedAt: "2026-06-20T08:00:00.000Z",
    },
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-06-20T08:00:00.000Z",
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

  it("desactiva el antiguo default VeriFactu hasta un opt-in explícito", () => {
    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        verifactu: { enabled: true, environment: "test" },
      },
    });

    expect(normalized.profile.verifactu).toEqual({
      enabled: false,
      environment: "test",
    });
  });

  it("marca como no verificado un registro local legacy sin procedencia", () => {
    const profile = {
      ...sampleData().profile,
      verifactu: {
        enabled: true,
        environment: "test" as const,
        optInVersion: 1 as const,
      },
    };
    const issued = issueDocument(
      {
        id: "legacy-verifactu",
        type: "factura",
        number: "F-2026-0099",
        date: "2026-06-24",
        client: { name: "Ana" },
        items: [
          {
            id: "line-legacy",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "borrador",
        createdAt: "2026-06-24T09:00:00.000Z",
        updatedAt: "2026-06-24T09:00:00.000Z",
      },
      profile,
      NOW,
    );
    const registered = attachRegisteredVerifactuToSnapshots({
      ...issued,
      verifactuPersistence: "server_confirmed",
      verifactu: {
        recordHash: "A".repeat(64),
        previousHash: "",
        recordTimestamp: "2026-06-24T12:00:00+02:00",
        qrUrl: "https://example.invalid/qr",
        status: "test_registered",
        recordType: "alta",
        environment: "test",
      },
    });
    const legacy = { ...registered, verifactuPersistence: undefined };

    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      profile,
      snapshotIntegrityVersion: 1,
      documents: [legacy],
    });

    expect(normalized.documents[0].verifactuPersistence).toBe(
      "legacy_unverified",
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("guarda y recupera datos", () => {
    const data = sampleData();
    saveData(data);
    const loaded = loadData();
    expect(loaded.customers).toHaveLength(1);
    expect(loaded.profile.name).toBe("Mi negocio");
  });

  it("marca como bloqueado un snapshot manipulado al rehidratar", () => {
    const issued = snapshotDocument();
    const loaded = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          ...issued,
          documentSnapshot: {
            ...issued.documentSnapshot!,
            number: "F-MANIPULADA",
          },
        },
      ],
    });

    expect(loaded.documents[0].snapshotIntegrity?.status).toBe("blocked");
    expect(loaded.documents[0].snapshotIntegrity?.issues).toContain(
      "document_hash_mismatch",
    );
  });

  it("clasifica éxitos VeriFactu legacy antes de intentar construir snapshots", () => {
    const loaded = normalizeLoadedData({
      ...sampleData(),
      profile: {
        ...sampleData().profile,
        verifactu: { enabled: true, environment: "test" },
      },
      documents: [legacyAcceptedDocument()],
    });
    const legacy = loaded.documents[0];

    expect(legacy.verifactuPersistence).toBe("legacy_unverified");
    expect(legacy.verifactu?.recordHash).toBe("A".repeat(64));
    expect(legacy.documentSnapshot).toBeUndefined();
    expect(legacy.snapshotIntegrityRequired).toBe(true);
    expect(legacy.snapshotIntegrity?.status).toBe("blocked");
    expect(legacy.snapshotIntegrity?.issues).toEqual(
      expect.arrayContaining([
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ]),
    );
    expect(loaded.profile.verifactu).toEqual({
      enabled: false,
      environment: "test",
    });
  });

  it("loadData conserva un workspace mixto aunque un registro legacy quede bloqueado", () => {
    const healthy = snapshotDocument();
    const legacy = legacyAcceptedDocument();
    const existing = sampleData();
    saveData({
      ...existing,
      documents: [healthy, legacy],
      expenses: [
        {
          id: "expense-preserved",
          date: "2026-06-21",
          supplierName: "Proveedor conservado",
          description: "Gasto conservado",
          amount: 25,
          ivaPercent: 21,
          category: "Otros",
          paymentMethod: "Tarjeta",
          createdAt: "2026-06-21T08:00:00.000Z",
        },
      ],
    });

    const loaded = loadData();
    const migratedLegacy = loaded.documents.find(
      (document) => document.id === legacy.id,
    );

    expect(loaded.documents).toHaveLength(2);
    expect(loaded.documents.some((document) => document.id === healthy.id)).toBe(
      true,
    );
    expect(loaded.customers).toHaveLength(1);
    expect(loaded.expenses[0]?.id).toBe("expense-preserved");
    expect(migratedLegacy?.verifactuPersistence).toBe("legacy_unverified");
    expect(migratedLegacy?.verifactu).toEqual(legacy.verifactu);
    expect(migratedLegacy?.snapshotIntegrity?.status).toBe("blocked");
  });

  it("persiste exclusiones recurrentes y acepta recurrencias legacy sin ellas", () => {
    const recurring = {
      id: "recurring-storage",
      supplierName: "Proveedor",
      description: "Servicio mensual",
      amount: 40,
      ivaPercent: 21,
      category: "Servicios",
      paymentMethod: "Domiciliación",
      frequency: "monthly" as const,
      dueTiming: { kind: "end_of_month" as const },
      duration: { kind: "indefinite" as const },
      startDate: "2026-01-01",
      enabled: true,
      occurrenceExclusions: [
        {
          key: "recurring-storage:2026-02-28",
          excludedAt: NOW,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: NOW,
    };
    saveData({ ...EMPTY_DATA, recurringExpenses: [recurring] });

    expect(loadData().recurringExpenses[0]?.occurrenceExclusions).toEqual(
      recurring.occurrenceExclusions,
    );

    const legacyRecurring: AppData["recurringExpenses"][number] = {
      ...recurring,
    };
    delete legacyRecurring.occurrenceExclusions;
    expect(
      normalizeLoadedData({
        ...EMPTY_DATA,
        recurringExpenses: [legacyRecurring],
      }).recurringExpenses[0]?.occurrenceExclusions,
    ).toBeUndefined();
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

  it("no borra una cuarentena recuperable al intentar guardar vacío", () => {
    const quarantined: AppData = {
      ...EMPTY_DATA,
      workspaceIntegrityQuarantine: [
        {
          collection: "customers",
          reason: "malformed_collection",
          rawValue: { bad: true },
        },
      ],
    };

    saveData(quarantined);
    saveData(EMPTY_DATA);

    expect(loadData().workspaceIntegrityQuarantine?.[0].rawValue).toEqual({
      bad: true,
    });
  });

  it("conserva el texto raíz si el JSON persistido está truncado", () => {
    const truncated = '{"documents":[';
    localStorage.setItem(STORAGE_KEY, truncated);

    const loaded = loadData();
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as AppData;

    expect(loaded.workspaceIntegrityQuarantine?.[0]).toMatchObject({
      collection: "workspace",
      reason: "malformed_collection",
      rawValue: truncated,
    });
    expect(hasWorkspaceContent(loaded)).toBe(true);
    expect(persisted.workspaceIntegrityQuarantine?.[0].rawValue).toBe(
      truncated,
    );
  });

  it("usa almacenamiento separado cuando esta activo el modo demo", () => {
    saveData(sampleData());

    setDemoWorkspaceMode(true);
    const demoData = loadData();

    expect(demoData.profile.name).toBe("Reformas Martin Demo SL");
    expect(demoData.customers.length).toBeGreaterThan(0);
    expect(
      demoData.documents.find((document) => document.id === "demo-invoice-1")
        ?.snapshotSeal,
    ).toBeDefined();

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

  it("conserva editable un presupuesto comercial sin evidencia fiscal", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          id: "editable-quote",
          type: "presupuesto",
          number: "P-2026-0001",
          date: "2026-07-11",
          client: { name: "Cliente" },
          items: [],
          status: "aceptado",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          acceptanceStatus: "accepted",
          createdAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T01:00:00.000Z",
        },
      ],
    });

    expect(normalized.documents[0].documentLifecycle).toBe("draft");
    expect(normalized.documents[0].integrityLock).toBe("unlocked");
  });

  it("congela facturas emitidas antiguas sin snapshot al cargar datos", () => {
    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
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

  it("recupera una rectificativa BORRADOR bloqueada por el backfill legacy", () => {
    const profile = sampleData().profile;
    const poisonedDraft: Document = {
      id: "legacy-rectification-draft",
      type: "factura",
      number: "BORRADOR",
      date: "2026-06-24",
      client: { name: "Ana López" },
      items: [],
      status: "borrador",
      rectification: {
        originalDocumentId: "invoice-1",
        originalNumber: "F-2026-0001",
        originalDate: "2026-06-01",
        reason: "Error en datos",
        type: "correccion",
      },
      documentLifecycle: "issued",
      integrityLock: "locked",
      createdAt: "2026-06-24T09:00:00.000Z",
      updatedAt: "2026-06-24T09:00:00.000Z",
    };
    const documentSnapshot = deriveLegacySnapshotForReadOnly(
      poisonedDraft,
      profile,
      NOW,
    );

    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [
        {
          ...poisonedDraft,
          documentSnapshot,
          pdfSnapshot: buildDocumentPdfSnapshot(documentSnapshot, profile, NOW),
        },
      ],
    });

    expect(normalized.documents[0]).toMatchObject({
      number: "BORRADOR",
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
    });
    expect(normalized.documents[0].documentSnapshot).toBeUndefined();
    expect(normalized.documents[0].pdfSnapshot).toBeUndefined();
  });

  it("no degrada una rectificativa BORRADOR legacy con evidencia de cobro", () => {
    const profile = sampleData().profile;
    const paidLegacyRectification: Document = {
      id: "paid-legacy-rectification",
      type: "factura",
      number: "BORRADOR",
      date: "2026-06-24",
      client: { name: "Ana López" },
      items: [],
      status: "borrador",
      rectification: {
        originalDocumentId: "invoice-1",
        originalNumber: "F-2026-0001",
        originalDate: "2026-06-01",
        reason: "Error en datos",
        type: "correccion",
      },
      documentLifecycle: "issued",
      integrityLock: "locked",
      paymentStatus: "paid",
      paidAt: "2026-06-24T10:10:00.000Z",
      createdAt: "2026-06-24T09:00:00.000Z",
      updatedAt: "2026-06-24T10:10:00.000Z",
    };
    const documentSnapshot = deriveLegacySnapshotForReadOnly(
      paidLegacyRectification,
      profile,
      NOW,
    );
    const pdfSnapshot = buildDocumentPdfSnapshot(
      documentSnapshot,
      profile,
      NOW,
    );

    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [
        {
          ...paidLegacyRectification,
          documentSnapshot,
          pdfSnapshot,
        },
      ],
    });

    expect(normalized.documents[0]).toMatchObject({
      id: paidLegacyRectification.id,
      documentLifecycle: "issued",
      integrityLock: "locked",
      paymentStatus: "paid",
      paidAt: paidLegacyRectification.paidAt,
      snapshotIntegrity: {
        status: "blocked",
        issues: expect.arrayContaining(["document_relationship_invalid"]),
      },
    });
    expect(normalized.documents[0].documentSnapshot).toBe(documentSnapshot);
    expect(normalized.documents[0].pdfSnapshot).toBe(pdfSnapshot);
    expect(normalized.documents[0].snapshotSeal).toBeUndefined();
  });

  it("no degrada a borrador una rectificativa protegida en versión 1", () => {
    const protectedRectification: Document = {
      id: "protected-rectification",
      type: "factura",
      number: "BORRADOR",
      date: "2026-06-24",
      client: { name: "Ana López" },
      items: [],
      status: "borrador",
      rectification: {
        originalDocumentId: "invoice-1",
        originalNumber: "F-2026-0001",
        originalDate: "2026-06-01",
        reason: "Error en datos",
        type: "correccion",
      },
      documentLifecycle: "issued",
      integrityLock: "locked",
      snapshotIntegrityRequired: true,
      createdAt: "2026-06-24T09:00:00.000Z",
      updatedAt: "2026-06-24T09:00:00.000Z",
    };

    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: 1,
      documents: [protectedRectification],
    });

    expect(normalized.documents[0]).toMatchObject({
      number: "BORRADOR",
      status: "borrador",
      documentLifecycle: "issued",
      integrityLock: "locked",
      snapshotIntegrityRequired: true,
    });
    expect(normalized.documents[0].snapshotIntegrity?.issues).toEqual(
      expect.arrayContaining([
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ]),
    );
  });

  it("no reconstruye desde campos vivos una emisión despojada y manipulada en versión 1", () => {
    const issued = snapshotDocument();
    const stripped: Document = {
      ...issued,
      client: { name: "Cliente manipulado" },
      items: [{ ...issued.items[0], unitPrice: 999 }],
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };

    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: 1,
      documents: [stripped],
    });

    expect(normalized.documents[0].client.name).toBe("Cliente manipulado");
    expect(normalized.documents[0].items[0].unitPrice).toBe(999);
    expect(normalized.documents[0].documentSnapshot).toBeUndefined();
    expect(normalized.documents[0].snapshotIntegrityRequired).toBe(true);
    expect(normalized.documents[0].snapshotIntegrity?.issues).toEqual(
      expect.arrayContaining([
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ]),
    );
  });

  it("sella el backfill únicamente en primera migración o importación explícita", () => {
    const legacy: Document = {
      id: "legacy-invoice",
      type: "factura",
      number: "F-2026-0099",
      date: "2026-06-01",
      client: { name: "Cliente legacy" },
      items: [
        {
          id: "legacy-line",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "enviado",
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T09:00:00.000Z",
    };

    const migrated = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [legacy],
    });
    expect(migrated.documents[0]).toMatchObject({
      snapshotIntegrityRequired: true,
    });
    expect(migrated.documents[0].snapshotSeal).toBeDefined();
    expect(migrated.documents[0].snapshotIntegrity).toBeUndefined();

    const blocked = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: 1,
      documents: [{ ...legacy, id: "existing-unsealed" }],
    });
    expect(blocked.documents[0].documentSnapshot).toBeUndefined();
    expect(blocked.documents[0].snapshotIntegrity?.status).toBe("blocked");

    const imported = normalizeLoadedData(
      {
        ...sampleData(),
        snapshotIntegrityVersion: 1,
        documents: [{ ...legacy, id: "new-imported" }],
      },
      { legacyBackfillDocumentIds: new Set(["new-imported"]) },
    );
    expect(imported.documents[0].snapshotSeal).toBeDefined();
    expect(imported.documents[0].snapshotIntegrity).toBeUndefined();
  });

  it("persiste y encola una sola vez el sello generado en la primera carga local", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T12:00:00.000Z"));
    const issued = snapshotDocument();
    const legacy: Document = {
      ...issued,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
    };
    const raw = {
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [legacy],
      meta: {
        lastModified: "2026-07-10T12:00:00.000Z",
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));

    const first = loadData();
    const firstPending = first.meta?.pendingChanges ?? [];
    expect(first.documents[0].snapshotSeal).toBeDefined();
    expect(
      firstPending.map((change) => `${change.entityType}:${change.entityId}`),
    ).toEqual([
      `document:${issued.id}`,
      "workspace_metadata:snapshot_integrity_version",
    ]);

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as AppData;
    expect(persisted.snapshotIntegrityVersion).toBe(1);
    expect(persisted.documents[0].snapshotSeal).toBeDefined();

    vi.setSystemTime(new Date("2026-07-11T13:00:00.000Z"));
    const second = loadData();
    expect(second.meta?.pendingChanges).toEqual(firstPending);

    saveData({
      ...second,
      meta: {
        ...second.meta,
        lastModified: "2026-07-11T14:00:00.000Z",
        lastSyncedAt: "2026-07-11T14:00:00.000Z",
        pendingChanges: undefined,
      },
    });
    const stable = loadData();
    expect(stable.meta?.pendingChanges).toBeUndefined();
  });

  it("no sella una pareja legacy existente si sus hashes están corruptos", () => {
    const issued = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [
        {
          ...issued,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
          documentSnapshot: {
            ...issued.documentSnapshot!,
            customer: { name: "Cliente manipulado" },
          },
        },
      ],
    });

    expect(normalized.documents[0].snapshotSeal).toBeUndefined();
    expect(normalized.documents[0].documentSnapshot?.customer.name).toBe(
      "Cliente manipulado",
    );
    expect(normalized.documents[0].snapshotIntegrity?.issues).toContain(
      "document_hash_mismatch",
    );
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
    expect(loaded.documents[0].snapshotIntegrity).toBeUndefined();
  });

  it("detecta manipulación al cargar sin reparar ni descartar el snapshot", () => {
    const document = snapshotDocument();
    const tampered: Document = {
      ...document,
      documentSnapshot: {
        ...document.documentSnapshot!,
        customer: {
          ...document.documentSnapshot!.customer,
          name: "Cliente manipulado",
        },
      },
    };

    saveData({ ...sampleData(), documents: [tampered] });
    const loaded = loadData();

    expect(loaded.documents).toHaveLength(1);
    expect(loaded.documents[0].documentSnapshot?.customer.name).toBe(
      "Cliente manipulado",
    );
    expect(loaded.documents[0].documentSnapshot?.snapshotHash).toBe(
      document.documentSnapshot?.snapshotHash,
    );
    expect(loaded.documents[0].snapshotIntegrity?.status).toBe("blocked");
    expect(loaded.documents[0].snapshotIntegrity?.issues).toContain(
      "document_hash_mismatch",
    );
  });

  it("no reconstruye una pareja obligatoria ausente desde datos vivos", () => {
    const document = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: 1,
      documents: [
        {
          ...document,
          items: [{ ...document.items[0], unitPrice: 999 }],
          documentSnapshot: undefined,
          pdfSnapshot: undefined,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
        },
      ],
    });

    expect(normalized.documents[0].documentSnapshot).toBeUndefined();
    expect(normalized.documents[0].pdfSnapshot).toBeUndefined();
    expect(normalized.documents[0].snapshotIntegrity).toEqual({
      status: "blocked",
      issues: [
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ],
    });
  });

  it("no confunde una emisión moderna sin pareja con legacy en la primera migración", () => {
    const document = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [
        {
          ...document,
          documentSnapshot: undefined,
          pdfSnapshot: undefined,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
        },
      ],
    });

    expect(document.issuedAt).toBeTruthy();
    expect(normalized.documents[0].documentSnapshot).toBeUndefined();
    expect(normalized.documents[0].snapshotIntegrity?.status).toBe("blocked");
  });

  it("issuedAt mantiene bloqueada una emisión aunque el estado vivo derive a borrador", () => {
    const document = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: 1,
      documents: [
        {
          ...document,
          status: "borrador",
          documentLifecycle: undefined,
          integrityLock: undefined,
          documentSnapshot: undefined,
          pdfSnapshot: undefined,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
        },
      ],
    });

    expect(normalized.documents[0].documentLifecycle).toBe("issued");
    expect(normalized.documents[0].integrityLock).toBe("locked");
    expect(normalized.documents[0].snapshotIntegrity?.issues).toEqual(
      expect.arrayContaining([
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ]),
    );
  });

  it("no degrada una emisión moderna si desaparece solo el snapshot PDF", () => {
    const document = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: 1,
      documents: [{ ...document, pdfSnapshot: undefined }],
    });

    expect(normalized.documents[0].documentSnapshot).toBe(
      document.documentSnapshot,
    );
    expect(normalized.documents[0].pdfSnapshot).toBeUndefined();
    expect(normalized.documents[0].snapshotIntegrity?.issues).toContain(
      "pdf_snapshot_missing",
    );
  });

  it("migra legacy una vez y bloquea una pérdida posterior de la pareja", () => {
    const legacy = {
      id: "legacy-once",
      type: "factura" as const,
      number: "F-2026-0009",
      date: "2026-06-01",
      client: { name: "Cliente legacy" },
      items: [
        {
          id: "legacy-line",
          description: "Servicio legacy",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "enviado" as const,
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T09:00:00.000Z",
    };
    const first = normalizeLoadedData({
      ...sampleData(),
      snapshotIntegrityVersion: undefined,
      documents: [legacy],
    });

    expect(first.snapshotIntegrityVersion).toBe(1);
    expect(first.documents[0].snapshotSeal).toBeDefined();
    expect(first.documents[0].snapshotIntegrityRequired).toBe(true);

    const second = normalizeLoadedData({
      ...first,
      documents: [
        {
          ...first.documents[0],
          items: [{ ...first.documents[0].items[0], unitPrice: 999 }],
          documentSnapshot: undefined,
          pdfSnapshot: undefined,
          snapshotSeal: undefined,
          snapshotIntegrityRequired: undefined,
        },
      ],
    });

    expect(second.documents[0].documentSnapshot).toBeUndefined();
    expect(second.documents[0].snapshotIntegrity?.status).toBe("blocked");
  });

  it("limita el backfill de una importación a los IDs recién importados", () => {
    const modern = snapshotDocument();
    const missingModern: Document = {
      ...modern,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
    };
    const imported: Document = {
      ...missingModern,
      id: "new-imported-document",
      number: "F-2026-0099",
    };

    const normalized = normalizeLoadedData(
      {
        ...sampleData(),
        snapshotIntegrityVersion: 1,
        documents: [missingModern, imported],
      },
      { legacyBackfillDocumentIds: new Set([imported.id]) },
    );

    expect(normalized.documents[0].snapshotIntegrity?.status).toBe("blocked");
    expect(normalized.documents[0].documentSnapshot).toBeUndefined();
    expect(normalized.documents[1].snapshotIntegrity).toBeUndefined();
    expect(normalized.documents[1].snapshotSeal).toBeDefined();
  });

  it("sustituye señales persistidas por una comprobación real al cargar", () => {
    const document: Document = {
      ...snapshotDocument(),
      snapshotIntegrity: {
        status: "blocked",
        issues: ["pdf_hash_mismatch"],
      },
    };

    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [document],
    });

    expect(normalized.documents[0].snapshotIntegrity).toBeUndefined();
  });

  it("materializa lifecycle y lock derivados para un bundle sellado", () => {
    const document = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          ...document,
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
        },
      ],
    });

    expect(normalized.documents[0].documentLifecycle).toBe("issued");
    expect(normalized.documents[0].integrityLock).toBe("locked");
    expect(normalized.documents[0].snapshotIntegrity).toBeUndefined();
  });

  it("rehidrata campos fiscales vivos desde el snapshot válido", () => {
    const document = snapshotDocument();
    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [
        {
          ...document,
          type: "presupuesto",
          status: "pagado",
          paymentStatus: "paid",
          number: "P-FALSO",
          date: "2030-01-01",
          client: { name: "Cliente vivo falso" },
          items: [{ ...document.items[0], unitPrice: 999 }],
        },
      ],
    });

    expect(normalized.documents[0].type).toBe("factura");
    expect(normalized.documents[0].status).toBe("pagado");
    expect(normalized.documents[0].number).toBe(
      document.documentSnapshot?.number,
    );
    expect(normalized.documents[0].date).toBe(document.documentSnapshot?.date);
    expect(normalized.documents[0].client).toEqual(
      document.documentSnapshot?.customer,
    );
    expect(normalized.documents[0].items[0].unitPrice).toBe(
      document.documentSnapshot?.items[0].unitPrice,
    );
  });

  it("aísla un documento nulo sin ocultar el resto del workspace", () => {
    const valid = snapshotDocument();
    const parsed = {
      ...sampleData(),
      documents: [null, valid],
    } as unknown as Partial<AppData>;

    const normalized = normalizeLoadedData(parsed);

    expect(normalized.profile.name).toBe("Mi negocio");
    expect(normalized.documents).toHaveLength(2);
    expect(normalized.documents[0]).toMatchObject({
      id: "blocked-invalid-document-1",
      integrityLock: "locked",
      snapshotIntegrity: { status: "blocked" },
    });
    expect(normalized.documents[1].id).toBe(valid.id);
    expect(normalized.documents[1].snapshotIntegrity).toBeUndefined();
  });

  it("cuarentena una factura sin número y loadData conserva los demás datos", () => {
    const malformed = {
      ...snapshotDocument(),
      id: "missing-number",
      number: undefined,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
    };
    const valid = snapshotDocument();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...sampleData(),
        documents: [malformed, valid],
      }),
    );

    const loaded = loadData();

    expect(loaded.profile.name).toBe("Mi negocio");
    expect(loaded.documents).toHaveLength(2);
    expect(loaded.documents[0]).toMatchObject({
      id: "missing-number",
      number: "BLOQUEADO-1",
      snapshotIntegrity: { status: "blocked" },
    });
    expect(loaded.documents[1].id).toBe(valid.id);
  });

  it("conserva el payload crudo recuperable al sanear una línea malformada", () => {
    const malformed = {
      ...snapshotDocument(),
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      items: [
        snapshotDocument().items[0],
        {
          id: "broken-line",
          description: "Importe no legible",
          quantity: "no-es-un-numero",
          unitPrice: 50,
          ivaPercent: 21,
        },
      ],
    };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...sampleData(), documents: [malformed] }),
    );

    const loaded = loadData();
    const persisted = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as AppData;

    expect(loaded.documents[0].items).toHaveLength(1);
    expect(
      loaded.documents[0].integrityQuarantine?.rawDocument,
    ).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          id: "broken-line",
          quantity: "no-es-un-numero",
        }),
      ]),
    });
    expect(
      persisted.documents[0].integrityQuarantine?.rawDocument,
    ).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ id: "broken-line" }),
      ]),
    });
  });

  it("aísla una colección malformada sin vaciar ni sobrescribir el workspace", () => {
    const valid = snapshotDocument();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...sampleData(),
        documents: [valid],
        customers: { bad: true },
      }),
    );

    const loaded = loadData();
    const persisted = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as AppData;

    expect(loaded.profile.name).toBe("Mi negocio");
    expect(loaded.documents.map((document) => document.id)).toEqual([
      valid.id,
    ]);
    expect(loaded.customers).toEqual([]);
    expect(loaded.workspaceIntegrityQuarantine).toEqual([
      expect.objectContaining({
        collection: "customers",
        reason: "malformed_collection",
        rawValue: { bad: true },
      }),
    ]);
    expect(persisted.workspaceIntegrityQuarantine?.[0].rawValue).toEqual({
      bad: true,
    });
  });

  it("bloquea todos los documentos si el almacenamiento contiene IDs duplicados", () => {
    const first = snapshotDocument();
    const second = {
      ...snapshotDocument(),
      number: "F-2026-0002",
    };

    const normalized = normalizeLoadedData({
      ...sampleData(),
      documents: [first, second],
    });

    expect(
      normalized.documents.every((document) =>
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        ),
      ),
    ).toBe(true);
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
