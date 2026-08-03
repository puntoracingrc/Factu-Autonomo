"use client";

import {
  customerToClient,
  ensureCustomerForDocument,
  migrateCustomer,
  type ClientInput,
} from "@/lib/customers";
import type { AppData, Client, Customer } from "@/lib/types";

import {
  isCentralCustomerCreateCanaryEnabledForUser,
  type CentralCustomerCreateCanaryEnvironment,
  type CentralCustomerCreateResult,
} from "./customer-create-canary";
import type { CentralBusinessEntityMutationResult } from "./entity-mutation-canary";

export const CENTRAL_CUSTOMER_DOCUMENT_UPSERT_CANARY =
  "CENTRAL_CUSTOMER_DOCUMENT_UPSERT_CANARY_V1";

type CustomerDraft = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export type CentralCustomerDocumentUpsertResult =
  | {
      ok: true;
      customerId: string;
      client: Client;
      delivery:
        | "local"
        | "central_confirmed"
        | "central_pending"
        | "central_review"
        | "unchanged";
    }
  | { ok: false; error: string };

export interface CentralCustomerDocumentUpsertDependencies {
  getCurrentData(): AppData;
  fallback(
    input: ClientInput,
    selectedCustomerId: string | null,
  ):
    | { ok: true; customerId: string; client: Client }
    | { ok: false; error: string };
  createCustomer(draft: CustomerDraft): Promise<CentralCustomerCreateResult>;
  updateCustomer(
    customer: Customer,
  ): Promise<CentralBusinessEntityMutationResult<Customer>>;
  environment?: CentralCustomerCreateCanaryEnvironment;
}

function customerDraft(customer: Customer): CustomerDraft {
  const draft: Partial<Customer> = { ...customer };
  delete draft.id;
  delete draft.createdAt;
  delete draft.updatedAt;
  return draft as CustomerDraft;
}

function comparableCustomer(customer: Customer): string {
  const entries = Object.entries(customerDraft(migrateCustomer(customer)))
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

export async function upsertCustomerForDocumentWithCentralCanary(input: {
  userId: string | null | undefined;
  customerInput: ClientInput;
  selectedCustomerId: string | null;
  dependencies: CentralCustomerDocumentUpsertDependencies;
}): Promise<CentralCustomerDocumentUpsertResult> {
  const { dependencies } = input;
  if (
    !isCentralCustomerCreateCanaryEnabledForUser(
      input.userId,
      dependencies.environment,
    )
  ) {
    const fallback = dependencies.fallback(
      input.customerInput,
      input.selectedCustomerId,
    );
    return fallback.ok ? { ...fallback, delivery: "local" } : fallback;
  }

  const baseline = dependencies.getCurrentData();
  const prepared = ensureCustomerForDocument(
    baseline.customers,
    input.customerInput,
    input.selectedCustomerId,
  );
  if (!prepared.ok) return prepared;

  if (prepared.created) {
    const created = await dependencies.createCustomer(
      customerDraft(prepared.customer),
    );
    if (!created.ok) return created;
    return {
      ok: true,
      customerId: created.customer.id,
      client: customerToClient(created.customer),
      delivery: created.delivery,
    };
  }

  const current = baseline.customers.find(
    (customer) => customer.id === prepared.customer.id,
  );
  if (
    current &&
    comparableCustomer(current) === comparableCustomer(prepared.customer)
  ) {
    return {
      ok: true,
      customerId: current.id,
      client: customerToClient(current),
      delivery: "unchanged",
    };
  }

  const updated = await dependencies.updateCustomer(prepared.customer);
  if (!updated.ok) return updated;
  return {
    ok: true,
    customerId: updated.value.id,
    client: customerToClient(updated.value),
    delivery: updated.delivery,
  };
}
