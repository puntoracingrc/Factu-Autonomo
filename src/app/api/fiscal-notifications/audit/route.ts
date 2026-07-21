import { NextResponse } from "next/server";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { consumeFiscalNotificationLibraryAudit } from "@/lib/billing/scan-usage-server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import {
  hasUnlimitedAiAccess,
  unlimitedAiUsageResult,
} from "@/lib/billing/unlimited-ai-access";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";
import { parseFiscalNotificationLibraryAiAuditInputV1 } from "@/lib/fiscal-notifications/library-ai-audit.v1";
import {
  FiscalNotificationLibraryAiAuditProviderErrorV1,
  reviewFiscalNotificationLibraryWithAiV1,
} from "@/lib/fiscal-notifications/library-ai-audit-provider.v1";
import { isOpenAiConfigured } from "@/lib/server/openai-client";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  Vary: "Authorization, X-AI-Consent-Version",
};

function json(body: unknown, init: { readonly status?: number } = {}) {
  return NextResponse.json(body, {
    status: init.status,
    headers: NO_STORE_HEADERS,
  });
}

async function canUseLibraryAudit(userId: string): Promise<boolean> {
  if (!isBillingEnforced()) return true;
  const subscription = await fetchUserSubscriptionServer(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);
  return getPlanLimits(plan).aiTextAutofill;
}

export async function POST(request: Request) {
  if (!isConsultorFiscalEnabled()) {
    return json(
      { error: "El Consultor fiscal no está disponible." },
      { status: 404 },
    );
  }

  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return json(
      { error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE },
      { status: 401 },
    );
  }
  if (
    request.headers.get("x-ai-consent-version") !==
    AI_PROCESSING_CONSENT_VERSION
  ) {
    return json(
      { error: "Confirma la revisión con IA desde la ficha de documentos." },
      { status: 403 },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "fiscal_notification_library_audit",
      limit: 4,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    const response = rateLimitExceededResponse(
      rateLimit,
      "Has ejecutado demasiadas revisiones. Prueba de nuevo más tarde.",
    );
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  const body = await readJsonBody(request, {
    maxBytes: 1024 * 1024,
    invalidMessage: "Las fichas enviadas para revisar no son válidas.",
    tooLargeMessage:
      "La biblioteca es demasiado grande para una sola revisión.",
  });
  if (!body.ok) {
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      body.response.headers.set(key, value);
    }
    return body.response;
  }
  const audit = parseFiscalNotificationLibraryAiAuditInputV1(body.data);
  if (!audit) {
    return json(
      { error: "Las fichas no superan la validación previa a la revisión." },
      { status: 400 },
    );
  }

  const unlimitedAccess = hasUnlimitedAiAccess(user);
  if (!unlimitedAccess && !(await canUseLibraryAudit(user.id))) {
    return json(
      { error: "La revisión de fichas con IA requiere un plan con IA." },
      { status: 402 },
    );
  }
  if (!isOpenAiConfigured()) {
    return json(
      { error: "La revisión de fichas con IA no está configurada." },
      { status: 503 },
    );
  }

  const usage = unlimitedAccess
    ? unlimitedAiUsageResult()
    : await consumeFiscalNotificationLibraryAudit(user.id);
  if (!usage.allowed && usage.blockedByQuota) {
    return json({ error: usage.reason, quota: usage.quota }, { status: 402 });
  }
  const usageWarning = usage.allowed ? undefined : usage.reason;

  try {
    const result = await reviewFiscalNotificationLibraryWithAiV1({
      audit,
      signal: request.signal,
    });
    console.info("fiscal_notification_library_ai_audit", {
      modelId: result.modelId,
      promptVersion: result.promptVersion,
      documentsReviewed: audit.documents.length,
      relationsReviewed: audit.relations.length,
      findings: result.data.findings.length,
      durationMs: result.metrics.durationMs,
      providerAttempts: result.metrics.attempts,
      inputTokens: result.metrics.inputTokens,
      outputTokens: result.metrics.outputTokens,
      totalTokens: result.metrics.totalTokens,
    });
    return json({
      data: result.data,
      modelId: result.modelId,
      promptVersion: result.promptVersion,
      quota: usage.quota,
      ...(usageWarning ? { usageWarning } : {}),
    });
  } catch (error) {
    const status =
      error instanceof FiscalNotificationLibraryAiAuditProviderErrorV1 &&
      (error.code === "TIMEOUT" || error.code === "PROVIDER_ERROR")
        ? 503
        : 422;
    console.error("fiscal_notification_library_ai_audit_failed", {
      safeCode:
        error instanceof FiscalNotificationLibraryAiAuditProviderErrorV1
          ? error.code
          : "UNKNOWN",
      documentsReviewed: audit.documents.length,
      relationsReviewed: audit.relations.length,
    });
    return json(
      { error: "No se pudo completar la revisión. Inténtalo de nuevo." },
      { status },
    );
  }
}
