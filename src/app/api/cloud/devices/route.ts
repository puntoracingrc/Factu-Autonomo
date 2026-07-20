import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  ensureCloudDeviceAccess,
  listCloudDevicesForUser,
  normalizeCloudDeviceToken,
  revokeCurrentCloudDeviceForUser,
} from "@/lib/cloud/devices";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request-body";

export const dynamic = "force-dynamic";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  return markPrivate(response);
}

function markPrivate<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization, X-Factu-Device-Token");
  return response;
}

function deviceTokenFromRequest(request: Request): string | null {
  return normalizeCloudDeviceToken(request.headers.get("x-factu-device-token"));
}

export async function GET(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "cloud_devices_list", limit: 120, windowMs: 10 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) {
    return markPrivate(rateLimitExceededResponse(rateLimit));
  }

  const payload = await listCloudDevicesForUser({
    userId: user.id,
    token: deviceTokenFromRequest(request) ?? undefined,
  });
  return privateJson(payload);
}

export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "cloud_devices_claim", limit: 60, windowMs: 10 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) {
    return markPrivate(rateLimitExceededResponse(rateLimit));
  }

  const token = deviceTokenFromRequest(request);
  if (!token) {
    return privateJson(
      { error: "Identificador de dispositivo no valido" },
      { status: 400 },
    );
  }

  const bodyResult = await readJsonBody<{
    name?: unknown;
    markSynced?: unknown;
  }>(request, {
    maxBytes: 2_048,
    invalidMessage: "Datos de dispositivo no válidos",
  });
  if (!bodyResult.ok) return markPrivate(bodyResult.response);
  const body = bodyResult.data;
  const result = await ensureCloudDeviceAccess({
    userId: user.id,
    token,
    name: typeof body.name === "string" ? body.name : undefined,
    userAgent: request.headers.get("user-agent") ?? "",
    markSynced: body.markSynced === true,
  });

  if (!result.allowed) {
    return privateJson(result, {
      status: result.reason === "cloud_not_in_plan" ? 403 : 409,
    });
  }

  return privateJson(result);
}

export async function DELETE(request: Request) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "cloud_devices_retire_current",
      limit: 10,
      windowMs: 10 * 60_000,
    },
    user.id,
  );
  if (!rateLimit.allowed) {
    return markPrivate(rateLimitExceededResponse(rateLimit));
  }

  const token = deviceTokenFromRequest(request);
  if (!token) {
    return privateJson(
      { error: "Identificador de dispositivo no valido" },
      { status: 400 },
    );
  }
  const result = await revokeCurrentCloudDeviceForUser({
    userId: user.id,
    currentToken: token,
  });
  const overview = await listCloudDevicesForUser({
    userId: user.id,
    token,
  });
  return privateJson(
    {
      plan: overview.plan,
      limit: overview.limit,
      devices: result.devices.length > 0 ? result.devices : overview.devices,
      error: result.ok ? undefined : result.error,
    },
    { status: result.ok ? 200 : 400 },
  );
}
