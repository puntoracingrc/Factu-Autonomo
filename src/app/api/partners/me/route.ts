import {
  buildPartnerDashboard,
  PartnerSchemaUnavailableError,
  updatePartnerPayoutProfile,
} from "@/lib/partners/repository";
import { getPartnerAccessFromRequest } from "@/lib/partners/server-access";
import { validatePartnerPayoutInput } from "@/lib/partners/contracts";
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
    { error: "El programa Partners no está disponible." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const access = await getPartnerAccessFromRequest(request);
  if (!access.ok) return withPartnerPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "partners_me", limit: 120, windowMs: 10 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPartnerPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }

  try {
    const dashboard = await buildPartnerDashboard(access.admin, {
      role: access.role,
      account: access.account,
      origin: new URL(request.url).origin,
    });
    return partnerJsonResponse({ dashboard });
  } catch (error) {
    if (error instanceof PartnerSchemaUnavailableError) return unavailableResponse();
    return partnerJsonResponse(
      { error: "No se pudo cargar el Área Partners." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const access = await getPartnerAccessFromRequest(request);
  if (!access.ok) return withPartnerPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "partners_payout_profile", limit: 20, windowMs: 60 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPartnerPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  if (!access.account) {
    return partnerJsonResponse(
      { error: "Esta cuenta administradora no tiene un perfil Partner propio." },
      { status: 400 },
    );
  }

  const bodyResult = await readJsonBody<{ holderName?: unknown; iban?: unknown }>(
    request,
    { maxBytes: 4 * 1024, invalidMessage: "Datos de cobro no válidos." },
  );
  if (!bodyResult.ok) return withPartnerPrivateHeaders(bodyResult.response);
  const validation = validatePartnerPayoutInput(bodyResult.data);
  if (!validation.ok) {
    return partnerJsonResponse(
      { error: validation.error, field: validation.field },
      { status: 400 },
    );
  }

  try {
    const account = await updatePartnerPayoutProfile(access.admin, {
      userId: access.account.user_id,
      holderName: validation.holderName,
      iban: validation.iban,
    });
    return partnerJsonResponse({ ok: true, account });
  } catch (error) {
    if (error instanceof PartnerSchemaUnavailableError) return unavailableResponse();
    return partnerJsonResponse(
      { error: "No se pudieron guardar los datos de cobro." },
      { status: 500 },
    );
  }
}
