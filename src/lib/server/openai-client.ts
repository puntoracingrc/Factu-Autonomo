assertServerOnlyModule();

const OPENAI_API_BASE = "https://api.openai.com/v1";
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 1;
const MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 1_000;

export type OpenAiEndpoint = "chat/completions" | "responses";
export type OpenAiClientErrorCode =
  | "NOT_CONFIGURED"
  | "ABORTED"
  | "TIMEOUT"
  | "TRANSIENT_PROVIDER_ERROR"
  | "PROVIDER_REJECTED"
  | "INVALID_PROVIDER_RESPONSE";

export interface OpenAiUsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface OpenAiRequestMetrics extends OpenAiUsageMetrics {
  attempts: number;
  durationMs: number;
}

export interface OpenAiJsonResponse<T> {
  data: T;
  metrics: OpenAiRequestMetrics;
}

interface OpenAiJsonRequest {
  endpoint: OpenAiEndpoint;
  body: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxAttempts?: number;
}

export class OpenAiClientError extends Error {
  readonly code: OpenAiClientErrorCode;
  readonly status?: number;
  readonly transient: boolean;
  readonly attempts: number;
  readonly durationMs: number;

  constructor(options: {
    code: OpenAiClientErrorCode;
    status?: number;
    transient: boolean;
    attempts: number;
    durationMs: number;
  }) {
    super("La solicitud al proveedor de IA no pudo completarse.");
    this.name = "OpenAiClientError";
    this.code = options.code;
    this.status = options.status;
    this.transient = options.transient;
    this.attempts = options.attempts;
    this.durationMs = options.durationMs;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("El cliente OpenAI solo puede cargarse en servidor.");
  }
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(value as number)));
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0
    ? (value as number)
    : undefined;
}

function usageFromResponse(value: unknown): OpenAiUsageMetrics {
  if (!value || typeof value !== "object") return {};
  const usage = (value as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return {};
  const record = usage as Record<string, unknown>;
  const inputTokens = positiveInteger(
    record.input_tokens ?? record.prompt_tokens,
  );
  const outputTokens = positiveInteger(
    record.output_tokens ?? record.completion_tokens,
  );
  const totalTokens = positiveInteger(record.total_tokens);
  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
  };
}

function retryDelayMs(response: Response, attempt: number): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      const delayMs = Math.round(seconds * 1_000);
      return delayMs <= MAX_RETRY_DELAY_MS ? delayMs : null;
    }
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      const delayMs = Math.max(0, retryAt - Date.now());
      return delayMs <= MAX_RETRY_DELAY_MS ? delayMs : null;
    }
  }
  return Math.min(MAX_RETRY_DELAY_MS, 100 * 2 ** Math.max(0, attempt - 1));
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // No se inspecciona ni registra el cuerpo de error del proveedor.
  }
}

async function waitForRetry(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timeout = setTimeout(finish, delayMs);
    const abort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

async function waitForRetryOrThrow(
  delayMs: number,
  signal: AbortSignal | undefined,
  attempts: number,
  startedAt: number,
) {
  try {
    await waitForRetry(delayMs, signal);
  } catch {
    throw new OpenAiClientError({
      code: "ABORTED",
      transient: false,
      attempts,
      durationMs: Date.now() - startedAt,
    });
  }
}

function requestSignal(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternal = () => controller.abort();
  external?.addEventListener("abort", abortFromExternal, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timeout);
      external?.removeEventListener("abort", abortFromExternal);
    },
  };
}

export async function requestOpenAiJson<T>(
  request: OpenAiJsonRequest,
): Promise<OpenAiJsonResponse<T>> {
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAiClientError({
      code: "NOT_CONFIGURED",
      transient: false,
      attempts: 0,
      durationMs: 0,
    });
  }

  const timeoutMs = boundedInteger(
    request.timeoutMs,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxAttempts = boundedInteger(
    request.maxAttempts,
    DEFAULT_MAX_ATTEMPTS,
    MAX_ATTEMPTS,
  );
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (request.signal?.aborted) {
      throw new OpenAiClientError({
        code: "ABORTED",
        transient: false,
        attempts,
        durationMs: Date.now() - startedAt,
      });
    }
    attempts += 1;
    const controlledSignal = requestSignal(request.signal, timeoutMs);
    try {
      const response = await fetch(`${OPENAI_API_BASE}/${request.endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.body),
        signal: controlledSignal.signal,
      });

      if (!response.ok) {
        const transient = isTransientStatus(response.status);
        const delay = retryDelayMs(response, attempts);
        await cancelResponseBody(response);
        if (transient && attempts < maxAttempts) {
          if (delay !== null) {
            controlledSignal.dispose();
            await waitForRetryOrThrow(
              delay,
              request.signal,
              attempts,
              startedAt,
            );
            continue;
          }
        }
        throw new OpenAiClientError({
          code: transient
            ? "TRANSIENT_PROVIDER_ERROR"
            : "PROVIDER_REJECTED",
          status: response.status,
          transient,
          attempts,
          durationMs: Date.now() - startedAt,
        });
      }

      let data: T;
      try {
        data = (await response.json()) as T;
      } catch {
        throw new OpenAiClientError({
          code: "INVALID_PROVIDER_RESPONSE",
          status: response.status,
          transient: false,
          attempts,
          durationMs: Date.now() - startedAt,
        });
      }
      return {
        data,
        metrics: {
          attempts,
          durationMs: Date.now() - startedAt,
          ...usageFromResponse(data),
        },
      };
    } catch (error) {
      if (error instanceof OpenAiClientError) throw error;
      const externallyAborted = request.signal?.aborted === true;
      const timedOut = controlledSignal.timedOut();
      if (externallyAborted || timedOut) {
        if (timedOut && attempts < maxAttempts) {
          await waitForRetryOrThrow(
            100 * 2 ** Math.max(0, attempts - 1),
            request.signal,
            attempts,
            startedAt,
          );
          continue;
        }
        throw new OpenAiClientError({
          code: externallyAborted ? "ABORTED" : "TIMEOUT",
          transient: timedOut,
          attempts,
          durationMs: Date.now() - startedAt,
        });
      }
      if (attempts >= maxAttempts) {
        throw new OpenAiClientError({
          code: "TRANSIENT_PROVIDER_ERROR",
          transient: true,
          attempts,
          durationMs: Date.now() - startedAt,
        });
      }
      await waitForRetryOrThrow(
        100 * 2 ** Math.max(0, attempts - 1),
        request.signal,
        attempts,
        startedAt,
      );
    } finally {
      controlledSignal.dispose();
    }
  }

  throw new OpenAiClientError({
    code: "TRANSIENT_PROVIDER_ERROR",
    transient: true,
    attempts,
    durationMs: Date.now() - startedAt,
  });
}
