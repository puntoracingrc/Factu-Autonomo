import type { AppData, Document, BusinessProfile } from "../types";
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

  // No existe fallback de registro local: un cliente no puede fabricar una
  // aceptación, un QR ni avanzar la cadena oficial.
  return {
    doc: canonicalDocument,
    chain: input.chain ?? null,
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
