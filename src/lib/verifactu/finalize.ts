import type { BusinessProfile, Document, VerifactuChainState } from "../types";
import { assertDocumentSnapshotsIntegrity } from "../document-integrity";
import { buildCanonicalDocumentForProtectedEffect } from "../document-integrity/pdf-source";
import {
  isVerifactuSubmissionAvailable,
  needsVerifactuRegistration,
  normalizeVerifactuSettings,
} from "./eligibility";
import { submitVerifactuToServer } from "./client-api";
import { getVerifactuAuthToken } from "./auth-token";
import { hasAuthenticatedVerifactuAttestation } from "./attestation";
import { VerifactuFinalizationError } from "./errors";

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

  if (
    canonicalDocument.verifactu &&
    !hasAuthenticatedVerifactuAttestation(canonicalDocument)
  ) {
    const origin =
      canonicalDocument.verifactuPersistence === "simulation"
        ? "una simulación local"
        : "evidencia Veri*Factu no atestada";
    throw new VerifactuFinalizationError(
      "EVIDENCE_RECONCILIATION_UNSUPPORTED",
      `La reconciliación de ${origin} con un registro real no está soportada. No se ha enviado ni marcado el documento como registrado.`,
    );
  }

  const requestedSettings =
    snapshot?.fiscalContext.verifactu ?? input.profile.verifactu;
  if (
    canonicalDocument.type === "factura" &&
    canonicalDocument.status !== "borrador" &&
    requestedSettings?.enabled === true &&
    requestedSettings.optInVersion === 1 &&
    !isVerifactuSubmissionAvailable()
  ) {
    throw new VerifactuFinalizationError(
      "SUBMISSION_DISABLED",
      "El registro Veri*Factu está desactivado en el servidor. El documento queda guardado, sin envío, QR ni marca de aceptación.",
    );
  }

  if (!needsVerifactuRegistration(canonicalDocument, canonicalProfile)) {
    return canonicalDocument;
  }

  const token = input.authToken ?? (await getVerifactuAuthToken());
  if (!token) {
    throw new VerifactuFinalizationError(
      "AUTH_REQUIRED",
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
    if (!hasAuthenticatedVerifactuAttestation(withServer)) {
      throw new VerifactuFinalizationError(
        "ATTESTATION_MISSING",
        "La respuesta del servidor no incluye una atestación autenticada vinculada al documento. No se ha marcado como registrado.",
      );
    }
    return input.registerLocal(withServer, server.chain, canonicalProfile);
  }

  // Fallo/rechazo/timeout nunca se convierte en éxito local ni avanza cadena.
  throw new VerifactuFinalizationError(
    "SERVER_NOT_CONFIRMED",
    server?.aeatOk && !server.persisted
      ? "AEAT respondió, pero el servidor no confirmó la persistencia completa del registro y su cadena. No se ha marcado como registrado localmente."
      : server?.verifactu?.errorMessage ||
        "El servidor no confirmó el registro Veri*Factu. El documento no se ha marcado como registrado.",
  );
}
