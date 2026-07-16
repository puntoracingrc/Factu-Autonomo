import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { persistTaxProductEvent } from "@/lib/tax-diagnostic-insights/server-store";

vi.mock("@/lib/billing/server-auth", () => ({ getUserFromBearer: vi.fn() }));
vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(),
}));
vi.mock("@/lib/tax-diagnostic-insights/server-store", () => ({
  persistTaxProductEvent: vi.fn(),
}));

import { POST } from "./route";

const validEvent = {
  id: "11111111-1111-4111-8111-111111111111",
  occurredAt: "2026-07-16T12:00:00.000Z",
  sessionId: "22222222-2222-4222-8222-222222222222",
  eventType: "tax_models_catalog_opened",
  page: "MODELS",
  properties: {},
};

function request(body: unknown) {
  return new Request("https://example.test/api/tax-diagnostic/events", {
    method: "POST",
    headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tax-diagnostic/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserFromBearer).mockResolvedValue({ id: "real-user-id" } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never);
    vi.mocked(persistTaxProductEvent).mockResolvedValue(true);
  });

  it("requires an authenticated user", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);
    expect((await POST(request(validEvent))).status).toBe(401);
  });

  it("persists only a normalized closed event", async () => {
    const response = await POST(request({ ...validEvent, contractVersion: "1.0.0" }));
    expect(response.status).toBe(200);
    expect(persistTaxProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({ contractVersion: "1.0.0", eventType: "tax_models_catalog_opened" }),
      "real-user-id",
    );
  });

  it("rejects personal or raw fields before storage", async () => {
    const response = await POST(request({ ...validEvent, properties: { rawText: "NIF 12345678Z" } }));
    expect(response.status).toBe(400);
    expect(persistTaxProductEvent).not.toHaveBeenCalled();
  });

  it("keeps telemetry storage failure non-blocking and sanitized", async () => {
    vi.mocked(persistTaxProductEvent).mockRejectedValue(new Error("database detail"));
    const response = await POST(request(validEvent));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: false });
  });
});
