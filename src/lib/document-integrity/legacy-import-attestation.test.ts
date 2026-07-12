import { describe, expect, it } from "vitest";
import type { AppData, BusinessProfile, Document } from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import { deriveLegacySnapshotForReadOnly } from "./snapshots";
import { documentAmounts } from "@/lib/vat-regime";
import { sha256Hex } from "./snapshot-hash";
import { stableStringifySnapshot } from "./snapshots";
import { isDocumentEditable } from "@/lib/documents";
import { canConvertQuoteToInvoice } from "@/lib/quote-to-invoice";
import {
  canMarkQuoteAsAccepted,
  canMarkQuoteAsRejected,
} from "@/lib/quotes";
import {
  applyLegacyImportRepair,
  attestNewImportedDocument,
  buildLegacyImportRepairPreview,
  inspectLegacyImportAttestation,
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
    const draft = { ...importedDocument(), status: "borrador" as const };
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
});
