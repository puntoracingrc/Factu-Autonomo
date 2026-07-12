import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { consumeFiscalAiFallback } from "@/lib/billing/scan-usage-server";
import {
  fiscalAiFallbackTriggerFor,
  runFiscalAiFallbackAfterLocal,
} from "@/lib/expense-deductibility/ai-fallback/orchestrator";
import { createOpenAiFiscalFallbackProvider } from "@/lib/expense-deductibility/ai-fallback/provider";
import type { EvaluationResult } from "@/lib/tax-engine";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { isOpenAiConfigured } from "@/lib/server/openai-client";
import { POST } from "./route";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/billing/config", () => ({
  isBillingEnforced: vi.fn(),
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeFiscalAiFallback: vi.fn(),
}));

vi.mock("@/lib/expense-deductibility/ai-fallback/orchestrator", () => ({
  fiscalAiFallbackTriggerFor: vi.fn((result: EvaluationResult) =>
    result.status === "NO_MATCH" ? "NO_MATCH" : null,
  ),
  runFiscalAiFallbackAfterLocal: vi.fn(),
}));

const FAKE_PROVIDER = {
  evaluate: vi.fn(),
};

vi.mock("@/lib/expense-deductibility/ai-fallback/provider", () => ({
  createOpenAiFiscalFallbackProvider: vi.fn(() => FAKE_PROVIDER),
}));

vi.mock("@/lib/server/openai-client", () => ({
  isOpenAiConfigured: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

const ALLOWED_RATE_LIMIT = {
  allowed: true,
  limit: 60,
  remaining: 59,
  resetAt: Date.now() + 10 * 60_000,
  retryAfterSeconds: 600,
  backend: "memory" as const,
};

const ALLOWED_USAGE = {
  allowed: true,
  quota: {
    plan: "pro",
    limit: 30,
    used: 1,
    remaining: 29,
    bonusCredits: 0,
    usedUnits: 1,
    remainingUnits: 299,
    bonusCreditUnits: 0,
    unitScale: 10,
    period: "month",
    monthKey: "2026-07",
  },
} as Awaited<ReturnType<typeof consumeFiscalAiFallback>>;

function authenticatedUser(id = "user-a") {
  return {
    id,
    email: `${id}@example.test`,
    email_confirmed_at: "2026-07-12T08:00:00.000Z",
  } as Awaited<ReturnType<typeof getUserFromBearer>>;
}

function evaluationPayload() {
  return {
    input: {
      concept: "comida",
      supplierName: "Restaurante de prueba",
      expenseDate: "2026-07-12",
      netAmountCents: 2_000,
      vatAmountCents: 200,
      totalAmountCents: 2_200,
      currency: "EUR",
      paymentMethod: "CARD",
      invoiceType: "FULL_INVOICE",
    },
    context: {
      jurisdiction: "ES_COMMON",
      taxpayerType: "SELF_EMPLOYED_IRPF",
      directTaxRegime: "DIRECT_ESTIMATION_SIMPLIFIED",
      vatRegime: "GENERAL",
      hasFullVatDeductionRight: true,
      activityDescription: "Consultoría de software",
      fiscalYear: 2026,
    },
    previousAnswers: {
      "meal.purpose": "PERSONAL",
    },
    allowAiFallback: false,
  };
}

function noMatchPayload() {
  const payload = evaluationPayload();
  payload.input.concept = "licencia tipográfica desconocida";
  payload.previousAnswers = {} as typeof payload.previousAnswers;
  payload.allowAiFallback = true;
  return payload;
}

function aiProposal(localResult: EvaluationResult): EvaluationResult {
  return {
    ...localResult,
    status: "NEEDS_REVIEW",
    evaluationOrigin: "AI_FALLBACK",
    warnings: [
      ...localResult.warnings,
      "Propuesta de IA pendiente de revisión.",
    ],
    requiresHumanReview: true,
    aiFallback: {
      status: "PROPOSED",
      trigger: "NO_MATCH",
      promptVersion: "fiscal-expense-fallback-test.v1",
      modelId: "mock-model",
      suppliedSourceIds: ["boe-lirpf-28-1"],
      citedSourceIds: ["boe-lirpf-28-1"],
      sourceVerificationStatus: "VERIFIED",
      validatorErrorCodes: [],
      durationMs: 12,
      providerAttempts: 1,
      inputTokens: 20,
      outputTokens: 10,
      totalTokens: 30,
      confidenceBand: "LOW",
      humanReviewRequired: true,
      proposalSummary: "Clasificación auxiliar pendiente de revisión.",
      classification: "UNCLASSIFIED",
    },
  };
}

function jsonRequest(
  body: unknown,
  options: {
    authorization?: string;
    consentVersion?: string;
    contentLength?: number;
  } = {},
) {
  return new Request(
    "https://facturacion-autonomos.app/api/expense-deductibility/evaluate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.authorization
          ? { Authorization: options.authorization }
          : {}),
        ...(options.consentVersion
          ? { "X-AI-Consent-Version": options.consentVersion }
          : {}),
        ...(options.contentLength !== undefined
          ? { "Content-Length": String(options.contentLength) }
          : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

function eligibleAiRequest(body: unknown = noMatchPayload()) {
  return jsonRequest(body, {
    authorization: "Bearer verified-token",
    consentVersion: AI_PROCESSING_CONSENT_VERSION,
  });
}

function expectPrivateResponse(response: Response) {
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("x-robots-tag")).toBe(
    "noindex, nofollow, noarchive",
  );
  expect(response.headers.get("vary")).toContain("Authorization");
  expect(response.headers.get("vary")).toContain("X-AI-Consent-Version");
}

function expectNoAiBoundaryWasCrossed() {
  expect(getUserFromBearer).not.toHaveBeenCalled();
  expect(consumeFiscalAiFallback).not.toHaveBeenCalled();
  expect(createOpenAiFiscalFallbackProvider).not.toHaveBeenCalled();
  expect(runFiscalAiFallbackAfterLocal).not.toHaveBeenCalled();
  expect(FAKE_PROVIDER.evaluate).not.toHaveBeenCalled();
}

describe("POST /api/expense-deductibility/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "true");
    vi.stubEnv("CONSULTOR_FISCAL_AI_FALLBACK_ENABLED", "true");
    vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED_RATE_LIMIT);
    vi.mocked(getUserFromBearer).mockResolvedValue(authenticatedUser());
    vi.mocked(isBillingEnforced).mockReturnValue(false);
    vi.mocked(isOpenAiConfigured).mockReturnValue(true);
    vi.mocked(consumeFiscalAiFallback).mockResolvedValue(ALLOWED_USAGE);
    vi.mocked(runFiscalAiFallbackAfterLocal).mockImplementation(
      async ({ localResult }) => aiProposal(localResult),
    );
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("cierra el endpoint completo cuando la Beta está desactivada", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED", "false");

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expectPrivateResponse(response);
    expect(body).toEqual({
      error: "El Consultor fiscal no está disponible.",
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled();
    expectNoAiBoundaryWasCrossed();
  });

  it("conserva NO_MATCH local cuando la flag específica de IA está desactivada", async () => {
    vi.stubEnv("CONSULTOR_FISCAL_AI_FALLBACK_ENABLED", "false");

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expectPrivateResponse(response);
    expect(body.data).toMatchObject({
      status: "NO_MATCH",
      evaluationOrigin: "LOCAL_RULE",
      directTax: null,
      indirectTax: null,
      requiresHumanReview: true,
    });
    expectNoAiBoundaryWasCrossed();
  });

  it("resuelve una regla local sin autenticar, consumir cuota ni invocar IA", async () => {
    const response = await POST(eligibleAiRequest(evaluationPayload()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expectPrivateResponse(response);
    expect(body.data).toMatchObject({
      evaluationId: "00000000-0000-4000-8000-000000000001",
      status: "NEEDS_REVIEW",
      evaluationOrigin: "LOCAL_RULE",
      matchedRuleId: "es-common.irpf-vat.meals-hospitality",
      matchedRuleVersion: "1.0.0",
      risk: "RED",
      directTax: {
        taxType: "IRPF",
        deductibleAmountCents: 0,
      },
      indirectTax: {
        taxType: "IVA",
        deductibleAmountCents: 0,
      },
    });
    expect(Number.isNaN(Date.parse(body.data.evaluatedAt))).toBe(false);
    expect(JSON.parse(JSON.stringify(body))).toEqual(body);
    expect(fiscalAiFallbackTriggerFor).toHaveBeenCalledWith(
      expect.objectContaining({ status: "NEEDS_REVIEW" }),
    );
    expectNoAiBoundaryWasCrossed();
  });

  it("devuelve NEEDS_INPUT sin atravesar la frontera de IA", async () => {
    const payload = evaluationPayload();
    payload.allowAiFallback = true;
    payload.context.jurisdiction = "UNKNOWN";
    payload.context.taxpayerType = "UNKNOWN";
    payload.context.directTaxRegime = "UNKNOWN";
    payload.context.vatRegime = "UNKNOWN";
    payload.context.hasFullVatDeductionRight = false;
    payload.context.activityDescription = "";

    const response = await POST(eligibleAiRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expectPrivateResponse(response);
    expect(body.data).toMatchObject({
      status: "NEEDS_INPUT",
      evaluationOrigin: "LOCAL_RULE",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
      officialSources: [],
      requiresHumanReview: true,
    });
    expect(body.data.missingInformation).toHaveLength(4);
    expectNoAiBoundaryWasCrossed();
  });

  it("devuelve UNSUPPORTED sin autenticar ni invocar IA", async () => {
    const payload = evaluationPayload();
    payload.allowAiFallback = true;
    payload.context.jurisdiction = "ES_CANARY_IGIC";

    const response = await POST(eligibleAiRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expectPrivateResponse(response);
    expect(body.data).toMatchObject({
      status: "UNSUPPORTED",
      evaluationOrigin: "LOCAL_RULE",
      risk: "UNDETERMINED",
      directTax: null,
      indirectTax: null,
      matchedRuleId: null,
      requiresHumanReview: true,
    });
    expect(body.data.calculationTrace).toEqual([]);
    expectNoAiBoundaryWasCrossed();
  });

  it("ejecuta el fallback solo tras NO_MATCH, consentimiento vigente y bearer válido", async () => {
    const externalFetch = vi.fn();
    vi.stubGlobal("fetch", externalFetch);
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expectPrivateResponse(response);
    expect(body.data).toMatchObject({
      status: "NEEDS_REVIEW",
      evaluationOrigin: "AI_FALLBACK",
      aiFallback: {
        status: "PROPOSED",
        trigger: "NO_MATCH",
        modelId: "mock-model",
        humanReviewRequired: true,
      },
      requiresHumanReview: true,
    });
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer verified-token", {
      requireEmailConfirmed: true,
    });
    expect(consumeFiscalAiFallback).toHaveBeenCalledWith("user-a");
    expect(createOpenAiFiscalFallbackProvider).toHaveBeenCalledOnce();
    expect(runFiscalAiFallbackAfterLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        localResult: expect.objectContaining({ status: "NO_MATCH" }),
        trigger: "NO_MATCH",
        provider: FAKE_PROVIDER,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.any(Request),
      {
        namespace: "expense_deductibility_ai_fallback",
        limit: 10,
        windowMs: 10 * 60_000,
      },
      "user-a",
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "expense_deductibility_ai_fallback",
      expect.objectContaining({
        status: "PROPOSED",
        modelId: "mock-model",
        durationMs: 12,
        totalTokens: 30,
      }),
    );
    expect(FAKE_PROVIDER.evaluate).not.toHaveBeenCalled();
    expect(externalFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("no autentica ni llama a IA cuando falta consentimiento vigente", async () => {
    const response = await POST(
      jsonRequest(noMatchPayload(), {
        authorization: "Bearer verified-token",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "NO_MATCH",
      evaluationOrigin: "LOCAL_RULE",
      requiresHumanReview: true,
    });
    expect(body.data.warnings.join(" ")).toMatch(/consentimiento vigente/i);
    expectNoAiBoundaryWasCrossed();
  });

  it("conserva el resultado local cuando el bearer no identifica un usuario", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue(null);

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "NO_MATCH",
      evaluationOrigin: "LOCAL_RULE",
      requiresHumanReview: true,
    });
    expect(body.data.warnings.join(" ")).toMatch(/sesión autenticada/i);
    expect(getUserFromBearer).toHaveBeenCalledOnce();
    expect(consumeFiscalAiFallback).not.toHaveBeenCalled();
    expect(createOpenAiFiscalFallbackProvider).not.toHaveBeenCalled();
    expect(runFiscalAiFallbackAfterLocal).not.toHaveBeenCalled();
  });

  it("aplica el límite costoso con el usuario derivado de cada bearer", async () => {
    vi.mocked(getUserFromBearer)
      .mockResolvedValueOnce(authenticatedUser("user-a"))
      .mockResolvedValueOnce(authenticatedUser("user-b"));

    const first = await POST(
      jsonRequest(noMatchPayload(), {
        authorization: "Bearer token-a",
        consentVersion: AI_PROCESSING_CONSENT_VERSION,
      }),
    );
    const second = await POST(
      jsonRequest(noMatchPayload(), {
        authorization: "Bearer token-b",
        consentVersion: AI_PROCESSING_CONSENT_VERSION,
      }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.any(Request),
      expect.objectContaining({
        namespace: "expense_deductibility_ai_fallback",
      }),
      "user-a",
    );
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      4,
      expect.any(Request),
      expect.objectContaining({
        namespace: "expense_deductibility_ai_fallback",
      }),
      "user-b",
    );
    expect(consumeFiscalAiFallback).toHaveBeenNthCalledWith(1, "user-a");
    expect(consumeFiscalAiFallback).toHaveBeenNthCalledWith(2, "user-b");
  });

  it("no consume cuota ni crea proveedor cuando el límite IA del usuario está agotado", async () => {
    vi.mocked(checkRateLimit).mockImplementation(async (_request, policy) =>
      policy.namespace === "expense_deductibility_ai_fallback"
        ? {
            ...ALLOWED_RATE_LIMIT,
            allowed: false,
            remaining: 0,
            retryAfterSeconds: 37,
          }
        : ALLOWED_RATE_LIMIT,
    );

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("NO_MATCH");
    expect(body.data.warnings.join(" ")).toMatch(/límite de uso/i);
    expect(consumeFiscalAiFallback).not.toHaveBeenCalled();
    expect(createOpenAiFiscalFallbackProvider).not.toHaveBeenCalled();
    expect(runFiscalAiFallbackAfterLocal).not.toHaveBeenCalled();
  });

  it("conserva NO_MATCH y no crea proveedor cuando la cuota canónica está agotada", async () => {
    vi.mocked(consumeFiscalAiFallback).mockResolvedValue({
      ...ALLOWED_USAGE,
      allowed: false,
      blockedByQuota: true,
      reason: "quota-private-reason",
    });

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "NO_MATCH",
      evaluationOrigin: "LOCAL_RULE",
      requiresHumanReview: true,
    });
    expect(body.data.warnings.join(" ")).toMatch(/unidades de IA/i);
    expect(JSON.stringify(body)).not.toContain("quota-private-reason");
    expect(consumeFiscalAiFallback).toHaveBeenCalledWith("user-a");
    expect(createOpenAiFiscalFallbackProvider).not.toHaveBeenCalled();
    expect(runFiscalAiFallbackAfterLocal).not.toHaveBeenCalled();
    expect(FAKE_PROVIDER.evaluate).not.toHaveBeenCalled();
  });

  it("falla cerrado si el backend no puede registrar la unidad IA", async () => {
    vi.mocked(consumeFiscalAiFallback).mockResolvedValue({
      ...ALLOWED_USAGE,
      allowed: false,
      blockedByQuota: false,
      reason: "metering-private-error",
    });

    const response = await POST(eligibleAiRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("NO_MATCH");
    expect(body.data.warnings.join(" ")).toMatch(/sin llamar al proveedor/i);
    expect(JSON.stringify(body)).not.toContain("metering-private-error");
    expect(createOpenAiFiscalFallbackProvider).not.toHaveBeenCalled();
    expect(runFiscalAiFallbackAfterLocal).not.toHaveBeenCalled();
  });

  it("ignora identidades de usuario, tenant y empresa enviadas en el cuerpo", async () => {
    const payload = noMatchPayload() as ReturnType<typeof noMatchPayload> & {
      userId?: string;
      tenantId?: string;
      companyId?: string;
      input: ReturnType<typeof noMatchPayload>["input"] & {
        userId?: string;
        tenantId?: string;
      };
      context: ReturnType<typeof noMatchPayload>["context"] & {
        userId?: string;
        tenantId?: string;
        companyId?: string;
      };
      previousAnswers: Record<string, string>;
    };
    payload.userId = "foreign-user-secret";
    payload.tenantId = "foreign-tenant-secret";
    payload.companyId = "foreign-company-secret";
    payload.input.userId = "foreign-user-secret";
    payload.input.tenantId = "foreign-tenant-secret";
    payload.context.userId = "foreign-user-secret";
    payload.context.tenantId = "foreign-tenant-secret";
    payload.context.companyId = "foreign-company-secret";
    payload.previousAnswers.tenantId = "foreign-tenant-secret";

    const response = await POST(eligibleAiRequest(payload));
    const body = await response.json();
    const orchestratorRequest = vi.mocked(runFiscalAiFallbackAfterLocal).mock
      .calls[0][0];
    const serializedBoundary = JSON.stringify({
      input: orchestratorRequest.input,
      context: orchestratorRequest.context,
    });
    const serializedResponse = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(getUserFromBearer).toHaveBeenCalledWith("Bearer verified-token", {
      requireEmailConfirmed: true,
    });
    expect(consumeFiscalAiFallback).toHaveBeenCalledWith("user-a");
    expect(serializedBoundary).not.toMatch(
      /foreign-user-secret|foreign-tenant-secret|foreign-company-secret|userId|tenantId|companyId/,
    );
    expect(serializedResponse).not.toMatch(
      /foreign-user-secret|foreign-tenant-secret|foreign-company-secret|userId|tenantId|companyId/,
    );
  });

  it("devuelve 400 acotado para entrada inválida y no atraviesa IA", async () => {
    const payload = noMatchPayload();
    payload.input.netAmountCents = -1;
    payload.input.supplierName = "supplier-private-value";

    const response = await POST(eligibleAiRequest(payload));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(400);
    expectPrivateResponse(response);
    expect(body).toMatchObject({
      error: "Revisa los datos del gasto.",
      issues: expect.arrayContaining([
        expect.objectContaining({ field: "input.netAmountCents" }),
      ]),
    });
    expect(serialized).not.toContain("supplier-private-value");
    expect(serialized).not.toMatch(/stack|TaxEngineValidationError/);
    expectNoAiBoundaryWasCrossed();
  });

  it("devuelve 413 antes de leer un cuerpo declarado por encima de 64 KiB", async () => {
    const response = await POST(
      jsonRequest("{}", { contentLength: 64 * 1024 + 1 }),
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expectPrivateResponse(response);
    expect(body).toEqual({
      error: "La solicitud de análisis es demasiado grande.",
    });
    expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled();
    expectNoAiBoundaryWasCrossed();
  });

  it("devuelve 429 general antes de validar el cuerpo o tocar IA", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      ...ALLOWED_RATE_LIMIT,
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 37,
    });

    const response = await POST(jsonRequest("not-json"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expectPrivateResponse(response);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(response.headers.get("x-ratelimit-limit")).toBe("60");
    expect(body).toEqual({
      error: "Demasiados intentos. Prueba de nuevo en unos instantes.",
    });
    expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled();
    expectNoAiBoundaryWasCrossed();
  });

  it("sanea un fallo del orquestador sin devolver stack, PII ni el error interno", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(runFiscalAiFallbackAfterLocal).mockRejectedValue(
      new Error(
        "provider stack for foreign-tenant-secret and supplier-private-value",
      ),
    );

    const response = await POST(eligibleAiRequest());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expectPrivateResponse(response);
    expect(body).toEqual({
      error: "No se pudo completar el análisis. Inténtalo de nuevo.",
    });
    expect(serialized).not.toMatch(
      /foreign-tenant-secret|supplier-private-value|provider stack|Error:|stack/,
    );
    expect(consoleError.mock.calls).toEqual([
      ["expense_deductibility_evaluation_failed"],
    ]);
    expect(FAKE_PROVIDER.evaluate).not.toHaveBeenCalled();
  });
});
