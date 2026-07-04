import { normalizeExpenseScanPayload, type ExpenseScanPayload } from "./expense-scan/schema";

export const DEFAULT_EXPENSE_INBOX_DOMAIN = "mail.facturacion-autonomos.app";
export const EXPENSE_INBOX_LOCAL_PART = "gastos";

export type ExpenseInboxItemStatus =
  | "pending"
  | "processing"
  | "processed"
  | "ignored"
  | "duplicate"
  | "error";

export interface ExpenseInboxAttachmentInput {
  filename?: string | null;
  contentType?: string | null;
  content?: string | null;
  contentBase64?: string | null;
  base64?: string | null;
  data?: string | null;
  url?: string | null;
  size?: number | null;
}

export interface ExpenseInboxInboundEmail {
  to: string[];
  fromEmail: string;
  fromName?: string;
  subject?: string;
  text?: string;
  html?: string;
  attachments: ExpenseInboxAttachmentInput[];
}

export interface ResendReceivedAttachmentMetadata
  extends Pick<ExpenseInboxAttachmentInput, "filename" | "contentType" | "size"> {
  id: string;
  contentDisposition?: string;
  contentId?: string;
}

export interface ResendReceivedEmailMetadata {
  emailId: string;
  email: ExpenseInboxInboundEmail;
  attachments: ResendReceivedAttachmentMetadata[];
}

export interface ExpenseInboxItem {
  id: string;
  fromEmail?: string;
  fromName?: string;
  subject?: string;
  receivedAt: string;
  attachmentFilename: string;
  attachmentContentType: string;
  attachmentSize: number;
  attachmentHash: string;
  status: ExpenseInboxItemStatus;
  scanPayload?: ExpenseScanPayload;
  scanError?: string;
  createdAt: string;
}

const SUPPORTED_ATTACHMENT_EXTENSIONS = new Map([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanEmailValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function normalizeEmailList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string"
          ? item.split(",")
          : item && typeof item === "object"
            ? [
                cleanEmailValue(
                  (item as Record<string, unknown>).email ??
                    (item as Record<string, unknown>).Email ??
                    (item as Record<string, unknown>).address,
                ),
              ]
            : [],
      )
      .map(cleanEmailValue)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map(cleanEmailValue).filter(Boolean);
  }

  if (value && typeof value === "object") {
    return normalizeEmailList([
      (value as Record<string, unknown>).email ??
        (value as Record<string, unknown>).Email ??
        (value as Record<string, unknown>).address,
    ]);
  }

  return [];
}

function normalizeAttachment(raw: unknown): ExpenseInboxAttachmentInput | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const filename =
    source.filename ??
    source.name ??
    source.Name ??
    source.FileName ??
    source.fileName;
  const contentType =
    source.contentType ??
    source.content_type ??
    source.ContentType ??
    source.mimeType ??
    source.MimeType ??
    source.type;
  const content =
    source.content ??
    source.Content ??
    source.contentBase64 ??
    source.base64 ??
    source.data;
  const size = source.size ?? source.Size;

  return {
    filename: typeof filename === "string" ? filename : undefined,
    contentType: typeof contentType === "string" ? contentType : undefined,
    content: typeof content === "string" ? content : undefined,
    contentBase64:
      typeof source.contentBase64 === "string" ? source.contentBase64 : undefined,
    base64: typeof source.base64 === "string" ? source.base64 : undefined,
    data: typeof source.data === "string" ? source.data : undefined,
    url: typeof source.url === "string" ? source.url : undefined,
    size: typeof size === "number" ? size : undefined,
  };
}

function uniqueEmails(values: string[]): string[] {
  return Array.from(new Set(values.map((email) => email.toLowerCase())));
}

function fromEmailObject(value: unknown): { email: string; name?: string } {
  if (typeof value === "string") {
    return { email: cleanEmailValue(value) };
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const email = cleanEmailValue(source.email ?? source.Email ?? source.address);
    const name = source.name ?? source.Name;
    return {
      email,
      name: typeof name === "string" ? name.trim() || undefined : undefined,
    };
  }

  return { email: "" };
}

export function buildExpenseInboxAddress(
  aliasToken: string,
  domain = DEFAULT_EXPENSE_INBOX_DOMAIN,
): string {
  return `${EXPENSE_INBOX_LOCAL_PART}+${aliasToken}@${domain}`;
}

export function extractExpenseInboxAliasToken(
  recipient: string,
): string | null {
  const email = cleanEmailValue(recipient).toLowerCase();
  const [localPart] = email.split("@");
  if (!localPart) return null;
  const match = localPart.match(/^gastos\+([a-z0-9_-]{8,64})$/);
  return match?.[1] ?? null;
}

export function resolveExpenseInboxAttachmentMimeType(
  attachment: Pick<ExpenseInboxAttachmentInput, "filename" | "contentType">,
): string | null {
  const contentType = attachment.contentType?.split(";")[0]?.trim().toLowerCase();
  if (contentType && SUPPORTED_ATTACHMENT_TYPES.has(contentType)) {
    return contentType;
  }

  const filename = attachment.filename?.trim().toLowerCase() ?? "";
  for (const [extension, mimeType] of SUPPORTED_ATTACHMENT_EXTENSIONS) {
    if (filename.endsWith(extension)) return mimeType;
  }

  return null;
}

export function isSupportedExpenseInboxAttachment(
  attachment: Pick<ExpenseInboxAttachmentInput, "filename" | "contentType">,
): boolean {
  return Boolean(resolveExpenseInboxAttachmentMimeType(attachment));
}

export function normalizeExpenseInboxInboundPayload(
  raw: unknown,
): ExpenseInboxInboundEmail | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;

  const to = normalizeEmailList(
    source.to ??
      source.To ??
      source.recipients ??
      source.Recipients ??
      source.envelope_to,
  );
  const from = fromEmailObject(source.from ?? source.From ?? source.sender);
  const attachments = (
    Array.isArray(source.attachments)
      ? source.attachments
      : Array.isArray(source.Attachments)
        ? source.Attachments
        : []
  )
    .map(normalizeAttachment)
    .filter((item): item is ExpenseInboxAttachmentInput => Boolean(item));

  if (to.length === 0 || !from.email) return null;

  return {
    to,
    fromEmail: from.email,
    fromName: from.name,
    subject:
      typeof source.subject === "string"
        ? source.subject
        : typeof source.Subject === "string"
          ? source.Subject
          : undefined,
    text:
      typeof source.text === "string"
        ? source.text
        : typeof source.TextBody === "string"
          ? source.TextBody
          : undefined,
    html:
      typeof source.html === "string"
        ? source.html
        : typeof source.HtmlBody === "string"
          ? source.HtmlBody
          : undefined,
    attachments,
  };
}

export function normalizeResendReceivedEmailMetadata(
  raw: unknown,
): ResendReceivedEmailMetadata | null {
  if (!isRecord(raw) || raw.type !== "email.received" || !isRecord(raw.data)) {
    return null;
  }

  const data = raw.data;
  const emailId = typeof data.email_id === "string" ? data.email_id : "";
  const from = fromEmailObject(data.from);
  const to = uniqueEmails([
    ...normalizeEmailList(data.to),
    ...normalizeEmailList(data.received_for),
  ]);
  if (!emailId || !from.email || to.length === 0) return null;

  const attachments = (Array.isArray(data.attachments) ? data.attachments : [])
    .map((attachment): ResendReceivedAttachmentMetadata | null => {
      if (!isRecord(attachment)) return null;
      const id = typeof attachment.id === "string" ? attachment.id : "";
      if (!id) return null;
      return {
        id,
        filename:
          typeof attachment.filename === "string"
            ? attachment.filename
            : undefined,
        contentType:
          typeof attachment.content_type === "string"
            ? attachment.content_type
            : undefined,
        size: typeof attachment.size === "number" ? attachment.size : undefined,
        contentDisposition:
          typeof attachment.content_disposition === "string"
            ? attachment.content_disposition
            : undefined,
        contentId:
          typeof attachment.content_id === "string"
            ? attachment.content_id
            : undefined,
      };
    })
    .filter(
      (attachment): attachment is ResendReceivedAttachmentMetadata =>
        Boolean(attachment),
    );

  return {
    emailId,
    email: {
      to,
      fromEmail: from.email,
      fromName: from.name,
      subject: typeof data.subject === "string" ? data.subject : undefined,
      attachments: [],
    },
    attachments,
  };
}

export function mapExpenseInboxScanPayload(raw: unknown): ExpenseScanPayload | undefined {
  if (!raw) return undefined;
  return normalizeExpenseScanPayload(raw) ?? undefined;
}
