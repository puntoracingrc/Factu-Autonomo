import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin/access";
import { sendEmail } from "@/lib/email/send";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/admin/access", () => ({
  isAdminUser: vi.fn(),
}));

vi.mock("@/lib/email/config", () => ({
  isEmailConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

function jwtWithPayload(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.signature`;
}

function request(method = "GET", body?: unknown, aal = "aal2") {
  return new Request("http://localhost/api/admin/users/user-1/mfa", {
    method,
    headers: {
      Authorization: `Bearer ${jwtWithPayload({ aal })}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function params() {
  return { params: Promise.resolve({ userId: "user-1" }) };
}

function testCodeHash(userId: string, code: string): string {
  return createHash("sha256")
    .update(`test-salt:${userId}:${code}`)
    .digest("hex");
}

function tableMock(options: {
  latestChallenge?: {
    id: string;
    user_id: string;
    code_hash: string;
    attempts: number;
    expires_at: string;
    used_at: null;
  } | null;
} = {}) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: "challenge-1" }, error: null })),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          gt: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({
                data: options.latestChallenge ? [options.latestChallenge] : [],
                error: null,
              })),
            })),
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: null, error: null })),
    })),
  };
}

describe("admin user MFA recovery route", () => {
  beforeEach(() => {
    vi.stubEnv("SERVER_RATE_LIMIT_SALT", "test-salt");
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(isAdminUser).mockReturnValue(true);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("requiere una sesion incluida en la allowlist admin", async () => {
    vi.mocked(isAdminUser).mockReturnValue(false);
    const response = await GET(request("GET", undefined, "aal1"), params());

    expect(response.status).toBe(403);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("lista factores del usuario sin exponer secretos", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1", email: "cliente@example.com" } },
            error: null,
          })),
          mfa: {
            listFactors: vi.fn(async () => ({
              data: {
                factors: [
                  {
                    id: "factor-1",
                    factor_type: "totp",
                    status: "verified",
                    friendly_name: "Movil",
                    created_at: "2026-07-09T10:00:00.000Z",
                    updated_at: "2026-07-09T10:00:00.000Z",
                  },
                ],
              },
              error: null,
            })),
          },
        },
      },
    } as never);

    const response = await GET(request(), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.factors[0]).toMatchObject({
      id: "factor-1",
      type: "totp",
      status: "verified",
      friendlyName: "Movil",
    });
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("envia codigo de recuperacion al email del usuario", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1", email: "cliente@example.com" } },
            error: null,
          })),
        },
      },
      from: vi.fn(() => tableMock()),
    } as never);

    const response = await POST(request("POST"), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.email).toBe("cliente@example.com");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.com",
        subject: expect.stringContaining("recuperar"),
      }),
    );
  });

  it("no borra factor sin codigo valido", async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1", email: "cliente@example.com" } },
            error: null,
          })),
          mfa: {
            listFactors: vi.fn(),
            deleteFactor: vi.fn(),
          },
        },
      },
      from: vi.fn(() => tableMock()),
    } as never);

    const response = await DELETE(
      request("DELETE", {
        factorId: "factor-1",
        confirmationEmail: "cliente@example.com",
        recoveryCode: "123",
      }),
      params(),
    );

    expect(response.status).toBe(400);
  });

  it("borra factor con email y codigo enviados al usuario", async () => {
    const deleteFactor = vi.fn(async () => ({ data: { id: "factor-1" }, error: null }));
    const update = vi.fn(() => ({
      eq: vi.fn(async () => ({ data: null, error: null })),
    }));
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: "user-1", email: "cliente@example.com" } },
            error: null,
          })),
          mfa: {
            listFactors: vi.fn(async () => ({
              data: {
                factors: [
                  {
                    id: "factor-1",
                    factor_type: "totp",
                    status: "verified",
                    created_at: "2026-07-09T10:00:00.000Z",
                    updated_at: "2026-07-09T10:00:00.000Z",
                  },
                ],
              },
              error: null,
            })),
            deleteFactor,
          },
        },
      },
      from: vi.fn((table: string) => {
        if (table === "admin_mfa_recovery_challenges") {
          return {
            ...tableMock({
              latestChallenge: {
                id: "challenge-1",
                user_id: "user-1",
                code_hash: testCodeHash("user-1", "123456"),
                attempts: 0,
                expires_at: new Date(Date.now() + 60_000).toISOString(),
                used_at: null,
              },
            }),
            update,
          };
        }
        return {
          insert: vi.fn(async () => ({ data: null, error: null })),
        };
      }),
    } as never);

    const response = await DELETE(
      request("DELETE", {
        factorId: "factor-1",
        confirmationEmail: "cliente@example.com",
        recoveryCode: "123456",
      }),
      params(),
    );

    expect(response.status).toBe(200);
    expect(deleteFactor).toHaveBeenCalledWith({
      id: "factor-1",
      userId: "user-1",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ used_at: expect.any(String) }),
    );
  });
});
