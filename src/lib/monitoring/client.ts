"use client";

import type { AppErrorEventInput } from "./error-events";

export async function reportAppError(input: AppErrorEventInput): Promise<boolean> {
  try {
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const response = await fetch("/api/monitoring/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
