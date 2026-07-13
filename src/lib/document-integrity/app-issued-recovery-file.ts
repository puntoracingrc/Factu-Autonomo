/**
 * Browser-only intake for an original PDF used as recovery evidence.
 *
 * The returned value deliberately excludes the filename and file contents. The
 * bytes only exist in memory while their PDF header and SHA-256 digest are
 * checked; callers must preserve the original PDF outside AppData.
 */

export const MAX_APP_ISSUED_RECOVERY_PDF_BYTES = 8 * 1024 * 1024;

export type AppIssuedRecoveryPdfFileErrorCode =
  | "UNSUPPORTED_FILE"
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "FILE_READ_FAILED"
  | "INVALID_PDF"
  | "HASH_UNAVAILABLE";

export class AppIssuedRecoveryPdfFileError extends Error {
  constructor(readonly code: AppIssuedRecoveryPdfFileErrorCode) {
    super(`APP_ISSUED_RECOVERY_PDF_FILE_ERROR:${code}`);
    this.name = "AppIssuedRecoveryPdfFileError";
  }
}

export interface AppIssuedRecoveryPdfFileEvidence {
  readonly sha256: string;
  readonly byteLength: number;
  readonly mediaType: "application/pdf";
}

/** @internal Test seam. Production uses Web Crypto directly. */
export interface AppIssuedRecoveryPdfFileDependencies {
  readonly digestSha256?: (
    bytes: Uint8Array<ArrayBuffer>,
  ) => Promise<ArrayBuffer>;
}

const PDF_MAGIC = Uint8Array.of(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-

export async function readAppIssuedRecoveryPdfFile(
  value: unknown,
  dependencies: AppIssuedRecoveryPdfFileDependencies = {},
): Promise<AppIssuedRecoveryPdfFileEvidence> {
  const file = assertPdfFile(value);
  const byteLength = readDeclaredByteLength(file);

  if (byteLength === 0) {
    throw new AppIssuedRecoveryPdfFileError("FILE_EMPTY");
  }
  if (byteLength > MAX_APP_ISSUED_RECOVERY_PDF_BYTES) {
    throw new AppIssuedRecoveryPdfFileError("FILE_TOO_LARGE");
  }

  const buffer = await readFileBuffer(file);
  if (buffer.byteLength !== byteLength) {
    throw new AppIssuedRecoveryPdfFileError("INVALID_PDF");
  }

  const bytes = new Uint8Array(buffer);
  if (!hasPdfMagic(bytes)) {
    throw new AppIssuedRecoveryPdfFileError("INVALID_PDF");
  }

  const digest = await digestSha256(bytes, dependencies.digestSha256);

  return Object.freeze({
    sha256: digestToLowercaseHex(digest),
    byteLength,
    mediaType: "application/pdf" as const,
  });
}

function assertPdfFile(value: unknown): File {
  let isFile = false;
  try {
    isFile = typeof File !== "undefined" && value instanceof File;
  } catch {
    isFile = false;
  }
  if (!isFile) {
    throw new AppIssuedRecoveryPdfFileError("UNSUPPORTED_FILE");
  }

  const file = value as File;
  try {
    if (file.type !== "application/pdf") {
      throw new AppIssuedRecoveryPdfFileError("UNSUPPORTED_FILE");
    }
  } catch (error) {
    if (error instanceof AppIssuedRecoveryPdfFileError) throw error;
    throw new AppIssuedRecoveryPdfFileError("UNSUPPORTED_FILE");
  }
  return file;
}

function readDeclaredByteLength(file: File): number {
  try {
    const size = file.size;
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new AppIssuedRecoveryPdfFileError("INVALID_PDF");
    }
    return size;
  } catch (error) {
    if (error instanceof AppIssuedRecoveryPdfFileError) throw error;
    throw new AppIssuedRecoveryPdfFileError("INVALID_PDF");
  }
}

async function readFileBuffer(file: File): Promise<ArrayBuffer> {
  try {
    const buffer = await file.arrayBuffer();
    if (!(buffer instanceof ArrayBuffer)) {
      throw new AppIssuedRecoveryPdfFileError("FILE_READ_FAILED");
    }
    return buffer;
  } catch (error) {
    if (error instanceof AppIssuedRecoveryPdfFileError) throw error;
    throw new AppIssuedRecoveryPdfFileError("FILE_READ_FAILED");
  }
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PDF_MAGIC.byteLength) return false;
  return PDF_MAGIC.every((expected, index) => bytes[index] === expected);
}

async function digestSha256(
  bytes: Uint8Array<ArrayBuffer>,
  injected?: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> {
  if (!injected && !globalThis.crypto?.subtle) {
    throw new AppIssuedRecoveryPdfFileError("HASH_UNAVAILABLE");
  }
  try {
    if (injected) return await injected(bytes);
    return await globalThis.crypto.subtle.digest("SHA-256", bytes);
  } catch {
    throw new AppIssuedRecoveryPdfFileError("HASH_UNAVAILABLE");
  }
}

function digestToLowercaseHex(digest: ArrayBuffer): string {
  if (!(digest instanceof ArrayBuffer) || digest.byteLength !== 32) {
    throw new AppIssuedRecoveryPdfFileError("HASH_UNAVAILABLE");
  }
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
