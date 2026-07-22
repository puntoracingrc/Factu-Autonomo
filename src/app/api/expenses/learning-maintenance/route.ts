import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RPC_TIMEOUT_MS = 25_000;
const PROMOTION_RESULTS = new Set(["PROMOTED", "NOTHING"]);
const RETENTION_RESULTS = new Set(["PURGED"]);

function secureEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}

function maintenanceResponse(ok: boolean, status: number) {
  return NextResponse.json(
    { ok },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        Pragma: "no-cache",
        Vary: "Authorization",
      },
    },
  );
}

async function runMaintenanceRpc(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  name:
    | "promote_expense_learning_closed_weeks_v1"
    | "purge_expense_learning_retention_v1",
  acceptedResults: ReadonlySet<string>,
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .rpc(name)
      .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
    return (
      error === null && typeof data === "string" && acceptedResults.has(data)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return maintenanceResponse(false, 503);
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!secureEqual(authorization, `Bearer ${cronSecret}`)) {
    return maintenanceResponse(false, 401);
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return maintenanceResponse(false, 503);
  }
  if (!admin) {
    return maintenanceResponse(false, 503);
  }

  const promotionOk = await runMaintenanceRpc(
    admin,
    "promote_expense_learning_closed_weeks_v1",
    PROMOTION_RESULTS,
  );
  const retentionOk = await runMaintenanceRpc(
    admin,
    "purge_expense_learning_retention_v1",
    RETENTION_RESULTS,
  );

  if (!promotionOk || !retentionOk) {
    return maintenanceResponse(false, 503);
  }

  return maintenanceResponse(true, 200);
}
