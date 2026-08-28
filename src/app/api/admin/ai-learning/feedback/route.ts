import { NextResponse } from "next/server";
import {
  buildExpenseScanLearningEvent,
  type ExpenseScanLearningFeedbackInput,
} from "@/lib/ai-learning";
import { getAdminAiLearningAccessFromRequest } from "@/lib/admin/server-access";
import { persistAiLearningEvent } from "@/lib/ai-learning-store";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export async function POST(request: Request) {
  const access = await getAdminAiLearningAccessFromRequest(request);
  if (!access.ok) return access.response;
  const { user } = access;
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_ai_learning_feedback",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const bodyResult = await readJsonBody<ExpenseScanLearningFeedbackInput>(request, {
    maxBytes: 512 * 1024,
    invalidMessage: "El aprendizaje no es válido.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const event = buildExpenseScanLearningEvent(bodyResult.data, {
    userId: user.id,
    email: user.email,
  });
  if (!event) {
    return NextResponse.json(
      { error: "Falta lectura original o corregida válida." },
      { status: 400 },
    );
  }

  const saved = await persistAiLearningEvent(event);
  return NextResponse.json({ ok: true, saved });
}
