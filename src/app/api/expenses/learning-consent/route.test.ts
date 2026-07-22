import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
} from "@/lib/expense-engine/learning-consent.v1";
import { EXPENSE_ENGINE_PRIVACY_POLICY_VERSION } from "@/lib/expense-engine/contracts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  type RateLimitResult,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GET, PUT } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    Response.json({ error: "rate_limited" }, { status: 429 }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const rpc = vi.fn();
const originalFlag = process.env.EXPENSE_LEARNING_CONSENT_ENABLED;

const ALLOWED: RateLimitResult = {
  allowed: true,
  limit: 120,
  remaining: 119,
  resetAt: Date.parse("2026-07-22T12:10:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

const decision = {
  schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
  noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  granted: true,
};

const undecidedState = {
  state: "UNDECIDED",
  schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
  noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  decidedAt: null,
};

const grantedState = {
  ...undecidedState,
  state: "GRANTED",
  decidedAt: "2026-07-22T10:00:00+00:00",
};

function getRequest(authorization = "Bearer verified-token") {
  return new Request(
    "https://facturacion-autonomos.app/api/expenses/learning-consent",
    { headers: authorization ? { Authorization: authorization } : {} },
  );
}

function putRequest(body: unknown, authorization = "Bearer verified-token") {
  return new Request(
    "https://facturacion-autonomos.app/api/expenses/learning-consent",
    {
      method: "PUT",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        "Content-Type": "application/json",
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Authorization");
}

describe("GET/PUT /api/expenses/learning-consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPENSE_LEARNING_CONSENT_ENABLED = "true";
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "authenticated-user",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
    rpc.mockImplementation(async (name: string) => ({
      data:
        name === "get_expense_learning_consent_v1"
          ? undecidedState
          : grantedState,
      error: null,
    }));
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.EXPENSE_LEARNING_CONSENT_ENABLED;
    } else {
      process.env.EXPENSE_LEARNING_CONSENT_ENABLED = originalFlag;
    }
  });

  it("permanece oculta antes de autenticación, rate-limit o base de datos", async () => {
    for (const value of [undefined, "false", "TRUE", "1"]) {
      if (value === undefined) {
        delete process.env.EXPENSE_LEARNING_CONSENT_ENABLED;
      } else {
        process.env.EXPENSE_LEARNING_CONSENT_ENABLED = value;
      }

      const [getResponse, putResponse] = await Promise.all([
        GET(getRequest()),
        PUT(putRequest(decision)),
      ]);
      expect(getResponse.status).toBe(404);
      expect(putResponse.status).toBe(404);
      expectPrivate(getResponse);
      expectPrivate(putResponse);
    }

    expect(getUserFromBearer).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lee únicamente el estado del usuario bearer confirmado", async () => {
    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(await response.json()).toEqual({ consent: undecidedState });
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer verified-token", {
      requireEmailConfirmed: true,
    });
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "expense_learning_consent_read",
        limit: 120,
        windowMs: 10 * 60_000,
      },
      "authenticated-user",
    );
    expect(rpc).toHaveBeenCalledWith("get_expense_learning_consent_v1", {
      p_user_id: "authenticated-user",
    });
  });

  it("escribe una decisión cerrada ligada al usuario bearer", async () => {
    const response = await PUT(putRequest(decision));

    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(await response.json()).toEqual({
      consent: {
        ...grantedState,
        decidedAt: "2026-07-22T10:00:00.000Z",
      },
    });
    expect(rpc).toHaveBeenCalledWith("set_expense_learning_consent_v1", {
      p_user_id: "authenticated-user",
      p_decision: decision,
    });
  });

  it("rechaza identidad o claves públicas antes de llamar al RPC", async () => {
    const response = await PUT(
      putRequest({ ...decision, userId: "foreign-user" }),
    );

    expect(response.status).toBe(400);
    expectPrivate(response);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("acota el body real y solo lo parsea una vez", async () => {
    const response = await PUT(putRequest({ padding: "x".repeat(700) }));

    expect(response.status).toBe(413);
    expectPrivate(response);
    expect(rpc).not.toHaveBeenCalled();
    expect(routeSource.match(/readJsonBody\(/gu)).toHaveLength(1);
  });

  it("mantiene no-store en 401, 429, 400, 413 y 503", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValueOnce(null);
    const unauthorized = await GET(getRequest(""));

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      allowed: false,
      remaining: 0,
    });
    const limited = await GET(getRequest());

    const invalid = await PUT(putRequest("{"));
    const oversized = await PUT(putRequest({ padding: "x".repeat(700) }));

    vi.mocked(getSupabaseAdmin).mockReturnValueOnce(null);
    const unavailable = await GET(getRequest());

    expect(unauthorized.status).toBe(401);
    expect(limited.status).toBe(429);
    expect(invalid.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(unavailable.status).toBe(503);
    for (const response of [
      unauthorized,
      limited,
      invalid,
      oversized,
      unavailable,
    ]) {
      expectPrivate(response);
    }
    expect(rateLimitExceededResponse).toHaveBeenCalledTimes(1);
  });

  it("no refleja errores internos ni acepta una respuesta RPC fabricada", async () => {
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: "private database detail", code: "PGRST500" },
      })
      .mockResolvedValueOnce({
        data: { ...undecidedState, userId: "foreign-user" },
        error: null,
      })
      .mockRejectedValueOnce(new Error("private transport detail"));

    const databaseFailure = await GET(getRequest());
    const malformedOutput = await GET(getRequest());
    const transportFailure = await GET(getRequest());
    const firstBody = await databaseFailure.json();
    const secondBody = await malformedOutput.json();
    const thirdBody = await transportFailure.json();

    expect(databaseFailure.status).toBe(503);
    expect(malformedOutput.status).toBe(503);
    expect(transportFailure.status).toBe(503);
    expectPrivate(databaseFailure);
    expectPrivate(malformedOutput);
    expectPrivate(transportFailure);
    expect(JSON.stringify(firstBody)).not.toContain("private database detail");
    expect(JSON.stringify(secondBody)).not.toContain("foreign-user");
    expect(JSON.stringify(thirdBody)).not.toContain("private transport detail");
  });
});
