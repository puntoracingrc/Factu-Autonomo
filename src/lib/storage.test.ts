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
import {
  clearPersistedAppData,
  inspectPersistedData,
  loadData,
  normalizeLoadedData,
  readPersistedDataSnapshot,
  saveData,
} from "./storage";
import {
  applyLegacyImportRepair,
  buildLegacyImportRepairPreview,
  inspectLegacyImportAttestation,
} from "./document-integrity/legacy-import-attestation";
import {
  applyAppIssuedDocumentRecovery,
  buildAppIssuedDocumentRecoveryPreview,
  buildAppIssuedDocumentRecoveryRollbackPreview,
  rollbackAppIssuedDocumentRecovery,
} from "./document-integrity/app-issued-recovery";
import type { AppData, Document } from "./types";
import type { FiscalNotificationsWorkspace } from "./fiscal-notifications/types";
import { EMPTY_DATA } from "./types";
import { hasWorkspaceContent } from "./workspace-state";
import { documentAmounts } from "./vat-regime";
import {
  hasPendingCollectionOverride,
  isCollectedDocument,
  withHistoricalCollectionStatus,
} from "./income";

const STORAGE_KEY = "factura-autonomo-data";
const NOW = "2026-06-24T10:00:00.000Z";
const FISCAL_OWNER = "user:00000000-0000-4000-8000-000000000001";

function emptyFiscalNotificationsWorkspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: FISCAL_OWNER,
    revision: 0,
    createdAt: NOW,
    updatedAt: NOW,
    packages: [],
    files: [],
    documents: [],
    parts: [],
    authorities: [],
    references: [],
    evidence: [],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
  };
}

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

function attestedHistoricalReceiptData(): AppData {
  const invoiceId = "pcfacturacion:factura:F-2024-0001";
  const receiptId = "pcfacturacion:recibo:R-2024-0001";
  const profile = {
    ...sampleData().profile,
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
  };
  const historical = (
    id: string,
    type: Document["type"],
    number: string,
    date: string,
  ): Document => ({
    id,
    type,
    number,
    date,
    client: { name: "Cliente historico" },
    items: [
      {
        id: `${id}:line:1`,
        description: "Servicio historico",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    issuer: {
      name: profile.name,
      nif: profile.nif,
      address: profile.address,
      city: profile.city,
      postalCode: profile.postalCode,
      capturedAt: `${date}T10:00:00.000Z`,
    },
    documentLifecycle: "issued",
    integrityLock: "locked",
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: [
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ],
    },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  });
  const invoice = {
    ...historical(invoiceId, "factura", "F-2024-0001", "2024-04-01"),
    receiptDocumentId: receiptId,
  };
  const receipt = {
    ...historical(receiptId, "recibo", "R-2024-0001", "2024-04-02"),
    sourceDocumentId: invoiceId,
  };
  const data: AppData = {
    ...sampleData(),
    profile,
    documents: [invoice, receipt],
    snapshotIntegrityVersion: 1,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(`No se pudo atestar el recibo historico: ${result.reason}`);
  }
  return result.data;
}

function attestedHistoricalCancellationData(): AppData {
  const originalId = "pcfacturacion:factura:F-2024-0002";
  const rectificationId = "pcfacturacion:factura:FR-2024-0001";
  const profile = {
    ...sampleData().profile,
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
  };
  const historical = (
    id: string,
    number: string,
    date: string,
    unitPrice: number,
  ): Document => ({
    id,
    type: "factura",
    number,
    date,
    client: { name: "Cliente historico" },
    items: [
      {
        id: `${id}:line:1`,
        description: "Servicio historico",
        quantity: 1,
        unitPrice,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    issuer: {
      name: profile.name,
      nif: profile.nif,
      address: profile.address,
      city: profile.city,
      postalCode: profile.postalCode,
      capturedAt: `${date}T10:00:00.000Z`,
    },
    documentLifecycle: "issued",
    integrityLock: "locked",
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: [
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ],
    },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  });
  const original: Document = {
    ...historical(originalId, "F-2024-0002", "2024-04-01", 100),
    status: "anulada",
    documentLifecycle: "canceled",
    rectifiedById: rectificationId,
  };
  const rectification: Document = {
    ...historical(rectificationId, "FR-2024-0001", "2024-04-02", -100),
    status: "pagado",
    rectification: {
      originalDocumentId: originalId,
      originalNumber: original.number,
      originalDate: original.date,
      reason: "Anulación histórica",
      type: "anulacion",
    },
  };
  const data: AppData = {
    ...sampleData(),
    profile,
    documents: [original, rectification],
    snapshotIntegrityVersion: 1,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(
      `No se pudo atestar la anulación histórica: ${result.reason}`,
    );
  }
  return result.data;
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

function appIssuedRecoveredRectificationData(): AppData {
  const profile = {
    ...sampleData().profile,
    address: "Calle Sintética 1",
    city: "Madrid",
    postalCode: "28001",
  };
  const originalIssued = issueDocument(
    {
      id: "synthetic:storage-recovery:original",
      type: "factura",
      number: "F-SYNTH-STORAGE-001",
      date: "2026-06-24",
      client: {
        name: "Cliente Sintético SL",
        nif: "B87654321",
        address: "Calle Cliente 2",
        city: "Madrid",
        postalCode: "28002",
      },
      items: [
        {
          id: "synthetic:storage-recovery:original:line",
          description: "Servicio sintético",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: NOW,
      updatedAt: NOW,
    },
    profile,
    NOW,
  );
  const rectification: Document = {
    id: "synthetic:storage-recovery:rectification",
    type: "factura",
    number: "FR-SYNTH-STORAGE-001",
    date: originalIssued.date,
    client: {
      ...originalIssued.client,
      name: "Cliente Sintético Corregido SL",
    },
    items: originalIssued.items.map((item) => ({
      ...item,
      id: `rectification:${item.id}`,
    })),
    status: "pagado",
    issuer: originalIssued.issuer,
    rectification: {
      type: "correccion",
      reason: "Corrección sintética",
      originalDocumentId: originalIssued.id,
      originalNumber: originalIssued.number,
      originalDate: originalIssued.date,
    },
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus: "sent",
    paymentStatus: "paid",
    issuedAt: NOW,
    sentAt: NOW,
    paidAt: NOW,
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: [
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
        "document_relationship_invalid",
      ],
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
  const original: Document = {
    ...originalIssued,
    status: "rectificada",
    rectifiedById: rectification.id,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["document_relationship_invalid"],
    },
  };
  const data: AppData = {
    ...sampleData(),
    profile,
    documents: [original, rectification],
    snapshotIntegrityVersion: 1,
  };
  const snapshot = buildAppIssuedDocumentRecoveryPreview(data)
    .candidates.flatMap((candidate) => candidate.members)
    .find(
      (member) => member.documentId === rectification.id,
    )?.recoveredSnapshot;
  if (!snapshot) throw new Error("No se pudo preparar recovery sintético");
  const preview = buildAppIssuedDocumentRecoveryPreview(data, {
    [rectification.id]: {
      kind: "external_pdf_user_confirmed",
      sha256: "a".repeat(64),
      byteLength: 42_000,
      mediaType: "application/pdf",
      preservation: "user_managed",
      confirmedSummary: {
        number: snapshot.number,
        date: snapshot.date,
        subtotal: snapshot.taxSummary.subtotal,
        iva: snapshot.taxSummary.iva,
        total: snapshot.taxSummary.total,
        confirmedFiscalContentHash: snapshot.snapshotHash,
      },
    },
  });
  const applied = applyAppIssuedDocumentRecovery(
    data,
    preview,
    "2026-07-13T10:00:00.000Z",
  );
  if (applied.status !== "applied") {
    throw new Error(`No se pudo crear recovery sintético: ${applied.reason}`);
  }
  return applied.data;
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

  it("borra el workspace local solo si coincide con el estado esperado", () => {
    const current = normalizeLoadedData(sampleData());
    expect(saveData(current)).toEqual({ status: "applied" });

    expect(clearPersistedAppData(EMPTY_DATA)).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    expect(clearPersistedAppData(current)).toEqual({ status: "applied" });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("lee una instantánea durable sin reescribir el almacenamiento", () => {
    const current = normalizeLoadedData(sampleData());
    expect(saveData(current)).toEqual({ status: "applied" });
    const raw = localStorage.getItem(STORAGE_KEY);
    const setItem = vi.spyOn(localStorage, "setItem");
    setItem.mockClear();

    const snapshot = readPersistedDataSnapshot();

    expect(snapshot?.profile.name).toBe(current.profile.name);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rehidrata únicamente preferencias manuales de modelos válidas", () => {
    const valid = normalizeLoadedData({
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        fiscalAdvisoryModelPreferences: {
          schemaVersion: 1,
          manualModelCodes: ["036", "303"],
        },
      },
    });
    expect(valid.profile.fiscalAdvisoryModelPreferences).toEqual({
      schemaVersion: 1,
      manualModelCodes: ["036", "303"],
    });

    const malformed = normalizeLoadedData({
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        fiscalAdvisoryModelPreferences: {
          schemaVersion: 1,
          manualModelCodes: [" 303"],
        },
      },
    });
    expect(malformed.profile.fiscalAdvisoryModelPreferences).toBeUndefined();
  });

  it("rehidrata solo contactos completos del gestor", () => {
    const valid = normalizeLoadedData({
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        advisorContact: {
          firmName: " Gestoría Central ",
          advisorName: " Laura García ",
          email: " LAURA@GESTORIA.ES ",
          phone: " 600 000 000 ",
        },
      },
    });
    expect(valid.profile.advisorContact).toEqual({
      firmName: "Gestoría Central",
      advisorName: "Laura García",
      email: "laura@gestoria.es",
      phone: "600 000 000",
    });

    const incomplete = normalizeLoadedData({
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        advisorContact: {
          advisorName: "Laura García",
          email: "",
          phone: "",
        },
      },
    });
    expect(incomplete.profile.advisorContact).toBeUndefined();
  });

  it("persiste y recupera el contacto del gestor sin alterar sus datos", () => {
    const advisorContact = {
      firmName: "Gestoría Central",
      advisorName: "Laura García",
      email: "laura@gestoria.es",
      phone: "+34 600 000 000",
    };

    const result = saveData({
      ...EMPTY_DATA,
      profile: { ...EMPTY_DATA.profile, advisorContact },
    });

    expect(result.status).toBe("applied");
    expect(loadData().profile.advisorContact).toEqual(advisorContact);
  });

  it("rehidrata el expediente fiscal estructurado sin retener contenido fuente", () => {
    const workspace = emptyFiscalNotificationsWorkspace();
    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: workspace,
    });

    expect(normalized.fiscalNotificationsWorkspace).toEqual({
      ...workspace,
      driveArchives: [],
    });
    expect(normalized.fiscalNotificationsWorkspace).not.toBe(workspace);
    expect(JSON.stringify(normalized.fiscalNotificationsWorkspace)).not.toMatch(
      /originalFilename|storageReference|rawPdfText/,
    );
  });

  it("persiste localStorage y pendingChanges únicamente con el envelope fiscal V2", () => {
    const workspace = emptyFiscalNotificationsWorkspace();
    const data: AppData = {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: workspace,
      meta: {
        lastModified: NOW,
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: workspace.workspaceId,
            deleted: false,
            payload: workspace,
            updatedAt: NOW,
          },
        ],
      },
    };

    expect(saveData(data)).toEqual({ status: "applied" });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!) as {
      fiscalNotificationsWorkspace: { storageKind: string };
      meta: { pendingChanges: Array<{ payload: { storageKind: string } }> };
    };
    expect(persisted.fiscalNotificationsWorkspace.storageKind).toBe(
      "FISCAL_NOTIFICATIONS_PRIVACY_WORKSPACE_V2",
    );
    expect(persisted.meta.pendingChanges[0]?.payload.storageKind).toBe(
      "FISCAL_NOTIFICATIONS_PRIVACY_WORKSPACE_V2",
    );
    expect(raw).not.toMatch(/"(?:textSnippet|rawValue|valueRaw)"\s*:/u);

    const loaded = loadData();
    expect(loaded.fiscalNotificationsWorkspace?.ownerScope).toBe(FISCAL_OWNER);
    expect(
      (
        loaded.meta?.pendingChanges?.[0]?.payload as {
          storageKind?: string;
        }
      )?.storageKind,
    ).toBe("FISCAL_NOTIFICATIONS_PRIVACY_WORKSPACE_V2");
  });

  it("regenera una cola fiscal obsoleta desde el expediente canónico sin bloquear el guardado", () => {
    const workspace = emptyFiscalNotificationsWorkspace();
    const obsoletePayload = {
      schemaVersion: 1,
      rawPdfText: "contenido que jamás debe copiarse",
    };
    const data: AppData = {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: workspace,
      meta: {
        lastModified: NOW,
        pendingChanges: [
          {
            entityType: "fiscal_notifications_workspace",
            entityId: workspace.workspaceId,
            deleted: false,
            payload: obsoletePayload,
            updatedAt: NOW,
          },
        ],
      },
    };

    expect(saveData(data)).toEqual({ status: "applied" });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain("contenido que jamás debe copiarse");
    const persisted = JSON.parse(raw!) as {
      fiscalNotificationsWorkspace: { storageKind: string };
      meta: { pendingChanges: Array<{ payload: { storageKind: string } }> };
    };
    expect(persisted.meta.pendingChanges[0]?.payload).toEqual(
      persisted.fiscalNotificationsWorkspace,
    );
    expect(loadData().fiscalNotificationsWorkspace?.ownerScope).toBe(
      FISCAL_OWNER,
    );
  });

  it("rechaza un expediente fiscal malformado sin copiar su PII a cuarentena", () => {
    const malformed = {
      ...emptyFiscalNotificationsWorkspace(),
      rawPdfText: "contenido privado que no debe persistir",
    };
    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: malformed as never,
    });

    expect(normalized.fiscalNotificationsWorkspace).toBeUndefined();
    const quarantine = normalized.workspaceIntegrityQuarantine?.find(
      (entry) => entry.collection === "fiscalNotificationsWorkspace",
    );
    expect(quarantine).toEqual({
      collection: "fiscalNotificationsWorkspace",
      reason: "malformed_record",
      rawValue: {
        status: "rejected",
        schema: "fiscal-notifications-privacy-workspace-v2",
      },
    });
    expect(JSON.stringify(normalized)).not.toContain("contenido privado");
  });

  it("migra un workspace V1 legado a V2 antes de volver a escribirlo", () => {
    const workspace = emptyFiscalNotificationsWorkspace();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...EMPTY_DATA, fiscalNotificationsWorkspace: workspace }),
    );

    const loaded = loadData();
    expect(loaded.fiscalNotificationsWorkspace?.ownerScope).toBe(FISCAL_OWNER);
    const rewritten = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      fiscalNotificationsWorkspace?: { storageKind?: string };
    };
    expect(rewritten.fiscalNotificationsWorkspace?.storageKind).toBe(
      "FISCAL_NOTIFICATIONS_PRIVACY_WORKSPACE_V2",
    );
  });

  it("migra y conserva el perfil fiscal aditivo sin persistir el documento", () => {
    const normalized = normalizeLoadedData({
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        fiscalProfile: {
          schemaVersion: 1,
          setupStatus: "CONFIGURED",
          taxpayerType: "SELF_EMPLOYED_IRPF",
          jurisdiction: "ES_COMMON",
          directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
          vatRegime: "GENERAL",
          vatDeductionRight: "FULL",
          activities: [{ code: " 763 ", description: " Programación " }],
          source: {
            kind: "AEAT_CENSUS_CERTIFICATE",
            confirmedAt: "2026-07-12T12:00:00.000Z",
            documentKind: "AEAT_CENSUS_CERTIFICATE",
            extractionMethod: "LOCAL_TEXT",
            identityMatch: "MATCHED",
            matchedTaxId: "12345678Z",
            csv: {
              detected: true,
              verificationStatus: "PENDING_VERIFICATION",
            },
          },
        },
      },
    });

    expect(normalized.profile.fiscalProfile).toMatchObject({
      activities: [{ code: "763", description: "Programación" }],
      source: {
        identityMatch: "MATCHED",
        matchedTaxId: "12345678Z",
        csv: { detected: true, verificationStatus: "PENDING_VERIFICATION" },
      },
    });
    expect(JSON.stringify(normalized.profile.fiscalProfile)).not.toContain(
      "PDF",
    );
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
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("guarda y recupera datos", () => {
    const data = sampleData();
    expect(saveData(data)).toEqual({ status: "applied" });
    const loaded = loadData();
    expect(loaded.customers).toHaveLength(1);
    expect(loaded.profile.name).toBe("Mi negocio");
  });

  it("bloquea QuotaExceeded y conserva byte a byte el raw anterior", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const store = new Map([[STORAGE_KEY, beforeRaw]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value !== beforeRaw) {
          throw new DOMException("workspace omitted", "QuotaExceededError");
        }
        store.set(key, value);
      },
      removeItem: (key: string) => store.delete(key),
    });

    const result = saveData({
      ...sampleData(),
      profile: { ...sampleData().profile, name: "Cambio no persistido" },
    });

    expect(result).toEqual({ status: "blocked", reason: "quota_exceeded" });
    expect(store.get(STORAGE_KEY)).toBe(beforeRaw);
  });

  it("bloquea SecurityError antes de escribir sin exponer el error", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("private profile path", "SecurityError");
      },
      setItem,
      removeItem: vi.fn(),
    });

    expect(saveData(sampleData())).toEqual({
      status: "blocked",
      reason: "storage_unavailable",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("clasifica SecurityError de escritura si el raw anterior sigue verificado", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.stubGlobal("localStorage", {
      getItem: () => beforeRaw,
      setItem: () => {
        throw new DOMException("customer Ana private path", "SecurityError");
      },
      removeItem: vi.fn(),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "Dato sensible" },
      }),
    ).toEqual({ status: "blocked", reason: "storage_unavailable" });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("no rompe el triestado si el error de escritura tiene getters hostiles", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("hostile error getter");
        },
      },
    );
    vi.stubGlobal("localStorage", {
      getItem: () => beforeRaw,
      setItem: () => {
        throw hostile;
      },
      removeItem: vi.fn(),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "Cambio bloqueado" },
      }),
    ).toEqual({ status: "blocked", reason: "write_failed" });
  });

  it("bloquea una serialización circular antes de consultar storage", () => {
    const getItem = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem,
      setItem,
      removeItem: vi.fn(),
    });
    const circular = sampleData() as AppData & { loop?: unknown };
    circular.loop = circular;

    expect(saveData(circular)).toEqual({
      status: "blocked",
      reason: "serialization_failed",
    });
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("bloquea un fallo de compresión antes del primer write", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const getItem = vi.fn(() => beforeRaw);
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem,
      setItem,
      removeItem: vi.fn(),
    });
    vi.stubGlobal("btoa", () => {
      throw new Error("binary encoder unavailable");
    });

    const result = saveData({
      ...sampleData(),
      profile: {
        ...sampleData().profile,
        name: "contenido grande ".repeat(60_000),
      },
    });

    expect(result).toEqual({
      status: "blocked",
      reason: "serialization_failed",
    });
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("clasifica el guard anti-vaciado como bloqueo y conserva el raw", () => {
    const beforeRaw = JSON.stringify(sampleData());
    localStorage.setItem(STORAGE_KEY, beforeRaw);

    expect(saveData(EMPTY_DATA)).toEqual({
      status: "blocked",
      reason: "protected_existing_data",
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw);
  });

  it.each([
    {
      label: "recurrencias",
      data: {
        ...EMPTY_DATA,
        recurringExpenses: [
          {
            id: "recurring-only",
            supplierName: "Proveedor",
            description: "Cuota",
            amount: 50,
            ivaPercent: 21,
            category: "Otros",
            paymentMethod: "Domiciliación",
            frequency: "monthly" as const,
            dueTiming: { kind: "end_of_month" as const },
            duration: { kind: "indefinite" as const },
            startDate: "2026-07-01",
            enabled: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
    },
    {
      label: "recordatorios",
      data: {
        ...EMPTY_DATA,
        userReminders: [
          {
            id: "reminder-only",
            text: "Revisar vencimiento",
            link: { kind: "none" as const },
            target: "self" as const,
            completed: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
    },
    {
      label: "perfil sin nombre",
      data: {
        ...EMPTY_DATA,
        profile: { ...EMPTY_DATA.profile, nif: "12345678Z" },
      },
    },
    {
      label: "cambios pendientes",
      data: {
        ...EMPTY_DATA,
        meta: {
          lastModified: NOW,
          pendingChanges: [
            {
              entityType: "profile" as const,
              entityId: "profile",
              deleted: false,
              payload: { nif: "12345678Z" },
              updatedAt: NOW,
            },
          ],
        },
      },
    },
    {
      label: "contador fiscal",
      data: {
        ...EMPTY_DATA,
        counters: { ...EMPTY_DATA.counters, factura: 7 },
      },
    },
    {
      label: "cadena VeriFactu",
      data: {
        ...EMPTY_DATA,
        verifactuChain: {
          issuerNif: "12345678Z",
          lastHash: "A".repeat(64),
          recordCount: 1,
        },
      },
    },
  ])("no vacía un workspace que solo conserva $label", ({ data }) => {
    expect(saveData(data)).toEqual({ status: "applied" });
    const beforeRaw = localStorage.getItem(STORAGE_KEY);

    expect(saveData(EMPTY_DATA)).toEqual({
      status: "blocked",
      reason: "protected_existing_data",
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw);
  });

  it("no pisa un tercer raw que puede proceder de otra pestaña", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const store = new Map([[STORAGE_KEY, beforeRaw]]);
    let writes = 0;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writes += 1;
        store.set(key, writes === 1 ? "raw-intermedio" : value);
      },
      removeItem: (key: string) => store.delete(key),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "Nuevo nombre" },
      }),
    ).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
    expect(store.get(STORAGE_KEY)).toBe("raw-intermedio");
    expect(writes).toBe(1);
  });

  it("bloquea antes del write si otra pestaña cambió el raw inicial", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const concurrentRaw = JSON.stringify({
      ...sampleData(),
      profile: { ...sampleData().profile, name: "Otra pestaña" },
    });
    let reads = 0;
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (key !== STORAGE_KEY) return null;
        return ++reads === 1 ? beforeRaw : concurrentRaw;
      },
      setItem,
      removeItem: vi.fn(),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "Cambio local" },
      }),
    ).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("no sobrescribe un raw que ya diverge del AppData esperado", () => {
    const expected = normalizeLoadedData(sampleData());
    const persistedByAnotherTab = {
      ...expected,
      profile: { ...expected.profile, name: "Ya persistido por otra pestaña" },
    };
    const candidate = {
      ...expected,
      profile: { ...expected.profile, name: "Candidato local obsoleto" },
    };
    const rawFromAnotherTab = JSON.stringify(persistedByAnotherTab);
    const store = new Map([[STORAGE_KEY, rawFromAnotherTab]]);
    const setItem = vi.fn((key: string, value: string) =>
      store.set(key, value),
    );
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem,
      removeItem: (key: string) => store.delete(key),
    });

    expect(saveData(candidate, { expected })).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(setItem).not.toHaveBeenCalled();
    expect(store.get(STORAGE_KEY)).toBe(rawFromAnotherTab);
  });

  it("permite el write durable cuando el raw normaliza al AppData esperado", () => {
    const expected = normalizeLoadedData(sampleData());
    const store = new Map([[STORAGE_KEY, JSON.stringify(expected)]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const candidate = {
      ...expected,
      profile: { ...expected.profile, name: "Cambio durable" },
    };

    expect(loadData()).toEqual(expected);
    expect(saveData(candidate, { expected })).toEqual({ status: "applied" });
    expect(loadData().profile.name).toBe("Cambio durable");
  });

  it("comprueba el estado durable exacto sin realizar ninguna escritura", () => {
    const expected = normalizeLoadedData(sampleData());
    expect(saveData(expected)).toEqual({ status: "applied" });
    const raw = localStorage.getItem(STORAGE_KEY);
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === STORAGE_KEY ? raw : null,
      setItem,
      removeItem: vi.fn(),
    });

    expect(inspectPersistedData(expected)).toEqual({ status: "applied" });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rechaza una recuperación cuando otra pestaña conserva datos distintos", () => {
    const expected = normalizeLoadedData(sampleData());
    const divergent = {
      ...expected,
      profile: { ...expected.profile, name: "Cambio de otra pestaña" },
    };
    expect(saveData(divergent)).toEqual({ status: "applied" });
    const raw = localStorage.getItem(STORAGE_KEY);
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) =>
        key === STORAGE_KEY ? raw : null,
      setItem,
      removeItem: vi.fn(),
    });

    expect(inspectPersistedData(expected)).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(setItem).not.toHaveBeenCalled();
  });

  it("acepta como expected el workspace demo sintetizado antes de su primer raw", () => {
    setDemoWorkspaceMode(true);
    const expected = loadData();
    expect(localStorage.getItem(DEMO_WORKSPACE_STORAGE_KEY)).toBeNull();
    const candidate = {
      ...expected,
      profile: { ...expected.profile, name: "Demo durable" },
    };

    expect(saveData(candidate, { expected })).toEqual({ status: "applied" });
    expect(localStorage.getItem(DEMO_WORKSPACE_STORAGE_KEY)).not.toBeNull();
    expect(loadData().profile.name).toBe("Demo durable");
  });

  it("no hace rollback sobre un raw concurrente aparecido tras el readback", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const concurrentRaw = JSON.stringify({
      ...sampleData(),
      profile: { ...sampleData().profile, name: "Cambio concurrente tardío" },
    });
    const store = new Map([[STORAGE_KEY, beforeRaw]]);
    let reads = 0;
    let writes = 0;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (key !== STORAGE_KEY) return null;
        reads += 1;
        if (reads === 4) store.set(key, concurrentRaw);
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        writes += 1;
        store.set(key, value);
        if (writes === 1) throw new Error("write interrupted");
      },
      removeItem: (key: string) => store.delete(key),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "Cambio local" },
      }),
    ).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
    expect(store.get(STORAGE_KEY)).toBe(concurrentRaw);
    expect(writes).toBe(1);
  });

  it("restaura tras una escritura intermedia que termina lanzando", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const store = new Map([[STORAGE_KEY, beforeRaw]]);
    let writes = 0;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writes += 1;
        if (writes === 1) {
          store.set(key, value);
          throw new Error("write interrupted");
        }
        store.set(key, value);
      },
      removeItem: (key: string) => store.delete(key),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "No debe quedar" },
      }),
    ).toEqual({ status: "blocked", reason: "write_failed" });
    expect(store.get(STORAGE_KEY)).toBe(beforeRaw);
  });

  it("usa removeItem y verifica el rollback cuando el raw anterior era null", () => {
    const store = new Map<string, string>();
    const removeItem = vi.fn((key: string) => store.delete(key));
    let writes = 0;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writes += 1;
        if (writes === 1) {
          store.set(key, value);
          throw new Error("write interrupted");
        }
        store.set(key, value);
      },
      removeItem,
    });

    expect(saveData(sampleData())).toEqual({
      status: "blocked",
      reason: "write_failed",
    });
    expect(removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(store.has(STORAGE_KEY)).toBe(false);
  });

  it("devuelve indeterminate si no puede restaurar ni verificar el raw", () => {
    const beforeRaw = JSON.stringify(sampleData());
    const store = new Map([[STORAGE_KEY, beforeRaw]]);
    let writes = 0;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writes += 1;
        if (writes === 1) {
          store.set(key, value);
          throw new Error("write interrupted");
        }
        store.set(key, "raw-intermedio");
        throw new Error("rollback failed");
      },
      removeItem: vi.fn(),
    });

    expect(
      saveData({
        ...sampleData(),
        profile: { ...sampleData().profile, name: "Estado incierto" },
      }),
    ).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
    expect(store.get(STORAGE_KEY)).toBe("raw-intermedio");
  });

  it("persiste la evidencia separada del recargo de equivalencia", () => {
    saveData({
      ...sampleData(),
      expenses: [
        {
          id: "expense-re",
          date: "2026-04-01",
          origin: "import",
          businessKind: "purchase_invoice",
          supplierName: "Proveedor Recargo SL",
          description: "Factura RE/1001 pendiente de original",
          amount: 100,
          ivaPercent: 21,
          category: "Material",
          paymentMethod: "Tarjeta",
          providerSummary: {
            status: "pending_original",
            summaryId: "summary-re",
            importedAt: NOW,
            summaryInvoiceTotal: 126.2,
            summaryIvaPercent: 21,
            summaryIvaAmount: 21,
            summaryRecargoPercent: 5.2,
            summaryRecargoAmount: 5.2,
          },
          createdAt: NOW,
        },
      ],
    });

    expect(loadData().expenses[0]?.providerSummary).toMatchObject({
      summaryInvoiceTotal: 126.2,
      summaryIvaPercent: 21,
      summaryIvaAmount: 21,
      summaryRecargoPercent: 5.2,
      summaryRecargoAmount: 5.2,
    });
  });

  it("persiste provenance y auditoría reversible del reparto operativo", () => {
    const beforeAllocation = {
      workDocumentId: "doc-work",
      amount: 100,
      includedLineIds: ["line-1"],
      allocatedAt: NOW,
    };
    const afterAllocation = {
      ...beforeAllocation,
      amount: 126.2,
      fullAmountAtAllocation: 126.2,
    };
    saveData({
      ...sampleData(),
      expenses: [
        {
          id: "expense-repair",
          date: "2026-04-01",
          supplierName: "Proveedor Recargo SL",
          description: "Compra repartida",
          amount: 100,
          ivaPercent: 21,
          category: "Material",
          paymentMethod: "Tarjeta",
          workDocumentId: "doc-work",
          workAllocations: [afterAllocation],
          workAllocationCostRepair: {
            schemaVersion: 1,
            kind: "provider_summary_equivalence_surcharge_v1",
            repairId: "aud-p2-26-work-allocation:expense-repair:v1",
            status: "applied",
            legacyOperatingCost: 100,
            canonicalOperatingCost: 126.2,
            beforeFingerprint: "before",
            afterFingerprint: "after",
            beforeAllocations: [beforeAllocation],
            afterAllocations: [afterAllocation],
            events: [{ action: "applied", at: NOW }],
          },
          createdAt: NOW,
        },
      ],
    });

    const loaded = loadData().expenses[0];
    expect(loaded?.workAllocations).toEqual([afterAllocation]);
    expect(loaded?.workAllocationCostRepair).toEqual({
      schemaVersion: 1,
      kind: "provider_summary_equivalence_surcharge_v1",
      repairId: "aud-p2-26-work-allocation:expense-repair:v1",
      status: "applied",
      legacyOperatingCost: 100,
      canonicalOperatingCost: 126.2,
      beforeFingerprint: "before",
      afterFingerprint: "after",
      beforeAllocations: [beforeAllocation],
      afterAllocations: [afterAllocation],
      events: [{ action: "applied", at: NOW }],
    });
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
    expect(
      loaded.documents.some((document) => document.id === healthy.id),
    ).toBe(true);
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

  it("conserva el mes y todas las reglas de vencimiento anual al recargar", () => {
    const dueTimings: AppData["recurringExpenses"][number]["dueTiming"][] = [
      { kind: "start_of_month" },
      { kind: "mid_of_month" },
      { kind: "end_of_month" },
      { kind: "day_of_month", day: 31 },
    ];
    const recurringExpenses: AppData["recurringExpenses"] = dueTimings.map(
      (dueTiming, index) => ({
        id: `annual-storage-${index}`,
        supplierName: "Proveedor",
        description: "Seguro anual",
        amount: 120,
        ivaPercent: 21,
        category: "Seguros",
        paymentMethod: "Domiciliación",
        frequency: "annual",
        dueTiming,
        dueMonth: 2,
        duration: { kind: "indefinite" },
        startDate: "2027-01-01",
        enabled: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    saveData({ ...EMPTY_DATA, recurringExpenses });

    expect(
      loadData().recurringExpenses.map(({ dueMonth, dueTiming }) => ({
        dueMonth,
        dueTiming,
      })),
    ).toEqual(dueTimings.map((dueTiming) => ({ dueMonth: 2, dueTiming })));
  });

  it("conserva el ancla opcional de una cadencia recurrente al recargar", () => {
    const recurring: AppData["recurringExpenses"][number] = {
      id: "quarterly-segment",
      supplierName: "Proveedor",
      description: "Seguro trimestral",
      amount: 300,
      ivaPercent: 21,
      category: "Seguros",
      paymentMethod: "Domiciliación",
      frequency: "quarterly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-05-01",
      scheduleAnchorDate: "2026-01-01",
      enabled: true,
      createdAt: NOW,
      updatedAt: NOW,
    };

    saveData({ ...EMPTY_DATA, recurringExpenses: [recurring] });

    expect(loadData().recurringExpenses[0]).toEqual(recurring);
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

  it("conserva un gasto fijo escaneado al guardar y recargar un espacio grande", () => {
    const store = new Map<string, string>();
    const quota = 1_200_000;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value.length > quota) {
          throw new DOMException("Cuota local agotada", "QuotaExceededError");
        }
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });

    const recurringExpenseId = "fixed-scanned-template";
    const recurringOccurrenceKey = `${recurringExpenseId}:2026-07-31`;
    const historicalExpenses: AppData["expenses"] = Array.from(
      { length: 700 },
      (_, index) => ({
        id: `historical-expense-${index}`,
        date: "2026-06-30",
        supplierName: "Proveedor histórico con datos repetidos",
        description: `Compra histórica ${index}`,
        amount: 100,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
        notes: "Detalle documental conservado. ".repeat(80),
        createdAt: NOW,
      }),
    );
    const fixedExpense: AppData["expenses"][number] = {
      id: "fixed-scanned-expense",
      date: "2026-07-10",
      origin: "scan",
      businessKind: "fixed",
      supplierName: "Google Commerce Limited",
      description: "Suscripción mensual de streaming",
      amount: 13.21,
      ivaPercent: 21,
      category: "Suscripciones",
      paymentMethod: "Tarjeta",
      recurringExpenseId,
      recurringOccurrenceKey,
      createdAt: NOW,
    };
    const recurringExpense: AppData["recurringExpenses"][number] = {
      id: recurringExpenseId,
      supplierName: fixedExpense.supplierName,
      description: fixedExpense.description,
      amount: fixedExpense.amount,
      ivaPercent: fixedExpense.ivaPercent,
      category: fixedExpense.category,
      paymentMethod: fixedExpense.paymentMethod,
      frequency: "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: fixedExpense.date,
      enabled: true,
      createdAt: NOW,
      updatedAt: NOW,
    };

    saveData({
      ...EMPTY_DATA,
      expenses: [...historicalExpenses, fixedExpense],
      recurringExpenses: [recurringExpense],
    });

    const persisted = localStorage.getItem(STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(persisted?.length).toBeLessThan(quota);

    const loaded = loadData();
    expect(loaded.recurringExpenses).toContainEqual(recurringExpense);
    expect(loaded.expenses).toContainEqual(fixedExpense);
  });

  it("conserva el texto raíz si el JSON persistido está truncado", () => {
    const truncated = '{"documents":[';
    localStorage.setItem(STORAGE_KEY, truncated);

    const loaded = loadData();
    const persisted = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as AppData;

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

  it("mantiene tras reload la atestación V2 exacta de un PCF incompleto sin fabricar sello", () => {
    const capturedAt = "2026-06-12T00:00:00.000Z";
    const profile = {
      ...sampleData().profile,
      name: "",
      nif: "",
      address: "",
      city: "",
      postalCode: "",
      phone: "",
      email: "",
    };
    const historical: Document = {
      id: "pcfacturacion:factura:Factura_2F2940_2F",
      type: "factura",
      number: "Factura/2940/",
      date: "2026-06-12",
      client: {
        name: "",
        nif: "",
        address: "",
        city: "",
        postalCode: "",
      },
      items: [
        {
          id: "pcfacturacion:line:Factura_2F2940_2F-1",
          description: "",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "pagado",
      issuer: {
        name: "",
        nif: "",
        address: "",
        city: "",
        postalCode: "",
        capturedAt,
      },
      documentLifecycle: "issued",
      integrityLock: "locked",
      createdAt: capturedAt,
      updatedAt: capturedAt,
    };
    const blocked = normalizeLoadedData({
      ...sampleData(),
      profile,
      snapshotIntegrityVersion: 1,
      documents: [historical],
    });
    expect(blocked.documents[0].snapshotIntegrity?.status).toBe("blocked");
    expect(documentAmounts(blocked.documents[0], false)).toEqual({
      subtotal: 0,
      iva: 0,
      total: 0,
    });

    const preview = buildLegacyImportRepairPreview(blocked);
    expect(preview.affectedCount).toBe(1);
    expect(preview.candidates[0]).toMatchObject({
      documentNumber: "Factura/2940/",
      importer: "pcfacturacion",
      amounts: { subtotal: 100, iva: 21, total: 121 },
    });
    const repaired = applyLegacyImportRepair(
      blocked,
      preview,
      "2026-07-12T22:00:00.000Z",
    );
    expect(repaired.status).toBe("applied");
    if (repaired.status !== "applied") return;
    const expectedAttestation =
      repaired.data.documents[0]?.legacyImportAttestation;
    expect(expectedAttestation).toMatchObject({
      schemaVersion: 2,
      acceptanceBasis: "amounts_as_filed_user_attested",
      amountOrigin: "persisted_lines_user_confirmed",
      sourceRecord: {
        client: { name: "", nif: "" },
        issuer: { name: "", nif: "" },
        items: [{ description: "" }],
      },
      sourceRecordHash: expect.stringMatching(/^sha256:/),
      acceptedTaxSummary: { subtotal: 100, iva: 21, total: 121 },
      acceptedContentPolicy: {
        kind: "stored_fiscal_content_user_authoritative",
        completenessExceptions: [
          "issuer_name_missing",
          "issuer_nif_missing_or_nonstandard",
          "issuer_address_missing",
          "issuer_city_missing",
          "issuer_postal_code_missing",
          "customer_name_missing",
          "customer_nif_missing_or_nonstandard",
          "customer_address_missing",
          "customer_city_missing",
          "customer_postal_code_missing",
          "line_description_missing",
        ],
      },
    });

    const rolloutResidueReload = normalizeLoadedData({
      ...repaired.data,
      documents: [
        {
          ...repaired.data.documents[0],
          snapshotIntegrity: {
            status: "blocked",
            issues: ["pdf_snapshot_missing", "snapshot_seal_missing"],
          },
        },
      ],
    });
    expect(rolloutResidueReload.documents[0].snapshotIntegrity).toBeUndefined();
    expect(rolloutResidueReload.documents[0].legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(
      inspectLegacyImportAttestation(rolloutResidueReload.documents[0]!),
    ).toMatchObject({ ok: true });
    expect(
      documentAmounts(rolloutResidueReload.documents[0], false).total,
    ).toBe(121);

    const oldClientSignalReload = normalizeLoadedData({
      ...repaired.data,
      documents: [
        {
          ...repaired.data.documents[0],
          snapshotIntegrity: {
            status: "blocked",
            issues: ["legacy_import_attestation_invalid"],
          },
        },
      ],
    });
    expect(
      oldClientSignalReload.documents[0].snapshotIntegrity,
    ).toBeUndefined();
    expect(
      documentAmounts(oldClientSignalReload.documents[0], false).total,
    ).toBe(121);

    const actuallyCorrupt = normalizeLoadedData({
      ...repaired.data,
      documents: [
        {
          ...repaired.data.documents[0],
          legacyImportAttestation: {
            ...repaired.data.documents[0].legacyImportAttestation!,
            attestationHash: "sha256:corrupt",
          },
          snapshotIntegrity: {
            status: "blocked",
            issues: ["legacy_import_attestation_invalid"],
          },
        },
      ],
    });
    expect(actuallyCorrupt.documents[0].snapshotIntegrity).toMatchObject({
      status: "blocked",
      issues: expect.arrayContaining(["legacy_import_attestation_invalid"]),
    });
    expect(documentAmounts(actuallyCorrupt.documents[0], false).total).toBe(0);

    const pendingHistorical = withHistoricalCollectionStatus(
      repaired.data.documents[0]!,
      "pending",
      "2026-07-18T12:05:00.000Z",
    );
    expect(
      saveData({ ...repaired.data, documents: [pendingHistorical] }),
    ).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(reloaded.documents[0]).toMatchObject({
      documentSnapshot: { source: "legacy_import_attested" },
      legacyImportAttestation: {
        kind: "historical_import_user_accepted",
        importer: "pcfacturacion",
      },
      integrityLock: "locked",
      collectionStatusOverride: {
        schemaVersion: 1,
        status: "pending",
        updatedAt: "2026-07-18T12:05:00.000Z",
      },
    });
    expect(reloaded.documents[0]?.legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(
      inspectLegacyImportAttestation(reloaded.documents[0]!),
    ).toMatchObject({
      ok: true,
    });
    expect(reloaded.documents[0].pdfSnapshot).toBeUndefined();
    expect(reloaded.documents[0].snapshotSeal).toBeUndefined();
    expect(reloaded.documents[0].snapshotIntegrityRequired).toBeUndefined();
    expect(reloaded.documents[0].snapshotIntegrity).toBeUndefined();
    expect(hasPendingCollectionOverride(reloaded.documents[0]!)).toBe(true);
    expect(isCollectedDocument(reloaded.documents[0]!)).toBe(false);
    expect(documentAmounts(reloaded.documents[0], false)).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(buildLegacyImportRepairPreview(reloaded).affectedCount).toBe(0);

    const tampered = {
      ...repaired.data,
      documents: [
        {
          ...repaired.data.documents[0],
          status: "enviado" as const,
        },
      ],
    };
    expect(saveData(tampered)).toEqual({ status: "applied" });
    const blockedReload = loadData();
    expect(blockedReload.documents[0].status).toBe("enviado");
    expect(blockedReload.documents[0].snapshotIntegrity).toMatchObject({
      status: "blocked",
      issues: expect.arrayContaining(["legacy_import_attestation_invalid"]),
    });
  });

  it("guarda y recarga una pareja histórica V3 sin perder su vínculo ni sus huellas", () => {
    const repaired = attestedHistoricalReceiptData();
    const expected = repaired.documents.map((document) => ({
      id: document.id,
      attestation: document.legacyImportAttestation,
      snapshot: document.documentSnapshot,
    }));

    expect(expected.map(({ attestation }) => attestation)).toEqual([
      expect.objectContaining({ schemaVersion: 3 }),
      expect.objectContaining({ schemaVersion: 3 }),
    ]);
    expect(saveData(repaired)).toEqual({ status: "applied" });

    const reloaded = loadData();
    expect(
      reloaded.documents.map((document) => ({
        id: document.id,
        attestation: document.legacyImportAttestation,
        snapshot: document.documentSnapshot,
      })),
    ).toEqual(expected);
    expect(reloaded.documents[0].receiptDocumentId).toBe(
      reloaded.documents[1].id,
    );
    expect(reloaded.documents[1].sourceDocumentId).toBe(
      reloaded.documents[0].id,
    );
    expect(
      reloaded.documents.every(
        (document) => inspectLegacyImportAttestation(document).ok,
      ),
    ).toBe(true);
    expect(buildLegacyImportRepairPreview(reloaded).affectedCount).toBe(0);
  });

  it("bloquea al recargar si la rectificación viva V3 ya no coincide con su snapshot", () => {
    const repaired = attestedHistoricalCancellationData();
    const tampered: AppData = {
      ...repaired,
      documents: repaired.documents.map((document, index) =>
        index === 1 ? { ...document, rectification: undefined } : document,
      ),
    };

    expect(saveData(tampered)).toEqual({ status: "applied" });
    const reloaded = loadData();

    expect(reloaded.documents[1].rectification).toBeUndefined();
    expect(
      reloaded.documents.every((document) =>
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        ),
      ),
    ).toBe(true);
    expect(
      reloaded.documents.map(
        (document) => documentAmounts(document, false).total,
      ),
    ).toEqual([0, 0]);
  });

  it("no limpia una señal de hash inválido aunque la atestación legacy sea válida", () => {
    const capturedAt = "2024-04-01T10:00:00.000Z";
    const profile = {
      ...sampleData().profile,
      nif: "12345678Z",
      address: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const historical: Document = {
      id: "pcfacturacion:factura:F-2024-0002",
      type: "factura",
      number: "F-2024-0002",
      date: "2024-04-01",
      client: {
        name: "Cliente histórico",
        nif: "B12345678",
        address: "Calle Cliente 2",
        city: "Madrid",
        postalCode: "28002",
      },
      items: [
        {
          id: "line-historical",
          description: "Trabajo importado",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "enviado",
      issuer: {
        name: profile.name,
        nif: profile.nif,
        address: profile.address,
        city: profile.city,
        postalCode: profile.postalCode,
        capturedAt,
      },
      createdAt: capturedAt,
      updatedAt: capturedAt,
    };
    const blocked = normalizeLoadedData({
      ...sampleData(),
      profile,
      snapshotIntegrityVersion: 1,
      documents: [historical],
    });
    const repaired = applyLegacyImportRepair(
      blocked,
      buildLegacyImportRepairPreview(blocked),
      "2026-07-12T22:00:00.000Z",
    );
    expect(repaired.status).toBe("applied");
    if (repaired.status !== "applied") return;

    const loaded = normalizeLoadedData({
      ...repaired.data,
      documents: [
        {
          ...repaired.data.documents[0],
          snapshotIntegrity: {
            status: "blocked",
            issues: ["document_hash_mismatch"],
          },
        },
      ],
    });

    expect(loaded.documents[0].snapshotIntegrity).toMatchObject({
      status: "blocked",
      issues: expect.arrayContaining(["document_hash_mismatch"]),
    });
  });

  it("no fabrica pareja ni sello al cargar una copia antigua de un importador conocido", () => {
    const capturedAt = "2024-04-01T10:00:00.000Z";
    const profile = {
      ...sampleData().profile,
      nif: "12345678Z",
      address: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const historical: Document = {
      id: "pcfacturacion:factura:F-2024-0003",
      type: "factura",
      number: "F-2024-0003",
      date: "2024-04-01",
      client: {
        name: "Cliente histórico",
        nif: "B12345678",
        address: "Calle Cliente 2",
        city: "Madrid",
        postalCode: "28002",
      },
      items: [
        {
          id: "line-historical",
          description: "Trabajo importado",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "enviado",
      issuer: {
        name: profile.name,
        nif: profile.nif,
        address: profile.address,
        city: profile.city,
        postalCode: profile.postalCode,
        capturedAt,
      },
      createdAt: capturedAt,
      updatedAt: capturedAt,
    };

    const loaded = normalizeLoadedData({
      ...sampleData(),
      profile,
      snapshotIntegrityVersion: undefined,
      documents: [historical],
    });

    expect(loaded.documents[0].documentSnapshot).toBeUndefined();
    expect(loaded.documents[0].pdfSnapshot).toBeUndefined();
    expect(loaded.documents[0].snapshotSeal).toBeUndefined();
    expect(loaded.documents[0].snapshotIntegrity?.status).toBe("blocked");
    expect(buildLegacyImportRepairPreview(loaded).affectedCount).toBe(1);
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

    const persisted = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as AppData;
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
    expect(loaded.documents[0].integrityQuarantine?.rawDocument).toMatchObject({
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
    expect(loaded.documents.map((document) => document.id)).toEqual([valid.id]);
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
        normalized.documents[0]
          .documentSnapshot as Document["documentSnapshot"] & {
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

  it("preserva byte-semánticamente una recovery válida aunque falte la versión del workspace", () => {
    const recovered = appIssuedRecoveredRectificationData();
    const expected = recovered.documents.find((document) =>
      Boolean(document.appIssuedRecoveryAttestation),
    )!;
    const { snapshotIntegrity: _expectedSignal, ...expectedPersistent } =
      structuredClone(expected);

    const normalized = normalizeLoadedData({
      ...recovered,
      snapshotIntegrityVersion: undefined,
    });
    const actual = normalized.documents.find(
      (document) => document.id === expected.id,
    )!;
    const { snapshotIntegrity: _actualSignal, ...actualPersistent } = actual;
    void _expectedSignal;
    void _actualSignal;

    expect(actualPersistent).toEqual(expectedPersistent);
    expect(actual.documentSnapshot).toBeUndefined();
    expect(actual.pdfSnapshot).toBeUndefined();
    expect(actual.snapshotSeal).toBeUndefined();
  });

  it("no autosana ni fabrica evidencia para una recovery corrupta", () => {
    const recovered = appIssuedRecoveredRectificationData();
    const target = recovered.documents.find((document) =>
      Boolean(document.appIssuedRecoveryAttestation),
    )!;
    const corrupt: Document = {
      ...target,
      issuedAt: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
      appIssuedRecoveryAttestation: {
        ...target.appIssuedRecoveryAttestation!,
        attestationHash: `sha256:${"f".repeat(64)}`,
      },
    };
    const expectedAttestation = structuredClone(
      corrupt.appIssuedRecoveryAttestation,
    );

    const normalized = normalizeLoadedData({
      ...recovered,
      snapshotIntegrityVersion: undefined,
      documents: recovered.documents.map((document) =>
        document.id === corrupt.id ? corrupt : document,
      ),
    });
    const actual = normalized.documents.find(
      (document) => document.id === corrupt.id,
    )!;

    expect(actual.appIssuedRecoveryAttestation).toEqual(expectedAttestation);
    expect(actual.documentSnapshot).toBeUndefined();
    expect(actual.pdfSnapshot).toBeUndefined();
    expect(actual.snapshotSeal).toBeUndefined();
    expect(actual.snapshotIntegrity?.issues).toContain(
      "app_issued_recovery_invalid",
    );
  });

  it("aísla una recovery con eventos malformados sin romper la rehidratación", () => {
    const recovered = appIssuedRecoveredRectificationData();
    const target = recovered.documents.find((document) =>
      Boolean(document.appIssuedRecoveryAttestation),
    )!;
    const malformed = {
      ...target,
      appIssuedRecoveryAttestation: {
        ...target.appIssuedRecoveryAttestation!,
        events: null,
      },
    } as unknown as Document;

    const normalized = normalizeLoadedData({
      ...recovered,
      documents: recovered.documents.map((document) =>
        document.id === target.id ? malformed : document,
      ),
    });
    const actual = normalized.documents.find(
      (document) => document.id === target.id,
    )!;

    expect(actual.appIssuedRecoveryAttestation).toEqual(
      malformed.appIssuedRecoveryAttestation,
    );
    expect(actual.snapshotIntegrity?.issues).toContain(
      "app_issued_recovery_invalid",
    );
    expect(normalized.documents).toHaveLength(recovered.documents.length);
  });

  it("trata una claim recovery nula como corrupción y nunca como ausencia", () => {
    const recovered = appIssuedRecoveredRectificationData();
    const target = recovered.documents.find((document) =>
      Boolean(document.appIssuedRecoveryAttestation),
    )!;
    const malformed = {
      ...target,
      appIssuedRecoveryAttestation: null,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
    } as unknown as Document;

    const normalized = normalizeLoadedData({
      ...recovered,
      snapshotIntegrityVersion: undefined,
      documents: recovered.documents.map((document) =>
        document.id === target.id ? malformed : document,
      ),
    });
    const actual = normalized.documents.find(
      (document) => document.id === target.id,
    )!;

    expect(actual.appIssuedRecoveryAttestation).toBeNull();
    expect(actual.documentSnapshot).toBeUndefined();
    expect(actual.pdfSnapshot).toBeUndefined();
    expect(actual.snapshotSeal).toBeUndefined();
    expect(actual.snapshotIntegrity?.issues).toContain(
      "app_issued_recovery_invalid",
    );
    expect(documentAmounts(actual, false).total).toBe(0);
  });

  it("rollback -> load conserva la reversibilidad y permite una nueva preview explícita", () => {
    const recovered = appIssuedRecoveredRectificationData();
    const rollbackPreview =
      buildAppIssuedDocumentRecoveryRollbackPreview(recovered);
    const rolledBack = rollbackAppIssuedDocumentRecovery(
      recovered,
      rollbackPreview,
      "2026-07-13T11:00:00.000Z",
    );
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status !== "applied") return;

    const reloaded = normalizeLoadedData({
      ...rolledBack.data,
      snapshotIntegrityVersion: undefined,
    });
    const inactive = reloaded.documents.find((document) =>
      Boolean(document.appIssuedRecoveryAttestation),
    )!;
    expect(inactive.appIssuedRecoveryAttestation?.status).toBe("rolled_back");
    expect(inactive.snapshotIntegrity?.status).toBe("blocked");
    expect(inactive.snapshotIntegrity?.issues).not.toContain(
      "app_issued_recovery_invalid",
    );

    const reapplyPreview = buildAppIssuedDocumentRecoveryPreview(reloaded);
    expect(reapplyPreview.affectedCount).toBe(1);
    expect(reapplyPreview.requiredPdfDocumentIds).toEqual([]);
    expect(
      applyAppIssuedDocumentRecovery(
        reloaded,
        reapplyPreview,
        "2026-07-13T12:00:00.000Z",
      ).status,
    ).toBe("applied");
  });

  it("bloquea un snapshot recovery top-level sin atestación y no lo proyecta", () => {
    const recovered = appIssuedRecoveredRectificationData();
    const target = recovered.documents.find((document) =>
      Boolean(document.appIssuedRecoveryAttestation),
    )!;
    const recoveredSnapshot =
      target.appIssuedRecoveryAttestation!.recoveredSnapshot!;
    const misplaced: Document = {
      ...target,
      client: { ...target.client, name: "Cliente vivo no canónico" },
      appIssuedRecoveryAttestation: undefined,
      documentSnapshot: recoveredSnapshot,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: undefined,
    };

    const normalized = normalizeLoadedData({
      ...recovered,
      snapshotIntegrityVersion: undefined,
      documents: recovered.documents.map((document) =>
        document.id === misplaced.id ? misplaced : document,
      ),
    });
    const actual = normalized.documents.find(
      (document) => document.id === misplaced.id,
    )!;

    expect(actual.documentSnapshot).toEqual(recoveredSnapshot);
    expect(actual.pdfSnapshot).toBeUndefined();
    expect(actual.snapshotSeal).toBeUndefined();
    expect(actual.client.name).toBe("Cliente vivo no canónico");
    expect(actual.snapshotIntegrity?.issues).toContain(
      "app_issued_recovery_invalid",
    );
    expect(documentAmounts(actual, false)).toEqual({
      subtotal: 0,
      iva: 0,
      total: 0,
    });
  });
});
