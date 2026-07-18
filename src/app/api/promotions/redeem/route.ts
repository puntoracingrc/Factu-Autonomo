import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  normalizePromoCode,
  promoRedeemMessage,
  type PromoRedeemStatus,
} from "@/lib/promotions/contracts";
import {
  promotionJsonResponse,
  withPromotionPrivateHeaders,
} from "@/lib/promotions/private-response";
import { PromotionRepositoryError, redeemPromoCode } from "@/lib/promotions/repository";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SUCCESS_STATUSES = new Set<PromoRedeemStatus>(["applied"]);

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return promotionJsonResponse({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "promotions_redeem", limit: 10, windowMs: 60 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) {
    return withPromotionPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const bodyResult = await readJsonBody<{ code?: unknown }>(request, {
    maxBytes: 4 * 1024,
    invalidMessage: "Código no válido.",
  });
  if (!bodyResult.ok) return withPromotionPrivateHeaders(bodyResult.response);
  const code = normalizePromoCode(bodyResult.data.code);
  if (!code) {
    return promotionJsonResponse({ error: "Introduce un código válido." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return promotionJsonResponse(
      { error: "El canje no está disponible en este momento." },
      { status: 503 },
    );
  }
  try {
    const result = await redeemPromoCode(admin, { userId: user.id, code });
    const ok = SUCCESS_STATUSES.has(result.status);
    return promotionJsonResponse(
      {
        ok,
        status: result.status,
        message: promoRedeemMessage(result.status),
        campaignName: result.campaignName,
        benefit: result.benefit,
        benefitEndsAt: result.benefitEndsAt,
      },
      { status: ok ? 200 : 400 },
    );
  } catch (error) {
    if (error instanceof PromotionRepositoryError) {
      console.error("Promotion redemption failed", {
        operation: error.operation,
        databaseCode: error.databaseCode,
      });
    }
    return promotionJsonResponse(
      { error: "No se pudo aplicar el código. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
