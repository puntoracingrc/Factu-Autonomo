import { zipSync } from "fflate";
import type { Quarter } from "@/lib/periods";
import type {
  BusinessProfile,
  Expense,
  ExpenseOriginalArchiveV1,
  Supplier,
} from "@/lib/types";
import { assertExpensesVatExportable } from "./export-expenses-csv";
import { buildExpensePeriodSummaryPdf } from "./expense-period-summary-pdf";
import { isVatExempt } from "@/lib/vat-regime";
import {
  downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1,
  type DownloadedExpenseOriginalV1,
} from "@/lib/google-drive/expense-original-download.v1";
import { getGoogleDriveClientId } from "@/lib/google-drive/config";
import { requestDriveAccessToken } from "@/lib/google-drive/backup";
import { runExclusiveDriveOperation } from "@/lib/google-drive/operation";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
const MAX_EXPENSE_EXPORT_BYTES = 300 * 1024 * 1024;

export type ExpenseOriginalExportPeriod =
  | { kind: "month"; year: number; month: number }
  | { kind: "quarter"; year: number; quarter: Quarter };

export type ExpenseOriginalExportErrorCode =
  | "invalid_period"
  | "no_expenses"
  | "blocked_expenses"
  | "drive_unavailable"
  | "original_verification_failed"
  | "package_too_large"
  | "summary_generation_failed";

export class ExpenseOriginalExportError extends Error {
  constructor(
    readonly code: ExpenseOriginalExportErrorCode,
    message: string,
    readonly expenseReferences: string[] = [],
  ) {
    super(message);
    this.name = "ExpenseOriginalExportError";
  }
}

export interface ExpenseOriginalExportArchive {
  blob: Blob;
  fileName: string;
  folderName: string;
  summaryFileName: string;
  expenseCount: number;
  originalCount: number;
  missingOriginalCount: number;
}

export interface ExpenseOriginalExportInput {
  expenses: Expense[];
  suppliers: Supplier[];
  profile: BusinessProfile;
  period: ExpenseOriginalExportPeriod;
  supplierFilterLabel?: string;
  exportScopeLabel?: string;
}

type ExpenseOriginalReader = (
  archive: ExpenseOriginalArchiveV1,
) => Promise<DownloadedExpenseOriginalV1>;

export function expenseOriginalExportPeriodLabel(
  period: ExpenseOriginalExportPeriod,
): string {
  assertPeriod(period);
  return period.kind === "month"
    ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
    : `Trimestre ${period.quarter} ${period.year}`;
}

export function expenseOriginalExportFolderName(
  period: ExpenseOriginalExportPeriod,
  supplierFilterLabel?: string,
): string {
  const periodLabel = expenseOriginalExportPeriodLabel(period);
  const supplier = normalizeFilenamePart(supplierFilterLabel ?? "");
  return supplier
    ? `Gastos ${periodLabel} - ${supplier}`
    : `Gastos ${periodLabel}`;
}

export function expenseOriginalExportSummaryFileName(
  period: ExpenseOriginalExportPeriod,
  supplierFilterLabel?: string,
): string {
  const folder = expenseOriginalExportFolderName(period, supplierFilterLabel);
  return `Resumen ${folder}.pdf`;
}

export async function buildExpenseOriginalExportArchive(
  input: ExpenseOriginalExportInput,
  readOriginal?: ExpenseOriginalReader,
): Promise<ExpenseOriginalExportArchive> {
  assertPeriod(input.period);
  if (input.expenses.length === 0) {
    throw new ExpenseOriginalExportError(
      "no_expenses",
      "No hay gastos en la selección actual.",
    );
  }
  try {
    assertExpensesVatExportable(input.expenses, isVatExempt(input.profile));
  } catch {
    throw new ExpenseOriginalExportError(
      "blocked_expenses",
      "Hay gastos con evidencia fiscal pendiente. Revísalos antes de exportar.",
      input.expenses.map(expenseReference),
    );
  }

  const folderName = expenseOriginalExportFolderName(
    input.period,
    input.supplierFilterLabel,
  );
  const summaryFileName = expenseOriginalExportSummaryFileName(
    input.period,
    input.supplierFilterLabel,
  );
  const periodLabel = [
    expenseOriginalExportPeriodLabel(input.period),
    input.supplierFilterLabel?.trim(),
    input.exportScopeLabel?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  const archived = input.expenses.filter(
    (
      expense,
    ): expense is Expense & { originalArchive: ExpenseOriginalArchiveV1 } =>
      Boolean(expense.originalArchive),
  );
  if (archived.length > 0 && !readOriginal) {
    throw new ExpenseOriginalExportError(
      "drive_unavailable",
      "Google Drive es necesario para recuperar los originales archivados.",
    );
  }

  const files: Record<string, Uint8Array> = {};
  const usedNames = new Map<string, number>();
  let totalBytes = 0;
  const sorted = [...archived].sort(compareExpenses);
  const downloaded = new Array<DownloadedExpenseOriginalV1>(sorted.length);
  let nextIndex = 0;
  const workerCount = Math.min(3, sorted.length);
  try {
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < sorted.length) {
          const index = nextIndex;
          nextIndex += 1;
          downloaded[index] = await readOriginal!(
            sorted[index].originalArchive,
          );
        }
      }),
    );
  } catch (error) {
    throw new ExpenseOriginalExportError(
      "original_verification_failed",
      error instanceof Error
        ? `${error.message} No se ha descargado un ZIP incompleto.`
        : "No se pudo verificar un original de Drive. No se ha descargado un ZIP incompleto.",
    );
  }

  sorted.forEach((expense, index) => {
    const original = downloaded[index];
    totalBytes += original.bytes.byteLength;
    const filename = uniqueOriginalFilename(
      expense,
      original.extension,
      usedNames,
    );
    files[`${folderName}/${filename}`] = original.bytes;
  });
  if (totalBytes > MAX_EXPENSE_EXPORT_BYTES) {
    throw new ExpenseOriginalExportError(
      "package_too_large",
      "Los originales del periodo superan 300 MB. Reduce el periodo o filtra por proveedor.",
    );
  }

  try {
    const summaryPdf = buildExpensePeriodSummaryPdf(
      input.expenses,
      input.suppliers,
      input.profile,
      periodLabel,
    );
    files[`${folderName}/${summaryFileName}`] = new Uint8Array(
      summaryPdf.output("arraybuffer"),
    );
  } catch {
    throw new ExpenseOriginalExportError(
      "summary_generation_failed",
      "No se pudo preparar el resumen de gastos. No se ha descargado un ZIP incompleto.",
    );
  }

  const archive = zipSync(files, { level: 0 });
  return {
    blob: new Blob([archive], { type: "application/zip" }),
    fileName: `${folderName}.zip`,
    folderName,
    summaryFileName,
    expenseCount: input.expenses.length,
    originalCount: archived.length,
    missingOriginalCount: input.expenses.length - archived.length,
  };
}

export async function downloadExpenseOriginalExportArchive(
  input: ExpenseOriginalExportInput,
): Promise<ExpenseOriginalExportArchive> {
  const hasArchivedOriginals = input.expenses.some(
    (expense) => expense.originalArchive,
  );
  let archive: ExpenseOriginalExportArchive;
  if (!hasArchivedOriginals) {
    archive = await buildExpenseOriginalExportArchive(input);
  } else {
    const clientId = getGoogleDriveClientId();
    if (!clientId) {
      throw new ExpenseOriginalExportError(
        "drive_unavailable",
        "Google Drive no está configurado.",
      );
    }
    const execution = await runExclusiveDriveOperation(async () => {
      const accessToken = await requestDriveAccessToken(clientId, "");
      return buildExpenseOriginalExportArchive(input, (original) =>
        downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
          original,
          accessToken,
        ),
      );
    });
    if (!execution.started) {
      throw new ExpenseOriginalExportError(
        "drive_unavailable",
        "Drive está terminando otra operación. Espera unos segundos y vuelve a exportar.",
      );
    }
    archive = execution.value;
  }
  triggerArchiveDownload(archive.blob, archive.fileName);
  return archive;
}

function assertPeriod(period: ExpenseOriginalExportPeriod): void {
  const validYear =
    Number.isInteger(period.year) && period.year >= 1000 && period.year <= 9999;
  const valid =
    validYear &&
    (period.kind === "month"
      ? Number.isInteger(period.month) &&
        period.month >= 1 &&
        period.month <= 12
      : Number.isInteger(period.quarter) &&
        period.quarter >= 1 &&
        period.quarter <= 4);
  if (!valid) {
    throw new ExpenseOriginalExportError(
      "invalid_period",
      "Selecciona un mes o un trimestre válido.",
    );
  }
}

function compareExpenses(left: Expense, right: Expense): number {
  const byDate = left.date.localeCompare(right.date);
  if (byDate !== 0) return byDate;
  return expenseReference(left).localeCompare(expenseReference(right), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function expenseReference(expense: Expense): string {
  return (
    expense.purchaseDocument?.invoiceNumber?.trim() ||
    expense.description.trim() ||
    expense.supplierName.trim() ||
    "Gasto"
  );
}

function uniqueOriginalFilename(
  expense: Expense,
  extension: DownloadedExpenseOriginalV1["extension"],
  usedNames: Map<string, number>,
): string {
  const supplier = normalizeFilenamePart(expense.supplierName) || "Proveedor";
  const reference = normalizeFilenamePart(expenseReference(expense)) || "Gasto";
  const requested = `${expense.date} - ${supplier} - ${reference}${extension}`;
  const key = requested.toLocaleLowerCase("es");
  const previous = usedNames.get(key) ?? 0;
  usedNames.set(key, previous + 1);
  return previous === 0
    ? requested
    : `${requested.slice(0, -extension.length)}-${previous + 1}${extension}`;
}

function normalizeFilenamePart(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}

function triggerArchiveDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
