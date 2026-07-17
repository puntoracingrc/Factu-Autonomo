import { normalizeExpenseOriginalArchiveV1 } from "@/lib/expense-original-archive";
import type { ExpenseOriginalArchiveV1 } from "@/lib/types";
import { driveFetch, driveRequest, requestDriveAccessToken } from "./backup";
import { getGoogleDriveClientId } from "./config";
import {
  EXPENSE_DRIVE_ARCHIVE_POLICY_V1,
  MAX_EXPENSE_DRIVE_ARCHIVE_IMAGE_BYTES_V1,
  type ExpenseOriginalMimeTypeV1,
} from "./expense-original-archive.v1";
import { MAX_PDF_BYTES } from "../expense-scan/limits";

interface ExpenseDriveFileMetadataV1 {
  id?: string;
  mimeType?: string;
  size?: string;
  parents?: string[];
  trashed?: boolean;
  appProperties?: Record<string, string>;
}

export interface DownloadedExpenseOriginalV1 {
  bytes: Uint8Array;
  mimeType: ExpenseOriginalMimeTypeV1;
  extension: ".pdf" | ".jpg" | ".png" | ".webp" | ".gif";
}

export async function downloadExpenseOriginalFromGoogleDriveV1(
  archive: ExpenseOriginalArchiveV1,
): Promise<DownloadedExpenseOriginalV1> {
  const clientId = getGoogleDriveClientId();
  if (!clientId) {
    throw new Error("Google Drive no está configurado.");
  }
  const accessToken = await requestDriveAccessToken(clientId, "");
  return downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
    archive,
    accessToken,
  );
}

export async function downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
  archive: ExpenseOriginalArchiveV1,
  accessToken: string,
): Promise<DownloadedExpenseOriginalV1> {
  const normalized = normalizeExpenseOriginalArchiveV1(archive);
  if (!normalized || !accessToken.trim()) {
    throw new Error("La referencia del original de gasto no es válida.");
  }

  const metadata = await driveFetch<ExpenseDriveFileMetadataV1>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      normalized.driveFileId,
    )}?fields=id,mimeType,size,parents,trashed,appProperties`,
    accessToken,
  );
  assertManagedMetadata(metadata, normalized);

  const maxBytes = maxBytesForMime(normalized.sourceMimeType);
  const bytes = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      normalized.driveFileId,
    )}?alt=media`,
    accessToken,
    {},
    async (response) => {
      const contentType = response.headers
        .get("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (contentType && contentType !== normalized.sourceMimeType) {
        throw new Error("Drive devolvió un tipo de archivo distinto.");
      }
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new Error("El original de Drive supera el límite permitido.");
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > maxBytes) {
        throw new Error("El original de Drive no tiene un tamaño válido.");
      }
      return new Uint8Array(buffer);
    },
  );

  if (
    !hasStrictOriginalMagic(bytes, normalized.sourceMimeType) ||
    (await digestSha256(bytes)) !== normalized.sourceSha256
  ) {
    throw new Error(
      "El original de Drive ya no coincide con la huella guardada en Factu.",
    );
  }

  return Object.freeze({
    bytes,
    mimeType: normalized.sourceMimeType,
    extension: extensionForMime(normalized.sourceMimeType),
  });
}

function assertManagedMetadata(
  metadata: ExpenseDriveFileMetadataV1,
  archive: ExpenseOriginalArchiveV1,
): void {
  const size = Number(metadata.size);
  const appProperties = metadata.appProperties ?? {};
  const valid =
    metadata.id === archive.driveFileId &&
    metadata.trashed === false &&
    metadata.mimeType === archive.sourceMimeType &&
    Number.isSafeInteger(size) &&
    size > 0 &&
    size <= maxBytesForMime(archive.sourceMimeType) &&
    Array.isArray(metadata.parents) &&
    metadata.parents.includes(archive.driveFolderId) &&
    appProperties.factuManaged === EXPENSE_DRIVE_ARCHIVE_POLICY_V1 &&
    appProperties.factuSourceSha256 === archive.sourceSha256 &&
    appProperties.factuDocumentDate === archive.documentDate &&
    appProperties.factuOriginalSource === archive.source;
  if (!valid) {
    throw new Error(
      "El archivo de Drive no coincide con la referencia verificada del gasto.",
    );
  }
}

function maxBytesForMime(mimeType: ExpenseOriginalMimeTypeV1): number {
  return mimeType === "application/pdf"
    ? MAX_PDF_BYTES
    : MAX_EXPENSE_DRIVE_ARCHIVE_IMAGE_BYTES_V1;
}

function extensionForMime(
  mimeType: ExpenseOriginalMimeTypeV1,
): DownloadedExpenseOriginalV1["extension"] {
  const extensions: Record<
    ExpenseOriginalMimeTypeV1,
    DownloadedExpenseOriginalV1["extension"]
  > = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return extensions[mimeType];
}

function hasStrictOriginalMagic(
  bytes: Uint8Array,
  mimeType: ExpenseOriginalMimeTypeV1,
): boolean {
  if (mimeType === "application/pdf") {
    return (
      bytes.length >= 5 &&
      new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
    );
  }
  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (value, index) => bytes[index] === value,
      )
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  return (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0, 6)))
  );
}

async function digestSha256(bytes: Uint8Array): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(Array.from(bytes)).buffer,
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
