import { countersFromDocuments, formatDocumentNumber } from "../documents";
import { captureIssuerSnapshot } from "../issuer-snapshot";
import { normalizeLoadedData } from "../storage";
import {
  inferCustomerTypeFromIdentity,
  looksLikeCompanyName,
} from "../customers";
import {
  buildBusinessProfileAutofillSuggestion,
  completeBusinessProfileIvaFromDocuments,
  fillMissingBusinessProfileFields,
  type BusinessProfileAutofillCandidate,
  type BusinessProfileAutofillSuggestion,
} from "../business-profile-autofill";
import type {
  AppData,
  BusinessProfile,
  Client,
  Customer,
  Document,
  DocumentStatus,
  LineItem,
  NumberingSettings,
} from "../types";

export const PCF_ID_PREFIX = "pcfacturacion";
export const PC_FACTURACION_SOURCE_NAME = "PC Facturación 3.0";
export const PC_FACTURACION_REQUIRED_TABLES = [
  "Client",
  "Contacts",
  "Invoice",
  "Offer",
  "Positions",
] as const;

type MdbRow = Record<string, unknown>;
type PcfTables = Record<string, MdbRow[]>;

export interface PcFacturacionImportOptions {
  includeUnusedCustomers: boolean;
  dwiText?: string;
  markUnpaidInvoicesAsPaid?: boolean;
}

export interface PcFacturacionImportPreview {
  sourceName: string;
  companyName: string;
  customersWithDocuments: number;
  unusedCustomers: number;
  blankCustomers: number;
  customersToImport: number;
  invoices: number;
  unpaidInvoices: number;
  unpaidInvoicesMarkedPaid: boolean;
  offers: number;
  invoiceLines: number;
  offerLines: number;
  orphanInvoiceLineDocuments: number;
  orphanOfferLineDocuments: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  numbering?: {
    nextInvoiceNumber?: string;
    nextOfferNumber?: string;
    nextReceiptNumber?: string;
    nextCustomerNumber?: number;
  };
}

export interface PcFacturacionImportResult {
  data: AppData;
  preview: PcFacturacionImportPreview;
  profileSuggestion: BusinessProfileAutofillSuggestion;
  warnings: string[];
}

export interface PcFacturacionDetection {
  matches: boolean;
  missingTables: string[];
}

interface ParsedCustomer {
  sourceId: string;
  customer: Customer;
}

interface DwiNumbering {
  invoiceNext?: number;
  offerNext?: number;
  receiptNext?: number;
  customerNext?: number;
  invoiceTemplate?: string;
  offerTemplate?: string;
  receiptTemplate?: string;
}

function text(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function memo(value: unknown): string {
  return String(value ?? "").trim();
}

function firstText(row: MdbRow | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const direct = text(row[key]);
    if (direct) return direct;
    const match = Object.keys(row).find(
      (rowKey) => rowKey.toLowerCase() === key.toLowerCase(),
    );
    if (match) {
      const value = text(row[match]);
      if (value) return value;
    }
  }
  return "";
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
  return looksLikeCompanyName(value);
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
  const nif = extractSpanishTaxId(row.TaxNumber, row.VatID, row.Company, row.Name);
  const customerType = inferCustomerTypeFromIdentity({
    firstName,
    lastName,
    name: displayName,
    nif,
  });
  const createdAt = isoDateTime(row.CustomerDate);
  const customer: Customer = {
    id: pcfId("customer", source),
    customerType,
    firstName: customerType === "company" ? displayName : firstName,
    lastName: customerType === "company" ? "" : lastName,
    name: displayName,
    nif,
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

function parseCompanyProfileCandidate(
  row: MdbRow | undefined,
): BusinessProfileAutofillCandidate {
  if (!row) return {};
  return {
    name: firstText(row, [
      "Company",
      "CompanyName",
      "ClientName",
      "Name",
      "Firma",
      "RazonSocial",
      "RazónSocial",
      "BusinessName",
    ]),
    nif: extractSpanishTaxId(
      row.VatID,
      row.TaxNumber,
      row.NIF,
      row.CIF,
      row.TaxId,
      row.VATNumber,
      row.FiscalNumber,
      ...Object.values(row),
    ),
    address: firstText(row, [
      "Street",
      "Address",
      "Address1",
      "FiscalAddress",
      "Direccion",
      "Dirección",
      "Strasse",
      "Straße",
    ]),
    city: firstText(row, ["Town", "City", "Localidad", "Poblacion", "Población", "Ort"]),
    postalCode: firstText(row, [
      "ZIP",
      "Zip",
      "PostalCode",
      "PostCode",
      "CP",
      "CodigoPostal",
      "CódigoPostal",
      "PLZ",
    ]),
    phone: firstText(row, ["Telephone", "Phone", "Mobile", "Telefono", "Teléfono"]),
    email: firstText(row, ["Email", "EMail", "Mail", "Correo"]),
    iban: firstText(row, ["IBAN", "AccountNumber1", "AccountNumber", "BankAccount", "Cuenta"]),
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
    customerType: customer.customerType,
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
  const customerType = inferCustomerTypeFromIdentity({ ...split, name });
  return {
    customerType,
    ...split,
    firstName: customerType === "company" ? name : split.firstName,
    lastName: customerType === "company" ? "" : split.lastName,
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

function documentStatus(
  row: MdbRow,
  type: "factura" | "presupuesto",
  markUnpaidInvoicesAsPaid: boolean,
): DocumentStatus {
  if (type === "factura") {
    if (bool(row.Canceled)) return "anulada";
    if (bool(row.Paid) || markUnpaidInvoicesAsPaid) return "pagado";
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
  markUnpaidInvoicesAsPaid: boolean;
}): Document {
  const number = text(input.row[input.numberField]);
  const date = isoDate(input.row.Date);
  const createdAt = isoDateTime(input.row.Date);
  const items = input.positions.map((row, index) =>
    lineFromPosition(row, index, number),
  );
  const status = documentStatus(
    input.row,
    input.type,
    input.markUnpaidInvoicesAsPaid,
  );

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

export function detectPcFacturacionTables(
  tableNames: Iterable<string>,
): PcFacturacionDetection {
  const names = new Set(tableNames);
  const missingTables = PC_FACTURACION_REQUIRED_TABLES.filter(
    (name) => !names.has(name),
  );
  return {
    matches: missingTables.length === 0,
    missingTables,
  };
}

function parseDwiSections(input: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {};
  let current = "";

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = section[1];
      sections[current] ??= {};
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 0 || !current) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    sections[current][key] = value;
  }

  return sections;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

function buildTemplateFromDwi(format: string | undefined, token: string | undefined): string | undefined {
  const cleanToken = text(token);
  if (!cleanToken) return undefined;
  if (!format) return `${cleanToken}/{num}/`;

  const parts = format
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return `${cleanToken}/{num}/`;

  const template = parts
    .map((part) => {
      if (/^(abrev\.?|abreviatura)$/i.test(part)) return cleanToken;
      if (/^(n[ºo]\.?|numero|número)$/i.test(part)) return "{num}";
      if (/^vac[ií]o$/i.test(part)) return "";
      return part;
    })
    .join("");

  return template.includes("{num}") ? template : `${cleanToken}/{num}/`;
}

export function parsePcFacturacionDwi(input: string): DwiNumbering | null {
  const sections = parseDwiSections(input);
  const numberRange = sections.NumberRange;
  const token = sections.Token;
  if (!numberRange && !token) return null;

  const format = numberRange?.Format;
  const numbering: DwiNumbering = {
    invoiceNext: parsePositiveInteger(numberRange?.Invoice),
    offerNext: parsePositiveInteger(numberRange?.Offer),
    receiptNext: parsePositiveInteger(numberRange?.Receipt),
    customerNext: parsePositiveInteger(numberRange?.Customer),
    invoiceTemplate: buildTemplateFromDwi(format, token?.Invoice),
    offerTemplate: buildTemplateFromDwi(format, token?.Offer),
    receiptTemplate: buildTemplateFromDwi(format, token?.Receipt),
  };

  return Object.values(numbering).some(Boolean) ? numbering : null;
}

function lastUsedFromNext(next: number | undefined): number | undefined {
  if (!next) return undefined;
  return Math.max(0, next - 1);
}

function applyDwiNumbering(
  base: NumberingSettings,
  dwiText: string | undefined,
): { numbering: NumberingSettings; dwi: DwiNumbering | null } {
  if (!dwiText?.trim()) return { numbering: base, dwi: null };
  const dwi = parsePcFacturacionDwi(dwiText);
  if (!dwi) return { numbering: base, dwi: null };

  return {
    dwi,
    numbering: {
      ...base,
      lastSequence: {
        ...base.lastSequence,
        factura: lastUsedFromNext(dwi.invoiceNext) ?? base.lastSequence.factura,
        presupuesto: lastUsedFromNext(dwi.offerNext) ?? base.lastSequence.presupuesto,
        recibo: lastUsedFromNext(dwi.receiptNext) ?? base.lastSequence.recibo,
      },
      formats: {
        ...base.formats,
        factura: dwi.invoiceTemplate
          ? { template: dwi.invoiceTemplate, padding: 1 }
          : base.formats.factura,
        presupuesto: dwi.offerTemplate
          ? { template: dwi.offerTemplate, padding: 1 }
          : base.formats.presupuesto,
        recibo: dwi.receiptTemplate
          ? { template: dwi.receiptTemplate, padding: 1 }
          : base.formats.recibo,
      },
    },
  };
}

function buildNumberingPreview(
  numbering: NumberingSettings,
  dwi: DwiNumbering | null,
): PcFacturacionImportPreview["numbering"] {
  if (!dwi) return undefined;
  return {
    nextInvoiceNumber: dwi.invoiceNext
      ? formatDocumentNumber("factura", numbering.year, dwi.invoiceNext, numbering)
      : undefined,
    nextOfferNumber: dwi.offerNext
      ? formatDocumentNumber("presupuesto", numbering.year, dwi.offerNext, numbering)
      : undefined,
    nextReceiptNumber: dwi.receiptNext
      ? formatDocumentNumber("recibo", numbering.year, dwi.receiptNext, numbering)
      : undefined,
    nextCustomerNumber: dwi.customerNext,
  };
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
  const detectedProfileCandidate = parseCompanyProfileCandidate(tables.Client?.[0]);
  const profileForImportedDocuments = fillMissingBusinessProfileFields(
    current.profile,
    detectedProfileCandidate,
  );
  const { numbering, dwi } = applyDwiNumbering(
    current.profile.numbering,
    options.dwiText,
  );

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
  const unpaidInvoices = invoices.filter(
    (row) =>
      text(row.InvoiceNumber) && !bool(row.Canceled) && !bool(row.Paid),
  ).length;
  const importedInvoices = invoices
    .filter((row) => text(row.InvoiceNumber))
    .map((row) =>
      buildDocument({
        row,
        type: "factura",
        numberField: "InvoiceNumber",
        positions: invoicePositions.get(text(row.InvoiceNumber)) ?? [],
        customerBySource,
        profile: profileForImportedDocuments,
        markUnpaidInvoicesAsPaid: options.markUnpaidInvoicesAsPaid ?? false,
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
        profile: profileForImportedDocuments,
        markUnpaidInvoicesAsPaid: false,
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
  const profileSuggestion = buildBusinessProfileAutofillSuggestion(
    current.profile,
    completeBusinessProfileIvaFromDocuments(
      profileForImportedDocuments,
      importedDocuments,
      { preferMostUsedDefault: false },
    ),
  );
  const nextProfile = {
    ...current.profile,
    numbering,
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
    sourceName: PC_FACTURACION_SOURCE_NAME,
    companyName:
      detectedProfileCandidate.name || current.profile.name || "",
    customersWithDocuments: customersWithDocuments.length,
    unusedCustomers: unusedCustomers.length,
    blankCustomers,
    customersToImport: customersToImport.length,
    invoices: importedInvoices.length,
    unpaidInvoices,
    unpaidInvoicesMarkedPaid: options.markUnpaidInvoicesAsPaid ?? false,
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
    numbering: buildNumberingPreview(numbering, dwi),
  };

  const warnings: string[] = [];
  if (options.dwiText?.trim() && !dwi) {
    warnings.push(
      "El archivo DWI se ha leído, pero no contiene una numeración reconocible.",
    );
  }
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

  return { data, preview, profileSuggestion, warnings };
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
  const detection = detectPcFacturacionTables(reader.getTableNames());
  if (!detection.matches) {
    throw new Error(
      `No parece una base de ${PC_FACTURACION_SOURCE_NAME}. Faltan tablas: ${detection.missingTables.join(", ")}`,
    );
  }

  const tables: PcfTables = {};
  for (const name of PC_FACTURACION_REQUIRED_TABLES) {
    tables[name] = reader.getTable(name).getData() as MdbRow[];
  }
  return buildPcFacturacionImport(current, tables, options);
}
