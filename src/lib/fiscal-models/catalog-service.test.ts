import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFiscalModelCatalogService } from "./catalog-service";
import { FISCAL_MODEL_FOUNDATION_FIXTURES_V1 } from "./fixtures/foundation-catalog.v1";

const FIXED_NOW = "2026-07-12T11:30:00+02:00";

function service(featureEnabled = true) {
  return createFiscalModelCatalogService({
    featureEnabled,
    clock: () => FIXED_NOW,
  });
}

describe("fiscal model catalog service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps every initial read under manual review or blocked", () => {
    const catalog = service();

    const list = catalog.list({ taxYear: 2026 });
    const coverage = catalog.coverage({ taxYear: 2026 });

    expect(list.status).toBe("MANUAL_REVIEW");
    for (const model of FISCAL_MODEL_FOUNDATION_FIXTURES_V1) {
      const result = catalog.get({ code: model.code, taxYear: 2026 });
      expect(result.status).toBe(
        model.lifecycleStatus === "HISTORICAL" ? "BLOCKED" : "MANUAL_REVIEW",
      );
    }
    expect(coverage.status).toBe("MANUAL_REVIEW");
    if (coverage.status === "MANUAL_REVIEW") {
      expect(coverage.data?.status).toBe("NO_COVERAGE");
      expect(coverage.data).toMatchObject({
        targetUnits: 2,
        validatedUnits: 0,
      });
      expect(coverage.reasons).toContain("DRAFT_RELEASE");
    }
    if (list.status === "MANUAL_REVIEW") {
      expect(list.reasons).toContain("DRAFT_RELEASE");
    }
  });

  it("blocks every operation while the private feature is disabled", () => {
    const catalog = service(false);
    expect(catalog.list({ taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "FEATURE_DISABLED",
    });
    expect(catalog.get({ code: "036", taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "FEATURE_DISABLED",
    });
    expect(catalog.coverage({ taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "FEATURE_DISABLED",
    });
  });

  it("rejects unknown keys, coercion, unsupported years, and unknown models", () => {
    const catalog = service();
    expect(catalog.list({ taxYear: "2026" })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(catalog.list({ taxYear: 2026, query: "036" })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(catalog.list({ taxYear: 2026, includeHistorical: "true" })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(catalog.get({ code: 36, taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(catalog.get({ code: " 036 ", taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "INVALID_INPUT",
    });
    expect(catalog.get({ code: "999", taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_NOT_FOUND",
    });
    expect(catalog.get({ code: "036", taxYear: 2025 })).toEqual({
      status: "BLOCKED",
      reason: "UNSUPPORTED_TAX_YEAR",
    });
  });

  it("rejects inherited, accessor, symbol, and non-plain inputs", () => {
    const catalog = service();
    const inherited = Object.create({ taxYear: 2026 });
    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, "taxYear", {
      enumerable: true,
      get: () => {
        throw new Error("input accessors must not run");
      },
    });
    const symbolKey = { taxYear: 2026, [Symbol("unexpected")]: true };

    for (const input of [inherited, accessor, symbolKey, new Date()]) {
      expect(catalog.list(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
  });

  it("keeps 037 historical and blocks it as a current 2026 model", () => {
    const catalog = service();
    const defaultList = catalog.list({ taxYear: 2026 });
    const historicalList = catalog.list({
      taxYear: 2026,
      includeHistorical: true,
    });

    if (defaultList.status === "MANUAL_REVIEW") {
      expect(defaultList.data?.map((model) => model.code)).toEqual([
        "036",
        "303",
      ]);
    }
    if (historicalList.status === "MANUAL_REVIEW") {
      const historical = historicalList.data?.find(
        (model) => model.code === "037",
      );
      expect(historical).toMatchObject({
        lifecycleStatus: "HISTORICAL",
        availability: "HISTORICAL_ONLY",
      });
      expect(historical).not.toHaveProperty("replacementModel");
    }
    expect(catalog.get({ code: "037", taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_NOT_CURRENT",
    });
  });

  it("is idempotent and protects later reads from consumer mutation", () => {
    const catalog = service();
    const first = catalog.list({ taxYear: 2026 });
    const second = catalog.list({ taxYear: 2026 });

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.status === "MANUAL_REVIEW" && first.data) {
      expect(() => {
        (
          first.data?.[0] as unknown as { canonicalName: string }
        ).canonicalName = "Manipulado";
      }).toThrow(TypeError);
    }

    const third = catalog.list({ taxYear: 2026 });
    if (third.status === "MANUAL_REVIEW") {
      expect(third.data?.[0].canonicalName).not.toBe("Manipulado");
    }
  });

  it("uses the injected clock and never Date.now", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Date.now must not be used");
    });
    const result = service().coverage({ taxYear: 2026 });
    expect(result.status).toBe("MANUAL_REVIEW");
    if (result.status === "MANUAL_REVIEW") {
      expect(result.data?.calculatedAt).toBe(FIXED_NOW);
    }
  });

  it("fails closed when the injected clock cannot provide evidence time", () => {
    const catalog = createFiscalModelCatalogService({
      featureEnabled: true,
      clock: () => {
        throw new Error("clock unavailable");
      },
    });

    expect(catalog.coverage({ taxYear: 2026 })).toEqual({
      status: "BLOCKED",
      reason: "INCONSISTENT_VERSION",
    });
  });

  it("keeps the pure core free of network, storage, IA, and cross-module imports", () => {
    for (const file of ["catalog.ts", "coverage.ts", "catalog-service.ts"]) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toContain("Date.now");
      expect(source).not.toMatch(/@\/lib\/(?:storage|tax-engine|taxes|billing)/);
      expect(source).not.toMatch(/@\/context\/AppStore/);
      expect(source).not.toMatch(/fiscal-notifications|fiscal-calendar|supabase/i);
      expect(source).not.toMatch(/openai|\bAI\b/i);
    }
  });
});
