import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchRateLimitAbuse } from "@/lib/admin/abuse-server";
import { adminEmailsFromEnv } from "@/lib/admin/access";
import { buildAdminAbuseSummary } from "@/lib/admin/health";
import { sendEmail } from "@/lib/email/send";
import { buildSecurityAlertEmail } from "@/lib/email/templates/security-alert";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALERT_FRESHNESS_MS = 45 * 60_000;
const ALERT_DEDUPLICATION_MS = 6 * 60 * 60_000;

function secureEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return noStoreJson({ error: "Alerta programada no configurada" }, 503);
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!secureEqual(authorization, `Bearer ${cronSecret}`)) {
    return noStoreJson({ error: "No autorizado" }, 401);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return noStoreJson({ error: "Servidor admin no disponible" }, 503);
  }

  const rawAbuse = await fetchRateLimitAbuse(admin);
  const abuse = buildAdminAbuseSummary(rawAbuse);
  const latestAt = abuse.latestAt ? new Date(abuse.latestAt).getTime() : 0;
  const recent =
    Number.isFinite(latestAt) &&
    latestAt > 0 &&
    Date.now() - latestAt <= ALERT_FRESHNESS_MS;

  if (abuse.level !== "action" || !recent) {
    return noStoreJson({
      ok: true,
      alertSent: false,
      level: abuse.level,
      reason: recent ? "below_threshold" : "no_recent_signal",
    });
  }

  const deduplication = await checkRateLimit(
    request,
    {
      namespace: "security_health_alert",
      limit: 1,
      windowMs: ALERT_DEDUPLICATION_MS,
    },
    "admin-security-alert",
  );
  if (!deduplication.allowed) {
    return noStoreJson({
      ok: true,
      alertSent: false,
      level: abuse.level,
      reason: "deduplicated",
    });
  }

  const recipients = adminEmailsFromEnv();
  if (recipients.length === 0) {
    return noStoreJson({ error: "ADMIN_EMAILS no configurado" }, 503);
  }

  const email = buildSecurityAlertEmail(abuse);
  const results = await Promise.all(
    recipients.map((to) => sendEmail({ to, ...email })),
  );
  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    console.error("security_alert_email_failed", {
      failureCount: failures.length,
      recipientCount: recipients.length,
    });
    return noStoreJson({ error: "No se pudo enviar la alerta" }, 502);
  }

  return noStoreJson({
    ok: true,
    alertSent: true,
    level: abuse.level,
    recipientCount: recipients.length,
  });
}
