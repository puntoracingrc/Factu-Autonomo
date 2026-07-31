import { gunzipSync } from "node:zlib";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BOOTSTRAP_COMPRESSED_BODY =
  "CENTRAL_BUSINESS_BOOTSTRAP_COMPRESSED_BODY_V1";

type DecodeResult =
  | { ok: true; body: string }
  | { ok: false; code: "INVALID_JSON" | "INVALID_COMPRESSED_BOOTSTRAP_BODY" | "REQUEST_BODY_TOO_LARGE" };

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El decodificador de bootstrap central solo puede cargarse en servidor.",
    );
  }
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    return null;
  }
  try {
    return Buffer.from(value, "base64");
  } catch {
    return null;
  }
}

export function decodeCentralBusinessBootstrapRequestBody(
  raw: string,
  options: {
    maxRawBytes: number;
    maxDecodedBytes: number;
  },
): DecodeResult {
  if (byteLength(raw) > options.maxRawBytes) {
    return { ok: false, code: "REQUEST_BODY_TOO_LARGE" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, code: "INVALID_JSON" };
  }

  if (
    !isObject(parsed) ||
    parsed.schema !== CENTRAL_BUSINESS_BOOTSTRAP_COMPRESSED_BODY
  ) {
    return { ok: true, body: raw };
  }

  if (
    parsed.encoding !== "gzip+base64" ||
    typeof parsed.payload !== "string" ||
    parsed.payload.length === 0 ||
    (parsed.uncompressedBytes !== undefined &&
      (!Number.isInteger(parsed.uncompressedBytes) ||
        (parsed.uncompressedBytes as number) < 0 ||
        (parsed.uncompressedBytes as number) > options.maxDecodedBytes))
  ) {
    return { ok: false, code: "INVALID_COMPRESSED_BOOTSTRAP_BODY" };
  }

  const compressed = decodeBase64(parsed.payload);
  if (!compressed || compressed.byteLength > options.maxRawBytes) {
    return { ok: false, code: "INVALID_COMPRESSED_BOOTSTRAP_BODY" };
  }

  let decompressed: Buffer;
  try {
    decompressed = gunzipSync(compressed, {
      maxOutputLength: options.maxDecodedBytes + 1,
    });
  } catch {
    return { ok: false, code: "INVALID_COMPRESSED_BOOTSTRAP_BODY" };
  }

  if (decompressed.byteLength > options.maxDecodedBytes) {
    return { ok: false, code: "REQUEST_BODY_TOO_LARGE" };
  }
  if (
    parsed.uncompressedBytes !== undefined &&
    parsed.uncompressedBytes !== decompressed.byteLength
  ) {
    return { ok: false, code: "INVALID_COMPRESSED_BOOTSTRAP_BODY" };
  }

  return { ok: true, body: decompressed.toString("utf8") };
}
