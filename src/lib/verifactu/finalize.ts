import type { BusinessProfile, Document, VerifactuChainState } from "../types";
import { needsVerifactuRegistration } from "./eligibility";
import { submitVerifactuToServer } from "./client-api";
import { getVerifactuAuthToken } from "./auth-token";

export async function finalizeVerifactuDocument(input: {
  doc: Document;
  profile: BusinessProfile;
  chain?: VerifactuChainState | null;
  registerLocal: (
    doc: Document,
    chainOverride?: VerifactuChainState | null,
    profileOverride?: BusinessProfile,
  ) => Promise<Document>;
  authToken?: string | null;
}): Promise<Document> {
  if (!needsVerifactuRegistration(input.doc, input.profile)) {
    return input.doc;
  }

  const token = input.authToken ?? (await getVerifactuAuthToken());
  if (token) {
    const server = await submitVerifactuToServer({
      doc: input.doc,
      profile: input.profile,
      chain: input.chain ?? null,
      authToken: token,
    });

    if (server?.verifactu) {
      const withServer = { ...input.doc, verifactu: server.verifactu };
      return input.registerLocal(withServer, server.chain, input.profile);
    }
  }

  return input.registerLocal(input.doc, input.chain, input.profile);
}
