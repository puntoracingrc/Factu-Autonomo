import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  probeAeatFiscalCalendarAdminHealth,
  type FiscalCalendarAdminHealth,
} from "@/lib/fiscal-calendar/admin-health";
import {
  checkRateLimit,
  type RateLimitResult,
} from "@/lib/server/rate-limit";
import { GET } from "./route";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));

vi.mock("@/lib/fiscal-calendar/admin-health", () => ({
  probeAeatFiscalCalendarAdminHealth: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return { ...actual, checkRateLimit: vi.fn() };
});

const CATEGORIES = [
  "renta",
  "renta_sociedades",
  "sociedades",
  "iva",
  "declaraciones_informativas",
] as const;

const HEALTH: FiscalCalendarAdminHealth = {
  generatedAt: "2026-07-13T10:00:00.000Z",
  level: "ok",
  label: "Operativo",
  headline: "Los cinco calendarios públicos responden y contienen eventos.",
  expectedFeeds: 5,
  checkedFeeds: 5,
  healthyFeeds: 5,
  watchFeeds: 0,
  actionFeeds: 0,
  totalEvents: 50,
  feeds: CATEGORIES.map((category) => ({
    category,
    label: category,
    level: "ok",
    code: "OK",
    checkedAt: "2026-07-13T10:00:00.000Z",
    fetchedAt: "2026-07-13T10:00:00.000Z",
    eventCount: 10,
    upcomingEventCount: 3,
    truncated: false,
    earliestEventDate: "2026-01-01",
    latestEventDate: "2026-12-31",
    latestSourceUpdatedAt: "2026-07-12T08:00:00.000Z",
    httpStatus: null,
    attempts: 1,
  })),
  recommendations: ["No se requiere ninguna intervención."],
};

const ALLOWED_RATE_LIMIT: RateLimitResult = {
  allowed: true,
  limit: 30,
  remaining: 29,
  resetAt: Date.parse("2026-07-13T10:10:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request() {
  return new Request("http://localhost/api/admin/fiscal-calendar-health", {
    headers: { Authorization: "Bearer token" },
  });
}

function expectPrivateHeaders(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toBe(
    "noindex, nofollow, noarchive",
  );
}

describe("GET /api/admin/fiscal-calendar-health", () => {
  beforeEach(() => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
    vi.mocked(probeAeatFiscalCalendarAdminHealth).mockResolvedValue(HEALTH);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("rechaza antes del rate limit y del probe si no hay acceso admin", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(probeAeatFiscalCalendarAdminHealth).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("no ejecuta el probe cuando se supera el rate limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ...ALLOWED_RATE_LIMIT,
      allowed: false,
      remaining: 0,
    });

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "admin_fiscal_calendar_health",
        limit: 30,
        windowMs: 10 * 60_000,
      },
      "admin-1",
    );
    expect(probeAeatFiscalCalendarAdminHealth).not.toHaveBeenCalled();
    expectPrivateHeaders(response);
  });

  it("devuelve la salud saneada tras autenticar y aplicar el límite", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ health: HEALTH });
    expect(probeAeatFiscalCalendarAdminHealth).toHaveBeenCalledOnce();
    expect(
      vi.mocked(getAdminAccessFromRequest).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(checkRateLimit).mock.invocationCallOrder[0]);
    expect(vi.mocked(checkRateLimit).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(probeAeatFiscalCalendarAdminHealth).mock.invocationCallOrder[0],
    );
    expectPrivateHeaders(response);
  });

  it("convierte un fallo inesperado del probe en un 503 genérico", async () => {
    vi.mocked(probeAeatFiscalCalendarAdminHealth).mockRejectedValueOnce(
      new Error(
        "secret-token https://calendar.google.com/calendar/ical/private/basic.ics",
      ),
    );

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "No se pudo comprobar el calendario fiscal.",
    });
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("calendar.google.com");
    expect(serialized).not.toContain("basic.ics");
    expectPrivateHeaders(response);
  });
});
