import { assertEvaluationResult } from "@/lib/tax-engine/schemas";
import type {
  AiFallbackMetadata,
  AiFallbackTrigger,
  EvaluationResult,
  ExpenseInput,
  TaxContext,
} from "@/lib/tax-engine/types";
import { buildFiscalAiContext, verifiedFiscalAiSources } from "./legal-context";
import {
  FiscalAiProviderError,
  type FiscalAiFallbackProvider,
  type FiscalAiProviderResponse,
} from "./provider";
import {
  FISCAL_AI_PROMPT_VERSION,
  getFiscalAiModel,
} from "./server-config";
import { validateFiscalAiOutput } from "./output";

interface RunFiscalAiFallbackRequest {
  localResult: EvaluationResult;
  input: ExpenseInput;
  context: TaxContext;
  trigger: AiFallbackTrigger | null;
  provider: FiscalAiFallbackProvider;
  signal?: AbortSignal;
}

function isAdmittedCandidate(
  result: EvaluationResult,
  trigger: AiFallbackTrigger | null,
): boolean {
  if (trigger === "NO_MATCH") return result.status === "NO_MATCH";
  if (trigger !== "UNRESOLVABLE_AMBIGUITY") return false;
  return (
    result.status === "NEEDS_REVIEW" &&
    result.matchedRuleId === null &&
    result.requiredQuestions.length === 0 &&
    result.directTax === null &&
    result.indirectTax === null &&
    result.requiresHumanReview
  );
}

export function fiscalAiFallbackTriggerFor(
  result: EvaluationResult,
): AiFallbackTrigger | null {
  // La ambigüedad actual del matcher es resoluble mediante una pregunta local y
  // por tanto no entra aquí. Una futura ambigüedad no resoluble deberá marcarse
  // explícitamente en la capa de aplicación antes de usar el segundo trigger.
  return result.status === "NO_MATCH" ? "NO_MATCH" : null;
}

function safeMetrics(
  metrics: {
    attempts?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
) {
  return {
    ...(metrics.attempts === undefined
      ? {}
      : { providerAttempts: metrics.attempts }),
    ...(metrics.inputTokens === undefined
      ? {}
      : { inputTokens: metrics.inputTokens }),
    ...(metrics.outputTokens === undefined
      ? {}
      : { outputTokens: metrics.outputTokens }),
    ...(metrics.totalTokens === undefined
      ? {}
      : { totalTokens: metrics.totalTokens }),
  };
}

function failedResult(
  request: RunFiscalAiFallbackRequest,
  options: {
    status: "REJECTED" | "FAILED";
    errorCodes: readonly string[];
    durationMs: number;
    suppliedSourceIds: readonly string[];
    modelId?: string;
    promptVersion?: string;
    metrics?: {
      attempts?: number;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  },
): EvaluationResult {
  const metadata: AiFallbackMetadata = {
    status: options.status,
    trigger: request.trigger!,
    promptVersion: options.promptVersion ?? FISCAL_AI_PROMPT_VERSION,
    modelId: options.modelId ?? getFiscalAiModel(),
    suppliedSourceIds: options.suppliedSourceIds,
    citedSourceIds: [],
    sourceVerificationStatus: "VERIFIED",
    validatorErrorCodes: options.errorCodes,
    durationMs: Math.max(0, Math.floor(options.durationMs)),
    ...(options.metrics ? safeMetrics(options.metrics) : {}),
    confidenceBand: null,
    humanReviewRequired: true,
  };
  return assertEvaluationResult(
    {
      ...request.localResult,
      evaluationOrigin: "LOCAL_RULE",
      warnings: [
        ...request.localResult.warnings,
        options.status === "REJECTED"
          ? "La salida de IA no superó la validación fiscal determinista y se ha descartado."
          : "No se pudo obtener una propuesta de IA validada; se conserva el resultado local.",
      ],
      requiresHumanReview: true,
      aiFallback: metadata,
    },
    request.input,
  );
}

export async function runFiscalAiFallbackAfterLocal(
  request: RunFiscalAiFallbackRequest,
): Promise<EvaluationResult> {
  if (!isAdmittedCandidate(request.localResult, request.trigger)) {
    return request.localResult;
  }

  const suppliedContext = buildFiscalAiContext(request.input, request.context);
  const canonicalSuppliedIds = suppliedContext.legalFragments.map(
    (fragment) => fragment.sourceId,
  );
  let providerResponse: FiscalAiProviderResponse;
  try {
    providerResponse = await request.provider.evaluate({
      context: suppliedContext,
      signal: request.signal,
    });
  } catch (error) {
    const providerError =
      error instanceof FiscalAiProviderError
        ? error
        : new FiscalAiProviderError("PROVIDER_NON_TRANSIENT_ERROR");
    return failedResult(request, {
      status: "FAILED",
      errorCodes: [providerError.code],
      durationMs: providerError.durationMs,
      suppliedSourceIds: canonicalSuppliedIds,
      metrics: { attempts: providerError.attempts },
    });
  }

  const suppliedIdsAgree =
    providerResponse.suppliedSourceIds.length === canonicalSuppliedIds.length &&
    providerResponse.suppliedSourceIds.every(
      (id, index) => id === canonicalSuppliedIds[index],
    );
  if (!suppliedIdsAgree) {
    return failedResult(request, {
      status: "REJECTED",
      errorCodes: ["SOURCE_NOT_SUPPLIED"],
      durationMs: providerResponse.metrics.durationMs,
      suppliedSourceIds: canonicalSuppliedIds,
      modelId: providerResponse.modelId,
      promptVersion: providerResponse.promptVersion,
      metrics: providerResponse.metrics,
    });
  }

  const validation = validateFiscalAiOutput(
    providerResponse.output,
    suppliedContext,
    request.input,
    request.context,
  );
  if (!validation.ok) {
    return failedResult(request, {
      status: "REJECTED",
      errorCodes: validation.errorCodes,
      durationMs: providerResponse.metrics.durationMs,
      suppliedSourceIds: canonicalSuppliedIds,
      modelId: providerResponse.modelId,
      promptVersion: providerResponse.promptVersion,
      metrics: providerResponse.metrics,
    });
  }

  const proposal = validation.proposal;
  const citedIds = [...new Set(proposal.sourceIds)];
  const officialSources = verifiedFiscalAiSources().filter((source) =>
    citedIds.includes(source.id),
  );
  const result: EvaluationResult = {
    ...request.localResult,
    status: "NEEDS_REVIEW",
    risk: "UNDETERMINED",
    directTax: null,
    indirectTax: null,
    requiredQuestions: [],
    missingInformation: proposal.missingInformation,
    evidenceRequired: proposal.evidenceRequired,
    practicalAdvice: [
      ...request.localResult.practicalAdvice,
      "Revisa la clasificación y la documentación con una persona asesora antes de contabilizar.",
    ],
    warnings: [
      ...request.localResult.warnings,
      "Propuesta de IA pendiente de revisión: el modelo no es una fuente jurídica.",
      "Los resúmenes legales suministrados no autorizan porcentajes ni importes definitivos.",
    ],
    calculationTrace: [
      ...request.localResult.calculationTrace,
      {
        code: "local-engine-no-match",
        label: "Motor fiscal local",
        detail: "El motor determinista terminó sin una regla aplicable antes de activar el fallback.",
      },
      {
        code: "ai-fallback-validated",
        label: "Fallback de IA validado",
        detail: "La estructura, las fuentes citadas y los límites fiscales pasaron validación determinista; la propuesta sigue pendiente de revisión humana.",
      },
    ],
    requiresHumanReview: true,
    matchedRuleId: null,
    matchedRuleVersion: null,
    matchedBy: "NONE",
    matchScore: 0,
    matchReason:
      "Clasificación auxiliar de IA posterior a un NO_MATCH local; no equivale a una regla fiscal.",
    officialSources,
    evaluationOrigin: "AI_FALLBACK",
    aiFallback: {
      status: "PROPOSED",
      trigger: request.trigger!,
      promptVersion: providerResponse.promptVersion,
      modelId: providerResponse.modelId,
      suppliedSourceIds: canonicalSuppliedIds,
      citedSourceIds: citedIds,
      sourceVerificationStatus: "VERIFIED",
      validatorErrorCodes: [],
      durationMs: providerResponse.metrics.durationMs,
      ...safeMetrics(providerResponse.metrics),
      confidenceBand: proposal.confidenceBand,
      humanReviewRequired: true,
      proposalSummary: proposal.summary,
      classification: proposal.classification,
      missingLegalContext: proposal.missingInformation,
      taxProposals: [proposal.directTax, proposal.indirectTax],
    },
  };
  return assertEvaluationResult(result, request.input);
}
