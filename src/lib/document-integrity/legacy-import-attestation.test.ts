import { describe, expect, it } from "vitest";
import type { AppData, BusinessProfile, Document } from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import { deriveLegacySnapshotForReadOnly } from "./snapshots";
import { documentAmounts } from "@/lib/vat-regime";
import { sha256Hex } from "./snapshot-hash";
import { stableStringifySnapshot } from "./snapshots";
import { isDocumentEditable } from "@/lib/documents";
import { issueDocument } from "./index";
import { canConvertQuoteToInvoice } from "@/lib/quote-to-invoice";
import {
  canMarkQuoteAsAccepted,
  canMarkQuoteAsRejected,
  canUnmarkQuoteAsAccepted,
  canUnmarkQuoteAsRejected,
} from "@/lib/quotes";
import { canRectifyInvoice } from "@/lib/rectificativas";
import {
  applyLegacyImportRepair,
  attestNewImportedDocument,
  buildLegacyImportRepairPreview,
  hasLegacyImportProtectionClaim,
  inspectLegacyImportAttestation,
  isDocumentUsableForFinancialCalculations,
} from "./legacy-import-attestation";

const PROFILE: BusinessProfile = {
  ...EMPTY_DATA.profile,
  name: "Negocio histórico",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Madrid",
  postalCode: "28001",
  email: "negocio@example.test",
};

function importedDocument(
  id = "pcfacturacion:factura:F-2024-0001",
): Document {
  const capturedAt = "2024-04-01T10:00:00.000Z";
  return {
    id,
    type: "factura",
    number: "F-2024-0001",
    date: "2024-04-01",
    client: {
      name: "Cliente histórico",
      nif: "B12345678",
      email: "",
      phone: "",
      address: "Calle Cliente 2",
      city: "Madrid",
      postalCode: "28002",
    },
    items: [
      {
        id: "line-1",
        description: "Trabajo importado",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    issuer: {
      name: PROFILE.name,
      nif: PROFILE.nif,
      address: PROFILE.address,
      city: PROFILE.city,
      postalCode: PROFILE.postalCode,
      email: PROFILE.email,
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
}

function appData(documents: Document[]): AppData {
  return {
    ...EMPTY_DATA,
    profile: PROFILE,
    documents,
    snapshotIntegrityVersion: 1,
  };
}

describe("legacy imported document attestation", () => {
  it("repara de forma explícita un histórico PCF v1 sin fabricar PDF ni sello", () => {
    const before = appData([importedDocument()]);
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview.affectedCount).toBe(1);
    expect(preview.manualReview).toEqual([]);

    const result = applyLegacyImportRepair(
      before,
      preview,
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    const repaired = result.data.documents[0];
    expect(repaired.documentSnapshot?.source).toBe("legacy_import_attested");
    expect(repaired.documentSnapshot?.taxSummary).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(repaired.legacyImportAttestation).toMatchObject({
      schemaVersion: 1,
      kind: "historical_import_user_accepted",
      importer: "pcfacturacion",
      documentId: repaired.id,
      originalEvidence: {
        kind: "source_files_not_stored",
        preservation: "user_managed",
      },
      acceptedState: {
        status: "enviado",
        documentLifecycle: "issued",
        integrityLock: "locked",
        relationships: {
          rectifiedById: null,
          receiptDocumentId: null,
          sourceDocumentId: null,
        },
      },
    });
    expect(repaired.pdfSnapshot).toBeUndefined();
    expect(repaired.snapshotSeal).toBeUndefined();
    expect(repaired.snapshotIntegrityRequired).toBeUndefined();
    expect(repaired.snapshotIntegrity).toBeUndefined();
    expect(inspectLegacyImportAttestation(repaired)).toMatchObject({ ok: true });
    expect(isDocumentEditable(repaired)).toBe(false);

    const replay = buildLegacyImportRepairPreview(result.data);
    expect(replay.affectedCount).toBe(0);
    expect(replay.alreadyAttestedDocumentIds).toEqual([repaired.id]);
  });

  it.each([
    ["pcfacturacion:factura:F-1", "pcfacturacion"],
    ["holded:factura:F-1", "holded"],
    ["facturadirecta:factura:F-1", "facturadirecta"],
    ["generic-documents:factura:F-1", "generic_documents"],
  ] as const)("reconoce el namespace %s", (id, importer) => {
    const preview = buildLegacyImportRepairPreview(
      appData([importedDocument(id)]),
    );
    expect(preview.candidates[0]?.importer).toBe(importer);
  });

  it("no infiere legacy por fecha o ausencia de issuedAt", () => {
    const modern = importedDocument("modern-app-document");
    const preview = buildLegacyImportRepairPreview(appData([modern]));
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toEqual([]);
  });

  it("no degrada evidencia moderna parcial o corrupta a legacy", () => {
    const corrupt = {
      ...importedDocument(),
      documentSnapshot: {
        schemaVersion: 2,
        snapshotHash: "sha256:bad",
      } as Document["documentSnapshot"],
    };
    const preview = buildLegacyImportRepairPreview(appData([corrupt]));
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "existing_integrity_evidence",
    );
  });

  it("mantiene rectificativas y recibos históricos en revisión manual", () => {
    const rectification: Document = {
      ...importedDocument("pcfacturacion:factura:FR-2024-0001"),
      number: "FR-2024-0001",
      rectification: {
        originalDocumentId: "pcfacturacion:factura:F-2024-0001",
        originalNumber: "F-2024-0001",
        originalDate: "2024-04-01",
        reason: "Corrección histórica",
        type: "correccion",
      },
    };
    const receipt: Document = {
      ...importedDocument("pcfacturacion:recibo:R-2024-0001"),
      type: "recibo",
      number: "R-2024-0001",
    };

    const preview = buildLegacyImportRepairPreview(
      appData([rectification, receipt]),
    );

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toHaveLength(2);
    expect(
      preview.manualReview.every((item) =>
        item.reasons.includes("unsupported_historical_relation"),
      ),
    ).toBe(true);
  });

  it("manda a revisión candidatos con la misma identidad fiscal", () => {
    const first = importedDocument("pcfacturacion:factura:F-2024-0001");
    const second = importedDocument("holded:factura:F-2024-0001");

    const preview = buildLegacyImportRepairPreview(appData([first, second]));

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toHaveLength(2);
    expect(
      preview.manualReview.every((item) =>
        item.reasons.includes("duplicate_fiscal_identity"),
      ),
    ).toBe(true);
  });

  it("manda a revisión un candidato que colisiona con una factura sellada", () => {
    const historical = importedDocument();
    const sealed = issueDocument(
      {
        ...historical,
        id: "app-issued-invoice",
        status: "borrador",
        issuer: undefined,
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        snapshotIntegrityRequired: undefined,
        snapshotIntegrity: undefined,
      },
      PROFILE,
      "2024-04-01T12:00:00.000Z",
    );

    const preview = buildLegacyImportRepairPreview(
      appData([historical, sealed]),
    );

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toEqual([
      expect.objectContaining({
        documentId: historical.id,
        reasons: ["duplicate_fiscal_identity"],
      }),
    ]);
  });

  it.each([
    ["anulado", { status: "anulada" as const }],
    ["rectificado", { status: "rectificada" as const }],
    ["ciclo cancelado", { documentLifecycle: "canceled" as const }],
    ["rectificación enlazada", { rectifiedById: "rectification-id" }],
    ["recibo enlazado", { receiptDocumentId: "receipt-id" }],
  ])("no confirma automáticamente un histórico con %s", (_label, change) => {
    const historical = { ...importedDocument(), ...change };

    const preview = buildLegacyImportRepairPreview(appData([historical]));

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "unsupported_historical_relation",
    );
  });

  it("reutiliza el contenido congelado de un snapshot legacy válido sin fabricar su pareja", () => {
    const historical = importedDocument();
    const frozen = deriveLegacySnapshotForReadOnly(historical, PROFILE);
    const residue: Document = {
      ...historical,
      items: [{ ...historical.items[0], unitPrice: 999 }],
      documentSnapshot: frozen,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["pdf_snapshot_missing", "snapshot_seal_missing"],
      },
    };
    const before = appData([residue]);
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview.affectedCount).toBe(1);
    expect(documentAmounts(residue, false).total).toBe(0);
    const result = applyLegacyImportRepair(
      before,
      preview,
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    expect(result.data.documents[0].documentSnapshot?.taxSummary).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(result.data.documents[0].items[0].unitPrice).toBe(100);
    expect(result.data.documents[0].documentSnapshot).toEqual(frozen);
    expect(documentAmounts(result.data.documents[0], false).total).toBe(121);
    expect(result.data.documents[0].pdfSnapshot).toBeUndefined();
    expect(result.data.documents[0].snapshotSeal).toBeUndefined();
  });

  it("ignora exención y VeriFactu actuales al congelar el contenido histórico", () => {
    const before = {
      ...appData([importedDocument()]),
      profile: {
        ...PROFILE,
        vatExempt: true,
        verifactu: { enabled: true, environment: "production" as const },
      },
    };
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    const snapshot = result.data.documents[0].documentSnapshot!;
    expect(snapshot.taxSummary).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(snapshot.fiscalContext.vatExempt).toBe(false);
    expect(snapshot.fiscalContext.verifactu).toBeUndefined();
    expect(snapshot.verifactu).toBeUndefined();
  });

  it("persiste procedencia en un borrador externo sin presentarlo como atestado", () => {
    const draft: Document = {
      ...importedDocument(),
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };
    const imported = attestNewImportedDocument(
      draft,
      PROFILE,
      "pcfacturacion",
      "2026-07-12T22:00:00.000Z",
    );

    expect(imported.legacyImportProvenance).toEqual({
      schemaVersion: 1,
      kind: "external_import",
      importer: "pcfacturacion",
      importedAt: "2026-07-12T22:00:00.000Z",
    });
    expect(imported.legacyImportAttestation).toBeUndefined();
    expect(imported.documentSnapshot).toBeUndefined();
    expect(hasLegacyImportProtectionClaim(imported)).toBe(false);
    expect(isDocumentEditable(imported)).toBe(true);
  });

  it("no confunde un borrador externo operativo con un histórico atestado", () => {
    const quoteDraft: Document = {
      ...importedDocument("holded:presupuesto:P-2026-0001"),
      type: "presupuesto",
      number: "P-2026-0001",
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };
    const imported = attestNewImportedDocument(
      quoteDraft,
      PROFILE,
      "holded",
      "2026-07-12T22:00:00.000Z",
    );
    const locallySent = { ...imported, status: "enviado" as const };

    expect(locallySent.legacyImportProvenance).toBeDefined();
    expect(locallySent.legacyImportAttestation).toBeUndefined();
    expect(hasLegacyImportProtectionClaim(locallySent)).toBe(false);
    expect(isDocumentEditable(locallySent)).toBe(true);
    expect(canConvertQuoteToInvoice(locallySent)).toBe(true);
    expect(canMarkQuoteAsAccepted(locallySent)).toBe(true);
    const preview = buildLegacyImportRepairPreview(appData([locallySent]));
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "unexpected_integrity_issue",
    );
  });

  it("protege un presupuesto de namespace conocido antes de atestarlo", () => {
    const residue: Document = {
      ...importedDocument("pcfacturacion:presupuesto:P-2024-0001"),
      type: "presupuesto",
      number: "P-2024-0001",
    };

    expect(inspectLegacyImportAttestation(residue).ok).toBe(false);
    expect(hasLegacyImportProtectionClaim(residue)).toBe(true);
    expect(isDocumentEditable(residue)).toBe(false);
    expect(canConvertQuoteToInvoice(residue)).toBe(false);
    expect(canMarkQuoteAsAccepted(residue)).toBe(false);
    expect(canMarkQuoteAsRejected(residue)).toBe(false);
  });

  it("mantiene congelados también los presupuestos históricos", () => {
    const quote: Document = {
      ...importedDocument("holded:presupuesto:P-2024-0001"),
      type: "presupuesto",
      number: "P-2024-0001",
    };
    const imported = attestNewImportedDocument(
      quote,
      PROFILE,
      "holded",
      "2026-07-12T22:00:00.000Z",
    );

    expect(inspectLegacyImportAttestation(imported).ok).toBe(true);
    expect(isDocumentEditable(imported)).toBe(false);
    expect(canConvertQuoteToInvoice(imported)).toBe(false);
    expect(canMarkQuoteAsAccepted(imported)).toBe(false);
    expect(canMarkQuoteAsRejected(imported)).toBe(false);

    const tampered = {
      ...imported,
      legacyImportAttestation: {
        ...imported.legacyImportAttestation!,
        attestationHash: "sha256:tampered",
      },
    };
    expect(inspectLegacyImportAttestation(tampered).ok).toBe(false);
    expect(hasLegacyImportProtectionClaim(tampered)).toBe(true);
    expect(isDocumentUsableForFinancialCalculations(tampered)).toBe(false);
    expect(isDocumentEditable(tampered)).toBe(false);
    expect(canConvertQuoteToInvoice(tampered)).toBe(false);
    expect(canMarkQuoteAsAccepted(tampered)).toBe(false);
    expect(canMarkQuoteAsRejected(tampered)).toBe(false);
    expect(
      canUnmarkQuoteAsAccepted({ ...tampered, status: "aceptado" }),
    ).toBe(false);
    expect(
      canUnmarkQuoteAsRejected({ ...tampered, status: "rechazado" }),
    ).toBe(false);
  });

  it.each([
    { client: { name: "Cliente sin datos" } },
    {
      items: [
        {
          id: "bad-vat",
          description: "IVA imposible",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 101,
        },
      ],
    },
    {
      items: [
        {
          id: "negative",
          description: "Factura ordinaria negativa",
          quantity: 1,
          unitPrice: -100,
          ivaPercent: 21,
        },
      ],
    },
  ] as Array<Partial<Document>>)(
    "excluye de confirmación contenido que el exportador fiscal rechazaría %#",
    (change) => {
      const preview = buildLegacyImportRepairPreview(
        appData([{ ...importedDocument(), ...change }]),
      );
      expect(preview.affectedCount).toBe(0);
      expect(preview.manualReview[0]?.reasons).toContain(
        "fiscal_content_invalid",
      );
    },
  );

  it("bloquea una vista previa obsoleta sin aplicar parcialmente", () => {
    const before = appData([importedDocument()]);
    const preview = buildLegacyImportRepairPreview(before);
    const changed = {
      ...before,
      documents: before.documents.map((document) => ({
        ...document,
        notes: "Cambio posterior",
      })),
    };
    expect(applyLegacyImportRepair(changed, preview)).toEqual({
      status: "blocked",
      reason: "stale_preview",
    });
  });

  it("detecta cualquier manipulación posterior del snapshot o la atestación", () => {
    const before = appData([importedDocument()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const repaired = result.data.documents[0];
    const tamperedSnapshot = {
      ...repaired,
      documentSnapshot: {
        ...repaired.documentSnapshot!,
        number: "F-MANIPULADA",
      },
    };
    const tamperedAttestation = {
      ...repaired,
      legacyImportAttestation: {
        ...repaired.legacyImportAttestation!,
        attestedAt: "2026-07-13T00:00:00.000Z",
      },
    };
    expect(inspectLegacyImportAttestation(tamperedSnapshot).ok).toBe(false);
    expect(inspectLegacyImportAttestation(tamperedAttestation).ok).toBe(false);
    expect(isDocumentUsableForFinancialCalculations(tamperedAttestation)).toBe(
      false,
    );
    expect(isDocumentEditable(tamperedAttestation)).toBe(false);
    expect(canRectifyInvoice(tamperedAttestation)).toBe(false);

    const invalidEvidence = {
      ...repaired,
      legacyImportAttestation: {
        ...repaired.legacyImportAttestation!,
        originalEvidence: {
          kind: "external_pdf_claimed" as never,
          preservation: "stored_by_app" as never,
        },
      },
    };
    const { attestationHash: previousHash, ...payload } =
      invalidEvidence.legacyImportAttestation!;
    expect(previousHash).toMatch(/^sha256:/);
    invalidEvidence.legacyImportAttestation!.attestationHash =
      `sha256:${sha256Hex(stableStringifySnapshot(payload))}`;
    expect(inspectLegacyImportAttestation(invalidEvidence).ok).toBe(false);
  });

  it.each([
    ["estado pagado", { status: "pagado" as const }],
    ["vuelta a borrador", { status: "borrador" as const }],
    ["entrega", { deliveryStatus: "sent" as const }],
    ["pago", { paymentStatus: "paid" as const }],
    ["rectificativa asociada", { rectifiedById: "rectification-id" }],
    ["recibo asociado", { receiptDocumentId: "receipt-id" }],
    [
      "presupuesto de origen",
      {
        sourceQuoteDocumentId: "quote-id",
        sourceQuoteNumber: "P-2024-0001",
      },
    ],
  ])("bloquea el histórico si cambia su %s", (_label, change) => {
    const before = appData([importedDocument()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    const tampered: Document = {
      ...result.data.documents[0],
      ...change,
    };
    expect(inspectLegacyImportAttestation(tampered).ok).toBe(false);
    expect(isDocumentUsableForFinancialCalculations(tampered)).toBe(false);
    expect(hasLegacyImportProtectionClaim(tampered)).toBe(true);
    expect(isDocumentEditable(tampered)).toBe(false);
  });
});
