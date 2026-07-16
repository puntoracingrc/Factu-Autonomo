import { describe, expect, it } from "vitest";
import {
  applySyncChanges,
  appDataToSyncChanges,
  clearSyncedChanges,
  diffAppData,
  emptyCloudBootstrapData,
  mergePendingChanges,
  snapshotIntegrityMetadataChange,
} from "./diff";
import { EMPTY_DATA } from "../types";
import type {
  AppData,
  Customer,
  Document,
  RecurringExpense,
  SyncChange,
} from "../types";
import type { FiscalNotificationsWorkspace } from "../fiscal-notifications/types";
import { FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1 } from "../fiscal-notifications/workspace-persistence.v1";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2,
  FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
  encodeFiscalNotificationsWorkspaceForStorageV2,
  parseFiscalNotificationsWorkspaceStorageEnvelopeV2,
} from "../fiscal-notifications/workspace-storage-envelope.v2";
import {
  applyLegacyImportRepair,
  buildLegacyImportRepairPreview,
  inspectLegacyImportAttestation,
} from "../document-integrity/legacy-import-attestation";
import {
  applyRecurringExpenseChangeToData,
  deleteExpenseFromData,
  previewRecurringExpenseChangeToData,
  saveFixedExpenseWithRecurringTemplateToData,
  syncRecurringExpenses,
} from "../recurring-expenses";
import {
  mergeRemoteOntoLocal,
  rebuildCloudSnapshot,
  trackDataDiff,
} from "./incremental";
import { buildCloudUploadChanges } from "./sync-queue";

function customer(id: string, name: string): Customer {
  const [firstName, ...rest] = name.split(" ");
  return {
    id,
    firstName,
    lastName: rest.join(" "),
    name,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const FISCAL_OWNER = "user:00000000-0000-4000-8000-000000000001";
const FISCAL_NOW = "2026-07-14T09:00:00.000Z";

function fiscalWorkspace(revision = 0): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: FISCAL_OWNER,
    revision,
    createdAt: FISCAL_NOW,
    updatedAt:
      revision === 0 ? FISCAL_NOW : "2026-07-14T09:01:00.000Z",
    packages:
      revision === 0
        ? []
        : [
            {
              id: "package-synthetic",
              ownerScope: FISCAL_OWNER,
              fileIds: [],
              sourceChannel: "MANUAL_UPLOAD",
              processingStatus: "NEEDS_REVIEW",
              securityScanStatus: "NOT_AVAILABLE",
              uploadedAt: FISCAL_NOW,
            },
          ],
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

function fiscalWorkspaceWithPrivateDocument(): FiscalNotificationsWorkspace {
  const workspace = fiscalWorkspace(1);
  const sourceHash = "a".repeat(64);
  workspace.packages = [
    {
      id: "package:sync-privacy:1",
      ownerScope: FISCAL_OWNER,
      fileIds: ["file:sync-privacy:1"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "NEEDS_REVIEW",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: FISCAL_NOW,
    },
  ];
  workspace.files = [
    {
      id: "file:sync-privacy:1",
      packageId: "package:sync-privacy:1",
      ownerScope: FISCAL_OWNER,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: 1_024,
      pageCount: 1,
      sha256: sourceHash,
      contentFingerprint: sourceHash,
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: FISCAL_NOW,
    },
  ];
  workspace.authorities = [
    {
      id: "authority:sync-privacy:aeat",
      ownerScope: FISCAL_OWNER,
      administrationType: "AEAT",
      nameRaw: "Agencia Tributaria",
      nameNormalized: "AEAT",
    },
  ];
  workspace.documents = [
    {
      id: "document:sync-privacy:1",
      packageId: "package:sync-privacy:1",
      fileId: "file:sync-privacy:1",
      ownerScope: FISCAL_OWNER,
      documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
      titleRaw: "Título privado que no puede entrar en la cola",
      titleNormalized: "TITULO PRIVADO QUE NO PUEDE ENTRAR EN LA COLA",
      authorityId: "authority:sync-privacy:aeat",
      issueDate: "2026-07-01",
      notificationDates: {},
      subjectParty: {
        displayName: "PERSONA PRIVADA SINTETICA",
        taxIdNormalized: "00000000T",
        matchesBusinessProfile: "MATCH",
      },
      status: "UNKNOWN",
      urgency: "REVIEW",
      extractionVersion: "synthetic-sync-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: FISCAL_NOW,
      updatedAt: "2026-07-14T09:01:00.000Z",
    },
  ];
  return workspace;
}

function attestedHistoricalData(): AppData {
  const capturedAt = "2024-04-01T10:00:00.000Z";
  const profile = {
    ...EMPTY_DATA.profile,
    name: "Negocio histórico",
    nif: "12345678Z",
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
    email: "negocio@example.test",
  };
  const imported: Document = {
    id: "pcfacturacion:factura:F-2024-0001",
    type: "factura",
    number: "F-2024-0001",
    date: "2024-04-01",
    client: {
      name: "",
      nif: "",
      address: "",
      city: "",
      postalCode: "",
    },
    items: [
      {
        id: "line-1",
        description: "",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    issuer: {
      name: "",
      nif: "",
      address: "",
      city: "",
      postalCode: "",
      email: "",
      capturedAt,
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
    createdAt: capturedAt,
    updatedAt: capturedAt,
  };
  const data: AppData = {
    ...EMPTY_DATA,
    profile,
    documents: [imported],
    snapshotIntegrityVersion: 1,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-12T22:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error("No se pudo construir el fixture histórico atestado.");
  }
  return result.data;
}

function attestedHistoricalReceiptData(): AppData {
  const invoiceId = "pcfacturacion:factura:F-2024-0001";
  const receiptId = "pcfacturacion:recibo:R-2024-0001";
  const profile = {
    ...EMPTY_DATA.profile,
    name: "Negocio historico",
    nif: "12345678Z",
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
  const data: AppData = {
    ...EMPTY_DATA,
    profile,
    documents: [
      {
        ...historical(invoiceId, "factura", "F-2024-0001", "2024-04-01"),
        receiptDocumentId: receiptId,
      },
      {
        ...historical(receiptId, "recibo", "R-2024-0001", "2024-04-02"),
        sourceDocumentId: invoiceId,
      },
    ],
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

describe("sync por cambios", () => {
  it("detecta solo el cliente añadido", () => {
    const prev = EMPTY_DATA;
    const next = {
      ...EMPTY_DATA,
      customers: [customer("c1", "Ana López")],
    };

    const changes = diffAppData(prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0].entityType).toBe("customer");
    expect(changes[0].entityId).toBe("c1");
  });

  it("conserva en cola el proveedor y el gasto añadidos en dos transiciones", () => {
    const supplier = {
      id: "supplier-batch",
      name: "Proveedor del lote",
      nif: "B12345678",
      createdAt: "2026-07-12T03:00:00.000Z",
    };
    const afterSupplier = trackDataDiff(EMPTY_DATA, {
      ...EMPTY_DATA,
      suppliers: [supplier],
    });
    const afterExpense = trackDataDiff(afterSupplier, {
      ...afterSupplier,
      expenses: [
        {
          id: "expense-batch",
          date: "2026-07-12",
          supplierId: supplier.id,
          supplierName: supplier.name,
          description: "Factura del lote",
          amount: 100,
          ivaPercent: 21,
          category: "Material",
          paymentMethod: "Transferencia",
          createdAt: "2026-07-12T03:00:00.000Z",
        },
      ],
    });

    expect(
      afterExpense.meta?.pendingChanges
        ?.map((change) => `${change.entityType}:${change.entityId}`)
        .sort(),
    ).toEqual(["expense:expense-batch", "supplier:supplier-batch"]);
  });

  it("encola juntos el gasto fijo escaneado y su regla recurrente", () => {
    const ids = ["fixed-template", "fixed-expense"];
    const saved = saveFixedExpenseWithRecurringTemplateToData(
      EMPTY_DATA,
      {
        date: "2026-07-11",
        origin: "scan",
        businessKind: "fixed",
        supplierName: "Google Commerce Limited",
        description: "Suscripción mensual de streaming",
        amount: 13.21,
        ivaPercent: 21,
        category: "Suscripciones",
        paymentMethod: "Tarjeta",
      },
      {
        supplierName: "Google Commerce Limited",
        description: "Suscripción mensual de streaming",
        amount: 13.21,
        ivaPercent: 21,
        category: "Suscripciones",
        paymentMethod: "Tarjeta",
        frequency: "monthly",
        dueTiming: { kind: "end_of_month" },
        duration: { kind: "indefinite" },
        startDate: "2026-07-11",
        enabled: true,
      },
      {
        now: "2026-07-11T20:05:00.000Z",
        newId: () => ids.shift() ?? "unexpected-id",
        referenceDate: "2026-07-31",
      },
    );

    const changes = diffAppData(EMPTY_DATA, saved.data);
    expect(
      changes.map((change) => `${change.entityType}:${change.entityId}`).sort(),
    ).toEqual(["expense:fixed-expense", "recurring_expense:fixed-template"]);

    const reloaded = applySyncChanges(EMPTY_DATA, changes);
    expect(reloaded.expenses[0]?.recurringExpenseId).toBe("fixed-template");
    expect(reloaded.recurringExpenses[0]?.id).toBe("fixed-template");
  });

  it("segmenta una regla sin publicar cambios sobre el gasto histórico", () => {
    const recurring: RecurringExpense = {
      id: "recurring-segment",
      supplierName: "Proveedor",
      description: "Servicio mensual",
      amount: 40,
      ivaPercent: 21,
      category: "Servicios",
      paymentMethod: "Domiciliación",
      frequency: "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const before = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-01-31",
    );
    const { id, createdAt, updatedAt, occurrenceExclusions, ...baseDraft } =
      recurring;
    void id;
    void createdAt;
    void updatedAt;
    void occurrenceExclusions;
    const change = { ...baseDraft, amount: 50 };
    const preview = previewRecurringExpenseChangeToData(
      before,
      recurring.id,
      change,
      "2026-02-01",
      { referenceDate: "2026-02-01" },
    );
    const applied = applyRecurringExpenseChangeToData(
      before,
      recurring.id,
      change,
      "2026-02-01",
      {
        now: "2026-02-01T10:00:00.000Z",
        newId: () => "recurring-segment-v2",
        referenceDate: preview.referenceDate,
        expectedPrecondition: preview.precondition,
      },
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;

    const changes = diffAppData(before, applied.data);
    expect(
      changes.map((change) => `${change.entityType}:${change.entityId}`).sort(),
    ).toEqual([
      "recurring_expense:recurring-segment",
      "recurring_expense:recurring-segment-v2",
    ]);
    expect(applied.data.expenses).toEqual(before.expenses);
    expect(
      changes.find((change) => change.entityId === "recurring-segment-v2")
        ?.payload,
    ).toMatchObject({ scheduleAnchorDate: "2026-01-01" });

    const reloaded = applySyncChanges(before, changes);
    expect(reloaded.expenses).toEqual(before.expenses);
    expect(
      reloaded.recurringExpenses.find(
        (entry) => entry.id === "recurring-segment-v2",
      ),
    ).toMatchObject({ scheduleAnchorDate: "2026-01-01" });

    const blockedPreview = previewRecurringExpenseChangeToData(
      before,
      recurring.id,
      change,
      "2026-01-01",
      { referenceDate: "2026-01-31" },
    );
    const blocked = applyRecurringExpenseChangeToData(
      before,
      recurring.id,
      change,
      "2026-01-01",
      {
        referenceDate: blockedPreview.referenceDate,
        expectedPrecondition: blockedPreview.precondition,
      },
    );
    expect(blocked).toMatchObject({
      status: "blocked",
      reason: "manual_review",
    });
    expect(diffAppData(before, blocked.data)).toEqual([]);
  });

  it("conserva la evidencia anidada de recargo en el diff cloud", () => {
    const expense = {
      id: "expense-re",
      date: "2026-04-01",
      supplierName: "Proveedor Recargo SL",
      description: "Compra con recargo",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      providerSummary: {
        status: "pending_original" as const,
        summaryId: "summary-re",
        importedAt: "2026-07-11T10:00:00.000Z",
        summaryInvoiceTotal: 126.2,
        summaryIvaPercent: 21,
        summaryIvaAmount: 21,
        summaryRecargoPercent: 5.2,
        summaryRecargoAmount: 5.2,
      },
      createdAt: "2026-07-11T10:00:00.000Z",
    };
    const changes = diffAppData(EMPTY_DATA, {
      ...EMPTY_DATA,
      expenses: [expense],
    });
    const reloaded = applySyncChanges(EMPTY_DATA, changes);

    expect(reloaded.expenses[0]?.providerSummary).toEqual(
      expense.providerSummary,
    );
  });

  it("conserva exactamente la atestación al generar el diff y reconstruir cloud", () => {
    const source = attestedHistoricalData();
    const expectedAttestation = source.documents[0]?.legacyImportAttestation;
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
    const changes = diffAppData(emptyCloudBootstrapData(), source);
    const documentChange = changes.find(
      (change) => change.entityType === "document",
    );

    expect(
      (documentChange?.payload as Document | undefined)
        ?.legacyImportAttestation,
    ).toEqual(expectedAttestation);

    const rebuilt = rebuildCloudSnapshot(changes).data;

    expect(rebuilt.documents[0]?.legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(rebuilt.documents[0]?.documentSnapshot).toEqual(
      source.documents[0]?.documentSnapshot,
    );
    expect(rebuilt.documents[0]?.pdfSnapshot).toBeUndefined();
    expect(rebuilt.documents[0]?.snapshotSeal).toBeUndefined();
    expect(inspectLegacyImportAttestation(rebuilt.documents[0]!).ok).toBe(true);
  });

  it("sincroniza de forma exacta los dos extremos de una relación histórica V3", () => {
    const source = attestedHistoricalReceiptData();
    const expected = source.documents.map((document) => ({
      id: document.id,
      attestation: document.legacyImportAttestation,
      snapshot: document.documentSnapshot,
    }));
    const changes = diffAppData(emptyCloudBootstrapData(), source);

    expect(
      changes.filter((change) => change.entityType === "document"),
    ).toHaveLength(2);
    const rebuilt = rebuildCloudSnapshot(changes).data;
    expect(
      rebuilt.documents.map((document) => ({
        id: document.id,
        attestation: document.legacyImportAttestation,
        snapshot: document.documentSnapshot,
      })),
    ).toEqual(expected);
    expect(rebuilt.documents[0].receiptDocumentId).toBe(
      rebuilt.documents[1].id,
    );
    expect(rebuilt.documents[1].sourceDocumentId).toBe(rebuilt.documents[0].id);
    expect(
      rebuilt.documents.every(
        (document) => inspectLegacyImportAttestation(document).ok,
      ),
    ).toBe(true);
  });

  it("sincroniza una reparación reversible cambiando solo la entidad expense", () => {
    const beforeAllocation = {
      workDocumentId: "doc-work",
      amount: 100,
      includedLineIds: ["line-1"],
      allocatedAt: "2026-07-11T10:00:00.000Z",
    };
    const afterAllocation = {
      ...beforeAllocation,
      amount: 126.2,
      fullAmountAtAllocation: 126.2,
    };
    const baselineExpense = {
      id: "expense-repair",
      date: "2026-04-01",
      supplierName: "Proveedor Recargo SL",
      description: "Compra repartida",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      workDocumentId: "doc-work",
      workAllocations: [beforeAllocation],
      createdAt: "2026-07-11T09:00:00.000Z",
    };
    const baseline: AppData = {
      ...EMPTY_DATA,
      documents: [
        {
          id: "doc-work",
          type: "factura",
          number: "F-2026-0001",
          date: "2026-07-10",
          client: { name: "Cliente" },
          items: [],
          status: "borrador",
          createdAt: "2026-07-10T10:00:00.000Z",
          updatedAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      expenses: [baselineExpense],
    };
    const repaired: AppData = {
      ...baseline,
      expenses: [
        {
          ...baselineExpense,
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
            events: [{ action: "applied", at: "2026-07-12T02:00:00.000Z" }],
          },
        },
      ],
    };

    const changes = diffAppData(baseline, repaired);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      entityType: "expense",
      entityId: "expense-repair",
      deleted: false,
    });

    const reloaded = applySyncChanges(baseline, changes);
    expect(reloaded.documents).toEqual(baseline.documents);
    expect(reloaded.expenses[0]).toEqual(repaired.expenses[0]);
  });

  it("aplica un cambio remoto sin tocar el resto", () => {
    const local = {
      ...EMPTY_DATA,
      customers: [customer("c1", "Ana López")],
    };
    const remote = [
      {
        entityType: "customer" as const,
        entityId: "c2",
        deleted: false,
        payload: customer("c2", "Luis Pérez"),
        updatedAt: "2026-06-10T12:00:00.000Z",
      },
    ];

    const merged = applySyncChanges(local, remote);
    expect(merged.customers).toHaveLength(2);
  });

  it("sincroniza el marcador de integridad como metadato monotónico", () => {
    const legacy = {
      ...EMPTY_DATA,
      snapshotIntegrityVersion: undefined,
    };
    const versioned = { ...legacy, snapshotIntegrityVersion: 1 as const };

    expect(diffAppData(legacy, versioned)).toEqual([
      expect.objectContaining({
        entityType: "workspace_metadata",
        entityId: "snapshot_integrity_version",
        deleted: false,
        payload: { snapshotIntegrityVersion: 1 },
      }),
    ]);
    expect(diffAppData(versioned, legacy)).toEqual([]);
    expect(appDataToSyncChanges(versioned).at(-1)).toMatchObject({
      entityType: "workspace_metadata",
      entityId: "snapshot_integrity_version",
      payload: { snapshotIntegrityVersion: 1 },
    });

    const applied = applySyncChanges(legacy, [
      snapshotIntegrityMetadataChange("2026-07-11T12:00:00.000Z"),
    ]);
    expect(applied.snapshotIntegrityVersion).toBe(1);

    const tombstoneIgnored = applySyncChanges(applied, [
      {
        ...snapshotIntegrityMetadataChange("2026-07-11T13:00:00.000Z"),
        deleted: true,
        payload: undefined,
      },
    ]);
    expect(tombstoneIgnored.snapshotIntegrityVersion).toBe(1);
    expect(emptyCloudBootstrapData().snapshotIntegrityVersion).toBeUndefined();
  });

  it("sincroniza juntos el borrado del cargo y su exclusión persistente", () => {
    const recurring: RecurringExpense = {
      id: "recurring-cloud",
      supplierName: "Proveedor cloud",
      description: "Servicio mensual",
      amount: 50,
      ivaPercent: 21,
      category: "Servicios",
      paymentMethod: "Domiciliación",
      frequency: "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const before = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-01-31",
    );
    const after = deleteExpenseFromData(
      before,
      before.expenses[0]!.id,
      "2026-02-01T00:00:00.000Z",
    );

    const changes = diffAppData(before, after);
    expect(
      changes.map((change) => ({
        type: change.entityType,
        deleted: change.deleted,
      })),
    ).toEqual([
      { type: "expense", deleted: true },
      { type: "recurring_expense", deleted: false },
      { type: "recurring_occurrence_exclusion", deleted: false },
    ]);

    const downloaded = applySyncChanges(before, changes);
    const reloaded = syncRecurringExpenses(downloaded, "2026-01-31");
    expect(reloaded.expenses).toEqual([]);
    expect(reloaded.recurringExpenses[0]?.occurrenceExclusions?.[0]?.key).toBe(
      "recurring-cloud:2026-01-31",
    );
  });

  it("conserva el tombstone ante un segundo dispositivo con plantilla obsoleta", () => {
    const recurring: RecurringExpense = {
      id: "recurring-two-devices",
      supplierName: "Proveedor cloud",
      description: "Servicio mensual",
      amount: 50,
      ivaPercent: 21,
      category: "Servicios",
      paymentMethod: "Domiciliación",
      frequency: "monthly",
      dueTiming: { kind: "end_of_month" },
      duration: { kind: "indefinite" },
      startDate: "2026-01-01",
      enabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const shared = syncRecurringExpenses(
      { ...EMPTY_DATA, recurringExpenses: [recurring] },
      "2026-01-31",
    );

    const deviceA = deleteExpenseFromData(
      shared,
      shared.expenses[0]!.id,
      "2026-02-01T10:00:00.000Z",
    );
    const changesFromA = diffAppData(shared, deviceA).map((change) => ({
      ...change,
      updatedAt:
        change.entityType === "recurring_occurrence_exclusion"
          ? change.updatedAt
          : "2026-02-01T10:00:00.000Z",
    }));

    const staleTemplate = {
      ...recurring,
      enabled: false,
      updatedAt: "2026-02-02T10:00:00.000Z",
    };
    const deviceB: AppData = {
      ...shared,
      recurringExpenses: [staleTemplate],
      meta: {
        lastModified: "2026-02-02T10:00:00.000Z",
        lastSyncedAt: "2026-01-31T10:00:00.000Z",
        pendingChanges: [
          {
            entityType: "recurring_expense",
            entityId: recurring.id,
            deleted: false,
            payload: staleTemplate,
            updatedAt: "2026-02-02T10:00:00.000Z",
          },
        ],
      },
    };

    const reconciledB = mergeRemoteOntoLocal(deviceB, changesFromA).data;
    expect(reconciledB.expenses).toEqual([]);
    expect(reconciledB.recurringExpenses[0]).toMatchObject({
      enabled: false,
      occurrenceExclusions: [
        {
          key: "recurring-two-devices:2026-01-31",
          excludedAt: "2026-02-01T10:00:00.000Z",
        },
      ],
    });

    const outgoingFromB = buildCloudUploadChanges(reconciledB);
    const staleOutgoingTemplate = outgoingFromB.find(
      (change) => change.entityType === "recurring_expense",
    )?.payload as RecurringExpense;
    expect(staleOutgoingTemplate.occurrenceExclusions).toHaveLength(1);
    expect(
      outgoingFromB.some(
        (change) =>
          change.entityType === "recurring_occurrence_exclusion" &&
          change.entityId === "recurring-two-devices:2026-01-31",
      ),
    ).toBe(true);

    // Reproduce el LWW real: B pisa el payload de plantilla de A, pero la fila
    // estable de exclusión sobrevive por tener otra clave de entidad.
    const serverRows = new Map<string, SyncChange>();
    for (const change of changesFromA) {
      serverRows.set(`${change.entityType}:${change.entityId}`, change);
    }
    serverRows.set(`recurring_expense:${recurring.id}`, {
      entityType: "recurring_expense",
      entityId: recurring.id,
      deleted: false,
      payload: staleTemplate,
      updatedAt: "2026-02-02T10:00:00.000Z",
    });

    const freshDevice = applySyncChanges(EMPTY_DATA, [...serverRows.values()]);
    const afterReload = syncRecurringExpenses(freshDevice, "2026-01-31");
    expect(afterReload.expenses).toEqual([]);
    expect(
      afterReload.recurringExpenses[0]?.occurrenceExclusions?.[0]?.key,
    ).toBe("recurring-two-devices:2026-01-31");
  });
});

describe("sync del expediente fiscal estructurado", () => {
  it("emite una única entidad de workspace y reconstruye una descarga completa", () => {
    const source: AppData = {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: fiscalWorkspace(),
    };
    const changes = diffAppData(EMPTY_DATA, source);
    const workspaceChanges = changes.filter(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );

    expect(workspaceChanges).toHaveLength(1);
    expect(workspaceChanges[0]).toMatchObject({
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
      deleted: false,
      payload: {
        storageKind: FISCAL_NOTIFICATIONS_WORKSPACE_STORAGE_KIND_V2,
        storageVersion: 1,
        workspace: { schemaVersion: 2, ownerScope: FISCAL_OWNER },
      },
    });
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        workspaceChanges[0]?.payload,
        FISCAL_OWNER,
      ),
    ).not.toBeNull();
    expect(applySyncChanges(EMPTY_DATA, workspaceChanges).fiscalNotificationsWorkspace)
      .toEqual({
        ...source.fiscalNotificationsWorkspace,
        driveArchives: [],
      });
    expect(
      appDataToSyncChanges(source).filter(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toHaveLength(1);
  });

  it("solo pone el envelope V2 sanitizado en cola y rehidrata una vista V1 segura", () => {
    const source = fiscalWorkspaceWithPrivateDocument();
    const changes = diffAppData(EMPTY_DATA, {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: source,
    }).filter(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.entityId).toBe(
      FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    );
    expect(JSON.stringify(changes[0]?.payload)).not.toMatch(
      /Título privado|PERSONA PRIVADA|00000000T|titleRaw|taxIdNormalized/iu,
    );
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        changes[0]?.payload,
        FISCAL_OWNER,
      ),
    ).not.toBeNull();

    const hydrated = applySyncChanges(EMPTY_DATA, changes)
      .fiscalNotificationsWorkspace;
    expect(hydrated).toMatchObject({
      schemaVersion: 1,
      ownerScope: FISCAL_OWNER,
      documents: [
        expect.objectContaining({
          id: "document:sync-privacy:1",
          titleRaw: "Generic administrative notice",
          subjectParty: { matchesBusinessProfile: "MATCH" },
        }),
      ],
    });
    expect(JSON.stringify(hydrated)).not.toMatch(
      /Título privado|PERSONA PRIVADA|00000000T/iu,
    );
  });

  it("sincroniza avances append-only y no degrada una revisión más nueva", () => {
    const base: AppData = {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: fiscalWorkspace(),
    };
    const advanced: AppData = {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: fiscalWorkspace(1),
    };
    expect(
      diffAppData(base, advanced).filter(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toHaveLength(1);
    expect(
      diffAppData(advanced, base).filter(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toHaveLength(0);

    const staleRemote: SyncChange = {
      entityType: "fiscal_notifications_workspace",
      // A legacy row is accepted only through the explicit V1 -> envelope V2
      // -> safe in-memory V1 migration in the diff boundary.
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1,
      deleted: false,
      payload: fiscalWorkspace(),
      updatedAt: "2026-07-14T09:02:00.000Z",
    };
    expect(
      mergeRemoteOntoLocal(advanced, [staleRemote]).data
        .fiscalNotificationsWorkspace,
    ).toEqual(advanced.fiscalNotificationsWorkspace);
  });

  it("mantiene el estado local ante una rama divergente o un payload inválido", () => {
    const localWorkspace = fiscalWorkspace(1);
    const local: AppData = {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: localWorkspace,
    };
    const divergent = fiscalWorkspace(1);
    divergent.packages[0]!.id = "package-divergent";
    const rawSensitive = {
      ...fiscalWorkspace(1),
      rawPdfText: "private source text",
    };
    const remote = (payload: unknown): SyncChange => ({
      entityType: "fiscal_notifications_workspace",
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
      deleted: false,
      payload,
      updatedAt: "2026-07-14T09:02:00.000Z",
    });

    expect(applySyncChanges(local, [remote(divergent)])).toEqual(local);
    expect(applySyncChanges(local, [remote(rawSensitive)])).toEqual(local);
    expect(
      diffAppData(EMPTY_DATA, {
        ...EMPTY_DATA,
        fiscalNotificationsWorkspace: rawSensitive as never,
      }).some(
        (change) => change.entityType === "fiscal_notifications_workspace",
      ),
    ).toBe(false);
  });

  it("conserva en cola el avance monotónico y descarta sobres inválidos", () => {
    const first = diffAppData(EMPTY_DATA, {
      ...EMPTY_DATA,
      fiscalNotificationsWorkspace: fiscalWorkspace(),
    }).filter(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    const second = diffAppData(
      {
        ...EMPTY_DATA,
        fiscalNotificationsWorkspace: fiscalWorkspace(),
      },
      {
        ...EMPTY_DATA,
        fiscalNotificationsWorkspace: fiscalWorkspace(1),
      },
    ).filter(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    const invalid: SyncChange = {
      entityType: "fiscal_notifications_workspace",
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
      deleted: false,
      payload: { ownerScope: FISCAL_OWNER, rawPdfText: "private" },
      updatedAt: "2026-07-14T09:02:00.000Z",
    };
    const legacyFirst: SyncChange = {
      entityType: "fiscal_notifications_workspace",
      entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V1,
      deleted: false,
      payload: fiscalWorkspace(),
      updatedAt: FISCAL_NOW,
    };
    const tracked = trackDataDiff(
      {
        ...EMPTY_DATA,
        fiscalNotificationsWorkspace: fiscalWorkspace(),
        meta: { lastModified: FISCAL_NOW, pendingChanges: [legacyFirst] },
      },
      {
        ...EMPTY_DATA,
        fiscalNotificationsWorkspace: fiscalWorkspace(1),
      },
    );
    const trackedFiscal = tracked.meta?.pendingChanges?.find(
      (change) => change.entityType === "fiscal_notifications_workspace",
    );
    expect(trackedFiscal?.entityId).toBe(
      FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    );
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        trackedFiscal?.payload,
        FISCAL_OWNER,
      )?.workspace,
    ).toMatchObject({ schemaVersion: 2, revision: 1 });
    expect(trackedFiscal?.payload).not.toMatchObject({ schemaVersion: 1 });
    const uploadChanges = buildCloudUploadChanges({
        ...tracked,
        meta: {
          ...tracked.meta!,
          pendingChanges: [...(tracked.meta?.pendingChanges ?? []), invalid],
        },
      }).filter(
        (change) => change.entityType === "fiscal_notifications_workspace",
      );
    expect(uploadChanges).toHaveLength(1);
    expect(uploadChanges[0]?.entityId).toBe(
      FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    );
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        uploadChanges[0]?.payload,
        FISCAL_OWNER,
      )?.workspace.revision,
    ).toBe(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.entityId).toBe(
      FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    );
  });

  it("mantiene la cabeza en cola ante envelopes divergentes", () => {
    const current = fiscalWorkspaceChangeForTest(fiscalWorkspace(1));
    const divergentPayload = structuredClone(current.payload) as {
      workspace: { workspaceId: string };
    };
    divergentPayload.workspace.workspaceId =
      "fiscal-notifications-workspace-divergent";
    const divergent: SyncChange = {
      ...current,
      payload: divergentPayload,
      updatedAt: "2026-07-14T09:02:00.000Z",
    };

    const merged = mergePendingChanges([current], [divergent]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.entityId).toBe(
      FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    );
    expect(
      parseFiscalNotificationsWorkspaceStorageEnvelopeV2(
        merged[0]?.payload,
        FISCAL_OWNER,
      )?.workspace.workspaceId,
    ).toBe("fiscal-notifications-workspace-v1");
    expect(clearSyncedChanges([divergent], [current])).toEqual([
      expect.objectContaining({
        entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
      }),
    ]);
  });

  it("no borra una revisión fiscal más nueva mientras termina un sync anterior", () => {
    const sent = fiscalWorkspaceChangeForTest(fiscalWorkspace());
    const pendingNewer = fiscalWorkspaceChangeForTest(fiscalWorkspace(1));
    expect(clearSyncedChanges([pendingNewer], [sent])).toEqual([pendingNewer]);
    expect(clearSyncedChanges([sent], [sent])).toEqual([]);
  });
});

function fiscalWorkspaceChangeForTest(
  workspace: FiscalNotificationsWorkspace,
): SyncChange {
  const envelope = encodeFiscalNotificationsWorkspaceForStorageV2(workspace);
  if (!envelope) throw new Error("No se pudo codificar el fixture fiscal");
  return {
    entityType: "fiscal_notifications_workspace",
    entityId: FISCAL_NOTIFICATIONS_WORKSPACE_SYNC_ENTITY_ID_V2,
    deleted: false,
    payload: envelope,
    updatedAt: workspace.updatedAt,
  };
}
