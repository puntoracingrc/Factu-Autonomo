import { NextResponse } from "next/server";

assertServerOnlyModule();

interface ReadBodyOptions {
  maxBytes: number;
  invalidMessage?: string;
  tooLargeMessage?: string;
}

export type ReadBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error("Request body helpers can only run on the server.");
  }
}

function payloadTooLarge(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 413 });
}

function invalidBody(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function declaredContentLength(request: Request): number | null {
  const raw = request.headers.get("content-length")?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  const length = Number(raw);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

export function rejectOversizedContentLength(
  request: Request,
  maxBytes: number,
  message = "La petición es demasiado grande.",
): NextResponse | null {
  const contentLength = declaredContentLength(request);
  return contentLength !== null && contentLength > maxBytes
    ? payloadTooLarge(message)
    : null;
}

async function readBytes(
  request: Request,
  options: ReadBodyOptions,
): Promise<ReadBodyResult<Uint8Array>> {
  const tooLargeMessage =
    options.tooLargeMessage ?? "La petición es demasiado grande.";
  const declaredTooLarge = rejectOversizedContentLength(
    request,
    options.maxBytes,
    tooLargeMessage,
  );
  if (declaredTooLarge) return { ok: false, response: declaredTooLarge };

  if (!request.body) return { ok: true, data: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > options.maxBytes) {
        await reader.cancel().catch(() => undefined);
        return {
          ok: false,
          response: payloadTooLarge(tooLargeMessage),
        };
      }
      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      response: invalidBody(
        options.invalidMessage ?? "No se pudo leer la petición.",
      ),
    };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, data: bytes };
}

export async function validateRequestBodySize(
  request: Request,
  maxBytes: number,
  message = "La petición es demasiado grande.",
): Promise<NextResponse | null> {
  const result = await readBytes(request.clone(), {
    maxBytes,
    tooLargeMessage: message,
  });
  return result.ok ? null : result.response;
}

export async function readTextBody(
  request: Request,
  options: ReadBodyOptions,
): Promise<ReadBodyResult<string>> {
  const result = await readBytes(request, options);
  if (!result.ok) return result;

  try {
    return {
      ok: true,
      data: new TextDecoder("utf-8", { fatal: true }).decode(result.data),
    };
  } catch {
    return {
      ok: false,
      response: invalidBody(
        options.invalidMessage ?? "El texto de la petición no es válido.",
      ),
    };
  }
}

export async function readJsonBody<T = unknown>(
  request: Request,
  options: ReadBodyOptions,
): Promise<ReadBodyResult<T>> {
  const result = await readTextBody(request, options);
  if (!result.ok) return result;

  try {
    return { ok: true, data: JSON.parse(result.data) as T };
  } catch {
    return {
      ok: false,
      response: invalidBody(options.invalidMessage ?? "JSON inválido."),
    };
  }
}
