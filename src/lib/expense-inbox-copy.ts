import { createHash } from "node:crypto";
import type { SendEmailInput, SendEmailResult } from "@/lib/email/send";
import type { ExpenseInboxAttachmentInput } from "@/lib/expense-inbox";

const MAX_COPY_SUBJECT_LENGTH = 180;
const MAX_COPY_FILENAME_LENGTH = 180;

function cleanEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function validEmailAddress(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function emailDomain(value: string): string {
  return value.slice(value.lastIndexOf("@") + 1).replace(/\.+$/g, "");
}

export function normalizeExpenseInboxCopyRecipient(
  value: unknown,
  inboxDomain: string,
): string | null {
  if (typeof value !== "string") return null;
  const email = cleanEmailAddress(value);
  const normalizedInboxDomain = inboxDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.+$/g, "");
  if (!validEmailAddress(email)) return null;
  if (emailDomain(email) === normalizedInboxDomain) return null;
  return email;
}

function attachmentBase64(
  attachment: ExpenseInboxAttachmentInput,
): string | null {
  const value =
    attachment.contentBase64 ??
    attachment.base64 ??
    attachment.content ??
    attachment.data;
  if (!value?.trim()) return null;
  const [, dataUriPayload] = value.match(/^data:[^;]+;base64,(.+)$/i) ?? [];
  const normalized = (dataUriPayload ?? value).replace(/\s+/g, "");
  return normalized ? normalized : null;
}

function safeFilename(value: string | null | undefined, index: number): string {
  const leaf = (value ?? "")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return (leaf || `factura-proveedor-${index + 1}`).slice(
    0,
    MAX_COPY_FILENAME_LENGTH,
  );
}

function safeSubject(value: string | undefined): string {
  const clean = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!clean) return "Copia de factura recibida en Facturación Autónomos";
  return `Copia: ${clean}`.slice(0, MAX_COPY_SUBJECT_LENGTH);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function copyIdempotencyKey(
  userId: string,
  sourceEmailId: string,
  recipientEmail: string,
): string {
  const digest = createHash("sha256")
    .update(`${userId}\u0000${sourceEmailId}\u0000${recipientEmail}`)
    .digest("hex");
  return `expense-inbox-copy-v1/${digest}`;
}

export function buildExpenseInboxCopyEmail(input: {
  userId: string;
  sourceEmailId: string;
  recipientEmail: string;
  inboxDomain: string;
  originalFromEmail: string;
  originalSubject?: string;
  attachments: readonly ExpenseInboxAttachmentInput[];
}): SendEmailInput | null {
  const recipient = normalizeExpenseInboxCopyRecipient(
    input.recipientEmail,
    input.inboxDomain,
  );
  const userId = input.userId.trim();
  const sourceEmailId = input.sourceEmailId.trim();
  if (!recipient || !userId || !sourceEmailId) return null;

  const attachments = input.attachments.flatMap((attachment, index) => {
    const content = attachmentBase64(attachment);
    if (!content) return [];
    return [
      {
        filename: safeFilename(attachment.filename, index),
        content,
      },
    ];
  });
  if (attachments.length === 0) return null;

  const sender = cleanEmailAddress(input.originalFromEmail);
  const senderLabel = validEmailAddress(sender) ? sender : "el proveedor";
  const text = [
    "La factura adjunta ha llegado correctamente a tu buzón de gastos.",
    `Remitente original: ${senderLabel}`,
    "Puedes revisarla y guardarla desde Facturación Autónomos.",
  ].join("\n\n");

  return {
    to: recipient,
    subject: safeSubject(input.originalSubject),
    text,
    html: `<p>La factura adjunta ha llegado correctamente a tu buzón de gastos.</p><p><strong>Remitente original:</strong> ${escapeHtml(senderLabel)}</p><p>Puedes revisarla y guardarla desde Facturación Autónomos.</p>`,
    attachments,
    idempotencyKey: copyIdempotencyKey(userId, sourceEmailId, recipient),
    timeoutMs: 30_000,
  };
}

export class ExpenseInboxCopyDeliveryError extends Error {
  readonly status?: number;
  readonly providerCode?: string;
  readonly retryable: boolean;

  constructor(result: SendEmailResult) {
    super("No se pudo confirmar la copia del email de entrada.");
    this.name = "ExpenseInboxCopyDeliveryError";
    this.status = result.status;
    this.providerCode = result.providerCode;
    this.retryable = result.retryable !== false;
  }
}
