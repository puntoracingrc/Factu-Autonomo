import { normalizeDocumentTemplate } from "@/lib/document-templates";
import type { BusinessProfile, Document } from "@/lib/types";

export function quickPdfContext(profile: BusinessProfile): NonNullable<Document["quickPdfContext"]> {
  return { schema: "FACTU_QUICK_PDF_V1", template: normalizeDocumentTemplate(profile.documentTemplate), iva: profile.iva, vatExempt: profile.vatExempt === true };
}

/** Only quick documents carry this server-captured rendering context. */
export function profileForQuickDocument(doc: Document, profile: BusinessProfile): BusinessProfile {
  const context = doc.quickPdfContext;
  if (!context || context.schema !== "FACTU_QUICK_PDF_V1") return profile;
  return { ...profile, documentTemplate: normalizeDocumentTemplate(context.template), iva: context.iva, vatExempt: context.vatExempt };
}
