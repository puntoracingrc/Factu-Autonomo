import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  grantPartnerAccess,
  listAdminPartners,
} from "@/lib/partners/repository";
import { checkRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, POST } from "./route";

vi.mock("@/lib/admin/server-access", () => ({
  getAdminAccessFromRequest: vi.fn(),
}));
vi.mock("@/lib/partners/repository", () => ({
  grantPartnerAccess: vi.fn(),
  listAdminPartners: vi.fn(),
  PartnerSchemaUnavailableError: class PartnerSchemaUnavailableError extends Error {},
}));
vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return { ...actual, checkRateLimit: vi.fn() };
});
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: vi.fn() }));

const ALLOWED_RATE_LIMIT: RateLimitResult = {
  allowed: true,
  limit: 120,
  remaining: 119,
  resetAt: Date.parse("2026-07-17T10:00:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function request(method: "GET" | "POST" = "GET", body?: unknown) {
  return new Request("https://facturacion-autonomos.app/api/admin/partners", {
    method,
    headers: {
      Authorization: "Bearer admin-token",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("Admin Partner API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: "22222222-2222-4222-8222-222222222222" },
    } as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
    vi.mocked(listAdminPartners).mockResolvedValue([]);
  });

  it("requires an administrator before touching the database", async () => {
    vi.mocked(getAdminAccessFromRequest).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Solo administradores" }, { status: 403 }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(listAdminPartners).not.toHaveBeenCalled();
  });

  it("lists aggregate Partner summaries", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(body).toEqual({ partners: [] });
    expect(listAdminPartners).toHaveBeenCalledOnce();
  });

  it("rejects an invalid email before granting access", async () => {
    const response = await POST(request("POST", { email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(grantPartnerAccess).not.toHaveBeenCalled();
  });

  it("grants access to an existing account using normalized email", async () => {
    vi.mocked(grantPartnerAccess).mockResolvedValue({} as never);

    const response = await POST(
      request("POST", { email: " GESTORIA@EXAMPLE.COM " }),
    );

    expect(response.status).toBe(201);
    expect(grantPartnerAccess).toHaveBeenCalledWith(expect.anything(), {
      email: "gestoria@example.com",
      actorUserId: "22222222-2222-4222-8222-222222222222",
    });
  });
});
