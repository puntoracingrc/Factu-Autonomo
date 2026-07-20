import {
  FISCAL_NOTIFICATION_PDF_LIMITS,
  hasStrictPdfMagic,
} from "./pdf-text-layer-parser";
import { assertBoundedOwnerScope } from "./input-contract";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

export const FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1 = 50 as const;
export const FISCAL_NOTIFICATION_BATCH_FILE_NAME_MAX_CHARS_V1 = 255 as const;

export type FiscalNotificationBatchFileErrorCodeV1 =
  | "ABORTED"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "HASH_UNAVAILABLE"
  | "INVALID_FILE_NAME"
  | "INVALID_PDF"
  | "UNSUPPORTED_FILE";

export class FiscalNotificationBatchFileErrorV1 extends Error {
  constructor(readonly code: FiscalNotificationBatchFileErrorCodeV1) {
    super(`FISCAL_NOTIFICATION_BATCH_FILE_ERROR:${code}`);
    this.name = "FiscalNotificationBatchFileErrorV1";
  }
}

export interface FiscalNotificationBatchFileLikeV1 {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface FiscalNotificationBatchFileFingerprintV1 {
  readonly byteLength: number;
  readonly displayName: string;
  readonly mimeType: "application/pdf";
  readonly sha256: string;
}

export type PersistedFiscalNotificationHashesV1 =
  | Readonly<{
      status: "READY";
      sha256: readonly string[];
    }>
  | Readonly<{
      status: "BLOCKED";
      sha256: readonly [];
    }>;

export interface ReadPersistedFiscalNotificationHashesOptionsV1 {
  /**
   * Solo permite el estado inicial legítimo de una cuenta que todavía no ha
   * creado su workspace. Un valor presente pero inválido continúa bloqueado.
   */
  readonly allowAbsentWorkspace?: boolean;
}

interface FingerprintDependenciesV1 {
  readonly digestSha256?: (
    bytes: Uint8Array<ArrayBuffer>,
  ) => Promise<ArrayBuffer>;
}

export async function fingerprintFiscalNotificationBatchFileV1(
  file: FiscalNotificationBatchFileLikeV1,
  signal?: AbortSignal,
  dependencies: FingerprintDependenciesV1 = {},
): Promise<FiscalNotificationBatchFileFingerprintV1> {
  assertActive(signal);
  const displayName = validateDisplayName(file.name);
  if (file.type.toLowerCase() !== "application/pdf") {
    throw new FiscalNotificationBatchFileErrorV1("UNSUPPORTED_FILE");
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new FiscalNotificationBatchFileErrorV1("EMPTY_FILE");
  }
  if (file.size > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes) {
    throw new FiscalNotificationBatchFileErrorV1("FILE_TOO_LARGE");
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new FiscalNotificationBatchFileErrorV1("INVALID_PDF");
  }
  assertActive(signal);
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== file.size) {
    throw new FiscalNotificationBatchFileErrorV1("INVALID_PDF");
  }
  const bytes = new Uint8Array(buffer);
  if (!hasStrictPdfMagic(bytes)) {
    throw new FiscalNotificationBatchFileErrorV1("INVALID_PDF");
  }

  let digest: ArrayBuffer;
  try {
    digest = dependencies.digestSha256
      ? await dependencies.digestSha256(bytes)
      : await digestSha256(bytes);
  } catch (error) {
    if (signal?.aborted) {
      throw new FiscalNotificationBatchFileErrorV1("ABORTED");
    }
    if (error instanceof FiscalNotificationBatchFileErrorV1) throw error;
    throw new FiscalNotificationBatchFileErrorV1("HASH_UNAVAILABLE");
  }
  assertActive(signal);
  if (!(digest instanceof ArrayBuffer) || digest.byteLength !== 32) {
    throw new FiscalNotificationBatchFileErrorV1("HASH_UNAVAILABLE");
  }

  return Object.freeze({
    byteLength: file.size,
    displayName,
    mimeType: "application/pdf" as const,
    sha256: toHex(digest),
  });
}

export function readPersistedFiscalNotificationHashesV1(
  value: unknown,
  ownerScope: string,
  options: ReadPersistedFiscalNotificationHashesOptionsV1 = {},
): PersistedFiscalNotificationHashesV1 {
  if (
    (value === undefined || value === null) &&
    options.allowAbsentWorkspace === true &&
    isValidUserOwnerScope(ownerScope)
  ) {
    return readyHashes([]);
  }
  const workspace = parseFiscalNotificationsWorkspaceForPersistenceV1(
    value,
    ownerScope,
  );
  if (!workspace) {
    return blockedHashes();
  }
  const activeFileIds = new Set(
    workspace.documents
      .filter((document) => document.ownerScope === ownerScope)
      .map((document) => document.fileId),
  );
  const hashes = [
    ...new Set(
      workspace.files
        .filter(
          (file) =>
            file.ownerScope === ownerScope && activeFileIds.has(file.id),
        )
        .map((file) => file.sha256),
    ),
  ].sort();
  return readyHashes(hashes);
}

function isValidUserOwnerScope(value: unknown): value is string {
  try {
    assertBoundedOwnerScope(value, "ownerScope");
    return value.startsWith("user:");
  } catch {
    return false;
  }
}

function readyHashes(
  hashes: readonly string[],
): PersistedFiscalNotificationHashesV1 {
  return Object.freeze({
    status: "READY" as const,
    sha256: Object.freeze([...hashes]),
  });
}

function blockedHashes(): PersistedFiscalNotificationHashesV1 {
  const empty = Object.freeze([]) as readonly [];
  return Object.freeze({ status: "BLOCKED" as const, sha256: empty });
}

function validateDisplayName(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > FISCAL_NOTIFICATION_BATCH_FILE_NAME_MAX_CHARS_V1 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new FiscalNotificationBatchFileErrorV1("INVALID_FILE_NAME");
  }
  return value;
}

function assertActive(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FiscalNotificationBatchFileErrorV1("ABORTED");
  }
}

async function digestSha256(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  if (!globalThis.crypto?.subtle) {
    throw new FiscalNotificationBatchFileErrorV1("HASH_UNAVAILABLE");
  }
  return globalThis.crypto.subtle.digest("SHA-256", bytes);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
