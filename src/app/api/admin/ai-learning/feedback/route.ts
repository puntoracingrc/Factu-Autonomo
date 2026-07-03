import { NextResponse } from "next/server";
import {
  aiLearningAccountForEmail,
  buildExpenseScanLearningEvent,
} from "@/lib/ai-learning";
import { persistAiLearningEvent } from "@/lib/ai-learning-store";
import { getUserFromBearer } from "@/lib/billing/server-auth";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const learning = aiLearningAccountForEmail(user.email);
  if (!learning.allowed) {
    return NextResponse.json({ error: "Cuenta no autorizada" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const event = buildExpenseScanLearningEvent(body, {
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
