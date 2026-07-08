import type {
  AppData,
  Expense,
  RecurringDueTiming,
  RecurringExpense,
  RecurringExpenseFrequency,
} from "./types";
import { expenseTotalsFromBase } from "./expenses";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function resolveDueDate(
  year: number,
  month: number,
  timing: RecurringDueTiming,
): string {
  if (timing.kind === "start_of_month") {
    return toIsoDate(year, month, 1);
  }
  if (timing.kind === "mid_of_month") {
    return toIsoDate(year, month, Math.min(15, lastDayOfMonth(year, month)));
  }
  if (timing.kind === "end_of_month") {
    return toIsoDate(year, month, lastDayOfMonth(year, month));
  }
  const day = Math.min(Math.max(1, timing.day), lastDayOfMonth(year, month));
  return toIsoDate(year, month, day);
}

function parseIso(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

function addMonths(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  const index = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

function durationAllows(
  template: RecurringExpense,
  date: string,
  occurrenceIndex: number,
): boolean {
  const { duration, startDate } = template;
  if (compareIso(date, startDate) < 0) return false;

  if (duration.kind === "indefinite") return true;
  if (duration.kind === "until_date") {
    return compareIso(date, duration.endDate) <= 0;
  }
  return occurrenceIndex < duration.count;
}

export function occurrenceKey(templateId: string, date: string): string {
  return `${templateId}:${date}`;
}

export function listRecurringOccurrenceDates(
  template: RecurringExpense,
  upToDate: string,
): string[] {
  if (!template.enabled) return [];

  const dates: string[] = [];
  const start = parseIso(template.startDate);
  const limit = parseIso(upToDate);
  let occurrenceIndex = 0;

  if (template.frequency === "annual") {
    const month = template.dueMonth ?? start.month;
    let year = start.year;
    if (
      compareIso(
        resolveDueDate(year, month, template.dueTiming),
        template.startDate,
      ) < 0
    ) {
      year += 1;
    }

    while (year <= limit.year) {
      const date = resolveDueDate(year, month, template.dueTiming);
      if (compareIso(date, upToDate) > 0) break;
      if (durationAllows(template, date, occurrenceIndex)) {
        dates.push(date);
        occurrenceIndex += 1;
      }
      year += 1;
    }
    return dates;
  }

  let cursor = { year: start.year, month: start.month };
  const step = template.frequency === "monthly" ? 1 : 3;
  let guard = 0;

  while (guard < 600) {
    guard += 1;
    const date = resolveDueDate(
      cursor.year,
      cursor.month,
      template.dueTiming,
    );
    if (compareIso(date, upToDate) > 0) break;
    if (compareIso(date, template.startDate) >= 0) {
      if (durationAllows(template, date, occurrenceIndex)) {
        dates.push(date);
        occurrenceIndex += 1;
      }
    }
    cursor = addMonths(cursor.year, cursor.month, step);
    if (cursor.year > limit.year + 1) break;
  }

  return dates;
}

export function expenseFromRecurring(
  template: RecurringExpense,
  date: string,
): Omit<Expense, "id" | "createdAt"> {
  return {
    date,
    supplierName: template.supplierName,
    description: template.description,
    amount: template.amount,
    ivaPercent: template.ivaPercent,
    category: template.category,
    paymentMethod: template.paymentMethod,
    notes: template.notes,
    origin: "recurring",
    businessKind: "fixed",
    recurringExpenseId: template.id,
    recurringOccurrenceKey: occurrenceKey(template.id, date),
  };
}

export function syncRecurringExpenses(
  data: AppData,
  referenceDate = new Date().toISOString().split("T")[0],
): AppData {
  const existingKeys = new Set(
    data.expenses
      .map((expense) => expense.recurringOccurrenceKey)
      .filter(Boolean) as string[],
  );

  const generated: Expense[] = [];

  for (const template of data.recurringExpenses) {
    if (!template.enabled) continue;
    for (const date of listRecurringOccurrenceDates(template, referenceDate)) {
      const key = occurrenceKey(template.id, date);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      generated.push({
        ...expenseFromRecurring(template, date),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (generated.length === 0) return data;

  return {
    ...data,
    expenses: [...data.expenses, ...generated],
  };
}

export function recurringFrequencyLabel(
  frequency: RecurringExpenseFrequency,
): string {
  const labels: Record<RecurringExpenseFrequency, string> = {
    monthly: "Mensual",
    quarterly: "Trimestral",
    annual: "Anual",
  };
  return labels[frequency];
}

export function recurringDueLabel(template: RecurringExpense): string {
  if (template.frequency === "annual" && template.dueMonth) {
    const date = resolveDueDate(
      2026,
      template.dueMonth,
      template.dueTiming,
    );
    const [, , day] = date.split("-");
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    return `${Number(day)} de ${months[template.dueMonth - 1]}`;
  }
  if (template.dueTiming.kind === "start_of_month") return "Inicio de mes";
  if (template.dueTiming.kind === "mid_of_month") return "Mediados de mes";
  if (template.dueTiming.kind === "end_of_month") return "Final de mes";
  return `Día ${template.dueTiming.day}`;
}

export function recurringDurationLabel(template: RecurringExpense): string {
  const { duration } = template;
  if (duration.kind === "indefinite") return "Siempre";
  if (duration.kind === "until_date") {
    return `Hasta ${duration.endDate.split("-").reverse().join("/")}`;
  }
  return `${duration.count} ${template.frequency === "monthly" ? "meses" : "veces"}`;
}

export const RECURRING_DUE_SOON_DAYS = 7;
export const RECURRING_PREVIEW_HORIZON_DAYS = 90;

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function daysBetweenIso(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export interface RecurringOccurrencePreview {
  templateId: string;
  supplierName: string;
  description: string;
  amount: number;
  ivaPercent: number;
  date: string;
  daysUntil: number;
  generated: boolean;
}

export function recurringExpenseTotals(
  template: Pick<RecurringExpense, "amount" | "ivaPercent">,
  vatExempt = false,
) {
  return expenseTotalsFromBase(template.amount, template.ivaPercent, vatExempt);
}

function existingOccurrenceKeys(expenses: Expense[]): Set<string> {
  return new Set(
    expenses
      .map((expense) => expense.recurringOccurrenceKey)
      .filter(Boolean) as string[],
  );
}

export function collectRecurringOccurrencePreviews(
  data: AppData,
  referenceDate: string,
  horizonDays = RECURRING_PREVIEW_HORIZON_DAYS,
): RecurringOccurrencePreview[] {
  const horizonEnd = addDaysIso(referenceDate, horizonDays);
  const existingKeys = existingOccurrenceKeys(data.expenses);
  const previews: RecurringOccurrencePreview[] = [];

  for (const template of data.recurringExpenses) {
    if (!template.enabled) continue;

    for (const date of listRecurringOccurrenceDates(template, horizonEnd)) {
      if (compareIso(date, referenceDate) < 0) continue;

      previews.push({
        templateId: template.id,
        supplierName: template.supplierName,
        description: template.description,
        amount: template.amount,
        ivaPercent: template.ivaPercent,
        date,
        daysUntil: daysBetweenIso(referenceDate, date),
        generated: existingKeys.has(occurrenceKey(template.id, date)),
      });
    }
  }

  return previews.sort((a, b) => a.date.localeCompare(b.date));
}

export function getDueSoonRecurringAlerts(
  data: AppData,
  referenceDate: string,
  withinDays = RECURRING_DUE_SOON_DAYS,
): RecurringOccurrencePreview[] {
  return collectRecurringOccurrencePreviews(
    data,
    referenceDate,
    withinDays + 45,
  ).filter(
    (preview) =>
      !preview.generated &&
      preview.daysUntil >= 0 &&
      preview.daysUntil <= withinDays,
  );
}

export function dueSoonLabel(daysUntil: number): string {
  if (daysUntil < 0) return `Venció hace ${Math.abs(daysUntil)} día(s)`;
  if (daysUntil === 0) return "Vence hoy";
  if (daysUntil === 1) return "Vence mañana";
  return `Vence en ${daysUntil} días`;
}
