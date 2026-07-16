"use client";

import {
  normalizeTaxProductEvent,
  type TaxProductEventInput,
} from "./contracts";

const SESSION_KEY = "factu-tax-diagnostic-telemetry-session-v1";
const STARTED_AT_KEY = "factu-tax-diagnostic-telemetry-start-v1";
const SEEN_PREFIX = "factu-tax-diagnostic-telemetry-seen-v1";
let fallbackSessionId: string | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-000000000000";
}

function sessionStorageOrNull(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getTaxProductTelemetrySessionId(): string {
  const storage = sessionStorageOrNull();
  const stored = storage?.getItem(SESSION_KEY);
  if (stored) return stored;
  fallbackSessionId ??= randomId();
  storage?.setItem(SESSION_KEY, fallbackSessionId);
  storage?.setItem(STARTED_AT_KEY, String(Date.now()));
  return fallbackSessionId;
}

export function getTaxProductTelemetryStartedAt(): number {
  const storage = sessionStorageOrNull();
  const stored = Number(storage?.getItem(STARTED_AT_KEY));
  if (Number.isFinite(stored) && stored > 0) return stored;
  const now = Date.now();
  storage?.setItem(STARTED_AT_KEY, String(now));
  return now;
}

export function resetTaxProductTelemetrySession(): void {
  const storage = sessionStorageOrNull();
  if (storage) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key));
    for (const key of keys) {
      if (key === SESSION_KEY || key === STARTED_AT_KEY || key.startsWith(SEEN_PREFIX)) {
        storage.removeItem(key);
      }
    }
  }
  fallbackSessionId = null;
}

export interface RecordTaxProductEventOptions {
  dedupeKey?: string;
}

export function getTaxProductDeviceCategory() {
  if (typeof window === "undefined") return "UNKNOWN" as const;
  const width = Math.max(window.innerWidth || 0, window.screen?.width || 0);
  if (width < 640) return "MOBILE" as const;
  if (width < 1024) return "TABLET" as const;
  return "DESKTOP" as const;
}

export async function recordTaxProductEvent(
  input: Omit<TaxProductEventInput, "id" | "occurredAt" | "sessionId">,
  options: RecordTaxProductEventOptions = {},
): Promise<boolean> {
  try {
    const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
    const supabase = await getSupabaseClientAsync();
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const sessionId = getTaxProductTelemetrySessionId();
    const storage = sessionStorageOrNull();
    const seenKey = options.dedupeKey
      ? `${SEEN_PREFIX}:${sessionId}:${options.dedupeKey}`
      : null;
    if (seenKey && storage?.getItem(seenKey) === "1") return true;

    const event = normalizeTaxProductEvent({
      ...input,
      deviceCategory: input.deviceCategory ?? getTaxProductDeviceCategory(),
      id: randomId(),
      occurredAt: new Date().toISOString(),
      sessionId,
    });
    if (!event) return false;
    if (seenKey) storage?.setItem(seenKey, "1");

    void fetch("/api/tax-diagnostic/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
