import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import { renameCompanyForIdentity } from "@/lib/companies/server";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const identity = await getUserSessionFromBearer(
    request.headers.get("authorization"),
    { requireEmailConfirmed: true },
  );
  if (!identity)
    return privateJson({ error: "No autorizado" }, { status: 401 });
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "company_rename", limit: 30, windowMs: 60 * 60_000 },
    identity.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  const body = await readJsonBody<{ name?: unknown }>(request, {
    maxBytes: 2_048,
    invalidMessage: "Datos de empresa no válidos",
  });
  if (!body.ok) return body.response;
  if (typeof body.data.name !== "string") {
    return privateJson(
      { error: "Escribe el nombre de la empresa." },
      { status: 400 },
    );
  }
  const { companyId } = await context.params;
  try {
    await renameCompanyForIdentity(identity, companyId, body.data.name);
    return privateJson({ ok: true });
  } catch {
    return privateJson(
      { error: "No se pudo actualizar el nombre de la empresa." },
      { status: 403 },
    );
  }
}
