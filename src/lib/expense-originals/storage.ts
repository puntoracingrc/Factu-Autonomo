import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  EXPENSE_ORIGINAL_MAX_BYTES,
  originalFileName,
  originalMimeType,
  originalSignatureMatches,
} from "./types";

export const EXPENSE_ORIGINAL_BUCKET = "factu-expense-originals";
export interface OriginalRecord {
  user_id: string;
  binding_kind: "expense" | "inbox";
  binding_id: string;
  sha256: string;
  mime_type: string;
  file_name: string;
  byte_size: number;
}
export class ExpenseOriginalError extends Error {
  constructor(
    readonly code:
      | "INVALID_FILE"
      | "ORIGINAL_EXISTS"
      | "UNAVAILABLE"
      | "NOT_FOUND",
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function originalsAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "El archivo de originales no está disponible. Reinténtalo.",
    );
  return admin;
}
export function originalDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
export async function findOriginal(
  userId: string,
  kind: OriginalRecord["binding_kind"],
  id: string,
): Promise<OriginalRecord | null> {
  const { data, error } = await originalsAdmin()
    .from("expense_original_files")
    .select(
      "user_id,binding_kind,binding_id,sha256,mime_type,file_name,byte_size",
    )
    .eq("user_id", userId)
    .eq("binding_kind", kind)
    .eq("binding_id", id)
    .maybeSingle();
  if (error)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "No se pudo consultar el original. Reinténtalo.",
    );
  return data as OriginalRecord | null;
}
export async function readOriginal(
  record: OriginalRecord,
): Promise<Uint8Array> {
  if (
    !/^[0-9a-f-]{36}$/iu.test(record.user_id) ||
    !/^[0-9a-f]{64}$/u.test(record.sha256) ||
    record.byte_size <= 0 ||
    record.byte_size > EXPENSE_ORIGINAL_MAX_BYTES
  )
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      502,
      "No se pudo verificar el original.",
    );
  const { data, error } = await originalsAdmin()
    .storage.from(EXPENSE_ORIGINAL_BUCKET)
    .download(`${record.user_id}/${record.sha256}`);
  if (
    error ||
    !data ||
    data.size !== record.byte_size ||
    data.type.split(";")[0] !== record.mime_type
  )
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      502,
      "No se pudo recuperar y verificar el original.",
    );
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (originalDigest(bytes) !== record.sha256)
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      502,
      "El archivo recibido no coincide con el original. No se ha abierto.",
    );
  return bytes;
}
export async function archiveOriginal(input: {
  userId: string;
  kind: OriginalRecord["binding_kind"];
  bindingId: string;
  bytes: Uint8Array;
  fileName: string;
  mimeType?: string;
}): Promise<OriginalRecord> {
  const name = originalFileName(input.fileName);
  const mime = originalMimeType(name);
  if (
    !mime ||
    !input.bytes.length ||
    input.bytes.length > EXPENSE_ORIGINAL_MAX_BYTES ||
    !originalSignatureMatches(input.bytes, mime)
  )
    throw new ExpenseOriginalError(
      "INVALID_FILE",
      400,
      "El archivo no tiene un formato válido o supera 4 MB. Usa PDF, imagen o Word/Excel.",
    );
  if (input.mimeType && mime !== input.mimeType)
    throw new ExpenseOriginalError(
      "INVALID_FILE",
      400,
      "El formato del original no coincide con su extensión.",
    );
  const record: OriginalRecord = {
    user_id: input.userId,
    binding_kind: input.kind,
    binding_id: input.bindingId,
    sha256: originalDigest(input.bytes),
    mime_type: mime,
    file_name: name,
    byte_size: input.bytes.length,
  };
  const existing = await findOriginal(
    input.userId,
    input.kind,
    input.bindingId,
  );
  if (existing) {
    if (existing.sha256 !== record.sha256)
      throw new ExpenseOriginalError(
        "ORIGINAL_EXISTS",
        409,
        "Este gasto ya tiene un original distinto. No se ha sustituido ni borrado.",
      );
    await readOriginal(existing);
    return existing;
  }
  // Immutable, content-addressed path. A timeout/duplicate upload is confirmed only by exact readback.
  const uploaded = await originalsAdmin()
    .storage.from(EXPENSE_ORIGINAL_BUCKET)
    .upload(`${input.userId}/${record.sha256}`, input.bytes, {
      contentType: mime,
      cacheControl: "0",
      upsert: false,
    });
  try {
    await readOriginal(record);
  } catch {
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      502,
      uploaded.error
        ? "No se pudo guardar y verificar el archivo. Conserva el original y reinténtalo."
        : "No se pudo verificar el archivo guardado. Reinténtalo.",
    );
  }
  const { error } = await originalsAdmin()
    .from("expense_original_files")
    .insert(record);
  if (error && error.code !== "23505")
    throw new ExpenseOriginalError(
      "UNAVAILABLE",
      503,
      "El archivo se recibió, pero no pudo confirmarse su vínculo. Reintenta el mismo archivo.",
    );
  const confirmed = await findOriginal(
    input.userId,
    input.kind,
    input.bindingId,
  );
  if (!confirmed || confirmed.sha256 !== record.sha256)
    throw new ExpenseOriginalError(
      "ORIGINAL_EXISTS",
      409,
      "Otro usuario adjuntó un original diferente. No se ha sobrescrito.",
    );
  return confirmed;
}
