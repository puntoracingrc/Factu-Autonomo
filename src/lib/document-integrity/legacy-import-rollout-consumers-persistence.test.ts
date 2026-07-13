import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackupPayload, parseBackupJson } from "@/lib/backup";
import { selectCanonicalFiscalDocumentsForExport } from "@/lib/billing/fiscal-export-documents";
import { diffAppData, emptyCloudBootstrapData } from "@/lib/cloud/diff";
import { rebuildCloudSnapshot } from "@/lib/cloud/incremental";
import { collectedIncome } from "@/lib/income";
import { loadData, normalizeLoadedData, saveData } from "@/lib/storage";
import { calculateTaxSummary } from "@/lib/taxes";
import type { AppData, BusinessProfile, Document } from "@/lib/types";
import { DEFAULT_PROFILE, EMPTY_DATA } from "@/lib/types";
import { documentAmounts } from "@/lib/vat-regime";
import {
  attachRegisteredVerifactuToSnapshots,
  buildDocumentPdfSnapshot,
  buildDocumentSnapshotSeal,
  hashDocumentSnapshot,
  issueDocument,
} from "./index";
import {
  applyLegacyImportRepair,
  buildLegacyImportRepairPreview,
  inspectLegacyImportAttestation,
  isDocumentUsableForFinancialCalculations,
} from "./legacy-import-attestation";

const IMPORT_AT = "2024-04-01T10:00:00.000Z";
const REPAIR_AT = "2026-07-13T17:00:00.000Z";
const BACKUP_AT = "2026-07-13T17:05:00.000Z";
const IMPORTED_ID = "pcfacturacion:factura:F-SYNTH-2024-0001";
const PROTECTED_ID = "synthetic:protected-verifactu";

const PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Negocio Sintético",
  nif: "12345678Z",
  address: "Calle Sintética 1",
  city: "Madrid",
  postalCode: "28001",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

function importedInvoice(): Document {
  return {
    id: IMPORTED_ID,
    type: "factura",
    number: "F-SYNTH-2024-0001",
    date: "2024-04-01",
    client: {
      name: "Cliente Sintético",
      nif: "B12345678",
      address: "Calle Cliente 2",
      city: "Madrid",
      postalCode: "28002",
    },
    items: [
      {
        id: "line-synthetic",
        description: "Servicio histórico sintético",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    issuer: {
      name: PROFILE.name,
      nif: PROFILE.nif,
      address: PROFILE.address,
      city: PROFILE.city,
      postalCode: PROFILE.postalCode,
      capturedAt: IMPORT_AT,
    },
    documentLifecycle: "issued",
    integrityLock: "locked",
    createdAt: IMPORT_AT,
    updatedAt: IMPORT_AT,
  };
}

function protectedVerifactuInvoice(): Document {
  const issued = issueDocument(
    {
      ...importedInvoice(),
      id: PROTECTED_ID,
      number: "F-SYNTH-2025-0001",
      date: "2025-01-15",
      status: "borrador",
      issuer: undefined,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: "2025-01-15T10:00:00.000Z",
    },
    PROFILE,
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
  const imported = importedInvoice();
  const normalized = normalizeLoadedData(
    {
      ...EMPTY_DATA,
      profile: PROFILE,
      documents: [imported],
      snapshotIntegrityVersion: 1,
    },
    { legacyBackfillDocumentIds: new Set([IMPORTED_ID]) },
  );
  const rolloutDocument = normalized.documents[0];
  const rolloutSnapshot = {
    ...rolloutDocument.documentSnapshot!,
    fiscalContext: {
      ...rolloutDocument.documentSnapshot!.fiscalContext,
      verifactu: {
        enabled: true,
        environment: "test" as const,
        optInVersion: 1 as const,
      },
    },
    snapshotHash: "",
  };
  rolloutSnapshot.snapshotHash = hashDocumentSnapshot(rolloutSnapshot);
  const rolloutPdf = buildDocumentPdfSnapshot(
    rolloutSnapshot,
    PROFILE,
    rolloutSnapshot.capturedAt,
  );
  return {
    ...normalized,
    documents: [
      {
        ...rolloutDocument,
        documentSnapshot: rolloutSnapshot,
        pdfSnapshot: rolloutPdf,
        snapshotSeal: buildDocumentSnapshotSeal(
          rolloutDocument.id,
          rolloutSnapshot,
          rolloutPdf,
        ),
        snapshotIntegrityRequired: true,
      },
      protectedVerifactuInvoice(),
    ],
  };
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

describe("verified importer rollout bundle consumers and persistence", () => {
  it("incluye exactamente el contenido atestado sin alterar VeriFactu moderno", () => {
    const before = baselineWorkspace();
    const protectedBefore = structuredClone(
      before.documents.find((document) => document.id === PROTECTED_ID),
    );
    const preview = buildLegacyImportRepairPreview(before);

    expect(preview).toMatchObject({
      affectedCount: 1,
      candidates: [
        {
          documentId: IMPORTED_ID,
          evidenceBasis: "verified_importer_rollout_bundle",
          amounts: { subtotal: 100, iva: 21, total: 121 },
        },
      ],
    });
    expect(documentAmounts(before.documents[0], false).total).toBe(0);

    const transition = applyLegacyImportRepair(before, preview, REPAIR_AT);
    expect(transition.status).toBe("applied");
    if (transition.status !== "applied") return;
    const repaired = transition.data.documents.find(
      (document) => document.id === IMPORTED_ID,
    )!;

    expect(inspectLegacyImportAttestation(repaired).ok).toBe(true);
    expect(isDocumentUsableForFinancialCalculations(repaired)).toBe(true);
    expect(documentAmounts(repaired, false)).toMatchObject({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
    expect(collectedIncome(transition.data.documents)).toBe(121);
    expect(
      calculateTaxSummary(transition.data.documents, [], {
        profile: PROFILE,
        isDocumentDateInPeriod: (date) => date.startsWith("2024-04"),
      }),
    ).toMatchObject({
      salesBase: 100,
      salesIva: 21,
      integrityBlockedDocuments: 0,
    });
    const fiscal = selectCanonicalFiscalDocumentsForExport(
      transition.data.documents,
      PROFILE,
      (date) => date.startsWith("2024-04"),
    );
    expect(fiscal.documents.map((document) => document.id)).toEqual([
      IMPORTED_ID,
    ]);
    expect(fiscal.blockedDocuments).toEqual([]);
    expect(
      transition.data.documents.find(
        (document) => document.id === PROTECTED_ID,
      ),
    ).toEqual(protectedBefore);
  });

  it("conserva atestación por save/load, backup y cloud, y la copia revierte el bundle exacto", () => {
    const before = baselineWorkspace();
    const beforeImported = structuredClone(before.documents[0]);
    const beforeBackup = createBackupPayload(before, BACKUP_AT);
    const preview = buildLegacyImportRepairPreview(before);
    const transition = applyLegacyImportRepair(before, preview, REPAIR_AT);
    expect(transition.status).toBe("applied");
    if (transition.status !== "applied") return;
    const repaired = transition.data.documents[0];
    const expectedAttestation = structuredClone(
      repaired.legacyImportAttestation,
    );

    expect(saveData(transition.data)).toEqual({ status: "applied" });
    const reloaded = loadData();
    expect(reloaded.documents[0].legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(reloaded.documents[0].pdfSnapshot).toBeUndefined();
    expect(reloaded.documents[0].snapshotSeal).toBeUndefined();

    const repairedBackup = parseBackupJson(
      JSON.parse(
        JSON.stringify(createBackupPayload(transition.data, BACKUP_AT)),
      ),
    );
    expect(repairedBackup).not.toHaveProperty("error");
    if ("error" in repairedBackup) return;
    expect(repairedBackup.documents[0].legacyImportAttestation).toEqual(
      expectedAttestation,
    );

    const changes = diffAppData(emptyCloudBootstrapData(), transition.data);
    const rebuiltCloud = rebuildCloudSnapshot(changes).data;
    expect(rebuiltCloud.documents[0].legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(rebuiltCloud.documents[0].pdfSnapshot).toBeUndefined();
    expect(rebuiltCloud.documents[0].snapshotSeal).toBeUndefined();

    const restoredBefore = parseBackupJson(
      JSON.parse(JSON.stringify(beforeBackup)),
    );
    expect(restoredBefore).not.toHaveProperty("error");
    if ("error" in restoredBefore) return;
    expect(restoredBefore.documents[0]).toEqual(beforeImported);
    expect(buildLegacyImportRepairPreview(restoredBefore).affectedCount).toBe(
      1,
    );
  });
});
