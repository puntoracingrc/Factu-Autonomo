import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";

export type AdminAccessResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function getAdminAccessFromRequest(
  request: Request,
): Promise<AdminAccessResult> {
  const authorization = request.headers.get("authorization");
  const user = await getUserFromBearer(authorization);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  if (!isAdminUser(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Solo administradores" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}
