import type { BusinessProfile, Document, VerifactuChainState } from "../types";

export interface VerifactuServerRegisterResponse {
  verifactu: Document["verifactu"];
  chain: VerifactuChainState;
  persisted: boolean;
}

export async function submitVerifactuToServer(input: {
  doc: Document;
  profile: BusinessProfile;
  chain?: VerifactuChainState | null;
  authToken?: string | null;
}): Promise<VerifactuServerRegisterResponse | null> {
  if (!input.authToken) return null;

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
          nif: input.profile.nif,
          verifactu: input.profile.verifactu,
        },
        chain: input.chain ?? null,
      }),
    });

    if (!response.ok) return null;
    return (await response.json()) as VerifactuServerRegisterResponse;
  } catch {
    return null;
  }
}
