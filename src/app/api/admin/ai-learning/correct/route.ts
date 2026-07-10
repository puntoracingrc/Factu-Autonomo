import { NextResponse } from "next/server";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  correctExpenseScanPayloadWithInstruction,
  isExpenseScanCorrectionConfigured,
  normalizeExpenseScanCorrectionInput,
} from "@/lib/expense-scan/correction";
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

  if (!aiLearningAccountForEmail(user.email).allowed) {
    return NextResponse.json({ error: "Cuenta no autorizada" }, { status: 403 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_ai_learning_correct",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const bodyResult = await readJsonBody(request, {
    maxBytes: 512 * 1024,
    invalidMessage: "La corrección no es válida.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const input = normalizeExpenseScanCorrectionInput(bodyResult.data);
  if (!input) {
    return NextResponse.json(
      { error: "Falta la lectura original o la instrucción de corrección." },
      { status: 400 },
    );
  }

  if (!isExpenseScanCorrectionConfigured()) {
    return NextResponse.json(
      { error: "Corrección IA no configurada en el servidor." },
      { status: 503 },
    );
  }

  const result = await correctExpenseScanPayloadWithInstruction(input);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ data: result.data });
}
