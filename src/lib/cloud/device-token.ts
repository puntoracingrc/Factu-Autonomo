export const CLOUD_DEVICE_TOKEN_STORAGE_KEY =
  "factura-autonomo-cloud-device-token-v1";

export const CLOUD_DEVICE_TOKEN_HEADER = "X-Factu-Device-Token";

export function isValidCloudDeviceToken(value: string | null): value is string {
  return Boolean(value && value.length >= 32 && value.length <= 256);
}

export function getOrCreateLocalCloudDeviceToken(): string {
  const existing = localStorage.getItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY);
  if (isValidCloudDeviceToken(existing)) return existing;

  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  localStorage.setItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY, token);
  return token;
}

export function getLocalCloudDeviceToken(): string | null {
  const existing = localStorage.getItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY);
  return isValidCloudDeviceToken(existing) ? existing : null;
}

export function forgetLocalCloudDeviceToken(): void {
  localStorage.removeItem(CLOUD_DEVICE_TOKEN_STORAGE_KEY);
}
