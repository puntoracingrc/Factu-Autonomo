import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import {
  APP_ERROR_RECOVERY_CODES,
  normalizeAppErrorRecoveryKind,
} from "@/lib/monitoring/recovery-events";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_RECOVERY_BODY_BYTES = 512;

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Vary: "Authorization, X-Factu-Device-Token",
} as const;

function markPrivate<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return markPrivate(NextResponse.json(body, init));
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "monitoring_recovery",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return markPrivate(rateLimitExceededResponse(rateLimit));
  }

  const deviceToken = normalizeCloudDeviceToken(
    request.headers.get("x-factu-device-token"),
  );
  if (!deviceToken) {
    return privateJson({ error: "Confirmación no válida." }, { status: 400 });
  }

  const body = await readJsonBody(request, {
    maxBytes: MAX_RECOVERY_BODY_BYTES,
    invalidMessage: "Confirmación no válida.",
    tooLargeMessage: "Confirmación demasiado grande.",
  });
  if (!body.ok) return markPrivate(body.response);

  const kind = normalizeAppErrorRecoveryKind(body.data);
  if (!kind) {
    return privateJson({ error: "Confirmación no válida." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return privateJson({ ok: false }, { status: 503 });
  }

  const resolvedAt = new Date().toISOString();
  const deviceScopeHash = hashCloudDeviceToken(deviceToken);
  const update = await admin
    .from("app_error_events")
    .update({
      resolved_at: resolvedAt,
      resolution_source: kind,
    })
    .eq("user_id", user.id)
    .eq("area", "sync")
    .in("code", [...APP_ERROR_RECOVERY_CODES[kind]])
    .or(
      `device_scope_hash.eq.${deviceScopeHash},device_scope_hash.is.null`,
    )
    .is("resolved_at", null);

  if (update.error) {
    return privateJson({ ok: false }, { status: 503 });
  }

  return privateJson({ ok: true });
}
