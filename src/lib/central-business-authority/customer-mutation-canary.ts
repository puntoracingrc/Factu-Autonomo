"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { updateCustomerInCollection } from "@/lib/customers";
import { deleteCustomerMasterFromData } from "@/lib/master-record-deletion";
import type { AppData, Customer } from "@/lib/types";

import { isCentralCustomerCreateCanaryEnabledForUser } from "./customer-create-canary";
import type { CentralBusinessQueueStorage } from "./durable-queue";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationResult,
} from "./entity-mutation-canary";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

export const CENTRAL_CUSTOMER_MUTATION_CANARY =
  "CENTRAL_CUSTOMER_MUTATION_CANARY_V1";

export interface CentralCustomerMutationCanaryDependencies {
  getCurrentData(): AppData;
  updateCustomerFallback(
    customer: Customer,
  ): { ok: true; customer: Customer } | { ok: false; error: string };
  deleteCustomerFallback(id: string): void;
  updateCustomerDurably(
    customer: Customer,
    identity: { now: string },
    expected: AppData,
  ): AppDataDurabilityResult<Customer>;
  deleteCustomerDurably(
    id: string,
    expected: AppData,
  ): AppDataDurabilityResult<string>;
  syncEventsBeforeWrite?: () => Promise<CentralBusinessEventsAppDataSyncResult>;
  fetchStatus?: () => Promise<CentralBusinessAuthorityStatusResult>;
  mutate?: (
    input: Parameters<
      typeof import("./mutation-client").mutateCentralBusinessFromBrowser
    >[0],
  ) => Promise<CentralBusinessBrowserMutationResult>;
  storage?: CentralBusinessQueueStorage;
  createId?: () => string;
  now?: () => string;
  statusTimeoutMs?: number;
}

function jsonCustomer(customer: Customer) {
  return JSON.parse(JSON.stringify(customer)) as Record<
    string,
    string | string[]
  >;
}

export async function updateCustomerWithCentralCanary(input: {
  userId: string | null | undefined;
  customer: Customer;
  dependencies: CentralCustomerMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<Customer>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralCustomerCreateCanaryEnabledForUser(input.userId),
    userId: input.userId,
    entityType: "customer",
    entityId: input.customer.id,
    operationKind: "upsert",
    operationIdPrefix: "CENTRAL_CUSTOMER_UPDATE",
    entityLabel: "este cliente",
    dependencies: {
      ...dependencies,
      fallback: () => {
        const result = dependencies.updateCustomerFallback(input.customer);
        return result.ok
          ? { ok: true, value: result.customer, delivery: "local" }
          : result;
      },
      prepareLocal: ({ data, now }) => {
        const write = updateCustomerInCollection(
          data.customers,
          input.customer,
          now,
        );
        if (!write.ok) return write;
        return {
          ok: true,
          payload: jsonCustomer(write.customer),
          transition: {
            data: { ...data, customers: write.customers },
            value: write.customer,
          },
        };
      },
      commitLocal: (expected, transition, now) =>
        dependencies.updateCustomerDurably(transition.value, { now }, expected),
    },
  });
}

export async function deleteCustomerWithCentralCanary(input: {
  userId: string | null | undefined;
  customerId: string;
  dependencies: CentralCustomerMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<string>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralCustomerCreateCanaryEnabledForUser(input.userId),
    userId: input.userId,
    entityType: "customer",
    entityId: input.customerId,
    operationKind: "delete",
    operationIdPrefix: "CENTRAL_CUSTOMER_DELETE",
    entityLabel: "este cliente",
    dependencies: {
      ...dependencies,
      fallback: () => {
        dependencies.deleteCustomerFallback(input.customerId);
        return {
          ok: true,
          value: input.customerId,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        if (
          !data.customers.some((customer) => customer.id === input.customerId)
        ) {
          return { ok: false, error: "El cliente ya no existe." };
        }
        return {
          ok: true,
          payload: null,
          transition: {
            data: deleteCustomerMasterFromData(data, input.customerId),
            value: input.customerId,
          },
        };
      },
      commitLocal: (expected) =>
        dependencies.deleteCustomerDurably(input.customerId, expected),
    },
  });
}
