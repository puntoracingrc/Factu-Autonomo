import { roundMoney } from "../calculations";
import { countersFromDocuments } from "../documents";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { normalizeLoadedData } from "../storage";
import {
  buildBusinessProfileAutofillSuggestion,
  completeBusinessProfileIvaFromDocuments,
  type BusinessProfileAutofillSuggestion,
} from "../business-profile-autofill";
import type {
  AppData,
  BusinessProfile,
  Client,
  Customer,
  Document,
  DocumentStatus,
  Expense,
  LineItem,
  Product,
  Supplier,
} from "../types";
import {
  inferPurchaseProductFamily,
  normalizeProductCatalogItem,
  purchaseProductKey,
} from "../purchase-products";

export const FACTURADIRECTA_ID_PREFIX = "facturadirecta";
export const FACTURADIRECTA_SOURCE_NAME = "FacturaDirecta";

export type FacturaDirectaTableKind =
  | "contacts"
  | "products"
  | "sales"
  | "invoiceLines"
  | "salesDueDates"
  | "purchases"
  | "purchaseDueDates"
  | "facturae"
  | "accounting"
  | "pdf"
  | "unknown";

type Row = Record<string, unknown>;

export type FacturaDirectaTables = Partial<
  Record<
    Exclude<FacturaDirectaTableKind, "facturae" | "accounting" | "pdf" | "unknown">,
    Row[]
  >
>;

export interface FacturaDirectaInputFile {
  name: string;
  rows?: Row[];
  text?: string;
}

export interface FacturaDirectaFileSummary {
  name: string;
  kind: FacturaDirectaTableKind;
  rows: number;
}

export interface FacturaDirectaUnsupportedItem {
  label: string;
  reason: string;
  count?: number;
}

export interface FacturaDirectaImportPreview {
  sourceName: string;
  files: FacturaDirectaFileSummary[];
  customers: number;
  suppliers: number;
  productsRead: number;
  productsUsedForLines: number;
  systemProductsSkipped: number;
  invoices: number;
  invoiceLines: number;
  estimates: number;
  estimateFallbackLines: number;
  expenses: number;
  partialDueDateDocuments: number;
  internalNotes: number;
  attachments: number;
  facturaeFiles: number;
  accountingFiles: number;
  ignoredFiles: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export interface FacturaDirectaImportResult {
  data: AppData;
  preview: FacturaDirectaImportPreview;
  profileSuggestion: BusinessProfileAutofillSuggestion;
  warnings: string[];
  unsupported: FacturaDirectaUnsupportedItem[];
}

interface ParsedContact {
  sourceKey: string;
  matchKeys: string[];
  customer?: Customer;
  supplier?: Supplier;
}

interface ParsedProduct {
  code: string;
  name: string;
  saleDescription?: string;
  purchaseDescription?: string;
  salePrice?: number;
  purchasePrice?: number;
  saleDiscountPercent?: number;
  purchaseDiscountPercent?: number;
  saleIvaPercent?: number;
  purchaseIvaPercent?: number;
  isSystemProduct: boolean;
}

const SYSTEM_PRODUCT_NAMES = new Set(
  [
    "Alquiler",
    "Gasto financiero",
    "Publicidad",
    "Reparacion",
    "Reparación",
    "Seguro",
    "Servicio",
    "Servicio bancario",
    "Servicio de profesional",
    "Suministro",
    "Transporte",
    "Suplidos",
  ].map(normalizeKey),
);

function text(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function memo(value: unknown): string {
  return String(value ?? "").trim();
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

function fdId(kind: string, id: string): string {
  const slug = encodeURIComponent(text(id) || kind).replace(/%/g, "_");
  return `${FACTURADIRECTA_ID_PREFIX}:${kind}:${slug}`;
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

function parseOptionalAmount(value: unknown): number | undefined {
  const parsed = parseAmount(value);
  return parsed > 0 ? parsed : undefined;
}

function parseDiscountPercent(value: unknown): number | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = parseAmount(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed <= 1 ? roundMoney(parsed * 100) : roundMoney(parsed);
}

function isoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = text(value);
  const spanish = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+.*)?$/);
  if (spanish) {
    return `${spanish[3]}-${spanish[2].padStart(2, "0")}-${spanish[1].padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function isoDateTime(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const raw = text(value);
  const spanish = raw.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (spanish) {
    const date = new Date(
      Number(spanish[3]),
      Number(spanish[2]) - 1,
      Number(spanish[1]),
      Number(spanish[4] ?? 0),
      Number(spanish[5] ?? 0),
      Number(spanish[6] ?? 0),
    );
    return date.toISOString();
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function extractSpanishTaxId(...values: unknown[]): string | undefined {
  const compact = values
    .map(text)
    .join(" ")
    .toUpperCase()
    .replace(/\b(NIF|DNI|CIF|NIE|N\.I\.F|C\.I\.F)\b/g, " ")
    .replace(/[^A-Z0-9]/g, "");
  const match =
    compact.match(/[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]/) ??
    compact.match(/[XYZ]\d{7}[A-Z]/) ??
    compact.match(/\d{8}[A-Z]/);
  return match?.[0];
}

function looksLikeCompany(value: string): boolean {
  return /\b(S\.?L\.?|S\.?A\.?|SCP|CB|C\.B\.|COMUNIDAD|ASOCIACI[OÓ]N)\b/i.test(
    value,
  );
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

function parseIvaPercent(code: string): number | undefined {
  const match = code.match(/IVA[_\s-]*(\d+(?:[.,]\d+)?)/i);
  if (!match) return undefined;
  return parseAmount(match[1]);
}

function inferIvaPercent(base: number, total: number, fallback = 21): number {
  if (base <= 0 || total <= base) return fallback;
  return Math.round(((total - base) / base) * 100);
}

function lineIvaPercent(
  product: ParsedProduct | undefined,
  sale: Row,
  fallback: number,
): number {
  return product?.saleIvaPercent ?? inferIvaPercent(
    parseAmount(get(sale, "Subtotal")),
    parseAmount(get(sale, "Total")),
    fallback,
  );
}

function rowHasAny(row: Row, keys: string[]): boolean {
  return keys.some((key) => get(row, key));
}

function makeMatchKeys(...values: unknown[]): string[] {
  return [...new Set(values.map(normalizeKey).filter(Boolean))];
}

function contactDisplayName(row: Row): string {
  return (
    get(row, "Mostrar como") ||
    [get(row, "Nombre"), get(row, "Apellidos")].filter(Boolean).join(" ") ||
    get(row, "Detalle") ||
    "Contacto"
  );
}

function parseContact(
  row: Row,
  index: number,
  usedCustomerKeys: Set<string>,
  usedSupplierKeys: Set<string>,
): ParsedContact | null {
  if (
    !rowHasAny(row, [
      "Detalle",
      "NIF",
      "Email",
      "Teléfono",
      "Nombre",
      "Mostrar como",
      "Dirección",
      "Notas",
    ])
  ) {
    return null;
  }

  const displayName = contactDisplayName(row);
  const fiscalName = [get(row, "Nombre"), get(row, "Apellidos")]
    .filter(Boolean)
    .join(" ");
  const nif = extractSpanishTaxId(get(row, "NIF"), get(row, "Núm. IVA europeo"));
  const createdAt = isoDateTime(get(row, "Fecha creación"));
  const sourceKey =
    get(row, "Identificador externo") ||
    get(row, "Cód. cliente externo") ||
    get(row, "Cód. proveedor externo") ||
    nif ||
    displayName ||
    `contacto-${index + 1}`;
  const matchKeys = makeMatchKeys(
    displayName,
    fiscalName,
    get(row, "Detalle"),
    nif,
    get(row, "Identificador externo"),
  );
  const isCustomer =
    Boolean(get(row, "Cód. cliente externo")) ||
    matchKeys.some((key) => usedCustomerKeys.has(key));
  const isSupplier =
    Boolean(get(row, "Cód. proveedor externo")) ||
    matchKeys.some((key) => usedSupplierKeys.has(key));
  const { firstName, lastName } = splitName(displayName);
  const common = {
    nif,
    email: get(row, "Email") || undefined,
    phone: get(row, "Teléfono") || undefined,
    address: get(row, "Dirección") || undefined,
    city: get(row, "Población") || undefined,
    postalCode: get(row, "Código postal") || undefined,
    notes: getMemo(row, "Notas") || undefined,
  };

  return {
    sourceKey,
    matchKeys,
    customer: isCustomer
      ? {
          id: fdId("customer", sourceKey),
          firstName,
          lastName,
          name: displayName,
          ...common,
          createdAt,
          updatedAt: isoDateTime(get(row, "Fecha modificación") || createdAt),
        }
      : undefined,
    supplier: isSupplier
      ? {
          id: fdId("supplier", sourceKey),
          name: displayName,
          website: get(row, "Página web") || undefined,
          category: get(row, "Etiquetas") || undefined,
          ...common,
          createdAt,
        }
      : undefined,
  };
}

function parseProduct(row: Row): ParsedProduct | null {
  const name = get(row, "Nombre");
  if (!name) return null;
  const code = get(row, "Código");
  const isSystemProduct =
    !code &&
    !get(row, "Identificador externo") &&
    SYSTEM_PRODUCT_NAMES.has(normalizeKey(name));
  return {
    code,
    name,
    saleDescription: getMemo(row, "Descripción de venta") || undefined,
    purchaseDescription: getMemo(row, "Descripción de compra") || undefined,
    salePrice: parseOptionalAmount(get(row, "Precio de venta")),
    purchasePrice: parseOptionalAmount(get(row, "Precio de compra")),
    saleDiscountPercent: parseDiscountPercent(get(row, "Dto. venta")),
    purchaseDiscountPercent: parseDiscountPercent(get(row, "Dto. compra")),
    saleIvaPercent: parseIvaPercent(get(row, "Impuestos de venta")),
    purchaseIvaPercent: parseIvaPercent(get(row, "Impuestos de compra")),
    isSystemProduct,
  };
}

function productFromParsedProduct(product: ParsedProduct): Product {
  const now = new Date().toISOString();
  const purchaseNetUnitCost =
    product.purchasePrice !== undefined && product.purchaseDiscountPercent !== undefined
      ? roundMoney(product.purchasePrice * (1 - product.purchaseDiscountPercent / 100))
      : product.purchasePrice;

  return normalizeProductCatalogItem({
    id: fdId("product", product.code || product.name),
    key: purchaseProductKey(product.name),
    aliases: product.code ? [purchaseProductKey(product.code)] : [],
    sku: product.code || undefined,
    externalId: product.code || undefined,
    name: product.name,
    family: inferPurchaseProductFamily(product.name),
    unit: undefined,
    pvp: product.purchasePrice,
    cost: purchaseNetUnitCost,
    ivaPercent: product.saleIvaPercent ?? product.purchaseIvaPercent,
    sales: {
      enabled: Boolean(
        product.saleDescription ||
          product.salePrice ||
          product.saleIvaPercent !== undefined,
      ),
      description: product.saleDescription,
      unitPrice: product.salePrice,
      ivaPercent: product.saleIvaPercent,
    },
    purchase: {
      enabled: Boolean(
        product.purchaseDescription ||
          product.code ||
          product.purchasePrice ||
          product.purchaseDiscountPercent ||
          product.purchaseIvaPercent !== undefined,
      ),
      description: product.purchaseDescription,
      listPrice: product.purchasePrice,
      discountPercent: product.purchaseDiscountPercent,
      netUnitCost: purchaseNetUnitCost,
      ivaPercent: product.purchaseIvaPercent,
      supplierReference: product.code || undefined,
    },
    source: "manual",
    createdAt: now,
    updatedAt: now,
  });
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

function findByKeys<T>(
  map: Map<string, T>,
  ...values: unknown[]
): T | undefined {
  for (const key of makeMatchKeys(...values)) {
    const match = map.get(key);
    if (match) return match;
  }
  return undefined;
}

function clientFromSale(row: Row, customersByKey: Map<string, Customer>): {
  customerId?: string;
  client: Client;
} {
  const matched = findByKeys(
    customersByKey,
    get(row, "NIF"),
    get(row, "Cliente"),
    get(row, "Mostrar como"),
    get(row, "Nombre"),
  );
  if (matched) {
    return { customerId: matched.id, client: clientFromCustomer(matched) };
  }
  const displayName =
    get(row, "Mostrar como") ||
    [get(row, "Nombre"), get(row, "Apellidos")].filter(Boolean).join(" ") ||
    get(row, "Cliente") ||
    "Cliente";
  const split = splitName(displayName);
  return {
    client: {
      ...split,
      name: displayName,
      nif: extractSpanishTaxId(get(row, "NIF")),
      email: get(row, "Email") || undefined,
      address:
        [get(row, "Código postal"), get(row, "Población")].filter(Boolean).join(" ") ||
        undefined,
    },
  };
}

function saleNumberKey(row: Row): string {
  return normalizeDocumentNumber(get(row, "Serie / Núm."));
}

function normalizeDocumentNumber(value: unknown): string {
  return normalizeKey(value);
}

function numberFromDueDateTitle(value: string): string {
  const clean = value.replace(/\([^)]*\)/g, " ");
  const factura = clean.match(/\bFactura\s+([A-Z0-9\s._/-]+)/i);
  if (factura) return normalizeDocumentNumber(factura[1]);
  const compra = clean.match(/\bCompra\s+([A-Z0-9\s._/-]+)/i);
  if (compra) return normalizeDocumentNumber(compra[1]);
  return normalizeDocumentNumber(clean);
}

function groupRowsByDocumentNumber(rows: Row[] = [], numberField: string): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = normalizeDocumentNumber(get(row, numberField));
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function groupDueDates(rows: Row[] = []): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = numberFromDueDateTitle(get(row, "Título del documento"));
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function statusFromSale(row: Row): DocumentStatus {
  const status = normalizeKey(get(row, "Estado"));
  const type = normalizeKey(get(row, "Tipo"));
  if (status.includes("ANUL")) return "anulada";
  if (status.includes("PAG") || status.includes("COBR")) return "pagado";
  if (type.includes("PRESUP") && status.includes("CERR")) return "aceptado";
  if (status.includes("RECH")) return "rechazado";
  return "enviado";
}

function lineFromInvoiceReport(
  row: Row,
  index: number,
  sale: Row,
  productsByCode: Map<string, ParsedProduct>,
  profile: BusinessProfile,
): LineItem | null {
  const quantity = parseAmount(get(row, "Cantidad"));
  const unitPrice = parseAmount(get(row, "Precio unitario"));
  const totalLine = parseAmount(get(row, "Total línea"));
  const code = get(row, "Código Prod.");
  const name = get(row, "Producto/Servicio");
  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
  const product = productsByCode.get(code);
  const discountedUnitPrice =
    totalLine > 0 ? roundMoney(totalLine / quantity) : unitPrice;
  const description =
    product?.saleDescription || name || product?.name || "Concepto importado";

  return {
    id: fdId("line", `${get(sale, "Serie / Núm.")}-${index + 1}`),
    description,
    quantity,
    unitPrice: discountedUnitPrice,
    ivaPercent: lineIvaPercent(product, sale, profile.iva.defaultRate),
  };
}

function fallbackDocumentLine(
  sale: Row,
  profile: BusinessProfile,
  reasonLabel: string,
): LineItem {
  const subtotal = parseAmount(get(sale, "Subtotal"));
  const total = parseAmount(get(sale, "Total"));
  const detail = getMemo(sale, "Cliente / Detalle")
    .split(/\r?\n/)
    .map(text)
    .filter(Boolean)
    .slice(1)
    .join("\n");
  return {
    id: fdId("line", `${get(sale, "Serie / Núm.")}-resumen`),
    description: detail || reasonLabel,
    quantity: 1,
    unitPrice: subtotal,
    ivaPercent: inferIvaPercent(subtotal, total, profile.iva.defaultRate),
  };
}

function buildDocument(input: {
  sale: Row;
  type: "factura" | "presupuesto";
  lines: Row[];
  dueDates: Row[];
  productsByCode: Map<string, ParsedProduct>;
  customersByKey: Map<string, Customer>;
  profile: BusinessProfile;
}): { document: Document; fallbackLine: boolean; usedProductCodes: string[] } {
  const { sale, type, lines, dueDates, productsByCode, customersByKey, profile } = input;
  const number = get(sale, "Serie / Núm.") || get(sale, "Num. Factura");
  const date = isoDate(get(sale, "Fecha"));
  const createdAt = isoDateTime(get(sale, "Fecha"));
  const clientInfo = clientFromSale(sale, customersByKey);
  const usedProductCodes: string[] = [];
  const items = lines
    .map((line, index) => {
      const code = get(line, "Código Prod.");
      if (code) usedProductCodes.push(code);
      return lineFromInvoiceReport(line, index, sale, productsByCode, profile);
    })
    .filter((line): line is LineItem => Boolean(line));
  const fallbackLine = items.length === 0;
  const visibleNotes = getMemo(sale, "Notas");
  const paymentTerms = get(sale, "Método de pago") || undefined;
  const status = statusFromSale(sale);

  return {
    fallbackLine,
    usedProductCodes,
    document: {
      id: fdId(type, number),
      type,
      number,
      date,
      dueDate: get(sale, "Vencimiento")
        ? isoDate(get(sale, "Vencimiento"))
        : dueDates[0]
          ? isoDate(get(dueDates[0], "Fecha de vencimiento"))
          : undefined,
      customerId: clientInfo.customerId,
      client: clientInfo.client,
      items: fallbackLine
        ? [fallbackDocumentLine(sale, profile, `${type} importado de FacturaDirecta`)]
        : items,
      notes: visibleNotes || undefined,
      paymentTerms,
      status,
      issuer: status === "borrador" ? undefined : captureIssuerSnapshot(profile, createdAt),
      documentLifecycle: status === "borrador" ? "draft" : "issued",
      integrityLock: status === "borrador" ? "unlocked" : "locked",
      deliveryStatus: get(sale, "Enviados") && parseAmount(get(sale, "Enviados")) > 0
        ? "sent"
        : "not_sent",
      paymentStatus: type === "factura" ? (status === "pagado" ? "paid" : "pending") : "not_applicable",
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

function supplierFromPurchase(
  row: Row,
  suppliersByKey: Map<string, Supplier>,
): Supplier | undefined {
  const detail = get(row, "Proveedor / Detalle");
  const direct = findByKeys(suppliersByKey, detail);
  if (direct) return direct;
  for (const supplier of suppliersByKey.values()) {
    const key = normalizeKey(supplier.name);
    if (key && normalizeKey(detail).startsWith(key)) return supplier;
  }
  return undefined;
}

function purchaseDescription(row: Row, supplier?: Supplier): string {
  const detail = get(row, "Proveedor / Detalle");
  if (!supplier) return detail || "Gasto importado de FacturaDirecta";
  const prefix = supplier.name;
  if (detail.startsWith(`${prefix} - `)) return detail.slice(prefix.length + 3);
  return detail || "Gasto importado de FacturaDirecta";
}

function buildExpense(
  row: Row,
  index: number,
  suppliersByKey: Map<string, Supplier>,
  purchaseDueDates: Map<string, Row[]>,
): Expense {
  const number = get(row, "Núm.") || `compra-${index + 1}`;
  const supplier = supplierFromPurchase(row, suppliersByKey);
  const subtotal = parseAmount(get(row, "Subtotal"));
  const total = parseAmount(get(row, "Total"));
  const dueDates = purchaseDueDates.get(normalizeDocumentNumber(number)) ?? [];
  const dueDateNotes =
    dueDates.length > 0
      ? dueDates
          .map(
            (due) =>
              `Vencimiento FacturaDirecta: ${isoDate(get(due, "Fecha de vencimiento"))} por ${parseAmount(get(due, "Importe del vencimiento")).toFixed(2)} EUR`,
          )
          .join("\n")
      : "";

  return {
    id: fdId("expense", number),
    date: isoDate(get(row, "Fecha registro")),
    origin: "import",
    businessKind: "purchase_invoice",
    supplierId: supplier?.id,
    supplierName: supplier?.name || "",
    description: purchaseDescription(row, supplier),
    amount: subtotal || total,
    ivaPercent: inferIvaPercent(subtotal, total, 0),
    category: "Compra importada",
    paymentMethod: "",
    notes: [number, dueDateNotes].filter(Boolean).join("\n") || undefined,
    createdAt: isoDateTime(get(row, "Fecha registro")),
  };
}

function addToMatchMap<T extends { nif?: string; name: string }>(
  map: Map<string, T>,
  entry: T,
  extraKeys: string[] = [],
): void {
  for (const key of makeMatchKeys(entry.name, entry.nif, ...extraKeys)) {
    map.set(key, entry);
  }
}

function usedKeysFromSales(rows: Row[] = []): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of makeMatchKeys(
      get(row, "Cliente"),
      get(row, "Mostrar como"),
      get(row, "Nombre"),
      get(row, "NIF"),
    )) {
      keys.add(key);
    }
  }
  return keys;
}

function usedKeysFromPurchases(rows: Row[] = [], dueRows: Row[] = []): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    const detail = get(row, "Proveedor / Detalle");
    const possibleName = detail.includes(" - ") ? detail.split(" - ")[0] : detail;
    for (const key of makeMatchKeys(detail, possibleName)) keys.add(key);
  }
  for (const row of dueRows) {
    for (const key of makeMatchKeys(get(row, "Nombre del contacto"))) keys.add(key);
  }
  return keys;
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

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function uniqueProducts(products: ParsedProduct[]): ParsedProduct[] {
  return [
    ...new Map(
      products.map((product) => [
        product.code ? `code:${product.code}` : `name:${normalizeKey(product.name)}`,
        product,
      ]),
    ).values(),
  ];
}

function uniqueRowsByKey(rows: Row[], keyFn: (row: Row, index: number) => string): Row[] {
  return [
    ...new Map(
      rows.map((row, index) => [keyFn(row, index) || `row:${index}`, row]),
    ).values(),
  ];
}

function classifyHeaders(headers: string[]): FacturaDirectaTableKind {
  const normalized = new Set(headers.map(normalizeHeader));
  const has = (...names: string[]) =>
    names.every((name) => normalized.has(normalizeHeader(name)));

  if (has("Detalle", "NIF", "Mostrar como", "Cód. cliente externo")) return "contacts";
  if (has("Tipo de producto", "Código", "Impuestos de venta")) return "products";
  if (has("Tipo", "Serie / Núm.", "Cliente / Detalle", "Notas internas")) return "sales";
  if (has("Núm. Factura", "Código Prod.", "Total línea")) return "invoiceLines";
  if (has("Título del documento", "Importe del vencimiento")) return "salesDueDates";
  if (has("Fecha registro", "Proveedor / Detalle", "Saldo pendiente")) return "purchases";
  return "unknown";
}

function classifyNonTabularFile(name: string): FacturaDirectaTableKind {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xsig") || lower.endsWith(".xml")) return "facturae";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".dat") || lower.endsWith(".zip")) return "accounting";
  return "unknown";
}

export function detectFacturaDirectaRows(rows: Row[]): FacturaDirectaTableKind {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return classifyHeaders(headers);
}

function detectFacturaDirectaFileKind(
  name: string,
  rows: Row[],
): FacturaDirectaTableKind {
  const kind = detectFacturaDirectaRows(rows);
  if (kind !== "salesDueDates") return kind;
  const lowerName = name.toLowerCase();
  const dueTitles = rows.map((row) => get(row, "Título del documento"));
  if (
    lowerName.includes("compras") ||
    dueTitles.some((title) => normalizeKey(title).startsWith("COMPRA"))
  ) {
    return "purchaseDueDates";
  }
  return "salesDueDates";
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

function parseCsv(textValue: string): Row[] {
  const input = textValue.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rowsFromGrid(rows);
}

async function readTabularFile(file: File): Promise<Row[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsv(await file.text());
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    const rows = (await readXlsxFile(file)) as unknown as unknown[][];
    return rowsFromGrid(rows);
  }
  return [];
}

export async function readFacturaDirectaFiles(
  files: File[],
  current: AppData,
): Promise<FacturaDirectaImportResult> {
  const inputFiles: FacturaDirectaInputFile[] = [];
  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      inputFiles.push({ name: file.name, rows: await readTabularFile(file) });
    } else {
      inputFiles.push({ name: file.name, text: lower.endsWith(".pdf") ? undefined : await file.text().catch(() => undefined) });
    }
  }
  return buildFacturaDirectaImport(current, inputFiles);
}

export function buildFacturaDirectaImport(
  current: AppData,
  files: FacturaDirectaInputFile[],
): FacturaDirectaImportResult {
  const tables: FacturaDirectaTables = {};
  const fileSummaries: FacturaDirectaFileSummary[] = [];
  let facturaeFiles = 0;
  let accountingFiles = 0;
  let pdfFiles = 0;
  let ignoredFiles = 0;

  for (const file of files) {
    const kind = file.rows?.length
      ? detectFacturaDirectaFileKind(file.name, file.rows)
      : classifyNonTabularFile(file.name);
    fileSummaries.push({ name: file.name, kind, rows: file.rows?.length ?? 0 });
    if (kind === "facturae") facturaeFiles += 1;
    if (kind === "accounting") accountingFiles += 1;
    if (kind === "pdf") pdfFiles += 1;
    if (kind === "unknown") ignoredFiles += 1;
    if (
      kind !== "unknown" &&
      kind !== "facturae" &&
      kind !== "accounting" &&
      kind !== "pdf" &&
      file.rows
    ) {
      tables[kind] = [...(tables[kind] ?? []), ...file.rows];
    }
  }

  if (!Object.values(tables).some((rows) => rows && rows.length > 0)) {
    throw new Error(
      "No he encontrado listados reconocibles de FacturaDirecta. Añade CSV o Excel de contactos, ventas, líneas, compras o vencimientos.",
    );
  }

  const sales = uniqueRowsByKey(
    tables.sales ?? [],
    (row) => `${normalizeKey(get(row, "Tipo"))}:${saleNumberKey(row)}`,
  );
  const purchases = uniqueRowsByKey(
    tables.purchases ?? [],
    (row) => normalizeDocumentNumber(get(row, "Núm.")),
  );
  const purchaseDueDateRows = uniqueRowsByKey(
    tables.purchaseDueDates ?? [],
    (row) =>
      `${numberFromDueDateTitle(get(row, "Título del documento"))}:${get(row, "Fecha de vencimiento")}:${get(row, "Importe del vencimiento")}`,
  );
  const usedCustomerKeys = usedKeysFromSales(sales);
  const usedSupplierKeys = usedKeysFromPurchases(purchases, purchaseDueDateRows);
  const parsedContacts = (tables.contacts ?? [])
    .map((row, index) => parseContact(row, index, usedCustomerKeys, usedSupplierKeys))
    .filter((entry): entry is ParsedContact => Boolean(entry));
  const importedCustomers = uniqueById(
    parsedContacts.flatMap((entry) => (entry.customer ? [entry.customer] : [])),
  );
  const importedSuppliers = uniqueById(
    parsedContacts.flatMap((entry) => (entry.supplier ? [entry.supplier] : [])),
  );
  const customersByKey = new Map<string, Customer>();
  const suppliersByKey = new Map<string, Supplier>();
  parsedContacts.forEach((entry) => {
    if (entry.customer) addToMatchMap(customersByKey, entry.customer, entry.matchKeys);
    if (entry.supplier) addToMatchMap(suppliersByKey, entry.supplier, entry.matchKeys);
  });

  const parsedProducts = uniqueProducts(
    (tables.products ?? [])
      .map(parseProduct)
      .filter((product): product is ParsedProduct => Boolean(product)),
  );
  const productsByCode = new Map(
    parsedProducts.filter((product) => product.code).map((product) => [product.code, product]),
  );
  const importedProducts = uniqueById(
    parsedProducts
      .filter((product) => !product.isSystemProduct)
      .map(productFromParsedProduct),
  );
  const invoiceLines = groupRowsByDocumentNumber(
    uniqueRowsByKey(
      tables.invoiceLines ?? [],
      (row) =>
        `${normalizeDocumentNumber(get(row, "Núm. Factura"))}:${get(row, "Código Prod.")}:${get(row, "Producto/Servicio")}:${get(row, "Cantidad")}:${get(row, "Total línea")}`,
    ),
    "Núm. Factura",
  );
  const salesDueDates = groupDueDates(
    uniqueRowsByKey(
      tables.salesDueDates ?? [],
      (row) =>
        `${numberFromDueDateTitle(get(row, "Título del documento"))}:${get(row, "Fecha de vencimiento")}:${get(row, "Importe del vencimiento")}`,
    ),
  );
  const purchaseDueDates = groupDueDates(tables.purchaseDueDates);
  const profileForImportedDocuments = current.profile;

  const usedProductCodes = new Set<string>();
  let estimateFallbackLines = 0;
  const importedDocuments = uniqueById(sales
    .filter((row) => get(row, "Serie / Núm.") && get(row, "Moneda") !== "TOTAL")
    .map((sale) => {
      const normalizedType = normalizeKey(get(sale, "Tipo"));
      const type = normalizedType.includes("PRESUP") ? "presupuesto" : "factura";
      const result = buildDocument({
        sale,
        type,
        lines: type === "factura" ? invoiceLines.get(saleNumberKey(sale)) ?? [] : [],
        dueDates: salesDueDates.get(saleNumberKey(sale)) ?? [],
        productsByCode,
        customersByKey,
        profile: profileForImportedDocuments,
      });
      result.usedProductCodes.forEach((code) => usedProductCodes.add(code));
      if (result.fallbackLine && type === "presupuesto") estimateFallbackLines += 1;
      return result.document;
    }));
  const importedExpenses = uniqueById(purchases
    .filter((row) => get(row, "Núm.") && get(row, "Moneda") !== "TOTAL")
    .map((row, index) => buildExpense(row, index, suppliersByKey, purchaseDueDates)));

  const keptDocuments = current.documents.filter(
    (document) =>
      !document.id.startsWith(`${FACTURADIRECTA_ID_PREFIX}:factura:`) &&
      !document.id.startsWith(`${FACTURADIRECTA_ID_PREFIX}:presupuesto:`),
  );
  const keptCustomers = current.customers.filter(
    (customer) => !customer.id.startsWith(`${FACTURADIRECTA_ID_PREFIX}:customer:`),
  );
  const keptSuppliers = current.suppliers.filter(
    (supplier) => !supplier.id.startsWith(`${FACTURADIRECTA_ID_PREFIX}:supplier:`),
  );
  const keptExpenses = current.expenses.filter(
    (expense) => !expense.id.startsWith(`${FACTURADIRECTA_ID_PREFIX}:expense:`),
  );
  const keptProducts = current.products.filter(
    (product) => !product.id.startsWith(`${FACTURADIRECTA_ID_PREFIX}:product:`),
  );
  const nextDocuments = [...keptDocuments, ...importedDocuments];
  const data = normalizeLoadedData({
    ...current,
    customers: [...keptCustomers, ...importedCustomers],
    suppliers: [...keptSuppliers, ...importedSuppliers],
    expenses: [...keptExpenses, ...importedExpenses],
    products: [...keptProducts, ...importedProducts],
    documents: nextDocuments,
    counters: countersFromDocuments(
      nextDocuments,
      current.profile.numbering.year,
      current.profile.numbering,
    ),
  });
  const partialDueDateDocuments = [...salesDueDates.values(), ...purchaseDueDates.values()]
    .filter((rows) => rows.length > 1).length;
  const internalNotes = sales.filter((row) => getMemo(row, "Notas internas")).length;
  const attachments = sales.reduce((sum, row) => sum + parseAmount(get(row, "Adjuntos")), 0);
  const profileSuggestion = buildBusinessProfileAutofillSuggestion(
    current.profile,
    completeBusinessProfileIvaFromDocuments(current.profile, importedDocuments, {
      preferMostUsedDefault: false,
    }),
  );
  const productsUsedForLines = [...usedProductCodes].filter((code) =>
    productsByCode.has(code),
  ).length;
  const systemProductsSkipped = parsedProducts.filter((product) => product.isSystemProduct).length;
  const preview: FacturaDirectaImportPreview = {
    sourceName: FACTURADIRECTA_SOURCE_NAME,
    files: fileSummaries,
    customers: importedCustomers.length,
    suppliers: importedSuppliers.length,
    productsRead: parsedProducts.length,
    productsUsedForLines,
    systemProductsSkipped,
    invoices: importedDocuments.filter((document) => document.type === "factura").length,
    invoiceLines: importedDocuments
      .filter((document) => document.type === "factura")
      .reduce((sum, document) => sum + document.items.length, 0),
    estimates: importedDocuments.filter((document) => document.type === "presupuesto").length,
    estimateFallbackLines,
    expenses: importedExpenses.length,
    partialDueDateDocuments,
    internalNotes,
    attachments,
    facturaeFiles,
    accountingFiles,
    ignoredFiles: ignoredFiles + pdfFiles,
    dateRange: minMaxDates(importedDocuments, importedExpenses),
  };

  const warnings: string[] = [];
  if ((tables.sales ?? []).length > 0 && (tables.invoiceLines ?? []).length === 0) {
    warnings.push(
      "Has incluido ventas, pero no el informe de líneas facturadas. Las facturas se importarán con una línea resumen.",
    );
  }
  if (preview.estimateFallbackLines > 0) {
    warnings.push(
      `${preview.estimateFallbackLines} presupuesto(s) no traen líneas estructuradas en el listado y se importarán con una línea resumen.`,
    );
  }
  if (preview.partialDueDateDocuments > 0) {
    warnings.push(
      `${preview.partialDueDateDocuments} documento(s) tienen vencimientos parciales. La app guardará una fecha principal y anotará lo demás cuando sea posible.`,
    );
  }
  if (preview.systemProductsSkipped > 0) {
    warnings.push(
      `${preview.systemProductsSkipped} producto(s) parecen categorías predefinidas de FacturaDirecta y no se importarán como catálogo propio.`,
    );
  }
  if (importedProducts.length > 0) {
    warnings.push(
      `${importedProducts.length} producto(s) de FacturaDirecta se importarán como catálogo reutilizable.`,
    );
  }
  if (preview.ignoredFiles > 0) {
    warnings.push(
      `${preview.ignoredFiles} archivo(s) se han reconocido como referencia o no se han podido interpretar como tabla importable.`,
    );
  }

  const unsupported: FacturaDirectaUnsupportedItem[] = [
    {
      label: "Facturae, DIR3 y centros administrativos",
      reason:
        "FacturaDirecta puede exportarlo en XML/XSIG, pero nuestro modelo actual no guarda todavía todos esos campos avanzados.",
      count: preview.facturaeFiles || undefined,
    },
    {
      label: "Notas internas de ventas",
      reason:
        "No se copian a notas visibles para evitar que aparezcan en PDFs o documentos enviados al cliente.",
      count: preview.internalNotes || undefined,
    },
    {
      label: "Adjuntos y PDFs originales",
      reason:
        "Se tratan como referencia visual/legal. Aún no hay importación de adjuntos históricos en la app.",
      count: preview.attachments || pdfFiles || undefined,
    },
    {
      label: "Asientos contables A3/ContaPlus",
      reason:
        "La app no tiene contabilidad completa por asientos; esos ficheros quedan como importación futura.",
      count: preview.accountingFiles || undefined,
    },
    {
      label: "Interlocutores y direcciones adicionales",
      reason:
        "No vienen en los listados principales y la app todavía no tiene una ficha avanzada equivalente.",
    },
    {
      label: "Vencimientos parciales múltiples",
      reason:
        "El modelo actual solo usa una fecha de vencimiento principal en documentos emitidos.",
      count: preview.partialDueDateDocuments || undefined,
    },
  ].filter((item) => item.count !== 0);

  return { data, preview, profileSuggestion, warnings, unsupported };
}
