import { workspaceScopedBrowserStorageKey } from "@/lib/workspace-owner-runtime";

const EXACT_ACCOUNT_KEYS = [
  "factura-autonomo-drive-backup",
  "factu:fiscal-calendar:reminder-draft:v1",
  "factu-reminders-last-seen",
  "factura-autonomo-sync-pending",
  "factu.dashboard.visual-cache.v1",
  "factura-autonomo-ai-consent",
  "factu:central-invoice-authority:form-last-known-guard:v1",
] as const;
const ACCOUNT_KEY_PREFIXES = ["fa_rentabilidad_real_"] as const;
const SESSION_ACCOUNT_KEYS = [
  "factura-autonomo-drive-backup-pending",
  "fa_rentabilidad_real_advisor_validation_notice",
  "factu:product-document-draft:v1",
  "factu:document-product-return:v1",
  "factu:document-product-pick:v1",
  "factu:document-product-picked-line:v1",
  "factu:product-catalog-edit-request:v1",
  "factu-quick-post-it-v1",
] as const;
const SESSION_ACCOUNT_KEY_PREFIXES = [
  "factu:document-session-draft:v1:",
] as const;

interface EnumerableStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkspaceAuxiliaryClaimResult {
  ok: boolean;
  migratedKeys: string[];
}

function isLegacyAccountKey(key: string): boolean {
  return (
    EXACT_ACCOUNT_KEYS.includes(key as (typeof EXACT_ACCOUNT_KEYS)[number]) ||
    ACCOUNT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

export function claimLegacyWorkspaceAuxiliaryStorage(
  ownerScope: string,
  storage: EnumerableStorage = localStorage,
): WorkspaceAuxiliaryClaimResult {
  const candidates = new Set<string>(EXACT_ACCOUNT_KEYS);
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && isLegacyAccountKey(key)) candidates.add(key);
    }

    const migratedKeys: string[] = [];
    for (const baseKey of candidates) {
      const raw = storage.getItem(baseKey);
      if (raw === null) continue;
      const scopedKey = workspaceScopedBrowserStorageKey(baseKey, ownerScope);
      const existing = storage.getItem(scopedKey);
      if (existing !== null && existing !== raw) continue;
      storage.setItem(scopedKey, raw);
      if (storage.getItem(scopedKey) !== raw) {
        return { ok: false, migratedKeys };
      }
      if (storage.getItem(baseKey) === raw) storage.removeItem(baseKey);
      migratedKeys.push(baseKey);
    }
    return { ok: true, migratedKeys };
  } catch {
    return { ok: false, migratedKeys: [] };
  }
}

export function claimLegacyWorkspaceAuxiliarySessionStorage(
  ownerScope: string,
  storage: EnumerableStorage = sessionStorage,
): WorkspaceAuxiliaryClaimResult {
  const migratedKeys: string[] = [];
  try {
    const candidates = new Set<string>(SESSION_ACCOUNT_KEYS);
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (
        key &&
        SESSION_ACCOUNT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        candidates.add(key);
      }
    }
    for (const baseKey of candidates) {
      const raw = storage.getItem(baseKey);
      if (raw === null) continue;
      const scopedKey = workspaceScopedBrowserStorageKey(baseKey, ownerScope);
      const existing = storage.getItem(scopedKey);
      if (existing !== null && existing !== raw) continue;
      storage.setItem(scopedKey, raw);
      if (storage.getItem(scopedKey) !== raw) {
        return { ok: false, migratedKeys };
      }
      if (storage.getItem(baseKey) === raw) storage.removeItem(baseKey);
      migratedKeys.push(baseKey);
    }
    return { ok: true, migratedKeys };
  } catch {
    return { ok: false, migratedKeys };
  }
}
