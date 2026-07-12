import type { DocumentChainItem } from "@/lib/document-links";
import type { Document } from "@/lib/types";

const INVOICE_ROLES: DocumentChainItem["role"][] = [
  "presupuesto",
  "rectificativa",
  "recibo",
  "gastos",
];

const RECTIFICATION_ROLES: DocumentChainItem["role"][] = [
  "factura",
  "presupuesto",
  "recibo",
  "gastos",
];

const QUOTE_ROLES: DocumentChainItem["role"][] = [
  "factura",
  "rectificativa",
  "recibo",
  "gastos",
];

function isCurrentItem(item: DocumentChainItem, currentDocument: Document): boolean {
  return (
    item.current ||
    item.document?.id === currentDocument.id
  );
}

function inDisplayOrder(
  items: DocumentChainItem[],
  roles: DocumentChainItem["role"][],
): DocumentChainItem[] {
  return roles.flatMap((role) => items.filter((item) => item.role === role));
}

/**
 * Projects a canonical relationship chain for display beside the current card.
 *
 * This selector only hides presentation context. It preserves the selected item
 * objects and must not be used as the source for relationship or expense maths.
 */
export function selectDocumentRelationshipPresentationItems(
  chain: DocumentChainItem[],
  currentDocument: Document,
): DocumentChainItem[] {
  const linkedItems = chain.filter(
    (item) => !isCurrentItem(item, currentDocument),
  );

  if (currentDocument.type === "recibo") {
    if (!currentDocument.sourceDocumentId) return [];
    const hasFrozenSource = Object.prototype.hasOwnProperty.call(
      currentDocument.documentSnapshot ?? {},
      "sourceDocumentId",
    );
    if (
      hasFrozenSource &&
      currentDocument.documentSnapshot?.sourceDocumentId !==
        currentDocument.sourceDocumentId
    ) {
      return [];
    }

    const directSources = linkedItems.filter(
      (item) =>
        (item.role === "factura" || item.role === "rectificativa") &&
        item.document?.id === currentDocument.sourceDocumentId,
    );

    return directSources.length === 1 ? directSources : [];
  }

  const visibleRoles =
    currentDocument.type === "presupuesto"
      ? QUOTE_ROLES
      : currentDocument.rectification
        ? RECTIFICATION_ROLES
        : INVOICE_ROLES;

  return inDisplayOrder(linkedItems, visibleRoles);
}
