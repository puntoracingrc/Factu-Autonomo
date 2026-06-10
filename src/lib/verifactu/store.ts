import type { AppData, Document, BusinessProfile } from "../types";
import { needsVerifactuRegistration } from "./eligibility";
import { registerDocumentVerifactu, resolveChainState } from "./register";

export async function withVerifactuOnDocument(input: {
  doc: Document;
  profile: BusinessProfile;
  chain: AppData["verifactuChain"];
}): Promise<{
  doc: Document;
  chain: AppData["verifactuChain"];
}> {
  if (!needsVerifactuRegistration(input.doc, input.profile)) {
    return { doc: input.doc, chain: input.chain ?? null };
  }

  const result = await registerDocumentVerifactu({
    doc: input.doc,
    profile: input.profile,
    chain: resolveChainState(input.profile, input.chain),
  });

  if (!result) {
    return { doc: input.doc, chain: input.chain ?? null };
  }

  return {
    doc: { ...input.doc, verifactu: result.verifactu },
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
