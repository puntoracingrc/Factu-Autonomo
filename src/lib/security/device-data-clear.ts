import { DRIVE_BACKUP_SETTINGS_KEY } from "@/lib/google-drive/backup";
import { FISCAL_CALENDAR_REMINDER_STORAGE_KEY } from "@/lib/fiscal-calendar/reminder-draft";
import {
  cloudDeviceTokenStorageKey,
} from "@/lib/cloud/device-token";
import { workspaceScopedBrowserStorageKey } from "@/lib/workspace-owner-runtime";

const RENTABILIDAD_REAL_PREFIX = "fa_rentabilidad_real_";
const SYNC_PENDING_KEY = "factura-autonomo-sync-pending";
const REMINDERS_LAST_SEEN_KEY = "factu-reminders-last-seen";

interface ClearableStorage {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export interface DeviceDataClearResult {
  ok: boolean;
  removedLocalKeys: string[];
}

export function clearSecondaryDeviceData(
  userId: string,
  local: ClearableStorage = localStorage,
  session: ClearableStorage = sessionStorage,
): DeviceDataClearResult {
  const scoped = (key: string) =>
    workspaceScopedBrowserStorageKey(key, userId);
  const keys = new Set([
    scoped(DRIVE_BACKUP_SETTINGS_KEY),
    cloudDeviceTokenStorageKey(userId),
    scoped(FISCAL_CALENDAR_REMINDER_STORAGE_KEY),
    scoped(REMINDERS_LAST_SEEN_KEY),
    scoped(SYNC_PENDING_KEY),
    scoped("factu.dashboard.visual-cache.v1"),
    scoped("factura-autonomo-ai-consent"),
    scoped("factu:central-invoice-authority:form-last-known-guard:v1"),
    `factura-autonomo-local-data-handoff:${userId}`,
  ]);
  const ownerSuffix = `:workspace:${encodeURIComponent(userId)}`;

  try {
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (
        key?.startsWith(RENTABILIDAD_REAL_PREFIX) &&
        key.endsWith(ownerSuffix)
      ) {
        keys.add(key);
      }
    }

    for (const key of keys) local.removeItem(key);
    const sessionKeys = new Set<string>();
    for (let index = 0; index < session.length; index += 1) {
      const key = session.key(index);
      if (key?.endsWith(ownerSuffix)) sessionKeys.add(key);
    }
    for (const key of sessionKeys) session.removeItem(key);
    return { ok: true, removedLocalKeys: Array.from(keys) };
  } catch {
    return { ok: false, removedLocalKeys: [] };
  }
}
