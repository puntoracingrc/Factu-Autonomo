import { profileForRectificationSource } from "./rectification-issuance";
import type { BusinessProfile, Document } from "../types";

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
