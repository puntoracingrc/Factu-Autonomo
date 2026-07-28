import { NextResponse } from "next/server";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import {
  createCentralInvoiceAuthorityStatusRouteHandler,
  defaultCentralInvoiceAuthorityStatusRouteDependencies,
} from "@/lib/central-invoice-authority/status-route-handler";
import type {
  CentralInvoiceAuthorityStatusProbeClient,
} from "@/lib/central-invoice-authority/status-readiness";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const routeHandler = createCentralInvoiceAuthorityStatusRouteHandler({
  ...defaultCentralInvoiceAuthorityStatusRouteDependencies,
  async authenticate(authorization) {
    const identity = await getUserSessionFromBearer(authorization, {
      requireEmailConfirmed: true,
    });
    if (!identity) return null;
    return {
      userId: identity.user.id,
      sessionId: identity.sessionId,
      userEmail: identity.user.email ?? null,
    };
  },
  async rateLimit(request, userId) {
    const result = await checkRateLimit(
      { headers: request.headers } as Request,
      {
        namespace: "central_invoice_authority_status",
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
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    };
  },
  async verifyDevice({ userId, sessionId, token, userAgent }) {
    const normalizedToken = normalizeCloudDeviceToken(token);
    if (!normalizedToken) {
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
      token: normalizedToken,
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
    return { allowed: true, deviceId: hashCloudDeviceToken(normalizedToken) };
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
                      CentralInvoiceAuthorityStatusProbeClient["from"]
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
          CentralInvoiceAuthorityStatusProbeClient["rpc"]
        >;
      },
    };
  },
});

function toNextResponse(response: {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}) {
  if (response.status === 204) {
    return new NextResponse(null, {
      status: response.status,
      headers: response.headers,
    });
  }
  return NextResponse.json(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(request: Request) {
  return toNextResponse(
    await routeHandler.handle({
      method: "GET",
      headers: request.headers,
      url: request.url,
    }),
  );
}

export async function OPTIONS(request: Request) {
  return toNextResponse(
    await routeHandler.handle({
      method: "OPTIONS",
      headers: request.headers,
      url: request.url,
    }),
  );
}

export async function POST(request: Request) {
  return toNextResponse(
    await routeHandler.handle({
      method: "POST",
      headers: request.headers,
      url: request.url,
    }),
  );
}
