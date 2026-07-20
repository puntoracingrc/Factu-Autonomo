import { NextResponse } from "next/server";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import {
  listCloudDevicesForUser,
  normalizeCloudDeviceToken,
  revokeCloudDeviceForUser,
} from "@/lib/cloud/devices";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

function deviceTokenFromRequest(request: Request): string | null {
  return normalizeCloudDeviceToken(request.headers.get("x-factu-device-token"));
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getUserFromBearer(request.headers.get("authorization"), {
    requireEmailConfirmed: true,
  });
  if (!user) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "cloud_devices_revoke", limit: 30, windowMs: 10 * 60_000 },
    user.id,
  );
  if (!rateLimit.allowed) {
    return markPrivate(rateLimitExceededResponse(rateLimit));
  }

  const { id } = await context.params;
  const result = await revokeCloudDeviceForUser({
    userId: user.id,
    deviceId: id,
    currentToken: deviceTokenFromRequest(request) ?? undefined,
  });
  const overview = await listCloudDevicesForUser({
    userId: user.id,
    token: deviceTokenFromRequest(request) ?? undefined,
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
