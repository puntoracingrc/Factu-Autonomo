import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildCustomerInvoicedTotals,
  findDuplicateCustomerGroups,
  sortCustomers,
} from "./customers";
import {
  getFacturasIncludingRectificativas,
  sortDocumentsByNumberDesc,
  sortInvoicesByPeriodAndNumberDesc,
} from "./documents";
import { buildPersistedAppDerivedCache } from "./persisted-app-derived-cache-builder";
import type { AppData, Customer, Document } from "./types";
import { EMPTY_DATA } from "./types";

const NOW = "2026-08-02T10:00:00.000Z";

function customer(id: string, firstName: string, createdAt: string): Customer {
  return {
    id,
    name: `${firstName} Prueba`,
    firstName,
    lastName: "Prueba",
    nif: `${id.toUpperCase()}-NIF`,
    createdAt,
    updatedAt: createdAt,
  };
}

function document(
  id: string,
  type: Document["type"],
  number: string,
  customerId: string,
): Document {
  return {
    id,
    type,
    number,
    date: "2026-08-02",
    customerId,
    client: { name: "Cliente" },
    items: [
      {
        id: `${id}-item`,
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function sampleData(): AppData {
  const older = customer("customer-a", "Ana", "2026-01-01T00:00:00.000Z");
  const newer = customer(
    "customer-b",
    "Berta",
    "2026-02-01T00:00:00.000Z",
  );
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile },
    customers: [older, newer],
    documents: [
      document("invoice-1", "factura", "F-2026-0001", older.id),
      document("invoice-2", "factura", "F-2026-0002", newer.id),
      document("quote-1", "presupuesto", "P-2026-0001", older.id),
      document("receipt-1", "recibo", "R-2026-0001", newer.id),
    ],
  };
}

describe("persisted app derived cache builder", () => {
  it("serializa exactamente los resultados del camino completo actual", () => {
    const data = sampleData();
    const derived = buildPersistedAppDerivedCache(data);
    const totals = buildCustomerInvoicedTotals(
      data.customers,
      data.documents,
    );

    expect(derived.documentLists.invoiceIds).toEqual(
      sortInvoicesByPeriodAndNumberDesc(
        getFacturasIncludingRectificativas(data.documents),
        data.profile.numbering,
      ).map((item) => item.id),
    );
    expect(derived.documentLists.quoteIds).toEqual(
      sortDocumentsByNumberDesc(
        data.documents.filter((item) => item.type === "presupuesto"),
      ).map((item) => item.id),
    );
    expect(derived.documentLists.receiptIds).toEqual(
      sortDocumentsByNumberDesc(
        data.documents.filter((item) => item.type === "recibo"),
      ).map((item) => item.id),
    );
    expect(new Map(derived.customerLists.invoicedTotals)).toEqual(totals);
    expect(derived.customerLists.recentDescendingIds).toEqual(
      sortCustomers(
        data.customers,
        data.documents,
        "reciente",
        "desc",
        totals,
      ).map((item) => item.id),
    );
    expect(derived.customerLists.duplicateGroupIds).toEqual(
      findDuplicateCustomerGroups(data.customers).map((group) =>
        group.map((item) => item.id),
      ),
    );
  });

  it("calcula los indices tras normalizar y los liga a cada despliegue", () => {
    const workerSource = readFileSync(
      new URL("../workers/persisted-app-data-cache.worker.ts", import.meta.url),
      "utf8",
    );
    const configSource = readFileSync(
      new URL("../../next.config.ts", import.meta.url),
      "utf8",
    );
    const normalizeIndex = workerSource.indexOf(
      "const normalized = normalizeLoadedData",
    );
    const buildIndex = workerSource.indexOf(
      "const derived = buildPersistedAppDerivedCache",
    );
    const writeIndex = workerSource.indexOf(
      "await writePersistedAppDataCache(",
    );

    expect(normalizeIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(normalizeIndex);
    expect(writeIndex).toBeGreaterThan(buildIndex);
    expect(configSource).toContain("VERCEL_GIT_COMMIT_SHA");
    expect(configSource).toContain("NEXT_PUBLIC_APP_BUILD_SHA");
  });
});
