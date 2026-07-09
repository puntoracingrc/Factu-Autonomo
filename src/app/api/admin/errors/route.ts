import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function isMissingErrorEventsTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /app_error_events/i.test(error.message ?? "") &&
      /schema cache|does not exist|not find/i.test(error.message ?? "")
  );
}

export async function GET(request: Request) {
  const requester = await getUserFromBearer(request.headers.get("authorization"));
  if (!requester) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminUser(requester)) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  const rateLimit = checkRateLimit(
    request,
    {
      namespace: "admin_errors",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    requester.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? 50)));

  const { data, error } = await admin
    .from("app_error_events")
    .select("id,user_id,severity,area,code,message,route,created_at,resolved_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingErrorEventsTable(error)) {
      return NextResponse.json({
        errors: [],
        monitoringAvailable: false,
        message:
          "El registro de errores todavía no está activado en la base de datos.",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ errors: data ?? [], monitoringAvailable: true });
}
