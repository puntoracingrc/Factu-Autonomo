import { NextResponse } from "next/server";

import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  createCentralBusinessBatchMutationRouteHandler,
} from "@/lib/central-business-authority/batch-mutation-route-handler";
import type {
  CentralBusinessBatchMutationRpcArgs,
  CentralBusinessBatchMutationRpcClient,
} from "@/lib/central-business-authority/batch-mutation-rpc-adapter";
import {
  ensureCloudDeviceAccess,
  hashCloudDeviceToken,
  normalizeCloudDeviceToken,
} from "@/lib/cloud/devices";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { readTextBody } from "@/lib/server/request-body";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 1024 * 1024;

const handler = createCentralBusinessBatchMutationRouteHandler({
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
        namespace: "central_business_authority_mutate_batch",
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
  getRpcClient() {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    return {
      rpc(
        name: "mutate_central_business_batch_v1",
        args: CentralBusinessBatchMutationRpcArgs,
      ) {
        return admin.rpc(name, args) as unknown as ReturnType<
          CentralBusinessBatchMutationRpcClient["rpc"]
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

export async function POST(request: Request) {
  return response(
    await handler.handle({
      method: "POST",
      headers: request.headers,
      readBody: async () => {
        const body = await readTextBody(request, {
          maxBytes: MAX_BODY_BYTES,
          invalidMessage: "JSON invalido",
          tooLargeMessage: "Lote central demasiado grande",
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
  return response(
    await handler.handle({ method: "OPTIONS", headers: request.headers }),
  );
}

export async function GET(request: Request) {
  return response(
    await handler.handle({ method: "GET", headers: request.headers }),
  );
}
