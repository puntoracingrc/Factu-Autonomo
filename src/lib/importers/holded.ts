import { strFromU8, unzipSync } from "fflate";
import { roundMoney } from "../calculations";
import { countersFromDocuments } from "../documents";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { normalizeLoadedData } from "../storage";
import type { BusinessProfileAutofillSuggestion } from "../business-profile-autofill";
import type {
  AppData,
  BusinessProfile,
  Client,
  Customer,
  Document,
  DocumentStatus,
  Expense,
  LineItem,
  Supplier,
} from "../types";

export const HOLDED_ID_PREFIX = "holded";
export const HOLDED_SOURCE_NAME = "Holded";
export const HOLDED_CONFIDENCE = "fixture_inferido";

type Row = Record<string, unknown>;

export type HoldedSheetKind =
  | "readme"
  | "sources"
  | "contacts"
  | "products"
  | "invoices"
  | "invoiceLines"
  | "purchases"
  | "purchaseLines"
  | "estimates"
  | "estimateLines"
  | "attachments"
  | "fieldMap";

export interface HoldedInputSheet {
  name: string;
  kind: HoldedSheetKind;
  rows: Row[];
}

export interface HoldedSheetSummary {
  name: string;
  kind: HoldedSheetKind;
  rows: number;
}

export interface HoldedUnsupportedItem {
  label: string;
  reason: string;
  count?: number;
}

export interface HoldedTotalMismatch {
  documentNumber: string;
  expected: number;
  calculated: number;
}

export interface HoldedImportPreview {
  sourceName: string;
  confidence: typeof HOLDED_CONFIDENCE;
  sheets: HoldedSheetSummary[];
  customers: number;
  suppliers: number;
  mixedRoleContacts: number;
  productsRead: number;
  productsUsedForLines: number;
  invoices: number;
  invoiceLines: number;
  estimates: number;
  estimateLines: number;
  expenses: number;
  expenseLines: number;
  attachments: number;
  totalMismatches: HoldedTotalMismatch[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export interface HoldedImportResult {
  data: AppData;
  preview: HoldedImportPreview;
  profileSuggestion: BusinessProfileAutofillSuggestion;
  warnings: string[];
  unsupported: HoldedUnsupportedItem[];
}

interface ParsedContact {
  sourceKey: string;
  customer?: Customer;
  supplier?: Supplier;
}

interface ParsedProduct {
  sourceKey: string;
  sku: string;
  name: string;
  description?: string;
  saleIvaPercent?: number;
  purchaseIvaPercent?: number;
}

const EXPECTED_SHEETS: Array<{ name: string; kind: HoldedSheetKind }> = [
  { name: "README", kind: "readme" },
  { name: "Fuentes", kind: "sources" },
  { name: "Contactos", kind: "contacts" },
  { name: "Productos", kind: "products" },
  { name: "Facturas", kind: "invoices" },
  { name: "Lineas factura", kind: "invoiceLines" },
  { name: "Gastos compras", kind: "purchases" },
  { name: "Lineas gasto", kind: "purchaseLines" },
  { name: "Presupuestos", kind: "estimates" },
  { name: "Lineas presupuesto", kind: "estimateLines" },
  { name: "Adjuntos", kind: "attachments" },
  { name: "Mapa campos", kind: "fieldMap" },
];

function text(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function memo(value: unknown): string {
  return String(value ?? "").trim();
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

function get(row: Row | undefined, key: string): string {
  if (!row) return "";
  const direct = row[key];
  if (direct !== undefined) return text(direct);
  const normalized = normalizeHeader(key);
  const match = Object.keys(row).find((candidate) => normalizeHeader(candidate) === normalized);
  return match ? text(row[match]) : "";
}

function getMemo(row: Row | undefined, key: string): string {
  if (!row) return "";
  const direct = row[key];
  if (direct !== undefined) return memo(direct);
  const normalized = normalizeHeader(key);
  const match = Object.keys(row).find((candidate) => normalizeHeader(candidate) === normalized);
  return match ? memo(row[match]) : "";
}

function holdedId(kind: string, sourceKey: string): string {
  const slug = encodeURIComponent(text(sourceKey) || kind).replace(/%/g, "_");
  return `${HOLDED_ID_PREFIX}:${kind}:${slug}`;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = text(value);
  if (!raw) return 0;
  const clean = raw.replace(/\s/g, "").replace(/[€%]/g, "");
  const normalized =
    clean.includes(",") && clean.includes(".")
      ? clean.replace(/\./g, "").replace(",", ".")
      : clean.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return `${isoDate(value)}T00:00:00.000Z`;
}

function splitName(displayName: string): { firstName: string; lastName: string } {
  const clean = text(displayName);
  if (!clean) return { firstName: "Cliente", lastName: "" };
  if (/\b(S\.?L\.?|S\.?A\.?|SCP|CB|C\.B\.|COMUNIDAD|ASOCIACI[OÓ]N)\b/i.test(clean)) {
    return { firstName: clean, lastName: "" };
  }
  const parts = clean.split(" ");
  return {
    firstName: parts.slice(0, 1).join(" "),
    lastName: parts.slice(1).join(" "),
  };
}

function rowHasAny(row: Row, keys: string[]): boolean {
  return keys.some((key) => get(row, key));
}

function rowsFromGrid(grid: unknown[][]): Row[] {
  const [headerRow, ...bodyRows] = grid;
  const headers = (headerRow ?? []).map((cell) => text(cell));
  return bodyRows
    .map((row) => {
      const entry: Row = {};
      headers.forEach((header, index) => {
        if (header) entry[header] = row[index];
      });
      return entry;
    })
    .filter((row) => Object.values(row).some((value) => text(value)));
}

function xmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function columnIndexFromCellRef(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function zipText(files: Record<string, Uint8Array>, path: string): string {
  const file = files[path];
  return file ? strFromU8(file) : "";
}

function extractAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attributes[match[1]] = xmlEntities(match[2]);
  }
  return attributes;
}

function extractTagText(xml: string, tag: string): string[] {
  const values: string[] = [];
  const tagName = `(?:[\\w.-]+:)?${tag}`;
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "g");
  for (const match of xml.matchAll(pattern)) values.push(xmlEntities(match[1].replace(/<[^>]+>/g, "")));
  return values;
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<(?:[\w.-]+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?si>/g)].map((match) =>
    extractTagText(match[1], "t").join(""),
  );
}

function parseWorkbookSheets(workbookXml: string, relsXml: string): Array<{ name: string; path: string }> {
  const relTargets = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = extractAttributes(match[1]);
    if (!attrs.Id || !attrs.Target) continue;
    const normalizedTarget = attrs.Target.startsWith("/")
      ? attrs.Target.slice(1)
      : `xl/${attrs.Target.replace(/^\.\.\//, "")}`;
    relTargets.set(attrs.Id, normalizedTarget.replace(/\/+/g, "/"));
  }
  const sheets: Array<{ name: string; path: string }> = [];
  for (const match of workbookXml.matchAll(/<(?:[\w.-]+:)?sheet\b([^>]*)\/?>/g)) {
    const attrs = extractAttributes(match[1]);
    const relId = attrs["r:id"];
    const path = relId ? relTargets.get(relId) : undefined;
    if (attrs.name && path) sheets.push({ name: attrs.name, path });
  }
  return sheets;
}

function parseCellValue(cellXml: string, type: string, sharedStrings: string[]): unknown {
  if (type === "inlineStr") {
    return extractTagText(cellXml, "t").join("");
  }
  const value = cellXml.match(/<(?:[\w.-]+:)?v>([\s\S]*?)<\/(?:[\w.-]+:)?v>/)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "b") return value === "1";
  const numeric = Number(value);
  if (value !== "" && Number.isFinite(numeric)) return numeric;
  return xmlEntities(value);
}

function parseWorksheet(xml: string, sharedStrings: string[]): unknown[][] {
  const rows: unknown[][] = [];
  for (const rowMatch of xml.matchAll(/<(?:[\w.-]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?row>/g)) {
    const row: unknown[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<(?:[\w.-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?c>/g)) {
      const attrs = extractAttributes(cellMatch[1]);
      const index = columnIndexFromCellRef(attrs.r ?? "A1");
      row[index] = parseCellValue(cellMatch[2], attrs.t ?? "", sharedStrings);
    }
    rows.push(row);
  }
  return rows;
}

export function parseHoldedWorkbookBuffer(buffer: ArrayBuffer): HoldedInputSheet[] {
  const files = unzipSync(new Uint8Array(buffer));
  const sharedStrings = parseSharedStrings(zipText(files, "xl/sharedStrings.xml"));
  const workbookSheets = parseWorkbookSheets(
    zipText(files, "xl/workbook.xml"),
    zipText(files, "xl/_rels/workbook.xml.rels"),
  );
  const expectedByName = new Map(
    EXPECTED_SHEETS.map((sheet) => [normalizeHeader(sheet.name), sheet]),
  );

  return workbookSheets.flatMap((sheet) => {
    const expected = expectedByName.get(normalizeHeader(sheet.name));
    if (!expected) return [];
    const xml = zipText(files, sheet.path);
    if (!xml) return [];
    return [
      {
        name: sheet.name,
        kind: expected.kind,
        rows: rowsFromGrid(parseWorksheet(xml, sharedStrings)),
      },
    ];
  });
}

function parseContact(row: Row, index: number): ParsedContact | null {
  if (!rowHasAny(row, ["contact_id", "nombre", "nif", "email", "telefono"])) return null;
  const sourceKey = get(row, "contact_id") || get(row, "nif") || `contacto-${index + 1}`;
  const role = normalizeKey(get(row, "tipo_contacto"));
  const name = get(row, "nombre_comercial") || get(row, "nombre") || "Contacto Holded";
  const now = new Date().toISOString();
  const common = {
    nif: get(row, "nif") || undefined,
    email: get(row, "email") || undefined,
    phone: get(row, "telefono") || undefined,
    address: get(row, "direccion") || undefined,
    city: get(row, "ciudad") || undefined,
    postalCode: get(row, "codigo_postal") || undefined,
    notes: [getMemo(row, "notas"), get(row, "etiquetas") ? `Etiquetas Holded: ${get(row, "etiquetas")}` : ""]
      .filter(Boolean)
      .join("\n") || undefined,
  };
  const { firstName, lastName } = splitName(name);
  const isSupplier = role.includes("PROVEEDOR");
  const isCustomer = role.includes("CLIENTE") || !isSupplier;

  return {
    sourceKey,
    customer: isCustomer
      ? {
          id: holdedId("customer", sourceKey),
          firstName,
          lastName,
          name,
          ...common,
          createdAt: now,
          updatedAt: now,
        }
      : undefined,
    supplier: isSupplier
      ? {
          id: holdedId("supplier", sourceKey),
          name,
          website: undefined,
          category: get(row, "etiquetas") || undefined,
          ...common,
          createdAt: now,
        }
      : undefined,
  };
}

function parseProduct(row: Row): ParsedProduct | null {
  const sourceKey = get(row, "product_id") || get(row, "sku");
  const name = get(row, "nombre");
  if (!sourceKey && !name) return null;
  return {
    sourceKey: sourceKey || name,
    sku: get(row, "sku"),
    name: name || get(row, "sku") || "Producto Holded",
    description: getMemo(row, "descripcion") || undefined,
    saleIvaPercent: parseAmount(get(row, "impuesto_venta")),
    purchaseIvaPercent: parseAmount(get(row, "impuesto_compra")),
  };
}

function clientFromCustomer(customer: Customer): Client {
  const address = [
    customer.address,
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    name: customer.name,
    nif: customer.nif,
    email: customer.email,
    phone: customer.phone,
    address: address || undefined,
  };
}

function clientFromDocumentRow(row: Row, customersById: Map<string, Customer>): {
  customerId?: string;
  client: Client;
} {
  const customer = customersById.get(get(row, "cliente_contact_id"));
  if (customer) return { customerId: customer.id, client: clientFromCustomer(customer) };
  const displayName = get(row, "cliente_nombre") || "Cliente Holded";
  const split = splitName(displayName);
  return {
    client: {
      ...split,
      name: displayName,
      nif: get(row, "cliente_nif") || undefined,
    },
  };
}

function statusFromInvoice(row: Row): DocumentStatus {
  const status = normalizeKey(get(row, "estado"));
  if (status.includes("PARCIAL")) return "enviado";
  if (status.includes("COBRADA")) return "pagado";
  if (status.includes("ANUL")) return "anulada";
  if (status.includes("BORR")) return "borrador";
  return "enviado";
}

function statusFromEstimate(row: Row): DocumentStatus {
  const status = normalizeKey(get(row, "estado"));
  if (status.includes("ACEPT")) return "aceptado";
  if (status.includes("RECH")) return "rechazado";
  if (status.includes("BORR")) return "borrador";
  return "enviado";
}

function lineFromHoldedRow(row: Row, index: number, documentKey: string): LineItem | null {
  const quantity = parseAmount(get(row, "cantidad"));
  const baseLine = parseAmount(get(row, "base_linea"));
  const unitPrice = parseAmount(get(row, "precio_unitario"));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const discountedUnitPrice = baseLine > 0 ? roundMoney(baseLine / quantity) : unitPrice;
  return {
    id: holdedId("line", `${documentKey}-${get(row, "linea") || index + 1}`),
    description: getMemo(row, "descripcion") || "Concepto importado de Holded",
    quantity,
    unitPrice: discountedUnitPrice,
    ivaPercent: parseAmount(get(row, "impuesto_pct")),
  };
}

function fallbackDocumentLine(row: Row, profile: BusinessProfile, label: string): LineItem {
  const base = parseAmount(get(row, "base_imponible"));
  const iva = parseAmount(get(row, "iva_total"));
  return {
    id: holdedId("line", `${get(row, "numero") || label}-resumen`),
    description: label,
    quantity: 1,
    unitPrice: base || parseAmount(get(row, "total")),
    ivaPercent: base > 0 ? roundMoney((iva / base) * 100) : profile.iva.defaultRate,
  };
}

function documentTotalFromLines(items: LineItem[]): number {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice * (1 + item.ivaPercent / 100),
      0,
    ),
  );
}

function buildDocument(input: {
  row: Row;
  type: "factura" | "presupuesto";
  lines: Row[];
  customersById: Map<string, Customer>;
  profile: BusinessProfile;
}): { document: Document; lineCount: number; usedProductKeys: string[]; mismatch?: HoldedTotalMismatch } {
  const { row, type, lines, customersById, profile } = input;
  const sourceKey = get(row, type === "factura" ? "invoice_id" : "estimate_id") || get(row, "numero");
  const number = get(row, "numero") || sourceKey;
  const date = isoDate(get(row, "fecha"));
  const createdAt = isoDateTime(get(row, "fecha"));
  const status = type === "factura" ? statusFromInvoice(row) : statusFromEstimate(row);
  const clientInfo = clientFromDocumentRow(row, customersById);
  const usedProductKeys: string[] = [];
  const items = lines
    .map((line, index) => {
      const productKey = get(line, "product_id") || get(line, "sku");
      if (productKey) usedProductKeys.push(productKey);
      return lineFromHoldedRow(line, index, sourceKey);
    })
    .filter((line): line is LineItem => Boolean(line));
  const finalItems = items.length > 0 ? items : [fallbackDocumentLine(row, profile, `${type} importado de Holded`)];
  const expected = parseAmount(get(row, "total"));
  const calculated = documentTotalFromLines(finalItems);
  const mismatch =
    expected > 0 && Math.abs(expected - calculated) > 0.02
      ? { documentNumber: number, expected, calculated }
      : undefined;

  return {
    lineCount: finalItems.length,
    usedProductKeys,
    mismatch,
    document: {
      id: holdedId(type, sourceKey),
      type,
      number,
      date,
      dueDate:
        type === "factura"
          ? get(row, "vencimiento")
            ? isoDate(get(row, "vencimiento"))
            : undefined
          : get(row, "valido_hasta")
            ? isoDate(get(row, "valido_hasta"))
            : undefined,
      customerId: clientInfo.customerId,
      client: clientInfo.client,
      items: finalItems,
      notes: [
        getMemo(row, "notas"),
        type === "presupuesto" && get(row, "convertido_en_factura")
          ? `Convertido en factura en Holded: ${get(row, "convertido_en_factura")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n") || undefined,
      paymentTerms: get(row, "metodo_pago") || undefined,
      status,
      issuer: status === "borrador" ? undefined : captureIssuerSnapshot(profile, createdAt),
      documentLifecycle: status === "borrador" ? "draft" : "issued",
      integrityLock: status === "borrador" ? "unlocked" : "locked",
      deliveryStatus: "not_sent",
      paymentStatus:
        type === "factura" ? (status === "pagado" ? "paid" : "pending") : "not_applicable",
      acceptanceStatus:
        type === "presupuesto"
          ? status === "aceptado"
            ? "accepted"
            : status === "rechazado"
              ? "rejected"
              : "pending"
          : "not_applicable",
      issuedAt: status === "borrador" ? undefined : createdAt,
      createdAt,
      updatedAt: createdAt,
    },
  };
}

function supplierFromPurchaseRow(row: Row, suppliersById: Map<string, Supplier>): Supplier | undefined {
  return suppliersById.get(get(row, "proveedor_contact_id"));
}

function buildExpense(row: Row, index: number, suppliersById: Map<string, Supplier>, lines: Row[]): {
  expense: Expense;
  lineCount: number;
  usedProductKeys: string[];
  mismatch?: HoldedTotalMismatch;
} {
  const sourceKey = get(row, "purchase_id") || get(row, "numero") || `purchase-${index + 1}`;
  const supplier = supplierFromPurchaseRow(row, suppliersById);
  const usedProductKeys: string[] = [];
  const lineBaseTotal = lines.reduce((sum, line) => {
    const productKey = get(line, "product_id") || get(line, "sku");
    if (productKey) usedProductKeys.push(productKey);
    return sum + parseAmount(get(line, "base_linea"));
  }, 0);
  const base = lineBaseTotal > 0 ? roundMoney(lineBaseTotal) : parseAmount(get(row, "base_imponible"));
  const iva = parseAmount(get(row, "iva_total"));
  const expected = parseAmount(get(row, "total"));
  const calculated = roundMoney(base + iva);
  return {
    lineCount: Math.max(lines.length, 1),
    usedProductKeys,
    mismatch:
      expected > 0 && Math.abs(expected - calculated) > 0.02
        ? { documentNumber: get(row, "numero") || sourceKey, expected, calculated }
        : undefined,
    expense: {
      id: holdedId("expense", sourceKey),
      date: isoDate(get(row, "fecha")),
      origin: "import",
      businessKind: "purchase_invoice",
      supplierId: supplier?.id,
      supplierName: supplier?.name || get(row, "proveedor_nombre") || "",
      description:
        lines.map((line) => getMemo(line, "descripcion")).filter(Boolean).join("\n") ||
        getMemo(row, "notas") ||
        "Gasto importado de Holded",
      amount: base || expected,
      ivaPercent: base > 0 ? roundMoney((iva / base) * 100) : 0,
      category: get(row, "categoria") || "Gasto importado",
      paymentMethod: get(row, "metodo_pago") || "",
      notes: [
        get(row, "numero") ? `Número Holded: ${get(row, "numero")}` : "",
        get(row, "tipo") ? `Tipo Holded: ${get(row, "tipo")}` : "",
        getMemo(row, "notas"),
        get(row, "adjunto") ? `Adjunto pendiente: ${get(row, "adjunto")}` : "",
      ]
        .filter(Boolean)
        .join("\n") || undefined,
      createdAt: isoDateTime(get(row, "fecha")),
    },
  };
}

function groupRows(rows: Row[] = [], key: string): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const value = get(row, key);
    if (!value) continue;
    grouped.set(value, [...(grouped.get(value) ?? []), row]);
  }
  return grouped;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function minMaxDates(documents: Document[], expenses: Expense[]): { from: string | null; to: string | null } {
  const dates = [
    ...documents.map((document) => document.date),
    ...expenses.map((expense) => expense.date),
  ].sort();
  return {
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
}

function sourceSheets(sheets: HoldedInputSheet[]): Partial<Record<HoldedSheetKind, Row[]>> {
  const grouped: Partial<Record<HoldedSheetKind, Row[]>> = {};
  for (const sheet of sheets) {
    grouped[sheet.kind] = [...(grouped[sheet.kind] ?? []), ...sheet.rows];
  }
  return grouped;
}

export function buildHoldedImport(current: AppData, sheets: HoldedInputSheet[]): HoldedImportResult {
  const tables = sourceSheets(sheets);
  if (!tables.contacts?.length && !tables.invoices?.length && !tables.purchases?.length && !tables.estimates?.length) {
    throw new Error(
      "No he encontrado hojas reconocibles de Holded. Para esta primera versión necesito un Excel multihoja con Contactos, Facturas, Gastos o Presupuestos.",
    );
  }

  const parsedContacts = (tables.contacts ?? [])
    .map(parseContact)
    .filter((entry): entry is ParsedContact => Boolean(entry));
  const importedCustomers = uniqueById(
    parsedContacts.flatMap((entry) => (entry.customer ? [entry.customer] : [])),
  );
  const importedSuppliers = uniqueById(
    parsedContacts.flatMap((entry) => (entry.supplier ? [entry.supplier] : [])),
  );
  const customersById = new Map(importedCustomers.map((customer) => [customer.id.replace(`${HOLDED_ID_PREFIX}:customer:`, ""), customer]));
  const suppliersById = new Map(importedSuppliers.map((supplier) => [supplier.id.replace(`${HOLDED_ID_PREFIX}:supplier:`, ""), supplier]));
  for (const entry of parsedContacts) {
    if (entry.customer) customersById.set(entry.sourceKey, entry.customer);
    if (entry.supplier) suppliersById.set(entry.sourceKey, entry.supplier);
  }

  const products = (tables.products ?? [])
    .map(parseProduct)
    .filter((product): product is ParsedProduct => Boolean(product));
  const productKeys = new Set(products.flatMap((product) => [product.sourceKey, product.sku].filter(Boolean)));
  const invoiceLinesById = groupRows(tables.invoiceLines, "invoice_id");
  const purchaseLinesById = groupRows(tables.purchaseLines, "purchase_id");
  const estimateLinesById = groupRows(tables.estimateLines, "estimate_id");

  const totalMismatches: HoldedTotalMismatch[] = [];
  const usedProductKeys = new Set<string>();
  const importedInvoices = (tables.invoices ?? []).map((row) => {
    const built = buildDocument({
      row,
      type: "factura",
      lines: invoiceLinesById.get(get(row, "invoice_id")) ?? [],
      customersById,
      profile: current.profile,
    });
    built.usedProductKeys.forEach((key) => usedProductKeys.add(key));
    if (built.mismatch) totalMismatches.push(built.mismatch);
    return built.document;
  });
  const importedEstimates = (tables.estimates ?? []).map((row) => {
    const built = buildDocument({
      row,
      type: "presupuesto",
      lines: estimateLinesById.get(get(row, "estimate_id")) ?? [],
      customersById,
      profile: current.profile,
    });
    built.usedProductKeys.forEach((key) => usedProductKeys.add(key));
    if (built.mismatch) totalMismatches.push(built.mismatch);
    return built.document;
  });
  const importedExpenses = (tables.purchases ?? []).map((row, index) => {
    const built = buildExpense(
      row,
      index,
      suppliersById,
      purchaseLinesById.get(get(row, "purchase_id")) ?? [],
    );
    built.usedProductKeys.forEach((key) => usedProductKeys.add(key));
    if (built.mismatch) totalMismatches.push(built.mismatch);
    return built.expense;
  });
  const importedDocuments = uniqueById([...importedInvoices, ...importedEstimates]);

  const keptDocuments = current.documents.filter(
    (document) =>
      !document.id.startsWith(`${HOLDED_ID_PREFIX}:factura:`) &&
      !document.id.startsWith(`${HOLDED_ID_PREFIX}:presupuesto:`),
  );
  const keptCustomers = current.customers.filter(
    (customer) => !customer.id.startsWith(`${HOLDED_ID_PREFIX}:customer:`),
  );
  const keptSuppliers = current.suppliers.filter(
    (supplier) => !supplier.id.startsWith(`${HOLDED_ID_PREFIX}:supplier:`),
  );
  const keptExpenses = current.expenses.filter(
    (expense) => !expense.id.startsWith(`${HOLDED_ID_PREFIX}:expense:`),
  );
  const nextDocuments = [...keptDocuments, ...importedDocuments];
  const data = normalizeLoadedData({
    ...current,
    customers: [...keptCustomers, ...importedCustomers],
    suppliers: [...keptSuppliers, ...importedSuppliers],
    expenses: [...keptExpenses, ...uniqueById(importedExpenses)],
    documents: nextDocuments,
    counters: countersFromDocuments(
      nextDocuments,
      current.profile.numbering.year,
      current.profile.numbering,
    ),
  });

  const mixedRoleContacts = (tables.contacts ?? []).filter(
    (row) => normalizeKey(get(row, "tipo_contacto")) === "CLIENTEPROVEEDOR",
  ).length;
  const attachmentCount = (tables.attachments ?? []).length +
    (tables.invoices ?? []).filter((row) => get(row, "pdf_adjunto")).length +
    (tables.purchases ?? []).filter((row) => get(row, "adjunto")).length;
  const preview: HoldedImportPreview = {
    sourceName: HOLDED_SOURCE_NAME,
    confidence: HOLDED_CONFIDENCE,
    sheets: sheets.map((sheet) => ({
      name: sheet.name,
      kind: sheet.kind,
      rows: sheet.rows.length,
    })),
    customers: importedCustomers.length,
    suppliers: importedSuppliers.length,
    mixedRoleContacts,
    productsRead: products.length,
    productsUsedForLines: [...usedProductKeys].filter((key) => productKeys.has(key)).length,
    invoices: importedInvoices.length,
    invoiceLines: (tables.invoiceLines ?? []).length,
    estimates: importedEstimates.length,
    estimateLines: (tables.estimateLines ?? []).length,
    expenses: importedExpenses.length,
    expenseLines: (tables.purchaseLines ?? []).length,
    attachments: attachmentCount,
    totalMismatches,
    dateRange: minMaxDates(importedDocuments, importedExpenses),
  };

  const warnings: string[] = [
    "Este importador de Holded está en validación: el archivo usado es un fixture inferido, no una exportación oficial exacta.",
  ];
  if (mixedRoleContacts > 0) {
    warnings.push(
      `${mixedRoleContacts} contacto(s) vienen como cliente y proveedor. La app los crea como dos fichas vinculadas por el mismo ID de origen porque todavía no existe un contacto con doble rol.`,
    );
  }
  if (preview.totalMismatches.length > 0) {
    warnings.push(
      `${preview.totalMismatches.length} documento(s) tienen totales que no cuadran exactamente al recalcular sus líneas.`,
    );
  }
  if ((tables.invoices ?? []).some((row) => normalizeKey(get(row, "estado")).includes("PARCIAL"))) {
    warnings.push(
      "Hay facturas con cobro parcial. La app las dejará como pendientes porque todavía no tiene pagos parciales por documento.",
    );
  }

  const unsupported: HoldedUnsupportedItem[] = [
    {
      label: "Catálogo de productos",
      reason:
        "La app todavía no guarda un catálogo reutilizable de productos. Los productos se leen para reconstruir líneas y detectar impuestos.",
      count: Math.max(0, preview.productsRead - preview.productsUsedForLines),
    },
    {
      label: "Stock, categorías y cuentas contables",
      reason:
        "Holded puede traer stock, cuentas de ventas/compras y categorías de producto, pero la app no tiene contabilidad ni almacén completo.",
      count: preview.productsRead || undefined,
    },
    {
      label: "Adjuntos y PDFs históricos",
      reason:
        "El Excel solo trae rutas o referencias. No se importan archivos adjuntos si el usuario no sube los ficheros reales.",
      count: preview.attachments || undefined,
    },
    {
      label: "Pagos parciales y actividad/auditoría",
      reason:
        "Los estados se simplifican a pendiente/pagado/aceptado/rechazado. No se conserva el historial de pagos parciales ni actividad interna.",
    },
    {
      label: "Relación presupuesto-factura",
      reason:
        "Si Holded indica que un presupuesto acabó en una factura, se anota en el documento, pero aún no se crea una relación estructurada entre ambos.",
      count: (tables.estimates ?? []).filter((row) => get(row, "convertido_en_factura")).length || undefined,
    },
    {
      label: "Campos no validados contra exportación real",
      reason:
        "Antes de lanzar compatibilidad pública de Holded hay que comparar este parser con un XLSX/CSV real exportado por Holded.",
    },
  ].filter((item) => item.count !== 0);

  return {
    data,
    preview,
    profileSuggestion: {
      fields: [],
      missingIvaRates: [],
      currentIvaRates: current.profile.iva.rates,
      detectedIvaRates: current.profile.iva.rates,
      emptyFieldCount: 0,
      differentCurrentValueCount: 0,
    },
    warnings,
    unsupported,
  };
}

async function readHoldedSheet(file: File, name: string): Promise<Row[]> {
  const { readSheet } = await import("read-excel-file/browser");
  const rows = (await readSheet(file, name)) as unknown as unknown[][];
  return rowsFromGrid(rows);
}

export async function readHoldedWorkbook(file: File, current: AppData): Promise<HoldedImportResult> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    throw new Error("Holded se importa desde un Excel multihoja. Selecciona un archivo .xlsx o .xls.");
  }
  let sheets = parseHoldedWorkbookBuffer(await file.arrayBuffer());
  if (sheets.length === 0) {
    sheets = [];
    for (const sheet of EXPECTED_SHEETS) {
      try {
        const rows = await readHoldedSheet(file, sheet.name);
        sheets.push({ ...sheet, rows });
      } catch {
        // Las exportaciones reales pueden no traer todas las hojas; se ignoran las ausentes.
      }
    }
  }
  return buildHoldedImport(current, sheets);
}
