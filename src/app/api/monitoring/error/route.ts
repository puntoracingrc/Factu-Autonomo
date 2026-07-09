import { NextResponse } from "next/server";
import { normalizeErrorEventInput, type AppErrorEventInput } from "@/lib/monitoring/error-events";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_ERROR_EVENT_BODY_BYTES = 16 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(
    request,
    {
      namespace: "monitoring_error",
      limit: 30,
      windowMs: 5 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).length > MAX_ERROR_EVENT_BODY_BYTES) {
    return NextResponse.json({ error: "Evento demasiado grande" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!isRecord(parsed)) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const input = normalizeErrorEventInput(parsed as unknown as AppErrorEventInput);
  const { error } = await admin.from("app_error_events").insert({
    user_id: user.id,
    severity: input.severity,
    area: input.area,
    code: input.code,
    message: input.message,
    route: input.route,
    user_agent: input.userAgent,
    metadata: input.metadata,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
