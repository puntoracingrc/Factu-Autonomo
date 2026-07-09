import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import {
  buildAdminHealthSnapshot,
  isMissingAdminHealthRpc,
} from "@/lib/admin/health";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const requester = await getUserFromBearer(request.headers.get("authorization"));
  if (!requester) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminUser(requester)) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { data, error } = await admin.rpc("admin_health_snapshot");
  if (error) {
    if (isMissingAdminHealthRpc(error)) {
      return NextResponse.json({
        health: null,
        monitoringAvailable: false,
        message:
          "El resumen de salud todavía no está activado en la base de datos.",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    health: buildAdminHealthSnapshot(data),
    monitoringAvailable: true,
  });
}
