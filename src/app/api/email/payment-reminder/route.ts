import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import {
  sendPaymentReminderEmail,
  validatePaymentReminderInput,
} from "@/lib/email/send-payment-reminder";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import type { BusinessProfile, Document } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: EMAIL_CONFIRMATION_REQUIRED_MESSAGE },
      { status: 401 },
    );
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "email_payment_reminder",
      limit: 20,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, skipped: true, error: "Email no configurado" },
      { status: 503 },
    );
  }

  const bodyResult = await readJsonBody<{
    doc?: Document;
    profile?: BusinessProfile;
    message?: string;
  }>(request, {
    maxBytes: 1024 * 1024,
    invalidMessage: "JSON inválido",
    tooLargeMessage: "La factura es demasiado grande para enviarla por email.",
  });
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.data;

  if (!body.doc || !body.profile) {
    return NextResponse.json(
      { error: "Faltan datos de la factura o del perfil" },
      { status: 400 },
    );
  }

  const reminderInput = {
    doc: body.doc,
    profile: body.profile,
    message: body.message ?? "",
    replyTo: user.email,
  };
  const validationError = validatePaymentReminderInput(reminderInput);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const dailyRateLimit = await checkRateLimit(
    request,
    {
      namespace: "email_payment_reminder_daily",
      limit: 50,
      windowMs: 24 * 60 * 60_000,
    },
    user.id,
  );
  if (!dailyRateLimit.allowed) {
    return rateLimitExceededResponse(
      dailyRateLimit,
      "Has alcanzado el máximo diario de recordatorios. Prueba de nuevo mañana.",
    );
  }

  const result = await sendPaymentReminderEmail(reminderInput);

  if (result.skipped) {
    return NextResponse.json(
      { ok: false, skipped: true, error: result.error },
      { status: 503 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "No se pudo enviar" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, emailId: result.emailId });
}
