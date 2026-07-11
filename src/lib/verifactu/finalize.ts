import type { BusinessProfile, Document, VerifactuChainState } from "../types";
import { assertDocumentSnapshotsIntegrity } from "../document-integrity";
import { buildCanonicalDocumentForProtectedEffect } from "../document-integrity/pdf-source";
import {
  needsVerifactuRegistration,
  normalizeVerifactuSettings,
} from "./eligibility";
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
  if (
    input.doc.documentSnapshot ||
    input.doc.pdfSnapshot ||
    input.doc.snapshotSeal ||
    input.doc.snapshotIntegrityRequired
  ) {
    assertDocumentSnapshotsIntegrity(input.doc, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    });
  }

  // El mismo documento canónico que se renderiza debe alimentar cualquier
  // efecto fiscal. Esta frontera se ejecuta antes de token, fetch o mutación.
  const canonicalDocument = buildCanonicalDocumentForProtectedEffect(
    input.doc,
    input.profile,
  );
  const snapshot = canonicalDocument.documentSnapshot;
  const canonicalProfile: BusinessProfile = snapshot
    ? {
        ...input.profile,
        name: snapshot.issuer.name,
        nif: snapshot.issuer.nif,
        vatExempt: snapshot.fiscalContext.vatExempt,
        verifactu: normalizeVerifactuSettings(
          snapshot.fiscalContext.verifactu,
        ),
      }
    : input.profile;

  if (!needsVerifactuRegistration(canonicalDocument, canonicalProfile)) {
    return canonicalDocument;
  }

  const token = input.authToken ?? (await getVerifactuAuthToken());
  if (!token) {
    throw new Error(
      "No hay una sesión confirmada para registrar Veri*Factu. El documento queda guardado y no se marca como registrado.",
    );
  }

  const server = await submitVerifactuToServer({
    doc: canonicalDocument,
    profile: canonicalProfile,
    chain: input.chain ?? null,
    authToken: token,
  });

  if (
    server?.aeatOk &&
    server.persisted &&
    (server.verifactu?.status === "registered" ||
      server.verifactu?.status === "test_registered")
  ) {
    const withServer: Document = {
      ...canonicalDocument,
      verifactu: server.verifactu,
      verifactuPersistence: "server_confirmed",
    };
    return input.registerLocal(withServer, server.chain, canonicalProfile);
  }

  // Fallo/rechazo/timeout nunca se convierte en éxito local ni avanza cadena.
  throw new Error(
    server?.aeatOk && !server.persisted
      ? "AEAT respondió, pero el servidor no confirmó la persistencia completa del registro y su cadena. No se ha marcado como registrado localmente."
      :
    server?.verifactu?.errorMessage ||
        "El servidor no confirmó el registro Veri*Factu. El documento no se ha marcado como registrado.",
  );
}
