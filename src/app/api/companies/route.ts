import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  createCompanyForIdentity,
  createCompanyFromSourceForIdentity,
  listCompaniesForIdentity,
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

async function identity(request: Request) {
  return getUserSessionFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
}

export async function GET(request: Request) {
  const actor = await identity(request);
  if (!actor) return privateJson({ error: "No autorizado" }, { status: 401 });
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "companies_list", limit: 120, windowMs: 10 * 60_000 },
    actor.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  try {
    return privateJson({ companies: await listCompaniesForIdentity(actor) });
  } catch {
    return privateJson(
      { error: "No se pudieron cargar las empresas de esta cuenta." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const actor = await identity(request);
  if (!actor) return privateJson({ error: "No autorizado" }, { status: 401 });
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "companies_create", limit: 10, windowMs: 60 * 60_000 },
    actor.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);
  const body = await readJsonBody<{
    name?: unknown;
    sourceCompanyId?: unknown;
    sourceProfile?: unknown;
  }>(request, {
    maxBytes: 2 * 1_024 * 1_024,
    invalidMessage: "Datos de empresa no válidos",
  });
  if (!body.ok) return body.response;
  if (typeof body.data.name !== "string") {
    return privateJson(
      { error: "Escribe el nombre de la empresa." },
      { status: 400 },
    );
  }
  try {
    if (body.data.sourceCompanyId !== undefined) {
      if (typeof body.data.sourceCompanyId !== "string") {
        return privateJson(
          { error: "La empresa de origen no es válida." },
          { status: 400 },
        );
      }
      const result = await createCompanyFromSourceForIdentity(
        actor,
        body.data.name,
        body.data.sourceCompanyId,
        body.data.sourceProfile,
      );
      return privateJson(result, { status: 201 });
    }
    const company = await createCompanyForIdentity(actor, body.data.name);
    return privateJson({ company, copied: null }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return privateJson(
      {
        error:
          code === "INVALID_COMPANY_NAME"
            ? "El nombre de la empresa no es válido."
            : code === "INVALID_COMPANY_COPY"
              ? "No se pudieron preparar los datos reutilizables."
              : code === "SOURCE_COMPANY_ACCESS_DENIED"
                ? "Ya no tienes acceso a la empresa de origen."
                : "No se pudo crear la empresa.",
      },
      { status: code === "SOURCE_COMPANY_ACCESS_DENIED" ? 403 : 400 },
    );
  }
}
