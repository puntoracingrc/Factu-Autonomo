import { NextResponse } from "next/server";
import {
  getCompanyRouteAuthFromBearer,
  normalizeCompanyId,
} from "@/lib/companies/server";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { CLOUD_DEVICE_TOKEN_HEADER } from "@/lib/cloud/device-token";
import {
  ensureCloudDeviceAccess,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { ExpenseOriginalError } from "./storage";

export const ORIGINAL_PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Vary: `Authorization, ${FACTU_COMPANY_HEADER}, ${CLOUD_DEVICE_TOKEN_HEADER}`,
};
export function privateOriginalResponse(response: Response): Response {
  for (const [name, value] of Object.entries(ORIGINAL_PRIVATE_HEADERS))
    response.headers.set(name, value);
  return response;
}
export function originalJson(body: unknown, status = 200) {
  return privateOriginalResponse(NextResponse.json(body, { status }));
}
export function originalErrorResponse(error: unknown) {
  if (error instanceof ExpenseOriginalError)
    return originalJson(
      { error: error.message, code: error.code },
      error.status,
    );
  return originalJson(
    {
      error:
        "No se pudo completar la operación con el original. Conserva el archivo y reinténtalo.",
    },
    502,
  );
}
export async function originalRouteAuth(request: Request, writing = false) {
  const company = normalizeCompanyId(request.headers.get(FACTU_COMPANY_HEADER));
  const auth = company
    ? await getCompanyRouteAuthFromBearer(
        request.headers.get("authorization"),
        company,
      )
    : null;
  if (!auth)
    return {
      response: originalJson(
        {
          error:
            "Inicia sesión y selecciona la empresa para acceder al original.",
        },
        401,
      ),
    };
  const token = normalizeCloudDeviceToken(
    request.headers.get(CLOUD_DEVICE_TOKEN_HEADER),
  );
  if (!token)
    return {
      response: originalJson(
        {
          error:
            "Sincroniza este dispositivo antes de acceder a los originales.",
        },
        403,
      ),
    };
  const rate = await checkRateLimit(
    request,
    {
      namespace: writing ? "expense_original_upload" : "expense_original_read",
      limit: writing ? 30 : 180,
      windowMs: 10 * 60_000,
    },
    auth.actorUserId,
  );
  if (!rate.allowed)
    return {
      response: privateOriginalResponse(rateLimitExceededResponse(rate)),
    };
  const access = await ensureCloudDeviceAccess({
    userId: auth.userId,
    billingUserId: auth.billingUserId,
    sessionId: auth.sessionId,
    token,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  if (!access.allowed)
    return { response: originalJson({ error: access.message }, 403) };
  return { auth };
}
