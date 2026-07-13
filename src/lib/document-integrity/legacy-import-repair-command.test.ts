import { describe, expect, it, vi } from "vitest";
import type { AppData, BusinessProfile, Document } from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import { buildLegacyImportRepairPreview } from "./legacy-import-attestation";
import { runLegacyImportRepairCommand } from "./legacy-import-repair-command";

const PROFILE: BusinessProfile = {
  ...EMPTY_DATA.profile,
  name: "Negocio histórico",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Madrid",
  postalCode: "28001",
};

function importedDocument(
  id = "pcfacturacion:factura:F-2024-0001",
  number = "F-2024-0001",
): Document {
  const capturedAt = "2024-04-01T10:00:00.000Z";
  return {
    id,
    type: "factura",
    number,
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
        id: `${id}:line-1`,
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

function relatedData(): AppData {
  const rectificationId = "pcfacturacion:factura:FR-2024-0001";
  const original: Document = {
    ...importedDocument(),
    status: "rectificada",
    rectifiedById: rectificationId,
  };
  const rectification: Document = {
    ...importedDocument(rectificationId, "FR-2024-0001"),
    date: "2024-04-02",
    client: { ...original.client, name: "Cliente histórico corregido" },
    rectification: {
      originalDocumentId: original.id,
      originalNumber: original.number,
      originalDate: original.date,
      reason: "Corrección de datos del cliente",
      type: "correccion",
    },
  };
  return {
    ...EMPTY_DATA,
    profile: PROFILE,
    documents: [original, rectification],
    snapshotIntegrityVersion: 1,
  };
}

function data(): AppData {
  return {
    ...EMPTY_DATA,
    profile: PROFILE,
    documents: [importedDocument()],
    snapshotIntegrityVersion: 1,
  };
}

describe("runLegacyImportRepairCommand", () => {
  it("entrega un único candidato durable sin publicar memoria por su cuenta", () => {
    const expected = data();
    const preview = buildLegacyImportRepairPreview(expected);
    const commit = vi.fn((baseline, build) => {
      const transition = build(baseline);
      expect(transition.data).not.toBe(expected);
      expect(expected.documents[0].legacyImportAttestation).toBeUndefined();
      return {
        status: "applied" as const,
        data: transition.data,
        value: transition.value,
        replayed: false,
      };
    });

    const result = runLegacyImportRepairCommand({
      expected,
      preview,
      now: "2026-07-12T22:00:00.000Z",
      commit,
    });

    expect(result.status).toBe("applied");
    expect(commit).toHaveBeenCalledTimes(1);
    if (result.status !== "applied") return;
    expect(result.value.appliedDocumentIds).toEqual([
      "pcfacturacion:factura:F-2024-0001",
    ]);
    expect(result.value.appliedRelationshipGroupFingerprints).toEqual([]);
    expect(result.data.documents[0].legacyImportAttestation).toBeDefined();
  });

  it("persiste una relación V3 completa en un único commit durable", () => {
    const expected = relatedData();
    const preview = buildLegacyImportRepairPreview(expected);
    expect(preview.relationshipGroups).toHaveLength(1);
    const commit = vi.fn((baseline, build) => {
      const transition = build(baseline);
      expect(expected.documents).toHaveLength(2);
      expect(
        expected.documents.every(
          (document) => document.legacyImportAttestation === undefined,
        ),
      ).toBe(true);
      return {
        status: "applied" as const,
        data: transition.data,
        value: transition.value,
        replayed: false,
      };
    });

    const result = runLegacyImportRepairCommand({
      expected,
      preview,
      now: "2026-07-13T10:00:00.000Z",
      commit,
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.value.appliedDocumentIds).toEqual(
      expected.documents.map((document) => document.id),
    );
    expect(result.value.appliedRelationshipGroupFingerprints).toEqual([
      preview.relationshipGroups[0].groupFingerprint,
    ]);
    expect(
      result.data.documents.every(
        (document) => document.legacyImportAttestation?.schemaVersion === 3,
      ),
    ).toBe(true);
  });

  it.each([
    { status: "blocked", reason: "quota_exceeded" },
    { status: "indeterminate", reason: "storage_state_unknown" },
  ] as const)(
    "propaga $status sin ruta de persistencia alternativa",
    (outcome) => {
      const expected = data();
      const commit = vi.fn(() => outcome);
      const result = runLegacyImportRepairCommand({
        expected,
        preview: buildLegacyImportRepairPreview(expected),
        now: "2026-07-12T22:00:00.000Z",
        commit,
      });

      expect(result).toEqual(outcome);
      expect(expected.documents[0].legacyImportAttestation).toBeUndefined();
      expect(commit).toHaveBeenCalledTimes(1);
    },
  );

  it("no intenta persistir una vista previa obsoleta", () => {
    const expected = data();
    const preview = buildLegacyImportRepairPreview(expected);
    expected.documents[0] = { ...expected.documents[0], notes: "Cambio" };
    const commit = vi.fn();

    expect(
      runLegacyImportRepairCommand({
        expected,
        preview,
        now: "2026-07-12T22:00:00.000Z",
        commit,
      }),
    ).toEqual({ status: "blocked", reason: "stale_preview" });
    expect(commit).not.toHaveBeenCalled();
  });
});
