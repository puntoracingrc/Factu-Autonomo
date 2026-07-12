import { afterEach, describe, expect, it, vi } from "vitest";
import { createFiscalCalendarDateRange } from "./dates";
import { FixtureFiscalCalendarProvider } from "./fixture-provider";
import { ReviewOnlyFiscalCalendarProvider } from "./review-only-provider";
import {
  createFiscalCalendarProvider,
  FiscalCalendarService,
  getFiscalCalendarService,
  resetFiscalCalendarServiceForTests,
} from "./service";
import type {
  FiscalCalendarCategory,
  FiscalCalendarDateRange,
  FiscalCalendarProvider,
  FiscalCalendarProviderResult,
} from "./types";

const RANGE = createFiscalCalendarDateRange("2026-07-01", "2026-07-31");

function result(fetchedAt = "2026-07-12T08:00:00.000Z"): FiscalCalendarProviderResult {
  return {
    events: [],
    fetchedAt,
    providerMode: "fixture",
    truncated: false,
  };
}

function fakeProvider(
  implementation: (
    range: FiscalCalendarDateRange,
    categories: readonly FiscalCalendarCategory[],
  ) => Promise<FiscalCalendarProviderResult>,
): FiscalCalendarProvider & { listEvents: ReturnType<typeof vi.fn> } {
  return {
    listEvents: vi.fn(implementation),
  };
}

describe("FiscalCalendarService", () => {
  afterEach(() => resetFiscalCalendarServiceForTests());

  it("comparte la caché por rango y categorías sin una llamada por usuario", async () => {
    const provider = fakeProvider(async () => result());
    const service = new FiscalCalendarService(provider);

    const first = await service.listEvents(RANGE, ["iva"]);
    const second = await service.listEvents(RANGE, ["iva"]);

    expect(first).toBe(second);
    expect(provider.listEvents).toHaveBeenCalledTimes(1);
  });

  it("coalesce peticiones concurrentes idénticas", async () => {
    let resolveResult: ((value: FiscalCalendarProviderResult) => void) | undefined;
    const provider = fakeProvider(
      () =>
        new Promise((resolve) => {
          resolveResult = resolve;
        }),
    );
    const service = new FiscalCalendarService(provider);

    const first = service.listEvents(RANGE, ["iva"]);
    const second = service.listEvents(RANGE, ["iva"]);
    resolveResult?.(result());

    await expect(first).resolves.toEqual(result());
    await expect(second).resolves.toEqual(result());
    expect(provider.listEvents).toHaveBeenCalledTimes(1);
  });

  it("separa la caché por categoría y rango", async () => {
    const provider = fakeProvider(async () => result());
    const service = new FiscalCalendarService(provider);

    await service.listEvents(RANGE, ["iva"]);
    await service.listEvents(RANGE, ["renta"]);
    await service.listEvents(
      createFiscalCalendarDateRange("2026-08-01", "2026-08-31"),
      ["iva"],
    );
    expect(provider.listEvents).toHaveBeenCalledTimes(3);
  });

  it("renueva la caché tras su TTL", async () => {
    let now = 1_000;
    const provider = fakeProvider(async () => result(String(now)));
    const service = new FiscalCalendarService(provider, {
      cacheTtlMs: 100,
      nowMs: () => now,
    });

    await service.listEvents(RANGE, ["iva"]);
    now = 1_101;
    await service.listEvents(RANGE, ["iva"]);
    expect(provider.listEvents).toHaveBeenCalledTimes(2);
  });

  it("no conserva en caché un fallo recuperable", async () => {
    const provider = fakeProvider(
      vi
        .fn()
        .mockRejectedValueOnce(new Error("transient"))
        .mockResolvedValueOnce(result()),
    );
    const service = new FiscalCalendarService(provider);

    await expect(service.listEvents(RANGE, ["iva"])).rejects.toThrow(
      "transient",
    );
    await expect(service.listEvents(RANGE, ["iva"])).resolves.toEqual(result());
    expect(provider.listEvents).toHaveBeenCalledTimes(2);
  });

  it("selecciona fixtures cuando no hay API key aunque el módulo esté activo", () => {
    const provider = createFiscalCalendarProvider({
      enabled: true,
      localOnly: true,
      reason: "ENABLED_LOCAL",
      providerMode: "fixture",
      apiKey: null,
    });
    expect(provider).toBeInstanceOf(FixtureFiscalCalendarProvider);
  });

  it("selecciona el proveedor público sin red en modo review-only", () => {
    const fetchImpl = vi.fn();
    const provider = createFiscalCalendarProvider(
      {
        enabled: true,
        localOnly: false,
        reason: "ENABLED_PUBLIC_REVIEW",
        providerMode: "review-only",
        apiKey: null,
      },
      { fetchImpl },
    );

    expect(provider).toBeInstanceOf(ReviewOnlyFiscalCalendarProvider);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reutiliza la misma key y regenera el proveedor al rotarla", () => {
    const config = (apiKey: string) => ({
      enabled: true as const,
      localOnly: true as const,
      reason: "ENABLED_LOCAL" as const,
      providerMode: "google-calendar" as const,
      apiKey,
    });

    const first = getFiscalCalendarService(config("test-key-one"));
    const sameKey = getFiscalCalendarService(config("test-key-one"));
    const rotatedKey = getFiscalCalendarService(config("test-key-two"));

    expect(sameKey).toBe(first);
    expect(rotatedKey).not.toBe(first);
  });
});
