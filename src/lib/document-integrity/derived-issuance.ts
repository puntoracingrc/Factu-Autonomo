import { DocumentIntegrityError } from "@/lib/document-integrity";
import type { BusinessProfile, DocumentSnapshot } from "@/lib/types";

function comparableIssuerNif(value: string): string {
  return value.trim().replace(/[\s.-]/g, "").toUpperCase();
}

/**
 * Los documentos derivados heredan emisor y régimen fiscal de su fuente
 * sellada; numeración, plantilla y opciones operativas siguen siendo actuales.
 */
export function profileForHistoricalDerivedDocument(
  source: DocumentSnapshot,
  current: BusinessProfile,
): BusinessProfile {
  if (
    comparableIssuerNif(source.issuer.nif) !==
    comparableIssuerNif(current.nif)
  ) {
    throw new DocumentIntegrityError("DERIVED_DOCUMENT_ISSUER_MISMATCH");
  }

  return {
    ...current,
    commercialName: source.issuer.commercialName,
    name: source.issuer.name,
    nif: source.issuer.nif,
    vatId: source.issuer.vatId,
    address: source.issuer.address,
    city: source.issuer.city,
    postalCode: source.issuer.postalCode,
    province: source.issuer.province,
    country: source.issuer.country,
    phone: source.issuer.phone ?? "",
    email: source.issuer.email ?? "",
    website: source.issuer.website,
    iban: source.issuer.iban,
    logoUrl: source.issuer.logoUrl,
    iva: {
      rates: [...source.fiscalContext.iva.rates],
      defaultRate: source.fiscalContext.iva.defaultRate,
    },
    vatExempt: source.fiscalContext.vatExempt,
    numbering: current.numbering,
    documentTemplate: current.documentTemplate,
    verifactu: current.verifactu,
  };
}
