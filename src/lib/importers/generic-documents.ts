import { decompressSync, strFromU8, unzipSync } from "fflate";
import { roundMoney } from "../calculations";
import {
  inferCustomerTypeFromIdentity,
  looksLikeCompanyName,
} from "../customers";
import { countersFromDocuments } from "../documents";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { normalizeLoadedData } from "../storage";
import {
  buildBusinessProfileAutofillSuggestion,
  type BusinessProfileAutofillSuggestion,
} from "../business-profile-autofill";
import type {
  AppData,
  BusinessProfile,
  Client,
  Customer,
  Document,
  DocumentStatus,
  DocumentType,
  LineItem,
  Supplier,
} from "../types";

export const GENERIC_DOCUMENTS_ID_PREFIX = "generic-documents";
export const GENERIC_DOCUMENTS_SOURCE_NAME = "Documentos sueltos";
export const GENERIC_DOCUMENTS_CONFIDENCE = "lectura_documental";

type Grid = unknown[][];
type Row = Record<string, unknown>;

export type GenericDocumentFileFormat = "excel" | "word" | "pdf" | "unknown";
export type GenericDocumentKind =
  | "invoice"
  | "estimate"
  | "customers"
  | "suppliers"
  | "unknown";

export interface GenericDocumentFileSummary {
  name: string;
  format: GenericDocumentFileFormat;
  kind: GenericDocumentKind;
  rows: number;
  textLength: number;
}

export interface GenericDocumentUnsupportedItem {
  label: string;
  reason: string;
  count?: number;
}

export interface GenericDocumentTotalMismatch {
  fileName: string;
  documentNumber: string;
  expected: number;
  calculated: number;
}

export interface GenericDocumentImportPreview {
  sourceName: string;
  confidence: typeof GENERIC_DOCUMENTS_CONFIDENCE;
  files: GenericDocumentFileSummary[];
  customers: number;
  suppliers: number;
  invoices: number;
  invoiceLines: number;
  estimates: number;
  estimateLines: number;
  unsupportedFiles: number;
  totalMismatches: GenericDocumentTotalMismatch[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export interface GenericDocumentImportResult {
  data: AppData;
  preview: GenericDocumentImportPreview;
  profileSuggestion: BusinessProfileAutofillSuggestion;
  warnings: string[];
  unsupported: GenericDocumentUnsupportedItem[];
}

interface ExtractedFile {
  name: string;
  format: GenericDocumentFileFormat;
  kind: GenericDocumentKind;
  text: string;
  lines: string[];
  grids: Array<{ sheetName: string; grid: Grid }>;
}

interface ParsedDocument {
  document: Document;
  customer: Customer;
  issuer?: Partial<BusinessProfile>;
  expectedTotal: number;
}

function text(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeKey(value: unknown): string {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function genericId(kind: string, sourceKey: string): string {
  const slug = encodeURIComponent(text(sourceKey) || kind).replace(/%/g, "_");
  return `${GENERIC_DOCUMENTS_ID_PREFIX}:${kind}:${slug}`;
}

function xmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = text(value);
  if (!raw) return 0;
  const clean = raw.replace(/\s/g, "").replace(/[EUR€%]/gi, "");
  const normalized =
    clean.includes(",") && clean.includes(".")
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanNif(value: string): string {
  return value.replace(/^NIF:\s*/i, "").trim().toUpperCase();
}

function looksLikeCleanNif(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9 -]{6,13}[A-Z0-9]$/.test(value) && !/\s{2,}/.test(value);
}

function isoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 20000) {
    const date = new Date(Date.UTC(1899, 11, 30));
    date.setUTCDate(date.getUTCDate() + Math.round(value));
    return date.toISOString().slice(0, 10);
  }
  const raw = text(value);
  const numericRaw = Number(raw);
  if (Number.isFinite(numericRaw) && numericRaw > 20000) {
    const date = new Date(Date.UTC(1899, 11, 30));
    date.setUTCDate(date.getUTCDate() + Math.round(numericRaw));
    return date.toISOString().slice(0, 10);
  }
  const spanish = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (spanish) {
    return `${spanish[3]}-${spanish[2].padStart(2, "0")}-${spanish[1].padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function isoDateTime(value: unknown): string {
  return `${isoDate(value)}T00:00:00.000Z`;
}

function looksLikeCompany(value: string): boolean {
  return looksLikeCompanyName(value);
}

function splitName(displayName: string): { firstName: string; lastName: string } {
  const clean = text(displayName);
  if (!clean) return { firstName: "Cliente", lastName: "" };
  if (looksLikeCompany(clean)) return { firstName: clean, lastName: "" };
  const parts = clean.split(" ");
  return {
    firstName: parts.slice(0, 1).join(" "),
    lastName: parts.slice(1).join(" "),
  };
}

function cleanLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => text(line))
    .filter(Boolean);
}

function fileFormat(fileName: string): GenericDocumentFileFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "excel";
  if (lower.endsWith(".docx")) return "word";
  if (lower.endsWith(".pdf")) return "pdf";
  return "unknown";
}

function detectKind(name: string, lines: string[]): GenericDocumentKind {
  const haystack = normalizeKey([name, ...lines.slice(0, 20)].join(" "));
  if (haystack.includes("PROVEEDORES")) return "suppliers";
  if (haystack.includes("CLIENTES")) return "customers";
  if (haystack.includes("PRESUPUESTO")) return "estimate";
  if (haystack.includes("FACTURA")) return "invoice";
  return "unknown";
}

function columnIndexFromCellRef(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function zipText(files: Record<string, Uint8Array>, path: string): string {
  const file = files[path];
  return file ? strFromU8(file) : "";
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<(?:\w+:)?si\b[\s\S]*?<\/(?:\w+:)?si>/g)].map((match) =>
    xmlEntities(
      [...match[0].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)]
        .map((part) => part[1])
        .join(""),
    ),
  );
}

function parseWorkbookSheets(
  workbookXml: string,
  relsXml: string,
): Array<{ name: string; path: string }> {
  const rels = new Map(
    [...relsXml.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/>/g)].map((match) => {
      const attrs = match[1];
      const id = attrs.match(/\bId="([^"]+)"/)?.[1] ?? "";
      const rawTarget = attrs.match(/\bTarget="([^"]+)"/)?.[1] ?? "";
      const target = rawTarget.replace(/^\/+/, "");
      return [id, target.startsWith("xl/") ? target : `xl/${target}`];
    }),
  );
  return [...workbookXml.matchAll(/<(?:\w+:)?sheet\b([^>]*)\/>/g)].map((match) => {
    const attrs = match[1];
    const name = xmlEntities(attrs.match(/\bname="([^"]+)"/)?.[1] ?? "Hoja");
    const relId = attrs.match(/\br:id="([^"]+)"/)?.[1] ?? "";
    return { name, path: rels.get(relId) ?? "" };
  });
}

function parseCellValue(cellXml: string, type: string, sharedStrings: string[]): unknown {
  const value = xmlEntities(
    cellXml.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] ?? "",
  );
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "inlineStr") {
    return xmlEntities(
      [...cellXml.matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)]
        .map((match) => match[1])
        .join(""),
    );
  }
  if (!value) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function parseWorksheet(xml: string, sharedStrings: string[]): Grid {
  return [...xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)].map((rowMatch) => {
    const row: unknown[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)) {
      const attrs = cellMatch[1];
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] ?? "";
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
      row[columnIndexFromCellRef(ref)] = parseCellValue(cellMatch[2], type, sharedStrings);
    }
    return row;
  });
}

function extractXlsx(buffer: ArrayBuffer): Array<{ sheetName: string; grid: Grid }> {
  const files = unzipSync(new Uint8Array(buffer));
  const sharedStrings = parseSharedStrings(zipText(files, "xl/sharedStrings.xml"));
  const sheets = parseWorkbookSheets(
    zipText(files, "xl/workbook.xml"),
    zipText(files, "xl/_rels/workbook.xml.rels"),
  );
  return sheets
    .map((sheet) => ({
      sheetName: sheet.name,
      grid: parseWorksheet(zipText(files, sheet.path), sharedStrings),
    }))
    .filter((sheet) => sheet.grid.length > 0);
}

function gridToText(grid: Grid): string {
  return grid
    .map((row) => row.map((cell) => text(cell)).filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n");
}

function extractDocx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const xml = zipText(files, "word/document.xml");
  return xmlEntities(
    xml
      .replace(/<w:tab\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "\n"),
  );
}

function bytesToBinaryString(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

function binaryStringToBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
}

function ascii85Decode(value: string): Uint8Array {
  const clean = value.replace(/^<~/, "").replace(/~>$/, "").replace(/\s+/g, "");
  const bytes: number[] = [];
  let tuple: number[] = [];
  for (const char of clean) {
    if (char === "z" && tuple.length === 0) {
      bytes.push(0, 0, 0, 0);
      continue;
    }
    const code = char.charCodeAt(0);
    if (code < 33 || code > 117) continue;
    tuple.push(code - 33);
    if (tuple.length === 5) {
      let acc = 0;
      for (const item of tuple) acc = acc * 85 + item;
      bytes.push((acc >>> 24) & 0xff, (acc >>> 16) & 0xff, (acc >>> 8) & 0xff, acc & 0xff);
      tuple = [];
    }
  }
  if (tuple.length > 0) {
    const missing = 5 - tuple.length;
    tuple.push(...Array.from({ length: missing }, () => 84));
    let acc = 0;
    for (const item of tuple) acc = acc * 85 + item;
    const decoded = [(acc >>> 24) & 0xff, (acc >>> 16) & 0xff, (acc >>> 8) & 0xff, acc & 0xff];
    bytes.push(...decoded.slice(0, 4 - missing));
  }
  return Uint8Array.from(bytes);
}

function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      switch (escaped) {
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        default:
          return escaped;
      }
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    );
}

function extractPdfTextFromContent(content: string): string {
  const chunks = [...content.matchAll(/\((?:\\.|[^\\)])*\)/g)]
    .map((match) => decodePdfLiteralString(match[0].slice(1, -1)))
    .map((item) => item.trim())
    .filter((item) => item && !/^[A-Z0-9+/_-]{12,}$/.test(item));
  return chunks.join("\n");
}

function decodePdfStream(dictionary: string, stream: string): string {
  try {
    let bytes = binaryStringToBytes(stream.trim());
    if (dictionary.includes("/ASCII85Decode")) {
      bytes = ascii85Decode(bytesToBinaryString(bytes));
    }
    if (dictionary.includes("/FlateDecode")) {
      bytes = decompressSync(bytes);
    }
    return bytesToBinaryString(bytes);
  } catch {
    return stream;
  }
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const raw = bytesToBinaryString(new Uint8Array(buffer));
  const chunks: string[] = [];
  for (const match of raw.matchAll(/<<(?:.|\n|\r)*?>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g)) {
    const dictionary = match[0].slice(0, match[0].indexOf("stream"));
    const decoded = decodePdfStream(dictionary, match[1]);
    chunks.push(extractPdfTextFromContent(decoded));
  }
  if (chunks.some(Boolean)) return chunks.join("\n");
  return extractPdfTextFromContent(raw);
}

async function extractFile(file: File): Promise<ExtractedFile> {
  const format = fileFormat(file.name);
  let rawText = "";
  let grids: Array<{ sheetName: string; grid: Grid }> = [];
  if (format === "excel") {
    grids = extractXlsx(await file.arrayBuffer());
    rawText = grids.map((grid) => gridToText(grid.grid)).join("\n");
  } else if (format === "word") {
    rawText = extractDocx(await file.arrayBuffer());
  } else if (format === "pdf") {
    rawText = await extractPdf(await file.arrayBuffer());
  }
  const lines = cleanLines(rawText);
  return {
    name: file.name,
    format,
    kind: detectKind(file.name, lines),
    text: rawText,
    lines,
    grids,
  };
}

function get(row: Row | undefined, key: string): string {
  if (!row) return "";
  const direct = row[key];
  if (direct !== undefined) return text(direct);
  const normalized = normalizeHeader(key);
  const match = Object.keys(row).find((candidate) => normalizeHeader(candidate) === normalized);
  return match ? text(row[match]) : "";
}

function rowsFromGrid(grid: Grid): Row[] {
  const headerIndex = grid.findIndex((row) =>
    row.some((cell) => normalizeHeader(text(cell)) === "id") &&
    row.some((cell) => normalizeHeader(text(cell)) === "nombrefiscal"),
  );
  if (headerIndex < 0) return [];
  const headers = grid[headerIndex].map((cell) => text(cell));
  return grid
    .slice(headerIndex + 1)
    .map((row) => {
      const entry: Row = {};
      headers.forEach((header, index) => {
        if (header) entry[header] = row[index];
      });
      return entry;
    })
    .filter((row) => text(get(row, "ID")) && text(get(row, "Nombre fiscal")));
}

function contactFromRow(row: Row, kind: "customer" | "supplier"): Customer | Supplier {
  const id = get(row, "ID") || get(row, "Id");
  const name = get(row, "Nombre fiscal") || get(row, "Nombre");
  const address = get(row, "Dirección") || get(row, "Direccion");
  const now = new Date().toISOString();
  if (kind === "supplier") {
    return {
      id: genericId("supplier", id || get(row, "NIF") || name),
      name,
      nif: get(row, "NIF") || undefined,
      email: get(row, "Email") || undefined,
      phone: get(row, "Teléfono") || get(row, "Telefono") || undefined,
      address: address || undefined,
      notes: get(row, "Notas") || undefined,
      createdAt: now,
    };
  }
  const split = splitName(name);
  const nif = get(row, "NIF") || undefined;
  const customerType = inferCustomerTypeFromIdentity({
    ...split,
    name,
    nif,
  });
  return {
    id: genericId("customer", id || get(row, "NIF") || name),
    customerType,
    firstName: customerType === "company" ? name : split.firstName,
    lastName: customerType === "company" ? "" : split.lastName,
    name,
    nif,
    email: get(row, "Email") || undefined,
    phone: get(row, "Teléfono") || get(row, "Telefono") || undefined,
    address: address || undefined,
    notes: get(row, "Notas") || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function contactsFromLines(
  lines: string[],
  kind: "customer" | "supplier",
): Array<Customer | Supplier> {
  const headerIndex = lines.findIndex((line) => normalizeHeader(line) === "id");
  if (headerIndex < 0) return [];
  const rows: Row[] = [];
  let index = headerIndex + 9;
  while (index + 8 < lines.length) {
    const id = lines[index];
    if (!/^(CLI|PRO)-/i.test(id)) break;
    rows.push({
      ID: id,
      "Nombre fiscal": lines[index + 1],
      NIF: lines[index + 2],
      Email: lines[index + 3],
      "Teléfono": lines[index + 4],
      Contacto: lines[index + 5],
      "Dirección": lines[index + 6],
      Pago: lines[index + 7],
      Notas: lines[index + 8],
    });
    index += 9;
  }
  return rows.map((row) => contactFromRow(row, kind));
}

function parseContactList(file: ExtractedFile, kind: "customer" | "supplier") {
  const fromGrids = file.grids.flatMap((sheet) =>
    rowsFromGrid(sheet.grid).map((row) => contactFromRow(row, kind)),
  );
  return fromGrids.length > 0 ? fromGrids : contactsFromLines(file.lines, kind);
}

function valueAfter(lines: string[], labels: string[]): string {
  const normalizedLabels = labels.map(normalizeHeader);
  const index = lines.findIndex((line) =>
    normalizedLabels.includes(normalizeHeader(line)),
  );
  return index >= 0 ? lines[index + 1] ?? "" : "";
}

function extractTotals(lines: string[]): { base: number; iva: number; total: number } {
  return {
    base: parseAmount(valueAfter(lines, ["Base imponible"])),
    iva: parseAmount(valueAfter(lines, ["IVA"])),
    total: parseAmount(valueAfter(lines, ["Total"])),
  };
}

function parseClientFromLines(lines: string[]): Client {
  const nifIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter((entry) => /\bNIF:/i.test(entry.line));
  const clientNif = nifIndexes[1] ?? nifIndexes[0];
  const name = clientNif ? lines[clientNif.index - 1] ?? "Cliente" : "Cliente";
  const address = clientNif ? lines[clientNif.index + 1] ?? "" : "";
  const postalCity = clientNif ? lines[clientNif.index + 2] ?? "" : "";
  const email = clientNif
    ? lines.slice(clientNif.index + 1, clientNif.index + 6).find((line) => line.includes("@"))
    : undefined;
  const split = splitName(name);
  const nif = clientNif?.line.replace(/^NIF:\s*/i, "").trim();
  const customerType = inferCustomerTypeFromIdentity({
    ...split,
    name,
    nif,
  });
  return {
    customerType,
    firstName: customerType === "company" ? name : split.firstName,
    lastName: customerType === "company" ? "" : split.lastName,
    name,
    nif,
    email,
    address: [address, postalCity].filter(Boolean).join(", "),
  };
}

function parseIssuerFromLines(lines: string[]): Partial<BusinessProfile> | undefined {
  const nifEntry = lines
    .map((line, index) => ({ line, index }))
    .find((entry) => /\bNIF:/i.test(entry.line));
  if (!nifEntry) return undefined;
  const nif = cleanNif(nifEntry.line);
  if (!looksLikeCleanNif(nif)) return undefined;
  const name = lines[nifEntry.index - 1] ?? "";
  if (!name || /^(cliente|proveedor|nif|cif)$/i.test(name)) return undefined;
  const address = lines[nifEntry.index + 1] ?? "";
  const postalCity = lines[nifEntry.index + 2] ?? "";
  const email = lines.slice(nifEntry.index + 1, nifEntry.index + 6).find((line) => line.includes("@")) ?? "";
  const phone = lines
    .slice(nifEntry.index + 1, nifEntry.index + 7)
    .find((line) => /\d{3}\s?\d{3}\s?\d{3}/.test(line)) ?? "";
  const postal = postalCity.match(/\b(\d{5})\b/)?.[1] ?? "";
  const city = [
    ...new Set(
      postalCity
        .replace(/\b\d{5}\b/g, "")
        .replace(/[()]/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean),
    ),
  ].join(" ");
  return {
    name,
    nif,
    address,
    postalCode: postal,
    city,
    email,
    phone,
  };
}

function documentStatus(type: DocumentType, rawStatus: string): DocumentStatus {
  const normalized = normalizeKey(rawStatus);
  if (type === "presupuesto") {
    if (normalized.includes("ACEPT")) return "aceptado";
    if (normalized.includes("RECHAZ")) return "rechazado";
    return "enviado";
  }
  if (normalized.includes("COBR") || normalized.includes("PAG")) return "pagado";
  if (normalized.includes("BORR")) return "borrador";
  return "enviado";
}

function parseLinesFromGrid(grid: Grid): LineItem[] {
  const headerIndex = grid.findIndex((row) =>
    row.some((cell) => normalizeHeader(text(cell)) === "codigo") &&
    row.some((cell) => normalizeHeader(text(cell)) === "descripcion"),
  );
  if (headerIndex < 0) return [];
  const headers = grid[headerIndex].map((cell) => normalizeHeader(text(cell)));
  const idx = (header: string) => headers.findIndex((item) => item === normalizeHeader(header));
  const output: LineItem[] = [];
  for (const row of grid.slice(headerIndex + 1)) {
    const code = text(row[idx("Código")]);
    const description = text(row[idx("Descripción")]);
    if (!code || !description) break;
    const quantity = parseAmount(row[idx("Cantidad")]);
    const unitPrice = parseAmount(row[idx("Precio unitario")]);
    const base = parseAmount(row[idx("Base")]);
    const ivaAmount = parseAmount(row[idx("IVA")]);
    const ivaPercent = parseAmount(row[idx("IVA %")]) || (base ? roundMoney((ivaAmount / base) * 100) : 21);
    output.push({
      id: crypto.randomUUID(),
      description,
      quantity: quantity || 1,
      unitPrice: unitPrice || base || parseAmount(row[idx("Total")]),
      ivaPercent,
    });
  }
  return output;
}

function parseLinesFromSequentialText(lines: string[]): LineItem[] {
  const headerIndex = lines.findIndex((line) => normalizeHeader(line) === "codigo");
  if (headerIndex < 0) return [];
  const output: LineItem[] = [];
  let index = headerIndex + 8;
  while (index + 7 < lines.length) {
    const code = lines[index];
    if (normalizeHeader(code) === "baseimponible" || normalizeHeader(code) === "nota") break;
    const description = lines[index + 1];
    const quantity = parseAmount(lines[index + 2]) || 1;
    const unitPrice = parseAmount(lines[index + 3]);
    const base = parseAmount(lines[index + 5]);
    const ivaAmount = parseAmount(lines[index + 6]);
    const total = parseAmount(lines[index + 7]);
    if (!description || (!unitPrice && !base && !total)) break;
    output.push({
      id: crypto.randomUUID(),
      description,
      quantity,
      unitPrice: unitPrice || base || total,
      ivaPercent: base ? roundMoney((ivaAmount / base) * 100) : 21,
    });
    index += 8;
  }
  return output;
}

function documentGrid(file: ExtractedFile): Grid | null {
  return file.grids.find((sheet) =>
    sheet.grid.some((row) =>
      row.some((cell) => ["factura", "presupuesto"].some((word) => normalizeHeader(text(cell)).includes(word))),
    ),
  )?.grid ?? file.grids[0]?.grid ?? null;
}

function valueFromGridPairs(grid: Grid | null, label: string): string {
  if (!grid) return "";
  const normalized = normalizeHeader(label);
  for (const row of grid) {
    for (let index = 0; index < row.length - 1; index += 1) {
      if (normalizeHeader(text(row[index])) === normalized) {
        return text(row[index + 1]);
      }
    }
  }
  return "";
}

function clientFromGrid(grid: Grid | null, fallback: Client): Client {
  if (!grid) return fallback;
  const name = valueFromGridPairs(grid, "Cliente") || fallback.name;
  const nif = valueFromGridPairs(grid, "NIF") || fallback.nif;
  const email = valueFromGridPairs(grid, "Email") || fallback.email;
  const split = splitName(name);
  const customerType = inferCustomerTypeFromIdentity({
    ...split,
    name,
    nif,
  });
  return {
    ...fallback,
    customerType,
    firstName: customerType === "company" ? name : split.firstName,
    lastName: customerType === "company" ? "" : split.lastName,
    name,
    nif,
    email,
  };
}

function parseDocument(file: ExtractedFile): ParsedDocument | null {
  const type: DocumentType = file.kind === "estimate" ? "presupuesto" : "factura";
  const grid = documentGrid(file);
  const titleNumber = file.lines
    .find((line) => /^(Factura|Presupuesto)\s+/i.test(line))
    ?.replace(/^(Factura|Presupuesto)\s+/i, "");
  const number = titleNumber || valueFromGridPairs(grid, "Número") || valueAfter(file.lines, ["Número"]);
  if (!number) return null;
  const date = isoDate(valueFromGridPairs(grid, "Fecha") || valueAfter(file.lines, ["Fecha"]));
  const dueDate = isoDate(
    valueFromGridPairs(grid, "Vencimiento") ||
      valueAfter(file.lines, ["Vencimiento", "Válido hasta", "Valido hasta"]),
  );
  const status = documentStatus(
    type,
    valueFromGridPairs(grid, "Estado") || valueAfter(file.lines, ["Estado"]),
  );
  const paymentTerms =
    valueFromGridPairs(grid, "Forma de pago") || valueAfter(file.lines, ["Forma de pago"]);
  const fallbackClient = parseClientFromLines(file.lines);
  const client = clientFromGrid(grid, fallbackClient);
  const split = splitName(client.name);
  const customerType = inferCustomerTypeFromIdentity({
    ...split,
    name: client.name,
    nif: client.nif,
  });
  const now = new Date().toISOString();
  const customer: Customer = {
    id: genericId("customer", client.nif || client.name),
    customerType,
    firstName: customerType === "company" ? client.name : split.firstName,
    lastName: customerType === "company" ? "" : split.lastName,
    name: client.name,
    nif: client.nif,
    email: client.email,
    phone: client.phone,
    address: client.address,
    createdAt: now,
    updatedAt: now,
  };
  let items = grid ? parseLinesFromGrid(grid) : [];
  if (items.length === 0) items = parseLinesFromSequentialText(file.lines);
  const totals = extractTotals(file.lines);
  if (items.length === 0 && totals.total > 0) {
    items = [
      {
        id: crypto.randomUUID(),
        description: `Importe importado desde ${file.name}`,
        quantity: 1,
        unitPrice: totals.base || roundMoney(totals.total / 1.21),
        ivaPercent: totals.base ? roundMoney((totals.iva / totals.base) * 100) : 21,
      },
    ];
  }
  const issuer = parseIssuerFromLines(file.lines);
  const document: Document = {
    id: genericId(type, number),
    type,
    number,
    date,
    dueDate,
    customerId: customer.id,
    client,
    items,
    paymentTerms: paymentTerms || undefined,
    status,
    issuer: issuer
      ? captureIssuerSnapshot(
          {
            name: issuer.name ?? "",
            nif: issuer.nif ?? "",
            address: issuer.address ?? "",
            city: issuer.city ?? "",
            postalCode: issuer.postalCode ?? "",
            phone: issuer.phone ?? "",
            email: issuer.email ?? "",
          } as BusinessProfile,
        )
      : undefined,
    createdAt: isoDateTime(date),
    updatedAt: now,
  };
  return { document, customer, issuer, expectedTotal: totals.total };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function minMaxDates(documents: Document[]): { from: string | null; to: string | null } {
  const dates = documents.map((document) => document.date).filter(Boolean).sort();
  return {
    from: dates[0] ?? null,
    to: dates.at(-1) ?? null,
  };
}

function calculatedDocumentTotal(document: Document): number {
  return roundMoney(
    document.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (1 + item.ivaPercent / 100),
      0,
    ),
  );
}

export async function readGenericDocumentFiles(
  files: File[],
  current: AppData,
): Promise<GenericDocumentImportResult> {
  if (files.length === 0) {
    throw new Error("Selecciona al menos un Excel, Word o PDF.");
  }

  const extracted = await Promise.all(files.map(extractFile));
  const parsedDocuments = extracted
    .filter((file) => file.kind === "invoice" || file.kind === "estimate")
    .map(parseDocument)
    .filter((item): item is ParsedDocument => Boolean(item));
  const importedDocuments = parsedDocuments.map((item) => item.document);
  const importedCustomers = uniqueById([
    ...extracted
      .filter((file) => file.kind === "customers")
      .flatMap((file) => parseContactList(file, "customer") as Customer[]),
    ...parsedDocuments.map((item) => item.customer),
  ]);
  const importedSuppliers = uniqueById(
    extracted
      .filter((file) => file.kind === "suppliers")
      .flatMap((file) => parseContactList(file, "supplier") as Supplier[]),
  );
  const keptDocuments = current.documents.filter(
    (document) => !document.id.startsWith(`${GENERIC_DOCUMENTS_ID_PREFIX}:`),
  );
  const keptCustomers = current.customers.filter(
    (customer) => !customer.id.startsWith(`${GENERIC_DOCUMENTS_ID_PREFIX}:`),
  );
  const keptSuppliers = current.suppliers.filter(
    (supplier) => !supplier.id.startsWith(`${GENERIC_DOCUMENTS_ID_PREFIX}:`),
  );
  const nextDocuments = [...keptDocuments, ...importedDocuments];
  const nextProfile = current.profile;
  const data = normalizeLoadedData(
    {
      ...current,
      customers: [...keptCustomers, ...importedCustomers],
      suppliers: [...keptSuppliers, ...importedSuppliers],
      documents: nextDocuments,
      counters: countersFromDocuments(
        nextDocuments,
        nextProfile.numbering.year,
        nextProfile.numbering,
      ),
    },
    {
      legacyBackfillDocumentIds: new Set(
        importedDocuments.map((document) => document.id),
      ),
    },
  );

  const firstIssuer = parsedDocuments.find((item) => item.issuer)?.issuer;
  const detectedProfile = firstIssuer
    ? {
        ...current.profile,
        ...Object.fromEntries(
          Object.entries(firstIssuer).filter(([, value]) => text(value)),
        ),
      }
    : current.profile;
  const profileSuggestion = firstIssuer
    ? buildBusinessProfileAutofillSuggestion(
        current.profile,
        detectedProfile,
      )
    : {
        fields: [],
        missingIvaRates: [],
        currentIvaRates: current.profile.iva.rates,
        detectedIvaRates: current.profile.iva.rates,
        emptyFieldCount: 0,
        differentCurrentValueCount: 0,
      };
  const totalMismatches = parsedDocuments
    .map((item) => ({
      fileName: extracted.find((file) => file.text.includes(item.document.number))?.name ?? item.document.number,
      documentNumber: item.document.number,
      expected: item.expectedTotal,
      calculated: calculatedDocumentTotal(item.document),
    }))
    .filter((item) => item.expected > 0 && Math.abs(item.expected - item.calculated) > 0.02);

  const unsupportedFiles = extracted.filter(
    (file) => file.kind === "unknown" || file.text.trim().length === 0,
  ).length;
  const preview: GenericDocumentImportPreview = {
    sourceName: GENERIC_DOCUMENTS_SOURCE_NAME,
    confidence: GENERIC_DOCUMENTS_CONFIDENCE,
    files: extracted.map((file) => ({
      name: file.name,
      format: file.format,
      kind: file.kind,
      rows: file.grids.reduce((sum, sheet) => sum + sheet.grid.length, 0),
      textLength: file.text.trim().length,
    })),
    customers: importedCustomers.length,
    suppliers: importedSuppliers.length,
    invoices: importedDocuments.filter((document) => document.type === "factura").length,
    invoiceLines: importedDocuments
      .filter((document) => document.type === "factura")
      .reduce((sum, document) => sum + document.items.length, 0),
    estimates: importedDocuments.filter((document) => document.type === "presupuesto").length,
    estimateLines: importedDocuments
      .filter((document) => document.type === "presupuesto")
      .reduce((sum, document) => sum + document.items.length, 0),
    unsupportedFiles,
    totalMismatches,
    dateRange: minMaxDates(importedDocuments),
  };

  const warnings: string[] = [];
  if (unsupportedFiles > 0) {
    warnings.push(
      `${unsupportedFiles} archivo(s) no se han podido clasificar como factura, presupuesto, cliente o proveedor.`,
    );
  }
  if (totalMismatches.length > 0) {
    warnings.push(
      `${totalMismatches.length} documento(s) tienen totales que no cuadran exactamente al recalcular las lineas.`,
    );
  }
  if (extracted.some((file) => file.format === "pdf")) {
    warnings.push(
      "Los PDF se leen por texto extraido. Revisa la previsualizacion: si el PDF es una imagen escaneada puede hacer falta IA/OCR.",
    );
  }

  const unsupported: GenericDocumentUnsupportedItem[] = [
    {
      label: "Adjuntos y documento visual original",
      reason:
        "La app importa los datos detectados, pero todavia no guarda el PDF, Word o Excel original como adjunto historico.",
      count: files.length,
    },
    {
      label: "Maquetacion y firmas",
      reason:
        "No se importan estilos, firmas, sellos, imagenes ni apariencia visual del documento original.",
    },
    {
      label: "PDF escaneado como imagen",
      reason:
        "Si el PDF no trae texto seleccionable, esta pasada determinista no puede leerlo. En ese caso conviene usar la revision con IA/OCR.",
      count: extracted.filter((file) => file.format === "pdf" && !file.text.trim()).length || undefined,
    },
  ].filter((item) => item.count !== 0);

  return { data, preview, profileSuggestion, warnings, unsupported };
}
