import { roundMoneySymmetric } from "../calculations";
import { normalizeDocumentUnitId } from "../document-units";
import { isMosquitoScreenLine } from "../expense-catalog-surface";
import type { ExpenseScanPurchaseLine } from "./schema";

const MEASUREMENT_HEADER =
  /\bref\.?\s+descripci[oó]\s+unit\.?\s+alt\s*cm\.?\s+ample\s*cm\.?\s+total\s+preu\s*€?\s+dte\.?\s+import\b/iu;

interface MeasuredRow {
  reference: string;
  description: string;
  quantity: number;
  height: number;
  width: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
}

function readRows(text: string): MeasuredRow[] {
  const rows: MeasuredRow[] = [];
  let inTable = false;
  for (const row of text.split(/\r?\n/)) {
    const value = row.trim();
    if (MEASUREMENT_HEADER.test(value)) {
      inTable = true;
      continue;
    }
    if (/^(?:base imposable|base imponible|total factura|venciment)\b/iu.test(value)) {
      inTable = false;
    }
    if (!inTable) continue;
    const match = value.match(
      /^([a-z0-9][a-z0-9.-]*)\s+(mosquiteras?\b.+?)\s+(\d+)\s+(\d+(?:[.,]\d+)?)\s+(?:[x×]\s*)?(\d+(?:[.,]\d+)?)\s+uds?\.?\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*%\s+(\d+(?:[.,]\d+)?)$/iu,
    );
    if (!match) continue;
    const [quantity, height, width, unitPrice, discountPercent, total] =
      match.slice(3).map((part) => Number(part.replace(",", ".")));
    if (
      ![quantity, height, width, unitPrice, discountPercent, total].every(Number.isFinite) ||
      quantity <= 0 || height <= 0 || width <= 0 || unitPrice <= 0 || total <= 0
    ) continue;
    rows.push({
      reference: match[1],
      description: match[2],
      quantity,
      height,
      width,
      unitPrice,
      discountPercent,
      total,
    });
  }
  return rows;
}

function key(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Recover explicit ALT/AMPLE values from the PDF's own text. Only a unique
 * match with the same reference (or full name) and billed figures may supply
 * dimensions. This never changes quantities, prices, base or VAT.
 */
export function recoverMosquitoScreenDimensionsFromPdf(
  lines: ExpenseScanPurchaseLine[],
  textRows: string,
): ExpenseScanPurchaseLine[] {
  const rows = readRows(textRows);
  if (!rows.length) return lines;
  const matches = lines.map((line) => {
    if (
      !isMosquitoScreenLine(line) ||
      (line.unit && normalizeDocumentUnitId(line.unit.replace(/\.$/, "")) !== "ud") ||
      (line.calculationBasis && line.calculationBasis !== "unit" &&
        line.calculationBasis !== "unknown")
    ) return [];
    const reference = key(line.supplierReference ?? "");
    const discount = line.discountPercent ?? 0;
    const base = line.total ??
      roundMoneySymmetric(line.quantity * line.unitPrice * (1 - discount / 100));
    return rows.filter((row) =>
      (reference ? reference === key(row.reference) : key(line.description) === key(row.description)) &&
      line.quantity === row.quantity &&
      roundMoneySymmetric(line.unitPrice - row.unitPrice) === 0 &&
      discount === row.discountPercent &&
      roundMoneySymmetric(base - row.total) === 0
    );
  });
  const rowMatches = new Map<MeasuredRow, number>();
  for (const candidates of matches) {
    for (const row of candidates) {
      rowMatches.set(row, (rowMatches.get(row) ?? 0) + 1);
    }
  }
  return lines.map((line, index) => {
    const [row] = matches[index];
    return matches[index].length === 1 && rowMatches.get(row) === 1
      ? { ...line, dimensionUnit: "cm", width: row.width, height: row.height }
      : line;
  });
}
