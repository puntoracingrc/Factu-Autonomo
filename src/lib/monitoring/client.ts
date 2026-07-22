"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import type { AppErrorEventInput } from "./error-events";
import type { AppErrorRecoveryKind } from "./recovery-events";

const pendingErrorReports = new Set<Promise<boolean>>();

function getOptionalCloudDeviceToken(): string | null {
  try {
    return getLocalCloudDeviceToken();
  } catch {
    return null;
  }
}

async function sendAppError(input: AppErrorEventInput): Promise<boolean> {
  try {
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const deviceToken = getOptionalCloudDeviceToken();

    const response = await fetch("/api/monitoring/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(deviceToken ? { [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken } : {}),
      },
      body: JSON.stringify({
        ...input,
        route:
          input.route ??
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        userAgent: input.userAgent ?? window.navigator.userAgent,
      }),
      keepalive: true,
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: unknown;
    } | null;
    return response.ok && body?.ok === true;
  } catch {
    // No interrumpimos nunca al usuario por fallos del monitor.
    return false;
  }
}

export function reportAppError(input: AppErrorEventInput): Promise<boolean> {
  const operation = sendAppError(input);
  pendingErrorReports.add(operation);
  void operation.finally(() => {
    pendingErrorReports.delete(operation);
  });
  return operation;
}

export async function reportAppRecovery(
  expectedUserId: string,
  kind: AppErrorRecoveryKind,
): Promise<boolean> {
  try {
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (
      !session?.access_token ||
      !session.user?.id ||
      session.user.id !== expectedUserId
    ) {
      return false;
    }
    const deviceToken = getOptionalCloudDeviceToken();
    if (!deviceToken) return false;

    await Promise.all([...pendingErrorReports]);
    const { data: refreshedData } = await supabase.auth.getSession();
    const refreshedSession = refreshedData.session;
    if (
      !refreshedSession?.access_token ||
      refreshedSession.user?.id !== expectedUserId
    ) {
      return false;
    }

    const response = await fetch("/api/monitoring/recovery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshedSession.access_token}`,
        [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      },
      body: JSON.stringify({ kind }),
      cache: "no-store",
      credentials: "omit",
      keepalive: true,
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: unknown;
    } | null;
    return response.ok && body?.ok === true;
  } catch {
    // La observabilidad nunca altera el resultado de la sincronización.
    return false;
  }
}
