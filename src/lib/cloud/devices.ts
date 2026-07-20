import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanLimits, type PlanId } from "@/lib/billing/plans";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const USER_DEVICES_TABLE = "user_devices";

export type CloudDeviceKind = "computer" | "mobile" | "tablet" | "unknown";
export type CloudDeviceStatus = "active" | "revoked";

export interface CloudDeviceRecord {
  id: string;
  name: string;
  kind: CloudDeviceKind;
  status: CloudDeviceStatus;
  createdAt: string;
  lastSeenAt: string;
  lastSyncAt: string | null;
  revokedAt: string | null;
  isCurrent: boolean;
}

export type CloudDeviceAccessResult =
  | {
      allowed: true;
      plan: PlanId;
      limit: number | null;
      device: CloudDeviceRecord;
      devices: CloudDeviceRecord[];
    }
  | {
      allowed: false;
      plan: PlanId;
      limit: number | null;
      reason: "cloud_not_in_plan" | "device_limit_reached" | "device_revoked";
      message: string;
      devices: CloudDeviceRecord[];
    };

interface UserDeviceRow {
  id: string;
  user_id: string;
  token_hash: string;
  name: string | null;
  kind: string | null;
  status: string | null;
  created_at: string;
  last_seen_at: string;
  last_sync_at: string | null;
  revoked_at: string | null;
}

interface EnsureCloudDeviceInput {
  userId: string;
  token: string;
  name?: string;
  userAgent?: string;
  markSynced?: boolean;
}

interface ListCloudDevicesInput {
  userId: string;
  token?: string;
}

interface RevokeCloudDeviceInput {
  userId: string;
  deviceId: string;
  currentToken?: string;
}

interface RevokeCurrentCloudDeviceInput {
  userId: string;
  currentToken: string;
}

function tableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /relation .*user_devices.* does not exist/i.test(error.message ?? "")
  );
}

export function cloudDeviceLimitForPlan(plan: PlanId): number | null {
  return getPlanLimits(plan).maxCloudDevices;
}

export function hashCloudDeviceToken(token: string): string {
  return createHash("sha256")
    .update(`factu-cloud-device-v1:${token}`)
    .digest("hex");
}

export function normalizeCloudDeviceToken(token: string | null | undefined) {
  const value = token?.trim() ?? "";
  return value.length >= 32 && value.length <= 256 ? value : null;
}

export function inferCloudDeviceKind(userAgent = ""): CloudDeviceKind {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua) && !/ipad|tablet/.test(ua)) {
    return "mobile";
  }
  if (/macintosh|windows|linux|cros/.test(ua)) return "computer";
  return "unknown";
}

export function defaultCloudDeviceName(kind: CloudDeviceKind): string {
  if (kind === "mobile") return "Movil";
  if (kind === "tablet") return "Tablet";
  if (kind === "computer") return "Ordenador";
  return "Dispositivo";
}

export function sanitizeCloudDeviceName(
  value: string | null | undefined,
  fallback: string,
): string {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, 60);
}

async function effectivePlanForUser(userId: string): Promise<PlanId> {
  return resolveEffectivePlan(await fetchUserSubscriptionServer(userId));
}

function mapDeviceRow(
  row: UserDeviceRow,
  currentHash: string | null,
): CloudDeviceRecord {
  const kind = isCloudDeviceKind(row.kind) ? row.kind : "unknown";
  return {
    id: row.id,
    name: sanitizeCloudDeviceName(row.name, defaultCloudDeviceName(kind)),
    kind,
    status: row.status === "revoked" ? "revoked" : "active",
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    lastSyncAt: row.last_sync_at,
    revokedAt: row.revoked_at,
    isCurrent: Boolean(currentHash && row.token_hash === currentHash),
  };
}

function isCloudDeviceKind(value: unknown): value is CloudDeviceKind {
  return (
    value === "computer" ||
    value === "mobile" ||
    value === "tablet" ||
    value === "unknown"
  );
}

async function selectDeviceRows(
  admin: SupabaseClient,
  userId: string,
): Promise<UserDeviceRow[]> {
  const { data, error } = await admin
    .from(USER_DEVICES_TABLE)
    .select(
      "id,user_id,token_hash,name,kind,status,created_at,last_seen_at,last_sync_at,revoked_at",
    )
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });

  if (tableMissing(error)) return [];
  if (error) throw new Error(error.message);
  return ([...(data ?? [])] as UserDeviceRow[]).sort(
    (left, right) =>
      right.last_seen_at.localeCompare(left.last_seen_at) ||
      right.created_at.localeCompare(left.created_at) ||
      right.id.localeCompare(left.id),
  );
}

function activeDevices(rows: readonly UserDeviceRow[]): UserDeviceRow[] {
  return rows.filter((row) => row.status !== "revoked");
}

function unavailableResult(
  plan: PlanId,
  currentHash: string | null,
  rows: readonly UserDeviceRow[],
): CloudDeviceAccessResult {
  return {
    allowed: false,
    plan,
    limit: cloudDeviceLimitForPlan(plan),
    reason: "cloud_not_in_plan",
    message:
      "El plan Gratis guarda los datos solo en este dispositivo. Activa Pro para sincronizar movil y ordenador.",
    devices: rows.map((row) => mapDeviceRow(row, currentHash)),
  };
}

export async function listCloudDevicesForUser({
  userId,
  token,
}: ListCloudDevicesInput): Promise<{
  plan: PlanId;
  limit: number | null;
  devices: CloudDeviceRecord[];
}> {
  const plan = await effectivePlanForUser(userId);
  const admin = getSupabaseAdmin();
  if (!admin)
    return { plan, limit: cloudDeviceLimitForPlan(plan), devices: [] };
  const currentHash = normalizeCloudDeviceToken(token)
    ? hashCloudDeviceToken(token!)
    : null;
  const rows = await selectDeviceRows(admin, userId);
  return {
    plan,
    limit: cloudDeviceLimitForPlan(plan),
    devices: rows.map((row) => mapDeviceRow(row, currentHash)),
  };
}

export async function ensureCloudDeviceAccess({
  userId,
  token,
  name,
  userAgent,
  markSynced = false,
}: EnsureCloudDeviceInput): Promise<CloudDeviceAccessResult> {
  const normalizedToken = normalizeCloudDeviceToken(token);
  if (!normalizedToken) {
    throw new Error("Identificador de dispositivo no valido");
  }

  const plan = await effectivePlanForUser(userId);
  const limit = cloudDeviceLimitForPlan(plan);
  const currentHash = hashCloudDeviceToken(normalizedToken);
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Servidor de dispositivos no disponible");
  }

  const rows = await selectDeviceRows(admin, userId);
  if (!limit || limit <= 0) {
    return unavailableResult(plan, currentHash, rows);
  }

  const now = new Date().toISOString();
  const current = rows.find((row) => row.token_hash === currentHash);
  if (current?.status === "revoked") {
    return {
      allowed: false,
      plan,
      limit,
      reason: "device_revoked",
      message:
        "Este dispositivo fue desactivado para tu cuenta. Entra desde otro dispositivo activo o contacta con soporte.",
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }

  const activeRows = activeDevices(rows);
  const activeDeviceIdsWithinPlan = new Set(
    activeRows.slice(0, limit).map((row) => row.id),
  );
  if (current && !activeDeviceIdsWithinPlan.has(current.id)) {
    return {
      allowed: false,
      plan,
      limit,
      reason: "device_limit_reached",
      message:
        "Este dispositivo queda fuera del limite actual de tu plan. Desactiva otro dispositivo desde Cuenta para liberar una plaza.",
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }

  const kind = inferCloudDeviceKind(userAgent);
  const displayName = sanitizeCloudDeviceName(
    name,
    defaultCloudDeviceName(kind),
  );

  if (current) {
    const { error } = await admin
      .from(USER_DEVICES_TABLE)
      .update({
        name: displayName,
        kind,
        last_seen_at: now,
        ...(markSynced ? { last_sync_at: now } : {}),
      })
      .eq("user_id", userId)
      .eq("id", current.id);
    if (error && !tableMissing(error)) throw new Error(error.message);
    const refreshed = await selectDeviceRows(admin, userId);
    const device = refreshed.find((row) => row.token_hash === currentHash);
    return {
      allowed: true,
      plan,
      limit,
      device: mapDeviceRow(device ?? current, currentHash),
      devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
    };
  }

  if (activeRows.length >= limit) {
    return {
      allowed: false,
      plan,
      limit,
      reason: "device_limit_reached",
      message:
        "Has alcanzado el limite de dispositivos de tu plan. Desactiva uno anterior desde Cuenta para sincronizar este dispositivo.",
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }

  const { data, error } = await admin
    .from(USER_DEVICES_TABLE)
    .insert({
      user_id: userId,
      token_hash: currentHash,
      name: displayName,
      kind,
      status: "active",
      last_seen_at: now,
      last_sync_at: markSynced ? now : null,
    })
    .select(
      "id,user_id,token_hash,name,kind,status,created_at,last_seen_at,last_sync_at,revoked_at",
    )
    .single();
  if (error) {
    const refreshed = await selectDeviceRows(admin, userId);
    const racedCurrent = refreshed.find(
      (row) => row.token_hash === currentHash,
    );
    if (racedCurrent?.status === "revoked") {
      return {
        allowed: false,
        plan,
        limit,
        reason: "device_revoked",
        message:
          "Este dispositivo fue desactivado para tu cuenta. Entra desde otro dispositivo activo o contacta con soporte.",
        devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
      };
    }
    const authorizedIds = new Set(
      activeDevices(refreshed)
        .slice(0, limit)
        .map((row) => row.id),
    );
    if (racedCurrent && authorizedIds.has(racedCurrent.id)) {
      return {
        allowed: true,
        plan,
        limit,
        device: mapDeviceRow(racedCurrent, currentHash),
        devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
      };
    }
    if (/cloud_device_limit_reached/i.test(error.message)) {
      return {
        allowed: false,
        plan,
        limit,
        reason: "device_limit_reached",
        message:
          "Has alcanzado el limite de dispositivos de tu plan. Desactiva uno anterior desde Cuenta para sincronizar este dispositivo.",
        devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
      };
    }
    if (/cloud_not_in_plan/i.test(error.message)) {
      const currentPlan = await effectivePlanForUser(userId);
      return unavailableResult(currentPlan, currentHash, refreshed);
    }
    throw new Error(error.message);
  }

  const refreshed = await selectDeviceRows(admin, userId);
  return {
    allowed: true,
    plan,
    limit,
    device: mapDeviceRow(data as UserDeviceRow, currentHash),
    devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
  };
}

export async function revokeCloudDeviceForUser({
  userId,
  deviceId,
  currentToken,
}: RevokeCloudDeviceInput): Promise<
  | {
      ok: true;
      devices: CloudDeviceRecord[];
    }
  | {
      ok: false;
      error: string;
      devices: CloudDeviceRecord[];
    }
> {
  const admin = getSupabaseAdmin();
  if (!admin)
    return { ok: false, error: "Servidor no disponible", devices: [] };
  const currentHash = normalizeCloudDeviceToken(currentToken)
    ? hashCloudDeviceToken(currentToken!)
    : null;
  const rows = await selectDeviceRows(admin, userId);
  const target = rows.find((row) => row.id === deviceId);
  if (!target || target.status === "revoked") {
    return {
      ok: false,
      error: "El dispositivo ya no esta activo.",
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }
  if (currentHash && target.token_hash === currentHash) {
    return {
      ok: false,
      error:
        "No desactives este dispositivo desde aqui. Cierra sesion y borra este dispositivo si quieres retirarlo.",
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from(USER_DEVICES_TABLE)
    .update({ status: "revoked", revoked_at: now })
    .eq("user_id", userId)
    .eq("id", deviceId);
  if (error) throw new Error(error.message);
  const refreshed = await selectDeviceRows(admin, userId);
  return {
    ok: true,
    devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
  };
}

export async function revokeCurrentCloudDeviceForUser({
  userId,
  currentToken,
}: RevokeCurrentCloudDeviceInput): Promise<
  | { ok: true; devices: CloudDeviceRecord[] }
  | { ok: false; error: string; devices: CloudDeviceRecord[] }
> {
  const normalizedToken = normalizeCloudDeviceToken(currentToken);
  if (!normalizedToken) {
    return {
      ok: false,
      error: "Identificador de dispositivo no valido.",
      devices: [],
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin)
    return { ok: false, error: "Servidor no disponible", devices: [] };
  const currentHash = hashCloudDeviceToken(normalizedToken);
  const rows = await selectDeviceRows(admin, userId);
  const current = rows.find((row) => row.token_hash === currentHash);
  if (!current) {
    return {
      ok: false,
      error: "Este dispositivo no figura como activo en la cuenta.",
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }
  if (current.status === "revoked") {
    return {
      ok: true,
      devices: rows.map((row) => mapDeviceRow(row, currentHash)),
    };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from(USER_DEVICES_TABLE)
    .update({ status: "revoked", revoked_at: now })
    .eq("user_id", userId)
    .eq("id", current.id);
  if (error) throw new Error(error.message);
  const refreshed = await selectDeviceRows(admin, userId);
  return {
    ok: true,
    devices: refreshed.map((row) => mapDeviceRow(row, currentHash)),
  };
}
