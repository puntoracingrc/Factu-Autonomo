import type { UserReminder, UserReminderOrigin, UserReminderTarget } from "./types";

export const OFFICE_REMINDER_TEMPLATES = [
  {
    id: "invoice-with-details",
    label: "Facturar cuando lleguen datos",
    text: "Cliente llamará / pasará datos. Preparar factura de … € por …",
    linkKind: "new_invoice" as const,
  },
  {
    id: "invoice-known",
    label: "Factura concreta",
    text: "Hacer factura a … por … € (concepto: …)",
    linkKind: "new_invoice" as const,
  },
  {
    id: "call-back",
    label: "Devolver llamada",
    text: "Devolver llamada a … sobre …",
    linkKind: "none" as const,
  },
  {
    id: "rectify",
    label: "Rectificar factura",
    text: "Rectificar factura de … porque …",
    linkKind: "rectify" as const,
  },
] as const;

const LAST_SEEN_KEY = "factu-reminders-last-seen";

export function reminderTargetLabel(target: UserReminderTarget): string {
  return target === "office" ? "Para oficina" : "Personal";
}

export function reminderOriginLabel(origin?: UserReminderOrigin): string | null {
  if (!origin) return null;
  return origin === "field" ? "Desde móvil / calle" : "Desde oficina";
}

/** Prioriza tareas para oficina (equipo compartiendo cuenta). */
export function sortTeamReminders(reminders: UserReminder[]): UserReminder[] {
  return [...reminders].sort((a, b) => {
    const officeA = a.target === "office" ? 0 : 1;
    const officeB = b.target === "office" ? 0 : 1;
    if (officeA !== officeB) return officeA - officeB;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function normalizeUserReminder(
  reminder: Partial<UserReminder> & Pick<UserReminder, "id" | "text" | "link">,
): UserReminder {
  const now = reminder.updatedAt ?? reminder.createdAt ?? new Date().toISOString();
  return {
    id: reminder.id,
    text: reminder.text,
    dueDate: reminder.dueDate,
    dueTime: reminder.dueTime,
    link: reminder.link,
    target: reminder.target ?? "self",
    origin: reminder.origin,
    completed: reminder.completed ?? false,
    completedAt: reminder.completedAt,
    createdAt: reminder.createdAt ?? now,
    updatedAt: reminder.updatedAt ?? now,
  };
}

export function readRemindersLastSeenAt(): string {
  if (typeof localStorage === "undefined") return "1970-01-01T00:00:00.000Z";
  return localStorage.getItem(LAST_SEEN_KEY) ?? "1970-01-01T00:00:00.000Z";
}

export function markRemindersSeen(reference = new Date().toISOString()): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_SEEN_KEY, reference);
}

export function countUnseenOfficeReminders(
  reminders: UserReminder[],
  lastSeenAt = readRemindersLastSeenAt(),
): number {
  return reminders.filter(
    (item) =>
      !item.completed &&
      item.target === "office" &&
      item.createdAt > lastSeenAt,
  ).length;
}

export function isUnseenOfficeReminder(reminder: UserReminder): boolean {
  if (reminder.completed || reminder.target !== "office") return false;
  return reminder.createdAt > readRemindersLastSeenAt();
}

/** Heurística simple: pantalla estrecha o touch → origen «campo». */
export function guessReminderOrigin(): UserReminderOrigin {
  if (typeof window === "undefined") return "office";
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 768px)").matches;
  const touch =
    typeof navigator !== "undefined" &&
    (navigator.maxTouchPoints > 0 || coarse);
  return touch ? "field" : "office";
}
