import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  activeSupportRecoveryGrants,
  normalizeSupportRecoveryGrant,
  type SupportRecoveryGrantRow,
} from "@/lib/admin/recovery-tools";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "support_recovery_tools",
      limit: 120,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Soporte no disponible" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const now = new Date();
  const { data, error } = await admin
    .from("admin_user_recovery_grants")
    .select(
      "id,user_id,tool_id,granted_by,granted_at,expires_at,reason,revoked_at,revoked_by,revocation_reason",
    )
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .gt("expires_at", now.toISOString())
    .order("granted_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo comprobar el acceso de soporte" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const grants = ((data ?? []) as SupportRecoveryGrantRow[])
    .map(normalizeSupportRecoveryGrant)
    .filter((grant) => grant !== null);

  const activeGrants = activeSupportRecoveryGrants(grants, now.getTime());
  return NextResponse.json(
    {
      grants: activeGrants.map(({ id, toolId, grantedAt, expiresAt }) => ({
        id,
        toolId,
        grantedAt,
        expiresAt,
      })),
    },
    { headers: NO_STORE_HEADERS },
  );
}
