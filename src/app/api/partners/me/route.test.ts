import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPartnerDashboard,
  updatePartnerPayoutProfile,
} from "@/lib/partners/repository";
import { getPartnerAccessFromRequest } from "@/lib/partners/server-access";
import { checkRateLimit, type RateLimitResult } from "@/lib/server/rate-limit";
import { GET, PATCH } from "./route";

vi.mock("@/lib/partners/repository", () => ({
  buildPartnerDashboard: vi.fn(),
  updatePartnerPayoutProfile: vi.fn(),
  PartnerSchemaUnavailableError: class PartnerSchemaUnavailableError extends Error {},
}));
vi.mock("@/lib/partners/server-access", () => ({
  getPartnerAccessFromRequest: vi.fn(),
}));
vi.mock("@/lib/server/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/rate-limit")>(
    "@/lib/server/rate-limit",
  );
  return { ...actual, checkRateLimit: vi.fn() };
});

const ALLOWED_RATE_LIMIT: RateLimitResult = {
  allowed: true,
  limit: 120,
  remaining: 119,
  resetAt: Date.parse("2026-07-17T10:00:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

const account = {
  user_id: "11111111-1111-4111-8111-111111111111",
  email: "partner@example.com",
  status: "active",
  commission_bps: 1000,
  payout_threshold_cents: 6000,
  payout_holder_name: null,
  payout_iban: null,
  payout_details_updated_at: null,
  created_at: "2026-07-17T00:00:00.000Z",
  updated_at: "2026-07-17T00:00:00.000Z",
} as const;

function request(method: "GET" | "PATCH" = "GET", body?: unknown) {
  return new Request("https://facturacion-autonomos.app/api/partners/me", {
    method,
    headers: {
      Authorization: "Bearer partner-token",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("Partner dashboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPartnerAccessFromRequest).mockResolvedValue({
      ok: true,
      user: { id: account.user_id },
      admin: { from: vi.fn() },
      role: "partner",
      account,
    } as never);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
  });

  it("stops before metrics when the session is not authorized", async () => {
    vi.mocked(getPartnerAccessFromRequest).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "No autorizado" }, { status: 403 }),
    } as never);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(buildPartnerDashboard).not.toHaveBeenCalled();
  });

  it("returns only the server-built aggregate dashboard", async () => {
    vi.mocked(buildPartnerDashboard).mockResolvedValue({
      role: "partner",
      account: null,
      referral: {
        code: null,
        shareUrl: null,
        registeredCount: 3,
        payingCount: 1,
        inactiveCount: 2,
        planCounts: [],
        paidModules: [],
      },
      commissions: {
        pendingCents: 0,
        availableCents: 0,
        paidCents: 0,
        reversedCents: 0,
        thresholdCents: 6000,
        eligibleForPayout: false,
        automaticAccrualEnabled: false,
      },
      recentCommissions: [],
      recentPayouts: [],
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive",
    );
    expect(body.dashboard.referral).toMatchObject({
      registeredCount: 3,
      payingCount: 1,
    });
    expect(buildPartnerDashboard).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        role: "partner",
        account,
        origin: "https://facturacion-autonomos.app",
      }),
    );
  });

  it("rejects invalid bank data without writing", async () => {
    const response = await PATCH(
      request("PATCH", { holderName: "Gestoría", iban: "ES00" }),
    );

    expect(response.status).toBe(400);
    expect(updatePartnerPayoutProfile).not.toHaveBeenCalled();
  });

  it("normalizes valid bank data and returns only the safe account", async () => {
    vi.mocked(updatePartnerPayoutProfile).mockResolvedValue({
      userId: account.user_id,
      email: account.email,
      status: "active",
      commissionBps: 1000,
      payoutThresholdCents: 6000,
      payoutProfile: {
        holderName: "Gestoría Ejemplo",
        ibanMasked: "**** 1332",
        configured: true,
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    });

    const response = await PATCH(
      request("PATCH", {
        holderName: " Gestoría Ejemplo ",
        iban: "ES91 2100 0418 4502 0005 1332",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updatePartnerPayoutProfile).toHaveBeenCalledWith(expect.anything(), {
      userId: account.user_id,
      holderName: "Gestoría Ejemplo",
      iban: "ES9121000418450200051332",
    });
    expect(JSON.stringify(body)).not.toContain("ES9121000418450200051332");
    expect(body.account.payoutProfile.ibanMasked).toContain("1332");
  });
});
