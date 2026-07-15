import {
  driveFetch,
  driveRequest,
  requestDriveAccessToken,
} from "./backup";
import {
  FISCAL_NOTIFICATION_PDF_LIMITS,
  hasStrictPdfMagic,
} from "../fiscal-notifications/pdf-text-layer-parser";

export const FISCAL_NOTIFICATION_DRIVE_ARCHIVE_ROOT_FOLDER_V1 =
  "Factu - documentos oficiales" as const;
export const FISCAL_NOTIFICATION_DRIVE_ARCHIVE_PENDING_FOLDER_V1 =
  "Fecha pendiente" as const;
export const FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1 =
  "fiscal-notification-original-v1" as const;

const GOOGLE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_ARCHIVE_FIELDS = "id,name,parents,webViewLink";
const SHA256 = /^[0-9a-f]{64}$/u;
const DRIVE_ID = /^[A-Za-z0-9_-]{1,160}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

export interface FiscalNotificationOriginalFileV1 {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface FiscalNotificationDriveArchiveRequestV1 {
  readonly file: FiscalNotificationOriginalFileV1;
  readonly expectedSha256: string;
  readonly documentDate: string | null;
  readonly documentTitle: string;
}

export type FiscalNotificationDriveArchiveUploadResultV1 =
  | Readonly<{
      ok: true;
      fileId: string;
      folderId: string;
      sourceSha256: string;
      documentDate: string | null;
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

export function buildFiscalNotificationDriveArchiveFolderPathV1(
  documentDate: string | null,
): readonly string[] {
  if (documentDate === null) {
    return Object.freeze([
      FISCAL_NOTIFICATION_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
      FISCAL_NOTIFICATION_DRIVE_ARCHIVE_PENDING_FOLDER_V1,
    ]);
  }
  const parts = parseDocumentDate(documentDate);
  if (!parts) throw new Error("FISCAL_NOTIFICATION_DRIVE_INVALID_DATE");
  return Object.freeze([
    FISCAL_NOTIFICATION_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
    parts.year,
    parts.month,
  ]);
}

export function buildFiscalNotificationDriveArchiveFileNameV1(input: {
  readonly documentDate: string | null;
  readonly documentTitle: string;
  readonly sha256: string;
}): string {
  if (!SHA256.test(input.sha256)) {
    throw new Error("FISCAL_NOTIFICATION_DRIVE_INVALID_HASH");
  }
  if (input.documentDate !== null && !parseDocumentDate(input.documentDate)) {
    throw new Error("FISCAL_NOTIFICATION_DRIVE_INVALID_DATE");
  }
  const datePrefix = input.documentDate ?? "Fecha pendiente";
  const title = sanitizeDriveTitle(input.documentTitle);
  return `${datePrefix} - ${title} - ${input.sha256.slice(0, 10)}.pdf`;
}

export async function uploadFiscalNotificationOriginalToGoogleDriveV1(
  request: FiscalNotificationDriveArchiveRequestV1,
  options: Readonly<{ clientId: string; prompt?: "consent" | "" }>,
): Promise<FiscalNotificationDriveArchiveUploadResultV1> {
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
    return await uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
      request,
      accessToken,
    );
  } catch (error) {
    return archiveFailure(error);
  }
}

export async function uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
  request: FiscalNotificationDriveArchiveRequestV1,
  accessToken: string,
): Promise<FiscalNotificationDriveArchiveUploadResultV1> {
  try {
    if (!accessToken.trim()) {
      throw new Error("Google Drive no ha devuelto permiso.");
    }
    validateArchiveRequest(request);
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    if (
      bytes.byteLength !== request.file.size ||
      !hasStrictPdfMagic(bytes) ||
      (await digestSha256(bytes)) !== request.expectedSha256
    ) {
      throw new Error(
        "El PDF seleccionado ya no coincide con la ficha registrada.",
      );
    }

    const existing = await findManagedFileByHash(
      accessToken,
      request.expectedSha256,
    );
    if (existing) {
      const verified = await verifyDriveFileHash(
        accessToken,
        existing.id,
        request.expectedSha256,
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
        sourceSha256: request.expectedSha256,
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
      buildFiscalNotificationDriveArchiveFolderPathV1(request.documentDate),
    );
    const fileName = buildFiscalNotificationDriveArchiveFileNameV1({
      documentDate: request.documentDate,
      documentTitle: request.documentTitle,
      sha256: request.expectedSha256,
    });
    const uploaded = await uploadPdf(
      accessToken,
      folder.id,
      fileName,
      bytes,
      request.expectedSha256,
      request.documentDate,
    );
    const verified = await verifyDriveFileHash(
      accessToken,
      uploaded.id,
      request.expectedSha256,
    );
    if (!verified) {
      await trashUnverifiedFile(accessToken, uploaded.id);
      throw new Error(
        "Drive recibió el PDF, pero no devolvió bytes idénticos. No se ha marcado como archivado.",
      );
    }
    return Object.freeze({
      ok: true as const,
      fileId: uploaded.id,
      folderId: folder.id,
      sourceSha256: request.expectedSha256,
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
  if (!parentId) throw new Error("Drive no ha creado la carpeta de archivo.");
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
    `appProperties has { key='factuManagedFolder' and value='${FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1}' }`,
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
    throw new Error("Drive contiene más de una carpeta administrada equivalente.");
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
          factuManagedFolder: FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1,
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
): Promise<(DriveFileResultV1 & { id: string }) | null> {
  const query = [
    `appProperties has { key='factuManaged' and value='${FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1}' }`,
    `appProperties has { key='factuSourceSha256' and value='${sha256}' }`,
    "mimeType='application/pdf'",
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
      "Drive contiene más de un original administrado con la misma huella.",
    );
  }
  return matches[0] ?? null;
}

async function uploadPdf(
  accessToken: string,
  folderId: string,
  fileName: string,
  bytes: Uint8Array<ArrayBuffer>,
  sha256: string,
  documentDate: string | null,
): Promise<DriveFileResultV1 & { id: string }> {
  const boundary = `factu_fiscal_original_${createBoundaryToken()}`;
  const metadata = JSON.stringify({
    name: fileName,
    mimeType: "application/pdf",
    parents: [folderId],
    appProperties: {
      factuManaged: FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1,
      factuSourceSha256: sha256,
      factuDocumentDate: documentDate ?? "PENDING",
    },
  });
  const prefix = new TextEncoder().encode(
    [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      `--${boundary}`,
      "Content-Type: application/pdf",
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
): Promise<boolean> {
  const bytes = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId,
    )}?alt=media`,
    accessToken,
    {},
    async (response) => {
      const contentLength = Number(response.headers.get("content-length"));
      if (
        Number.isFinite(contentLength) &&
        contentLength > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes
      ) {
        throw new Error("El original de Drive supera el límite permitido.");
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes) {
        throw new Error("El original de Drive supera el límite permitido.");
      }
      return new Uint8Array(buffer);
    },
  );
  return (
    hasStrictPdfMagic(bytes) &&
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
  request: FiscalNotificationDriveArchiveRequestV1,
): void {
  if (!SHA256.test(request.expectedSha256)) {
    throw new Error("La huella del documento no es válida.");
  }
  if (
    request.file.type.toLowerCase() !== "application/pdf" ||
    !Number.isSafeInteger(request.file.size) ||
    request.file.size <= 0 ||
    request.file.size > FISCAL_NOTIFICATION_PDF_LIMITS.maxBytes
  ) {
    throw new Error("Selecciona el PDF original válido de esta ficha.");
  }
  if (request.documentDate !== null && !parseDocumentDate(request.documentDate)) {
    throw new Error("La fecha documental guardada no es válida.");
  }
  if (
    typeof request.documentTitle !== "string" ||
    request.documentTitle.length === 0 ||
    request.documentTitle.length > 2_000 ||
    /[\u0000-\u001f\u007f]/u.test(request.documentTitle)
  ) {
    throw new Error("El título estructurado del documento no es válido.");
  }
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
  return (sanitized || "Documento oficial").slice(0, 80).trim();
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
        : "No se pudo archivar el original en Google Drive.",
  });
}
