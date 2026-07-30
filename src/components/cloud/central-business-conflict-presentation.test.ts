import { describe, expect, it } from "vitest";

import { EMPTY_DATA } from "@/lib/types";
import type { CentralBusinessQueuedOperation } from "@/lib/central-business-authority/durable-queue";

import {
  buildCentralBusinessBlockedReviewItems,
  buildCentralBusinessConflictReviewItems,
} from "./central-business-conflict-presentation";

function operation(
  overrides: Partial<CentralBusinessQueuedOperation> = {},
): CentralBusinessQueuedOperation {
  return {
    operationId: "CENTRAL_OP_SYNTHETIC_0001",
    status: "conflict",
    enqueuedAt: "2026-07-29T17:00:00.000Z",
    attemptCount: 1,
    input: {
      idempotencyKey: "CENTRAL_OP_SYNTHETIC_0001",
      operationKind: "upsert",
      entityType: "customer",
      entityId: "customer-1",
      expectedVersion: 1,
      payload: { id: "customer-1", name: "Cliente sintético" },
    },
    lastError: {
      code: "CENTRAL_BUSINESS_VERSION_CONFLICT",
      message: "stale",
      status: 409,
    },
    ...overrides,
  };
}

describe("central business conflict presentation", () => {
  it("agrupa todos los cambios del mismo elemento sin mostrar el payload", () => {
    const items = buildCentralBusinessConflictReviewItems(EMPTY_DATA, [
      operation(),
      operation({
        operationId: "CENTRAL_OP_SYNTHETIC_0002",
        input: {
          ...operation().input,
          idempotencyKey: "CENTRAL_OP_SYNTHETIC_0002",
          operationKind: "delete",
        },
      }),
    ]);

    expect(items).toEqual([
      expect.objectContaining({
        key: "customer:customer-1",
        label: "Cliente sintético",
        operationCount: 2,
        operationText: "varios cambios locales",
        expectedVersionText: "versión 1",
        canKeepServer: true,
      }),
    ]);
    expect(JSON.stringify(items)).not.toContain("idempotencyKey");
  });

  it("impide la reparación automática de una identidad reutilizada", () => {
    const items = buildCentralBusinessConflictReviewItems(EMPTY_DATA, [
      operation({
        lastError: {
          code: "CENTRAL_BUSINESS_IDEMPOTENCY_CONFLICT",
          message: "identity mismatch",
          status: 409,
        },
      }),
    ]);

    expect(items[0].canKeepServer).toBe(false);
  });

  it("no separa la resolución de un conflicto perteneciente a un lote", () => {
    const items = buildCentralBusinessConflictReviewItems(EMPTY_DATA, [
      operation({
        batchId: "CENTRAL_BATCH_SYNTHETIC_0001",
        batchIndex: 0,
        batchSize: 2,
      }),
    ]);

    expect(items[0].canKeepServer).toBe(false);
  });

  it("agrupa un lote bloqueado para reintentarlo completo", () => {
    const items = buildCentralBusinessBlockedReviewItems([
      operation({
        status: "blocked",
        batchId: "CENTRAL_BATCH_SYNTHETIC_0001",
        batchIndex: 0,
        batchSize: 2,
        lastError: {
          code: "CENTRAL_BUSINESS_BATCH_INVALID_COMMAND",
          message: "No se aplicó ninguna operación (P4120).",
          status: 400,
        },
      }),
      operation({
        operationId: "CENTRAL_OP_SYNTHETIC_0002",
        status: "blocked",
        batchId: "CENTRAL_BATCH_SYNTHETIC_0001",
        batchIndex: 1,
        batchSize: 2,
      }),
    ]);

    expect(items).toEqual([
      {
        key: "CENTRAL_BATCH_SYNTHETIC_0001",
        retryOperationId: "CENTRAL_OP_SYNTHETIC_0001",
        label: "Lote atómico · 2 fichas",
        operationCount: 2,
        issue: "No se aplicó ninguna operación (P4120).",
      },
    ]);
  });

  it("presenta los conflictos de proveedor como una única ficha", () => {
    const items = buildCentralBusinessConflictReviewItems(
      {
        ...EMPTY_DATA,
        suppliers: [
          {
            id: "supplier-1",
            name: "Proveedor local",
            createdAt: "2026-07-29T17:00:00.000Z",
          },
        ],
      },
      [
        operation({
          input: {
            ...operation().input,
            entityType: "supplier",
            entityId: "supplier-1",
          },
        }),
      ],
    );

    expect(items).toEqual([
      expect.objectContaining({
        key: "supplier:supplier-1",
        entityType: "supplier",
        label: "Proveedor local",
      }),
    ]);
  });

  it("presenta conflictos de todas las categorías centrales", () => {
    const items = buildCentralBusinessConflictReviewItems(
      {
        ...EMPTY_DATA,
        profile: {
          ...EMPTY_DATA.profile,
          name: "Empresa local",
        },
      },
      [
        operation({
          input: {
            ...operation().input,
            entityType: "expense",
            entityId: "expense-1",
            payload: {
              id: "expense-1",
              description: "Gasto sintético",
            },
          },
        }),
        operation({
          operationId: "CENTRAL_OP_SYNTHETIC_0002",
          input: {
            ...operation().input,
            idempotencyKey: "CENTRAL_OP_SYNTHETIC_0002",
            entityType: "recurring_expense",
            entityId: "recurring-expense-1",
            payload: {
              id: "recurring-expense-1",
              description: "Cuota sintética",
            },
          },
        }),
        operation({
          operationId: "CENTRAL_OP_SYNTHETIC_0003",
          input: {
            ...operation().input,
            idempotencyKey: "CENTRAL_OP_SYNTHETIC_0003",
            entityType: "user_reminder",
            entityId: "reminder-1",
            payload: {
              id: "reminder-1",
              text: "Recordatorio sintético",
            },
          },
        }),
        operation({
          operationId: "CENTRAL_OP_SYNTHETIC_0004",
          input: {
            ...operation().input,
            idempotencyKey: "CENTRAL_OP_SYNTHETIC_0004",
            entityType: "profile",
            entityId: "profile",
            payload: {
              name: "Empresa remota",
            },
          },
        }),
      ],
    );

    expect(items).toEqual([
      expect.objectContaining({
        key: "expense:expense-1",
        entityType: "expense",
        label: "Gasto sintético",
      }),
      expect.objectContaining({
        key: "recurring_expense:recurring-expense-1",
        entityType: "recurring_expense",
        label: "Cuota sintética",
      }),
      expect.objectContaining({
        key: "user_reminder:reminder-1",
        entityType: "user_reminder",
        label: "Recordatorio sintético",
      }),
      expect.objectContaining({
        key: "profile:profile",
        entityType: "profile",
        label: "Empresa local",
      }),
    ]);
  });
});
