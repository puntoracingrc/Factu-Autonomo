import { isBillingEnforced } from "@/lib/billing/config";
import { isProPlan } from "@/lib/billing/plans";
import { mapSubscriptionRow } from "@/lib/billing/server-repository";
import { resolveEffectivePlan } from "@/lib/billing/subscription";
import { parseCentralExpensePayload } from "@/lib/central-business-authority/payload-parsers";
import {
  archiveOriginal,
  ExpenseOriginalError,
  findOriginal,
  originalDigest,
  originalsAdmin,
  readOriginal,
  type OriginalRecord,
} from "./storage";
import { originalMimeType, type ExpenseOriginalStatuses } from "./types";

async function expense(userId: string, id: string) {
  const { data, error } = await originalsAdmin()
    .from("central_business_entities")
    .select("current_payload")
    .eq("user_id", userId)
    .eq("entity_type", "expense")
    .eq("entity_id", id)
    .eq("deleted", false)
    .maybeSingle();
  if (error)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "No se pudo comprobar el gasto en el servidor.",
    );
  const parsed = data
    ? parseCentralExpensePayload(data.current_payload, id)
    : null;
  if (!parsed)
    throw new ExpenseOriginalError(
      "NOT_FOUND",
      404,
      "El gasto no está confirmado en esta empresa. Sincroniza antes de adjuntar un original.",
    );
  return parsed;
}
async function inboxRecord(userId: string, id: string) {
  const { data, error } = await originalsAdmin()
    .from("expense_inbox_items")
    .select("attachment_hash,attachment_filename,status")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "No se pudo comprobar el documento del buzón.",
    );
  return data && (data.status === "processed" || data.status === "pending")
    ? (data as {
        attachment_hash: string;
        attachment_filename: string;
        status: string;
      })
    : null;
}
export async function archiveInboxOriginalIfCloud(input: {
  userId: string;
  billingUserId: string;
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}) {
  if (isBillingEnforced()) {
    const response = await originalsAdmin()
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", input.billingUserId)
      .maybeSingle();
    if (response.error)
      throw new ExpenseOriginalError(
        "UNAVAILABLE",
        503,
        "No se pudo comprobar el acceso al archivo privado.",
      );
    const subscription = response.data
      ? mapSubscriptionRow(response.data)
      : null;
    if (!isProPlan(resolveEffectivePlan(subscription))) return;
  }
  return archiveOriginal({
    ...input,
    fileName: inboxOriginalName(input.fileName, input.mimeType),
    kind: "inbox",
    bindingId: originalDigest(input.bytes),
  });
}
function inboxOriginalName(name: string, mime: string) {
  if (originalMimeType(name) === mime) return name;
  const suffix: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return `${name.slice(0, 170)}.${suffix[mime] ?? "bin"}`;
}
async function effectiveRecord(userId: string, expenseId: string) {
  const saved = await expense(userId, expenseId);
  const direct = await findOriginal(userId, "expense", expenseId);
  if (direct) return { record: direct, inbox: null };
  const inbox = saved.sourceInboxItemId
    ? await inboxRecord(userId, saved.sourceInboxItemId)
    : null;
  const record = inbox
    ? await findOriginal(userId, "inbox", inbox.attachment_hash)
    : null;
  return {
    record,
    inbox:
      inbox && saved.sourceInboxItemId
        ? { ...inbox, id: saved.sourceInboxItemId }
        : null,
  };
}
export async function getExpenseOriginal(
  userId: string,
  expenseId: string,
): Promise<{ record: OriginalRecord; bytes: Uint8Array }> {
  const found = await effectiveRecord(userId, expenseId);
  const { inbox } = found;
  let { record } = found;
  if (!record && inbox) {
    const { getExpenseInboxOriginalAttachment } = await import(
      "@/lib/expense-inbox-server"
    );
    const recovered = await getExpenseInboxOriginalAttachment({
      userId,
      itemId: inbox.id,
    });
    if (recovered)
      record = await archiveOriginal({
        userId,
        kind: "inbox",
        bindingId: inbox.attachment_hash,
        bytes: recovered.buffer,
        fileName: inboxOriginalName(
          inbox.attachment_filename,
          recovered.contentType,
        ),
        mimeType: recovered.contentType,
      });
  }
  if (!record)
    throw new ExpenseOriginalError(
      "NOT_FOUND",
      404,
      "No hay un archivo original disponible. Puedes adjuntarlo manualmente sin modificar el gasto.",
    );
  return { record, bytes: await readOriginal(record) };
}
export async function attachExpenseOriginal(
  userId: string,
  expenseId: string,
  bytes: Uint8Array,
  fileName: string,
) {
  const { record } = await effectiveRecord(userId, expenseId);
  if (record) {
    if (record.sha256 !== originalDigest(bytes))
      throw new ExpenseOriginalError(
        "ORIGINAL_EXISTS",
        409,
        "Este gasto ya tiene un original distinto. No se ha sustituido.",
      );
    await readOriginal(record);
    return record;
  }
  return archiveOriginal({
    userId,
    kind: "expense",
    bindingId: expenseId,
    bytes,
    fileName,
  });
}
export async function listExpenseOriginalStatuses(
  userId: string,
  ids: string[],
): Promise<ExpenseOriginalStatuses> {
  if (!ids.length) return {};
  const admin = originalsAdmin();
  const { data: rows, error } = await admin
    .from("central_business_entities")
    .select("entity_id,current_payload")
    .eq("user_id", userId)
    .eq("entity_type", "expense")
    .eq("deleted", false)
    .in("entity_id", ids);
  if (error)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "No se pudo consultar los originales.",
    );
  const expenses = (rows ?? []).flatMap((row) => {
    const e = parseCentralExpensePayload(row.current_payload, row.entity_id);
    return e ? [e] : [];
  });
  const { data: direct, error: directError } = await admin
    .from("expense_original_files")
    .select("binding_id")
    .eq("user_id", userId)
    .eq("binding_kind", "expense")
    .in("binding_id", ids);
  if (directError)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "No se pudo consultar los originales.",
    );
  const directIds = new Set((direct ?? []).map((row) => row.binding_id));
  const inboxIds = expenses.flatMap((e) =>
    e.sourceInboxItemId ? [e.sourceInboxItemId] : [],
  );
  let inboxRows: Array<{ id: string; attachment_hash: string }> = [];
  if (inboxIds.length) {
    const response = await admin
      .from("expense_inbox_items")
      .select("id,attachment_hash")
      .eq("user_id", userId)
      .in("id", inboxIds)
      .in("status", ["pending", "processed"]);
    if (response.error)
      throw new ExpenseOriginalError(
        "UNAVAILABLE",
        503,
        "No se pudo consultar los originales del buzón.",
      );
    inboxRows = response.data ?? [];
  }
  const hashes = inboxRows.map((row) => row.attachment_hash);
  const archivedHashes = new Set<string>();
  if (hashes.length) {
    const response = await admin
      .from("expense_original_files")
      .select("binding_id")
      .eq("user_id", userId)
      .eq("binding_kind", "inbox")
      .in("binding_id", hashes);
    if (response.error)
      throw new ExpenseOriginalError(
        "UNAVAILABLE",
        503,
        "No se pudo consultar los originales del buzón.",
      );
    for (const row of response.data ?? []) archivedHashes.add(row.binding_id);
  }
  const inboxById = new Map(
    inboxRows.map((row) => [row.id, row.attachment_hash]),
  );
  const result: ExpenseOriginalStatuses = Object.create(null);
  for (const e of expenses) {
    const hash = e.sourceInboxItemId
      ? inboxById.get(e.sourceInboxItemId)
      : undefined;
    if (directIds.has(e.id) || (hash && archivedHashes.has(hash)))
      result[e.id] = "archived";
    else if (hash) result[e.id] = "inbox";
  }
  return result;
}
