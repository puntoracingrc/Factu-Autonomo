export const MAX_PAYMENT_REMINDER_MESSAGE_LENGTH = 4_000;
export const MAX_PAYMENT_REMINDER_DOCUMENT_ID_LENGTH = 200;

export interface PaymentReminderRequestPayload {
  documentId: string;
  message: string;
}

export type ParsePaymentReminderRequestResult =
  | { ok: true; value: PaymentReminderRequestPayload }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * The email route deliberately accepts only an entity identifier and the
 * editable message. Invoice, recipient, issuer and PDF data are server-owned.
 */
export function parsePaymentReminderRequest(
  input: unknown,
): ParsePaymentReminderRequestResult {
  if (!isRecord(input)) {
    return { ok: false, error: "La solicitud no es válida." };
  }

  const allowedKeys = new Set(["documentId", "message"]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return { ok: false, error: "La solicitud contiene campos no permitidos." };
  }

  if (typeof input.documentId !== "string") {
    return { ok: false, error: "Falta el identificador de la factura." };
  }
  const documentId = input.documentId.trim();
  if (
    !documentId ||
    documentId.length > MAX_PAYMENT_REMINDER_DOCUMENT_ID_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(documentId)
  ) {
    return { ok: false, error: "El identificador de la factura no es válido." };
  }

  if (typeof input.message !== "string") {
    return { ok: false, error: "Escribe un mensaje para el cliente." };
  }
  const message = input.message.trim();
  if (!message) {
    return { ok: false, error: "Escribe un mensaje para el cliente." };
  }
  if (message.length > MAX_PAYMENT_REMINDER_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `El mensaje es demasiado largo (máx. ${MAX_PAYMENT_REMINDER_MESSAGE_LENGTH} caracteres).`,
    };
  }

  return { ok: true, value: { documentId, message } };
}
