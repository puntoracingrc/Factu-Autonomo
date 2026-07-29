import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import {
  createCentralBusinessAuthorityStatusRouteHandler,
  defaultCentralBusinessAuthorityStatusRouteDependencies,
} from "@/lib/central-business-authority/status-route-handler";
import type { CentralBusinessAuthorityStatusProbeClient } from "@/lib/central-business-authority/status-readiness";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const handler = createCentralBusinessAuthorityStatusRouteHandler({
  ...defaultCentralBusinessAuthorityStatusRouteDependencies,
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
  async rateLimit(request, userId) {
    const result = await checkRateLimit(
      { headers: request.headers } as Request,
      {
        namespace: "central_business_authority_status",
        limit: 60,
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
  getProbeClient() {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    return {
      from(table) {
        return {
          select(columns, options) {
            return {
              limit(count) {
                return admin
                  .from(table)
                  .select(columns, options)
                  .limit(count) as unknown as ReturnType<
                  ReturnType<
                    ReturnType<
                      CentralBusinessAuthorityStatusProbeClient["from"]
                    >["select"]
                  >["limit"]
                >;
              },
            };
          },
        };
      },
      rpc(name, args) {
        return admin.rpc(name, args) as unknown as ReturnType<
          CentralBusinessAuthorityStatusProbeClient["rpc"]
        >;
      },
    };
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

export async function GET(request: Request) {
  return response(
    await handler.handle({ method: "GET", headers: request.headers }),
  );
}

export async function OPTIONS(request: Request) {
  return response(
    await handler.handle({ method: "OPTIONS", headers: request.headers }),
  );
}

export async function POST(request: Request) {
  return response(
    await handler.handle({ method: "POST", headers: request.headers }),
  );
}
