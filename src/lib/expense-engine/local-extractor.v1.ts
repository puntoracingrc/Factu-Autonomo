import {
  DocumentReadingErrorV1,
  parseDocumentReadingPagesV1,
  type DocumentReadingLayoutCellV1,
  type DocumentReadingOutcomeV1,
  type DocumentReadingPageV1,
} from "../document-reading/contracts.v1";
import type {
  ExpenseEngineDocumentKindV1,
  ExpenseEngineMathCheckV1,
  ExpenseEngineSourceQualityV1,
  ExpenseEngineStructuralArchetypeV1,
  ExpenseLearningConfidenceV1,
  ExpenseLearningFormulaKindV1,
} from "./contracts";
import {
  createExpenseLocalCandidateAbstainedOutcomeV1,
  createExpenseLocalCandidateAvailableOutcomeV1,
  type ExpenseLocalCandidateInputV1,
  type ExpenseLocalCandidateOutcomeV1,
  type ExpenseLocalLineCandidateInputV1,
} from "./local-candidate.v1";
import { reconcileExpenseEngineMathV1 } from "./math";

interface LocalCellV1 {
  readonly x: number;
  readonly text: string;
}

interface LocalRowV1 {
  readonly pageNumber: number;
  readonly cells: readonly LocalCellV1[];
  readonly text: string;
}

interface BuiltRowsV1 {
  readonly rows: readonly LocalRowV1[];
  readonly limitExceeded: boolean;
}

type ColumnRoleV1 =
  | "REFERENCE"
  | "DESCRIPTION"
  | "QUANTITY"
  | "UNIT"
  | "UNIT_PRICE"
  | "DISCOUNT"
  | "NET_UNIT_PRICE"
  | "TAX_RATE"
  | "TOTAL";

interface HeaderColumnV1 {
  readonly x: number;
  readonly role: ColumnRoleV1 | null;
}

interface ParsedTotalsV1 {
  readonly taxBase?: number;
  readonly taxPercent?: number;
  readonly taxAmount?: number;
  readonly surchargePercent?: number;
  readonly surchargeAmount?: number;
  readonly withholdingAmount?: number;
  readonly total?: number;
}

interface ParsedLinesV1 {
  readonly lines: readonly ExpenseLocalLineCandidateInputV1[];
  readonly limitExceeded: boolean;
}

const MAX_ROWS = 5_000;
const MAX_RECONCILED_LINES = 50;
const TOTAL_ROW_PATTERN =
  /^(?:subtotal|base\s+(?:imponible|iva)|(?:cuota\s+)?iva|recargo|retenci[oó]n|irpf|importe\s+total|total\s+(?:factura|a\s+pagar)|total)\b/iu;
const NON_EXPENSE_PATTERN =
  /\b(?:presupuesto|pressupost|oferta|pedido|comanda|cotizaci[oó]n|quote|order)\b/iu;
const PROFORMA_PATTERN = /\bproforma\b/iu;
const INVOICE_PATTERN = /\b(?:factura|invoice|facture)\b/iu;
const TICKET_PATTERN = /\b(?:ticket|recibo|receipt|factura\s+simplificada)\b/iu;

export function extractExpenseCandidateFromReadingV1(
  reading: DocumentReadingOutcomeV1,
): ExpenseLocalCandidateOutcomeV1 {
  if (reading.status === "ABSTAINED") {
    return abstained(
      expenseAbstentionReasonForReading(reading.reason),
      "OTHER",
      "UNKNOWN",
      "UNREADABLE",
      "LOW",
      emptyMath(),
    );
  }
  return extractExpenseCandidateLocallyV1(reading.ephemeralContent.pages);
}

export function extractExpenseCandidateLocallyV1(
  value: unknown,
): ExpenseLocalCandidateOutcomeV1 {
  let pages: readonly DocumentReadingPageV1[];
  try {
    pages = parseDocumentReadingPagesV1(value);
  } catch (error) {
    return abstained(
      error instanceof DocumentReadingErrorV1 ? "INVALID_INPUT" : "UNKNOWN",
      "OTHER",
      "UNKNOWN",
      "UNREADABLE",
      "LOW",
      emptyMath(),
    );
  }

  const builtRows = buildRows(pages);
  const rows = builtRows.rows;
  const sourceQuality = sourceQualityBucket(pages, rows);
  const documentKind = detectDocumentKind(rows);
  if (builtRows.limitExceeded) {
    return abstained(
      "LIMIT_EXCEEDED",
      documentKind,
      "UNKNOWN",
      sourceQuality,
      "LOW",
      emptyMath(),
    );
  }
  if (documentKind === "QUOTE_OR_ORDER" || documentKind === "PROFORMA") {
    return abstained(
      "UNSUPPORTED_ARCHETYPE",
      documentKind,
      "NON_EXPENSE",
      sourceQuality,
      "LOW",
      emptyMath(),
    );
  }
  if (documentKind === "OTHER") {
    return abstained(
      "UNSUPPORTED_ARCHETYPE",
      documentKind,
      "UNKNOWN",
      sourceQuality,
      "LOW",
      emptyMath(),
    );
  }

  const totals = parseTotals(rows);
  const parsedLines = parseLines(rows);
  const lines = parsedLines.lines;
  const date = findDate(rows);
  const archetype = structuralArchetype(documentKind, lines);
  if (parsedLines.limitExceeded) {
    return abstained(
      "LIMIT_EXCEEDED",
      documentKind,
      archetype,
      sourceQuality,
      "LOW",
      emptyMath(),
    );
  }
  const documentFormula = documentFormulaForTotals(totals);
  const math = reconcileExpenseEngineMathV1({
    documentFormula,
    taxBase: totals.taxBase,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    surchargePercent: totals.surchargePercent,
    surchargeAmount: totals.surchargeAmount,
    withholdingAmount: totals.withholdingAmount,
    documentTotal: totals.total,
    lines,
  });
  const confidence = confidenceBucket({ date, totals, lines, math });

  if (!date || totals.total === undefined) {
    return abstained(
      "MISSING_FIELDS",
      documentKind,
      archetype,
      sourceQuality,
      "LOW",
      math,
    );
  }
  if (math.some((check) => check.verdict === "MISMATCH")) {
    return abstained(
      "MATH_UNRECONCILED",
      documentKind,
      archetype,
      sourceQuality,
      "LOW",
      math,
    );
  }

  const candidate: ExpenseLocalCandidateInputV1 = {
    documentKind,
    supplierName: findSupplierName(rows),
    supplierTaxId: findSupplierTaxId(rows),
    invoiceNumber: findInvoiceNumber(rows),
    date,
    ...totals,
    lines,
  };
  try {
    return createExpenseLocalCandidateAvailableOutcomeV1({
      metadata: {
        structuralArchetypeId: archetype,
        documentKind,
        sourceQualityBucket: sourceQuality,
        localConfidence: confidence,
        math,
      },
      candidate,
    });
  } catch {
    return abstained(
      "INVALID_INPUT",
      documentKind,
      archetype,
      sourceQuality,
      "LOW",
      math,
    );
  }
}

function expenseAbstentionReasonForReading(
  reason: Extract<DocumentReadingOutcomeV1, { status: "ABSTAINED" }>["reason"],
): Parameters<
  typeof createExpenseLocalCandidateAbstainedOutcomeV1
>[0]["reason"] {
  if (reason === "OCR_REQUIRED") return "OCR_REQUIRED";
  if (
    reason === "FILE_TOO_LARGE" ||
    reason === "TOO_MANY_PAGES" ||
    reason === "TOO_MANY_TEXT_ITEMS" ||
    reason === "TEXT_ITEM_TOO_LARGE" ||
    reason === "TEXT_TOO_LARGE"
  ) {
    return "LIMIT_EXCEEDED";
  }
  if (
    reason === "INVALID_INPUT" ||
    reason === "EMPTY_FILE" ||
    reason === "INVALID_PDF" ||
    reason === "INVALID_WORKER_RESPONSE" ||
    reason === "HASH_UNAVAILABLE"
  ) {
    return "INVALID_INPUT";
  }
  return "POLICY_ABSTENTION";
}

function buildRows(pages: readonly DocumentReadingPageV1[]): BuiltRowsV1 {
  const rows: LocalRowV1[] = [];
  for (const page of pages) {
    if (page.layoutRows && page.layoutRows.length > 0) {
      for (const row of page.layoutRows) {
        const cells = row.cells
          .map(layoutCell)
          .filter((cell): cell is LocalCellV1 => cell !== null)
          .sort((left, right) => left.x - right.x);
        if (cells.length === 0) continue;
        if (rows.length >= MAX_ROWS) {
          return { rows: Object.freeze(rows), limitExceeded: true };
        }
        rows.push({
          pageNumber: page.pageNumber,
          cells,
          text: cells.map((cell) => cell.text).join(" | "),
        });
      }
      continue;
    }
    for (const text of page.text.split(/\r?\n/gu)) {
      const normalized = text.trim();
      if (!normalized) continue;
      const rawCells = normalized.split(/\t|\s{2,}|\|/gu).filter(Boolean);
      const cells = rawCells.map((cell, cellIndex) => ({
        x: cellIndex * 1_000,
        text: cell.trim(),
      }));
      if (rows.length >= MAX_ROWS) {
        return { rows: Object.freeze(rows), limitExceeded: true };
      }
      rows.push({
        pageNumber: page.pageNumber,
        cells,
        text: normalized,
      });
    }
  }
  return { rows: Object.freeze(rows), limitExceeded: false };
}

function layoutCell(cell: DocumentReadingLayoutCellV1): LocalCellV1 | null {
  const text = cell.text.trim();
  return text ? { x: cell.xMilli, text } : null;
}

function detectDocumentKind(
  rows: readonly LocalRowV1[],
): ExpenseEngineDocumentKindV1 {
  const tableHeaderIndex = rows.findIndex(
    (row) => headerColumns(row.cells) !== null,
  );
  const heading = rows
    .slice(0, tableHeaderIndex >= 0 ? tableHeaderIndex : 14)
    .filter((row) => !TOTAL_ROW_PATTERN.test(normalizeText(row.text)))
    .slice(0, 14)
    .map((row) => row.text)
    .join("\n");
  if (PROFORMA_PATTERN.test(heading)) return "PROFORMA";
  if (NON_EXPENSE_PATTERN.test(heading)) {
    return "QUOTE_OR_ORDER";
  }
  if (TICKET_PATTERN.test(heading)) return "TICKET";
  if (INVOICE_PATTERN.test(heading)) return "EXPENSE_INVOICE";
  return "OTHER";
}

function parseLines(rows: readonly LocalRowV1[]): ParsedLinesV1 {
  const headerIndex = rows.findIndex(
    (row) => headerColumns(row.cells) !== null,
  );
  if (headerIndex < 0) return { lines: [], limitExceeded: false };
  const columns = headerColumns(rows[headerIndex].cells);
  if (!columns) return { lines: [], limitExceeded: false };

  const output: Array<
    ExpenseLocalLineCandidateInputV1 & { description: string }
  > = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (TOTAL_ROW_PATTERN.test(normalizeText(row.text))) break;
    const values = alignCellsToHeader(row.cells, columns);
    const description = valueForRole(values, columns, "DESCRIPTION")?.trim();
    const total = parseMoney(valueForRole(values, columns, "TOTAL"));
    if (!description || total === undefined) {
      if (description && output.length > 0 && total === undefined) {
        const previous = output[output.length - 1];
        previous.description = `${previous.description} ${description}`
          .replace(/\s+/gu, " ")
          .trim();
      }
      continue;
    }
    const unitPrice = parseMoney(valueForRole(values, columns, "UNIT_PRICE"));
    const discountPercent = parsePercent(
      valueForRole(values, columns, "DISCOUNT"),
    );
    const explicitNetUnitPrice = parseMoney(
      valueForRole(values, columns, "NET_UNIT_PRICE"),
    );
    const netUnitPrice =
      explicitNetUnitPrice ??
      (unitPrice !== undefined && discountPercent !== undefined
        ? roundMoney(unitPrice * (1 - discountPercent / 100))
        : undefined);
    if (output.length >= MAX_RECONCILED_LINES) {
      return { lines: Object.freeze(output), limitExceeded: true };
    }
    output.push({
      reference:
        valueForRole(values, columns, "REFERENCE")?.trim() || undefined,
      description,
      quantity: parseNumber(valueForRole(values, columns, "QUANTITY")),
      unit: valueForRole(values, columns, "UNIT")?.trim() || undefined,
      unitPrice,
      discountPercent,
      netUnitPrice,
      taxPercent: parsePercent(valueForRole(values, columns, "TAX_RATE")),
      total,
    });
  }
  return { lines: Object.freeze(output), limitExceeded: false };
}

function headerColumns(
  cells: readonly LocalCellV1[],
): readonly HeaderColumnV1[] | null {
  const columns = cells.map((cell) => ({
    x: cell.x,
    role: headerRole(cell.text),
  }));
  const roles = columns.map((column) => column.role).filter(Boolean);
  if (
    !roles.includes("DESCRIPTION") ||
    !roles.includes("TOTAL") ||
    new Set(roles).size < 3
  ) {
    return null;
  }
  return columns;
}

function headerRole(value: string): ColumnRoleV1 | null {
  const text = normalizeText(value).replace(/[.:]+$/gu, "");
  if (/^(?:ref|referencia|codigo|cod|sku|articulo)$/u.test(text))
    return "REFERENCE";
  if (
    /^(?:descripcion|detalle|concepto|producto|articulo descripcion)$/u.test(
      text,
    )
  ) {
    return "DESCRIPTION";
  }
  if (/^(?:cant|cantidad|ctdad|qty|uds|unidades)$/u.test(text))
    return "QUANTITY";
  if (/^(?:ud|unidad|unid|u m|um)$/u.test(text)) return "UNIT";
  if (/^(?:precio|precio unitario|p unit|tarifa|pvp)$/u.test(text))
    return "UNIT_PRICE";
  if (/^(?:precio neto|p neto|neto)$/u.test(text)) return "NET_UNIT_PRICE";
  if (/^(?:dto|dto %|descuento|descuento %)$/u.test(text)) return "DISCOUNT";
  if (/^(?:iva|iva %|tipo iva)$/u.test(text)) return "TAX_RATE";
  if (/^(?:importe|importe linea|subtotal|total|base)$/u.test(text))
    return "TOTAL";
  return null;
}

function alignCellsToHeader(
  cells: readonly LocalCellV1[],
  columns: readonly HeaderColumnV1[],
): readonly string[] {
  return columns.map((column, index) => {
    const previousX = columns[index - 1]?.x;
    const nextX = columns[index + 1]?.x;
    const minimum =
      previousX === undefined
        ? Number.NEGATIVE_INFINITY
        : (previousX + column.x) / 2;
    const maximum =
      nextX === undefined ? Number.POSITIVE_INFINITY : (column.x + nextX) / 2;
    return cells
      .filter((cell) => cell.x >= minimum && cell.x < maximum)
      .map((cell) => cell.text)
      .join(" ")
      .trim();
  });
}

function valueForRole(
  values: readonly string[],
  columns: readonly HeaderColumnV1[],
  role: ColumnRoleV1,
): string | undefined {
  const index = columns.findIndex((column) => column.role === role);
  return index >= 0 ? values[index] : undefined;
}

function parseTotals(rows: readonly LocalRowV1[]): ParsedTotalsV1 {
  let explicitTaxBase: number | undefined;
  const taxBases: number[] = [];
  const taxAmounts: number[] = [];
  const surchargeAmounts: number[] = [];
  let taxPercent: number | undefined;
  let surchargePercent: number | undefined;
  let withholdingAmount: number | undefined;
  let total: number | undefined;

  for (const row of rows) {
    const text = normalizeText(row.text);
    const amount = lastMoney(row.text);
    if (amount === undefined) continue;
    if (/\bbase imponible\b/u.test(text)) {
      explicitTaxBase = amount;
    } else if (/^base iva\b/u.test(text)) {
      taxBases.push(amount);
    } else if (
      /\b(?:cuota )?iva\b/u.test(text) &&
      !/\bbase iva\b/u.test(text)
    ) {
      taxAmounts.push(amount);
      taxPercent ??= firstPercent(row.text);
    } else if (/\brecargo\b/u.test(text)) {
      surchargeAmounts.push(Math.abs(amount));
      surchargePercent ??= firstPercent(row.text);
    } else if (/\b(?:irpf|retencion)\b/u.test(text)) {
      withholdingAmount = Math.abs(amount);
    } else if (
      /\b(?:total factura|importe total|total a pagar)\b/u.test(text) ||
      /^total\b/u.test(text)
    ) {
      if (!/\b(?:subtotal|pendiente|iva)\b/u.test(text)) total = amount;
    } else if (/^subtotal\b/u.test(text) && explicitTaxBase === undefined) {
      explicitTaxBase = amount;
    }
  }
  return {
    taxBase:
      explicitTaxBase ??
      (taxBases.length > 0
        ? roundMoney(taxBases.reduce((sum, value) => sum + value, 0))
        : undefined),
    taxPercent,
    taxAmount:
      taxAmounts.length > 0
        ? roundMoney(taxAmounts.reduce((sum, value) => sum + value, 0))
        : undefined,
    surchargePercent,
    surchargeAmount:
      surchargeAmounts.length > 0
        ? roundMoney(surchargeAmounts.reduce((sum, value) => sum + value, 0))
        : undefined,
    withholdingAmount,
    total,
  };
}

function findDate(rows: readonly LocalRowV1[]): string | undefined {
  for (const row of rows.slice(0, 30)) {
    if (!/\b(?:fecha|date|emision|expedicion)\b/iu.test(row.text)) continue;
    const match = row.text.match(
      /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/u,
    );
    const normalized = match ? normalizeDate(match[1]) : undefined;
    if (normalized) return normalized;
  }
  return undefined;
}

function findInvoiceNumber(rows: readonly LocalRowV1[]): string | undefined {
  for (const row of rows.slice(0, 30)) {
    const match = row.text.match(
      /\b(?:factura|invoice|numero|num|n[ºo])\s*(?:n[ºo])?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,60})/iu,
    );
    if (match?.[1] && !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/u.test(match[1])) {
      return match[1].trim();
    }
  }
  return undefined;
}

function findSupplierTaxId(rows: readonly LocalRowV1[]): string | undefined {
  for (const row of rows.slice(0, 20)) {
    const labelIndex = row.cells.findIndex((cell) =>
      /^(?:nif|cif|vat)$/u.test(
        normalizeText(cell.text).replace(/[.:#-]+$/gu, ""),
      ),
    );
    if (labelIndex >= 0) {
      const adjacent = normalizeTaxIdCandidate(row.cells[labelIndex + 1]?.text);
      if (adjacent) return adjacent;
    }
    const match = row.text.match(
      /\b(?:nif|cif|vat)\b\s*(?:[:#|/-]\s*)?([A-Z0-9](?:[A-Z0-9 -]{5,20}[A-Z0-9]))/iu,
    );
    const embedded = normalizeTaxIdCandidate(match?.[1]);
    if (embedded) return embedded;
  }
  return undefined;
}

function normalizeTaxIdCandidate(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase().replace(/\s+/gu, "").trim();
  return /^(?=.*\d)[A-Z0-9][A-Z0-9-]{6,21}$/u.test(normalized)
    ? normalized
    : undefined;
}

function findSupplierName(rows: readonly LocalRowV1[]): string | undefined {
  for (const row of rows.slice(0, 10)) {
    const candidate = row.cells
      .map((cell) => cell.text)
      .join(" ")
      .trim();
    const normalized = normalizeText(candidate);
    if (
      candidate.length < 3 ||
      candidate.length > 300 ||
      !/\p{L}/u.test(candidate) ||
      /\b(?:factura|invoice|ticket|fecha|nif|cif|vat|cliente|receptor|direccion|calle|avenida|documento sintetico|sin valor fiscal)\b/u.test(
        normalized,
      )
    ) {
      continue;
    }
    return candidate;
  }
  return undefined;
}

function structuralArchetype(
  documentKind: ExpenseEngineDocumentKindV1,
  lines: readonly ExpenseLocalLineCandidateInputV1[],
): ExpenseEngineStructuralArchetypeV1 {
  if (documentKind === "TICKET") return "QUICK_TICKET";
  if (lines.length === 0) return "SUMMARY_ONLY";
  if (
    lines.some((line) =>
      /^(?:m2|m²|m\^2|ml|mm|cm|m)$/iu.test(line.unit?.trim() ?? ""),
    )
  ) {
    return "DIMENSION_TABLE";
  }
  return "LINE_TABLE";
}

function sourceQualityBucket(
  pages: readonly DocumentReadingPageV1[],
  rows: readonly LocalRowV1[],
): ExpenseEngineSourceQualityV1 {
  const textLength = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (textLength === 0 || rows.length === 0) return "UNREADABLE";
  if (
    rows.length >= 5 &&
    pages.some((page) => (page.layoutRows?.length ?? 0) > 0)
  ) {
    return "HIGH";
  }
  return textLength >= 80 ? "MEDIUM" : "LOW";
}

function confidenceBucket(input: {
  readonly date?: string;
  readonly totals: ParsedTotalsV1;
  readonly lines: readonly ExpenseLocalLineCandidateInputV1[];
  readonly math: readonly Readonly<ExpenseEngineMathCheckV1>[];
}): ExpenseLearningConfidenceV1 {
  if (!input.date || input.totals.total === undefined) return "LOW";
  const hasMismatch = input.math.some((check) => check.verdict === "MISMATCH");
  if (hasMismatch) return "LOW";
  const documentTotal = input.math.find(
    (check) => check.check === "DOCUMENT_TOTAL",
  );
  return input.lines.length > 0 && documentTotal?.verdict === "MATCH"
    ? "HIGH"
    : "MEDIUM";
}

function documentFormulaForTotals(
  totals: ParsedTotalsV1,
): ExpenseLearningFormulaKindV1 | undefined {
  if (totals.taxBase === undefined || totals.taxAmount === undefined)
    return undefined;
  if (
    totals.surchargeAmount !== undefined &&
    totals.withholdingAmount !== undefined
  ) {
    return "BASE_PLUS_TAX_PLUS_SURCHARGE_MINUS_WITHHOLDING";
  }
  if (totals.surchargeAmount !== undefined)
    return "BASE_PLUS_TAX_PLUS_SURCHARGE";
  if (totals.withholdingAmount !== undefined)
    return "BASE_PLUS_TAX_MINUS_WITHHOLDING";
  return "BASE_PLUS_TAX";
}

function abstained(
  reason: Parameters<
    typeof createExpenseLocalCandidateAbstainedOutcomeV1
  >[0]["reason"],
  documentKind: ExpenseEngineDocumentKindV1,
  archetype: ExpenseEngineStructuralArchetypeV1,
  quality: ExpenseEngineSourceQualityV1,
  confidence: ExpenseLearningConfidenceV1,
  math: readonly Readonly<ExpenseEngineMathCheckV1>[],
): ExpenseLocalCandidateOutcomeV1 {
  return createExpenseLocalCandidateAbstainedOutcomeV1({
    metadata: {
      structuralArchetypeId: archetype,
      documentKind,
      sourceQualityBucket: quality,
      localConfidence: confidence,
      math,
    },
    reason,
  });
}

function emptyMath(): readonly Readonly<ExpenseEngineMathCheckV1>[] {
  return reconcileExpenseEngineMathV1({});
}

function parseMoney(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\(?-?\d[\d.,\s]*\)?/u)?.[0];
  if (!match) return undefined;
  const parenthesized = match.startsWith("(") && match.endsWith(")");
  const negative = parenthesized || match.trim().startsWith("-");
  const raw = match.replace(/[()\s-]/gu, "");
  if (!raw) return undefined;
  const normalized = normalizeMoneyToken(raw);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : undefined;
}

function normalizeMoneyToken(value: string): string | undefined {
  const commaIndex = value.lastIndexOf(",");
  const dotIndex = value.lastIndexOf(".");
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const [integerPart, decimalPart, ...extra] = value.split(decimalSeparator);
    if (
      extra.length > 0 ||
      !/^\d{1,3}(?:[.,]\d{3})*$/u.test(integerPart) ||
      !/^\d{1,2}$/u.test(decimalPart) ||
      integerPart.includes(decimalSeparator) ||
      integerPart
        .split(thousandsSeparator)
        .slice(1)
        .some((group) => group.length !== 3)
    ) {
      return undefined;
    }
    return `${integerPart.replaceAll(thousandsSeparator, "")}.${decimalPart}`;
  }

  const separator = commaIndex >= 0 ? "," : dotIndex >= 0 ? "." : null;
  if (!separator) return /^\d+$/u.test(value) ? value : undefined;
  const parts = value.split(separator);
  if (parts.some((part) => !/^\d+$/u.test(part))) return undefined;
  if (parts.length === 2 && parts[1].length <= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  if (parts.length >= 2 && parts.slice(1).every((part) => part.length === 3)) {
    return parts.join("");
  }
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  return parseMoney(value);
}

function parsePercent(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/-?\d{1,3}(?:[.,]\d+)?/u)?.[0];
  if (!match) return undefined;
  const parsed = Number(match.replace(",", "."));
  return Number.isFinite(parsed) && Math.abs(parsed) <= 100
    ? parsed
    : undefined;
}

function firstPercent(value: string): number | undefined {
  const match = value.match(/(-?\d{1,3}(?:[.,]\d+)?)\s*%/u);
  return match ? parsePercent(match[1]) : undefined;
}

function lastMoney(value: string): number | undefined {
  const withoutPercentages = value.replace(/-?\d{1,3}(?:[.,]\d+)?\s*%/gu, " ");
  const matches = [...withoutPercentages.matchAll(/\(?-?\d[\d.,\s]*\)?/gu)]
    .map((match) => match[0].trim())
    .filter(Boolean);
  return parseMoney(matches.at(-1));
}

function normalizeDate(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return validIsoDate(value);
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/u);
  if (!match) return undefined;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return validIsoDate(
    `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`,
  );
}

function validIsoDate(value: string): string | undefined {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
