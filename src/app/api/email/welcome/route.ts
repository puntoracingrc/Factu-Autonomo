import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email/config";
import { sendWelcomeEmailForUser } from "@/lib/email/welcome";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "email_welcome",
    limit: 12,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, skipped: true, error: "Email no configurado" },
      { status: 503 },
    );
  }

  const bodyResult = await readJsonBody<{
    userId?: string;
    email?: string;
  }>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "JSON inválido",
    tooLargeMessage: "La petición de bienvenida es demasiado grande.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  const userId = body.userId?.trim();
  const email = body.email?.trim();

  if (!userId || !email) {
    return NextResponse.json(
      { error: "userId y email son obligatorios" },
      { status: 400 },
    );
  }

  const result = await sendWelcomeEmailForUser({
    userId,
    email,
  });

  if (!result.ok && !result.skipped) {
    return NextResponse.json(
      { ok: false, skipped: false, error: "Email de bienvenida pendiente" },
      { status: 202 },
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped ?? false,
  });
}
