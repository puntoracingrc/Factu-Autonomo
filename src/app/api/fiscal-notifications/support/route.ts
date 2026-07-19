import { NextResponse } from "next/server";
import { EMAIL_CONFIRMATION_REQUIRED_MESSAGE } from "@/lib/auth/email-confirmation";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { isEmailConfigured } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import {
  FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1,
  formatFiscalNotificationSupportReportTextV1,
  parseFiscalNotificationSupportReportV1,
} from "@/lib/fiscal-notifications/support-report.v1";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  return response;
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
      namespace: "fiscal_notification_support",
      limit: 8,
      windowMs: 60 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    const response = rateLimitExceededResponse(
      rateLimit,
      "Has enviado demasiados casos. Prueba de nuevo más tarde.",
    );
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Vary", "Authorization");
    return response;
  }

  const body = await readJsonBody(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "Caso de soporte no válido.",
    tooLargeMessage: "El caso de soporte es demasiado grande.",
  });
  if (!body.ok) {
    body.response.headers.set("Cache-Control", "private, no-store, max-age=0");
    body.response.headers.set("Vary", "Authorization");
    return body.response;
  }
  const report = parseFiscalNotificationSupportReportV1(body.data);
  if (!report) {
    return privateJson(
      { ok: false, error: "Caso de soporte no válido." },
      { status: 400 },
    );
  }
  const text = formatFiscalNotificationSupportReportTextV1(report);
  const result = isEmailConfigured()
    ? await sendEmail({
        to: FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1,
        subject: `Caso lector AEAT · ${report.caseId}`,
        text,
        html: `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        idempotencyKey: `fiscal-notification-support-v1/${user.id}/${report.caseId}`,
      })
    : {
        ok: false as const,
        skipped: true,
        failureKind: "known" as const,
        retryable: false,
      };
  const recorded = await recordSupportCase({
    userId: user.id,
    report,
    emailDelivered: result.ok,
    emailStatus: "status" in result ? result.status : undefined,
    providerCode: "providerCode" in result ? result.providerCode : undefined,
  });
  if (!result.ok && !recorded) {
    return privateJson(
      { ok: false, error: "No se pudo enviar el caso. Inténtalo de nuevo." },
      { status: result.retryable ? 503 : 502 },
    );
  }
  return privateJson(
    {
      ok: true,
      caseId: report.caseId,
      delivery: result.ok ? "EMAIL" : "ADMIN_LOG",
    },
    { status: result.ok ? 200 : 202 },
  );
}

async function recordSupportCase(input: {
  userId: string;
  report: NonNullable<
    ReturnType<typeof parseFiscalNotificationSupportReportV1>
  >;
  emailDelivered: boolean;
  emailStatus?: number;
  providerCode?: string;
}): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return false;
    const { error } = await admin.from("app_error_events").insert({
      user_id: input.userId,
      severity: input.emailDelivered ? "warning" : "error",
      area: "fiscal_notifications_support",
      code: input.emailDelivered
        ? "support_case_sent"
        : "support_case_email_fallback",
      message: `Caso saneado recibido · ${input.report.caseId} · ${input.report.stage} · ${input.report.status}`,
      route: input.report.route,
      user_agent: null,
      metadata: {
        caseId: input.report.caseId,
        stage: input.report.stage,
        status: input.report.status,
        persistenceState: input.report.persistenceState ?? null,
        pageCount: input.report.pageCount ?? null,
        fileByteLength: input.report.fileByteLength ?? null,
        emailDelivered: input.emailDelivered,
        emailStatus: input.emailStatus ?? null,
        providerCode: input.providerCode ?? null,
      },
    });
    return !error;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
