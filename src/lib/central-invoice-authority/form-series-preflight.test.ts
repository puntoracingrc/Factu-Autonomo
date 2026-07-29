import { describe, expect, it, vi } from "vitest";

import {
  EMPTY_DATA,
  type AppData,
  type Document,
} from "@/lib/types";

import type { CentralInvoiceAuthorityAccountSeriesSummary } from "./account-series-inventory";
import type { CentralInvoiceAuthorityFormIssueRequest } from "./form-canary-client";
import {
  CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT,
  preflightCentralInvoiceAuthorityFormSeries,
} from "./form-series-preflight";

function document(id: string, number: string): Document {
  return {
    id,
    type: "factura",
    number,
    date: "2026-07-28",
    client: { name: "Cliente sintetico" },
    items: [],
    status: "enviado",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
  };
}

function historicalImportedDocument(
  id: string,
  number: string,
): Document {
  return {
    ...document(id, number),
    legacyImportProvenance: {
      schemaVersion: 2,
      kind: "external_import",
      importer: "generic_documents",
      importedAt: "2026-07-28T09:00:00.000Z",
      provenanceRecordedAt: "2026-07-28T10:00:00.000Z",
      issuerOrigin: "source_document",
      documentStateAtImport: "issued",
    },
  };
}

function appData(documents: Document[] = []): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...EMPTY_DATA.profile,
      nif: "00000000T",
      numbering: {
        year: 2026,
        lastSequence: {
          factura: 2955,
          factura_rectificativa: 1,
          presupuesto: 0,
          recibo: 0,
        },
        formats: {
          factura: {
            template: "QA-F-{year}-{num}",
            padding: 4,
          },
          factura_rectificativa: {
            template: "FR-{year}-{num}",
            padding: 4,
          },
          presupuesto: { template: "P-{year}-{num}", padding: 4 },
          recibo: { template: "R-{year}-{num}", padding: 4 },
        },
      },
      verifactu: { enabled: false, environment: "test" },
    },
    documents,
  };
}

function request(
  overrides: Partial<CentralInvoiceAuthorityFormIssueRequest> = {},
): CentralInvoiceAuthorityFormIssueRequest {
  return {
    kind: "invoice",
    idempotencyKey: "FORM_CANARY:11111111-1111-4111-8111-111111111111",
    draft: {
      localDocumentId: "11111111-1111-4111-8111-111111111111",
      expectedVersion: 0,
      draftHash: `sha256:${"a".repeat(64)}`,
    },
    series: {
      environment: "test",
      issuerNif: "00000000T",
      seriesCode: "QA-F-2026",
      fiscalYear: 2026,
    },
    issuedAt: "2026-07-28T10:00:00.000Z",
    documentPayload: {},
    emittedSnapshot: {},
    emittedHash: `sha256:${"b".repeat(64)}`,
    ...overrides,
  };
}

describe("central authority form series preflight", () => {
  it("concilia solo la serie exacta antes de emitir", async () => {
    const reconcile = vi.fn(
      async (summaries: CentralInvoiceAuthorityAccountSeriesSummary[]) => ({
        ok: true as const,
        schema:
          "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1" as const,
        results: [
          {
            status: "committed" as const,
            reconciliationId: "reconciliation-1",
            previousSequence: 0,
            resultingSequence: summaries[0].observedMaxSequence,
            seriesCode: summaries[0].seriesCode,
            fiscalYear: summaries[0].fiscalYear,
          },
        ],
      }),
    );

    const result = await preflightCentralInvoiceAuthorityFormSeries(
      {
        data: appData(),
        profile: appData().profile,
        request: request(),
      },
      { reconcile },
    );

    expect(result).toMatchObject({
      ok: true,
      schema: CENTRAL_INVOICE_AUTHORITY_FORM_SERIES_PREFLIGHT,
      summary: {
        seriesCode: "QA-F-2026",
        observedMaxSequence: 2955,
      },
      reconciliation: { resultingSequence: 2955 },
    });
    expect(reconcile).toHaveBeenCalledWith([
      expect.objectContaining({
        seriesCode: "QA-F-2026",
        observedMaxSequence: 2955,
      }),
    ]);
  });

  it("no deja que un duplicado de otra serie bloquee una serie nueva limpia", async () => {
    const data = appData([
      document("legacy-1", "F-2026-0002"),
      document("legacy-2", "F-2026-0002"),
    ]);
    const reconcile = vi.fn(
      async (summaries: CentralInvoiceAuthorityAccountSeriesSummary[]) => ({
        ok: true as const,
        schema:
          "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1" as const,
        results: [
          {
            status: "committed" as const,
            reconciliationId: "reconciliation-2",
            previousSequence: 0,
            resultingSequence: summaries[0].observedMaxSequence,
            seriesCode: summaries[0].seriesCode,
            fiscalYear: summaries[0].fiscalYear,
          },
        ],
      }),
    );

    const result = await preflightCentralInvoiceAuthorityFormSeries(
      { data, profile: data.profile, request: request() },
      { reconcile },
    );

    expect(result.ok).toBe(true);
    expect(reconcile).toHaveBeenCalledOnce();
  });

  it("reserva el maximo importado sin bloquear por duplicados historicos", async () => {
    const data = appData([
      historicalImportedDocument(
        "generic-documents:factura:legacy-1",
        "QA-F-2026-3001",
      ),
      historicalImportedDocument(
        "generic-documents:factura:legacy-2",
        "QA-F-2026-3001",
      ),
    ]);
    const reconcile = vi.fn(
      async (summaries: CentralInvoiceAuthorityAccountSeriesSummary[]) => ({
        ok: true as const,
        schema:
          "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1" as const,
        results: [
          {
            status: "committed" as const,
            reconciliationId: "reconciliation-historical",
            previousSequence: 2957,
            resultingSequence: summaries[0].observedMaxSequence,
            seriesCode: summaries[0].seriesCode,
            fiscalYear: summaries[0].fiscalYear,
          },
        ],
      }),
    );

    const result = await preflightCentralInvoiceAuthorityFormSeries(
      { data, profile: data.profile, request: request() },
      { reconcile },
    );

    expect(result).toMatchObject({
      ok: true,
      summary: {
        observedMaxSequence: 3001,
        sourceDocumentCount: 2,
        historicalImportDocumentCount: 2,
      },
    });
    expect(reconcile).toHaveBeenCalledOnce();
  });

  it("bloquea un duplicado dentro de la serie solicitada", async () => {
    const data = appData([
      document("duplicate-1", "QA-F-2026-2955"),
      document("duplicate-2", "QA-F-2026-2955"),
    ]);
    const reconcile = vi.fn();

    const result = await preflightCentralInvoiceAuthorityFormSeries(
      { data, profile: data.profile, request: request() },
      { reconcile },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "CENTRAL_AUTHORITY_FORM_SERIES_DUPLICATE",
    });
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("falla cerrado si el servidor confirma un contador inferior", async () => {
    const data = appData();
    const result = await preflightCentralInvoiceAuthorityFormSeries(
      { data, profile: data.profile, request: request() },
      {
        reconcile: async () => ({
          ok: true,
          schema:
            "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1",
          results: [
            {
              status: "committed",
              reconciliationId: "reconciliation-3",
              previousSequence: 0,
              resultingSequence: 1,
              seriesCode: "QA-F-2026",
              fiscalYear: 2026,
            },
          ],
        }),
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      code: "CENTRAL_AUTHORITY_FORM_SERIES_PREFLIGHT_INVALID",
    });
  });
});
