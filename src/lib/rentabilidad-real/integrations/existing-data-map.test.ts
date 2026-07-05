import { describe, expect, it } from "vitest";
import {
  EMPTY_DATA,
  type AppData,
  type Document,
  type Expense,
  type Product,
} from "@/lib/types";
import { getRentabilidadRealExistingDataStatus } from "./existing-data-map";
import type { ProfitabilityExistingDataStatusItem } from "./types";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type AppDataOverrides = Omit<Partial<AppData>, "profile"> & {
  profile?: Partial<AppData["profile"]>;
};

function baseAppData(overrides: AppDataOverrides = {}): AppData {
  return {
    ...deepClone(EMPTY_DATA),
    ...overrides,
    profile: {
      ...deepClone(EMPTY_DATA.profile),
      ...overrides.profile,
    },
    documents: overrides.documents ?? [],
    expenses: overrides.expenses ?? [],
    recurringExpenses: overrides.recurringExpenses ?? [],
    userReminders: overrides.userReminders ?? [],
    suppliers: overrides.suppliers ?? [],
    products: overrides.products ?? [],
    customers: overrides.customers ?? [],
    counters: {
      ...EMPTY_DATA.counters,
      ...overrides.counters,
    },
  };
}

function statusByKey(items: ProfitabilityExistingDataStatusItem[]) {
  return Object.fromEntries(items.map((item) => [item.key, item.status]));
}

function documentFixture(overrides: Partial<Document>): Document {
  return {
    id: "invoice_1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-07-01",
    client: {
      name: "Cliente Demo",
    },
    items: [
      {
        id: "line_1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function expenseFixture(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense_1",
    date: "2026-07-02",
    origin: "scan",
    businessKind: "fixed",
    supplierName: "Proveedor Demo",
    description: "Cuota mensual",
    amount: 30,
    ivaPercent: 21,
    category: "Software",
    paymentMethod: "Tarjeta",
    purchaseDocument: {
      invoiceNumber: "S-1",
    },
    createdAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

function productFixture(overrides: Partial<Product> = {}): Product {
  return {
    id: "product_1",
    key: "material demo",
    name: "Material demo",
    family: "Materiales",
    source: "detected",
    cost: 12,
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z",
    ...overrides,
  };
}

describe("getRentabilidadRealExistingDataStatus", () => {
  it("returns detected states for an empty workspace with known app flows", () => {
    const status = statusByKey(
      getRentabilidadRealExistingDataStatus(baseAppData()),
    );

    expect(status.invoices).toBe("detected");
    expect(status.quotes).toBe("detected");
    expect(status.quote_invoice_relation).toBe("detected");
    expect(status.google_drive).toBe("detected");
    expect(status.admin_diagnostics).toBe("detected");
  });

  it("returns connected read-only states when existing data is present", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
    });
    const invoice = documentFixture({
      id: "invoice_1",
      type: "factura",
      sourceQuoteDocumentId: "quote_1",
      verifactu: {
        recordHash: "hash",
        previousHash: "",
        recordTimestamp: "2026-07-01T10:00:00.000Z",
        qrUrl: "https://example.com/qr",
        status: "test_registered",
        recordType: "alta",
        environment: "test",
      },
    });
    const data = baseAppData({
      profile: {
        googlePlaces: {
          enabled: true,
        },
      },
      documents: [quote, invoice],
      expenses: [expenseFixture()],
      products: [productFixture()],
    });

    const status = statusByKey(getRentabilidadRealExistingDataStatus(data));

    expect(status.invoices).toBe("read_only_connected");
    expect(status.quotes).toBe("read_only_connected");
    expect(status.quote_invoice_relation).toBe("read_only_connected");
    expect(status.expenses).toBe("read_only_connected");
    expect(status.fixed_expenses).toBe("read_only_connected");
    expect(status.ai_scans).toBe("read_only_connected");
    expect(status.articles).toBe("read_only_connected");
    expect(status.taxes).toBe("read_only_connected");
    expect(status.fiscal_record).toBe("read_only_connected");
    expect(status.google_addresses).toBe("read_only_connected");
  });

  it("marks quote to invoice relation as pending or risk when mapping is incomplete", () => {
    const quote = documentFixture({
      id: "quote_1",
      type: "presupuesto",
      number: "P-2026-0001",
    });
    const unlinkedInvoice = documentFixture({
      id: "invoice_1",
      type: "factura",
    });
    const brokenInvoice = documentFixture({
      id: "invoice_2",
      type: "factura",
      sourceQuoteDocumentId: "missing_quote",
    });

    expect(
      statusByKey(
        getRentabilidadRealExistingDataStatus(
          baseAppData({ documents: [quote, unlinkedInvoice] }),
        ),
      ).quote_invoice_relation,
    ).toBe("pending_mapping");
    expect(
      statusByKey(
        getRentabilidadRealExistingDataStatus(
          baseAppData({ documents: [quote, brokenInvoice] }),
        ),
      ).quote_invoice_relation,
    ).toBe("risk_detected");
  });
});
