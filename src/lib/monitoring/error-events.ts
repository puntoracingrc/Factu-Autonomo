export type ErrorEventSeverity = "info" | "warning" | "error";

export interface AppErrorEventInput {
  severity?: ErrorEventSeverity;
  area: string;
  code?: string | null;
  message: string;
  route?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AppErrorEvent extends Required<Omit<AppErrorEventInput, "metadata">> {
  id: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  resolvedAt: string | null;
  createdAt: string;
}

const SECRET_PATTERN =
  /(service[_-]?role|sb_secret|sk-[a-z0-9_-]+|api[_-]?key|authorization|bearer\s+|password|contraseña|token|refresh[_-]?token|access[_-]?token)/i;

const MAX_TEXT_LENGTH = 280;
const MAX_METADATA_KEYS = 12;

export function sanitizeMonitorText(value: unknown): string {
  const text =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : String(value ?? "");

  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return "Error sin detalle";
  if (SECRET_PATTERN.test(collapsed)) return "Mensaje oculto por seguridad";
  return collapsed.slice(0, MAX_TEXT_LENGTH);
}

export function sanitizeMonitorMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> {
  if (!metadata) return {};
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata).slice(0, MAX_METADATA_KEYS)) {
    if (SECRET_PATTERN.test(key)) continue;
    if (typeof value === "string") {
      safe[key] = sanitizeMonitorText(value);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      safe[key] = value;
    } else {
      safe[key] = sanitizeMonitorText(JSON.stringify(value));
    }
  }
  return safe;
}

export function normalizeErrorEventInput(
  input: AppErrorEventInput,
): Required<AppErrorEventInput> {
  return {
    severity:
      input.severity === "info" || input.severity === "warning"
        ? input.severity
        : "error",
    area: sanitizeMonitorText(input.area || "app").slice(0, 80),
    code: input.code ? sanitizeMonitorText(input.code).slice(0, 80) : null,
    message: sanitizeMonitorText(input.message),
    route: input.route ? sanitizeMonitorText(input.route).slice(0, 180) : null,
    userAgent: input.userAgent
      ? sanitizeMonitorText(input.userAgent).slice(0, 180)
      : null,
    metadata: sanitizeMonitorMetadata(input.metadata),
  };
}

