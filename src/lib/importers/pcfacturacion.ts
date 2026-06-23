import { countersFromDocuments } from "../documents";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { normalizeLoadedData } from "../storage";
import type {
  AppData,
  BusinessProfile,
  Client,
  Customer,
  Document,
  DocumentStatus,
  LineItem,
} from "../types";

export const PCF_ID_PREFIX = "pcfacturacion";

type MdbRow = Record<string, unknown>;
type PcfTables = Record<string, MdbRow[]>;

export interface PcFacturacionImportOptions {
  includeUnusedCustomers: boolean;
}

export interface PcFacturacionImportPreview {
  companyName: string;
  customersWithDocuments: number;
  unusedCustomers: number;
  blankCustomers: number;
  customersToImport: number;
  invoices: number;
  offers: number;
  invoiceLines: number;
  offerLines: number;
  orphanInvoiceLineDocuments: number;
  orphanOfferLineDocuments: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

export interface PcFacturacionImportResult {
  data: AppData;
  preview: PcFacturacionImportPreview;
  warnings: string[];
}

interface ParsedCustomer {
  sourceId: string;
  customer: Customer;
}

function text(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function memo(value: unknown): string {
  return String(value ?? "").trim();
}

function amount(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function bool(value: unknown): boolean {
  return value === true;
}

function isoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(String(value ?? ""));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function isoDateTime(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const parsed = new Date(String(value ?? ""));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function sourceId(value: unknown, fallback: string): string {
  return text(value) || fallback;
}

function slug(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%/g, "_");
}

function pcfId(kind: string, id: string): string {
  return `${PCF_ID_PREFIX}:${kind}:${slug(id)}`;
}

function looksLikeCompany(value: string): boolean {
  return /\b(S\.?L\.?|S\.?A\.?|SCP|CB|C\.B\.|CIF|COMUNIDAD|ASOCIACI[OÓ]N)\b/i.test(
    value,
  );
}

export function extractSpanishTaxId(...values: unknown[]): string | undefined {
  const haystack = values
    .map(text)
    .join(" ")
    .toUpperCase()
    .replace(/\b(NIF|DNI|CIF|N\.I\.F|C\.I\.F)\b/g, " ");
  const compact = haystack.replace(/[^A-Z0-9]/g, "");
  const match =
    compact.match(/[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]/) ??
    compact.match(/[XYZ]\d{7}[A-Z]/) ??
    compact.match(/\d{8}[A-Z]/);
  return match?.[0];
}

function splitPersonName(displayName: string): { firstName: string; lastName: string } {
  const normalized = text(displayName);
  if (!normalized) return { firstName: "Cliente", lastName: "" };
  if (looksLikeCompany(normalized)) return { firstName: normalized, lastName: "" };
  const parts = normalized.split(" ");
  if (parts.length === 1) return { firstName: normalized, lastName: "" };
  return {
    firstName: parts.slice(0, 1).join(" "),
    lastName: parts.slice(1).join(" "),
  };
}

function customerDisplayName(row: MdbRow): string {
  const company = text(row.Company);
  const name = text(row.Name);
  const surname = text(row.Surname);
  const matchcode = text(row.Matchcode);

  if (company && looksLikeCompany(company)) return company;
  if (company && extractSpanishTaxId(company) && matchcode) return matchcode;
  if (matchcode) return matchcode;
  if (name || surname) return [name, surname].filter(Boolean).join(" ");
  return company || "Cliente";
}

function parseCustomer(row: MdbRow, index: number): ParsedCustomer | null {
  const source = sourceId(row.CustomerNumber, `cliente-${index + 1}`);
  const displayName = customerDisplayName(row);
  const hasContent = [
    row.Company,
    row.Name,
    row.Surname,
    row.Street,
    row.ZIP,
    row.Town,
    row.Telephone,
    row.Mobile,
    row.Email,
    row.TaxNumber,
    row.VatID,
  ].some((value) => text(value));

  if (!hasContent) return null;

  const { firstName, lastName } = splitPersonName(displayName);
  const createdAt = isoDateTime(row.CustomerDate);
  const customer: Customer = {
    id: pcfId("customer", source),
    firstName,
    lastName,
    name: displayName,
    nif: extractSpanishTaxId(row.TaxNumber, row.VatID, row.Company, row.Name),
    email: text(row.Email) || undefined,
    phone: text(row.Telephone) || text(row.Mobile) || undefined,
    address: text(row.Street) || undefined,
    city: text(row.Town) || undefined,
    postalCode: text(row.ZIP) || undefined,
    notes: memo(row.Notice) || undefined,
    createdAt,
    updatedAt: createdAt,
  };
  return { sourceId: source, customer };
}

function parseCompanyProfile(row: MdbRow | undefined, base: BusinessProfile): BusinessProfile {
  if (!row) return base;
  return {
    ...base,
    name: text(row.Company) || base.name,
    nif: extractSpanishTaxId(row.VatID, row.TaxNumber) ?? base.nif,
    address: text(row.Street) || base.address,
    city: text(row.Town) || base.city,
    postalCode: text(row.ZIP) || base.postalCode,
    phone: text(row.Telephone) || text(row.Mobile) || base.phone,
    email: text(row.Email) || base.email,
    iban: text(row.AccountNumber1) || base.iban,
    iva: {
      rates: [0, 10, 21],
      defaultRate: 21,
    },
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

function clientFromDocument(row: MdbRow, customerBySource: Map<string, Customer>): Client {
  const customer = customerBySource.get(text(row.CustomerNumber));
  if (customer) return clientFromCustomer(customer);
  const name = text(row.Customer) || "Cliente";
  const split = splitPersonName(name);
  return {
    ...split,
    name,
    address: memo(row.Address) || undefined,
  };
}

function groupPositions(rows: MdbRow[], documentName: string): Map<string, MdbRow[]> {
  const grouped = new Map<string, MdbRow[]>();
  for (const row of rows) {
    if (text(row.Document) !== documentName) continue;
    const key = text(row.DocumentNumber);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function parseVatPercent(vatCode: unknown, unitNet: number, unitVat: number): number {
  const explicit = text(vatCode).match(/\d+(?:[.,]\d+)?/);
  if (explicit) return Number(explicit[0].replace(",", "."));
  if (unitNet > 0 && unitVat > 0) return Math.round((unitVat / unitNet) * 100);
  return 21;
}

function lineFromPosition(row: MdbRow, index: number, docNumber: string): LineItem {
  const quantity = amount(row.Quantity) || 1;
  const unitPrice = amount(row.UnitpriceNet);
  const vatAmount = amount(row.UnitpriceVat);
  const description =
    [memo(row.ShortText), memo(row.LongText)].filter(Boolean).join("\n").trim() ||
    text(row.ArticleNumber) ||
    "Concepto importado";

  return {
    id: pcfId("line", `${docNumber}-${text(row.LineItemNumber) || index + 1}`),
    description,
    quantity,
    unit: text(row.Unit) || undefined,
    unitPrice,
    ivaPercent: parseVatPercent(row.VatCode, unitPrice, vatAmount),
  };
}

function documentStatus(row: MdbRow, type: "factura" | "presupuesto"): DocumentStatus {
  if (type === "factura") {
    if (bool(row.Canceled)) return "anulada";
    if (bool(row.Paid)) return "pagado";
    return "enviado";
  }
  return text(row.InvoiceNumber) ? "aceptado" : "enviado";
}

function buildDocument(input: {
  row: MdbRow;
  type: "factura" | "presupuesto";
  numberField: "InvoiceNumber" | "OfferNumber";
  positions: MdbRow[];
  customerBySource: Map<string, Customer>;
  profile: BusinessProfile;
}): Document {
  const number = text(input.row[input.numberField]);
  const date = isoDate(input.row.Date);
  const createdAt = isoDateTime(input.row.Date);
  const items = input.positions.map((row, index) =>
    lineFromPosition(row, index, number),
  );
  const status = documentStatus(input.row, input.type);

  return {
    id: pcfId(input.type, number),
    type: input.type,
    number,
    date,
    dueDate:
      input.type === "factura" && input.row.DuePayment
        ? isoDate(input.row.DuePayment)
        : undefined,
    client: clientFromDocument(input.row, input.customerBySource),
    items,
    notes: [memo(input.row.Text), memo(input.row.Impartation)]
      .filter(Boolean)
      .join("\n\n") || undefined,
    paymentTerms: text(input.row.PaymentPractice) || text(input.row.MethodPayment) || undefined,
    status,
    issuer: status === "borrador" ? undefined : captureIssuerSnapshot(input.profile),
    createdAt,
    updatedAt: createdAt,
  };
}

function minMaxDates(documents: Document[]): { from: string | null; to: string | null } {
  const dates = documents.map((doc) => doc.date).sort();
  return {
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
  };
}

function orphanDocumentCount(
  grouped: Map<string, MdbRow[]>,
  parentRows: MdbRow[],
  parentField: string,
): number {
  const parentNumbers = new Set(parentRows.map((row) => text(row[parentField])));
  return [...grouped.keys()].filter((number) => !parentNumbers.has(number)).length;
}

function importedLineCount(documents: Document[]): number {
  return documents.reduce((sum, document) => sum + document.items.length, 0);
}

export function buildPcFacturacionImport(
  current: AppData,
  tables: PcfTables,
  options: PcFacturacionImportOptions,
): PcFacturacionImportResult {
  const contacts = tables.Contacts ?? [];
  const invoices = tables.Invoice ?? [];
  const offers = tables.Offer ?? [];
  const positions = tables.Positions ?? [];
  const profile = parseCompanyProfile(tables.Client?.[0], current.profile);

  const usedCustomerNumbers = new Set(
    [...invoices, ...offers].map((row) => text(row.CustomerNumber)).filter(Boolean),
  );
  const parsedCustomers = contacts
    .map(parseCustomer)
    .filter((entry): entry is ParsedCustomer => Boolean(entry));
  const blankCustomers = contacts.length - parsedCustomers.length;
  const customersWithDocuments = parsedCustomers.filter((entry) =>
    usedCustomerNumbers.has(entry.sourceId),
  );
  const unusedCustomers = parsedCustomers.filter(
    (entry) => !usedCustomerNumbers.has(entry.sourceId),
  );
  const customersToImport = options.includeUnusedCustomers
    ? parsedCustomers
    : customersWithDocuments;
  const customerBySource = new Map(
    parsedCustomers.map((entry) => [entry.sourceId, entry.customer]),
  );

  const invoicePositions = groupPositions(positions, "Factura");
  const offerPositions = groupPositions(positions, "Presupuesto");
  const importedInvoices = invoices
    .filter((row) => text(row.InvoiceNumber))
    .map((row) =>
      buildDocument({
        row,
        type: "factura",
        numberField: "InvoiceNumber",
        positions: invoicePositions.get(text(row.InvoiceNumber)) ?? [],
        customerBySource,
        profile,
      }),
    );
  const importedOffers = offers
    .filter((row) => text(row.OfferNumber))
    .map((row) =>
      buildDocument({
        row,
        type: "presupuesto",
        numberField: "OfferNumber",
        positions: offerPositions.get(text(row.OfferNumber)) ?? [],
        customerBySource,
        profile,
      }),
    );

  const importedDocuments = [...importedInvoices, ...importedOffers];
  const keptDocuments = current.documents.filter(
    (doc) => !doc.id.startsWith(`${PCF_ID_PREFIX}:factura:`) &&
      !doc.id.startsWith(`${PCF_ID_PREFIX}:presupuesto:`),
  );
  const keptCustomers = current.customers.filter(
    (customer) => !customer.id.startsWith(`${PCF_ID_PREFIX}:customer:`),
  );
  const nextDocuments = [...keptDocuments, ...importedDocuments];
  const nextProfile = {
    ...profile,
    numbering: current.profile.numbering,
  };
  const data = normalizeLoadedData({
    ...current,
    profile: nextProfile,
    customers: [...keptCustomers, ...customersToImport.map((entry) => entry.customer)],
    documents: nextDocuments,
    counters: countersFromDocuments(
      nextDocuments,
      nextProfile.numbering.year,
      nextProfile.numbering,
    ),
  });

  const preview: PcFacturacionImportPreview = {
    companyName: profile.name,
    customersWithDocuments: customersWithDocuments.length,
    unusedCustomers: unusedCustomers.length,
    blankCustomers,
    customersToImport: customersToImport.length,
    invoices: importedInvoices.length,
    offers: importedOffers.length,
    invoiceLines: importedLineCount(importedInvoices),
    offerLines: importedLineCount(importedOffers),
    orphanInvoiceLineDocuments: orphanDocumentCount(
      invoicePositions,
      invoices,
      "InvoiceNumber",
    ),
    orphanOfferLineDocuments: orphanDocumentCount(offerPositions, offers, "OfferNumber"),
    dateRange: minMaxDates(importedDocuments),
  };

  const warnings: string[] = [];
  if (preview.blankCustomers > 0) {
    warnings.push(`${preview.blankCustomers} cliente(s) vacíos se ignorarán.`);
  }
  if (preview.orphanInvoiceLineDocuments > 0) {
    warnings.push(
      `${preview.orphanInvoiceLineDocuments} factura(s) antiguas tienen líneas sin cabecera y no se importarán automáticamente.`,
    );
  }
  if (preview.orphanOfferLineDocuments > 0) {
    warnings.push(
      `${preview.orphanOfferLineDocuments} presupuesto(s) antiguos tienen líneas sin cabecera y no se importarán automáticamente.`,
    );
  }

  return { data, preview, warnings };
}

export async function readPcFacturacionMdb(
  file: File,
  current: AppData,
  options: PcFacturacionImportOptions,
): Promise<PcFacturacionImportResult> {
  const { default: MDBReader } = await import("mdb-reader");
  const { Buffer } = await import("buffer");
  const buffer = await file.arrayBuffer();
  const reader = new MDBReader(Buffer.from(buffer));
  const requiredTables = [
    "Client",
    "Contacts",
    "Invoice",
    "Offer",
    "Positions",
  ];
  const tableNames = new Set(reader.getTableNames());
  const missing = requiredTables.filter((name) => !tableNames.has(name));
  if (missing.length > 0) {
    throw new Error(`No parece una base de PC Facturación 3.0. Faltan tablas: ${missing.join(", ")}`);
  }

  const tables: PcfTables = {};
  for (const name of requiredTables) {
    tables[name] = reader.getTable(name).getData() as MdbRow[];
  }
  return buildPcFacturacionImport(current, tables, options);
}
