import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiscalCalendarProviderError } from "@/lib/fiscal-calendar/errors";
import { getFiscalCalendarService } from "@/lib/fiscal-calendar/service";
import {
  checkRateLimit,
  resetRateLimitBucketsForTests,
} from "@/lib/server/rate-limit";
import { GET } from "./route";

vi.mock("@/lib/fiscal-calendar/service", () => ({
  getFiscalCalendarService: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/rate-limit")
  >("@/lib/server/rate-limit");
  return { ...actual, checkRateLimit: vi.fn() };
});

const listEvents = vi.fn();

function request(query = "from=2026-07-01&to=2026-12-31&categories=iva") {
  return new Request(
    `http://localhost:3000/api/fiscal-calendar/events?${query}`,
  );
}

function providerResult(
  providerMode: "aeat-icalendar" | "fixture" | "review-only" = "fixture",
) {
  return {
    events: [],
    fetchedAt: "2026-07-12T08:00:00.000Z",
    providerMode,
    truncated: false,
  };
}

function eventWithModels(title: string, description: string) {
  return {
    id: "aeat_test-model-links",
    source: "AEAT" as const,
    sourceProvider: "google-calendar" as const,
    sourceCalendarKey: "iva" as const,
    sourceCalendarId: "fixture@example.invalid",
    externalEventId: "fixture-model-links",
    iCalUID: null,
    title,
    description,
    category: "iva" as const,
    deadlineKind: "unclassified" as const,
    reviewStatus: "source-published" as const,
    startDate: "2026-07-20",
    endDateExclusive: "2026-07-21",
    allDay: true,
    status: "confirmed" as const,
    sourceUpdatedAt: null,
    fetchedAt: "2026-07-12T08:00:00.000Z",
  };
}

describe("GET /api/fiscal-calendar/events", () => {
  beforeEach(() => {
    vi.stubEnv("FISCAL_CALENDAR_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "true");
    vi.mocked(getFiscalCalendarService).mockReturnValue({
      listEvents,
    } as never);
    vi.mocked(checkRateLimit)
      .mockReset()
      .mockResolvedValue({
        allowed: true,
        limit: 120,
        remaining: 119,
        resetAt: Date.now() + 300_000,
        retryAfterSeconds: 300,
        backend: "memory",
      });
    listEvents.mockReset().mockResolvedValue(providerResult());
    resetRateLimitBucketsForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("responde 404 sin tocar proveedor cuando la feature flag está apagada", async () => {
    vi.stubEnv("FISCAL_CALENDAR_ENABLED", "false");
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getFiscalCalendarService).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("no hereda la flag del analizador de gastos", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "false");
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(checkRateLimit).toHaveBeenCalledOnce();
    expect(getFiscalCalendarService).toHaveBeenCalledOnce();
    expect(listEvents).toHaveBeenCalledOnce();
  });

  it("consulta el iCalendar público en producción e ignora cualquier key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FISCAL_CALENDAR_ENABLED", "false");
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "secret-that-must-not-be-used");
    listEvents.mockResolvedValue(providerResult("aeat-icalendar"));
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getFiscalCalendarService).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "ENABLED_PUBLIC_ICALENDAR",
        providerMode: "aeat-icalendar",
        apiKey: null,
      }),
    );
    expect(body.data.providerMode).toBe("aeat-icalendar");
    expect(JSON.stringify(body)).not.toContain("secret-that-must-not-be-used");
  });

  it("devuelve datos, fuente y metadatos sin exponer la API key", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_API_KEY", "secret-server-key");
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(body.data).toMatchObject({
      providerMode: "fixture",
      timeZone: "Europe/Madrid",
      generalInformationOnly: true,
      officialSource: {
        authority: "AEAT",
        verificationStatus: "VERIFIED",
      },
    });
    expect(body.data.categories).toHaveLength(5);
    expect(JSON.stringify(body)).not.toContain("secret-server-key");
  });

  it("publica solo enlaces canónicos al catálogo para modelos desplegados", async () => {
    listEvents.mockResolvedValue({
      ...providerResult(),
      events: [
        eventWithModels(
          "Modelos 303, 037 y 999",
          "Declaración recapitulativa: 349",
        ),
      ],
    });
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.modelPageLinks).toEqual([
      {
        code: "303",
        href: "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-303",
        historical: false,
      },
      {
        code: "037",
        href: "/consultor-fiscal/modelos?origen=calendario&foco=037#modelo-037",
        historical: true,
      },
      {
        code: "349",
        href: "/consultor-fiscal/modelos?origen=calendario&foco=349#modelo-349",
        historical: false,
      },
    ]);
    expect(JSON.stringify(body.data.modelPageLinks)).not.toContain(
      "/consultor-fiscal/modelos/",
    );
    expect(JSON.stringify(body.data.modelPageLinks)).not.toContain("999");
  });

  it("pasa únicamente categorías allowlistadas y el rango Madrid al servicio", async () => {
    const response = await GET(
      request("from=2026-07-15&to=2026-07-15&categories=renta,iva"),
    );
    expect(response.status).toBe(200);
    expect(listEvents).toHaveBeenCalledWith(
      {
        startDate: "2026-07-15",
        endDateExclusive: "2026-07-16",
        timeMin: "2026-07-14T22:00:00.000Z",
        timeMax: "2026-07-15T22:00:00.000Z",
      },
      ["renta", "iva"],
    );
  });

  it.each([
    ["from=2026-07-01", "Indica las fechas"],
    ["from=2026-02-30&to=2026-03-01", "no es válida"],
    ["from=2026-08-01&to=2026-07-01", "igual o posterior"],
    [
      "from=2026-07-01&to=2026-12-31&categories=iva,maliciosa",
      "no está permitida",
    ],
    [
      "from=2026-07-01&to=2026-12-31&calendarId=attacker@example.com",
      "No se admiten identificadores",
    ],
  ])(
    "rechaza entradas no válidas sin consultar Google",
    async (query, message) => {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: expect.stringContaining(message),
      });
      expect(listEvents).not.toHaveBeenCalled();
    },
  );

  it("convierte fallos del proveedor en un error recuperable y opaco", async () => {
    listEvents.mockRejectedValue(
      new FiscalCalendarProviderError({
        code: "FORBIDDEN",
        status: 403,
        retryable: false,
        attempts: 1,
      }),
    );
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: expect.stringContaining("Agencia Tributaria"),
      retryable: false,
    });
    expect(JSON.stringify(body)).not.toContain("403");
  });

  it("marca como reintentable un timeout sin mostrar detalles internos", async () => {
    listEvents.mockRejectedValue(
      new FiscalCalendarProviderError({
        code: "TIMEOUT",
        retryable: true,
        attempts: 3,
      }),
    );
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(await response.json()).toMatchObject({ retryable: true });
  });
});
