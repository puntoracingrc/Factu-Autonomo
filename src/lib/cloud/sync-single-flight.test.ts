import { describe, expect, it, vi } from "vitest";

import {
  runCloudSyncSingleFlight,
  type CloudSyncFlightState,
} from "./sync-single-flight";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

describe("cloud sync single flight", () => {
  it("comparte el resultado cuando dos acciones sincronizan la misma empresa", async () => {
    const state = { current: null as CloudSyncFlightState<boolean> };
    const pending = deferred<boolean>();
    const operation = vi.fn(() => pending.promise);

    const automatic = runCloudSyncSingleFlight(state, "company-1", operation);
    const emission = runCloudSyncSingleFlight(state, "company-1", operation);

    expect(operation).toHaveBeenCalledTimes(0);
    pending.resolve(true);

    await expect(automatic).resolves.toBe(true);
    await expect(emission).resolves.toBe(true);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(state.current).toBeNull();
  });

  it("serializa empresas distintas sin mezclar sus resultados", async () => {
    const state = { current: null as CloudSyncFlightState<string> };
    const first = deferred<string>();
    const order: string[] = [];

    const oldCompany = runCloudSyncSingleFlight(
      state,
      "company-1",
      async () => {
        order.push("old-start");
        const result = await first.promise;
        order.push("old-end");
        return result;
      },
    );
    const newCompany = runCloudSyncSingleFlight(
      state,
      "company-2",
      async () => {
        order.push("new-start");
        return "new-result";
      },
    );

    await Promise.resolve();
    expect(order).toEqual(["old-start"]);
    first.resolve("old-result");

    await expect(oldCompany).resolves.toBe("old-result");
    await expect(newCompany).resolves.toBe("new-result");
    expect(order).toEqual(["old-start", "old-end", "new-start"]);
  });

  it("libera la exclusión tras un fallo para permitir reintentar", async () => {
    const state = { current: null as CloudSyncFlightState<boolean> };

    await expect(
      runCloudSyncSingleFlight(state, "company-1", async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");

    await expect(
      runCloudSyncSingleFlight(state, "company-1", async () => true),
    ).resolves.toBe(true);
    expect(state.current).toBeNull();
  });
});
