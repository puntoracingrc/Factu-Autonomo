import {
  createBackupArtifact,
  createBackupFilename,
  MAX_BACKUP_PREVIEW_BYTES,
  parseBackupJson,
  type BackupDownloadResult,
  type BackupImportPreviewCandidate,
  type DownloadBackupOptions,
} from "@/lib/backup";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import {
  decryptBackupEnvelope,
  encryptBackupText,
  inspectEncryptedBackupText,
  MAX_ENCRYPTED_BACKUP_BYTES,
} from "@/lib/security/backup-envelope";
import {
  appDataRecordCount,
  dispatchDataAccessEvent,
} from "@/lib/security/data-access-events";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { AppData } from "@/lib/types";

export type BackupKeyAccess =
  | { status: "ready"; version: number; keyBase64: string }
  | { status: "guest" }
  | { status: "error"; error: string };

export type BackupKeyResolver = (
  version?: number,
) => Promise<BackupKeyAccess>;

export interface ProtectedBackupArtifact {
  blob: Blob;
  text: string;
  contentSha256: string;
  byteLength: number;
  encrypted: boolean;
  keyVersion?: number;
}

export type ProtectedBackupDownloadResult =
  | (Extract<BackupDownloadResult, { ok: true }> & { encrypted: boolean })
  | Extract<BackupDownloadResult, { ok: false }>;

interface ProtectedBackupOptions {
  requireEncryption?: boolean;
  resolveKey?: BackupKeyResolver;
}

function validKeyResponse(value: unknown): value is {
  algorithm: "AES-GCM";
  version: number;
  key: string;
} {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.algorithm === "AES-GCM" &&
    Number.isSafeInteger(record.version) &&
    Number(record.version) >= 1 &&
    Number(record.version) <= 99 &&
    typeof record.key === "string" &&
    record.key.length <= 64
  );
}

export async function resolveBackupKeyForCurrentUser(
  version?: number,
): Promise<BackupKeyAccess> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return { status: "guest" };

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { status: "error", error: "No se pudo comprobar la sesión." };
  }
  const token = data.session?.access_token;
  if (!token) return { status: "guest" };

  const query = version === undefined ? "" : `?version=${version}`;
  try {
    const response = await fetch(`/api/security/backup-key${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok || !validKeyResponse(body)) {
      return {
        status: "error",
        error:
          response.status === 401
            ? "La sesión ha caducado. Inicia sesión de nuevo."
            : "El cifrado de copias no está disponible ahora.",
      };
    }
    if (version !== undefined && body.version !== version) {
      return { status: "error", error: "La versión de cifrado no coincide." };
    }
    return {
      status: "ready",
      version: body.version,
      keyBase64: body.key,
    };
  } catch {
    return {
      status: "error",
      error: "No se pudo conectar con el servicio de cifrado.",
    };
  }
}

export async function createProtectedBackupArtifact(
  data: AppData,
  exportedAt = new Date().toISOString(),
  options: ProtectedBackupOptions = {},
): Promise<ProtectedBackupArtifact> {
  const plaintext = createBackupArtifact(data, exportedAt);
  const key = await (options.resolveKey ?? resolveBackupKeyForCurrentUser)();

  if (key.status === "guest") {
    if (options.requireEncryption) {
      throw new Error("backup_encryption_requires_account");
    }
    return { ...plaintext, encrypted: false };
  }
  if (key.status === "error") {
    throw new Error(key.error);
  }

  const encrypted = await encryptBackupText(
    plaintext.text,
    key.keyBase64,
    key.version,
    exportedAt,
  );
  const blob = new Blob([encrypted.text], { type: "application/json" });
  if (blob.size > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error("encrypted_backup_too_large");
  }
  return {
    blob,
    text: encrypted.text,
    contentSha256: `sha256:${sha256Hex(encrypted.text)}`,
    byteLength: blob.size,
    encrypted: true,
    keyVersion: key.version,
  };
}

function protectedBackupError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "backup_encryption_requires_account") {
      return "Inicia sesión para crear una copia cifrada.";
    }
    if (error.message.startsWith("El cifrado") || error.message.startsWith("No se pudo")) {
      return error.message;
    }
  }
  return "No se pudo preparar la copia de seguridad cifrada.";
}

export async function downloadProtectedBackup(
  data: AppData,
  options: DownloadBackupOptions & ProtectedBackupOptions = {},
): Promise<ProtectedBackupDownloadResult> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return {
      ok: false,
      error: "La descarga no está disponible en este navegador.",
    };
  }

  const now = options.now?.() ?? new Date();
  const exportedAt = now.toISOString();
  const filename = createBackupFilename(exportedAt, options.purpose);
  let url: string | null = null;

  try {
    const artifact = await createProtectedBackupArtifact(data, exportedAt, options);
    url = URL.createObjectURL(artifact.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.click();
    dispatchDataAccessEvent({
      type: "backup_local",
      itemCount: appDataRecordCount(data),
      byteLength: artifact.byteLength,
    });
    return {
      ok: true,
      filename,
      contentSha256: artifact.contentSha256,
      byteLength: artifact.byteLength,
      disposition: "browser_download_requested",
      encrypted: artifact.encrypted,
    };
  } catch (error) {
    return { ok: false, error: protectedBackupError(error) };
  } finally {
    if (url && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
  }
}

export async function prepareProtectedBackupCandidate(
  candidate: BackupImportPreviewCandidate,
  resolveKey: BackupKeyResolver = resolveBackupKeyForCurrentUser,
): Promise<
  | { ok: true; candidate: BackupImportPreviewCandidate; encrypted: boolean }
  | { ok: false; error: string }
> {
  if (
    !Number.isSafeInteger(candidate.byteLength) ||
    candidate.byteLength < 0 ||
    candidate.byteLength > MAX_ENCRYPTED_BACKUP_BYTES
  ) {
    return { ok: false, error: "El archivo es demasiado grande para revisarlo." };
  }

  const inspection = inspectEncryptedBackupText(candidate.rawText);
  if (!inspection.encrypted) {
    return { ok: true, candidate, encrypted: false };
  }
  if ("error" in inspection) return { ok: false, error: inspection.error };

  const key = await resolveKey(inspection.envelope.keyVersion);
  if (key.status === "guest") {
    return {
      ok: false,
      error: "Inicia sesión con la cuenta que creó esta copia para descifrarla.",
    };
  }
  if (key.status === "error") return { ok: false, error: key.error };

  try {
    const rawText = await decryptBackupEnvelope(
      inspection.envelope,
      key.keyBase64,
    );
    const byteLength = new TextEncoder().encode(rawText).byteLength;
    if (byteLength > MAX_BACKUP_PREVIEW_BYTES) {
      return { ok: false, error: "La copia descifrada es demasiado grande." };
    }
    return {
      ok: true,
      encrypted: true,
      candidate: {
        ...candidate,
        mimeType: "application/json",
        byteLength,
        rawText,
      },
    };
  } catch {
    return {
      ok: false,
      error:
        "No se pudo descifrar la copia. Comprueba que has iniciado sesión con la cuenta correcta y que el archivo no está dañado.",
    };
  }
}

export async function readProtectedBackupFile(
  file: File,
): Promise<AppData | { error: string }> {
  if (file.size > MAX_ENCRYPTED_BACKUP_BYTES) {
    return { error: "El archivo es demasiado grande para revisarlo." };
  }
  try {
    const rawText = await file.text();
    const prepared = await prepareProtectedBackupCandidate({
      fileName: file.name,
      mimeType: file.type,
      byteLength: file.size,
      rawText,
    });
    if (!prepared.ok) return { error: prepared.error };
    return parseBackupJson(JSON.parse(prepared.candidate.rawText) as unknown);
  } catch {
    return { error: "No se pudo leer el archivo. Comprueba que sea JSON." };
  }
}
