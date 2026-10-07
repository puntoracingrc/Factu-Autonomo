import { profileForRectificationSource } from "./rectification-issuance";
import type { BusinessProfile, Document } from "../types";
import { profileForHistoricalDerivedDocument } from "./derived-issuance";
import { canManageCentralIssuedInvoice } from "../central-invoice-authority/management-policy";

export interface DocumentFormProfileResolution {
  profile: BusinessProfile;
  blocked: boolean;
}

/**
 * Una rectificativa debe editarse y emitirse con el régimen histórico de la
 * factura original sellada. Si esa fuente no puede verificarse, el perfil
 * actual solo sirve para mantener el formulario renderizable: las acciones se
 * bloquean mediante `blocked`.
 */
export function resolveDocumentFormBusinessProfile(
  existing: Document | undefined,
  documents: Document[],
  currentProfile: BusinessProfile,
): DocumentFormProfileResolution {
  if (existing && canManageCentralIssuedInvoice(existing) && existing.documentSnapshot) {
    try {
      return { profile: profileForHistoricalDerivedDocument(existing.documentSnapshot, {
        ...currentProfile, nif: existing.documentSnapshot.issuer.nif,
      }), blocked: false };
    } catch { return { profile: currentProfile, blocked: true }; }
  }
  if (!existing?.rectification || existing.status !== "borrador") {
    return { profile: currentProfile, blocked: false };
  }

  try {
    return {
      profile: profileForRectificationSource(
        existing,
        documents,
        currentProfile,
      ),
      blocked: false,
    };
  } catch {
    return { profile: currentProfile, blocked: true };
  }
}
