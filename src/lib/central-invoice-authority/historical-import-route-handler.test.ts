import { describe, expect, it, vi } from "vitest";

import {
  createCentralInvoiceAuthorityHistoricalImportRouteHandler,
  type CentralInvoiceAuthorityHistoricalImportRouteDependencies,
} from "./historical-import-route-handler";
import {
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID,
} from "./historical-import-scope";

const sessionId = "00000000-0000-4000-8000-000000000010";

function document(number: string, overrides: Record<string, unknown> = {}) {
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
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
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
    ...overrides,
  };
}

function body(
  numbers: readonly string[] = CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
) {
  return JSON.stringify({
    documents: numbers.map((number) => document(number)),
  });
}

function deps(
  overrides: Partial<CentralInvoiceAuthorityHistoricalImportRouteDependencies> = {},
): CentralInvoiceAuthorityHistoricalImportRouteDependencies {
  return {
    authenticate: vi.fn(async () => ({
      userId: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID,
      sessionId,
    })),
    rateLimit: vi.fn(async () => ({ allowed: true as const })),
    verifyDevice: vi.fn(async () => ({
      allowed: true as const,
      deviceId: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
    })),
    getRpcClient: vi.fn(() => ({
      rpc: vi.fn(async (_name, args) => ({
        error: null,
        data: {
          result_status: "committed",
          document_id: `document-${args.p_sequence}`,
          identity_id: `identity-${args.p_sequence}`,
          outbox_event_id: `event-${args.p_sequence}`,
          full_number: args.p_expected_full_number,
          sequence: args.p_sequence,
          document_version: 1,
        },
      })),
    })),
    ...overrides,
  };
}

async function request(
  dependencies: CentralInvoiceAuthorityHistoricalImportRouteDependencies,
  input: {
    method?: string;
    rawBody?: string;
    authorization?: string | null;
    deviceToken?: string | null;
  } = {},
) {
  const handler = createCentralInvoiceAuthorityHistoricalImportRouteHandler(
    dependencies,
  );
  const headers = new Headers();
  if (input.authorization !== null) {
    headers.set("authorization", input.authorization ?? "Bearer token");
  }
  if (input.deviceToken !== null) {
    headers.set("x-factu-device-token", input.deviceToken ?? "device-token");
  }
  headers.set("user-agent", "vitest");

  return handler.handle({
    method: input.method ?? "POST",
    headers,
    readBody: async () => input.rawBody ?? body(),
  });
}

describe("central invoice authority historical import route handler", () => {
  it("rechaza otros usuarios antes de leer o importar documentos", async () => {
    const dependencies = deps({
      authenticate: vi.fn(async () => ({
        userId: "00000000-0000-4000-8000-000000000099",
        sessionId,
      })),
    });
    const response = await request(dependencies);

    expect(response.status).toBe(403);
    expect(dependencies.rateLimit).not.toHaveBeenCalled();
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("rechaza cualquier numero fuera de las siete facturas autorizadas", async () => {
    const dependencies = deps();
    const response = await request(dependencies, {
      rawBody: body([
        "F-2026-2958",
        "F-2026-2960",
        "F-2026-2961",
        "F-2026-2962",
        "F-2026-2963",
        "F-2026-2964",
        "F-2026-2965",
      ]),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      error: { code: "DOCUMENT_NUMBER_NOT_ALLOWED" },
    });
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("rechaza documentos sin snapshot fiscal local", async () => {
    const dependencies = deps();
    const documents = CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS.map(
      (number, index) =>
        document(number, index === 0 ? { documentSnapshot: undefined } : {}),
    );
    const response = await request(dependencies, {
      rawBody: JSON.stringify({ documents }),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      error: { code: "MISSING_DOCUMENT_SNAPSHOT" },
    });
    expect(dependencies.getRpcClient).not.toHaveBeenCalled();
  });

  it("importa exactamente las siete facturas pendientes en orden de alcance", async () => {
    const rpc = vi.fn(async (_name, args) => ({
      error: null,
      data: {
        result_status: "committed",
        document_id: `document-${args.p_sequence}`,
        identity_id: `identity-${args.p_sequence}`,
        outbox_event_id: `event-${args.p_sequence}`,
        full_number: args.p_expected_full_number,
        sequence: args.p_sequence,
        document_version: 1,
      },
    }));
    const dependencies = deps({ getRpcClient: vi.fn(() => ({ rpc })) });
    const response = await request(dependencies);
    const responseBody = response.body as {
      ok: boolean;
      imported: Array<{ fullNumber: string; sequence: number }>;
      counts: { committed: number; replayed: number; alreadyPresent: number };
    };

    expect(response.status).toBe(200);
    expect(response.headers["Cache-Control"]).toContain("no-store");
    expect(responseBody).toMatchObject({
      ok: true,
      counts: { committed: 7, replayed: 0, alreadyPresent: 0 },
    });
    expect(responseBody.imported.map((item) => item.fullNumber)).toEqual(
      CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
    );
    expect(rpc).toHaveBeenCalledTimes(7);
    expect(rpc.mock.calls.map((call) => call[1].p_expected_full_number)).toEqual(
      CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
    );
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_user_id: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID,
      p_device_id: "sha256:SYNTHETIC_ONLY_DEVICE_HASH",
      p_expected_full_number: "F-2026-2959",
      p_sequence: 2959,
      p_series_code: "F-2026",
      p_fiscal_year: 2026,
      p_environment: "test",
      p_issuer_nif: "B00000000",
    });
    expect(rpc.mock.calls[0][1].p_document_payload).toMatchObject({
      historicalImport: true,
      document: {
        number: "F-2026-2959",
      },
    });
    expect(
      rpc.mock.calls[0][1].p_document_payload.document.documentSnapshot,
    ).toBeUndefined();
    expect(rpc.mock.calls[0][1].p_emitted_snapshot).toMatchObject({
      number: "F-2026-2959",
      issuer: { nif: "B00000000" },
    });
    expect(JSON.stringify(response.body)).not.toContain("documentSnapshot");
  });
});
