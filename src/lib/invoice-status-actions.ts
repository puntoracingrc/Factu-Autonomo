import { deriveDocumentLifecycle } from "./document-integrity";
import { isCollectedDocument } from "./income";
import { isAcceptedQuote, isRejectedQuote } from "./quotes";
import { isRectificativa } from "./rectificativas";
import type { Document, DocumentType } from "./types";

const STATUS_LABELS: Record<Document["status"], string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  pagado: "Pagado",
  vencido: "Vencido",
  rectificada: "Rectificada",
  anulada: "Anulada",
};

const STATUS_COLORS: Record<Document["status"], string> = {
  borrador: "bg-slate-100 text-slate-600",
  enviado: "bg-amber-100 text-amber-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
  pagado: "bg-green-100 text-green-700",
  vencido: "bg-red-100 text-red-700",
  rectificada: "bg-orange-100 text-orange-700",
  anulada: "bg-red-100 text-red-800",
};

function isIssuedNotSent(doc: Document): boolean {
  return (
    deriveDocumentLifecycle(doc) === "issued" &&
    doc.deliveryStatus === "not_sent"
  );
}

export function documentStatusLabel(
  doc: Document,
  type: DocumentType = doc.type,
): string {
  if (type === "presupuesto" && isAcceptedQuote(doc)) return "Aceptado";
  if (type === "presupuesto" && isRejectedQuote(doc)) return "Rechazado";

  if (type === "factura" && isCollectedDocument(doc)) return "Cobrada";
  if (type === "recibo" && isCollectedDocument(doc)) return "Cobrado";

  if (type === "factura") {
    if (doc.status === "enviado") {
      return doc.deliveryStatus === "sent" ? "Enviada" : "Emitida";
    }
    if (doc.status === "pagado") return "Cobrada";
    if (doc.status === "vencido") return "Vencida";
  }

  if (isIssuedNotSent(doc)) {
    if (type === "factura") return "Emitida";
    if (type === "presupuesto") return "Enviado";
    return "Emitido";
  }

  return STATUS_LABELS[doc.status];
}

export function documentStatusColor(doc: Document): string {
  if (doc.type === "presupuesto" && (isAcceptedQuote(doc) || isRejectedQuote(doc))) {
    return STATUS_COLORS[doc.status];
  }
  if (isIssuedNotSent(doc)) return "bg-blue-100 text-blue-700";
  return STATUS_COLORS[doc.status];
}

export function documentStatusHint(
  doc: Document,
  type: DocumentType = doc.type,
): string | null {
  if (type === "presupuesto") {
    switch (doc.status) {
      case "borrador":
        return "Editable. Guarda y cambia a Enviado cuando quieras preparar el envío.";
      case "enviado":
        return "Listo para preparar email o WhatsApp. La app no envía nada automáticamente.";
      case "aceptado":
      case "pagado":
        return "Aceptado en tu registro local. Puedes convertirlo a factura.";
      case "rechazado":
        return "Rechazado en tu registro local. Desmárcalo si necesitas retomarlo o convertirlo.";
      case "anulada":
        return "Anulado en tu registro local.";
      default:
        return null;
    }
  }

  if (type !== "factura") return null;

  if (isRectificativa(doc)) {
    return "Factura rectificativa vinculada. Conserva su PDF y QR existentes.";
  }

  if (doc.rectifiedById) {
    return "Factura original rectificada. Se conserva bloqueada con su PDF y QR.";
  }

  switch (doc.status) {
    case "borrador":
      return "Editable hasta emitirla.";
    case "enviado":
      return doc.deliveryStatus === "sent"
        ? "Enviada al cliente. Pendiente de cobro local hasta marcarla como cobrada."
        : "Emitida y protegida. Puedes abrir el PDF, compartirla o preparar un recordatorio.";
    case "pagado":
      return "Cobrada en tu registro local. No es pasarela ni banco.";
    case "vencido":
      return "Vencida. Puedes preparar un recordatorio; la app no envía nada por sí sola.";
    case "rectificada":
      return "Rectificada mediante factura rectificativa. La original sigue protegida.";
    case "anulada":
      return "Anulada mediante rectificativa. La original sigue protegida.";
    default:
      return null;
  }
}

export function collectionActionCopy(doc: Document, collected: boolean): {
  label: string;
  tooltip: string;
} {
  if (collected) {
    return {
      label: doc.type === "factura" ? "Cobrada" : "Cobrado",
      tooltip:
        "Cobro registrado en local. Pulsa para desmarcarlo; no es pasarela ni banco.",
    };
  }

  if (doc.type === "factura") {
    return {
      label: "Cobrar",
      tooltip:
        "Marcar como cobrada en local y crear un recibo vinculado. No cobra por banco ni pasarela.",
    };
  }

  return {
    label: "Cobrar",
    tooltip: "Marcar como cobrado en local. No cobra por banco ni pasarela.",
  };
}

export const PAYMENT_REMINDER_COPY = {
  triggerLabel: "Recordar",
  triggerTooltip: "Preparar recordatorio de pago",
  buttonLabel: "Recordar pago",
  dialogTitle: "Preparar recordatorio de pago",
  fieldHint:
    "Revisa el texto antes de continuar. El email o WhatsApp se preparan con el mensaje y el PDF para que puedas enviarlos.",
  emailLabel: "Enviar recordatorio por email",
  emailBusyLabel: "Enviando...",
  whatsappLabel: "Enviar recordatorio por WhatsApp",
  whatsappBusyLabel: "Abriendo...",
} as const;

export const RECTIFICATION_ACTION_COPY = {
  label: "Rectificar",
  tooltip:
    "Crear una factura rectificativa vinculada. No envía nada a AEAT ni genera XML por sí sola.",
} as const;
