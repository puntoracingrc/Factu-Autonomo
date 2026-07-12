import { describe, expect, it, vi } from "vitest";
import { createFiscalCalendarDateRange } from "./dates";
import { FiscalCalendarProviderError } from "./errors";
import { GooglePublicCalendarProvider } from "./google-public-calendar-provider";

const RANGE = createFiscalCalendarDateRange("2026-07-01", "2026-12-31");
const NOW = new Date("2026-07-12T08:00:00.000Z");

function googleEvent(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    status: "confirmed",
    summary: `Evento ${id}`,
    start: { date: "2026-07-20" },
    end: { date: "2026-07-21" },
    updated: "2026-07-01T10:00:00+02:00",
    ...overrides,
  };
}

function provider(
  fetchImpl: ReturnType<typeof vi.fn>,
  overrides: {
    maxAttempts?: number;
    timeoutMs?: number;
    sleep?: (delayMs: number) => Promise<void>;
  } = {},
) {
  return new GooglePublicCalendarProvider({
    apiKey: "server-only-test-key",
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => NOW,
    random: () => 0,
    sleep: overrides.sleep ?? (async () => undefined),
    ...overrides,
  });
}

function errorResponse(status: number, reason?: string): Response {
  return Response.json(
    reason ? { error: { errors: [{ reason }] } } : { error: "failed" },
    { status },
  );
}

describe("GooglePublicCalendarProvider", () => {
  it("usa events.list con parámetros obligatorios y la clave solo en header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({ items: [googleEvent("event-1")] }),
    );
    const result = await provider(fetchImpl).listEvents(RANGE, ["iva"]);

    expect(result).toMatchObject({
      providerMode: "google-calendar",
      fetchedAt: NOW.toISOString(),
      truncated: false,
    });
    expect(result.events).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [input, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    const url = new URL(String(input));
    expect(decodeURIComponent(url.pathname)).toContain(
      "517mcuhcis0lldnp9b7c0nk2q8@group.calendar.google.com/events",
    );
    expect(url.searchParams.get("timeMin")).toBe(RANGE.timeMin);
    expect(url.searchParams.get("timeMax")).toBe(RANGE.timeMax);
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("orderBy")).toBe("startTime");
    expect(url.searchParams.get("showDeleted")).toBe("false");
    expect(url.searchParams.get("timeZone")).toBe("Europe/Madrid");
    expect(url.searchParams.get("fields")).toContain("nextPageToken");
    expect(url.searchParams.has("key")).toBe(false);
    expect(String(input)).not.toContain("server-only-test-key");
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe(
      "server-only-test-key",
    );
    expect(init.cache).toBe("no-store");
  });

  it("continúa la paginación aunque una página no contenga eventos", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ items: [], nextPageToken: "page-2" }),
      )
      .mockResolvedValueOnce(
        Response.json({ items: [googleEvent("event-page-2")] }),
      );
    const result = await provider(fetchImpl).listEvents(RANGE, ["iva"]);

    expect(result.events.map((event) => event.externalEventId)).toEqual([
      "event-page-2",
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      new URL(String(fetchImpl.mock.calls[1]?.[0])).searchParams.get(
        "pageToken",
      ),
    ).toBe("page-2");
  });

  it("devuelve una lista vacía sin convertirla en error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    await expect(
      provider(fetchImpl).listEvents(RANGE, ["iva"]),
    ).resolves.toMatchObject({ events: [] });
  });

  it("excluye eventos cancelados aunque el proveedor los devolviera", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        items: [googleEvent("cancelled", { status: "cancelled" })],
      }),
    );
    const result = await provider(fetchImpl).listEvents(RANGE, ["iva"]);
    expect(result.events).toEqual([]);
  });

  it("no reintenta un 403 permanente", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(errorResponse(403, "forbidden"));

    await expect(
      provider(fetchImpl).listEvents(RANGE, ["iva"]),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
      retryable: false,
      attempts: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reintenta un 403 solo cuando Google lo clasifica como cuota", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(403, "rateLimitExceeded"))
      .mockResolvedValueOnce(Response.json({ items: [googleEvent("ok")] }));

    const result = await provider(fetchImpl).listEvents(RANGE, ["iva"]);
    expect(result.events).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([429, 500, 503])(
    "aplica reintentos limitados para el error transitorio %s",
    async (status) => {
      const delays: number[] = [];
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(errorResponse(status))
        .mockResolvedValueOnce(errorResponse(status))
        .mockResolvedValueOnce(
          Response.json({ items: [googleEvent(`after-${status}`)] }),
        );
      const result = await provider(fetchImpl, {
        sleep: async (delay) => {
          delays.push(delay);
        },
      }).listEvents(RANGE, ["iva"]);

      expect(result.events).toHaveLength(1);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(delays).toEqual([100, 200]);
    },
  );

  it("abandona un Retry-After que excede el presupuesto local", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json(
        { error: { errors: [{ reason: "rateLimitExceeded" }] } },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    );
    await expect(
      provider(fetchImpl).listEvents(RANGE, ["iva"]),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", attempts: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("corta peticiones que superan el timeout", async () => {
    const fetchImpl = vi.fn(
      async (_input: URL, init: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    );

    await expect(
      provider(fetchImpl, { timeoutMs: 1, maxAttempts: 1 }).listEvents(
        RANGE,
        ["iva"],
      ),
    ).rejects.toMatchObject({ code: "TIMEOUT", attempts: 1 });
  });

  it("rechaza respuestas sobredimensionadas o estructuralmente inválidas", async () => {
    const tooLarge = vi.fn().mockResolvedValue(
      new Response("{}", {
        headers: { "Content-Length": String(1024 * 1024 + 1) },
      }),
    );
    await expect(
      provider(tooLarge).listEvents(RANGE, ["iva"]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    const invalid = vi
      .fn()
      .mockResolvedValue(Response.json({ items: "not-an-array" }));
    await expect(
      provider(invalid).listEvents(RANGE, ["iva"]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    const invalidItem = vi
      .fn()
      .mockResolvedValue(Response.json({ items: [null] }));
    await expect(
      provider(invalidItem).listEvents(RANGE, ["iva"]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("corta por bytes reales un stream multibyte sin Content-Length", async () => {
    const encoder = new TextEncoder();
    const chunk = encoder.encode("é".repeat(300_000));
    let chunksSent = 0;
    let readerCancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          if (chunksSent < 2) {
            controller.enqueue(chunk);
            chunksSent += 1;
          }
        },
        cancel() {
          readerCancelled = true;
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
    expect(response.headers.get("content-length")).toBeNull();
    const fetchImpl = vi.fn(
      async (input: URL, init?: RequestInit) => {
        void input;
        void init;
        return response;
      },
    );

    await expect(
      provider(fetchImpl).listEvents(RANGE, ["iva"]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(readerCancelled).toBe(true);
    const requestInit = fetchImpl.mock.calls[0]?.[1];
    expect(requestInit).toBeDefined();
    expect(requestInit?.signal?.aborted).toBe(true);
  });

  it("falla de forma segura si se intenta construir sin API key", () => {
    expect(
      () => new GooglePublicCalendarProvider({ apiKey: "   " }),
    ).toThrow(FiscalCalendarProviderError);
    try {
      new GooglePublicCalendarProvider({ apiKey: "" });
    } catch (error) {
      expect(error).toMatchObject({
        code: "NOT_CONFIGURED",
        retryable: false,
        attempts: 0,
      });
    }
  });
});
