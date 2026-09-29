import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  getCompanyAccessOverview,
  inviteCompanyAdmin,
  revokeCompanyAdmin,
  revokeCompanyInvitation,
} from "@/lib/companies/server";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export const dynamic = "force-dynamic";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization");
  return response;
}

async function authenticated(request: Request) {
  return getUserSessionFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const identity = await authenticated(request);
  if (!identity)
    return privateJson({ error: "No autorizado" }, { status: 401 });
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "company_access_list", limit: 120, windowMs: 10 * 60_000 },
    identity.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  const { companyId } = await context.params;
  try {
    return privateJson(await getCompanyAccessOverview(identity, companyId));
  } catch {
    return privateJson(
      { error: "No se pudieron cargar los accesos." },
      { status: 403 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const identity = await authenticated(request);
  if (!identity)
    return privateJson({ error: "No autorizado" }, { status: 401 });
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "company_admin_invite", limit: 20, windowMs: 60 * 60_000 },
    identity.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  const body = await readJsonBody<{ email?: unknown }>(request, {
    maxBytes: 2_048,
    invalidMessage: "Invitación no válida",
  });
  if (!body.ok) return body.response;
  if (typeof body.data.email !== "string") {
    return privateJson(
      { error: "Escribe el correo de Google." },
      { status: 400 },
    );
  }
  const { companyId } = await context.params;
  try {
    const invitation = await inviteCompanyAdmin(
      identity,
      companyId,
      body.data.email,
    );
    return privateJson({ invitation }, { status: 201 });
  } catch (error) {
    return privateJson(
      {
        error:
          error instanceof Error &&
          error.message === "CANNOT_INVITE_CURRENT_ACCOUNT"
            ? "Esa es la cuenta con la que has iniciado sesión."
            : "No se pudo crear la invitación.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const identity = await authenticated(request);
  if (!identity)
    return privateJson({ error: "No autorizado" }, { status: 401 });
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "company_access_revoke", limit: 30, windowMs: 60 * 60_000 },
    identity.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  const body = await readJsonBody<{ kind?: unknown; id?: unknown }>(request, {
    maxBytes: 2_048,
    invalidMessage: "Acceso no válido",
  });
  if (!body.ok) return body.response;
  if (
    (body.data.kind !== "invitation" && body.data.kind !== "member") ||
    typeof body.data.id !== "string"
  ) {
    return privateJson({ error: "Acceso no válido." }, { status: 400 });
  }
  const { companyId } = await context.params;
  try {
    if (body.data.kind === "invitation") {
      await revokeCompanyInvitation(identity, companyId, body.data.id);
    } else {
      await revokeCompanyAdmin(identity, companyId, body.data.id);
    }
    return privateJson({ ok: true });
  } catch {
    return privateJson(
      { error: "No se pudo retirar el acceso." },
      { status: 403 },
    );
  }
}
