import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import type { Document } from "@/lib/types";

export const CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE =
  "CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE_V1";

export type CentralInvoiceAuthorityOperationStateKind =
  | "local_only"
  | "server_issued"
  | "server_rectification_issued"
  | "server_repaired"
  | "requires_review";

export type CentralInvoiceAuthorityOperationStateTone =
  | "neutral"
  | "success"
  | "warning";

export interface CentralInvoiceAuthorityOperationState {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE;
  kind: CentralInvoiceAuthorityOperationStateKind;
  tone: CentralInvoiceAuthorityOperationStateTone;
  badgeLabel: string | null;
  statusHint: string | null;
  requiresReview: boolean;
}

function localOnly(): CentralInvoiceAuthorityOperationState {
  return {
    schema: CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
    kind: "local_only",
    tone: "neutral",
    badgeLabel: null,
    statusHint: null,
    requiresReview: false,
  };
}

function isCentralLinkCompatible(document: Document): boolean {
  const link = document.centralInvoiceAuthority;
  if (!link) return false;
  if (document.number !== link.fullNumber) return false;
  if (link.documentVersion <= 0 || link.sequence <= 0) return false;
  if (deriveDocumentLifecycle(document) === "draft") return false;
  if (link.eventType === "invoice_issued") {
    return document.type === "factura" && !document.rectification;
  }
  if (link.eventType === "rectification_issued") {
    return document.type === "factura" && Boolean(document.rectification);
  }
  if (link.eventType === "invoice_collection_updated") {
    return document.type === "factura" && !document.rectification;
  }
  if (link.eventType === "invoice_relationship_updated") {
    return document.type === "factura" && !document.rectification;
  }
  return link.eventType === "document_repaired";
}

export function getCentralInvoiceAuthorityOperationState(
  document: Document,
): CentralInvoiceAuthorityOperationState {
  const link = document.centralInvoiceAuthority;
  if (!link) return localOnly();

  if (!isCentralLinkCompatible(document)) {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
      kind: "requires_review",
      tone: "warning",
      badgeLabel: "Revisar servidor",
      statusHint:
        "Requiere revisión: la identidad central guardada no coincide íntegramente con este documento.",
      requiresReview: true,
    };
  }

  if (link.eventType === "rectification_issued") {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
      kind: "server_rectification_issued",
      tone: "success",
      badgeLabel: "Servidor central",
      statusHint:
        "Rectificativa emitida por servidor central. Número, versión e identidad fiscal quedaron confirmados en la autoridad central de Factu.",
      requiresReview: false,
    };
  }

  if (link.eventType === "document_repaired") {
    return {
      schema: CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
      kind: "server_repaired",
      tone: "success",
      badgeLabel: "Servidor central",
      statusHint:
        "Documento conciliado con servidor central. La identidad fiscal se conserva ligada a su versión confirmada.",
      requiresReview: false,
    };
  }

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_OPERATION_STATE,
    kind: "server_issued",
    tone: "success",
    badgeLabel: "Servidor central",
    statusHint:
      "Emitida por servidor central. Número, versión e identidad fiscal quedaron confirmados en la autoridad central de Factu.",
    requiresReview: false,
  };
}
