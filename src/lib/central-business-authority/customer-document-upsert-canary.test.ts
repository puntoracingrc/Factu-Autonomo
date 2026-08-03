import { describe, expect, it, vi } from "vitest";

import { EMPTY_DATA, type Customer } from "@/lib/types";

import { upsertCustomerForDocumentWithCentralCanary } from "./customer-document-upsert-canary";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CENTRAL_ENV = {
  enabled: "true",
  userIds: USER_ID,
};

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer-1",
    customerType: "company",
    firstName: "Cliente Sintetico SL",
    lastName: "",
    name: "Cliente Sintetico SL",
    nif: "B00000001",
    email: "cliente@example.test",
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("central customer document upsert", () => {
  it("conserva el flujo local fuera del rollout central", async () => {
    const fallback = vi.fn(() => ({
      ok: true as const,
      customerId: "local-customer",
      client: { name: "Cliente local" },
    }));
    const result = await upsertCustomerForDocumentWithCentralCanary({
      userId: USER_ID,
      customerInput: { firstName: "Cliente local", lastName: "" },
      selectedCustomerId: null,
      dependencies: {
        getCurrentData: () => EMPTY_DATA,
        fallback,
        createCustomer: vi.fn(),
        updateCustomer: vi.fn(),
        environment: { enabled: "false", userIds: USER_ID },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      customerId: "local-customer",
      delivery: "local",
    });
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("crea en central el cliente escrito dentro de una factura o presupuesto", async () => {
    const created = customer();
    const createCustomer = vi.fn(async () => ({
      ok: true as const,
      customer: created,
      delivery: "central_confirmed" as const,
    }));
    const result = await upsertCustomerForDocumentWithCentralCanary({
      userId: USER_ID,
      customerInput: {
        customerType: "company",
        firstName: "Cliente Sintetico SL",
        lastName: "",
        nif: "B00000001",
        email: "cliente@example.test",
      },
      selectedCustomerId: null,
      dependencies: {
        getCurrentData: () => EMPTY_DATA,
        fallback: vi.fn(),
        createCustomer,
        updateCustomer: vi.fn(),
        environment: CENTRAL_ENV,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      customerId: created.id,
      delivery: "central_confirmed",
    });
    expect(createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Cliente Sintetico SL",
        nif: "B00000001",
      }),
    );
  });

  it("no crea eventos ni versiones si el maestro no ha cambiado", async () => {
    const existing = customer();
    const updateCustomer = vi.fn();
    const result = await upsertCustomerForDocumentWithCentralCanary({
      userId: USER_ID,
      customerInput: {
        customerType: existing.customerType,
        firstName: existing.firstName,
        lastName: existing.lastName,
        nif: existing.nif,
        email: existing.email,
      },
      selectedCustomerId: existing.id,
      dependencies: {
        getCurrentData: () => ({ ...EMPTY_DATA, customers: [existing] }),
        fallback: vi.fn(),
        createCustomer: vi.fn(),
        updateCustomer,
        environment: CENTRAL_ENV,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      customerId: existing.id,
      delivery: "unchanged",
    });
    expect(updateCustomer).not.toHaveBeenCalled();
  });

  it("actualiza centralmente una ficha modificada desde el documento", async () => {
    const existing = customer();
    const updateCustomer = vi.fn(async (updated: Customer) => ({
      ok: true as const,
      value: updated,
      delivery: "central_confirmed" as const,
    }));
    const result = await upsertCustomerForDocumentWithCentralCanary({
      userId: USER_ID,
      customerInput: {
        customerType: existing.customerType,
        firstName: existing.firstName,
        lastName: existing.lastName,
        nif: existing.nif,
        email: "nuevo@example.test",
      },
      selectedCustomerId: existing.id,
      dependencies: {
        getCurrentData: () => ({ ...EMPTY_DATA, customers: [existing] }),
        fallback: vi.fn(),
        createCustomer: vi.fn(),
        updateCustomer,
        environment: CENTRAL_ENV,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      customerId: existing.id,
      delivery: "central_confirmed",
    });
    expect(updateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: "nuevo@example.test" }),
    );
  });
});
