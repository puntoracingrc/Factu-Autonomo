import { Buffer } from "node:buffer";

export const MAX_RESEND_ATTACHMENTS_PER_EMAIL = 10;
export const MAX_RESEND_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const MAX_RESEND_ATTACHMENTS_TOTAL_BYTES = 16 * 1024 * 1024;

const MAX_RESEND_ATTACHMENT_METADATA_BYTES = 64 * 1024;
const MAX_RESEND_RECEIVED_LIST_BYTES = 256 * 1024;
const RESEND_API_ORIGIN = "https://api.resend.com";
const RESEND_API_USER_AGENT = "Facturacion-Autonomos/expense-inbox";
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 10_000;

export type ExpenseInboxDownloadFailure =
  | "invalid_metadata"
  | "blocked_url"
  | "redirect"
  | "too_large"
  | "timeout"
  | "provider_error"
  | "download_error";

export class ExpenseInboxDownloadError extends Error {
  readonly failure: ExpenseInboxDownloadFailure;
  readonly providerStatus?: number;
  readonly providerHostname?: string;

  constructor(
    failure: ExpenseInboxDownloadFailure,
    message: string,
    providerStatus?: number,
    providerHostname?: string,
  ) {
    super(message);
    this.name = "ExpenseInboxDownloadError";
    this.failure = failure;
    this.providerStatus = providerStatus;
    this.providerHostname = providerHostname;
  }
}

export interface ResendAttachmentDownload {
  buffer: Buffer;
  filename?: string;
  contentType?: string;
  declaredSize?: number;
}

export interface RecentResendReceivedAttachment {
  id: string;
  filename?: string;
  contentType?: string;
  size?: number;
}

export interface RecentResendReceivedEmail {
  id: string;
  to: string[];
  from: string;
  subject?: string;
  createdAt: string;
  attachments: RecentResendReceivedAttachment[];
}

interface ResendAttachmentDownloadInput {
  apiKey: string;
  emailId: string;
  attachmentId: string;
  declaredSize?: number;
  maxBytes?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function splitResendAttachmentBatch<T>(attachments: readonly T[]): {
  selected: T[];
  overflow: T[];
} {
  return {
    selected: attachments.slice(0, MAX_RESEND_ATTACHMENTS_PER_EMAIL),
    overflow: attachments.slice(MAX_RESEND_ATTACHMENTS_PER_EMAIL),
  };
}

function assertValidByteLimit(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ExpenseInboxDownloadError(
      "invalid_metadata",
      `${label} no es válido.`,
    );
  }
}

function assertDeclaredSizeWithinLimit(
  declaredSize: number | undefined,
  maxBytes: number,
): void {
  if (declaredSize === undefined) return;
  if (!Number.isSafeInteger(declaredSize) || declaredSize < 0) {
    throw new ExpenseInboxDownloadError(
      "invalid_metadata",
      "El tamaño declarado del adjunto no es válido.",
    );
  }
  if (declaredSize > maxBytes) {
    throw new ExpenseInboxDownloadError(
      "too_large",
      "El adjunto supera el límite permitido.",
    );
  }
}

export function assertAllowedResendDownloadUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ExpenseInboxDownloadError(
      "blocked_url",
      "Resend devolvió un destino de descarga no permitido.",
    );
  }

  const hasCredentials = Boolean(url.username || url.password);
  const hasUnexpectedPort = Boolean(url.port && url.port !== "443");
  const hostname = url.hostname.toLowerCase();
  const isResendControlledHost =
    hostname === "cdn.resend.app" ||
    hostname === "resend.com" ||
    hostname.endsWith(".resend.com");
  if (
    url.protocol !== "https:" ||
    !isResendControlledHost ||
    hasCredentials ||
    hasUnexpectedPort ||
    url.hash
  ) {
    throw new ExpenseInboxDownloadError(
      "blocked_url",
      "Resend devolvió un destino de descarga no permitido.",
      undefined,
      hostname,
    );
  }

  return url;
}

function assertResponseDidNotRedirect(
  response: Response,
  allowedResponseUrl: (url: string) => void,
): void {
  if (response.redirected || (response.status >= 300 && response.status < 400)) {
    throw new ExpenseInboxDownloadError(
      "redirect",
      "La descarga del adjunto intentó redirigir a otro destino.",
    );
  }

  if (response.url) allowedResponseUrl(response.url);
}

function assertAllowedResendApiUrl(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ExpenseInboxDownloadError(
      "redirect",
      "La API de Resend respondió desde un destino no permitido.",
    );
  }

  if (
    url.origin !== RESEND_API_ORIGIN ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new ExpenseInboxDownloadError(
      "redirect",
      "La API de Resend respondió desde un destino no permitido.",
    );
  }
}

function declaredContentLength(response: Response): number | undefined {
  const raw = response.headers.get("content-length");
  if (raw === null) return undefined;
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new ExpenseInboxDownloadError(
      "invalid_metadata",
      "La respuesta contiene un tamaño declarado no válido.",
    );
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new ExpenseInboxDownloadError(
      "invalid_metadata",
      "La respuesta contiene un tamaño declarado no válido.",
    );
  }
  return parsed;
}

function timeoutError(): ExpenseInboxDownloadError {
  return new ExpenseInboxDownloadError(
    "timeout",
    "La descarga del adjunto agotó el tiempo permitido.",
  );
}

async function awaitWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw timeoutError();

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(timeoutError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function readResponseWithinLimit(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Buffer> {
  assertValidByteLimit(maxBytes, "El límite de descarga");
  const contentLength = declaredContentLength(response);
  if (contentLength !== undefined && contentLength > maxBytes) {
    throw new ExpenseInboxDownloadError(
      "too_large",
      "El adjunto supera el límite permitido.",
    );
  }

  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await awaitWithAbort(reader.read(), signal);
      if (done) break;
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        void reader.cancel("attachment-size-limit").catch(() => undefined);
        throw new ExpenseInboxDownloadError(
          "too_large",
          "El adjunto supera el límite permitido.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalDeclaredSize(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number") {
    throw new ExpenseInboxDownloadError(
      "invalid_metadata",
      "Resend devolvió un tamaño de adjunto no válido.",
    );
  }
  return value;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseRecentReceivedEmail(value: unknown): RecentResendReceivedEmail | null {
  if (!isRecord(value)) return null;
  const id = optionalString(value.id);
  const from = optionalString(value.from);
  const createdAt = optionalString(value.created_at);
  const to = stringArray(value.to);
  if (!id || !from || !createdAt || to.length === 0) return null;

  const attachments = Array.isArray(value.attachments)
    ? value.attachments.slice(0, MAX_RESEND_ATTACHMENTS_PER_EMAIL).flatMap((item) => {
        if (!isRecord(item)) return [];
        const attachmentId = optionalString(item.id);
        if (!attachmentId) return [];
        let size: number | undefined;
        try {
          size = optionalDeclaredSize(item.size);
        } catch {
          return [];
        }
        return [
          {
            id: attachmentId,
            filename: optionalString(item.filename),
            contentType: optionalString(item.content_type),
            size,
          },
        ];
      })
    : [];

  return {
    id,
    to,
    from,
    subject: optionalString(value.subject),
    createdAt,
    attachments,
  };
}

export async function listRecentResendReceivedEmails(input: {
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<RecentResendReceivedEmail[]> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
  assertValidByteLimit(timeoutMs, "El tiempo máximo de consulta");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await awaitWithAbort(
      fetchImpl(`${RESEND_API_ORIGIN}/emails/receiving`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${input.apiKey}`,
          "User-Agent": RESEND_API_USER_AGENT,
        },
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      }),
      controller.signal,
    );
    assertResponseDidNotRedirect(response, assertAllowedResendApiUrl);
    if (!response.ok) {
      throw new ExpenseInboxDownloadError(
        "provider_error",
        "Resend no devolvió los emails recibidos.",
        response.status,
      );
    }
    const buffer = await readResponseWithinLimit(
      response,
      MAX_RESEND_RECEIVED_LIST_BYTES,
      controller.signal,
    );
    let payload: unknown;
    try {
      payload = JSON.parse(buffer.toString("utf8"));
    } catch {
      throw new ExpenseInboxDownloadError(
        "invalid_metadata",
        "Resend devolvió una lista de emails no válida.",
      );
    }
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new ExpenseInboxDownloadError(
        "invalid_metadata",
        "Resend devolvió una lista de emails no válida.",
      );
    }
    return payload.data
      .slice(0, 100)
      .map(parseRecentReceivedEmail)
      .filter((item): item is RecentResendReceivedEmail => Boolean(item));
  } catch (error) {
    if (error instanceof ExpenseInboxDownloadError) throw error;
    if (controller.signal.aborted) throw timeoutError();
    throw new ExpenseInboxDownloadError(
      "provider_error",
      "No se pudieron consultar los emails recibidos por Resend.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadResendAttachment(
  input: ResendAttachmentDownloadInput,
): Promise<ResendAttachmentDownload> {
  const maxBytes = input.maxBytes ?? MAX_RESEND_ATTACHMENT_BYTES;
  const timeoutMs = input.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
  assertValidByteLimit(maxBytes, "El límite de descarga");
  assertValidByteLimit(timeoutMs, "El tiempo máximo de descarga");
  assertDeclaredSizeWithinLimit(input.declaredSize, maxBytes);

  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const apiUrl = `${RESEND_API_ORIGIN}/emails/receiving/${encodeURIComponent(
    input.emailId,
  )}/attachments/${encodeURIComponent(input.attachmentId)}`;

  try {
    const metadataResponse = await awaitWithAbort(
      fetchImpl(apiUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${input.apiKey}`,
          "User-Agent": RESEND_API_USER_AGENT,
        },
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      }),
      controller.signal,
    );
    assertResponseDidNotRedirect(metadataResponse, assertAllowedResendApiUrl);
    if (!metadataResponse.ok) {
      throw new ExpenseInboxDownloadError(
        "provider_error",
        "Resend no devolvió el adjunto solicitado.",
        metadataResponse.status,
      );
    }

    const metadataBuffer = await readResponseWithinLimit(
      metadataResponse,
      MAX_RESEND_ATTACHMENT_METADATA_BYTES,
      controller.signal,
    );
    let parsedMetadata: unknown;
    try {
      parsedMetadata = JSON.parse(metadataBuffer.toString("utf8"));
    } catch {
      throw new ExpenseInboxDownloadError(
        "invalid_metadata",
        "Resend devolvió metadatos de adjunto no válidos.",
      );
    }
    if (!isRecord(parsedMetadata)) {
      throw new ExpenseInboxDownloadError(
        "invalid_metadata",
        "Resend devolvió metadatos de adjunto no válidos.",
      );
    }

    const downloadUrl = optionalString(parsedMetadata.download_url);
    if (!downloadUrl) {
      throw new ExpenseInboxDownloadError(
        "invalid_metadata",
        "Resend no devolvió URL de descarga para el adjunto.",
      );
    }
    const metadataSize = optionalDeclaredSize(parsedMetadata.size);
    assertDeclaredSizeWithinLimit(metadataSize, maxBytes);
    const allowedDownloadUrl = assertAllowedResendDownloadUrl(downloadUrl);

    const fileResponse = await awaitWithAbort(
      fetchImpl(allowedDownloadUrl, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      }),
      controller.signal,
    );
    assertResponseDidNotRedirect(fileResponse, (responseUrl) => {
      assertAllowedResendDownloadUrl(responseUrl);
    });
    if (!fileResponse.ok) {
      throw new ExpenseInboxDownloadError(
        "download_error",
        "No se pudo descargar el adjunto recibido por Resend.",
      );
    }

    const buffer = await readResponseWithinLimit(
      fileResponse,
      maxBytes,
      controller.signal,
    );
    return {
      buffer,
      filename: optionalString(parsedMetadata.filename),
      contentType: optionalString(parsedMetadata.content_type),
      declaredSize: metadataSize,
    };
  } catch (error) {
    if (error instanceof ExpenseInboxDownloadError) throw error;
    if (controller.signal.aborted) throw timeoutError();
    throw new ExpenseInboxDownloadError(
      "download_error",
      "No se pudo descargar el adjunto recibido por Resend.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
