import { NextResponse } from "next/server";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isBillingEnforced } from "@/lib/billing/config";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { consumeFiscalAiFallback } from "@/lib/billing/scan-usage-server";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";
import {
  fiscalAiFallbackTriggerFor,
  runFiscalAiFallbackAfterLocal,
} from "@/lib/expense-deductibility/ai-fallback/orchestrator";
import { createOpenAiFiscalFallbackProvider } from "@/lib/expense-deductibility/ai-fallback/provider";
import { isFiscalAiFallbackEnabled } from "@/lib/expense-deductibility/ai-fallback/server-config";
import { evaluateExpense, parseEvaluationRequest } from "@/lib/tax-engine";
import type { EvaluationResult } from "@/lib/tax-engine";
import { TaxEngineValidationError } from "@/lib/tax-engine/errors";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { isOpenAiConfigured } from "@/lib/server/openai-client";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  Vary: "Authorization, X-AI-Consent-Version",
};

const AI_CONSENT_HEADER = "x-ai-consent-version";

function json(body: unknown, init: { status?: number } = {}) {
  return NextResponse.json(body, {
    status: init.status,
    headers: NO_STORE_HEADERS,
  });
}

function wantsAiFallback(value: unknown): boolean {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).allowAiFallback === true
  );
}

function localWithWarning(
  result: EvaluationResult,
  warning: string,
): EvaluationResult {
  return {
    ...result,
    warnings: [...result.warnings, warning],
    requiresHumanReview: true,
  };
}

async function canUseFiscalAi(userId: string): Promise<boolean> {
  if (!isBillingEnforced()) return true;
  const subscription = await fetchUserSubscriptionServer(userId);
  const plan: PlanId = resolveEffectivePlan(subscription);
  return getPlanLimits(plan).aiTextAutofill;
}

function recordSafeAiMetric(result: EvaluationResult): void {
  const metadata = result.aiFallback;
  if (!metadata) return;
  console.info("expense_deductibility_ai_fallback", {
    status: metadata.status,
    promptVersion: metadata.promptVersion,
    modelId: metadata.modelId,
    durationMs: metadata.durationMs,
    providerAttempts: metadata.providerAttempts,
    inputTokens: metadata.inputTokens,
    outputTokens: metadata.outputTokens,
    totalTokens: metadata.totalTokens,
    validatorErrorCodes: metadata.validatorErrorCodes,
  });
}

export async function POST(request: Request) {
  if (!isConsultorFiscalEnabled()) {
    return json(
      { error: "El Consultor fiscal no está disponible." },
      { status: 404 },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "expense_deductibility_evaluate",
      limit: 60,
      windowMs: 10 * 60_000,
    },
  );
  if (!rateLimit.allowed) {
    const response = rateLimitExceededResponse(rateLimit);
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  const body = await readJsonBody(request, {
    maxBytes: 64 * 1024,
    invalidMessage: "La solicitud de análisis no es válida.",
    tooLargeMessage: "La solicitud de análisis es demasiado grande.",
  });
  if (!body.ok) {
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      body.response.headers.set(key, value);
    }
    return body.response;
  }

  try {
    const payload = parseEvaluationRequest(body.data);
    const localResult = evaluateExpense(
      payload.input,
      payload.context,
      payload.previousAnswers,
      {
        evaluationId: crypto.randomUUID(),
        evaluatedAt: new Date().toISOString(),
      },
    );
    const trigger = fiscalAiFallbackTriggerFor(localResult);
    if (
      !trigger ||
      !wantsAiFallback(body.data) ||
      !isFiscalAiFallbackEnabled()
    ) {
      return json({ data: localResult });
    }

    if (
      request.headers.get(AI_CONSENT_HEADER) !==
      AI_PROCESSING_CONSENT_VERSION
    ) {
      return json({
        data: localWithWarning(
          localResult,
          "El fallback de IA no se ejecutó porque falta un consentimiento vigente.",
        ),
      });
    }

    const user = await getUserFromBearer(
      request.headers.get("authorization"),
      { requireEmailConfirmed: true },
    );
    if (!user) {
      return json({
        data: localWithWarning(
          localResult,
          "El fallback de IA requiere una sesión autenticada; se conserva el resultado local.",
        ),
      });
    }

    const aiRateLimit = await checkRateLimit(
      request,
      {
        namespace: "expense_deductibility_ai_fallback",
        limit: 10,
        windowMs: 10 * 60_000,
      },
      user.id,
    );
    if (!aiRateLimit.allowed) {
      return json({
        data: localWithWarning(
          localResult,
          "El fallback de IA ha alcanzado temporalmente su límite de uso; se conserva el resultado local.",
        ),
      });
    }

    if (!(await canUseFiscalAi(user.id))) {
      return json({
        data: localWithWarning(
          localResult,
          "El fallback de IA no está incluido en el plan actual; se conserva el resultado local.",
        ),
      });
    }

    if (!isOpenAiConfigured()) {
      return json({
        data: localWithWarning(
          localResult,
          "El fallback de IA no está configurado; se conserva el resultado local.",
        ),
      });
    }

    const usage = await consumeFiscalAiFallback(user.id);
    if (!usage.allowed) {
      return json({
        data: localWithWarning(
          localResult,
          usage.blockedByQuota
            ? "No quedan unidades de IA disponibles; se conserva el resultado local."
            : "No se pudo registrar la unidad de IA; se conserva el resultado local sin llamar al proveedor.",
        ),
      });
    }

    const data = await runFiscalAiFallbackAfterLocal({
      localResult,
      input: payload.input,
      context: payload.context,
      trigger,
      provider: createOpenAiFiscalFallbackProvider(),
      signal: request.signal,
    });
    recordSafeAiMetric(data);
    return json({ data });
  } catch (error) {
    if (error instanceof TaxEngineValidationError) {
      return json(
        {
          error: "Revisa los datos del gasto.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }
    console.error("expense_deductibility_evaluation_failed");
    return json(
      { error: "No se pudo completar el análisis. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
