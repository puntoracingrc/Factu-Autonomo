import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackupPayload, parseBackupJson } from "@/lib/backup";
import { buildAnnualSummaryPdf } from "@/lib/billing/export-annual-pdf";
import { buildQuarterlyExportCsv } from "@/lib/billing/export-quarterly";
import { selectCanonicalFiscalDocumentsForExport } from "@/lib/billing/fiscal-export-documents";
import { diffAppData, emptyCloudBootstrapData } from "@/lib/cloud/diff";
import {
  mergeRemoteOntoLocal,
  rebuildCloudSnapshot,
} from "@/lib/cloud/incremental";
import { collectedIncome } from "@/lib/income";
import {
  buildCustomerInvoicedTotals,
  customerInvoicedTotal,
} from "@/lib/customers";
import { buildProductBusinessSummary } from "@/lib/product-business-summary";
import { loadData, saveData } from "@/lib/storage";
import {
  calculateTaxSummary,
  selectTaxableFiscalDocumentsForPeriod,
} from "@/lib/taxes";
import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import type {
  AppData,
  AppIssuedDocumentRecoveryPdfEvidenceV1,
  BusinessProfile,
  Document,
} from "@/lib/types";
import { DEFAULT_PROFILE, EMPTY_DATA } from "@/lib/types";
import { documentAmounts } from "@/lib/vat-regime";
import {
  attachRegisteredVerifactuToSnapshots,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  buildDocumentSnapshotSeal,
  hashDocumentPdfSnapshot,
  hashDocumentSnapshot,
  issueDocument,
  markDocumentPaid,
} from "./index";
import {
  applyAppIssuedDocumentRecovery,
  buildAppIssuedDocumentRecoveryPreview,
  buildAppIssuedDocumentRecoveryRollbackPreview,
  inspectAppIssuedDocumentRecoveryCollection,
} from "./app-issued-recovery";
import {
  runAppIssuedDocumentRecoveryCommand,
  runAppIssuedDocumentRecoveryRollbackCommand,
} from "./app-issued-recovery-command";

const ISSUE_AT = "2026-07-06T10:00:00.000Z";
const REPAIR_AT = "2026-07-13T10:00:00.000Z";
const BACKUP_AT = "2026-07-13T10:30:00.000Z";
const RECTIFICATION_ID = "synthetic:modern-recovery:rectification";
const RECEIPT_ID = "synthetic:modern-recovery:receipt";
const PROTECTED_VERIFACTU_ID = "synthetic:unaffected:verifactu";
const STANDALONE_ID = "55555555-5555-4555-8555-555555555555";

const PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Negocio Sintético de Pruebas SL",
  nif: "B12345678",
  address: "Calle Sintética 1",
  city: "Madrid",
  postalCode: "28001",
  email: "negocio-sintetico@example.invalid",
  phone: "600000000",
  verifactu: { enabled: false, environment: "test" },
};

function draftInvoice(
  id: string,
  number: string,
  date = "2026-07-06",
): Document {
  return {
    id,
    type: "factura",
    number,
    date,
    client: {
      name: "Cliente Sintético SL",
      nif: "B87654321",
      address: "Calle Cliente Sintético 2",
      city: "Madrid",
      postalCode: "28002",
    },
    items: [
      {
        id: `${id}:line:synthetic`,
        description: "Servicio completamente sintético",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    createdAt: ISSUE_AT,
    updatedAt: ISSUE_AT,
  };
}

function rectificationPair(): [Document, Document] {
  const issued = issueDocument(
    draftInvoice(
      "synthetic:modern-recovery:rectification-original",
      "F-SYNTH-RECT-001",
    ),
    PROFILE,
    ISSUE_AT,
  );
  const rectification: Document = {
    ...draftInvoice(RECTIFICATION_ID, "FR-SYNTH-RECT-001"),
    client: {
      ...issued.client,
      name: "Cliente Sintético Corregido SL",
    },
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus: "sent",
    paymentStatus: "paid",
    issuedAt: ISSUE_AT,
    sentAt: ISSUE_AT,
    paidAt: ISSUE_AT,
    issuer: issued.issuer,
    rectification: {
      type: "correccion",
      reason: "Corrección sintética de datos",
      originalDocumentId: issued.id,
      originalNumber: issued.number,
      originalDate: issued.date,
    },
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
  };
  const original: Document = {
    ...issued,
    status: "rectificada",
    rectifiedById: rectification.id,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["document_relationship_invalid"],
    },
  };
  return [original, rectification];
}

function receiptPair(): [Document, Document] {
  const paidInvoice = markDocumentPaid(
    issueDocument(
      draftInvoice(
        "synthetic:modern-recovery:receipt-invoice",
        "F-SYNTH-RECEIPT-001",
      ),
      PROFILE,
      ISSUE_AT,
    ),
    ISSUE_AT,
  );
  const baseReceipt: Document = {
    ...draftInvoice(RECEIPT_ID, "R-SYNTH-001"),
    type: "recibo",
    date: paidInvoice.date,
    client: { ...paidInvoice.client },
    items: paidInvoice.items.map((item) => ({
      ...item,
      id: `${RECEIPT_ID}:${item.id}`,
    })),
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    deliveryStatus: "sent",
    paymentStatus: "paid",
    issuedAt: ISSUE_AT,
    sentAt: ISSUE_AT,
    paidAt: ISSUE_AT,
    sourceDocumentId: paidInvoice.id,
    notes: `Pago de la factura ${paidInvoice.number}`,
  };
  const oldSnapshot = buildDocumentSnapshot(
    { ...baseReceipt, sourceDocumentId: undefined },
    PROFILE,
    {
      capturedAt: ISSUE_AT,
      source: "issue",
      issuer: paidInvoice.documentSnapshot!.issuer,
    },
  );
  const oldPdfSnapshot = buildDocumentPdfSnapshot(
    oldSnapshot,
    PROFILE,
    ISSUE_AT,
  );
  const receipt: Document = {
    ...baseReceipt,
    issuer: oldSnapshot.issuer,
    documentSnapshot: oldSnapshot,
    pdfSnapshot: oldPdfSnapshot,
    snapshotSeal: buildDocumentSnapshotSeal(
      baseReceipt.id,
      oldSnapshot,
      oldPdfSnapshot,
    ),
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["document_relationship_invalid"],
    },
  };
  return [{ ...paidInvoice, receiptDocumentId: receipt.id }, receipt];
}

function receiptV2Workspace(): { before: AppData; recovered: AppData } {
  const invoiceId = "66666666-6666-4666-8666-666666666666";
  const receiptId = "77777777-7777-4777-8777-777777777777";
  const paid = markDocumentPaid(
    issueDocument(
      draftInvoice(invoiceId, "F-SYNTH-RECEIPT-V2"),
      PROFILE,
      ISSUE_AT,
    ),
    ISSUE_AT,
  );
  const invoiceSnapshot = buildDocumentSnapshot(paid, PROFILE, {
    capturedAt: ISSUE_AT,
    source: "legacy_backfill",
    issuer: paid.documentSnapshot!.issuer,
  });
  const invoicePdf = buildDocumentPdfSnapshot(
    invoiceSnapshot,
    PROFILE,
    ISSUE_AT,
  );
  const invoice: Document = {
    ...paid,
    receiptDocumentId: receiptId,
    documentSnapshot: invoiceSnapshot,
    pdfSnapshot: invoicePdf,
    snapshotSeal: buildDocumentSnapshotSeal(
      invoiceId,
      invoiceSnapshot,
      invoicePdf,
    ),
    snapshotIntegrityRequired: true,
    snapshotIntegrity: undefined,
  };
  delete invoice.paymentStatus;
  delete invoice.paidAt;
  const receiptBase: Document = {
    ...draftInvoice(receiptId, "R-SYNTH-RECEIPT-V2"),
    type: "recibo",
    date: paid.date,
    client: structuredClone(paid.client),
    items: paid.items.map((item) => ({
      ...item,
      id: `${receiptId}:${item.id}`,
    })),
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    issuedAt: ISSUE_AT,
    notes: `Pago de la factura ${paid.number}`,
  };
  const receiptSnapshot = buildDocumentSnapshot(receiptBase, PROFILE, {
    capturedAt: ISSUE_AT,
    source: "legacy_backfill",
    issuer: invoiceSnapshot.issuer,
  });
  const receiptPdf = buildDocumentPdfSnapshot(
    receiptSnapshot,
    PROFILE,
    ISSUE_AT,
  );
  const receipt: Document = {
    ...receiptBase,
    sourceDocumentId: invoiceId,
    documentSnapshot: receiptSnapshot,
    pdfSnapshot: receiptPdf,
    snapshotSeal: buildDocumentSnapshotSeal(
      receiptId,
      receiptSnapshot,
      receiptPdf,
    ),
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["document_relationship_invalid"],
    },
  };
  const before: AppData = {
    ...EMPTY_DATA,
    profile: PROFILE,
    documents: [invoice, receipt],
  };
  const preview = buildAppIssuedDocumentRecoveryPreview(before);
  expect(preview.candidates.map((candidate) => candidate.recoveryKind)).toEqual([
    "receipt_source_and_payment_markers_gap_v1",
  ]);
  const applied = runAppIssuedDocumentRecoveryCommand({
    expected: before,
    preview,
    now: REPAIR_AT,
    commit: appliedCommit,
  });
  if (applied.status !== "applied") {
    throw new Error(`receipt_v2_recovery_failed:${applied.reason}`);
  }
  return { before, recovered: applied.data };
}

function unaffectedVerifactuDocument(): Document {
  const verifactuProfile: BusinessProfile = {
    ...PROFILE,
    verifactu: {
      enabled: true,
      environment: "test",
      optInVersion: 1,
    },
  };
  const issued = issueDocument(
    draftInvoice(PROTECTED_VERIFACTU_ID, "F-SYNTH-VERIFACTU-001", "2025-01-15"),
    verifactuProfile,
    "2025-01-15T10:00:00.000Z",
  );
  return attachRegisteredVerifactuToSnapshots({
    ...issued,
    verifactuPersistence: "server_confirmed",
    verifactu: {
      recordHash: "A".repeat(64),
      previousHash: "",
      recordTimestamp: "2025-01-15T11:00:00+01:00",
      qrUrl: "https://example.invalid/synthetic-verifactu",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
      submittedAt: "2025-01-15T10:00:00.000Z",
    },
  });
}

function baselineWorkspace(): AppData {
  const [original, rectification] = rectificationPair();
  const [invoice, receipt] = receiptPair();
  const protectedVerifactu = unaffectedVerifactuDocument();
  return {
    ...EMPTY_DATA,
    profile: PROFILE,
    documents: [original, rectification, invoice, receipt, protectedVerifactu],
    verifactuChain: {
      issuerNif: protectedVerifactu.issuer!.nif,
      lastHash: protectedVerifactu.verifactu!.recordHash,
      lastNumSerie: protectedVerifactu.number,
      lastFechaExpedicion: protectedVerifactu.date,
      recordCount: 1,
    },
  };
}

function standaloneWorkspace(): { data: AppData; document: Document } {
  const issued = markDocumentPaid(
    issueDocument(
      draftInvoice(STANDALONE_ID, "F-SYNTH-STANDALONE-001"),
      PROFILE,
      ISSUE_AT,
    ),
    ISSUE_AT,
  );
  const verifactu = {
    recordHash: "b".repeat(64),
    previousHash: "",
    recordTimestamp: ISSUE_AT,
    qrUrl: "https://example.invalid/local-test-artifact",
    status: "test_registered" as const,
    recordType: "alta" as const,
    environment: "test" as const,
    tipoFactura: "F1",
    cuotaTotal: "21.00",
    importeTotal: "121.00",
    csv: "LOCAL-TEST-ONLY",
    submittedAt: ISSUE_AT,
  };
  const validSnapshot = buildDocumentSnapshot(issued, PROFILE, {
    capturedAt: ISSUE_AT,
    source: "legacy_backfill",
    issuer: issued.documentSnapshot!.issuer,
  });
  const validPdf = buildDocumentPdfSnapshot(
    validSnapshot,
    PROFILE,
    ISSUE_AT,
  );
  const snapshotContent = { ...validSnapshot, verifactu };
  const documentSnapshot = {
    ...snapshotContent,
    snapshotHash: hashDocumentSnapshot(snapshotContent),
  };
  const pdfSnapshot = {
    ...validPdf,
    contentHash: hashDocumentPdfSnapshot({
      ...validPdf,
      documentSnapshotHash: documentSnapshot.snapshotHash,
    }),
  };
  const document: Document = {
    ...issued,
    documentSnapshot,
    pdfSnapshot,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["document_snapshot_semantic_invalid"],
    },
    verifactu,
    verifactuPersistence: "legacy_unverified",
  };
  delete document.snapshotSeal;
  delete document.snapshotIntegrityRequired;
  return {
    document,
    data: {
      ...EMPTY_DATA,
      profile: PROFILE,
      documents: [document],
      snapshotIntegrityVersion: 1,
    },
  };
}

function recoveredStandaloneWorkspace(): {
  before: AppData;
  recovered: AppData;
  preview: ReturnType<typeof buildAppIssuedDocumentRecoveryPreview>;
} {
  const fixture = standaloneWorkspace();
  const pending = buildAppIssuedDocumentRecoveryPreview(fixture.data);
  const recoveredSnapshot = pending.candidates[0]?.members[0]
    ?.recoveredSnapshot;
  if (!recoveredSnapshot) throw new Error("missing standalone snapshot");
  const evidence: AppIssuedDocumentRecoveryPdfEvidenceV1 = {
    kind: "external_pdf_user_confirmed",
    sha256: "c".repeat(64),
    byteLength: 42_000,
    mediaType: "application/pdf",
    preservation: "user_managed",
    confirmedSummary: {
      number: recoveredSnapshot.number,
      date: recoveredSnapshot.date,
      subtotal: recoveredSnapshot.taxSummary.subtotal,
      iva: recoveredSnapshot.taxSummary.iva,
      total: recoveredSnapshot.taxSummary.total,
      confirmedFiscalContentHash: recoveredSnapshot.snapshotHash,
    },
  };
  const preview = buildAppIssuedDocumentRecoveryPreview(
    fixture.data,
    { [fixture.document.id]: evidence },
    { selectedCandidateKeys: [pending.candidates[0]!.candidateKey] },
  );
  const applied = runAppIssuedDocumentRecoveryCommand({
    expected: fixture.data,
    preview,
    now: REPAIR_AT,
    commit: appliedCommit,
  });
  if (applied.status !== "applied") {
    throw new Error(`standalone_recovery_failed:${applied.reason}`);
  }
  return { before: fixture.data, recovered: applied.data, preview };
}

function pdfCommands(
  pdf: ReturnType<typeof buildAnnualSummaryPdf>,
): string {
  const pages = (pdf.internal as unknown as {
    pages: Array<string[] | null>;
  }).pages;
  return pages.flatMap((page) => page ?? []).join("\n");
}

function rectificationPdfEvidence(
  data: AppData,
  rectification: Document,
): AppIssuedDocumentRecoveryPdfEvidenceV1 {
  const snapshot = buildAppIssuedDocumentRecoveryPreview(data)
    .candidates.flatMap((candidate) => candidate.members)
    .find(
      (member) => member.documentId === rectification.id,
    )?.recoveredSnapshot;
  if (!snapshot) throw new Error("missing synthetic recovery snapshot");
  return {
    kind: "external_pdf_user_confirmed",
    sha256: "1".repeat(64),
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
  };
}

function appliedCommit<T>(
  expected: AppData,
  build: (previous: AppData) => { data: AppData; value: T },
): AppDataDurabilityResult<T> {
  const transition = build(expected);
  return {
    status: "applied",
    data: transition.data,
    value: transition.value,
    replayed: false,
  };
}

function recoveredWorkspace(): { before: AppData; recovered: AppData } {
  const before = baselineWorkspace();
  const rectification = before.documents.find(
    (document) => document.id === RECTIFICATION_ID,
  )!;
  const preview = buildAppIssuedDocumentRecoveryPreview(before, {
    [rectification.id]: rectificationPdfEvidence(before, rectification),
  });
  expect(preview.requiredPdfDocumentIds).toEqual([]);
  expect(preview.candidates.map((candidate) => candidate.recoveryKind)).toEqual(
    ["pre_canonical_rectification_v1", "receipt_source_snapshot_gap_v1"],
  );

  const pureTransition = applyAppIssuedDocumentRecovery(
    before,
    preview,
    REPAIR_AT,
  );
  if (pureTransition.status !== "applied") {
    throw new Error(`synthetic_pure_recovery_failed:${pureTransition.reason}`);
  }
  // El motor puro no es una frontera pública: conserva fail-closed hasta que
  // el comando revalida atómicamente la relación completa.
  expect(
    documentAmounts(
      pureTransition.data.documents.find(
        (document) => document.id === RECTIFICATION_ID,
      )!,
      false,
    ).total,
  ).toBe(0);
  expect(
    documentAmounts(
      pureTransition.data.documents.find(
        (document) => document.id === RECEIPT_ID,
      )!,
      false,
    ).total,
  ).toBe(0);

  const applied = runAppIssuedDocumentRecoveryCommand({
    expected: before,
    preview,
    now: REPAIR_AT,
    commit: appliedCommit,
  });
  if (applied.status !== "applied") {
    throw new Error(`synthetic_recovery_failed:${applied.reason}`);
  }
  expect(applied.value.appliedRepairIds).toHaveLength(2);
  return { before, recovered: applied.data };
}

function documentStandardEvidence(data: AppData) {
  return data.documents.map((document) => ({
    id: document.id,
    documentSnapshot: document.documentSnapshot,
    pdfSnapshot: document.pdfSnapshot,
    snapshotSeal: document.snapshotSeal,
    snapshotIntegrityRequired: document.snapshotIntegrityRequired,
    verifactu: document.verifactu,
    verifactuPersistence: document.verifactuPersistence,
  }));
}

function recoveryAttestations(data: AppData) {
  return data.documents.flatMap((document) =>
    document.appIssuedRecoveryAttestation
      ? [
          {
            id: document.id,
            attestation: document.appIssuedRecoveryAttestation,
          },
        ]
      : [],
  );
}

function expectRecoveredDocumentsUsable(data: AppData): void {
  const valid = inspectAppIssuedDocumentRecoveryCollection(
    data.documents,
  ).validDocumentIds;
  expect(valid).toEqual(new Set([RECTIFICATION_ID, RECEIPT_ID]));
  expect(
    documentAmounts(
      data.documents.find((document) => document.id === RECTIFICATION_ID)!,
      false,
    ),
  ).toEqual({ subtotal: 100, iva: 21, total: 121 });
  expect(
    documentAmounts(
      data.documents.find((document) => document.id === RECEIPT_ID)!,
      false,
    ),
  ).toEqual({ subtotal: 100, iva: 21, total: 121 });
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
  vi.stubGlobal("window", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("app-issued recovery consumer and persistence regression", () => {
  it("standalone V2 entra en importes, ingresos, impuestos y export tras save/load y cloud", () => {
    const { before, recovered, preview } = recoveredStandaloneWorkspace();
    const expectedEvidence = structuredClone(
      documentStandardEvidence(recovered),
    );
    const expectedAttestations = structuredClone(
      recoveryAttestations(recovered),
    );
    expect(documentAmounts(before.documents[0]!, false).total).toBe(0);
    expect(
      calculateTaxSummary(before.documents, [], {
        profile: PROFILE,
        isDocumentDateInPeriod: (date) => date.startsWith("2026-07"),
      }),
    ).toMatchObject({ salesBase: 0, salesIva: 0, integrityBlockedDocuments: 1 });
    expect(documentAmounts(recovered.documents[0]!, false)).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(collectedIncome(recovered.documents)).toBe(121);
    const customer = {
      id: "customer-standalone-v2",
      firstName: "",
      lastName: "",
      name: recovered.documents[0]!.client.name,
      nif: recovered.documents[0]!.client.nif,
      createdAt: ISSUE_AT,
      updatedAt: ISSUE_AT,
    };
    expect(customerInvoicedTotal(recovered.documents, customer)).toBe(121);
    expect(
      buildCustomerInvoicedTotals([customer], recovered.documents).get(
        customer.id,
      ),
    ).toBe(121);
    expect(
      selectTaxableFiscalDocumentsForPeriod(recovered.documents, {
        profile: PROFILE,
        isDocumentDateInPeriod: (date) => date.startsWith("2026-07"),
      }).documents.map((document) => ({
        id: document.id,
        type: document.type,
        status: document.status,
        snapshotIntegrity: document.snapshotIntegrity,
      })),
    ).toEqual([
      {
        id: STANDALONE_ID,
        type: "factura",
        status: "pagado",
        snapshotIntegrity: {
          status: "blocked",
          issues: ["document_snapshot_semantic_invalid"],
        },
      },
    ]);
    expect(
      calculateTaxSummary(recovered.documents, [], {
        profile: PROFILE,
        isDocumentDateInPeriod: (date) => date.startsWith("2026-07"),
      }),
    ).toMatchObject({
      salesBase: 100,
      salesIva: 21,
      grossProfit: 100,
      estimatedIrpfBase: 100,
      integrityBlockedDocuments: 0,
    });
    const fiscal = selectCanonicalFiscalDocumentsForExport(
      recovered.documents,
      PROFILE,
      (date) => date.startsWith("2026-07"),
    );
    expect(fiscal.blockedDocuments).toEqual([]);
    expect(fiscal.documents.map((document) => document.id)).toEqual([
      STANDALONE_ID,
    ]);
    const quarterlyCsv = buildQuarterlyExportCsv(
      recovered.documents,
      [],
      PROFILE,
      2026,
      3,
    );
    expect(quarterlyCsv).toContain("F-SYNTH-STANDALONE-001");
    expect(quarterlyCsv).toContain(
      "TOTAL VENTAS;;;1 documento;;100,00;21,00;121,00;",
    );
    const annualPdfCommands = pdfCommands(
      buildAnnualSummaryPdf(recovered.documents, [], PROFILE, 2026),
    );
    expect(annualPdfCommands).toContain("Facturado en el año");
    expect(annualPdfCommands).toContain("F-SYNTH-STANDALONE-001");
    expect(annualPdfCommands).toContain("121,00");

    const foreignSeal = issueDocument(
      draftInvoice(
        "88888888-8888-4888-8888-888888888888",
        "F-SYNTH-FOREIGN-SEAL",
      ),
      PROFILE,
      ISSUE_AT,
    ).snapshotSeal!;
    const invalidVariants: Document[] = [
      {
        ...recovered.documents[0]!,
        documentSnapshot: {
          ...recovered.documents[0]!.documentSnapshot!,
          snapshotHash: "sha256:" + "0".repeat(64),
        },
      },
      { ...recovered.documents[0]!, snapshotSeal: foreignSeal },
    ];
    for (const invalid of invalidVariants) {
      expect(
        calculateTaxSummary([invalid], [], {
          profile: PROFILE,
          isDocumentDateInPeriod: (date) => date.startsWith("2026-07"),
        }),
      ).toMatchObject({
        salesBase: 0,
        salesIva: 0,
        integrityBlockedDocuments: 1,
      });
      expect(() =>
        buildQuarterlyExportCsv([invalid], [], PROFILE, 2026, 3),
      ).toThrow();
      expect(() =>
        buildAnnualSummaryPdf([invalid], [], PROFILE, 2026),
      ).toThrow();
    }

    expect(saveData(recovered)).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(documentStandardEvidence(reloaded)).toEqual(expectedEvidence);
    expect(recoveryAttestations(reloaded)).toEqual(expectedAttestations);
    expect(documentAmounts(reloaded.documents[0]!, false).total).toBe(121);

    const rebuiltCloud = rebuildCloudSnapshot(
      diffAppData(emptyCloudBootstrapData(), recovered),
    ).data;
    expect(documentStandardEvidence(rebuiltCloud)).toEqual(expectedEvidence);
    expect(recoveryAttestations(rebuiltCloud)).toEqual(expectedAttestations);
    expect(documentAmounts(rebuiltCloud.documents[0]!, false).total).toBe(121);

    const secondCommit = vi.fn();
    expect(
      runAppIssuedDocumentRecoveryCommand({
        expected: recovered,
        preview,
        now: "2026-07-13T12:00:00.000Z",
        commit: secondCommit,
      }),
    ).toMatchObject({
      status: "applied",
      data: recovered,
      value: { appliedRepairIds: [] },
      replayed: true,
    });
    expect(secondCommit).not.toHaveBeenCalled();
  });

  it("rollback durable del standalone V2 restaura solo semantic_invalid y conserva bytes", () => {
    const { before, recovered } = recoveredStandaloneWorkspace();
    const evidenceBefore = structuredClone(documentStandardEvidence(before));
    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      recovered,
    );
    const rolledBack = runAppIssuedDocumentRecoveryRollbackCommand({
      expected: recovered,
      preview: rollbackPreview,
      now: "2026-07-13T11:00:00.000Z",
      commit: appliedCommit,
    });
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status !== "applied") return;
    expect(documentStandardEvidence(rolledBack.data)).toEqual(evidenceBefore);
    expect(rolledBack.data.documents[0]?.snapshotIntegrity).toEqual({
      status: "blocked",
      issues: ["document_snapshot_semantic_invalid"],
    });
    expect(documentAmounts(rolledBack.data.documents[0]!, false).total).toBe(
      0,
    );
  });

  it("recibo V2 sin markers persiste por save/load/cloud sin duplicación fiscal", () => {
    const { recovered } = receiptV2Workspace();
    const invoice = recovered.documents[0]!;
    const receipt = recovered.documents[1]!;
    const expectedEvidence = structuredClone(
      documentStandardEvidence(recovered),
    );
    const expectedAttestations = structuredClone(
      recoveryAttestations(recovered),
    );
    expect(documentAmounts(invoice, false).total).toBe(121);
    expect(documentAmounts(receipt, false).total).toBe(121);
    expect(Object.hasOwn(invoice, "paymentStatus")).toBe(false);
    expect(Object.hasOwn(invoice, "paidAt")).toBe(false);
    expect(Object.hasOwn(receipt, "paymentStatus")).toBe(false);
    expect(Object.hasOwn(receipt, "paidAt")).toBe(false);
    expect(receipt.appIssuedRecoveryAttestation).toMatchObject({
      schemaVersion: 2,
      recoveryKind: "receipt_source_and_payment_markers_gap_v1",
    });
    expect(
      inspectAppIssuedDocumentRecoveryCollection(recovered.documents)
        .validDocumentIds,
    ).toContain(receipt.id);
    const fiscal = selectCanonicalFiscalDocumentsForExport(
      recovered.documents,
      PROFILE,
      (date) => date.startsWith("2026-07"),
    );
    expect(fiscal.blockedDocuments).toEqual([]);
    expect(fiscal.documents.map((document) => document.id)).toEqual([
      invoice.id,
    ]);
    expect(collectedIncome(recovered.documents)).toBe(121);

    expect(saveData(recovered)).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(documentStandardEvidence(reloaded)).toEqual(expectedEvidence);
    expect(recoveryAttestations(reloaded)).toEqual(expectedAttestations);
    expect(documentAmounts(reloaded.documents[0]!, false).total).toBe(121);
    expect(documentAmounts(reloaded.documents[1]!, false).total).toBe(121);
    expect(
      inspectAppIssuedDocumentRecoveryCollection(reloaded.documents)
        .validDocumentIds,
    ).toContain(receipt.id);

    const rebuiltCloud = rebuildCloudSnapshot(
      diffAppData(emptyCloudBootstrapData(), recovered),
    ).data;
    expect(documentStandardEvidence(rebuiltCloud)).toEqual(expectedEvidence);
    expect(recoveryAttestations(rebuiltCloud)).toEqual(expectedAttestations);
    expect(documentAmounts(rebuiltCloud.documents[0]!, false).total).toBe(121);
    expect(documentAmounts(rebuiltCloud.documents[1]!, false).total).toBe(121);
  });

  it("restaura importes, ingresos, resumen fiscal y exportación sin duplicar el recibo", () => {
    const { before, recovered } = recoveredWorkspace();

    expect(
      documentAmounts(
        before.documents.find((document) => document.id === RECTIFICATION_ID)!,
        false,
      ).total,
    ).toBe(0);
    expect(
      documentAmounts(
        before.documents.find((document) => document.id === RECEIPT_ID)!,
        false,
      ).total,
    ).toBe(0);
    expectRecoveredDocumentsUsable(recovered);

    expect(collectedIncome(recovered.documents)).toBe(242);
    expect(buildProductBusinessSummary(before).totalBilledIssued).toBe(242);
    expect(buildProductBusinessSummary(recovered)).toMatchObject({
      issuedInvoicesCount: 3,
      collectedInvoicesCount: 2,
      totalBilledIssued: 363,
      totalCollectedLocal: 242,
      salesIvaEstimated: 63,
      balanceEstimated: 363,
      cashBalanceEstimated: 242,
    });
    const fiscal = selectCanonicalFiscalDocumentsForExport(
      recovered.documents,
      PROFILE,
      (date) => date.startsWith("2026-07"),
    );
    expect(fiscal.blockedDocuments).toEqual([]);
    expect(fiscal.documents.map((document) => document.id)).toEqual([
      "synthetic:modern-recovery:rectification-original",
      RECTIFICATION_ID,
      "synthetic:modern-recovery:receipt-invoice",
    ]);

    expect(
      calculateTaxSummary(recovered.documents, [], {
        profile: PROFILE,
        isDocumentDateInPeriod: (date) => date.startsWith("2026-07"),
      }),
    ).toMatchObject({
      salesBase: 200,
      salesIva: 42,
      grossProfit: 200,
      estimatedIrpfBase: 200,
      irpfEstimate: 40,
      profitAfterIrpfReserve: 160,
      integrityBlockedDocuments: 0,
      unsupportedRectificationDocuments: 0,
    });
  });

  it("conserva atestaciones y evidencia por save/load, backup y cloud", () => {
    const { recovered } = recoveredWorkspace();
    const expectedAttestations = structuredClone(
      recoveryAttestations(recovered),
    );
    const expectedDocumentEvidence = structuredClone(
      documentStandardEvidence(recovered),
    );
    const expectedChain = structuredClone(recovered.verifactuChain);

    expect(saveData(recovered)).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(recoveryAttestations(reloaded)).toEqual(expectedAttestations);
    expect(documentStandardEvidence(reloaded)).toEqual(
      expectedDocumentEvidence,
    );
    expect(reloaded.verifactuChain).toEqual(expectedChain);
    expectRecoveredDocumentsUsable(reloaded);

    const backupPayload = createBackupPayload(recovered, BACKUP_AT);
    const restoredBackup = parseBackupJson(
      JSON.parse(JSON.stringify(backupPayload)),
    );
    expect(restoredBackup).not.toHaveProperty("error");
    if ("error" in restoredBackup) return;
    expect(recoveryAttestations(restoredBackup)).toEqual(expectedAttestations);
    expect(documentStandardEvidence(restoredBackup)).toEqual(
      expectedDocumentEvidence,
    );
    expect(restoredBackup.verifactuChain).toEqual(expectedChain);
    expectRecoveredDocumentsUsable(restoredBackup);

    const changes = diffAppData(emptyCloudBootstrapData(), recovered);
    const documentChanges = changes.filter(
      (change) => change.entityType === "document",
    );
    expect(documentChanges).toHaveLength(recovered.documents.length);
    expect(
      documentChanges.map((change) => (change.payload as Document).id).sort(),
    ).toEqual(recovered.documents.map((document) => document.id).sort());
    const rebuiltCloud = rebuildCloudSnapshot(changes).data;
    expect(recoveryAttestations(rebuiltCloud)).toEqual(expectedAttestations);
    expect(documentStandardEvidence(rebuiltCloud)).toEqual(
      expectedDocumentEvidence,
    );
    expectRecoveredDocumentsUsable(rebuiltCloud);
  });

  it("un cambio remoto de contraparte se revalida fail-closed antes de publicarse", () => {
    const { recovered } = recoveredWorkspace();
    const remote: AppData = {
      ...recovered,
      documents: recovered.documents.map((document) =>
        document.id === "synthetic:modern-recovery:rectification-original"
          ? {
              ...document,
              notes: "cambio remoto sintético posterior",
              updatedAt: "2026-07-13T11:30:00.000Z",
            }
          : document,
      ),
    };
    const changes = diffAppData(recovered, remote);
    const merged = mergeRemoteOntoLocal(recovered, changes).data;
    const rectification = merged.documents.find(
      (document) => document.id === RECTIFICATION_ID,
    )!;

    expect(rectification.snapshotIntegrity?.issues).toContain(
      "document_relationship_invalid",
    );
    expect(
      inspectAppIssuedDocumentRecoveryCollection(merged.documents)
        .validDocumentIds,
    ).not.toContain(RECTIFICATION_ID);
    expect(documentAmounts(rectification, false).total).toBe(0);
  });

  it("una atestación remota malformada se aísla sin romper el merge", () => {
    const { recovered } = recoveredWorkspace();
    const remote: AppData = {
      ...recovered,
      documents: recovered.documents.map((document) =>
        document.id === RECTIFICATION_ID
          ? ({
              ...document,
              appIssuedRecoveryAttestation: {
                ...document.appIssuedRecoveryAttestation!,
                events: null,
              },
            } as unknown as Document)
          : document,
      ),
    };

    const merged = mergeRemoteOntoLocal(
      recovered,
      diffAppData(recovered, remote),
    ).data;
    const rectification = merged.documents.find(
      (document) => document.id === RECTIFICATION_ID,
    )!;
    expect(rectification.snapshotIntegrity?.issues).toContain(
      "app_issued_recovery_invalid",
    );
    expect(documentAmounts(rectification, false).total).toBe(0);
  });

  it("rollback restaura el bloqueo y mantiene byte-semánticamente la evidencia estándar y VeriFactu", () => {
    const { before, recovered } = recoveredWorkspace();
    const evidenceBefore = structuredClone(documentStandardEvidence(before));
    const chainBefore = structuredClone(before.verifactuChain);

    expect(documentStandardEvidence(recovered)).toEqual(evidenceBefore);
    expect(recovered.verifactuChain).toEqual(chainBefore);

    const rollbackPreview =
      buildAppIssuedDocumentRecoveryRollbackPreview(recovered);
    expect(rollbackPreview.affectedCount).toBe(2);
    const rolledBack = runAppIssuedDocumentRecoveryRollbackCommand({
      expected: recovered,
      preview: rollbackPreview,
      now: "2026-07-13T11:00:00.000Z",
      commit: appliedCommit,
    });
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status !== "applied") return;

    expect(documentStandardEvidence(rolledBack.data)).toEqual(evidenceBefore);
    expect(rolledBack.data.verifactuChain).toEqual(chainBefore);
    expect(
      recoveryAttestations(rolledBack.data).map(({ attestation }) => ({
        status: attestation.status,
        lastEvent: attestation.events.at(-1)?.action,
      })),
    ).toEqual([
      { status: "rolled_back", lastEvent: "rolled_back" },
      { status: "rolled_back", lastEvent: "rolled_back" },
    ]);
    expect(
      documentAmounts(
        rolledBack.data.documents.find(
          (document) => document.id === RECTIFICATION_ID,
        )!,
        false,
      ).total,
    ).toBe(0);
    expect(
      documentAmounts(
        rolledBack.data.documents.find(
          (document) => document.id === RECEIPT_ID,
        )!,
        false,
      ).total,
    ).toBe(0);
  });
});
