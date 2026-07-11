import type { AppData, Document, BusinessProfile } from "../types";
import { attachRegisteredVerifactuToSnapshots } from "../document-integrity";
import { registerDocumentVerifactu } from "./register";
import { buildCanonicalDocumentForProtectedEffect } from "../document-integrity/pdf-source";

export function resolveVerifactuRegistrationContext(input: {
  doc: Document;
  profile: BusinessProfile;
  chain: AppData["verifactuChain"];
  profileOverride?: BusinessProfile;
  chainOverride?: AppData["verifactuChain"];
}): {
  doc: Document;
  profile: BusinessProfile;
  chain: AppData["verifactuChain"];
} {
  return {
    doc: input.doc,
    profile: input.profileOverride ?? input.profile,
    chain:
      input.chainOverride === undefined ? input.chain : input.chainOverride,
  };
}

export async function withVerifactuOnDocument(input: {
  doc: Document;
  profile: BusinessProfile;
  chain: AppData["verifactuChain"];
}): Promise<{
  doc: Document;
  chain: AppData["verifactuChain"];
}> {
  const canonicalDocument = buildCanonicalDocumentForProtectedEffect(
    input.doc,
    input.profile,
  );

  const result = await registerDocumentVerifactu({
    doc: canonicalDocument,
    profile: input.profile,
    chain: input.chain,
  });

  if (!result) {
    return { doc: canonicalDocument, chain: input.chain ?? null };
  }

  return {
    doc: attachRegisteredVerifactuToSnapshots({
      ...canonicalDocument,
      verifactu: result.verifactu,
      verifactuPersistence: "simulation",
    }),
    chain: result.chain,
  };
}

export async function withVerifactuOnAppData(
  data: AppData,
  doc: Document,
): Promise<AppData> {
  const applied = await withVerifactuOnDocument({
    doc,
    profile: data.profile,
    chain: data.verifactuChain,
  });

  return {
    ...data,
    verifactuChain: applied.chain,
    documents: data.documents.map((d) =>
      d.id === applied.doc.id ? applied.doc : d,
    ),
  };
}
