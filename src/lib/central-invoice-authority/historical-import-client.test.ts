import { describe, expect, it, vi } from "vitest";

import type { Document } from "@/lib/types";
import {
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT,
  importCentralInvoiceAuthorityHistoricalInvoicesFromBrowser,
} from "./historical-import-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function document(number: string): Document {
  return {
    id: `local-${number}`,
    type: "factura",
    number,
    date: "2026-07-24",
    client: {
      id: "client-1",
      firstName: "",
      lastName: "",
      name: "Cliente de prueba",
      createdAt: "2026-07-24T10:00:00.000Z",
      updatedAt: "2026-07-24T10:00:00.000Z",
    },
    items: [
      {
        id: "line-1",
        description: "Trabajo",
        quantity: 1,
        unitPrice: 100,
        vatRate: 21,
        irpfRate: 15,
        total: 106,
      },
    ],
    status: "emitida",
    documentSnapshot: {
      schemaVersion: 1,
      number,
      type: "factura",
      date: "2026-07-24",
      issuer: {
        name: "Emisor de prueba",
        nif: "B00000000",
        address: "Calle Prueba 1",
        city: "Barcelona",
        postalCode: "08001",
        capturedAt: "2026-07-24T10:00:00.000Z",
      },
      client: {
        name: "Cliente de prueba",
      },
      items: [],
      totals: {
        subtotal: 100,
        vat: 21,
        irpf: 15,
        total: 106,
      },
      fiscalContext: {
        verifactu: {
          environment: "test",
        },
      },
      capturedAt: "2026-07-24T10:00:00.000Z",
    },
    pdfSnapshot: { schemaVersion: 1, contentHash: "sha256:pdf" },
    snapshotSeal: {
      version: 1,
      documentId: `local-${number}`,
      contextHash: "sha256:context",
      documentContentHash: "sha256:document-content",
      pdfContentHash: "sha256:pdf-content",
      documentSnapshotHash: "sha256:document",
      pdfSnapshotHash: "sha256:pdf",
    },
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: ["pdf_snapshot_missing"],
    },
    centralInvoiceAuthority: {
      schemaVersion: 1,
      source: "central_invoice_authority",
      serverDocumentId: "server-document-1",
      identityId: "identity-1",
      outboxEventId: "event-1",
      eventType: "invoice_issued",
      fullNumber: number,
      sequence: 1,
      documentVersion: 1,
      emittedHash: "sha256:central",
      receivedAt: "2026-07-24T10:00:00.000Z",
    },
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
  } as unknown as Document;
}

describe("central invoice authority historical import client", () => {
  it("no contacta la ruta sin sesion o dispositivo local", async () => {
    const fetchImpl = vi.fn();

    const result =
      await importCentralInvoiceAuthorityHistoricalInvoicesFromBrowser(
        [document("F-2026-2959")],
        {
          fetchImpl,
          getAccessToken: async () => null,
          getDeviceToken: () => "device-token",
        },
      );

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sube documentos saneados con bearer y token de dispositivo", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        ok: true,
        schema: "CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE_V1",
        imported: [
          {
            status: "committed",
            fullNumber: "F-2026-2959",
            sequence: 2959,
            documentVersion: 1,
          },
        ],
        counts: {
          committed: 1,
          replayed: 0,
          alreadyPresent: 0,
        },
      }),
    );

    const result =
      await importCentralInvoiceAuthorityHistoricalInvoicesFromBrowser(
        [document("F-2026-2959")],
        {
          fetchImpl,
          getAccessToken: async () => "access-token",
          getDeviceToken: () => "device-token",
        },
      );

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/central-invoice-authority/historical-import",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
      }),
    );
    const calls = fetchImpl.mock.calls as unknown as Array<
      [string, RequestInit]
    >;
    const body = JSON.parse(calls[0]![1].body as string) as {
      documents: Record<string, unknown>[];
    };
    expect(body.documents[0]).toMatchObject({
      number: "F-2026-2959",
      documentSnapshot: expect.objectContaining({ number: "F-2026-2959" }),
    });
    expect(body.documents[0]).not.toHaveProperty("pdfSnapshot");
    expect(body.documents[0]).not.toHaveProperty("snapshotSeal");
    expect(body.documents[0]).not.toHaveProperty("snapshotIntegrity");
    expect(body.documents[0]).not.toHaveProperty("snapshotIntegrityRequired");
    expect(body.documents[0]).not.toHaveProperty("centralInvoiceAuthority");
    expect(result).toMatchObject({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT,
      counts: { committed: 1 },
    });
  });

  it("rechaza respuestas exitosas que incluyan una factura fuera del alcance", async () => {
    const result =
      await importCentralInvoiceAuthorityHistoricalInvoicesFromBrowser(
        [document("F-2026-2959")],
        {
          fetchImpl: vi.fn(async () =>
            jsonResponse(200, {
              ok: true,
              schema: "CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE_V1",
              imported: [
                {
                  status: "committed",
                  fullNumber: "F-2026-2958",
                  sequence: 2958,
                  documentVersion: 1,
                },
              ],
              counts: {
                committed: 1,
                replayed: 0,
                alreadyPresent: 0,
              },
            }),
          ),
          getAccessToken: async () => "access-token",
          getDeviceToken: () => "device-token",
        },
      );

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: "CENTRAL_HISTORICAL_IMPORT_INVALID_RESPONSE",
    });
  });
});
