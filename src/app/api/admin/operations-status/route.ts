import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import { buildAdminOperationsStatus } from "@/lib/admin/operations-status";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GITHUB_REPOSITORY = "puntoracingrc/Factu-Autonomo";
const MAX_EXTERNAL_RESPONSE_BYTES = 2 * 1024 * 1024;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function vercelConfig() {
  return {
    token:
      process.env.VERCEL_BILLING_API_TOKEN?.trim() ||
      process.env.VERCEL_ACCESS_TOKEN?.trim() ||
      "",
    teamId: process.env.VERCEL_TEAM_ID?.trim() || "",
    teamSlug:
      process.env.VERCEL_BILLING_TEAM_SLUG?.trim() ||
      process.env.VERCEL_TEAM_SLUG?.trim() ||
      "",
    projectId: process.env.VERCEL_PROJECT_ID?.trim() || "",
    domain:
      process.env.VERCEL_PRODUCTION_DOMAIN?.trim() ||
      "facturacion-autonomos.app",
  };
}

function addVercelScope(url: URL, config: ReturnType<typeof vercelConfig>) {
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  else if (config.teamSlug) url.searchParams.set("slug", config.teamSlug);
  return url;
}

async function readExternalJson(
  url: URL,
  headers: HeadersInit,
): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const declaredLength = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_EXTERNAL_RESPONSE_BYTES
    ) {
      return null;
    }
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_EXTERNAL_RESPONSE_BYTES) {
      return null;
    }
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function workflowRunsFrom(value: unknown): unknown[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const runs = (value as { workflow_runs?: unknown }).workflow_runs;
  return Array.isArray(runs) ? runs : [];
}

async function fetchOperationsSources(now: Date) {
  const config = vercelConfig();
  const githubHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "factu-admin-operations",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const vercelHeaders: HeadersInit = config.token
    ? { Authorization: `Bearer ${config.token}` }
    : {};
  const githubCommitUrl = new URL(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/main`,
  );
  const githubRunsUrl = new URL(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs`,
  );
  githubRunsUrl.searchParams.set("branch", "main");
  githubRunsUrl.searchParams.set("per_page", "20");
  const githubCiRunsUrl = new URL(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs`,
  );
  githubCiRunsUrl.searchParams.set("branch", "main");
  githubCiRunsUrl.searchParams.set("per_page", "1");
  const githubSchedulerRunsUrl = new URL(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/security-health-alert.yml/runs`,
  );
  githubSchedulerRunsUrl.searchParams.set("branch", "main");
  githubSchedulerRunsUrl.searchParams.set("per_page", "1");

  const vercelReady = Boolean(
    config.token && config.projectId && (config.teamId || config.teamSlug),
  );
  const startTimestamp = now.getTime() - 24 * 60 * 60 * 1000;
  const endTimestamp = now.getTime();

  const aliasUrl = addVercelScope(
    new URL(`https://api.vercel.com/v4/aliases/${encodeURIComponent(config.domain)}`),
    config,
  );
  aliasUrl.searchParams.set("projectId", config.projectId);
  const deploymentsUrl = addVercelScope(
    new URL("https://api.vercel.com/v7/deployments"),
    config,
  );
  deploymentsUrl.searchParams.set("projectId", config.projectId);
  deploymentsUrl.searchParams.set("target", "production");
  deploymentsUrl.searchParams.set("state", "READY");
  deploymentsUrl.searchParams.set("limit", "10");
  const firewallConfigUrl = addVercelScope(
    new URL("https://api.vercel.com/v1/security/firewall/config/active"),
    config,
  );
  firewallConfigUrl.searchParams.set("projectId", config.projectId);
  const firewallEventsUrl = addVercelScope(
    new URL("https://api.vercel.com/v1/security/firewall/events"),
    config,
  );
  firewallEventsUrl.searchParams.set("projectId", config.projectId);
  firewallEventsUrl.searchParams.set("startTimestamp", String(startTimestamp));
  firewallEventsUrl.searchParams.set("endTimestamp", String(endTimestamp));

  const [
    githubCommit,
    githubRecentRuns,
    githubCiRuns,
    githubSchedulerRuns,
    vercelAlias,
    vercelDeployments,
    firewall,
    events,
  ] = await Promise.all([
      readExternalJson(githubCommitUrl, githubHeaders),
      readExternalJson(githubRunsUrl, githubHeaders),
      readExternalJson(githubCiRunsUrl, githubHeaders),
      readExternalJson(githubSchedulerRunsUrl, githubHeaders),
      vercelReady ? readExternalJson(aliasUrl, vercelHeaders) : null,
      vercelReady ? readExternalJson(deploymentsUrl, vercelHeaders) : null,
      vercelReady ? readExternalJson(firewallConfigUrl, vercelHeaders) : null,
      vercelReady ? readExternalJson(firewallEventsUrl, vercelHeaders) : null,
    ]);

  const githubRuns = {
    workflow_runs: [
      ...workflowRunsFrom(githubCiRuns),
      ...workflowRunsFrom(githubSchedulerRuns),
      ...workflowRunsFrom(githubRecentRuns),
    ],
  };

  return {
    configured: {
      github: Boolean(
        githubCommit ||
          githubRecentRuns ||
          githubCiRuns ||
          githubSchedulerRuns,
      ),
      vercel: vercelReady,
    },
    operations: buildAdminOperationsStatus({
      githubCommit,
      githubRuns,
      vercelAlias,
      vercelDeployments,
      vercelFirewallConfig: firewall,
      vercelFirewallEvents: events,
      domain: config.domain,
      now,
    }),
  };
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return access.response;

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_operations_status",
      limit: 60,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const result = await fetchOperationsSources(new Date());
  return noStoreJson({
    ...result,
    message:
      result.configured.github && result.configured.vercel
        ? undefined
        : "Alguna fuente externa no esta disponible; el resto del panel sigue operativo.",
  });
}
