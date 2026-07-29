"use client";

import type { AppDataDurabilityResult } from "@/lib/app-data-durability";
import { normalizeProductCatalogItem } from "@/lib/purchase-products";
import type { AppData, Product } from "@/lib/types";

import type { CentralBusinessQueueStorage } from "./durable-queue";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationResult,
} from "./entity-mutation-canary";
import type { CentralBusinessEventsAppDataSyncResult } from "./events-app-data-sync";
import type { CentralBusinessBrowserMutationResult } from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import { isCentralProductCreateCanaryEnabledForUser } from "./product-create-canary";
import type { CentralBusinessAuthorityStatusResult } from "./status-client";

export const CENTRAL_PRODUCT_MUTATION_CANARY =
  "CENTRAL_PRODUCT_MUTATION_CANARY_V1";

export interface CentralProductMutationCanaryDependencies {
  getCurrentData(): AppData;
  updateProductFallback(product: Product): void;
  deleteProductFallback(id: string): void;
  updateProductDurably(
    product: Product,
    identity: { now: string },
    expected: AppData,
  ): AppDataDurabilityResult<Product>;
  deleteProductDurably(
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

function jsonProduct(product: Product) {
  return JSON.parse(JSON.stringify(product)) as CentralBusinessJson;
}

export async function updateProductWithCentralCanary(input: {
  userId: string | null | undefined;
  product: Product;
  dependencies: CentralProductMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<Product>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralProductCreateCanaryEnabledForUser(input.userId),
    userId: input.userId,
    entityType: "product",
    entityId: input.product.id,
    operationKind: "upsert",
    operationIdPrefix: "CENTRAL_PRODUCT_UPDATE",
    entityLabel: "este producto",
    dependencies: {
      ...dependencies,
      fallback: () => {
        const updated = normalizeProductCatalogItem({
          ...input.product,
          updatedAt: (dependencies.now ?? (() => new Date().toISOString()))(),
        });
        dependencies.updateProductFallback(updated);
        return { ok: true, value: updated, delivery: "local" };
      },
      prepareLocal: ({ data, now }) => {
        if (!data.products.some((product) => product.id === input.product.id)) {
          return { ok: false, error: "El producto ya no existe." };
        }
        const updated = normalizeProductCatalogItem({
          ...input.product,
          updatedAt: now,
        });
        return {
          ok: true,
          payload: jsonProduct(updated),
          transition: {
            data: {
              ...data,
              products: data.products.map((product) =>
                product.id === updated.id ? updated : product,
              ),
            },
            value: updated,
          },
        };
      },
      commitLocal: (expected, transition, now) =>
        dependencies.updateProductDurably(transition.value, { now }, expected),
    },
  });
}

export async function deleteProductWithCentralCanary(input: {
  userId: string | null | undefined;
  productId: string;
  dependencies: CentralProductMutationCanaryDependencies;
}): Promise<CentralBusinessEntityMutationResult<string>> {
  const { dependencies } = input;
  return mutateCentralBusinessEntityWithCanary({
    enabled: isCentralProductCreateCanaryEnabledForUser(input.userId),
    userId: input.userId,
    entityType: "product",
    entityId: input.productId,
    operationKind: "delete",
    operationIdPrefix: "CENTRAL_PRODUCT_DELETE",
    entityLabel: "este producto",
    dependencies: {
      ...dependencies,
      fallback: () => {
        dependencies.deleteProductFallback(input.productId);
        return {
          ok: true,
          value: input.productId,
          delivery: "local",
        };
      },
      prepareLocal: ({ data }) => {
        if (!data.products.some((product) => product.id === input.productId)) {
          return { ok: false, error: "El producto ya no existe." };
        }
        return {
          ok: true,
          payload: null,
          transition: {
            data: {
              ...data,
              products: data.products.filter(
                (product) => product.id !== input.productId,
              ),
            },
            value: input.productId,
          },
        };
      },
      commitLocal: (expected) =>
        dependencies.deleteProductDurably(input.productId, expected),
    },
  });
}
