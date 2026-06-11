import { newDocumentUrl } from "./customer-document-links";
import { formatShortDate } from "./calculations";
import type { AppData, Document, UserReminder, UserReminderLink } from "./types";

export function pendingUserReminders(reminders: UserReminder[]): UserReminder[] {
  return sortUserReminders(reminders.filter((item) => !item.completed));
}

export function pendingOfficeReminders(reminders: UserReminder[]): UserReminder[] {
  return pendingUserReminders(reminders).filter((item) => item.target === "office");
}

export function completedUserReminders(reminders: UserReminder[]): UserReminder[] {
  return reminders
    .filter((item) => item.completed)
    .sort((a, b) =>
      (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
    );
}

export function sortUserReminders(reminders: UserReminder[]): UserReminder[] {
  return [...reminders].sort((a, b) => {
    const officeA = a.target === "office" ? 0 : 1;
    const officeB = b.target === "office" ? 0 : 1;
    if (officeA !== officeB) return officeA - officeB;

    const rankA = dueSortRank(a);
    const rankB = dueSortRank(b);
    if (rankA !== rankB) return rankA - rankB;

    const dueA = reminderDueIso(a) ?? "9999-12-31T23:59:59";
    const dueB = reminderDueIso(b) ?? "9999-12-31T23:59:59";
    if (dueA !== dueB) return dueA.localeCompare(dueB);

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function dueSortRank(reminder: UserReminder): number {
  const due = reminderDueIso(reminder);
  if (!due) return 2;
  return due < nowIso() ? 0 : 1;
}

export function reminderDueIso(reminder: UserReminder): string | null {
  if (!reminder.dueDate) return null;
  const time = reminder.dueTime?.trim() || "23:59";
  return `${reminder.dueDate}T${time}:00`;
}

export function isReminderOverdue(
  reminder: UserReminder,
  reference = new Date(),
): boolean {
  const due = reminderDueIso(reminder);
  if (!due) return false;
  return new Date(due).getTime() < reference.getTime();
}

export function reminderDueLabel(reminder: UserReminder): string | null {
  if (!reminder.dueDate) return null;
  const dateLabel = formatShortDate(reminder.dueDate);
  if (reminder.dueTime?.trim()) {
    return `${dateLabel} a las ${reminder.dueTime}`;
  }
  return dateLabel;
}

export function resolveReminderHref(
  data: AppData,
  link: UserReminderLink,
): string | undefined {
  switch (link.kind) {
    case "none":
      return undefined;
    case "new_invoice":
      return "/facturas/nuevo";
    case "new_expense":
      return "/gastos/nuevo";
    case "customer":
      if (!link.entityId) return "/clientes";
      return newDocumentUrl("factura", link.entityId);
    case "document":
      if (!link.entityId) return undefined;
      return documentDetailPath(data.documents, link.entityId);
    case "rectify":
      if (!link.entityId) return undefined;
      return `/facturas/${link.entityId}/rectificar`;
    default:
      return undefined;
  }
}

function documentDetailPath(documents: Document[], id: string): string | undefined {
  const doc = documents.find((entry) => entry.id === id);
  if (!doc) return undefined;
  if (doc.type === "factura") return `/facturas/${doc.id}`;
  if (doc.type === "presupuesto") return `/presupuestos/${doc.id}`;
  return `/recibos/${doc.id}`;
}

export function linkKindLabel(kind: UserReminderLink["kind"]): string {
  switch (kind) {
    case "none":
      return "Sin enlace";
    case "customer":
      return "Facturar a cliente";
    case "document":
      return "Abrir documento";
    case "rectify":
      return "Rectificar factura";
    case "new_invoice":
      return "Nueva factura";
    case "new_expense":
      return "Nuevo gasto";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}
