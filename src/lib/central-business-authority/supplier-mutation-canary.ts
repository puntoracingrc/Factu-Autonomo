"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { deleteSupplierMasterFromData } from "@/lib/master-record-deletion";
import type { AppData, Supplier } from "@/lib/types";

import type { CentralBusinessQueueStorage } from "./durable-queue";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationResult,
} from "./entity-mutation-canary";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import { isCentralSupplierCreateCanaryEnabledForUser } from "./supplier-create-canary";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

export const CENTRAL_SUPPLIER_MUTATION_CANARY =
  "CENTRAL_SUPPLIER_MUTATION_CANARY_V1";

export interface CentralSupplierMutationCanaryDependencies {
  getCurrentData(): AppData;
  updateSupplierFallback(supplier: Supplier): void;
  deleteSupplierFallback(id: string): void;
  updateSupplierDurably(
    supplier: Supplier,
    expected: AppData,
  ): AppDataDurabilityResult<Supplier>;
  deleteSupplierDurably(
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

function jsonSupplier(supplier: Supplier): CentralBusinessJson {
  return JSON.parse(JSON.stringify(supplier)) as CentralBusinessJson;
}

export async function updateSupplierWithCentralCanary(input: {
  userId: string | null | undefined;
  supplier: Supplier;
  dependencies: CentralSupplierMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<Supplier>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralSupplierCreateCanaryEnabledForUser(input.userId),
    userId: input.userId,
    entityType: "supplier",
    entityId: input.supplier.id,
    operationKind: "upsert",
    operationIdPrefix: "CENTRAL_SUPPLIER_UPDATE",
    entityLabel: "este proveedor",
    dependencies: {
      ...dependencies,
      fallback: () => {
        dependencies.updateSupplierFallback(input.supplier);
        return {
          ok: true,
          value: input.supplier,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        if (
          !data.suppliers.some((supplier) => supplier.id === input.supplier.id)
        ) {
          return { ok: false, error: "El proveedor ya no existe." };
        }
        return {
          ok: true,
          payload: jsonSupplier(input.supplier),
          transition: {
            data: {
              ...data,
              suppliers: data.suppliers.map((supplier) =>
                supplier.id === input.supplier.id ? input.supplier : supplier,
              ),
              expenses: data.expenses.map((expense) =>
                expense.supplierId === input.supplier.id
                  ? { ...expense, supplierName: input.supplier.name }
                  : expense,
              ),
            },
            value: input.supplier,
          },
        };
      },
      commitLocal: (expected, transition) =>
        dependencies.updateSupplierDurably(transition.value, expected),
    },
  });
}

export async function deleteSupplierWithCentralCanary(input: {
  userId: string | null | undefined;
  supplierId: string;
  dependencies: CentralSupplierMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<string>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralSupplierCreateCanaryEnabledForUser(input.userId),
    userId: input.userId,
    entityType: "supplier",
    entityId: input.supplierId,
    operationKind: "delete",
    operationIdPrefix: "CENTRAL_SUPPLIER_DELETE",
    entityLabel: "este proveedor",
    dependencies: {
      ...dependencies,
      fallback: () => {
        dependencies.deleteSupplierFallback(input.supplierId);
        return {
          ok: true,
          value: input.supplierId,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        if (
          !data.suppliers.some((supplier) => supplier.id === input.supplierId)
        ) {
          return { ok: false, error: "El proveedor ya no existe." };
        }
        return {
          ok: true,
          payload: null,
          transition: {
            data: deleteSupplierMasterFromData(data, input.supplierId),
            value: input.supplierId,
          },
        };
      },
      commitLocal: (expected) =>
        dependencies.deleteSupplierDurably(input.supplierId, expected),
    },
  });
}
