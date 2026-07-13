import { describe, expect, it } from "vitest";
import type {
  AppData,
  BusinessProfile,
  Document,
  DocumentSnapshot,
} from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import { deriveLegacySnapshotForReadOnly } from "./snapshots";
import { documentAmounts } from "@/lib/vat-regime";
import { legacyFnv1a32, sha256Hex } from "./snapshot-hash";
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
  detectLegacyImportSource,
  hasLegacyImportProtectionClaim,
  inspectLegacyImportRelationshipCollection,
  inspectLegacyImportAttestation,
  isDocumentUsableForFinancialCalculations,
  projectLegacyImportSnapshotOntoDocument,
} from "./legacy-import-attestation";
import { withDocumentRelationshipIntegritySignals } from "./relationships";

const PROFILE: BusinessProfile = {
  ...EMPTY_DATA.profile,
  name: "Negocio histórico",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Madrid",
  postalCode: "28001",
  email: "negocio@example.test",
};

function importedDocument(id = "pcfacturacion:factura:F-2024-0001"): Document {
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

function historicalCorrectionPair(): [Document, Document] {
  const rectificationId = "pcfacturacion:factura:FR-2024-0001";
  const original: Document = {
    ...importedDocument("pcfacturacion:factura:F-2024-0001"),
    status: "rectificada",
    rectifiedById: rectificationId,
  };
  const rectification: Document = {
    ...importedDocument(rectificationId),
    number: "FR-2024-0001",
    date: "2024-04-02",
    client: {
      ...original.client,
      name: "Cliente histórico corregido",
    },
    rectification: {
      originalDocumentId: original.id,
      originalNumber: original.number,
      originalDate: original.date,
      reason: "Corrección de datos del cliente",
      type: "correccion",
    },
  };
  return [original, rectification];
}

function historicalCancellationPair(): [Document, Document] {
  const rectificationId = "pcfacturacion:factura:FR-2024-0002";
  const original: Document = {
    ...importedDocument("pcfacturacion:factura:F-2024-0002"),
    number: "F-2024-0002",
    status: "anulada",
    documentLifecycle: "canceled",
    rectifiedById: rectificationId,
  };
  const rectification: Document = {
    ...importedDocument(rectificationId),
    number: "FR-2024-0002",
    date: "2024-04-03",
    items: original.items.map((item) => ({
      ...item,
      id: `cancel-${item.id}`,
      unitPrice: -item.unitPrice,
    })),
    rectification: {
      originalDocumentId: original.id,
      originalNumber: original.number,
      originalDate: original.date,
      reason: "Anulación completa",
      type: "anulacion",
    },
  };
  return [original, rectification];
}

function historicalReceiptPair(): [Document, Document] {
  const receiptId = "pcfacturacion:recibo:R-2024-0001";
  const invoice: Document = {
    ...importedDocument("pcfacturacion:factura:F-2024-0003"),
    number: "F-2024-0003",
    status: "pagado",
    receiptDocumentId: receiptId,
  };
  const receipt: Document = {
    ...importedDocument(receiptId),
    type: "recibo",
    number: "R-2024-0001",
    date: "2024-04-04",
    status: "pagado",
    sourceDocumentId: invoice.id,
  };
  return [invoice, receipt];
}

describe("legacy imported document attestation", () => {
  it("repara de forma explícita un histórico PCF v2 sin fabricar PDF ni sello", () => {
    const before = appData([importedDocument()]);
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview.affectedCount).toBe(1);
    expect(preview.manualReview).toEqual([]);
    expect(preview.schemaVersion).toBe(2);
    expect(preview.relationshipGroups).toEqual([]);
    expect(preview.candidates[0]).toMatchObject({
      issuerOrigin: "current_profile_at_import",
      completenessExceptions: [],
      amounts: { subtotal: 100, iva: 21, total: 121 },
    });

    const result = applyLegacyImportRepair(
      before,
      preview,
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.appliedRelationshipGroupFingerprints).toEqual([]);

    const repaired = result.data.documents[0];
    expect(repaired.documentSnapshot?.source).toBe("legacy_import_attested");
    expect(repaired.documentSnapshot?.taxSummary).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(repaired.legacyImportAttestation).toMatchObject({
      schemaVersion: 2,
      kind: "historical_import_user_accepted",
      importer: "pcfacturacion",
      documentId: repaired.id,
      acceptanceBasis: "amounts_as_filed_user_attested",
      amountOrigin: "persisted_lines_user_confirmed",
      importProvenance: {
        schemaVersion: 2,
        kind: "external_import",
        importer: "pcfacturacion",
        importedAt: null,
        provenanceRecordedAt: "2026-07-12T22:00:00.000Z",
        issuerOrigin: "current_profile_at_import",
        documentStateAtImport: "unknown_legacy_import",
      },
      acceptedContentPolicy: {
        kind: "stored_fiscal_content_user_authoritative",
        completenessExceptions: [],
      },
      acceptedTaxSummary: {
        subtotal: 100,
        iva: 21,
        total: 121,
      },
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
    expect(repaired.legacyImportAttestation).toHaveProperty(
      "sourceRecordHash",
      expect.stringMatching(/^sha256:/),
    );
    expect(repaired.pdfSnapshot).toBeUndefined();
    expect(repaired.snapshotSeal).toBeUndefined();
    expect(repaired.snapshotIntegrityRequired).toBeUndefined();
    expect(repaired.snapshotIntegrity).toBeUndefined();
    expect(inspectLegacyImportAttestation(repaired)).toMatchObject({
      ok: true,
    });
    expect(isDocumentEditable(repaired)).toBe(false);

    const replay = buildLegacyImportRepairPreview(result.data);
    expect(replay.affectedCount).toBe(0);
    expect(replay.alreadyAttestedDocumentIds).toEqual([repaired.id]);
  });

  it.each([
    [
      "corrección positiva",
      historicalCorrectionPair,
      "rectification_correction",
    ],
    [
      "anulación exacta",
      historicalCancellationPair,
      "rectification_cancellation",
    ],
    ["factura y recibo", historicalReceiptPair, "invoice_receipt"],
  ] as const)(
    "atesta como grupo V3 una pareja histórica inequívoca: %s",
    (_label, buildPair, expectedRelation) => {
      const before = appData([...buildPair()]);
      const preview = buildLegacyImportRepairPreview(before);

      expect(preview.schemaVersion).toBe(3);
      expect(preview.affectedCount).toBe(2);
      expect(preview.manualReview).toEqual([]);
      expect(preview.relationshipGroups).toHaveLength(1);
      expect(preview.relationshipGroups[0]).toMatchObject({
        relation: expectedRelation,
        groupFingerprint: expect.stringMatching(/^sha256:/),
        documentIds: before.documents.map((document) => document.id),
        documentNumbers: before.documents.map((document) => document.number),
      });

      const result = applyLegacyImportRepair(
        before,
        preview,
        "2026-07-13T09:00:00.000Z",
      );
      expect(result.status).toBe("applied");
      if (result.status !== "applied") return;
      expect(result.appliedDocumentIds).toEqual(
        before.documents.map((document) => document.id),
      );
      expect(result.appliedRelationshipGroupFingerprints).toEqual([
        preview.relationshipGroups[0].groupFingerprint,
      ]);
      expect(
        result.data.documents.every(
          (document) =>
            document.legacyImportAttestation?.schemaVersion === 3 &&
            inspectLegacyImportAttestation(document).ok,
        ),
      ).toBe(true);
      const relationshipInspection = inspectLegacyImportRelationshipCollection(
        result.data.documents,
      );
      expect([...relationshipInspection.validDocumentIds].sort()).toEqual(
        before.documents.map((document) => document.id).sort(),
      );
      expect(
        withDocumentRelationshipIntegritySignals(result.data.documents).every(
          (document) => !document.snapshotIntegrity,
        ),
      ).toBe(true);
      const replay = buildLegacyImportRepairPreview(result.data);
      expect(replay.affectedCount).toBe(0);
      expect(replay.alreadyAttestedDocumentIds.sort()).toEqual(
        before.documents.map((document) => document.id).sort(),
      );
    },
  );

  it("solo admite el namespace recibo al quedar protegido por un V3 válido", () => {
    const before = appData([...historicalReceiptPair()]);
    expect(detectLegacyImportSource(before.documents[1])).toBeNull();
    expect(before.documents[1].legacyImportAttestation).toBeUndefined();
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-13T09:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.documents[1].legacyImportAttestation).toMatchObject({
      schemaVersion: 3,
      relationshipGroup: { role: "receipt" },
    });
    expect(detectLegacyImportSource(result.data.documents[1])).toBe(
      "pcfacturacion",
    );
    expect(inspectLegacyImportAttestation(result.data.documents[1]).ok).toBe(
      true,
    );
  });

  it.each([
    ["rectificativa huérfana", () => [historicalCorrectionPair()[1]]],
    [
      "relación no recíproca",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [{ ...original, rectifiedById: undefined }, rectification];
      },
    ],
    [
      "corrección con importes distintos",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [
          original,
          {
            ...rectification,
            items: rectification.items.map((item) => ({
              ...item,
              unitPrice: item.unitPrice + 1,
            })),
          },
        ];
      },
    ],
    [
      "recibo con contenido distinto",
      () => {
        const [invoice, receipt] = historicalReceiptPair();
        return [
          invoice,
          {
            ...receipt,
            items: receipt.items.map((item) => ({ ...item, quantity: 2 })),
          },
        ];
      },
    ],
    [
      "evidencia moderna presente",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [
          original,
          { ...rectification, snapshotSeal: { schemaVersion: 1 } as never },
        ];
      },
    ],
    [
      "VeriFactu presente",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [
          original,
          {
            ...rectification,
            verifactuPersistence: "legacy_unverified" as const,
          },
        ];
      },
    ],
    [
      "cuarentena presente",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [
          original,
          {
            ...rectification,
            integrityQuarantine: {
              reason: "malformed_document" as const,
              rawDocument: {},
            },
          },
        ];
      },
    ],
    [
      "rectificativa con emisor distinto",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [
          original,
          {
            ...rectification,
            issuer: { ...rectification.issuer!, nif: "B87654321" },
          },
        ];
      },
    ],
    [
      "recibo con emisor distinto",
      () => {
        const [invoice, receipt] = historicalReceiptPair();
        return [
          invoice,
          { ...receipt, issuer: { ...receipt.issuer!, nif: "B87654321" } },
        ];
      },
    ],
    [
      "rectificativa sin estado operativo",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [original, { ...rectification, status: "rectificada" as const }];
      },
    ],
    [
      "original con relación lateral huérfana",
      () => {
        const [original, rectification] = historicalCorrectionPair();
        return [
          { ...original, receiptDocumentId: "receipt-missing" },
          rectification,
        ];
      },
    ],
    [
      "recibo con relación lateral extra",
      () => {
        const [invoice, receipt] = historicalReceiptPair();
        return [
          invoice,
          { ...receipt, rectifiedById: "rectification-missing" },
        ];
      },
    ],
  ] as Array<[string, () => Document[]]>)(
    "deja en revisión y no atesta una relación histórica ambigua: %s",
    (_label, build) => {
      const preview = buildLegacyImportRepairPreview(appData(build()));
      expect(preview.relationshipGroups).toEqual([]);
      expect(preview.affectedCount).toBe(0);
      expect(preview.manualReview.length).toBeGreaterThan(0);
    },
  );

  it("explica ambos miembros si una colisión fiscal invalida el grupo", () => {
    const [original, rectification] = historicalCorrectionPair();
    const collision: Document = {
      ...original,
      id: "app-issued-duplicate-identity",
      rectifiedById: undefined,
      status: "enviado",
      integrityLock: "unlocked",
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
    };
    const preview = buildLegacyImportRepairPreview(
      appData([original, rectification, collision]),
    );
    expect(preview.relationshipGroups).toEqual([]);
    expect(preview.affectedCount).toBe(0);
    expect(
      preview.manualReview.find((item) => item.documentId === original.id)
        ?.reasons,
    ).toEqual(
      expect.arrayContaining([
        "duplicate_fiscal_identity",
        "unsupported_historical_relation",
      ]),
    );
    expect(
      preview.manualReview.find((item) => item.documentId === rectification.id)
        ?.reasons,
    ).toContain("unsupported_historical_relation");
  });

  it("bloquea atómicamente una vista V3 stale", () => {
    const before = appData([...historicalReceiptPair()]);
    const preview = buildLegacyImportRepairPreview(before);
    const changed: AppData = {
      ...before,
      documents: before.documents.map((document, index) =>
        index === 0 ? { ...document, notes: "Cambio posterior" } : document,
      ),
    };
    expect(applyLegacyImportRepair(changed, preview)).toEqual({
      status: "blocked",
      reason: "stale_preview",
    });
    expect(
      changed.documents.every(
        (document) => document.legacyImportAttestation === undefined,
      ),
    ).toBe(true);
  });

  it("bloquea ambos extremos si un V3 se queda huérfano o su hash cruzado cambia", () => {
    const before = appData([...historicalReceiptPair()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-13T09:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    const orphanInspection = inspectLegacyImportRelationshipCollection([
      result.data.documents[0],
    ]);
    expect(orphanInspection.validDocumentIds.size).toBe(0);
    const [orphan] = withDocumentRelationshipIntegritySignals([
      result.data.documents[0],
    ]);
    expect(orphan.snapshotIntegrity?.issues).toContain(
      "document_relationship_invalid",
    );

    const tampered = structuredClone(result.data.documents);
    const attestation = tampered[1].legacyImportAttestation!;
    if (attestation.schemaVersion !== 3) return;
    attestation.relationshipGroup.relationshipHash = "sha256:tampered";
    const payload = { ...attestation } as Record<string, unknown>;
    delete payload.attestationHash;
    attestation.attestationHash = `sha256:${sha256Hex(
      stableStringifySnapshot(payload),
    )}`;
    const checked = withDocumentRelationshipIntegritySignals(tampered);
    expect(
      checked.every((document) =>
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        ),
      ),
    ).toBe(true);
  });

  it("bloquea ambos extremos si cambia la rectificación viva aunque el snapshot siga intacto", () => {
    const before = appData([...historicalCorrectionPair()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-13T09:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    const tampered = structuredClone(result.data.documents);
    tampered[1].rectification = undefined;

    expect(inspectLegacyImportAttestation(tampered[1]).ok).toBe(false);
    const checked = withDocumentRelationshipIntegritySignals(tampered);
    expect(
      checked.every((document) =>
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        ),
      ),
    ).toBe(true);
  });

  it("recalcula la huella del grupo y bloquea una sustitución coordinada", () => {
    const before = appData([...historicalReceiptPair()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-13T09:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;

    const tampered = structuredClone(result.data.documents);
    for (const document of tampered) {
      const attestation = document.legacyImportAttestation;
      if (!attestation || attestation.schemaVersion !== 3) return;
      attestation.relationshipGroup.groupFingerprint = "sha256:tampered";
      const payload = { ...attestation } as Record<string, unknown>;
      delete payload.attestationHash;
      attestation.attestationHash = `sha256:${sha256Hex(
        stableStringifySnapshot(payload),
      )}`;
    }

    const checked = withDocumentRelationshipIntegritySignals(tampered);
    expect(
      checked.every((document) =>
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        ),
      ),
    ).toBe(true);
  });

  it("la proyección fiscal nunca borra un bloqueo relacional posterior", () => {
    const before = appData([importedDocument()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const blocked: Document = {
      ...result.data.documents[0],
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_relationship_invalid"],
      },
    };

    const projected = projectLegacyImportSnapshotOntoDocument(blocked);

    expect(projected.snapshotIntegrity).toEqual(blocked.snapshotIntegrity);
    expect(isDocumentUsableForFinancialCalculations(projected)).toBe(false);
    expect(documentAmounts(projected, false).total).toBe(0);
  });

  it("no presenta dos copias de la misma atestación como históricos utilizables", () => {
    const before = appData([importedDocument()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const attested = result.data.documents[0];

    const preview = buildLegacyImportRepairPreview(
      appData([attested, { ...attested }]),
    );

    expect(preview.affectedCount).toBe(0);
    expect(preview.alreadyAttestedDocumentIds).toEqual([]);
    expect(preview.manualReview).toEqual([
      expect.objectContaining({
        documentId: attested.id,
        reasons: ["duplicate_document_id"],
      }),
    ]);
  });

  it("manda a revisión dos atestaciones con mismo número si una no conserva NIF", () => {
    const attestedAt = "2026-07-12T22:00:00.000Z";
    const weak = attestNewImportedDocument(
      {
        ...importedDocument("pcfacturacion:factura:F-2024-0001"),
        issuer: { ...importedDocument().issuer!, nif: "" },
      },
      PROFILE,
      "pcfacturacion",
      attestedAt,
      { issuerOrigin: "current_profile_at_import" },
    );
    const strong = attestNewImportedDocument(
      importedDocument("holded:factura:F-2024-0001"),
      PROFILE,
      "holded",
      attestedAt,
      { issuerOrigin: "current_profile_at_import" },
    );

    const preview = buildLegacyImportRepairPreview(appData([weak, strong]));

    expect(preview.alreadyAttestedDocumentIds).toEqual([]);
    expect(preview.manualReview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: weak.id,
          reasons: ["duplicate_fiscal_identity"],
        }),
        expect.objectContaining({
          documentId: strong.id,
          reasons: ["duplicate_fiscal_identity"],
        }),
      ]),
    );
  });

  it.each([
    ["dos NIF no estándar", "SIN-NIF", "NO-CONSTA"],
    ["uno no estándar y uno válido", "SIN-NIF", PROFILE.nif],
  ])("bloquea la identidad duplicada con %s", (_label, firstNif, secondNif) => {
    const makeAttested = (
      id: string,
      importer: "pcfacturacion" | "holded",
      nif: string,
    ) =>
      attestNewImportedDocument(
        {
          ...importedDocument(id),
          issuer: { ...importedDocument().issuer!, nif },
        },
        PROFILE,
        importer,
        "2026-07-12T22:00:00.000Z",
        { issuerOrigin: "current_profile_at_import" },
      );
    const first = makeAttested(
      "pcfacturacion:factura:F-2024-0001",
      "pcfacturacion",
      firstNif,
    );
    const second = makeAttested(
      "holded:factura:F-2024-0001",
      "holded",
      secondNif,
    );

    const preview = buildLegacyImportRepairPreview(appData([first, second]));

    expect(preview.alreadyAttestedDocumentIds).toEqual([]);
    expect(preview.manualReview).toHaveLength(2);
    expect(
      preview.manualReview.every((item) =>
        item.reasons.includes("duplicate_fiscal_identity"),
      ),
    ).toBe(true);
  });

  it.each([
    ["pcfacturacion:factura:F-1", "pcfacturacion"],
    ["holded:factura:F-1", "holded"],
    ["facturadirecta:factura:F-1", "facturadirecta"],
    ["generic-documents:factura:F-1", "generic_documents"],
  ] as const)("reconoce el namespace %s", (id, importer) => {
    const base = importedDocument(id);
    const historical: Document =
      importer === "pcfacturacion"
        ? base
        : importer === "generic_documents"
          ? {
              ...base,
              legacyImportProvenance: {
                schemaVersion: 2,
                kind: "external_import",
                importer,
                importedAt: "2026-07-01T10:00:00.000Z",
                provenanceRecordedAt: "2026-07-01T10:00:00.000Z",
                issuerOrigin: "unknown_legacy_import",
                documentStateAtImport: "issued",
              },
            }
          : {
              ...base,
              issuedAt: base.createdAt,
              legacyImportProvenance: {
                schemaVersion: 1,
                kind: "external_import",
                importer,
                importedAt: "2026-07-01T10:00:00.000Z",
              },
            };
    const preview = buildLegacyImportRepairPreview(appData([historical]));
    expect(preview.candidates[0]?.importer).toBe(importer);
  });

  it("no infiere legacy por fecha o ausencia de issuedAt", () => {
    const modern = importedDocument("modern-app-document");
    const preview = buildLegacyImportRepairPreview(appData([modern]));
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toEqual([]);
  });

  it("no degrada a legacy un documento PCF con señal de emisión de la app", () => {
    const appIssuedClaim: Document = {
      ...importedDocument(),
      issuedAt: "2024-04-01T12:00:00.000Z",
    };

    const preview = buildLegacyImportRepairPreview(appData([appIssuedClaim]));

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "existing_integrity_evidence",
    );
  });

  it("no degrada un borrador externo emitido por Factu aunque conserve procedencia", () => {
    const importedAt = "2026-07-01T10:00:00.000Z";
    const externalDraft: Document = {
      ...importedDocument("holded:factura:F-2026-0001"),
      status: "borrador",
      issuer: undefined,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: undefined,
      issuedAt: undefined,
      legacyImportProvenance: {
        schemaVersion: 2,
        kind: "external_import",
        importer: "holded",
        importedAt,
        provenanceRecordedAt: importedAt,
        issuerOrigin: "current_profile_at_import",
        documentStateAtImport: "draft",
      },
    };
    const issued = issueDocument(
      externalDraft,
      PROFILE,
      "2026-07-02T10:00:00.000Z",
    );
    const lostModernEvidence: Document = {
      ...issued,
      documentSnapshot: undefined,
      pdfSnapshot: undefined,
      snapshotSeal: undefined,
      issuedAt: undefined,
      sentAt: undefined,
      paidAt: undefined,
      acceptedAt: undefined,
      deliveryStatus: undefined,
      paymentStatus: undefined,
      acceptanceStatus: undefined,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: {
        status: "blocked",
        issues: [
          "document_snapshot_missing",
          "pdf_snapshot_missing",
          "snapshot_seal_missing",
        ],
      },
    };

    const preview = buildLegacyImportRepairPreview(
      appData([lostModernEvidence]),
    );

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "existing_integrity_evidence",
    );

    const directRetry = attestNewImportedDocument(
      lostModernEvidence,
      PROFILE,
      "holded",
      "2026-07-03T10:00:00.000Z",
      { issuerOrigin: "current_profile_at_import" },
    );
    expect(directRetry).toBe(lostModernEvidence);
    expect(directRetry.legacyImportAttestation).toBeUndefined();
  });

  it("no convierte por el atajo directo una procedencia V1 ya persistida", () => {
    const historical: Document = {
      ...importedDocument(),
      legacyImportProvenance: {
        schemaVersion: 1,
        kind: "external_import",
        importer: "pcfacturacion",
        importedAt: "2024-04-01T10:00:00.000Z",
      },
    };

    const retried = attestNewImportedDocument(
      historical,
      PROFILE,
      "pcfacturacion",
      "2026-07-13T08:00:00.000Z",
    );

    expect(retried).toBe(historical);
    expect(retried.legacyImportAttestation).toBeUndefined();
  });

  it("reconoce issuedAt histórico de Holded solo con una importación anterior persistida", () => {
    const issuedAt = "2024-04-01T10:00:00.000Z";
    const holdedHistorical: Document = {
      ...importedDocument("holded:factura:F-2024-0001"),
      issuedAt,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      deliveryStatus: "not_sent",
      paymentStatus: "pending",
      acceptanceStatus: "not_applicable",
      legacyImportProvenance: {
        schemaVersion: 1,
        kind: "external_import",
        importer: "holded",
        importedAt: "2026-07-01T10:00:00.000Z",
      },
    };

    const preview = buildLegacyImportRepairPreview(appData([holdedHistorical]));

    expect(preview.affectedCount).toBe(1);
    expect(preview.candidates[0]).toMatchObject({
      importer: "holded",
      issuerOrigin: "current_profile_at_import",
    });
  });

  it.each([
    ["holded:factura:F-2024-0001", "holded"],
    ["facturadirecta:factura:F-2024-0001", "facturadirecta"],
  ] as const)(
    "recupera el histórico pre-V2 %s con huella estructural del importador",
    (id, importer) => {
      const issuedAt = "2024-04-01T10:00:00.000Z";
      const historical: Document = {
        ...importedDocument(id),
        issuedAt,
        createdAt: issuedAt,
        updatedAt: issuedAt,
        deliveryStatus: "not_sent",
        paymentStatus: "pending",
        acceptanceStatus: "not_applicable",
        legacyImportProvenance: undefined,
      };

      const preview = buildLegacyImportRepairPreview(appData([historical]));

      expect(preview.affectedCount).toBe(1);
      expect(preview.candidates[0]?.importer).toBe(importer);
      expect(preview.candidates[0]?.issuerOrigin).toBe(
        "current_profile_at_import",
      );
    },
  );

  it("recupera un Word/Excel pre-V2 solo cuando conserva snapshot legacy íntegro", () => {
    const historical: Document = {
      ...importedDocument("generic-documents:factura:F-2024-0001"),
      legacyImportProvenance: undefined,
    };
    const snapshot = deriveLegacySnapshotForReadOnly(historical, PROFILE);
    const residue: Document = {
      ...historical,
      documentSnapshot: snapshot,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["pdf_snapshot_missing", "snapshot_seal_missing"],
      },
    };

    expect(
      buildLegacyImportRepairPreview(appData([residue])).affectedCount,
    ).toBe(1);
    expect(
      buildLegacyImportRepairPreview(appData([historical])).affectedCount,
    ).toBe(0);
  });

  it("atesta directamente un emitido histórico de Holded sin confundirlo con emisión posterior", () => {
    const issuedAt = "2024-04-01T10:00:00.000Z";
    const imported = attestNewImportedDocument(
      {
        ...importedDocument("holded:factura:F-2024-0001"),
        issuedAt,
        createdAt: issuedAt,
        updatedAt: issuedAt,
        deliveryStatus: "not_sent",
        paymentStatus: "pending",
        acceptanceStatus: "not_applicable",
      },
      PROFILE,
      "holded",
      "2026-07-01T10:00:00.000Z",
      { issuerOrigin: "current_profile_at_import" },
    );

    expect(imported.legacyImportAttestation).toMatchObject({
      schemaVersion: 2,
      importer: "holded",
    });
    expect(inspectLegacyImportAttestation(imported).ok).toBe(true);
  });

  it("preserva una procedencia persistente aunque el ID antiguo no tenga namespace", () => {
    const historical: Document = {
      ...importedDocument("legacy-stable-id"),
      legacyImportProvenance: {
        schemaVersion: 1,
        kind: "external_import",
        importer: "pcfacturacion",
        importedAt: "2024-04-01T10:00:00.000Z",
      },
    };
    const before = appData([historical]);
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview).toMatchObject({
      affectedCount: 1,
      candidates: [
        { documentId: "legacy-stable-id", importer: "pcfacturacion" },
      ],
    });
    const result = applyLegacyImportRepair(
      before,
      preview,
      "2026-07-13T08:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.data.documents[0].legacyImportProvenance?.importedAt).toBe(
      "2024-04-01T10:00:00.000Z",
    );
    expect(result.data.documents[0].legacyImportProvenance).toMatchObject({
      schemaVersion: 2,
      provenanceRecordedAt: "2026-07-13T08:00:00.000Z",
      issuerOrigin: "current_profile_at_import",
    });
    expect(result.data.documents[0].legacyImportAttestation).toMatchObject({
      schemaVersion: 2,
      attestedAt: "2026-07-13T08:00:00.000Z",
      importProvenance: {
        importer: "pcfacturacion",
        importedAt: "2024-04-01T10:00:00.000Z",
      },
    });
    expect(inspectLegacyImportAttestation(result.data.documents[0]).ok).toBe(
      true,
    );
  });

  it("manda a revisión un namespace que contradice su procedencia persistida", () => {
    const conflicting: Document = {
      ...importedDocument("holded:factura:F-2024-0001"),
      legacyImportProvenance: {
        schemaVersion: 1,
        kind: "external_import",
        importer: "pcfacturacion",
        importedAt: "2024-04-01T10:00:00.000Z",
      },
    };

    const preview = buildLegacyImportRepairPreview(appData([conflicting]));

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "namespace_type_mismatch",
    );
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

  it("no borra una señal de bloqueo vacía como si fuera residuo del rollout", () => {
    const malformedSignal: Document = {
      ...importedDocument(),
      snapshotIntegrity: { status: "blocked", issues: [] },
    };

    const preview = buildLegacyImportRepairPreview(appData([malformedSignal]));

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toContain(
      "unexpected_integrity_issue",
    );
  });

  it("nunca reclasifica como legacy un snapshot que conserva contexto VeriFactu", () => {
    const historical = importedDocument();
    const legacySnapshotWithVerifactu = deriveLegacySnapshotForReadOnly(
      historical,
      {
        ...PROFILE,
        verifactu: { enabled: true, environment: "test" },
      },
    );
    const residue: Document = {
      ...historical,
      documentSnapshot: legacySnapshotWithVerifactu,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["pdf_snapshot_missing", "snapshot_seal_missing"],
      },
    };

    const preview = buildLegacyImportRepairPreview(appData([residue]));

    expect(legacySnapshotWithVerifactu.fiscalContext.verifactu).toBeDefined();
    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview[0]?.reasons).toEqual(
      expect.arrayContaining([
        "existing_integrity_evidence",
        "verifactu_evidence",
      ]),
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
    const second = importedDocument("pcfacturacion:factura:row-2");

    const preview = buildLegacyImportRepairPreview(appData([first, second]));

    expect(preview.affectedCount).toBe(0);
    expect(preview.manualReview).toHaveLength(2);
    expect(
      preview.manualReview.every((item) =>
        item.reasons.includes("duplicate_fiscal_identity"),
      ),
    ).toBe(true);
  });

  it("no acepta duplicados con el mismo número aunque falte el NIF del emisor", () => {
    const withoutIssuerNif = (id: string): Document => {
      const historical = importedDocument(id);
      return {
        ...historical,
        issuer: { ...historical.issuer!, nif: "" },
      };
    };
    const first = withoutIssuerNif("pcfacturacion:factura:F-2024-0001");
    const second = withoutIssuerNif("pcfacturacion:factura:row-2");

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

    expect(result.data.documents[0].documentSnapshot?.taxSummary).toMatchObject(
      {
        subtotal: 100,
        iva: 21,
        total: 121,
      },
    );
    expect(result.data.documents[0].items[0].unitPrice).toBe(100);
    expect(result.data.documents[0].documentSnapshot).toEqual(frozen);
    expect(documentAmounts(result.data.documents[0], false).total).toBe(121);
    expect(result.data.documents[0].pdfSnapshot).toBeUndefined();
    expect(result.data.documents[0].snapshotSeal).toBeUndefined();
  });

  it("permite previsualizar un snapshot legacy íntegro con emisor incompleto", () => {
    const historical: Document = {
      ...importedDocument(),
      issuer: { ...importedDocument().issuer!, nif: "" },
    };
    const frozen = deriveLegacySnapshotForReadOnly(historical, PROFILE);
    const residue: Document = {
      ...historical,
      documentSnapshot: frozen,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["pdf_snapshot_missing", "snapshot_seal_missing"],
      },
    };
    const [relationshipChecked] = withDocumentRelationshipIntegritySignals([
      residue,
    ]);

    expect(relationshipChecked.snapshotIntegrity?.issues).not.toContain(
      "document_relationship_invalid",
    );
    const preview = buildLegacyImportRepairPreview(
      appData([relationshipChecked]),
    );
    expect(preview.affectedCount).toBe(1);
    expect(preview.candidates[0].completenessExceptions).toContain(
      "issuer_nif_missing_or_nonstandard",
    );

    const corrupt: Document = {
      ...residue,
      documentSnapshot: { ...frozen, snapshotHash: "sha256:corrupt" },
    };
    expect(
      buildLegacyImportRepairPreview(appData([corrupt])).affectedCount,
    ).toBe(0);

    const liveRectification: Document = {
      ...residue,
      rectification: {
        originalDocumentId: "original-id",
        originalNumber: "F-2024-0000",
        originalDate: "2024-03-01",
        reason: "Relación añadida fuera del snapshot",
        type: "correccion",
      },
    };
    const rectificationPreview = buildLegacyImportRepairPreview(
      appData([liveRectification]),
    );
    expect(rectificationPreview.affectedCount).toBe(0);
    expect(rectificationPreview.manualReview[0]?.reasons).toContain(
      "unsupported_historical_relation",
    );
  });

  it("previsualiza exactamente el resumen congelado para importes negativos con medios céntimos", () => {
    const historical: Document = {
      ...importedDocument(),
      items: [
        {
          ...importedDocument().items[0],
          quantity: 0.5,
          unitPrice: -0.05,
          ivaPercent: 21,
        },
      ],
    };
    const current = deriveLegacySnapshotForReadOnly(historical, PROFILE);
    const legacyContent: DocumentSnapshot = {
      ...current,
      items: [
        {
          ...current.items[0],
          subtotal: -0.02,
          ivaAmount: -0.01,
          total: -0.03,
        },
      ],
      taxSummary: {
        subtotal: -0.02,
        iva: -0.01,
        total: -0.03,
        vatExempt: false,
        byRate: [
          {
            ivaPercent: 21,
            taxableBase: -0.02,
            ivaAmount: -0.01,
            total: -0.03,
          },
        ],
      },
    };
    const hashPayload = { ...legacyContent } as Record<string, unknown>;
    delete hashPayload.capturedAt;
    delete hashPayload.source;
    delete hashPayload.snapshotHash;
    const issuer = { ...legacyContent.issuer } as Record<string, unknown>;
    delete issuer.capturedAt;
    const frozen: DocumentSnapshot = {
      ...legacyContent,
      snapshotHash: `fnv1a32:${legacyFnv1a32(
        stableStringifySnapshot({
          ...hashPayload,
          issuer,
          items: legacyContent.items.map((item) => {
            const line = { ...item } as Record<string, unknown>;
            delete line.id;
            return line;
          }),
        }),
      )}`,
    };
    const residue: Document = {
      ...historical,
      documentSnapshot: frozen,
      snapshotIntegrityRequired: true,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["pdf_snapshot_missing", "snapshot_seal_missing"],
      },
    };
    const before = appData([residue]);
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview.candidates[0]).toMatchObject({
      documentNumber: frozen.number,
      amounts: {
        subtotal: frozen.taxSummary.subtotal,
        iva: frozen.taxSummary.iva,
        total: frozen.taxSummary.total,
      },
    });
    expect(preview.candidates[0]?.amounts).toEqual({
      subtotal: -0.02,
      iva: -0.01,
      total: -0.03,
    });

    const result = applyLegacyImportRepair(
      before,
      preview,
      "2026-07-13T08:30:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(documentAmounts(result.data.documents[0], false)).toMatchObject(
      preview.candidates[0].amounts,
    );
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
      schemaVersion: 2,
      kind: "external_import",
      importer: "pcfacturacion",
      importedAt: "2026-07-12T22:00:00.000Z",
      provenanceRecordedAt: "2026-07-12T22:00:00.000Z",
      issuerOrigin: "current_profile_at_import",
      documentStateAtImport: "draft",
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
    expect(canUnmarkQuoteAsAccepted({ ...tampered, status: "aceptado" })).toBe(
      false,
    );
    expect(canUnmarkQuoteAsRejected({ ...tampered, status: "rechazado" })).toBe(
      false,
    );
  });

  it("convierte las carencias formales históricas en avisos sin perder importes", () => {
    const historical: Document = {
      ...importedDocument(),
      client: { name: "" },
      issuer: {
        name: "",
        nif: "",
        address: "",
        city: "",
        postalCode: "",
        capturedAt: "2024-04-01T10:00:00.000Z",
      },
      items: [
        {
          id: "line-without-description",
          description: "",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
    };
    const before = appData([historical]);
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview.affectedCount).toBe(1);
    expect(preview.manualReview).toEqual([]);
    expect(preview.candidates[0]).toMatchObject({
      amounts: { subtotal: 100, iva: 21, total: 121 },
      completenessExceptions: expect.arrayContaining([
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
      ]),
    });

    const result = applyLegacyImportRepair(
      before,
      preview,
      "2026-07-13T06:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(documentAmounts(result.data.documents[0], false)).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(
      inspectLegacyImportAttestation(result.data.documents[0]),
    ).toMatchObject({ ok: true });
  });

  it.each([
    ["IVA histórico inusual", 100, 101, 201],
    ["importe histórico negativo", -100, 21, -121],
  ])(
    "acepta %s si el usuario confirma las cifras almacenadas",
    (_label, unitPrice, ivaPercent, expectedTotal) => {
      const historical = {
        ...importedDocument(),
        items: [
          {
            id: "historical-line",
            description: "Importe presentado históricamente",
            quantity: 1,
            unitPrice,
            ivaPercent,
          },
        ],
      };
      const before = appData([historical]);
      const preview = buildLegacyImportRepairPreview(before);
      expect(preview.affectedCount).toBe(1);
      const result = applyLegacyImportRepair(before, preview);
      expect(result.status).toBe("applied");
      if (result.status !== "applied") return;
      expect(documentAmounts(result.data.documents[0], false).total).toBe(
        expectedTotal,
      );
    },
  );

  it.each([
    { items: [] },
    {
      items: [
        {
          id: "not-finite",
          description: "No finito",
          quantity: Number.NaN,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
    },
    { number: "" },
    { issuer: { ...importedDocument().issuer!, capturedAt: "no-es-fecha" } },
  ] as Array<Partial<Document>>)(
    "mantiene en revisión contenido que no puede congelar de forma finita %#",
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
    invalidEvidence.legacyImportAttestation!.attestationHash = `sha256:${sha256Hex(stableStringifySnapshot(payload))}`;
    expect(inspectLegacyImportAttestation(invalidEvidence).ok).toBe(false);
  });

  it("falla cerrado ante cualquier señal de integridad runtime no canónica", () => {
    const before = appData([importedDocument()]);
    const result = applyLegacyImportRepair(
      before,
      buildLegacyImportRepairPreview(before),
      "2026-07-12T22:00:00.000Z",
    );
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    const malformedSignal: Document = {
      ...result.data.documents[0],
      snapshotIntegrity: {
        status: "ok" as never,
        issues: ["document_hash_mismatch"],
      },
    };

    expect(inspectLegacyImportAttestation(malformedSignal).ok).toBe(false);
    expect(isDocumentUsableForFinancialCalculations(malformedSignal)).toBe(
      false,
    );
    expect(documentAmounts(malformedSignal, false).total).toBe(0);
  });

  it.each([
    ["estado pagado", { status: "pagado" as const }],
    ["vuelta a borrador", { status: "borrador" as const }],
    ["entrega", { deliveryStatus: "sent" as const }],
    ["pago", { paymentStatus: "paid" as const }],
    ["rectificativa asociada", { rectifiedById: "rectification-id" }],
    ["recibo asociado", { receiptDocumentId: "receipt-id" }],
    [
      "rectificación viva añadida",
      {
        rectification: {
          originalDocumentId: "original-id",
          originalNumber: "F-2024-0000",
          originalDate: "2024-03-01",
          reason: "Manipulación posterior",
          type: "correccion" as const,
        },
      },
    ],
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
