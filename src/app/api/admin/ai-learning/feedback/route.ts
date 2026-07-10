import { NextResponse } from "next/server";
import {
  aiLearningAccountForEmail,
  buildExpenseScanLearningEvent,
  type ExpenseScanLearningFeedbackInput,
} from "@/lib/ai-learning";
import { persistAiLearningEvent } from "@/lib/ai-learning-store";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const learning = aiLearningAccountForEmail(user.email);
  if (!learning.allowed) {
    return NextResponse.json({ error: "Cuenta no autorizada" }, { status: 403 });
  }
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
