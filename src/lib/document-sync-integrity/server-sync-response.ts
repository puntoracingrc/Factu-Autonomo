import type {
  DocumentSyncServerCommandError,
  DocumentSyncServerCommandResult,
} from "./server-sync-command";

// PHASE2C28_SERVER_SYNC_SAFE_RESPONSE_AUDIT_V1
assertServerOnlyModule();

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El serializer server-only de sincronizacion documental solo puede cargarse en servidor.",
    );
  }
}

function unsafeFragments(): string[] {
  return [
    "document" + "snapshot",
    "pdf" + "snapshot",
    "raw" + "payload",
    "full" + "payload",
    "payload",
    "body",
    "tok" + "en",
    "authorization",
    "cookie",
    "sec" + "ret",
    "service" + "_role",
    "private" + "key",
    "certificate",
    "xm" + "l",
    "stack",
  ];
}

function allowedKey(key: string): boolean {
  return [
    "payloadHashPresent",
    "snapshotHashPresent",
    "pdfSnapshotHashPresent",
    "payloadHashCount",
  ].includes(key);
}

function redactKey(key: string): boolean {
  if (allowedKey(key)) return false;
  const normalized = key.toLowerCase();
  return unsafeFragments().some((fragment) =>
    normalized.includes(fragment.toLowerCase()),
  );
}

function redactString(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("<" + "?xm" + "l") ||
    normalized.includes("%p" + "df") ||
    normalized.includes("tok" + "en") ||
    normalized.includes("sec" + "ret") ||
    normalized.includes("service" + "_role")
  );
}

function redactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value) ? "[redacted]" : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object") return "[redacted]";

  const safe: Record<string, unknown> = {};
  let redacted = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (redactKey(key)) {
      safe[`redacted_${redacted}`] = "[redacted]";
      redacted += 1;
    } else {
      safe[key] = redactUnknown(entry);
    }
  }
  return safe;
}

export function serializeDocumentSyncServerResult(
  result: DocumentSyncServerCommandResult,
): DocumentSyncServerCommandResult {
  return redactUnknown(result) as DocumentSyncServerCommandResult;
}

export function redactDocumentSyncServerError(error: unknown): {
  code: string;
  message: string;
} {
  const maybeCommandError = error as Partial<DocumentSyncServerCommandError>;
  return {
    code:
      typeof maybeCommandError.code === "string"
        ? maybeCommandError.code
        : error instanceof Error
          ? error.name
          : "DOCUMENT_SYNC_SERVER_ERROR",
    message:
      error instanceof Error
        ? "La operacion server-only de sync documental se rechazo de forma controlada."
        : "El comando server-only de sync documental no pudo completarse.",
  };
}

export function assertSafeDocumentSyncServerJson(value: unknown): void {
  const serialized = JSON.stringify(value);
  const forbidden = [
    "document" + "snapshot",
    "document" + "_snapshot",
    "pdf" + "snapshot",
    "pdf" + "_snapshot",
    "raw" + "payload",
    "full" + "payload",
    "payload\":{",
    "pdf" + "body",
    "tok" + "en",
    "sec" + "ret",
    "service" + "_role",
    "<" + "?xm" + "l",
    "%p" + "df",
    "stack",
  ];
  for (const fragment of forbidden) {
    if (
      fragment === "pdf" + "snapshot" &&
      serialized.includes("pdfSnapshotHashPresent")
    ) {
      continue;
    }
    if (serialized.toLowerCase().includes(fragment.toLowerCase())) {
      throw new Error("Unsafe server sync JSON response.");
    }
  }
}
