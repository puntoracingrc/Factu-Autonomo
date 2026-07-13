import { describe, expect, it } from "vitest";
import {
  applySyncChanges,
  appDataToSyncChanges,
  diffAppData,
  emptyCloudBootstrapData,
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
