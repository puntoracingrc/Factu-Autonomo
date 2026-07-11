import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import {
  paymentReminderRecipientRateLimitSubject,
  resolvePaymentReminderRecords,
} from "@/lib/email/payment-reminder-records";
import { parsePaymentReminderRequest } from "@/lib/email/payment-reminder-request";
import {
  sendPaymentReminderEmail,
  validatePaymentReminderInput,
} from "@/lib/email/send-payment-reminder";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export const runtime = "nodejs";

function privateResponse<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Authorization");
  return response;
}

function privateJson(body: unknown, init?: ResponseInit) {
  return privateResponse(NextResponse.json(body, init));
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson(
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
  if (!rateLimit.allowed) {
    return privateResponse(rateLimitExceededResponse(rateLimit));
  }

  const bodyResult = await readJsonBody(request, {
    maxBytes: 24 * 1024,
    invalidMessage: "JSON inválido",
    tooLargeMessage: "La solicitud es demasiado grande.",
  });
  if (!bodyResult.ok) return privateResponse(bodyResult.response);
  const parsedBody = parsePaymentReminderRequest(bodyResult.data);
  if (!parsedBody.ok) {
    return privateJson({ ok: false, error: parsedBody.error }, { status: 400 });
  }

  if (!isEmailConfigured()) {
    return privateJson(
      { ok: false, skipped: true, error: "Email no configurado" },
      { status: 503 },
    );
  }

  const records = await resolvePaymentReminderRecords(
    user.id,
    parsedBody.value.documentId,
  );
  if (!records.ok) {
    if (records.reason === "unavailable") {
      return privateJson(
        {
          ok: false,
          skipped: true,
          error: "El envío por email no está disponible en el servidor.",
        },
        { status: 503 },
      );
    }
    if (records.reason === "not_found") {
      // Missing and foreign IDs are intentionally indistinguishable. `skipped`
      // only permits a local mailto/native fallback; this route never calls Resend.
      return privateJson(
        {
          ok: false,
          skipped: true,
          error: "No se encontró la factura sincronizada.",
        },
        { status: 404 },
      );
    }
    return privateJson(
      {
        ok: false,
        error: "Los datos sincronizados de la factura no son válidos.",
      },
      { status: 422 },
    );
  }

  const reminderInput = {
    doc: records.doc,
    profile: records.profile,
    message: parsedBody.value.message,
    replyTo: user.email,
  };
  const validationError = validatePaymentReminderInput(reminderInput);
  if (validationError) {
    return privateJson(
      { ok: false, error: validationError },
      { status: 400 },
    );
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
    return privateResponse(
      rateLimitExceededResponse(
        dailyRateLimit,
        "Has alcanzado el máximo diario de recordatorios. Prueba de nuevo mañana.",
      ),
    );
  }

  const recipientRateLimitSubject = paymentReminderRecipientRateLimitSubject(
    records.doc.client.email!,
  );
  if (recipientRateLimitSubject) {
    const recipientRateLimit = await checkRateLimit(
      request,
      {
        namespace: "email_payment_reminder_recipient",
        limit: 10,
        windowMs: 24 * 60 * 60_000,
      },
      recipientRateLimitSubject,
    );
    if (!recipientRateLimit.allowed) {
      return privateResponse(
        rateLimitExceededResponse(
          recipientRateLimit,
          "Ya se han enviado demasiados recordatorios a este destinatario hoy.",
        ),
      );
    }
  }

  const result = await sendPaymentReminderEmail(reminderInput);

  if (result.skipped) {
    return privateJson(
      { ok: false, skipped: true, error: result.error },
      { status: 503 },
    );
  }

  if (!result.ok) {
    return privateJson(
      { ok: false, error: result.error ?? "No se pudo enviar" },
      { status: 400 },
    );
  }

  return privateJson({ ok: true, emailId: result.emailId });
}
