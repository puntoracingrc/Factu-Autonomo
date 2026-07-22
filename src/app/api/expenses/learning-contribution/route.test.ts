import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  createExpenseAggregateContributionV1,
} from "@/lib/expense-engine/aggregate-contribution.v1";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_ENGINE_VERSION,
} from "@/lib/expense-engine/contracts";
import {
  EXPENSE_LEARNING_CLAIM_HEADER_V1,
  EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1,
  deriveExpenseLearningSubmissionDigestsV1,
} from "@/lib/expense-engine/learning-contribution-server.v1";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  type RateLimitResult,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { POST } from "./route";

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

const routeSource = readFileSync(
  new URL("./route.ts", import.meta.url),
  "utf8",
);
const USER_ID = "11111111-2222-4333-8444-555555555555";
const CLAIM_TOKEN = Buffer.alloc(32, 7).toString("base64url");
const CLAIM_TOKEN_ALIAS = `${CLAIM_TOKEN.slice(0, -1)}d`;
const CLAIM_SECRET = Buffer.alloc(32, 11).toString("base64url");
const CONTRIBUTOR_SECRET = Buffer.alloc(32, 13).toString("base64url");
const originalFlag = process.env.EXPENSE_LEARNING_INGESTION_ENABLED;
const originalClaimSecret = process.env.EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1;
const originalContributorSecret =
  process.env.EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1;

const ALLOWED: RateLimitResult = {
  allowed: true,
  limit: 30,
  remaining: 29,
  resetAt: Date.parse("2026-07-22T12:10:00.000Z"),
  retryAfterSeconds: 600,
  backend: "memory",
};

function validObservation() {
  return {
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId: "LINE_TABLE",
    documentKind: "EXPENSE_INVOICE",
    sourceQualityBucket: "HIGH",
    routeMode: "SHADOW_AI",
    localOutcome: "CANDIDATE",
    localConfidence: "HIGH",
    abstentionReason: null,
    aiFallbackUsed: false,
    aiFallbackReason: null,
    aiUsageBucket: "ONE",
    localDurationBucket: "LT_1_S",
    humanReviewStatus: "CORRECTED",
    localVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
    aiVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "CORRECTED" }],
    localVsAi: [{ field: "TOTAL_AMOUNT", verdict: "CORRECTED" }],
    math: [{ check: "DOCUMENT_TOTAL", verdict: "MATCH", residual: "EXACT" }],
    criticalFlags: [],
    learningHints: null,
  };
}

function validContribution() {
  const contribution = createExpenseAggregateContributionV1(validObservation());
  if (!contribution) throw new Error("Expected a valid synthetic contribution");
  return contribution;
}

function request(
  body: unknown = validContribution(),
  options: {
    authorization?: string;
    claimToken?: string | null;
    contentLength?: string;
  } = {},
) {
  const authorization = options.authorization ?? "Bearer verified-token";
  const claimToken =
    options.claimToken === undefined ? CLAIM_TOKEN : options.claimToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authorization) headers.Authorization = authorization;
  if (claimToken !== null)
    headers[EXPENSE_LEARNING_CLAIM_HEADER_V1] = claimToken;
  if (options.contentLength) headers["Content-Length"] = options.contentLength;

  return new Request(
    "https://facturacion-autonomos.app/api/expenses/learning-contribution",
    {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

function rpcBuilder(result: unknown = { data: "ACCEPTED", error: null }) {
  return {
    abortSignal: vi.fn(async () => result),
  };
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe(
    "private, no-store, max-age=0",
  );
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Authorization");
}

describe("POST /api/expenses/learning-contribution", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T12:00:00.000Z"));
    process.env.EXPENSE_LEARNING_INGESTION_ENABLED = "true";
    process.env.EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1 = CLAIM_SECRET;
    process.env.EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1 =
      CONTRIBUTOR_SECRET;
    vi.mocked(getUserFromBearer).mockResolvedValue({ id: USER_ID } as Awaited<
      ReturnType<typeof getUserFromBearer>
    >);
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED);
    rpc.mockImplementation(() => rpcBuilder());
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreEnv("EXPENSE_LEARNING_INGESTION_ENABLED", originalFlag);
    restoreEnv("EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1", originalClaimSecret);
    restoreEnv(
      "EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1",
      originalContributorSecret,
    );
  });

  it("permanece oculta antes de autenticación, rate-limit, body, secretos y DB", async () => {
    for (const value of [undefined, "false", "TRUE", "1"]) {
      restoreEnv("EXPENSE_LEARNING_INGESTION_ENABLED", value);
      const response = await POST(
        request("not-json", { claimToken: "not-a-token" }),
      );
      expect(response.status).toBe(404);
      expectPrivate(response);
    }

    expect(getUserFromBearer).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("exige bearer confirmado y rate-limit distribuido por user.id", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValueOnce(null);
    const unauthorized = await POST(request(undefined, { authorization: "" }));
    expect(unauthorized.status).toBe(401);
    expectPrivate(unauthorized);
    expect(getUserFromBearer).toHaveBeenCalledWith(null, {
      requireEmailConfirmed: true,
    });
    expect(checkRateLimit).not.toHaveBeenCalled();

    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      ...ALLOWED,
      allowed: false,
      remaining: 0,
    });
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expectPrivate(limited);
    expect(checkRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      {
        namespace: "expense_learning_contribution_submit",
        limit: 30,
        windowMs: 10 * 60_000,
      },
      USER_ID,
    );
    expect(rateLimitExceededResponse).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sanea excepciones de auth, rate-limit y cliente admin", async () => {
    vi.mocked(getUserFromBearer).mockRejectedValueOnce(
      new Error("private auth detail"),
    );
    const authFailure = await POST(request());

    vi.mocked(checkRateLimit).mockRejectedValueOnce(
      new Error("private rate detail"),
    );
    const rateFailure = await POST(request());

    vi.mocked(getSupabaseAdmin).mockImplementationOnce(() => {
      throw new Error("private client detail");
    });
    const adminFailure = await POST(request());

    for (const response of [authFailure, rateFailure, adminFailure]) {
      const responseBody = JSON.stringify(await response.json());
      expect(response.status).toBe(503);
      expectPrivate(response);
      expect(responseBody).toBe(
        JSON.stringify({ error: "Aprendizaje no disponible" }),
      );
      expect(responseBody).not.toMatch(/private|auth|rate|client/iu);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rechaza tokens ausentes, duplicados, padded o de tamaño incorrecto", async () => {
    for (const claimToken of [
      null,
      `${CLAIM_TOKEN},${CLAIM_TOKEN}`,
      `${CLAIM_TOKEN}=`,
      CLAIM_TOKEN_ALIAS,
      CLAIM_TOKEN.slice(0, -1),
      Buffer.alloc(33, 7).toString("base64url"),
    ]) {
      const response = await POST(request(undefined, { claimToken }));
      expect(response.status, String(claimToken)).toBe(400);
      expectPrivate(response);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("acota Content-Length y los bytes reales del stream a 16 KiB", async () => {
    const declared = await POST(
      request(validContribution(), {
        contentLength: String(
          EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1 + 1,
        ),
      }),
    );
    const streamed = await POST(
      request(
        `"${"x".repeat(EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1)}"`,
      ),
    );

    expect(declared.status).toBe(413);
    expect(streamed.status).toBe(413);
    expectPrivate(declared);
    expectPrivate(streamed);
    expect(rpc).not.toHaveBeenCalled();
    expect(routeSource.match(/readJsonBody\(/gu)).toHaveLength(1);
  });

  it("acepta únicamente la contribución P1A completa y coherente", async () => {
    const canonical = JSON.parse(JSON.stringify(validContribution())) as Record<
      string,
      unknown
    >;
    const metrics = canonical.metrics as Array<Record<string, unknown>>;
    const abstention = metrics.find(
      (metric) => metric.family === "ABSTENTION_REASON",
    );
    if (!abstention) throw new Error("Missing synthetic abstention metric");

    const missingHints = { ...canonical };
    delete missingHints.learningHints;
    const incoherent = JSON.parse(
      JSON.stringify(canonical),
    ) as typeof canonical;
    const incoherentMetric = (
      incoherent.metrics as Array<Record<string, unknown>>
    ).find((metric) => metric.family === "ABSTENTION_REASON");
    if (!incoherentMetric) throw new Error("Missing incoherent metric");
    incoherentMetric.value = "LOW_CONFIDENCE";

    const invalidBodies = [
      { contribution: canonical },
      { ...canonical, userId: USER_ID },
      { ...canonical, week: "2026-07-20" },
      { ...canonical, timestamp: "2026-07-22T12:00:00.000Z" },
      { ...canonical, claimTokenDigest: "a".repeat(64) },
      { ...canonical, contributorWeekHmac: "b".repeat(64) },
      missingHints,
      { ...canonical, learningHints: {} },
      incoherent,
    ];

    for (const invalid of invalidBodies) {
      const response = await POST(request(invalid));
      expect(response.status, JSON.stringify(invalid).slice(0, 120)).toBe(400);
      expectPrivate(response);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falla cerrado con secretos ausentes, cortos o no canónicos", async () => {
    const invalidSecrets = [undefined, "short", `${CLAIM_SECRET}=`];
    for (const secret of invalidSecrets) {
      restoreEnv("EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1", secret);
      const response = await POST(request());
      expect(response.status).toBe(503);
      expectPrivate(response);
    }

    process.env.EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1 = CLAIM_SECRET;
    delete process.env.EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expectPrivate(response);
    expect(rpc).not.toHaveBeenCalled();

    process.env.EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1 = CLAIM_SECRET;
    const reusedKey = await POST(request());
    expect(reusedKey.status).toBe(503);
    expectPrivate(reusedKey);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("aplica la guardia UTC justo antes de HMAC/RPC", async () => {
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
    const response = await POST(request());

    expect(response.status).toBe(503);
    expectPrivate(response);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("envía al RPC solo identidad autenticada, contribución reconstruida y HMAC", async () => {
    const contribution = validContribution();
    const expectedDigests = deriveExpenseLearningSubmissionDigestsV1({
      claimToken: CLAIM_TOKEN,
      userId: USER_ID,
      claimSecret: CLAIM_SECRET,
      contributorSecret: CONTRIBUTOR_SECRET,
      now: () => new Date("2026-07-22T12:00:00.000Z"),
    });
    const response = await POST(request(contribution));

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
    expectPrivate(response);
    expect(rpc).toHaveBeenCalledWith(
      "submit_expense_learning_contribution_v1",
      {
        p_user_id: USER_ID,
        p_contribution: contribution,
        p_claim_token_digest: expectedDigests?.claimTokenDigest,
        p_contributor_week_hmac: expectedDigests?.contributorWeekHmac,
      },
    );
    const serializedArguments = JSON.stringify(rpc.mock.calls[0]);
    expect(serializedArguments).not.toContain(CLAIM_TOKEN);
    expect(serializedArguments).not.toContain(CLAIM_SECRET);
    expect(serializedArguments).not.toContain(CONTRIBUTOR_SECRET);
  });

  it("oculta por igual todos los resultados terminales", async () => {
    const outcomes = [
      "ACCEPTED",
      "REPLAYED",
      "NOT_CONSENTED",
      "WITHDRAWAL_COOLDOWN",
      "CAP_REACHED",
    ];
    for (const outcome of outcomes) {
      rpc.mockImplementationOnce(() =>
        rpcBuilder({ data: outcome, error: null }),
      );
      const response = await POST(request());
      expect(response.status).toBe(202);
      expect(await response.text()).toBe("");
      expectPrivate(response);
    }
  });

  it("trata DISABLED, null, desconocido, error y excepción igual", async () => {
    const outcomes = [
      { data: "DISABLED", error: null },
      { data: null, error: null },
      { data: "PRIVATE_UNKNOWN", error: null },
      {
        data: null,
        error: { message: "private database detail", code: "PGRST500" },
      },
    ];
    for (const outcome of outcomes) {
      rpc.mockImplementationOnce(() => rpcBuilder(outcome));
      const response = await POST(request());
      const responseBody = await response.json();
      expect(response.status).toBe(503);
      expectPrivate(response);
      expect(JSON.stringify(responseBody)).not.toContain(String(outcome.data));
      expect(JSON.stringify(responseBody)).not.toContain(
        "private database detail",
      );
    }

    rpc.mockImplementationOnce(() => ({
      abortSignal: vi.fn(async () => {
        throw new Error("private transport detail");
      }),
    }));
    const thrown = await POST(request());
    expect(thrown.status).toBe(503);
    expect(JSON.stringify(await thrown.json())).not.toContain(
      "private transport detail",
    );
  });

  it("aborta el RPC antes de la ventana semanal y responde 503", async () => {
    let observedSignal: AbortSignal | undefined;
    rpc.mockImplementationOnce(() => ({
      abortSignal: vi.fn((signal: AbortSignal) => {
        observedSignal = signal;
        return new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      }),
    }));

    const pending = POST(request());
    await vi.advanceTimersByTimeAsync(EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1);
    const response = await pending;

    expect(observedSignal?.aborted).toBe(true);
    expect(response.status).toBe(503);
    expectPrivate(response);
  });

  it("no contiene logs ni lee secretos antes del gate en el código fuente", () => {
    expect(routeSource).not.toMatch(/console\./u);
    const post = routeSource.slice(
      routeSource.indexOf("export async function POST"),
    );
    const gate = post.indexOf("routeIsEnabled()");
    expect(gate).toBeGreaterThanOrEqual(0);
    for (const capability of [
      "getUserFromBearer(",
      "checkRateLimit(",
      "EXPENSE_LEARNING_CLAIM_HEADER_V1",
      "readJsonBody(",
      "EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1",
      "getSupabaseAdmin(",
    ]) {
      expect(gate, capability).toBeLessThan(post.indexOf(capability));
    }
    expect(post.indexOf("readJsonBody(")).toBeLessThan(
      post.indexOf("EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1"),
    );
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
