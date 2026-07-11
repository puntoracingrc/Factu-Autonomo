import type { BusinessProfile, Document } from "../types";
import { resolveIssuerNif } from "../issuer-snapshot";
import { computeDocumentRecordHash } from "./record-input";
import { inspectDocumentSnapshotsIntegrity } from "../document-integrity";
import { buildCanonicalDocumentForProtectedEffect } from "../document-integrity/pdf-source";
import { hasAuthenticatedVerifactuAttestation } from "./attestation";

export interface ChainVerifyResult {
  ok: boolean;
  checked: number;
  errors: string[];
}

function verifactuDocuments(documents: Document[]): Document[] {
  return documents
    .filter(
      (doc) =>
        hasAuthenticatedVerifactuAttestation(doc) &&
        doc.verifactuPersistence === "server_confirmed" &&
        (doc.verifactu?.status === "registered" ||
          doc.verifactu?.status === "test_registered") &&
        Boolean(doc.verifactu.recordHash),
    )
    .sort((a, b) => {
      const ta = a.verifactu?.recordTimestamp ?? "";
      const tb = b.verifactu?.recordTimestamp ?? "";
      return ta.localeCompare(tb);
    });
}

/**
 * Comprueba bajo demanda la cadena de huellas (art. 6.e HAC/1177/2024).
 * Recalcula cada huella con los datos guardados en el documento.
 */
export async function verifyDocumentHashChain(input: {
  documents: Document[];
  profile: BusinessProfile;
  issuerNif?: string;
}): Promise<ChainVerifyResult> {
  const targetNif = input.issuerNif?.trim() || normalizeIssuer(input.profile.nif);
  const errors: string[] = [];

  const chainDocs = verifactuDocuments(input.documents).filter((doc) => {
    const nif =
      doc.documentSnapshot?.issuer.nif ?? resolveIssuerNif(doc, input.profile);
    return !targetNif || normalizeIssuer(nif) === targetNif;
  });

  if (chainDocs.length === 0) {
    return {
      ok: true,
      checked: 0,
      errors: [],
    };
  }

  let expectedPrevious = "";

  for (const doc of chainDocs) {
    const vf = doc.verifactu!;
    const label = doc.number;
    const integrity = inspectDocumentSnapshotsIntegrity(doc, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
      requireSnapshotSeal: true,
    });
    if (!integrity.ok) {
      errors.push(`${label}: la evidencia documental local no es íntegra`);
      expectedPrevious = vf.recordHash;
      continue;
    }
    const canonical = buildCanonicalDocumentForProtectedEffect(
      doc,
      input.profile,
    );

    const storedPrevious = vf.previousHash?.trim() ?? "";
    if (storedPrevious !== expectedPrevious) {
      errors.push(
        `${label}: huella anterior incorrecta (esperada ${expectedPrevious || "(vacía)"}, guardada ${storedPrevious || "(vacía)"})`,
      );
    }

    try {
      const recomputed = await computeDocumentRecordHash({
        doc: canonical,
        profile: input.profile,
        recordType: vf.recordType,
        previousHash: storedPrevious || null,
        recordTimestamp: vf.recordTimestamp,
      });

      if (recomputed !== vf.recordHash) {
        errors.push(
          `${label}: la huella no coincide con la spec AEAT (recalculada distinta)`,
        );
      }
    } catch (error) {
      errors.push(
        `${label}: ${error instanceof Error ? error.message : "error al recalcular huella"}`,
      );
    }

    expectedPrevious = vf.recordHash;
  }

  return {
    ok: errors.length === 0,
    checked: chainDocs.length,
    errors,
  };
}

function normalizeIssuer(nif: string): string {
  return nif.replace(/[\s-]/g, "").toUpperCase();
}
