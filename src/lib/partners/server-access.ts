import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePartnerEmail, type PartnerAccessRole } from "./contracts";
import {
  getPartnerAccountRecord,
  PartnerSchemaUnavailableError,
  type PartnerAccountRecord,
} from "./repository";

export type PartnerAccessResult =
  | {
      ok: true;
      user: User;
      admin: SupabaseClient;
      role: PartnerAccessRole;
      account: PartnerAccountRecord | null;
    }
  | { ok: false; response: NextResponse };

export async function getPartnerAccessFromRequest(
  request: Request,
): Promise<PartnerAccessResult> {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "El programa Partners no está disponible." },
        { status: 503 },
      ),
    };
  }

  let account: PartnerAccountRecord | null = null;
  const administrator = isAdminEmail(user.email);
  try {
    account = await getPartnerAccountRecord(admin, user.id);
  } catch (error) {
    if (!administrator || !(error instanceof PartnerSchemaUnavailableError)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "El programa Partners no está disponible." },
          { status: 503 },
        ),
      };
    }
  }

  if (administrator) {
    return { ok: true, user, admin, role: "admin", account };
  }

  const sessionEmail = normalizePartnerEmail(user.email);
  if (
    !account ||
    account.status !== "active" ||
    !sessionEmail ||
    normalizePartnerEmail(account.email) !== sessionEmail
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Esta cuenta no tiene acceso al Área Partners." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user, admin, role: "partner", account };
}
