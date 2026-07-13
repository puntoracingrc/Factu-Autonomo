import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { buildFiscalWatchAdminStatus } from "@/lib/fiscal-watch/admin-status";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GITHUB_API_ORIGIN = "https://api.github.com";
const REPOSITORY_API_PATH = "/repos/puntoracingrc/Factu-Autonomo";
const MAX_GITHUB_RESPONSE_BYTES = 1024 * 1024;
const GITHUB_TIMEOUT_MS = 8_000;
const GITHUB_STATUS_CACHE_MS = 5 * 60_000;
const GITHUB_SHARED_CACHE_SECONDS = 15 * 60;

type FiscalWatchStatus = ReturnType<typeof buildFiscalWatchAdminStatus>;

let cachedStatus:
  | { expiresAt: number; fetchImpl: typeof fetch; value: FiscalWatchStatus }
  | undefined;
let statusRequest:
  | { fetchImpl: typeof fetch; promise: Promise<FiscalWatchStatus> }
  | undefined;

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function withPrivateResponseHeaders<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return withPrivateResponseHeaders(NextResponse.json(body, init));
}

function githubUrl(pathname: string, query: Record<string, string>): URL {
  const url = new URL(`${REPOSITORY_API_PATH}${pathname}`, GITHUB_API_ORIGIN);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function readBoundedGithubJson(
  url: URL,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  if (
    url.origin !== GITHUB_API_ORIGIN ||
    !url.pathname.startsWith(`${REPOSITORY_API_PATH}/`)
  ) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "factu-fiscal-watch-admin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "force-cache",
      next: { revalidate: GITHUB_SHARED_CACHE_SECONDS },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (
      contentType !== "application/json" &&
      contentType !== "application/vnd.github+json"
    ) {
      return null;
    }

    const declaredLength = response.headers.get("content-length");
    if (declaredLength !== null) {
      if (!/^\d+$/.test(declaredLength.trim())) return null;
      const bytes = Number(declaredLength);
      if (!Number.isSafeInteger(bytes) || bytes > MAX_GITHUB_RESPONSE_BYTES) {
        return null;
      }
    }

    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_GITHUB_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        controller.abort();
        return null;
      }
      chunks.push(value);
    }

    const body = Buffer.concat(chunks, receivedBytes).toString("utf8");
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFreshFiscalWatchAdminStatus(
  fetchImpl: typeof fetch,
): Promise<FiscalWatchStatus> {
  const workflowRunsUrl = githubUrl(
    "/actions/workflows/fiscal-watch.yml/runs",
    { branch: "main", per_page: "1" },
  );
  const unreviewedIssuesUrl = githubUrl("/issues", {
    state: "open",
    labels: "fiscal-watch:unreviewed",
    per_page: "21",
    sort: "created",
    direction: "desc",
  });
  const baselineIssuesUrl = githubUrl("/issues", {
    state: "open",
    labels: "fiscal-watch:baseline",
    per_page: "21",
    sort: "created",
    direction: "desc",
  });

  const [workflowRuns, unreviewedIssues, baselineIssues] = await Promise.all([
    readBoundedGithubJson(workflowRunsUrl, fetchImpl),
    readBoundedGithubJson(unreviewedIssuesUrl, fetchImpl),
    readBoundedGithubJson(baselineIssuesUrl, fetchImpl),
  ]);

  return buildFiscalWatchAdminStatus({
    workflowRuns,
    unreviewedIssues,
    baselineIssues,
    now: new Date(),
  });
}

async function fetchFiscalWatchAdminStatus(): Promise<FiscalWatchStatus> {
  const now = Date.now();
  const fetchImpl = fetch;
  if (
    cachedStatus &&
    cachedStatus.fetchImpl === fetchImpl &&
    cachedStatus.expiresAt > now
  ) {
    return cachedStatus.value;
  }
  if (!statusRequest || statusRequest.fetchImpl !== fetchImpl) {
    const promise = fetchFreshFiscalWatchAdminStatus(fetchImpl)
      .then((value) => {
        cachedStatus = {
          expiresAt: Date.now() + GITHUB_STATUS_CACHE_MS,
          fetchImpl,
          value,
        };
        return value;
      })
      .finally(() => {
        if (statusRequest?.promise === promise) statusRequest = undefined;
      });
    statusRequest = { fetchImpl, promise };
  }
  return statusRequest.promise;
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPrivateResponseHeaders(access.response);

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_fiscal_watch",
      limit: 12,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateResponseHeaders(rateLimitExceededResponse(rateLimit));
  }

  try {
    const status = await fetchFiscalWatchAdminStatus();
    return privateJson({ status });
  } catch {
    return privateJson(
      { error: "No se pudo comprobar la vigilancia fiscal." },
      { status: 503 },
    );
  }
}
