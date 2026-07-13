import { describe, expect, it } from "vitest";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  buildDocumentSnapshotSeal,
  inspectDocumentSnapshotsIntegrity,
  issueDocument,
  markDocumentPaid,
  stableStringifySnapshot,
} from "@/lib/document-integrity";
import type {
  AppData,
  AppIssuedDocumentRecoveryPdfEvidenceV1,
  BusinessProfile,
  Document,
} from "@/lib/types";
import { DEFAULT_PROFILE, EMPTY_DATA } from "@/lib/types";
import {
  applyAppIssuedDocumentRecovery,
  buildAppIssuedDocumentRecoveryPreview,
  buildAppIssuedDocumentRecoveryRollbackPreview,
  inspectAppIssuedDocumentRecovery,
  inspectAppIssuedDocumentRecoveryCollection,
  rollbackAppIssuedDocumentRecovery,
} from "./app-issued-recovery";
import { inspectUsableHistoricalDocumentEvidence } from "./legacy-import-attestation";
import { withDocumentRelationshipIntegritySignals } from "./relationships";
import { hashDocumentSnapshotWithAlgorithm } from "./snapshots";

const NOW = "2026-07-06T10:00:00.000Z";
const REPAIR_NOW = "2026-07-13T10:00:00.000Z";
const PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Taller Sintético SL",
  nif: "B12345678",
  address: "Calle Prueba 1",
  city: "Madrid",
  postalCode: "28001",
  email: "test@example.invalid",
  phone: "600000000",
  verifactu: {
    enabled: false,
    environment: "test",
    optInVersion: 1,
  },
};

function legacyFnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function legacyHashStableValue(value: unknown): string {
  return `fnv1a32:${legacyFnv1a32(stableStringifySnapshot(value))}`;
}

function legacyPdfHash(
  pdfSnapshot: NonNullable<Document["pdfSnapshot"]>,
  documentSnapshotHash: string,
): string {
  const content: Record<string, unknown> = {
    ...pdfSnapshot,
    documentSnapshotHash,
  };
  delete content.renderedAt;
  delete content.contentHash;
  return legacyHashStableValue(content);
}

function draftInvoice(id: string, number: string): Document {
  return {
    id,
    type: "factura",
    number,
    date: "2026-07-06",
    client: {
      name: "Cliente Sintético SL",
      nif: "B87654321",
      address: "Calle Cliente 2",
      city: "Madrid",
      postalCode: "28002",
    },
    items: [
      {
        id: `${id}-line`,
        description: "Servicio sintético",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function rectificationWorkspace(): {
  data: AppData;
  original: Document;
  rectification: Document;
} {
  const issued = issueDocument(
    draftInvoice("synthetic-invoice", "F-TEST-0001"),
    PROFILE,
    NOW,
  );
  const rectification: Document = {
    ...draftInvoice("synthetic-rectification", "FR-TEST-0001"),
    client: {
      name: "Cliente Corregido SL",
      nif: "B87654321",
      address: "Calle Cliente 2",
      city: "Madrid",
      postalCode: "28002",
    },
    status: "enviado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    issuer: issued.issuer,
    rectification: {
      type: "correccion",
      reason: "Corrección de datos",
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
  return {
    original,
    rectification,
    data: {
      ...EMPTY_DATA,
      profile: PROFILE,
      documents: [original, rectification],
    },
  };
}

function pdfEvidence(
  data: AppData,
  document: Document,
): AppIssuedDocumentRecoveryPdfEvidenceV1 {
  const pending = buildAppIssuedDocumentRecoveryPreview(data);
  const snapshot = pending.candidates
    .flatMap((candidate) => candidate.members)
    .find((member) => member.documentId === document.id)?.recoveredSnapshot;
  if (!snapshot) throw new Error("missing synthetic recovery snapshot");
  return {
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
  };
}

function receiptWorkspace(): {
  data: AppData;
  invoice: Document;
  receipt: Document;
} {
  const paidInvoice = markDocumentPaid(
    issueDocument(
      draftInvoice("synthetic-receipt-source", "F-TEST-0002"),
      PROFILE,
      NOW,
    ),
    NOW,
  );
  const baseReceipt: Document = {
    ...draftInvoice("synthetic-receipt", "R-TEST-0001"),
    type: "recibo",
    date: paidInvoice.date,
    client: { ...paidInvoice.client },
    items: paidInvoice.items.map((item) => ({
      ...item,
      id: `receipt-${item.id}`,
    })),
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    paymentStatus: "paid",
    issuedAt: NOW,
    paidAt: NOW,
    sourceDocumentId: paidInvoice.id,
    notes: `Pago de la factura ${paidInvoice.number}`,
  };
  const oldSnapshot = buildDocumentSnapshot(
    { ...baseReceipt, sourceDocumentId: undefined },
    PROFILE,
    {
      capturedAt: NOW,
      source: "issue",
      issuer: paidInvoice.documentSnapshot!.issuer,
    },
  );
  const oldPdf = buildDocumentPdfSnapshot(oldSnapshot, PROFILE, NOW);
  const receipt: Document = {
    ...baseReceipt,
    issuer: oldSnapshot.issuer,
    documentSnapshot: oldSnapshot,
    pdfSnapshot: oldPdf,
    snapshotSeal: buildDocumentSnapshotSeal(
      baseReceipt.id,
      oldSnapshot,
      oldPdf,
    ),
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["document_relationship_invalid"],
    },
  };
  const invoice: Document = {
    ...paidInvoice,
    receiptDocumentId: receipt.id,
  };
  return {
    invoice,
    receipt,
    data: {
      ...EMPTY_DATA,
      profile: PROFILE,
      documents: [invoice, receipt],
    },
  };
}

function standalonePreSealWorkspace(): {
  data: AppData;
  document: Document;
} {
  const id = "11111111-2222-4333-8444-555555555555";
  const issued = markDocumentPaid(
    issueDocument(draftInvoice(id, "F-TEST-0002"), PROFILE, NOW),
    NOW,
  );
  const verifactu = {
    recordHash: "a".repeat(64),
    previousHash: "",
    recordTimestamp: NOW,
    qrUrl: "https://example.invalid/verifactu-test",
    status: "test_registered" as const,
    recordType: "alta" as const,
    environment: "test" as const,
    tipoFactura: "F1",
    cuotaTotal: "21.00",
    importeTotal: "121.00",
    csv: "TEST-SYNTHETIC-CSV",
    submittedAt: NOW,
  };
  const validSnapshot = buildDocumentSnapshot(issued, PROFILE, {
    capturedAt: NOW,
    source: "legacy_backfill",
    issuer: issued.documentSnapshot!.issuer,
  });
  const validPdf = buildDocumentPdfSnapshot(validSnapshot, PROFILE, NOW);
  const snapshotContent = {
    ...validSnapshot,
    fiscalContext: {
      ...validSnapshot.fiscalContext,
      verifactu: {
        enabled: false,
        environment: "test" as const,
        optInVersion: 1 as const,
      },
    },
    verifactu,
  };
  const documentSnapshot = {
    ...snapshotContent,
    snapshotHash: hashDocumentSnapshotWithAlgorithm(
      snapshotContent,
      "fnv1a32",
    ),
  };
  const pdfSnapshot = {
    ...validPdf,
    contentHash: legacyPdfHash(validPdf, documentSnapshot.snapshotHash),
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
  const integrity = inspectDocumentSnapshotsIntegrity(document, {
    requireDocumentSnapshot: true,
    requirePdfSnapshot: true,
  });
  if (
    integrity.documentSnapshot.status !== "verified" ||
    integrity.pdfSnapshot.status !== "verified" ||
    stableStringifySnapshot(integrity.issues) !==
      stableStringifySnapshot(["document_snapshot_semantic_invalid"])
  ) {
    throw new Error("invalid standalone synthetic fixture");
  }
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

function backfillReceiptWorkspace(options: {
  invoiceSnapshotSource: "issue" | "legacy_backfill";
  markerMode: "paid" | "legacy_missing";
  invoiceId?: string;
  receiptId?: string;
}): { data: AppData; invoice: Document; receipt: Document } {
  const invoiceId =
    options.invoiceId ?? "22222222-2222-4222-8222-222222222222";
  const receiptId =
    options.receiptId ?? "33333333-3333-4333-8333-333333333333";
  const paidInvoice = markDocumentPaid(
    issueDocument(draftInvoice(invoiceId, "F-TEST-RECEIPT"), PROFILE, NOW),
    NOW,
  );
  const invoiceSnapshot = buildDocumentSnapshot(paidInvoice, PROFILE, {
    capturedAt: NOW,
    source: options.invoiceSnapshotSource,
    issuer: paidInvoice.documentSnapshot!.issuer,
  });
  const invoicePdf = buildDocumentPdfSnapshot(invoiceSnapshot, PROFILE, NOW);
  const invoice: Document = {
    ...paidInvoice,
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
  const receiptWithoutSource: Document = {
    ...draftInvoice(receiptId, "R-TEST-RECEIPT"),
    type: "recibo",
    date: paidInvoice.date,
    client: structuredClone(paidInvoice.client),
    items: paidInvoice.items.map((item) => ({
      ...item,
      id: `receipt-${item.id}`,
    })),
    status: "pagado",
    documentLifecycle: "issued",
    integrityLock: "locked",
    paymentStatus: "paid",
    paidAt: NOW,
    issuedAt: NOW,
    notes: `Pago de la factura ${paidInvoice.number}`,
  };
  const receiptSnapshot = buildDocumentSnapshot(
    receiptWithoutSource,
    PROFILE,
    {
      capturedAt: NOW,
      source: "legacy_backfill",
      issuer: invoiceSnapshot.issuer,
    },
  );
  const receiptPdf = buildDocumentPdfSnapshot(receiptSnapshot, PROFILE, NOW);
  const receipt: Document = {
    ...receiptWithoutSource,
    sourceDocumentId: invoiceId,
    issuer: receiptSnapshot.issuer,
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
  if (options.markerMode === "legacy_missing") {
    delete invoice.paymentStatus;
    delete invoice.paidAt;
    delete receipt.paymentStatus;
    delete receipt.paidAt;
  }
  return {
    invoice,
    receipt,
    data: {
      ...EMPTY_DATA,
      profile: PROFILE,
      documents: [invoice, receipt],
    },
  };
}

describe("app-issued recovery", () => {
  it("MUST PASS: recupera una rectificativa pre-canónica sin fabricar bundle moderno", () => {
    const { data, original, rectification } = rectificationWorkspace();
    const missing = buildAppIssuedDocumentRecoveryPreview(data);
    expect(missing.requiredPdfDocumentIds).toEqual([rectification.id]);
    expect(missing.affectedCount).toBe(1);
    expect(missing.candidates).toHaveLength(1);
    expect(applyAppIssuedDocumentRecovery(data, missing, REPAIR_NOW)).toEqual({
      status: "blocked",
      reason: "candidate_invalid",
    });

    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    expect(preview.manualReview).toEqual([]);
    expect(preview.affectedCount).toBe(1);
    expect(preview.candidates[0]?.recoveryKind).toBe(
      "pre_canonical_rectification_v1",
    );

    const result = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const repairedOriginal = result.data.documents[0];
    const repaired = result.data.documents[1];
    expect(repairedOriginal.documentSnapshot).toEqual(
      original.documentSnapshot,
    );
    expect(repairedOriginal.pdfSnapshot).toEqual(original.pdfSnapshot);
    expect(repairedOriginal.snapshotSeal).toEqual(original.snapshotSeal);
    expect(repaired.documentSnapshot).toBeUndefined();
    expect(repaired.pdfSnapshot).toBeUndefined();
    expect(repaired.snapshotSeal).toBeUndefined();
    expect(repaired.verifactu).toBeUndefined();
    expect(
      repaired.appIssuedRecoveryAttestation?.recoveredSnapshot?.source,
    ).toBe("app_issued_recovery");
    expect(inspectAppIssuedDocumentRecovery(repaired)).toMatchObject({
      ok: true,
      active: true,
      kind: "pre_canonical_rectification_v1",
    });
    expect(
      inspectAppIssuedDocumentRecoveryCollection(result.data.documents)
        .validDocumentIds,
    ).toContain(rectification.id);
  });

  it("MUST PASS: conserva el signo de una rectificativa negativa confirmada", () => {
    const fixture = rectificationWorkspace();
    const rectification: Document = {
      ...fixture.rectification,
      items: fixture.rectification.items.map((item) => ({
        ...item,
        unitPrice: -100,
      })),
    };
    const data: AppData = {
      ...fixture.data,
      documents: [fixture.original, rectification],
    };
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });

    const result = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const repaired = result.data.documents.find(
      (document) => document.id === rectification.id,
    )!;
    const inspection = inspectAppIssuedDocumentRecovery(repaired);
    expect(inspection).toMatchObject({ ok: true, active: true });
    if (!inspection.ok) return;
    expect(inspection.snapshot.taxSummary).toMatchObject({
      subtotal: -100,
      iva: -21,
      total: -121,
    });
    expect(
      inspectAppIssuedDocumentRecoveryCollection(result.data.documents)
        .validDocumentIds,
    ).toContain(rectification.id);
  });

  it("MUST PASS: recupera atómicamente ambos miembros si toda la pareja carece de bundle", () => {
    const fixture = rectificationWorkspace();
    const original: Document = {
      ...fixture.original,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
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
    const data: AppData = {
      ...fixture.data,
      documents: [original, fixture.rectification],
    };
    const pending = buildAppIssuedDocumentRecoveryPreview(data);
    expect(pending.requiredPdfDocumentIds).toEqual([
      original.id,
      fixture.rectification.id,
    ]);

    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [original.id]: pdfEvidence(data, original),
      [fixture.rectification.id]: pdfEvidence(data, fixture.rectification),
    });
    expect(preview.affectedCount).toBe(2);
    const result = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.appliedRepairIds).toHaveLength(2);
    expect(
      inspectAppIssuedDocumentRecoveryCollection(result.data.documents)
        .validDocumentIds,
    ).toEqual(new Set([original.id, fixture.rectification.id]));
    for (const document of result.data.documents) {
      expect(document.documentSnapshot).toBeUndefined();
      expect(document.pdfSnapshot).toBeUndefined();
      expect(document.snapshotSeal).toBeUndefined();
      expect(inspectAppIssuedDocumentRecovery(document)).toMatchObject({
        ok: true,
        active: true,
      });
    }
  });

  it("MUST PASS: atesta el gap de origen de recibo sin cambiar hashes ni sello", () => {
    const { data, receipt } = receiptWorkspace();
    const before = {
      snapshot: receipt.documentSnapshot,
      pdf: receipt.pdfSnapshot,
      seal: receipt.snapshotSeal,
    };
    const preview = buildAppIssuedDocumentRecoveryPreview(data);
    expect(preview.affectedCount).toBe(1);
    expect(preview.candidates[0]?.recoveryKind).toBe(
      "receipt_source_snapshot_gap_v1",
    );
    const result = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const repaired = result.data.documents.find(
      (entry) => entry.id === receipt.id,
    )!;
    expect(repaired.documentSnapshot).toEqual(before.snapshot);
    expect(repaired.pdfSnapshot).toEqual(before.pdf);
    expect(repaired.snapshotSeal).toEqual(before.seal);
    expect(
      repaired.appIssuedRecoveryAttestation?.recoveredSnapshot,
    ).toBeUndefined();
    expect(inspectAppIssuedDocumentRecovery(repaired)).toMatchObject({
      ok: true,
      active: true,
      kind: "receipt_source_snapshot_gap_v1",
    });
  });

  it("MUST PASS: recupera el standalone pre-sello solo con PDF confirmado y conserva toda la evidencia", () => {
    const { data, document } = standalonePreSealWorkspace();
    const before = structuredClone(document);
    const pending = buildAppIssuedDocumentRecoveryPreview(data);
    expect(pending).toMatchObject({
      affectedCount: 1,
      requiredPdfDocumentIds: [document.id],
      candidates: [
        {
          recoveryKind: "pre_seal_snapshot_pdf_gap_v1",
          members: [
            {
              documentId: document.id,
              role: "standalone_invoice",
              counterpartDocumentId: null,
              verifactuDisposition: "preserved_unattested_test_artifact",
            },
          ],
        },
      ],
    });
    expect(pending.candidates[0]?.candidateKey).toMatch(/^sha256:/);
    expect(
      inspectDocumentSnapshotsIntegrity(document, {
        requireDocumentSnapshot: true,
        requirePdfSnapshot: true,
      }),
    ).toMatchObject({
      documentSnapshot: { status: "verified", algorithm: "fnv1a32" },
      pdfSnapshot: { status: "verified", algorithm: "fnv1a32" },
      issues: ["document_snapshot_semantic_invalid"],
    });

    const evidence = pdfEvidence(data, document);
    const preview = buildAppIssuedDocumentRecoveryPreview(
      data,
      { [document.id]: evidence },
      { selectedCandidateKeys: [pending.candidates[0]!.candidateKey] },
    );
    expect(preview.candidates[0]?.candidateKey).toBe(
      pending.candidates[0]?.candidateKey,
    );
    expect(preview.requiredPdfDocumentIds).toEqual([]);

    const staleData: AppData = {
      ...data,
      profile: { ...data.profile, commercialName: "Cambio ajeno posterior" },
    };
    expect(
      applyAppIssuedDocumentRecovery(staleData, preview, REPAIR_NOW),
    ).toEqual({ status: "blocked", reason: "stale_preview" });

    const applied = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const recovered = applied.data.documents[0]!;
    expect(recovered.documentSnapshot).toEqual(before.documentSnapshot);
    expect(recovered.pdfSnapshot).toEqual(before.pdfSnapshot);
    expect(recovered.snapshotSeal).toBeUndefined();
    expect(recovered.snapshotIntegrityRequired).toBeUndefined();
    expect(recovered.snapshotIntegrity).toEqual(before.snapshotIntegrity);
    expect(recovered.verifactu).toEqual(before.verifactu);
    expect(recovered.verifactuPersistence).toBe(
      before.verifactuPersistence,
    );
    expect(recovered.appIssuedRecoveryAttestation).toMatchObject({
      schemaVersion: 2,
      recoveryKind: "pre_seal_snapshot_pdf_gap_v1",
      counterpartDocumentId: null,
      verifactuDisposition: "preserved_unattested_test_artifact",
    });
    expect(
      recovered.appIssuedRecoveryAttestation?.recoveredSnapshot?.verifactu,
    ).toBeUndefined();
    expect(inspectAppIssuedDocumentRecovery(recovered)).toMatchObject({
      ok: true,
      active: true,
      kind: "pre_seal_snapshot_pdf_gap_v1",
    });
    expect(inspectUsableHistoricalDocumentEvidence(recovered)).toMatchObject({
      ok: true,
    });
    expect(
      applyAppIssuedDocumentRecovery(
        applied.data,
        preview,
        "2026-07-13T10:30:00.000Z",
      ),
    ).toMatchObject({
      status: "applied",
      data: applied.data,
      appliedRepairIds: [],
    });

    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      applied.data,
      { selectedCandidateKeys: [preview.candidates[0]!.candidateKey] },
    );
    expect(rollbackPreview.affectedCount).toBe(1);
    const staleRollbackData: AppData = {
      ...applied.data,
      profile: { ...applied.data.profile, phone: "699999999" },
    };
    expect(
      rollbackAppIssuedDocumentRecovery(
        staleRollbackData,
        rollbackPreview,
        "2026-07-13T11:00:00.000Z",
      ),
    ).toEqual({ status: "blocked", reason: "stale_preview" });

    const rolledBack = rollbackAppIssuedDocumentRecovery(
      applied.data,
      rollbackPreview,
      "2026-07-13T11:00:00.000Z",
    );
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status !== "applied") return;
    const restored = rolledBack.data.documents[0]!;
    expect(restored.documentSnapshot).toEqual(before.documentSnapshot);
    expect(restored.pdfSnapshot).toEqual(before.pdfSnapshot);
    expect(restored.verifactu).toEqual(before.verifactu);
    expect(inspectAppIssuedDocumentRecovery(restored)).toMatchObject({
      ok: true,
      active: false,
    });
    const reSignaled = withDocumentRelationshipIntegritySignals(
      rolledBack.data.documents,
    )[0]!;
    expect(reSignaled.snapshotIntegrity).toEqual({
      status: "blocked",
      issues: ["document_snapshot_semantic_invalid"],
    });
    expect(reSignaled.documentSnapshot).toEqual(before.documentSnapshot);
    expect(reSignaled.pdfSnapshot).toEqual(before.pdfSnapshot);
    expect(reSignaled.verifactu).toEqual(before.verifactu);
    expect(
      rollbackAppIssuedDocumentRecovery(
        rolledBack.data,
        rollbackPreview,
        "2026-07-13T12:00:00.000Z",
      ),
    ).toMatchObject({ status: "applied", rolledBackRepairIds: [] });

    const conflictingEvidence = {
      ...evidence,
      sha256: "d".repeat(64),
    };
    const conflictingPreview = buildAppIssuedDocumentRecoveryPreview(
      rolledBack.data,
      { [document.id]: conflictingEvidence },
      { selectedCandidateKeys: [preview.candidates[0]!.candidateKey] },
    );
    expect(conflictingPreview.affectedCount).toBe(0);
    expect(conflictingPreview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: document.id,
        reasons: expect.arrayContaining(["pdf_evidence_invalid"]),
      }),
    );

    const reapplyPreview = buildAppIssuedDocumentRecoveryPreview(
      rolledBack.data,
      {},
      { selectedCandidateKeys: [preview.candidates[0]!.candidateKey] },
    );
    expect(reapplyPreview).toMatchObject({
      affectedCount: 1,
      requiredPdfDocumentIds: [],
    });
    const reapplied = applyAppIssuedDocumentRecovery(
      rolledBack.data,
      reapplyPreview,
      "2026-07-13T13:00:00.000Z",
    );
    expect(reapplied.status).toBe("applied");
    if (reapplied.status !== "applied") return;
    expect(
      reapplied.data.documents[0]?.appIssuedRecoveryAttestation?.events.map(
        (event) => event.action,
      ),
    ).toEqual(["applied", "rolled_back", "applied"]);
    expect(
      applyAppIssuedDocumentRecovery(
        reapplied.data,
        reapplyPreview,
        "2026-07-13T14:00:00.000Z",
      ),
    ).toMatchObject({ status: "applied", appliedRepairIds: [] });
  });

  it("MUST BLOCK: el standalone exacto no admite VF ausente/diferente, producción/servidor, sello, hash roto ni issues extra", () => {
    const fixture = standalonePreSealWorkspace();
    const rehash = (
      document: Document,
      snapshot: NonNullable<Document["documentSnapshot"]>,
    ): Document => {
      const documentSnapshot = {
        ...snapshot,
        snapshotHash: hashDocumentSnapshotWithAlgorithm(
          snapshot,
          "fnv1a32",
        ),
      };
      return {
        ...document,
        documentSnapshot,
        pdfSnapshot: {
          ...document.pdfSnapshot!,
          contentHash: legacyPdfHash(
            document.pdfSnapshot!,
            documentSnapshot.snapshotHash,
          ),
        },
      };
    };
    const snapshot = fixture.document.documentSnapshot!;
    const { verifactu: _removed, ...snapshotWithoutVerifactu } = snapshot;
    void _removed;
    const mismatchedSnapshot = rehash(fixture.document, {
      ...snapshot,
      verifactu: { ...snapshot.verifactu!, csv: "OTHER-CSV" },
    });
    const productionVerifactu = {
      ...fixture.document.verifactu!,
      status: "registered" as const,
      environment: "production" as const,
    };
    const production = rehash(
      { ...fixture.document, verifactu: productionVerifactu },
      { ...snapshot, verifactu: productionVerifactu },
    );
    const extraKeyVerifactu = {
      ...fixture.document.verifactu!,
      errorMessage: "campo extra no permitido",
    };
    const extraKey = rehash(
      { ...fixture.document, verifactu: extraKeyVerifactu },
      { ...snapshot, verifactu: extraKeyVerifactu },
    );
    const sealFromAnotherDocument = issueDocument(
      draftInvoice(
        "44444444-4444-4444-8444-444444444444",
        "F-TEST-OTHER",
      ),
      PROFILE,
      NOW,
    ).snapshotSeal!;
    const variants: Document[] = [
      { ...fixture.document, verifactu: undefined },
      rehash(fixture.document, snapshotWithoutVerifactu),
      mismatchedSnapshot,
      {
        ...fixture.document,
        verifactuPersistence: "server_confirmed",
      },
      production,
      extraKey,
      { ...fixture.document, snapshotSeal: sealFromAnotherDocument },
      {
        ...fixture.document,
        documentSnapshot: {
          ...fixture.document.documentSnapshot!,
          snapshotHash: "fnv1a32:00000000",
        },
      },
      {
        ...fixture.document,
        snapshotIntegrity: {
          status: "blocked",
          issues: [
            "document_snapshot_semantic_invalid",
            "document_relationship_invalid",
          ],
        },
      },
      { ...fixture.document, snapshotIntegrityRequired: true },
    ];
    for (const document of variants) {
      expect(
        buildAppIssuedDocumentRecoveryPreview({
          ...fixture.data,
          documents: [document],
        }).affectedCount,
      ).toBe(0);
    }
  });

  it("MUST PASS: selección única aplica solo el candidato solicitado", () => {
    const standalone = standalonePreSealWorkspace();
    const receipt = backfillReceiptWorkspace({
      invoiceSnapshotSource: "issue",
      markerMode: "paid",
    });
    const data: AppData = {
      ...standalone.data,
      documents: [standalone.document, receipt.invoice, receipt.receipt],
    };
    const pending = buildAppIssuedDocumentRecoveryPreview(data);
    expect(pending.candidates).toHaveLength(2);
    const standaloneKey = pending.candidates.find(
      (candidate) =>
        candidate.recoveryKind === "pre_seal_snapshot_pdf_gap_v1",
    )!.candidateKey;
    const evidence = pdfEvidence(data, standalone.document);
    const selected = buildAppIssuedDocumentRecoveryPreview(
      data,
      {
        [standalone.document.id]: evidence,
        [receipt.receipt.id]: {
          ...evidence,
          sha256: "e".repeat(64),
        },
      },
      { selectedCandidateKeys: [standaloneKey] },
    );
    expect(selected.scope).toEqual({
      mode: "selected",
      candidateKeys: [standaloneKey],
    });
    expect(selected.candidates.map((candidate) => candidate.candidateKey)).toEqual([
      standaloneKey,
    ]);
    const applied = applyAppIssuedDocumentRecovery(data, selected, REPAIR_NOW);
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    expect(
      applied.data.documents.find(
        (document) => document.id === standalone.document.id,
      )?.appIssuedRecoveryAttestation,
    ).toBeDefined();
    expect(
      applied.data.documents.find(
        (document) => document.id === receipt.receipt.id,
      )?.appIssuedRecoveryAttestation,
    ).toBeUndefined();
  });

  it("MUST PASS: recibo legacy_backfill con markers paid conserva bundle y usa el contrato V1", () => {
    const fixture = backfillReceiptWorkspace({
      invoiceSnapshotSource: "issue",
      markerMode: "paid",
    });
    const beforeInvoice = structuredClone(fixture.invoice);
    const beforeReceipt = structuredClone(fixture.receipt);
    const preview = buildAppIssuedDocumentRecoveryPreview(fixture.data);
    expect(preview.candidates[0]?.recoveryKind).toBe(
      "receipt_source_snapshot_gap_v1",
    );
    const applied = applyAppIssuedDocumentRecovery(
      fixture.data,
      preview,
      REPAIR_NOW,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const invoice = applied.data.documents[0]!;
    const receipt = applied.data.documents[1]!;
    expect(invoice).toEqual(beforeInvoice);
    expect(receipt.documentSnapshot).toEqual(beforeReceipt.documentSnapshot);
    expect(receipt.pdfSnapshot).toEqual(beforeReceipt.pdfSnapshot);
    expect(receipt.snapshotSeal).toEqual(beforeReceipt.snapshotSeal);
    expect(receipt.paymentStatus).toBe("paid");
    expect(receipt.paidAt).toBe(NOW);
    expect(receipt.appIssuedRecoveryAttestation).toMatchObject({
      schemaVersion: 1,
      recoveryKind: "receipt_source_snapshot_gap_v1",
    });
    expect(
      inspectAppIssuedDocumentRecoveryCollection(applied.data.documents)
        .validDocumentIds,
    ).toContain(receipt.id);
  });

  it("MUST PASS: una atestación V1 persistida conserva huella, colección y rollback tras el upgrade", () => {
    const fixture = receiptWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(fixture.data);
    const applied = applyAppIssuedDocumentRecovery(
      fixture.data,
      preview,
      REPAIR_NOW,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const persisted = JSON.parse(JSON.stringify(applied.data)) as AppData;
    const attestation = persisted.documents.find(
      (document) => document.id === fixture.receipt.id,
    )!.appIssuedRecoveryAttestation!;
    expect(attestation.schemaVersion).toBe(1);
    expect(attestation.groupFingerprint).toBe(
      "sha256:e59a119cc5ec642d1ca2031f43903e3db4c4ac6d9f58da935135c7747497e231",
    );
    expect(
      inspectAppIssuedDocumentRecovery(
        persisted.documents.find(
          (document) => document.id === fixture.receipt.id,
        )!,
      ),
    ).toMatchObject({ ok: true, active: true });
    expect(
      inspectAppIssuedDocumentRecoveryCollection(persisted.documents)
        .validDocumentIds,
    ).toContain(fixture.receipt.id);
    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      persisted,
    );
    expect(rollbackPreview.affectedCount).toBe(1);
    expect(
      rollbackAppIssuedDocumentRecovery(
        persisted,
        rollbackPreview,
        "2026-07-13T14:00:00.000Z",
      ),
    ).toMatchObject({ status: "applied" });
  });

  it("MUST PASS: pareja legacy_backfill sin markers conserva ambos documentos y usa V2", () => {
    const fixture = backfillReceiptWorkspace({
      invoiceSnapshotSource: "legacy_backfill",
      markerMode: "legacy_missing",
    });
    const beforeInvoice = structuredClone(fixture.invoice);
    const beforeReceipt = structuredClone(fixture.receipt);
    const preview = buildAppIssuedDocumentRecoveryPreview(fixture.data);
    expect(preview.candidates).toHaveLength(1);
    expect(preview.candidates[0]?.recoveryKind).toBe(
      "receipt_source_and_payment_markers_gap_v1",
    );
    const applied = applyAppIssuedDocumentRecovery(
      fixture.data,
      preview,
      REPAIR_NOW,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const invoice = applied.data.documents[0]!;
    const receipt = applied.data.documents[1]!;
    expect(invoice).toEqual(beforeInvoice);
    expect(receipt.documentSnapshot).toEqual(beforeReceipt.documentSnapshot);
    expect(receipt.pdfSnapshot).toEqual(beforeReceipt.pdfSnapshot);
    expect(receipt.snapshotSeal).toEqual(beforeReceipt.snapshotSeal);
    expect(Object.hasOwn(invoice, "paymentStatus")).toBe(false);
    expect(Object.hasOwn(invoice, "paidAt")).toBe(false);
    expect(Object.hasOwn(receipt, "paymentStatus")).toBe(false);
    expect(Object.hasOwn(receipt, "paidAt")).toBe(false);
    expect(receipt.appIssuedRecoveryAttestation).toMatchObject({
      schemaVersion: 2,
      recoveryKind: "receipt_source_and_payment_markers_gap_v1",
      verifactuDisposition: "none",
    });
    expect(
      inspectAppIssuedDocumentRecoveryCollection(applied.data.documents)
        .validDocumentIds,
    ).toContain(receipt.id);

    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      applied.data,
    );
    const rolledBack = rollbackAppIssuedDocumentRecovery(
      applied.data,
      rollbackPreview,
      "2026-07-13T11:00:00.000Z",
    );
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status !== "applied") return;
    const rolledBackClaim = structuredClone(
      rolledBack.data.documents[1]?.appIssuedRecoveryAttestation,
    );
    const changedCounterpart: AppData = {
      ...rolledBack.data,
      documents: rolledBack.data.documents.map((document) =>
        document.id === fixture.invoice.id
          ? { ...document, notes: "cambio posterior de contraparte" }
          : document,
      ),
    };
    const changedPreview = buildAppIssuedDocumentRecoveryPreview(
      changedCounterpart,
    );
    expect(changedPreview.affectedCount).toBe(0);
    expect(changedPreview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: fixture.receipt.id,
        reasons: expect.arrayContaining(["recovery_attestation_invalid"]),
      }),
    );
    expect(
      changedCounterpart.documents[1]?.appIssuedRecoveryAttestation,
    ).toEqual(rolledBackClaim);
    const reapplyPreview = buildAppIssuedDocumentRecoveryPreview(
      rolledBack.data,
    );
    expect(reapplyPreview.candidates[0]?.recoveryKind).toBe(
      "receipt_source_and_payment_markers_gap_v1",
    );
    const reapplied = applyAppIssuedDocumentRecovery(
      rolledBack.data,
      reapplyPreview,
      "2026-07-13T12:00:00.000Z",
    );
    expect(reapplied.status).toBe("applied");
    if (reapplied.status !== "applied") return;
    expect(
      reapplied.data.documents[1]?.appIssuedRecoveryAttestation?.events.map(
        (event) => event.action,
      ),
    ).toEqual(["applied", "rolled_back", "applied"]);
    expect(
      applyAppIssuedDocumentRecovery(
        reapplied.data,
        reapplyPreview,
        "2026-07-13T13:00:00.000Z",
      ),
    ).toMatchObject({ status: "applied", appliedRepairIds: [] });
  });

  it("MUST BLOCK: recibos con markers mixtos, procedencia legacy, prefijo o evidencia VF no entran", () => {
    const paid = backfillReceiptWorkspace({
      invoiceSnapshotSource: "issue",
      markerMode: "paid",
    });
    const mixedReceipt = structuredClone(paid.receipt);
    delete mixedReceipt.paidAt;

    const provenance = backfillReceiptWorkspace({
      invoiceSnapshotSource: "legacy_backfill",
      markerMode: "legacy_missing",
    });
    provenance.receipt.legacyImportProvenance = {
      schemaVersion: 2,
      kind: "external_import",
      importer: "generic_documents",
      importedAt: null,
      provenanceRecordedAt: NOW,
      issuerOrigin: "unknown_legacy_import",
      documentStateAtImport: "unknown_legacy_import",
    };

    const prefixed = backfillReceiptWorkspace({
      invoiceSnapshotSource: "legacy_backfill",
      markerMode: "legacy_missing",
      invoiceId: "pcfacturacion:invoice-test",
      receiptId: "pcfacturacion:receipt-test",
    });
    const withDocumentVerifactu = structuredClone(paid.receipt);
    withDocumentVerifactu.verifactuPersistence = "legacy_unverified";

    const variants: AppData[] = [
      { ...paid.data, documents: [paid.invoice, mixedReceipt] },
      {
        ...provenance.data,
        documents: [provenance.invoice, provenance.receipt],
      },
      prefixed.data,
      { ...paid.data, documents: [paid.invoice, withDocumentVerifactu] },
    ];
    for (const data of variants) {
      expect(buildAppIssuedDocumentRecoveryPreview(data).affectedCount).toBe(
        0,
      );
    }
  });

  it("MUST PASS: omite una pareja rectificativa moderna que ya está sana", () => {
    const fixture = rectificationWorkspace();
    const frozenSnapshot = buildDocumentSnapshot(
      fixture.rectification,
      PROFILE,
      {
        capturedAt: NOW,
        source: "issue",
        issuer: fixture.original.documentSnapshot!.issuer,
      },
    );
    const frozenPdf = buildDocumentPdfSnapshot(frozenSnapshot, PROFILE, NOW);
    const data: AppData = {
      ...fixture.data,
      documents: [
        { ...fixture.original, snapshotIntegrity: undefined },
        {
          ...fixture.rectification,
          issuer: frozenSnapshot.issuer,
          documentSnapshot: frozenSnapshot,
          pdfSnapshot: frozenPdf,
          snapshotSeal: buildDocumentSnapshotSeal(
            fixture.rectification.id,
            frozenSnapshot,
            frozenPdf,
          ),
          snapshotIntegrity: undefined,
        },
      ],
    };

    expect(buildAppIssuedDocumentRecoveryPreview(data)).toMatchObject({
      affectedCount: 0,
      candidates: [],
      manualReview: [],
    });
  });

  it("MUST PASS: omite un recibo moderno que ya congela su factura origen", () => {
    const fixture = receiptWorkspace();
    const frozenSnapshot = buildDocumentSnapshot(fixture.receipt, PROFILE, {
      capturedAt: NOW,
      source: "issue",
      issuer: fixture.receipt.documentSnapshot!.issuer,
    });
    const frozenPdf = buildDocumentPdfSnapshot(frozenSnapshot, PROFILE, NOW);
    const data: AppData = {
      ...fixture.data,
      documents: [
        fixture.invoice,
        {
          ...fixture.receipt,
          documentSnapshot: frozenSnapshot,
          pdfSnapshot: frozenPdf,
          snapshotSeal: buildDocumentSnapshotSeal(
            fixture.receipt.id,
            frozenSnapshot,
            frozenPdf,
          ),
          snapshotIntegrity: undefined,
        },
      ],
    };

    expect(buildAppIssuedDocumentRecoveryPreview(data)).toMatchObject({
      affectedCount: 0,
      candidates: [],
      manualReview: [],
    });
  });

  it("MUST PASS: apply es idempotente y rollback es reversible e idempotente", () => {
    const { data, rectification } = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    const first = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(first.status).toBe("applied");
    if (first.status !== "applied") return;
    const replay = applyAppIssuedDocumentRecovery(
      first.data,
      preview,
      REPAIR_NOW,
    );
    expect(replay).toMatchObject({ status: "applied", appliedRepairIds: [] });

    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      first.data,
    );
    const rollback = rollbackAppIssuedDocumentRecovery(
      first.data,
      rollbackPreview,
      "2026-07-13T11:00:00.000Z",
    );
    expect(rollback.status).toBe("applied");
    if (rollback.status !== "applied") return;
    const restored = rollback.data.documents.find(
      (entry) => entry.id === rectification.id,
    )!;
    expect(inspectAppIssuedDocumentRecovery(restored)).toMatchObject({
      ok: true,
      active: false,
    });
    const replayRollback = rollbackAppIssuedDocumentRecovery(
      rollback.data,
      rollbackPreview,
      "2026-07-13T12:00:00.000Z",
    );
    expect(replayRollback).toMatchObject({
      status: "applied",
      rolledBackRepairIds: [],
    });

    const previousEvidence = preview.candidates[0]?.members.find(
      (member) => member.documentId === rectification.id,
    )?.sourcePdfEvidence;
    expect(previousEvidence).toBeDefined();
    const conflictingEvidence = {
      ...previousEvidence!,
      sha256: "b".repeat(64),
    };
    const conflictingPreview = buildAppIssuedDocumentRecoveryPreview(
      rollback.data,
      { [rectification.id]: conflictingEvidence },
    );
    expect(conflictingPreview.affectedCount).toBe(0);
    expect(conflictingPreview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: rectification.id,
        reasons: expect.arrayContaining(["pdf_evidence_invalid"]),
      }),
    );

    const reapplyPreview = buildAppIssuedDocumentRecoveryPreview(rollback.data);
    expect(reapplyPreview.affectedCount).toBe(1);
    const reapplied = applyAppIssuedDocumentRecovery(
      rollback.data,
      reapplyPreview,
      "2026-07-13T13:00:00.000Z",
    );
    expect(reapplied.status).toBe("applied");
    if (reapplied.status !== "applied") return;
    expect(
      reapplied.data.documents
        .find((document) => document.id === rectification.id)
        ?.appIssuedRecoveryAttestation?.events.map((event) => event.action),
    ).toEqual(["applied", "rolled_back", "applied"]);
  });

  it("MUST BLOCK: no recrea como inicial un claim perdido de una pareja ya revertida", () => {
    const fixture = rectificationWorkspace();
    const originalWithoutBundle = structuredClone(fixture.original);
    delete originalWithoutBundle.documentSnapshot;
    delete originalWithoutBundle.pdfSnapshot;
    delete originalWithoutBundle.snapshotSeal;
    originalWithoutBundle.snapshotIntegrityRequired = true;
    originalWithoutBundle.snapshotIntegrity = {
      status: "blocked",
      issues: [
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
        "document_relationship_invalid",
      ],
    };
    const before: AppData = {
      ...fixture.data,
      documents: [originalWithoutBundle, fixture.rectification],
    };
    const preview = buildAppIssuedDocumentRecoveryPreview(before, {
      [originalWithoutBundle.id]: pdfEvidence(before, originalWithoutBundle),
      [fixture.rectification.id]: pdfEvidence(before, fixture.rectification),
    });
    expect(preview.candidates[0]?.repairIds).toHaveLength(2);
    const applied = applyAppIssuedDocumentRecovery(before, preview, REPAIR_NOW);
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      applied.data,
    );
    const rolledBack = rollbackAppIssuedDocumentRecovery(
      applied.data,
      rollbackPreview,
      "2026-07-13T11:00:00.000Z",
    );
    expect(rolledBack.status).toBe("applied");
    if (rolledBack.status !== "applied") return;

    const missingOneClaim: AppData = {
      ...rolledBack.data,
      documents: rolledBack.data.documents.map((document) => {
        if (document.id !== originalWithoutBundle.id) return document;
        const copy = { ...document };
        delete copy.appIssuedRecoveryAttestation;
        return copy;
      }),
    };
    const fresh = buildAppIssuedDocumentRecoveryPreview(missingOneClaim);
    expect(fresh.affectedCount).toBe(0);
    expect(fresh.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: originalWithoutBundle.id,
        reasons: expect.arrayContaining(["recovery_attestation_invalid"]),
      }),
    );
  });

  it("MUST BLOCK: una precondición stale no aplica ningún cambio", () => {
    const { data, rectification } = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    const changed: AppData = {
      ...data,
      documents: data.documents.map((document) =>
        document.id === rectification.id
          ? { ...document, notes: "cambio posterior" }
          : document,
      ),
    };
    expect(
      applyAppIssuedDocumentRecovery(changed, preview, REPAIR_NOW),
    ).toEqual({ status: "blocked", reason: "stale_preview" });
  });

  it("MUST BLOCK: evidencia parcial, hash PDF inválido o VeriFactu nunca se bendicen", () => {
    const { data, rectification } = rectificationWorkspace();
    const partial: AppData = {
      ...data,
      documents: data.documents.map((document) =>
        document.id === rectification.id
          ? {
              ...document,
              documentSnapshot: data.documents[0].documentSnapshot,
            }
          : document,
      ),
    };
    expect(buildAppIssuedDocumentRecoveryPreview(partial).affectedCount).toBe(
      0,
    );

    const invalidPdf = pdfEvidence(data, rectification);
    invalidPdf.sha256 = "no";
    expect(
      buildAppIssuedDocumentRecoveryPreview(data, {
        [rectification.id]: invalidPdf,
      }).affectedCount,
    ).toBe(0);

    const withVerifactu: AppData = {
      ...data,
      documents: data.documents.map((document) =>
        document.id === rectification.id
          ? {
              ...document,
              verifactuPersistence: "legacy_unverified" as const,
            }
          : document,
      ),
    };
    expect(
      buildAppIssuedDocumentRecoveryPreview(withVerifactu, {
        [rectification.id]: pdfEvidence(data, rectification),
      }).affectedCount,
    ).toBe(0);
  });

  it("MUST BLOCK: una confirmación fiscal no se reutiliza tras cambiar cliente o líneas", () => {
    const { data, rectification } = rectificationWorkspace();
    const evidence = pdfEvidence(data, rectification);
    const changed: AppData = {
      ...data,
      documents: data.documents.map((document) =>
        document.id === rectification.id
          ? {
              ...document,
              client: { ...document.client, name: "Otro cliente sintético" },
              items: document.items.map((item) => ({
                ...item,
                description: "Otra línea con el mismo importe",
              })),
            }
          : document,
      ),
    };

    const preview = buildAppIssuedDocumentRecoveryPreview(changed, {
      [rectification.id]: evidence,
    });
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: rectification.id,
        reasons: expect.arrayContaining(["pdf_evidence_invalid"]),
      }),
    );
  });

  it("MUST BLOCK: una rectificativa sellada contra otro original no forma pareja híbrida", () => {
    const fixture = rectificationWorkspace();
    const original: Document = {
      ...fixture.original,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
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
    const frozenAgainstOther: Document = {
      ...fixture.rectification,
      rectification: {
        ...fixture.rectification.rectification!,
        originalDocumentId: "synthetic-other-original",
        originalNumber: "F-TEST-OTHER",
      },
    };
    const frozenSnapshot = buildDocumentSnapshot(frozenAgainstOther, PROFILE, {
      capturedAt: NOW,
      source: "issue",
      issuer: fixture.original.documentSnapshot!.issuer,
    });
    const frozenPdf = buildDocumentPdfSnapshot(frozenSnapshot, PROFILE, NOW);
    const rectification: Document = {
      ...fixture.rectification,
      documentSnapshot: frozenSnapshot,
      pdfSnapshot: frozenPdf,
      snapshotSeal: buildDocumentSnapshotSeal(
        fixture.rectification.id,
        frozenSnapshot,
        frozenPdf,
      ),
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };
    const data: AppData = {
      ...fixture.data,
      documents: [original, rectification],
    };

    const preview = buildAppIssuedDocumentRecoveryPreview(data);
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: rectification.id,
        reasons: expect.arrayContaining(["relationship_invalid"]),
      }),
    );
  });

  it("MUST BLOCK: una rectificativa sellada por otro emisor no forma pareja híbrida", () => {
    const fixture = rectificationWorkspace();
    const original: Document = {
      ...fixture.original,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
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
    const foreignIssuer = {
      ...fixture.original.documentSnapshot!.issuer,
      name: "Otro Emisor Sintético SL",
      nif: "B99999999",
    };
    const frozenSnapshot = buildDocumentSnapshot(
      fixture.rectification,
      PROFILE,
      {
        capturedAt: NOW,
        source: "issue",
        issuer: foreignIssuer,
      },
    );
    const frozenPdf = buildDocumentPdfSnapshot(frozenSnapshot, PROFILE, NOW);
    const rectification: Document = {
      ...fixture.rectification,
      issuer: foreignIssuer,
      documentSnapshot: frozenSnapshot,
      pdfSnapshot: frozenPdf,
      snapshotSeal: buildDocumentSnapshotSeal(
        fixture.rectification.id,
        frozenSnapshot,
        frozenPdf,
      ),
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };
    const data: AppData = {
      ...fixture.data,
      documents: [original, rectification],
    };

    const preview = buildAppIssuedDocumentRecoveryPreview(data);
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: original.id,
        reasons: expect.arrayContaining(["fiscal_content_mismatch"]),
      }),
    );
  });

  it("MUST BLOCK: no acepta un recibo cuyo contenido difiere de la factura", () => {
    const { data, receipt } = receiptWorkspace();
    const tampered: AppData = {
      ...data,
      documents: data.documents.map((document) =>
        document.id === receipt.id
          ? { ...document, sourceDocumentId: "otra-factura" }
          : document,
      ),
    };
    expect(buildAppIssuedDocumentRecoveryPreview(tampered).affectedCount).toBe(
      0,
    );
  });

  it("MUST BLOCK: no enlaza un recibo cuyo snapshot nombra otra factura", () => {
    const fixture = receiptWorkspace();
    const wrongNoteReceipt: Document = {
      ...fixture.receipt,
      notes: "Pago de la factura F-TEST-OTRA",
    };
    const wrongSnapshot = buildDocumentSnapshot(
      { ...wrongNoteReceipt, sourceDocumentId: undefined },
      PROFILE,
      {
        capturedAt: NOW,
        source: "issue",
        issuer: fixture.receipt.documentSnapshot!.issuer,
      },
    );
    const wrongPdf = buildDocumentPdfSnapshot(wrongSnapshot, PROFILE, NOW);
    const receipt: Document = {
      ...wrongNoteReceipt,
      documentSnapshot: wrongSnapshot,
      pdfSnapshot: wrongPdf,
      snapshotSeal: buildDocumentSnapshotSeal(
        wrongNoteReceipt.id,
        wrongSnapshot,
        wrongPdf,
      ),
    };
    const data: AppData = {
      ...fixture.data,
      documents: [fixture.invoice, receipt],
    };

    const preview = buildAppIssuedDocumentRecoveryPreview(data);
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toContainEqual(
      expect.objectContaining({
        documentId: receipt.id,
        reasons: expect.arrayContaining(["relationship_invalid"]),
      }),
    );
  });

  it("MUST BLOCK: exige una única rectificativa y un único recibo por origen", () => {
    const rectificationCase = rectificationWorkspace();
    const duplicateRectification: Document = {
      ...rectificationCase.rectification,
      id: "rectification-duplicate",
      number: "FR-TEST-0002",
    };
    expect(
      buildAppIssuedDocumentRecoveryPreview({
        ...rectificationCase.data,
        documents: [
          ...rectificationCase.data.documents,
          duplicateRectification,
        ],
      }).affectedCount,
    ).toBe(0);

    const receiptCase = receiptWorkspace();
    const duplicateReceipt: Document = {
      ...receiptCase.receipt,
      id: "receipt-duplicate",
      number: "R-TEST-0002",
    };
    expect(
      buildAppIssuedDocumentRecoveryPreview({
        ...receiptCase.data,
        documents: [...receiptCase.data.documents, duplicateReceipt],
      }).affectedCount,
    ).toBe(0);
  });

  it("MUST BLOCK: invalida el grupo si cambia una contraparte", () => {
    const { data, rectification } = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    const result = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const changed = result.data.documents.map((document) =>
      document.id === "synthetic-invoice"
        ? { ...document, notes: "cambio posterior" }
        : document,
    );
    const inspection = inspectAppIssuedDocumentRecoveryCollection(changed);
    expect(inspection.validDocumentIds).not.toContain(rectification.id);
    expect(inspection.issuesByDocumentId.get(rectification.id)).toEqual([
      "app_issued_recovery_invalid",
    ]);
  });

  it("MUST BLOCK: un replay de apply no oculta un cambio posterior de la contraparte", () => {
    const { data, rectification } = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    const first = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(first.status).toBe("applied");
    if (first.status !== "applied") return;
    const changed: AppData = {
      ...first.data,
      documents: first.data.documents.map((document) =>
        document.id === "synthetic-invoice"
          ? { ...document, notes: "cambio sintético posterior" }
          : document,
      ),
    };

    expect(
      applyAppIssuedDocumentRecovery(changed, preview, REPAIR_NOW),
    ).toEqual({ status: "blocked", reason: "stale_preview" });
  });

  it("MUST BLOCK: un replay de rollback no oculta cambios posteriores", () => {
    const { data, rectification } = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    const first = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(first.status).toBe("applied");
    if (first.status !== "applied") return;
    const rollbackPreview = buildAppIssuedDocumentRecoveryRollbackPreview(
      first.data,
    );
    const rollback = rollbackAppIssuedDocumentRecovery(
      first.data,
      rollbackPreview,
      "2026-07-13T11:00:00.000Z",
    );
    expect(rollback.status).toBe("applied");
    if (rollback.status !== "applied") return;
    const changed: AppData = {
      ...rollback.data,
      documents: rollback.data.documents.map((document) =>
        document.id === "synthetic-invoice"
          ? { ...document, notes: "cambio sintético tras rollback" }
          : document,
      ),
    };

    expect(
      rollbackAppIssuedDocumentRecovery(
        changed,
        rollbackPreview,
        "2026-07-13T12:00:00.000Z",
      ),
    ).toEqual({ status: "blocked", reason: "stale_preview" });
  });

  it("MUST BLOCK: una relación duplicada posterior invalida colección y rollback", () => {
    const fixture = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(fixture.data, {
      [fixture.rectification.id]: pdfEvidence(
        fixture.data,
        fixture.rectification,
      ),
    });
    const first = applyAppIssuedDocumentRecovery(
      fixture.data,
      preview,
      REPAIR_NOW,
    );
    expect(first.status).toBe("applied");
    if (first.status !== "applied") return;
    const duplicate: Document = {
      ...fixture.rectification,
      id: "synthetic-rectification-late-duplicate",
      number: "FR-TEST-0099",
    };
    const changed: AppData = {
      ...first.data,
      documents: [...first.data.documents, duplicate],
    };
    expect(
      inspectAppIssuedDocumentRecoveryCollection(changed.documents)
        .validDocumentIds,
    ).not.toContain(fixture.rectification.id);
    const rollback = buildAppIssuedDocumentRecoveryRollbackPreview(changed);
    expect(rollback.affectedCount).toBe(0);
    expect(rollback.blockedRepairIds).toHaveLength(1);
  });

  it("MUST BLOCK: un snapshot recovery fuera de su atestación nunca sustituye el bundle", () => {
    const { data, rectification } = rectificationWorkspace();
    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [rectification.id]: pdfEvidence(data, rectification),
    });
    const result = applyAppIssuedDocumentRecovery(data, preview, REPAIR_NOW);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const recovered = result.data.documents.find(
      (entry) => entry.id === rectification.id,
    )!;
    const misplaced: Document = {
      ...recovered,
      appIssuedRecoveryAttestation: undefined,
      documentSnapshot:
        recovered.appIssuedRecoveryAttestation?.recoveredSnapshot,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };

    expect(inspectUsableHistoricalDocumentEvidence(misplaced)).toEqual({
      ok: false,
      issues: ["app_issued_recovery_invalid"],
    });
  });
});
