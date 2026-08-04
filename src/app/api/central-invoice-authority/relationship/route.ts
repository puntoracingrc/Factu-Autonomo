import { NextResponse } from "next/server";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import { createCentralInvoiceAuthorityRelationshipRouteHandler } from "@/lib/central-invoice-authority/relationship-route-handler";
import type {
  CentralInvoiceAuthorityRelationshipRpcArgs,
  CentralInvoiceAuthorityRelationshipRpcClient,
} from "@/lib/central-invoice-authority/relationship-rpc-adapter";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_RELATIONSHIP_BODY_BYTES = 8 * 1024;

const routeHandler = createCentralInvoiceAuthorityRelationshipRouteHandler({
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
        namespace: "central_invoice_authority_relationship",
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
  getRpcClient() {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    return {
      rpc(
        name: "unlink_central_invoice_quote_v1",
        args: CentralInvoiceAuthorityRelationshipRpcArgs,
      ) {
        return admin.rpc(name, args) as unknown as ReturnType<
          CentralInvoiceAuthorityRelationshipRpcClient["rpc"]
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

export async function POST(request: Request) {
  return toNextResponse(
    await routeHandler.handle({
      method: "POST",
      headers: request.headers,
      readBody: async () => {
        const body = await readTextBody(request, {
          maxBytes: MAX_RELATIONSHIP_BODY_BYTES,
          invalidMessage: "JSON invalido",
          tooLargeMessage: "Solicitud de relacion central demasiado grande",
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

export async function OPTIONS(request: Request) {
  return toNextResponse(
    await routeHandler.handle({
      method: "OPTIONS",
      headers: request.headers,
    }),
  );
}

export async function GET(request: Request) {
  return toNextResponse(
    await routeHandler.handle({
      method: "GET",
      headers: request.headers,
    }),
  );
}
