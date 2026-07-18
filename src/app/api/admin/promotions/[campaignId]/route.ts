import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PromoCampaignStatus } from "@/lib/promotions/contracts";
import {
  promotionJsonResponse,
  withPromotionPrivateHeaders,
} from "@/lib/promotions/private-response";
import {
  PromotionRepositoryError,
  setPromoCampaignStatus,
} from "@/lib/promotions/repository";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

type RouteParams = { params: Promise<{ campaignId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPromotionPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_promotions_update", limit: 60, windowMs: 60 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPromotionPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const { campaignId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(campaignId)) {
    return promotionJsonResponse({ error: "Promoción no válida." }, { status: 400 });
  }
  const bodyResult = await readJsonBody<{ status?: unknown }>(request, {
    maxBytes: 2 * 1024,
    invalidMessage: "Cambio de estado no válido.",
  });
  if (!bodyResult.ok) return withPromotionPrivateHeaders(bodyResult.response);
  const status: PromoCampaignStatus | null =
    bodyResult.data.status === "active" || bodyResult.data.status === "paused"
      ? bodyResult.data.status
      : null;
  if (!status) {
    return promotionJsonResponse({ error: "Estado no válido." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return promotionJsonResponse(
      { error: "La base de datos de promociones no está disponible." },
      { status: 503 },
    );
  }
  try {
    return promotionJsonResponse({
      ok: true,
      campaign: await setPromoCampaignStatus(admin, campaignId, status),
    });
  } catch (error) {
    if (error instanceof PromotionRepositoryError) {
      console.error("Promotion status update failed", {
        operation: error.operation,
        databaseCode: error.databaseCode,
      });
    }
    return promotionJsonResponse(
      { error: "No se pudo cambiar el estado de la promoción." },
      { status: 500 },
    );
  }
}
