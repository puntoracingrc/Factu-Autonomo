import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { isCloudEnabled } from "./config";

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;

function isSupabaseRestRequest(input: RequestInfo | URL): boolean {
  const value =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    return new URL(value).pathname.startsWith("/rest/v1/");
  } catch {
    return false;
  }
}

function deviceAwareFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (!isSupabaseRestRequest(input)) return fetch(input, init);

  const inheritedHeaders =
    init?.headers ?? (input instanceof Request ? input.headers : undefined);
  const headers = new Headers(inheritedHeaders);
  headers.set(CLOUD_DEVICE_TOKEN_HEADER, getOrCreateLocalCloudDeviceToken());
  return fetch(input, { ...init, headers });
}

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined" || !isCloudEnabled()) return null;
  return client;
}

export async function getSupabaseClientAsync(): Promise<SupabaseClient | null> {
  if (typeof window === "undefined" || !isCloudEnabled()) return null;
  if (client) return client;

  if (!loading) {
    loading = import("@supabase/supabase-js").then(({ createClient }) => {
      client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { fetch: deviceAwareFetch } },
      );
      return client;
    });
  }

  return loading;
}
