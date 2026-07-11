import { getEmailFromAddress, isEmailConfigured } from "./config";

export interface EmailAttachment {
  filename: string;
  content: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Stable key for provider-side deduplication of a single logical email. */
  idempotencyKey?: string;
  /** Primarily exposed for directed tests; production uses the bounded default. */
  timeoutMs?: number;
}

export type SendEmailFailureKind = "known" | "ambiguous";

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
  status?: number;
  providerCode?: string;
  failureKind?: SendEmailFailureKind;
  retryable?: boolean;
  retryAfterSeconds?: number;
}

const DEFAULT_RESEND_TIMEOUT_MS = 10_000;
const MAX_RESEND_TIMEOUT_MS = 30_000;

function boundedTimeoutMs(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RESEND_TIMEOUT_MS;
  }
  return Math.max(1, Math.min(MAX_RESEND_TIMEOUT_MS, Math.floor(value)));
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1, Math.ceil(seconds));
  }
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return undefined;
  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
}

function providerErrorCode(body: string): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const nested =
      parsed.error && typeof parsed.error === "object"
        ? (parsed.error as Record<string, unknown>)
        : null;
    const value =
      parsed.name ?? parsed.code ?? nested?.name ?? nested?.code ?? undefined;
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function retryableKnownFailure(status: number): boolean {
  return status === 408 || status === 425 || status === 429;
}

async function classifyResendResponse(
  response: Response,
): Promise<SendEmailResult> {
  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // Status still separates client rejection (4xx) from an ambiguous
      // provider/infrastructure failure (5xx), even without the optional body.
    }
    const status = response.status;
    const code = providerErrorCode(body);
    const concurrentIdempotentRequest =
      status === 409 && code === "concurrent_idempotent_requests";
    const isKnown =
      status >= 400 && status < 500 && !concurrentIdempotentRequest;
    const providerRetryAfter = retryAfterSeconds(
      response.headers.get("retry-after"),
    );
    return {
      ok: false,
      status,
      ...(code ? { providerCode: code } : {}),
      failureKind: isKnown ? "known" : "ambiguous",
      retryable: isKnown ? retryableKnownFailure(status) : true,
      ...(providerRetryAfter ? { retryAfterSeconds: providerRetryAfter } : {}),
      error: body || `Resend respondió ${response.status}`,
    };
  }

  try {
    const data = (await response.json()) as { id?: string };
    if (!data.id) {
      return {
        ok: false,
        status: response.status,
        failureKind: "ambiguous",
        retryable: true,
        error: "Resend no devolvió un identificador de email",
      };
    }
    return { ok: true, id: data.id };
  } catch {
    return {
      ok: false,
      status: response.status,
      failureKind: "ambiguous",
      retryable: true,
      error: "No se pudo confirmar el identificador de Resend",
    };
  }
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      failureKind: "known",
      retryable: false,
      error: "RESEND_API_KEY no configurada",
    };
  }

  const idempotencyKey = input.idempotencyKey?.trim();
  if (idempotencyKey && idempotencyKey.length > 256) {
    return {
      ok: false,
      failureKind: "known",
      retryable: false,
      error: "Idempotency-Key no válida",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    boundedTimeoutMs(input.timeoutMs),
  );

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: getEmailFromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length
          ? { attachments: input.attachments }
          : {}),
      }),
      signal: controller.signal,
    });
    return await classifyResendResponse(response);
  } catch {
    return {
      ok: false,
      failureKind: "ambiguous",
      retryable: true,
      error: "No se pudo confirmar la respuesta de Resend",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { isEmailConfigured };
