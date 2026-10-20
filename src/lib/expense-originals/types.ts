/** Originals never enter AppData, its backups, outboxes, or browser storage. */
export const EXPENSE_ORIGINAL_MAX_BYTES = 4 * 1024 * 1024;
export const EXPENSE_ORIGINAL_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx";
export const EXPENSE_ORIGINAL_STATUS_LIMIT = 200;
export const EXPENSE_ORIGINAL_REFRESH_EVENT = "factu:expense-originals:refresh";
export type ExpenseOriginalStatus = "archived" | "inbox";
export type ExpenseOriginalStatuses = Record<string, ExpenseOriginalStatus>;

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export function originalFileName(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069/\\]/gu, "_")
    .trim()
    .slice(0, 180);
}
export function originalMimeType(name: string): string | null {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  return Object.hasOwn(mimeByExtension, extension)
    ? mimeByExtension[extension]
    : null;
}
export function originalFileError(file: {
  name: string;
  size: number;
}): string | null {
  if (!originalMimeType(file.name))
    return "Usa PDF, una imagen PNG/JPG/WebP/GIF o un documento Word/Excel.";
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > EXPENSE_ORIGINAL_MAX_BYTES)
    return "El original no puede superar 4 MB. Elige una copia de menor tamaño.";
  return null;
}
/** Office files are stored/downloaded only, never parsed or rendered by Factu. */
export function originalSignatureMatches(
  bytes: Uint8Array,
  mime: string,
): boolean {
  const starts = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  if (mime === "application/pdf")
    return new TextDecoder().decode(bytes.subarray(0, 1024)).includes("%PDF-");
  if (mime === "image/png") return starts(137, 80, 78, 71, 13, 10, 26, 10);
  if (mime === "image/jpeg") return starts(255, 216, 255);
  if (mime === "image/gif")
    return /^GIF8[79]a/u.test(new TextDecoder().decode(bytes.subarray(0, 6)));
  if (mime === "image/webp")
    return (
      new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
    );
  if (mime === "application/msword" || mime === "application/vnd.ms-excel")
    return starts(208, 207, 17, 224, 161, 177, 26, 225);
  if (mime.startsWith("application/vnd.openxmlformats-officedocument."))
    return starts(80, 75, 3, 4);
  return false;
}
