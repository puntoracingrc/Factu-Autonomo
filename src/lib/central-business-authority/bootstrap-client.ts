"use client";

import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { AppData } from "@/lib/types";

import type { CentralBusinessJson } from "./mutation-command";

export const CENTRAL_BUSINESS_BOOTSTRAP_CLIENT =
  "CENTRAL_BUSINESS_BOOTSTRAP_CLIENT_V1";
export const CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION =
  "COMMIT_CENTRAL_BUSINESS_BOOTSTRAP_V1";

export type CentralBusinessBootstrapBrowserEntityType =
  | "customer"
  | "supplier"
  | "product"
  | "user_reminder"
  | "expense"
  | "recurring_expense"
  | "quote"
  | "receipt"
  | "profile";

export interface CentralBusinessBootstrapBrowserEntity {
  entityType: CentralBusinessBootstrapBrowserEntityType;
  entityId: string;
  payload: CentralBusinessJson;
}

export interface CentralBusinessBootstrapBrowserPreviewEntry {
  entityType: CentralBusinessBootstrapBrowserEntityType;
  entityId: string;
  status: "create" | "identical" | "conflict" | "central_only";
  centralVersion: number | null;
  centralDeleted: boolean;
}

export interface CentralBusinessBootstrapBrowserPreview {
  schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1";
  snapshotDigest: string;
  centralStateDigest: string;
  previewDigest: string;
  summary: {
    local: number;
    centralActive: number;
    centralDeleted: number;
    create: number;
    identical: number;
    conflict: number;
    centralOnly: number;
  };
  entries: CentralBusinessBootstrapBrowserPreviewEntry[];
  canCommit: boolean;
}

export type CentralBusinessBootstrapPreviewClientResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_BOOTSTRAP_CLIENT;
      preview: CentralBusinessBootstrapBrowserPreview;
    }
  | CentralBusinessBootstrapClientFailure;

export type CentralBusinessBootstrapCommitClientResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_BOOTSTRAP_CLIENT;
      result: {
        status: "committed" | "replayed";
        createdCount: number;
        identicalCount: number;
        firstEventSequence: number | null;
        lastEventSequence: number | null;
      };
    }
  | CentralBusinessBootstrapClientFailure;

interface CentralBusinessBootstrapClientFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
  preview?: CentralBusinessBootstrapBrowserPreview;
}

export interface CentralBusinessBootstrapClientDependencies {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  getDeviceToken?: () => string | null;
}

const ENTITY_TYPES = new Set<CentralBusinessBootstrapBrowserEntityType>([
  "customer",
  "supplier",
  "product",
  "user_reminder",
  "expense",
  "recurring_expense",
  "quote",
  "receipt",
  "profile",
]);
const ENTRY_STATUSES = new Set<
  CentralBusinessBootstrapBrowserPreviewEntry["status"]
>(["create", "identical", "conflict", "central_only"]);
const DIGEST = /^[0-9a-f]{64}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJson(value: unknown): value is CentralBusinessJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJson);
  return isObject(value) && Object.values(value).every(isJson);
}

function jsonPayload(
  value: unknown,
  expectedId: string,
  options: { requireMatchingId?: boolean } = {},
): CentralBusinessJson {
  const serialized = JSON.stringify(value);
  const parsed = serialized ? (JSON.parse(serialized) as unknown) : null;
  if (
    !isObject(parsed) ||
    (options.requireMatchingId !== false && parsed.id !== expectedId) ||
    !isJson(parsed)
  ) {
    throw new Error("INVALID_BOOTSTRAP_LOCAL_ENTITY");
  }
  return parsed;
}

export function buildCentralBusinessBootstrapBrowserSnapshot(
  data: AppData,
): CentralBusinessBootstrapBrowserEntity[] {
  const entities: CentralBusinessBootstrapBrowserEntity[] = [
    ...data.customers.map((entity) => ({
      entityType: "customer" as const,
      entityId: entity.id,
      payload: jsonPayload(entity, entity.id),
    })),
    ...data.suppliers.map((entity) => ({
      entityType: "supplier" as const,
      entityId: entity.id,
      payload: jsonPayload(entity, entity.id),
    })),
    ...data.products.map((entity) => ({
      entityType: "product" as const,
      entityId: entity.id,
      payload: jsonPayload(entity, entity.id),
    })),
    ...data.userReminders.map((entity) => ({
      entityType: "user_reminder" as const,
      entityId: entity.id,
      payload: jsonPayload(entity, entity.id),
    })),
    ...data.expenses.map((entity) => ({
      entityType: "expense" as const,
      entityId: entity.id,
      payload: jsonPayload(entity, entity.id),
    })),
    ...data.recurringExpenses.map((entity) => ({
      entityType: "recurring_expense" as const,
      entityId: entity.id,
      payload: jsonPayload(entity, entity.id),
    })),
    ...data.documents
      .filter((entity) => entity.type === "presupuesto")
      .map((entity) => ({
        entityType: "quote" as const,
        entityId: entity.id,
        payload: jsonPayload(entity, entity.id),
      })),
    ...data.documents
      .filter((entity) => entity.type === "recibo")
      .map((entity) => ({
        entityType: "receipt" as const,
        entityId: entity.id,
        payload: jsonPayload(entity, entity.id),
      })),
    {
      entityType: "profile",
      entityId: "profile",
      payload: jsonPayload(data.profile, "profile", {
        requireMatchingId: false,
      }),
    },
  ];
  return entities.sort(
    (left, right) =>
      left.entityType.localeCompare(right.entityType) ||
      left.entityId.localeCompare(right.entityId),
  );
}

export function centralBusinessBootstrapSnapshotSignature(
  entities: CentralBusinessBootstrapBrowserEntity[],
): string {
  return JSON.stringify(entities);
}

async function defaultAccessToken() {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function failure(
  status: number,
  code: string,
  message: string,
  preview?: CentralBusinessBootstrapBrowserPreview,
): CentralBusinessBootstrapClientFailure {
  return { ok: false, status, code, message, preview };
}

function parsePreviewEntry(
  value: unknown,
): CentralBusinessBootstrapBrowserPreviewEntry | null {
  if (
    !isObject(value) ||
    !ENTITY_TYPES.has(
      value.entityType as CentralBusinessBootstrapBrowserEntityType,
    ) ||
    typeof value.entityId !== "string" ||
    !ENTRY_STATUSES.has(
      value.status as CentralBusinessBootstrapBrowserPreviewEntry["status"],
    ) ||
    (value.centralVersion !== null &&
      (!Number.isInteger(value.centralVersion) ||
        (value.centralVersion as number) < 1)) ||
    typeof value.centralDeleted !== "boolean"
  ) {
    return null;
  }
  return {
    entityType:
      value.entityType as CentralBusinessBootstrapBrowserEntityType,
    entityId: value.entityId,
    status:
      value.status as CentralBusinessBootstrapBrowserPreviewEntry["status"],
    centralVersion: value.centralVersion as number | null,
    centralDeleted: value.centralDeleted,
  };
}

function parsePreview(
  value: unknown,
): CentralBusinessBootstrapBrowserPreview | null {
  if (
    !isObject(value) ||
    value.schema !== "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1" ||
    typeof value.snapshotDigest !== "string" ||
    !DIGEST.test(value.snapshotDigest) ||
    typeof value.centralStateDigest !== "string" ||
    !DIGEST.test(value.centralStateDigest) ||
    typeof value.previewDigest !== "string" ||
    !DIGEST.test(value.previewDigest) ||
    !isObject(value.summary) ||
    !Array.isArray(value.entries) ||
    typeof value.canCommit !== "boolean"
  ) {
    return null;
  }
  const summary = value.summary;
  const summaryKeys = [
    "local",
    "centralActive",
    "centralDeleted",
    "create",
    "identical",
    "conflict",
    "centralOnly",
  ] as const;
  if (
    !summaryKeys.every(
      (key) =>
        Number.isInteger(summary[key]) &&
        (summary[key] as number) >= 0,
    )
  ) {
    return null;
  }
  const entries = value.entries.map(parsePreviewEntry);
  if (entries.some((entry) => entry === null)) return null;
  return {
    schema: "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_V1",
    snapshotDigest: value.snapshotDigest,
    centralStateDigest: value.centralStateDigest,
    previewDigest: value.previewDigest,
    summary: Object.fromEntries(
      summaryKeys.map((key) => [key, summary[key]]),
    ) as CentralBusinessBootstrapBrowserPreview["summary"],
    entries: entries as CentralBusinessBootstrapBrowserPreviewEntry[],
    canCommit: value.canCommit,
  };
}

function errorMessage(code: string): string {
  if (code === "CENTRAL_BUSINESS_BOOTSTRAP_NOT_ALLOWED") {
    return "Esta cuenta no esta autorizada para la migracion central.";
  }
  if (code === "BOOTSTRAP_PREVIEW_STALE") {
    return "Los datos locales o centrales cambiaron. Prepara una vista previa nueva.";
  }
  if (code === "BOOTSTRAP_CONFLICT") {
    return "La comparacion contiene diferencias que deben revisarse antes de migrar.";
  }
  if (code === "RATE_LIMITED") {
    return "Se han hecho demasiadas comprobaciones. Espera unos minutos.";
  }
  return "No se pudo completar la comprobacion con el servidor central.";
}

async function authHeaders(
  dependencies: CentralBusinessBootstrapClientDependencies,
): Promise<Headers | null> {
  const accessToken = await (
    dependencies.getAccessToken ?? defaultAccessToken
  )();
  const deviceToken = (
    dependencies.getDeviceToken ?? getLocalCloudDeviceToken
  )();
  if (!accessToken || !deviceToken) return null;
  return new Headers({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
  });
}

async function post(
  path: string,
  body: unknown,
  dependencies: CentralBusinessBootstrapClientDependencies,
): Promise<{ response: Response; payload: unknown } | CentralBusinessBootstrapClientFailure> {
  const headers = await authHeaders(dependencies);
  if (!headers) {
    return failure(
      401,
      "CENTRAL_BUSINESS_BOOTSTRAP_SESSION_REQUIRED",
      "Inicia sesion y registra este dispositivo antes de preparar la migracion.",
    );
  }
  try {
    const response = await (dependencies.fetchImpl ?? fetch)(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return {
      response,
      payload: (await response.json().catch(() => null)) as unknown,
    };
  } catch {
    return failure(
      0,
      "CENTRAL_BUSINESS_BOOTSTRAP_NETWORK_ERROR",
      "No se pudo contactar con el servidor central.",
    );
  }
}

function isFailure(
  value:
    | { response: Response; payload: unknown }
    | CentralBusinessBootstrapClientFailure,
): value is CentralBusinessBootstrapClientFailure {
  return "ok" in value;
}

function parseFailure(
  response: Response,
  payload: unknown,
): CentralBusinessBootstrapClientFailure {
  const error =
    isObject(payload) && isObject(payload.error) ? payload.error : {};
  const code =
    typeof error.code === "string"
      ? error.code
      : "CENTRAL_BUSINESS_BOOTSTRAP_REJECTED";
  const preview =
    isObject(payload) && payload.preview
      ? parsePreview(payload.preview) ?? undefined
      : undefined;
  return failure(
    response.status,
    code,
    typeof error.message === "string" ? error.message : errorMessage(code),
    preview,
  );
}

export async function previewCentralBusinessBootstrapFromBrowser(
  entities: CentralBusinessBootstrapBrowserEntity[],
  dependencies: CentralBusinessBootstrapClientDependencies = {},
): Promise<CentralBusinessBootstrapPreviewClientResult> {
  const request = await post(
    "/api/central-business-authority/bootstrap-preview",
    { entities },
    dependencies,
  );
  if (isFailure(request)) return request;
  if (!request.response.ok) {
    return parseFailure(request.response, request.payload);
  }
  const preview =
    isObject(request.payload) &&
    request.payload.ok === true &&
    request.payload.schema ===
      "CENTRAL_BUSINESS_BOOTSTRAP_PREVIEW_ROUTE_V1"
      ? parsePreview(request.payload.preview)
      : null;
  return preview
    ? { ok: true, schema: CENTRAL_BUSINESS_BOOTSTRAP_CLIENT, preview }
    : failure(
        502,
        "CENTRAL_BUSINESS_BOOTSTRAP_INVALID_RESPONSE",
        "El servidor devolvio una comparacion incompleta.",
      );
}

export async function commitCentralBusinessBootstrapFromBrowser(
  input: {
    entities: CentralBusinessBootstrapBrowserEntity[];
    preview: CentralBusinessBootstrapBrowserPreview;
    idempotencyKey: string;
  },
  dependencies: CentralBusinessBootstrapClientDependencies = {},
): Promise<CentralBusinessBootstrapCommitClientResult> {
  const request = await post(
    "/api/central-business-authority/bootstrap-commit",
    {
      idempotencyKey: input.idempotencyKey,
      confirmation: CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
      snapshotDigest: input.preview.snapshotDigest,
      centralStateDigest: input.preview.centralStateDigest,
      previewDigest: input.preview.previewDigest,
      entities: input.entities,
    },
    dependencies,
  );
  if (isFailure(request)) return request;
  if (!request.response.ok) {
    return parseFailure(request.response, request.payload);
  }
  const result =
    isObject(request.payload) &&
    request.payload.ok === true &&
    request.payload.schema === "CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_ROUTE_V1" &&
    isObject(request.payload.result)
      ? request.payload.result
      : null;
  if (
    !result ||
    (result.status !== "committed" && result.status !== "replayed") ||
    !Number.isInteger(result.createdCount) ||
    !Number.isInteger(result.identicalCount) ||
    (result.firstEventSequence !== null &&
      !Number.isSafeInteger(result.firstEventSequence)) ||
    (result.lastEventSequence !== null &&
      !Number.isSafeInteger(result.lastEventSequence))
  ) {
    return failure(
      502,
      "CENTRAL_BUSINESS_BOOTSTRAP_INVALID_RESPONSE",
      "El servidor devolvio una confirmacion incompleta.",
    );
  }
  return {
    ok: true,
    schema: CENTRAL_BUSINESS_BOOTSTRAP_CLIENT,
    result: {
      status: result.status,
      createdCount: result.createdCount as number,
      identicalCount: result.identicalCount as number,
      firstEventSequence: result.firstEventSequence as number | null,
      lastEventSequence: result.lastEventSequence as number | null,
    },
  };
}
