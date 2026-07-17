import {
  driveFetch,
  driveRequest,
  requestDriveAccessToken,
} from "./backup";
import { MAX_PDF_BYTES } from "../expense-scan/limits";

export const EXPENSE_DRIVE_ARCHIVE_ROOT_FOLDER_V1 =
  "Factu - facturas de gastos" as const;
export const EXPENSE_DRIVE_ARCHIVE_POLICY_V1 =
  "expense-original-v1" as const;
export const MAX_EXPENSE_DRIVE_ARCHIVE_IMAGE_BYTES_V1 = 20 * 1024 * 1024;

const GOOGLE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_ARCHIVE_FIELDS = "id,name,parents,webViewLink";
const DRIVE_ID = /^[A-Za-z0-9_-]{1,160}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

export type ExpenseOriginalSourceV1 = "scan" | "expense_inbox";
export type ExpenseOriginalMimeTypeV1 =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export interface ExpenseOriginalFileV1 {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface ExpenseDriveArchiveRequestV1 {
  readonly file: ExpenseOriginalFileV1;
  readonly documentDate: string;
  readonly supplierName: string;
  readonly source: ExpenseOriginalSourceV1;
  readonly expectedSha256?: string;
}

export type ExpenseDriveArchiveUploadResultV1 =
  | Readonly<{
      ok: true;
      fileId: string;
      folderId: string;
      sourceSha256: string;
      sourceMimeType: ExpenseOriginalMimeTypeV1;
      documentDate: string;
      verification: "SHA256_READBACK_MATCH";
      reusedExisting: boolean;
      webViewLink?: string;
    }>
  | Readonly<{ ok: false; error: string }>;

interface DriveFileResultV1 {
  readonly id?: string;
  readonly name?: string;
  readonly parents?: readonly string[];
  readonly webViewLink?: string;
}

export function buildExpenseDriveArchiveFolderPathV1(
  documentDate: string,
): readonly string[] {
  const parts = parseDocumentDate(documentDate);
  if (!parts) throw new Error("EXPENSE_DRIVE_ARCHIVE_INVALID_DATE");
  return Object.freeze([
    EXPENSE_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
    parts.year,
    parts.month,
  ]);
}

export function buildExpenseDriveArchiveFileNameV1(input: {
  readonly documentDate: string;
  readonly supplierName: string;
  readonly sha256: string;
  readonly mimeType: ExpenseOriginalMimeTypeV1;
}): string {
  if (!parseDocumentDate(input.documentDate)) {
    throw new Error("EXPENSE_DRIVE_ARCHIVE_INVALID_DATE");
  }
  if (!SHA256.test(input.sha256)) {
    throw new Error("EXPENSE_DRIVE_ARCHIVE_INVALID_HASH");
  }
  return `${input.documentDate} - ${sanitizeDriveTitle(
    input.supplierName,
  )} - ${input.sha256.slice(0, 10)}${extensionForMime(input.mimeType)}`;
}

export async function uploadExpenseOriginalToGoogleDriveV1(
  request: ExpenseDriveArchiveRequestV1,
  options: Readonly<{ clientId: string; prompt?: "consent" | "" }>,
): Promise<ExpenseDriveArchiveUploadResultV1> {
  try {
    if (!options.clientId.trim()) {
      return Object.freeze({
        ok: false as const,
        error: "Google Drive no está configurado.",
      });
    }
    const accessToken = await requestDriveAccessToken(
      options.clientId,
      options.prompt ?? "",
    );
    return await uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
      request,
      accessToken,
    );
  } catch (error) {
    return archiveFailure(error);
  }
}

export async function uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
  request: ExpenseDriveArchiveRequestV1,
  accessToken: string,
): Promise<ExpenseDriveArchiveUploadResultV1> {
  try {
    if (!accessToken.trim()) {
      throw new Error("Google Drive no ha devuelto permiso.");
    }
    const mimeType = validateArchiveRequest(request);
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const sourceSha256 = await digestSha256(bytes);
    if (
      bytes.byteLength !== request.file.size ||
      !hasStrictOriginalMagic(bytes, mimeType) ||
      (request.expectedSha256 !== undefined &&
        sourceSha256 !== request.expectedSha256)
    ) {
      throw new Error(
        "El original ya no coincide con el documento escaneado.",
      );
    }

    const existing = await findManagedFileByHash(
      accessToken,
      sourceSha256,
      mimeType,
    );
    if (existing) {
      const verified = await verifyDriveFileHash(
        accessToken,
        existing.id,
        sourceSha256,
        mimeType,
      );
      if (!verified) {
        throw new Error(
          "El original existente en Drive no coincide con la huella registrada.",
        );
      }
      const folderId = existing.parents?.find(isDriveId);
      if (!folderId) {
        throw new Error("Drive no ha devuelto la carpeta del original.");
      }
      return Object.freeze({
        ok: true as const,
        fileId: existing.id,
        folderId,
        sourceSha256,
        sourceMimeType: mimeType,
        documentDate: request.documentDate,
        verification: "SHA256_READBACK_MATCH" as const,
        reusedExisting: true,
        ...(safeDriveWebViewLink(existing.webViewLink)
          ? { webViewLink: existing.webViewLink }
          : {}),
      });
    }

    const folder = await ensureArchiveFolderPath(
      accessToken,
      buildExpenseDriveArchiveFolderPathV1(request.documentDate),
    );
    const fileName = buildExpenseDriveArchiveFileNameV1({
      documentDate: request.documentDate,
      supplierName: request.supplierName,
      sha256: sourceSha256,
      mimeType,
    });
    const uploaded = await uploadOriginal(
      accessToken,
      folder.id,
      fileName,
      bytes,
      sourceSha256,
      mimeType,
      request.documentDate,
      request.source,
    );
    const verified = await verifyDriveFileHash(
      accessToken,
      uploaded.id,
      sourceSha256,
      mimeType,
    );
    if (!verified) {
      await trashUnverifiedFile(accessToken, uploaded.id);
      throw new Error(
        "Drive recibió el archivo, pero no devolvió bytes idénticos. No se ha marcado como archivado.",
      );
    }
    return Object.freeze({
      ok: true as const,
      fileId: uploaded.id,
      folderId: folder.id,
      sourceSha256,
      sourceMimeType: mimeType,
      documentDate: request.documentDate,
      verification: "SHA256_READBACK_MATCH" as const,
      reusedExisting: false,
      ...(safeDriveWebViewLink(uploaded.webViewLink)
        ? { webViewLink: uploaded.webViewLink }
        : {}),
    });
  } catch (error) {
    return archiveFailure(error);
  }
}

async function ensureArchiveFolderPath(
  accessToken: string,
  path: readonly string[],
): Promise<{ id: string }> {
  let parentId: string | null = null;
  for (const segment of path) {
    const folder = await findOrCreateFolder(accessToken, segment, parentId);
    parentId = folder.id;
  }
  if (!parentId) throw new Error("Drive no ha creado la carpeta de gastos.");
  return Object.freeze({ id: parentId });
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | null,
): Promise<{ id: string }> {
  const query = [
    `mimeType='${GOOGLE_FOLDER_MIME_TYPE}'`,
    `name='${escapeDriveQueryValue(name)}'`,
    `appProperties has { key='factuManagedFolder' and value='${EXPENSE_DRIVE_ARCHIVE_POLICY_V1}' }`,
    parentId ? `'${escapeDriveQueryValue(parentId)}' in parents` : null,
    "trashed=false",
  ]
    .filter((value): value is string => value !== null)
    .join(" and ");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("fields", "files(id)");
  url.searchParams.set("pageSize", "2");
  const found = await driveFetch<{ files?: DriveFileResultV1[] }>(
    url.toString(),
    accessToken,
  );
  const matches = (found.files ?? []).filter((file) => isDriveId(file.id));
  if (matches.length > 1) {
    throw new Error("Drive contiene más de una carpeta de gastos equivalente.");
  }
  const existing = matches[0];
  if (existing?.id) return Object.freeze({ id: existing.id });

  const created = await driveFetch<DriveFileResultV1>(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        name,
        mimeType: GOOGLE_FOLDER_MIME_TYPE,
        appProperties: {
          factuManagedFolder: EXPENSE_DRIVE_ARCHIVE_POLICY_V1,
        },
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    },
  );
  if (!isDriveId(created.id)) {
    throw new Error("Drive no ha devuelto un identificador de carpeta válido.");
  }
  return Object.freeze({ id: created.id });
}

async function findManagedFileByHash(
  accessToken: string,
  sha256: string,
  mimeType: ExpenseOriginalMimeTypeV1,
): Promise<(DriveFileResultV1 & { id: string }) | null> {
  const query = [
    `appProperties has { key='factuManaged' and value='${EXPENSE_DRIVE_ARCHIVE_POLICY_V1}' }`,
    `appProperties has { key='factuSourceSha256' and value='${sha256}' }`,
    `mimeType='${mimeType}'`,
    "trashed=false",
  ].join(" and ");
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("fields", `files(${DRIVE_ARCHIVE_FIELDS})`);
  url.searchParams.set("pageSize", "10");
  const result = await driveFetch<{ files?: DriveFileResultV1[] }>(
    url.toString(),
    accessToken,
  );
  const matches = (result.files ?? [])
    .filter((file): file is DriveFileResultV1 & { id: string } =>
      isDriveId(file.id),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  if (matches.length > 1) {
    throw new Error(
      "Drive contiene más de un original de gasto con la misma huella.",
    );
  }
  return matches[0] ?? null;
}

async function uploadOriginal(
  accessToken: string,
  folderId: string,
  fileName: string,
  bytes: Uint8Array<ArrayBuffer>,
  sha256: string,
  mimeType: ExpenseOriginalMimeTypeV1,
  documentDate: string,
  source: ExpenseOriginalSourceV1,
): Promise<DriveFileResultV1 & { id: string }> {
  const boundary = `factu_expense_original_${createBoundaryToken()}`;
  const metadata = JSON.stringify({
    name: fileName,
    mimeType,
    parents: [folderId],
    appProperties: {
      factuManaged: EXPENSE_DRIVE_ARCHIVE_POLICY_V1,
      factuSourceSha256: sha256,
      factuDocumentDate: documentDate,
      factuOriginalSource: source,
    },
  });
  const prefix = new TextEncoder().encode(
    [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      "",
    ].join("\r\n") + "\r\n",
  );
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const body = new Blob([prefix, bytes, suffix], {
    type: `multipart/related; boundary=${boundary}`,
  });
  const uploaded = await driveFetch<DriveFileResultV1>(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(
      DRIVE_ARCHIVE_FIELDS,
    )}`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!isDriveId(uploaded.id)) {
    throw new Error("Drive no ha devuelto un identificador de archivo válido.");
  }
  return Object.freeze({ ...uploaded, id: uploaded.id });
}

async function verifyDriveFileHash(
  accessToken: string,
  fileId: string,
  expectedSha256: string,
  mimeType: ExpenseOriginalMimeTypeV1,
): Promise<boolean> {
  const maxBytes = maxBytesForMime(mimeType);
  const bytes = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId,
    )}?alt=media`,
    accessToken,
    {},
    async (response) => {
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new Error("El original de Drive supera el límite permitido.");
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxBytes) {
        throw new Error("El original de Drive supera el límite permitido.");
      }
      return new Uint8Array(buffer);
    },
  );
  return (
    hasStrictOriginalMagic(bytes, mimeType) &&
    (await digestSha256(bytes)) === expectedSha256
  );
}

async function trashUnverifiedFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  try {
    await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}?fields=id,trashed`,
      accessToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ trashed: true }),
      },
    );
  } catch {
    // El error principal sigue siendo la falta de verificación del original.
  }
}

function validateArchiveRequest(
  request: ExpenseDriveArchiveRequestV1,
): ExpenseOriginalMimeTypeV1 {
  const mimeType = normalizeMimeType(request.file.type);
  if (!mimeType) {
    throw new Error("Selecciona un PDF o una imagen válida del gasto.");
  }
  if (
    !Number.isSafeInteger(request.file.size) ||
    request.file.size <= 0 ||
    request.file.size > maxBytesForMime(mimeType)
  ) {
    throw new Error("El original del gasto supera el límite permitido.");
  }
  if (!parseDocumentDate(request.documentDate)) {
    throw new Error("La fecha del gasto no es válida.");
  }
  if (
    typeof request.supplierName !== "string" ||
    request.supplierName.length === 0 ||
    request.supplierName.length > 2_000 ||
    /[\u0000-\u001f\u007f]/u.test(request.supplierName)
  ) {
    throw new Error("El proveedor del gasto no es válido.");
  }
  if (
    request.source !== "scan" &&
    request.source !== "expense_inbox"
  ) {
    throw new Error("El origen del gasto no es válido.");
  }
  if (
    request.expectedSha256 !== undefined &&
    !SHA256.test(request.expectedSha256)
  ) {
    throw new Error("La huella del original no es válida.");
  }
  return mimeType;
}

function normalizeMimeType(value: string): ExpenseOriginalMimeTypeV1 | null {
  const normalized = value.trim().toLowerCase().split(";", 1)[0];
  return normalized === "application/pdf" ||
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/webp" ||
    normalized === "image/gif"
    ? normalized
    : null;
}

function maxBytesForMime(mimeType: ExpenseOriginalMimeTypeV1): number {
  return mimeType === "application/pdf"
    ? MAX_PDF_BYTES
    : MAX_EXPENSE_DRIVE_ARCHIVE_IMAGE_BYTES_V1;
}

function hasStrictOriginalMagic(
  bytes: Uint8Array,
  mimeType: ExpenseOriginalMimeTypeV1,
): boolean {
  if (mimeType === "application/pdf") {
    return ascii(bytes, 0, 5) === "%PDF-";
  }
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      ascii(bytes, 1, 3) === "PNG" &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  }
  return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function parseDocumentDate(
  value: string,
): { readonly year: string; readonly month: string } | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Object.freeze({ year: match[1]!, month: match[2]! });
}

function sanitizeDriveTitle(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return (sanitized || "Sin proveedor").slice(0, 80).trim();
}

function extensionForMime(mimeType: ExpenseOriginalMimeTypeV1): string {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".gif";
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/'/gu, "\\'");
}

function createBoundaryToken(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID !== "function") {
    throw new Error("El navegador no puede preparar la subida de forma segura.");
  }
  return randomUUID.call(globalThis.crypto).replace(/-/gu, "");
}

function isDriveId(value: unknown): value is string {
  return typeof value === "string" && DRIVE_ID.test(value);
}

function safeDriveWebViewLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "drive.google.com" ||
        url.hostname.endsWith(".drive.google.com"))
    );
  } catch {
    return false;
  }
}

async function digestSha256(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("El navegador no puede verificar la huella del original.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function archiveFailure(
  error: unknown,
): Readonly<{ ok: false; error: string }> {
  return Object.freeze({
    ok: false as const,
    error:
      error instanceof Error
        ? error.message
        : "No se pudo archivar el original del gasto en Google Drive.",
  });
}
