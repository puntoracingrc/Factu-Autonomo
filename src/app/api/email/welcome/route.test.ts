import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import { sendWelcomeEmailForUser } from "@/lib/email/welcome";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { POST } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/email/config", () => ({
  isEmailConfigured: vi.fn(),
}));

vi.mock("@/lib/email/welcome", () => ({
  sendWelcomeEmailForUser: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "rate_limited" }, { status: 429 }),
  ),
}));

function request(options?: {
  authorization?: string;
  body?: Record<string, unknown>;
}) {
  return new Request("http://localhost/api/email/welcome", {
    method: "POST",
    headers: {
      ...(options?.authorization
        ? { Authorization: options.authorization }
        : {}),
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("POST /api/email/welcome", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 12,
      remaining: 11,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });
    vi.mocked(isEmailConfigured).mockReturnValue(true);
    vi.mocked(sendWelcomeEmailForUser).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("rechaza una petición sin identidad bearer confirmada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(sendWelcomeEmailForUser).not.toHaveBeenCalled();
    expect(isEmailConfigured).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Authorization");
  });

  it("liga el envío al usuario bearer y no acepta userId/email públicos", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "authenticated-user",
      email: "self@example.test",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await POST(
      request({
        authorization: "Bearer verified-token",
        body: {
          userId: "foreign-user",
          email: "victim@example.test",
        },
      }),
    );

    expect([400, 413]).toContain(response.status);
    expect(sendWelcomeEmailForUser).not.toHaveBeenCalled();
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer verified-token", {
      requireEmailConfirmed: true,
    });
  });

  it("deriva el único destinatario del usuario verificado", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "authenticated-user",
      email: "self@example.test",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await POST(
      request({ authorization: "Bearer verified-token" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: false });
    expect(sendWelcomeEmailForUser).toHaveBeenCalledWith({
      userId: "authenticated-user",
    });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "email_welcome",
        limit: 12,
        windowMs: 5 * 60_000,
      },
      "authenticated-user",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("expone un reintento acotado para un rechazo recuperable", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "authenticated-user",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(sendWelcomeEmailForUser).mockResolvedValue({
      ok: false,
      retryable: true,
      retryAfterSeconds: 180,
      error: "provider rejected sensitive recipient",
    });

    const response = await POST(
      request({ authorization: "Bearer verified-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("180");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toEqual({
      ok: false,
      skipped: false,
      retryable: true,
      error: "Email de bienvenida pendiente",
    });
    expect(JSON.stringify(body)).not.toContain("sensitive recipient");
  });

  it("no expone el fallo interno del proveedor y mantiene la respuesta privada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "authenticated-user",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(sendWelcomeEmailForUser).mockResolvedValue({
      ok: false,
      error: "provider rejected sensitive recipient",
    });

    const response = await POST(
      request({ authorization: "Bearer verified-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      ok: false,
      skipped: false,
      error: "Email de bienvenida pendiente",
    });
    expect(JSON.stringify(body)).not.toContain("sensitive recipient");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("conserva no-store también cuando limita", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "authenticated-user",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 12,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      retryAfterSeconds: 60,
      backend: "memory",
    });

    const response = await POST(
      request({ authorization: "Bearer verified-token" }),
    );

    expect(response.status).toBe(429);
    expect(rateLimitExceededResponse).toHaveBeenCalled();
    expect(getUserFromBearer).toHaveBeenCalled();
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.any(Object),
      "authenticated-user",
    );
    expect(sendWelcomeEmailForUser).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
