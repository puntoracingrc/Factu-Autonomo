import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  buildVercelUsageSnapshot,
  currentVercelBillingPeriod,
  parseVercelBillingChargesJsonl,
} from "@/lib/admin/vercel-usage";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VERCEL_BILLING_ENDPOINT = "https://api.vercel.com/v1/billing/charges";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function vercelCredentials() {
  const token =
    process.env.VERCEL_BILLING_API_TOKEN?.trim() ||
    process.env.VERCEL_ACCESS_TOKEN?.trim() ||
    "";
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || "";
  const slug =
    process.env.VERCEL_BILLING_TEAM_SLUG?.trim() ||
    process.env.VERCEL_TEAM_SLUG?.trim() ||
    "";

  return { token, teamId, slug };
}

function billingUrl(from: string, to: string) {
  const { teamId, slug } = vercelCredentials();
  const url = new URL(VERCEL_BILLING_ENDPOINT);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  } else if (slug) {
    url.searchParams.set("slug", slug);
  }
  return url;
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return access.response;

  const rateLimit = await checkRateLimit(
    request,
    {
      namespace: "admin_vercel_usage",
      limit: 60,
      windowMs: 10 * 60_000,
    },
    access.user.id,
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const { token, teamId, slug } = vercelCredentials();
  if (!token || (!teamId && !slug)) {
    return noStoreJson({
      configured: false,
      message:
        "Panel Vercel pendiente: falta VERCEL_BILLING_API_TOKEN y VERCEL_TEAM_ID o VERCEL_BILLING_TEAM_SLUG.",
      vercel: null,
    });
  }

  const period = currentVercelBillingPeriod();
  const response = await fetch(billingUrl(period.from, period.to), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Encoding": "gzip",
    },
  });

  if (!response.ok) {
    return noStoreJson(
      {
        configured: true,
        error: "No se pudo leer el consumo de Vercel.",
        vercel: null,
      },
      { status: 502 },
    );
  }

  const charges = parseVercelBillingChargesJsonl(await response.text());
  return noStoreJson({
    configured: true,
    vercel: buildVercelUsageSnapshot({
      charges,
      ...period,
      primaryProjectSlug: process.env.VERCEL_USAGE_PROJECT_SLUG,
    }),
  });
}
