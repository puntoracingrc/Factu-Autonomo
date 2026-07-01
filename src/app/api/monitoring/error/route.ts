import { NextResponse } from "next/server";
import { normalizeErrorEventInput, type AppErrorEventInput } from "@/lib/monitoring/error-events";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  const input = normalizeErrorEventInput((await request.json()) as AppErrorEventInput);
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

