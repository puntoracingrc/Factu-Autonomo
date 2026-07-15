import {
  driveFetch,
  requestDriveAccessToken,
} from "./backup";
import { FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1 } from "./fiscal-notification-original-archive.v1";

const DRIVE_ID = /^[A-Za-z0-9_-]{1,160}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const DRIVE_FILE_FIELDS = "id,mimeType,trashed,appProperties";

interface ManagedDriveOriginalMetadataV1 {
  readonly id?: string;
  readonly mimeType?: string;
  readonly trashed?: boolean;
  readonly appProperties?: Readonly<Record<string, string>>;
}

export interface FiscalNotificationDriveOriginalDeleteRequestV1 {
  readonly driveFileId: string;
  readonly expectedSha256: string;
}

export type FiscalNotificationDriveOriginalTrashResultV1 =
  | Readonly<{
      ok: true;
      changedByOperation: boolean;
      disposition: "MOVED_TO_TRASH" | "ALREADY_IN_TRASH";
    }>
  | Readonly<{ ok: false; error: string }>;

export type FiscalNotificationDriveOriginalRestoreResultV1 =
  | Readonly<{
      ok: true;
      disposition: "RESTORED" | "ALREADY_ACTIVE";
    }>
  | Readonly<{ ok: false; error: string }>;

export async function trashFiscalNotificationOriginalInGoogleDriveV1(
  request: FiscalNotificationDriveOriginalDeleteRequestV1,
  options: Readonly<{ clientId: string; prompt?: "consent" | "" }>,
): Promise<FiscalNotificationDriveOriginalTrashResultV1> {
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
    return await trashFiscalNotificationOriginalWithAccessTokenV1(
      request,
      accessToken,
    );
  } catch (error) {
    return driveDeleteFailure(error);
  }
}

export async function trashFiscalNotificationOriginalWithAccessTokenV1(
  request: FiscalNotificationDriveOriginalDeleteRequestV1,
  accessToken: string,
): Promise<FiscalNotificationDriveOriginalTrashResultV1> {
  try {
    validateRequest(request, accessToken);
    const before = await readManagedOriginalMetadata(accessToken, request);
    if (before.trashed === true) {
      return Object.freeze({
        ok: true as const,
        changedByOperation: false,
        disposition: "ALREADY_IN_TRASH" as const,
      });
    }
    await setTrashed(accessToken, request.driveFileId, true);
    const after = await readManagedOriginalMetadata(accessToken, request);
    if (after.trashed !== true) {
      throw new Error(
        "Google Drive no ha confirmado que el original esté en la papelera.",
      );
    }
    return Object.freeze({
      ok: true as const,
      changedByOperation: true,
      disposition: "MOVED_TO_TRASH" as const,
    });
  } catch (error) {
    return driveDeleteFailure(error);
  }
}

export async function restoreFiscalNotificationOriginalInGoogleDriveV1(
  request: FiscalNotificationDriveOriginalDeleteRequestV1,
  options: Readonly<{ clientId: string; prompt?: "consent" | "" }>,
): Promise<FiscalNotificationDriveOriginalRestoreResultV1> {
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
    return await restoreFiscalNotificationOriginalWithAccessTokenV1(
      request,
      accessToken,
    );
  } catch (error) {
    return driveRestoreFailure(error);
  }
}

export async function restoreFiscalNotificationOriginalWithAccessTokenV1(
  request: FiscalNotificationDriveOriginalDeleteRequestV1,
  accessToken: string,
): Promise<FiscalNotificationDriveOriginalRestoreResultV1> {
  try {
    validateRequest(request, accessToken);
    const before = await readManagedOriginalMetadata(accessToken, request);
    if (before.trashed !== true) {
      return Object.freeze({
        ok: true as const,
        disposition: "ALREADY_ACTIVE" as const,
      });
    }
    await setTrashed(accessToken, request.driveFileId, false);
    const after = await readManagedOriginalMetadata(accessToken, request);
    if (after.trashed === true) {
      throw new Error(
        "Google Drive no ha confirmado la restauración del original.",
      );
    }
    return Object.freeze({
      ok: true as const,
      disposition: "RESTORED" as const,
    });
  } catch (error) {
    return driveRestoreFailure(error);
  }
}

async function readManagedOriginalMetadata(
  accessToken: string,
  request: FiscalNotificationDriveOriginalDeleteRequestV1,
): Promise<ManagedDriveOriginalMetadataV1> {
  const result = await driveFetch<ManagedDriveOriginalMetadataV1>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      request.driveFileId,
    )}?fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
    accessToken,
  );
  if (
    result.id !== request.driveFileId ||
    result.mimeType !== "application/pdf" ||
    result.appProperties?.factuManaged !==
      FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1 ||
    result.appProperties?.factuSourceSha256 !== request.expectedSha256
  ) {
    throw new Error(
      "El archivo de Drive no coincide con el original verificado por Factu.",
    );
  }
  return result;
}

async function setTrashed(
  accessToken: string,
  driveFileId: string,
  trashed: boolean,
): Promise<void> {
  await driveFetch<ManagedDriveOriginalMetadataV1>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      driveFileId,
    )}?fields=id,trashed`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ trashed }),
    },
  );
}

function validateRequest(
  request: FiscalNotificationDriveOriginalDeleteRequestV1,
  accessToken: string,
): void {
  if (
    !DRIVE_ID.test(request.driveFileId) ||
    !SHA256.test(request.expectedSha256)
  ) {
    throw new Error("El enlace verificado con Google Drive no es válido.");
  }
  if (!accessToken.trim()) {
    throw new Error("Google Drive no ha devuelto permiso.");
  }
}

function driveDeleteFailure(
  error: unknown,
): Readonly<{ ok: false; error: string }> {
  return Object.freeze({
    ok: false as const,
    error:
      error instanceof Error
        ? error.message
        : "No se pudo enviar el original a la papelera de Google Drive.",
  });
}

function driveRestoreFailure(
  error: unknown,
): Readonly<{ ok: false; error: string }> {
  return Object.freeze({
    ok: false as const,
    error:
      error instanceof Error
        ? error.message
        : "No se pudo restaurar el original en Google Drive.",
  });
}
