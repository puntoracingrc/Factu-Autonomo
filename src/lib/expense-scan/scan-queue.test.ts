import { describe, expect, it } from "vitest";
import {
  enqueueExpenseScanFiles,
  expenseScanFileQueueId,
  updateExpenseScanQueueItem,
  type ExpenseScanFileIdentity,
  type ExpenseScanQueueItem,
} from "./scan-queue";

function file(
  name: string,
  overrides: Partial<ExpenseScanFileIdentity> = {},
): ExpenseScanFileIdentity {
  return {
    name,
    size: 512,
    type: "application/pdf",
    lastModified: 1_720_000_000_000,
    ...overrides,
  };
}

describe("expense scan queue", () => {
  it("accumulates unique files as prepared without mutating the current queue", () => {
    const first = file("factura-1.pdf");
    const current: readonly ExpenseScanQueueItem<ExpenseScanFileIdentity>[] = [
      {
        id: expenseScanFileQueueId(first),
        file: first,
        status: "READ",
        message: null,
      },
    ];

    const result = enqueueExpenseScanFiles({
      current,
      incoming: [file("factura-2.pdf")],
      limit: 10,
    });

    expect(current).toHaveLength(1);
    expect(result.limitExceeded).toBe(false);
    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({
      status: "PREPARED",
      message: null,
    });
  });

  it("omits exact duplicates already queued and reports their display names", () => {
    const duplicate = file("factura-repetida.pdf");
    const initial = enqueueExpenseScanFiles({
      current: [],
      incoming: [duplicate],
      limit: 10,
    });

    const result = enqueueExpenseScanFiles({
      current: initial.items,
      incoming: [duplicate, duplicate],
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.duplicateNames).toEqual([
      "factura-repetida.pdf",
      "factura-repetida.pdf",
    ]);
  });

  it("rejects the whole addition when the accumulated queue would exceed its limit", () => {
    const current = enqueueExpenseScanFiles({
      current: [],
      incoming: [file("uno.pdf"), file("dos.pdf")],
      limit: 2,
    }).items;

    const result = enqueueExpenseScanFiles({
      current,
      incoming: [file("tres.pdf")],
      limit: 2,
    });

    expect(result.limitExceeded).toBe(true);
    expect(result.items).toEqual(current);
  });

  it("updates one queue status defensively for retry and result presentation", () => {
    const queued = enqueueExpenseScanFiles({
      current: [],
      incoming: [file("uno.pdf"), file("dos.pdf")],
      limit: 10,
    }).items;

    const updated = updateExpenseScanQueueItem(queued, queued[0].id, {
      status: "NEEDS_REVIEW",
      message: "Revisa el IVA detectado.",
    });

    expect(updated).not.toBe(queued);
    expect(updated[0]).toMatchObject({
      status: "NEEDS_REVIEW",
      message: "Revisa el IVA detectado.",
    });
    expect(updated[1]).toBe(queued[1]);
    expect(queued[0].status).toBe("PREPARED");
  });

  it("rejects invalid queue limits before processing files", () => {
    expect(() =>
      enqueueExpenseScanFiles({
        current: [],
        incoming: [file("uno.pdf")],
        limit: 0,
      }),
    ).toThrow("positive safe integer");
  });
});
