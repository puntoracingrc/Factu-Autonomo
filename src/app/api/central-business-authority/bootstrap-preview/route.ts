import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import { createCentralBusinessBootstrapPreviewRouteHandler } from "@/lib/central-business-authority/bootstrap-preview-route-handler";
import { evaluateCentralBusinessAuthorityActivation } from "@/lib/central-business-authority/activation";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const handler = createCentralBusinessBootstrapPreviewRouteHandler({
  async authenticate(authorization) {
    const identity = await getUserSessionFromBearer(authorization, {
      requireEmailConfirmed: true,
    });
    if (!identity) return null;
    return {
      userId: identity.user.id,
      userEmail: identity.user.email ?? null,
      sessionId: identity.sessionId,
    };
  },
  authorize({ userId, userEmail }) {
    return evaluateCentralBusinessAuthorityActivation({
      userId,
      userEmail,
    }).writesEnabled;
  },
  async rateLimit(request, userId) {
    const result = await checkRateLimit(
      { headers: request.headers } as Request,
      {
        namespace: "central_business_bootstrap_preview",
        limit: 12,
        windowMs: 10 * 60_000,
      },
      userId,
    );
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      status: 429,
      body: {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          retryAfterSeconds: result.retryAfterSeconds,
        },
      },
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    };
  },
  async verifyDevice({ userId, sessionId, token, userAgent }) {
    const normalized = normalizeCloudDeviceToken(token);
    if (!normalized) {
      return {
        allowed: false,
        status: 400,
        code: "INVALID_DEVICE_TOKEN",
        message: "Identificador de dispositivo no valido.",
      };
    }
    const access = await ensureCloudDeviceAccess({
      userId,
      sessionId,
      token: normalized,
      userAgent: userAgent ?? undefined,
    });
    if (!access.allowed) {
      return {
        allowed: false,
        status: 403,
        code: access.reason,
        message: access.message,
      };
    }
    return { allowed: true, deviceId: hashCloudDeviceToken(normalized) };
  },
  async listCentralEntities(userId) {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const { data, error } = await admin
      .from("central_business_entities")
      .select("entity_type,entity_id,current_version,deleted,content_hash")
      .eq("user_id", userId)
      .in("entity_type", ["customer", "supplier", "product"])
      .order("entity_type")
      .order("entity_id");
    if (error || !Array.isArray(data)) return null;
    return data.map((row) => ({
      entityType: row.entity_type as "customer" | "supplier" | "product",
      entityId: row.entity_id,
      currentVersion: row.current_version,
      deleted: row.deleted,
      contentHash: row.content_hash,
    }));
  },
});

function response(result: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}) {
  if (result.status === 204) {
    return new NextResponse(null, {
      status: result.status,
      headers: result.headers,
    });
  }
  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function POST(request: Request) {
  return response(
    await handler.handle({
      method: "POST",
      headers: request.headers,
      readBody: async () => {
        const body = await readTextBody(request, {
          maxBytes: MAX_BODY_BYTES,
          invalidMessage: "JSON invalido",
          tooLargeMessage: "Vista previa de bootstrap demasiado grande",
        });
        if (!body.ok) {
          throw new Error(
            body.response.status === 413
              ? "REQUEST_BODY_TOO_LARGE"
              : "INVALID_JSON",
          );
        }
        return body.data;
      },
    }),
  );
}
