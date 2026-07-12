import type {
  AppData,
  Expense,
  RecurringDueTiming,
  RecurringExpense,
  RecurringExpenseFrequency,
  RecurringOccurrenceExclusion,
  RecurringOccurrenceExclusionSyncPayload,
} from "./types";
import { expenseTotalsFromBase } from "./expenses";

export type RecurringExpenseDraft = Omit<
  RecurringExpense,
  "id" | "createdAt" | "updatedAt" | "occurrenceExclusions"
>;

export interface FixedExpenseSaveOptions {
  now: string;
  newId: () => string;
  referenceDate?: string;
}

export function saveFixedExpenseWithRecurringTemplateToData(
  data: AppData,
  expense: Omit<Expense, "id" | "createdAt"> | Expense,
  item: RecurringExpenseDraft,
  options: FixedExpenseSaveOptions,
): { data: AppData; recurringExpense: RecurringExpense } {
  const templateId = options.newId();
  const recurringExpense: RecurringExpense = {
    ...item,
    id: templateId,
    createdAt: options.now,
    updatedAt: options.now,
  };
  const searchLimit = item.startDate
    ? new Date(`${item.startDate}T00:00:00.000Z`)
    : null;
  searchLimit?.setUTCFullYear(searchLimit.getUTCFullYear() + 2);
  const firstOccurrenceDate =
    listRecurringOccurrenceDates(
      recurringExpense,
      searchLimit?.toISOString().split("T")[0] ?? expense.date,
    )[0] ?? expense.date;
  const existingId = "id" in expense ? expense.id : null;
  const savedExpense: Expense = {
    ...expense,
    businessKind: "fixed",
    recurringExpenseId: templateId,
    recurringOccurrenceKey: occurrenceKey(templateId, firstOccurrenceDate),
    id: existingId ?? options.newId(),
    createdAt: "createdAt" in expense ? expense.createdAt : options.now,
  };
  const existingExpenseFound = existingId
    ? data.expenses.some((entry) => entry.id === existingId)
    : false;
  const expenses = existingExpenseFound
    ? data.expenses.map((entry) =>
        entry.id === existingId ? savedExpense : entry,
      )
    : [...data.expenses, savedExpense];

  return {
    recurringExpense,
    data: syncRecurringExpenses(
      {
        ...data,
        recurringExpenses: [...data.recurringExpenses, recurringExpense],
        expenses,
      },
      options.referenceDate,
    ),
  };
}

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

export function recurringAnnualDueMonth(
  template: Pick<RecurringExpense, "dueMonth" | "startDate">,
): number {
  const configuredMonth = template.dueMonth;
  if (
    typeof configuredMonth === "number" &&
    Number.isInteger(configuredMonth) &&
    configuredMonth >= 1 &&
    configuredMonth <= 12
  ) {
    return configuredMonth;
  }
  const startMonth = Number(template.startDate.split("-")[1]);
  return Number.isInteger(startMonth) && startMonth >= 1 && startMonth <= 12
    ? startMonth
    : 1;
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

const RECURRING_FREQUENCY_MONTHS: Record<
  RecurringExpenseFrequency,
  number
> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export function recurringExpenseMonthlyDivisor(
  frequency: RecurringExpenseFrequency,
): number {
  return RECURRING_FREQUENCY_MONTHS[frequency];
}

export function normalizeRecurringOccurrenceCount(
  value: number,
): number | null {
  if (!Number.isFinite(value)) return null;
  const count = Math.trunc(value);
  return count > 0 ? count : null;
}

function addMonthsIso(date: string, delta: number): string {
  const parsed = parseIso(date);
  const target = addMonths(parsed.year, parsed.month, delta);
  return toIsoDate(
    target.year,
    target.month,
    Math.min(parsed.day, lastDayOfMonth(target.year, target.month)),
  );
}

/**
 * Indica si una plantilla representa un coste vigente en la fecha de cálculo.
 * La duración por ocurrencias cubre el número de periodos configurado desde la
 * fecha de inicio, incluso si el cargo vence a mitad o al final del periodo.
 */
export function isRecurringExpenseWithinDurationOn(
  template: RecurringExpense,
  referenceDate: string,
): boolean {
  if (referenceDate < template.startDate) return false;

  if (template.duration.kind === "indefinite") return true;
  if (template.duration.kind === "until_date") {
    return referenceDate <= template.duration.endDate;
  }

  const count = normalizeRecurringOccurrenceCount(template.duration.count);
  if (count === null) return false;
  const endExclusive = addMonthsIso(
    template.startDate,
    recurringExpenseMonthlyDivisor(template.frequency) * count,
  );
  return referenceDate < endExclusive;
}

export function isRecurringExpenseApplicableOn(
  template: RecurringExpense,
  referenceDate: string,
): boolean {
  return (
    template.enabled &&
    isRecurringExpenseWithinDurationOn(template, referenceDate)
  );
}

export type RecurringExpenseStatus =
  | "active"
  | "paused"
  | "upcoming"
  | "closed";

export function recurringExpenseStatusOn(
  template: RecurringExpense,
  referenceDate: string,
): RecurringExpenseStatus {
  if (isRecurringExpenseApplicableOn(template, referenceDate)) return "active";
  if (referenceDate < template.startDate) {
    return template.enabled ? "upcoming" : "paused";
  }
  if (!isRecurringExpenseWithinDurationOn(template, referenceDate)) {
    return "closed";
  }
  return "paused";
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
  const count = normalizeRecurringOccurrenceCount(duration.count);
  return count !== null && occurrenceIndex < count;
}

export function occurrenceKey(templateId: string, date: string): string {
  return `${templateId}:${date}`;
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseIso(value);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= lastDayOfMonth(year, month)
  );
}

export function recurringScheduleAnchorDate(
  template: Pick<RecurringExpense, "scheduleAnchorDate" | "startDate">,
): string {
  return template.scheduleAnchorDate &&
    isIsoCalendarDate(template.scheduleAnchorDate) &&
    template.scheduleAnchorDate <= template.startDate
    ? template.scheduleAnchorDate
    : template.startDate;
}

function occurrenceDateFromKey(templateId: string, key: string): string | null {
  const prefix = `${templateId}:`;
  if (!key.startsWith(prefix)) return null;
  const date = key.slice(prefix.length);
  if (!isIsoCalendarDate(date)) return null;
  return occurrenceKey(templateId, date) === key ? date : null;
}

/**
 * Normaliza tombstones importados de almacenamiento, backup o cloud. Solo se
 * aceptan claves de esta plantilla y se conserva una entrada por ocurrencia.
 */
export function normalizeRecurringExpense(
  template: RecurringExpense,
): RecurringExpense {
  const raw = Array.isArray(template.occurrenceExclusions)
    ? template.occurrenceExclusions
    : [];
  const byKey = new Map<string, RecurringOccurrenceExclusion>();

  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") continue;
    const key = typeof candidate.key === "string" ? candidate.key : "";
    if (!occurrenceDateFromKey(template.id, key)) continue;
    const excludedAt =
      typeof candidate.excludedAt === "string" &&
      Number.isFinite(Date.parse(candidate.excludedAt))
        ? candidate.excludedAt
        : template.updatedAt || template.createdAt;
    const current = byKey.get(key);
    if (
      !current ||
      Date.parse(excludedAt) > Date.parse(current.excludedAt)
    ) {
      byKey.set(key, { key, excludedAt });
    }
  }

  const occurrenceExclusions = [...byKey.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const base: RecurringExpense = { ...template };
  delete base.occurrenceExclusions;
  return occurrenceExclusions.length > 0
    ? { ...base, occurrenceExclusions }
    : base;
}

function laterIsoTimestamp(left: string, right: string): string {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

/**
 * Conserva siempre la unión de exclusiones aunque el resto de la plantilla se
 * resuelva por último escritor. El segundo argumento aporta los campos LWW.
 */
export function mergeRecurringExpenseOccurrenceExclusions(
  current: RecurringExpense,
  incoming: RecurringExpense,
): RecurringExpense {
  const normalizedCurrent = normalizeRecurringExpense(current);
  const normalizedIncoming = normalizeRecurringExpense(incoming);
  const exclusions = new Map<string, RecurringOccurrenceExclusion>();

  for (const exclusion of [
    ...(normalizedCurrent.occurrenceExclusions ?? []),
    ...(normalizedIncoming.occurrenceExclusions ?? []),
  ]) {
    const existing = exclusions.get(exclusion.key);
    if (
      !existing ||
      Date.parse(exclusion.excludedAt) > Date.parse(existing.excludedAt)
    ) {
      exclusions.set(exclusion.key, exclusion);
    }
  }

  const merged: RecurringExpense = { ...normalizedIncoming };
  delete merged.occurrenceExclusions;
  return exclusions.size > 0
    ? {
        ...merged,
        occurrenceExclusions: [...exclusions.values()].sort((left, right) =>
          left.key.localeCompare(right.key),
        ),
      }
    : merged;
}

function recurringTemplateWithExclusion(
  template: RecurringExpense,
  exclusion: RecurringOccurrenceExclusion,
): RecurringExpense {
  return mergeRecurringExpenseOccurrenceExclusions(template, {
    ...template,
    occurrenceExclusions: [exclusion],
    updatedAt: laterIsoTimestamp(template.updatedAt, exclusion.excludedAt),
  });
}

/**
 * Aplica el tombstone sincronizado como dato monotónico. Además de incorporarlo
 * a la plantilla elimina cualquier materialización duplicada de esa ocurrencia
 * y lo añade a un cambio local de plantilla aún pendiente.
 */
export function applyRecurringOccurrenceExclusionToData(
  data: AppData,
  payload: RecurringOccurrenceExclusionSyncPayload,
): AppData {
  if (
    !payload ||
    typeof payload.templateId !== "string" ||
    typeof payload.key !== "string" ||
    typeof payload.excludedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.excludedAt)) ||
    !occurrenceDateFromKey(payload.templateId, payload.key)
  ) {
    return data;
  }

  const template = data.recurringExpenses.find(
    (entry) => entry.id === payload.templateId,
  );
  const updatedTemplate = template
    ? recurringTemplateWithExclusion(template, {
        key: payload.key,
        excludedAt: payload.excludedAt,
      })
    : null;
  const nextPendingChanges = data.meta?.pendingChanges?.map((change) => {
    if (
      !updatedTemplate ||
      change.entityType !== "recurring_expense" ||
      change.entityId !== payload.templateId ||
      change.deleted ||
      !change.payload ||
      typeof change.payload !== "object"
    ) {
      return change;
    }

    const pendingTemplate = change.payload as RecurringExpense;
    if (pendingTemplate.id !== payload.templateId) return change;
    return {
      ...change,
      payload: mergeRecurringExpenseOccurrenceExclusions(
        updatedTemplate,
        pendingTemplate,
      ),
    };
  });

  return {
    ...data,
    expenses: data.expenses.filter(
      (expense) => expense.recurringOccurrenceKey !== payload.key,
    ),
    recurringExpenses: updatedTemplate
      ? data.recurringExpenses.map((entry) =>
          entry.id === payload.templateId ? updatedTemplate : entry,
        )
      : data.recurringExpenses,
    meta: data.meta
      ? {
          ...data.meta,
          pendingChanges: nextPendingChanges,
        }
      : data.meta,
  };
}

function excludedOccurrenceKeys(template: RecurringExpense): Set<string> {
  return new Set(
    normalizeRecurringExpense(template).occurrenceExclusions?.map(
      (exclusion) => exclusion.key,
    ) ?? [],
  );
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
    const month = recurringAnnualDueMonth(template);
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

  const step = template.frequency === "monthly" ? 1 : 3;
  const anchor = parseIso(recurringScheduleAnchorDate(template));
  const startMonthIndex = start.year * 12 + (start.month - 1);
  const anchorMonthIndex = anchor.year * 12 + (anchor.month - 1);
  const cadenceOffset = Math.ceil(
    (startMonthIndex - anchorMonthIndex) / step,
  );
  let cursor = addMonths(
    anchor.year,
    anchor.month,
    cadenceOffset * step,
  );
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
  const deductibility = template.deductibility ?? "deductible";

  return {
    date,
    supplierName: template.supplierName,
    description: template.description,
    amount: template.amount,
    ivaPercent: deductibility === "non_deductible" ? 0 : template.ivaPercent,
    deductibility,
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

  for (const sourceTemplate of data.recurringExpenses) {
    const template = normalizeRecurringExpense(sourceTemplate);
    if (!template.enabled) continue;
    const excludedKeys = excludedOccurrenceKeys(template);
    for (const date of listRecurringOccurrenceDates(template, referenceDate)) {
      const key = occurrenceKey(template.id, date);
      if (existingKeys.has(key) || excludedKeys.has(key)) continue;
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
  if (template.frequency === "annual") {
    const dueMonth = recurringAnnualDueMonth(template);
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
    const month = months[dueMonth - 1];
    if (template.dueTiming.kind === "start_of_month") {
      return `Día 1 de ${month}`;
    }
    if (template.dueTiming.kind === "mid_of_month") {
      return `Día 15 de ${month}`;
    }
    if (template.dueTiming.kind === "end_of_month") {
      return `Último día de ${month}`;
    }
    const needsAdjustment =
      template.dueTiming.day > lastDayOfMonth(2026, dueMonth);
    return `Día ${template.dueTiming.day} de ${month}${
      needsAdjustment ? " (se ajusta al último día disponible)" : ""
    }`;
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
  const count = normalizeRecurringOccurrenceCount(duration.count) ?? 0;
  return `${count} ${template.frequency === "monthly" ? "meses" : "veces"}`;
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
  deductibility?: RecurringExpense["deductibility"];
  date: string;
  daysUntil: number;
  generated: boolean;
}

export function recurringExpenseTotals(
  template: Pick<RecurringExpense, "amount" | "ivaPercent" | "deductibility">,
  vatExempt = false,
) {
  const ivaPercent =
    template.deductibility === "non_deductible" ? 0 : template.ivaPercent;
  return expenseTotalsFromBase(template.amount, ivaPercent, vatExempt);
}

function recurringTemplateForExpense(
  templates: RecurringExpense[],
  expense: Expense,
): RecurringExpense | null {
  const key = expense.recurringOccurrenceKey;
  if (!key) return null;

  const linked = expense.recurringExpenseId
    ? templates.find((template) => template.id === expense.recurringExpenseId)
    : undefined;
  if (linked && occurrenceDateFromKey(linked.id, key)) return linked;

  return (
    templates.find((template) => occurrenceDateFromKey(template.id, key)) ??
    null
  );
}

/**
 * Borra un gasto y, solo si es una ocurrencia materializada de una plantilla,
 * registra el tombstone exacto que impide regenerarla. Los gastos manuales no
 * alteran la regla recurrente.
 */
export function deleteExpenseFromData(
  data: AppData,
  id: string,
  excludedAt = new Date().toISOString(),
): AppData {
  const expense = data.expenses.find((entry) => entry.id === id);
  if (!expense) return data;

  const template = recurringTemplateForExpense(
    data.recurringExpenses,
    expense,
  );
  if (!template || !expense.recurringOccurrenceKey) {
    return {
      ...data,
      expenses: data.expenses.filter((entry) => entry.id !== id),
    };
  }

  const normalized = normalizeRecurringExpense(template);
  const key = expense.recurringOccurrenceKey;
  const alreadyExcluded = normalized.occurrenceExclusions?.some(
    (exclusion) => exclusion.key === key,
  );
  const nextTemplate: RecurringExpense = alreadyExcluded
    ? normalized
    : {
        ...normalized,
        occurrenceExclusions: [
          ...(normalized.occurrenceExclusions ?? []),
          { key, excludedAt },
        ].sort((left, right) => left.key.localeCompare(right.key)),
        updatedAt: excludedAt,
      };

  return {
    ...data,
    expenses: data.expenses.filter((entry) => entry.id !== id),
    recurringExpenses: data.recurringExpenses.map((entry) =>
      entry.id === template.id ? nextTemplate : entry,
    ),
  };
}

/** Elimina la regla, pero conserva intactos los cargos históricos generados. */
export function deleteRecurringExpenseFromData(
  data: AppData,
  id: string,
): AppData {
  if (!data.recurringExpenses.some((entry) => entry.id === id)) return data;
  return {
    ...data,
    recurringExpenses: data.recurringExpenses.filter((entry) => entry.id !== id),
  };
}

export type RecurringExpenseChangeManualReviewReason =
  | "materialized_occurrence"
  | "ambiguous_provenance"
  | "duplicate_occurrence_key"
  | "occurrence_exclusion"
  | "duplicate_template_id"
  | "duplicate_exclusion"
  | "invalid_exclusion"
  | "invalid_effective_date"
  | "invalid_reference_date";

export interface RecurringExpenseChangeManualReviewItem {
  kind: "template" | "expense" | "exclusion";
  id: string;
  logicalDate?: string;
  reason: RecurringExpenseChangeManualReviewReason;
}

export interface RecurringExpenseChangePreview {
  status: "ready" | "manual_review" | "not_found";
  precondition: string;
  effectiveDate: string;
  referenceDate: string;
  preservedExpenseCount: number;
  affectedExpenseCount: number;
  affectedExclusionCount: number;
  affectedDates: string[];
  manualReview: RecurringExpenseChangeManualReviewItem[];
}

export type RecurringExpenseChangeApplyResult =
  | {
      status: "applied";
      data: AppData;
      preview: RecurringExpenseChangePreview;
    }
  | {
      status: "blocked";
      reason:
        | "not_found"
        | "manual_review"
        | "stale_preview"
        | "identifier_collision";
      data: AppData;
      preview: RecurringExpenseChangePreview;
    };

function recurringExpenseChangeRelatedExpenses(
  data: AppData,
  templateId: string,
): Expense[] {
  const keyPrefix = `${templateId}:`;
  return data.expenses
    .filter(
      (expense) =>
        expense.recurringExpenseId === templateId ||
        expense.recurringOccurrenceKey?.startsWith(keyPrefix),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

function recurringExpenseChangePrecondition(
  templates: RecurringExpense[],
  relatedExpenses: Expense[],
  item: RecurringExpenseDraft,
  effectiveDate: string,
  referenceDate: string,
): string {
  return JSON.stringify({
    templates,
    relatedExpenses,
    item,
    effectiveDate,
    referenceDate,
  });
}

export function previewRecurringExpenseChangeToData(
  data: AppData,
  id: string,
  item: RecurringExpenseDraft,
  effectiveDate: string,
  options: { referenceDate?: string } = {},
): RecurringExpenseChangePreview {
  const referenceDate =
    options.referenceDate ?? new Date().toISOString().split("T")[0];
  const sourceEntries = data.recurringExpenses.filter((entry) => entry.id === id);
  const relatedExpenses = recurringExpenseChangeRelatedExpenses(data, id);
  const precondition = recurringExpenseChangePrecondition(
    sourceEntries,
    relatedExpenses,
    item,
    effectiveDate,
    referenceDate,
  );

  if (sourceEntries.length === 0) {
    return {
      status: "not_found",
      precondition,
      effectiveDate,
      referenceDate,
      preservedExpenseCount: 0,
      affectedExpenseCount: 0,
      affectedExclusionCount: 0,
      affectedDates: [],
      manualReview: [],
    };
  }

  const manualReview: RecurringExpenseChangeManualReviewItem[] = [];
  if (sourceEntries.length !== 1) {
    manualReview.push({
      kind: "template",
      id,
      reason: "duplicate_template_id",
    });
  }
  if (!isIsoCalendarDate(effectiveDate)) {
    manualReview.push({
      kind: "template",
      id,
      reason: "invalid_effective_date",
    });
  }
  if (!isIsoCalendarDate(referenceDate)) {
    manualReview.push({
      kind: "template",
      id,
      reason: "invalid_reference_date",
    });
  }
  if (manualReview.length > 0) {
    return {
      status: "manual_review",
      precondition,
      effectiveDate,
      referenceDate,
      preservedExpenseCount: 0,
      affectedExpenseCount: 0,
      affectedExclusionCount: 0,
      affectedDates: [],
      manualReview,
    };
  }

  const sourceExisting = sourceEntries[0]!;
  const affectedDates = new Set<string>();
  const seenOccurrenceKeys = new Set<string>();
  const seenExclusionKeys = new Set<string>();
  let preservedExpenseCount = 0;
  let affectedExpenseCount = 0;
  let affectedExclusionCount = 0;

  for (const expense of relatedExpenses) {
    const key = expense.recurringOccurrenceKey;
    const logicalDate = key ? occurrenceDateFromKey(id, key) : null;
    const hasConflictingTemplateId =
      expense.recurringExpenseId !== undefined &&
      expense.recurringExpenseId !== id;

    if (!logicalDate || hasConflictingTemplateId) {
      manualReview.push({
        kind: "expense",
        id: expense.id,
        reason: "ambiguous_provenance",
      });
      continue;
    }

    const stableKey = key ?? "";
    if (seenOccurrenceKeys.has(stableKey)) {
      if (logicalDate >= effectiveDate) {
        affectedExpenseCount += 1;
        affectedDates.add(logicalDate);
        manualReview.push({
          kind: "expense",
          id: expense.id,
          logicalDate,
          reason: "duplicate_occurrence_key",
        });
      } else {
        preservedExpenseCount += 1;
      }
      continue;
    }
    seenOccurrenceKeys.add(stableKey);

    if (logicalDate >= effectiveDate) {
      affectedExpenseCount += 1;
      affectedDates.add(logicalDate);
      manualReview.push({
        kind: "expense",
        id: expense.id,
        logicalDate,
        reason: "materialized_occurrence",
      });
    } else {
      preservedExpenseCount += 1;
    }
  }

  const sourceExclusions = sourceExisting.occurrenceExclusions as unknown;
  if (sourceExclusions !== undefined && !Array.isArray(sourceExclusions)) {
    manualReview.push({
      kind: "exclusion",
      id: "exclusiones-invalidas",
      reason: "invalid_exclusion",
    });
  }
  const rawExclusions = Array.isArray(sourceExclusions)
    ? sourceExclusions
    : [];
  for (const exclusion of rawExclusions) {
    const key =
      exclusion && typeof exclusion.key === "string" ? exclusion.key : "";
    const logicalDate = occurrenceDateFromKey(id, key);
    const excludedAt =
      exclusion && typeof exclusion.excludedAt === "string"
        ? exclusion.excludedAt
        : "";
    if (!logicalDate || !Number.isFinite(Date.parse(excludedAt))) {
      manualReview.push({
        kind: "exclusion",
        id: key || "exclusion-sin-clave",
        reason: "invalid_exclusion",
      });
      continue;
    }
    if (seenExclusionKeys.has(key)) {
      manualReview.push({
        kind: "exclusion",
        id: key,
        logicalDate,
        reason: "duplicate_exclusion",
      });
      continue;
    }
    seenExclusionKeys.add(key);
    if (logicalDate >= effectiveDate) {
      affectedExclusionCount += 1;
      affectedDates.add(logicalDate);
      manualReview.push({
        kind: "exclusion",
        id: key,
        logicalDate,
        reason: "occurrence_exclusion",
      });
    }
  }

  return {
    status: manualReview.length > 0 ? "manual_review" : "ready",
    precondition,
    effectiveDate,
    referenceDate,
    preservedExpenseCount,
    affectedExpenseCount,
    affectedExclusionCount,
    affectedDates: [...affectedDates].sort(),
    manualReview,
  };
}

function syncRecurringExpenseChangeTemplates(
  data: AppData,
  templates: RecurringExpense[],
  referenceDate: string,
): AppData {
  const synced = syncRecurringExpenses(
    { ...data, recurringExpenses: templates },
    referenceDate,
  );
  return synced.expenses === data.expenses
    ? data
    : { ...data, expenses: synced.expenses };
}

export function applyRecurringExpenseChangeToData(
  data: AppData,
  id: string,
  item: RecurringExpenseDraft,
  effectiveDate: string,
  options: {
    now?: string;
    newId?: () => string;
    referenceDate?: string;
    expectedPrecondition?: string;
  } = {},
): RecurringExpenseChangeApplyResult {
  const preview = previewRecurringExpenseChangeToData(
    data,
    id,
    item,
    effectiveDate,
    { referenceDate: options.referenceDate },
  );
  if (preview.status === "not_found") {
    return { status: "blocked", reason: "not_found", data, preview };
  }
  if (preview.status === "manual_review") {
    return { status: "blocked", reason: "manual_review", data, preview };
  }
  if (options.expectedPrecondition !== preview.precondition) {
    return { status: "blocked", reason: "stale_preview", data, preview };
  }

  const sourceEntries = data.recurringExpenses.filter((entry) => entry.id === id);
  if (sourceEntries.length !== 1) {
    return { status: "blocked", reason: "not_found", data, preview };
  }
  const existing = sourceEntries[0]!;

  const now = options.now ?? new Date().toISOString();
  const referenceDate = preview.referenceDate;
  const scheduleAnchorDate =
    item.frequency === existing.frequency
      ? recurringScheduleAnchorDate(existing)
      : effectiveDate;

  if (effectiveDate <= existing.startDate) {
    const updated: RecurringExpense = {
      ...existing,
      ...item,
      scheduleAnchorDate,
      startDate: effectiveDate,
      updatedAt: now,
    };
    const prepared = {
      ...data,
      recurringExpenses: data.recurringExpenses.map((entry) =>
        entry.id === id ? updated : entry,
      ),
    };
    const nextData = syncRecurringExpenseChangeTemplates(
      prepared,
      [updated],
      referenceDate,
    );
    return { status: "applied", data: nextData, preview };
  }

  const closingDate = addDaysIso(effectiveDate, -1);
  const closedDuration =
    existing.duration.kind === "until_date" &&
    existing.duration.endDate < closingDate
      ? existing.duration
      : ({ kind: "until_date", endDate: closingDate } as const);
  const closedExisting: RecurringExpense = {
    ...existing,
    duration: closedDuration,
    updatedAt: now,
  };
  const nextTemplateId = options.newId?.() ?? crypto.randomUUID();
  if (
    !nextTemplateId ||
    data.recurringExpenses.some((entry) => entry.id === nextTemplateId) ||
    recurringExpenseChangeRelatedExpenses(data, nextTemplateId).length > 0
  ) {
    return {
      status: "blocked",
      reason: "identifier_collision",
      data,
      preview,
    };
  }
  const nextTemplate: RecurringExpense = normalizeRecurringExpense({
    ...item,
    id: nextTemplateId,
    scheduleAnchorDate,
    startDate: effectiveDate,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });

  const prepared = {
    ...data,
    recurringExpenses: [
      ...data.recurringExpenses.map((entry) =>
        entry.id === id ? closedExisting : entry,
      ),
      nextTemplate,
    ],
  };
  const nextData = syncRecurringExpenseChangeTemplates(
    prepared,
    [nextTemplate],
    referenceDate,
  );
  return { status: "applied", data: nextData, preview };
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

  for (const sourceTemplate of data.recurringExpenses) {
    const template = normalizeRecurringExpense(sourceTemplate);
    if (!template.enabled) continue;
    const excludedKeys = excludedOccurrenceKeys(template);

    for (const date of listRecurringOccurrenceDates(template, horizonEnd)) {
      if (compareIso(date, referenceDate) < 0) continue;
      const key = occurrenceKey(template.id, date);
      if (excludedKeys.has(key)) continue;

      previews.push({
        templateId: template.id,
        supplierName: template.supplierName,
        description: template.description,
        amount: template.amount,
        ivaPercent: template.ivaPercent,
        deductibility: template.deductibility,
        date,
        daysUntil: daysBetweenIso(referenceDate, date),
        generated: existingKeys.has(key),
      });
    }
  }

  return previews.sort((a, b) => a.date.localeCompare(b.date));
}

export function collectNextRecurringOccurrencePreviews(
  data: AppData,
  referenceDate: string,
  horizonDays = RECURRING_PREVIEW_HORIZON_DAYS,
): RecurringOccurrencePreview[] {
  const previews = collectRecurringOccurrencePreviews(
    data,
    referenceDate,
    horizonDays,
  ).filter((preview) => !preview.generated);
  const nextByTemplate = new Map<string, RecurringOccurrencePreview>();

  for (const preview of previews) {
    const current = nextByTemplate.get(preview.templateId);
    if (!current || preview.date < current.date) {
      nextByTemplate.set(preview.templateId, preview);
    }
  }

  return [...nextByTemplate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
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
