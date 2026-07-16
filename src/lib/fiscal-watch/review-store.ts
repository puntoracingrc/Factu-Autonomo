import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  fiscalWatchReviewKey,
  type FiscalWatchIssueKind,
} from "@/lib/fiscal-watch/admin-status";

assertServerOnlyModule();

const REVIEW_AREA = "fiscal_watch_review";
const REVIEW_CODE_PREFIX = "fiscal-watch:reviewed:v1:";
const REVIEW_CODE_PATTERN =
  /^fiscal-watch:reviewed:v1:(change|baseline):([1-9]\d{0,15})$/;
const MAX_STORED_REVIEWS = 500;

export interface FiscalWatchReviewStoreSnapshot {
  available: boolean;
  keys: string[];
}

function assertServerOnlyModule(): void {
  if (typeof window !== "undefined") {
    throw new Error("Fiscal watch review storage is server-only.");
  }
}

function isMissingErrorEventsTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const source = error as { code?: string; message?: string };
  return (
    source.code === "42P01" ||
    source.code === "PGRST205" ||
    (/app_error_events/i.test(source.message ?? "") &&
      /schema cache|does not exist|not find/i.test(source.message ?? ""))
  );
}

export function fiscalWatchReviewEventCode(
  kind: FiscalWatchIssueKind,
  issueNumber: number,
): string | null {
  const key = fiscalWatchReviewKey(kind, issueNumber);
  return key ? `${REVIEW_CODE_PREFIX}${key}` : null;
}

export function fiscalWatchReviewEventId(
  kind: FiscalWatchIssueKind,
  issueNumber: number,
): string | null {
  const code = fiscalWatchReviewEventCode(kind, issueNumber);
  if (!code) return null;
  const hex = createHash("sha256").update(code).digest("hex");
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export async function listFiscalWatchReviewKeys(): Promise<FiscalWatchReviewStoreSnapshot> {
  const admin = getSupabaseAdmin();
  if (!admin) return { available: false, keys: [] };

  const { data, error } = await admin
    .from("app_error_events")
    .select("code")
    .eq("area", REVIEW_AREA)
    .not("resolved_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(MAX_STORED_REVIEWS);

  if (error) {
    if (isMissingErrorEventsTable(error)) {
      return { available: false, keys: [] };
    }
    throw error;
  }

  const keys = new Set<string>();
  for (const row of (data ?? []) as Array<{ code?: unknown }>) {
    if (typeof row.code !== "string") return { available: false, keys: [] };
    const match = row.code.match(REVIEW_CODE_PATTERN);
    if (!match) return { available: false, keys: [] };
    keys.add(`${match[1]}:${match[2]}`);
  }
  return { available: true, keys: [...keys].sort() };
}

export async function recordFiscalWatchReview(input: {
  actorUserId: string;
  kind: FiscalWatchIssueKind;
  issueNumber: number;
}): Promise<boolean> {
  const id = fiscalWatchReviewEventId(input.kind, input.issueNumber);
  const code = fiscalWatchReviewEventCode(input.kind, input.issueNumber);
  const admin = getSupabaseAdmin();
  if (!admin || !id || !code || !input.actorUserId) return false;

  const now = new Date().toISOString();
  const { error } = await admin.from("app_error_events").upsert(
    {
      id,
      user_id: input.actorUserId,
      severity: "info",
      area: REVIEW_AREA,
      code,
      message: "Aviso de vigilancia fiscal revisado por un administrador.",
      route: "/admin?seccion=sistema",
      metadata: {
        schemaVersion: 1,
        issueKind: input.kind,
        issueNumber: input.issueNumber,
      },
      resolved_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (isMissingErrorEventsTable(error)) return false;
    throw error;
  }
  return true;
}
