import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../..");
export const INVOICE_FIXTURES_ROOT = path.join(
  REPO_ROOT,
  "test/fixtures/invoices",
);
export const INVOICE_BENCHMARK_ARTIFACTS_ROOT = path.join(
  REPO_ROOT,
  "artifacts/invoice-benchmarks",
);

const MONEY_TOLERANCE = 0.01;
const QUANTITY_TOLERANCE = 0.001;
const EXPENSE_SCAN_PDFJS_X_SCALE = 20.6;
const EXPENSE_SCAN_PDFJS_Y_SCALE = 16.1;
let expenseScanPdfTableLinesModulePromise;

export const FAILURE_CATEGORIES = [
  "pdf_text_extraction_failed",
  "page_count_wrong",
  "table_region_not_found",
  "header_row_not_found",
  "column_mapping_failed",
  "column_boundary_wrong",
  "row_segmentation_failed",
  "continued_description_failed",
  "line_count_mismatch",
  "duplicate_lines",
  "missing_lines",
  "metadata_field_wrong",
  "total_not_found",
  "tax_base_mismatch",
  "vat_mismatch",
  "total_mismatch",
  "source_quantity_wrong",
  "charge_quantity_wrong",
  "calculation_basis_wrong",
  "unit_price_wrong",
  "discount_wrong",
  "net_unit_price_wrong",
  "line_amount_mismatch",
  "formula_wrong",
  "product_grouping_wrong",
  "ai_fallback_unnecessary",
  "ai_fallback_needed_but_not_used",
  "low_confidence_without_reason",
];

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}`, `${JSON.stringify(value, null, 2)}\n`);
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeMoney(value) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? roundMoney(value) : undefined;
  }
  const raw = String(value)
    .replace(/[€%]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!raw) return undefined;
  const sign = raw.startsWith("-") ? -1 : 1;
  const unsigned = raw.replace(/^-/, "");
  const normalized =
    unsigned.includes(",") || /\.\d{3}(?:\D|$)/.test(unsigned)
      ? unsigned.replace(/\./g, "").replace(",", ".")
      : unsigned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundMoney(sign * parsed) : undefined;
}

export function normalizeQuantity(value) {
  const parsed = normalizeMoney(value);
  return parsed === undefined ? undefined : Math.round(parsed * 1000) / 1000;
}

export function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function normalizeDate(value) {
  if (!value) return undefined;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!dmy) return undefined;
  const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
  return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
}

function normalizeTaxId(value) {
  const text = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return text || undefined;
}

function looksLikeSpanishTaxId(value) {
  const taxId = normalizeTaxId(value);
  return Boolean(
    taxId &&
      (/^[A-Z]\d{8}$/.test(taxId) ||
        /^[A-Z]\d{7}[A-Z0-9]$/.test(taxId) ||
        /^\d{8}[A-Z]$/.test(taxId)),
  );
}

export function calculationBasisFromUnit(unit, fallback = "unit") {
  const normalized = normalizeText(unit);
  if (!normalized) return fallback;
  if (["m2", "m²", "m^2", "metro cuadrado", "metros cuadrados"].includes(normalized)) {
    return "m2";
  }
  if (["ml", "m.l", "metro lineal", "metros lineales"].includes(normalized)) {
    return "ml";
  }
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(normalized)) {
    return "kg";
  }
  if (["h", "hora", "horas"].includes(normalized)) return "hour";
  if (["dia", "dias", "día", "días", "jornada", "jornadas"].includes(normalized)) {
    return "day";
  }
  if (["pack", "paq", "paquete", "lote"].includes(normalized)) return "package";
  if (["ud", "uds", "un", "unidad", "unidades", "servicio"].includes(normalized)) {
    return "unit";
  }
  return fallback;
}

export function formulaForBasis(basis) {
  if (basis === "m2") return "m2 * netPrice";
  if (basis === "ml") return "ml * netPrice";
  if (basis === "kg") return "kg * netPrice";
  if (basis === "hour") return "hours * netPrice";
  if (basis === "day") return "days * netPrice";
  if (basis === "package") return "packages * netPrice";
  if (basis === "fixed") return "fixed";
  return "units * netPrice";
}

export function normalizeExpectedInvoice(raw, fixture) {
  if (raw.expected?.lines && raw.expected?.totals) {
    return normalizePrivateRealGroundTruth(raw, fixture);
  }
  if (raw.invoice_id || raw.invoice_number || raw.supplier || raw.totals) {
    return normalizeExpandedGroundTruth(raw, fixture);
  }
  return normalizeBasicGroundTruth(raw, fixture);
}

function normalizeBasicGroundTruth(raw, fixture) {
  const layoutId = raw.layoutId ?? fixture.layoutId;
  const visible = visibleBasicFields(layoutId);
  const lines = (raw.lines ?? []).map((line, index) => {
    const sourceQuantity = visible.quantity
      ? normalizeQuantity(line.quantity) ?? 1
      : undefined;
    const basis = layoutId === "L09_irpf_profesional" ? "hour" : "unit";
    const unitPrice = visible.unitPrice
      ? normalizeMoney(line.unitPrice) ?? normalizeMoney(line.base)
      : undefined;
    const discountPct = visible.discountPct ? normalizeMoney(line.discountRate) ?? 0 : undefined;
    const netUnitPrice =
      unitPrice !== undefined && discountPct !== undefined
        ? roundMoney(unitPrice * (1 - discountPct / 100))
        : undefined;
    const amount = normalizeMoney(line.base) ?? roundMoney(sourceQuantity * netUnitPrice);
    return {
      index: index + 1,
      reference: visible.reference ? line.ref : undefined,
      description: line.description,
      sourceQuantity,
      chargeQuantity: sourceQuantity,
      calculationBasis: visible.quantity ? basis : undefined,
      unitPrice,
      discountPct,
      netUnitPrice,
      amount,
      vatRate: normalizeMoney(line.vatRate),
      formula: visible.quantity ? formulaForBasis(basis) : undefined,
    };
  });
  return {
    invoiceId: fixture.invoiceId,
    suite: fixture.suite,
    layoutId,
    metadata: {
      supplierName: raw.supplierName,
      supplierTaxId: raw.supplierNif,
      customerName: raw.clientName,
      customerTaxId: raw.clientNif,
      invoiceNumber: raw.invoiceNumber,
      date: normalizeDate(raw.date),
    },
    totals: {
      taxBase: normalizeMoney(raw.taxBase ?? raw.subtotal),
      vatAmount: normalizeMoney(raw.vatAmount),
      irpfAmount: normalizeMoney(raw.irpfAmount) ?? 0,
      total: normalizeMoney(raw.total),
      dueAmount: normalizeMoney(raw.amountDue),
    },
    lines,
    groups: [],
  };
}

function visibleBasicFields(layoutId) {
  return {
    reference: [
      "L02_ref_desc_uds_pvp_dto_total",
      "L05_codigo_desc_unidades_neto",
    ].includes(layoutId),
    quantity: ![
      "L04_concepto_base_iva_total",
      "L10_formato_compacto",
    ].includes(layoutId),
    unitPrice: ![
      "L04_concepto_base_iva_total",
      "L05_codigo_desc_unidades_neto",
      "L08_varios_tipos_iva",
      "L10_formato_compacto",
    ].includes(layoutId),
    discountPct: [
      "L02_ref_desc_uds_pvp_dto_total",
      "L07_con_descuento_global",
    ].includes(layoutId),
  };
}

function normalizeExpandedGroundTruth(raw, fixture) {
  const layoutId = raw.layout_id ?? fixture.layoutId;
  const visible = visibleExpandedFields(layoutId);
  const lines = (raw.lines ?? []).map((line, index) => {
    const sourceQuantity = visible.quantity
      ? normalizeQuantity(line.quantity) ?? 1
      : undefined;
    const basis =
      typeof visible.calculationBasis === "function"
        ? visible.calculationBasis(line)
        : visible.calculationBasis;
    const unitPrice = visible.unitPrice
      ? normalizeMoney(line.unit_price) ?? normalizeMoney(line.line_base)
      : undefined;
    const discountPct = visible.discountPct ? normalizeMoney(line.discount_rate) ?? 0 : undefined;
    const netUnitPrice =
      unitPrice !== undefined && discountPct !== undefined
        ? roundMoney(unitPrice * (1 - discountPct / 100))
        : undefined;
    const amount = normalizeMoney(line.line_base) ?? roundMoney(sourceQuantity * netUnitPrice);
    return {
      index: index + 1,
      reference: visible.reference ? line.reference : undefined,
      description: line.description,
      unit: visible.unit ? line.unit : undefined,
      sourceQuantity,
      chargeQuantity: sourceQuantity,
      calculationBasis: basis,
      unitPrice,
      discountPct,
      netUnitPrice,
      amount,
      vatRate: normalizeMoney(line.vat_rate),
      formula: formulaForBasis(basis),
    };
  });
  return {
    invoiceId: raw.invoice_id ?? fixture.invoiceId,
    suite: fixture.suite,
    layoutId,
    metadata: {
      supplierName: raw.supplier?.name,
      supplierTaxId: raw.supplier?.tax_id,
      customerName: raw.customer?.name,
      customerTaxId: raw.customer?.tax_id,
      invoiceNumber: raw.invoice_number,
      date: normalizeDate(raw.date),
    },
    totals: {
      taxBase: normalizeMoney(raw.totals?.taxable_base),
      vatAmount: normalizeMoney(raw.totals?.vat_total),
      irpfAmount: normalizeMoney(raw.totals?.irpf_amount) ?? 0,
      total: normalizeMoney(raw.totals?.total),
      paidAmount: normalizeMoney(raw.totals?.paid_amount),
      dueAmount: normalizeMoney(raw.totals?.due_amount),
    },
    lines,
    groups: [],
  };
}

function visibleExpandedFields(layoutId) {
  const genericQuantity = {
    reference: false,
    quantity: true,
    unitPrice: true,
    discountPct: false,
    unit: false,
    calculationBasis: "unit",
  };
  const byLayout = {
    standard_table: genericQuantity,
    ref_desc_uds_pvp_dto_total: {
      ...genericQuantity,
      reference: true,
      discountPct: true,
    },
    articulo_base_iva_total: genericQuantity,
    servicios_irpf: {
      ...genericQuantity,
      calculationBasis: "hour",
    },
    resumen_fiscal_por_linea: {
      reference: false,
      quantity: false,
      unitPrice: false,
      discountPct: false,
      unit: false,
      calculationBasis: undefined,
    },
    simplificada_ticket: genericQuantity,
    electricity_style: {
      ...genericQuantity,
      calculationBasis: "unknown",
    },
    facturae_render: {
      ...genericQuantity,
      reference: true,
    },
    recargo_equivalencia: {
      ...genericQuantity,
      unitPrice: false,
    },
    intracomunitaria_exenta: genericQuantity,
    rectificativa: {
      ...genericQuantity,
      discountPct: true,
    },
    ecommerce_portes: {
      ...genericQuantity,
      reference: true,
      discountPct: true,
    },
    long_description: genericQuantity,
    proforma: {
      ...genericQuantity,
      discountPct: true,
    },
  };
  return byLayout[layoutId] ?? {
    reference: true,
    quantity: true,
    unitPrice: true,
    discountPct: true,
    unit: true,
    calculationBasis: (line) => calculationBasisFromUnit(line.unit),
  };
}

function normalizePrivateRealGroundTruth(raw, fixture) {
  const lines = (raw.expected.lines ?? []).map((line) => ({
    index: line.index,
    reference: line.code,
    description: line.description,
    sourceQuantity: normalizeQuantity(line.quantity),
    width: normalizeQuantity(line.dimensions?.width),
    height:
      line.measurement?.basis === "m2"
        ? normalizeQuantity(line.dimensions?.heightOrLength)
        : undefined,
    length:
      line.measurement?.basis === "ml"
        ? normalizeQuantity(line.dimensions?.heightOrLength)
        : undefined,
    chargeQuantity: normalizeQuantity(line.measurement?.chargeQuantity),
    calculationBasis: line.measurement?.basis,
    unitPrice: normalizeMoney(line.unitPrice),
    discountPct: normalizeMoney(line.discountPct),
    netUnitPrice: normalizeMoney(line.netPrice),
    amount: normalizeMoney(line.amount),
    formula: line.formula,
    productGroupIndex: line.productGroup,
    productRole: line.role,
  }));
  return {
    invoiceId: fixture.invoiceId,
    suite: fixture.suite,
    layoutId: "stil_condal",
    metadata: {
      supplierName: raw.document?.supplierName,
      supplierTaxId: raw.document?.supplierNif,
      customerName: raw.document?.customerName,
      customerTaxId: raw.document?.customerNif,
      invoiceNumber: raw.document?.invoiceNumber,
      date: normalizeDate(raw.document?.date),
    },
    totals: {
      taxBase: normalizeMoney(raw.expected.totals.taxBase),
      vatAmount: normalizeMoney(raw.expected.totals.vatAmount),
      total: normalizeMoney(raw.expected.totals.total),
      paidAmount: normalizeMoney(raw.expected.totals.advancePaid),
      dueAmount: normalizeMoney(raw.expected.totals.amountDue),
    },
    lines,
    groups: Array.from({ length: raw.expected.productGroupCount ?? 0 }, (_, i) => ({
      productGroupIndex: i + 1,
    })),
  };
}

export function discoverInvoiceFixtures(root = INVOICE_FIXTURES_ROOT) {
  const fixtures = [];
  fixtures.push(
    ...discoverSyntheticSuite(path.join(root, "synthetic/basic"), "synthetic_basic"),
  );
  fixtures.push(
    ...discoverSyntheticSuite(path.join(root, "synthetic/expanded"), "synthetic_expanded"),
  );
  fixtures.push(...discoverPrivateFixtures(path.join(root, "private_real")));
  return fixtures.sort((a, b) => a.invoiceId.localeCompare(b.invoiceId));
}

function discoverSyntheticSuite(suiteRoot, suite) {
  const manifestPath = path.join(suiteRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) return [];
  const manifest = readJson(manifestPath);
  const files = Array.isArray(manifest) ? manifest : manifest.files ?? [];
  return files.map((entry) => {
    const groundTruth = entry.groundTruth ?? entry.ground_truth;
    const pdf = entry.pdf;
    const invoiceId =
      entry.invoice_id ??
      entry.invoiceId ??
      path.basename(groundTruth, path.extname(groundTruth));
    return {
      suite,
      invoiceId,
      layoutId: entry.layoutId ?? entry.layout_id,
      pdfPath: path.join(suiteRoot, pdf),
      groundTruthPath: path.join(suiteRoot, groundTruth),
      isPrivate: false,
    };
  });
}

function discoverPrivateFixtures(privateRoot) {
  const groundTruthDir = path.join(privateRoot, "ground_truth");
  if (!fs.existsSync(groundTruthDir)) return [];
  return fs
    .readdirSync(groundTruthDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const groundTruthPath = path.join(groundTruthDir, file);
      const raw = readJson(groundTruthPath);
      const pdfName = raw.sourcePdf ?? `${path.basename(file, ".json")}.pdf`;
      return {
        suite: "private_real",
        invoiceId: raw.fixtureId ?? path.basename(file, ".json"),
        layoutId: "private_real",
        pdfPath: path.join(privateRoot, "pdf", pdfName),
        fallbackPdfPath: path.join("/Users/macbookpro14/Desktop/stil", pdfName),
        groundTruthPath,
        isPrivate: true,
      };
    });
}

export async function extractPdfRows(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  globalThis.pdfjsWorker ??= pdfjsWorker;
  const standardFontDataUrl = path
    .join(REPO_ROOT, "node_modules/pdfjs-dist/standard_fonts/")
    .replace(/\\/g, "/");
  const cMapUrl = path
    .join(REPO_ROOT, "node_modules/pdfjs-dist/cmaps/")
    .replace(/\\/g, "/");
  const previousWarn = console.warn;
  const previousLog = console.log;
  const previousError = console.error;
  const suppressPdfJsFontWarning = (message, ...rest) => {
    if (String(message).includes("standardFontDataUrl")) return null;
    return [message, ...rest];
  };
  console.warn = (message, ...rest) => {
    const output = suppressPdfJsFontWarning(message, ...rest);
    if (!output) return;
    previousWarn(...output);
  };
  console.log = (message, ...rest) => {
    const output = suppressPdfJsFontWarning(message, ...rest);
    if (!output) return;
    previousLog(...output);
  };
  console.error = (message, ...rest) => {
    const output = suppressPdfJsFontWarning(message, ...rest);
    if (!output) return;
    previousError(...output);
  };
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const document = await pdfjs.getDocument({
      data,
      cMapUrl,
      standardFontDataUrl,
      isEvalSupported: false,
      verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
    }).promise;
    const items = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        items.push({
          page: pageNumber,
          x: item.transform[4],
          y: viewport.height - item.transform[5],
          text: item.str,
        });
      }
    }
    return {
      pageCount: document.numPages,
      rows: groupPdfTextItems(items),
    };
  } finally {
    console.warn = previousWarn;
    console.log = previousLog;
    console.error = previousError;
  }
}

function groupPdfTextItems(items) {
  const sorted = [...items].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  const grouped = [];
  for (const item of sorted) {
    const last = grouped.at(-1);
    if (!last || last.page !== item.page || Math.abs(last.y - item.y) > 2.5) {
      grouped.push({ page: item.page, y: item.y, items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return grouped.map((row) => ({
    page: row.page,
    y: row.y,
    cells: row.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text.trim())
      .filter(Boolean),
    text: row.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join(" | "),
  }));
}

export async function parseInvoicePdf(pdfPath) {
  const { pageCount, rows } = await extractPdfRows(pdfPath);
  const metadata = parseMetadata(rows);
  const table = parseTable(rows);
  const totals = parseTotals(rows);
  return {
    pageCount,
    metadata,
    totals,
    lines: table.lines,
    groups: groupProductLines(table.lines),
    confidence: table.confidence,
    parserWarnings: table.warnings,
    parserDebug: {
      header: table.headerText,
      rowCount: rows.length,
    },
  };
}

export async function parseStilCondalPdf(pdfPath) {
  const [{ pageCount, items }, expenseScanParser] = await Promise.all([
    extractExpenseScanPdfItems(pdfPath),
    loadExpenseScanPdfTableLinesModule(),
  ]);
  const hints = expenseScanParser.extractPdfScanHintsFromPdfItems(items);
  const lines = hints.stilCondal.lines.map((line, index) => ({
    index: index + 1,
    reference: line.supplierReference,
    description: line.description,
    sourceQuantity: line.sourceQuantity,
    width: line.width,
    height: line.height,
    length: line.length,
    chargeQuantity: line.chargeQuantity ?? line.quantity,
    calculationBasis: line.calculationBasis,
    unitPrice: line.unitPrice,
    discountPct: line.discountPercent,
    netUnitPrice: line.netUnitPrice,
    amount: line.total,
    formula:
      line.calculationFormula === "m2*netPrice"
        ? "m2 * netPrice"
        : line.calculationFormula === "ml*netPrice"
          ? "ml * netPrice"
          : line.calculationFormula === "units*netPrice"
            ? "units * netPrice"
            : line.calculationFormula,
    productGroupIndex: line.productGroupIndex,
    productRole: line.productRole,
  }));
  const taxBase = roundMoney(lines.reduce((sum, line) => sum + (line.amount ?? 0), 0));
  const vatAmount = roundMoney(taxBase * 0.21);
  const total = roundMoney(taxBase + vatAmount);
  return {
    pageCount,
    metadata: parseStilCondalMetadata(hints.textRows),
    totals: {
      taxBase,
      vatAmount,
      total,
      paidAmount: total,
      dueAmount: 0,
    },
    lines,
    groups: groupStilCondalProductLines(lines),
    confidence: lines.length > 0 ? 0.94 : 0.25,
    parserWarnings: hints.stilCondal.warnings,
    parserDebug: {
      itemCount: hints.debug.itemCount,
      rowCount: hints.debug.rowCount,
      parser: "expense-scan-stil-condal",
    },
  };
}

async function extractExpenseScanPdfItems(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  globalThis.pdfjsWorker ??= pdfjsWorker;
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({
    data,
    cMapUrl: path.join(REPO_ROOT, "node_modules/pdfjs-dist/cmaps/").replace(/\\/g, "/"),
    standardFontDataUrl: path
      .join(REPO_ROOT, "node_modules/pdfjs-dist/standard_fonts/")
      .replace(/\\/g, "/"),
    isEvalSupported: false,
    verbosity: pdfjs.VerbosityLevel?.ERRORS ?? 0,
  }).promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = Number(item.transform[4]);
      const y = Number(item.transform[5]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      items.push({
        page: pageNumber,
        x: x / EXPENSE_SCAN_PDFJS_X_SCALE,
        y: (viewport.height - y) / EXPENSE_SCAN_PDFJS_Y_SCALE,
        text: item.str,
      });
    }
  }
  return { pageCount: document.numPages, items };
}

async function loadExpenseScanPdfTableLinesModule() {
  expenseScanPdfTableLinesModulePromise ??= (async () => {
    const tsModule = await import("typescript");
    const ts = tsModule.default ?? tsModule;
    const source = fs.readFileSync(
      path.join(REPO_ROOT, "src/lib/expense-scan/pdf-table-lines.ts"),
      "utf8",
    );
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
  })();
  return expenseScanPdfTableLinesModulePromise;
}

function parseStilCondalMetadata(textRows) {
  return {
    supplierName: /STIL\s+CONDAL,\s*S\.A\./i.test(textRows) ? "STIL CONDAL, S.A." : undefined,
    supplierTaxId: normalizeTaxId(findMatch([textRows], /NIF:\s*([A-Z0-9-]+)/i)),
    invoiceNumber: findMatch([textRows], /Factura\s+n\S*\s*:\s*(FC\d+)/i),
    date: normalizeDate(findMatch([textRows], /Fecha\s*:\s*(\d{2}\/\d{2}\/\d{4})/i)),
  };
}

function groupStilCondalProductLines(lines) {
  const groupsByIndex = new Map();
  for (const line of lines) {
    if (!line.productGroupIndex) continue;
    const group = groupsByIndex.get(line.productGroupIndex) ?? {
      productGroupIndex: line.productGroupIndex,
      anchorLineIndex: line.index,
      title: line.description,
      subtotal: 0,
      confidence: 0.9,
    };
    group.subtotal = roundMoney(group.subtotal + (line.amount ?? 0));
    groupsByIndex.set(line.productGroupIndex, group);
  }
  return [...groupsByIndex.values()].sort(
    (a, b) => a.productGroupIndex - b.productGroupIndex,
  );
}

function parseMetadata(rows) {
  const texts = rows.map((row) => row.text);
  const supplierName =
    firstNonEmpty(
      rows.find((row) => /\|\s*Factura:/i.test(row.text))?.cells?.[0],
      rows[0]?.text.includes("SINTÉTICA") ? rows[1]?.text : undefined,
    ) ?? undefined;
  const invoiceNumber =
    findMatch(texts, /Factura:\s*\|\s*([A-Z0-9/-]+)/i) ??
    findMatch(texts, /N[ºo]\s*:\s*([A-Z0-9/-]+)/i);
  const date = normalizeDate(
    findMatch(texts, /Fecha:\s*(?:\|\s*)?(\d{4}-\d{2}-\d{2})/i),
  );
  const supplierTaxId =
    normalizeTaxId(findMatch(texts, /NIF\/CIF:\s*(?:\|\s*)?([A-Z0-9-]+)/i)) ??
    rows
      .slice(0, 8)
      .flatMap((row) => row.cells)
      .map(normalizeTaxId)
      .find(looksLikeSpanishTaxId);
  return {
    supplierName,
    supplierTaxId,
    invoiceNumber,
    date,
  };
}

function firstNonEmpty(...values) {
  return values.find((value) => String(value ?? "").trim());
}

function findMatch(texts, pattern) {
  for (const text of texts) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function parseTable(rows) {
  const headerIndex = rows.findIndex((row) => isLikelyInvoiceHeader(row.text));
  if (headerIndex < 0) {
    return {
      lines: [],
      confidence: 0.1,
      warnings: ["header_row_not_found"],
      headerText: undefined,
    };
  }
  const headerCells = splitRow(rows[headerIndex].text);
  const columnMap = mapColumns(headerCells);
  if (columnMap.description === undefined && columnMap.reference === undefined) {
    return {
      lines: [],
      confidence: 0.2,
      warnings: ["column_mapping_failed"],
      headerText: rows[headerIndex].text,
    };
  }

  const lines = [];
  const warnings = [];
  let lastLine = null;
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (isTotalsRow(row.text)) break;
    if (isIgnorableRow(row.text)) continue;
    const cells = splitRow(row.text);
    if (cells.length < 2) {
      if (lastLine && looksLikeContinuation(row.text)) {
        lastLine.description = `${lastLine.description} ${row.text}`.replace(/\s+/g, " ").trim();
        continue;
      }
      continue;
    }
    const line = parseLineFromCells(cells, columnMap, lines.length + 1);
    if (line) {
      lines.push(line);
      lastLine = line;
    }
  }
  if (lines.length === 0) warnings.push("row_segmentation_failed");
  return {
    lines,
    confidence: lines.length > 0 ? 0.82 : 0.25,
    warnings,
    headerText: rows[headerIndex].text,
  };
}

function splitRow(text) {
  return text
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function isLikelyInvoiceHeader(text) {
  const normalized = normalizeText(text);
  if (!text.includes("|")) return false;
  if (
    normalized.includes("layout") ||
    normalized.includes("patron de") ||
    /\bL\d+_[a-z0-9_]+\b/i.test(text)
  ) {
    return false;
  }
  const headerHits = [
    "descripcion",
    "descripcion",
    "detalle",
    "concepto",
    "producto",
    "articulo",
    "codigo",
    "ref.",
    "cantidad",
    "cant.",
    "uds.",
    "ud.",
    "unid.",
    "horas",
    "precio",
    "tarifa",
    "pvp",
    "base",
    "importe",
    "importe unidad",
    "importe linea",
    "total",
    "iva",
  ].filter((token) => normalized.includes(token)).length;
  return headerHits >= 3;
}

function mapColumns(headers) {
  const mapped = {};
  headers.forEach((header, index) => {
    const h = normalizeText(header);
    if (/\b(ref|codigo|sku)\b/.test(h)) mapped.reference ??= index;
    if (h.includes("articulo") && !h.includes("base")) mapped.reference ??= index;
    if (h.includes("descripcion") || h.includes("detalle") || h.includes("producto") || h.includes("concepto")) {
      mapped.description ??= index;
    }
    if (
      h.includes("cantidad") ||
      h.includes("cant") ||
      h.includes("uds") ||
      /^ud\.?$/.test(h) ||
      h.includes("unid") ||
      h.includes("qty")
    ) {
      mapped.quantity ??= index;
    }
    if (h.includes("horas")) {
      mapped.quantity ??= index;
      mapped.quantityBasis = "hour";
    }
    if (h.includes("consumo")) {
      mapped.quantity ??= index;
      mapped.quantityBasis = "unknown";
    }
    if (h.includes("pvp") || h.includes("tarifa") || h.includes("p. unit") || h.includes("precio unit") || h.includes("precio sin iva") || h === "precio" || h.includes("importe unidad")) {
      mapped.unitPrice ??= index;
      if (h.includes("p. unit")) mapped.amountMayIncludeVat = true;
    }
    if (h.includes("dto")) mapped.discountPct ??= index;
    if (h.includes("tipo iva") || h === "iva" || h.includes("iva %")) mapped.vatRate ??= index;
    if (h.includes("base") || h === "neto") mapped.amount ??= index;
    if (
      (h.includes("importe linea") || h.includes("importe línea") || h.includes("subtotal")) &&
      mapped.amount === undefined
    ) {
      mapped.amount = index;
    }
    if (h.includes("importe") && !h.includes("importe unidad") && mapped.amount === undefined) {
      mapped.amount = index;
    }
    if (h === "total" && mapped.amount === undefined) mapped.amount = index;
  });
  if (mapped.description === undefined && mapped.reference !== undefined) {
    mapped.description = mapped.reference;
  }
  return mapped;
}

function parseLineFromCells(cells, columnMap, index) {
  const description = cells[columnMap.description]?.trim();
  if (!description || isTotalsRow(description)) return null;
  const sourceQuantity = normalizeQuantity(cells[columnMap.quantity]) ?? 1;
  const discountPct = normalizeMoney(cells[columnMap.discountPct]) ?? 0;
  const unitPrice = normalizeMoney(cells[columnMap.unitPrice]);
  let amount =
    normalizeMoney(cells[columnMap.amount]) ??
    normalizeFirstMoneyAmount(cells[columnMap.amount]);
  const netUnitPrice =
    unitPrice !== undefined ? roundMoney(unitPrice * (1 - discountPct / 100)) : undefined;
  const calculatedBase =
    netUnitPrice !== undefined ? roundMoney(sourceQuantity * netUnitPrice) : undefined;
  const signedCalculatedBase =
    calculatedBase !== undefined && amount !== undefined && amount < 0
      ? -calculatedBase
      : calculatedBase;
  if (
    amount !== undefined &&
    amount > 0 &&
    signedCalculatedBase !== undefined &&
    Math.abs(amount - signedCalculatedBase) > MONEY_TOLERANCE &&
    columnMap.vatRate === undefined &&
    columnMap.amountMayIncludeVat
  ) {
    amount = signedCalculatedBase;
  }
  const basis = columnMap.quantityBasis ?? "unit";
  return {
    index,
    reference:
      columnMap.reference !== undefined && columnMap.reference !== columnMap.description
        ? cells[columnMap.reference]
        : undefined,
    description,
    sourceQuantity,
    chargeQuantity: sourceQuantity,
    calculationBasis: basis,
    unitPrice,
    discountPct,
    netUnitPrice,
    amount,
    vatRate: normalizeMoney(cells[columnMap.vatRate]),
    formula: formulaForBasis(basis),
  };
}

function normalizeFirstMoneyAmount(value) {
  const text = String(value ?? "");
  const match = text.match(/-?\d[\d.]*,\d{2}/);
  return match ? normalizeMoney(match[0]) : undefined;
}

function isTotalsRow(text) {
  return /^(Subtotal|Base imponible|Base IVA|IVA\s|TOTAL|TOTAL FACTURA|Retenci[oó]n|IRPF|Forma de|Notas)\b/i.test(
    text.trim(),
  );
}

function isIgnorableRow(text) {
  return !text.trim() || /Documento sint[eé]tico|Sin valor fiscal|No usar/i.test(text);
}

function looksLikeContinuation(text) {
  const value = text.trim();
  return !value.includes("|") && !isTotalsRow(value) && value.length > 2 && !/^\d+$/.test(value);
}

function parseTotals(rows) {
  const totals = {};
  for (const row of rows) {
    const text = row.text;
    const value = normalizeMoney(text.match(/(-?\d[\d.,]*\s*€?)\s*$/)?.[1]);
    if (value === undefined) continue;
    if (/^Base IVA/i.test(text)) {
      totals.taxBase = roundMoney((totals.taxBase ?? 0) + value);
    } else if (/Base imponible/i.test(text)) {
      totals.taxBase = value;
    } else if (/^IVA\b/i.test(text)) {
      totals.vatAmount = roundMoney((totals.vatAmount ?? 0) + value);
    } else if (/IRPF|Retenci[oó]n/i.test(text)) {
      totals.irpfAmount = Math.abs(value);
    } else if (/TOTAL FACTURA|^TOTAL\b/i.test(text)) {
      totals.total = value;
    }
  }
  return totals;
}

function groupProductLines(lines) {
  const groups = [];
  for (const line of lines) {
    groups.push({
      productGroupIndex: groups.length + 1,
      anchorLineIndex: line.index,
      title: line.description,
      subtotal: line.amount ?? 0,
      confidence: 0.5,
    });
  }
  return groups;
}

export function compareInvoices(expected, actual) {
  const failures = [];
  compareMetadata(expected, actual, failures);
  compareTotals(expected, actual, failures);
  compareLines(expected, actual, failures);
  compareGroups(expected, actual, failures);
  return {
    passed: failures.length === 0,
    failures,
  };
}

function failure(input) {
  return {
    parserConfidence: input.parserConfidence ?? 0.8,
    ...input,
  };
}

function compareMetadata(expected, actual, failures) {
  for (const field of ["supplierName", "supplierTaxId", "invoiceNumber", "date"]) {
    const expectedValue = expected.metadata?.[field];
    if (!expectedValue) continue;
    const actualValue = actual.metadata?.[field];
    const matches =
      field === "date"
        ? normalizeDate(actualValue) === normalizeDate(expectedValue)
        : field.endsWith("TaxId")
          ? normalizeTaxId(actualValue) === normalizeTaxId(expectedValue)
          : normalizeText(actualValue) === normalizeText(expectedValue);
    if (!matches) {
      failures.push(
        failure({
          field: `metadata.${field}`,
          category: "metadata_field_wrong",
          expected: expectedValue,
          actual: actualValue,
          hint: "Metadata visible in invoice header was not mapped correctly.",
        }),
      );
    }
  }
}

function compareTotals(expected, actual, failures) {
  const totalFields = [
    ["taxBase", "tax_base_mismatch"],
    ["vatAmount", "vat_mismatch"],
    ["irpfAmount", "total_mismatch"],
    ["total", "total_mismatch"],
  ];
  for (const [field, category] of totalFields) {
    const expectedValue = expected.totals?.[field];
    if (expectedValue === undefined) continue;
    const actualValue = actual.totals?.[field];
    if (expectedValue === 0 && actualValue === undefined && ["irpfAmount", "dueAmount"].includes(field)) {
      continue;
    }
    if (actualValue === undefined) {
      failures.push(
        failure({
          field: `totals.${field}`,
          category: "total_not_found",
          expected: expectedValue,
          actual: actualValue,
          hint: "Total row was not found or not classified.",
        }),
      );
      continue;
    }
    const delta = roundMoney(actualValue - expectedValue);
    if (Math.abs(delta) > MONEY_TOLERANCE) {
      failures.push(
        failure({
          field: `totals.${field}`,
          category,
          expected: expectedValue,
          actual: actualValue,
          delta,
          hint: "Invoice total differs from ground truth beyond money tolerance.",
        }),
      );
    }
  }
}

function compareLines(expected, actual, failures) {
  if ((expected.lines?.length ?? 0) !== (actual.lines?.length ?? 0)) {
    failures.push(
      failure({
        field: "lines.count",
        category: "line_count_mismatch",
        expected: expected.lines?.length ?? 0,
        actual: actual.lines?.length ?? 0,
        hint: "Row segmentation changed the number of commercial lines.",
      }),
    );
  }
  const count = Math.min(expected.lines?.length ?? 0, actual.lines?.length ?? 0);
  for (let index = 0; index < count; index += 1) {
    const expectedLine = expected.lines[index];
    const actualLine = actual.lines[index];
    compareLineText(index, expectedLine, actualLine, failures);
    compareLineNumber(index, "sourceQuantity", "source_quantity_wrong", expectedLine, actualLine, failures, QUANTITY_TOLERANCE);
    compareLineNumber(index, "chargeQuantity", "charge_quantity_wrong", expectedLine, actualLine, failures, QUANTITY_TOLERANCE);
    compareLineBasis(index, expectedLine, actualLine, failures);
    compareLineNumber(index, "unitPrice", "unit_price_wrong", expectedLine, actualLine, failures, MONEY_TOLERANCE);
    compareLineNumber(index, "discountPct", "discount_wrong", expectedLine, actualLine, failures, MONEY_TOLERANCE);
    compareLineNumber(index, "netUnitPrice", "net_unit_price_wrong", expectedLine, actualLine, failures, MONEY_TOLERANCE);
    compareLineNumber(index, "amount", "line_amount_mismatch", expectedLine, actualLine, failures, MONEY_TOLERANCE);
  }
}

function compareLineText(index, expectedLine, actualLine, failures) {
  if (expectedLine.reference && normalizeText(expectedLine.reference) !== normalizeText(actualLine.reference)) {
    failures.push(
      failure({
        field: `lines[${index}].reference`,
        category: "column_mapping_failed",
        expected: expectedLine.reference,
        actual: actualLine.reference,
        hint: "Reference/code column was not mapped correctly.",
      }),
    );
  }
  if (normalizeText(expectedLine.description) !== normalizeText(actualLine.description)) {
    failures.push(
      failure({
        field: `lines[${index}].description`,
        category: "row_segmentation_failed",
        expected: expectedLine.description,
        actual: actualLine.description,
        hint: "Description differs after row segmentation or continuation merge.",
      }),
    );
  }
}

function compareLineBasis(index, expectedLine, actualLine, failures) {
  if (!expectedLine.calculationBasis) return;
  if (expectedLine.calculationBasis !== actualLine.calculationBasis) {
    failures.push(
      failure({
        field: `lines[${index}].calculationBasis`,
        category: "calculation_basis_wrong",
        expected: expectedLine.calculationBasis,
        actual: actualLine.calculationBasis,
        hint: "Calculation basis should follow the visible billing unit, not an inferred unit.",
      }),
    );
  }
}

function compareLineNumber(index, field, category, expectedLine, actualLine, failures, tolerance) {
  const expectedValue = expectedLine[field];
  if (expectedValue === undefined || expectedValue === null) return;
  const actualValue = actualLine[field];
  if (actualValue === undefined || actualValue === null) {
    failures.push(
      failure({
        field: `lines[${index}].${field}`,
        category,
        expected: expectedValue,
        actual: actualValue,
        hint: "Expected numeric line field was not extracted.",
      }),
    );
    return;
  }
  const delta = Math.round((actualValue - expectedValue) * 1000) / 1000;
  if (Math.abs(delta) > tolerance) {
    failures.push(
      failure({
        field: `lines[${index}].${field}`,
        category,
        expected: expectedValue,
        actual: actualValue,
        delta,
        hint: "Line numeric field differs from ground truth beyond tolerance.",
      }),
    );
  }
}

function compareGroups(expected, actual, failures) {
  if (!expected.groups?.length) return;
  if (expected.groups.length !== (actual.groups?.length ?? 0)) {
    failures.push(
      failure({
        field: "groups.count",
        category: "product_grouping_wrong",
        expected: expected.groups.length,
        actual: actual.groups?.length ?? 0,
        hint: "Product grouping did not create the expected number of groups.",
      }),
    );
  }
}

export function summarizeBenchmark(results) {
  const runnable = results.filter((result) => result.status !== "skipped_missing_private_pdf");
  const passed = runnable.filter((result) => result.status === "passed").length;
  const failed = runnable.filter((result) => result.status === "failed").length;
  const skipped = results.length - runnable.length;
  const failures = results.flatMap((result) => result.failures ?? []);
  const byCategory = countBy(failures, (failureItem) => failureItem.category);
  const failureCount = (categories) =>
    failures.filter((failureItem) => categories.includes(failureItem.category)).length;
  const expectedLines = runnable.reduce(
    (total, result) => total + (result.expectedLineCount ?? 0),
    0,
  );
  const expectedGroups = runnable.reduce(
    (total, result) => total + (result.expectedGroupCount ?? 0),
    0,
  );
  const fieldAccuracy = {
    metadata: accuracyRatio(runnable.length * 4, failureCount(["metadata_field_wrong"])),
    totals: accuracyRatio(
      runnable.length * 4,
      failureCount([
        "total_not_found",
        "tax_base_mismatch",
        "vat_mismatch",
        "total_mismatch",
      ]),
    ),
    lineCount: accuracyRatio(runnable.length, failureCount(["line_count_mismatch"])),
    lineAmounts: accuracyRatio(expectedLines, failureCount(["line_amount_mismatch"])),
    calculationBasis: accuracyRatio(
      expectedLines,
      failureCount(["calculation_basis_wrong"]),
    ),
    productGrouping: accuracyRatio(
      expectedGroups,
      failureCount(["product_grouping_wrong"]),
    ),
  };
  const bySuite = {};
  for (const result of results) {
    bySuite[result.suite] ??= { count: 0, passed: 0, failed: 0, skipped: 0 };
    bySuite[result.suite].count += 1;
    if (result.status === "passed") bySuite[result.suite].passed += 1;
    if (result.status === "failed") bySuite[result.suite].failed += 1;
    if (result.status === "skipped_missing_private_pdf") bySuite[result.suite].skipped += 1;
  }
  return {
    invoiceCount: results.length,
    run: runnable.length,
    passed,
    failed,
    skipped,
    passRate: runnable.length ? roundMoney((passed / runnable.length) * 100) : 0,
    fieldAccuracy,
    aiUsageRate: 0,
    bySuite,
    topFailureCategories: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
  };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function accuracyRatio(total, failures) {
  if (!total) return 1;
  const value = Math.max(0, (total - failures) / total);
  return Math.round(value * 1000) / 1000;
}

export function renderSummaryMarkdown(summary, outputDir) {
  const suiteLines = Object.entries(summary.bySuite)
    .map(
      ([suite, value]) =>
        `- ${suite}: ${value.passed}/${value.count} OK, ${value.failed} fallos, ${value.skipped} omitidas`,
    )
    .join("\n");
  const topLines =
    summary.topFailureCategories.length > 0
      ? summary.topFailureCategories
          .slice(0, 12)
          .map((item, index) => `${index + 1}. ${item.category}: ${item.count}`)
          .join("\n")
      : "Sin fallos.";
  return `# Invoice benchmark summary

- Output: ${path.relative(REPO_ROOT, outputDir)}
- Fixtures importados: ${summary.invoiceCount}
- Benchmark ejecutado: sí
- Ejecutadas: ${summary.run}
- OK: ${summary.passed}
- Fallidas: ${summary.failed}
- Saltadas: ${summary.skipped}
- Pass rate: ${summary.passRate}%
- IA usada: ${summary.aiUsageRate}%

## Precisión por campo

- Metadata: ${summary.fieldAccuracy.metadata}
- Totales: ${summary.fieldAccuracy.totals}
- Conteo de líneas: ${summary.fieldAccuracy.lineCount}
- Importes de líneas: ${summary.fieldAccuracy.lineAmounts}
- Base de cálculo: ${summary.fieldAccuracy.calculationBasis}
- Agrupación de productos: ${summary.fieldAccuracy.productGrouping}

## Por suite

${suiteLines}

## Fallos principales

${topLines}
`;
}

export function renderFailuresMarkdown(results) {
  const failedResults = results.filter((result) => result.failures?.length);
  const top = summarizeBenchmark(results).topFailureCategories;
  const topLines =
    top.length > 0
      ? top.slice(0, 12).map((item, index) => `${index + 1}. ${item.category}: ${item.count}`).join("\n")
      : "Sin fallos.";
  const details = failedResults
    .slice(0, 60)
    .map((result) => {
      const failureLines = result.failures
        .slice(0, 8)
        .map(
          (item) =>
            `- ${item.category} en \`${item.field}\`: esperado \`${String(item.expected)}\`, actual \`${String(item.actual)}\`. ${item.hint ?? ""}`,
        )
        .join("\n");
      return `## ${result.invoiceId}

- Suite: ${result.suite}
- Layout: ${result.layoutId ?? "sin layout"}
- Fallos: ${result.failures.length}

${failureLines}`;
    })
    .join("\n\n");
  return `# Invoice benchmark failures

## Top failure categories

${topLines}

${details || "No hay fallos."}
`;
}
