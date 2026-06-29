import type { BusinessProfile, Document, VerifactuChainState } from "../types";

export interface VerifactuServerRegisterResponse {
  verifactu: Document["verifactu"];
  chain: VerifactuChainState;
  persisted: boolean;
}

const VERIFACTU_REGISTER_TIMEOUT_MS = 20_000;

export async function submitVerifactuToServer(input: {
  doc: Document;
  profile: BusinessProfile;
  chain?: VerifactuChainState | null;
  authToken?: string | null;
}): Promise<VerifactuServerRegisterResponse | null> {
  if (!input.authToken) return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    VERIFACTU_REGISTER_TIMEOUT_MS,
  );

  try {
    const response = await fetch("/api/verifactu/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.authToken}`,
      },
      body: JSON.stringify({
        document: input.doc,
        profile: {
          name: input.profile.name,
          nif: input.profile.nif,
          vatExempt: input.profile.vatExempt,
          verifactu: input.profile.verifactu,
        },
        chain: input.chain ?? null,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as VerifactuServerRegisterResponse;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
