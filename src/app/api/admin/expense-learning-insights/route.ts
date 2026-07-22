import { NextResponse } from "next/server";
import { getAdminAccessFromRequest } from "@/lib/admin/server-access";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  Vary: "Authorization",
} as const;

const ROW_KEYS = [
  "bucket_kind",
  "bucket_value",
  "comparison_scope",
  "contribution_schema_version",
  "engine_version",
  "expires_at",
  "metric_family",
  "metric_key",
  "observation_schema_version",
  "privacy_policy_version",
  "promoted_at",
  "structural_archetype_group",
  "support_band",
  "week_start",
] as const;

const STRUCTURAL_GROUPS = new Set(["TABLE", "SUMMARY", "OTHER", "UNKNOWN"]);
const EXACT_REVIEW_VALUES = new Set([
  "CONFIRMED",
  "CORRECTED",
  "REJECTED",
  "NOT_REVIEWED",
]);
const SUPPORT_BANDS = new Set([
  "K10_19",
  "K20_49",
  "K50_99",
  "K100_PLUS",
]);

interface ExpenseLearningMetric {
  weekStart: string;
  structuralArchetypeGroup: string;
  bucketKind: "EXACT" | "COARSENED_OTHER";
  bucketValue:
    | "CONFIRMED"
    | "CORRECTED"
    | "REJECTED"
    | "NOT_REVIEWED"
    | "OTHER";
  supportBand: "K10_19" | "K20_49" | "K50_99" | "K100_PLUS";
  promotedAt: string;
  expiresAt: string;
}

function withPrivateResponseHeaders<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  return withPrivateResponseHeaders(NextResponse.json(body, init));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalWeekStart(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date.getUTCDay() !== 1
  ) {
    return null;
  }
  return value;
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizedMetric(value: unknown): ExpenseLearningMetric | null {
  if (!isRecord(value)) return null;
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(ROW_KEYS)) {
    return null;
  }
  if (
    value.contribution_schema_version !==
      "expense-engine-aggregate-contribution.v1" ||
    value.observation_schema_version !== "expense-engine-observation.v1" ||
    value.engine_version !== "expense-local-engine.v1" ||
    value.privacy_policy_version !== "2026-07-21" ||
    value.metric_family !== "HUMAN_REVIEW" ||
    value.comparison_scope !== "NONE" ||
    value.metric_key !== "VALUE" ||
    typeof value.structural_archetype_group !== "string" ||
    !STRUCTURAL_GROUPS.has(value.structural_archetype_group) ||
    typeof value.support_band !== "string" ||
    !SUPPORT_BANDS.has(value.support_band)
  ) {
    return null;
  }

  const weekStart = canonicalWeekStart(value.week_start);
  const promotedAt = canonicalTimestamp(value.promoted_at);
  const expiresAt = canonicalTimestamp(value.expires_at);
  if (
    !weekStart ||
    !promotedAt ||
    !expiresAt ||
    new Date(expiresAt).getTime() <= new Date(promotedAt).getTime()
  ) {
    return null;
  }

  const exact =
    value.bucket_kind === "EXACT" &&
    typeof value.bucket_value === "string" &&
    EXACT_REVIEW_VALUES.has(value.bucket_value);
  const coarsened =
    value.bucket_kind === "COARSENED_OTHER" && value.bucket_value === "OTHER";
  if (!exact && !coarsened) return null;

  return {
    weekStart,
    structuralArchetypeGroup: value.structural_archetype_group,
    bucketKind: value.bucket_kind as ExpenseLearningMetric["bucketKind"],
    bucketValue: value.bucket_value as ExpenseLearningMetric["bucketValue"],
    supportBand: value.support_band as ExpenseLearningMetric["supportBand"],
    promotedAt,
    expiresAt,
  };
}

function normalizeMetrics(value: unknown): ExpenseLearningMetric[] | null {
  if (!Array.isArray(value) || value.length > 1024) return null;
  const metrics = value.map(normalizedMetric);
  if (metrics.some((metric) => metric === null)) return null;
  const normalized = metrics as ExpenseLearningMetric[];
  const groups = new Map<string, ExpenseLearningMetric[]>();

  for (const metric of normalized) {
    const key = `${metric.weekStart}|${metric.structuralArchetypeGroup}`;
    const rows = groups.get(key) ?? [];
    rows.push(metric);
    groups.set(key, rows);
  }

  for (const rows of groups.values()) {
    const supportBands = new Set(rows.map((row) => row.supportBand));
    const bucketValues = new Set(rows.map((row) => row.bucketValue));
    if (supportBands.size !== 1 || bucketValues.size !== rows.length) return null;
    if (rows.some((row) => row.bucketKind === "COARSENED_OTHER")) {
      if (
        rows.length !== 1 ||
        rows[0]?.bucketKind !== "COARSENED_OTHER" ||
        rows[0].bucketValue !== "OTHER"
      ) {
        return null;
      }
    } else if (rows.length < 1 || rows.length > EXACT_REVIEW_VALUES.size) {
      return null;
    }
  }

  return normalized;
}

export async function GET(request: Request) {
  try {
    const access = await getAdminAccessFromRequest(request);
    if (!access.ok) return withPrivateResponseHeaders(access.response);

    const rateLimit = await checkRateLimit(
      request,
      {
        namespace: "admin_expense_learning_insights",
        limit: 60,
        windowMs: 10 * 60_000,
      },
      access.user.id,
    );
    if (!rateLimit.allowed) {
      return withPrivateResponseHeaders(rateLimitExceededResponse(rateLimit));
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return privateJson(
        { error: "No se pudieron cargar las métricas agregadas." },
        { status: 503 },
      );
    }

    const { data, error } = await admin.rpc(
      "read_expense_learning_closed_week_metrics_v1",
    );
    const metrics = error ? null : normalizeMetrics(data);
    if (!metrics) {
      return privateJson(
        { error: "No se pudieron cargar las métricas agregadas." },
        { status: 503 },
      );
    }

    return privateJson({
      available: true,
      schemaVersion: "expense-learning-admin-insights.v1",
      generatedAt: new Date().toISOString(),
      metrics,
    });
  } catch {
    return privateJson(
      { error: "No se pudieron cargar las métricas agregadas." },
      { status: 503 },
    );
  }
}
