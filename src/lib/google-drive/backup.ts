import { createBackupPayload } from "@/lib/backup";
import type { AppData } from "@/lib/types";

export const DRIVE_BACKUP_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_BACKUP_FOLDER_NAME = "Factu - copias de seguridad";
export const DRIVE_BACKUP_SETTINGS_KEY = "factura-autonomo-drive-backup";
export const DRIVE_BACKUP_CALLBACK_PATH = "/drive/callback";
export const DRIVE_BACKUP_PENDING_KEY =
  "factura-autonomo-drive-backup-pending";
export const DRIVE_BACKUP_TOKEN_KEY = "factura-autonomo-drive-access-token";

export type DriveBackupFrequency =
  | "manual"
  | "daily"
  | "important"
  | "every_change";

export interface DriveBackupSettings {
  enabled: boolean;
  frequency: DriveBackupFrequency;
  lastBackupAt?: string;
  lastFileId?: string;
  lastFileName?: string;
  lastWebViewLink?: string;
  lastFolderWebViewLink?: string;
  lastAutoSignature?: string;
}

export interface PendingDriveBackupRequest {
  state: string;
  frequency: DriveBackupFrequency;
  requestedAt: string;
}

export interface DriveBackupDueDecision {
  due: boolean;
  signature: string;
  reason: "manual" | "daily" | "important" | "every_change" | "disabled";
}

export type DriveBackupUploadResult =
  | {
      ok: true;
      fileId: string;
      fileName: string;
      webViewLink?: string;
      folderWebViewLink?: string;
      exportedAt: string;
    }
  | { ok: false; error: string };

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GoogleCodeResponse {
  code?: string;
  error?: string;
  error_description?: string;
}

interface GoogleCodeClient {
  requestCode: () => void;
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    include_granted_scopes?: boolean;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: unknown) => void;
  }) => GoogleTokenClient;
  initCodeClient?: (config: {
    client_id: string;
    scope: string;
    ux_mode?: "popup" | "redirect";
    include_granted_scopes?: boolean;
    callback: (response: GoogleCodeResponse) => void;
    error_callback?: (error: unknown) => void;
  }) => GoogleCodeClient;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOauth2;
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";

const DRIVE_FILE_FIELDS = "id,name,webViewLink";
const DRIVE_BACKUP_PENDING_MAX_AGE_MS = 30 * 60 * 1000;

let scriptPromise: Promise<void> | null = null;
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export const DEFAULT_DRIVE_BACKUP_SETTINGS: DriveBackupSettings = {
  enabled: false,
  frequency: "manual",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeFrequency(value: unknown): DriveBackupFrequency {
  return value === "daily" || value === "important" || value === "every_change"
    ? value
    : "manual";
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function normalizeDriveBackupSettings(
  raw: unknown,
): DriveBackupSettings {
  if (!isRecord(raw)) return DEFAULT_DRIVE_BACKUP_SETTINGS;

  return {
    enabled: raw.enabled === true,
    frequency: normalizeFrequency(raw.frequency),
    lastBackupAt: safeString(raw.lastBackupAt),
    lastFileId: safeString(raw.lastFileId),
    lastFileName: safeString(raw.lastFileName),
    lastWebViewLink: safeString(raw.lastWebViewLink),
    lastFolderWebViewLink: safeString(raw.lastFolderWebViewLink),
    lastAutoSignature: safeString(raw.lastAutoSignature),
  };
}

export function loadDriveBackupSettings(): DriveBackupSettings {
  if (typeof window === "undefined") return DEFAULT_DRIVE_BACKUP_SETTINGS;

  try {
    return normalizeDriveBackupSettings(
      JSON.parse(localStorage.getItem(DRIVE_BACKUP_SETTINGS_KEY) ?? "null"),
    );
  } catch {
    return DEFAULT_DRIVE_BACKUP_SETTINGS;
  }
}

export function saveDriveBackupSettings(settings: DriveBackupSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRIVE_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

function normalizePendingDriveBackupRequest(
  raw: unknown,
): PendingDriveBackupRequest | null {
  if (!isRecord(raw)) return null;
  const state = safeString(raw.state);
  const requestedAt = safeString(raw.requestedAt);
  if (!state || !requestedAt) return null;

  const requestedTime = Date.parse(requestedAt);
  if (!Number.isFinite(requestedTime)) return null;
  if (Date.now() - requestedTime > DRIVE_BACKUP_PENDING_MAX_AGE_MS) return null;

  return {
    state,
    frequency: normalizeFrequency(raw.frequency),
    requestedAt,
  };
}

export function loadPendingDriveBackupRequest(
  expectedState?: string,
): PendingDriveBackupRequest | null {
  if (typeof window === "undefined") return null;

  try {
    const pending = normalizePendingDriveBackupRequest(
      JSON.parse(sessionStorage.getItem(DRIVE_BACKUP_PENDING_KEY) ?? "null"),
    );
    if (!pending) return null;
    if (expectedState && pending.state !== expectedState) return null;
    return pending;
  } catch {
    return null;
  }
}

export function clearPendingDriveBackupRequest(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRIVE_BACKUP_PENDING_KEY);
}

function createOauthState(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildGoogleDriveAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DRIVE_BACKUP_SCOPE);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export function startGoogleDriveBackupRedirect(input: {
  clientId: string;
  frequency: DriveBackupFrequency;
}): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Google Drive solo funciona en el navegador." };
  }

  const clientId = input.clientId.trim();
  if (!clientId) {
    return { ok: false, error: "Google Drive no está configurado." };
  }

  const pending: PendingDriveBackupRequest = {
    state: createOauthState(),
    frequency: input.frequency,
    requestedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(DRIVE_BACKUP_PENDING_KEY, JSON.stringify(pending));

  const redirectUri = `${window.location.origin}${DRIVE_BACKUP_CALLBACK_PATH}`;
  window.location.assign(
    buildGoogleDriveAuthorizationUrl({
      clientId,
      redirectUri,
      state: pending.state,
    }),
  );

  return { ok: true };
}

export function buildDriveBackupFileName(
  exportedAt = new Date().toISOString(),
): string {
  const stamp = exportedAt.slice(0, 16).replace("T", "-").replace(":", "");
  return `factu-autonomo-drive-backup-${stamp}.json`;
}

function newestTimestamp(items: Array<{ createdAt?: string; updatedAt?: string }>): string {
  return items.reduce((newest, item) => {
    const candidate = item.updatedAt ?? item.createdAt ?? "";
    return candidate > newest ? candidate : newest;
  }, "");
}

export function buildDriveBackupSignature(
  data: AppData,
  frequency: DriveBackupFrequency,
  now = new Date(),
): string {
  if (frequency === "daily") return now.toISOString().slice(0, 10);
  if (frequency === "every_change") {
    return data.meta?.lastModified ?? newestTimestamp(data.documents);
  }
  if (frequency === "important") {
    return [
      data.documents.length,
      data.expenses.length,
      data.recurringExpenses.length,
      data.userReminders.length,
      newestTimestamp(data.documents),
      newestTimestamp(data.expenses),
      newestTimestamp(data.recurringExpenses),
    ].join("|");
  }
  return "";
}

export function shouldRunAutomaticDriveBackup(
  settings: DriveBackupSettings,
  data: AppData,
  now = new Date(),
): DriveBackupDueDecision {
  if (!settings.enabled || settings.frequency === "manual") {
    return { due: false, signature: "", reason: "disabled" };
  }

  const signature = buildDriveBackupSignature(data, settings.frequency, now);
  if (!signature) {
    return { due: false, signature, reason: settings.frequency };
  }

  if (settings.frequency === "daily") {
    const today = now.toISOString().slice(0, 10);
    return {
      due: settings.lastBackupAt?.slice(0, 10) !== today,
      signature,
      reason: "daily",
    };
  }

  return {
    due: settings.lastAutoSignature !== signature,
    signature,
    reason: settings.frequency,
  };
}

function loadSessionToken(): { accessToken: string; expiresAt: number } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = JSON.parse(sessionStorage.getItem(DRIVE_BACKUP_TOKEN_KEY) ?? "null");
    if (!isRecord(raw)) return null;
    const accessToken = safeString(raw.accessToken);
    const expiresAt = Number(raw.expiresAt);
    if (!accessToken || !Number.isFinite(expiresAt)) return null;
    return { accessToken, expiresAt };
  } catch {
    return null;
  }
}

export function cacheDriveAccessToken(
  accessToken: string,
  expiresIn = 3600,
): void {
  const cleanToken = accessToken.trim();
  if (!cleanToken) return;

  cachedToken = {
    accessToken: cleanToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRIVE_BACKUP_TOKEN_KEY, JSON.stringify(cachedToken));
}

export function clearDriveAccessToken(): void {
  cachedToken = null;

  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRIVE_BACKUP_TOKEN_KEY);
}

function getCachedToken(): string | null {
  if (!cachedToken) cachedToken = loadSessionToken();
  if (!cachedToken) return null;
  if (cachedToken.expiresAt - Date.now() < 60_000) {
    clearDriveAccessToken();
    return null;
  }
  return cachedToken.accessToken;
}

export function hasUsableDriveToken(): boolean {
  return Boolean(getCachedToken());
}

function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Google Drive solo funciona en el navegador."));
  }

  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google Drive.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Drive."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function requestDriveAccessToken(
  clientId: string,
  prompt: "consent" | "" = "",
): Promise<string> {
  const existing = getCachedToken();
  if (existing) return existing;

  await loadGoogleIdentityServices();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google Drive no está disponible en este navegador.");

  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_BACKUP_SCOPE,
      include_granted_scopes: true,
      callback: (response) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description ||
                "Google no ha autorizado el acceso a Drive.",
            ),
          );
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google no devolvió permiso de Drive."));
          return;
        }

        cacheDriveAccessToken(response.access_token, response.expires_in);
        resolve(response.access_token);
      },
      error_callback: () => {
        reject(new Error("No se pudo abrir Google Drive."));
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function parseDriveError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && isRecord(payload.error)) {
      const message = safeString(payload.error.message);
      if (message?.includes("Google Drive API has not been used")) {
        return "Activa Google Drive API en Google Cloud para este proyecto.";
      }
      if (message) return message;
    }
  } catch {
    // El cuerpo de error de Google no siempre es JSON.
  }

  return `Google Drive ha rechazado la copia (${response.status}).`;
}

async function driveFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearDriveAccessToken();
      throw new Error(
        "El permiso de Google Drive ha caducado. Vuelve a conectar Drive.",
      );
    }

    throw new Error(await parseDriveError(response));
  }

  return (await response.json()) as T;
}

async function findOrCreateBackupFolder(
  accessToken: string,
): Promise<{ id: string; webViewLink?: string }> {
  const query = [
    "mimeType='application/vnd.google-apps.folder'",
    `name='${escapeDriveQueryValue(DRIVE_BACKUP_FOLDER_NAME)}'`,
    "trashed=false",
  ].join(" and ");
  const searchUrl =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}` +
    "&spaces=drive&fields=files(id,name,webViewLink)&pageSize=1";

  const found = await driveFetch<{
    files?: Array<{ id: string; name: string; webViewLink?: string }>;
  }>(searchUrl, accessToken);
  const existing = found.files?.[0];
  if (existing?.id) {
    return { id: existing.id, webViewLink: existing.webViewLink };
  }

  return await driveFetch<{ id: string; webViewLink?: string }>(
    "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        name: DRIVE_BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    },
  );
}

async function uploadJsonBackup(
  accessToken: string,
  folderId: string,
  fileName: string,
  jsonText: string,
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const boundary = `factu_drive_backup_${Date.now()}`;
  const metadata = {
    name: fileName,
    mimeType: "application/json",
    parents: [folderId],
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    jsonText,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return driveFetch<{ id: string; name: string; webViewLink?: string }>(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(
      DRIVE_FILE_FIELDS,
    )}`,
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
}

export async function uploadAppBackupToGoogleDrive(
  data: AppData,
  options: {
    clientId: string;
    prompt?: "consent" | "";
    now?: () => Date;
  },
): Promise<DriveBackupUploadResult> {
  try {
    if (!options.clientId.trim()) {
      return { ok: false, error: "Google Drive no está configurado." };
    }

    const accessToken = await requestDriveAccessToken(
      options.clientId,
      options.prompt ?? "",
    );
    return await uploadAppBackupToGoogleDriveWithAccessToken(data, accessToken, {
      now: options.now,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar la copia en Drive.",
    };
  }
}

export async function uploadAppBackupToGoogleDriveWithAccessToken(
  data: AppData,
  accessToken: string,
  options: {
    now?: () => Date;
  } = {},
): Promise<DriveBackupUploadResult> {
  try {
    if (!accessToken.trim()) {
      return { ok: false, error: "Google Drive no ha devuelto permiso." };
    }

    const exportedAt = (options.now?.() ?? new Date()).toISOString();
    const folder = await findOrCreateBackupFolder(accessToken);
    const fileName = buildDriveBackupFileName(exportedAt);
    const payload = createBackupPayload(data, exportedAt);
    const uploaded = await uploadJsonBackup(
      accessToken,
      folder.id,
      fileName,
      JSON.stringify(payload, null, 2),
    );

    return {
      ok: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink: uploaded.webViewLink,
      folderWebViewLink: folder.webViewLink,
      exportedAt,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar la copia en Drive.",
    };
  }
}
