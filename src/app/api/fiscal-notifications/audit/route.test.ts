import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { isBillingEnforced } from "@/lib/billing/config";
import { consumeFiscalNotificationLibraryAudit } from "@/lib/billing/scan-usage-server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  hasUnlimitedAiAccess,
  unlimitedAiUsageResult,
} from "@/lib/billing/unlimited-ai-access";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";
import { FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1 } from "@/lib/fiscal-notifications/library-ai-audit.v1";
import {
  FiscalNotificationLibraryAiAuditProviderErrorV1,
  reviewFiscalNotificationLibraryWithAiV1,
} from "@/lib/fiscal-notifications/library-ai-audit-provider.v1";
import { isOpenAiConfigured } from "@/lib/server/openai-client";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { POST } from "./route";

vi.mock("@/lib/billing/config", () => ({ isBillingEnforced: vi.fn() }));
vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeFiscalNotificationLibraryAudit: vi.fn(),
}));
vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));
vi.mock("@/lib/billing/server-repository", () => ({
  fetchUserSubscriptionServer: vi.fn(),
}));
vi.mock("@/lib/billing/unlimited-ai-access", () => ({
  hasUnlimitedAiAccess: vi.fn(),
  unlimitedAiUsageResult: vi.fn(),
}));
vi.mock("@/lib/expense-deductibility/config", () => ({
  isConsultorFiscalEnabled: vi.fn(),
}));
vi.mock(
  "@/lib/fiscal-notifications/library-ai-audit-provider.v1",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/lib/fiscal-notifications/library-ai-audit-provider.v1")
      >();
    return { ...actual, reviewFiscalNotificationLibraryWithAiV1: vi.fn() };
  },
);
vi.mock("@/lib/server/openai-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/openai-client")>();
  return { ...actual, isOpenAiConfigured: vi.fn() };
});
vi.mock("@/lib/server/rate-limit", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/rate-limit")>();
  return { ...actual, checkRateLimit: vi.fn() };
});

function auditBody() {
  return {
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    documents: [
      {
        alias: "DOC-001",
        family: "Providencia de apremio",
        type: "Acto ejecutivo",
        authority: "AEAT",
        documentDate: "2026-01-10",
        documentDateBasis: "Fecha de emisión",
        pageCount: 2,
        reviewStatus: "PENDING",
        sourceFileAliases: ["FILE-001"],
        references: [
          {
            label: "Expediente",
            referenceAlias: "REF-001",
            pages: [1],
          },
        ],
        facts: [
          {
            kind: "REFERENCE",
            label: "Expediente",
            value: "REF-001",
            page: 1,
          },
        ],
        amounts: [],
        installments: [],
        explanation: {
          whatItIs: "Una providencia inicia la vía ejecutiva.",
          whyReceived: "La ficha refleja una deuda pendiente.",
          result: "Resultado pendiente de revisión.",
          nextStep: "Revisa referencias, fechas e importes.",
          deadline: "Comprueba la fecha de notificación efectiva.",
        },
        officialSources: [
          {
            authority: "BOE",
            title: "Ley 58/2003, General Tributaria",
          },
        ],
      },
    ],
    relations: [],
  };
}

function request(
  options: {
    consent?: string | null;
    token?: string | null;
    body?: unknown;
  } = {},
) {
  const token = options.token === undefined ? "test-token" : options.token;
  const consent =
    options.consent === undefined
      ? AI_PROCESSING_CONSENT_VERSION
      : options.consent;
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (consent) headers.set("X-AI-Consent-Version", consent);
  return new Request("http://localhost/api/fiscal-notifications/audit", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? auditBody()),
  });
}

const QUOTA = Object.freeze({
  plan: "pro" as const,
  limit: 100,
  used: 1,
  remaining: 99,
  bonusCredits: 0,
  usedUnits: 10,
  remainingUnits: 990,
  bonusCreditUnits: 0,
  unitScale: 10,
  period: "month" as const,
  monthKey: "2026-07",
});
const USAGE = Object.freeze({ allowed: true as const, quota: QUOTA });

beforeEach(() => {
  vi.mocked(isConsultorFiscalEnabled).mockReturnValue(true);
  vi.mocked(getUserFromBearer).mockResolvedValue({
    id: "user-test",
  } as Awaited<ReturnType<typeof getUserFromBearer>>);
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    limit: 4,
    remaining: 3,
    resetAt: Date.now() + 60_000,
    retryAfterSeconds: 0,
    backend: "memory",
  });
  vi.mocked(isBillingEnforced).mockReturnValue(false);
  vi.mocked(hasUnlimitedAiAccess).mockReturnValue(true);
  vi.mocked(unlimitedAiUsageResult).mockReturnValue(USAGE);
  vi.mocked(isOpenAiConfigured).mockReturnValue(true);
  vi.mocked(reviewFiscalNotificationLibraryWithAiV1).mockResolvedValue({
    data: {
      schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
      summary: "Una ficha revisada; no se aplicó ningún cambio.",
      documentsReviewed: 1,
      relationsReviewed: 0,
      findings: [],
    },
    modelId: "gpt-4o",
    promptVersion: "fiscal-notification-library-audit-prompt.v1",
    metrics: {
      attempts: 1,
      durationMs: 12,
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
    },
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/fiscal-notifications/audit", () => {
  it("revisa el paquete validado con gpt-4o y devuelve una respuesta no almacenable", async () => {
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(payload).toMatchObject({
      modelId: "gpt-4o",
      data: { documentsReviewed: 1, relationsReviewed: 0, findings: [] },
    });
    expect(reviewFiscalNotificationLibraryWithAiV1).toHaveBeenCalledWith({
      audit: expect.objectContaining({ documents: [expect.any(Object)] }),
      signal: expect.any(AbortSignal),
    });
    expect(consumeFiscalNotificationLibraryAudit).not.toHaveBeenCalled();
  });

  it("exige sesión confirmada y consentimiento explícito antes de llamar a la IA", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValueOnce(null);
    const unauthenticated = await POST(request({ token: null }));
    expect(unauthenticated.status).toBe(401);

    const withoutConsent = await POST(request({ consent: null }));
    expect(withoutConsent.status).toBe(403);
    expect(reviewFiscalNotificationLibraryWithAiV1).not.toHaveBeenCalled();
  });

  it("rechaza paquetes inválidos sin consumir cuota ni contactar al proveedor", async () => {
    const response = await POST(
      request({
        body: {
          ...auditBody(),
          documents: [
            { ...auditBody().documents[0], type: "EXACT_INTERNAL_TYPE" },
          ],
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(consumeFiscalNotificationLibraryAudit).not.toHaveBeenCalled();
    expect(reviewFiscalNotificationLibraryWithAiV1).not.toHaveBeenCalled();
  });

  it("respeta el límite de consumo antes de ejecutar gpt-4o", async () => {
    vi.mocked(hasUnlimitedAiAccess).mockReturnValue(false);
    vi.mocked(consumeFiscalNotificationLibraryAudit).mockResolvedValue({
      allowed: false,
      blockedByQuota: true,
      reason: "No quedan créditos de IA.",
      quota: QUOTA,
    });

    const response = await POST(request());
    expect(response.status).toBe(402);
    expect(reviewFiscalNotificationLibraryWithAiV1).not.toHaveBeenCalled();
  });

  it("sanea fallos del proveedor sin devolver datos del paquete", async () => {
    vi.mocked(reviewFiscalNotificationLibraryWithAiV1).mockRejectedValue(
      new FiscalNotificationLibraryAiAuditProviderErrorV1("INVALID_OUTPUT"),
    );

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toEqual({
      error: "No se pudo completar la revisión. Inténtalo de nuevo.",
    });
    expect(JSON.stringify(payload)).not.toContain("REF-001");
  });
});
