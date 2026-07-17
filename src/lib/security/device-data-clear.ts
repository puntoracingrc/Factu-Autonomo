import { DRIVE_BACKUP_SETTINGS_KEY } from "@/lib/google-drive/backup";
import { FISCAL_CALENDAR_REMINDER_STORAGE_KEY } from "@/lib/fiscal-calendar/reminder-draft";

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
  const keys = new Set([
    DRIVE_BACKUP_SETTINGS_KEY,
    FISCAL_CALENDAR_REMINDER_STORAGE_KEY,
    REMINDERS_LAST_SEEN_KEY,
    SYNC_PENDING_KEY,
    `factura-autonomo-local-data-handoff:${userId}`,
  ]);

  try {
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key?.startsWith(RENTABILIDAD_REAL_PREFIX)) keys.add(key);
    }

    for (const key of keys) local.removeItem(key);
    session.clear();
    return { ok: true, removedLocalKeys: Array.from(keys) };
  } catch {
    return { ok: false, removedLocalKeys: [] };
  }
}
