"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { Document } from "@/lib/types";
import {
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID,
} from "./historical-import-scope";

export const CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT =
  "CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT_V1";
export {
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_NUMBERS,
  CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_USER_ID,
};

export interface CentralInvoiceAuthorityHistoricalImportItem {
  status: "committed" | "replayed" | "already_present";
  documentId: string;
  identityId: string;
  outboxEventId: string;
  fullNumber: string;
  sequence: number;
  documentVersion: number;
}

export type CentralInvoiceAuthorityHistoricalImportResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT;
      imported: CentralInvoiceAuthorityHistoricalImportItem[];
      counts: {
        committed: number;
        replayed: number;
        alreadyPresent: number;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export interface CentralInvoiceAuthorityHistoricalImportDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

async function defaultAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function defaultDeviceToken(): string | null {
  return getLocalCloudDeviceToken();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorResult(
  status: number,
  code: string,
  message: string,
): CentralInvoiceAuthorityHistoricalImportResult {
  return { ok: false, status, code, message };
}

function sanitizeDocumentForHistoricalImport(document: Document): unknown {
  const clone = JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
  delete clone.pdfSnapshot;
  delete clone.snapshotSeal;
  delete clone.snapshotIntegrity;
  delete clone.snapshotIntegrityRequired;
  delete clone.centralInvoiceAuthority;
  return clone;
}

function parseImportedItem(
  value: unknown,
): CentralInvoiceAuthorityHistoricalImportItem | null {
  if (!isObject(value)) return null;
  const {
    status,
    documentId,
    identityId,
    outboxEventId,
    fullNumber,
    sequence,
    documentVersion,
  } = value;
  const numberMatch =
    typeof fullNumber === "string"
      ? /^([A-Z0-9][A-Z0-9._-]{0,22}-(\d{4}))-(\d{4})$/u.exec(fullNumber)
      : null;
  if (
    (status !== "committed" &&
      status !== "replayed" &&
      status !== "already_present") ||
    typeof documentId !== "string" ||
    !documentId.trim() ||
    typeof identityId !== "string" ||
    !identityId.trim() ||
    typeof outboxEventId !== "string" ||
    !outboxEventId.trim() ||
    !numberMatch ||
    typeof sequence !== "number" ||
    !Number.isInteger(sequence) ||
    sequence <= 0 ||
    sequence !== Number.parseInt(numberMatch[3]!, 10) ||
    typeof documentVersion !== "number" ||
    !Number.isInteger(documentVersion) ||
    documentVersion <= 0
  ) {
    return null;
  }

  return {
    status,
    documentId,
    identityId,
    outboxEventId,
    fullNumber: numberMatch[0],
    sequence,
    documentVersion,
  };
}

function parseImportPayload(
  payload: unknown,
): Extract<CentralInvoiceAuthorityHistoricalImportResult, { ok: true }> | null {
  if (
    !isObject(payload) ||
    payload.ok !== true ||
    payload.schema !== "CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_ROUTE_V1" ||
    !Array.isArray(payload.imported) ||
    !isObject(payload.counts)
  ) {
    return null;
  }

  const imported = payload.imported.map(parseImportedItem);
  if (imported.some((item) => item === null)) return null;
  const counts = payload.counts;
  if (
    typeof counts.committed !== "number" ||
    typeof counts.replayed !== "number" ||
    typeof counts.alreadyPresent !== "number"
  ) {
    return null;
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_HISTORICAL_IMPORT_CLIENT,
    imported: imported as CentralInvoiceAuthorityHistoricalImportItem[],
    counts: {
      committed: counts.committed,
      replayed: counts.replayed,
      alreadyPresent: counts.alreadyPresent,
    },
  };
}

function importResponseMatchesRequest(
  result: Extract<CentralInvoiceAuthorityHistoricalImportResult, { ok: true }>,
  documents: Document[],
): boolean {
  const expectedNumbers = documents.map((document) =>
    document.number.trim().toUpperCase(),
  );
  const receivedNumbers = result.imported.map((item) => item.fullNumber);
  const counted =
    result.counts.committed +
    result.counts.replayed +
    result.counts.alreadyPresent;
  const actualCounts = {
    committed: result.imported.filter((item) => item.status === "committed")
      .length,
    replayed: result.imported.filter((item) => item.status === "replayed")
      .length,
    alreadyPresent: result.imported.filter(
      (item) => item.status === "already_present",
    ).length,
  };

  return (
    counted === documents.length &&
    result.imported.length === documents.length &&
    new Set(receivedNumbers).size === receivedNumbers.length &&
    expectedNumbers.every(
      (number, index) => receivedNumbers[index] === number,
    ) &&
    actualCounts.committed === result.counts.committed &&
    actualCounts.replayed === result.counts.replayed &&
    actualCounts.alreadyPresent === result.counts.alreadyPresent
  );
}

async function importHistoricalInvoicesFromBrowser(
  documents: Document[],
  mode: "cutover_batch" | "on_demand_original",
  dependencies: CentralInvoiceAuthorityHistoricalImportDependencies = {},
): Promise<CentralInvoiceAuthorityHistoricalImportResult> {
  const getAccessToken = dependencies.getAccessToken ?? defaultAccessToken;
  const getDeviceToken = dependencies.getDeviceToken ?? defaultDeviceToken;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const accessToken = await getAccessToken();
  const deviceToken = getDeviceToken();

  if (!accessToken || !deviceToken) {
    return errorResult(
      401,
      "CENTRAL_HISTORICAL_IMPORT_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de importar facturas pendientes.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl("/api/central-invoice-authority/historical-import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      },
      body: JSON.stringify({
        mode,
        documents: documents.map(sanitizeDocumentForHistoricalImport),
      }),
      cache: "no-store",
    });
  } catch {
    return errorResult(
      0,
      "CENTRAL_HISTORICAL_IMPORT_NETWORK_ERROR",
      "No se pudo contactar con la autoridad central de facturas.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      isObject(payload) && isObject(payload.error) ? payload.error : {};
    return errorResult(
      response.status,
      typeof error.code === "string"
        ? error.code
        : "CENTRAL_HISTORICAL_IMPORT_REJECTED",
      typeof error.message === "string"
        ? error.message
        : "La autoridad central no acepto la importacion historica.",
    );
  }

  const parsed = parseImportPayload(payload);
  if (!parsed || !importResponseMatchesRequest(parsed, documents)) {
    return errorResult(
      502,
      "CENTRAL_HISTORICAL_IMPORT_INVALID_RESPONSE",
      "La autoridad central no devolvio un resultado de importacion valido.",
    );
  }
  return parsed;
}

export async function importCentralInvoiceAuthorityHistoricalInvoicesFromBrowser(
  documents: Document[],
  dependencies: CentralInvoiceAuthorityHistoricalImportDependencies = {},
): Promise<CentralInvoiceAuthorityHistoricalImportResult> {
  return importHistoricalInvoicesFromBrowser(
    documents,
    "cutover_batch",
    dependencies,
  );
}

export async function importCentralInvoiceAuthorityHistoricalOriginalFromBrowser(
  document: Document,
  dependencies: CentralInvoiceAuthorityHistoricalImportDependencies = {},
): Promise<CentralInvoiceAuthorityHistoricalImportResult> {
  return importHistoricalInvoicesFromBrowser(
    [document],
    "on_demand_original",
    dependencies,
  );
}
