import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PROFILE, EMPTY_DATA, type AppData } from "@/lib/types";

import {
  CENTRAL_BUSINESS_NONFISCAL_SERIES_PREFLIGHT,
  preflightCentralBusinessNonfiscalSeries,
} from "./nonfiscal-document-series-preflight";
import {
  CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT,
  type CentralBusinessNumberedDocumentBrowserResult,
} from "./numbered-document-client";

function data(template = "P-{year}-{num}"): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...DEFAULT_PROFILE,
      numbering: {
        ...DEFAULT_PROFILE.numbering,
        year: 2026,
        lastSequence: {
          ...DEFAULT_PROFILE.numbering.lastSequence,
          presupuesto: 12,
        },
        formats: {
          ...DEFAULT_PROFILE.numbering.formats,
          presupuesto: { template, padding: 4 },
        },
      },
    },
  };
}

function reconciliation(input: {
  scopeYear?: number;
  resultingSequence?: number;
} = {}): CentralBusinessNumberedDocumentBrowserResult {
  return {
    ok: true,
    result: {
      schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT,
      action: "reconcile_series",
      status: "committed",
      reconciliationId: "reconciliation-synthetic",
      scopeYear: input.scopeYear ?? 2026,
      previousSequence: 0,
      resultingSequence: input.resultingSequence ?? 12,
    },
  };
}

describe("central business non-fiscal series preflight", () => {
  it("concilia una serie con una clave idempotente estable y sin payload documental", async () => {
    const mutate = vi.fn(async () => reconciliation());

    const result = await preflightCentralBusinessNonfiscalSeries(
      { data: data(), entityType: "quote", fiscalYear: 2026 },
      { mutate },
    );

    expect(result).toMatchObject({
      ok: true,
      schema: CENTRAL_BUSINESS_NONFISCAL_SERIES_PREFLIGHT,
      summary: {
        entityType: "quote",
        observedMaxSequence: 12,
        scopeYear: 2026,
      },
      reconciliation: {
        action: "reconcile_series",
        resultingSequence: 12,
      },
    });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      action: "reconcile_series",
      idempotencyKey: expect.stringMatching(
        /^CENTRAL_BUSINESS_SERIES:[a-f0-9]{48}$/,
      ),
      entityType: "quote",
      numberTemplate: "P-{year}-{num}",
      fiscalYear: 2026,
      observedMaxSequence: 12,
      sourceDocumentCount: 0,
      sourceDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    });
  });

  it("usa el alcance global del servidor cuando la plantilla no lleva ano", async () => {
    const mutate = vi.fn(async () => reconciliation({ scopeYear: 0 }));

    const result = await preflightCentralBusinessNonfiscalSeries(
      { data: data("P-{num}"), entityType: "quote", fiscalYear: 2026 },
      { mutate },
    );

    expect(result).toMatchObject({
      ok: true,
      summary: { scopeYear: 0 },
      reconciliation: { scopeYear: 0 },
    });
  });

  it("falla cerrado si el servidor confirma otro alcance o un contador inferior", async () => {
    await expect(
      preflightCentralBusinessNonfiscalSeries(
        { data: data(), entityType: "quote", fiscalYear: 2026 },
        { mutate: vi.fn(async () => reconciliation({ scopeYear: 0 })) },
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: "CENTRAL_BUSINESS_SERIES_PREFLIGHT_INVALID",
      retryable: true,
    });

    await expect(
      preflightCentralBusinessNonfiscalSeries(
        { data: data(), entityType: "quote", fiscalYear: 2026 },
        {
          mutate: vi.fn(async () =>
            reconciliation({ resultingSequence: 11 }),
          ),
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 502,
      code: "CENTRAL_BUSINESS_SERIES_PREFLIGHT_INVALID",
    });
  });

  it("propaga conflictos y rechaza ejercicios invalidos antes de llamar a red", async () => {
    const conflict: CentralBusinessNumberedDocumentBrowserResult = {
      ok: false,
      status: 409,
      code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
      message: "Conflicto sintetico",
      retryable: false,
      conflict: true,
    };
    await expect(
      preflightCentralBusinessNonfiscalSeries(
        { data: data(), entityType: "quote", fiscalYear: 2026 },
        { mutate: vi.fn(async () => conflict) },
      ),
    ).resolves.toEqual(conflict);

    const mutate = vi.fn(async () => reconciliation());
    await expect(
      preflightCentralBusinessNonfiscalSeries(
        { data: data(), entityType: "quote", fiscalYear: 1999 },
        { mutate },
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 400,
      code: "CENTRAL_BUSINESS_SERIES_YEAR_INVALID",
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});
