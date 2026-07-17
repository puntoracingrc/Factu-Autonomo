import { createHash, randomUUID } from "crypto";
import { resolveMx } from "node:dns/promises";
import { isBillingEnforced } from "@/lib/billing/config";
import { isProPlan } from "@/lib/billing/plans";
import { consumeExpenseScan } from "@/lib/billing/scan-usage-server";
import { fetchUserSubscriptionServer } from "@/lib/billing/server-repository";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "@/lib/expense-scan/limits";
import { extractExpenseFromImage } from "@/lib/expense-scan/openai";
import { getEmailDeliveryStatus, sendEmail } from "@/lib/email/send";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildExpenseInboxCopyEmail,
  ExpenseInboxCopyDeliveryError,
  normalizeExpenseInboxCopyRecipient,
} from "@/lib/expense-inbox-copy";
import {
  downloadResendAttachment,
  ExpenseInboxDownloadError,
  listRecentResendReceivedEmails,
  MAX_RESEND_ATTACHMENT_BYTES,
  MAX_RESEND_ATTACHMENTS_TOTAL_BYTES,
  splitResendAttachmentBatch,
} from "@/lib/expense-inbox-download";
import {
  buildExpenseInboxAddress,
  buildPrivateExpenseInboxAliasToken,
  classifyExpenseInboxDelivery,
  extractExpenseInboxAliasToken,
  mapExpenseInboxScanPayload,
  normalizeExpenseInboxAliasBase,
  normalizeExpenseInboxInboundPayload,
  normalizeResendReceivedEmailMetadata,
  resolveExpenseInboxAttachmentMimeType,
  shouldRetryExpenseInboxItem,
  type ExpenseInboxAttachmentInput,
  type ExpenseInboxDeliveryStatus,
  type ExpenseInboxInboundEmail,
  type ExpenseInboxItem,
  type ExpenseInboxItemStatus,
  type ResendReceivedAttachmentMetadata,
} from "./expense-inbox";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ExpenseInboxAliasRow {
  user_id: string;
  alias_token: string;
  active: boolean;
}

interface ExpenseInboxItemRow {
  id: string;
  user_id: string;
  alias_token: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  attachment_filename: string;
  attachment_content_type: string;
  attachment_size: number;
  attachment_hash: string;
  status: ExpenseInboxItemStatus;
  scan_payload: unknown;
  scan_error: string | null;
  source_email_id: string | null;
  source_attachment_id: string | null;
  created_at: string;
}

export interface ExpenseInboxAlias {
  userId: string;
  aliasToken: string;
  address: string;
}

export interface ExpenseInboxIngestResult {
  accepted: number;
  pending: number;
  duplicates: number;
  ignored: number;
  errors: number;
  message: string;
}

export interface ExpenseInboxOriginalDownload {
  readonly buffer: Buffer;
  readonly contentType: string;
  readonly sourceSha256: string;
}

const ALIAS_ENTITY_TYPE = "expense_inbox_alias";
const ALIAS_HISTORY_ENTITY_TYPE = "expense_inbox_alias_history";
const ITEM_ENTITY_TYPE = "expense_inbox_item";
const PRIMARY_ALIAS_ENTITY_ID = "primary";
const DELIVERY_STATUS_CACHE_MS = 5 * 60 * 1000;

let cachedDeliveryStatus:
  | {
      domain: string;
      expiresAt: number;
      value: ExpenseInboxDeliveryStatus;
    }
  | undefined;

function getExpenseInboxDomain(): string {
  return (
    process.env.EXPENSE_INBOX_DOMAIN?.trim() ||
    process.env.RESEND_INBOUND_DOMAIN?.trim() ||
    "mail.facturacion-autonomos.app"
  ).replace(/^https?:\/\//i, "");
}

export async function getExpenseInboxDeliveryStatus(): Promise<ExpenseInboxDeliveryStatus> {
  const domain = getExpenseInboxDomain();
  const now = Date.now();
  if (
    cachedDeliveryStatus &&
    cachedDeliveryStatus.domain === domain &&
    cachedDeliveryStatus.expiresAt > now
  ) {
    return cachedDeliveryStatus.value;
  }

  let value: ExpenseInboxDeliveryStatus;
  try {
    const records = await resolveMx(domain);
    value = classifyExpenseInboxDelivery(
      domain,
      records.map((record) => record.exchange),
    );
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    value =
      code === "ENODATA" || code === "ENOTFOUND"
        ? classifyExpenseInboxDelivery(domain, [])
        : {
            state: "unknown",
            message:
              "No he podido comprobar ahora el DNS del buzón. Si los emails rebotan, revisa el MX o el reenvío del proveedor de correo.",
          };
  }

  cachedDeliveryStatus = {
    domain,
    expiresAt: now + DELIVERY_STATUS_CACHE_MS,
    value,
  };
  return value;
}

function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada para leer adjuntos.");
  }
  return apiKey;
}

function isLegacyRandomAliasToken(aliasToken: string): boolean {
  return /^[a-f0-9]{18}$/.test(aliasToken);
}

function profileAliasName(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const source = payload as Record<string, unknown>;
  const candidates = [source.commercialName, source.name, source.email];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return "";
}

function profileEmail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const email = (payload as Record<string, unknown>).email;
  return typeof email === "string" ? email : "";
}

async function profilePayloadForUser(userId: string): Promise<unknown> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("sync_entities")
    .select("payload")
    .eq("user_id", userId)
    .eq("entity_type", "profile")
    .eq("entity_id", "profile")
    .eq("deleted", false)
    .maybeSingle();

  if (error) throw error;
  return (data as { payload?: unknown } | null)?.payload;
}

async function aliasBaseForUser(userId: string): Promise<string> {
  try {
    return normalizeExpenseInboxAliasBase(
      profileAliasName(await profilePayloadForUser(userId)),
    );
  } catch {
    return normalizeExpenseInboxAliasBase(undefined);
  }
}

export async function getExpenseInboxCopyRecipient(
  userId: string,
): Promise<string | null> {
  return normalizeExpenseInboxCopyRecipient(
    profileEmail(await profilePayloadForUser(userId)),
    getExpenseInboxDomain(),
  );
}

async function sendExpenseInboxCompanyCopy(input: {
  userId: string;
  sourceEmailId: string;
  email: ExpenseInboxInboundEmail;
}): Promise<void> {
  const recipientEmail = await getExpenseInboxCopyRecipient(input.userId);
  if (!recipientEmail) return;
  const copy = buildExpenseInboxCopyEmail({
    userId: input.userId,
    sourceEmailId: input.sourceEmailId,
    recipientEmail,
    inboxDomain: getExpenseInboxDomain(),
    originalFromEmail: input.email.fromEmail,
    originalSubject: input.email.subject,
    attachments: input.email.attachments,
  });
  if (!copy) return;

  const result = await sendEmail(copy);
  if (!result.ok) throw new ExpenseInboxCopyDeliveryError(result);
  const delivery = await getEmailDeliveryStatus(result.id ?? "", {
    timeoutMs: 5_000,
  });
  if (delivery.state !== "delivered") {
    throw new ExpenseInboxCopyDeliveryError({
      ok: false,
      status: delivery.status,
      providerCode: delivery.event,
      failureKind:
        delivery.state === "failed" ? "known" : "ambiguous",
      retryable: delivery.retryable,
      error: "Resend todavía no ha confirmado la entrega de la copia.",
    });
  }
}

function mapItem(row: ExpenseInboxItemRow): ExpenseInboxItem {
  return {
    id: row.id,
    fromEmail: row.from_email ?? undefined,
    fromName: row.from_name ?? undefined,
    subject: row.subject ?? undefined,
    receivedAt: row.received_at,
    attachmentFilename: row.attachment_filename,
    attachmentContentType: row.attachment_content_type,
    attachmentSize: row.attachment_size,
    attachmentHash: row.attachment_hash,
    status: row.status,
    scanPayload: mapExpenseInboxScanPayload(row.scan_payload),
    scanError: row.scan_error ?? undefined,
    canRetry: row.status === "error",
    createdAt: row.created_at,
  };
}

function isMissingInboxTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const source = error as { code?: string; message?: string };
  const message = source.message?.toLowerCase() ?? "";
  return (
    source.code === "42P01" ||
    message.includes("expense_inbox_aliases") ||
    message.includes("expense_inbox_items")
  );
}

function isMissingRetryMetadataError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const source = error as { code?: string; message?: string; details?: string };
  const text = [source.message, source.details]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    source.code === "42703" ||
    source.code === "PGRST204" ||
    text.includes("source_email_id") ||
    text.includes("source_attachment_id")
  );
}

function isMissingAliasHistoryTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const source = error as { code?: string; message?: string };
  const message = source.message?.toLowerCase() ?? "";
  return (
    source.code === "42P01" ||
    message.includes("expense_inbox_alias_history")
  );
}

function ensureAdmin(): SupabaseClient {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase no está configurado para el buzón de gastos.");
  }
  return admin;
}

function randomExpenseInboxAliasToken(aliasBase: string): string {
  return buildPrivateExpenseInboxAliasToken(
    aliasBase,
    randomUUID().replace(/-/g, ""),
  );
}

function syncPayloadToAlias(payload: unknown): ExpenseInboxAliasRow | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  const aliasToken =
    typeof source.aliasToken === "string" ? source.aliasToken : "";
  const userId = typeof source.userId === "string" ? source.userId : "";
  const active = source.active !== false;
  if (!aliasToken || !userId) return null;
  return {
    user_id: userId,
    alias_token: aliasToken,
    active,
  };
}

function syncPayloadToItem(payload: unknown): ExpenseInboxItem | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  const id = typeof source.id === "string" ? source.id : "";
  const attachmentFilename =
    typeof source.attachmentFilename === "string"
      ? source.attachmentFilename
      : "";
  const attachmentContentType =
    typeof source.attachmentContentType === "string"
      ? source.attachmentContentType
      : "";
  const attachmentSize =
    typeof source.attachmentSize === "number" ? source.attachmentSize : 0;
  const attachmentHash =
    typeof source.attachmentHash === "string" ? source.attachmentHash : "";
  const status =
    typeof source.status === "string"
      ? (source.status as ExpenseInboxItemStatus)
      : "pending";
  const receivedAt =
    typeof source.receivedAt === "string" ? source.receivedAt : "";
  const createdAt = typeof source.createdAt === "string" ? source.createdAt : receivedAt;

  if (!id || !attachmentFilename || !attachmentHash) return null;

  return {
    id,
    fromEmail:
      typeof source.fromEmail === "string" ? source.fromEmail : undefined,
    fromName: typeof source.fromName === "string" ? source.fromName : undefined,
    subject: typeof source.subject === "string" ? source.subject : undefined,
    receivedAt,
    attachmentFilename,
    attachmentContentType,
    attachmentSize,
    attachmentHash,
    status,
    scanPayload: mapExpenseInboxScanPayload(source.scanPayload),
    scanError:
      typeof source.scanError === "string" ? source.scanError : undefined,
    canRetry: status === "error",
    createdAt,
  };
}

interface SyncExpenseInboxItemRecord {
  payload: Record<string, unknown>;
  row: ExpenseInboxItemRow;
}

function syncPayloadToItemRow(input: {
  payload: unknown;
  userId: string;
  entityId: string;
}): SyncExpenseInboxItemRecord | null {
  if (!input.payload || typeof input.payload !== "object") return null;
  const payload = input.payload as Record<string, unknown>;
  const item = syncPayloadToItem(payload);
  const aliasToken =
    typeof payload.aliasToken === "string" ? payload.aliasToken : "";
  if (!item || item.id !== input.entityId || !aliasToken) return null;

  return {
    payload,
    row: {
      id: item.id,
      user_id: input.userId,
      alias_token: aliasToken,
      from_email: item.fromEmail ?? null,
      from_name: item.fromName ?? null,
      subject: item.subject ?? null,
      received_at: item.receivedAt,
      attachment_filename: item.attachmentFilename,
      attachment_content_type: item.attachmentContentType,
      attachment_size: item.attachmentSize,
      attachment_hash: item.attachmentHash,
      status: item.status,
      scan_payload: item.scanPayload ?? null,
      scan_error: item.scanError ?? null,
      source_email_id: null,
      source_attachment_id: null,
      created_at: item.createdAt,
    },
  };
}

async function ensureExpenseInboxAliasInSyncEntities(
  userId: string,
): Promise<ExpenseInboxAlias> {
  const admin = ensureAdmin();
  const aliasBase = await aliasBaseForUser(userId);
  const { data: existing, error: existingError } = await admin
    .from("sync_entities")
    .select("payload")
    .eq("user_id", userId)
    .eq("entity_type", ALIAS_ENTITY_TYPE)
    .eq("entity_id", PRIMARY_ALIAS_ENTITY_ID)
    .eq("deleted", false)
    .maybeSingle();

  if (existingError) {
    if (isMissingInboxTableError(existingError)) {
      return ensureExpenseInboxAliasInSyncEntities(userId);
    }
    throw existingError;
  }

  const existingAlias = syncPayloadToAlias(
    (existing as { payload?: unknown } | null)?.payload,
  );
  if (existingAlias?.active) {
    if (isLegacyRandomAliasToken(existingAlias.alias_token)) {
      return writeExpenseInboxAliasInSyncEntities({
        userId,
        aliasBase,
        previousAliasToken: existingAlias.alias_token,
      });
    }

    return {
      userId,
      aliasToken: existingAlias.alias_token,
      address: buildExpenseInboxAddress(
        existingAlias.alias_token,
        getExpenseInboxDomain(),
      ),
    };
  }

  return writeExpenseInboxAliasInSyncEntities({
    userId,
    aliasBase,
  });
}

async function syncAliasTokenReserved(aliasToken: string): Promise<boolean> {
  const admin = ensureAdmin();
  const { data: activeAlias, error: activeError } = await admin
    .from("sync_entities")
    .select("user_id")
    .eq("entity_type", ALIAS_ENTITY_TYPE)
    .eq("deleted", false)
    .filter("payload->>aliasToken", "eq", aliasToken)
    .limit(1)
    .maybeSingle();

  if (activeError) throw activeError;
  if (activeAlias) return true;

  const { data: historicalAlias, error: historicalError } = await admin
    .from("sync_entities")
    .select("user_id")
    .eq("entity_type", ALIAS_HISTORY_ENTITY_TYPE)
    .eq("entity_id", aliasToken)
    .eq("deleted", false)
    .limit(1)
    .maybeSingle();

  if (historicalError) throw historicalError;
  return Boolean(historicalAlias);
}

async function rememberSyncExpenseInboxAlias(input: {
  userId: string;
  aliasToken: string;
  previousAliasToken?: string;
}): Promise<void> {
  const admin = ensureAdmin();
  const now = new Date().toISOString();

  if (
    input.previousAliasToken &&
    input.previousAliasToken !== input.aliasToken
  ) {
    await admin.from("sync_entities").upsert(
      {
        user_id: input.userId,
        entity_type: ALIAS_HISTORY_ENTITY_TYPE,
        entity_id: input.previousAliasToken,
        payload: {
          userId: input.userId,
          aliasToken: input.previousAliasToken,
          status: "retired",
          retiredAt: now,
          updatedAt: now,
        },
        deleted: false,
        updated_at: now,
      },
      { onConflict: "user_id,entity_type,entity_id" },
    );
  }

  await admin.from("sync_entities").upsert(
    {
      user_id: input.userId,
      entity_type: ALIAS_HISTORY_ENTITY_TYPE,
      entity_id: input.aliasToken,
      payload: {
        userId: input.userId,
        aliasToken: input.aliasToken,
        status: "active",
        updatedAt: now,
      },
      deleted: false,
      updated_at: now,
    },
    { onConflict: "user_id,entity_type,entity_id" },
  );
}

async function writeExpenseInboxAliasInSyncEntities(input: {
  userId: string;
  aliasBase: string;
  previousAliasToken?: string;
}): Promise<ExpenseInboxAlias> {
  const admin = ensureAdmin();
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const aliasToken = randomExpenseInboxAliasToken(input.aliasBase);
    if (await syncAliasTokenReserved(aliasToken)) {
      continue;
    }

    const { error } = await admin.from("sync_entities").upsert(
      {
        user_id: input.userId,
        entity_type: ALIAS_ENTITY_TYPE,
        entity_id: PRIMARY_ALIAS_ENTITY_ID,
        payload: {
          userId: input.userId,
          aliasToken,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
        deleted: false,
        updated_at: now,
      },
      { onConflict: "user_id,entity_type,entity_id" },
    );

    if (error) throw error;

    await rememberSyncExpenseInboxAlias({
      userId: input.userId,
      aliasToken,
      previousAliasToken: input.previousAliasToken,
    });

    return {
      userId: input.userId,
      aliasToken,
      address: buildExpenseInboxAddress(aliasToken, getExpenseInboxDomain()),
    };
  }

  throw new Error("No se pudo crear el buzón de gastos.");
}

async function rotateExpenseInboxAliasInSyncEntities(
  userId: string,
): Promise<ExpenseInboxAlias> {
  const admin = ensureAdmin();
  const aliasBase = await aliasBaseForUser(userId);
  const { data, error: existingError } = await admin
    .from("sync_entities")
    .select("payload")
    .eq("user_id", userId)
    .eq("entity_type", ALIAS_ENTITY_TYPE)
    .eq("entity_id", PRIMARY_ALIAS_ENTITY_ID)
    .eq("deleted", false)
    .maybeSingle();

  if (existingError) throw existingError;
  const existingAlias = syncPayloadToAlias(
    (data as { payload?: unknown } | null)?.payload,
  );
  return writeExpenseInboxAliasInSyncEntities({
    userId,
    aliasBase,
    previousAliasToken: existingAlias?.alias_token,
  });
}

async function resolveAliasInSyncEntities(
  tokens: string[],
): Promise<ExpenseInboxAliasRow | null> {
  if (tokens.length === 0) return null;
  const admin = ensureAdmin();

  for (const token of tokens) {
    const { data, error } = await admin
      .from("sync_entities")
      .select("payload")
      .eq("entity_type", ALIAS_ENTITY_TYPE)
      .eq("deleted", false)
      .filter("payload->>aliasToken", "eq", token)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const alias = syncPayloadToAlias((data as { payload?: unknown } | null)?.payload);
    if (alias?.active) return alias;
  }

  return null;
}

async function listExpenseInboxItemsFromSyncEntities(
  userId: string,
  status: ExpenseInboxItemStatus | "open",
): Promise<ExpenseInboxItem[]> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("sync_entities")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .eq("entity_type", ITEM_ENTITY_TYPE)
    .eq("deleted", false)
    .order("updated_at", { ascending: false })
    .limit(80);

  if (error) throw error;

  return ((data ?? []) as Array<{ payload?: unknown }>)
    .map((row) => syncPayloadToItem(row.payload))
    .filter((item): item is ExpenseInboxItem => {
      if (!item) return false;
      if (status === "open") return item.status === "pending" || item.status === "error";
      return item.status === status;
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 30);
}

async function getExpenseInboxItemFromSyncEntities(
  userId: string,
  itemId: string,
): Promise<ExpenseInboxItem | null> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("sync_entities")
    .select("payload")
    .eq("user_id", userId)
    .eq("entity_type", ITEM_ENTITY_TYPE)
    .eq("entity_id", itemId)
    .eq("deleted", false)
    .maybeSingle();

  if (error) throw error;
  return syncPayloadToItem((data as { payload?: unknown } | null)?.payload);
}

async function getExpenseInboxItemRecordFromSyncEntities(
  userId: string,
  itemId: string,
): Promise<SyncExpenseInboxItemRecord | null> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("sync_entities")
    .select("entity_id, payload")
    .eq("user_id", userId)
    .eq("entity_type", ITEM_ENTITY_TYPE)
    .eq("entity_id", itemId)
    .eq("deleted", false)
    .maybeSingle();

  if (error) throw error;
  const source = data as { entity_id?: unknown; payload?: unknown } | null;
  if (typeof source?.entity_id !== "string") return null;
  return syncPayloadToItemRow({
    payload: source.payload,
    userId,
    entityId: source.entity_id,
  });
}

async function updateExpenseInboxItemStatusInSyncEntities(input: {
  userId: string;
  itemId: string;
  status: Extract<ExpenseInboxItemStatus, "processed" | "ignored">;
}): Promise<void> {
  const current = await getExpenseInboxItemRecordFromSyncEntities(
    input.userId,
    input.itemId,
  );
  if (!current) return;

  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const { error } = await admin.from("sync_entities").upsert(
    {
      user_id: input.userId,
      entity_type: ITEM_ENTITY_TYPE,
      entity_id: input.itemId,
      payload: {
        ...current.payload,
        status: input.status,
        processedAt: input.status === "processed" ? now : undefined,
        ignoredAt: input.status === "ignored" ? now : undefined,
        updatedAt: now,
      },
      deleted: false,
      updated_at: now,
    },
    { onConflict: "user_id,entity_type,entity_id" },
  );

  if (error) throw error;
}

async function hasDuplicateAttachmentInSyncEntities(
  userId: string,
  hash: string,
): Promise<boolean> {
  return Boolean(await findExistingAttachmentInSyncEntities(userId, hash));
}

async function findExistingAttachmentInSyncEntities(
  userId: string,
  hash: string,
): Promise<ExistingInboxAttachment | null> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("sync_entities")
    .select("entity_id, payload")
    .eq("user_id", userId)
    .eq("entity_type", ITEM_ENTITY_TYPE)
    .eq("deleted", false)
    .filter("payload->>attachmentHash", "eq", hash)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const source = data as { entity_id?: unknown; payload?: unknown } | null;
  if (typeof source?.entity_id !== "string") return null;
  const record = syncPayloadToItemRow({
    payload: source.payload,
    userId,
    entityId: source.entity_id,
  });
  if (!record) return null;
  return {
    id: record.row.id,
    status: record.row.status,
    scanError: record.row.scan_error ?? undefined,
  };
}

async function insertInboxItemInSyncEntities(input: {
  userId: string;
  aliasToken: string;
  email: ExpenseInboxInboundEmail;
  attachment: ExpenseInboxAttachmentInput;
  mimeType: string;
  buffer: Buffer;
  status: ExpenseInboxItemStatus;
  scanPayload?: unknown;
  scanError?: string;
}): Promise<"inserted" | "duplicate"> {
  const hash = attachmentHash(input.buffer);
  if (await hasDuplicateAttachmentInSyncEntities(input.userId, hash)) {
    return "duplicate";
  }

  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const id = randomUUID();
  const item: ExpenseInboxItem & { aliasToken: string; userId: string } = {
    id,
    userId: input.userId,
    aliasToken: input.aliasToken,
    fromEmail: input.email.fromEmail,
    fromName: input.email.fromName,
    subject: input.email.subject,
    receivedAt: now,
    attachmentFilename: input.attachment.filename || "factura-proveedor",
    attachmentContentType: input.mimeType,
    attachmentSize: input.buffer.byteLength,
    attachmentHash: hash,
    status: input.status,
    scanPayload: mapExpenseInboxScanPayload(input.scanPayload),
    scanError: input.scanError,
    createdAt: now,
  };

  const { error } = await admin.from("sync_entities").upsert(
    {
      user_id: input.userId,
      entity_type: ITEM_ENTITY_TYPE,
      entity_id: id,
      payload: item,
      deleted: false,
      updated_at: now,
    },
    { onConflict: "user_id,entity_type,entity_id" },
  );

  if (error) throw error;
  return "inserted";
}

export async function ensureExpenseInboxAlias(
  userId: string,
): Promise<ExpenseInboxAlias> {
  const admin = ensureAdmin();
  const aliasBase = await aliasBaseForUser(userId);
  const { data: existing, error: existingError } = await admin
    .from("expense_inbox_aliases")
    .select("user_id, alias_token, active")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    if (isMissingInboxTableError(existingError)) {
      return ensureExpenseInboxAliasInSyncEntities(userId);
    }
    throw existingError;
  }

  const activeExisting = existing as ExpenseInboxAliasRow | null;
  if (activeExisting?.active && activeExisting.alias_token) {
    if (isLegacyRandomAliasToken(activeExisting.alias_token)) {
      return writeExpenseInboxAlias({
        userId,
        aliasBase,
        previousAliasToken: activeExisting.alias_token,
      });
    }

    return {
      userId,
      aliasToken: activeExisting.alias_token,
      address: buildExpenseInboxAddress(
        activeExisting.alias_token,
        getExpenseInboxDomain(),
      ),
    };
  }

  return writeExpenseInboxAlias({
    userId,
    aliasBase,
  });
}

async function aliasTokenReserved(aliasToken: string): Promise<boolean> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("expense_inbox_alias_history")
    .select("alias_token")
    .eq("alias_token", aliasToken)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingAliasHistoryTableError(error)) {
      const { data: activeAlias, error: activeError } = await admin
        .from("expense_inbox_aliases")
        .select("alias_token")
        .eq("alias_token", aliasToken)
        .limit(1)
        .maybeSingle();
      if (activeError) throw activeError;
      return Boolean(activeAlias);
    }
    throw error;
  }

  return Boolean(data);
}

async function rememberExpenseInboxAlias(input: {
  userId: string;
  aliasToken: string;
  previousAliasToken?: string;
}): Promise<void> {
  const admin = ensureAdmin();
  const now = new Date().toISOString();

  const retirePatch = {
    status: "retired",
    retired_at: now,
    updated_at: now,
  };
  const { error: retireActiveError } = await admin
    .from("expense_inbox_alias_history")
    .update(retirePatch)
    .eq("user_id", input.userId)
    .eq("status", "active");

  if (retireActiveError) {
    if (isMissingAliasHistoryTableError(retireActiveError)) return;
    throw retireActiveError;
  }

  if (
    input.previousAliasToken &&
    input.previousAliasToken !== input.aliasToken
  ) {
    const { error: previousError } = await admin
      .from("expense_inbox_alias_history")
      .upsert(
        {
          user_id: input.userId,
          alias_token: input.previousAliasToken,
          status: "retired",
          retired_at: now,
          updated_at: now,
        },
        { onConflict: "alias_token" },
      );
    if (previousError) throw previousError;
  }

  const { error: activeError } = await admin
    .from("expense_inbox_alias_history")
    .insert(
      {
        user_id: input.userId,
        alias_token: input.aliasToken,
        status: "active",
        updated_at: now,
      },
    );

  if (activeError) throw activeError;
}

async function writeExpenseInboxAlias(input: {
  userId: string;
  aliasBase: string;
  previousAliasToken?: string;
}): Promise<ExpenseInboxAlias> {
  const admin = ensureAdmin();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const aliasToken = randomExpenseInboxAliasToken(input.aliasBase);
    if (await aliasTokenReserved(aliasToken)) continue;

    const { data, error } = await admin
      .from("expense_inbox_aliases")
      .upsert(
        {
          user_id: input.userId,
          alias_token: aliasToken,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("user_id, alias_token, active")
      .single();

    if (!error && data) {
      const row = data as ExpenseInboxAliasRow;
      await rememberExpenseInboxAlias({
        userId: input.userId,
        aliasToken: row.alias_token,
        previousAliasToken: input.previousAliasToken,
      });
      return {
        userId: input.userId,
        aliasToken: row.alias_token,
        address: buildExpenseInboxAddress(row.alias_token, getExpenseInboxDomain()),
      };
    }

    if (error && isMissingInboxTableError(error)) {
      return writeExpenseInboxAliasInSyncEntities(input);
    }
    if (error?.code !== "23505") throw error;
  }

  throw new Error("No se pudo crear el buzón de gastos.");
}

export async function rotateExpenseInboxAlias(
  userId: string,
): Promise<ExpenseInboxAlias> {
  const admin = ensureAdmin();
  const aliasBase = await aliasBaseForUser(userId);
  const { data: existing, error: existingError } = await admin
    .from("expense_inbox_aliases")
    .select("user_id, alias_token, active")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    if (isMissingInboxTableError(existingError)) {
      return rotateExpenseInboxAliasInSyncEntities(userId);
    }
    throw existingError;
  }

  const existingAlias = existing as ExpenseInboxAliasRow | null;
  return writeExpenseInboxAlias({
    userId,
    aliasBase,
    previousAliasToken: existingAlias?.alias_token,
  });
}

export async function canUseExpenseInbox(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  if (!isBillingEnforced()) return { allowed: true };
  const subscription = await fetchUserSubscriptionServer(userId);
  const plan = resolveEffectivePlan(subscription);
  if (isProPlan(plan)) return { allowed: true };
  return {
    allowed: false,
    reason: "El buzón inteligente de gastos requiere plan Pro con IA.",
  };
}

export async function listExpenseInboxItems(
  userId: string,
  status: ExpenseInboxItemStatus | "open" = "open",
): Promise<ExpenseInboxItem[]> {
  const admin = ensureAdmin();
  let query = admin
    .from("expense_inbox_items")
    .select(
      [
        "id",
        "user_id",
        "alias_token",
        "from_email",
        "from_name",
        "subject",
        "received_at",
        "attachment_filename",
        "attachment_content_type",
        "attachment_size",
        "attachment_hash",
        "status",
        "scan_payload",
        "scan_error",
        "created_at",
      ].join(", "),
    )
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(30);

  if (status === "open") {
    query = query.in("status", ["pending", "error"]);
  } else {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingInboxTableError(error)) {
      return listExpenseInboxItemsFromSyncEntities(userId, status);
    }
    throw error;
  }
  const primaryItems = ((data ?? []) as unknown as ExpenseInboxItemRow[]).map(
    mapItem,
  );
  const compatibilityItems = await listExpenseInboxItemsFromSyncEntities(
    userId,
    status,
  );
  const itemsById = new Map(
    compatibilityItems.map((item) => [item.id, item] as const),
  );
  for (const item of primaryItems) itemsById.set(item.id, item);
  return [...itemsById.values()]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 30);
}

export async function getExpenseInboxItem(
  userId: string,
  itemId: string,
): Promise<ExpenseInboxItem | null> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("expense_inbox_items")
    .select(
      [
        "id",
        "user_id",
        "alias_token",
        "from_email",
        "from_name",
        "subject",
        "received_at",
        "attachment_filename",
        "attachment_content_type",
        "attachment_size",
        "attachment_hash",
        "status",
        "scan_payload",
        "scan_error",
        "created_at",
      ].join(", "),
    )
    .eq("user_id", userId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    if (isMissingInboxTableError(error)) {
      return getExpenseInboxItemFromSyncEntities(userId, itemId);
    }
    throw error;
  }
  return data
    ? mapItem(data as unknown as ExpenseInboxItemRow)
    : getExpenseInboxItemFromSyncEntities(userId, itemId);
}

/**
 * Recupera temporalmente el adjunto exacto para que el navegador pueda
 * archivarlo en el Drive del usuario. Los bytes no se persisten en Factu.
 */
export async function getExpenseInboxOriginalAttachment(input: {
  userId: string;
  itemId: string;
}): Promise<ExpenseInboxOriginalDownload | null> {
  const admin = ensureAdmin();
  const baseColumns = [
    "id",
    "user_id",
    "alias_token",
    "from_email",
    "from_name",
    "subject",
    "received_at",
    "attachment_filename",
    "attachment_content_type",
    "attachment_size",
    "attachment_hash",
    "status",
    "scan_payload",
    "scan_error",
    "created_at",
  ];
  const selectRow = (includeProviderIds: boolean) =>
    admin
      .from("expense_inbox_items")
      .select(
        [
          ...baseColumns,
          ...(includeProviderIds
            ? ["source_email_id", "source_attachment_id"]
            : []),
        ].join(", "),
      )
      .eq("user_id", input.userId)
      .eq("id", input.itemId)
      .maybeSingle();

  let { data, error } = await selectRow(true);
  if (error && isMissingRetryMetadataError(error)) {
    ({ data, error } = await selectRow(false));
  }
  let row: ExpenseInboxItemRow | null = null;
  if (error) {
    if (!isMissingInboxTableError(error)) throw error;
    row = (
      await getExpenseInboxItemRecordFromSyncEntities(
        input.userId,
        input.itemId,
      )
    )?.row ?? null;
  } else if (data) {
    row = {
      ...(data as unknown as ExpenseInboxItemRow),
      source_email_id:
        (data as unknown as ExpenseInboxItemRow).source_email_id ?? null,
      source_attachment_id:
        (data as unknown as ExpenseInboxItemRow).source_attachment_id ?? null,
    };
  } else {
    row = (
      await getExpenseInboxItemRecordFromSyncEntities(
        input.userId,
        input.itemId,
      )
    )?.row ?? null;
  }
  if (!row || (row.status !== "pending" && row.status !== "processed")) {
    return null;
  }

  const recovered = await recoverRetryAttachment(row);
  const contentBase64 = recovered.contentBase64?.trim();
  const contentType = resolveExpenseInboxAttachmentMimeType(recovered);
  if (!contentBase64 || !contentType) {
    throw new Error("El original del buzón no tiene un formato permitido.");
  }
  const buffer = Buffer.from(contentBase64, "base64");
  if (
    buffer.byteLength !== recovered.size ||
    attachmentHash(buffer) !== row.attachment_hash
  ) {
    throw new Error("El adjunto recuperado no coincide con el original.");
  }
  return Object.freeze({
    buffer,
    contentType,
    sourceSha256: row.attachment_hash,
  });
}

export async function updateExpenseInboxItemStatus(input: {
  userId: string;
  itemId: string;
  status: Extract<ExpenseInboxItemStatus, "processed" | "ignored">;
}): Promise<void> {
  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const patch =
    input.status === "processed"
      ? { status: input.status, processed_at: now, updated_at: now }
      : { status: input.status, ignored_at: now, updated_at: now };
  const { data, error } = await admin
    .from("expense_inbox_items")
    .update(patch)
    .eq("user_id", input.userId)
    .eq("id", input.itemId)
    .select("id")
    .maybeSingle();

  if (error && !isMissingInboxTableError(error)) {
    throw error;
  }
  if (data) return;
  await updateExpenseInboxItemStatusInSyncEntities(input);
}

async function resolveUserFromRecipients(
  email: ExpenseInboxInboundEmail,
): Promise<ExpenseInboxAliasRow | null> {
  const admin = ensureAdmin();
  const tokens = email.to
    .map(extractExpenseInboxAliasToken)
    .filter((token): token is string => Boolean(token));

  if (tokens.length === 0) return null;

  const { data, error } = await admin
    .from("expense_inbox_aliases")
    .select("user_id, alias_token, active")
    .in("alias_token", tokens)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingInboxTableError(error)) {
      return resolveAliasInSyncEntities(tokens);
    }
    throw error;
  }
  return (data as ExpenseInboxAliasRow | null) ?? null;
}

function attachmentBase64(attachment: ExpenseInboxAttachmentInput): string | null {
  const value =
    attachment.contentBase64 ??
    attachment.base64 ??
    attachment.content ??
    attachment.data;
  if (!value?.trim()) return null;
  const [, dataUriPayload] = value.match(/^data:[^;]+;base64,(.+)$/i) ?? [];
  return (dataUriPayload ?? value).replace(/\s+/g, "");
}

function attachmentHash(buffer: Buffer): string {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function scanSizeError(mimeType: string, size: number): string | null {
  if (mimeType === "application/pdf" && size > MAX_PDF_BYTES) {
    return "El PDF supera el límite del escáner (8 MB).";
  }
  if (mimeType !== "application/pdf" && size > MAX_IMAGE_BYTES) {
    return "La imagen supera el límite del escáner (4 MB).";
  }
  return null;
}

interface ExistingInboxAttachment {
  id: string;
  status: ExpenseInboxItemStatus;
  scanError?: string;
}

async function findExistingAttachment(
  userId: string,
  hash: string,
): Promise<ExistingInboxAttachment | null> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("expense_inbox_items")
    .select("id, status, scan_error")
    .eq("user_id", userId)
    .eq("attachment_hash", hash)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingInboxTableError(error)) {
      return findExistingAttachmentInSyncEntities(userId, hash);
    }
    throw error;
  }
  if (!data) return findExistingAttachmentInSyncEntities(userId, hash);
  const row = data as { id?: unknown; status?: unknown; scan_error?: unknown };
  if (typeof row.id !== "string" || typeof row.status !== "string") return null;
  return {
    id: row.id,
    status: row.status as ExpenseInboxItemStatus,
    scanError: typeof row.scan_error === "string" ? row.scan_error : undefined,
  };
}

async function insertInboxItem(input: {
  userId: string;
  aliasToken: string;
  email: ExpenseInboxInboundEmail;
  attachment: ExpenseInboxAttachmentInput;
  mimeType: string;
  buffer: Buffer;
  status: ExpenseInboxItemStatus;
  scanPayload?: unknown;
  scanError?: string;
}): Promise<"inserted" | "duplicate"> {
  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const hash = attachmentHash(input.buffer);
  const basePayload = {
    user_id: input.userId,
    alias_token: input.aliasToken,
    from_email: input.email.fromEmail,
    from_name: input.email.fromName ?? null,
    subject: input.email.subject ?? null,
    received_at: now,
    attachment_filename: input.attachment.filename || "factura-proveedor",
    attachment_content_type: input.mimeType,
    attachment_size: input.buffer.byteLength,
    attachment_hash: hash,
    status: input.status,
    scan_payload: input.scanPayload ?? null,
    scan_error: input.scanError ?? null,
    updated_at: now,
  };
  let { error } = await admin.from("expense_inbox_items").insert({
    ...basePayload,
    source_email_id: input.attachment.providerEmailId ?? null,
    source_attachment_id: input.attachment.providerAttachmentId ?? null,
  });

  if (error && isMissingRetryMetadataError(error)) {
    ({ error } = await admin.from("expense_inbox_items").insert(basePayload));
  }

  if (!error) return "inserted";
  if (isMissingInboxTableError(error)) {
    return insertInboxItemInSyncEntities(input);
  }
  if (error.code === "23505") return "duplicate";
  throw error;
}

async function claimInboxItemRetry(input: {
  userId: string;
  itemId: string;
  attachment: ExpenseInboxAttachmentInput;
}): Promise<boolean> {
  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const claim = (includeRetryMetadata: boolean) =>
    admin
      .from("expense_inbox_items")
      .update({
        status: "processing",
        scan_error: null,
        ...(includeRetryMetadata
          ? {
              source_email_id: input.attachment.providerEmailId ?? null,
              source_attachment_id:
                input.attachment.providerAttachmentId ?? null,
            }
          : {}),
        updated_at: now,
      })
      .eq("user_id", input.userId)
      .eq("id", input.itemId)
      .eq("status", "error")
      .select("id")
      .maybeSingle();

  let { data, error } = await claim(true);
  if (error && isMissingRetryMetadataError(error)) {
    ({ data, error } = await claim(false));
  }
  if (error && isMissingInboxTableError(error)) {
    return claimInboxItemRetryInSyncEntities(input);
  }
  if (error) throw error;
  if (data) return true;
  return claimInboxItemRetryInSyncEntities(input);
}

async function claimInboxItemRetryInSyncEntities(input: {
  userId: string;
  itemId: string;
}): Promise<boolean> {
  const current = await getExpenseInboxItemRecordFromSyncEntities(
    input.userId,
    input.itemId,
  );
  if (!current || current.row.status !== "error") return false;

  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("sync_entities")
    .update({
      payload: {
        ...current.payload,
        status: "processing",
        scanError: null,
        updatedAt: now,
      },
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("entity_type", ITEM_ENTITY_TYPE)
    .eq("entity_id", input.itemId)
    .eq("deleted", false)
    .eq("payload->>status", "error")
    .select("entity_id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function finishInboxItemRetry(input: {
  userId: string;
  itemId: string;
  status: Extract<ExpenseInboxItemStatus, "pending" | "error">;
  scanPayload?: unknown;
  scanError?: string;
}): Promise<void> {
  const admin = ensureAdmin();
  const { data, error } = await admin
    .from("expense_inbox_items")
    .update({
      status: input.status,
      scan_payload: input.scanPayload ?? null,
      scan_error: input.scanError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("id", input.itemId)
    .eq("status", "processing")
    .select("id")
    .maybeSingle();
  if (error && !isMissingInboxTableError(error)) throw error;
  if (data) return;
  await finishInboxItemRetryInSyncEntities(input);
}

async function finishInboxItemRetryInSyncEntities(input: {
  userId: string;
  itemId: string;
  status: Extract<ExpenseInboxItemStatus, "pending" | "error">;
  scanPayload?: unknown;
  scanError?: string;
}): Promise<void> {
  const current = await getExpenseInboxItemRecordFromSyncEntities(
    input.userId,
    input.itemId,
  );
  if (!current || current.row.status !== "processing") {
    throw new Error("El reintento del buzón ya no está activo.");
  }

  const admin = ensureAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("sync_entities")
    .update({
      payload: {
        ...current.payload,
        status: input.status,
        scanPayload: input.scanPayload ?? null,
        scanError: input.scanError ?? null,
        updatedAt: now,
      },
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("entity_type", ITEM_ENTITY_TYPE)
    .eq("entity_id", input.itemId)
    .eq("deleted", false)
    .eq("payload->>status", "processing")
    .select("entity_id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No se pudo confirmar el reintento del buzón.");
}

async function saveAttachmentFailure(input: {
  userId: string;
  aliasToken: string;
  email: ExpenseInboxInboundEmail;
  attachment: ExpenseInboxAttachmentInput;
  mimeType: string;
  buffer: Buffer;
  retryItemId?: string;
  scanError: string;
}): Promise<void> {
  if (input.retryItemId) {
    await finishInboxItemRetry({
      userId: input.userId,
      itemId: input.retryItemId,
      status: "error",
      scanError: input.scanError,
    });
    return;
  }
  await insertInboxItem({ ...input, status: "error" });
}

async function processAttachment(input: {
  userId: string;
  aliasToken: string;
  email: ExpenseInboxInboundEmail;
  attachment: ExpenseInboxAttachmentInput;
  allowAnyErrorRetry?: boolean;
}): Promise<"pending" | "duplicate" | "ignored" | "error"> {
  const mimeType = resolveExpenseInboxAttachmentMimeType(input.attachment);
  if (!mimeType) return "ignored";

  const base64 = attachmentBase64(input.attachment);
  if (!base64) return "ignored";

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return "ignored";
  }

  if (buffer.byteLength === 0) return "ignored";
  const sizeError = scanSizeError(mimeType, buffer.byteLength);
  const hash = attachmentHash(buffer);
  const existing = await findExistingAttachment(input.userId, hash);
  let retryItemId: string | undefined;
  if (existing) {
    if (
      !shouldRetryExpenseInboxItem({
        status: existing.status,
        scanError: existing.scanError,
        explicitRetry: input.allowAnyErrorRetry === true,
      })
    ) {
      return "duplicate";
    }
    const claimed = await claimInboxItemRetry({
      userId: input.userId,
      itemId: existing.id,
      attachment: input.attachment,
    });
    if (!claimed) return "duplicate";
    retryItemId = existing.id;
  }

  const access = await canUseExpenseInbox(input.userId);
  if (!access.allowed) {
    await saveAttachmentFailure({
      ...input,
      mimeType,
      buffer,
      retryItemId,
      scanError: access.reason ?? "El buzón de gastos no está disponible.",
    });
    return "error";
  }

  if (sizeError) {
    await saveAttachmentFailure({
      ...input,
      mimeType,
      buffer,
      retryItemId,
      scanError: sizeError,
    });
    return "error";
  }

  const gate = await consumeExpenseScan(input.userId);
  if (!gate.allowed) {
    await saveAttachmentFailure({
      ...input,
      mimeType,
      buffer,
      retryItemId,
      scanError: gate.reason ?? "No quedan escaneos IA disponibles.",
    });
    return "error";
  }

  let scan: Awaited<ReturnType<typeof extractExpenseFromImage>>;
  try {
    scan = await extractExpenseFromImage(base64, mimeType);
  } catch (error) {
    if (retryItemId) {
      await finishInboxItemRetry({
        userId: input.userId,
        itemId: retryItemId,
        status: "error",
        scanError: "No se pudo completar el análisis. Puedes reintentarlo.",
      });
    }
    throw error;
  }
  if (retryItemId) {
    await finishInboxItemRetry({
      userId: input.userId,
      itemId: retryItemId,
      status: scan.data ? "pending" : "error",
      scanPayload: scan.data,
      scanError: scan.error,
    });
    return scan.data ? "pending" : "error";
  }
  const inserted = await insertInboxItem({
    ...input,
    mimeType,
    buffer,
    status: scan.data ? "pending" : "error",
    scanPayload: scan.data,
    scanError: scan.error,
  });

  if (inserted === "duplicate") return "duplicate";
  return scan.data ? "pending" : "error";
}

function bareEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

async function recoverRetryAttachment(
  row: ExpenseInboxItemRow,
): Promise<ExpenseInboxAttachmentInput> {
  const directEmailId = row.source_email_id?.trim();
  const directAttachmentId = row.source_attachment_id?.trim();
  if (directEmailId && directAttachmentId) {
    const downloaded = await downloadResendAttachment({
      apiKey: getResendApiKey(),
      emailId: directEmailId,
      attachmentId: directAttachmentId,
      declaredSize: row.attachment_size,
      maxBytes: MAX_RESEND_ATTACHMENT_BYTES,
      timeoutMs: 10_000,
    });
    if (attachmentHash(downloaded.buffer) !== row.attachment_hash) {
      throw new Error("El adjunto recuperado no coincide con el original.");
    }
    return {
      filename: downloaded.filename ?? row.attachment_filename,
      contentType: downloaded.contentType ?? row.attachment_content_type,
      contentBase64: downloaded.buffer.toString("base64"),
      size: downloaded.buffer.byteLength,
      providerEmailId: directEmailId,
      providerAttachmentId: directAttachmentId,
    };
  }

  const expectedAddress = buildExpenseInboxAddress(
    row.alias_token,
    getExpenseInboxDomain(),
  ).toLowerCase();
  const expectedFrom = bareEmailAddress(row.from_email ?? "");
  const candidates = (await listRecentResendReceivedEmails({
    apiKey: getResendApiKey(),
    timeoutMs: 10_000,
  }))
    .filter((email) =>
      email.to.some((recipient) => bareEmailAddress(recipient) === expectedAddress),
    )
    .filter((email) =>
      expectedFrom ? bareEmailAddress(email.from) === expectedFrom : true,
    )
    .filter((email) =>
      row.subject ? (email.subject ?? "") === row.subject : true,
    )
    .flatMap((email) =>
      email.attachments
        .filter(
          (attachment) =>
            attachment.filename === row.attachment_filename &&
            attachment.size === row.attachment_size,
        )
        .map((attachment) => ({ email, attachment })),
    )
    .slice(0, 10);

  for (const candidate of candidates) {
    const downloaded = await downloadResendAttachment({
      apiKey: getResendApiKey(),
      emailId: candidate.email.id,
      attachmentId: candidate.attachment.id,
      declaredSize: candidate.attachment.size,
      maxBytes: MAX_RESEND_ATTACHMENT_BYTES,
      timeoutMs: 10_000,
    });
    if (attachmentHash(downloaded.buffer) !== row.attachment_hash) continue;
    return {
      filename: downloaded.filename ?? row.attachment_filename,
      contentType: downloaded.contentType ?? row.attachment_content_type,
      contentBase64: downloaded.buffer.toString("base64"),
      size: downloaded.buffer.byteLength,
      providerEmailId: candidate.email.id,
      providerAttachmentId: candidate.attachment.id,
    };
  }

  throw new Error(
    "No he podido recuperar ese adjunto del proveedor. Reenvía el mismo email al buzón para reintentarlo sin crear duplicados.",
  );
}

export async function retryExpenseInboxItem(input: {
  userId: string;
  itemId: string;
}): Promise<ExpenseInboxItem> {
  const admin = ensureAdmin();
  const baseColumns = [
    "id",
    "user_id",
    "alias_token",
    "from_email",
    "from_name",
    "subject",
    "received_at",
    "attachment_filename",
    "attachment_content_type",
    "attachment_size",
    "attachment_hash",
    "status",
    "scan_payload",
    "scan_error",
    "created_at",
  ];
  const selectRow = (includeRetryMetadata: boolean) =>
    admin
      .from("expense_inbox_items")
      .select(
        [
          ...baseColumns,
          ...(includeRetryMetadata
            ? ["source_email_id", "source_attachment_id"]
            : []),
        ].join(", "),
      )
      .eq("user_id", input.userId)
      .eq("id", input.itemId)
      .maybeSingle();

  let { data, error } = await selectRow(true);
  if (error && isMissingRetryMetadataError(error)) {
    ({ data, error } = await selectRow(false));
  }
  let row: ExpenseInboxItemRow | null = null;
  if (error && isMissingInboxTableError(error)) {
    row = (
      await getExpenseInboxItemRecordFromSyncEntities(
        input.userId,
        input.itemId,
      )
    )?.row ?? null;
  } else {
    if (error) throw error;
    if (data) {
      row = {
        source_email_id: null,
        source_attachment_id: null,
        ...(data as object),
      } as ExpenseInboxItemRow;
    } else {
      row = (
        await getExpenseInboxItemRecordFromSyncEntities(
          input.userId,
          input.itemId,
        )
      )?.row ?? null;
    }
  }
  if (!row) throw new Error("No encuentro esa factura del buzón.");
  if (row.status !== "error") {
    throw new Error("Esta factura ya no necesita reintento.");
  }

  const attachment = await recoverRetryAttachment(row);
  const result = await processAttachment({
    userId: input.userId,
    aliasToken: row.alias_token,
    email: {
      to: [buildExpenseInboxAddress(row.alias_token, getExpenseInboxDomain())],
      fromEmail: row.from_email ?? "proveedor@desconocido.invalid",
      fromName: row.from_name ?? undefined,
      subject: row.subject ?? undefined,
      attachments: [attachment],
    },
    attachment,
    allowAnyErrorRetry: true,
  });
  if (result === "ignored") {
    throw new Error("El adjunto ya no cumple el formato permitido.");
  }
  const updated = await getExpenseInboxItem(input.userId, input.itemId);
  if (!updated) throw new Error("No se pudo confirmar el reintento.");
  return updated;
}

async function ingestNormalizedExpenseInboxEmailResolved(
  email: ExpenseInboxInboundEmail,
): Promise<{ result: ExpenseInboxIngestResult; userId: string | null }> {
  const alias = await resolveUserFromRecipients(email);
  if (!alias) {
    return {
      userId: null,
      result: {
        accepted: 0,
        pending: 0,
        duplicates: 0,
        ignored: email.attachments.length,
        errors: 0,
        message: "No coincide con ningún buzón activo.",
      },
    };
  }

  const result: ExpenseInboxIngestResult = {
    accepted: 0,
    pending: 0,
    duplicates: 0,
    ignored: 0,
    errors: 0,
    message: "Email procesado.",
  };

  const { selected: attachments, overflow } =
    splitResendAttachmentBatch(email.attachments);
  for (const attachment of attachments) {
    const status = await processAttachment({
      userId: alias.user_id,
      aliasToken: alias.alias_token,
      email,
      attachment,
    });

    if (status === "pending") {
      result.accepted += 1;
      result.pending += 1;
    } else if (status === "duplicate") {
      result.duplicates += 1;
    } else if (status === "ignored") {
      result.ignored += 1;
    } else {
      result.errors += 1;
    }
  }

  result.ignored += overflow.length;

  return { result, userId: alias.user_id };
}

async function ingestNormalizedExpenseInboxEmail(
  email: ExpenseInboxInboundEmail,
): Promise<ExpenseInboxIngestResult> {
  return (await ingestNormalizedExpenseInboxEmailResolved(email)).result;
}

export async function ingestExpenseInboxEmail(
  rawPayload: unknown,
): Promise<ExpenseInboxIngestResult> {
  const email = normalizeExpenseInboxInboundPayload(rawPayload);
  if (!email) {
    return {
      accepted: 0,
      pending: 0,
      duplicates: 0,
      ignored: 0,
      errors: 1,
      message: "Email de entrada no reconocido.",
    };
  }

  return ingestNormalizedExpenseInboxEmail(email);
}

async function fetchResendAttachment(input: {
  emailId: string;
  attachment: ResendReceivedAttachmentMetadata;
  maxBytes: number;
  timeoutMs: number;
}): Promise<ExpenseInboxAttachmentInput> {
  const downloaded = await downloadResendAttachment({
    apiKey: getResendApiKey(),
    emailId: input.emailId,
    attachmentId: input.attachment.id,
    declaredSize: input.attachment.size ?? undefined,
    maxBytes: input.maxBytes,
    timeoutMs: input.timeoutMs,
  });
  return {
    filename: downloaded.filename ?? input.attachment.filename,
    contentType: downloaded.contentType ?? input.attachment.contentType,
    contentBase64: downloaded.buffer.toString("base64"),
    size: downloaded.buffer.byteLength,
    providerEmailId: input.emailId,
    providerAttachmentId: input.attachment.id,
  };
}

export async function ingestResendExpenseInboxEmail(
  rawPayload: unknown,
): Promise<ExpenseInboxIngestResult> {
  const received = normalizeResendReceivedEmailMetadata(rawPayload);
  if (!received) {
    return {
      accepted: 0,
      pending: 0,
      duplicates: 0,
      ignored: 0,
      errors: 1,
      message: "Evento de Resend no reconocido.",
    };
  }

  const attachments: ExpenseInboxAttachmentInput[] = [];
  const { selected, overflow } = splitResendAttachmentBatch(
    received.attachments,
  );
  let remainingBytes = MAX_RESEND_ATTACHMENTS_TOTAL_BYTES;
  const downloadDeadline = Date.now() + 30_000;

  for (const attachment of selected) {
    const baseAttachment: ExpenseInboxAttachmentInput = {
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      providerEmailId: received.emailId,
      providerAttachmentId: attachment.id,
    };
    const mimeType = resolveExpenseInboxAttachmentMimeType(baseAttachment);
    const isInlineImage =
      attachment.contentDisposition === "inline" && mimeType !== "application/pdf";

    if (!mimeType || isInlineImage) {
      attachments.push(baseAttachment);
      continue;
    }

    const declaredSize = attachment.size ?? undefined;
    const maxBytes = Math.min(MAX_RESEND_ATTACHMENT_BYTES, remainingBytes);
    if (
      maxBytes <= 0 ||
      (declaredSize !== undefined &&
        (!Number.isSafeInteger(declaredSize) ||
          declaredSize < 0 ||
          declaredSize > maxBytes))
    ) {
      attachments.push(baseAttachment);
      continue;
    }

    const timeoutMs = Math.min(10_000, downloadDeadline - Date.now());
    if (timeoutMs <= 0) {
      throw new ExpenseInboxDownloadError(
        "timeout",
        "La descarga de adjuntos agotó el tiempo total permitido.",
      );
    }

    try {
      const downloaded = await fetchResendAttachment({
        emailId: received.emailId,
        attachment,
        maxBytes,
        timeoutMs,
      });
      remainingBytes -= downloaded.size ?? 0;
      attachments.push(downloaded);
    } catch (error) {
      if (
        error instanceof ExpenseInboxDownloadError &&
        error.failure === "too_large"
      ) {
        attachments.push(baseAttachment);
        continue;
      }
      throw error;
    }
  }

  const normalizedEmail: ExpenseInboxInboundEmail = {
    ...received.email,
    attachments: [
      ...attachments,
      ...overflow.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
      })),
    ],
  };
  const ingested = await ingestNormalizedExpenseInboxEmailResolved(
    normalizedEmail,
  );
  if (ingested.userId) {
    await sendExpenseInboxCompanyCopy({
      userId: ingested.userId,
      sourceEmailId: received.emailId,
      email: normalizedEmail,
    });
  }
  return ingested.result;
}
