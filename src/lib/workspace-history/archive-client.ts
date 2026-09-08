"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import {
  captureActiveWorkspaceOwnerScope,
  getActiveWorkspaceAccessToken,
} from "@/lib/cloud/active-workspace-session";
import type { Document } from "@/lib/types";

import {
  buildHistoricalWorkspaceArchive,
  verifyHistoricalWorkspaceArchive,
  type HistoricalWorkspaceArchiveDocument,
  type HistoricalWorkspaceArchiveManifest,
} from "./archive";
import type { HistoricalWorkspaceArchiveStatusRow } from "./archive-route-handler";

export const CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_CLIENT =
  "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_CLIENT_V1";

const ROUTE = "/api/workspace-history/archive";
const ROUTE_SCHEMA = "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE_V1";
const MAX_BATCH_DOCUMENTS = 80;
const MAX_BATCH_BODY_BYTES = 1_500_000;
const PULL_PAGE_SIZE = 50;
const MAX_PULL_PAGES = 220;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

export interface HistoricalWorkspaceArchiveClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
  expectedOwnerScope?: string | null;
}

export interface HistoricalWorkspaceArchiveUploadValue {
  archive: HistoricalWorkspaceArchiveStatusRow;
  manifest: HistoricalWorkspaceArchiveManifest;
}

export type HistoricalWorkspaceArchiveClientResult<T> =
  | {
      ok: true;
      schema: typeof CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_CLIENT;
      value: T;
    }
  | { ok: false; status: number; code: string; message: string };

interface ArchiveCredentials {
  fetchImpl: typeof fetch;
  accessToken: string;
  deviceToken: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function error<T>(
  status: number,
  code: string,
  message: string,
): HistoricalWorkspaceArchiveClientResult<T> {
  return { ok: false, status, code, message };
}

async function credentials(
  dependencies: HistoricalWorkspaceArchiveClientDependencies,
): Promise<ArchiveCredentials | null> {
  const ownerScope = captureActiveWorkspaceOwnerScope(
    dependencies.expectedOwnerScope,
  );
  const accessToken = await (
    dependencies.getAccessToken ??
    (() => getActiveWorkspaceAccessToken(ownerScope))
  )();
  const deviceToken = (
    dependencies.getDeviceToken ??
    (() => (ownerScope ? getLocalCloudDeviceToken(ownerScope) : null))
  )();
  if (!accessToken || !deviceToken) return null;
  return {
    fetchImpl: dependencies.fetchImpl ?? fetch,
    accessToken,
    deviceToken,
  };
}

function headers(value: ArchiveCredentials): HeadersInit {
  return {
    Authorization: `Bearer ${value.accessToken}`,
    "Content-Type": "application/json",
    [CLOUD_DEVICE_TOKEN_HEADER]: value.deviceToken,
  };
}

function parseStatus(value: unknown): HistoricalWorkspaceArchiveStatusRow | null {
  if (value === null) return null;
  if (!isObject(value)) return null;
  const completionIsValid =
    value.status === "uploading"
      ? value.completedAt === null
      : value.status === "ready" &&
        value.storedDocumentCount === value.expectedDocumentCount &&
        typeof value.completedAt === "string" &&
        Number.isFinite(Date.parse(value.completedAt));
  if (
    typeof value.archiveId !== "string" ||
    !UUID_PATTERN.test(value.archiveId) ||
    (value.status !== "uploading" && value.status !== "ready") ||
    typeof value.expectedDocumentCount !== "number" ||
    !Number.isInteger(value.expectedDocumentCount) ||
    value.expectedDocumentCount < 1 ||
    value.expectedDocumentCount > 10_000 ||
    typeof value.storedDocumentCount !== "number" ||
    !Number.isInteger(value.storedDocumentCount) ||
    value.storedDocumentCount < 0 ||
    value.storedDocumentCount > value.expectedDocumentCount ||
    typeof value.manifestHash !== "string" ||
    !SHA256_PATTERN.test(value.manifestHash) ||
    !completionIsValid
  ) {
    return null;
  }
  return value as unknown as HistoricalWorkspaceArchiveStatusRow;
}

function parseArchiveDocument(value: unknown): HistoricalWorkspaceArchiveDocument | null {
  if (!isObject(value) || !isObject(value.payload)) return null;
  if (
    typeof value.localDocumentId !== "string" ||
    (value.documentKind !== "factura" &&
      value.documentKind !== "factura_rectificativa") ||
    typeof value.contentHash !== "string" ||
    !SHA256_PATTERN.test(value.contentHash)
  ) {
    return null;
  }
  return value as unknown as HistoricalWorkspaceArchiveDocument;
}

async function payload(response: Response): Promise<Record<string, unknown> | null> {
  const parsed = (await response.json().catch(() => null)) as unknown;
  return isObject(parsed) ? parsed : null;
}

function rejected<T>(
  response: Response,
  body: Record<string, unknown> | null,
  fallbackCode: string,
  fallbackMessage: string,
): HistoricalWorkspaceArchiveClientResult<T> {
  const failure = body && isObject(body.error) ? body.error : null;
  return error(
    response.status,
    failure && typeof failure.code === "string"
      ? failure.code
      : fallbackCode,
    failure && typeof failure.message === "string"
      ? failure.message
      : fallbackMessage,
  );
}

function success<T>(value: T): HistoricalWorkspaceArchiveClientResult<T> {
  return {
    ok: true,
    schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_CLIENT,
    value,
  };
}

async function requestStatus(
  auth: ArchiveCredentials,
): Promise<HistoricalWorkspaceArchiveClientResult<HistoricalWorkspaceArchiveStatusRow | null>> {
  let response: Response;
  try {
    response = await auth.fetchImpl(`${ROUTE}?action=status`, {
      method: "GET",
      headers: headers(auth),
      cache: "no-store",
    });
  } catch {
    return error(
      0,
      "HISTORICAL_ARCHIVE_NETWORK_ERROR",
      "No se pudo comprobar la recuperación histórica.",
    );
  }
  const body = await payload(response);
  if (!response.ok) {
    return rejected(
      response,
      body,
      "HISTORICAL_ARCHIVE_STATUS_REJECTED",
      "El servidor no pudo comprobar la recuperación histórica.",
    );
  }
  if (!body || body.ok !== true || body.schema !== ROUTE_SCHEMA) {
    return error(
      502,
      "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
      "El servidor devolvió un estado histórico no válido.",
    );
  }
  const status = parseStatus(body.archive);
  if (body.archive !== null && !status) {
    return error(
      502,
      "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
      "El servidor devolvió un estado histórico no válido.",
    );
  }
  return success(status);
}

export async function getHistoricalWorkspaceArchiveStatusFromBrowser(
  dependencies: HistoricalWorkspaceArchiveClientDependencies = {},
): Promise<HistoricalWorkspaceArchiveClientResult<HistoricalWorkspaceArchiveStatusRow | null>> {
  const auth = await credentials(dependencies);
  if (!auth) {
    return error(
      401,
      "HISTORICAL_ARCHIVE_SESSION_REQUIRED",
      "Inicia sesión y registra este dispositivo para usar la recuperación histórica.",
    );
  }
  return requestStatus(auth);
}

async function post<T>(
  auth: ArchiveCredentials,
  body: Record<string, unknown>,
  parse: (payload: Record<string, unknown>) => T | null,
): Promise<HistoricalWorkspaceArchiveClientResult<T>> {
  let response: Response;
  try {
    response = await auth.fetchImpl(ROUTE, {
      method: "POST",
      headers: headers(auth),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return error(
      0,
      "HISTORICAL_ARCHIVE_NETWORK_ERROR",
      "La recuperación histórica no pudo contactar con el servidor.",
    );
  }
  const responseBody = await payload(response);
  if (!response.ok) {
    return rejected(
      response,
      responseBody,
      "HISTORICAL_ARCHIVE_REJECTED",
      "El servidor no confirmó la recuperación histórica.",
    );
  }
  if (
    !responseBody ||
    responseBody.ok !== true ||
    responseBody.schema !== ROUTE_SCHEMA
  ) {
    return error(
      502,
      "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
      "El servidor devolvió una confirmación histórica no válida.",
    );
  }
  const parsed = parse(responseBody);
  return parsed
    ? success(parsed)
    : error(
        502,
        "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
        "El servidor devolvió una confirmación histórica no válida.",
      );
}

function batches(
  archiveId: string,
  documents: HistoricalWorkspaceArchiveDocument[],
): HistoricalWorkspaceArchiveDocument[][] {
  const result: HistoricalWorkspaceArchiveDocument[][] = [];
  let current: HistoricalWorkspaceArchiveDocument[] = [];
  for (const document of documents) {
    const candidate = [...current, document];
    const bodyBytes = new TextEncoder().encode(
      JSON.stringify({ action: "append", archiveId, documents: candidate }),
    ).byteLength;
    if (
      current.length > 0 &&
      (candidate.length > MAX_BATCH_DOCUMENTS ||
        bodyBytes > MAX_BATCH_BODY_BYTES)
    ) {
      result.push(current);
      current = [document];
      continue;
    }
    if (bodyBytes > MAX_BATCH_BODY_BYTES) {
      throw new Error("HISTORICAL_DOCUMENT_TOO_LARGE");
    }
    current = candidate;
  }
  if (current.length > 0) result.push(current);
  return result;
}

export async function uploadHistoricalWorkspaceArchiveFromBrowser(
  documents: readonly Document[],
  options: {
    dependencies?: HistoricalWorkspaceArchiveClientDependencies;
    onProgress?: (stored: number, total: number) => void;
  } = {},
): Promise<HistoricalWorkspaceArchiveClientResult<HistoricalWorkspaceArchiveUploadValue>> {
  const auth = await credentials(options.dependencies ?? {});
  if (!auth) {
    return error(
      401,
      "HISTORICAL_ARCHIVE_SESSION_REQUIRED",
      "Inicia sesión y registra este dispositivo antes de preparar la recuperación.",
    );
  }
  let manifest: HistoricalWorkspaceArchiveManifest;
  try {
    manifest = buildHistoricalWorkspaceArchive(documents);
  } catch (failure) {
    return error(
      400,
      failure instanceof Error && "code" in failure
        ? String(failure.code)
        : "HISTORICAL_ARCHIVE_INVALID_LOCAL_DATA",
      failure instanceof Error
        ? failure.message
        : "No se pudo preparar la copia histórica local.",
    );
  }

  const begun = await post(
    auth,
    {
      action: "begin",
      archiveId: manifest.archiveId,
      expectedDocumentCount: manifest.documentCount,
      manifestHash: manifest.manifestHash,
    },
    (body) => parseStatus(body.archive),
  );
  if (!begun.ok) return begun;
  if (
    begun.value.expectedDocumentCount !== manifest.documentCount ||
    begun.value.manifestHash !== manifest.manifestHash
  ) {
    return error(
      409,
      "HISTORICAL_ARCHIVE_SERVER_CONFLICT",
      "El servidor conserva otra recuperación histórica y no se ha reemplazado.",
    );
  }
  const effectiveManifest = {
    ...manifest,
    archiveId: begun.value.archiveId,
  };
  if (begun.value.status === "ready") {
    return success({ archive: begun.value, manifest: effectiveManifest });
  }

  let uploaded = 0;
  let documentBatches: HistoricalWorkspaceArchiveDocument[][];
  try {
    documentBatches = batches(begun.value.archiveId, manifest.documents);
  } catch {
    return error(
      413,
      "HISTORICAL_DOCUMENT_TOO_LARGE",
      "Una factura histórica es demasiado grande para enviarla con seguridad.",
    );
  }
  for (const batch of documentBatches) {
    const appended = await post(
      auth,
      {
        action: "append",
        archiveId: begun.value.archiveId,
        documents: batch,
      },
      (body) => {
        const progress = isObject(body.progress) ? body.progress : null;
        return progress &&
          progress.archiveId === begun.value.archiveId &&
          typeof progress.storedDocumentCount === "number" &&
          Number.isInteger(progress.storedDocumentCount)
          ? {
              archiveId: progress.archiveId as string,
              storedDocumentCount: progress.storedDocumentCount,
            }
          : null;
      },
    );
    if (!appended.ok) return appended;
    uploaded = Math.max(uploaded + batch.length, appended.value.storedDocumentCount);
    options.onProgress?.(Math.min(uploaded, manifest.documentCount), manifest.documentCount);
  }

  const finalized = await post(
    auth,
    { action: "finalize", archiveId: begun.value.archiveId },
    (body) => parseStatus(body.archive),
  );
  if (!finalized.ok) return finalized;
  if (
    finalized.value.status !== "ready" ||
    finalized.value.expectedDocumentCount !== manifest.documentCount ||
    finalized.value.storedDocumentCount !== manifest.documentCount ||
    finalized.value.manifestHash !== manifest.manifestHash
  ) {
    return error(
      502,
      "HISTORICAL_ARCHIVE_FINALIZATION_MISMATCH",
      "El servidor no confirmó la copia histórica completa.",
    );
  }
  return success({ archive: finalized.value, manifest: effectiveManifest });
}

export async function pullHistoricalWorkspaceArchiveFromBrowser(
  dependencies: HistoricalWorkspaceArchiveClientDependencies = {},
): Promise<HistoricalWorkspaceArchiveClientResult<HistoricalWorkspaceArchiveManifest | null>> {
  const auth = await credentials(dependencies);
  if (!auth) {
    return error(
      401,
      "HISTORICAL_ARCHIVE_SESSION_REQUIRED",
      "Inicia sesión y registra este dispositivo para recuperar el histórico.",
    );
  }
  const current = await requestStatus(auth);
  if (!current.ok) return current;
  if (!current.value || current.value.status !== "ready") return success(null);

  const expected = current.value;
  const documents: HistoricalWorkspaceArchiveDocument[] = [];
  const ids = new Set<string>();
  let after = "";
  for (let page = 0; page < MAX_PULL_PAGES; page += 1) {
    let response: Response;
    try {
      const params = new URLSearchParams({
        action: "pull",
        after,
        limit: String(PULL_PAGE_SIZE),
      });
      response = await auth.fetchImpl(`${ROUTE}?${params}`, {
        method: "GET",
        headers: headers(auth),
        cache: "no-store",
      });
    } catch {
      return error(
        0,
        "HISTORICAL_ARCHIVE_NETWORK_ERROR",
        "No se pudo descargar la recuperación histórica completa.",
      );
    }
    const body = await payload(response);
    if (!response.ok) {
      return rejected(
        response,
        body,
        "HISTORICAL_ARCHIVE_PULL_REJECTED",
        "El servidor no pudo descargar la recuperación histórica.",
      );
    }
    const pageStatus = body ? parseStatus(body.archive) : null;
    if (
      !body ||
      body.ok !== true ||
      body.schema !== ROUTE_SCHEMA ||
      !pageStatus ||
      pageStatus.archiveId !== expected.archiveId ||
      pageStatus.manifestHash !== expected.manifestHash ||
      !Array.isArray(body.documents) ||
      typeof body.nextAfter !== "string" ||
      typeof body.hasMore !== "boolean"
    ) {
      return error(
        502,
        "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
        "El servidor devolvió una página histórica no válida.",
      );
    }
    const parsed = body.documents.map(parseArchiveDocument);
    if (parsed.some((entry) => entry === null)) {
      return error(
        502,
        "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
        "El servidor devolvió una factura histórica no válida.",
      );
    }
    for (const entry of parsed as HistoricalWorkspaceArchiveDocument[]) {
      if (ids.has(entry.localDocumentId)) {
        return error(
          502,
          "HISTORICAL_ARCHIVE_DUPLICATE_DOCUMENT",
          "La recuperación histórica contiene una factura repetida.",
        );
      }
      ids.add(entry.localDocumentId);
      documents.push(entry);
    }
    if (!body.hasMore) break;
    if (!body.nextAfter || body.nextAfter === after) {
      return error(
        502,
        "HISTORICAL_ARCHIVE_CURSOR_STALLED",
        "La descarga histórica no pudo avanzar con seguridad.",
      );
    }
    after = body.nextAfter;
    if (page === MAX_PULL_PAGES - 1) {
      return error(
        502,
        "HISTORICAL_ARCHIVE_TOO_MANY_PAGES",
        "La recuperación histórica supera el tamaño admitido.",
      );
    }
  }

  try {
    return success(
      verifyHistoricalWorkspaceArchive({
        archiveId: expected.archiveId,
        documentCount: expected.expectedDocumentCount,
        manifestHash: expected.manifestHash,
        documents,
      }),
    );
  } catch (failure) {
    return error(
      502,
      failure instanceof Error && "code" in failure
        ? String(failure.code)
        : "HISTORICAL_ARCHIVE_VERIFICATION_FAILED",
      failure instanceof Error
        ? failure.message
        : "La recuperación histórica no superó la verificación final.",
    );
  }
}
