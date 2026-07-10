import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface RateLimitBucketRow {
  namespace: string | null;
  request_count: number | null;
  updated_at: string | null;
}

export interface RawAbuseNamespace {
  namespace: string;
  buckets: number;
  requests: number;
  maxRequests: number;
  latestAt: string | null;
}

export interface RawAbuseSummary {
  namespaces: RawAbuseNamespace[];
  totalBuckets: number;
  totalRequests: number;
  latestAt: string | null;
}

export function emptyAbuseSummary(): RawAbuseSummary {
  return {
    namespaces: [],
    totalBuckets: 0,
    totalRequests: 0,
    latestAt: null,
  };
}

function errorText(error: DatabaseErrorLike): string {
  return [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingRateLimitTable(error: DatabaseErrorLike): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (errorText(error).includes("server_rate_limit_buckets") &&
      /schema cache|does not exist|not find/i.test(error.message ?? ""))
  );
}

function toTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export async function fetchRateLimitAbuse(
  admin: AdminClient,
): Promise<RawAbuseSummary> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await admin
      .from("server_rate_limit_buckets")
      .select("namespace,request_count,updated_at")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(1000);

    if (result.error) {
      if (isMissingRateLimitTable(result.error)) return emptyAbuseSummary();
      return emptyAbuseSummary();
    }

    const namespaces = new Map<string, RawAbuseNamespace>();
    let totalBuckets = 0;
    let totalRequests = 0;
    let latestAt: string | null = null;

    for (const row of (result.data ?? []) as RateLimitBucketRow[]) {
      const namespace = row.namespace?.trim() || "desconocido";
      const requests = Math.max(0, Math.floor(Number(row.request_count ?? 0)));
      const updatedAt = row.updated_at ?? null;
      const current = namespaces.get(namespace) ?? {
        namespace,
        buckets: 0,
        requests: 0,
        maxRequests: 0,
        latestAt: null,
      };

      current.buckets += 1;
      current.requests += requests;
      current.maxRequests = Math.max(current.maxRequests, requests);
      if (toTime(updatedAt) > toTime(current.latestAt)) {
        current.latestAt = updatedAt;
      }
      namespaces.set(namespace, current);

      totalBuckets += 1;
      totalRequests += requests;
      if (toTime(updatedAt) > toTime(latestAt)) latestAt = updatedAt;
    }

    return {
      namespaces: Array.from(namespaces.values())
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 12),
      totalBuckets,
      totalRequests,
      latestAt,
    };
  } catch {
    return emptyAbuseSummary();
  }
}
