import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resetRateLimitBucketsForTests } from "@/lib/server/rate-limit";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

function request(body: unknown, init?: RequestInit) {
  return new Request("http://localhost/api/monitoring/error", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}

describe("POST /api/monitoring/error", () => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));

  beforeEach(() => {
    resetRateLimitBucketsForTests();
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
    insert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.resetAllMocks();
    resetRateLimitBucketsForTests();
  });

  it("requiere sesion", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(request({ message: "boom", area: "app" }));

    expect(response.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("rechaza JSON invalido y cuerpos grandes", async () => {
    const invalid = await POST(request("{"));
    const tooLarge = await POST(
      request({ area: "app", message: "x".repeat(17_000) }),
    );

    expect(invalid.status).toBe(400);
    expect(tooLarge.status).toBe(413);
    expect(insert).not.toHaveBeenCalled();
  });

  it("normaliza el evento antes de insertarlo", async () => {
    const response = await POST(
      request({
        area: "ui",
        code: "render",
        message: "token secreto",
        metadata: { authorization: "Bearer secret", count: 2 },
      }),
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        area: "ui",
        code: "render",
        message: "Mensaje oculto por seguridad",
        metadata: { count: 2 },
      }),
    );
  });

  it("aplica rate limit por usuario", async () => {
    for (let index = 0; index < 30; index += 1) {
      const response = await POST(request({ area: "app", message: "boom" }));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(request({ area: "app", message: "boom" }));

    expect(blocked.status).toBe(429);
  });
});
