import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin/access";
import { getUserFromBearer } from "@/lib/billing/server-auth";

export interface AdminMfaAccess {
  required: boolean;
  satisfied: boolean;
  currentLevel: string | null;
}

export type AdminAccessResult =
  | { ok: true; user: User; mfa: AdminMfaAccess }
  | { ok: false; response: NextResponse };

function truthyEnv(value: string | undefined): boolean {
  return ["1", "true", "yes", "on", "required", "enforce"].includes(
    (value ?? "").trim().toLowerCase(),
  );
}

export function isAdminMfaRequired(
  value = process.env.ADMIN_MFA_REQUIRED,
): boolean {
  return truthyEnv(value);
}

function bearerTokenFromAuthorization(authorization: string | null): string | null {
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + (4 - (value.length % 4)) % 4, "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64")
    .toString("utf8");
}

function jwtPayload(authorization: string | null): Record<string, unknown> | null {
  const token = bearerTokenFromAuthorization(authorization);
  if (!token) return null;
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function adminMfaAccessFromAuthorization(
  authorization: string | null,
): AdminMfaAccess {
  const payload = jwtPayload(authorization);
  const currentLevel =
    typeof payload?.aal === "string" ? payload.aal : null;

  return {
    required: isAdminMfaRequired(),
    satisfied: currentLevel === "aal2",
    currentLevel,
  };
}

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

  const mfa = adminMfaAccessFromAuthorization(authorization);
  if (mfa.required && !mfa.satisfied) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: "admin_mfa_required",
          error: "Verificacion en dos pasos requerida para admin.",
          mfa,
        },
        {
          status: 403,
          headers: { "X-Admin-MFA-Required": "1" },
        },
      ),
    };
  }

  return { ok: true, user, mfa };
}
