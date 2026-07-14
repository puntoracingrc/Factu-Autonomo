import { describe, expect, it } from "vitest";
import { DEFAULT_DOCUMENT_TEMPLATE } from "@/lib/document-templates";
import {
  EMPTY_DATA,
  type AppData,
  type Document,
  type DocumentSnapshot,
  type VerifactuInfo,
} from "@/lib/types";
import {
  applyTestDocumentRetirement,
  buildTestDocumentRetirementPreview,
  buildTestDocumentRetirementRollbackPreview,
  getReservedTestDocumentIdentities,
  rollbackTestDocumentRetirement,
  testDocumentRetirementExportableDataFingerprint,
  type TestDocumentRetirementBackupEvidenceV1,
  type TestDocumentRetirementWorkspace,
} from "./test-document-retirement";

const TENANT = `sha256:${"a".repeat(64)}`;
const OTHER_TENANT = `sha256:${"b".repeat(64)}`;
const APPLIED_AT = "2026-07-14T06:30:00.000Z";
const ROLLED_BACK_AT = "2026-07-14T06:40:00.000Z";
const REAPPLIED_AT = "2026-07-14T06:50:00.000Z";

const SELECTED_IDS = [
  "test-invoice-pair",
  "test-receipt-pair",
  "test-invoice-isolated",
  "test-receipt-a",
  "test-receipt-b",
] as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function baseDocument(
  id: string,
  number: string,
  type: Document["type"] = "factura",
  overrides: Partial<Document> = {},
): Document {
  return {
    id,
    type,
    number,
    date: "2026-06-10",
    client: { name: `Cliente sintético ${id}` },
    items: [
      {
        id: `${id}-line-1`,
        description: "Servicio sintético",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    paymentStatus: "paid",
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    ...overrides,
  };
}

function snapshotFor(
  document: Document,
  sourceDocumentId?: string,
  verifactu?: VerifactuInfo,
): DocumentSnapshot {
  return {
    schemaVersion: 1,
    capturedAt: "2026-06-10T08:00:00.000Z",
    source: "issue",
    documentType: document.type,
    documentKind: document.type,
    number: document.number,
    date: document.date,
    issuer: {
      name: "Emisor sintético",
      nif: "B00000000",
      address: "Calle sintética 1",
      city: "Ciudad",
      postalCode: "00000",
      capturedAt: "2026-06-10T08:00:00.000Z",
    },
    customer: clone(document.client),
    items: [
      {
        id: `${document.id}-line-1`,
        description: "Servicio sintético",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
        subtotal: 100,
        ivaAmount: 21,
        total: 121,
      },
    ],
    taxSummary: {
      subtotal: 100,
      iva: 21,
      total: 121,
      vatExempt: false,
      byRate: [{ ivaPercent: 21, taxableBase: 100, ivaAmount: 21, total: 121 }],
    },
    currency: "EUR",
    sourceDocumentId,
    numbering: {
      documentKind: document.type,
      number: document.number,
      year: 2026,
      format: {
        template:
          document.type === "recibo" ? "R-{year}-{num}" : "F-{year}-{num}",
        padding: 4,
      },
    },
    fiscalContext: {
      vatExempt: false,
      iva: { rates: [0, 4, 10, 21], defaultRate: 21 },
      verifactu: { enabled: false, environment: "test" },
    },
    verifactu,
    snapshotHash: `sha256:${"1".repeat(64)}`,
  };
}

function withModernBundle(
  document: Document,
  sourceDocumentId?: string,
): Document {
  return {
    ...document,
    documentSnapshot: snapshotFor(document, sourceDocumentId),
    pdfSnapshot: {
      schemaVersion: 1,
      renderedAt: "2026-06-10T08:00:01.000Z",
      rendererVersion: "document-pdf-renderer-v1",
      template: clone(DEFAULT_DOCUMENT_TEMPLATE),
      contentHash: `sha256:${"2".repeat(64)}`,
    },
    snapshotSeal: {
      version: 1,
      documentId: document.id,
      contextHash: `sha256:${"3".repeat(64)}`,
      documentContentHash: `sha256:${"4".repeat(64)}`,
      pdfContentHash: `sha256:${"5".repeat(64)}`,
      documentSnapshotHash: `sha256:${"6".repeat(64)}`,
      pdfSnapshotHash: `sha256:${"7".repeat(64)}`,
    },
    snapshotIntegrityRequired: true,
  };
}

function fixture(): TestDocumentRetirementWorkspace {
  const pairInvoice = baseDocument(
    "test-invoice-pair",
    "TEST-F-0001",
    "factura",
    { receiptDocumentId: "test-receipt-pair" },
  );
  const pairReceiptBase = baseDocument(
    "test-receipt-pair",
    "TEST-R-0001",
    "recibo",
    { sourceDocumentId: pairInvoice.id },
  );
  const pairReceipt = {
    ...pairReceiptBase,
    documentSnapshot: snapshotFor(pairReceiptBase, pairInvoice.id),
  };
  const isolatedInvoice = baseDocument("test-invoice-isolated", "TEST-F-0002");
  const preservedA = withModernBundle(
    baseDocument("preserved-invoice-a", "APP-F-0100", "factura", {
      receiptDocumentId: "test-receipt-a",
      notes: "Bundle moderno que debe quedar byte-semánticamente intacto",
    }),
  );
  const receiptA = baseDocument("test-receipt-a", "TEST-R-0002", "recibo", {
    sourceDocumentId: preservedA.id,
  });
  const preservedB = withModernBundle(
    baseDocument("preserved-invoice-b", "APP-F-0101", "factura", {
      receiptDocumentId: "test-receipt-b",
      notes: "Segundo bundle moderno intacto",
    }),
  );
  const receiptB = withModernBundle(
    baseDocument("test-receipt-b", "TEST-R-0003", "recibo", {
      sourceDocumentId: preservedB.id,
    }),
    preservedB.id,
  );
  const untouched = withModernBundle(
    baseDocument("untouched-invoice", "APP-F-0102"),
  );

  return {
    ...(clone(EMPTY_DATA) as AppData),
    profile: { ...clone(EMPTY_DATA.profile), name: "Tenant sintético" },
    documents: [
      untouched,
      pairInvoice,
      pairReceipt,
      isolatedInvoice,
      preservedA,
      receiptA,
      preservedB,
      receiptB,
    ],
    counters: {
      factura: 102,
      factura_rectificativa: 0,
      presupuesto: 0,
      recibo: 3,
    },
    meta: {
      lastModified: "2026-07-14T06:00:00.000Z",
      lastSyncedAt: "2026-07-14T06:00:00.000Z",
    },
  };
}

function request(ids: readonly string[] = SELECTED_IDS) {
  return { selectedDocumentIds: ids, tenantFingerprint: TENANT };
}

function backup(
  fingerprint: string,
  createdAt = "2026-07-14T06:29:00.000Z",
): TestDocumentRetirementBackupEvidenceV1 {
  return {
    filename:
      "factu-autonomo-backup-antes-retirar-pruebas-2026-07-14-08-29-00.json",
    createdAt,
    exportableDataFingerprint: fingerprint,
    contentSha256: `sha256:${"c".repeat(64)}`,
    byteLength: 1_024,
    disposition: "browser_download_requested",
  };
}

function appliedFixture() {
  const data = fixture();
  const preview = buildTestDocumentRetirementPreview(data, request());
  const result = applyTestDocumentRetirement(
    data,
    preview,
    APPLIED_AT,
    TENANT,
    backup(testDocumentRetirementExportableDataFingerprint(data)),
  );
  if (result.status === "blocked") {
    throw new Error(`fixture blocked: ${result.reason}`);
  }
  return {
    before: data,
    preview,
    applied: result.data,
    batchId: result.batchId,
  };
}

describe("explicit test document retirement", () => {
  it("previews the exact five synthetic documents and two surviving backlinks without mutation", () => {
    const data = fixture();
    const before = clone(data);
    const preview = buildTestDocumentRetirementPreview(data, request());

    expect(preview.blockers).toEqual([]);
    expect(preview.affectedCount).toBe(5);
    expect(preview.candidate?.selectedDocumentIds).toEqual(SELECTED_IDS);
    expect(
      preview.candidate?.backlinkChanges.map((change) => change.documentId),
    ).toEqual(["preserved-invoice-a", "preserved-invoice-b"]);
    expect(
      preview.candidate?.backlinkChanges.map((change) => ({
        before: change.before.receiptDocumentId,
        after: change.after.receiptDocumentId,
      })),
    ).toEqual([
      { before: "test-receipt-a", after: undefined },
      { before: "test-receipt-b", after: undefined },
    ]);
    expect(preview.selectionFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(preview.candidate?.batchId).toMatch(
      /^test-document-retirement:v1:[a-f0-9]{64}$/,
    );
    expect(data).toEqual(before);
  });

  it("applies atomically, preserves modern bundles and reserves IDs/numbers", () => {
    const data = fixture();
    const before = clone(data);
    const preview = buildTestDocumentRetirementPreview(data, request());
    const exportableFingerprint =
      testDocumentRetirementExportableDataFingerprint(data);
    const result = applyTestDocumentRetirement(
      data,
      preview,
      APPLIED_AT,
      TENANT,
      backup(exportableFingerprint),
    );
    expect(result.status).toBe("applied");
    if (result.status === "blocked") return;

    expect(result.data.documents.map((document) => document.id)).toEqual([
      "untouched-invoice",
      "preserved-invoice-a",
      "preserved-invoice-b",
    ]);
    for (const id of ["preserved-invoice-a", "preserved-invoice-b"] as const) {
      const original = before.documents.find((document) => document.id === id)!;
      const current = result.data.documents.find(
        (document) => document.id === id,
      )!;
      const { receiptDocumentId: _removed, ...expected } = original;
      void _removed;
      expect(current).toEqual(expected);
      expect(current.documentSnapshot).toEqual(original.documentSnapshot);
      expect(current.pdfSnapshot).toEqual(original.pdfSnapshot);
      expect(current.snapshotSeal).toEqual(original.snapshotSeal);
    }
    expect(result.data.documents[0]).toEqual(before.documents[0]);
    expect(data).toEqual(before);

    const batch = result.data.testDocumentRetirementBatches?.[0];
    expect(batch?.status).toBe("applied");
    expect(batch?.retiredDocuments.map(({ document }) => document.id)).toEqual(
      SELECTED_IDS,
    );
    expect(batch?.events).toEqual([
      expect.objectContaining({
        action: "applied",
        backup: backup(exportableFingerprint),
      }),
    ]);
    expect(getReservedTestDocumentIdentities(result.data)).toEqual(
      preview.candidate?.reservedIdentities,
    );
    expect(result.data.counters).toEqual(before.counters);
  });

  it("allows an unconfirmed TEST artifact but blocks server-confirmed and production evidence", () => {
    const testRecord: VerifactuInfo = {
      recordHash: "8".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-06-10T08:00:00.000Z",
      qrUrl: "https://example.invalid/test",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
    };
    const allowed = fixture();
    const isolated = allowed.documents.find(
      (document) => document.id === "test-invoice-isolated",
    )!;
    isolated.verifactu = testRecord;
    isolated.verifactuPersistence = "legacy_unverified";
    expect(
      buildTestDocumentRetirementPreview(allowed, request()).blockers,
    ).toEqual([]);

    const protectedCases: TestDocumentRetirementWorkspace[] = [
      (() => {
        const data = fixture();
        data.documents.find(
          (document) => document.id === "test-invoice-isolated",
        )!.verifactuPersistence = "server_confirmed";
        return data;
      })(),
      (() => {
        const data = fixture();
        data.documents.find(
          (document) => document.id === "test-invoice-isolated",
        )!.verifactu = { ...testRecord, environment: "production" };
        return data;
      })(),
      (() => {
        const data = fixture();
        data.documents.find(
          (document) => document.id === "test-invoice-isolated",
        )!.verifactu = { ...testRecord, status: "registered" };
        return data;
      })(),
    ];
    for (const data of protectedCases) {
      expect(
        buildTestDocumentRetirementPreview(data, request()).blockers,
      ).toContainEqual({
        reason: "verifactu_protected",
        documentId: "test-invoice-isolated",
      });
    }
  });

  it("requires exact receipt reciprocity and explicit selection of both members of a retired pair", () => {
    const missingPairMember = buildTestDocumentRetirementPreview(
      fixture(),
      request(SELECTED_IDS.filter((id) => id !== "test-receipt-pair")),
    );
    expect(missingPairMember.blockers).toContainEqual({
      reason: "relationship_ambiguous",
      documentId: "test-invoice-pair",
      relatedDocumentId: "test-receipt-pair",
    });

    const ambiguous = fixture();
    ambiguous.documents.push(
      baseDocument("duplicate-receipt-claim", "TEST-R-0999", "recibo", {
        sourceDocumentId: "preserved-invoice-a",
      }),
    );
    expect(
      buildTestDocumentRetirementPreview(ambiguous, request()).blockers,
    ).toContainEqual({
      reason: "relationship_ambiguous",
      documentId: "test-receipt-a",
      relatedDocumentId: "preserved-invoice-a",
    });
  });

  it.each([
    "rectification",
    "snapshot_rectification",
    "rectified_by",
  ] as const)(
    "blocks retiring only the receipt when its surviving invoice has protected %s evidence",
    (evidence) => {
      const data = fixture();
      const invoice = data.documents.find(
        (document) => document.id === "preserved-invoice-a",
      )!;
      if (evidence === "rectification") {
        invoice.rectification = {
          originalDocumentId: "synthetic-original",
          originalNumber: "APP-F-0099",
          originalDate: "2026-06-09",
          type: "correccion",
          reason: "Corrección sintética",
        };
      } else if (evidence === "snapshot_rectification") {
        invoice.documentSnapshot!.rectification = {
          originalDocumentId: "synthetic-original",
          originalNumber: "APP-F-0099",
          originalDate: "2026-06-09",
          type: "correccion",
          reason: "Corrección sintética",
        };
      } else {
        invoice.rectifiedById = "synthetic-rectification";
      }

      const before = clone(data);
      const preview = buildTestDocumentRetirementPreview(
        data,
        request(["test-receipt-a"]),
      );

      expect(preview.blockers).toContainEqual({
        reason: "rectification_relationship",
        documentId: "test-receipt-a",
        relatedDocumentId:
          evidence === "rectified_by"
            ? "synthetic-rectification"
            : "synthetic-original",
      });
      expect(preview.candidate).toBeNull();
      expect(data).toEqual(before);
      expect(invoice.receiptDocumentId).toBe("test-receipt-a");
    },
  );

  it("blocks expense and reminder references without changing their data", () => {
    const expenseData = fixture();
    expenseData.expenses.push({
      id: "expense-1",
      date: "2026-06-10",
      supplierName: "Proveedor sintético",
      description: "Referencia externa",
      amount: 10,
      ivaPercent: 21,
      category: "Otros",
      paymentMethod: "Tarjeta",
      workDocumentId: "test-invoice-isolated",
      createdAt: "2026-06-10T09:00:00.000Z",
    });
    const expenseBefore = clone(expenseData);
    expect(
      buildTestDocumentRetirementPreview(expenseData, request()).blockers,
    ).toContainEqual({
      reason: "external_reference",
      documentId: "test-invoice-isolated",
    });
    expect(expenseData).toEqual(expenseBefore);

    const reminderData = fixture();
    reminderData.userReminders.push({
      id: "reminder-1",
      text: "Revisar documento sintético",
      link: { kind: "document", entityId: "test-invoice-isolated" },
      target: "self",
      completed: false,
      createdAt: "2026-06-10T09:00:00.000Z",
      updatedAt: "2026-06-10T09:00:00.000Z",
    });
    expect(
      buildTestDocumentRetirementPreview(reminderData, request()).blockers,
    ).toContainEqual({
      reason: "external_reference",
      documentId: "test-invoice-isolated",
    });
  });

  it("ignores sync-only metadata but blocks any business-state or tenant change", () => {
    const data = fixture();
    const preview = buildTestDocumentRetirementPreview(data, request());
    const exportableFingerprint =
      testDocumentRetirementExportableDataFingerprint(data);
    const metadataOnly = {
      ...data,
      meta: {
        ...data.meta!,
        lastModified: "2026-07-14T06:31:00.000Z",
        lastSyncedAt: "2026-07-14T06:31:00.000Z",
      },
    };
    const metadataResult = applyTestDocumentRetirement(
      metadataOnly,
      preview,
      APPLIED_AT,
      TENANT,
      backup(exportableFingerprint),
    );
    expect(metadataResult.status).toBe("applied");
    if (metadataResult.status !== "blocked") {
      expect(metadataResult.data.meta).toEqual(metadataOnly.meta);
    }

    const changedBusiness = {
      ...data,
      profile: { ...data.profile, name: "Cambio posterior" },
    };
    expect(
      applyTestDocumentRetirement(
        changedBusiness,
        preview,
        APPLIED_AT,
        TENANT,
        backup(exportableFingerprint),
      ),
    ).toEqual({ status: "blocked", reason: "stale_preview" });
    expect(
      applyTestDocumentRetirement(
        data,
        preview,
        APPLIED_AT,
        OTHER_TENANT,
        backup(exportableFingerprint),
      ),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });
  });

  it("requires a timestamped, matching backup proof before apply", () => {
    const data = fixture();
    const preview = buildTestDocumentRetirementPreview(data, request());
    const exportableFingerprint =
      testDocumentRetirementExportableDataFingerprint(data);
    expect(
      applyTestDocumentRetirement(data, preview, APPLIED_AT, TENANT, {
        ...backup(exportableFingerprint),
        filename: "not-a-backup.json",
      }),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });
    expect(
      applyTestDocumentRetirement(data, preview, APPLIED_AT, TENANT, {
        ...backup(exportableFingerprint),
        exportableDataFingerprint: `sha256:${"0".repeat(64)}`,
      }),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });
    expect(
      applyTestDocumentRetirement(data, preview, APPLIED_AT, TENANT, {
        ...backup(exportableFingerprint),
        contentSha256: "sha256:not-a-hash",
      }),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });
    expect(
      applyTestDocumentRetirement(data, preview, APPLIED_AT, TENANT, {
        ...backup(exportableFingerprint),
        byteLength: 0,
      }),
    ).toEqual({ status: "blocked", reason: "candidate_invalid" });
  });

  it("is idempotent, rolls back exactly, keeps append-only events and can reapply", () => {
    const { before, preview, applied, batchId } = appliedFixture();
    const replay = applyTestDocumentRetirement(
      applied,
      preview,
      APPLIED_AT,
      TENANT,
      backup(testDocumentRetirementExportableDataFingerprint(before)),
    );
    expect(replay.status).toBe("already_applied");

    const rollbackPreview = buildTestDocumentRetirementRollbackPreview(
      applied,
      batchId,
      TENANT,
    );
    expect(rollbackPreview.affectedCount).toBe(5);
    const rollbackBackupFingerprint =
      testDocumentRetirementExportableDataFingerprint(applied);
    const rolledBack = rollbackTestDocumentRetirement(
      applied,
      rollbackPreview,
      ROLLED_BACK_AT,
      TENANT,
      backup(rollbackBackupFingerprint, "2026-07-14T06:39:00.000Z"),
    );
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status === "blocked") return;
    expect(rolledBack.data.documents).toEqual(before.documents);
    expect(rolledBack.data.counters).toEqual(before.counters);
    expect(rolledBack.data.testDocumentRetirementBatches?.[0]?.events).toEqual([
      expect.objectContaining({ action: "applied" }),
      expect.objectContaining({ action: "rolled_back" }),
    ]);
    expect(getReservedTestDocumentIdentities(rolledBack.data)).toHaveLength(5);

    const doubleRollback = rollbackTestDocumentRetirement(
      rolledBack.data,
      rollbackPreview,
      ROLLED_BACK_AT,
      TENANT,
      backup(rollbackBackupFingerprint, "2026-07-14T06:39:00.000Z"),
    );
    expect(doubleRollback.status).toBe("already_rolled_back");

    const reapplyPreview = buildTestDocumentRetirementPreview(
      rolledBack.data,
      request(),
    );
    const reapplied = applyTestDocumentRetirement(
      rolledBack.data,
      reapplyPreview,
      REAPPLIED_AT,
      TENANT,
      backup(
        testDocumentRetirementExportableDataFingerprint(rolledBack.data),
        "2026-07-14T06:49:00.000Z",
      ),
    );
    expect(reapplied.status).toBe("applied");
    if (reapplied.status === "blocked") return;
    expect(
      reapplied.data.testDocumentRetirementBatches?.[0]?.events.map(
        (event) => event.action,
      ),
    ).toEqual(["applied", "rolled_back", "applied"]);
  });

  it("blocks rollback after any later business change or under another tenant", () => {
    const { applied, batchId } = appliedFixture();
    const preview = buildTestDocumentRetirementRollbackPreview(
      applied,
      batchId,
      TENANT,
    );
    const changed = {
      ...applied,
      counters: { ...applied.counters, factura: applied.counters.factura + 1 },
    };
    expect(
      rollbackTestDocumentRetirement(
        changed,
        preview,
        ROLLED_BACK_AT,
        TENANT,
        backup(preview.precondition),
      ),
    ).toEqual({ status: "blocked", reason: "stale_preview" });
    expect(
      buildTestDocumentRetirementRollbackPreview(applied, batchId, OTHER_TENANT)
        .blockers,
    ).toEqual([{ reason: "retirement_record_invalid" }]);
  });

  it("detects archive tampering and never releases recognizable reservations", () => {
    const { applied, batchId } = appliedFixture();
    const tampered = clone(applied);
    tampered.testDocumentRetirementBatches![0]!.reservedIdentities[0]!.number =
      "TAMPERED";
    const rollback = buildTestDocumentRetirementRollbackPreview(
      tampered,
      batchId,
      TENANT,
    );
    expect(rollback.blockers).toEqual([
      { reason: "retirement_record_invalid" },
    ]);
    expect(getReservedTestDocumentIdentities(tampered)).toHaveLength(5);
  });

  it("keeps retired numbering reserved even when a new active ID reuses it", () => {
    const { applied } = appliedFixture();
    const reused = baseDocument("new-id-with-old-number", "TEST-F-0002");
    const changed = { ...applied, documents: [...applied.documents, reused] };
    const preview = buildTestDocumentRetirementPreview(changed, {
      selectedDocumentIds: [reused.id],
      tenantFingerprint: TENANT,
    });
    expect(preview.blockers).toContainEqual({
      reason: "identity_reserved",
      documentId: "test-invoice-isolated",
    });
  });
});
