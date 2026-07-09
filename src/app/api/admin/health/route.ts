import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin/access";
import {
  buildAdminHealthSnapshot,
  isMissingAdminHealthRpc,
} from "@/lib/admin/health";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { currentMonthKey } from "@/lib/billing/usage";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface FallbackSyncRow {
  user_id: string | null;
  entity_type: string | null;
  deleted: boolean | null;
  updated_at: string | null;
}

interface FallbackErrorRow {
  created_at: string | null;
  resolved_at: string | null;
}

interface FallbackUsage {
  monthKey: string;
  documentsCreated: number;
  expenseScans: number;
  customerAiAutofills: number;
}

function errorText(error: DatabaseErrorLike): string {
  return [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function errorMentionsColumn(error: DatabaseErrorLike, column: string): boolean {
  return errorText(error).includes(column.toLowerCase());
}

function isMissingTable(error: DatabaseErrorLike, table: string): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    errorText(error).includes(table.toLowerCase()) &&
      /schema cache|does not exist|not find/i.test(error.message ?? "")
  );
}

function isHealthSchemaFallbackError(error: DatabaseErrorLike): boolean {
  return (
    isMissingAdminHealthRpc(error) ||
    errorMentionsColumn(error, "customer_ai_autofills_created") ||
    isMissingTable(error, "app_error_events")
  );
}

function toTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function hourStartIso(date: Date): string {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  return copy.toISOString();
}

async function fetchUsageFallback(
  admin: AdminClient,
  monthKey: string,
): Promise<FallbackUsage> {
  const emptyUsage: FallbackUsage = {
    monthKey,
    documentsCreated: 0,
    expenseScans: 0,
    customerAiAutofills: 0,
  };
  const withCustomerAi = await admin
    .from("user_usage")
    .select(
      "documents_created,expense_scans_created,customer_ai_autofills_created",
    )
    .eq("month_key", monthKey);

  let rows = (withCustomerAi.data ?? []) as Array<Record<string, unknown>>;
  if (withCustomerAi.error) {
    if (!errorMentionsColumn(withCustomerAi.error, "customer_ai_autofills_created")) {
      return emptyUsage;
    }
    const retry = await admin
      .from("user_usage")
      .select("documents_created,expense_scans_created")
      .eq("month_key", monthKey);
    rows = (retry.data ?? []) as Array<Record<string, unknown>>;
  }

  return rows.reduce<FallbackUsage>(
    (acc, row) => ({
      monthKey,
      documentsCreated:
        acc.documentsCreated + Math.max(0, Number(row.documents_created ?? 0)),
      expenseScans:
        acc.expenseScans + Math.max(0, Number(row.expense_scans_created ?? 0)),
      customerAiAutofills:
        acc.customerAiAutofills +
        Math.max(0, Number(row.customer_ai_autofills_created ?? 0)),
    }),
    emptyUsage,
  );
}

async function fetchErrorsFallback(admin: AdminClient) {
  const result = await admin
    .from("app_error_events")
    .select("created_at,resolved_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (result.error && isMissingTable(result.error, "app_error_events")) {
    return [] as FallbackErrorRow[];
  }
  return (result.data ?? []) as FallbackErrorRow[];
}

async function buildFallbackRawHealth(admin: AdminClient) {
  const now = new Date();
  const monthKey = currentMonthKey();
  const [usersResult, syncResult, usage, errors] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin
      .from("sync_entities")
      .select("user_id,entity_type,deleted,updated_at", { count: "exact" })
      .limit(10000),
    fetchUsageFallback(admin, monthKey),
    fetchErrorsFallback(admin),
  ]);

  const users = usersResult.data?.users ?? [];
  const usersTotal =
    usersResult.data &&
    "total" in usersResult.data &&
    typeof usersResult.data.total === "number"
      ? usersResult.data.total
      : users.length;
  const syncRows = (syncResult.data ?? []) as FallbackSyncRow[];
  const syncCount = syncResult.count ?? syncRows.length;
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;
  const activeUsers7d = users.filter((user) => {
    const value = toTime(user.last_sign_in_at ?? null);
    return value > 0 && nowMs - value <= weekMs;
  }).length;
  const activeUsers30d = users.filter((user) => {
    const value = toTime(user.last_sign_in_at ?? null);
    return value > 0 && nowMs - value <= monthMs;
  }).length;
  const newUsers7d = users.filter((user) => {
    const value = toTime(user.created_at ?? null);
    return value > 0 && nowMs - value <= weekMs;
  }).length;

  const usersById = new Map(users.map((user) => [user.id, user.email ?? "Sin email"]));
  const entityTypes = new Map<string, { rows: number; deletedRows: number }>();
  const topUsers = new Map<
    string,
    {
      userId: string;
      email: string;
      rowCount: number;
      deletedRows: number;
      latestSyncAt: string | null;
      documentRows: number;
      customerRows: number;
      expenseRows: number;
      productRows: number;
    }
  >();
  const syncUsers24h = new Set<string>();
  const syncUsers7d = new Set<string>();
  let deletedRows = 0;
  let updated24h = 0;
  let updated7d = 0;
  let latestSyncAt: string | null = null;

  for (const row of syncRows) {
    const entityType = row.entity_type ?? "desconocido";
    const deleted = row.deleted === true;
    const updatedAtMs = toTime(row.updated_at);
    if (deleted) deletedRows += 1;
    if (updatedAtMs > toTime(latestSyncAt)) latestSyncAt = row.updated_at;
    if (updatedAtMs > 0 && nowMs - updatedAtMs <= dayMs) {
      updated24h += 1;
      if (row.user_id) syncUsers24h.add(row.user_id);
    }
    if (updatedAtMs > 0 && nowMs - updatedAtMs <= weekMs) {
      updated7d += 1;
      if (row.user_id) syncUsers7d.add(row.user_id);
    }

    const typeStats = entityTypes.get(entityType) ?? { rows: 0, deletedRows: 0 };
    typeStats.rows += 1;
    if (deleted) typeStats.deletedRows += 1;
    entityTypes.set(entityType, typeStats);

    const userId = row.user_id ?? "sin-usuario";
    const stats =
      topUsers.get(userId) ??
      {
        userId,
        email: usersById.get(userId) ?? "Sin email",
        rowCount: 0,
        deletedRows: 0,
        latestSyncAt: null,
        documentRows: 0,
        customerRows: 0,
        expenseRows: 0,
        productRows: 0,
      };
    stats.rowCount += 1;
    if (deleted) stats.deletedRows += 1;
    if (updatedAtMs > toTime(stats.latestSyncAt)) stats.latestSyncAt = row.updated_at;
    if (
      ["documents", "document", "invoice", "invoices", "quote", "quotes", "receipt", "receipts"].includes(
        entityType,
      )
    ) {
      stats.documentRows += 1;
    }
    if (["customers", "customer", "clients", "client"].includes(entityType)) {
      stats.customerRows += 1;
    }
    if (
      ["expenses", "expense", "fixedExpenses", "fixed_expenses"].includes(entityType)
    ) {
      stats.expenseRows += 1;
    }
    if (["products", "product"].includes(entityType)) {
      stats.productRows += 1;
    }
    topUsers.set(userId, stats);
  }

  const unresolvedErrors = errors.filter((row) => !row.resolved_at);
  const errors24h = unresolvedErrors.filter((row) => {
    const value = toTime(row.created_at);
    return value > 0 && nowMs - value <= dayMs;
  });
  const errors7d = unresolvedErrors.filter((row) => {
    const value = toTime(row.created_at);
    return value > 0 && nowMs - value <= weekMs;
  });
  const latestErrorAt =
    unresolvedErrors
      .map((row) => row.created_at)
      .sort((a, b) => toTime(b) - toTime(a))[0] ?? null;

  const firstHour = new Date(now);
  firstHour.setMinutes(0, 0, 0);
  firstHour.setHours(firstHour.getHours() - 23);
  const hourly = Array.from({ length: 24 }, (_, index) => {
    const hour = new Date(firstHour);
    hour.setHours(firstHour.getHours() + index);
    const next = new Date(hour);
    next.setHours(hour.getHours() + 1);
    const start = hour.getTime();
    const end = next.getTime();
    return {
      hour: hourStartIso(hour),
      syncUpdates: syncRows.filter((row) => {
        const value = toTime(row.updated_at);
        return value >= start && value < end;
      }).length,
      errors: unresolvedErrors.filter((row) => {
        const value = toTime(row.created_at);
        return value >= start && value < end;
      }).length,
    };
  });

  return {
    generatedAt: now.toISOString(),
    database: {
      bytes: syncCount * 8192,
      limitBytes: 8 * 1024 * 1024 * 1024,
    },
    users: {
      total: usersTotal,
      active7d: activeUsers7d,
      active30d: activeUsers30d,
      new7d: newUsers7d,
    },
    sync: {
      rows: syncCount,
      deletedRows,
      cloudUsers: new Set(syncRows.map((row) => row.user_id).filter(Boolean)).size,
      updated24h,
      updated7d,
      activeUsers24h: syncUsers24h.size,
      activeUsers7d: syncUsers7d.size,
      latestSyncAt,
    },
    usage,
    errors: {
      last24h: errors24h.length,
      last7d: errors7d.length,
      latestAt: latestErrorAt,
    },
    entityTypes: Array.from(entityTypes.entries())
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.rows - a.rows)
      .slice(0, 12),
    topUsers: Array.from(topUsers.values())
      .sort((a, b) => b.rowCount - a.rowCount)
      .slice(0, 8),
    hourly,
  };
}

export async function GET(request: Request) {
  const requester = await getUserFromBearer(request.headers.get("authorization"));
  if (!requester) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isAdminUser(requester)) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Servidor admin no disponible" },
      { status: 503 },
    );
  }

  const { data, error } = await admin.rpc("admin_health_snapshot");
  if (error) {
    if (isHealthSchemaFallbackError(error)) {
      const fallback = await buildFallbackRawHealth(admin);
      return NextResponse.json({
        health: buildAdminHealthSnapshot(fallback),
        monitoringAvailable: true,
        degraded: true,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    health: buildAdminHealthSnapshot(data),
    monitoringAvailable: true,
  });
}
