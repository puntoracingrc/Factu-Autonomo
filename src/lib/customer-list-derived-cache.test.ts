import { describe, expect, it } from "vitest";

import {
  buildCustomerInvoicedTotalsCached,
  findDuplicateCustomerGroupsCached,
  sortCustomersCached,
} from "./customer-list-derived-cache";
import {
  PERSISTED_APP_DERIVED_CACHE_VERSION,
  rememberPersistedAppDerivedCache,
  type PersistedAppDerivedCache,
} from "./persisted-app-derived-cache";
import type { AppData, Customer } from "./types";
import { EMPTY_DATA } from "./types";

function customer(
  id: string,
  firstName: string,
  createdAt: string,
): Customer {
  return {
    id,
    name: `${firstName} Prueba`,
    firstName,
    lastName: "Prueba",
    nif: "12345678Z",
    createdAt,
    updatedAt: createdAt,
  };
}

function derived(
  customers: Customer[],
  recentDescendingIds: string[],
): PersistedAppDerivedCache {
  return {
    version: PERSISTED_APP_DERIVED_CACHE_VERSION,
    invoiceIntegrity: {
      blockedDocumentIds: [],
      claimedDocumentIds: [],
      validDocumentIds: [],
      issuesByDocumentId: [],
    },
    documentLists: { invoiceIds: [], quoteIds: [], receiptIds: [] },
    customerLists: {
      invoicedTotals: customers.map((item, index) => [item.id, index + 10]),
      recentDescendingIds,
      duplicateGroupIds: [customers.map((item) => item.id)],
    },
  };
}

function dataWithCustomers(customers: Customer[]): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile },
    documents: [],
    customers,
  };
}

describe("customer list derived cache", () => {
  it("reutiliza totales, orden y duplicados de la copia exacta", () => {
    const older = customer("customer-1", "Ana", "2026-01-01T00:00:00.000Z");
    const newer = customer("customer-2", "Berta", "2026-02-01T00:00:00.000Z");
    const data = dataWithCustomers([older, newer]);
    rememberPersistedAppDerivedCache(
      data,
      derived(data.customers, [older.id, newer.id]),
    );

    const totals = buildCustomerInvoicedTotalsCached(
      data.customers,
      data.documents,
    );
    const sorted = sortCustomersCached(
      data.customers,
      data.documents,
      "reciente",
      "desc",
      totals,
    );
    const duplicates = findDuplicateCustomerGroupsCached(
      data.customers,
      data.documents,
    );

    expect(totals.get(older.id)).toBe(10);
    expect(sorted.map((item) => item.id)).toEqual([older.id, newer.id]);
    expect(duplicates.map((group) => group.map((item) => item.id))).toEqual([
      [older.id, newer.id],
    ]);
  });

  it("descarta un orden persistido que no pertenece a los clientes", () => {
    const older = customer("customer-3", "Ana", "2026-01-01T00:00:00.000Z");
    const newer = customer("customer-4", "Berta", "2026-02-01T00:00:00.000Z");
    const data = dataWithCustomers([older, newer]);
    rememberPersistedAppDerivedCache(
      data,
      derived(data.customers, ["customer-unknown", older.id]),
    );

    const sorted = sortCustomersCached(
      data.customers,
      data.documents,
      "reciente",
      "desc",
    );

    expect(sorted.map((item) => item.id)).toEqual([newer.id, older.id]);
  });

  it("no mezcla ordenaciones que usan mapas de facturacion distintos", () => {
    const first = customer(
      "customer-5",
      "Ana",
      "2026-01-01T00:00:00.000Z",
    );
    const second = customer(
      "customer-6",
      "Berta",
      "2026-02-01T00:00:00.000Z",
    );
    const data = dataWithCustomers([first, second]);

    const firstOrder = sortCustomersCached(
      data.customers,
      data.documents,
      "facturacion",
      "desc",
      new Map([
        [first.id, 20],
        [second.id, 10],
      ]),
    );
    const secondOrder = sortCustomersCached(
      data.customers,
      data.documents,
      "facturacion",
      "desc",
      new Map([
        [first.id, 10],
        [second.id, 20],
      ]),
    );

    expect(firstOrder.map((item) => item.id)).toEqual([first.id, second.id]);
    expect(secondOrder.map((item) => item.id)).toEqual([second.id, first.id]);
  });
});
