import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { aggregateTaxDiagnosticInsights } from "@/lib/tax-diagnostic-insights/aggregate.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENT_COLUMNS = "occurred_at,session_id,event_type,page,device_category,question_id,question_group,risk_tag,model_number,recommendation_status,document_family,extraction_method,confidence_bucket,fiscal_year,engine_version,ruleset_version,layout_version,properties";
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

function startOfUtcDay(value: Date) {
  const result = new Date(value);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export async function GET(request: Request) {
  const access = await getAdminAccessFromRequest(request);
  if (!access.ok) return withPrivateResponseHeaders(access.response);
  const rateLimit = await checkRateLimit(
    request,
    { namespace: "admin_tax_diagnostic_insights", limit: 60, windowMs: 10 * 60_000 },
    access.user.id,
  );
  if (!rateLimit.allowed) {
    return withPrivateResponseHeaders(rateLimitExceededResponse(rateLimit));
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return privateJson({ error: "Servidor admin no disponible" }, { status: 503 });
  }
  const to = startOfUtcDay(new Date());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 7);
  const previousFrom = new Date(from);
  previousFrom.setUTCDate(previousFrom.getUTCDate() - 7);

  const { data, error } = await admin
    .from("tax_product_events")
    .select(EVENT_COLUMNS)
    .gte("occurred_at", previousFrom.toISOString())
    .lt("occurred_at", to.toISOString())
    .order("occurred_at", { ascending: true })
    .limit(20_000);

  if (error) {
    const unavailable = error.code === "42P01" || error.code === "PGRST205";
    return privateJson(
      { available: false, error: unavailable ? "La analítica aún no está activada." : "No se pudo preparar el informe." },
      { status: unavailable ? 200 : 500 },
    );
  }
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const currentRows = rows.filter((event) => new Date(String(event.occurred_at)).getTime() >= from.getTime());
  const previousRows = rows.filter((event) => new Date(String(event.occurred_at)).getTime() < from.getTime());
  const previous = aggregateTaxDiagnosticInsights(previousRows, {
    generatedAt: from.toISOString(),
    period: { from: previousFrom.toISOString(), to: from.toISOString() },
  });
  const report = aggregateTaxDiagnosticInsights(currentRows, {
    generatedAt: to.toISOString(),
    period: { from: from.toISOString(), to: to.toISOString() },
    previous,
  });

  return privateJson(
    { available: true, report, previousSummary: { eventVolume: previous.eventVolume, funnel: previous.funnel } },
  );
}
