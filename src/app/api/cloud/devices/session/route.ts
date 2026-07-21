import { NextResponse } from "next/server";
import { getUserSessionFromBearer } from "@/lib/billing/server-auth";
import {
  normalizeCloudDeviceToken,
  releaseCloudDeviceSessionForUser,
} from "@/lib/cloud/devices";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

function markPrivate<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Authorization, X-Factu-Device-Token");
  return response;
}

function privateJson(body: unknown, init?: ResponseInit) {
  return markPrivate(NextResponse.json(body, init));
}

export async function DELETE(request: Request) {
  const identity = await getUserSessionFromBearer(
    request.headers.get("authorization"),
    { requireEmailConfirmed: true },
  );
  if (!identity) {
    return privateJson({ error: "No autorizado" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "cloud_device_session_release",
      limit: 30,
      windowMs: 10 * 60_000,
    },
    identity.user.id,
  );
  if (!rateLimit.allowed) {
    return markPrivate(rateLimitExceededResponse(rateLimit));
  }

  const token = normalizeCloudDeviceToken(
    request.headers.get("x-factu-device-token"),
  );
  if (!token) {
    return privateJson(
      { error: "Identificador de dispositivo no valido" },
      { status: 400 },
    );
  }

  try {
    await releaseCloudDeviceSessionForUser({
      userId: identity.user.id,
      currentToken: token,
      sessionId: identity.sessionId,
    });
    return privateJson({ ok: true });
  } catch {
    return privateJson(
      { error: "No se pudo liberar la sesion de nube" },
      { status: 503 },
    );
  }
}
