import { isFixedExpense } from "@/lib/expense-classification";
import type { AppData, Document } from "@/lib/types";
import type {
  ProfitabilityExistingDataStatus,
  ProfitabilityExistingDataStatusItem,
} from "./types";

function list<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function statusFromCount(count: number): ProfitabilityExistingDataStatus {
  return count > 0 ? "read_only_connected" : "detected";
}

function quoteInvoiceRelationStatus(
  documents: Document[],
): ProfitabilityExistingDataStatus {
  const quotes = documents.filter((doc) => doc.type === "presupuesto");
  const invoices = documents.filter((doc) => doc.type === "factura");
  const quoteIds = new Set(quotes.map((quote) => quote.id));

  if (
    invoices.some(
      (invoice) =>
        invoice.sourceQuoteDocumentId &&
        !quoteIds.has(invoice.sourceQuoteDocumentId),
    )
  ) {
    return "risk_detected";
  }

  if (
    invoices.some(
      (invoice) =>
        invoice.sourceQuoteDocumentId &&
        quoteIds.has(invoice.sourceQuoteDocumentId),
    )
  ) {
    return "read_only_connected";
  }

  if (quotes.length > 0 && invoices.length > 0) return "pending_mapping";
  return "detected";
}

export function getRentabilidadRealExistingDataStatus(
  data: Partial<AppData> = {},
): ProfitabilityExistingDataStatusItem[] {
  const documents = list(data.documents);
  const expenses = list(data.expenses);
  const recurringExpenses = list(data.recurringExpenses);
  const products = list(data.products);
  const hasInvoices = documents.some((doc) => doc.type === "factura");
  const hasQuotes = documents.some((doc) => doc.type === "presupuesto");
  const hasFixedCosts =
    recurringExpenses.length > 0 || expenses.some(isFixedExpense);
  const hasAiScans = expenses.some(
    (expense) =>
      expense.origin === "scan" ||
      Boolean(expense.purchaseDocument) ||
      Boolean(expense.purchaseLines?.length),
  );
  const hasTaxableData = documents.length > 0 || expenses.length > 0;
  const hasFiscalRecord =
    Boolean(data.verifactuChain?.recordCount) ||
    documents.some((doc) => Boolean(doc.verifactu));
  const hasVerifactuConfig = Boolean(data.profile?.verifactu?.enabled);
  const googlePlacesEnabled = Boolean(data.profile?.googlePlaces?.enabled);

  return [
    {
      key: "invoices",
      label: "Facturas",
      status: statusFromCount(hasInvoices ? 1 : 0),
      detail: hasInvoices
        ? "Se leerán las facturas existentes como ingresos."
        : "El modelo de facturas está localizado para conectarlo cuando haya datos.",
      sourceLink: {
        sourceType: "invoice",
        label: "Facturas",
        href: "/facturas",
      },
    },
    {
      key: "quotes",
      label: "Presupuestos",
      status: statusFromCount(hasQuotes ? 1 : 0),
      detail: hasQuotes
        ? "Se leerán los presupuestos como trabajos previstos."
        : "El flujo de presupuestos está localizado para usarlo como previsión.",
      sourceLink: {
        sourceType: "quote",
        label: "Presupuestos",
        href: "/presupuestos",
      },
    },
    {
      key: "quote_invoice_relation",
      label: "Presupuesto → factura",
      status: quoteInvoiceRelationStatus(documents),
      detail:
        "Se usará el vínculo ya guardado entre presupuesto y factura cuando exista.",
      sourceLink: {
        sourceType: "quote",
        label: "Relación presupuesto → factura",
        href: "/presupuestos",
      },
    },
    {
      key: "expenses",
      label: "Gastos",
      status: statusFromCount(expenses.length),
      detail: expenses.length
        ? "Se leerán gastos existentes como candidatos a coste directo o indirecto."
        : "El módulo de gastos está localizado para leer costes cuando existan.",
      sourceLink: {
        sourceType: "expense",
        label: "Gastos",
        href: "/gastos",
      },
    },
    {
      key: "fixed_expenses",
      label: "Gastos fijos",
      status: hasFixedCosts ? "read_only_connected" : "detected",
      detail: hasFixedCosts
        ? "Hay gastos fijos o recurrentes disponibles para una futura regla de reparto."
        : "El flujo de gastos fijos está localizado; falta elegir regla de reparto.",
      sourceLink: {
        sourceType: "recurring_expense",
        label: "Gastos fijos",
        href: "/gastos/fijos",
      },
    },
    {
      key: "ai_scans",
      label: "Escaneos IA",
      status: hasAiScans ? "read_only_connected" : "detected",
      detail: hasAiScans
        ? "Los gastos escaneados y sus líneas de compra se leerán sin duplicar el escaneo."
        : "El escaneo IA ya existe en gastos; Rentabilidad Real solo leerá sus resultados.",
      sourceLink: {
        sourceType: "expense",
        label: "Escaneo IA",
        href: "/gastos/nuevo",
      },
    },
    {
      key: "articles",
      label: "Artículos",
      status: statusFromCount(products.length),
      detail: products.length
        ? "Se leerán artículos y materiales como catálogo de venta y coste."
        : "El catálogo está localizado para no recrear artículos en Rentabilidad Real.",
      sourceLink: {
        sourceType: "product",
        label: "Artículos",
        href: "/productos",
      },
    },
    {
      key: "taxes",
      label: "Impuestos",
      status: hasTaxableData ? "read_only_connected" : "detected",
      detail:
        "Se usará el resumen fiscal existente de IVA e IRPF como contexto, no como contabilidad paralela.",
      sourceLink: {
        sourceType: "tax_summary",
        label: "Impuestos",
        href: "/impuestos",
      },
    },
    {
      key: "fiscal_record",
      label: "Registro fiscal",
      status: hasFiscalRecord
        ? "read_only_connected"
        : hasVerifactuConfig
          ? "detected"
          : "not_found",
      detail:
        "El registro fiscal y Veri*Factu se mantienen en su flujo actual; Rentabilidad Real solo los consultará como evidencia.",
      sourceLink: {
        sourceType: "fiscal_record",
        label: "Registro fiscal",
        href: "/configuracion",
      },
    },
    {
      key: "google_drive",
      label: "Google Drive",
      status: "detected",
      detail:
        "La copia y sincronización de Drive existen como soporte documental, no como origen nuevo de cálculos.",
      sourceLink: {
        sourceType: "google_drive",
        label: "Google Drive",
        href: "/cuenta#sincronizacion-cuenta",
      },
    },
    {
      key: "google_addresses",
      label: "Direcciones Google",
      status: googlePlacesEnabled ? "read_only_connected" : "detected",
      detail:
        "Las direcciones se tomarán de clientes, proveedores y perfil; Google Places solo ayuda al autocompletado.",
      sourceLink: {
        sourceType: "google_places",
        label: "Direcciones Google",
        href: "/configuracion",
      },
    },
    {
      key: "document_autofill",
      label: "Autorrelleno",
      status: "detected",
      detail:
        "El autorrelleno desde texto crea documentos en el flujo actual; Rentabilidad Real leerá el resultado final.",
      sourceLink: {
        sourceType: "document_autofill",
        label: "Autorrelleno de documentos",
        href: "/facturas/nuevo",
      },
    },
    {
      key: "admin_diagnostics",
      label: "Admin",
      status: "detected",
      detail:
        "La zona admin sirve para diagnóstico de salud, usuarios e IA; no debe ser una fuente editable de Rentabilidad Real.",
      sourceLink: {
        sourceType: "admin",
        label: "/admin",
        href: "/admin",
      },
    },
  ];
}
