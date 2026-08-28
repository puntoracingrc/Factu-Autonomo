import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin/access";
import { aiLearningAccountForEmail } from "@/lib/ai-learning";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";

export interface AdminMfaAccess {
  required: true;
  satisfied: boolean;
  currentLevel: "aal1" | "aal2";
}

export type AdminAccessResult =
  | { ok: true; user: User; mfa: AdminMfaAccess }
  | { ok: false; response: NextResponse };

export type AdminAiLearningAccessResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

function noStoreJson(
  body: Record<string, unknown>,
  init: { status: number; headers?: Record<string, string> },
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}

function mfaAccess(aal: "aal1" | "aal2"): AdminMfaAccess {
  return {
    required: true,
    satisfied: aal === "aal2",
    currentLevel: aal,
  };
}

function mfaRequiredResponse(aal: "aal1" | "aal2") {
  const adminMfa = mfaAccess(aal);
  return noStoreJson(
    {
      code: "admin_mfa_required",
      error: "Verificación en dos pasos requerida para acceder a Admin.",
      adminMfa,
    },
    {
      status: 403,
      headers: { "X-Admin-MFA-Required": "1" },
    },
  );
}

async function verifiedSession(request: Request) {
  return getUserSessionFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
}

export async function getAdminAccessFromRequest(
  request: Request,
): Promise<AdminAccessResult> {
  const session = await verifiedSession(request);
  if (!session) {
    return {
      ok: false,
      response: noStoreJson({ error: "No autorizado" }, { status: 401 }),
    };
  }

  if (!isAdminUser(session.user)) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "Solo administradores" },
        { status: 403 },
      ),
    };
  }

  if (session.aal !== "aal2") {
    return { ok: false, response: mfaRequiredResponse(session.aal) };
  }

  return { ok: true, user: session.user, mfa: mfaAccess(session.aal) };
}

export async function getAdminAiLearningAccessFromRequest(
  request: Request,
): Promise<AdminAiLearningAccessResult> {
  const session = await verifiedSession(request);
  if (!session) {
    return {
      ok: false,
      response: noStoreJson({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const adminAllowed = isAdminUser(session.user);
  const learningAllowed = aiLearningAccountForEmail(session.user.email).allowed;
  if (!adminAllowed && !learningAllowed) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "Cuenta no autorizada" },
        { status: 403 },
      ),
    };
  }

  if (session.aal !== "aal2") {
    return { ok: false, response: mfaRequiredResponse(session.aal) };
  }

  return { ok: true, user: session.user };
}
