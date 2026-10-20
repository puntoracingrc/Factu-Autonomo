import type { CloudDeviceRecord } from "@/lib/cloud/devices";
import {
  CLOUD_DEVICE_TOKEN_HEADER,
  forgetLocalCloudDeviceToken,
  getLocalCloudDeviceToken,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import {
  captureActiveWorkspaceOwnerScope,
  getActiveWorkspaceAccessToken,
} from "@/lib/cloud/active-workspace-session";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { notifyCloudDeviceReactivated } from "@/lib/cloud/device-events";

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

interface CloudDeviceCredentials {
  ownerScope: string;
  accessToken: string;
  deviceToken: string;
}

async function cloudDeviceCredentials(
  expectedOwnerScope?: string | null,
): Promise<CloudDeviceCredentials | null> {
  const ownerScope = captureActiveWorkspaceOwnerScope(expectedOwnerScope);
  if (!ownerScope) return null;
  const accessToken = await getActiveWorkspaceAccessToken(ownerScope);
  if (!accessToken) return null;
  const deviceToken = getOrCreateLocalCloudDeviceToken(ownerScope);
  return { ownerScope, accessToken, deviceToken };
}

function cloudDeviceHeaders(credentials: CloudDeviceCredentials): HeadersInit {
  return {
    Authorization: `Bearer ${credentials.accessToken}`,
    [FACTU_COMPANY_HEADER]: credentials.ownerScope,
    "Content-Type": "application/json",
    [CLOUD_DEVICE_TOKEN_HEADER]: credentials.deviceToken,
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
      : typeof payload?.error === "string"
        ? payload.error
        : `No se pudo completar la operación de dispositivos (HTTP ${response.status}).`,
  };
}

// Collapse concurrent startup/foreground claims, not completed authorization.
// Every later operation still reaches the server and rechecks revocation.
const registrationFlights = new Map<string, Promise<CloudDeviceApiPayload>>();

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
    notifyReactivated?: boolean;
    expectedOwnerScope?: string | null;
  } = {},
): Promise<CloudDeviceApiPayload> {
  const credentials = await cloudDeviceCredentials(options.expectedOwnerScope);
  if (!credentials) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      allowed: false,
      error: "Inicia sesion para registrar este dispositivo.",
    };
  }
  const key = JSON.stringify([
    credentials.ownerScope,
    credentials.accessToken,
    credentials.deviceToken,
    options.markSynced === true,
  ]);
  let flight = registrationFlights.get(key);
  if (!flight) {
    flight = requestCloudDevices("/api/cloud/devices", {
      method: "POST",
      headers: cloudDeviceHeaders(credentials),
      body: JSON.stringify({
        markSynced: options.markSynced === true,
      }),
    });
    registrationFlights.set(key, flight);
    const pending = flight;
    void pending.finally(() => {
      if (registrationFlights.get(key) === pending) registrationFlights.delete(key);
    });
  }
  const result = await flight;
  if (
    !result.error &&
    result.allowed !== false &&
    options.notifyReactivated !== false
  ) {
    notifyCloudDeviceReactivated();
  }
  return result;
}

export async function recoverRevokedCloudDeviceAfterFreshSignIn(): Promise<CloudDeviceApiPayload> {
  const ownerScope = captureActiveWorkspaceOwnerScope();
  const current = await registerCurrentCloudDevice({
    expectedOwnerScope: ownerScope,
  });
  if (current.reason !== "device_revoked") return current;

  forgetLocalCloudDeviceToken(ownerScope);
  const replacement = await registerCurrentCloudDevice({
    expectedOwnerScope: ownerScope,
  });
  return replacement;
}

export async function listCloudDevices(): Promise<CloudDeviceApiPayload> {
  const credentials = await cloudDeviceCredentials();
  if (!credentials) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "Inicia sesion para ver tus dispositivos.",
    };
  }
  return requestCloudDevices("/api/cloud/devices", {
    headers: cloudDeviceHeaders(credentials),
  });
}

export async function revokeCloudDevice(
  deviceId: string,
): Promise<CloudDeviceApiPayload> {
  const credentials = await cloudDeviceCredentials();
  if (!credentials) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "Inicia sesion para desactivar dispositivos.",
    };
  }
  return requestCloudDevices(`/api/cloud/devices/${deviceId}`, {
    method: "DELETE",
    headers: cloudDeviceHeaders(credentials),
  });
}

export async function retireCurrentCloudDevice(
  expectedOwnerScope?: string | null,
): Promise<CloudDeviceApiPayload> {
  const credentials = await cloudDeviceCredentials(expectedOwnerScope);
  if (!credentials) {
    return {
      plan: "free",
      limit: 0,
      devices: [],
      error: "Inicia sesion para retirar este dispositivo.",
    };
  }
  const result = await requestCloudDevices("/api/cloud/devices", {
    method: "DELETE",
    headers: cloudDeviceHeaders(credentials),
  });
  if (!result.error) forgetLocalCloudDeviceToken(credentials.ownerScope);
  return result;
}

export async function releaseCurrentCloudDeviceSession(
  expectedOwnerScope?: string | null,
): Promise<boolean> {
  const ownerScope = captureActiveWorkspaceOwnerScope(expectedOwnerScope);
  if (!ownerScope) return true;
  const token = await getActiveWorkspaceAccessToken(ownerScope);
  const deviceToken = getLocalCloudDeviceToken(ownerScope);
  if (!token || !deviceToken) return true;

  try {
    const response = await fetch("/api/cloud/devices/session", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        [FACTU_COMPANY_HEADER]: ownerScope,
        [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      },
      cache: "no-store",
      keepalive: true,
      signal: AbortSignal.timeout(2_500),
    });
    return response.ok;
  } catch {
    return false;
  }
}
