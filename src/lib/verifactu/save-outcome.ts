import type { Document } from "../types";
import { hasAuthenticatedVerifactuAttestation } from "./attestation";
import { VerifactuFinalizationError } from "./errors";
import { finalizeVerifactuDocument } from "./finalize";

type FinalizeInput = Parameters<typeof finalizeVerifactuDocument>[0];

export type SavedVerifactuOutcome =
  | {
      outcome: "not_registered";
      document: Document;
    }
  | {
      outcome: "authenticated_registration";
      document: Document;
    }
  | {
      outcome: "saved_without_registration";
      document: Document;
      notice: string;
    }
  | {
      outcome: "saved_with_safety_block";
      document: Document;
      notice: string;
    };

/**
 * La factura ya existe cuando se llega a esta frontera. Un fallo VeriFactu no
 * puede convertir el guardado en un supuesto fracaso total ni invitar a crear
 * el documento otra vez.
 */
export async function finalizeSavedVerifactuDocument(
  input: FinalizeInput,
): Promise<SavedVerifactuOutcome> {
  try {
    const document = await finalizeVerifactuDocument(input);
    return hasAuthenticatedVerifactuAttestation(document)
      ? { outcome: "authenticated_registration", document }
      : { outcome: "not_registered", document };
  } catch (error) {
    if (!(error instanceof VerifactuFinalizationError)) {
      return {
        outcome: "saved_with_safety_block",
        document: input.doc,
        notice:
          "El documento ya está guardado, pero una comprobación de seguridad bloqueó los efectos posteriores y la descarga. No lo vuelvas a crear ni repitas el guardado; revísalo desde el listado.",
      };
    }
    const detail =
      error.message || "El servidor no confirmó el registro Veri*Factu.";
    return {
      outcome: "saved_without_registration",
      document: input.doc,
      notice: `Veri*Factu no registrado: ${detail} El documento ya está guardado; no lo vuelvas a crear ni repitas el guardado.`,
    };
  }
}
