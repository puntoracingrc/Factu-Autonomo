import type { CloudDeviceRecord } from "@/lib/cloud/devices";
import {
  CLOUD_DEVICE_TOKEN_HEADER,
  forgetLocalCloudDeviceToken,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

export interface CloudDeviceApiPayload {
  plan: string;
  limit: number | null;
  devices: CloudDeviceRecord[];
  device?: CloudDeviceRecord;
  allowed?: boolean;
  reason?: string;
  message?: string;
  error?: string;
}

async function authToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function cloudDeviceHeaders(): Promise<HeadersInit | null> {
  const token = await authToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    [CLOUD_DEVICE_TOKEN_HEADER]: getOrCreateLocalCloudDeviceToken(),
  };
}

async function parsePayload(
  response: Response,
): Promise<CloudDeviceApiPayload> {
  const payload = (await response
    .json()
    .catch(() => null)) as CloudDeviceApiPayload | null;
  if (payload && Array.isArray(payload.devices)) return payload;
  return {
    plan: "free",
    limit: 0,
    devices: [],
    error: response.ok
      ? "La respuesta de dispositivos no es válida."
      : "No se pudo completar la operación de dispositivos.",
  };
}

async function requestCloudDevices(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<CloudDeviceApiPayload> {
  try {
    return await parsePayload(await fetch(input, init));
  } catch {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "No se pudo conectar con la gestión de dispositivos.",
    };
  }
}

export async function registerCurrentCloudDevice(
  options: {
    markSynced?: boolean;
  } = {},
): Promise<CloudDeviceApiPayload> {
  const headers = await cloudDeviceHeaders();
  if (!headers) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      allowed: false,
      error: "Inicia sesion para registrar este dispositivo.",
    };
  }
  return requestCloudDevices("/api/cloud/devices", {
    method: "POST",
    headers,
    body: JSON.stringify({
      markSynced: options.markSynced === true,
    }),
  });
}

export async function listCloudDevices(): Promise<CloudDeviceApiPayload> {
  const headers = await cloudDeviceHeaders();
  if (!headers) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "Inicia sesion para ver tus dispositivos.",
    };
  }
  return requestCloudDevices("/api/cloud/devices", { headers });
}

export async function revokeCloudDevice(
  deviceId: string,
): Promise<CloudDeviceApiPayload> {
  const headers = await cloudDeviceHeaders();
  if (!headers) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "Inicia sesion para desactivar dispositivos.",
    };
  }
  return requestCloudDevices(`/api/cloud/devices/${deviceId}`, {
    method: "DELETE",
    headers,
  });
}

export async function retireCurrentCloudDevice(): Promise<CloudDeviceApiPayload> {
  const headers = await cloudDeviceHeaders();
  if (!headers) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "Inicia sesion para retirar este dispositivo.",
    };
  }
  const result = await requestCloudDevices("/api/cloud/devices", {
    method: "DELETE",
    headers,
  });
  if (!result.error) forgetLocalCloudDeviceToken();
  return result;
}
