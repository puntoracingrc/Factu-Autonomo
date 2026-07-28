import { describe, expect, it, vi } from "vitest";

import {
  CENTRAL_INVOICE_AUTHORITY_CLIENT_OPERATION_LOCK,
  runCentralInvoiceAuthorityClientOperation,
} from "./client-operation-lock";

describe("central invoice authority client operation lock", () => {
  it("uses one browser-wide exclusive lock when Web Locks is available", async () => {
    const request = vi.fn();
    const lockManager = {
      async request<T>(
        _name: string,
        _options: { mode: "exclusive" },
        operation: () => Promise<T>,
      ): Promise<T> {
        request(_name, _options);
        return operation();
      },
    };

    await expect(
      runCentralInvoiceAuthorityClientOperation(
        async () => "issued",
        { lockManager },
      ),
    ).resolves.toBe("issued");
    expect(request).toHaveBeenCalledWith(
      CENTRAL_INVOICE_AUTHORITY_CLIENT_OPERATION_LOCK,
      { mode: "exclusive" },
    );
  });

  it("serializes concurrent operations in the fallback queue", async () => {
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = runCentralInvoiceAuthorityClientOperation(
      async () => {
        order.push("first:start");
        await firstGate;
        order.push("first:end");
        return "first";
      },
      { lockManager: null },
    );
    const second = runCentralInvoiceAuthorityClientOperation(
      async () => {
        order.push("second:start");
        order.push("second:end");
        return "second";
      },
      { lockManager: null },
    );

    await Promise.resolve();
    expect(order).toEqual(["first:start"]);
    releaseFirst();

    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "second",
    ]);
    expect(order).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });
});
