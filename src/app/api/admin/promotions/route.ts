import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parsePromoCampaignInput } from "@/lib/promotions/contracts";
import {
  createPromoCampaign,
  listPromoCampaigns,
  PromotionRepositoryError,
} from "@/lib/promotions/repository";
import {
  promotionJsonResponse,
  withPromotionPrivateHeaders,
} from "@/lib/promotions/private-response";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

function unavailableResponse() {
  return promotionJsonResponse(
    { error: "La base de datos de promociones no está disponible." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPromotionPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_promotions_list", limit: 120, windowMs: 10 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPromotionPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const admin = getSupabaseAdmin();
  if (!admin) return unavailableResponse();
  try {
    return promotionJsonResponse({ campaigns: await listPromoCampaigns(admin) });
  } catch (error) {
    if (error instanceof PromotionRepositoryError) {
      console.error("Promotion list failed", {
        operation: error.operation,
        databaseCode: error.databaseCode,
      });
    }
    return promotionJsonResponse(
      { error: "No se pudieron cargar las promociones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPromotionPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_promotions_create", limit: 30, windowMs: 60 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPromotionPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const bodyResult = await readJsonBody<unknown>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: "Promoción no válida.",
  });
  if (!bodyResult.ok) return withPromotionPrivateHeaders(bodyResult.response);
  const input = parsePromoCampaignInput(bodyResult.data);
  if (!input) {
    return promotionJsonResponse(
      { error: "Revisa el nombre, beneficio, fechas y límite de usos." },
      { status: 400 },
    );
  }
  const admin = getSupabaseAdmin();
  if (!admin) return unavailableResponse();
  try {
    const created = await createPromoCampaign(admin, {
      actorUserId: access.user.id,
      ...input,
    });
    return promotionJsonResponse(
      {
        ok: true,
        campaign: created.campaign,
        code: created.code,
        codeShownOnce: true,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PromotionRepositoryError) {
      console.error("Promotion create failed", {
        operation: error.operation,
        databaseCode: error.databaseCode,
      });
    }
    return promotionJsonResponse(
      { error: "No se pudo crear la promoción." },
      { status: 500 },
    );
  }
}
