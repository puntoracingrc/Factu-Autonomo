"use client";

import { useEffect, useState } from "react";

import { getSupabaseClientAsync } from "@/lib/supabase/client";

type SupabaseBrowserSession =
  | {
      user?: {
        id?: unknown;
      } | null;
    }
  | null
  | undefined;

function normalizeUserId(userId: string | null | undefined): string | null {
  return typeof userId === "string" && userId.trim()
    ? userId.trim()
    : null;
}

function sessionUserId(session: SupabaseBrowserSession): string | null {
  return typeof session?.user?.id === "string" && session.user.id.trim()
    ? session.user.id.trim()
    : null;
}

async function readSupabaseSessionUserId(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (supabase === null) return null;

  const { data } = await supabase.auth.getSession();
  return sessionUserId(data.session);
}

export async function resolveCentralBusinessUserId(
  preferredUserId: string | null | undefined,
): Promise<string | null> {
  const normalized = normalizeUserId(preferredUserId);
  if (normalized) return normalized;

  try {
    return await readSupabaseSessionUserId();
  } catch {
    return null;
  }
}

export function useCentralBusinessResolvedUserId(
  preferredUserId: string | null | undefined,
): string | null {
  const normalizedPreferredUserId = normalizeUserId(preferredUserId);
  const [sessionFallbackUserId, setSessionFallbackUserId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (normalizedPreferredUserId) {
      setSessionFallbackUserId(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    function rememberSessionId(session: SupabaseBrowserSession) {
      if (cancelled) return;
      setSessionFallbackUserId(sessionUserId(session));
    }

    void getSupabaseClientAsync()
      .then(async (supabase) => {
        if (cancelled) return;
        if (supabase === null) {
          setSessionFallbackUserId(null);
          return;
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            rememberSessionId(session);
          },
        );
        unsubscribe = () => listener.subscription.unsubscribe();

        const { data } = await supabase.auth.getSession();
        rememberSessionId(data.session);
      })
      .catch(() => {
        if (!cancelled) setSessionFallbackUserId(null);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [normalizedPreferredUserId]);

  return normalizedPreferredUserId ?? sessionFallbackUserId;
}
