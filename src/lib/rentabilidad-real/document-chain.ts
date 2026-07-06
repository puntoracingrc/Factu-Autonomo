import type { Document } from "@/lib/types";

export function isSupersededRentabilidadRealDocument(
  document: Document,
): boolean {
  return (
    Boolean(document.rectifiedById) ||
    document.status === "rectificada" ||
    document.status === "anulada" ||
    Boolean(document.rectification && document.status === "borrador")
  );
}

export function rectificationChainDocumentIds(
  document: Document,
  allDocuments: Document[],
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  let current: Document | undefined = document;

  while (current && !seen.has(current.id)) {
    ids.push(current.id);
    seen.add(current.id);
    const originalId: string | undefined =
      current.rectification?.originalDocumentId;
    if (!originalId) break;
    current = allDocuments.find((item) => item.id === originalId);
  }

  return ids;
}

export function sourceQuoteDocumentIdForRentabilidadInvoice(
  invoice: Document,
  allDocuments: Document[],
): string | undefined {
  if (invoice.sourceQuoteDocumentId) return invoice.sourceQuoteDocumentId;

  const originalId = invoice.rectification?.originalDocumentId;
  if (!originalId) return undefined;

  const original = allDocuments.find((item) => item.id === originalId);
  return original?.sourceQuoteDocumentId;
}
