import {
  getActiveWorkspaceOwnerScope,
  workspaceScopedBrowserStorageKey,
} from "@/lib/workspace-owner-runtime";

export const CLOUD_DEVICE_TOKEN_STORAGE_KEY =
  "factura-autonomo-cloud-device-token-v1";

export const CLOUD_DEVICE_TOKEN_HEADER = "X-Factu-Device-Token";

export function isValidCloudDeviceToken(value: string | null): value is string {
  return Boolean(value && value.length >= 32 && value.length <= 256);
}

export function cloudDeviceTokenStorageKey(
  ownerScope: string | null = getActiveWorkspaceOwnerScope(),
): string {
  return workspaceScopedBrowserStorageKey(
    CLOUD_DEVICE_TOKEN_STORAGE_KEY,
    ownerScope,
  );
}

function migrateLegacyDeviceTokenForOwner(storageKey: string): string | null {
  if (storageKey === CLOUD_DEVICE_TOKEN_STORAGE_KEY) return null;
  const legacy = localStorage.getItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY);
  if (!isValidCloudDeviceToken(legacy)) return null;
  localStorage.setItem(storageKey, legacy);
  if (localStorage.getItem(storageKey) !== legacy) return null;
  if (localStorage.getItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY) === legacy) {
    localStorage.removeItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY);
  }
  return legacy;
}

export function claimLegacyLocalCloudDeviceToken(ownerScope: string): boolean {
  const normalizedOwner = ownerScope.trim();
  if (!normalizedOwner) return false;
  const storageKey = cloudDeviceTokenStorageKey(normalizedOwner);
  const existing = localStorage.getItem(storageKey);
  if (isValidCloudDeviceToken(existing)) return true;
  return Boolean(migrateLegacyDeviceTokenForOwner(storageKey));
}

export function getOrCreateLocalCloudDeviceToken(
  ownerScope: string | null = getActiveWorkspaceOwnerScope(),
): string {
  const storageKey = cloudDeviceTokenStorageKey(ownerScope);
  const existing = localStorage.getItem(storageKey);
  if (isValidCloudDeviceToken(existing)) return existing;

  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  localStorage.setItem(storageKey, token);
  return token;
}

export function getLocalCloudDeviceToken(
  ownerScope: string | null = getActiveWorkspaceOwnerScope(),
): string | null {
  const storageKey = cloudDeviceTokenStorageKey(ownerScope);
  const existing = localStorage.getItem(storageKey);
  return isValidCloudDeviceToken(existing) ? existing : null;
}

export function forgetLocalCloudDeviceToken(
  ownerScope: string | null = getActiveWorkspaceOwnerScope(),
): void {
  localStorage.removeItem(cloudDeviceTokenStorageKey(ownerScope));
}
