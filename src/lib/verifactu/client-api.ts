import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "../cloud/device-token";
import type { Document, VerifactuChainState } from "../types";

export interface VerifactuServerRegisterResponse {
  ok: boolean;
  status:
    | "accepted"
    | "accepted_duplicate"
    | "already_accepted"
    | "in_progress"
    | "accepted_with_errors"
    | "rejected"
    | "delivery_unknown";
  recordId: string;
  fullNumber: string;
  csv?: string;
  qrUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  // Legacy fields remain optional while the public UI is deliberately closed.
  verifactu?: Document["verifactu"];
  chain?: VerifactuChainState;
  persisted?: boolean;
  aeatOk?: boolean;
}

const VERIFACTU_REGISTER_TIMEOUT_MS = 20_000;

export async function submitVerifactuToServer(input: {
  localDocumentId: string;
  authToken?: string | null;
  dependencies?: {
    fetchImpl?: typeof fetch;
    getDeviceToken?: () => string | null;
  };
}): Promise<VerifactuServerRegisterResponse | null> {
  if (!input.authToken) return null;
  const readDeviceToken =
    input.dependencies?.getDeviceToken ?? getLocalCloudDeviceToken;
  const deviceToken = readDeviceToken();
  if (!deviceToken) return null;

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    VERIFACTU_REGISTER_TIMEOUT_MS,
  );

  try {
    const response = await (input.dependencies?.fetchImpl ?? fetch)(
      "/api/verifactu/register",
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.authToken}`,
        [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      },
      body: JSON.stringify({ localDocumentId: input.localDocumentId }),
      signal: controller.signal,
      },
    );

    if (!response.ok) return null;
    return (await response.json()) as VerifactuServerRegisterResponse;
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
