import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { getPartnerSupabaseAdmin } from "@/lib/partners/admin-client";
import type { PartnerAccountStatus } from "@/lib/partners/contracts";
import {
  partnerJsonResponse,
  withPartnerPrivateHeaders,
} from "@/lib/partners/private-response";
import {
  PartnerSchemaUnavailableError,
  setPartnerAccountStatus,
} from "@/lib/partners/repository";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

type RouteParams = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPartnerPrivateHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_partners_update", limit: 60, windowMs: 60 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPartnerPrivateHeaders(rateLimitExceededResponse(rateLimit));
  }
  const admin = getPartnerSupabaseAdmin();
  if (!admin) {
    return partnerJsonResponse(
      { error: "La base de datos del programa Partners no está disponible." },
      { status: 503 },
    );
  }

  const { userId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  ) {
    return partnerJsonResponse(
      { error: "Usuario no válido." },
      { status: 400 },
    );
  }
  const bodyResult = await readJsonBody<{ status?: unknown }>(request, {
    maxBytes: 2 * 1024,
    invalidMessage: "Cambio de estado no válido.",
  });
  if (!bodyResult.ok) return withPartnerPrivateHeaders(bodyResult.response);
  const status: PartnerAccountStatus | null =
    bodyResult.data.status === "active" || bodyResult.data.status === "paused"
      ? bodyResult.data.status
      : null;
  if (!status) {
    return partnerJsonResponse({ error: "Estado no válido." }, { status: 400 });
  }

  try {
    const partner = await setPartnerAccountStatus(admin, { userId, status });
    return partnerJsonResponse({ ok: true, partner });
  } catch (error) {
    if (error instanceof PartnerSchemaUnavailableError) {
      return partnerJsonResponse(
        { error: "La base de datos del programa Partners no está disponible." },
        { status: 503 },
      );
    }
    return partnerJsonResponse(
      { error: "No se pudo cambiar el acceso Partner." },
      { status: 500 },
    );
  }
}
