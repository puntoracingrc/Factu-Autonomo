import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { getPartnerSupabaseAdmin } from "@/lib/partners/admin-client";
import {
  grantPartnerAccess,
  listAdminPartners,
  PartnerRepositoryError,
  PartnerSchemaUnavailableError,
} from "@/lib/partners/repository";
import { normalizePartnerEmail } from "@/lib/partners/contracts";
import {
  partnerJsonResponse,
  withPartnerPrivateHeaders,
} from "@/lib/partners/private-response";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

function unavailableResponse() {
  return partnerJsonResponse(
    { error: "La base de datos del programa Partners no está disponible." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPartnerPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_partners_list", limit: 120, windowMs: 10 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPartnerPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const admin = getPartnerSupabaseAdmin();
  if (!admin) return unavailableResponse();

  try {
    return partnerJsonResponse({
      partners: await listAdminPartners(admin),
      schemaReady: true,
    });
  } catch (error) {
    if (error instanceof PartnerSchemaUnavailableError) {
      return partnerJsonResponse({ partners: [], schemaReady: false });
    }
    if (error instanceof PartnerRepositoryError) {
      console.error("Partner admin list query failed", {
        operation: error.operation,
        databaseCode: error.databaseCode,
      });
    }
    return partnerJsonResponse(
      { error: "No se pudieron cargar los partners." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPartnerPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_partners_grant", limit: 30, windowMs: 60 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPartnerPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const admin = getPartnerSupabaseAdmin();
  if (!admin) return unavailableResponse();

  const bodyResult = await readJsonBody<{ email?: unknown }>(request, {
    maxBytes: 4 * 1024,
    invalidMessage: "Petición de acceso Partner no válida.",
  });
  if (!bodyResult.ok) return withPartnerPrivateHeaders(bodyResult.response);
  const email = normalizePartnerEmail(bodyResult.data.email);
  if (!email) {
    return partnerJsonResponse(
      { error: "Introduce un email válido." },
      { status: 400 },
    );
  }

  try {
    const partner = await grantPartnerAccess(admin, {
      email,
      actorUserId: access.user.id,
    });
    return partnerJsonResponse({ ok: true, partner }, { status: 201 });
  } catch (error) {
    if (error instanceof PartnerSchemaUnavailableError) return unavailableResponse();
    return partnerJsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo conceder el acceso Partner.",
      },
      { status: 400 },
    );
  }
}
