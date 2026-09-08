import { describe, expect, it } from "vitest";

import { normalizeLoadedData } from "@/lib/storage";
import { EMPTY_DATA, type Document } from "@/lib/types";

import {
  buildHistoricalWorkspaceArchive,
  hasLocallyCompleteHistoricalWorkspaceArchive,
  mergeHistoricalWorkspaceArchive,
  verifyHistoricalWorkspaceArchive,
} from "./archive";

const ARCHIVE_ID = "11111111-1111-4111-8111-111111111111";

function invoice(index: number, overrides: Partial<Document> = {}): Document {
  const sequence = String(index).padStart(4, "0");
  return {
    id: `historical-${sequence}`,
    type: "factura",
    number: `F-2025-${sequence}`,
    date: "2025-05-01",
    client: { name: `Cliente ${index}` },
    items: [
      {
        id: `line-${sequence}`,
        description: "Servicio",
        quantity: 1,
        unitPrice: index,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: "2025-05-01T10:00:00.000Z",
    updatedAt: "2025-05-01T10:00:00.000Z",
    ...overrides,
  };
}

function normalized(documents: Document[]) {
  return normalizeLoadedData({
    ...EMPTY_DATA,
    snapshotIntegrityVersion: 1,
    documents,
  });
}

describe("historical workspace archive", () => {
  it("reconstructs 944 historical invoices beside 18 central invoices", () => {
    const historical = normalized(
      Array.from({ length: 944 }, (_, index) => invoice(index + 1)),
    );
    const manifest = buildHistoricalWorkspaceArchive(
      historical.documents,
      ARCHIVE_ID,
    );
    const central = normalized(
      Array.from({ length: 18 }, (_, index) =>
        invoice(3_000 + index, {
          id: `central-${index + 1}`,
          number: `F-2026-${String(2_959 + index).padStart(4, "0")}`,
          centralInvoiceAuthority: {
            schemaVersion: 1,
            source: "central_invoice_authority",
            serverDocumentId: `server-${index + 1}`,
            identityId: `identity-${index + 1}`,
            outboxEventId: `event-${index + 1}`,
            eventType: "invoice_issued",
            fullNumber: `F-2026-${String(2_959 + index).padStart(4, "0")}`,
            sequence: 2_959 + index,
            documentVersion: 1,
            emittedHash: `sha256:${"a".repeat(64)}`,
            receivedAt: "2026-09-08T10:00:00.000Z",
          },
        }),
      ),
    );

    const merged = mergeHistoricalWorkspaceArchive(central, manifest);

    expect(merged.data.documents).toHaveLength(962);
    expect(merged.value).toMatchObject({
      documentCount: 944,
      added: 944,
      unchanged: 0,
      centralKept: 0,
    });
    expect(merged.data.meta?.pendingChanges).toBeUndefined();
  });

  it("keeps the central copy when the same fiscal number has another id", () => {
    const historical = normalized([invoice(1)]);
    historical.documents[0]!.number = "F-2026-2959";
    const manifest = buildHistoricalWorkspaceArchive(
      historical.documents,
      ARCHIVE_ID,
    );
    const centralDocument = invoice(2, {
      id: "central-id",
      number: "F-2026-2959",
      centralInvoiceAuthority: {
        schemaVersion: 1,
        source: "central_invoice_authority",
        serverDocumentId: "server-id",
        identityId: "identity-id",
        outboxEventId: "event-id",
        eventType: "invoice_issued",
        fullNumber: "F-2026-2959",
        sequence: 2959,
        documentVersion: 1,
        emittedHash: `sha256:${"b".repeat(64)}`,
        receivedAt: "2026-09-08T10:00:00.000Z",
      },
    });

    const merged = mergeHistoricalWorkspaceArchive(
      normalized([centralDocument]),
      manifest,
    );

    expect(merged.data.documents).toHaveLength(1);
    expect(merged.data.documents[0]!.id).toBe("central-id");
    expect(merged.value.centralKept).toBe(1);
  });

  it("keeps a changed local document and still completes the recovery", () => {
    const source = normalized([invoice(1)]);
    const manifest = buildHistoricalWorkspaceArchive(
      source.documents,
      ARCHIVE_ID,
    );
    const changed = normalized([
      { ...source.documents[0]!, notes: "Cambio posterior" },
    ]);

    const merged = mergeHistoricalWorkspaceArchive(changed, manifest);

    expect(merged.data.documents).toHaveLength(1);
    expect(merged.data.documents[0]!.notes).toBe("Cambio posterior");
    expect(merged.data.historicalWorkspaceArchiveReceipt).toMatchObject({
      archiveId: ARCHIVE_ID,
      documentCount: 1,
    });
    expect(merged.value).toMatchObject({
      added: 0,
      unchanged: 0,
      centralKept: 0,
      localKept: 1,
    });
  });

  it("does not duplicate a local invoice with the same fiscal number", () => {
    const source = normalized([invoice(1)]);
    const manifest = buildHistoricalWorkspaceArchive(
      source.documents,
      ARCHIVE_ID,
    );
    const local = normalized([
      invoice(99, {
        id: "local-other-id",
        number: source.documents[0]!.number,
        notes: "Version local conservada",
      }),
    ]);

    const merged = mergeHistoricalWorkspaceArchive(local, manifest);

    expect(merged.data.documents).toHaveLength(1);
    expect(merged.data.documents[0]!.id).toBe("local-other-id");
    expect(merged.value.localKept).toBe(1);
  });

  it("rejects a payload whose document hash was altered", () => {
    const source = normalized([invoice(1)]);
    const manifest = buildHistoricalWorkspaceArchive(
      source.documents,
      ARCHIVE_ID,
    );
    const tampered = {
      ...manifest,
      documents: manifest.documents.map((entry) => ({
        ...entry,
        payload: { ...entry.payload, notes: "Manipulado" },
      })),
    };

    expect(() => verifyHistoricalWorkspaceArchive(tampered)).toThrowError(
      expect.objectContaining({ code: "DOCUMENT_HASH_MISMATCH" }),
    );
  });

  it("orders identifiers by UTF-8 bytes like the database C collation", () => {
    const ascii = invoice(1, { id: "z-invoice" });
    const accented = invoice(2, { id: "á-invoice" });

    const manifest = buildHistoricalWorkspaceArchive(
      [accented, ascii],
      ARCHIVE_ID,
    );

    expect(manifest.documents.map((entry) => entry.localDocumentId)).toEqual([
      "z-invoice",
      "á-invoice",
    ]);
  });

  it("persists only a valid archive receipt", () => {
    const valid = normalizeLoadedData({
      ...EMPTY_DATA,
      historicalWorkspaceArchiveReceipt: {
        schema: "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_RECEIPT_V1",
        archiveId: ARCHIVE_ID,
        manifestHash: `sha256:${"a".repeat(64)}`,
        documentCount: 944,
        appliedAt: "2026-09-08T12:00:00.000Z",
      },
    });
    expect(valid.historicalWorkspaceArchiveReceipt).toMatchObject({
      archiveId: ARCHIVE_ID,
      documentCount: 944,
    });

    const malformed = normalizeLoadedData({
      ...EMPTY_DATA,
      historicalWorkspaceArchiveReceipt: {
        schema: "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_RECEIPT_V1",
        archiveId: ARCHIVE_ID,
        manifestHash: "sha256:bad",
        documentCount: 944,
        appliedAt: "2026-09-08T12:00:00.000Z",
      },
    } as unknown);
    expect(malformed.historicalWorkspaceArchiveReceipt).toBeUndefined();
    expect(malformed.workspaceIntegrityQuarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: "historicalWorkspaceArchiveReceipt",
          reason: "malformed_record",
        }),
      ]),
    );
  });

  it("does not count budgets or other records as restored historical invoices", () => {
    const data = normalized([
      invoice(1),
      ...Array.from({ length: 10 }, (_, index) =>
        invoice(index + 10, {
          id: `budget-${index + 1}`,
          number: `P-2026-${index + 1}`,
          type: "presupuesto",
        }),
      ),
    ]);
    data.historicalWorkspaceArchiveReceipt = {
      schema: "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_RECEIPT_V1",
      archiveId: ARCHIVE_ID,
      manifestHash: `sha256:${"c".repeat(64)}`,
      documentCount: 2,
      appliedAt: "2026-09-08T12:00:00.000Z",
    };

    expect(hasLocallyCompleteHistoricalWorkspaceArchive(data)).toBe(false);

    data.documents.push(invoice(2));
    expect(hasLocallyCompleteHistoricalWorkspaceArchive(data)).toBe(true);
  });
});
