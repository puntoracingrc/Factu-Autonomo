export type AdminHealthLevel = "ok" | "watch" | "action";

export interface AdminHealthCheck {
  id: string;
  label: string;
  level: AdminHealthLevel;
  value: string;
  detail: string;
}

export interface AdminHealthEntityType {
  type: string;
  rows: number;
  deletedRows: number;
}

export interface AdminHealthTopUser {
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

export interface AdminHealthHourlyPoint {
  hour: string;
  syncUpdates: number;
  errors: number;
}

export interface AdminHealthAbuseNamespace {
  namespace: string;
  label: string;
  level: AdminHealthLevel;
  buckets: number;
  requests: number;
  maxRequests: number;
  latestAt: string | null;
  detail: string;
}

export interface AdminHealthAbuseSummary {
  level: AdminHealthLevel;
  label: string;
  headline: string;
  totalBuckets: number;
  totalRequests: number;
  latestAt: string | null;
  namespaces: AdminHealthAbuseNamespace[];
}

export interface AdminHealthSnapshot {
  generatedAt: string;
  level: AdminHealthLevel;
  label: string;
  headline: string;
  plan: {
    supabasePlan: string;
    compute: string;
    includedDatabaseGb: number;
    comfortableActiveUsers: number;
  };
  summary: {
    databaseBytes: number;
    databaseLimitBytes: number;
    databaseUsedPercent: number;
    totalUsers: number;
    activeUsers7d: number;
    activeUsers30d: number;
    newUsers7d: number;
    cloudUsers: number;
    syncRows: number;
    deletedRows: number;
    syncUpdates24h: number;
    syncUpdates7d: number;
    syncActiveUsers24h: number;
    syncActiveUsers7d: number;
    latestSyncAt: string | null;
    errors24h: number;
    errors7d: number;
    latestErrorAt: string | null;
    usageMonthKey: string;
    documentsCreatedThisMonth: number;
    expenseScansThisMonth: number;
    customerAiAutofillsThisMonth: number;
  };
  checks: AdminHealthCheck[];
  entityTypes: AdminHealthEntityType[];
  topUsers: AdminHealthTopUser[];
  hourly: AdminHealthHourlyPoint[];
  abuse: AdminHealthAbuseSummary;
  recommendations: string[];
}

const DATABASE_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;
const COMFORTABLE_ACTIVE_USERS = 300;
const WATCH_ACTIVE_USERS = 200;
const WATCH_ERROR_COUNT = 5;
const ACTION_ERROR_COUNT = 20;
const WATCH_ABUSE_REQUESTS = 60;
const ACTION_ABUSE_REQUESTS = 250;
const WATCH_ABUSE_BUCKETS = 8;
const ACTION_ABUSE_BUCKETS = 25;
const WATCH_ABUSE_MAX_REQUESTS = 30;
const ACTION_ABUSE_MAX_REQUESTS = 120;

const ABUSE_NAMESPACE_LABELS: Record<string, string> = {
  admin_capabilities: "Admin: capacidades",
  admin_ai_learning_correct: "Admin: corregir IA",
  admin_ai_learning_feedback: "Admin: feedback IA",
  admin_errors: "Admin: errores",
  admin_health: "Admin: salud",
  admin_user_mfa: "Admin: MFA usuarios",
  admin_user_restore: "Admin: restauracion",
  admin_users_list: "Admin: usuarios",
  admin_users_update: "Admin: actualizar usuario",
  billing_checkout: "Billing: checkout",
  billing_checkout_scan_pack: "Billing: pack escaneos",
  billing_portal: "Billing: portal",
  billing_trial: "Billing: prueba",
  customers_parse: "IA: parseo clientes",
  email: "Email",
  email_payment_reminder: "Email: recordatorios",
  email_welcome: "Email: bienvenida",
  expense_inbox_read: "Buzon gastos: lectura",
  expense_inbox_rotate_alias: "Buzon gastos: alias",
  expense_inbox_update: "Buzon gastos: configurar",
  expenses_provider_summary: "Gastos: proveedor",
  expenses_scan: "IA: escaneo gastos",
  google_auth_token: "Google Auth",
  google_drive_token: "Google Drive",
  google_places_address_fill: "Google Places",
  imports_review: "Importaciones",
  monitoring_error: "Monitoring",
  referrals_me: "Referidos",
  referrals_redeem: "Referidos: canje",
  reminders_realtime_session: "Recordatorios voz",
  security_csp_report: "CSP reports",
  uploads: "Uploads",
  verifactu_declaration: "VeriFactu: declaracion",
  verifactu_register: "VeriFactu: registro",
  verifactu_status: "VeriFactu: estado",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

function integerValue(value: unknown): number {
  return Math.floor(numberValue(value));
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return value;
}

function levelRank(level: AdminHealthLevel): number {
  if (level === "action") return 2;
  if (level === "watch") return 1;
  return 0;
}

function maxLevel(levels: AdminHealthLevel[]): AdminHealthLevel {
  return levels.reduce<AdminHealthLevel>(
    (highest, level) => (levelRank(level) > levelRank(highest) ? level : highest),
    "ok",
  );
}

function percent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((used / limit) * 1000) / 10;
}

function formatPercentForValue(value: number): string {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;
}

function normalizeEntityType(value: unknown): AdminHealthEntityType {
  const row = asRecord(value);
  return {
    type: String(row.type ?? "desconocido"),
    rows: integerValue(row.rows),
    deletedRows: integerValue(row.deletedRows),
  };
}

function normalizeTopUser(value: unknown): AdminHealthTopUser {
  const row = asRecord(value);
  return {
    userId: String(row.userId ?? ""),
    email: String(row.email ?? "Sin email"),
    rowCount: integerValue(row.rowCount),
    deletedRows: integerValue(row.deletedRows),
    latestSyncAt: stringValue(row.latestSyncAt),
    documentRows: integerValue(row.documentRows),
    customerRows: integerValue(row.customerRows),
    expenseRows: integerValue(row.expenseRows),
    productRows: integerValue(row.productRows),
  };
}

function normalizeHourlyPoint(value: unknown): AdminHealthHourlyPoint {
  const row = asRecord(value);
  return {
    hour: stringValue(row.hour) ?? new Date(0).toISOString(),
    syncUpdates: integerValue(row.syncUpdates),
    errors: integerValue(row.errors),
  };
}

function namespaceLabel(namespace: string): string {
  return ABUSE_NAMESPACE_LABELS[namespace] ?? namespace.replace(/_/g, " ");
}

function abuseNamespaceLevel(
  buckets: number,
  requests: number,
  maxRequests: number,
): AdminHealthLevel {
  if (
    requests >= ACTION_ABUSE_REQUESTS ||
    buckets >= ACTION_ABUSE_BUCKETS ||
    maxRequests >= ACTION_ABUSE_MAX_REQUESTS
  ) {
    return "action";
  }
  if (
    requests >= WATCH_ABUSE_REQUESTS ||
    buckets >= WATCH_ABUSE_BUCKETS ||
    maxRequests >= WATCH_ABUSE_MAX_REQUESTS
  ) {
    return "watch";
  }
  return "ok";
}

function normalizeAbuseNamespace(value: unknown): AdminHealthAbuseNamespace {
  const row = asRecord(value);
  const namespace = String(row.namespace ?? "desconocido");
  const buckets = integerValue(row.buckets);
  const requests = integerValue(row.requests);
  const maxRequests = integerValue(row.maxRequests);
  const level = abuseNamespaceLevel(buckets, requests, maxRequests);

  return {
    namespace,
    label: namespaceLabel(namespace),
    level,
    buckets,
    requests,
    maxRequests,
    latestAt: stringValue(row.latestAt),
    detail: `${buckets.toLocaleString("es-ES")} origen(es) · pico ${maxRequests.toLocaleString(
      "es-ES",
    )}`,
  };
}

function normalizeAbuseSummary(rawValue: unknown): AdminHealthAbuseSummary {
  const raw = asRecord(rawValue);
  const namespaces = asArray(raw.namespaces)
    .map(normalizeAbuseNamespace)
    .sort((a, b) => levelRank(b.level) - levelRank(a.level) || b.requests - a.requests)
    .slice(0, 8);
  const totalBuckets =
    integerValue(raw.totalBuckets) ||
    namespaces.reduce((total, item) => total + item.buckets, 0);
  const totalRequests =
    integerValue(raw.totalRequests) ||
    namespaces.reduce((total, item) => total + item.requests, 0);
  const latestAt =
    stringValue(raw.latestAt) ??
    namespaces
      .map((item) => item.latestAt)
      .filter(Boolean)
      .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] ??
    null;
  const level = maxLevel(namespaces.map((item) => item.level));

  return {
    level,
    label:
      level === "action"
        ? "Ataque probable"
        : level === "watch"
          ? "Vigilar"
          : "Sin señales",
    headline:
      level === "action"
        ? "Hay actividad anómala que conviene revisar."
        : level === "watch"
          ? "Hay más actividad de lo normal en rutas protegidas."
          : "Sin señales claras de scraping o abuso.",
    totalBuckets,
    totalRequests,
    latestAt,
    namespaces,
  };
}

export function isMissingAdminHealthRpc(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    /admin_health_snapshot/i.test(error.message ?? "") &&
      /schema cache|does not exist|not find|function/i.test(error.message ?? "")
  );
}

export function buildAdminHealthSnapshot(rawValue: unknown): AdminHealthSnapshot {
  const raw = asRecord(rawValue);
  const database = asRecord(raw.database);
  const users = asRecord(raw.users);
  const sync = asRecord(raw.sync);
  const errors = asRecord(raw.errors);
  const usage = asRecord(raw.usage);
  const abuse = normalizeAbuseSummary(raw.abuse);
  const generatedAt = stringValue(raw.generatedAt) ?? new Date().toISOString();

  const databaseBytes = integerValue(database.bytes);
  const databaseLimitBytes =
    integerValue(database.limitBytes) > 0
      ? integerValue(database.limitBytes)
      : DATABASE_LIMIT_BYTES;
  const databaseUsedPercent = percent(databaseBytes, databaseLimitBytes);
  const totalUsers = integerValue(users.total);
  const activeUsers7d = integerValue(users.active7d);
  const activeUsers30d = integerValue(users.active30d);
  const newUsers7d = integerValue(users.new7d);
  const cloudUsers = integerValue(sync.cloudUsers);
  const syncRows = integerValue(sync.rows);
  const deletedRows = integerValue(sync.deletedRows);
  const syncUpdates24h = integerValue(sync.updated24h);
  const syncUpdates7d = integerValue(sync.updated7d);
  const syncActiveUsers24h = integerValue(sync.activeUsers24h);
  const syncActiveUsers7d = integerValue(sync.activeUsers7d);
  const latestSyncAt = stringValue(sync.latestSyncAt);
  const errors24h = integerValue(errors.last24h);
  const errors7d = integerValue(errors.last7d);
  const latestErrorAt = stringValue(errors.latestAt);
  const usageMonthKey = String(usage.monthKey ?? "");
  const documentsCreatedThisMonth = integerValue(usage.documentsCreated);
  const expenseScansThisMonth = integerValue(usage.expenseScans);
  const customerAiAutofillsThisMonth = integerValue(usage.customerAiAutofills);

  const storageLevel: AdminHealthLevel =
    databaseUsedPercent >= 80 ? "action" : databaseUsedPercent >= 60 ? "watch" : "ok";
  const capacityLevel: AdminHealthLevel =
    activeUsers30d >= COMFORTABLE_ACTIVE_USERS
      ? "action"
      : activeUsers30d >= WATCH_ACTIVE_USERS
        ? "watch"
        : "ok";
  const errorLevel: AdminHealthLevel =
    errors24h >= ACTION_ERROR_COUNT
      ? "action"
      : errors24h >= WATCH_ERROR_COUNT
        ? "watch"
        : "ok";
  const syncLevel: AdminHealthLevel =
    cloudUsers > 0 && !latestSyncAt ? "watch" : "ok";
  const level = maxLevel([
    storageLevel,
    capacityLevel,
    errorLevel,
    syncLevel,
    abuse.level,
  ]);

  const checks: AdminHealthCheck[] = [
    {
      id: "capacity",
      label: "Capacidad usuarios",
      level: capacityLevel,
      value: `${activeUsers30d}/${COMFORTABLE_ACTIVE_USERS}`,
      detail: "usuarios activos en 30 días frente al umbral cómodo de Micro",
    },
    {
      id: "database",
      label: "Base de datos",
      level: storageLevel,
      value: formatPercentForValue(databaseUsedPercent),
      detail: "uso estimado de base Postgres frente a 8 GB incluidos",
    },
    {
      id: "sync",
      label: "Sincronización",
      level: syncLevel,
      value: syncUpdates24h.toLocaleString("es-ES"),
      detail: "filas cloud actualizadas en las últimas 24 horas",
    },
    {
      id: "errors",
      label: "Errores recientes",
      level: errorLevel,
      value: errors24h.toLocaleString("es-ES"),
      detail: "errores abiertos registrados en las últimas 24 horas",
    },
    {
      id: "abuse",
      label: "Abuso/scraping",
      level: abuse.level,
      value: abuse.totalRequests.toLocaleString("es-ES"),
      detail: "golpes recientes en rutas protegidas por rate limit",
    },
  ];

  const recommendations: string[] = [];
  if (level === "ok") {
    recommendations.push("Vais cómodos con Supabase Pro + Micro.");
  }
  if (capacityLevel === "watch") {
    recommendations.push("Vigilar crecimiento: Micro empieza a acercarse al umbral cómodo.");
  }
  if (capacityLevel === "action") {
    recommendations.push("Planificar subida a Small si la actividad real se mantiene.");
  }
  if (storageLevel !== "ok") {
    recommendations.push("Revisar crecimiento de datos y tablas más grandes.");
  }
  if (errorLevel !== "ok") {
    recommendations.push("Revisar errores recientes antes de escalar usuarios.");
  }
  if (syncLevel !== "ok") {
    recommendations.push("Comprobar sincronización cloud de usuarios activos.");
  }
  if (abuse.level === "watch") {
    recommendations.push("Vigilar señales de abuso: revisar rutas e IPs si se repite.");
  }
  if (abuse.level === "action") {
    recommendations.push("Posible scraping/abuso: revisar logs y valorar WAF/bot protection.");
  }

  return {
    generatedAt,
    level,
    label:
      level === "action" ? "Actuar" : level === "watch" ? "Vigilar" : "Todo bien",
    headline:
      level === "action"
        ? "Hay señales que conviene atender."
        : level === "watch"
          ? "El sistema está bien, con puntos a vigilar."
          : "El sistema va holgado.",
    plan: {
      supabasePlan: "Pro",
      compute: "Micro",
      includedDatabaseGb: 8,
      comfortableActiveUsers: COMFORTABLE_ACTIVE_USERS,
    },
    summary: {
      databaseBytes,
      databaseLimitBytes,
      databaseUsedPercent,
      totalUsers,
      activeUsers7d,
      activeUsers30d,
      newUsers7d,
      cloudUsers,
      syncRows,
      deletedRows,
      syncUpdates24h,
      syncUpdates7d,
      syncActiveUsers24h,
      syncActiveUsers7d,
      latestSyncAt,
      errors24h,
      errors7d,
      latestErrorAt,
      usageMonthKey,
      documentsCreatedThisMonth,
      expenseScansThisMonth,
      customerAiAutofillsThisMonth,
    },
    checks,
    entityTypes: asArray(raw.entityTypes).map(normalizeEntityType),
    topUsers: asArray(raw.topUsers).map(normalizeTopUser),
    hourly: asArray(raw.hourly).map(normalizeHourlyPoint),
    abuse,
    recommendations,
  };
}
