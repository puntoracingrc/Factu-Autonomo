import type { ExpenseScanPurchaseLine } from "./schema";

interface PdfTextItem {
  page: number;
  x: number;
  y: number;
  text: string;
}

interface ExtractedPdfLines {
  lines: ExpenseScanPurchaseLine[];
  warnings: string[];
}

interface PdfScanHints {
  textRows: string;
  stilCondal: ExtractedPdfLines;
  debug: {
    itemCount: number;
    rowCount: number;
    error?: string;
  };
}

const ROW_Y_TOLERANCE = 0.18;
const MAX_EXTRACTED_LINES = 50;
const MAX_TEXT_HINT_CHARS = 18000;
const PDFJS_X_SCALE = 20.6;
const PDFJS_Y_SCALE = 16.1;

type PdfjsWorkerGlobal = typeof globalThis & {
  pdfjsWorker?: unknown;
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseDecimal(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^-?\d+(?:\.\d*)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupRows(items: PdfTextItem[]): PdfTextItem[][] {
  const rows: PdfTextItem[][] = [];
  const byPage = new Map<number, PdfTextItem[]>();

  for (const item of items) {
    const pageItems = byPage.get(item.page) ?? [];
    pageItems.push(item);
    byPage.set(item.page, pageItems);
  }

  for (const pageItems of [...byPage.entries()].sort(([a], [b]) => a - b)) {
    const sorted = pageItems[1].sort((a, b) => a.y - b.y || a.x - b.x);
    const pageRows: Array<{ y: number; items: PdfTextItem[] }> = [];

    for (const item of sorted) {
      const row = pageRows.at(-1);
      if (!row || Math.abs(item.y - row.y) > ROW_Y_TOLERANCE) {
        pageRows.push({ y: item.y, items: [item] });
        continue;
      }

      row.items.push(item);
      row.y =
        row.items.reduce((sum, rowItem) => sum + rowItem.y, 0) /
        row.items.length;
    }

    rows.push(
      ...pageRows.map((row) => row.items.sort((a, b) => a.x - b.x)),
    );
  }

  return rows;
}

function rowText(row: PdfTextItem[]): string {
  return cleanText(row.map((item) => item.text).join(" "));
}

function rowY(row: PdfTextItem[]): number {
  if (row.length === 0) return 0;
  return row.reduce((sum, item) => sum + item.y, 0) / row.length;
}

function rowPage(row: PdfTextItem[]): number | undefined {
  return row[0]?.page;
}

function looksLikeNumberFragment(value: string): boolean {
  return /^-?\d[\d.\s]*(?:,\d*)?$/.test(value.trim());
}

function numericItemsFromRow(row: PdfTextItem[]): PdfTextItem[] {
  return row
    .filter((item) => item.x > 8 && looksLikeNumberFragment(item.text))
    .sort((a, b) => a.x - b.x);
}

function numericValuesFromRow(row: PdfTextItem[]): number[] {
  const values: string[] = [];
  for (const item of numericItemsFromRow(row)) {
    const text = item.text.trim();
    const previous = values.at(-1);
    if (previous?.endsWith(",")) {
      values[values.length - 1] = `${previous}${text}`;
    } else {
      values.push(text);
    }
  }

  return values
    .map(parseDecimal)
    .filter((value): value is number => value !== undefined);
}

function descriptionFromRow(row: PdfTextItem[], firstNumericX: number): string {
  return cleanText(
    row
      .filter((item) => item.x >= 2.5 && item.x < firstNumericX)
      .map((item) => item.text)
      .join(" "),
  );
}

function isLikelyStilCondalDocument(rows: PdfTextItem[][]): boolean {
  const text = rows.map(rowText).join("\n");
  return /STIL\s+CONDAL/i.test(text) && /Factura\s+n/i.test(text);
}

function parseLineRow(row: PdfTextItem[]): ExpenseScanPurchaseLine | null {
  const first = row.find((item) => item.text.trim());
  const supplierReference = first?.text.trim();
  if (!supplierReference || !/^[A-Z0-9][A-Z0-9.-]{2,}$/i.test(supplierReference)) {
    return null;
  }
  if ((first?.x ?? 99) > 2.5) return null;

  const numbers = numericValuesFromRow(row);
  const firstNumericX = numericItemsFromRow(row)[0]?.x ?? 20;
  const quantity = numbers[0] ?? 1;
  const width = numbers.length >= 7 ? numbers[1] : undefined;
  const height = numbers.length >= 8 ? numbers[2] : undefined;
  const area =
    numbers.length >= 8 ? numbers[3] : numbers.length >= 7 ? numbers[2] : undefined;
  const unitPrice =
    numbers.length >= 8
      ? numbers[4]
      : numbers.length >= 7
        ? numbers[3]
        : numbers.length >= 5
          ? numbers[2]
          : numbers[1];
  const discountPercent =
    numbers.length >= 8
      ? numbers[5]
      : numbers.length >= 7
        ? numbers[4]
        : undefined;
  const netPrice =
    numbers.length >= 8
      ? numbers[6]
      : numbers.length >= 7
        ? numbers[5]
        : numbers.length >= 5
          ? numbers[3]
          : undefined;
  const total = numbers.at(-1);
  if (total === undefined && unitPrice === undefined && netPrice === undefined) {
    return null;
  }

  const hasAreaDimensions =
    width !== undefined && height !== undefined && area !== undefined;
  const effectiveQuantity = hasAreaDimensions ? area : quantity;
  const fallbackUnitPrice =
    total !== undefined && effectiveQuantity !== 0
      ? roundMoney(total / effectiveQuantity)
      : 0;
  const description = descriptionFromRow(row, firstNumericX);

  return {
    supplierReference,
    description: description || supplierReference,
    quantity: effectiveQuantity,
    unit: hasAreaDimensions ? "M2" : "ud",
    unitPrice: unitPrice ?? netPrice ?? fallbackUnitPrice,
    discountPercent,
    total,
  };
}

function isContinuationRow(row: PdfTextItem[]): boolean {
  const text = rowText(row);
  if (!text) return false;
  if (/^(IMPORTE|TOTAL FACTURA|SIN DOMICILIACI)/i.test(text)) return false;
  if (/Factura\s+n|Artículo|NIF|FACTURA|STIL\s+CONDAL/i.test(text)) {
    return false;
  }
  return row.every((item) => item.x < 20);
}

function canAttachContinuation(
  previousRow: PdfTextItem[] | null,
  continuationRow: PdfTextItem[],
): boolean {
  if (!previousRow) return false;
  if (rowPage(previousRow) !== rowPage(continuationRow)) return false;

  const distance = rowY(continuationRow) - rowY(previousRow);
  return distance > 0 && distance <= 1.2;
}

export function extractStilCondalPurchaseLinesFromPdfItems(
  items: PdfTextItem[],
): ExtractedPdfLines {
  const rows = groupRows(items);
  if (!isLikelyStilCondalDocument(rows)) return { lines: [], warnings: [] };

  const lines: ExpenseScanPurchaseLine[] = [];
  const warnings: string[] = [];
  let inTable = false;
  let previousLineRow: PdfTextItem[] | null = null;

  for (const row of rows) {
    const text = rowText(row);
    if (/Artículo/i.test(text) && /Importe/i.test(text)) {
      inTable = true;
      previousLineRow = null;
      continue;
    }
    if (!inTable) continue;
    if (/^(IMPORTE|TOTAL FACTURA)/i.test(text)) {
      inTable = false;
      previousLineRow = null;
      continue;
    }

    const line = parseLineRow(row);
    if (line) {
      lines.push(line);
      previousLineRow = row;
      continue;
    }

    const previous = lines.at(-1);
    if (
      previous &&
      isContinuationRow(row) &&
      canAttachContinuation(previousLineRow, row)
    ) {
      previous.description = cleanText(`${previous.description} ${text}`);
      previousLineRow = row;
    }
  }

  if (lines.length > MAX_EXTRACTED_LINES) {
    warnings.push(
      `El PDF contiene ${lines.length} líneas de compra; se han cargado las primeras ${MAX_EXTRACTED_LINES}.`,
    );
  }

  return { lines: lines.slice(0, MAX_EXTRACTED_LINES), warnings };
}

export function extractPdfScanHintsFromPdfItems(
  items: PdfTextItem[],
): PdfScanHints {
  const rows = groupRows(items);
  const textRows = rows
    .map(rowText)
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_TEXT_HINT_CHARS);

  return {
    textRows,
    stilCondal: extractStilCondalPurchaseLinesFromPdfItems(items),
    debug: {
      itemCount: items.length,
      rowCount: rows.length,
    },
  };
}

export async function extractPdfScanHintsFromPdfBase64(
  base64: string,
): Promise<PdfScanHints> {
  const empty: PdfScanHints = {
    textRows: "",
    stilCondal: { lines: [], warnings: [] },
    debug: { itemCount: 0, rowCount: 0 },
  };
  const items: PdfTextItem[] = [];

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as PdfjsWorkerGlobal).pdfjsWorker ??= pdfjsWorker;
    const data = new Uint8Array(Buffer.from(base64, "base64"));
    const document = await pdfjs.getDocument({
      data,
      isEvalSupported: false,
    }).promise;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const transform = item.transform;
        const x = Number(transform[4]);
        const y = Number(transform[5]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        items.push({
          page: pageNumber,
          x: x / PDFJS_X_SCALE,
          y: (viewport.height - y) / PDFJS_Y_SCALE,
          text: item.str,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[expense-scan] PDF text extraction failed", message);
    return {
      ...empty,
      debug: { ...empty.debug, error: message },
    };
  }

  return extractPdfScanHintsFromPdfItems(items);
}
