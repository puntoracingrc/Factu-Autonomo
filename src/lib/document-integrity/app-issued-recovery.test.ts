import { describe, expect, it } from "vitest";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  buildDocumentSnapshotSeal,
  issueDocument,
  markDocumentPaid,
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
};

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
